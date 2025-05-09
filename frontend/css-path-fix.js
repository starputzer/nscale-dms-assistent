/**
 * CSS-Pfad-Fixer für nscale DMS Assistent
 * 
 * Dieses Skript stellt sicher, dass CSS-Dateien korrekt geladen werden,
 * auch wenn die Pfade in der index.html nicht korrekt sind.
 */

(function() {
  console.log('CSS-Pfad-Fixer wird ausgeführt...');
  
  // Liste der zu überprüfenden CSS-Dateien und deren Fallback-Pfade
  const cssFiles = [
    { original: '/css/main.css', fallback: '/frontend/css/main.css', altFallback: '/public/css/main.css' },
    { original: '/css/themes.css', fallback: '/frontend/css/themes.css', altFallback: '/public/css/themes.css' },
    { original: '/css/improved-ui.css', fallback: '/frontend/css/improved-ui.css', altFallback: '/public/css/improved-ui.css' },
    { original: '/css/admin.css', fallback: '/frontend/css/admin.css', altFallback: '/public/css/admin.css' },
    { original: '/css/feedback.css', fallback: '/frontend/css/feedback.css', altFallback: '/public/css/feedback.css' },
    { original: '/css/message-actions.css', fallback: '/frontend/css/message-actions.css', altFallback: '/public/css/message-actions.css' },
    { original: '/css/settings.css', fallback: '/frontend/css/settings.css', altFallback: '/public/css/settings.css' },
    { original: '/css/source-references.css', fallback: '/frontend/css/source-references.css', altFallback: '/public/css/source-references.css' },
    { original: '/frontend/css/interaction-fix.css', fallback: '/css/interaction-fix.css', altFallback: '/public/css/interaction-fix.css' }
  ];
  
  // Prüfe und repariere Stylesheets
  function checkAndFixStylesheets() {
    // Prüfe, ob Stylesheets erfolgreich geladen wurden
    const loadedSheets = Array.from(document.styleSheets).map(sheet => sheet.href);
    
    // Fehlende Stylesheets
    const missingSheets = cssFiles.filter(css => {
      const versionedOriginal = new RegExp(css.original + '(\\?v=\\w+)?$');
      const versionedFallback = new RegExp(css.fallback + '(\\?v=\\w+)?$');
      const versionedAltFallback = new RegExp(css.altFallback + '(\\?v=\\w+)?$');
      
      return !loadedSheets.some(href => {
        if (!href) return false;
        return versionedOriginal.test(href) || versionedFallback.test(href) || versionedAltFallback.test(href);
      });
    });
    
    console.log(`${missingSheets.length} fehlende Stylesheet(s) gefunden`);
    
    // Fehlende Stylesheets nachladen
    if (missingSheets.length > 0) {
      missingSheets.forEach(css => {
        loadStylesheet(css);
      });
    }
  }
  
  // Lade ein Stylesheet mit Fallbacks
  function loadStylesheet(cssFile) {
    const timestamp = new Date().getTime();
    const paths = [
      cssFile.original + '?v=' + timestamp, 
      cssFile.fallback + '?v=' + timestamp, 
      cssFile.altFallback + '?v=' + timestamp
    ];
    
    console.log(`Versuche, ${cssFile.original} zu laden...`);
    
    // Versuche, alle Pfade nacheinander zu laden
    let loaded = false;
    
    function tryNextPath(index) {
      if (index >= paths.length || loaded) return;
      
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = paths[index];
      
      stylesheet.onload = function() {
        console.log(`✓ Stylesheet erfolgreich geladen von: ${paths[index]}`);
        loaded = true;
      };
      
      stylesheet.onerror = function() {
        console.log(`✗ Fehler beim Laden von: ${paths[index]}`);
        tryNextPath(index + 1);
      };
      
      document.head.appendChild(stylesheet);
    }
    
    tryNextPath(0);
  }
  
  // Warte, bis das DOM geladen ist
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndFixStylesheets);
  } else {
    checkAndFixStylesheets();
  }
  
  // Wiederhole die Prüfung nach 3 Sekunden für verzögert geladene Ressourcen
  setTimeout(checkAndFixStylesheets, 3000);
})();