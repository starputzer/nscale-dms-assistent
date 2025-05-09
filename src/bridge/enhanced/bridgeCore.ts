/**
 * BridgeCore-Komponente für die verbesserte Bridge
 * 
 * Diese Datei implementiert die zentrale Klasse, die alle Bridge-Komponenten
 * zusammenführt und koordiniert.
 */

import { watch, onBeforeUnmount } from 'vue';
import { 
  BridgeAPI, 
  BridgeConfiguration, 
  DEFAULT_BRIDGE_CONFIG,
  BridgeErrorState,
  BridgeStatusInfo,
  LogLevel,
  AuthBridgeAPI,
  SessionBridgeAPI,
  UIBridgeAPI,
  FeatureToggleBridgeAPI,
  EventOptions,
  EventSubscription
} from './types';
import { EnhancedBridgeLogger } from './logger';
import { EnhancedEventBus } from './eventBus';
import { EnhancedStateManager } from './stateManager';
import { BridgeStatusManager } from './statusManager';
import { SelfHealingBridge } from './selfHealing';

// Import der Store-Typen (angepasst an Ihren Store-Aufbau)
import { useAuthStore } from '@/stores/auth';
import { useSessionsStore } from '@/stores/sessions';
import { useUIStore } from '@/stores/ui';
import { useFeatureTogglesStore } from '@/stores/featureToggles';

/**
 * Effiziente Serialisierung für komplexe Datenstrukturen
 */
class EfficientSerializer {
  // Cache für bereits serialisierte Werte
  private serializationCache: Map<string, string> = new Map();
  private deserializationCache: Map<string, any> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;
  
  // Maximale Cachegröße
  private maxCacheSize = 100;
  private logger: EnhancedBridgeLogger;
  
  constructor(logger: EnhancedBridgeLogger) {
    this.logger = logger;
  }
  
  /**
   * Serialisiert einen Wert effizient
   */
  serialize(value: any): string {
    // Primitive Werte direkt durchreichen
    if (value === null || 
        value === undefined || 
        typeof value === 'string' || 
        typeof value === 'number' || 
        typeof value === 'boolean') {
      return JSON.stringify(value);
    }
    
    // Für komplexe Objekte: Hashcode berechnen und im Cache nachschlagen
    const hashCode = this.objectHash(value);
    
    if (this.serializationCache.has(hashCode)) {
      this.cacheHits++;
      return this.serializationCache.get(hashCode)!;
    }
    
    this.cacheMisses++;
    const serialized = JSON.stringify(value);
    
    // Cache-Größe kontrollieren
    if (this.serializationCache.size >= this.maxCacheSize) {
      const firstKey = this.serializationCache.keys().next().value;
      this.serializationCache.delete(firstKey);
    }
    
    this.serializationCache.set(hashCode, serialized);
    this.deserializationCache.set(serialized, value);
    
    return serialized;
  }
  
  /**
   * Deserialisiert einen String effizient
   */
  deserialize<T>(serialized: string): T {
    if (this.deserializationCache.has(serialized)) {
      this.cacheHits++;
      return this.deserializationCache.get(serialized) as T;
    }
    
    this.cacheMisses++;
    const deserialized = JSON.parse(serialized) as T;
    
    // Cache-Größe kontrollieren
    if (this.deserializationCache.size >= this.maxCacheSize) {
      const firstKey = this.deserializationCache.keys().next().value;
      this.deserializationCache.delete(firstKey);
    }
    
    this.deserializationCache.set(serialized, deserialized);
    return deserialized;
  }
  
  /**
   * Einfache Hash-Funktion für Objekte
   */
  private objectHash(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(16);
  }
  
  /**
   * Gibt Cache-Statistiken zurück
   */
  getStats(): { hits: number, misses: number, ratio: number } {
    const total = this.cacheHits + this.cacheMisses;
    const ratio = total > 0 ? this.cacheHits / total : 0;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      ratio
    };
  }
  
  /**
   * Löscht den Cache
   */
  clearCache(): void {
    this.serializationCache.clear();
    this.deserializationCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.logger.debug('Serialisierungs-Cache gelöscht');
  }
}

/**
 * Implementation der Haupt-Bridge-Klasse
 */
export class EnhancedBridge {
  // Bridge-Komponenten
  private config: BridgeConfiguration;
  private logger: EnhancedBridgeLogger;
  private eventBus: EnhancedEventBus;
  private stateManager: EnhancedStateManager;
  private statusManager: BridgeStatusManager;
  private selfHealing: SelfHealingBridge;
  private serializer: EfficientSerializer;
  
  // Store-Referenzen
  private authStore: ReturnType<typeof useAuthStore> | null = null;
  private sessionsStore: ReturnType<typeof useSessionsStore> | null = null;
  private uiStore: ReturnType<typeof useUIStore> | null = null;
  private featureTogglesStore: ReturnType<typeof useFeatureTogglesStore> | null = null;
  
  // Bridge-API-Implementierungen
  private authBridgeAPI: AuthBridgeAPI | null = null;
  private sessionsBridgeAPI: SessionBridgeAPI | null = null;
  private uiBridgeAPI: UIBridgeAPI | null = null;
  private featuresBridgeAPI: FeatureToggleBridgeAPI | null = null;
  
  // Legacy-State
  private legacyState: Record<string, any> = {};
  
  // Cleanup-Funktionen
  private cleanupFunctions: Array<() => void> = [];
  
  constructor(config?: Partial<BridgeConfiguration>) {
    // Konfiguration mit Standardwerten zusammenführen
    this.config = {
      ...DEFAULT_BRIDGE_CONFIG,
      ...config
    };
    
    // Logger initialisieren
    this.logger = new EnhancedBridgeLogger();
    this.logger.setLevel(this.config.logLevel);
    
    // Bridge-Komponenten initialisieren
    this.statusManager = new BridgeStatusManager(this.logger);
    this.eventBus = new EnhancedEventBus(this.logger, this.config.batchInterval);
    this.stateManager = new EnhancedStateManager(this.logger);
    this.selfHealing = new SelfHealingBridge(
      this.logger, 
      this.statusManager, 
      this.config.healthCheckInterval
    );
    this.serializer = new EfficientSerializer(this.logger);
    
    // Performance-Optimierungen konfigurieren
    this.configurePerformanceOptimizations();
    
    // Selbstheilungsmechanismen konfigurieren
    this.setupHealthChecks();
    
    this.logger.info('Enhanced Bridge initialisiert', this.config);
  }
  
  /**
   * Konfiguriert Performance-Optimierungen
   */
  private configurePerformanceOptimizations(): void {
    // Event-Batching konfigurieren
    this.eventBus.configureBatching(10, this.config.batchInterval);
    
    // Logging-Level einstellen
    if (!this.config.debugging) {
      this.logger.setLevel(LogLevel.INFO);
    }
    
    this.logger.info('Performance-Optimierungen konfiguriert');
  }
  
  /**
   * Verbindet die Bridge mit den Stores
   */
  connect(): void {
    // Stores initialisieren
    this.authStore = useAuthStore();
    this.sessionsStore = useSessionsStore();
    this.uiStore = useUIStore();
    this.featureTogglesStore = useFeatureTogglesStore();
    
    // Legacy-State initialisieren
    this.initializeLegacyState();
    
    // Store-API initialisieren
    this.initializeStoreAPI();
    
    // State-Manager mit Stores verbinden
    this.stateManager.connect(
      {
        auth: this.authStore,
        sessions: this.sessionsStore,
        ui: this.uiStore,
        features: this.featureTogglesStore
      },
      this.legacyState
    );
    
    // Store-Watchers einrichten
    this.setupStoreWatchers();
    
    this.logger.info('Bridge mit Stores verbunden');
  }
  
  /**
   * Initialisiert den Legacy-State
   */
  private initializeLegacyState(): void {
    this.legacyState = {
      auth: {
        user: null,
        token: null,
        isAuthenticated: false
      },
      sessions: {
        list: [],
        currentId: null,
        messages: {}
      },
      ui: {
        darkMode: false,
        sidebar: { isOpen: true, collapsed: false },
        toasts: [],
        modals: []
      },
      features: {
        toggles: {}
      }
    };
    
    // Initialen Zustand aus localStorage laden
    this.loadInitialState();
    
    this.logger.debug('Legacy-State initialisiert', this.legacyState);
  }
  
  /**
   * Lädt den initialen Zustand aus dem localStorage
   */
  private loadInitialState(): void {
    try {
      // Auth-State
      const token = localStorage.getItem('token');
      if (token) {
        this.legacyState.auth.token = token;
      }
      
      // Theme-Modus
      const darkMode = localStorage.getItem('darkMode') === 'true';
      this.legacyState.ui.darkMode = darkMode;
      
      // Feature-Toggles
      const featureToggles = localStorage.getItem('featureToggles');
      if (featureToggles) {
        try {
          this.legacyState.features.toggles = JSON.parse(featureToggles);
        } catch (e) {
          this.logger.warn('Fehler beim Parsen der Feature-Toggles', e);
        }
      }
      
      this.logger.info('Initialer Zustand aus localStorage geladen');
    } catch (error) {
      this.logger.error('Fehler beim Laden des initialen Zustands', error);
    }
  }
  
  /**
   * Initialisiert die Bridge-API für die Stores
   */
  private initializeStoreAPI(): void {
    // Auth-Bridge-API
    this.authBridgeAPI = this.createAuthBridgeAPI();
    
    // Sessions-Bridge-API
    this.sessionsBridgeAPI = this.createSessionsBridgeAPI();
    
    // UI-Bridge-API
    this.uiBridgeAPI = this.createUIBridgeAPI();
    
    // Features-Bridge-API
    this.featuresBridgeAPI = this.createFeaturesBridgeAPI();
    
    this.logger.debug('Store-Bridge-API initialisiert');
  }
  
  /**
   * Erstellt die Auth-Bridge-API
   */
  private createAuthBridgeAPI(): AuthBridgeAPI {
    if (!this.authStore) {
      throw new Error('Auth-Store nicht initialisiert');
    }
    
    const authStore = this.authStore;
    const eventBus = this.eventBus;
    
    return {
      async login(email: string, password: string): Promise<boolean> {
        try {
          const result = await authStore.login({ email, password });
          eventBus.emit('auth:login', { success: result });
          return result;
        } catch (error) {
          eventBus.emit('auth:login', { success: false, error });
          return false;
        }
      },
      
      logout(): void {
        authStore.logout();
        eventBus.emit('auth:logout', {});
      },
      
      getToken(): string | null {
        return authStore.token;
      },
      
      isAuthenticated(): boolean {
        return authStore.isAuthenticated;
      },
      
      getUser(): any {
        return authStore.user;
      },
      
      hasRole(role: string): boolean {
        return authStore.hasRole(role);
      }
    };
  }
  
  /**
   * Erstellt die Sessions-Bridge-API
   */
  private createSessionsBridgeAPI(): SessionBridgeAPI {
    if (!this.sessionsStore) {
      throw new Error('Sessions-Store nicht initialisiert');
    }
    
    const sessionsStore = this.sessionsStore;
    const eventBus = this.eventBus;
    
    return {
      async createSession(title?: string): Promise<string> {
        try {
          const sessionId = await sessionsStore.createSession(title || 'Neue Unterhaltung');
          eventBus.emit('session:created', { sessionId });
          return sessionId;
        } catch (error) {
          eventBus.emit('session:error', { action: 'create', error });
          throw error;
        }
      },
      
      async loadSession(sessionId: string): Promise<boolean> {
        try {
          await sessionsStore.setCurrentSession(sessionId);
          return true;
        } catch (error) {
          eventBus.emit('session:error', { action: 'load', sessionId, error });
          return false;
        }
      },
      
      async deleteSession(sessionId: string): Promise<boolean> {
        try {
          await sessionsStore.archiveSession(sessionId);
          eventBus.emit('session:deleted', { sessionId });
          return true;
        } catch (error) {
          eventBus.emit('session:error', { action: 'delete', sessionId, error });
          return false;
        }
      },
      
      async sendMessage(sessionId: string, content: string): Promise<void> {
        try {
          await sessionsStore.sendMessage({ sessionId, content });
        } catch (error) {
          eventBus.emit('session:error', { action: 'sendMessage', sessionId, error });
          throw error;
        }
      },
      
      getCurrentSession(): any {
        return sessionsStore.currentSession;
      },
      
      getAllSessions(): any[] {
        return sessionsStore.sessions;
      }
    };
  }
  
  /**
   * Erstellt die UI-Bridge-API
   */
  private createUIBridgeAPI(): UIBridgeAPI {
    if (!this.uiStore) {
      throw new Error('UI-Store nicht initialisiert');
    }
    
    const uiStore = this.uiStore;
    
    return {
      showToast(message: string, type?: string): void {
        switch (type) {
          case 'success':
            uiStore.showSuccess(message);
            break;
          case 'error':
            uiStore.showError(message);
            break;
          case 'warning':
            uiStore.showWarning(message);
            break;
          default:
            uiStore.showInfo(message);
            break;
        }
      },
      
      openModal(options: any): string {
        return uiStore.openModal(options);
      },
      
      closeModal(id: string): void {
        uiStore.closeModal(id);
      },
      
      toggleDarkMode(): void {
        uiStore.toggleDarkMode();
      },
      
      isDarkMode(): boolean {
        return uiStore.isDarkMode;
      }
    };
  }
  
  /**
   * Erstellt die Features-Bridge-API
   */
  private createFeaturesBridgeAPI(): FeatureToggleBridgeAPI {
    if (!this.featureTogglesStore) {
      throw new Error('FeatureToggles-Store nicht initialisiert');
    }
    
    const featureTogglesStore = this.featureTogglesStore;
    
    return {
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
      
      getAllFeatures(): Record<string, boolean> {
        return featureTogglesStore.features;
      }
    };
  }
  
  /**
   * Richtet Store-Watchers ein
   */
  private setupStoreWatchers(): void {
    if (!this.authStore || !this.sessionsStore || !this.uiStore || !this.featureTogglesStore) {
      this.logger.error('Stores nicht initialisiert');
      return;
    }
    
    // Auth-Store Änderungen beobachten
    const unwatchAuth = watch(() => this.authStore!.isAuthenticated, (isAuthenticated) => {
      this.eventBus.emit('auth:changed', { isAuthenticated });
      
      if (isAuthenticated) {
        this.eventBus.emit('auth:login', { user: this.authStore!.user });
      } else {
        this.eventBus.emit('auth:logout');
      }
    });
    this.cleanupFunctions.push(unwatchAuth);
    
    // Sessions-Store Änderungen beobachten
    const unwatchSessionId = watch(() => this.sessionsStore!.currentSessionId, (sessionId, oldSessionId) => {
      if (sessionId) {
        this.eventBus.emit('session:changed', { 
          sessionId,
          oldSessionId,
          session: this.sessionsStore!.currentSession
        });
      }
    });
    this.cleanupFunctions.push(unwatchSessionId);
    
    const unwatchSessions = watch(() => this.sessionsStore!.sessions, (sessions) => {
      this.eventBus.emit('sessions:updated', { sessions });
    }, { deep: true });
    this.cleanupFunctions.push(unwatchSessions);
    
    // UI-Store Änderungen beobachten
    const unwatchDarkMode = watch(() => this.uiStore!.darkMode, (isDark) => {
      this.eventBus.emit('ui:darkModeChanged', { isDark });
    });
    this.cleanupFunctions.push(unwatchDarkMode);
    
    // Feature-Toggles Änderungen beobachten
    const unwatchFeatures = watch(() => this.featureTogglesStore!.features, (features) => {
      this.eventBus.emit('features:updated', { features });
    }, { deep: true });
    this.cleanupFunctions.push(unwatchFeatures);
    
    this.logger.info('Store-Watcher eingerichtet');
  }
  
  /**
   * Richtet Gesundheitsprüfungen ein
   */
  private setupHealthChecks(): void {
    // Event-Bus-Gesundheitsprüfung
    this.selfHealing.addHealthCheck(() => {
      try {
        return this.eventBus.isOperational();
      } catch (e) {
        return false;
      }
    });
    
    // State-Manager-Gesundheitsprüfung
    this.selfHealing.addHealthCheck(() => {
      try {
        return this.stateManager.isHealthy();
      } catch (e) {
        return false;
      }
    });
    
    // Speichernutzungs-Gesundheitsprüfung
    this.selfHealing.addHealthCheck(() => {
      try {
        // Effiziente Serialisierung prüfen
        const stats = this.serializer.getStats();
        return stats.ratio > 0.5; // Mindestens 50% Cache-Treffer erwartet
      } catch (e) {
        return true; // Fehlertolerant
      }
    });
    
    // Wiederherstellungsstrategien
    
    // Event-Bus-Wiederherstellung
    this.selfHealing.addRecoveryStrategy(async () => {
      try {
        this.logger.info('Versuche, EventBus wiederherzustellen');
        this.eventBus.reset();
        return true;
      } catch (e) {
        return false;
      }
    });
    
    // State-Manager-Wiederherstellung
    this.selfHealing.addRecoveryStrategy(async () => {
      try {
        this.logger.info('Versuche, StateManager wiederherzustellen');
        this.stateManager.reset();
        return true;
      } catch (e) {
        return false;
      }
    });
    
    // Serializer-Cache-Bereinigung
    this.selfHealing.addRecoveryStrategy(async () => {
      try {
        this.logger.info('Lösche Serialisierungs-Cache');
        this.serializer.clearCache();
        return true;
      } catch (e) {
        return false;
      }
    });
    
    // Vollständige Bridge-Neuverbindung
    this.selfHealing.addRecoveryStrategy(async () => {
      try {
        this.logger.info('Versuche vollständige Bridge-Neuverbindung');
        this.disconnect();
        this.connect();
        return true;
      } catch (e) {
        return false;
      }
    });
    
    this.logger.info('Gesundheitsprüfungen und Wiederherstellungsstrategien eingerichtet');
  }
  
  /**
   * Stellt globale Bridge-Funktionen bereit
   */
  exposeGlobalAPI(): BridgeAPI {
    // Stellen Sie sicher, dass die Store-API initialisiert ist
    if (!this.authBridgeAPI || !this.sessionsBridgeAPI || !this.uiBridgeAPI || !this.featuresBridgeAPI) {
      this.connect();
    }
    
    // Bridge-API zusammenstellen
    const api: BridgeAPI = {
      auth: this.authBridgeAPI!,
      sessions: this.sessionsBridgeAPI!,
      ui: this.uiBridgeAPI!,
      features: this.featuresBridgeAPI!,
      
      // State-Management
      getState: (path: string) => this.stateManager.getState(path),
      setState: (path: string, value: any) => this.stateManager.setState(path, value),
      subscribe: (path: string, callback: Function) => 
        this.stateManager.subscribe(path, callback as any),
      
      // Event-Handling
      emit: (event: string, data: any) => this.eventBus.emit(event, data),
      on: (event: string, callback: Function, options?: EventOptions) => 
        this.eventBus.on(event, callback, options),
      off: (event: string, callbackOrSubscription: Function | EventSubscription) => 
        this.eventBus.off(event, callbackOrSubscription as any),
      
      // Diagnose
      getStatus: () => this.statusManager.getStatus(),
      getLogs: () => this.logger.getLogs(),
      clearLogs: () => this.logger.clearLogs(),
      diagnostics: () => this.getDiagnostics()
    };
    
    // API global verfügbar machen
    window.nscaleBridge = api;
    
    // Bridge-Ready-Event auslösen
    window.dispatchEvent(new CustomEvent('nscale-bridge-ready', {
      detail: { version: '2.0.0' }
    }));
    
    this.logger.info('Globale Bridge-API bereitgestellt');
    
    return api;
  }
  
  /**
   * Trennt die Bridge-Verbindung
   */
  disconnect(): void {
    // Store-Watchers aufräumen
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];
    
    // State-Manager trennen
    this.stateManager.disconnect();
    
    // Event-Bus zurücksetzen
    this.eventBus.clear();
    
    // Bridge-API entfernen
    if (window.nscaleBridge) {
      delete window.nscaleBridge;
    }
    
    this.logger.info('Bridge-Verbindung getrennt');
  }
  
  /**
   * Gibt Diagnose-Informationen zurück
   */
  getDiagnostics(): any {
    return {
      bridge: {
        version: '2.0.0',
        config: this.config,
        status: this.statusManager.getStatus()
      },
      components: {
        eventBus: this.eventBus.getDiagnostics(),
        stateManager: this.stateManager.getDiagnostics(),
        serializer: this.serializer.getStats()
      },
      logs: this.logger.getLogs()
    };
  }
}

/**
 * Komposable für Vue-Komponenten
 */
export function useBridge() {
  // Bridge-Instanz erstellen, wenn sie noch nicht existiert
  const bridge = new EnhancedBridge({
    debugging: process.env.NODE_ENV !== 'production'
  });
  
  // Bridge verbinden und globale API bereitstellen
  bridge.connect();
  const api = bridge.exposeGlobalAPI();
  
  // Beim Komponenten-Unmount aufräumen
  onBeforeUnmount(() => {
    bridge.disconnect();
  });
  
  return api;
}

// Typdefinitionen für die globale Bridge
declare global {
  interface Window {
    nscaleBridge?: BridgeAPI;
  }
}