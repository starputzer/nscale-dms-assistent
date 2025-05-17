import { ref } from "vue";
import { useAuthStore } from "./auth";
import { useFeatureTogglesStore } from "./featureToggles";
import { useSessionsStore } from "./sessions";
import { useSettingsStore } from "./settings";
import { useUIStore } from "./ui";
import { useDocumentConverterStore } from "./documentConverter";
import { useMonitoringStore } from "./monitoringStore";
import { useStatisticsStore } from "./statistics";
import { useAdminStore } from "./admin";
import { useAdminLogsStore } from "./admin/logs";
import { useErrorReporting } from "@/composables/useErrorReporting";
import { useBridgeChat } from "@/composables/useBridgeChat";

// Optimierte Store-Versionen
import { useSessionsStore as useSessionsStoreOptimized } from "./sessions.optimized";
import { useAdminSettingsStoreOptimized } from "./admin/settings.optimized";

/**
 * Status-Type für Store-Initialisierung
 */
export type InitializationStatus = "idle" | "loading" | "success" | "error";

/**
 * Globaler Initialisierungsstatus
 */
export const isInitialized = ref(false);

/**
 * Status der einzelnen Store-Initialisierungen
 */
export const storeStatus = ref<Record<string, InitializationStatus>>({
  auth: "idle",
  featureToggles: "idle",
  sessions: "idle",
  settings: "idle",
  ui: "idle",
  documentConverter: "idle",
  monitoring: "idle",
  statistics: "idle",
  admin: "idle",
  adminLogs: "idle",
});

/**
 * Initialisiert einen einzelnen Store und aktualisiert den Status
 *
 * @param storeName - Name des zu initialisierenden Stores
 * @param initFunction - Funktion zur Initialisierung des Stores
 * @returns Promise mit dem Initialisierungsergebnis
 */
const initializeStore = async (
  storeName: string,
  initFunction: () => Promise<any>,
): Promise<void> => {
  const { reportError } = useErrorReporting();

  try {
    storeStatus.value[storeName] = "loading";
    await initFunction();
    storeStatus.value[storeName] = "success";
  } catch (error) {
    storeStatus.value[storeName] = "error";
    reportError(
      "STORE_INITIALIZATION_ERROR",
      `Fehler bei der Initialisierung des ${storeName}-Stores`,
      error,
    );

    if (storeName === "auth" || storeName === "featureToggles") {
      // Kritische Stores - Initialisierung abbrechen
      throw error;
    }
  }
};

/**
 * Debug-Funktion zur Statusüberwachung
 */
export const getStoreInitializationStatus = () => {
  return {
    isInitialized: isInitialized.value,
    storeStatus: { ...storeStatus.value },
  };
};

/**
 * Initialisiert alle Stores in der richtigen Reihenfolge
 *
 * @returns Promise, der erfolgreich ist, wenn alle kritischen Stores initialisiert wurden
 */
export const initializeStores = async (): Promise<void> => {
  const authStore = useAuthStore();
  const featureTogglesStore = useFeatureTogglesStore();
  const sessionsStore = useSessionsStore();
  const settingsStore = useSettingsStore();
  const uiStore = useUIStore();
  const documentConverterStore = useDocumentConverterStore();
  const monitoringStore = useMonitoringStore();
  const statisticsStore = useStatisticsStore();
  const adminStore = useAdminStore();
  const adminLogsStore = useAdminLogsStore();
  const { reportError } = useErrorReporting();

  try {
    // 1. Auth und FeatureToggles zuerst initialisieren (kritische Stores)
    await initializeStore("auth", async () => {
      await authStore.initialize();
    });

    await initializeStore("featureToggles", async () => {
      await featureTogglesStore.loadFeatureToggles();
      // Hier Fallback-Feature-Flags setzen, wenn API-Aufruf fehlschlägt
      if (!featureTogglesStore.isLoaded) {
        featureTogglesStore.setFallbackFeatures();
      }
    });

    // 2. Einstellungen und UI initialisieren
    await initializeStore("settings", async () => {
      await settingsStore.loadSettings();
    });

    await initializeStore("ui", async () => {
      uiStore.initialize();
    });

    // 3. Sessions, DocumentConverter, Monitoring, Statistics und Admin initialisieren
    const initPromises = [
      initializeStore("sessions", async () => {
        // Wenn das Feature-Flag für optimierte Stores aktiviert ist, verwende den optimierten Store
        if (featureTogglesStore.isFeatureEnabled("optimizedStores")) {
          const optimizedSessionsStore = useSessionsStoreOptimized();
          await optimizedSessionsStore.initialize();
        } else {
          await sessionsStore.initialize();
        }
      }),

      initializeStore("documentConverter", async () => {
        if (featureTogglesStore.isFeatureEnabled("documentConverter")) {
          await documentConverterStore.initialize();
        }
      }),

      initializeStore("monitoring", async () => {
        if (
          featureTogglesStore.isFeatureEnabled("monitoring") &&
          authStore.hasPermission("viewMonitoring")
        ) {
          await monitoringStore.initialize();
        }
      }),

      initializeStore("statistics", async () => {
        if (
          featureTogglesStore.isFeatureEnabled("statistics") &&
          authStore.hasPermission("viewStatistics")
        ) {
          await statisticsStore.initialize();
        }
      }),

      initializeStore("admin", async () => {
        // Nur initialisieren wenn Benutzer angemeldet und berechtigt ist
        if (
          authStore.isAuthenticated &&
          (authStore.hasPermission("admin") ||
          authStore.hasPermission("adminView"))
        ) {
          // Wenn Feature-Flag für optimierte Stores aktiviert ist, verwende optimierte Stores
          if (
            featureTogglesStore.isFeatureEnabled("optimizedStores") &&
            featureTogglesStore.isFeatureEnabled("adminSettingsOptimized")
          ) {
            const optimizedAdminSettingsStore =
              useAdminSettingsStoreOptimized();
            await optimizedAdminSettingsStore.initialize();
          } else {
            // Standardmäßig nur das Admin-Dashboard laden, andere Tabs werden bei Bedarf geladen
            await adminStore.loadDashboardData();
          }
        }
      }),

      initializeStore("adminLogs", async () => {
        if (
          authStore.hasPermission("admin") &&
          authStore.hasPermission("viewLogs") &&
          featureTogglesStore.isFeatureEnabled("adminLogs")
        ) {
          await adminLogsStore.initialize();
        }
      }),
    ];

    // Parallel initialisieren (nicht-kritische Stores)
    await Promise.allSettled(initPromises);

    // Event-System zwischen Stores konfigurieren
    setupStoreInteractions();

    isInitialized.value = true;
  } catch (error) {
    reportError(
      "CRITICAL_STORE_INITIALIZATION_ERROR",
      "Kritischer Fehler bei der Store-Initialisierung",
      error,
    );
    throw error;
  }
};

/**
 * Konfiguriert die Store-Interaktionen und Event-Listeners
 */
function setupStoreInteractions(): void {
  const authStore = useAuthStore();
  const featureTogglesStore = useFeatureTogglesStore();
  const sessionsStore = useSessionsStore();
  const settingsStore = useSettingsStore();
  const uiStore = useUIStore();
  const documentConverterStore = useDocumentConverterStore();
  const monitoringStore = useMonitoringStore();
  const { setupChat } = useBridgeChat();

  // Auth-Store Interaktionen
  authStore.$onAction(({ name, after, onError }) => {
    // Nach erfolgreicher Anmeldung
    if (name === "login") {
      after(() => {
        // Sessions nach Login laden
        sessionsStore.synchronizeSessions();

        // Feature-Toggles aktualisieren basierend auf Benutzerrolle
        featureTogglesStore.loadFeatureToggles();

        // Chat-Bridge initialisieren (setupChat ist nicht mehr notwendig)

        // Monitoring Store ist immer aktiv, keine explizite Initialisierung nötig
      });

      onError((error) => {
        uiStore.showToast({
          type: "error",
          title: "Anmeldefehler",
          message: "Bei der Anmeldung ist ein Fehler aufgetreten.",
          autoClose: true,
        });
      });
    }

    // Bei Abmeldung
    if (name === "logout") {
      after(() => {
        // Aktuelle Session beenden
        if (sessionsStore.currentSession) {
          sessionsStore.clearCurrentSession();
        }

        // Zurücksetzen des Dokumentenkonverter-Stores
        documentConverterStore.resetState();

        // Monitoring Store hat keine stopMonitoring Methode

        // UI-Zustand zurücksetzen
        uiStore.resetUIState();
      });
    }
  });

  // Feature-Toggles Interaktionen
  featureTogglesStore.$onAction(({ name, after }) => {
    if (name === "loadFeatureToggles" || name === "setFeatureToggle") {
      after(() => {
        // DocumentConverter-Store aktualisieren basierend auf Feature-Flag
        if (featureTogglesStore.isFeatureEnabled("documentConverter")) {
          documentConverterStore.checkStatus();
        } else {
          documentConverterStore.resetState();
        }

        // Monitoring Store ist immer aktiv, keine explizite Initialisierung nötig
      });
    }
  });

  // Sessions-Store Interaktionen
  sessionsStore.$onAction(({ name, after, args }) => {
    if (name === "setCurrentSession") {
      after(() => {
        // UI-Store über Sessionwechsel informieren
        uiStore.setActiveSession(args[0]);
      });
    }

    if (name === "createSession") {
      after((result) => {
        // Nach Erstellung einer neuen Session diese automatisch aktivieren
        if (result) {
          sessionsStore.setCurrentSession(result.id);
        }
      });
    }
  });

  // Settings-Store Interaktionen
  settingsStore.$onAction(({ name, after, args }) => {
    if (name === "setSetting" && args[0] === "theme") {
      after(() => {
        // Theme im UI-Store aktualisieren
        uiStore.setTheme(args[1]);
      });
    }
  });

  // DocumentConverter-Store Interaktionen
  documentConverterStore.$onAction(({ name, after }) => {
    if (name === "uploadComplete" || name === "conversionComplete") {
      after(() => {
        // Monitoring über abgeschlossene Konversion informieren
        if (featureTogglesStore.isFeatureEnabled("monitoring")) {
          monitoringStore.trackEvent("document_conversion_completed");
        }
      });
    }

    if (name === "conversionError") {
      after(() => {
        // Fehler im Monitoring erfassen
        if (featureTogglesStore.isFeatureEnabled("monitoring")) {
          monitoringStore.trackError("document_conversion_failed");
        }
      });
    }
  });
}
