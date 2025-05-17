/**
 * @deprecated Diese Legacy-Komponente ist veraltet und wird in Kürze entfernt.
 * Verwende stattdessen die Vue 3 SFC-Implementierung.
 * Geplantes Entfernungsdatum: 2025-06-10
 */

/**
 * A/B Test Admin Interface
 * 
 * Bietet eine Schnittstelle zur Verwaltung von A/B-Tests für Administratoren.
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
trackLegacyUsage('ab-test-admin', 'initialize');


import { 
  listAvailableTests, 
  getUserTestVariant, 
  exitTest,
  assignUserToTest
} from '../ab-testing.js';

// Admin-Erweiterung für A/B-Tests
export function setupABTestAdmin(options = {}) {
  // Testdaten
  const tests = ref(null);
  const selectedTest = ref(null);
  const isLoading = ref(false);
  const testResults = ref(null);
  const error = ref(null);

  // Verfügbare Tests laden
  const loadTests = async () => {
    try {
      isLoading.value = true;
      error.value = null;
      
      // Tests aus dem A/B-Testing-System abrufen
      const availableTests = listAvailableTests();
      
      // Tests mit aktuellen Varianten anreichern
      tests.value = availableTests.map(test => ({
        ...test,
        currentVariant: getUserTestVariant(test.id) || 'Nicht zugewiesen'
      }));
      
      console.log("A/B-Tests geladen:", tests.value);
    } catch (err) {
      console.error("Fehler beim Laden der A/B-Tests:", err);
      error.value = "Die A/B-Tests konnten nicht geladen werden.";
    } finally {
      isLoading.value = false;
    }
  };

  // Test-Ergebnisse laden (würde in einer realen Anwendung eine API-Anfrage senden)
  const loadTestResults = async (testId) => {
    try {
      isLoading.value = true;
      error.value = null;
      
      // In einer realen Anwendung würden hier Daten vom Server geladen
      console.log(`Lade Ergebnisse für Test: ${testId}`);
      
      // Simulierte Ergebnisse
      await new Promise(resolve => setTimeout(resolve, 500)); // Simuliere Netzwerkverzögerung
      
      testResults.value = {
        testId,
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toLocaleDateString(), // 14 Tage zurück
        participants: {
          control: Math.floor(Math.random() * 500) + 500,
          variant: Math.floor(Math.random() * 500) + 500
        },
        metrics: {
          messageResponseTime: {
            control: Math.floor(Math.random() * 1000) + 2000, // 2-3s
            variant: Math.floor(Math.random() * 800) + 1200,  // 1.2-2s
            improvement: '+35%'
          },
          userSatisfaction: {
            control: (Math.random() * 0.2 + 0.6).toFixed(2),  // 0.6-0.8
            variant: (Math.random() * 0.15 + 0.75).toFixed(2), // 0.75-0.9
            improvement: '+15%'
          },
          sessionDuration: {
            control: Math.floor(Math.random() * 60) + 180,    // 3-4min
            variant: Math.floor(Math.random() * 90) + 240,    // 4-5.5min
            improvement: '+30%'
          }
        }
      };
      
      selectedTest.value = testId;
    } catch (err) {
      console.error(`Fehler beim Laden der Ergebnisse für Test ${testId}:`, err);
      error.value = "Die Testergebnisse konnten nicht geladen werden.";
      testResults.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  // Test-Variante für den aktuellen Benutzer ändern
  const changeTestVariant = async (testId, variant) => {
    try {
      isLoading.value = true;
      
      // Zuerst aus dem aktuellen Test austreten
      await exitTest(testId);
      
      if (variant !== 'none') {
        // Benutzer einer spezifischen Variante zuweisen (nur für Admin-Zwecke)
        localStorage.setItem(`abTestAssignments`, JSON.stringify({
          ...JSON.parse(localStorage.getItem('abTestAssignments') || '{}'),
          [testId]: variant
        }));
        
        // Feature-Flags aktualisieren
        window.location.reload();
      } else {
        // Tests neu laden
        await loadTests();
      }
    } catch (err) {
      console.error(`Fehler beim Ändern der Testvariante für ${testId}:`, err);
      error.value = "Die Testvariante konnte nicht geändert werden.";
    } finally {
      isLoading.value = false;
    }
  };

  // Initialisieren
  onMounted(() => {
    loadTests();
  });

  return {
    tests,
    selectedTest,
    isLoading,
    error,
    testResults,
    loadTests,
    loadTestResults,
    changeTestVariant
  };
}

// Exportiere für globale Verwendung
if (typeof window !== 'undefined') {
  window.abTestAdmin = {
    setup: setupABTestAdmin
  };
}