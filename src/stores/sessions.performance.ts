import { defineStore } from "pinia";
import { computed, ref, shallowRef, markRaw } from "vue";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import type {
  ChatSession,
  ChatMessage,
  StreamingStatus,
  SendMessageParams,
} from "../types/session";
import { useAuthStore } from "./auth";
import {
  useShallowReactivity,
  useShallowMap,
} from "@/composables/useShallowReactivity";
import {
  BatchUpdateManager,
  createStreamingUpdate,
} from "@/utils/BatchUpdateManager";
import { performanceMonitor } from "@/utils/PerformanceMonitor";

/**
 * Performance-optimized Sessions Store
 *
 * Key optimizations:
 * - Shallow reactivity for message collections
 * - Batch updates for streaming messages
 * - Efficient memory management
 * - Memoized computed properties
 * - Minimal re-renders
 */
export const useSessionsStore = defineStore("sessions-performance", () => {
  const authStore = useAuthStore();

  // ===== Shallow Reactive State =====

  // Sessions use shallow reactivity for better performance
  const {
    data: sessions,
    updateItem: updateSession,
    append: appendSession,
    remove: removeSession,
    clear: clearSessions,
    metrics: sessionMetrics,
  } = useShallowReactivity<ChatSession[]>([], {
    trackPerformance: true,
    maxItems: 1000,
  });

  // Messages stored in a shallow map for efficient access
  const messagesMap = useShallowMap<string, ChatMessage[]>();

  // Current session ID
  const currentSessionId = ref<string | null>(null);

  // Streaming status
  const streaming = shallowRef<StreamingStatus>({
    isActive: false,
    progress: 0,
    currentSessionId: null,
  });

  // Loading and error states
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Batch update manager for streaming messages
  const batchManager = new BatchUpdateManager<ChatMessage>(
    async (updates) => {
      // Group updates by session
      const updatesBySession = new Map<string, ChatMessage[]>();

      updates.forEach((update) => {
        const sessionId = update.data.sessionId;
        if (!updatesBySession.has(sessionId)) {
          updatesBySession.set(sessionId, []);
        }
        updatesBySession.get(sessionId)!.push(update.data);
      });

      // Apply updates to each session
      updatesBySession.forEach((messages, sessionId: any) => {
        const currentMessages = messagesMap.get(sessionId) || [];
        const messageMap = new Map(currentMessages.map((m) => [m.id, m]));

        // Update or add messages
        messages.forEach((msg) => {
          messageMap.set(msg.id, markRaw(msg));
        });

        // Convert back to array and update
        const updatedMessages = Array.from(messageMap.values());
        messagesMap.set(sessionId, updatedMessages);
      });
    },
    {
      maxBatchTime: 50,
      maxBatchSize: 100,
      adaptiveThrottling: true,
      trackPerformance: true,
      onMetrics: (metrics) => {
        if (process.env.NODE_ENV === "development") {
          console.debug("Batch update metrics:", metrics);
        }
      },
    },
  );

  // ===== Memoized Getters =====

  // Cache for computed values
  const computedCache = new Map<string, { value: any; timestamp: number }>();
  const CACHE_TTL = 1000; // 1 second

  // Helper to get cached or compute value
  function getCachedComputed<T>(key: string, computeFn: () => T): T {
    const cached = computedCache.get(key);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL) {
      return cached.value;
    }

    const value = computeFn();
    computedCache.set(key, { value, timestamp: now });
    return value;
  }

  // Current session getter with caching
  const currentSession = computed(() => {
    if (!currentSessionId.value) return null;

    return getCachedComputed(`session-${currentSessionId.value}`, () => {
      return (
        (sessions.value as ChatSession[]).find(
          (s) => s.id === currentSessionId.value,
        ) || null
      );
    });
  });

  // Current messages getter
  const currentMessages = computed(() => {
    if (!currentSessionId.value) return [];
    return messagesMap.get(currentSessionId.value) || [];
  });

  // Sorted sessions with shallow comparison
  const sortedSessions = computed(() => {
    return getCachedComputed("sorted-sessions", () => {
      const sessionsCopy = [...(sessions.value as ChatSession[])];

      return sessionsCopy.sort((a, b) => {
        // Pinned first
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }

        // Then by date
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
    });
  });

  // Active sessions (not archived)
  const activeSessions = computed(() => {
    return getCachedComputed("active-sessions", () => {
      return (sessions.value as ChatSession[]).filter((s) => !s.isArchived);
    });
  });

  // ===== Actions =====

  /**
   * Create a new session
   */
  async function createSession(title = "Neue Unterhaltung"): Promise<string> {
    const sessionId = uuidv4();
    const now = new Date().toISOString();

    const newSession: ChatSession = markRaw({
      id: sessionId,
      title,
      userId: authStore.user?.id || "anonymous",
      createdAt: now,
      updatedAt: now,
    });

    // Add session
    appendSession(newSession);

    // Initialize empty messages
    messagesMap.set(sessionId, []);

    // Set as current
    currentSessionId.value = sessionId;

    // Sync with server if authenticated
    if (authStore.isAuthenticated) {
      try {
        await axios.post("/api/sessions", newSession, {
          headers: authStore.createAuthHeaders(),
        });
      } catch (err) {
        console.error("Failed to sync session:", err);
      }
    }

    return sessionId;
  }

  /**
   * Set current session and load messages if needed
   */
  async function setCurrentSession(sessionId: string): Promise<void> {
    if (currentSessionId.value === sessionId) return;

    performanceMonitor.measureComponentRender("setCurrentSession", () => {
      currentSessionId.value = sessionId;
    });

    // Load messages if not cached
    if (!messagesMap.has(sessionId)) {
      await fetchMessages(sessionId);
    }
  }

  /**
   * Fetch messages for a session
   */
  async function fetchMessages(sessionId: string): Promise<void> {
    if (!authStore.isAuthenticated) return;

    isLoading.value = true;
    error.value = null;

    try {
      const response = await performanceMonitor.measureAsync(
        "fetchMessages",
        () =>
          axios.get(`/api/sessions/${sessionId}/messages`, {
            headers: authStore.createAuthHeaders(),
          }),
      );

      // Store messages with shallow reactivity
      const messages = response.data.map((msg: ChatMessage) => markRaw(msg));
      messagesMap.set(sessionId, _messages);
    } catch (err: any) {
      console.error("Failed to fetch messages:", err);
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Send a message with optimized streaming
   */
  async function sendMessage(params: SendMessageParams): Promise<void> {
    const { sessionId, content, role = "user" } = params;

    if (!sessionId || !content) return;

    // Create user message
    const userMessage: ChatMessage = markRaw({
      id: uuidv4(),
      sessionId,
      content,
      role,
      timestamp: new Date().toISOString(),
      status: "sent",
    });

    // Add message immediately
    const messages = messagesMap.get(sessionId) || [];
    messagesMap.set(sessionId, [...messages, userMessage]);

    // Set streaming status
    streaming.value = {
      isActive: true,
      progress: 0,
      currentSessionId: sessionId,
    };

    try {
      // Create assistant message placeholder
      const assistantId = uuidv4();
      const assistantMessage: ChatMessage = markRaw({
        id: assistantId,
        sessionId,
        content: "",
        role: "assistant",
        timestamp: new Date().toISOString(),
        status: "pending",
        isStreaming: true,
      });

      // Add to messages
      const updatedMessages = messagesMap.get(sessionId) || [];
      messagesMap.set(sessionId, [...updatedMessages, assistantMessage]);

      // Setup streaming
      const eventSource = new EventSource(
        `/api/question/stream?question=${encodeURIComponent(content)}&session_id=${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        } as any,
      );

      let accumulatedContent = "";

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "content") {
          accumulatedContent += data.content;

          // Queue batch update
          batchManager.add(
            createStreamingUpdate(assistantId, {
              ...assistantMessage,
              content: accumulatedContent,
              isStreaming: true,
            }),
          );

          // Update progress
          streaming.value = {
            ...streaming.value,
            progress: Math.min(90, streaming.value.progress + 5),
          };
        }
      };

      eventSource.addEventListener("done", () => {
        // Final update
        const finalMessage: ChatMessage = {
          ...assistantMessage,
          content: accumulatedContent,
          isStreaming: false,
          status: "sent",
        };

        // Force immediate update
        batchManager.add(
          createStreamingUpdate(assistantId, finalMessage, true),
        );
        batchManager.flush();

        // Complete streaming
        streaming.value = {
          isActive: false,
          progress: 100,
          currentSessionId: null,
        };

        eventSource.close();
      });

      eventSource.onerror = (error) => {
        console.error("Streaming error:", error);
        eventSource.close();

        streaming.value = {
          isActive: false,
          progress: 0,
          currentSessionId: null,
        };
      };
    } catch (err: any) {
      console.error("Failed to send message:", err);
      error.value = err.message;

      streaming.value = {
        isActive: false,
        progress: 0,
        currentSessionId: null,
      };
    }
  }

  /**
   * Delete a session
   */
  async function deleteSession(sessionId: string): Promise<void> {
    // Remove from sessions
    removeSession((s) => s.id === sessionId);

    // Remove messages
    messagesMap.remove(sessionId);

    // Clear current if deleted
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = null;
    }

    // Sync with server
    if (authStore.isAuthenticated) {
      try {
        await axios.delete(`/api/sessions/${sessionId}`, {
          headers: authStore.createAuthHeaders(),
        });
      } catch (err) {
        console.error("Failed to delete session:", err);
      }
    }
  }

  /**
   * Clear all sessions and messages
   */
  function clearAll(): void {
    clearSessions();
    messagesMap.clear();
    currentSessionId.value = null;
    computedCache.clear();
  }

  /**
   * Get performance metrics
   */
  function getPerformanceMetrics() {
    return {
      sessionMetrics: sessionMetrics.value,
      batchMetrics: batchManager.getMetrics(),
      cacheSize: computedCache.size,
      messageCount: Array.from(messagesMap.map.value.values()).reduce(
        (sum: any, _messages) => sum + messages.length,
        0,
      ),
    };
  }

  // Cleanup on unmount
  function cleanup() {
    batchManager.destroy();
    clearAll();
  }

  return {
    // State
    sessions: computed(() => sessions.value),
    currentSessionId,
    currentSession,
    currentMessages,
    sortedSessions,
    activeSessions,
    streaming: computed(() => streaming.value),
    isLoading,
    error,

    // Actions
    createSession,
    setCurrentSession,
    fetchMessages,
    sendMessage,
    deleteSession,
    clearAll,
    cleanup,

    // Performance
    getPerformanceMetrics,
  };
});
