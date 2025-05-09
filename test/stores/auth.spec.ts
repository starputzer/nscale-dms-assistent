import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../src/stores/auth';
import axios from 'axios';
import { createApiResponse, mockDate, createMockUser, waitForPromises } from './__setup__/testSetup';

/**
 * Tests für den Auth-Store
 * 
 * Testet:
 * - Login/Logout-Funktionalität
 * - Token-Management und Refresh
 * - Berechtigungsprüfung
 * - Persistenz und Migration
 */
describe('Auth Store', () => {
  // Mock-Daten
  const mockCredentials = {
    email: 'test@example.com',
    password: 'password123'
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
    
    // Setze localStorage und sessionStorage zwischen den Tests zurück
    localStorage.clear();
    sessionStorage.clear();
    
    // Mock-Zeit für konsistente Tests
    mockDate('2023-01-01T12:00:00Z');
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
});