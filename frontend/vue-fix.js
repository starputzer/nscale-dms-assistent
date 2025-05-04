// Vue-Fix Script
console.log("Vue-Fix geladen");

// Feature-Flags zurücksetzen
function resetFeatureFlags() {
  localStorage.setItem('useNewUI', 'false');
  localStorage.setItem('feature_vueDocConverter', 'false');
  localStorage.setItem('feature_vueChat', 'false');
  localStorage.setItem('feature_vueAdmin', 'false');
  localStorage.setItem('feature_vueSettings', 'false');
  localStorage.setItem('devMode', 'false');
  console.log("Feature-Flags zurückgesetzt");
}

// Endlosschleifen verhindern
function stopEndlessLoops() {
  var originalSetTimeout = window.setTimeout;
  window.setTimeout = function(fn, delay) {
    if (typeof fn === 'function' && 
        fn.toString().indexOf('initializeConverter') \!== -1 && 
        delay === 500) {
      console.warn("Endlosschleife verhindert");
      return -1;
    }
    return originalSetTimeout(fn, delay);
  };
  console.log("Endlosschleifen-Schutz aktiviert");
}

// Container erstellen
function createContainer() {
  if (\!document.getElementById('doc-converter-container')) {
    var container = document.createElement('div');
    container.id = 'doc-converter-container';
    container.style.display = 'none';
    document.body.appendChild(container);
    console.log("Container erstellt");
  }
}

// Nach DOM-Laden ausführen
document.addEventListener('DOMContentLoaded', function() {
  resetFeatureFlags();
  stopEndlessLoops();
  createContainer();
  
  // Reset-Button hinzufügen (wenn ?debug=true)
  if (window.location.search.indexOf('debug=true') \!== -1) {
    var btn = document.createElement('button');
    btn.innerText = 'Reset App';
    btn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;background:red;color:white;border:none;padding:5px;';
    btn.onclick = function() {
      localStorage.clear();
      resetFeatureFlags();
      window.location.reload();
    };
    document.body.appendChild(btn);
  }
});

// Sofort ausführen
resetFeatureFlags();
