import { watch, onMounted, onBeforeUnmount } from "vue";
import { useAuthStore } from "../stores/auth";
import { useSessionsStore } from "../stores/sessions";
import { useUIStore } from "../stores/ui";
import { useSettingsStore } from "../stores/settings";

/**
 * Bridge um Legacy-Code mit den Pinia Stores zu verbinden
 *
 * Diese Bridge stellt globale Funktionen zur Verfügung, die vom Legacy-Code verwendet werden können,
 * und leitet Ereignisse zwischen Legacy-Code und Vue-Komponenten weiter.
 */

// EventBus für die Kommunikation zwischen Legacy-Code und Vue
class EventBus {
  private listeners: Map<string, Array<(data?: any) => void>> = new Map();

  on(event: string, callback: (data?: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    // Unsubscribe-Funktion
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  emit(event: string, data?: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((callback) => callback(data));
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

// Singleton-Instanz des EventBus
export const bus = new EventBus();

/**
 * Bridge-Funktionen für Legacy-Code
 */
export function setupBridge() {
  // Store-Referenzen
  const authStore = useAuthStore();
  const sessionsStore = useSessionsStore();
  const uiStore = useUIStore();
  const settingsStore = useSettingsStore();

  // Feature-Toggle für die Bridge-Funktionalität
  const bridgeEnabled = true;

  // Zu bereinigende Event-Listener
  const cleanupFunctions: Array<() => void> = [];

  /**
   * Initialisiert globale Funktionen für den Legacy-Code
   */
  function exposeGlobalAPI() {
    // Auth-Funktionen
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
      },
      hasRole: (role: string) => {
        return authStore.hasRole(role);
      },
      getUser: () => {
        return authStore.user;
      },
    };

    // Session-Funktionen
    window.nscaleChat = {
      createSession: async (title?: string) => {
        return await sessionsStore.createSession(title || "Neue Unterhaltung");
      },
      sendMessage: async (sessionId: string, content: string) => {
        return await sessionsStore.sendMessage({ sessionId, content });
      },
      getSessions: () => {
        return sessionsStore.sessions;
      },
      getCurrentSession: () => {
        return sessionsStore.currentSession;
      },
      setCurrentSession: async (sessionId: string) => {
        return await sessionsStore.setCurrentSession(sessionId);
      },
      getMessages: (sessionId: string) => {
        return sessionsStore.messages[sessionId] || [];
      },
      cancelStreaming: () => {
        sessionsStore.cancelStreaming();
      },
    };

    // UI-Funktionen
    window.nscaleUI = {
      toggleDarkMode: () => {
        uiStore.toggleDarkMode();
      },
      isDarkMode: () => {
        return uiStore.isDarkMode;
      },
      openSidebar: () => {
        uiStore.openSidebar();
      },
      closeSidebar: () => {
        uiStore.closeSidebar();
      },
      showToast: (message: string, type: string = "info") => {
        if (type === "success") {
          uiStore.showSuccess(message);
        } else if (type === "error") {
          uiStore.showError(message);
        } else if (type === "warning") {
          uiStore.showWarning(message);
        } else {
          uiStore.showInfo(message);
        }
      },
      openModal: (title: string, content: string, options: any = {}) => {
        return uiStore.openModal({
          title,
          content,
          ...options,
        });
      },
      closeModal: (modalId: string) => {
        uiStore.closeModal(modalId);
      },
    };

    // Settings-Funktionen
    window.nscaleSettings = {
      getTheme: () => {
        return settingsStore.currentTheme;
      },
      setTheme: (themeId: string) => {
        settingsStore.setTheme(themeId);
      },
      getFontSize: () => {
        return settingsStore.fontSize;
      },
      setFontSize: (size: number) => {
        settingsStore.setFontSize(size);
      },
      getSetting: (key: string) => {
        return settingsStore.getSetting(key);
      },
      setSetting: (key: string, value: any) => {
        settingsStore.setSetting(key, value);
      },
    };

    // Event-Bridge für Legacy-Event-Kommunikation
    window.nscaleEvents = {
      emit: (event: string, data?: any) => {
        bus.emit(event, data);
      },
      on: (event: string, callback: (data?: any) => void) => {
        const unsubscribe = bus.on(event, callback);
        cleanupFunctions.push(unsubscribe);
        return unsubscribe;
      },
    };

    console.log("nscale Bridge: Global API initialisiert");
  }

  /**
   * Beobachtet Store-Änderungen und sendet Ereignisse
   */
  function setupStoreWatchers() {
    // Auth-Store-Änderungen beobachten
    const unwatchAuth = watch(
      () => authStore.isAuthenticated,
      (isAuthenticated) => {
        bus.emit("auth:changed", { isAuthenticated });

        if (isAuthenticated) {
          bus.emit("auth:login", { user: authStore.user });
        } else {
          bus.emit("auth:logout");
        }
      },
    );
    cleanupFunctions.push(unwatchAuth);

    // Sessions-Store-Änderungen beobachten
    const unwatchSessions = watch(
      () => sessionsStore.currentSessionId,
      (sessionId) => {
        if (sessionId) {
          bus.emit("session:changed", {
            sessionId,
            session: sessionsStore.currentSession,
          });
        }
      },
    );
    cleanupFunctions.push(unwatchSessions);

    // UI-Store-Änderungen beobachten
    const unwatchDarkMode = watch(
      () => uiStore.darkMode,
      (isDark) => {
        bus.emit("ui:darkModeChanged", { isDark });
      },
    );
    cleanupFunctions.push(unwatchDarkMode);

    console.log("nscale Bridge: Store-Watcher initialisiert");
  }

  /**
   * Verbindet Legacy-Events mit Store-Aktionen
   */
  function setupLegacyEventListeners() {
    // Globales CustomEvent-Handling für Legacy-Code
    const handleLegacyEvent = (event: CustomEvent) => {
      const { type, detail } = event;

      // Auth-Events
      if (type === "nscale:login") {
        authStore.login(detail);
      } else if (type === "nscale:logout") {
        authStore.logout();
      }

      // Session-Events
      else if (type === "nscale:createSession") {
        sessionsStore.createSession(detail?.title);
      } else if (type === "nscale:sendMessage") {
        sessionsStore.sendMessage({
          sessionId: detail.sessionId,
          content: detail.content,
        });
      } else if (type === "nscale:setCurrentSession") {
        sessionsStore.setCurrentSession(detail.sessionId);
      }

      // UI-Events
      else if (type === "nscale:toggleDarkMode") {
        uiStore.toggleDarkMode();
      } else if (type === "nscale:showToast") {
        const { message, type: toastType } = detail;
        if (toastType === "success") {
          uiStore.showSuccess(message);
        } else if (toastType === "error") {
          uiStore.showError(message);
        } else if (toastType === "warning") {
          uiStore.showWarning(message);
        } else {
          uiStore.showInfo(message);
        }
      }

      // Settings-Events
      else if (type === "nscale:setTheme") {
        settingsStore.setTheme(detail.themeId);
      } else if (type === "nscale:setSetting") {
        settingsStore.setSetting(detail.key, detail.value);
      }
    };

    window.addEventListener("nscale", handleLegacyEvent as EventListener);
    cleanupFunctions.push(() => {
      window.removeEventListener("nscale", handleLegacyEvent as EventListener);
    });

    console.log("nscale Bridge: Legacy-Event-Listener initialisiert");
  }

  /**
   * Bereinigt alle Event-Listener
   */
  function cleanup() {
    cleanupFunctions.forEach((fn) => fn());
    cleanupFunctions.length = 0;
    bus.clear();

    // Globale API zurücksetzen
    delete window.nscaleAuth;
    delete window.nscaleChat;
    delete window.nscaleUI;
    delete window.nscaleSettings;
    delete window.nscaleEvents;

    console.log("nscale Bridge: Cleanup durchgeführt");
  }

  // Bridge nur initialisieren, wenn aktiviert
  if (bridgeEnabled) {
    exposeGlobalAPI();
    setupStoreWatchers();
    setupLegacyEventListeners();
  }

  // Initialisierungsstatus zurückgeben
  return {
    enabled: bridgeEnabled,
    cleanup,
  };
}

// Typen für globale API-Erweiterungen
declare global {
  interface Window {
    nscaleAuth?: {
      login: (email: string, password: string) => Promise<boolean>;
      logout: () => void;
      getToken: () => string | null;
      isAuthenticated: () => boolean;
      hasRole: (role: string) => boolean;
      getUser: () => any;
    };
    nscaleChat?: {
      createSession: (title?: string) => Promise<string>;
      sendMessage: (sessionId: string, content: string) => Promise<void>;
      getSessions: () => any[];
      getCurrentSession: () => any;
      setCurrentSession: (sessionId: string) => Promise<void>;
      getMessages: (sessionId: string) => any[];
      cancelStreaming: () => void;
    };
    nscaleUI?: {
      toggleDarkMode: () => void;
      isDarkMode: () => boolean;
      openSidebar: () => void;
      closeSidebar: () => void;
      showToast: (message: string, type?: string) => void;
      openModal: (title: string, content: string, options?: any) => string;
      closeModal: (modalId: string) => void;
    };
    nscaleSettings?: {
      getTheme: () => any;
      setTheme: (themeId: string) => void;
      getFontSize: () => number;
      setFontSize: (size: number) => void;
      getSetting: (key: string) => any;
      setSetting: (key: string, value: any) => void;
    };
    nscaleEvents?: {
      emit: (event: string, data?: any) => void;
      on: (event: string, callback: (data?: any) => void) => () => void;
    };
  }
}

// Komposable für Vue-Komponenten
export function useBridge() {
  const bridge = setupBridge();

  // Automatisch aufräumen, wenn die Komponente zerstört wird
  onBeforeUnmount(() => {
    if (bridge.enabled) {
      bridge.cleanup();
    }
  });

  return {
    bus,
    isEnabled: bridge.enabled,
  };
}

/**
 * Plugin für die Installation in der Vue-App
 */
export default {
  install(app: any) {
    const bridge = setupBridge();

    // Die Bridge-Instanz für Komponenten verfügbar machen
    app.provide("bridge", {
      bus,
      isEnabled: bridge.enabled,
    });

    console.log("nscale Bridge Plugin installiert");
  },
};
