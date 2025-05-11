import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import AppearanceSettings from "@/components/settings/AppearanceSettings.vue";
import { useSettingsStore } from "@/stores/settings";
import type { ColorTheme } from "@/types/settings";

// Mock für i18n
vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

// Mock für Toast
vi.mock("@/composables/useToast", () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Hilfsfunktion zum Erstellen eines Wrapper mit Standard-Konfiguration
function createWrapper() {
  return mount(AppearanceSettings, {
    global: {
      plugins: [createPinia()],
    },
  });
}

describe("AppearanceSettings.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("rendert die Komponente korrekt", () => {
      const wrapper = createWrapper();
      expect(wrapper.find(".appearance-settings").exists()).toBe(true);
      expect(wrapper.find(".appearance-settings__title").text()).toBe(
        "settings.appearance.title",
      );
    });

    it("zeigt alle verfügbaren Themes an", () => {
      const wrapper = createWrapper();
      const store = useSettingsStore();
      const themeCards = wrapper.findAll(".appearance-settings__theme-card");

      expect(themeCards.length).toBe(store.allThemes.length);
    });

    it("markiert das aktuell ausgewählte Theme", () => {
      const wrapper = createWrapper();
      const store = useSettingsStore();
      const activeThemeCard = wrapper.find(
        ".appearance-settings__theme-card--active",
      );

      expect(activeThemeCard.exists()).toBe(true);
      expect(wrapper.vm.selectedTheme).toBe(store.theme.currentTheme);
    });

    it("zeigt alle Schriftgrößen-Optionen an", () => {
      const wrapper = createWrapper();
      const fontSizeButtons = wrapper.findAll(
        ".appearance-settings__font-size-button",
      );

      expect(fontSizeButtons.length).toBe(4); // small, medium, large, extra-large
    });

    it("zeigt alle Schriftart-Optionen an", () => {
      const wrapper = createWrapper();
      const fontFamilyOptions = wrapper
        .find(".appearance-settings__select")
        .findAll("option");

      expect(fontFamilyOptions.length).toBe(4); // system, serif, sans-serif, monospace
    });

    it("zeigt alle Zeilenhöhe-Optionen an", () => {
      const wrapper = createWrapper();
      const lineHeightButtons = wrapper.findAll(
        ".appearance-settings__line-height-button",
      );

      expect(lineHeightButtons.length).toBe(3); // compact, normal, relaxed
    });
  });

  describe("Interaktionen", () => {
    it("wählt ein Theme aus wenn auf eine Theme-Karte geklickt wird", async () => {
      const wrapper = createWrapper();
      const store = useSettingsStore();
      const themeCards = wrapper.findAll(".appearance-settings__theme-card");

      // Wähle das zweite Theme aus (nicht das aktuell aktive)
      const cardToClick = themeCards[1];
      await cardToClick.trigger("click");

      // Überprüfe, ob das 'apply-settings' Event mit den richtigen Parametern emittiert wurde
      expect(wrapper.emitted("apply-settings")).toBeTruthy();
      expect(wrapper.emitted("apply-settings")![0][0]).toBe("appearance");
      expect(wrapper.emitted("apply-settings")![0][1]).toHaveProperty("theme");
    });

    it("ändert die Schriftgröße wenn auf eine Schriftgrößen-Option geklickt wird", async () => {
      const wrapper = createWrapper();
      const fontSizeButtons = wrapper.findAll(
        ".appearance-settings__font-size-button",
      );

      // Klicke auf die "Groß" Schriftgröße
      await fontSizeButtons[2].trigger("click");

      // Überprüfe, ob das 'apply-settings' Event mit den richtigen Parametern emittiert wurde
      expect(wrapper.emitted("apply-settings")).toBeTruthy();
      expect(wrapper.emitted("apply-settings")![0][0]).toBe("appearance");
      expect(wrapper.emitted("apply-settings")![0][1]).toHaveProperty("font");
      expect(wrapper.emitted("apply-settings")![0][1].font).toHaveProperty(
        "size",
        "large",
      );
    });

    it("ändert die Schriftart wenn eine neue Schriftart ausgewählt wird", async () => {
      const wrapper = createWrapper();
      const select = wrapper.find(".appearance-settings__select");

      // Wähle die "Serif" Schriftart
      await select.setValue("serif");

      // Überprüfe, ob das 'apply-settings' Event mit den richtigen Parametern emittiert wurde
      expect(wrapper.emitted("apply-settings")).toBeTruthy();
      expect(wrapper.emitted("apply-settings")![0][0]).toBe("appearance");
      expect(wrapper.emitted("apply-settings")![0][1]).toHaveProperty("font");
      expect(wrapper.emitted("apply-settings")![0][1].font).toHaveProperty(
        "family",
        "serif",
      );
    });

    it("ändert die Zeilenhöhe wenn auf eine Zeilenhöhe-Option geklickt wird", async () => {
      const wrapper = createWrapper();
      const lineHeightButtons = wrapper.findAll(
        ".appearance-settings__line-height-button",
      );

      // Klicke auf die "Weit" Zeilenhöhe
      await lineHeightButtons[2].trigger("click");

      // Überprüfe, ob das 'apply-settings' Event mit den richtigen Parametern emittiert wurde
      expect(wrapper.emitted("apply-settings")).toBeTruthy();
      expect(wrapper.emitted("apply-settings")![0][0]).toBe("appearance");
      expect(wrapper.emitted("apply-settings")![0][1]).toHaveProperty("font");
      expect(wrapper.emitted("apply-settings")![0][1].font).toHaveProperty(
        "lineHeight",
        "relaxed",
      );
    });
  });

  describe("Benutzerdefiniertes Theme", () => {
    it("zeigt den benutzerdefinierten Theme-Editor an wenn der Toggle-Button geklickt wird", async () => {
      const wrapper = createWrapper();

      // Prüfe, dass der Editor standardmäßig ausgeblendet ist
      expect(wrapper.find(".appearance-settings__custom-theme").exists()).toBe(
        false,
      );

      // Klicke auf den Toggle-Button
      const toggleButton = wrapper.find(".appearance-settings__toggle-button");
      await toggleButton.trigger("click");

      // Prüfe, dass der Editor angezeigt wird
      expect(wrapper.find(".appearance-settings__custom-theme").exists()).toBe(
        true,
      );
    });

    it("setzt das benutzerdefinierte Theme zurück wenn auf den Reset-Button geklickt wird", async () => {
      const wrapper = createWrapper();

      // Zeige den Editor an
      const toggleButton = wrapper.find(".appearance-settings__toggle-button");
      await toggleButton.trigger("click");

      // Ändere den Namen des benutzerdefinierten Themes
      const nameInput = wrapper.find("#theme-name");
      await nameInput.setValue("Mein Test-Theme");

      // Klicke auf den Reset-Button
      const resetButton = wrapper.find(
        ".appearance-settings__button--secondary",
      );
      await resetButton.trigger("click");

      // Prüfe, ob der Name zurückgesetzt wurde
      expect((nameInput.element as HTMLInputElement).value).toBe(
        "Benutzerdefiniertes Thema",
      );
    });

    it("speichert und wendet das benutzerdefinierte Theme an", async () => {
      const wrapper = createWrapper();
      const store = useSettingsStore();

      // Spy auf die Store-Methode
      const addCustomThemeSpy = vi.spyOn(store, "addCustomTheme");

      // Zeige den Editor an
      await wrapper
        .find(".appearance-settings__toggle-button")
        .trigger("click");

      // Ändere den Namen des benutzerdefinierten Themes
      await wrapper.find("#theme-name").setValue("Mein Test-Theme");

      // Klicke auf den Speichern-Button
      const saveButton = wrapper.find(".appearance-settings__button--primary");
      await saveButton.trigger("click");

      // Prüfe, ob die Store-Methoden aufgerufen wurden
      expect(addCustomThemeSpy).toHaveBeenCalled();

      // Prüfe, ob ein Event zum Anwenden des Themes emittiert wurde
      expect(wrapper.emitted("apply-settings")).toBeTruthy();
      const emittedEvents = wrapper.emitted("apply-settings")!;
      let themeSetEventFound = false;

      // Suche nach dem Event, das das neue Theme anwendet
      for (const event of emittedEvents) {
        if (event[0] === "appearance" && event[1].theme) {
          themeSetEventFound = true;
          break;
        }
      }

      expect(themeSetEventFound).toBe(true);
    });
  });

  describe("Theme-Vorschau", () => {
    it("generiert korrekte Styles für die Theme-Vorschau", () => {
      const wrapper = createWrapper();

      // Erstelle ein Test-Theme
      const testTheme: ColorTheme = {
        id: "test-theme",
        name: "Test Theme",
        isDark: false,
        colors: {
          primary: "#ff0000",
          secondary: "#00ff00",
          accent: "#0000ff",
          background: "#ffffff",
          surface: "#f0f0f0",
          text: "#000000",
          error: "#ff0000",
          warning: "#ffff00",
          success: "#00ff00",
        },
      };

      // Rufe die Methode für die Vorschau-Styles auf
      const styles = wrapper.vm.getThemePreviewStyle(testTheme);

      // Prüfe die generierten Styles
      expect(styles.backgroundColor).toBe("#ffffff");
      expect(styles["--primary-color"]).toBe("#ff0000");
      expect(styles["--secondary-color"]).toBe("#00ff00");
      expect(styles["--text-color"]).toBe("#000000");
    });
  });

  describe("Initialisierung", () => {
    it("initialisiert die Einstellungen korrekt bei der Erstellung der Komponente", () => {
      const wrapper = createWrapper();
      const store = useSettingsStore();

      // Prüfe, ob das ausgewählte Theme mit dem Store übereinstimmt
      expect(wrapper.vm.selectedTheme).toBe(store.theme.currentTheme);

      // Prüfe, ob die Font-Einstellungen mit dem Store übereinstimmen
      expect(wrapper.vm.fontSettings.size).toBe(store.font.size);
      expect(wrapper.vm.fontSettings.family).toBe(store.font.family);
      expect(wrapper.vm.fontSettings.lineHeight).toBe(store.font.lineHeight);
    });
  });

  describe("Responsives Design", () => {
    it("enthält responsive CSS-Regeln für mobile Geräte", () => {
      const wrapper = createWrapper();
      const style = wrapper.vm.$style;

      // Prüfe, ob die CSS-Regeln einen Media Query für mobile Geräte enthalten
      const styleString = wrapper.vm.$.type.__scopeId
        ? document.querySelector(
            `style[data-v-${wrapper.vm.$.type.__scopeId.replace("data-v-", "")}]`,
          )?.textContent || ""
        : "";

      expect(styleString).toContain("@media (max-width");
    });
  });
});
