/**
 * main.js - Vite-Einstiegspunkt für das nscale DMS Assistent Frontend
 */

// Import von app.js als Hauptmodul
import './app.js';

// Import von CSS
import '../css/main.css';
import '../css/feedback.css';
import '../css/admin.css';
import '../css/settings.css';
import '../css/themes.css';
import '../css/improved-ui.css';
import '../css/source-references.css';

// Melde erfolgreichen Vite-Import
console.log('Vite-Bundle erfolgreich geladen!');

// In der Entwicklungsumgebung zur besseren Debugging-Erfahrung
if (import.meta.env.DEV) {
  console.log('Entwicklungsmodus aktiv');
  
  // Debug-Informationen
  window.addEventListener('load', () => {
    console.log('Anwendung vollständig geladen');
  });
}