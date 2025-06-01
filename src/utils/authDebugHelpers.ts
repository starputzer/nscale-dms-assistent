/**
 * Auth Debug Helpers
 * Utility functions for debugging and fixing auth status issues
 */

import { useAuthStore } from "@/stores/auth";
import { UIDiagnostics } from "./uiDiagnostics";

declare global {
  interface Window {
    authSync: any;
    authDebug: {
      checkStatus: () => void;
      fixStatus: () => void;
      forceLogin: (token: string) => void;
      showReport: () => void;
      syncAll: () => void;
    };
  }
}

// Create debug helper functions
window.authDebug = {
  checkStatus: () => {
    console.log("=== AUTH STATUS CHECK ===");

    // 1. Check localStorage
    const tokens = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes("token") || key.includes("auth"))) {
        tokens[key] = localStorage.getItem(key)?.substring(0, 50) + "...";
      }
    }
    console.log("1. Tokens in localStorage:", tokens);

    // 2. Check auth store
    try {
      const authStore = useAuthStore();
      console.log("2. Auth store:", {
        isAuthenticated: authStore.isAuthenticated,
        hasToken: !!authStore.token,
        tokenPreview: authStore.token?.substring(0, 50) + "...",
      });
    } catch (e) {
      console.error("2. Auth store error:", e);
    }

    // 3. Check UI diagnostics
    try {
      const uiDiagnostics = UIDiagnostics.getInstance();
      console.log("3. UI Diagnostics:", {
        isAuthenticated: uiDiagnostics.state?.value?.isAuthenticated,
      });
    } catch (e) {
      console.error("3. UI Diagnostics error:", e);
    }

    // 4. Check auth sync
    if (window.authSync) {
      const report = window.authSync.getStatusReport();
      console.log("4. Auth Sync Report:", report);
    } else {
      console.log("4. Auth Sync not available");
    }

    console.log("=== END AUTH STATUS CHECK ===");
  },

  fixStatus: () => {
    console.log("Attempting to fix auth status...");
    if (window.authSync) {
      window.authSync.fixAuthStatus();
      console.log("Auth status fix attempted");
    } else {
      console.error("Auth sync not available");
    }
  },

  forceLogin: (token: string) => {
    console.log("Force login with token...");
    if (window.authSync) {
      window.authSync.forceAuthStatus(true, token);
      console.log("Forced auth status to true");
    } else {
      console.error("Auth sync not available");
    }
  },

  showReport: () => {
    if (window.authSync) {
      const report = window.authSync.getStatusReport();
      console.log("=== FULL AUTH REPORT ===");
      console.log(JSON.stringify(report, null, 2));
      console.log("=== END REPORT ===");
    } else {
      console.error("Auth sync not available");
    }
  },

  syncAll: () => {
    console.log("Syncing all auth sources...");

    // Find the most authoritative token
    const token =
      localStorage.getItem("nscale_access_token") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("token");

    if (token) {
      console.log("Found token, syncing everywhere...");

      // 1. Auth store
      try {
        const authStore = useAuthStore();
        authStore.token = token;
        authStore.isAuthenticated = true;
        console.log("✓ Auth store updated");
      } catch (e) {
        console.error("✗ Auth store error:", e);
      }

      // 2. UI diagnostics
      try {
        const uiDiagnostics = UIDiagnostics.getInstance();
        if (uiDiagnostics.state?.value) {
          uiDiagnostics.state.value.isAuthenticated = true;
          console.log("✓ UI diagnostics updated");
        }
      } catch (e) {
        console.error("✗ UI diagnostics error:", e);
      }

      // 3. API service
      if (window.apiService?.axiosInstance) {
        window.apiService.axiosInstance.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${token}`;
        console.log("✓ API service updated");
      }

      // 4. Force page reload to apply changes
      console.log("Changes applied. Reloading page in 2 seconds...");
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      console.error("No token found to sync");
    }
  },
};

// Add helpful console message
console.log(
  "%c🔐 Auth Debug Commands Available:",
  "color: #00a550; font-weight: bold;",
);
console.log(
  "%c  window.authDebug.checkStatus() - Check auth status across all sources",
  "color: #666;",
);
console.log(
  "%c  window.authDebug.fixStatus() - Attempt to fix inconsistent auth status",
  "color: #666;",
);
console.log(
  "%c  window.authDebug.forceLogin(token) - Force authentication with token",
  "color: #666;",
);
console.log(
  "%c  window.authDebug.showReport() - Show detailed auth sync report",
  "color: #666;",
);
console.log(
  "%c  window.authDebug.syncAll() - Force sync auth everywhere and reload",
  "color: #666;",
);

export default window.authDebug;
