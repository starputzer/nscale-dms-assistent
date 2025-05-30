import { EventEmitter } from 'events';

export interface EnhancedEventSourceConfig {
  url: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  reconnectDecay?: number;
  maxReconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatTimeout?: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

export interface ConnectionStats {
  connectedAt: number | null;
  disconnectedAt: number | null;
  reconnectCount: number;
  messageCount: number;
  errorCount: number;
  lastError: Error | null;
  uptime: number;
}

export interface StreamingMetadata {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  estimatedDuration?: number;
  tokenCount?: number;
}

export type EventHandler = (event: MessageEvent) => void;
export type MetadataHandler = (metadata: StreamingMetadata) => void;
export type ProgressHandler = (progress: number, estimated: number) => void;
export type ErrorHandler = (error: Error) => void;

export class EnhancedEventSource extends EventEmitter {
  private config: Required<EnhancedEventSourceConfig>;
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private lastEventTime = 0;
  private isClosing = false;
  
  private stats: ConnectionStats = {
    connectedAt: null,
    disconnectedAt: null,
    reconnectCount: 0,
    messageCount: 0,
    errorCount: 0,
    lastError: null,
    uptime: 0
  };

  constructor(config: EnhancedEventSourceConfig) {
    super();
    
    this.config = {
      reconnect: true,
      reconnectInterval: 1000,
      reconnectDecay: 1.5,
      maxReconnectInterval: 30000,
      maxReconnectAttempts: 10,
      heartbeatTimeout: 45000,
      withCredentials: true,
      headers: {},
      ...config
    };

    this.connect();
  }

  private connect(): void {
    if (this.isClosing || this.eventSource?.readyState === EventSource.OPEN) {
      return;
    }

    try {
      // Build URL with headers as query params (SSE limitation)
      const url = new URL(this.config.url);
      Object.entries(this.config.headers).forEach(([key, value]) => {
        url.searchParams.append(`header_${key}`, value);
      });

      this.eventSource = new EventSource(url.toString(), {
        withCredentials: this.config.withCredentials
      });

      this.setupEventHandlers();
      this.emit('connecting');
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private setupEventHandlers(): void {
    if (!this.eventSource) return;

    this.eventSource.onopen = () => {
      this.handleOpen();
    };

    this.eventSource.onerror = (event) => {
      this.handleError(new Error('EventSource error'));
    };

    this.eventSource.onmessage = (event) => {
      this.handleMessage(event);
    };

    // Custom event handlers
    this.eventSource.addEventListener('token', (event) => {
      this.handleTokenEvent(event);
    });

    this.eventSource.addEventListener('metadata', (event) => {
      this.handleMetadataEvent(event);
    });

    this.eventSource.addEventListener('progress', (event) => {
      this.handleProgressEvent(event);
    });

    this.eventSource.addEventListener('error', (event) => {
      this.handleErrorEvent(event);
    });

    this.eventSource.addEventListener('done', (event) => {
      this.handleDoneEvent(event);
    });

    this.eventSource.addEventListener('heartbeat', (event) => {
      this.handleHeartbeat(event);
    });
  }

  private handleOpen(): void {
    this.reconnectAttempts = 0;
    this.stats.connectedAt = Date.now();
    this.stats.disconnectedAt = null;
    this.lastEventTime = Date.now();
    
    this.startHeartbeatMonitor();
    this.emit('open');
    
    if (this.stats.reconnectCount > 0) {
      this.emit('reconnected', this.stats.reconnectCount);
    }
  }

  private handleMessage(event: MessageEvent): void {
    this.lastEventTime = Date.now();
    this.stats.messageCount++;
    this.emit('message', event);
  }

  private handleTokenEvent(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.emit('token', data.content || data);
    } catch (error) {
      this.emit('token', event.data);
    }
  }

  private handleMetadataEvent(event: MessageEvent): void {
    try {
      const metadata: StreamingMetadata = JSON.parse(event.data);
      this.emit('metadata', metadata);
    } catch (error) {
      console.error('Failed to parse metadata:', error);
    }
  }

  private handleProgressEvent(event: MessageEvent): void {
    try {
      const { progress, estimated } = JSON.parse(event.data);
      this.emit('progress', progress, estimated);
    } catch (error) {
      console.error('Failed to parse progress:', error);
    }
  }

  private handleErrorEvent(event: MessageEvent): void {
    try {
      const { message, code, details } = JSON.parse(event.data);
      const error = new Error(message);
      (error as any).code = code;
      (error as any).details = details;
      this.handleError(error);
    } catch (error) {
      this.handleError(new Error(event.data));
    }
  }

  private handleDoneEvent(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.emit('done', data);
    } catch (error) {
      this.emit('done', {});
    }
  }

  private handleHeartbeat(event: MessageEvent): void {
    this.lastEventTime = Date.now();
    this.emit('heartbeat');
  }

  private handleError(error: Error): void {
    this.stats.errorCount++;
    this.stats.lastError = error;
    
    this.emit('error', error);
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.stopHeartbeatMonitor();
    
    if (this.config.reconnect && !this.isClosing) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    const interval = Math.min(
      this.config.reconnectInterval * Math.pow(this.config.reconnectDecay, this.reconnectAttempts),
      this.config.maxReconnectInterval
    );

    this.reconnectAttempts++;
    this.stats.reconnectCount++;
    
    this.emit('reconnecting', {
      attempt: this.reconnectAttempts,
      interval,
      maxAttempts: this.config.maxReconnectAttempts
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, interval);
  }

  private startHeartbeatMonitor(): void {
    this.stopHeartbeatMonitor();
    
    this.heartbeatTimer = setInterval(() => {
      const timeSinceLastEvent = Date.now() - this.lastEventTime;
      
      if (timeSinceLastEvent > this.config.heartbeatTimeout) {
        this.handleError(new Error('Heartbeat timeout'));
      }
    }, 5000); // Check every 5 seconds
  }

  private stopHeartbeatMonitor(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  public getStats(): ConnectionStats {
    const now = Date.now();
    return {
      ...this.stats,
      uptime: this.stats.connectedAt ? now - this.stats.connectedAt : 0
    };
  }

  public getReadyState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }

  public isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  public close(): void {
    this.isClosing = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopHeartbeatMonitor();
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.stats.disconnectedAt = Date.now();
    this.emit('close');
  }

  // Utility method for adding typed event listeners
  public onToken(handler: (token: string) => void): () => void {
    this.on('token', handler);
    return () => this.off('token', handler);
  }

  public onMetadata(handler: MetadataHandler): () => void {
    this.on('metadata', handler);
    return () => this.off('metadata', handler);
  }

  public onProgress(handler: ProgressHandler): () => void {
    this.on('progress', handler);
    return () => this.off('progress', handler);
  }

  public onError(handler: ErrorHandler): () => void {
    this.on('error', handler);
    return () => this.off('error', handler);
  }

  public onReconnecting(handler: (info: any) => void): () => void {
    this.on('reconnecting', handler);
    return () => this.off('reconnecting', handler);
  }

  public onDone(handler: (data: any) => void): () => void {
    this.on('done', handler);
    return () => this.off('done', handler);
  }
}