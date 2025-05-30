import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { v4 as uuidv4 } from "uuid";
import type {
  Modal,
  Toast,
  SidebarState,
  ViewMode,
  LayoutConfig,
  NotificationOptions,
} from "../types/ui";

/**
 * UI Store zur Verwaltung der Benutzeroberfläche
 * - Steuert UI-Zustände wie Sidebar, Dark Mode, Modals
 * - Verwaltet Toast-Benachrichtigungen und Dialoge
 * - Responsive Layout-Verwaltung
 * - Optimierte Theme-Anwendung
 * - Effizienter Reaktivitätsfluss für UI-Elemente
 */
export const useUIStore = defineStore(
  "ui",
  () => {
    // UI State mit sicherer Initialisierung
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
      density: "comfortable", // UI-Dichte (compact, comfortable, spacious)
    });

    // Performance-Optimierung für UI-Update-Batching
    const pendingUIUpdates = ref<Set<string>>(new Set());
    const isUpdatingUI = ref<boolean>(false);
    const mainLayoutElement = ref<HTMLElement | null>(null);

    // Getters
    const isDarkMode = computed(() => darkMode.value);
    const sidebarIsOpen = computed(
      () => sidebar.value.isOpen && !sidebar.value.collapsed,
    );
    const sidebarIsCollapsed = computed(() => sidebar.value.collapsed);
    const currentViewMode = computed(() => viewMode.value);
    const hasActiveModals = computed(() => activeModals.value.length > 0);
    const isCompactMode = computed(
      () => layoutConfig.value.density === "compact",
    );

    // Berechnete UI-Konfigurationen basierend auf dem aktuellen Zustand
    const effectiveLayoutConfig = computed(() => {
      // Mobil-spezifische Anpassungen
      if (isMobile.value) {
        return {
          ...layoutConfig.value,
          sidebarWidth: "100%", // Vollbildsidebar auf mobilen Geräten
          contentMaxWidth: "100%",
          splitPaneEnabled: false, // Keine Split-Ansicht auf mobilen Geräten
        };
      }

      // Spezifische Anpassungen basierend auf dem View-Modus
      if (viewMode.value === "focus") {
        return {
          ...layoutConfig.value,
          headerVisible: false,
          footerVisible: false,
          sidebarVisible: false,
        };
      }

      if (viewMode.value === "compact") {
        return {
          ...layoutConfig.value,
          density: "compact",
          textScale: 0.9,
        };
      }

      if (viewMode.value === "presentation") {
        return {
          ...layoutConfig.value,
          textScale: 1.2,
          density: "spacious",
          contentMaxWidth: "90%",
        };
      }

      return layoutConfig.value;
    });

    // CSS-Variablen basierend auf der Layout-Konfiguration
    const cssVariables = computed(() => {
      const config = effectiveLayoutConfig.value;
      return {
        "--sidebar-width": sidebar.value.collapsed
          ? "60px"
          : `${sidebar.value.width}px`,
        "--navbar-height": config.navbarHeight,
        "--footer-height": config.footerHeight,
        "--content-max-width": config.contentMaxWidth,
        "--text-scale": config.textScale.toString(),
        "--ui-spacing":
          config.density === "compact"
            ? "0.5rem"
            : config.density === "spacious"
              ? "1.5rem"
              : "1rem",
        "--ui-element-padding":
          config.density === "compact"
            ? "0.25rem 0.5rem"
            : config.density === "spacious"
              ? "0.75rem 1.5rem"
              : "0.5rem 1rem",
      };
    });

    /**
     * Bündelt mehrere UI-Updates für bessere Performance
     */
    function batchUIUpdates() {
      if (isUpdatingUI.value || pendingUIUpdates.value.size === 0) return;

      isUpdatingUI.value = true;

      // Alle ausstehenden UI-Updates durchführen
      setTimeout(() => {
        // CSS-Variablen aktualisieren
        Object.entries(cssVariables.value).forEach(([key, value]: any) => {
          document.documentElement.style.setProperty(key, value);
        });

        // Dark-Mode und andere CSS-Klassen anwenden
        applyDarkMode();

        pendingUIUpdates.value.clear();
        isUpdatingUI.value = false;

        // Überprüfen, ob neue Updates während der Verarbeitung eingetroffen sind
        if (pendingUIUpdates.value.size > 0) {
          batchUIUpdates();
        }
      }, 0);
    }

    /**
     * UI-Update anfordern (gebündelt für Performance)
     */
    function requestUIUpdate(updateType: string) {
      pendingUIUpdates.value.add(updateType);
      if (!isUpdatingUI.value) {
        batchUIUpdates();
      }
    }

    /**
     * Migration von Legacy-Daten
     */
    function migrateFromLegacyStorage(): void {
      try {
        // Dark Mode-Einstellung migrieren
        const legacyDarkMode = localStorage.getItem("nscale_darkMode");

        if (legacyDarkMode !== null) {
          darkMode.value = legacyDarkMode === "true";
        }

        // Sidebar-Einstellungen migrieren
        const legacySidebarWidth = localStorage.getItem("nscale_sidebarWidth");
        const legacySidebarOpen = localStorage.getItem("nscale_sidebarOpen");

        if (legacySidebarWidth !== null) {
          sidebar.value.width = parseInt(legacySidebarWidth, 10);
        }

        if (legacySidebarOpen !== null) {
          sidebar.value.isOpen = legacySidebarOpen === "true";
        }

        // View Mode migrieren
        const legacyViewMode = localStorage.getItem("nscale_viewMode");

        if (
          legacyViewMode !== null &&
          (legacyViewMode === "default" ||
            legacyViewMode === "compact" ||
            legacyViewMode === "expanded")
        ) {
          viewMode.value = legacyViewMode as ViewMode;
        }

        console.log("UI-Einstellungen aus Legacy-Speicher migriert");
      } catch (error) {
        console.error("Fehler bei der Migration von UI-Daten:", error);
      }
    }

    /**
     * Dark Mode umschalten
     */
    function toggleDarkMode(): void {
      darkMode.value = !darkMode.value;
      requestUIUpdate("darkMode");
    }

    /**
     * Dark Mode aktivieren
     */
    function enableDarkMode(): void {
      darkMode.value = true;
      requestUIUpdate("darkMode");
    }

    /**
     * Dark Mode deaktivieren
     */
    function disableDarkMode(): void {
      darkMode.value = false;
      requestUIUpdate("darkMode");
    }

    /**
     * Dark Mode anwenden
     */
    function applyDarkMode(): void {
      if (darkMode.value) {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
      }
    }

    /**
     * UI-Dichte anpassen
     */
    function setUIDensity(
      density: "compact" | "comfortable" | "spacious",
    ): void {
      layoutConfig.value.density = density;
      requestUIUpdate("layout");
    }

    /**
     * Text-Skalierung anpassen
     */
    function setTextScale(scale: number): void {
      // Beschränken auf sinnvolle Werte
      layoutConfig.value.textScale = Math.max(0.8, Math.min(1.4, scale));
      requestUIUpdate("layout");
    }

    /**
     * Ansicht umschalten
     */
    function setViewMode(mode: ViewMode): void {
      viewMode.value = mode;
      requestUIUpdate("viewMode");
    }

    /**
     * Vollbildmodus umschalten
     */
    function toggleFullscreen(): void {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.error(
            `Fehler beim Aktivieren des Vollbildmodus: ${err.message}`,
          );
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }

    /**
     * Sidebar öffnen
     */
    function openSidebar(): void {
      sidebar.value.isOpen = true;
      sidebar.value.collapsed = false;
      requestUIUpdate("sidebar");
    }

    /**
     * Sidebar schließen
     */
    function closeSidebar(): void {
      sidebar.value.isOpen = false;
      requestUIUpdate("sidebar");
    }

    /**
     * Sidebar umschalten
     */
    function toggleSidebar(): void {
      sidebar.value.isOpen = !sidebar.value.isOpen;
      requestUIUpdate("sidebar");
    }

    /**
     * Sidebar-Zuklapp-Modus umschalten
     */
    function toggleSidebarCollapse(): void {
      sidebar.value.collapsed = !sidebar.value.collapsed;

      // Wenn ausgeklappt, sicherstellen, dass die Sidebar geöffnet ist
      if (!sidebar.value.collapsed) {
        sidebar.value.isOpen = true;
      }

      requestUIUpdate("sidebar");
    }

    /**
     * Sidebar-Breite ändern
     */
    function setSidebarWidth(width: number): void {
      // Minimal- und Maximalbreite begrenzen
      const newWidth = Math.max(180, Math.min(500, width));
      sidebar.value.width = newWidth;
      requestUIUpdate("sidebar");
    }

    /**
     * Sidebar-Tab ändern
     */
    function setSidebarTab(tabId: string): void {
      sidebar.value.activeTab = tabId;

      // Sidebar öffnen, wenn sie geschlossen ist
      if (!sidebar.value.isOpen) {
        sidebar.value.isOpen = true;
        sidebar.value.collapsed = false;
      }

      requestUIUpdate("sidebar");
    }

    /**
     * Modal öffnen
     */
    function openModal(modalData: Omit<Modal, "id">): string {
      const id = uuidv4();
      const modal: Modal = {
        id,
        ...modalData,
      };

      activeModals.value.push(modal);
      return id;
    }

    /**
     * Modal schließen
     */
    function closeModal(modalId: string): void {
      activeModals.value = activeModals.value.filter(
        (modal) => modal.id !== modalId,
      );
    }

    /**
     * Alle Modals schließen
     */
    function closeAllModals(): void {
      activeModals.value = [];
    }

    /**
     * Einfache Bestätigungsdialog anzeigen
     */
    function confirm(
      message: string,
      options: {
        title?: string;
        confirmText?: string;
        cancelText?: string;
        variant?: "info" | "warning" | "danger";
      } = {},
    ): Promise<boolean> {
      return new Promise((resolve) => {
        const id = openModal({
          component: "ConfirmDialog",
          title: options.title || "Bestätigung",
          props: {
            message,
            confirmText: options.confirmText || "Bestätigen",
            cancelText: options.cancelText || "Abbrechen",
            variant: options.variant || "info",
            onConfirm: () => {
              closeModal(id);
              resolve(true);
            },
            onCancel: () => {
              closeModal(id);
              resolve(false);
            },
          },
          options: {
            closeOnOverlayClick: true,
          },
        });
      });
    }

    /**
     * Eingabedialog anzeigen
     */
    function prompt<T = string>(
      message: string,
      options: {
        title?: string;
        defaultValue?: T;
        confirmText?: string;
        cancelText?: string;
        validator?: (value: T) => boolean | string;
      } = {},
    ): Promise<T | null> {
      return new Promise((resolve) => {
        const id = openModal({
          component: "PromptDialog",
          title: options.title || "Eingabe",
          props: {
            message,
            defaultValue: options.defaultValue,
            confirmText: options.confirmText || "Bestätigen",
            cancelText: options.cancelText || "Abbrechen",
            validator: options.validator,
            onConfirm: (value: T) => {
              closeModal(id);
              resolve(value);
            },
            onCancel: () => {
              closeModal(id);
              resolve(null);
            },
          },
          options: {
            closeOnOverlayClick: false,
          },
        });
      });
    }

    /**
     * Toast anzeigen
     */
    function showToast(toast: Omit<Toast, "id">): string {
      const id = uuidv4();
      const newToast: Toast = {
        id,
        closable: true,
        duration: 5000, // 5 Sekunden Standard
        ...toast,
      };

      // Limit der Anzahl von Toasts (verhindert Überflutung)
      if (toasts.value.length >= 5) {
        // Ältesten Toast entfernen
        const oldestToast = toasts.value[0];
        toasts.value = toasts.value.slice(1);

        // Falls der älteste Toast eine Schließen-Animation hat, diese auslösen
        const toastElement = document.getElementById(`toast-${oldestToast.id}`);
        if (toastElement) {
          toastElement.classList.add("toast-exit");
          // Animation abwarten, bevor Element entfernt wird
          setTimeout(() => {
            toasts.value = toasts.value.filter(
              (t: any) => t.id !== oldestToast.id,
            );
          }, 300);
        }
      }

      toasts.value.push(newToast);

      // Toast nach Ablauf der Zeit automatisch entfernen
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, newToast.duration);
      }

      return id;
    }

    /**
     * Toast entfernen
     */
    function dismissToast(toastId: string): void {
      // Elegante Animation beim Entfernen
      const toastElement = document.getElementById(`toast-${toastId}`);
      if (toastElement) {
        toastElement.classList.add("toast-exit");
        // Animation abwarten, bevor Element entfernt wird
        setTimeout(() => {
          toasts.value = toasts.value.filter(
            (toast: any) => toast.id !== toastId,
          );
        }, 300);
      } else {
        // Falls DOM-Element nicht gefunden, direkt entfernen
        toasts.value = toasts.value.filter(
          (toast: any) => toast.id !== toastId,
        );
      }
    }

    /**
     * Erfolgsmeldung anzeigen
     */
    function showSuccess(
      message: string,
      options?: Partial<NotificationOptions>,
    ): string {
      return showToast({
        type: "success",
        message,
        ...(options || {}),
      });
    }

    /**
     * Fehlermeldung anzeigen
     */
    function showError(
      message: string,
      options?: Partial<NotificationOptions>,
    ): string {
      return showToast({
        type: "error",
        message,
        duration: 8000, // Fehlermeldungen länger anzeigen
        ...(options || {}),
      });
    }

    /**
     * Warnmeldung anzeigen
     */
    function showWarning(
      message: string,
      options?: Partial<NotificationOptions>,
    ): string {
      return showToast({
        type: "warning",
        message,
        duration: 7000, // Warnungen etwas länger anzeigen
        ...(options || {}),
      });
    }

    /**
     * Infomeldung anzeigen
     */
    function showInfo(
      message: string,
      options?: Partial<NotificationOptions>,
    ): string {
      return showToast({
        type: "info",
        message,
        ...(options || {}),
      });
    }

    /**
     * Ladezustand setzen
     */
    function setLoading(loading: boolean, message?: string): void {
      isLoading.value = loading;

      // Loading-Indikator als UI-Element
      const loadingElement = document.getElementById(
        "global-loading-indicator",
      );
      if (loadingElement) {
        if (loading) {
          loadingElement.setAttribute("data-message", message || "");
          loadingElement.classList.add("is-active");
        } else {
          loadingElement.classList.remove("is-active");
        }
      }
    }

    /**
     * Viewport-Größe prüfen und entsprechend reagieren
     */
    function checkViewport(): void {
      const newIsMobile =
        window.innerWidth < layoutConfig.value.sidebarBreakpoint;

      // Nur reagieren, wenn sich der Status geändert hat
      if (newIsMobile !== isMobile.value) {
        isMobile.value = newIsMobile;

        // Sidebar auf mobilen Geräten automatisch schließen
        if (
          isMobile.value &&
          sidebar.value.isOpen &&
          !sidebar.value.collapsed
        ) {
          sidebar.value.isOpen = false;
          requestUIUpdate("sidebar");
        }
      }
    }

    /**
     * Responsives Layout-Verhalten einrichten
     */
    function setupResponsiveLayout(): void {
      // Initialen Viewport-Status feststellen
      checkViewport();

      // Event-Listener für Fenstergröße
      const debouncedCheckViewport = debounce(checkViewport, 250);
      window.addEventListener("resize", debouncedCheckViewport);

      // CSS-Variablen initialisieren
      Object.entries(cssVariables.value).forEach(([key, value]: any) => {
        document.documentElement.style.setProperty(key, value);
      });

      // Aufräumen, wenn der Store nicht mehr verwendet wird
      return () => {
        window.removeEventListener("resize", debouncedCheckViewport);
      };
    }

    /**
     * Einfache Debounce-Funktion für Event-Handling
     */
    function debounce<T extends (...args: any[]) => void>(
      func: T,
      wait: number,
    ): T {
      let timeout: number | null = null;

      return ((...args: Parameters<T>) => {
        if (timeout !== null) {
          window.clearTimeout(timeout);
        }

        timeout = window.setTimeout(() => func(...args), wait);
      }) as T;
    }

    /**
     * Dark Mode basierend auf Systemeinstellungen initialisieren
     */
    function initDarkMode(): void {
      try {
        // Sicherstellen, dass darkMode einen Wert hat
        if (darkMode.value === null || darkMode.value === undefined) {
          darkMode.value = false;
        }

        // Prüfen, ob der Benutzer bereits eine Präferenz gesetzt hat
        const savedPreference = localStorage.getItem("nscale_darkMode");

        if (savedPreference !== null) {
          try {
            darkMode.value = savedPreference === "true";
          } catch (e) {
            console.warn("Fehler beim Parsen der Dark Mode Einstellung:", e);
            darkMode.value = false;
          }
        } else {
          // Sonst System-Präferenz verwenden
          try {
            const prefersDark = window.matchMedia(
              "(prefers-color-scheme: dark)",
            ).matches;
            darkMode.value = prefersDark;
          } catch (e) {
            console.warn("Fehler beim Abrufen der System-Präferenz:", e);
            darkMode.value = false;
          }
        }

        requestUIUpdate("darkMode");

        // Auf Änderungen der System-Präferenz reagieren
        const darkModeMediaQuery = window.matchMedia(
          "(prefers-color-scheme: dark)",
        );
        const handleMediaQueryChange = (e: MediaQueryListEvent) => {
          // Nur ändern, wenn keine benutzerdefinierte Einstellung vorhanden ist
          if (localStorage.getItem("nscale_darkMode") === null) {
            darkMode.value = e.matches;
            requestUIUpdate("darkMode");
          }
        };

        darkModeMediaQuery.addEventListener("change", handleMediaQueryChange);

        // Aufräumen, wenn der Store nicht mehr verwendet wird
        return () => {
          darkModeMediaQuery.removeEventListener(
            "change",
            handleMediaQueryChange,
          );
        };
      } catch (error) {
        console.error("Fehler in initDarkMode:", error);
        return () => {};
      }
    }

    /**
     * Alle Einstellungen initialisieren und anwenden
     */
    function initialize(): void {
      try {
        // Sicherstellen, dass alle Werte initialisiert sind
        if (darkMode.value === undefined || darkMode.value === null) {
          darkMode.value = false;
        }

        if (!sidebar.value) {
          sidebar.value = {
            isOpen: true,
            width: 280,
            activeTab: "chat",
            collapsed: false,
          };
        }

        if (!layoutConfig.value) {
          layoutConfig.value = {
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
          };
        }

        migrateFromLegacyStorage();
        const cleanupDarkMode = initDarkMode();
        const cleanupLayout = setupResponsiveLayout();

        // Zur Verfügung stellen, um beim Zerstören des Stores aufzuräumen
        return () => {
          if (cleanupDarkMode) cleanupDarkMode();
          if (cleanupLayout) cleanupLayout();
        };
      } catch (error) {
        console.error("Fehler bei der Store-Initialisierung:", error);
        return () => {};
      }
    }

    // Bei Dark Mode-Änderungen speichern
    watch(darkMode, (newValue: any) => {
      localStorage.setItem("nscale_darkMode", String(newValue));
      requestUIUpdate("darkMode");
    });

    // Bei Sidebar-Änderungen speichern
    watch(
      () => sidebar.value,
      () => {
        requestUIUpdate("sidebar");
      },
      { deep: true },
    );

    // Bei ViewMode-Änderungen speichern
    watch(viewMode, () => {
      requestUIUpdate("viewMode");
    });

    // Bei Layout-Änderungen UI aktualisieren
    watch(
      () => layoutConfig.value,
      () => {
        requestUIUpdate("layout");
      },
      { deep: true },
    );

    // Store initialisieren
    const cleanup = initialize();

    // Event-Bus für System-Events
    const systemEvents = {
      emit(event: string, data?: any) {
        window.dispatchEvent(
          new CustomEvent(`nscale:ui:${event}`, { detail: data }),
        );
      },

      on<T = any>(event: string, callback: (data: T) => void) {
        const handler = (e: CustomEvent) => callback(e.detail);
        window.addEventListener(`nscale:ui:${event}`, handler as EventListener);
        return () =>
          window.removeEventListener(
            `nscale:ui:${event}`,
            handler as EventListener,
          );
      },
    };

    /**
     * Registriert das Haupt-Layout-Element für globalen Zugriff
     * @param element Das Haupt-Layout-Element
     */
    function registerLayoutElement(element: HTMLElement): void {
      mainLayoutElement.value = element;
      console.log("Layout-Element registriert");
    }

    /**
     * Entfernt das Haupt-Layout-Element aus der Registrierung
     */
    function unregisterLayoutElement(): void {
      mainLayoutElement.value = null;
      console.log("Layout-Element entfernt");
    }

    /**
     * Gibt das registrierte Layout-Element zurück
     */
    function getLayoutElement(): HTMLElement | null {
      return mainLayoutElement.value;
    }

    /**
     * Setzt eine CSS-Variable für das Layout-Element
     * @param name Name der CSS-Variable
     * @param value Wert der CSS-Variable
     */
    function setLayoutCssVariable(name: string, value: string): void {
      if (mainLayoutElement.value) {
        mainLayoutElement.value.style.setProperty(name, value);
      }
    }

    /**
     * Setzt den UI-Zustand zurück
     */
    function resetUIState(): void {
      sidebar.value = {
        isOpen: true,
        width: 280,
        activeTab: "chat",
        collapsed: false,
      };
      darkMode.value = false;
      viewMode.value = "default";
      activeModals.value = [];
      toasts.value = [];
      isLoading.value = false;
    }

    /**
     * Setzt die aktive Session
     * @param sessionId ID der Session
     */
    function setActiveSession(sessionId: string): void {
      // Implementierung folgt - momentan nur Stub
      console.log("Setting active session:", sessionId);
    }

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
      sidebarIsCollapsed,
      currentViewMode,
      hasActiveModals,
      isCompactMode,
      effectiveLayoutConfig,
      cssVariables,

      // UI Actions
      toggleDarkMode,
      enableDarkMode,
      disableDarkMode,
      setViewMode,
      toggleFullscreen,
      openSidebar,
      closeSidebar,
      toggleSidebar,
      toggleSidebarCollapse,
      setSidebarWidth,
      setSidebarTab,
      setUIDensity,
      setTextScale,

      // Modal Actions
      openModal,
      closeModal,
      closeAllModals,
      confirm,
      prompt,

      // Toast Actions
      showToast,
      dismissToast,
      showSuccess,
      showError,
      showWarning,
      showInfo,

      // Layout Actions
      registerLayoutElement,
      unregisterLayoutElement,
      getLayoutElement,
      setLayoutCssVariable,
      resetUIState,
      setActiveSession,

      // System Actions
      setLoading,
      checkViewport,
      requestUIUpdate,
      initialize,
      systemEvents,
      cleanup,
    };
  },
  {
    // Persistenz-Konfiguration für den Store
    persist: {
      enabled: true,
      strategies: [
        {
          // UI-Einstellungen im localStorage speichern
          storage: localStorage,
          paths: ["darkMode", "viewMode", "sidebar", "layoutConfig", "version"],
          // Fehlerbehandlung bei der Hydration
          beforeRestore: (context: any) => {
            console.log("UI Store Hydration beginnt...");
          },
          afterRestore: (context: any) => {
            console.log("UI Store Hydration abgeschlossen");
            // Sicherstellen, dass alle Werte initialisiert sind
            if (context.store.darkMode === undefined) {
              context.store.darkMode = false;
            }
            if (context.store.sidebar === undefined) {
              context.store.sidebar = {
                isOpen: true,
                width: 280,
                activeTab: "chat",
                collapsed: false,
              };
            }
          },
        },
      ],
    },
  },
);
