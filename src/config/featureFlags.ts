/**
 * Feature-Flags für die nscale DMS Assistant Anwendung
 *
 * Diese Flags steuern die Aktivierung neuer Features und Migrationsschritte.
 * Sie ermöglichen eine schrittweise Migration und Feature-Aktivierung.
 */

export const FEATURE_FLAGS = {
  // Core-Features
  ENABLE_STREAMING: true,
  ENABLE_DARK_MODE: true,
  ENABLE_MOTD: true,

  // Migrations-Features
  ENABLE_OPTIMIZED_STRUCTURE: true,
  ENABLE_LEGACY_HTML_REMOVAL: false,
  ENABLE_CDN_MIGRATION: false,

  // Experimentelle Features
  ENABLE_VIRTUAL_SCROLLER: false,
  ENABLE_OFFLINE_MODE: false,
  ENABLE_ADVANCED_SEARCH: false,

  // Rollback-Features
  ENABLE_LEGACY_FALLBACK: true,

  // Pure Vue Modus
  USE_MOCK_SERVICES: true,
  ENABLE_SOURCE_REFERENCES: true,
  ENABLE_FEEDBACK: true,

  // SFC-Features explizit aktivieren
  ENABLE_SFC_CHAT: true,
  ENABLE_SFC_COMPONENTS: true,
};

/**
 * Prüft, ob ein Feature aktiviert ist
 * @param feature Name des Features
 * @returns true, wenn das Feature aktiviert ist
 */
export function isFeatureEnabled(
  feature: keyof typeof FEATURE_FLAGS | string,
): boolean {
  if (feature in FEATURE_FLAGS) {
    return FEATURE_FLAGS[feature as keyof typeof FEATURE_FLAGS] === true;
  }
  return false;
}

/**
 * Gibt alle aktivierten Features zurück
 * @returns Array mit den Namen aller aktivierten Features
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(FEATURE_FLAGS)
    .filter(([_, enabled]: any) => enabled)
    .map(([feature]: any) => feature);
}

/**
 * Aktiviert ein Feature zur Laufzeit
 * @param feature Name des Features
 * @param enabled Neuer Status des Features
 */
export function setFeatureEnabled(
  feature: keyof typeof FEATURE_FLAGS | string,
  enabled: boolean,
): void {
  if (feature in FEATURE_FLAGS) {
    FEATURE_FLAGS[feature as keyof typeof FEATURE_FLAGS] = enabled;

    // Feature-Änderung protokollieren
    console.log(
      `Feature "${feature}" wurde ${enabled ? "aktiviert" : "deaktiviert"}`,
    );

    // Event auslösen für reaktive Komponenten
    window.dispatchEvent(
      new CustomEvent("feature-flag-changed", {
        detail: { feature, enabled },
      }),
    );
  }
}

/**
 * Initialisiert die Feature-Flags basierend auf URL-Parametern und lokalen Einstellungen
 * @returns Die Liste der aktiven Features nach der Initialisierung
 */
export function initializeFeatureFlags(): string[] {
  // URL-Parameter prüfen
  const urlParams = new URLSearchParams(window.location.search);

  // Feature-Flags aus URL-Parametern extrahieren
  Array.from(urlParams.entries()).forEach(([key, value]: any) => {
    if (key.startsWith("feature_")) {
      const featureName = key.replace("feature_", "").toUpperCase();
      const fullFeatureName = `ENABLE_${featureName}`;

      // Feature nur setzen, wenn es existiert
      if (fullFeatureName in FEATURE_FLAGS) {
        setFeatureEnabled(
          fullFeatureName as keyof typeof FEATURE_FLAGS,
          value === "true" || value === "1",
        );
      }
    }
  });

  // Lokale gespeicherte Einstellungen berücksichtigen
  try {
    const storedFeatures = localStorage.getItem("nscale_feature_flags");
    if (storedFeatures) {
      const features = JSON.parse(storedFeatures);
      Object.entries(features).forEach(([feature, enabled]: any) => {
        if (feature in FEATURE_FLAGS) {
          setFeatureEnabled(
            feature as keyof typeof FEATURE_FLAGS,
            Boolean(enabled),
          );
        }
      });
    }
  } catch (error) {
    console.warn(
      "Fehler beim Laden der Feature-Flags aus dem LocalStorage:",
      error,
    );
  }

  // Pure Mode automatisch erkennen
  const useMockApi = urlParams.get("mockApi") === "true";
  if (useMockApi) {
    setFeatureEnabled("USE_MOCK_SERVICES", true);
  }

  // Pinia Feature Store explizit für das Fenster-Objekt verfügbar machen
  try {
    // Feature Flags in localStorage setzen für direkte Aktivierung
    localStorage.setItem("featureToggles:useSfcChat", "true");
    localStorage.setItem("featureToggles:useSfcAdmin", "true");
    localStorage.setItem("featureToggles:useSfcSettings", "true");
    localStorage.setItem("featureToggles:useSfcChatContainer", "true");
    console.log("Feature Flags in localStorage aktiviert");

    // Fenster-Attribut setzen für Debugging
    (window as any).FEATURES_ENABLED = true;
  } catch (e) {
    console.warn("Fehler beim Aktivieren der Feature-Flags", e);
  }

  // Liste der aktiven Features zurückgeben
  const enabledFeatures = getEnabledFeatures();
  console.log("Aktive Features:", enabledFeatures);

  return enabledFeatures;
}
