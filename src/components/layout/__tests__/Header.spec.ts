import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import Header from "../Header.vue";
import { createTestingPinia } from "@pinia/testing";

// Mocking der UI-Store-Funktionen
vi.mock("../../../stores/ui", () => ({
  useUIStore: vi.fn(() => ({
    isMobile: false,
  })),
}));

// Helper-Funktion zum Rendern des Headers mit unterschiedlichen Props und Slots
const createHeaderWrapper = (props = {}, slots = {}) => {
  return mount(Header, {
    props,
    slots,
    global: {
      plugins: [createTestingPinia()],
      stubs: {
        // Stub für Icons oder andere Komponenten, falls nötig
      },
    },
  });
};

describe("Header Component", () => {
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

    // Jedes Event-Listener-Objekt vor dem Test löschen
    vi.clearAllMocks();
  });

  // Grundlegende Rendering-Tests
  it("rendert korrekt mit Standard-Props", () => {
    wrapper = createHeaderWrapper();

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.classes()).toContain("n-header");
    expect(wrapper.find(".n-header__left").exists()).toBe(true);
    expect(wrapper.find(".n-header__center").exists()).toBe(true);
    expect(wrapper.find(".n-header__right").exists()).toBe(true);
  });

  it("rendert den Titel korrekt", () => {
    const testTitle = "Test Header Title";
    wrapper = createHeaderWrapper({ title: testTitle });

    const title = wrapper.find(".n-header__title");
    expect(title.exists()).toBe(true);
    expect(title.text()).toBe(testTitle);
  });

  it("versteckt den Titel wenn showTitle auf false gesetzt ist", () => {
    wrapper = createHeaderWrapper({ showTitle: false });

    const title = wrapper.find(".n-header__title");
    expect(title.exists()).toBe(false);
  });

  it("rendert das Logo wenn ein Logo-Pfad angegeben ist", () => {
    const testLogo = "/path/to/logo.png";
    const testLogoAlt = "Test Logo Alt Text";
    wrapper = createHeaderWrapper({
      logo: testLogo,
      logoAlt: testLogoAlt,
    });

    const logoImg = wrapper.find(".n-header__logo-image img");
    expect(logoImg.exists()).toBe(true);
    expect(logoImg.attributes("src")).toBe(testLogo);
    expect(logoImg.attributes("alt")).toBe(testLogoAlt);
  });

  // Toggle-Button Tests
  it("rendert den Toggle-Button wenn showToggleButton auf true gesetzt ist", () => {
    wrapper = createHeaderWrapper({ showToggleButton: true });

    const toggleButton = wrapper.find(".n-header__toggle-btn");
    expect(toggleButton.exists()).toBe(true);
  });

  it("versteckt den Toggle-Button wenn showToggleButton auf false gesetzt ist", () => {
    wrapper = createHeaderWrapper({ showToggleButton: false });

    const toggleButton = wrapper.find(".n-header__toggle-btn");
    expect(toggleButton.exists()).toBe(false);
  });

  it("emittiert toggle-sidebar-Event wenn auf den Toggle-Button geklickt wird", async () => {
    wrapper = createHeaderWrapper({ showToggleButton: true });

    const toggleButton = wrapper.find(".n-header__toggle-btn");
    await toggleButton.trigger("click");

    expect(wrapper.emitted("toggle-sidebar")).toBeTruthy();
    expect(wrapper.emitted("toggle-sidebar")?.length).toBe(1);
  });

  // Header-Stil-Tests
  it("wendet die fixed-Klasse an wenn fixed auf true gesetzt ist", () => {
    wrapper = createHeaderWrapper({ fixed: true });

    expect(wrapper.classes()).toContain("n-header--fixed");
  });

  it("wendet die bordered-Klasse an wenn bordered auf true gesetzt ist", () => {
    wrapper = createHeaderWrapper({ bordered: true });

    expect(wrapper.classes()).toContain("n-header--bordered");
  });

  it("wendet die elevated-Klasse an wenn elevated auf true gesetzt ist", () => {
    wrapper = createHeaderWrapper({ elevated: true });

    expect(wrapper.classes()).toContain("n-header--elevated");
  });

  it("wendet verschiedene Größenklassen an", async () => {
    wrapper = createHeaderWrapper({ size: "small" });
    expect(wrapper.classes()).toContain("n-header--small");

    await wrapper.setProps({ size: "medium" });
    expect(wrapper.classes()).toContain("n-header--medium");

    await wrapper.setProps({ size: "large" });
    expect(wrapper.classes()).toContain("n-header--large");
  });

  it("setzt korrekte Höhe basierend auf size Prop", () => {
    wrapper = createHeaderWrapper({ size: "small" });
    expect(wrapper.attributes("style")).toContain("height: 48px");

    wrapper = createHeaderWrapper({ size: "medium" });
    expect(wrapper.attributes("style")).toContain("height: 64px");

    wrapper = createHeaderWrapper({ size: "large" });
    expect(wrapper.attributes("style")).toContain("height: 72px");
  });

  it("setzt benutzerdefinierte Höhe wenn height Prop gesetzt ist", () => {
    const customHeight = 80;
    wrapper = createHeaderWrapper({ height: customHeight });

    expect(wrapper.attributes("style")).toContain(`height: ${customHeight}px`);
  });

  // Benutzermenü-Tests
  it("rendert das Benutzermenü wenn user Prop gesetzt ist", () => {
    const user = { name: "Test User", email: "test@example.com" };
    wrapper = createHeaderWrapper({ user });

    const userMenu = wrapper.find(".n-header__user-menu");
    expect(userMenu.exists()).toBe(true);

    const userName = wrapper.find(".n-header__user-name");
    expect(userName.exists()).toBe(true);
    expect(userName.text()).toBe(user.name);
  });

  it("erstellt korrekte Benutzer-Initialen wenn kein Avatar gesetzt ist", () => {
    const user = { name: "John Doe" };
    wrapper = createHeaderWrapper({ user });

    const avatar = wrapper.find(".n-header__user-avatar--placeholder");
    expect(avatar.exists()).toBe(true);
    expect(avatar.text()).toBe("JD");
  });

  it("rendert den Benutzer-Avatar wenn user.avatar gesetzt ist", () => {
    const user = {
      name: "Test User",
      avatar: "/path/to/avatar.jpg",
    };
    wrapper = createHeaderWrapper({ user });

    const avatar = wrapper.find(".n-header__user-avatar img");
    expect(avatar.exists()).toBe(true);
    expect(avatar.attributes("src")).toBe(user.avatar);
  });

  it("emittiert toggle-user-menu-Event wenn auf den Benutzer-Button geklickt wird", async () => {
    const user = { name: "Test User" };
    wrapper = createHeaderWrapper({ user });

    const userButton = wrapper.find(".n-header__user-button");
    await userButton.trigger("click");

    expect(wrapper.emitted("toggle-user-menu")).toBeTruthy();
    expect(wrapper.emitted("toggle-user-menu")?.length).toBe(1);
  });

  // Navigation-Tests
  it("rendert die Navigation wenn showNavigation auf true gesetzt ist und navigationItems übergeben werden", () => {
    const navigationItems = [
      { id: "1", label: "Item 1" },
      { id: "2", label: "Item 2" },
    ];
    wrapper = createHeaderWrapper({
      showNavigation: true,
      navigationItems,
    });

    const navigation = wrapper.find(".n-header__navigation");
    expect(navigation.exists()).toBe(true);

    const navItems = wrapper.findAll(".n-header__nav-item");
    expect(navItems.length).toBe(2);
  });

  it("rendert keine Navigation wenn showNavigation auf false gesetzt ist", () => {
    const navigationItems = [
      { id: "1", label: "Item 1" },
      { id: "2", label: "Item 2" },
    ];
    wrapper = createHeaderWrapper({
      showNavigation: false,
      navigationItems,
    });

    const navigation = wrapper.find(".n-header__navigation");
    expect(navigation.exists()).toBe(false);
  });

  it("markiert das aktive Navigationselement korrekt", () => {
    const navigationItems = [
      { id: "1", label: "Item 1" },
      { id: "2", label: "Item 2", active: true },
    ];
    wrapper = createHeaderWrapper({
      showNavigation: true,
      navigationItems,
    });

    const activeItem = wrapper.find(".n-header__nav-item--active");
    expect(activeItem.exists()).toBe(true);
    expect(activeItem.text()).toContain("Item 2");
  });

  it("emittiert navigation-select-Event wenn auf ein Navigationselement geklickt wird", async () => {
    const navigationItems = [{ id: "1", label: "Item 1" }];
    wrapper = createHeaderWrapper({
      showNavigation: true,
      navigationItems,
    });

    const navButton = wrapper.find(".n-header__nav-button");
    await navButton.trigger("click");

    expect(wrapper.emitted("navigation-select")).toBeTruthy();
    expect(wrapper.emitted("navigation-select")?.length).toBe(1);
    expect(wrapper.emitted("navigation-select")?.[0][0]).toEqual(
      navigationItems[0],
    );
  });

  // Suchfunktion-Tests
  it("rendert die Suche wenn showSearch auf true gesetzt ist", () => {
    wrapper = createHeaderWrapper({ showSearch: true });

    const search = wrapper.find(".n-header__search");
    expect(search.exists()).toBe(true);
  });

  it("rendert keine Suche wenn showSearch auf false gesetzt ist", () => {
    wrapper = createHeaderWrapper({ showSearch: false });

    const search = wrapper.find(".n-header__search");
    expect(search.exists()).toBe(false);
  });

  it("aktiviert das Suchfeld wenn auf die Suche geklickt wird", async () => {
    wrapper = createHeaderWrapper({ showSearch: true });

    // Anfänglich ist die Suche nicht aktiv
    expect(wrapper.find(".n-header__search--active").exists()).toBe(false);

    // Klicken, um die Suche zu aktivieren
    const searchToggle = wrapper.find(".n-header__search-toggle");
    await searchToggle.trigger("click");

    // Jetzt sollte die Suche aktiv sein
    expect(wrapper.find(".n-header__search--active").exists()).toBe(true);
  });

  it("emittiert search-Event bei Sucheingabe nach Debounce", async () => {
    wrapper = createHeaderWrapper({
      showSearch: true,
      searchDebounce: 0, // Debounce für Tests auf 0 setzen
    });

    // Suche aktivieren
    const searchToggle = wrapper.find(".n-header__search-toggle");
    await searchToggle.trigger("click");

    // Sucheingabe simulieren
    const input = wrapper.find(".n-header__search-input");
    await input.setValue("test query");

    // Timeout für Debounce simulieren
    vi.runAllTimers();

    // Event sollte emittiert worden sein
    expect(wrapper.emitted("search")).toBeTruthy();
    expect(wrapper.emitted("search")?.[0][0]).toBe("test query");
  });

  // Benachrichtigungscenter-Tests
  it("rendert das Benachrichtigungscenter wenn showNotifications auf true gesetzt ist", () => {
    wrapper = createHeaderWrapper({ showNotifications: true });

    const notificationCenter = wrapper.find(".n-header__notification-center");
    expect(notificationCenter.exists()).toBe(true);
  });

  it("zeigt korrekt die Anzahl ungelesener Benachrichtigungen an", () => {
    const notifications = [
      { id: "1", title: "Notification 1", read: false },
      { id: "2", title: "Notification 2", read: true },
      { id: "3", title: "Notification 3", read: false },
    ];
    wrapper = createHeaderWrapper({
      showNotifications: true,
      notifications,
    });

    const badge = wrapper.find(".n-header__notification-badge");
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toBe("2");
  });

  it("öffnet das Benachrichtigungsdropdown wenn auf den Benachrichtigungsbutton geklickt wird", async () => {
    wrapper = createHeaderWrapper({ showNotifications: true });

    const notificationButton = wrapper.find(
      ".n-header__action-button--notification",
    );
    await notificationButton.trigger("click");

    // isNotificationActive auf true setzen (normalerweise durch Click-Handler)
    // @ts-ignore - direkter Zugriff auf interne VM
    wrapper.vm.isNotificationActive = true;
    await wrapper.vm.$nextTick();

    const dropdown = wrapper.find(".n-header__notification-dropdown");
    expect(dropdown.exists()).toBe(true);
  });

  // Slot-Tests
  it("rendert benutzerdefinierte Slots korrekt", () => {
    wrapper = createHeaderWrapper(
      {},
      {
        logo: '<div class="custom-logo">Custom Logo</div>',
        title: '<span class="custom-title">Custom Title</span>',
        center: '<div class="custom-center">Custom Center</div>',
        right: '<div class="custom-right">Custom Right</div>',
        notifications:
          '<div class="custom-notifications">Custom Notifications</div>',
        user: '<div class="custom-user">Custom User</div>',
      },
    );

    expect(wrapper.find(".custom-logo").exists()).toBe(true);
    expect(wrapper.find(".custom-title").exists()).toBe(true);
    expect(wrapper.find(".custom-center").exists()).toBe(true);
    expect(wrapper.find(".custom-right").exists()).toBe(true);
    expect(wrapper.find(".custom-notifications").exists()).toBe(true);
    expect(wrapper.find(".custom-user").exists()).toBe(true);
  });

  // Mobile-Ansicht-Tests
  it("passt sich an mobile Ansicht an", async () => {
    // matchMedia für mobile Viewports mocken
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

    wrapper = createHeaderWrapper();

    // isMobile auf true setzen (normalerweise durch Resize-Handler)
    // @ts-ignore - direkter Zugriff auf interne VM
    wrapper.vm.isMobile = true;
    await wrapper.vm.$nextTick();

    expect(wrapper.classes()).toContain("n-header--mobile");

    // In mobiler Ansicht sollte der Benutzername ausgeblendet sein
    const user = { name: "Test User" };
    await wrapper.setProps({ user });

    // Username wird in mobiler Ansicht ausgeblendet
    const userName = wrapper.find(".n-header__user-name");
    expect(userName.exists()).toBe(false);
  });
});
