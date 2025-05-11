import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import Breadcrumb from "@/components/ui/base/Breadcrumb.vue";

// Mock Vue Router
vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("Breadcrumb Component", () => {
  const defaultItems = [
    { text: "Home", href: "/" },
    { text: "Products", href: "/products" },
    { text: "Categories", href: "/products/categories" },
    { text: "Electronics", active: true },
  ];

  // Basic rendering
  it("renders properly with default props", () => {
    const wrapper = mount(Breadcrumb, {
      props: {
        items: defaultItems,
      },
    });
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.classes()).toContain("n-breadcrumb");

    // Check if all items are rendered
    const items = wrapper.findAll(".n-breadcrumb__item");
    expect(items.length).toBe(defaultItems.length);
  });

  it("renders links for items with href", () => {
    const wrapper = mount(Breadcrumb, {
      props: {
        items: defaultItems,
      },
    });

    const links = wrapper.findAll(".n-breadcrumb__link");
    expect(links.length).toBe(defaultItems.length - 1); // All except the active one

    expect(links[0].attributes("href")).toBe("/");
    expect(links[1].attributes("href")).toBe("/products");
  });

  it("renders active item with proper class", () => {
    const wrapper = mount(Breadcrumb, {
      props: {
        items: defaultItems,
      },
    });

    const activeItems = wrapper.findAll(".n-breadcrumb__item--active");
    expect(activeItems.length).toBe(1);
    expect(activeItems[0].text()).toContain("Electronics");
  });

  it("applies aria-current to the active item", () => {
    const wrapper = mount(Breadcrumb, {
      props: {
        items: defaultItems,
      },
    });

    const activeText = wrapper.find(
      ".n-breadcrumb__item--active .n-breadcrumb__text",
    );
    expect(activeText.attributes("aria-current")).toBe("page");
  });

  // Separators
  it("renders default separator between items", () => {
    const wrapper = mount(Breadcrumb, {
      props: {
        items: defaultItems,
      },
    });

    const separators = wrapper.findAll(".n-breadcrumb__separator");
    expect(separators.length).toBe(defaultItems.length - 1);
    expect(separators[0].text()).toBe("/");
  });

  it("renders custom separator when provided", () => {
    const wrapper = mount(Breadcrumb, {
      props: {
        items: defaultItems,
        separator: ">",
      },
    });

    const separators = wrapper.findAll(".n-breadcrumb__separator");
    expect(separators[0].text()).toBe(">");
  });

  it("allows custom separator via slot", () => {
    const wrapper = mount(Breadcrumb, {
      props: {
        items: defaultItems,
      },
      slots: {
        separator: "<span>-</span>",
      },
    });

    const separators = wrapper.findAll(".n-breadcrumb__separator");
    expect(separators[0].html()).toContain("<span>-</span>");
  });

  // Collapsing
  it("collapses breadcrumbs when there are more items than maxVisible", () => {
    const manyItems = [
      { text: "Home", href: "/" },
      { text: "Level 1", href: "/level1" },
      { text: "Level 2", href: "/level1/level2" },
      { text: "Level 3", href: "/level1/level2/level3" },
      { text: "Level 4", href: "/level1/level2/level3/level4" },
      { text: "Level 5", active: true },
    ];

    const wrapper = mount(Breadcrumb, {
      props: {
        items: manyItems,
        maxVisible: 3,
      },
    });

    // Should render: Home, ..., Level 5
    const items = wrapper.findAll(".n-breadcrumb__item");
    expect(items.length).toBe(3); // Home, collapse item, Current

    const collapseItem = wrapper.find(".n-breadcrumb__item--collapse");
    expect(collapseItem.exists()).toBe(true);
    expect(collapseItem.text()).toContain("...");
  });

  it("always shows home and current when specified", () => {
    const manyItems = [
      { text: "Home", href: "/" },
      { text: "Level 1", href: "/level1" },
      { text: "Level 2", href: "/level1/level2" },
      { text: "Level 3", href: "/level1/level2/level3" },
      { text: "Level 4", href: "/level1/level2/level3/level4" },
      { text: "Level 5", active: true },
    ];

    const wrapper = mount(Breadcrumb, {
      props: {
        items: manyItems,
        maxVisible: 3,
        alwaysShowHome: true,
        alwaysShowCurrent: true,
      },
    });

    const items = wrapper.findAll(".n-breadcrumb__item");
    expect(items[0].text()).toContain("Home");
    expect(items[items.length - 1].text()).toContain("Level 5");
  });

  // Events
  it("emits click event when a breadcrumb item is clicked", async () => {
    const wrapper = mount(Breadcrumb, {
      props: {
        items: defaultItems,
        useRouter: false, // Disable router for this test
      },
    });

    const link = wrapper.find(".n-breadcrumb__link");
    await link.trigger("click");

    expect(wrapper.emitted("click")).toBeTruthy();
    expect(wrapper.emitted("click")![0][0]).toEqual(defaultItems[0]);
    expect(wrapper.emitted("click")![0][1]).toBe(0);
  });

  // Disabled items
  it("adds disabled class to disabled items", () => {
    const itemsWithDisabled = [
      { text: "Home", href: "/" },
      { text: "Products", href: "/products", disabled: true },
      { text: "Item", active: true },
    ];

    const wrapper = mount(Breadcrumb, {
      props: {
        items: itemsWithDisabled,
      },
    });

    const disabledItem = wrapper.findAll(".n-breadcrumb__item")[1];
    expect(disabledItem.classes()).toContain("n-breadcrumb__item--disabled");
    expect(disabledItem.find(".n-breadcrumb__link").exists()).toBe(false);
  });

  // Icons
  it("renders icons when provided", () => {
    const mockIcon = {
      template: '<div class="mock-icon">Icon</div>',
    };

    const itemsWithIcons = [
      { text: "Home", href: "/", icon: mockIcon },
      { text: "Products", href: "/products" },
      { text: "Item", active: true },
    ];

    const wrapper = mount(Breadcrumb, {
      props: {
        items: itemsWithIcons,
      },
    });

    expect(wrapper.find(".mock-icon").exists()).toBe(true);
    expect(wrapper.find(".n-breadcrumb__icon").exists()).toBe(true);
  });
});
