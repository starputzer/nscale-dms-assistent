/**
 * Mock Implementation des MOTD (Message of the Day) Stores
 */

import { defineStore } from "pinia";
import { ref } from "vue";
import type { MotdConfig } from "@/types/admin";

// Default-Konfiguration für Pure Vue Mode
const DEFAULT_MOTD_CONFIG: MotdConfig = {
  enabled: true,
  format: "html",
  content:
    "<div><strong>Pure Vue Mode</strong> - Diese App läuft ohne Backend-API und verwendet Mock-Daten. Perfekt für lokale Entwicklung und Tests.</div>",
  style: {
    backgroundColor: "#FFF8E1",
    borderColor: "#FFE082",
    textColor: "#5D4037",
    iconClass: "mdi-information-outline",
  },
  display: {
    position: "top",
    dismissible: true,
    showOnStartup: true,
    showInChat: true,
  },
};

export const useMotdStore = defineStore("admin-motd", () => {
  // State
  const config = ref<MotdConfig>({ ...DEFAULT_MOTD_CONFIG });
  const dismissed = ref<boolean>(false);
  const editConfig = ref<MotdConfig>({ ...DEFAULT_MOTD_CONFIG });

  // Actions
  const loadConfig = async () => {
    // In der Mock-Implementierung verwenden wir die Default-Konfiguration
    console.log("[Mock] MOTD Konfiguration geladen");
    config.value = { ...DEFAULT_MOTD_CONFIG };
    editConfig.value = { ...DEFAULT_MOTD_CONFIG };
    return config.value;
  };

  const saveConfig = async (newConfig: MotdConfig) => {
    // Simulieren einer API-Speicherung
    console.log("[Mock] MOTD Konfiguration gespeichert:", newConfig);
    config.value = { ...newConfig };
    editConfig.value = { ...newConfig };
    return config.value;
  };

  const dismiss = () => {
    console.log("[Mock] MOTD dismissed");
    dismissed.value = true;
  };

  const reset = () => {
    console.log("[Mock] MOTD reset");
    dismissed.value = false;
    config.value = { ...DEFAULT_MOTD_CONFIG };
    editConfig.value = { ...DEFAULT_MOTD_CONFIG };
  };

  return {
    config,
    dismissed,
    editConfig,
    loadConfig,
    saveConfig,
    dismiss,
    reset,
  };
});
