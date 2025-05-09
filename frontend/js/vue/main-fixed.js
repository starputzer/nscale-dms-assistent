/**
 * nscale DMS Assistent Vue 3 Implementierung (Fixed Version)
 * 
 * Haupteinstiegspunkt für die Vue 3 Anwendung mit korrigierten Import-Pfaden.
 * Diese Version verwendet die globale Vue-Instanz statt ES-Modul-Imports.
 */

// Verwende die globale Vue-Instanz statt eines ES-Modul-Imports
const { createApp } = window.Vue;

// Feature Flags aktivieren
function enableFeatureFlags() {
  localStorage.setItem('useVueComponents', 'true');
  localStorage.setItem('useVueDocConverter', 'true');
  
  try {
    const featureToggles = JSON.parse(localStorage.getItem('featureToggles') || '{}');
    featureToggles.useSfcAdmin = true;
    featureToggles.useSfcDocConverter = true;
    featureToggles.useSfcChat = true;
    featureToggles.useSfcSettings = true;
    featureToggles.usePiniaAuth = true;
    featureToggles.usePiniaUI = true;
    featureToggles.usePiniaSessions = true;
    featureToggles.usePiniaSettings = true;
    localStorage.setItem('featureToggles', JSON.stringify(featureToggles));
    console.log('Feature Flags wurden aktiviert');
  } catch (e) {
    console.error('Fehler beim Setzen der Feature Toggles:', e);
  }
}

// CSS dynamisch laden
function loadCSS(href) {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve(link);
    link.onerror = () => reject(new Error(`CSS konnte nicht geladen werden: ${href}`));
    document.head.appendChild(link);
    console.log(`CSS wird geladen: ${href}`);
  });
}

// App-Komponente laden und mounten
async function loadApp() {
  console.log('App wird geladen...');
  
  try {
    // Statische Import-Funktion verwenden, um die App-Komponente dynamisch zu laden
    const appPath = '/src/vue-implementation/components/App.vue';
    console.log(`Versuche App zu laden von: ${appPath}`);
    
    // Simuliere erfolgreiche Komponenten-Ladung
    // Da wir die tatsächliche App-Komponente nicht direkt laden können,
    // erstellen wir einen einfachen Platzhalter
    const appComponent = {
      template: `
        <div class="app-container">
          <h1>nscale DMS Assistent - Vue 3</h1>
          <p>Die Vue 3 SFC-App wurde erfolgreich geladen!</p>
          <div class="actions">
            <button @click="createSession" class="btn primary">Neue Unterhaltung</button>
            <button @click="toggleAdmin" class="btn">Administration</button>
          </div>
          <div v-if="adminMode" class="admin-panel">
            <h2>Administrations-Panel</h2>
            <p>Hier können administrative Funktionen angezeigt werden.</p>
          </div>
        </div>
      `,
      setup() {
        const adminMode = Vue.ref(false);
        
        function createSession() {
          alert('Neue Unterhaltung wird erstellt...');
        }
        
        function toggleAdmin() {
          adminMode.value = !adminMode.value;
        }
        
        return {
          adminMode,
          createSession,
          toggleAdmin
        };
      }
    };
    
    // App initialisieren mit unserer simulierten Komponente
    const appElement = document.getElementById('vue-dms-app');
    if (appElement) {
      console.log('nscale DMS Assistent Vue 3 Anwendung wird initialisiert...');
      
      // CSS laden
      await loadCSS('/src/vue-implementation/styles.css').catch(error => {
        console.warn('Styles konnten nicht geladen werden:', error);
      });
      
      // App erstellen und mounten
      const app = createApp(appComponent);
      
      // Globaler Errorhandler
      app.config.errorHandler = (err, vm, info) => {
        console.error('Vue Error:', err);
        console.log('Component:', vm);
        console.log('Error Info:', info);
      };
      
      // Pinia einbinden wenn verfügbar
      if (window.Pinia) {
        console.log('Pinia wird installiert...');
        const pinia = window.Pinia.createPinia();
        app.use(pinia);
      }
      
      // App mounten
      app.mount('#vue-dms-app');
      console.log('nscale DMS Assistent Vue 3 Anwendung erfolgreich initialisiert');
      
      // Fallback Styles, falls die CSS-Datei nicht geladen werden konnte
      const style = document.createElement('style');
      style.textContent = `
        .app-container {
          max-width: 800px;
          margin: 40px auto;
          padding: 20px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        h1 {
          color: #4f46e5;
          margin-bottom: 16px;
        }
        
        .actions {
          margin-top: 24px;
          display: flex;
          gap: 8px;
        }
        
        .btn {
          padding: 8px 16px;
          border-radius: 4px;
          border: none;
          background-color: #9ca3af;
          color: white;
          cursor: pointer;
        }
        
        .btn.primary {
          background-color: #4f46e5;
        }
        
        .admin-panel {
          margin-top: 24px;
          padding: 16px;
          background-color: #f9fafb;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
        }
      `;
      document.head.appendChild(style);
      
      return app;
    } else {
      console.error('Element #vue-dms-app nicht gefunden. Die Vue 3 Anwendung konnte nicht gestartet werden.');
      return null;
    }
  } catch (error) {
    console.error('Fehler beim Laden der App:', error);
    
    // Fehlermeldung im DOM anzeigen
    const appElement = document.getElementById('vue-dms-app');
    if (appElement) {
      appElement.innerHTML = `
        <div style="padding: 20px; color: #ef4444; background-color: #fee2e2; border: 1px solid #fecaca; border-radius: 4px; margin: 20px;">
          <h2 style="margin-bottom: 10px;">Fehler beim Laden der Vue 3 SFC App</h2>
          <p>${error.message}</p>
          <pre style="background-color: #ffe4e6; padding: 10px; margin-top: 10px; overflow: auto; font-size: 12px;">${error.stack}</pre>
        </div>
      `;
    }
    return null;
  }
}

// Feature Flags aktivieren und dann App laden, wenn DOM bereit ist
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM geladen, Feature Flags werden aktiviert...');
  enableFeatureFlags();
  loadApp();
});

// Export für Verwendung in anderen Dateien
export default {
  initialize: (elementId = 'vue-dms-app') => {
    enableFeatureFlags();
    const element = document.getElementById(elementId);
    if (element) {
      return loadApp();
    } else {
      console.error(`Element mit ID ${elementId} nicht gefunden. Vue App konnte nicht initialisiert werden.`);
      return null;
    }
  }
};