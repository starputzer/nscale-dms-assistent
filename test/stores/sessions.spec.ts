import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSessionsStore } from '../../src/stores/sessions';
import { useAuthStore } from '../../src/stores/auth';
import axios from 'axios';
import { 
  createApiResponse, 
  mockDate, 
  createMockSession, 
  createMockMessage, 
  createMockUser,
  MockEventSource,
  waitForPromises
} from './__setup__/testSetup';

/**
 * Tests für den Sessions-Store
 * 
 * Testet:
 * - Session-CRUD-Operationen
 * - Nachrichtenverwaltung
 * - Streaming-Funktionalität
 * - Synchronisation mit dem Server
 * - Offline-Unterstützung
 */
describe('Sessions Store', () => {
  // Mock-Daten
  const mockSession = createMockSession();
  const mockMessage = createMockMessage({ sessionId: mockSession.id });
  const mockUser = createMockUser();
  
  // Mocks und Spies für den Auth-Store, da Sessions von Auth abhängt
  let authStore: ReturnType<typeof useAuthStore>;
  
  beforeEach(() => {
    // Auth-Store vorbereiten und authentifizierten Benutzer simulieren
    authStore = useAuthStore();
    vi.spyOn(authStore, 'createAuthHeaders').mockReturnValue({
      Authorization: 'Bearer mock-token'
    });
    
    // Authentifizierten Zustand simulieren
    Object.defineProperty(authStore, 'isAuthenticated', {
      get: vi.fn(() => true)
    });
    
    Object.defineProperty(authStore, 'user', {
      get: vi.fn(() => mockUser)
    });
    
    // Axios Mocks zurücksetzen
    vi.mocked(axios.get).mockReset();
    vi.mocked(axios.post).mockReset();
    vi.mocked(axios.patch).mockReset();
    vi.mocked(axios.delete).mockReset();
    
    // EventSource-Mock wird vom Setup bereitgestellt
    
    // Mock-Zeit für konsistente Tests
    mockDate('2023-01-01T12:00:00Z');
  });
  
  describe('Initialisierung', () => {
    it('sollte mit leeren Arrays und Objekten initialisiert werden', () => {
      // Arrange & Act
      const store = useSessionsStore();
      
      // Assert
      expect(store.sessions).toEqual([]);
      expect(store.currentSessionId).toBeNull();
      expect(store.messages).toEqual({});
      expect(store.streaming.isActive).toBe(false);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
    });
    
    it('sollte Legacy-Daten migrieren, wenn vorhanden', () => {
      // Arrange
      const legacySessions = JSON.stringify([mockSession]);
      const legacyCurrentSession = mockSession.id;
      const legacyMessages = JSON.stringify({
        [mockSession.id]: [mockMessage]
      });
      
      localStorage.setItem('chat_sessions', legacySessions);
      localStorage.setItem('current_session_id', legacyCurrentSession);
      localStorage.setItem('chat_messages', legacyMessages);
      
      // Act
      const store = useSessionsStore();
      store.migrateFromLegacyStorage();
      
      // Assert
      expect(store.sessions).toEqual([mockSession]);
      expect(store.currentSessionId).toBe(mockSession.id);
      expect(store.messages[mockSession.id]).toEqual([mockMessage]);
    });
  });
  
  describe('Session-Verwaltung', () => {
    it('sollte eine neue Session erstellen', async () => {
      // Arrange
      const store = useSessionsStore();
      const title = 'Test-Session';
      
      vi.mocked(axios.post).mockResolvedValueOnce(createApiResponse({
        ...mockSession,
        title
      }));
      
      // Date.now mock für konsistente IDs
      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1672574400000); // 2023-01-01T12:00:00Z
      
      // Act
      const sessionId = await store.createSession(title);
      
      // Assert
      expect(sessionId).toEqual(expect.any(String));
      expect(store.sessions).toHaveLength(1);
      expect(store.sessions[0].title).toBe(title);
      expect(store.sessions[0].userId).toBe(mockUser.id);
      expect(store.currentSessionId).toBe(sessionId);
      expect(store.messages[sessionId]).toEqual([]);
      
      // Verify API call
      expect(axios.post).toHaveBeenCalledWith('/api/sessions', expect.objectContaining({
        title,
        userId: mockUser.id
      }), {
        headers: { Authorization: 'Bearer mock-token' }
      });
      
      // Cleanup
      nowSpy.mockRestore();
    });
    
    it('sollte lokale Session erstellen, wenn nicht authentifiziert', async () => {
      // Arrange
      const store = useSessionsStore();
      
      // Benutzer als nicht authentifiziert simulieren
      Object.defineProperty(authStore, 'isAuthenticated', {
        get: vi.fn(() => false)
      });
      
      // Act
      const sessionId = await store.createSession('Offline-Session');
      
      // Assert
      expect(sessionId).toEqual(expect.any(String));
      expect(store.sessions).toHaveLength(1);
      expect(store.sessions[0].isLocal).toBe(true); // Markiert als lokale Session
      expect(axios.post).not.toHaveBeenCalled(); // Keine API-Anfrage
    });
    
    it('sollte zur angegebenen Session wechseln und ihre Nachrichten laden', async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = 'test-session-123';
      const messages = [
        createMockMessage({ id: 'msg1', sessionId }),
        createMockMessage({ id: 'msg2', sessionId })
      ];
      
      // Bestehende Session hinzufügen
      store.sessions = [createMockSession({ id: sessionId })];
      
      // Mock für den Abruf von Nachrichten
      vi.mocked(axios.get).mockResolvedValueOnce(createApiResponse(messages));
      
      // Act
      await store.setCurrentSession(sessionId);
      
      // Assert
      expect(store.currentSessionId).toBe(sessionId);
      expect(store.messages[sessionId]).toEqual(messages);
      
      // Verify API call
      expect(axios.get).toHaveBeenCalledWith(`/api/sessions/${sessionId}/messages`, {
        headers: { Authorization: 'Bearer mock-token' }
      });
    });
    
    it('sollte keine Nachrichten laden, wenn sie bereits im Store sind', async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = 'test-session-123';
      const existingMessages = [createMockMessage({ sessionId })];
      
      // Bestehende Session und Nachrichten hinzufügen
      store.sessions = [createMockSession({ id: sessionId })];
      store.messages = { [sessionId]: existingMessages };
      
      // Act
      await store.setCurrentSession(sessionId);
      
      // Assert
      expect(store.currentSessionId).toBe(sessionId);
      expect(store.messages[sessionId]).toEqual(existingMessages);
      
      // Verify no API call was made
      expect(axios.get).not.toHaveBeenCalled();
    });
    
    it('sollte den Titel einer Session aktualisieren', async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = 'test-session-123';
      const oldTitle = 'Alter Titel';
      const newTitle = 'Neuer Titel';
      
      // Bestehende Session hinzufügen
      store.sessions = [createMockSession({ id: sessionId, title: oldTitle })];
      
      vi.mocked(axios.patch).mockResolvedValueOnce(createApiResponse({}));
      
      // Act
      await store.updateSessionTitle(sessionId, newTitle);
      
      // Assert
      expect(store.sessions[0].title).toBe(newTitle);
      
      // Verify API call
      expect(axios.patch).toHaveBeenCalledWith(`/api/sessions/${sessionId}`, { title: newTitle }, {
        headers: { Authorization: 'Bearer mock-token' }
      });
    });
    
    it('sollte eine Session archivieren/löschen', async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = 'test-session-123';
      
      // Bestehende Session und Nachrichten hinzufügen
      store.sessions = [createMockSession({ id: sessionId })];
      store.messages = { [sessionId]: [createMockMessage({ sessionId })] };
      store.currentSessionId = sessionId;
      
      vi.mocked(axios.delete).mockResolvedValueOnce(createApiResponse({}));
      
      // Act
      await store.archiveSession(sessionId);
      
      // Assert
      expect(store.sessions).toHaveLength(0);
      expect(store.messages[sessionId]).toBeUndefined();
      expect(store.currentSessionId).toBeNull();
      
      // Verify API call
      expect(axios.delete).toHaveBeenCalledWith(`/api/sessions/${sessionId}`, {
        headers: { Authorization: 'Bearer mock-token' }
      });
    });
  });
  
  describe('Nachrichtenverwaltung', () => {
    it('sollte eine Nachricht senden und die Antwort verarbeiten', async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = 'test-session-123';
      const messageContent = 'Test-Nachricht';
      
      // Bestehende Session hinzufügen
      store.sessions = [createMockSession({ id: sessionId })];
      store.messages[sessionId] = [];
      store.currentSessionId = sessionId;
      
      // Mock für EventSource (für Streaming-Antwort)
      let mockEventSource: MockEventSource;
      vi.stubGlobal('EventSource', class extends MockEventSource {
        constructor(url: string) {
          super(url);
          mockEventSource = this;
        }
      });
      
      // Act
      // Nachricht senden (dies triggert das Streaming)
      store.sendMessage({ sessionId, content: messageContent });
      
      // Warten auf asynchrone Verarbeitung
      await waitForPromises();
      
      // Assert - Benutzernachricht sollte hinzugefügt worden sein
      expect(store.messages[sessionId]).toHaveLength(1);
      expect(store.messages[sessionId][0].content).toBe(messageContent);
      expect(store.messages[sessionId][0].role).toBe('user');
      
      // Assistentnachricht sollte ebenfalls erstellt werden
      expect(store.messages[sessionId]).toHaveLength(2);
      expect(store.messages[sessionId][1].role).toBe('assistant');
      expect(store.messages[sessionId][1].isStreaming).toBe(true);
      
      // Streaming-Status sollte aktiv sein
      expect(store.streaming.isActive).toBe(true);
      expect(store.streaming.currentSessionId).toBe(sessionId);
      
      // Streaming-Antwort simulieren
      mockEventSource!.emit('message', { type: 'content', content: 'Antwort' });
      await waitForPromises();
      
      // Streaming-Antwort abschließen
      mockEventSource!.emit('done', {
        id: 'response-123',
        content: 'Vollständige Antwort'
      });
      await waitForPromises();
      
      // Assert - Assistentnachricht sollte aktualisiert sein
      expect(store.messages[sessionId][1].content).toBe('Vollständige Antwort');
      expect(store.messages[sessionId][1].isStreaming).toBe(false);
      expect(store.messages[sessionId][1].status).toBe('sent');
      
      // Streaming-Status sollte inaktiv sein
      expect(store.streaming.isActive).toBe(false);
    });
    
    it('sollte eine Nachricht in den pendingMessages speichern, wenn nicht authentifiziert', async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = 'test-session-123';
      const messageContent = 'Offline-Nachricht';
      
      // Bestehende Session hinzufügen
      store.sessions = [createMockSession({ id: sessionId, isLocal: true })];
      store.messages[sessionId] = [];
      store.currentSessionId = sessionId;
      
      // Benutzer als nicht authentifiziert simulieren
      Object.defineProperty(authStore, 'isAuthenticated', {
        get: vi.fn(() => false)
      });
      
      // Act
      await store.sendMessage({ sessionId, content: messageContent });
      
      // Assert
      // Benutzernachricht sollte hinzugefügt worden sein
      expect(store.messages[sessionId]).toHaveLength(1);
      expect(store.messages[sessionId][0].content).toBe(messageContent);
      
      // Pendente Nachricht sollte gespeichert sein
      expect(store.pendingMessages[sessionId]).toHaveLength(1);
      expect(store.pendingMessages[sessionId][0].content).toBe(messageContent);
      expect(store.pendingMessages[sessionId][0].status).toBe('pending');
      
      // Fallback-Antwort sollte erstellt worden sein
      expect(store.messages[sessionId]).toHaveLength(2);
      expect(store.messages[sessionId][1].role).toBe('assistant');
      expect(store.messages[sessionId][1].content).toContain('nicht angemeldet');
    });
    
    it('sollte pendente Nachrichten synchronisieren, wenn der Benutzer sich anmeldet', async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = 'test-session-123';
      const pendingMessage = createMockMessage({ 
        sessionId, 
        status: 'pending',
        id: 'pending-msg-123'
      });
      
      // Bestehende Session und pendente Nachricht hinzufügen
      store.sessions = [createMockSession({ id: sessionId })];
      store.pendingMessages = { [sessionId]: [pendingMessage] };
      
      vi.mocked(axios.post).mockResolvedValueOnce(createApiResponse({
        id: 'server-msg-456'
      }));
      
      // Act
      await store.syncPendingMessages();
      
      // Assert
      // Pendente Nachricht sollte synchronisiert sein
      expect(store.pendingMessages[sessionId]).toHaveLength(0);
      expect(store.messages[sessionId]).toHaveLength(1);
      expect(store.messages[sessionId][0].id).toBe('server-msg-456');
      expect(store.messages[sessionId][0].status).toBe('sent');
      
      // Verify API call
      expect(axios.post).toHaveBeenCalledWith(`/api/sessions/${sessionId}/messages`, {
        content: pendingMessage.content,
        role: pendingMessage.role
      }, {
        headers: { Authorization: 'Bearer mock-token' }
      });
    });
  });
  
  describe('Streaming-Funktionalität', () => {
    it('sollte Streaming abbrechen können', async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = 'test-session-123';
      
      // Streaming aktiv setzen
      store.streaming = {
        isActive: true,
        progress: 50,
        currentSessionId: sessionId
      };
      
      // Streaming-Nachricht hinzufügen
      store.messages[sessionId] = [
        createMockMessage({ 
          sessionId,
          role: 'assistant',
          isStreaming: true,
          content: 'Teilweise Antwort'
        })
      ];
      store.currentSessionId = sessionId;
      
      // Mock für das window.dispatchEvent
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
      
      // Act
      store.cancelStreaming();
      
      // Assert
      expect(store.streaming.isActive).toBe(false);
      expect(store.streaming.progress).toBe(0);
      expect(store.streaming.currentSessionId).toBeNull();
      
      // Nachrichtenstatus sollte aktualisiert sein
      expect(store.messages[sessionId][0].isStreaming).toBe(false);
      expect(store.messages[sessionId][0].status).toBe('error');
      expect(store.messages[sessionId][0].content).toContain('[abgebrochen]');
      
      // Verify event dispatch
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
      expect(dispatchEventSpy.mock.calls[0][0].type).toBe('cancel-streaming');
    });
  });
  
  describe('Server-Synchronisation', () => {
    it('sollte Sessions mit dem Server synchronisieren', async () => {
      // Arrange
      const store = useSessionsStore();
      const localSession = createMockSession({ id: 'local-1', title: 'Lokal', updatedAt: '2023-01-01T10:00:00Z' });
      const serverSession = createMockSession({ id: 'server-1', title: 'Server', updatedAt: '2023-01-01T11:00:00Z' });
      const updatedLocalSession = { ...localSession, title: 'Aktualisiert', updatedAt: '2023-01-01T12:00:00Z' };
      
      // Lokale Session hinzufügen
      store.sessions = [localSession];
      
      // Mock für Server-Synchronisation
      vi.mocked(axios.get).mockResolvedValueOnce(createApiResponse([
        serverSession,
        updatedLocalSession
      ]));
      
      // Act
      await store.synchronizeSessions();
      
      // Assert
      expect(store.sessions).toHaveLength(2);
      
      // Lokale Session sollte aktualisiert sein
      const updatedSession = store.sessions.find(s => s.id === localSession.id);
      expect(updatedSession).toBeDefined();
      expect(updatedSession!.title).toBe('Aktualisiert');
      
      // Server-Session sollte hinzugefügt worden sein
      const newSession = store.sessions.find(s => s.id === serverSession.id);
      expect(newSession).toBeDefined();
      expect(newSession!.title).toBe('Server');
      
      // Synchronisationsstatus sollte aktualisiert sein
      expect(store.syncStatus.lastSyncTime).toBeGreaterThan(0);
      expect(store.syncStatus.error).toBeNull();
      
      // Verify API call
      expect(axios.get).toHaveBeenCalledWith('/api/sessions', {
        headers: { Authorization: 'Bearer mock-token' },
        params: { since: 0 }
      });
    });
  });
  
  describe('Export und Import', () => {
    it('sollte Daten exportieren können', () => {
      // Arrange
      const store = useSessionsStore();
      const mockSession = createMockSession();
      const mockMessages = [createMockMessage({ sessionId: mockSession.id })];
      
      store.sessions = [mockSession];
      store.messages = { [mockSession.id]: mockMessages };
      
      // Act
      const exportData = store.exportData();
      
      // Assert
      const parsedData = JSON.parse(exportData);
      expect(parsedData.sessions).toEqual([mockSession]);
      expect(parsedData.messages).toEqual({ [mockSession.id]: mockMessages });
      expect(parsedData.version).toBe(2);
      expect(parsedData.exportDate).toEqual(expect.any(String));
    });
    
    it('sollte Daten importieren können', () => {
      // Arrange
      const store = useSessionsStore();
      const mockSession = createMockSession();
      const mockMessages = [createMockMessage({ sessionId: mockSession.id })];
      
      const exportData = JSON.stringify({
        sessions: [mockSession],
        messages: { [mockSession.id]: mockMessages },
        version: 2,
        exportDate: new Date().toISOString()
      });
      
      // Act
      const result = store.importData(exportData);
      
      // Assert
      expect(result).toBe(true);
      expect(store.sessions).toEqual([mockSession]);
      expect(store.messages[mockSession.id]).toEqual(mockMessages);
      expect(store.version).toBe(2);
    });
    
    it('sollte Importfehler behandeln', () => {
      // Arrange
      const store = useSessionsStore();
      const invalidData = 'invalid-json-data';
      
      // Act
      const result = store.importData(invalidData);
      
      // Assert
      expect(result).toBe(false);
      expect(store.error).toContain('Fehler beim Importieren');
    });
  });
  
  describe('Storage-Optimierung', () => {
    it('sollte ältere Nachrichten in den sessionStorage auslagern', () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = 'test-session-123';
      
      // 100 Nachrichten erstellen (mehr als das Limit von 50)
      const messages = Array.from({ length: 100 }, (_, i) => 
        createMockMessage({ 
          id: `msg-${i + 1}`,
          sessionId,
          content: `Nachricht ${i + 1}`
        })
      );
      
      store.messages = { [sessionId]: messages };
      
      // sessionStorage-Mock
      const sessionStorageMock = {
        getItem: vi.fn().mockReturnValue('[]'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };
      vi.stubGlobal('sessionStorage', sessionStorageMock);
      
      // Act
      store.cleanupStorage();
      
      // Assert
      // Es sollten nur die neuesten 50 Nachrichten im Speicher bleiben
      expect(store.messages[sessionId]).toHaveLength(50);
      expect(store.messages[sessionId][0].content).toBe('Nachricht 51');
      expect(store.messages[sessionId][49].content).toBe('Nachricht 100');
      
      // Die älteren 50 Nachrichten sollten in den sessionStorage ausgelagert sein
      expect(sessionStorageMock.setItem).toHaveBeenCalled();
      
      // Prüfen, ob die richtigen Daten gespeichert wurden
      const storageKey = `session_${sessionId}_older_messages`;
      const storageDataCall = sessionStorageMock.setItem.mock.calls.find(
        call => call[0] === storageKey
      );
      
      expect(storageDataCall).toBeDefined();
      
      // Parse des gespeicherten JSON
      const storedMessages = JSON.parse(storageDataCall[1]);
      expect(storedMessages).toHaveLength(50);
      expect(storedMessages[0].content).toBe('Nachricht 1');
      expect(storedMessages[49].content).toBe('Nachricht 50');
    });
    
    it('sollte ältere Nachrichten aus dem sessionStorage laden können', () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = 'test-session-123';
      
      // Aktuelle Nachrichten setzen
      const currentMessages = [
        createMockMessage({ id: 'current-1', sessionId, content: 'Aktuelle Nachricht 1' }),
        createMockMessage({ id: 'current-2', sessionId, content: 'Aktuelle Nachricht 2' })
      ];
      
      store.messages = { [sessionId]: currentMessages };
      
      // Ältere Nachrichten im sessionStorage
      const olderMessages = [
        createMockMessage({ id: 'older-1', sessionId, content: 'Ältere Nachricht 1' }),
        createMockMessage({ id: 'older-2', sessionId, content: 'Ältere Nachricht 2' })
      ];
      
      const sessionStorageMock = {
        getItem: vi.fn().mockReturnValue(JSON.stringify(olderMessages)),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };
      vi.stubGlobal('sessionStorage', sessionStorageMock);
      
      // Act
      const result = store.loadOlderMessages(sessionId);
      
      // Assert
      expect(result).toEqual(olderMessages);
      
      // Nachrichten sollten kombiniert sein, sortiert nach Zeitstempel
      expect(store.messages[sessionId]).toHaveLength(4);
      
      // sessionStorage-Eintrag sollte entfernt sein
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(`session_${sessionId}_older_messages`);
    });
  });
  
  describe('Computed Properties', () => {
    it('sollte die aktuelle Session korrekt berechnen', () => {
      // Arrange
      const store = useSessionsStore();
      const session1 = createMockSession({ id: 'session-1' });
      const session2 = createMockSession({ id: 'session-2' });
      
      store.sessions = [session1, session2];
      store.currentSessionId = 'session-2';
      
      // Act & Assert
      expect(store.currentSession).toEqual(session2);
      
      // Wenn keine aktuelle Session vorhanden ist
      store.currentSessionId = 'nicht-vorhanden';
      expect(store.currentSession).toBeNull();
    });
    
    it('sollte die aktuellen Nachrichten korrekt berechnen', () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = 'test-session-123';
      const messages = [createMockMessage({ sessionId })];
      
      store.messages = { [sessionId]: messages };
      store.currentSessionId = sessionId;
      
      // Act & Assert
      expect(store.currentMessages).toEqual(messages);
      
      // Wenn keine aktuelle Session vorhanden ist
      store.currentSessionId = null;
      expect(store.currentMessages).toEqual([]);
    });
    
    it('sollte Sessions korrekt sortieren', () => {
      // Arrange
      const store = useSessionsStore();
      
      // Sessions mit unterschiedlichen Zeitstempeln und Pin-Status
      const olderSession = createMockSession({ 
        id: 'older', 
        updatedAt: '2023-01-01T10:00:00Z',
        isPinned: false
      });
      const newerSession = createMockSession({ 
        id: 'newer', 
        updatedAt: '2023-01-01T11:00:00Z',
        isPinned: false
      });
      const pinnedOlderSession = createMockSession({ 
        id: 'pinned-older', 
        updatedAt: '2023-01-01T09:00:00Z',
        isPinned: true
      });
      
      store.sessions = [olderSession, newerSession, pinnedOlderSession];
      
      // Act & Assert
      const sortedSessions = store.sortedSessions;
      
      // Gepinnte Sessions sollten zuerst kommen, dann nach Datum sortiert
      expect(sortedSessions[0].id).toBe('pinned-older');
      expect(sortedSessions[1].id).toBe('newer');
      expect(sortedSessions[2].id).toBe('older');
    });
  });
});