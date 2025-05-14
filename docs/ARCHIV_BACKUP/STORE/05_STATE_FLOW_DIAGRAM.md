# Zustandsfluss-Diagramm für nscale DMS Assistent

Dieses Dokument zeigt die Zustandsflüsse zwischen den verschiedenen Komponenten des State-Management-Systems.

## Store-Übersicht und Interaktion

```mermaid
graph TD
    subgraph "Store-Struktur"
        A[Pinia] --> B[Auth Store]
        A --> C[Sessions Store]
        A --> D[UI Store]
        A --> E[Settings Store]
        A --> F[Feature Toggles Store]
    end
    
    subgraph "Composables"
        G[useAuth] --> B
        H[useChat] --> C
        I[useUI] --> D
        J[useSettings] --> E
        K[useFeatureToggles] --> F
        L[useNScale] --> G
        L --> H
        L --> I
        L --> J
        L --> K
    end
    
    subgraph "Komponenten"
        M[Vue-Komponenten] --> L
        M --> G
        M --> H
        M --> I
        M --> J
    end
    
    subgraph "Legacy-Code"
        N[JavaScript-Code] --> O[Bridge]
        O --> B
        O --> C
        O --> D
        O --> E
        O --> F
    end
    
    subgraph "Persistenz"
        P[localStorage] <--> B
        P <--> C
        P <--> D
        P <--> E
        P <--> F
    end
```

## Auth Store Flussdiagramm

```mermaid
sequenceDiagram
    participant User as Benutzer
    participant Component as Vue-Komponente
    participant Composable as useAuth
    participant Store as Auth Store
    participant API as Backend-API
    participant Storage as localStorage
    
    User->>Component: Login-Daten eingeben
    Component->>Composable: login(credentials)
    Composable->>Store: login(credentials)
    Store->>API: POST /api/auth/login
    API-->>Store: Token & Benutzerdaten
    Store->>Store: Aktualisiere Zustand
    Store->>Storage: Speichere Token & Benutzerdaten
    Store-->>Composable: Erfolg/Fehler
    Composable-->>Component: Erfolg/Fehler
    Component-->>User: Anzeige Erfolg/Fehler
    
    note over Store,Storage: Automatische Persistenz durch<br/>Pinia Plugin
```

## Sessions Store Flussdiagramm

```mermaid
sequenceDiagram
    participant User as Benutzer
    participant Component as Chat-Komponente
    participant Composable as useChat
    participant Store as Sessions Store
    participant EventSource as SSE-Client
    participant API as Backend-API
    participant Storage as localStorage
    
    User->>Component: Nachricht senden
    Component->>Composable: sendMessage(sessionId, content)
    Composable->>Store: sendMessage({sessionId, content})
    Store->>Store: Erstelle Benutzer-Nachricht
    Store->>Store: Erstelle Platzhalter für Antwort
    Store->>EventSource: Verbindung herstellen
    EventSource->>API: EventSource-Verbindung
    API-->>EventSource: Streaming-Antwort (chunks)
    
    loop Für jedes Chunk
        EventSource-->>Store: Chunk-Daten
        Store->>Store: Aktualisiere Antwort
        Store-->>Component: Aktualisiere UI
        Component-->>User: Zeige schrittweise Antwort
    end
    
    EventSource-->>Store: Streaming abgeschlossen
    Store->>Store: Antwort finalisieren
    Store->>Storage: Session & Nachrichten speichern
    Store-->>Composable: Streaming abgeschlossen
    Composable-->>Component: UI aktualisieren
    Component-->>User: Vollständige Antwort anzeigen
```

## UI Store Flussdiagramm

```mermaid
sequenceDiagram
    participant User as Benutzer
    participant Component as UI-Komponente
    participant Composable as useUI
    participant Store as UI Store
    participant DOM as Document
    participant Storage as localStorage
    
    User->>Component: Dark Mode umschalten
    Component->>Composable: toggleDarkMode()
    Composable->>Store: toggleDarkMode()
    Store->>Store: Aktualisiere darkMode-Zustand
    Store->>DOM: CSS-Klassen aktualisieren
    Store->>Storage: Speichere Einstellung
    Store-->>Composable: Zustand aktualisiert
    Composable-->>Component: UI aktualisieren
    Component-->>User: Zeige Dark/Light Mode
    
    User->>Component: Toast-Aktion auslösen
    Component->>Composable: showToast(message, type)
    Composable->>Store: showToast(message, type)
    Store->>Store: Toast zur Liste hinzufügen
    Store-->>Component: Toast-ID zurückgeben
    Component-->>User: Toast anzeigen
    
    note over Store: Nach Timeout
    Store->>Store: Toast entfernen
    Store-->>Component: UI aktualisieren
    Component-->>User: Toast ausblenden
```

## Migrations-Flussdiagramm

```mermaid
sequenceDiagram
    participant App as Anwendungsstart
    participant Store as Pinia Store
    participant Legacy as Legacy-Storage
    participant Bridge as Legacy-Bridge
    participant Modern as Modernes localStorage
    
    App->>Store: Initialisierung
    Store->>Store: migrateFromLegacyStorage()
    Store->>Legacy: Prüfe Legacy-Daten
    Legacy-->>Store: Legacy-Daten vorhanden?
    
    alt Legacy-Daten vorhanden
        Store->>Store: Konvertiere Datenformat
        Store->>Modern: Speichere in modernem Format
        Store->>Legacy: Optional: Legacy-Daten löschen
    else Keine Legacy-Daten
        Store->>Modern: Prüfe moderne Daten
        Modern-->>Store: Lade moderne Daten
    end
    
    App->>Bridge: Initialisiere Bridge
    Bridge->>Bridge: exposeGlobalAPI()
    Bridge->>Bridge: setupStoreWatchers()
    Bridge->>Store: Verbinde mit Stores
    
    note over Bridge: Bei Legacy-JS-Aufruf
    Bridge->>Store: Zugriff auf Store-Methoden
    Store-->>Bridge: Ergebnisse
    Bridge-->>Legacy: Ergebnisse zurückgeben
```

## Komponenten-Datenfluss

```mermaid
graph TD
    subgraph "Komponenten-Hierarchie"
        A[App] --> B[Layout]
        B --> C[Sidebar]
        B --> D[Main Content]
        D --> E[Chat View]
        D --> F[Settings View]
        D --> G[Admin View]
    end
    
    subgraph "Store-Zugriff"
        C -.->|useUI| UI[UI Store]
        C -.->|useChat| Sessions[Sessions Store]
        E -.->|useChat| Sessions
        E -.->|useAuth| Auth[Auth Store]
        F -.->|useSettings| Settings[Settings Store]
        F -.->|useUI| UI
        G -.->|useAuth| Auth
        G -.->|useFeatureToggles| Features[Feature Toggles]
    end
    
    subgraph "Datenfluss"
        Auth -->|auth-state| A
        Auth -->|user-info| G
        Sessions -->|messages| E
        Sessions -->|session-list| C
        UI -->|dark-mode| B
        UI -->|sidebar-state| C
        Settings -->|theme| B
        Settings -->|preferences| F
        Features -->|enabled-features| A
    end
```

## Integration des Legacy-Codes

```mermaid
graph TD
    subgraph "Legacy JavaScript"
        A[index.js] --> B[chat.js]
        A --> C[admin.js]
        A --> D[settings.js]
    end
    
    subgraph "Bridge Layer"
        E[Bridge Setup] --> F[Global API]
        E --> G[Event Bus]
        F --> H[nscaleAuth]
        F --> I[nscaleChat]
        F --> J[nscaleUI]
        F --> K[nscaleSettings]
    end
    
    subgraph "Modern Stores"
        L[Auth Store] 
        M[Sessions Store]
        N[UI Store]
        O[Settings Store]
    end
    
    B --> I
    C --> H
    C --> J
    D --> K
    
    H --> L
    I --> M
    J --> N
    K --> O
    
    G -->|events| B
    G -->|events| C
    G -->|events| D
    
    L -->|state changes| G
    M -->|state changes| G
    N -->|state changes| G
    O -->|state changes| G
```

## Feature Toggle-Flussdiagramm

```mermaid
stateDiagram-v2
    [*] --> FeatureTogglesStore
    
    state FeatureTogglesStore {
        [*] --> CheckPersistence
        CheckPersistence --> CheckBuildFlags
        
        state CheckPersistence {
            [*] --> HasSavedToggles
            HasSavedToggles --> Yes: Lade gespeicherte Einstellungen
            HasSavedToggles --> No: Verwende Defaults
            Yes --> ConfigureFeatures
            No --> ConfigureFeatures
        }
        
        CheckBuildFlags --> EnableByEnv: VITE_ENABLE_FEATURES
        EnableByEnv --> ConfigureFeatures
        
        state ConfigureFeatures {
            [*] --> CoreFeatures
            CoreFeatures --> UIFeatures
            UIFeatures --> LegacySupport
            LegacySupport --> DevFeatures: Nur in dev-Umgebung
        }
    }
    
    FeatureTogglesStore --> UI: Steuert Komponenten-Rendering
    FeatureTogglesStore --> Bridge: Steuert Legacy-Integration
    FeatureTogglesStore --> Stores: Steuert Store-Nutzung
    
    state UI {
        ModernUI
        LegacyUI
    }
    
    state Bridge {
        Enabled: Legacy-Bridge aktiv
        Disabled: Nur moderne API verwenden
    }
    
    state Stores {
        PiniaStores: Verwende Pinia
        LegacyState: Verwende altes State-Management
    }
    
    UI --> RenderApp
    Bridge --> RenderApp
    Stores --> RenderApp
    
    RenderApp --> [*]
```