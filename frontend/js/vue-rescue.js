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
        
        if (adminPanelElements.length > 0 && navItems.length > 0) {
            log('Vue.js wurde erfolgreich initialisiert:', 
                adminPanelElements.length, 'Panel-Elemente,', 
                navItems.length, 'Navigations-Elemente gefunden');
            vueInitialized = true;
            return true;
        }
        
        log('Vue.js wurde nicht korrekt initialisiert. Keine Vue-generierten Elemente gefunden.');
        return false;
    }

    /**
     * Rettungsmodus aktivieren
     * Erstellt eine Notfall-UI für den Admin-Bereich
     */
    function activateRescueMode() {
        if (rescueActive) return;
        log('Aktiviere Rettungsmodus für Admin-Bereich');
        
        // Rettungs-CSS einfügen
        injectRescueStyles();
        
        // Admin-View finden oder erstellen
        const adminViewContainer = document.querySelector('.admin-view') || 
                                  document.getElementById('admin-container');
        
        if (!adminViewContainer) {
            log('Fehler: Kein Admin-Container gefunden');
            return;
        }
        
        // Bestehenden Inhalt löschen
        adminViewContainer.innerHTML = '';
        
        // Rettungs-UI erstellen
        createRescueAdminPanel(adminViewContainer);
        
        // Initial ersten Tab anzeigen
        showTab(config.tabs[0].id);
        
        rescueActive = true;
        log('Rettungsmodus aktiviert');
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
        // Hauptcontainer
        const rescuePanel = document.createElement('div');
        rescuePanel.className = 'rescue-admin-view';
        
        // Header
        const header = document.createElement('div');
        header.className = 'rescue-admin-header';
        header.innerHTML = `
            <h1><i class="fas fa-tools"></i> Admin-Bereich (Notfall-Modus)</h1>
            <button class="rescue-back-button" id="rescue-back-button">
                <i class="fas fa-arrow-left"></i> Zurück zum Chat
            </button>
        `;
        
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
            navItem.dataset.tab = tab.id;
            navItem.innerHTML = `<i class="${tab.icon}"></i> ${tab.label}`;
            navItem.addEventListener('click', () => showTab(tab.id));
            nav.appendChild(navItem);
        });
        
        // Panel für Tab-Inhalte
        const panel = document.createElement('div');
        panel.className = 'rescue-admin-panel';
        
        // Tab-Inhalte erstellen
        createTabContents(panel);
        
        // Zusammenfügen
        content.appendChild(nav);
        content.appendChild(panel);
        rescuePanel.appendChild(header);
        rescuePanel.appendChild(content);
        container.appendChild(rescuePanel);
        
        // Zurück-Button-Funktionalität
        document.getElementById('rescue-back-button').addEventListener('click', function() {
            rescuePanel.remove();
            rescueActive = false;
        });
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
        
        // Aktiven Tab in Navigation markieren
        const navItems = document.querySelectorAll('.rescue-nav-item');
        navItems.forEach(item => {
            if (item.dataset.tab === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Tab-Inhalte ein-/ausblenden
        const tabContents = document.querySelectorAll('.rescue-tab-content');
        tabContents.forEach(content => {
            if (content.id === `rescue-tab-${tabId}`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
        
        currentTab = tabId;
    }

    /**
     * Überwacht den Admin-Button, um den Rettungsmodus bei Klick zu aktivieren
     */
    function setupAdminButtonListener() {
        log('Suche nach Admin-Button...');
        
        const adminButton = document.querySelector('button[title="Systemadministration"]') ||
                           document.querySelector('.admin-button') ||
                           document.querySelector('[data-action="admin"]');
        
        if (adminButton) {
            log('Admin-Button gefunden, füge Click-Handler hinzu');
            
            adminButton.addEventListener('click', () => {
                log('Admin-Button geklickt');
                
                // Warte kurz, um zu sehen, ob Vue.js die Admin-Ansicht korrekt initialisiert
                setTimeout(() => {
                    if (!checkVueInitialization()) {
                        log('Admin-Ansicht wurde nicht korrekt initialisiert, aktiviere Rettungsmodus');
                        activateRescueMode();
                    }
                }, 500);
            });
        } else {
            log('Admin-Button nicht gefunden, prüfe erneut später');
            
            // Erneut versuchen, falls der Button noch nicht existiert
            setTimeout(setupAdminButtonListener, 1000);
        }
    }

    /**
     * Initialisierung des Vue Rescue Systems
     */
    function initializeRescueSystem() {
        log('Initialisiere Rettungssystem...');
        
        // Event-Listener für Admin-Button einrichten
        setupAdminButtonListener();
        
        // Verzögerte Prüfung auf Vue.js-Initialisierung
        setTimeout(() => {
            const isVueInitialized = checkVueInitialization();
            
            if (!isVueInitialized) {
                log('Vue.js wurde nicht korrekt initialisiert, aktiviere Rettungsmodus');
                
                // Prüfe, ob die Admin-Ansicht aktuell angezeigt wird
                const adminView = document.querySelector('.admin-view') || 
                                 document.getElementById('admin-container') ||
                                 document.querySelector('[data-view="admin"]');
                
                // Prüfe, ob der Admin aktiv ist oder wir auf der Admin-Seite sind
                const isAdminActive = adminView && (
                    adminView.style.display !== 'none' || 
                    document.location.hash.includes('admin') ||
                    document.querySelector('.admin-active') !== null
                );
                
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
            
            if (isAdminActive && !checkVueInitialization()) {
                log('Admin-Ansicht wurde aktiviert, aber Vue.js nicht initialisiert. Aktiviere Rettungsmodus.');
                activateRescueMode();
            }
        }, 2000); // Alle 2 Sekunden prüfen
    }

    // Starte Rettungssystem wenn DOM geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeRescueSystem);
    } else {
        initializeRescueSystem();
    }
})();