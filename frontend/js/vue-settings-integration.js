/**
 * vue-settings-integration.js
 * 
 * Diese Datei integriert die Vue.js SettingsView in die klassische Oberfläche
 * des nScale DMS Assistenten.
 */

// DOM-Element finden oder erstellen für das Vue-Component-Mounting
document.addEventListener('DOMContentLoaded', function() {
    let initializationAttempts = 0;
    const MAX_INITIALIZATION_ATTEMPTS = 5;
    
    const initializeVueSettings = () => {
        // Prüfen, ob bereits initialisiert
        const alreadyInitialized = document.querySelector('[data-vue-settings-initialized="true"]');
        if (alreadyInitialized) {
            console.log('Vue Settings bereits initialisiert, überspringe...');
            return;
        }
        
        // Prüfen, ob Container für Vue Settings vorhanden ist
        let settingsContainer = document.querySelector('.settings-panel');
        
        // Wenn kein Container gefunden wurde, nicht fortfahren und später erneut versuchen
        if (!settingsContainer) {
            console.log('Settings-Panel noch nicht im DOM gefunden, versuche später erneut...');
            
            // Erhöhe den Zähler für Initialisierungsversuche
            initializationAttempts++;
            
            // Wenn die maximale Anzahl an Versuchen erreicht ist, abbrechen
            if (initializationAttempts >= MAX_INITIALIZATION_ATTEMPTS) {
                console.warn(`Maximale Anzahl an Initialisierungsversuchen (${MAX_INITIALIZATION_ATTEMPTS}) erreicht. Breche ab.`);
                return;
            }
            
            // Erneut versuchen nach kurzer Verzögerung
            setTimeout(initializeVueSettings, 500);
            return;
        }
        
        // Prüfen, ob das Vue-Mount-Element bereits existiert
        let vueMount = settingsContainer.querySelector('#vue-settings-mount');
        
        // Wenn nicht, erstellen
        if (!vueMount) {
            console.log('Erstelle Vue-Mount-Punkt für Settings-Komponente...');
            
            vueMount = document.createElement('div');
            vueMount.id = 'vue-settings-mount';
            
            // Ersetze den vorhandenen Inhalt
            settingsContainer.innerHTML = '';
            settingsContainer.appendChild(vueMount);
        }
        
        // Markiere als initialisiert
        settingsContainer.setAttribute('data-vue-settings-initialized', 'true');
        
        // Prüfe, ob das nötige Vue-Script bereits geladen ist
        loadVueSettingsScript();
    };
    
    /**
     * Lädt das externe Vue-Settings-Script
     */
    const loadVueSettingsScript = () => {
        // Prüfen, ob Script bereits geladen ist
        const scriptExists = document.querySelector('script[src*="doc-converter.js"]');
        
        if (!scriptExists) {
            console.log('Lade Vue-Settings-Script...');
            
            const script = document.createElement('script');
            script.type = 'text/javascript'; // Wichtig: Kein Modul-Typ verwenden für Browser-Kompatibilität
            script.src = '/api/static/vue/standalone/settings.js';
            script.onload = () => {
                console.log('Vue-Settings-Script erfolgreich geladen');
                
                // Initialisiere die Vue-Komponente
                if (window.mountVueSettings && typeof window.mountVueSettings === 'function') {
                    try {
                        window.mountVueSettings('#vue-settings-mount');
                    } catch (error) {
                        console.error('Fehler beim Initialisieren der Vue-Settings-Komponente:', error);
                    }
                } else {
                    console.error('mountVueSettings-Funktion nicht gefunden');
                }
            };
            
            script.onerror = (error) => {
                console.error('Fehler beim Laden des Vue-Settings-Scripts:', error);
            };
            
            document.body.appendChild(script);
        } else {
            console.log('Vue-Settings-Script bereits geladen');
            
            // Initialisiere die Vue-Komponente
            if (window.mountVueSettings && typeof window.mountVueSettings === 'function') {
                try {
                    window.mountVueSettings('#vue-settings-mount');
                } catch (error) {
                    console.error('Fehler beim Initialisieren der Vue-Settings-Komponente:', error);
                }
            }
        }
    };
    
    // Initialisierung mit kurzer Verzögerung starten
    setTimeout(initializeVueSettings, 1000);
    
    // Event-Listener für dynamisch eingefügte Elemente
    const bodyObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Wenn das Settings-Panel dynamisch hinzugefügt wurde, initialisieren
                if (!document.querySelector('[data-vue-settings-initialized="true"]') && 
                    document.querySelector('.settings-panel')) {
                    initializeVueSettings();
                }
            }
        }
    });
    
    // Beobachte den Body auf Änderungen
    bodyObserver.observe(document.body, { childList: true, subtree: true });
    
    // Nach 10 Sekunden den Observer beenden, um Ressourcen zu sparen
    setTimeout(() => {
        bodyObserver.disconnect();
        console.log('DOM-Beobachter für Vue-Settings-Integration beendet');
    }, 10000);
});