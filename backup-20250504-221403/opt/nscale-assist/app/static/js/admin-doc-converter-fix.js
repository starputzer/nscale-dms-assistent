/**
 * Admin-DocConverter-Fix
 * Stellt sicher, dass der Dokumentenkonverter im Admin-Bereich korrekt geladen wird
 */
(function() {
    console.log('[Admin-DocConverter-Fix] Script wird initialisiert...');
    
    // Prüfen, ob wir uns im Admin-Bereich befinden
    function isAdminArea() {
        return window.location.pathname.includes('/admin') || 
               document.querySelector('.admin-panel') !== null ||
               document.querySelector('.admin-page') !== null ||
               document.querySelector('.admin-nav-item') !== null ||
               document.body.classList.contains('admin-page');
    }
    
    // Tab aktivieren, wenn wir uns im Admin-Bereich befinden
    function setupAdminTab() {
        if (!isAdminArea()) {
            console.log('[Admin-DocConverter-Fix] Kein Admin-Bereich erkannt, überspringe Initialisierung');
            return;
        }
        
        console.log('[Admin-DocConverter-Fix] Admin-Bereich erkannt, initialisiere DocConverter-Tab');
        document.body.classList.add('admin-page');
        
        // Zuerst die CSS-Dateien laden
        loadCssIfNotExists('/static/css/doc-converter-fix.css');
        loadCssIfNotExists('/static/css/doc-converter-visibility-fix.css');
        
        // DocConverter-Tab finden oder erstellen
        findOrCreateDocConverterTab();
        
        // Script zur Initialisierung des DocConverters laden
        loadScriptIfNotExists('/static/js/doc-converter-init.js', function() {
            console.log('[Admin-DocConverter-Fix] Initialisierungsscript geladen, starte DocConverter...');
            // Prüfen, ob die globale Funktion verfügbar ist
            if (typeof window.initDocConverter === 'function') {
                window.initDocConverter();
            }
        });
        
        // Event-Listener für Tab-Wechsel hinzufügen
        setupTabEventListeners();
    }
    
    // CSS laden, wenn es nicht existiert
    function loadCssIfNotExists(url) {
        if (!document.querySelector(`link[href="${url}"]`)) {
            console.log(`[Admin-DocConverter-Fix] Lade CSS: ${url}`);
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            document.head.appendChild(link);
        }
    }
    
    // Script laden, wenn es nicht existiert
    function loadScriptIfNotExists(url, callback) {
        if (!document.querySelector(`script[src="${url}"]`)) {
            console.log(`[Admin-DocConverter-Fix] Lade Script: ${url}`);
            const script = document.createElement('script');
            script.src = url;
            script.onload = callback;
            script.onerror = function() {
                console.error(`[Admin-DocConverter-Fix] Fehler beim Laden von ${url}`);
                // Versuche Alternative
                const altUrl = url.replace('/static/', '/frontend/');
                if (!document.querySelector(`script[src="${altUrl}"]`)) {
                    console.log(`[Admin-DocConverter-Fix] Versuche Alternative: ${altUrl}`);
                    const altScript = document.createElement('script');
                    altScript.src = altUrl;
                    altScript.onload = callback;
                    document.head.appendChild(altScript);
                }
            };
            document.head.appendChild(script);
        } else {
            // Script existiert bereits, rufe Callback auf
            callback();
        }
    }
    
    // Tab finden oder erstellen
    function findOrCreateDocConverterTab() {
        console.log('[Admin-DocConverter-Fix] Suche nach DocConverter-Tab...');
        
        // Auf verschiedene Weise nach Tab suchen
        const tabSelectors = [
            '.admin-nav-item[data-tab="docConverter"]',
            '.admin-tab[data-tab="docConverter"]',
            '.tab-item[data-tab="docConverter"]',
            '.admin-nav-item:contains("Dokumente konvertieren")'
        ];
        
        let tabFound = false;
        for (const selector of tabSelectors) {
            const tab = document.querySelector(selector);
            if (tab) {
                console.log(`[Admin-DocConverter-Fix] Tab gefunden mit Selektor: ${selector}`);
                tabFound = true;
                
                // Tab-Container auch finden oder erstellen
                findOrCreateTabContainer();
                
                // Tab aktivieren
                setupTabActivation(tab);
                break;
            }
        }
        
        if (!tabFound) {
            console.log('[Admin-DocConverter-Fix] Tab nicht gefunden, erstelle neu...');
            createDocConverterTab();
        }
    }
    
    // Tab-Container finden oder erstellen
    function findOrCreateTabContainer() {
        console.log('[Admin-DocConverter-Fix] Suche nach Tab-Container...');
        
        // Auf verschiedene Weise nach Container suchen
        const containerSelectors = [
            '#doc-converter-container',
            '#doc-converter-app',
            '.doc-converter',
            '[data-tab="docConverter"]',
            '.admin-tab-content[data-tab="docConverter"]'
        ];
        
        let containerFound = false;
        for (const selector of containerSelectors) {
            const container = document.querySelector(selector);
            if (container) {
                console.log(`[Admin-DocConverter-Fix] Container gefunden mit Selektor: ${selector}`);
                containerFound = true;
                
                // Sichtbarkeit sicherstellen
                container.style.display = 'block';
                container.style.visibility = 'visible';
                container.style.opacity = '1';
                container.classList.add('doc-converter-force-visible');
                break;
            }
        }
        
        if (!containerFound) {
            console.log('[Admin-DocConverter-Fix] Container nicht gefunden, erstelle neu...');
            createDocConverterContainer();
        }
    }
    
    // DocConverter-Tab erstellen
    function createDocConverterTab() {
        console.log('[Admin-DocConverter-Fix] Erstelle DocConverter-Tab...');
        
        // Finde die Admin-Navigation
        const navSelectors = [
            '.admin-nav',
            '.admin-sidebar',
            '.admin-menu',
            '.sidebar-menu',
            '.admin-panel-nav'
        ];
        
        let navFound = false;
        for (const selector of navSelectors) {
            const nav = document.querySelector(selector);
            if (nav) {
                console.log(`[Admin-DocConverter-Fix] Admin-Navigation gefunden mit Selektor: ${selector}`);
                
                // Tab erstellen
                const tab = document.createElement('div');
                tab.className = 'admin-nav-item';
                tab.setAttribute('data-tab', 'docConverter');
                tab.innerHTML = '<i class="fas fa-file-alt"></i> Dokumente konvertieren';
                
                // Tab einfügen
                nav.appendChild(tab);
                
                // Tab-Container erstellen
                createDocConverterContainer();
                
                // Tab aktivieren
                setupTabActivation(tab);
                
                navFound = true;
                break;
            }
        }
        
        if (!navFound) {
            console.warn('[Admin-DocConverter-Fix] Keine Admin-Navigation gefunden, kann Tab nicht erstellen');
        }
    }
    
    // DocConverter-Container erstellen
    function createDocConverterContainer() {
        console.log('[Admin-DocConverter-Fix] Erstelle DocConverter-Container...');
        
        // Finde den Content-Bereich
        const contentSelectors = [
            '.admin-content',
            '.admin-panel-content',
            '.content-container',
            '.tab-content',
            '.admin-tab-content',
            '.admin-panel'
        ];
        
        let contentFound = false;
        for (const selector of contentSelectors) {
            const content = document.querySelector(selector);
            if (content) {
                console.log(`[Admin-DocConverter-Fix] Content-Bereich gefunden mit Selektor: ${selector}`);
                
                // Container erstellen
                const container = document.createElement('div');
                container.id = 'doc-converter-container';
                container.className = 'doc-converter admin-tab-content';
                container.setAttribute('data-tab', 'docConverter');
                container.style.display = 'none'; // Standardmäßig versteckt
                
                // Minimum-Inhalt setzen
                container.innerHTML = `
                    <div class="doc-converter-loading">
                        <p>Dokumentenkonverter wird geladen...</p>
                        <div class="loading-indicator"></div>
                    </div>
                `;
                
                // Container einfügen
                content.appendChild(container);
                
                contentFound = true;
                break;
            }
        }
        
        if (!contentFound) {
            console.warn('[Admin-DocConverter-Fix] Keinen Content-Bereich gefunden, kann Container nicht erstellen');
        }
    }
    
    // Tab-Aktivierung einrichten
    function setupTabActivation(tab) {
        console.log('[Admin-DocConverter-Fix] Richte Tab-Aktivierung ein...');
        
        // Event-Listener für Klick hinzufügen
        tab.addEventListener('click', function() {
            // Klick auf Tab markiert Document
            document.body.classList.add('admin-docconverter-tab');
            
            // Andere Tabs deaktivieren
            const allTabs = document.querySelectorAll('.admin-nav-item, .admin-tab, .tab-item');
            allTabs.forEach(function(t) {
                t.classList.remove('active');
            });
            
            // Tab aktivieren
            tab.classList.add('active');
            
            // Tab-Inhalte verstecken
            const allContents = document.querySelectorAll('.admin-tab-content, .tab-content > div');
            allContents.forEach(function(content) {
                content.style.display = 'none';
            });
            
            // DocConverter-Container anzeigen
            const containerSelectors = [
                '#doc-converter-container',
                '#doc-converter-app',
                '.doc-converter',
                '[data-tab="docConverter"]',
                '.admin-tab-content[data-tab="docConverter"]'
            ];
            
            for (const selector of containerSelectors) {
                const container = document.querySelector(selector);
                if (container) {
                    container.style.display = 'block';
                    container.style.visibility = 'visible';
                    container.style.opacity = '1';
                    container.classList.add('doc-converter-force-visible');
                    
                    // Initialisiere DocConverter, falls erforderlich
                    if (typeof window.initDocConverter === 'function') {
                        console.log('[Admin-DocConverter-Fix] Initialisiere DocConverter nach Tab-Aktivierung');
                        window.initDocConverter();
                    }
                    
                    break;
                }
            }
        });
    }
    
    // Event-Listener für Tab-Wechsel
    function setupTabEventListeners() {
        console.log('[Admin-DocConverter-Fix] Richte Event-Listener für Tab-Wechsel ein...');
        
        // Für alle Tab-Elemente
        const allTabSelectors = [
            '.admin-nav-item',
            '.admin-tab',
            '.tab-item'
        ];
        
        for (const selector of allTabSelectors) {
            const tabs = document.querySelectorAll(selector);
            tabs.forEach(function(tab) {
                tab.addEventListener('click', function() {
                    const isDocConverterTab = tab.getAttribute('data-tab') === 'docConverter' || 
                                              tab.textContent.includes('Dokumente konvertieren');
                    
                    if (isDocConverterTab) {
                        console.log('[Admin-DocConverter-Fix] DocConverter-Tab wurde aktiviert');
                        document.body.classList.add('admin-docconverter-tab');
                    } else {
                        console.log('[Admin-DocConverter-Fix] Anderer Tab wurde aktiviert');
                        document.body.classList.remove('admin-docconverter-tab');
                    }
                });
            });
        }
    }
    
    // Initialisierung nach DOM-Laden
    function init() {
        console.log('[Admin-DocConverter-Fix] Initialisierung gestartet');
        setupAdminTab();
    }
    
    // Bei geladener Seite initialisieren
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Nach kurzer Verzögerung erneut initialisieren (für dynamisch geladene Inhalte)
    setTimeout(init, 1000);
    setTimeout(init, 2000);
})();