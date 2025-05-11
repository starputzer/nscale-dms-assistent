import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ChatInput from "@/components/chat/ChatInput.vue";

// Helper to create wrapper with default props
const createWrapper = (props = {}) => {
  return mount(ChatInput, {
    props,
    attachTo: document.body, // For accurate focus testing
  });
};

describe("ChatInput.vue", () => {
  // Clean up DOM after each test
  let wrapper;

  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  // Rendering Tests
  describe("Rendering", () => {
    it("renders the component correctly with default props", () => {
      wrapper = createWrapper();

      const inputContainer = wrapper.find(".n-chat-input");
      expect(inputContainer.exists()).toBe(true);

      const textarea = wrapper.find("textarea");
      expect(textarea.exists()).toBe(true);
      expect(textarea.attributes("placeholder")).toBe(
        "Geben Sie Ihre Nachricht ein...",
      );
      expect(textarea.attributes("maxlength")).toBe("4000");

      const sendButton = wrapper.find(".n-chat-input__send-btn");
      expect(sendButton.exists()).toBe(true);
      expect(sendButton.attributes("title")).toBe("Nachricht senden (Enter)");
      expect(sendButton.attributes("disabled")).toBe(""); // Initially disabled with no text
    });

    it("renders with a custom placeholder", () => {
      wrapper = createWrapper({
        placeholder: "Type something...",
      });

      const textarea = wrapper.find("textarea");
      expect(textarea.attributes("placeholder")).toBe("Type something...");
    });

    it("renders in disabled state", () => {
      wrapper = createWrapper({
        disabled: true,
      });

      const inputContainer = wrapper.find(".n-chat-input");
      expect(inputContainer.classes()).toContain("n-chat-input--disabled");

      const textarea = wrapper.find("textarea");
      expect(textarea.attributes("disabled")).toBeDefined();

      const sendButton = wrapper.find(".n-chat-input__send-btn");
      expect(sendButton.attributes("disabled")).toBeDefined();
    });

    it("renders in loading state", () => {
      wrapper = createWrapper({
        isLoading: true,
      });

      const inputContainer = wrapper.find(".n-chat-input");
      expect(inputContainer.classes()).toContain("n-chat-input--loading");

      const textarea = wrapper.find("textarea");
      expect(textarea.attributes("disabled")).toBeDefined();

      const loadingIndicator = wrapper.find(".n-chat-input__loading-indicator");
      expect(loadingIndicator.exists()).toBe(true);

      const sendButton = wrapper.find(".n-chat-input__send-btn");
      expect(sendButton.attributes("disabled")).toBeDefined();
    });

    it("shows character count when enabled", () => {
      wrapper = createWrapper({
        modelValue: "Hello",
        maxLength: 100,
        showCharacterCount: true,
      });

      const charCount = wrapper.find(".n-chat-input__char-count");
      expect(charCount.exists()).toBe(true);
      expect(charCount.text()).toBe("5/100");
    });

    it("hides character count when disabled", () => {
      wrapper = createWrapper({
        modelValue: "Hello",
        maxLength: 100,
        showCharacterCount: false,
      });

      const charCount = wrapper.find(".n-chat-input__char-count");
      expect(charCount.exists()).toBe(false);
    });

    it("displays error message when provided", () => {
      wrapper = createWrapper({
        error: "An error occurred",
      });

      const error = wrapper.find(".n-chat-input__error");
      expect(error.exists()).toBe(true);
      expect(error.text()).toBe("An error occurred");
    });

    it("displays hint message when provided", () => {
      wrapper = createWrapper({
        hint: "Press Enter to send",
      });

      const hint = wrapper.find(".n-chat-input__hint");
      expect(hint.exists()).toBe(true);
      expect(hint.text()).toBe("Press Enter to send");
    });
  });

  // Value and Update Tests
  describe("Value and Updates", () => {
    it("sets initial value from modelValue prop", async () => {
      wrapper = createWrapper({
        modelValue: "Initial text",
      });

      const textarea = wrapper.find("textarea");
      expect(textarea.element.value).toBe("Initial text");
    });

    it("emits update:modelValue event when text changes", async () => {
      wrapper = createWrapper();

      const textarea = wrapper.find("textarea");
      await textarea.setValue("New text");

      expect(wrapper.emitted("update:modelValue")).toBeTruthy();
      expect(wrapper.emitted("update:modelValue")[0][0]).toBe("New text");
    });

    it("updates input when modelValue prop changes", async () => {
      wrapper = createWrapper({
        modelValue: "Initial text",
      });

      await wrapper.setProps({
        modelValue: "Updated text",
      });

      const textarea = wrapper.find("textarea");
      expect(textarea.element.value).toBe("Updated text");
    });

    it("resizes textarea on input", async () => {
      const resizeSpy = vi
        .spyOn(HTMLElement.prototype, "scrollHeight", "get")
        .mockImplementation(() => 100);

      wrapper = createWrapper({
        minHeight: 50,
        maxHeight: 150,
        initialHeight: 50,
      });

      const textarea = wrapper.find("textarea");

      // Simulate input that would resize the textarea
      await textarea.setValue("Text with\nmultiple\nlines");

      // Check if the height was set based on the scrollHeight
      expect(textarea.element.style.height).toBe("100px");

      resizeSpy.mockRestore();
    });

    it("clamps the height between minHeight and maxHeight", async () => {
      const resizeSpy = vi
        .spyOn(HTMLElement.prototype, "scrollHeight", "get")
        .mockImplementation(() => 200);

      wrapper = createWrapper({
        minHeight: 50,
        maxHeight: 150,
        initialHeight: 50,
      });

      const textarea = wrapper.find("textarea");

      // Simulate input that would make the textarea exceed maxHeight
      await textarea.setValue(
        "Text with\nmany\nmany\nmany\nlines\nthat\nwould\nmake\nit\ntaller",
      );

      // Check if the height was clamped to maxHeight
      expect(textarea.element.style.height).toBe("150px");

      resizeSpy.mockRestore();
    });

    it("updates character count when text changes", async () => {
      wrapper = createWrapper({
        modelValue: "Hello",
        maxLength: 100,
        showCharacterCount: true,
      });

      const charCount = wrapper.find(".n-chat-input__char-count");
      expect(charCount.text()).toBe("5/100");

      const textarea = wrapper.find("textarea");
      await textarea.setValue("Hello world");

      expect(charCount.text()).toBe("11/100");
    });
  });

  // Submit Tests
  describe("Submit", () => {
    it("enables send button when there is text", async () => {
      wrapper = createWrapper();

      const textarea = wrapper.find("textarea");
      const sendButton = wrapper.find(".n-chat-input__send-btn");

      // Initially disabled
      expect(sendButton.attributes("disabled")).toBeDefined();

      // Add text
      await textarea.setValue("Hello");

      // Should be enabled
      expect(sendButton.attributes("disabled")).toBeUndefined();
    });

    it("disables send button when text exceeds maxLength", async () => {
      wrapper = createWrapper({
        maxLength: 5,
      });

      const textarea = wrapper.find("textarea");
      const sendButton = wrapper.find(".n-chat-input__send-btn");

      // Add text within limit
      await textarea.setValue("Hello");
      expect(sendButton.attributes("disabled")).toBeUndefined();

      // Add text exceeding limit
      await textarea.setValue("Hello world");
      expect(sendButton.attributes("disabled")).toBeDefined();
    });

    it("emits submit event when send button is clicked", async () => {
      wrapper = createWrapper();

      const textarea = wrapper.find("textarea");
      const sendButton = wrapper.find(".n-chat-input__send-btn");

      // Add text
      await textarea.setValue("Hello");

      // Click send button
      await sendButton.trigger("click");

      // Should emit submit event
      expect(wrapper.emitted("submit")).toBeTruthy();
      expect(wrapper.emitted("submit")[0][0]).toBe("Hello");

      // Should clear textarea
      expect(textarea.element.value).toBe("");
    });

    it("emits submit event when Enter key is pressed", async () => {
      wrapper = createWrapper();

      const textarea = wrapper.find("textarea");

      // Add text
      await textarea.setValue("Hello");

      // Press Enter
      await textarea.trigger("keydown.enter.exact");

      // Should emit submit event
      expect(wrapper.emitted("submit")).toBeTruthy();
      expect(wrapper.emitted("submit")[0][0]).toBe("Hello");

      // Should clear textarea
      expect(textarea.element.value).toBe("");
    });

    it("does not submit when enter is pressed with shift key", async () => {
      wrapper = createWrapper();

      const textarea = wrapper.find("textarea");

      // Add text
      await textarea.setValue("Hello");

      // Press Shift+Enter
      await textarea.trigger("keydown.shift.enter");

      // Should not emit submit event
      expect(wrapper.emitted("submit")).toBeFalsy();

      // Text should remain
      expect(textarea.element.value).toBe("Hello");
    });

    it("trims whitespace when submitting", async () => {
      wrapper = createWrapper();

      const textarea = wrapper.find("textarea");

      // Add text with whitespace
      await textarea.setValue("  Hello world  ");

      // Press Enter
      await textarea.trigger("keydown.enter.exact");

      // Should emit submit event with trimmed text
      expect(wrapper.emitted("submit")).toBeTruthy();
      expect(wrapper.emitted("submit")[0][0]).toBe("Hello world");
    });

    it("does not submit when disabled", async () => {
      wrapper = createWrapper({
        disabled: true,
        modelValue: "Hello",
      });

      const textarea = wrapper.find("textarea");
      const sendButton = wrapper.find(".n-chat-input__send-btn");

      // Press Enter
      await textarea.trigger("keydown.enter.exact");

      // Click send button
      await sendButton.trigger("click");

      // Should not emit submit event
      expect(wrapper.emitted("submit")).toBeFalsy();
    });

    it("does not submit when loading", async () => {
      wrapper = createWrapper({
        isLoading: true,
        modelValue: "Hello",
      });

      const textarea = wrapper.find("textarea");
      const sendButton = wrapper.find(".n-chat-input__send-btn");

      // Press Enter
      await textarea.trigger("keydown.enter.exact");

      // Click send button
      await sendButton.trigger("click");

      // Should not emit submit event
      expect(wrapper.emitted("submit")).toBeFalsy();
    });

    it("does not submit empty text", async () => {
      wrapper = createWrapper();

      const textarea = wrapper.find("textarea");
      const sendButton = wrapper.find(".n-chat-input__send-btn");

      // Press Enter with empty text
      await textarea.trigger("keydown.enter.exact");

      // Click send button
      await sendButton.trigger("click");

      // Should not emit submit event
      expect(wrapper.emitted("submit")).toBeFalsy();
    });

    it("does not submit whitespace-only text", async () => {
      wrapper = createWrapper();

      const textarea = wrapper.find("textarea");

      // Add whitespace-only text
      await textarea.setValue("   ");

      // Send button should be disabled
      const sendButton = wrapper.find(".n-chat-input__send-btn");
      expect(sendButton.attributes("disabled")).toBeDefined();

      // Press Enter
      await textarea.trigger("keydown.enter.exact");

      // Should not emit submit event
      expect(wrapper.emitted("submit")).toBeFalsy();
    });
  });

  // Focus & Blur Tests
  describe("Focus and Blur", () => {
    it("adds focused class when textarea is focused", async () => {
      wrapper = createWrapper();

      const inputContainer = wrapper.find(".n-chat-input");
      const textarea = wrapper.find("textarea");

      // Initially not focused
      expect(inputContainer.classes()).not.toContain("n-chat-input--focused");

      // Focus textarea
      await textarea.trigger("focus");

      // Should have focused class
      expect(inputContainer.classes()).toContain("n-chat-input--focused");
    });

    it("removes focused class when textarea is blurred", async () => {
      wrapper = createWrapper();

      const inputContainer = wrapper.find(".n-chat-input");
      const textarea = wrapper.find("textarea");

      // Focus textarea
      await textarea.trigger("focus");
      expect(inputContainer.classes()).toContain("n-chat-input--focused");

      // Blur textarea
      await textarea.trigger("blur");

      // Should not have focused class
      expect(inputContainer.classes()).not.toContain("n-chat-input--focused");
    });

    it.skip("emits focus event when textarea is focused", async () => {
      // Skip this test because the component doesn't emit focus events directly
      // Instead, it sets isFocused = true which we test separately
    });

    it.skip("emits blur event when textarea is blurred", async () => {
      // Skip this test because the component doesn't emit blur events directly
      // Instead, it sets isFocused = false which we test separately
    });

    it("sets isFocused to true when textarea is focused", async () => {
      wrapper = createWrapper();

      const textarea = wrapper.find("textarea");

      // Initial state should be not focused
      expect(wrapper.classes()).not.toContain("n-chat-input--focused");

      // Focus textarea
      await textarea.trigger("focus");
      await wrapper.vm.$nextTick();

      // Component should have focused class
      expect(wrapper.classes()).toContain("n-chat-input--focused");
    });

    it("sets isFocused to false when textarea is blurred", async () => {
      wrapper = createWrapper();

      const textarea = wrapper.find("textarea");

      // Focus first
      await textarea.trigger("focus");
      await wrapper.vm.$nextTick();
      expect(wrapper.classes()).toContain("n-chat-input--focused");

      // Then blur
      await textarea.trigger("blur");
      await wrapper.vm.$nextTick();

      // Focused class should be removed
      expect(wrapper.classes()).not.toContain("n-chat-input--focused");
    });

    it("autofocuses textarea when autofocus is true", async () => {
      // Mock the focus method
      const focusSpy = vi.fn();
      HTMLElement.prototype.focus = focusSpy;

      wrapper = createWrapper({
        autofocus: true,
      });

      // Need to wait for nextTick as focus happens in onMounted
      await flushPromises();

      // Should have called focus
      expect(focusSpy).toHaveBeenCalled();
    });

    it("does not autofocus when autofocus is false", async () => {
      // Mock the focus method
      const focusSpy = vi.fn();
      HTMLElement.prototype.focus = focusSpy;

      wrapper = createWrapper({
        autofocus: false,
      });

      // Need to wait for nextTick as focus happens in onMounted
      await flushPromises();

      // Should not have called focus
      expect(focusSpy).not.toHaveBeenCalled();
    });
  });

  // Keyboard Events
  describe("Keyboard Events", () => {
    it("emits keydown event when a key is pressed", async () => {
      wrapper = createWrapper();

      const textarea = wrapper.find("textarea");

      // Trigger keydown event
      await textarea.trigger("keydown", {
        key: "a",
      });

      // Should emit keydown event
      expect(wrapper.emitted("keydown")).toBeTruthy();
      expect(wrapper.emitted("keydown")[0][0]).toBeInstanceOf(Object);
    });

    it("prevents default on Enter keydown", async () => {
      wrapper = createWrapper();

      const textarea = wrapper.find("textarea");

      // Add text
      await textarea.setValue("Hello");

      // Press Enter with preventDefault mock
      const preventDefault = vi.fn();
      await textarea.trigger("keydown.enter.exact", {
        preventDefault,
      });

      // Should have prevented default
      expect(preventDefault).toHaveBeenCalled();
    });

    it("stops propagation on Shift+Enter keydown", async () => {
      wrapper = createWrapper();

      const textarea = wrapper.find("textarea");

      // Press Shift+Enter with stopPropagation mock
      const stopPropagation = vi.fn();
      await textarea.trigger("keydown.shift.enter", {
        stopPropagation,
      });

      // Should have stopped propagation
      expect(stopPropagation).toHaveBeenCalled();
    });
  });
});
