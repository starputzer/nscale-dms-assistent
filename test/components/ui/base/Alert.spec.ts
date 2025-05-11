import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import Alert from "@/components/ui/base/Alert.vue";

// Helper to create wrapper with default props
const createWrapper = (props = {}, slots = {}) => {
  return mount(Alert, {
    props,
    slots,
    global: {
      stubs: {
        Transition: false,
      },
    },
  });
};

describe("Alert.vue", () => {
  // Rendering Tests
  describe("Rendering", () => {
    it("renders the alert correctly with default props", () => {
      const wrapper = createWrapper();

      expect(wrapper.find(".n-alert").exists()).toBe(true);
      expect(wrapper.find(".n-alert").classes()).toContain("n-alert--info");
      expect(wrapper.find(".n-alert-close").exists()).toBe(false);
      expect(wrapper.find(".n-alert-default-icon").exists()).toBe(true);
      expect(wrapper.attributes("role")).toBe("alert");
      expect(wrapper.attributes("aria-live")).toBe("assertive");
    });

    it("renders different alert types correctly", () => {
      const types = ["info", "success", "warning", "error"];

      types.forEach((type) => {
        const wrapper = createWrapper({ type });

        expect(wrapper.find(".n-alert").classes()).toContain(
          `n-alert--${type}`,
        );

        // Each type should have the appropriate icon
        const iconPath = wrapper.find(".n-alert-default-icon path");
        expect(iconPath.exists()).toBe(true);

        // Each type should have its own path (different d attribute)
        const pathAttribute = iconPath.attributes("d");
        expect(pathAttribute).toBeTruthy();
      });
    });

    it("renders title and message when provided", () => {
      const wrapper = createWrapper({
        title: "Alert Title",
        message: "Alert Message",
      });

      expect(wrapper.find(".n-alert-title").exists()).toBe(true);
      expect(wrapper.find(".n-alert-title").text()).toBe("Alert Title");
      expect(wrapper.find(".n-alert-message").exists()).toBe(true);
      expect(wrapper.find(".n-alert-message").text()).toBe("Alert Message");
    });

    it("adds special class to message when title is present", () => {
      const wrapper = createWrapper({
        title: "Alert Title",
        message: "Alert Message",
      });

      expect(wrapper.find(".n-alert-message").classes()).toContain(
        "n-alert-message--has-title",
      );
    });

    it("renders close button when dismissible is true", () => {
      const wrapper = createWrapper({
        dismissible: true,
      });

      expect(wrapper.find(".n-alert").classes()).toContain(
        "n-alert--dismissible",
      );
      expect(wrapper.find(".n-alert-close").exists()).toBe(true);
      expect(wrapper.find(".n-alert-close").attributes("aria-label")).toBe(
        "Close alert",
      );
    });

    it("uses custom icon when provided", () => {
      const CustomIcon = {
        template: '<div class="custom-icon">Custom Icon</div>',
      };

      const wrapper = createWrapper({
        icon: CustomIcon,
      });

      expect(wrapper.find(".custom-icon").exists()).toBe(true);
      expect(wrapper.find(".n-alert-default-icon").exists()).toBe(false);
    });
  });

  // Slot Tests
  describe("Slots", () => {
    it("renders default slot content instead of message prop", () => {
      const wrapper = createWrapper(
        {
          message: "Message Prop",
        },
        {
          default: '<strong class="custom-content">Slot Content</strong>',
        },
      );

      expect(wrapper.find(".custom-content").exists()).toBe(true);
      expect(wrapper.find(".n-alert-message").text()).toBe("Slot Content");
      expect(wrapper.text()).not.toContain("Message Prop");
    });
  });

  // Interactions Tests
  describe("Interactions", () => {
    it("emits close event when close button is clicked", async () => {
      const wrapper = createWrapper({
        dismissible: true,
      });

      await wrapper.find(".n-alert-close").trigger("click");

      expect(wrapper.emitted("close")).toBeTruthy();
      expect(wrapper.emitted("close")?.length).toBe(1);
      expect(wrapper.emitted("update:visible")).toBeTruthy();
      expect(wrapper.emitted("update:visible")?.[0]).toEqual([false]);

      // The alert should no longer be visible
      await flushPromises();
      expect(wrapper.find(".n-alert").exists()).toBe(false);
    });

    it("updates visibility when visible prop changes", async () => {
      const wrapper = createWrapper({
        visible: true,
      });

      expect(wrapper.find(".n-alert").exists()).toBe(true);

      await wrapper.setProps({ visible: false });

      // Update should be reflected in the DOM
      await flushPromises();
      expect(wrapper.find(".n-alert").exists()).toBe(false);
    });

    it("closes automatically after timeout", async () => {
      // Mock timers
      vi.useFakeTimers();

      const wrapper = createWrapper({
        timeout: 2000,
      });

      expect(wrapper.find(".n-alert").exists()).toBe(true);

      // Advance timers
      vi.advanceTimersByTime(2000);
      await flushPromises();

      // Check if close event was emitted
      expect(wrapper.emitted("close")).toBeTruthy();
      expect(wrapper.emitted("update:visible")?.[0]).toEqual([false]);

      // The alert should no longer be visible
      expect(wrapper.find(".n-alert").exists()).toBe(false);

      // Restore timers
      vi.useRealTimers();
    });
  });

  // Lifecycle Tests
  describe("Lifecycle", () => {
    it("cleans up timeout on unmount", async () => {
      // Mock setTimeout and clearTimeout
      const originalSetTimeout = global.setTimeout;
      const originalClearTimeout = global.clearTimeout;

      const setTimeoutSpy = vi.fn().mockReturnValue(123);
      const clearTimeoutSpy = vi.fn();

      global.setTimeout = setTimeoutSpy as any;
      global.clearTimeout = clearTimeoutSpy as any;

      // Create component with timeout
      const wrapper = createWrapper({
        timeout: 5000,
      });

      // Check if setTimeout was called
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);

      // Unmount component
      wrapper.unmount();

      // Check if clearTimeout was called with the correct timer ID
      expect(clearTimeoutSpy).toHaveBeenCalledWith(123);

      // Restore originals
      global.setTimeout = originalSetTimeout;
      global.clearTimeout = originalClearTimeout;
    });
  });

  // Edge Cases
  describe("Edge Cases", () => {
    it("handles no message or slot content", () => {
      const wrapper = createWrapper({
        title: "Just Title",
      });

      expect(wrapper.find(".n-alert-title").exists()).toBe(true);
      expect(wrapper.find(".n-alert-message").exists()).toBe(true);
      expect(wrapper.find(".n-alert-message").text()).toBe("");
    });

    it("renders correctly with long content", () => {
      const longText =
        "This is a very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very long text.";

      const wrapper = createWrapper({
        title: "Long Title",
        message: longText,
      });

      expect(wrapper.find(".n-alert-title").text()).toBe("Long Title");
      expect(wrapper.find(".n-alert-message").text()).toBe(longText);
    });

    it("handles zero timeout correctly (no auto-dismiss)", () => {
      // Mock setTimeout
      const setTimeoutSpy = vi.spyOn(global, "setTimeout");

      createWrapper({
        timeout: 0,
      });

      // setTimeout should not be called with 0 timeout
      expect(setTimeoutSpy).not.toHaveBeenCalled();

      // Cleanup
      setTimeoutSpy.mockRestore();
    });

    it("handles negative timeout as if it were zero", () => {
      // Mock setTimeout
      const setTimeoutSpy = vi.spyOn(global, "setTimeout");

      createWrapper({
        timeout: -1000,
      });

      // setTimeout should not be called with negative timeout
      expect(setTimeoutSpy).not.toHaveBeenCalled();

      // Cleanup
      setTimeoutSpy.mockRestore();
    });
  });

  // Accessibility Tests
  describe("Accessibility", () => {
    it("has correct ARIA attributes", () => {
      const wrapper = createWrapper({
        type: "error",
        title: "Error",
        message: "Something went wrong",
      });

      expect(wrapper.find(".n-alert").attributes("role")).toBe("alert");
      expect(wrapper.find(".n-alert").attributes("aria-live")).toBe(
        "assertive",
      );
    });

    it("has accessible close button", () => {
      const wrapper = createWrapper({
        dismissible: true,
      });

      const closeButton = wrapper.find(".n-alert-close");
      expect(closeButton.attributes("aria-label")).toBe("Close alert");
      expect(closeButton.attributes("type")).toBe("button");
    });

    it("marks icon as decorative with aria-hidden", () => {
      const wrapper = createWrapper();

      expect(wrapper.find(".n-alert-icon").attributes("aria-hidden")).toBe(
        "true",
      );
    });
  });
});
