/**
 * Document Converter Visibility Fix
 * Sorgt dafür, dass der Dokumentenkonverter-Tab und -Container immer sichtbar sind
 */

(function() {
    console.log('[DocConverter-Visibility-Fix] Initialisiere');
    
    // Strategie: Den DocConverter-Container sichtbar halten und andere Container ausblenden
    // wenn der DocConverter aktiv ist
    
    // Sofort ausführen, wenn das DOM geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // Interval für regelmäßige Überprüfungen
    let visibilityInterval;
    
    function initialize() {
        console.log('[DocConverter-Visibility-Fix] Start');
        
        // CSS für Visibility Fix laden
        loadVisibilityCSS();
        
        // Zunächst einmalig prüfen und Container anpassen
        ensureContainerVisibility();
        
        // Intervall zum regelmäßigen Prüfen, falls andere Skripte unsere Änderungen überschreiben
        if (visibilityInterval) clearInterval(visibilityInterval);
        visibilityInterval = setInterval(ensureContainerVisibility, 1000);
        
        // Event-Listener für Tab-Klicks
        setupTabClickListeners();
        
        // Body-Klasse setzen, wenn wir uns im Admin-Bereich befinden
        if (isAdminArea()) {
            document.body.classList.add('admin-page');
        }
    }
    
    function isAdminArea() {
        return window.location.pathname.includes('/admin') || 
               document.querySelector('.admin-panel') !== null ||
               document.querySelector('.admin-nav-item') !== null ||
               document.querySelector('.admin-sidebar') !== null;
    }
    
    // Stellt sicher, dass der Container immer sichtbar ist
    function ensureContainerVisibility() {
        // Überprüfen, ob der DocConverter-Tab aktiv ist
        if (isDocConverterTabActive()) {
            document.body.classList.add('admin-docconverter-tab');
            
            // Alle vorhandenen DocConverter-Container finden
            const containers = document.querySelectorAll('#doc-converter-container, #doc-converter-app, .doc-converter, [data-tab="docConverter"]');
            
            if (containers.length > 0) {
                containers.forEach(container => {
                    container.classList.add('doc-converter-force-visible');
                    container.style.display = 'block';
                    container.style.visibility = 'visible';
                    container.style.opacity = '1';
                });
                
                // Alle anderen Tab-Inhalte verstecken
                const otherTabs = document.querySelectorAll('.admin-tab-content:not([data-tab="docConverter"])');
                otherTabs.forEach(tab => {
                    tab.style.display = 'none';
                });
            }
        }
        
        // Unerwünschte DocConverter-Instanzen außerhalb des Admin-Bereichs verstecken
        if (!isAdminArea() && !document.body.classList.contains('admin-docconverter-tab')) {
            const containers = document.querySelectorAll('#doc-converter-container, #doc-converter-app, .doc-converter, [data-tab="docConverter"]');
            
            containers.forEach(container => {
                container.style.display = 'none';
                container.style.visibility = 'hidden';
                container.style.opacity = '0';
                container.style.height = '0';
                container.style.overflow = 'hidden';
            });
        }
    }
    
    // Überprüft, ob der DocConverter-Tab aktiv ist
    function isDocConverterTabActive() {
        // 1. Prüfen, ob ein Tab mit "docConverter" oder "Dokumente konvertieren" aktiv ist
        const activeTab = document.querySelector('.admin-nav-item.active[data-tab="docConverter"], .admin-tab.active[data-tab="docConverter"]');
        if (activeTab) return true;
        
        // 2. Prüfen, ob ein Tab mit dem Text "Dokumente konvertieren" ausgewählt ist
        const allTabs = document.querySelectorAll('.admin-nav-item, .admin-tab, .tab-item, button, a');
        for (const tab of allTabs) {
            if (tab.textContent && 
                tab.textContent.includes('Dokumente konvertieren') && 
                (tab.classList.contains('active') || tab.hasAttribute('aria-selected') || tab.getAttribute('aria-selected') === 'true')) {
                return true;
            }
        }
        
        // 3. Prüfen, ob die URL #docConverter oder einen ähnlichen Parameter enthält
        if (window.location.hash && 
            (window.location.hash.includes('docConverter') || 
             window.location.hash.includes('documents') || 
             window.location.hash.includes('converter'))) {
            return true;
        }
        
        return false;
    }
    
    // Richtet Event-Listener für Tab-Klicks ein
    function setupTabClickListeners() {
        // Finde alle möglichen Tab-Elemente
        const tabElements = document.querySelectorAll('.admin-nav-item, .admin-tab, .tab-item, button, a');
        
        tabElements.forEach(tab => {
            // Prüfe, ob der Tab den DocConverter betrifft
            const isDocConverterTab = 
                tab.getAttribute('data-tab') === 'docConverter' || 
                tab.getAttribute('href') === '#docConverter' ||
                (tab.textContent && tab.textContent.includes('Dokumente konvertieren'));
            
            if (isDocConverterTab && !tab._hasListener) {
                tab.addEventListener('click', function() {
                    console.log('[DocConverter-Visibility-Fix] DocConverter-Tab wurde geklickt');
                    
                    // DocConverter-Tab als aktiv markieren
                    document.body.classList.add('admin-docconverter-tab');
                    
                    // Alle anderen Tabs deaktivieren
                    document.querySelectorAll('.admin-nav-item, .admin-tab, .tab-item').forEach(t => {
                        t.classList.remove('active');
                    });
                    
                    // Diesen Tab aktivieren
                    tab.classList.add('active');
                    
                    // Sofortige Prüfung der Container-Sichtbarkeit
                    ensureContainerVisibility();
                });
                
                tab._hasListener = true;
            }
        });
    }
    
    // CSS für Visibility Fix laden
    function loadVisibilityCSS() {
        // Prüfen, ob das CSS bereits geladen ist
        if (document.querySelector('link[href*="doc-converter-visibility-fix.css"]')) {
            console.log('[DocConverter-Visibility-Fix] CSS bereits vorhanden');
            return;
        }
        
        // CSS aus mehreren möglichen Quellen laden
        const cssPaths = [
            '/static/css/doc-converter-visibility-fix.css',
            '/frontend/css/doc-converter-visibility-fix.css',
            '/api/static/css/doc-converter-visibility-fix.css',
            '/css/doc-converter-visibility-fix.css'
        ];
        
        // Versuche alle CSS-Pfade
        for (const path of cssPaths) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = path;
            link.setAttribute('data-critical', 'true');
            document.head.appendChild(link);
        }
        
        // Inline-CSS als Fallback hinzufügen
        const inlineStyle = document.createElement('style');
        inlineStyle.textContent = `
            /* Inlines Fallback-CSS für DocConverter Visibility */
            html body div#doc-converter-container,
            html body div#doc-converter-app,
            html body div.doc-converter,
            html body div[data-tab="docConverter"],
            html body div.admin-tab-content[data-tab="docConverter"] {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                min-height: 400px !important;
                width: 100% !important;
            }
            
            body:not(.admin-page):not(.admin-docconverter-tab) #doc-converter-container,
            body:not(.admin-page):not(.admin-docconverter-tab) #doc-converter-app,
            body:not(.admin-page):not(.admin-docconverter-tab) .doc-converter {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
            }
            
            .admin-nav-item[data-tab="docConverter"].active,
            .admin-tab[data-tab="docConverter"].active {
                background-color: rgba(59, 130, 246, 0.1) !important;
                border-left: 3px solid #3b82f6 !important;
            }
        `;
        document.head.appendChild(inlineStyle);
    }
})();
