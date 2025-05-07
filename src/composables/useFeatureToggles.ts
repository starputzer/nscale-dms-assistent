import { computed } from 'vue';
import { useFeatureTogglesStore } from '../stores/featureToggles';

/**
 * Feature Toggle Komposable
 * 
 * Stellt eine vereinfachte API zum Feature Toggle Store bereit,
 * um Features in Komponenten einfach aktivieren/deaktivieren zu können.
 */
export function useFeatureToggles() {
  const featureStore = useFeatureTogglesStore();
  
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
  
  // Kombinierte Feature-Statusindikatoren
  const allStoresEnabled = computed(() => featureStore.areAllStoresEnabled);
  const legacyModeActive = computed(() => featureStore.isLegacyModeActive);
  
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
    
    // Kombinierte Statuswerte
    allStoresEnabled,
    legacyModeActive,
    
    // Feature Management Funktionen
    isEnabled: (feature: string) => featureStore.isEnabled(feature),
    toggleFeature: (feature: string) => featureStore.toggleFeature(feature),
    enableFeature: (feature: string) => featureStore.enableFeature(feature),
    disableFeature: (feature: string) => featureStore.disableFeature(feature),
    
    // Modus-Wechselfunktionen
    enableAll: () => featureStore.enableAllFeatures(),
    enableCoreOnly: () => featureStore.enableCoreFeatures(),
    enableLegacyMode: () => featureStore.enableLegacyMode(),
    
    // Direkte Konfiguration
    configure: (config: Record<string, boolean>) => featureStore.configureFeatures(config)
  };
}