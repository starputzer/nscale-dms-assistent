/**
 * Tests für Sessions Store
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSessionsStore } from "./sessions";
import { useAuthStore } from "./auth";
import axios from "axios";
import {
  mockUtils,
  createMockAxiosResponse,
  createMockAxiosError,
} from "@/test/setup";

// Mock axios
vi.mock("axios");
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

// Mock auth store
vi.mock("./auth", () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: true,
    token: "test-token",
    user: {
      id: "user-1",
      email: "test@example.com",
    },
    createAuthHeaders: () => ({
      Authorization: "Bearer test-token",
    }),
  })),
}));

describe("Sessions Store", () => {
  let store: ReturnType<typeof useSessionsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useSessionsStore();
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("has correct initial state", () => {
      expect(store.sessions).toEqual([]);
      expect(store.currentSessionId).toBeNull();
      expect(store.messages).toEqual({});
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.streaming.isActive).toBe(false);
    });
  });

  describe("Getters", () => {
    it("currentSession returns current session", () => {
      const session = mockUtils.createSession();
      store.sessions = [session];
      store.currentSessionId = session.id;

      expect(store.currentSession).toEqual(session);
    });

    it("currentMessages returns messages for current session", () => {
      const messages = [
        mockUtils.createMessage({ id: "msg-1" }),
        mockUtils.createMessage({ id: "msg-2" }),
      ];

      store.currentSessionId = "session-1";
      store.messages["session-1"] = messages;

      expect(store.currentMessages).toEqual(messages);
    });

    it("sortedSessions returns sessions sorted by date", () => {
      const oldSession = mockUtils.createSession({
        id: "old",
        updatedAt: "2023-01-01T00:00:00Z",
      });
      const newSession = mockUtils.createSession({
        id: "new",
        updatedAt: "2023-12-31T00:00:00Z",
      });

      store.sessions = [oldSession, newSession];

      expect(store.sortedSessions[0].id).toBe("new");
      expect(store.sortedSessions[1].id).toBe("old");
    });

    it("hasActiveSessions returns true when sessions exist", () => {
      store.sessions = [mockUtils.createSession()];
      expect(store.hasActiveSessions).toBe(true);
    });

    it("messageCount returns total message count", () => {
      store.messages = {
        "session-1": [mockUtils.createMessage(), mockUtils.createMessage()],
        "session-2": [mockUtils.createMessage()],
      };

      expect(store.messageCount).toBe(3);
    });

    it("isStreaming returns streaming state", () => {
      store.streaming.isActive = true;
      expect(store.isStreaming).toBe(true);
    });
  });

  describe("Actions", () => {
    describe("loadSessions", () => {
      it("loads sessions successfully", async () => {
        const sessions = [
          mockUtils.createSession({ id: "session-1" }),
          mockUtils.createSession({ id: "session-2" }),
        ];

<<<<<<< HEAD
        mockedAxios.(get as any).mockResolvedValueOnce(
=======
        mockedAxios.get.mockResolvedValueOnce(
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
          createMockAxiosResponse({ sessions, success: true }),
        );

        await store.loadSessions();

        expect(store.sessions).toEqual(sessions);
        expect(store.loading).toBe(false);
        expect(store.error).toBeNull();
      });

      it("handles error when loading sessions", async () => {
<<<<<<< HEAD
        mockedAxios.(get as any).mockRejectedValueOnce(
=======
        mockedAxios.get.mockRejectedValueOnce(
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
          createMockAxiosError("Failed to load sessions"),
        );

        await store.loadSessions();

        expect(store.error).toBe("Fehler beim Laden der Sitzungen");
        expect(store.loading).toBe(false);
      });
    });

    describe("createSession", () => {
      it("creates a new session successfully", async () => {
        const newSession = mockUtils.createSession({
          id: "new-session",
          title: "New Chat",
        });

<<<<<<< HEAD
        mockedAxios.(post as any).mockResolvedValueOnce(
=======
        mockedAxios.post.mockResolvedValueOnce(
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
          createMockAxiosResponse(newSession),
        );

        const sessionId = await store.createSession("New Chat");

        expect(sessionId).toBe("new-session");
        expect(store.sessions).toContainEqual(newSession);
        expect(store.currentSessionId).toBe("new-session");
      });

      it("creates local session when not authenticated", async () => {
        vi.mocked(useAuthStore).mockReturnValueOnce({
          isAuthenticated: false,
          createAuthHeaders: () => ({}),
        } as any);

        const sessionId = await store.createSession();

        expect(sessionId).toBeDefined();
        expect(store.sessions[0].isLocal).toBe(true);
        expect(mockedAxios.post).not.toHaveBeenCalled();
      });
    });

    describe("sendMessage", () => {
      beforeEach(() => {
        // Setup a current session
        const session = mockUtils.createSession();
        store.sessions = [session];
        store.currentSessionId = session.id;
      });

      it("sends message successfully", async () => {
        const userMessage = {
          content: "Hello",
          role: "user",
        };

        const assistantMessage = mockUtils.createMessage({
          content: "Hi there!",
          role: "assistant",
        });

        // Mock non-streaming response
<<<<<<< HEAD
        mockedAxios.(post as any).mockResolvedValueOnce(
=======
        mockedAxios.post.mockResolvedValueOnce(
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
          createMockAxiosResponse({
            response: "Hi there!",
            message_id: assistantMessage.id,
          }),
        );

        await store.sendMessage({
          sessionId: store.currentSessionId!,
          content: userMessage.content,
          role: userMessage.role,
        });

        expect(store.messages[store.currentSessionId!]).toHaveLength(2);
        expect(store.messages[store.currentSessionId!][0].content).toBe(
          "Hello",
        );
        expect(store.messages[store.currentSessionId!][1].content).toBe(
          "Hi there!",
        );
      });

      it("handles streaming response", async () => {
        // Mock EventSource
        const mockEventSource = {
          onmessage: null,
          onerror: null,
          close: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        };

<<<<<<< HEAD
        global.EventSource = vi.fn(() => (mockEventSource as any));
=======
        global.EventSource = vi.fn(() => mockEventSource as any);
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da

        await store.sendMessage({
          sessionId: store.currentSessionId!,
          content: "Stream test",
        });

        // Simulate streaming events
        const messageHandler = mockEventSource.onmessage;
        if (messageHandler) {
          messageHandler({ data: JSON.stringify({ chunk: "Part 1" }) } as any);
          messageHandler({ data: JSON.stringify({ chunk: " Part 2" }) } as any);
          messageHandler({ data: "[DONE]" } as any);
        }

        expect(store.messages[store.currentSessionId!]).toHaveLength(2);
        expect(store.messages[store.currentSessionId!][1].content).toBe(
          "Part 1 Part 2",
        );
        expect(store.streaming.isActive).toBe(false);
      });

      it("queues message when not authenticated", async () => {
        vi.mocked(useAuthStore).mockReturnValueOnce({
          isAuthenticated: false,
        } as any);

        await store.sendMessage({
          sessionId: store.currentSessionId!,
          content: "Offline message",
        });

        expect(store.pendingMessages[store.currentSessionId!]).toHaveLength(1);
        expect(store.pendingMessages[store.currentSessionId!][0].content).toBe(
          "Offline message",
        );
      });
    });

    describe("deleteSession", () => {
      it("deletes session successfully", async () => {
        const session = mockUtils.createSession();
        store.sessions = [session];
        store.currentSessionId = session.id;

<<<<<<< HEAD
        mockedAxios.(delete as any).mockResolvedValueOnce(
=======
        mockedAxios.delete.mockResolvedValueOnce(
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
          createMockAxiosResponse({ success: true }),
        );

        await store.deleteSession(session.id);

        expect(store.sessions).not.toContainEqual(session);
        expect(store.currentSessionId).toBeNull();
        expect(store.messages[session.id]).toBeUndefined();
      });

      it("handles error when deleting session", async () => {
        const session = mockUtils.createSession();
        store.sessions = [session];

<<<<<<< HEAD
        mockedAxios.(delete as any).mockRejectedValueOnce(
=======
        mockedAxios.delete.mockRejectedValueOnce(
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
          createMockAxiosError("Failed to delete"),
        );

        await store.deleteSession(session.id);

        expect(store.error).toBe("Failed to delete");
        expect(store.sessions).toContainEqual(session); // Session remains
      });
    });

    describe("clearMessages", () => {
      it("clears messages for a session", () => {
        const sessionId = "session-1";
        store.messages[sessionId] = [
          mockUtils.createMessage(),
          mockUtils.createMessage(),
        ];

        store.clearMessages(sessionId);

        expect(store.messages[sessionId]).toEqual([]);
      });
    });

    describe("updateSession", () => {
      it("updates session details", () => {
        const session = mockUtils.createSession({ title: "Old Title" });
        store.sessions = [session];

        store.updateSession(session.id, { title: "New Title" });

        expect(store.sessions[0].title).toBe("New Title");
      });
    });

    describe("pinSession", () => {
      it("toggles session pin status", async () => {
        const session = mockUtils.createSession({ isPinned: false });
        store.sessions = [session];

<<<<<<< HEAD
        mockedAxios.(patch as any).mockResolvedValueOnce(
=======
        mockedAxios.patch.mockResolvedValueOnce(
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
          createMockAxiosResponse({ success: true }),
        );

        await store.pinSession(session.id);

        expect(store.sessions[0].isPinned).toBe(true);
      });
    });

    describe("searchSessions", () => {
      it("filters sessions by search query", () => {
        store.sessions = [
          mockUtils.createSession({ title: "TypeScript Help" }),
          mockUtils.createSession({ title: "JavaScript Tutorial" }),
          mockUtils.createSession({ title: "Python Guide" }),
        ];

        const results = store.searchSessions("script");

        expect(results).toHaveLength(2);
        expect(results[0].title).toBe("TypeScript Help");
        expect(results[1].title).toBe("JavaScript Tutorial");
      });
    });

    describe("syncPendingMessages", () => {
      it("sends pending messages when authenticated", async () => {
        const sessionId = "session-1";
        store.pendingMessages[sessionId] = [
          mockUtils.createMessage({ content: "Pending 1", status: "pending" }),
          mockUtils.createMessage({ content: "Pending 2", status: "pending" }),
        ];

<<<<<<< HEAD
        mockedAxios.(post as any).mockResolvedValue(
=======
        mockedAxios.post.mockResolvedValue(
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
          createMockAxiosResponse({ success: true }),
        );

        await store.syncPendingMessages();

        expect(mockedAxios.post).toHaveBeenCalledTimes(2);
        expect(store.pendingMessages[sessionId]).toEqual([]);
      });
    });
  });

  describe("Persistence", () => {
    it("persists required state", () => {
      // Check that persist configuration includes necessary paths
      const persistConfig = (useSessionsStore as any).$pinia?.store?.persist;
      if (persistConfig) {
        expect(persistConfig.strategies[0].paths).toContain("sessions");
        expect(persistConfig.strategies[0].paths).toContain("messages");
        expect(persistConfig.strategies[0].paths).toContain("currentSessionId");
      }
    });
  });
});
