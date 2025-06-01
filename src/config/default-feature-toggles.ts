/**
 * Standard-Feature-Toggles für SFC Migration
 *
 * Diese Konfiguration definiert die Standardwerte für alle Feature-Toggles
 * im System. Diese Werte werden verwendet, wenn keine benutzerdefinierten
 * Einstellungen im localStorage vorhanden sind.
 *
 * @version 3.0.0
 * @date 11.05.2025
 */

export const DEFAULT_FEATURE_TOGGLES = {
  // Pinia Store Features
  usePiniaAuth: true,
  usePiniaSessions: true,
  usePiniaUI: true,
  usePiniaSettings: true,

  // UI Features
  useNewUIComponents: true,
  useToastNotifications: true,
  useModernSidebar: true,
  useNewAdminPanel: true,
  uiComponentsDemo: true,

  // Theme Features
  useDarkMode: true,
  useThemeCustomization: true,

  // Legacy Integration
  useLegacyBridge: true,
  migrateLocalStorage: true,

  // Document Converter Features
  useModernDocConverter: true,

  // SFC Migration Features
  useSfcDocConverter: true,
  useSfcAdmin: true,
  useSfcChat: true,
  useSfcSettings: true,

  // UI-Basiskomponenten
  useSfcUIButton: true,
  useSfcUIInput: true,
  useSfcUIBadge: true,
  useSfcUITooltip: true,
  useSfcUICard: true,
  useSfcUIAlert: true,
  useSfcUIToggle: true,
  useSfcUITextArea: true,
  useSfcUIProgressBar: true,
  useSfcUICheckbox: true,
  useSfcUIRadio: true,
  useSfcUISelect: true,
  useSfcUIModal: true,

  // Chat-Komponenten
  useSfcChatMessageItem: true,
  useSfcChatMessageList: true,
  useSfcChatInput: true,
  useSfcChatMessageInput: true,
  useSfcSessionItem: true,
  useSfcSessionList: true,
  useSfcChatContainer: true,
  useSfcEnhancedChatContainer: true,

  // Admin-Komponenten
  useSfcAdminPanel: true,
  useSfcAdminUsers: true,
  useSfcAdminFeedback: true,
  useSfcAdminMotd: true,
  useSfcAdminSystem: true,
  useSfcAdminStatistics: true,
  useSfcAdminSystemSettings: true,
  useSfcAdminFeatureToggles: true,
  useSfcAdminLogViewer: true,

  // Document Converter Komponenten
  useSfcDocConverterContainer: true,
  useSfcDocConverterFileUpload: true,
  useSfcDocConverterBatchUpload: true,
  useSfcDocConverterProgress: true,
  useSfcDocConverterResult: true,
  useSfcDocConverterList: true,
  useSfcDocConverterPreview: true,
  useSfcDocConverterStats: true,
  useSfcDocConverterErrorDisplay: true,
};

/**
 * Konfiguration für lokale Entwicklung
 * Diese Konfiguration wird nur verwendet, wenn die Anwendung im Entwicklungsmodus läuft
 */
export const DEV_FEATURE_TOGGLES = {
  ...DEFAULT_FEATURE_TOGGLES,

  // In dev können alle Debug-Features aktiviert werden
  showDebugOverlay: true,
  enablePerformanceMetrics: true,
  showFeatureToggleAdmin: true,
};

/**
 * Konfiguration für Testing
 * Diese Konfiguration wird für automatisierte Tests verwendet
 */
export const TEST_FEATURE_TOGGLES = {
  ...DEFAULT_FEATURE_TOGGLES,

  // In Tests könnten einige Features deaktiviert werden, die in Tests problematisch sind
  // z.B. Animationen oder asynchrone Operationen, die Tests instabil machen können
  useAnimations: false,
};

/**
 * Notfall-Fallback-Konfiguration
 * Diese Konfiguration wird verwendet, wenn ernsthafte Probleme auftreten
 */
export const FALLBACK_FEATURE_TOGGLES = {
  // Grundlegende Features aktiviert lassen
  usePiniaAuth: true,
  usePiniaSessions: true,
  usePiniaUI: true,

  // Aber alle SFC-Features deaktivieren und auf Legacy-Code zurückfallen
  useNewUIComponents: false,
  useSfcDocConverter: false,
  useSfcAdmin: false,
  useSfcChat: false,
  useSfcSettings: false,

  // Legacy Bridge aktiviert lassen für Kompatibilität
  useLegacyBridge: true,
};

/**
 * Featureliste für Vanilla-JS und Vue 3 Komponenten vergleichen
 * und Unterschiede protokollieren
 */
export function logMigrationStatus(): void {
  const vanillaJsFeatures = Object.keys(DEFAULT_FEATURE_TOGGLES).filter(
    (key) => !key.startsWith("useSfc"),
  ).length;

  const sfcFeatures = Object.keys(DEFAULT_FEATURE_TOGGLES).filter((key: any) =>
    key.startsWith("useSfc"),
  ).length;

  console.log(`Migration Status:`);
  console.log(`- Vanilla JS Features: ${vanillaJsFeatures}`);
  console.log(`- Vue 3 SFC Features: ${sfcFeatures}`);
  console.log(
    `- Total Features: ${Object.keys(DEFAULT_FEATURE_TOGGLES).length}`,
  );
  console.log(
    `- Migration Percentage: ${Math.round((sfcFeatures / (sfcFeatures + vanillaJsFeatures)) * 100)}%`,
  );
}
