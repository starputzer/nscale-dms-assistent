import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { adminFeatureTogglesService } from "@/services/api/adminServices";
import { useToast } from "@/composables/useToast";

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
}

export const useFeatureTogglesStore = defineStore("featureToggles", () => {
  const { showSuccess, showError } = useToast();

  // State
  const toggles = ref<ProductionFeatureToggle[]>([]);
  const isLoading = ref(false);
  const isLoaded = ref(false);
  const error = ref<string | null>(null);

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
          : response.data.toggles || [];
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
        toggles.value.push(response.data);
        showSuccess("Feature-Toggle wurde erstellt");
      }
    } catch (err) {
      showError("Fehler beim Erstellen des Feature-Toggles");
      console.error("Error creating toggle:", err);
      throw err;
    }
  };

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
  const isFallbackActive = (feature: string): boolean => {
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

  const getFeatureErrors = (feature: string): any[] => {
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
    toggles,
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
    updateToggle,
    createToggle,
    deleteToggle,
    initialize,
    isFeatureEnabled,

    // Legacy-Kompatibilität
    isFallbackActive,
    setFallbackActive,
    recordError,
    getFeatureErrors,
    clearFeatureErrors,
    loadFeatureToggles, // Alias für loadToggles
    setFallbackFeatures,
  };
});
