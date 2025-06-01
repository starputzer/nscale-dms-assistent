/**
 * Legacy-Deaktivierung-Hilfsfunktionen
 *
 * Dieses Modul bietet Hilfsfunktionen, die im Browser verwendet werden können,
 * um Legacy-Komponenten schrittweise zu deaktivieren und die Nutzung zu überwachen.
 */

/**
 * Prüft, ob die Legacy-Implementierung für eine Komponente verwendet werden soll
 * @param {string} componentName - Name der Komponente
 * @returns {boolean} True, wenn Legacy-Code verwendet werden soll, sonst false
 */
export function shouldUseVanillaJS(componentName) {
  // Prüfe Feature-Toggle und Fallback-Status
  const featureToggleName = `useSfc${componentName}`;

  // Lese Feature-Toggle-Status
  let featureToggles = {};
  try {
    const storedToggles = localStorage.getItem("featureToggles");
    featureToggles = storedToggles ? JSON.parse(storedToggles) : {};
  } catch (e) {
    console.error("Fehler beim Laden der Feature-Toggles:", e);
    // Im Fehlerfall auf Vanilla JS zurückfallen
    return true;
  }

  const useSFC = featureToggles[featureToggleName] === true;
  const hasFallbackError = featureToggles[`${featureToggleName}Error`] === true;

  // Legacy wird verwendet, wenn SFC deaktiviert oder ein Fehler aufgetreten ist
  const useLegacy = !useSFC || hasFallbackError;

  // Nutzung tracken
  if (useLegacy) {
    trackLegacyUsage(componentName, "fallback_used");
  }

  return useLegacy;
}

/**
 * Verfolgt die Nutzung von Legacy-Code
 * @param {string} componentName - Name der Komponente
 * @param {string} action - Die ausgeführte Aktion
 */
export function trackLegacyUsage(componentName, action) {
  if (typeof window.telemetry !== "undefined") {
    window.telemetry.trackEvent("legacy_code_usage", {
      component: componentName,
      action: action,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Legacy-Code-Wrapper für schrittweise Deaktivierung
 * @param {string} componentName - Name der Komponente
 * @param {Function} legacyFunction - Die Legacy-Funktion, die eventuell aufgerufen wird
 * @param {Function} newFunction - Die neue Vue-basierte Funktion
 * @returns {any} Ergebnis der aufgerufenen Funktion
 */
export function legacyWrapper(componentName, legacyFunction, newFunction) {
  try {
    // Entscheide, welche Implementierung verwendet werden soll
    if (shouldUseVanillaJS(componentName)) {
      // Nutzung von Legacy-Code tracken
      trackLegacyUsage(componentName, "legacy_function_call");

      // Legacy-Funktion aufrufen
      return legacyFunction();
    } else {
      // Neue Funktion aufrufen
      return newFunction();
    }
  } catch (error) {
    // Fehler protokollieren
    console.error(`Fehler in '${componentName}':`, error);

    // Fehler melden, falls Feature-Toggle-Store vorhanden
    if (window.featureToggles) {
      window.featureToggles.reportError(
        `useSfc${componentName}`,
        error.message,
        error,
      );
    }

    // Im Fehlerfall auf Legacy-Code zurückfallen
    trackLegacyUsage(componentName, "fallback_after_error");
    return legacyFunction();
  }
}

/**
 * Meldet einen Fehler in einer SFC-Komponente und aktiviert Fallback
 * @param {string} componentName - Name der Komponente
 * @param {Error} error - Der aufgetretene Fehler
 */
export function reportSfcError(componentName, error) {
  console.error(`Fehler in SFC-Komponente '${componentName}':`, error);

  // Fehler protokollieren und Fallback aktivieren
  if (window.featureToggles) {
    window.featureToggles.reportError(
      `useSfc${componentName}`,
      error.message,
      error,
    );
  }

  // Fehlerflag setzen
  let featureToggles = {};
  try {
    const storedToggles = localStorage.getItem("featureToggles");
    featureToggles = storedToggles ? JSON.parse(storedToggles) : {};

    // Fehler markieren
    featureToggles[`useSfc${componentName}Error`] = true;

    // Zurück in localStorage speichern
    localStorage.setItem("featureToggles", JSON.stringify(featureToggles));
  } catch (e) {
    console.error("Fehler beim Aktualisieren der Feature-Toggles:", e);
  }

  trackLegacyUsage(componentName, "error_reported");
}

/**
 * Aktiviert den Notfall-Rollback für alle Komponenten
 */
export function emergencyRollback() {
  console.warn("⚠️ NOTFALL-ROLLBACK WIRD AKTIVIERT!");

  // Alle SFC-Features deaktivieren
  localStorage.removeItem("useVueComponents");
  localStorage.removeItem("useVueDocConverter");

  // Feature-Toggles zurücksetzen
  localStorage.removeItem("featureToggles");

  // Telemetrie-Event senden
  trackLegacyUsage("all", "emergency_rollback");

  console.warn(
    "💡 Notfall-Rollback abgeschlossen. Bitte laden Sie die Seite neu.",
  );

  // Seite neu laden
  location.reload();
}

// Exportiere Funktionen für die globale Verwendung
if (typeof window !== "undefined") {
  window.legacyDeactivation = {
    shouldUseVanillaJS,
    trackLegacyUsage,
    legacyWrapper,
    reportSfcError,
    emergencyRollback,
  };
}
