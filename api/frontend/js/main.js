/**
 * main.js - Vite-Einstiegspunkt für das nscale DMS Assistent Frontend
 */

// Import von app.js als Hauptmodul
import './app.js';

// CSS wird über link-Tags in der index.html eingebunden
// Keine direkten CSS-Importe hier, um MIME-Typ-Fehler zu vermeiden

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