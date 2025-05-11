import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

// Store-Exporte
export * from "./auth";
export * from "./featureToggles";
export * from "./sessions";
export * from "./settings";
export * from "./ui";
export * from "./documentConverter";
export * from "./monitoringStore";
export * from "./statistics";

// Admin-Stores exportieren
export * from "./admin/index";
export * from "./admin/users";
export * from "./admin/system";
export * from "./admin/settings";
export * from "./admin/motd";
export * from "./admin/feedback";
export * from "./admin/logs";

// Optimierte Stores
// Diese können parallel zu den Standard-Implementierungen existieren
// und über Feature-Flags aktiviert werden
export { useSessionsStoreOptimized } from "./sessions.optimized";
export { useAdminSettingsStoreOptimized } from "./admin/settings.optimized";

// Pinia Store erstellen
const pinia = createPinia();

// Persistenz-Plugin konfigurieren
pinia.use(piniaPluginPersistedstate);

export default pinia;
