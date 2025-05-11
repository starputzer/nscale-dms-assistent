/**
 * Optimierte Version der Store-Bridge
 *
 * Diese verbesserte Bridge bietet:
 * - Verbesserte Performance durch selektive Reaktivität
 * - Effiziente Event-Propagation mit Batch-Updates
 * - Robuste Offline-Unterstützung
 * - Optimierte Speicherverwaltung für große Datensätze
 * - Erweiterte Diagnose- und Debug-Funktionen
 */

import { watch, shallowRef, ref, onBeforeUnmount, markRaw } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useSessionsStore } from "@/stores/sessions.optimized";
import { useUIStore } from "@/stores/ui";
import { useSettingsStore } from "@/stores/settings";
import { useFeatureTogglesStore } from "@/stores/featureToggles";
import { chatStorageService } from "@/services/storage/ChatStorageService";
import {
  offlineQueueService,
  OperationType,
  OperationPriority,
} from "@/services/api/OfflineQueueService";
import type { ChatSession, ChatMessage } from "@/types/session";

// Typen für die optimierte Bridge-API
export interface OptimizedBridgeAPI {
  auth: OptimizedAuthBridgeAPI;
  sessions: OptimizedSessionsBridgeAPI;
  ui: OptimizedUIBridgeAPI;
  settings: OptimizedSettingsBridgeAPI;
  events: OptimizedEventBridgeAPI;
  features: OptimizedFeaturesBridgeAPI;
  diagnostics: OptimizedDiagnosticsBridgeAPI;
}

// Auth Bridge Typen
export interface OptimizedAuthBridgeAPI {
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
export interface OptimizedSessionsBridgeAPI {
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

  // Neue optimierte Methoden
  getSessionsCount(): number;
  getMessagesCount(sessionId: string): number;
  isSessionArchived(sessionId: string): boolean;
  isMessageStreaming(messageId: string): boolean;
  loadOlderMessages(sessionId: string): Promise<ChatMessage[]>;
  getPendingMessagesCount(): number;
  hasPendingOperations(sessionId: string): boolean;
}

// UI Bridge Typen
export interface OptimizedUIBridgeAPI {
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
export interface OptimizedSettingsBridgeAPI {
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
export interface OptimizedFeaturesBridgeAPI {
  isEnabled(featureName: string): boolean;
  enable(featureName: string): void;
  disable(featureName: string): void;
  toggle(featureName: string): boolean;
  enableLegacyMode(): void;
  getAllFeatures(): Record<string, boolean>;
}

// Event Bridge Typen
export interface OptimizedEventBridgeAPI {
  emit(event: string, data?: any): void;
  on(event: string, callback: (data?: any) => void): () => void;
  off(event: string, callback: (data?: any) => void): void;
  once(event: string, callback: (data?: any) => void): () => void;
  batchEmit(events: Array<{ event: string; data?: any }>): void;
}

// Diagnostics Bridge Typen (neu)
export interface OptimizedDiagnosticsBridgeAPI {
  getStoreStats(): any;
  getStorageStats(): any;
  getOfflineQueueStats(): any;
  resetCache(): void;
  monitorPerformance(enable: boolean): void;
  getMemoryUsage(): any;
  logDiagnostics(): void;
}

/**
 * Optimierter Event-Bus für die Bridge
 * - Batched Events
 * - Performance-optimiert mit reduzierter Reaktivität
 */
class OptimizedEventBus {
  private listeners: Map<string, Map<Function, Function>> = new Map();
  private onceListeners: Set<Function> = new Set();
  private pendingEvents: Map<string, any[]> = new Map();
  private batchTimer: number | null = null;
  private batchInterval: number = 16; // ~60fps

  constructor() {
    // Event-Batching initialisieren
    this.processBatchedEvents = this.processBatchedEvents.bind(this);
  }

  on(event: string, callback: (data?: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Map());
    }

    const listenerMap = this.listeners.get(event)!;
    const wrappedCallback = ((e: CustomEvent) => {
      try {
        callback(e.detail);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    }) as Function;

    listenerMap.set(callback, wrappedCallback);

    window.addEventListener(
      `nscale:${event}`,
      wrappedCallback as EventListener,
    );

    return () => this.off(event, callback);
  }

  once(event: string, callback: (data?: any) => void): () => void {
    const wrappedCallback = (data?: any) => {
      callback(data);
      this.off(event, wrappedCallback);
      this.onceListeners.delete(wrappedCallback);
    };

    this.onceListeners.add(wrappedCallback);
    return this.on(event, wrappedCallback);
  }

  off(event: string, callback: (data?: any) => void): void {
    if (!this.listeners.has(event)) return;

    const listenerMap = this.listeners.get(event)!;
    const wrappedCallback = listenerMap.get(callback);

    if (wrappedCallback) {
      window.removeEventListener(
        `nscale:${event}`,
        wrappedCallback as EventListener,
      );
      listenerMap.delete(callback);

      // Map entfernen, wenn keine Listener mehr vorhanden sind
      if (listenerMap.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event: string, data?: any): void {
    // Event zur Batch-Verarbeitung hinzufügen
    if (!this.pendingEvents.has(event)) {
      this.pendingEvents.set(event, []);
    }

    this.pendingEvents.get(event)!.push(data);

    // Timer für Batch-Verarbeitung starten, falls noch nicht vorhanden
    if (this.batchTimer === null) {
      this.batchTimer = window.setTimeout(
        this.processBatchedEvents,
        this.batchInterval,
      );
    }
  }

  batchEmit(events: Array<{ event: string; data?: any }>): void {
    for (const { event, data } of events) {
      if (!this.pendingEvents.has(event)) {
        this.pendingEvents.set(event, []);
      }

      this.pendingEvents.get(event)!.push(data);
    }

    // Timer für Batch-Verarbeitung starten, falls noch nicht vorhanden
    if (this.batchTimer === null) {
      this.batchTimer = window.setTimeout(
        this.processBatchedEvents,
        this.batchInterval,
      );
    }
  }

  private processBatchedEvents(): void {
    this.batchTimer = null;

    // Alle gepufferten Events verarbeiten
    this.pendingEvents.forEach((dataArray, event) => {
      // Für jedes Event ein CustomEvent erstellen
      for (const data of dataArray) {
        const customEvent = new CustomEvent(`nscale:${event}`, {
          detail: data,
          bubbles: true,
          cancelable: true,
        });

        window.dispatchEvent(customEvent);
      }
    });

    // Gepufferte Events zurücksetzen
    this.pendingEvents.clear();
  }

  clear(): void {
    // Alle Event-Listener entfernen
    this.listeners.forEach((listenerMap, event) => {
      listenerMap.forEach((wrappedCallback, _) => {
        window.removeEventListener(
          `nscale:${event}`,
          wrappedCallback as EventListener,
        );
      });
    });

    // Batch-Timer löschen
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    this.listeners.clear();
    this.onceListeners.clear();
    this.pendingEvents.clear();
  }
}

// Optimierter Event-Bus
export const optimizedBus = new OptimizedEventBus();

/**
 * Diagnostics-Manager für Performance-Monitoring und Debugging
 */
class DiagnosticsManager {
  private isMonitoring: boolean = false;
  private metricsInterval: number | null = null;
  private cachedMetrics: Map<string, any> = new Map();
  private updateInterval: number = 5000; // 5 Sekunden

  constructor() {
    this.updateMetrics = this.updateMetrics.bind(this);
  }

  /**
   * Startet oder stoppt das Performance-Monitoring
   */
  toggleMonitoring(enable: boolean): void {
    if (enable && !this.isMonitoring) {
      this.isMonitoring = true;
      this.updateMetrics();
      this.metricsInterval = window.setInterval(
        this.updateMetrics,
        this.updateInterval,
      );

      console.info("Performance monitoring enabled");
    } else if (!enable && this.isMonitoring) {
      this.isMonitoring = false;

      if (this.metricsInterval !== null) {
        clearInterval(this.metricsInterval);
        this.metricsInterval = null;
      }

      console.info("Performance monitoring disabled");
    }
  }

  /**
   * Aktualisiert die zwischengespeicherten Metriken
   */
  private updateMetrics(): void {
    if (!this.isMonitoring) return;

    const now = Date.now();

    try {
      // Speicher-Nutzung
      const memory = this.getMemoryUsageData();
      this.cachedMetrics.set("memory", {
        value: memory,
        timestamp: now,
      });

      // Offline-Warteschlange
      const offlineQueue = this.getOfflineQueueData();
      this.cachedMetrics.set("offlineQueue", {
        value: offlineQueue,
        timestamp: now,
      });

      // Storage-Nutzung
      const storage = this.getStorageData();
      this.cachedMetrics.set("storage", {
        value: storage,
        timestamp: now,
      });
    } catch (error) {
      console.error("Error updating metrics:", error);
    }
  }

  /**
   * Gibt gecachte Metriken zurück oder aktualisiert sie, wenn veraltet
   */
  getMetrics(key: string): any {
    const maxAge = 10000; // 10 Sekunden
    const now = Date.now();

    if (this.cachedMetrics.has(key)) {
      const cachedData = this.cachedMetrics.get(key);

      // Wenn die Daten frisch genug sind, verwenden wir den Cache
      if (now - cachedData.timestamp < maxAge) {
        return cachedData.value;
      }
    }

    // Ansonsten neu berechnen
    let result: any;

    switch (key) {
      case "memory":
        result = this.getMemoryUsageData();
        break;
      case "offlineQueue":
        result = this.getOfflineQueueData();
        break;
      case "storage":
        result = this.getStorageData();
        break;
      default:
        result = null;
    }

    // Im Cache speichern
    this.cachedMetrics.set(key, {
      value: result,
      timestamp: now,
    });

    return result;
  }

  /**
   * Gibt Speichernutzungsdaten zurück
   */
  private getMemoryUsageData(): any {
    // Falls performance.memory verfügbar ist (Chrome)
    const memoryInfo: any = (performance as any).memory || {};

    return {
      totalJSHeapSize: memoryInfo.totalJSHeapSize,
      usedJSHeapSize: memoryInfo.usedJSHeapSize,
      jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit,
      // localStorage-Nutzung
      localStorageSize: this.calculateLocalStorageSize(),
      // SessionStorage-Nutzung
      sessionStorageSize: this.calculateSessionStorageSize(),
    };
  }

  /**
   * Berechnet die Größe des localStorage
   */
  private calculateLocalStorageSize(): number {
    try {
      let totalSize = 0;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (key) {
          const value = localStorage.getItem(key) || "";
          totalSize += key.length + value.length;
        }
      }

      return totalSize;
    } catch (error) {
      console.error("Error calculating localStorage size:", error);
      return 0;
    }
  }

  /**
   * Berechnet die Größe des sessionStorage
   */
  private calculateSessionStorageSize(): number {
    try {
      let totalSize = 0;

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);

        if (key) {
          const value = sessionStorage.getItem(key) || "";
          totalSize += key.length + value.length;
        }
      }

      return totalSize;
    } catch (error) {
      console.error("Error calculating sessionStorage size:", error);
      return 0;
    }
  }

  /**
   * Gibt Status-Informationen zur Offline-Warteschlange zurück
   */
  private getOfflineQueueData(): any {
    const queue = offlineQueueService.getQueue();

    return {
      queueLength: queue.length,
      pendingCount: offlineQueueService.getPendingCount(),
      byStatus: this.countByStatus(queue),
      byType: this.countByType(queue),
      bySession: this.countBySession(queue),
      isOnline: offlineQueueService.isNetworkOnline(),
    };
  }

  /**
   * Zählt Operationen nach Status
   */
  private countByStatus(queue: any[]): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const item of queue) {
      const status = item.status;
      counts[status] = (counts[status] || 0) + 1;
    }

    return counts;
  }

  /**
   * Zählt Operationen nach Typ
   */
  private countByType(queue: any[]): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const item of queue) {
      const type = item.type;
      counts[type] = (counts[type] || 0) + 1;
    }

    return counts;
  }

  /**
   * Zählt Operationen nach Session
   */
  private countBySession(queue: any[]): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const item of queue) {
      const sessionId = item.sessionId;
      counts[sessionId] = (counts[sessionId] || 0) + 1;
    }

    return counts;
  }

  /**
   * Gibt Informationen zum Speicher-Service zurück
   */
  private getStorageData(): any {
    return chatStorageService.getStorageStats();
  }

  /**
   * Loggt Diagnoseinformationen in die Konsole
   */
  logDiagnostics(): void {
    console.group("NScale Bridge Diagnostics");

    console.log("Memory Usage:", this.getMetrics("memory"));
    console.log("Storage Stats:", this.getMetrics("storage"));
    console.log("Offline Queue:", this.getMetrics("offlineQueue"));

    if (this.isMonitoring) {
      console.log("Performance monitoring is active");
    } else {
      console.log("Performance monitoring is disabled");
    }

    console.groupEnd();
  }

  /**
   * Bereinigt vor dem Herunterfahren
   */
  cleanup(): void {
    if (this.metricsInterval !== null) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    this.isMonitoring = false;
    this.cachedMetrics.clear();
  }
}

// Diagnostics-Manager erstellen
const diagnosticsManager = new DiagnosticsManager();

/**
 * Initialisiert die optimierte Bridge mit allen Stores
 */
export function setupOptimizedStoreBridge(): OptimizedBridgeAPI {
  // Store-Referenzen
  const authStore = useAuthStore();
  const sessionsStore = useSessionsStore();
  const uiStore = useUIStore();
  const settingsStore = useSettingsStore();
  const featureTogglesStore = useFeatureTogglesStore();

  // Cleaup-Funktionen-Liste
  const cleanupFunctions: Array<() => void> = [];

  // Status-Cache zur Reduzierung von Reaktivität
  const stateCache = shallowRef<{
    currentMessages: ChatMessage[];
    isStreaming: boolean;
    lastUpdate: number;
  }>({
    currentMessages: [],
    isStreaming: false,
    lastUpdate: Date.now(),
  });

  // Aktualisierungsintervall für den Cache
  const updateCacheInterval = 100; // ms
  let cacheUpdateTimer: number | null = null;

  // Aktualisiert den Status-Cache in festen Intervallen
  const updateStateCache = () => {
    const currentSessionId = sessionsStore.currentSessionId;

    if (currentSessionId) {
      stateCache.value = {
        currentMessages: sessionsStore.currentMessages,
        isStreaming: sessionsStore.isStreaming,
        lastUpdate: Date.now(),
      };
    }
  };

  // Startet die Cache-Aktualisierung
  const startCacheUpdates = () => {
    if (cacheUpdateTimer === null) {
      cacheUpdateTimer = window.setInterval(
        updateStateCache,
        updateCacheInterval,
      );
    }
  };

  // Stoppt die Cache-Aktualisierung
  const stopCacheUpdates = () => {
    if (cacheUpdateTimer !== null) {
      clearInterval(cacheUpdateTimer);
      cacheUpdateTimer = null;
    }
  };

  // Cache-Aktualisierung starten
  startCacheUpdates();

  // Cleanup-Funktion
  cleanupFunctions.push(() => {
    stopCacheUpdates();
    diagnosticsManager.cleanup();
  });

  /**
   * Auth Bridge API
   */
  const optimizedAuthBridge: OptimizedAuthBridgeAPI = {
    async login(email: string, password: string): Promise<boolean> {
      // Offline-Unterstützung
      if (!navigator.onLine) {
        throw new Error(
          "Keine Internetverbindung. Bitte versuchen Sie es später erneut.",
        );
      }

      const result = await authStore.login({ email, password });

      // Bei erfolgreicher Anmeldung Offline-Warteschlange verarbeiten
      if (result) {
        offlineQueueService.manualProcessQueue();
      }

      return result;
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
   * Sessions Bridge API (optimiert)
   */
  const optimizedSessionsBridge: OptimizedSessionsBridgeAPI = {
    async createSession(title?: string): Promise<string> {
      const sessionId = await sessionsStore.createSession(
        title || "Neue Unterhaltung",
      );

      // Wenn offline, zur Warteschlange hinzufügen
      if (!navigator.onLine) {
        offlineQueueService.addToQueue(
          OperationType.CREATE_SESSION,
          {
            title: title || "Neue Unterhaltung",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          sessionId,
          OperationPriority.HIGH,
        );
      }

      return sessionId;
    },

    async sendMessage(sessionId: string, content: string): Promise<void> {
      if (!content.trim() || !sessionId) return;

      try {
        // Lokale Verarbeitung
        await sessionsStore.sendMessage({ sessionId, content });

        // Wenn wir offline sind, zur Warteschlange hinzufügen
        if (!navigator.onLine) {
          offlineQueueService.addToQueue(
            OperationType.SEND_MESSAGE,
            { content, role: "user" },
            sessionId,
            OperationPriority.MEDIUM,
          );
        }
      } catch (error) {
        // Bei Fehlern trotzdem zur Warteschlange hinzufügen
        offlineQueueService.addToQueue(
          OperationType.SEND_MESSAGE,
          { content, role: "user" },
          sessionId,
          OperationPriority.MEDIUM,
        );

        throw error;
      }
    },

    getSessions(): any[] {
      return sessionsStore.sessions;
    },

    getCurrentSession(): any {
      return sessionsStore.currentSession;
    },

    async setCurrentSession(sessionId: string): Promise<void> {
      stopCacheUpdates();

      try {
        await sessionsStore.setCurrentSession(sessionId);

        // Cache direkt aktualisieren
        updateStateCache();
      } finally {
        startCacheUpdates();
      }
    },

    getMessages(sessionId: string): any[] {
      // Aus dem Cache bedienen, wenn es die aktuelle Session ist
      if (sessionId === sessionsStore.currentSessionId) {
        return stateCache.value.currentMessages;
      }

      // Ansonsten direkt vom Store abrufen
      return sessionsStore.messages[sessionId] || [];
    },

    cancelStreaming(): void {
      sessionsStore.cancelStreaming();
    },

    async deleteSession(sessionId: string): Promise<void> {
      await sessionsStore.archiveSession(sessionId);

      // Storage-Service-Daten löschen
      chatStorageService.clearSessionStorage(sessionId);

      // Offline-Warteschlange bereinigen
      offlineQueueService.clearSessionOperations(sessionId);

      // Wenn offline, zur Warteschlange hinzufügen
      if (!navigator.onLine) {
        offlineQueueService.addToQueue(
          OperationType.ARCHIVE_SESSION,
          {},
          sessionId,
          OperationPriority.LOW,
        );
      }
    },

    async updateSessionTitle(
      sessionId: string,
      newTitle: string,
    ): Promise<void> {
      await sessionsStore.updateSessionTitle(sessionId, newTitle);

      // Wenn offline, zur Warteschlange hinzufügen
      if (!navigator.onLine) {
        offlineQueueService.addToQueue(
          OperationType.UPDATE_SESSION,
          { title: newTitle },
          sessionId,
          OperationPriority.LOW,
        );
      }
    },

    async togglePinSession(sessionId: string): Promise<void> {
      const session = sessionsStore.sessions.find((s) => s.id === sessionId);
      const newPinState = session ? !session.isPinned : true;

      await sessionsStore.togglePinSession(sessionId);

      // Wenn offline, zur Warteschlange hinzufügen
      if (!navigator.onLine) {
        offlineQueueService.addToQueue(
          OperationType.PIN_SESSION,
          { isPinned: newPinState },
          sessionId,
          OperationPriority.LOW,
        );
      }
    },

    exportData(): string {
      return sessionsStore.exportData();
    },

    importData(jsonData: string): boolean {
      return sessionsStore.importData(jsonData);
    },

    // Neue Methoden für die optimierte Bridge
    getSessionsCount(): number {
      return sessionsStore.sessions.length;
    },

    getMessagesCount(sessionId: string): number {
      return (sessionsStore.messages[sessionId] || []).length;
    },

    isSessionArchived(sessionId: string): boolean {
      const session = sessionsStore.sessions.find((s) => s.id === sessionId);
      return session?.isArchived || false;
    },

    isMessageStreaming(messageId: string): boolean {
      if (!sessionsStore.currentSessionId) return false;

      const message = sessionsStore.currentMessages.find(
        (m) => m.id === messageId,
      );
      return message?.isStreaming || false;
    },

    async loadOlderMessages(sessionId: string): Promise<ChatMessage[]> {
      // Daten aus dem Storage-Service abrufen
      if (chatStorageService.hasStoredSession(sessionId)) {
        const olderMessages = chatStorageService.loadSessionMessages(sessionId);

        if (olderMessages.length > 0) {
          await sessionsStore.refreshSession(sessionId);
          return olderMessages;
        }
      }

      // Fallback auf Store-Methode
      return sessionsStore.loadOlderMessages(sessionId);
    },

    getPendingMessagesCount(): number {
      return offlineQueueService.getPendingCount();
    },

    hasPendingOperations(sessionId: string): boolean {
      const operations = offlineQueueService.getOperationsForSession(sessionId);
      return operations.length > 0;
    },
  };

  /**
   * UI Bridge API (optimiert)
   */
  const optimizedUIBridge: OptimizedUIBridgeAPI = {
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
   * Settings Bridge API (optimiert)
   */
  const optimizedSettingsBridge: OptimizedSettingsBridgeAPI = {
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
   * Feature Toggles Bridge API (optimiert)
   */
  const optimizedFeaturesBridge: OptimizedFeaturesBridgeAPI = {
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
   * Events Bridge API (optimiert)
   */
  const optimizedEventsBridge: OptimizedEventBridgeAPI = {
    emit(event: string, data?: any): void {
      optimizedBus.emit(event, data);
    },

    on(event: string, callback: (data?: any) => void): () => void {
      return optimizedBus.on(event, callback);
    },

    off(event: string, callback: (data?: any) => void): void {
      optimizedBus.off(event, callback);
    },

    once(event: string, callback: (data?: any) => void): () => void {
      return optimizedBus.once(event, callback);
    },

    batchEmit(events: Array<{ event: string; data?: any }>): void {
      optimizedBus.batchEmit(events);
    },
  };

  /**
   * Diagnostics Bridge API (neu)
   */
  const optimizedDiagnosticsBridge: OptimizedDiagnosticsBridgeAPI = {
    getStoreStats(): any {
      return {
        sessions: {
          total: sessionsStore.sessions.length,
          active: sessionsStore.activeSessions.length,
          archived: sessionsStore.archivedSessions.length,
        },
        messages: {
          current: sessionsStore.currentMessages.length,
          streaming: sessionsStore.isStreaming,
        },
        offline: {
          pendingCount: offlineQueueService.getPendingCount(),
          isOnline: navigator.onLine,
        },
      };
    },

    getStorageStats(): any {
      return chatStorageService.getStorageStats();
    },

    getOfflineQueueStats(): any {
      return diagnosticsManager.getMetrics("offlineQueue");
    },

    resetCache(): void {
      sessionsStore.resetGetterCache();

      // Cache neu aufbauen
      updateStateCache();
    },

    monitorPerformance(enable: boolean): void {
      diagnosticsManager.toggleMonitoring(enable);
    },

    getMemoryUsage(): any {
      return diagnosticsManager.getMetrics("memory");
    },

    logDiagnostics(): void {
      diagnosticsManager.logDiagnostics();
    },
  };

  // Store-Watcher für Events einrichten

  // Auth-Store Änderungen beobachten
  const unwatchAuth = watch(
    () => authStore.isAuthenticated,
    (isAuthenticated) => {
      // Batch-Update für bessere Performance
      optimizedBus.batchEmit([
        { event: "auth:changed", data: { isAuthenticated } },
        {
          event: isAuthenticated ? "auth:login" : "auth:logout",
          data: { user: authStore.user },
        },
      ]);

      // Wenn der Benutzer angemeldet ist, Offline-Warteschlange verarbeiten
      if (isAuthenticated) {
        offlineQueueService.manualProcessQueue();
      }
    },
  );
  cleanupFunctions.push(unwatchAuth);

  // Sessions-Store Änderungen beobachten (optimiert)
  const unwatchSessionId = watch(
    () => sessionsStore.currentSessionId,
    (sessionId, oldSessionId) => {
      if (sessionId) {
        const session = sessionsStore.currentSession;

        // Batch-Update für bessere Performance
        optimizedBus.emit("session:changed", {
          sessionId,
          oldSessionId,
          session,
        });
      }
    },
  );
  cleanupFunctions.push(unwatchSessionId);

  // Sessions-Liste beobachten (mit Optimierung für große Listen)
  let sessionsUpdateTimeout: number | null = null;
  const unwatchSessions = watch(
    () => sessionsStore.sessions.length,
    () => {
      // Debounce für häufige Updates
      if (sessionsUpdateTimeout !== null) {
        clearTimeout(sessionsUpdateTimeout);
      }

      sessionsUpdateTimeout = window.setTimeout(() => {
        optimizedBus.emit("sessions:updated", {
          count: sessionsStore.sessions.length,
          hasPending: offlineQueueService.getPendingCount() > 0,
        });
        sessionsUpdateTimeout = null;
      }, 100);
    },
  );
  cleanupFunctions.push(unwatchSessions);
  cleanupFunctions.push(() => {
    if (sessionsUpdateTimeout !== null) {
      clearTimeout(sessionsUpdateTimeout);
    }
  });

  // UI-Store Änderungen beobachten (optimiert)
  const unwatchDarkMode = watch(
    () => uiStore.darkMode,
    (isDark) => {
      optimizedBus.emit("ui:darkModeChanged", { isDark });
    },
  );
  cleanupFunctions.push(unwatchDarkMode);

  const unwatchSidebar = watch(
    () => [uiStore.sidebar.isOpen, uiStore.sidebar.collapsed],
    () => {
      optimizedBus.emit("ui:sidebarChanged", {
        isOpen: uiStore.sidebar.isOpen,
        isCollapsed: uiStore.sidebar.collapsed,
      });
    },
  );
  cleanupFunctions.push(unwatchSidebar);

  // Settings-Store Änderungen beobachten (optimiert)
  const unwatchTheme = watch(
    () => settingsStore.theme.currentTheme,
    (themeId) => {
      optimizedBus.emit("settings:themeChanged", { themeId });
    },
  );
  cleanupFunctions.push(unwatchTheme);

  // Online/Offline-Status beobachten
  const handleOnlineStatus = () => {
    optimizedBus.emit("network:status", { isOnline: navigator.onLine });

    if (navigator.onLine) {
      // Wenn wir wieder online sind, Warteschlange verarbeiten
      offlineQueueService.manualProcessQueue();
    }
  };

  window.addEventListener("online", handleOnlineStatus);
  window.addEventListener("offline", handleOnlineStatus);

  cleanupFunctions.push(() => {
    window.removeEventListener("online", handleOnlineStatus);
    window.removeEventListener("offline", handleOnlineStatus);
  });

  /**
   * Bereinigt alle Event-Listener und Intervalle
   */
  function cleanup() {
    cleanupFunctions.forEach((fn) => fn());
    cleanupFunctions.length = 0;

    optimizedBus.clear();
  }

  // Vollständige Bridge-API zurückgeben
  return {
    auth: optimizedAuthBridge,
    sessions: optimizedSessionsBridge,
    ui: optimizedUIBridge,
    settings: optimizedSettingsBridge,
    features: optimizedFeaturesBridge,
    events: optimizedEventsBridge,
    diagnostics: optimizedDiagnosticsBridge,
  };
}

/**
 * Initialisiert die optimierte Bridge und macht sie als globales Objekt verfügbar
 */
export function initializeOptimizedStoreBridge(): {
  bridge: OptimizedBridgeAPI;
  cleanup: () => void;
} {
  // Bridge einrichten
  const bridge = setupOptimizedStoreBridge();

  // Globale API am window-Objekt bereitstellen
  window.nscaleOptimized = bridge;

  // Event auslösen, dass die Bridge bereit ist
  window.dispatchEvent(
    new CustomEvent("nscale:optimized-bridge:ready", {
      detail: { version: "3.0.0" },
    }),
  );

  // Cleanup-Funktion
  const cleanup = () => {
    delete window.nscaleOptimized;
    optimizedBus.clear();
  };

  return { bridge, cleanup };
}

// Typdefinitionen für die globale Bridge
declare global {
  interface Window {
    nscaleOptimized?: OptimizedBridgeAPI;
  }
}

/**
 * Bridge-Komposable für Vue-Komponenten
 */
export function useOptimizedStoreBridge() {
  const { bridge, cleanup } = initializeOptimizedStoreBridge();

  // Beim Komponenten-Unmount aufräumen
  onBeforeUnmount(cleanup);

  return bridge;
}

// Funktion für den Vue-Plugin
export default {
  install(app: any) {
    const { bridge, cleanup } = initializeOptimizedStoreBridge();

    // Bridge als Provide für alle Komponenten bereitstellen
    app.provide("nscaleOptimizedBridge", bridge);

    // Cleanup beim App-Unmount
    app.unmount = ((original: () => void) => {
      return () => {
        cleanup();
        original();
      };
    })(app.unmount);

    console.info("Optimized Store Bridge Plugin installed");
  },
};
