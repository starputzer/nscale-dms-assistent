/**
 * Vue 3 SFC Loader Fix
 * 
 * Diese Datei behebt Probleme beim Laden von Vue 3 SFC-Komponenten
 * durch die korrekte Initialisierung von Feature-Flags und Mount-Punkten.
 */

(function() {
    console.log('Vue 3 SFC Loader Fix wird initialisiert...');
    
    // 1. Feature-Flags korrekt setzen
    function setupFeatureFlags() {
        try {
            // Feature-Toggle-Store aus localStorage laden
            let featureToggles = {};
            try {
                const storedToggles = localStorage.getItem('featureToggles');
                featureToggles = storedToggles ? JSON.parse(storedToggles) : {};
            } catch (e) {
                console.error('Fehler beim Laden der Feature-Toggles:', e);
                featureToggles = {};
            }
            
            // Sicherstellen, dass die Basisabhängigkeiten aktiviert sind
            const dependencies = {
                usePiniaAuth: true,
                usePiniaUI: true,
                usePiniaSessions: true,
                usePiniaSettings: true,
                useLegacyBridge: true
            };
            
            // Abhängigkeiten sicherstellen
            Object.entries(dependencies).forEach(([key, value]) => {
                featureToggles[key] = value;
            });
            
            // Admin-Feature ist standardmäßig aktiviert
            featureToggles.useSfcAdmin = true;
            
            // Die alten localStorage-Keys direkt setzen
            localStorage.setItem('useVueComponents', 'true');
            
            // Wenn Document Converter aktiviert ist, auch den Flag setzen
            if (featureToggles.useSfcDocConverter) {
                localStorage.setItem('useVueDocConverter', 'true');
            }
            
            // Aktualisierte Feature-Toggles speichern
            localStorage.setItem('featureToggles', JSON.stringify(featureToggles));
            
            console.log('Feature-Flags korrekt konfiguriert:', featureToggles);
            
            // Stellen Sie sicher, dass das globale Objekt aktualisiert wird
            if (window.nscale && window.nscale.featureToggles) {
                Object.assign(window.nscale.featureToggles, featureToggles);
            } else {
                window.nscale = window.nscale || {};
                window.nscale.featureToggles = featureToggles;
            }
            
            return true;
        } catch (e) {
            console.error('Fehler beim Einrichten der Feature-Flags:', e);
            return false;
        }
    }
    
    // 2. Stelle sicher, dass die Mount-Punkte existieren
    function setupMountPoints() {
        try {
            const mountPoints = [
                { id: 'vue-app', parent: 'app' },
                { id: 'vue-dms-app', parent: 'app' },
                { id: 'doc-converter-mount', parent: 'app' }
            ];
            
            mountPoints.forEach(point => {
                if (!document.getElementById(point.id)) {
                    console.log(`Mount-Punkt '${point.id}' nicht gefunden, wird erstellt...`);
                    
                    // Elternelement finden (oder body als Fallback)
                    const parentElement = document.getElementById(point.parent) || document.body;
                    
                    // Mount-Punkt erstellen
                    const mountElement = document.createElement('div');
                    mountElement.id = point.id;
                    
                    // Einige Mount-Punkte benötigen spezielle Styles
                    if (point.id === 'vue-dms-app') {
                        mountElement.className = 'vue-container';
                    }
                    
                    // Mount-Punkt zum DOM hinzufügen
                    parentElement.appendChild(mountElement);
                } else {
                    console.log(`Mount-Punkt '${point.id}' existiert bereits.`);
                }
            });
            
            return true;
        } catch (e) {
            console.error('Fehler beim Einrichten der Mount-Punkte:', e);
            return false;
        }
    }
    
    // 3. Bridge-Initialisierung sicherstellen
    function setupBridge() {
        try {
            // Stellen Sie sicher, dass globale Namensräume existieren
            window.nscale = window.nscale || {};
            window.nscale.bridge = window.nscale.bridge || {};
            window.nscale.events = window.nscale.events || {};
            
            // Event-Handling-Funktionen bereitstellen, falls sie fehlen
            if (!window.nscale.events.on) {
                window.nscale.events.on = function(event, callback) {
                    console.log(`Event-Handler registriert für: ${event}`);
                    window.addEventListener(`nscale:${event}`, function(e) {
                        callback(e.detail);
                    });
                };
            }
            
            if (!window.nscale.events.emit) {
                window.nscale.events.emit = function(event, data) {
                    console.log(`Event ausgelöst: ${event}`, data);
                    const customEvent = new CustomEvent(`nscale:${event}`, { detail: data });
                    window.dispatchEvent(customEvent);
                };
            }
            
            return true;
        } catch (e) {
            console.error('Fehler beim Einrichten der Bridge:', e);
            return false;
        }
    }
    
    // 4. Vue-Anwendung initialisieren (falls erforderlich)
    function initializeVueApp() {
        try {
            // Nur initialisieren, wenn die Vue-Anwendung noch nicht aktiviert wurde
            if (typeof window.initializeVueComponents === 'function') {
                console.log('Vue-Komponenten werden direkt initialisiert...');
                window.initializeVueComponents();
            }
            
            // Trigger bridge-ready event to notify Vue components
            setTimeout(() => {
                console.log('Bridge-Ready-Event wird ausgelöst...');
                
                // Event über window.nscale.events auslösen, falls vorhanden
                if (window.nscale && window.nscale.events && window.nscale.events.emit) {
                    window.nscale.events.emit('bridge-ready', { version: '1.0' });
                }
                
                // Natives DOM-Event auslösen
                const bridgeReadyEvent = new CustomEvent('nscale-bridge-ready', { 
                    detail: { version: '1.0' }
                });
                window.dispatchEvent(bridgeReadyEvent);
                document.dispatchEvent(bridgeReadyEvent);
            }, 500);
            
            return true;
        } catch (e) {
            console.error('Fehler bei der Vue-Initialisierung:', e);
            return false;
        }
    }
    
    // Hauptinitialisierungsfunktion mit Fehlerbehandlung
    function initializeComponents() {
        console.log('Vue 3 SFC-Komponenten werden initialisiert...');
        
        // 1. Feature-Flags einrichten
        if (!setupFeatureFlags()) {
            console.error('Fehler beim Einrichten der Feature-Flags. Die Initialisierung wird fortgesetzt...');
        }
        
        // 2. Mount-Punkte einrichten
        if (!setupMountPoints()) {
            console.error('Fehler beim Einrichten der Mount-Punkte. Die Initialisierung wird fortgesetzt...');
        }
        
        // 3. Bridge einrichten
        if (!setupBridge()) {
            console.error('Fehler beim Einrichten der Bridge. Die Initialisierung wird fortgesetzt...');
        }
        
        // 4. Vue-Anwendung initialisieren
        if (!initializeVueApp()) {
            console.error('Fehler bei der Vue-Initialisierung. Die Komponenten wurden möglicherweise nicht geladen.');
        }
    }
    
    // Bei DOMContentLoaded oder sofort, falls DOM bereits geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeComponents);
    } else {
        initializeComponents();
    }
    
    // Globale Funktionen für Debugging exponieren
    window.vueLoaderFix = {
        reinitialize: initializeComponents,
        setupFeatureFlags,
        setupMountPoints,
        setupBridge,
        initializeVueApp
    };
    
    console.log('Vue 3 SFC Loader Fix wurde installiert. Verwenden Sie window.vueLoaderFix für Debug-Funktionen.');
})();