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

// Optimierte Store-Versionen wurden entfernt

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
  try {
    storeStatus.value[storeName] = "loading";
    await initFunction();
    storeStatus.value[storeName] = "success";
  } catch (error) {
    storeStatus.value[storeName] = "error";
    console.error(
      `Fehler bei der Initialisierung des ${storeName}-Stores:`,
      error,
    );

    // Try to report error if service is available
    try {
      const { reportError } = useErrorReporting();
      reportError(
        "STORE_INITIALIZATION_ERROR",
        `Fehler bei der Initialisierung des ${storeName}-Stores`,
        error,
      );
    } catch (reportingError) {
      // Ignore reporting errors during initialization
      console.warn(
        "Could not report error during store initialization:",
        reportingError,
      );
    }

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
      // Settings store uses initialize() method
      if (typeof settingsStore.initialize === "function") {
        await settingsStore.initialize();
      } else if (typeof settingsStore.loadSettings === "function") {
        await settingsStore.loadSettings();
      }
      // If neither method exists, the store is already initialized
    });

    await initializeStore("ui", async () => {
      uiStore.initialize();
    });

    // 3. Sessions, DocumentConverter, Monitoring, Statistics und Admin initialisieren
    const initPromises = [
      initializeStore("sessions", async () => {
        await sessionsStore.initialize();
        // Make store globally available to avoid circular dependencies
        (window as any).__sessionsStore = sessionsStore;
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
          // Standardmäßig nur das Admin-Dashboard laden, andere Tabs werden bei Bedarf geladen
          await adminStore.loadDashboardData();
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
    console.error("Kritischer Fehler bei der Store-Initialisierung:", error);

    // Try to report error if service is available
    try {
      const { reportError } = useErrorReporting();
      reportError(
        "CRITICAL_STORE_INITIALIZATION_ERROR",
        "Kritischer Fehler bei der Store-Initialisierung",
        error,
      );
    } catch (reportingError) {
      // Ignore reporting errors during initialization
      console.warn("Could not report critical error:", reportingError);
    }

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

      onError((_error) => {
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
        // Reset the entire sessions store (clears all sessions and messages)
        sessionsStore.reset();

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
          sessionsStore.setCurrentSession((result as any).id);
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
