/**
 * Token Migration Fix
 *
 * Migriert alte Token-Keys zu den erwarteten Keys
 */

export function migrateAuthTokens() {
  console.log("🔧 Migrating auth tokens...");

  // Alte Keys
  const oldAccessTokenKey = "auth_token";
  const oldRefreshTokenKey = "auth_refresh_token";
  const oldUserKey = "auth_user";
  const oldExpiryKey = "auth_token_expiry";

  // Neue Keys
  const newAccessTokenKey = "nscale_access_token";
  const newRefreshTokenKey = "nscale_refresh_token";
  const newUserKey = "nscale_user";
  const newExpiryKey = "nscale_token_expiry";

  // Migrate access token
  const oldToken = localStorage.getItem(oldAccessTokenKey);
  if (oldToken && !localStorage.getItem(newAccessTokenKey)) {
    localStorage.setItem(newAccessTokenKey, oldToken);
    console.log("✅ Migrated access token");
  }

  // Migrate refresh token
  const oldRefreshToken = localStorage.getItem(oldRefreshTokenKey);
  if (oldRefreshToken && !localStorage.getItem(newRefreshTokenKey)) {
    localStorage.setItem(newRefreshTokenKey, oldRefreshToken);
    console.log("✅ Migrated refresh token");
  }

  // Migrate user
  const oldUser = localStorage.getItem(oldUserKey);
  if (oldUser && !localStorage.getItem(newUserKey)) {
    localStorage.setItem(newUserKey, oldUser);
    console.log("✅ Migrated user data");
  }

  // Migrate expiry
  const oldExpiry = localStorage.getItem(oldExpiryKey);
  if (oldExpiry && !localStorage.getItem(newExpiryKey)) {
    localStorage.setItem(newExpiryKey, oldExpiry);
    console.log("✅ Migrated token expiry");
  }

  // Update auth store if available
  if (window.__PINIA__) {
    const authStore = window.__PINIA__.state.value.auth;
    if (authStore && oldToken) {
      authStore.token = oldToken;
      console.log("✅ Updated auth store with migrated token");
    }
  }
}

// Run migration immediately
migrateAuthTokens();

// Export for manual usage
if (typeof window !== "undefined") {
  (window as any).migrateAuthTokens = migrateAuthTokens;
}
