import { useAuth } from "./useAuth";
import { useChat } from "./useChat";
import { useUI } from "./useUI";
import { useSettings } from "./useSettings";
import { useFeatureToggles } from "./useFeatureToggles";

/**
 * Hauptkomposable für nscale-Funktionalität
 *
 * Bündelt alle nscale-spezifischen Komposables in einer einzigen API für einfache Verwendung
 * in Komponenten. Reduziert repetitiven Import-Code und vereinheitlicht den Zugriff.
 */
export function useNScale() {
  // Alle Komposables initialisieren
  const auth = useAuth();
  const chat = useChat();
  const ui = useUI();
  const settings = useSettings();
  const features = useFeatureToggles();

  // Hilfsfunktion zur Prüfung, ob ein Feature aktiviert ist
  function isFeatureEnabled(featureName: string): boolean {
    return features.isEnabled(featureName);
  }

  // Hilfsfunktion zum Umschalten eines Features
  function toggleFeature(featureName: string): boolean {
    return features.toggleFeature(featureName);
  }

  // Kombinierte Initialisierung aller Services
  async function initialize(): Promise<boolean> {
    try {
      // Feature-Status abrufen
      const useAuth = isFeatureEnabled("usePiniaAuth");
      const useChat = isFeatureEnabled("usePiniaSessions");
      const useUI = isFeatureEnabled("usePiniaUI");
      const useSettings = isFeatureEnabled("usePiniaSettings");

      // Nur aktivierte Services initialisieren
      const promises = [];

      if (useAuth && auth.isAuthenticated) {
        promises.push(auth.refreshUserInfo());
      }

      if (useChat) {
<<<<<<< HEAD
        promises.push(chat as any).initialize());
      }

      if (useUI) {
        (ui as any).initialize();
      }

      if (useSettings) {
        (settings as any).initialize();
=======
        promises.push(chat.initialize());
      }

      if (useUI) {
        ui.initialize();
      }

      if (useSettings) {
        settings.initialize();
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      }

      // Auf Abschluss aller Initialisierungen warten
      if (promises.length > 0) {
        await Promise.all(promises);
      }

      return true;
    } catch (error) {
      console.error(
        "Fehler bei der Initialisierung der nScale-Services:",
        error,
      );
      return false;
    }
  }

  // Benutzerfreundliche API zurückgeben
  return {
    // Alle einzelnen Services
    auth,
    chat,
    ui,
    settings,
    features,

    // Zusätzliche Hilfsfunktionen
    isFeatureEnabled,
    toggleFeature,
    initialize,
  };
}

/**
 * Exportiere auch alle einzelnen Komposables für direkte Verwendung
 */
export { useAuth, useChat, useUI, useSettings, useFeatureToggles, useBridge };
