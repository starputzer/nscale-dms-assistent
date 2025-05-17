/**
 * @deprecated Diese Legacy-Komponente ist veraltet und wird in Kürze entfernt.
 * Verwende stattdessen die Vue 3 SFC-Implementierung.
 * Geplantes Entfernungsdatum: 2025-06-10
 */

/**
 * A/B Testing Framework
 *
 * Dieses Modul implementiert ein A/B-Testing-Framework, das auf dem 
 * bestehenden Feature-Flag-System aufbaut. Es ermöglicht die Durchführung
 * von kontrollierten Experimenten für wichtige Funktionsbereiche.
 */


// Monitoring für Legacy-Code-Nutzung
function trackLegacyUsage(componentName, action) {
  if (typeof window.telemetry !== 'undefined') {
    window.telemetry.trackEvent('legacy_code_usage', {
      component: componentName,
      action: action,
      timestamp: new Date().toISOString()
    });
  }
}

// Tracking bei Modulinitialisierung
trackLegacyUsage('ab-testing', 'initialize');


import { setFeature, getFeatureFlagsStatus } from './feature-flags.js';
import { v4 as uuidv4 } from './utils/uuid-util.js';

// A/B Test Definitionen
const TEST_DEFINITIONS = {
  // Chat-Interface Tests
  'chat-interface-v2': {
    id: 'chat-interface-v2',
    description: 'Verbesserte Chat-Oberfläche mit optimierter Nachrichtenanzeige',
    variants: ['control', 'variant'],
    featureFlags: {
      control: { useSfcChat: false, useEnhancedChat: false },
      variant: { useSfcChat: true, useEnhancedChat: true }
    },
    eligibilityCheck: () => true, // Alle Benutzer sind berechtigt
    metrics: ['messageResponseTime', 'userSatisfaction', 'sessionDuration']
  },
  
  // Dokumentenkonverter Tests
  'doc-converter-batch-v2': {
    id: 'doc-converter-batch-v2',
    description: 'Optimierter Dokumentenkonverter mit Batch-Verarbeitung',
    variants: ['control', 'variant'],
    featureFlags: {
      control: { useSfcDocConverter: false, useVueDocConverter: false },
      variant: { useSfcDocConverter: true, useVueDocConverter: true }
    },
    eligibilityCheck: () => true, // Alle Benutzer sind berechtigt
    metrics: ['conversionSpeed', 'conversionSuccess', 'userSatisfaction']
  },
  
  // Admin-Bereich Tests
  'admin-panel-v2': {
    id: 'admin-panel-v2',
    description: 'Neu gestalteter Admin-Bereich mit verbesserten Analysen',
    variants: ['control', 'variant'],
    featureFlags: {
      control: { useSfcAdmin: false },
      variant: { useSfcAdmin: true }
    },
    eligibilityCheck: () => {
      // Nur für Administratoren verfügbar
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.role === 'admin' || user.role === 'super_admin';
    },
    metrics: ['taskCompletionTime', 'navigationEfficiency', 'userSatisfaction']
  }
};

// Sitzungs-ID für A/B-Test-Tracking
let abTestSessionId = localStorage.getItem('abTestSessionId');
if (!abTestSessionId) {
  abTestSessionId = uuidv4();
  localStorage.setItem('abTestSessionId', abTestSessionId);
}

/**
 * Ordnet einen Benutzer einer Testvariante zu
 * @param {string} testId - Die ID des A/B-Tests
 * @returns {string|null} - Die zugewiesene Variante oder null, wenn der Test nicht zugewiesen wurde
 */
export function assignUserToTest(testId) {
  const userId = localStorage.getItem('userId') || abTestSessionId;
  const testDefinition = TEST_DEFINITIONS[testId];
  
  if (!testDefinition) {
    console.error(`A/B-Test mit ID "${testId}" nicht gefunden.`);
    return null;
  }
  
  // Prüfen, ob der Benutzer für diesen Test geeignet ist
  if (!testDefinition.eligibilityCheck()) {
    console.log(`Benutzer ist nicht für Test "${testId}" geeignet.`);
    return null;
  }
  
  // Prüfen, ob der Benutzer bereits einer Testvariante zugewiesen wurde
  const existingAssignments = JSON.parse(localStorage.getItem('abTestAssignments') || '{}');
  if (existingAssignments[testId]) {
    return existingAssignments[testId];
  }
  
  // Zufällige Variante zuweisen
  const variants = testDefinition.variants;
  const assignedVariant = variants[Math.floor(Math.random() * variants.length)];
  
  // Variante speichern
  existingAssignments[testId] = assignedVariant;
  localStorage.setItem('abTestAssignments', JSON.stringify(existingAssignments));
  
  // Feature-Flags entsprechend der Variante setzen
  const featureFlags = testDefinition.featureFlags[assignedVariant];
  if (featureFlags) {
    Object.entries(featureFlags).forEach(([flag, value]) => {
      setFeature(flag, value);
    });
  }
  
  // Telemetrie-Event senden
  sendTelemetry('ab_test_assignment', {
    testId,
    variant: assignedVariant,
    userId,
    timestamp: new Date().toISOString()
  });
  
  console.log(`Benutzer wurde für Test "${testId}" der Variante "${assignedVariant}" zugewiesen.`);
  return assignedVariant;
}

/**
 * Ermittelt die zugewiesene Testvariante für einen Benutzer
 * @param {string} testId - Die ID des A/B-Tests
 * @returns {string|null} - Die zugewiesene Variante oder null, wenn keine Zuweisung erfolgt ist
 */
export function getUserTestVariant(testId) {
  const assignments = JSON.parse(localStorage.getItem('abTestAssignments') || '{}');
  return assignments[testId] || null;
}

/**
 * Sendet ein Metrik-Ereignis für einen A/B-Test
 * @param {string} testId - Die ID des A/B-Tests
 * @param {string} metricName - Der Name der Metrik
 * @param {any} value - Der Wert der Metrik
 * @param {Object} additionalData - Zusätzliche Daten für die Telemetrie
 */
export function trackTestMetric(testId, metricName, value, additionalData = {}) {
  const variant = getUserTestVariant(testId);
  if (!variant) {
    console.warn(`Keine Testvariante für Test "${testId}" gefunden. Metrik wird nicht getrackt.`);
    return;
  }
  
  const testDefinition = TEST_DEFINITIONS[testId];
  if (!testDefinition) {
    console.error(`A/B-Test mit ID "${testId}" nicht gefunden.`);
    return;
  }
  
  // Prüfen, ob die Metrik für diesen Test relevant ist
  if (!testDefinition.metrics.includes(metricName)) {
    console.warn(`Metrik "${metricName}" ist nicht für Test "${testId}" definiert.`);
    return;
  }
  
  // Telemetrie-Event senden
  sendTelemetry('ab_test_metric', {
    testId,
    variant,
    metricName,
    value,
    userId: localStorage.getItem('userId') || abTestSessionId,
    timestamp: new Date().toISOString(),
    ...additionalData
  });
  
  console.log(`Metrik "${metricName}" mit Wert ${value} für Test "${testId}" erfasst.`);
}

/**
 * Sendet ein Telemetrie-Ereignis
 * @param {string} eventType - Der Typ des Ereignisses
 * @param {Object} data - Die Ereignisdaten
 */
function sendTelemetry(eventType, data) {
  // Verwende das zentrale Telemetrie-System, wenn verfügbar
  if (window.telemetry && typeof window.telemetry.trackEvent === 'function') {
    window.telemetry.trackEvent(eventType, data);
    return;
  }

  // Fallback-Implementierung für direktes Senden
  const enrichedData = {
    ...data,
    eventType,
    appVersion: window.appVersion || 'unknown',
    userAgent: navigator.userAgent,
    platform: navigator.platform
  };

  // In Produktionsumgebung: Senden an den Server
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    fetch('/api/telemetry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(enrichedData),
      // Fehler ignorieren, um die Benutzeroberfläche nicht zu beeinträchtigen
      keepalive: true
    }).catch(err => console.error('Fehler beim Senden der Telemetrie:', err));
  }

  // Lokal immer in die Konsole loggen (für Debugging)
  if (localStorage.getItem('enableTelemetryDebug') === 'true') {
    console.log('Telemetrie:', { eventType, ...enrichedData });
  }
}

/**
 * Listet alle verfügbaren A/B-Tests auf
 * @returns {Array} - Liste aller Test-Definitionen
 */
export function listAvailableTests() {
  return Object.values(TEST_DEFINITIONS).map(test => ({
    id: test.id,
    description: test.description,
    variants: test.variants,
    metrics: test.metrics
  }));
}

/**
 * Beendet die Teilnahme an einem A/B-Test und entfernt alle damit verbundenen Einstellungen
 * @param {string} testId - Die ID des A/B-Tests
 * @returns {boolean} - True, wenn der Test erfolgreich beendet wurde
 */
export function exitTest(testId) {
  const assignments = JSON.parse(localStorage.getItem('abTestAssignments') || '{}');
  if (!assignments[testId]) {
    console.warn(`Benutzer nimmt nicht am Test "${testId}" teil.`);
    return false;
  }
  
  // Variante vor dem Löschen speichern
  const variant = assignments[testId];
  
  // Zuweisung entfernen
  delete assignments[testId];
  localStorage.setItem('abTestAssignments', JSON.stringify(assignments));
  
  // Telemetrie-Event senden
  sendTelemetry('ab_test_exit', {
    testId,
    variant,
    userId: localStorage.getItem('userId') || abTestSessionId,
    timestamp: new Date().toISOString()
  });
  
  console.log(`Teilnahme an Test "${testId}" wurde beendet.`);
  return true;
}

/**
 * Initialisiert alle A/B-Tests, für die der Benutzer berechtigt ist
 * Dies sollte früh im Anwendungslebenszyklus aufgerufen werden
 */
export function initializeABTests() {
  console.log('Initialisiere A/B-Tests...');
  
  // Alle verfügbaren Tests durchlaufen
  Object.keys(TEST_DEFINITIONS).forEach(testId => {
    // Benutzer nur zuweisen, wenn noch keine Zuweisung existiert
    const variant = getUserTestVariant(testId);
    if (!variant) {
      assignUserToTest(testId);
    } else {
      console.log(`Benutzer ist bereits für Test "${testId}" der Variante "${variant}" zugewiesen.`);
      
      // Feature-Flags entsprechend der Variante setzen (falls sie zurückgesetzt wurden)
      const testDefinition = TEST_DEFINITIONS[testId];
      const featureFlags = testDefinition.featureFlags[variant];
      if (featureFlags) {
        Object.entries(featureFlags).forEach(([flag, value]) => {
          setFeature(flag, value);
        });
      }
    }
  });
  
  // Telemetrie-Event für die Initialisierung senden
  sendTelemetry('ab_tests_initialized', {
    userId: localStorage.getItem('userId') || abTestSessionId,
    assignments: JSON.parse(localStorage.getItem('abTestAssignments') || '{}'),
    timestamp: new Date().toISOString()
  });
}

// Globalen Export für nicht-Modul-Context bereitstellen
if (typeof window !== 'undefined') {
  window.abTesting = {
    assignUserToTest,
    getUserTestVariant,
    trackTestMetric,
    listAvailableTests,
    exitTest,
    initializeABTests
  };
}