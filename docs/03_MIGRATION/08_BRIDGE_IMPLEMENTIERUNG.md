# Bridge-Implementierung für die Integration von Vanilla JS und Vue 3

Dieses Dokument beschreibt die Architektur und Implementierung einer verbesserten Bridge für die Kommunikation zwischen Legacy-Vanilla-JavaScript-Code und modernen Vue 3-Komponenten im nscale DMS Assistenten.

## Inhaltsverzeichnis

1. [Architekturübersicht](#architekturübersicht)
   - [Architektur-Diagramm](#architektur-diagramm)
   - [Architekturprinzipien](#architekturprinzipien)
2. [Core-Komponenten](#core-komponenten)
   - [StateManager](#statemanager)
   - [EventBus](#eventbus)
   - [BridgeCore](#bridgecore)
3. [Zustandssynchronisation](#zustandssynchronisation)
   - [Deep-Watching](#deep-watching)
   - [Konfliktbehandlung](#konfliktbehandlung)
   - [Atomare Updates](#atomare-updates)
4. [Fehlerbehandlung und Diagnostik](#fehlerbehandlung-und-diagnostik)
   - [Logging-System](#logging-system)
   - [Selbstheilungsmechanismen](#selbstheilungsmechanismen)
   - [Fehlerzustände](#fehlerzustände)
5. [Performance-Optimierungen](#performance-optimierungen)
   - [Event-Batching](#event-batching)
   - [Selektive Updates](#selektive-updates)
   - [Effiziente Serialisierung](#effiziente-serialisierung)
6. [API-Referenz](#api-referenz)
   - [Bridge-API](#bridge-api)
   - [Store-API](#store-api)
   - [Event-API](#event-api)
7. [Integration mit bestehenden Komponenten](#integration-mit-bestehenden-komponenten)
8. [Testfälle und Validierung](#testfälle-und-validierung)
9. [Edge Cases und Lösungsansätze](#edge-cases-und-lösungsansätze)
10. [Beispiel-Implementation](#beispiel-implementation)

## Architekturübersicht

Die Bridge bildet eine leistungsfähige, fehlertolerante und performante Brücke zwischen dem Legacy-Vanilla-JavaScript-Code und den neuen Vue 3-Komponenten. Sie ermöglicht die bidirektionale Kommunikation und Zustandssynchronisation zwischen beiden Welten.

### Architektur-Diagramm

```
┌─────────────────────────┐                  ┌────────────────────────┐
│     Legacy JS Code      │                  │    Vue 3 Components    │
│                         │                  │                        │
│  ┌─────────────────┐    │                  │    ┌──────────────┐    │
│  │  Legacy State   │◄───┼──────────────────┼────┤  Pinia Store  │    │
│  └────────┬────────┘    │                  │    └──────┬───────┘    │
│           │             │                  │           │            │
│  ┌────────▼────────┐    │    ┌─────────────▼───────────▼─────┐     │
│  │  Legacy Events  │◄───┼────┤          BridgeCore           │     │
│  └────────┬────────┘    │    │                               │     │
│           │             │    │  ┌─────────────────────────┐  │     │
│           │             │    │  │        StateManager      │  │     │
└───────────┼─────────────┘    │  └─────────────────────────┘  │     │
            │                  │                               │     │
            │                  │  ┌─────────────────────────┐  │     │
            └──────────────────┼─►│         EventBus        │◄─┼─────┘
                               │  └─────────────────────────┘  │
                               │                               │
                               │  ┌─────────────────────────┐  │
                               │  │     DiagnosticsManager  │  │
                               │  └─────────────────────────┘  │
                               └───────────────────────────────┘
```

### Architekturprinzipien

1. **Separation of Concerns**:
   - StateManager für Zustandssynchronisation
   - EventBus für Event-Kommunikation
   - DiagnosticsManager für Logging und Fehlerbehandlung

2. **Zuverlässigkeit**:
   - Fehlertoleranz durch Selbstheilungsmechanismen
   - Atomare Transaktionen für konsistente Zustandsänderungen
   - Konflikterkennung und -lösung

3. **Performance**:
   - Minimierung von unnötigen Rerenders
   - Batching von Events und Updates
   - Optimierte Serialisierung für komplexe Datenstrukturen

4. **Typsicherheit**:
   - Vollständig mit TypeScript implementiert
   - Klare Schnittstellen und Typdefinitionen
   - Runtime-Typvalidierung für robuste Integration

## Core-Komponenten

### StateManager

Der StateManager ist verantwortlich für die bidirektionale Synchronisation des Zustands zwischen Legacy-Code und Vue-Komponenten.

**Hauptfunktionen:**

- Deep-Watching von verschachtelten Objekten
- Konfliktbehandlung bei konkurrierenden Updates
- Atomare Zustandsänderungen
- Schema-Validierung

### EventBus

Der EventBus dient als zentraler Kommunikationskanal zwischen Legacy-Code und Vue-Komponenten.

**Hauptfunktionen:**

- Event-Batching zur Vermeidung von Überflutung
- Event-Filterung und -Priorisierung
- Ereignis-Routing basierend auf dynamischen Regeln
- Event-Protokollierung für Debugging

### BridgeCore

BridgeCore ist der zentrale Koordinator, der StateManager und EventBus orchestriert.

**Hauptfunktionen:**

- Initialisierung und Konfiguration
- Lifecycle-Management
- Feature-Flags und dynamische Aktivierung
- Globale API-Bereitstellung

## Zustandssynchronisation

### Deep-Watching

Die Bridge implementiert ein intelligentes Deep-Watching-System, das Änderungen in verschachtelten Objekten erkennt:

```typescript
// Beispiel für Deep-Watching-Implementierung
function setupDeepWatcher<T extends Record<string, any>>(
  source: T, 
  target: T, 
  onChange: (path: string, newValue: any, oldValue: any) => void
): () => void {
  const watchers: Array<() => void> = [];
  
  function watchObject(obj: any, path: string): void {
    for (const key in obj) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        watchObject(obj[key], currentPath);
      }
      
      const watcher = watch(
        () => obj[key],
        (newVal, oldVal) => {
          if (JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
            onChange(currentPath, newVal, oldVal);
          }
        },
        { deep: true }
      );
      
      watchers.push(watcher);
    }
  }
  
  watchObject(source, '');
  
  return () => watchers.forEach(unwatch => unwatch());
}
```

### Konfliktbehandlung

Bei gleichzeitigen Aktualisierungen verwendet die Bridge einen Konflikterkennung- und -lösungsmechanismus:

```typescript
// Beispiel für Konfliktlösungs-Strategie
interface UpdateOperation {
  path: string;
  value: any;
  timestamp: number;
  source: 'legacy' | 'vue';
}

class ConflictResolver {
  private pendingUpdates: UpdateOperation[] = [];
  private lockTimeout = 200; // ms
  private locked = false;
  
  async applyUpdate(operation: UpdateOperation): Promise<boolean> {
    if (this.locked) {
      this.pendingUpdates.push(operation);
      return false;
    }
    
    this.locked = true;
    
    // Überprüfen auf Konflikte mit gleichen Pfaden
    const conflictingOps = this.pendingUpdates.filter(op => 
      op.path === operation.path && op.source !== operation.source
    );
    
    if (conflictingOps.length > 0) {
      // Strategie: Das neueste Update gewinnt
      const winner = [...conflictingOps, operation]
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      
      // Anwenden des Gewinners
      // ...
      
      // Entfernen aller konfliktbehafteten Operationen
      this.pendingUpdates = this.pendingUpdates.filter(op => 
        !conflictingOps.includes(op)
      );
    } else {
      // Direkt anwenden, da kein Konflikt
      // ...
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
        this.applyUpdate(nextOp);
      }
    }
  }
}
```

### Atomare Updates

Um die Konsistenz bei komplexen Zustandsänderungen zu gewährleisten, verwendet die Bridge atomare Transaktionen:

```typescript
// Beispiel für atomare Updates
class AtomicStateManager {
  private stateSnapshot: any = null;
  private isTransactionActive = false;
  
  beginTransaction(state: any): void {
    this.stateSnapshot = JSON.parse(JSON.stringify(state));
    this.isTransactionActive = true;
  }
  
  commitTransaction(state: any): void {
    this.isTransactionActive = false;
    this.stateSnapshot = null;
    // Hier könnte ein Event ausgelöst werden
  }
  
  rollbackTransaction(state: any): any {
    if (!this.isTransactionActive) return state;
    
    const result = this.stateSnapshot;
    this.isTransactionActive = false;
    this.stateSnapshot = null;
    
    return result;
  }
  
  isInTransaction(): boolean {
    return this.isTransactionActive;
  }
}
```

## Fehlerbehandlung und Diagnostik

### Logging-System

Die Bridge implementiert ein umfassendes Logging-System mit verschiedenen Detailstufen:

```typescript
// Beispiel für erweiterte Logging-Funktionalität
enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR
}

class BridgeLogger {
  private level: LogLevel = LogLevel.INFO;
  private logs: { level: LogLevel; message: string; timestamp: Date; data?: any }[] = [];
  private maxLogs = 1000;
  
  setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }
  
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }
  
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }
  
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }
  
  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.level) return;
    
    const logEntry = {
      level,
      message,
      timestamp: new Date(),
      data
    };
    
    this.logs.push(logEntry);
    
    // Begrenzung der Log-Größe
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Ausgabe im Konsolenformat
    const prefix = LogLevel[level].padEnd(5);
    console.log(`[Bridge] ${prefix} | ${message}`, data || '');
    
    // Bei Fehlern auch einen benutzerdefinierten Event auslösen
    if (level === LogLevel.ERROR) {
      this.emitErrorEvent(message, data);
    }
  }
  
  private emitErrorEvent(message: string, data?: any): void {
    const event = new CustomEvent('bridge:error', {
      detail: { message, data, timestamp: new Date() }
    });
    window.dispatchEvent(event);
  }
  
  getLogs(level?: LogLevel): any[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }
  
  clearLogs(): void {
    this.logs = [];
  }
}
```

### Selbstheilungsmechanismen

Die Bridge enthält Selbstheilungsmechanismen, die automatisch auf erkannte Fehler reagieren:

```typescript
// Beispiel für Selbstheilungsmechanismen
class SelfHealingBridge {
  private healthChecks: (() => boolean)[] = [];
  private recoveryStrategies: (() => Promise<boolean>)[] = [];
  private isRecovering = false;
  private logger: BridgeLogger;
  
  constructor(logger: BridgeLogger) {
    this.logger = logger;
    this.setupPeriodicHealthCheck();
  }
  
  addHealthCheck(check: () => boolean): void {
    this.healthChecks.push(check);
  }
  
  addRecoveryStrategy(strategy: () => Promise<boolean>): void {
    this.recoveryStrategies.push(strategy);
  }
  
  private setupPeriodicHealthCheck(): void {
    setInterval(() => this.performHealthCheck(), 30000); // Alle 30 Sekunden
  }
  
  async performHealthCheck(): Promise<boolean> {
    if (this.isRecovering) return false;
    
    const unhealthyChecks = this.healthChecks.filter(check => !check());
    
    if (unhealthyChecks.length > 0) {
      this.logger.warn(`Bridge-Gesundheitsprüfung fehlgeschlagen: ${unhealthyChecks.length} Probleme erkannt`);
      return await this.attemptRecovery();
    }
    
    return true;
  }
  
  private async attemptRecovery(): Promise<boolean> {
    this.isRecovering = true;
    this.logger.info('Starte Wiederherstellungsversuch für Bridge');
    
    try {
      for (const strategy of this.recoveryStrategies) {
        const success = await strategy();
        if (success) {
          this.logger.info('Bridge-Wiederherstellung erfolgreich');
          this.isRecovering = false;
          return true;
        }
      }
      
      this.logger.error('Alle Bridge-Wiederherstellungsstrategien sind fehlgeschlagen');
      this.isRecovering = false;
      return false;
    } catch (error) {
      this.logger.error('Fehler während der Bridge-Wiederherstellung', error);
      this.isRecovering = false;
      return false;
    }
  }
}
```

### Fehlerzustände

Klare Fehlerzustände mit benutzerfreundlichen Meldungen:

```typescript
// Beispiel für Fehlerzustände
enum BridgeErrorState {
  HEALTHY,
  DEGRADED_PERFORMANCE,
  SYNC_ERROR,
  COMMUNICATION_ERROR,
  CRITICAL_FAILURE
}

interface BridgeStatusInfo {
  state: BridgeErrorState;
  message: string;
  timestamp: Date;
  affectedComponents: string[];
  recoveryAttempts: number;
}

class BridgeStatusManager {
  private currentStatus: BridgeStatusInfo = {
    state: BridgeErrorState.HEALTHY,
    message: 'Bridge funktioniert normal',
    timestamp: new Date(),
    affectedComponents: [],
    recoveryAttempts: 0
  };
  
  private statusListeners: ((status: BridgeStatusInfo) => void)[] = [];
  
  updateStatus(newStatus: Partial<BridgeStatusInfo>): void {
    this.currentStatus = {
      ...this.currentStatus,
      ...newStatus,
      timestamp: new Date()
    };
    
    this.notifyListeners();
    
    // UI-Benachrichtigung bei kritischen Fehlern
    if (this.currentStatus.state === BridgeErrorState.CRITICAL_FAILURE) {
      this.showUserNotification();
    }
  }
  
  getStatus(): BridgeStatusInfo {
    return {...this.currentStatus};
  }
  
  onStatusChanged(listener: (status: BridgeStatusInfo) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }
  
  private notifyListeners(): void {
    this.statusListeners.forEach(listener => listener(this.currentStatus));
  }
  
  private showUserNotification(): void {
    // Hier könnte eine benutzerfreundliche Benachrichtigung im UI angezeigt werden
    if (window.nscaleUI?.showToast) {
      window.nscaleUI.showToast(
        `Bridge-Fehler: ${this.currentStatus.message}. Seite neuladen, um das Problem zu beheben.`,
        'error',
        { duration: 0, dismissible: true }
      );
    }
  }
}
```

## Performance-Optimierungen

### Event-Batching

Durch Event-Batching wird die Anzahl der Ereignisse reduziert:

```typescript
// Beispiel für Event-Batching
class BatchingEventBus {
  private eventQueue: Map<string, any[]> = new Map();
  private batchInterval = 50; // ms
  private batchTimers: Map<string, number> = new Map();
  private listeners: Map<string, Array<(data: any[]) => void>> = new Map();
  
  emit(eventType: string, data: any): void {
    if (!this.eventQueue.has(eventType)) {
      this.eventQueue.set(eventType, []);
    }
    
    this.eventQueue.get(eventType)!.push(data);
    
    // Timer für diesen Event-Typ starten, falls noch nicht vorhanden
    if (!this.batchTimers.has(eventType)) {
      const timerId = window.setTimeout(() => {
        this.flushEvents(eventType);
      }, this.batchInterval);
      
      this.batchTimers.set(eventType, timerId);
    }
  }
  
  private flushEvents(eventType: string): void {
    const batchedData = this.eventQueue.get(eventType) || [];
    this.eventQueue.delete(eventType);
    
    // Timer löschen
    if (this.batchTimers.has(eventType)) {
      window.clearTimeout(this.batchTimers.get(eventType));
      this.batchTimers.delete(eventType);
    }
    
    // Keine Listener oder keine Daten
    if (!this.listeners.has(eventType) || batchedData.length === 0) {
      return;
    }
    
    // Alle Listener mit dem Batch benachrichtigen
    this.listeners.get(eventType)!.forEach(listener => {
      listener(batchedData);
    });
  }
  
  on(eventType: string, callback: (data: any[]) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    this.listeners.get(eventType)!.push(callback);
    
    return () => {
      if (this.listeners.has(eventType)) {
        const listeners = this.listeners.get(eventType)!;
        const index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }
  
  // Sofort alle Events aller Typen senden
  flushAllEvents(): void {
    // Kopie erstellen, da wir während der Iteration die Map modifizieren
    const eventTypes = Array.from(this.eventQueue.keys());
    
    eventTypes.forEach(type => this.flushEvents(type));
  }
}
```

### Selektive Updates

Optimierung durch selektive Updates für minimale Zustandsänderungen:

```typescript
// Beispiel für selektive Updates
class SelectiveUpdateManager {
  private lastValues: Map<string, any> = new Map();
  private updateThreshold = 50; // ms
  private pendingUpdates: Set<string> = new Set();
  private updateTimer: number | null = null;
  
  scheduleUpdate(path: string, value: any): void {
    // Wert hat sich nicht geändert, keine Aktualisierung nötig
    if (this.lastValues.has(path) && 
        JSON.stringify(this.lastValues.get(path)) === JSON.stringify(value)) {
      return;
    }
    
    // Aktualisieren des gespeicherten Werts
    this.lastValues.set(path, JSON.parse(JSON.stringify(value)));
    
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
    
    // Updates durchführen...
    optimizedPaths.forEach(path => {
      // Update-Logik hier...
      console.log(`Selektives Update für: ${path}`);
    });
    
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
      const isSubPath = optimizedPaths.some(p => 
        currentPath.startsWith(p + '.')
      );
      
      if (!isSubPath) {
        optimizedPaths.push(currentPath);
      }
    }
    
    return optimizedPaths;
  }
}
```

### Effiziente Serialisierung

Optimierte Serialisierung komplexer Datenstrukturen:

```typescript
// Beispiel für effiziente Serialisierung
class EfficientSerializer {
  // Cache für bereits serialisierte Werte
  private serializationCache: Map<any, string> = new Map();
  private deserializationCache: Map<string, any> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;
  
  // Maximale Cachegröße
  private maxCacheSize = 100;
  
  serialize(value: any): string {
    // Primitive Werte direkt durchreichen
    if (value === null || 
        value === undefined || 
        typeof value === 'string' || 
        typeof value === 'number' || 
        typeof value === 'boolean') {
      return JSON.stringify(value);
    }
    
    // Für komplexe Objekte: Hashcode berechnen und im Cache nachschlagen
    const hashCode = this.objectHash(value);
    
    if (this.serializationCache.has(hashCode)) {
      this.cacheHits++;
      return this.serializationCache.get(hashCode)!;
    }
    
    this.cacheMisses++;
    const serialized = JSON.stringify(value);
    
    // Cache-Größe kontrollieren
    if (this.serializationCache.size >= this.maxCacheSize) {
      const firstKey = this.serializationCache.keys().next().value;
      this.serializationCache.delete(firstKey);
    }
    
    this.serializationCache.set(hashCode, serialized);
    this.deserializationCache.set(serialized, value);
    
    return serialized;
  }
  
  deserialize<T>(serialized: string): T {
    if (this.deserializationCache.has(serialized)) {
      this.cacheHits++;
      return this.deserializationCache.get(serialized) as T;
    }
    
    this.cacheMisses++;
    const deserialized = JSON.parse(serialized) as T;
    
    // Cache-Größe kontrollieren
    if (this.deserializationCache.size >= this.maxCacheSize) {
      const firstKey = this.deserializationCache.keys().next().value;
      this.deserializationCache.delete(firstKey);
    }
    
    this.deserializationCache.set(serialized, deserialized);
    return deserialized;
  }
  
  // Einfache Hash-Funktion für Objekte
  private objectHash(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
  
  getStats(): { hits: number, misses: number, ratio: number } {
    const total = this.cacheHits + this.cacheMisses;
    const ratio = total > 0 ? this.cacheHits / total : 0;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      ratio
    };
  }
  
  clearCache(): void {
    this.serializationCache.clear();
    this.deserializationCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}
```

## API-Referenz

### Bridge-API

Die zentrale API der Bridge mit allen öffentlichen Methoden:

```typescript
// Beispiel für die zentrale Bridge-API
interface BridgeConfiguration {
  debugging: boolean;
  logLevel: LogLevel;
  batchInterval: number;
  deepWatchEnabled: boolean;
  healthCheckInterval: number;
  autoRecovery: boolean;
}

class EnhancedBridge {
  private config: BridgeConfiguration;
  private stateManager: StateManager;
  private eventBus: EventBus;
  private logger: BridgeLogger;
  private statusManager: BridgeStatusManager;
  private selfHealing: SelfHealingBridge;
  
  constructor(config?: Partial<BridgeConfiguration>) {
    this.config = {
      debugging: false,
      logLevel: LogLevel.INFO,
      batchInterval: 50,
      deepWatchEnabled: true,
      healthCheckInterval: 30000,
      autoRecovery: true,
      ...config
    };
    
    this.logger = new BridgeLogger();
    this.logger.setLevel(this.config.logLevel);
    
    this.statusManager = new BridgeStatusManager();
    this.stateManager = new StateManager(this.logger);
    this.eventBus = new EventBus(this.logger, this.config.batchInterval);
    
    this.selfHealing = new SelfHealingBridge(this.logger);
    this.setupHealthChecks();
    
    this.logger.info('Enhanced Bridge initialisiert', this.config);
  }
  
  // Hauptmethoden
  
  connect(vueStores: Record<string, any>, legacyState: Record<string, any>): void {
    this.logger.info('Verbinde Stores mit Legacy-Zustand');
    this.stateManager.connect(vueStores, legacyState);
  }
  
  disconnect(): void {
    this.logger.info('Trenne Bridge-Verbindung');
    this.stateManager.disconnect();
    this.eventBus.clear();
  }
  
  exposeGlobalAPI(): Record<string, any> {
    const api = {
      getState: (path: string) => this.stateManager.getState(path),
      setState: (path: string, value: any) => this.stateManager.setState(path, value),
      subscribe: (path: string, callback: Function) => this.stateManager.subscribe(path, callback),
      emit: (event: string, data: any) => this.eventBus.emit(event, data),
      on: (event: string, callback: Function) => this.eventBus.on(event, callback),
      off: (event: string, callback: Function) => this.eventBus.off(event, callback),
      getStatus: () => this.statusManager.getStatus(),
      getLogs: () => this.logger.getLogs(),
      clearLogs: () => this.logger.clearLogs(),
      diagnostics: () => this.getDiagnostics()
    };
    
    window.nscaleBridge = api;
    
    this.logger.info('Globale API bereitgestellt');
    return api;
  }
  
  // Hilfsmethoden
  
  private setupHealthChecks(): void {
    // Store-Synchronisation
    this.selfHealing.addHealthCheck(() => {
      try {
        return this.stateManager.isHealthy();
      } catch (e) {
        return false;
      }
    });
    
    // Event-Bus
    this.selfHealing.addHealthCheck(() => {
      try {
        return this.eventBus.isOperational();
      } catch (e) {
        return false;
      }
    });
    
    // Wiederherstellungsstrategien
    this.selfHealing.addRecoveryStrategy(async () => {
      try {
        this.logger.info('Versuche, EventBus wiederherzustellen');
        this.eventBus.reset();
        return true;
      } catch (e) {
        return false;
      }
    });
    
    this.selfHealing.addRecoveryStrategy(async () => {
      try {
        this.logger.info('Versuche, StateManager wiederherzustellen');
        this.stateManager.reset();
        return true;
      } catch (e) {
        return false;
      }
    });
  }
  
  private getDiagnostics(): any {
    return {
      status: this.statusManager.getStatus(),
      stateManager: this.stateManager.getDiagnostics(),
      eventBus: this.eventBus.getDiagnostics(),
      logs: this.logger.getLogs()
    };
  }
}
```

### Store-API

API für die Integration mit verschiedenen Stores:

```typescript
// Beispiel für Store-spezifische APIs

// Auth-Store-Bridge 
interface AuthBridgeAPI {
  login(email: string, password: string): Promise<boolean>;
  logout(): void;
  getToken(): string | null;
  isAuthenticated(): boolean;
  getUser(): any;
  hasRole(role: string): boolean;
}

// Session-Store-Bridge
interface SessionBridgeAPI {
  createSession(title?: string): Promise<string>;
  loadSession(sessionId: string): Promise<boolean>;
  deleteSession(sessionId: string): Promise<boolean>;
  sendMessage(sessionId: string, content: string): Promise<void>;
  getCurrentSession(): any;
  getAllSessions(): any[];
}

// UI-Store-Bridge
interface UIBridgeAPI {
  showToast(message: string, type?: string): void;
  openModal(options: any): string;
  closeModal(id: string): void;
  toggleDarkMode(): void;
  isDarkMode(): boolean;
}

// Implementierung der konkreten Store-Bridge
class AuthStoreBridge implements AuthBridgeAPI {
  private authStore: any;
  private bridge: EnhancedBridge;
  
  constructor(authStore: any, bridge: EnhancedBridge) {
    this.authStore = authStore;
    this.bridge = bridge;
  }
  
  async login(email: string, password: string): Promise<boolean> {
    try {
      const result = await this.authStore.login({ email, password });
      this.bridge.eventBus.emit('auth:login', { success: result });
      return result;
    } catch (error) {
      this.bridge.eventBus.emit('auth:login', { success: false, error });
      return false;
    }
  }
  
  logout(): void {
    this.authStore.logout();
    this.bridge.eventBus.emit('auth:logout', {});
  }
  
  getToken(): string | null {
    return this.authStore.token;
  }
  
  isAuthenticated(): boolean {
    return this.authStore.isAuthenticated;
  }
  
  getUser(): any {
    return this.authStore.user;
  }
  
  hasRole(role: string): boolean {
    return this.authStore.hasRole(role);
  }
}
```

### Event-API

API für Event-basierte Kommunikation:

```typescript
// Beispiel für Event-API
interface EventSubscription {
  unsubscribe(): void;
}

interface EventOptions {
  once?: boolean;
  priority?: number;
  timeout?: number;
}

class EnhancedEventBus {
  private listeners: Map<string, Array<{ 
    callback: Function; 
    options: EventOptions;
    id: string;
  }>> = new Map();
  
  private batchingEnabled = true;
  private batchSize = 10;
  private batchDelay = 50; // ms
  private batchQueue: Map<string, { data: any[]; timer: number | null }> = new Map();
  
  emit(eventName: string, data: any): void {
    if (!this.batchingEnabled) {
      this.triggerEvent(eventName, data);
      return;
    }
    
    if (!this.batchQueue.has(eventName)) {
      this.batchQueue.set(eventName, { data: [], timer: null });
    }
    
    const batch = this.batchQueue.get(eventName)!;
    batch.data.push(data);
    
    if (batch.data.length >= this.batchSize) {
      // Sofort senden, wenn Batch-Größe erreicht
      this.flushEventBatch(eventName);
    } else if (batch.timer === null) {
      // Timer starten, wenn noch keiner läuft
      batch.timer = window.setTimeout(() => {
        this.flushEventBatch(eventName);
      }, this.batchDelay);
    }
  }
  
  private flushEventBatch(eventName: string): void {
    const batch = this.batchQueue.get(eventName);
    if (!batch) return;
    
    if (batch.timer !== null) {
      clearTimeout(batch.timer);
      batch.timer = null;
    }
    
    if (batch.data.length > 0) {
      this.triggerEvent(eventName, batch.data);
      batch.data = [];
    }
  }
  
  private triggerEvent(eventName: string, data: any): void {
    if (!this.listeners.has(eventName)) return;
    
    // Kopie der Listener-Liste erstellen, um Probleme bei Änderungen während der Iteration zu vermeiden
    const listeners = [...this.listeners.get(eventName)!]
      .sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));
    
    for (const listener of listeners) {
      try {
        // Bei Once-Option: Nach dem Aufruf entfernen
        if (listener.options.once) {
          this.off(eventName, listener.id);
        }
        
        // Bei Timeout-Option: Mit Timeout ausführen
        if (listener.options.timeout) {
          this.executeWithTimeout(listener.callback, data, listener.options.timeout);
        } else {
          listener.callback(data);
        }
      } catch (error) {
        console.error(`Fehler beim Ausführen des Listeners für ${eventName}:`, error);
      }
    }
  }
  
  private executeWithTimeout(callback: Function, data: any, timeout: number): void {
    let hasTimedOut = false;
    
    // Timer für Timeout starten
    const timeoutId = setTimeout(() => {
      hasTimedOut = true;
      console.warn(`Event-Listener-Ausführung hat das Timeout von ${timeout}ms überschritten`);
    }, timeout);
    
    try {
      // Callback ausführen
      callback(data);
    } finally {
      // Timer löschen, falls noch nicht abgelaufen
      if (!hasTimedOut) {
        clearTimeout(timeoutId);
      }
    }
  }
  
  on(eventName: string, callback: Function, options: EventOptions = {}): EventSubscription {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    
    const id = this.generateId();
    this.listeners.get(eventName)!.push({ callback, options, id });
    
    return {
      unsubscribe: () => this.off(eventName, id)
    };
  }
  
  off(eventName: string, id: string): void {
    if (!this.listeners.has(eventName)) return;
    
    const listeners = this.listeners.get(eventName)!;
    const index = listeners.findIndex(listener => listener.id === id);
    
    if (index !== -1) {
      listeners.splice(index, 1);
      
      // Leere Event-Liste entfernen
      if (listeners.length === 0) {
        this.listeners.delete(eventName);
      }
    }
  }
  
  // Einmalige Event-Registrierung
  once(eventName: string, callback: Function, options: Omit<EventOptions, 'once'> = {}): EventSubscription {
    return this.on(eventName, callback, { ...options, once: true });
  }
  
  // Mit Priorität registrieren (höhere Zahlen werden zuerst ausgeführt)
  priority(eventName: string, priority: number, callback: Function, options: Omit<EventOptions, 'priority'> = {}): EventSubscription {
    return this.on(eventName, callback, { ...options, priority });
  }
  
  // Alle Event-Listener löschen
  clear(): void {
    this.listeners.clear();
    
    // Alle ausstehenden Batches leeren
    this.batchQueue.forEach((batch, eventName) => {
      if (batch.timer !== null) {
        clearTimeout(batch.timer);
      }
    });
    this.batchQueue.clear();
  }
  
  // Hilfsmethode für die ID-Generierung
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
  
  // Konfigurationsmethoden
  
  enableBatching(enabled: boolean): void {
    this.batchingEnabled = enabled;
    
    // Alle ausstehenden Batches sofort senden, wenn Batching deaktiviert wird
    if (!enabled) {
      this.batchQueue.forEach((batch, eventName) => {
        this.flushEventBatch(eventName);
      });
    }
  }
  
  configureBatching(batchSize: number, batchDelay: number): void {
    this.batchSize = batchSize;
    this.batchDelay = batchDelay;
  }
}
```

## Integration mit bestehenden Komponenten

Die Integration der Bridge mit bestehenden Komponenten erfolgt durch:

1. **Vue-Plugin-Installation**: 
   ```typescript
   // main.ts
   import { createApp } from 'vue';
   import { createPinia } from 'pinia';
   import App from './App.vue';
   import { EnhancedBridge } from './bridge';
   
   const app = createApp(App);
   const pinia = createPinia();
   
   app.use(pinia);
   
   // Bridge als Plugin installieren
   const bridge = new EnhancedBridge({
     debugging: process.env.NODE_ENV !== 'production',
     logLevel: process.env.NODE_ENV !== 'production' ? LogLevel.DEBUG : LogLevel.INFO
   });
   
   app.provide('bridge', bridge);
   
   // Bridge globale API bereitstellen
   bridge.exposeGlobalAPI();
   
   app.mount('#app');
   ```

2. **Komposable für Vue-Komponenten**:
   ```typescript
   // composables/useBridge.ts
   import { inject } from 'vue';
   import type { EnhancedBridge } from '../bridge';
   
   export function useBridge() {
     const bridge = inject<EnhancedBridge>('bridge');
     
     if (!bridge) {
       throw new Error('Bridge nicht gefunden. Wurde sie als Plugin installiert?');
     }
     
     return bridge;
   }
   ```

3. **Integration mit Legacy-Code**:
   ```javascript
   // legacy-integration.js
   document.addEventListener('DOMContentLoaded', () => {
     // Auf Bridge-Initialisierung warten
     if (window.nscaleBridge) {
       initializeLegacyApp();
     } else {
       window.addEventListener('nscale-bridge-ready', initializeLegacyApp);
     }
   });
   
   function initializeLegacyApp() {
     const bridge = window.nscaleBridge;
     
     // Legacy-App mit Bridge verbinden
     bridge.on('auth:changed', (data) => {
       // Legacy-Code-Aktualisierung
       updateLegacyAuthUI(data);
     });
     
     // Legacy-Events zu Bridge verbinden
     document.getElementById('legacyButton').addEventListener('click', () => {
       bridge.emit('legacy:buttonClicked', { timestamp: new Date() });
     });
     
     console.log('Legacy-Anwendung mit Bridge verbunden');
   }
   ```

## Testfälle und Validierung

Hier sind einige Testfälle zur Validierung der Bridge-Funktionalität:

```typescript
// Beispiel für Testfälle
describe('EnhancedBridge', () => {
  let bridge;
  let mockVueStore;
  let mockLegacyState;
  
  beforeEach(() => {
    // Mock-Stores einrichten
    mockVueStore = {
      auth: {
        user: { id: 1, name: 'Test User' },
        isAuthenticated: true,
        token: 'test-token'
      }
    };
    
    mockLegacyState = {
      auth: {
        user: null,
        isAuthenticated: false,
        token: null
      }
    };
    
    // Bridge mit Test-Konfiguration einrichten
    bridge = new EnhancedBridge({
      debugging: true,
      logLevel: LogLevel.DEBUG
    });
  });
  
  test('Synchronisiert Zustand von Vue zu Legacy', () => {
    bridge.connect(mockVueStore, mockLegacyState);
    
    // Änderung im Vue-Store
    mockVueStore.auth.isAuthenticated = false;
    
    // Timeout für asynchrone Aktualisierung
    setTimeout(() => {
      expect(mockLegacyState.auth.isAuthenticated).toBe(false);
    }, 100);
  });
  
  test('Synchronisiert Zustand von Legacy zu Vue', () => {
    bridge.connect(mockVueStore, mockLegacyState);
    
    // Änderung im Legacy-State
    mockLegacyState.auth.token = 'new-token';
    bridge.emit('legacy:stateChanged', { path: 'auth.token', value: 'new-token' });
    
    // Timeout für asynchrone Aktualisierung
    setTimeout(() => {
      expect(mockVueStore.auth.token).toBe('new-token');
    }, 100);
  });
  
  test('Behandelt tief verschachtelte Objekte korrekt', () => {
    mockVueStore.user = {
      profile: {
        address: {
          city: 'Berlin',
          country: 'Germany'
        }
      }
    };
    
    mockLegacyState.user = {
      profile: {
        address: {
          city: '',
          country: ''
        }
      }
    };
    
    bridge.connect(mockVueStore, mockLegacyState);
    
    // Tief verschachtelte Änderung
    mockVueStore.user.profile.address.city = 'Munich';
    
    // Timeout für asynchrone Aktualisierung
    setTimeout(() => {
      expect(mockLegacyState.user.profile.address.city).toBe('Munich');
    }, 100);
  });
  
  test('Event-Batching funktioniert korrekt', () => {
    const mockCallback = jest.fn();
    bridge.on('testEvent', mockCallback);
    
    // Mehrere Events in kurzer Zeit
    for (let i = 0; i < 10; i++) {
      bridge.emit('testEvent', { index: i });
    }
    
    // Sollte alle Events als Batch erhalten
    setTimeout(() => {
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback.mock.calls[0][0].length).toBe(10);
    }, 100);
  });
  
  test('Fehlerbehandlung bei ungültigen Updates', () => {
    bridge.connect(mockVueStore, mockLegacyState);
    
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Ungültigen Wert setzen
    mockLegacyState.auth = null; // Sollte einen Fehler verursachen
    
    // Fehler sollte protokolliert werden
    expect(errorSpy).toHaveBeenCalled();
    
    // Store sollte intakt bleiben
    expect(mockVueStore.auth).not.toBeNull();
  });
  
  test('Selbstheilungsmechanismus funktioniert', async () => {
    bridge.connect(mockVueStore, mockLegacyState);
    
    // Beschädigung simulieren
    bridge.eventBus.listeners = null; // Absichtlich beschädigter interner Zustand
    
    // Gesundheitsprüfung sollte fehlschlagen
    expect(await bridge.selfHealing.performHealthCheck()).toBe(false);
    
    // Wiederherstellung sollte gestartet sein
    expect(bridge.statusManager.getStatus().state).toBe(BridgeErrorState.DEGRADED_PERFORMANCE);
    
    // Nach einiger Zeit sollte die Wiederherstellung abgeschlossen sein
    setTimeout(async () => {
      expect(await bridge.selfHealing.performHealthCheck()).toBe(true);
      expect(bridge.statusManager.getStatus().state).toBe(BridgeErrorState.HEALTHY);
    }, 200);
  });
});
```

## Edge Cases und Lösungsansätze

Die Bridge muss verschiedene problematische Szenarien behandeln:

1. **Zirkuläre Abhängigkeiten**:
   - **Problem**: Store A ändert Store B, der wieder Store A ändert, was zu einer Endlosschleife führt.
   - **Lösung**: Änderungsquelle verfolgen und bei Erkennung einer Zirkularität die Schleife unterbrechen.

2. **Inkonsistente Typen**:
   - **Problem**: Der Legacy-Code erwartet String, bekommt aber Number.
   - **Lösung**: Runtime-Typkonvertierung und -Validierung implementieren.

3. **Fehlerhafte Event-Listener**:
   - **Problem**: Ein Event-Listener wirft eine Ausnahme, die andere Listener blockiert.
   - **Lösung**: Jeder Listener wird in einem eigenen Try-Catch-Block ausgeführt, um die Event-Verarbeitung fortzusetzen.

4. **Speicherlecks**:
   - **Problem**: Nicht entfernte Event-Listener führen zu Speicherlecks.
   - **Lösung**: Automatisches Abonnement-Tracking und -Bereinigung bei Komponentenzerstörung.

5. **Asynchrone Zustandsänderungen**:
   - **Problem**: Race-Conditions bei asynchronen Aktualisierungen.
   - **Lösung**: Versionierung von Zustandsänderungen und Auflösung von Konflikten mit Zeitstempeln.

## Beispiel-Implementation

Eine Beispielimplementierung der Bridge-Verwendung in einer Komponente:

```vue
<!-- BridgeExample.vue -->
<template>
  <div class="bridge-example">
    <h2>Bridge-Beispiel</h2>
    
    <div class="status-indicator" :class="bridgeStatus.state">
      Bridge-Status: {{ bridgeStatusText }}
    </div>
    
    <!-- Vue-Store-gesteuertes Element -->
    <div class="user-info" v-if="authStore.isAuthenticated">
      Angemeldet als: {{ authStore.user?.name }}
      <button @click="logout">Abmelden</button>
    </div>
    <div v-else>
      <button @click="login">Anmelden</button>
    </div>
    
    <!-- Legacy-Event-Trigger -->
    <button @click="triggerLegacyEvent">Legacy-Event auslösen</button>
    
    <!-- Bridge-Events anzeigen -->
    <div class="events-log">
      <h3>Event-Log</h3>
      <ul>
        <li v-for="(event, index) in events" :key="index">
          {{ event.time }} - {{ event.name }}: {{ JSON.stringify(event.data) }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useBridge } from '@/composables/useBridge';
import { BridgeErrorState } from '@/types/bridge';

const authStore = useAuthStore();
const bridge = useBridge();
const events = ref<{ time: string; name: string; data: any }[]>([]);
const bridgeStatus = ref(bridge.getStatus());

// Status-Text berechnen
const bridgeStatusText = computed(() => {
  switch (bridgeStatus.value.state) {
    case BridgeErrorState.HEALTHY:
      return 'Gesund';
    case BridgeErrorState.DEGRADED_PERFORMANCE:
      return 'Eingeschränkte Leistung';
    case BridgeErrorState.SYNC_ERROR:
      return 'Synchronisierungsfehler';
    case BridgeErrorState.COMMUNICATION_ERROR:
      return 'Kommunikationsfehler';
    case BridgeErrorState.CRITICAL_FAILURE:
      return 'Kritischer Fehler';
    default:
      return 'Unbekannt';
  }
});

// Login-Funktion
async function login() {
  try {
    await authStore.login({ email: 'demo@example.com', password: 'password' });
  } catch (error) {
    console.error('Login fehlgeschlagen:', error);
  }
}

// Logout-Funktion
function logout() {
  authStore.logout();
}

// Legacy-Event auslösen
function triggerLegacyEvent() {
  bridge.emit('example:action', { 
    action: 'buttonClicked', 
    timestamp: new Date().toISOString()
  });
  
  addEvent('example:action', { action: 'buttonClicked' });
}

// Event zum Log hinzufügen
function addEvent(name: string, data: any) {
  const time = new Date().toLocaleTimeString();
  events.value.push({ time, name, data });
  
  // Log-Größe begrenzen
  if (events.value.length > 10) {
    events.value.shift();
  }
}

// Cleanup-Funktionen
const cleanupFunctions: Array<() => void> = [];

onMounted(() => {
  // Status-Updates abonnieren
  const statusUnsubscribe = bridge.statusManager.onStatusChanged((status) => {
    bridgeStatus.value = status;
  });
  cleanupFunctions.push(statusUnsubscribe);
  
  // Verschiedene Events abonnieren
  const authChangeUnsubscribe = bridge.on('auth:changed', (data) => {
    addEvent('auth:changed', data);
  });
  cleanupFunctions.push(authChangeUnsubscribe.unsubscribe);
  
  const sessionChangeUnsubscribe = bridge.on('session:changed', (data) => {
    addEvent('session:changed', data);
  });
  cleanupFunctions.push(sessionChangeUnsubscribe.unsubscribe);
  
  // Legacy-Events abonnieren
  const legacyEventUnsubscribe = bridge.on('legacy:event', (data) => {
    addEvent('legacy:event', data);
  });
  cleanupFunctions.push(legacyEventUnsubscribe.unsubscribe);
});

onBeforeUnmount(() => {
  // Alle Event-Listener bereinigen
  cleanupFunctions.forEach(cleanup => cleanup());
});
</script>

<style scoped>
.bridge-example {
  border: 1px solid #ddd;
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 4px;
}

.status-indicator {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  margin-bottom: 1rem;
  border-radius: 4px;
}

.status-indicator.HEALTHY {
  background-color: #d4edda;
  color: #155724;
}

.status-indicator.DEGRADED_PERFORMANCE {
  background-color: #fff3cd;
  color: #856404;
}

.status-indicator.SYNC_ERROR,
.status-indicator.COMMUNICATION_ERROR {
  background-color: #f8d7da;
  color: #721c24;
}

.status-indicator.CRITICAL_FAILURE {
  background-color: #dc3545;
  color: white;
  font-weight: bold;
}

.events-log {
  margin-top: 1rem;
  border-top: 1px solid #ddd;
  padding-top: 1rem;
  max-height: 200px;
  overflow-y: auto;
}

.events-log ul {
  padding-left: 1rem;
}

.events-log li {
  margin-bottom: 0.5rem;
  font-family: monospace;
}
</style>
```

Die Bridge-Implementierung bietet eine robuste, performante und typsichere Integration zwischen Vanilla-JavaScript- und Vue 3-Komponenten. Durch die Kombination von tiefer Zustandsüberwachung, effizienter Event-Verarbeitung und umfassenden Fehlerbehandlungsmechanismen sorgt sie für eine zuverlässige Kommunikation zwischen beiden Welten während der schrittweisen Migration der Anwendung.