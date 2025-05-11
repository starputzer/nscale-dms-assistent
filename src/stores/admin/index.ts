/**
 * Zentraler Admin Store
 * Koordiniert die verschiedenen Admin-Module und -Funktionalitäten
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useAdminUsersStore } from "./users";
import { useAdminSystemStore } from "./system";
import { useAdminFeedbackStore } from "./feedback";
import { useAdminMotdStore } from "./motd";
import { useFeatureTogglesStore } from "../featureToggles";

// Definiert die möglichen Admin-Bereiche
export type AdminSection =
  | "dashboard"
  | "users"
  | "feedback"
  | "motd"
  | "system"
  | "logs"
  | "featureToggles";

export const useAdminStore = defineStore("admin", () => {
  // State
  const currentSection = ref<AdminSection>("dashboard");
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Module-Stores
  const usersStore = useAdminUsersStore();
  const systemStore = useAdminSystemStore();
  const feedbackStore = useAdminFeedbackStore();
  const motdStore = useAdminMotdStore();
  const featureTogglesStore = useFeatureTogglesStore();

  // Status der einzelnen Bereiche
  const sectionStatus = computed(() => ({
    dashboard: {
      loading:
        systemStore.loading || usersStore.loading || feedbackStore.loading,
      error: systemStore.error || usersStore.error || feedbackStore.error,
    },
    users: {
      loading: usersStore.loading,
      error: usersStore.error,
      count: usersStore.totalUsers,
    },
    feedback: {
      loading: feedbackStore.loading,
      error: feedbackStore.error,
      count: feedbackStore.stats.total,
      negative: feedbackStore.stats.negative,
    },
    motd: {
      loading: motdStore.loading,
      error: motdStore.error,
      enabled: motdStore.config.enabled,
    },
    system: {
      loading: systemStore.loading,
      error: systemStore.error,
      status: systemStore.systemHealthStatus,
    },
    logs: {
      // Logs werden komponentenintern verwaltet
      loading: false,
      error: null,
    },
    featureToggles: {
      loading: false, // Der FeatureToggle-Store hat keine loading-Property
      error: null,
      count: Object.keys(featureTogglesStore.featureConfigs).length,
      enabled: Object.values(featureTogglesStore.allFeatureConfigs).filter(
        (f) => f.status.isActive,
      ).length,
    },
  }));

  // Gesamtstatus des Admin-Bereichs
  const overallStatus = computed(() => {
    // Prüfen, ob irgendein Bereich lädt
    const loading = Object.values(sectionStatus.value).some(
      (section) => section.loading,
    );

    // Prüfen, ob irgendein Bereich einen Fehler hat
    const hasError = Object.values(sectionStatus.value).some(
      (section) => section.error !== null && section.error !== undefined,
    );

    // Gesamtstatus zurückgeben
    return {
      loading,
      hasError,
    };
  });

  // Bereich wechseln
  function setCurrentSection(section: AdminSection) {
    currentSection.value = section;
    loadSectionData(section);
  }

  // Daten für einen bestimmten Bereich laden
  async function loadSectionData(section: AdminSection) {
    isLoading.value = true;
    error.value = null;

    try {
      switch (section) {
        case "dashboard":
          await Promise.all([
            systemStore.fetchStats(),
            usersStore.fetchUsers(),
            feedbackStore.fetchStats(),
          ]);
          break;
        case "users":
          await usersStore.fetchUsers();
          break;
        case "feedback":
          await Promise.all([
            feedbackStore.fetchStats(),
            feedbackStore.fetchNegativeFeedback(),
          ]);
          break;
        case "motd":
          await motdStore.fetchConfig();
          break;
        case "system":
          await systemStore.fetchStats();
          break;
        case "logs":
          // Logs-Daten werden in der Komponente geladen
          break;
        case "featureToggles":
          await featureTogglesStore.loadFeatureToggles();
          break;
      }
    } catch (err: any) {
      console.error(`Error loading data for section ${section}:`, err);
      error.value = err.message || `Fehler beim Laden des Bereichs ${section}`;
    } finally {
      isLoading.value = false;
    }
  }

  // Dashboard-Daten abrufen
  async function loadDashboardData() {
    await Promise.all([
      systemStore.fetchStats(),
      usersStore.fetchUsers(),
      feedbackStore.fetchStats(),
    ]);
  }

  // Daten neu laden
  async function refreshCurrentSection() {
    await loadSectionData(currentSection.value);
  }

  // Alle Admin-Daten neu laden
  async function refreshAllData() {
    isLoading.value = true;
    error.value = null;

    try {
      await Promise.all([
        systemStore.fetchStats(),
        usersStore.fetchUsers(),
        feedbackStore.fetchStats(),
        feedbackStore.fetchNegativeFeedback(),
        motdStore.fetchConfig(),
        featureTogglesStore.loadFeatureToggles(),
      ]);
    } catch (err: any) {
      console.error("Error refreshing all admin data:", err);
      error.value =
        err.message || "Fehler beim Aktualisieren aller Admin-Daten";
    } finally {
      isLoading.value = false;
    }
  }

  return {
    // State
    currentSection,
    isLoading,
    error,

    // Getters
    sectionStatus,
    overallStatus,

    // Actions
    setCurrentSection,
    loadSectionData,
    loadDashboardData,
    refreshCurrentSection,
    refreshAllData,
  };
});
