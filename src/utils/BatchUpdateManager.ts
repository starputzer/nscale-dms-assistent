import { ref } from 'vue';

export interface BatchUpdateOptions {
  maxBatchSize?: number;
  flushIntervalMs?: number;
  adaptiveThrottling?: boolean;
  backpressureThreshold?: number;
  priority?: 'low' | 'normal' | 'high';
}

export interface UpdateMetrics {
  totalUpdates: number;
  batchesProcessed: number;
  averageBatchSize: number;
  averageProcessingTime: number;
  droppedUpdates: number;
  backpressureEvents: number;
}

interface QueuedUpdate<T> {
  data: T;
  timestamp: number;
  priority: number;
}

export class BatchUpdateManager<T> {
  private queue: QueuedUpdate<T>[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isProcessing = false;
  private _lastFlushTime = 0;
  
  private metrics: UpdateMetrics = {
    totalUpdates: 0,
    batchesProcessed: 0,
    averageBatchSize: 0,
    averageProcessingTime: 0,
    droppedUpdates: 0,
    backpressureEvents: 0
  };

  private adaptiveInterval: number;
  private readonly priorityWeights = {
    low: 0,
    normal: 1,
    high: 2
  };

  constructor(
    private processor: (batch: T[]) => void | Promise<void>,
    private options: BatchUpdateOptions = {}
  ) {
    const {
      maxBatchSize = 50,
      flushIntervalMs = 16, // ~60 FPS
      adaptiveThrottling = true,
      backpressureThreshold = 1000,
      priority = 'normal'
    } = options;

    this.options = {
      maxBatchSize,
      flushIntervalMs,
      adaptiveThrottling,
      backpressureThreshold,
      priority
    };

    this.adaptiveInterval = flushIntervalMs;
  }

  /**
   * Adds an update to the queue
   */
  enqueue(data: T, priority?: 'low' | 'normal' | 'high'): void {
    const updatePriority = priority || this.options.priority || 'normal';
    
    // Check backpressure
    if (this.queue.length >= (this.options.backpressureThreshold || 1000)) {
      this.handleBackpressure();
      return;
    }

    this.queue.push({
      data,
      timestamp: performance.now(),
      priority: this.priorityWeights[updatePriority]
    });

    this.metrics.totalUpdates++;
    this.scheduleFlush();
  }

  /**
   * Adds multiple updates to the queue
   */
  enqueueBatch(items: T[], priority?: 'low' | 'normal' | 'high'): void {
    items.forEach(item => this.enqueue(item, priority));
  }

  /**
   * Forces immediate processing of queued updates
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    await this.processBatch();
  }

  /**
   * Clears all pending updates
   */
  clear(): void {
    this.queue = [];
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Returns current metrics
   */
  getMetrics(): Readonly<UpdateMetrics> {
    return { ...this.metrics };
  }

  /**
   * Resets metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalUpdates: 0,
      batchesProcessed: 0,
      averageBatchSize: 0,
      averageProcessingTime: 0,
      droppedUpdates: 0,
      backpressureEvents: 0
    };
  }

  private scheduleFlush(): void {
    if (this.flushTimer || this.isProcessing) return;

    const interval = this.options.adaptiveThrottling 
      ? this.adaptiveInterval 
      : this.options.flushIntervalMs || 16;

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.processBatch();
    }, interval);
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const startTime = performance.now();

    try {
      // Sort by priority and take maxBatchSize items
      this.queue.sort((a, b) => {
        // Higher priority first
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        // Older items first within same priority
        return a.timestamp - b.timestamp;
      });

      const batch = this.queue
        .splice(0, this.options.maxBatchSize || 50)
        .map(item => item.data);

      if (batch.length > 0) {
        await this.processor(batch);
        
        // Update metrics
        this.updateMetrics(batch.length, performance.now() - startTime);
      }

      // Adapt throttling based on performance
      if (this.options.adaptiveThrottling) {
        this.adaptThrottling();
      }

      // Process remaining items if any
      if (this.queue.length > 0) {
        this.scheduleFlush();
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private handleBackpressure(): void {
    this.metrics.backpressureEvents++;
    
    // Drop low priority items
    const beforeLength = this.queue.length;
    this.queue = this.queue.filter(item => item.priority > 0);
    const dropped = beforeLength - this.queue.length;
    
    if (dropped > 0) {
      this.metrics.droppedUpdates += dropped;
      console.warn(`BatchUpdateManager: Dropped ${dropped} low-priority updates due to backpressure`);
    } else {
      // If all items are high priority, drop oldest 10%
      const toDrop = Math.floor(this.queue.length * 0.1);
      this.queue.splice(0, toDrop);
      this.metrics.droppedUpdates += toDrop;
      console.warn(`BatchUpdateManager: Dropped ${toDrop} oldest updates due to critical backpressure`);
    }
  }

  private updateMetrics(batchSize: number, processingTime: number): void {
    this.metrics.batchesProcessed++;
    
    // Update rolling averages
    const alpha = 0.2; // Exponential moving average factor
    this.metrics.averageBatchSize = 
      alpha * batchSize + (1 - alpha) * this.metrics.averageBatchSize;
    this.metrics.averageProcessingTime = 
      alpha * processingTime + (1 - alpha) * this.metrics.averageProcessingTime;
  }

  private adaptThrottling(): void {
    const targetFPS = 60;
    const targetFrameTime = 1000 / targetFPS;
    
    // If processing takes too long, increase interval
    if (this.metrics.averageProcessingTime > targetFrameTime * 0.5) {
      this.adaptiveInterval = Math.min(
        this.adaptiveInterval * 1.2,
        100 // Max 100ms interval
      );
    } else if (this.metrics.averageProcessingTime < targetFrameTime * 0.2) {
      // If processing is fast, decrease interval
      this.adaptiveInterval = Math.max(
        this.adaptiveInterval * 0.8,
        8 // Min 8ms interval
      );
    }
  }
}

/**
 * Vue composable for batch updates
 */
export function useBatchUpdates<T>(
  processor: (batch: T[]) => void | Promise<void>,
  options?: BatchUpdateOptions
) {
  const manager = new BatchUpdateManager(processor, options);
  const metrics = ref<UpdateMetrics>(manager.getMetrics());
  
  // Update metrics periodically
  const metricsInterval = setInterval(() => {
    metrics.value = manager.getMetrics();
  }, 1000);

  // Cleanup on unmount
  const cleanup = () => {
    clearInterval(metricsInterval);
    manager.clear();
  };

  return {
    enqueue: manager.enqueue.bind(manager),
    enqueueBatch: manager.enqueueBatch.bind(manager),
    flush: manager.flush.bind(manager),
    clear: manager.clear.bind(manager),
    metrics,
    cleanup
  };
}