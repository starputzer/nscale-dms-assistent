/**
 * Batch Request Authentication Fix
 *
 * Spezielle Korrektur für Batch-Request-Authentifizierungsprobleme
 */

import { apiService } from "./ApiService";

export function fixBatchRequestAuth() {
  console.log("🔧 Applying batch request authentication fix...");

  // Override the batch request method
  const originalPost = apiService.post;

  apiService.post = function (url: string, data?: any, config?: any) {
    // Special handling for batch requests
    if (url.includes("/batch")) {
      console.log("📦 Detected batch request, ensuring authentication...");

      // Get token from multiple sources
      let token = localStorage.getItem("nscale_access_token");

      if (!token) {
        // Try from auth store
        const authStore = window.__PINIA__?.state?.value?.auth;
        token = authStore?.token;
      }

      if (token) {
        // Ensure config exists
        config = config || {};
        config.headers = config.headers || {};

        // Force Bearer token
        config.headers.Authorization = `Bearer ${token}`;
        console.log(
          "✅ Batch request auth header set:",
          config.headers.Authorization.substring(0, 30) + "...",
        );
      } else {
        console.error("❌ No auth token available for batch request!");
      }
    }

    return originalPost.call(this, url, data, config);
  };

  console.log("✅ Batch request authentication fix applied");
}

// Apply the fix immediately
fixBatchRequestAuth();
