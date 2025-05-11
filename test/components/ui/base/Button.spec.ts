import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Button from "@/components/ui/base/Button.vue";

// Helper to create wrapper with default props
const createWrapper = (props = {}) => {
  return mount(Button, {
    props: {
      label: "Test Button",
      ...props,
    },
  });
};

describe("Button.vue", () => {
  // Rendering Tests
  describe("Rendering", () => {
    it("renders the button correctly with default props", () => {
      const wrapper = createWrapper();

      expect(wrapper.find("button").exists()).toBe(true);
      expect(wrapper.text()).toContain("Test Button");
      expect(wrapper.classes()).toContain("btn");
      expect(wrapper.classes()).toContain("btn-primary"); // Default variant
    });

    it("applies the correct variant class", () => {
      const wrapper = createWrapper({
        variant: "secondary",
      });

      expect(wrapper.classes()).toContain("btn-secondary");
    });

    it("renders an icon when provided", () => {
      const wrapper = createWrapper({
        icon: "fa-check",
      });

      expect(wrapper.find("i.fa-check").exists()).toBe(true);
    });

    it("applies disabled state correctly", () => {
      const wrapper = createWrapper({
        disabled: true,
      });

      expect(wrapper.find("button").attributes("disabled")).toBeDefined();
      expect(wrapper.classes()).toContain("btn-disabled");
    });

    it("renders as a link when href is provided", () => {
      const href = "https://example.com";
      const wrapper = createWrapper({
        href,
      });

      expect(wrapper.element.tagName).toBe("A");
      expect(wrapper.attributes("href")).toBe(href);
      expect(wrapper.attributes("role")).toBe("button");
    });

    it("applies size classes correctly", () => {
      const smallWrapper = createWrapper({ size: "sm" });
      const largeWrapper = createWrapper({ size: "lg" });

      expect(smallWrapper.classes()).toContain("btn-sm");
      expect(largeWrapper.classes()).toContain("btn-lg");
    });

    it("applies full-width class when block prop is true", () => {
      const wrapper = createWrapper({ block: true });

      expect(wrapper.classes()).toContain("btn-block");
    });
  });

  // Interactions and Events
  describe("Interactions", () => {
    it("emits click event when clicked", async () => {
      const wrapper = createWrapper();

      await wrapper.find("button").trigger("click");

      expect(wrapper.emitted()).toHaveProperty("click");
      expect(wrapper.emitted("click")).toHaveLength(1);
    });

    it("does not emit click event when disabled", async () => {
      const wrapper = createWrapper({
        disabled: true,
      });

      await wrapper.find("button").trigger("click");

      expect(wrapper.emitted("click")).toBeFalsy();
    });

    it("adds loading state when loading prop is true", () => {
      const wrapper = createWrapper({
        loading: true,
      });

      expect(wrapper.classes()).toContain("btn-loading");
      expect(wrapper.find(".btn-spinner").exists()).toBe(true);
      expect(wrapper.find("button").attributes("disabled")).toBeDefined();
    });

    it("prevents default when link is clicked with prevent modifier", async () => {
      const wrapper = createWrapper({
        href: "https://example.com",
        prevent: true,
      });

      const preventDefault = vi.fn();
      await wrapper.trigger("click", { preventDefault });

      expect(preventDefault).toHaveBeenCalled();
    });
  });

  // Accessibility
  describe("Accessibility", () => {
    it("has appropriate aria attributes", () => {
      const wrapper = createWrapper({
        ariaLabel: "Custom Aria Label",
      });

      expect(wrapper.find("button").attributes("aria-label")).toBe(
        "Custom Aria Label",
      );
    });

    it("uses aria-disabled when in disabled state", () => {
      const wrapper = createWrapper({
        disabled: true,
      });

      expect(wrapper.find("button").attributes("aria-disabled")).toBe("true");
    });

    it("uses aria-busy when in loading state", () => {
      const wrapper = createWrapper({
        loading: true,
      });

      expect(wrapper.find("button").attributes("aria-busy")).toBe("true");
    });

    it("forwards tabindex attribute", () => {
      const wrapper = createWrapper({
        tabindex: "2",
      });

      expect(wrapper.find("button").attributes("tabindex")).toBe("2");
    });
  });

  // Slots
  describe("Slots", () => {
    it("renders default slot content instead of label when provided", () => {
      const wrapper = mount(Button, {
        props: { label: "Label Text" },
        slots: {
          default: '<span class="custom-content">Custom Content</span>',
        },
      });

      expect(wrapper.find(".custom-content").exists()).toBe(true);
      expect(wrapper.text()).toContain("Custom Content");
      expect(wrapper.text()).not.toContain("Label Text");
    });

    it("renders icon slot content instead of icon prop when provided", () => {
      const wrapper = mount(Button, {
        props: {
          label: "Button with Icon",
          icon: "fa-user",
        },
        slots: {
          icon: '<i class="fa fa-custom-icon"></i>',
        },
      });

      expect(wrapper.find(".fa-custom-icon").exists()).toBe(true);
      expect(wrapper.find(".fa-user").exists()).toBe(false);
    });

    it("renders both loading spinner and icon when loading is true and icon is provided", () => {
      const wrapper = createWrapper({
        loading: true,
        icon: "fa-save",
      });

      expect(wrapper.find(".btn-spinner").exists()).toBe(true);
      expect(wrapper.find(".fa-save").exists()).toBe(true);
    });
  });

  // Edge Cases
  describe("Edge Cases", () => {
    it("handles empty label", () => {
      const wrapper = createWrapper({
        label: "",
        icon: "fa-plus",
      });

      expect(wrapper.find("button").exists()).toBe(true);
      expect(wrapper.find("i.fa-plus").exists()).toBe(true);
      // Should have aria-label when no text content is available
      expect(wrapper.attributes("aria-label")).toBeDefined();
    });

    it("renders with just an icon and no label", () => {
      const wrapper = createWrapper({
        label: "",
        icon: "fa-trash",
        ariaLabel: "Delete",
      });

      expect(wrapper.find(".fa-trash").exists()).toBe(true);
      expect(wrapper.text().trim()).toBe("");
      expect(wrapper.attributes("aria-label")).toBe("Delete");
    });

    it("renders with long text properly", () => {
      const longText =
        "This is a very very very very very very very very very very very very very long button text";
      const wrapper = createWrapper({
        label: longText,
      });

      expect(wrapper.text()).toContain(longText);
    });

    it("handles click on disabled link button", async () => {
      const wrapper = createWrapper({
        href: "https://example.com",
        disabled: true,
      });

      const preventDefault = vi.fn();
      await wrapper.trigger("click", { preventDefault });

      expect(preventDefault).toHaveBeenCalled();
      expect(wrapper.emitted("click")).toBeFalsy();
    });
  });
});
