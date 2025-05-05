// Vue-Komponenten deaktivieren
(function() {
    // Alle Feature-Toggles auf false setzen
    localStorage.setItem('feature_vueDocConverter', 'false');
    localStorage.setItem('feature_vueAdmin', 'false');
    localStorage.setItem('feature_vueSettings', 'false');
    localStorage.setItem('feature_vueChat', 'false');
    
    console.log('Alle Vue-Komponenten wurden deaktiviert.');
    
    // Sicherstellen, dass die klassischen JS-Komponenten geladen werden
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Klassische UI wird geladen...');
        
        // Prüfen, ob die klassischen Skripte korrekt geladen wurden
        try {
            // Dokumentenkonverter-Fallback aktivieren
            if (window.initDocumentConverter && typeof window.initDocumentConverter === 'function') {
                window.initDocumentConverter();
                console.log('Dokumentenkonverter-Fallback erfolgreich initialisiert.');
            } else {
                console.warn('Dokumentenkonverter-Fallback-Funktion nicht gefunden!');
            }
        } catch (error) {
            console.error('Fehler beim Initialisieren der klassischen UI:', error);
        }
    });
})();