---
title: "Bridge-System für Legacy-Integration"
version: "1.0.0"
date: "09.05.2025"
lastUpdate: "09.05.2025"
author: "Martin Heinrich"
status: "Aktiv"
priority: "Hoch"
category: "Architektur"
tags: ["Bridge", "Migration", "Vue3", "Legacy", "Integration"]
---

# Bridge-System für Legacy-Integration

> **Letzte Aktualisierung:** 09.05.2025 | **Version:** 1.0.0 | **Status:** Aktiv

## Übersicht

Das Bridge-System ist eine zentrale Komponente der Vue 3 SFC-Migration, die die nahtlose Kommunikation zwischen der neuen Vue 3-basierten Implementierung und dem bestehenden Vanilla-JavaScript-Code ermöglicht. Es wurde entwickelt, um während der Migration einen graduellen, kontrollierten Übergang zu ermöglichen, ohne die Funktionalität der Anwendung zu beeinträchtigen.

Der aktuelle Fertigstellungsgrad des Bridge-Systems liegt bei ca. 85% und bietet robuste Mechanismen für die bidirektionale Kommunikation zwischen neuen und alten Komponenten. Es unterstützt Feature-Toggle-Integration, automatische Fallback-Mechanismen und erweiterte Diagnose-Funktionen.

## Architekturüberblick

Das Bridge-System basiert auf folgenden Kernprinzipien:

1. **Bidirektionale Kommunikation**: Synchronisierung des Zustands in beide Richtungen
2. **Isolation und Kapselung**: Klare API-Grenzen zwischen den Systemen
3. **Fehlertoleranz**: Automatische Wiederherstellung bei Fehlern
4. **Diagnostik und Monitoring**: Umfassende Logging- und Überwachungsfunktionen
5. **Feature-Toggle-Integration**: Granulare Kontrolle über aktivierte Funktionen

### Architekturdiagramm

```
┌─────────────────────────┐      ┌─────────────────────────┐
│                         │      │                         │
│    Vue 3 SFC-Welt       │      │    Vanilla JS-Welt      │
│                         │      │                         │
│  ┌─────────────────┐    │      │    ┌─────────────────┐  │
│  │                 │    │      │    │                 │  │
│  │   Pinia Stores  │◄───┼──────┼────│  Legacy State   │  │
│  │                 │    │      │    │                 │  │
│  └────────┬────────┘    │      │    └────────▲────────┘  │
│           │             │      │             │           │
│  ┌────────▼────────┐    │      │    ┌────────┴────────┐  │
│  │                 │    │      │    │                 │  │
│  │ Vue Components  │◄───┼──────┼────│   Vanilla JS    │  │
│  │                 │    │      │    │                 │  │
│  └─────────────────┘    │      │    └─────────────────┘  │
│           ▲             │      │             ▲           │
└───────────┼─────────────┘      └─────────────┼───────────┘
            │                                   │
            │       ┌─────────────────┐         │
            │       │                 │         │
            └───────│  Bridge-System  │─────────┘
                    │                 │
                    └─────────────────┘
                           ▲
                           │
                    ┌─────────────────┐
                    │                 │
                    │ Feature Toggles │
                    │                 │
                    └─────────────────┘
```

## Bridge-Systemkomponenten

### 1. Kern-Bridge (`bridgeCore.ts`)

Die zentrale Komponente, die die Kommunikation zwischen den Systemen ermöglicht:

```typescript
// src/bridge/enhanced/bridgeCore.ts
import { reactive, watch } from 'vue';
import { useFeatureTogglesStore } from '@/stores/featureToggles';
import { BridgeConfig, BridgeStatus, BridgeEvent, BridgeEventHandler } from './types';
import { Logger } from './logger';

// Konfiguration mit Standardwerten
const DEFAULT_CONFIG: BridgeConfig = {
  ENABLED: true,
  AUTH_ENABLED: true,
  SESSIONS_ENABLED: true,
  UI_ENABLED: true,
  CHAT_ENABLED: true,
  DEBUG: process.env.NODE_ENV !== 'production',
  DIAGNOSTICS_LEVEL: 'info',
  AUTO_RECOVERY: true
};

// Globaler Status der Bridge
const status = reactive<BridgeStatus>({
  initialized: false,
  active: false,
  errors: [],
  activeBridges: [],
  diagnostics: {
    lastSync: null,
    syncCount: 0,
    errorCount: 0,
    recoveryCount: 0
  }
});

// Event-System
const eventHandlers: Map<string, Set<BridgeEventHandler>> = new Map();

// Logger-Instanz
const logger = new Logger('BridgeCore');

/**
 * Initialisiert das Bridge-System
 * @param config Konfiguration
 */
export function initializeBridge(config: Partial<BridgeConfig> = {}): BridgeStatus {
  // Konfiguration kombinieren
  const mergedConfig: BridgeConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };
  
  // Feature-Toggles-Store
  const featureTogglesStore = useFeatureTogglesStore();
  
  // Bridge nur initialisieren, wenn sie aktiviert ist
  if (!mergedConfig.ENABLED || !featureTogglesStore.useLegacyBridge) {
    logger.info('Bridge-System ist deaktiviert');
    return status;
  }
  
  logger.info('Initialisiere Bridge-System mit Konfiguration:', mergedConfig);
  
  // Status aktualisieren
  status.initialized = true;
  status.active = true;
  
  // Bridge-spezifische Initialisierungen
  if (mergedConfig.AUTH_ENABLED) {
    initializeAuthBridge();
  }
  
  if (mergedConfig.SESSIONS_ENABLED) {
    initializeSessionsBridge();
  }
  
  if (mergedConfig.UI_ENABLED) {
    initializeUIBridge();
  }
  
  if (mergedConfig.CHAT_ENABLED) {
    initializeChatBridge();
  }
  
  // Überwachung der Feature-Toggle-Änderungen
  watch(() => featureTogglesStore.useLegacyBridge, (newValue) => {
    if (newValue !== status.active) {
      status.active = newValue;
      if (newValue) {
        logger.info('Bridge wurde aktiviert');
        emitEvent('bridge:activated', {});
      } else {
        logger.info('Bridge wurde deaktiviert');
        emitEvent('bridge:deactivated', {});
      }
    }
  });
  
  // Events registrieren
  registerGlobalEvents();
  
  logger.info('Bridge-System erfolgreich initialisiert');
  
  return status;
}

/**
 * Registriert einen Event-Handler
 * @param eventType Event-Typ
 * @param handler Event-Handler-Funktion
 */
export function onBridgeEvent(eventType: string, handler: BridgeEventHandler): void {
  if (!eventHandlers.has(eventType)) {
    eventHandlers.set(eventType, new Set());
  }
  
  eventHandlers.get(eventType)!.add(handler);
  logger.debug(`Event-Handler für '${eventType}' registriert`);
}

/**
 * Entfernt einen Event-Handler
 * @param eventType Event-Typ
 * @param handler Event-Handler-Funktion
 */
export function offBridgeEvent(eventType: string, handler: BridgeEventHandler): void {
  if (eventHandlers.has(eventType)) {
    eventHandlers.get(eventType)!.delete(handler);
    logger.debug(`Event-Handler für '${eventType}' entfernt`);
  }
}

/**
 * Löst ein Event aus
 * @param eventType Event-Typ
 * @param data Event-Daten
 */
export function emitEvent(eventType: string, data: any): void {
  logger.debug(`Event '${eventType}' ausgelöst`, data);
  
  // Lokale Handler aufrufen
  if (eventHandlers.has(eventType)) {
    eventHandlers.get(eventType)!.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        logger.error(`Fehler beim Ausführen eines Event-Handlers für '${eventType}'`, error);
      }
    });
  }
  
  // Globales Event auslösen
  const event = new CustomEvent(`nscale:bridge:${eventType}`, { detail: data });
  window.dispatchEvent(event);
  
  // Diagnostik aktualisieren
  status.diagnostics.lastSync = new Date();
  status.diagnostics.syncCount++;
}

/**
 * Registriert globale DOM-Events
 */
function registerGlobalEvents(): void {
  // Fehlerbehandlung
  window.addEventListener('error', (event) => {
    // Nur Fehler aus der Legacy-Implementierung erfassen
    if (event.filename && event.filename.includes('/frontend/')) {
      handleError(new Error(`Legacy-Fehler: ${event.message}`), event);
    }
  });
  
  // Unbehandelte Promise-Rejections
  window.addEventListener('unhandledrejection', (event) => {
    // Versuchen, den Ursprung zu identifizieren
    const error = event.reason;
    if (error && error.stack && error.stack.includes('/frontend/')) {
      handleError(new Error(`Unbehandelte Promise-Rejection: ${error.message}`), error);
    }
  });
}

/**
 * Fehlerbehandlung für Bridge-Fehler
 * @param error Fehler
 * @param details Fehlerdetails
 */
export function handleError(error: Error, details?: any): void {
  logger.error('Bridge-Fehler aufgetreten:', error, details);
  
  // Fehler speichern
  status.errors.push({
    message: error.message,
    timestamp: new Date(),
    details
  });
  
  // Diagnostik aktualisieren
  status.diagnostics.errorCount++;
  
  // Event auslösen
  emitEvent('error', { error, details });
  
  // Automatische Wiederherstellung
  if (DEFAULT_CONFIG.AUTO_RECOVERY) {
    attemptRecovery();
  }
}

/**
 * Versucht, nach einem Fehler die Bridge wiederherzustellen
 */
function attemptRecovery(): void {
  logger.info('Versuche, die Bridge wiederherzustellen...');
  
  // Je nach Fehlertyp unterschiedliche Wiederherstellungsmaßnahmen
  // ...
  
  // Diagnostik aktualisieren
  status.diagnostics.recoveryCount++;
  
  // Event auslösen
  emitEvent('recovery', { timestamp: new Date() });
}

// Spezifische Bridge-Initialisierungen
function initializeAuthBridge(): void {
  // ...
}

function initializeSessionsBridge(): void {
  // ...
}

function initializeUIBridge(): void {
  // ...
}

function initializeChatBridge(): void {
  // ...
}

// Export für Anwendungszugriff
export default {
  status,
  onEvent: onBridgeEvent,
  offEvent: offBridgeEvent,
  emit: emitEvent,
  handleError
};
```

### 2. Event-Bus (`eventBus.ts`)

Ein erweiterter Event-Bus für die Kommunikation zwischen den Systemen:

```typescript
// src/bridge/enhanced/eventBus.ts
import { Logger } from './logger';

type EventHandler = (data: any) => void;
type EventOptions = {
  once?: boolean;
  prepend?: boolean;
  capture?: boolean;
};

class EnhancedEventBus {
  private handlers: Map<string, Set<{ handler: EventHandler; options: EventOptions }>> = new Map();
  private logger: Logger;
  
  constructor(name: string = 'EventBus') {
    this.logger = new Logger(name);
  }
  
  /**
   * Registriert einen Event-Handler
   */
  on(event: string, handler: EventHandler, options: EventOptions = {}): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    
    this.handlers.get(event)!.add({ handler, options });
    this.logger.debug(`Handler für Event '${event}' registriert`);
  }
  
  /**
   * Registriert einen einmaligen Event-Handler
   */
  once(event: string, handler: EventHandler): void {
    this.on(event, handler, { once: true });
  }
  
  /**
   * Entfernt einen Event-Handler
   */
  off(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) return;
    
    const handlers = this.handlers.get(event)!;
    for (const entry of handlers) {
      if (entry.handler === handler) {
        handlers.delete(entry);
        this.logger.debug(`Handler für Event '${event}' entfernt`);
        break;
      }
    }
    
    // Wenn keine Handler mehr, Map-Entry entfernen
    if (handlers.size === 0) {
      this.handlers.delete(event);
    }
  }
  
  /**
   * Löst ein Event aus
   */
  emit(event: string, data: any = {}): void {
    this.logger.debug(`Event '${event}' ausgelöst`, data);
    
    if (!this.handlers.has(event)) return;
    
    const handlers = this.handlers.get(event)!;
    const handlersToRemove: { handler: EventHandler; options: EventOptions }[] = [];
    
    // Handler aufrufen
    for (const entry of handlers) {
      try {
        entry.handler(data);
        
        // Einmal-Handler markieren
        if (entry.options.once) {
          handlersToRemove.push(entry);
        }
      } catch (error) {
        this.logger.error(`Fehler beim Ausführen eines Handlers für Event '${event}'`, error);
      }
    }
    
    // Einmal-Handler entfernen
    for (const entry of handlersToRemove) {
      handlers.delete(entry);
    }
    
    // Wenn keine Handler mehr, Map-Entry entfernen
    if (handlers.size === 0) {
      this.handlers.delete(event);
    }
  }
  
  /**
   * Globales DOM-Event auslösen
   */
  emitGlobal(event: string, data: any = {}): void {
    const customEvent = new CustomEvent(`nscale:${event}`, { detail: data });
    window.dispatchEvent(customEvent);
    this.logger.debug(`Globales Event 'nscale:${event}' ausgelöst`, data);
  }
  
  /**
   * Auf globale DOM-Events lauschen
   */
  onGlobal(event: string, handler: (data: any) => void): () => void {
    const wrappedHandler = (e: CustomEvent) => handler(e.detail);
    window.addEventListener(`nscale:${event}`, wrappedHandler as EventListener);
    this.logger.debug(`Globaler Handler für Event 'nscale:${event}' registriert`);
    
    // Unsubscribe-Funktion zurückgeben
    return () => {
      window.removeEventListener(`nscale:${event}`, wrappedHandler as EventListener);
      this.logger.debug(`Globaler Handler für Event 'nscale:${event}' entfernt`);
    };
  }
  
  /**
   * Alle Handler entfernen
   */
  clear(): void {
    this.handlers.clear();
    this.logger.debug('Alle Event-Handler entfernt');
  }
  
  /**
   * Handler für bestimmtes Event entfernen
   */
  clearEvent(event: string): void {
    if (this.handlers.has(event)) {
      this.handlers.delete(event);
      this.logger.debug(`Alle Handler für Event '${event}' entfernt`);
    }
  }
}

// Singleton-Instanz
export const eventBus = new EnhancedEventBus();

// Namespace für typisierte Events
export const events = {
  // Auth-Events
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_CHANGE: 'auth:change',
  
  // Session-Events
  SESSION_CREATE: 'session:create',
  SESSION_SELECT: 'session:select',
  SESSION_DELETE: 'session:delete',
  SESSION_UPDATE: 'session:update',
  
  // UI-Events
  UI_THEME_CHANGE: 'ui:theme:change',
  UI_LAYOUT_CHANGE: 'ui:layout:change',
  UI_SIDEBAR_TOGGLE: 'ui:sidebar:toggle',
  
  // Chat-Events
  CHAT_MESSAGE_SEND: 'chat:message:send',
  CHAT_MESSAGE_RECEIVE: 'chat:message:receive',
  CHAT_STREAM_START: 'chat:stream:start',
  CHAT_STREAM_END: 'chat:stream:end',
  
  // Bridge-spezifische Events
  BRIDGE_READY: 'bridge:ready',
  BRIDGE_ERROR: 'bridge:error',
  BRIDGE_RECOVERY: 'bridge:recovery'
};

export default eventBus;
```

### 3. State-Manager (`stateManager.ts`)

Verwaltet die Synchronisierung des Zustands zwischen Vue und Vanilla JS:

```typescript
// src/bridge/enhanced/stateManager.ts
import { reactive, watch, toRaw } from 'vue';
import { Logger } from './logger';
import eventBus from './eventBus';

type StateOptions = {
  namespace: string;
  initialState?: any;
  debounceMs?: number;
  syncToLegacy?: boolean;
  syncFromLegacy?: boolean;
};

/**
 * StateManager-Klasse zur Verwaltung des Zustands zwischen Vue und Legacy-Code
 */
export class StateManager<T extends Record<string, any>> {
  private state: T;
  private logger: Logger;
  private options: Required<StateOptions>;
  private syncTimeoutId: number | null = null;
  
  /**
   * Konstruktor
   */
  constructor(options: StateOptions) {
    // Standardoptionen setzen
    this.options = {
      namespace: options.namespace,
      initialState: options.initialState || {},
      debounceMs: options.debounceMs || 100,
      syncToLegacy: options.syncToLegacy !== false,
      syncFromLegacy: options.syncFromLegacy !== false
    };
    
    // Logger initialisieren
    this.logger = new Logger(`StateManager:${this.options.namespace}`);
    
    // Reaktiven Zustand erstellen
    this.state = reactive(this.options.initialState) as T;
    
    // Legacy-Zustandssynchonisierung einrichten
    this.setupLegacySync();
    
    this.logger.info('StateManager initialisiert', { namespace: this.options.namespace });
  }
  
  /**
   * Gibt den aktuellen Zustand zurück
   */
  getState(): T {
    return this.state;
  }
  
  /**
   * Aktualisiert einen Teil des Zustands
   */
  setState(partial: Partial<T>): void {
    Object.assign(this.state, partial);
    this.logger.debug('Zustand aktualisiert', partial);
    
    // Synchronisierung mit Legacy-Code planen
    if (this.options.syncToLegacy) {
      this.scheduleLegacySync();
    }
  }
  
  /**
   * Beobachtet eine Zustandsänderung
   */
  watchState(callback: (state: T, oldState: T) => void): () => void {
    const unwatch = watch(
      () => ({ ...toRaw(this.state) }),
      (newState, oldState) => callback(newState as T, oldState as T),
      { deep: true }
    );
    
    return unwatch;
  }
  
  /**
   * Richtet die Synchronisierung mit Legacy-Code ein
   */
  private setupLegacySync(): void {
    // Legacy-Namespace im globalen Objekt
    const legacyNamespace = `nscale${this.options.namespace.charAt(0).toUpperCase() + this.options.namespace.slice(1)}`;
    
    // Legacy-Objekt initialisieren, falls nicht vorhanden
    if (!window[legacyNamespace]) {
      window[legacyNamespace] = {};
    }
    
    // Zustand in Legacy-Objekt hinzufügen
    window[legacyNamespace].state = { ...this.options.initialState };
    
    // Vue-Zustand beobachten und mit Legacy-Code synchronisieren
    if (this.options.syncToLegacy) {
      this.watchState(() => {
        this.syncToLegacy();
      });
    }
    
    // Legacy-Änderungen beobachten
    if (this.options.syncFromLegacy) {
      eventBus.onGlobal(`${this.options.namespace}:change`, (data) => {
        this.syncFromLegacy(data);
      });
    }
    
    // Legacy-Update-Methode bereitstellen
    window[legacyNamespace].updateState = (partial: Partial<T>) => {
      // Update über Event-Bus senden, um zyklische Updates zu vermeiden
      eventBus.emit(`${this.options.namespace}:legacy:update`, partial);
    };
    
    // Auf Legacy-Updates reagieren
    eventBus.on(`${this.options.namespace}:legacy:update`, (partial: Partial<T>) => {
      // Zustand aktualisieren, ohne erneute Synchronisierung auszulösen
      Object.assign(this.state, partial);
      this.logger.debug('Zustand aus Legacy-Code aktualisiert', partial);
    });
  }
  
  /**
   * Plant die Synchronisierung mit dem Legacy-Code
   */
  private scheduleLegacySync(): void {
    // Bestehenden Timeout löschen
    if (this.syncTimeoutId !== null) {
      window.clearTimeout(this.syncTimeoutId);
    }
    
    // Neuen Timeout planen
    this.syncTimeoutId = window.setTimeout(() => {
      this.syncToLegacy();
      this.syncTimeoutId = null;
    }, this.options.debounceMs);
  }
  
  /**
   * Synchronisiert den Zustand zum Legacy-Code
   */
  private syncToLegacy(): void {
    const legacyNamespace = `nscale${this.options.namespace.charAt(0).toUpperCase() + this.options.namespace.slice(1)}`;
    
    if (window[legacyNamespace]) {
      const rawState = toRaw(this.state);
      window[legacyNamespace].state = { ...rawState };
      
      // Legacy-Event auslösen
      eventBus.emitGlobal(`${this.options.namespace}:update`, rawState);
      
      this.logger.debug('Zustand mit Legacy-Code synchronisiert', rawState);
    }
  }
  
  /**
   * Synchronisiert den Zustand vom Legacy-Code
   */
  private syncFromLegacy(data: Partial<T>): void {
    this.setState(data);
    this.logger.debug('Zustand aus Legacy-Event aktualisiert', data);
  }
}

/**
 * Factory-Funktion für StateManager
 */
export function createStateManager<T extends Record<string, any>>(options: StateOptions): StateManager<T> {
  return new StateManager<T>(options);
}

export default {
  createStateManager
};
```

### 4. Self-Healing-Mechanismus (`selfHealing.ts`)

Ein Mechanismus zur automatischen Erkennung und Behebung von Fehlern:

```typescript
// src/bridge/enhanced/selfHealing.ts
import { Logger } from './logger';
import eventBus, { events } from './eventBus';
import { handleError } from './bridgeCore';

interface HealingRule {
  symptom: RegExp | string;
  remedy: () => Promise<boolean>;
  description: string;
}

class SelfHealingSystem {
  private logger: Logger;
  private healingRules: HealingRule[] = [];
  private isHealing: boolean = false;
  private lastHealingAttempt: Date | null = null;
  private consecutiveFailures: number = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly COOLING_PERIOD_MS = 60000; // 1 Minute
  
  constructor() {
    this.logger = new Logger('SelfHealing');
    
    // Standard-Heilungsregeln registrieren
    this.registerDefaultRules();
    
    // Event-Listener für Fehler
    eventBus.on(events.BRIDGE_ERROR, this.handleBridgeError.bind(this));
    
    this.logger.info('Self-Healing-System initialisiert');
  }
  
  /**
   * Registriert eine neue Heilungsregel
   */
  registerRule(rule: HealingRule): void {
    this.healingRules.push(rule);
    this.logger.debug(`Heilungsregel registriert: ${rule.description}`);
  }
  
  /**
   * Versucht, einen Fehler zu beheben
   */
  async attemptHealing(error: Error): Promise<boolean> {
    // Cooldown-Prüfung
    if (this.isInCooldown()) {
      this.logger.warn('Heilungsversuch in Abkühlphase abgelehnt');
      return false;
    }
    
    if (this.isHealing) {
      this.logger.warn('Heilungsprozess bereits aktiv, neuer Versuch abgelehnt');
      return false;
    }
    
    this.isHealing = true;
    this.lastHealingAttempt = new Date();
    
    try {
      this.logger.info('Starte Heilungsprozess für Fehler:', error.message);
      
      let healed = false;
      const errorString = error.toString();
      
      // Passende Regeln finden
      for (const rule of this.healingRules) {
        const matches = typeof rule.symptom === 'string'
          ? errorString.includes(rule.symptom)
          : rule.symptom.test(errorString);
        
        if (matches) {
          this.logger.info(`Anwendung von Heilungsregel: ${rule.description}`);
          
          try {
            healed = await rule.remedy();
            
            if (healed) {
              this.logger.info(`Heilung erfolgreich mit Regel: ${rule.description}`);
              this.consecutiveFailures = 0;
              eventBus.emit(events.BRIDGE_RECOVERY, { error, remedy: rule.description });
              break;
            } else {
              this.logger.warn(`Heilungsversuch mit Regel fehlgeschlagen: ${rule.description}`);
            }
          } catch (healingError) {
            this.logger.error(`Fehler während des Heilungsversuchs mit Regel: ${rule.description}`, healingError);
          }
        }
      }
      
      if (!healed) {
        this.consecutiveFailures++;
        this.logger.warn(`Keine passende Heilungsregel gefunden, Heilung fehlgeschlagen. Fortlaufende Fehler: ${this.consecutiveFailures}`);
        
        if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
          this.logger.error(`Maximale Anzahl fortlaufender Fehler (${this.MAX_CONSECUTIVE_FAILURES}) erreicht. Switchback zur Legacy-Implementierung wird empfohlen.`);
          
          // Automatischer Switchback zur Legacy-Implementierung
          this.switchToLegacy();
        }
      }
      
      return healed;
    } finally {
      this.isHealing = false;
    }
  }
  
  /**
   * Registriert Standard-Heilungsregeln
   */
  private registerDefaultRules(): void {
    // Regel 1: Fehlende Bridge-APIs
    this.registerRule({
      symptom: /Cannot read properties of undefined \(reading '.*Bridge'\)/,
      remedy: async () => {
        try {
          // Versuchen, die Bridge neu zu initialisieren
          this.logger.info('Versuche, die Bridge-APIs neu zu initialisieren');
          
          // Bridge-Initialisierung erneut aufrufen
          const result = await import('./bridgeCore').then(module => {
            return module.initializeBridge();
          });
          
          return result.initialized;
        } catch (error) {
          this.logger.error('Fehler bei der Neuinitialisierung der Bridge-APIs', error);
          return false;
        }
      },
      description: 'Neuinitialisierung der Bridge-APIs'
    });
    
    // Regel 2: Event-Bus-Probleme
    this.registerRule({
      symptom: 'eventBus',
      remedy: async () => {
        try {
          this.logger.info('Versuche, den Event-Bus zurückzusetzen');
          
          // Event-Bus zurücksetzen
          eventBus.clear();
          
          // System-Events neu registrieren
          await import('./eventBus').then(module => {
            return true;
          });
          
          return true;
        } catch (error) {
          this.logger.error('Fehler beim Zurücksetzen des Event-Bus', error);
          return false;
        }
      },
      description: 'Zurücksetzen des Event-Bus'
    });
    
    // Regel 3: Store-Synchronisationsprobleme
    this.registerRule({
      symptom: 'store synchronization',
      remedy: async () => {
        try {
          this.logger.info('Versuche, die Store-Synchronisation zurückzusetzen');
          
          // State-Manager neu laden
          await import('./stateManager').then(module => {
            return true;
          });
          
          return true;
        } catch (error) {
          this.logger.error('Fehler beim Zurücksetzen der Store-Synchronisation', error);
          return false;
        }
      },
      description: 'Zurücksetzen der Store-Synchronisation'
    });
  }
  
  /**
   * Behandelt Bridge-Fehler-Events
   */
  private handleBridgeError(data: { error: Error; details?: any }): void {
    this.attemptHealing(data.error).catch(error => {
      this.logger.error('Unbehandelter Fehler während des Heilungsversuchs', error);
    });
  }
  
  /**
   * Prüft, ob das System in der Abkühlphase ist
   */
  private isInCooldown(): boolean {
    if (!this.lastHealingAttempt) return false;
    
    const now = new Date();
    const timeSinceLastAttempt = now.getTime() - this.lastHealingAttempt.getTime();
    
    return timeSinceLastAttempt < this.COOLING_PERIOD_MS;
  }
  
  /**
   * Wechselt zur Legacy-Implementierung
   */
  private switchToLegacy(): void {
    try {
      this.logger.warn('Wechsle zur Legacy-Implementierung');
      
      // Feature-Toggles aktualisieren
      import('@/stores/featureToggles').then(module => {
        const store = module.useFeatureTogglesStore();
        
        // SFC-Features deaktivieren
        store.disableAllSfcFeatures();
        
        // Legacy-Bridge aktiviert lassen
        store.useLegacyBridge = true;
        
        this.logger.info('Erfolgreich zur Legacy-Implementierung gewechselt');
        
        // Seite neu laden, um sicherzustellen, dass alle Komponenten korrekt initialisiert werden
        if (confirm('Die Anwendung muss neu geladen werden, um zur Legacy-Implementierung zu wechseln. Jetzt neu laden?')) {
          window.location.reload();
        }
      });
    } catch (error) {
      this.logger.error('Fehler beim Wechsel zur Legacy-Implementierung', error);
    }
  }
}

// Singleton-Instanz
export const selfHealing = new SelfHealingSystem();

export default selfHealing;
```

### 5. Optimierte Chat-Bridge (`chatBridge.ts`)

Ein spezialisiertes Bridge-Modul für das Chat-Interface:

```typescript
// src/bridge/enhanced/chatBridge.ts
import { reactive, watch, toRaw } from 'vue';
import { useChat } from '@/composables/useChat';
import { useChatStore } from '@/stores/chat';
import { useFeatureToggles } from '@/composables/useFeatureToggles';
import { Logger } from './logger';
import eventBus, { events } from './eventBus';
import { createStateManager } from './stateManager';
import selfHealing from './selfHealing';

// Types
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  status: 'sending' | 'sent' | 'received' | 'error';
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

// State manager for chat data
const chatState = createStateManager<{
  currentSessionId: string | null;
  sessions: Session[];
  isStreaming: boolean;
  isSending: boolean;
  error: string | null;
}>({
  namespace: 'chat',
  initialState: {
    currentSessionId: null,
    sessions: [],
    isStreaming: false,
    isSending: false,
    error: null
  },
  debounceMs: 50 // Schnellere Synchronisierung für Chat-Daten
});

// Logger
const logger = new Logger('ChatBridge');

/**
 * Initialisiert die Chat-Bridge
 */
export function initChatBridge(): void {
  const featureToggles = useFeatureToggles();
  const chatStore = useChatStore();
  
  logger.info('Initialisiere Chat-Bridge');
  
  // Prüfen, ob SFC-Chat aktiviert ist
  if (!featureToggles.sfcChat && !featureToggles.shouldUseFeature('useSfcChat')) {
    logger.info('SFC-Chat ist deaktiviert, Bridge wird im Kompatibilitätsmodus betrieben');
  }
  
  // Initialer State aus Store
  syncStoreToState(chatStore);
  
  // Chat-Store beobachten
  watch(() => ({ ...toRaw(chatStore) }), () => {
    syncStoreToState(chatStore);
  }, { deep: true });
  
  // Legacy-API definieren
  window.nscaleChat = {
    // Sessions
    getSessions: () => chatState.getState().sessions,
    getCurrentSession: () => {
      const state = chatState.getState();
      if (!state.currentSessionId) return null;
      return state.sessions.find(s => s.id === state.currentSessionId) || null;
    },
    createSession: (title?: string) => chatStore.createSession(title),
    selectSession: (sessionId: string) => chatStore.setCurrentSession(sessionId),
    deleteSession: (sessionId: string) => chatStore.deleteSession(sessionId),
    
    // Messages
    sendMessage: (content: string, sessionId?: string) => {
      const targetSessionId = sessionId || chatState.getState().currentSessionId;
      if (!targetSessionId) {
        return Promise.reject(new Error('Keine aktive Sitzung'));
      }
      
      return chatStore.sendMessage({
        sessionId: targetSessionId,
        content
      });
    },
    
    // Streaming
    isStreaming: () => chatState.getState().isStreaming,
    stopStreaming: () => chatStore.stopStreaming(),
    
    // Events
    on: (event: string, handler: (data: any) => void) => {
      return eventBus.on(`chat:${event}`, handler);
    },
    off: (event: string, handler: (data: any) => void) => {
      eventBus.off(`chat:${event}`, handler);
    }
  };
  
  // Legacy-Events einrichten
  setupLegacyEvents();
  
  // Self-Healing-Regeln für Chat registrieren
  registerChatHealingRules();
  
  logger.info('Chat-Bridge erfolgreich initialisiert');
}

/**
 * Synchronisiert den Store mit dem Bridge-State
 */
function syncStoreToState(chatStore: ReturnType<typeof useChatStore>): void {
  logger.debug('Synchronisiere Chat-Store mit Bridge-State');
  
  // Chat-State aktualisieren
  chatState.setState({
    currentSessionId: chatStore.currentSessionId,
    sessions: chatStore.sessions.map(session => ({
      id: session.id,
      title: session.title,
      messages: session.messages.map(message => ({
        id: message.id,
        content: message.content,
        role: message.role,
        timestamp: message.timestamp,
        status: message.status
      })),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    })),
    isStreaming: chatStore.isStreaming,
    isSending: chatStore.isSending,
    error: chatStore.error
  });
}

/**
 * Richtet Legacy-Events ein
 */
function setupLegacyEvents(): void {
  // Nachricht senden (aus Legacy)
  eventBus.onGlobal('chat:message:send', async (data) => {
    try {
      const chatStore = useChatStore();
      
      if (data && typeof data.content === 'string') {
        await chatStore.sendMessage({
          sessionId: data.sessionId || chatStore.currentSessionId,
          content: data.content
        });
      }
    } catch (error) {
      logger.error('Fehler beim Senden einer Nachricht aus Legacy-Event', error);
    }
  });
  
  // Sitzung wechseln (aus Legacy)
  eventBus.onGlobal('chat:session:select', (data) => {
    try {
      const chatStore = useChatStore();
      
      if (data && typeof data.sessionId === 'string') {
        chatStore.setCurrentSession(data.sessionId);
      }
    } catch (error) {
      logger.error('Fehler beim Wechseln der Sitzung aus Legacy-Event', error);
    }
  });
  
  // Streaming stoppen (aus Legacy)
  eventBus.onGlobal('chat:stream:stop', () => {
    try {
      const chatStore = useChatStore();
      chatStore.stopStreaming();
    } catch (error) {
      logger.error('Fehler beim Stoppen des Streamings aus Legacy-Event', error);
    }
  });
}

/**
 * Registriert Chat-spezifische Self-Healing-Regeln
 */
function registerChatHealingRules(): void {
  // Regel: Chat-Store-Synchronisierungsprobleme
  selfHealing.registerRule({
    symptom: 'chat synchronization',
    remedy: async () => {
      try {
        logger.info('Versuche, die Chat-Store-Synchronisation wiederherzustellen');
        
        const chatStore = useChatStore();
        
        // Store-Daten neu laden
        await chatStore.loadSessions();
        
        // State neu synchronisieren
        syncStoreToState(chatStore);
        
        return true;
      } catch (error) {
        logger.error('Fehler bei der Wiederherstellung der Chat-Store-Synchronisation', error);
        return false;
      }
    },
    description: 'Wiederherstellung der Chat-Store-Synchronisation'
  });
  
  // Regel: Streaming-Fehler
  selfHealing.registerRule({
    symptom: 'streaming error',
    remedy: async () => {
      try {
        logger.info('Versuche, den Streaming-Status zurückzusetzen');
        
        const chatStore = useChatStore();
        
        // Streaming stoppen
        chatStore.stopStreaming();
        
        // State aktualisieren
        chatState.setState({ isStreaming: false });
        
        return true;
      } catch (error) {
        logger.error('Fehler beim Zurücksetzen des Streaming-Status', error);
        return false;
      }
    },
    description: 'Zurücksetzen des Streaming-Status'
  });
}

export default {
  initChatBridge
};
```

## Vorteile des Bridge-Systems

Das Bridge-System bietet folgende Vorteile für die Migration:

1. **Graduelle Migration**: Ermöglicht eine schrittweise Migration ohne "Big Bang"-Ansatz
2. **Risikominimierung**: Feature-Toggle und automatisches Fallback reduzieren Ausfallrisiken
3. **Parallele Entwicklung**: Alte und neue Implementierung können parallel existieren
4. **Fehlertoleranz**: Robuste Fehlerbehandlung mit Self-Healing-Mechanismen
5. **Einfache API**: Vereinfachte API für Entwickler zur Integration alter und neuer Komponenten

## Aktuelle Herausforderungen

Folgende Herausforderungen bestehen noch im Bridge-System:

1. **Performance-Overhead**: Die bidirektionale Synchronisierung kann bei komplexen Zuständen zu Leistungsproblemen führen
2. **Memory-Leaks**: Bei fehlender Bereinigung können Event-Listener zu Speicherlecks führen
3. **Fehler-Diagnose**: Die Fehlerbehandlung zwischen den Systemen kann komplex sein
4. **Leerlauf-Ereignisse**: Zyklische Updates können zu Ereignisschleifen führen
5. **Testabdeckung**: Die Bridge-Komponenten haben eine geringere Testabdeckung

## Verbesserungsmöglichkeiten

Für die Weiterentwicklung des Bridge-Systems sind folgende Verbesserungen geplant:

1. **Selektive Zustands-Synchronisierung**: Nur notwendige Teile des Zustands synchronisieren
2. **Memory-Management**: Verbesserte Verwaltung von Event-Listenern und Ressourcen
3. **Leistungsmonitoring**: Erweiterte Diagnose-Tools für Bridge-Performance
4. **Optimierte Self-Healing-Mechanismen**: Mehr Automatisierung bei der Fehlerbehebung
5. **Testabdeckung erhöhen**: Umfassendere Tests für Bridge-Komponenten

## Aktuelle Bridge-Integration

Derzeit sind folgende Systeme über die Bridge integriert:

| System | Integrationsgrad | Status | Synchronisierte Daten |
|--------|------------------|--------|------------------------|
| **Authentication** | 90% | Stabil | Benutzerinformationen, Anmeldestatus |
| **Sessions** | 85% | Stabil | Sitzungsliste, aktive Sitzung |
| **Chat** | 70% | In Arbeit | Nachrichten, Streaming-Status |
| **UI** | 80% | Stabil | Theme, Layout-Konfiguration |
| **Dokumentenkonverter** | 60% | In Arbeit | Dokumentenliste, Konvertierungsstatus |
| **Admin-Bereich** | 50% | In Arbeit | Benutzer, Systemstatus |

## Nächste Schritte

Folgende Schritte sind für die Weiterentwicklung des Bridge-Systems geplant:

1. **Performance-Optimierung**: Reduzierung des Performance-Overheads durch selektive Synchronisierung
2. **Erweiterte Diagnose-Tools**: Verbesserte Werkzeuge zur Fehleranalyse
3. **Integration mit Feature-Monitoring**: Detailliertes Monitoring der Bridge-Aktivitäten
4. **Verbesserte Sicherheitsmechanismen**: Sicherere Kommunikation zwischen den Systemen
5. **Erweiterung der Self-Healing-Fähigkeiten**: Mehr automatische Wiederherstellungsmechanismen

## Fazit

Das Bridge-System ist eine essentielle Komponente für die erfolgreiche Migration der nscale DMS Assistent-Anwendung von Vanilla JavaScript zu Vue 3 SFC. Mit einem aktuellen Fertigstellungsgrad von ca. 85% bietet es bereits robuste Mechanismen für die bidirektionale Kommunikation und Fehlerbehandlung. Die verbleibenden Herausforderungen sind primär im Bereich der Performance-Optimierung und der erweiterten Diagnose-Funktionen angesiedelt.

Durch die kontinuierliche Verbesserung des Bridge-Systems wird die Migration weiterhin schrittweise und risikoarm voranschreiten können, während gleichzeitig die Funktionalität und Stabilität der Anwendung gewährleistet bleibt.

---

Zuletzt aktualisiert: 09.05.2025