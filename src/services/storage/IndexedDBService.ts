/**
 * IndexedDBService - Service für den Zugriff auf IndexedDB
 *
 * Bietet eine einfache API für die Interaktion mit IndexedDB zur Speicherung
 * von Offline-Daten, großen Datensätzen und für den Offline-Support.
 */

import { LogService } from "../log/LogService";

/**
 * Optionen für die Initialisierung von IndexedDB
 */
export interface IndexedDBOptions {
  /** Datenbankname */
  dbName: string;

  /** Datenbankversion */
  version: number;

  /** Store-Konfigurationen */
  stores: StoreConfig[];

  /** Verwendung eines Upgradepfads */
  useUpgradePath?: boolean;

  /** Debug-Modus aktivieren */
  debug?: boolean;
}

/**
 * Konfiguration für einen ObjectStore
 */
export interface StoreConfig {
  /** Name des Stores */
  name: string;

  /** Primärschlüssel */
  keyPath: string;

  /** Auto-Inkrement für den Primärschlüssel */
  autoIncrement?: boolean;

  /** Indizes für schnellere Abfragen */
  indices?: IndexConfig[];
}

/**
 * Konfiguration für einen Index
 */
export interface IndexConfig {
  /** Name des Index */
  name: string;

  /** Keypath für den Index */
  keyPath: string | string[];

  /** Optionen für den Index */
  options?: {
    /** Einzigartigkeit erzwingen */
    unique?: boolean;

    /** Mehrteilige Indizes */
    multiEntry?: boolean;
  };
}

/**
 * Abfrageoptionen für die Datenabfrage
 */
export interface QueryOptions {
  /** Richtung der Abfrage */
  direction?: IDBCursorDirection;

  /** Anzahl der zurückzugebenden Ergebnisse (0 = unbegrenzt) */
  limit?: number;

  /** Startschlüssel für Bereichsabfragen */
  startKey?: any;

  /** Endschlüssel für Bereichsabfragen */
  endKey?: any;

  /** Indexname für Indexabfragen */
  index?: string;

  /** Exaktwert für Gleichheitsabfragen */
  equalTo?: any;
}

/**
 * Ereignishandler für Datenbankänderungen
 */
export interface ChangeHandler<T = any> {
  (change: { type: "add" | "update" | "delete"; key: any; value?: T }): void;
}

/**
 * IndexedDBService - Hauptklasse
 */
export class IndexedDBService {
  /** IDBDatabase-Instanz */
  private db: IDBDatabase | null = null;

  /** Datenbankname */
  private dbName: string;

  /** Datenbankversion */
  private version: number;

  /** Store-Konfigurationen */
  private stores: StoreConfig[];

  /** Flag für vollständige Initialisierung */
  private initialized: boolean = false;

  /** Initialisierungs-Promise */
  private initPromise: Promise<boolean> | null = null;

  /** Logger für Diagnosen */
  private logger: LogService;

  /** Änderungshandler pro Store */
  private changeHandlers: Map<string, Set<ChangeHandler>> = new Map();

  /** Debug-Modus */
  private debug: boolean;

  /**
   * Konstruktor
   */
  constructor(options: IndexedDBOptions) {
    this.dbName = options.dbName;
    this.version = options.version;
    this.stores = options.stores;
    this.debug = options.debug || false;
    this.logger = new LogService("IndexedDBService");
  }

  /**
   * Initialisiert die Datenbank
   */
  public async init(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    // Wiederverwendung des Initialisierungsprozesses, wenn er bereits läuft
    if (this.initPromise) {
      return this.initPromise;
    }

    // Prüfe, ob IndexedDB verfügbar ist
    if (!this.isIndexedDBAvailable()) {
      this.logger.error("IndexedDB ist nicht verfügbar");
      return false;
    }

    this.initPromise = new Promise<boolean>((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, this.version);

        // Datenbankupgrade-Handler
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (this.debug) {
            this.logger.info(
              `Datenbank-Upgrade von Version ${event.oldVersion} zu ${event.newVersion}`,
              {
                stores: this.stores,
              },
            );
          }

          // Bestehende Stores finden
          const existingStoreNames = Array.from(db.objectStoreNames);

          // Stores erstellen oder aktualisieren
          for (const storeConfig of this.stores) {
            let store: IDBObjectStore;

            // Prüfen, ob der Store bereits existiert
            if (existingStoreNames.includes(storeConfig.name)) {
              // Vorhandenen Store verwenden
              store = request.transaction!.objectStore(storeConfig.name);

              if (this.debug) {
                this.logger.debug(
                  `Store '${storeConfig.name}' existiert bereits`,
                );
              }
            } else {
              // Neuen Store erstellen
              store = db.createObjectStore(storeConfig.name, {
                keyPath: storeConfig.keyPath,
                autoIncrement: storeConfig.autoIncrement ?? false,
              });

              if (this.debug) {
                this.logger.debug(
                  `Store '${storeConfig.name}' erstellt`,
                  storeConfig,
                );
              }
            }

            // Indizes erstellen
            if (storeConfig.indices) {
              // Bestehende Indizes finden
              const existingIndexNames = Array.from(store.indexNames);

              for (const indexConfig of storeConfig.indices) {
                // Prüfen, ob der Index bereits existiert
                if (!existingIndexNames.includes(indexConfig.name)) {
                  // Neuen Index erstellen
                  store.createIndex(
                    indexConfig.name,
                    indexConfig.keyPath,
                    indexConfig.options,
                  );

                  if (this.debug) {
                    this.logger.debug(
                      `Index '${indexConfig.name}' erstellt in Store '${storeConfig.name}'`,
                      indexConfig,
                    );
                  }
                }
              }
            }
          }
        };

        // Erfolgshandler
        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          this.initialized = true;

          // Debug-Informationen
          if (this.debug) {
            this.logger.info(
              `Datenbank '${this.dbName}' (v${this.version}) erfolgreich geöffnet`,
              {
                stores: Array.from(this.db.objectStoreNames),
              },
            );
          }

          // Event-Handler für Datenbankereignisse
          this.setupDatabaseEventHandlers();

          resolve(true);
        };

        // Fehlerhandler
        request.onerror = (event) => {
          const error = (event.target as IDBOpenDBRequest).onerror;
          this.logger.error(
            `Fehler beim Öffnen der Datenbank '${this.dbName}'`,
            error,
          );
          reject(error);
        };
      } catch (error) {
        this.logger.error(
          `Ausnahme beim Initialisieren der Datenbank '${this.dbName}'`,
          error,
        );
        reject(error);
      }
    }).catch((error) => {
      this.logger.error(
        `Initialisierung der Datenbank '${this.dbName}' fehlgeschlagen`,
        error,
      );
      return false;
    });

    return this.initPromise;
  }

  /**
   * Richtet Event-Handler für die Datenbank ein
   */
  private setupDatabaseEventHandlers(): void {
    if (!this.db) return;

    // Versionswechsel-Handler
    this.db.onversionchange = (event) => {
      this.logger.warn(
        `Eine andere Registerkarte hat ein Datenbank-Upgrade durchgeführt. Verbindung wird geschlossen.`,
      );
      this.db?.close();
      this.initialized = false;
      this.initPromise = null;

      // Benutzer über die Änderung informieren
      window.dispatchEvent(
        new CustomEvent("indexeddb:versionchange", {
          detail: {
            dbName: this.dbName,
            oldVersion: event.oldVersion,
            newVersion: event.newVersion,
          },
        }),
      );
    };

    // Fehler-Handler
    this.db.onerror = (event) => {
      this.logger.error(
        `Datenbankfehler in '${this.dbName}'`,
        (event.target as IDBDatabase).onerror,
      );
    };

    // Keine Warnung über leere Block-Anweisung
    // eslint-disable-next-line no-empty
<<<<<<< HEAD
    this.db.onabort = (_event) => {};
=======
    this.db.onabort = (event) => {};
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
  }

  /**
   * Prüft, ob IndexedDB im Browser verfügbar ist
   */
  private isIndexedDBAvailable(): boolean {
    return Boolean(window.indexedDB);
  }

  /**
   * Schließt die Datenbankverbindung
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
      this.initPromise = null;

      if (this.debug) {
        this.logger.info(
          `Verbindung zur Datenbank '${this.dbName}' geschlossen`,
        );
      }
    }
  }

  /**
   * Löscht die gesamte Datenbank
   */
  public async deleteDatabase(): Promise<boolean> {
    // Datenbank schließen, falls geöffnet
    this.close();

    return new Promise<boolean>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);

      request.onsuccess = () => {
        if (this.debug) {
          this.logger.info(`Datenbank '${this.dbName}' gelöscht`);
        }
        resolve(true);
      };

      request.onerror = (event) => {
        this.logger.error(
          `Fehler beim Löschen der Datenbank '${this.dbName}'`,
          (event.target as IDBOpenDBRequest).onerror,
        );
        reject((event.target as IDBOpenDBRequest).onerror);
      };
    });
  }

  /**
   * Erstellt eine neue Transaktion für einen oder mehrere Stores
   */
  private getTransaction(
    storeNames: string | string[],
    mode: IDBTransactionMode = "readonly",
  ): IDBTransaction | null {
    if (!this.db) {
      this.logger.error(
        `Keine Datenbankverbindung für Transaktion in '${this.dbName}'`,
      );
      return null;
    }

    try {
      const transaction = this.db.transaction(storeNames, mode);
      return transaction;
    } catch (error) {
      this.logger.error(
        `Fehler beim Erstellen der Transaktion in '${this.dbName}'`,
        {
          stores: storeNames,
          mode,
          error,
        },
      );
      return null;
    }
  }

  /**
   * Fügt ein Objekt in einen Store ein
   */
  public async add<T = any>(storeName: string, item: T): Promise<any> {
    // Sicherstellen, dass die Datenbank initialisiert ist
    if (!this.initialized) {
      await this.init();
    }

    return new Promise<any>((resolve, reject) => {
      const transaction = this.getTransaction(storeName, "readwrite");
      if (!transaction) {
        reject(
          new Error(
            `Transaktion für Store '${storeName}' konnte nicht erstellt werden`,
          ),
        );
        return;
      }

      const store = transaction.objectStore(storeName);
      const request = store.add(item);

      request.onsuccess = (event) => {
        const key = (event.target as IDBRequest<IDBValidKey>).result;

        if (this.debug) {
          this.logger.debug(`Objekt in '${storeName}' hinzugefügt`, { key });
        }

        // Änderungshandler benachrichtigen
        this.notifyChangeHandlers(storeName, "add", key, item);

        resolve(key);
      };

      request.onerror = (event) => {
        this.logger.error(
          `Fehler beim Hinzufügen des Objekts in '${storeName}'`,
          (event.target as IDBRequest).onerror,
        );
        reject((event.target as IDBRequest).onerror);
      };
    });
  }

  /**
   * Fügt mehrere Objekte auf einmal in einen Store ein
   */
  public async addBulk<T = any>(storeName: string, items: T[]): Promise<any[]> {
    // Sicherstellen, dass die Datenbank initialisiert ist
    if (!this.initialized) {
      await this.init();
    }

    return new Promise<any[]>((resolve, reject) => {
      const transaction = this.getTransaction(storeName, "readwrite");
      if (!transaction) {
        reject(
          new Error(
            `Transaktion für Store '${storeName}' konnte nicht erstellt werden`,
          ),
        );
        return;
      }

      const store = transaction.objectStore(storeName);
      const keys: any[] = [];
      let completed = 0;

      transaction.oncomplete = () => {
        if (this.debug) {
          this.logger.debug(
            `${items.length} Objekte in '${storeName}' hinzugefügt`,
          );
        }
        resolve(keys);
      };

      transaction.onerror = (event) => {
        this.logger.error(
          `Fehler beim Hinzufügen mehrerer Objekte in '${storeName}'`,
          (event.target as IDBTransaction).onerror,
        );
        reject((event.target as IDBTransaction).onerror);
      };

      // Alle Elemente hinzufügen
      for (let i = 0; i < items.length; i++) {
        const request = store.add(items[i]);

        request.onsuccess = (event) => {
          const key = (event.target as IDBRequest<IDBValidKey>).result;
          keys.push(key);
          completed++;

          // Änderungshandler benachrichtigen
          this.notifyChangeHandlers(storeName, "add", key, items[i]);

          // Wenn alle Operationen abgeschlossen sind
          if (completed === items.length) {
            if (this.debug) {
              this.logger.debug(
                `Alle ${items.length} Objekte in '${storeName}' hinzugefügt`,
              );
            }
          }
        };
      }
    });
  }

  /**
   * Aktualisiert ein Objekt in einem Store
   */
  public async put<T = any>(storeName: string, item: T): Promise<any> {
    // Sicherstellen, dass die Datenbank initialisiert ist
    if (!this.initialized) {
      await this.init();
    }

    return new Promise<any>((resolve, reject) => {
      const transaction = this.getTransaction(storeName, "readwrite");
      if (!transaction) {
        reject(
          new Error(
            `Transaktion für Store '${storeName}' konnte nicht erstellt werden`,
          ),
        );
        return;
      }

      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = (event) => {
        const key = (event.target as IDBRequest<IDBValidKey>).result;

        if (this.debug) {
          this.logger.debug(`Objekt in '${storeName}' aktualisiert`, { key });
        }

        // Änderungshandler benachrichtigen
        this.notifyChangeHandlers(storeName, "update", key, item);

        resolve(key);
      };

      request.onerror = (event) => {
        this.logger.error(
          `Fehler beim Aktualisieren des Objekts in '${storeName}'`,
          (event.target as IDBRequest).onerror,
        );
        reject((event.target as IDBRequest).onerror);
      };
    });
  }

  /**
   * Aktualisiert oder erstellt ein Objekt in einem Store
   */
  public async upsert<T = any>(
    storeName: string,
    item: T,
    key?: any,
  ): Promise<any> {
    // Sicherstellen, dass die Datenbank initialisiert ist
    if (!this.initialized) {
      await this.init();
    }

    // Wenn ein Schlüssel angegeben ist, prüfe, ob das Element existiert
    if (key !== undefined) {
      const exists = await this.exists(storeName, key);
      if (exists) {
        return this.put(storeName, item);
      } else {
        return this.add(storeName, item);
      }
    }

    // Ohne Schlüssel einfach put verwenden (ersetzt oder erstellt)
    return this.put(storeName, item);
  }

  /**
   * Löscht ein Objekt aus einem Store
   */
  public async delete(storeName: string, key: any): Promise<boolean> {
    // Sicherstellen, dass die Datenbank initialisiert ist
    if (!this.initialized) {
      await this.init();
    }

    return new Promise<boolean>((resolve, reject) => {
      const transaction = this.getTransaction(storeName, "readwrite");
      if (!transaction) {
        reject(
          new Error(
            `Transaktion für Store '${storeName}' konnte nicht erstellt werden`,
          ),
        );
        return;
      }

      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        if (this.debug) {
          this.logger.debug(
            `Objekt mit Schlüssel '${key}' aus '${storeName}' gelöscht`,
          );
        }

        // Änderungshandler benachrichtigen
        this.notifyChangeHandlers(storeName, "delete", key);

        resolve(true);
      };

      request.onerror = (event) => {
        this.logger.error(
          `Fehler beim Löschen des Objekts aus '${storeName}'`,
          (event.target as IDBRequest).onerror,
        );
        reject((event.target as IDBRequest).onerror);
      };
    });
  }

  /**
   * Löscht mehrere Objekte anhand ihrer Schlüssel
   */
  public async deleteBulk(storeName: string, _keys: any[]): Promise<boolean> {
    // Sicherstellen, dass die Datenbank initialisiert ist
    if (!this.initialized) {
      await this.init();
    }

    return new Promise<boolean>((resolve, reject) => {
      const transaction = this.getTransaction(storeName, "readwrite");
      if (!transaction) {
        reject(
          new Error(
            `Transaktion für Store '${storeName}' konnte nicht erstellt werden`,
          ),
        );
        return;
      }

      const store = transaction.objectStore(storeName);
      let completed = 0;

      transaction.oncomplete = () => {
        if (this.debug) {
          this.logger.debug(
            `${keys.length} Objekte aus '${storeName}' gelöscht`,
          );
        }
        resolve(true);
      };

      transaction.onerror = (event) => {
        this.logger.error(
          `Fehler beim Löschen mehrerer Objekte aus '${storeName}'`,
          (event.target as IDBTransaction).onerror,
        );
        reject((event.target as IDBTransaction).onerror);
      };

      // Alle Elemente löschen
      for (let i = 0; i < keys.length; i++) {
        const request = store.delete(keys[i]);

        request.onsuccess = () => {
          completed++;

          // Änderungshandler benachrichtigen
          this.notifyChangeHandlers(storeName, "delete", _keys[i]);

          // Wenn alle Operationen abgeschlossen sind
          if (completed === keys.length) {
            if (this.debug) {
              this.logger.debug(
                `Alle ${keys.length} Objekte aus '${storeName}' gelöscht`,
              );
            }
          }
        };
      }
    });
  }

  /**
   * Löscht alle Objekte in einem Store
   */
  public async clear(storeName: string): Promise<boolean> {
    // Sicherstellen, dass die Datenbank initialisiert ist
    if (!this.initialized) {
      await this.init();
    }

    return new Promise<boolean>((resolve, reject) => {
      const transaction = this.getTransaction(storeName, "readwrite");
      if (!transaction) {
        reject(
          new Error(
            `Transaktion für Store '${storeName}' konnte nicht erstellt werden`,
          ),
        );
        return;
      }

      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        if (this.debug) {
          this.logger.debug(`Alle Objekte aus '${storeName}' gelöscht`);
        }
        resolve(true);
      };

      request.onerror = (event) => {
        this.logger.error(
          `Fehler beim Löschen aller Objekte aus '${storeName}'`,
          (event.target as IDBRequest).onerror,
        );
        reject((event.target as IDBRequest).onerror);
      };
    });
  }

  /**
   * Holt ein Objekt aus einem Store anhand seines Schlüssels
   */
  public async get<T = any>(storeName: string, key: any): Promise<T | null> {
    // Sicherstellen, dass die Datenbank initialisiert ist
    if (!this.initialized) {
      await this.init();
    }

    return new Promise<T | null>((resolve, reject) => {
      const transaction = this.getTransaction(storeName);
      if (!transaction) {
        reject(
          new Error(
            `Transaktion für Store '${storeName}' konnte nicht erstellt werden`,
          ),
        );
        return;
      }

      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest<T>).result;

        if (this.debug) {
          this.logger.debug(
            `Objekt mit Schlüssel '${key}' aus '${storeName}' geladen`,
            {
              found: result !== undefined,
            },
          );
        }

        resolve(result || null);
      };

      request.onerror = (event) => {
        this.logger.error(
          `Fehler beim Laden des Objekts aus '${storeName}'`,
          (event.target as IDBRequest).onerror,
        );
        reject((event.target as IDBRequest).onerror);
      };
    });
  }

  /**
   * Überprüft, ob ein Objekt mit dem gegebenen Schlüssel existiert
   */
  public async exists(storeName: string, key: any): Promise<boolean> {
    // Einfache Implementierung über die get-Methode
    const item = await this.get(storeName, key);
    return item !== null;
  }

  /**
   * Holt mehrere Objekte anhand ihrer Schlüssel
   */
  public async getBulk<T = any>(
    storeName: string,
    keys: any[],
  ): Promise<(T | null)[]> {
    // Sicherstellen, dass die Datenbank initialisiert ist
    if (!this.initialized) {
      await this.init();
    }

    return Promise.all(keys.map((key: any) => this.get<T>(storeName, key)));
  }

  /**
   * Holt alle Objekte aus einem Store
   */
  public async getAll<T = any>(
    storeName: string,
    options: QueryOptions = {},
  ): Promise<T[]> {
    // Sicherstellen, dass die Datenbank initialisiert ist
    if (!this.initialized) {
      await this.init();
    }

    return new Promise<T[]>((resolve, reject) => {
      const transaction = this.getTransaction(storeName);
      if (!transaction) {
        reject(
          new Error(
            `Transaktion für Store '${storeName}' konnte nicht erstellt werden`,
          ),
        );
        return;
      }

      const store = transaction.objectStore(storeName);
      let request: IDBRequest<T[]>;

      // Unterschiedliche Abfragemethode je nach Optionen
      if (options.index) {
        const index = store.index(options.index);

        // Mit Bereichsoptionen
        if (options.startKey !== undefined && options.endKey !== undefined) {
          const range = IDBKeyRange.bound(options.startKey, options.endKey);
          request = index.getAll(range);
        }
        // Mit Gleichheitsabfrage
        else if (options.equalTo !== undefined) {
          const range = IDBKeyRange.only(options.equalTo);
          request = index.getAll(range);
        }
        // Ohne Bereichseinschränkung
        else {
          request = index.getAll();
        }
      } else {
        // Mit Bereichsoptionen
        if (options.startKey !== undefined && options.endKey !== undefined) {
          const range = IDBKeyRange.bound(options.startKey, options.endKey);
          request = store.getAll(range);
        }
        // Mit Gleichheitsabfrage
        else if (options.equalTo !== undefined) {
          const range = IDBKeyRange.only(options.equalTo);
          request = store.getAll(range);
        }
        // Ohne Bereichseinschränkung
        else {
          request = store.getAll();
        }
      }

      request.onsuccess = (event) => {
        const results = (event.target as IDBRequest<T[]>).result;

        // Limit anwenden, wenn angegeben
        const limitedResults =
          options.limit && options.limit > 0
            ? results.slice(0, options.limit)
            : results;

        if (this.debug) {
          this.logger.debug(
            `${limitedResults.length} Objekte aus '${storeName}' geladen`,
          );
        }

        resolve(limitedResults);
      };

      request.onerror = (event) => {
        this.logger.error(
          `Fehler beim Laden aller Objekte aus '${storeName}'`,
          (event.target as IDBRequest).onerror,
        );
        reject((event.target as IDBRequest).onerror);
      };
    });
  }

  /**
   * Registriert einen Handler für Änderungen an einem Store
   */
  public addChangeHandler<T = any>(
    storeName: string,
    handler: ChangeHandler<T>,
  ): void {
    if (!this.changeHandlers.has(storeName)) {
      this.changeHandlers.set(storeName, new Set());
    }

    this.changeHandlers.get(storeName)!.add(handler as ChangeHandler<any>);

    if (this.debug) {
      this.logger.debug(`Änderungshandler für '${storeName}' registriert`);
    }
  }

  /**
   * Entfernt einen Änderungshandler
   */
  public removeChangeHandler(storeName: string, handler: ChangeHandler): void {
    if (this.changeHandlers.has(storeName)) {
      this.changeHandlers.get(storeName)!.delete(handler);

      if (this.debug) {
        this.logger.debug(`Änderungshandler für '${storeName}' entfernt`);
      }
    }
  }

  /**
   * Benachrichtigt alle registrierten Änderungshandler über eine Änderung
   */
  private notifyChangeHandlers<T = any>(
    storeName: string,
    type: "add" | "update" | "delete",
    key: any,
    value?: T,
  ): void {
    if (this.changeHandlers.has(storeName)) {
      const handlers = this.changeHandlers.get(storeName)!;

      for (const handler of handlers) {
        try {
          handler({ type, key, value });
        } catch (error) {
          this.logger.error(
            `Fehler beim Ausführen eines Änderungshandlers für '${storeName}'`,
            error,
          );
        }
      }
    }
  }

  /**
   * Zählt die Anzahl der Einträge in einem Store
   */
  public async count(
    storeName: string,
    options: QueryOptions = {},
  ): Promise<number> {
    // Sicherstellen, dass die Datenbank initialisiert ist
    if (!this.initialized) {
      await this.init();
    }

    return new Promise<number>((resolve, reject) => {
      const transaction = this.getTransaction(storeName);
      if (!transaction) {
        reject(
          new Error(
            `Transaktion für Store '${storeName}' konnte nicht erstellt werden`,
          ),
        );
        return;
      }

      const store = transaction.objectStore(storeName);
      let request: IDBRequest<number>;

      // Unterschiedliche Abfragemethode je nach Optionen
      if (options.index) {
        const index = store.index(options.index);

        // Mit Bereichsoptionen
        if (options.startKey !== undefined && options.endKey !== undefined) {
          const range = IDBKeyRange.bound(options.startKey, options.endKey);
          request = index.count(range);
        }
        // Mit Gleichheitsabfrage
        else if (options.equalTo !== undefined) {
          const range = IDBKeyRange.only(options.equalTo);
          request = index.count(range);
        }
        // Ohne Bereichseinschränkung
        else {
          request = index.count();
        }
      } else {
        // Mit Bereichsoptionen
        if (options.startKey !== undefined && options.endKey !== undefined) {
          const range = IDBKeyRange.bound(options.startKey, options.endKey);
          request = store.count(range);
        }
        // Mit Gleichheitsabfrage
        else if (options.equalTo !== undefined) {
          const range = IDBKeyRange.only(options.equalTo);
          request = store.count(range);
        }
        // Ohne Bereichseinschränkung
        else {
          request = store.count();
        }
      }

      request.onsuccess = (event) => {
        const count = (event.target as IDBRequest<number>).result;

        if (this.debug) {
          this.logger.debug(`${count} Objekte in '${storeName}' gezählt`);
        }

        resolve(count);
      };

      request.onerror = (event) => {
        this.logger.error(
          `Fehler beim Zählen der Objekte in '${storeName}'`,
          (event.target as IDBRequest).onerror,
        );
        reject((event.target as IDBRequest).onerror);
      };
    });
  }

  /**
   * Führt eine Abfrage mit Cursor durch für komplexere Abfragen
   */
  public async query<T = any>(
    storeName: string,
    options: QueryOptions = {},
  ): Promise<T[]> {
    // Sicherstellen, dass die Datenbank initialisiert ist
    if (!this.initialized) {
      await this.init();
    }

    return new Promise<T[]>((resolve, reject) => {
      const transaction = this.getTransaction(storeName);
      if (!transaction) {
        reject(
          new Error(
            `Transaktion für Store '${storeName}' konnte nicht erstellt werden`,
          ),
        );
        return;
      }

      const store = transaction.objectStore(storeName);
      let source: IDBObjectStore | IDBIndex = store;

      // Index verwenden, wenn angegeben
      if (options.index) {
        source = store.index(options.index);
      }

      // Bereichsoptionen
      let range: IDBKeyRange | null = null;
      if (options.startKey !== undefined && options.endKey !== undefined) {
        range = IDBKeyRange.bound(options.startKey, options.endKey);
      } else if (options.equalTo !== undefined) {
        range = IDBKeyRange.only(options.equalTo);
      }

      // Richtung
      const direction = options.direction || "next";

      // Ergebnisarray
      const results: T[] = [];

      // Cursor öffnen
      const request = source.openCursor(range, direction);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        // Wenn kein Cursor mehr oder Limit erreicht
        if (!cursor || (options.limit && results.length >= options.limit)) {
          if (this.debug) {
            this.logger.debug(
              `${results.length} Objekte aus '${storeName}' abgefragt`,
            );
          }

          resolve(results);
          return;
        }

        // Ergebnis hinzufügen
        results.push(cursor.value);

        // Nächsten Cursor holen
        cursor.continue();
      };

      request.onerror = (event) => {
        this.logger.error(
          `Fehler bei der Abfrage in '${storeName}'`,
          (event.target as IDBRequest).onerror,
        );
        reject((event.target as IDBRequest).onerror);
      };
    });
  }
}

/**
 * Factory-Funktion für IndexedDBService
 */
export function createIndexedDBService(
  options: IndexedDBOptions,
): IndexedDBService {
  return new IndexedDBService(options);
}

// Singleton-Instance für allgemeine Verwendung
export const defaultIndexedDBService = new IndexedDBService({
  dbName: "nscaleAssistant",
  version: 1,
  stores: [
    {
      name: "sessions",
      keyPath: "id",
      indices: [
        { name: "createdAt", keyPath: "createdAt" },
        { name: "updatedAt", keyPath: "updatedAt" },
      ],
    },
    {
      name: "messages",
      keyPath: "id",
      indices: [
        { name: "sessionId", keyPath: "sessionId" },
        { name: "sessionAndTimestamp", keyPath: ["sessionId", "timestamp"] },
      ],
    },
    {
      name: "documents",
      keyPath: "id",
      indices: [
        { name: "filename", keyPath: "filename" },
        { name: "uploadedAt", keyPath: "uploadedAt" },
        { name: "status", keyPath: "status" },
      ],
    },
    {
      name: "offlineRequests",
      keyPath: "id",
      autoIncrement: true,
      indices: [
        { name: "timestamp", keyPath: "timestamp" },
        { name: "url", keyPath: "url" },
        { name: "method", keyPath: "method" },
        { name: "status", keyPath: "status" },
      ],
    },
    {
      name: "settings",
      keyPath: "key",
    },
  ],
  debug: process.env.NODE_ENV !== "production",
});

export default defaultIndexedDBService;
