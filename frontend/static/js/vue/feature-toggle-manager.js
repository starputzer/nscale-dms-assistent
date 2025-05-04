console.log('Feature-Toggle-Manager wird geladen...');
document.addEventListener('DOMContentLoaded', function() {
  // Suche Container für Feature-Toggle-Manager
  const featureContainer = document.getElementById('feature-toggle-container');
  
  // Lade Vue.js-Komponente
  if (featureContainer) {
    const script = document.createElement('script');
    script.src = '/static/vue/standalone/feature-toggle-nomodule.js';
    script.type = 'text/javascript';
    
    // Event-Handler für das Script
    script.onload = function() {
      console.log('Feature-Toggle-Manager erfolgreich geladen!');
    };
    
    script.onerror = function() {
      console.error('Fehler beim Laden des Feature-Toggle-Managers');
      
      // Versuche alternative Pfade
      const alternativePaths = [
        '/api/static/vue/standalone/feature-toggle-nomodule.js',
        '/static/vue/standalone/feature-toggle-nomodule.js',
        '/frontend/static/vue/standalone/feature-toggle-nomodule.js',
        '/frontend/js/vue/feature-toggle-nomodule.js'
      ];
      
      let pathIndex = 0;
      
      const tryAlternativePath = function() {
        if (pathIndex < alternativePaths.length) {
          const newScript = document.createElement('script');
          newScript.src = alternativePaths[pathIndex];
          newScript.type = 'text/javascript';
          
          console.warn(`Versuche alternative Pfad: ${alternativePaths[pathIndex]}`);
          
          newScript.onload = function() {
            console.log(`Feature-Toggle-Manager erfolgreich von ${alternativePaths[pathIndex]} geladen!`);
          };
          
          newScript.onerror = function() {
            console.error(`Fehler beim Laden von ${alternativePaths[pathIndex]}`);
            pathIndex++;
            tryAlternativePath();
          };
          
          document.head.appendChild(newScript);
        } else {
          // Fallback - einfaches HTML einfügen
          console.warn('Alle Alternativen fehlgeschlagen, verwende HTML-Fallback');
          featureContainer.innerHTML = `
            <div class="error-container p-4 border border-red-300 bg-red-50 rounded mt-4">
              <h3 class="text-red-700 font-medium mb-2">Fehler bei der Initialisierung</h3>
              <p class="text-red-600">Der Feature-Toggle-Manager konnte nicht geladen werden.</p>
              <div class="fallback-container mt-4">
                <p class="mb-4">Verwenden Sie die folgenden Links, um zwischen den UI-Versionen zu wechseln:</p>
                <div class="flex gap-4">
                  <button class="nscale-btn-primary" onclick="localStorage.setItem('useNewUI', 'true'); window.location.reload();">
                    Vue.js-UI aktivieren
                  </button>
                  <button class="nscale-btn-secondary" onclick="localStorage.setItem('useNewUI', 'false'); window.location.reload();">
                    Klassische UI aktivieren
                  </button>
                </div>
              </div>
            </div>
          `;
        }
      };
      
      tryAlternativePath();
    };
    
    // Script zum DOM hinzufügen
    document.head.appendChild(script);
  }
});
