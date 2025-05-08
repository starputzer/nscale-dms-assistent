import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import DialogPlugin from '@/plugins/dialog';

// Styles
import './styles/main.css';

// App erstellen
const app = createApp(App);

// Pinia für Zustandsverwaltung einbinden
const pinia = createPinia();
app.use(pinia);

// Router einbinden
app.use(router);

// Dialog-Plugin registrieren
app.use(DialogPlugin);

// App mounten
app.mount('#app');

// ErrorReportingService initialisieren
import { useErrorReporting } from '@/utils/errorReportingService';
const errorService = useErrorReporting({
  captureUnhandledErrors: true,
  captureUnhandledRejections: true,
  consoleLogLevel: 'error',
  privacy: {
    stripPII: true
  }
});

// Für Debugging-Zwecke in der Entwicklungsumgebung
if (import.meta.env.DEV) {
  console.log('nscale DMS Assistent wurde gestartet');
  console.log('Vue Version:', app.version);
}