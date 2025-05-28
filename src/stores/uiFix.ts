import { defineStore } from "pinia";
import { computed, ref, watch, onUnmounted } from "vue";
import { v4 as uuidv4 } from "uuid";
import type {
  Modal,
  Toast,
  SidebarState,
  ViewMode,
  UIState,
  LayoutConfig,
  NotificationOptions,
} from "../types/ui";

/**
 * FIX: UI Store mit korrigierter Initialisierung und Fehlerbehandlung
 */
export const useUIStore = defineStore(
  "ui",
  () => {
    // UI State mit Standardwerten
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
    });

    // Initialisierung mit Fehlerbehandlung
    function initialize() {
      try {
        // Viewport check
        checkViewport();
        window.addEventListener("resize", checkViewport);

        // Dunkelmodus aus localStorage laden
        const savedDarkMode = localStorage.getItem("ui:darkMode");
        if (savedDarkMode !== null) {
          try {
            darkMode.value = JSON.parse(savedDarkMode);
          } catch (e) {
            console.warn("Fehler beim Laden des Dark Mode:", e);
            darkMode.value = false;
          }
        }

        // System-Präferenz für Dark Mode
        const prefersDarkMode = window.matchMedia(
          "(prefers-color-scheme: dark)",
        );
        if (savedDarkMode === null && prefersDarkMode.matches) {
          darkMode.value = true;
        }

        // Änderungen der System-Präferenz beobachten
        prefersDarkMode.addEventListener("change", (e) => {
          if (localStorage.getItem("ui:darkMode") === null) {
            darkMode.value = e.matches;
          }
        });

        return () => {
          window.removeEventListener("resize", checkViewport);
        };
      } catch (error) {
        console.error("Fehler bei der UI-Store-Initialisierung:", error);
        return () => {};
      }
    }

    // Viewport prüfen
    function checkViewport() {
      isMobile.value = window.innerWidth < 768;
      if (isMobile.value && sidebar.value.isOpen) {
        sidebar.value.isOpen = false;
      }
    }

    // Dark Mode anwenden
    function applyDarkMode() {
      if (darkMode.value) {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
      }

      // Custom Event auslösen
      window.dispatchEvent(
        new CustomEvent("nscale:ui:darkModeChanged", {
          detail: { darkMode: darkMode.value },
        }),
      );
    }

    // Watch für Dark Mode - mit Fehlerbehandlung
    watch(darkMode, (newValue) => {
      try {
        localStorage.setItem("ui:darkMode", JSON.stringify(newValue));
        applyDarkMode();
      } catch (error) {
        console.error("Fehler beim Speichern des Dark Mode:", error);
      }
    });

    // Initialisierung
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

      // Actions
      initialize,
      checkViewport,
      applyDarkMode,
    };
  },
  {
    // Vereinfachte Persistenz ohne komplexe Hydration
    persist: false,
  },
);
