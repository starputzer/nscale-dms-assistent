/**
 * Globale Typdefinitionen für nscale DMS Assistenten
 * 
 * Diese Datei enthält Typdeklarationen für globale Objekte, Funktionen und
 * Erweiterungen, die im gesamten Projekt verfügbar sein sollen.
 */

/**
 * Globale Umgebungsvariablen-Typen
 */
interface ImportMetaEnv {
  /** API-Basis-URL */
  readonly VITE_API_BASE_URL: string;
  /** Umgebung (development, staging, production) */
  readonly VITE_APP_ENV: 'development' | 'staging' | 'production';
  /** App-Version aus package.json */
  readonly VITE_APP_VERSION: string;
  /** Debug-Modus aktivieren */
  readonly VITE_DEBUG_MODE: string;
  /** Feature-Flags */
  readonly VITE_FEATURE_FLAGS?: string;
  /** API-Mock aktivieren */
  readonly VITE_USE_MOCK_API?: string;
  /** Timeout für API-Anfragen in Millisekunden */
  readonly VITE_API_TIMEOUT?: string;
  /** Lokalisierungssprache */
  readonly VITE_DEFAULT_LOCALE?: string;
}

/**
 * Erweiterung der ImportMeta-Schnittstelle für Vite
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Globaler Logger-Typ
 */
interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  trace(message: string, ...args: any[]): void;
}

/**
 * Globale Helfer-Erweiterung
 */
interface Window {
  /**
   * Logger-Instanz
   */
  logger?: Logger;
  
  /**
   * Telemetrie-System für Fehler- und Performance-Tracking
   */
  telemetry?: {
    /** Fehler aufzeichnen */
    trackError: (error: Error | string, context?: Record<string, any>) => void;
    /** Event aufzeichnen */
    trackEvent: (eventName: string, properties?: Record<string, any>) => void;
    /** Performance-Metrik aufzeichnen */
    trackPerformance: (metricName: string, durationMs: number, properties?: Record<string, any>) => void;
    /** Benutzersitzung starten */
    startSession: (userId?: string) => void;
    /** Benutzersitzung beenden */
    endSession: () => void;
  };
  
  /**
   * Debug-Utility-Funktionen
   */
  debug?: {
    /** Aktiviert oder deaktiviert Debug-Modus */
    enable: (enabled?: boolean) => void;
    /** Überprüft, ob Debug-Modus aktiv ist */
    isEnabled: () => boolean;
    /** Gibt den aktuellen Store-Status aus */
    logStoreState: (storeName?: string) => void;
    /** Gibt Performance-Metriken aus */
    logPerformance: () => void;
    /** Aktiviert oder deaktiviert Performance-Monitoring */
    monitorPerformance: (enabled?: boolean) => void;
  };
  
  /**
   * Feature-Flag-System
   */
  features?: {
    /** Überprüft, ob ein Feature aktiviert ist */
    isEnabled: (featureName: string) => boolean;
    /** Aktiviert ein Feature */
    enable: (featureName: string) => void;
    /** Deaktiviert ein Feature */
    disable: (featureName: string) => void;
    /** Gibt alle aktiven Features zurück */
    getEnabledFeatures: () => string[];
  };
  
  /**
   * Utility-Funktionen
   */
  utils?: {
    /** Erzeugt eine eindeutige ID */
    generateId: () => string;
    /** Formatiert ein Datum */
    formatDate: (date: Date | string | number, format?: string) => string;
    /** Kürzt einen Text auf die angegebene Länge */
    truncateText: (text: string, maxLength: number) => string;
    /** Escape HTML */
    escapeHtml: (html: string) => string;
  };
  
  /**
   * Bridge-System für Legacy-Integration
   */
  bridge?: {
    /** Sendet ein Ereignis an Legacy-Code */
    sendEvent: (eventName: string, payload?: any) => void;
    /** Registriert einen Handler für Legacy-Ereignisse */
    onEvent: (eventName: string, handler: (payload?: any) => void) => () => void;
    /** Legacy-Services */
    services: Record<string, any>;
    /** Initialisierungsstatus */
    initialized: boolean;
  };
}

/**
 * Erweiterungen für console
 */
interface Console {
  /** Zeigt eine gruppierte Performance-Messung an */
  timeGroup(label: string, callback: () => void): void;
  /** Zeichnet zusammenhängende Messwerte in einer Tabelle auf */
  timeTable(data: Record<string, number>): void;
}

/**
 * Globaler Namespace für häufig verwendete Typen
 */
declare namespace Types {
  /** Typ für ID-Werte */
  export type ID = string;
  
  /** Typ für eine Funktion ohne Parameter und Rückgabe */
  export type Callback = () => void;
  
  /** Typ für eine Funktion mit generischen Parametern und Rückgabe */
  export type Handler<T = any, R = void> = (value: T) => R;
  
  /** Typ für eine asynchrone Funktion mit generischen Parametern und Rückgabe */
  export type AsyncHandler<T = any, R = void> = (value: T) => Promise<R>;
  
  /** Typ für eine Funktion zur Datenmapper-Transformation */
  export type Mapper<From, To> = (from: From) => To;
  
  /** Typ für eine Validierungsfunktion */
  export type Validator<T> = (value: T) => boolean | string;
  
  /** Utility-Typ für Deep Partial */
  export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
  };
  
  /** Utility-Typ für Record mit String-Keys */
  export type StringRecord<T = any> = Record<string, T>;
  
  /** Utility-Typ für einen nullable Wert */
  export type Nullable<T> = T | null;
  
  /** Utility-Typ für einen optional undefined Wert */
  export type Optional<T> = T | undefined;
}

/**
 * Erweiterungen für Array
 */
interface Array<T> {
  /** Gibt das erste Element zurück, das die Bedingung erfüllt, oder null */
  findOrNull(predicate: (value: T, index: number, obj: T[]) => boolean): T | null;
  /** Entfernt Duplikate aus dem Array (für primitive Typen) */
  distinct(): T[];
  /** Gruppiert Elemente nach einem Schlüssel */
  groupBy<K>(keySelector: (item: T) => K): Record<string, T[]>;
}

/**
 * Erweiterungen für String
 */
interface String {
  /** Kürzt den String auf die angegebene Länge */
  truncate(maxLength: number, suffix?: string): string;
  /** Konvertiert HTML-Entities */
  htmlDecode(): string;
  /** Konvertiert den String in ein gültiges URL-Format */
  toUrlSlug(): string;
}