/**
 * Tests für TypedEventBus
 * 
 * Diese Tests überprüfen die TypeScript-Kompatibilität und Funktionalität
 * des typisierten EventBus mit Event-Guards und Result-Pattern.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TypedEventBus } from '@/bridge/enhanced/TypedEventBus';
import { BridgeEventMap, BridgeInitializedEvent } from '@/bridge/enhanced/bridgeEventTypes';
import { isBridgeInitializedEvent } from '@/bridge/enhanced/bridgeEventGuards';
import { AssertType } from '../utils/typescript-test-utils';

// Mock der window.setTimeout und window.clearTimeout-Funktionen
vi.stubGlobal('setTimeout', vi.fn((fn) => {
  fn();
  return 123;
}));

vi.stubGlobal('clearTimeout', vi.fn());

// Mock für Logger
vi.mock('@/bridge/enhanced/logger/index', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLogs: vi.fn(),
    clearLogs: vi.fn()
  })
}));

describe('TypedEventBus TypeScript-Kompatibilität', () => {
  let eventBus: TypedEventBus;
  
  beforeEach(() => {
    eventBus = new TypedEventBus();
    vi.clearAllMocks();
  });
  
  describe('Listener-Registrierung', () => {
    it('sollte .on mit korrekten Event-Typen funktionieren', async () => {
      // Bridge-Initialized-Event-Handler
      const initHandler = vi.fn((data: BridgeInitializedEvent) => {
        expect(data.bridgeVersion).toBeDefined();
        expect(data.configuration).toBeDefined();
      });
      
      // Registriere den Handler
      const subscription = await eventBus.on('bridge:initialized', initHandler);
      expect(subscription.success).toBe(true);
      
      if (subscription.success) {
        expect(subscription.data.id).toBeDefined();
        expect(typeof subscription.data.unsubscribe).toBe('function');
      }
      
      // Emit ein typisiertes Event
      const event: BridgeInitializedEvent = {
        timestamp: Date.now(),
        bridgeVersion: '1.0.0',
        configuration: {
          debugging: true,
          selfHealing: true,
          selectiveSync: true,
          eventBatching: true,
          performanceMonitoring: true
        },
        environment: {
          isProduction: false,
          browserInfo: {
            name: 'Chrome',
            version: '100.0.0'
          }
        }
      };
      
      const emitResult = await eventBus.emit('bridge:initialized', event);
      expect(emitResult.success).toBe(true);
      
      // Der Handler sollte aufgerufen worden sein
      expect(initHandler).toHaveBeenCalledWith(event);
    });
    
    it('sollte .once mit korrekten Event-Typen funktionieren', async () => {
      // Bridge-Initialized-Event-Handler
      const initHandler = vi.fn((data: BridgeInitializedEvent) => {
        expect(data.bridgeVersion).toBeDefined();
      });
      
      // Registriere den Handler als Once-Handler
      const subscription = await eventBus.once('bridge:initialized', initHandler);
      expect(subscription.success).toBe(true);
      
      // Emit ein typisiertes Event
      const event: BridgeInitializedEvent = {
        timestamp: Date.now(),
        bridgeVersion: '1.0.0',
        configuration: {
          debugging: true,
          selfHealing: true,
          selectiveSync: true,
          eventBatching: true,
          performanceMonitoring: true
        },
        environment: {
          isProduction: false,
          browserInfo: {
            name: 'Chrome',
            version: '100.0.0'
          }
        }
      };
      
      await eventBus.emit('bridge:initialized', event);
      
      // Der Handler sollte aufgerufen worden sein
      expect(initHandler).toHaveBeenCalledTimes(1);
      
      // Ein zweites Emit sollte den Handler nicht noch einmal aufrufen
      await eventBus.emit('bridge:initialized', event);
      expect(initHandler).toHaveBeenCalledTimes(1);
    });
    
    it('sollte .priority mit korrekten Event-Typen funktionieren', async () => {
      // Handlers mit verschiedenen Prioritäten
      const highPriorityHandler = vi.fn();
      const mediumPriorityHandler = vi.fn();
      const lowPriorityHandler = vi.fn();
      
      // Registriere die Handler mit verschiedenen Prioritäten
      await eventBus.priority('bridge:initialized', 100, highPriorityHandler);
      await eventBus.priority('bridge:initialized', 50, mediumPriorityHandler);
      await eventBus.priority('bridge:initialized', 10, lowPriorityHandler);
      
      // Emit ein typisiertes Event
      const event: BridgeInitializedEvent = {
        timestamp: Date.now(),
        bridgeVersion: '1.0.0',
        configuration: {
          debugging: true,
          selfHealing: true,
          selectiveSync: true,
          eventBatching: true,
          performanceMonitoring: true
        },
        environment: {
          isProduction: false,
          browserInfo: {
            name: 'Chrome',
            version: '100.0.0'
          }
        }
      };
      
      await eventBus.emit('bridge:initialized', event);
      
      // Prüfe, ob die Handler in der richtigen Reihenfolge aufgerufen wurden
      expect(highPriorityHandler.mock.invocationCallOrder[0])
        .toBeLessThan(mediumPriorityHandler.mock.invocationCallOrder[0]);
      
      expect(mediumPriorityHandler.mock.invocationCallOrder[0])
        .toBeLessThan(lowPriorityHandler.mock.invocationCallOrder[0]);
    });
  });
  
  describe('Event-Emission und -Verarbeitung', () => {
    it('sollte ungültige Events ablehnen', async () => {
      // Registriere einen Handler
      const handler = vi.fn();
      await eventBus.on('bridge:initialized', handler);
      
      // Versuche, ein ungültiges Event zu emittieren
      const invalidEvent = { timestamp: 'not a number' };
      const emitResult = await eventBus.emit('bridge:initialized', invalidEvent as any);
      
      // Das Ergebnis sollte ein Fehler sein
      expect(emitResult.success).toBe(false);
      if (!emitResult.success) {
        expect(emitResult.error.code).toBeDefined();
        expect(emitResult.error.message).toContain('Ungültiges Event-Payload');
      }
      
      // Der Handler sollte nicht aufgerufen worden sein
      expect(handler).not.toHaveBeenCalled();
    });
    
    it('sollte den Listener entfernen können', async () => {
      // Registriere einen Handler
      const handler = vi.fn();
      const subscription = await eventBus.on('bridge:initialized', handler);
      expect(subscription.success).toBe(true);
      
      // Event emittieren
      const event: BridgeInitializedEvent = {
        timestamp: Date.now(),
        bridgeVersion: '1.0.0',
        configuration: {
          debugging: true,
          selfHealing: true,
          selectiveSync: true,
          eventBatching: true,
          performanceMonitoring: true
        },
        environment: {
          isProduction: false,
          browserInfo: {
            name: 'Chrome',
            version: '100.0.0'
          }
        }
      };
      
      await eventBus.emit('bridge:initialized', event);
      expect(handler).toHaveBeenCalledTimes(1);
      
      // Entferne den Handler
      if (subscription.success) {
        const unsubscribeResult = await subscription.data.unsubscribe();
        expect(unsubscribeResult.success).toBe(true);
      }
      
      // Event noch einmal emittieren
      await eventBus.emit('bridge:initialized', event);
      
      // Der Handler sollte nicht noch einmal aufgerufen worden sein
      expect(handler).toHaveBeenCalledTimes(1);
    });
    
    it('sollte processTypedEvent korrekt verwenden', async () => {
      // Handler für ein typisiertes Event
      const handler = vi.fn((data: BridgeInitializedEvent) => {
        expect(data.bridgeVersion).toBe('1.0.0');
      });
      
      // Gültiges Event
      const validEvent: BridgeInitializedEvent = {
        timestamp: Date.now(),
        bridgeVersion: '1.0.0',
        configuration: {
          debugging: true,
          selfHealing: true,
          selectiveSync: true,
          eventBatching: true,
          performanceMonitoring: true
        },
        environment: {
          isProduction: false,
          browserInfo: {
            name: 'Chrome',
            version: '100.0.0'
          }
        }
      };
      
      // Verarbeite ein gültiges Event
      const validResult = await eventBus.processTypedEvent('bridge:initialized', validEvent, handler);
      expect(validResult.success).toBe(true);
      if (validResult.success) {
        expect(validResult.data).toBe(true);
      }
      expect(handler).toHaveBeenCalledWith(validEvent);
      
      // Verarbeite ein ungültiges Event
      handler.mockClear();
      const invalidEvent = { timestamp: 'not a number' };
      const invalidResult = await eventBus.processTypedEvent('bridge:initialized', invalidEvent, handler);
      expect(invalidResult.success).toBe(true);
      if (invalidResult.success) {
        expect(invalidResult.data).toBe(false);
      }
      expect(handler).not.toHaveBeenCalled();
    });
  });
  
  describe('Batching-Funktionalität', () => {
    it('sollte Batching konfigurieren können', async () => {
      // Konfiguriere Batching
      const configResult = await eventBus.configureBatching(5, 100);
      expect(configResult.success).toBe(true);
      
      // Aktiviere Batching
      const enableResult = await eventBus.enableBatching(true);
      expect(enableResult.success).toBe(true);
      
      // Deaktiviere Batching
      const disableResult = await eventBus.enableBatching(false);
      expect(disableResult.success).toBe(true);
    });
    
    it('sollte Events in Batches verarbeiten', async () => {
      // Handler für ein typisiertes Event
      const handler = vi.fn((data: BridgeInitializedEvent | BridgeInitializedEvent[]) => {
        // Prüfe, ob es ein einzelnes Event oder ein Batch ist
        if (Array.isArray(data)) {
          expect(data.length).toBeGreaterThan(0);
          data.forEach(event => {
            expect(isBridgeInitializedEvent(event)).toBe(true);
          });
        } else {
          expect(isBridgeInitializedEvent(data)).toBe(true);
        }
      });
      
      // Registriere den Handler
      await eventBus.on('bridge:initialized', handler);
      
      // Konfiguriere Batching (kleine Batch-Größe für Tests)
      await eventBus.configureBatching(2, 10);
      
      // Event-Template
      const createEvent = (): BridgeInitializedEvent => ({
        timestamp: Date.now(),
        bridgeVersion: '1.0.0',
        configuration: {
          debugging: true,
          selfHealing: true,
          selectiveSync: true,
          eventBatching: true,
          performanceMonitoring: true
        },
        environment: {
          isProduction: false,
          browserInfo: {
            name: 'Chrome',
            version: '100.0.0'
          }
        }
      });
      
      // Emittiere mehrere Events
      for (let i = 0; i < 3; i++) {
        await eventBus.emit('bridge:initialized', createEvent());
      }
      
      // Der Handler sollte aufgerufen worden sein (mit einem Batch wegen des Mocks)
      expect(handler).toHaveBeenCalled();
    });
  });
  
  describe('Diagnose-Funktionalität', () => {
    it('sollte Diagnose-Informationen zurückgeben', async () => {
      // Registriere einige Handler
      await eventBus.on('bridge:initialized', vi.fn());
      await eventBus.on('bridge:error', vi.fn());
      
      // Hole Diagnose-Informationen
      const diagnosticsResult = await eventBus.getDiagnostics();
      expect(diagnosticsResult.success).toBe(true);
      
      if (diagnosticsResult.success) {
        const diagnostics = diagnosticsResult.data;
        expect(diagnostics.listenerCount).toBe(2);
        expect(diagnostics.events).toContain('bridge:initialized');
        expect(diagnostics.events).toContain('bridge:error');
        expect(diagnostics.batchQueue.size).toBe(0);
      }
    });
    
    it('sollte alle Listener löschen können', async () => {
      // Registriere einige Handler
      await eventBus.on('bridge:initialized', vi.fn());
      await eventBus.on('bridge:error', vi.fn());
      
      // Hole Diagnose-Informationen vorher
      const beforeDiagnostics = await eventBus.getDiagnostics();
      if (beforeDiagnostics.success) {
        expect(beforeDiagnostics.data.listenerCount).toBe(2);
      }
      
      // Lösche alle Listener
      const clearResult = await eventBus.clear();
      expect(clearResult.success).toBe(true);
      
      // Hole Diagnose-Informationen nachher
      const afterDiagnostics = await eventBus.getDiagnostics();
      if (afterDiagnostics.success) {
        expect(afterDiagnostics.data.listenerCount).toBe(0);
        expect(afterDiagnostics.data.events.length).toBe(0);
      }
    });
  });
});