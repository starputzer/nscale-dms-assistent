import { useFeatureTogglesStore } from "@/stores/featureToggles";
import { reactive, ref, computed, watch } from "vue";

/**
 * Verschiedene Strategien für Fallbacks
 */
export type FallbackStrategy =
  | "immediate"
  | "threshold"
  | "progressive"
  | "manual";

/**
 * Schweregrade für Fehler
 */
export type FallbackErrorSeverity = "low" | "medium" | "high" | "critical";

/**
 * Status eines Fallbacks
 */
export type FallbackStatus = "active" | "pending" | "disabled" | "recovering";

/**
 * Phasen im Lifecycle eines Fallbacks
 */
export type FallbackPhase =
  | "detection"
  | "activation"
  | "active"
  | "recovery"
  | "disabled";

/**
 * Konfiguration für Fallback-Verhalten eines Features
 */
export interface FeatureFallbackConfig {
  /** Name des Features */
  feature: string;
  /** Strategie für Fallback-Aktivierung */
  strategy: FallbackStrategy;
  /** Schwellwert für Fehleranzahl */
  errorThreshold: number;
  /** Automatische Wiederherstellung aktivieren */
  autoRecovery: boolean;
  /** Zeitraum für automatische Wiederherstellung (in ms) */
  recoveryTimeout: number;
  /** Maximale Anzahl von Wiederherstellungsversuchen */
  maxRecoveryAttempts: number;
  /** Minimaler Schweregrad für Fallback */
  minSeverity: FallbackErrorSeverity;
  /** Mehrstufiger Fallback aktivieren */
  useProgressiveFallback: boolean;
  /** Priorität für inkrementelle Aktivierung (höher = früher) */
  priority: number;
}

/**
 * Fehlerinformationen für das Fallback-System
 */
export interface FallbackError {
  /** Feature, in dem der Fehler aufgetreten ist */
  feature: string;
  /** Fehlermeldung */
  message: string;
  /** Fehler-Objekt */
  error?: Error;
  /** Stack Trace */
  stack?: string;
  /** Zeitstempel */
  timestamp: Date;
  /** Schweregrad des Fehlers */
  severity: FallbackErrorSeverity;
  /** Kontext-Informationen */
  context?: Record<string, any>;
}

/**
 * Umfassender Status eines Features im Fallback-System
 */
export interface FeatureFallbackState {
  /** Feature-Name */
  feature: string;
  /** Aktueller Status */
  status: FallbackStatus;
  /** Aktuelle Phase im Lifecycle */
  phase: FallbackPhase;
  /** Fehler-Historie */
  errors: FallbackError[];
  /** Anzahl der Fehler im aktuellen Zeitfenster */
  errorCount: number;
  /** Zeitstempel der Fallback-Aktivierung */
  activatedAt?: Date;
  /** Aktuelle Anzahl der Wiederherstellungsversuche */
  recoveryAttempts: number;
  /** Zeitstempel des letzten Wiederherstellungsversuchs */
  lastRecoveryAttempt?: Date;
  /** Zeitstempel der nächsten geplanten Wiederherstellung */
  nextRecoveryAttempt?: Date;
  /** Aktueller Fallback-Level (0 = kein Fallback, höher = tiefere Fallback-Ebene) */
  level: number;
  /** Maximaler Fallback-Level (basierend auf Konfiguration) */
  maxLevel: number;
}

/**
 * Event-Arten für das Fallback-System
 */
export type FallbackEventType =
  | "error"
  | "activation"
  | "deactivation"
  | "recoveryAttempt"
  | "recoverySuccess"
  | "recoveryFailure"
  | "levelChange"
  | "configChange";

/**
 * Event für das Fallback-System
 */
export interface FallbackEvent {
  /** Typ des Events */
  type: FallbackEventType;
  /** Betroffenes Feature */
  feature: string;
  /** Zeitstempel des Events */
  timestamp: Date;
  /** Zusätzliche Daten zum Event */
  data?: any;
}

/**
 * Optionen für den Fallback-Manager
 */
export interface FallbackManagerOptions {
  /** Standard-Strategien für Features ohne spezifische Konfiguration */
  defaultStrategy?: FallbackStrategy;
  /** Standard-Schwellwert für Features ohne spezifische Konfiguration */
  defaultThreshold?: number;
  /** Standard-Recovery-Timeout für Features ohne spezifische Konfiguration (in ms) */
  defaultRecoveryTimeout?: number;
  /** Maximale Anzahl von Fehlern, die pro Feature gespeichert werden */
  maxErrorsPerFeature?: number;
  /** Zeitfenster für Fehler-Aggregation (in ms) */
  errorWindowTime?: number;
  /** Globaler Status-Check-Intervall (in ms) */
  statusCheckInterval?: number;
  /** Event-Handler für Fallback-Events */
  onEvent?: (event: FallbackEvent) => void;
}

/**
 * Standard-Konfigurationen für bekannte Features
 */
const DEFAULT_FEATURE_CONFIGS: Record<
  string,
  Partial<FeatureFallbackConfig>
> = {
  useSfcDocConverter: {
    strategy: "threshold",
    errorThreshold: 3,
    autoRecovery: true,
    recoveryTimeout: 3600000, // 1 Stunde
    maxRecoveryAttempts: 3,
    priority: 100,
  },
  useSfcAdmin: {
    strategy: "threshold",
    errorThreshold: 2,
    autoRecovery: true,
    recoveryTimeout: 7200000, // 2 Stunden
    maxRecoveryAttempts: 2,
    priority: 90,
  },
  useSfcChat: {
    strategy: "immediate",
    autoRecovery: true,
    recoveryTimeout: 1800000, // 30 Minuten
    maxRecoveryAttempts: 5,
    priority: 110,
  },
  useSfcSettings: {
    strategy: "progressive",
    errorThreshold: 3,
    autoRecovery: true,
    recoveryTimeout: 3600000, // 1 Stunde
    maxRecoveryAttempts: 3,
    priority: 80,
  },
};

// Singleton-Instanz
let fallbackManagerInstance: FallbackManager | null = null;

/**
 * Fallback-Manager-Klasse für zentrales Fallback-Management
 */
export class FallbackManager {
  /** Feature-Konfigurationen */
  private featureConfigs: Map<string, FeatureFallbackConfig> = new Map();
  /** Feature-Zustände */
  private featureStates: Map<string, FeatureFallbackState> = reactive(
    new Map(),
  );
  /** Event-Historie */
  private eventHistory: FallbackEvent[] = reactive([]);
  /** Konfigurationsoptionen */
  private options: Required<FallbackManagerOptions>;
  /** Timer-IDs für Recovery */
  private recoveryTimers: Map<string, number> = new Map();
  /** Timer-ID für Status-Check */
  private statusCheckTimerId: number | null = null;
  /** Feature-Toggles-Store (lazy-loaded) */
  private _store: ReturnType<typeof useFeatureTogglesStore> | null = null;

  /** Getter für den Store, der bei Bedarf initialisiert wird */
  private get store(): ReturnType<typeof useFeatureTogglesStore> {
    try {
      if (!this._store) {
        this._store = useFeatureTogglesStore();
      }
      return this._store;
    } catch (err) {
      console.warn(
        "Feature-Toggles-Store nicht verfügbar, verwende Fallback-Konfiguration",
        err,
      );
      // Return a minimal mock store with required methods
      return {
        toggleFeature: () => {},
        isFeatureEnabled: () => true,
        getFeatureConfig: () => ({}),
      } as any;
    }
  }

  /**
   * Konstruktor
   * @param options Optionen für den Manager
   */
  constructor(options: FallbackManagerOptions = {}) {
    // Standard-Optionen setzen
    this.options = {
      defaultStrategy: options.defaultStrategy || "threshold",
      defaultThreshold: options.defaultThreshold || 3,
      defaultRecoveryTimeout: options.defaultRecoveryTimeout || 3600000, // 1 Stunde
      maxErrorsPerFeature: options.maxErrorsPerFeature || 20,
      errorWindowTime: options.errorWindowTime || 300000, // 5 Minuten
      statusCheckInterval: options.statusCheckInterval || 60000, // 1 Minute
      onEvent: options.onEvent || (() => {}),
    };

    // Standard-Konfigurationen initialisieren
    this.initializeDefaultConfigs();

    // Status-Check-Timer starten
    this.startStatusCheck();

    // Store beobachten für Änderungen an Fallback-Status
    this.monitorStoreChanges();
  }

  /**
   * Initialisiert Standard-Konfigurationen für bekannte Features
   */
  private initializeDefaultConfigs(): void {
    Object.entries(DEFAULT_FEATURE_CONFIGS).forEach(([feature, config]) => {
      this.configureFeature(feature, config);
    });
  }

  /**
   * Startet den periodischen Status-Check
   */
  private startStatusCheck(): void {
    if (this.statusCheckTimerId !== null) {
      window.clearInterval(this.statusCheckTimerId);
    }

    this.statusCheckTimerId = window.setInterval(() => {
      this.checkAllFeatureStatus();
    }, this.options.statusCheckInterval);
  }

  /**
   * Überwacht Änderungen im Feature-Toggle-Store
   */
  private monitorStoreChanges(): void {
    // Da wir nicht direkt auf den Store-Zustand lauschen können,
    // verwenden wir einen Polling-Ansatz im Status-Check
  }

  /**
   * Fügt ein Event zur Event-Historie hinzu
   * @param type Event-Typ
   * @param feature Feature-Name
   * @param data Zusätzliche Daten
   */
  private addEvent(type: FallbackEventType, feature: string, data?: any): void {
    const event: FallbackEvent = {
      type,
      feature,
      timestamp: new Date(),
      data,
    };

    // Event zur Historie hinzufügen (am Anfang)
    this.eventHistory.unshift(event);

    // Auf maximale Größe begrenzen
    if (this.eventHistory.length > 100) {
      this.eventHistory.pop();
    }

    // Event-Handler aufrufen, wenn vorhanden
    if (this.options.onEvent) {
      try {
        this.options.onEvent(event);
      } catch (error) {
        console.error("Error in fallback event handler:", error);
      }
    }
  }

  /**
   * Prüft den Status aller Features
   */
  private checkAllFeatureStatus(): void {
    // Alle konfigurierten Features durchgehen
    for (const [feature, config] of this.featureConfigs.entries()) {
      const state = this.getFeatureState(feature);

      // Prüfen, ob Wiederherstellung fällig ist
      if (
        state.status === "active" &&
        config.autoRecovery &&
        state.recoveryAttempts < config.maxRecoveryAttempts
      ) {
        // Wenn nächster Versuch geplant ist und Zeit abgelaufen ist
        if (
          state.nextRecoveryAttempt &&
          state.nextRecoveryAttempt.getTime() <= Date.now()
        ) {
          this.attemptRecovery(feature);
        }
      }

      // Alte Fehler aus dem Zeitfenster löschen
      this.pruneOldErrors(feature);
    }

    // Synchronisieren mit Store
    this.syncWithStore();
  }

  /**
   * Entfernt alte Fehler außerhalb des Zeitfensters
   * @param feature Feature-Name
   */
  private pruneOldErrors(feature: string): void {
    const state = this.getFeatureState(feature);
    const now = Date.now();
    const windowStart = now - this.options.errorWindowTime;

    // Alte Fehler filtern
    state.errors = state.errors.filter(
      (error) => error.timestamp.getTime() >= windowStart,
    );

    // Fehleranzahl neu berechnen
    state.errorCount = state.errors.length;
  }

  /**
   * Synchronisiert den Status mit dem Feature-Toggles-Store
   */
  private syncWithStore(): void {
    // Store-Fallbacks mit unseren synchronisieren
    for (const [feature, state] of this.featureStates.entries()) {
      const storeFallbackActive = this.store.isFallbackActive(feature);

      // Wenn Diskrepanz besteht
      if (
        (state.status === "active" && !storeFallbackActive) ||
        (state.status !== "active" && storeFallbackActive)
      ) {
        // Store aktualisieren
        if (state.status === "active") {
          this.store.setFallbackMode(feature, true);
        } else {
          this.store.setFallbackMode(feature, false);
        }
      }
    }

    // Umgekehrt prüfen: Features im Store, die wir nicht kennen
    for (const feature in this.store.activeFallbacks) {
      if (
        this.store.activeFallbacks[feature] &&
        !this.featureStates.has(feature)
      ) {
        // Feature dem Manager hinzufügen
        this.configureFeature(feature);

        // Status setzen
        const state = this.getFeatureState(feature);
        state.status = "active";
        state.phase = "active";
        state.activatedAt = new Date();

        // Event hinzufügen
        this.addEvent("activation", feature, {
          source: "external",
          automatic: false,
        });
      }
    }
  }

  /**
   * Versucht, ein Feature wiederherzustellen
   * @param feature Feature-Name
   */
  private attemptRecovery(feature: string): void {
    const state = this.getFeatureState(feature);
    const config = this.getFeatureConfig(feature);

    // Event auslösen
    this.addEvent("recoveryAttempt", feature, {
      attempt: state.recoveryAttempts + 1,
      maxAttempts: config.maxRecoveryAttempts,
    });

    // Status aktualisieren
    state.status = "recovering";
    state.phase = "recovery";
    state.lastRecoveryAttempt = new Date();
    state.recoveryAttempts++;

    // Timer für nächsten Versuch planen
    if (state.recoveryAttempts < config.maxRecoveryAttempts) {
      state.nextRecoveryAttempt = new Date(Date.now() + config.recoveryTimeout);
    } else {
      state.nextRecoveryAttempt = undefined;
    }

    // Fallback im Store deaktivieren
    this.store.setFallbackMode(feature, false);

    // Wenn Fehler auftreten, wird der Fallback automatisch wieder aktiviert
    // durch den Fehlerbehandlungsmechanismus
  }

  /**
   * Holt oder erstellt die Konfiguration für ein Feature
   * @param feature Feature-Name
   * @returns Feature-Konfiguration
   */
  private getFeatureConfig(feature: string): FeatureFallbackConfig {
    if (!this.featureConfigs.has(feature)) {
      // Standardkonfiguration erstellen
      const config: FeatureFallbackConfig = {
        feature,
        strategy: this.options.defaultStrategy,
        errorThreshold: this.options.defaultThreshold,
        autoRecovery: true,
        recoveryTimeout: this.options.defaultRecoveryTimeout,
        maxRecoveryAttempts: 3,
        minSeverity: "medium",
        useProgressiveFallback: false,
        priority: 50,
      };

      this.featureConfigs.set(feature, config);
    }

    return this.featureConfigs.get(feature)!;
  }

  /**
   * Holt oder erstellt den Status für ein Feature
   * @param feature Feature-Name
   * @returns Feature-Status
   */
  private getFeatureState(feature: string): FeatureFallbackState {
    if (!this.featureStates.has(feature)) {
      // Prüfen, ob Fallback bereits im Store aktiv ist
      const isActive = this.store.isFallbackActive(feature);

      // Standardstatus erstellen
      const state: FeatureFallbackState = {
        feature,
        status: isActive ? "active" : "disabled",
        phase: isActive ? "active" : "disabled",
        errors: [],
        errorCount: 0,
        recoveryAttempts: 0,
        level: isActive ? 1 : 0,
        maxLevel: 1,
      };

      if (isActive) {
        state.activatedAt = new Date();
      }

      this.featureStates.set(feature, state);
    }

    return this.featureStates.get(feature)!;
  }

  /**
   * Konfiguriert ein Feature
   * @param feature Feature-Name
   * @param config Teilweise oder vollständige Konfiguration
   */
  configureFeature(
    feature: string,
    config: Partial<FeatureFallbackConfig> = {},
  ): void {
    // Bestehende oder Standard-Konfiguration holen
    const existingConfig = this.featureConfigs.has(feature)
      ? this.featureConfigs.get(feature)!
      : {
          feature,
          strategy: this.options.defaultStrategy,
          errorThreshold: this.options.defaultThreshold,
          autoRecovery: true,
          recoveryTimeout: this.options.defaultRecoveryTimeout,
          maxRecoveryAttempts: 3,
          minSeverity: "medium" as FallbackErrorSeverity,
          useProgressiveFallback: false,
          priority: 50,
        };

    // Mit neuen Werten mergen
    const newConfig: FeatureFallbackConfig = {
      ...existingConfig,
      ...config,
      feature, // Feature-Name kann nicht überschrieben werden
    };

    // Konfiguration speichern
    this.featureConfigs.set(feature, newConfig);

    // Zugehörigen Zustand initialisieren, falls noch nicht vorhanden
    this.getFeatureState(feature);

    // Event auslösen
    this.addEvent("configChange", feature, { config: newConfig });
  }

  /**
   * Meldet einen Fehler für ein Feature
   * @param feature Feature-Name
   * @param errorInfo Fehler-Informationen
   * @returns Ob der Fehler zu einer Fallback-Aktivierung geführt hat
   */
  reportError(
    feature: string,
    errorInfo: Omit<FallbackError, "feature" | "timestamp">,
  ): boolean {
    // Konfiguration und Status holen
    const config = this.getFeatureConfig(feature);
    const state = this.getFeatureState(feature);

    // Vollständigen Fehler erstellen
    const error: FallbackError = {
      ...errorInfo,
      feature,
      timestamp: new Date(),
    };

    // Zu Fehler-Historie hinzufügen (am Anfang)
    state.errors.unshift(error);

    // Auf maximale Größe begrenzen
    if (state.errors.length > this.options.maxErrorsPerFeature) {
      state.errors.pop();
    }

    // Fehlerzähler erhöhen
    state.errorCount++;

    // Event auslösen
    this.addEvent("error", feature, { error });

    // Prüfen, ob Fallback aktiviert werden soll
    const shouldActivate = this.shouldActivateFallback(feature, error);

    if (shouldActivate) {
      this.activateFallback(feature, error);
      return true;
    }

    return false;
  }

  /**
   * Prüft, ob ein Fallback aktiviert werden soll
   * @param feature Feature-Name
   * @param error Fehler-Information
   * @returns Ob Fallback aktiviert werden soll
   */
  private shouldActivateFallback(
    feature: string,
    error: FallbackError,
  ): boolean {
    const config = this.getFeatureConfig(feature);
    const state = this.getFeatureState(feature);

    // Wenn Fallback bereits aktiv ist, nicht erneut aktivieren
    if (state.status === "active" || state.status === "recovering") {
      return false;
    }

    // Wenn Schweregrad unter Minimum liegt, nicht aktivieren
    const severityLevel = { low: 1, medium: 2, high: 3, critical: 4 };
    if (severityLevel[error.severity] < severityLevel[config.minSeverity]) {
      return false;
    }

    // Je nach Strategie entscheiden
    switch (config.strategy) {
      case "immediate":
        return true;

      case "threshold":
        return state.errorCount >= config.errorThreshold;

      case "progressive":
        // Fallbacks basierend auf Schweregrad und Fehlerzahl
        if (error.severity === "critical") {
          return true;
        }
        if (
          error.severity === "high" &&
          state.errorCount >= Math.ceil(config.errorThreshold / 2)
        ) {
          return true;
        }
        return state.errorCount >= config.errorThreshold;

      case "manual":
        return false;

      default:
        return false;
    }
  }

  /**
   * Aktiviert den Fallback für ein Feature
   * @param feature Feature-Name
   * @param error Fehler, der zur Aktivierung geführt hat
   */
  activateFallback(feature: string, error?: FallbackError): void {
    const state = this.getFeatureState(feature);

    // Wenn bereits aktiv, nichts tun
    if (state.status === "active") {
      return;
    }

    // Status aktualisieren
    state.status = "active";
    state.phase = "active";
    state.activatedAt = new Date();
    state.level = 1;

    // Im Store aktivieren
    this.store.setFallbackMode(feature, true);

    // Bei auto-recovery: nächsten Wiederherstellungsversuch planen
    const config = this.getFeatureConfig(feature);
    if (config.autoRecovery) {
      state.nextRecoveryAttempt = new Date(Date.now() + config.recoveryTimeout);
    }

    // Event auslösen
    this.addEvent("activation", feature, {
      error,
      automatic: !!error,
    });
  }

  /**
   * Deaktiviert den Fallback für ein Feature
   * @param feature Feature-Name
   * @param resetState Ob der gesamte Zustand zurückgesetzt werden soll
   */
  deactivateFallback(feature: string, resetState: boolean = false): void {
    const state = this.getFeatureState(feature);

    // Wenn bereits deaktiviert und kein Reset gewünscht, nichts tun
    if (state.status === "disabled" && !resetState) {
      return;
    }

    // Status aktualisieren
    state.status = "disabled";
    state.phase = "disabled";

    // State zurücksetzen, wenn gewünscht
    if (resetState) {
      state.errors = [];
      state.errorCount = 0;
      state.recoveryAttempts = 0;
      state.level = 0;
      state.activatedAt = undefined;
      state.lastRecoveryAttempt = undefined;
      state.nextRecoveryAttempt = undefined;
    }

    // Im Store deaktivieren
    this.store.setFallbackMode(feature, false);

    // Event auslösen
    this.addEvent("deactivation", feature, { resetState });
  }

  /**
   * Setzt die Ebene eines Fallbacks
   * @param feature Feature-Name
   * @param level Neue Ebene
   */
  setFallbackLevel(feature: string, level: number): void {
    const state = this.getFeatureState(feature);

    // Auf gültigen Bereich begrenzen
    level = Math.max(0, Math.min(level, state.maxLevel));

    // Wenn Level 0, Fallback deaktivieren
    if (level === 0) {
      this.deactivateFallback(feature);
      return;
    }

    // Level setzen
    const oldLevel = state.level;
    state.level = level;

    // Wenn vorher inaktiv, jetzt aktivieren
    if (state.status !== "active") {
      state.status = "active";
      state.phase = "active";
      state.activatedAt = new Date();

      // Im Store aktivieren
      this.store.setFallbackMode(feature, true);
    }

    // Event auslösen
    this.addEvent("levelChange", feature, {
      oldLevel,
      newLevel: level,
    });
  }

  /**
   * Löscht alle Fehler für ein Feature
   * @param feature Feature-Name
   */
  clearErrors(feature: string): void {
    const state = this.getFeatureState(feature);

    state.errors = [];
    state.errorCount = 0;

    // Im Store löschen
    this.store.clearFeatureErrors(feature);
  }

  /**
   * Gibt den Status eines Features zurück
   * @param feature Feature-Name
   * @returns Feature-Status (oder undefined, wenn nicht konfiguriert)
   */
  getStatus(feature: string): FeatureFallbackState | undefined {
    if (!this.featureStates.has(feature)) {
      return undefined;
    }

    return this.featureStates.get(feature);
  }

  /**
   * Gibt alle aktuellen Feature-Zustände zurück
   * @returns Map mit allen Feature-Zuständen
   */
  getAllStatus(): Map<string, FeatureFallbackState> {
    return this.featureStates;
  }

  /**
   * Gibt die Event-Historie zurück
   * @param limit Maximale Anzahl zurückzugebender Events
   * @returns Array von Events
   */
  getEventHistory(limit?: number): FallbackEvent[] {
    if (limit) {
      return this.eventHistory.slice(0, limit);
    }
    return this.eventHistory;
  }

  /**
   * Bereinigt Ressourcen beim Beenden
   */
  dispose(): void {
    // Timer stoppen
    if (this.statusCheckTimerId !== null) {
      window.clearInterval(this.statusCheckTimerId);
      this.statusCheckTimerId = null;
    }

    // Recovery-Timer stoppen
    for (const timerId of this.recoveryTimers.values()) {
      window.clearTimeout(timerId);
    }
    this.recoveryTimers.clear();
  }

  /**
   * Factory-Methode für Singleton-Instanz
   * @param options Optionen für den Manager
   * @returns Singleton-Instanz des FallbackManagers
   */
  static getInstance(options: FallbackManagerOptions = {}): FallbackManager {
    if (!fallbackManagerInstance) {
      fallbackManagerInstance = new FallbackManager(options);
    }
    return fallbackManagerInstance;
  }
}

/**
 * Composable für Zugriff auf den Fallback-Manager
 * @param options Optionen für den Manager
 * @returns Fallback-Manager-Instanz
 */
export function useFallbackManager(options: FallbackManagerOptions = {}) {
  return FallbackManager.getInstance(options);
}
