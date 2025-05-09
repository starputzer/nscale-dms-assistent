/**
 * Vue 3 SFC App Fix
 * 
 * Diese Datei sorgt dafür, dass die Vue 3 SFC-Anwendung korrekt initialisiert wird,
 * indem sie die erforderlichen Feature-Flags setzt und Mount-Punkte erstellt.
 */

(function() {
    console.log('Vue App Fix wird ausgeführt...');
    
    // Feature Flags aktivieren
    try {
        // Direkte localStorage-Flags setzen
        localStorage.setItem('useVueComponents', 'true');
        localStorage.setItem('useVueDocConverter', 'true');
        
        // Feature-Toggles aus dem Pinia-Store aktualisieren
        let featureToggles = {};
        try {
            const storedToggles = localStorage.getItem('featureToggles');
            featureToggles = storedToggles ? JSON.parse(storedToggles) : {};
        } catch (e) {
            featureToggles = {};
        }
        
        // SFC-Features aktivieren
        featureToggles.useSfcAdmin = true;
        featureToggles.useSfcDocConverter = true;
        featureToggles.useSfcChat = true;
        featureToggles.useSfcSettings = true;
        
        // Abhängigkeiten aktivieren
        featureToggles.usePiniaAuth = true;
        featureToggles.usePiniaUI = true;
        featureToggles.usePiniaSessions = true;
        featureToggles.usePiniaSettings = true;
        featureToggles.useLegacyBridge = true;
        
        // Feature-Toggles speichern
        localStorage.setItem('featureToggles', JSON.stringify(featureToggles));
        
        console.log('Alle Feature Flags wurden aktiviert');
    } catch (e) {
        console.error('Fehler beim Setzen der Feature Flags:', e);
    }
})();