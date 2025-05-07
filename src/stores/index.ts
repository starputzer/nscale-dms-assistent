import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

// Pinia Store erstellen
const pinia = createPinia();

// Persistenz-Plugin konfigurieren
pinia.use(piniaPluginPersistedstate);

export default pinia;