import { computed, onErrorCaptured, ref } from "vue";
import type { WritableComputedRef } from "vue";
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

  // Get computed properties directly from store
  const piniaAuth = featureStore.usePiniaAuth;

  const piniaSessions = featureStore.usePiniaSessions;

  const piniaUI = featureStore.usePiniaUI;

  const piniaSettings = featureStore.usePiniaSettings;

  const uiComponents = featureStore.useNewUIComponents;

  const darkMode = featureStore.useDarkMode;

  const legacyBridge = featureStore.useLegacyBridge;

  const modernDocConverter = featureStore.useModernDocConverter;

  // SFC-Migration Feature-Properties
  const sfcDocConverter = featureStore.useSfcDocConverter;

  const sfcAdmin = featureStore.useSfcAdmin;

  const sfcChat = featureStore.useSfcChat;

  const sfcSettings = featureStore.useSfcSettings;

  // Chat-Komponenten Feature-Properties
  const sfcChatMessageItem = featureStore.useSfcChatMessageItem;

  const sfcChatMessageList = featureStore.useSfcChatMessageList;

  const sfcChatInput = featureStore.useSfcChatInput;

  const sfcChatMessageInput = featureStore.useSfcChatMessageInput;

  const sfcSessionItem = featureStore.useSfcSessionItem;

  const sfcSessionList = featureStore.useSfcSessionList;

  const sfcChatContainer = featureStore.useSfcChatContainer;

  const sfcEnhancedChatContainer = featureStore.useSfcEnhancedChatContainer;

  // Admin-Komponenten Feature-Properties
  const sfcAdminPanel = featureStore.useSfcAdminPanel;

  // Document Converter Komponenten Feature-Properties
  const sfcDocConverterContainer = featureStore.useSfcDocConverterContainer;

  const sfcDocConverterFileUpload = featureStore.useSfcDocConverterFileUpload;

  const sfcDocConverterBatchUpload = featureStore.useSfcDocConverterBatchUpload;

  const sfcDocConverterProgress = featureStore.useSfcDocConverterProgress;

  const sfcDocConverterResult = featureStore.useSfcDocConverterResult;

  const sfcDocConverterList = featureStore.useSfcDocConverterList;

  const sfcDocConverterPreview = featureStore.useSfcDocConverterPreview;

  const sfcDocConverterStats = featureStore.useSfcDocConverterStats;

  const sfcDocConverterErrorDisplay = featureStore.useSfcDocConverterErrorDisplay;

  const sfcAdminUsers = featureStore.useSfcAdminUsers;

  const sfcAdminFeedback = featureStore.useSfcAdminFeedback;

  const sfcAdminMotd = featureStore.useSfcAdminMotd;

  const sfcAdminSystem = featureStore.useSfcAdminSystem;

  const sfcAdminStatistics = featureStore.useSfcAdminStatistics;

  const sfcAdminSystemSettings = featureStore.useSfcAdminSystemSettings;

  const sfcAdminFeatureToggles = featureStore.useSfcAdminFeatureToggles;

  const sfcAdminLogViewer = featureStore.useSfcAdminLogViewer;

  // UI-Komponenten Feature-Properties
  const sfcUIButton = featureStore.useSfcUIButton;

  const sfcUIInput = featureStore.useSfcUIInput;

  const sfcUIBadge = featureStore.useSfcUIBadge;

  const sfcUITooltip = featureStore.useSfcUITooltip;

  const sfcUICard = featureStore.useSfcUICard;

  const sfcUIAlert = featureStore.useSfcUIAlert;

  const sfcUIToggle = featureStore.useSfcUIToggle;

  const sfcUITextArea = featureStore.useSfcUITextArea;

  const sfcUIProgressBar = featureStore.useSfcUIProgressBar;

  const sfcUICheckbox = featureStore.useSfcUICheckbox;

  const sfcUIRadio = featureStore.useSfcUIRadio;

  const sfcUISelect = featureStore.useSfcUISelect;

  const sfcUIModal = featureStore.useSfcUIModal;

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
