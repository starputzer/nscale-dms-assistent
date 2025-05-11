// stores/featureToggles.js
import { defineStore } from "pinia";

/**
 * Feature-Toggle-Store für die schrittweise Migration
 *
 * Ermöglicht das selektive Aktivieren und Deaktivieren neuer SFC-Komponenten
 * und Funktionen während der Migration.
 */
export const useFeatureTogglesStore = defineStore("featureToggles", {
  state: () => ({
    // Komponenten-Features
    useSfcAuth: false, // Neue Auth-Komponenten (Login, Register)
    useSfcChat: false, // Neue Chat-Ansicht
    useSfcMessages: false, // Neue Nachrichten-Komponente
    useSfcSessions: false, // Neue Sitzungsverwaltung
    useSfcAdmin: false, // Neue Admin-Ansicht
    useSfcSettings: false, // Neue Einstellungen-Komponente
    useSfcFeedback: false, // Neues Feedback-System

    // Functional-Features
    useStoreAuth: false, // Neuer Auth-Store
    useStoreSession: false, // Neuer Session-Store
    useStoreMotd: false, // Neuer MOTD-Store

    // Nutzer-spezifische Features
    isDebugMode: false, // Debug-Modus für Entwickler
    isAdminTestMode: false, // Test-Modus für Administratoren

    // Entwicklungseinstellungen
    showComponentBorders: false, // Zeigt Grenzen der Komponenten für Entwicklung
  }),

  persist: {
    enabled: true,
    strategies: [
      {
        key: "nscale-feature-toggles",
        storage: localStorage,
      },
    ],
  },

  getters: {
    // Funktionale Gruppierungen
    isUsingSfcAuth: (state) => {
      return state.useSfcAuth && state.useStoreAuth;
    },

    isUsingSfcChat: (state) => {
      return state.useSfcChat && state.useSfcMessages && state.useStoreSession;
    },

    isUsingSfcAdmin: (state) => {
      return state.useSfcAdmin;
    },

    // Komplett neue UI
    isUsingFullSfcUI: (state) => {
      return (
        state.useSfcAuth &&
        state.useSfcChat &&
        state.useSfcAdmin &&
        state.useSfcSettings &&
        state.useSfcFeedback
      );
    },

    // Development Mode
    isInDevelopmentMode: (state) => {
      return state.isDebugMode || state.showComponentBorders;
    },
  },

  actions: {
    /**
     * Aktiviert ein Feature
     * @param {string} feature - Name des Features
     */
    enableFeature(feature) {
      if (this.$state.hasOwnProperty(feature)) {
        this[feature] = true;
        this.logFeatureChange(feature, true);
      } else {
        console.warn(`Feature '${feature}' existiert nicht.`);
      }
    },

    /**
     * Deaktiviert ein Feature
     * @param {string} feature - Name des Features
     */
    disableFeature(feature) {
      if (this.$state.hasOwnProperty(feature)) {
        this[feature] = false;
        this.logFeatureChange(feature, false);
      } else {
        console.warn(`Feature '${feature}' existiert nicht.`);
      }
    },

    /**
     * Schaltet ein Feature um
     * @param {string} feature - Name des Features
     */
    toggleFeature(feature) {
      if (this.$state.hasOwnProperty(feature)) {
        this[feature] = !this[feature];
        this.logFeatureChange(feature, this[feature]);
      } else {
        console.warn(`Feature '${feature}' existiert nicht.`);
      }
    },

    /**
     * Aktiviert alle Features
     */
    enableAllFeatures() {
      Object.keys(this.$state).forEach((key) => {
        this[key] = true;
      });
      console.log("Alle Features wurden aktiviert.");
    },

    /**
     * Deaktiviert alle Features
     */
    disableAllFeatures() {
      Object.keys(this.$state).forEach((key) => {
        this[key] = false;
      });
      console.log("Alle Features wurden deaktiviert.");
    },

    /**
     * Aktiviert alle SFC-Komponenten
     */
    enableAllSfcComponents() {
      Object.keys(this.$state)
        .filter((key) => key.startsWith("useSfc"))
        .forEach((key) => {
          this[key] = true;
        });
      console.log("Alle SFC-Komponenten wurden aktiviert.");
    },

    /**
     * Aktiviert alle Stores
     */
    enableAllStores() {
      Object.keys(this.$state)
        .filter((key) => key.startsWith("useStore"))
        .forEach((key) => {
          this[key] = true;
        });
      console.log("Alle Stores wurden aktiviert.");
    },

    /**
     * Setzt alle Einstellungen auf die Standardwerte zurück
     */
    resetToDefaults() {
      const defaultState = this.$reset();
      console.log("Alle Features wurden auf Standardwerte zurückgesetzt.");
      return defaultState;
    },

    /**
     * Protokolliert Änderungen an Features
     * @private
     */
    logFeatureChange(feature, enabled) {
      const timestamp = new Date().toISOString();
      const status = enabled ? "aktiviert" : "deaktiviert";
      console.log(`[${timestamp}] Feature '${feature}' wurde ${status}.`);

      // Optional: Sende Telemetrie über Feature-Nutzung an den Server
      if (this.isDebugMode) {
        try {
          const user = JSON.parse(localStorage.getItem("user") || "{}");
          const role = user.role || "unknown";

          fetch("/api/telemetry/feature-toggle", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              feature,
              enabled,
              timestamp,
              userRole: role,
            }),
          }).catch((err) =>
            console.error("Telemetrie konnte nicht gesendet werden:", err),
          );
        } catch (error) {
          console.error("Fehler beim Senden der Telemetrie:", error);
        }
      }
    },
  },
});
