import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import MainLayout from "../MainLayout.vue";


import { createTestingPinia } from "@pinia/testing";

// Mock für Header und Sidebar
vi.mock("../Header.vue", () => ({
  default: {
    name: "Header",
    setup: () => ({}),
    render: () => null,
  },
}));

vi.mock("../Sidebar.vue", () => ({
  default: {
    name: "Sidebar",
    setup: () => ({}),
    render: () => null,
  },
}));

// Mock der Pinia-Store-Methoden
vi.mock("../../../stores/ui", () => ({
  useUIStore: vi.fn(() => ({
    registerLayoutElement: vi.fn(),
    unregisterLayoutElement: vi.fn(),
    getLayoutElement: vi.fn(),
    setLayoutCssVariable: vi.fn(),
  })),
}));

describe("MainLayout", () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    // Mock window.matchMedia für Viewport-Tests
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  // Test grundlegende Rendering-Funktionalität
  it("rendert korrekt mit Standard-Props", () => {
    wrapper = mount(MainLayout, {
      global: {
        plugins: [createTestingPinia()],
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.classes()).toContain("n-main-layout");
    expect(wrapper.find(".n-main-layout__header").exists()).toBe(true);
    expect(wrapper.find(".n-main-layout__sidebar").exists()).toBe(true);
    expect(wrapper.find(".n-main-layout__content").exists()).toBe(true);
    expect(wrapper.find(".n-main-layout__footer").exists()).toBe(true);
  });

  // Test für bedingte Rendering von Komponenten
  it("rendert Header, Sidebar und Footer basierend auf Props", async () => {
    wrapper = mount(MainLayout, {
      props: {
        showHeader: true,
        showSidebar: true,
        showFooter: true,
      },
      global: {
        plugins: [createTestingPinia()],
      },
    });

    expect(wrapper.find(".n-main-layout__header").exists()).toBe(true);
    expect(wrapper.find(".n-main-layout__sidebar").exists()).toBe(true);
    expect(wrapper.find(".n-main-layout__footer").exists()).toBe(true);

    await wrapper.setProps({ showHeader: false });
    expect(wrapper.find(".n-main-layout__header").exists()).toBe(false);

    await wrapper.setProps({ showSidebar: false });
    expect(wrapper.find(".n-main-layout__sidebar").exists()).toBe(false);

    await wrapper.setProps({ showFooter: false });
    expect(wrapper.find(".n-main-layout__footer").exists()).toBe(false);
  });

  // Test für das Umschalten der Sidebar
  it("schaltet den Sidebar-Kollaps-Zustand korrekt um", async () => {
    wrapper = mount(MainLayout, {
      props: {
        sidebarCollapsed: false,
      },
      global: {
        plugins: [createTestingPinia()],
      },
    });

    expect(wrapper.classes()).not.toContain("n-main-layout--sidebar-collapsed");

    await wrapper.setProps({ sidebarCollapsed: true });
    expect(wrapper.classes()).toContain("n-main-layout--sidebar-collapsed");

    // Teste die toggleSidebar-Methode
    // @ts-ignore - Wir greifen auf die innere Komponenten-Instanz zu
    wrapper.vm.toggleSidebar();

    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("update:sidebarCollapsed")).toBeTruthy();
    expect(wrapper.emitted("sidebar-toggle")).toBeTruthy();

    // Überprüfe den Wert des emittierten Events
    expect(wrapper.emitted("update:sidebarCollapsed")?.[0]).toEqual([false]);
  });

  // Test für Theme-Klassen
  it("wendet die richtige Theme-Klasse an", async () => {
    wrapper = mount(MainLayout, {
      props: {
        theme: "light",
      },
      global: {
        plugins: [createTestingPinia()],
      },
    });

    expect(wrapper.classes()).toContain("n-main-layout--light");

    await wrapper.setProps({ theme: "dark" });
    expect(wrapper.classes()).toContain("n-main-layout--dark");

    await wrapper.setProps({ theme: "system" });
    expect(wrapper.classes()).toContain("n-main-layout--system");
  });

  // Test für Grid-Layout-Klassen
  it("wendet die richtigen Grid-Layout-Klassen an", async () => {
    wrapper = mount(MainLayout, {
      props: {
        gridLayout: "default",
      },
      global: {
        plugins: [createTestingPinia()],
      },
    });

    expect(wrapper.classes()).toContain("n-main-layout--grid-default");

    await wrapper.setProps({ gridLayout: "sidebar-left" });
    expect(wrapper.classes()).toContain("n-main-layout--grid-sidebar-left");

    await wrapper.setProps({ gridLayout: "sidebar-right" });
    expect(wrapper.classes()).toContain("n-main-layout--grid-sidebar-right");

    await wrapper.setProps({ gridLayout: "full-width" });
    expect(wrapper.classes()).toContain("n-main-layout--grid-full-width");

    await wrapper.setProps({ gridLayout: "centered" });
    expect(wrapper.classes()).toContain("n-main-layout--grid-centered");
  });

  // Test für Content-Width-Klassen
  it("wendet die richtigen Content-Width-Klassen an", async () => {
    wrapper = mount(MainLayout, {
      props: {
        contentWidth: "narrow",
      },
      global: {
        plugins: [createTestingPinia()],
      },
    });

    expect(wrapper.classes()).toContain("n-main-layout--content-width-narrow");

    await wrapper.setProps({ contentWidth: "medium" });
    expect(wrapper.classes()).toContain("n-main-layout--content-width-medium");

    await wrapper.setProps({ contentWidth: "wide" });
    expect(wrapper.classes()).toContain("n-main-layout--content-width-wide");

    await wrapper.setProps({ contentWidth: "full" });
    expect(wrapper.classes()).toContain("n-main-layout--content-width-full");
  });

  // Test für Content-Ausrichtung
  it("wendet die richtige Content-Ausrichtung an", async () => {
    wrapper = mount(MainLayout, {
      props: {
        contentAlignment: "left",
      },
      global: {
        plugins: [createTestingPinia()],
      },
    });

    let content = wrapper.find(".n-main-layout__content");
    expect(content.classes()).toContain("n-main-layout__content--align-left");

    await wrapper.setProps({ contentAlignment: "center" });
    content = wrapper.find(".n-main-layout__content");
    expect(content.classes()).toContain("n-main-layout__content--align-center");

    await wrapper.setProps({ contentAlignment: "right" });
    content = wrapper.find(".n-main-layout__content");
    expect(content.classes()).toContain("n-main-layout__content--align-right");
  });

  // Test für Full-Height-Content
  it("unterstützt Full-Height-Content", async () => {
    wrapper = mount(MainLayout, {
      props: {
        fullHeightContent: true,
      },
      global: {
        plugins: [createTestingPinia()],
      },
    });

    const content = wrapper.find(".n-main-layout__content");
    expect(content.classes()).toContain("n-main-layout__content--full-height");
  });

  // Test für Sticky-Header
  it("unterstützt Sticky-Header", async () => {
    wrapper = mount(MainLayout, {
      props: {
        stickyHeader: true,
      },
      global: {
        plugins: [createTestingPinia()],
      },
    });

    const header = wrapper.find(".n-main-layout__header");
    expect(header.classes()).toContain("n-main-layout__header--sticky");
  });

  // Test für Sticky-Footer
  it("unterstützt Sticky-Footer", async () => {
    wrapper = mount(MainLayout, {
      props: {
        stickyFooter: true,
      },
      global: {
        plugins: [createTestingPinia()],
      },
    });

    const footer = wrapper.find(".n-main-layout__footer");
    expect(footer.classes()).toContain("n-main-layout__footer--sticky");
  });

  // Test für Header-Elevation
  it("unterstützt Header-Elevation", async () => {
    wrapper = mount(MainLayout, {
      props: {
        headerElevation: true,
      },
      global: {
        plugins: [createTestingPinia()],
      },
    });

    const header = wrapper.find(".n-main-layout__header");
    expect(header.classes()).toContain("n-main-layout__header--elevated");
  });

  // Test für Sidebar-Elevation
  it("unterstützt Sidebar-Elevation", async () => {
    wrapper = mount(MainLayout, {
      props: {
        sidebarElevation: true,
      },
      global: {
        plugins: [createTestingPinia()],
      },
    });

    const sidebar = wrapper.find(".n-main-layout__sidebar");
    expect(sidebar.classes()).toContain("n-main-layout__sidebar--elevated");
  });

  // Test für Footer-Elevation
  it("unterstützt Footer-Elevation", async () => {
    wrapper = mount(MainLayout, {
      props: {
        footerElevation: true,
      },
      global: {
        plugins: [createTestingPinia()],
      },
    });

    const footer = wrapper.find(".n-main-layout__footer");
    expect(footer.classes()).toContain("n-main-layout__footer--elevated");
  });

  // Test für Fixed-Sidebar
  it("unterstützt Fixed-Sidebar", async () => {
    wrapper = mount(MainLayout, {
      props: {
        sidebarFixed: true,
      },
      global: {
        plugins: [createTestingPinia()],
      },
    });

    const sidebar = wrapper.find(".n-main-layout__sidebar");
    expect(sidebar.classes()).toContain("n-main-layout__sidebar--fixed");
  });

  // Test für Content-Padding
  it("unterstützt Content-Padding", async () => {
    wrapper = mount(MainLayout, {
      props: {
        contentPadding: true,
      },
      global: {
        plugins: [createTestingPinia()],
      },
    });

    const content = wrapper.find(".n-main-layout__content");
    expect(content.classes()).toContain("n-main-layout__content--has-padding");

    await wrapper.setProps({ contentPadding: false });
    expect(content.classes()).not.toContain(
      "n-main-layout__content--has-padding",
    );
  });

  // Test für Sidebar schließen auf mobilen Geräten
  it("schließt Sidebar nach Elementauswahl auf mobilen Geräten", async () => {
    // Mock matchMedia für mobile Ansicht
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query.includes("(max-width: 768px)"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    wrapper = mount(MainLayout, {
      props: {
        sidebarCollapsed: false,
      },
      global: {
        plugins: [createTestingPinia()],
      },
    });

    // Mobile setzen
    // @ts-ignore - Wir greifen auf die innere Komponenten-Instanz zu
    wrapper.vm.isMobile = true;
    await wrapper.vm.$nextTick();

    // Sidebar-Item-Select simulieren
    // @ts-ignore - Wir greifen auf die innere Komponenten-Instanz zu
    wrapper.vm.handleSidebarItemSelect("test-id");
    await wrapper.vm.$nextTick();

    // Überprüfen, ob Update-Event emittiert wurde
    expect(wrapper.emitted("update:sidebarCollapsed")).toBeTruthy();
    expect(wrapper.emitted("update:sidebarCollapsed")?.[0]).toEqual([true]);
  });

  // Test für Slots
  it("rendert Slots korrekt", () => {
    wrapper = mount(MainLayout, {
      slots: {
        header: '<div class="test-header">Header Slot</div>',
        sidebar: '<div class="test-sidebar">Sidebar Slot</div>',
        default: '<div class="test-content">Content Slot</div>',
        footer: '<div class="test-footer">Footer Slot</div>',
      },
      global: {
        plugins: [createTestingPinia()],
      },
    });

    expect(wrapper.find(".test-header").exists()).toBe(true);
    expect(wrapper.find(".test-sidebar").exists()).toBe(true);
    expect(wrapper.find(".test-content").exists()).toBe(true);
    expect(wrapper.find(".test-footer").exists()).toBe(true);
  });
});
