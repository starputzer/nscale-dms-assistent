import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import MessageList from "@/components/chat/MessageList.vue";
import MessageItem from "@/components/chat/MessageItem.vue";
import type { ChatMessage } from "@/types/session";

// Mock dependencies
vi.mock("@/composables/useElementSize", () => ({
  useElementSize: () => ({
    width: vi.ref(800),
    height: vi.ref(600),
  }),
}));

vi.mock("@/composables/useThrottleFn", () => ({
  useThrottleFn: (fn: Function) => fn,
}));

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

// Sample messages for testing
const sampleMessages: ChatMessage[] = [
  {
    id: "msg1",
    role: "user",
    content: "Hello, how can you help me with nscale?",
    timestamp: new Date().toISOString(),
  },
  {
    id: "msg2",
    role: "assistant",
    content:
      "I can help you with various nscale features. What would you like to know?",
    timestamp: new Date().toISOString(),
  },
  {
    id: "msg3",
    role: "user",
    content: "How do I configure document storage?",
    timestamp: new Date().toISOString(),
  },
];

// Helper to create wrapper with default props
const createWrapper = (props = {}) => {
  return mount(MessageList, {
    props: {
      messages: [],
      ...props,
    },
    global: {
      stubs: {
        MessageItem: true,
      },
    },
  });
};

describe("MessageList.vue", () => {
  // Setup mocks
  beforeEach(() => {
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();

    // Mock ResizeObserver
    global.ResizeObserver = ResizeObserverMock as any;

    // Mock window.setTimeout
    vi.spyOn(window, "setTimeout");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Rendering Tests
  describe("Rendering", () => {
    it("renders the message list container correctly", () => {
      const wrapper = createWrapper();

      expect(wrapper.find(".n-message-list").exists()).toBe(true);
    });

    it("renders loading state when isLoading is true", () => {
      const wrapper = createWrapper({
        isLoading: true,
      });

      expect(wrapper.find(".n-message-list--loading").exists()).toBe(true);
      expect(wrapper.find(".n-message-list__loading").exists()).toBe(true);
      expect(wrapper.find(".n-message-list__spinner").exists()).toBe(true);
      expect(wrapper.text()).toContain("Lade Unterhaltung");
    });

    it("renders welcome screen when no messages and not loading", () => {
      const wrapper = createWrapper({
        messages: [],
        welcomeTitle: "Test Welcome Title",
        welcomeMessage: "Test Welcome Message",
      });

      expect(wrapper.find(".n-message-list--empty").exists()).toBe(true);
      expect(wrapper.find(".n-message-list__welcome").exists()).toBe(true);
      expect(wrapper.find("#welcome-title").text()).toBe("Test Welcome Title");
      expect(wrapper.find("#welcome-message").text()).toBe(
        "Test Welcome Message",
      );
    });

    it("renders typing indicator when isStreaming is true", async () => {
      const wrapper = createWrapper({
        messages: sampleMessages,
        isStreaming: true,
      });

      expect(wrapper.find(".n-message-list__typing-indicator").exists()).toBe(
        true,
      );
      expect(wrapper.find(".n-message-list__typing-dots").exists()).toBe(true);
    });

    it("renders scroll-to-bottom button when not at bottom", async () => {
      const wrapper = createWrapper({
        messages: sampleMessages,
        showScrollToBottomButton: true,
      });

      // Set isAtBottom to false
      await wrapper.setData({ isAtBottom: false });

      expect(wrapper.find(".n-message-list__scroll-button").exists()).toBe(
        true,
      );
    });

    it("does not render scroll-to-bottom button when at bottom", async () => {
      const wrapper = createWrapper({
        messages: sampleMessages,
        showScrollToBottomButton: true,
      });

      // By default isAtBottom is true
      expect(wrapper.find(".n-message-list__scroll-button").exists()).toBe(
        false,
      );
    });
  });

  // Message Rendering Tests
  describe("Message Rendering", () => {
    it("renders message items for each message", async () => {
      const wrapper = createWrapper({
        messages: sampleMessages,
      });

      // Wait for virtual list to be updated
      await flushPromises();

      // Find message components (stubs)
      const messageItems = wrapper.findAllComponents(MessageItem);
      expect(messageItems.length).toBe(sampleMessages.length);
    });

    it("passes correct props to MessageItem components", async () => {
      const wrapper = mount(MessageList, {
        props: {
          messages: sampleMessages,
          showMessageActions: true,
        },
      });

      await flushPromises();

      const messageItems = wrapper.findAllComponents(MessageItem);

      // Check first message props
      expect(messageItems[0].props("message")).toEqual(sampleMessages[0]);
      expect(messageItems[0].props("showActions")).toBe(true);
    });

    it('renders "load more" buttons when hasMoreMessages flags are true', async () => {
      const wrapper = createWrapper({
        messages: sampleMessages,
        virtualized: true,
      });

      // Set pagination states
      await wrapper.setData({
        hasMoreMessagesUp: true,
        hasMoreMessagesDown: true,
        isVirtualized: true,
      });

      const loadMoreButtons = wrapper.findAll(".n-message-list__load-more");
      expect(loadMoreButtons.length).toBe(2);
      expect(loadMoreButtons[0].text()).toContain("Ältere Nachrichten laden");
      expect(loadMoreButtons[1].text()).toContain("Neuere Nachrichten laden");
    });
  });

  // Virtualization Tests
  describe("Virtualization", () => {
    it("uses virtualization when virtualized prop is true and messages > 20", async () => {
      // Create an array of 25 messages
      const manyMessages = Array.from({ length: 25 }, (_, i) => ({
        id: `msg${i}`,
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i}`,
        timestamp: new Date().toISOString(),
      }));

      const wrapper = createWrapper({
        messages: manyMessages,
        virtualized: true,
        estimatedItemHeight: 50,
      });

      await flushPromises();

      // Should have virtual container with specific style
      const virtualContainer = wrapper.find(
        ".n-message-list__virtual-container",
      );
      expect(virtualContainer.exists()).toBe(true);
      expect(virtualContainer.attributes("style")).toContain(
        "position: relative",
      );

      // By default it should show all items because we're mocking the visible range
      const messageWrappers = wrapper.findAll(
        ".n-message-list__message-wrapper",
      );
      expect(messageWrappers.length).toBe(manyMessages.length);
    });

    it("does not use virtualization when virtualized prop is false", async () => {
      const wrapper = createWrapper({
        messages: sampleMessages,
        virtualized: false,
      });

      await flushPromises();

      const virtualContainer = wrapper.find(
        ".n-message-list__virtual-container",
      );
      expect(virtualContainer.attributes("style")).toContain(
        "position: static",
      );
    });
  });

  // Event Tests
  describe("Events", () => {
    it("emits scroll event when handleScroll is called", async () => {
      const wrapper = createWrapper({
        messages: sampleMessages,
      });

      // Mock scrollContainer properties
      const scrollContainer = {
        scrollTop: 100,
        scrollHeight: 1000,
        clientHeight: 500,
      };

      // Set the ref
      // @ts-ignore - This is a test workaround
      wrapper.vm.scrollContainer = scrollContainer;

      // Trigger scroll
      // @ts-ignore - Accessing method directly for testing
      wrapper.vm.handleScroll();

      // Check emit was called with correct payload
      expect(wrapper.emitted("scroll")).toBeTruthy();
      expect(wrapper.emitted("scroll")?.[0][0]).toEqual({
        scrollTop: 100,
        scrollHeight: 1000,
        clientHeight: 500,
        isAtBottom: true,
      });
    });

    it("emits load-more event when loadMoreUp is called", async () => {
      const wrapper = createWrapper({
        messages: sampleMessages,
      });

      // Set visibleRange
      await wrapper.setData({ visibleRange: { start: 5, end: 10 } });

      // Call loadMoreUp
      // @ts-ignore - Accessing method directly for testing
      wrapper.vm.loadMoreUp();

      // Verify emit
      expect(wrapper.emitted("load-more")).toBeTruthy();
      expect(wrapper.emitted("load-more")?.[0][0]).toEqual({
        direction: "up",
        firstVisibleIndex: 5,
      });
    });

    it("emits load-more event when loadMoreDown is called", async () => {
      const wrapper = createWrapper({
        messages: sampleMessages,
      });

      // Set visibleRange
      await wrapper.setData({ visibleRange: { start: 5, end: 10 } });

      // Call loadMoreDown
      // @ts-ignore - Accessing method directly for testing
      wrapper.vm.loadMoreDown();

      // Verify emit
      expect(wrapper.emitted("load-more")).toBeTruthy();
      expect(wrapper.emitted("load-more")?.[0][0]).toEqual({
        direction: "down",
        lastVisibleIndex: 10,
      });
    });

    it("forwards MessageItem events properly", async () => {
      const wrapper = mount(MessageList, {
        props: {
          messages: sampleMessages,
        },
      });

      await flushPromises();

      const firstMessageItem = wrapper.findComponent(MessageItem);

      // Trigger events on MessageItem
      firstMessageItem.vm.$emit("feedback", {
        messageId: "msg1",
        type: "positive",
      });
      firstMessageItem.vm.$emit("view-sources", { messageId: "msg1" });
      firstMessageItem.vm.$emit("retry", { messageId: "msg1" });
      firstMessageItem.vm.$emit("delete", { messageId: "msg1" });

      // Check if events were forwarded
      expect(wrapper.emitted("feedback")).toBeTruthy();
      expect(wrapper.emitted("view-sources")).toBeTruthy();
      expect(wrapper.emitted("retry")).toBeTruthy();
      expect(wrapper.emitted("delete")).toBeTruthy();

      // Check event payload was forwarded correctly
      expect(wrapper.emitted("feedback")?.[0][0]).toEqual({
        messageId: "msg1",
        type: "positive",
      });
    });
  });

  // Method Tests
  describe("Methods", () => {
    it("scrollToBottom calls scrollIntoView with correct parameters", async () => {
      const wrapper = createWrapper();

      // Mock the scrollAnchor ref
      const mockScrollAnchor = { scrollIntoView: vi.fn() };
      // @ts-ignore - This is a test setting a ref directly
      wrapper.vm.scrollAnchor = mockScrollAnchor;

      // Call scrollToBottom
      // @ts-ignore - Accessing exposed method
      wrapper.vm.scrollToBottom("smooth");

      await flushPromises();

      // Check if scrollIntoView was called with correct parameters
      expect(mockScrollAnchor.scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "end",
      });
    });

    it("scrollToMessage calls document.querySelector and scrollIntoView", async () => {
      const wrapper = createWrapper();

      // Mock document.querySelector
      const mockElement = { scrollIntoView: vi.fn() };
      const querySelectorSpy = vi
        .spyOn(document, "querySelector")
        .mockReturnValue(mockElement as any);

      // Call scrollToMessage
      // @ts-ignore - Accessing exposed method
      wrapper.vm.scrollToMessage("test-id", "smooth");

      // Check if querySelector was called with correct selector
      expect(querySelectorSpy).toHaveBeenCalledWith(
        '[data-message-id="test-id"]',
      );

      // Check if scrollIntoView was called with correct parameters
      expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "center",
      });
    });

    it("updates visible range when updateVisibleRange is called", async () => {
      const wrapper = createWrapper({
        messages: sampleMessages,
        virtualized: true,
      });

      // Setup scroll container mock
      const scrollContainerMock = {
        scrollTop: 100,
        clientHeight: 500,
      };
      // @ts-ignore - Setting ref directly for test
      wrapper.vm.scrollContainer = scrollContainerMock;

      // Setup item positions mock
      const itemPositionsMock = new Map();
      sampleMessages.forEach((msg, index) => {
        itemPositionsMock.set(msg.id, {
          top: index * 100,
          height: 100,
        });
      });

      // Set the ref
      await wrapper.setData({
        itemPositions: itemPositionsMock,
        isVirtualized: true,
      });

      // Call updateVisibleRange
      // @ts-ignore - Calling internal method
      wrapper.vm.updateVisibleRange();

      // Check if visibleRange was updated
      expect(wrapper.vm.visibleRange).toBeDefined();

      // Since messages 1 and 2 would be visible based on our mock values
      // (scrollTop 100, clientHeight 500, items at 0, 100, 200 with height 100)
      expect(wrapper.vm.visibleRange.start).toBeLessThanOrEqual(2);
    });
  });

  // Watchers Tests
  describe("Watchers", () => {
    it("calls scrollToBottom when isStreaming becomes true", async () => {
      const wrapper = createWrapper();

      // Spy on scrollToBottom method
      const scrollToBottomSpy = vi.spyOn(wrapper.vm, "scrollToBottom");

      // Update isStreaming prop
      await wrapper.setProps({ isStreaming: true });

      // Check if scrollToBottom was called
      expect(scrollToBottomSpy).toHaveBeenCalled();
    });

    it("calls scrollToBottom when messages change and user is at bottom", async () => {
      const wrapper = createWrapper();

      // Set isAtBottom to true
      await wrapper.setData({ isAtBottom: true });

      // Spy on scrollToBottom method
      const scrollToBottomSpy = vi.spyOn(wrapper.vm, "scrollToBottom");

      // Update messages prop
      await wrapper.setProps({ messages: sampleMessages });

      // Check if scrollToBottom was called
      expect(scrollToBottomSpy).toHaveBeenCalled();
    });

    it("updates virtual items when messages change", async () => {
      const wrapper = createWrapper();

      // Spy on updateVirtualItems method
      const updateVirtualItemsSpy = vi.spyOn(wrapper.vm, "updateVirtualItems");

      // Update messages prop
      await wrapper.setProps({ messages: sampleMessages });

      // Check if updateVirtualItems was called
      expect(updateVirtualItemsSpy).toHaveBeenCalled();
    });
  });

  // Lifecycle Tests
  describe("Lifecycle", () => {
    it("calls scrollToBottom on mount", async () => {
      // Spy on scrollToBottom
      const scrollToBottomSpy = vi.fn();

      // Mock nextTick to call our spy directly
      vi.spyOn(window, "nextTick").mockImplementationOnce((callback) => {
        if (callback) callback();
        return Promise.resolve();
      });

      // Create component with mocked method
      const wrapper = mount(MessageList, {
        props: {
          messages: [],
        },
        global: {
          stubs: {
            MessageItem: true,
          },
        },
      });

      // Replace scrollToBottom with our spy
      // @ts-ignore - Setting method for testing
      wrapper.vm.scrollToBottom = scrollToBottomSpy;

      // Wait for component to mount and nextTick to be called
      await flushPromises();

      // Check if scrollToBottom was called with 'auto'
      expect(scrollToBottomSpy).toHaveBeenCalledWith("auto");
    });

    it("disconnects ResizeObserver on unmount", async () => {
      const wrapper = createWrapper();

      // Create and set a ResizeObserver mock
      const resizeObserverMock = new ResizeObserverMock();
      // @ts-ignore - Setting ref directly for test
      wrapper.vm.resizeObserver = resizeObserverMock;

      // Unmount component
      wrapper.unmount();

      // Check if disconnect was called
      expect(resizeObserverMock.disconnect).toHaveBeenCalled();
    });
  });

  // Accessibility Tests
  describe("Accessibility", () => {
    it("has appropriate ARIA attributes", () => {
      const wrapper = createWrapper({
        isLoading: true,
      });

      const container = wrapper.find(".n-message-list");
      expect(container.attributes("aria-busy")).toBe("true");
      expect(container.attributes("aria-live")).toBe("off");
    });

    it("has appropriate ARIA attributes when not loading", () => {
      const wrapper = createWrapper({
        isLoading: false,
        messages: sampleMessages,
      });

      const container = wrapper.find(".n-message-list");
      expect(container.attributes("aria-busy")).toBe("false");
      expect(container.attributes("aria-live")).toBe("polite");

      const messagesContainer = wrapper.find(".n-message-list__messages");
      expect(messagesContainer.attributes("role")).toBe("log");
      expect(messagesContainer.attributes("aria-live")).toBe("polite");
    });

    it("has appropriate ARIA attributes for loading state", () => {
      const wrapper = createWrapper({
        isLoading: true,
      });

      const loadingElement = wrapper.find(".n-message-list__loading");
      expect(loadingElement.attributes("aria-label")).toBe(
        "Nachrichten werden geladen",
      );
    });

    it("has appropriate ARIA attributes for scroll-to-bottom button", async () => {
      const wrapper = createWrapper({
        messages: sampleMessages,
        showScrollToBottomButton: true,
      });

      // Set isAtBottom to false to show the button
      await wrapper.setData({ isAtBottom: false });

      const scrollButton = wrapper.find(".n-message-list__scroll-button");
      expect(scrollButton.attributes("aria-label")).toBe(
        "Zum Ende der Unterhaltung scrollen",
      );
    });
  });
});
