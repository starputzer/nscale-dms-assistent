/**
 * Diagnostik-Skript für den Dokumentenkonverter
 * Enthält erweiterte Logging- und Debugging-Funktionalität
 */

(function() {
    console.log('Dokumentenkonverter-Diagnostik gestartet');
    
    // Konfiguration
    const config = {
        debugMode: true,
        verboseLogging: true,
        autoCreateContainers: true,
        traceEvents: true,
        fixInlineScripts: true
    };
    
    // Diagnostik-Namespace
    window.docConverterDiagnostics = {};
    
    // Logger-Funktion
    function logMessage(message, type = 'info') {
        const prefix = '[DocConverter-Diagnostik]';
        const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.sss
        
        if (type === 'error') {
            console.error(`${prefix} [${timestamp}] FEHLER: ${message}`);
        } else if (type === 'warn') {
            console.warn(`${prefix} [${timestamp}] WARNUNG: ${message}`);
        } else if (type === 'debug' && config.debugMode) {
            console.debug(`${prefix} [${timestamp}] DEBUG: ${message}`);
        } else if (config.verboseLogging || type === 'important') {
            console.log(`${prefix} [${timestamp}] ${message}`);
        }
        
        // Log im Status-Container anzeigen, falls vorhanden
        const statusContainer = document.getElementById('doc-converter-status-container');
        if (statusContainer) {
            const entry = document.createElement('div');
            entry.className = `log-entry log-${type}`;
            entry.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-message">${message}</span>`;
            statusContainer.appendChild(entry);
            
            // Scroll zum neuesten Eintrag
            statusContainer.scrollTop = statusContainer.scrollHeight;
        }
    }
    
    // Exportiere Logger
    window.docConverterDiagnostics.log = function(message) { logMessage(message); };
    window.docConverterDiagnostics.warn = function(message) { logMessage(message, 'warn'); };
    window.docConverterDiagnostics.error = function(message) { logMessage(message, 'error'); };
    window.docConverterDiagnostics.debug = function(message) { logMessage(message, 'debug'); };
    
    // Status erfassen
    function captureStatus() {
        const status = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            featureFlags: {},
            elements: {},
            scripts: []
        };
        
        // Feature-Flags erfassen
        const features = ['useNewUI', 'feature_vueDocConverter', 'feature_vueChat', 'feature_vueAdmin', 'feature_vueSettings', 'devMode'];
        features.forEach(feature => {
            status.featureFlags[feature] = localStorage.getItem(feature);
        });
        
        // Wichtige DOM-Elemente überprüfen
        const importantSelectors = [
            '#doc-converter-app',
            '#doc-converter-container',
            '.admin-panel-content',
            '[data-tab="docConverter"]',
            '#rescue-tab-doc-converter',
            '.vue-app'
        ];
        
        importantSelectors.forEach(selector => {
            try {
                const element = document.querySelector(selector);
                status.elements[selector] = element ? {
                    found: true,
                    visible: element.offsetParent !== null,
                    classes: element.className,
                    innerHTML: element.children.length
                } : { found: false };
            } catch (e) {
                status.elements[selector] = { found: false, error: e.message };
            }
        });
        
        // Script-Tags überprüfen
        const scriptTags = document.querySelectorAll('script');
        scriptTags.forEach(script => {
            if (script.src && (
                script.src.includes('vue') ||
                script.src.includes('doc-converter') ||
                script.src.includes('converter')
            )) {
                status.scripts.push({
                    src: script.src,
                    type: script.type,
                    loaded: script.readyState === 'complete' || script.readyState === undefined
                });
            }
        });
        
        logMessage('Systemstatus erfasst', 'important');
        window.docConverterDiagnostics.status = status;
        return status;
    }
    
    // Exportiere Status-Funktion
    window.docConverterDiagnostics.captureStatus = captureStatus;
    
    // Aktueller Tab im Admin-Bereich
    function getCurrentAdminTab() {
        try {
            // Direkt aus dem Tab-Element auslesen
            const activeTab = document.querySelector('.admin-tab-button.active');
            return activeTab ? activeTab.getAttribute('data-tab') : null;
        } catch (e) {
            logMessage(`Fehler beim Ermitteln des aktuellen Admin-Tabs: ${e.message}`, 'error');
            return null;
        }
    }
    
    // Container-Fix
    function ensureContainers() {
        logMessage('Überprüfe notwendige Container');
        
        // Nur ausführen, wenn wir im Admin-Panel und im richtigen Tab sind
        const isAdminPanel = document.querySelector('.admin-panel-content') !== null;
        const isDocConverterTab = 
            document.querySelector('[data-tab="docConverter"].active') !== null || 
            getCurrentAdminTab() === 'docConverter';
            
        if (!isAdminPanel || !isDocConverterTab) {
            logMessage('Nicht im Admin-Panel oder nicht im DocConverter-Tab - Container wird nicht erstellt', 'warn');
            return;
        }
        
        if (!document.getElementById('doc-converter-app')) {
            logMessage('doc-converter-app nicht gefunden, erstelle Container', 'warn');
            const container = document.createElement('div');
            container.id = 'doc-converter-app';
            
            if (document.querySelector('[data-tab="docConverter"]')) {
                document.querySelector('[data-tab="docConverter"]').appendChild(container);
                logMessage('Doc-Converter-App im Tab eingefügt');
            } else if (document.querySelector('.admin-panel-content')) {
                document.querySelector('.admin-panel-content').appendChild(container);
                logMessage('Doc-Converter-App im Admin-Panel eingefügt');
            } else {
                // Kein Fallback mehr zum Body - wenn wir nicht im Admin-Panel sind, erstellen wir keinen Container
                logMessage('Kein Admin-Panel gefunden, Container wird nicht erstellt', 'error');
                return;
            }
        }
        
        // Status-Container für Logs
        if (!document.getElementById('doc-converter-status-container')) {
            // Nur erstellen, wenn wir im Admin-Panel und im richtigen Tab sind
            const isAdminPanel = document.querySelector('.admin-panel-content') !== null;
            const isDocConverterTab = 
                document.querySelector('[data-tab="docConverter"].active') !== null || 
                getCurrentAdminTab() === 'docConverter';
            
            if (isAdminPanel && isDocConverterTab) {
                const statusContainer = document.createElement('div');
                statusContainer.id = 'doc-converter-status-container';
                statusContainer.className = 'diagnostics-container';
                statusContainer.style.cssText = `
                    max-height: 150px;
                    overflow-y: auto;
                    font-family: monospace;
                    font-size: 11px;
                    padding: 5px;
                    margin-top: 15px;
                    border: 1px solid #ddd;
                    background-color: #f9f9f9;
                    display: ${config.debugMode ? 'block' : 'none'};
                `;
                
                // Status-Header
                const header = document.createElement('div');
                header.className = 'diagnostics-header';
                header.textContent = 'Diagnose-Log';
                header.style.cssText = 'font-weight: bold; margin-bottom: 5px; padding-bottom: 3px; border-bottom: 1px solid #ccc;';
                statusContainer.appendChild(header);
                
                const docConverterApp = document.getElementById('doc-converter-app');
                if (docConverterApp) {
                    docConverterApp.parentNode.insertBefore(statusContainer, docConverterApp.nextSibling);
                    logMessage('Status-Container erstellt und eingefügt');
                }
            } else {
                logMessage('Status-Container wird nicht erstellt - nicht im Admin-Panel oder im falschen Tab', 'debug');
            }
        }
    }
    
    // Element-Beobachter für dynamische Änderungen
    function observeElements() {
        if ('MutationObserver' in window) {
            logMessage('Initialisiere MutationObserver für DOM-Änderungen');
            
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length) {
                        // Prüfe auf relevante Änderungen
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === 1) { // Element-Knoten
                                if (node.id === 'doc-converter-app' || 
                                    node.classList?.contains('admin-panel-content') ||
                                    node.getAttribute?.('data-tab') === 'docConverter') {
                                    
                                    logMessage(`Relevantes Element hinzugefügt: ${node.id || node.className || node.tagName}`, 'important');
                                    
                                    // Nach kurzer Verzögerung Status aktualisieren
                                    setTimeout(() => {
                                        captureStatus();
                                        if (config.autoCreateContainers) {
                                            ensureContainers();
                                        }
                                    }, 100);
                                }
                            }
                        });
                    }
                });
            });
            
            // Gesamten Body beobachten
            observer.observe(document.body, { childList: true, subtree: true });
            window.docConverterDiagnostics.observer = observer;
        } else {
            logMessage('MutationObserver nicht verfügbar im Browser', 'error');
        }
    }
    
    // Event-Tracer
    function setupEventTracer() {
        if (!config.traceEvents) return;
        
        logMessage('Initialisiere Event-Tracer');
        
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            // Nur für relevante Elemente und Events tracen
            if (this.id && (
                this.id.includes('converter') || 
                this.id.includes('doc-converter') ||
                this.id.includes('vue')
            )) {
                logMessage(`Event registriert: ${type} für ${this.id || this.tagName}`, 'debug');
            }
            
            // Originale Funktion aufrufen
            return originalAddEventListener.call(this, type, listener, options);
        };
        
        // Ursprüngliche Methode speichern für mögliche Wiederherstellung
        window.docConverterDiagnostics.originalAddEventListener = originalAddEventListener;
    }
    
    // Inline-Script-Fix
    function fixInlineScripts() {
        if (!config.fixInlineScripts) return;
        
        logMessage('Suche nach problematischen Inline-Scripts');
        
        const scripts = document.querySelectorAll('script:not([data-fixed])');
        let count = 0;
        
        scripts.forEach(script => {
            // Prüfe, ob das Script in einem Vue-Template ist
            if (script.parentElement && (
                script.parentElement.hasAttribute('v-if') ||
                script.parentElement.hasAttribute('v-else') ||
                script.parentElement.classList?.contains('vue-template-container')
            )) {
                script.setAttribute('data-fixed', 'true');
                script.setAttribute('type', 'text/plain'); // Verhindert Ausführung
                count++;
            }
        });
        
        if (count > 0) {
            logMessage(`${count} problematische Inline-Scripts gefunden und behoben`, 'important');
        } else {
            logMessage('Keine problematischen Inline-Scripts gefunden');
        }
    }
    
    // Diagnose-Bericht generieren
    function generateReport() {
        const status = captureStatus();
        
        let report = `
========== DOKUMENTENKONVERTER DIAGNOSE-BERICHT ==========
Zeitstempel: ${status.timestamp}
Browser: ${status.userAgent}
URL: ${status.url}

=== FEATURE FLAGS ===
`;
        
        for (const [flag, value] of Object.entries(status.featureFlags)) {
            report += `${flag}: ${value}\n`;
        }
        
        report += `
=== DOM-ELEMENTE ===
`;
        
        for (const [selector, info] of Object.entries(status.elements)) {
            report += `${selector}: ${info.found ? 'Gefunden' : 'NICHT gefunden'}`;
            if (info.found) {
                report += ` (sichtbar: ${info.visible ? 'Ja' : 'Nein'}, Kinder: ${info.innerHTML})`;
            }
            report += '\n';
        }
        
        report += `
=== SKRIPTE ===
`;
        
        status.scripts.forEach(script => {
            report += `${script.src} (${script.type || 'kein Typ'}) - ${script.loaded ? 'Geladen' : 'NICHT geladen'}\n`;
        });
        
        report += `
================== ENDE DES BERICHTS ===================
`;
        
        logMessage('Diagnose-Bericht generiert', 'important');
        window.docConverterDiagnostics.report = report;
        console.log(report);
        return report;
    }
    
    // Exportiere Diagnose-Funktion
    window.docConverterDiagnostics.diagnose = generateReport;
    
    // Manuelle Fallback-Initialisierung
    window.docConverterDiagnostics.forceFallback = function() {
        logMessage('Manueller Fallback für Dokumentenkonverter wird initialisiert', 'important');
        
        if (typeof window.initializeClassicDocConverter === 'function') {
            window.initializeClassicDocConverter();
            logMessage('Klassischer DocConverter wurde initialisiert', 'important');
            return true;
        } else {
            logMessage('Klassischer DocConverter nicht verfügbar, Fallback fehlgeschlagen', 'error');
            return false;
        }
    };
    
    // Alles initialisieren
    function initialize() {
        logMessage('Initialisiere Dokumentenkonverter-Diagnostik', 'important');
        
        if (config.autoCreateContainers) {
            ensureContainers();
        }
        
        observeElements();
        setupEventTracer();
        fixInlineScripts();
        captureStatus();
        
        logMessage('Diagnostik vollständig initialisiert', 'important');
        
        // Nach gewisser Zeit einen Statusbericht erstellen
        setTimeout(() => {
            if (config.verboseLogging) {
                generateReport();
            }
        }, 3000);
    }
    
    // Bei DOM-Laden initialisieren
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // DOM bereits geladen
        initialize();
    }
    
    // Periodisches Überprüfen des Status
    setInterval(() => {
        if (config.debugMode && config.verboseLogging) {
            captureStatus();
            fixInlineScripts();
        }
    }, 5000);
    
    logMessage('Diagnostik-Skript geladen');
})();