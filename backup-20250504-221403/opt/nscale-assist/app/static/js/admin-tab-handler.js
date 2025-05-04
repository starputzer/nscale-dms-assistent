/**
 * Admin-Tab-Handler
 * Fügt den Dokumentenkonverter-Tab in die Admin-Navigation ein und sorgt für korrekte Anzeige
 */
(function() {
    console.log('[Admin-Tab-Handler] Initialisierung...');
    
    // Prüfe, ob wir uns in der Admin-Ansicht befinden
    function isAdminView() {
        return window.location.pathname.includes('/admin') || 
               document.querySelector('.admin-panel') !== null ||
               document.querySelector('.admin-view') !== null ||
               activeView?.value === 'admin';
    }
    
    // Hauptfunktion, die beim Laden der Seite ausgeführt wird
    function init() {
        if (!isAdminView()) {
            console.log('[Admin-Tab-Handler] Keine Admin-Ansicht erkannt, überspringe Initialisierung');
            return;
        }
        
        console.log('[Admin-Tab-Handler] Admin-Ansicht erkannt, initialisiere...');
        
        // Warte bis die Admin-UI vollständig geladen ist
        waitForElement('.admin-nav, .admin-sidebar, .admin-menu', function() {
            console.log('[Admin-Tab-Handler] Admin-Navigation gefunden, füge Tabs hinzu...');
            addDocConverterTab();
        });
    }
    
    // Wartehilfsfunktion
    function waitForElement(selector, callback, maxAttempts = 20, interval = 200) {
        let attempts = 0;
        
        const checkElement = function() {
            const element = document.querySelector(selector);
            
            if (element) {
                console.log(`[Admin-Tab-Handler] Element gefunden: ${selector}`);
                callback(element);
                return;
            }
            
            attempts++;
            
            if (attempts >= maxAttempts) {
                console.warn(`[Admin-Tab-Handler] Element nicht gefunden nach ${maxAttempts} Versuchen: ${selector}`);
                return;
            }
            
            setTimeout(checkElement, interval);
        };
        
        checkElement();
    }
    
    // Fügt den Dokumentenkonverter-Tab hinzu
    function addDocConverterTab() {
        // Prüfe, ob der Tab bereits existiert
        if (document.querySelector('.admin-nav-item[data-tab="docConverter"]')) {
            console.log('[Admin-Tab-Handler] DocConverter-Tab existiert bereits');
            return;
        }
        
        console.log('[Admin-Tab-Handler] Füge DocConverter-Tab hinzu...');
        
        // Finde die Admin-Navigation
        const adminNav = document.querySelector('.admin-nav, .admin-sidebar, .admin-menu');
        
        if (!adminNav) {
            console.warn('[Admin-Tab-Handler] Admin-Navigation nicht gefunden');
            return;
        }
        
        // Erstelle den Tab
        const docConverterTab = document.createElement('div');
        docConverterTab.className = 'admin-nav-item';
        docConverterTab.setAttribute('data-tab', 'docConverter');
        docConverterTab.innerHTML = `
            <i class="fas fa-file-alt"></i>
            <span>Dokumente konvertieren</span>
        `;
        
        // Füge den Tab zur Navigation hinzu
        adminNav.appendChild(docConverterTab);
        
        // Erstelle den Tab-Container, wenn er nicht existiert
        createTabContainer();
        
        // Event-Listener für den Tab-Klick hinzufügen
        docConverterTab.addEventListener('click', function() {
            activateTab('docConverter');
        });
        
        console.log('[Admin-Tab-Handler] DocConverter-Tab erfolgreich hinzugefügt');
    }
    
    // Erstellt den Tab-Container
    function createTabContainer() {
        // Prüfe, ob der Container bereits existiert
        if (document.querySelector('#doc-converter-container, .admin-tab-content[data-tab="docConverter"]')) {
            console.log('[Admin-Tab-Handler] DocConverter-Container existiert bereits');
            return;
        }
        
        console.log('[Admin-Tab-Handler] Erstelle DocConverter-Container...');
        
        // Finde den Content-Bereich
        const adminContent = document.querySelector('.admin-content, .admin-panel-content, .tab-content');
        
        if (!adminContent) {
            console.warn('[Admin-Tab-Handler] Admin-Content nicht gefunden');
            return;
        }
        
        // Erstelle den Container
        const container = document.createElement('div');
        container.id = 'doc-converter-container';
        container.className = 'admin-tab-content doc-converter';
        container.setAttribute('data-tab', 'docConverter');
        
        // Verstecke den Container standardmäßig
        container.style.display = 'none';
        
        // Setze minimalen Inhalt
        container.innerHTML = `
            <div class="p-4">
                <h2 class="text-xl font-semibold mb-4">Dokumentenkonverter</h2>
                <div class="bg-blue-50 p-4 rounded border-l-4 border-blue-500 mb-4">
                    <p class="text-blue-700">Dokumentenkonverter wird geladen...</p>
                </div>
                <div class="loading-spinner"></div>
            </div>
        `;
        
        // Füge den Container zum Content-Bereich hinzu
        adminContent.appendChild(container);
        
        console.log('[Admin-Tab-Handler] DocConverter-Container erfolgreich erstellt');
        
        // Lade die Initialisierungsdatei, wenn der Container erstellt wurde
        loadDocConverterScript();
    }
    
    // Aktiviert einen Tab
    function activateTab(tabName) {
        console.log(`[Admin-Tab-Handler] Aktiviere Tab: ${tabName}`);
        
        // Deaktiviere alle Tabs
        const allTabs = document.querySelectorAll('.admin-nav-item, .admin-tab');
        allTabs.forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Aktiviere den ausgewählten Tab
        const selectedTab = document.querySelector(`.admin-nav-item[data-tab="${tabName}"], .admin-tab[data-tab="${tabName}"]`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        // Verstecke alle Tab-Inhalte
        const allContents = document.querySelectorAll('.admin-tab-content, .tab-content > div');
        allContents.forEach(content => {
            content.style.display = 'none';
        });
        
        // Zeige den ausgewählten Tab-Inhalt
        const selectedContent = document.querySelector(`#doc-converter-container, .admin-tab-content[data-tab="${tabName}"], .tab-content > div[data-tab="${tabName}"]`);
        if (selectedContent) {
            selectedContent.style.display = 'block';
            
            // Initialisiere DocConverter, wenn der Tab aktiviert wird
            if (tabName === 'docConverter' && typeof window.initDocConverter === 'function') {
                window.initDocConverter();
            }
        }
        
        // Setze Klasse am body für CSS-Selektoren
        if (tabName === 'docConverter') {
            document.body.classList.add('admin-docconverter-tab');
        } else {
            document.body.classList.remove('admin-docconverter-tab');
        }
    }
    
    // Lädt das DocConverter-Initialisierungsskript
    function loadDocConverterScript() {
        console.log('[Admin-Tab-Handler] Lade DocConverter-Initialisierungsskript...');
        
        // Prüfe, ob das Skript bereits geladen wurde
        if (document.querySelector('script[src*="doc-converter-init.js"], script[src*="admin-doc-converter-fix.js"]')) {
            console.log('[Admin-Tab-Handler] DocConverter-Skript bereits geladen');
            return;
        }
        
        // Lade die benötigten Skripte
        const scripts = [
            '/static/js/doc-converter-init.js',
            '/static/js/admin-doc-converter-fix.js'
        ];
        
        scripts.forEach(scriptSrc => {
            const script = document.createElement('script');
            script.src = scriptSrc;
            script.onerror = function() {
                // Versuche alternative Pfade
                console.warn(`[Admin-Tab-Handler] Fehler beim Laden von ${scriptSrc}, versuche Alternativen...`);
                const altSrc = scriptSrc.replace('/static/', '/frontend/');
                
                if (!document.querySelector(`script[src="${altSrc}"]`)) {
                    const altScript = document.createElement('script');
                    altScript.src = altSrc;
                    document.head.appendChild(altScript);
                }
            };
            document.head.appendChild(script);
        });
        
        // Lade auch benötigte CSS-Dateien
        const styleSheets = [
            '/static/css/doc-converter-fix.css',
            '/static/css/doc-converter-position-fix.css'
        ];
        
        styleSheets.forEach(styleSrc => {
            if (!document.querySelector(`link[href="${styleSrc}"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = styleSrc;
                document.head.appendChild(link);
            }
        });
    }
    
    // Initialisiere den Tab-Handler beim Laden der Seite
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Initialisiere mit Verzögerung (für dynamische Inhalte)
    setTimeout(init, 1000);
    setTimeout(init, 3000); // Längere Verzögerung für langsam geladene Inhalte
    
    // Exportiere Funktionen für externe Nutzung
    window.adminTabHandler = {
        addDocConverterTab: addDocConverterTab,
        activateTab: activateTab,
        init: init
    };
})();