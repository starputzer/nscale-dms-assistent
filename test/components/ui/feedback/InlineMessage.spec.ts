import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import InlineMessage from "@/components/ui/feedback/InlineMessage.vue";

describe("InlineMessage.vue", () => {
  it("renders correctly with default props", () => {
    const wrapper = mount(InlineMessage, {
      slots: {
        default: "Test message",
      },
    });

    expect(wrapper.text()).toContain("Test message");
    expect(wrapper.classes()).toContain("n-inline-message--info");
    expect(wrapper.classes()).toContain("n-inline-message--medium");
    expect(wrapper.classes()).toContain("n-inline-message--with-icon");
    expect(wrapper.attributes("role")).toBe("status");
  });

  it("renders with different variants", async () => {
    const wrapper = mount(InlineMessage, {
      props: {
        variant: "success",
      },
      slots: {
        default: "Success message",
      },
    });

    expect(wrapper.classes()).toContain("n-inline-message--success");

    await wrapper.setProps({ variant: "warning" });
    expect(wrapper.classes()).toContain("n-inline-message--warning");

    await wrapper.setProps({ variant: "error" });
    expect(wrapper.classes()).toContain("n-inline-message--error");
  });

  it("renders with different sizes", async () => {
    const wrapper = mount(InlineMessage, {
      props: {
        size: "small",
      },
      slots: {
        default: "Small message",
      },
    });

    expect(wrapper.classes()).toContain("n-inline-message--small");

    await wrapper.setProps({ size: "medium" });
    expect(wrapper.classes()).toContain("n-inline-message--medium");

    await wrapper.setProps({ size: "large" });
    expect(wrapper.classes()).toContain("n-inline-message--large");
  });

  it("renders without icon when showIcon is false", async () => {
    const wrapper = mount(InlineMessage, {
      props: {
        showIcon: false,
      },
      slots: {
        default: "Message without icon",
      },
    });

    expect(wrapper.classes()).not.toContain("n-inline-message--with-icon");
    expect(wrapper.find(".n-inline-message__icon").exists()).toBe(false);
  });

  it("renders with custom icon slot", () => {
    const wrapper = mount(InlineMessage, {
      slots: {
        default: "Message with custom icon",
        icon: '<span class="custom-icon">!</span>',
      },
    });

    expect(wrapper.find(".n-inline-message__icon").exists()).toBe(true);
    expect(wrapper.find(".custom-icon").exists()).toBe(true);
    expect(wrapper.find(".custom-icon").text()).toBe("!");
  });

  it("renders with different ARIA roles", async () => {
    const wrapper = mount(InlineMessage, {
      props: {
        role: "alert",
      },
      slots: {
        default: "Alert message",
      },
    });

    expect(wrapper.attributes("role")).toBe("alert");

    await wrapper.setProps({ role: "note" });
    expect(wrapper.attributes("role")).toBe("note");
  });

  it("renders success variant icon correctly", () => {
    const wrapper = mount(InlineMessage, {
      props: {
        variant: "success",
        showIcon: true,
      },
      slots: {
        default: "Success message with icon",
      },
    });

    expect(wrapper.find(".n-inline-message__icon").exists()).toBe(true);
    // We can't directly test the SVG component, but we can check it's present
    const iconContainer = wrapper.find(".n-inline-message__icon");
    expect(iconContainer.element.innerHTML).not.toBe("");
  });

  it("renders content correctly", () => {
    const wrapper = mount(InlineMessage, {
      slots: {
        default: "<strong>Bold</strong> message",
      },
    });

    expect(wrapper.find(".n-inline-message__content").html()).toContain(
      "<strong>Bold</strong> message",
    );
  });

  it("applies aria-live attribute correctly", () => {
    const wrapper = mount(InlineMessage, {
      slots: {
        default: "Accessible message",
      },
    });

    expect(wrapper.attributes("aria-live")).toBe("polite");
  });
});
