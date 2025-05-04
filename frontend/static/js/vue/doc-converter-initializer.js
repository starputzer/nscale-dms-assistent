console.log('DocConverter-Initializer wird geladen...');
document.addEventListener('DOMContentLoaded', function() {
  // Suche Container für DocConverter-Initializer
  let initContainer = document.getElementById('doc-converter-initializer');
  
  // Falls nicht vorhanden, aber DocConverter-Tab aktiv ist, erstelle Container
  if (!initContainer) {
    // Verschiedene mögliche Container-IDs prüfen
    const possibleContainers = [
      document.getElementById('doc-converter-container'),
      document.getElementById('doc-converter-app'),
      document.getElementById('doc-converter-tab')
    ];
    
    const docConverterContainer = possibleContainers.find(container => container !== null);
    
    if (docConverterContainer) {
      initContainer = document.createElement('div');
      initContainer.id = 'doc-converter-initializer';
      
      // Container vor dem klassischen Inhalt einfügen
      docConverterContainer.parentNode.insertBefore(initContainer, docConverterContainer);
      
      console.log('DocConverter-Initializer Container erstellt');
    }
  }
  
  // Lade Vue.js-Komponente
  if (initContainer) {
    const script = document.createElement('script');
    // Der korrekte Pfad zur nomodule-Version
    script.src = '/static/vue/standalone/doc-converter-nomodule.js';
    script.type = 'text/javascript';
    
    // Event-Handler für das Script
    script.onload = function() {
      console.log('DocConverter-Initializer erfolgreich geladen!');
    };
    
    script.onerror = function() {
      console.error('Fehler beim Laden des DocConverter-Initializers');
      
      // Versuche alternative Pfade
      const alternativePaths = [
        '/api/static/vue/standalone/doc-converter-nomodule.js',
        '/static/vue/standalone/doc-converter-nomodule.js',
        '/frontend/static/vue/standalone/doc-converter-nomodule.js',
        '/frontend/js/vue/doc-converter-nomodule.js'
      ];
      
      let pathIndex = 0;
      
      const tryAlternativePath = function() {
        if (pathIndex < alternativePaths.length) {
          const newScript = document.createElement('script');
          newScript.src = alternativePaths[pathIndex];
          newScript.type = 'text/javascript';
          
          console.warn(`Versuche alternative Pfad: ${alternativePaths[pathIndex]}`);
          
          newScript.onload = function() {
            console.log(`DocConverter erfolgreich von ${alternativePaths[pathIndex]} geladen!`);
          };
          
          newScript.onerror = function() {
            console.error(`Fehler beim Laden von ${alternativePaths[pathIndex]}`);
            pathIndex++;
            tryAlternativePath();
          };
          
          document.head.appendChild(newScript);
        } else {
          // Fallback - klassische Implementierung aktivieren
          console.warn('Alle Alternativen fehlgeschlagen, aktiviere klassische Implementierung als Fallback');
          if (typeof window.initializeClassicDocConverter === 'function') {
            window.initializeClassicDocConverter();
          }
        }
      };
      
      tryAlternativePath();
    };
    
    // Script zum DOM hinzufügen
    document.head.appendChild(script);
  }
});
