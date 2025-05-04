// Sofortige lokale Speicher-Korrektur und Fallback-Script
(function() {
  console.log("Direktes Fix-Script geladen");
  
  // Setze alle Feature-Flags sofort zurück
  localStorage.setItem('useNewUI', 'false');
  localStorage.setItem('feature_vueDocConverter', 'false');
  localStorage.setItem('feature_vueChat', 'false');
  localStorage.setItem('feature_vueAdmin', 'false');
  localStorage.setItem('feature_vueSettings', 'false');
  localStorage.setItem('devMode', 'false');
  
  // Stoppe Endlosschleifen mit setTimeout
  const originalSetTimeout = window.setTimeout;
  window.setTimeout = function(fn, delay) {
    if (typeof fn === 'function' && fn.toString().includes('initializeConverter') && delay === 500) {
      console.warn("Verhindere Endlosschleife im doc-converter-fallback");
      return -1;
    }
    return originalSetTimeout(fn, delay);
  };
  
  // Nach DOM-Laden Container erzeugen
  document.addEventListener('DOMContentLoaded', function() {
    // Alle Vue-Template-Container verstecken
    const style = document.createElement('style');
    style.textContent = '.vue-template-container { display: none \!important; }';
    document.head.appendChild(style);
    
    // Container für doc-converter erzeugen
    if (\!document.getElementById('doc-converter-container')) {
      const container = document.createElement('div');
      container.id = 'doc-converter-container';
      container.style.display = 'none';
      document.body.appendChild(container);
      console.log("Container doc-converter-container erzeugt");
    }
  });
})();
