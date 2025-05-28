/**
 * Error-Reporting-Service für nscale DMS Assistenten
 *
 * Zentraler Service für die Erfassung, Aggregation und Weiterleitung von Fehlern
 * mit Integration in das Feature-Toggle-System und den Fallback-Mechanismus.
 *
 * @version 1.0.0
 * @date 08.05.2025
 */

import { ref, reactive, computed, watch } from "vue";
import {
  useFallbackManager,
  type FallbackError,
  type FallbackErrorSeverity,
} from "./fallbackManager";
// In der Pure Vue Version verwenden wir das Feature-Flags-System aus der Konfiguration
import { isFeatureEnabled } from "@/config/featureFlags";
import { useLogger } from "@/composables/useLogger";
import { getNodeEnv, isDevelopment } from "./environmentUtils";

/**
 * Fehler-Quellen für die Kategorisierung
 */
export type ErrorSource =
  | "component"
  | "store"
  | "api"
  | "network"
  | "render"
  | "lifecycle"
  | "user"
  | "system"
  | "unknown";

/**
 * Umfassende Fehler-Informationen mit zusätzlichem Kontext
 */
export interface ErrorReport {
  /** Eindeutige ID des Fehlers */
  id: string;
  /** Zeitstempel des Fehlers */
  timestamp: Date;
  /** Quellkomponente oder -modul */
  source: {
    /** Typ der Fehlerquelle */
    type: ErrorSource;
    /** Name der Komponente oder des Moduls */
    name: string;
    /** Versions- oder Build-Informationen */
    version?: string;
  };
  /** Fehlermeldung */
  message: string;
  /** Original-Fehler-Objekt (falls vorhanden) */
  originalError?: Error;
  /** Stack-Trace (falls vorhanden) */
  stackTrace?: string;
  /** Schweregrad des Fehlers */
  severity: FallbackErrorSeverity;
  /** Betroffenes Feature */
  feature?: string;
  /** Status der Benutzeroberfläche zum Zeitpunkt des Fehlers */
  uiState?: {
    /** Aktuelle Route/URL */
    route?: string;
    /** Viewport-Größe */
    viewport?: {
      width: number;
      height: number;
    };
    /** Browser-Informationen */
    browser?: {
      name: string;
      version: string;
      language: string;
    };
    /** Feature-Flags-Status */
    featureFlags?: Record<string, boolean>;
  };
  /** Kontext-Informationen über den Fehler */
  context?: Record<string, any>;
  /** Ob der Fehler bereits behandelt oder eskaliert wurde */
  handled: boolean;
  /** Ob der Fehler bereits an einen Fehlertracking-Dienst gemeldet wurde */
  reported: boolean;
  /** Ob und wie der Fehler dem Benutzer angezeigt wurde */
  userFeedback?: {
    /** Ob ein Feedback angezeigt wurde */
    shown: boolean;
    /** Art des Feedbacks (Toast, Modal, Inline, etc.) */
    type?: string;
    /** Ob der Benutzer eine Aktion durchgeführt hat */
    userAction?: string;
  };
  /** Metadaten für interne Verwendung */
  meta?: {
    /** Hash zur Deduplizierung */
    hash?: string;
    /** Anzahl der Vorkommnisse */
    occurrences?: number;
    /** Deduplizierungs-Schlüssel */
    deduplicationKey?: string;
    /** Marker für die Entwicklungsumgebung */
    devMode?: boolean;
  };
}

/**
 * Optionen für den Error-Reporting-Service
 */
export interface ErrorReportingOptions {
  /** Automatisches Erfassen von unbehandelten Fehlern */
  captureUnhandledErrors?: boolean;
  /** Automatisches Erfassen von Promise-Rejections */
  captureUnhandledRejections?: boolean;
  /** Senden der Berichte an externe Dienste aktivieren */
  enableRemoteReporting?: boolean;
  /** URL für Remote-Fehlererfassung */
  remoteEndpoint?: string;
  /** Maximale Anzahl lokal gespeicherter Fehler */
  maxStoredErrors?: number;
  /** Zeitfenster für Fehler-Deduplizierung in Millisekunden */
  deduplicationWindow?: number;
  /** Automatische Integration mit Fallback-System */
  integrateWithFallbackSystem?: boolean;
  /** Log-Level für die Konsole */
  consoleLogLevel?: "none" | "error" | "warn" | "info" | "debug";
  /** Benutzerinformationen für Fehlerberichte */
  userInfo?: {
    /** Benutzer-ID */
    userId?: string;
    /** Benutzername */
    username?: string;
    /** Benutzerrolle */
    role?: string;
  };
  /** Zusätzliche Tags für alle Fehlerberichte */
  globalTags?: Record<string, string>;
  /** Callback für benutzerdefinierte Fehlerverarbeitung */
  onError?: (report: ErrorReport) => void;
  /** Datenschutzeinstellungen */
  privacy?: {
    /** Personenidentifizierbare Informationen entfernen */
    stripPII?: boolean;
    /** Zu bereinigende Felder */
    sensitiveFields?: string[];
  };
}

// Standardwerte für den Service
const DEFAULT_OPTIONS: Required<ErrorReportingOptions> = {
  captureUnhandledErrors: true,
  captureUnhandledRejections: true,
  enableRemoteReporting: true,
  remoteEndpoint: "/api/error-reporting",
  maxStoredErrors: 100,
  deduplicationWindow: 300000, // 5 Minuten
  integrateWithFallbackSystem: true,
  consoleLogLevel: "error",
  userInfo: {
    userId: "anonymous",
    username: "anonymous",
    role: "user",
  },
  globalTags: {},
  onError: () => {},
  privacy: {
    stripPII: true,
    sensitiveFields: [
      "password",
      "token",
      "apiKey",
      "secret",
      "credential",
      "email",
      "phone",
      "address",
      "name",
      "credit",
      "card",
    ],
  },
};

// Singleton-Instanz
let instance: ErrorReportingService | null = null;

/**
 * Service-Klasse für Error-Reporting
 */
export class ErrorReportingService {
  /** Erfasste Fehler */
  private errors = reactive<ErrorReport[]>([]);
  /** Lookup-Tabelle für Fehler-Deduplizierung */
  private errorLookup = reactive<Record<string, number>>({});
  /** Optionen für den Service */
  private options: Required<ErrorReportingOptions>;
  /** Ob der Service vollständig initialisiert ist */
  private initialized = ref(false);
  /** Benutzerinformationen */
  private user = reactive<Required<ErrorReportingOptions["userInfo"]>>(
    DEFAULT_OPTIONS.userInfo,
  );
  /** Integration mit Fallback-Manager (lazy-loaded) */
  private _fallbackManager: ReturnType<typeof useFallbackManager> | null = null;
  /** Integration mit Feature-Toggle-Store (lazy-loaded) */
  private _featureToggles: ReturnType<typeof useFeatureTogglesStore> | null =
    null;
  /** Logger für Konsolen-Ausgaben (lazy-loaded) */
  private _logger: ReturnType<typeof useLogger> | null = null;

  /** Getter für den Logger, der bei Bedarf initialisiert wird */
  private get logger(): ReturnType<typeof useLogger> {
    try {
      if (!this._logger) {
        this._logger = useLogger();
      }
      return this._logger;
    } catch (err) {
      console.warn(
        "[ErrorReportingService] Logger nicht verfügbar, verwende Dummy-Implementation",
      );
      // Minimale Mock-Implementation zurückgeben
      return {
        debug: console.debug,
        info: console.info,
        warn: console.warn,
        error: console.error,
        getOptions: () => ({}),
        setOptions: () => {},
        getComponent: () => "unknown",
        getLogs: () => [],
        clearLogs: () => {},
      } as any;
    }
  }

  /** Getter für den Fallback-Manager, der bei Bedarf initialisiert wird */
  private get fallbackManager(): ReturnType<typeof useFallbackManager> {
    try {
      if (!this._fallbackManager) {
        this._fallbackManager = useFallbackManager();
      }
      return this._fallbackManager;
    } catch (err) {
      this.logger.warn(
        "[ErrorReportingService] Fallback-Manager nicht verfügbar, verwende Dummy-Implementation",
        err,
      );
      // Minimale Mock-Implementation zurückgeben
      return {
        reportError: () => {},
        enableFallback: () => {},
        disableFallback: () => {},
        isFallbackEnabled: () => false,
      } as any;
    }
  }

  /** Getter für den Feature-Toggles-Store, der bei Bedarf initialisiert wird */
  private get featureToggles(): ReturnType<typeof useFeatureTogglesStore> {
    try {
      if (!this._featureToggles) {
        this._featureToggles = useFeatureTogglesStore();
      }
      return this._featureToggles;
    } catch (err) {
      this.logger.warn(
        "[ErrorReportingService] Feature-Toggles-Store nicht verfügbar, verwende Dummy-Implementation",
        err,
      );
      // Minimale Mock-Implementation zurückgeben
      return {
        $state: {},
        isFeatureEnabled: () => true,
        getFeatureConfig: () => ({}),
      } as any;
    }
  }
  /** Handler für unbehandelte Fehler */
  private unhandledErrorHandler: ((event: ErrorEvent) => void) | null = null;
  /** Handler für unbehandelte Rejections */
  private unhandledRejectionHandler:
    | ((event: PromiseRejectionEvent) => void)
    | null = null;

  /**
   * Konstruktor für ErrorReportingService
   * @param options Optionen für den Service
   */
  constructor(options: ErrorReportingOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Benutzerinfo setzen
    if (options.userInfo) {
      this.user = {
        ...this.user,
        ...options.userInfo,
      };
    }

    // Log-Level anpassen
    this.logger.setOptions({ level: this.options.consoleLogLevel });

    // Unbehandelte Fehler erfassen, wenn gewünscht
    if (this.options.captureUnhandledErrors) {
      this.setupUnhandledErrorCapture();
    }

    // Unbehandelte Promise-Rejections erfassen, wenn gewünscht
    if (this.options.captureUnhandledRejections) {
      this.setupUnhandledRejectionCapture();
    }

    // Als initialisiert markieren
    this.initialized.value = true;
    this.logger.debug("[ErrorReportingService] Initialisiert");
  }

  /**
   * Initialisiert die Erfassung unbehandelter Fehler
   */
  private setupUnhandledErrorCapture(): void {
    if (typeof window === "undefined") return;

    this.unhandledErrorHandler = (event: ErrorEvent) => {
      this.captureError(event.error || new Error(event.message), {
        source: {
          type: "system",
          name: "window.onerror",
        },
        context: {
          lineNumber: event.lineno,
          columnNumber: event.colno,
          filename: event.filename,
        },
      });

      // Originalverhalten nicht unterbrechen
      return false;
    };

    window.addEventListener("error", this.unhandledErrorHandler);
  }

  /**
   * Initialisiert die Erfassung unbehandelter Promise-Rejections
   */
  private setupUnhandledRejectionCapture(): void {
    if (typeof window === "undefined") return;

    this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));

      this.captureError(error, {
        source: {
          type: "system",
          name: "window.onunhandledrejection",
        },
        context: {
          promiseRejection: true,
          originalReason: event.reason,
        },
      });

      // Originalverhalten nicht unterbrechen
      return false;
    };

    window.addEventListener(
      "unhandledrejection",
      this.unhandledRejectionHandler,
    );
  }

  /**
   * Bereinigt personenidentifizierbare Informationen aus einem Objekt
   * @param obj Das zu bereinigende Objekt
   * @returns Das bereinigte Objekt
   */
  private stripPII<T extends Record<string, any>>(obj: T): T {
    if (!this.options.privacy.stripPII) return obj;
    if (!obj || typeof obj !== "object") return obj;

    const result = { ...obj };
    const sensitiveFields = this.options.privacy.sensitiveFields;

    // Rekursiv durch das Objekt gehen
    function traverse(current: Record<string, any>) {
      for (const key in current) {
        // Prüfen, ob Schlüssel sensibel ist
        const isFieldSensitive = sensitiveFields.some((field) =>
          key.toLowerCase().includes(field.toLowerCase()),
        );

        if (isFieldSensitive) {
          // Wert durch Platzhalter ersetzen
          if (typeof current[key] === "string") {
            current[key] = "[REDACTED]";
          } else if (typeof current[key] === "number") {
            current[key] = 0;
          } else if (
            typeof current[key] === "object" &&
            current[key] !== null
          ) {
            current[key] = Array.isArray(current[key]) ? [] : {};
          }
        } else if (typeof current[key] === "object" && current[key] !== null) {
          // Rekursiv weiterverarbeiten
          traverse(current[key]);
        }
      }
    }

    traverse(result);
    return result;
  }

  /**
   * Generiert einen Hash für einen Fehlerbericht zur Deduplizierung
   * @param report Der Fehlerbericht
   * @returns Hash für den Bericht
   */
  private generateErrorHash(report: ErrorReport): string {
    // Eindeutige Felder auswählen
    const hashSource = [
      report.source.type,
      report.source.name,
      report.message,
      report.feature || "",
      // Erste Zeile des Stack-Trace für mehr Präzision
      report.stackTrace ? report.stackTrace.split("\n")[0] : "",
    ].join("|");

    // Einfache Hash-Funktion
    let hash = 0;
    for (let i = 0; i < hashSource.length; i++) {
      const char = hashSource.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32-bit Integer
    }

    return hash.toString(16);
  }

  /**
   * Prüft, ob ein Fehlerbericht ein Duplikat ist
   * @param report Der Fehlerbericht
   * @returns Ob der Bericht ein Duplikat ist und ggf. der Index des Originals
   */
  private isDuplicate(report: ErrorReport): {
    isDuplicate: boolean;
    index?: number;
  } {
    if (!report.meta?.hash) return { isDuplicate: false };

    const hash = report.meta.hash;
    const now = Date.now();
    const timeWindow = now - this.options.deduplicationWindow;

    // Prüfen, ob Hash im Lookup existiert
    if (hash in this.errorLookup) {
      const index = this.errorLookup[hash];
      const originalReport = this.errors[index];

      // Prüfen, ob Original innerhalb des Zeitfensters liegt
      if (originalReport && originalReport.timestamp.getTime() >= timeWindow) {
        return { isDuplicate: true, index };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Verarbeitet UI-State-Informationen
   * @returns Aktueller UI-State
   */
  private collectUIState(): ErrorReport["uiState"] {
    if (typeof window === "undefined") return undefined;

    try {
      // Browser-Informationen sammeln
      const userAgent = navigator.userAgent;
      let browserName = "unknown";
      let browserVersion = "unknown";

      // Einfache Erkennung der gängigsten Browser
      if (userAgent.indexOf("Firefox") > -1) {
        browserName = "Firefox";
        browserVersion =
          userAgent.match(/Firefox\/([0-9.]+)/)?.[1] || "unknown";
      } else if (userAgent.indexOf("Chrome") > -1) {
        browserName = "Chrome";
        browserVersion = userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || "unknown";
      } else if (userAgent.indexOf("Safari") > -1) {
        browserName = "Safari";
        browserVersion =
          userAgent.match(/Version\/([0-9.]+)/)?.[1] || "unknown";
      } else if (
        userAgent.indexOf("Edge") > -1 ||
        userAgent.indexOf("Edg/") > -1
      ) {
        browserName = "Edge";
        browserVersion =
          userAgent.match(/Edge\/([0-9.]+)/)?.[1] ||
          userAgent.match(/Edg\/([0-9.]+)/)?.[1] ||
          "unknown";
      }

      // Feature-Flags-Status abfragen
      const featureFlags: Record<string, boolean> = {};
      try {
        const featureKeys = Object.keys(this.featureToggles.$state).filter(
          (key) => typeof this.featureToggles.$state[key] === "boolean",
        );

        for (const key of featureKeys) {
          featureFlags[key] = this.featureToggles.$state[key] as boolean;
        }
      } catch (err) {
        this.logger.debug(
          "[ErrorReportingService] Konnte Feature-Flags nicht abrufen",
          err,
        );
        // Leeres Objekt wenn Feature-Flags nicht verfügbar sind
      }

      // UI-State zusammenstellen
      return {
        route: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        browser: {
          name: browserName,
          version: browserVersion,
          language: navigator.language,
        },
        featureFlags,
      };
    } catch (error) {
      this.logger.warn(
        "[ErrorReportingService] Fehler beim Erfassen des UI-States",
        { error },
      );
      return undefined;
    }
  }

  /**
   * Erstellt einen strukturierten Fehlerbericht
   * @param error Der aufgetretene Fehler
   * @param options Zusätzliche Optionen für den Bericht
   * @returns Strukturierter Fehlerbericht
   */
  private createErrorReport(
    error: Error | string,
    options: Partial<
      Omit<
        ErrorReport,
        | "id"
        | "timestamp"
        | "handled"
        | "reported"
        | "message"
        | "originalError"
      >
    > = {},
  ): ErrorReport {
    // Fehler-Objekt normalisieren
    const errorObj = typeof error === "string" ? new Error(error) : error;
    const message = errorObj.message || String(errorObj);

    // Standardwerte für Quelle
    const source = options.source || {
      type: "unknown" as ErrorSource,
      name: "unknown",
    };

    // Grundlegenden Bericht erstellen
    const report: ErrorReport = {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      source,
      message,
      originalError: errorObj,
      stackTrace: errorObj.stack,
      severity: options.severity || "medium",
      feature: options.feature,
      uiState: this.collectUIState(),
      context: options.context || {},
      handled: false,
      reported: false,
      userFeedback: options.userFeedback,
      meta: {
        devMode: isDevelopment(),
        occurrences: 1,
      },
    };

    // Globale Tags hinzufügen
    if (Object.keys(this.options.globalTags).length > 0) {
      report.context = {
        ...report.context,
        globalTags: this.options.globalTags,
      };
    }

    // Hash zur Deduplizierung generieren
    report.meta.hash = this.generateErrorHash(report);

    // PII entfernen
    return this.stripPII(report);
  }

  /**
   * Erstellt und verarbeitet einen Fehlerbericht
   * @param error Der aufgetretene Fehler
   * @param options Zusätzliche Optionen für den Bericht
   * @returns Die ID des erstellten Berichts
   */
  public captureError(
    error: Error | string,
    options: Partial<
      Omit<
        ErrorReport,
        | "id"
        | "timestamp"
        | "handled"
        | "reported"
        | "message"
        | "originalError"
      >
    > = {},
  ): string {
    // Bericht erstellen
    const report = this.createErrorReport(error, options);

    // Duplikate prüfen
    const { isDuplicate, index } = this.isDuplicate(report);
    if (isDuplicate && index !== undefined) {
      // Vorkommnis-Zähler erhöhen
      const existingReport = this.errors[index];
      if (existingReport.meta && existingReport.meta.occurrences) {
        existingReport.meta.occurrences++;
      }
      return existingReport.id;
    }

    // In die lokale Liste einfügen
    this.errors.unshift(report);

    // Auf maximale Größe begrenzen
    if (this.errors.length > this.options.maxStoredErrors) {
      this.errors.pop();
    }

    // Hash in Lookup-Tabelle speichern
    if (report.meta?.hash) {
      this.errorLookup[report.meta.hash] = 0; // Index ist jetzt 0, da wir am Anfang eingefügt haben
    }

    // An die Konsole loggen (je nach Level)
    if (this.options.consoleLogLevel !== "none") {
      const method =
        report.severity === "critical" || report.severity === "high"
          ? "error"
          : report.severity === "medium"
            ? "warn"
            : "debug";

      this.logger[method](`[ErrorReportingService] ${report.message}`, {
        source: report.source,
        feature: report.feature,
        stack: report.stackTrace?.split("\n").slice(0, 3).join("\n"),
        context: report.context,
      });
    }

    // An einen Remote-Service senden, wenn aktiviert
    if (this.options.enableRemoteReporting) {
      this.reportToRemoteService(report);
    }

    // Fallback-System benachrichtigen, wenn aktiviert und Feature angegeben
    if (this.options.integrateWithFallbackSystem && report.feature) {
      this.notifyFallbackSystem(report);
    }

    // Callback aufrufen, wenn definiert
    if (this.options.onError) {
      try {
        this.options.onError(report);
      } catch (callbackError) {
        this.logger.error(
          "[ErrorReportingService] Fehler im onError-Callback",
          { error: callbackError },
        );
      }
    }

    return report.id;
  }

  /**
   * Sendet einen Fehlerbericht an einen Remote-Service
   * @param report Der zu sendende Bericht
   */
  private reportToRemoteService(report: ErrorReport): void {
    // Nichts tun, wenn keine Endpoint-URL definiert ist
    if (!this.options.remoteEndpoint) return;

    // Bericht als gemeldet markieren
    report.reported = true;

    // Bericht asynchron senden
    fetch(this.options.remoteEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(report),
      // Nicht auf die Antwort warten
      keepalive: true,
    }).catch((error) => {
      this.logger.warn(
        "[ErrorReportingService] Fehler beim Senden des Berichts",
        { error },
      );
    });
  }

  /**
   * Benachrichtigt das Fallback-System über einen Fehler
   * @param report Der Fehlerbericht
   */
  private notifyFallbackSystem(report: ErrorReport): void {
    if (!report.feature) return;

    const feature = report.feature;

    // Fehler als behandelt markieren
    report.handled = true;

    // Fallback-Fehler erstellen
    const fallbackError: Partial<FallbackError> = {
      message: report.message,
      error: report.originalError,
      stack: report.stackTrace,
      severity: report.severity,
      context: {
        source: report.source,
        reportId: report.id,
        ...report.context,
      },
    };

    try {
      // An Fallback-Manager melden
      this.fallbackManager.reportError(feature, fallbackError as FallbackError);
    } catch (err) {
      this.logger.warn(
        "[ErrorReportingService] Fehler beim Melden an Fallback-System",
        err,
      );
      // Fehler beim Melden ignorieren
    }
  }

  /**
   * Verarbeitet einen Fehler mit einer bestimmten Quelle
   * @param type Typ der Fehlerquelle
   * @param name Name der Fehlerquelle
   * @param error Der Fehler
   * @param options Zusätzliche Optionen
   * @returns ID des erstellten Berichts
   */
  public captureSourceError(
    type: ErrorSource,
    name: string,
    error: Error | string,
    options: Partial<
      Omit<
        ErrorReport,
        | "id"
        | "timestamp"
        | "handled"
        | "reported"
        | "message"
        | "originalError"
        | "source"
      >
    > = {},
  ): string {
    return this.captureError(error, {
      ...options,
      source: { type, name },
    });
  }

  /**
   * Erfasst einen Komponentenfehler
   * @param componentName Name der Komponente
   * @param error Der Fehler
   * @param options Zusätzliche Optionen
   * @returns ID des erstellten Berichts
   */
  public captureComponentError(
    componentName: string,
    error: Error | string,
    options: Partial<
      Omit<
        ErrorReport,
        | "id"
        | "timestamp"
        | "handled"
        | "reported"
        | "message"
        | "originalError"
        | "source"
      >
    > = {},
  ): string {
    return this.captureSourceError("component", componentName, error, options);
  }

  /**
   * Erfasst einen API-Fehler
   * @param endpoint Name des API-Endpoints
   * @param error Der Fehler
   * @param options Zusätzliche Optionen
   * @returns ID des erstellten Berichts
   */
  public captureApiError(
    endpoint: string,
    error: Error | string,
    options: Partial<
      Omit<
        ErrorReport,
        | "id"
        | "timestamp"
        | "handled"
        | "reported"
        | "message"
        | "originalError"
        | "source"
      >
    > = {},
  ): string {
    return this.captureSourceError("api", endpoint, error, options);
  }

  /**
   * Erfasst einen Store-Fehler
   * @param storeName Name des Stores
   * @param error Der Fehler
   * @param options Zusätzliche Optionen
   * @returns ID des erstellten Berichts
   */
  public captureStoreError(
    storeName: string,
    error: Error | string,
    options: Partial<
      Omit<
        ErrorReport,
        | "id"
        | "timestamp"
        | "handled"
        | "reported"
        | "message"
        | "originalError"
        | "source"
      >
    > = {},
  ): string {
    return this.captureSourceError("store", storeName, error, options);
  }

  /**
   * Löscht einen Fehler aus der Liste
   * @param id ID des zu löschenden Fehlers
   * @returns Ob der Fehler erfolgreich gelöscht wurde
   */
  public dismissError(id: string): boolean {
    const index = this.errors.findIndex((e) => e.id === id);
    if (index === -1) return false;

    const report = this.errors[index];

    // Aus der Lookup-Tabelle entfernen
    if (report.meta?.hash && this.errorLookup[report.meta.hash] === index) {
      delete this.errorLookup[report.meta.hash];
    }

    // Aus der Liste entfernen
    this.errors.splice(index, 1);

    return true;
  }

  /**
   * Aktualisiert die Benutzerinfo für Fehlerberichte
   * @param userInfo Neue Benutzerinformationen
   */
  public setUserInfo(
    userInfo: Partial<ErrorReportingOptions["userInfo"]>,
  ): void {
    this.user = { ...this.user, ...userInfo };
  }

  /**
   * Löscht alle Fehler
   */
  public clearAllErrors(): void {
    this.errors.splice(0, this.errors.length);
    Object.keys(this.errorLookup).forEach((key) => {
      delete this.errorLookup[key];
    });
  }

  /**
   * Gibt alle erfassten Fehler zurück
   * @param limit Maximale Anzahl zurückzugebender Fehler
   * @returns Liste der Fehler
   */
  public getErrors(limit?: number): ErrorReport[] {
    if (limit && limit > 0) {
      return this.errors.slice(0, limit);
    }
    return this.errors;
  }

  /**
   * Gibt einen bestimmten Fehler zurück
   * @param id ID des gesuchten Fehlers
   * @returns Der gesuchte Fehler oder undefined
   */
  public getErrorById(id: string): ErrorReport | undefined {
    return this.errors.find((e) => e.id === id);
  }

  /**
   * Beendet den Service und gibt Ressourcen frei
   */
  public dispose(): void {
    // Event-Handler entfernen
    if (typeof window !== "undefined") {
      if (this.unhandledErrorHandler) {
        window.removeEventListener("error", this.unhandledErrorHandler);
      }
      if (this.unhandledRejectionHandler) {
        window.removeEventListener(
          "unhandledrejection",
          this.unhandledRejectionHandler,
        );
      }
    }

    // Alle Fehler löschen
    this.clearAllErrors();

    // Initialisiert-Flag zurücksetzen
    this.initialized.value = false;

    this.logger.debug("[ErrorReportingService] Beendet");
  }

  /**
   * Factory-Methode für Singleton-Instanz
   * @param options Optionen für den Service
   * @returns Singleton-Instanz
   */
  public static getInstance(
    options: ErrorReportingOptions = {},
  ): ErrorReportingService {
    if (!instance) {
      instance = new ErrorReportingService(options);
    }
    return instance;
  }
}

/**
 * Composable-Hook für Error-Reporting
 * @param options Optionen für den Error-Reporting-Service
 * @returns Error-Reporting-Service
 */
export function useErrorReporting(
  options: ErrorReportingOptions = {},
): ErrorReportingService {
  return ErrorReportingService.getInstance(options);
}

// Globalen Zugriff für Browser-Fehlerhandling bereitstellen
if (typeof window !== "undefined") {
  (window as any).errorReportingService = ErrorReportingService.getInstance();
}
