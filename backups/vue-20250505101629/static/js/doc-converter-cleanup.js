/**
 * Dokumentenkonverter-Cleanup-Skript
 * Dieses Skript entfernt unerwünschte Instanzen des Dokumentenkonverters außerhalb des Admin-Tabs
 */
(function() {
    // Logging-Funktion
    function log(message, type) {
        var prefix = "[DocConverter-Cleanup]";
        
        switch(type) {
            case 'error': console.error(prefix, message); break;
            case 'warn': console.warn(prefix, message); break;
            default: console.log(prefix, message);
        }
    }
    
    // Haupt-Cleanup-Funktion
    function cleanupDocConverter() {
        log("Starte Dokumentenkonverter-Bereinigung");
        
        // Prüfe, ob wir auf der Admin-Seite im Dokumentenkonverter-Tab sind
        var isAdminPage = document.body.classList.contains('admin-page') || 
                          document.querySelector('.admin-panel') !== null;
        
        var isDocConverterTab = document.querySelector('.admin-nav-item[data-tab="docConverter"].active') !== null ||
                               window.location.href.includes('docConverter') ||
                               document.querySelector('.tab-content[data-active-tab="docConverter"]') !== null;
        
        // Füge CSS-Klassen zum Body hinzu, um CSS-Selektoren zu unterstützen
        if (isAdminPage) {
            document.body.classList.add('admin-page');
            
            if (isDocConverterTab) {
                document.body.classList.add('admin-docconverter-tab');
                log("Befinden uns im Admin-Bereich im Dokumentenkonverter-Tab");
            } else {
                document.body.classList.remove('admin-docconverter-tab');
                log("Befinden uns im Admin-Bereich, aber NICHT im Dokumentenkonverter-Tab");
            }
        } else {
            document.body.classList.remove('admin-page');
            document.body.classList.remove('admin-docconverter-tab');
            log("Befinden uns NICHT im Admin-Bereich");
        }
        
        // Wenn wir nicht im Admin-Bereich oder nicht im DocConverter-Tab sind,
        // entferne alle Dokumentenkonverter-Instanzen
        if (!isAdminPage || !isDocConverterTab) {
            // Finde alle Dokumentenkonverter-Elemente
            var converters = document.querySelectorAll('#doc-converter-container, #doc-converter-app, .doc-converter, [data-tab="docConverter"]');
            
            // Entferne sie, wenn sie nicht innerhalb eines Tab-Containers sind
            converters.forEach(function(converter) {
                // Prüfe, ob das Element außerhalb eines Tab-Containers ist
                var isInTabContent = false;
                var parent = converter.parentElement;
                
                while (parent !== null) {
                    if (parent.classList && 
                        (parent.classList.contains('tab-content') || 
                         parent.classList.contains('admin-tab-content') ||
                         parent.hasAttribute('data-active-tab'))) {
                        isInTabContent = true;
                        break;
                    }
                    parent = parent.parentElement;
                }
                
                // Wenn das Element außerhalb eines Tab-Containers ist, entferne es
                if (!isInTabContent) {
                    log("Entferne Dokumentenkonverter-Element: " + (converter.id || converter.className), 'warn');
                    converter.style.display = 'none';
                    converter.style.visibility = 'hidden';
                    converter.style.opacity = '0';
                    converter.style.height = '0';
                    converter.style.overflow = 'hidden';
                    
                    try {
                        // Versuche, das Element aus dem DOM zu entfernen
                        if (converter.parentElement) {
                            converter.parentElement.removeChild(converter);
                            log("Element erfolgreich aus dem DOM entfernt");
                        }
                    } catch (e) {
                        log("Konnte Element nicht vollständig entfernen: " + e.message, 'error');
                    }
                }
            });
            
            log("Dokumentenkonverter-Bereinigung abgeschlossen");
        }
    }
    
    // Führe die Bereinigung bei Seitenladung aus
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', cleanupDocConverter);
    } else {
        cleanupDocConverter();
    }
    
    // Führe die Bereinigung nach kurzer Verzögerung erneut aus (für dynamisch geladene Inhalte)
    setTimeout(cleanupDocConverter, 1000);
    setTimeout(cleanupDocConverter, 2000);
    setTimeout(cleanupDocConverter, 5000);
    
    // Beobachte DOM-Änderungen, um dynamisch eingefügte Konverter-Elemente zu bereinigen
    if (window.MutationObserver) {
        var observer = new MutationObserver(function(mutations) {
            var needsCleanup = false;
            
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length) {
                    for (var i = 0; i < mutation.addedNodes.length; i++) {
                        var node = mutation.addedNodes[i];
                        
                        // Prüfe, ob es sich um ein Element handelt
                        if (node.nodeType === 1) {
                            // Prüfe, ob das Element ein Dokumentenkonverter-Element ist
                            if (node.id === 'doc-converter-container' || 
                                node.id === 'doc-converter-app' || 
                                (node.classList && node.classList.contains('doc-converter')) ||
                                node.hasAttribute('data-tab') && node.getAttribute('data-tab') === 'docConverter') {
                                needsCleanup = true;
                                break;
                            }
                            
                            // Prüfe, ob das Element Dokumentenkonverter-Elemente enthält
                            if (node.querySelector && node.querySelector('#doc-converter-container, #doc-converter-app, .doc-converter, [data-tab="docConverter"]')) {
                                needsCleanup = true;
                                break;
                            }
                        }
                    }
                }
            });
            
            if (needsCleanup) {
                log("DOM-Änderung mit Dokumentenkonverter-Elementen erkannt, starte Bereinigung");
                cleanupDocConverter();
            }
        });
        
        // Starte die Beobachtung
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        log("DOM-Beobachtung für Dokumentenkonverter-Bereinigung gestartet");
    }
    
    // Exportiere die Funktion global
    window.cleanupDocConverter = cleanupDocConverter;
})();