/**
 * Document Converter Tab Handler
 * Robuste Lösung für die Darstellung des Dokumentenkonverter-Tabs
 * mit Port 8080 Kompatibilität
 */

(function() {
    console.log("[DocConverterTab] Initialisierung...");

    // Konfiguration
    const CONFIG = {
        debug: true,
        tabName: "docConverter",
        tabDisplayName: "Dokumentenkonverter",
        cssClassForAdminPage: "admin-page",
        cssClassForActiveTab: "admin-docconverter-tab",
        pollingInterval: 1000, // ms
        maxRetries: 20
    };

    // Protokollierung
    function log(message, type = 'info') {
        if (!CONFIG.debug && type === 'debug') return;
        
        const prefix = `[DocConverterTab]`;
        switch(type) {
            case 'error': console.error(prefix, message); break;
            case 'warn': console.warn(prefix, message); break;
            default: console.log(prefix, message);
        }
    }

    // Hilfsmethode, um zu prüfen, ob wir uns auf der Admin-Seite befinden
    function isAdminPage() {
        return window.location.href.includes('/admin') || 
               document.body.classList.contains('admin-page') ||
               document.body.classList.contains('admin') ||
               document.querySelector('.admin-panel') !== null;
    }

    // CSS-Ressourcen laden
    function loadCSSResources() {
        // Liste der CSS-Dateien, die geladen werden sollen
        const cssFiles = [
            'doc-converter-tab-visibility.css',
            'doc-converter-fix.css',
            'doc-converter-position-fix.css'
        ];
        
        // Mögliche Basis-Pfade mit relativen Pfaden (kein führender Slash)
        const basePaths = [
            'css/',
            'static/css/',
            'frontend/css/',
            'api/static/css/'
        ];
        
        // CSS-Dateien mit verschiedenen Basis-Pfaden laden
        cssFiles.forEach(cssFile => {
            let loaded = false;
            
            basePaths.forEach(basePath => {
                if (loaded) return;
                
                const fullPath = basePath + cssFile;
                // Prüfen, ob CSS bereits geladen ist
                if (document.querySelector(`link[href="${fullPath}"]`)) {
                    loaded = true;
                    return;
                }
                
                try {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = fullPath;
                    link.onload = () => {
                        loaded = true;
                        log(`CSS geladen: ${fullPath}`);
                    };
                    link.onerror = () => {
                        log(`CSS konnte nicht geladen werden: ${fullPath}`, 'warn');
                    };
                    document.head.appendChild(link);
                } catch (e) {
                    log(`Fehler beim Laden von CSS ${fullPath}: ${e.message}`, 'error');
                }
            });
            
            // Wenn CSS nicht geladen werden konnte, inline-Fallback hinzufügen
            if (!loaded && cssFile === 'doc-converter-tab-visibility.css') {
                try {
                    const style = document.createElement('style');
                    style.textContent = `
                        /* Inline Fallback für doc-converter-tab-visibility.css */
                        .admin-panel [data-tab="docConverter"], .doc-converter { 
                            display: block !important; 
                            visibility: visible !important; 
                            opacity: 1 !important; 
                        }
                        body:not(.admin-page) .doc-converter { 
                            display: none !important; 
                        }
                    `;
                    document.head.appendChild(style);
                    log(`Inline-CSS-Fallback für ${cssFile} hinzugefügt`);
                } catch (e) {
                    log(`Fehler beim Hinzufügen von Inline-CSS: ${e.message}`, 'error');
                }
            }
        });
    }

    // Tab-Element im Admin-Menü finden oder erstellen
    function findOrCreateTabInAdminMenu() {
        log("Suche nach Tab-Element im Admin-Menü...");
        
        // Mögliche Selektoren für das Admin-Menü
        const adminMenuSelectors = [
            '.admin-nav',
            '.admin-menu',
            '.admin-sidebar',
            '.admin-navigation',
            '.sidebar-menu',
            '.admin-panel .nav',
            '.admin-panel .menu'
        ];
        
        // Admin-Menü finden
        let adminMenu = null;
        for (const selector of adminMenuSelectors) {
            adminMenu = document.querySelector(selector);
            if (adminMenu) {
                log(`Admin-Menü gefunden mit Selektor: ${selector}`);
                break;
            }
        }
        
        if (!adminMenu) {
            log("Admin-Menü nicht gefunden", "error");
            return null;
        }
        
        // Prüfen, ob Tab bereits existiert
        let tabElement = document.querySelector(`.admin-nav-item[data-tab="${CONFIG.tabName}"]`);
        
        if (tabElement) {
            log("Tab-Element bereits vorhanden");
            return tabElement;
        }
        
        // Wenn nicht, erstellen wir ein neues Tab-Element
        log("Erstelle neues Tab-Element");
        tabElement = document.createElement('div');
        tabElement.classList.add('admin-nav-item');
        tabElement.setAttribute('data-tab', CONFIG.tabName);
        tabElement.textContent = CONFIG.tabDisplayName;
        
        // Tab-Klick-Handler
        tabElement.addEventListener('click', function() {
            activateTab(CONFIG.tabName);
        });
        
        // Tab zum Menü hinzufügen
        adminMenu.appendChild(tabElement);
        log("Neues Tab-Element hinzugefügt");
        
        return tabElement;
    }

    // Tab-Inhalt-Container finden oder erstellen
    function findOrCreateTabContent() {
        log("Suche nach Tab-Inhalt-Container...");
        
        // Mögliche Selektoren für den Tab-Inhalt-Bereich
        const contentAreaSelectors = [
            '.admin-content',
            '.admin-panel-content',
            '.tab-content',
            '.admin-panel .content',
            '.admin-panel main',
            '.content-container'
        ];
        
        // Tab-Inhalt-Bereich finden
        let contentArea = null;
        for (const selector of contentAreaSelectors) {
            contentArea = document.querySelector(selector);
            if (contentArea) {
                log(`Tab-Inhalt-Bereich gefunden mit Selektor: ${selector}`);
                break;
            }
        }
        
        if (!contentArea) {
            log("Tab-Inhalt-Bereich nicht gefunden, versuche Fallback", "warn");
            contentArea = document.querySelector('main') || document.body;
        }
        
        // Prüfen, ob DocConverter-Container bereits existiert
        let tabContent = document.querySelector(`[data-tab="${CONFIG.tabName}"], #doc-converter-container, .doc-converter`);
        
        if (tabContent) {
            log("DocConverter-Container bereits vorhanden");
            
            // Sicherstellen, dass der Container die richtigen Attribute hat
            tabContent.setAttribute('data-tab', CONFIG.tabName);
            tabContent.classList.add('admin-tab-content');
            tabContent.classList.add('doc-converter');
            
            return tabContent;
        }
        
        // Wenn nicht, erstellen wir einen neuen Container
        log("Erstelle neuen DocConverter-Container");
        tabContent = document.createElement('div');
        tabContent.id = 'doc-converter-container';
        tabContent.classList.add('admin-tab-content');
        tabContent.classList.add('doc-converter');
        tabContent.setAttribute('data-tab', CONFIG.tabName);
        
        // Basic UI für den Fall, dass Vue.js nicht geladen wird
        tabContent.innerHTML = `
            <div class="loading-indicator">
                <div style="text-align: center;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #eee; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 10px;">Dokumentenkonverter wird geladen...</p>
                </div>
            </div>
            <style>
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;
        
        // Container zum Inhaltsbereich hinzufügen
        contentArea.appendChild(tabContent);
        log("Neuen DocConverter-Container hinzugefügt");
        
        return tabContent;
    }

    // Tab aktivieren
    function activateTab(tabName) {
        log(`Aktiviere Tab: ${tabName}`);
        
        // Alle Tab-Items deaktivieren
        document.querySelectorAll('.admin-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Alle Tab-Inhalte ausblenden
        document.querySelectorAll('.admin-tab-content').forEach(content => {
            content.style.display = 'none';
            content.style.visibility = 'hidden';
            content.style.opacity = '0';
        });
        
        // Aktives Tab-Item markieren
        const activeTabItem = document.querySelector(`.admin-nav-item[data-tab="${tabName}"]`);
        if (activeTabItem) {
            activeTabItem.classList.add('active');
        }
        
        // Tab-Inhalt anzeigen
        const activeTabContent = document.querySelector(`.admin-tab-content[data-tab="${tabName}"]`) || 
                                document.querySelector(`#${tabName}`) || 
                                document.querySelector(`#${tabName}-container`) || 
                                document.querySelector(`.${tabName}`);
        
        if (activeTabContent) {
            activeTabContent.style.display = 'block';
            activeTabContent.style.visibility = 'visible';
            activeTabContent.style.opacity = '1';
            
            // Tab-Content markieren, dass DocConverter aktiv ist
            document.querySelectorAll('.tab-content').forEach(content => {
                content.setAttribute('data-active-tab', tabName);
            });
            
            // Markieren, dass DocConverter-Tab aktiv ist
            document.body.classList.add(CONFIG.cssClassForActiveTab);
            
            log(`Tab ${tabName} wurde aktiviert`);
        } else {
            log(`Tab-Inhalt für ${tabName} nicht gefunden`, "error");
        }
    }

    // Überprüfen, ob wir Vue.js auslösen müssen
    function triggerVueMount() {
        try {
            if (window.mountDocConverter && typeof window.mountDocConverter === 'function') {
                log("Löse Vue.js DocConverter-Mounting aus");
                window.mountDocConverter();
            } else if (window.initDocConverter && typeof window.initDocConverter === 'function') {
                log("Löse Vue.js DocConverter-Initialisierung aus");
                window.initDocConverter();
            } else {
                log("Vue.js DocConverter-Mounting-Funktion nicht gefunden", "warn");
            }
        } catch (e) {
            log(`Fehler beim Auslösen des Vue.js DocConverter-Mountings: ${e.message}`, "error");
        }
    }

    // Fallback-UI erstellen, wenn Vue.js nicht geladen werden kann
    function injectFallbackUI() {
        log("Erstelle Fallback-UI für DocConverter");
        
        const container = document.querySelector('#doc-converter-container') || 
                        document.querySelector('.doc-converter') || 
                        document.querySelector(`[data-tab="${CONFIG.tabName}"]`);
        
        if (!container) {
            log("Konnte keinen DocConverter-Container finden", "error");
            return;
        }
        
        container.innerHTML = `
            <div class="doc-converter classic-ui">
                <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">Dokumenten-Konverter</h2>
                
                <div style="padding: 1rem; margin-bottom: 1.5rem; background-color: #f8f9fa; border-left: 4px solid #6c757d; border-radius: 0.25rem;">
                    <p style="margin-bottom: 0.5rem;"><strong>Hinweis:</strong> Sie verwenden die einfache Version des Dokumentenkonverters.</p>
                </div>
                
                <form action="/api/admin/upload/document" method="post" enctype="multipart/form-data">
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Datei auswählen</label>
                        <input type="file" name="file" style="border: 1px solid #e5e7eb; padding: 0.75rem; width: 100%; border-radius: 0.25rem; background-color: #f9fafb;" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.html,.txt">
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
        
        log("Fallback-UI für DocConverter erstellt");
    }

    // Hauptinitialisierungsfunktion
    function init() {
        if (!isAdminPage()) {
            log("Keine Admin-Seite, DocConverter-Tab wird nicht initialisiert", "debug");
            return;
        }
        
        log("Admin-Seite erkannt, initialisiere DocConverter-Tab");
        
        // Markieren, dass wir auf einer Admin-Seite sind
        document.body.classList.add(CONFIG.cssClassForAdminPage);
        
        // CSS-Ressourcen laden
        loadCSSResources();
        
        // Tab im Admin-Menü finden oder erstellen
        const tabElement = findOrCreateTabInAdminMenu();
        
        // Tab-Inhalt-Container finden oder erstellen
        const tabContent = findOrCreateTabContent();
        
        if (tabElement && tabContent) {
            log("Tab-Elemente gefunden/erstellt, versuche Vue.js zu mounten");
            
            // Versuchen Vue.js DocConverter zu mounten
            triggerVueMount();
            
            // Nach kurzer Verzögerung prüfen, ob Vue.js-Mounting erfolgreich war
            setTimeout(() => {
                // Prüfen, ob Vue.js geladen wurde
                const vueAppMounted = document.querySelector('#doc-converter-app') || 
                                    document.querySelector('.vue-doc-converter');
                
                if (!vueAppMounted) {
                    log("Vue.js DocConverter nicht gemountet, erstelle Fallback-UI", "warn");
                    injectFallbackUI();
                } else {
                    log("Vue.js DocConverter erfolgreich gemountet");
                }
            }, 2000);
        }
    }

    // Monitoring-Variablen
    let monitoringInterval = null;
    let monitoringCount = 0;
    
    // Regelmäßige Überprüfung und Wiederherstellung des Tab-Status
    function monitorTabStatus() {
        if (!isAdminPage()) return;
        
        // Beende bestehendes Monitoring, falls vorhanden
        stopMonitoring();
        
        monitoringInterval = setInterval(() => {
            monitoringCount++;
            
            // Prüfen, ob der Tab existiert und korrekt dargestellt wird
            const tabElement = document.querySelector(`.admin-nav-item[data-tab="${CONFIG.tabName}"]`);
            const tabContent = document.querySelector(`[data-tab="${CONFIG.tabName}"], #doc-converter-container, .doc-converter`);
            
            if (!tabElement || !tabContent) {
                log("Tab-Elemente fehlen, starte Neuinitialisierung", "warn");
                init();
            }
            
            // Prüfen, ob der Tab-Inhalt sichtbar ist, wenn der Tab aktiv ist
            if (tabElement && tabElement.classList.contains('active')) {
                if (tabContent && (tabContent.style.display === 'none' || tabContent.style.visibility === 'hidden')) {
                    log("Tab ist aktiv, aber Inhalt ist nicht sichtbar, korrigiere", "warn");
                    tabContent.style.display = 'block';
                    tabContent.style.visibility = 'visible';
                    tabContent.style.opacity = '1';
                    document.body.classList.add(CONFIG.cssClassForActiveTab);
                }
            }
            
            // Stoppe nach maximaler Anzahl von Durchläufen
            if (monitoringCount >= CONFIG.maxRetries) {
                log(`Monitoring nach ${CONFIG.maxRetries} Durchläufen gestoppt`, "info");
                stopMonitoring();
            }
        }, CONFIG.pollingInterval);
    }
    
    // Funktion zum Stoppen des Monitorings
    function stopMonitoring() {
        if (monitoringInterval) {
            clearInterval(monitoringInterval);
            monitoringInterval = null;
            log("Monitoring gestoppt", "info");
        }
    }

    // Ausführen, sobald DOM bereit ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Start monitoring nach kurzer Verzögerung
    setTimeout(monitorTabStatus, 1000);
    
    // API exportieren
    window.docConverterTabHandler = {
        init,
        activateTab: () => activateTab(CONFIG.tabName),
        injectFallbackUI,
        stopMonitoring,
        startMonitoring: () => monitorTabStatus()
    };
})();