import { OptimizedChatBridge } from './OptimizedChatBridge';

interface StreamingMetrics {
  activeStreams: number;
  completedStreams: number;
  averageStreamDuration: number;
  tokensPerSecond: number;
  errors: number;
}

/**
 * Extended OptimizedChatBridge with additional methods
 */
export class ExtendedOptimizedChatBridge extends OptimizedChatBridge {
  private streamingMetrics: StreamingMetrics = {
    activeStreams: 0,
    completedStreams: 0,
    averageStreamDuration: 0,
    tokensPerSecond: 0,
    errors: 0
  };

  /**
   * Get streaming metrics
   */
  public getStreamingMetrics(): StreamingMetrics {
    return { ...this.streamingMetrics };
  }

  /**
   * Update streaming metrics (to be called internally)
   */
  protected updateStreamingMetrics(update: Partial<StreamingMetrics>): void {
    this.streamingMetrics = { ...this.streamingMetrics, ...update };
  }
}