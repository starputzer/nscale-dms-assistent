/**
 * nscale DMS Assistant - Haupteinstiegspunkt der Anwendung
 * Vollständig optimierte Version für die Vue 3 SFC-Architektur
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { RouteLocationNormalized } from 'vue-router'
import router from './router' // Importieren des zentralen Routers
import { useAuthStore } from './stores/auth'
import App from './App.vue'

// Typdefinitionen für die Direktiven und Plugins
interface DirectiveRegistration {
  name: string;
  definition: any;
}

// Typdefinitionen für die Plugins
interface PluginRegistration {
  name: string;
  plugin: any;
  options?: Record<string, any>;
}

// Globale Direktiven und Plugins importieren
import { globalDirectives } from '@/directives'
import { globalPlugins } from '@/plugins'

// Service-Module importieren
import { initializeApiServices } from '@/services/api/config'
import { useErrorReporting } from '@/utils/errorReportingService'
import { initializeTelemetry } from '@/services/analytics/telemetry'
import '@/utils/authRequestInterceptor' // Import auth interceptor early
import './utils/authRequestAdapter' // Import additional auth adapter

// Bridge und globale Funktionen importieren
import { initializeBridge } from './bridge-init'
import { initializeSourceReferenceAdapter } from './utils/sourceReferenceAdapter'
import { useSourceReferences } from './composables/useSourceReferences'

// Mock-Service-Provider importieren
import { mockServiceProvider } from './plugins/mockServiceProvider'

// Styling importieren
import '@/assets/styles/main.scss'
// Utility-Klassen mit sicheren CSS-Klassennamen importieren
import '@/assets/styles/utility-classes.css'

// Hilfs-Funktionen
import { setupNetworkMonitoring } from '@/utils/networkMonitor'
import { initializeFeatureFlags } from '@/config/featureFlags'

// Anmerkung: Der Router wird jetzt direkt aus './router' importiert
// statt hier konfiguriert zu werden. Die Konfiguration in './router/index.ts' enthält:
// - Guards für Authentifizierung
// - Feature-Flag-Prüfungen
// - Alle nötigen Routen
// - Preloading- und Lazy-Loading-Strategien

// App-Instanz erstellen
const app = createApp(App)

// Pinia Store initialisieren und sofort einbinden
// Das muss VOR Bridge-Initialisierung passieren
const pinia = createPinia()
app.use(pinia)

// Error reporting service initialisieren
const errorReportingService = useErrorReporting()

// Funktion zum Einrichten der Fehlerberichterstattung
function setupErrorReporting() {
  return errorReportingService
}

// Konfiguration und Abhängigkeiten initialisieren
initializeApiServices()
setupErrorReporting()
initializeTelemetry()
initializeFeatureFlags()
setupNetworkMonitoring()

// Überprüfen, ob wir den Bridge-Modus aktiv haben oder nicht
const useLegacyBridge = new URLSearchParams(window.location.search).get('useBridge') === 'true';
const useMockApi = new URLSearchParams(window.location.search).get('mockApi') === 'true';

// Erste Maßnahme: Sofortige Initialisierung des Source Reference Adapters
// Dies garantiert, dass die wichtigsten Funktionen in jedem Fall verfügbar sind,
// unabhängig vom Modus oder anderen Initialisierungsproblemen
initializeSourceReferenceAdapter();
console.log('[main.ts] Source Reference Adapter früh initialisiert', {
  useLegacyBridge,
  useMockApi
});

// NOTFALL-FIX: Direkter Ersatz der problematischen Funktion
// Falls die Initialisierung nicht funktioniert, stellen wir sicher, 
// dass eine einfache Version der Funktion immer verfügbar ist
if (typeof (window as any).isSourceReferencesVisible !== 'function') {
  // Import des Composables für Notfall-Direktzugriff
  const emergencyComposable = useSourceReferences();
  
  (window as any).isSourceReferencesVisible = (message: any) => {
    console.warn('[main.ts] EMERGENCY isSourceReferencesVisible aufgerufen');
    try {
      if (emergencyComposable?.isSourceReferencesVisible) {
        return emergencyComposable.isSourceReferencesVisible(message);
      }
    } catch (error) {
      console.error('[main.ts] Notfall-Fehlerbehandlung für isSourceReferencesVisible:', error);
    }
    // Absolute Fallback
    return false;
  };
  
  console.log('[main.ts] Notfall-Funktion isSourceReferencesVisible installiert');
}

// Standardmäßige Bridge-Initialisierung je nach Modus
if (useLegacyBridge) {
  console.log('Bridge-Modus aktiv: Legacy-Bridge-System wird initialisiert');
  // Bridge und Legacy-Kompatibilität initialisieren
  initializeBridge(app);

  // Source References Adapter noch einmal initialisieren (Sicherheitsmaßnahme)
  initializeSourceReferenceAdapter();
} else if (useMockApi) {
  console.log('Reiner Vue-Modus mit Mock-API: Legacy-Bridge-System wird übersprungen');
  // Wir registrieren ein minimales telemetry-Objekt als Fallback
  window.telemetry = {
    trackEvent: (name: string, props?: Record<string, any>) => console.log(`[Mock] Telemetrie-Event: ${name}`, props),
    trackError: (error: Error | unknown, props?: Record<string, any>) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`[Mock] Telemetrie-Fehler: ${errorMessage}`, props);
    },
    trackPerformance: (name: string, duration: number, props?: Record<string, any>) => console.log(`[Mock] Telemetrie-Performance: ${name} (${duration}ms)`, props)
  };
} else {
  console.log('Standard-Modus: Legacy-Bridge-System wird initialisiert');
  // Im Standardmodus trotzdem Bridge initialisieren für Kompatibilität
  initializeBridge(app);
  
  // Source References Adapter noch einmal initialisieren (Sicherheitsmaßnahme)
  initializeSourceReferenceAdapter();
}

// Letzte Prüfung, ob die Funktion wirklich verfügbar ist
console.log('[main.ts] Validierung der Source Reference Funktionen:', {
  isSourceReferencesVisible: typeof (window as any).isSourceReferencesVisible === 'function',
  toggleSourceReferences: typeof (window as any).toggleSourceReferences === 'function',
  getSourceReferences: typeof (window as any).getSourceReferences === 'function'
});

// Direktiven registrieren
globalDirectives.forEach((directive: DirectiveRegistration) => {
  app.directive(directive.name, directive.definition)
})

// Plugins registrieren
globalPlugins.forEach((plugin: PluginRegistration) => {
  app.use(plugin.plugin, plugin.options)
})

// Mock-Service-Provider registrieren
app.use(mockServiceProvider)

// Nur Router registrieren (Pinia wurde bereits registriert)
app.use(router)

// Typ für Vue-Komponenteninstanz
interface ComponentInstance {
  $options?: {
    name?: string;
  };
}

// Globale Fehlerbehandlung
app.config.errorHandler = (err: unknown, vm: ComponentInstance | null, info: string) => {
  console.error('Globaler Vue-Fehler:', err)

  const componentName = vm?.$options?.name || 'unknown';
  setupErrorReporting().captureError(
    err instanceof Error ? err : new Error(String(err)),
    {
      source: {
        type: 'component',
        name: componentName
      },
      context: { info }
    }
  );

  // Telemetrie für Fehler
  if (window.telemetry) {
    window.telemetry.trackError(
      err instanceof Error ? err : new Error(String(err)),
      { component: componentName, info }
    );
  }
}

// Performance-Metriken
const perfEntries: PerformanceEntry[] = []
if (window.performance && window.performance.getEntriesByType) {
  perfEntries.push(...window.performance.getEntriesByType('navigation'))
}

// App mounten
app.mount('#app')

// Ladezeit registrieren
const loadEndTime = performance.now()
console.log(`App in ${Math.round(loadEndTime)}ms geladen`)

// Pure Mode Indicator anzeigen
import { showPureModeIndicator } from './utils/pureModeIndicator'
// Erst nach dem App-Mount anzeigen, damit das DOM vollständig geladen ist
setTimeout(() => showPureModeIndicator(), 500)

// Hilfsmeldung in der Konsole ausgeben
console.log(`
✅ nscale DMS Assistant läuft im Pure Vue Mode!
   • Verwendet Mock-Services anstatt echter API-Calls
   • Keine Abhängigkeit von einer Backend-API
   • Lokale Datenspeicherung und Simulation

🔍 Hilfreiche URL-Parameter:
   • ?mockApi=true - Aktiviert Mock-Services (aktuell aktiv)
   • ?useBridge=true - Aktiviert Legacy-Bridge-Modus
   • ?feature_*=true|false - Aktiviert/deaktiviert Features

💻 Entwicklermodus:
   • Drücke F12 für Developer Tools
   • Sieh dir die Konsole für Debugging-Informationen an
   • Pure Mode Indikator unten rechts zeigt den aktuellen Modus

`)

// Telemetrie für App-Load
if (window.telemetry) {
  window.telemetry.trackPerformance('app_load', loadEndTime, {
    buildVersion: window.APP_CONFIG?.buildVersion || 'unknown',
    environment: window.APP_CONFIG?.environment || 'development'
  })
}

// Lade-Indikator entfernen
const appLoader = document.getElementById('app-loading')
if (appLoader) {
  appLoader.classList.add('app-loader-fade')
  setTimeout(() => {
    appLoader.style.display = 'none'
  }, 500)
}