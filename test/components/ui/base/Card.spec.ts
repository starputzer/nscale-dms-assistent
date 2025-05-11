import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Card from "@/components/ui/base/Card.vue";

// Helper to create wrapper with default props
const createWrapper = (props = {}, slots = {}) => {
  return mount(Card, {
    props,
    slots,
  });
};

describe("Card.vue", () => {
  // Rendering Tests
  describe("Rendering", () => {
    it("renders the card correctly with default props", () => {
      const wrapper = createWrapper();

      expect(wrapper.classes()).toContain("n-card");
      expect(wrapper.classes()).toContain("n-card--default"); // Default variant
      expect(wrapper.classes()).toContain("n-card--medium"); // Default size
      expect(wrapper.classes()).not.toContain("n-card--interactive"); // Not interactive by default
    });

    it("applies variant classes correctly", () => {
      const variants = ["default", "elevated", "bordered", "flat"];

      variants.forEach((variant) => {
        const wrapper = createWrapper({ variant });
        expect(wrapper.classes()).toContain(`n-card--${variant}`);
      });
    });

    it("applies size classes correctly", () => {
      const sizes = ["small", "medium", "large"];

      sizes.forEach((size) => {
        const wrapper = createWrapper({ size });
        expect(wrapper.classes()).toContain(`n-card--${size}`);
      });
    });

    it("adds interactive class when interactive prop is true", () => {
      const wrapper = createWrapper({ interactive: true });

      expect(wrapper.classes()).toContain("n-card--interactive");
      expect(wrapper.attributes("tabindex")).toBe("0"); // Should be focusable
    });

    it("renders the title when provided", () => {
      const wrapper = createWrapper({
        title: "Card Title",
      });

      expect(wrapper.find(".n-card-header").exists()).toBe(true);
      expect(wrapper.find(".n-card-title").exists()).toBe(true);
      expect(wrapper.find(".n-card-title").text()).toBe("Card Title");
    });

    it("applies custom max width when provided", () => {
      const wrapper = createWrapper({
        maxWidth: "500px",
      });

      // In Vue test utils, we can't directly check computed styles
      // But we can verify the prop is being used in the template
      const card = wrapper.find(".n-card");
      // Access the inline style object
      const style = (card.element as HTMLElement).style;
      expect(style.getPropertyValue("max-width")).toBe("500px");
    });

    it("applies custom padding to card body when provided", () => {
      const wrapper = createWrapper({
        padding: "2rem",
      });

      expect(wrapper.find(".n-card-body").attributes("style")).toContain(
        "padding: 2rem",
      );
    });

    it("applies min height to card body when provided", () => {
      const wrapper = createWrapper({
        minHeight: "200px",
      });

      expect(wrapper.find(".n-card-body").attributes("style")).toContain(
        "min-height: 200px",
      );
    });
  });

  // Slot Tests
  describe("Slots", () => {
    it("renders default slot content in the card body", () => {
      const wrapper = createWrapper(
        {},
        {
          default: '<p class="test-content">Card content</p>',
        },
      );

      expect(wrapper.find(".n-card-body").find(".test-content").exists()).toBe(
        true,
      );
      expect(wrapper.find(".test-content").text()).toBe("Card content");
    });

    it("renders title slot instead of title prop when provided", () => {
      const wrapper = createWrapper(
        {
          title: "Card Title",
        },
        {
          title: '<h3 class="custom-title">Custom Title</h3>',
        },
      );

      expect(wrapper.find(".n-card-title").find(".custom-title").exists()).toBe(
        true,
      );
      expect(wrapper.find(".custom-title").text()).toBe("Custom Title");
      expect(wrapper.find(".n-card-title").text()).not.toBe("Card Title");
    });

    it("renders header actions slot when provided", () => {
      const wrapper = createWrapper(
        {},
        {
          headerActions: '<button class="action-button">Action</button>',
        },
      );

      expect(wrapper.find(".n-card-header").exists()).toBe(true);
      expect(wrapper.find(".n-card-header-actions").exists()).toBe(true);
      expect(wrapper.find(".action-button").exists()).toBe(true);
    });

    it("renders header slot when provided", () => {
      const wrapper = createWrapper(
        {},
        {
          header: '<div class="custom-header">Custom Header</div>',
        },
      );

      expect(wrapper.find(".n-card-header").exists()).toBe(true);
      expect(wrapper.find(".custom-header").exists()).toBe(true);
    });

    it("renders footer slot when provided", () => {
      const wrapper = createWrapper(
        {},
        {
          footer: '<div class="card-footer-content">Footer Content</div>',
        },
      );

      expect(wrapper.find(".n-card-footer").exists()).toBe(true);
      expect(wrapper.find(".card-footer-content").exists()).toBe(true);
      expect(wrapper.find(".card-footer-content").text()).toBe(
        "Footer Content",
      );
    });

    it("does not render header section when no title or header slots are provided", () => {
      const wrapper = createWrapper();

      expect(wrapper.find(".n-card-header").exists()).toBe(false);
    });

    it("does not render footer section when no footer slot is provided", () => {
      const wrapper = createWrapper();

      expect(wrapper.find(".n-card-footer").exists()).toBe(false);
    });
  });

  // Interaction Tests
  describe("Interactions", () => {
    it("emits click event when clicked and interactive is true", async () => {
      const wrapper = createWrapper({
        interactive: true,
      });

      await wrapper.trigger("click");

      expect(wrapper.emitted("click")).toBeTruthy();
      expect(wrapper.emitted("click")?.length).toBe(1);
    });

    it("does not emit click event when clicked and interactive is false", async () => {
      const wrapper = createWrapper({
        interactive: false,
      });

      await wrapper.trigger("click");

      expect(wrapper.emitted("click")).toBeFalsy();
    });

    it("emits click event on Enter key press when interactive is true", async () => {
      const wrapper = createWrapper({
        interactive: true,
      });

      const preventDefault = vi.fn();
      await wrapper.trigger("keydown.enter", { preventDefault });

      expect(preventDefault).toHaveBeenCalled();
      expect(wrapper.emitted("click")).toBeTruthy();
      expect(wrapper.emitted("click")?.length).toBe(1);
    });

    it("emits click event on Space key press when interactive is true", async () => {
      const wrapper = createWrapper({
        interactive: true,
      });

      const preventDefault = vi.fn();
      await wrapper.trigger("keydown.space", { preventDefault });

      expect(preventDefault).toHaveBeenCalled();
      expect(wrapper.emitted("click")).toBeTruthy();
      expect(wrapper.emitted("click")?.length).toBe(1);
    });

    it("does not emit click event on key press when interactive is false", async () => {
      const wrapper = createWrapper({
        interactive: false,
      });

      await wrapper.trigger("keydown.enter");
      await wrapper.trigger("keydown.space");

      expect(wrapper.emitted("click")).toBeFalsy();
    });
  });

  // Accessibility Tests
  describe("Accessibility", () => {
    it("has tabindex attribute when interactive", () => {
      const wrapper = createWrapper({
        interactive: true,
      });

      expect(wrapper.attributes("tabindex")).toBe("0");
    });

    it("does not have tabindex attribute when not interactive", () => {
      const wrapper = createWrapper({
        interactive: false,
      });

      expect(wrapper.attributes("tabindex")).toBeUndefined();
    });
  });

  // Complex Scenarios
  describe("Complex Scenarios", () => {
    it("renders a full card with all sections and custom styling", () => {
      const wrapper = createWrapper(
        {
          title: "Card Title",
          variant: "elevated",
          size: "large",
          interactive: true,
          padding: "2rem",
          maxWidth: "600px",
          minHeight: "300px",
        },
        {
          headerActions: "<button>Edit</button>",
          default: "<p>Card content</p>",
          footer: "<button>Save</button><button>Cancel</button>",
        },
      );

      // Check structure
      expect(wrapper.find(".n-card").exists()).toBe(true);
      expect(wrapper.find(".n-card-header").exists()).toBe(true);
      expect(wrapper.find(".n-card-title").exists()).toBe(true);
      expect(wrapper.find(".n-card-header-actions").exists()).toBe(true);
      expect(wrapper.find(".n-card-body").exists()).toBe(true);
      expect(wrapper.find(".n-card-footer").exists()).toBe(true);

      // Check content
      expect(wrapper.find(".n-card-title").text()).toBe("Card Title");
      expect(wrapper.find(".n-card-body").text()).toBe("Card content");
      expect(wrapper.find(".n-card-footer").text()).toContain("Save");
      expect(wrapper.find(".n-card-footer").text()).toContain("Cancel");

      // Check styling
      expect(wrapper.classes()).toContain("n-card--elevated");
      expect(wrapper.classes()).toContain("n-card--large");
      expect(wrapper.classes()).toContain("n-card--interactive");
      expect(wrapper.find(".n-card-body").attributes("style")).toContain(
        "padding: 2rem",
      );
      expect(wrapper.find(".n-card-body").attributes("style")).toContain(
        "min-height: 300px",
      );

      // Check interactivity
      expect(wrapper.attributes("tabindex")).toBe("0");
    });

    it("handles multiple nested slots correctly", () => {
      const wrapper = mount(Card, {
        slots: {
          title: "<div>Title with <strong>HTML</strong></div>",
          headerActions: `
            <div class="actions">
              <button>Edit</button>
              <button>Delete</button>
            </div>
          `,
          default: `
            <div class="content">
              <h3>Section 1</h3>
              <p>Content 1</p>
              <h3>Section 2</h3>
              <p>Content 2</p>
            </div>
          `,
          footer: `
            <div class="footer-left">Left</div>
            <div class="footer-right">Right</div>
          `,
        },
      });

      // Check that nested HTML in slots renders correctly
      expect(wrapper.find(".n-card-title").html()).toContain(
        "<strong>HTML</strong>",
      );
      expect(wrapper.find(".actions").exists()).toBe(true);
      expect(wrapper.find(".actions").findAll("button").length).toBe(2);
      expect(wrapper.find(".content").exists()).toBe(true);
      expect(wrapper.find(".content").findAll("h3").length).toBe(2);
      expect(wrapper.find(".footer-left").exists()).toBe(true);
      expect(wrapper.find(".footer-right").exists()).toBe(true);
    });
  });
});
