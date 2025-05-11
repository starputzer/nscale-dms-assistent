/**
 * nscale DMS Assistent Vue 3 Implementierung
 *
 * Haupteinstiegspunkt für die Vue 3 Anwendung.
 */

import { createApp } from "vue";
import App from "../../../src/vue-implementation/components/App.vue";
// CSS wird über link-Tags in der index.html eingebunden
// Keine direkten CSS-Importe hier, um MIME-Typ-Fehler zu vermeiden
// Das folgende CSS wird nun über ein <link> Tag geladen:
// import '../../../src/vue-implementation/styles.css';

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

// Mounten der App, wenn das DOM geladen ist
document.addEventListener("DOMContentLoaded", () => {
  // Lade Style CSS explizit über ein link-Element
  loadCSSFile("../../../src/vue-implementation/styles.css").catch((error) => {
    console.warn("Styles konnten nicht geladen werden:", error);
  });

  // Check ob das Zielelement existiert
  const appElement = document.getElementById("vue-dms-app");

  if (appElement) {
    console.log("nscale DMS Assistent Vue 3 Anwendung wird initialisiert...");
    const app = createApp(App);

    // Globaler Errorhandler
    app.config.errorHandler = (err, vm, info) => {
      console.error("Vue Error:", err);
      console.log("Component:", vm);
      console.log("Error Info:", info);
    };

    // App mounten
    app.mount("#vue-dms-app");
    console.log(
      "nscale DMS Assistent Vue 3 Anwendung erfolgreich initialisiert",
    );
  } else {
    console.warn(
      "Element #vue-dms-app nicht gefunden. Die Vue 3 Anwendung konnte nicht gestartet werden.",
    );
  }
});

// Export für Verwendung in anderen Dateien
export default {
  initialize: (elementId = "vue-dms-app") => {
    const element = document.getElementById(elementId);
    if (element) {
      const app = createApp(App);
      app.mount(`#${elementId}`);
      return app;
    } else {
      console.error(
        `Element mit ID ${elementId} nicht gefunden. Vue App konnte nicht initialisiert werden.`,
      );
      return null;
    }
  },
};
