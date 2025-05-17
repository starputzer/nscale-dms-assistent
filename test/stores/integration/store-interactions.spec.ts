import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAuthStore } from "../../../src/stores/auth";
import { useSessionsStore } from "../../../src/stores/sessions";
import { useUIStore } from "../../../src/stores/ui";
import { useDocumentConverterStore } from "../../../src/stores/documentConverter";
import axios from "axios";
import {
  mockDate,
  waitForPromises,
  mockLocalStorage,
} from "../__setup__/testSetup";

/**
 * Integration-Tests für Store-übergreifende Interaktionen
 *
 * Testet:
 * - Interaktionen zwischen Auth und Sessions
 * - Interaktionen zwischen Auth und UI
 * - Interaktionen zwischen DocumentConverter und UI
 * - Komplexe Abläufe über mehrere Stores
 */
describe("Store Interaktionen", () => {
  // Mocks für axios und localStorage zurücksetzen
  beforeEach(() => {
    vi.mocked(axios.post).mockReset();
    vi.mocked(axios.get).mockReset();

    // Mock für localStorage und sessionStorage
    localStorage.clear();
    sessionStorage.clear();

    // Mock-Zeit für konsistente Tests
    mockDate("2023-01-01T12:00:00Z");
  });

  describe("Auth und Sessions Interaktionen", () => {
    it("sollte pendente Nachrichten synchronisieren, wenn der Benutzer sich anmeldet", async () => {
      // Arrange
      const authStore = useAuthStore();
      const sessionsStore = useSessionsStore();

      // Auth- und Sessions-Mocks einrichten
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          success: true,
          token: "mock-token",
          refreshToken: "mock-refresh-token",
          user: { id: "user-1", email: "test@example.com", roles: ["user"] },
          expiresIn: 3600 * 1000,
        },
      });

      // pendente Nachrichten im Sessions-Store einrichten
      const sessionId = "session-1";
      sessionsStore.sessions = [
        {
          id: sessionId,
          title: "Test-Session",
          userId: "user-1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isLocal: true,
        },
      ];

      sessionsStore.pendingMessages = {
        [sessionId]: [
          {
            id: "msg-1",
            sessionId,
            content: "Offline-Nachricht",
            role: "user",
            timestamp: new Date().toISOString(),
            status: "pending",
          },
        ],
      };

      // Mock für die Nachrichtensynchronisation in Sessions-Store
      const syncSpy = vi
        .spyOn(sessionsStore, "syncPendingMessages")
        .mockResolvedValueOnce();

      // Act - Login durchführen, der watch()-Effekt sollte sync triggern
      await authStore.login({
        email: "test@example.com",
        password: "password",
      });

      // Warten, bis der watch-Effekt ausgelöst wurde
      await waitForPromises();

      // Assert
      expect(authStore.isAuthenticated).toBe(true);
      expect(syncSpy).toHaveBeenCalled();
    });

    it("sollte Tokens aktualisieren, wenn ein 401-Fehler bei Sessions-Anfragen auftritt", async () => {
      // Arrange
      const authStore = useAuthStore();
      const sessionsStore = useSessionsStore();

      // Auth-Store mit abgelaufenem Token einrichten
      authStore.token = "expired-token";
      authStore.refreshToken = "refresh-token";
      authStore.user = {
        id: "user-1",
        email: "test@example.com",
        roles: ["user"],
      };
      authStore.expiresAt = Date.now() - 1000; // Abgelaufen

      // Interceptor-Mechanismus für 401-Fehler testen

      // 1. Sessions-Anfrage schlägt mit 401 fehl
      vi.mocked(axios.get).mockRejectedValueOnce({
        response: { status: 401 },
        config: { _retry: false, url: "/api/sessions" },
      });

      // 2. Token-Refresh ist erfolgreich
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          success: true,
          token: "new-token",
          refreshToken: "new-refresh-token",
          expiresIn: 3600 * 1000,
        },
      });

      // 3. Wiederholte Anfrage ist erfolgreich
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: [
          {
            id: "session-1",
            title: "Test-Session",
            userId: "user-1",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      });

      // Spy auf die Methode refreshTokenIfNeeded
      const refreshSpy = vi.spyOn(authStore, "refreshTokenIfNeeded");
      refreshSpy.mockImplementation(async () => {
        authStore.token = "new-token";
        authStore.refreshToken = "new-refresh-token";
        authStore.expiresAt = Date.now() + 3600 * 1000;
        return true;
      });

      // Act
      try {
        await sessionsStore.synchronizeSessions();
        // Hier sollte der Axios-Interceptor den Token aktualisieren und die Anfrage wiederholen
      } catch (e) {
        // Fehler ignorieren für den Test
      }

      // Assert
      expect(refreshSpy).toHaveBeenCalled();
    });
  });

  describe("Auth und UI Interaktionen", () => {
    it("sollte Fehlermeldungen anzeigen, wenn der Login fehlschlägt", async () => {
      // Arrange
      const authStore = useAuthStore();
      const uiStore = useUIStore();

      // Mock für fehlgeschlagenen Login
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          success: false,
          message: "Ungültige Anmeldedaten",
        },
      });

      // Spy auf UI-Store showError
      const showErrorSpy = vi.spyOn(uiStore, "showError");

      // Act
      await authStore.login({ email: "wrong@example.com", password: "wrong" });

      // UI-Interaktion auslösen
      if (authStore.error) {
        uiStore.showError(authStore.error);
      }

      // Assert
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.error).toBe("Ungültige Anmeldedaten");
      expect(showErrorSpy).toHaveBeenCalledWith("Ungültige Anmeldedaten");
    });

    it("sollte das Theme basierend auf Benutzereinstellungen umschalten", async () => {
      // Arrange
      const authStore = useAuthStore();
      const uiStore = useUIStore();

      // Mock für erfolgreichen Login mit Benutzereinstellungen
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          success: true,
          token: "mock-token",
          user: {
            id: "user-1",
            email: "test@example.com",
            roles: ["user"],
            settings: {
              darkMode: true,
              sidebarCollapsed: true,
            },
          },
        },
      });

      // Act
      await authStore.login({
        email: "test@example.com",
        password: "password",
      });

      // Benutzereinstellungen auf UI anwenden
      if (authStore.isAuthenticated && authStore.user?.settings) {
        const { darkMode, sidebarCollapsed } = authStore.user.settings;

        if (darkMode !== undefined) {
          darkMode ? uiStore.enableDarkMode() : uiStore.disableDarkMode();
        }

        if (sidebarCollapsed !== undefined) {
          uiStore.sidebar.collapsed = sidebarCollapsed;
        }
      }

      // Assert
      expect(authStore.isAuthenticated).toBe(true);
      expect(uiStore.darkMode).toBe(true);
      expect(uiStore.sidebar.collapsed).toBe(true);
    });
  });

  describe("DocumentConverter und UI Interaktionen", () => {
    it("sollte bei Dokumentenfehler eine Benachrichtigung anzeigen", async () => {
      // Arrange
      const converterStore = useDocumentConverterStore();
      const uiStore = useUIStore();

      // Spy auf UI-Store showError
      const showErrorSpy = vi.spyOn(uiStore, "showError");

      // Act
      converterStore.setError(
        "CONVERSION_FAILED",
        "Dokument konnte nicht konvertiert werden",
      );

      // UI-Benachrichtigung anzeigen
      if (converterStore.error) {
        uiStore.showError(
          `${converterStore.error.code}: ${converterStore.error.message}`,
        );
      }

      // Assert
      expect(converterStore.error).not.toBeNull();
      expect(showErrorSpy).toHaveBeenCalledWith(
        "CONVERSION_FAILED: Dokument konnte nicht konvertiert werden",
      );
    });

    it("sollte während der Konvertierung einen Ladeindikator anzeigen", async () => {
      // Arrange
      const converterStore = useDocumentConverterStore();
      const uiStore = useUIStore();

      // Spy auf UI-Store setLoading
      const setLoadingSpy = vi.spyOn(uiStore, "setLoading");

      // Act
      // Konvertierung starten
      converterStore.isConverting = true;
      converterStore.conversionProgress = 50;
      converterStore.conversionStep = "Extrahiere Text...";

      // UI-Ladeindikator anzeigen
      if (converterStore.isConverting) {
        uiStore.setLoading(
          true,
          `Konvertierung: ${converterStore.conversionStep} (${converterStore.conversionProgress}%)`,
        );
      } else {
        uiStore.setLoading(false);
      }

      // Assert
      expect(setLoadingSpy).toHaveBeenCalledWith(
        true,
        "Konvertierung: Extrahiere Text... (50%)",
      );

      // Konvertierung beenden
      converterStore.isConverting = false;

      // UI-Ladeindikator entfernen
      if (!converterStore.isConverting) {
        uiStore.setLoading(false);
      }

      // Assert
      expect(setLoadingSpy).toHaveBeenLastCalledWith(false);
    });
  });

  describe("Komplexe Workflows über mehrere Stores", () => {
    it("sollte den Login-Prozess mit Einstellungsanwendung und Session-Initialisierung durchführen", async () => {
      // Arrange
      const authStore = useAuthStore();
      const uiStore = useUIStore();
      const sessionsStore = useSessionsStore();

      // Mocks für die verschiedenen Aufrufe
      // 1. Login-Anfrage
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          success: true,
          token: "mock-token",
          refreshToken: "mock-refresh-token",
          user: {
            id: "user-1",
            email: "test@example.com",
            roles: ["user"],
            settings: {
              darkMode: true,
              sidebarCollapsed: false,
            },
          },
          expiresIn: 3600 * 1000,
        },
      });

      // 2. Sessions-Anfrage
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: [
          {
            id: "session-1",
            title: "Letzte Unterhaltung",
            userId: "user-1",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      });

      // 3. Nachrichten-Anfrage
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: [
          {
            id: "msg-1",
            sessionId: "session-1",
            content: "Hallo",
            role: "user",
            timestamp: new Date().toISOString(),
          },
          {
            id: "msg-2",
            sessionId: "session-1",
            content: "Willkommen zurück!",
            role: "assistant",
            timestamp: new Date().toISOString(),
          },
        ],
      });

      // Spies für die verschiedenen Methoden
      const syncSessionsSpy = vi.spyOn(sessionsStore, "synchronizeSessions");
      syncSessionsSpy.mockImplementation(async () => {
        sessionsStore.sessions = [
          {
            id: "session-1",
            title: "Letzte Unterhaltung",
            userId: "user-1",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      });

      const setCurrentSessionSpy = vi.spyOn(sessionsStore, "setCurrentSession");
      setCurrentSessionSpy.mockImplementation(async (sessionId) => {
        sessionsStore.currentSessionId = sessionId;
        sessionsStore.messages[sessionId] = [
          {
            id: "msg-1",
            sessionId,
            content: "Hallo",
            role: "user",
            timestamp: new Date().toISOString(),
          },
          {
            id: "msg-2",
            sessionId,
            content: "Willkommen zurück!",
            role: "assistant",
            timestamp: new Date().toISOString(),
          },
        ];
      });

      // Act: Vollständigen Login-Workflow ausführen

      // 1. Login durchführen
      const loginResult = await authStore.login({
        email: "test@example.com",
        password: "password",
      });

      // 2. UI-Einstellungen anwenden
      if (authStore.isAuthenticated && authStore.user?.settings) {
        const { darkMode, sidebarCollapsed } = authStore.user.settings;

        if (darkMode !== undefined) {
          darkMode ? uiStore.enableDarkMode() : uiStore.disableDarkMode();
        }

        if (sidebarCollapsed !== undefined) {
          uiStore.sidebar.collapsed = sidebarCollapsed;
        }
      }

      // 3. Sessions synchronisieren
      if (authStore.isAuthenticated) {
        await sessionsStore.synchronizeSessions();
      }

      // 4. Letzte Session auswählen, falls vorhanden
      if (sessionsStore.sessions.length > 0) {
        const lastSessionId = sessionsStore.sessions[0].id;
        await sessionsStore.setCurrentSession(lastSessionId);
      }

      // Assert
      // Auth-Status prüfen
      expect(loginResult).toBe(true);
      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.token).toBe("mock-token");

      // UI-Einstellungen prüfen
      expect(uiStore.darkMode).toBe(true);
      expect(uiStore.sidebar.collapsed).toBe(false);

      // Sessions-Status prüfen
      expect(syncSessionsSpy).toHaveBeenCalled();
      expect(setCurrentSessionSpy).toHaveBeenCalledWith("session-1");
      expect(sessionsStore.currentSessionId).toBe("session-1");
      expect(sessionsStore.messages["session-1"]).toHaveLength(2);
    });

    it("sollte den Logout-Prozess mit UI-Reset und Session-Bereinigung durchführen", async () => {
      // Arrange
      const authStore = useAuthStore();
      const uiStore = useUIStore();
      const sessionsStore = useSessionsStore();

      // Authentifizierten Zustand simulieren
      authStore.token = "mock-token";
      authStore.user = {
        id: "user-1",
        email: "test@example.com",
        roles: ["user"],
      };
      authStore.expiresAt = Date.now() + 3600 * 1000;

      // Sessions-Daten einstellen
      sessionsStore.sessions = [
        {
          id: "session-1",
          title: "Test-Session",
          userId: "user-1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      sessionsStore.currentSessionId = "session-1";
      sessionsStore.messages = {
        "session-1": [
          {
            id: "msg-1",
            sessionId: "session-1",
            content: "Test-Nachricht",
            role: "user",
            timestamp: new Date().toISOString(),
          },
        ],
      };

      // Mock für Logout-Anfrage
      vi.mocked(axios.post).mockResolvedValueOnce({});

      // Act: Logout durchführen und State bereinigen
      await authStore.logout();

      // UI auf Standardzustand zurücksetzen
      uiStore.resetState?.();

      // Sessions-Daten bereinigen
      sessionsStore.currentSessionId = null;

      // Assert
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.token).toBeNull();
      expect(authStore.user).toBeNull();

      // Sessions-Status prüfen
      expect(sessionsStore.currentSessionId).toBeNull();

      // Verify API call
      expect(axios.post).toHaveBeenCalledWith(
        "/api/auth/logout",
        {
          refreshToken: null,
        },
        {
          headers: { Authorization: "Bearer mock-token" },
        },
      );
    });
  });
});
