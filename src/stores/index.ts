import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

// Store-Exporte
export * from './auth';
export * from './featureToggles';
export * from './sessions';
export * from './settings';
export * from './ui';
export * from './documentConverter';
export * from './monitoringStore';

// Pinia Store erstellen
const pinia = createPinia();

// Persistenz-Plugin konfigurieren
pinia.use(piniaPluginPersistedstate);

export default pinia;