/**
 * Fallback-Implementierung des Dokumentenkonverters für die klassische UI
 * Diese Implementierung wird verwendet, wenn die Vue.js-Variante nicht aktiviert ist
 * 
 * Version: 1.2.1 - Verbesserte Fehlerbehandlung
 */
(function() {
    // Einfaches Logging
    function logInfo(message) {
        console.log('[DocConverter-Fallback] ' + message);
    }
    
    function logWarn(message) {
        console.warn('[DocConverter-Fallback] ' + message);
    }
    
    function logError(message) {
        console.error('[DocConverter-Fallback] ' + message);
    }
    
    logInfo('Lade klassische Dokumentenkonverter-Implementierung...');
    
    // Intercepte alle Skript-Ladevorgänge, um ES-Module-Fehler zu verhindern
    (function() {
        logInfo('Initialisiere Script-Interceptor für ES-Module...');

        try {
            // Erster Teil: Intercepte alle createElement-Aufrufe für script-Elemente
            const originalCreateElement = document.createElement;
            document.createElement = function(tagName) {
                const element = originalCreateElement.call(document, tagName);
                
                if (tagName.toLowerCase() === 'script') {
                    try {
                        // Speichere die ursprüngliche src-Property, falls sie existiert
                        const originalSrcDescriptor = Object.getOwnPropertyDescriptor(element, 'src');
                        
                        // Nur fortfahren, wenn der Descriptor existiert
                        if (originalSrcDescriptor) {
                            // Definiere neue src-Property
                            Object.defineProperty(element, 'src', {
                                get: function() {
                                    return originalSrcDescriptor.get.call(this);
                                },
                                set: function(value) {
                                    if (value && (value.includes('doc-converter.js') || value.includes('feature-toggle.js'))) {
                                        logWarn('Intercepted script src property: ' + value);
                                        
                                        // Ändern von doc-converter.js zu doc-converter-nomodule.js
                                        if (value.includes('doc-converter.js')) {
                                            value = value.replace('doc-converter.js', 'doc-converter-nomodule.js');
                                            logInfo('Changed src to: ' + value);
                                        }
                                        
                                        // Ändern von feature-toggle.js zu feature-toggle-nomodule.js
                                        if (value.includes('feature-toggle.js')) {
                                            value = value.replace('feature-toggle.js', 'feature-toggle-nomodule.js');
                                            logInfo('Changed src to: ' + value);
                                        }
                                    }
                                    return originalSrcDescriptor.set.call(this, value);
                                },
                                enumerable: true,
                                configurable: true
                            });
                        }
                    
                        // Speichere die ursprüngliche type-Property, falls sie existiert
                        const originalTypeDescriptor = Object.getOwnPropertyDescriptor(element, 'type');
                        
                        // Definiere neue type-Property nur wenn der Descriptor existiert
                        if (originalTypeDescriptor) {
                            Object.defineProperty(element, 'type', {
                                get: function() {
                                    return originalTypeDescriptor.get.call(this);
                                },
                                set: function(value) {
                                    if (value === 'module') {
                                        logInfo('Changing script type from module to text/javascript');
                                        value = 'text/javascript';
                                    }
                                    return originalTypeDescriptor.set.call(this, value);
                                },
                                enumerable: true,
                                configurable: true
                            });
                        } else {
                            logWarn('Kein type-Descriptor gefunden, überspringe Redefinition');
                        }
                    } catch (e) {
                        logError('Fehler bei Script-Element-Interceptor: ' + e.message);
                    }
                }
                
                return element;
            };
            
            // Zweiter Teil: Intercepte appendChild-Aufrufe für bestehende Skript-Elemente
            if (document.head) {
                const originalAppendChild = document.head.appendChild;
                document.head.appendChild = function(element) {
                    try {
                        // Prüfe, ob es sich um ein Skript-Element handelt
                        if (element.tagName === 'SCRIPT') {
                            // Ändere den Typ von 'module' zu 'text/javascript'
                            if (element.type === 'module') {
                                logInfo('Changing script type from module to text/javascript for ' + element.src);
                                element.type = 'text/javascript';
                            }
                            
                            // Prüfe die src-Eigenschaft
                            if (element.src) {
                                // Ändern von doc-converter.js zu doc-converter-nomodule.js
                                if (element.src.includes('doc-converter.js')) {
                                    logWarn('Intercepted script loading: ' + element.src);
                                    element.src = element.src.replace('doc-converter.js', 'doc-converter-nomodule.js');
                                    logInfo('Changed src to: ' + element.src);
                                }
                                
                                // Ändern von feature-toggle.js zu feature-toggle-nomodule.js
                                if (element.src.includes('feature-toggle.js')) {
                                    logWarn('Intercepted script loading: ' + element.src);
                                    element.src = element.src.replace('feature-toggle.js', 'feature-toggle-nomodule.js');
                                    logInfo('Changed src to: ' + element.src);
                                }
                            }
                        }
                    } catch (e) {
                        logError('Fehler beim Intercepten von appendChild: ' + e.message);
                    }
                    
                    // Ursprüngliche Methode aufrufen
                    try {
                        return originalAppendChild.call(this, element);
                    } catch (e) {
                        logError('Fehler bei originalAppendChild: ' + e.message);
                        throw e; // Weiterleiten des Fehlers
                    }
                };
            } else {
                logWarn('document.head existiert noch nicht, verzögere Interceptor');
            }
        } catch (e) {
            logError('Kritischer Fehler beim Einrichten des Script-Interceptors: ' + e.message);
        }
        
        logInfo('Script-Interceptor für ES-Module vollständig initialisiert');
    })();
    
    // Funktion zum Anzeigen einer einfachen Benutzeroberfläche
    function showSimpleUI(container) {
        // Sicherstellen, dass der Container sichtbar ist
        container.style.display = 'block';
        container.style.visibility = 'visible';
        container.style.opacity = '1';
        
        // UI-Inhalt setzen
        container.innerHTML = `
            <div class="doc-converter classic-ui">
                <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">Dokumenten-Konverter (Einfache Ansicht)</h2>
                
                <div style="padding: 1rem; margin-bottom: 1.5rem; background-color: #eefbff; border-left: 4px solid #3b82f6;">
                    <p style="margin-bottom: 0;">Einfache Ansicht des Dokumentenkonverters.</p>
                </div>
                
                <form action="/api/admin/upload/document" method="post" enctype="multipart/form-data">
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Datei auswählen</label>
                        <input type="file" name="file" style="border: 1px solid #e5e7eb; padding: 0.75rem; width: 100%; border-radius: 0.25rem; background-color: #f9fafb;" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.html,.txt">
                        <p style="margin-top: 0.5rem; color: #6b7280; font-size: 0.875rem;">Unterstützte Formate: PDF, DOCX, XLSX, PPTX, HTML, TXT</p>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.75rem; font-weight: 500;">Konvertierungsoptionen</label>
                        
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-left: 0.5rem;">
                            <label style="display: flex; align-items: center;">
                                <input type="checkbox" name="post_processing" checked style="margin-right: 0.5rem;">
                                <span>Nachbearbeitung (verbessert Struktur und Format)</span>
                            </label>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                        <button type="submit" style="background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 500;">
                            Dokument konvertieren
                        </button>
                    </div>
                </form>
            </div>
        `;
    }
    
    // Funktion zum Finden oder Erstellen eines Containers
    function findOrCreateContainer() {
        // Vorhandene Container suchen
        const existingContainer = 
            document.getElementById('doc-converter-container') || 
            document.querySelector('#rescue-tab-doc-converter') ||
            document.getElementById('doc-converter-app') ||
            document.querySelector('[data-tab="docConverter"]');
            
        if (existingContainer) {
            logInfo('Existierenden Container gefunden');
            return existingContainer;
        }
        
        // Keinen Container gefunden, neuen erstellen
        logInfo('Erstelle neuen Container');
        
        // Suche nach einem Admin-Bereich, wo wir den Container einfügen können
        const adminContent = document.querySelector('.admin-content') || 
                            document.querySelector('.admin-panel-content') || 
                            document.querySelector('.content-container') ||
                            document.querySelector('.main-content') ||
                            document.querySelector('main') ||
                            document.body; // Notfalls in den Body einbinden
                            
        if (\!adminContent) {
            logError('Kein Ziel für Container-Einfügung gefunden');
            return null;
        }
        
        // Container erstellen
        const container = document.createElement('div');
        container.id = 'doc-converter-container';
        container.className = 'doc-converter admin-tab-content';
        container.setAttribute('data-tab', 'docConverter');
        container.style.cssText = `
            display: block \!important;
            visibility: visible \!important;
            opacity: 1 \!important;
            min-height: 400px;
            width: 100%;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin: 20px 0;
        `;
        
        adminContent.appendChild(container);
        return container;
    }
    
    // Exportiert die Funktion zur Initialisierung
    window.initializeClassicDocConverter = function() {
        logInfo('Klassischen DocConverter initialisieren');
        
        // Container finden oder erstellen
        const container = findOrCreateContainer();
        
        if (\!container) {
            logError('Konnte keinen Container finden oder erstellen');
            return false;
        }
        
        // Einfache UI anzeigen
        showSimpleUI(container);
        
        logInfo('Klassische Implementierung erfolgreich initialisiert');
        return true;
    };
    
    // CSS für den DocConverter dynamisch erstellen
    function addCSS() {
        if (document.getElementById('doc-converter-fallback-css')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'doc-converter-fallback-css';
        style.textContent = `
            #doc-converter-container,
            #doc-converter-app,
            .doc-converter,
            [data-tab="docConverter"],
            #rescue-tab-doc-converter,
            .admin-tab-content[data-tab="docConverter"],
            .admin-tab-content.docConverter {
                display: block \!important;
                visibility: visible \!important;
                opacity: 1 \!important;
                min-height: 400px;
                width: 100%;
            }
            
            .doc-converter.classic-ui {
                padding: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Auto-Initialisierung starten
    try {
        // CSS hinzufügen
        if (document.head) {
            addCSS();
        } else {
            document.addEventListener('DOMContentLoaded', addCSS);
        }
        
        // Nach dem DOM-Ready Container erstellen und UI anzeigen
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                window.initializeClassicDocConverter();
            });
        } else {
            window.initializeClassicDocConverter();
        }
    } catch (e) {
        logError('Fehler bei Auto-Initialisierung: ' + e.message);
    }
    
    logInfo('Fallback-Skript vollständig geladen');
})();
