/**
 * Beispiel für die Verwendung des typisierten EventBus
 * 
 * Dieses Beispiel zeigt, wie der typisierte EventBus verwendet werden kann,
 * um typsichere Events zu emittieren und auf sie zu reagieren.
 */

import { EnhancedTypedEventBus } from '../bridge/enhanced/TypedEventBus';
import { EventBusAdapter } from '../bridge/enhanced/EventBusAdapter';
import { EnhancedBridgeLogger } from '../bridge/enhanced/logger';

// Wir erstellen einen Logger für das Beispiel
const logger = new EnhancedBridgeLogger();

// Beispiel 1: Direkter Zugriff auf den typisierten EventBus
function typedEventBusExample() {
  // Typisierten EventBus erstellen
  const eventBus = new EnhancedTypedEventBus(logger);
  
  // Event-Listener mit korrektem Typ registrieren
  const authSubscription = eventBus.on('auth:login', (data: { success: boolean; user?: any; error?: any }) => {
    // data ist typisiert als { success: boolean; user?: any; error?: any }
    if (data.success) {
      console.log(`Benutzer ${data.user?.name || 'unbekannt'} hat sich angemeldet`);
    } else {
      console.error(`Anmeldefehler: ${data.error?.message || 'Unbekannter Fehler'}`);
    }
  });
  
  // Event mit korrektem Payload emittieren
  eventBus.emit('auth:login', { 
    success: true, 
    user: { id: '123', name: 'Max Mustermann' } 
  });
  
  // Typfehler würde hier auftreten (Kommentar entfernen, um Fehler zu sehen):
  // eventBus.emit('auth:login', { wrongData: true });
  
  // Event-Listener mit Priorität registrieren
  eventBus.priority('session:message', 10, (data: { sessionId: string; message: any }) => {
    // data ist typisiert als { sessionId: string; message: any }
    console.log(`Nachricht in Session ${data.sessionId} empfangen`);
  });
  
  // Event mit korrektem Payload emittieren
  eventBus.emit('session:message', { 
    sessionId: 'session-123', 
    message: { text: 'Hallo Welt' } 
  });
  
  // Mehrere Events gleichzeitig emittieren
  eventBus.emitMultiple([
    ['ui:darkModeChanged', { isDark: true }],
    ['system:info', { message: 'System gestartet', details: { version: '1.0.0' } }]
  ]);
  
  // Event-Listener entfernen
  authSubscription.unsubscribe();
}

// Beispiel 2: Verwendung des EventBusAdapter für Legacy-Code
function eventBusAdapterExample() {
  // EventBusAdapter erstellen
  const adapter = new EventBusAdapter(logger);
  
  // Legacy-Stil: Event-Listener registrieren
  const subscription = adapter.on('auth:login', (data: any) => {
    // data ist nicht typisiert
    console.log('Login-Event empfangen (Legacy):', data);
  });
  
  // Legacy-Stil: Event emittieren
  adapter.emit('auth:login', { success: true, user: { name: 'Legacy User' } });
  
  // Zugriff auf den typisierten EventBus
  const typedEventBus = adapter.getTypedEventBus();
  
  // Typsicherer Zugriff auf den EventBus
  typedEventBus.on('system:error', (data: { message: string; code?: number; details?: any }) => {
    // data ist typisiert als { message: string; code?: number; details?: any }
    console.error(`Systemfehler: ${data.message} (Code: ${data.code || 'unbekannt'})`);
  });
  
  // Event mit korrektem Payload emittieren
  typedEventBus.emit('system:error', { 
    message: 'Kritischer Fehler',
    code: 500,
    details: { stack: 'Error: ...' }
  });
  
  // Legacy-Stil: Event-Listener entfernen
  subscription.unsubscribe();
}

// Beispiel 3: Verwendung des Legacy-Adapters für alte DOM-Event-API-Kompatibilität
function legacyDomStyleExample() {
  // EventBusAdapter erstellen
  const eventBus = new EnhancedTypedEventBus(logger);
  
  // DOM-Stil: Event-Listener registrieren
  const removeListener = eventBus.addEventListener('ui:notification', (event: any) => {
    console.log('Benachrichtigung empfangen (DOM-Stil):', event);
  });
  
  // DOM-Stil: Event dispatchen
  eventBus.dispatchEvent('ui:notification', { 
    title: 'Information',
    message: 'Neue Updates verfügbar',
    type: 'info'
  });
  
  // DOM-Stil: Event-Listener entfernen
  removeListener();
}

// Beispiel 4: Erweiterte Features wie Batch-Processing und Diagnostik
function advancedFeaturesExample() {
  // Typisierten EventBus erstellen
  const eventBus = new EnhancedTypedEventBus(logger);
  
  // Batch-Verarbeitung konfigurieren
  eventBus.configureBatching(5, 100);
  
  // Mehrere Events im Batch emittieren
  for (let i = 0; i < 10; i++) {
    eventBus.emit('performance:metric', { 
      name: `metric-${i}`, 
      value: Math.random() * 100 
    });
  }
  
  // Diagnostik-Informationen abrufen
  const diagnostics = eventBus.getDiagnostics();
  console.log('EventBus Diagnostik:', diagnostics);
  
  // Batching deaktivieren für zeitkritische Events
  eventBus.disableBatching();
  
  // Direkte Event-Zustellung
  eventBus.emit('system:shutdown', { 
    timestamp: Date.now(),
    reason: 'Benutzeranforderung' 
  });
  
  // Batching wieder aktivieren
  eventBus.enableBatching();
}

export function runEventBusExamples() {
  console.log('=== Typisiertes EventBus-Beispiel ===');
  typedEventBusExample();
  
  console.log('\n=== EventBusAdapter-Beispiel ===');
  eventBusAdapterExample();
  
  console.log('\n=== Legacy DOM-Stil-Beispiel ===');
  legacyDomStyleExample();
  
  console.log('\n=== Erweiterte Features-Beispiel ===');
  advancedFeaturesExample();
}

// Beispiele ausführen, wenn diese Datei direkt ausgeführt wird
if (typeof window !== 'undefined' && (window as any).EXECUTE_EXAMPLES) {
  runEventBusExamples();
}