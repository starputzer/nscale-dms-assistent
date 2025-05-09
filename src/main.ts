import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { ApiService } from './services/api/ApiService';

// Styles
import './assets/styles/main.scss';

// Initialisiere API-Service
ApiService.init();

// Erstelle App-Instanz
const app = createApp(App);

// Registriere Plugins
const pinia = createPinia();
app.use(pinia);
app.use(router);

// Mount App
app.mount('#app');