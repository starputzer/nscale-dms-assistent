/**
 * Optimierter Admin Settings Store
 * Verwaltet die Systemeinstellungen des Administrators mit Optimierungen für Performance
 */

import { defineStore } from "pinia";
import { ref, computed, shallowRef } from "vue";
import {
  batchRequestService,
  BatchRequest,
} from "@/services/api/BatchRequestService";
import { useErrorReporting } from "@/composables/useErrorReporting";
import { batchStoreQueries } from "@/utils/apiBatchingUtils";

// Interface für Systemeinstellungen
export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  category: string;
  isUserEditable: boolean;
  validationRules?: string;
  lastUpdated: string;
  updatedBy?: string;
}

// Interface für Einstellungskategorien
export interface SettingCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  order: number;
}

// Interface für Einstellungsaktualisierungen
export interface SettingUpdate {
  key: string;
  value: any;
}

export const useAdminSettingsStoreOptimized = defineStore(
  "adminSettingsOptimized",
  () => {
    // State mit Optimierungen
    const settings = shallowRef<SystemSetting[]>([]);
    const categories = shallowRef<SettingCategory[]>([]);
    const loading = ref(false);
    const saving = ref(false);
    const error = ref<string | null>(null);
    const lastUpdated = ref<Date | null>(null);

    // Cache für setting-by-key lookups
    const settingsCache = ref<Map<string, SystemSetting>>(new Map());

    // Neue Status für detaillierte Ladestandsverfolgung
    const loadingState = ref<{
      settings: boolean;
      categories: boolean;
    }>({
      settings: false,
      categories: false,
    });

    // Berichterstellung für Fehler
    const { reportError } = useErrorReporting();

    // Optimierte Getters mit Memoization
    const getSettingByKey = computed(() => {
      return (key: string): SystemSetting | undefined => {
        // Aus Cache abrufen für bessere Performance
        if (settingsCache.value.has(key)) {
          return settingsCache.value.get(key);
        }

        // Wenn nicht im Cache, in der Liste suchen
        const setting = settings.value.find((s) => s.key === key);

        // Zum Cache hinzufügen, falls gefunden
        if (setting) {
          settingsCache.value.set(key, setting);
        }

        return setting;
      };
    });

    const settingsByCategory = computed(() => {
      const grouped: Record<string, SystemSetting[]> = {};

      // Für jede Kategorie eine leere Array-Instanz erstellen
      categories.value.forEach((category) => {
        grouped[category.id] = [];
      });

      // Einstellungen nach Kategorie gruppieren
      settings.value.forEach((setting) => {
        if (!grouped[setting.category]) {
          grouped[setting.category] = [];
        }
        grouped[setting.category].push(setting);
      });

      return grouped;
    });

    const sortedCategories = computed(() => {
      return [...categories.value].sort((a, b) => a.order - b.order);
    });

    const hasUnsavedChanges = ref(false);
    const pendingChanges = ref<Map<string, any>>(new Map());

    // Actions
    /**
     * Lädt alle Systemeinstellungen mit Batch-Request-Optimierung
     */
    async function fetchSettings() {
      loadingState.value.settings = true;
      error.value = null;

      try {
        // Batch-Request verwenden für optimierte API-Nutzung
        const response = await batchRequestService.addRequest<{
          settings: SystemSetting[];
        }>({
          endpoint: "/api/admin/settings",
          method: "GET",
          meta: {
            cacheTTL: 60000, // 1 Minute Cache
          },
        });

        settings.value = response.settings;

        // Cache aktualisieren
        settingsCache.value.clear();
        settings.value.forEach((setting) => {
          settingsCache.value.set(setting.key, setting);
        });

        lastUpdated.value = new Date();
      } catch (err: any) {
        error.value =
          err.message || "Fehler beim Laden der Systemeinstellungen";
        reportError(
          "ADMIN_SETTINGS_FETCH_ERROR",
          "Fehler beim Laden der Systemeinstellungen",
          err,
        );
      } finally {
        loadingState.value.settings = false;
        loading.value =
          loadingState.value.settings || loadingState.value.categories;
      }
    }

    /**
     * Lädt alle Einstellungskategorien mit Batch-Request-Optimierung
     */
    async function fetchCategories() {
      loadingState.value.categories = true;
      error.value = null;

      try {
        // Batch-Request verwenden für optimierte API-Nutzung
        const response = await batchRequestService.addRequest<{
          categories: SettingCategory[];
        }>({
          endpoint: "/api/admin/settings/categories",
          method: "GET",
          meta: {
            cacheTTL: 3600000, // 1 Stunde Cache für Kategorien
          },
        });

        categories.value = response.categories;
      } catch (err: any) {
        error.value =
          err.message || "Fehler beim Laden der Einstellungskategorien";
        reportError(
          "ADMIN_SETTINGS_CATEGORIES_ERROR",
          "Fehler beim Laden der Einstellungskategorien",
          err,
        );
      } finally {
        loadingState.value.categories = false;
        loading.value =
          loadingState.value.settings || loadingState.value.categories;
      }
    }

    /**
     * Speichert eine einzelne Einstellung mit Optimierungen
     */
    async function updateSetting(key: string, value: any) {
      // Änderung zum Pending-Änderungen-Tracking hinzufügen
      pendingChanges.value.set(key, value);
      hasUnsavedChanges.value = true;

      // Lokalen State sofort aktualisieren für bessere UX
      const settingIndex = settings.value.findIndex((s) => s.key === key);
      if (settingIndex >= 0) {
        const updatedSettings = [...settings.value];
        updatedSettings[settingIndex] = {
          ...updatedSettings[settingIndex],
          value,
          lastUpdated: new Date().toISOString(),
        };
        settings.value = updatedSettings;

        // Cache aktualisieren
        settingsCache.value.set(key, updatedSettings[settingIndex]);
      }
    }

    /**
     * Speichert alle ausstehenden Änderungen in einem Batch
     */
    async function saveChanges() {
      if (!hasUnsavedChanges.value) return;

      saving.value = true;
      error.value = null;

      try {
        // Konvertiere Map zu Array von Einstellungsaktualisierungen
        const updates: SettingUpdate[] = Array.from(
          pendingChanges.value.entries(),
        ).map(([key, value]) => ({ key, value }));

        // Optimierte Version mit API-Batching
        await batchRequestService.addRequest({
          endpoint: "/api/admin/settings",
          method: "PATCH",
          data: { updates },
        });

        // Cache invalidieren
        batchRequestService.invalidateCache({
          endpoint: "/api/admin/settings",
          method: "GET",
        });

        // Nach erfolgreichem Speichern ausstehende Änderungen zurücksetzen
        pendingChanges.value.clear();
        hasUnsavedChanges.value = false;

        // Einstellungen neu laden, um sicherzustellen, dass wir die neuesten Werte haben
        await fetchSettings();
      } catch (err: any) {
        error.value = err.message || "Fehler beim Speichern der Einstellungen";
        reportError(
          "ADMIN_SETTINGS_UPDATE_ERROR",
          "Fehler beim Speichern der Einstellungen",
          err,
        );
      } finally {
        saving.value = false;
      }
    }

    /**
     * Verwirft alle ausstehenden Änderungen
     */
    function discardChanges() {
      pendingChanges.value.clear();
      hasUnsavedChanges.value = false;

      // Einstellungen neu laden, um den ursprünglichen Zustand wiederherzustellen
      fetchSettings();
    }

    /**
     * Lädt eine bestimmte Einstellung, wenn sie nicht im Cache ist
     */
    async function ensureSettingLoaded(
      key: string,
    ): Promise<SystemSetting | undefined> {
      // Wenn bereits im Cache, zurückgeben
      if (settingsCache.value.has(key)) {
        return settingsCache.value.get(key);
      }

      // Wenn bereits in den geladenen Einstellungen, im Cache speichern und zurückgeben
      const existingSetting = settings.value.find((s) => s.key === key);
      if (existingSetting) {
        settingsCache.value.set(key, existingSetting);
        return existingSetting;
      }

      // Wenn nicht im Cache oder in den geladenen Einstellungen, einzeln laden
      try {
        const response = await batchRequestService.addRequest<{
          setting: SystemSetting;
        }>({
          endpoint: `/api/admin/settings/${key}`,
          method: "GET",
        });

        const setting = response.setting;

        // Zum Cache und zu den Einstellungen hinzufügen
        settingsCache.value.set(key, setting);
        settings.value = [...settings.value, setting];

        return setting;
      } catch (err: any) {
        reportError(
          "ADMIN_SETTING_FETCH_ERROR",
          `Fehler beim Laden der Einstellung ${key}`,
          err,
        );
        return undefined;
      }
    }

    /**
     * Setzt eine Einstellung auf ihren Standardwert zurück
     */
    async function resetSettingToDefault(key: string) {
      saving.value = true;
      error.value = null;

      try {
        // Optimierte Version mit API-Batching
        await batchRequestService.addRequest({
          endpoint: `/api/admin/settings/${key}/reset`,
          method: "POST",
        });

        // Cache invalidieren
        batchRequestService.invalidateCache({
          endpoint: "/api/admin/settings",
          method: "GET",
        });

        // Einstellung aus den ausstehenden Änderungen entfernen, falls vorhanden
        if (pendingChanges.value.has(key)) {
          pendingChanges.value.delete(key);

          // hasUnsavedChanges nur aktualisieren, wenn keine weiteren Änderungen vorhanden sind
          if (pendingChanges.value.size === 0) {
            hasUnsavedChanges.value = false;
          }
        }

        // Einstellungen neu laden, um den aktualisierten Wert zu erhalten
        await fetchSettings();
      } catch (err: any) {
        error.value =
          err.message || `Fehler beim Zurücksetzen der Einstellung ${key}`;
        reportError(
          "ADMIN_SETTING_RESET_ERROR",
          `Fehler beim Zurücksetzen der Einstellung ${key}`,
          err,
        );
      } finally {
        saving.value = false;
      }
    }

    /**
     * Initialisiert den Admin-Settings-Store mit optimiertem Batch-Loading
     */
    async function initialize() {
      loading.value = true;

      try {
        // Parallel laden mit Batch-Requests für optimale Performance
        const requests: BatchRequest[] = [
          {
            endpoint: "/api/admin/settings",
            method: "GET",
            meta: { cacheTTL: 60000 },
          },
          {
            endpoint: "/api/admin/settings/categories",
            method: "GET",
            meta: { cacheTTL: 3600000 },
          },
        ];

        const [settingsResponse, categoriesResponse] =
          await batchStoreQueries(requests);

        settings.value = settingsResponse.settings;
        categories.value = categoriesResponse.categories;

        // Cache aufbauen
        settingsCache.value.clear();
        settings.value.forEach((setting) => {
          settingsCache.value.set(setting.key, setting);
        });

        lastUpdated.value = new Date();
      } catch (err: any) {
        error.value =
          err.message || "Fehler beim Initialisieren der Systemeinstellungen";
        reportError(
          "ADMIN_SETTINGS_INIT_ERROR",
          "Fehler beim Initialisieren der Systemeinstellungen",
          err,
        );
      } finally {
        loading.value = false;
      }
    }

    /**
     * Setzt den Store zurück
     */
    function reset() {
      settings.value = [];
      categories.value = [];
      settingsCache.value.clear();
      pendingChanges.value.clear();
      hasUnsavedChanges.value = false;
      loading.value = false;
      saving.value = false;
      error.value = null;
      lastUpdated.value = null;
      loadingState.value = { settings: false, categories: false };
    }

    // Getter für den Wert einer Einstellung mit Caching
    function getSetting(key: string, defaultValue?: any): any {
      const setting = getSettingByKey.value(key);
      return setting ? setting.value : defaultValue;
    }

    return {
      // State
      settings,
      categories,
      loading,
      saving,
      error,
      lastUpdated,
      hasUnsavedChanges,
      loadingState,

      // Getters
      getSettingByKey,
      settingsByCategory,
      sortedCategories,
      getSetting,

      // Actions
      fetchSettings,
      fetchCategories,
      updateSetting,
      saveChanges,
      discardChanges,
      ensureSettingLoaded,
      resetSettingToDefault,
      initialize,
      reset,
    };
  },
);
