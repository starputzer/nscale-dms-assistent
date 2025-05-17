/**
 * Debug script to check authentication status
 * Run this in the browser console to diagnose auth issues
 */

function checkAuth() {
  console.log("=== Authentication Debug Check ===");
  
  // Check localStorage
  console.log("\n1. LocalStorage tokens:");
  const authKeys = Object.keys(localStorage).filter(key => 
    key.includes('token') || key.includes('auth')
  );
  
  authKeys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`  ${key}: ${value ? value.substring(0, 20) + '...' : 'null'}`);
  });
  
  // Check specific keys
  console.log("\n2. Expected token keys:");
  console.log(`  nscale_access_token: ${localStorage.getItem('nscale_access_token')?.substring(0, 20) || 'null'}`);
  console.log(`  nscale_refresh_token: ${localStorage.getItem('nscale_refresh_token')?.substring(0, 20) || 'null'}`);
  
  // Check auth store if available
  if (window.__PINIA__) {
    console.log("\n3. Auth Store Status:");
    const authStore = window.__PINIA__.state.value.auth;
    console.log(`  token: ${authStore?.token?.substring(0, 20) || 'null'}`);
    console.log(`  refreshToken: ${authStore?.refreshToken?.substring(0, 20) || 'null'}`);
    console.log(`  isAuthenticated: ${authStore?.isAuthenticated}`);
    console.log(`  user: ${JSON.stringify(authStore?.user)}`);
  }
  
  // Check axios default headers
  if (window.axios) {
    console.log("\n4. Axios Default Headers:");
    console.log(`  Authorization: ${window.axios.defaults.headers.common['Authorization'] || 'not set'}`);
  }
  
  // Check API service
  console.log("\n5. API Service Check:");
  console.log("  Run 'window.authFix.checkAuthStatus()' for detailed status");
  
  console.log("\n=== End Debug Check ===");
}

// Make it available globally
window.checkAuth = checkAuth;

// Also provide quick access to auth fix methods
if (window.authFix) {
  window.authDebug = {
    check: checkAuth,
    status: () => window.authFix.checkAuthStatus(),
    refresh: () => window.authFix.forceTokenRefresh(),
    clear: () => window.authFix.clearAllAuthData()
  };
  
  console.log("Auth debug tools available:");
  console.log("  window.checkAuth() - Basic auth check");
  console.log("  window.authDebug.status() - Detailed status");
  console.log("  window.authDebug.refresh() - Force token refresh");
  console.log("  window.authDebug.clear() - Clear all auth data");
} else {
  console.log("Auth fix not initialized. Debug tools may be limited.");
}

// Auto-run check on load
setTimeout(checkAuth, 1000);