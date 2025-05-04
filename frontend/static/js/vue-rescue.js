/**
 * Vue Rescue - Fallback für fehlgeschlagene Vue.js-Initialisierung
 * Erstellt eine Notfall-Oberfläche für den Admin-Bereich, wenn Vue.js nicht korrekt initialisiert wird.
 */

(function() {
    'use strict';
    
    // Konfiguration
    const config = {
        initCheckDelay: 2000,       // Wartezeit bevor wir prüfen ob Vue initialisiert wurde (ms)
        observerTimeout: 5000,      // Maximale Wartezeit auf Vue.js Elemente (ms)
        logPrefix: '[Vue Rescue]',  // Präfix für Konsolenausgaben
        enableLogging: true,        // Logging aktivieren/deaktivieren
        tabs: [
            { id: 'users', label: 'Benutzer', icon: 'fas fa-users' },
            { id: 'system', label: 'System', icon: 'fas fa-server' },
            { id: 'feedback', label: 'Feedback', icon: 'fas fa-comment' },
            { id: 'motd', label: 'Nachrichten', icon: 'fas fa-bullhorn' },
            { id: 'doc-converter', label: 'Dokument-Konverter', icon: 'fas fa-file-alt' }
        ]
    };
    
    // Hilfsvariablen
    let vueInitialized = false;
    let rescueActive = false;
    let currentTab = 'users';
    
    // Logger Funktion
    function log(...args) {
        if (config.enableLogging) {
            console.log(config.logPrefix, ...args);
            
            // Füge zusätzliche Debug-Information für bestimmte Fehleranalysen hinzu
            if (args[0] && typeof args[0] === 'string' && args[0].includes('nicht korrekt initialisiert')) {
                console.warn(config.logPrefix, '=== DETAILLIERTES FEHLER-LOGGING ===');
                console.warn(config.logPrefix, 'DOM-Status:', {
                    'document.readyState': document.readyState,
                    'document.body exists': !!document.body,
                    'window.Vue exists': !!window.Vue,
                    'adminContainers': {
                        '.admin-view': document.querySelector('.admin-view') ? 'gefunden' : 'nicht gefunden',
                        '#admin-container': document.getElementById('admin-container') ? 'gefunden' : 'nicht gefunden',
                        '.admin-panel': document.querySelector('.admin-panel') ? 'gefunden' : 'nicht gefunden',
                        '.admin-panel-content': document.querySelectorAll('.admin-panel-content').length + ' gefunden'
                    },
                    'scripts loaded': Array.from(document.querySelectorAll('script')).map(s => s.src || 'inline script').filter(s => s !== 'inline script'),
                    'css loaded': Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(s => s.href)
                });
                
                // Prüfe auf Vue-spezifische Fehler in der Konsole
                if (window.console && window.console.error) {
                    const originalConsoleError = window.console.error;
                    window.console.error = function(...errorArgs) {
                        if (errorArgs[0] && typeof errorArgs[0] === 'string' && 
                            (errorArgs[0].includes('Vue') || errorArgs[0].includes('vue'))) {
                            console.warn(config.logPrefix, 'Vue-Fehler erkannt:', ...errorArgs);
                        }
                        originalConsoleError.apply(console, errorArgs);
                    };
                    
                    // Nach 5 Sekunden wieder zurücksetzen
                    setTimeout(() => {
                        if (window.console && window.console.error === window.console.error) {
                            window.console.error = originalConsoleError;
                        }
                    }, 5000);
                }
            }
        }
    }

    /**
     * Vue.js-Initialisierungsstatus überprüfen
     * Prüft ob die erwarteten Vue.js-Komponenten im DOM vorhanden sind
     */
    function checkVueInitialization() {
        log('Prüfe Vue.js-Initialisierung...');
        
        // Prüfe nach Vue.js spezifischen Elementen
        const adminPanelElements = document.querySelectorAll('.admin-panel-content');
        const navItems = document.querySelectorAll('.admin-nav-item');
        const docConverterApp = document.querySelector('#doc-converter-app .vue-initialized');
        const vueElements = document.querySelectorAll('[data-v-component], [data-v-app], .v-app');
        
        // Alle gefundenen Elemente für Debug-Zwecke anzeigen
        log('DOM-Analyse:', {
            'adminPanelElements': adminPanelElements.length,
            'navItems': navItems.length,
            'docConverterApp': docConverterApp ? 'gefunden' : 'nicht gefunden',
            'vueElements': vueElements.length,
            'bodyClasses': document.body ? document.body.className : 'body nicht gefunden',
            'adminView': document.querySelector('.admin-view') ? 'gefunden' : 'nicht gefunden'
        });
        
        // Versuche, das Vue-Objekt im globalen Scope zu finden
        const hasVueGlobal = typeof window.Vue !== 'undefined' || 
                            typeof window.vue !== 'undefined' || 
                            document.querySelector('[data-v-app]') !== null;
        
        // Prüfe mehrere Indikatoren, um zu erkennen, ob Vue.js korrekt initialisiert wurde
        if ((adminPanelElements.length > 0 && navItems.length > 0) || 
            (docConverterApp && docConverterApp.childElementCount > 0) ||
            (vueElements.length > 0) ||
            hasVueGlobal) {
            
            log('Vue.js wurde erfolgreich initialisiert:', 
                adminPanelElements.length, 'Panel-Elemente,', 
                navItems.length, 'Navigations-Elemente gefunden,',
                vueElements.length, 'Vue-Elemente gefunden');
            vueInitialized = true;
            return true;
        }
        
        // Spezielles Debug-Log für Admin-Bereich
        const adminContainer = document.querySelector('.admin-view') || 
                              document.getElementById('admin-container');
        
        if (adminContainer) {
            log('Admin-Container gefunden, aber keine Vue.js-Elemente darin:', {
                'innerHTML teilweise': adminContainer.innerHTML.substring(0, 150) + '...',
                'childNodes': adminContainer.childNodes.length,
                'classList': Array.from(adminContainer.classList),
                'id': adminContainer.id,
                'visible': adminContainer.offsetParent !== null
            });
        }
        
        log('Vue.js wurde nicht korrekt initialisiert. Keine Vue-generierten Elemente gefunden.');
        return false;
    }

    /**
     * Rettungsmodus aktivieren
     * Erstellt eine Notfall-UI für den Admin-Bereich
     */
    function activateRescueMode() {
        if (rescueActive) {
            log('Rettungsmodus bereits aktiv, überspringe Initialisierung');
            return;
        }
        
        log('Aktiviere Rettungsmodus für Admin-Bereich');
        console.warn('[Vue Rescue] Rescue-Mode Aktivierung gestartet');
        
        // Prüfe, welcher DocConverter-Bereich existiert
        console.warn('[Vue Rescue] DocConverter-Bereiche:', {
            '#doc-converter-app': document.getElementById('doc-converter-app') ? 'gefunden' : 'nicht gefunden',
            '#doc-converter-container': document.getElementById('doc-converter-container') ? 'gefunden' : 'nicht gefunden'
        });
        
        // Rettungs-CSS einfügen
        injectRescueStyles();
        console.warn('[Vue Rescue] Rettungs-CSS eingefügt');
        
        // Admin-View finden oder erstellen
        const adminContainers = [
            { name: '.admin-view', element: document.querySelector('.admin-view') },
            { name: '#admin-container', element: document.getElementById('admin-container') },
            { name: '#doc-converter-app', element: document.getElementById('doc-converter-app') },
            { name: '#doc-converter-container', element: document.getElementById('doc-converter-container') }
        ];
        
        console.warn('[Vue Rescue] Verfügbare Container:', adminContainers.filter(c => c.element !== null).map(c => c.name));
        
        // Wähle den ersten verfügbaren Container
        let adminViewContainer = null;
        for (const container of adminContainers) {
            if (container.element) {
                adminViewContainer = container.element;
                console.warn('[Vue Rescue] Verwende Container:', container.name);
                break;
            }
        }
        
        // Fallback: Wenn kein Container gefunden, aber wir wissen, dass wir auf der Admin-Seite sind
        if (!adminViewContainer && (window.location.href.includes('admin') || window.location.href.includes('converter'))) {
            console.warn('[Vue Rescue] Kein Container gefunden, erstelle einen in der Hauptapp');
            
            // Erstelle einen Container in der app-Div
            const appDiv = document.getElementById('app') || document.body;
            adminViewContainer = document.createElement('div');
            adminViewContainer.id = 'admin-rescue-container';
            adminViewContainer.className = 'admin-view';
            appDiv.appendChild(adminViewContainer);
            
            console.warn('[Vue Rescue] Container erstellt:', adminViewContainer.id);
        }
        
        if (!adminViewContainer) {
            log('Fehler: Kein Admin-Container gefunden');
            console.error('[Vue Rescue] Kein Admin-Container für Rescue-Mode gefunden!');
            
            // Liste alle verfügbaren Container auf, die wir hätten nutzen können
            console.error('[Vue Rescue] Verfügbare Container im DOM:', 
                Array.from(document.querySelectorAll('div[id]')).map(el => '#' + el.id));
            return;
        }
        
        // Protokolliere Container vor dem Leeren
        console.warn('[Vue Rescue] Container vor dem Leeren:', {
            id: adminViewContainer.id,
            className: adminViewContainer.className,
            childNodes: adminViewContainer.childNodes.length,
            innerHTML: adminViewContainer.innerHTML.substring(0, 100) + '...'
        });
        
        // Bestehenden Inhalt löschen
        adminViewContainer.innerHTML = '';
        
        // Rettungs-UI erstellen
        createRescueAdminPanel(adminViewContainer);
        console.warn('[Vue Rescue] Rescue-Admin-Panel erstellt');
        
        // Initial ersten Tab anzeigen
        showTab(config.tabs[0].id);
        console.warn('[Vue Rescue] Initial Tab angezeigt:', config.tabs[0].id);
        
        // Prüfe ob wir auf der DocConverter-Seite sind und zeige diesen Tab an
        if (window.location.href.includes('doc-converter')) {
            showTab('doc-converter');
            console.warn('[Vue Rescue] DocConverter-Tab automatisch angezeigt');
        }
        
        rescueActive = true;
        log('Rettungsmodus aktiviert');
        console.warn('[Vue Rescue] Rescue-Mode erfolgreich aktiviert');
    }

    /**
     * Rettungs-CSS-Stile einfügen
     */
    function injectRescueStyles() {
        const styleElement = document.createElement('style');
        styleElement.id = 'vue-rescue-styles';
        styleElement.textContent = `
            /* Rettungs-Admin-Panel Stile */
            .rescue-admin-view {
                display: flex;
                flex-direction: column;
                height: 100%;
                width: 100%;
                background-color: #f5f5f5;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 1000;
                overflow: auto;
            }
            
            .rescue-admin-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 20px;
                background-color: #404040;
                color: white;
                border-bottom: 1px solid #2c2c2c;
                position: sticky;
                top: 0;
                z-index: 1001;
            }
            
            .rescue-admin-header h1 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                display: flex;
                align-items: center;
            }
            
            .rescue-admin-header h1 i {
                margin-right: 8px;
            }
            
            .rescue-admin-content {
                display: flex;
                flex: 1;
                overflow: hidden;
            }
            
            .rescue-admin-nav {
                width: 220px;
                background-color: #333;
                color: white;
                overflow-y: auto;
            }
            
            .rescue-admin-panel {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                background-color: white;
            }
            
            .rescue-nav-item {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                cursor: pointer;
                border-left: 3px solid transparent;
                transition: background-color 0.2s;
            }
            
            .rescue-nav-item:hover {
                background-color: rgba(255, 255, 255, 0.1);
            }
            
            .rescue-nav-item.active {
                background-color: rgba(255, 255, 255, 0.15);
                border-left-color: #e74c3c;
            }
            
            .rescue-nav-item i {
                margin-right: 10px;
                width: 20px;
                text-align: center;
            }
            
            .rescue-tab-content {
                display: none;
            }
            
            .rescue-tab-content.active {
                display: block;
            }
            
            .rescue-section {
                margin-bottom: 24px;
            }
            
            .rescue-section-title {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 10px;
                color: #333;
                border-bottom: 1px solid #eee;
                padding-bottom: 8px;
            }
            
            .rescue-button {
                padding: 8px 16px;
                background-color: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.2s;
            }
            
            .rescue-button:hover {
                background-color: #0069d9;
            }
            
            .rescue-button.secondary {
                background-color: #6c757d;
            }
            
            .rescue-button.secondary:hover {
                background-color: #5a6268;
            }
            
            .rescue-button.danger {
                background-color: #dc3545;
            }
            
            .rescue-button.danger:hover {
                background-color: #c82333;
            }
            
            .rescue-button:disabled {
                background-color: #cccccc;
                cursor: not-allowed;
            }
            
            .rescue-button.secondary:disabled {
                background-color: #e2e3e5;
                cursor: not-allowed;
            }
            
            .rescue-status {
                margin-top: 16px;
                padding: 10px;
                border-radius: 4px;
                background-color: #f8f9fa;
                border: 1px solid #e9ecef;
            }
            
            .rescue-message {
                margin-top: 10px;
                padding: 8px 12px;
                border-radius: 4px;
                display: none;
            }
            
            .rescue-message.error {
                display: block;
                background-color: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
            }
            
            .rescue-message.success {
                display: block;
                background-color: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
            }
            
            .rescue-message.warning {
                display: block;
                background-color: #fff3cd;
                border: 1px solid #ffeeba;
                color: #856404;
            }
            
            /* Spezifische Tab-Stile */
            
            /* Dokument-Konverter Tab */
            .rescue-dropzone {
                border: 2px dashed #ccc;
                border-radius: 4px;
                padding: 30px;
                text-align: center;
                cursor: pointer;
                margin-bottom: 20px;
                transition: border-color 0.2s;
            }
            
            .rescue-dropzone:hover {
                border-color: #007bff;
            }
            
            .rescue-file-list {
                margin-top: 20px;
            }
            
            .rescue-file-item {
                display: flex;
                align-items: center;
                padding: 10px;
                border: 1px solid #eee;
                border-radius: 4px;
                margin-bottom: 8px;
            }
            
            .rescue-file-item .file-info {
                flex: 1;
            }
            
            .rescue-file-item .file-name {
                font-weight: 600;
            }
            
            .rescue-file-item .file-size {
                font-size: 12px;
                color: #666;
            }
            
            .rescue-file-item .file-actions {
                display: flex;
                gap: 8px;
            }
            
            .rescue-options {
                margin-top: 20px;
                padding: 16px;
                background-color: #f8f9fa;
                border-radius: 4px;
            }
            
            .rescue-option-group {
                margin-bottom: 16px;
            }
            
            .rescue-option-title {
                font-weight: 600;
                margin-bottom: 8px;
            }
            
            .rescue-form-group {
                margin-bottom: 12px;
            }
            
            .rescue-label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
            }
            
            .rescue-select {
                width: 100%;
                padding: 8px;
                border: 1px solid #ced4da;
                border-radius: 4px;
            }
            
            .rescue-checkbox {
                margin-right: 5px;
            }
            
            .rescue-textarea {
                width: 100%;
                padding: 8px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                resize: vertical;
                min-height: 100px;
            }
            
            .rescue-progress {
                margin-top: 20px;
                display: none;
            }
            
            .rescue-progress.active {
                display: block;
            }
            
            .rescue-progress-bar-container {
                width: 100%;
                height: 16px;
                background-color: #e9ecef;
                border-radius: 8px;
                overflow: hidden;
                margin-bottom: 8px;
            }
            
            .rescue-progress-bar {
                height: 100%;
                background-color: #007bff;
                width: 0%;
                transition: width 0.3s;
            }
            
            .rescue-progress-status {
                font-size: 13px;
                text-align: center;
            }
            
            /* Systemverwaltung Tab */
            .rescue-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }
            
            .rescue-stat-card {
                background-color: white;
                border-radius: 4px;
                padding: 16px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                text-align: center;
            }
            
            .rescue-stat-value {
                font-size: 24px;
                font-weight: 600;
                color: #007bff;
                margin-bottom: 8px;
            }
            
            .rescue-stat-label {
                font-size: 14px;
                color: #6c757d;
            }
            
            .rescue-log-viewer {
                background-color: #212529;
                color: #fff;
                padding: 12px;
                border-radius: 4px;
                font-family: monospace;
                height: 300px;
                overflow-y: auto;
                margin-top: 12px;
            }
            
            .rescue-log-line {
                margin-bottom: 4px;
                line-height: 1.5;
            }
            
            .rescue-log-info {
                color: #17a2b8;
            }
            
            .rescue-log-warn {
                color: #ffc107;
            }
            
            .rescue-log-error {
                color: #dc3545;
            }
            
            .rescue-back-button {
                padding: 8px 16px;
                background-color: transparent;
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.5);
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
                display: flex;
                align-items: center;
            }
            
            .rescue-back-button:hover {
                background-color: rgba(255, 255, 255, 0.1);
            }
            
            .rescue-back-button i {
                margin-right: 6px;
            }
        `;
        document.head.appendChild(styleElement);
    }

    /**
     * Erstellt die Rettungs-UI für den Admin-Bereich
     */
    function createRescueAdminPanel(container) {
        console.warn('[Vue Rescue] Erstelle Rescue-Admin-Panel im Container:', {
            id: container.id,
            className: container.className
        });
        
        try {
            // Hauptcontainer
            const rescuePanel = document.createElement('div');
            rescuePanel.className = 'rescue-admin-view';
            rescuePanel.id = 'rescue-admin-panel-root';
            
            // Header
            const header = document.createElement('div');
            header.className = 'rescue-admin-header';
            header.innerHTML = `
                <h1><i class="fas fa-tools"></i> Admin-Bereich (Notfall-Modus)</h1>
                <button class="rescue-back-button" id="rescue-back-button">
                    <i class="fas fa-arrow-left"></i> Zurück zum Chat
                </button>
            `;
            
            console.warn('[Vue Rescue] Header erstellt');
            
            // Content-Bereich mit Navigation und Tab-Inhalt
            const content = document.createElement('div');
            content.className = 'rescue-admin-content';
            
            // Navigation
            const nav = document.createElement('div');
            nav.className = 'rescue-admin-nav';
            
            // Tabs für jeden Bereich erstellen
            config.tabs.forEach(tab => {
                const navItem = document.createElement('div');
                navItem.className = 'rescue-nav-item';
                navItem.setAttribute('data-tab', tab.id); // Explizit setAttribute verwenden
                navItem.innerHTML = `<i class="${tab.icon}"></i> ${tab.label}`;
                
                // Verwende eine benannte Funktion statt einer Arrow-Funktion
                function tabClickHandler() {
                    console.warn('[Vue Rescue] Tab geklickt:', tab.id);
                    showTab(tab.id);
                }
                
                navItem.addEventListener('click', tabClickHandler);
                nav.appendChild(navItem);
            });
            
            console.warn('[Vue Rescue] Navigation mit', config.tabs.length, 'Tabs erstellt');
            
            // Panel für Tab-Inhalte
            const panel = document.createElement('div');
            panel.className = 'rescue-admin-panel';
            panel.id = 'rescue-admin-content-panel';
            
            // Tab-Inhalte erstellen
            createTabContents(panel);
            
            console.warn('[Vue Rescue] Tab-Inhalte erstellt');
            
            // Zusammenfügen
            content.appendChild(nav);
            content.appendChild(panel);
            rescuePanel.appendChild(header);
            rescuePanel.appendChild(content);
            
            // Alte Rescue-Panel entfernen, falls vorhanden
            const oldPanel = document.getElementById('rescue-admin-panel-root');
            if (oldPanel) {
                console.warn('[Vue Rescue] Altes Rescue-Panel gefunden, entferne es');
                oldPanel.remove();
            }
            
            // In Container einfügen
            container.appendChild(rescuePanel);
            
            console.warn('[Vue Rescue] Admin-Panel in DOM eingefügt');
            
            // Zurück-Button-Funktionalität
            const backButton = document.getElementById('rescue-back-button');
            if (backButton) {
                backButton.addEventListener('click', function() {
                    console.warn('[Vue Rescue] Zurück-Button geklickt');
                    rescuePanel.remove();
                    rescueActive = false;
                    
                    // Versuche, zur vorherigen Ansicht zurückzukehren
                    if (window.history && window.history.back) {
                        window.history.back();
                    } else if (window.location.hash.includes('admin')) {
                        window.location.hash = '';
                    }
                });
                console.warn('[Vue Rescue] Zurück-Button-Funktionalität hinzugefügt');
            } else {
                console.warn('[Vue Rescue] Zurück-Button nicht gefunden!');
            }
            
            // Status-Update
            console.warn('[Vue Rescue] Rescue-Admin-Panel erfolgreich erstellt:', {
                'rescuePanelId': rescuePanel.id,
                'headerExists': !!document.querySelector('.rescue-admin-header'),
                'navExists': !!document.querySelector('.rescue-admin-nav'),
                'tabCount': document.querySelectorAll('.rescue-nav-item').length,
                'contentPanelExists': !!document.getElementById('rescue-admin-content-panel')
            });
            
            return true;
        } catch (error) {
            console.error('[Vue Rescue] Fehler beim Erstellen des Admin-Panels:', error);
            
            // Notfall-Fallback: Füge einen einfachen Text ein, damit der Benutzer weiß, dass etwas schief gelaufen ist
            container.innerHTML = `
                <div style="padding: 20px; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; margin: 20px;">
                    <h2 style="color: #721c24; margin-bottom: 10px;">Fehler beim Laden des Admin-Bereichs</h2>
                    <p>Es gab ein Problem beim Laden des Admin-Bereichs. Bitte versuchen Sie es später erneut oder laden Sie die Seite neu.</p>
                    <p style="font-size: 12px; margin-top: 10px;">Fehlermeldung: ${error.message}</p>
                    <button style="padding: 8px 16px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;" 
                            onclick="window.location.reload()">Seite neu laden</button>
                </div>
            `;
            
            return false;
        }
    }

    /**
     * Erstellt die Inhalte für alle Tabs
     */
    function createTabContents(container) {
        // Für jeden Tab einen Inhaltsbereich erstellen
        config.tabs.forEach(tab => {
            const tabContent = document.createElement('div');
            tabContent.className = 'rescue-tab-content';
            tabContent.id = `rescue-tab-${tab.id}`;
            
            // Je nach Tab-ID den entsprechenden Inhalt laden
            switch(tab.id) {
                case 'doc-converter':
                    tabContent.appendChild(createDocConverterContent());
                    break;
                case 'system':
                    tabContent.appendChild(createSystemContent());
                    break;
                case 'users':
                    tabContent.appendChild(createUsersContent());
                    break;
                case 'feedback':
                    tabContent.appendChild(createFeedbackContent());
                    break;
                case 'motd':
                    tabContent.appendChild(createMotdContent());
                    break;
                default:
                    tabContent.innerHTML = `<h2>Tab-Inhalt für "${tab.label}" wird geladen...</h2>`;
            }
            
            container.appendChild(tabContent);
        });
    }

    /**
     * Erstellt den Inhalt für den Dokument-Konverter-Tab
     */
    function createDocConverterContent() {
        const content = document.createElement('div');
        content.className = 'rescue-doc-converter';
        
        content.innerHTML = `
            <h2><i class="fas fa-file-alt"></i> Dokument-Konverter</h2>
            <p>Konvertieren Sie verschiedene Dokumentformate nach Markdown.</p>
            
            <div class="rescue-message warning">
                <strong>Hinweis:</strong> Sie verwenden den Notfall-Modus des Dokument-Konverters. Einige Funktionen könnten eingeschränkt sein.
            </div>
            
            <div class="rescue-section">
                <div class="rescue-section-title">Dokumente hochladen</div>
                <div class="rescue-dropzone" id="rescue-dropzone">
                    <i class="fas fa-cloud-upload-alt" style="font-size: 36px; margin-bottom: 16px;"></i>
                    <p>Ziehen Sie Dateien hierher oder klicken Sie zum Auswählen</p>
                    <input type="file" id="rescue-file-input" multiple style="display: none;">
                </div>
                
                <div class="rescue-file-list" id="rescue-file-list"></div>
            </div>
            
            <div class="rescue-section">
                <div class="rescue-section-title">Konvertierungsoptionen</div>
                <div class="rescue-options">
                    <div class="rescue-option-group">
                        <div class="rescue-option-title">Format-Optionen</div>
                        <div class="rescue-form-group">
                            <label class="rescue-label" for="rescue-format">Zielformat</label>
                            <select class="rescue-select" id="rescue-format">
                                <option value="markdown">Markdown</option>
                                <option value="html">HTML</option>
                                <option value="text">Nur Text</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="rescue-option-group">
                        <div class="rescue-option-title">Erweiterte Optionen</div>
                        <div class="rescue-form-group">
                            <label>
                                <input type="checkbox" class="rescue-checkbox" id="rescue-extract-tables"> 
                                Tabellen extrahieren
                            </label>
                        </div>
                        <div class="rescue-form-group">
                            <label>
                                <input type="checkbox" class="rescue-checkbox" id="rescue-preserve-images"> 
                                Bilder erhalten
                            </label>
                        </div>
                        <div class="rescue-form-group">
                            <label>
                                <input type="checkbox" class="rescue-checkbox" id="rescue-frontmatter"> 
                                YAML-Frontmatter hinzufügen
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="rescue-section">
                <button class="rescue-button" id="rescue-convert-button" disabled>Konvertierung starten</button>
                <button class="rescue-button secondary" id="rescue-clear-button" disabled>Auswahl leeren</button>
            </div>
            
            <div class="rescue-progress" id="rescue-progress">
                <div class="rescue-section-title">Konvertierungsfortschritt</div>
                <div class="rescue-progress-bar-container">
                    <div class="rescue-progress-bar" id="rescue-progress-bar"></div>
                </div>
                <div class="rescue-progress-status" id="rescue-progress-status">Initialisiere Konvertierung...</div>
            </div>
        `;
        
        // Event-Listener hinzufügen nachdem das DOM aktualisiert wurde
        setTimeout(() => {
            initializeDocConverterEvents();
        }, 0);
        
        return content;
    }
    
    /**
     * Initialisiert die Event-Listener für den Dokument-Konverter
     */
    function initializeDocConverterEvents() {
        const dropzone = document.getElementById('rescue-dropzone');
        const fileInput = document.getElementById('rescue-file-input');
        const fileList = document.getElementById('rescue-file-list');
        const convertButton = document.getElementById('rescue-convert-button');
        const clearButton = document.getElementById('rescue-clear-button');
        const progressContainer = document.getElementById('rescue-progress');
        const progressBar = document.getElementById('rescue-progress-bar');
        const progressStatus = document.getElementById('rescue-progress-status');
        
        if (!dropzone || !fileInput || !fileList || !convertButton || !clearButton) {
            log('Fehler: Nicht alle erforderlichen DOM-Elemente für Dokument-Konverter gefunden');
            return;
        }
        
        // Dateien-Array zur Verwaltung der hochgeladenen Dateien
        const files = [];
        
        // Datei-Liste updaten
        function updateFileList() {
            fileList.innerHTML = '';
            
            if (files.length === 0) {
                fileList.innerHTML = '<p>Keine Dateien ausgewählt</p>';
                return;
            }
            
            files.forEach((file, index) => {
                const fileItem = document.createElement('div');
                fileItem.className = 'rescue-file-item';
                
                // Dateigröße formatieren
                const fileSize = formatFileSize(file.size);
                
                fileItem.innerHTML = `
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${fileSize}</div>
                    </div>
                    <div class="file-actions">
                        <button class="rescue-button danger" data-index="${index}">Entfernen</button>
                    </div>
                `;
                
                // Event-Listener für Entfernen-Button
                const removeButton = fileItem.querySelector('.rescue-button.danger');
                removeButton.addEventListener('click', () => {
                    files.splice(index, 1);
                    updateFileList();
                    updateButtonState();
                });
                
                fileList.appendChild(fileItem);
            });
            
            updateButtonState();
        }
        
        // Button-Status aktualisieren
        function updateButtonState() {
            if (files.length > 0) {
                convertButton.disabled = false;
                clearButton.disabled = false;
            } else {
                convertButton.disabled = true;
                clearButton.disabled = true;
            }
        }
        
        // Event-Listener für Dropzone
        dropzone.addEventListener('click', () => {
            fileInput.click();
        });
        
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = '#007bff';
        });
        
        dropzone.addEventListener('dragleave', () => {
            dropzone.style.borderColor = '#ccc';
        });
        
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = '#ccc';
            
            if (e.dataTransfer.files.length > 0) {
                handleFiles(e.dataTransfer.files);
            }
        });
        
        // Event-Listener für Datei-Input
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                handleFiles(fileInput.files);
            }
        });
        
        // Event-Listener für Buttons
        clearButton.addEventListener('click', () => {
            files.length = 0;
            updateFileList();
        });
        
        convertButton.addEventListener('click', startConversion);
        
        // Dateien verarbeiten
        function handleFiles(newFiles) {
            Array.from(newFiles).forEach(file => {
                // Prüfen ob der Dateityp unterstützt wird
                if (isSupportedFileType(file.name)) {
                    files.push(file);
                } else {
                    showMessage('error', `Dateityp nicht unterstützt: ${file.name}`);
                }
            });
            
            updateFileList();
        }
        
        // Konvertierung starten
        function startConversion() {
            if (files.length === 0) {
                showMessage('error', 'Bitte laden Sie zuerst Dateien hoch.');
                return;
            }
            
            // Optionen sammeln
            const options = {
                format: document.getElementById('rescue-format').value,
                extractTables: document.getElementById('rescue-extract-tables').checked,
                preserveImages: document.getElementById('rescue-preserve-images').checked,
                addFrontmatter: document.getElementById('rescue-frontmatter').checked
            };
            
            log('Starte Konvertierung mit Optionen:', options);
            
            // Fortschrittsanzeige initialisieren
            progressContainer.classList.add('active');
            progressBar.style.width = '0%';
            progressStatus.textContent = 'Vorbereitung...';
            
            // Formular vorbereiten
            const formData = new FormData();
            files.forEach(file => {
                formData.append('files', file);
            });
            
            // Optionen anhängen
            Object.entries(options).forEach(([key, value]) => {
                formData.append(key, value);
            });
            
            // Fortschritts-Simulation (da keine echte API-Verbindung)
            simulateConversionProgress();
        }
        
        // Fortschritts-Simulation
        function simulateConversionProgress() {
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 10;
                
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                    
                    progressBar.style.width = '100%';
                    progressStatus.textContent = 'Konvertierung abgeschlossen!';
                    
                    // Nachricht anzeigen
                    showMessage('success', 'Alle Dateien wurden erfolgreich konvertiert.');
                    
                    // Nach 2 Sekunden die Progress-Bar zurücksetzen
                    setTimeout(() => {
                        progressContainer.classList.remove('active');
                    }, 2000);
                } else {
                    progressBar.style.width = `${progress}%`;
                    
                    // Status-Text abhängig vom Fortschritt
                    if (progress < 20) {
                        progressStatus.textContent = 'Lese Dateien...';
                    } else if (progress < 50) {
                        progressStatus.textContent = 'Extrahiere Inhalte...';
                    } else if (progress < 80) {
                        progressStatus.textContent = 'Formatiere Dokumente...';
                    } else {
                        progressStatus.textContent = 'Speichere Ergebnisse...';
                    }
                }
            }, 300);
        }
        
        // Hilfsfunktion: Dateigröße formatieren
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            
            return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        // Hilfsfunktion: Prüft ob der Dateityp unterstützt wird
        function isSupportedFileType(filename) {
            const supportedExtensions = ['.docx', '.pdf', '.html', '.md', '.pptx', '.xlsx', '.txt'];
            const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
            
            return supportedExtensions.includes(extension);
        }
        
        // Hilfsfunktion: Zeigt eine Nachricht an
        function showMessage(type, text) {
            // Bestehende Nachricht entfernen
            const existingMessage = document.querySelector('.rescue-message');
            if (existingMessage) {
                existingMessage.remove();
            }
            
            // Neue Nachricht erstellen
            const message = document.createElement('div');
            message.className = `rescue-message ${type}`;
            message.textContent = text;
            
            // Nach der Dropzone einfügen
            dropzone.parentNode.insertBefore(message, dropzone.nextSibling);
            
            // Nach 5 Sekunden ausblenden
            setTimeout(() => {
                message.style.opacity = '0';
                setTimeout(() => message.remove(), 300);
            }, 5000);
        }
    }

    /**
     * Erstellt den Inhalt für den System-Tab
     */
    function createSystemContent() {
        const content = document.createElement('div');
        content.innerHTML = `
            <h2><i class="fas fa-server"></i> Systemverwaltung</h2>
            <p>Überwachen und verwalten Sie Systemressourcen.</p>
            
            <div class="rescue-message warning">
                <strong>Hinweis:</strong> Sie verwenden den Notfall-Modus der Systemverwaltung. Echte Systemdaten können nicht abgerufen werden.
            </div>
            
            <div class="rescue-section">
                <div class="rescue-section-title">System-Status</div>
                
                <div class="rescue-stats-grid">
                    <div class="rescue-stat-card">
                        <div class="rescue-stat-value">87%</div>
                        <div class="rescue-stat-label">CPU-Auslastung</div>
                    </div>
                    <div class="rescue-stat-card">
                        <div class="rescue-stat-value">6.2 GB</div>
                        <div class="rescue-stat-label">RAM-Nutzung</div>
                    </div>
                    <div class="rescue-stat-card">
                        <div class="rescue-stat-value">68.7 GB</div>
                        <div class="rescue-stat-label">Speicherplatz</div>
                    </div>
                    <div class="rescue-stat-card">
                        <div class="rescue-stat-value">6h 42m</div>
                        <div class="rescue-stat-label">Uptime</div>
                    </div>
                </div>
                
                <div class="rescue-section">
                    <div class="rescue-section-title">System-Aktionen</div>
                    <button class="rescue-button" id="rescue-refresh-button">Statistiken aktualisieren</button>
                    <button class="rescue-button secondary" id="rescue-restart-services">Dienste neustarten</button>
                    <button class="rescue-button danger" id="rescue-clear-cache">Cache leeren</button>
                </div>
            </div>
            
            <div class="rescue-section">
                <div class="rescue-section-title">System-Logs</div>
                <div class="rescue-log-viewer">
                    <div class="rescue-log-line rescue-log-info">[2023-05-15 08:12:33] [INFO] Server gestartet auf Port 8080</div>
                    <div class="rescue-log-line rescue-log-info">[2023-05-15 08:12:35] [INFO] Datenbank-Verbindung hergestellt</div>
                    <div class="rescue-log-line rescue-log-warn">[2023-05-15 08:15:42] [WARN] CPU-Auslastung über 80%</div>
                    <div class="rescue-log-line rescue-log-info">[2023-05-15 08:18:15] [INFO] Benutzeranmeldung: admin</div>
                    <div class="rescue-log-line rescue-log-warn">[2023-05-15 08:23:10] [WARN] Langsame Abfrage (>1s): SELECT * FROM documents WHERE...</div>
                    <div class="rescue-log-line rescue-log-error">[2023-05-15 08:25:33] [ERROR] Verbindung zur Datenbank unterbrochen</div>
                    <div class="rescue-log-line rescue-log-info">[2023-05-15 08:25:36] [INFO] Datenbank-Verbindung wiederhergestellt</div>
                    <div class="rescue-log-line rescue-log-info">[2023-05-15 08:30:22] [INFO] Dokument-Konvertierung abgeschlossen: document1.docx</div>
                    <div class="rescue-log-line rescue-log-info">[2023-05-15 08:35:15] [INFO] Benutzerabmeldung: admin</div>
                    <div class="rescue-log-line rescue-log-info">[2023-05-15 08:40:01] [INFO] Automatisches Backup gestartet</div>
                    <div class="rescue-log-line rescue-log-info">[2023-05-15 08:42:15] [INFO] Backup abgeschlossen</div>
                </div>
            </div>
        `;
        
        return content;
    }

    /**
     * Erstellt den Inhalt für den Benutzer-Tab
     */
    function createUsersContent() {
        const content = document.createElement('div');
        content.innerHTML = `
            <h2><i class="fas fa-users"></i> Benutzerverwaltung</h2>
            <p>Verwalten Sie Benutzer und Berechtigungen.</p>
            
            <div class="rescue-message warning">
                <strong>Hinweis:</strong> Sie verwenden den Notfall-Modus der Benutzerverwaltung. Eingeschränkter Funktionsumfang verfügbar.
            </div>
            
            <div class="rescue-section">
                <div class="rescue-section-title">Benutzerliste</div>
                <table style="width:100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f8f9fa; text-align: left;">
                            <th style="padding: 10px; border-bottom: 1px solid #dee2e6;">Benutzername</th>
                            <th style="padding: 10px; border-bottom: 1px solid #dee2e6;">E-Mail</th>
                            <th style="padding: 10px; border-bottom: 1px solid #dee2e6;">Rolle</th>
                            <th style="padding: 10px; border-bottom: 1px solid #dee2e6;">Status</th>
                            <th style="padding: 10px; border-bottom: 1px solid #dee2e6;">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">admin</td>
                            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">admin@example.com</td>
                            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">Administrator</td>
                            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><span style="color: #28a745;">Aktiv</span></td>
                            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                                <button class="rescue-button secondary" style="padding: 4px 8px; font-size: 12px;">Bearbeiten</button>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">max.mustermann</td>
                            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">max@example.com</td>
                            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">Benutzer</td>
                            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><span style="color: #28a745;">Aktiv</span></td>
                            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                                <button class="rescue-button secondary" style="padding: 4px 8px; font-size: 12px;">Bearbeiten</button>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">erika.musterfrau</td>
                            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">erika@example.com</td>
                            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">Editor</td>
                            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><span style="color: #dc3545;">Inaktiv</span></td>
                            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                                <button class="rescue-button secondary" style="padding: 4px 8px; font-size: 12px;">Bearbeiten</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        
        return content;
    }

    /**
     * Erstellt den Inhalt für den Feedback-Tab
     */
    function createFeedbackContent() {
        const content = document.createElement('div');
        content.innerHTML = `
            <h2><i class="fas fa-comment"></i> Feedback-Verwaltung</h2>
            <p>Verwalten und beantworten Sie Benutzer-Feedback.</p>
            
            <div class="rescue-message warning">
                <strong>Hinweis:</strong> Sie verwenden den Notfall-Modus der Feedback-Verwaltung. Eingeschränkter Funktionsumfang verfügbar.
            </div>
            
            <div class="rescue-section">
                <div class="rescue-section-title">Feedback-Übersicht</div>
                
                <div style="margin-bottom: 20px;">
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between;">
                            <strong>Max Mustermann</strong>
                            <span style="color: #6c757d;">15.05.2023, 10:32</span>
                        </div>
                        <div style="margin: 10px 0;">
                            Die Dokument-Konvertierung ist super, aber es wäre toll, wenn man mehrere Dateien gleichzeitig hochladen könnte.
                        </div>
                        <div>
                            <span style="background-color: #17a2b8; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">Verbesserungsvorschlag</span>
                            <span style="background-color: #28a745; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">Dokument-Konverter</span>
                        </div>
                    </div>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between;">
                            <strong>Erika Musterfrau</strong>
                            <span style="color: #6c757d;">14.05.2023, 16:15</span>
                        </div>
                        <div style="margin: 10px 0;">
                            Ich erhalte eine Fehlermeldung beim Versuch, eine PPTX-Datei zu konvertieren. Die Anwendung friert ein.
                        </div>
                        <div>
                            <span style="background-color: #dc3545; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">Fehler</span>
                            <span style="background-color: #28a745; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">Dokument-Konverter</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return content;
    }

    /**
     * Erstellt den Inhalt für den MOTD-Tab
     */
    function createMotdContent() {
        const content = document.createElement('div');
        content.innerHTML = `
            <h2><i class="fas fa-bullhorn"></i> Nachrichtenverwaltung</h2>
            <p>Erstellen und verwalten Sie Nachrichten des Tages (MOTD).</p>
            
            <div class="rescue-message warning">
                <strong>Hinweis:</strong> Sie verwenden den Notfall-Modus der Nachrichtenverwaltung. Eingeschränkter Funktionsumfang verfügbar.
            </div>
            
            <div class="rescue-section">
                <div class="rescue-section-title">Aktuelle Nachricht</div>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                    <div style="font-weight: bold; margin-bottom: 5px;">Wartungsarbeiten am 20.05.2023</div>
                    <div>
                        Sehr geehrte Benutzer,<br><br>
                        wir führen am <strong>20.05.2023 von 18:00 bis 20:00 Uhr</strong> Wartungsarbeiten durch. 
                        In diesem Zeitraum kann es zu kurzen Unterbrechungen der Systemverfügbarkeit kommen.<br><br>
                        Wir bitten um Ihr Verständnis.<br>
                        Ihr System-Team
                    </div>
                </div>
            </div>
            
            <div class="rescue-section">
                <div class="rescue-section-title">Neue Nachricht erstellen</div>
                
                <div class="rescue-form-group">
                    <label class="rescue-label" for="rescue-motd-title">Titel</label>
                    <input type="text" id="rescue-motd-title" style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">
                </div>
                
                <div class="rescue-form-group">
                    <label class="rescue-label" for="rescue-motd-content">Inhalt</label>
                    <textarea class="rescue-textarea" id="rescue-motd-content"></textarea>
                </div>
                
                <div class="rescue-form-group">
                    <button class="rescue-button">Nachricht speichern</button>
                </div>
            </div>
        `;
        
        return content;
    }

    /**
     * Zeigt einen Tab an und versteckt alle anderen
     */
    function showTab(tabId) {
        log('Wechsle zu Tab:', tabId);
        console.warn('[Vue Rescue] Tab-Wechsel zu:', tabId);
        
        try {
            // Status vor Tab-Wechsel protokollieren
            console.warn('[Vue Rescue] Tab-Status vorher:', {
                'currentTab': currentTab,
                'navItems': document.querySelectorAll('.rescue-nav-item').length,
                'tabContents': document.querySelectorAll('.rescue-tab-content').length,
                'activeNav': document.querySelectorAll('.rescue-nav-item.active').length,
                'activeContent': document.querySelectorAll('.rescue-tab-content.active').length
            });
            
            // Aktiven Tab in Navigation markieren
            const navItems = document.querySelectorAll('.rescue-nav-item');
            console.warn('[Vue Rescue] Gefundene Nav-Items:', navItems.length);
            
            // Protokolliere gefundene Nav-Items und ihre data-tab Attribute
            const navItemsData = Array.from(navItems).map(item => ({
                dataTab: item.getAttribute('data-tab'),
                isActive: item.classList.contains('active'),
                isMatch: item.getAttribute('data-tab') === tabId
            }));
            console.warn('[Vue Rescue] Nav-Items Details:', navItemsData);
            
            // Aktiviere den richtigen Tab
            navItems.forEach(item => {
                const itemTabId = item.getAttribute('data-tab');
                if (itemTabId === tabId) {
                    item.classList.add('active');
                    console.warn('[Vue Rescue] Tab aktiviert:', itemTabId);
                } else {
                    item.classList.remove('active');
                }
            });
            
            // Tab-Inhalte ein-/ausblenden
            const tabContents = document.querySelectorAll('.rescue-tab-content');
            console.warn('[Vue Rescue] Gefundene Tab-Inhalte:', tabContents.length);
            
            // Protokolliere gefundene Tab-Inhalte und ihre IDs
            const tabContentsData = Array.from(tabContents).map(content => ({
                id: content.id,
                isActive: content.classList.contains('active'),
                isMatch: content.id === `rescue-tab-${tabId}`,
                expectedId: `rescue-tab-${tabId}`
            }));
            console.warn('[Vue Rescue] Tab-Inhalte Details:', tabContentsData);
            
            // Aktiviere den richtigen Inhalt
            let contentFound = false;
            tabContents.forEach(content => {
                if (content.id === `rescue-tab-${tabId}`) {
                    content.classList.add('active');
                    contentFound = true;
                    console.warn('[Vue Rescue] Tab-Inhalt aktiviert:', content.id);
                } else {
                    content.classList.remove('active');
                }
            });
            
            // Prüfe, ob der Tab-Inhalt gefunden wurde
            if (!contentFound) {
                console.warn('[Vue Rescue] WARNUNG: Tab-Inhalt nicht gefunden für ID:', `rescue-tab-${tabId}`);
                
                // Versuche eine weniger strenge Suche
                const alternativeContent = document.querySelector(`[id*="${tabId}"]`);
                if (alternativeContent) {
                    console.warn('[Vue Rescue] Alternativer Tab-Inhalt gefunden:', alternativeContent.id);
                    alternativeContent.classList.add('active');
                }
            }
            
            // Status nach Tab-Wechsel protokollieren
            console.warn('[Vue Rescue] Tab-Status nachher:', {
                'currentTab': tabId,
                'activeNav': document.querySelectorAll('.rescue-nav-item.active').length,
                'activeContent': document.querySelectorAll('.rescue-tab-content.active').length
            });
            
            currentTab = tabId;
            return true;
        } catch (error) {
            console.error('[Vue Rescue] Fehler beim Tab-Wechsel:', error);
            return false;
        }
    }

    /**
     * Überwacht den Admin-Button, um den Rettungsmodus bei Klick zu aktivieren
     */
    function setupAdminButtonListener() {
        log('Suche nach Admin-Button...');
        
        // Suche nach verschiedenen möglichen Selektoren für den Admin-Button
        const adminButtonSelectors = [
            'button[title="Systemadministration"]',
            '.admin-button',
            '[data-action="admin"]',
            'button[data-view="admin"]',
            '.admin-icon',
            'button.admin',
            'a[href="#admin"]',
            'button.navbar-button-admin'
        ];
        
        // Protokolliere, welche Selektoren gefunden wurden
        const foundSelectors = adminButtonSelectors.map(selector => {
            const found = document.querySelector(selector) !== null;
            return { selector, found };
        });
        
        console.warn('[Vue Rescue] Admin-Button Selektoren:', foundSelectors);
        
        // Versuche, einen der Buttons zu finden
        let adminButton = null;
        for (const selector of adminButtonSelectors) {
            const button = document.querySelector(selector);
            if (button) {
                adminButton = button;
                console.warn('[Vue Rescue] Admin-Button gefunden mit Selektor:', selector);
                break;
            }
        }
        
        // Alternativ nach Icon-Buttons suchen, die den Admin-Bereich öffnen könnten
        if (!adminButton) {
            const allButtons = document.querySelectorAll('button');
            console.warn('[Vue Rescue] Insgesamt gefundene Buttons:', allButtons.length);
            
            // Protokolliere die ersten 5 Buttons für Debugging
            if (allButtons.length > 0) {
                const buttonSample = Array.from(allButtons).slice(0, 5);
                console.warn('[Vue Rescue] Button-Stichprobe:', buttonSample.map(btn => ({
                    textContent: btn.textContent.trim(),
                    class: btn.className,
                    id: btn.id,
                    title: btn.title
                })));
            }
        }
        
        if (adminButton) {
            log('Admin-Button gefunden, füge Click-Handler hinzu');
            console.warn('[Vue Rescue] Füge Click-Handler zu Admin-Button hinzu:', {
                text: adminButton.textContent.trim(),
                class: adminButton.className,
                id: adminButton.id
            });
            
            // Event-Listening für Klick
            adminButton.addEventListener('click', () => {
                log('Admin-Button geklickt');
                console.warn('[Vue Rescue] Admin-Button wurde geklickt');
                
                // DOM vor dem Timeout prüfen
                console.warn('[Vue Rescue] DOM vor Timeout:', {
                    'adminViewExists': document.querySelector('.admin-view') !== null,
                    'adminPanelContentExists': document.querySelectorAll('.admin-panel-content').length
                });
                
                // Warte kurz, um zu sehen, ob Vue.js die Admin-Ansicht korrekt initialisiert
                setTimeout(() => {
                    console.warn('[Vue Rescue] DOM nach Timeout:', {
                        'adminViewExists': document.querySelector('.admin-view') !== null,
                        'adminPanelContentExists': document.querySelectorAll('.admin-panel-content').length
                    });
                    
                    if (!checkVueInitialization()) {
                        log('Admin-Ansicht wurde nicht korrekt initialisiert, aktiviere Rettungsmodus');
                        console.warn('[Vue Rescue] Aktiviere Rettungsmodus nach Admin-Button-Klick');
                        activateRescueMode();
                    } else {
                        console.warn('[Vue Rescue] Vue.js wurde erfolgreich initialisiert nach Admin-Button-Klick');
                    }
                }, 500);
            });
        } else {
            log('Admin-Button nicht gefunden, prüfe erneut später');
            console.warn('[Vue Rescue] Admin-Button nicht gefunden, versuche erneut später');
            
            // Erneut versuchen, falls der Button noch nicht existiert
            setTimeout(setupAdminButtonListener, 1000);
        }
    }

    /**
     * Initialisierung des Vue Rescue Systems
     */
    function initializeRescueSystem() {
        log('Initialisiere Rettungssystem...');
        
        // Debug: Protokolliere aktuelle URL und Hash
        console.warn('[Vue Rescue] Startup Debug:', {
            'URL': window.location.href,
            'hash': window.location.hash,
            'pathname': window.location.pathname,
            'search': window.location.search,
            'appState': window.app ? 'vorhanden' : 'nicht gefunden',
            'vueState': window.Vue ? 'vorhanden' : 'nicht gefunden',
            'docConverter': window.docConverter ? 'vorhanden' : 'nicht gefunden',
            'featureToggle': window.featureToggleStore ? 'vorhanden' : 'nicht gefunden'
        });
        
        // Liste vorhandene CSS-Klassen im body-Element
        if (document.body) {
            console.warn('[Vue Rescue] Body-Klassen:', document.body.className);
        }
        
        // Event-Listener für Admin-Button einrichten
        setupAdminButtonListener();
        
        // Protokolliere DOM-Zustand vor Verzögerung
        console.warn('[Vue Rescue] DOM vor Verzögerung:', {
            'adminPanelExists': document.querySelector('.admin-panel') !== null,
            'adminContainerExists': document.getElementById('admin-container') !== null,
            'adminViewExists': document.querySelector('.admin-view') !== null,
            'docConverterExists': document.getElementById('doc-converter-app') !== null || document.getElementById('doc-converter-container') !== null
        });
        
        // Verzögerte Prüfung auf Vue.js-Initialisierung
        setTimeout(() => {
            console.warn('[Vue Rescue] Verzögerte Initialisierungsprüfung nach ' + config.initCheckDelay + 'ms');
            
            // Protokolliere DOM-Zustand nach Verzögerung
            console.warn('[Vue Rescue] DOM nach Verzögerung:', {
                'adminPanelExists': document.querySelector('.admin-panel') !== null,
                'adminContainerExists': document.getElementById('admin-container') !== null,
                'adminViewExists': document.querySelector('.admin-view') !== null,
                'docConverterExists': document.getElementById('doc-converter-app') !== null || document.getElementById('doc-converter-container') !== null
            });
            
            const isVueInitialized = checkVueInitialization();
            
            if (!isVueInitialized) {
                log('Vue.js wurde nicht korrekt initialisiert, aktiviere Rettungsmodus');
                
                // Prüfe verschiedene Indikatoren für einen aktiven Admin-Bereich
                const adminIndicators = [
                    { name: '.admin-view', found: document.querySelector('.admin-view') !== null },
                    { name: '#admin-container', found: document.getElementById('admin-container') !== null },
                    { name: '[data-view="admin"]', found: document.querySelector('[data-view="admin"]') !== null },
                    { name: '.admin-panel', found: document.querySelector('.admin-panel') !== null },
                    { name: '.admin-content', found: document.querySelector('.admin-content') !== null },
                    { name: '#admin-app', found: document.getElementById('admin-app') !== null },
                    { name: 'URL contains admin', found: window.location.href.includes('admin') },
                    { name: 'Hash contains admin', found: window.location.hash.includes('admin') }
                ];
                
                console.warn('[Vue Rescue] Admin-Indikatoren:', adminIndicators);
                
                // Prüfe, ob die Admin-Ansicht aktuell angezeigt wird
                const adminView = document.querySelector('.admin-view') || 
                                 document.getElementById('admin-container') ||
                                 document.querySelector('[data-view="admin"]');
                
                // Prüfe, ob der Admin aktiv ist oder wir auf der Admin-Seite sind
                let isAdminActive = adminView && (
                    adminView.style.display !== 'none' || 
                    document.location.hash.includes('admin') ||
                    document.querySelector('.admin-active') !== null
                );
                
                // Wenn wir auf einer Admin-URL sind, betrachten wir Admin als aktiv
                if (window.location.href.includes('admin')) {
                    isAdminActive = true;
                    console.warn('[Vue Rescue] Admin als aktiv erkannt über URL-Check');
                }
                
                // Prüfe, ob der DocConverter aktiv sein könnte
                if (window.location.href.includes('doc-converter') || 
                    document.getElementById('doc-converter-app') || 
                    document.getElementById('doc-converter-container')) {
                    console.warn('[Vue Rescue] DocConverter-Bereich erkannt');
                    isAdminActive = true;
                }
                
                if (isAdminActive) {
                    log('Admin-Ansicht ist aktiv, aktiviere Rettungsmodus');
                    activateRescueMode();
                } else {
                    log('Admin-Ansicht ist nicht aktiv, warte auf Benutzeraktion');
                }
            } else {
                log('Vue.js wurde korrekt initialisiert, kein Rettungsmodus notwendig');
            }
        }, config.initCheckDelay);
        
        // 5 Sekunden Timercheck zur Diagnose
        setTimeout(() => {
            console.warn('[Vue Rescue] 5-Sekunden Status-Check:', {
                'vueFehler': !checkVueInitialization(),
                'rescueActive': rescueActive,
                'adminBereichAktiv': document.querySelector('.admin-view') !== null,
                'docConverterAktiv': document.getElementById('doc-converter-app') !== null || document.getElementById('doc-converter-container') !== null
            });
        }, 5000);
        
        // Wiederholte Prüfung für den Fall, dass die Admin-Ansicht später geöffnet wird
        setInterval(() => {
            if (rescueActive) return; // Nichts tun, wenn Rettungsmodus bereits aktiv
            
            // Prüfe, ob wir uns in der Admin-Ansicht befinden, aber Vue nicht initialisiert ist
            const adminView = document.querySelector('.admin-view') || 
                             document.getElementById('admin-container') ||
                             document.querySelector('[data-view="admin"]');
                             
            const isAdminActive = adminView && (
                adminView.style.display !== 'none' || 
                document.location.hash.includes('admin') ||
                document.querySelector('.admin-active') !== null
            );
            
            // Auch prüfen, ob der DocConverter aktiv ist
            const isDocConverterActive = 
                document.getElementById('doc-converter-app') !== null || 
                document.getElementById('doc-converter-container') !== null;
            
            if ((isAdminActive || isDocConverterActive) && !checkVueInitialization()) {
                log('Admin-Ansicht oder DocConverter wurde aktiviert, aber Vue.js nicht initialisiert. Aktiviere Rettungsmodus.');
                activateRescueMode();
            }
        }, 2000); // Alle 2 Sekunden prüfen
    }

    // Globale Fehlerbehandlung für Vue.js hinzufügen
    function addGlobalErrorHandling() {
        // Globaler Error-Handler, der auf Vue-related Fehler hört
        window.addEventListener('error', (event) => {
            const errorMsg = event.message || '';
            const errorSrc = event.filename || '';
            
            // Zeige spezifische Vue.js bezogene Fehler
            const isVueError = errorMsg.includes('Vue') || 
                            errorMsg.includes('vue') || 
                            errorSrc.includes('vue');
                            
            if (isVueError) {
                console.error('[Vue Rescue] Vue.js Fehler erkannt:', {
                    message: errorMsg,
                    file: errorSrc,
                    line: event.lineno,
                    col: event.colno
                });
                
                // Nur im Notfall starten, wenn nicht bereits aktiv
                if (!rescueActive && document.querySelector('#app')) {
                    setTimeout(() => {
                        console.warn('[Vue Rescue] Starte Notfallmodus wegen Vue.js Fehler');
                        activateRescueMode();
                    }, 100);
                }
            }
        });
        
        // Promise-Fehler abfangen
        window.addEventListener('unhandledrejection', (event) => {
            const errorMsg = event.reason?.message || event.reason || '';
            
            if (typeof errorMsg === 'string' && (errorMsg.includes('Vue') || errorMsg.includes('vue'))) {
                console.error('[Vue Rescue] Vue.js Promise-Fehler erkannt:', errorMsg);
                
                // Nur im Notfall starten, wenn nicht bereits aktiv
                if (!rescueActive && document.querySelector('#app')) {
                    setTimeout(() => {
                        console.warn('[Vue Rescue] Starte Notfallmodus wegen Vue.js Promise-Fehler');
                        activateRescueMode();
                    }, 100);
                }
            }
        });
    }
    
    // Füge HTML-Fehlerprüfung hinzu
    function checkHtmlStructure() {
        try {
            // Überprüfe, ob das app-Div existiert
            const appDiv = document.getElementById('app');
            if (!appDiv) {
                console.error('[Vue Rescue] Kritischer Fehler: #app-Element nicht gefunden');
                return false;
            }
            
            // Überprüfe auf versteckte Vue-Fehler
            if (appDiv.innerHTML.includes('Komponente wird geladen')) {
                console.warn('[Vue Rescue] App zeigt Ladeindikator, könnte feststecken');
            }
            
            // Prüfe auf Vue-Instanzierung-Problem
            if (typeof Vue === 'undefined') {
                console.error('[Vue Rescue] Vue ist nicht definiert');
                return false;
            }
            
            // Prüfe auf kritischen Fehler im Frontend
            const errorContainer = document.querySelector('.error-container');
            if (errorContainer) {
                console.error('[Vue Rescue] Frontend-Fehler gefunden:', errorContainer.textContent);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('[Vue Rescue] Fehler bei HTML-Struktur-Prüfung:', error);
            return false;
        }
    }
    
    // Notfall-Frontend-Fix - Versuche die gesamte Anwendung zu reparieren
    function emergencyFrontendFix() {
        console.warn('[Vue Rescue] Notfall-Frontend-Fix wird gestartet');
        
        // Versuche, einen Login-Screen anzuzeigen, wenn der Benutzer nicht angemeldet ist
        const appDiv = document.getElementById('app');
        if (appDiv) {
            // Prüfen, ob ein Token existiert
            const hasToken = localStorage.getItem('token');
            
            if (!hasToken) {
                console.warn('[Vue Rescue] Kein Token gefunden, zeige Notfall-Login-Screen');
                appDiv.innerHTML = `
                <div style="max-width: 400px; margin: 50px auto; padding: 20px; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); border-radius: 8px;">
                    <h2 style="text-align: center; margin-bottom: 20px;">Anmeldung (Notfall-Modus)</h2>
                    <p style="color: #721c24; background: #f8d7da; padding: 10px; border-radius: 4px; margin-bottom: 20px;">
                        Es gibt technische Probleme mit der Benutzeroberfläche. Sie können sich trotzdem anmelden.
                    </p>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">E-Mail:</label>
                        <input type="email" id="rescue-email" style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Passwort:</label>
                        <input type="password" id="rescue-password" style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">
                    </div>
                    <button id="rescue-login-button" style="width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                        Anmelden
                    </button>
                    <div id="rescue-login-error" style="color: #721c24; margin-top: 10px; display: none;"></div>
                </div>
                `;
                
                // Login-Logik hinzufügen
                setTimeout(() => {
                    const loginButton = document.getElementById('rescue-login-button');
                    if (loginButton) {
                        loginButton.addEventListener('click', async () => {
                            try {
                                const email = document.getElementById('rescue-email').value;
                                const password = document.getElementById('rescue-password').value;
                                const errorDiv = document.getElementById('rescue-login-error');
                                
                                if (!email || !password) {
                                    errorDiv.textContent = 'Bitte E-Mail und Passwort eingeben.';
                                    errorDiv.style.display = 'block';
                                    return;
                                }
                                
                                // Login-Button Zustand ändern
                                loginButton.textContent = 'Anmeldung...';
                                loginButton.disabled = true;
                                
                                // Login-Anfrage senden
                                const response = await fetch('/api/auth/login', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ email, password })
                                });
                                
                                const data = await response.json();
                                
                                if (!response.ok) {
                                    throw new Error(data.detail || 'Anmeldefehler');
                                }
                                
                                // Token speichern
                                localStorage.setItem('token', data.token);
                                
                                // Seite neu laden, um mit Token zu starten
                                window.location.reload();
                            } catch (error) {
                                const errorDiv = document.getElementById('rescue-login-error');
                                errorDiv.textContent = error.message || 'Anmeldefehler. Bitte versuchen Sie es erneut.';
                                errorDiv.style.display = 'block';
                                
                                // Login-Button zurücksetzen
                                loginButton.textContent = 'Anmelden';
                                loginButton.disabled = false;
                            }
                        });
                    }
                }, 100);
            } else {
                // Benutzer ist angemeldet, zeige eine einfache Chat-Oberfläche
                console.warn('[Vue Rescue] Token gefunden, zeige Notfall-Chat-UI');
                appDiv.innerHTML = `
                <div style="display: flex; height: 100vh; background: #f5f5f5;">
                    <!-- Sidebar -->
                    <div style="width: 280px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column;">
                        <div style="padding: 15px; border-bottom: 1px solid #e2e8f0;">
                            <button id="rescue-new-chat" style="width: 100%; padding: 8px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                <i class="fas fa-plus"></i> Neue Unterhaltung
                            </button>
                        </div>
                        
                        <div id="rescue-sessions-list" style="flex: 1; overflow-y: auto; padding: 10px;"></div>
                        
                        <div style="padding: 15px; border-top: 1px solid #e2e8f0;">
                            <button id="rescue-admin-button" style="width: 100%; padding: 8px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 8px;">
                                <i class="fas fa-cog"></i> Administration
                            </button>
                            <button id="rescue-logout" style="width: 100%; padding: 8px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                <i class="fas fa-sign-out-alt"></i> Abmelden
                            </button>
                        </div>
                    </div>
                    
                    <!-- Main Content -->
                    <div style="flex: 1; display: flex; flex-direction: column;">
                        <div id="rescue-messages" style="flex: 1; overflow-y: auto; padding: 20px;"></div>
                        
                        <div style="border-top: 1px solid #e2e8f0; padding: 15px; background: white;">
                            <div style="display: flex;">
                                <textarea id="rescue-question" style="flex: 1; padding: 10px; border: 1px solid #ced4da; border-radius: 4px; resize: none; min-height: 80px;" placeholder="Nachricht eingeben..."></textarea>
                                <button id="rescue-send" style="margin-left: 10px; padding: 0 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                    <i class="fas fa-paper-plane"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                `;
                
                // Chat-Funktionalität initialisieren
                setTimeout(() => {
                    initEmergencyChatFunctionality();
                }, 100);
            }
        }
    }
    
    // Notfall-Chat-Funktionalität
    function initEmergencyChatFunctionality() {
        // Variablen für die Chat-Funktionalität
        let sessions = [];
        let currentSessionId = null;
        let messages = [];
        
        // DOM-Elemente
        const sessionsListElement = document.getElementById('rescue-sessions-list');
        const messagesElement = document.getElementById('rescue-messages');
        const questionElement = document.getElementById('rescue-question');
        const sendButton = document.getElementById('rescue-send');
        const newChatButton = document.getElementById('rescue-new-chat');
        const adminButton = document.getElementById('rescue-admin-button');
        const logoutButton = document.getElementById('rescue-logout');
        
        // Axios mit Token konfigurieren
        const token = localStorage.getItem('token');
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Sessions laden
        const loadSessions = async () => {
            try {
                const response = await axios.get('/api/sessions');
                sessions = response.data.sessions;
                renderSessions();
            } catch (error) {
                console.error('Fehler beim Laden der Sessions:', error);
            }
        };
        
        // Session laden
        const loadSession = async (sessionId) => {
            try {
                const response = await axios.get(`/api/session/${sessionId}`);
                currentSessionId = sessionId;
                messages = response.data.messages;
                renderMessages();
                
                // Im localStorage speichern
                localStorage.setItem('lastActiveSession', sessionId);
            } catch (error) {
                console.error('Fehler beim Laden der Session:', error);
            }
        };
        
        // Neue Session starten
        const startNewSession = async () => {
            try {
                const response = await axios.post('/api/session', {
                    title: "Neue Unterhaltung"
                });
                
                await loadSessions();
                await loadSession(response.data.session_id);
            } catch (error) {
                console.error('Fehler beim Starten einer neuen Session:', error);
            }
        };
        
        // Nachrichten anzeigen
        const renderMessages = () => {
            if (!messagesElement) return;
            
            messagesElement.innerHTML = '';
            
            // MOTD anzeigen, wenn keine Nachrichten vorhanden sind
            if (messages.length === 0) {
                const motdDismissed = localStorage.getItem('motdDismissed') === 'true';
                
                if (!motdDismissed) {
                    axios.get('/api/motd').then(response => {
                        const motd = response.data;
                        
                        if (motd && motd.active && motd.content) {
                            const motdElement = document.createElement('div');
                            motdElement.style.padding = '15px';
                            motdElement.style.border = '1px solid ' + (motd.style?.borderColor || '#ffeeba');
                            motdElement.style.backgroundColor = motd.style?.backgroundColor || '#fff3cd';
                            motdElement.style.color = motd.style?.textColor || '#856404';
                            motdElement.style.borderRadius = '4px';
                            motdElement.style.marginBottom = '20px';
                            motdElement.style.position = 'relative';
                            
                            const closeButton = document.createElement('button');
                            closeButton.innerHTML = '&times;';
                            closeButton.style.position = 'absolute';
                            closeButton.style.top = '5px';
                            closeButton.style.right = '10px';
                            closeButton.style.background = 'none';
                            closeButton.style.border = 'none';
                            closeButton.style.color = 'inherit';
                            closeButton.style.fontSize = '20px';
                            closeButton.style.cursor = 'pointer';
                            
                            closeButton.addEventListener('click', () => {
                                motdElement.remove();
                                localStorage.setItem('motdDismissed', 'true');
                            });
                            
                            // Titel
                            if (motd.title) {
                                const titleElement = document.createElement('h3');
                                titleElement.style.marginTop = '0';
                                titleElement.style.marginBottom = '10px';
                                titleElement.textContent = motd.title;
                                motdElement.appendChild(titleElement);
                            }
                            
                            // Inhalt mit einfachem Markdown
                            const contentElement = document.createElement('div');
                            contentElement.innerHTML = motd.content
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\n\n/g, '<br/><br/>')
                                .replace(/\n-\s/g, '<br/>• ');
                            
                            motdElement.appendChild(closeButton);
                            motdElement.appendChild(contentElement);
                            messagesElement.appendChild(motdElement);
                        }
                    }).catch(err => {
                        console.error('Fehler beim Laden der MOTD:', err);
                    });
                }
            }
            
            messages.forEach(message => {
                const messageElement = document.createElement('div');
                messageElement.style.marginBottom = '20px';
                messageElement.style.padding = '15px';
                messageElement.style.borderRadius = '4px';
                
                if (message.is_user) {
                    messageElement.style.backgroundColor = '#e1f5fe';
                    messageElement.style.marginLeft = '20%';
                    messageElement.style.position = 'relative';
                    
                    // Benutzer-Icon
                    const userIcon = document.createElement('div');
                    userIcon.innerHTML = '<i class="fas fa-user"></i>';
                    userIcon.style.position = 'absolute';
                    userIcon.style.top = '15px';
                    userIcon.style.right = '-25px';
                    userIcon.style.width = '20px';
                    userIcon.style.height = '20px';
                    userIcon.style.backgroundColor = '#4fc3f7';
                    userIcon.style.color = 'white';
                    userIcon.style.borderRadius = '50%';
                    userIcon.style.display = 'flex';
                    userIcon.style.alignItems = 'center';
                    userIcon.style.justifyContent = 'center';
                    userIcon.style.fontSize = '10px';
                    
                    messageElement.appendChild(userIcon);
                } else {
                    messageElement.style.backgroundColor = '#f1f3f4';
                    messageElement.style.marginRight = '20%';
                    messageElement.style.position = 'relative';
                    
                    // Assistant-Icon
                    const assistantIcon = document.createElement('div');
                    assistantIcon.innerHTML = '<i class="fas fa-robot"></i>';
                    assistantIcon.style.position = 'absolute';
                    assistantIcon.style.top = '15px';
                    assistantIcon.style.left = '-25px';
                    assistantIcon.style.width = '20px';
                    assistantIcon.style.height = '20px';
                    assistantIcon.style.backgroundColor = '#78909c';
                    assistantIcon.style.color = 'white';
                    assistantIcon.style.borderRadius = '50%';
                    assistantIcon.style.display = 'flex';
                    assistantIcon.style.alignItems = 'center';
                    assistantIcon.style.justifyContent = 'center';
                    assistantIcon.style.fontSize = '10px';
                    
                    messageElement.appendChild(assistantIcon);
                }
                
                // Versuch, markdown zu nutzen, falls verfügbar
                try {
                    if (window.marked && typeof window.marked.parse === 'function') {
                        messageElement.innerHTML += window.marked.parse(message.content);
                    } else {
                        messageElement.innerHTML += message.content.replace(/\n/g, '<br>');
                    }
                } catch (e) {
                    messageElement.innerHTML += message.content.replace(/\n/g, '<br>');
                }
                
                messagesElement.appendChild(messageElement);
            });
            
            // Nach unten scrollen
            messagesElement.scrollTop = messagesElement.scrollHeight;
        };
        
        // Sessions anzeigen
        const renderSessions = () => {
            if (!sessionsListElement) return;
            
            sessionsListElement.innerHTML = '';
            
            sessions.forEach(session => {
                const sessionElement = document.createElement('div');
                sessionElement.style.padding = '10px';
                sessionElement.style.borderRadius = '4px';
                sessionElement.style.cursor = 'pointer';
                sessionElement.style.marginBottom = '5px';
                sessionElement.style.display = 'flex';
                sessionElement.style.justifyContent = 'space-between';
                sessionElement.style.alignItems = 'center';
                
                if (session.id === currentSessionId) {
                    sessionElement.style.backgroundColor = '#e9ecef';
                    sessionElement.style.fontWeight = 'bold';
                }
                
                const sessionTitle = document.createElement('div');
                sessionTitle.textContent = session.title || 'Neue Unterhaltung';
                sessionTitle.style.flex = '1';
                sessionTitle.style.overflow = 'hidden';
                sessionTitle.style.textOverflow = 'ellipsis';
                sessionTitle.style.whiteSpace = 'nowrap';
                
                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
                deleteButton.style.background = 'none';
                deleteButton.style.border = 'none';
                deleteButton.style.color = '#dc3545';
                deleteButton.style.cursor = 'pointer';
                deleteButton.style.display = 'none'; // Erst bei Hover anzeigen
                
                sessionElement.appendChild(sessionTitle);
                sessionElement.appendChild(deleteButton);
                
                // Hover-Effekt
                sessionElement.addEventListener('mouseover', () => {
                    if (session.id !== currentSessionId) {
                        sessionElement.style.backgroundColor = '#f8f9fa';
                    }
                    deleteButton.style.display = 'block';
                });
                
                sessionElement.addEventListener('mouseout', () => {
                    if (session.id !== currentSessionId) {
                        sessionElement.style.backgroundColor = '';
                    }
                    deleteButton.style.display = 'none';
                });
                
                // Session laden
                sessionElement.addEventListener('click', (e) => {
                    if (e.target !== deleteButton && e.target.parentNode !== deleteButton) {
                        loadSession(session.id);
                    }
                });
                
                // Session löschen
                deleteButton.addEventListener('click', async () => {
                    if (confirm('Möchten Sie diese Unterhaltung wirklich löschen?')) {
                        try {
                            await axios.delete(`/api/session/${session.id}`);
                            
                            if (currentSessionId === session.id) {
                                currentSessionId = null;
                                messages = [];
                                renderMessages();
                                localStorage.removeItem('lastActiveSession');
                            }
                            
                            await loadSessions();
                        } catch (error) {
                            console.error('Fehler beim Löschen der Session:', error);
                        }
                    }
                });
                
                sessionsListElement.appendChild(sessionElement);
            });
        };
        
        // Nachricht senden
        const sendMessage = async () => {
            const question = questionElement.value.trim();
            
            if (!question) return;
            
            // Prüfen, ob eine Session ausgewählt ist
            if (!currentSessionId) {
                await startNewSession();
            }
            
            try {
                // Nachricht anzeigen (optimistisch)
                messages.push({
                    content: question,
                    is_user: true,
                    id: Date.now() // Temporäre ID
                });
                
                renderMessages();
                questionElement.value = '';
                
                // Lade-Nachricht anzeigen
                const loadingMessage = {
                    content: 'Antwort wird generiert...',
                    is_user: false,
                    id: null
                };
                
                messages.push(loadingMessage);
                renderMessages();
                
                // Antwort vom Server holen
                const response = await axios.post(`/api/chat/${currentSessionId}`, {
                    question
                });
                
                // Lade-Nachricht entfernen
                messages.pop();
                
                // Antwort anzeigen
                messages.push({
                    content: response.data.answer,
                    is_user: false,
                    id: response.data.message_id
                });
                
                renderMessages();
                
                // Sessions aktualisieren (für neue Titel)
                loadSessions();
            } catch (error) {
                console.error('Fehler beim Senden der Nachricht:', error);
                
                // Lade-Nachricht durch Fehlermeldung ersetzen
                messages.pop();
                messages.push({
                    content: 'Fehler beim Generieren der Antwort. Bitte versuchen Sie es erneut.',
                    is_user: false,
                    id: null
                });
                
                renderMessages();
            }
        };
        
        // Event-Listener hinzufügen
        if (sendButton) {
            sendButton.addEventListener('click', sendMessage);
        }
        
        if (questionElement) {
            questionElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }
        
        if (newChatButton) {
            newChatButton.addEventListener('click', startNewSession);
        }
        
        if (adminButton) {
            adminButton.addEventListener('click', () => {
                // Zum Admin-Bereich wechseln
                activateRescueMode();
            });
        }
        
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                // Abmelden
                localStorage.removeItem('token');
                window.location.reload();
            });
        }
        
        // Letzte Session laden oder neue Session starten
        const initSession = async () => {
            const lastSessionId = localStorage.getItem('lastActiveSession');
            
            await loadSessions();
            
            if (lastSessionId && sessions.some(s => s.id === parseInt(lastSessionId))) {
                loadSession(parseInt(lastSessionId));
            } else if (sessions.length > 0) {
                loadSession(sessions[0].id);
            }
        };
        
        // Initialisieren
        initSession();
    }
    
    // Starte Rettungssystem wenn DOM geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            addGlobalErrorHandling();
            initializeRescueSystem();
            
            // Nach kurzer Verzögerung prüfen wir, ob die Haupt-App gerendert wurde
            setTimeout(() => {
                if (!checkHtmlStructure()) {
                    console.warn('[Vue Rescue] Grundstruktur fehlerhaft, starte Notfall-Frontend-Fix');
                    emergencyFrontendFix();
                }
            }, 3000);
        });
    } else {
        addGlobalErrorHandling();
        initializeRescueSystem();
        
        // Nach kurzer Verzögerung prüfen wir, ob die Haupt-App gerendert wurde
        setTimeout(() => {
            if (!checkHtmlStructure()) {
                console.warn('[Vue Rescue] Grundstruktur fehlerhaft, starte Notfall-Frontend-Fix');
                emergencyFrontendFix();
            }
        }, 3000);
    }
})();