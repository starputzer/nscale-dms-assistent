import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import Badge from "@/components/ui/base/Badge.vue";

describe("Badge Component", () => {
  // Basic rendering
  it("renders properly with default props", () => {
    const wrapper = mount(Badge);
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.classes()).toContain("n-badge");
    expect(wrapper.classes()).toContain("n-badge--default");
    expect(wrapper.classes()).toContain("n-badge--medium");
    expect(wrapper.classes()).toContain("n-badge--top-right");
  });

  it("renders with a string value", () => {
    const wrapper = mount(Badge, {
      props: {
        value: "New",
      },
    });
    expect(wrapper.attributes("data-content")).toBe("New");
  });

  it("renders with a numeric value", () => {
    const wrapper = mount(Badge, {
      props: {
        value: 10,
      },
    });
    expect(wrapper.attributes("data-content")).toBe("10");
  });

  // Value formatting
  it("formats numbers exceeding max", () => {
    const wrapper = mount(Badge, {
      props: {
        value: 150,
        max: 99,
      },
    });
    expect(wrapper.attributes("data-content")).toBe("99+");
  });

  it("renders the value when showValue is true", () => {
    const wrapper = mount(Badge, {
      props: {
        value: "Test",
        showValue: true,
      },
    });
    expect(wrapper.find(".n-badge__content").text()).toBe("Test");
  });

  it("does not render the value when showValue is false", () => {
    const wrapper = mount(Badge, {
      props: {
        value: "Test",
        showValue: false,
      },
    });
    expect(wrapper.find(".n-badge__content").exists()).toBe(false);
  });

  // Variants
  it("applies the correct variant class", () => {
    const variants = [
      "default",
      "primary",
      "success",
      "warning",
      "error",
      "info",
    ];

    variants.forEach((variant) => {
      const wrapper = mount(Badge, {
        props: { variant },
      });
      expect(wrapper.classes()).toContain(`n-badge--${variant}`);
    });
  });

  // Sizes
  it("applies the correct size class", () => {
    const sizes = ["small", "medium", "large"];

    sizes.forEach((size) => {
      const wrapper = mount(Badge, {
        props: { size },
      });
      expect(wrapper.classes()).toContain(`n-badge--${size}`);
    });
  });

  // Positions
  it("applies the correct position class", () => {
    const positions = ["top-right", "top-left", "bottom-right", "bottom-left"];

    positions.forEach((position) => {
      const wrapper = mount(Badge, {
        props: { position },
      });
      expect(wrapper.classes()).toContain(`n-badge--${position}`);
    });
  });

  // Special variants
  it("applies the dot class when dot is true", () => {
    const wrapper = mount(Badge, {
      props: {
        dot: true,
      },
    });
    expect(wrapper.classes()).toContain("n-badge--dot");
    expect(wrapper.find(".n-badge__content").exists()).toBe(false);
  });

  it("applies the pill class when pill is true", () => {
    const wrapper = mount(Badge, {
      props: {
        pill: true,
      },
    });
    expect(wrapper.classes()).toContain("n-badge--pill");
  });

  it("applies the hidden class when hidden is true", () => {
    const wrapper = mount(Badge, {
      props: {
        hidden: true,
      },
    });
    expect(wrapper.classes()).toContain("n-badge--hidden");
  });

  // Standalone vs. wrapper usage
  it("has standalone class when no default slot is provided", () => {
    const wrapper = mount(Badge);
    expect(wrapper.classes()).toContain("n-badge--standalone");
  });

  it("does not have standalone class when default slot is provided", () => {
    const wrapper = mount(Badge, {
      slots: {
        default: "<div>Content</div>",
      },
    });
    expect(wrapper.classes()).not.toContain("n-badge--standalone");
  });

  // Accessibility
  it("has correct ARIA attributes", () => {
    const wrapper = mount(Badge, {
      props: {
        value: 5,
        ariaLabel: "Notifications: 5 unread",
      },
    });
    expect(wrapper.attributes("role")).toBe("status");
    expect(wrapper.attributes("aria-label")).toBe("Notifications: 5 unread");
  });

  it("does not have aria-label when dot is true", () => {
    const wrapper = mount(Badge, {
      props: {
        dot: true,
        ariaLabel: "This should not appear",
      },
    });
    expect(wrapper.attributes("aria-label")).toBeUndefined();
  });

  // Animation
  it("applies animated class when value changes", async () => {
    const wrapper = mount(Badge, {
      props: {
        value: 1,
        animated: true,
      },
    });

    await wrapper.setProps({ value: 2 });
    expect(wrapper.classes()).toContain("n-badge--animated");
  });
});
