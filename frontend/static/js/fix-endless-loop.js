// DOM-Observer für doc-converter stoppen
console.log('Stoppe doc-converter-fallback Endlosschleife...');

// Temporärer Patch für doc-converter-fallback.js
window.addEventListener('DOMContentLoaded', function() {
  // setTimeout-Overrides für Endlos-Loops
  const originalSetTimeout = window.setTimeout;
  let loopCount = {};
  
  window.setTimeout = function(fn, delay) {
    // Erkenne Funktionen die sich selbst rekursiv aufrufen
    const fnStr = fn.toString();
    const hash = fnStr.substring(0, 100); // Ersten 100 Zeichen als Hash
    
    if (fnStr.includes('initializeConverter') && delay === 500) {
      loopCount[hash] = (loopCount[hash] || 0) + 1;
      
      // Nach 5 Versuchen den Loop unterbrechen
      if (loopCount[hash] > 5) {
        console.warn('Endlosschleife in doc-converter-fallback.js erkannt und gestoppt');
        return -1;
      }
    }
    
    return originalSetTimeout(fn, delay);
  };
  
  console.log('Endlosschleifen-Schutz aktiviert');
  
  // DOM-Container frühzeitig erzeugen, um Suche zu beenden
  if (\!document.getElementById('doc-converter-container')) {
    console.log('Erzeuge fehlenden doc-converter-container');
    const container = document.createElement('div');
    container.id = 'doc-converter-container';
    container.style.display = 'none';
    document.body.appendChild(container);
  }
  
  // Entferne alle Referenzen auf nicht existierende Dateien
  localStorage.setItem('useNewUI', 'false');
  localStorage.setItem('feature_vueDocConverter', 'false');
  localStorage.setItem('feature_vueChat', 'false');
  localStorage.setItem('feature_vueAdmin', 'false');
  localStorage.setItem('feature_vueSettings', 'false');
  
  console.log('Alle Feature-Flags deaktiviert');
});
