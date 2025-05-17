/**
 * nscale DMS Assistant Theme Switcher
 *
 * JavaScript-Mechanismus zum Wechseln zwischen Light-, Dark- und Kontrast-Mode.
 * Unterstützt System-Präferenzen und manuelle Benutzerauswahl.
 *
 * Letzte Aktualisierung: 08.05.2025
 */

// Verfügbare Themes
const THEMES = {
  LIGHT: "light",
  DARK: "dark",
  CONTRAST: "contrast",
};

// Schlüssel für lokalen Speicher
const THEME_STORAGE_KEY = "nscale-preferred-theme";
const USE_SYSTEM_THEME_KEY = "nscale-use-system-theme";

/**
 * Theme-Manager für nscale DMS Assistant
 */
class ThemeManager {
  constructor() {
    this.currentTheme = THEMES.LIGHT;
    this.useSystemTheme = true;
    this.systemThemeMedia = window.matchMedia("(prefers-color-scheme: dark)");

    // Initialisierung
    this.init();
  }

  /**
   * Initialisiert den ThemeManager
   */
  init() {
    // Gespeicherte Einstellungen abrufen
    this.loadSavedPreferences();

    // Event-Listener für Systemänderungen
    this.systemThemeMedia.addEventListener("change", () => {
      if (this.useSystemTheme) {
        this.applySystemTheme();
      }
    });

    // Initiales Theme anwenden
    this.applyTheme();
  }

  /**
   * Lädt gespeicherte Benutzereinstellungen
   */
  loadSavedPreferences() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const savedUseSystemTheme = localStorage.getItem(USE_SYSTEM_THEME_KEY);

    if (savedUseSystemTheme !== null) {
      this.useSystemTheme = savedUseSystemTheme === "true";
    }

    if (savedTheme && Object.values(THEMES).includes(savedTheme)) {
      this.currentTheme = savedTheme;
    }
  }

  /**
   * Speichert Benutzereinstellungen
   */
  savePreferences() {
    localStorage.setItem(THEME_STORAGE_KEY, this.currentTheme);
    localStorage.setItem(USE_SYSTEM_THEME_KEY, this.useSystemTheme.toString());
  }

  /**
   * Wendet das aktuelle Theme an
   */
  applyTheme() {
    // Falls Systemeinstellung verwendet werden soll
    if (this.useSystemTheme) {
      this.applySystemTheme();
      return;
    }

    // Alle Theme-Klassen entfernen
    document.body.classList.remove(
      "theme-light",
      "theme-dark",
      "theme-contrast",
    );

    // Aktives Theme anwenden
    document.body.classList.add(`theme-${this.currentTheme}`);

    // Meta-Theme-Color anpassen (für mobile Browser)
    this.updateMetaThemeColor();

    // Ereignis auslösen
    this.dispatchThemeChangeEvent();
  }

  /**
   * Wendet das vom System bevorzugte Theme an
   */
  applySystemTheme() {
    const isDarkMode = this.systemThemeMedia.matches;
    const systemTheme = isDarkMode ? THEMES.DARK : THEMES.LIGHT;

    document.body.classList.remove(
      "theme-light",
      "theme-dark",
      "theme-contrast",
    );
    document.body.classList.add(`theme-${systemTheme}`);

    // Meta-Theme-Color anpassen
    this.updateMetaThemeColor(systemTheme);

    // Ereignis auslösen
    this.dispatchThemeChangeEvent(systemTheme);
  }

  /**
   * Aktualisiert den Meta-Theme-Color
   * @param {string} theme - Optionales Theme, wenn nicht das aktuelle verwendet werden soll
   */
  updateMetaThemeColor(theme = null) {
    const currentTheme = theme || this.currentTheme;

    let metaThemeColor = "#ffffff"; // Standard für Light Mode

    if (currentTheme === THEMES.DARK) {
      metaThemeColor = "#121212"; // Dunkelgrau für Dark Mode
    } else if (currentTheme === THEMES.CONTRAST) {
      metaThemeColor = "#000000"; // Schwarz für Kontrast-Mode
    }

    // Meta-Tag aktualisieren oder erstellen
    let metaTag = document.querySelector('meta[name="theme-color"]');
    if (!metaTag) {
      metaTag = document.createElement("meta");
      metaTag.name = "theme-color";
      document.head.appendChild(metaTag);
    }

    metaTag.content = metaThemeColor;
  }

  /**
   * Löst ein benutzerdefiniertes Ereignis bei Theme-Änderungen aus
   * @param {string} theme - Optionales Theme, wenn nicht das aktuelle verwendet werden soll
   */
  dispatchThemeChangeEvent(theme = null) {
    const currentTheme = theme || this.currentTheme;

    const event = new CustomEvent("nscale-theme-change", {
      detail: {
        theme: currentTheme,
        useSystemTheme: this.useSystemTheme,
      },
    });

    document.dispatchEvent(event);
  }

  /**
   * Wechselt zum angegebenen Theme
   * @param {string} theme - Das anzuwendende Theme
   */
  setTheme(theme) {
    if (!Object.values(THEMES).includes(theme)) {
      console.error(`Ungültiges Theme: ${theme}`);
      return;
    }

    this.currentTheme = theme;
    this.useSystemTheme = false;
    this.savePreferences();
    this.applyTheme();
  }

  /**
   * Aktiviert oder deaktiviert die Verwendung des Systemthemes
   * @param {boolean} useSystem - Ob das Systemtheme verwendet werden soll
   */
  setUseSystemTheme(useSystem) {
    this.useSystemTheme = useSystem;
    this.savePreferences();
    this.applyTheme();
  }

  /**
   * Gibt das aktuelle Theme zurück
   * @returns {string} Das aktuelle Theme
   */
  getCurrentTheme() {
    if (this.useSystemTheme) {
      return this.systemThemeMedia.matches ? THEMES.DARK : THEMES.LIGHT;
    }
    return this.currentTheme;
  }

  /**
   * Überprüft, ob das Systemtheme verwendet wird
   * @returns {boolean} Ob das Systemtheme verwendet wird
   */
  isUsingSystemTheme() {
    return this.useSystemTheme;
  }
}

// Singleton-Instanz erstellen
const themeManager = new ThemeManager();

export { themeManager, THEMES };
