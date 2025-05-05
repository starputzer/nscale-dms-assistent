/**
 * DocConverter Modul-Redirector
 * Dieses Skript wird direkt vor den Vue.js-Modulskripten geladen und leitet
 * die ES6-Modul-Imports automatisch auf die nomodule-Varianten um
 */

(function() {
    // Logging-Funktion
    function log(message, type = 'info') {
        const prefix = '[ModuleRedirector]';
        switch(type) {
            case 'error': console.error(prefix, message); break;
            case 'warn': console.warn(prefix, message); break;
            default: console.log(prefix, message);
        }
    }

    log('Initialisiere ES6-Modul-Redirector...');

    try {
        // Originalfunktion für createElement abrufen
        const originalCreateElement = document.createElement;
        
        // Funktion überschreiben, um Skript-Tags zu erkennen
        document.createElement = function(tagName) {
            // Originalelement erstellen
            const element = originalCreateElement.call(document, tagName);
            
            // Wir sind nur an script-Elementen interessiert
            if (tagName.toLowerCase() === 'script') {
                try {
                    // Originalbeschreibung der src-Eigenschaft abrufen
                    const originalSrcDescriptor = Object.getOwnPropertyDescriptor(element, 'src');
                    
                    // Nur wenn Descriptor existiert
                    if (originalSrcDescriptor) {
                        // Neue src-Eigenschaft definieren
                        Object.defineProperty(element, 'src', {
                            get: function() {
                                return originalSrcDescriptor.get.call(this);
                            },
                            set: function(value) {
                                // Prüfen, ob wir diesen Pfad umleiten müssen
                                if (value && typeof value === 'string') {
                                    const lowerValue = value.toLowerCase();
                                    
                                    // doc-converter.js umleiten
                                    if (lowerValue.includes('doc-converter.js')) {
                                        log(`Leite um: ${value} -> ${value.replace('.js', '-nomodule.js')}`, 'warn');
                                        value = value.replace('.js', '-nomodule.js');
                                    }
                                    
                                    // feature-toggle.js umleiten
                                    if (lowerValue.includes('feature-toggle.js')) {
                                        log(`Leite um: ${value} -> ${value.replace('.js', '-nomodule.js')}`, 'warn');
                                        value = value.replace('.js', '-nomodule.js');
                                    }
                                }
                                
                                // Originalfunktion mit dem (möglicherweise geänderten) Wert aufrufen
                                return originalSrcDescriptor.set.call(this, value);
                            },
                            enumerable: true,
                            configurable: true
                        });
                    }
                    
                    // Originalbeschreibung der type-Eigenschaft abrufen
                    const originalTypeDescriptor = Object.getOwnPropertyDescriptor(element, 'type');
                    
                    // Nur wenn Descriptor existiert
                    if (originalTypeDescriptor) {
                        // Neue type-Eigenschaft definieren
                        Object.defineProperty(element, 'type', {
                            get: function() {
                                return originalTypeDescriptor.get.call(this);
                            },
                            set: function(value) {
                                // Typ von module auf text/javascript ändern
                                if (value === 'module') {
                                    log('Ändere Skripttyp von module zu text/javascript', 'warn');
                                    value = 'text/javascript';
                                }
                                
                                // Originalfunktion mit dem (möglicherweise geänderten) Wert aufrufen
                                return originalTypeDescriptor.set.call(this, value);
                            },
                            enumerable: true,
                            configurable: true
                        });
                    }
                } catch (err) {
                    log(`Fehler beim Intercepten von script-Eigenschaften: ${err.message}`, 'error');
                }
            }
            
            return element;
        };
        
        // appendChild für document.head abfangen, um Script-Tags zu erkennen
        if (document.head) {
            const originalAppendChild = document.head.appendChild;
            document.head.appendChild = function(element) {
                // Nur Skripte anpassen
                if (element.tagName && element.tagName.toLowerCase() === 'script') {
                    // Typ von module zu text/javascript ändern
                    if (element.type === 'module') {
                        log(`Ändere Skripttyp für ${element.src} von module zu text/javascript`, 'warn');
                        element.type = 'text/javascript';
                    }
                    
                    // URL umleiten, wenn nötig
                    if (element.src && typeof element.src === 'string') {
                        const lowerSrc = element.src.toLowerCase();
                        
                        // doc-converter.js umleiten
                        if (lowerSrc.includes('doc-converter.js')) {
                            log(`Leite um: ${element.src} -> ${element.src.replace('.js', '-nomodule.js')}`, 'warn');
                            element.src = element.src.replace('.js', '-nomodule.js');
                        }
                        
                        // feature-toggle.js umleiten
                        if (lowerSrc.includes('feature-toggle.js')) {
                            log(`Leite um: ${element.src} -> ${element.src.replace('.js', '-nomodule.js')}`, 'warn');
                            element.src = element.src.replace('.js', '-nomodule.js');
                        }
                    }
                }
                
                // Original appendChild aufrufen
                return originalAppendChild.call(this, element);
            };
        } else {
            log('document.head ist noch nicht verfügbar - DOMContentLoaded abwarten', 'warn');
            
            // Interceptor nach DOMContentLoaded erneut installieren
            document.addEventListener('DOMContentLoaded', function() {
                if (document.head) {
                    const originalAppendChild = document.head.appendChild;
                    document.head.appendChild = function(element) {
                        // Nur Skripte anpassen
                        if (element.tagName && element.tagName.toLowerCase() === 'script') {
                            // Typ von module zu text/javascript ändern
                            if (element.type === 'module') {
                                log(`Ändere Skripttyp für ${element.src} von module zu text/javascript`, 'warn');
                                element.type = 'text/javascript';
                            }
                            
                            // URL umleiten, wenn nötig
                            if (element.src && typeof element.src === 'string') {
                                const lowerSrc = element.src.toLowerCase();
                                
                                // doc-converter.js umleiten
                                if (lowerSrc.includes('doc-converter.js')) {
                                    log(`Leite um: ${element.src} -> ${element.src.replace('.js', '-nomodule.js')}`, 'warn');
                                    element.src = element.src.replace('.js', '-nomodule.js');
                                }
                                
                                // feature-toggle.js umleiten
                                if (lowerSrc.includes('feature-toggle.js')) {
                                    log(`Leite um: ${element.src} -> ${element.src.replace('.js', '-nomodule.js')}`, 'warn');
                                    element.src = element.src.replace('.js', '-nomodule.js');
                                }
                            }
                        }
                        
                        // Original appendChild aufrufen
                        return originalAppendChild.call(this, element);
                    };
                } else {
                    log('document.head ist nach DOMContentLoaded immer noch nicht verfügbar!', 'error');
                }
            });
        }

        log('ES6-Modul-Redirector wurde erfolgreich installiert');
    } catch (err) {
        log(`Kritischer Fehler beim Installieren des Redirectors: ${err.message}`, 'error');
    }
})();