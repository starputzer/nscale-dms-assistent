/**
 * Path-Fixer
 * Löst Pfadprobleme durch dynamisches Testen und Korrektur von Ressourcenpfaden
 * Unterstützt nun auch Port 8080 und relative Pfade für maximale Kompatibilität
 */

(function() {
    console.log("[Path-Fixer] Initialisierung...");
    
    // Basis-URL und Port ermitteln
    function getBaseUrl() {
        // Aktuelle Hostnamen und Protokoll ermitteln
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        // Bei Port 8080 explizit den Port in die Basis-URL aufnehmen
        const baseUrl = `${protocol}//${hostname}${port ? ':' + port : ''}`;
        console.log(`[Path-Fixer] Basis-URL erkannt: ${baseUrl}`);
        return baseUrl;
    }
    
    // Alle möglichen Pfad-Strategien - Mischung aus absoluten, relativen und vollqualifizierten URLs
    // Vollständig relative Pfade (ohne führenden Slash) haben Priorität
    const pathPrefixes = [
        // Relative Pfade (ohne führenden Slash) - funktionieren unabhängig vom Port
        'static/',
        'frontend/static/',
        'api/static/',
        'frontend/',
        'api/',
        'css/',
        'js/',
        '',
        
        // Absolute Pfade (mit Port-Berücksichtigung)
        `${getBaseUrl()}/static/`,
        `${getBaseUrl()}/frontend/`,
        `${getBaseUrl()}/api/static/`,
        `${getBaseUrl()}/css/`,
        `${getBaseUrl()}/js/`,
        `${getBaseUrl()}/`,
        
        // Traditionelle absolute Pfade (Fallback)
        '/static/',
        '/frontend/',
        '/api/static/',
        '/css/',
        '/js/',
        '/'
    ];
    
    // Schlüsseldateien, die geladen werden müssen
    const criticalResources = {
        css: [
            'vue-template-fix.css',
            'height-fix.css',
            'chat-overflow-fix.css',
            'doc-converter-fix.css',
            'doc-converter-position-fix.css',
            'doc-converter-visibility-fix.css',
            'feedback-icons-fix.css',
            'feedback.css'
        ],
        js: [
            'vue-template-fix.js',
            'enhanced-logging.js',
            'vue-fix.js',
            'viewport-height-fix.js',
            'vue-script-loader-fix.js',
            'force-enable-vue.js',
            'force-doc-converter-cleanup.js',
            'doc-converter-visibility-fix.js',
            'doc-converter-tab-init.js',
            'doc-converter-debug.js',
            'admin-tab-handler.js',
            'admin-doc-converter-fix.js',
            'features-ui-fix.js',
            'doc-converter-tab-fix.js'
        ]
    };
    
    // CSS-Ressourcen testen und laden
    function testAndLoadCSS() {
        console.log("[Path-Fixer] Teste und lade CSS-Ressourcen...");
        
        criticalResources.css.forEach(resource => {
            // Teste alle möglichen Pfadkombinationen
            testResource('css', resource, function(workingPath) {
                if (workingPath) {
                    console.log(`[Path-Fixer] CSS gefunden: ${workingPath}`);
                    // Lade CSS, wenn es noch nicht geladen ist
                    if (!document.querySelector(`link[href="${workingPath}"]`)) {
                        const link = document.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = workingPath;
                        document.head.appendChild(link);
                        console.log(`[Path-Fixer] CSS geladen: ${workingPath}`);
                    }
                } else {
                    console.warn(`[Path-Fixer] Konnte CSS nicht finden: ${resource}`);
                    
                    // Versuche, die CSS-Datei inline zu erstellen, wenn es sich um kritische CSS handelt
                    if (resource === 'vue-template-fix.css') {
                        const style = document.createElement('style');
                        style.textContent = '/* Automatisch generiert */ .vue-template-container { display: none !important; }';
                        document.head.appendChild(style);
                        console.log("[Path-Fixer] vue-template-fix.css inline erstellt");
                    }
                    
                    if (resource === 'chat-overflow-fix.css') {
                        const style = document.createElement('style');
                        style.textContent = '/* Automatisch generiert */ .chat-container { height: 100%; overflow-y: auto; padding-bottom: 120px; } .message-container { max-height: calc(100vh - 180px); overflow-y: auto !important; }';
                        document.head.appendChild(style);
                        console.log("[Path-Fixer] chat-overflow-fix.css inline erstellt");
                    }
                }
            });
        });
    }
    
    // JS-Ressourcen testen und laden
    function testAndLoadJS() {
        console.log("[Path-Fixer] Teste und lade JS-Ressourcen...");
        
        criticalResources.js.forEach(resource => {
            // Teste alle möglichen Pfadkombinationen
            testResource('js', resource, function(workingPath) {
                if (workingPath) {
                    console.log(`[Path-Fixer] JS gefunden: ${workingPath}`);
                    // Lade JS, wenn es noch nicht geladen ist
                    if (!document.querySelector(`script[src="${workingPath}"]`)) {
                        const script = document.createElement('script');
                        script.src = workingPath;
                        document.head.appendChild(script);
                        console.log(`[Path-Fixer] JS geladen: ${workingPath}`);
                    }
                } else {
                    console.warn(`[Path-Fixer] Konnte JS nicht finden: ${resource}`);
                    
                    // Nur für kritische Skripte
                    if (resource === 'force-doc-converter-cleanup.js') {
                        // Inline-Version des Skripts hinzufügen
                        const script = document.createElement('script');
                        script.textContent = `
                            (function() {
                                console.log("[Inline Doc-Converter-Cleanup] Entferne unerwünschte Instanzen");
                                
                                function cleanup() {
                                    const containers = document.querySelectorAll('#doc-converter-app:not(.admin-panel *)');
                                    containers.forEach(container => {
                                        container.style.display = 'none';
                                        container.style.visibility = 'hidden';
                                        container.style.opacity = '0';
                                        container.style.height = '0';
                                        
                                        if (container.parentElement) {
                                            try {
                                                container.parentElement.removeChild(container);
                                            } catch(e) {}
                                        }
                                    });
                                }
                                
                                cleanup();
                                setInterval(cleanup, 2000);
                            })();
                        `;
                        document.head.appendChild(script);
                        console.log("[Path-Fixer] force-doc-converter-cleanup.js inline erstellt");
                    }
                }
            });
        });
    }
    
    // Teste eine Ressource mit allen möglichen Pfad-Präfixen
    function testResource(type, resource, callback) {
        let found = false;
        let attempts = 0;
        let maxAttempts = pathPrefixes.length;
        
        pathPrefixes.forEach(prefix => {
            const path = `${prefix}${type}/${resource}`;
            
            // Prüfe, ob die Ressource bereits geladen ist
            if (type === 'css' && document.querySelector(`link[href="${path}"]`)) {
                found = true;
                callback(path);
                return;
            }
            
            if (type === 'js' && document.querySelector(`script[src="${path}"]`)) {
                found = true;
                callback(path);
                return;
            }
            
            // Teste, ob die Ressource existiert
            const xhr = new XMLHttpRequest();
            xhr.onload = function() {
                if (xhr.status === 200 && !found) {
                    found = true;
                    callback(path);
                }
            };
            
            xhr.onerror = function() {
                attempts++;
                
                if (attempts === maxAttempts && !found) {
                    callback(null);
                }
            };
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    attempts++;
                    
                    if (attempts === maxAttempts && !found) {
                        callback(null);
                    }
                }
            };
            
            xhr.open('HEAD', path, true);
            xhr.send();
        });
    }
    
    // Funktion zur Bereinigung unerwünschter Dokumentenkonverter
    function cleanupDocConverter() {
        const containers = document.querySelectorAll('#doc-converter-app:not(.admin-panel *), #doc-converter-container:not(.admin-panel *), .doc-converter:not(.admin-panel *)');
        
        containers.forEach(container => {
            container.style.display = 'none';
            container.style.visibility = 'hidden';
            container.style.opacity = '0';
            container.style.height = '0';
            
            // Container deaktivieren oder entfernen
            if (container.parentElement) {
                try {
                    container.parentElement.removeChild(container);
                    console.log("[Path-Fixer] Unerwünschten DocConverter-Container entfernt");
                } catch(e) {
                    console.error("[Path-Fixer] Fehler beim Entfernen des Containers:", e);
                }
            }
        });
    }
    
    // Initialisierung
    function init() {
        console.log("[Path-Fixer] Starte Tests...");
        testAndLoadCSS();
        testAndLoadJS();
        
        // Entferne unerwünschte Dokumentenkonverter
        cleanupDocConverter();
        
        // Monitoringvariablen
        let monitoringInterval = null;
        let monitoringCount = 0;
        const MAX_MONITORING_COUNT = 30;
        
        // Monitoring-Funktionen
        function startMonitoring() {
            if (monitoringInterval) return;
            
            monitoringInterval = setInterval(function() {
                monitoringCount++;
                cleanupDocConverter();
                
                // Nach MAX_MONITORING_COUNT Wiederholungen stoppen
                if (monitoringCount >= MAX_MONITORING_COUNT) {
                    console.log("[Path-Fixer] Monitoring nach " + MAX_MONITORING_COUNT + " Durchläufen gestoppt");
                    clearInterval(monitoringInterval);
                    monitoringInterval = null;
                }
            }, 2000);
        }
        
        function stopMonitoring() {
            if (monitoringInterval) {
                clearInterval(monitoringInterval);
                monitoringInterval = null;
                console.log("[Path-Fixer] Monitoring manuell gestoppt");
            }
        }
        
        // Regelmäßige Überprüfung starten
        startMonitoring();
    }
    
    // Starte sofort
    init();
    
    // Erneut nach dem vollständigen Laden der Seite
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    }
    
    // Nochmals nach einer kurze Verzögerung (nur einmalig)
    setTimeout(init, 1000);
    
    // Mache Funktionen global verfügbar
    window.pathFixer = {
        testAndLoadCSS,
        testAndLoadJS,
        cleanupDocConverter,
        startMonitoring: function() {
            if (typeof startMonitoring === "function") {
                startMonitoring();
            }
        },
        stopMonitoring: function() {
            if (typeof stopMonitoring === "function") {
                stopMonitoring();
            }
        }
    };
})();