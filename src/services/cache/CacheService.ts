/**
 * CacheService - Zentraler Dienst für das Caching in der nscale-Anwendung
 *
 * Dieser Service bietet eine einheitliche Schnittstelle für verschiedene Caching-Strategien:
 * - API Response Caching
 * - Statisches Asset Caching
 * - Benutzerdaten Caching
 * - Anwendungszustand Caching
 *
 * Der Service verwendet StorageService als Backend und bietet Funktionen für
 * TTL, automatische Invalidierung und selektives Caching.
 */

import { StorageService } from "../storage/StorageService";
import { LogService } from "../log/LogService";

// Konfigurationstyp für CacheService
export interface CacheOptions {
  /** Standardlebensdauer der Cache-Einträge in Sekunden */
  defaultTTL?: number;

  /** Storage-Typ für den Cache (localStorage, sessionStorage, memory) */
  storageType?: "localStorage" | "sessionStorage" | "memory";

  /** Präfix für Cache-Schlüssel */
  keyPrefix?: string;

  /** Maximale Anzahl an Einträgen im Cache (für memory cache) */
  maxEntries?: number;

  /** Maximale Größe des Caches in Bytes (ungefähr) */
  maxSize?: number;

  /** Debug-Modus aktivieren */
  debug?: boolean;
}

// Cache-Eintrag Interface
interface CacheEntry<T> {
  /** Gecachete Daten */
  data: T;

  /** Ablaufzeitpunkt als Timestamp */
  expires: number;

  /** Zeitpunkt der Eintragung */
  created: number;

  /** Ursprungsquelle der Daten (für Debugging) */
  source?: string;

  /** Metadaten für den Cache-Eintrag */
  metadata?: Record<string, any>;
}

/**
 * Hauptklasse für den Cache-Service
 */
export class CacheService {
  /** Storage-Service für die Persistenz */
  private storage: StorageService;

  /** Logger für Diagnose */
  private logger: LogService;

  /** Cache-Konfiguration */
  private config: Required<CacheOptions>;

  /** In-Memory LRU Cache für schnellen Zugriff */
  private memoryCache: Map<string, CacheEntry<any>>;

  /** Cache-Statistiken */
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
    expirations: 0,
    size: 0,
  };

  /** Standardkonfiguration für den Cache */
  private static defaultConfig: Required<CacheOptions> = {
    defaultTTL: 3600, // 1 Stunde
    storageType: "localStorage",
    keyPrefix: "nscale_cache_",
    maxEntries: 100,
    maxSize: 5 * 1024 * 1024, // 5 MB
    debug: false,
  };

  /**
   * Konstruktor für CacheService
   */
  constructor(options: CacheOptions = {}) {
    // Konfiguration einrichten
    this.config = { ...CacheService.defaultConfig, ...options };

    // In-Memory-Cache initialisieren
    this.memoryCache = new Map<string, CacheEntry<any>>();

    // Storage-Service initialisieren
    this.storage = new StorageService({
      storageType: this.config.storageType,
      keyPrefix: this.config.keyPrefix,
      useFallback: true,
    });

    // Logger initialisieren
    this.logger = new LogService("CacheService");

    // Einmalige Initialisierung
    this.init();
  }

  /**
   * Initialisiert den Cache-Service
   * - Lädt persistierte Daten
   * - Bereinigt abgelaufene Einträge
   */
  private init(): void {
    // Verzögerte Initialisierung im Browser-Kontext
    if (typeof window !== "undefined") {
      // Bereinige abgelaufene Einträge bei der Initialisierung
      this.cleanup();

      // Bereinige periodisch im Hintergrund
      setInterval(() => this.cleanup(), 5 * 60 * 1000); // Alle 5 Minuten

      if (this.config.debug) {
        this.logger.debug("Cache-Service initialisiert", this.config);
      }
    }
  }

  /**
   * Speichert einen Wert im Cache
   */
  public set<T>(
    key: string,
    data: T,
    options: {
      /** TTL in Sekunden, überschreibt defaultTTL */
      ttl?: number;
      /** Quellenangabe für Debugging */
      source?: string;
      /** Zusätzliche Metadaten */
      metadata?: Record<string, any>;
    } = {},
  ): void {
    // Cache-Schlüssel erstellen
    const cacheKey = this.getCacheKey(key);

    // TTL verwenden oder Standardwert
    const ttl = options.ttl ?? this.config.defaultTTL;

    // Cache-Eintrag erstellen
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      created: now,
      expires: now + ttl * 1000,
      source: options.source,
      metadata: options.metadata,
    };

    // In Memory-Cache speichern
    this.memoryCache.set(cacheKey, entry);

    // Für längerfristige Persistenz im Storage speichern
    if (ttl > 60) {
      // Nur längerlebige Einträge persistieren
      try {
        this.storage.setItem(cacheKey, JSON.stringify(entry));
      } catch (error) {
        this.logger.warn("Fehler beim Speichern im persistenten Cache", {
          key: cacheKey,
          error,
        });
      }
    }

    // Statistik aktualisieren
    this.stats.sets++;
    this.stats.size = this.memoryCache.size;

    // LRU-Bereinigung falls nötig
    if (this.memoryCache.size > this.config.maxEntries) {
      this.evictLRU();
    }

    if (this.config.debug) {
      this.logger.debug(`Cache: Wert gesetzt für ${key}`, {
        ttl,
        expires: new Date(entry.expires).toISOString(),
        source: options.source,
      });
    }
  }

  /**
   * Liest einen Wert aus dem Cache
   * - Wenn vorhanden und nicht abgelaufen, wird der Wert zurückgegeben
   * - Wenn abgelaufen oder nicht vorhanden, wird null zurückgegeben
   */
  public get<T>(key: string): T | null {
    const cacheKey = this.getCacheKey(key);
    const now = Date.now();

    // Zuerst aus Memory-Cache lesen (schnellster Zugriff)
    let entry = this.memoryCache.get(cacheKey) as CacheEntry<T> | undefined;

    // Wenn nicht im Memory-Cache, aus persistentem Storage lesen
    if (!entry) {
      const storedData = this.storage.getItem(cacheKey);

      if (storedData) {
        try {
          entry = JSON.parse(storedData) as CacheEntry<T>;

          // Zurück in Memory-Cache für schnelleren Zugriff
          this.memoryCache.set(cacheKey, entry);
        } catch (error) {
          this.logger.warn("Fehler beim Parsen des Cache-Eintrags", {
            key: cacheKey,
            error,
          });
        }
      }
    }

    // Prüfen, ob ein Eintrag gefunden wurde
    if (!entry) {
      this.stats.misses++;

      if (this.config.debug) {
        this.logger.debug(`Cache: Miss für ${key}`);
      }

      return null;
    }

    // Prüfen, ob der Eintrag abgelaufen ist
    if (entry.expires < now) {
      this.stats.expirations++;

      // Abgelaufenen Eintrag entfernen
      this.memoryCache.delete(cacheKey);
      this.storage.removeItem(cacheKey);

      if (this.config.debug) {
        this.logger.debug(`Cache: Abgelaufener Eintrag für ${key}`, {
          expired: new Date(entry.expires).toISOString(),
          now: new Date(now).toISOString(),
        });
      }

      return null;
    }

    // Treffer: Statistik aktualisieren
    this.stats.hits++;

    if (this.config.debug) {
      this.logger.debug(`Cache: Hit für ${key}`, {
        age: (now - entry.created) / 1000,
        expires: new Date(entry.expires).toISOString(),
        source: entry.source,
      });
    }

    return entry.data;
  }

  /**
   * Löscht einen Wert aus dem Cache
   */
  public remove(key: string): void {
    const cacheKey = this.getCacheKey(key);

    // Aus beiden Caches entfernen
    this.memoryCache.delete(cacheKey);
    this.storage.removeItem(cacheKey);

    if (this.config.debug) {
      this.logger.debug(`Cache: Eintrag entfernt für ${key}`);
    }
  }

  /**
   * Löscht alle Einträge aus dem Cache
   */
  public clear(): void {
    // In-Memory-Cache leeren
    this.memoryCache.clear();

    // Alle relevanten Einträge aus dem Storage entfernen
    this.storage.clear();

    // Statistiken zurücksetzen
    this.resetStats();

    if (this.config.debug) {
      this.logger.debug("Cache: Vollständig geleert");
    }
  }

  /**
   * Löscht alle Einträge mit einem bestimmten Präfix
   */
  public clearByPrefix(prefix: string): void {
    const fullPrefix = this.config.keyPrefix + prefix;

    // Aus Memory-Cache entfernen
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(fullPrefix)) {
        this.memoryCache.delete(key);
      }
    }

    // Aus Storage entfernen
    const allKeys = this.storage.getKeys();
    for (const key of allKeys) {
      if (key.startsWith(prefix)) {
        this.storage.removeItem(key);
      }
    }

    if (this.config.debug) {
      this.logger.debug(`Cache: Einträge mit Präfix ${prefix} geleert`);
    }
  }

  /**
   * Bereinigt abgelaufene Einträge aus dem Cache
   */
  public cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;

    // Memory-Cache bereinigen
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expires < now) {
        this.memoryCache.delete(key);
        this.storage.removeItem(key);
        expiredCount++;
        this.stats.expirations++;
      }
    }

    // Statistik aktualisieren
    this.stats.size = this.memoryCache.size;

    if (this.config.debug && expiredCount > 0) {
      this.logger.debug(
        `Cache: ${expiredCount} abgelaufene Einträge bereinigt`,
      );
    }
  }

  /**
   * Gibt Cache-Statistiken zurück
   */
  public getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Setzt die Cache-Statistiken zurück
   */
  public resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      expirations: 0,
      size: this.memoryCache.size,
    };
  }

  /**
   * Erstellt einen vollständigen Cache-Schlüssel mit Präfix
   */
  private getCacheKey(key: string): string {
    return key; // Der Präfix wird bereits vom StorageService hinzugefügt
  }

  /**
   * Entfernt den am längsten nicht verwendeten Eintrag (LRU)
   */
  private evictLRU(): void {
    if (this.memoryCache.size === 0) return;

    // Einfache Implementierung: Ersten Eintrag entfernen (ältester zuerst)
    const firstKey = this.memoryCache.keys().next().value;
    if (firstKey) {
      this.memoryCache.delete(firstKey);
      this.stats.evictions++;
      this.stats.size = this.memoryCache.size;

      if (this.config.debug) {
        this.logger.debug(`Cache: LRU-Eintrag entfernt: ${firstKey}`);
      }
    }
  }
}

// Singleton-Instanz erstellen
export const cacheService = new CacheService({
  defaultTTL: parseInt(import.meta.env.VITE_CACHE_LIFETIME || "3600", 10),
  storageType: (import.meta.env.VITE_CACHE_STORAGE || "localStorage") as
    | "localStorage"
    | "sessionStorage"
    | "memory",
  keyPrefix: import.meta.env.VITE_CACHE_PREFIX || "nscale_cache_",
  debug: import.meta.env.VITE_ENV !== "production",
});

export default cacheService;
