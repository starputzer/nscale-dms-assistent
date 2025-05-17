/**
 * Bridge zur Integration der Pinia-Stores mit Legacy-Code
 *
 * Diese Bridge bietet eine nahtlose Kommunikation zwischen den modernen Vue 3 Stores
 * und der bestehenden JavaScript-Implementierung. Sie ermöglicht Legacy-Code-Komponenten,
 * auf Pinia-Store-Funktionen zuzugreifen und auf Store-Änderungen zu reagieren.
 */

import { watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useSessionsStore } from "@/stores/sessions";
import { useUIStore } from "@/stores/ui";
import { useSettingsStore } from "@/stores/settings";
import { useFeatureTogglesStore } from "@/stores/featureToggles";

// Typen für globale Bridge-API
export interface BridgeAPI {
  auth: AuthBridgeAPI;
  sessions: SessionsBridgeAPI;
  ui: UIBridgeAPI;
  settings: SettingsBridgeAPI;
  events: EventBridgeAPI;
  features: FeaturesBridgeAPI;
}

// Auth Bridge Typen
export interface AuthBridgeAPI {
  login(email: string, password: string): Promise<boolean>;
  logout(): Promise<void>;
  getToken(): string | null;
  refreshToken(): Promise<boolean>;
  isAuthenticated(): boolean;
  hasRole(role: string): boolean;
  hasAnyRole(roles: string[]): boolean;
  getUser(): any;
  getUserRoles(): string[];
}

// Sessions Bridge Typen
export interface SessionsBridgeAPI {
  createSession(title?: string): Promise<string>;
  sendMessage(sessionId: string, content: string): Promise<void>;
  getSessions(): any[];
  getCurrentSession(): any;
  setCurrentSession(sessionId: string): Promise<void>;
  getMessages(sessionId: string): any[];
  cancelStreaming(): void;
  deleteSession(sessionId: string): Promise<void>;
  updateSessionTitle(sessionId: string, newTitle: string): Promise<void>;
  togglePinSession(sessionId: string): Promise<void>;
  exportData(): string;
  importData(jsonData: string): boolean;
}

// UI Bridge Typen
export interface UIBridgeAPI {
  toggleDarkMode(): void;
  isDarkMode(): boolean;
  openSidebar(): void;
  closeSidebar(): void;
  toggleSidebar(): void;
  toggleSidebarCollapse(): void;
  setSidebarTab(tabId: string): void;
  openModal(options: any): string;
  closeModal(modalId: string): void;
  confirm(message: string, options?: any): Promise<boolean>;
  showToast(message: string, type?: string, options?: any): string;
  setLoading(loading: boolean, message?: string): void;
  setViewMode(mode: string): void;
}

// Settings Bridge Typen
export interface SettingsBridgeAPI {
  getTheme(): any;
  setTheme(themeId: string): void;
  getFontSize(): number;
  setFontSize(size: number): void;
  getSetting(key: string): any;
  setSetting(key: string, value: any): void;
  updateA11ySettings(settings: any): void;
  resetToDefault(): void;
}

// Feature Toggles Bridge Typen
export interface FeaturesBridgeAPI {
  isEnabled(featureName: string): boolean;
  enable(featureName: string): void;
  disable(featureName: string): void;
  toggle(featureName: string): boolean;
  enableLegacyMode(): void;
  getAllFeatures(): Record<string, boolean>;
}

// Event Bridge Typen
export interface EventBridgeAPI {
  emit(event: string, data?: any): void;
  on(event: string, callback: (data?: any) => void): () => void;
  off(event: string, callback: (data?: any) => void): void;
}

/**
 * Event-Bus für die Legacy-Integration
 */
class EventBus {
  private listeners: Map<string, Map<Function, EventListener>> = new Map();

  on(event: string, callback: (data?: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Map());
    }

    const listenerMap = this.listeners.get(event)!;
    const eventListener = ((e: CustomEvent) =>
      callback(e.detail)) as EventListener;

    listenerMap.set(callback, eventListener);
    window.addEventListener(`nscale:${event}`, eventListener);

    return () => this.off(event, callback);
  }

  off(event: string, callback: (data?: any) => void): void {
    if (!this.listeners.has(event)) return;

    const listenerMap = this.listeners.get(event)!;
    const eventListener = listenerMap.get(callback);

    if (eventListener) {
      window.removeEventListener(`nscale:${event}`, eventListener);
      listenerMap.delete(callback);

      // Map entfernen, wenn keine Listener mehr vorhanden sind
      if (listenerMap.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event: string, data?: any): void {
    const customEvent = new CustomEvent(`nscale:${event}`, {
      detail: data,
      bubbles: true,
      cancelable: true,
    });

    window.dispatchEvent(customEvent);
  }

  clear(): void {
    // Alle Event-Listener entfernen
    this.listeners.forEach((listenerMap, event) => {
      listenerMap.forEach((eventListener) => {
        window.removeEventListener(`nscale:${event}`, eventListener);
      });
    });

    this.listeners.clear();
  }
}

// Globale Event-Bus-Instanz
export const bus = new EventBus();

/**
 * Initialisiert die Bridge mit allen Stores
 */
export function setupStoreBridge(): BridgeAPI {
  // Store-Referenzen
  const authStore = useAuthStore();
  const sessionsStore = useSessionsStore();
  const uiStore = useUIStore();
  const settingsStore = useSettingsStore();
  const featureTogglesStore = useFeatureTogglesStore();

  // Cleaup-Funktionen-Liste
  const cleanupFunctions: Array<() => void> = [];

  /**
   * Auth Bridge API
   */
  const authBridge: AuthBridgeAPI = {
    async login(email: string, password: string): Promise<boolean> {
      return await authStore.login({ email, password });
    },

    async logout(): Promise<void> {
      await authStore.logout();
    },

    getToken(): string | null {
      return authStore.token;
    },

    async refreshToken(): Promise<boolean> {
      return await authStore.refreshTokenIfNeeded();
    },

    isAuthenticated(): boolean {
      return authStore.isAuthenticated;
    },

    hasRole(role: string): boolean {
      return authStore.hasRole(role);
    },

    hasAnyRole(roles: string[]): boolean {
      return authStore.hasAnyRole(roles);
    },

    getUser(): any {
      return authStore.user;
    },

    getUserRoles(): string[] {
      return authStore.user?.roles || [];
    },
  };

  /**
   * Sessions Bridge API
   */
  const sessionsBridge: SessionsBridgeAPI = {
    async createSession(title?: string): Promise<string> {
      return await sessionsStore.createSession(title || "Neue Unterhaltung");
    },

    async sendMessage(sessionId: string, content: string): Promise<void> {
      await sessionsStore.sendMessage({ sessionId, content });
    },

    getSessions(): any[] {
      return sessionsStore.sessions;
    },

    getCurrentSession(): any {
      return sessionsStore.currentSession;
    },

    async setCurrentSession(sessionId: string): Promise<void> {
      await sessionsStore.setCurrentSession(sessionId);
    },

    getMessages(sessionId: string): any[] {
      return sessionsStore.messages[sessionId] || [];
    },

    cancelStreaming(): void {
      sessionsStore.cancelStreaming();
    },

    async deleteSession(sessionId: string): Promise<void> {
      await sessionsStore.archiveSession(sessionId);
    },

    async updateSessionTitle(
      sessionId: string,
      newTitle: string,
    ): Promise<void> {
      await sessionsStore.updateSessionTitle(sessionId, newTitle);
    },

    async togglePinSession(sessionId: string): Promise<void> {
      await sessionsStore.togglePinSession(sessionId);
    },

    exportData(): string {
      return sessionsStore.exportData();
    },

    importData(jsonData: string): boolean {
      return sessionsStore.importData(jsonData);
    },
  };

  /**
   * UI Bridge API
   */
  const uiBridge: UIBridgeAPI = {
    toggleDarkMode(): void {
      uiStore.toggleDarkMode();
    },

    isDarkMode(): boolean {
      return uiStore.isDarkMode;
    },

    openSidebar(): void {
      uiStore.openSidebar();
    },

    closeSidebar(): void {
      uiStore.closeSidebar();
    },

    toggleSidebar(): void {
      uiStore.toggleSidebar();
    },

    toggleSidebarCollapse(): void {
      uiStore.toggleSidebarCollapse();
    },

    setSidebarTab(tabId: string): void {
      uiStore.setSidebarTab(tabId);
    },

    openModal(options: any): string {
      return uiStore.openModal(options);
    },

    closeModal(modalId: string): void {
      uiStore.closeModal(modalId);
    },

    confirm(message: string, options: any = {}): Promise<boolean> {
      return uiStore.confirm(message, options);
    },

    showToast(
      message: string,
      type: string = "info",
      options: any = {},
    ): string {
      switch (type) {
        case "success":
          return uiStore.showSuccess(message, options);
        case "error":
          return uiStore.showError(message, options);
        case "warning":
          return uiStore.showWarning(message, options);
        default:
          return uiStore.showInfo(message, options);
      }
    },

    setLoading(loading: boolean, message?: string): void {
      uiStore.setLoading(loading, message);
    },

    setViewMode(mode: string): void {
      if (["default", "focus", "compact", "presentation"].includes(mode)) {
        uiStore.setViewMode(mode as any);
      }
    },
  };

  /**
   * Settings Bridge API
   */
  const settingsBridge: SettingsBridgeAPI = {
    getTheme(): any {
      return settingsStore.currentTheme;
    },

    setTheme(themeId: string): void {
      settingsStore.setTheme(themeId);
    },

    getFontSize(): number {
      // Aktuellen Font-Size-Faktor in Pixelwert umrechnen
      const fontSizeMap: Record<string, number> = {
        small: 14,
        medium: 16,
        large: 18,
        "extra-large": 20,
      };

      return fontSizeMap[settingsStore.font.size] || 16;
    },

    setFontSize(size: number): void {
      // Pixelwert in Font-Size-Faktor umrechnen
      let fontSizeKey: string;

      if (size <= 14) fontSizeKey = "small";
      else if (size <= 16) fontSizeKey = "medium";
      else if (size <= 18) fontSizeKey = "large";
      else fontSizeKey = "extra-large";

      settingsStore.updateFontSettings({ size: fontSizeKey as any });
    },

    getSetting(key: string): any {
      // Einstellungen aus den verschiedenen Settings-Objekten abrufen
      const settingsMap: Record<string, () => any> = {
        // Font-Einstellungen
        "font.size": () => settingsStore.font.size,
        "font.family": () => settingsStore.font.family,
        "font.lineHeight": () => settingsStore.font.lineHeight,

        // Theme-Einstellungen
        "theme.current": () => settingsStore.theme.currentTheme,

        // A11y-Einstellungen
        "a11y.reduceMotion": () => settingsStore.a11y.reduceMotion,
        "a11y.highContrast": () => settingsStore.a11y.highContrast,
        "a11y.largeText": () => settingsStore.a11y.largeText,
        "a11y.screenReader": () => settingsStore.a11y.screenReader,

        // Nachrichteneinstellungen
        "messages.renderMarkdown": () => settingsStore.messages.renderMarkdown,
        "messages.codeHighlighting": () =>
          settingsStore.messages.codeHighlighting,
        "messages.showTimestamps": () => settingsStore.messages.showTimestamps,

        // Chat-Einstellungen
        "chat.autoSubmit": () => settingsStore.chat.autoSubmit,
        "chat.clearInputAfterSubmit": () =>
          settingsStore.chat.clearInputAfterSubmit,
        "chat.enableStreamedResponse": () =>
          settingsStore.chat.enableStreamedResponse,

        // Benachrichtigungseinstellungen
        "notifications.enabled": () => settingsStore.notifications.enabled,
        "notifications.sound": () => settingsStore.notifications.sound,
        "notifications.desktop": () => settingsStore.notifications.desktop,
      };

      if (key in settingsMap) {
        return settingsMap[key]();
      }

      // Fallback für unbekannte Schlüssel
      return undefined;
    },

    setSetting(key: string, value: any): void {
      // Einstellungen in den verschiedenen Settings-Objekten setzen
      if (key.startsWith("font.")) {
        const fontProp = key.split(".")[1];
        settingsStore.updateFontSettings({ [fontProp]: value });
      } else if (key.startsWith("theme.")) {
        if (key === "theme.current") {
          settingsStore.setTheme(value);
        }
      } else if (key.startsWith("a11y.")) {
        const a11yProp = key.split(".")[1];
        settingsStore.updateA11ySettings({ [a11yProp]: value });
      } else if (key.startsWith("messages.")) {
        const messagesProp = key.split(".")[1];
        settingsStore.updateMessageSettings({ [messagesProp]: value });
      } else if (key.startsWith("chat.")) {
        const chatProp = key.split(".")[1];
        settingsStore.updateChatSettings({ [chatProp]: value });
      } else if (key.startsWith("notifications.")) {
        const notificationsProp = key.split(".")[1];
        settingsStore.updateNotificationSettings({
          [notificationsProp]: value,
        });
      }
    },

    updateA11ySettings(settings: any): void {
      settingsStore.updateA11ySettings(settings);
    },

    resetToDefault(): void {
      settingsStore.resetToDefault();
    },
  };

  /**
   * Feature Toggles Bridge API
   */
  const featuresBridge: FeaturesBridgeAPI = {
    isEnabled(featureName: string): boolean {
      return featureTogglesStore.isEnabled(featureName);
    },

    enable(featureName: string): void {
      featureTogglesStore.enableFeature(featureName);
    },

    disable(featureName: string): void {
      featureTogglesStore.disableFeature(featureName);
    },

    toggle(featureName: string): boolean {
      return featureTogglesStore.toggleFeature(featureName);
    },

    enableLegacyMode(): void {
      featureTogglesStore.enableLegacyMode();
    },

    getAllFeatures(): Record<string, boolean> {
      return featureTogglesStore.features;
    },
  };

  /**
   * Events Bridge API
   */
  const eventsBridge: EventBridgeAPI = {
    emit(event: string, data?: any): void {
      bus.emit(event, data);
    },

    on(event: string, callback: (data?: any) => void): () => void {
      return bus.on(event, callback);
    },

    off(event: string, callback: (data?: any) => void): void {
      bus.off(event, callback);
    },
  };

  // Store-Watcher für Events einrichten

  // Auth-Store Änderungen beobachten
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

  // Sessions-Store Änderungen beobachten
  const unwatchSessionId = watch(
    () => sessionsStore.currentSessionId,
    (sessionId, oldSessionId) => {
      if (sessionId) {
        bus.emit("session:changed", {
          sessionId,
          oldSessionId,
          session: sessionsStore.currentSession,
        });
      }
    },
  );
  cleanupFunctions.push(unwatchSessionId);

  const unwatchSessions = watch(
    () => sessionsStore.sessions,
    (sessions) => {
      bus.emit("sessions:updated", { sessions });
    },
    { deep: true },
  );
  cleanupFunctions.push(unwatchSessions);

  // UI-Store Änderungen beobachten
  const unwatchDarkMode = watch(
    () => uiStore.darkMode,
    (isDark) => {
      bus.emit("ui:darkModeChanged", { isDark });
    },
  );
  cleanupFunctions.push(unwatchDarkMode);

  const unwatchSidebar = watch(
    () => [uiStore.sidebar.isOpen, uiStore.sidebar.collapsed],
    () => {
      bus.emit("ui:sidebarChanged", {
        isOpen: uiStore.sidebar.isOpen,
        isCollapsed: uiStore.sidebar.collapsed,
      });
    },
  );
  cleanupFunctions.push(unwatchSidebar);

  // Settings-Store Änderungen beobachten
  const unwatchTheme = watch(
    () => settingsStore.theme.currentTheme,
    (themeId) => {
      bus.emit("settings:themeChanged", { themeId });
    },
  );
  cleanupFunctions.push(unwatchTheme);

  /**
   * Bereinigt alle Event-Listener
   */
  function cleanup() {
    cleanupFunctions.forEach((fn) => fn());
    cleanupFunctions.length = 0;
    bus.clear();
  }

  // Vollständige Bridge-API zurückgeben
  return {
    auth: authBridge,
    sessions: sessionsBridge,
    ui: uiBridge,
    settings: settingsBridge,
    features: featuresBridge,
    events: eventsBridge,
  };
}

/**
 * Initialisiert die Bridge und macht sie als globales Objekt verfügbar
 */
export function initializeStoreBridge(): {
  bridge: BridgeAPI;
  cleanup: () => void;
} {
  // Bridge einrichten
  const bridge = setupStoreBridge();

  // Globale API am window-Objekt bereitstellen
  window.nscale = bridge;

  // Event auslösen, dass die Bridge bereit ist
  window.dispatchEvent(
    new CustomEvent("nscale:bridge:ready", {
      detail: { version: "2.0.0" },
    }),
  );

  // Cleanup-Funktion
  const cleanup = () => {
    delete window.nscale;
    bus.clear();
  };

  return { bridge, cleanup };
}

// Typdefinitionen für die globale Bridge
declare global {
  interface Window {
    nscale?: BridgeAPI;
  }
}

/**
 * Bridge-Komposable für Vue-Komponenten
 */
export function useStoreBridge() {
  const { bridge, cleanup } = initializeStoreBridge();

  // Beim Komponenten-Unmount aufräumen
  onBeforeUnmount(cleanup);

  return bridge;
}

// Funktion für den Vue-Plugin
export default {
  install(app: any) {
    const { bridge, cleanup } = initializeStoreBridge();

    // Bridge als Provide für alle Komponenten bereitstellen
    app.provide("nscaleBridge", bridge);

    // Cleanup beim App-Unmount
    app.unmount = ((original: () => void) => {
      return () => {
        cleanup();
        original();
      };
    })(app.unmount);

    console.log("Store Bridge Plugin installiert");
  },
};
