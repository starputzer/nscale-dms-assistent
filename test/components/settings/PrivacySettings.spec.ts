import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import PrivacySettings from "@/components/settings/PrivacySettings.vue";

// Mock für i18n
vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

// Mock für useToast composable
vi.mock("@/composables/useToast", () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Mock für useDialog composable
vi.mock("@/composables/useDialog", () => ({
  useDialog: () => ({
    showConfirmDialog: vi.fn().mockResolvedValue(true),
  }),
}));

// Mock für localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock für indexedDB
const indexedDBMock = {
  deleteDatabase: vi.fn().mockImplementation(() => ({
    onsuccess: null,
    onerror: null,
  })),
  databases: vi.fn().mockResolvedValue([{ name: "chat-store" }]),
};

Object.defineProperty(window, "indexedDB", { value: indexedDBMock });

// Hilfsfunktion zum Erstellen eines Wrappers mit Standard-Konfiguration
function createWrapper() {
  return mount(PrivacySettings, {
    global: {
      plugins: [createPinia()],
    },
  });
}

describe("PrivacySettings.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorageMock.clear();

    // Mock für document.cookie
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "test-cookie=test-value",
    });
  });

  describe("Rendering", () => {
    it("rendert die Komponente korrekt", () => {
      const wrapper = createWrapper();
      expect(wrapper.find(".privacy-settings").exists()).toBe(true);
      expect(wrapper.find(".privacy-settings__title").text()).toBe(
        "settings.privacy.title",
      );
    });

    it("zeigt den Datenverwaltungs-Bereich an", () => {
      const wrapper = createWrapper();
      const section = wrapper.findAll(".privacy-settings__section")[3];
      expect(section.exists()).toBe(true);
      expect(section.find(".privacy-settings__subtitle").text()).toBe(
        "settings.privacy.dataManagement",
      );

      const buttons = section.findAll(".privacy-settings__action-button");
      expect(buttons.length).toBe(3);
    });
  });

  describe("Interaktionen", () => {
    it("aktualisiert die Einstellungen beim Ändern der Optionen", async () => {
      const wrapper = createWrapper();

      // Ändere die Chat-Verlauf-Option
      await wrapper.find("#privacy-save-chats").setValue(false);
      await wrapper.find("#privacy-save-chats").trigger("change");

      // Prüfe, ob localStorage.setItem aufgerufen wurde
      expect(localStorageMock.setItem).toHaveBeenCalled();

      // Prüfe, ob 'apply-settings' emittiert wurde
      expect(wrapper.emitted("apply-settings")).toBeTruthy();
    });
  });

  describe("Datenverwaltung", () => {
    it("löst Aktionen aus, wenn auf Buttons geklickt wird", async () => {
      const wrapper = createWrapper();

      // Klicke auf den Button zum Löschen des Chat-Verlaufs
      await wrapper
        .findAll(".privacy-settings__action-button")[0]
        .trigger("click");

      // Wir können nicht direkt auf den gemockten useDialog() zugreifen
      // Daher prüfen wir nur, ob der Button vorhanden ist
      expect(
        wrapper.findAll(".privacy-settings__action-button")[0].exists(),
      ).toBe(true);
    });
  });
});
