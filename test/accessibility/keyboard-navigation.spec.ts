import { mount } from "@vue/test-utils";
import { describe, it, expect, beforeEach, vi } from "vitest";
import MainLayout from "../../src/components/layout/MainLayout.vue";
import { createTestingPinia } from "@pinia/testing";

// Mock components
vi.mock("../../src/components/layout/Header.vue", () => ({
  default: {
    name: "Header",
    template: '<div class="header-mock">Header Mock</div>',
    props: ["title", "showToggleButton", "logo", "logoAlt", "size", "user"],
    emits: ["toggleSidebar"],
  },
}));

vi.mock("../../src/components/layout/Sidebar.vue", () => ({
  default: {
    name: "Sidebar",
    template: '<div class="sidebar-mock">Sidebar Mock</div>',
    props: ["items", "activeItemId", "title", "collapsed"],
    emits: ["toggleCollapse", "select"],
  },
}));

describe("Keyboard Navigation Tests", () => {
  let wrapper;

  beforeEach(() => {
    // Create wrapper with test pinia
    wrapper = mount(MainLayout, {
      props: {
        title: "Test App",
        showHeader: true,
        showSidebar: true,
        showFooter: true,
        sidebarItems: [
          { id: "item1", label: "Item 1" },
          { id: "item2", label: "Item 2" },
        ],
      },
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              ui: {
                sidebarIsCollapsed: false,
              },
            },
          }),
        ],
        stubs: {
          Header: true,
          Sidebar: true,
        },
      },
    });
  });

  it("should have skip-to-content links for keyboard navigation", () => {
    // Check if skip links exist
    const skipToContent = wrapper.find("#skip-to-main-content");
    const skipToNav = wrapper.find("#skip-to-navigation");

    expect(skipToContent.exists()).toBe(true);
    expect(skipToNav.exists()).toBe(true);

    // Check if the links point to the correct elements
    expect(skipToContent.attributes("href")).toBe("#main-content");
    expect(skipToNav.attributes("href")).toBe("#main-nav");
  });

  it("should have proper ARIA roles and labels for main regions", () => {
    // Check main landmarks
    const mainContent = wrapper.find("main");
    const sidebar = wrapper.find("aside");
    const footer = wrapper.find("footer");

    // Check ARIA roles
    expect(mainContent.attributes("role")).toBe("main");
    expect(sidebar.attributes("role")).toBe("navigation");
    expect(footer.attributes("role")).toBe("contentinfo");

    // Check accessibility labels
    expect(mainContent.attributes("aria-label")).toBeTruthy();
    expect(sidebar.attributes("aria-label")).toBeTruthy();
    expect(footer.attributes("aria-label")).toBeTruthy();
  });

  it("should have proper IDs for skip link targets", () => {
    const mainContent = wrapper.find("main");
    const sidebar = wrapper.find("aside");

    expect(mainContent.attributes("id")).toBe("main-content");
    expect(sidebar.attributes("id")).toBe("main-nav");
  });

  it("should make main content focusable for skip links", () => {
    const mainContent = wrapper.find("main");
    expect(mainContent.attributes("tabindex")).toBe("-1");
  });

  it("should not display sidebar skip link when sidebar is hidden", async () => {
    // Update props to hide sidebar
    await wrapper.setProps({ showSidebar: false });

    // Check if skip to nav link is not present
    const skipToNav = wrapper.find("#skip-to-navigation");
    expect(skipToNav.exists()).toBe(false);
  });
});
