/**
 * Document Converter Debug
 * Erweiterte Debug-Funktionen für den Document Converter Tab
 */

(function() {
    /* --- KONFIGURATION --- */
    const DEBUG_MODE = true;  // Ausführliche Logs aktivieren
    const AUTO_FIX = true;   // Versuche, Probleme automatisch zu beheben
    const FORCE_FALLBACK = true; // Immer auf Fallback-Implementierung setzen
    
    /* --- LOGGING-TOOLS --- */
    // Verbessertes Logging mit Zeitstempel und Typen
    function debugLog(message, type = 'info') {
        if (!DEBUG_MODE) return;
        
        const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');
        const prefix = `[DocConverter-Debug ${timestamp}]`;
        
        switch(type) {
            case 'error': console.error(`${prefix} ❌ ${message}`); break;
            case 'warn': console.warn(`${prefix} ⚠️ ${message}`); break;
            case 'success': console.log(`${prefix} ✅ ${message}`); break;
            default: console.log(`${prefix} 🔍 ${message}`);
        }
        
        // Auch ins DOM loggen, falls der Debug-Container existiert
        appendToDebugOverlay(message, type);
    }
    
    // DOM-Element für Debug-Ausgaben erstellen
    function createDebugOverlay() {
        if (document.getElementById('doc-converter-debug-overlay')) {
            return document.getElementById('doc-converter-debug-overlay');
        }
        
        // Status aus LocalStorage laden
        const isMinimized = localStorage.getItem('docConverterDebugMinimized') === 'true';
        
        // Haupt-Container
        const overlay = document.createElement('div');
        overlay.id = 'doc-converter-debug-overlay';
        overlay.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: ${isMinimized ? '250px' : '500px'};
            max-height: ${isMinimized ? '40px' : '300px'};
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            font-family: monospace;
            font-size: 12px;
            padding: ${isMinimized ? '8px 10px' : '10px'};
            border-radius: 5px;
            z-index: 9999;
            overflow: hidden;
            transition: all 0.3s ease;
            display: ${DEBUG_MODE ? 'block' : 'none'};
        `;
        
        // Header mit Buttons
        const header = document.createElement('div');
        header.className = 'debug-header';
        header.style.cssText = `
            font-weight: bold;
            margin-bottom: 5px;
            border-bottom: 1px solid #666;
            padding-bottom: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
        `;
        
        const headerTitle = document.createElement('span');
        headerTitle.textContent = 'DocConverter Debug';
        headerTitle.style.cssText = 'flex: 1;';
        
        // Button-Container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 8px;';
        
        // Minimieren/Maximieren Button
        const minimizeBtn = document.createElement('span');
        minimizeBtn.innerHTML = isMinimized ? '&#x1F5D6;' : '&#x1F5D5;'; // Unicode für Minimieren/Maximieren
        minimizeBtn.title = isMinimized ? 'Maximieren' : 'Minimieren';
        minimizeBtn.style.cssText = 'cursor: pointer; font-size: 14px; line-height: 14px;';
        minimizeBtn.onclick = function() {
            if (overlay.getAttribute('data-minimized') === 'true') {
                // Maximieren
                overlay.style.width = '500px';
                overlay.style.maxHeight = '300px';
                overlay.style.padding = '10px';
                this.innerHTML = '&#x1F5D5;';
                this.title = 'Minimieren';
                logContainer.style.display = 'block';
                actionsContainer.style.display = 'flex';
                overlay.setAttribute('data-minimized', 'false');
                localStorage.setItem('docConverterDebugMinimized', 'false');
            } else {
                // Minimieren
                overlay.style.width = '250px';
                overlay.style.maxHeight = '40px';
                overlay.style.padding = '8px 10px';
                this.innerHTML = '&#x1F5D6;';
                this.title = 'Maximieren';
                logContainer.style.display = 'none';
                actionsContainer.style.display = 'none';
                overlay.setAttribute('data-minimized', 'true');
                localStorage.setItem('docConverterDebugMinimized', 'true');
            }
        };
        
        // Schließen-Button
        const closeBtn = document.createElement('span');
        closeBtn.innerHTML = '&#x2715;'; // Unicode X
        closeBtn.title = 'Schließen';
        closeBtn.style.cssText = 'cursor: pointer; font-size: 14px; line-height: 14px;';
        closeBtn.onclick = function() {
            overlay.style.display = 'none';
        };
        
        // Log-Container
        const logContainer = document.createElement('div');
        logContainer.id = 'doc-converter-debug-log';
        logContainer.style.cssText = `
            max-height: 250px;
            overflow-y: auto;
            ${isMinimized ? 'display: none;' : ''}
        `;
        
        // Button-Container zusammenbauen und zum Header hinzufügen
        buttonContainer.appendChild(minimizeBtn);
        buttonContainer.appendChild(closeBtn);
        
        header.appendChild(headerTitle);
        header.appendChild(buttonContainer);
        overlay.appendChild(header);
        overlay.appendChild(logContainer);
        
        // Initialen Minimiert-Status setzen
        overlay.setAttribute('data-minimized', isMinimized ? 'true' : 'false');
        
        // Actions
        const actionsContainer = document.createElement('div');
        actionsContainer.id = 'debug-actions';
        actionsContainer.style.cssText = `
            margin-top: 10px;
            display: ${isMinimized ? 'none' : 'flex'};
            gap: 5px;
        `;
        
        const forceFallbackBtn = document.createElement('button');
        forceFallbackBtn.textContent = 'Force Fallback';
        forceFallbackBtn.style.cssText = `
            background: #007bff;
            border: none;
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        `;
        forceFallbackBtn.onclick = activateFallback;
        
        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Clear Log';
        clearBtn.style.cssText = `
            background: #6c757d;
            border: none;
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        `;
        clearBtn.onclick = function() {
            document.getElementById('doc-converter-debug-log').innerHTML = '';
        };
        
        const reloadBtn = document.createElement('button');
        reloadBtn.textContent = 'Reload Tab';
        reloadBtn.style.cssText = `
            background: #28a745;
            border: none;
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        `;
        reloadBtn.onclick = function() {
            activateTab('docConverter');
        };
        
        actionsContainer.appendChild(forceFallbackBtn);
        actionsContainer.appendChild(reloadBtn);
        actionsContainer.appendChild(clearBtn);
        overlay.appendChild(actionsContainer);
        
        document.body.appendChild(overlay);
        
        debugLog('Debug-Overlay erstellt und angezeigt', 'success');
    }
    
    // Log-Nachricht zum Overlay hinzufügen
    function appendToDebugOverlay(message, type) {
        const container = document.getElementById('doc-converter-debug-log');
        if (!container) return;
        
        const entry = document.createElement('div');
        entry.className = `debug-entry debug-${type}`;
        entry.style.cssText = `
            padding: 3px 0;
            border-bottom: 1px solid #333;
            font-family: monospace;
            font-size: 12px;
        `;
        
        let color = '#fff';
        switch(type) {
            case 'error': color = '#ff5252'; break;
            case 'warn': color = '#ffc107'; break; 
            case 'success': color = '#4caf50'; break;
        }
        
        entry.style.color = color;
        entry.textContent = message;
        
        container.appendChild(entry);
        container.scrollTop = container.scrollHeight;
    }
    
    /* --- DIAGNOSE-TOOLS --- */
    // DOM-Elemente mit bestimmten IDs oder Klassen suchen
    function findElements() {
        debugLog('Suche DocConverter-Tab-Elemente', 'info');
        
        // Wichtige IDs und Klassen, die wir suchen
        const selectors = {
            tab: '[data-tab="docConverter"]',
            tabContent: '.admin-tab-content[data-tab="docConverter"]',
            container: '#doc-converter-container',
            app: '#doc-converter-app',
            rescueTab: '#rescue-tab-doc-converter',
            converterClass: '.doc-converter'
        };
        
        const foundElements = {};
        let foundCount = 0;
        
        for (const [key, selector] of Object.entries(selectors)) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                foundElements[key] = elements;
                foundCount++;
                
                elements.forEach(el => {
                    // Zeige Sichtbarkeitsstatus
                    const style = window.getComputedStyle(el);
                    debugLog(`Element '${key}' gefunden: ${selector}`, 'success');
                    debugLog(`  - display: ${style.display}, visibility: ${style.visibility}, opacity: ${style.opacity}`);
                    
                    // Zeige Dimensionen
                    debugLog(`  - size: ${el.offsetWidth}x${el.offsetHeight}px`);
                    
                    // Zeige Parent-Stack bis html
                    let parent = el.parentElement;
                    let parentPath = '';
                    while (parent && parent !== document.documentElement) {
                        const parentStyle = window.getComputedStyle(parent);
                        parentPath = `${parent.tagName.toLowerCase()}${parent.id ? '#' + parent.id : ''}${parent.className ? '.' + parent.className.replace(/\s+/g, '.') : ''} (${parentStyle.display}) > ${parentPath}`;
                        parent = parent.parentElement;
                    }
                    debugLog(`  - parent chain: ${parentPath}`, 'info');
                });
            } else {
                debugLog(`Element '${key}' NICHT gefunden: ${selector}`, 'warn');
            }
        }
        
        if (foundCount === 0) {
            debugLog('Keine DocConverter-Tab-Elemente gefunden. Mögliche Ursachen:', 'error');
            debugLog('1. Tab wird dynamisch geladen und ist noch nicht im DOM', 'error');
            debugLog('2. Selektoren stimmen nicht mit tatsächlichem DOM überein', 'error');
            
            if (AUTO_FIX) {
                debugLog('Versuche, DocConverter-Container automatisch zu erstellen', 'warn');
                createDocConverterElements();
            }
        }
        
        return foundElements;
    }
    
    // Tab aktivieren (durch Klick-Simulation)
    function activateTab(tabName) {
        debugLog(`Versuche, Tab "${tabName}" zu aktivieren`, 'info');
        
        const tabSelectors = [
            `.admin-nav-item[data-tab="${tabName}"]`,
            `button[data-tab="${tabName}"]`,
            `a[href="#${tabName}"]`
        ];
        
        for (const selector of tabSelectors) {
            const tabElement = document.querySelector(selector);
            if (tabElement) {
                debugLog(`Tab-Element gefunden: ${selector}`, 'success');
                tabElement.click();
                return true;
            }
        }
        
        debugLog('Kein passendes Tab-Element gefunden', 'error');
        return false;
    }
    
    // Elemente erstellen, falls sie nicht existieren
    function createDocConverterElements() {
        debugLog('Erstelle DocConverter-Container', 'warn');
        
        // Suche nach einem Admin-Bereich, wo wir den Container einfügen können
        const adminContent = document.querySelector('.admin-content') || 
                            document.querySelector('.admin-panel-content') || 
                            document.querySelector('.content-container') ||
                            document.querySelector('.main-content') ||
                            document.querySelector('main') ||
                            document.body; // Notfalls in den Body einbinden
        
        if (!adminContent) {
            debugLog('Kein geeigneter Bereich gefunden, Container kann nicht erstellt werden', 'error');
            return false;
        }
        
        // Container erstellen
        const container = document.createElement('div');
        container.id = 'doc-converter-container';
        container.className = 'doc-converter admin-tab-content';
        container.setAttribute('data-tab', 'docConverter');
        container.style.cssText = `
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            min-height: 400px;
            width: 100%;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        `;
        
        // App-Container innerhalb des Haupt-Containers erstellen
        const appContainer = document.createElement('div');
        appContainer.id = 'doc-converter-app';
        appContainer.style.cssText = `
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 100%;
            height: 100%;
            min-height: 300px;
        `;
        
        container.appendChild(appContainer);
        adminContent.appendChild(container);
        
        debugLog('DocConverter-Container erfolgreich erstellt', 'success');
        
        // Basic content for the container
        appContainer.innerHTML = `
            <div class="doc-converter-placeholder">
                <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">Dokumenten-Konverter</h2>
                <p style="margin-bottom: 1.5rem;">Mit diesem Tool können Sie Dokumente in durchsuchbaren Text konvertieren.</p>
                <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 1rem; margin-bottom: 1.5rem;">
                    <p>Die Standard-UI wird geladen. Falls dies nicht automatisch geschieht, bitte die Fallback-Implementierung aktivieren.</p>
                </div>
                <button id="activate-fallback-btn" style="background: #0ea5e9; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.25rem; cursor: pointer;">
                    Fallback-Implementierung aktivieren
                </button>
            </div>
        `;
        
        document.getElementById('activate-fallback-btn').addEventListener('click', activateFallback);
        
        return true;
    }
    
    /* --- FIX FUNCTIONS --- */
    // Fallback-Implementierung aktivieren
    function activateFallback() {
        debugLog('Versuche, Fallback-Implementierung zu aktivieren', 'warn');
        
        if (typeof window.initializeClassicDocConverter === 'function') {
            debugLog('Klassische Implementierung gefunden, aktiviere...', 'success');
            
            try {
                window.initializeClassicDocConverter();
                debugLog('Klassische Implementierung erfolgreich aktiviert', 'success');
                return true;
            } catch (e) {
                debugLog(`Fehler beim Aktivieren der klassischen Implementierung: ${e.message}`, 'error');
            }
        } else {
            debugLog('Klassische Implementierung nicht gefunden, versuche zu laden', 'warn');
            
            try {
                // Versuche verschiedene mögliche Pfade
                const scriptPaths = [
                    '/static/js/doc-converter-fallback.js',
                    '/frontend/js/doc-converter-fallback.js',
                    '/api/static/js/doc-converter-fallback.js',
                    '/js/doc-converter-fallback.js',
                    '/frontend/static/js/doc-converter-fallback.js',
                    './js/doc-converter-fallback.js'
                ];
                
                // Funktioniert ähnlich wie Promise.race
                let loaded = false;
                
                function tryLoadScript(index) {
                    if (index >= scriptPaths.length || loaded) return;
                    
                    const script = document.createElement('script');
                    script.src = scriptPaths[index];
                    
                    script.onload = function() {
                        debugLog(`Fallback-Script erfolgreich geladen von ${scriptPaths[index]}`, 'success');
                        loaded = true;
                        
                        // Nach kurzer Verzögerung die Funktion aufrufen
                        setTimeout(function() {
                            if (typeof window.initializeClassicDocConverter === 'function') {
                                window.initializeClassicDocConverter();
                                debugLog('Klassische Implementierung erfolgreich aktiviert', 'success');
                            } else {
                                debugLog('initializeClassicDocConverter Funktion nicht gefunden, implementiere Notfallfunktion', 'warn');
                                
                                // Implementiere Notfallfunktion für initializeClassicDocConverter
                                window.initializeClassicDocConverter = function() {
                                    debugLog('Notfall-Implementierung für initializeClassicDocConverter aktiviert', 'warn');
                                    
                                    // Falls der Container bereits existiert, verwende ihn
                                    const converterContainer = document.getElementById('doc-converter-container') || 
                                        document.querySelector('#rescue-tab-doc-converter') ||
                                        document.getElementById('doc-converter-app') ||
                                        document.querySelector('[data-tab="docConverter"]');
                                        
                                    if (!converterContainer) {
                                        debugLog('Kein DocConverter-Container gefunden, erstelle einen', 'warn');
                                        createDocConverterElements();
                                        return;
                                    }
                                    
                                    // Minimales UI anzeigen
                                    converterContainer.innerHTML = `
                                        <div class="doc-converter classic-ui">
                                            <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">Dokumenten-Konverter (Notfall-UI)</h2>
                                            
                                            <div style="padding: 1rem; margin-bottom: 1.5rem; background-color: #fff8e6; border-left: 4px solid #f59e0b;">
                                                <p style="margin-bottom: 0.5rem;"><strong>Hinweis:</strong> Der vollständige Dokumentenkonverter konnte nicht geladen werden.</p>
                                                <p style="margin-bottom: 0;">Eine vereinfachte Version wird angezeigt.</p>
                                            </div>
                                            
                                            <form action="/api/admin/upload/document" method="post" enctype="multipart/form-data" class="space-y-4">
                                                <div style="margin-bottom: 1rem;">
                                                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Datei auswählen</label>
                                                    <input type="file" name="file" style="border: 1px solid #e5e7eb; padding: 0.5rem; width: 100%; border-radius: 0.25rem;" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.html,.txt">
                                                </div>
                                                
                                                <div style="margin-bottom: 1rem;">
                                                    <label style="display: flex; align-items: center;">
                                                        <input type="checkbox" name="post_processing" checked style="margin-right: 0.5rem;">
                                                        <span>Nachbearbeitung aktivieren (verbessert Struktur und Format)</span>
                                                    </label>
                                                </div>
                                                
                                                <div>
                                                    <button type="submit" style="background: #3b82f6; color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.25rem; cursor: pointer; font-weight: 500;">
                                                        Dokument hochladen und konvertieren
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    `;
                                    
                                    debugLog('Notfall-UI für DocConverter angezeigt', 'success');
                                };
                                
                                // Aktiviere die Notfallfunktion sofort
                                window.initializeClassicDocConverter();
                            }
                        }, 100);
                    };
                    
                    script.onerror = function() {
                        debugLog(`Fehler beim Laden von ${scriptPaths[index]}, versuche nächsten Pfad`, 'error');
                        tryLoadScript(index + 1);
                    };
                    
                    document.body.appendChild(script);
                }
                
                tryLoadScript(0);
                
                return true;
            } catch (e) {
                debugLog(`Fehler beim Laden des Fallback-Scripts: ${e.message}`, 'error');
                return false;
            }
        }
    }

    // Stelle sicher, dass CSS-Dateien geladen sind
    function ensureCSSIsLoaded() {
        debugLog('Stelle sicher, dass CSS-Dateien geladen sind', 'info');
        
        const cssFiles = [
            '/static/css/doc-converter-fix.css',
            '/frontend/css/doc-converter-fix.css',
            '/api/static/css/doc-converter-fix.css',
            '/frontend/static/css/doc-converter-fix.css',
            './css/doc-converter-fix.css'
        ];
        
        // CSS-Dateien laden, wenn sie noch nicht geladen sind
        cssFiles.forEach(cssPath => {
            if (!document.querySelector(`link[href="${cssPath}"]`)) {
                debugLog(`CSS-Datei wird geladen: ${cssPath}`, 'info');
                
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = cssPath;
                
                document.head.appendChild(link);
            }
        });
    }

    // Alles sichtbar machen
    function makeEverythingVisible() {
        debugLog('Versuche, alle DocConverter-Elemente sichtbar zu machen', 'info');
        
        // Element-Selektoren, die wir sichtbar machen wollen
        const selectors = [
            '#doc-converter-container',
            '#doc-converter-app',
            '.doc-converter',
            '[data-tab="docConverter"]',
            '#rescue-tab-doc-converter',
            '.admin-tab-content[data-tab="docConverter"]',
            '.admin-tab-content.docConverter'
        ];
        
        let elementCount = 0;
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            
            if (elements.length > 0) {
                elementCount += elements.length;
                
                elements.forEach(el => {
                    debugLog(`Mache Element sichtbar: ${selector}`, 'info');
                    
                    // Inline Styles setzen
                    el.style.display = 'block';
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                    el.style.minHeight = '400px';
                    
                    // Klassen entfernen, die Elemente verstecken könnten
                    el.classList.remove('hidden', 'invisible', 'opacity-0');
                    
                    // Auch für übergeordnete Elemente prüfen (3 Ebenen nach oben)
                    let parent = el.parentElement;
                    let level = 0;
                    
                    while (parent && level < 3) {
                        parent.style.display = '';
                        parent.style.visibility = '';
                        parent.style.opacity = '';
                        parent.classList.remove('hidden', 'invisible', 'opacity-0');
                        
                        parent = parent.parentElement;
                        level++;
                    }
                });
            }
        });
        
        if (elementCount === 0) {
            debugLog('Keine DocConverter-Elemente gefunden, die sichtbar gemacht werden können', 'warn');
            return false;
        }
        
        debugLog(`${elementCount} Elemente sichtbar gemacht`, 'success');
        return true;
    }

    /* --- MAIN --- */
    // Hauptfunktion, um alles zu initialisieren
    function initDebugTools() {
        // Nur initialisieren, wenn das Dokument geladen ist
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initDebugTools);
            return;
        }
        
        debugLog('DocConverter Debug-Tools werden initialisiert', 'info');
        
        // Debug-Overlay erstellen
        if (DEBUG_MODE) {
            createDebugOverlay();
        }
        
        // Browser, Bildschirmgröße, etc. loggen
        debugLog(`Browser: ${navigator.userAgent}`, 'info');
        debugLog(`Viewport: ${window.innerWidth}x${window.innerHeight}`, 'info');
        
        // LocalStorage-Einstellungen loggen
        debugLog('Feature-Toggle-Einstellungen:', 'info');
        debugLog(`- useNewUI: ${localStorage.getItem('useNewUI')}`, 'info');
        debugLog(`- feature_vueDocConverter: ${localStorage.getItem('feature_vueDocConverter')}`, 'info');
        
        // Feature-Toggles erzwingen, wenn aktiviert
        localStorage.setItem('useNewUI', 'true');
        localStorage.setItem('feature_vueDocConverter', 'true');
        debugLog('Feature-Toggles auf TRUE gesetzt', 'success');
        
        // CSS-Dateien laden
        ensureCSSIsLoaded();
        
        // DOM-Elemente analysieren
        findElements();
        
        // Alles sichtbar machen
        makeEverythingVisible();
        
        // Wenn FORCE_FALLBACK aktiviert ist, klassische Implementierung aktivieren
        if (FORCE_FALLBACK) {
            debugLog('FORCE_FALLBACK ist aktiviert, aktiviere klassische Implementierung', 'warn');
            setTimeout(activateFallback, 500);
        }
        
        // Tab-Change Event Listener hinzufügen
        const adminNavItems = document.querySelectorAll('.admin-nav-item');
        adminNavItems.forEach(item => {
            item.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                if (tabName === 'docConverter') {
                    debugLog('DocConverter-Tab wurde angeklickt', 'info');
                    
                    // Kurze Verzögerung, um DOM-Änderungen zu berücksichtigen
                    setTimeout(() => {
                        makeEverythingVisible();
                        
                        if (FORCE_FALLBACK) {
                            activateFallback();
                        }
                    }, 300);
                }
            });
        });
        
        debugLog('DocConverter Debug-Tools erfolgreich initialisiert', 'success');
    }
    
    // Exportiere Funktionen für manuelle Aufrufe
    window.docConverterDebug = {
        init: initDebugTools,
        find: findElements,
        makeVisible: makeEverythingVisible,
        activateFallback: activateFallback,
        activateTab: activateTab
    };
    
    // Auto-Init
    initDebugTools();
})();