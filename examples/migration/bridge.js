// migration/bridge.js
import { watch, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useSessionStore } from '@/stores/session';
import { useMotdStore } from '@/stores/motd';
import { useFeatureTogglesStore } from '@/stores/featureToggles';

/**
 * Bridge zwischen altem und neuem Code
 * 
 * Dieses Modul stellt eine Verbindung zwischen dem älteren, monolithischen Code
 * und der neuen Struktur mit Vue 3 SFCs und Pinia Stores her.
 * Es synchronisiert Zustandsänderungen in beide Richtungen und exportiert 
 * Funktionen für den Legacy-Code.
 */
export function setupBridge() {
  // Store-Referenzen
  const authStore = useAuthStore();
  const sessionStore = useSessionStore();
  const motdStore = useMotdStore();
  const featureTogglesStore = useFeatureTogglesStore();
  
  // Liste der Watcher zum Bereinigen
  const watchers = [];
  
  // Alte globale Funktionen mit neuen Store-Aktionen verbinden
  function setupGlobalFunctions() {
    // Auth-Funktionen
    window.login = async (email, password) => {
      if (featureTogglesStore.useStoreAuth) {
        authStore.email = email;
        authStore.password = password;
        return await authStore.login();
      }
      return false; // Wenn das Feature deaktiviert ist, tu nichts
    };
    
    window.logout = () => {
      if (featureTogglesStore.useStoreAuth) {
        authStore.logout();
      }
    };
    
    window.checkAuthStatus = () => {
      if (featureTogglesStore.useStoreAuth) {
        return authStore.isAuthenticated;
      }
      return !!localStorage.getItem('token');
    };
    
    // Session-Funktionen
    window.loadSession = async (sessionId) => {
      if (featureTogglesStore.useStoreSession) {
        return await sessionStore.loadSession(sessionId);
      }
      return false;
    };
    
    window.loadSessions = async () => {
      if (featureTogglesStore.useStoreSession) {
        return await sessionStore.loadSessions();
      }
      return false;
    };
    
    window.sendMessage = async (message) => {
      if (featureTogglesStore.useStoreSession) {
        return await sessionStore.sendMessage(message);
      }
      return false;
    };
    
    window.startNewSession = async () => {
      if (featureTogglesStore.useStoreSession) {
        return await sessionStore.startNewSession();
      }
      return false;
    };
    
    window.deleteSession = async (sessionId) => {
      if (featureTogglesStore.useStoreSession) {
        return await sessionStore.deleteSession(sessionId);
      }
      return false;
    };
    
    window.updateSessionTitle = async (sessionId) => {
      if (featureTogglesStore.useStoreSession) {
        return await sessionStore.updateSessionTitle(sessionId);
      }
      return false;
    };
    
    // MOTD-Funktionen
    window.loadMotd = async () => {
      if (featureTogglesStore.useStoreMotd) {
        return await motdStore.loadMotd();
      }
      return false;
    };
    
    window.dismissMotd = () => {
      if (featureTogglesStore.useStoreMotd) {
        motdStore.dismissMotd();
      }
    };
    
    // Feature-Toggle-Funktion
    window.toggleFeature = (feature, enabled) => {
      if (enabled) {
        featureTogglesStore.enableFeature(feature);
      } else {
        featureTogglesStore.disableFeature(feature);
      }
    };
    
    console.log('[Bridge] Globale Funktionen eingerichtet');
  }
  
  // Store-Änderungen zum Legacy-Code synchronisieren
  function setupStoreToLegacySync() {
    // Auth-Store-Änderungen
    if (featureTogglesStore.useStoreAuth) {
      const authWatcher = watch(
        () => ({
          token: authStore.token,
          userRole: authStore.userRole,
          isAuthenticated: authStore.isAuthenticated
        }),
        (newValues) => {
          if (window.onAuthStateChanged) {
            window.onAuthStateChanged(newValues);
          }
        }
      );
      watchers.push(authWatcher);
    }
    
    // Session-Store-Änderungen
    if (featureTogglesStore.useStoreSession) {
      const sessionsWatcher = watch(
        () => sessionStore.sessions,
        (newSessions) => {
          if (window.onSessionsUpdated) {
            window.onSessionsUpdated(newSessions);
          }
        }
      );
      watchers.push(sessionsWatcher);
      
      const messagesWatcher = watch(
        () => sessionStore.messages,
        (newMessages) => {
          if (window.onMessagesUpdated) {
            window.onMessagesUpdated(newMessages);
          }
        }
      );
      watchers.push(messagesWatcher);
      
      const currentSessionWatcher = watch(
        () => sessionStore.currentSessionId,
        (sessionId) => {
          if (window.onCurrentSessionChanged) {
            window.onCurrentSessionChanged(sessionId);
          }
        }
      );
      watchers.push(currentSessionWatcher);
      
      const streamingWatcher = watch(
        () => sessionStore.isStreaming,
        (isStreaming) => {
          if (window.onStreamingStateChanged) {
            window.onStreamingStateChanged(isStreaming);
          }
        }
      );
      watchers.push(streamingWatcher);
    }
    
    // MOTD-Store-Änderungen
    if (featureTogglesStore.useStoreMotd) {
      const motdWatcher = watch(
        () => motdStore.motd,
        (newMotd) => {
          if (window.onMotdUpdated) {
            window.onMotdUpdated(newMotd);
          }
        }
      );
      watchers.push(motdWatcher);
    }
    
    console.log('[Bridge] Store-zu-Legacy-Synchronisation eingerichtet');
  }
  
  // Legacy-Änderungen zu Stores synchronisieren
  function setupLegacyToStoreSync() {
    // Funktion zur Aktualisierung des Store-Zustands aus Legacy-Code
    window.updateStoreState = (storeName, stateName, value) => {
      console.log(`[Bridge] Update ${storeName}.${stateName} =`, value);
      
      switch (storeName) {
        case 'auth':
          if (featureTogglesStore.useStoreAuth && stateName in authStore) {
            authStore[stateName] = value;
          }
          break;
        
        case 'session':
          if (featureTogglesStore.useStoreSession && stateName in sessionStore) {
            sessionStore[stateName] = value;
          }
          break;
        
        case 'motd':
          if (featureTogglesStore.useStoreMotd && stateName in motdStore) {
            motdStore[stateName] = value;
          }
          break;
        
        default:
          console.warn(`[Bridge] Unbekannter Store: ${storeName}`);
      }
    };
    
    // Event-Listener für Legacy-DOM-Events
    function setupDomEventListeners() {
      // Beispiel: Auth-Status-Änderung
      document.addEventListener('auth-state-changed', (event) => {
        if (featureTogglesStore.useStoreAuth) {
          const { token, userRole } = event.detail;
          authStore.token = token;
          authStore.userRole = userRole;
        }
      });
      
      // Beispiel: Session ausgewählt
      document.addEventListener('session-selected', (event) => {
        if (featureTogglesStore.useStoreSession) {
          const { sessionId } = event.detail;
          sessionStore.loadSession(sessionId);
        }
      });
      
      // Weitere Event-Listener nach Bedarf...
    }
    
    setupDomEventListeners();
    console.log('[Bridge] Legacy-zu-Store-Synchronisation eingerichtet');
  }
  
  // Initialen Zustand aus localStorage in Stores laden
  function loadInitialState() {
    // Auth-State
    if (featureTogglesStore.useStoreAuth) {
      const token = localStorage.getItem('token');
      const userRole = localStorage.getItem('userRole');
      
      if (token) {
        authStore.token = token;
        authStore.userRole = userRole || '';
      }
    }
    
    // Session-State - nur IDs, Daten werden bei Bedarf geladen
    if (featureTogglesStore.useStoreSession) {
      const lastSessionId = localStorage.getItem('last_session_id');
      if (lastSessionId) {
        sessionStore.currentSessionId = lastSessionId;
      }
    }
    
    // MOTD-State
    if (featureTogglesStore.useStoreMotd) {
      const motdDismissed = localStorage.getItem('motd_dismissed') === 'true';
      if (motdDismissed) {
        motdStore.isDismissed = motdDismissed;
      }
    }
    
    console.log('[Bridge] Initialer Zustand geladen');
  }
  
  // Lebenszyklus-Management
  onMounted(() => {
    console.log('[Bridge] Initialisierung...');
    setupGlobalFunctions();
    loadInitialState();
    setupStoreToLegacySync();
    setupLegacyToStoreSync();
    
    // Registriere die Bridge in window für Debugging
    window.__nscale_bridge = {
      authStore,
      sessionStore,
      motdStore,
      featureTogglesStore
    };
    
    console.log('[Bridge] Vollständig initialisiert');
  });
  
  onBeforeUnmount(() => {
    // Aufräumen
    watchers.forEach(unwatch => unwatch());
    
    // Globale Funktionen entfernen
    const globalFunctions = [
      'login', 'logout', 'checkAuthStatus', 
      'loadSession', 'loadSessions', 'sendMessage', 
      'startNewSession', 'deleteSession', 'updateSessionTitle',
      'loadMotd', 'dismissMotd', 'toggleFeature', 
      'updateStoreState', '__nscale_bridge'
    ];
    
    globalFunctions.forEach(fnName => {
      if (window[fnName]) {
        delete window[fnName];
      }
    });
    
    console.log('[Bridge] Aufgeräumt');
  });
  
  // Öffentliche API
  return {
    setup() {
      console.log('[Bridge] Setup bereits durch onMounted ausgeführt');
    },
    refreshSync() {
      watchers.forEach(unwatch => unwatch());
      watchers.length = 0;
      setupStoreToLegacySync();
      setupLegacyToStoreSync();
      console.log('[Bridge] Synchronisation aktualisiert');
    },
    isActive() {
      return true;
    }
  };
}