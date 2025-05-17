/**
 * Pinia Store für MOTD-Administration (Message of the Day)
 * Teil der Vue 3 SFC Migration (08.05.2025)
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { MotdConfig } from "@/types/admin";

export const useMotdStore = defineStore("motd", () => {
  // State
  const config = ref<MotdConfig>({
    enabled: true,
    format: "markdown",
    content: "🛠️ **PURE VUE MODE AKTIV**\n\nDieser Assistent läuft im reinen Vue-Modus ohne Backend-Verbindung. Alle Antworten werden mit lokaler Mock-Logik generiert.",
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

  // Funktionen
  function dismiss() {
    dismissed.value = true;
  }

  function resetDismissed() {
    dismissed.value = false;
  }

  function saveConfig(newConfig: MotdConfig) {
    config.value = {
      ...newConfig
    };
    editConfig.value = JSON.parse(JSON.stringify(config.value));
  }

  return {
    // State
    config,
    editConfig,
    dismissed,

    // Funktionen
    dismiss,
    resetDismissed,
    saveConfig
  };
});

// Für Legacy-Code auch als useAdminMotdStore exportieren
export const useAdminMotdStore = useMotdStore;