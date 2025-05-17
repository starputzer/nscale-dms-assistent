import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import MessageItem from "@/components/chat/MessageItem.vue";
import { useUIStore } from "@/stores/ui";

// Mock dependencies
vi.mock("@/utils/messageFormatter", () => ({
  highlightCode: vi.fn((content) => content),
  linkifySourceReferences: vi.fn((content) => content),
}));

vi.mock("@/stores/ui", () => ({
  useUIStore: vi.fn(() => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  })),
}));

vi.mock("marked", () => ({
  marked: vi.fn((text) => {
    // Simple markdown conversion for testing
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
  }),
  setOptions: vi.fn(),
}));

vi.mock("dompurify", () => ({
  default: {
    sanitize: vi.fn((content) => content),
  },
}));

// Default test message
const createTestMessage = (overrides = {}) => ({
  id: "msg1",
  role: "user",
  content: "Test message content",
  timestamp: new Date("2023-01-01T12:00:00.000Z").toISOString(),
  status: "success",
  isStreaming: false,
  metadata: {
    sourceReferences: [],
  },
  ...overrides,
});

// Helper to create wrapper with default props
const createWrapper = (props = {}) => {
  return mount(MessageItem, {
    props: {
      message: createTestMessage(),
      showActions: true,
      showReferences: false,
      highlightCodeBlocks: true,
      formatLinks: true,
      timeFormat: "short",
      ...props,
    },
  });
};

describe("MessageItem.vue", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Mock Element.scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();

    // Mock global methods used in the component
    global.confirm = vi.fn(() => true);
  });

  // Rendering Tests
  describe("Rendering", () => {
    it("renders the message content correctly", () => {
      const message = createTestMessage({
        content: "Hello world",
      });

      const wrapper = createWrapper({ message });

      expect(wrapper.find(".n-message-item__text").exists()).toBe(true);
      expect(wrapper.html()).toContain("Hello world");
    });

    it("applies correct classes based on message role", () => {
      const userMessage = createWrapper({
        message: createTestMessage({ role: "user" }),
      });

      const assistantMessage = createWrapper({
        message: createTestMessage({ role: "assistant" }),
      });

      const systemMessage = createWrapper({
        message: createTestMessage({ role: "system" }),
      });

      expect(userMessage.find(".n-message-item--user").exists()).toBe(true);
      expect(assistantMessage.find(".n-message-item--assistant").exists()).toBe(
        true,
      );
      expect(systemMessage.find(".n-message-item--system").exists()).toBe(true);
    });

    it("displays appropriate role labels", () => {
      const wrapper = createWrapper({
        message: createTestMessage({ role: "user" }),
      });

      expect(wrapper.find(".n-message-item__role").text()).toBe("Sie");

      const assistantWrapper = createWrapper({
        message: createTestMessage({ role: "assistant" }),
      });

      expect(assistantWrapper.find(".n-message-item__role").text()).toBe(
        "Assistent",
      );
    });

    it("formats timestamp correctly", () => {
      const timestamp = new Date("2023-01-01T12:00:00.000Z").toISOString();
      const wrapper = createWrapper({
        message: createTestMessage({ timestamp }),
      });

      expect(wrapper.find(".n-message-item__time").exists()).toBe(true);

      // Test different time formats
      const mediumWrapper = createWrapper({
        message: createTestMessage({ timestamp }),
        timeFormat: "medium",
      });

      expect(mediumWrapper.find(".n-message-item__time").text()).toContain(
        "12:00",
      );
    });

    it("displays error state correctly", () => {
      const wrapper = createWrapper({
        message: createTestMessage({ status: "error" }),
      });

      expect(wrapper.find(".n-message-item--error").exists()).toBe(true);
      expect(wrapper.find(".n-message-item__status--error").exists()).toBe(
        true,
      );
      expect(wrapper.text()).toContain("Fehler");
    });

    it("renders action buttons for assistant messages when showActions is true", () => {
      const wrapper = createWrapper({
        message: createTestMessage({ role: "assistant" }),
        showActions: true,
      });

      expect(wrapper.find(".n-message-item__actions").exists()).toBe(true);
      expect(wrapper.find(".n-message-item__feedback").exists()).toBe(true);
      expect(
        wrapper.findAll(".n-message-item__action-btn").length,
      ).toBeGreaterThan(0);
    });

    it("does not show actions when showActions is false", () => {
      const wrapper = createWrapper({
        message: createTestMessage({ role: "assistant" }),
        showActions: false,
      });

      expect(wrapper.find(".n-message-item__actions").exists()).toBe(false);
    });

    it("renders source references when available and showReferences is true", async () => {
      const wrapper = createWrapper({
        message: createTestMessage({
          role: "assistant",
          metadata: {
            sourceReferences: [
              { id: "src1", title: "Source 1", content: "Reference content 1" },
              { id: "src2", title: "Source 2", content: "Reference content 2" },
            ],
          },
        }),
        showReferences: true,
      });

      expect(wrapper.find(".n-message-item__references").exists()).toBe(true);
      expect(wrapper.findAll(".n-message-item__reference").length).toBe(2);
      expect(wrapper.text()).toContain("Source 1");
      expect(wrapper.text()).toContain("Source 2");
    });

    it("does not show references when showReferences is false", () => {
      const wrapper = createWrapper({
        message: createTestMessage({
          metadata: {
            sourceReferences: [
              { id: "src1", title: "Source 1", content: "Content" },
            ],
          },
        }),
        showReferences: false,
      });

      expect(wrapper.find(".n-message-item__references").exists()).toBe(false);
    });

    it("renders streaming indicator when isStreaming is true", () => {
      const wrapper = createWrapper({
        message: createTestMessage({ isStreaming: true }),
      });

      expect(wrapper.find(".n-message-item--streaming").exists()).toBe(true);
    });
  });

  // Event Tests
  describe("Events", () => {
    it("emits feedback event when feedback buttons are clicked", async () => {
      const wrapper = createWrapper({
        message: createTestMessage({ role: "assistant" }),
      });

      // Find and click positive feedback button
      const positiveFeedbackBtn = wrapper.find(
        '.n-message-item__feedback-btn[title="Positives Feedback"]',
      );
      await positiveFeedbackBtn.trigger("click");

      // Check if feedback event was emitted with correct payload
      expect(wrapper.emitted("feedback")).toBeTruthy();
      expect(wrapper.emitted("feedback")?.[0][0]).toEqual({
        messageId: "msg1",
        type: "positive",
      });

      // Verify success message was shown
      expect(useUIStore().showSuccess).toHaveBeenCalled();
    });

    it("emits view-sources event when sources button is clicked", async () => {
      const wrapper = createWrapper({
        message: createTestMessage({
          role: "assistant",
          content: "Message with [[src:1]] reference",
        }),
      });

      // Find and click sources button
      const sourcesBtn = wrapper.find('button[title="Quellen anzeigen"]');
      await sourcesBtn.trigger("click");

      // Check if view-sources event was emitted with correct payload
      expect(wrapper.emitted("view-sources")).toBeTruthy();
      expect(wrapper.emitted("view-sources")?.[0][0]).toEqual({
        messageId: "msg1",
      });
    });

    it("emits view-explanation event when explanation button is clicked", async () => {
      const wrapper = createWrapper({
        message: createTestMessage({ role: "assistant" }),
      });

      // Find and click explanation button
      const explainBtn = wrapper.find('button[title="Antwort erklären"]');
      await explainBtn.trigger("click");

      // Check if view-explanation event was emitted with correct payload
      expect(wrapper.emitted("view-explanation")).toBeTruthy();
      expect(wrapper.emitted("view-explanation")?.[0][0]).toEqual({
        messageId: "msg1",
      });
    });

    it("emits retry event when retry button is clicked", async () => {
      const wrapper = createWrapper({
        message: createTestMessage({
          role: "assistant",
          status: "error",
        }),
      });

      // Find and click retry button
      const retryBtn = wrapper.find('button[title="Erneut versuchen"]');
      await retryBtn.trigger("click");

      // Check if retry event was emitted with correct payload
      expect(wrapper.emitted("retry")).toBeTruthy();
      expect(wrapper.emitted("retry")?.[0][0]).toEqual({
        messageId: "msg1",
      });
    });

    it("emits delete event when delete confirmed", async () => {
      // Mock confirm to return true (user confirmed)
      window.confirm = vi.fn(() => true);

      const wrapper = createWrapper({
        message: createTestMessage({ role: "assistant" }),
      });

      // Find and click delete button
      const deleteBtn = wrapper.find('button[title="Nachricht löschen"]');
      await deleteBtn.trigger("click");

      // Check if confirmation was requested
      expect(window.confirm).toHaveBeenCalled();

      // Check if delete event was emitted with correct payload
      expect(wrapper.emitted("delete")).toBeTruthy();
      expect(wrapper.emitted("delete")?.[0][0]).toEqual({
        messageId: "msg1",
      });
    });

    it("does not emit delete event when delete canceled", async () => {
      // Mock confirm to return false (user canceled)
      window.confirm = vi.fn(() => false);

      const wrapper = createWrapper({
        message: createTestMessage({ role: "assistant" }),
      });

      // Find and click delete button
      const deleteBtn = wrapper.find('button[title="Nachricht löschen"]');
      await deleteBtn.trigger("click");

      // Check if confirmation was requested
      expect(window.confirm).toHaveBeenCalled();

      // Check that delete event was not emitted
      expect(wrapper.emitted("delete")).toBeFalsy();
    });
  });

  // Content Formatting Tests
  describe("Content Formatting", () => {
    it("formats and sanitizes markdown content", async () => {
      // Create message with markdown content
      const markdownContent = "**Bold text** and [Link](https://example.com)";
      const wrapper = createWrapper({
        message: createTestMessage({ content: markdownContent }),
      });

      await flushPromises();

      // Check if marked and DOMPurify were called
      expect(wrapper.vm.formattedContent).toBeDefined();
    });

    it("truncates long source reference content", () => {
      const longContent = "A".repeat(200);
      const wrapper = createWrapper({
        message: createTestMessage({
          metadata: {
            sourceReferences: [
              { id: "src1", title: "Source", content: longContent },
            ],
          },
        }),
        showReferences: true,
      });

      // Call the method directly to test
      const result = wrapper.vm.truncateContent(longContent, 150);
      expect(result.length).toBe(153); // 150 chars + '...'
      expect(result.endsWith("...")).toBe(true);
    });

    it("detects source references in content", () => {
      const wrapper = createWrapper({
        message: createTestMessage({
          content: "This content has a [[src:123]] reference",
        }),
      });

      // Check if hasSourceReferences computed property works
      expect(wrapper.vm.hasSourceReferences).toBe(true);

      // Test without references
      const noRefsWrapper = createWrapper({
        message: createTestMessage({
          content: "This content has no references",
        }),
      });

      expect(noRefsWrapper.vm.hasSourceReferences).toBe(false);
    });
  });

  // Lifecycle Tests
  describe("Lifecycle", () => {
    it("applies code highlighting on mount", async () => {
      // Create spy on the method
      const applyCodeHighlightingSpy = vi.fn();

      const wrapper = createWrapper({
        message: createTestMessage({
          content: "```javascript\nconst x = 1;\n```",
        }),
      });

      // Replace method with spy
      wrapper.vm.applyCodeHighlighting = applyCodeHighlightingSpy;

      // Mock nextTick to call our spy directly
      vi.spyOn(window, "nextTick").mockImplementationOnce((callback) => {
        if (callback) callback();
        return Promise.resolve();
      });

      // Call onMounted hook manually
      await wrapper.vm.$options.mounted?.call(wrapper.vm);

      await flushPromises();

      // Check if applyCodeHighlighting was called
      expect(applyCodeHighlightingSpy).toHaveBeenCalled();
    });

    it("reapplies code highlighting when content changes", async () => {
      const wrapper = createWrapper();

      // Create spy on the method
      const applyCodeHighlightingSpy = vi.fn();
      wrapper.vm.applyCodeHighlighting = applyCodeHighlightingSpy;

      // Update message content
      await wrapper.setProps({
        message: createTestMessage({
          content: "Updated content with ```code```",
        }),
      });

      // Mock nextTick to call our spy directly
      vi.spyOn(window, "nextTick").mockImplementationOnce((callback) => {
        if (callback) callback();
        return Promise.resolve();
      });

      // Trigger watch handler manually
      const watchHandler = wrapper.vm.$options.watch?.["message.content"];
      await watchHandler?.call(wrapper.vm);

      await flushPromises();

      // Check if applyCodeHighlighting was called
      expect(applyCodeHighlightingSpy).toHaveBeenCalled();
    });
  });

  // Accessibility Tests
  describe("Accessibility", () => {
    it("uses proper ARIA roles and attributes", () => {
      const wrapper = createWrapper();

      // Check ARIA attributes on error message
      const errorWrapper = createWrapper({
        message: createTestMessage({ status: "error" }),
      });

      expect(errorWrapper.find('[role="alert"]').exists()).toBe(true);
    });

    it("has accessible action buttons", () => {
      const wrapper = createWrapper({
        message: createTestMessage({ role: "assistant" }),
      });

      // Check aria-label on buttons
      const buttons = wrapper.findAll("button");

      buttons.forEach((button) => {
        expect(button.attributes("aria-label")).toBeDefined();
      });
    });
  });

  // Edge Cases
  describe("Edge Cases", () => {
    it("handles missing timestamp gracefully", () => {
      const wrapper = createWrapper({
        message: createTestMessage({ timestamp: undefined }),
      });

      // Should not show timestamp
      expect(wrapper.find(".n-message-item__time").exists()).toBe(false);
    });

    it("handles empty content gracefully", () => {
      const wrapper = createWrapper({
        message: createTestMessage({ content: "" }),
      });

      // Should still render properly without content
      expect(wrapper.find(".n-message-item").exists()).toBe(true);
      expect(wrapper.find(".n-message-item__text").exists()).toBe(true);
    });

    it("handles invalid timestamp format", () => {
      // Mock console.error to prevent test output noise
      const originalConsoleError = console.error;
      console.error = vi.fn();

      const wrapper = createWrapper({
        message: createTestMessage({ timestamp: "invalid-date" }),
      });

      // Method should catch the error
      const result = wrapper.vm.formatTimestamp("invalid-date");
      expect(result).toBe("");
      expect(console.error).toHaveBeenCalled();

      // Restore console.error
      console.error = originalConsoleError;
    });
  });
});
