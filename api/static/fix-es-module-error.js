// fix-es-module-error.js
// Diese Datei behebt direkt die ES-Module-Fehler und verhindert, dass Vue.js-Komponenten sie verursachen

(function() {
    console.log('ES-Module-Fehlerbehebung wird geladen...');

    // Funktion zum Korrigieren von Script-Tags
    function fixScriptTags() {
        try {
            // Finde alle Script-Tags im DOM
            const scriptTags = document.querySelectorAll('script[src*="doc-converter.js"], script[src*="feature-toggle.js"]');
            
            // Protokollieren der gefundenen Tags
            console.log(`[ES-Fix] Gefundene Script-Tags: ${scriptTags.length}`);
            
            // Ersetze die Module-Tags durch reguläre Script-Tags
            scriptTags.forEach(script => {
                // Erstelle ein neues Script-Tag
                const newScript = document.createElement('script');
                
                // Kopiere alle Attribute außer type und src
                Array.from(script.attributes).forEach(attr => {
                    if (attr.name !== 'type' && attr.name !== 'src') {
                        newScript.setAttribute(attr.name, attr.value);
                    }
                });
                
                // Setze regulären Typ
                newScript.type = 'text/javascript';
                
                // Ersetze doc-converter.js durch doc-converter-nomodule.js
                if (script.src.includes('doc-converter.js')) {
                    newScript.src = script.src.replace('doc-converter.js', 'doc-converter-nomodule.js');
                    console.log(`[ES-Fix] Script-Tag ersetzt: ${script.src} -> ${newScript.src}`);
                }
                
                // Ersetze feature-toggle.js durch feature-toggle-nomodule.js
                if (script.src.includes('feature-toggle.js')) {
                    newScript.src = script.src.replace('feature-toggle.js', 'feature-toggle-nomodule.js');
                    console.log(`[ES-Fix] Script-Tag ersetzt: ${script.src} -> ${newScript.src}`);
                }
                
                // Füge das neue Tag hinzu und entferne das alte
                if (script.parentNode) {
                    script.parentNode.insertBefore(newScript, script);
                    script.parentNode.removeChild(script);
                }
            });
            
            console.log('[ES-Fix] Script-Tags wurden erfolgreich korrigiert');
            return true;
        } catch (error) {
            console.error('[ES-Fix] Fehler beim Korrigieren der Script-Tags:', error);
            return false;
        }
    }

    // Funktion zum manuellen Laden der Nomodule-Version
    function loadNomoduleVersion() {
        try {
            console.log('[ES-Fix] Lade doc-converter-nomodule.js manuell...');
            
            // Mögliche Pfade zur Datei
            const possiblePaths = [
                '/static/vue/standalone/doc-converter-nomodule.js',
                '/frontend/js/vue/doc-converter-nomodule.js',
                '/api/static/vue/standalone/doc-converter-nomodule.js',
                '/frontend/static/vue/standalone/doc-converter-nomodule.js'
            ];
            
            // Versuche, die Datei zu laden
            function tryLoadScript(index) {
                if (index >= possiblePaths.length) {
                    console.error('[ES-Fix] Alle Pfade für doc-converter-nomodule.js fehlgeschlagen');
                    return;
                }
                
                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = possiblePaths[index];
                
                script.onload = function() {
                    console.log(`[ES-Fix] doc-converter-nomodule.js erfolgreich geladen von ${possiblePaths[index]}`);
                };
                
                script.onerror = function() {
                    console.warn(`[ES-Fix] Fehler beim Laden von ${possiblePaths[index]}, versuche nächsten Pfad...`);
                    tryLoadScript(index + 1);
                };
                
                document.head.appendChild(script);
            }
            
            // Starte mit dem ersten Pfad
            tryLoadScript(0);
            
            return true;
        } catch (error) {
            console.error('[ES-Fix] Fehler beim manuellen Laden der Nomodule-Version:', error);
            return false;
        }
    }

    // CSS-Stil für Vue-Templates direkt einfügen
    function addVueTemplateStyle() {
        try {
            console.log('[ES-Fix] Füge CSS-Stil für Vue-Templates hinzu...');
            
            const style = document.createElement('style');
            style.textContent = `
                /* Vue Template Fix CSS */
                .vue-template-container {
                    display: none !important;
                }
            `;
            
            document.head.appendChild(style);
            console.log('[ES-Fix] CSS-Stil für Vue-Templates wurde hinzugefügt');
            return true;
        } catch (error) {
            console.error('[ES-Fix] Fehler beim Hinzufügen des CSS-Stils:', error);
            return false;
        }
    }

    // MutationObserver zum Abfangen neuer Script-Tags
    function setupMutationObserver() {
        try {
            console.log('[ES-Fix] Richte MutationObserver für DOM-Änderungen ein...');
            
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(function(node) {
                            // Prüfe, ob es sich um ein Script-Element handelt
                            if (node.nodeName === 'SCRIPT') {
                                const scriptNode = node;
                                
                                // Prüfe, ob es sich um ein ES-Modul handelt
                                if (scriptNode.type === 'module') {
                                    console.log(`[ES-Fix] Neues module-Script erkannt: ${scriptNode.src}`);
                                    
                                    // Ändere den Typ
                                    scriptNode.type = 'text/javascript';
                                    
                                    // Ändere die Quelle, falls notwendig
                                    if (scriptNode.src.includes('doc-converter.js')) {
                                        scriptNode.src = scriptNode.src.replace('doc-converter.js', 'doc-converter-nomodule.js');
                                    }
                                    
                                    if (scriptNode.src.includes('feature-toggle.js')) {
                                        scriptNode.src = scriptNode.src.replace('feature-toggle.js', 'feature-toggle-nomodule.js');
                                    }
                                }
                            }
                        });
                    }
                });
            });
            
            // Beobachte Änderungen im gesamten DOM
            observer.observe(document, { childList: true, subtree: true });
            
            console.log('[ES-Fix] MutationObserver wurde erfolgreich eingerichtet');
            return true;
        } catch (error) {
            console.error('[ES-Fix] Fehler beim Einrichten des MutationObservers:', error);
            return false;
        }
    }

    // Initialisierung
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[ES-Fix] DOM geladen, starte Fehlerbehebung...');
        
        // CSS-Stil für Vue-Templates hinzufügen
        addVueTemplateStyle();
        
        // Bestehende Script-Tags korrigieren
        fixScriptTags();
        
        // MutationObserver für neue Script-Tags einrichten
        setupMutationObserver();
        
        // Lade die Nomodule-Version direkt
        setTimeout(loadNomoduleVersion, 500);
    });

    // Sofort ausführen für frühe Fehlerbehebung
    addVueTemplateStyle();
    setupMutationObserver();
    
    console.log('[ES-Fix] ES-Module-Fehlerbehebung wurde geladen!');
})();