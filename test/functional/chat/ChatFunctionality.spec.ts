/**
 * Comprehensive functional tests for the Chat interface.
 * These tests verify the core chat functionality including:
 * - Message sending and receiving
 * - Streaming behavior
 * - Error handling
 * - Session management
 * - UI state transitions
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import ChatContainer from "@/components/chat/ChatContainer.vue";
import { useSessionsStore } from "@/stores/sessions";
import { useUIStore } from "@/stores/ui";
import { flushPromises as flush } from "../../setup";

// Mock components to focus on functional testing rather than child component details
vi.mock("@/components/chat/MessageList.vue", () => ({
  default: {
    name: "MessageList",
    template: '<div class="message-list-mock" data-testid="message-list"></div>',
    props: [
      "messages",
      "isLoading",
      "isStreaming",
      "welcomeTitle",
      "welcomeMessage",
      "logoUrl",
      "virtualized",
      "showMessageActions",
    ],
  },
}));

vi.mock("@/components/chat/MessageInput.vue", () => ({
  default: {
    name: "MessageInput",
    template: '<div class="message-input-mock" data-testid="message-input"></div>',
    props: [
      "modelValue",
      "disabled",
      "isLoading",
      "isStreaming",
      "isEditing",
      "error",
      "placeholder",
      "draft",
      "showTemplates",
      "templates",
    ],
    emits: ["update:modelValue", "send", "cancel"],
  },
}));

// Mock event source for streaming tests
class MockEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readyState: number = 0;
  url: string;
  
  constructor(url: string) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    
    // Auto-connect on creation
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 10);
  }
  
  close() {
    this.readyState = 2; // CLOSED
  }
  
  // Test helper method to simulate incoming messages
  mockMessage(data: any) {
    if (this.onmessage) {
      const messageEvent = new MessageEvent("message", {
        data: typeof data === "string" ? data : JSON.stringify(data),
      });
      this.onmessage(messageEvent);
    }
  }
  
  // Test helper to simulate errors
  mockError() {
    if (this.onerror) {
      this.onerror(new Event("error"));
    }
  }
}

// Replace global EventSource with our mock
global.EventSource = MockEventSource as any;

// Mock API service
vi.mock("@/services/api/ApiService", () => ({
  ApiService: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock data for tests
const mockSessions = [
  {
    id: "session-1",
    title: "Test Session 1",
    updatedAt: new Date().toISOString(),
    isArchived: false,
  },
  {
    id: "session-2",
    title: "Test Session 2",
    updatedAt: new Date().toISOString(),
    isArchived: false,
  },
  {
    id: "session-3",
    title: "Archived Session",
    updatedAt: new Date().toISOString(),
    isArchived: true,
  },
];

const mockMessages = {
  "session-1": [
    {
      id: "msg1",
      sessionId: "session-1",
      content: "Hello",
      role: "user",
      timestamp: new Date().toISOString(),
    },
    {
      id: "msg2",
      sessionId: "session-1",
      content: "Hi there",
      role: "assistant",
      timestamp: new Date().toISOString(),
    },
  ],
  "session-2": [
    {
      id: "msg3",
      sessionId: "session-2",
      content: "How does this work?",
      role: "user",
      timestamp: new Date().toISOString(),
    },
    {
      id: "msg4",
      sessionId: "session-2",
      content: "It works like this...",
      role: "assistant",
      timestamp: new Date().toISOString(),
    },
  ],
  "session-3": [
    {
      id: "msg5",
      sessionId: "session-3",
      content: "This is an archived chat",
      role: "user",
      timestamp: new Date().toISOString(),
    },
  ],
};

describe("Chat Functionality - Comprehensive", () => {
  let wrapper;
  let sessionsStore;
  let uiStore;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock for window.confirm and window.prompt
    global.confirm = vi.fn().mockReturnValue(true);
    global.prompt = vi.fn().mockReturnValue("New Session Title");
    
    // Mount with testing pinia
    wrapper = mount(ChatContainer, {
      props: {
        sessionId: "session-1",
        welcomeTitle: "Welcome to Chat",
        welcomeMessage: "How can I help you?",
        showMessageActions: true,
        canRenameSession: true,
        canExportSession: true,
        canArchiveSession: true,
        canClearSession: true,
      },
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              sessions: {
                sessions: mockSessions,
                currentSession: mockSessions[0],
                messages: mockMessages,
                isLoading: false,
                isStreaming: false,
                error: null,
              },
              ui: {
                isMobile: false,
                theme: "light",
                sidebarOpen: true,
                notifications: [],
              },
            },
          }),
        ],
        stubs: {
          // Selectively use real components if needed
          // 'SomeRealComponent': false,
        },
      },
    });
    
    // Get stores
    sessionsStore = useSessionsStore();
    uiStore = useUIStore();
    
    // Mock store methods
    sessionsStore.sendMessage = vi.fn().mockResolvedValue({});
    sessionsStore.loadMessages = vi.fn().mockResolvedValue(mockMessages["session-1"]);
    sessionsStore.createSession = vi.fn().mockResolvedValue(mockSessions[0]);
    sessionsStore.toggleArchiveSession = vi.fn();
    sessionsStore.deleteMessage = vi.fn();
    sessionsStore.refreshSession = vi.fn();
    sessionsStore.updateSessionTitle = vi.fn();
    sessionsStore.setCurrentSession = vi.fn();
    sessionsStore.startStreaming = vi.fn();
    sessionsStore.stopStreaming = vi.fn();
    uiStore.showSuccess = vi.fn();
    uiStore.showError = vi.fn();
  });

  // Session management tests
  describe("Session Management", () => {
    it("renders the current session information correctly", () => {
      expect(wrapper.find(".n-chat-container__title").text()).toContain("Test Session 1");
    });

    it("handles session switching", async () => {
      // Trigger a session switch
      await wrapper.setProps({ sessionId: "session-2" });
      
      // Store should be called with new session ID
      expect(sessionsStore.setCurrentSession).toHaveBeenCalledWith("session-2");
      expect(sessionsStore.loadMessages).toHaveBeenCalled();
    });

    it("handles session renaming", async () => {
      const renameButton = wrapper.findAll(".n-chat-container__action-btn")[0];
      await renameButton.trigger("click");
      
      expect(global.prompt).toHaveBeenCalled();
      expect(sessionsStore.updateSessionTitle).toHaveBeenCalledWith("session-1", "New Session Title");
    });

    it("handles session archiving", async () => {
      const archiveButton = wrapper.findAll(".n-chat-container__action-btn")[2];
      await archiveButton.trigger("click");
      
      expect(sessionsStore.toggleArchiveSession).toHaveBeenCalledWith("session-1", true);
      expect(uiStore.showSuccess).toHaveBeenCalled();
    });

    it("handles session unarchiving", async () => {
      // Set session to archived
      await wrapper.setProps({ sessionId: "session-3" });
      sessionsStore.currentSession = mockSessions[2];
      await wrapper.vm.$nextTick();
      
      const unarchiveButton = wrapper.findAll(".n-chat-container__action-btn")[2];
      await unarchiveButton.trigger("click");
      
      expect(sessionsStore.toggleArchiveSession).toHaveBeenCalledWith("session-3", false);
    });

    it("handles session clearing", async () => {
      const clearButton = wrapper.findAll(".n-chat-container__action-btn")[3];
      await clearButton.trigger("click");
      
      expect(global.confirm).toHaveBeenCalled();
      expect(sessionsStore.deleteMessage).toHaveBeenCalledTimes(2); // For each message
      expect(sessionsStore.refreshSession).toHaveBeenCalledWith("session-1");
    });
  });

  // Message handling tests
  describe("Message Handling", () => {
    it("passes the correct messages to MessageList component", async () => {
      // Get the props passed to the MessageList component
      const messageListProps = wrapper.findComponent({ name: "MessageList" }).props();
      
      // Verify the messages array matches our mock data
      expect(messageListProps.messages).toEqual(mockMessages["session-1"]);
    });

    it("handles error states properly", async () => {
      // Set error state in the store
      sessionsStore.error = "Network error";
      await wrapper.vm.$nextTick();
      
      // Error should be propagated to the UI
      expect(wrapper.find(".error-message").exists()).toBe(true);
      expect(wrapper.find(".error-message").text()).toContain("Network error");
    });

    it("handles loading states", async () => {
      // Set loading state
      sessionsStore.isLoading = true;
      await wrapper.vm.$nextTick();
      
      // Loading indicator should be visible
      expect(wrapper.find(".loading-indicator").exists()).toBe(true);
      
      // MessageInput should be disabled
      const messageInputProps = wrapper.findComponent({ name: "MessageInput" }).props();
      expect(messageInputProps.disabled).toBe(true);
    });

    it("handles streaming states", async () => {
      // Set streaming state
      sessionsStore.isStreaming = true;
      await wrapper.vm.$nextTick();
      
      // Streaming indicator should be visible
      expect(wrapper.find(".streaming-indicator").exists()).toBe(true);
      
      // MessageInput should indicate streaming
      const messageInputProps = wrapper.findComponent({ name: "MessageInput" }).props();
      expect(messageInputProps.isStreaming).toBe(true);
    });
  });

  // Accessibility tests
  describe("Accessibility", () => {
    it("uses proper ARIA attributes for accessibility", () => {
      // Check main container
      expect(wrapper.find(".n-chat-container").attributes("role")).toBe("region");
      expect(wrapper.find(".n-chat-container").attributes("aria-labelledby")).toBeTruthy();
      
      // Check toolbar
      expect(wrapper.find(".n-chat-container__actions").attributes("role")).toBe("toolbar");
      
      // Check action buttons
      const buttons = wrapper.findAll(".n-chat-container__action-btn");
      buttons.forEach(button => {
        expect(button.attributes("aria-label")).toBeTruthy();
      });
    });
  });

  // Edge case tests
  describe("Edge Cases", () => {
    it("handles empty session correctly", async () => {
      // Create a new mock session with no messages
      sessionsStore.messages = { "empty-session": [] };
      await wrapper.setProps({ sessionId: "empty-session" });
      sessionsStore.currentSession = { id: "empty-session", title: "Empty Session", isArchived: false };
      await wrapper.vm.$nextTick();
      
      // Should show welcome message when no messages exist
      expect(wrapper.find(".welcome-message").exists()).toBe(true);
    });

    it("handles session loading failure", async () => {
      // Mock loadMessages to reject
      sessionsStore.loadMessages = vi.fn().mockRejectedValue(new Error("Failed to load messages"));
      
      // Trigger a session switch
      await wrapper.setProps({ sessionId: "session-2" });
      await flushPromises();
      
      // Error should be shown
      expect(uiStore.showError).toHaveBeenCalled();
    });

    it("prevents actions on read-only sessions", async () => {
      // Set props to disallow certain actions
      await wrapper.setProps({
        canRenameSession: false,
        canArchiveSession: false,
        canExportSession: false,
        canClearSession: false,
      });
      
      // Action buttons should not be rendered or should be disabled
      expect(wrapper.findAll(".n-chat-container__action-btn").length).toBe(0);
    });
  });

  // Event handling tests
  describe("Event Handling", () => {
    it("emits events when session changes", async () => {
      // Trigger a session action that would emit an event
      const renameButton = wrapper.findAll(".n-chat-container__action-btn")[0];
      await renameButton.trigger("click");
      
      // Check for emitted events
      expect(wrapper.emitted("session-updated")).toBeTruthy();
    });

    it("handles message send events from input component", async () => {
      // Simulate a message send event from MessageInput
      wrapper.findComponent({ name: "MessageInput" }).vm.$emit("send", "New test message");
      await flush();
      
      // Store should be called to send the message
      expect(sessionsStore.sendMessage).toHaveBeenCalledWith("session-1", "New test message");
    });

    it("handles streaming cancel events", async () => {
      // Set streaming state
      sessionsStore.isStreaming = true;
      await wrapper.vm.$nextTick();
      
      // Simulate a cancel event from MessageInput
      wrapper.findComponent({ name: "MessageInput" }).vm.$emit("cancel");
      await flush();
      
      // Store should be called to stop streaming
      expect(sessionsStore.stopStreaming).toHaveBeenCalled();
    });

    it("handles message action events", async () => {
      // Mock the callback methods
      wrapper.vm.handleMessageAction = vi.fn();
      
      // Simulate a message action event 
      wrapper.findComponent({ name: "MessageList" }).vm.$emit("message-action", { 
        messageId: "msg1", 
        action: "copy" 
      });
      
      // Handler should be called
      expect(wrapper.vm.handleMessageAction).toHaveBeenCalledWith({ 
        messageId: "msg1", 
        action: "copy" 
      });
    });
  });
});