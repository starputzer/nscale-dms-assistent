import { BatchedEventEmitter } from './BatchedEventEmitter';

/**
 * Extended BatchedEventEmitter with additional methods
 */
export class ExtendedBatchedEventEmitter extends BatchedEventEmitter {
  /**
   * Add an event to the batch queue
   */
  public addEvent(eventName: string, data: any): void {
    // Emit the event (batching is handled internally by the parent class)
    this.emit(eventName, data);
  }

  /**
   * Dispose of the event emitter and clean up resources
   */
  public dispose(): void {
    // Clear all listeners
    this.removeAllListeners();
    
    // If there's a batch processor, stop it
    if ('stopBatchProcessor' in this && typeof (this as any).stopBatchProcessor === 'function') {
      (this as any).stopBatchProcessor();
    }
  }
}