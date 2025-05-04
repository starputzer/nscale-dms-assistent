/**
 * Enhanced Diagnostic Tool für Vue.js Document Converter
 * Dieses Skript diagnostiziert Probleme mit der Vue.js-Aktivierung für den Dokumentenkonverter
 */
(function() {
    // Aktiviere ausführliches Logging
    const debugMode = true;
    
    // Container für Diagnoseausgabe
    let diagContainer = null;
    
    // Zeitstempel für Logs
    function timestamp() {
        return new Date().toISOString().split('T')[1].slice(0, -1);
    }
    
    // Bessere Logging-Funktion
    function log(message, type = 'info') {
        const prefix = `[DocConverter-Diagnose ${timestamp()}]`;
        
        // Konsole-Logging
        switch(type) {
            case 'error':
                console.error(`${prefix} ❌ ${message}`);
                break;
            case 'warning':
                console.warn(`${prefix} ⚠️ ${message}`);
                break;
            case 'success':
                console.log(`${prefix} ✅ ${message}`);
                break;
            default:
                console.log(`${prefix} 🔍 ${message}`);
        }
        
        // Wenn Diagnose-Container existiert, auch visuelles Logging
        if (diagContainer) {
            const logEntry = document.createElement('div');
            logEntry.className = `diag-log-entry diag-${type}`;
            logEntry.innerHTML = `<span class="diag-time">${timestamp()}</span><span class="diag-message">${message}</span>`;
            diagContainer.appendChild(logEntry);
            diagContainer.scrollTop = diagContainer.scrollHeight;
        }
    }
    
    // Diagnose-Parameter sammeln
    function gatherDiagnostics() {
        const diagnostics = {
            browser: navigator.userAgent,
            localStorage: {},
            elements: {},
            scripts: [],
            vue: {
                vueDetected: typeof Vue !== 'undefined',
                piniaDetected: typeof Pinia !== 'undefined',
                createAppDetected: typeof Vue !== 'undefined' && typeof Vue.createApp !== 'undefined'
            },
            errors: []
        };
        
        // LocalStorage-Einstellungen
        try {
            diagnostics.localStorage.useNewUI = localStorage.getItem('useNewUI');
            diagnostics.localStorage.vueDocConverter = localStorage.getItem('feature_vueDocConverter');
            diagnostics.localStorage.devMode = localStorage.getItem('devMode');
            diagnostics.localStorage.allKeys = Object.keys(localStorage).filter(key => 
                key.startsWith('feature_') || key === 'useNewUI' || key === 'devMode'
            );
        } catch (error) {
            diagnostics.errors.push('LocalStorage-Zugriffsfehler: ' + error.message);
        }
        
        // DOM-Elemente für Vue.js-Integration
        const elementIds = [
            'doc-converter-app',
            'doc-converter-container',
            'docConverterContainer',
            'rescue-tab-doc-converter'
        ];
        
        elementIds.forEach(id => {
            const element = document.getElementById(id);
            diagnostics.elements[id] = {
                exists: !!element,
                visible: element ? window.getComputedStyle(element).display !== 'none' : false,
                children: element ? element.childNodes.length : 0
            };
        });
        
        // Geladene Skripte prüfen
        document.querySelectorAll('script').forEach(script => {
            if (script.src && (script.src.includes('vue') || script.src.includes('converter'))) {
                diagnostics.scripts.push({
                    src: script.src,
                    type: script.type,
                    async: script.async,
                    defer: script.defer,
                    loaded: script.complete
                });
            }
        });
        
        return diagnostics;
    }
    
    // Diagnose-Anzeige erstellen
    function createDiagnosticsUI() {
        // Nur erstellen, wenn noch nicht vorhanden
        if (document.getElementById('vue-converter-diagnostics')) {
            return document.getElementById('vue-converter-diagnostics');
        }
        
        // Container erstellen
        const container = document.createElement('div');
        container.id = 'vue-converter-diagnostics';
        container.className = 'diagnostic-container';
        container.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 500px;
            max-height: 80vh;
            background: #fff;
            border: 2px solid #e91e63;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            overflow: hidden;
            font-family: monospace;
            font-size: 12px;
            display: flex;
            flex-direction: column;
        `;
        
        // Kopfzeile
        const header = document.createElement('div');
        header.className = 'diag-header';
        header.style.cssText = `
            background: #e91e63;
            color: white;
            padding: 8px 12px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
        `;
        header.innerHTML = `<span>Vue.js DocConverter Diagnostics</span>`;
        
        // Schließen-Button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
        `;
        closeBtn.onclick = function() {
            container.style.display = 'none';
        };
        header.appendChild(closeBtn);
        
        // Log-Container
        const logArea = document.createElement('div');
        logArea.className = 'diag-log-area';
        logArea.style.cssText = `
            padding: 10px;
            overflow-y: auto;
            flex-grow: 1;
            background: #f5f5f5;
            max-height: 300px;
        `;
        
        // Aktionsbereich
        const actions = document.createElement('div');
        actions.className = 'diag-actions';
        actions.style.cssText = `
            display: flex;
            gap: 5px;
            padding: 8px;
            background: #f0f0f0;
            border-top: 1px solid #ddd;
        `;
        
        // Diagnose-Button
        const diagBtn = document.createElement('button');
        diagBtn.innerHTML = 'Diagnose ausführen';
        diagBtn.style.cssText = `
            background: #2196f3;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
        `;
        diagBtn.onclick = runDiagnostics;
        
        // Force-Load-Button
        const loadBtn = document.createElement('button');
        loadBtn.innerHTML = 'Vue.js Komponente laden';
        loadBtn.style.cssText = `
            background: #4caf50;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
        `;
        loadBtn.onclick = function() {
            forceLoadVueComponent();
        };
        
        // Fallback-Button
        const fallbackBtn = document.createElement('button');
        fallbackBtn.innerHTML = 'Fallback aktivieren';
        fallbackBtn.style.cssText = `
            background: #ff9800;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
        `;
        fallbackBtn.onclick = function() {
            if (typeof window.initializeClassicDocConverter === 'function') {
                window.initializeClassicDocConverter();
                log('Klassische Implementierung manuell aktiviert', 'success');
            } else {
                log('Klassische Implementierung nicht verfügbar', 'error');
                try {
                    const script = document.createElement('script');
                    script.src = '/frontend/js/doc-converter-fallback.js';
                    document.body.appendChild(script);
                    log('Fallback-Skript geladen, versuche erneut in 1 Sekunde...', 'info');
                    setTimeout(() => {
                        if (typeof window.initializeClassicDocConverter === 'function') {
                            window.initializeClassicDocConverter();
                            log('Klassische Implementierung manuell aktiviert', 'success');
                        }
                    }, 1000);
                } catch (error) {
                    log('Fehler beim Laden des Fallback-Skripts: ' + error.message, 'error');
                }
            }
        };
        
        // Reset-Knopf
        const resetBtn = document.createElement('button');
        resetBtn.innerHTML = 'Einstellungen zurücksetzen';
        resetBtn.style.cssText = `
            background: #f44336;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
        `;
        resetBtn.onclick = function() {
            localStorage.removeItem('useNewUI');
            localStorage.removeItem('feature_vueDocConverter');
            log('Feature-Toggles zurückgesetzt, Seite wird neu geladen...', 'info');
            setTimeout(() => window.location.reload(), 1000);
        };
        
        // Container zusammenbauen
        actions.appendChild(diagBtn);
        actions.appendChild(loadBtn);
        actions.appendChild(fallbackBtn);
        actions.appendChild(resetBtn);
        
        container.appendChild(header);
        container.appendChild(logArea);
        container.appendChild(actions);
        
        // Container verschiebbar machen
        let isDragging = false;
        let offsetX, offsetY;
        
        header.addEventListener('mousedown', function(e) {
            isDragging = true;
            offsetX = e.clientX - container.getBoundingClientRect().left;
            offsetY = e.clientY - container.getBoundingClientRect().top;
        });
        
        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            
            container.style.left = (e.clientX - offsetX) + 'px';
            container.style.top = (e.clientY - offsetY) + 'px';
            container.style.right = 'auto';
        });
        
        document.addEventListener('mouseup', function() {
            isDragging = false;
        });
        
        // Zum Body hinzufügen
        document.body.appendChild(container);
        
        // Log-Container referenzieren
        diagContainer = logArea;
        
        return container;
    }
    
    // Automatisches Laden der Vue.js-Komponente mit korrekten Pfaden
    function forceLoadVueComponent() {
        log('Versuche Vue.js-Komponente direkt zu laden...', 'info');
        
        try {
            // Stelle sicher, dass ein Mount-Element vorhanden ist
            const mountElementIds = [
                'doc-converter-app',
                'doc-converter-container',
                'docConverterContainer',
                '[data-vue-component="doc-converter"]'
            ];
            
            let mountElement = null;
            for (const selector of mountElementIds) {
                const el = selector.startsWith('[') 
                    ? document.querySelector(selector) 
                    : document.getElementById(selector);
                
                if (el) {
                    mountElement = el;
                    log(`Mount-Element gefunden: ${selector}`, 'success');
                    break;
                }
            }
            
            if (!mountElement) {
                log('Kein Mount-Element gefunden. Erstelle einen Container...', 'warning');
                
                const mainContent = document.querySelector('.main-content') || 
                                     document.querySelector('.content-container') || 
                                     document.body;
                
                mountElement = document.createElement('div');
                mountElement.id = 'doc-converter-app';
                mountElement.style.minHeight = '400px';
                
                if (mainContent) {
                    mainContent.appendChild(mountElement);
                    log('Mount-Element erstellt und zum DOM hinzugefügt', 'success');
                } else {
                    log('Kein Hauptinhalt-Container gefunden, füge zum Body hinzu', 'warning');
                    document.body.appendChild(mountElement);
                }
            }
            
            // Vue.js-Script laden - über Alternative Pfade
            const possibleScriptPaths = [
                '/static/vue/standalone/doc-converter.js',
                '/frontend/static/vue/standalone/doc-converter.js',
                '/api/static/vue/standalone/doc-converter.js',
                '/static/js/vue/doc-converter.js',
                '/frontend/js/vue/doc-converter.js',
                '/frontend/static/vue/standalone/doc-converter.ae5f301b.js',
                '/api/static/vue/standalone/doc-converter.ae5f301b.js'
            ];
            
            function tryNextPath(index) {
                if (index >= possibleScriptPaths.length) {
                    log('Alle Script-Pfade fehlgeschlagen.', 'error');
                    return;
                }
                
                const scriptPath = possibleScriptPaths[index];
                log(`Versuche Script zu laden: ${scriptPath}`, 'info');
                
                const script = document.createElement('script');
                script.src = scriptPath;
                script.type = 'text/javascript';
                
                script.onload = function() {
                    log(`Script erfolgreich geladen: ${scriptPath}`, 'success');
                };
                
                script.onerror = function() {
                    log(`Script konnte nicht geladen werden: ${scriptPath}`, 'error');
                    tryNextPath(index + 1);
                };
                
                document.body.appendChild(script);
            }
            
            tryNextPath(0);
            
        } catch (error) {
            log(`Fehler beim Laden der Vue.js-Komponente: ${error.message}`, 'error');
        }
    }
    
    // Diagnose ausführen und anzeigen
    function runDiagnostics() {
        const diag = gatherDiagnostics();
        log('Diagnose gestartet...', 'info');
        log(`Browser: ${diag.browser}`, 'info');
        
        // LocalStorage-Prüfung
        log('LocalStorage-Einstellungen:', 'info');
        log(`- useNewUI: ${diag.localStorage.useNewUI}`, diag.localStorage.useNewUI === 'true' ? 'success' : 'warning');
        log(`- feature_vueDocConverter: ${diag.localStorage.vueDocConverter}`, diag.localStorage.vueDocConverter === 'true' ? 'success' : 'warning');
        log(`- devMode: ${diag.localStorage.devMode}`, 'info');
        
        // DOM-Elemente prüfen
        log('DOM-Elemente für Vue.js-Integration:', 'info');
        let mountPointFound = false;
        
        for (const [id, info] of Object.entries(diag.elements)) {
            if (info.exists) {
                log(`- ${id}: Vorhanden, ${info.visible ? 'sichtbar' : 'versteckt'}, ${info.children} Kinder`, info.visible ? 'success' : 'warning');
                mountPointFound = mountPointFound || info.visible;
            } else {
                log(`- ${id}: Nicht im DOM gefunden`, 'error');
            }
        }
        
        if (!mountPointFound) {
            log('KRITISCH: Kein sichtbares Mount-Element für Vue.js gefunden!', 'error');
        }
        
        // Skripte prüfen
        log('Geladene Skripte:', 'info');
        let vueScriptFound = false;
        
        for (const script of diag.scripts) {
            const status = script.loaded ? 'geladen' : 'nicht geladen';
            log(`- ${script.src}: ${status}, Typ: ${script.type}`, script.loaded ? 'success' : 'error');
            
            if (script.src.includes('doc-converter') && script.loaded) {
                vueScriptFound = true;
            }
        }
        
        if (!vueScriptFound) {
            log('KRITISCH: Kein Vue.js-DocConverter-Skript vollständig geladen!', 'error');
        }
        
        // Vue-Status prüfen
        log('Vue.js-Status:', 'info');
        log(`- Vue global verfügbar: ${diag.vue.vueDetected}`, diag.vue.vueDetected ? 'success' : 'error');
        log(`- Vue.createApp verfügbar: ${diag.vue.createAppDetected}`, diag.vue.createAppDetected ? 'success' : 'error');
        log(`- Pinia verfügbar: ${diag.vue.piniaDetected}`, diag.vue.piniaDetected ? 'success' : 'error');
        
        // Initializations-Status
        log('Initialisierungsstatus:', 'info');
        log(`- vueDocConverterInitialized: ${window.vueDocConverterInitialized || false}`, window.vueDocConverterInitialized ? 'success' : 'warning');
        log(`- classicDocConverterInitialized: ${window.classicDocConverterInitialized || false}`, 'info');
        
        // Fehler anzeigen
        if (diag.errors.length > 0) {
            log('Fehler bei der Diagnose:', 'error');
            diag.errors.forEach(error => {
                log(`- ${error}`, 'error');
            });
        }
        
        // Analyse und Empfehlungen
        log('Diagnose abgeschlossen. Analysiere Probleme...', 'info');
        
        // Problem-Analyse
        if (!diag.localStorage.useNewUI || diag.localStorage.useNewUI !== 'true') {
            log('PROBLEM: useNewUI ist nicht aktiviert. Vue.js-Komponenten werden nicht geladen.', 'error');
            log('EMPFEHLUNG: Aktiviere useNewUI in den Feature-Toggles', 'info');
        }
        
        if (!mountPointFound) {
            log('PROBLEM: Kein Mount-Element für Vue.js gefunden', 'error');
            log('EMPFEHLUNG: Erstelle den Container "doc-converter-app" manuell', 'info');
        }
        
        if (!vueScriptFound) {
            log('PROBLEM: Vue.js-Skript wurde nicht korrekt geladen', 'error');
            log('EMPFEHLUNG: Lade das Skript manuell mit "Vue.js Komponente laden"', 'info');
        }
        
        if (!diag.vue.vueDetected) {
            log('PROBLEM: Vue.js-Framework ist nicht global verfügbar', 'error');
            log('EMPFEHLUNG: Stelle sicher, dass Vue.js vor der Komponente geladen wird', 'info');
        }
    }
    
    // CSS-Styles für bessere Diagnose-Anzeige
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .diag-log-entry {
                margin-bottom: 6px;
                padding: 4px 6px;
                border-radius: 4px;
                border-left: 3px solid #ccc;
            }
            .diag-info {
                background: #e3f2fd;
                border-left-color: #2196f3;
            }
            .diag-error {
                background: #ffebee;
                border-left-color: #f44336;
            }
            .diag-warning {
                background: #fff8e1;
                border-left-color: #ffc107;
            }
            .diag-success {
                background: #e8f5e9;
                border-left-color: #4caf50;
            }
            .diag-time {
                font-size: 10px;
                color: #666;
                margin-right: 6px;
            }
            .diag-message {
                word-break: break-word;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Öffentliche API für dieses Diagnosewerkzeug
    window.docConverterDiagnostics = {
        showUI: function() {
            const ui = createDiagnosticsUI();
            ui.style.display = 'flex';
            log('Diagnose-UI aktiviert', 'info');
            return ui;
        },
        runDiagnostics: runDiagnostics,
        forceLoadVue: forceLoadVueComponent,
        activateFallback: function() {
            if (typeof window.initializeClassicDocConverter === 'function') {
                window.initializeClassicDocConverter();
                return true;
            }
            return false;
        }
    };
    
    // Initialisierung
    function init() {
        log('DocConverter-Diagnose-Tool initialisiert', 'info');
        injectStyles();
        
        // Diagnose-UI automatisch anzeigen
        setTimeout(() => {
            createDiagnosticsUI();
            log('DocConverter-Diagnose-Tool bereit', 'success');
            
            // Automatische Diagnose starten
            setTimeout(runDiagnostics, 500);
        }, 1000);
    }
    
    // Starten, wenn DOM bereit ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();