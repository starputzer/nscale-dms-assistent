import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type {
  Modal,
  Toast,
  SidebarState,
  ViewMode,
  UIState,
  LayoutConfig,
} from "../types/ui";

/**
 * Vereinfachter UI Store ohne Bridge-Abhängigkeiten
 */
export const useUIStore = defineStore(
  "ui",
  () => {
    // UI State
    const sidebar = ref<SidebarState>({
      isOpen: true,
      width: 280,
      activeTab: "chat",
      collapsed: false,
    });

    const darkMode = ref<boolean>(false);
    const viewMode = ref<ViewMode>("default");
    const activeModals = ref<Modal[]>([]);
    const toasts = ref<Toast[]>([]);
    const isLoading = ref<boolean>(false);
    const isMobile = ref<boolean>(false);
    const version = ref<number>(2);
    const layoutConfig = ref<LayoutConfig>({
      contentMaxWidth: "1200px",
      navbarHeight: "60px",
      footerHeight: "40px",
      headerVisible: true,
      footerVisible: true,
      splitPaneEnabled: false,
      splitPaneRatio: 50,
      sidebarBreakpoint: 768,
      textScale: 1,
      density: "comfortable",
    });

    // Simple Getters
    const isDarkMode = computed(() => darkMode.value);
    const sidebarIsOpen = computed(() => sidebar.value.isOpen);
    const currentViewMode = computed(() => viewMode.value);

    // Simple Actions
    function toggleDarkMode() {
      darkMode.value = !darkMode.value;
    }

    function toggleSidebar() {
      sidebar.value.isOpen = !sidebar.value.isOpen;
    }

    function setLoading(value: boolean) {
      isLoading.value = value;
    }

    // Simple initialization
    function initialize() {
      // Check viewport
      isMobile.value = window.innerWidth < 768;

      // Apply dark mode
      if (darkMode.value) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }

    // Initialize on store creation
    initialize();

    return {
      // State
      sidebar,
      darkMode,
      viewMode,
      activeModals,
      toasts,
      isLoading,
      isMobile,
      version,
      layoutConfig,

      // Getters
      isDarkMode,
      sidebarIsOpen,
      currentViewMode,

      // Actions
      toggleDarkMode,
      toggleSidebar,
      setLoading,
      initialize,
    };
  },
  {
    // Keine Persistenz vorerst
    persist: false,
  },
);
