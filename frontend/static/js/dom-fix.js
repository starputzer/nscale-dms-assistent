/**
 * DOM-Fix für Probleme mit der Vue.js-Initialisierung
 * Dieses Skript korrigiert die Tab-Anzeige, wenn Vue.js nicht richtig initialisiert ist
 */
(function() {
    console.log('DOM-Fix wird initialisiert...');
    
    // Füge CSS hinzu, um alle Tabs auszublenden
    const style = document.createElement('style');
    style.innerHTML = `
        /* Standardmäßig alle Tabs verstecken */
        .admin-panel-content[data-tab] {
            display: none !important;
        }
        
        /* Erstes Tab standardmäßig anzeigen */
        .admin-panel-content[data-tab="users"] {
            display: block !important;
        }
        
        /* Aktives Tab anzeigen */
        .admin-panel-content.active-tab {
            display: block !important;
        }
    `;
    document.head.appendChild(style);
    
    // Warte auf den Admin-View
    function waitForAdminView() {
        console.log('Warte auf Admin-View...');
        
        // Prüfe, ob der Admin-View-Button sichtbar ist
        const adminViewButton = document.querySelector('button[title="Systemadministration"]');
        if (adminViewButton) {
            console.log('Admin-View-Button gefunden, füge Event-Listener hinzu...');
            
            // Event-Listener für Admin-View-Button hinzufügen
            adminViewButton.addEventListener('click', function() {
                console.log('Admin-View-Button geklickt, warte auf admin-panel-content...');
                
                // Warte kurz, bis der DOM aktualisiert wurde
                setTimeout(function() {
                    // Prüfe, ob admin-panel-content Elemente sichtbar sind
                    const adminPanelContents = document.querySelectorAll('.admin-panel-content');
                    if (adminPanelContents.length > 0) {
                        console.log(`Admin-Panel gefunden mit ${adminPanelContents.length} Tabs, starte Fix...`);
                        
                        // Aktiviere einzeln alle Tabs, um die HTML-Struktur zu korrigieren
                        logAllPanels();
                        
                        // Korrigiere Tab-Sichtbarkeit
                        fixTabVisibility();
                    } else {
                        console.log('Admin-Panel-Content noch nicht gefunden, erneuter Versuch in 500ms...');
                        setTimeout(arguments.callee, 500);
                    }
                }, 500);
            });
        } else {
            console.log('Admin-View-Button noch nicht gefunden, erneuter Versuch in 1000ms...');
            setTimeout(waitForAdminView, 1000);
        }
    }
    
    // Debug-Funktion: Protokolliere alle Admin-Panels
    function logAllPanels() {
        console.log('=== Alle Admin-Panels ===');
        const panels = document.querySelectorAll('.admin-panel-content');
        panels.forEach(panel => {
            const tabId = panel.getAttribute('data-tab');
            const style = window.getComputedStyle(panel);
            console.log(`Panel[${tabId}]: display=${style.display}, visibility=${style.visibility}`);
        });
        console.log('========================');
    }
    
    // Starte mit dem Warten auf den Admin-View
    waitForAdminView();
    
    // Funktion zum Verstecken aller Tabs außer dem ausgewählten
    function fixTabVisibility() {
        console.log('Korrigiere Tab-Sichtbarkeit...');
        
        // Alle Tab-Panels finden
        const adminPanelContents = document.querySelectorAll('.admin-panel-content');
        if (adminPanelContents.length === 0) {
            console.log('Keine Admin-Panel-Inhalte gefunden - noch nicht geladen');
            return false;
        }
        
        console.log(`${adminPanelContents.length} Admin-Panel-Inhalte gefunden`);
        
        // Finde den aktiven Tab-Button
        const activeTabButton = document.querySelector('.admin-nav-item.active');
        let activeTabId = null;
        
        if (activeTabButton) {
            activeTabId = activeTabButton.getAttribute('data-tab');
            console.log(`Aktiver Tab gefunden: ${activeTabId}`);
        } else {
            // Standardmäßig das erste Tab anzeigen
            const firstTabButton = document.querySelector('.admin-nav-item');
            if (firstTabButton) {
                activeTabId = firstTabButton.getAttribute('data-tab');
                firstTabButton.classList.add('active');
                console.log(`Kein aktiver Tab gefunden, verwende ersten Tab: ${activeTabId}`);
            }
        }
        
        // Alle Tabs verstecken und nur den aktiven anzeigen
        adminPanelContents.forEach(panel => {
            panel.classList.remove('active-tab');
            const panelTabId = panel.getAttribute('data-tab');
            if (panelTabId === activeTabId) {
                panel.classList.add('active-tab');
                console.log(`Zeige Tab: ${panelTabId}`);
            } else {
                console.log(`Verstecke Tab: ${panelTabId}`);
            }
        });
        
        // Event-Listener für Tab-Wechsel einrichten
        const tabButtons = document.querySelectorAll('.admin-nav-item');
        tabButtons.forEach(button => {
            // Nur einmal den Event-Listener hinzufügen
            if (!button.hasAttribute('data-dom-fix-initialized')) {
                button.setAttribute('data-dom-fix-initialized', 'true');
                
                button.addEventListener('click', function(event) {
                    // Tab-ID des geklickten Buttons holen
                    const tabId = this.getAttribute('data-tab');
                    console.log(`Tab-Button geklickt: ${tabId}`);
                    
                    // Alle Buttons deaktivieren
                    tabButtons.forEach(btn => {
                        btn.classList.remove('active');
                    });
                    
                    // Diesen Button aktivieren
                    this.classList.add('active');
                    
                    // Alle Panels verstecken
                    adminPanelContents.forEach(panel => {
                        panel.classList.remove('active-tab');
                    });
                    
                    // Das entsprechende Panel anzeigen
                    const targetPanel = document.querySelector(`.admin-panel-content[data-tab="${tabId}"]`);
                    if (targetPanel) {
                        targetPanel.classList.add('active-tab');
                        
                        // DocConverter-Tab speziell behandeln
                        if (tabId === 'docConverter') {
                            console.log('DocConverter-Tab aktiviert, versuche Initialisierung...');
                            if (typeof window.initDocConverter === 'function') {
                                window.initDocConverter();
                            }
                        }
                    }
                });
                
                console.log(`Event-Listener für Tab-Button ${button.getAttribute('data-tab')} hinzugefügt`);
            }
        });
        
        return true;
    }
    
    // Versuche mehrmals, die Tab-Sichtbarkeit zu korrigieren, da die DOM-Struktur
    // möglicherweise nicht sofort verfügbar ist
    let attempts = 0;
    const maxAttempts = 10;
    const checkInterval = setInterval(() => {
        attempts++;
        console.log(`DOM-Fix Versuch ${attempts}/${maxAttempts}`);
        
        if (fixTabVisibility() || attempts >= maxAttempts) {
            console.log('DOM-Fix abgeschlossen');
            clearInterval(checkInterval);
        }
    }, 500);
})();