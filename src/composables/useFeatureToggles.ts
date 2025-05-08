import { computed, unref, onErrorCaptured, ref } from 'vue';
import { useFeatureTogglesStore, FeatureToggleError, FeatureToggleStatus, FeatureConfig, FeatureToggleRole } from '../stores/featureToggles';

/**
 * Optionen für das Feature Toggle Composable
 */
export interface FeatureToggleOptions {
  /** Gibt an, ob automatisch auf den Fallback zurückgefallen werden soll bei Fehlern */
  autoFallback?: boolean;
  /** Fehlerhandler-Funktion, die bei Feature-Fehlern aufgerufen wird */
  onError?: (error: FeatureToggleError) => void;
  /** Aktuelle Benutzerrolle für Feature-Verfügbarkeit */
  userRole?: FeatureToggleRole;
  /** Gibt an, ob der Debug-Modus aktiv sein soll */
  debug?: boolean;
}

/**
 * Feature Toggle Komposable
 * 
 * Stellt eine vereinfachte API zum Feature Toggle Store bereit,
 * um Features in Komponenten einfach aktivieren/deaktivieren zu können.
 * 
 * Erweitert für die Vue 3 SFC-Migration mit Unterstützung für Fehlerbehandlung
 * und automatischem Fallback auf Legacy-Implementierungen.
 * 
 * @param options Optionen für das Feature Toggle Composable
 */
export function useFeatureToggles(options: FeatureToggleOptions = {}) {
  const featureStore = useFeatureTogglesStore();
  
  // Standard-Optionen
  const {
    autoFallback = true,
    onError,
    userRole = 'user',
    debug = false
  } = options;
  
  // Fehler im Composable
  const localErrors = ref<FeatureToggleError[]>([]);
  
  /**
   * Erfasst einen Fehler und ruft ggf. den benutzerdefinierten Fehler-Handler auf
   */
  function handleError(error: FeatureToggleError): void {
    localErrors.value.push(error);
    
    if (debug) {
      console.error('Feature-Toggle-Fehler in Komponente:', error);
    }
    
    // Benutzerdefinierten Handler aufrufen, falls vorhanden
    if (onError) {
      onError(error);
    }
  }
  
  /**
   * Meldet einen Fehler für ein Feature und aktiviert ggf. den Fallback
   */
  function reportError(
    featureName: string, 
    message: string, 
    details?: any
  ): void {
    // Fehler im Store erfassen
    featureStore.reportFeatureError(
      featureName,
      message,
      details,
      autoFallback
    );
    
    // Fehler auch lokal erfassen
    const error: FeatureToggleError = {
      feature: featureName,
      message,
      timestamp: new Date(),
      details,
      fallbackActive: autoFallback && featureStore.isFallbackActive(featureName)
    };
    
    handleError(error);
  }
  
  // Error-Boundary einrichten
  onErrorCaptured((error, instance, info) => {
    // Prüfen, ob der Fehler in einer SFC-Komponente aufgetreten ist
    if (instance && instance.$.vnode && instance.$.vnode.type) {
      const componentName = instance.$.vnode.type.__name || 'UnknownComponent';
      
      // Prüfen, ob es sich um eine SFC-Komponente handelt
      if (componentName.startsWith('Sfc')) {
        // Passenden Feature-Namen ermitteln
        let featureName = '';
        
        if (componentName.includes('DocConverter')) {
          featureName = 'useSfcDocConverter';
        } else if (componentName.includes('Admin')) {
          featureName = 'useSfcAdmin';
        } else if (componentName.includes('Chat')) {
          featureName = 'useSfcChat';
        } else if (componentName.includes('Settings')) {
          featureName = 'useSfcSettings';
        }
        
        if (featureName) {
          reportError(
            featureName,
            `Fehler in SFC-Komponente ${componentName}: ${error instanceof Error ? error.message : String(error)}`,
            { error, info, componentName }
          );
          
          // Fehler wurde behandelt
          return true;
        }
      }
    }
    
    // Fehler nicht behandelt, weitergeben
    return false;
  });
  
  // Computed Properties für Features
  const piniaAuth = computed({
    get: () => featureStore.usePiniaAuth,
    set: (value) => featureStore.usePiniaAuth = value
  });
  
  const piniaSessions = computed({
    get: () => featureStore.usePiniaSessions,
    set: (value) => featureStore.usePiniaSessions = value
  });
  
  const piniaUI = computed({
    get: () => featureStore.usePiniaUI,
    set: (value) => featureStore.usePiniaUI = value
  });
  
  const piniaSettings = computed({
    get: () => featureStore.usePiniaSettings,
    set: (value) => featureStore.usePiniaSettings = value
  });
  
  const uiComponents = computed({
    get: () => featureStore.useNewUIComponents,
    set: (value) => featureStore.useNewUIComponents = value
  });
  
  const darkMode = computed({
    get: () => featureStore.useDarkMode,
    set: (value) => featureStore.useDarkMode = value
  });
  
  const legacyBridge = computed({
    get: () => featureStore.useLegacyBridge,
    set: (value) => featureStore.useLegacyBridge = value
  });
  
  const modernDocConverter = computed({
    get: () => featureStore.useModernDocConverter,
    set: (value) => featureStore.useModernDocConverter = value
  });
  
  // SFC-Migration Feature-Properties
  const sfcDocConverter = computed({
    get: () => featureStore.useSfcDocConverter,
    set: (value) => featureStore.useSfcDocConverter = value
  });
  
  const sfcAdmin = computed({
    get: () => featureStore.useSfcAdmin,
    set: (value) => featureStore.useSfcAdmin = value
  });
  
  const sfcChat = computed({
    get: () => featureStore.useSfcChat,
    set: (value) => featureStore.useSfcChat = value
  });
  
  const sfcSettings = computed({
    get: () => featureStore.useSfcSettings,
    set: (value) => featureStore.useSfcSettings = value
  });
  
  // Status-Verknüpfungen mit Fehlerüberwachung
  /**
   * Prüft, ob ein Feature verwendet werden soll,
   * unter Berücksichtigung des Fallback-Status
   */
  function shouldUseFeature(featureName: string): boolean {
    // Wenn das Feature nicht aktiviert ist, nicht verwenden
    if (!featureStore.isEnabled(featureName)) {
      return false;
    }
    
    // Wenn ein Fallback aktiv ist, nicht verwenden
    if (featureStore.isFallbackActive(featureName)) {
      return false;
    }
    
    return true;
  }
  
  // Kombinierte Feature-Statusindikatoren
  const allStoresEnabled = computed(() => featureStore.areAllStoresEnabled);
  const legacyModeActive = computed(() => featureStore.isLegacyModeActive);
  const sfcFeaturesEnabled = computed(() => featureStore.areSfcFeaturesEnabled);
  
  /**
   * Get feature status with all metadata
   */
  function getFeatureStatus(name: string): FeatureToggleStatus {
    return featureStore.getFeatureStatus(name);
  }
  
  /**
   * Liste aller verfügbaren Feature-Konfigurationen mit Status
   */
  const featureConfigs = computed(() => featureStore.allFeatureConfigs);
  
  /**
   * Prüfen, ob der aktuelle Benutzer Zugriff auf ein Feature hat
   */
  function canAccessFeature(featureName: string): boolean {
    return featureStore.isFeatureAvailableForRole(featureName, userRole);
  }
  
  /**
   * Gruppierte Features nach Kategorie
   */
  const groupedFeatures = computed(() => {
    const groups: Record<string, (FeatureConfig & { key: string, status: FeatureToggleStatus })[]> = {
      'sfcMigration': [],
      'uiFeatures': [],
      'coreFeatures': [],
      'experimentalFeatures': []
    };
    
    Object.entries(unref(featureConfigs)).forEach(([key, config]) => {
      const group = config.group || 'experimentalFeatures';
      groups[group].push({
        ...config,
        key,
        status: config.status
      });
    });
    
    return groups;
  });
  
  // Fallback-bezogene Hilfsfunktionen
  /**
   * Prüft, ob für ein Feature ein Fallback aktiv ist
   */
  function isFallbackActive(featureName: string): boolean {
    return featureStore.isFallbackActive(featureName);
  }
  
  /**
   * Aktiviert den Fallback für ein Feature
   */
  function activateFallback(featureName: string): void {
    featureStore.setFallbackMode(featureName, true);
  }
  
  /**
   * Deaktiviert den Fallback für ein Feature
   */
  function deactivateFallback(featureName: string): void {
    featureStore.setFallbackMode(featureName, false);
  }
  
  /**
   * Leert die Fehler für ein Feature
   */
  function clearErrors(featureName: string): void {
    featureStore.clearFeatureErrors(featureName);
    
    // Auch lokale Fehler leeren
    localErrors.value = localErrors.value.filter(err => err.feature !== featureName);
  }
  
  return {
    // Features als reaktive Properties
    piniaAuth,
    piniaSessions,
    piniaUI,
    piniaSettings,
    uiComponents,
    darkMode,
    legacyBridge,
    modernDocConverter,
    
    // SFC-Migration Features
    sfcDocConverter,
    sfcAdmin,
    sfcChat,
    sfcSettings,
    
    // Feature-Konfigurationen und Gruppen
    featureConfigs,
    groupedFeatures,
    
    // Fehler und Status
    errors: localErrors,
    storeErrors: computed(() => featureStore.errors),
    
    // Kombinierte Statuswerte
    allStoresEnabled,
    legacyModeActive,
    sfcFeaturesEnabled,
    
    // Feature-Prüffunktionen
    shouldUseFeature,
    isEnabled: (feature: string) => featureStore.isEnabled(feature),
    canAccessFeature,
    getFeatureStatus,
    
    // Fallback-Verwaltung
    isFallbackActive,
    activateFallback,
    deactivateFallback,
    
    // Fehler-Verwaltung
    reportError,
    clearErrors,
    
    // Feature Management Funktionen
    toggleFeature: (feature: string) => featureStore.toggleFeature(feature),
    enableFeature: (feature: string) => featureStore.enableFeature(feature),
    disableFeature: (feature: string) => featureStore.disableFeature(feature),
    
    // Modus-Wechselfunktionen
    enableAll: () => featureStore.enableAllFeatures(),
    enableCoreOnly: () => featureStore.enableCoreFeatures(),
    enableLegacyMode: () => featureStore.enableLegacyMode(),
    enableAllSfcFeatures: () => featureStore.enableAllSfcFeatures(),
    disableAllSfcFeatures: () => featureStore.disableAllSfcFeatures(),
    
    // Direkte Konfiguration
    configure: (config: Record<string, boolean>) => featureStore.configureFeatures(config)
  };
}