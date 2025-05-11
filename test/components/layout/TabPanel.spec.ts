import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import TabPanel from "@/components/layout/TabPanel.vue";

describe("TabPanel.vue", () => {
  const defaultTabs = [
    { id: "tab1", label: "Tab 1", icon: "icon-home" },
    { id: "tab2", label: "Tab 2", icon: "icon-settings" },
    { id: "tab3", label: "Tab 3", icon: "icon-user" },
    {
      id: "tab4",
      label: "Tab 4",
      icon: "icon-chart",
      badge: "5",
      badgeColor: "#ff0000",
    },
    { id: "tab5", label: "Tab 5", icon: "icon-file", pinned: true },
  ];

  const createWrapper = (props = {}) => {
    return mount(TabPanel, {
      props: {
        tabs: defaultTabs,
        ...props,
      },
      slots: {
        tab1: '<div class="tab-content">Tab 1 Content</div>',
        tab2: '<div class="tab-content">Tab 2 Content</div>',
        tab3: '<div class="tab-content">Tab 3 Content</div>',
        tab4: '<div class="tab-content">Tab 4 Content</div>',
        tab5: '<div class="tab-content">Tab 5 Content</div>',
      },
      global: {
        stubs: {
          transition: false,
        },
      },
    });
  };

  it("renders correctly with default props", () => {
    const wrapper = createWrapper();

    expect(wrapper.find(".n-tab-panel").exists()).toBe(true);
    expect(wrapper.findAll(".n-tab-panel__tab").length).toBe(
      defaultTabs.length,
    );

    // First tab should be active by default
    expect(wrapper.find(".n-tab-panel__tab--active").exists()).toBe(true);
    expect(wrapper.find(".n-tab-panel__pane--active").exists()).toBe(true);
  });

  it("renders correctly with activeId", () => {
    const wrapper = createWrapper({ activeId: "tab3" });

    // Tab 3 should be active
    const activeTab = wrapper.find(".n-tab-panel__tab--active");
    expect(activeTab.exists()).toBe(true);
    expect(activeTab.attributes("id")).toBe("tab-tab3");

    // Tab 3 content should be visible
    const activePane = wrapper.find(".n-tab-panel__pane--active");
    expect(activePane.exists()).toBe(true);
    expect(activePane.attributes("id")).toBe("panel-tab3");
    expect(activePane.find(".tab-content").text()).toBe("Tab 3 Content");
  });

  it("switches tabs when clicking on a tab", async () => {
    const wrapper = createWrapper();

    // Click on the second tab
    const secondTab = wrapper.findAll(".n-tab-panel__tab").at(1);
    await secondTab.trigger("click");

    // Should emit update:active-id event
    expect(wrapper.emitted()).toHaveProperty("update:active-id");
    expect(wrapper.emitted()["update:active-id"][0]).toEqual(["tab2"]);

    // Update the activeId prop to simulate v-model
    await wrapper.setProps({ activeId: "tab2" });

    // Second tab should now be active
    expect(wrapper.findAll(".n-tab-panel__tab").at(1).classes()).toContain(
      "n-tab-panel__tab--active",
    );
    expect(wrapper.find(".n-tab-panel__pane--active .tab-content").text()).toBe(
      "Tab 2 Content",
    );
  });

  it("supports closing tabs when closable is true", async () => {
    const wrapper = createWrapper({ closable: true });

    // Should have close buttons
    expect(wrapper.findAll(".n-tab-panel__tab-close").length).toBe(
      defaultTabs.length,
    );

    // Click on the first tab's close button
    await wrapper.findAll(".n-tab-panel__tab-close").at(0).trigger("click");

    // Should emit close event
    expect(wrapper.emitted()).toHaveProperty("close");
    expect(wrapper.emitted().close[0]).toEqual(["tab1"]);
  });

  it("supports adding tabs when addable is true", async () => {
    const wrapper = createWrapper({ addable: true });

    // Should have an add button
    expect(wrapper.find(".n-tab-panel__add-button").exists()).toBe(true);

    // Click on the add button
    await wrapper.find(".n-tab-panel__add-button").trigger("click");

    // Should emit add event
    expect(wrapper.emitted()).toHaveProperty("add");
  });

  it("supports drag and drop for reordering tabs when draggable is true", async () => {
    const wrapper = createWrapper({ draggable: true });

    // Mock drag and drop events
    const dragStartEvent = new Event("dragstart");
    Object.defineProperty(dragStartEvent, "dataTransfer", {
      value: { setData: vi.fn(), effectAllowed: null },
    });

    const dropEvent = new Event("drop");
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: { getData: vi.fn() },
    });
    dropEvent.preventDefault = vi.fn();
    dropEvent.stopPropagation = vi.fn();

    // Start dragging the first tab
    const firstTab = wrapper.findAll(".n-tab-panel__tab").at(0);
    await firstTab.trigger("dragstart", dragStartEvent);

    // Set the draggedTabIndex manually since the event is mocked
    wrapper.vm.draggedTabIndex = 0;

    // Drop it on the third tab
    const thirdTab = wrapper.findAll(".n-tab-panel__tab").at(2);
    await thirdTab.trigger("drop", dropEvent);

    // Should emit reorder event
    expect(wrapper.emitted()).toHaveProperty("reorder");
  });

  it("supports pinned tabs when allowPinning is true", async () => {
    const wrapper = createWrapper({ allowPinning: true });

    // Tab 5 should have the pinned class
    expect(wrapper.findAll(".n-tab-panel__tab").at(4).classes()).toContain(
      "n-tab-panel__tab--pinned",
    );

    // Should have pin indicators and buttons
    expect(wrapper.find(".n-tab-panel__tab-pin-indicator").exists()).toBe(true);
    expect(wrapper.findAll(".n-tab-panel__tab-pin").length).toBe(
      defaultTabs.length,
    );

    // Click on the first tab's pin button
    await wrapper.findAll(".n-tab-panel__tab-pin").at(0).trigger("click");

    // Should emit pin event
    expect(wrapper.emitted()).toHaveProperty("pin");
    expect(wrapper.emitted().pin[0]).toEqual(["tab1", true]);
  });

  it("displays badges when tabs have badge property", () => {
    const wrapper = createWrapper();

    // Tab 4 should have a badge
    const badgeTab = wrapper.findAll(".n-tab-panel__tab").at(3);
    expect(badgeTab.classes()).toContain("n-tab-panel__tab--has-badge");

    const badge = badgeTab.find(".n-tab-panel__tab-badge");
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toBe("5");
    expect(badge.attributes("style")).toContain("background-color: #ff0000");
  });

  it("supports context menu when contextMenu is true", async () => {
    const wrapper = createWrapper({ contextMenu: true });

    // Mock right-click event
    const contextMenuEvent = new MouseEvent("contextmenu");
    Object.defineProperty(contextMenuEvent, "clientX", { value: 100 });
    Object.defineProperty(contextMenuEvent, "clientY", { value: 100 });
    contextMenuEvent.preventDefault = vi.fn();

    // Right-click on the first tab
    const firstTab = wrapper.findAll(".n-tab-panel__tab").at(0);
    await firstTab.trigger("contextmenu", contextMenuEvent);

    // Should emit context-menu event
    expect(wrapper.emitted()).toHaveProperty("context-menu");
    expect(wrapper.emitted()["context-menu"][0][0]).toEqual(defaultTabs[0]);

    // Context menu should be visible
    expect(wrapper.vm.contextMenuVisible).toBe(true);
    expect(wrapper.vm.contextMenuTabId).toBe("tab1");
  });

  it("supports different display types", async () => {
    const displayTypes = ["default", "cards", "pills", "underlined"];

    for (const type of displayTypes) {
      const wrapper = createWrapper({ displayType: type });

      // Tabs should have the correct display type class
      const tabs = wrapper.findAll(".n-tab-panel__tab");
      expect(tabs.at(0).classes()).toContain(`n-tab-panel__tab--${type}`);

      // Content should have the correct display type class
      expect(wrapper.find(".n-tab-panel__content").classes()).toContain(
        `n-tab-panel__content--${type}`,
      );
    }
  });

  it("supports keyboard navigation", async () => {
    const wrapper = createWrapper();

    // Start with first tab active
    await wrapper.setProps({ activeId: "tab1" });

    // Trigger right arrow key on first tab
    await wrapper.find(".n-tab-panel__tab--active").trigger("keydown.right");

    // Should emit update:active-id event for second tab
    expect(wrapper.emitted()["update:active-id"][0]).toEqual(["tab2"]);

    // Update activeId to simulate v-model
    await wrapper.setProps({ activeId: "tab2" });

    // Trigger left arrow key on second tab
    await wrapper.find(".n-tab-panel__tab--active").trigger("keydown.left");

    // Should emit update:active-id event for first tab
    expect(wrapper.emitted()["update:active-id"][1]).toEqual(["tab1"]);
  });

  it("supports lazy loading tabs", async () => {
    const wrapper = createWrapper({ lazy: true });

    // Start with first tab active
    await wrapper.setProps({ activeId: "tab1" });

    // Only the active tab should be mounted
    expect(wrapper.vm.mountedTabs.size).toBe(1);
    expect(wrapper.vm.mountedTabs.has("tab1")).toBe(true);

    // Click on the second tab
    await wrapper.findAll(".n-tab-panel__tab").at(1).trigger("click");
    await wrapper.setProps({ activeId: "tab2" });

    // Now both tabs should be mounted
    expect(wrapper.vm.mountedTabs.size).toBe(2);
    expect(wrapper.vm.mountedTabs.has("tab2")).toBe(true);
  });
});
