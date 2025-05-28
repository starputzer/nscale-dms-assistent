/**
 * Global type declarations for Bridge components
 */

declare interface Window {
  /**
   * nScale UI interface for global access to UI utilities
   */
  nscaleUI?: {
    showToast: (message: string, type?: string, options?: any) => void;
    showModal?: (options: any) => void;
    hideModal?: (id: string) => void;
    [key: string]: any;
  };
}
