import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { adminFeatureTogglesService } from "@/services/api/adminServices";
import { useToast } from "@/composables/useToast";
<<<<<<< HEAD
import type {
  FeatureToggle,
  FeatureMetrics,
  FeatureHistoryEntry,
  FeatureErrorLog,
  FeatureImportOptions,
  MetricsQuery,
} from "@/types/featureToggles";
=======
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da

/**
 * Produktions-Feature-Toggle Store
 * Verwaltet Features für zukünftige Entwicklungen und Experimente
 */

export interface ProductionFeatureToggle {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
<<<<<<< HEAD
  key?: string; // Add key field for compatibility
  dependencies?: string[];
  locked?: boolean;
  experimental?: boolean;
=======
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
}

export const useFeatureTogglesStore = defineStore("featureToggles", () => {
  const { showSuccess, showError } = useToast();

  // State
<<<<<<< HEAD
  const toggles = ref<FeatureToggle[]>([]);
  const isLoading = ref(false);
  const isLoaded = ref(false);
  const error = ref<string | null>(null);
  const enhancedFeatures = computed(() => 
    toggles.value.map(t => ({
      ...t,
      key: t.key || t.id, // Ensure key field exists
    }))
  );
=======
  const toggles = ref<ProductionFeatureToggle[]>([]);
  const isLoading = ref(false);
  const isLoaded = ref(false);
  const error = ref<string | null>(null);
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da

  // Getters
  const categories = computed(() => {
    const cats = new Set(toggles.value.map((t) => t.category));
    return Array.from(cats).sort();
  });

  const enabledCount = computed(
    () => toggles.value.filter((t) => t.enabled).length,
  );

  const disabledCount = computed(
    () => toggles.value.filter((t) => !t.enabled).length,
  );

  const togglesByCategory = computed(() => {
    const result: Record<string, ProductionFeatureToggle[]> = {};
    toggles.value.forEach((toggle) => {
      if (!result[toggle.category]) {
        result[toggle.category] = [];
      }
      result[toggle.category].push(toggle);
    });
    return result;
  });

  // Feature-Check-Funktionen für die Anwendung
  const isFeatureEnabled = (featureId: string): boolean => {
    const toggle = toggles.value.find((t) => t.id === featureId);
    return toggle?.enabled ?? false;
  };

  // Spezifische Feature-Checks
  const features = computed(() => ({
    enhancedRagSearch: isFeatureEnabled("enhanced-rag-search"),
    multiLlmSupport: isFeatureEnabled("multi-llm-support"),
    documentOcr: isFeatureEnabled("document-ocr"),
    rateLimiting: isFeatureEnabled("rate-limiting"),
    advancedCaching: isFeatureEnabled("advanced-caching"),
    exportAnalytics: isFeatureEnabled("export-analytics"),
    maintenanceMode: isFeatureEnabled("maintenance-mode"),
    betaUiFeatures: isFeatureEnabled("beta-ui-features"),
  }));

  // Actions
  const loadToggles = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await adminFeatureTogglesService.getFeatureToggles();
      if (response.success && response.data) {
        // Die API gibt die Toggles direkt zurück, nicht in einem toggles-Objekt
        toggles.value = Array.isArray(response.data)
          ? response.data
<<<<<<< HEAD
          : (response.data as any).toggles || [];
=======
          : response.data.toggles || [];
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
        isLoaded.value = true;
      }
    } catch (err) {
      error.value = "Fehler beim Laden der Feature-Toggles";
      console.error("Error loading feature toggles:", err);
      isLoaded.value = false;
    } finally {
      isLoading.value = false;
    }
  };

  const updateToggle = async (toggleId: string, enabled: boolean) => {
    try {
      const response = await adminFeatureTogglesService.updateFeatureToggle(
        toggleId,
        enabled,
      );
      if (response.success) {
        // Update local state
        const index = toggles.value.findIndex((t) => t.id === toggleId);
        if (index !== -1) {
          toggles.value[index].enabled = enabled;
          toggles.value[index].updated_at = new Date().toISOString();
        }
        showSuccess(
          `Feature "${toggleId}" wurde ${enabled ? "aktiviert" : "deaktiviert"}`,
        );
      }
    } catch (err) {
      showError("Fehler beim Aktualisieren des Feature-Toggles");
      console.error("Error updating toggle:", err);
      throw err;
    }
  };

  const createToggle = async (toggle: Partial<ProductionFeatureToggle>) => {
    try {
      const response =
        await adminFeatureTogglesService.createFeatureToggle(toggle);
      if (response.success && response.data) {
<<<<<<< HEAD
        toggles.value.push(response.data as any);
=======
        toggles.value.push(response.data);
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
        showSuccess("Feature-Toggle wurde erstellt");
      }
    } catch (err) {
      showError("Fehler beim Erstellen des Feature-Toggles");
      console.error("Error creating toggle:", err);
      throw err;
    }
  };

<<<<<<< HEAD
  // Additional methods for component compatibility
  const loadFeatures = loadToggles;
  
  const updateFeature = async (feature: FeatureToggle) => {
    const featureId = feature.key || feature.id;
    return updateToggle(featureId, feature.enabled);
  };

  const createFeature = async (feature: FeatureToggle) => {
    return createToggle({
      id: feature.key,
      name: feature.name,
      description: feature.description,
      enabled: feature.enabled,
      category: feature.category,
      dependencies: feature.dependencies,
      locked: feature.locked,
      experimental: feature.experimental,
    });
  };

  const deleteFeature = async (featureKey: string) => {
    return deleteToggle(featureKey);
  };

  const updateCategoryFeatures = async (category: string, enabled: boolean) => {
    const featuresInCategory = toggles.value.filter(t => t.category === category);
    const promises = featuresInCategory.map(feature => 
      updateToggle(feature.key || feature.id, enabled)
    );
    await Promise.all(promises);
  };

  const getFeatureHistory = async (featureKey: string): Promise<FeatureHistoryEntry[]> => {
    try {
      const response = await adminFeatureTogglesService.getFeatureHistory(featureKey);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (err) {
      console.error("Error fetching feature history:", err);
      return [];
    }
  };

  const getFeatureMetrics = async (query: MetricsQuery) => {
    try {
      const response = await adminFeatureTogglesService.getFeatureMetrics({
        startDate: query.startDate,
        endDate: query.endDate,
      });
      if (response.success && response.data) {
        return response.data;
      }
      return { features: {} };
    } catch (err) {
      console.error("Error fetching feature metrics:", err);
      return { features: {} };
    }
  };

  const getFeatureErrors = async (query: { startDate: Date; endDate: Date; limit: number }): Promise<FeatureErrorLog[]> => {
    try {
      const response = await adminFeatureTogglesService.getFeatureErrors(query);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (err) {
      console.error("Error fetching feature errors:", err);
      return [];
    }
  };

  const importFeatures = async (features: FeatureToggle[], options: FeatureImportOptions) => {
    try {
      const response = await adminFeatureTogglesService.importFeatures(features, options);
      if (response.success) {
        showSuccess("Feature-Toggles erfolgreich importiert");
        await loadToggles(); // Reload the toggles
      }
    } catch (err) {
      showError("Fehler beim Importieren der Feature-Toggles");
      console.error("Error importing features:", err);
      throw err;
    }
  };

  // Helper to update enhanced features when toggles change
  const updateEnhancedFeatures = () => {
    // This is handled by the computed property enhancedFeatures
  };

  // Helper to update categories list
  const updateCategories = () => {
    // This is handled by the computed property categories
  };

=======
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
  const deleteToggle = async (toggleId: string) => {
    try {
      const response =
        await adminFeatureTogglesService.deleteFeatureToggle(toggleId);
      if (response.success) {
        toggles.value = toggles.value.filter((t) => t.id !== toggleId);
        showSuccess("Feature-Toggle wurde gelöscht");
      }
    } catch (err) {
      showError("Fehler beim Löschen des Feature-Toggles");
      console.error("Error deleting toggle:", err);
      throw err;
    }
  };

  // Initialisierung
  const initialize = async () => {
    await loadToggles();
  };

  // Legacy-Kompatibilität für FallbackManager
<<<<<<< HEAD
  const isFallbackActive = (_feature: string): boolean => {
=======
  const isFallbackActive = (feature: string): boolean => {
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    // In der Produktion gibt es keine Fallbacks mehr
    return false;
  };

  const setFallbackActive = (feature: string, active: boolean): void => {
    // Legacy-Methode, macht in Produktion nichts
    console.debug(`Legacy setFallbackActive called for ${feature}: ${active}`);
  };

  const recordError = (feature: string, error: any): void => {
    // Legacy-Methode für Fehleraufzeichnung
    console.error(`Feature error in ${feature}:`, error);
  };

<<<<<<< HEAD
  const getFeatureErrorsLegacy = (_feature: string): any[] => {
=======
  const getFeatureErrors = (feature: string): any[] => {
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    // Legacy-Methode, gibt leeres Array zurück
    return [];
  };

  const clearFeatureErrors = (feature: string): void => {
    // Legacy-Methode, macht in Produktion nichts
    console.debug(`Legacy clearFeatureErrors called for ${feature}`);
  };

  // Legacy-Kompatibilität Methoden
  const loadFeatureToggles = loadToggles;

  const setFallbackFeatures = () => {
    // In Produktion setzen wir Default-Features falls API fehlschlägt
    toggles.value = [
      {
        id: "rate-limiting",
        name: "API Rate Limiting",
        description: "Begrenzt API-Anfragen pro Benutzer zur Lastverteilung",
        enabled: true,
        category: "performance",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "advanced-caching",
        name: "Erweiterte Cache-Strategien",
        description: "Aktiviert intelligentes Caching für häufige Anfragen",
        enabled: true,
        category: "performance",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    isLoaded.value = true;
    console.info("Using fallback feature toggles");
  };

  return {
    // State
<<<<<<< HEAD
    toggles: enhancedFeatures, // Use enhancedFeatures for component compatibility
=======
    toggles,
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    isLoading,
    isLoaded,
    error,

    // Getters
    categories,
    enabledCount,
    disabledCount,
    togglesByCategory,
    features,

    // Actions
    loadToggles,
<<<<<<< HEAD
    loadFeatures,
    updateToggle,
    updateFeature,
    createToggle,
    createFeature,
    deleteToggle,
    deleteFeature,
    updateCategoryFeatures,
    getFeatureHistory,
    getFeatureMetrics,
    getFeatureErrors,
    importFeatures,
    updateEnhancedFeatures,
    updateCategories,
=======
    updateToggle,
    createToggle,
    deleteToggle,
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    initialize,
    isFeatureEnabled,

    // Legacy-Kompatibilität
    isFallbackActive,
    setFallbackActive,
    recordError,
<<<<<<< HEAD
    clearFeatureErrors,
    getFeatureErrorsLegacy,
=======
    getFeatureErrors,
    clearFeatureErrors,
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    loadFeatureToggles, // Alias für loadToggles
    setFallbackFeatures,
  };
});
