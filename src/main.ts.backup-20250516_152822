/**
 * nscale DMS Assistant - Haupteinstiegspunkt der Anwendung
 * Optimierte Version mit verbesserter Initialisierungsreihenfolge
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { RouteLocationNormalized } from 'vue-router'
import { RouterInitializationTester } from '@/utils/routerInitializationTester'
import { routerInitDebugger } from '@/utils/routerInitDebugger'

// App-Komponente
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

// Initialisierungstester
const initTester = process.env.NODE_ENV === 'development' 
  ? new RouterInitializationTester() 
  : null;

/**
 * Phase 1: Kritische Initialisierungen VOR Vue-App
 */
async function initializeCriticalDependencies() {
  if (initTester) initTester.markStageStarted('vue-app');
  routerInitDebugger.markStage('vue-app', 'started');
  
  // Import kritischer Utilities
  await import('@/utils/authRequestInterceptor');
  await import('./utils/authRequestAdapter');
  
  // Service-Module importieren
  const { initializeApiServices } = await import('@/services/api/config');
  const { useErrorReporting } = await import('@/utils/errorReportingService');
  const { initializeTelemetry } = await import('@/services/analytics/telemetry');
  
  // Initialisiere Services
  initializeApiServices();
  // Error Reporting wird später in initializeApp verwendet
  initializeTelemetry();
  
  if (initTester) initTester.markStageCompleted('vue-app');
  routerInitDebugger.markStage('vue-app', 'completed');
}

/**
 * Phase 2: Pinia-Initialisierung (MUSS vor Router erfolgen)
 */
function initializePinia() {
  if (initTester) initTester.markStageStarted('pinia');
  routerInitDebugger.markStage('pinia', 'started');
  
  const pinia = createPinia();
  
  // Pinia Persist Plugin hinzufügen für Store-Persistenz
  pinia.use(piniaPluginPersistedstate);
  
  // Setze globale Referenz für Legacy-Code
  if (typeof window !== 'undefined') {
    (window as any).__pinia = pinia;
  }
  
  if (initTester) initTester.markStageCompleted('pinia');
  routerInitDebugger.markStage('pinia', 'completed');
  return pinia;
}

/**
 * Phase 3: Stores initialisieren
 */
async function initializeStores(pinia: ReturnType<typeof createPinia>) {
  if (initTester) initTester.markStageStarted('stores');
  routerInitDebugger.markStage('stores', 'started');
  
  // Auth Store MUSS zuerst initialisiert werden
  const { useAuthStore } = await import('./stores/auth');
  const authStore = useAuthStore(pinia);
  
  // Gebe dem Persistenz-Plugin Zeit, den Store zu laden
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // Token aus localStorage laden falls Pinia-Persist fehlschlägt
  if (!authStore.token) {
    const storedToken = localStorage.getItem('nscale_access_token');
    const storedRefreshToken = localStorage.getItem('nscale_refresh_token');
    
    if (storedToken) {
      console.log('[MAIN] Token aus localStorage wiederhergestellt');
      await authStore.setToken(storedToken);
      if (storedRefreshToken) {
        authStore.refreshToken = storedRefreshToken;
      }
    }
  }
  
  // Auth-Store explizit initialisieren
  if (!authStore.activeInterceptors || authStore.activeInterceptors.length === 0) {
    console.log('[MAIN] Auth-Store wird manuell initialisiert');
    authStore.initialize();
  }
  
  // Weitere kritische Stores
  const storeImports = [
    import('./stores/featureToggles'),
    import('./stores/sessions'),
    import('./stores/ui'),
    import('./stores/settings')
  ];
  
  await Promise.all(storeImports);
  
  if (initTester) initTester.markStageCompleted('stores');
  routerInitDebugger.markStage('stores', 'completed');
  return authStore;
}

/**
 * Phase 4: Router-Initialisierung (NACH Pinia und Stores)
 */
async function initializeRouter() {
  if (initTester) initTester.markStageStarted('router');
  routerInitDebugger.markStage('router', 'started');
  
  // Router dynamisch importieren
  const { default: router } = await import('./router');
  
  // Setze globale Referenz
  if (typeof window !== 'undefined') {
    (window as any).__router = router;
  }
  
  if (initTester) initTester.markStageCompleted('router');
  routerInitDebugger.markStage('router', 'completed');
  return router;
}

/**
 * Phase 5: Composables und Services
 */
async function initializeComposablesAndServices() {
  if (initTester) initTester.markStageStarted('composables');
  
  // Importiere Composables
  const composableImports = [
    import('@/composables/useLogger'),
    import('@/composables/useApiCache'),
    import('@/composables/useFeatureToggles'),
    import('@/composables/useSourceReferences')
  ];
  
  await Promise.all(composableImports);
  
  if (initTester) initTester.markStageCompleted('composables');
  
  if (initTester) initTester.markStageStarted('services');
  
  // Services mit korrekter Reihenfolge
  const serviceImports = [
    import('@/services/router/RouterService'),
    import('@/services/selfHealing/SelfHealingService'),
    import('@/controllers/NavigationController')
  ];
  
  await Promise.all(serviceImports);
  
  if (initTester) initTester.markStageCompleted('services');
}

/**
 * Phase 6: Legacy-Kompatibilität und Bridge
 */
async function initializeLegacyCompatibility(app: any) {
  // Bridge und Legacy-Funktionen
  const { initializeBridge } = await import('./bridge-init');
  const { initializeSourceReferenceAdapter } = await import('./utils/sourceReferenceAdapter');
  
  // Überprüfen, ob Bridge-Modus aktiv ist
  const useLegacyBridge = new URLSearchParams(window.location.search).get('useBridge') === 'true';
  
  // Source Reference Adapter initialisieren
  initializeSourceReferenceAdapter();
  
  // Bridge initialisieren wenn nötig
  if (useLegacyBridge || !process.env.PURE_VUE_MODE) {
    initializeBridge(app);
  }
  
  // Notfall-Fallback für Source References
  const { useSourceReferences } = await import('@/composables/useSourceReferences');
  const emergencyComposable = useSourceReferences();
  
  if (typeof (window as any).isSourceReferencesVisible !== 'function') {
    (window as any).isSourceReferencesVisible = (message: any) => {
      try {
        return emergencyComposable?.isSourceReferencesVisible?.(message) ?? false;
      } catch (error) {
        console.error('Notfall-Fehlerbehandlung für isSourceReferencesVisible:', error);
        return false;
      }
    };
  }
}

/**
 * Hauptinitialisierungsfunktion
 */
async function initializeApp() {
  try {
    console.log('[MAIN] Starte App-Initialisierung mit verbesserter Reihenfolge');
    
    if (initTester) initTester.startTest();
    
    // Phase 1: Kritische Dependencies
    await initializeCriticalDependencies();
    
    // Phase 2: Pinia (MUSS vor allem anderen kommen)
    const pinia = initializePinia();
    
    // Phase 3: Stores initialisieren
    const authStore = await initializeStores(pinia);
    
    // Phase 4: Router (NACH Pinia und Stores)
    const router = await initializeRouter();
    routerInitDebugger.initializeRouter(router);
    
    // Phase 5: Composables und Services
    await initializeComposablesAndServices();
    
    // Phase 6: Vue App erstellen
    const app = createApp(App);
    
    // Installiere Pinia SOFORT
    app.use(pinia);
    
    // Warte kurz um sicherzustellen dass Pinia bereit ist
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Installiere Router
    app.use(router);
    
    // Phase 7: Legacy-Kompatibilität
    await initializeLegacyCompatibility(app);
    
    // Phase 8: Direktiven und Plugins
    const { globalDirectives } = await import('@/directives');
    const { globalPlugins } = await import('@/plugins');
    const { mockServiceProvider } = await import('./plugins/mockServiceProvider');
    
    // Direktiven registrieren
    globalDirectives.forEach((directive: DirectiveRegistration) => {
      app.directive(directive.name, directive.definition);
    });
    
    // Plugins registrieren
    globalPlugins.forEach((plugin: PluginRegistration) => {
      app.use(plugin.plugin, plugin.options);
    });
    
    // Mock-Service-Provider
    app.use(mockServiceProvider);
    
    // Styling importieren
    await import('@/assets/styles/main.scss');
    await import('@/assets/styles/utility-classes.css');
    
    // Weitere Initialisierungen
    const { setupNetworkMonitoring } = await import('@/utils/networkMonitor');
    const { initializeFeatureFlags } = await import('@/config/featureFlags');
    
    setupNetworkMonitoring();
    initializeFeatureFlags();
    
    // Auth-Fixes und Debugging
    if (import.meta.env.DEV) {
      const authDiagnostics = await import('@/utils/authDiagnostics');
      authDiagnostics.default.enable();
      
      // Lade Debug-Tools
      const debugImports = [
        import('./utils/checkAuthDebug.js'),
        import('./utils/authDebugCommands.js'),
        import('./utils/batchDebugCommands.js'),
        import('./utils/fixCommands.js')
      ];
      
      await Promise.all(debugImports).catch(err => {
        console.error('Failed to load debug tools:', err);
      });
    }
    
    // Auth-Fix initialisieren
    const { authenticationFix } = await import('@/utils/authenticationFix');
    await authenticationFix.initialize();
    
    // Import Error Reporting
    const { useErrorReporting } = await import('@/utils/errorReportingService');
    
    // Globale Fehlerbehandlung
    app.config.errorHandler = (err: unknown, vm: any, info: string) => {
      console.error('Globaler Vue-Fehler:', err);
      
      // Error Reporting
      useErrorReporting().captureError(
        err instanceof Error ? err : new Error(String(err)),
        {
          source: {
            type: 'component',
            name: vm?.$options?.name || 'unknown'
          },
          context: { info }
        }
      );
      
      // Spezielle Behandlung für Router-Fehler
      if (err instanceof Error && err.message?.includes('currentRoute')) {
        console.error('Router-Fehler erkannt, versuche Neuinitialisierung');
        setTimeout(() => {
          if (!router.currentRoute.value) {
            router.push('/').catch(console.error);
          }
        }, 100);
      }
    };
    
    // Warte auf Router-Bereitschaft
    await router.isReady();
    
    // App mounten
    app.mount('#app');
    
    if (initTester) {
      initTester.markStageCompleted('navigation');
      setTimeout(() => {
        const report = initTester.generateReport();
        console.log('[MAIN] Initialisierungsbericht:', report);
      }, 500);
    }
    
    // Performance-Metriken
    const loadEndTime = performance.now();
    console.log(`App in ${Math.round(loadEndTime)}ms geladen`);
    
    // Telemetrie
    if (window.telemetry) {
      window.telemetry.trackPerformance('app_load', loadEndTime, {
        buildVersion: window.APP_CONFIG?.buildVersion || 'unknown',
        environment: window.APP_CONFIG?.environment || 'development'
      });
    }
    
    // Pure Mode Indicator
    setTimeout(async () => {
      const { showPureModeIndicator } = await import('./utils/pureModeIndicator');
      showPureModeIndicator();
    }, 500);
    
    // Lade-Indikator entfernen
    const appLoader = document.getElementById('app-loading');
    if (appLoader) {
      appLoader.classList.add('app-loader-fade');
      setTimeout(() => {
        appLoader.style.display = 'none';
      }, 500);
    }
    
    console.log('✅ App erfolgreich initialisiert');
    
  } catch (error) {
    console.error('❌ Kritischer Fehler bei App-Initialisierung:', error);
    
    if (initTester) {
      initTester.markStageFailed('vue-app', error as Error);
      const report = initTester.generateReport();
      console.error('Fehlerbericht:', report);
    }
    
    // Fehlerseite anzeigen
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h1>Anwendung konnte nicht gestartet werden</h1>
        <p>Ein kritischer Fehler ist aufgetreten. Bitte laden Sie die Seite neu.</p>
        <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px;">
          Seite neu laden
        </button>
        <details style="margin-top: 20px; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto;">
          <summary>Technische Details</summary>
          <pre>${error instanceof Error ? error.stack : String(error)}</pre>
        </details>
      </div>
    `;
  }
}

// Starte App
initializeApp();

// Hilfsmeldung
console.log(`
🚀 nscale DMS Assistant - Verbesserte Initialisierung
   • Pinia wird VOR Router initialisiert
   • Stores werden VOR Router-Guards geladen
   • Fehlerbehandlung für Timing-Probleme

🔍 Debug-Modus: ${import.meta.env.DEV ? 'AKTIV' : 'INAKTIV'}
   • Router-Init-Tester: ${initTester ? 'AKTIV' : 'INAKTIV'}
`);