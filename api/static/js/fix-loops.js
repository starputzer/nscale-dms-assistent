// Sofortige Fehlerbehebung für nscale DMS Assistent
console.log('Fix-Script geladen');

// Feature-Flags zurücksetzen
localStorage.setItem('useNewUI', 'false');
localStorage.setItem('feature_vueDocConverter', 'false');
localStorage.setItem('feature_vueChat', 'false');
localStorage.setItem('feature_vueAdmin', 'false');
localStorage.setItem('feature_vueSettings', 'false');

// Endlosschleife für doc-converter verhindern
const originalSetTimeout = window.setTimeout;
window.setTimeout = function(fn, delay) {
  if (typeof fn === 'function' && fn.toString().includes('initializeConverter') && delay === 500) {
    console.warn('Verhindere Endlosschleife im doc-converter-fallback');
    return -1;
  }
  return originalSetTimeout(fn, delay);
};

// Nach DOM-Laden Container erzeugen
document.addEventListener('DOMContentLoaded', function() {
  // Container für doc-converter erzeugen
  if (\!document.getElementById('doc-converter-container')) {
    const container = document.createElement('div');
    container.id = 'doc-converter-container';
    container.style.display = 'none';
    document.body.appendChild(container);
    console.log('Container doc-converter-container erzeugt');
  }
  
  // Vue-Template-Container ausblenden
  const style = document.createElement('style');
  style.textContent = '.vue-template-container { display: none \!important; }';
  document.head.appendChild(style);
});
