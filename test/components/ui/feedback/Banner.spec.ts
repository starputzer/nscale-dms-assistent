import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import Banner from "@/components/ui/feedback/Banner.vue";

describe("Banner.vue", () => {
  // Clear all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly with default props", () => {
    const wrapper = mount(Banner, {
      slots: {
        default: "Test banner message",
      },
    });

    expect(wrapper.text()).toContain("Test banner message");
    expect(wrapper.classes()).toContain("n-banner--info");
    expect(wrapper.classes()).toContain("n-banner--top");
    expect(wrapper.find(".n-banner__dismiss").exists()).toBe(true);
  });

  it("renders with different variants", async () => {
    const wrapper = mount(Banner, {
      props: {
        variant: "success",
      },
      slots: {
        default: "Success banner",
      },
    });

    expect(wrapper.classes()).toContain("n-banner--success");

    await wrapper.setProps({ variant: "warning" });
    expect(wrapper.classes()).toContain("n-banner--warning");

    await wrapper.setProps({ variant: "error" });
    expect(wrapper.classes()).toContain("n-banner--error");

    await wrapper.setProps({ variant: "neutral" });
    expect(wrapper.classes()).toContain("n-banner--neutral");
  });

  it("renders with title", () => {
    const wrapper = mount(Banner, {
      props: {
        title: "Banner Title",
      },
      slots: {
        default: "Banner message",
      },
    });

    expect(wrapper.find(".n-banner__title").text()).toBe("Banner Title");
  });

  it("renders with title slot override", () => {
    const wrapper = mount(Banner, {
      props: {
        title: "Default Title",
      },
      slots: {
        default: "Banner message",
        title: "Custom Title",
      },
    });

    expect(wrapper.find(".n-banner__title").text()).toBe("Custom Title");
  });

  it("renders without dismiss button when dismissible is false", async () => {
    const wrapper = mount(Banner, {
      props: {
        dismissible: false,
      },
      slots: {
        default: "Non-dismissible banner",
      },
    });

    expect(wrapper.find(".n-banner__dismiss").exists()).toBe(false);
  });

  it("emits dismiss event when close button is clicked", async () => {
    const wrapper = mount(Banner, {
      props: {
        dismissible: true,
      },
      slots: {
        default: "Dismissible banner",
      },
    });

    await wrapper.find(".n-banner__dismiss").trigger("click");
    expect(wrapper.emitted("dismiss")).toBeTruthy();
    expect(wrapper.emitted("dismiss")?.length).toBe(1);
    expect(wrapper.emitted("update:visible")).toBeTruthy();
    expect(wrapper.emitted("update:visible")?.[0]).toEqual([false]);
  });

  it("renders with sticky positioning", async () => {
    const wrapper = mount(Banner, {
      props: {
        sticky: true,
      },
      slots: {
        default: "Sticky banner",
      },
    });

    expect(wrapper.classes()).toContain("n-banner--sticky");
  });

  it("respects the visible prop", async () => {
    const wrapper = mount(Banner, {
      props: {
        visible: false,
      },
      slots: {
        default: "Hidden banner",
      },
    });

    expect(wrapper.find(".n-banner").exists()).toBe(false);

    await wrapper.setProps({ visible: true });
    expect(wrapper.find(".n-banner").exists()).toBe(true);
  });

  it("renders in bottom position", async () => {
    const wrapper = mount(Banner, {
      props: {
        position: "bottom",
      },
      slots: {
        default: "Bottom banner",
      },
    });

    expect(wrapper.classes()).toContain("n-banner--bottom");
  });

  it("renders actions correctly", async () => {
    const actions = [
      { label: "Primary Action", type: "primary" },
      { label: "Secondary Action", type: "secondary" },
    ];

    const wrapper = mount(Banner, {
      props: {
        actions,
      },
      slots: {
        default: "Banner with actions",
      },
    });

    const actionButtons = wrapper.findAll(".n-banner__action");
    expect(actionButtons.length).toBe(2);
    expect(actionButtons[0].text()).toBe("Primary Action");
    expect(actionButtons[0].classes()).toContain("n-banner__action--primary");
    expect(actionButtons[1].text()).toBe("Secondary Action");
    expect(actionButtons[1].classes()).toContain("n-banner__action--secondary");
  });

  it("emits action event when an action is clicked", async () => {
    const mockHandler = vi.fn();
    const actions = [
      {
        label: "Test Action",
        type: "primary",
        handler: mockHandler,
      },
    ];

    const wrapper = mount(Banner, {
      props: {
        actions,
      },
      slots: {
        default: "Banner with action",
      },
    });

    await wrapper.find(".n-banner__action").trigger("click");
    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("action")).toBeTruthy();
    expect(wrapper.emitted("action")?.length).toBe(1);
    expect(wrapper.emitted("action")?.[0][0]).toEqual(actions[0]);
  });

  it("auto-dismisses when autoDismiss prop is provided", async () => {
    vi.useFakeTimers();

    const wrapper = mount(Banner, {
      props: {
        autoDismiss: 1000,
      },
      slots: {
        default: "Auto-dismissing banner",
      },
    });

    vi.advanceTimersByTime(1100);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("dismiss")).toBeTruthy();
    expect(wrapper.emitted("dismiss")?.length).toBe(1);
    expect(wrapper.emitted("update:visible")).toBeTruthy();
    expect(wrapper.emitted("update:visible")?.[0]).toEqual([false]);

    vi.useRealTimers();
  });

  it("renders with actions slot", () => {
    const wrapper = mount(Banner, {
      slots: {
        default: "Banner with actions slot",
        actions: "<button>Custom Action</button>",
      },
    });

    expect(wrapper.find(".n-banner__actions").exists()).toBe(true);
    expect(wrapper.find(".n-banner__actions button").text()).toBe(
      "Custom Action",
    );
  });

  it("renders with icon", async () => {
    const wrapper = mount(Banner, {
      props: {
        showIcon: true,
        variant: "info",
      },
      slots: {
        default: "Banner with icon",
      },
    });

    expect(wrapper.find(".n-banner__icon").exists()).toBe(true);

    await wrapper.setProps({ showIcon: false });
    expect(wrapper.find(".n-banner__icon").exists()).toBe(false);
  });

  it("applies full width class by default", () => {
    const wrapper = mount(Banner, {
      slots: {
        default: "Full width banner",
      },
    });

    expect(wrapper.classes()).toContain("n-banner--full-width");
  });
});
