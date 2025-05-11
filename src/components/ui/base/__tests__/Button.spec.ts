import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Button from "../Button.vue";

describe("Button", () => {
  // Test rendering and basic props
  it("renders correctly with default props", () => {
    const wrapper = mount(Button, {
      slots: {
        default: "Button Text",
      },
    });

    expect(wrapper.text()).toBe("Button Text");
    expect(wrapper.classes()).toContain("n-button");
    expect(wrapper.classes()).toContain("n-button--primary");
    expect(wrapper.classes()).toContain("n-button--medium");
    expect(wrapper.attributes("type")).toBe("button");
    expect(wrapper.attributes("disabled")).toBeUndefined();
  });

  // Test variants
  it("applies variant class correctly", async () => {
    const wrapper = mount(Button, {
      props: { variant: "secondary" },
    });

    expect(wrapper.classes()).toContain("n-button--secondary");

    await wrapper.setProps({ variant: "danger" });
    expect(wrapper.classes()).toContain("n-button--danger");
  });

  // Test sizes
  it("applies size class correctly", async () => {
    const wrapper = mount(Button, {
      props: { size: "small" },
    });

    expect(wrapper.classes()).toContain("n-button--small");

    await wrapper.setProps({ size: "large" });
    expect(wrapper.classes()).toContain("n-button--large");
  });

  // Test disabled state
  it("disables the button when disabled prop is true", async () => {
    const wrapper = mount(Button, {
      props: { disabled: true },
    });

    expect(wrapper.attributes("disabled")).toBe("");

    await wrapper.setProps({ disabled: false });
    expect(wrapper.attributes("disabled")).toBeUndefined();
  });

  // Test loading state
  it("shows loader and disables button when loading prop is true", async () => {
    const wrapper = mount(Button, {
      props: { loading: true },
      slots: {
        default: "Loading Button",
      },
    });

    expect(wrapper.attributes("disabled")).toBe("");
    expect(wrapper.find(".n-button__loader").exists()).toBe(true);
    expect(wrapper.find(".n-button__content--hidden").exists()).toBe(true);

    await wrapper.setProps({ loading: false });
    expect(wrapper.attributes("disabled")).toBeUndefined();
    expect(wrapper.find(".n-button__loader").exists()).toBe(false);
    expect(wrapper.find(".n-button__content--hidden").exists()).toBe(false);
  });

  // Test click events
  it("emits click event when clicked", async () => {
    const wrapper = mount(Button);

    await wrapper.trigger("click");
    expect(wrapper.emitted("click")).toBeTruthy();
    expect(wrapper.emitted("click")?.length).toBe(1);
  });

  // Test that click events are not emitted when disabled
  it("does not emit click event when disabled", async () => {
    const wrapper = mount(Button, {
      props: { disabled: true },
    });

    await wrapper.trigger("click");
    expect(wrapper.emitted("click")).toBeFalsy();
  });

  // Test that click events are not emitted when loading
  it("does not emit click event when loading", async () => {
    const wrapper = mount(Button, {
      props: { loading: true },
    });

    await wrapper.trigger("click");
    expect(wrapper.emitted("click")).toBeFalsy();
  });

  // Test keyboard accessibility
  it("emits click event on Enter and Space keypress for accessibility", async () => {
    const wrapper = mount(Button);

    await wrapper.trigger("keydown.enter");
    expect(wrapper.emitted("click")).toBeTruthy();
    expect(wrapper.emitted("click")?.length).toBe(1);

    await wrapper.trigger("keydown.space");
    expect(wrapper.emitted("click")?.length).toBe(2);
  });

  // Test icon-only button
  it("applies icon-only class when iconOnly prop is true", () => {
    const wrapper = mount(Button, {
      props: {
        iconOnly: true,
        iconLeft: { template: "<span>Icon</span>" },
      },
    });

    expect(wrapper.classes()).toContain("n-button--icon-only");
  });

  // Test icons rendering
  it("renders left and right icons correctly", () => {
    const LeftIcon = { template: "<span>LeftIcon</span>" };
    const RightIcon = { template: "<span>RightIcon</span>" };

    const wrapper = mount(Button, {
      props: {
        iconLeft: LeftIcon,
        iconRight: RightIcon,
      },
      slots: {
        default: "Button With Icons",
      },
    });

    expect(wrapper.find(".n-button__icon--left").exists()).toBe(true);
    expect(wrapper.find(".n-button__icon--right").exists()).toBe(true);
    expect(wrapper.text()).toContain("LeftIcon");
    expect(wrapper.text()).toContain("RightIcon");
    expect(wrapper.text()).toContain("Button With Icons");
  });

  // Test full width
  it("applies full-width class when fullWidth prop is true", async () => {
    const wrapper = mount(Button, {
      props: { fullWidth: false },
    });

    expect(wrapper.classes()).not.toContain("n-button--full-width");

    await wrapper.setProps({ fullWidth: true });
    expect(wrapper.classes()).toContain("n-button--full-width");
  });
});
