/**
 * Debug authentication state
 */

import { useAuthStore } from "@/stores/auth";


export function debugAuthState() {
  const authStore = useAuthStore();

  console.group("🔍 Authentication Debug");
  console.log("Is Authenticated:", authStore.isAuthenticated);
  console.log(
    "Token:",
    authStore.token ? `${authStore.token.substring(0, 20)}...` : "null",
  );
  console.log("User:", authStore.user);
  console.log(
    "Token in localStorage:",
    localStorage.getItem("nscale_access_token"),
  );
  console.log("Pinia state:", localStorage.getItem("pinia-state"));
  console.groupEnd();
}

export function clearAuthAndRedirect() {
  console.log("🔄 Clearing auth and redirecting to login...");

  // Clear all auth-related storage
  localStorage.removeItem("nscale_access_token");
  localStorage.removeItem("nscale_refresh_token");
  localStorage.removeItem("pinia-state");
  sessionStorage.clear();

  // Use window.location for a hard redirect
  window.location.href = "/login";
}

// Make functions globally available
if (typeof window !== "undefined") {
  (window as any).debugAuthState = debugAuthState;
  (window as any).clearAuthAndRedirect = clearAuthAndRedirect;
}
