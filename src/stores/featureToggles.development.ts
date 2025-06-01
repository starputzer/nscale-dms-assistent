import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { DEFAULT_FEATURE_TOGGLES } from "@/config/default-feature-toggles";
import type {
  FeatureToggleError,
  FeatureToggleStatus,
  FeatureConfig,
  FeatureToggleRole,
} from "@/types/featureToggles";

/**
 * Development Feature Toggle Store
 * 
 * This store is used during development and provides all the feature toggles
 * that the application needs for the SFC migration and other features.
 */
export const useFeatureTogglesStore = defineStore("featureToggles", () => {
  // Initialize all features from DEFAULT_FEATURE_TOGGLES
  const features = ref({ ...DEFAULT_FEATURE_TOGGLES });
  
  // Error tracking
  const errors = ref<Record<string, FeatureToggleError[]>>({});
  const fallbackStates = ref<Record<string, boolean>>({});
  
  // Feature status tracking
  const featureStatus = ref<Record<string, FeatureToggleStatus>>({});
  
  // Initialize feature status for all features
  Object.keys(DEFAULT_FEATURE_TOGGLES).forEach(key => {
    featureStatus.value[key] = {
      enabled: features.value[key as keyof typeof DEFAULT_FEATURE_TOGGLES],
      lastChecked: new Date(),
      errorCount: 0,
      fallbackActive: false
    };
  });

  // Feature configuration
  const allFeatureConfigs = computed(() => {
    const configs: Record<string, FeatureConfig> = {};
    
    Object.keys(features.value).forEach(key => {
      let group = 'experimentalFeatures';
      let description = key;
      let requiredRole: FeatureToggleRole = 'user';
      
      // Categorize features
      if (key.startsWith('useSfc')) {
        group = 'sfcMigration';
        description = `SFC Migration: ${key.replace('useSfc', '')}`;
      } else if (key.startsWith('usePinia')) {
        group = 'coreFeatures';
        description = `Pinia Store: ${key.replace('usePinia', '')}`;
      } else if (key.includes('UI') || key.includes('Component')) {
        group = 'uiFeatures';
        description = `UI Feature: ${key}`;
      }
      
      // Admin features require admin role
      if (key.includes('Admin')) {
        requiredRole = 'admin';
      }
      
      configs[key] = {
        name: key,
        description,
        enabled: features.value[key as keyof typeof features.value],
        group,
        requiredRole,
        dependencies: [],
        status: featureStatus.value[key]
      };
    });
    
    return configs;
  });

  // Getters for specific features (for backwards compatibility)
  const usePiniaAuth = computed({
    get: () => features.value.usePiniaAuth,
    set: (value: boolean) => { features.value.usePiniaAuth = value; }
  });
  
  const usePiniaSessions = computed({
    get: () => features.value.usePiniaSessions,
    set: (value: boolean) => { features.value.usePiniaSessions = value; }
  });
  
  const usePiniaUI = computed({
    get: () => features.value.usePiniaUI,
    set: (value: boolean) => { features.value.usePiniaUI = value; }
  });
  
  const usePiniaSettings = computed({
    get: () => features.value.usePiniaSettings,
    set: (value: boolean) => { features.value.usePiniaSettings = value; }
  });
  
  const useNewUIComponents = computed({
    get: () => features.value.useNewUIComponents,
    set: (value: boolean) => { features.value.useNewUIComponents = value; }
  });
  
  const useDarkMode = computed({
    get: () => features.value.useDarkMode,
    set: (value: boolean) => { features.value.useDarkMode = value; }
  });
  
  const useLegacyBridge = computed({
    get: () => features.value.useLegacyBridge,
    set: (value: boolean) => { features.value.useLegacyBridge = value; }
  });
  
  const useModernDocConverter = computed({
    get: () => features.value.useModernDocConverter,
    set: (value: boolean) => { features.value.useModernDocConverter = value; }
  });

  // SFC Migration Features
  const useSfcDocConverter = computed({
    get: () => features.value.useSfcDocConverter,
    set: (value: boolean) => { features.value.useSfcDocConverter = value; }
  });
  
  const useSfcAdmin = computed({
    get: () => features.value.useSfcAdmin,
    set: (value: boolean) => { features.value.useSfcAdmin = value; }
  });
  
  const useSfcChat = computed({
    get: () => features.value.useSfcChat,
    set: (value: boolean) => { features.value.useSfcChat = value; }
  });
  
  const useSfcSettings = computed({
    get: () => features.value.useSfcSettings,
    set: (value: boolean) => { features.value.useSfcSettings = value; }
  });

  // UI Base Components
  const useSfcUIButton = computed({
    get: () => features.value.useSfcUIButton,
    set: (value: boolean) => { features.value.useSfcUIButton = value; }
  });
  
  const useSfcUIInput = computed({
    get: () => features.value.useSfcUIInput,
    set: (value: boolean) => { features.value.useSfcUIInput = value; }
  });
  
  const useSfcUIBadge = computed({
    get: () => features.value.useSfcUIBadge,
    set: (value: boolean) => { features.value.useSfcUIBadge = value; }
  });
  
  const useSfcUITooltip = computed({
    get: () => features.value.useSfcUITooltip,
    set: (value: boolean) => { features.value.useSfcUITooltip = value; }
  });
  
  const useSfcUICard = computed({
    get: () => features.value.useSfcUICard,
    set: (value: boolean) => { features.value.useSfcUICard = value; }
  });
  
  const useSfcUIAlert = computed({
    get: () => features.value.useSfcUIAlert,
    set: (value: boolean) => { features.value.useSfcUIAlert = value; }
  });
  
  const useSfcUIToggle = computed({
    get: () => features.value.useSfcUIToggle,
    set: (value: boolean) => { features.value.useSfcUIToggle = value; }
  });
  
  const useSfcUITextArea = computed({
    get: () => features.value.useSfcUITextArea,
    set: (value: boolean) => { features.value.useSfcUITextArea = value; }
  });
  
  const useSfcUIProgressBar = computed({
    get: () => features.value.useSfcUIProgressBar,
    set: (value: boolean) => { features.value.useSfcUIProgressBar = value; }
  });
  
  const useSfcUICheckbox = computed({
    get: () => features.value.useSfcUICheckbox,
    set: (value: boolean) => { features.value.useSfcUICheckbox = value; }
  });
  
  const useSfcUIRadio = computed({
    get: () => features.value.useSfcUIRadio,
    set: (value: boolean) => { features.value.useSfcUIRadio = value; }
  });
  
  const useSfcUISelect = computed({
    get: () => features.value.useSfcUISelect,
    set: (value: boolean) => { features.value.useSfcUISelect = value; }
  });
  
  const useSfcUIModal = computed({
    get: () => features.value.useSfcUIModal,
    set: (value: boolean) => { features.value.useSfcUIModal = value; }
  });

  // Chat Components
  const useSfcChatMessageItem = computed({
    get: () => features.value.useSfcChatMessageItem,
    set: (value: boolean) => { features.value.useSfcChatMessageItem = value; }
  });
  
  const useSfcChatMessageList = computed({
    get: () => features.value.useSfcChatMessageList,
    set: (value: boolean) => { features.value.useSfcChatMessageList = value; }
  });
  
  const useSfcChatInput = computed({
    get: () => features.value.useSfcChatInput,
    set: (value: boolean) => { features.value.useSfcChatInput = value; }
  });
  
  const useSfcChatMessageInput = computed({
    get: () => features.value.useSfcChatMessageInput,
    set: (value: boolean) => { features.value.useSfcChatMessageInput = value; }
  });
  
  const useSfcSessionItem = computed({
    get: () => features.value.useSfcSessionItem,
    set: (value: boolean) => { features.value.useSfcSessionItem = value; }
  });
  
  const useSfcSessionList = computed({
    get: () => features.value.useSfcSessionList,
    set: (value: boolean) => { features.value.useSfcSessionList = value; }
  });
  
  const useSfcChatContainer = computed({
    get: () => features.value.useSfcChatContainer,
    set: (value: boolean) => { features.value.useSfcChatContainer = value; }
  });
  
  const useSfcEnhancedChatContainer = computed({
    get: () => features.value.useSfcEnhancedChatContainer,
    set: (value: boolean) => { features.value.useSfcEnhancedChatContainer = value; }
  });

  // Admin Components
  const useSfcAdminPanel = computed({
    get: () => features.value.useSfcAdminPanel,
    set: (value: boolean) => { features.value.useSfcAdminPanel = value; }
  });
  
  const useSfcAdminUsers = computed({
    get: () => features.value.useSfcAdminUsers,
    set: (value: boolean) => { features.value.useSfcAdminUsers = value; }
  });
  
  const useSfcAdminFeedback = computed({
    get: () => features.value.useSfcAdminFeedback,
    set: (value: boolean) => { features.value.useSfcAdminFeedback = value; }
  });
  
  const useSfcAdminMotd = computed({
    get: () => features.value.useSfcAdminMotd,
    set: (value: boolean) => { features.value.useSfcAdminMotd = value; }
  });
  
  const useSfcAdminSystem = computed({
    get: () => features.value.useSfcAdminSystem,
    set: (value: boolean) => { features.value.useSfcAdminSystem = value; }
  });
  
  const useSfcAdminStatistics = computed({
    get: () => features.value.useSfcAdminStatistics,
    set: (value: boolean) => { features.value.useSfcAdminStatistics = value; }
  });
  
  const useSfcAdminSystemSettings = computed({
    get: () => features.value.useSfcAdminSystemSettings,
    set: (value: boolean) => { features.value.useSfcAdminSystemSettings = value; }
  });
  
  const useSfcAdminFeatureToggles = computed({
    get: () => features.value.useSfcAdminFeatureToggles,
    set: (value: boolean) => { features.value.useSfcAdminFeatureToggles = value; }
  });
  
  const useSfcAdminLogViewer = computed({
    get: () => features.value.useSfcAdminLogViewer,
    set: (value: boolean) => { features.value.useSfcAdminLogViewer = value; }
  });

  // Document Converter Components
  const useSfcDocConverterContainer = computed({
    get: () => features.value.useSfcDocConverterContainer,
    set: (value: boolean) => { features.value.useSfcDocConverterContainer = value; }
  });
  
  const useSfcDocConverterFileUpload = computed({
    get: () => features.value.useSfcDocConverterFileUpload,
    set: (value: boolean) => { features.value.useSfcDocConverterFileUpload = value; }
  });
  
  const useSfcDocConverterBatchUpload = computed({
    get: () => features.value.useSfcDocConverterBatchUpload,
    set: (value: boolean) => { features.value.useSfcDocConverterBatchUpload = value; }
  });
  
  const useSfcDocConverterProgress = computed({
    get: () => features.value.useSfcDocConverterProgress,
    set: (value: boolean) => { features.value.useSfcDocConverterProgress = value; }
  });
  
  const useSfcDocConverterResult = computed({
    get: () => features.value.useSfcDocConverterResult,
    set: (value: boolean) => { features.value.useSfcDocConverterResult = value; }
  });
  
  const useSfcDocConverterList = computed({
    get: () => features.value.useSfcDocConverterList,
    set: (value: boolean) => { features.value.useSfcDocConverterList = value; }
  });
  
  const useSfcDocConverterPreview = computed({
    get: () => features.value.useSfcDocConverterPreview,
    set: (value: boolean) => { features.value.useSfcDocConverterPreview = value; }
  });
  
  const useSfcDocConverterStats = computed({
    get: () => features.value.useSfcDocConverterStats,
    set: (value: boolean) => { features.value.useSfcDocConverterStats = value; }
  });
  
  const useSfcDocConverterErrorDisplay = computed({
    get: () => features.value.useSfcDocConverterErrorDisplay,
    set: (value: boolean) => { features.value.useSfcDocConverterErrorDisplay = value; }
  });

  // Computed status indicators
  const areAllStoresEnabled = computed(() => 
    features.value.usePiniaAuth && 
    features.value.usePiniaSessions && 
    features.value.usePiniaUI && 
    features.value.usePiniaSettings
  );
  
  const isLegacyModeActive = computed(() => 
    !features.value.useNewUIComponents && 
    features.value.useLegacyBridge
  );
  
  const areSfcFeaturesEnabled = computed(() => 
    features.value.useSfcDocConverter || 
    features.value.useSfcAdmin || 
    features.value.useSfcChat || 
    features.value.useSfcSettings
  );

  // Actions
  function isEnabled(featureName: string): boolean {
    return features.value[featureName as keyof typeof features.value] ?? false;
  }
  
  function toggleFeature(featureName: string): void {
    if (featureName in features.value) {
      features.value[featureName as keyof typeof features.value] = 
        !features.value[featureName as keyof typeof features.value];
    }
  }
  
  function enableFeature(featureName: string): void {
    if (featureName in features.value) {
      features.value[featureName as keyof typeof features.value] = true;
    }
  }
  
  function disableFeature(featureName: string): void {
    if (featureName in features.value) {
      features.value[featureName as keyof typeof features.value] = false;
    }
  }
  
  function getFeatureStatus(name: string): FeatureToggleStatus {
    return featureStatus.value[name] || {
      enabled: false,
      lastChecked: new Date(),
      errorCount: 0,
      fallbackActive: false
    };
  }
  
  function isFeatureAvailableForRole(featureName: string, role: FeatureToggleRole): boolean {
    const config = allFeatureConfigs.value[featureName];
    if (!config) return false;
    
    if (config.requiredRole === 'admin' && role !== 'admin') {
      return false;
    }
    
    return true;
  }
  
  // Error and fallback handling
  function reportFeatureError(
    featureName: string, 
    message: string, 
    details?: any, 
    activateFallback = true
  ): void {
    if (!errors.value[featureName]) {
      errors.value[featureName] = [];
    }
    
    const error: FeatureToggleError = {
      feature: featureName,
      message,
      timestamp: new Date(),
      details,
      fallbackActive: activateFallback
    };
    
    errors.value[featureName].push(error);
    
    if (activateFallback) {
      fallbackStates.value[featureName] = true;
      if (featureStatus.value[featureName]) {
        featureStatus.value[featureName].fallbackActive = true;
        featureStatus.value[featureName].errorCount++;
      }
    }
  }
  
  function isFallbackActive(featureName: string): boolean {
    return fallbackStates.value[featureName] ?? false;
  }
  
  function setFallbackMode(featureName: string, active: boolean): void {
    fallbackStates.value[featureName] = active;
    if (featureStatus.value[featureName]) {
      featureStatus.value[featureName].fallbackActive = active;
    }
  }
  
  function clearFeatureErrors(featureName: string): void {
    delete errors.value[featureName];
    if (featureStatus.value[featureName]) {
      featureStatus.value[featureName].errorCount = 0;
    }
  }
  
  // Bulk operations
  function enableAllFeatures(): void {
    Object.keys(features.value).forEach(key => {
      features.value[key as keyof typeof features.value] = true;
    });
  }
  
  function enableCoreFeatures(): void {
    features.value.usePiniaAuth = true;
    features.value.usePiniaSessions = true;
    features.value.usePiniaUI = true;
    features.value.usePiniaSettings = true;
    features.value.useNewUIComponents = true;
  }
  
  function enableLegacyMode(): void {
    // Disable all new features
    Object.keys(features.value).forEach(key => {
      if (key.startsWith('useSfc') || key === 'useNewUIComponents') {
        features.value[key as keyof typeof features.value] = false;
      }
    });
    // Enable legacy bridge
    features.value.useLegacyBridge = true;
  }
  
  function enableAllSfcFeatures(): void {
    Object.keys(features.value).forEach(key => {
      if (key.startsWith('useSfc')) {
        features.value[key as keyof typeof features.value] = true;
      }
    });
  }
  
  function disableAllSfcFeatures(): void {
    Object.keys(features.value).forEach(key => {
      if (key.startsWith('useSfc')) {
        features.value[key as keyof typeof features.value] = false;
      }
    });
  }
  
  function enableAllUIBaseComponents(): void {
    Object.keys(features.value).forEach(key => {
      if (key.startsWith('useSfcUI')) {
        features.value[key as keyof typeof features.value] = true;
      }
    });
  }
  
  function disableAllUIBaseComponents(): void {
    Object.keys(features.value).forEach(key => {
      if (key.startsWith('useSfcUI')) {
        features.value[key as keyof typeof features.value] = false;
      }
    });
  }
  
  function enableAllChatComponents(): void {
    Object.keys(features.value).forEach(key => {
      if (key.includes('Chat') || key.includes('Session')) {
        features.value[key as keyof typeof features.value] = true;
      }
    });
  }
  
  function disableAllChatComponents(): void {
    Object.keys(features.value).forEach(key => {
      if (key.includes('Chat') || key.includes('Session')) {
        features.value[key as keyof typeof features.value] = false;
      }
    });
  }
  
  function enableAllAdminComponents(): void {
    Object.keys(features.value).forEach(key => {
      if (key.includes('Admin')) {
        features.value[key as keyof typeof features.value] = true;
      }
    });
  }
  
  function disableAllAdminComponents(): void {
    Object.keys(features.value).forEach(key => {
      if (key.includes('Admin')) {
        features.value[key as keyof typeof features.value] = false;
      }
    });
  }
  
  function enableAllDocConverterComponents(): void {
    Object.keys(features.value).forEach(key => {
      if (key.includes('DocConverter')) {
        features.value[key as keyof typeof features.value] = true;
      }
    });
  }
  
  function disableAllDocConverterComponents(): void {
    Object.keys(features.value).forEach(key => {
      if (key.includes('DocConverter')) {
        features.value[key as keyof typeof features.value] = false;
      }
    });
  }
  
  function configureFeatures(config: Record<string, boolean>): void {
    Object.entries(config).forEach(([key, value]) => {
      if (key in features.value) {
        features.value[key as keyof typeof features.value] = value;
      }
    });
  }
  
  // Loading state
  const isLoaded = ref(true); // Always loaded for development
  
  // Mock API loading function
  async function loadFeatureToggles(): Promise<void> {
    // In development, features are already loaded from DEFAULT_FEATURE_TOGGLES
    // This is just a mock function to satisfy the interface
    console.log('[FeatureToggles] Development mode - features already loaded');
    isLoaded.value = true;
    return Promise.resolve();
  }
  
  // Set fallback features (in dev mode, just enable core features)
  function setFallbackFeatures(): void {
    console.log('[FeatureToggles] Setting fallback features');
    enableCoreFeatures();
    isLoaded.value = true;
  }

  return {
    // Individual feature properties
    usePiniaAuth,
    usePiniaSessions,
    usePiniaUI,
    usePiniaSettings,
    useNewUIComponents,
    useDarkMode,
    useLegacyBridge,
    useModernDocConverter,
    
    // SFC Features
    useSfcDocConverter,
    useSfcAdmin,
    useSfcChat,
    useSfcSettings,
    
    // UI Components
    useSfcUIButton,
    useSfcUIInput,
    useSfcUIBadge,
    useSfcUITooltip,
    useSfcUICard,
    useSfcUIAlert,
    useSfcUIToggle,
    useSfcUITextArea,
    useSfcUIProgressBar,
    useSfcUICheckbox,
    useSfcUIRadio,
    useSfcUISelect,
    useSfcUIModal,
    
    // Chat Components
    useSfcChatMessageItem,
    useSfcChatMessageList,
    useSfcChatInput,
    useSfcChatMessageInput,
    useSfcSessionItem,
    useSfcSessionList,
    useSfcChatContainer,
    useSfcEnhancedChatContainer,
    
    // Admin Components
    useSfcAdminPanel,
    useSfcAdminUsers,
    useSfcAdminFeedback,
    useSfcAdminMotd,
    useSfcAdminSystem,
    useSfcAdminStatistics,
    useSfcAdminSystemSettings,
    useSfcAdminFeatureToggles,
    useSfcAdminLogViewer,
    
    // Document Converter Components
    useSfcDocConverterContainer,
    useSfcDocConverterFileUpload,
    useSfcDocConverterBatchUpload,
    useSfcDocConverterProgress,
    useSfcDocConverterResult,
    useSfcDocConverterList,
    useSfcDocConverterPreview,
    useSfcDocConverterStats,
    useSfcDocConverterErrorDisplay,
    
    // State
    errors,
    allFeatureConfigs,
    
    // Status indicators
    areAllStoresEnabled,
    isLegacyModeActive,
    areSfcFeaturesEnabled,
    
    // Actions
    isEnabled,
    isFeatureEnabled: isEnabled, // Add alias for compatibility
    toggleFeature,
    enableFeature,
    disableFeature,
    getFeatureStatus,
    isFeatureAvailableForRole,
    reportFeatureError,
    isFallbackActive,
    setFallbackMode,
    clearFeatureErrors,
    enableAllFeatures,
    enableCoreFeatures,
    enableLegacyMode,
    enableAllSfcFeatures,
    disableAllSfcFeatures,
    enableAllUIBaseComponents,
    disableAllUIBaseComponents,
    enableAllChatComponents,
    disableAllChatComponents,
    enableAllAdminComponents,
    disableAllAdminComponents,
    enableAllDocConverterComponents,
    disableAllDocConverterComponents,
    configureFeatures,
    
    // Loading and state management
    isLoaded,
    loadFeatureToggles,
    setFallbackFeatures,
  };
});