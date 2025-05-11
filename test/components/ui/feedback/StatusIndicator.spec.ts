import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import StatusIndicator from "@/components/ui/feedback/StatusIndicator.vue";

describe("StatusIndicator.vue", () => {
  it("renders correctly with default props", () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        variant: "success",
      },
    });

    expect(wrapper.classes()).toContain("n-status-indicator--success");
    expect(wrapper.classes()).toContain("n-status-indicator--medium");
    expect(wrapper.find(".n-status-indicator__dot").exists()).toBe(true);
    expect(wrapper.attributes("role")).toBe("status");
  });

  it("renders with different variants", async () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        variant: "warning",
      },
    });

    expect(wrapper.classes()).toContain("n-status-indicator--warning");

    await wrapper.setProps({ variant: "error" });
    expect(wrapper.classes()).toContain("n-status-indicator--error");

    await wrapper.setProps({ variant: "info" });
    expect(wrapper.classes()).toContain("n-status-indicator--info");

    await wrapper.setProps({ variant: "neutral" });
    expect(wrapper.classes()).toContain("n-status-indicator--neutral");
  });

  it("renders with different sizes", async () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        variant: "success",
        size: "small",
      },
    });

    expect(wrapper.classes()).toContain("n-status-indicator--small");

    await wrapper.setProps({ size: "medium" });
    expect(wrapper.classes()).toContain("n-status-indicator--medium");

    await wrapper.setProps({ size: "large" });
    expect(wrapper.classes()).toContain("n-status-indicator--large");
  });

  it("renders with text", () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        variant: "success",
        text: "Online",
      },
    });

    expect(wrapper.find(".n-status-indicator__text").exists()).toBe(true);
    expect(wrapper.find(".n-status-indicator__text").text()).toBe("Online");
    expect(wrapper.classes()).toContain("n-status-indicator--with-text");
  });

  it("renders without text when showText is false", async () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        variant: "success",
        text: "Online",
        showText: false,
      },
    });

    expect(wrapper.find(".n-status-indicator__text").exists()).toBe(false);
    expect(wrapper.classes()).not.toContain("n-status-indicator--with-text");
  });

  it("renders with pulse animation", () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        variant: "success",
        pulse: true,
      },
    });

    expect(wrapper.classes()).toContain("n-status-indicator--pulse");
  });

  it("renders without dot for none variant", () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        variant: "none",
        text: "Status text only",
      },
    });

    expect(wrapper.find(".n-status-indicator__dot").exists()).toBe(false);
    expect(wrapper.find(".n-status-indicator__text").exists()).toBe(true);
  });

  it("renders with custom text via slot", () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        variant: "success",
        text: "Default text",
      },
      slots: {
        default: "Custom text",
      },
    });

    expect(wrapper.find(".n-status-indicator__text").text()).toBe(
      "Custom text",
    );
  });

  it("respects aria-label attribute", () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        variant: "success",
        text: "Online",
        ariaLabel: "System is online",
      },
    });

    expect(wrapper.attributes("aria-label")).toBe("System is online");
  });

  it("renders text correctly when both text prop and slot are provided", () => {
    const wrapper = mount(StatusIndicator, {
      props: {
        variant: "success",
        text: "Prop Text",
      },
      slots: {
        default: "Slot Text",
      },
    });

    expect(wrapper.find(".n-status-indicator__text").text()).toBe("Slot Text");
  });
});
