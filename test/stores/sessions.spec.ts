import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSessionsStore } from "../../src/stores/sessions";
import { useAuthStore } from "../../src/stores/auth";
import axios from "axios";
import {
  createApiResponse,
  mockDate,
  createMockSession,
  createMockMessage,
  createMockUser,
  MockEventSource,
  waitForPromises,
} from "./__setup__/testSetup";

/**
 * Tests für den Sessions-Store
 *
 * Testet:
 * - Session-CRUD-Operationen
 * - Nachrichtenverwaltung
 * - Streaming-Funktionalität
 * - Synchronisation mit dem Server
 * - Offline-Unterstützung
 * - Metadaten und Tagging
 * - Massenoperationen und Gruppierung
 * - Speicheroptimierung und Performance
 */
describe("Sessions Store", () => {
  // Mock-Daten
  const mockSession = createMockSession();
  const mockMessage = createMockMessage({ sessionId: mockSession.id });
  const mockUser = createMockUser();

  // Mocks und Spies für den Auth-Store, da Sessions von Auth abhängt
  let authStore: ReturnType<typeof useAuthStore>;

  beforeEach(() => {
    // Auth-Store vorbereiten und authentifizierten Benutzer simulieren
    authStore = useAuthStore();
    vi.spyOn(authStore, "createAuthHeaders").mockReturnValue({
      Authorization: "Bearer mock-token",
    });

    // Authentifizierten Zustand simulieren
    Object.defineProperty(authStore, "isAuthenticated", {
      get: vi.fn(() => true),
    });

    Object.defineProperty(authStore, "user", {
      get: vi.fn(() => mockUser),
    });

    // Axios Mocks zurücksetzen
    vi.mocked(axios.get).mockReset();
    vi.mocked(axios.post).mockReset();
    vi.mocked(axios.patch).mockReset();
    vi.mocked(axios.delete).mockReset();

    // EventSource-Mock wird vom Setup bereitgestellt

    // Mock-Zeit für konsistente Tests
    mockDate("2023-01-01T12:00:00Z");
  });

  describe("Initialisierung", () => {
    it("sollte mit leeren Arrays und Objekten initialisiert werden", () => {
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

    it("sollte Legacy-Daten migrieren, wenn vorhanden", () => {
      // Arrange
      const legacySessions = JSON.stringify([mockSession]);
      const legacyCurrentSession = mockSession.id;
      const legacyMessages = JSON.stringify({
        [mockSession.id]: [mockMessage],
      });

      localStorage.setItem("chat_sessions", legacySessions);
      localStorage.setItem("current_session_id", legacyCurrentSession);
      localStorage.setItem("chat_messages", legacyMessages);

      // Act
      const store = useSessionsStore();
      store.migrateFromLegacyStorage();

      // Assert
      expect(store.sessions).toEqual([mockSession]);
      expect(store.currentSessionId).toBe(mockSession.id);
      expect(store.messages[mockSession.id]).toEqual([mockMessage]);
    });
  });

  describe("Session-Verwaltung", () => {
    it("sollte eine neue Session erstellen", async () => {
      // Arrange
      const store = useSessionsStore();
      const title = "Test-Session";

      vi.mocked(axios.post).mockResolvedValueOnce(
        createApiResponse({
          ...mockSession,
          title,
        }),
      );

      // Date.now mock für konsistente IDs
      const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1672574400000); // 2023-01-01T12:00:00Z

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
      expect(axios.post).toHaveBeenCalledWith(
        "/api/sessions",
        expect.objectContaining({
          title,
          userId: mockUser.id,
        }),
        {
          headers: { Authorization: "Bearer mock-token" },
        },
      );

      // Cleanup
      nowSpy.mockRestore();
    });

    it("sollte lokale Session erstellen, wenn nicht authentifiziert", async () => {
      // Arrange
      const store = useSessionsStore();

      // Benutzer als nicht authentifiziert simulieren
      Object.defineProperty(authStore, "isAuthenticated", {
        get: vi.fn(() => false),
      });

      // Act
      const sessionId = await store.createSession("Offline-Session");

      // Assert
      expect(sessionId).toEqual(expect.any(String));
      expect(store.sessions).toHaveLength(1);
      expect(store.sessions[0].isLocal).toBe(true); // Markiert als lokale Session
      expect(axios.post).not.toHaveBeenCalled(); // Keine API-Anfrage
    });

    it("sollte zur angegebenen Session wechseln und ihre Nachrichten laden", async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";
      const messages = [
        createMockMessage({ id: "msg1", sessionId }),
        createMockMessage({ id: "msg2", sessionId }),
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
      expect(axios.get).toHaveBeenCalledWith(
        `/api/sessions/${sessionId}/messages`,
        {
          headers: { Authorization: "Bearer mock-token" },
        },
      );
    });

    it("sollte keine Nachrichten laden, wenn sie bereits im Store sind", async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";
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

    it("sollte den Titel einer Session aktualisieren", async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";
      const oldTitle = "Alter Titel";
      const newTitle = "Neuer Titel";

      // Bestehende Session hinzufügen
      store.sessions = [createMockSession({ id: sessionId, title: oldTitle })];

      vi.mocked(axios.patch).mockResolvedValueOnce(createApiResponse({}));

      // Act
      await store.updateSessionTitle(sessionId, newTitle);

      // Assert
      expect(store.sessions[0].title).toBe(newTitle);

      // Verify API call
      expect(axios.patch).toHaveBeenCalledWith(
        `/api/sessions/${sessionId}`,
        { title: newTitle },
        {
          headers: { Authorization: "Bearer mock-token" },
        },
      );
    });

    it("sollte eine Session archivieren/löschen", async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";

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
        headers: { Authorization: "Bearer mock-token" },
      });
    });
  });

  describe("Nachrichtenverwaltung", () => {
    it("sollte eine Nachricht senden und die Antwort verarbeiten", async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";
      const messageContent = "Test-Nachricht";

      // Bestehende Session hinzufügen
      store.sessions = [createMockSession({ id: sessionId })];
      store.messages[sessionId] = [];
      store.currentSessionId = sessionId;

      // Mock für EventSource (für Streaming-Antwort)
      let mockEventSource: MockEventSource;
      vi.stubGlobal(
        "EventSource",
        class extends MockEventSource {
          constructor(url: string) {
            super(url);
            mockEventSource = this;
          }
        },
      );

      // Act
      // Nachricht senden (dies triggert das Streaming)
      store.sendMessage({ sessionId, content: messageContent });

      // Warten auf asynchrone Verarbeitung
      await waitForPromises();

      // Assert - Benutzernachricht sollte hinzugefügt worden sein
      expect(store.messages[sessionId]).toHaveLength(1);
      expect(store.messages[sessionId][0].content).toBe(messageContent);
      expect(store.messages[sessionId][0].role).toBe("user");

      // Assistentnachricht sollte ebenfalls erstellt werden
      expect(store.messages[sessionId]).toHaveLength(2);
      expect(store.messages[sessionId][1].role).toBe("assistant");
      expect(store.messages[sessionId][1].isStreaming).toBe(true);

      // Streaming-Status sollte aktiv sein
      expect(store.streaming.isActive).toBe(true);
      expect(store.streaming.currentSessionId).toBe(sessionId);

      // Streaming-Antwort simulieren
      mockEventSource!.emit("message", { type: "content", content: "Antwort" });
      await waitForPromises();

      // Streaming-Antwort abschließen
      mockEventSource!.emit("done", {
        id: "response-123",
        content: "Vollständige Antwort",
      });
      await waitForPromises();

      // Assert - Assistentnachricht sollte aktualisiert sein
      expect(store.messages[sessionId][1].content).toBe("Vollständige Antwort");
      expect(store.messages[sessionId][1].isStreaming).toBe(false);
      expect(store.messages[sessionId][1].status).toBe("sent");

      // Streaming-Status sollte inaktiv sein
      expect(store.streaming.isActive).toBe(false);
    });

    it("sollte eine Nachricht in den pendingMessages speichern, wenn nicht authentifiziert", async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";
      const messageContent = "Offline-Nachricht";

      // Bestehende Session hinzufügen
      store.sessions = [createMockSession({ id: sessionId, isLocal: true })];
      store.messages[sessionId] = [];
      store.currentSessionId = sessionId;

      // Benutzer als nicht authentifiziert simulieren
      Object.defineProperty(authStore, "isAuthenticated", {
        get: vi.fn(() => false),
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
      expect(store.pendingMessages[sessionId][0].status).toBe("pending");

      // Fallback-Antwort sollte erstellt worden sein
      expect(store.messages[sessionId]).toHaveLength(2);
      expect(store.messages[sessionId][1].role).toBe("assistant");
      expect(store.messages[sessionId][1].content).toContain(
        "nicht angemeldet",
      );
    });

    it("sollte pendente Nachrichten synchronisieren, wenn der Benutzer sich anmeldet", async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";
      const pendingMessage = createMockMessage({
        sessionId,
        status: "pending",
        id: "pending-msg-123",
      });

      // Bestehende Session und pendente Nachricht hinzufügen
      store.sessions = [createMockSession({ id: sessionId })];
      store.pendingMessages = { [sessionId]: [pendingMessage] };

      vi.mocked(axios.post).mockResolvedValueOnce(
        createApiResponse({
          id: "server-msg-456",
        }),
      );

      // Act
      await store.syncPendingMessages();

      // Assert
      // Pendente Nachricht sollte synchronisiert sein
      expect(store.pendingMessages[sessionId]).toHaveLength(0);
      expect(store.messages[sessionId]).toHaveLength(1);
      expect(store.messages[sessionId][0].id).toBe("server-msg-456");
      expect(store.messages[sessionId][0].status).toBe("sent");

      // Verify API call
      expect(axios.post).toHaveBeenCalledWith(
        `/api/sessions/${sessionId}/messages`,
        {
          content: pendingMessage.content,
          role: pendingMessage.role,
        },
        {
          headers: { Authorization: "Bearer mock-token" },
        },
      );
    });
  });

  describe("Streaming-Funktionalität", () => {
    it("sollte Streaming abbrechen können", async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";

      // Streaming aktiv setzen
      store.streaming = {
        isActive: true,
        progress: 50,
        currentSessionId: sessionId,
      };

      // Streaming-Nachricht hinzufügen
      store.messages[sessionId] = [
        createMockMessage({
          sessionId,
          role: "assistant",
          isStreaming: true,
          content: "Teilweise Antwort",
        }),
      ];
      store.currentSessionId = sessionId;

      // Mock für das window.dispatchEvent
      const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

      // Act
      store.cancelStreaming();

      // Assert
      expect(store.streaming.isActive).toBe(false);
      expect(store.streaming.progress).toBe(0);
      expect(store.streaming.currentSessionId).toBeNull();

      // Nachrichtenstatus sollte aktualisiert sein
      expect(store.messages[sessionId][0].isStreaming).toBe(false);
      expect(store.messages[sessionId][0].status).toBe("error");
      expect(store.messages[sessionId][0].content).toContain("[abgebrochen]");

      // Verify event dispatch
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
      expect(dispatchEventSpy.mock.calls[0][0].type).toBe("cancel-streaming");
    });

    it("sollte mit Streaming-Metadaten umgehen können", async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";
      const messageContent = "Test-Nachricht";

      // Bestehende Session hinzufügen
      store.sessions = [createMockSession({ id: sessionId })];
      store.messages[sessionId] = [];
      store.currentSessionId = sessionId;

      // Mock für EventSource
      let mockEventSource: MockEventSource;
      vi.stubGlobal(
        "EventSource",
        class extends MockEventSource {
          constructor(url: string) {
            super(url);
            mockEventSource = this;
          }
        },
      );

      // Act - Nachricht senden
      store.sendMessage({ sessionId, content: messageContent });
      await waitForPromises();

      // Streaming mit Metadaten simulieren
      mockEventSource!.emit("message", {
        type: "content",
        content: "Antwort mit ",
      });
      await waitForPromises();

      mockEventSource!.emit("message", {
        type: "content",
        content: "Metadaten",
      });
      await waitForPromises();

      // Metadaten-Event senden
      mockEventSource!.emit("message", {
        type: "metadata",
        metadata: {
          sources: ["dokument-1.pdf", "dokument-2.pdf"],
          confidence: 0.92,
        },
      });
      await waitForPromises();

      // Streaming abschließen
      mockEventSource!.emit("done", {
        id: "response-123",
        content: "Antwort mit Metadaten",
        metadata: {
          sources: ["dokument-1.pdf", "dokument-2.pdf"],
          confidence: 0.92,
        },
      });
      await waitForPromises();

      // Assert - Nachricht sollte Metadaten enthalten
      expect(store.messages[sessionId][1].metadata).toBeDefined();
      expect(store.messages[sessionId][1].metadata.sources).toEqual([
        "dokument-1.pdf",
        "dokument-2.pdf",
      ]);
      expect(store.messages[sessionId][1].metadata.confidence).toBe(0.92);
    });

    it("sollte mit Streaming-Fehlern umgehen können", async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";
      const messageContent = "Test-Nachricht";

      // Bestehende Session hinzufügen
      store.sessions = [createMockSession({ id: sessionId })];
      store.messages[sessionId] = [];
      store.currentSessionId = sessionId;

      // Mock für EventSource
      let mockEventSource: MockEventSource;
      vi.stubGlobal(
        "EventSource",
        class extends MockEventSource {
          constructor(url: string) {
            super(url);
            mockEventSource = this;
          }
        },
      );

      // Act - Nachricht senden
      store.sendMessage({ sessionId, content: messageContent });
      await waitForPromises();

      // Anfängliche Streaming-Antwort
      mockEventSource!.emit("message", {
        type: "content",
        content: "Beginn der Antwort",
      });
      await waitForPromises();

      // Fehler während des Streamings simulieren
      mockEventSource!.emitError(new Error("Verbindungsfehler"));
      await waitForPromises();

      // Assert - Nachrichtenstatus sollte auf Fehler sein
      expect(store.messages[sessionId][1].status).toBe("error");
      expect(store.streaming.isActive).toBe(false);
      expect(store.error).toBeDefined();
      expect(store.error).toContain("Fehler bei der Kommunikation");
    });

    it("sollte den Fortschritt während des Streamings aktualisieren", async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";
      const messageContent = "Test-Nachricht";

      // Bestehende Session hinzufügen
      store.sessions = [createMockSession({ id: sessionId })];
      store.messages[sessionId] = [];
      store.currentSessionId = sessionId;

      // Mock für EventSource
      let mockEventSource: MockEventSource;
      vi.stubGlobal(
        "EventSource",
        class extends MockEventSource {
          constructor(url: string) {
            super(url);
            mockEventSource = this;
          }
        },
      );

      // Act - Nachricht senden
      store.sendMessage({ sessionId, content: messageContent });
      await waitForPromises();

      // Fortschritts-Event senden
      mockEventSource!.emit("message", {
        type: "progress",
        progress: 25,
      });
      await waitForPromises();

      // Assert - Fortschritt sollte aktualisiert sein
      expect(store.streaming.progress).toBe(25);

      // Weiteren Fortschritt simulieren
      mockEventSource!.emit("message", {
        type: "progress",
        progress: 75,
      });
      await waitForPromises();

      // Assert - Fortschritt sollte weiter aktualisiert sein
      expect(store.streaming.progress).toBe(75);

      // Abschluss
      mockEventSource!.emit("done", {
        id: "response-123",
        content: "Fertige Antwort",
      });
      await waitForPromises();

      // Assert - Streaming sollte abgeschlossen sein
      expect(store.streaming.isActive).toBe(false);
      expect(store.streaming.progress).toBe(100);
    });
  });

  describe("Server-Synchronisation", () => {
    it("sollte Sessions mit dem Server synchronisieren", async () => {
      // Arrange
      const store = useSessionsStore();
      const localSession = createMockSession({
        id: "local-1",
        title: "Lokal",
        updatedAt: "2023-01-01T10:00:00Z",
      });
      const serverSession = createMockSession({
        id: "server-1",
        title: "Server",
        updatedAt: "2023-01-01T11:00:00Z",
      });
      const updatedLocalSession = {
        ...localSession,
        title: "Aktualisiert",
        updatedAt: "2023-01-01T12:00:00Z",
      };

      // Lokale Session hinzufügen
      store.sessions = [localSession];

      // Mock für Server-Synchronisation
      vi.mocked(axios.get).mockResolvedValueOnce(
        createApiResponse([serverSession, updatedLocalSession]),
      );

      // Act
      await store.synchronizeSessions();

      // Assert
      expect(store.sessions).toHaveLength(2);

      // Lokale Session sollte aktualisiert sein
      const updatedSession = store.sessions.find(
        (s) => s.id === localSession.id,
      );
      expect(updatedSession).toBeDefined();
      expect(updatedSession!.title).toBe("Aktualisiert");

      // Server-Session sollte hinzugefügt worden sein
      const newSession = store.sessions.find((s) => s.id === serverSession.id);
      expect(newSession).toBeDefined();
      expect(newSession!.title).toBe("Server");

      // Synchronisationsstatus sollte aktualisiert sein
      expect(store.syncStatus.lastSyncTime).toBeGreaterThan(0);
      expect(store.syncStatus.error).toBeNull();

      // Verify API call
      expect(axios.get).toHaveBeenCalledWith("/api/sessions", {
        headers: { Authorization: "Bearer mock-token" },
        params: { since: 0 },
      });
    });
  });

  describe("Export und Import", () => {
    it("sollte Daten exportieren können", () => {
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

    it("sollte Daten importieren können", () => {
      // Arrange
      const store = useSessionsStore();
      const mockSession = createMockSession();
      const mockMessages = [createMockMessage({ sessionId: mockSession.id })];

      const exportData = JSON.stringify({
        sessions: [mockSession],
        messages: { [mockSession.id]: mockMessages },
        version: 2,
        exportDate: new Date().toISOString(),
      });

      // Act
      const result = store.importData(exportData);

      // Assert
      expect(result).toBe(true);
      expect(store.sessions).toEqual([mockSession]);
      expect(store.messages[mockSession.id]).toEqual(mockMessages);
      expect(store.version).toBe(2);
    });

    it("sollte Importfehler behandeln", () => {
      // Arrange
      const store = useSessionsStore();
      const invalidData = "invalid-json-data";

      // Act
      const result = store.importData(invalidData);

      // Assert
      expect(result).toBe(false);
      expect(store.error).toContain("Fehler beim Importieren");
    });
  });

  describe("Storage-Optimierung", () => {
    it("sollte ältere Nachrichten in den sessionStorage auslagern", () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";

      // 100 Nachrichten erstellen (mehr als das Limit von 50)
      const messages = Array.from({ length: 100 }, (_, i) =>
        createMockMessage({
          id: `msg-${i + 1}`,
          sessionId,
          content: `Nachricht ${i + 1}`,
        }),
      );

      store.messages = { [sessionId]: messages };

      // sessionStorage-Mock
      const sessionStorageMock = {
        getItem: vi.fn().mockReturnValue("[]"),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };
      vi.stubGlobal("sessionStorage", sessionStorageMock);

      // Act
      store.cleanupStorage();

      // Assert
      // Es sollten nur die neuesten 50 Nachrichten im Speicher bleiben
      expect(store.messages[sessionId]).toHaveLength(50);
      expect(store.messages[sessionId][0].content).toBe("Nachricht 51");
      expect(store.messages[sessionId][49].content).toBe("Nachricht 100");

      // Die älteren 50 Nachrichten sollten in den sessionStorage ausgelagert sein
      expect(sessionStorageMock.setItem).toHaveBeenCalled();

      // Prüfen, ob die richtigen Daten gespeichert wurden
      const storageKey = `session_${sessionId}_older_messages`;
      const storageDataCall = sessionStorageMock.setItem.mock.calls.find(
        (call) => call[0] === storageKey,
      );

      expect(storageDataCall).toBeDefined();

      // Parse des gespeicherten JSON
      const storedMessages = JSON.parse(storageDataCall[1]);
      expect(storedMessages).toHaveLength(50);
      expect(storedMessages[0].content).toBe("Nachricht 1");
      expect(storedMessages[49].content).toBe("Nachricht 50");
    });

    it("sollte ältere Nachrichten aus dem sessionStorage laden können", () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";

      // Aktuelle Nachrichten setzen
      const currentMessages = [
        createMockMessage({
          id: "current-1",
          sessionId,
          content: "Aktuelle Nachricht 1",
        }),
        createMockMessage({
          id: "current-2",
          sessionId,
          content: "Aktuelle Nachricht 2",
        }),
      ];

      store.messages = { [sessionId]: currentMessages };

      // Ältere Nachrichten im sessionStorage
      const olderMessages = [
        createMockMessage({
          id: "older-1",
          sessionId,
          content: "Ältere Nachricht 1",
        }),
        createMockMessage({
          id: "older-2",
          sessionId,
          content: "Ältere Nachricht 2",
        }),
      ];

      const sessionStorageMock = {
        getItem: vi.fn().mockReturnValue(JSON.stringify(olderMessages)),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };
      vi.stubGlobal("sessionStorage", sessionStorageMock);

      // Act
      const result = store.loadOlderMessages(sessionId);

      // Assert
      expect(result).toEqual(olderMessages);

      // Nachrichten sollten kombiniert sein, sortiert nach Zeitstempel
      expect(store.messages[sessionId]).toHaveLength(4);

      // sessionStorage-Eintrag sollte entfernt sein
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(
        `session_${sessionId}_older_messages`,
      );
    });
  });

  describe("Computed Properties", () => {
    it("sollte die aktuelle Session korrekt berechnen", () => {
      // Arrange
      const store = useSessionsStore();
      const session1 = createMockSession({ id: "session-1" });
      const session2 = createMockSession({ id: "session-2" });

      store.sessions = [session1, session2];
      store.currentSessionId = "session-2";

      // Act & Assert
      expect(store.currentSession).toEqual(session2);

      // Wenn keine aktuelle Session vorhanden ist
      store.currentSessionId = "nicht-vorhanden";
      expect(store.currentSession).toBeNull();
    });

    it("sollte die aktuellen Nachrichten korrekt berechnen", () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";
      const messages = [createMockMessage({ sessionId })];

      store.messages = { [sessionId]: messages };
      store.currentSessionId = sessionId;

      // Act & Assert
      expect(store.currentMessages).toEqual(messages);

      // Wenn keine aktuelle Session vorhanden ist
      store.currentSessionId = null;
      expect(store.currentMessages).toEqual([]);
    });

    it("sollte Sessions korrekt sortieren", () => {
      // Arrange
      const store = useSessionsStore();

      // Sessions mit unterschiedlichen Zeitstempeln und Pin-Status
      const olderSession = createMockSession({
        id: "older",
        updatedAt: "2023-01-01T10:00:00Z",
        isPinned: false,
      });
      const newerSession = createMockSession({
        id: "newer",
        updatedAt: "2023-01-01T11:00:00Z",
        isPinned: false,
      });
      const pinnedOlderSession = createMockSession({
        id: "pinned-older",
        updatedAt: "2023-01-01T09:00:00Z",
        isPinned: true,
      });

      store.sessions = [olderSession, newerSession, pinnedOlderSession];

      // Act & Assert
      const sortedSessions = store.sortedSessions;

      // Gepinnte Sessions sollten zuerst kommen, dann nach Datum sortiert
      expect(sortedSessions[0].id).toBe("pinned-older");
      expect(sortedSessions[1].id).toBe("newer");
      expect(sortedSessions[2].id).toBe("older");
    });

    it("sollte Sessions nach Tag filtern können", () => {
      // Arrange
      const store = useSessionsStore();

      // Sessions mit verschiedenen Tags erstellen
      const session1 = createMockSession({
        id: "session-1",
        tags: [{ id: "important", name: "Wichtig", color: "#F56565" }],
      });
      const session2 = createMockSession({
        id: "session-2",
        tags: [{ id: "work", name: "Arbeit", color: "#3182CE" }],
      });
      const session3 = createMockSession({
        id: "session-3",
        tags: [
          { id: "important", name: "Wichtig", color: "#F56565" },
          { id: "work", name: "Arbeit", color: "#3182CE" },
        ],
      });

      store.sessions = [session1, session2, session3];

      // Act & Assert
      const importantSessions = store.getSessionsByTag.value("important");
      const workSessions = store.getSessionsByTag.value("work");

      expect(importantSessions).toHaveLength(2);
      expect(importantSessions.map((s) => s.id)).toContain("session-1");
      expect(importantSessions.map((s) => s.id)).toContain("session-3");

      expect(workSessions).toHaveLength(2);
      expect(workSessions.map((s) => s.id)).toContain("session-2");
      expect(workSessions.map((s) => s.id)).toContain("session-3");
    });

    it("sollte Sessions nach Kategorie filtern können", () => {
      // Arrange
      const store = useSessionsStore();

      // Sessions mit verschiedenen Kategorien erstellen
      const session1 = createMockSession({
        id: "session-1",
        category: { id: "general", name: "Allgemein", color: "#718096" },
      });
      const session2 = createMockSession({
        id: "session-2",
        category: { id: "support", name: "Support", color: "#3182CE" },
      });
      const session3 = createMockSession({
        id: "session-3",
        category: { id: "support", name: "Support", color: "#3182CE" },
      });

      store.sessions = [session1, session2, session3];

      // Act & Assert
      const generalSessions = store.getSessionsByCategory.value("general");
      const supportSessions = store.getSessionsByCategory.value("support");

      expect(generalSessions).toHaveLength(1);
      expect(generalSessions[0].id).toBe("session-1");

      expect(supportSessions).toHaveLength(2);
      expect(supportSessions.map((s) => s.id)).toContain("session-2");
      expect(supportSessions.map((s) => s.id)).toContain("session-3");
    });

    it("sollte archivierte und aktive Sessions separat zurückgeben", () => {
      // Arrange
      const store = useSessionsStore();

      // Sessions mit verschiedenem Archivierungsstatus erstellen
      const activeSession1 = createMockSession({
        id: "active-1",
        isArchived: false,
      });
      const activeSession2 = createMockSession({
        id: "active-2",
        isArchived: false,
      });
      const archivedSession = createMockSession({
        id: "archived-1",
        isArchived: true,
      });

      store.sessions = [activeSession1, activeSession2, archivedSession];

      // Act & Assert
      expect(store.activeSessions).toHaveLength(2);
      expect(store.activeSessions.map((s) => s.id)).toContain("active-1");
      expect(store.activeSessions.map((s) => s.id)).toContain("active-2");

      expect(store.archivedSessions).toHaveLength(1);
      expect(store.archivedSessions[0].id).toBe("archived-1");
    });

    it("sollte alle aktuellen Nachrichten einschließlich ausstehender zurückgeben", () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";

      // Reguläre und ausstehende Nachrichten hinzufügen
      const regularMessages = [
        createMockMessage({
          id: "regular-1",
          sessionId,
          content: "Reguläre Nachricht",
        }),
      ];
      const pendingMessages = [
        createMockMessage({
          id: "pending-1",
          sessionId,
          content: "Ausstehende Nachricht",
          status: "pending",
        }),
      ];

      store.messages = { [sessionId]: regularMessages };
      store.pendingMessages = { [sessionId]: pendingMessages };
      store.currentSessionId = sessionId;

      // Act & Assert
      expect(store.allCurrentMessages).toHaveLength(2);
      expect(store.allCurrentMessages.map((m) => m.id)).toContain("regular-1");
      expect(store.allCurrentMessages.map((m) => m.id)).toContain("pending-1");
      expect(store.allCurrentMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "regular-1" }),
          expect.objectContaining({ id: "pending-1" }),
        ]),
      );
    });
  });

  describe("Session Tags und Kategorien", () => {
    it("sollte einer Session einen Tag hinzufügen können", async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";
      const tagId = "important";

      // Session ohne Tags erstellen
      store.sessions = [createMockSession({ id: sessionId })];

      // Tag in verfügbaren Tags hinzufügen
      store.availableTags = [
        { id: "important", name: "Wichtig", color: "#F56565" },
      ];

      // Mock für die API-Anfrage
      vi.mocked(axios.patch).mockResolvedValueOnce(createApiResponse({}));

      // Act
      await store.addTagToSession(sessionId, tagId);

      // Assert
      expect(store.sessions[0].tags).toBeDefined();
      expect(store.sessions[0].tags).toHaveLength(1);
      expect(store.sessions[0].tags![0].id).toBe("important");

      // Verify API call
      expect(axios.patch).toHaveBeenCalledWith(
        `/api/sessions/${sessionId}`,
        { tags: store.sessions[0].tags },
        { headers: { Authorization: "Bearer mock-token" } },
      );
    });

    it("sollte einen Tag von einer Session entfernen können", async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";
      const tagId = "important";

      // Session mit Tags erstellen
      store.sessions = [
        createMockSession({
          id: sessionId,
          tags: [
            { id: "important", name: "Wichtig", color: "#F56565" },
            { id: "work", name: "Arbeit", color: "#3182CE" },
          ],
        }),
      ];

      // Mock für die API-Anfrage
      vi.mocked(axios.patch).mockResolvedValueOnce(createApiResponse({}));

      // Act
      await store.removeTagFromSession(sessionId, tagId);

      // Assert
      expect(store.sessions[0].tags).toHaveLength(1);
      expect(store.sessions[0].tags![0].id).toBe("work");

      // Verify API call
      expect(axios.patch).toHaveBeenCalledWith(
        `/api/sessions/${sessionId}`,
        { tags: store.sessions[0].tags },
        { headers: { Authorization: "Bearer mock-token" } },
      );
    });

    it("sollte die Kategorie einer Session setzen können", async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";
      const categoryId = "support";

      // Session ohne Kategorie erstellen
      store.sessions = [createMockSession({ id: sessionId })];

      // Kategorie in verfügbaren Kategorien hinzufügen
      store.availableCategories = [
        { id: "support", name: "Support", color: "#3182CE" },
      ];

      // Mock für die API-Anfrage
      vi.mocked(axios.patch).mockResolvedValueOnce(createApiResponse({}));

      // Act
      await store.setCategoryForSession(sessionId, categoryId);

      // Assert
      expect(store.sessions[0].category).toBeDefined();
      expect(store.sessions[0].category!.id).toBe("support");

      // Verify API call
      expect(axios.patch).toHaveBeenCalledWith(
        `/api/sessions/${sessionId}`,
        { category: store.sessions[0].category },
        { headers: { Authorization: "Bearer mock-token" } },
      );
    });

    it("sollte die Kategorie einer Session entfernen können", async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";

      // Session mit Kategorie erstellen
      store.sessions = [
        createMockSession({
          id: sessionId,
          category: { id: "support", name: "Support", color: "#3182CE" },
        }),
      ];

      // Mock für die API-Anfrage
      vi.mocked(axios.patch).mockResolvedValueOnce(createApiResponse({}));

      // Act
      await store.removeCategoryFromSession(sessionId);

      // Assert
      expect(store.sessions[0].category).toBeUndefined();

      // Verify API call
      expect(axios.patch).toHaveBeenCalledWith(
        `/api/sessions/${sessionId}`,
        { category: null },
        { headers: { Authorization: "Bearer mock-token" } },
      );
    });

    it("sollte eine Session archivieren/dearchivieren können", async () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId = "test-session-123";

      // Session erstellen
      store.sessions = [
        createMockSession({ id: sessionId, isArchived: false }),
      ];

      // Mock für die API-Anfrage
      vi.mocked(axios.patch).mockResolvedValueOnce(createApiResponse({}));

      // Act - Session archivieren
      await store.toggleArchiveSession(sessionId, true);

      // Assert
      expect(store.sessions[0].isArchived).toBe(true);

      // Verify API call
      expect(axios.patch).toHaveBeenCalledWith(
        `/api/sessions/${sessionId}`,
        { isArchived: true },
        { headers: { Authorization: "Bearer mock-token" } },
      );

      // Reset Mock
      vi.mocked(axios.patch).mockReset();
      vi.mocked(axios.patch).mockResolvedValueOnce(createApiResponse({}));

      // Act - Session dearchivieren
      await store.toggleArchiveSession(sessionId, false);

      // Assert
      expect(store.sessions[0].isArchived).toBe(false);

      // Verify API call
      expect(axios.patch).toHaveBeenCalledWith(
        `/api/sessions/${sessionId}`,
        { isArchived: false },
        { headers: { Authorization: "Bearer mock-token" } },
      );
    });
  });

  describe("Massenoperationen", () => {
    it("sollte Sessions für die Massenbearbeitung auswählen können", () => {
      // Arrange
      const store = useSessionsStore();
      const sessionId1 = "session-1";
      const sessionId2 = "session-2";

      // Act - Sessions auswählen
      store.selectSession(sessionId1);
      store.selectSession(sessionId2);

      // Assert
      expect(store.selectedSessionIds).toHaveLength(2);
      expect(store.selectedSessionIds).toContain(sessionId1);
      expect(store.selectedSessionIds).toContain(sessionId2);
    });

    it("sollte eine Session aus der Auswahl entfernen können", () => {
      // Arrange
      const store = useSessionsStore();
      store.selectedSessionIds = ["session-1", "session-2", "session-3"];

      // Act
      store.deselectSession("session-2");

      // Assert
      expect(store.selectedSessionIds).toHaveLength(2);
      expect(store.selectedSessionIds).toContain("session-1");
      expect(store.selectedSessionIds).toContain("session-3");
      expect(store.selectedSessionIds).not.toContain("session-2");
    });

    it("sollte die Sitzungsauswahl umschalten können", () => {
      // Arrange
      const store = useSessionsStore();
      store.selectedSessionIds = ["session-1"];

      // Act - Vorhandene Session abwählen
      store.toggleSessionSelection("session-1");

      // Assert
      expect(store.selectedSessionIds).toHaveLength(0);

      // Act - Nicht vorhandene Session auswählen
      store.toggleSessionSelection("session-2");

      // Assert
      expect(store.selectedSessionIds).toHaveLength(1);
      expect(store.selectedSessionIds).toContain("session-2");
    });

    it("sollte alle ausgewählten Sessions archivieren können", async () => {
      // Arrange
      const store = useSessionsStore();

      // Sessions erstellen
      store.sessions = [
        createMockSession({ id: "session-1", isArchived: false }),
        createMockSession({ id: "session-2", isArchived: false }),
      ];

      // Sessions auswählen
      store.selectedSessionIds = ["session-1", "session-2"];

      // Spy für toggleArchiveSession
      const toggleArchiveSpy = vi
        .spyOn(store, "toggleArchiveSession")
        .mockResolvedValue();

      // Act
      await store.archiveMultipleSessions(["session-1", "session-2"]);

      // Assert
      expect(toggleArchiveSpy).toHaveBeenCalledTimes(2);
      expect(toggleArchiveSpy).toHaveBeenCalledWith("session-1", true);
      expect(toggleArchiveSpy).toHaveBeenCalledWith("session-2", true);
      expect(store.selectedSessionIds).toHaveLength(0); // Auswahl zurückgesetzt
    });

    it("sollte allen ausgewählten Sessions einen Tag hinzufügen können", async () => {
      // Arrange
      const store = useSessionsStore();

      // Sessions erstellen
      store.sessions = [
        createMockSession({ id: "session-1" }),
        createMockSession({ id: "session-2" }),
      ];

      // Sessions auswählen
      store.selectedSessionIds = ["session-1", "session-2"];

      // Spy für addTagToSession
      const addTagSpy = vi.spyOn(store, "addTagToSession").mockResolvedValue();

      // Act
      await store.addTagToMultipleSessions(
        ["session-1", "session-2"],
        "important",
      );

      // Assert
      expect(addTagSpy).toHaveBeenCalledTimes(2);
      expect(addTagSpy).toHaveBeenCalledWith("session-1", "important");
      expect(addTagSpy).toHaveBeenCalledWith("session-2", "important");
    });
  });
});
