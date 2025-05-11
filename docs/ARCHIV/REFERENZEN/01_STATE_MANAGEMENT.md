# State Management mit Pinia

Dieses Dokument beschreibt die State-Management-Architektur des nscale DMS Assistenten, die auf Pinia basiert. Die Architektur ersetzt das bisherige System mit direkten reaktiven Referenzen und Prop-Passing durch einen zentralisierten, typensicheren State-Management-Ansatz.

**Letzte Aktualisierung:** 08.05.2025  
**Version:** 2.0.0

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Store-Struktur](#store-struktur)
3. [Optimierte Store-Implementierungen](#optimierte-store-implementierungen)
   - [Auth-Store](#auth-store)
   - [Sessions-Store](#sessions-store)
   - [UI-Store](#ui-store)
   - [Settings-Store](#settings-store)
   - [FeatureToggles-Store](#featuretoggles-store)
4. [Effiziente Persistenzstrategien](#effiziente-persistenzstrategien)
5. [Bridge-Mechanismen](#bridge-mechanismen)
6. [Composables](#composables)
7. [Integration in Komponenten](#integration-in-komponenten)
8. [Performance-Optimierungen](#performance-optimierungen)
9. [Fehlerbehandlung und Wiederherstellung](#fehlerbehandlung-und-wiederherstellung)
10. [Fehlerbehebung](#fehlerbehebung)

## Überblick

Der nscale DMS Assistent verwendet Pinia als State-Management-Lösung, um den Anwendungszustand zentral und typensicher zu verwalten. Die Architektur besteht aus folgenden Hauptkomponenten:

- **Stores**: Zentrale Zustandsspeicher für verschiedene Domänen der Anwendung
- **Composables**: Hooks für einfachen Zugriff auf Store-Funktionalität in Komponenten
- **Persistenz**: Optimierte Speicherung von Zuständen mit selektiver Speicherung
- **Legacy-Bridge**: Verbesserte Schnittstelle für nahtlose Integration des Legacy-Codes
- **Feature-Toggles**: Steuerung der schrittweisen Aktivierung neuer Features

> **Verwandte Dokumente:**
> - [API_INTEGRATION.md](../02_ENTWICKLUNG/03_API_INTEGRATION.md) - Details zur API-Integration
> - [KOMPONENTEN_LEITFADEN.md](../02_ENTWICKLUNG/02_KOMPONENTEN_LEITFADEN.md) - Verwendung von Stores in Komponenten
> - [SETUP.md](../02_ENTWICKLUNG/01_SETUP.md) - Entwicklungsumgebung einrichten

## Store-Struktur

```
src/
├── stores/
│   ├── index.ts                # Pinia-Konfiguration
│   ├── auth.ts                 # Authentifizierung & Benutzer
│   ├── sessions.ts             # Chat-Sessions & Nachrichten
│   ├── ui.ts                   # UI-Zustand
│   ├── settings.ts             # Benutzereinstellungen
│   └── featureToggles.ts       # Feature-Flagging
├── composables/
│   ├── useAuth.ts              # Auth-Hook
│   ├── useChat.ts              # Chat-Hook
│   ├── useUI.ts                # UI-Hook
│   ├── useSettings.ts          # Settings-Hook
│   ├── useFeatureToggles.ts    # Feature-Control-Hook
│   └── useNScale.ts            # Kombinierter Hook
└── bridge/
    ├── index.ts                # Legacy-Bridge-Implementierung
    ├── setup.ts                # Bridge-Konfiguration
    └── storeBridge.ts          # Store-spezifische Bridge
```

## Optimierte Store-Implementierungen

### Auth-Store

Der neu optimierte Auth-Store verwaltet die Benutzerauthentifizierung mit verbesserten Funktionen:

- **Token-Refresh-Mechanismus**: Automatische Aktualisierung von Tokens vor Ablauf
- **Erweiterte Rollenverwaltung**: Unterstützung für komplexe Berechtigungsszenarien
- **Sicherheit**: Verbesserte Token-Speicherung mit Refresh-Tokens
- **Error-Recovery**: Automatische Wiederherstellung nach API-Fehlern
- **HTTP-Integration**: Automatische Header-Einrichtung für API-Aufrufe

```typescript
// Beispiel: Auth-Store mit Token-Refresh
const authStore = useAuthStore();

// Token-Refresh bei Bedarf
await authStore.refreshTokenIfNeeded();

// Prüfen mehrerer Rollen
if (authStore.hasAnyRole(['admin', 'support'])) {
  console.log('Benutzer hat Zugriff auf erweiterte Funktionen');
}

// Auth-Header für API-Anfragen erstellen
const headers = authStore.createAuthHeaders();
```

### Sessions-Store

Der verbesserte Sessions-Store bietet optimierte Verwaltung von Chat-Sessions und Nachrichten:

- **Effiziente Persistenz**: Optimierte Speicherung für große Datensätze
- **Auto-Synchronisation**: Automatische Synchronisation mit dem Server
- **Offline-Unterstützung**: Lokale Zwischenspeicherung und Retry-Mechanismen
- **Optimistisches UI-Update**: Sofortige UI-Aktualisierung vor Server-Antwort
- **Lazy-Loading**: Nachrichten bei Bedarf laden für bessere Performance

```typescript
// Beispiel: Optimistisches UI-Update mit Server-Synchronisation
const sessionsStore = useSessionsStore();

// Session erstellen mit sofortiger UI-Aktualisierung
const sessionId = await sessionsStore.createSession('Neue Strategiediskussion');

// Effizientes Laden von Nachrichten
const messages = await sessionsStore.fetchMessages(sessionId);

// Optimierte Datenexport-Funktionalität
const exportData = sessionsStore.exportData();
```

### UI-Store

Der erweiterte UI-Store verwaltet UI-Zustände mit Performance-Optimierungen:

- **Reaktives Layout-Management**: Anpassungsfähige Layout-Konfiguration
- **Theme-Verwaltung**: Verbesserte Dark-Mode- und Theme-Unterstützung
- **Update-Batching**: Optimierte DOM-Updates für bessere Performance
- **Erweiterte Dialog-API**: Promise-basierte Dialog-Steuerung
- **Toast-Notifications**: Verbessertes Benachrichtigungssystem

```typescript
// Beispiel: UI-Store mit reaktiven Layout-Einstellungen
const uiStore = useUIStore();

// Dialog mit Promise-API
const userConfirmed = await uiStore.confirm(
  'Möchten Sie diese Aktion wirklich durchführen?', 
  { variant: 'warning' }
);

// Reaktive Layout-Anpassung
uiStore.setUIDensity('compact');
uiStore.setTextScale(1.2);

// Sidebar-Collapse-Modus
uiStore.toggleSidebarCollapse();
```

### Settings-Store

Der Settings-Store verwaltet Benutzereinstellungen mit granularer Kontrolle:

- **Theme-Customization**: Benutzerdefinierte Theme-Erstellung und -Verwaltung
- **Barrierefreiheit**: Erweiterte Einstellungen für A11y-Funktionen
- **Einstellungssynchronisation**: Automatische Synchronisation mit Server und Local Storage
- **Live-Vorschau**: Sofortige Anwendung von Einstellungsänderungen
- **Einstellungs-Presets**: Vordefinierte Einstellungen für verschiedene Nutzungsszenarien

```typescript
// Beispiel: Granulare Einstellungskontrolle
const settingsStore = useSettingsStore();

// Theme anpassen
settingsStore.setTheme('high-contrast-dark');

// Schrift-Einstellungen aktualisieren
settingsStore.updateFontSettings({
  size: 'large',
  family: 'system',
  lineHeight: 'relaxed'
});

// Barrierefreiheit-Einstellungen
settingsStore.updateA11ySettings({
  reduceMotion: true,
  highContrast: true
});
```

### FeatureToggles-Store

Der FeatureToggles-Store steuert die Verfügbarkeit von Funktionen:

- **Granulare Feature-Steuerung**: Ein- und Ausschalten einzelner Features
- **Rollenbezogene Features**: Features basierend auf Benutzerrollen aktivieren
- **A/B-Testing**: Unterstützung für Feature-Tests und graduelle Einführung
- **Feature-Abhängigkeiten**: Automatisches Management von abhängigen Features
- **Feature-Monitoring**: Erfassung von Feature-Nutzung und -Fehlern

```typescript
// Beispiel: Feature-Steuerung
const featureStore = useFeatureTogglesStore();

// Feature-Verfügbarkeit prüfen
if (featureStore.isEnabled('usePiniaAuth')) {
  console.log('Pinia Auth-Store ist aktiviert');
}

// Feature für bestimmte Benutzer aktivieren
if (authStore.isAdmin) {
  featureStore.enableFeature('adminAnalytics');
}
```

## Effiziente Persistenzstrategien

Die Stores nutzen optimierte Persistenzstrategien für bessere Performance und Sicherheit:

### Selektive Persistenz

```typescript
// Beispiel: Selektive Persistenz im Sessions-Store
export const useSessionsStore = defineStore('sessions', () => {
  // Store-Implementierung...
}, {
  persist: {
    storage: localStorage,
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
        // Optimierung: Speichere nur die Sitzungsmetadaten
        const optimizedState = {
          ...state,
          messages: {}, // Nachrichten nicht persistieren
        };
        return JSON.stringify(optimizedState);
      }
    }
  },
});
```

### Nachrichten-Auslagerung

Der Sessions-Store verwendet eine intelligente Auslagerungsstrategie für ältere Nachrichten:

```typescript
// Beispiel: Storage-Optimierung
function cleanupStorage() {
  const messageLimit = 50;
  
  Object.keys(messages.value).forEach(sessionId => {
    const sessionMessages = messages.value[sessionId];
    
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

## Bridge-Mechanismen

Die verbesserte Store-Bridge ermöglicht eine nahtlose Integration mit Legacy-Code:

### Zentrale Bridge-API

```typescript
// Bridge-Setup in storeBridge.ts
export function setupStoreBridge(): BridgeAPI {
  const authStore = useAuthStore();
  const sessionsStore = useSessionsStore();
  const uiStore = useUIStore();
  const settingsStore = useSettingsStore();
  const featureTogglesStore = useFeatureTogglesStore();
  
  // Bridge-APIs für jeden Store (siehe Implementierung)
  const authBridge = { /* ... */ };
  const sessionsBridge = { /* ... */ };
  const uiBridge = { /* ... */ };
  const settingsBridge = { /* ... */ };
  const featuresBridge = { /* ... */ };
  const eventsBridge = { /* ... */ };
  
  // Store-Watcher für Events einrichten
  watch(() => authStore.isAuthenticated, (isAuthenticated) => {
    bus.emit('auth:changed', { isAuthenticated });
    // ...weitere Event-Handling-Logik
  });
  
  // Vollständige Bridge-API zurückgeben
  return {
    auth: authBridge,
    sessions: sessionsBridge,
    ui: uiBridge,
    settings: settingsBridge,
    features: featuresBridge,
    events: eventsBridge
  };
}
```

### Verwendung im Legacy-Code

```javascript
// Beispiel: Legacy-Code verwendet die Bridge
document.getElementById('login-button').addEventListener('click', async () => {
  const email = document.getElementById('email-input').value;
  const password = document.getElementById('password-input').value;
  
  // Zugriff auf Auth-Store über die Bridge
  const success = await window.nscale.auth.login(email, password);
  
  if (success) {
    const user = window.nscale.auth.getUser();
    document.getElementById('welcome-message').textContent = `Willkommen, ${user.name}!`;
  } else {
    document.getElementById('error-message').textContent = 'Login fehlgeschlagen';
  }
});

// Event-Abonnement im Legacy-Code
window.nscale.events.on('session:changed', ({ sessionId, session }) => {
  console.log(`Aktuelle Session geändert: ${session.title}`);
  updateLegacyUIForSession(session);
});
```

## Composables

Composables bieten eine benutzerfreundliche API für den Zugriff auf Store-Funktionalität in Komponenten:

### Erweiterte Auth-Composable

```typescript
// useAuth.ts
export function useAuth() {
  const authStore = useAuthStore();
  
  // Reaktive Eigenschaften
  const user = computed(() => authStore.user);
  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const isAdmin = computed(() => authStore.isAdmin);
  const isLoading = computed(() => authStore.isLoading);
  const error = computed(() => authStore.error);
  const tokenStatus = computed(() => ({
    isExpired: authStore.isExpired,
    expiresIn: authStore.tokenExpiresIn
  }));
  
  // Login mit erweiterten Optionen
  const login = async (credentials, options = {}) => {
    const result = await authStore.login(credentials);
    
    // Automatischen Token-Refresh einrichten
    if (result && options.setupAutoRefresh !== false) {
      authStore.setupAutoRefresh();
    }
    
    return result;
  };
  
  // Weitere erweiterte Methoden...
  
  return {
    // Eigenschaften und Methoden...
  };
}
```

### Kombinierter useNScale-Composable

```typescript
// Beispiel: Kombinierter useNScale-Composable
export function useNScale() {
  const auth = useAuth();
  const chat = useChat();
  const ui = useUI();
  const settings = useSettings();
  const features = useFeatureToggles();
  const { bridge, isEnabled: bridgeEnabled } = useStoreBridge();
  
  // Hilfsfunktion für Feature-Checking
  function isFeatureEnabled(featureName: string): boolean {
    return features.isEnabled(featureName);
  }
  
  // Kombinierte Initialisierung
  async function initialize(): Promise<boolean> {
    try {
      // Nur aktivierte Services initialisieren
      const promises = [];
      
      if (auth.isAuthenticated) {
        promises.push(auth.refreshUserInfo());
      }
      
      if (isFeatureEnabled('usePiniaSessions')) {
        promises.push(chat.initialize());
      }
      
      // Auf Abschluss aller Initialisierungen warten
      if (promises.length > 0) {
        await Promise.all(promises);
      }
      
      return true;
    } catch (error) {
      console.error('Fehler bei der Initialisierung:', error);
      return false;
    }
  }
  
  return {
    auth,
    chat,
    ui,
    settings,
    features,
    bridge: {
      api: bridge,
      enabled: bridgeEnabled
    },
    isFeatureEnabled,
    initialize
  };
}
```

## Integration in Komponenten

### Vue 3 Composition API Integration

```vue
<template>
  <!-- UI-Komponente mit Store-Integration -->
  <div :class="{ 'dark-mode': isDarkMode, 'compact-ui': isCompactMode }">
    <!-- Layout-Komponenten -->
    <header v-if="layoutConfig.headerVisible">
      <button @click="toggleSidebar">
        <icon :name="sidebarIsOpen ? 'menu-fold' : 'menu-unfold'" />
      </button>
      <dark-mode-toggle />
    </header>

    <!-- Content-Bereich mit Sidebar -->
    <div class="content-layout">
      <sidebar 
        v-if="sidebarIsOpen" 
        :width="sidebar.width" 
        :collapsed="sidebarIsCollapsed"
        @resize="setSidebarWidth"
      />
      
      <!-- Hauptinhalt -->
      <main>
        <suspense>
          <chat-view v-if="isAuthenticated" />
          <login-form v-else @login="handleLogin" />
        </suspense>
      </main>
    </div>
  </div>
</template>

<script>
import { useNScale } from '@/composables/useNScale';

export default {
  setup() {
    // Zentraler Hook für alle Funktionalitäten
    const { 
      auth: { user, isAuthenticated, login, logout },
      ui: { 
        isDarkMode, toggleDarkMode, 
        sidebar, sidebarIsOpen, sidebarIsCollapsed, toggleSidebar, setSidebarWidth,
        layoutConfig, isCompactMode
      }
    } = useNScale();
    
    // Login-Handler
    const handleLogin = async (credentials) => {
      await login(credentials);
    };
    
    return {
      // Auth
      user,
      isAuthenticated,
      logout,
      handleLogin,
      
      // UI
      isDarkMode,
      toggleDarkMode,
      sidebar,
      sidebarIsOpen,
      sidebarIsCollapsed,
      toggleSidebar,
      setSidebarWidth,
      layoutConfig,
      isCompactMode
    };
  }
}
</script>
```

## Performance-Optimierungen

### UI-Update-Batching

Der UI-Store verwendet Update-Batching für DOM-Änderungen:

```typescript
// Beispiel: Update-Batching im UI-Store
function batchUIUpdates() {
  if (isUpdatingUI.value || pendingUIUpdates.value.size === 0) return;
  
  isUpdatingUI.value = true;
  
  // Alle ausstehenden UI-Updates gebündelt durchführen
  setTimeout(() => {
    // CSS-Variablen aktualisieren
    Object.entries(cssVariables.value).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    
    // Dark-Mode und andere CSS-Klassen anwenden
    applyDarkMode();
    
    pendingUIUpdates.value.clear();
    isUpdatingUI.value = false;
    
    // Prüfen auf neue Updates während der Verarbeitung
    if (pendingUIUpdates.value.size > 0) {
      batchUIUpdates();
    }
  }, 0);
}
```

### Selektives Abonnieren von Store-Eigenschaften

```typescript
// Ineffizient - gesamten Store abonnieren
const authStore = useAuthStore();

// Effizient - nur benötigte Eigenschaften
const { user, isAuthenticated } = storeToRefs(useAuthStore());
```

### Lazy Loading für Nachrichtenverlauf

```typescript
// Beispiel: Lazy Loading im Sessions-Store
async function loadOlderMessages(sessionId: string): ChatMessage[] {
  if (!sessionId) return [];
  
  try {
    // Aus dem sessionStorage laden
    const olderMessages = JSON.parse(
      sessionStorage.getItem(`session_${sessionId}_older_messages`) || '[]'
    );
    
    // Zu den aktuellen Nachrichten hinzufügen
    if (olderMessages.length > 0) {
      if (!messages.value[sessionId]) {
        messages.value[sessionId] = [];
      }
      
      // Zusammenführen und sortieren
      messages.value[sessionId] = [...olderMessages, ...messages.value[sessionId]]
        .sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      
      // Aus dem sessionStorage entfernen
      sessionStorage.removeItem(`session_${sessionId}_older_messages`);
    }
    
    return olderMessages;
  } catch (e) {
    console.error(`Error loading older messages for session ${sessionId}:`, e);
    return [];
  }
}
```

## Fehlerbehandlung und Wiederherstellung

### Automatischer Token-Refresh

```typescript
// Beispiel: Automatischer Token-Refresh
async function refreshTokenIfNeeded(): Promise<boolean> {
  // Nicht ausführen, wenn:
  // - Kein Token vorhanden
  // - Token noch gültig
  // - Bereits ein Refresh läuft
  // - Letzter Refresh war vor weniger als 10 Sekunden
  if (
    !token.value || 
    !refreshToken.value || 
    !isExpired.value || 
    tokenRefreshInProgress.value ||
    (Date.now() - lastTokenRefresh.value) < 10000
  ) {
    return true;
  }

  tokenRefreshInProgress.value = true;
  
  try {
    const response = await axios.post('/api/auth/refresh', {
      refreshToken: refreshToken.value
    });
    
    if (response.data.success) {
      token.value = response.data.token;
      refreshToken.value = response.data.refreshToken || refreshToken.value;
      expiresAt.value = Date.now() + (response.data.expiresIn || 60 * 60 * 1000);
      
      // Benutzerdaten aktualisieren, falls vorhanden
      if (response.data.user) {
        user.value = response.data.user;
      }
      
      lastTokenRefresh.value = Date.now();
      return true;
    }
    
    // Bei Fehlschlag: Abmelden
    logout();
    return false;
  } catch (err) {
    // Fehlerbehandlung...
    return false;
  } finally {
    tokenRefreshInProgress.value = false;
  }
}
```

### Axios-Interceptoren für automatischen Retry

```typescript
// Beispiel: Axios-Interceptor für Token-Refresh
watch(token, (newToken) => {
  if (newToken) {
    // Axios-Interceptor für automatischen Token-Refresh
    const interceptorId = axios.interceptors.response.use(
      response => response, 
      async error => {
        const originalRequest = error.config;
        
        if (
          error.response?.status === 401 && 
          !originalRequest._retry && 
          !originalRequest.url.includes('/api/auth/refresh')
        ) {
          originalRequest._retry = true;
          
          const refreshSuccess = await refreshTokenIfNeeded();
          if (refreshSuccess) {
            // Ursprüngliche Anfrage wiederholen
            originalRequest.headers.Authorization = `Bearer ${token.value}`;
            return axios(originalRequest);
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    // Cleanup beim Logout
    const unwatchToken = watch(token, (newTokenValue) => {
      if (!newTokenValue) {
        axios.interceptors.response.eject(interceptorId);
        unwatchToken();
      }
    });
  }
});
```

## Fehlerbehebung

### Store ist nicht reaktiv

**Problem**: Änderungen am Store werden nicht in der UI reflektiert.

**Lösung**: 
1. Verwenden Sie storeToRefs oder computed für reaktive Eigenschaften
2. Verwenden Sie die Composables statt direkten Store-Zugriff
3. Stellen Sie sicher, dass watch-Handler ordnungsgemäß aufgeräumt werden

```typescript
// Falsch - nicht reaktiv
const authStore = useAuthStore();
const user = authStore.user; 

// Richtig - reaktiv mit storeToRefs
const { user, isAuthenticated } = storeToRefs(useAuthStore());

// Alternative - reaktiv mit computed
const user = computed(() => authStore.user);
```

### Bridge funktioniert nicht

**Problem**: Legacy-Code kann nicht auf Store-Funktionen zugreifen.

**Lösung**:
1. Stellen Sie sicher, dass die Bridge vor dem Legacy-Code initialisiert wird
2. Prüfen Sie, ob die entsprechenden Feature-Toggles aktiviert sind
3. Fügen Sie Event-Listener für das 'nscale:bridge:ready'-Event hinzu

```javascript
// Warten auf Bridge-Initialisierung im Legacy-Code
window.addEventListener('nscale:bridge:ready', () => {
  // Jetzt ist die Bridge verfügbar
  if (window.nscale && window.nscale.auth) {
    setupLegacyCode();
  } else {
    console.error('nscale Bridge nicht vollständig initialisiert');
  }
});
```

### Offline-Synchronisierungsprobleme

**Problem**: Daten werden nach Wiederherstellen der Verbindung nicht korrekt synchronisiert.

**Lösung**:
1. Rufen Sie syncPendingMessages() nach Wiederherstellung der Verbindung auf
2. Setzen Sie den lokalen State zurück, wenn die Server-Synchronisation fehlschlägt
3. Verwenden Sie optimistisches UI-Update mit Fehler-Fallback

```typescript
// Wiederverbindungs-Handling
window.addEventListener('online', () => {
  sessionsStore.syncPendingMessages();
});
```

## Nächste Schritte

1. **TypeScript-Typen verfeinern**: Erweitern Sie die Interface-Definitionen für präzisere Typprüfung
2. **Testen**: Erstellen Sie Unit-Tests und Integration-Tests für die Store-Logik
3. **Dokumentation**: Aktualisieren Sie die Komponentendokumentation mit Store-Integrationsbeispielen
4. **Migration**: Migrieren Sie schrittweise bestehende Komponenten zur Verwendung der neuen Stores

--- 

Dieses Dokument wird kontinuierlich aktualisiert, um Änderungen am State-Management-System widerzuspiegeln.

**Änderungsprotokoll:**
- 08.05.2025: Version 2.0.0 - Vollständige Überarbeitung der Store-Implementierungen mit optimierter Performance, Token-Refresh und verbesserter Bridge
- 15.04.2025: Version 1.1.0 - Hinzufügung von Feature-Toggles und Session-Management
- 22.03.2025: Version 1.0.0 - Initiale Dokumentation des Pinia-basierten State-Managements