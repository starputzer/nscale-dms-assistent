import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import Tabs from "@/components/ui/base/Tabs.vue";

describe("Tabs Component", () => {
  const defaultTabs = [
    { label: "Tab 1", id: "tab1" },
    { label: "Tab 2", id: "tab2" },
    { label: "Tab 3", id: "tab3", disabled: true },
  ];

  // Basic rendering
  it("renders properly with default props", () => {
    const wrapper = mount(Tabs, {
      props: {
        tabs: defaultTabs,
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.classes()).toContain("n-tabs");
    expect(wrapper.classes()).toContain("n-tabs--default");

    // Should render all tabs
    const tabElements = wrapper.findAll(".n-tabs__tab");
    expect(tabElements.length).toBe(3);

    // Default tab should be active
    const activeTabs = wrapper.findAll(".n-tabs__tab--active");
    expect(activeTabs.length).toBe(1);
    expect(activeTabs[0].text()).toContain("Tab 1");
  });

  it("renders tab labels correctly", () => {
    const wrapper = mount(Tabs, {
      props: {
        tabs: defaultTabs,
      },
    });

    const tabLabels = wrapper.findAll(".n-tabs__tab-label");
    expect(tabLabels[0].text()).toBe("Tab 1");
    expect(tabLabels[1].text()).toBe("Tab 2");
    expect(tabLabels[2].text()).toBe("Tab 3");
  });

  it("marks disabled tabs accordingly", () => {
    const wrapper = mount(Tabs, {
      props: {
        tabs: defaultTabs,
      },
    });

    const disabledTabs = wrapper.findAll(".n-tabs__tab--disabled");
    expect(disabledTabs.length).toBe(1);
    expect(disabledTabs[0].text()).toContain("Tab 3");
  });

  // Active tab
  it("sets the active tab based on modelValue", () => {
    const wrapper = mount(Tabs, {
      props: {
        tabs: defaultTabs,
        modelValue: 1,
      },
    });

    const activeTabs = wrapper.findAll(".n-tabs__tab--active");
    expect(activeTabs.length).toBe(1);
    expect(activeTabs[0].text()).toContain("Tab 2");
  });

  it("sets the active tab based on defaultTab when no modelValue", () => {
    const wrapper = mount(Tabs, {
      props: {
        tabs: defaultTabs,
        defaultTab: 1,
      },
    });

    const activeTabs = wrapper.findAll(".n-tabs__tab--active");
    expect(activeTabs.length).toBe(1);
    expect(activeTabs[0].text()).toContain("Tab 2");
  });

  // Tab panels
  it("shows the active tab panel", () => {
    const tabsWithComponents = [
      { label: "Tab 1", component: { template: "<div>Content 1</div>" } },
      { label: "Tab 2", component: { template: "<div>Content 2</div>" } },
    ];

    const wrapper = mount(Tabs, {
      props: {
        tabs: tabsWithComponents,
        modelValue: 0,
      },
    });

    const panels = wrapper.findAll(".n-tabs__panel");
    expect(panels.length).toBe(2);

    const activePanel = wrapper.find(".n-tabs__panel--active");
    expect(activePanel.text()).toContain("Content 1");
  });

  it("lazily loads tab content when lazy prop is true", async () => {
    const tabsWithComponents = [
      { label: "Tab 1", component: { template: "<div>Content 1</div>" } },
      { label: "Tab 2", component: { template: "<div>Content 2</div>" } },
    ];

    const wrapper = mount(Tabs, {
      props: {
        tabs: tabsWithComponents,
        modelValue: 0,
        lazy: true,
      },
    });

    // Initially, only active tab content should be rendered
    expect(wrapper.html()).toContain("Content 1");
    expect(wrapper.html()).not.toContain("Content 2");

    // Change active tab
    await wrapper.setProps({ modelValue: 1 });

    // Now second tab content should be rendered
    expect(wrapper.html()).toContain("Content 2");
  });

  // Tab interaction
  it("emits update:modelValue when clicking a tab", async () => {
    const wrapper = mount(Tabs, {
      props: {
        tabs: defaultTabs,
        modelValue: 0,
      },
    });

    // Click the second tab
    const secondTab = wrapper.findAll(".n-tabs__tab")[1];
    await secondTab.trigger("click");

    // Should emit update event
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")![0]).toEqual([1]);

    // Should also emit change event
    expect(wrapper.emitted("change")).toBeTruthy();
    expect(wrapper.emitted("change")![0][0]).toBe(1);
    expect(wrapper.emitted("change")![0][1]).toEqual(defaultTabs[1]);
  });

  it("does not emit events when clicking a disabled tab", async () => {
    const wrapper = mount(Tabs, {
      props: {
        tabs: defaultTabs,
        modelValue: 0,
      },
    });

    // Click the third tab (which is disabled)
    const disabledTab = wrapper.findAll(".n-tabs__tab")[2];
    await disabledTab.trigger("click");

    // Should not emit update event
    expect(wrapper.emitted("update:modelValue")).toBeFalsy();
    expect(wrapper.emitted("change")).toBeFalsy();
  });

  // Tab variants
  it("applies variant classes correctly", () => {
    const variants = ["default", "pills", "underline", "minimal"];

    variants.forEach((variant) => {
      const wrapper = mount(Tabs, {
        props: {
          tabs: defaultTabs,
          variant,
        },
      });
      expect(wrapper.classes()).toContain(`n-tabs--${variant}`);
    });
  });

  // Tab layout
  it("applies vertical layout when vertical prop is true", () => {
    const wrapper = mount(Tabs, {
      props: {
        tabs: defaultTabs,
        vertical: true,
      },
    });

    expect(wrapper.classes()).toContain("n-tabs--vertical");
  });

  it("applies stretch layout when stretch prop is true", () => {
    const wrapper = mount(Tabs, {
      props: {
        tabs: defaultTabs,
        stretch: true,
      },
    });

    expect(wrapper.classes()).toContain("n-tabs--stretch");
  });

  // Animation
  it("applies animated class when animated prop is true", () => {
    const wrapper = mount(Tabs, {
      props: {
        tabs: defaultTabs,
        animated: true,
      },
    });

    expect(wrapper.classes()).toContain("n-tabs--animated");
  });

  // Tab with icons and badges
  it("renders tab with icon when provided", () => {
    const mockIcon = {
      template: '<div class="mock-icon">Icon</div>',
    };

    const tabsWithIcons = [
      { label: "Tab 1", icon: mockIcon },
      { label: "Tab 2" },
    ];

    const wrapper = mount(Tabs, {
      props: {
        tabs: tabsWithIcons,
      },
    });

    expect(wrapper.find(".mock-icon").exists()).toBe(true);
  });

  it("renders tab with badge when provided", () => {
    const tabsWithBadges = [{ label: "Tab 1", badge: 5 }, { label: "Tab 2" }];

    const wrapper = mount(Tabs, {
      props: {
        tabs: tabsWithBadges,
      },
    });

    expect(wrapper.find(".n-tabs__tab-badge").exists()).toBe(true);
  });

  // ARIA attributes
  it("has correct ARIA attributes for accessibility", () => {
    const wrapper = mount(Tabs, {
      props: {
        tabs: defaultTabs,
        id: "test-tabs",
      },
    });

    const tabList = wrapper.find(".n-tabs__nav");
    expect(tabList.attributes("role")).toBe("tablist");
    expect(tabList.attributes("aria-orientation")).toBe("horizontal");

    const tabs = wrapper.findAll(".n-tabs__tab");
    expect(tabs[0].attributes("role")).toBe("tab");
    expect(tabs[0].attributes("aria-selected")).toBe("true");
    expect(tabs[0].attributes("id")).toBe("test-tabs-tab-0");
    expect(tabs[0].attributes("aria-controls")).toBe("test-tabs-panel-0");

    const panels = wrapper.findAll(".n-tabs__panel");
    expect(panels[0].attributes("role")).toBe("tabpanel");
    expect(panels[0].attributes("aria-labelledby")).toBe("test-tabs-tab-0");
    expect(panels[0].attributes("id")).toBe("test-tabs-panel-0");
  });

  // Dynamic tabs
  it("adjusts active tab when tabs change", async () => {
    const wrapper = mount(Tabs, {
      props: {
        tabs: defaultTabs,
        modelValue: 2,
      },
    });

    // Remove the last tab (which is active)
    await wrapper.setProps({
      tabs: defaultTabs.slice(0, 2),
    });

    // Should adjust to the last available tab
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")![0][0]).toBe(1);
  });
});
