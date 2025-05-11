import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import Alert from "@/components/ui/feedback/Alert.vue";

describe("Alert.vue", () => {
  // Clear all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly with default props", () => {
    const wrapper = mount(Alert, {
      slots: {
        default: "Test message",
      },
    });

    expect(wrapper.text()).toContain("Test message");
    expect(wrapper.classes()).toContain("n-alert--info");
    expect(wrapper.classes()).toContain("n-alert--bordered");
    expect(wrapper.classes()).toContain("n-alert--rounded");
    expect(wrapper.find(".n-alert__dismiss").exists()).toBe(false);
  });

  it("renders with different variants", async () => {
    const wrapper = mount(Alert, {
      props: {
        variant: "success",
      },
      slots: {
        default: "Success message",
      },
    });

    expect(wrapper.classes()).toContain("n-alert--success");

    await wrapper.setProps({ variant: "warning" });
    expect(wrapper.classes()).toContain("n-alert--warning");

    await wrapper.setProps({ variant: "error" });
    expect(wrapper.classes()).toContain("n-alert--error");
  });

  it("renders with title", () => {
    const wrapper = mount(Alert, {
      props: {
        title: "Alert Title",
      },
      slots: {
        default: "Alert message",
      },
    });

    expect(wrapper.find(".n-alert__title").text()).toBe("Alert Title");
  });

  it("renders with title slot override", () => {
    const wrapper = mount(Alert, {
      props: {
        title: "Default Title",
      },
      slots: {
        default: "Alert message",
        title: "Custom Title",
      },
    });

    expect(wrapper.find(".n-alert__title").text()).toBe("Custom Title");
  });

  it("renders with dismiss button when dismissible", () => {
    const wrapper = mount(Alert, {
      props: {
        dismissible: true,
      },
      slots: {
        default: "Dismissible message",
      },
    });

    expect(wrapper.find(".n-alert__dismiss").exists()).toBe(true);
  });

  it("emits dismiss event when close button is clicked", async () => {
    const wrapper = mount(Alert, {
      props: {
        dismissible: true,
      },
      slots: {
        default: "Dismissible message",
      },
    });

    await wrapper.find(".n-alert__dismiss").trigger("click");
    expect(wrapper.emitted("dismiss")).toBeTruthy();
    expect(wrapper.emitted("dismiss")?.length).toBe(1);
  });

  it("renders with solid style when solid prop is true", async () => {
    const wrapper = mount(Alert, {
      props: {
        solid: true,
      },
      slots: {
        default: "Solid alert",
      },
    });

    expect(wrapper.classes()).toContain("n-alert--solid");
  });

  it("renders with appropriate ARIA attributes", () => {
    const wrapper = mount(Alert, {
      slots: {
        default: "Accessible alert",
      },
    });

    expect(wrapper.attributes("role")).toBe("alert");
    expect(wrapper.attributes("aria-live")).toBe("polite");
    expect(wrapper.attributes("aria-atomic")).toBe("true");

    const dismissibleWrapper = mount(Alert, {
      props: {
        dismissible: true,
      },
      slots: {
        default: "Dismissible alert",
      },
    });

    expect(dismissibleWrapper.attributes("role")).toBe("alertdialog");
  });

  it("renders with custom icon when provided", () => {
    const CustomIcon = {
      template: '<svg data-testid="custom-icon"></svg>',
    };

    const wrapper = mount(Alert, {
      props: {
        icon: CustomIcon,
      },
      slots: {
        default: "Alert with custom icon",
      },
    });

    expect(wrapper.find('[data-testid="custom-icon"]').exists()).toBe(true);
  });

  it("auto-dismisses when autoDismiss prop is provided", async () => {
    vi.useFakeTimers();

    const wrapper = mount(Alert, {
      props: {
        autoDismiss: 1000,
        dismissible: true,
      },
      slots: {
        default: "Auto-dismissing alert",
      },
    });

    vi.advanceTimersByTime(1100);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("dismiss")).toBeTruthy();
    expect(wrapper.emitted("dismiss")?.length).toBe(1);

    vi.useRealTimers();
  });

  it("renders with actions slot", () => {
    const wrapper = mount(Alert, {
      slots: {
        default: "Alert with actions",
        actions: "<button>Action</button>",
      },
    });

    expect(wrapper.find(".n-alert__actions").exists()).toBe(true);
    expect(wrapper.find(".n-alert__actions button").exists()).toBe(true);
  });

  it("renders with appropriate elevation class", async () => {
    const wrapper = mount(Alert, {
      props: {
        elevation: 2,
      },
      slots: {
        default: "Elevated alert",
      },
    });

    expect(wrapper.classes()).toContain("n-alert--elevation-2");

    await wrapper.setProps({ elevation: 3 });
    expect(wrapper.classes()).toContain("n-alert--elevation-3");
  });
});
