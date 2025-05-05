/**
 * Sofortige Bereinigung aller Dokumentenkonverter-Elemente außerhalb des Admin-Tabs
 * Dieses Skript wird direkt am Anfang der Seite ausgeführt, um unerwünschte Dokumentenkonverter-Elemente zu verhindern
 * Verbesserte Version mit spezieller Behandlung für Chat-Bereich und stärkerer Bereinigung
 */
(function() {
    // Markiere globalen Debug-Modus
    const DEBUG = true;
    
    function log(message, ...args) {
        if (DEBUG) {
            console.log('[DocConverter-ForceCleanup] ' + message, ...args);
        }
    }
    
    // CSS-Regel direkt einfügen, um Dokumentenkonverter außerhalb des Admins zu verbergen
    function injectCSS() {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = `
            /* Verstecke alle Dokumentenkonverter außerhalb des Admin-Panels */
            #doc-converter-container:not(.admin-panel *),
            #doc-converter-app:not(.admin-panel *),
            .doc-converter:not(.admin-panel *),
            [data-tab="docConverter"]:not(.admin-panel *) {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                height: 0 !important;
                width: 0 !important;
                position: absolute !important;
                left: -9999px !important;
                overflow: hidden !important;
                pointer-events: none !important;
                max-height: 0 !important;
                max-width: 0 !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
            }
            
            /* Spezifisch für Chat-Bereich */
            .chat-window #doc-converter-container,
            .chat-window #doc-converter-app,
            .chat-window .doc-converter,
            .chat-window [data-tab="docConverter"],
            .chat-container #doc-converter-container,
            .chat-container #doc-converter-app,
            .chat-container .doc-converter,
            .chat-container [data-tab="docConverter"],
            .messages-container #doc-converter-container,
            .messages-container #doc-converter-app,
            .messages-container .doc-converter,
            .messages-container [data-tab="docConverter"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                height: 0 !important;
                max-height: 0 !important;
            }
        `;
        document.head.appendChild(style);
        log('CSS-Regeln eingefügt');
    }
    
    // Sofort ausführen
    function forceCleanup() {
        log('Starte sofortige Bereinigung');
        
        // Entferne alle Dokumentenkonverter-Elemente außerhalb der Admin-Tabs
        const elements = document.querySelectorAll('#doc-converter-container, #doc-converter-app, .doc-converter, [data-tab="docConverter"]');
        
        let removedCount = 0;
        elements.forEach(function(element) {
            // Prüfe, ob das Element in einem Admin-Tab ist
            let isInAdminTab = false;
            let isInChatArea = false;
            let parent = element.parentElement;
            
            while (parent) {
                if (parent.classList) {
                    // Admin-Bereich prüfen
                    if (parent.classList.contains('admin-tab-content') || 
                        parent.classList.contains('admin-panel') || 
                        parent.classList.contains('admin-content') ||
                        parent.classList.contains('tab-content')) {
                        isInAdminTab = true;
                        break;
                    }
                    
                    // Chat-Bereich erkennen
                    if (parent.classList.contains('chat-window') || 
                        parent.classList.contains('chat-container') || 
                        parent.classList.contains('chat-content') || 
                        parent.classList.contains('messages-container')) {
                        isInChatArea = true;
                        break;
                    }
                }
                
                // ID-basierte Prüfung
                if (parent.id) {
                    if (parent.id === 'chat-window' || 
                        parent.id === 'chat-container' || 
                        parent.id === 'messages-container') {
                        isInChatArea = true;
                        break;
                    }
                }
                
                parent = parent.parentElement;
            }
            
            // Entferne Elemente, die nicht im Admin-Tab sind
            if (!isInAdminTab || isInChatArea) {
                log('Entferne unerwünschtes Element', element);
                
                if (element.parentElement) {
                    try {
                        // Versuche zuerst, es unsichtbar zu machen
                        element.style.display = 'none';
                        element.style.visibility = 'hidden';
                        element.style.opacity = '0';
                        element.style.height = '0';
                        element.style.width = '0';
                        element.style.position = 'absolute';
                        element.style.left = '-9999px';
                        element.style.overflow = 'hidden';
                        element.style.pointerEvents = 'none';
                        element.style.maxHeight = '0';
                        element.style.maxWidth = '0';
                        element.style.padding = '0';
                        element.style.margin = '0';
                        element.style.border = 'none';
                        
                        // Setze Attribute
                        element.setAttribute('aria-hidden', 'true');
                        element.setAttribute('data-removed-by-cleanup', 'true');
                        
                        // Verstecke alle Kinder
                        const children = element.querySelectorAll('*');
                        children.forEach(child => {
                            child.style.display = 'none';
                            child.style.visibility = 'hidden';
                            child.style.opacity = '0';
                        });
                        
                        // Versuche dann, es zu entfernen
                        element.parentElement.removeChild(element);
                        removedCount++;
                    } catch (e) {
                        console.error('[DocConverter-ForceCleanup] Fehler beim Entfernen:', e);
                    }
                }
            }
        });
        
        if (removedCount > 0) {
            log(`${removedCount} Elemente entfernt`);
        }
        
        // Suche nach spezifischen Elementen im Chat-Bereich
        const chatAreas = document.querySelectorAll('.chat-window, .chat-container, .messages-container, #chat-window, #chat-container, #messages-container');
        chatAreas.forEach(chatArea => {
            const converters = chatArea.querySelectorAll('#doc-converter-container, #doc-converter-app, .doc-converter, [data-tab="docConverter"]');
            converters.forEach(converter => {
                try {
                    log('Entferne Konverter aus Chat-Bereich', converter);
                    converter.style.display = 'none';
                    converter.style.visibility = 'hidden';
                    converter.style.opacity = '0';
                    converter.style.height = '0';
                    converter.parentElement.removeChild(converter);
                } catch (e) {
                    console.error('[DocConverter-ForceCleanup] Fehler beim Entfernen aus Chat:', e);
                }
            });
        });
    }
    
    // Füge CSS-Regeln ein
    injectCSS();
    
    // Führe Cleanup sofort aus
    forceCleanup();
    
    // Führe es nach kurzer Verzögerung erneut aus (falls DOM erst später vollständig geladen wird)
    setTimeout(forceCleanup, 100);
    setTimeout(forceCleanup, 500);
    setTimeout(forceCleanup, 1000);
    setTimeout(forceCleanup, 2000);
    setTimeout(forceCleanup, 3000);
    
    // MutationObserver für dynamische Änderungen
    if (window.MutationObserver) {
        const observer = new MutationObserver(function(mutations) {
            // Prüfe, ob neue Konverter-Elemente hinzugefügt wurden
            let needsCleanup = false;
            
            for (const mutation of mutations) {
                if (mutation.addedNodes && mutation.addedNodes.length) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        
                        if (node.nodeType === 1) { // Nur Elemente prüfen
                            const converter = node.id === 'doc-converter-container' || 
                                             node.id === 'doc-converter-app' || 
                                             (node.classList && node.classList.contains('doc-converter')) ||
                                             (node.hasAttribute && node.hasAttribute('data-tab') && node.getAttribute('data-tab') === 'docConverter');
                            
                            if (converter) {
                                needsCleanup = true;
                                break;
                            }
                            
                            // Prüfe auch, ob das Element Konverter-Elemente enthält
                            if (node.querySelector && 
                                node.querySelector('#doc-converter-container, #doc-converter-app, .doc-converter, [data-tab="docConverter"]')) {
                                needsCleanup = true;
                                break;
                            }
                        }
                    }
                }
                
                if (needsCleanup) break;
            }
            
            if (needsCleanup) {
                log('Neue Konverter-Elemente erkannt, führe Bereinigung durch');
                forceCleanup();
            }
        });
        
        // Beobachte den gesamten Body
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } else {
            // Falls body noch nicht geladen ist, warte auf DOMContentLoaded
            document.addEventListener('DOMContentLoaded', function() {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            });
        }
    }
    
    // Exportiere als globale Funktion
    window.forceDocConverterCleanup = forceCleanup;
    
    // Automatische regelmäßige Ausführung für besonders hartnäckige Fälle
    setInterval(forceCleanup, 5000);
    
    // Event-Listener für Tab-Wechsel
    document.addEventListener('DOMContentLoaded', function() {
        // Finde alle Tab-Links und reagiere auf Klicks
        const tabLinks = document.querySelectorAll('[data-tab]');
        tabLinks.forEach(link => {
            link.addEventListener('click', function() {
                // Kurze Verzögerung, um den DOM-Update abzuwarten
                setTimeout(forceCleanup, 100);
                setTimeout(forceCleanup, 300);
            });
        });
    });
    
    // Bereinige nach Page-Load und Window-Resize
    window.addEventListener('load', forceCleanup);
    window.addEventListener('resize', forceCleanup);
    
    log('Cleanup-System initialisiert');
})();