/**
 * SelectiveChatBridge - Optimierte ChatBridge-Implementierung
 * 
 * Diese Implementierung erweitert die ChatBridge um selektive Synchronisierung,
 * optimierte Batch-Updates und verbesserte Fehlerbehandlung/Fallback-Mechanismen.
 */

import { ref, watch, toRaw, computed, nextTick } from 'vue';
import { EnhancedEventBus } from './enhancedEventBus';
import { MemoryManager } from './memoryManager';
import { PerformanceMonitor } from './performanceMonitor';
import { EnhancedSelfHealing } from './enhancedSelfHealing';
import { Logger, LogLevel } from '../logger';
import { BridgeStatusManager } from '../statusManager';
import { BridgeErrorState } from '../types';

// Chat-spezifische Typen, erweitert um Metadaten und Performanz-Attribute
interface ChatMessage {
  id: string;
  content: string;
  role: string;
  timestamp: number;
  status: string;
  sessionId: string;
  isDirty?: boolean;          // Markierung für Synchronisierungsbedarf
  lastSyncTime?: number;      // Zeitpunkt der letzten Synchronisierung
  metadata?: Record<string, any>; // Zusätzliche Metadaten
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage?: string;
  lastActivity: number;
  messageCount: number;
  isPinned?: boolean;
  isDirty?: boolean;          // Markierung für Synchronisierungsbedarf
  lastSyncTime?: number;      // Zeitpunkt der letzten Synchronisierung
  metadata?: Record<string, any>; // Zusätzliche Metadaten
}

// Konfiguration für die selektive Synchronisierung
interface SelectiveSyncConfig {
  // Selektive Synchronisierung
  enableSelectiveSync: boolean;          // Aktiviert selektive Synchronisierung
  syncMessagesDebounceMs: number;        // Debounce für Nachrichtensynchronisierung
  syncSessionsDebounceMs: number;        // Debounce für Sitzungssynchronisierung
  syncStatusThrottleMs: number;          // Throttle für Statussynchronisierung
  maxBatchSize: number;                  // Maximale Batch-Größe für Nachrichten
  
  // Optimierungen
  useRequestAnimationFrame: boolean;     // Verwende requestAnimationFrame für Updates
  prioritizeVisibleMessages: boolean;    // Priorisierung sichtbarer Nachrichten
  
  // Cache-Konfiguration
  messageCache: boolean;                 // Cache für Nachrichten aktivieren
  messageCacheSize: number;              // Maximale Anzahl von Nachrichten im Cache
  sessionCache: boolean;                 // Cache für Sitzungen aktivieren
  sessionCacheSize: number;              // Maximale Anzahl von Sitzungen im Cache
  
  // Fehlerbehebung und Überwachung
  autoRecovery: boolean;                 // Automatische Wiederherstellung aktivieren
  maxRetryAttempts: number;              // Maximale Anzahl von Wiederholungsversuchen
  retryDelay: number;                    // Verzögerung zwischen Wiederholungsversuchen
  monitorPerformance: boolean;           // Leistungsüberwachung aktivieren
  monitorMemory: boolean;                // Speicherüberwachung aktivieren
  diagnosticsLevel: LogLevel;            // Logging-Level für Diagnose
  
  // Test-Modus
  testMode: boolean;                     // Test-Modus aktivieren
}

// Standardkonfiguration
const DEFAULT_CONFIG: SelectiveSyncConfig = {
  // Selektive Synchronisierung
  enableSelectiveSync: true,
  syncMessagesDebounceMs: 50,
  syncSessionsDebounceMs: 100,
  syncStatusThrottleMs: 100,
  maxBatchSize: 10,
  
  // Optimierungen
  useRequestAnimationFrame: true,
  prioritizeVisibleMessages: true,
  
  // Cache-Konfiguration
  messageCache: true,
  messageCacheSize: 100,
  sessionCache: true,
  sessionCacheSize: 20,
  
  // Fehlerbehebung und Überwachung
  autoRecovery: true,
  maxRetryAttempts: 3,
  retryDelay: 1000,
  monitorPerformance: true,
  monitorMemory: true,
  diagnosticsLevel: LogLevel.INFO,
  
  // Test-Modus
  testMode: false,
};

/**
 * Optimierte Chat-Bridge mit selektiver Synchronisierung
 */
export class SelectiveChatBridge {
  // Kernkomponenten
  private eventBus: EnhancedEventBus;
  private memoryManager?: MemoryManager;
  private performanceMonitor?: PerformanceMonitor;
  private selfHealing?: EnhancedSelfHealing;
  private statusManager: BridgeStatusManager;
  private logger: Logger;
  
  // Konfiguration
  private config: SelectiveSyncConfig;
  
  // Status
  private initialized: boolean = false;
  private isReady: boolean = false;
  private connectionStatus = ref<'connected' | 'connecting' | 'disconnected'>('disconnected');
  private syncStatus = ref({
    lastSyncTime: 0,
    syncCount: 0,
    pendingOperations: 0,
    errorCount: 0,
    recoveryAttempts: 0,
  });
  
  // Daten
  private sessions = ref<Map<string, ChatSession>>(new Map());
  private messages = ref<Map<string, Map<string, ChatMessage>>>(new Map());
  private activeSessionId = ref<string | null>(null);
  private streamingMessageId = ref<string | null>(null);
  
  // Batch-Synchronisierung
  private pendingMessageUpdates = new Map<string, Set<string>>();
  private pendingSessionUpdates = new Set<string>();
  private pendingStatusUpdate = ref(false);
  
  // Animation Frame ID (für Batch-Updates)
  private animationFrameId: number | null = null;
  
  // Sync-Timeouts
  private syncMessagesTimeoutId: number | null = null;
  private syncSessionsTimeoutId: number | null = null;
  private syncStatusTimeoutId: number | null = null;
  
  // Wiederverbindungsversuch
  private reconnectTimeoutId: number | null = null;
  private reconnectAttempts: number = 0;
  
  /**
   * Konstruktor
   */
  constructor(
    eventBus: EnhancedEventBus,
    statusManager: BridgeStatusManager,
    config: Partial<SelectiveSyncConfig> = {},
    memoryManager?: MemoryManager,
    performanceMonitor?: PerformanceMonitor,
    selfHealing?: EnhancedSelfHealing
  ) {
    this.eventBus = eventBus;
    this.statusManager = statusManager;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.memoryManager = memoryManager;
    this.performanceMonitor = performanceMonitor;
    this.selfHealing = selfHealing;
    
    // Logger initialisieren
    this.logger = new Logger('SelectiveChatBridge', this.config.diagnosticsLevel);
    
    this.logger.info('SelectiveChatBridge initialisiert mit Konfiguration', this.config);
  }
  
  /**
   * Bridge initialisieren
   */
  public async initialize(): Promise<boolean> {
    try {
      if (this.initialized) {
        this.logger.warn('SelectiveChatBridge bereits initialisiert');
        return true;
      }
      
      this.logger.info('Initialisiere SelectiveChatBridge');
      
      // Event-Listener registrieren
      this.registerEventListeners();
      
      // Memory-Manager registrieren
      if (this.memoryManager && this.config.monitorMemory) {
        this.memoryManager.registerComponent('chatBridge', () => this.getMemoryUsageEstimate());
      }
      
      // Self-Healing-Regeln registrieren
      if (this.selfHealing && this.config.autoRecovery) {
        this.registerHealingRules();
      }
      
      // Verbindung herstellen
      this.connectionStatus.value = 'connecting';
      const isConnected = await this.connectToVue();
      
      if (isConnected) {
        this.initialized = true;
        this.connectionStatus.value = 'connected';
        this.statusManager.updateStatus({
          state: BridgeErrorState.HEALTHY,
          message: 'SelectiveChatBridge erfolgreich initialisiert und verbunden',
          affectedComponents: []
        });
        
        this.logger.info('SelectiveChatBridge erfolgreich initialisiert');
        return true;
      } else {
        this.connectionStatus.value = 'disconnected';
        this.statusManager.updateStatus({
          state: BridgeErrorState.COMMUNICATION_ERROR,
          message: 'Verbindungsfehler bei der Initialisierung der SelectiveChatBridge',
          affectedComponents: ['SelectiveChatBridge']
        });
        
        this.logger.error('Fehler bei der Initialisierung der SelectiveChatBridge');
        return false;
      }
    } catch (error) {
      this.logger.error('Unerwarteter Fehler bei der Initialisierung der SelectiveChatBridge', error);
      this.statusManager.updateStatus({
        state: BridgeErrorState.CRITICAL_FAILURE,
        message: `Kritischer Fehler bei der Initialisierung: ${(error as Error).message}`,
        affectedComponents: ['SelectiveChatBridge']
      });
      return false;
    }
  }
  
  /**
   * Bereitstellungsstatus abfragen
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Aktuelle Sitzungen abrufen
   */
  public getSessions(): ChatSession[] {
    return Array.from(this.sessions.value.values());
  }
  
  /**
   * Aktive Sitzung abrufen
   */
  public getActiveSession(): ChatSession | null {
    if (!this.activeSessionId.value) return null;
    return this.sessions.value.get(this.activeSessionId.value) || null;
  }
  
  /**
   * Nachrichten einer Sitzung abrufen
   */
  public getMessages(sessionId: string): ChatMessage[] {
    if (!this.messages.value.has(sessionId)) return [];
    return Array.from(this.messages.value.get(sessionId)!.values());
  }
  
  /**
   * Nachricht senden
   */
  public sendMessage(content: string, sessionId?: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const targetSessionId = sessionId || this.activeSessionId.value;
        
        if (!targetSessionId) {
          this.logger.error('Keine aktive Sitzung zum Senden der Nachricht');
          reject(new Error('Keine aktive Sitzung zum Senden der Nachricht'));
          return;
        }
        
        // Nachricht vor-registrieren (für Optimistisches UI)
        const messageId = this.generateId();
        const timestamp = Date.now();
        
        // Timeout für Fehlerbehandlung
        const timeoutId = window.setTimeout(() => {
          this.logger.warn('Timeout beim Senden der Nachricht');
          
          if (this.messages.value.has(targetSessionId)) {
            const messageMap = this.messages.value.get(targetSessionId)!;
            if (messageMap.has(messageId)) {
              const message = messageMap.get(messageId)!;
              
              // Nachrichtenstatus auf Fehler setzen
              this.updateMessageStatus(targetSessionId, messageId, 'error');
              
              // Event auslösen
              this.eventBus.emit('vanillaChat:messageError', {
                messageId,
                sessionId: targetSessionId,
                error: 'Timeout beim Senden der Nachricht',
                timestamp
              });
              
              reject(new Error('Timeout beim Senden der Nachricht'));
            }
          }
        }, 10000); // 10 Sekunden Timeout
        
        // Event für Vue-Komponenten auslösen
        this.eventBus.emit('vanillaChat:sendMessage', {
          content,
          sessionId: targetSessionId,
          messageId, // Explizite Message-ID mitgeben
          timestamp
        });
        
        // Erfolgs-Handler registrieren
        const successHandler = (data: { messageId: string, sessionId: string }) => {
          if (data.messageId === messageId) {
            clearTimeout(timeoutId);
            this.eventBus.off('vueChat:messageSent', successHandler);
            resolve(true);
          }
        };
        
        // Fehler-Handler registrieren
        const errorHandler = (data: { messageId: string, sessionId: string, error: string }) => {
          if (data.messageId === messageId) {
            clearTimeout(timeoutId);
            this.eventBus.off('vueChat:messageError', errorHandler);
            this.logger.error(`Fehler beim Senden der Nachricht: ${data.error}`);
            reject(new Error(data.error));
          }
        };
        
        // Event-Handler registrieren
        this.eventBus.on('vueChat:messageSent', successHandler);
        this.eventBus.on('vueChat:messageError', errorHandler);
        
        // Leistungsüberwachung
        if (this.performanceMonitor && this.config.monitorPerformance) {
          this.performanceMonitor.startTimer(`sendMessage-${messageId}`);
        }
        
        this.logger.debug(`Nachricht wird gesendet. SessionId: ${targetSessionId}, MessageId: ${messageId}`);
      } catch (error) {
        this.logger.error('Unerwarteter Fehler beim Senden der Nachricht', error);
        reject(error);
      }
    });
  }

  /**
   * Nachrichtenstatus aktualisieren
   */
  private updateMessageStatus(sessionId: string, messageId: string, status: string): void {
    if (!this.messages.value.has(sessionId)) return;
    
    const messageMap = this.messages.value.get(sessionId)!;
    if (!messageMap.has(messageId)) return;
    
    const message = messageMap.get(messageId)!;
    message.status = status;
    message.isDirty = true;
    message.lastSyncTime = Date.now();
    
    messageMap.set(messageId, message);
    
    // Synchronisierung planen
    this.queueMessageUpdate(sessionId, messageId);
  }
  
  /**
   * Nachrichtenaktualisierung in die Warteschlange stellen
   */
  private queueMessageUpdate(sessionId: string, messageId: string): void {
    if (!this.pendingMessageUpdates.has(sessionId)) {
      this.pendingMessageUpdates.set(sessionId, new Set());
    }
    
    // Nachricht zur Synchronisierung markieren
    this.pendingMessageUpdates.get(sessionId)!.add(messageId);
    
    // Synchronisierung planen
    this.scheduleSyncMessages();
  }
  
  /**
   * Nachrichtensynchronisierung planen
   */
  private scheduleSyncMessages(): void {
    // Bestehende Timeout löschen
    if (this.syncMessagesTimeoutId !== null) {
      window.clearTimeout(this.syncMessagesTimeoutId);
      this.syncMessagesTimeoutId = null;
    }
    
    // Animation Frame verwenden, wenn konfiguriert
    if (this.config.useRequestAnimationFrame) {
      if (this.animationFrameId === null) {
        this.animationFrameId = requestAnimationFrame(() => {
          this.animationFrameId = null;
          this.processPendingUpdates();
        });
      }
    } else {
      // Debounced Timeout verwenden
      this.syncMessagesTimeoutId = window.setTimeout(() => {
        this.syncMessagesTimeoutId = null;
        this.processPendingUpdates();
      }, this.config.syncMessagesDebounceMs);
    }
  }
  
  /**
   * Ausstehende Updates verarbeiten
   */
  private processPendingUpdates(): void {
    // Nachrichten synchronisieren
    if (this.pendingMessageUpdates.size > 0) {
      this.syncDirtyMessages();
    }
    
    // Sitzungen synchronisieren
    if (this.pendingSessionUpdates.size > 0) {
      this.syncDirtySessions();
    }
    
    // Status synchronisieren
    if (this.pendingStatusUpdate.value) {
      this.syncStatus.value.syncCount++;
      this.syncStatus.value.lastSyncTime = Date.now();
      this.pendingStatusUpdate.value = false;
      
      // Event auslösen
      this.eventBus.emit('vueChat:statusUpdated', {
        isStreaming: this.streamingMessageId.value !== null,
        activeSessionId: this.activeSessionId.value,
        timestamp: Date.now()
      });
    }
    
    // Leistungsüberwachung
    if (this.performanceMonitor && this.config.monitorPerformance) {
      this.performanceMonitor.recordMetric(
        'chatBridge.syncOperations', 
        this.syncStatus.value.syncCount, 
        'count',
        'chatBridge',
        'sync'
      );
    }
  }
  
  /**
   * Geänderte Nachrichten synchronisieren
   */
  private syncDirtyMessages(): void {
    if (this.pendingMessageUpdates.size === 0) return;
    
    try {
      // Performance-Messung starten
      let startTime = 0;
      if (this.performanceMonitor && this.config.monitorPerformance) {
        startTime = performance.now();
      }
      
      // Für jede Sitzung mit geänderten Nachrichten
      for (const [sessionId, messageIds] of this.pendingMessageUpdates.entries()) {
        // Sitzung prüfen
        if (!this.messages.value.has(sessionId)) continue;
        const messageMap = this.messages.value.get(sessionId)!;
        
        // Prioritäten setzen, wenn konfiguriert
        let messagesToSync = Array.from(messageIds);
        
        if (this.config.prioritizeVisibleMessages && this.activeSessionId.value === sessionId) {
          // Aktive Sitzung: Nachrichten priorisieren
          messagesToSync.sort((a, b) => {
            const messageA = messageMap.get(a);
            const messageB = messageMap.get(b);
            
            if (!messageA || !messageB) return 0;
            
            // Streaming-Nachrichten priorisieren
            if (messageA.id === this.streamingMessageId.value) return -1;
            if (messageB.id === this.streamingMessageId.value) return 1;
            
            // Dann nach Zeitstempel sortieren (neuere zuerst)
            return messageB.timestamp - messageA.timestamp;
          });
        }
        
        // Batch-Größe begrenzen
        if (messagesToSync.length > this.config.maxBatchSize) {
          messagesToSync = messagesToSync.slice(0, this.config.maxBatchSize);
        }
        
        // Nachrichten sammeln
        const messages: ChatMessage[] = messagesToSync
          .map(id => messageMap.get(id))
          .filter((message): message is ChatMessage => message !== undefined);
        
        // Nur synchronisieren, wenn es Nachrichten gibt
        if (messages.length > 0) {
          // Event auslösen
          this.eventBus.emit('vueChat:messagesUpdated', {
            messages,
            sessionId,
            timestamp: Date.now()
          });
          
          // Nachrichten als synchronisiert markieren
          for (const message of messages) {
            message.isDirty = false;
            message.lastSyncTime = Date.now();
            messageMap.set(message.id, message);
            
            // Aus der Warteschlange entfernen
            messageIds.delete(message.id);
          }
          
          this.logger.debug(`${messages.length} Nachrichten für Sitzung ${sessionId} synchronisiert`);
        }
        
        // Leere Einträge entfernen
        if (messageIds.size === 0) {
          this.pendingMessageUpdates.delete(sessionId);
        }
      }
      
      // Performance-Messung beenden
      if (this.performanceMonitor && this.config.monitorPerformance) {
        const endTime = performance.now();
        this.performanceMonitor.recordMetric(
          'chatBridge.syncMessagesDuration', 
          endTime - startTime, 
          'ms',
          'chatBridge',
          'sync'
        );
      }
    } catch (error) {
      this.logger.error('Fehler bei der Synchronisierung der Nachrichten', error);
      
      // Fehlerbehandlung
      this.syncStatus.value.errorCount++;
      
      if (this.config.autoRecovery) {
        this.attemptRecovery();
      }
    }
  }
  
  /**
   * Geänderte Sitzungen synchronisieren
   */
  private syncDirtySessions(): void {
    if (this.pendingSessionUpdates.size === 0) return;
    
    try {
      // Performance-Messung starten
      let startTime = 0;
      if (this.performanceMonitor && this.config.monitorPerformance) {
        startTime = performance.now();
      }
      
      // Sitzungen sammeln
      const sessions: ChatSession[] = Array.from(this.pendingSessionUpdates)
        .map(id => this.sessions.value.get(id))
        .filter((session): session is ChatSession => session !== undefined);
      
      // Nur synchronisieren, wenn es Sitzungen gibt
      if (sessions.length > 0) {
        // Event auslösen
        this.eventBus.emit('vueChat:sessionsUpdated', {
          sessions,
          activeSessionId: this.activeSessionId.value,
          timestamp: Date.now()
        });
        
        // Sitzungen als synchronisiert markieren
        for (const session of sessions) {
          session.isDirty = false;
          session.lastSyncTime = Date.now();
          this.sessions.value.set(session.id, session);
          
          // Aus der Warteschlange entfernen
          this.pendingSessionUpdates.delete(session.id);
        }
        
        this.logger.debug(`${sessions.length} Sitzungen synchronisiert`);
      }
      
      // Performance-Messung beenden
      if (this.performanceMonitor && this.config.monitorPerformance) {
        const endTime = performance.now();
        this.performanceMonitor.recordMetric(
          'chatBridge.syncSessionsDuration', 
          endTime - startTime, 
          'ms',
          'chatBridge',
          'sync'
        );
      }
    } catch (error) {
      this.logger.error('Fehler bei der Synchronisierung der Sitzungen', error);
      
      // Fehlerbehandlung
      this.syncStatus.value.errorCount++;
      
      if (this.config.autoRecovery) {
        this.attemptRecovery();
      }
    }
  }
  
  /**
   * Wiederherstellungsversuch nach Fehler
   */
  private attemptRecovery(): void {
    if (this.reconnectAttempts >= this.config.maxRetryAttempts) {
      this.logger.error(`Maximale Anzahl von Wiederverbindungsversuchen (${this.config.maxRetryAttempts}) erreicht`);
      
      // Status aktualisieren
      this.statusManager.updateStatus({
        state: BridgeErrorState.COMMUNICATION_ERROR,
        message: 'Maximale Anzahl von Wiederverbindungsversuchen erreicht',
        affectedComponents: ['SelectiveChatBridge']
      });
      
      return;
    }
    
    this.reconnectAttempts++;
    this.syncStatus.value.recoveryAttempts++;
    
    this.logger.info(`Wiederverbindungsversuch ${this.reconnectAttempts}/${this.config.maxRetryAttempts}`);
    
    // Bestehenden Timeout löschen
    if (this.reconnectTimeoutId !== null) {
      window.clearTimeout(this.reconnectTimeoutId);
    }
    
    // Neuen Timeout planen
    this.reconnectTimeoutId = window.setTimeout(async () => {
      this.reconnectTimeoutId = null;
      
      try {
        // Verbindung wiederherstellen
        const isConnected = await this.connectToVue();
        
        if (isConnected) {
          this.logger.info('Wiederverbindung erfolgreich');
          this.connectionStatus.value = 'connected';
          this.reconnectAttempts = 0;
          
          // Status aktualisieren
          this.statusManager.updateStatus({
            state: BridgeErrorState.HEALTHY,
            message: 'Wiederverbindung erfolgreich',
            affectedComponents: []
          });
          
          // Daten neu synchronisieren
          this.syncAllData();
        } else {
          this.logger.warn('Wiederverbindung fehlgeschlagen');
          
          // Status aktualisieren
          this.statusManager.updateStatus({
            state: BridgeErrorState.DEGRADED_PERFORMANCE,
            message: `Wiederverbindung fehlgeschlagen. Versuch ${this.reconnectAttempts}/${this.config.maxRetryAttempts}`,
            affectedComponents: ['SelectiveChatBridge']
          });
          
          // Erneuter Versuch
          this.attemptRecovery();
        }
      } catch (error) {
        this.logger.error('Fehler beim Wiederverbindungsversuch', error);
        
        // Status aktualisieren
        this.statusManager.updateStatus({
          state: BridgeErrorState.SYNC_ERROR,
          message: `Fehler beim Wiederverbindungsversuch: ${(error as Error).message}`,
          affectedComponents: ['SelectiveChatBridge']
        });
        
        // Erneuter Versuch
        this.attemptRecovery();
      }
    }, this.config.retryDelay * this.reconnectAttempts); // Exponentielles Backoff
  }
  
  /**
   * Alle Daten synchronisieren
   */
  private syncAllData(): void {
    // Alle Sitzungen als geändert markieren
    for (const [sessionId, session] of this.sessions.value.entries()) {
      session.isDirty = true;
      this.pendingSessionUpdates.add(sessionId);
      
      // Alle Nachrichten in der Sitzung als geändert markieren
      if (this.messages.value.has(sessionId)) {
        const messageMap = this.messages.value.get(sessionId)!;
        
        for (const [messageId, message] of messageMap.entries()) {
          message.isDirty = true;
          this.queueMessageUpdate(sessionId, messageId);
        }
      }
    }
    
    // Status aktualisieren
    this.pendingStatusUpdate.value = true;
    
    // Synchronisierung planen
    this.scheduleSyncMessages();
  }
  
  /**
   * Mit Vue-Komponenten verbinden
   */
  private async connectToVue(): Promise<boolean> {
    return new Promise((resolve) => {
      // Timeout für Verbindung
      const timeoutId = window.setTimeout(() => {
        this.logger.warn('Timeout bei der Verbindung mit Vue-Komponenten');
        this.eventBus.off('vueChat:ready', readyHandler);
        resolve(false);
      }, 5000);
      
      // Handler für Ready-Event
      const readyHandler = () => {
        clearTimeout(timeoutId);
        this.isReady = true;
        this.logger.info('Verbindung mit Vue-Komponenten hergestellt');
        resolve(true);
      };
      
      // Event-Handler registrieren
      this.eventBus.on('vueChat:ready', readyHandler);
      
      // Ping an Vue-Komponenten senden
      this.eventBus.emit('vanillaChat:ping', { timestamp: Date.now() });
      
      this.logger.debug('Verbindung mit Vue-Komponenten wird hergestellt');
    });
  }
  
  /**
   * Event-Listener registrieren
   */
  private registerEventListeners(): void {
    // Vue-seitige Events
    this.eventBus.on('vueChat:messagesUpdated', this.handleMessagesUpdated.bind(this));
    this.eventBus.on('vueChat:sessionCreated', this.handleSessionCreated.bind(this));
    this.eventBus.on('vueChat:sessionDeleted', this.handleSessionDeleted.bind(this));
    this.eventBus.on('vueChat:sessionsUpdated', this.handleSessionsUpdated.bind(this));
    this.eventBus.on('vueChat:statusUpdated', this.handleStatusUpdated.bind(this));
    this.eventBus.on('vueChat:error', this.handleVueError.bind(this));
    this.eventBus.on('vueChat:pingVanilla', this.handlePingRequest.bind(this));
    
    // Memory-Management: Wenn die Komponente entladen wird, Ressourcen freigeben
    if (this.memoryManager && this.config.monitorMemory) {
      this.memoryManager.registerCleanupCallback('chatBridge', () => this.dispose());
    }
  }
  
  /**
   * Verarbeitet aktualisierte Nachrichten von Vue
   */
  private handleMessagesUpdated(data: { messages: ChatMessage[], sessionId: string, timestamp: number }): void {
    // Sitzung prüfen
    if (!this.messages.value.has(data.sessionId)) {
      this.messages.value.set(data.sessionId, new Map());
    }
    
    const messageMap = this.messages.value.get(data.sessionId)!;
    
    // Nachrichten aktualisieren
    for (const message of data.messages) {
      messageMap.set(message.id, {
        ...message,
        isDirty: false,
        lastSyncTime: data.timestamp
      });
    }
    
    // Vanilla-seitiges Event auslösen
    if (window.nScaleChat && typeof window.nScaleChat.onMessagesUpdated === 'function') {
      nextTick(() => {
        window.nScaleChat.onMessagesUpdated(data.messages);
      });
    }
    
    // Leistungsüberwachung
    if (this.performanceMonitor && this.config.monitorPerformance) {
      this.performanceMonitor.recordMetric(
        'chatBridge.messagesReceived', 
        data.messages.length, 
        'count',
        'chatBridge',
        'messages'
      );
    }
    
    this.logger.debug(`${data.messages.length} Nachrichten für Sitzung ${data.sessionId} von Vue aktualisiert`);
  }
  
  /**
   * Verarbeitet Sitzungserstellung von Vue
   */
  private handleSessionCreated(data: { sessionId: string, title?: string, timestamp: number }): void {
    // Sitzung erstellen
    const session: ChatSession = {
      id: data.sessionId,
      title: data.title || 'Neue Sitzung',
      lastActivity: data.timestamp,
      messageCount: 0,
      isDirty: false,
      lastSyncTime: data.timestamp
    };
    
    // Sitzung speichern
    this.sessions.value.set(data.sessionId, session);
    
    // Nachrichtenmap erstellen
    this.messages.value.set(data.sessionId, new Map());
    
    // Vanilla-seitiges Event auslösen
    if (window.nScaleChat && typeof window.nScaleChat.onSessionCreated === 'function') {
      nextTick(() => {
        window.nScaleChat.onSessionCreated(data.sessionId);
      });
    }
    
    this.logger.debug(`Sitzung ${data.sessionId} erstellt`);
  }
  
  /**
   * Verarbeitet Sitzungslöschung von Vue
   */
  private handleSessionDeleted(data: { sessionId: string }): void {
    // Sitzung löschen
    this.sessions.value.delete(data.sessionId);
    
    // Nachrichten löschen
    this.messages.value.delete(data.sessionId);
    
    // Aktive Sitzung zurücksetzen, wenn nötig
    if (this.activeSessionId.value === data.sessionId) {
      this.activeSessionId.value = null;
    }
    
    // Vanilla-seitiges Event auslösen
    if (window.nScaleChat && typeof window.nScaleChat.onSessionDeleted === 'function') {
      nextTick(() => {
        window.nScaleChat.onSessionDeleted(data.sessionId);
      });
    }
    
    this.logger.debug(`Sitzung ${data.sessionId} gelöscht`);
  }
  
  /**
   * Verarbeitet aktualisierte Sitzungen von Vue
   */
  private handleSessionsUpdated(data: { 
    sessions: ChatSession[], 
    activeSessionId: string | null,
    timestamp: number 
  }): void {
    // Aktive Sitzung aktualisieren
    this.activeSessionId.value = data.activeSessionId;
    
    // Sitzungen aktualisieren
    for (const session of data.sessions) {
      this.sessions.value.set(session.id, {
        ...session,
        isDirty: false,
        lastSyncTime: data.timestamp
      });
      
      // Sitzungs-Nachrichtenmap erstellen, falls noch nicht vorhanden
      if (!this.messages.value.has(session.id)) {
        this.messages.value.set(session.id, new Map());
      }
    }
    
    // Cache-Größe kontrollieren, wenn konfiguriert
    if (this.config.sessionCache && this.sessions.value.size > this.config.sessionCacheSize) {
      this.pruneSessionCache();
    }
    
    // Vanilla-seitiges Event auslösen
    if (window.nScaleChat && typeof window.nScaleChat.onSessionsUpdated === 'function') {
      nextTick(() => {
        window.nScaleChat.onSessionsUpdated({
          sessions: data.sessions,
          activeSessionId: data.activeSessionId
        });
      });
    }
    
    // Leistungsüberwachung
    if (this.performanceMonitor && this.config.monitorPerformance) {
      this.performanceMonitor.recordMetric(
        'chatBridge.sessionsCount', 
        data.sessions.length, 
        'count',
        'chatBridge',
        'sessions'
      );
    }
    
    this.logger.debug(`${data.sessions.length} Sitzungen von Vue aktualisiert`);
  }
  
  /**
   * Session-Cache bereinigen
   */
  private pruneSessionCache(): void {
    // Sitzungen sortieren (gepinnte und aktive Sitzungen behalten, dann nach Aktivität)
    const sortedSessions = Array.from(this.sessions.value.entries())
      .sort(([, a], [, b]) => {
        // Gepinnte Sitzungen behalten
        if (a.isPinned && !b.isPinned) return 1;
        if (!a.isPinned && b.isPinned) return -1;
        
        // Aktive Sitzung behalten
        if (a.id === this.activeSessionId.value) return 1;
        if (b.id === this.activeSessionId.value) return -1;
        
        // Nach Aktivität sortieren (älteste zuerst)
        return a.lastActivity - b.lastActivity;
      });
    
    // Überzählige Sitzungen entfernen
    const toRemove = sortedSessions.length - this.config.sessionCacheSize;
    if (toRemove <= 0) return;
    
    sortedSessions.slice(0, toRemove).forEach(([sessionId]) => {
      this.sessions.value.delete(sessionId);
      this.messages.value.delete(sessionId);
      this.logger.debug(`Sitzung ${sessionId} aus Cache entfernt`);
    });
  }
  
  /**
   * Verarbeitet Statusaktualisierungen von Vue
   */
  private handleStatusUpdated(data: { 
    isLoading: boolean, 
    isSending: boolean, 
    hasStreamingMessage: boolean,
    streamingMessageId?: string,
    timestamp: number 
  }): void {
    // Streaming-Status aktualisieren
    this.streamingMessageId.value = data.streamingMessageId || null;
    
    // Vanilla-seitiges Event auslösen
    if (window.nScaleChat && typeof window.nScaleChat.onStatusUpdated === 'function') {
      nextTick(() => {
        window.nScaleChat.onStatusUpdated({
          isLoading: data.isLoading,
          isSending: data.isSending,
          hasStreamingMessage: data.hasStreamingMessage
        });
      });
    }
  }
  
  /**
   * Verarbeitet Fehler von Vue
   */
  private handleVueError(data: { action: string, error: string }): void {
    this.logger.error(`Fehler von Vue-Komponente: ${data.action} - ${data.error}`);
    
    // Fehlerstatistik aktualisieren
    this.syncStatus.value.errorCount++;
    
    // Vanilla-seitiges Event auslösen
    if (window.nScaleChat && typeof window.nScaleChat.onError === 'function') {
      nextTick(() => {
        window.nScaleChat.onError(data);
      });
    }
    
    // Self-Healing, wenn konfiguriert
    if (this.selfHealing && this.config.autoRecovery) {
      this.selfHealing.handleError(new Error(`Vue-Fehler: ${data.action} - ${data.error}`));
    }
  }
  
  /**
   * Verarbeitet Ping-Anfragen von Vue
   */
  private handlePingRequest(data: { timestamp: number }): void {
    // Direkt antworten
    this.eventBus.emit('vanillaChat:pong', {
      timestamp: Date.now(),
      latency: Date.now() - data.timestamp
    });
  }
  
  /**
   * Self-Healing-Regeln registrieren
   */
  private registerHealingRules(): void {
    if (!this.selfHealing) return;
    
    // Regel: Verbindungsprobleme
    this.selfHealing.registerRule({
      name: 'chatBridge:connection',
      symptom: /connection.*failed|timeout|disconnected/i,
      remedy: async () => {
        this.logger.info('Self-Healing: Versuche Wiederverbindung');
        const isConnected = await this.connectToVue();
        return isConnected;
      },
      description: 'Wiederverbindung mit Vue-Komponenten'
    });
    
    // Regel: Synchronisierungsprobleme
    this.selfHealing.registerRule({
      name: 'chatBridge:sync',
      symptom: /sync.*failed|synchronization|state.*mismatch/i,
      remedy: async () => {
        this.logger.info('Self-Healing: Synchronisiere alle Daten');
        this.syncAllData();
        return true;
      },
      description: 'Neusynchronisierung aller Daten'
    });
    
    // Regel: Streaming-Fehler
    this.selfHealing.registerRule({
      name: 'chatBridge:streaming',
      symptom: /streaming.*error|message.*incomplete/i,
      remedy: async () => {
        this.logger.info('Self-Healing: Setze Streaming-Status zurück');
        
        // Streaming-Status zurücksetzen
        if (this.streamingMessageId.value) {
          const oldStreamingId = this.streamingMessageId.value;
          this.streamingMessageId.value = null;
          
          // Status sofort synchronisieren
          this.eventBus.emit('vueChat:statusUpdated', {
            isStreaming: false,
            activeSessionId: this.activeSessionId.value,
            timestamp: Date.now()
          });
          
          this.logger.debug(`Streaming-Status für Nachricht ${oldStreamingId} zurückgesetzt`);
          return true;
        }
        
        return false;
      },
      description: 'Zurücksetzen des Streaming-Status'
    });
  }
  
  /**
   * Geschätzten Speicherverbrauch berechnen
   */
  private getMemoryUsageEstimate(): number {
    let totalBytes = 0;
    
    // Sitzungen
    const sessionCount = this.sessions.value.size;
    totalBytes += sessionCount * 500; // Geschätzte Größe pro Sitzung
    
    // Nachrichten
    let messageCount = 0;
    for (const messageMap of this.messages.value.values()) {
      messageCount += messageMap.size;
    }
    totalBytes += messageCount * 1000; // Geschätzte Größe pro Nachricht
    
    // Warteschlangen
    let pendingMessageCount = 0;
    for (const messageIds of this.pendingMessageUpdates.values()) {
      pendingMessageCount += messageIds.size;
    }
    totalBytes += pendingMessageCount * 100; // Geschätzte Größe pro ID
    totalBytes += this.pendingSessionUpdates.size * 100; // Geschätzte Größe pro ID
    
    return totalBytes;
  }
  
  /**
   * Eindeutige ID generieren
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
  }
  
  /**
   * Ressourcen freigeben
   */
  public dispose(): void {
    this.logger.info('Ressourcen der SelectiveChatBridge werden freigegeben');
    
    // Laufende Timeouts löschen
    if (this.syncMessagesTimeoutId !== null) {
      window.clearTimeout(this.syncMessagesTimeoutId);
      this.syncMessagesTimeoutId = null;
    }
    
    if (this.syncSessionsTimeoutId !== null) {
      window.clearTimeout(this.syncSessionsTimeoutId);
      this.syncSessionsTimeoutId = null;
    }
    
    if (this.syncStatusTimeoutId !== null) {
      window.clearTimeout(this.syncStatusTimeoutId);
      this.syncStatusTimeoutId = null;
    }
    
    if (this.reconnectTimeoutId !== null) {
      window.clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Event-Listener entfernen
    this.eventBus.off('vueChat:messagesUpdated', this.handleMessagesUpdated);
    this.eventBus.off('vueChat:sessionCreated', this.handleSessionCreated);
    this.eventBus.off('vueChat:sessionDeleted', this.handleSessionDeleted);
    this.eventBus.off('vueChat:sessionsUpdated', this.handleSessionsUpdated);
    this.eventBus.off('vueChat:statusUpdated', this.handleStatusUpdated);
    this.eventBus.off('vueChat:error', this.handleVueError);
    this.eventBus.off('vueChat:pingVanilla', this.handlePingRequest);
    
    // Daten löschen
    this.sessions.value.clear();
    this.messages.value.clear();
    this.pendingMessageUpdates.clear();
    this.pendingSessionUpdates.clear();
    
    // Status zurücksetzen
    this.initialized = false;
    this.isReady = false;
    this.connectionStatus.value = 'disconnected';
    this.activeSessionId.value = null;
    this.streamingMessageId.value = null;
    
    // Memory-Management
    if (this.memoryManager && this.config.monitorMemory) {
      this.memoryManager.unregisterComponent('chatBridge');
    }
    
    this.logger.info('SelectiveChatBridge-Ressourcen erfolgreich freigegeben');
  }
}

// Type-Erweiterung für Window
declare global {
  interface Window {
    nScaleChat?: {
      onMessagesUpdated?: (messages: ChatMessage[]) => void;
      onStatusUpdated?: (status: { isLoading: boolean, isSending: boolean, hasStreamingMessage: boolean }) => void;
      onSessionsUpdated?: (data: { sessions: ChatSession[], activeSessionId: string | null }) => void;
      onSessionCreated?: (sessionId: string) => void;
      onSessionDeleted?: (sessionId: string) => void;
      onError?: (data: { action: string, error: string }) => void;
    };
  }
}

/**
 * Factory-Funktion für SelectiveChatBridge
 */
export function createSelectiveChatBridge(
  eventBus: EnhancedEventBus,
  statusManager: BridgeStatusManager,
  config: Partial<SelectiveSyncConfig> = {},
  memoryManager?: MemoryManager,
  performanceMonitor?: PerformanceMonitor,
  selfHealing?: EnhancedSelfHealing
): SelectiveChatBridge {
  return new SelectiveChatBridge(
    eventBus,
    statusManager,
    config,
    memoryManager,
    performanceMonitor,
    selfHealing
  );
}

export default {
  createSelectiveChatBridge
};