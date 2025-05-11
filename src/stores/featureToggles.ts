import { defineStore } from "pinia";
import { ref, computed, reactive } from "vue";

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
  | "useSfcDocConverter"
  | "useSfcAdmin"
  | "useSfcChat"
  | "useSfcSettings"
  | "useSfcUIButton"
  | "useSfcUIInput"
  | "useSfcUIBadge"
  | "useSfcUITooltip"
  | "useSfcUICard"
  | "useSfcUIAlert"
  | "useSfcUIToggle"
  | "useSfcUITextArea"
  | "useSfcUIProgressBar"
  | "useSfcUICheckbox"
  | "useSfcUIRadio"
  | "useSfcUISelect"
  | "useSfcUIModal"
  // Chat-Komponenten-Features
  | "useSfcChatMessageItem"
  | "useSfcChatMessageList"
  | "useSfcChatMessageInput"
  | "useSfcChatContainer"
  | "useSfcChatInput"
  | "useSfcSessionItem"
  | "useSfcSessionList"
  | "useSfcEnhancedChatContainer"
  // Admin-Komponenten-Features
  | "useSfcAdminPanel"
  | "useSfcAdminUsers"
  | "useSfcAdminFeedback"
  | "useSfcAdminMotd"
  | "useSfcAdminSystem"
  | "useSfcAdminStatistics"
  | "useSfcAdminSystemSettings"
  | "useSfcAdminFeatureToggles"
  | "useSfcAdminLogViewer"
  // Document Converter Komponenten-Features
  | "useSfcDocConverterContainer"
  | "useSfcDocConverterFileUpload"
  | "useSfcDocConverterBatchUpload"
  | "useSfcDocConverterProgress"
  | "useSfcDocConverterResult"
  | "useSfcDocConverterList"
  | "useSfcDocConverterPreview"
  | "useSfcDocConverterStats"
  | "useSfcDocConverterErrorDisplay";

/**
 * Rolle für Feature-Toggle-Berechtigungen
 */
export type FeatureToggleRole = "admin" | "developer" | "user" | "guest";

/**
 * Feature-Konfiguration mit Metadaten
 */
export interface FeatureConfig {
  /** Name des Features für Anzeige in der UI */
  name: string;
  /** Beschreibung des Features */
  description: string;
  /** Feature-Gruppe für Kategorisierung */
  group:
    | "sfcMigration"
    | "uiFeatures"
    | "coreFeatures"
    | "experimentalFeatures";
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
export const useFeatureTogglesStore = defineStore(
  "featureToggles",
  () => {
    // State
    const version = ref<number>(2); // Erhöht auf 2 wegen der neuen Funktionalität

    // Fehlererfassung und Status
    const errors = reactive<Record<string, FeatureToggleError[]>>({});
    const activeFallbacks = reactive<Record<string, boolean>>({});

    // Feature-Konfigurationen
    const featureConfigs = reactive<Record<string, FeatureConfig>>({
      // UI Features
      uiComponentsDemo: {
        name: "UI Components Demo",
        description: "Demo der UI-Basiskomponenten mit interaktiven Beispielen",
        group: "uiFeatures",
        stable: true,
        requiredRole: "developer",
        hasFallback: false,
        dependencies: ["useNewUIComponents"],
      },
      // SFC-Migration Features
      useSfcDocConverter: {
        name: "SFC Dokumentenkonverter",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung des Dokumentenkonverters",
        group: "sfcMigration",
        stable: false,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["usePiniaAuth", "usePiniaUI"],
      },
      useSfcAdmin: {
        name: "SFC Admin-Bereich",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung des Admin-Bereichs",
        group: "sfcMigration",
        stable: false,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["usePiniaAuth", "usePiniaUI"],
      },
      useSfcChat: {
        name: "SFC Chat-Interface",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung des Chat-Interfaces",
        group: "sfcMigration",
        stable: false,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["usePiniaAuth", "usePiniaUI"],
      },
      useSfcSettings: {
        name: "SFC Einstellungen",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Einstellungen",
        group: "sfcMigration",
        stable: false,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["usePiniaAuth", "usePiniaUI"],
      },
      // UI-Basiskomponenten
      useSfcUIButton: {
        name: "SFC Button-Komponente",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Button-Komponente",
        group: "sfcMigration",
        stable: true, // Stabil und einfach
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useNewUIComponents"],
      },
      useSfcUIInput: {
        name: "SFC Input-Komponente",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Input-Komponente",
        group: "sfcMigration",
        stable: true, // Stabil und einfach
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useNewUIComponents"],
      },
      useSfcUIBadge: {
        name: "SFC Badge-Komponente",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Badge-Komponente",
        group: "sfcMigration",
        stable: true, // Stabil und einfach
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useNewUIComponents"],
      },
      useSfcUITooltip: {
        name: "SFC Tooltip-Komponente",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Tooltip-Komponente",
        group: "sfcMigration",
        stable: true, // Stabil und einfach
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useNewUIComponents"],
      },
      useSfcUICard: {
        name: "SFC Card-Komponente",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Card-Komponente",
        group: "sfcMigration",
        stable: true, // Stabil und einfach
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useNewUIComponents"],
      },
      useSfcUIAlert: {
        name: "SFC Alert-Komponente",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Alert-Komponente",
        group: "sfcMigration",
        stable: true, // Stabil und einfach
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useNewUIComponents"],
      },
      useSfcUIToggle: {
        name: "SFC Toggle-Komponente",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Toggle-Komponente",
        group: "sfcMigration",
        stable: true, // Stabil und einfach
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useNewUIComponents"],
      },
      useSfcUITextArea: {
        name: "SFC TextArea-Komponente",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der TextArea-Komponente",
        group: "sfcMigration",
        stable: true, // Stabil und einfach
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useNewUIComponents"],
      },
      useSfcUIProgressBar: {
        name: "SFC ProgressBar-Komponente",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der ProgressBar-Komponente",
        group: "sfcMigration",
        stable: true, // Stabil und einfach
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useNewUIComponents"],
      },
      useSfcUICheckbox: {
        name: "SFC Checkbox-Komponente",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Checkbox-Komponente",
        group: "sfcMigration",
        stable: true, // Stabil und einfach
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useNewUIComponents"],
      },
      useSfcUIRadio: {
        name: "SFC Radio-Komponente",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Radio-Komponente",
        group: "sfcMigration",
        stable: true, // Stabil und einfach
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useNewUIComponents"],
      },
      useSfcUISelect: {
        name: "SFC Select-Komponente",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Select-Komponente",
        group: "sfcMigration",
        stable: true, // Stabil und einfach
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useNewUIComponents"],
      },
      useSfcUIModal: {
        name: "SFC Modal-Komponente",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Modal-Komponente",
        group: "sfcMigration",
        stable: true, // Stabil aber komplexer
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useNewUIComponents"],
      },

      // Chat-Komponenten - Phase 2
      useSfcChatMessageItem: {
        name: "SFC Chat-Nachricht",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Nachrichten-Anzeigekomponente",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useNewUIComponents", "useSfcUICard", "useSfcUIButton"],
      },
      useSfcChatMessageList: {
        name: "SFC Chat-Nachrichtenliste",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Nachrichtenliste",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcChatMessageItem"],
      },
      useSfcChatInput: {
        name: "SFC Chat-Eingabefeld",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung des Chat-Eingabefelds",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useNewUIComponents", "useSfcUIInput", "useSfcUIButton"],
      },
      useSfcChatMessageInput: {
        name: "SFC Chat-Nachrichteneingabe",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Chat-Nachrichteneingabe",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcChatInput"],
      },
      useSfcSessionItem: {
        name: "SFC Session-Element",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Session-Elemente",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useNewUIComponents", "useSfcUICard", "useSfcUIButton"],
      },
      useSfcSessionList: {
        name: "SFC Session-Liste",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Session-Liste",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcSessionItem"],
      },
      useSfcChatContainer: {
        name: "SFC Chat-Container",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung des Chat-Containers",
        group: "sfcMigration",
        stable: false, // Komplexere Integration
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcChatMessageList", "useSfcChatMessageInput"],
      },
      useSfcEnhancedChatContainer: {
        name: "SFC Erweiterter Chat-Container",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung des erweiterten Chat-Containers",
        group: "sfcMigration",
        stable: false, // Komplexere Integration mit Bridge-System
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcChatContainer", "useSfcSessionList"],
      },

      // Admin-Komponenten - Phase 3
      useSfcAdminPanel: {
        name: "SFC Admin-Panel",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung des Admin-Bereichs Hauptpanels",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useNewUIComponents", "useSfcAdmin", "useSfcUICard"],
      },
      useSfcAdminUsers: {
        name: "SFC Admin-Benutzerverwaltung",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Benutzerverwaltung",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcAdminPanel", "useSfcUIButton", "useSfcUITable"],
      },
      useSfcAdminFeedback: {
        name: "SFC Admin-Feedback",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Feedback-Verwaltung",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcAdminPanel", "useSfcUICard"],
      },
      useSfcAdminMotd: {
        name: "SFC Admin-Nachrichten",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Nachrichtenverwaltung",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcAdminPanel", "useSfcUIInput", "useSfcUITextArea"],
      },
      useSfcAdminSystem: {
        name: "SFC Admin-System",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Systemverwaltung",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcAdminPanel", "useSfcUICard"],
      },
      useSfcAdminStatistics: {
        name: "SFC Admin-Statistiken",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Statistikanzeige",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcAdminPanel", "useSfcUICard"],
      },
      useSfcAdminSystemSettings: {
        name: "SFC Admin-Systemeinstellungen",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Systemeinstellungen",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcAdminPanel", "useSfcUIToggle", "useSfcUIInput"],
      },
      useSfcAdminFeatureToggles: {
        name: "SFC Admin-Feature-Toggles",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Feature-Toggle-Verwaltung",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcAdminPanel", "useSfcUIToggle", "useSfcUICard"],
      },
      useSfcAdminLogViewer: {
        name: "SFC Admin-Log-Viewer",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung des Log-Betrachters",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcAdminPanel", "useSfcUIInput", "useSfcUISelect"],
      },

      // Document Converter Komponenten - Phase 4
      useSfcDocConverterContainer: {
        name: "SFC Dokumentkonverter Container",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung des Dokumentkonverter Containers",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcDocConverter", "useSfcUICard"],
      },
      useSfcDocConverterFileUpload: {
        name: "SFC Datei-Upload",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung des Datei-Uploads",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcDocConverterContainer", "useSfcUIButton"],
      },
      useSfcDocConverterBatchUpload: {
        name: "SFC Batch-Upload",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung des Batch-Uploads",
        group: "sfcMigration",
        stable: false,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcDocConverterContainer", "useSfcUIButton", "useSfcUIProgressBar"],
      },
      useSfcDocConverterProgress: {
        name: "SFC Konvertierungsfortschritt",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Fortschrittsanzeige",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcDocConverterContainer", "useSfcUIProgressBar"],
      },
      useSfcDocConverterResult: {
        name: "SFC Konvertierungsergebnis",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Ergebnisanzeige",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcDocConverterContainer", "useSfcUICard"],
      },
      useSfcDocConverterList: {
        name: "SFC Dokumentenliste",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Dokumentenliste",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcDocConverterContainer", "useSfcUICard"],
      },
      useSfcDocConverterPreview: {
        name: "SFC Dokumentvorschau",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Dokumentvorschau",
        group: "sfcMigration",
        stable: false,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcDocConverterContainer", "useSfcUICard"],
      },
      useSfcDocConverterStats: {
        name: "SFC Konvertierungsstatistiken",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Statistiken",
        group: "sfcMigration",
        stable: false,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcDocConverterContainer"],
      },
      useSfcDocConverterErrorDisplay: {
        name: "SFC Fehleranzeige",
        description:
          "Verwende die neue Vue 3 SFC-Implementierung der Fehleranzeige",
        group: "sfcMigration",
        stable: true,
        requiredRole: "developer",
        hasFallback: true,
        dependencies: ["useSfcDocConverterContainer", "useSfcUIAlert"],
      },
    });

    // Pinia Store Features
    const usePiniaAuth = ref<boolean>(true);
    const usePiniaSessions = ref<boolean>(true);
    const usePiniaUI = ref<boolean>(true);
    const usePiniaSettings = ref<boolean>(true);

    // UI Features
    const useNewUIComponents = ref<boolean>(true); // Aktiviert für UI-Basiskomponenten
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
    const useModernDocConverter = ref<boolean>(true); // Aktiviert für moderne Dokumentkonverter-Funktionalität

    // SFC Migration Features
    const useSfcDocConverter = ref<boolean>(true); // Aktiviert für Dokumentkonverter
    const useSfcAdmin = ref<boolean>(true); // Aktiviert für Admin-Bereich
    const useSfcChat = ref<boolean>(true); // Aktiviert für Chat-Interface
    const useSfcSettings = ref<boolean>(true); // Aktiviert für Einstellungen

    // Chat-Komponenten Features - Phase 2 Aktivierung
    const useSfcChatMessageItem = ref<boolean>(true); // Einfache Anzeigekomponente
    const useSfcChatMessageList = ref<boolean>(true); // Liste von Nachrichten
    const useSfcChatInput = ref<boolean>(true); // Einfache Eingabekomponente
    const useSfcChatMessageInput = ref<boolean>(true); // Erweiterte Eingabe
    const useSfcSessionItem = ref<boolean>(true); // Session-Element
    const useSfcSessionList = ref<boolean>(true); // Liste von Sessions
    const useSfcChatContainer = ref<boolean>(true); // Komplexer Container
    const useSfcEnhancedChatContainer = ref<boolean>(true); // Erweiterter Container mit Bridge

    // Admin-Komponenten Features - Phase 3 Aktivierung
    const useSfcAdminPanel = ref<boolean>(true); // Hauptcontainer des Admin-Bereichs
    const useSfcAdminUsers = ref<boolean>(true); // Benutzer-Verwaltung
    const useSfcAdminFeedback = ref<boolean>(true); // Feedback-Verwaltung
    const useSfcAdminMotd = ref<boolean>(true); // Nachrichten-Verwaltung
    const useSfcAdminSystem = ref<boolean>(true); // System-Tab
    const useSfcAdminStatistics = ref<boolean>(true); // Statistik-Tab mit komplexen Grafiken
    const useSfcAdminSystemSettings = ref<boolean>(true); // Systemeinstellungen-Tab
    const useSfcAdminFeatureToggles = ref<boolean>(true); // Feature-Toggle-Verwaltung
    const useSfcAdminLogViewer = ref<boolean>(true); // Log-Betrachter mit erweiterten Funktionen

    // Document Converter Features - Phase 4 Aktivierung
    const useSfcDocConverterContainer = ref<boolean>(true); // Hauptcontainer des Dokumentenkonverters
    const useSfcDocConverterFileUpload = ref<boolean>(true); // Upload-Komponente für einzelne Dateien
    const useSfcDocConverterBatchUpload = ref<boolean>(true); // Batch-Upload für mehrere Dateien (komplex)
    const useSfcDocConverterProgress = ref<boolean>(true); // Fortschrittsanzeige für Konvertierungen
    const useSfcDocConverterResult = ref<boolean>(true); // Ergebnisanzeige für Konvertierungen
    const useSfcDocConverterList = ref<boolean>(true); // Dokumentenliste
    const useSfcDocConverterPreview = ref<boolean>(true); // Dokumentvorschau (komplex)
    const useSfcDocConverterStats = ref<boolean>(true); // Konvertierungsstatistiken (komplex)
    const useSfcDocConverterErrorDisplay = ref<boolean>(true); // Fehleranzeige für Konvertierungen

    // UI-Basiskomponenten Features - Phase 1 Aktivierung
    const useSfcUIButton = ref<boolean>(true); // Einfache Komponente mit minimalen Abhängigkeiten
    const useSfcUIInput = ref<boolean>(true); // Einfaches Formular-Element
    const useSfcUIBadge = ref<boolean>(true); // Einfache Anzeigekomponente
    const useSfcUITooltip = ref<boolean>(true); // Einfache Overlay-Komponente
    const useSfcUICard = ref<boolean>(true); // Container-Komponente mit einfacher Struktur
    const useSfcUIAlert = ref<boolean>(true); // Benachrichtigungskomponente
    const useSfcUIToggle = ref<boolean>(true); // Formular-Element
    const useSfcUITextArea = ref<boolean>(true); // Textfeld-Komponente
    const useSfcUIProgressBar = ref<boolean>(true); // Fortschrittsanzeige
    const useSfcUICheckbox = ref<boolean>(true); // Checkbox-Komponente
    const useSfcUIRadio = ref<boolean>(true); // Radio-Button-Komponente
    const useSfcUISelect = ref<boolean>(true); // Auswahlfeld-Komponente
    const useSfcUIModal = ref<boolean>(true); // Dialog-Komponente mit komplexerer Funktionalität

    // Public Getters
    const areAllStoresEnabled = computed(
      () =>
        usePiniaAuth.value &&
        usePiniaSessions.value &&
        usePiniaUI.value &&
        usePiniaSettings.value,
    );

    const isLegacyModeActive = computed(
      () =>
        !usePiniaAuth.value ||
        !usePiniaSessions.value ||
        !usePiniaUI.value ||
        !useNewUIComponents.value,
    );

    /**
     * Gibt an, ob alle SFC-Migrationsfeatures aktiviert sind
     */
    const areSfcFeaturesEnabled = computed(
      () =>
        useSfcDocConverter.value &&
        useSfcAdmin.value &&
        useSfcChat.value &&
        useSfcSettings.value,
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
        errors: featureErrors,
      };
    }

    /**
     * Gibt alle verfügbaren Features mit ihren Konfigurationen zurück
     */
    const allFeatureConfigs = computed(() => {
      // Feature-Konfigurationen mit aktuellen Status anreichern
      const result: Record<
        string,
        FeatureConfig & { status: FeatureToggleStatus }
      > = {};

      Object.entries(featureConfigs).forEach(([key, config]) => {
        result[key] = {
          ...config,
          status: getFeatureStatus(key),
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

      return config.dependencies.every((dep) => isEnabled(dep));
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
      activateFallback: boolean = true,
    ): void {
      console.error(
        `Feature-Toggle-Fehler in ${featureName}:`,
        message,
        details,
      );

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
        fallbackActive: activateFallback,
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
      console.warn("Feature-Toggle-Fehler erfasst:", error);
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

      if (typeof feature !== "undefined" && typeof feature === "boolean") {
        // Prüfen, ob Abhängigkeiten erfüllt sind, wenn Feature aktiviert werden soll
        if (!feature && !areDependenciesSatisfied(featureName)) {
          reportFeatureError(
            featureName,
            "Erforderliche Abhängigkeiten sind nicht aktiviert",
            { dependencies: featureConfigs[featureName]?.dependencies },
            false,
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

      if (typeof feature !== "undefined" && typeof feature === "boolean") {
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
    function isFeatureAvailableForRole(
      featureName: string,
      userRole: FeatureToggleRole,
    ): boolean {
      const config = featureConfigs[featureName];
      if (!config) return true; // Wenn keine Konfiguration vorhanden, immer erlauben

      const roleHierarchy: Record<FeatureToggleRole, number> = {
        guest: 0,
        user: 1,
        developer: 2,
        admin: 3,
      };

      return roleHierarchy[userRole] >= roleHierarchy[config.requiredRole];
    }

    // Funktion zum Setzen eines Feature-Status
    function setFeature(featureName: string, enabled: boolean): void {
      const feature = ref[featureName as keyof typeof ref];

      if (typeof feature !== "undefined" && typeof feature === "boolean") {
        // Prüfen, ob Abhängigkeiten erfüllt sind, wenn Feature aktiviert werden soll
        if (enabled && !areDependenciesSatisfied(featureName)) {
          reportFeatureError(
            featureName,
            "Erforderliche Abhängigkeiten sind nicht aktiviert",
            { dependencies: featureConfigs[featureName]?.dependencies },
            false,
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
        dependencies.forEach((dep) => {
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

      // UI-Basiskomponenten aktivieren
      enableAllUIBaseComponents();

      // Chat-Komponenten aktivieren
      enableAllChatComponents();

      // Admin-Komponenten aktivieren
      enableAllAdminComponents();

      // Document Converter Komponenten aktivieren
      enableAllDocConverterComponents();

      // Erforderliche Abhängigkeiten aktivieren
      usePiniaAuth.value = true;
      usePiniaUI.value = true;
    }

    /**
     * Aktiviert alle Chat-Komponenten
     */
    function enableAllChatComponents(): void {
      useSfcChatMessageItem.value = true;
      useSfcChatMessageList.value = true;
      useSfcChatInput.value = true;
      useSfcChatMessageInput.value = true;
      useSfcSessionItem.value = true;
      useSfcSessionList.value = true;
      useSfcChatContainer.value = true;
      useSfcEnhancedChatContainer.value = true;

      // Übergeordnetes Feature aktivieren
      useSfcChat.value = true;

      // Erforderliche Abhängigkeiten sicherstellen
      enableAllUIBaseComponents();
    }

    /**
     * Aktiviert alle UI-Basiskomponenten
     */
    function enableAllUIBaseComponents(): void {
      useSfcUIButton.value = true;
      useSfcUIInput.value = true;
      useSfcUIBadge.value = true;
      useSfcUITooltip.value = true;
      useSfcUICard.value = true;
      useSfcUIAlert.value = true;
      useSfcUIToggle.value = true;
      useSfcUITextArea.value = true;
      useSfcUIProgressBar.value = true;
      useSfcUICheckbox.value = true;
      useSfcUIRadio.value = true;
      useSfcUISelect.value = true;
      useSfcUIModal.value = true;

      // Übergeordnetes Feature aktivieren
      useNewUIComponents.value = true;
    }

    /**
     * Deaktiviert alle UI-Basiskomponenten
     */
    function disableAllUIBaseComponents(): void {
      useSfcUIButton.value = false;
      useSfcUIInput.value = false;
      useSfcUIBadge.value = false;
      useSfcUITooltip.value = false;
      useSfcUICard.value = false;
      useSfcUIAlert.value = false;
      useSfcUIToggle.value = false;
      useSfcUITextArea.value = false;
      useSfcUIProgressBar.value = false;
      useSfcUICheckbox.value = false;
      useSfcUIRadio.value = false;
      useSfcUISelect.value = false;
      useSfcUIModal.value = false;

      // Fallbacks für UI-Komponenten deaktivieren
      Object.keys(activeFallbacks).forEach((feature) => {
        if (feature.startsWith("useSfcUI")) {
          activeFallbacks[feature] = false;
        }
      });

      // Fehler löschen für UI-Komponenten
      Object.keys(errors).forEach((feature) => {
        if (feature.startsWith("useSfcUI")) {
          errors[feature] = [];
        }
      });
    }

    /**
     * Deaktiviert alle Chat-Komponenten
     */
    function disableAllChatComponents(): void {
      useSfcChatMessageItem.value = false;
      useSfcChatMessageList.value = false;
      useSfcChatInput.value = false;
      useSfcChatMessageInput.value = false;
      useSfcSessionItem.value = false;
      useSfcSessionList.value = false;
      useSfcChatContainer.value = false;
      useSfcEnhancedChatContainer.value = false;

      // Übergeordnetes Feature deaktivieren
      useSfcChat.value = false;

      // Fallbacks für Chat-Komponenten deaktivieren
      Object.keys(activeFallbacks).forEach((feature) => {
        if (
          feature.startsWith("useSfcChat") ||
          feature === "useSfcChat" ||
          feature.startsWith("useSfcSession") ||
          feature === "useSfcSession"
        ) {
          activeFallbacks[feature] = false;
        }
      });

      // Fehler löschen für Chat-Komponenten
      Object.keys(errors).forEach((feature) => {
        if (
          feature.startsWith("useSfcChat") ||
          feature === "useSfcChat" ||
          feature.startsWith("useSfcSession") ||
          feature === "useSfcSession"
        ) {
          errors[feature] = [];
        }
      });
    }

    /**
     * Aktiviert alle Admin-Komponenten
     */
    function enableAllAdminComponents(): void {
      useSfcAdminPanel.value = true;
      useSfcAdminUsers.value = true;
      useSfcAdminFeedback.value = true;
      useSfcAdminMotd.value = true;
      useSfcAdminSystem.value = true;
      useSfcAdminStatistics.value = true;
      useSfcAdminSystemSettings.value = true;
      useSfcAdminFeatureToggles.value = true;
      useSfcAdminLogViewer.value = true;

      // Übergeordnetes Feature aktivieren
      useSfcAdmin.value = true;

      // Erforderliche Abhängigkeiten sicherstellen
      enableAllUIBaseComponents();
    }

    /**
     * Deaktiviert alle Admin-Komponenten
     */
    function disableAllAdminComponents(): void {
      useSfcAdminPanel.value = false;
      useSfcAdminUsers.value = false;
      useSfcAdminFeedback.value = false;
      useSfcAdminMotd.value = false;
      useSfcAdminSystem.value = false;
      useSfcAdminStatistics.value = false;
      useSfcAdminSystemSettings.value = false;
      useSfcAdminFeatureToggles.value = false;
      useSfcAdminLogViewer.value = false;

      // Übergeordnetes Feature deaktivieren
      useSfcAdmin.value = false;

      // Fallbacks für Admin-Komponenten deaktivieren
      Object.keys(activeFallbacks).forEach((feature) => {
        if (feature.startsWith("useSfcAdmin") || feature === "useSfcAdmin") {
          activeFallbacks[feature] = false;
        }
      });

      // Fehler löschen für Admin-Komponenten
      Object.keys(errors).forEach((feature) => {
        if (feature.startsWith("useSfcAdmin") || feature === "useSfcAdmin") {
          errors[feature] = [];
        }
      });
    }

    /**
     * Aktiviert alle Document Converter Komponenten
     */
    function enableAllDocConverterComponents(): void {
      useSfcDocConverterContainer.value = true;
      useSfcDocConverterFileUpload.value = true;
      useSfcDocConverterBatchUpload.value = true;
      useSfcDocConverterProgress.value = true;
      useSfcDocConverterResult.value = true;
      useSfcDocConverterList.value = true;
      useSfcDocConverterPreview.value = true;
      useSfcDocConverterStats.value = true;
      useSfcDocConverterErrorDisplay.value = true;

      // Übergeordnetes Feature aktivieren
      useSfcDocConverter.value = true;

      // Erforderliche Abhängigkeiten sicherstellen
      enableAllUIBaseComponents();
    }

    /**
     * Deaktiviert alle Document Converter Komponenten
     */
    function disableAllDocConverterComponents(): void {
      useSfcDocConverterContainer.value = false;
      useSfcDocConverterFileUpload.value = false;
      useSfcDocConverterBatchUpload.value = false;
      useSfcDocConverterProgress.value = false;
      useSfcDocConverterResult.value = false;
      useSfcDocConverterList.value = false;
      useSfcDocConverterPreview.value = false;
      useSfcDocConverterStats.value = false;
      useSfcDocConverterErrorDisplay.value = false;

      // Übergeordnetes Feature deaktivieren
      useSfcDocConverter.value = false;

      // Fallbacks für Document Converter Komponenten deaktivieren
      Object.keys(activeFallbacks).forEach((feature) => {
        if (feature.startsWith("useSfcDocConverter") || feature === "useSfcDocConverter") {
          activeFallbacks[feature] = false;
        }
      });

      // Fehler löschen für Document Converter Komponenten
      Object.keys(errors).forEach((feature) => {
        if (feature.startsWith("useSfcDocConverter") || feature === "useSfcDocConverter") {
          errors[feature] = [];
        }
      });
    }

    /**
     * Deaktiviert alle SFC-Migrationsfeatures
     */
    function disableAllSfcFeatures(): void {
      useSfcDocConverter.value = false;
      useSfcAdmin.value = false;
      useSfcChat.value = false;
      useSfcSettings.value = false;

      // UI-Basiskomponenten deaktivieren
      disableAllUIBaseComponents();

      // Chat-Komponenten deaktivieren
      disableAllChatComponents();

      // Admin-Komponenten deaktivieren
      disableAllAdminComponents();

      // Document Converter Komponenten deaktivieren
      disableAllDocConverterComponents();

      // Fallbacks deaktivieren
      Object.keys(activeFallbacks).forEach((feature) => {
        if (
          feature.startsWith("useSfc") &&
          !feature.startsWith("useSfcUI") &&
          !feature.startsWith("useSfcChat") &&
          !feature.startsWith("useSfcSession") &&
          !feature.startsWith("useSfcAdmin") &&
          !feature.startsWith("useSfcDocConverter")
        ) {
          activeFallbacks[feature] = false;
        }
      });

      // Fehler löschen
      Object.keys(errors).forEach((feature) => {
        if (
          feature.startsWith("useSfc") &&
          !feature.startsWith("useSfcUI") &&
          !feature.startsWith("useSfcChat") &&
          !feature.startsWith("useSfcSession") &&
          !feature.startsWith("useSfcAdmin") &&
          !feature.startsWith("useSfcDocConverter")
        ) {
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
        console.log("Loading feature toggles from API...");

        // In der echten Implementierung:
        // const response = await axios.get('/api/features');
        // configureFeatures(response.data.features);

        // Hier nur Beispiel-Implementation
        return true;
      } catch (error) {
        console.error("Fehler beim Laden der Feature-Toggles:", error);
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
        useSfcChat: "/",
        useSfcDocConverter: "/documents-legacy",
        useSfcAdmin: "/admin-legacy",
        useSfcSettings: "/settings-legacy",
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

      // UI-Basiskomponenten Features
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

      // Chat-Komponenten Features
      useSfcChatMessageItem,
      useSfcChatMessageList,
      useSfcChatInput,
      useSfcChatMessageInput,
      useSfcSessionItem,
      useSfcSessionList,
      useSfcChatContainer,
      useSfcEnhancedChatContainer,

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
      disableAllSfcFeatures,
      enableAllUIBaseComponents,
      disableAllUIBaseComponents,
      enableAllChatComponents,
      disableAllChatComponents,
      enableAllAdminComponents,
      disableAllAdminComponents,
    };
  },
  {
    persist: {
      storage: localStorage,
      paths: [
        "version",
        "usePiniaAuth",
        "usePiniaSessions",
        "usePiniaUI",
        "usePiniaSettings",
        "useNewUIComponents",
        "useToastNotifications",
        "useModernSidebar",
        "useNewAdminPanel",
        "uiComponentsDemo",
        "useDarkMode",
        "useThemeCustomization",
        "useLegacyBridge",
        "migrateLocalStorage",
        "useModernDocConverter",
        // SFC-Migration Features
        "useSfcDocConverter",
        "useSfcAdmin",
        "useSfcChat",
        "useSfcSettings",
        // UI-Basiskomponenten
        "useSfcUIButton",
        "useSfcUIInput",
        "useSfcUIBadge",
        "useSfcUITooltip",
        "useSfcUICard",
        "useSfcUIAlert",
        "useSfcUIToggle",
        "useSfcUITextArea",
        "useSfcUIProgressBar",
        "useSfcUICheckbox",
        "useSfcUIRadio",
        "useSfcUISelect",
        "useSfcUIModal",
        // Chat-Komponenten
        "useSfcChatMessageItem",
        "useSfcChatMessageList",
        "useSfcChatInput",
        "useSfcChatMessageInput",
        "useSfcSessionItem",
        "useSfcSessionList",
        "useSfcChatContainer",
        "useSfcEnhancedChatContainer",
        // Admin-Komponenten
        "useSfcAdminPanel",
        "useSfcAdminUsers",
        "useSfcAdminFeedback",
        "useSfcAdminMotd",
        "useSfcAdminSystem",
        "useSfcAdminStatistics",
        "useSfcAdminSystemSettings",
        "useSfcAdminFeatureToggles",
        "useSfcAdminLogViewer",
        // Document Converter Komponenten
        "useSfcDocConverterContainer",
        "useSfcDocConverterFileUpload",
        "useSfcDocConverterBatchUpload",
        "useSfcDocConverterProgress",
        "useSfcDocConverterResult",
        "useSfcDocConverterList",
        "useSfcDocConverterPreview",
        "useSfcDocConverterStats",
        "useSfcDocConverterErrorDisplay",
        // Fallback-Status auch persistieren
        "activeFallbacks",
      ],
      beforeRestore: (context) => {
        // Sicherheits-Callback vor der Wiederherstellung
        // Fehlende Features könnten bei Updates auf neue Version zu Problemen führen
        console.log(
          "Wiederherstellung von Feature-Toggles aus localStorage...",
        );

        try {
          // Minimal erforderliche Version prüfen
          const storedVersion = parseInt(
            localStorage.getItem("featureToggles")?.version || "0",
          );
          if (storedVersion < 2) {
            console.warn(
              "Veraltete Feature-Toggle-Version gefunden, setze auf Standardwerte zurück",
            );
            return false; // Keine Wiederherstellung durchführen
          }
        } catch (e) {
          console.error(
            "Fehler bei der Validierung gespeicherter Feature-Toggles:",
            e,
          );
          return false; // Keine Wiederherstellung durchführen
        }

        return true; // Normale Wiederherstellung durchführen
      },
      afterRestore: (context) => {
        // Nach der Wiederherstellung werden abhängige Features geprüft
        // und ggf. korrigiert
        console.log(
          "Feature-Toggles wiederhergestellt, prüfe Abhängigkeiten...",
        );

        // Alle SFC-Features auf Abhängigkeiten prüfen
        Object.entries(context.store.featureConfigs)
          .filter(([key]) => key.startsWith("useSfc"))
          .forEach(([key, config]) => {
            if (
              context.store.isEnabled(key) &&
              !context.store.areDependenciesSatisfied(key)
            ) {
              console.warn(
                `Feature ${key} aktiviert, aber Abhängigkeiten nicht erfüllt. Feature wird deaktiviert.`,
              );
              context.store[key as keyof typeof context.store] = false;
            }
          });
      },
    },
  },
);
