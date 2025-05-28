/**
 * Comprehensive streaming functionality tests.
 * These tests verify the streaming behavior of chat messages including:
 * - Streaming initialization and connection
 * - Chunk processing and rendering
 * - Error handling during streaming
 * - Network interruption recovery
 * - Cancellation handling
 * - UI state during streaming
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useSessionsStore } from "@/stores/sessions";
import { useUIStore } from "@/stores/ui";
import { ApiService } from "@/services/api/ApiService";

// Mock EventSource for testing streaming functionality
class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readyState: number = 0;
  withCredentials: boolean = false;
  CONNECTING: number = 0;
  OPEN: number = 1;
  CLOSED: number = 2;

  private eventListeners: Record<string, Array<(event: MessageEvent) => void>> =
    {};

  constructor(url: string) {
    this.url = url;
    this.readyState = this.CONNECTING;

    // Auto-connect after creation
    setTimeout(() => {
      this.readyState = this.OPEN;
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 10);
  }

  addEventListener(
    type: string,
    listener: (event: MessageEvent) => void,
  ): void {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(listener);
  }

  removeEventListener(
    type: string,
    listener: (event: MessageEvent) => void,
  ): void {
    if (this.eventListeners[type]) {
      this.eventListeners[type] = this.eventListeners[type].filter(
        (l) => l !== listener,
      );
    }
  }

  dispatchEvent(event: Event): boolean {
    return true;
  }

  close(): void {
    this.readyState = this.CLOSED;
  }

  // Test-helper methods
  emit(type: string, data: any): void {
    const event = new MessageEvent(type, {
      data: typeof data === "string" ? data : JSON.stringify(data),
    });

    // Call specific event handler
    if (type === "message" && this.onmessage) {
      this.onmessage(event);
    }

    // Call all event listeners for this type
    if (this.eventListeners[type]) {
      this.eventListeners[type].forEach((listener) => listener(event));
    }
  }

  emitError(error: Error): void {
    if (this.onerror) {
      this.onerror(new Event("error"));
    }
  }
}

// Replace global EventSource with our mock
vi.stubGlobal("EventSource", MockEventSource);

// Mock API service
vi.mock("@/services/api/ApiService", () => ({
  ApiService: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    stream: vi.fn(),
  },
}));

// Mock data for tests
const mockSession = {
  id: "session-1",
  title: "Test Session",
  updatedAt: new Date().toISOString(),
  isArchived: false,
};

const mockMessages = [
  {
    id: "msg1",
    sessionId: "session-1",
    content: "Hello",
    role: "user",
    timestamp: new Date().toISOString(),
  },
];

describe("Chat Streaming Functionality", () => {
  let sessionsStore;
  let uiStore;
  let mockEventSource;

  beforeEach(() => {
    // Set up a fresh pinia instance
    setActivePinia(createPinia());

    // Get stores
    sessionsStore = useSessionsStore();
    uiStore = useUIStore();

    // Initialize store state
    sessionsStore.$patch({
      sessions: [mockSession],
      currentSession: mockSession,
      messages: { "session-1": [...mockMessages] },
      isLoading: false,
      isStreaming: false,
      error: null,
    });

    // Mock ApiService methods
    ApiService.post = vi.fn().mockResolvedValue({
      data: {
        id: "message-id",
        sessionId: "session-1",
      },
    });

    ApiService.stream = vi.fn().mockImplementation((url, options) => {
      // Create mock EventSource and store for testing
      mockEventSource = new MockEventSource(url);

      // Return the mocked EventSource
      return mockEventSource;
    });

    // Mock store methods if needed
    vi.spyOn(sessionsStore, "addMessage");
    vi.spyOn(sessionsStore, "updateMessage");
    vi.spyOn(uiStore, "showError");
  });

  it("initializes streaming correctly", async () => {
    // Start streaming a message
    const messageText = "Test streaming message";
    await sessionsStore.sendMessage("session-1", messageText);

    // API should be called correctly
    expect(ApiService.post).toHaveBeenCalledWith("/api/chat", {
      message: messageText,
      sessionId: "session-1",
    });

    // After successful post, streaming should be initiated
    expect(ApiService.stream).toHaveBeenCalled();

    // Store should be in streaming state
    expect(sessionsStore.isStreaming).toBe(true);

    // Store should add a message placeholder for the assistant's response
    expect(sessionsStore.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-1",
        role: "assistant",
        content: "", // Empty content initially
      }),
    );
  });

  it("processes streaming chunks correctly", async () => {
    // Start streaming a message
    await sessionsStore.sendMessage("session-1", "Test streaming message");

    // Simulate streaming chunks arriving
    mockEventSource.emit("message", {
      chunk: "Hello",
      messageId: "assistant-msg-1",
    });
    await flushPromises();

    // First chunk should update the message
    expect(sessionsStore.updateMessage).toHaveBeenCalledWith(
      expect.any(String), // message ID
      expect.objectContaining({
        content: "Hello",
      }),
    );

    // Send more chunks
    mockEventSource.emit("message", {
      chunk: " world",
      messageId: "assistant-msg-1",
    });
    await flushPromises();

    // Content should accumulate
    expect(sessionsStore.updateMessage).toHaveBeenCalledWith(
      expect.any(String), // message ID
      expect.objectContaining({
        content: "Hello world",
      }),
    );

    // Send final chunk with done flag
    mockEventSource.emit("message", {
      chunk: "!",
      messageId: "assistant-msg-1",
      done: true,
    });
    await flushPromises();

    // Streaming should be complete
    expect(sessionsStore.isStreaming).toBe(false);

    // Final content should be updated
    expect(sessionsStore.updateMessage).toHaveBeenCalledWith(
      expect.any(String), // message ID
      expect.objectContaining({
        content: "Hello world!",
        status: "complete",
      }),
    );
  });

  it("handles streaming errors correctly", async () => {
    // Start streaming a message
    await sessionsStore.sendMessage("session-1", "Test streaming message");

    // Simulate an error
    mockEventSource.emitError(new Error("Stream error"));
    await flushPromises();

    // Store should no longer be streaming
    expect(sessionsStore.isStreaming).toBe(false);

    // Error should be shown
    expect(uiStore.showError).toHaveBeenCalled();

    // Message should be marked as error
    expect(sessionsStore.updateMessage).toHaveBeenCalledWith(
      expect.any(String), // message ID
      expect.objectContaining({
        status: "error",
      }),
    );
  });

  it("handles streaming cancellation correctly", async () => {
    // Start streaming a message
    await sessionsStore.sendMessage("session-1", "Test streaming message");

    // Send a chunk
    mockEventSource.emit("message", {
      chunk: "Hello",
      messageId: "assistant-msg-1",
    });
    await flushPromises();

    // Cancel the streaming
    await sessionsStore.stopStreaming();
    await flushPromises();

    // EventSource should be closed
    expect(mockEventSource.readyState).toBe(mockEventSource.CLOSED);

    // Store should no longer be streaming
    expect(sessionsStore.isStreaming).toBe(false);

    // Message should be marked as cancelled
    expect(sessionsStore.updateMessage).toHaveBeenCalledWith(
      expect.any(String), // message ID
      expect.objectContaining({
        status: "cancelled",
      }),
    );
  });

  it("recovers from network interruptions", async () => {
    // Mock the reconnection logic
    const originalAddEventListener = window.addEventListener;
    const mockAddEventListener = vi.fn((event, handler) => {
      if (event === "online") {
        // Store the handler to trigger later
        (window as any).onlineHandler = handler;
      }
      return originalAddEventListener.call(window, event, handler);
    });
    window.addEventListener = mockAddEventListener;

    // Start streaming a message
    await sessionsStore.sendMessage("session-1", "Test streaming message");

    // Send a chunk
    mockEventSource.emit("message", {
      chunk: "Hello",
      messageId: "assistant-msg-1",
    });
    await flushPromises();

    // Simulate network error
    mockEventSource.emitError(new Error("Network error"));
    await flushPromises();

    // Store should be in error state but remember we were streaming
    expect(sessionsStore.isStreaming).toBe(false);
    expect(sessionsStore.error).toBeTruthy();

    // Message should be marked as interrupted
    expect(sessionsStore.updateMessage).toHaveBeenCalledWith(
      expect.any(String), // message ID
      expect.objectContaining({
        status: "interrupted",
      }),
    );

    // Reset mocks to track new calls
    vi.clearAllMocks();

    // Simulate network coming back online
    if ((window as any).onlineHandler) {
      (window as any).onlineHandler();
    }
    await flushPromises();

    // Reconnection should be attempted
    expect(ApiService.stream).toHaveBeenCalled();

    // Store should be streaming again
    expect(sessionsStore.isStreaming).toBe(true);

    // Continue streaming where we left off
    const newMockEventSource = new MockEventSource("reconnected-url");
    ApiService.stream.mockReturnValue(newMockEventSource);

    // Send more chunks on the new connection
    newMockEventSource.emit("message", {
      chunk: " world!",
      messageId: "assistant-msg-1",
      done: true,
    });
    await flushPromises();

    // Final message should include all chunks
    expect(sessionsStore.updateMessage).toHaveBeenCalledWith(
      expect.any(String), // message ID
      expect.objectContaining({
        content: expect.stringContaining("world"),
        status: "complete",
      }),
    );

    // Restore original addEventListener
    window.addEventListener = originalAddEventListener;
  });

  it("handles special tokens in streaming content", async () => {
    // Start streaming a message
    await sessionsStore.sendMessage("session-1", "Test streaming message");

    // Simulate some markdown content with code blocks and formatting
    const chunks = [
      "Here's a code example:",
      "\n```python",
      "\ndef hello_world():",
      "\n    print('Hello, world!')",
      "\n```",
      "\n\nAnd some **bold** text with [a link](https://example.com).",
    ];

    // Send each chunk
    for (const chunk of chunks) {
      mockEventSource.emit("message", {
        chunk,
        messageId: "assistant-msg-1",
      });
      await flushPromises();
    }

    // Send final chunk with done flag
    mockEventSource.emit("message", {
      chunk: "\n\nThat's all!",
      messageId: "assistant-msg-1",
      done: true,
    });
    await flushPromises();

    // Check the final message content
    expect(sessionsStore.updateMessage).toHaveBeenCalledWith(
      expect.any(String), // message ID
      expect.objectContaining({
        content: expect.stringContaining("```python"),
        content: expect.stringContaining("Hello, world!"),
        content: expect.stringContaining("**bold**"),
        status: "complete",
      }),
    );
  });

  it("handles streaming with large datasets", async () => {
    // Start streaming a message
    await sessionsStore.sendMessage("session-1", "Test streaming message");

    // Generate a large response (simulating a large table or dataset)
    let largeContent = "Here's a large dataset:\n\n";
    for (let i = 0; i < 50; i++) {
      largeContent += `| Row ${i} | Value ${i * 10} | Data ${i * 100} |\n`;
    }

    // Split into smaller chunks (simulating how streaming would break it up)
    const chunkSize = 200;
    const chunks = [];
    for (let i = 0; i < largeContent.length; i += chunkSize) {
      chunks.push(largeContent.substring(i, i + chunkSize));
    }

    // Send chunks with slight delays to simulate realistic streaming
    for (const chunk of chunks) {
      mockEventSource.emit("message", {
        chunk,
        messageId: "assistant-msg-1",
      });
      await new Promise((r) => setTimeout(r, 5)); // Small delay
      await flushPromises();
    }

    // Send final chunk with done flag
    mockEventSource.emit("message", {
      chunk: "\n\nEnd of dataset",
      messageId: "assistant-msg-1",
      done: true,
    });
    await flushPromises();

    // Verify the message was updated with the complete content
    const lastCall = sessionsStore.updateMessage.mock.calls.pop();
    expect(lastCall[1].content).toContain("Here's a large dataset");
    expect(lastCall[1].content).toContain("End of dataset");
    expect(lastCall[1].status).toBe("complete");

    // Content should contain all rows
    expect(lastCall[1].content).toContain("Row 0");
    expect(lastCall[1].content).toContain("Row 49"); // Last row
  });
});
