/**
 * nscale DMS Assistant - Enhanced Haupteinstiegspunkt mit Auth-Persistenz
 * 
 * Optimierte Version mit verbesserter Session-Wiederherstellung
 * und koordinierter Auth-Initialisierung
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { RouteLocationNormalized } from 'vue-router'
import { RouterInitializationTester } from '@/utils/routerInitializationTester'
import { routerInitDebugger } from '@/utils/routerInitDebugger'

// Services
import { sessionContinuityService } from '@/services/auth/SessionContinuityService'
import { authTokenManager } from '@/services/auth/AuthTokenManager'

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
 * Phase 0: Pre-Init Session Recovery
 * MUSS als erstes laufen um Auth-Status vor allem anderen wiederherzustellen
 */
async function preInitSessionRecovery() {
  console.log('[MAIN-ENHANCED] Phase 0: Pre-Init Session Recovery');
  
  try {
    // Versuche Session aus gespeicherten Tokens wiederherzustellen
    const restorationResult = await sessionContinuityService.initializeSession();
    
    if (restorationResult.success) {
      console.log('[MAIN-ENHANCED] Session erfolgreich wiederhergestellt');
      return restorationResult.authData;
    } else {
      console.log('[MAIN-ENHANCED] Keine gültige Session gefunden');
      return null;
    }
  } catch (error) {
    console.error('[MAIN-ENHANCED] Fehler bei Session-Wiederherstellung:', error);
    return null;
  }
}

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
 * Phase 2: Pinia-Initialisierung mit Auth-Wiederherstellung
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
 * Phase 3: Stores initialisieren mit Auth-Wiederherstellung
 */
async function initializeStores(pinia: ReturnType<typeof createPinia>, authData: any) {
  if (initTester) initTester.markStageStarted('stores');
  routerInitDebugger.markStage('stores', 'started');
  
  // Auth Store MUSS zuerst initialisiert werden
  const { useAuthStore } = await import('./stores/auth');
  const authStore = useAuthStore(pinia);
  
  // Gebe dem Persistenz-Plugin Zeit, den Store zu laden
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // Wenn Pre-Init Auth-Daten vorhanden sind, diese verwenden
  if (authData) {
    console.log('[MAIN-ENHANCED] Setze wiederhergestellte Auth-Daten im Store');
    authStore.token = authData.token;
    authStore.refreshToken = authData.refreshToken;
    authStore.expiresAt = authData.expiresAt;
    authStore.user = authData.userInfo;
    
    if (authData.userInfo?.roles) {
      authStore.extractPermissionsFromRoles(authData.userInfo.roles);
    }
    
    // HTTP-Clients konfigurieren
    authStore.configureHttpClients(authData.token);
    
    // Session Continuity Service informieren
    sessionContinuityService.setAuthenticatedState(true);
  } else {
    // Versuche alternative Wiederherstellung über Store
    const restored = await authStore.restoreAuthSession();
    if (!restored) {
      // Falls keine Session, prüfe Legacy-Migration
      authStore.migrateFromLegacyStorage();
    }
  }
  
  // Auth-Store initialisieren
  await authStore.initialize();
  
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
 * Phase 4: Router-Initialisierung mit Auth-Guards
 */
async function initializeRouter(authStore: any) {
  if (initTester) initTester.markStageStarted('router');
  routerInitDebugger.markStage('router', 'started');
  
  // Router dynamisch importieren
  const { default: router } = await import('./router');
  
  // Auth-Guards vor Router-Installation einrichten
  const { setupAuthRouterGuards } = await import('./plugins/authRouterGuards');
  setupAuthRouterGuards(router);
  
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
 * Hauptinitialisierungsfunktion mit verbesserter Auth-Persistenz
 */
async function initializeApp() {
  try {
    console.log('[MAIN-ENHANCED] Starte App-Initialisierung mit Auth-Persistenz');
    
    if (initTester) initTester.startTest();
    
    // Phase 0: Auth-Session Recovery VOR ALLEM ANDEREN
    const recoveredAuthData = await preInitSessionRecovery();
    
    // Phase 1: Kritische Dependencies
    await initializeCriticalDependencies();
    
    // Phase 2: Pinia (MUSS vor allem anderen kommen)
    const pinia = initializePinia();
    
    // Phase 3: Stores initialisieren MIT wiederhergestellten Auth-Daten
    const authStore = await initializeStores(pinia, recoveredAuthData);
    
    // Phase 4: Router MIT Auth-Guards
    const router = await initializeRouter(authStore);
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
    
    // Versuche zur letzten gespeicherten Route zu navigieren
    if (authStore.isAuthenticated) {
      const lastRoute = sessionContinuityService.getLastAuthenticatedRoute();
      if (lastRoute && lastRoute !== router.currentRoute.value.fullPath) {
        console.log('[MAIN-ENHANCED] Navigiere zur letzten gespeicherten Route:', lastRoute);
        try {
          await router.push(lastRoute);
        } catch (error) {
          console.warn('[MAIN-ENHANCED] Konnte nicht zur letzten Route navigieren:', error);
        }
      }
    }
    
    // App mounten
    app.mount('#app');
    
    if (initTester) {
      initTester.markStageCompleted('navigation');
      setTimeout(() => {
        const report = initTester.generateReport();
        console.log('[MAIN-ENHANCED] Initialisierungsbericht:', report);
      }, 500);
    }
    
    // Performance-Metriken
    const loadEndTime = performance.now();
    console.log(`[MAIN-ENHANCED] App in ${Math.round(loadEndTime)}ms geladen`);
    
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
    
    console.log('✅ [MAIN-ENHANCED] App erfolgreich mit Auth-Persistenz initialisiert');
    
  } catch (error) {
    console.error('❌ [MAIN-ENHANCED] Kritischer Fehler bei App-Initialisierung:', error);
    
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
🚀 nscale DMS Assistant - Enhanced Auth-Persistenz
   • Session-Wiederherstellung VOR App-Init
   • Koordinierte Auth-Initialisierung
   • Robuste Token-Persistenz über Page-Refresh
   • Automatische Route-Wiederherstellung

🔍 Debug-Modus: ${import.meta.env.DEV ? 'AKTIV' : 'INAKTIV'}
   • Session Continuity: AKTIV
   • Token Manager: AKTIV
`);