import { SelectiveStateManager } from './selectiveStateManager';

/**
 * Extended SelectiveStateManager with additional methods
 */
export class ExtendedSelectiveStateManager extends SelectiveStateManager {
  /**
   * Sync state with the provided data
   */
  public syncState(data: any): void {
    // Update the state with the provided data
    if (data && typeof data === 'object') {
      Object.keys(data).forEach(key => {
        this.updateState(key, data[key]);
      });
    }
  }
}