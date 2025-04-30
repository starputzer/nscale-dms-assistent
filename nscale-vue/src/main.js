// main.js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { marked } from 'marked';
import App from './App.vue';
import router from './router';

// Komponenten
import ToastContainer from '@/components/common/ToastContainer.vue';

// Styles
import '@/assets/css/variables.css';
import '@/assets/css/main.css';

// Font Awesome
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { 
  faUser, faLock, faEnvelope, faSignOutAlt, faPlus, faTimes, 
  faCog, faChevronDown, faChevronUp, faInfoCircle, faSun, 
  faMoon, faAdjust, faUniversalAccess, faCheck, faCommentDots,
  faComment, faThumbsUp, faThumbsDown, faTrashAlt, faEye, 
  faDownload, faCloudUploadAlt, faFile, faFileAlt, faFilePdf, 
  faFileWord, faFileExcel, faFilePowerpoint, faFileImage,
  faFileCode, faFileCsv, faFileArchive, faPaperPlane, faRedo,
  faRedoAlt, faExclamationTriangle, faExclamationCircle, 
  faCheckCircle, faSync, faSyncAlt, faUserPlus, faChartLine, 
  faUsers, faEdit, faKey
} from '@fortawesome/free-solid-svg-icons';

// Font Awesome Icons registrieren
library.add(faUser, faLock, faEnvelope, faSignOutAlt, faPlus, faTimes,
  faCog, faChevronDown, faChevronUp, faInfoCircle, faSun, 
  faMoon, faAdjust, faUniversalAccess, faCheck, faCommentDots,
  faComment, faThumbsUp, faThumbsDown, faTrashAlt, faEye, 
  faDownload, faCloudUploadAlt, faFile, faFileAlt, faFilePdf, 
  faFileWord, faFileExcel, faFilePowerpoint, faFileImage,
  faFileCode, faFileCsv, faFileArchive, faPaperPlane, faRedo,
  faRedoAlt, faExclamationTriangle, faExclamationCircle, 
  faCheckCircle, faSync, faSyncAlt, faUserPlus, faChartLine, 
  faUsers, faEdit, faKey);

// Marked.js Konfiguration
marked.setOptions({
  breaks: true,
  gfm: true,
  smartLists: true
});

// CSS Variablen initialisieren
const initTheme = () => {
  // Theme aus localStorage laden oder Standard verwenden
  const storedTheme = localStorage.getItem('theme') || 'light';
  document.body.classList.add(`theme-${storedTheme}`);
  
  // Schriftgröße
  const storedFontSize = localStorage.getItem('fontSize');
  if (storedFontSize && storedFontSize !== 'medium') {
    document.body.classList.add(`font-${storedFontSize}`);
  }
  
  // Reduzierte Bewegung
  if (localStorage.getItem('reduceMotion') === 'true') {
    document.body.classList.add('reduce-motion');
  }
};

// App initialisieren
const app = createApp(App);

// Pinia-Store einbinden
const pinia = createPinia();
app.use(pinia);

// Vue Router einbinden
app.use(router);

// Globale Komponenten registrieren
app.component('FontAwesomeIcon', FontAwesomeIcon);
app.component('ToastContainer', ToastContainer);

// Globale Eigenschaften
app.config.globalProperties.$marked = marked;

// App auf Dark Mode / Kontrast prüfen bevor sie mountet
initTheme();

// Error Handler
app.config.errorHandler = (err, vm, info) => {
  console.error('Vue Error:', err);
  console.error('Info:', info);
  
  // Hier könnten Sie einen Fehler-Tracking-Service einbinden
};

// App rendern
app.mount('#app');

// Debug-Info nur in Entwicklungsumgebung
if (import.meta.env.DEV) {
  console.log('Running in development mode');
}