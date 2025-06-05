/**
 * Konfiguration für die Behandlung von Edge Cases im System
 *
 * Diese Datei enthält alle systemweiten Konstanten und Einstellungen für die
 * Behandlung von Grenzfällen und extremen Szenarien in der Anwendung.
 */

/**
 * Degradationsstufen für systemweite Ressourcenbeschränkung
 */
export enum DegradationLevel {
  /** Alle Features aktiviert */
  NONE = 0,
  /** Minimale Einschränkungen (Animationen, Code-Highlighting deaktiviert) */
  LIGHT = 1,
  /** Mittlere Einschränkungen (erweiterte Features deaktiviert) */
  MEDIUM = 2,
  /** Starke Einschränkungen (nur grundlegende Funktionalität) */
  HEAVY = 3,
  /** Nur essentielle Funktionalität (Notfallmodus) */
  CRITICAL = 4,
}

/**
 * Virtualisierungskonfiguration für lange Listen
 */
export const VIRTUALIZATION_CONFIG = {
  /** Anzahl der Elemente außerhalb des sichtbaren Bereichs */
  DEFAULT_VIEWPORT_BUFFER: 5,
  /** Geschätzte Standardhöhe für Items in Pixel */
  DEFAULT_ITEM_HEIGHT: 48,
  /** Anzahl der Nachrichten pro Chunk (Paging) */
  DEFAULT_CHUNK_SIZE: 50,
  /** Debounce für Höhenberechnung in ms */
  HEIGHT_RECALC_DEBOUNCE: 200,
  /** Intervall für Speicherbereinigung in ms */
  MEMORY_CHECK_INTERVAL: 60000,
  /** Maximale Anzahl aktiver DOM-Elemente */
  MAX_DOM_ELEMENTS: 500,
  /** Schwellenwert für Höhenschätzungsrevision */
  ESTIMATE_REVISION_THRESHOLD: 5,
  /** Maximale Anzahl von Nachrichten im virtuellen Scroll */
  MAX_MESSAGES: 10000,
  /** Scroll-Performance Checkpoint (ms) - für Optimierungsmaßnahmen bei Überschreitung */
  SCROLL_PERF_THRESHOLD: 16,
  /** Maximale Zeit (ms) für Rendering-Berechnungen, bevor Vereinfachungen aktiviert werden */
  MAX_RENDER_CALCULATION_TIME: 50,
};

/**
 * Netzwerkkonfiguration für API-Anfragen
 */
export const NETWORK_CONFIG = {
  /** Standard-Timeout für API-Anfragen in ms */
  DEFAULT_TIMEOUT: 30000,
  /** Timeout für kritische Anfragen in ms */
  CRITICAL_REQUEST_TIMEOUT: 10000,
  /** Maximale Anzahl von Wiederholungsversuchen */
  MAX_RETRIES: 3,
  /** Initiale Verzögerung vor dem ersten Wiederholungsversuch in ms */
  INITIAL_RETRY_DELAY: 1000,
  /** Maximale Verzögerung zwischen Wiederholungsversuchen in ms */
  MAX_RETRY_DELAY: 10000,
  /** Standard-Jitter-Faktor für exponentielles Backoff (0-1) */
  DEFAULT_JITTER: 0.3,
  /** Maximale Batch-Größe für API-Anfragen */
  MAX_BATCH_SIZE: 50,
  /** Maximale Größe für Cache-Einträge in Bytes */
  MAX_CACHE_ENTRY_SIZE: 5 * 1024 * 1024, // 5MB
  /** Zeitintervall zwischen aktiven Ping-Checks in ms */
  DEFAULT_PING_INTERVAL: 30000,
  /** Anzahl aufeinanderfolgender Fehler, bevor Offline-Status aktiviert wird */
  CONSECUTIVE_FAILURES_THRESHOLD: 3,
  /** Zeit in ms, während der nicht erneut versucht wird, nach einem kritischen Fehler zu verbinden */
  BACKOFF_PERIOD: 60000,
};

/**
 * Speicherverwaltungskonfiguration
 */
export const MEMORY_CONFIG = {
  /** Standard-Speicherbudget für kritische Komponenten in Bytes */
  DEFAULT_MEMORY_BUDGET: 50 * 1024 * 1024, // 50MB
  /** Warnschwelle als Verhältnis zum Budget (0-1) */
  WARNING_THRESHOLD: 0.7, // 70%
  /** Kritische Schwelle als Verhältnis zum Budget (0-1) */
  CRITICAL_THRESHOLD: 0.9, // 90%
  /** Maximale Anzahl von DOM-Elementen, bevor automatische Bereinigung erfolgt */
  MAX_DOM_ELEMENTS_BEFORE_CLEANUP: 1000,
  /** Intervall für Speicherprüfungen in ms */
  MEMORY_CHECK_INTERVAL: 30000,
  /** Maximale Größe für sessionStorage / localStorage Einträge in Bytes */
  MAX_STORAGE_ENTRY_SIZE: 2 * 1024 * 1024, // 2MB
};

/**
 * Stream-Verarbeitungskonfiguration
 */
export const STREAMING_CONFIG = {
  /** Maximale Größe des Streaming-Puffers in Bytes */
  MAX_BUFFER_SIZE: 1024 * 1024, // 1MB
  /** Intervall für aktive Stream-Aktualisierungen in ms */
  ACTIVE_UPDATE_INTERVAL: 50,
  /** Intervall für Leerlauf-Stream-Aktualisierungen in ms */
  IDLE_UPDATE_INTERVAL: 300,
  /** Timeout für Streaming-Verbindungen in ms */
  STREAMING_TIMEOUT: 120000, // 2 Minuten
  /** Maximale Anzahl gleichzeitiger Streaming-Verbindungen */
  MAX_CONCURRENT_STREAMS: 3,
  /** Automatischer Verbindungsabbau nach Streaming-Inaktivität in ms */
  INACTIVITY_TIMEOUT: 60000, // 1 Minute
};

/**
 * Bridge-Systemkonfiguration
 */
export const BRIDGE_CONFIG = {
  /** Maximale Anzahl aufeinanderfolgender Fehler, bevor automatischer Switchback */
  MAX_CONSECUTIVE_FAILURES: 3,
  /** Abkühlphase nach Self-Healing Versuch in ms */
  COOLING_PERIOD_MS: 60000,
  /** Maximale Anzahl Einträge im Event-Cache (vor LRU Eviction) */
  MAX_EVENT_CACHE_SIZE: 1000,
  /** Intervall für Überprüfung verwaister Event-Listener in ms */
  ORPHANED_LISTENERS_CHECK_INTERVAL: 30000,
  /** Maximaler Speicherverbrauch in MB, bevor Notfall-Cleanup */
  MAX_MEMORY_BEFORE_EMERGENCY_CLEANUP: 100,
  /** Timeout für Bridge-Operationen in ms */
  OPERATION_TIMEOUT: 5000,
};

/**
 * Dokumentenkonverterkonfiguration
 */
export const DOCUMENT_CONVERTER_CONFIG = {
  /** Maximale Anzahl gleichzeitiger Dokumentenkonvertierungen */
  MAX_CONCURRENT_CONVERSIONS: 10,
  /** Maximale Dateigröße in Bytes */
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  /** Timeout für Konvertierungsoperationen in ms */
  CONVERSION_TIMEOUT: 300000, // 5 Minuten
  /** Standardanzahl Wiederholungsversuche bei Konvertierungsfehlern */
  DEFAULT_CONVERSION_RETRIES: 2,
  /** Liste unterstützter Dateitypen */
  SUPPORTED_FILE_TYPES: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/msword",
    "application/vnd.ms-excel",
    "application/vnd.ms-powerpoint",
    "text/plain",
    "text/csv",
    "text/html",
    "application/rtf",
  ],
  /** Empfohlene Bildauflösung für Vorschaubilder in px */
  PREVIEW_RESOLUTION: 1200,
};

/**
 * Feature-Degradations-Konfiguration (welche Features bei welchem Level abgeschaltet werden)
 */
export const FEATURE_DEGRADATION = {
  [DegradationLevel.NONE]: [],
  [DegradationLevel.LIGHT]: [
    "animations",
    "codeHighlighting",
    "detailedLogging",
    "autoRefresh",
  ],
  [DegradationLevel.MEDIUM]: [
    ...FEATURE_DEGRADATION[DegradationLevel.LIGHT],
    "richTextEditing",
    "imagePreview",
    "autoComplete",
    "spellCheck",
    "streamingMessages",
  ],
  [DegradationLevel.HEAVY]: [
    ...FEATURE_DEGRADATION[DegradationLevel.MEDIUM],
    "documentPreview",
    "dragAndDrop",
    "mediaPlayback",
    "advancedSearch",
  ],
  [DegradationLevel.CRITICAL]: [
    ...FEATURE_DEGRADATION[DegradationLevel.HEAVY],
    "documentConversion",
    "batchOperations",
    "parallelUploads",
    "historyTracking",
    "detailedStatistics",
  ],
};

/**
 * Edge-Case-Detection-Funktionen
 */
export const detectEdgeCases = {
  /**
   * Prüft, ob geringe Systemressourcen vorliegen
   */
  isLowResourceSystem(): boolean {
    if (typeof navigator === "undefined") return false;

    // Heuristiken für Low-End-Geräte
    const isLowEndDevice =
      // Geringe Anzahl logischer CPUs
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) ||
      // Geringe Arbeitsspeichermenge (falls verfügbar)
      ((performance as any).memory &&
        (performance as any).memory.jsHeapSizeLimit < 1073741824); // < 1GB

    return isLowEndDevice;
  },

  /**
   * Prüft, ob eine langsame Netzwerkverbindung vorliegt
   */
  isSlowNetwork(): boolean {
    // Navigator Connection API nutzen, falls verfügbar
    if (navigator.connection) {
      const conn = navigator.connection as any;
      const type = conn.effectiveType || conn.type;

      // Langsame Verbindungstypen
      if (["slow-2g", "2g", "3g", "cellular"].includes(type)) {
        return true;
      }

      // Auf Bandbreite prüfen, falls verfügbar
      if (conn.downlink !== undefined && conn.downlink < 1.5) {
        // < 1.5 Mbps
        return true;
      }
    }

    return false;
  },

  /**
   * Prüft, ob der Browser im Stromsparmodus läuft
   */
  isPowerSaveMode(): boolean {
    // Prüfen auf bekannte Indikatoren für Power Save Mode
    if (navigator.userAgent.includes("Battery")) {
      return true;
    }

    // Falls Battery API verfügbar
    if (navigator as any).getBattery) {
      // Asynchrone Prüfung - kann später abgefragt werden
      (navigator as any).getBattery().then((battery: any) => {
        if (!battery.charging && battery.level < 0.2) {
          // < 20% und nicht ladend
          return true;
        }
      });
    }

    return false;
  },

  /**
   * Aktuelle Degradationsstufe basierend auf Systemressourcen empfehlen
   */
  recommendedDegradationLevel(): DegradationLevel {
    // System-Checks
    const isLowResources = this.isLowResourceSystem();
    const isSlowNet = this.isSlowNetwork();
    const isPowerSave = this.isPowerSaveMode();

    if (isLowResources && isSlowNet && isPowerSave) {
      return DegradationLevel.HEAVY; // Starke Einschränkungen
    } else if (
      (isLowResources && isSlowNet) ||
      (isLowResources && isPowerSave)
    ) {
      return DegradationLevel.MEDIUM; // Mittlere Einschränkungen
    } else if (isLowResources || isSlowNet || isPowerSave) {
      return DegradationLevel.LIGHT; // Leichte Einschränkungen
    }

    return DegradationLevel.NONE; // Keine Einschränkungen
  },
};

export default {
  DegradationLevel,
  VIRTUALIZATION_CONFIG,
  NETWORK_CONFIG,
  MEMORY_CONFIG,
  STREAMING_CONFIG,
  BRIDGE_CONFIG,
  DOCUMENT_CONVERTER_CONFIG,
  FEATURE_DEGRADATION,
  detectEdgeCases,
};
