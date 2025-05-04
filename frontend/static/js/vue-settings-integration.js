/**
 * Integration der Vue.js-basierten Einstellungen in die klassische UI
 * Ermöglicht die Verwendung der neuen Vue.js-Komponenten im Einstellungsbereich
 */

(function() {
    console.log('Initialisiere Vue.js-Einstellungsintegration...');
    
    // Konfiguration für die Integration
    const config = {
        mountPoint: '#settings-vue-container', // DOM-Element für die Vue-Komponente
        fallbackDelay: 3000, // Verzögerung in ms, bevor Fallback-Implementierung geladen wird
        debugMode: localStorage.getItem('devMode') === 'true' // Debug-Modus aktiviert?
    };
    
    // Status-Objekt für die Integration
    const state = {
        initialized: false,
        loadAttempted: false,
        vueComponentLoaded: false,
        fallbackUsed: false
    };
    
    /**
     * Prüft, ob die Vue.js-Integration verwendet werden sollte
     * @returns {boolean} - true, wenn Vue.js verwendet werden soll
     */
    function shouldUseVueIntegration() {
        // Feature-Toggle für neue UI prüfen
        const useNewUI = localStorage.getItem('useNewUI') === 'true';
        
        // Spezifischer Feature-Toggle für Vue.js-Einstellungen
        const useVueSettings = localStorage.getItem('feature_vueSettings') !== 'false';
        
        return useNewUI && useVueSettings;
    }
    
    /**
     * Lädt die Vue.js-Komponente für die Einstellungen
     * @returns {Promise} - Promise, das nach dem Laden aufgelöst wird
     */
    function loadVueComponent() {
        return new Promise((resolve, reject) => {
            if (state.vueComponentLoaded) {
                resolve();
                return;
            }
            
            // Timeout für Fallback setzen
            const timeout = setTimeout(() => {
                reject(new Error('Timeout beim Laden der Vue.js-Komponente'));
            }, config.fallbackDelay);
            
            // Script-Element erstellen
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = '/static/vue/standalone/settings.js';
            
            // Event-Listener für Erfolg
            script.onload = () => {
                clearTimeout(timeout);
                state.vueComponentLoaded = true;
                console.log('Vue.js-Einstellungskomponente erfolgreich geladen');
                resolve();
            };
            
            // Event-Listener für Fehler
            script.onerror = (error) => {
                clearTimeout(timeout);
                console.error('Fehler beim Laden der Vue.js-Einstellungskomponente:', error);
                reject(error);
            };
            
            // Script zum DOM hinzufügen
            document.body.appendChild(script);
        });
    }
    
    /**
     * Lädt die klassische Fallback-Implementierung für die Einstellungen
     */
    function loadFallbackImplementation() {
        if (state.fallbackUsed) return;
        
        console.log('Lade klassische Implementierung für Einstellungen');
        state.fallbackUsed = true;
        
        // Verstecke den Vue.js-Container
        const vueContainer = document.querySelector(config.mountPoint);
        if (vueContainer) {
            vueContainer.style.display = 'none';
        }
        
        // Zeige den klassischen Container
        const classicContainer = document.querySelector('#settings-classic-container');
        if (classicContainer) {
            classicContainer.style.display = 'block';
        }
        
        // Hier könnte weiterer Code folgen, um die klassische Implementierung zu laden
    }
    
    /**
     * Initialisiert die Einstellungsintegration
     */
    function initSettingsIntegration() {
        if (state.initialized || state.loadAttempted) return;
        state.loadAttempted = true;
        
        console.log('Initialisiere Einstellungsintegration');
        
        // Mount-Punkt für Vue.js-Komponente finden
        const mountPoint = document.querySelector(config.mountPoint);
        if (!mountPoint) {
            console.warn('Mount-Punkt für Einstellungsintegration nicht gefunden:', config.mountPoint);
            return;
        }
        
        // Prüfen, ob Vue.js verwendet werden soll
        if (shouldUseVueIntegration()) {
            console.log('Verwende Vue.js-Einstellungen');
            
            // Zeige Ladeanimation
            mountPoint.innerHTML = `
                <div class="loading-container">
                    <div class="spinner"></div>
                    <p class="text-center mt-3">Einstellungen werden geladen...</p>
                </div>
            `;
            
            // Vue.js-Komponente laden
            loadVueComponent()
                .then(() => {
                    console.log('Vue.js-Komponente erfolgreich geladen, initialisiere...');
                    state.initialized = true;
                    
                    // Hier würde die eigentliche Initialisierung der Vue-Komponente erfolgen
                    // Dies wird meist automatisch durch das geladene Skript erledigt
                })
                .catch((error) => {
                    console.error('Fehler beim Laden der Vue.js-Einstellungen:', error);
                    loadFallbackImplementation();
                });
        } else {
            console.log('Verwende klassische Einstellungsimplementierung');
            loadFallbackImplementation();
        }
    }
    
    /**
     * Überwacht Änderungen am DOM, um die Integration zu initialisieren,
     * wenn der Einstellungsbereich sichtbar wird
     */
    function setupDOMObserver() {
        // MutationObserver für DOM-Änderungen
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    // Prüfen, ob der Einstellungscontainer hinzugefügt wurde
                    const settingsContainer = document.querySelector('#settings-container');
                    if (settingsContainer && settingsContainer.style.display !== 'none') {
                        // Einstellungen sind sichtbar, initialisieren
                        initSettingsIntegration();
                    }
                }
                
                // Auch auf Änderungen des style-Attributes achten
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const target = mutation.target;
                    if (target.id === 'settings-container' && target.style.display !== 'none') {
                        // Einstellungen wurden sichtbar gemacht
                        initSettingsIntegration();
                    }
                }
            });
        });
        
        // Gesamtes Dokument beobachten
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style']
        });
        
        console.log('DOM-Observer für Einstellungsintegration eingerichtet');
    }
    
    /**
     * Richtet Event-Listener für den Einstellungs-Button ein
     */
    function setupSettingsButtonListener() {
        // Event-Listener für Klicks auf den Einstellungs-Button
        document.addEventListener('click', (event) => {
            const target = event.target;
            
            // Prüfen, ob auf den Einstellungs-Button oder ein Kind-Element geklickt wurde
            if (target.id === 'settings-button' || 
                target.closest('#settings-button') || 
                target.classList.contains('settings-toggle') ||
                target.closest('.settings-toggle')) {
                
                // Kurze Verzögerung, um dem DOM Zeit zum Aktualisieren zu geben
                setTimeout(initSettingsIntegration, 100);
            }
        });
        
        console.log('Event-Listener für Einstellungs-Button eingerichtet');
    }
    
    // Initialisierung
    document.addEventListener('DOMContentLoaded', () => {
        // Prüfen, ob die Einstellungen bereits sichtbar sind
        const settingsContainer = document.querySelector('#settings-container');
        if (settingsContainer && settingsContainer.style.display !== 'none') {
            initSettingsIntegration();
        }
        
        // Event-Listener für Einstellungs-Button einrichten
        setupSettingsButtonListener();
        
        // DOM-Observer einrichten
        setupDOMObserver();
        
        console.log('Vue.js-Einstellungsintegration initialisiert');
    });
    
    // Globalen Zugriff auf die Integration bereitstellen
    window.vueSettingsIntegration = {
        init: initSettingsIntegration,
        loadVueComponent: loadVueComponent,
        loadFallbackImplementation: loadFallbackImplementation,
        getState: () => ({ ...state })
    };
})();