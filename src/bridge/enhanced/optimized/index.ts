/**
 * Optimized Bridge System - Integration Module
 * 
 * Diese Datei bündelt alle optimierten Bridge-Komponenten und stellt
 * eine einfache Initialisierungsfunktion bereit, die alle Komponenten korrekt
 * konfiguriert und miteinander verbindet.
 */

import { EnhancedEventBus } from './enhancedEventBus';
import { BatchedEventEmitter } from './batchedEventEmitter';
import { MemoryManager } from './memoryManager';
import { PerformanceMonitor } from './performanceMonitor';
import { EnhancedSelfHealing } from './enhancedSelfHealing';
import { SelectiveStateManager } from './selectiveStateManager';
import { EventListenerManager } from './eventListenerManager';
import { SelectiveChatBridge } from './selectiveChatBridge';
import { ChatBridgeDiagnostics } from './chatBridgeDiagnostics';
import { BridgeStatusManager } from '../statusManager';
import { Logger, LogLevel } from '../logger';

// Konfiguration für das optimierte Bridge-System
export interface OptimizedBridgeConfig {
  // Allgemeine Bridge-Optionen
  enabled: boolean;                      // Bridge-System aktivieren
  logLevel: LogLevel;                    // Log-Level für alle Komponenten
  enableSelfHealing: boolean;            // Self-Healing aktivieren
  
  // Leistungsoptionen
  enablePerformanceMonitoring: boolean;  // Leistungsüberwachung aktivieren
  enableMemoryManagement: boolean;       // Speicherverwaltung aktivieren
  enableEventBatching: boolean;          // Event-Batching aktivieren
  enableSelectiveSync: boolean;          // Selektive Synchronisierung aktivieren
  
  // Diagnose-Optionen
  enableDiagnostics: boolean;            // Diagnose-Tools aktivieren
  enableDeveloperTools: boolean;         // Entwickler-Tools aktivieren
  
  // Test-Optionen
  testMode: boolean;                     // Test-Modus aktivieren
}

// Standard-Konfiguration
const DEFAULT_CONFIG: OptimizedBridgeConfig = {
  enabled: true,
  logLevel: LogLevel.INFO,
  enableSelfHealing: true,
  
  enablePerformanceMonitoring: true,
  enableMemoryManagement: true,
  enableEventBatching: true,
  enableSelectiveSync: true,
  
  enableDiagnostics: true,
  enableDeveloperTools: process.env.NODE_ENV !== 'production',
  
  testMode: false,
};

// Integrierte Bridge-Komponenten
interface OptimizedBridgeComponents {
  eventBus: EnhancedEventBus;                  // Optimierter Event-Bus
  batchedEmitter: BatchedEventEmitter;         // Batched Event-Emitter
  memoryManager: MemoryManager;                // Speicherverwaltung
  performanceMonitor: PerformanceMonitor;      // Leistungsüberwachung
  selfHealing: EnhancedSelfHealing;            // Self-Healing
  stateManager: SelectiveStateManager;         // Zustandsverwaltung
  eventListenerManager: EventListenerManager;  // Event-Listener-Verwaltung
  chatBridge: SelectiveChatBridge;             // Chat-Bridge
  diagnostics: ChatBridgeDiagnostics;          // Diagnose-Tools
  statusManager: BridgeStatusManager;          // Status-Verwaltung
}

// Bridge-API für externe Verwendung
export interface OptimizedBridgeAPI {
  // Kern-Funktionen
  initialize: () => Promise<boolean>;
  dispose: () => void;
  isInitialized: () => boolean;
  
  // Event-System
  on: (event: string, handler: Function, component?: string) => { unsubscribe: () => void };
  off: (event: string, handler: Function) => void;
  emit: (event: string, data: any) => void;
  
  // State-Management
  syncState: (stateKey: string, data: any) => void;
  getState: (stateKey: string) => any;
  
  // Chat-spezifische Funktionen
  sendMessage: (content: string, sessionId?: string) => Promise<boolean>;
  getSessionMessages: (sessionId: string) => any[];
  getActiveSessions: () => any[];
  
  // Diagnose-Tools
  testConnection: () => Promise<{ connected: boolean, latency: number }>;
  getStatus: () => any;
  generateReport: () => any;
  showDiagnostics: () => void;
  
  // Self-Healing
  triggerHealing: () => Promise<boolean>;
}

// Komponenten-Instanz
let components: OptimizedBridgeComponents | null = null;

// Initialisierungsstatus
let isInitialized = false;

// Logger
const logger = new Logger('OptimizedBridge', LogLevel.INFO);

/**
 * Bridge-System mit optimierten Komponenten initialisieren
 */
export async function initializeOptimizedBridge(config: Partial<OptimizedBridgeConfig> = {}): Promise<OptimizedBridgeAPI> {
  // Konfiguration kombinieren
  const mergedConfig: OptimizedBridgeConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };
  
  // Logger konfigurieren
  logger.setLevel(mergedConfig.logLevel);
  
  // Bereits initialisiert
  if (isInitialized && components) {
    logger.warn('Bridge-System bereits initialisiert, bestehende Instanz wird zurückgegeben');
    return createBridgeAPI(components);
  }
  
  logger.info('Initialisiere optimiertes Bridge-System', mergedConfig);
  
  try {
    // Status-Manager erstellen
    const statusManager = new BridgeStatusManager(mergedConfig.logLevel);
    
    // Performance-Monitor erstellen
    const performanceMonitor = mergedConfig.enablePerformanceMonitoring 
      ? new PerformanceMonitor(mergedConfig.logLevel)
      : undefined;
    
    // Memory-Manager erstellen
    const memoryManager = mergedConfig.enableMemoryManagement
      ? new MemoryManager(performanceMonitor, mergedConfig.logLevel)
      : undefined;
    
    // Event-Bus erstellen
    const eventBus = new EnhancedEventBus({
      logLevel: mergedConfig.logLevel,
      monitorPerformance: mergedConfig.enablePerformanceMonitoring,
      optimizeEventMatching: true,
      trackEventStats: true
    }, performanceMonitor);
    
    // Event-Batching erstellen
    const batchedEmitter = mergedConfig.enableEventBatching
      ? new BatchedEventEmitter(
          (type, data, source) => eventBus.emit(type, data),
          {
            enabled: true,
            maxBatchSize: 20,
            maxBatchDelay: 50,
            priorityEvents: ['error', 'ready', 'ping', 'pong', 'status', 'init'],
            prioritizeLegacyEvents: true,
            useIdleCallback: true,
            useAnimationFrame: true,
            flushOnUnload: true,
            monitorPerformance: mergedConfig.enablePerformanceMonitoring
          },
          performanceMonitor
        )
      : undefined;
    
    // Event-Listener-Manager erstellen
    const eventListenerManager = mergedConfig.enableMemoryManagement
      ? new EventListenerManager(
          {
            enableLeakPrevention: true,
            enableGarbageCollection: true,
            trackUnsubscribeRate: true,
            forceUnsubscribeOnCleanup: true,
            gcInterval: 60000,
            checkStaleListenersMs: 30000,
            maxStaleListenerAge: 300000,
            enableMetrics: mergedConfig.enablePerformanceMonitoring,
            debugMode: false
          },
          performanceMonitor
        )
      : undefined;
    
    // Self-Healing erstellen
    const selfHealing = mergedConfig.enableSelfHealing
      ? new EnhancedSelfHealing(
          statusManager,
          performanceMonitor,
          {
            enabled: true,
            autoRecovery: true,
            maxRecoveryAttempts: 3,
            recoveryAttemptGracePeriodMs: 5000,
            cooldownPeriodMs: 30000,
            monitoringIntervalMs: 60000,
            enableProactiveHealing: true,
            enableRules: true,
            enableMetrics: mergedConfig.enablePerformanceMonitoring
          }
        )
      : undefined;
    
    // Zustandsmanager erstellen
    const stateManager = mergedConfig.enableSelectiveSync
      ? new SelectiveStateManager(
          statusManager,
          performanceMonitor,
          {
            enabled: true,
            enableSelectiveSync: true,
            debounceMs: 50,
            throttleMs: 100,
            batchUpdates: true,
            preventCircularReferences: true,
            monitorSyncPerformance: mergedConfig.enablePerformanceMonitoring,
            detectStateConflicts: true
          }
        )
      : undefined;
    
    // Chat-Bridge erstellen
    const chatBridge = new SelectiveChatBridge(
      eventBus,
      statusManager,
      {
        enableSelectiveSync: mergedConfig.enableSelectiveSync,
        syncMessagesDebounceMs: 50,
        syncSessionsDebounceMs: 100,
        syncStatusThrottleMs: 100,
        maxBatchSize: 10,
        useRequestAnimationFrame: true,
        prioritizeVisibleMessages: true,
        messageCache: true,
        messageCacheSize: 100,
        sessionCache: true,
        sessionCacheSize: 20,
        autoRecovery: mergedConfig.enableSelfHealing,
        maxRetryAttempts: 3,
        retryDelay: 1000,
        monitorPerformance: mergedConfig.enablePerformanceMonitoring,
        monitorMemory: mergedConfig.enableMemoryManagement,
        diagnosticsLevel: mergedConfig.logLevel,
        testMode: mergedConfig.testMode
      },
      memoryManager,
      performanceMonitor,
      selfHealing
    );
    
    // Diagnose-Tools erstellen
    const diagnostics = mergedConfig.enableDiagnostics
      ? new ChatBridgeDiagnostics(
          performanceMonitor!,
          statusManager,
          {
            enabled: true,
            enableConsoleCommands: mergedConfig.enableDeveloperTools,
            enablePerformanceMonitoring: mergedConfig.enablePerformanceMonitoring,
            enableAutoReporting: false,
            enableDeveloperToolbar: mergedConfig.enableDeveloperTools,
            autoReportIntervalMs: 300000,
            metricSamplingRateMs: 5000,
            maxMetricsHistory: 100,
            maxLogsHistory: 200,
            alertThresholds: {
              highLatencyMs: 500,
              memorySpikePercent: 30,
              errorRateThreshold: 0.1,
              inactivityTimeoutMs: 30000
            }
          }
        )
      : undefined;
    
    // Komponenten speichern
    components = {
      eventBus,
      batchedEmitter: batchedEmitter!,
      memoryManager: memoryManager!,
      performanceMonitor: performanceMonitor!,
      selfHealing: selfHealing!,
      stateManager: stateManager!,
      eventListenerManager: eventListenerManager!,
      chatBridge,
      diagnostics: diagnostics!,
      statusManager
    };
    
    // Komponenten registrieren
    if (diagnostics) {
      diagnostics.registerComponents(
        chatBridge,
        eventListenerManager,
        batchedEmitter
      );
    }
    
    if (selfHealing) {
      selfHealing.registerComponents(
        components
      );
    }
    
    // ChatBridge initialisieren
    const chatBridgeInitialized = await chatBridge.initialize();
    
    if (!chatBridgeInitialized) {
      throw new Error('ChatBridge konnte nicht initialisiert werden');
    }
    
    // Initialisierungsstatus setzen
    isInitialized = true;
    
    // Bridge API erstellen und zurückgeben
    return createBridgeAPI(components);
    
  } catch (error) {
    logger.error('Fehler bei der Initialisierung des optimierten Bridge-Systems', error);
    throw error;
  }
}

/**
 * Bridge-API für externe Nutzung erstellen
 */
function createBridgeAPI(components: OptimizedBridgeComponents): OptimizedBridgeAPI {
  const {
    eventBus,
    batchedEmitter,
    stateManager,
    chatBridge,
    diagnostics,
    eventListenerManager,
    selfHealing
  } = components;
  
  return {
    // Kern-Funktionen
    initialize: async () => {
      if (!isInitialized) {
        return chatBridge.initialize();
      }
      return true;
    },
    
    dispose: () => {
      if (isInitialized && components) {
        // Komponenten freigeben
        chatBridge.dispose();
        
        if (eventListenerManager) {
          eventListenerManager.dispose();
        }
        
        if (batchedEmitter) {
          batchedEmitter.dispose();
        }
        
        if (diagnostics) {
          diagnostics.dispose();
        }
        
        // Status zurücksetzen
        isInitialized = false;
        components = null;
      }
    },
    
    isInitialized: () => isInitialized,
    
    // Event-System
    on: (event, handler, component = 'unknown') => {
      if (eventListenerManager) {
        const id = eventListenerManager.registerListener(
          event,
          handler,
          component,
          event.startsWith('vue') ? 'vue' : event.startsWith('vanilla') ? 'vanilla' : 'system'
        );
        
        // Event-Handler registrieren
        const unsubscribe = eventBus.on(event, (data) => {
          // Aufruf zählen
          if (eventListenerManager) {
            eventListenerManager.trackHandlerCall(id);
          }
          
          // Handler aufrufen
          handler(data);
        });
        
        return {
          unsubscribe: () => {
            unsubscribe();
            if (eventListenerManager) {
              eventListenerManager.removeListener(id);
            }
          }
        };
      } else {
        // Fallback direkt zum Event-Bus
        const unsubscribe = eventBus.on(event, handler);
        return { unsubscribe };
      }
    },
    
    off: (event, handler) => {
      eventBus.off(event, handler);
    },
    
    emit: (event, data) => {
      if (batchedEmitter) {
        // Über Batch-Emitter senden
        batchedEmitter.addEvent(
          event,
          data,
          event.startsWith('vue') ? 'vue' : event.startsWith('vanilla') ? 'vanilla' : 'system'
        );
      } else {
        // Direkt senden
        eventBus.emit(event, data);
      }
    },
    
    // State-Management
    syncState: (stateKey, data) => {
      if (stateManager) {
        stateManager.syncState(stateKey, data);
      }
    },
    
    getState: (stateKey) => {
      if (stateManager) {
        return stateManager.getState(stateKey);
      }
      return null;
    },
    
    // Chat-spezifische Funktionen
    sendMessage: (content, sessionId) => {
      return chatBridge.sendMessage(content, sessionId);
    },
    
    getSessionMessages: (sessionId) => {
      return chatBridge.getMessages(sessionId);
    },
    
    getActiveSessions: () => {
      return chatBridge.getSessions();
    },
    
    // Diagnose-Tools
    testConnection: async () => {
      if (diagnostics) {
        const result = await diagnostics.pingTest(1);
        return { 
          connected: result.success, 
          latency: result.avgLatency
        };
      }
      return { connected: isInitialized, latency: -1 };
    },
    
    getStatus: () => {
      if (diagnostics) {
        return (window as any).chatBridgeDiagnostics?.getStatus() || { isInitialized };
      }
      return { isInitialized };
    },
    
    generateReport: () => {
      if (diagnostics) {
        return diagnostics.generateReport();
      }
      return null;
    },
    
    showDiagnostics: () => {
      if (diagnostics) {
        diagnostics.showDeveloperToolbar();
      }
    },
    
    // Self-Healing
    triggerHealing: async () => {
      if (selfHealing) {
        return selfHealing.runHealthCheck();
      }
      return false;
    }
  };
}

/**
 * Singleton-Instanz der optimierten Bridge API abrufen
 */
let bridgeAPI: OptimizedBridgeAPI | null = null;

export async function getOptimizedBridge(config: Partial<OptimizedBridgeConfig> = {}): Promise<OptimizedBridgeAPI> {
  if (!bridgeAPI) {
    bridgeAPI = await initializeOptimizedBridge(config);
  }
  return bridgeAPI;
}

export default {
  initializeOptimizedBridge,
  getOptimizedBridge
};