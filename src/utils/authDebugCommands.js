/**
 * Authentication Debug Commands
 *
 * Erweiterte Debug-Befehle für die Konsole
 */

// Vollständige Auth-Diagnose
window.authDebug = {
  // Status überprüfen
  status: () => {
    console.log("=== Authentication Status ===");

    const authStore = window.__PINIA__.state.value.auth;
    const localToken = localStorage.getItem("nscale_access_token");
    const sessionToken = sessionStorage.getItem("nscale_access_token");

    const status = {
      "Auth Store Token": authStore?.token ? "Present" : "Missing",
      "LocalStorage Token": localToken ? "Present" : "Missing",
      "SessionStorage Token": sessionToken ? "Present" : "Missing",
      "Tokens Match": authStore?.token === localToken ? "Yes" : "No",
      "Is Authenticated": authStore?.isAuthenticated || false,
      User: authStore?.user?.email || "Not set",
    };

    console.table(status);

    if (localToken) {
      console.log("Token preview:", localToken.substring(0, 30) + "...");
    }

    return status;
  },

  // Token reparieren
  fix: () => {
    console.log("🔧 Attempting to fix authentication...");

    const authStore = window.__PINIA__.state.value.auth;
    const token =
      authStore?.token || localStorage.getItem("nscale_access_token");

    if (token) {
      // Ensure token is everywhere
      localStorage.setItem("nscale_access_token", token);
      sessionStorage.setItem("nscale_access_token", token);

      // Configure axios
      window.axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      console.log("✅ Authentication fixed");
      console.log("Token set in all locations");
    } else {
      console.error("❌ No token found to fix");
    }
  },

  // Batch-Request testen
  testBatch: async () => {
    console.log("🧪 Testing batch request...");

    try {
<<<<<<< HEAD
      const response = await fetch("/api/batch", {
=======
      const response = await fetch("/api/v1/batch", {
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("nscale_access_token")}`,
        },
        body: JSON.stringify({
          requests: [
            {
              id: "test-1",
              method: "GET",
<<<<<<< HEAD
              path: "/api/chat/sessions/stats",
=======
              path: "/api/sessions/stats",
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
            },
          ],
        }),
      });

      const result = await response.json();
      console.log("Batch response:", response.status, result);

      if (response.ok) {
        console.log("✅ Batch request successful");
      } else {
        console.error("❌ Batch request failed:", response.status);
      }
    } catch (error) {
      console.error("❌ Batch request error:", error);
    }
  },

  // Vollständige Diagnose
  diagnose: () => {
    console.log("🔍 Running full authentication diagnostics...");

    // Status
    window.authDebug.status();

    // Check interceptors
    console.log("\n=== Axios Interceptors ===");
    console.log(
      "Request interceptors:",
      window.axios.interceptors.request.handlers.length,
    );
    console.log(
      "Response interceptors:",
      window.axios.interceptors.response.handlers.length,
    );

    // Check headers
    console.log("\n=== Default Headers ===");
    console.log("Axios defaults:", window.axios.defaults.headers.common);

    // Authentication fix status
    if (window.authFix) {
      console.log("\n=== Auth Fix Status ===");
      window.authFix.diagnose();
    }
  },

  // Token manuell setzen
  setToken: (token) => {
    console.log("🔧 Manually setting token...");

    // Set everywhere
    localStorage.setItem("nscale_access_token", token);
    sessionStorage.setItem("nscale_access_token", token);

    // Update auth store
    const authStore = window.__PINIA__.state.value.auth;
    if (authStore) {
      authStore.token = token;
    }

    // Configure axios
    window.axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    console.log("✅ Token manually set");
  },

  // Alles löschen
  clear: () => {
    console.log("🗑️ Clearing all authentication data...");

    // Clear storage
    localStorage.removeItem("nscale_access_token");
    localStorage.removeItem("nscale_refresh_token");
    sessionStorage.clear();

    // Clear auth store
    const authStore = window.__PINIA__.state.value.auth;
    if (authStore) {
      authStore.logout();
    }

    // Clear axios defaults
    delete window.axios.defaults.headers.common["Authorization"];

    console.log("✅ All authentication data cleared");
  },
};

console.log("🛠️ Auth debug commands loaded. Available commands:");
console.log("  window.authDebug.status()   - Check authentication status");
console.log("  window.authDebug.fix()      - Fix common authentication issues");
console.log("  window.authDebug.testBatch() - Test batch API request");
console.log("  window.authDebug.diagnose()  - Run full diagnostics");
console.log("  window.authDebug.setToken(token) - Manually set token");
console.log("  window.authDebug.clear()    - Clear all auth data");
