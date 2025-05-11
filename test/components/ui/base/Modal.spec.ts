import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import Modal from "@/components/ui/base/Modal.vue";
import FocusTrap from "@/components/ui/base/FocusTrap.vue";

// Create a stub for the FocusTrap component
const FocusTrapStub = {
  name: "FocusTrap",
  template: "<div><slot></slot></div>",
  props: ["active"],
};

// Create a stub for Teleport
const TeleportStub = {
  name: "Teleport",
  template: "<div><slot></slot></div>",
  props: ["to"],
};

// Helper to create wrapper with default props
const createWrapper = (props = {}, slots = {}) => {
  return mount(Modal, {
    props: {
      open: true, // Open by default for testing
      ...props,
    },
    slots,
    global: {
      stubs: {
        Teleport: TeleportStub,
        FocusTrap: FocusTrapStub,
        Transition: false,
      },
    },
  });
};

describe("Modal.vue", () => {
  // Mock document body methods
  let originalBodyStyle;
  let mockFocus;
  let mockBlur;

  beforeEach(() => {
    // Save original body style to restore later
    originalBodyStyle = document.body.style.overflow;

    // Mock focus and blur methods
    mockFocus = vi.fn();
    mockBlur = vi.fn();

    Element.prototype.focus = mockFocus;
    Element.prototype.blur = mockBlur;

    // Mock document.activeElement
    Object.defineProperty(document, "activeElement", {
      writable: true,
      value: document.createElement("button"),
    });

    // Reset event listeners between tests
    vi.spyOn(document, "addEventListener").mockClear();
    vi.spyOn(document, "removeEventListener").mockClear();
  });

  afterEach(() => {
    // Restore original body style
    document.body.style.overflow = originalBodyStyle;
  });

  // Rendering Tests
  describe("Rendering", () => {
    it("renders the modal when open is true", async () => {
      const wrapper = createWrapper();

      expect(wrapper.find(".n-modal-backdrop").exists()).toBe(true);
      expect(wrapper.find(".n-modal").exists()).toBe(true);
    });

    it("does not render the modal when open is false", async () => {
      const wrapper = createWrapper({ open: false });

      expect(wrapper.find(".n-modal-backdrop").exists()).toBe(false);
      expect(wrapper.find(".n-modal").exists()).toBe(false);
    });

    it("applies size class correctly", () => {
      const sizes = ["small", "medium", "large", "full"];

      sizes.forEach((size) => {
        const wrapper = createWrapper({ size });
        expect(wrapper.find(`.n-modal--${size}`).exists()).toBe(true);
      });
    });

    it("renders title when provided", () => {
      const wrapper = createWrapper({
        title: "Modal Title",
      });

      expect(wrapper.find(".n-modal-title").text()).toBe("Modal Title");
    });

    it("adds aria-labelledby attribute when title is provided", () => {
      const wrapper = createWrapper({
        title: "Modal Title",
      });

      const titleId = wrapper.find(".n-modal-title").attributes("id");
      expect(titleId).toBeDefined();
      expect(wrapper.find(".n-modal").attributes("aria-labelledby")).toBe(
        titleId,
      );
    });

    it("shows close button by default", () => {
      const wrapper = createWrapper();

      expect(wrapper.find(".n-modal-close").exists()).toBe(true);
    });

    it("hides close button when showCloseButton is false", () => {
      const wrapper = createWrapper({
        showCloseButton: false,
      });

      expect(wrapper.find(".n-modal-close").exists()).toBe(false);
    });

    it("adds closable class to backdrop when closeOnBackdrop is true", () => {
      const wrapper = createWrapper({
        closeOnBackdrop: true,
      });

      expect(wrapper.find(".n-modal-backdrop").classes()).toContain(
        "n-modal-backdrop--closable",
      );
    });

    it("adds scrollable class to body when scrollableContent is true", () => {
      const wrapper = createWrapper({
        scrollableContent: true,
      });

      expect(wrapper.find(".n-modal-body").classes()).toContain(
        "n-modal-body--scrollable",
      );
    });

    it("adds scrollable class to container when scrollable is true", () => {
      const wrapper = createWrapper({
        scrollable: true,
      });

      expect(wrapper.find(".n-modal-container").classes()).toContain(
        "n-modal--scrollable",
      );
    });
  });

  // Slot Tests
  describe("Slots", () => {
    it("renders default slot content in the body", () => {
      const wrapper = createWrapper(
        {},
        {
          default: '<p class="test-content">Modal content</p>',
        },
      );

      expect(wrapper.find(".n-modal-body").find(".test-content").exists()).toBe(
        true,
      );
      expect(wrapper.find(".test-content").text()).toBe("Modal content");
    });

    it("renders title slot instead of title prop", () => {
      const wrapper = createWrapper(
        {
          title: "Title Prop",
        },
        {
          title: '<h2 class="custom-title">Custom Title</h2>',
        },
      );

      expect(
        wrapper.find(".n-modal-title").find(".custom-title").exists(),
      ).toBe(true);
      expect(wrapper.find(".custom-title").text()).toBe("Custom Title");
      expect(wrapper.text()).not.toContain("Title Prop");
    });

    it("renders footer slot when provided", () => {
      const wrapper = createWrapper(
        {},
        {
          footer:
            '<div class="footer-content"><button>Save</button><button>Cancel</button></div>',
        },
      );

      expect(wrapper.find(".n-modal-footer").exists()).toBe(true);
      expect(wrapper.find(".footer-content").exists()).toBe(true);
      expect(wrapper.find(".n-modal-footer").text()).toContain("Save");
      expect(wrapper.find(".n-modal-footer").text()).toContain("Cancel");
    });

    it("does not render footer section when no footer slot is provided", () => {
      const wrapper = createWrapper();

      expect(wrapper.find(".n-modal-footer").exists()).toBe(false);
    });
  });

  // Interaction Tests
  describe("Interactions", () => {
    it("emits close event when close button is clicked", async () => {
      const wrapper = createWrapper();

      await wrapper.find(".n-modal-close").trigger("click");

      expect(wrapper.emitted("close")).toBeTruthy();
      expect(wrapper.emitted("update:open")).toBeTruthy();
      expect(wrapper.emitted("update:open")[0]).toEqual([false]);
    });

    it("emits close event when backdrop is clicked and closeOnBackdrop is true", async () => {
      const wrapper = createWrapper({
        closeOnBackdrop: true,
      });

      // Click directly on the backdrop (not on modal content)
      // We need to mock currentTarget to be the same as target to simulate
      // clicking directly on the backdrop
      const backdrop = wrapper.find(".n-modal-backdrop");
      const event = {
        target: backdrop.element,
        currentTarget: backdrop.element,
      };

      await backdrop.trigger("click", event);

      expect(wrapper.emitted("close")).toBeTruthy();
      expect(wrapper.emitted("update:open")).toBeTruthy();
      expect(wrapper.emitted("update:open")[0]).toEqual([false]);
    });

    it("does not emit close event when backdrop is clicked and closeOnBackdrop is false", async () => {
      const wrapper = createWrapper({
        closeOnBackdrop: false,
      });

      const backdrop = wrapper.find(".n-modal-backdrop");
      const event = {
        target: backdrop.element,
        currentTarget: backdrop.element,
      };

      await backdrop.trigger("click", event);

      expect(wrapper.emitted("close")).toBeFalsy();
      expect(wrapper.emitted("update:open")).toBeFalsy();
    });

    it("emits close event when escape key is pressed and closeOnEscape is true", async () => {
      const wrapper = createWrapper({
        closeOnEscape: true,
      });

      await wrapper.find(".n-modal-backdrop").trigger("keydown.esc");

      expect(wrapper.emitted("close")).toBeTruthy();
      expect(wrapper.emitted("update:open")).toBeTruthy();
      expect(wrapper.emitted("update:open")[0]).toEqual([false]);
    });

    it("does not emit close event when escape key is pressed and closeOnEscape is false", async () => {
      const wrapper = createWrapper({
        closeOnEscape: false,
      });

      await wrapper.find(".n-modal-backdrop").trigger("keydown.esc");

      expect(wrapper.emitted("close")).toBeFalsy();
      expect(wrapper.emitted("update:open")).toBeFalsy();
    });

    it("prevents event bubbling when clicking on modal content", async () => {
      const wrapper = createWrapper();

      const stopPropagationMock = vi.fn();
      await wrapper.find(".n-modal").trigger("click", {
        stopPropagation: stopPropagationMock,
      });

      // We can't directly test stopPropagation, but we can verify
      // that the click doesn't bubble up to cause the modal to close
      expect(wrapper.emitted("close")).toBeFalsy();
    });

    it("updates visibility when open prop changes", async () => {
      const wrapper = createWrapper({ open: true });

      expect(wrapper.find(".n-modal").exists()).toBe(true);

      await wrapper.setProps({ open: false });
      await flushPromises();

      expect(wrapper.find(".n-modal").exists()).toBe(false);

      await wrapper.setProps({ open: true });
      await flushPromises();

      expect(wrapper.find(".n-modal").exists()).toBe(true);
    });
  });

  // Focus Management Tests
  describe("Focus Management", () => {
    it("sets focus on the modal when opened", async () => {
      const wrapper = createWrapper({ open: false });

      // Clear focus mock calls
      mockFocus.mockClear();

      // Open the modal
      await wrapper.setProps({ open: true });
      await flushPromises();

      // Check if focus was called
      expect(mockFocus).toHaveBeenCalled();
    });

    it("contains a focus trap when open", () => {
      const wrapper = createWrapper();

      // Check if FocusTrap is included and active
      const focusTrap = wrapper.findComponent(FocusTrapStub);
      expect(focusTrap.exists()).toBe(true);
      expect(focusTrap.props("active")).toBe(true);
    });
  });

  // Accessibility Tests
  describe("Accessibility", () => {
    it("has correct ARIA attributes", () => {
      const wrapper = createWrapper();

      const modal = wrapper.find(".n-modal");
      expect(modal.attributes("role")).toBe("dialog");
      expect(modal.attributes("aria-modal")).toBe("true");
      expect(modal.attributes("tabindex")).toBe("-1");

      const closeButton = wrapper.find(".n-modal-close");
      expect(closeButton.attributes("aria-label")).toBe("Close dialog");
    });
  });

  // Body Scroll Management Tests
  describe("Body Scroll Management", () => {
    it("prevents body scrolling when modal is open and preventBodyScrolling is true", async () => {
      createWrapper({
        preventBodyScrolling: true,
      });

      expect(document.body.style.overflow).toBe("hidden");
    });

    it("does not prevent body scrolling when preventBodyScrolling is false", () => {
      createWrapper({
        preventBodyScrolling: false,
      });

      expect(document.body.style.overflow).not.toBe("hidden");
    });

    it("restores body scrolling when modal is closed", async () => {
      const wrapper = createWrapper({
        preventBodyScrolling: true,
      });

      // Body scroll should be hidden
      expect(document.body.style.overflow).toBe("hidden");

      // Close the modal
      await wrapper.setProps({ open: false });
      await flushPromises();

      // Body scroll should be restored
      expect(document.body.style.overflow).toBe("");
    });

    it("restores body scrolling when component is unmounted", () => {
      const wrapper = createWrapper({
        preventBodyScrolling: true,
      });

      // Body scroll should be hidden
      expect(document.body.style.overflow).toBe("hidden");

      // Unmount the component
      wrapper.unmount();

      // Body scroll should be restored
      expect(document.body.style.overflow).toBe("");
    });
  });

  // Event Listener Management Tests
  describe("Event Listener Management", () => {
    it("adds global escape key event listener when closeOnEscape is true", () => {
      createWrapper({
        closeOnEscape: true,
      });

      expect(document.addEventListener).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );
    });

    it("does not add global escape key event listener when closeOnEscape is false", () => {
      createWrapper({
        closeOnEscape: false,
      });

      expect(document.addEventListener).not.toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );
    });

    it("removes global escape key event listener on unmount", () => {
      const wrapper = createWrapper({
        closeOnEscape: true,
      });

      wrapper.unmount();

      expect(document.removeEventListener).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );
    });
  });

  // Lifecycle Event Tests
  describe("Lifecycle Events", () => {
    it("emits afterOpen event when modal is opened", async () => {
      const wrapper = createWrapper({ open: false });

      await wrapper.setProps({ open: true });
      await flushPromises();

      expect(wrapper.emitted("afterOpen")).toBeTruthy();
    });

    it("emits afterClose event when modal is closed", async () => {
      const wrapper = createWrapper({ open: true });

      await wrapper.setProps({ open: false });
      await flushPromises();

      expect(wrapper.emitted("afterClose")).toBeTruthy();
    });
  });
});
