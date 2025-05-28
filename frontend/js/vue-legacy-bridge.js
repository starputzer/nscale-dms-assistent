/**
 * Vue Legacy Bridge
 * Verbesserte Integration zwischen Vue 3 SFCs und Legacy-Code
 * Ermöglicht eine saubere Kommunikation während der Migrationsphase
 *
 * Datum: 2025-05-11
 */

// Tracking für Bridge-Nutzung
if (typeof window.telemetry !== "undefined") {
  window.telemetry.trackEvent("system_init", {
    component: "vue-legacy-bridge",
    action: "initialize",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Legacy-to-Vue Bridge System
 */
window.vueBridge = {
  store: {}, // Gemeinsam genutzter Zustand
  callbacks: {}, // Callbacks für Events
  initialized: false, // Initialisierungsstatus

  /**
   * Initialisiert die Bridge mit grundlegenden Daten
   */
  init() {
    if (this.initialized) return;

    console.log("[Bridge] Initialisierung der Vue Legacy Bridge");

    // Bridge-Zustand auf DOM-Ready initialisieren
    document.addEventListener("DOMContentLoaded", () => {
      this.initialized = true;
      this.emit("bridge:ready", { timestamp: Date.now() });
      console.log("[Bridge] Bridge bereit");
    });

    // Listener auf Vue-App-Mount
    const checkVueApp = setInterval(() => {
      const vueApp = document.getElementById("vue-dms-app");
      if (vueApp && vueApp.__vue_app__) {
        clearInterval(checkVueApp);
        console.log("[Bridge] Vue 3 App erkannt");
        this.emit("vue:ready", { timestamp: Date.now() });
      }
    }, 100);

    // Default-Store-Werte
    this.store = {
      theme: document.body.classList.contains("theme-dark") ? "dark" : "light",
      messages: [],
      sessions: [],
      settings: {},
      uiState: {
        activeView: "chat",
        adminTab: "users",
      },
    };

    return this;
  },

  /**
   * Registriert einen Event-Listener
   * @param {string} event - Der Event-Name
   * @param {Function} callback - Die Callback-Funktion
   * @param {string} id - Eine optionale ID für den Listener
   * @returns {Object} - Ein Objekt mit einer unsubscribe-Funktion
   */
  on(event, callback, id = "") {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }

    const listener = { callback, id };
    this.callbacks[event].push(listener);

    return {
      unsubscribe: () => {
        this.callbacks[event] = this.callbacks[event].filter(
          (l) => l !== listener,
        );
      },
    };
  },

  /**
   * Löst ein Event aus
   * @param {string} event - Der Event-Name
   * @param {Object} data - Die Event-Daten
   */
  emit(event, data) {
    if (!this.callbacks[event]) return;

    console.log(`[Bridge] Event ausgelöst: ${event}`, data);

    // Alle Callbacks mit Fehlerbehandlung aufrufen
    this.callbacks[event].forEach(({ callback, id }) => {
      try {
        callback(data);
      } catch (error) {
        console.error(
          `[Bridge] Fehler im Callback für ${event} (${id || "anonym"}):`,
          error,
        );
      }
    });
  },

  /**
   * Aktualisiert den Bridge-Store
   * @param {string} key - Der Pfad im Store (z.B. 'uiState.activeView')
   * @param {any} value - Der neue Wert
   * @param {boolean} silent - Wenn true, wird kein Event ausgelöst
   */
  updateStore(key, value, silent = false) {
    // Unterstützt Pfade wie 'uiState.activeView'
    const parts = key.split(".");
    let current = this.store;

    // Navigiere zum letzten Teil des Pfades
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    // Setze den Wert
    const lastPart = parts[parts.length - 1];
    const oldValue = current[lastPart];
    current[lastPart] = value;

    // Event auslösen, wenn nicht silent
    if (!silent) {
      this.emit("store:updated", {
        key,
        newValue: value,
        oldValue,
        timestamp: Date.now(),
      });
    }

    return this;
  },

  /**
   * Liest einen Wert aus dem Bridge-Store
   * @param {string} key - Der Pfad im Store (z.B. 'uiState.activeView')
   * @param {any} defaultValue - Der Standardwert, falls der Schlüssel nicht existiert
   * @returns {any} - Der Wert aus dem Store
   */
  getStore(key, defaultValue = null) {
    const parts = key.split(".");
    let current = this.store;

    // Navigiere zum angegebenen Pfad
    for (const part of parts) {
      if (
        current === undefined ||
        current === null ||
        !Object.prototype.hasOwnProperty.call(current, part)
      ) {
        return defaultValue;
      }
      current = current[part];
    }

    return current;
  },

  /**
   * Synchronisiert einen Wert aus dem Legacy-Code mit Vue 3
   * @param {string} key - Der Store-Schlüssel
   * @param {any} value - Der zu synchronisierende Wert
   */
  syncToVue(key, value) {
    this.updateStore(key, value);
    this.emit("legacy:update", { key, value, timestamp: Date.now() });
    return this;
  },

  /**
   * Führt eine Diagnose der Bridge durch
   * @returns {Object} - Diagnoseinformationen
   */
  diagnose() {
    const eventCounts = Object.keys(this.callbacks).reduce((acc, event) => {
      acc[event] = this.callbacks[event].length;
      return acc;
    }, {});

    return {
      initialized: this.initialized,
      eventListeners: eventCounts,
      storeKeys: Object.keys(this.store),
      storeSize: JSON.stringify(this.store).length,
      timestamp: Date.now(),
    };
  },
};

// Initialisiere die Bridge
window.vueBridge.init();

/**
 * Automatische Integration mit bestehenden Funktionen
 */
document.addEventListener("DOMContentLoaded", () => {
  // Theme-Änderungen überwachen
  const applyTheme = (theme) => {
    if (theme === "dark") {
      document.body.classList.add("theme-dark");
      document.body.classList.remove("theme-light");
    } else {
      document.body.classList.add("theme-light");
      document.body.classList.remove("theme-dark");
    }

    // Bridge über Theme-Änderung informieren
    window.vueBridge.updateStore("theme", theme);
  };

  // Falls es eine setColorMode-Funktion gibt, erweitern wir sie
  const originalSetColorMode = window.setColorMode;
  if (typeof originalSetColorMode === "function") {
    window.setColorMode = (mode) => {
      originalSetColorMode(mode);
      window.vueBridge.updateStore("settings.colorMode", mode);
    };
  }

  // MOTD-Funktionalität mit der Bridge verbinden
  const originalDismissMotd = window.dismissMotd;
  if (typeof originalDismissMotd === "function") {
    window.dismissMotd = () => {
      originalDismissMotd();
      window.vueBridge.updateStore("motd.dismissed", true);
      window.vueBridge.emit("motd:dismissed", { timestamp: Date.now() });
    };
  }

  // View-Wechsel mit Bridge synchronisieren
  const originalToggleAdminView = window.toggleAdminView;
  if (typeof originalToggleAdminView === "function") {
    window.toggleAdminView = () => {
      originalToggleAdminView();
      const newView =
        window.vueBridge.getStore("uiState.activeView") === "chat"
          ? "admin"
          : "chat";
      window.vueBridge.updateStore("uiState.activeView", newView);
    };
  }

  // Admin-Tab-Wechsel mit Bridge synchronisieren
  document.querySelectorAll(".admin-tab-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      const tab =
        event.currentTarget.getAttribute("data-tab") ||
        event.currentTarget.textContent.trim().toLowerCase();

      window.vueBridge.updateStore("uiState.adminTab", tab);
    });
  });
});

// Event-Handler für Bridge-Events
window.vueBridge.on("vue:ready", () => {
  console.log("[Bridge] Vue-App ist bereit, synchronisiere Daten");

  // Initialen Zustand mit Vue teilen
  const initialState = {
    activeView: document.body.classList.contains("activeView-admin")
      ? "admin"
      : "chat",
    theme: document.body.classList.contains("theme-dark") ? "dark" : "light",
    isAuthenticated: !!localStorage.getItem("token"),
  };

  window.vueBridge.updateStore("uiState", initialState, true);
  window.vueBridge.emit("initial:state", initialState);
});

/**
 * Export als ES-Modul
 */
export default window.vueBridge;
