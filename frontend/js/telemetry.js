/**
 * @deprecated Diese Legacy-Komponente ist veraltet und wird in Kürze entfernt.
 * Verwende stattdessen die Vue 3 SFC-Implementierung.
 * Geplantes Entfernungsdatum: 2025-06-10
 */

/**
 * Telemetrie-Modul
 *
 * Zentrales Modul für die Erfassung, Speicherung und Übertragung von Telemetriedaten
 * für A/B-Tests und andere analytische Zwecke.
 */

// Konfiguration

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
trackLegacyUsage("telemetry", "initialize");

const TELEMETRY_CONFIG = {
  // Debug-Modus - gibt alle Ereignisse in der Konsole aus
  debugMode: false,

  // Endpunkt für die Telemetriedaten
  endpoint: "/api/telemetry",

  // Maximale Anzahl von Ereignissen vor dem automatischen Senden
  maxEvents: 50,

  // Maximale Zeit in ms bevor Ereignisse automatisch gesendet werden
  flushInterval: 30000, // 30 Sekunden

  // Ob Telemetrie aktiv ist
  enabled: true,

  // Datenschutzeinstellungen
  privacy: {
    // Automatisch Benutzer-IDs anonymisieren
    anonymizeUserIds: true,

    // Soll IP-Adresse erfasst werden? (Normalerweise nein)
    captureIp: false,
  },
};

// In-Memory-Speicher für Telemetriedaten
let telemetryEvents = [];
let flushTimer = null;

/**
 * Initialisiert das Telemetrie-System
 */
export function initTelemetry() {
  // Telemetrie-Konfiguration aus localStorage laden (falls vorhanden)
  try {
    const storedConfig = localStorage.getItem("telemetryConfig");
    if (storedConfig) {
      const parsedConfig = JSON.parse(storedConfig);

      // Konfiguration mit gespeicherten Werten überschreiben, aber Standard-Endpunkt beibehalten
      Object.assign(TELEMETRY_CONFIG, parsedConfig, {
        endpoint: TELEMETRY_CONFIG.endpoint,
      });

      if (TELEMETRY_CONFIG.debugMode) {
        console.log("Telemetrie-Konfiguration geladen:", TELEMETRY_CONFIG);
      }
    }
  } catch (e) {
    console.warn("Fehler beim Laden der Telemetrie-Konfiguration:", e);
  }

  // Timer für automatisches Senden starten
  startFlushTimer();

  // Ereignis-Listener für beforeunload, um Daten zu senden, bevor der Benutzer die Seite verlässt
  window.addEventListener("beforeunload", () => {
    if (telemetryEvents.length > 0) {
      flushEvents(true);
    }
  });

  // Erfasse Basis-Metriken beim Start
  trackEvent("telemetry_initialized", {
    userAgent: navigator.userAgent,
    language: navigator.language,
  });

  return TELEMETRY_CONFIG;
}

/**
 * Startet den Timer für das automatische Senden von Ereignissen
 */
function startFlushTimer() {
  if (flushTimer) {
    clearInterval(flushTimer);
  }

  flushTimer = setInterval(() => {
    if (telemetryEvents.length > 0) {
      flushEvents();
    }
  }, TELEMETRY_CONFIG.flushInterval);
}

/**
 * Erfasst ein einzelnes Telemetrie-Ereignis
 * @param {string} eventType - Typ des Ereignisses
 * @param {Object} data - Ereignisdaten
 */
export function trackEvent(eventType, data = {}) {
  if (!TELEMETRY_CONFIG.enabled) return;

  try {
    // Gemeinsame Metadaten für alle Ereignisse
    const timestamp = new Date().toISOString();
    const sessionId = localStorage.getItem("sessionId") || generateSessionId();

    // Benutzer-ID anonymisieren
    let userId =
      localStorage.getItem("userId") || localStorage.getItem("abTestSessionId");
    if (TELEMETRY_CONFIG.privacy.anonymizeUserIds && userId) {
      userId = hashUserId(userId);
    }

    // Ereignis erstellen
    const event = {
      eventType,
      timestamp,
      sessionId,
      userId,
      appVersion: window.appVersion || "unknown",
      ...data,
    };

    // Zum Speicher hinzufügen
    telemetryEvents.push(event);

    // Debug-Ausgabe
    if (TELEMETRY_CONFIG.debugMode) {
      console.log("Telemetrie-Ereignis erfasst:", event);
    }

    // Automatisch senden, wenn die maximale Anzahl erreicht ist
    if (telemetryEvents.length >= TELEMETRY_CONFIG.maxEvents) {
      flushEvents();
    }
  } catch (e) {
    console.error("Fehler beim Erfassen des Telemetrie-Ereignisses:", e);
  }
}

/**
 * Sendet alle gespeicherten Ereignisse an den Server
 * @param {boolean} synchronous - Ob der Sendevorgang synchron sein soll (für beforeunload)
 */
export function flushEvents(synchronous = false) {
  if (!TELEMETRY_CONFIG.enabled || telemetryEvents.length === 0) return;

  try {
    const eventsToSend = [...telemetryEvents];

    // Ereignisspeicher leeren
    telemetryEvents = [];

    // Nur in Produktionsumgebung senden
    if (
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      const fetchOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          events: eventsToSend,
          timestamp: new Date().toISOString(),
        }),
        keepalive: true, // Wichtig für beforeunload
      };

      if (synchronous) {
        // Synchrones Senden (für beforeunload)
        navigator.sendBeacon(
          TELEMETRY_CONFIG.endpoint,
          new Blob(
            [
              JSON.stringify({
                events: eventsToSend,
                timestamp: new Date().toISOString(),
              }),
            ],
            { type: "application/json" },
          ),
        );
      } else {
        // Asynchrones Senden
        fetch(TELEMETRY_CONFIG.endpoint, fetchOptions).catch((err) =>
          console.error("Fehler beim Senden der Telemetrie:", err),
        );
      }
    }

    // Debug-Ausgabe
    if (TELEMETRY_CONFIG.debugMode) {
      console.log("Telemetrie-Ereignisse gesendet:", eventsToSend);
    }
  } catch (e) {
    console.error("Fehler beim Senden der Telemetrie-Ereignisse:", e);

    // Ereignisse zurück in den Speicher legen, um sie später erneut zu senden
    telemetryEvents = [...telemetryEvents, ...eventsToSend];
  }
}

/**
 * Aktiviert oder deaktiviert das Telemetrie-System
 * @param {boolean} enabled - Ob Telemetrie aktiviert sein soll
 */
export function setTelemetryEnabled(enabled) {
  TELEMETRY_CONFIG.enabled = enabled;

  // Konfiguration speichern
  saveTelemetryConfig();

  // Wenn aktiviert, Timer starten
  if (enabled) {
    startFlushTimer();
  } else if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }

  return TELEMETRY_CONFIG.enabled;
}

/**
 * Aktualisiert die Telemetrie-Konfiguration
 * @param {Object} config - Neue Konfigurationswerte
 */
export function updateTelemetryConfig(config) {
  Object.assign(TELEMETRY_CONFIG, config, {
    endpoint: TELEMETRY_CONFIG.endpoint, // Endpunkt nicht überschreiben
  });

  // Konfiguration speichern
  saveTelemetryConfig();

  // Timer neu starten
  startFlushTimer();

  return TELEMETRY_CONFIG;
}

/**
 * Speichert die aktuelle Telemetrie-Konfiguration im localStorage
 */
function saveTelemetryConfig() {
  try {
    localStorage.setItem(
      "telemetryConfig",
      JSON.stringify({
        debugMode: TELEMETRY_CONFIG.debugMode,
        maxEvents: TELEMETRY_CONFIG.maxEvents,
        flushInterval: TELEMETRY_CONFIG.flushInterval,
        enabled: TELEMETRY_CONFIG.enabled,
        privacy: TELEMETRY_CONFIG.privacy,
      }),
    );
  } catch (e) {
    console.error("Fehler beim Speichern der Telemetrie-Konfiguration:", e);
  }
}

/**
 * Generiert eine Sitzungs-ID
 * @returns {string} - Generierte Sitzungs-ID
 */
function generateSessionId() {
  const sessionId =
    "session_" +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
  localStorage.setItem("sessionId", sessionId);
  return sessionId;
}

/**
 * Anonymisiert eine Benutzer-ID durch Hashing
 * @param {string} userId - Zu anonymisierende Benutzer-ID
 * @returns {string} - Anonymisierte Benutzer-ID
 */
function hashUserId(userId) {
  // Einfaches Hash (in Produktion sollte ein stärkerer Algorithmus verwendet werden)
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Konvertierung zu 32bit-Integer
  }
  return "user_" + Math.abs(hash).toString(16);
}

// Globaler Export
if (typeof window !== "undefined") {
  window.telemetry = {
    init: initTelemetry,
    trackEvent,
    flushEvents,
    setEnabled: setTelemetryEnabled,
    updateConfig: updateTelemetryConfig,
  };
}
