# State Management mit Pinia

Dieses Dokument beschreibt die State-Management-Architektur des nscale DMS Assistenten, die auf Pinia basiert. Die Architektur ersetzt das bisherige System mit direkten reaktiven Referenzen und Prop-Passing durch einen zentralisierten, typensicheren State-Management-Ansatz.

**Letzte Aktualisierung:** 07.05.2025

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Store-Struktur](#store-struktur)
3. [Beispiele für jeden Store](#beispiele-für-jeden-store)
4. [Composables](#composables)
5. [Integration in Komponenten](#integration-in-komponenten)
6. [Persistenz](#persistenz)
7. [Legacy-Bridge](#legacy-bridge)
8. [Feature-Toggles](#feature-toggles)
9. [Fehlerbehebung](#fehlerbehebung)

## Überblick

Der nscale DMS Assistent verwendet Pinia als State-Management-Lösung, um den Anwendungszustand zentral und typensicher zu verwalten. Die Architektur besteht aus folgenden Hauptkomponenten:

- **Stores**: Zentrale Zustandsspeicher für verschiedene Domänen der Anwendung
- **Composables**: Hooks für einfachen Zugriff auf Store-Funktionalität in Komponenten
- **Persistenz**: Speicherung bestimmter Zustände im localStorage
- **Legacy-Bridge**: Schnittstelle zum Legacy-Code für schrittweise Migration
- **Feature-Toggles**: Steuerung der schrittweisen Aktivierung neuer Features

> **Verwandte Dokumente:**
> - [API_INTEGRATION.md](API_INTEGRATION.md) - Details zur API-Integration, die mit den Stores interagiert
> - [COMPONENT_GUIDE.md](COMPONENT_GUIDE.md) - Verwendung von Stores in Komponenten
> - [SETUP.md](SETUP.md) - Entwicklungsumgebung für die Arbeit mit Pinia einrichten

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
    └── setup.ts                # Bridge-Konfiguration
```

## Beispiele für jeden Store

### Auth Store

Der Auth-Store verwaltet die Benutzerauthentifizierung, Token und Benutzerrollen.

```typescript
// Beispiel: Verwendung des Auth-Stores
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

// Login
await authStore.login({ email: 'user@example.com', password: 'password' });

// Prüfen der Authentifizierung
if (authStore.isAuthenticated) {
  console.log('Benutzer ist angemeldet:', authStore.user);
}

// Admin-Rechte prüfen
if (authStore.isAdmin) {
  console.log('Benutzer hat Admin-Rechte');
}

// Abmelden
authStore.logout();
```

### Sessions Store

Der Sessions-Store verwaltet Chat-Sessions, Nachrichten und Streaming-Funktionalität.

```typescript
// Beispiel: Verwendung des Sessions-Stores
import { useSessionsStore } from '@/stores/sessions';

const sessionsStore = useSessionsStore();

// Neue Session erstellen
const sessionId = await sessionsStore.createSession('Neue Konversation');

// Nachricht senden
await sessionsStore.sendMessage({
  sessionId,
  content: 'Hallo, wie kann ich helfen?',
  role: 'user'
});

// Alle Sessions abrufen
console.log('Verfügbare Sessions:', sessionsStore.sessions);

// Nachrichten der aktuellen Session abrufen
console.log('Aktuelle Nachrichten:', sessionsStore.currentMessages);

// Streaming abbrechen, falls aktiv
if (sessionsStore.isStreaming) {
  sessionsStore.cancelStreaming();
}
```

### UI Store

Der UI-Store verwaltet UI-Zustände wie Dark Mode, Sidebar und Toast-Benachrichtigungen.

```typescript
// Beispiel: Verwendung des UI-Stores
import { useUIStore } from '@/stores/ui';

const uiStore = useUIStore();

// Dark Mode umschalten
uiStore.toggleDarkMode();

// Sidebar öffnen/schließen
uiStore.toggleSidebar();

// Modal öffnen
const modalId = uiStore.openModal({
  title: 'Bestätigung',
  content: 'Möchten Sie diese Aktion wirklich durchführen?',
  confirmText: 'Ja',
  cancelText: 'Nein',
  onConfirm: () => {
    // Bestätigungsaktion
  }
});

// Toast-Benachrichtigung anzeigen
uiStore.showSuccess('Operation erfolgreich abgeschlossen');
uiStore.showError('Ein Fehler ist aufgetreten');
```

### Settings Store

Der Settings-Store verwaltet Benutzereinstellungen, Themes und Barrierefreiheit-Optionen.

```typescript
// Beispiel: Verwendung des Settings-Stores
import { useSettingsStore } from '@/stores/settings';

const settingsStore = useSettingsStore();

// Theme ändern
settingsStore.setTheme('dark-blue');

// Schriftgröße anpassen
settingsStore.setFontSize(16);

// Spezifische Einstellung aktualisieren
settingsStore.setSetting('notifications', true);

// Einstellungen abrufen
console.log('Aktuelle Theme:', settingsStore.currentTheme);
console.log('Barrierefreiheit-Einstellungen:', settingsStore.accessibilitySettings);
```

### Feature-Toggles Store

Der Feature-Toggles-Store steuert die schrittweise Aktivierung neuer Features.

```typescript
// Beispiel: Verwendung des Feature-Toggles-Stores
import { useFeatureTogglesStore } from '@/stores/featureToggles';

const featureStore = useFeatureTogglesStore();

// Spezifisches Feature prüfen
if (featureStore.isEnabled('usePiniaAuth')) {
  console.log('Pinia Auth-Store ist aktiviert');
}

// Feature umschalten
featureStore.toggleFeature('useModernDocConverter');

// Feature aktivieren/deaktivieren
featureStore.enableFeature('useToastNotifications');
featureStore.disableFeature('useNewAdminPanel');

// Komplett auf Legacy-Modus umschalten (für Fallback)
featureStore.enableLegacyMode();
```

## Composables

Composables sind Hooks, die den Zugriff auf Store-Funktionalität in Komponenten vereinfachen.

### useAuth Composable

```typescript
// Beispiel: Verwendung des useAuth-Composables
import { useAuth } from '@/composables/useAuth';

export default {
  setup() {
    const { user, isAuthenticated, login, logout } = useAuth();

    // Verwendung der reaktiven Properties und Funktionen
    return {
      user,
      isAuthenticated,
      login,
      logout
    };
  }
};
```

### Kombinierter useNScale Composable

Der useNScale-Composable kombiniert alle Stores in einer einzigen API.

```typescript
// Beispiel: Verwendung des kombinierten useNScale-Composables
import { useNScale } from '@/composables/useNScale';

export default {
  setup() {
    const { auth, chat, ui, settings, features } = useNScale();

    // Verwendung aller Stores
    return {
      // Auth-Funktionalität
      login: auth.login,
      user: auth.user,
      
      // Chat-Funktionalität
      sendMessage: chat.sendMessage,
      sessions: chat.sessions,
      
      // UI-Funktionalität
      toggleDarkMode: ui.toggleDarkMode,
      isDarkMode: ui.isDarkMode,
      
      // Settings-Funktionalität
      setTheme: settings.setTheme,
      
      // Feature-Toggle-Funktionalität
      toggleFeature: features.toggleFeature
    };
  }
};
```

## Integration in Komponenten

### Vue 3 Composition API Integration

```vue
<template>
  <div :class="{ 'dark-mode': isDarkMode }">
    <button @click="toggleDarkMode">
      {{ isDarkMode ? 'Helles Theme' : 'Dunkles Theme' }}
    </button>
    
    <div v-if="isAuthenticated">
      <p>Hallo, {{ user?.name }}</p>
      <button @click="logout">Abmelden</button>
    </div>
    <div v-else>
      <form @submit.prevent="handleLogin">
        <input type="email" v-model="email" placeholder="E-Mail" />
        <input type="password" v-model="password" placeholder="Passwort" />
        <button type="submit" :disabled="isLoading">Anmelden</button>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { useUI } from '@/composables/useUI';

export default {
  setup() {
    // Auth-Store Funktionalität
    const { user, isAuthenticated, login, logout, isLoading, error } = useAuth();
    
    // UI-Store Funktionalität
    const { isDarkMode, toggleDarkMode } = useUI();
    
    // Lokaler Formular-Zustand
    const email = ref('');
    const password = ref('');
    
    // Login-Handler
    const handleLogin = async () => {
      const success = await login({
        email: email.value,
        password: password.value
      });
      
      if (!success && error.value) {
        alert(`Fehler: ${error.value}`);
      }
    };
    
    return {
      // Auth-Zustand
      user,
      isAuthenticated,
      logout,
      isLoading,
      
      // UI-Zustand
      isDarkMode,
      toggleDarkMode,
      
      // Lokaler Zustand
      email,
      password,
      
      // Methoden
      handleLogin
    };
  }
}
</script>
```

## Persistenz

Die Persistenz bestimmter Store-Zustände wird durch das Pinia-Persistenz-Plugin gewährleistet.

### Konfiguration der Persistenz

```typescript
// src/stores/index.ts
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

// Pinia Store erstellen
const pinia = createPinia();

// Persistenz-Plugin konfigurieren
pinia.use(piniaPluginPersistedstate);

export default pinia;
```

### Store-spezifische Persistenz

```typescript
// Beispiel: Persistenz-Konfiguration im Auth-Store
export const useAuthStore = defineStore('auth', () => {
  // State und Funktionen...
  
  return {
    // Öffentliche API...
  };
}, {
  // Persistenz-Konfiguration
  persist: {
    storage: localStorage,
    paths: ['token', 'user', 'expiresAt', 'version'],
  },
});
```

## Legacy-Bridge

Die Legacy-Bridge ermöglicht die Integration der Pinia-Stores in den bestehenden Code.

### Integration der Bridge

```typescript
// main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import bridgePlugin from './bridge';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(bridgePlugin);

app.mount('#app');
```

### Zugriff auf Store-Funktionalität aus Legacy-Code

```javascript
// Beispiel: Verwendung der Bridge im Legacy-Code
document.getElementById('login-button').addEventListener('click', async () => {
  const email = document.getElementById('email-input').value;
  const password = document.getElementById('password-input').value;
  
  // Zugriff auf Auth-Store über die Bridge
  const success = await window.nscaleAuth.login(email, password);
  
  if (success) {
    const user = window.nscaleAuth.getUser();
    document.getElementById('welcome-message').textContent = `Willkommen, ${user.name}!`;
  } else {
    document.getElementById('error-message').textContent = 'Login fehlgeschlagen';
  }
});

// Zugriff auf UI-Store über die Bridge
document.getElementById('dark-mode-toggle').addEventListener('click', () => {
  window.nscaleUI.toggleDarkMode();
});
```

## Feature-Toggles

### Konfiguration von Features

```typescript
// Beispiel: Feature-Konfiguration
import { configureFeatures } from '@/bridge/setup';

// Features konfigurieren
configureFeatures({
  // Core-Features
  usePiniaAuth: true,
  usePiniaSessions: true,
  usePiniaUI: true,
  usePiniaSettings: true,
  
  // UI-Features
  useNewUIComponents: false, // Noch nicht aktivieren
  useModernSidebar: true,
  useToastNotifications: true,
  
  // Bridge
  useLegacyBridge: true,
  migrateLocalStorage: true
});
```

### Bedingte Feature-Aktivierung in Komponenten

```vue
<template>
  <div>
    <!-- Modernes UI nur anzeigen, wenn aktiviert -->
    <modern-sidebar v-if="features.modernSidebar" />
    <legacy-sidebar v-else />
    
    <!-- Feature-Toggles für Administratoren -->
    <div v-if="auth.isAdmin">
      <h3>Features verwalten</h3>
      <div v-for="(value, key) in featureList" :key="key">
        <label>
          <input type="checkbox" v-model="features[key]" />
          {{ key }}
        </label>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useNScale } from '@/composables/useNScale';

export default {
  setup() {
    const { auth, features } = useNScale();
    
    // Eigenschaften für UI-Steuerung extrahieren
    const featureList = computed(() => ({
      modernSidebar: features.uiComponents,
      newAdminPanel: features.adminPanel,
      toastNotifications: features.toastNotifications,
      darkMode: features.darkMode
    }));
    
    return {
      auth,
      features,
      featureList
    };
  }
}
</script>
```

## Fehlerbehebung

### Häufige Probleme

#### Store ist nicht reaktiv

**Problem**: Änderungen am Store werden nicht in der UI reflektiert.

**Lösung**: 
1. Stellen Sie sicher, dass Sie die Werte aus dem Composable und nicht direkt aus dem Store verwenden
2. Verwenden Sie `computed`, um auf Store-Eigenschaften zuzugreifen
3. Prüfen Sie, ob Sie `ref` oder `reactive` korrekt verwenden

```typescript
// Falsch
const authStore = useAuthStore();
const user = authStore.user; // Nicht reaktiv!

// Richtig
const authStore = useAuthStore();
const user = computed(() => authStore.user); // Reaktiv
```

#### Persistenz funktioniert nicht

**Problem**: Daten werden nach Neuladen der Seite nicht wiederhergestellt.

**Lösung**:
1. Prüfen Sie die Konfiguration der Persistenz im Store
2. Überprüfen Sie, ob die angegebenen Pfade korrekt sind
3. Prüfen Sie den localStorage im Browser-Debugger

#### Migrierte Legacy-Daten werden nicht korrekt geladen

**Problem**: Nach der Migration werden alte Benutzerdaten nicht korrekt angezeigt.

**Lösung**:
1. Überprüfen Sie die Migrations-Funktionen in den jeweiligen Stores
2. Prüfen Sie die Formatkonversion zwischen altem und neuem Format
3. Fügen Sie debug-Logging zur Migrationsfunktion hinzu

```typescript
function migrateFromLegacyStorage() {
  console.log('Starte Migration...');
  try {
    const legacyData = localStorage.getItem('legacy_key');
    console.log('Legacy-Daten:', legacyData);
    
    if (legacyData) {
      // Migration...
      console.log('Migration abgeschlossen');
    }
  } catch (error) {
    console.error('Migration fehlgeschlagen:', error);
  }
}
```

## Performance-Optimierung

### Performance-Tipps

#### Selektives Abonnieren von Store-Eigenschaften

Abonnieren Sie nur die Eigenschaften, die Sie tatsächlich benötigen:

```typescript
// Ineffizient - gesamten Store abonnieren
const authStore = useAuthStore();

// Effizient - nur benötigte Eigenschaften
const { user, isAuthenticated } = storeToRefs(useAuthStore());
```

#### Verwendung von Getters für abgeleitete Werte

Verwenden Sie Getters für Berechnungen, die von Store-Werten abhängig sind:

```typescript
export const useSessionsStore = defineStore('sessions', () => {
  const sessions = ref([]);
  const currentSessionId = ref(null);
  
  // Getter für abgeleiteten Wert
  const currentSession = computed(() => 
    sessions.value.find(s => s.id === currentSessionId.value) || null
  );
  
  return {
    sessions,
    currentSessionId,
    currentSession
  };
});
```

#### Vermeidung unnötiger Reaktivität

Verwenden Sie `markRaw` für Objekte, die nicht reaktiv sein müssen:

```typescript
import { markRaw } from 'vue';

// Für große Objekte, die nicht reaktiv sein müssen
const bigData = markRaw(fetchedData);
```

## Integration mit Vue DevTools

Die Pinia-Stores sind vollständig in Vue DevTools integriert, was die Fehlersuche erheblich erleichtert:

1. Installieren Sie Vue DevTools in Ihrem Browser
2. Öffnen Sie das DevTools-Panel und wählen Sie den Tab "Pinia"
3. Hier können Sie:
   - Aktuelle Store-Werte einsehen
   - Aktionen und Mutationen verfolgen
   - Zeitreisen durch den State-Verlauf
   - Änderungen manuell durchführen
   - Store-Struktur analysieren