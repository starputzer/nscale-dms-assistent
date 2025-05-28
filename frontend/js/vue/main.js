/**
 * nscale DMS Assistent Vue 3 Implementierung
 *
 * Haupteinstiegspunkt für die Vue 3 Anwendung.
 */

import { createApp } from "vue";
// Import der App aus dem Hauptsystem
import App from "../../../src/App.vue";
// CSS wird über link-Tags in der index.html eingebunden
// Keine direkten CSS-Importe hier, um MIME-Typ-Fehler zu vermeiden
// Das folgende CSS wird nun über ein <link> Tag geladen:
// import '../../../src/vue-implementation/styles.css';

// Globale App-Referenz, um Mehrfach-Initialisierung zu verhindern
let vueApp = null;

// Funktion zum dynamischen Laden von CSS mit korrektem MIME-Type
function loadCSSFile(href) {
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => resolve(link);
    link.onerror = () =>
      reject(new Error(`CSS konnte nicht geladen werden: ${href}`));
    document.head.appendChild(link);
  });
}

// Verbesserte initialize-Funktion zur Vermeidung mehrfacher Instanzen
function initialize(elementId = "vue-dms-app") {
  // Prüfen, ob App bereits initialisiert
  if (vueApp !== null) {
    console.warn(
      "Vue-App wurde bereits initialisiert. Überspringe weitere Initialisierung.",
    );
    return vueApp;
  }

  const element = document.getElementById(elementId);

  if (!element) {
    console.error(
      `Element mit ID ${elementId} nicht gefunden. Vue App konnte nicht initialisiert werden.`,
    );
    return null;
  }

  // Prüfen, ob im Zielelement bereits Inhalte sind
  if (element.hasChildNodes()) {
    console.warn(
      `Element #${elementId} hat bereits Kindelemente. Möglicherweise wurde hier bereits eine App gemountet.`,
    );
    // Trotzdem fortfahren, aber Warnung ausgeben
  }

  console.log(`Initialisiere Vue App an #${elementId}...`);

  // CSS für Hauptsystem ist bereits über Links in index.html eingebunden
  console.log("Verwende Stylesheet aus dem Hauptsystem...");

  // App erstellen und konfigurieren
  vueApp = createApp(App);

  // Globaler Errorhandler
  vueApp.config.errorHandler = (err, vm, info) => {
    console.error("Vue Error:", err);
    console.log("Component:", vm);
    console.log("Error Info:", info);
  };

  // App mounten
  vueApp.mount(`#${elementId}`);
  console.log(`Vue App erfolgreich an #${elementId} gemountet`);

  return vueApp;
}

// Alternative Initialisierung - nicht mehr automatisch, um Konflikte zu vermeiden
let initialized = false;

// Export für Verwendung in anderen Dateien
export default {
  initialize,

  // Diese Methode prüft, ob bereits initialisiert wurde (zur Vermeidung von Doppelinitialisierungen)
  safeInitialize: (elementId = "vue-dms-app") => {
    if (initialized) {
      console.log("Vue App wurde bereits initialisiert");
      return vueApp;
    }

    initialized = true;
    return initialize(elementId);
  },
};
