// stores/ui.js
import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useAuthStore } from "./auth";

export const useUiStore = defineStore("ui", () => {
  // Auth Store für Rollenprüfung
  const authStore = useAuthStore();

  // State
  const activeView = ref("chat"); // 'chat' oder 'admin'
  const showSettingsPanel = ref(false);
  const currentTheme = ref(localStorage.getItem("theme") || "light");
  const currentFontSize = ref(localStorage.getItem("fontSize") || "medium");
  const accessibilitySettings = ref({
    reduceMotion: localStorage.getItem("reduceMotion") === "true",
    simpleLanguage: localStorage.getItem("simpleLanguage") === "true",
  });

  // Getters
  const canAccessAdminView = computed(() => {
    return authStore.userRole === "admin";
  });

  const isReducedMotion = computed(() => {
    return accessibilitySettings.value.reduceMotion;
  });

  const isSimpleLanguage = computed(() => {
    return accessibilitySettings.value.simpleLanguage;
  });

  // Actions
  const toggleView = () => {
    if (!canAccessAdminView.value && activeView.value === "chat") {
      console.warn("Benutzer hat keine Admin-Rechte");
      return;
    }

    activeView.value = activeView.value === "chat" ? "admin" : "chat";
  };

  const setActiveView = (view) => {
    if (view === "admin" && !canAccessAdminView.value) {
      console.warn("Benutzer hat keine Admin-Rechte");
      return;
    }

    activeView.value = view;
  };

  const toggleSettingsPanel = () => {
    showSettingsPanel.value = !showSettingsPanel.value;
  };

  const setTheme = (theme) => {
    currentTheme.value = theme;
    localStorage.setItem("theme", theme);

    // Theme-Klasse am <html> Element anwenden
    document.documentElement.classList.remove(
      "theme-light",
      "theme-dark",
      "theme-contrast",
    );
    document.documentElement.classList.add(`theme-${theme}`);
  };

  const setFontSize = (size) => {
    currentFontSize.value = size;
    localStorage.setItem("fontSize", size);

    // Schriftgrößen-Klasse am <html> Element anwenden
    document.documentElement.classList.remove(
      "font-small",
      "font-medium",
      "font-large",
    );
    document.documentElement.classList.add(`font-${size}`);
  };

  const setAccessibilitySetting = (setting, value) => {
    accessibilitySettings.value[setting] = value;
    localStorage.setItem(setting, value);

    // Spezifische Behandlung für bestimmte Einstellungen
    if (setting === "simpleLanguage") {
      window.useSimpleLanguage = value;
    }
  };

  // Initialization
  const initializeUiSettings = () => {
    // Theme anwenden
    setTheme(currentTheme.value);

    // Schriftgröße anwenden
    setFontSize(currentFontSize.value);

    // Accessibility-Einstellungen anwenden
    if (accessibilitySettings.value.simpleLanguage) {
      window.useSimpleLanguage = true;
    }

    // Reduced Motion Preference des Browsers prüfen und respektieren
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion && !accessibilitySettings.value.reduceMotion) {
      setAccessibilitySetting("reduceMotion", true);
    }
  };

  // Watcher
  watch(
    () => authStore.userRole,
    (newRole) => {
      // Falls der Benutzer die Admin-Rolle verliert und sich im Admin-Bereich befindet
      if (newRole !== "admin" && activeView.value === "admin") {
        activeView.value = "chat";
      }
    },
  );

  return {
    // State
    activeView,
    showSettingsPanel,
    currentTheme,
    currentFontSize,
    accessibilitySettings,

    // Getters
    canAccessAdminView,
    isReducedMotion,
    isSimpleLanguage,

    // Actions
    toggleView,
    setActiveView,
    toggleSettingsPanel,
    setTheme,
    setFontSize,
    setAccessibilitySetting,
    initializeUiSettings,
  };
});
