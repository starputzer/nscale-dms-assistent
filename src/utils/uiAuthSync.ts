/**
 * UI Auth Sync - Ensures UI diagnostics reflects correct auth status
 */

import { watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { UIDiagnostics } from "./uiDiagnostics";

export function setupUIAuthSync() {
  try {
    const authStore = useAuthStore();
    const uiDiagnostics = UIDiagnostics.getInstance();

    // Initial sync
    if (uiDiagnostics.state?.value) {
      uiDiagnostics.state.value.isAuthenticated = authStore.isAuthenticated;
    }

    // Watch for changes
    watch(
      () => authStore.isAuthenticated,
      (newValue) => {
        if (uiDiagnostics.state?.value) {
          uiDiagnostics.state.value.isAuthenticated = newValue;
          console.log(
            "UI Auth Sync: Updated UI diagnostics auth status to",
            newValue,
          );
        }
      },
    );

    console.log("UI Auth Sync: Setup complete");
  } catch (error) {
    console.error("UI Auth Sync: Failed to setup", error);
  }
}

// Auto-initialize
setupUIAuthSync();
