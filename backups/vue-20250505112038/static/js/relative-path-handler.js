/**
 * Relative Path Handler
 * Spezieller Handler für die Verwendung von relativen Pfaden in der Anwendung
 * Berücksichtigt Port 8080 und verschiedene Basis-URLs
 */

(function() {
    console.log("[RelativePathHandler] Initialisierung...");
    
    // Die aktuelle Basis-URL dynamisch bestimmen (mit Port)
    const baseUrl = window.location.origin;
    console.log(`[RelativePathHandler] Basis-URL: ${baseUrl}`);
    
    // DOM überwachen und alle absoluten Pfade für Ressourcen ersetzen
    function processExistingElements() {
        // CSS-Links überprüfen und korrigieren
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('/') && !href.startsWith('//') && !link.getAttribute('data-processed')) {
                // Relativen Pfad erzeugen (ohne führenden Slash)
                const newHref = href.substring(1); // Entferne führenden Slash
                console.log(`[RelativePathHandler] Ändere CSS-Pfad von ${href} zu ${newHref}`);
                
                // Neuen Link erstellen und einfügen
                const newLink = document.createElement('link');
                newLink.rel = 'stylesheet';
                newLink.href = newHref;
                newLink.setAttribute('data-processed', 'true');
                
                // Alten Link ersetzen (nach dem Laden)
                newLink.onload = function() {
                    if (link.parentNode) {
                        link.parentNode.removeChild(link);
                    }
                };
                
                document.head.appendChild(newLink);
            }
        });
        
        // Script-Tags überprüfen und korrigieren
        document.querySelectorAll('script[src]').forEach(script => {
            const src = script.getAttribute('src');
            if (src && src.startsWith('/') && !src.startsWith('//') && !script.getAttribute('data-processed')) {
                // Externale CDN-Ressourcen überspringen
                if (src.includes('cdn.') || src.includes('//')) {
                    return;
                }
                
                // Relativen Pfad erzeugen (ohne führenden Slash)
                const newSrc = src.substring(1); // Entferne führenden Slash
                console.log(`[RelativePathHandler] Ändere Script-Pfad von ${src} zu ${newSrc}`);
                
                // Neues Script erstellen und einfügen
                const newScript = document.createElement('script');
                newScript.src = newSrc;
                newScript.setAttribute('data-processed', 'true');
                
                // Altes Script ersetzen
                if (script.parentNode) {
                    script.parentNode.insertBefore(newScript, script);
                    // Wir entfernen das alte Script nicht, um Skriptausführungsprobleme zu vermeiden
                }
            }
        });
    }
    
    // Überschreibe die createElement-Methode, um neue Ressourcen zu überwachen
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
        const element = originalCreateElement.call(document, tagName);
        
        if (tagName.toLowerCase() === 'link') {
            const originalSetAttribute = element.setAttribute;
            element.setAttribute = function(name, value) {
                if (name === 'href' && value && value.startsWith('/') && !value.startsWith('//')) {
                    // Externale CDN-Ressourcen überspringen
                    if (value.includes('cdn.') || value.includes('//')) {
                        return originalSetAttribute.call(this, name, value);
                    }
                    
                    // Relativen Pfad erzeugen (ohne führenden Slash)
                    const newValue = value.substring(1);
                    console.log(`[RelativePathHandler] Intercepted Link: ${value} -> ${newValue}`);
                    value = newValue;
                }
                return originalSetAttribute.call(this, name, value);
            };
        }
        
        if (tagName.toLowerCase() === 'script') {
            const originalSetAttribute = element.setAttribute;
            element.setAttribute = function(name, value) {
                if (name === 'src' && value && value.startsWith('/') && !value.startsWith('//')) {
                    // Externale CDN-Ressourcen überspringen
                    if (value.includes('cdn.') || value.includes('//')) {
                        return originalSetAttribute.call(this, name, value);
                    }
                    
                    // Relativen Pfad erzeugen (ohne führenden Slash)
                    const newValue = value.substring(1);
                    console.log(`[RelativePathHandler] Intercepted Script: ${value} -> ${newValue}`);
                    value = newValue;
                }
                return originalSetAttribute.call(this, name, value);
            };
        }
        
        return element;
    };
    
    // Korrigiere dynamische Imports
    function setupImportInterceptor() {
        if (window.System && window.System.import) {
            const originalImport = window.System.import;
            window.System.import = function(url) {
                if (url && url.startsWith('/') && !url.startsWith('//')) {
                    // Relativen Pfad erzeugen (ohne führenden Slash)
                    const newUrl = url.substring(1);
                    console.log(`[RelativePathHandler] Intercepted Import: ${url} -> ${newUrl}`);
                    url = newUrl;
                }
                return originalImport.call(this, url);
            };
        }
    }
    
    // Direkte Einfügung von Inline-CSS für kritische Elemente
    function injectCriticalCSS() {
        const style = document.createElement('style');
        style.textContent = `
            /* Kritisches CSS für DocConverter-Container */
            .doc-converter, 
            #doc-converter-container, 
            #doc-converter-app, 
            [data-tab="docConverter"],
            .doc-converter-view {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                min-height: 400px !important;
            }
            
            /* Bereinigung unerwünschter DocConverter-Instanzen außerhalb des Admin-Bereichs */
            body:not(.admin-page):not(.admin-docconverter-tab) #doc-converter-container,
            body:not(.admin-page):not(.admin-docconverter-tab) #doc-converter-app,
            body:not(.admin-page):not(.admin-docconverter-tab) .doc-converter,
            body:not(.admin-page):not(.admin-docconverter-tab) [data-tab="docConverter"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
            }
            
            /* Admin-Panel-Stil für den DocConverter-Tab */
            .admin-panel .admin-nav-item[data-tab="docConverter"].active,
            .admin-panel .admin-nav-item[data-tab="docConverter"]:active {
                background-color: rgba(59, 130, 246, 0.1) !important;
                color: #3b82f6 !important;
                border-left: 3px solid #3b82f6 !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Initialisierung
    function init() {
        console.log("[RelativePathHandler] Starte Optimierung der Ressourcenpfade...");
        processExistingElements();
        setupImportInterceptor();
        injectCriticalCSS();
    }
    
    // Sofort starten
    init();
    
    // Auch nach dem DOM-Laden ausführen
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    }
    
    // Wiederholte Überwachung für dynamisch hinzugefügte Elemente (mit maximal 30 Wiederholungen)
    let monitoringInterval = null;
    let monitoringCount = 0;
    const MAX_MONITORING_COUNT = 30;
    
    function startMonitoring() {
        if (monitoringInterval) return;
        
        monitoringInterval = setInterval(function() {
            monitoringCount++;
            processExistingElements();
            
            // Nach MAX_MONITORING_COUNT Wiederholungen stoppen
            if (monitoringCount >= MAX_MONITORING_COUNT) {
                console.log("[RelativePathHandler] Monitoring nach " + MAX_MONITORING_COUNT + " Durchläufen gestoppt");
                clearInterval(monitoringInterval);
                monitoringInterval = null;
            }
        }, 2000);
    }
    
    function stopMonitoring() {
        if (monitoringInterval) {
            clearInterval(monitoringInterval);
            monitoringInterval = null;
            console.log("[RelativePathHandler] Monitoring manuell gestoppt");
        }
    }
    
    // Starte das Monitoring
    startMonitoring();
    
    // API exportieren
    window.relativePathHandler = {
        processExistingElements,
        injectCriticalCSS,
        startMonitoring,
        stopMonitoring
    };
})();