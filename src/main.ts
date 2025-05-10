import { createApp } from 'vue';
import pinia from './stores';
import App from './App.vue';
import router from './router';
import { ApiService } from './services/api/ApiService';
import { initializeStores } from './stores/storeInitializer';

// Styles
import './assets/styles/main.scss';
import './assets/styles/touch-focus.scss';

// Initialisiere API-Service und App
const initApp = async () => {
  // API-Service initialisieren
  ApiService.init();

  // Erstelle App-Instanz
  const app = createApp(App);

  // Registriere Plugins
  app.use(pinia);
  app.use(router);

  try {
    // Stores initialisieren
    await initializeStores();
    console.log('Stores erfolgreich initialisiert');
  } catch (error) {
    console.error('Fehler bei der Store-Initialisierung:', error);
    // Trotz Fehler bei nicht-kritischen Stores fortfahren
  }

  // Mount App
  app.mount('#app');
};

// Anwendung starten
initApp().catch(error => {
  console.error('Kritischer Fehler beim Anwendungsstart:', error);

  // Fallback für kritische Fehler
  const errorElement = document.createElement('div');
  errorElement.className = 'critical-error';
  errorElement.innerHTML = `
    <h1>Anwendungsfehler</h1>
    <p>Die Anwendung konnte nicht gestartet werden. Bitte versuchen Sie es später erneut.</p>
    <button onclick="window.location.reload()">Neu laden</button>
  `;

  document.body.innerHTML = '';
  document.body.appendChild(errorElement);
});