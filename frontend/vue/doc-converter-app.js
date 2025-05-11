// doc-converter-app.js
import { createApp } from "vue";
import { createPinia } from "pinia";
import DocConverterApp from "./DocConverterApp.vue";

// Export für den Einstiegspunkt
export default DocConverterApp;

// Direkte Initialisierung falls erforderlich
if (document.getElementById("doc-converter-mount")) {
  const app = createApp(DocConverterApp);
  const pinia = createPinia();

  app.use(pinia);

  // Globale Fehlerbehandlung
  app.config.errorHandler = (err, vm, info) => {
    console.error("Dokumentenkonverter Fehler:", err);
    console.log("Komponente:", vm);
    console.log("Info:", info);
  };

  app.mount("#doc-converter-mount");
  console.log("Dokumentenkonverter erfolgreich initialisiert");
}
