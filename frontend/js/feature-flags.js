/**
 * @deprecated Diese Legacy-Komponente ist veraltet und wird in Kürze entfernt.
 * Verwende stattdessen die Vue 3 SFC-Implementierung.
 * Geplantes Entfernungsdatum: 2025-06-10
 */

/**
 * Feature-Flags Management
 *
 * Zentrale Verwaltung von Feature-Flags für die nscale DMS Assistent Anwendung.
 * Diese Datei stellt Funktionen bereit, um Feature-Flags konsistent zu setzen und abzurufen.
 */

/**
 * Aktiviert alle Vue 3 SFC Features und ihre Abhängigkeiten
 * @returns {Object} Status der gesetzten Feature-Flags
 */

// Monitoring für Legacy-Code-Nutzung
function trackLegacyUsage(componentName, action) {
  if (typeof window.telemetry !== "undefined") {
    window.telemetry.trackEvent("legacy_code_usage", {
      component: componentName,
      action: action,
      timestamp: new Date().toISOString(),
    });
  }
}

// Tracking bei Modulinitialisierung
trackLegacyUsage("feature-flags", "initialize");

export function enableAllVueFeatures() {
  // Direkte localStorage-Flags setzen
  localStorage.setItem("useVueComponents", "true");
  localStorage.setItem("useVueDocConverter", "true");

  // Feature-Toggles aus dem Pinia-Store aktualisieren
  let featureToggles = {};
  try {
    const storedToggles = localStorage.getItem("featureToggles");
    featureToggles = storedToggles ? JSON.parse(storedToggles) : {};
  } catch (e) {
    console.error("Fehler beim Laden der Feature-Toggles:", e);
    featureToggles = {};
  }

  // SFC-Features aktivieren
  featureToggles.useSfcAdmin = true;
  featureToggles.useSfcDocConverter = true;
  featureToggles.useSfcChat = true;
  featureToggles.useSfcSettings = true;

  // Abhängigkeiten aktivieren
  featureToggles.usePiniaAuth = true;
  featureToggles.usePiniaUI = true;
  featureToggles.usePiniaSessions = true;
  featureToggles.usePiniaSettings = true;
  featureToggles.useLegacyBridge = true;

  // Feature-Toggles speichern
  localStorage.setItem("featureToggles", JSON.stringify(featureToggles));

  console.log("Alle Vue 3 SFC Features wurden aktiviert");

  return {
    localStorage: {
      useVueComponents: true,
      useVueDocConverter: true,
    },
    featureToggles,
  };
}

/**
 * Holt den Status aller Feature-Flags
 * @returns {Object} Status aller Feature-Flags
 */
export function getFeatureFlagsStatus() {
  // Direkte localStorage-Flags lesen
  const useVueComponents = localStorage.getItem("useVueComponents") === "true";
  const useVueDocConverter =
    localStorage.getItem("useVueDocConverter") === "true";

  // Feature-Toggles aus localStorage lesen
  let featureToggles = {};
  try {
    const storedToggles = localStorage.getItem("featureToggles");
    featureToggles = storedToggles ? JSON.parse(storedToggles) : {};
  } catch (e) {
    console.error("Fehler beim Laden der Feature-Toggles:", e);
  }

  return {
    localStorage: {
      useVueComponents,
      useVueDocConverter,
    },
    featureToggles,
  };
}

/**
 * Setzt ein einzelnes Feature-Flag
 * @param {string} feature - Name des Features
 * @param {boolean} value - Neuer Wert des Features
 * @returns {boolean} Erfolg der Operation
 */
export function setFeature(feature, value) {
  if (feature === "useVueComponents" || feature === "useVueDocConverter") {
    localStorage.setItem(feature, value.toString());
    return true;
  } else {
    try {
      const featureToggles = JSON.parse(
        localStorage.getItem("featureToggles") || "{}",
      );
      featureToggles[feature] = value;
      localStorage.setItem("featureToggles", JSON.stringify(featureToggles));
      return true;
    } catch (e) {
      console.error(`Fehler beim Setzen von Feature '${feature}':`, e);
      return false;
    }
  }
}

/**
 * Setzt alle Feature-Flags zurück
 */
export function resetAllFeatures() {
  // Direkte localStorage-Flags zurücksetzen
  localStorage.removeItem("useVueComponents");
  localStorage.removeItem("useVueDocConverter");

  // Feature-Toggles zurücksetzen
  localStorage.removeItem("featureToggles");

  console.log("Alle Feature-Flags wurden zurückgesetzt");
}

// Globalen Export für nicht-Modul-Context bereitstellen
if (typeof window !== "undefined") {
  window.featureFlags = {
    enableAllVueFeatures,
    getFeatureFlagsStatus,
    setFeature,
    resetAllFeatures,
  };
}
