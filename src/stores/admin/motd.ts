/**
 * Pinia Store für MOTD-Administration (Message of the Day)
 * Teil der Vue 3 SFC Migration (08.05.2025)
 * Mit API-Integration über AdminMotdService
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { MotdConfig } from "@/types/admin";
import { parseMarkdown } from "@/utils/markdown";
import { adminMotdService } from "@/services/api/adminServices";
import { shouldUseRealApi } from "@/config/api-flags";

export const useMotdStore = defineStore("motd", () => {
  // State
  const config = ref<MotdConfig>({
    enabled: true,
    format: "markdown",
    content:
      "🛠️ **PURE VUE MODE AKTIV**\n\nDieser Assistent läuft im reinen Vue-Modus ohne Backend-Verbindung. Alle Antworten werden mit lokaler Mock-Logik generiert.",
    style: {
      backgroundColor: "#d1ecf1",
      borderColor: "#bee5eb",
      textColor: "#0c5460",
      iconClass: "info-circle",
    },
    display: {
      position: "top",
      dismissible: true,
      showOnStartup: true,
      showInChat: true,
    },
  });

  const editConfig = ref<MotdConfig>(JSON.parse(JSON.stringify(config.value)));
  const dismissed = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const previewMode = ref(false);

  // For tracking unsaved changes
  const savedConfigJSON = ref(JSON.stringify(config.value));

  // Computed properties
  const hasUnsavedChanges = computed(() => {
    return JSON.stringify(config.value) !== savedConfigJSON.value;
  });

  const previewHtml = computed(() => {
    const content = config.value.content || "";

    if (config.value.format === "markdown") {
      // Use markdown parser utility
      return parseMarkdown(content);
    } else if (config.value.format === "html") {
      return content;
    } else {
      // Plain text - convert newlines to <br>
      return content.replace(/\n/g, "<br>");
    }
  });

  // Check if MOTD should be shown in chat
  const shouldShowInChat = computed(() => {
    return config.value.enabled && config.value.display?.showInChat !== false;
  });

  // Funktionen
  function dismiss() {
    dismissed.value = true;
  }

  function resetDismissed() {
    dismissed.value = false;
  }

  async function saveConfig(newConfig: MotdConfig) {
    loading.value = true;
    error.value = null;

    try {
      // Konfiguration aktualisieren über den AdminMotdService
      if (shouldUseRealApi("useRealMotdApi")) {
        console.log("[MotdStore] Speichere MOTD-Konfiguration über API");
        const response = await adminMotdService.updateMotdConfig(newConfig);

        if (!response.success) {
          throw new Error(
            response.message || "Fehler beim Speichern der MOTD-Konfiguration",
          );
        }
      }

      // Lokalen Zustand aktualisieren
      config.value = {
        ...newConfig,
      };
      editConfig.value = JSON.parse(JSON.stringify(config.value));
      savedConfigJSON.value = JSON.stringify(config.value);

      // Erfolgslog
      console.log("[MotdStore] MOTD-Konfiguration erfolgreich gespeichert");

      return true;
    } catch (err: any) {
      console.error(
        "[MotdStore] Fehler beim Speichern der MOTD-Konfiguration:",
        err,
      );
      error.value =
        err.message || "Fehler beim Speichern der MOTD-Konfiguration";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function updateConfig(newConfig: MotdConfig) {
    config.value = {
      ...newConfig,
    };
  }

  function resetConfig() {
    const savedConfig = JSON.parse(savedConfigJSON.value);
    config.value = {
      ...savedConfig,
    };
  }

  function togglePreviewMode() {
    previewMode.value = !previewMode.value;
  }

  // Implementierung der fetchConfig-Funktion für die Admin-MOTD-Komponente
  // mit robuster Fehlerbehandlung und fallback zu vorhandenen Daten
  async function fetchConfig() {
    loading.value = true;
    error.value = null;

    try {
      console.log("[MotdStore] Lade MOTD-Konfiguration");

      // AdminMotdService für API-Kommunikation verwenden
      const response = await adminMotdService.getMotdConfig();

      if (response.success && response.data) {
        console.log(
          "[MotdStore] MOTD-Konfiguration erfolgreich geladen:",
          response.data,
        );

        // Sicheres Update mit sauberer Fehlermeldung
        try {
          // Konfiguration aktualisieren
          config.value = response.data;

          // Tiefe Kopie der Konfiguration erstellen
          editConfig.value = {
            enabled: config.value.enabled ?? true,
            format: config.value.format ?? "markdown",
            content: config.value.content ?? "",
            style: {
              backgroundColor: config.value.style?.backgroundColor ?? "#d1ecf1",
              borderColor: config.value.style?.borderColor ?? "#bee5eb",
              textColor: config.value.style?.textColor ?? "#0c5460",
              iconClass: config.value.style?.iconClass ?? "info-circle",
            },
            display: {
              position: config.value.display?.position ?? "top",
              dismissible: config.value.display?.dismissible ?? true,
              showOnStartup: config.value.display?.showOnStartup ?? true,
              showInChat: config.value.display?.showInChat ?? true,
            },
          };

          savedConfigJSON.value = JSON.stringify(config.value);
        } catch (updateError) {
          console.error(
            "[MotdStore] Fehler beim Aktualisieren der MOTD-Konfiguration:",
            updateError,
          );
          error.value = "Fehler beim Aktualisieren der MOTD-Konfiguration";
        }
      } else {
        console.warn(
          "[MotdStore] Fehler beim Laden der MOTD-Konfiguration:",
          response.message || "Unbekannter Fehler",
        );
        error.value =
          response.message || "Fehler beim Laden der MOTD-Konfiguration";
      }

      return config.value;
    } catch (err: any) {
      console.error(
        "[MotdStore] Fehler beim Laden der MOTD-Konfiguration:",
        err,
      );
      error.value = err.message || "Fehler beim Laden der MOTD-Konfiguration";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // MOTD neu laden
  async function reloadMotd() {
    loading.value = true;
    error.value = null;

    try {
      console.log("[MotdStore] Lade MOTD neu");

      // AdminMotdService für API-Kommunikation verwenden
      const response = await adminMotdService.reloadMotd();

      if (response.success) {
        console.log("[MotdStore] MOTD erfolgreich neu geladen");

        // Konfiguration nach dem Neuladen aktualisieren
        await fetchConfig();

        return true;
      } else {
        error.value = response.message || "Fehler beim Neuladen der MOTD";
        return false;
      }
    } catch (err: any) {
      console.error("[MotdStore] Fehler beim Neuladen der MOTD:", err);
      error.value = err.message || "Fehler beim Neuladen der MOTD";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    config,
    editConfig,
    dismissed,
    loading,
    error,
    previewMode,

    // Computed
    hasUnsavedChanges,
    previewHtml,
    shouldShowInChat,

    // Funktionen
    dismiss,
    resetDismissed,
    saveConfig,
    updateConfig,
    resetConfig,
    togglePreviewMode,
    fetchConfig,
    reloadMotd, // Neue Funktion
  };
});

// Für Legacy-Code auch als useAdminMotdStore exportieren
export const useAdminMotdStore = useMotdStore;
