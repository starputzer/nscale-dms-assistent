import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import Drawer from "@/components/layout/Drawer.vue";

// Mock focus trap composable
vi.mock("@/composables/useFocusTrap", () => ({
  useFocusTrap: () => ({
    activate: vi.fn(),
    deactivate: vi.fn(),
    isActive: false,
  }),
}));

describe("Drawer.vue", () => {
  // Global container for teleported components
  const createContainer = (): HTMLElement => {
    const container = document.createElement("div");
    container.id = "teleport-container";
    document.body.appendChild(container);
    return container;
  };

  // Type for wrapper to handle teleported content
  type ExtendedVueWrapper = VueWrapper<any> & {
    findDrawer: () => VueWrapper<any> | null;
    findBackdrop: () => VueWrapper<any> | null;
  };

  const createWrapper = (props = {}): ExtendedVueWrapper => {
    const wrapper = mount(Drawer, {
      props: {
        modelValue: true,
        ...props,
      },
      slots: {
        default: '<div class="test-content">Drawer Content</div>',
        header: '<div class="test-header">Custom Header</div>',
        footer: '<div class="test-footer">Custom Footer</div>',
      },
      attachTo: document.body,
    }) as ExtendedVueWrapper;

    // Add helper methods to find teleported elements
    wrapper.findDrawer = () => {
      const drawer = document.querySelector(".n-drawer");
      return drawer ? wrapper.findComponent({ element: drawer }) : null;
    };

    wrapper.findBackdrop = () => {
      const backdrop = document.querySelector(".n-drawer-backdrop");
      return backdrop ? wrapper.findComponent({ element: backdrop }) : null;
    };

    return wrapper;
  };

  // Clean up after each test
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("renders correctly when modelValue is true", async () => {
    const wrapper = createWrapper();
    await nextTick();

    const drawer = wrapper.findDrawer();
    expect(drawer).not.toBeNull();
    expect(drawer!.isVisible()).toBe(true);
    expect(drawer!.find(".test-content").exists()).toBe(true);
    expect(drawer!.find(".test-header").exists()).toBe(true);
    expect(drawer!.find(".test-footer").exists()).toBe(true);
  });

  it("does not render when modelValue is false", async () => {
    const wrapper = createWrapper({ modelValue: false });
    await nextTick();

    const drawer = wrapper.findDrawer();
    expect(drawer).not.toBeNull();
    expect(drawer!.isVisible()).toBe(false);
  });

  it("applies correct position class based on position prop", async () => {
    const positions = ["left", "right", "top", "bottom"];

    for (const position of positions) {
      const wrapper = createWrapper({ position });
      await nextTick();

      const drawer = wrapper.findDrawer();
      expect(drawer!.classes()).toContain(`n-drawer--position-${position}`);
    }
  });

  it("applies correct size class based on size prop", async () => {
    const sizes = ["small", "medium", "large", "xlarge"];

    for (const size of sizes) {
      const wrapper = createWrapper({ size });
      await nextTick();

      const drawer = wrapper.findDrawer();
      expect(drawer!.classes()).toContain(`n-drawer--size-${size}`);
    }
  });

  it("renders with custom size when customSize prop is provided", async () => {
    const wrapper = createWrapper({
      position: "right",
      customSize: "400px",
    });
    await nextTick();

    const drawer = wrapper.findDrawer();
    expect(drawer!.attributes("style")).toContain("width: 400px");
  });

  it("renders without border when bordered prop is false", async () => {
    const wrapper = createWrapper({ bordered: false });
    await nextTick();

    const drawer = wrapper.findDrawer();
    expect(drawer!.classes()).toContain("n-drawer--borderless");
  });

  it("renders with elevation when elevated prop is true", async () => {
    const wrapper = createWrapper({ elevated: true });
    await nextTick();

    const drawer = wrapper.findDrawer();
    expect(drawer!.classes()).toContain("n-drawer--elevated");
  });

  it("renders title when title prop is provided", async () => {
    const wrapper = createWrapper({ title: "Test Drawer" });
    await nextTick();

    const drawer = wrapper.findDrawer();
    expect(drawer!.find(".n-drawer__title").text()).toBe("Test Drawer");
  });

  it("renders close button when showCloseButton is true", async () => {
    const wrapper = createWrapper({ showCloseButton: true });
    await nextTick();

    const drawer = wrapper.findDrawer();
    expect(drawer!.find(".n-drawer__close-button").exists()).toBe(true);
  });

  it("hides close button when showCloseButton is false", async () => {
    const wrapper = createWrapper({ showCloseButton: false, title: "Test" });
    await nextTick();

    const drawer = wrapper.findDrawer();
    expect(drawer!.find(".n-drawer__close-button").exists()).toBe(false);
  });

  it("renders backdrop when hasBackdrop is true", async () => {
    const wrapper = createWrapper({ hasBackdrop: true });
    await nextTick();

    const backdrop = wrapper.findBackdrop();
    expect(backdrop).not.toBeNull();
    expect(backdrop!.isVisible()).toBe(true);
  });

  it("does not render backdrop when hasBackdrop is false", async () => {
    const wrapper = createWrapper({ hasBackdrop: false });
    await nextTick();

    const backdrop = wrapper.findBackdrop();
    expect(backdrop).toBeNull();
  });

  it("emits close event when close button is clicked", async () => {
    const wrapper = createWrapper();
    await nextTick();

    const drawer = wrapper.findDrawer();
    await drawer!.find(".n-drawer__close-button").trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")[0]).toEqual([false]);
  });

  it("emits close event when backdrop is clicked and closeOnBackdropClick is true", async () => {
    const wrapper = createWrapper({ closeOnBackdropClick: true });
    await nextTick();

    const backdrop = wrapper.findBackdrop();
    await backdrop!.trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")[0]).toEqual([false]);
  });

  it("does not emit close event when backdrop is clicked and closeOnBackdropClick is false", async () => {
    const wrapper = createWrapper({ closeOnBackdropClick: false });
    await nextTick();

    const backdrop = wrapper.findBackdrop();
    await backdrop!.trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeFalsy();
  });

  it("emits close event when ESC key is pressed and closeOnEscape is true", async () => {
    const wrapper = createWrapper({ closeOnEscape: true });
    await nextTick();

    const drawer = wrapper.findDrawer();
    await drawer!.trigger("keydown.esc");

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")[0]).toEqual([false]);
  });

  it("does not emit close event when ESC key is pressed and closeOnEscape is false", async () => {
    const wrapper = createWrapper({ closeOnEscape: false });
    await nextTick();

    const drawer = wrapper.findDrawer();
    await drawer!.trigger("keydown.esc");

    expect(wrapper.emitted("update:modelValue")).toBeFalsy();
  });

  it("renders in fullscreen mode when fullScreen prop is true", async () => {
    const wrapper = createWrapper({ fullScreen: true });
    await nextTick();

    const drawer = wrapper.findDrawer();
    expect(drawer!.classes()).toContain("n-drawer--fullscreen");
  });

  it("applies correct z-index when zIndex prop is provided", async () => {
    const wrapper = createWrapper({ zIndex: 2000 });
    await nextTick();

    const drawer = wrapper.findDrawer();
    expect(drawer!.attributes("style")).toContain("z-index: 2000");
  });

  it("applies bordered header when headerBordered is true", async () => {
    const wrapper = createWrapper({ headerBordered: true });
    await nextTick();

    const drawer = wrapper.findDrawer();
    expect(drawer!.find(".n-drawer__header").classes()).toContain(
      "n-drawer__header--with-border",
    );
  });

  it("applies bordered footer when footerBordered is true", async () => {
    const wrapper = createWrapper({ footerBordered: true });
    await nextTick();

    const drawer = wrapper.findDrawer();
    expect(drawer!.find(".n-drawer__footer").classes()).toContain(
      "n-drawer__footer--with-border",
    );
  });

  it("exposes open and close methods", async () => {
    const wrapper = createWrapper({ modelValue: false });
    await nextTick();

    // Test programmatic open
    wrapper.vm.open();
    await nextTick();
    expect(wrapper.emitted("open")).toBeTruthy();

    // Test programmatic close
    wrapper.vm.close();
    await nextTick();
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")[0]).toEqual([false]);
  });
});
