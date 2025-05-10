# UML-Diagramme für die verbesserte Bridge-Implementierung

## Klassendiagramm

```mermaid
classDiagram
    class EnhancedBridge {
        -BridgeConfiguration config
        -EnhancedBridgeLogger logger
        -EnhancedEventBus eventBus
        -EnhancedStateManager stateManager
        -BridgeStatusManager statusManager
        -SelfHealingBridge selfHealing
        -EfficientSerializer serializer
        +constructor(config?: Partial~BridgeConfiguration~)
        +connect(): void
        +disconnect(): void
        +exposeGlobalAPI(): BridgeAPI
        +getDiagnostics(): any
    }

    class EnhancedBridgeLogger {
        -LogLevel level
        -logs: Array
        -maxLogs: number
        +setLevel(level: LogLevel): void
        +debug(message: string, data?: any): void
        +info(message: string, data?: any): void
        +warn(message: string, data?: any): void
        +error(message: string, data?: any): void
        +getLogs(level?: LogLevel): any[]
        +clearLogs(): void
        -log(level: LogLevel, message: string, data?: any): void
        -emitErrorEvent(message: string, data?: any): void
    }

    class EnhancedEventBus {
        -listeners: Map
        -batchingEnabled: boolean
        -batchSize: number
        -batchDelay: number
        -batchQueue: Map
        +emit(eventName: string, data: any): void
        +on(eventName: string, callback: Function, options?: EventOptions): EventSubscription
        +off(eventName: string, subscriptionOrId: EventSubscription | string): void
        +once(eventName: string, callback: Function, options?: any): EventSubscription
        +priority(eventName: string, priority: number, callback: Function, options?: any): EventSubscription
        +clear(): void
        +isOperational(): boolean
        +reset(): void
        +getDiagnostics(): any
        -triggerEvent(eventName: string, data: any): void
        -flushEventBatch(eventName: string): void
        -executeWithTimeout(callback: Function, data: any, timeout: number): void
        -generateId(): string
        +enableBatching(enabled: boolean): void
        +configureBatching(batchSize: number, batchDelay: number): void
    }

    class EnhancedStateManager {
        -vueStores: Record~string, any~
        -legacyState: Record~string, any~
        -watchers: Array
        -atomicState: AtomicStateManager
        -conflictResolver: ConflictResolver
        -selectiveUpdates: SelectiveUpdateManager
        -subscribers: Map
        -healthStatus: boolean
        +connect(vueStores: Record~string, any~, legacyState: Record~string, any~): void
        +disconnect(): void
        +getState(path: string): any
        +setState(path: string, value: any, source?: 'legacy' | 'vue'): boolean
        +subscribe(path: string, callback: Function): () => void
        +isHealthy(): boolean
        +reset(): void
        +getDiagnostics(): any
        -setupDeepWatcher(source: any, basePath: string, sourceType: 'vue' | 'legacy'): () => void
        -createReactiveProxy(obj: any, path: string): any
        -handleStateChange(path: string, value: any, source: 'vue' | 'legacy'): void
        -updateLegacyState(path: string, value: any): void
        -updateVueStore(path: string, value: any): void
        -notifySubscribers(path: string): void
    }

    class BridgeStatusManager {
        -currentStatus: BridgeStatusInfo
        -statusListeners: Array
        +updateStatus(newStatus: Partial~BridgeStatusInfo~): void
        +incrementRecoveryAttempts(): void
        +getStatus(): BridgeStatusInfo
        +onStatusChanged(listener: Function): () => void
        -notifyListeners(): void
        -showUserNotification(): void
    }

    class SelfHealingBridge {
        -healthChecks: Array
        -recoveryStrategies: Array
        -isRecovering: boolean
        -checkIntervalId: number
        -healthCheckInterval: number
        +addHealthCheck(check: () => boolean): void
        +addRecoveryStrategy(strategy: () => Promise~boolean~): void
        +performHealthCheck(): Promise~boolean~
        +setHealthCheckInterval(interval: number): void
        +stopHealthChecks(): void
        -setupPeriodicHealthCheck(): void
        -attemptRecovery(): Promise~boolean~
    }

    class EfficientSerializer {
        -serializationCache: Map
        -deserializationCache: Map
        -cacheHits: number
        -cacheMisses: number
        -maxCacheSize: number
        +serialize(value: any): string
        +deserialize<T>(serialized: string): T
        +getStats(): object
        +clearCache(): void
        -objectHash(obj: any): string
    }

    class AtomicStateManager {
        -stateSnapshot: any
        -isTransactionActive: boolean
        +beginTransaction(state: any): void
        +commitTransaction(): void
        +rollbackTransaction(): any
        +isInTransaction(): boolean
    }

    class ConflictResolver {
        -pendingUpdates: UpdateOperation[]
        -lockTimeout: number
        -locked: boolean
        +applyUpdate(operation: UpdateOperation): Promise~boolean~
        -processPendingUpdates(): void
    }

    class SelectiveUpdateManager {
        -lastValues: Map
        -updateThreshold: number
        -pendingUpdates: Set
        -updateTimer: number
        +scheduleUpdate(path: string, value: any): void
        -processPendingUpdates(): void
        -optimizePaths(paths: string[]): string[]
    }

    class BridgePlugin {
        +install(app: App, config?: Partial~BridgeConfiguration~): void
    }

    EnhancedBridge *-- EnhancedBridgeLogger
    EnhancedBridge *-- EnhancedEventBus
    EnhancedBridge *-- EnhancedStateManager
    EnhancedBridge *-- BridgeStatusManager
    EnhancedBridge *-- SelfHealingBridge
    EnhancedBridge *-- EfficientSerializer
    EnhancedStateManager *-- AtomicStateManager
    EnhancedStateManager *-- ConflictResolver
    EnhancedStateManager *-- SelectiveUpdateManager
    BridgePlugin ..> EnhancedBridge
```

## Sequenzdiagramm: Bidirektionale Zustandssynchronisation

```mermaid
sequenceDiagram
    participant Vue as Vue-Komponente
    participant VueStore as Pinia Store
    participant Bridge as EnhancedBridge
    participant LegacyState as Legacy-State
    participant LegacyUI as Legacy-UI

    Note over Bridge: Bridge initialisiert und verbunden

    Vue->>VueStore: Aktualisierung des Zustands
    VueStore->>Bridge: Store-Watcher erkennt Änderung
    Bridge->>Bridge: Konflikterkennung überprüfen
    Bridge->>LegacyState: Zustand aktualisieren
    Bridge->>Bridge: Event "state:changed" auslösen
    Bridge->>LegacyUI: Event benachrichtigt Legacy-UI

    LegacyUI->>LegacyState: Aktualisierung des Zustands
    LegacyState->>Bridge: Proxy erkennt Änderung
    Bridge->>Bridge: Konflikterkennung überprüfen
    Bridge->>VueStore: Zustand aktualisieren
    Bridge->>Bridge: Event "state:changed" auslösen
    Bridge->>Vue: Event benachrichtigt Vue-Komponenten
```

## Sequenzdiagramm: Event-Batching

```mermaid
sequenceDiagram
    participant A as Komponente A
    participant B as Komponente B
    participant Bridge as EnhancedBridge
    participant EventBus as EnhancedEventBus
    participant Listener as Event-Listener

    A->>Bridge: emit("ui:update", data1)
    Bridge->>EventBus: Event in Queue hinzufügen
    EventBus->>EventBus: Batch für "ui:update" erstellen

    B->>Bridge: emit("ui:update", data2)
    Bridge->>EventBus: Event zur Queue hinzufügen
    EventBus->>EventBus: Event zum bestehenden Batch hinzufügen

    Note over EventBus: Batch-Intervall abgelaufen

    EventBus->>EventBus: Events im Batch zusammenfassen
    EventBus->>Listener: Ein Callback mit allen Events auslösen
```

## Sequenzdiagramm: Selbstheilungsmechanismus

```mermaid
sequenceDiagram
    participant Bridge as EnhancedBridge
    participant HealthCheck as SelfHealingBridge
    participant StateManager as EnhancedStateManager
    participant EventBus as EnhancedEventBus
    participant StatusManager as BridgeStatusManager

    Note over HealthCheck: Periodische Gesundheitsprüfung

    HealthCheck->>StateManager: isHealthy() aufrufen
    StateManager-->>HealthCheck: false (unhealthy)
    HealthCheck->>EventBus: isOperational() aufrufen
    EventBus-->>HealthCheck: true (healthy)
    
    HealthCheck->>StatusManager: Status auf DEGRADED_PERFORMANCE setzen
    
    HealthCheck->>HealthCheck: attemptRecovery() starten
    HealthCheck->>StateManager: reset() aufrufen
    StateManager-->>HealthCheck: Erfolg (true)
    
    HealthCheck->>StatusManager: Status auf HEALTHY setzen
    HealthCheck->>Bridge: Wiederherstellung erfolgreich
```

## Komponentendiagramm

```mermaid
graph TD
    subgraph "Enhanced Bridge"
        BridgeCore["BridgeCore\nHauptkoordinator"]
        Logger["BridgeLogger\nDiagnose-Logging"]
        EventBus["EventBus\nEvent-Handling mit Batching"]
        StateManager["StateManager\nZustandssynchronisation"]
        StatusManager["StatusManager\nFehlerzustände"]
        SelfHealing["SelfHealing\nAutomatische Wiederherstellung"]
        Serializer["Serializer\nEffiziente Datenverarbeitung"]
    end

    subgraph "Vue-Komponenten"
        VueComp["Vue-Komponenten"]
        VueStores["Pinia Stores"]
    end

    subgraph "Legacy-Code"
        LegacyComp["Legacy-Komponenten"]
        LegacyState["Legacy-Zustand"]
    end

    BridgeCore --> Logger
    BridgeCore --> EventBus
    BridgeCore --> StateManager
    BridgeCore --> StatusManager
    BridgeCore --> SelfHealing
    BridgeCore --> Serializer

    VueComp --> VueStores
    VueStores <--> BridgeCore
    BridgeCore <--> LegacyState
    LegacyState <--> LegacyComp

    %% Event-Flow
    EventBus --> VueComp
    EventBus --> LegacyComp
```

## Zustandsdiagramm: Bridge-Fehlerbehandlung

```mermaid
stateDiagram-v2
    [*] --> HEALTHY: Initialisierung
    
    HEALTHY --> DEGRADED_PERFORMANCE: Gesundheitsprüfung fehlgeschlagen
    DEGRADED_PERFORMANCE --> HEALTHY: Wiederherstellung erfolgreich
    
    DEGRADED_PERFORMANCE --> SYNC_ERROR: Zustandssynchronisation fehlgeschlagen
    SYNC_ERROR --> DEGRADED_PERFORMANCE: Teilweise Wiederherstellung
    
    DEGRADED_PERFORMANCE --> COMMUNICATION_ERROR: Event-Kommunikation fehlgeschlagen
    COMMUNICATION_ERROR --> DEGRADED_PERFORMANCE: EventBus zurückgesetzt
    
    SYNC_ERROR --> CRITICAL_FAILURE: Mehrere Wiederherstellungsversuche fehlgeschlagen
    COMMUNICATION_ERROR --> CRITICAL_FAILURE: Mehrere Wiederherstellungsversuche fehlgeschlagen
    
    CRITICAL_FAILURE --> [*]: Benutzerbenachrichtigung - Seite neuladen
```

## Aktivitätsdiagramm: Konfliktlösung

```mermaid
graph TD
    A[Zustandsänderung empfangen] --> B{Von welcher Quelle?}
    B -->|Vue| C[UpdateOperation mit Quelle 'vue' erstellen]
    B -->|Legacy| D[UpdateOperation mit Quelle 'legacy' erstellen]
    
    C --> E[ConflictResolver.applyUpdate aufrufen]
    D --> E
    
    E --> F{Bridge gesperrt?}
    F -->|Ja| G[Operation in Warteschlange]
    F -->|Nein| H[Bridge sperren]
    
    G --> Z[Rückgabe: false - wird später verarbeitet]
    
    H --> I{Konflikte mit gleichen Pfaden?}
    I -->|Ja| J[Neueste Operation als Gewinner bestimmen]
    I -->|Nein| K[Änderung direkt anwenden]
    
    J --> L[Gewinner anwenden]
    L --> M[Konflikte aus Warteschlange entfernen]
    
    K --> N[Quell-abhängige Aktualisierung]
    M --> N
    
    N --> O[Bridge entsperren]
    O --> P[Ausstehende Updates verarbeiten]
    
    P --> Z2[Rückgabe: true - Update angewendet]
```

## UML-Deploymentdiagramm

```mermaid
graph TD
    subgraph Browser
        subgraph VueApp["Vue3-Anwendung"]
            VueComponents["Vue-Komponenten"]
            PiniaStores["Pinia-Stores"]
            UseBridge["useBridge Composable"]
        end
        
        subgraph Legacy["Legacy-Code"]
            VanillaJS["Vanilla JavaScript"]
            LegacyEvents["Legacy-Events"]
            LegacyDOM["DOM-Manipulation"]
        end
        
        subgraph EnhancedBridge["Enhanced Bridge"]
            BridgeCore["BridgeCore"]
            EventSystem["Event-System mit Batching"]
            StateSync["Zustandssynchronisation"]
            HealthMonitor["Gesundheitsüberwachung"]
            ErrorHandling["Fehlerbehandlung"]
            Diagnostics["Diagnostik & Logging"]
        end
    end
    
    VueComponents <--> PiniaStores
    PiniaStores <--> UseBridge
    UseBridge <--> BridgeCore
    
    VanillaJS <--> LegacyEvents
    LegacyEvents <--> BridgeCore
    VanillaJS <--> LegacyDOM
    
    BridgeCore <--> EventSystem
    BridgeCore <--> StateSync
    BridgeCore <--> HealthMonitor
    BridgeCore <--> ErrorHandling
    BridgeCore <--> Diagnostics
    
    %% Performance-Optimierungen
    StateSync -->|"Selektive Updates"| PiniaStores
    StateSync -->|"Atomare Operationen"| VanillaJS
    EventSystem -->|"Event-Batching"| LegacyEvents
    EventSystem -->|"Event-Priorisierung"| VueComponents
```

Die UML-Diagramme geben einen umfassenden Überblick über die Architektur, die Interaktionen und den Datenfluss in der verbesserten Bridge-Implementierung. Sie dienen als visuelle Dokumentation für Entwickler, die mit der Bridge arbeiten oder sie erweitern möchten.