/**
 * Pinia Store für Systemeinstellungen
 * Verwaltet globale Einstellungen und Konfigurationsoptionen
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { adminApi } from "@/services/api/admin";

// Definition der Systemeinstellungen
export interface SystemSettings {
  // Allgemeine Einstellungen
  appName: string;
  appVersion: string;

  // Modell-Einstellungen
  defaultModel: string;
  availableModels: string[];
  maxTokensPerRequest: number;
  modelTemperature: number;

  // Performance-Einstellungen
  maxConcurrentRequests: number;
  maxQueueSize: number;
  requestTimeout: number;
  enableRequestRetry: boolean;
  maxRetries: number;

  // Sicherheitseinstellungen
  sessionTimeout: number; // in Minuten
  maxLoginAttempts: number;
  requirePasswordChange: number; // Tage
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;

  // Nutzungsmetriken
  collectUsageMetrics: boolean;
  collectErrorReports: boolean;
  metricsRetentionDays: number;

  // Wartung
  maintenanceMode: boolean;
  maintenanceMessage: string;

  // Cache-Einstellungen
  enableCache: boolean;
  cacheTtl: number; // in Sekunden
  maxCacheSize: number; // in MB

  // Logging
  logLevel: "debug" | "info" | "warn" | "error";
  logRotation: number; // Tage
  maxLogSize: number; // in MB
}

// Definition des Store-Zustands
export interface SettingsState {
  settings: SystemSettings;
  originalSettings: SystemSettings;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  hasUnsavedChanges: boolean;
}

/**
 * Store für die Verwaltung von Systemeinstellungen
 */
export const useAdminSettingsStore = defineStore("adminSettings", () => {
  // Initialer Zustand mit Standardwerten
  const defaultSettings: SystemSettings = {
    // Allgemeine Einstellungen
    appName: "nscale DMS Assistent",
    appVersion: "1.0.0",

    // Modell-Einstellungen
    defaultModel: "llama-7b",
    availableModels: ["llama-7b", "llama-13b", "mistral-7b", "mistral-7bq4"],
    maxTokensPerRequest: 4096,
    modelTemperature: 0.7,

    // Performance-Einstellungen
    maxConcurrentRequests: 5,
    maxQueueSize: 20,
    requestTimeout: 60000, // 60 Sekunden
    enableRequestRetry: true,
    maxRetries: 3,

    // Sicherheitseinstellungen
    sessionTimeout: 60, // 60 Minuten
    maxLoginAttempts: 5,
    requirePasswordChange: 90, // 90 Tage
    passwordMinLength: 8,
    passwordRequireSpecialChars: true,

    // Nutzungsmetriken
    collectUsageMetrics: true,
    collectErrorReports: true,
    metricsRetentionDays: 90,

    // Wartung
    maintenanceMode: false,
    maintenanceMessage:
      "Das System wird aktuell gewartet. Bitte versuchen Sie es später erneut.",

    // Cache-Einstellungen
    enableCache: true,
    cacheTtl: 86400, // 24 Stunden
    maxCacheSize: 500, // 500 MB

    // Logging
    logLevel: "info",
    logRotation: 30, // 30 Tage
    maxLogSize: 100, // 100 MB
  };

  // State
  const settings = ref<SystemSettings>({ ...defaultSettings });
  const originalSettings = ref<SystemSettings>({ ...defaultSettings });
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastUpdated = ref<number | null>(null);

  // Getters
  const hasUnsavedChanges = computed(() => {
    return (
      JSON.stringify(settings.value) !== JSON.stringify(originalSettings.value)
    );
  });

  const isMaintenanceModeActive = computed(() => {
    return settings.value.maintenanceMode;
  });

  const systemSettingsCategories = computed(() => [
    {
      id: "general",
      label: "Allgemein",
      description: "Grundlegende Systemeinstellungen",
      icon: "fa-cog",
    },
    {
      id: "models",
      label: "KI-Modelle",
      description: "Einstellungen für KI-Modelle und Anfrageparameter",
      icon: "fa-robot",
    },
    {
      id: "performance",
      label: "Performance",
      description: "Einstellungen zur Optimierung der Systemleistung",
      icon: "fa-tachometer-alt",
    },
    {
      id: "security",
      label: "Sicherheit",
      description: "Sicherheitseinstellungen und Benutzerrichtlinien",
      icon: "fa-shield-alt",
    },
    {
      id: "metrics",
      label: "Metriken",
      description: "Einstellungen zur Erfassung von Nutzungsmetriken",
      icon: "fa-chart-bar",
    },
    {
      id: "maintenance",
      label: "Wartung",
      description: "Wartungsoptionen und Systemverfügbarkeit",
      icon: "fa-tools",
    },
    {
      id: "cache",
      label: "Cache",
      description: "Einstellungen zur Zwischenspeicherung",
      icon: "fa-database",
    },
    {
      id: "logging",
      label: "Protokollierung",
      description: "Optionen für Systemprotokolle und Fehlerberichte",
      icon: "fa-clipboard-list",
    },
  ]);

  // Actions
  // Einstellungen vom Server laden
  async function fetchSettings() {
    loading.value = true;
    error.value = null;

    try {
      // In einer echten App würde hier ein API-Aufruf stehen
      // const response = await adminApi.getSystemSettings();
      // settings.value = response.data;
      // originalSettings.value = JSON.parse(JSON.stringify(response.data));

      // Simulierter API-Aufruf
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Wir verwenden hier die Standardwerte
      // In einer realen Anwendung würden wir Daten vom Server laden
      settings.value = { ...defaultSettings };
      originalSettings.value = { ...defaultSettings };

      lastUpdated.value = Date.now();
      return settings.value;
    } catch (err: any) {
      console.error("Error fetching system settings:", err);
      error.value = err.message || "Fehler beim Laden der Systemeinstellungen";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Einstellungen auf dem Server speichern
  async function saveSettings() {
    if (!hasUnsavedChanges.value) {
      return settings.value;
    }

    loading.value = true;
    error.value = null;

    try {
      // In einer echten App würde hier ein API-Aufruf stehen
      // const response = await adminApi.updateSystemSettings(settings.value);

      // Simulierter API-Aufruf
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Aktualisiere die Originaleinstellungen nach dem Speichern
      originalSettings.value = JSON.parse(JSON.stringify(settings.value));
      lastUpdated.value = Date.now();

      return settings.value;
    } catch (err: any) {
      console.error("Error saving system settings:", err);
      error.value =
        err.message || "Fehler beim Speichern der Systemeinstellungen";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Änderungen rückgängig machen
  function resetChanges() {
    settings.value = JSON.parse(JSON.stringify(originalSettings.value));
  }

  // Auf Standardeinstellungen zurücksetzen
  function resetToDefaults() {
    settings.value = { ...defaultSettings };
  }

  // Einstellung aktualisieren
  function updateSetting<K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K],
  ) {
    settings.value = {
      ...settings.value,
      [key]: value,
    };
  }

  // Mehrere Einstellungen gleichzeitig aktualisieren
  function updateSettings(updates: Partial<SystemSettings>) {
    settings.value = {
      ...settings.value,
      ...updates,
    };
  }

  // Aktivierung/Deaktivierung des Wartungsmodus
  async function toggleMaintenanceMode(activate: boolean, message?: string) {
    loading.value = true;
    error.value = null;

    try {
      // Aktualisiere lokalen Zustand
      settings.value.maintenanceMode = activate;

      if (message) {
        settings.value.maintenanceMessage = message;
      }

      // In einer echten App würde hier ein API-Aufruf stehen
      // await adminApi.setMaintenanceMode(activate, message);

      // Simulierter API-Aufruf
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Aktualisiere die Originaleinstellungen nach dem Speichern
      originalSettings.value = JSON.parse(JSON.stringify(settings.value));
      lastUpdated.value = Date.now();

      return settings.value.maintenanceMode;
    } catch (err: any) {
      console.error("Error toggling maintenance mode:", err);
      error.value = err.message || "Fehler beim Ändern des Wartungsmodus";

      // Rückgängig machen bei Fehler
      settings.value.maintenanceMode = originalSettings.value.maintenanceMode;
      settings.value.maintenanceMessage =
        originalSettings.value.maintenanceMessage;

      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Prüfe, ob eine bestimmte Einstellung geändert wurde
  function isSettingChanged<K extends keyof SystemSettings>(key: K): boolean {
    return (
      JSON.stringify(settings.value[key]) !==
      JSON.stringify(originalSettings.value[key])
    );
  }

  // Exportiere Einstellungen als JSON
  function exportSettings(): string {
    return JSON.stringify(settings.value, null, 2);
  }

  // Importiere Einstellungen aus JSON
  function importSettings(jsonSettings: string) {
    try {
      const parsedSettings = JSON.parse(jsonSettings);

      // Prüfe, ob alle erforderlichen Felder vorhanden sind
      const requiredKeys = Object.keys(defaultSettings);
      const missingKeys = requiredKeys.filter(
        (key) => !(key in parsedSettings),
      );

      if (missingKeys.length > 0) {
        throw new Error(`Fehlende Einstellungen: ${missingKeys.join(", ")}`);
      }

      // Aktualisiere Einstellungen
      settings.value = parsedSettings;

      return true;
    } catch (err: any) {
      console.error("Error importing settings:", err);
      error.value = err.message || "Fehler beim Importieren der Einstellungen";
      return false;
    }
  }

  return {
    // State
    settings,
    loading,
    error,
    lastUpdated,

    // Getters
    hasUnsavedChanges,
    isMaintenanceModeActive,
    systemSettingsCategories,

    // Actions
    fetchSettings,
    saveSettings,
    resetChanges,
    resetToDefaults,
    updateSetting,
    updateSettings,
    toggleMaintenanceMode,
    isSettingChanged,
    exportSettings,
    importSettings,
  };
});
