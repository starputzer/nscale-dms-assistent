/**
 * Fallback-Implementierung des Dokumentenkonverters für die klassische UI
 * Diese Implementierung wird verwendet, wenn die Vue.js-Variante nicht aktiviert ist
 */
(function() {
    console.log('Lade klassische Dokumentenkonverter-Implementierung...');
    
    // Variable für die Initialisierung
    window.classicDocConverterInitialized = false;

    // Funktion zum Initialisieren der UI mit Retry-Logik
    function initializeConverter() {
        // Vermeide doppelte Initialisierung
        if (window.classicDocConverterInitialized) {
            console.log('Klassischer DocConverter bereits initialisiert, überspringe...');
            return;
        }
        
        console.log('Suche nach Dokumentenkonverter-Container...');
        
        // Hauptcontainer für den Dokumentenkonverter (standard oder rescue mode)
        const converterContainer = document.getElementById('doc-converter-container') || 
                                  document.querySelector('#rescue-tab-doc-converter');
        
        // Wenn Container nicht gefunden, später erneut versuchen
        if (!converterContainer) {
            console.warn('Dokumentenkonverter-Container noch nicht gefunden, versuche später erneut...');
            // Versuche es erneut, aber nur wenn noch nicht initialisiert
            if (!window.classicDocConverterInitialized) {
                setTimeout(initializeConverter, 500); // Wiederhole alle 500ms
            }
            return;
        }
        
        console.log('Dokumentenkonverter-Container gefunden!');
        
        // Als initialisiert markieren
        window.classicDocConverterInitialized = true;
        
        // Container gefunden, initialisiere UI

        // Statusanzeigen
        let uploadStatus = null;
        let conversionProgress = null;
        let fileList = [];
        let isProcessing = false;

        // Rendert die UI-Komponenten
        function renderUI() {
            // Haupt-UI-Struktur erstellen
            converterContainer.innerHTML = `
            <div class="doc-converter classic-ui">
                <h2 class="text-xl font-semibold mb-4">Dokumentenkonverter</h2>
                
                <div class="mb-6">
                    <p class="mb-4">
                        Mit diesem Tool können Sie Dokumente in Markdown-Format konvertieren. 
                        Unterstützte Formate: PDF, DOCX, PPTX, XLSX und HTML.
                    </p>

                    <div class="bg-blue-50 p-4 border-l-4 border-blue-500 rounded-r mb-6">
                        <p class="text-sm">
                            <strong>Hinweis:</strong> Die Konvertierung erfolgt lokal auf dem Server. 
                            Die Dokumente werden nicht an externe Dienste gesendet.
                        </p>
                    </div>
                </div>

                <div class="upload-section p-4 border rounded mb-6">
                    <h3 class="font-medium mb-2">Dateien hochladen</h3>
                    
                    <div class="flex space-x-4 mb-4">
                        <label class="nscale-btn-primary cursor-pointer">
                            <span><i class="fas fa-file-upload mr-2"></i>Dateien auswählen</span>
                            <input type="file" id="file-upload" class="hidden" multiple />
                        </label>
                        <button id="clear-files" class="nscale-btn-secondary">
                            <i class="fas fa-trash-alt mr-2"></i>Liste leeren
                        </button>
                    </div>
                    
                    <div id="upload-status" class="text-sm text-gray-600 mt-2"></div>
                </div>

                <div id="file-list-container" class="mb-6 hidden">
                    <h3 class="font-medium mb-2">Ausgewählte Dateien</h3>
                    <div id="file-list" class="border rounded p-2 max-h-60 overflow-y-auto"></div>
                </div>

                <div class="options-section p-4 border rounded mb-6">
                    <h3 class="font-medium mb-2">Konvertierungsoptionen</h3>
                    
                    <div class="mb-4">
                        <label class="flex items-center space-x-2">
                            <input type="checkbox" id="post-processing" class="form-checkbox" checked />
                            <span>Nachbearbeitung (Tabellen formatieren, Struktur verbessern)</span>
                        </label>
                    </div>
                </div>

                <div class="action-section mb-6">
                    <button id="start-conversion" class="nscale-btn-primary w-full py-2">
                        <i class="fas fa-cogs mr-2"></i>Konvertierung starten
                    </button>
                </div>

                <div id="conversion-progress" class="hidden p-4 border rounded mb-6">
                    <h3 class="font-medium mb-2">Konvertierungsfortschritt</h3>
                    <div class="progress-container">
                        <div class="progress-bar bg-gray-200 rounded-full h-4 overflow-hidden">
                            <div id="progress-bar-inner" class="bg-green-500 h-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                        <div id="progress-text" class="text-sm text-center mt-1">0%</div>
                    </div>
                    <div id="current-file" class="text-sm mt-2"></div>
                </div>

                <div id="conversion-results" class="hidden p-4 border rounded mb-6">
                    <h3 class="font-medium mb-2">Konvertierungsergebnisse</h3>
                    <div id="results-list" class="max-h-60 overflow-y-auto"></div>
                </div>
            </div>
        `;

        // Status-Elemente referenzieren
        uploadStatus = document.getElementById('upload-status');
        conversionProgress = document.getElementById('conversion-progress');
    }

        // Richtet Event-Listener ein
        function setupEventListeners() {
            const fileUpload = document.getElementById('file-upload');
            const clearFilesBtn = document.getElementById('clear-files');
            const startConversionBtn = document.getElementById('start-conversion');

            if (fileUpload) {
            fileUpload.addEventListener('change', handleFileSelection);
        }

            if (clearFilesBtn) {
            clearFilesBtn.addEventListener('click', clearFileList);
        }

            if (startConversionBtn) {
            startConversionBtn.addEventListener('click', startConversion);
        }
    }

        // Verarbeitet die Dateiauswahl
        function handleFileSelection(event) {
        const files = event.target.files;
        
            if (!files || files.length === 0) {
            if (uploadStatus) uploadStatus.textContent = 'Keine Dateien ausgewählt';
            return;
        }

        fileList = Array.from(files);
        
            if (uploadStatus) {
            uploadStatus.textContent = `${fileList.length} Datei(en) ausgewählt`;
        }

        updateFileListUI();
    }

        // Aktualisiert die UI der Dateiliste
        function updateFileListUI() {
        const fileListContainer = document.getElementById('file-list-container');
        const fileListElement = document.getElementById('file-list');
        
            if (!fileListContainer || !fileListElement) return;
        
            if (fileList.length === 0) {
            fileListContainer.classList.add('hidden');
            return;
        }

        fileListContainer.classList.remove('hidden');
        fileListElement.innerHTML = '';

        fileList.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item flex justify-between items-center p-2 hover:bg-gray-100';
            fileItem.innerHTML = `
                <div class="file-info flex items-center">
                    <i class="fas fa-file mr-2 text-blue-500"></i>
                    <div>
                        <div class="font-medium">${file.name}</div>
                        <div class="text-xs text-gray-500">${formatFileSize(file.size)}</div>
                    </div>
                </div>
                <button class="remove-file text-red-500 hover:text-red-700" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            fileListElement.appendChild(fileItem);
            
            // Event-Listener für Entfernen-Button
            const removeBtn = fileItem.querySelector('.remove-file');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => removeFile(index));
            }
        });
    }

        // Entfernt eine Datei aus der Liste
        function removeFile(index) {
        fileList.splice(index, 1);
        updateFileListUI();
        
            if (uploadStatus) {
            uploadStatus.textContent = fileList.length === 0 
                ? 'Keine Dateien ausgewählt' 
                : `${fileList.length} Datei(en) ausgewählt`;
        }
    }

        // Leert die Dateiliste
        function clearFileList() {
        fileList = [];
        updateFileListUI();
        
            if (uploadStatus) {
            uploadStatus.textContent = 'Keine Dateien ausgewählt';
        }

        // Auch das Dateiauswahl-Input zurücksetzen
        const fileUpload = document.getElementById('file-upload');
            if (fileUpload) fileUpload.value = '';
    }

        // Startet den Konvertierungsprozess
        async function startConversion() {
            if (isProcessing) {
            alert('Es läuft bereits eine Konvertierung!');
            return;
        }

            if (fileList.length === 0) {
            alert('Bitte wählen Sie mindestens eine Datei aus.');
            return;
        }

        const startConversionBtn = document.getElementById('start-conversion');
        const progressBarInner = document.getElementById('progress-bar-inner');
        const progressText = document.getElementById('progress-text');
        const currentFileText = document.getElementById('current-file');
        const resultsContainer = document.getElementById('conversion-results');
        const resultsList = document.getElementById('results-list');

            if (!startConversionBtn || !progressBarInner || !progressText || !currentFileText || !resultsContainer || !resultsList) {
            console.error('UI-Elemente für Konvertierung nicht gefunden!');
            return;
        }

        // Status setzen
        isProcessing = true;
        startConversionBtn.disabled = true;
        startConversionBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Konvertierung läuft...';
        conversionProgress.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
        resultsList.innerHTML = '';

        // Konvertierungsoptionen
        const postProcessing = document.getElementById('post-processing')?.checked ?? true;

        // Für jede Datei einen Upload durchführen
        const results = [];
        
        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            const progress = Math.round((i / fileList.length) * 100);
            
            progressBarInner.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
            currentFileText.textContent = `Verarbeite: ${file.name}`;

            try {
                const result = await uploadAndConvertFile(file, postProcessing);
                results.push({
                    filename: file.name,
                    success: result.success,
                    message: result.message,
                    error: result.error,
                    outputPath: result.outputPath
                });
            } catch (error) {
                console.error(`Fehler bei Konvertierung von ${file.name}:`, error);
                results.push({
                    filename: file.name,
                    success: false,
                    error: error.message || 'Unbekannter Fehler bei der Konvertierung'
                });
            }
        }

        // Fortschritt abschließen
        progressBarInner.style.width = '100%';
        progressText.textContent = '100%';
        currentFileText.textContent = 'Konvertierung abgeschlossen!';

        // Ergebnisse anzeigen
        resultsContainer.classList.remove('hidden');
        displayResults(resultsList, results);

        // Status zurücksetzen
        setTimeout(() => {
            isProcessing = false;
            startConversionBtn.disabled = false;
            startConversionBtn.innerHTML = '<i class="fas fa-cogs mr-2"></i>Konvertierung starten';
        }, 1000);
    }

        // Lädt eine Datei hoch und konvertiert sie
        async function uploadAndConvertFile(file, postProcessing) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('post_processing', postProcessing);

        try {
            const response = await fetch('/api/admin/upload/document', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Fehler beim Hochladen der Datei');
            }

            const result = await response.json();
            return {
                success: result.success,
                message: result.message,
                outputPath: result.target_file,
                error: null
            };
        } catch (error) {
            console.error('Fehler bei Upload/Konvertierung:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

        // Zeigt die Konvertierungsergebnisse an
        function displayResults(container, results) {
        container.innerHTML = '';

            if (results.length === 0) {
            container.innerHTML = '<div class="text-gray-500">Keine Ergebnisse verfügbar</div>';
            return;
        }

        const successCount = results.filter(r => r.success).length;
        const errorCount = results.length - successCount;

        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'results-summary mb-3 p-2 rounded';
        summaryDiv.innerHTML = `
            <div class="font-medium">Zusammenfassung:</div>
            <div class="text-green-600">${successCount} erfolgreich konvertiert</div>
            ${errorCount > 0 ? `<div class="text-red-600">${errorCount} fehlgeschlagen</div>` : ''}
        `;
        container.appendChild(summaryDiv);

        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = `result-item p-2 mb-2 border rounded ${result.success ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`;
            
            resultItem.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="result-filename font-medium">${result.filename}</div>
                    <div class="result-status ${result.success ? 'text-green-600' : 'text-red-600'}">
                        ${result.success ? '<i class="fas fa-check-circle"></i> Erfolg' : '<i class="fas fa-times-circle"></i> Fehler'}
                    </div>
                </div>
                ${result.success 
                    ? `<div class="result-message text-sm mt-1">${result.message || 'Datei erfolgreich konvertiert'}</div>` 
                    : `<div class="result-error text-sm text-red-600 mt-1">Fehler: ${result.error || 'Unbekannter Fehler'}</div>`
                }
                ${result.outputPath 
                    ? `<div class="text-xs text-gray-500 mt-1">Ausgabe: ${result.outputPath}</div>` 
                    : ''
                }
            `;
            
            container.appendChild(resultItem);
        });
    }

        // Hilfsfunktion: Formatiert Dateigröße benutzerfreundlich
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

        // Hilfsfunktion: Holt das Auth-Token aus dem lokalen Speicher
        function getAuthToken() {
            return localStorage.getItem('auth_token');
        }
        
        // Initialisiere die UI
        renderUI();
        setupEventListeners();
        console.log('Klassische Dokumentenkonverter-Implementierung erfolgreich initialisiert!');
    }

    // Globales Flag für den Tab-Change-Listener
    window.classicTabChangeListenerInitialized = false;
    
    // Starte die Initialisierung mit Tab-Wechsel-Prüfung
    function setupTabChangeListener() {
        // Vermeide doppelte Initialisierung
        if (window.classicTabChangeListenerInitialized) {
            return;
        }
        window.classicTabChangeListenerInitialized = true;
        
        console.log('Richte Tab-Wechsel-Listener für klassischen DocConverter ein...');
        
        // Überwache Tab-Wechsel für den Fall, dass der Container dynamisch erstellt wird
        const adminNavItems = document.querySelectorAll('.admin-nav-item');
        if (adminNavItems.length > 0) {
            adminNavItems.forEach(item => {
                item.addEventListener('click', function() {
                    // Wenn zum DocConverter-Tab gewechselt wird
                    if (this.getAttribute('data-tab') === 'docConverter' || 
                        this.querySelector('input[value="docConverter"]')) {
                        console.log('DocConverter-Tab aktiviert, versuche Initialisierung der klassischen Implementierung...');
                        
                        // Nur einen Initialisierungsversuch machen
                        initializeConverter();
                    }
                });
            });
            console.log('Tab-Change-Listener für klassischen DocConverter eingerichtet');
        }
        
        // Überwache auch Rescue-Mode Tab-Wechsel
        function setupRescueTabListener() {
            const rescueNavItems = document.querySelectorAll('.rescue-nav-item');
            if (rescueNavItems.length > 0) {
                rescueNavItems.forEach(item => {
                    item.addEventListener('click', function() {
                        // Wenn zum Rescue DocConverter-Tab gewechselt wird
                        if (this.getAttribute('data-tab') === 'doc-converter') {
                            console.log('Rescue DocConverter-Tab aktiviert, versuche Initialisierung der klassischen Implementierung...');
                            
                            // Nur einen Initialisierungsversuch machen
                            initializeConverter();
                        }
                    });
                });
                console.log('Tab-Change-Listener für Rescue DocConverter eingerichtet');
                return true;
            }
            return false;
        }
        
        // Versuche sofort, ansonsten mit Verzögerung (wenn Rescue-Mode später aktiviert wird)
        if (!setupRescueTabListener()) {
            setTimeout(() => {
                setupRescueTabListener();
            }, 1000);
        }
    }
    
    // Globales Flag für den DOM-Observer
    window.classicDOMObserverInitialized = false;
    
    // Alternative Methode zum Finden des DocConverter-Tabs über MutationObserver
    function setupDOMObserver() {
        // Vermeide doppelte Initialisierung
        if (window.classicDOMObserverInitialized) {
            return;
        }
        window.classicDOMObserverInitialized = true;
        
        console.log('Richte DOM-Observer für klassischen DocConverter ein...');
        
        // Beobachte DOM-Änderungen, um den Container zu finden, sobald er erstellt wird
        const observer = new MutationObserver(function(mutations) {
            // Wenn bereits initialisiert, nichts tun
            if (window.classicDocConverterInitialized) {
                return;
            }
            
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    // Prüfe, ob ein DocConverter-Container hinzugefügt wurde
                    const converterContainer = 
                        document.getElementById('doc-converter-container') || 
                        document.querySelector('#rescue-tab-doc-converter');
                    
                    if (converterContainer) {
                        console.log('DocConverter-Container durch DOM-Mutation erkannt');
                        initializeConverter();
                    }
                    
                    // Prüfe auf Tab-Wechsel (Standard und Rescue Modus)
                    const activeTab = 
                        document.querySelector('[data-tab="docConverter"].active') || 
                        document.querySelector('.rescue-nav-item[data-tab="doc-converter"].active');
                    
                    if (activeTab) {
                        console.log('Aktiver DocConverter-Tab durch DOM-Mutation erkannt');
                        initializeConverter();
                    }
                }
            });
        });
        
        // Den gesamten Body beobachten
        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
        
        console.log('DOM-Beobachter für klassischen DocConverter eingerichtet');
    }
    
    // Hauptinitialisierung - nur einen Versuch starten
    setTimeout(initializeConverter, 100);
    
    // Richte den Tab-Change-Listener ein
    setupTabChangeListener();
    
    // Richte den DOM-Observer ein
    setupDOMObserver();
    
    console.log('Klassische Dokumentenkonverter-Implementierungsskript geladen!');
})();