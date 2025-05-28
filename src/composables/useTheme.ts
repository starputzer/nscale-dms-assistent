/**
 * nscale DMS Assistant Theme Hook
 *
 * Vue Composition API Hook für die Verwendung des Theme-Systems in Vue-Komponenten.
 * Bietet reaktive Zugriffsmöglichkeiten auf das aktuelle Theme und Theme-Änderungen.
 *
 * Letzte Aktualisierung: 09.05.2025
 */

import { ref, onMounted, onUnmounted, computed } from "vue";

/**
 * Theme-Optionen für das nscale DMS Assistenten Design-System
 */
export const THEMES = {
  LIGHT: "light",
  DARK: "dark",
  CONTRAST: "contrast",
} as const;

type Theme = (typeof THEMES)[keyof typeof THEMES];

/**
 * Hook für die Theme-Verwaltung in Vue-Komponenten
 * @returns Ein Objekt mit reaktiven Theme-Eigenschaften und -Methoden
 */
export function useTheme() {
  // Reaktiver Zustand für aktuelles Theme und User-Einstellungen
  const currentTheme = ref<Theme>(getInitialTheme());
  const useSystemTheme = ref<boolean>(
    localStorage.getItem("nscale-system-theme") === "true",
  );
  const systemIsDark = ref(
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const isChangingTheme = ref<boolean>(false);

  /**
   * Ermittelt das initiale Theme basierend auf localStorage oder System-Einstellungen
   */
  function getInitialTheme(): Theme {
    // Gespeichertes Theme prüfen
    const savedTheme = localStorage.getItem("nscale-theme") as Theme | null;

    // Wenn ein Theme gespeichert ist und gültig ist, dieses verwenden
    if (savedTheme && Object.values(THEMES).includes(savedTheme as any)) {
      return savedTheme;
    }

    // Wenn System-Theme-Preference aktiviert oder nichts gespeichert ist
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    return prefersDark ? THEMES.DARK : THEMES.LIGHT;
  }

  /**
   * Wendet ein Theme an und speichert die Auswahl
   */
  function setTheme(theme: Theme): void {
    if (!Object.values(THEMES).includes(theme as any)) {
      console.error(`Ungültiges Theme: ${theme}`);
      return;
    }

    isChangingTheme.value = true;

    // Theme am HTML-Element anwenden
    document.documentElement.setAttribute("data-theme", theme);

    // Theme in localStorage speichern
    localStorage.setItem("nscale-theme", theme);

    // Reaktiven Zustand aktualisieren
    currentTheme.value = theme;

    // Event für andere Komponenten auslösen
    document.dispatchEvent(
      new CustomEvent("nscale-theme-change", {
        detail: { theme, useSystemTheme: useSystemTheme.value },
      }),
    );

    // Transitions ermöglichen
    setTimeout(() => {
      isChangingTheme.value = false;
    }, 300);
  }

  /**
   * Wechselt zwischen hellem und dunklem Theme
   */
  function toggleTheme(): void {
    // Wenn Systemeinstellung, dann zu manuellem Modus wechseln
    if (useSystemTheme.value) {
      setUseSystemTheme(false);
      // Mit aktuellem Theme beginnen
      const startTheme = systemIsDark.value ? THEMES.DARK : THEMES.LIGHT;
      const nextTheme =
        startTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
      setTheme(nextTheme);
      return;
    }

    // Zwischen hell und dunkel wechseln
    const newTheme =
      currentTheme.value === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    setTheme(newTheme);
  }

  /**
   * Wechselt zum Kontrast-Modus oder zurück
   */
  function toggleContrastMode(): void {
    const isContrast = currentTheme.value === THEMES.CONTRAST;
    setTheme(isContrast ? THEMES.LIGHT : THEMES.CONTRAST);

    // System-Theme-Synchronisation deaktivieren, da manuelle Auswahl
    if (useSystemTheme.value) {
      setUseSystemTheme(false);
    }
  }

  /**
   * Aktiviert oder deaktiviert die Synchronisation mit Systemeinstellungen
   */
  function setUseSystemTheme(value: boolean): void {
    useSystemTheme.value = value;
    localStorage.setItem("nscale-system-theme", value.toString());

    if (value) {
      // Bei Aktivierung System-Theme anwenden
      const isDarkMode = systemIsDark.value;
      setTheme(isDarkMode ? THEMES.DARK : THEMES.LIGHT);
    }

    // Event für andere Komponenten auslösen
    document.dispatchEvent(
      new CustomEvent("nscale-theme-change", {
        detail: { theme: currentTheme.value, useSystemTheme: value },
      }),
    );
  }

  // Überwachen von Änderungen an der Systemeinstellung
  const handleSystemThemeChange = (event: MediaQueryListEvent) => {
    systemIsDark.value = event.matches;

    // Theme aktualisieren, wenn Systemeinstellung verwendet wird
    if (useSystemTheme.value) {
      setTheme(event.matches ? THEMES.DARK : THEMES.LIGHT);
    }
  };

  // Event-Listener beim Mounten hinzufügen
  onMounted(() => {
    // Initialen Theme-Zustand anwenden
    setTheme(currentTheme.value);

    // MediaQuery für Systemeinstellung überwachen
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", handleSystemThemeChange);

    // Event-Listener für Tastenkombinationen
    const keydownHandler = (event: KeyboardEvent) => {
      // Alt+Shift+D für Dark Mode Toggle
      if (event.altKey && event.shiftKey && event.key === "D") {
        toggleTheme();
        event.preventDefault();
      }

      // Alt+Shift+C für Kontrast-Modus Toggle
      if (event.altKey && event.shiftKey && event.key === "C") {
        toggleContrastMode();
        event.preventDefault();
      }
    };

    document.addEventListener("keydown", keydownHandler);

    // Aufräumen wenn die Komponente zerstört wird
    onUnmounted(() => {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .removeEventListener("change", handleSystemThemeChange);
      document.removeEventListener("keydown", keydownHandler);
    });
  });

  // Computed Properties
  const isDarkTheme = computed(
    () =>
      currentTheme.value === THEMES.DARK ||
      (useSystemTheme.value && systemIsDark.value),
  );
  const isContrastTheme = computed(
    () => currentTheme.value === THEMES.CONTRAST,
  );
  const isLightTheme = computed(
    () =>
      currentTheme.value === THEMES.LIGHT &&
      !(useSystemTheme.value && systemIsDark.value),
  );

  /**
   * Initializes the theme system
   */
  function initializeTheme(): void {
    // Apply the initial theme
    const theme =
      useSystemTheme.value && systemIsDark.value
        ? THEMES.DARK
        : currentTheme.value;
    document.documentElement.setAttribute("data-theme", theme);

    // Setup system theme listeners
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", (e) => {
      systemIsDark.value = e.matches;
      if (useSystemTheme.value) {
        setTheme(systemIsDark.value ? THEMES.DARK : THEMES.LIGHT);
      }
    });
  }

  // API des Composables
  return {
    // State
    currentTheme,
    useSystemTheme,
    systemIsDark,
    isChangingTheme,

    // Computed
    isDarkTheme,
    isLightTheme,
    isContrastTheme,

    // Actions
    setTheme,
    toggleTheme,
    toggleContrastMode,
    setUseSystemTheme,
    initializeTheme,

    // Constants
    THEMES,
  };
}

export default useTheme;
