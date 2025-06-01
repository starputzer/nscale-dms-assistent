/**
 * Enhanced EventSource with automatic reconnection and advanced features
 */

import { ref, Ref } from 'vue';

export interface EnhancedEventSourceOptions {
  /** Called when connection is established */
  onConnect?: () => void;
  /** Called when a message is received */
  onMessage: (event: MessageEvent) => void;
  /** Called when an error occurs */
  onError?: (error: Event) => void;
  /** Called when max reconnection attempts reached */
  onMaxReconnectReached?: () => void;
  /** Custom event handlers */
  eventHandlers?: Record<string, (event: MessageEvent) => void>;
  /** Request headers (for polyfill mode) */
  headers?: Record<string, string>;
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  /** Base reconnection delay in ms */
  reconnectDelay?: number;
  /** Reconnection backoff multiplier */
  backoffMultiplier?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export interface ConnectionStats {
  connectionAttempts: number;
  successfulConnections: number;
  totalMessages: number;
  lastConnectedAt?: Date;
  lastDisconnectedAt?: Date;
  lastError?: string;
  averageReconnectTime: number;
}

export class EnhancedEventSource {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private backoffMultiplier: number;
  private streamId: string;
  private lastEventId: string | null = null;
  private isConnected = false;
  private isReconnecting = false;
  private reconnectTimer?: number;
  private heartbeatTimer?: number;
  private connectionStats: ConnectionStats;
  private messageBuffer: MessageEvent[] = [];
  private debug: boolean;

  // Refs for reactive state
  public connectionState: Ref<'connecting' | 'connected' | 'disconnected' | 'error'>;
  public reconnectCountdown: Ref<number>;

  constructor(
    private url: string,
    private options: EnhancedEventSourceOptions
  ) {
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    this.reconnectDelay = options.reconnectDelay ?? 1000;
    this.backoffMultiplier = options.backoffMultiplier ?? 2;
    this.debug = options.debug ?? false;
    this.streamId = this.generateStreamId();
    
    // Initialize reactive state
    this.connectionState = ref('connecting');
    this.reconnectCountdown = ref(0);
    
    // Initialize stats
    this.connectionStats = {
      connectionAttempts: 0,
      successfulConnections: 0,
      totalMessages: 0,
      averageReconnectTime: 0,
    };
    
    this.connect();
  }

  private generateStreamId(): string {
    return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(message: string, ...args: any[]) {
    if (this.debug) {
      console.log(`[EnhancedEventSource ${this.streamId}] ${message}`, ...args);
    }
  }

  private connect() {
    try {
      this.connectionStats.connectionAttempts++;
      this.connectionState.value = 'connecting';
      
      // Build URL with last event ID if available
      const urlWithParams = new URL(this.url);
      if (this.lastEventId) {
        urlWithParams.searchParams.set('last-event-id', this.lastEventId);
      }
      urlWithParams.searchParams.set('stream-id', this.streamId);
      
      this.log('Connecting to:', urlWithParams.toString());
      
      // Check if native EventSource is available and we don't need headers
      if (typeof EventSource !== 'undefined' && !this.options.headers) {
        this.connectNative(urlWithParams.toString());
      } else {
        // Fallback to fetch-based SSE for custom headers support
        this.connectWithFetch(urlWithParams.toString());
      }
    } catch (error) {
      this.log('Connection error:', error);
      this.handleConnectionError(error);
    }
  }

  private connectNative(url: string) {
    this.eventSource = new EventSource(url);
    
    this.eventSource.onopen = () => {
      this.handleConnectionOpen();
    };
    
    this.eventSource.onerror = (error) => {
      this.handleConnectionError(error);
    };
    
    this.eventSource.onmessage = (event) => {
      this.handleMessage(event);
    };
    
    // Register custom event handlers
    if (this.options.eventHandlers) {
      Object.entries(this.options.eventHandlers).forEach(([eventType, handler]: any) => {
        this.eventSource!.addEventListener(eventType, handler);
      });
    }
  }

  private async connectWithFetch(url: string) {
    // Fetch-based SSE implementation for custom headers
    try {
      const response = await fetch(url, {
        headers: {
          ...this.options.headers,
          'Accept': 'text/event-stream',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (!response.body) {
        throw new Error('Response body is empty');
      }
      
      this.handleConnectionOpen();
      
      // Process the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          this.processSseLine(line);
        }
      }
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  private processSseLine(line: string) {
    if (!line.trim()) return;
    
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      const event = new MessageEvent('message', {
        data,
        lastEventId: this.lastEventId || undefined,
      });
      this.handleMessage(event);
    } else if (line.startsWith('event: ')) {
      const eventType = line.slice(7);
      if (this.options.eventHandlers?.[eventType]) {
        const event = new MessageEvent(eventType, {
          data: '',
          lastEventId: this.lastEventId || undefined,
        });
        this.options.eventHandlers[eventType](event);
      }
    } else if (line.startsWith('id: ')) {
      this.lastEventId = line.slice(4);
    }
  }

  private handleConnectionOpen() {
    this.log('Connection established');
    
    const reconnectTime = Date.now() - (this.connectionStats.lastDisconnectedAt?.getTime() || Date.now());
    this.connectionStats.averageReconnectTime = 
      (this.connectionStats.averageReconnectTime * this.connectionStats.successfulConnections + reconnectTime) /
      (this.connectionStats.successfulConnections + 1);
    
    this.connectionStats.successfulConnections++;
    this.connectionStats.lastConnectedAt = new Date();
    
    this.isConnected = true;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this.connectionState.value = 'connected';
    
    // Process buffered messages
    this.flushMessageBuffer();
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Notify connection handler
    this.options.onConnect?.();
  }

  private handleMessage(event: MessageEvent) {
    this.connectionStats.totalMessages++;
    
    if (event.lastEventId) {
      this.lastEventId = event.lastEventId;
    }
    
    // Buffer messages if reconnecting
    if (this.isReconnecting) {
      this.messageBuffer.push(event);
      return;
    }
    
    this.options.onMessage(event);
  }

  private handleConnectionError(error: any) {
    this.log('Connection error:', error);
    
    this.connectionStats.lastError = error?.message || 'Unknown error';
    this.connectionStats.lastDisconnectedAt = new Date();
    
    this.isConnected = false;
    this.connectionState.value = 'error';
    
    // Clean up current connection
    this.cleanup();
    
    // Notify error handler
    this.options.onError?.(error);
    
    // Attempt reconnection
    this.scheduleReconnection();
  }

  private scheduleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log('Max reconnection attempts reached');
      this.connectionState.value = 'disconnected';
      this.options.onMaxReconnectReached?.();
      return;
    }
    
    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectDelay * Math.pow(this.backoffMultiplier, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );
    
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    // Update countdown
    let remaining = delay;
    const countdownInterval = setInterval(() => {
      remaining -= 100;
      this.reconnectCountdown.value = Math.ceil(remaining / 1000);
      if (remaining <= 0) {
        clearInterval(countdownInterval);
      }
    }, 100);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat() {
    // Send heartbeat every 30 seconds to keep connection alive
    this.heartbeatTimer = window.setInterval(() => {
      if (this.isConnected && this.eventSource?.readyState === EventSource.OPEN) {
        // Connection is healthy
        this.log('Heartbeat: Connection healthy');
      } else {
        // Connection lost, trigger reconnection
        this.log('Heartbeat: Connection lost');
        this.handleConnectionError(new Error('Heartbeat detected connection loss'));
      }
    }, 30000);
  }

  private flushMessageBuffer() {
    if (this.messageBuffer.length > 0) {
      this.log(`Flushing ${this.messageBuffer.length} buffered messages`);
      
      for (const event of this.messageBuffer) {
        this.options.onMessage(event);
      }
      
      this.messageBuffer = [];
    }
  }

  private cleanup() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  public close() {
    this.log('Closing connection');
    
    this.isConnected = false;
    this.isReconnecting = false;
    this.connectionState.value = 'disconnected';
    
    this.cleanup();
  }

  public getStats(): ConnectionStats {
    return { ...this.connectionStats };
  }

  public isConnectedState(): boolean {
    return this.isConnected;
  }

  public getStreamId(): string {
    return this.streamId;
  }

  public reconnect() {
    this.log('Manual reconnection requested');
    
    this.cleanup();
    this.reconnectAttempts = 0;
    this.connect();
  }
}