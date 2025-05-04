/**
 * DocConverter Tab Initialisierung
 * Erweiterte, robuste Version zum Initialisieren des DocConverter-Tabs im Admin-Bereich
 */

(function() {
    console.log('[DocConverter-Tab-Init] Script wird geladen...');
    
    // Interval zum Überprüfen des Dokument-Status
    let setupInterval;
    
    // Tab Aufbau sofort starten, wenn DOM bereit ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupDocConverterTab);
    } else {
        setupDocConverterTab();
    }
    
    // Hauptfunktion zum Einrichten des DocConverter-Tabs
    function setupDocConverterTab() {
        console.log('[DocConverter-Tab-Init] Initialisierung gestartet');
        
        // Überprüfen, ob wir uns im Admin-Bereich befinden
        if (!isAdminArea()) {
            console.log('[DocConverter-Tab-Init] Kein Admin-Bereich erkannt, Initialisierung übersprungen');
            return;
        }
        
        console.log('[DocConverter-Tab-Init] Admin-Bereich erkannt, suche nach Tab-Navigation');
        
        // 1. Tab in der Navigation finden oder erstellen
        const adminNavigation = findAdminNavigation();
        if (adminNavigation) {
            console.log('[DocConverter-Tab-Init] Admin-Navigation gefunden, suche nach DocConverter-Tab');
            let tabElement = findDocConverterTabElement();
            
            if (!tabElement) {
                console.log('[DocConverter-Tab-Init] Tab nicht gefunden, erstelle neu');
                tabElement = createDocConverterTabElement(adminNavigation);
            } else {
                console.log('[DocConverter-Tab-Init] Vorhandenen Tab gefunden:', tabElement);
            }
            
            // Tab-Aktivierungsfunktion hinzufügen
            setupTabActivation(tabElement);
        } else {
            console.warn('[DocConverter-Tab-Init] Keine Admin-Navigation gefunden');
        }
        
        // 2. Container für den Tab-Inhalt finden oder erstellen
        let tabContainer = findDocConverterContainer();
        if (!tabContainer) {
            console.log('[DocConverter-Tab-Init] Container nicht gefunden, erstelle neu');
            tabContainer = createDocConverterContainer();
        } else {
            console.log('[DocConverter-Tab-Init] Vorhandenen Container gefunden:', tabContainer);
            tabContainer.style.display = 'block';
            tabContainer.style.visibility = 'visible';
            tabContainer.style.opacity = '1';
        }
        
        // 3. Fallback-UI anzeigen
        if (tabContainer) {
            showLoadingUI(tabContainer);
            
            // 4. DocConverter-Initialisierung versuchen
            loadDocConverterImplementation(tabContainer);
        }
        
        // 5. Event-Listener für Tab-Wechsel einrichten
        setupDocConverterEventListeners();
        
        // 6. Intervall einrichten, um zu überprüfen, ob das Element erhalten bleibt
        if (setupInterval) clearInterval(setupInterval);
        setupInterval = setInterval(ensureTabSetup, 2000);
    }
    
    // Überprüft, ob wir uns im Admin-Bereich befinden
    function isAdminArea() {
        return window.location.pathname.includes('/admin') || 
               document.querySelector('.admin-panel') || 
               document.querySelector('.admin-page') || 
               document.querySelector('.admin-nav-item') || 
               document.body.classList.contains('admin-page');
    }
    
    // Findet die Admin-Navigation
    function findAdminNavigation() {
        const navigationSelectors = [
            '.admin-nav',
            '.admin-sidebar',
            '.admin-tabs',
            '.admin-menu',
            '.sidebar-menu',
            '.admin-panel-nav'
        ];
        
        for (const selector of navigationSelectors) {
            const navElement = document.querySelector(selector);
            if (navElement) {
                return navElement;
            }
        }
        
        return null;
    }
    
    // Findet den DocConverter-Tab in der Navigation
    function findDocConverterTabElement() {
        const tabSelectors = [
            '.admin-nav-item[data-tab="docConverter"]',
            '.nav-item[data-tab="docConverter"]', 
            '.tab-item[data-tab="docConverter"]',
            '.admin-nav-item:contains("Dokumente konvertieren")',
            'button:contains("Dokumente konvertieren")',
            'a:contains("Dokumente konvertieren")'
        ];
        
        for (const selector of tabSelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                if (elements && elements.length > 0) {
                    return elements[0];
                }
            } catch(e) {
                // Einige Browser unterstützen ":contains" nicht, diesen Fehler ignorieren
            }
        }
        
        // Überprüfen aller Elemente, die Dokumente konvertieren enthalten könnten
        const allItems = document.querySelectorAll('.admin-nav-item, .nav-item, .tab-item, .admin-sidebar button, .admin-nav button');
        for (const item of allItems) {
            if (item.textContent && item.textContent.includes('Dokumente konvertieren')) {
                return item;
            }
        }
        
        return null;
    }
    
    // Erstellt ein neues Tab-Element in der Admin-Navigation
    function createDocConverterTabElement(navigation) {
        const newTab = document.createElement('button');
        newTab.className = 'admin-nav-item';
        newTab.setAttribute('data-tab', 'docConverter');
        newTab.innerHTML = '<i class="fas fa-file-import"></i> <span>Dokumente konvertieren</span>';
        
        navigation.appendChild(newTab);
        return newTab;
    }
    
    // Findet den Container für den DocConverter-Tab-Inhalt
    function findDocConverterContainer() {
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
                return container;
            }
        }
        
        return null;
    }
    
    // Erstellt einen neuen Container für den DocConverter-Tab-Inhalt
    function createDocConverterContainer() {
        // Finden des Content-Bereichs
        const contentSelectors = [
            '.admin-content',
            '.admin-panel-content',
            '.content-container',
            '.tab-content',
            '.admin-tab-content',
            '.admin-panel',
            'main'
        ];
        
        let contentArea = null;
        for (const selector of contentSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                contentArea = element;
                break;
            }
        }
        
        if (!contentArea) {
            console.error('[DocConverter-Tab-Init] Keinen Content-Bereich gefunden');
            return null;
        }
        
        // Container erstellen
        const container = document.createElement('div');
        container.id = 'doc-converter-container';
        container.className = 'doc-converter admin-tab-content';
        container.setAttribute('data-tab', 'docConverter');
        // Styling direkt anwenden
        container.style.cssText = `
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            min-height: 400px;
            width: 100%;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin: 20px 0;
        `;
        
        contentArea.appendChild(container);
        return container;
    }
    
    // Zeigt eine Lade-UI im Container an
    function showLoadingUI(container) {
        container.innerHTML = `
            <div class="doc-converter-loading" style="text-align: center; padding: 40px 20px;">
                <h2 style="font-size: 1.5rem; margin-bottom: 1.5rem;">Dokumentenkonverter wird geladen...</h2>
                <div class="loading-spinner" style="
                    border: 5px solid #f3f3f3;
                    border-top: 5px solid #3498db;
                    border-radius: 50%;
                    width: 50px;
                    height: 50px;
                    animation: spin 2s linear infinite;
                    margin: 0 auto 30px auto;
                "></div>
                <p style="color: #666; margin-bottom: 1rem;">Falls der Ladevorgang zu lange dauert, wird die Fallback-Version automatisch aktiviert.</p>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;
    }
    
    // Event-Listener für Tab-Aktivierung einrichten
    function setupTabActivation(tabElement) {
        if (!tabElement) return;
        
        tabElement.addEventListener('click', function() {
            console.log('[DocConverter-Tab-Init] Tab wurde angeklickt');
            
            // Klick auf Tab markiert Document
            document.body.classList.add('admin-docconverter-tab');
            
            // Andere Tabs deaktivieren
            const allTabs = document.querySelectorAll('.admin-nav-item, .admin-tab, .tab-item, .admin-sidebar button');
            allTabs.forEach(function(t) {
                t.classList.remove('active');
            });
            
            // Tab aktivieren
            tabElement.classList.add('active');
            
            // Alle anderen Container ausblenden
            const allContainers = document.querySelectorAll('.admin-tab-content, .tab-content > div');
            allContainers.forEach(function(content) {
                if (!content.id.includes('doc-converter') && !content.classList.contains('doc-converter')) {
                    content.style.display = 'none';
                }
            });
            
            // DocConverter-Container einblenden
            const container = findDocConverterContainer();
            if (container) {
                container.style.display = 'block';
                container.style.visibility = 'visible';
                container.style.opacity = '1';
                
                // DocConverter-Implementierung laden, falls noch nicht geschehen
                loadDocConverterImplementation(container);
            }
        });
    }
    
    // Laden der DocConverter-Implementierung (Vue oder Fallback)
    function loadDocConverterImplementation(container) {
        // Zuerst versuchen wir, die vorhandene Initialisierung auszuführen
        if (typeof window.initDocConverter === 'function') {
            console.log('[DocConverter-Tab-Init] initDocConverter-Funktion gefunden, ausführen');
            try {
                window.initDocConverter();
                return;
            } catch(e) {
                console.error('[DocConverter-Tab-Init] Fehler bei Ausführung von initDocConverter:', e);
            }
        }
        
        console.log('[DocConverter-Tab-Init] Versuche, DocConverter-Implementierung zu laden');
        
        // Timeout für Fallback-Implementierung
        const fallbackTimeout = setTimeout(function() {
            console.log('[DocConverter-Tab-Init] Timeout erreicht, lade direkte Fix-Implementierung');
            loadDirectFixImplementation(container);
        }, 5000);
        
        // Versuche zunächst, die standard-doc-converter-init.js zu laden
        const scriptUrls = [
            '/static/js/doc-converter-init.js',
            '/frontend/js/doc-converter-init.js',
            '/api/static/js/doc-converter-init.js'
        ];
        
        let scriptLoaded = false;
        for (const url of scriptUrls) {
            if (document.querySelector(`script[src="${url}"]`)) {
                scriptLoaded = true;
                break;
            }
        }
        
        if (!scriptLoaded) {
            const script = document.createElement('script');
            script.src = scriptUrls[0]; // Erste URL verwenden
            script.onload = function() {
                console.log('[DocConverter-Tab-Init] doc-converter-init.js geladen');
                clearTimeout(fallbackTimeout);
                if (typeof window.initDocConverter === 'function') {
                    window.initDocConverter();
                }
            };
            script.onerror = function() {
                console.warn('[DocConverter-Tab-Init] Fehler beim Laden von standard init, versuche nächste URL');
                const nextScript = document.createElement('script');
                nextScript.src = scriptUrls[1]; // Zweite URL verwenden
                nextScript.onload = function() {
                    console.log('[DocConverter-Tab-Init] Alternative doc-converter-init.js geladen');
                    clearTimeout(fallbackTimeout);
                    if (typeof window.initDocConverter === 'function') {
                        window.initDocConverter();
                    }
                };
                nextScript.onerror = function() {
                    console.warn('[DocConverter-Tab-Init] Auch alternative URL fehlgeschlagen, versuche letzte URL');
                    const lastScript = document.createElement('script');
                    lastScript.src = scriptUrls[2]; // Dritte URL verwenden
                    lastScript.onload = function() {
                        console.log('[DocConverter-Tab-Init] Letzte doc-converter-init.js geladen');
                        clearTimeout(fallbackTimeout);
                        if (typeof window.initDocConverter === 'function') {
                            window.initDocConverter();
                        }
                    };
                    lastScript.onerror = function() {
                        console.error('[DocConverter-Tab-Init] Alle URLs fehlgeschlagen');
                        // Fallback wird durch Timeout ausgelöst
                    };
                    document.head.appendChild(lastScript);
                };
                document.head.appendChild(nextScript);
            };
            document.head.appendChild(script);
        } else {
            console.log('[DocConverter-Tab-Init] init.js bereits geladen, versuche initDocConverter-Funktion aufzurufen');
            setTimeout(function() {
                if (typeof window.initDocConverter === 'function') {
                    clearTimeout(fallbackTimeout);
                    window.initDocConverter();
                }
            }, 500);
        }
    }
    
    // Direkte Fix-Implementierung laden
    function loadDirectFixImplementation(container) {
        console.log('[DocConverter-Tab-Init] Lade direkte Implementierung');
        
        // Versuchen das doc-converter-direct-fix.js zu laden
        const directFixScript = document.createElement('script');
        directFixScript.src = '/static/js/doc-converter-direct-fix.js';
        directFixScript.onerror = function() {
            console.warn('[DocConverter-Tab-Init] Konnte direct-fix.js nicht laden, versuche frontend-Pfad');
            const altScript = document.createElement('script');
            altScript.src = '/frontend/js/doc-converter-direct-fix.js';
            altScript.onerror = function() {
                console.error('[DocConverter-Tab-Init] Konnte keine direkte Fix-Implementierung laden, zeige minimale UI');
                showMinimalUI(container);
            };
            document.head.appendChild(altScript);
        };
        document.head.appendChild(directFixScript);
    }
    
    // Zeigt eine minimale UI für den Dokumentenkonverter an
    function showMinimalUI(container) {
        container.innerHTML = `
            <div class="doc-converter-minimal" style="padding: 20px;">
                <h2 style="font-size: 1.5rem; margin-bottom: 1.5rem;">Dokumenten-Konverter (Minimal-Version)</h2>
                
                <div style="padding: 1rem; margin-bottom: 1.5rem; background-color: #fff8e6; border-left: 4px solid #f59e0b;">
                    <p style="margin-bottom: 0;">Die minimale Notfall-Version des Dokumentenkonverters wurde aktiviert.</p>
                </div>
                
                <form action="/api/admin/upload/document" method="post" enctype="multipart/form-data">
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Datei auswählen</label>
                        <input type="file" name="file" style="border: 1px solid #e5e7eb; padding: 0.75rem; width: 100%; border-radius: 0.25rem;" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.html,.txt">
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: flex; align-items: center;">
                            <input type="checkbox" name="post_processing" checked style="margin-right: 0.5rem;">
                            <span>Nachbearbeitung aktivieren</span>
                        </label>
                    </div>
                    
                    <button type="submit" style="background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 500;">
                        Dokument konvertieren
                    </button>
                </form>
            </div>
        `;
    }
    
    // Event-Listener für DocConverter einrichten
    function setupDocConverterEventListeners() {
        // Listen für Klicks auf alle möglichen Tab-Elemente
        document.addEventListener('click', function(event) {
            // Überprüfen, ob wir auf ein Element geklickt haben, das den DocConverter-Tab aktivieren könnte
            let target = event.target;
            
            // Steige hoch bis zum klickbaren Element (Button oder A)
            while (target && !(target.tagName === 'BUTTON' || target.tagName === 'A')) {
                target = target.parentElement;
            }
            
            if (!target) return;
            
            const isDocConverterTab = 
                (target.getAttribute('data-tab') === 'docConverter') || 
                (target.textContent && target.textContent.includes('Dokumente konvertieren'));
            
            if (isDocConverterTab) {
                console.log('[DocConverter-Tab-Init] DocConverter-Tab wurde über Event-Listener aktiviert');
                document.body.classList.add('admin-docconverter-tab');
                
                // Stelle sicher, dass der Container sichtbar ist
                const container = findDocConverterContainer();
                if (container) {
                    container.style.display = 'block';
                    container.style.visibility = 'visible';
                    container.style.opacity = '1';
                    
                    // DocConverter-Implementierung laden
                    loadDocConverterImplementation(container);
                }
            }
        });
    }
    
    // Stelle sicher, dass der DocConverter-Tab-Setup erhalten bleibt
    function ensureTabSetup() {
        if (!isAdminArea()) return;
        
        const tabElement = findDocConverterTabElement();
        const container = findDocConverterContainer();
        
        // Wenn wir den Tab haben, aber keinen Container, erstelle den Container
        if (tabElement && !container) {
            console.log('[DocConverter-Tab-Init] Tab gefunden, aber Container fehlt - erstelle Container');
            createDocConverterContainer();
        }
        
        // Wenn wir den Container haben, aber keinen Tab, erstelle den Tab
        if (!tabElement && container) {
            console.log('[DocConverter-Tab-Init] Container gefunden, aber Tab fehlt - versuche Tab zu erstellen');
            const adminNav = findAdminNavigation();
            if (adminNav) {
                const newTab = createDocConverterTabElement(adminNav);
                setupTabActivation(newTab);
            }
        }
        
        // Wenn Tab im DOM ist, aber Event-Listener fehlt, Event-Listener erneut einrichten
        if (tabElement && !tabElement._hasDocConverterListener) {
            setupTabActivation(tabElement);
            tabElement._hasDocConverterListener = true;
        }
    }
})();