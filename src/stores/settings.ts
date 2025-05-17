import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import axios from "axios";
import type {
  SettingsState,
  FontSettings,
  ThemeSettings,
  A11ySettings,
  MessageSettings,
  ChatSettings,
  NotificationSettings,
  ColorTheme,
} from "../types/settings";
import { useUIStore } from "./ui";

// Standard Themes
const DEFAULT_THEMES: ColorTheme[] = [
  {
    id: "default-light",
    name: "nscale Standard (Hell)",
    isDark: false,
    colors: {
      primary: "#2563eb",
      secondary: "#475569",
      accent: "#0ea5e9",
      background: "#f9fafb",
      surface: "#ffffff",
      text: "#1e293b",
      error: "#dc2626",
      warning: "#f59e0b",
      success: "#10b981",
    },
  },
  {
    id: "default-dark",
    name: "nscale Standard (Dunkel)",
    isDark: true,
    colors: {
      primary: "#3b82f6",
      secondary: "#94a3b8",
      accent: "#0ea5e9",
      background: "#0f172a",
      surface: "#1e293b",
      text: "#f8fafc",
      error: "#ef4444",
      warning: "#f59e0b",
      success: "#10b981",
    },
  },
  {
    id: "high-contrast-light",
    name: "Hoher Kontrast (Hell)",
    isDark: false,
    colors: {
      primary: "#1d4ed8",
      secondary: "#1e293b",
      accent: "#0369a1",
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#020617",
      error: "#b91c1c",
      warning: "#b45309",
      success: "#047857",
    },
  },
  {
    id: "high-contrast-dark",
    name: "Hoher Kontrast (Dunkel)",
    isDark: true,
    colors: {
      primary: "#60a5fa",
      secondary: "#cbd5e1",
      accent: "#38bdf8",
      background: "#020617",
      surface: "#0f172a",
      text: "#f8fafc",
      error: "#f87171",
      warning: "#fbbf24",
      success: "#34d399",
    },
  },
];

/**
 * Settings Store zur Verwaltung der Benutzereinstellungen
 * - Verwaltet Benutzereinstellungen wie Schriftart, Theme, Barrierefreiheit, etc.
 * - Synchronisiert Einstellungen mit dem Backend
 * - Wendet Einstellungen auf die UI an
 */
export const useSettingsStore = defineStore(
  "settings",
  () => {
    // Referenz auf den UI-Store
    const uiStore = useUIStore();

    // Standard-Einstellungen
    const defaultSettings: SettingsState = {
      font: {
        size: "medium",
        family: "system",
        lineHeight: "normal",
      },
      theme: {
        currentTheme: "default-light",
        customThemes: [],
      },
      a11y: {
        reduceMotion: false,
        highContrast: false,
        largeText: false,
        screenReader: false,
      },
      messages: {
        renderMarkdown: true,
        codeHighlighting: true,
        showTimestamps: true,
        maxDisplayedMessages: 50,
      },
      chat: {
        autoSubmit: false,
        clearInputAfterSubmit: true,
        enableTextCompletion: true,
        enableStreamedResponse: true,
        showSourceReferences: true,
      },
      notifications: {
        enabled: true,
        sound: true,
        desktop: false,
        sessionCompletion: true,
        mentions: true,
      },
      isLoading: false,
      error: null,
    };

    // State
    const font = ref<FontSettings>(defaultSettings.font);
    const theme = ref<ThemeSettings>(defaultSettings.theme);
    const a11y = ref<A11ySettings>(defaultSettings.a11y);
    const messages = ref<MessageSettings>(defaultSettings.messages);
    const chat = ref<ChatSettings>(defaultSettings.chat);
    const notifications = ref<NotificationSettings>(
      defaultSettings.notifications,
    );
    const isLoading = ref<boolean>(false);
    const error = ref<string | null>(null);

    // Getters
    const currentTheme = computed(() => {
      const allThemes = [...DEFAULT_THEMES, ...theme.value.customThemes];
      return (
        allThemes.find((t) => t.id === theme.value.currentTheme) ||
        DEFAULT_THEMES[0]
      );
    });

    const allThemes = computed(() => {
      return [...DEFAULT_THEMES, ...theme.value.customThemes];
    });

    const currentFontSize = computed(() => {
      switch (font.value.size) {
        case "small":
          return "0.875rem"; // 14px
        case "medium":
          return "1rem"; // 16px
        case "large":
          return "1.125rem"; // 18px
        case "extra-large":
          return "1.25rem"; // 20px
        default:
          return "1rem";
      }
    });

    const currentFontFamily = computed(() => {
      switch (font.value.family) {
        case "serif":
          return "Georgia, serif";
        case "sans-serif":
          return "Helvetica, Arial, sans-serif";
        case "monospace":
          return "Consolas, monospace";
        case "system":
        default:
          return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif';
      }
    });

    const currentLineHeight = computed(() => {
      switch (font.value.lineHeight) {
        case "compact":
          return 1.2;
        case "normal":
          return 1.5;
        case "relaxed":
          return 1.8;
        default:
          return 1.5;
      }
    });

    // Actions
    /**
     * Alle Einstellungen vom Server laden
     */
    async function fetchSettings(): Promise<void> {
      isLoading.value = true;
      error.value = null;

      try {
        const response = await axios.get("/api/settings");
        if (response.data) {
          if (response.data.font) font.value = response.data.font;
          if (response.data.theme) theme.value = response.data.theme;
          if (response.data.a11y) a11y.value = response.data.a11y;
          if (response.data.messages) messages.value = response.data.messages;
          if (response.data.chat) chat.value = response.data.chat;
          if (response.data.notifications)
            notifications.value = response.data.notifications;
        }
      } catch (err: any) {
        console.error("Error fetching settings:", err);
        error.value =
          err.response?.data?.message || "Fehler beim Laden der Einstellungen";
      } finally {
        isLoading.value = false;
      }
    }

    /**
     * Einstellungen auf dem Server speichern
     */
    async function saveSettings(): Promise<boolean> {
      isLoading.value = true;
      error.value = null;

      try {
        const payload = {
          font: font.value,
          theme: theme.value,
          a11y: a11y.value,
          messages: messages.value,
          chat: chat.value,
          notifications: notifications.value,
        };

        await axios.put("/api/settings", payload);
        return true;
      } catch (err: any) {
        console.error("Error saving settings:", err);
        error.value =
          err.response?.data?.message ||
          "Fehler beim Speichern der Einstellungen";
        return false;
      } finally {
        isLoading.value = false;
      }
    }

    /**
     * Theme-Einstellungen aktualisieren
     */
    function setTheme(themeId: string): void {
      // Prüfen, ob das Theme existiert
      const themeExists = [...DEFAULT_THEMES, ...theme.value.customThemes].some(
        (t) => t.id === themeId,
      );

      if (themeExists) {
        theme.value.currentTheme = themeId;
        applyTheme();
      }
    }

    /**
     * Benutzerdefiniertes Theme hinzufügen
     */
    function addCustomTheme(newTheme: ColorTheme): void {
      theme.value.customThemes.push(newTheme);
    }

    /**
     * Benutzerdefiniertes Theme aktualisieren
     */
    function updateCustomTheme(
      themeId: string,
      updatedTheme: Partial<ColorTheme>,
    ): void {
      const index = theme.value.customThemes.findIndex((t) => t.id === themeId);

      if (index !== -1) {
        theme.value.customThemes[index] = {
          ...theme.value.customThemes[index],
          ...updatedTheme,
        };

        // Wenn das aktualisierte Theme das aktuelle ist, neu anwenden
        if (theme.value.currentTheme === themeId) {
          applyTheme();
        }
      }
    }

    /**
     * Benutzerdefiniertes Theme löschen
     */
    function deleteCustomTheme(themeId: string): void {
      // Überprüfen, ob es sich um ein Standard-Theme handelt
      const isDefaultTheme = DEFAULT_THEMES.some((t) => t.id === themeId);

      if (!isDefaultTheme) {
        theme.value.customThemes = theme.value.customThemes.filter(
          (t) => t.id !== themeId,
        );

        // Wenn das gelöschte Theme das aktuelle ist, zum Standard-Theme wechseln
        if (theme.value.currentTheme === themeId) {
          theme.value.currentTheme = "default-light";
          applyTheme();
        }
      }
    }

    /**
     * Aktuelles Theme auf die Anwendung anwenden
     */
    function applyTheme(): void {
      const theme = currentTheme.value;

      // Dark Mode im UI-Store setzen
      if (theme.isDark) {
        uiStore.enableDarkMode();
      } else {
        uiStore.disableDarkMode();
      }

      // CSS-Variablen für das Theme setzen
      Object.entries(theme.colors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--color-${key}`, value);
      });
    }

    /**
     * Schrifteinstellungen aktualisieren
     */
    function updateFontSettings(newSettings: Partial<FontSettings>): void {
      font.value = {
        ...font.value,
        ...newSettings,
      };

      applyFontSettings();
    }

    /**
     * Schrifteinstellungen auf die Anwendung anwenden
     */
    function applyFontSettings(): void {
      document.documentElement.style.setProperty(
        "--font-size",
        currentFontSize.value,
      );
      document.documentElement.style.setProperty(
        "--font-family",
        currentFontFamily.value,
      );
      document.documentElement.style.setProperty(
        "--line-height",
        currentLineHeight.value.toString(),
      );

      // Größere Schrift für bessere Lesbarkeit aktivieren
      if (a11y.value.largeText) {
        document.documentElement.classList.add("large-text");
      } else {
        document.documentElement.classList.remove("large-text");
      }
    }

    /**
     * Barrierefreiheitseinstellungen aktualisieren
     */
    function updateA11ySettings(newSettings: Partial<A11ySettings>): void {
      a11y.value = {
        ...a11y.value,
        ...newSettings,
      };

      applyA11ySettings();
    }

    /**
     * Barrierefreiheitseinstellungen auf die Anwendung anwenden
     */
    function applyA11ySettings(): void {
      // Bewegungen reduzieren
      if (a11y.value.reduceMotion) {
        document.documentElement.classList.add("reduce-motion");
      } else {
        document.documentElement.classList.remove("reduce-motion");
      }

      // Hoher Kontrast
      if (a11y.value.highContrast) {
        document.documentElement.classList.add("high-contrast");
      } else {
        document.documentElement.classList.remove("high-contrast");
      }

      // Text vergrößern
      if (a11y.value.largeText) {
        document.documentElement.classList.add("large-text");
      } else {
        document.documentElement.classList.remove("large-text");
      }

      // Screenreader-Unterstützung
      if (a11y.value.screenReader) {
        document.documentElement.setAttribute("role", "application");
      } else {
        document.documentElement.removeAttribute("role");
      }
    }

    /**
     * Nachrichteneinstellungen aktualisieren
     */
    function updateMessageSettings(
      newSettings: Partial<MessageSettings>,
    ): void {
      messages.value = {
        ...messages.value,
        ...newSettings,
      };
    }

    /**
     * Chat-Einstellungen aktualisieren
     */
    function updateChatSettings(newSettings: Partial<ChatSettings>): void {
      chat.value = {
        ...chat.value,
        ...newSettings,
      };
    }

    /**
     * Benachrichtigungseinstellungen aktualisieren
     */
    function updateNotificationSettings(
      newSettings: Partial<NotificationSettings>,
    ): void {
      notifications.value = {
        ...notifications.value,
        ...newSettings,
      };

      // Berechtigung für Desktopbenachrichtigungen anfordern, wenn aktiviert
      if (notifications.value.desktop && notifications.value.enabled) {
        requestNotificationPermission();
      }
    }

    /**
     * Berechtigung für Desktopbenachrichtigungen anfordern
     */
    async function requestNotificationPermission(): Promise<boolean> {
      if (!("Notification" in window)) {
        // Browser unterstützt keine Benachrichtigungen
        notifications.value.desktop = false;
        return false;
      }

      if (Notification.permission === "granted") {
        return true;
      }

      try {
        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
          notifications.value.desktop = false;
          return false;
        }

        return true;
      } catch (err) {
        console.error("Error requesting notification permission:", err);
        notifications.value.desktop = false;
        return false;
      }
    }

    /**
     * Einstellungen auf Standard zurücksetzen
     */
    async function resetToDefault(): Promise<void> {
      font.value = { ...defaultSettings.font };
      theme.value = { ...defaultSettings.theme };
      a11y.value = { ...defaultSettings.a11y };
      messages.value = { ...defaultSettings.messages };
      chat.value = { ...defaultSettings.chat };
      notifications.value = { ...defaultSettings.notifications };

      // Einstellungen anwenden
      applyTheme();
      applyFontSettings();
      applyA11ySettings();

      // Auf dem Server speichern
      await saveSettings();
    }

    /**
     * Alle Einstellungen initialisieren und anwenden
     */
    function initialize(): void {
      applyTheme();
      applyFontSettings();
      applyA11ySettings();
    }

    // Auf Änderungen in den Theme-Einstellungen reagieren
    watch(
      () => theme.value.currentTheme,
      () => {
        applyTheme();
      },
    );

    // Auf Änderungen in den Font-Einstellungen reagieren
    watch(
      font,
      () => {
        applyFontSettings();
      },
      { deep: true },
    );

    // Auf Änderungen in den A11y-Einstellungen reagieren
    watch(
      a11y,
      () => {
        applyA11ySettings();
      },
      { deep: true },
    );

    // Store initialisieren
    initialize();

    return {
      // State
      font,
      theme,
      a11y,
      messages,
      chat,
      notifications,
      isLoading,
      error,

      // Getters
      currentTheme,
      allThemes,
      currentFontSize,
      currentFontFamily,
      currentLineHeight,

      // Actions
      fetchSettings,
      saveSettings,
      setTheme,
      addCustomTheme,
      updateCustomTheme,
      deleteCustomTheme,
      updateFontSettings,
      updateA11ySettings,
      updateMessageSettings,
      updateChatSettings,
      updateNotificationSettings,
      requestNotificationPermission,
      resetToDefault,
      initialize,
    };
  },
  {
    // Store serialization options für Persistenz
    persist: {
      enabled: true,
      strategies: [
        {
          storage: localStorage,
          paths: ["font", "theme", "a11y", "messages", "chat", "notifications"],
        },
      ],
    },
  },
);
