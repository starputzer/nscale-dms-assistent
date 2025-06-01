# Migration von monolithischer App zu Vue 3 SFCs

Dieses Dokument beschreibt die schrittweise Migration von der monolithischen `app.js` Struktur zu Vue 3 Single-File Components (SFCs).

## Migrationsphasen

Die Migration wird in vier Hauptphasen durchgeführt:

### Phase 1: Vorbereitung der Infrastruktur

1. **Build-System einrichten**
   - [x] Vite-Konfiguration erstellen
   - [x] TypeScript-Integration einrichten
   - [x] Basisverzeichnisstruktur erstellen

2. **Zustandsmanagement vorbereiten**
   - [ ] Pinia einrichten
   - [ ] Basis-Stores definieren (auth, session, ui)
   - [ ] Feature-Toggle-Store erstellen

3. **Bridge-Mechanismus implementieren**
   - [ ] Schnittstelle zwischen altem und neuem Zustand definieren
   - [ ] Watcher für Zustandssynchronisation einrichten

### Phase 2: Extraktion in Composables

1. **Authentifizierungslogik extrahieren**
   - [ ] `useAuth` Composable erstellen
   - [ ] Login, Register, Logout-Funktionen migrieren
   - [ ] Auth-Store mit dem alten Code verbinden

2. **Chat-Funktionalität extrahieren**
   - [ ] `useChat` und `useSession` Composables erstellen
   - [ ] Session-Verwaltung und Nachrichtenhandling migrieren
   - [ ] Session-Store mit dem alten Code verbinden

3. **Admin-Funktionalität extrahieren**
   - [ ] Admin-bezogene Composables erstellen
   - [ ] Admin-Funktionen in dedizierte Module migrieren

### Phase 3: Erstellung von Single-File Components

1. **Basis-UI-Komponenten erstellen**
   - [ ] NScaleButton, NScaleInput, etc. erstellen
   - [ ] Styling und Interaktionslogik implementieren

2. **Authentifizierungskomponenten erstellen**
   - [ ] LoginForm.vue, RegisterForm.vue, etc. erstellen
   - [ ] Mit Auth-Composables und Stores verbinden

3. **Chat-Komponenten erstellen**
   - [ ] ChatView.vue, MessageList.vue, etc. erstellen
   - [ ] Mit Chat-Composables und Stores verbinden

4. **Admin-Komponenten erstellen**
   - [ ] AdminView.vue, UsersTab.vue, etc. erstellen
   - [ ] Mit Admin-Composables und Stores verbinden

### Phase 4: Integration und Umstellung

1. **Feature-Toggle-Mechanismus implementieren**
   - [ ] Feature-Flags für verschiedene Komponenten einrichten
   - [ ] UI für Administratoren zur Steuerung der Feature-Flags erstellen

2. **Komponenten-Integration**
   - [ ] Neue Komponenten in die bestehende Anwendung integrieren
   - [ ] Bridge-Mechanismen für den Übergang implementieren

3. **Schrittweise Aktivierung**
   - [ ] Neue Komponenten für bestimmte Benutzergruppen aktivieren
   - [ ] Performance und UX überwachen
   - [ ] Basierend auf Feedback iterieren

4. **Vollständige Umstellung**
   - [ ] Legacy-Code entfernen
   - [ ] Bridge-Mechanismen entfernen
   - [ ] Codebase bereinigen

## Zustandsmigrationsplan

Folgende Zustände müssen von der monolithischen App zu den Pinia-Stores migriert werden:

| Aktueller Zustand | Ziel-Store | Migrationskomplexität |
|-------------------|------------|------------------------|
| token, email, password, authMode | authStore | Niedrig |
| sessions, currentSessionId, messages | sessionStore | Mittel |
| activeView, adminTab | uiStore | Niedrig |
| showFeedbackDialog, feedbackComment | feedbackStore | Niedrig |
| motd, motdConfig, motdDismissed | motdStore | Mittel |

## Beispiel: Migration einer Funktion

### Vorher (in app.js):

```javascript
// In der monolithischen app.js
const login = async () => {
  if (loading.value) return;
  
  loading.value = true;
  errorMessage.value = '';
  
  try {
    const response = await axios.post('/api/auth/login', {
      email: email.value,
      password: password.value
    });
    
    if (response.data.success) {
      token.value = response.data.token;
      userRole.value = response.data.role;
      localStorage.setItem('token', token.value);
      
      // Lade Sessions nach erfolgreicher Anmeldung
      await loadSessions();
      
      // Lade die letzte aktive Session, falls vorhanden
      const lastSessionId = localStorage.getItem('last_session_id');
      if (lastSessionId && sessions.value.some(s => s.id === lastSessionId)) {
        await loadSession(lastSessionId);
      }
      
      // Lade MOTD
      await loadMotd();
    } else {
      errorMessage.value = response.data.message || 'Anmeldung fehlgeschlagen.';
    }
  } catch (error) {
    console.error('Login error:', error);
    errorMessage.value = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
  } finally {
    loading.value = false;
  }
};
```

### Nachher (in Stores und Composables):

```typescript
// In authStore.js (Pinia)
export const useAuthStore = defineStore('auth', () => {
  const token = ref('');
  const userRole = ref('');
  const email = ref('');
  const password = ref('');
  const loading = ref(false);
  const errorMessage = ref('');
  const authMode = ref('login');
  
  const isAuthenticated = computed(() => !!token.value);
  
  // Von der monolithischen App migrierte Funktion
  async function login() {
    if (loading.value) return;
    
    loading.value = true;
    errorMessage.value = '';
    
    try {
      const response = await axios.post('/api/auth/login', {
        email: email.value,
        password: password.value
      });
      
      if (response.data.success) {
        token.value = response.data.token;
        userRole.value = response.data.role;
        localStorage.setItem('token', token.value);
        
        // Legacy-Brücke (temporär während der Migration)
        if (window.onLoginSuccess) {
          window.onLoginSuccess(token.value, response.data.role);
        }
        
        return true;
      } else {
        errorMessage.value = response.data.message || 'Anmeldung fehlgeschlagen.';
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      errorMessage.value = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
      return false;
    } finally {
      loading.value = false;
    }
  }
  
  // Weitere Funktionen...
  
  return {
    // State
    token,
    userRole,
    email,
    password,
    loading,
    errorMessage,
    authMode,
    
    // Getters
    isAuthenticated,
    
    // Actions
    login,
    logout,
    register,
    resetPassword,
    setAuthMode
  };
});

// In useAuth.js (Composable)
export function useAuth() {
  const authStore = useAuthStore();
  const router = useRouter();
  
  // Erweiterte Funktionalität über den Store hinaus
  async function loginAndRedirect() {
    const success = await authStore.login();
    
    if (success) {
      // Lade Daten nach der Anmeldung
      await Promise.all([
        useSessionStore().loadSessions(),
        useMotdStore().loadMotd()
      ]);
      
      // Lade die letzte aktive Session
      const sessionStore = useSessionStore();
      const lastSessionId = localStorage.getItem('last_session_id');
      if (lastSessionId && sessionStore.sessions.some(s => s.id === lastSessionId)) {
        await sessionStore.loadSession(lastSessionId);
      }
    }
    
    return success;
  }
  
  // Weitere Hilfsfunktionen...
  
  return {
    loginAndRedirect,
    // Weitere Funktionen...
  };
}
```

## Legacy-Bridge-Beispiel

```javascript
// bridge.js - Verbindung zwischen altem und neuem Code
import { watch } from 'vue';
import { useAuthStore } from './stores/auth';
import { useSessionStore } from './stores/session';
import { useMotdStore } from './stores/motd';

export function setupBridge() {
  const authStore = useAuthStore();
  const sessionStore = useSessionStore();
  const motdStore = useMotdStore();
  
  // Exportiere Funktionen für den Legacy-Code
  window.login = async (email, password) => {
    authStore.email = email;
    authStore.password = password;
    return await authStore.login();
  };
  
  window.logout = () => {
    authStore.logout();
  };
  
  window.loadSession = async (sessionId) => {
    return await sessionStore.loadSession(sessionId);
  };
  
  window.sendMessage = async (message) => {
    return await sessionStore.sendMessage(message);
  };
  
  // Synchronisiere Änderungen vom neuen zum alten Code
  watch(() => sessionStore.messages, (newMessages) => {
    if (window.onMessagesUpdated) {
      window.onMessagesUpdated(newMessages);
    }
  });
  
  watch(() => motdStore.motd, (newMotd) => {
    if (window.onMotdUpdated) {
      window.onMotdUpdated(newMotd);
    }
  });
  
  // Synchronisiere Änderungen vom alten zum neuen Code
  window.updateStoreState = (storeName, stateName, value) => {
    switch (storeName) {
      case 'auth':
        if (authStore[stateName] !== undefined) {
          authStore[stateName] = value;
        }
        break;
      case 'session':
        if (sessionStore[stateName] !== undefined) {
          sessionStore[stateName] = value;
        }
        break;
      case 'motd':
        if (motdStore[stateName] !== undefined) {
          motdStore[stateName] = value;
        }
        break;
    }
  };
}
```

## Feature-Toggle-Beispiel

```typescript
// stores/featureToggles.js
import { defineStore } from 'pinia';

export const useFeatureTogglesStore = defineStore('featureToggles', {
  state: () => ({
    // Komponenten-Toggles
    useNewAuth: false,
    useNewChat: false,
    useNewAdmin: false,
    useNewSettings: false,
    
    // Funktions-Toggles
    useNewSessionManagement: false,
    useNewMessageHandling: false,
    useNewFeedbackSystem: false
  }),
  
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'feature-toggles',
        storage: localStorage
      }
    ]
  },
  
  getters: {
    // Logische Gruppierungen von Features
    isUsingNewUserInterface: (state) => {
      return state.useNewAuth && state.useNewChat && state.useNewAdmin;
    }
  },
  
  actions: {
    enableFeature(feature) {
      if (this[feature] !== undefined) {
        this[feature] = true;
      }
    },
    
    disableFeature(feature) {
      if (this[feature] !== undefined) {
        this[feature] = false;
      }
    },
    
    // Feature-Flag für das gesamte System umschalten
    toggleAllFeatures(enabled) {
      Object.keys(this.$state).forEach(key => {
        this[key] = enabled;
      });
    },
    
    // Zurücksetzen aller Feature-Flags
    resetFeatures() {
      Object.keys(this.$state).forEach(key => {
        this[key] = false;
      });
    }
  }
});
```

## Schrittfolge für die Migration

1. Infrastruktur einrichten (Vite, TypeScript, Pinia)
2. Stores definieren, zunächst ohne Verwendung 
3. Einen kleinen, isolierten Funktionsbereich (z.B. MOTD) vollständig migrieren
4. Feature-Toggle für diesen Bereich implementieren
5. Mit kleinen, überschaubaren Schritten weitere Funktionsbereiche migrieren
6. Kontinuierlich testen und anpassen
7. Bridge für alte App.js bauen, um Änderungen zu synchronisieren
8. Schritt für Schritt neue Features aktivieren
9. Alt-Code zurückbauen, wenn die Stabilität gewährleistet ist

## Wichtige Erfolgsfaktoren

1. **Inkrementeller Ansatz**: Kleine, unabhängige Änderungen statt einer großen Umstellung
2. **Umfassende Tests**: Ausführliche Tests für jede migrierte Komponente
3. **Klare Grenzen**: Deutliche Trennung zwischen altem und neuem Code
4. **Robuste Brücken**: Zuverlässige Synchronisation zwischen Legacy und neuem Code
5. **Benutzergesteuertes Roll-out**: Feature-Toggles für kontrollierte Einführung
6. **Benutzer-Feedback**: Frühe Benutzerrückmeldungen zu migrierten Komponenten