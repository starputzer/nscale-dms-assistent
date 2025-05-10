import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../src/stores/auth';
import axios from 'axios';
import { createApiResponse, mockDate, createMockUser, waitForPromises } from './__setup__/testSetup';
import jwtDecode from 'jwt-decode';

/**
 * Tests für den Auth-Store
 *
 * Testet:
 * - Login/Logout-Funktionalität
 * - Token-Management und Refresh
 * - Berechtigungsprüfung
 * - Persistenz und Migration
 * - Registrierung und Benutzerpräferenzen
 * - Fehlerbehandlung und Wiederherstellung
 * - Token-Validierung und Sicherheit
 */
describe('Auth Store', () => {
  // Mock-Daten
  const mockCredentials = {
    email: 'test@example.com',
    password: 'password123'
  };

  const mockRegisterCredentials = {
    email: 'newuser@example.com',
    password: 'password123',
    name: 'New User'
  };

  const mockUser = createMockUser();

  const mockLoginResponse = {
    success: true,
    token: 'mock-token-123',
    refreshToken: 'mock-refresh-token-123',
    user: mockUser,
    expiresIn: 3600 * 1000 // 1 Stunde in Millisekunden
  };

  // Setzt Mocks für jeden Test zurück
  beforeEach(() => {
    vi.mocked(axios.post).mockReset();
    vi.mocked(axios.get).mockReset();
    vi.mocked(axios.patch).mockReset();

    // Setze localStorage und sessionStorage zwischen den Tests zurück
    localStorage.clear();
    sessionStorage.clear();

    // Mock-Zeit für konsistente Tests
    mockDate('2023-01-01T12:00:00Z');

    // Mock für jwtDecode
    vi.mock('jwt-decode', () => {
      return {
        default: vi.fn().mockImplementation(token => {
          // Einfacher Mock für JWT-Decode
          if (token === 'mock-token-123' || token === 'new-token-456' || token === 'legacy-token-123') {
            return {
              sub: 'user-1',
              exp: Math.floor((Date.now() + 3600 * 1000) / 1000), // 1 Stunde in der Zukunft
              role: 'user'
            };
          } else if (token === 'expired-token') {
            return {
              sub: 'user-1',
              exp: Math.floor((Date.now() - 3600 * 1000) / 1000), // 1 Stunde in der Vergangenheit
              role: 'user'
            };
          } else if (token === 'invalid-token') {
            throw new Error('Invalid token');
          }
          return {};
        })
      };
    });
  });

  describe('Initialisierung', () => {
    it('sollte mit Standardwerten initialisiert werden', () => {
      // Arrange & Act
      const store = useAuthStore();

      // Assert
      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.refreshToken).toBeNull();
      expect(store.expiresAt).toBeNull();
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.isAdmin).toBe(false);
      expect(store.permissions.size).toBe(0);
    });

    it('sollte Legacy-Daten aus dem localStorage migrieren', () => {
      // Arrange
      const legacyUser = JSON.stringify(mockUser);
      const legacyToken = 'legacy-token-123';
      const legacyExpires = Date.now() + 60 * 60 * 1000; // 1 Stunde in der Zukunft

      localStorage.setItem('user', legacyUser);
      localStorage.setItem('token', legacyToken);
      localStorage.setItem('token_expires', legacyExpires.toString());

      // Act
      const store = useAuthStore();
      store.migrateFromLegacyStorage();

      // Assert
      expect(store.user).toEqual(mockUser);
      expect(store.token).toBe(legacyToken);
      expect(store.expiresAt).toBe(legacyExpires);
      expect(store.isAuthenticated).toBe(true);
    });

    it('sollte den initialize-Prozess korrekt durchführen', () => {
      // Arrange
      const store = useAuthStore();
      store.token = 'mock-token-123';
      store.refreshToken = 'mock-refresh-token-123';
      store.user = { ...mockUser, roles: ['user'] };
      store.expiresAt = Date.now() + 60 * 60 * 1000;

      const refreshSpy = vi.spyOn(store, 'refreshTokenIfNeeded');

      // Act
      const cleanup = store.initialize();

      // Assert
      expect(refreshSpy).toHaveBeenCalled();
      expect(typeof cleanup).toBe('function');

      // Cleanup ausführen
      cleanup();
    });

    it('sollte die Daten nach der Migration im localStorage speichern', () => {
      // Arrange
      const legacyUser = JSON.stringify(mockUser);
      const legacyToken = 'legacy-token-123';

      localStorage.setItem('user', legacyUser);
      localStorage.setItem('token', legacyToken);

      // Act
      const store = useAuthStore();
      store.migrateFromLegacyStorage();

      // Assert - Überprüfen, ob die Legacy-Daten in den neuen Format-Keys gespeichert wurden
      const storedData = JSON.parse(localStorage.getItem('auth') || '{}');
      expect(storedData.token).toBe(legacyToken);
      expect(storedData.user).toEqual(expect.objectContaining({ id: mockUser.id }));
    });
  });

  describe('Login', () => {
    it('sollte bei erfolgreicher Anmeldung Benutzer, Token und Ablaufzeit setzen', async () => {
      // Arrange
      vi.mocked(axios.post).mockResolvedValueOnce(createApiResponse(mockLoginResponse));
      const store = useAuthStore();

      // Act
      const result = await store.login(mockCredentials);

      // Assert
      expect(result).toBe(true);
      expect(store.user).toEqual(mockUser);
      expect(store.token).toBe('mock-token-123');
      expect(store.refreshToken).toBe('mock-refresh-token-123');
      expect(store.expiresAt).toBe(Date.now() + 3600 * 1000);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.isAuthenticated).toBe(true);

      // Verify API call
      expect(axios.post).toHaveBeenCalledWith('/api/auth/login', mockCredentials);
    });

    it('sollte bei fehlgeschlagener Anmeldung einen Fehler setzen', async () => {
      // Arrange
      vi.mocked(axios.post).mockResolvedValueOnce(createApiResponse({
        success: false,
        message: 'Ungültige Anmeldedaten'
      }));
      const store = useAuthStore();

      // Act
      const result = await store.login(mockCredentials);

      // Assert
      expect(result).toBe(false);
      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.error).toBe('Ungültige Anmeldedaten');
    });

    it('sollte Netzwerkfehler behandeln', async () => {
      // Arrange
      vi.mocked(axios.post).mockRejectedValueOnce(new Error('Network Error'));
      const store = useAuthStore();

      // Act
      const result = await store.login(mockCredentials);

      // Assert
      expect(result).toBe(false);
      expect(store.error).toBe('Netzwerkfehler beim Login');
      expect(store.isAuthenticated).toBe(false);
    });

    it('sollte einen ungültigen Token vom Server erkennen und ablehnen', async () => {
      // Arrange
      vi.mocked(axios.post).mockResolvedValueOnce(createApiResponse({
        success: true,
        token: 'invalid-token',
        user: mockUser
      }));
      const store = useAuthStore();

      // Act
      const result = await store.login(mockCredentials);

      // Assert
      expect(result).toBe(false);
      expect(store.error).toBe('Ungültiger Token vom Server erhalten');
      expect(store.isAuthenticated).toBe(false);
    });
  });

  describe('Registrierung', () => {
    it('sollte einen neuen Benutzer erfolgreich registrieren', async () => {
      // Arrange
      vi.mocked(axios.post).mockResolvedValueOnce(createApiResponse({
        success: true,
        token: 'mock-token-123',
        refreshToken: 'mock-refresh-token-123',
        user: {
          id: 'new-user-1',
          email: mockRegisterCredentials.email,
          name: mockRegisterCredentials.name,
          roles: ['user']
        },
        expiresIn: 3600 * 1000
      }));

      const store = useAuthStore();

      // Act
      const result = await store.register(mockRegisterCredentials);

      // Assert
      expect(result).toBe(true);
      expect(store.isAuthenticated).toBe(true);
      expect(store.user).toEqual(expect.objectContaining({
        email: mockRegisterCredentials.email,
        name: mockRegisterCredentials.name
      }));
      expect(store.token).toBe('mock-token-123');

      // Verify API call
      expect(axios.post).toHaveBeenCalledWith('/api/auth/register', mockRegisterCredentials);
    });

    it('sollte bei fehlgeschlagener Registrierung einen Fehler setzen', async () => {
      // Arrange
      vi.mocked(axios.post).mockResolvedValueOnce(createApiResponse({
        success: false,
        message: 'E-Mail wird bereits verwendet'
      }));

      const store = useAuthStore();

      // Act
      const result = await store.register(mockRegisterCredentials);

      // Assert
      expect(result).toBe(false);
      expect(store.error).toBe('E-Mail wird bereits verwendet');
      expect(store.isAuthenticated).toBe(false);
    });

    it('sollte Netzwerkfehler bei der Registrierung behandeln', async () => {
      // Arrange
      vi.mocked(axios.post).mockRejectedValueOnce(new Error('Network Error'));
      const store = useAuthStore();

      // Act
      const result = await store.register(mockRegisterCredentials);

      // Assert
      expect(result).toBe(false);
      expect(store.error).toContain('Netzwerkfehler');
      expect(store.isAuthenticated).toBe(false);
    });
  });

  describe('Logout', () => {
    it('sollte den Benutzer abmelden und den State zurücksetzen', async () => {
      // Arrange
      vi.mocked(axios.post).mockResolvedValueOnce(createApiResponse({}));
      const store = useAuthStore();

      // Benutzer anmelden
      store.token = 'mock-token-123';
      store.refreshToken = 'mock-refresh-token-123';
      store.user = mockUser;
      store.expiresAt = Date.now() + 3600 * 1000;

      // Act
      await store.logout();

      // Assert
      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.refreshToken).toBeNull();
      expect(store.expiresAt).toBeNull();
      expect(store.isAuthenticated).toBe(false);

      // Verify API call
      expect(axios.post).toHaveBeenCalledWith('/api/auth/logout', {
        refreshToken: 'mock-refresh-token-123'
      }, {
        headers: { Authorization: 'Bearer mock-token-123' }
      });
    });

    it('sollte bei fehlgeschlagenem API-Aufruf trotzdem lokal abmelden', async () => {
      // Arrange
      vi.mocked(axios.post).mockRejectedValueOnce(new Error('Network Error'));
      const store = useAuthStore();

      // Benutzer anmelden
      store.token = 'mock-token-123';
      store.refreshToken = 'mock-refresh-token-123';
      store.user = mockUser;
      store.expiresAt = Date.now() + 3600 * 1000;

      // Act
      await store.logout();

      // Assert - sollte trotz API-Fehler abgemeldet sein
      expect(store.token).toBeNull();
      expect(store.refreshToken).toBeNull();
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });

    it('sollte alle Timer und Intervalle bereinigen', async () => {
      // Arrange
      const store = useAuthStore();
      global.clearInterval = vi.fn();

      // Benutzer anmelden und Timer-Referenz setzen
      store.token = 'mock-token-123';
      store.refreshToken = 'mock-refresh-token-123';
      store.user = mockUser;
      store.expiresAt = Date.now() + 3600 * 1000;

      // Private Eigenschaft für den Test zugänglich machen
      const timerSymbol = Object.getOwnPropertySymbols(store).find(
        sym => sym.description === 'tokenRefreshInterval'
      );

      if (timerSymbol) {
        store[timerSymbol] = 123; // Mock-Timer-ID
      }

      // Act
      await store.logout();

      // Assert
      expect(clearInterval).toHaveBeenCalledWith(123);
    });
  });

  describe('Token Refresh', () => {
    it('sollte den Token aktualisieren, wenn er bald abläuft', async () => {
      // Arrange
      const store = useAuthStore();

      // Benutzer mit fast abgelaufenem Token setzen
      store.token = 'mock-token-123';
      store.refreshToken = 'mock-refresh-token-123';
      store.user = mockUser;
      // Token läuft in 2 Minuten ab (unter dem 5-Minuten-Threshold)
      store.expiresAt = Date.now() + 2 * 60 * 1000;

      // Mock für die Token-Refresh-Antwort
      vi.mocked(axios.post).mockResolvedValueOnce(createApiResponse({
        success: true,
        token: 'new-token-456',
        refreshToken: 'new-refresh-token-456',
        expiresIn: 3600 * 1000 // 1 Stunde
      }));

      // Act
      const result = await store.refreshTokenIfNeeded();

      // Assert
      expect(result).toBe(true);
      expect(store.token).toBe('new-token-456');
      expect(store.refreshToken).toBe('new-refresh-token-456');
      expect(store.expiresAt).toBe(Date.now() + 3600 * 1000);

      // Verify API call
      expect(axios.post).toHaveBeenCalledWith('/api/auth/refresh', {
        refreshToken: 'mock-refresh-token-123'
      });
    });

    it('sollte keinen Refresh durchführen, wenn der Token noch gültig ist', async () => {
      // Arrange
      const store = useAuthStore();

      // Benutzer mit noch gültigem Token setzen
      store.token = 'mock-token-123';
      store.refreshToken = 'mock-refresh-token-123';
      store.user = mockUser;
      // Token läuft in 10 Minuten ab (über dem 5-Minuten-Threshold)
      store.expiresAt = Date.now() + 10 * 60 * 1000;

      // Act
      const result = await store.refreshTokenIfNeeded();

      // Assert
      expect(result).toBe(true);
      expect(store.token).toBe('mock-token-123'); // Unverändert
      expect(store.refreshToken).toBe('mock-refresh-token-123'); // Unverändert

      // Verify no API call was made
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('sollte bei Refresh-Fehler den Benutzer abmelden', async () => {
      // Arrange
      const store = useAuthStore();
      const logoutSpy = vi.spyOn(store, 'logout');

      // Benutzer mit fast abgelaufenem Token setzen
      store.token = 'mock-token-123';
      store.refreshToken = 'mock-refresh-token-123';
      store.user = mockUser;
      store.expiresAt = Date.now() + 2 * 60 * 1000;

      // Mock für Fehler bei Token-Refresh
      vi.mocked(axios.post).mockResolvedValueOnce(createApiResponse({
        success: false,
        message: 'Ungültiger Refresh Token'
      }));

      // Act
      const result = await store.refreshTokenIfNeeded();

      // Assert
      expect(result).toBe(false);
      expect(logoutSpy).toHaveBeenCalled();
    });

    it('sollte nicht mehrere gleichzeitige Refreshes starten', async () => {
      // Arrange
      const store = useAuthStore();

      // Benutzer mit fast abgelaufenem Token setzen
      store.token = 'mock-token-123';
      store.refreshToken = 'mock-refresh-token-123';
      store.user = mockUser;
      store.expiresAt = Date.now() + 2 * 60 * 1000;

      // Simulate refresh in progress
      store.tokenRefreshInProgress = true;

      // Act
      const result = await store.refreshTokenIfNeeded();

      // Assert
      expect(result).toBe(true); // Sollte erfolgreich zurückkehren
      expect(axios.post).not.toHaveBeenCalled(); // Sollte keinen API-Aufruf machen
    });

    it('sollte den Benutzerzustand aus dem aktualisierten Token extrahieren', async () => {
      // Arrange
      const store = useAuthStore();

      // Benutzer mit fast abgelaufenem Token setzen
      store.token = 'mock-token-123';
      store.refreshToken = 'mock-refresh-token-123';
      store.user = mockUser;
      store.expiresAt = Date.now() + 2 * 60 * 1000;

      const updatedUser = {
        ...mockUser,
        roles: ['user', 'editor']
      };

      // Mock für die Token-Refresh-Antwort mit aktualisiertem Benutzer
      vi.mocked(axios.post).mockResolvedValueOnce(createApiResponse({
        success: true,
        token: 'new-token-456',
        refreshToken: 'new-refresh-token-456',
        expiresIn: 3600 * 1000,
        user: updatedUser
      }));

      // Act
      await store.refreshTokenIfNeeded();

      // Assert
      expect(store.user).toEqual(updatedUser);
      expect(store.permissions.size).toBeGreaterThan(0); // Berechtigungen sollten extrahiert worden sein
    });
  });

  describe('Token-Validierung', () => {
    it('sollte einen gültigen Token korrekt validieren', () => {
      // Arrange
      const store = useAuthStore();

      // Act
      const result = store.validateToken('mock-token-123');

      // Assert
      expect(result).toBe(true);
      expect(jwtDecode).toHaveBeenCalledWith('mock-token-123');
    });

    it('sollte einen abgelaufenen Token als ungültig erkennen', () => {
      // Arrange
      const store = useAuthStore();

      // Act
      const result = store.validateToken('expired-token');

      // Assert
      expect(result).toBe(false);
    });

    it('sollte bei Token-Dekodierungsfehlern false zurückgeben', () => {
      // Arrange
      const store = useAuthStore();

      // Act
      const result = store.validateToken('invalid-token');

      // Assert
      expect(result).toBe(false);
    });

    it('sollte ungültige Token-Formate erkennen', () => {
      // Arrange
      const store = useAuthStore();

      // Act & Assert
      expect(store.validateToken('')).toBe(false);
      expect(store.validateToken('not-a-jwt')).toBe(false);
      expect(store.validateToken('header.payload')).toBe(false); // Fehlt die Signatur
    });

    it('sollte den aktuellen Token prüfen und bei Bedarf aktualisieren', async () => {
      // Arrange
      const store = useAuthStore();
      store.token = 'mock-token-123';
      store.refreshToken = 'mock-refresh-token-123';
      store.expiresAt = Date.now() + 20 * 60 * 1000; // Gültiger Token

      const validateSpy = vi.spyOn(store, 'validateToken');
      const refreshSpy = vi.spyOn(store, 'refreshTokenIfNeeded');

      // Act
      const result = await store.validateCurrentToken();

      // Assert
      expect(result).toBe(true);
      expect(validateSpy).toHaveBeenCalledWith('mock-token-123');
      expect(refreshSpy).not.toHaveBeenCalled(); // Kein Refresh nötig
    });

    it('sollte bei ungültigem Token einen Refresh versuchen', async () => {
      // Arrange
      const store = useAuthStore();
      store.token = 'invalid-token';
      store.refreshToken = 'mock-refresh-token-123';

      const validateSpy = vi.spyOn(store, 'validateToken').mockReturnValue(false);
      const refreshSpy = vi.spyOn(store, 'refreshTokenIfNeeded').mockResolvedValue(true);

      // Act
      const result = await store.validateCurrentToken();

      // Assert
      expect(result).toBe(true);
      expect(validateSpy).toHaveBeenCalledWith('invalid-token');
      expect(refreshSpy).toHaveBeenCalled();
    });
  });

  describe('Berechtigungsprüfung', () => {
    it('sollte korrekt prüfen, ob der Benutzer eine bestimmte Rolle hat', () => {
      // Arrange
      const store = useAuthStore();

      // Benutzer mit Rollen setzen
      store.user = {
        ...mockUser,
        roles: ['user', 'editor']
      };

      // Act & Assert
      expect(store.hasRole('user')).toBe(true);
      expect(store.hasRole('editor')).toBe(true);
      expect(store.hasRole('admin')).toBe(false);
    });

    it('sollte false zurückgeben, wenn der Benutzer nicht angemeldet ist', () => {
      // Arrange
      const store = useAuthStore();

      // Act & Assert
      expect(store.hasRole('user')).toBe(false);
    });

    it('sollte prüfen, ob der Benutzer Admin-Rechte hat', () => {
      // Arrange
      const store = useAuthStore();

      // Benutzer ohne Admin-Rolle
      store.user = {
        ...mockUser,
        roles: ['user', 'editor']
      };

      // Act & Assert
      expect(store.isAdmin).toBe(false);

      // Benutzer mit Admin-Rolle
      store.user = {
        ...mockUser,
        roles: ['user', 'admin']
      };

      expect(store.isAdmin).toBe(true);
    });

    it('sollte mehrere Rollen prüfen können', () => {
      // Arrange
      const store = useAuthStore();

      // Benutzer mit Rollen setzen
      store.user = {
        ...mockUser,
        roles: ['user', 'editor']
      };

      // Act & Assert
      expect(store.hasAnyRole(['admin', 'editor'])).toBe(true);
      expect(store.hasAnyRole(['admin', 'supervisor'])).toBe(false);
    });

    it('sollte Berechtigungen aus Rollen extrahieren', () => {
      // Arrange
      const store = useAuthStore();

      // Act
      store.extractPermissionsFromRoles(['user', 'editor']);

      // Assert
      expect(store.permissions.size).toBeGreaterThan(0);
      expect(store.permissions.has('docs:read')).toBe(true);
      expect(store.permissions.has('docs:convert')).toBe(true);

      // Administrative Berechtigungen sollten nicht vorhanden sein
      expect(store.permissions.has('user:delete')).toBe(false);
    });

    it('sollte Admin-Berechtigungen vollständig gewähren', () => {
      // Arrange
      const store = useAuthStore();

      // Act
      store.extractPermissionsFromRoles(['admin']);

      // Assert
      expect(store.permissions.has('user:create')).toBe(true);
      expect(store.permissions.has('user:read')).toBe(true);
      expect(store.permissions.has('user:update')).toBe(true);
      expect(store.permissions.has('user:delete')).toBe(true);
      expect(store.permissions.has('system:manage')).toBe(true);
    });

    it('sollte spezifische Berechtigungsprüfungen durchführen können', () => {
      // Arrange
      const store = useAuthStore();

      // Benutzer mit Rollen setzen und Berechtigungen extrahieren
      store.user = {
        ...mockUser,
        roles: ['user', 'editor']
      };
      store.extractPermissionsFromRoles(['user', 'editor']);

      // Act & Assert
      expect(store.hasPermission('docs:read')).toBe(true);
      expect(store.hasPermission('user:delete')).toBe(false);
      expect(store.hasAnyPermission(['user:delete', 'docs:read'])).toBe(true);
      expect(store.hasAnyPermission(['user:delete', 'system:manage'])).toBe(false);
    });

    it('sollte umfassende Berechtigungsinformationen zurückgeben', () => {
      // Arrange
      const store = useAuthStore();

      // Benutzer ohne Berechtigungen
      const checkResult1 = store.checkPermission('docs:read');
      expect(checkResult1.hasPermission).toBe(false);
      expect(checkResult1.user).toBeNull();

      // Benutzer mit Berechtigungen
      store.user = {
        ...mockUser,
        roles: ['user']
      };
      store.extractPermissionsFromRoles(['user']);

      // Act
      const checkResult2 = store.checkPermission('docs:read');

      // Assert
      expect(checkResult2.hasPermission).toBe(true);
      expect(checkResult2.user).toEqual(store.user);
      expect(checkResult2.requiredRole).toBeUndefined();

      // Berechtigungsprüfung für nicht vorhandene Berechtigung
      const checkResult3 = store.checkPermission('user:delete');
      expect(checkResult3.hasPermission).toBe(false);
      expect(checkResult3.requiredRole).toBe('admin');
    });
  });

  describe('Benutzerinformationen aktualisieren', () => {
    it('sollte Benutzerinformationen vom Server aktualisieren', async () => {
      // Arrange
      const store = useAuthStore();

      // Benutzer anmelden
      store.token = 'mock-token-123';
      store.user = mockUser;
      store.expiresAt = Date.now() + 3600 * 1000;

      // Aktualisierte Benutzerinformationen
      const updatedUser = {
        ...mockUser,
        displayName: 'Updated Name'
      };

      vi.mocked(axios.get).mockResolvedValueOnce(createApiResponse({
        success: true,
        user: updatedUser
      }));

      // Act
      const result = await store.refreshUserInfo();

      // Assert
      expect(result).toBe(true);
      expect(store.user).toEqual(updatedUser);

      // Verify API call
      expect(axios.get).toHaveBeenCalledWith('/api/auth/user', {
        headers: { Authorization: 'Bearer mock-token-123' }
      });
    });

    it('sollte den Token aktualisieren, wenn er während des Abrufs abläuft', async () => {
      // Arrange
      const store = useAuthStore();
      const refreshSpy = vi.spyOn(store, 'refreshTokenIfNeeded');

      // Benutzer mit fast abgelaufenem Token
      store.token = 'mock-token-123';
      store.refreshToken = 'mock-refresh-token-123';
      store.user = mockUser;
      store.expiresAt = Date.now() + 2 * 60 * 1000; // Läuft bald ab

      // Mock für Auth-Endpoint (401 Fehler, dann Erfolg nach Refresh)
      vi.mocked(axios.get).mockRejectedValueOnce({
        response: { status: 401 }
      });

      // Mock für Token-Refresh
      vi.mocked(axios.post).mockResolvedValueOnce(createApiResponse({
        success: true,
        token: 'new-token-456',
        refreshToken: 'new-refresh-token-456',
        expiresIn: 3600 * 1000
      }));

      // Mock für zweiten Aufruf nach Token-Refresh
      vi.mocked(axios.get).mockResolvedValueOnce(createApiResponse({
        success: true,
        user: mockUser
      }));

      // Act
      refreshSpy.mockImplementationOnce(async () => {
        store.token = 'new-token-456';
        store.refreshToken = 'new-refresh-token-456';
        store.expiresAt = Date.now() + 3600 * 1000;
        return true;
      });

      const result = await store.refreshUserInfo();

      // Assert
      expect(refreshSpy).toHaveBeenCalled();
      expect(result).toBe(false); // Da die zweiter Anfrage in diesem Mock nicht ausgeführt wird
    });

    it('sollte bei nicht authentifiziertem Benutzer false zurückgeben', async () => {
      // Arrange
      const store = useAuthStore();

      // Act
      const result = await store.refreshUserInfo();

      // Assert
      expect(result).toBe(false);
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('sollte Benutzerpräferenzen aktualisieren können', async () => {
      // Arrange
      const store = useAuthStore();
      store.token = 'mock-token-123';
      store.user = {
        ...mockUser,
        preferences: { theme: 'light', language: 'de' }
      };

      // Mock für die Validierung und API-Antwort
      vi.spyOn(store, 'validateCurrentToken').mockResolvedValue(true);
      vi.mocked(axios.patch).mockResolvedValueOnce(createApiResponse({
        success: true
      }));

      // Act
      const result = await store.updateUserPreferences({ theme: 'dark' });

      // Assert
      expect(result).toBe(true);
      expect(store.user.preferences).toEqual({ theme: 'dark', language: 'de' });

      // Verify API call
      expect(axios.patch).toHaveBeenCalledWith('/api/auth/preferences', {
        preferences: { theme: 'dark' }
      }, {
        headers: { Authorization: 'Bearer mock-token-123' }
      });
    });
  });

  describe('Auth-Header', () => {
    it('sollte korrekte Auth-Header erstellen', () => {
      // Arrange
      const store = useAuthStore();
      store.token = 'mock-token-123';

      // Act
      const headers = store.createAuthHeaders();

      // Assert
      expect(headers).toEqual({
        Authorization: 'Bearer mock-token-123'
      });
    });

    it('sollte leere Header zurückgeben, wenn kein Token vorhanden ist', () => {
      // Arrange
      const store = useAuthStore();

      // Act
      const headers = store.createAuthHeaders();

      // Assert
      expect(headers).toEqual({});
    });
  });

  describe('Axios-Interceptor', () => {
    it('sollte einen Interceptor für Token-Refresh einrichten', async () => {
      // Arrange
      const store = useAuthStore();
      const interceptorSpy = vi.spyOn(axios.interceptors.response, 'use');

      // Act - Token setzen, was den Interceptor auslösen sollte
      store.token = 'mock-token-123';

      // Manuell den watch-Effekt auslösen
      await nextTick();

      // Assert
      expect(interceptorSpy).toHaveBeenCalled();
    });

    it('sollte den Interceptor entfernen, wenn der Token null wird', async () => {
      // Arrange
      const store = useAuthStore();
      const interceptorId = 123;
      const ejectSpy = vi.spyOn(axios.interceptors.response, 'eject');

      // Spion für die use-Methode, der eine ID zurückgibt
      vi.spyOn(axios.interceptors.response, 'use').mockReturnValue(interceptorId);

      // Act - Token setzen und dann entfernen
      store.token = 'mock-token-123';
      await nextTick();

      store.token = null;
      await nextTick();

      // Assert
      expect(ejectSpy).toHaveBeenCalledWith(interceptorId);
    });
  });
});

// Hilfsfunktion für Vue-Reaktivität in Tests
async function nextTick(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}