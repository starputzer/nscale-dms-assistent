# Reset-Anleitung für nscale DMS Assistent

## Durchgeführte Änderungen

Die Anwendung wurde auf einen stabilen Zustand zurückgesetzt:

1. **index.html zurückgesetzt** auf den Stand vor den Vue.js-Fixes (Commit fa505f8)
2. **Vue.js geändert** von Production auf Development-Version für bessere Fehlermeldungen
3. **Fix-Script hinzugefügt**, das:
   - Feature-Flags automatisch zurücksetzt
   - Endlosschleifen verhindert
   - Fehlende Container erstellt
   - Vue-Templates ausblendet
4. **Reset-Link hinzugefügt** oben rechts auf der Seite

## Verwendung

Die Anwendung sollte jetzt wieder normal funktionieren. Wenn Probleme auftreten:

1. Klicke auf den kleinen "Reset"-Link oben rechts
2. Die Anwendung wird mit zurückgesetzten Einstellungen neu geladen

## Technische Details

Das Vue-Fix-Script macht folgendes:

```javascript
// Feature-Flags zurücksetzen
localStorage.setItem('useNewUI', 'false');
localStorage.setItem('feature_vueDocConverter', 'false');
localStorage.setItem('feature_vueChat', 'false');
localStorage.setItem('feature_vueAdmin', 'false');
localStorage.setItem('feature_vueSettings', 'false');

// Endlosschleifen verhindern
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
```

Der Reset-Link führt diesen Code aus:
```javascript
localStorage.clear(); 
localStorage.setItem('useNewUI', 'false'); 
localStorage.setItem('feature_vueDocConverter', 'false'); 
localStorage.setItem('feature_vueChat', 'false'); 
localStorage.setItem('feature_vueAdmin', 'false'); 
localStorage.setItem('feature_vueSettings', 'false'); 
window.location.reload();
```
