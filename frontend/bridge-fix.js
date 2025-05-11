/**
 * Bridge-Fix für die nscale DMS Assistent Anwendung
 *
 * Diese Datei wird nach dem Laden der Hauptanwendung ausgeführt und
 * stellt sicher, dass die Bridge korrekt initialisiert wird und
 * die Event-Handler ordnungsgemäß registriert werden.
 */

(function () {
  console.log("Bridge-Fix wird initialisiert...");

  // Stellen Sie sicher, dass globale Namensräume existieren
  window.nscale = window.nscale || {};
  window.nscale.bridge = window.nscale.bridge || {};
  window.nscale.events = window.nscale.events || {};
  window.nscale.featureToggles = window.nscale.featureToggles || {};

  // Aktiviere Feature-Toggles, falls sie nicht im localStorage sind
  let featureToggles = {};
  try {
    const storedToggles = localStorage.getItem("featureToggles");
    featureToggles = storedToggles ? JSON.parse(storedToggles) : {};
  } catch (e) {
    console.error("Fehler beim Laden der Feature-Toggles:", e);
    featureToggles = {};
  }

  // Stelle sicher, dass wichtige Feature-Toggles gesetzt sind
  const toggleDefaults = {
    useSfcAdmin: true,
    useSfcDocConverter: false,
    useSfcChat: false,
    useSfcSettings: false,
    // Abhängigkeiten
    usePiniaAuth: true,
    usePiniaUI: true,
    usePiniaSessions: true,
    usePiniaSettings: true,
    useLegacyBridge: true,
  };

  // Setze Standardwerte, wenn sie nicht bereits existieren
  Object.entries(toggleDefaults).forEach(([key, value]) => {
    if (featureToggles[key] === undefined) {
      featureToggles[key] = value;
    }
  });

  // Speichere Feature-Toggles zurück in localStorage
  localStorage.setItem("featureToggles", JSON.stringify(featureToggles));
  console.log("Feature-Toggles aktualisiert:", featureToggles);

  // Stelle global nscale.featureToggles bereit
  window.nscale.featureToggles = featureToggles;

  // Stelle Event-Handler-Funktionen bereit, falls sie fehlen
  if (!window.nscale.events.on) {
    window.nscale.events.on = function (event, callback) {
      console.log(`Event-Handler registriert für: ${event}`);
      window.addEventListener(`nscale:${event}`, function (e) {
        callback(e.detail);
      });
    };
  }

  if (!window.nscale.events.emit) {
    window.nscale.events.emit = function (event, data) {
      console.log(`Event ausgelöst: ${event}`, data);
      const customEvent = new CustomEvent(`nscale:${event}`, { detail: data });
      window.dispatchEvent(customEvent);
    };
  }

  // Löse das Bridge-Ready-Event aus, damit Vue-Komponenten reagieren können
  setTimeout(() => {
    console.log("Bridge-Ready-Event wird ausgelöst...");
    window.nscale.events.emit("bridge-ready", { version: "1.0" });

    // Löse zusätzlich das DOM-spezifische Event aus
    const bridgeReadyEvent = new CustomEvent("nscale-bridge-ready", {
      detail: { version: "1.0" },
    });
    document.dispatchEvent(bridgeReadyEvent);
  }, 500);

  // Füge Debug-Funktionen für Konsole hinzu
  window.nscale.debug = {
    toggleFeature: function (featureName, value) {
      if (featureName) {
        const toggles = JSON.parse(
          localStorage.getItem("featureToggles") || "{}",
        );
        toggles[featureName] =
          value !== undefined ? value : !toggles[featureName];
        localStorage.setItem("featureToggles", JSON.stringify(toggles));
        console.log(
          `Feature-Toggle ${featureName} geändert auf: ${toggles[featureName]}`,
        );
        window.nscale.featureToggles = toggles;
        return toggles[featureName];
      }
    },
    enableAllSfcFeatures: function () {
      const toggles = JSON.parse(
        localStorage.getItem("featureToggles") || "{}",
      );
      toggles.useSfcAdmin = true;
      toggles.useSfcDocConverter = true;
      toggles.useSfcChat = true;
      toggles.useSfcSettings = true;
      toggles.usePiniaAuth = true;
      toggles.usePiniaUI = true;
      localStorage.setItem("featureToggles", JSON.stringify(toggles));
      console.log("Alle SFC-Features wurden aktiviert");
      window.nscale.featureToggles = toggles;
    },
    forceRerender: function () {
      if (window.app && typeof window.app.$forceUpdate === "function") {
        window.app.$forceUpdate();
        console.log("App wurde zum neu rendern gezwungen");
      } else {
        console.log("App-Instanz nicht gefunden");
      }
    },
  };

  console.log("Bridge-Fix wurde initialisiert");
})();
