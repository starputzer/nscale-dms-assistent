import { defineStore } from 'pinia';
import { ref, computed, reactive } from 'vue';

/**
 * Interface für Feature-Toggle-Fehler
 */
export interface FeatureToggleError {
  /** Feature, bei dem der Fehler aufgetreten ist */
  feature: string;
  /** Fehlermeldung */
  message: string;
  /** Zeitstempel des Fehlers */
  timestamp: Date;
  /** Zusätzliche Details zum Fehler */
  details?: any;
  /** Ob für dieses Feature auf Legacy-Modus zurückgefallen wurde */
  fallbackActive: boolean;
}

/**
 * Interface für Feature-Toggle-Status
 */
export interface FeatureToggleStatus {
  /** Gibt an, ob das Feature aktuell aktiv ist */
  isActive: boolean;
  /** Gibt an, ob das Feature stabil ist oder noch experimentell */
  isStable: boolean;
  /** Gibt an, ob für dieses Feature ein Fallback existiert */
  hasFallback: boolean;
  /** Gibt an, ob aktuell der Fallback aktiv ist */
  isFallbackActive: boolean;
  /** Aufgetretene Fehler bei diesem Feature */
  errors: FeatureToggleError[];
}

/**
 * Typen für Vue SFC Feature Flags
 */
export type SfcFeatureFlag = 
  | 'useSfcDocConverter' 
  | 'useSfcAdmin' 
  | 'useSfcChat' 
  | 'useSfcSettings';

/**
 * Rolle für Feature-Toggle-Berechtigungen
 */
export type FeatureToggleRole = 'admin' | 'developer' | 'user' | 'guest';

/**
 * Feature-Konfiguration mit Metadaten
 */
export interface FeatureConfig {
  /** Name des Features für Anzeige in der UI */
  name: string;
  /** Beschreibung des Features */
  description: string;
  /** Feature-Gruppe für Kategorisierung */
  group: 'sfcMigration' | 'uiFeatures' | 'coreFeatures' | 'experimentalFeatures';
  /** Gibt an, ob das Feature stabil ist oder experimentell */
  stable: boolean;
  /** Gibt an, welche Rolle mindestens benötigt wird, um dieses Feature zu aktivieren */
  requiredRole: FeatureToggleRole;
  /** Gibt an, ob ein Fallback verfügbar ist */
  hasFallback: boolean;
  /** Abhängige Features, die aktiviert sein müssen */
  dependencies?: string[];
}

/**
 * Feature Toggle Store
 * 
 * Verwaltet Feature-Flags für die Anwendung, um Features progressiv zu aktivieren
 * oder zu deaktivieren. Besonders nützlich während der Migration und für A/B-Tests.
 * 
 * Erweitert für die Vue 3 SFC-Migration mit robustem Fehlerhandling und Fallback-Mechanismus.
 */
export const useFeatureTogglesStore = defineStore('featureToggles', () => {
  // State
  const version = ref<number>(2); // Erhöht auf 2 wegen der neuen Funktionalität
  
  // Fehlererfassung und Status
  const errors = reactive<Record<string, FeatureToggleError[]>>({});
  const activeFallbacks = reactive<Record<string, boolean>>({});
  
  // Feature-Konfigurationen
  const featureConfigs = reactive<Record<string, FeatureConfig>>({
    // UI Features
    uiComponentsDemo: {
      name: 'UI Components Demo',
      description: 'Demo der UI-Basiskomponenten mit interaktiven Beispielen',
      group: 'uiFeatures',
      stable: true,
      requiredRole: 'developer',
      hasFallback: false,
      dependencies: ['useNewUIComponents']
    },
    // SFC-Migration Features
    useSfcDocConverter: {
      name: 'SFC Dokumentenkonverter',
      description: 'Verwende die neue Vue 3 SFC-Implementierung des Dokumentenkonverters',
      group: 'sfcMigration',
      stable: false,
      requiredRole: 'developer',
      hasFallback: true,
      dependencies: ['usePiniaAuth', 'usePiniaUI']
    },
    useSfcAdmin: {
      name: 'SFC Admin-Bereich',
      description: 'Verwende die neue Vue 3 SFC-Implementierung des Admin-Bereichs',
      group: 'sfcMigration',
      stable: false,
      requiredRole: 'developer',
      hasFallback: true,
      dependencies: ['usePiniaAuth', 'usePiniaUI']
    },
    useSfcChat: {
      name: 'SFC Chat-Interface',
      description: 'Verwende die neue Vue 3 SFC-Implementierung des Chat-Interfaces',
      group: 'sfcMigration',
      stable: false,
      requiredRole: 'developer',
      hasFallback: true,
      dependencies: ['usePiniaAuth', 'usePiniaUI']
    },
    useSfcSettings: {
      name: 'SFC Einstellungen',
      description: 'Verwende die neue Vue 3 SFC-Implementierung der Einstellungen',
      group: 'sfcMigration',
      stable: false,
      requiredRole: 'developer',
      hasFallback: true,
      dependencies: ['usePiniaAuth', 'usePiniaUI']
    }
  });
  
  // Pinia Store Features
  const usePiniaAuth = ref<boolean>(true);
  const usePiniaSessions = ref<boolean>(true);
  const usePiniaUI = ref<boolean>(true);
  const usePiniaSettings = ref<boolean>(true);
  
  // UI Features
  const useNewUIComponents = ref<boolean>(true);
  const useToastNotifications = ref<boolean>(true);
  const useModernSidebar = ref<boolean>(true);
  const useNewAdminPanel = ref<boolean>(true);
  const uiComponentsDemo = ref<boolean>(true);

  // Theme Features
  const useDarkMode = ref<boolean>(true);
  const useThemeCustomization = ref<boolean>(true);
  
  // Legacy Integration
  const useLegacyBridge = ref<boolean>(true);
  const migrateLocalStorage = ref<boolean>(true);
  
  // Document Converter Features
  const useModernDocConverter = ref<boolean>(false);
  
  // SFC Migration Features
  const useSfcDocConverter = ref<boolean>(false);
  const useSfcAdmin = ref<boolean>(true); // Aktiviert für Admin-Bereich
  const useSfcChat = ref<boolean>(false);
  const useSfcSettings = ref<boolean>(false);
  
  // Public Getters
  const areAllStoresEnabled = computed(() => 
    usePiniaAuth.value && 
    usePiniaSessions.value && 
    usePiniaUI.value && 
    usePiniaSettings.value
  );
  
  const isLegacyModeActive = computed(() => 
    !usePiniaAuth.value || 
    !usePiniaSessions.value || 
    !usePiniaUI.value || 
    !useNewUIComponents.value
  );
  
  /**
   * Gibt an, ob alle SFC-Migrationsfeatures aktiviert sind
   */
  const areSfcFeaturesEnabled = computed(() => 
    useSfcDocConverter.value && 
    useSfcAdmin.value && 
    useSfcChat.value && 
    useSfcSettings.value
  );
  
  /**
   * Ermittelt den Status eines Feature-Toggles mit allen Metadaten
   * @param featureName Name des Features
   * @returns Der vollständige Status des Features
   */
  function getFeatureStatus(featureName: string): FeatureToggleStatus {
    // Feature-Wert ermitteln
    const isActive = isEnabled(featureName);
    
    // Konfiguration des Features ermitteln
    const config = featureConfigs[featureName];
    
    // Fehler für dieses Feature
    const featureErrors = errors[featureName] || [];
    
    // Fallback-Status
    const isFallbackActive = activeFallbacks[featureName] || false;
    
    return {
      isActive,
      isStable: config?.stable || false,
      hasFallback: config?.hasFallback || false,
      isFallbackActive,
      errors: featureErrors
    };
  }
  
  /**
   * Gibt alle verfügbaren Features mit ihren Konfigurationen zurück
   */
  const allFeatureConfigs = computed(() => {
    // Feature-Konfigurationen mit aktuellen Status anreichern
    const result: Record<string, FeatureConfig & { status: FeatureToggleStatus }> = {};
    
    Object.entries(featureConfigs).forEach(([key, config]) => {
      result[key] = {
        ...config,
        status: getFeatureStatus(key)
      };
    });
    
    return result;
  });
  
  /**
   * Prüft, ob alle erforderlichen Abhängigkeiten für ein Feature aktiviert sind
   * @param featureName Name des Features
   * @returns Gibt zurück, ob alle Abhängigkeiten erfüllt sind
   */
  function areDependenciesSatisfied(featureName: string): boolean {
    const config = featureConfigs[featureName];
    if (!config || !config.dependencies || config.dependencies.length === 0) {
      return true;
    }
    
    return config.dependencies.every(dep => isEnabled(dep));
  }
  
  /**
   * Erfasst einen Fehler für ein Feature und aktiviert ggf. den Fallback
   * @param featureName Name des Features
   * @param message Fehlermeldung
   * @param details Zusätzliche Details zum Fehler (optional)
   * @param activateFallback Gibt an, ob der Fallback aktiviert werden soll (Standard: true)
   */
  function reportFeatureError(
    featureName: string, 
    message: string, 
    details?: any, 
    activateFallback: boolean = true
  ): void {
    console.error(`Feature-Toggle-Fehler in ${featureName}:`, message, details);
    
    // Fehler-Array initialisieren, falls nicht vorhanden
    if (!errors[featureName]) {
      errors[featureName] = [];
    }
    
    // Neuen Fehler hinzufügen
    const error: FeatureToggleError = {
      feature: featureName,
      message,
      timestamp: new Date(),
      details,
      fallbackActive: activateFallback
    };
    
    errors[featureName].push(error);
    
    // Fallback aktivieren, wenn gewünscht und verfügbar
    if (activateFallback && featureConfigs[featureName]?.hasFallback) {
      setFallbackMode(featureName, true);
      
      // Feature deaktivieren
      if (featureName in ref) {
        // @ts-ignore: dynamisches Property-Aktualisieren
        ref[featureName as keyof typeof ref] = false;
      }
    }
    
    // Fehler an Monitoring-Lösung senden (hier nur Stub)
    reportToMonitoring(error);
  }
  
  /**
   * Aktiviert oder deaktiviert den Fallback-Modus für ein Feature
   * @param featureName Name des Features
   * @param active Gibt an, ob der Fallback aktiviert werden soll
   */
  function setFallbackMode(featureName: string, active: boolean): void {
    if (featureConfigs[featureName]?.hasFallback) {
      activeFallbacks[featureName] = active;
    }
  }
  
  /**
   * Prüft, ob der Fallback-Modus für ein Feature aktiv ist
   * @param featureName Name des Features
   * @returns Gibt zurück, ob der Fallback aktiv ist
   */
  function isFallbackActive(featureName: string): boolean {
    return activeFallbacks[featureName] || false;
  }
  
  /**
   * Stub für Monitoring-Integration
   * In realer Anwendung würde dies an einen Monitoring-Service senden
   */
  function reportToMonitoring(error: FeatureToggleError): void {
    // In Produktion an Monitoring-Dienst senden
    console.warn('Feature-Toggle-Fehler erfasst:', error);
  }
  
  /**
   * Löscht alle erfassten Fehler für ein Feature
   * @param featureName Name des Features
   */
  function clearFeatureErrors(featureName: string): void {
    if (errors[featureName]) {
      errors[featureName] = [];
    }
  }
  
  // Hilfsfunktion zum einfachen Umschalten eines Features
  function toggleFeature(featureName: string): boolean {
    const feature = ref[featureName as keyof typeof ref];
    
    if (typeof feature !== 'undefined' && typeof feature === 'boolean') {
      // Prüfen, ob Abhängigkeiten erfüllt sind, wenn Feature aktiviert werden soll
      if (!feature && !areDependenciesSatisfied(featureName)) {
        reportFeatureError(
          featureName,
          'Erforderliche Abhängigkeiten sind nicht aktiviert',
          { dependencies: featureConfigs[featureName]?.dependencies },
          false
        );
        return false;
      }
      
      // @ts-ignore: dynamisches Property-Aktualisieren
      ref[featureName as keyof typeof ref] = !feature;
      
      // Wenn das Feature deaktiviert wird, auch den Fallback deaktivieren
      if (feature && featureConfigs[featureName]?.hasFallback) {
        setFallbackMode(featureName, false);
      }
      
      // Aktualisiertes Feature zurückgeben
      // @ts-ignore: dynamisches Property-Abrufen
      return ref[featureName as keyof typeof ref];
    }
    
    return false;
  }
  
  // Funktion zur Überprüfung, ob ein Feature aktiviert ist
  function isEnabled(featureName: string): boolean {
    const feature = ref[featureName as keyof typeof ref];
    
    if (typeof feature !== 'undefined' && typeof feature === 'boolean') {
      return feature as boolean;
    }
    
    return false;
  }
  
  /**
   * Prüft, ob ein Feature für den Benutzer verfügbar sein sollte
   * basierend auf seiner Rolle und Konfiguration
   * @param featureName Name des Features
   * @param userRole Rolle des Benutzers
   * @returns Gibt zurück, ob das Feature aktivierbar sein sollte
   */
  function isFeatureAvailableForRole(featureName: string, userRole: FeatureToggleRole): boolean {
    const config = featureConfigs[featureName];
    if (!config) return true; // Wenn keine Konfiguration vorhanden, immer erlauben
    
    const roleHierarchy: Record<FeatureToggleRole, number> = {
      'guest': 0,
      'user': 1,
      'developer': 2,
      'admin': 3
    };
    
    return roleHierarchy[userRole] >= roleHierarchy[config.requiredRole];
  }
  
  // Funktion zum Setzen eines Feature-Status
  function setFeature(featureName: string, enabled: boolean): void {
    const feature = ref[featureName as keyof typeof ref];
    
    if (typeof feature !== 'undefined' && typeof feature === 'boolean') {
      // Prüfen, ob Abhängigkeiten erfüllt sind, wenn Feature aktiviert werden soll
      if (enabled && !areDependenciesSatisfied(featureName)) {
        reportFeatureError(
          featureName,
          'Erforderliche Abhängigkeiten sind nicht aktiviert',
          { dependencies: featureConfigs[featureName]?.dependencies },
          false
        );
        return;
      }
      
      // @ts-ignore: dynamisches Property-Aktualisieren
      ref[featureName as keyof typeof ref] = enabled;
      
      // Wenn das Feature deaktiviert wird, auch den Fallback deaktivieren
      if (!enabled && featureConfigs[featureName]?.hasFallback) {
        setFallbackMode(featureName, false);
        clearFeatureErrors(featureName);
      }
    }
  }
  
  // Funktion zum Aktivieren eines Features
  function enableFeature(featureName: string): void {
    // Prüfen, ob Abhängigkeiten erfüllt sind
    if (!areDependenciesSatisfied(featureName)) {
      // Abhängige Features automatisch aktivieren
      const dependencies = featureConfigs[featureName]?.dependencies || [];
      dependencies.forEach(dep => {
        if (!isEnabled(dep)) {
          enableFeature(dep);
        }
      });
    }
    
    setFeature(featureName, true);
  }
  
  // Funktion zum Deaktivieren eines Features
  function disableFeature(featureName: string): void {
    setFeature(featureName, false);
  }
  
  // Mehrere Features gleichzeitig konfigurieren
  function configureFeatures(features: Record<string, boolean>): void {
    Object.entries(features).forEach(([key, value]) => {
      setFeature(key, value);
    });
  }
  
  /**
   * Aktiviert alle SFC-Migrationsfeatures
   */
  function enableAllSfcFeatures(): void {
    useSfcDocConverter.value = true;
    useSfcAdmin.value = true;
    useSfcChat.value = true;
    useSfcSettings.value = true;
    
    // Erforderliche Abhängigkeiten aktivieren
    usePiniaAuth.value = true;
    usePiniaUI.value = true;
  }
  
  /**
   * Deaktiviert alle SFC-Migrationsfeatures
   */
  function disableAllSfcFeatures(): void {
    useSfcDocConverter.value = false;
    useSfcAdmin.value = false;
    useSfcChat.value = false;
    useSfcSettings.value = false;
    
    // Fallbacks deaktivieren
    Object.keys(activeFallbacks).forEach(feature => {
      if (feature.startsWith('useSfc')) {
        activeFallbacks[feature] = false;
      }
    });
    
    // Fehler löschen
    Object.keys(errors).forEach(feature => {
      if (feature.startsWith('useSfc')) {
        errors[feature] = [];
      }
    });
  }
  
  // Alle Features aktivieren
  function enableAllFeatures(): void {
    usePiniaAuth.value = true;
    usePiniaSessions.value = true;
    usePiniaUI.value = true;
    usePiniaSettings.value = true;
    useNewUIComponents.value = true;
    useToastNotifications.value = true;
    useModernSidebar.value = true;
    useNewAdminPanel.value = true;
    useDarkMode.value = true;
    useThemeCustomization.value = true;
    useLegacyBridge.value = true;
    useModernDocConverter.value = true;
    
    // Auch die SFC-Features aktivieren
    enableAllSfcFeatures();
  }
  
  // Für Migration: Nur Core-Features aktivieren
  function enableCoreFeatures(): void {
    usePiniaAuth.value = true;
    usePiniaSessions.value = true;
    usePiniaUI.value = true;
    usePiniaSettings.value = true;
    useLegacyBridge.value = true;
    
    // UI-Features deaktivieren
    useNewUIComponents.value = false;
    useModernSidebar.value = false;
    useNewAdminPanel.value = false;
    useModernDocConverter.value = false;
    
    // SFC-Features deaktivieren
    disableAllSfcFeatures();
  }
  
  // Legacy-Modus aktivieren (für Fallback)
  function enableLegacyMode(): void {
    usePiniaAuth.value = false;
    usePiniaSessions.value = false;
    usePiniaUI.value = false;
    usePiniaSettings.value = false;
    useNewUIComponents.value = false;
    useModernSidebar.value = false;
    useNewAdminPanel.value = false;
    useModernDocConverter.value = false;
    
    // SFC-Features deaktivieren
    disableAllSfcFeatures();
    
    // Bridge trotzdem aktiv lassen für progressive Migration
    useLegacyBridge.value = true;
  }
  
  /**
   * Lädt Feature Toggles vom API-Server
   */
  async function loadFeatureToggles(): Promise<boolean> {
    try {
      // API-Aufruf simulieren oder echten API-Call durchführen
      console.log('Loading feature toggles from API...');

      // In der echten Implementierung:
      // const response = await axios.get('/api/features');
      // configureFeatures(response.data.features);

      // Hier nur Beispiel-Implementation
      return true;
    } catch (error) {
      console.error('Fehler beim Laden der Feature-Toggles:', error);
      return false;
    }
  }

  /**
   * Setzt Fallback-Features, wenn API-Call fehlschlägt
   */
  function setFallbackFeatures(): void {
    // Sicherstellen, dass kritische Features aktiviert sind
    usePiniaAuth.value = true;
    usePiniaSessions.value = true;
    usePiniaUI.value = true;
    usePiniaSettings.value = true;

    // Moderne UI-Features aktivieren
    useNewUIComponents.value = true;
    useToastNotifications.value = true;

    // Legacy-Bridge für Übergangszeitraum aktivieren
    useLegacyBridge.value = true;

    // Abhängig von der Phase der Migration können SFC-Features aktiviert werden
    useSfcAdmin.value = true; // Admin-Bereich ist bereits migriert
  }

  /**
   * Aktualisiert die Features vom Server
   */
  async function refreshFeatures(): Promise<boolean> {
    return loadFeatureToggles();
  }

  /**
   * Prüft ob ein Feature aktiviert ist
   */
  function isFeatureEnabled(featureName: string): boolean {
    return isEnabled(featureName);
  }

  /**
   * Ermittelt die Fallback-Route für ein Feature
   */
  function getFeatureFallbackRoute(featureName: string): string | null {
    // Mapping von Features zu Fallback-Routen
    const fallbackRoutes: Record<string, string> = {
      'useSfcChat': '/',
      'useSfcDocConverter': '/documents-legacy',
      'useSfcAdmin': '/admin-legacy',
      'useSfcSettings': '/settings-legacy'
    };

    return fallbackRoutes[featureName] || null;
  }

  /**
   * Prüft, ob ein Feature vollständig geladen ist
   */
  const isLoaded = ref<boolean>(false);

  return {
    // State
    version,
    usePiniaAuth,
    usePiniaSessions,
    usePiniaUI,
    usePiniaSettings,
    useNewUIComponents,
    useToastNotifications,
    useModernSidebar,
    useNewAdminPanel,
    uiComponentsDemo,
    useDarkMode,
    useThemeCustomization,
    useLegacyBridge,
    migrateLocalStorage,
    useModernDocConverter,
    isLoaded,

    // SFC-Migration Features
    useSfcDocConverter,
    useSfcAdmin,
    useSfcChat,
    useSfcSettings,

    // Fehler-Tracking
    errors,
    activeFallbacks,
    featureConfigs,

    // Getters
    areAllStoresEnabled,
    isLegacyModeActive,
    areSfcFeaturesEnabled,
    getFeatureStatus,
    allFeatureConfigs,

    // Fehler- und Fallback-Verwaltung
    reportFeatureError,
    clearFeatureErrors,
    isFallbackActive,
    setFallbackMode,
    isFeatureAvailableForRole,
    areDependenciesSatisfied,

    // Feature-Management
    toggleFeature,
    isEnabled,
    isFeatureEnabled,
    setFeature,
    enableFeature,
    disableFeature,
    configureFeatures,

    // API-Integration
    loadFeatureToggles,
    refreshFeatures,
    setFallbackFeatures,
    getFeatureFallbackRoute,

    // Modus-Verwaltung
    enableAllFeatures,
    enableCoreFeatures,
    enableLegacyMode,
    enableAllSfcFeatures,
    disableAllSfcFeatures
  };
}, {
  persist: {
    storage: localStorage,
    paths: [
      'version',
      'usePiniaAuth',
      'usePiniaSessions',
      'usePiniaUI',
      'usePiniaSettings',
      'useNewUIComponents',
      'useToastNotifications',
      'useModernSidebar',
      'useNewAdminPanel',
      'uiComponentsDemo',
      'useDarkMode',
      'useThemeCustomization',
      'useLegacyBridge',
      'migrateLocalStorage',
      'useModernDocConverter',
      // SFC-Migration Features
      'useSfcDocConverter',
      'useSfcAdmin',
      'useSfcChat',
      'useSfcSettings',
      // Fallback-Status auch persistieren
      'activeFallbacks'
    ],
    beforeRestore: (context) => {
      // Sicherheits-Callback vor der Wiederherstellung
      // Fehlende Features könnten bei Updates auf neue Version zu Problemen führen
      console.log('Wiederherstellung von Feature-Toggles aus localStorage...');
      
      try {
        // Minimal erforderliche Version prüfen
        const storedVersion = parseInt(localStorage.getItem('featureToggles')?.version || '0');
        if (storedVersion < 2) {
          console.warn('Veraltete Feature-Toggle-Version gefunden, setze auf Standardwerte zurück');
          return false; // Keine Wiederherstellung durchführen
        }
      } catch (e) {
        console.error('Fehler bei der Validierung gespeicherter Feature-Toggles:', e);
        return false; // Keine Wiederherstellung durchführen
      }
      
      return true; // Normale Wiederherstellung durchführen
    },
    afterRestore: (context) => {
      // Nach der Wiederherstellung werden abhängige Features geprüft
      // und ggf. korrigiert
      console.log('Feature-Toggles wiederhergestellt, prüfe Abhängigkeiten...');
      
      // Alle SFC-Features auf Abhängigkeiten prüfen
      Object.entries(context.store.featureConfigs)
        .filter(([key]) => key.startsWith('useSfc'))
        .forEach(([key, config]) => {
          if (context.store.isEnabled(key) && !context.store.areDependenciesSatisfied(key)) {
            console.warn(`Feature ${key} aktiviert, aber Abhängigkeiten nicht erfüllt. Feature wird deaktiviert.`);
            context.store[key as keyof typeof context.store] = false;
          }
        });
    }
  }
});