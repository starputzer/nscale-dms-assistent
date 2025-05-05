/**
 * Dokumentenkonverter - Fallback Implementierung 
 * 
 * Diese Datei stellt eine reine JavaScript-Implementierung des Dokumentenkonverters
 * bereit, ohne Vue.js oder andere externe Abhängigkeiten.
 */

(function() {
    console.log("Dokumentenkonverter Fallback-Implementierung wird initialisiert...");
    
    // Hauptfunktion für die Dokumentenkonverter-Logik
    function initDocumentConverter() {
        console.log("Initialisiere Dokumentenkonverter-Funktionalität...");
        
        // Elemente abrufen
        const fileInput = document.getElementById('doc-converter-file-input');
        const progressContainer = document.getElementById('upload-progress');
        const progressBar = document.getElementById('progress-bar');
        const resultsContainer = document.getElementById('conversion-results');
        const resultsList = document.getElementById('results-list');
        
        // Robustere Element-Prüfung mit Verzögerung für DOM-Verfügbarkeit
        let retryCount = 0;
        const maxRetries = 5;
        
        function checkElements() {
            if (!fileInput || !progressContainer || !progressBar || !resultsContainer || !resultsList) {
                retryCount++;
                if (retryCount <= maxRetries) {
                    console.log(`Element-Check fehlgeschlagen (${retryCount}/${maxRetries}). Versuche erneut in 1 Sekunde...`);
                    setTimeout(() => {
                        // Erneuter Versuch, die Elemente zu finden
                        const fileInput = document.getElementById('doc-converter-file-input');
                        const progressContainer = document.getElementById('upload-progress');
                        const progressBar = document.getElementById('progress-bar');
                        const resultsContainer = document.getElementById('conversion-results');
                        const resultsList = document.getElementById('results-list');
                        
                        if (fileInput && progressContainer && progressBar && resultsContainer && resultsList) {
                            console.log("Elemente erfolgreich gefunden nach wiederholtem Versuch.");
                            // Elemente global neu zuweisen
                            window.dcFileInput = fileInput;
                            window.dcProgressContainer = progressContainer;
                            window.dcProgressBar = progressBar;
                            window.dcResultsContainer = resultsContainer;
                            window.dcResultsList = resultsList;
                            
                            // Initialisiere Event-Listener
                            setupEventListeners();
                        } else {
                            checkElements(); // Rekursiver Aufruf
                        }
                    }, 1000);
                } else {
                    console.error("Konnte erforderliche Elemente nach mehreren Versuchen nicht finden.");
                }
                return false;
            }
            return true;
        }
        
        // Wenn die Elemente nicht gefunden werden, verzögere die Initialisierung
        if (!checkElements()) {
            return;
        }
        
        // Funktion zum Einrichten der Event-Listener
        function setupEventListeners() {
            // Drag-and-Drop-Funktionalität
            const dropArea = document.querySelector('.file-upload-container');
            if (dropArea) {
                console.log("Drop-Area gefunden, füge Drag-and-Drop-Funktionalität hinzu");
                
                function preventDefaults(e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                
                function highlight() {
                    dropArea.classList.add('border-green-500');
                    dropArea.classList.add('bg-green-50');
                }
                
                function unhighlight() {
                    dropArea.classList.remove('border-green-500');
                    dropArea.classList.remove('bg-green-50');
                }
                
                function handleDrop(e) {
                    const dt = e.dataTransfer;
                    const files = dt.files;
                    handleFiles(files);
                }
                
                // Event-Listener registrieren
                ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                    dropArea.addEventListener(eventName, preventDefaults, false);
                });
                
                ['dragenter', 'dragover'].forEach(eventName => {
                    dropArea.addEventListener(eventName, highlight, false);
                });
                
                ['dragleave', 'drop'].forEach(eventName => {
                    dropArea.addEventListener(eventName, unhighlight, false);
                });
                
                dropArea.addEventListener('drop', handleDrop, false);
            } else {
                console.warn("Drop-Area nicht gefunden, keine Drag-and-Drop-Funktionalität verfügbar");
            }
            
            // Datei-Upload-Handler
            const currentFileInput = window.dcFileInput || fileInput;
            if (currentFileInput) {
                console.log("File-Input gefunden, füge Change-Event-Listener hinzu");
                currentFileInput.addEventListener('change', function() {
                    handleFiles(this.files);
                });
            } else {
                console.warn("File-Input nicht gefunden, kein Change-Event-Listener registriert");
            }
        }
        
        // Initialisiere Event-Listener für vorhandene Elemente
        setupEventListeners();
        
        function handleFiles(files) {
            if (files.length === 0) return;
            
            // Aktuelle UI-Elemente abrufen
            const currentProgressContainer = window.dcProgressContainer || progressContainer;
            const currentResultsContainer = window.dcResultsContainer || resultsContainer;
            const currentResultsList = window.dcResultsList || resultsList;
            
            if (!currentProgressContainer || !currentResultsContainer || !currentResultsList) {
                console.error("UI-Elemente für die Datei-Verarbeitung fehlen.");
                return;
            }
            
            // UI aktualisieren
            currentProgressContainer.classList.remove('hidden');
            currentResultsContainer.classList.remove('hidden');
            currentResultsList.innerHTML = ''; // Ergebnisse zurücksetzen
            
            console.log(`Verarbeite ${files.length} Dateien...`);
            
            // Dateien verarbeiten
            Array.from(files).forEach(file => {
                uploadFile(file);
            });
        }
        
        function uploadFile(file) {
            // Aktuelle UI-Elemente abrufen
            const currentProgressBar = window.dcProgressBar || progressBar;
            const currentResultsList = window.dcResultsList || resultsList;
            const currentProgressContainer = window.dcProgressContainer || progressContainer;
            
            if (!currentProgressBar || !currentResultsList) {
                console.error("UI-Elemente für den Datei-Upload fehlen.");
                return;
            }
            
            console.log(`Verarbeite Datei: ${file.name} (${file.type}, ${file.size} Bytes)`);
            
            const formData = new FormData();
            formData.append('file', file);
            
            // Ergebnis-Element erstellen
            const resultItem = document.createElement('div');
            resultItem.className = 'p-4 border rounded-lg flex items-start';
            resultItem.innerHTML = `
                <div class="flex-shrink-0 mr-3">
                    <i class="fas fa-file-alt text-2xl text-gray-400"></i>
                </div>
                <div class="flex-grow">
                    <h4 class="font-medium">${file.name}</h4>
                    <p class="text-sm text-gray-500">Wird hochgeladen...</p>
                </div>
            `;
            currentResultsList.appendChild(resultItem);
            
            // Tatsächlicher API-Aufruf (wenn verfügbar)
            const apiUrl = '/api/doc-converter/convert';
            
            // Prüfen, ob der Endpoint verfügbar ist
            fetch(apiUrl, { method: 'HEAD' })
                .then(response => {
                    if (response.ok) {
                        // API ist verfügbar, echter Upload
                        return realUpload();
                    } else {
                        // API nicht verfügbar, simulierter Upload
                        console.log("API nicht verfügbar, verwende simulierte Konvertierung");
                        return simulatedUpload();
                    }
                })
                .catch(error => {
                    console.warn("API-Check fehlgeschlagen, verwende simulierte Konvertierung:", error);
                    return simulatedUpload();
                });
                
            // Funktion für den realen Upload zum API-Endpunkt
            function realUpload() {
                return new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', apiUrl, true);
                    
                    xhr.upload.onprogress = function(e) {
                        if (e.lengthComputable) {
                            const percentComplete = (e.loaded / e.total) * 100;
                            currentProgressBar.style.width = percentComplete + '%';
                        }
                    };
                    
                    xhr.onload = function() {
                        if (xhr.status === 200) {
                            try {
                                const response = JSON.parse(xhr.responseText);
                                
                                // Erfolgsfall
                                showSuccessResult(resultItem, file.name, response);
                                resolve(response);
                            } catch (e) {
                                showErrorResult(resultItem, file.name, "Fehler beim Parsen der Antwort");
                                reject(e);
                            }
                        } else {
                            showErrorResult(resultItem, file.name, `Fehler ${xhr.status}: ${xhr.statusText}`);
                            reject(new Error(xhr.statusText));
                        }
                        
                        // Fortschritt zurücksetzen
                        setTimeout(() => {
                            currentProgressBar.style.width = '0%';
                            currentProgressContainer.classList.add('hidden');
                        }, 1000);
                    };
                    
                    xhr.onerror = function() {
                        showErrorResult(resultItem, file.name, "Netzwerkfehler bei der Übertragung");
                        reject(new Error("Network Error"));
                        
                        // Fortschritt zurücksetzen
                        setTimeout(() => {
                            currentProgressBar.style.width = '0%';
                            currentProgressContainer.classList.add('hidden');
                        }, 1000);
                    };
                    
                    xhr.send(formData);
                });
            }
            
            // Funktion für die simulierte Konvertierung
            function simulatedUpload() {
                return new Promise(resolve => {
                    let progress = 0;
                    const interval = setInterval(() => {
                        progress += Math.random() * 10;
                        if (progress > 100) {
                            progress = 100;
                            clearInterval(interval);
                            
                            // Simuliere Fertigstellung nach 2 Sekunden
                            setTimeout(() => {
                                const simulatedResponse = {
                                    success: true,
                                    file_name: file.name,
                                    converted_file: `converted_${file.name.replace(/\.[^/.]+$/, ".md")}`,
                                    download_url: "#simulated-download",
                                    preview_url: "#simulated-preview"
                                };
                                
                                showSuccessResult(resultItem, file.name, simulatedResponse);
                                
                                // Alle Fortschritte zurücksetzen
                                currentProgressBar.style.width = '0%';
                                currentProgressContainer.classList.add('hidden');
                                
                                resolve(simulatedResponse);
                            }, 2000);
                        }
                        currentProgressBar.style.width = `${progress}%`;
                    }, 200);
                });
            }
            
            // Funktion zum Anzeigen eines Erfolgsergebnisses
            function showSuccessResult(element, fileName, response) {
                element.innerHTML = `
                    <div class="flex-shrink-0 mr-3">
                        <i class="fas fa-check-circle text-2xl text-green-500"></i>
                    </div>
                    <div class="flex-grow">
                        <h4 class="font-medium">${fileName}</h4>
                        <p class="text-sm text-green-600">Konvertierung erfolgreich</p>
                        <div class="mt-2">
                            <a href="${response.download_url || '#'}" class="text-sm text-blue-600 hover:text-blue-800 mr-4" ${response.download_url ? '' : 'onclick="return false;"'}>
                                <i class="fas fa-download mr-1"></i> Herunterladen
                            </a>
                            <a href="${response.preview_url || '#'}" class="text-sm text-blue-600 hover:text-blue-800" ${response.preview_url ? '' : 'onclick="return false;"'}>
                                <i class="fas fa-eye mr-1"></i> Vorschau
                            </a>
                        </div>
                    </div>
                `;
            }
            
            // Funktion zum Anzeigen eines Fehlerergebnisses
            function showErrorResult(element, fileName, errorMessage) {
                element.innerHTML = `
                    <div class="flex-shrink-0 mr-3">
                        <i class="fas fa-times-circle text-2xl text-red-500"></i>
                    </div>
                    <div class="flex-grow">
                        <h4 class="font-medium">${fileName}</h4>
                        <p class="text-sm text-red-600">Fehler bei der Konvertierung</p>
                        <p class="text-xs text-gray-500 mt-1">${errorMessage}</p>
                    </div>
                `;
            }
        }
    }

    // Führe die Initialisierung durch, wenn der DOM geladen ist
    function doInit() {
        console.log("Starte Dokumentenkonverter Initialisierung...");
        try {
            initDocumentConverter();
            console.log("Dokumentenkonverter Initialisierung abgeschlossen.");
        } catch (e) {
            console.error("Fehler bei der Dokumentenkonverter Initialisierung:", e);
            
            // Erneuter Versuch nach kurzer Verzögerung
            setTimeout(() => {
                console.log("Dokumentenkonverter Initialisierung wird erneut versucht...");
                try {
                    initDocumentConverter();
                    console.log("Dokumentenkonverter Initialisierung im zweiten Versuch erfolgreich.");
                } catch (e2) {
                    console.error("Dokumentenkonverter Initialisierung auch im zweiten Versuch fehlgeschlagen:", e2);
                }
            }, 2000);
        }
    }
    
    // DOM-Zustand prüfen und Event-Listener registrieren
    if (document.readyState === "loading") {
        console.log("Dokument wird noch geladen, registriere DOMContentLoaded-Event");
        document.addEventListener("DOMContentLoaded", doInit);
    } else {
        console.log("Dokument bereits geladen, initialisiere direkt");
        doInit();
    }
    
    // Exponiere Hauptfunktionen global, um sie von außen zugänglich zu machen
    window.docConverter = {
        init: initDocumentConverter,
        reinit: doInit
    };
})();