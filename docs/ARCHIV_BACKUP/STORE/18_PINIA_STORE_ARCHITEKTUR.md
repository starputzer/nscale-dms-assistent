# Pinia Store Architektur für den nscale DMS Assistenten

## Inhaltsverzeichnis
1. [Einführung](#einführung)
2. [Überblick der Store-Architektur](#überblick-der-store-architektur)
3. [Core-Stores](#core-stores)
   - [Auth-Store](#auth-store)
   - [Sessions-Store](#sessions-store)
   - [UI-Store](#ui-store)
   - [Feature-Toggles-Store](#feature-toggles-store)
   - [Settings-Store](#settings-store)
4. [Feature-spezifische Stores](#feature-spezifische-stores)
   - [Document-Converter-Store](#document-converter-store)
   - [Monitoring-Store](#monitoring-store)
5. [Admin-Module Stores](#admin-module-stores)
   - [Users-Store](#users-store)
   - [Feedback-Store](#feedback-store)
   - [MOTD-Store](#motd-store)
   - [System-Store](#system-store)
6. [Store-Komposition-Muster](#store-komposition-muster)
   - [Store-Komposition vs. Vererbung](#store-komposition-vs-vererbung)
   - [Verwendung von Store-Factories](#verwendung-von-store-factories)
   - [Cross-Store-Zugriffsmuster](#cross-store-zugriffsmuster)
7. [Reaktivität und Performance-Optimierungen](#reaktivität-und-performance-optimierungen)
   - [Effiziente Computed-Properties](#effiziente-computed-properties)
   - [Getters und selektive Re-Renderings](#getters-und-selektive-re-renderings)
   - [Lazy Loading von Stores](#lazy-loading-von-stores)
8. [Persistenz-Strategien](#persistenz-strategien)
   - [Local Storage Integration](#local-storage-integration)
   - [Selective Persistence](#selective-persistence)
   - [Session-Daten-Management](#session-daten-management)
9. [Migration vom Legacy-System](#migration-vom-legacy-system)
   - [Bridge-System für Legacy-Kompatibilität](#bridge-system-für-legacy-kompatibilität)
   - [Migrationsstrategien für Store-Daten](#migrationsstrategien-für-store-daten)
10. [Type-Safety und TypeScript-Integration](#type-safety-und-typescript-integration)
    - [Typdefinitionen für Stores](#typdefinitionen-für-stores)
    - [Generische Store-Muster](#generische-store-muster)
11. [Best Practices](#best-practices)
    - [Namenskonventionen](#namenskonventionen)
    - [Store-Organisation](#store-organisation)
    - [Fehlerbehandlung](#fehlerbehandlung)
12. [Beispiel-Implementierungen](#beispiel-implementierungen)
    - [Setup-Funktion vs. Options-API](#setup-funktion-vs-options-api)
    - [Optimistic Updates](#optimistic-updates)
    - [Server-Synchronisation](#server-synchronisation)

## Einführung

Die Pinia Store Architektur für den nscale DMS Assistenten wurde entwickelt, um den Übergang von Vanilla JS zu Vue 3 optimal zu unterstützen. Diese Architektur bietet ein modulares, typensicheres und performantes State-Management-System, das sowohl die bestehenden Legacy-Funktionen unterstützt als auch die Einführung neuer Features in Vue 3 Single File Components (SFCs) ermöglicht.

Die Kernprinzipien dieser Architektur sind:

- **Modulare Struktur**: Stores sind in logische Einheiten organisiert, was die Wartbarkeit und Skalierbarkeit verbessert
- **Kompositionsfähigkeit**: Verwendung der Composition API für maximale Flexibilität und Wiederverwendbarkeit
- **Typsicherheit**: Vollständige TypeScript-Integration für bessere Entwicklererfahrung und Fehlerminimierung
- **Bridge-Integrationen**: Nahtlose Kommunikation zwischen Legacy-Code und modernen Vue 3-Komponenten
- **Optimierte Performance**: Implementierung fortschrittlicher Muster für effiziente State-Verwaltung
- **Robuste Fehlerbehandlung**: Umfassende Strategien zur Fehlerbehandlung und Wiederherstellung

Diese Architektur bildet das Rückgrat der Vue 3-Migration und ermöglicht eine phasenweise Einführung neuer Komponenten mit minimalem Risiko.

## Überblick der Store-Architektur

Die Pinia Store Architektur des nscale DMS Assistenten folgt einem modularen Aufbau mit klaren Verantwortlichkeiten:

```
src/
├── stores/
│   ├── index.ts                 # Store-Haupteinstiegspunkt mit Pinia-Setup
│   ├── auth.ts                  # Authentifizierungs-Store
│   ├── sessions.ts              # Session- und Nachrichtenmanagement
│   ├── ui.ts                    # UI-Zustände und -Interaktionen
│   ├── featureToggles.ts        # Feature-Flag-Management
│   ├── settings.ts              # Benutzereinstellungen
│   ├── documentConverter.ts     # Dokumentenkonverter-Funktionalität
│   ├── monitoringStore.ts       # System-Monitoring und Telemetrie
│   ├── admin/
│   │   ├── users.ts             # Benutzerverwaltung
│   │   ├── feedback.ts          # Feedback-Management
│   │   ├── motd.ts              # Message-of-the-Day
│   │   └── system.ts            # Systemeinstellungen und -informationen
│   └── composables/             # Gemeinsame Store-Funktionen
│       ├── useOptimisticUpdates.ts
│       ├── useAsyncActions.ts
│       └── usePersistence.ts
└── bridge/                     # Bridge-System für Legacy-Integration
    ├── index.ts                # Haupt-Bridge-Export
    ├── setup.ts                # Bridge-Konfiguration
    ├── sessionBridge.ts        # Session-spezifische Bridge
    ├── storeBridge.ts          # Store-Integration für Legacy-Code
    └── enhanced/               # Erweiterte Bridge-Funktionalitäten
        ├── bridgeCore.ts        # Kernimplementierung der Enhanced Bridge
        ├── eventBus.ts          # Event-Management
        ├── stateManager.ts      # State-Synchronisation
        ├── selfHealing.ts       # Selbstheilungsmechanismen
        └── types.ts             # Typdefinitionen
```

Die Store-Architektur folgt einem hierarchischen Aufbau mit drei Hauptkategorien:

1. **Core-Stores**: Fundamentale Stores für Basisfunktionalität
2. **Feature-spezifische Stores**: Stores für bestimmte Anwendungsbereiche
3. **Admin-Module Stores**: Spezielle Stores für Administrationsfunktionen

Das zentrale Verbindungsstück zwischen Legacy-Code und dem modernen Pinia-System ist das Bridge-System, das eine bidirektionale Kommunikation ermöglicht.

## Core-Stores

Die Core-Stores bilden das Fundament der Anwendung und verwalten grundlegende Zustände, die von mehreren Komponenten benötigt werden.

### Auth-Store

Der Auth-Store (`auth.ts`) ist verantwortlich für Authentifizierung, Autorisierung und Benutzerverwaltung.

**Hauptmerkmale:**
- JWT-Token-Management mit automatischer Aktualisierung
- Rollenbasierte Zugriffskontrolle
- Nahtlose Migration von Legacy-Authentifizierungsdaten
- Integrierte Fehlerbehandlung für Netzwerkprobleme
- Optimierte Persistenz für Benutzerinformationen

**UML-Klassendiagramm:**

```
+---------------------+
|     useAuthStore    |
+---------------------+
| State:              |
|  - user: User       |
|  - token: string    |
|  - refreshToken: str|
|  - expiresAt: number|
|  - isLoading: bool  |
|  - error: string    |
+---------------------+
| Getters:            |
|  - isAuthenticated  |
|  - isAdmin          |
|  - isExpired        |
|  - tokenExpiresIn   |
+---------------------+
| Actions:            |
|  - login()          |
|  - logout()         |
|  - hasRole()        |
|  - refreshToken()   |
|  - refreshUserInfo()|
+---------------------+
```

**Typische Verwendung:**
```typescript
const authStore = useAuthStore();

// Login-Prozess
const success = await authStore.login({
  email: 'benutzer@example.com',
  password: 'passwort'
});

// Zugriffskontrolle
if (authStore.isAuthenticated && authStore.hasRole('admin')) {
  // Admin-spezifische Funktionalität
}

// Abmelden
authStore.logout();
```

### Sessions-Store

Der Sessions-Store (`sessions.ts`) verwaltet Chat-Sessions und den Nachrichtenaustausch mit dem Server.

**Hauptmerkmale:**
- Verwaltung mehrerer Chat-Sessions
- Optimiertes Streaming-Nachrichtenmanagement
- Fortschrittstracking für lange Antworten
- Intelligentes Caching für großvolumige Daten
- Automatische Synchronisation mit dem Server

**UML-Klassendiagramm:**

```
+----------------------+
|   useSessionsStore   |
+----------------------+
| State:               |
|  - sessions[]        |
|  - currentSessionId  |
|  - messages{}        |
|  - streaming         |
|  - isLoading         |
|  - error             |
|  - pendingMessages   |
+----------------------+
| Getters:             |
|  - currentSession    |
|  - currentMessages   |
|  - sortedSessions    |
|  - isStreaming       |
|  - allCurrentMessages|
+----------------------+
| Actions:             |
|  - createSession()   |
|  - setCurrentSession()|
|  - sendMessage()     |
|  - cancelStreaming() |
|  - archiveSession()  |
|  - exportData()      |
+----------------------+
```

**Optimierte Speicherverwaltung:**
- Ältere Nachrichten werden in SessionStorage ausgelagert
- Nur aktive Sessions werden vollständig im State gehalten
- Pagination für lange Nachrichtenverläufe

**Server-Synchronisation:**
- Automatische Synchronisation bei Verbindungswiederherstellung
- Optimistische Updates für bessere Benutzererfahrung
- Konfliktlösung bei gleichzeitigen Änderungen

### UI-Store

Der UI-Store (`ui.ts`) verwaltet die Benutzeroberfläche und visuellen Zustände.

**Hauptmerkmale:**
- Theme-Management (Dark Mode/Light Mode)
- Reaktives Layout-Management
- Toast- und Benachrichtigungssystem
- Modal-Verwaltung
- Sidebar-Konfiguration

**UML-Klassendiagramm:**

```
+-------------------+
|    useUIStore     |
+-------------------+
| State:            |
|  - sidebar        |
|  - darkMode       |
|  - viewMode       |
|  - activeModals[] |
|  - toasts[]       |
|  - isLoading      |
|  - isMobile       |
|  - layoutConfig   |
+-------------------+
| Getters:          |
|  - isDarkMode     |
|  - sidebarIsOpen  |
|  - currentViewMode|
|  - hasActiveModals|
|  - cssVariables   |
+-------------------+
| Actions:          |
|  - toggleDarkMode()|
|  - toggleSidebar()|
|  - showToast()    |
|  - openModal()    |
|  - setLoading()   |
+-------------------+
```

**Performance-Optimierungen:**
- Batched UI-Updates für DOM-Operationen
- Lazy-Initialisierung von kostenintensiven UI-Ressourcen
- Effiziente CSS-Variable-Verwaltung

### Feature-Toggles-Store

Der Feature-Toggles-Store (`featureToggles.ts`) implementiert ein robustes Feature-Flag-System für die Migration.

**Hauptmerkmale:**
- Feingranulares Feature-Management
- Automatische Abhängigkeitsverwaltung zwischen Features
- Fallback-Mechanismen für fehlgeschlagene Features
- Rollenbasierte Feature-Zugriffssteuerung
- Fehlertracking und Wiederherstellung

**UML-Klassendiagramm:**

```
+-------------------------+
|  useFeatureTogglesStore |
+-------------------------+
| State:                  |
|  - piniaStoreToggles    |
|  - uiFeatureToggles     |
|  - sfcMigrationToggles  |
|  - errors{}             |
|  - activeFallbacks{}    |
+-------------------------+
| Getters:                |
|  - areAllStoresEnabled  |
|  - isLegacyModeActive   |
|  - areSfcFeaturesEnabled|
|  - getFeatureStatus()   |
|  - allFeatureConfigs    |
+-------------------------+
| Actions:                |
|  - toggleFeature()      |
|  - enableFeature()      |
|  - disableFeature()     |
|  - reportFeatureError() |
|  - setFallbackMode()    |
+-------------------------+
```

**Feature-Toggle-Struktur:**
- Klare Kategorisierung von Features (SFC-Migration, UI-Features, Core-Features)
- Intelligentes Abhängigkeitsmanagement
- Automatische Fehlerüberwachung und -meldung

### Settings-Store

Der Settings-Store verwaltet benutzerspezifische Einstellungen und Konfigurationen.

**Hauptmerkmale:**
- Verwaltung von Benutzereinstellungen
- Theme-Konfiguration
- Spracheinstellungen
- Darstellungsoptionen
- Persistente Speicherung von Konfigurationen

**UML-Klassendiagramm:**

```
+-------------------+
|  useSettingsStore |
+-------------------+
| State:            |
|  - fontSize       |
|  - language       |
|  - notifications  |
|  - currentTheme   |
|  - customSettings |
+-------------------+
| Getters:          |
|  - effectiveTheme |
|  - userPreferences|
+-------------------+
| Actions:          |
|  - setFontSize()  |
|  - setLanguage()  |
|  - setTheme()     |
|  - setSetting()   |
|  - resetSettings()|
+-------------------+
```

## Feature-spezifische Stores

Feature-spezifische Stores konzentrieren sich auf bestimmte Funktionsbereiche und kapseln deren Logik.

### Document-Converter-Store

Der Document-Converter-Store (`documentConverter.ts`) verwaltet den Zustand des Dokumentenkonverters.

**Hauptmerkmale:**
- Upload-Verwaltung und Fortschritts-Tracking
- Konvertierungsprozess-Management
- Ergebnisverwaltung und -anzeige
- Formatunterstützung und -validierung
- Fehlerbehandlung und Wiederherstellung

**UML-Klassendiagramm:**

```
+----------------------------+
|  useDocumentConverterStore |
+----------------------------+
| State:                     |
|  - uploadedFiles[]         |
|  - convertedDocuments[]    |
|  - conversionProgress      |
|  - conversionStep          |
|  - estimatedTimeRemaining  |
|  - isConverting            |
|  - error                   |
+----------------------------+
| Getters:                   |
|  - hasDocuments            |
|  - selectedDocument        |
|  - conversionStatus        |
|  - filteredDocuments()     |
|  - documentsByFormat       |
+----------------------------+
| Actions:                   |
|  - uploadDocument()        |
|  - convertDocument()       |
|  - cancelConversion()      |
|  - deleteDocument()        |
|  - setError()              |
+----------------------------+
```

**Optimistic Updates:**
```typescript
async uploadDocument(file: File): Promise<string | null> {
  try {
    this.isUploading = true;
    this.error = null;
    
    // Optimistic update: Sofort lokalen Status aktualisieren
    const uploadedFile: UploadedFile = {
      id: `temp-${Date.now()}`,
      file,
      progress: 0,
      uploadedAt: new Date()
    };
    
    this.uploadedFiles.push(uploadedFile);
    
    // Tatsächlichen API-Aufruf durchführen
    const documentId = await DocumentConverterService.uploadDocument(
      file,
      (progress: number) => {
        // Fortschritt aktualisieren
        const index = this.uploadedFiles.findIndex(f => f.id === uploadedFile.id);
        if (index !== -1) {
          this.uploadedFiles[index].progress = progress;
        }
      }
    );
    
    // Status mit finaler ID aktualisieren
    const index = this.uploadedFiles.findIndex(f => f.id === uploadedFile.id);
    if (index !== -1) {
      this.uploadedFiles[index].id = documentId;
    }
    
    // Erfolgreich konvertiertes Dokument hinzufügen
    this.convertedDocuments.unshift({
      id: documentId,
      originalName: file.name,
      originalFormat: file.name.split('.').pop()?.toLowerCase() || 'unknown',
      size: file.size,
      uploadedAt: new Date(),
      status: 'pending'
    });
    
    return documentId;
  } catch (err) {
    // Fehlerbehandlung
    this.setError('UPLOAD_FAILED', err);
    return null;
  } finally {
    this.isUploading = false;
  }
}
```

### Monitoring-Store

Der Monitoring-Store verwaltet System-Telemetrie und Leistungsüberwachung.

**Hauptmerkmale:**
- Erfassung und Aggregation von Fehlerberichten
- Performance-Metrik-Aufzeichnung
- Nutzungsstatistiken
- Dashboard-Daten für Administratoren

**UML-Klassendiagramm:**

```
+---------------------+
|  useMonitoringStore |
+---------------------+
| State:              |
|  - errors[]         |
|  - metrics{}        |
|  - usageStats{}     |
|  - systemHealth     |
+---------------------+
| Getters:            |
|  - errorRate        |
|  - recentErrors     |
|  - performanceTrend |
|  - systemStatus     |
+---------------------+
| Actions:            |
|  - reportError()    |
|  - trackMetric()    |
|  - recordUsage()    |
|  - generateReport() |
+---------------------+
```

## Admin-Module Stores

Admin-Module-Stores verwalten administrative Funktionen und sind in einem separaten `/admin`-Verzeichnis organisiert.

### Users-Store

Der Users-Store (`admin/users.ts`) verwaltet Benutzer für Administratoren.

**Hauptmerkmale:**
- Benutzer-CRUD-Operationen
- Rollenzuweisung und -verwaltung
- Paginierte Benutzerlisten
- Filterung und Sortierung

**UML-Klassendiagramm:**

```
+------------------+
|  useUsersStore   |
+------------------+
| State:           |
|  - users[]       |
|  - isLoading     |
|  - filter        |
|  - pagination    |
|  - selectedUser  |
+------------------+
| Getters:         |
|  - filteredUsers |
|  - userCount     |
|  - usersPerRole  |
+------------------+
| Actions:         |
|  - fetchUsers()  |
|  - createUser()  |
|  - updateUser()  |
|  - deleteUser()  |
|  - resetPassword()|
+------------------+
```

### Feedback-Store

Der Feedback-Store (`admin/feedback.ts`) verwaltet Benutzerfeedback.

**Hauptmerkmale:**
- Feedback-Sammlung und -Kategorisierung
- Sentiment-Analyse
- Statistikaggregation
- Export-Funktionalität

### MOTD-Store

Der MOTD-Store (`admin/motd.ts`) verwaltet "Message of the Day"-Nachrichten.

**Hauptmerkmale:**
- Nachrichtenverwaltung
- Zeitplanung und Aktivierung
- Zielgruppen-Targeting
- Vorschau-Funktionalität

### System-Store

Der System-Store (`admin/system.ts`) verwaltet Systemeinstellungen und Diagnose.

**Hauptmerkmale:**
- Systemkonfiguration
- Diagnoseberichte
- Speichernutzung
- Wartungsfunktionen

## Store-Komposition-Muster

Die Pinia-Architektur verwendet fortschrittliche Kompositionsmuster zur maximalen Wiederverwendbarkeit und Wartbarkeit.

### Store-Komposition vs. Vererbung

Anstelle von Vererbung setzt die Architektur auf Komposition für maximale Flexibilität.

**Beispiel einer Store-Komposition:**

```typescript
// Wiederverwendbare Store-Funktionalität
function useAsyncState() {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);
  
  async function withAsyncLoading<T>(asyncFn: () => Promise<T>): Promise<T> {
    isLoading.value = true;
    error.value = null;
    
    try {
      return await asyncFn();
    } catch (err) {
      error.value = err as Error;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  return {
    isLoading,
    error,
    withAsyncLoading
  };
}

// Verwendung in einem Store
export const useUserStore = defineStore('users', () => {
  const { isLoading, error, withAsyncLoading } = useAsyncState();
  const users = ref<User[]>([]);
  
  async function fetchUsers() {
    users.value = await withAsyncLoading(() => api.getUsers());
  }
  
  return {
    users,
    isLoading,
    error,
    fetchUsers
  };
});
```

### Verwendung von Store-Factories

Store-Factories ermöglichen die dynamische Erstellung von Stores mit gemeinsamer Grundfunktionalität.

```typescript
function createCrudStore<T>(
  name: string,
  apiService: ApiService<T>,
  options?: CrudStoreOptions
) {
  return defineStore(`${name}`, () => {
    const items = ref<T[]>([]);
    const isLoading = ref(false);
    const error = ref<Error | null>(null);
    
    async function fetchAll() {
      isLoading.value = true;
      try {
        items.value = await apiService.getAll();
      } catch (err) {
        error.value = err as Error;
      } finally {
        isLoading.value = false;
      }
    }
    
    async function create(item: Omit<T, 'id'>) {
      // Implementation
    }
    
    async function update(id: string, data: Partial<T>) {
      // Implementation
    }
    
    async function remove(id: string) {
      // Implementation
    }
    
    return {
      items,
      isLoading,
      error,
      fetchAll,
      create,
      update,
      remove
    };
  });
}

// Verwendung
export const useProductStore = createCrudStore<Product>(
  'products',
  productService
);
```

### Cross-Store-Zugriffsmuster

Die Store-Architektur ermöglicht saubere Cross-Store-Interaktionen.

```typescript
export const useUserSessionsStore = defineStore('userSessions', () => {
  const authStore = useAuthStore();
  const sessionsStore = useSessionsStore();
  
  // Getters für benutzerspezifische Daten
  const currentUserSessions = computed(() => {
    if (!authStore.isAuthenticated) return [];
    
    return sessionsStore.sessions.filter(
      session => session.userId === authStore.user?.id
    );
  });
  
  // Actions kombinieren Funktionalität aus mehreren Stores
  async function createSessionForCurrentUser(title: string) {
    if (!authStore.isAuthenticated) {
      throw new Error('User must be authenticated');
    }
    
    return await sessionsStore.createSession(title);
  }
  
  return {
    currentUserSessions,
    createSessionForCurrentUser
  };
});
```

## Reaktivität und Performance-Optimierungen

Die Store-Architektur implementiert fortschrittliche Performance-Optimierungen für maximale Effizienz.

### Effiziente Computed-Properties

Computed-Properties werden für optimale Reaktivität eingesetzt.

```typescript
// Optimierte computed property für gefilterte Dokumente
const filteredDocuments = computed(() => {
  return (filterType: string): ConversionResult[] => {
    if (!filterType) return state.convertedDocuments;
    
    // Memoization für häufig aufgerufene Filter
    const cacheKey = `filter:${filterType}`;
    if (filterCache.has(cacheKey)) {
      return filterCache.get(cacheKey)!;
    }
    
    let result: ConversionResult[];
    
    // Nach Format filtern (mit Indexierung für Geschwindigkeit)
    if (['pdf', 'docx', 'xlsx', 'pptx', 'html', 'txt'].includes(filterType)) {
      result = state.convertedDocuments.filter(
        doc => doc.originalFormat === filterType
      );
    } 
    // Nach Status filtern
    else if (['pending', 'processing', 'success', 'error'].includes(filterType)) {
      result = state.convertedDocuments.filter(
        doc => doc.status === filterType
      );
    } else {
      result = state.convertedDocuments;
    }
    
    // Ergebnis cachen
    filterCache.set(cacheKey, result);
    return result;
  };
});
```

### Getters und selektive Re-Renderings

Getters werden verwendet, um selektive Re-Renderings zu ermöglichen.

```typescript
// Optimierte Getter-Verwendung
const documentCounts = computed(() => {
  return {
    total: convertedDocuments.value.length,
    pending: convertedDocumentsStatus.value.pending.length,
    processing: convertedDocumentsStatus.value.processing.length,
    success: convertedDocumentsStatus.value.success.length,
    error: convertedDocumentsStatus.value.error.length
  };
});

// Index-basierte Suche für bessere Performance
const convertedDocumentsStatus = computed(() => {
  // Gruppieren nach Status für effiziente Abfragen
  const grouped = {
    pending: [] as ConversionResult[],
    processing: [] as ConversionResult[],
    success: [] as ConversionResult[],
    error: [] as ConversionResult[]
  };
  
  convertedDocuments.value.forEach(doc => {
    grouped[doc.status].push(doc);
  });
  
  return grouped;
});
```

### Lazy Loading von Stores

Stores werden bei Bedarf dynamisch geladen, um die initiale Ladezeit zu reduzieren.

```typescript
// Dynamisches Store-Import für Admin-Funktionen
export async function loadAdminStores() {
  const [
    { useUsersStore },
    { useFeedbackStore },
    { useMotdStore },
    { useSystemStore }
  ] = await Promise.all([
    import('./admin/users'),
    import('./admin/feedback'),
    import('./admin/motd'),
    import('./admin/system')
  ]);
  
  return {
    useUsersStore,
    useFeedbackStore,
    useMotdStore,
    useSystemStore
  };
}
```

## Persistenz-Strategien

Die Store-Architektur implementiert fortschrittliche Persistenz-Strategien.

### Local Storage Integration

Die Stores nutzen das Pinia Persistence Plugin mit spezifischen Anpassungen.

```typescript
// Persistenz-Konfiguration im Store
export const useAuthStore = defineStore('auth', () => {
  // Store-Implementation
}, {
  persist: {
    // Verwende localStorage für die Persistenz
    storage: localStorage,
    
    // Selektives Speichern bestimmter State-Elemente
    paths: ['token', 'refreshToken', 'user', 'expiresAt', 'version'],
    
    // Benutzerdefinierte Serialisierung für sensible Daten
    serializer: {
      deserialize: (value) => {
        // Deserialisierung mit Validierung
        try {
          const data = JSON.parse(value);
          // Datenvalidierung...
          return data;
        } catch (err) {
          console.error('Error deserializing auth data:', err);
          return {}; // Fallback zu leerem Objekt
        }
      },
      serialize: (state) => {
        // Sensible Daten ausschließen oder verschlüsseln
        const safeState = { ...state };
        delete safeState.sensitiveData;
        return JSON.stringify(safeState);
      }
    }
  }
});
```

### Selective Persistence

Unterschiedliche Persistenzstrategien für verschiedene Datentypen.

```typescript
export const useSessionsStore = defineStore('sessions', () => {
  // Store-Implementation
}, {
  // Store serialization options für Persistenz
  persist: {
    // Verwende localStorage für die Persistenz
    storage: localStorage,
    
    // Selektives Speichern bestimmter State-Elemente
    paths: [
      'sessions', 
      'currentSessionId', 
      'version',
      'pendingMessages',
      'syncStatus.lastSyncTime'
    ],
    
    // Optimierung für große Datasets
    serializer: {
      deserialize: (value) => {
        try {
          return JSON.parse(value);
        } catch (err) {
          console.error('Error deserializing store data:', err);
          return {};
        }
      },
      serialize: (state) => {
        try {
          // Optimierung: Speichere nur die Sitzungsmetadaten, nicht den vollständigen Nachrichtenverlauf
          // Nachrichten werden separat in sessionStorage gespeichert oder können nachgeladen werden
          const optimizedState = {
            ...state,
            // Nachrichten nicht persistieren, um Speicherplatz zu sparen
            messages: {},
          };
          return JSON.stringify(optimizedState);
        } catch (err) {
          console.error('Error serializing store data:', err);
          return '{}';
        }
      }
    }
  },
});
```

### Session-Daten-Management

Effiziente Verwaltung großer Datenmengen durch intelligente Auslagerungsstrategien.

```typescript
// Bereinigt den Storage, indem ältere Nachrichten ausgelagert werden
function cleanupStorage() {
  // Nachrichten-Limit pro Session
  const messageLimit = 50;
  
  // Für jede Session
  Object.keys(messages.value).forEach(sessionId => {
    const sessionMessages = messages.value[sessionId];
    
    // Wenn mehr Nachrichten als das Limit
    if (sessionMessages.length > messageLimit) {
      // Die neuesten Nachrichten behalten
      const recentMessages = sessionMessages.slice(-messageLimit);
      // Die älteren Nachrichten in den sessionStorage auslagern
      const olderMessages = sessionMessages.slice(0, -messageLimit);
      
      // Im localStorage nur die neuesten Nachrichten behalten
      messages.value[sessionId] = recentMessages;
      
      // Ältere Nachrichten in den sessionStorage verschieben
      try {
        const existingOlder = JSON.parse(sessionStorage.getItem(`session_${sessionId}_older_messages`) || '[]');
        sessionStorage.setItem(`session_${sessionId}_older_messages`, JSON.stringify([...existingOlder, ...olderMessages]));
      } catch (e) {
        console.error(`Error storing older messages for session ${sessionId}:`, e);
      }
    }
  });
}
```

## Migration vom Legacy-System

Die Store-Architektur unterstützt die schrittweise Migration vom Legacy-System.

### Bridge-System für Legacy-Kompatibilität

Das Bridge-System ermöglicht die nahtlose Kommunikation zwischen Legacy-Code und Vue 3 SFCs.

**Architektur des Bridge-Systems:**

```
+----------------+        +----------------+        +----------------+
|  Legacy Code   | <----> |    Bridge      | <----> |  Pinia Stores  |
+----------------+        +----------------+        +----------------+
     |                         |                         |
     |                         |                         |
     v                         v                         v
+----------------+        +----------------+        +----------------+
| Global Events  | <----> |  Event Bus     | <----> | Vue Components |
+----------------+        +----------------+        +----------------+
```

**Hauptkomponenten:**
1. **EventBus**: Zentrale Nachrichtenvermittlung
2. **StateManager**: Synchronisation von Zuständen
3. **API-Adapter**: Exposition von Store-Funktionen
4. **Selbstheilungsmechanismen**: Automatische Wiederherstellung bei Problemen

**Beispiel für Legacy-Integration:**

```typescript
// Bridge zur Bereitstellung von Pinia-Funktionen für Legacy-Code
export function setupBridge() {
  // Store-Referenzen
  const authStore = useAuthStore();
  const sessionsStore = useSessionsStore();
  const uiStore = useUIStore();
  
  // Globale Funktionen für Legacy-Code bereitstellen
  window.nscaleAuth = {
    login: async (email: string, password: string) => {
      return await authStore.login({ email, password });
    },
    logout: () => {
      authStore.logout();
    },
    getToken: () => {
      return authStore.token;
    },
    isAuthenticated: () => {
      return authStore.isAuthenticated;
    }
  };
  
  window.nscaleChat = {
    createSession: async (title?: string) => {
      return await sessionsStore.createSession(title || 'Neue Unterhaltung');
    },
    sendMessage: async (sessionId: string, content: string) => {
      return await sessionsStore.sendMessage({ sessionId, content });
    }
  };
  
  // Store-Änderungen beobachten und Legacy-Events auslösen
  watch(() => authStore.isAuthenticated, (isAuthenticated) => {
    window.dispatchEvent(new CustomEvent('nscale:auth', { 
      detail: { isAuthenticated } 
    }));
  });
}
```

### Migrationsstrategien für Store-Daten

Die Store-Architektur implementiert komplexe Datenmigrationsstrategien für einen reibungslosen Übergang.

**Migrations-Workflow:**

1. **Datenerkennung**: Identifizierung von Legacy-Daten im Storage
2. **Validierung**: Überprüfung der Datenintegrität
3. **Konvertierung**: Transformation in das neue Schema
4. **Integration**: Einspeisung in Pinia-Stores
5. **Verifizierung**: Validierung der Migration

**Beispiel für Datenmigration:**

```typescript
// Migration von Legacy-Daten
function migrateFromLegacyStorage() {
  try {
    // Legacy v1 Daten
    const legacyToken = localStorage.getItem('token');
    const legacyUser = localStorage.getItem('user');
    const legacyExpires = localStorage.getItem('token_expires');
    
    // Nur migrieren, wenn noch keine v2 Daten vorhanden sind
    if (legacyToken && !token.value) {
      token.value = legacyToken;
      
      if (legacyUser) {
        try {
          user.value = JSON.parse(legacyUser);
          
          // Stellen sicher, dass das User-Objekt die aktuellen Felder enthält
          if (!user.value.roles) {
            user.value.roles = user.value.role ? [user.value.role] : ['user'];
          }
        } catch (e) {
          console.error('Fehler beim Parsen der Legacy-Benutzerdaten', e);
        }
      }
      
      // Ablaufzeit setzen
      if (legacyExpires) {
        try {
          expiresAt.value = parseInt(legacyExpires, 10);
        } catch (e) {
          // Fallback: 24 Stunden ab jetzt
          expiresAt.value = Date.now() + 24 * 60 * 60 * 1000;
        }
      } else {
        // Fallback: 24 Stunden ab jetzt
        expiresAt.value = Date.now() + 24 * 60 * 60 * 1000;
      }
      
      console.log('Auth-Daten aus Legacy-Storage migriert');
    }
  } catch (error) {
    console.error('Fehler bei der Auth-Migration:', error);
  }
}
```

## Type-Safety und TypeScript-Integration

Die Store-Architektur ist vollständig mit TypeScript integriert für maximale Typsicherheit.

### Typdefinitionen für Stores

Umfangreiche Typdefinitionen für konsistente Datenstrukturen.

```typescript
// Typdefinitionen für den Auth-Store
export interface User {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  lastLogin?: string;
  settings?: UserSettings;
}

export type Role = 'admin' | 'user' | 'guest';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  isLoading: boolean;
  error: string | null;
}

// Typdefinitionen für Session-Store
export interface ChatSession {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
  isLocal?: boolean;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  status?: 'pending' | 'sent' | 'error';
  isStreaming?: boolean;
  metadata?: any;
}

export interface StreamingStatus {
  isActive: boolean;
  progress: number;
  currentSessionId: string | null;
}

export interface SendMessageParams {
  sessionId: string;
  content: string;
  role?: 'user' | 'assistant' | 'system';
}

export interface SessionsState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  messages: Record<string, ChatMessage[]>;
  streaming: StreamingStatus;
  isLoading: boolean;
  error: string | null;
}
```

### Generische Store-Muster

Verwendung von TypeScript-Generics für flexibles Code-Sharing.

```typescript
// Generische Paginierungsfunktion für beliebige Stores
interface PaginationState<T> {
  items: T[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
}

function usePagination<T>(
  fetchItems: (page: number, pageSize: number) => Promise<{ items: T[], total: number }>
) {
  const state = reactive<PaginationState<T>>({
    items: [],
    totalItems: 0,
    currentPage: 1,
    pageSize: 10,
    isLoading: false
  });
  
  const totalPages = computed(() => 
    Math.ceil(state.totalItems / state.pageSize)
  );
  
  async function loadPage(page: number) {
    state.isLoading = true;
    try {
      const { items, total } = await fetchItems(page, state.pageSize);
      state.items = items;
      state.totalItems = total;
      state.currentPage = page;
    } catch (error) {
      console.error('Error loading page:', error);
    } finally {
      state.isLoading = false;
    }
  }
  
  function setPageSize(size: number) {
    state.pageSize = size;
    loadPage(1); // Reset to first page
  }
  
  // Initial load
  loadPage(1);
  
  return {
    // State
    items: computed(() => state.items),
    currentPage: computed(() => state.currentPage),
    pageSize: computed(() => state.pageSize),
    totalItems: computed(() => state.totalItems),
    isLoading: computed(() => state.isLoading),
    
    // Computed
    totalPages,
    
    // Actions
    loadPage,
    setPageSize,
    nextPage: () => {
      if (state.currentPage < totalPages.value) {
        loadPage(state.currentPage + 1);
      }
    },
    prevPage: () => {
      if (state.currentPage > 1) {
        loadPage(state.currentPage - 1);
      }
    }
  };
}

// Verwendung im Store
export const useProductStore = defineStore('products', () => {
  const { items, currentPage, totalPages, isLoading, loadPage, nextPage, prevPage } = 
    usePagination<Product>((page, pageSize) => 
      api.getProducts({ page, pageSize })
    );
  
  // Store-spezifische Funktionalität hinzufügen
  return {
    // Pagination
    products: items,
    currentPage,
    totalPages,
    isLoading,
    loadPage,
    nextPage,
    prevPage,
    
    // Zusätzliche Funktionen
    // ...
  };
});
```

## Best Practices

Die folgenden Best Practices wurden für die Pinia-Store-Architektur etabliert.

### Namenskonventionen

Konsistente Namenskonventionen erleichtern die Wartung und Zusammenarbeit.

- **Store-Dateien**: Verwende Substantive im Singular (`auth.ts`, `user.ts`)
- **Store-Funktionen**: Verwende das Präfix `use` (`useAuthStore`, `useSessionsStore`)
- **Actions**:
  - Verwende Verben für Aktionen (`login`, `createSession`)
  - CRUD-Operationen mit eindeutigen Verben (`createUser`, `updateUser`, `deleteUser`)
  - Toggle-Aktionen mit `toggle`-Präfix (`toggleDarkMode`)
- **Getters**: Beschreibende Namen im Präsens (`isAuthenticated`, `currentSession`)
- **State-Properties**: Kurze, beschreibende Namen ohne Wiederholung des Store-Namens

### Store-Organisation

Klare Organisation der Stores für bessere Wartbarkeit.

- **Core-Stores** direkt im `stores/`-Verzeichnis
- **Feature-Stores** im `stores/`-Verzeichnis mit klaren Namen
- **Admin-Stores** im `stores/admin/`-Unterverzeichnis
- **Gemeinsame Funktionen** im `stores/composables/`-Verzeichnis
- **Typdefinitionen** in separaten Dateien im `types/`-Verzeichnis

### Fehlerbehandlung

Robuste Fehlerbehandlungsstrategien für zuverlässige Anwendungen.

```typescript
// Fehlerbehandlung in Store-Actions
async function login(credentials: LoginCredentials): Promise<boolean> {
  isLoading.value = true;
  error.value = null;
  
  try {
    const response = await axios.post('/api/auth/login', credentials);
    
    if (response.data.success) {
      token.value = response.data.token;
      refreshToken.value = response.data.refreshToken || null;
      user.value = response.data.user;
      expiresAt.value = Date.now() + (response.data.expiresIn || 24 * 60 * 60 * 1000);
      lastTokenRefresh.value = Date.now();
      
      // Wenn der Benutzer angemeldet ist, initialisieren wir den Token-Refresh-Mechanismus
      initialize();
      
      return true;
    } else {
      error.value = response.data.message || 'Login fehlgeschlagen';
      return false;
    }
  } catch (err: any) {
    const errorMessage = err.response?.data?.message || 'Netzwerkfehler beim Login';
    error.value = errorMessage;
    console.error('Login-Fehler:', errorMessage);
    return false;
  } finally {
    isLoading.value = false;
  }
}
```

## Beispiel-Implementierungen

### Setup-Funktion vs. Options-API

Die Store-Architektur unterstützt beide Ansätze, bevorzugt jedoch die Setup-Funktion für mehr Flexibilität.

**Setup-Funktion-Beispiel:**

```typescript
export const useUIStore = defineStore('ui', () => {
  // State
  const sidebar = ref<SidebarState>({
    isOpen: true,
    width: 280,
    activeTab: 'chat',
    collapsed: false
  });
  
  const darkMode = ref<boolean>(false);
  
  // Getters
  const isDarkMode = computed(() => darkMode.value);
  const sidebarIsOpen = computed(() => sidebar.value.isOpen && !sidebar.value.collapsed);
  
  // Actions
  function toggleDarkMode(): void {
    darkMode.value = !darkMode.value;
  }
  
  function openSidebar(): void {
    sidebar.value.isOpen = true;
    sidebar.value.collapsed = false;
  }
  
  return {
    // State
    sidebar,
    darkMode,
    
    // Getters
    isDarkMode,
    sidebarIsOpen,
    
    // Actions
    toggleDarkMode,
    openSidebar
  };
});
```

**Options-API-Beispiel:**

```typescript
export const useDocumentConverterStore = defineStore('documentConverter', {
  state: (): DocumentConverterState => ({
    uploadedFiles: [],
    convertedDocuments: [],
    conversionProgress: 0,
    // ...weiterer State
  }),
  
  getters: {
    hasDocuments: (state) => state.convertedDocuments.length > 0,
    selectedDocument: (state) => {
      if (!state.selectedDocumentId) return null;
      return state.convertedDocuments.find(
        doc => doc.id === state.selectedDocumentId
      ) || null;
    }
  },
  
  actions: {
    async uploadDocument(file: File): Promise<string | null> {
      // Implementation
    },
    
    async convertDocument(documentId: string, settings?: Partial<ConversionSettings>): Promise<boolean> {
      // Implementation
    }
  }
});
```

### Optimistic Updates

Optimistische Updates verbessern die Benutzererfahrung, indem sie lokale Änderungen sofort anzeigen.

```typescript
async updateSessionTitle(sessionId: string, newTitle: string): Promise<void> {
  if (!sessionId) return;
  
  // Alten Titel für Rollback merken
  const sessionIndex = sessions.value.findIndex(s => s.id === sessionId);
  const oldTitle = sessions.value[sessionIndex]?.title || '';
  
  // Optimistische Aktualisierung im lokalen State
  if (sessionIndex !== -1) {
    sessions.value[sessionIndex] = {
      ...sessions.value[sessionIndex],
      title: newTitle,
      updatedAt: new Date().toISOString()
    };
  }
  
  // Mit dem Server synchronisieren, wenn angemeldet
  if (authStore.isAuthenticated) {
    try {
      await axios.patch(`/api/sessions/${sessionId}`, { title: newTitle }, {
        headers: authStore.createAuthHeaders()
      });
    } catch (err: any) {
      console.error(`Error updating session title for ${sessionId}:`, err);
      error.value = err.response?.data?.message || 'Fehler beim Aktualisieren des Titels';
      
      // Bei Fehler lokale Änderung rückgängig machen
      if (sessionIndex !== -1) {
        sessions.value[sessionIndex] = {
          ...sessions.value[sessionIndex],
          title: oldTitle
        };
      }
    }
  }
}
```

### Server-Synchronisation

Intelligente Server-Synchronisation mit Offline-Support.

```typescript
async synchronizeSessions(): Promise<void> {
  if (!authStore.isAuthenticated || syncStatus.value.isSyncing) return;
  
  syncStatus.value.isSyncing = true;
  error.value = null;
  
  try {
    const response = await axios.get<ChatSession[]>('/api/sessions', {
      headers: authStore.createAuthHeaders(),
      params: {
        since: syncStatus.value.lastSyncTime
      }
    });
    
    // Server-Sessions mit dem lokalen Zustand zusammenführen
    const serverSessions = response.data;
    
    if (serverSessions.length > 0) {
      // Bestehende Sessions aktualisieren und neue hinzufügen
      serverSessions.forEach(serverSession => {
        const existingIndex = sessions.value.findIndex(s => s.id === serverSession.id);
        
        if (existingIndex !== -1) {
          // Aktualisieren, aber nur, wenn der Server eine neuere Version hat
          const localUpdatedAt = new Date(sessions.value[existingIndex].updatedAt).getTime();
          const serverUpdatedAt = new Date(serverSession.updatedAt).getTime();
          
          if (serverUpdatedAt > localUpdatedAt) {
            sessions.value[existingIndex] = {
              ...sessions.value[existingIndex],
              ...serverSession
            };
          }
        } else {
          // Neue Session hinzufügen
          sessions.value.push(serverSession);
        }
      });
      
      // Gelöschte Sessions entfernen (wenn sie auf dem Server nicht mehr existieren)
      // Aber lokale Sessions behalten
      const serverSessionIds = new Set(serverSessions.map(s => s.id));
      sessions.value = sessions.value.filter(s => 
        serverSessionIds.has(s.id) || s.isLocal === true
      );
    }
    
    syncStatus.value.lastSyncTime = Date.now();
    syncStatus.value.error = null;
  } catch (err: any) {
    console.error('Error synchronizing sessions:', err);
    syncStatus.value.error = err.response?.data?.message || 'Fehler bei der Synchronisation';
  } finally {
    syncStatus.value.isSyncing = false;
  }
}
```

## Zusammenfassung

Die Pinia Store Architektur des nscale DMS Assistenten bietet eine robuste, typensichere und performante Grundlage für die Vue 3-Migration. Durch die modulare Struktur, fortschrittliche Kompositionsmuster und nahtlose Bridge-Integration können Legacy-Code und Vue 3 SFCs effektiv zusammenarbeiten.

Die implementierten Best Practices, Optimierungstechniken und Fehlerbehandlungsstrategien sorgen für eine zuverlässige und wartbare Codebasis, die sowohl für Entwickler als auch für Benutzer Vorteile bietet.

Diese Architektur bildet das Rückgrat für eine erfolgreiche, risikoarme Migration von Vanilla JS zu Vue 3, während sie gleichzeitig die Grundlage für zukünftige Erweiterungen und Verbesserungen legt.