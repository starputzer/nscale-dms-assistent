/**
 * UI Auth Sync Lazy - Ensures UI diagnostics reflects correct auth status
 * This version waits for Pinia to be available before initializing
 */

import { watch } from "vue";
import { UIDiagnostics } from "./uiDiagnostics";

export class UIAuthSyncLazy {
  private static instance: UIAuthSyncLazy;
  private isInitialized = false;
  private retryCount = 0;
  private maxRetries = 50;

  static getInstance(): UIAuthSyncLazy {
    if (!UIAuthSyncLazy.instance) {
      UIAuthSyncLazy.instance = new UIAuthSyncLazy();
    }
    return UIAuthSyncLazy.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Wait for Pinia to be available
      const authStore = await this.waitForAuthStore();
      if (!authStore) {
        console.warn("UI Auth Sync: Could not get auth store after retries");
        return;
      }

      const uiDiagnostics = UIDiagnostics.getInstance();

      // Initial sync
      if (uiDiagnostics.state?.value) {
        uiDiagnostics.state.value.isAuthenticated = authStore.isAuthenticated;
      }

      // Watch for changes
      watch(
        () => authStore.isAuthenticated,
        (newValue: any) => {
          if (uiDiagnostics.state?.value) {
            uiDiagnostics.state.value.isAuthenticated = newValue;
            console.log(
              "UI Auth Sync: Updated UI diagnostics auth status to",
              newValue,
            );
          }
        },
      );

      this.isInitialized = true;
      console.log("UI Auth Sync: Lazy setup complete");
    } catch (error) {
      console.error("UI Auth Sync: Failed to setup", error);
    }
  }

  private async waitForAuthStore(delay = 100): Promise<any> {
    while (this.retryCount < this.maxRetries) {
      try {
        // Dynamic import to avoid early execution
        const { useAuthStore } = await import("@/stores/auth");
        const store = useAuthStore();
        return store;
      } catch (error) {
        this.retryCount++;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    return null;
  }
}

// Create instance but don't initialize yet
const uiAuthSyncLazy = UIAuthSyncLazy.getInstance();

// Try to initialize after a delay
setTimeout(() => {
  uiAuthSyncLazy.initialize();
}, 1000);

// Also expose for manual initialization
if (typeof window !== "undefined") {
  window.initUIAuthSync = () => uiAuthSyncLazy.initialize();
}

export default uiAuthSyncLazy;
