/**
 * EventBus-Komponente für die verbesserte Bridge
 * 
 * Diese Datei implementiert einen verbesserten EventBus, der Event-Batching,
 * Priorisierung und erweiterte Fehlerbehandlung unterstützt.
 */

import { EventBus, EventOptions, EventSubscription, BridgeLogger } from './types';

/**
 * Implementation des verbesserten EventBus
 */
export class EnhancedEventBus implements EventBus {
  private listeners: Map<string, Array<{ 
    callback: Function; 
    options: EventOptions;
    id: string;
  }>> = new Map();
  
  private batchingEnabled = true;
  private batchSize = 10;
  private batchDelay = 50; // ms
  private batchQueue: Map<string, { data: any[]; timer: number | null }> = new Map();
  private logger: BridgeLogger;
  
  constructor(logger: BridgeLogger, batchDelay: number = 50) {
    this.logger = logger;
    this.batchDelay = batchDelay;
    this.logger.info('EventBus initialisiert');
  }
  
  /**
   * Löst ein Event aus
   */
  emit(eventName: string, data: any): void {
    this.logger.debug(`Event ausgelöst: ${eventName}`, data);
    
    if (!this.batchingEnabled) {
      this.triggerEvent(eventName, data);
      return;
    }
    
    if (!this.batchQueue.has(eventName)) {
      this.batchQueue.set(eventName, { data: [], timer: null });
    }
    
    const batch = this.batchQueue.get(eventName)!;
    batch.data.push(data);
    
    if (batch.data.length >= this.batchSize) {
      // Sofort senden, wenn Batch-Größe erreicht
      this.flushEventBatch(eventName);
    } else if (batch.timer === null) {
      // Timer starten, wenn noch keiner läuft
      batch.timer = window.setTimeout(() => {
        this.flushEventBatch(eventName);
      }, this.batchDelay);
    }
  }
  
  /**
   * Sendet einen Batch von Events
   */
  private flushEventBatch(eventName: string): void {
    const batch = this.batchQueue.get(eventName);
    if (!batch) return;
    
    if (batch.timer !== null) {
      clearTimeout(batch.timer);
      batch.timer = null;
    }
    
    if (batch.data.length > 0) {
      this.logger.debug(`Batch-Event wird gesendet: ${eventName}`, { count: batch.data.length });
      this.triggerEvent(eventName, batch.data);
      batch.data = [];
    }
  }
  
  /**
   * Löst ein Event für alle Listener aus
   */
  private triggerEvent(eventName: string, data: any): void {
    if (!this.listeners.has(eventName)) return;
    
    // Kopie der Listener-Liste erstellen, um Probleme bei Änderungen während der Iteration zu vermeiden
    const listeners = [...this.listeners.get(eventName)!]
      .sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));
    
    for (const listener of listeners) {
      try {
        // Bei Once-Option: Nach dem Aufruf entfernen
        if (listener.options.once) {
          this.off(eventName, listener.id);
        }
        
        // Bei Timeout-Option: Mit Timeout ausführen
        if (listener.options.timeout) {
          this.executeWithTimeout(listener.callback, data, listener.options.timeout);
        } else {
          listener.callback(data);
        }
      } catch (error) {
        this.logger.error(`Fehler beim Ausführen des Listeners für ${eventName}:`, error);
      }
    }
  }
  
  /**
   * Führt eine Callback-Funktion mit Timeout aus
   */
  private executeWithTimeout(callback: Function, data: any, timeout: number): void {
    let hasTimedOut = false;
    
    // Timer für Timeout starten
    const timeoutId = setTimeout(() => {
      hasTimedOut = true;
      this.logger.warn(`Event-Listener-Ausführung hat das Timeout von ${timeout}ms überschritten`);
    }, timeout);
    
    try {
      // Callback ausführen
      callback(data);
    } finally {
      // Timer löschen, falls noch nicht abgelaufen
      if (!hasTimedOut) {
        clearTimeout(timeoutId);
      }
    }
  }
  
  /**
   * Registriert einen Event-Handler
   */
  on(eventName: string, callback: Function, options: EventOptions = {}): EventSubscription {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    
    const id = this.generateId();
    this.listeners.get(eventName)!.push({ callback, options, id });
    
    this.logger.debug(`Listener registriert für Event: ${eventName}`, { id });
    
    return {
      unsubscribe: () => this.off(eventName, id)
    };
  }
  
  /**
   * Entfernt einen Event-Handler
   */
  off(eventName: string, subscriptionOrId: EventSubscription | string): void {
    if (!this.listeners.has(eventName)) return;
    
    const id = typeof subscriptionOrId === 'string' 
      ? subscriptionOrId 
      : (subscriptionOrId as any).id;
    
    const listeners = this.listeners.get(eventName)!;
    const index = listeners.findIndex(listener => listener.id === id);
    
    if (index !== -1) {
      listeners.splice(index, 1);
      this.logger.debug(`Listener entfernt für Event: ${eventName}`, { id });
      
      // Leere Event-Liste entfernen
      if (listeners.length === 0) {
        this.listeners.delete(eventName);
      }
    }
  }
  
  /**
   * Registriert einen einmaligen Event-Handler
   */
  once(eventName: string, callback: Function, options: Omit<EventOptions, 'once'> = {}): EventSubscription {
    return this.on(eventName, callback, { ...options, once: true });
  }
  
  /**
   * Registriert einen Event-Handler mit Priorität
   */
  priority(eventName: string, priority: number, callback: Function, options: Omit<EventOptions, 'priority'> = {}): EventSubscription {
    return this.on(eventName, callback, { ...options, priority });
  }
  
  /**
   * Löscht alle Event-Handler
   */
  clear(): void {
    this.listeners.clear();
    
    // Alle ausstehenden Batches leeren
    this.batchQueue.forEach((batch, eventName) => {
      if (batch.timer !== null) {
        clearTimeout(batch.timer);
      }
    });
    this.batchQueue.clear();
    
    this.logger.info('EventBus zurückgesetzt');
  }
  
  /**
   * Prüft, ob der EventBus funktionsfähig ist
   */
  isOperational(): boolean {
    return true;
  }
  
  /**
   * Setzt den EventBus zurück
   */
  reset(): void {
    this.clear();
    this.logger.info('EventBus zurückgesetzt');
  }
  
  /**
   * Gibt Diagnose-Informationen zurück
   */
  getDiagnostics(): any {
    return {
      listenerCount: Array.from(this.listeners.entries()).reduce(
        (sum, [eventName, listeners]) => sum + listeners.length, 
        0
      ),
      events: Array.from(this.listeners.keys()),
      batchQueue: {
        size: this.batchQueue.size,
        events: Array.from(this.batchQueue.keys())
      }
    };
  }
  
  /**
   * Hilfsmethode für die ID-Generierung
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * Aktiviert oder deaktiviert Event-Batching
   */
  enableBatching(enabled: boolean): void {
    this.batchingEnabled = enabled;
    
    // Alle ausstehenden Batches sofort senden, wenn Batching deaktiviert wird
    if (!enabled) {
      this.batchQueue.forEach((_, eventName) => {
        this.flushEventBatch(eventName);
      });
    }
    
    this.logger.info(`Event-Batching ${enabled ? 'aktiviert' : 'deaktiviert'}`);
  }
  
  /**
   * Konfiguriert die Batch-Parameter
   */
  configureBatching(batchSize: number, batchDelay: number): void {
    this.batchSize = batchSize;
    this.batchDelay = batchDelay;
    
    this.logger.info('Event-Batching konfiguriert', { batchSize, batchDelay });
  }
}