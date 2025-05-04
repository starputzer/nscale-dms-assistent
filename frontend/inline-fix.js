// Sofortiges Fix-Script für Vue-Probleme
console.log("Inline Fix-Script geladen");

// Document Ready Function
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM geladen, führe Fixes aus");
  
  // 1. Feature-Flags zurücksetzen
  localStorage.setItem('useNewUI', 'false');
  localStorage.setItem('feature_vueDocConverter', 'false');
  localStorage.setItem('feature_vueChat', 'false');
  localStorage.setItem('feature_vueAdmin', 'false');
  localStorage.setItem('feature_vueSettings', 'false');
  localStorage.setItem('devMode', 'false');
  
  // 2. CSS für Vue-Templates direkt einfügen
  var style = document.createElement('style');
  style.textContent = '.vue-template-container { display: none \!important; }';
  document.head.appendChild(style);
  
  // 3. Container für doc-converter einfügen
  if (\!document.getElementById('doc-converter-container')) {
    var container = document.createElement('div');
    container.id = 'doc-converter-container';
    container.style.display = 'none';
    document.body.appendChild(container);
    console.log("Container doc-converter-container erstellt");
  }
  
  // 4. Endlosschleifen verhindern
  var originalSetTimeout = window.setTimeout;
  window.setTimeout = function(fn, delay) {
    if (typeof fn === 'function' && fn.toString().includes('initializeConverter') && delay === 500) {
      console.warn("Verhindere Endlosschleife im doc-converter-fallback");
      return -1;
    }
    return originalSetTimeout(fn, delay);
  };
  
  // 5. Reset-Button erstellen (nur bei ?debug=true anzeigen)
  if (window.location.search.includes('debug=true')) {
    var resetBtn = document.createElement('div');
    resetBtn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;background:white;padding:5px;border:1px solid #ccc;border-radius:3px;';
    resetBtn.innerHTML = '<button onclick="localStorage.clear();localStorage.setItem(\'useNewUI\',\'false\');localStorage.setItem(\'feature_vueDocConverter\',\'false\');localStorage.setItem(\'feature_vueChat\',\'false\');localStorage.setItem(\'feature_vueAdmin\',\'false\');localStorage.setItem(\'feature_vueSettings\',\'false\');window.location.reload();" style="padding:5px;background:#f44336;color:white;border:none;cursor:pointer;">Reset All</button>';
    document.body.appendChild(resetBtn);
  }
});
