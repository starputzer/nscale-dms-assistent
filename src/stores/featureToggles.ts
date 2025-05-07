import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * Feature Toggle Store
 * 
 * Verwaltet Feature-Flags für die Anwendung, um Features progressiv zu aktivieren
 * oder zu deaktivieren. Besonders nützlich während der Migration und für A/B-Tests.
 */
export const useFeatureTogglesStore = defineStore('featureToggles', () => {
  // State
  const version = ref<number>(1);
  
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
  
  // Theme Features
  const useDarkMode = ref<boolean>(true);
  const useThemeCustomization = ref<boolean>(true);
  
  // Legacy Integration
  const useLegacyBridge = ref<boolean>(true);
  const migrateLocalStorage = ref<boolean>(true);
  
  // Document Converter Features
  const useModernDocConverter = ref<boolean>(false);
  
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
  
  // Hilfsfunktion zum einfachen Umschalten eines Features
  function toggleFeature(featureName: string): boolean {
    const feature = ref[featureName as keyof typeof ref];
    
    if (typeof feature !== 'undefined' && typeof feature === 'boolean') {
      // @ts-ignore: dynamisches Property-Aktualisieren
      ref[featureName as keyof typeof ref] = !feature;
      
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
  
  // Funktion zum Setzen eines Feature-Status
  function setFeature(featureName: string, enabled: boolean): void {
    const feature = ref[featureName as keyof typeof ref];
    
    if (typeof feature !== 'undefined' && typeof feature === 'boolean') {
      // @ts-ignore: dynamisches Property-Aktualisieren
      ref[featureName as keyof typeof ref] = enabled;
    }
  }
  
  // Funktion zum Aktivieren eines Features
  function enableFeature(featureName: string): void {
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
    
    // Bridge trotzdem aktiv lassen für progressive Migration
    useLegacyBridge.value = true;
  }
  
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
    useDarkMode,
    useThemeCustomization,
    useLegacyBridge,
    migrateLocalStorage,
    useModernDocConverter,
    
    // Getters
    areAllStoresEnabled,
    isLegacyModeActive,
    
    // Actions
    toggleFeature,
    isEnabled,
    setFeature,
    enableFeature,
    disableFeature,
    configureFeatures,
    enableAllFeatures,
    enableCoreFeatures,
    enableLegacyMode
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
      'useDarkMode',
      'useThemeCustomization',
      'useLegacyBridge',
      'migrateLocalStorage',
      'useModernDocConverter'
    ]
  }
});