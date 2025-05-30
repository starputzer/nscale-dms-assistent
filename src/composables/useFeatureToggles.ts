import { computed, onErrorCaptured, ref } from "vue";
import type { WritableComputedRef, Ref } from "vue";
import { unref } from "@vue/runtime-core";
import { useFeatureTogglesStore } from "../stores/featureToggles";
import type {
  FeatureToggleError,
  FeatureToggleStatus,
  FeatureConfig,
  FeatureToggleRole,
} from "../types/featureToggles";
import type { FeatureToggleOptions } from "../utils/composableTypes";

/**
 * Feature Toggle Komposable
 *
 * Stellt eine vereinfachte API zum Feature Toggle Store bereit,
 * um Features in Komponenten einfach aktivieren/deaktivieren zu können.
 *
 * Erweitert für die Vue 3 SFC-Migration mit Unterstützung für Fehlerbehandlung
 * und automatischem Fallback auf Legacy-Implementierungen.
 *
 * @param {FeatureToggleOptions} options - Optionen für das Feature Toggle Composable
 * @returns Objekt mit Feature Toggle Funktionen und reaktiven Eigenschaften
 */
export function useFeatureToggles(options: FeatureToggleOptions = {}) {
  const featureStore = useFeatureTogglesStore();

  // Standard-Optionen
  const {
    autoFallback = true,
    onError,
    userRole = "user",
    debug = false,
  } = options;

  // Fehler im Composable
  const localErrors = ref<FeatureToggleError[]>([]);

  /**
   * Erfasst einen Fehler und ruft ggf. den benutzerdefinierten Fehler-Handler auf
   */
  function handleError(error: FeatureToggleError): void {
    localErrors.value.push(error);

    if (debug) {
      console.error("Feature-Toggle-Fehler in Komponente:", error);
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
    details?: any,
  ): void {
    // Fehler im Store erfassen
    featureStore.reportFeatureError(
      featureName,
      message,
      details,
      autoFallback,
    );

    // Fehler auch lokal erfassen
    const error: FeatureToggleError = {
      feature: featureName,
      message,
      timestamp: new Date(),
      details,
      fallbackActive:
        autoFallback && featureStore.isFallbackActive(featureName),
    };

    handleError(error);
  }

  // Error-Boundary einrichten
  onErrorCaptured((error, instance, info) => {
    // Prüfen, ob der Fehler in einer SFC-Komponente aufgetreten ist
    if (instance && instance.$.vnode && instance.$.vnode.type) {
      const componentName = instance.$.vnode.type.__name || "UnknownComponent";

      // Prüfen, ob es sich um eine SFC-Komponente handelt
      if (componentName.startsWith("Sfc")) {
        // Passenden Feature-Namen ermitteln
        let featureName = "";

        if (componentName.includes("DocConverter")) {
          // Spezifischere Document Converter Komponenten prüfen
          if (componentName.includes("Container")) {
            featureName = "useSfcDocConverterContainer";
          } else if (componentName.includes("FileUpload")) {
            featureName = "useSfcDocConverterFileUpload";
          } else if (componentName.includes("BatchUpload")) {
            featureName = "useSfcDocConverterBatchUpload";
          } else if (componentName.includes("Progress")) {
            featureName = "useSfcDocConverterProgress";
          } else if (componentName.includes("Result")) {
            featureName = "useSfcDocConverterResult";
          } else if (componentName.includes("List")) {
            featureName = "useSfcDocConverterList";
          } else if (componentName.includes("Preview")) {
            featureName = "useSfcDocConverterPreview";
          } else if (componentName.includes("Stats")) {
            featureName = "useSfcDocConverterStats";
          } else if (componentName.includes("ErrorDisplay")) {
            featureName = "useSfcDocConverterErrorDisplay";
          } else {
            // Fallback für allgemeine Document Converter Komponenten
            featureName = "useSfcDocConverter";
          }
        } else if (componentName.includes("Admin")) {
          // Spezifischere Admin-Komponenten prüfen
          if (componentName.includes("Panel")) {
            featureName = "useSfcAdminPanel";
          } else if (componentName.includes("Users")) {
            featureName = "useSfcAdminUsers";
          } else if (componentName.includes("Feedback")) {
            featureName = "useSfcAdminFeedback";
          } else if (componentName.includes("Motd")) {
            featureName = "useSfcAdminMotd";
          } else if (
            componentName.includes("System") &&
            componentName.includes("Settings")
          ) {
            featureName = "useSfcAdminSystemSettings";
          } else if (componentName.includes("System")) {
            featureName = "useSfcAdminSystem";
          } else if (componentName.includes("Statistics")) {
            featureName = "useSfcAdminStatistics";
          } else if (componentName.includes("FeatureToggles")) {
            featureName = "useSfcAdminFeatureToggles";
          } else if (componentName.includes("LogViewer")) {
            featureName = "useSfcAdminLogViewer";
          } else {
            // Fallback für allgemeine Admin-Komponenten
            featureName = "useSfcAdmin";
          }
        } else if (componentName.includes("Chat")) {
          // Spezifischere Chat-Komponenten prüfen
          if (componentName.includes("MessageItem")) {
            featureName = "useSfcChatMessageItem";
          } else if (componentName.includes("MessageList")) {
            featureName = "useSfcChatMessageList";
          } else if (componentName.includes("MessageInput")) {
            featureName = "useSfcChatMessageInput";
          } else if (componentName.includes("ChatInput")) {
            featureName = "useSfcChatInput";
          } else if (componentName.includes("Container")) {
            if (componentName.includes("Enhanced")) {
              featureName = "useSfcEnhancedChatContainer";
            } else {
              featureName = "useSfcChatContainer";
            }
          } else {
            // Fallback für allgemeine Chat-Komponenten
            featureName = "useSfcChat";
          }
        } else if (componentName.includes("Session")) {
          if (componentName.includes("Item")) {
            featureName = "useSfcSessionItem";
          } else if (componentName.includes("List")) {
            featureName = "useSfcSessionList";
          } else {
            // Fallback für allgemeine Session-Komponenten
            featureName = "useSfcChat";
          }
        } else if (componentName.includes("Settings")) {
          featureName = "useSfcSettings";
        }
        // UI-Basiskomponenten
        else if (componentName.includes("Button")) {
          featureName = "useSfcUIButton";
        } else if (componentName.includes("Input")) {
          featureName = "useSfcUIInput";
        } else if (componentName.includes("Badge")) {
          featureName = "useSfcUIBadge";
        } else if (componentName.includes("Tooltip")) {
          featureName = "useSfcUITooltip";
        } else if (componentName.includes("Card")) {
          featureName = "useSfcUICard";
        } else if (componentName.includes("Alert")) {
          featureName = "useSfcUIAlert";
        } else if (componentName.includes("Toggle")) {
          featureName = "useSfcUIToggle";
        } else if (componentName.includes("TextArea")) {
          featureName = "useSfcUITextArea";
        } else if (componentName.includes("ProgressBar")) {
          featureName = "useSfcUIProgressBar";
        } else if (componentName.includes("Checkbox")) {
          featureName = "useSfcUICheckbox";
        } else if (componentName.includes("Radio")) {
          featureName = "useSfcUIRadio";
        } else if (componentName.includes("Select")) {
          featureName = "useSfcUISelect";
        } else if (componentName.includes("Modal")) {
          featureName = "useSfcUIModal";
        }

        if (featureName) {
          reportError(
            featureName,
            `Fehler in SFC-Komponente ${componentName}: ${error instanceof Error ? error.message : String(error)}`,
            { error, info, componentName },
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
  const piniaAuth: WritableComputedRef<boolean> = computed({
    get: () => featureStore.usePiniaAuth,
    set: (value: boolean) => (featureStore.usePiniaAuth = value),
  });

  const piniaSessions: WritableComputedRef<boolean> = computed({
    get: () => featureStore.usePiniaSessions,
    set: (value: boolean) => (featureStore.usePiniaSessions = value),
  });

  const piniaUI: WritableComputedRef<boolean> = computed({
    get: () => featureStore.usePiniaUI,
    set: (value: boolean) => (featureStore.usePiniaUI = value),
  });

  const piniaSettings: WritableComputedRef<boolean> = computed({
    get: () => featureStore.usePiniaSettings,
    set: (value: boolean) => (featureStore.usePiniaSettings = value),
  });

  const uiComponents: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useNewUIComponents,
    set: (value: boolean) => (featureStore.useNewUIComponents = value),
  });

  const darkMode: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useDarkMode,
    set: (value: boolean) => (featureStore.useDarkMode = value),
  });

  const legacyBridge: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useLegacyBridge,
    set: (value: boolean) => (featureStore.useLegacyBridge = value),
  });

  const modernDocConverter: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useModernDocConverter,
    set: (value: boolean) => (featureStore.useModernDocConverter = value),
  });

  // SFC-Migration Feature-Properties
  const sfcDocConverter: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcDocConverter,
    set: (value: boolean) => (featureStore.useSfcDocConverter = value),
  });

  const sfcAdmin: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcAdmin,
    set: (value: boolean) => (featureStore.useSfcAdmin = value),
  });

  const sfcChat: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcChat,
    set: (value: boolean) => (featureStore.useSfcChat = value),
  });

  const sfcSettings: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcSettings,
    set: (value: boolean) => (featureStore.useSfcSettings = value),
  });

  // Chat-Komponenten Feature-Properties
  const sfcChatMessageItem: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcChatMessageItem,
    set: (value: boolean) => (featureStore.useSfcChatMessageItem = value),
  });

  const sfcChatMessageList: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcChatMessageList,
    set: (value: boolean) => (featureStore.useSfcChatMessageList = value),
  });

  const sfcChatInput: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcChatInput,
    set: (value: boolean) => (featureStore.useSfcChatInput = value),
  });

  const sfcChatMessageInput: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcChatMessageInput,
    set: (value: boolean) => (featureStore.useSfcChatMessageInput = value),
  });

  const sfcSessionItem: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcSessionItem,
    set: (value: boolean) => (featureStore.useSfcSessionItem = value),
  });

  const sfcSessionList: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcSessionList,
    set: (value: boolean) => (featureStore.useSfcSessionList = value),
  });

  const sfcChatContainer: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcChatContainer,
    set: (value: boolean) => (featureStore.useSfcChatContainer = value),
  });

  const sfcEnhancedChatContainer: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcEnhancedChatContainer,
    set: (value: boolean) => (featureStore.useSfcEnhancedChatContainer = value),
  });

  // Admin-Komponenten Feature-Properties
  const sfcAdminPanel: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcAdminPanel,
    set: (value: boolean) => (featureStore.useSfcAdminPanel = value),
  });

  // Document Converter Komponenten Feature-Properties
  const sfcDocConverterContainer: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcDocConverterContainer,
    set: (value: boolean) => (featureStore.useSfcDocConverterContainer = value),
  });

  const sfcDocConverterFileUpload: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcDocConverterFileUpload,
    set: (value: boolean) => (featureStore.useSfcDocConverterFileUpload = value),
  });

  const sfcDocConverterBatchUpload: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcDocConverterBatchUpload,
    set: (value: boolean) => (featureStore.useSfcDocConverterBatchUpload = value),
  });

  const sfcDocConverterProgress: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcDocConverterProgress,
    set: (value: boolean) => (featureStore.useSfcDocConverterProgress = value),
  });

  const sfcDocConverterResult: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcDocConverterResult,
    set: (value: boolean) => (featureStore.useSfcDocConverterResult = value),
  });

  const sfcDocConverterList: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcDocConverterList,
    set: (value: boolean) => (featureStore.useSfcDocConverterList = value),
  });

  const sfcDocConverterPreview: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcDocConverterPreview,
    set: (value: boolean) => (featureStore.useSfcDocConverterPreview = value),
  });

  const sfcDocConverterStats: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcDocConverterStats,
    set: (value: boolean) => (featureStore.useSfcDocConverterStats = value),
  });

  const sfcDocConverterErrorDisplay: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcDocConverterErrorDisplay,
    set: (value: boolean) => (featureStore.useSfcDocConverterErrorDisplay = value),
  });

  const sfcAdminUsers: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcAdminUsers,
    set: (value: boolean) => (featureStore.useSfcAdminUsers = value),
  });

  const sfcAdminFeedback: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcAdminFeedback,
    set: (value: boolean) => (featureStore.useSfcAdminFeedback = value),
  });

  const sfcAdminMotd: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcAdminMotd,
    set: (value: boolean) => (featureStore.useSfcAdminMotd = value),
  });

  const sfcAdminSystem: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcAdminSystem,
    set: (value: boolean) => (featureStore.useSfcAdminSystem = value),
  });

  const sfcAdminStatistics: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcAdminStatistics,
    set: (value: boolean) => (featureStore.useSfcAdminStatistics = value),
  });

  const sfcAdminSystemSettings: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcAdminSystemSettings,
    set: (value: boolean) => (featureStore.useSfcAdminSystemSettings = value),
  });

  const sfcAdminFeatureToggles: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcAdminFeatureToggles,
    set: (value: boolean) => (featureStore.useSfcAdminFeatureToggles = value),
  });

  const sfcAdminLogViewer: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcAdminLogViewer,
    set: (value: boolean) => (featureStore.useSfcAdminLogViewer = value),
  });

  // UI-Komponenten Feature-Properties
  const sfcUIButton: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcUIButton,
    set: (value: boolean) => (featureStore.useSfcUIButton = value),
  });

  const sfcUIInput: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcUIInput,
    set: (value: boolean) => (featureStore.useSfcUIInput = value),
  });

  const sfcUIBadge: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcUIBadge,
    set: (value: boolean) => (featureStore.useSfcUIBadge = value),
  });

  const sfcUITooltip: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcUITooltip,
    set: (value: boolean) => (featureStore.useSfcUITooltip = value),
  });

  const sfcUICard: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcUICard,
    set: (value: boolean) => (featureStore.useSfcUICard = value),
  });

  const sfcUIAlert: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcUIAlert,
    set: (value: boolean) => (featureStore.useSfcUIAlert = value),
  });

  const sfcUIToggle: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcUIToggle,
    set: (value: boolean) => (featureStore.useSfcUIToggle = value),
  });

  const sfcUITextArea: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcUITextArea,
    set: (value: boolean) => (featureStore.useSfcUITextArea = value),
  });

  const sfcUIProgressBar: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcUIProgressBar,
    set: (value: boolean) => (featureStore.useSfcUIProgressBar = value),
  });

  const sfcUICheckbox: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcUICheckbox,
    set: (value: boolean) => (featureStore.useSfcUICheckbox = value),
  });

  const sfcUIRadio: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcUIRadio,
    set: (value: boolean) => (featureStore.useSfcUIRadio = value),
  });

  const sfcUISelect: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcUISelect,
    set: (value: boolean) => (featureStore.useSfcUISelect = value),
  });

  const sfcUIModal: WritableComputedRef<boolean> = computed({
    get: () => featureStore.useSfcUIModal,
    set: (value: boolean) => (featureStore.useSfcUIModal = value),
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
    const groups: Record<
      string,
      (FeatureConfig & { key: string; status: FeatureToggleStatus })[]
    > = {
      sfcMigration: [],
      uiFeatures: [],
      coreFeatures: [],
      experimentalFeatures: [],
    };

    Object.entries(unref(featureConfigs)).forEach(([key, config]: any) => {
      const group = config.group || "experimentalFeatures";
      groups[group].push({
        ...config,
        key,
        status: config.status,
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
    localErrors.value = localErrors.value.filter(
      (err) => err.feature !== featureName,
    );
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

    // UI Basis-Komponenten
    sfcUIButton,
    sfcUIInput,
    sfcUIBadge,
    sfcUITooltip,
    sfcUICard,
    sfcUIAlert,
    sfcUIToggle,
    sfcUITextArea,
    sfcUIProgressBar,
    sfcUICheckbox,
    sfcUIRadio,
    sfcUISelect,
    sfcUIModal,

    // Chat-Komponenten
    sfcChatMessageItem,
    sfcChatMessageList,
    sfcChatInput,
    sfcChatMessageInput,
    sfcSessionItem,
    sfcSessionList,
    sfcChatContainer,
    sfcEnhancedChatContainer,

    // Admin-Komponenten
    sfcAdminPanel,
    sfcAdminUsers,
    sfcAdminFeedback,
    sfcAdminMotd,
    sfcAdminSystem,
    sfcAdminStatistics,
    sfcAdminSystemSettings,
    sfcAdminFeatureToggles,
    sfcAdminLogViewer,

    // Document Converter Komponenten
    sfcDocConverterContainer,
    sfcDocConverterFileUpload,
    sfcDocConverterBatchUpload,
    sfcDocConverterProgress,
    sfcDocConverterResult,
    sfcDocConverterList,
    sfcDocConverterPreview,
    sfcDocConverterStats,
    sfcDocConverterErrorDisplay,

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
    enableAllUIBaseComponents: () => featureStore.enableAllUIBaseComponents(),
    disableAllUIBaseComponents: () => featureStore.disableAllUIBaseComponents(),
    enableAllChatComponents: () => featureStore.enableAllChatComponents(),
    disableAllChatComponents: () => featureStore.disableAllChatComponents(),
    enableAllAdminComponents: () => featureStore.enableAllAdminComponents(),
    disableAllAdminComponents: () => featureStore.disableAllAdminComponents(),
    enableAllDocConverterComponents: () =>
      featureStore.enableAllDocConverterComponents(),
    disableAllDocConverterComponents: () =>
      featureStore.disableAllDocConverterComponents(),

    // Direkte Konfiguration
    configure: (config: Record<string, boolean>) =>
      featureStore.configureFeatures(config),
  };
}
