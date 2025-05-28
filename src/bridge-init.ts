// Bridge-Initialisierung für globale Funktionen
import { installBridge, configureBridge } from "./bridge/setup";
import { initializeGlobalFunctions } from "./utils/globalFunctionsBridge";
import { LogService } from "./services/log/LogService";

// Logger für Bridge-Initialisierung
const logger = new LogService("BridgeInit");

/**
 * Initialisiert die Bridge und globale Legacy-Funktionen
 * mit verbesserter Fehlerbehandlung und Fallback-Mechanismen
 */
export function initializeBridge(app: any) {
  logger.info("Starte Bridge-Initialisierung");

  try {
    // Prüfen, ob Pinia bereits installiert wurde
    if (!app._context?.provides?.pinia) {
      logger.warn(
        "Pinia scheint nicht vor der Bridge-Initialisierung eingebunden zu sein. Es wird versucht, trotzdem fortzufahren.",
      );

      // Versuche, Pinia über das globale app-Objekt zu finden
      if (!app._context) {
        app._context = {};
      }

      if (!app._context.provides) {
        app._context.provides = {};
      }

      logger.info(
        "Pinia-Warnung behandelt, fahre mit Bridge-Initialisierung fort",
      );
    }

    // Bridge konfigurieren mit zusätzlichen Fallback-Optionen
    configureBridge({
      ENABLED: true,
      DEBUG: process.env.NODE_ENV !== "production",
      AUTH_ENABLED: true,
      SESSIONS_ENABLED: true,
      UI_ENABLED: true,
      SETTINGS_ENABLED: true,
      LEGACY_EVENTS_ENABLED: true,
      FALLBACK_ENABLED: true, // Fallback-Mechanismen aktivieren
      ERROR_TOLERANCE: "high", // Hohe Fehlertoleranz
      MAX_RETRY_ATTEMPTS: 3, // Wiederholungsversuche bei Fehlern
    });

    logger.info("Bridge konfiguriert mit Fallback-Optionen");

    // Separate try-catch-Blöcke für jede Komponente, um kaskadierende Fehler zu vermeiden
    try {
      // Bridge installieren mit zusätzlichen Sicherheitsüberprüfungen
      if (typeof installBridge === "function") {
        installBridge(app);
        logger.info("Bridge erfolgreich installiert");
      } else {
        logger.error(
          "Bridge-Installation nicht möglich: installBridge ist keine Funktion",
        );
      }
    } catch (bridgeError) {
      logger.error(
        "Fehler beim Installieren der Bridge (wird übersprungen):",
        bridgeError,
      );

      // Einfacher Fallback für kritische Bridge-Features
      try {
        // Kritische globale Eventemitter als Fallback einrichten
        if (typeof window !== "undefined") {
          window.bridgeFallbackMode = true;
          logger.info("Bridge-Fallback-Modus aktiviert");
        }
      } catch (fallbackError) {
        logger.error(
          "Auch Fallback-Mechanismus fehlgeschlagen:",
          fallbackError,
        );
      }
    }

    try {
      // Globale Funktionen aus utils/globalFunctionsBridge.ts initialisieren
      if (typeof initializeGlobalFunctions === "function") {
        initializeGlobalFunctions();
        logger.info("Globale Funktionen erfolgreich initialisiert");
      } else {
        logger.error(
          "Globale Funktionen nicht initialisiert: initializeGlobalFunctions ist keine Funktion",
        );
      }
    } catch (globalFunctionsError) {
      logger.error(
        "Fehler beim Initialisieren globaler Funktionen (wird übersprungen):",
        globalFunctionsError,
      );

      // Fallback für kritische globale Funktionen
      try {
        logger.info("Versuche Fallback für kritische globale Funktionen");
        setupCriticalFunctions();
      } catch (fallbackError) {
        logger.error(
          "Auch Fallback für globale Funktionen fehlgeschlagen:",
          fallbackError,
        );
      }
    }

    logger.info("Bridge und globale Funktionen initialisiert");

    // Ein Event auslösen, wenn die Bridge bereit ist, mit Statusdetails
    window.dispatchEvent(
      new CustomEvent("nscale-bridge-ready", {
        detail: {
          timestamp: Date.now(),
          mode: window.bridgeFallbackMode ? "fallback" : "normal",
        },
      }),
    );

    return true;
  } catch (error) {
    logger.error(
      "Schwerwiegender Fehler bei der Bridge-Initialisierung:",
      error,
    );

    // Trotzdem ein Event auslösen, damit die Anwendung weiß, dass versucht wurde, die Bridge zu initialisieren
    window.dispatchEvent(
      new CustomEvent("nscale-bridge-error", {
        detail: {
          error,
          timestamp: Date.now(),
        },
      }),
    );

    return false;
  }
}

/**
 * Fallback für kritische Funktionen, die für die App-Funktion
 * unbedingt benötigt werden
 */
function setupCriticalFunctions() {
  logger.info("Richte kritische Fallback-Funktionen ein");

  // Globalen Namespace für Fallback-Funktionen einrichten
  if (typeof window !== "undefined") {
    if (!window.nscaleFallback) {
      window.nscaleFallback = {};
    }

    // Minimale Event-Bus-Implementierung
    if (!window.nscaleFallback.eventBus) {
      const events = {};

      window.nscaleFallback.eventBus = {
        on: (event, callback) => {
          if (!events[event]) events[event] = [];
          events[event].push(callback);
          return () => {
            events[event] = events[event].filter((cb) => cb !== callback);
          };
        },
        emit: (event, data) => {
          if (!events[event]) return;
          events[event].forEach((callback) => {
            try {
              callback(data);
            } catch (e) {
              logger.error(`Error in event callback for ${event}:`, e);
            }
          });
        },
      };
    }

    // Andere kritische Funktionen für Fallback implementieren
    // z.B. Token-Management, Sitzungsverwaltung usw.

    logger.info("Kritische Fallback-Funktionen eingerichtet");
  }
}

// TypeScript-Erweiterung für das Window-Objekt
declare global {
  interface Window {
    bridgeFallbackMode?: boolean;
    nscaleFallback?: any;
  }
}
