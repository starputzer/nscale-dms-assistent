/**
 * nscale DMS Assistant CSS Design System
 *
 * Zentraler Einstiegspunkt für das CSS-Design-System.
 * Dieser Export ermöglicht den einfachen Import aller CSS-Dateien und des Theme-Managers.
 *
 * Letzte Aktualisierung: 08.05.2025
 */

// CSS-Dateien
import "./variables.css";
import "./class-conventions.css";
import "./responsive.css";

// Theme-Manager
import { themeManager, THEMES } from "./theme-switcher";

// Export aller relevanten Komponenten
export { themeManager, THEMES };

/**
 * Initialisiert das Theme-System
 * Diese Funktion kann in der main.js/main.ts Datei aufgerufen werden
 */
export function initializeDesignSystem() {
  // Theme beim Start anwenden
  document.addEventListener("DOMContentLoaded", () => {
    themeManager.applyTheme();
  });

  // Event-Listener für Theme-Änderungen durch das Betriebssystem hinzufügen
  const systemThemeMedia = window.matchMedia("(prefers-color-scheme: dark)");
  systemThemeMedia.addEventListener("change", () => {
    if (themeManager.isUsingSystemTheme()) {
      themeManager.applySystemTheme();
    }
  });

  console.info("nscale DMS Assistant Design System initialized");
}

// Automatische Initialisierung, wenn das Script direkt geladen wird
if (typeof window !== "undefined") {
  initializeDesignSystem();
}
