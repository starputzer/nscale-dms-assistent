/**
 * nscale DMS Assistant - Haupteinstiegspunkt der Anwendung
 * Vollständig optimierte Version für die Vue 3 SFC-Architektur
 */

import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.optimized.vue";

// Globale Direktiven und Plugins importieren
import { globalDirectives } from "./directives";
import { globalPlugins } from "./plugins";

// Service-Module importieren
import { initializeApiServices } from "./services/api/config";
import { setupErrorReporting } from "./utils/errorReportingService";
import { initializeTelemetry } from "./services/analytics/telemetry";

// Styling importieren
import "./assets/styles/main.scss";

// Hilfs-Funktionen
import { setupNetworkMonitoring } from "./utils/networkMonitor";
import { initializeFeatureFlags } from "./config/featureFlags";

// Router konfigurieren
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: App,
      children: [], // Alle Routen werden dynamisch innerhalb der App-Komponente gehandhabt
    },
  ],
});

// Guards für Router konfigurieren
router.beforeEach((to, from, next) => {
  // Hier könnte Auth-Logik implementiert werden
  next();
});

// Pinia Store initialisieren
const pinia = createPinia();

// App-Instanz erstellen
const app = createApp(App);

// Konfiguration und Abhängigkeiten initialisieren
initializeApiServices();
setupErrorReporting();
initializeTelemetry();
initializeFeatureFlags();
setupNetworkMonitoring();

// Direktiven registrieren
globalDirectives.forEach((directive) => {
  app.directive(directive.name, directive.definition);
});

// Plugins registrieren
globalPlugins.forEach((plugin) => {
  app.use(plugin.plugin, plugin.options);
});

// Stores und Router registrieren
app.use(pinia);
app.use(router);

// Globale Fehlerbehandlung
app.config.errorHandler = (err, vm, info) => {
  console.error("Globaler Vue-Fehler:", err);
  setupErrorReporting().captureError(err, {
    component: vm?.$options.name,
    info,
  });
};

// Performance-Metriken
const perfEntries: any = [];
if (window.performance && window.performance.getEntriesByType) {
  perfEntries.push(...window.performance.getEntriesByType("navigation"));
}

// App mounten
app.mount("#app");

// Ladezeit registrieren
const loadEndTime = performance.now();
console.log(`App in ${Math.round(loadEndTime)}ms geladen`);

// Lade-Indikator entfernen
const appLoader = document.getElementById("app-loading");
if (appLoader) {
  appLoader.classList.add("app-loader-fade");
  setTimeout(() => {
    appLoader.style.display = "none";
  }, 500);
}
