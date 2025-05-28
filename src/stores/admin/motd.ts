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

  // Funktionen
  function dismiss() {
    dismissed.value = true;
  }

  function resetDismissed() {
    dismissed.value = false;
  }

  function saveConfig(newConfig: MotdConfig) {
    config.value = {
      ...newConfig,
    };
    editConfig.value = JSON.parse(JSON.stringify(config.value));
  }

  // Implementierung der fetchConfig-Funktion für die Admin-MOTD-Komponente
  // mit robuster Fehlerbehandlung und JSON-Parsing-Schutz
  async function fetchConfig() {
    try {
      // API-Aufruf über den adminApi-Service für konsistente Fehlerbehandlung
      const response = await fetch("/api/motd");

      // Prüfen, ob die Anfrage erfolgreich war
      if (!response.ok) {
        // Versuchen, Fehlermeldung zu extrahieren, mit Fallback wenn das Parsen fehlschlägt
        let errorMessage = "Fehler beim Laden der MOTD-Konfiguration";
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          console.warn("Konnte Fehlerantwort nicht parsen:", parseError);
        }
        throw new Error(errorMessage);
      }

      // Versuchen, Antwort zu parsen, mit Fallback wenn das Parsen fehlschlägt
      let data;
      try {
        const responseText = await response.text();

        // Prüfen, ob die Antwort leer oder ungültig ist
        if (!responseText || responseText.trim() === "") {
          console.warn(
            "Leere Antwort vom Server erhalten, verwende Standard-Konfiguration",
          );
          data = { config: config.value };
        } else {
          // Parsen der Antwort
          data = JSON.parse(responseText);
        }
      } catch (parseError) {
        console.error("Fehler beim Parsen der MOTD-Antwort:", parseError);
        // Fallback auf aktuelle Konfiguration
        data = { config: config.value };
      }

      // Konfiguration aktualisieren, wenn sie gültig ist
      if (data && data.config) {
        try {
          // Sicheres Update mit Fallback
          config.value = data.config;

          // Tiefe Kopie der Konfiguration erstellen (sicherer als JSON.parse/stringify)
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
        } catch (updateError) {
          console.error(
            "Fehler beim Aktualisieren der MOTD-Konfiguration:",
            updateError,
          );
          // Keine Änderung an der Konfiguration vornehmen, wenn ein Fehler auftritt
        }
      } else {
        console.warn(
          "Ungültige MOTD-Konfiguration empfangen, keine Aktualisierung durchgeführt",
        );
      }

      return config.value;
    } catch (err: any) {
      console.error("Fehler beim Laden der MOTD-Konfiguration:", err);
      // Fehler werfen, aber keine Änderung an der aktuellen Konfiguration
      throw err;
    }
  }

  return {
    // State
    config,
    editConfig,
    dismissed,

    // Funktionen
    dismiss,
    resetDismissed,
    saveConfig,
    fetchConfig, // Neu hinzugefügt
  };
});

// Für Legacy-Code auch als useAdminMotdStore exportieren
export const useAdminMotdStore = useMotdStore;
