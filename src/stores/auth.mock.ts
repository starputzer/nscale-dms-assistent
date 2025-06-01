/**
 * Mock-Implementierung des Auth-Stores
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useAuthStore = defineStore("auth", () => {
  // State
  const token = ref(localStorage.getItem("mock_auth_token") || null);
  const user = ref(
    localStorage.getItem("mock_auth_user")
      ? JSON.parse(localStorage.getItem("mock_auth_user")!)
      : null,
  );
  const isAuthenticating = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const isAuthenticated = computed(() => !!token.value);
  const userRole = computed(() => user.value?.role || "user");

  // Actions
  async function login(username: string, password: string) {
    isAuthenticating.value = true;
    error.value = null;

    try {
      // Simuliere API-Verzögerung
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock-Login (keine echte Authentifizierung)
      if (username === "admin" && password === "admin") {
        const mockUser = {
          id: "1",
          username: "admin",
          name: "Administrator",
          email: "admin@example.com",
          role: "admin",
        };

        // State aktualisieren
        token.value = "mock-token-" + Date.now();
        user.value = mockUser;

        // In localStorage speichern
        localStorage.setItem("mock_auth_token", token.value);
        localStorage.setItem("mock_auth_user", JSON.stringify(mockUser));

        // AuthResponse-Format zurückgeben, wie es vom useAuthentication Composable erwartet wird
        return {
          token: token.value,
          user: mockUser,
          success: true,
        };
      } else if (username && password) {
        const mockUser = {
          id: "2",
          username: username,
          name: "Normaler Benutzer",
          email: username + "@example.com",
          role: "user",
        };

        // State aktualisieren
        token.value = "mock-token-" + Date.now();
        user.value = mockUser;

        // In localStorage speichern
        localStorage.setItem("mock_auth_token", token.value);
        localStorage.setItem("mock_auth_user", JSON.stringify(mockUser));

        // AuthResponse-Format zurückgeben, wie es vom useAuthentication Composable erwartet wird
        return {
          token: token.value,
          user: mockUser,
          success: true,
        };
      } else {
        throw new Error("Benutzername und Passwort sind erforderlich");
      }
    } catch (err: any) {
      console.error("Login-Fehler:", err);
      error.value = err.message || "Fehler beim Login";
      throw err;
    } finally {
      isAuthenticating.value = false;
    }
  }

  async function logout() {
    // Token löschen
    token.value = null;
    user.value = null;

    // Aus localStorage entfernen
    localStorage.removeItem("mock_auth_token");
    localStorage.removeItem("mock_auth_user");

    return { success: true };
  }

  async function validateToken() {
    // Im Mock-Modus immer erfolgreich validieren, wenn ein Token vorhanden ist
    if (token.value) {
      return { success: true, user: user.value, token: token.value };
    }

    throw new Error("Ungültiger Token");
  }

  async function refreshAuthToken(): Promise<boolean> {
    // Im Mock-Modus Token erneuern
    if (token.value) {
      token.value = "mock-token-" + Date.now();
      localStorage.setItem("mock_auth_token", token.value);
      return true;
    }

    throw new Error("Kein Token zum Erneuern vorhanden");
  }

  function createAuthHeaders() {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {};
  }

  return {
    // State
    token,
    user,
    isAuthenticating,
    error,

    // Computed
    isAuthenticated,
    userRole,

    // Actions
    login,
    logout,
    validateToken,
    refreshAuthToken,
    createAuthHeaders,
    getTokenExpiry: () => null, // Add missing methods for compatibility
  };
});
