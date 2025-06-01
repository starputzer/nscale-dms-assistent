import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSessionsStore } from "@/stores/sessions";
import { ChatSession, ChatMessage } from "@/types/session";
import {
  ExtractState,
  ExtractGetters,
  ExtractActions,
} from "@/utils/storeTypes";
import { APIResponse, APIError } from "@/utils/apiTypes";
import { Result } from "@/utils/types";
import axios from "axios";
import {
  createMockApiResponse,
  createSuccessResult,
  createErrorResult,
  mockStoreAction,
  mockStoreGetter,
} from "../utils/typescript-test-utils";

/**
 * Tests für den Sessions Store mit verbesserter TypeScript-Integration
 *
 * Diese Tests demonstrieren die Verwendung von:
 * - Typed Store Actions, Getters und State
 * - Typsicheren Mocks
 * - Typsicheren Result-Wrappern
 */
describe("SessionsStore (Enhanced TypeScript)", () => {
  // Extrahierte Typen aus dem Store
  type SessionsState = ExtractState<typeof useSessionsStore>;
  type SessionsGetters = ExtractGetters<typeof useSessionsStore>;
  type SessionsActions = ExtractActions<typeof useSessionsStore>;

  // Typsichere Mock-Daten
  interface MockSessionData {
    id: string;
    title: string;
    messages: ChatMessage[];
    userId: string;
    createdAt: string;
    updatedAt: string;
    isPinned: boolean;
  }

  // Typsicherer Factory für Mock-Sessions
  const createMockSession = (
    overrides: Partial<MockSessionData> = {},
  ): ChatSession => {
    const defaultSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: "Test Session",
      userId: "test-user",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: false,
      lastMessage: null,
      messageCount: 0,
    };

    return { ...defaultSession, ...overrides };
  };

  // Typsicherer Factory für Mock-Messages
  const createMockMessage = (
    sessionId: string,
    role: "user" | "assistant" = "user",
    overrides: Partial<ChatMessage> = {},
  ): ChatMessage => {
    const defaultMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sessionId,
      content:
        role === "user" ? "Test user message" : "Test assistant response",
      role,
      timestamp: new Date().toISOString(),
    };

    return { ...defaultMessage, ...overrides };
  };

  // Typsicherer Factory für Session-Arrays
  const createMockSessions = (count: number): ChatSession[] => {
    return Array.from({ length: count }, (_, i) =>
      createMockSession({
        id: `session-${i + 1}`,
        title: `Test Session ${i + 1}`,
      }),
    );
  };

  // Setup für die Tests
  beforeEach(() => {
    setActivePinia(createPinia());

    // Mock für Axios
    vi.mock("axios");

    // Standard-Mock-Implementierung für axios.get
    vi.mocked(axios.get).mockImplementation(async (url: string) => {
      if (url.includes("/api/sessions")) {
        return {
          data: createMockApiResponse(createMockSessions(3)),
        };
      }

      return { data: createMockApiResponse({}) };
    });

    // Standard-Mock-Implementierung für axios.post
    vi.mocked(axios.post).mockImplementation(
      async (url: string, data?: any) => {
        if (url.includes("/api/sessions")) {
          // Neue Session erstellen
          const newSession = createMockSession({
            title: data?.title || "New Session",
          });

          return {
            data: createMockApiResponse(newSession),
          };
        }

        if (url.includes("/api/sessions") && url.includes("/messages")) {
          // Neue Nachricht erstellen
          const sessionId = url.split("/")[3];
          const message = createMockMessage(sessionId, "user", {
            content: data?.content || "Test message",
          });

          return {
            data: createMockApiResponse({
              message,
              reply: createMockMessage(sessionId, "assistant", {
                content: "Test response",
              }),
            }),
          };
        }

        return { data: createMockApiResponse({}) };
      },
    );

    // Standard-Mock-Implementierung für axios.delete
    vi.mocked(axios.delete).mockImplementation(async () => {
      return { data: createMockApiResponse({ success: true }) };
    });

    // Standard-Mock-Implementierung für axios.put
    vi.mocked(axios.put).mockImplementation(async (url: string, data?: any) => {
      if (url.includes("/api/sessions") && url.includes("/title")) {
        const sessionId = url.split("/")[3];
        const updatedSession = createMockSession({
          id: sessionId,
          title: data?.title || "Updated Title",
        });

        return {
          data: createMockApiResponse(updatedSession),
        };
      }

      return { data: createMockApiResponse({}) };
    });

    // Standard-Mock-Implementierung für axios.patch
    vi.mocked(axios.patch).mockImplementation(
      async (url: string, data?: any) => {
        if (url.includes("/api/sessions") && url.includes("/pin")) {
          const sessionId = url.split("/")[3];
          const isPinned = data?.isPinned === true;

          const updatedSession = createMockSession({
            id: sessionId,
            isPinned,
          });

          return {
            data: createMockApiResponse(updatedSession),
          };
        }

        return { data: createMockApiResponse({}) };
      },
    );

    // Lokalen Speicher zurücksetzen
    localStorage.clear();
  });

  describe("State Management", () => {
    it("should have default state", () => {
      // Arrange & Act
      const store = useSessionsStore();

      // Assert - Typsicher durch ExtractState<>
      const expectedState: Partial<SessionsState> = {
        sessions: [],
        currentSessionId: null,
        isLoading: false,
        isStreaming: false,
        error: null,
      };

      expect(store.sessions).toEqual(expectedState.sessions);
      expect(store.currentSessionId).toEqual(expectedState.currentSessionId);
      expect(store.isLoading).toEqual(expectedState.isLoading);
      expect(store.isStreaming).toEqual(expectedState.isStreaming);
      expect(store.error).toEqual(expectedState.error);
    });

    it("should update sessions state after fetching", async () => {
      // Arrange
      const store = useSessionsStore();
      const mockSessions = createMockSessions(3);

      vi.mocked(axios.get).mockResolvedValueOnce({
        data: createMockApiResponse(mockSessions),
      });

      // Act
      await store.fetchSessions();

      // Assert
      expect(store.sessions).toEqual(mockSessions);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
    });

    it("should handle errors when fetching sessions", async () => {
      // Arrange
      const store = useSessionsStore();
      const mockError: APIError = {
        code: "FETCH_ERROR",
        message: "Failed to fetch sessions",
        statusCode: 500,
      };

      vi.mocked(axios.get).mockResolvedValueOnce({
        data: createMockApiResponse(null, false, 500),
      });

      // Act
      await store.fetchSessions();

      // Assert
      expect(store.sessions).toEqual([]);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeTruthy();
    });

    it("should create a new session", async () => {
      // Arrange
      const store = useSessionsStore();
      const newSessionTitle = "New Test Session";
      const mockNewSession = createMockSession({ title: newSessionTitle });

      vi.mocked(axios.post).mockResolvedValueOnce({
        data: createMockApiResponse(mockNewSession),
      });

      // Act
      const result = await store.createSession(newSessionTitle);

      // Assert
      expect(result).toBe(mockNewSession.id);
      expect(store.sessions).toContainEqual(mockNewSession);
      expect(axios.post).toHaveBeenCalledWith("/api/sessions", {
        title: newSessionTitle,
      });
    });

    it("should set the current session", async () => {
      // Arrange
      const store = useSessionsStore();
      const mockSessions = createMockSessions(3);
      store.sessions = mockSessions;

      // Act
      await store.setCurrentSession(mockSessions[1].id);

      // Assert
      expect(store.currentSessionId).toBe(mockSessions[1].id);
    });

    it("should handle sending a message and receiving a reply", async () => {
      // Arrange
      const store = useSessionsStore();
      const mockSession = createMockSession();
      store.sessions = [mockSession];
      store.currentSessionId = mockSession.id;

      const messageContent = "Test message content";
      const userMessage = createMockMessage(mockSession.id, "user", {
        content: messageContent,
      });
      const assistantReply = createMockMessage(mockSession.id, "assistant", {
        content: "Test reply",
      });

      vi.mocked(axios.post).mockResolvedValueOnce({
        data: createMockApiResponse({
          message: userMessage,
          reply: assistantReply,
        }),
      });

      // Act
      await store.sendMessage({
        sessionId: mockSession.id,
        content: messageContent,
      });

      // Assert - Typsicher dank ExtractState<>
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.currentMessages).toContainEqual(userMessage);
      expect(store.currentMessages).toContainEqual(assistantReply);
    });

    it("should add streaming message chunks", () => {
      // Arrange
      const store = useSessionsStore();
      const mockSession = createMockSession();
      store.sessions = [mockSession];
      store.currentSessionId = mockSession.id;

      const mockStreamingMessage = createMockMessage(
        mockSession.id,
        "assistant",
        {
          content: "",
          id: "streaming-message",
        },
      );

      // Act
      store.startStreaming(mockStreamingMessage);

      // Simulate receiving stream chunks
      store.addStreamChunk("streaming-message", "H");
      store.addStreamChunk("streaming-message", "e");
      store.addStreamChunk("streaming-message", "l");
      store.addStreamChunk("streaming-message", "l");
      store.addStreamChunk("streaming-message", "o");

      // Assert
      expect(store.isStreaming).toBe(true);

      const updatedMessage = store.currentMessages.find(
        (msg) => msg.id === "streaming-message",
      );
      expect(updatedMessage).toBeDefined();
      expect(updatedMessage?.content).toBe("Hello");
    });

    it("should cancel streaming", () => {
      // Arrange
      const store = useSessionsStore();
      store.isStreaming = true;

      // Act
      store.cancelStreaming();

      // Assert
      expect(store.isStreaming).toBe(false);
    });

    it("should archive a session", async () => {
      // Arrange
      const store = useSessionsStore();
      const mockSessions = createMockSessions(3);
      store.sessions = mockSessions;
      const sessionToArchive = mockSessions[1];

      vi.mocked(axios.delete).mockResolvedValueOnce({
        data: createMockApiResponse({ success: true }),
      });

      // Act
      await store.archiveSession(sessionToArchive.id);

      // Assert
      expect(store.sessions).not.toContainEqual(sessionToArchive);
      expect(axios.delete).toHaveBeenCalledWith(
        `/api/sessions/${sessionToArchive.id}`,
      );
    });

    it("should update a session title", async () => {
      // Arrange
      const store = useSessionsStore();
      const mockSessions = createMockSessions(3);
      store.sessions = mockSessions;
      const sessionToUpdate = mockSessions[1];
      const newTitle = "Updated Session Title";

      vi.mocked(axios.put).mockResolvedValueOnce({
        data: createMockApiResponse({
          ...sessionToUpdate,
          title: newTitle,
        }),
      });

      // Act
      await store.updateSessionTitle(sessionToUpdate.id, newTitle);

      // Assert
      const updatedSession = store.sessions.find(
        (s) => s.id === sessionToUpdate.id,
      );
      expect(updatedSession?.title).toBe(newTitle);
      expect(axios.put).toHaveBeenCalledWith(
        `/api/sessions/${sessionToUpdate.id}/title`,
        { title: newTitle },
      );
    });

    it("should toggle pinned status of a session", async () => {
      // Arrange
      const store = useSessionsStore();
      const mockSession = createMockSession({ isPinned: false });
      store.sessions = [mockSession];

      vi.mocked(axios.patch).mockResolvedValueOnce({
        data: createMockApiResponse({
          ...mockSession,
          isPinned: true,
        }),
      });

      // Act
      await store.togglePinSession(mockSession.id);

      // Assert
      const updatedSession = store.sessions.find(
        (s) => s.id === mockSession.id,
      );
      expect(updatedSession?.isPinned).toBe(true);
      expect(axios.patch).toHaveBeenCalledWith(
        `/api/sessions/${mockSession.id}/pin`,
        { isPinned: true },
      );
    });

    it("should delete a message from a session", async () => {
      // Arrange
      const store = useSessionsStore();
      const mockSession = createMockSession();
      const mockMessages = [
        createMockMessage(mockSession.id, "user"),
        createMockMessage(mockSession.id, "assistant"),
        createMockMessage(mockSession.id, "user"),
      ];

      // Manually add messages to the session
      store.sessions = [
        {
          ...mockSession,
          messages: mockMessages,
        } as ChatSession,
      ];
      store.currentSessionId = mockSession.id;

      const messageToDelete = mockMessages[1];

      vi.mocked(axios.delete).mockResolvedValueOnce({
        data: createMockApiResponse({ success: true }),
      });

      // Act
      await store.deleteMessage(mockSession.id, messageToDelete.id);

      // Assert - Typsicher dank ExtractState<>
      const currentMessages = store.currentMessages;
      expect(currentMessages).not.toContainEqual(messageToDelete);
      expect(axios.delete).toHaveBeenCalledWith(
        `/api/sessions/${mockSession.id}/messages/${messageToDelete.id}`,
      );
    });

    it("should refresh a session", async () => {
      // Arrange
      const store = useSessionsStore();
      const mockSession = createMockSession();
      store.sessions = [mockSession];

      const refreshedSession = {
        ...mockSession,
        title: "Refreshed Title",
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(axios.get).mockResolvedValueOnce({
        data: createMockApiResponse(refreshedSession),
      });

      // Act
      await store.refreshSession(mockSession.id);

      // Assert
      expect(store.sessions[0]).toEqual(refreshedSession);
      expect(axios.get).toHaveBeenCalledWith(`/api/sessions/${mockSession.id}`);
    });
  });

  describe("Getters", () => {
    it("should get currentSession", () => {
      // Arrange
      const store = useSessionsStore();
      const mockSessions = createMockSessions(3);
      store.sessions = mockSessions;
      store.currentSessionId = mockSessions[1].id;

      // Act & Assert
      expect(store.currentSession).toEqual(mockSessions[1]);
    });

    it("should get currentMessages", () => {
      // Arrange
      const store = useSessionsStore();
      const mockSession = createMockSession();
      const mockMessages = [
        createMockMessage(mockSession.id, "user"),
        createMockMessage(mockSession.id, "assistant"),
      ];

      // Manually add messages to the session
      store.sessions = [
        {
          ...mockSession,
          messages: mockMessages,
        } as ChatSession,
      ];
      store.currentSessionId = mockSession.id;

      // Act & Assert
      expect(store.currentMessages).toEqual(mockMessages);
    });

    it("should get sortedSessions", () => {
      // Arrange
      const store = useSessionsStore();

      // Create sessions with different pinned status and dates
      const now = new Date();
      const dayAgo = new Date(now);
      dayAgo.setDate(dayAgo.getDate() - 1);
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const mockSessions = [
        createMockSession({
          id: "session-1",
          isPinned: false,
          updatedAt: dayAgo.toISOString(),
        }),
        createMockSession({
          id: "session-2",
          isPinned: true,
          updatedAt: twoDaysAgo.toISOString(),
        }),
        createMockSession({
          id: "session-3",
          isPinned: true,
          updatedAt: now.toISOString(),
        }),
      ];

      store.sessions = mockSessions;

      // Act
      const sortedSessions = store.sortedSessions;

      // Assert - Pinnded sessions should come first, then sorted by updatedAt
      expect(sortedSessions[0].id).toBe("session-3"); // Pinned + newest
      expect(sortedSessions[1].id).toBe("session-2"); // Pinned + older
      expect(sortedSessions[2].id).toBe("session-1"); // Not pinned
    });
  });

  describe("Type Safety", () => {
    it("should demonstrate strongly typed mocks", async () => {
      // Arrange
      const store = useSessionsStore();

      // Typsicherer Mock für das API-Ergebnis
      const successResponse: Result<ChatSession, APIError> =
        createSuccessResult(
          createMockSession({ title: "Typed Success Response" }),
        );

      // Typsicherer Mock für API-Fehler
      const errorResponse: Result<ChatSession, APIError> = createErrorResult({
        code: "TYPED_ERROR",
        message: "This is a strongly typed error",
        statusCode: 400,
      });

      // Typisierter Mock für eine Store-Action
      const mockCreate = mockStoreAction(
        store,
        "createSession",
        async () => "mocked-session-id",
      );

      // Mock für einen Getter
      mockStoreGetter(store, "currentSession", createMockSession());

      // Act
      const sessionId = await store.createSession("Test");

      // Assert
      expect(sessionId).toBe("mocked-session-id");
      expect(mockCreate).toHaveBeenCalledWith("Test");

      // TypeScript würde Fehler werfen, wenn wir versuchen, nicht vorhandene Eigenschaften zu lesen
      // Folgendes würde nicht kompilieren:
      // expect(store.nonExistentProperty).toBeDefined();
    });
  });
});
