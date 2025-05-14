/**
 * Store-Barrel-Export-Datei für Pinia-Stores
 *
 * Diese Datei bietet eine zentrale Stelle für den Import aller Stores.
 * Sie exportiert sowohl alle Store-Hooks als auch eine vorkonfigurierte
 * Pinia-Instanz, die in der Anwendung verwendet werden kann.
 */

import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

/**
 * Hauptanwendungs-Stores
 * Diese Stores verwalten den Kernzustand der Anwendung
 */
export * from "./auth";          // Authentifizierung und Benutzerinfos
export * from "./sessions";      // Chat-Sitzungen und Nachrichten
export * from "./ui";            // UI-Zustand (Themes, Modals, etc.)
export * from "./settings";      // Benutzereinstellungen

/**
 * Feature-spezifische Stores
 * Diese Stores sind für bestimmte Funktionen der Anwendung zuständig
 */
export * from "./documentConverter";  // Dokumentenkonvertierung
export * from "./featureToggles";     // Feature-Flags
export * from "./monitoringStore";    // Anwendungstelemetrie
export * from "./statistics";         // Nutzungsstatistiken
export * from "./sources";            // Quellenverwaltung

/**
 * Admin-Bereich Stores
 * Diese Stores verwalten den Zustand des Admin-Bereichs
 */
export * from "./admin/index";   // Zentraler Admin-Store
export * from "./admin/users";   // Benutzerverwaltung
export * from "./admin/system";  // Systemkonfiguration
export * from "./admin/settings"; // Systemeinstellungen
export * from "./admin/motd";    // Message of the Day
export * from "./admin/feedback"; // Feedback-Verwaltung
export * from "./admin/logs";    // Systemlogs

/**
 * Optimierte Store-Implementierungen
 * Diese können parallel zu den Standard-Implementierungen existieren
 * und über Feature-Flags aktiviert werden
 */
export { useSessionsStoreOptimized } from "./sessions.optimized";
export { useAdminSettingsStoreOptimized } from "./admin/settings.optimized";

/**
 * Mock-Implementierungen für Tests
 * Diese Stores bieten Mock-Daten für Tests und Entwicklung
 */
export * from "./auth.mock";
export * from "./sessions.mock";
export * from "./ui.mock";
export * from "./settings.mock";
export * from "./admin/feedback.mock";
export * from "./admin/motd.mock";

// Pinia-Instanz erstellen und konfigurieren
const pinia = createPinia();

// Persistenz-Plugin für dauerhafte Speicherung hinzufügen
pinia.use(piniaPluginPersistedstate);

// Vorkonfigurierte Pinia-Instanz exportieren
export default pinia;
