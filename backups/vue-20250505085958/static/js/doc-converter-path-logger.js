/**
 * Document Converter Path Logger
 * Protokolliert alle Ressourcen-Pfade und 404-Fehler, um Probleme zu identifizieren
 */

(function() {
    // Timestamp-Funktion für präzises Logging
    function getTimestamp() {
        const now = new Date();
        return now.toISOString().split('T')[1].replace('Z', '');
    }

    // Logging-Funktionen mit Zeitstempel
    function logInfo(message) {
        console.log(`[${getTimestamp()}] [PathLogger] ${message}`);
        storeLog('INFO', message);
    }

    function logWarn(message) {
        console.warn(`[${getTimestamp()}] [PathLogger] ${message}`);
        storeLog('WARN', message);
    }

    function logError(message) {
        console.error(`[${getTimestamp()}] [PathLogger] ${message}`);
        storeLog('ERROR', message);
    }

    // Log-Speicher im localStorage
    function storeLog(level, message) {
        try {
            const logs = JSON.parse(localStorage.getItem('docConverterLogs') || '[]');
            logs.push({
                time: new Date().toISOString(),
                level: level,
                message: message
            });
            
            // Begrenze auf maximal 1000 Einträge
            while (logs.length > 1000) {
                logs.shift();
            }
            
            localStorage.setItem('docConverterLogs', JSON.stringify(logs));
        } catch (e) {
            console.error('Fehler beim Speichern der Logs:', e);
        }
    }

    // Die aktuelle Seite analysieren und URLs protokollieren
    function analyzeCurrentPage() {
        logInfo('Starte Analyse der aktuellen Seite');
        
        // Erstelle ein visuelles Log-Element, wenn es noch nicht existiert
        if (!document.getElementById('doc-converter-logger')) {
            const logElement = document.createElement('div');
            logElement.id = 'doc-converter-logger';
            logElement.style.cssText = `
                position: fixed;
                bottom: 10px;
                right: 10px;
                width: 400px;
                max-height: 300px;
                overflow-y: auto;
                background: rgba(0, 0, 0, 0.8);
                color: #fff;
                font-family: monospace;
                font-size: 11px;
                padding: 10px;
                border-radius: 5px;
                z-index: 10000;
                white-space: pre-wrap;
                word-break: break-all;
            `;
            
            // Minimierbar machen
            const header = document.createElement('div');
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                padding-bottom: 5px;
                border-bottom: 1px solid rgba(255,255,255,0.3);
            `;
            header.innerHTML = `
                <strong>DocConverter Path Logger</strong>
                <span style="cursor:pointer;" id="doc-converter-logger-toggle">[-]</span>
            `;
            
            const content = document.createElement('div');
            content.id = 'doc-converter-logger-content';
            
            const controls = document.createElement('div');
            controls.style.cssText = `
                display: flex;
                justify-content: space-between;
                margin-top: 8px;
                padding-top: 5px;
                border-top: 1px solid rgba(255,255,255,0.3);
            `;
            controls.innerHTML = `
                <button id="doc-converter-test-paths">Test Paths</button>
                <button id="doc-converter-clear-logs">Clear Logs</button>
            `;
            
            logElement.appendChild(header);
            logElement.appendChild(content);
            logElement.appendChild(controls);
            
            document.body.appendChild(logElement);
            
            // Event-Handler für Buttons
            document.getElementById('doc-converter-logger-toggle').addEventListener('click', function() {
                const content = document.getElementById('doc-converter-logger-content');
                const isMinimized = content.style.display === 'none';
                content.style.display = isMinimized ? 'block' : 'none';
                this.textContent = isMinimized ? '[-]' : '[+]';
                localStorage.setItem('docConverterLoggerMinimized', !isMinimized);
            });
            
            document.getElementById('doc-converter-test-paths').addEventListener('click', function() {
                testAllPaths();
            });
            
            document.getElementById('doc-converter-clear-logs').addEventListener('click', function() {
                document.getElementById('doc-converter-logger-content').innerHTML = '';
                localStorage.setItem('docConverterLogs', '[]');
            });
            
            // Status aus localStorage laden
            if (localStorage.getItem('docConverterLoggerMinimized') === 'true') {
                document.getElementById('doc-converter-logger-content').style.display = 'none';
                document.getElementById('doc-converter-logger-toggle').textContent = '[+]';
            }
        }
        
        // Aktuelle Skripte auflisten
        const scripts = document.querySelectorAll('script');
        logInfo(`Gefundene Skripte auf der Seite: ${scripts.length}`);
        
        scripts.forEach((script, index) => {
            if (script.src) {
                const src = script.src;
                if (src.includes('doc-converter') || src.includes('vue')) {
                    logInfo(`Script ${index}: ${src} (${script.type || 'keine type-Angabe'})`);
                    visualLog(`Script: ${src} (${script.type || 'keine type-Angabe'})`);
                }
            } else if (script.textContent && (script.textContent.includes('doc-converter') || script.textContent.includes('vue'))) {
                logInfo(`Inline-Script ${index} enthält doc-converter oder vue`);
                visualLog(`Inline-Script enthält doc-converter oder vue`);
            }
        });
        
        // CSS-Dateien auflisten
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        logInfo(`Gefundene CSS-Dateien auf der Seite: ${links.length}`);
        
        links.forEach((link, index) => {
            if (link.href) {
                const href = link.href;
                if (href.includes('doc-converter') || href.includes('vue')) {
                    logInfo(`CSS ${index}: ${href}`);
                    visualLog(`CSS: ${href}`);
                }
            }
        });
        
        // Ausführliche Informationen zu Fehlern sammeln
        logInfo('Registriere error event listener für Ressourcen-Fehler');
        window.addEventListener('error', function(e) {
            if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
                const url = e.target.src || e.target.href;
                logError(`Ressourcen-Fehler: ${url}`);
                visualLog(`FEHLER: ${url}`, 'error');
                
                if (url.includes('doc-converter') || url.includes('vue')) {
                    // Alternativen protokollieren
                    const alternatives = generateAlternativePaths(url);
                    logInfo(`Mögliche alternative Pfade für ${url}:`);
                    alternatives.forEach(alt => logInfo(`- ${alt}`));
                }
            }
        }, true);
        
        // AJAX-Anfragen überwachen
        monitorXHR();
        
        // DOM-Struktur für DocConverter untersuchen
        checkDocConverterDOM();
    }
    
    // Visuelle Log-Ausgabe ins Log-Element
    function visualLog(message, level = 'info') {
        const logContent = document.getElementById('doc-converter-logger-content');
        if (logContent) {
            const logEntry = document.createElement('div');
            logEntry.style.color = level === 'error' ? '#ff6b6b' : 
                                  level === 'warn' ? '#ffd166' : '#a3f7bf';
            logEntry.textContent = `[${getTimestamp()}] ${message}`;
            logContent.appendChild(logEntry);
            logContent.scrollTop = logContent.scrollHeight;
        }
    }
    
    // Mögliche alternative Pfade für eine URL generieren
    function generateAlternativePaths(url) {
        const filename = url.split('/').pop();
        const alternatives = [];
        
        // Basis-Pfade
        const basePaths = [
            '/static/',
            '/frontend/static/',
            '/api/static/',
            '/frontend/',
            '/api/',
            '/'
        ];
        
        // Unterpfade
        const subPaths = [
            'js/',
            'css/',
            'vue/',
            'vue/standalone/',
            'js/vue/',
            'css/vue/',
            ''
        ];
        
        // Kombinationen generieren
        basePaths.forEach(basePath => {
            subPaths.forEach(subPath => {
                alternatives.push(`${basePath}${subPath}${filename}`);
            });
        });
        
        return alternatives;
    }
    
    // Alle generierten Pfade testen
    function testAllPaths() {
        const testUrls = [
            '/static/vue/standalone/doc-converter.js',
            '/frontend/static/vue/standalone/doc-converter.js',
            '/static/css/doc-converter-fix.css',
            '/frontend/static/css/doc-converter-fix.css'
        ];
        
        logInfo('Starte Tests für alternative Pfade...');
        visualLog('Starte Tests für alternative Pfade...', 'info');
        
        testUrls.forEach(url => {
            const alternatives = generateAlternativePaths(url);
            alternatives.forEach(alt => testPath(alt));
        });
    }
    
    // Testen ob ein Pfad existiert
    function testPath(url) {
        const xhr = new XMLHttpRequest();
        xhr.open('HEAD', url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                const status = xhr.status;
                if (status === 200) {
                    logInfo(`✅ Pfad existiert: ${url}`);
                    visualLog(`✅ Pfad existiert: ${url}`, 'info');
                } else {
                    logWarn(`❌ Pfad existiert nicht (${status}): ${url}`);
                }
            }
        };
        xhr.send();
    }
    
    // XMLHttpRequest überwachen
    function monitorXHR() {
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
            if (url && typeof url === 'string' && (url.includes('doc-converter') || url.includes('vue'))) {
                logInfo(`XHR Request: ${method} ${url}`);
                visualLog(`XHR: ${method} ${url}`);
                
                // Original onreadystatechange speichern
                const originalStateChange = this.onreadystatechange;
                this.onreadystatechange = function() {
                    if (this.readyState === 4) {
                        if (this.status !== 200) {
                            logError(`XHR Fehler: ${url} (Status: ${this.status})`);
                            visualLog(`XHR Fehler: ${url} (${this.status})`, 'error');
                        } else {
                            logInfo(`XHR Erfolg: ${url}`);
                        }
                    }
                    
                    // Original callback aufrufen, wenn vorhanden
                    if (originalStateChange) {
                        originalStateChange.apply(this, arguments);
                    }
                };
            }
            
            return originalOpen.apply(this, arguments);
        };
    }
    
    // DocConverter DOM-Elemente überprüfen
    function checkDocConverterDOM() {
        logInfo('Überprüfe DocConverter DOM-Elemente');
        
        // Liste der selectors, die wir überprüfen wollen
        const selectors = [
            '#doc-converter-app',
            '#doc-converter-container',
            '#docConverterContainer',
            '[data-tab="docConverter"]',
            '.doc-converter',
            '.admin-tab-content[data-tab="docConverter"]'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                logInfo(`${selector}: ${elements.length} Elemente gefunden`);
                elements.forEach((el, i) => {
                    const style = window.getComputedStyle(el);
                    const visibility = style.visibility;
                    const display = style.display;
                    const opacity = style.opacity;
                    
                    logInfo(`${selector} #${i}: visibility=${visibility}, display=${display}, opacity=${opacity}`);
                    visualLog(`${selector}: visibility=${visibility}, display=${display}, opacity=${opacity}`);
                    
                    // Prüfen, ob das Element sichtbar gemacht werden muss
                    if (display === 'none' || visibility === 'hidden' || opacity === '0') {
                        logWarn(`Element ${selector} #${i} ist unsichtbar - versuche sichtbar zu machen`);
                        el.style.display = 'block';
                        el.style.visibility = 'visible';
                        el.style.opacity = '1';
                    }
                });
            } else {
                logWarn(`${selector}: Keine Elemente gefunden`);
                visualLog(`${selector}: Keine Elemente gefunden`, 'warn');
            }
        });
    }
    
    // Funktionen zum Erstellen alternativer CSS- und Script-Elemente
    function createAlternativeResources() {
        logInfo('Erstelle alternative Resourcen');
        
        // CSS-Alternativen
        const cssFiles = [
            '/static/css/doc-converter-fix.css',
            '/frontend/static/css/doc-converter-fix.css',
            '/api/static/css/doc-converter-fix.css'
        ];
        
        // Skript-Alternativen
        const scriptFiles = [
            '/static/vue/standalone/doc-converter.js',
            '/frontend/static/vue/standalone/doc-converter.js',
            '/api/static/vue/standalone/doc-converter.js',
            '/static/vue/standalone/doc-converter-nomodule.js',
            '/frontend/static/vue/standalone/doc-converter-nomodule.js',
            '/api/static/vue/standalone/doc-converter-nomodule.js',
            '/static/js/vue/doc-converter.js',
            '/frontend/js/vue/doc-converter.js',
            '/api/static/js/vue/doc-converter.js'
        ];
        
        // CSS-Alternativen laden
        cssFiles.forEach(cssFile => {
            if (!document.querySelector(`link[href="${cssFile}"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = cssFile;
                link.setAttribute('data-patched', 'true');
                
                link.onload = function() {
                    logInfo(`CSS erfolgreich geladen: ${cssFile}`);
                    visualLog(`CSS geladen: ${cssFile}`);
                };
                
                link.onerror = function() {
                    logWarn(`CSS konnte nicht geladen werden: ${cssFile}`);
                };
                
                document.head.appendChild(link);
                logInfo(`CSS hinzugefügt: ${cssFile}`);
            }
        });
        
        // Skript-Alternativen laden
        scriptFiles.forEach(scriptFile => {
            if (!document.querySelector(`script[src="${scriptFile}"]`)) {
                const script = document.createElement('script');
                script.src = scriptFile;
                script.setAttribute('data-patched', 'true');
                
                script.onload = function() {
                    logInfo(`Skript erfolgreich geladen: ${scriptFile}`);
                    visualLog(`Skript geladen: ${scriptFile}`);
                };
                
                script.onerror = function() {
                    logWarn(`Skript konnte nicht geladen werden: ${scriptFile}`);
                };
                
                document.head.appendChild(script);
                logInfo(`Skript hinzugefügt: ${scriptFile}`);
            }
        });
        
        // Inline CSS für DocConverter hinzufügen
        if (!document.getElementById('doc-converter-inline-css')) {
            const style = document.createElement('style');
            style.id = 'doc-converter-inline-css';
            style.textContent = `
                /* Direkte CSS-Regeln für DocConverter */
                #doc-converter-container,
                #doc-converter-app,
                .doc-converter,
                [data-tab="docConverter"],
                #rescue-tab-doc-converter,
                .admin-tab-content[data-tab="docConverter"],
                .admin-tab-content.docConverter {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    min-height: 400px;
                    width: 100%;
                }
                
                .doc-converter-view {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                }
                
                .doc-converter.classic-ui {
                    padding: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                }
                
                /* Feedback icons fix */
                .feedback-icons {
                    position: absolute !important;
                    right: 10px !important;
                    display: flex !important;
                    gap: 8px !important;
                }
                
                .feedback-icon {
                    cursor: pointer !important;
                    color: #999 !important;
                    transition: color 0.2s !important;
                }
                
                .feedback-icon:hover {
                    color: #555 !important;
                }
                
                .feedback-icon.active {
                    color: #4CAF50 !important;
                }
                
                .feedback-icon.active.negative {
                    color: #f44336 !important;
                }
            `;
            
            document.head.appendChild(style);
            logInfo('Inline CSS für DocConverter hinzugefügt');
        }
    }
    
    // Überprüfen, ob die Seite bereits geladen ist
    if (document.readyState === 'loading') {
        logInfo('Seite wird geladen, warte auf DOMContentLoaded');
        document.addEventListener('DOMContentLoaded', function() {
            analyzeCurrentPage();
            createAlternativeResources();
        });
    } else {
        logInfo('Seite bereits geladen, starte sofort Analyse');
        analyzeCurrentPage();
        createAlternativeResources();
    }
    
    // Auch bei der ersten Last werden CSS-Alternativen erstellt
    createAlternativeResources();
    
    // Nach 2 Sekunden nochmal versuchen, falls asynchrone Inhalte nachgeladen wurden
    setTimeout(function() {
        analyzeCurrentPage();
        createAlternativeResources();
        checkDocConverterDOM();
    }, 2000);
    
    // Nach 5 Sekunden nochmal versuchen, falls sehr langsame Inhalte nachgeladen wurden
    setTimeout(function() {
        analyzeCurrentPage();
        checkDocConverterDOM();
    }, 5000);
    
    // Nach URL-Änderungen prüfen
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            logInfo(`URL hat sich geändert zu ${url}`);
            setTimeout(function() {
                analyzeCurrentPage();
                createAlternativeResources();
                checkDocConverterDOM();
            }, 1000);
        }
    }).observe(document, {subtree: true, childList: true});
    
    // Globale Funktion bereitstellen, um Logs außerhalb anzuzeigen
    window.docConverterPrintLogs = function() {
        try {
            const logs = JSON.parse(localStorage.getItem('docConverterLogs') || '[]');
            console.log('--- DocConverter Protokoll ---');
            logs.forEach(log => {
                console.log(`[${log.time}] [${log.level}] ${log.message}`);
            });
            console.log('--- Ende des Protokolls ---');
            return logs;
        } catch (e) {
            console.error('Fehler beim Lesen der Logs:', e);
            return [];
        }
    };
})();