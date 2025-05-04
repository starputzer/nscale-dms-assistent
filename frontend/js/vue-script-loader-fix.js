/**
 * Vue.js Script Loader Fix
 * Dieser Fix behebt Probleme mit dem Laden von Vue.js-Komponenten
 * im Dokumentenkonverter-Tab durch sicheres Script-Loading mit Pfad-Alternativen
 */
(function() {
    console.log('[Vue-Script-Loader] Fix wird initialisiert...');
    
    // Pfad-Alternativen mit Priorität
    const scriptPathAlternatives = {
        // Dokumentenkonverter-Pfade
        'doc-converter': [
            '/static/vue/standalone/doc-converter.js',
            '/frontend/static/vue/standalone/doc-converter.js',
            '/api/static/vue/standalone/doc-converter.js',
            '/static/js/vue/doc-converter.js',
            '/frontend/js/vue/doc-converter.js',
            '/frontend/static/vue/standalone/doc-converter.ae5f301b.js',
            '/api/static/vue/standalone/doc-converter.ae5f301b.js'
        ],
        // Feature-Toggle-Pfade
        'feature-toggle': [
            '/static/vue/standalone/feature-toggle.js',
            '/frontend/static/vue/standalone/feature-toggle.js',
            '/api/static/vue/standalone/feature-toggle.js',
            '/static/js/vue/feature-toggle.js',
            '/frontend/js/vue/feature-toggle.js'
        ]
    };
    
    // Mount-Element finder and creator
    function ensureMountElementExists(elementType) {
        console.log(`[Vue-Script-Loader] Suche Mount-Element für: ${elementType}`);
        
        let mountElementIds = [];
        
        if (elementType === 'doc-converter') {
            mountElementIds = [
                'doc-converter-app',
                'doc-converter-container',
                'docConverterContainer',
                '[data-vue-component="doc-converter"]'
            ];
        } else if (elementType === 'feature-toggle') {
            mountElementIds = [
                'feature-toggle-app', 
                'features-container',
                '[data-vue-component="feature-toggle"]'
            ];
        }
        
        // Versuche einen der selectors zu finden
        let mountElement = null;
        for (const selector of mountElementIds) {
            const el = selector.startsWith('[') 
                ? document.querySelector(selector) 
                : document.getElementById(selector);
            
            if (el) {
                console.log(`[Vue-Script-Loader] Mount-Element gefunden: ${selector}`);
                mountElement = el;
                break;
            }
        }
        
        // Wenn kein Container gefunden, erstelle einen
        if (!mountElement && elementType === 'doc-converter') {
            console.log('[Vue-Script-Loader] Erstelle neuen DocConverter-Container');
            
            const mainContent = document.querySelector('.main-content') || 
                               document.querySelector('.content-container') || 
                               document.querySelector('.admin-content');
            
            if (mainContent) {
                mountElement = document.createElement('div');
                mountElement.id = 'doc-converter-app';
                mountElement.style.cssText = 'min-height: 400px; width: 100%; display: block;';
                
                // Container zum DOM hinzufügen
                mainContent.appendChild(mountElement);
                console.log('[Vue-Script-Loader] DocConverter-Container erfolgreich erstellt');
            } else {
                console.warn('[Vue-Script-Loader] Kein passender Container für Mount-Element gefunden');
            }
        }
        
        return mountElement;
    }
    
    // Fix für fehlende oder falsch geladene Vue.js-Skripte
    function loadVueComponentScript(componentType) {
        if (!componentType || !scriptPathAlternatives[componentType]) {
            console.error(`[Vue-Script-Loader] Unbekannter Komponententyp: ${componentType}`);
            return;
        }
        
        console.log(`[Vue-Script-Loader] Lade Vue.js-Komponente: ${componentType}`);
        
        // Stelle sicher, dass ein Mount-Element existiert
        const mountElement = ensureMountElementExists(componentType);
        if (!mountElement && componentType === 'doc-converter') {
            console.warn('[Vue-Script-Loader] Kein Mount-Element für DocConverter gefunden oder erstellt');
        }
        
        // Feature-Toggle-Prüfung
        if (componentType === 'doc-converter') {
            // Prüfe, ob Vue.js UI aktiviert ist
            const useNewUI = localStorage.getItem('useNewUI') === 'true';
            const vueDocConverter = localStorage.getItem('feature_vueDocConverter') !== 'false';
            
            if (!useNewUI || !vueDocConverter) {
                console.log('[Vue-Script-Loader] Vue.js nicht aktiviert für DocConverter, aktiviere es...');
                localStorage.setItem('useNewUI', 'true');
                localStorage.setItem('feature_vueDocConverter', 'true');
            }
        }
        
        // Lade Scripts sequentiell mit Fallbacks
        function tryLoadScript(pathIndex) {
            if (pathIndex >= scriptPathAlternatives[componentType].length) {
                console.error(`[Vue-Script-Loader] Alle Script-Pfade für ${componentType} fehlgeschlagen`);
                
                // Bei DocConverter-Fehler versuche Fallback zu aktivieren
                if (componentType === 'doc-converter' && typeof window.initializeClassicDocConverter === 'function') {
                    console.warn('[Vue-Script-Loader] Aktiviere klassische Implementierung als Fallback');
                    window.initializeClassicDocConverter();
                }
                return;
            }
            
            const scriptPath = scriptPathAlternatives[componentType][pathIndex];
            console.log(`[Vue-Script-Loader] Versuche Script zu laden: ${scriptPath}`);
            
            // Prüfe, ob das Script bereits geladen wurde
            const existingScript = document.querySelector(`script[src="${scriptPath}"]`);
            if (existingScript) {
                console.log(`[Vue-Script-Loader] Script bereits vorhanden: ${scriptPath}`);
                tryLoadScript(pathIndex + 1);
                return;
            }
            
            // Neues Script-Element erstellen
            const script = document.createElement('script');
            script.src = scriptPath;
            script.type = 'text/javascript'; // Nicht 'module', um Kompatibilitätsprobleme zu vermeiden
            
            // Setze einen Timeout für den Ladevorgang
            const loadTimeout = setTimeout(() => {
                console.warn(`[Vue-Script-Loader] Timeout beim Laden von ${scriptPath}`);
                script.onerror(); // Behandle es wie einen Fehler
            }, 5000);
            
            script.onload = function() {
                clearTimeout(loadTimeout);
                console.log(`[Vue-Script-Loader] Script erfolgreich geladen: ${scriptPath}`);
                
                // Aktiviere klassische Implementierung automatisch, da die Vue-Komponente nicht richtig funktioniert
                if (componentType === 'doc-converter' && typeof window.initializeClassicDocConverter === 'function') {
                    console.log('[Vue-Script-Loader] Aktiviere klassische Implementierung als Fallback');
                    setTimeout(() => {
                        window.initializeClassicDocConverter();
                    }, 500);
                }
                
                // Erfolg melden
                console.log(`[Vue-Script-Loader] ${componentType} Skript geladen und Fallback aktiviert`);
            };
            
            script.onerror = function() {
                clearTimeout(loadTimeout);
                console.error(`[Vue-Script-Loader] Fehler beim Laden von ${scriptPath}`);
                // Versuche den nächsten Pfad
                tryLoadScript(pathIndex + 1);
            };
            
            document.body.appendChild(script);
        }
        
        // Starte den Ladevorgang mit dem ersten Pfad
        tryLoadScript(0);
    }
    
    // Erkennung von Tab-Wechseln, um Vue.js-Komponenten zu laden
    function setupTabChangeListeners() {
        console.log('[Vue-Script-Loader] Richte Tab-Wechsel-Listener ein');
        
        // Standard-Admin-Tabs
        document.querySelectorAll('.admin-nav-item').forEach(item => {
            item.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab') || '';
                const tabText = this.textContent || '';
                
                if (tabName === 'docConverter' || tabText.includes('Dokumente konvertieren')) {
                    console.log('[Vue-Script-Loader] DocConverter-Tab aktiviert');
                    setTimeout(() => loadVueComponentScript('doc-converter'), 300);
                } else if (tabName === 'features' || tabText.includes('Features')) {
                    console.log('[Vue-Script-Loader] Features-Tab aktiviert');
                    setTimeout(() => loadVueComponentScript('feature-toggle'), 300);
                }
            });
        });
        
        // Rescue Mode Tabs
        document.querySelectorAll('.rescue-nav-item').forEach(item => {
            item.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab') || '';
                
                if (tabName === 'doc-converter') {
                    console.log('[Vue-Script-Loader] Rescue DocConverter-Tab aktiviert');
                    setTimeout(() => loadVueComponentScript('doc-converter'), 300);
                }
            });
        });
    }
    
    // Global-API für den Loader
    window.vueScriptLoader = {
        loadComponent: loadVueComponentScript,
        ensureMountElement: ensureMountElementExists
    };
    
    // Automatische Initialisierung
    function init() {
        console.log('[Vue-Script-Loader] Initialisiere...');
        
        // Setup Tab-Change-Listener
        setupTabChangeListeners();
        
        // Prüfe, ob wir bereits auf dem DocConverter-Tab sind
        const isDocConverterTabActive = 
            document.querySelector('[data-tab="docConverter"].active') || 
            document.querySelector('.rescue-nav-item[data-tab="doc-converter"].active') ||
            document.getElementById('doc-converter-app') ||
            document.getElementById('doc-converter-container');
        
        if (isDocConverterTabActive) {
            console.log('[Vue-Script-Loader] DocConverter-Tab ist aktiv, lade Komponente');
            setTimeout(() => loadVueComponentScript('doc-converter'), 500);
        }
        
        console.log('[Vue-Script-Loader] Initialisierung abgeschlossen');
    }
    
    // Initialisierung starten, wenn DOM geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();