/**
 * Admin-spezifischer Feature-Toggle-Store für die Admin-Oberfläche
 * Kapselt die Interaktion mit dem API und dem Haupt-Feature-Toggles-Store
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useFeatureTogglesStore } from "@/stores/featureToggles";
import { adminApi } from "@/services/api/admin";

export const useAdminFeatureTogglesStore = defineStore(
  "adminFeatureToggles",
  () => {
    // State
    const toggles = ref<
      Array<{
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        environment: string;
        created_at: number;
      }>
    >([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    // Main feature toggle store
    const featureToggleStore = useFeatureTogglesStore();

    // Computed
    const stableToggles = computed(() => {
      return toggles.value.filter((toggle: any) => {
        const featureConfig = featureToggleStore.allFeatureConfigs[toggle.id];
        return featureConfig?.status.isStable || false;
      });
    });

    const experimentalToggles = computed(() => {
      return toggles.value.filter((toggle: any) => {
        const featureConfig = featureToggleStore.allFeatureConfigs[toggle.id];
        return !featureConfig?.status.isStable || false;
      });
    });

    // Actions
    const fetchToggles = async () => {
      loading.value = true;
      error.value = null;

      try {
        const response = await adminApi.getFeatureToggles();
        toggles.value = response.data.toggles;

        // Sync with main feature toggle store if needed
        syncWithFeatureToggleStore();
      } catch (err: any) {
        console.error("Error fetching feature toggles:", err);
        error.value = err.message || "Fehler beim Laden der Feature-Toggles";

        // Fallback to main feature toggle store data
        fallbackToMainStore();
      } finally {
        loading.value = false;
      }
    };

    const updateToggle = async (id: string, data: { enabled: boolean }) => {
      loading.value = true;
      error.value = null;

      try {
        await adminApi.updateFeatureToggle(id, data);

        // Update local state
        const index = toggles.value.findIndex((toggle) => toggle.id === id);
        if (index > -1) {
          toggles.value[index] = {
            ...toggles.value[index],
            ...data,
          };
        }

        // Sync with main feature toggle store
        syncToggleWithFeatureToggleStore(id, data.enabled);
      } catch (err: any) {
        console.error(`Error updating feature toggle ${id}:`, err);
        error.value =
          err.message || "Fehler beim Aktualisieren des Feature-Toggles";
        throw err;
      } finally {
        loading.value = false;
      }
    };

    const createToggle = async (
      data: Omit<(typeof toggles.value)[0], "id" | "created_at">,
    ) => {
      loading.value = true;
      error.value = null;

      try {
        const response = await adminApi.createFeatureToggle(data);

        // Add to local state
        toggles.value.push(response.data);

        // Sync with main feature toggle store
        const newToggle = response.data;
        syncToggleWithFeatureToggleStore(newToggle.id, newToggle.enabled);

        return response.data;
      } catch (err: any) {
        console.error("Error creating feature toggle:", err);
        error.value =
          err.message || "Fehler beim Erstellen des Feature-Toggles";
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // Private helper methods
    const syncWithFeatureToggleStore = () => {
      // Update main store with any toggles from admin API
      toggles.value.forEach((toggle: any) => {
        syncToggleWithFeatureToggleStore(toggle.id, toggle.enabled);
      });
    };

    const syncToggleWithFeatureToggleStore = (id: string, enabled: boolean) => {
      // Only sync if the toggle exists in the main store
      if (id in featureToggleStore.features) {
        featureToggleStore.setFeature(id, enabled);
      }
    };

    const fallbackToMainStore = () => {
      // Create toggles array from main feature toggle store
      const mainStoreFeatures = featureToggleStore.enhancedFeatures;

      toggles.value = mainStoreFeatures.map((feature: any) => ({
        id: feature.key,
        name: feature.name,
        description: feature.description || "",
        enabled: feature.enabled,
        environment: "production", // Default
        created_at: Date.now() / 1000 - 30 * 24 * 60 * 60, // Default to 30 days ago
      }));
    };

    return {
      // State
      toggles,
      loading,
      error,

      // Computed
      stableToggles,
      experimentalToggles,

      // Actions
      fetchToggles,
      updateToggle,
      createToggle,
    };
  },
);
