/**
 * StateManager-Komponente für die verbesserte Bridge
 *
 * Diese Datei implementiert den StateManager, der für die bidirektionale
 * Synchronisation zwischen Legacy-State und Vue-Stores verantwortlich ist.
 */

import { watch } from "vue";
import {
  StateManager,
  BridgeLogger,
  UpdateOperation,
  BridgeErrorState,
} from "./types";

/**
 * Klasse für atomare Transaktionen
 */
class AtomicStateManager {
  private stateSnapshot: any = null;
  private isTransactionActive = false;

  beginTransaction(state: any): void {
    this.stateSnapshot = JSON.parse(JSON.stringify(state));
    this.isTransactionActive = true;
  }

  commitTransaction(): void {
    this.isTransactionActive = false;
    this.stateSnapshot = null;
  }

  rollbackTransaction(): any {
    if (!this.isTransactionActive) return null;

    const result = this.stateSnapshot;
    this.isTransactionActive = false;
    this.stateSnapshot = null;

    return result;
  }

  isInTransaction(): boolean {
    return this.isTransactionActive;
  }
}

/**
 * Konfliktlösungsstrategie
 */
class ConflictResolver {
  private pendingUpdates: UpdateOperation[] = [];
  private lockTimeout = 200; // ms
  private locked = false;
  private logger: BridgeLogger;

  constructor(logger: BridgeLogger) {
    this.logger = logger;
  }

  async applyUpdate(operation: UpdateOperation): Promise<boolean> {
    if (this.locked) {
      this.pendingUpdates.push(operation);
      this.logger.debug("Update in Warteschlange gestellt", operation);
      return false;
    }

    this.locked = true;

    // Überprüfen auf Konflikte mit gleichen Pfaden
    const conflictingOps = this.pendingUpdates.filter(
      (op) => op.path === operation.path && op.source !== operation.source,
    );

    if (conflictingOps.length > 0) {
      this.logger.warn("Konflikte bei Update erkannt", {
        operation,
        conflicts: conflictingOps,
      });

      // Strategie: Das neueste Update gewinnt
      const winner = [...conflictingOps, operation].sort(
        (a, b) => b.timestamp - a.timestamp,
      )[0];

      this.logger.info("Konflikt gelöst, Gewinner:", winner);

      // Entfernen aller konfliktbehafteten Operationen
      this.pendingUpdates = this.pendingUpdates.filter(
        (op) => !conflictingOps.includes(op),
      );
    }

    setTimeout(() => {
      this.locked = false;
      this.processPendingUpdates();
    }, this.lockTimeout);

    return true;
  }

  private processPendingUpdates(): void {
    if (this.pendingUpdates.length > 0 && !this.locked) {
      const nextOp = this.pendingUpdates.shift();
      if (nextOp) {
        this.logger.debug("Verarbeite ausstehenden Update", nextOp);
        this.applyUpdate(nextOp);
      }
    }
  }
}

/**
 * Selektive Update-Strategie
 */
class SelectiveUpdateManager {
  private lastValues: Map<string, any> = new Map();
  private updateThreshold = 50; // ms
  private pendingUpdates: Set<string> = new Set();
  private updateTimer: number | null = null;
  private logger: BridgeLogger;
  private updateCallback: (paths: string[]) => void;

  constructor(logger: BridgeLogger, updateCallback: (paths: string[]) => void) {
    this.logger = logger;
    this.updateCallback = updateCallback;
  }

  scheduleUpdate(path: string, value: any): void {
    // Wert hat sich nicht geändert, keine Aktualisierung nötig
    const lastValueJson = this.lastValues.has(path)
      ? JSON.stringify(this.lastValues.get(path))
      : undefined;
    const newValueJson = JSON.stringify(value);

    if (lastValueJson === newValueJson) {
      return;
    }

    // Aktualisieren des gespeicherten Werts
    this.lastValues.set(path, JSON.parse(newValueJson));

    // Pfad für Update markieren
    this.pendingUpdates.add(path);

    // Timer für gesammelte Updates starten, falls nicht bereits vorhanden
    if (this.updateTimer === null) {
      this.updateTimer = window.setTimeout(() => {
        this.processPendingUpdates();
      }, this.updateThreshold);
    }
  }

  private processPendingUpdates(): void {
    // Timer zurücksetzen
    this.updateTimer = null;

    // Optimierte Aktualisierungsstrategie für verschachtelte Pfade
    const optimizedPaths = this.optimizePaths(Array.from(this.pendingUpdates));

    if (optimizedPaths.length > 0) {
      this.logger.debug(
        `Verarbeite selektive Updates für ${optimizedPaths.length} Pfade`,
        optimizedPaths,
      );
      // Updates durchführen
      this.updateCallback(optimizedPaths);
    }

    // Ausstehende Updates leeren
    this.pendingUpdates.clear();
  }

  private optimizePaths(paths: string[]): string[] {
    // Entfernt überflüssige Updates, wenn ein übergeordneter Pfad bereits aktualisiert wird
    // z.B. wenn 'user' und 'user.name' aktualisiert werden sollen, genügt 'user'
    const sortedPaths = [...paths].sort();
    const optimizedPaths: string[] = [];

    for (let i = 0; i < sortedPaths.length; i++) {
      const currentPath = sortedPaths[i];

      // Prüfen, ob der aktuelle Pfad ein Unterpfad eines bereits vorhandenen optimierten Pfads ist
      const isSubPath = optimizedPaths.some((p) =>
        currentPath.startsWith(p + "."),
      );

      if (!isSubPath) {
        optimizedPaths.push(currentPath);
      }
    }

    return optimizedPaths;
  }
}

/**
 * Implementation des StateManager
 */
export class EnhancedStateManager implements StateManager {
  private vueStores: Record<string, any> = {};
  private legacyState: Record<string, any> = {};
  private logger: BridgeLogger;
  private watchers: Array<() => void> = [];
  private atomicState: AtomicStateManager;
  private conflictResolver: ConflictResolver;
  private selectiveUpdates: SelectiveUpdateManager;
  private subscribers: Map<string, Array<(value: any, oldValue: any) => void>> =
    new Map();
  private healthStatus: boolean = true;

  constructor(logger: BridgeLogger) {
    this.logger = logger;
    this.atomicState = new AtomicStateManager();
    this.conflictResolver = new ConflictResolver(logger);
    this.selectiveUpdates = new SelectiveUpdateManager(logger, (paths) => {
      paths.forEach((path) => this.notifySubscribers(path));
    });

    this.logger.info("StateManager initialisiert");
  }

  /**
   * Verbindet Vue-Stores mit Legacy-State
   */
  connect(
    vueStores: Record<string, any>,
    legacyState: Record<string, any>,
  ): void {
    this.logger.info("Verbinde Vue-Stores mit Legacy-State");

    this.vueStores = vueStores;
    this.legacyState = legacyState;

    // Alte Watcher bereinigen
    this.disconnect();

    // Deep-Watching für Vue-Stores einrichten
    for (const storeKey in vueStores) {
      const watcher = this.setupDeepWatcher(
        vueStores[storeKey],
        `${storeKey}`,
        "vue",
      );
      this.watchers.push(watcher);
    }

    // Deep-Watching für Legacy-State einrichten (falls möglich)
    try {
      for (const stateKey in legacyState) {
        const proxy = this.createReactiveProxy(legacyState[stateKey], stateKey);
        legacyState[stateKey] = proxy;
      }

      this.logger.info("State-Watching initialisiert");
    } catch (error) {
      this.logger.error(
        "Fehler beim Einrichten des Legacy-State-Watchings",
        error,
      );
      this.healthStatus = false;
    }
  }

  /**
   * Trennt die Verbindung und bereinigt alle Watcher
   */
  disconnect(): void {
    this.watchers.forEach((unwatch) => unwatch());
    this.watchers = [];
    this.subscribers.clear();
    this.logger.info("StateManager-Verbindung getrennt");
  }

  /**
   * Richtet Deep-Watching für ein Objekt ein
   */
  private setupDeepWatcher(
    source: any,
    basePath: string,
    sourceType: "vue" | "legacy",
  ): () => void {
    const watchers: Array<() => void> = [];

    // Rekursive Funktion zum Beobachten verschachtelter Objekte
    const watchObject = (obj: any, path: string): void => {
      // Stellen Sie sicher, dass wir nur Objekte beobachten
      if (typeof obj !== "object" || obj === null) {
        return;
      }

      // Wir wollen keine Vue-Interna beobachten
      if (path.includes("__v_") || path.includes("__proto__")) {
        return;
      }

      // Für alle Eigenschaften des Objekts
      for (const key in obj) {
        // Vue-interne Eigenschaften überspringen
        if (key.startsWith("__v_") || key === "__proto__") {
          continue;
        }

        const currentPath = path ? `${path}.${key}` : key;

        // Rekursiv für verschachtelte Objekte
        if (typeof obj[key] === "object" && obj[key] !== null) {
          watchObject(obj[key], currentPath);
        }

        // Watcher für diese Eigenschaft einrichten
        try {
          const watcher = watch(
            () => obj[key],
            (newVal, oldVal) => {
              if (JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
                this.handleStateChange(currentPath, newVal, sourceType);
              }
            },
            { deep: true },
          );

          watchers.push(watcher);
        } catch (error) {
          this.logger.warn(
            `Konnte keine Beobachtung für ${currentPath} einrichten`,
            error,
          );
        }
      }
    };

    // Starten Sie das Beobachten beim Stammobjekt
    watchObject(source, basePath);

    // Funktion zum Aufräumen aller erstellten Watcher zurückgeben
    return () => watchers.forEach((unwatch) => unwatch());
  }

  /**
   * Erstellt einen reaktiven Proxy für Legacy-Objekte
   */
  private createReactiveProxy(obj: any, path: string): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    const self = this;

    return new Proxy(obj, {
      get(target, prop: string) {
        const value = target[prop];

        if (typeof value === "object" && value !== null) {
          return self.createReactiveProxy(value, `${path}.${prop.toString()}`);
        }

        return value;
      },

      set(target, prop: string, value) {
        const oldValue = target[prop];
        target[prop] = value;

        // Änderung nur melden, wenn Wert sich wirklich geändert hat
        if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
          self.handleStateChange(`${path}.${prop.toString()}`, value, "legacy");
        }

        return true;
      },
    });
  }

  /**
   * Behandelt eine Zustandsänderung
   */
  private handleStateChange(
    path: string,
    value: any,
    source: "vue" | "legacy",
  ): void {
    this.logger.debug(`Zustandsänderung von ${source}: ${path}`, value);

    // Update-Operation erstellen
    const operation: UpdateOperation = {
      path,
      value,
      timestamp: Date.now(),
      source,
    };

    // Auf Konflikte prüfen und ggf. auflösen
    this.conflictResolver.applyUpdate(operation).then((shouldUpdate) => {
      if (shouldUpdate) {
        // Je nach Quelle den anderen Teil aktualisieren
        if (source === "vue") {
          this.updateLegacyState(path, value);
        } else {
          this.updateVueStore(path, value);
        }

        // Selektives Update für Subscriber planen
        this.selectiveUpdates.scheduleUpdate(path, value);
      }
    });
  }

  /**
   * Aktualisiert den Legacy-State basierend auf Vue-Store-Änderungen
   */
  private updateLegacyState(path: string, value: any): void {
    try {
      const pathParts = path.split(".");
      const storeKey = pathParts[0];

      if (pathParts.length === 1) {
        // Direktes Update des Haupt-State-Objekts
        this.legacyState[storeKey] = value;
        return;
      }

      // Nested state update
      let current = this.legacyState;
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (current[part] === undefined) {
          current[part] = {};
        }
        current = current[part];
      }

      const lastPart = pathParts[pathParts.length - 1];
      current[lastPart] = value;

      this.logger.debug("Legacy-State aktualisiert", { path, value });
    } catch (error) {
      this.logger.error("Fehler beim Aktualisieren des Legacy-State", {
        path,
        error,
      });
      this.healthStatus = false;
    }
  }

  /**
   * Aktualisiert den Vue-Store basierend auf Legacy-State-Änderungen
   */
  private updateVueStore(path: string, value: any): void {
    try {
      const pathParts = path.split(".");
      const storeKey = pathParts[0];

      if (!this.vueStores[storeKey]) {
        this.logger.warn(`Store ${storeKey} nicht gefunden`);
        return;
      }

      if (pathParts.length === 1) {
        // Direktes Update des gesamten Stores nicht unterstützt
        this.logger.warn(
          "Direktes Update des gesamten Stores nicht unterstützt",
        );
        return;
      }

      // Nested state update - für Pinia muss man durch ihre $state-API gehen
      if (this.vueStores[storeKey].$state) {
        // Pinia Store
        let current = this.vueStores[storeKey].$state;
        const path = pathParts.slice(1); // Store-Namen entfernen

        for (let i = 0; i < path.length - 1; i++) {
          const part = path[i];
          if (current[part] === undefined) {
            current[part] = {};
          }
          current = current[part];
        }

        const lastPart = path[path.length - 1];
        current[lastPart] = value;
      } else {
        // Standard-Objekt, direktes Update
        let current = this.vueStores[storeKey];
        const path = pathParts.slice(1); // Store-Namen entfernen

        for (let i = 0; i < path.length - 1; i++) {
          const part = path[i];
          if (current[part] === undefined) {
            current[part] = {};
          }
          current = current[part];
        }

        const lastPart = path[path.length - 1];
        current[lastPart] = value;
      }

      this.logger.debug("Vue-Store aktualisiert", { path, value });
    } catch (error) {
      this.logger.error("Fehler beim Aktualisieren des Vue-Store", {
        path,
        error,
      });
      this.healthStatus = false;
    }
  }

  /**
   * Gibt den aktuellen Zustand für einen Pfad zurück
   */
  getState(path: string): any {
    try {
      const pathParts = path.split(".");
      const storeKey = pathParts[0];

      // Zuerst in Vue-Stores suchen
      if (this.vueStores[storeKey]) {
        if (pathParts.length === 1) {
          return this.vueStores[storeKey];
        }

        let current = this.vueStores[storeKey];

        // Für Pinia-Stores: Zugriff über $state für Zustandsdaten
        if (current.$state && pathParts.length > 1) {
          current = current.$state;

          // Durchläuft den Pfad für verschachtelte Eigenschaften
          for (let i = 1; i < pathParts.length; i++) {
            if (current === undefined) return undefined;
            current = current[pathParts[i]];
          }

          return current;
        }

        // Standard-Objektzugriff
        for (let i = 1; i < pathParts.length; i++) {
          if (current === undefined) return undefined;
          current = current[pathParts[i]];
        }

        return current;
      }

      // Dann in Legacy-State suchen
      if (this.legacyState[storeKey]) {
        if (pathParts.length === 1) {
          return this.legacyState[storeKey];
        }

        let current = this.legacyState[storeKey];

        // Durchläuft den Pfad für verschachtelte Eigenschaften
        for (let i = 1; i < pathParts.length; i++) {
          if (current === undefined) return undefined;
          current = current[pathParts[i]];
        }

        return current;
      }

      return undefined;
    } catch (error) {
      this.logger.error("Fehler beim Abrufen des Zustands", { path, error });
      return undefined;
    }
  }

  /**
   * Setzt den Zustand für einen Pfad
   */
  setState(
    path: string,
    value: any,
    source: "legacy" | "vue" = "vue",
  ): boolean {
    try {
      this.atomicState.beginTransaction({
        path,
        oldValue: this.getState(path),
      });

      if (source === "vue") {
        this.updateLegacyState(path, value);
      } else {
        this.updateVueStore(path, value);
      }

      this.handleStateChange(path, value, source);
      this.atomicState.commitTransaction();

      return true;
    } catch (error) {
      this.logger.error("Fehler beim Setzen des Zustands", {
        path,
        value,
        error,
      });

      // Rollback bei Fehler
      const snapshot = this.atomicState.rollbackTransaction();
      if (snapshot) {
        this.logger.info("Transaktion zurückgerollt", snapshot);
      }

      this.healthStatus = false;
      return false;
    }
  }

  /**
   * Abonniert Änderungen an einem Pfad
   */
  subscribe(
    path: string,
    callback: (value: any, oldValue: any) => void,
  ): () => void {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, []);
    }

    this.subscribers.get(path)!.push(callback);
    this.logger.debug(`Neuer Subscriber für Pfad: ${path}`);

    // Rückgabe der Unsubscribe-Funktion
    return () => {
      const callbacks = this.subscribers.get(path);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
          this.logger.debug(`Subscriber entfernt für Pfad: ${path}`);
        }

        if (callbacks.length === 0) {
          this.subscribers.delete(path);
        }
      }
    };
  }

  /**
   * Benachrichtigt Subscriber über Änderungen
   */
  private notifySubscribers(path: string): void {
    const value = this.getState(path);

    // Exakte Pfad-Subscriber
    if (this.subscribers.has(path)) {
      this.subscribers.get(path)!.forEach((callback) => {
        try {
          callback(value, undefined);
        } catch (error) {
          this.logger.error("Fehler im Subscriber-Callback", { path, error });
        }
      });
    }

    // Pfad-Präfix-Subscriber (für übergeordnete Objekte)
    for (const subscribedPath of this.subscribers.keys()) {
      if (path.startsWith(subscribedPath + ".")) {
        const subValue = this.getState(subscribedPath);
        this.subscribers.get(subscribedPath)!.forEach((callback) => {
          try {
            callback(subValue, undefined);
          } catch (error) {
            this.logger.error("Fehler im übergeordneten Subscriber-Callback", {
              subscribedPath,
              changedPath: path,
              error,
            });
          }
        });
      }
    }
  }

  /**
   * Prüft, ob der StateManager gesund ist
   */
  isHealthy(): boolean {
    return this.healthStatus;
  }

  /**
   * Setzt den StateManager zurück
   */
  reset(): void {
    this.healthStatus = true;
    this.disconnect();

    // Wiederverbinden, falls Stores vorhanden
    if (
      Object.keys(this.vueStores).length > 0 &&
      Object.keys(this.legacyState).length > 0
    ) {
      this.connect(this.vueStores, this.legacyState);
    }

    this.logger.info("StateManager zurückgesetzt");
  }

  /**
   * Gibt Diagnose-Informationen zurück
   */
  getDiagnostics(): any {
    return {
      health: this.healthStatus,
      storeCount: Object.keys(this.vueStores).length,
      legacyStateCount: Object.keys(this.legacyState).length,
      watcherCount: this.watchers.length,
      subscriberCount: Array.from(this.subscribers.entries()).reduce(
        (sum, [path, callbacks]) => sum + callbacks.length,
        0,
      ),
      subscribedPaths: Array.from(this.subscribers.keys()),
    };
  }
}
