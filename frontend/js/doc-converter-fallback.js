/**
 * Dokumentenkonverter - Fallback-Implementierung
 * 
 * Diese Datei enthält die klassische JavaScript-Implementierung des Dokumentenkonverters
 * ohne Abhängigkeit von Vue.js.
 */

(function() {
    console.log('[DocConverter] Initialisiere klassische Implementierung des Dokumentenkonverters');
    
    // DOM-Element für Dokumentenkonverter suchen
    function initDocConverter() {
        const container = document.getElementById('doc-converter-container');
        if (\!container) {
            console.warn('[DocConverter] Container nicht gefunden, versuche es später erneut');
            setTimeout(initDocConverter, 500);
            return;
        }
        
        // Sicherstellen, dass der Container sichtbar ist
        container.style.display = 'block';
        
        // Datei-Upload-Listener initialisieren
        initFileUploadListeners();
        
        console.log('[DocConverter] Klassische Implementierung initialisiert');
    }
    
    // Datei-Upload-Funktionalität
    function initFileUploadListeners() {
        const fileInput = document.getElementById('doc-converter-file-input');
        const uploadContainer = document.querySelector('.file-upload-container');
        const progressBar = document.getElementById('progress-bar');
        const progressContainer = document.getElementById('upload-progress');
        const resultsContainer = document.getElementById('conversion-results');
        const resultsList = document.getElementById('results-list');
        
        if (\!fileInput || \!uploadContainer || \!progressBar || \!progressContainer || \!resultsContainer || \!resultsList) {
            console.warn('[DocConverter] Erforderliche Elemente nicht gefunden');
            return;
        }
        
        // Datei-Upload via Klick
        fileInput.addEventListener('change', handleFileSelect);
        
        // Drag-and-Drop-Funktionalität
        uploadContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadContainer.classList.add('border-green-500');
        });
        
        uploadContainer.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadContainer.classList.remove('border-green-500');
        });
        
        uploadContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadContainer.classList.remove('border-green-500');
            
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFiles(e.dataTransfer.files);
            }
        });
    }
    
    // Dateiauswahl behandeln
    function handleFileSelect(e) {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
    }
    
    // Datei-Upload-Verarbeitung
    function handleFiles(files) {
        const progressBar = document.getElementById('progress-bar');
        const progressContainer = document.getElementById('upload-progress');
        const resultsContainer = document.getElementById('conversion-results');
        const resultsList = document.getElementById('results-list');
        
        if (\!progressBar || \!progressContainer || \!resultsContainer || \!resultsList) {
            console.error('[DocConverter] UI-Elemente nicht gefunden');
            return;
        }
        
        // Progress-Bar anzeigen
        progressContainer.classList.remove('hidden');
        
        // FormData für den Upload vorbereiten
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }
        
        // Datei hochladen und konvertieren
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/convert', true);
        
        // Upload-Fortschritt
        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressBar.style.width = percentComplete + '%';
            }
        };
        
        // Upload abgeschlossen
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    
                    // Ergebnisse anzeigen
                    resultsContainer.classList.remove('hidden');
                    resultsList.innerHTML = '';
                    
                    // Für jedes konvertierte Dokument ein Ergebnis anzeigen
                    response.results.forEach(result => {
                        const resultItem = document.createElement('div');
                        resultItem.className = 'bg-gray-50 p-4 rounded-lg border border-gray-200';
                        
                        resultItem.innerHTML = `
                            <div class="flex justify-between items-center mb-2">
                                <h4 class="font-medium">${result.original_filename}</h4>
                                <span class="text-sm text-gray-500">${formatFileSize(result.size)}</span>
                            </div>
                            <div class="mb-2">
                                <span class="text-sm text-gray-700">Konvertiert zu: <strong>${result.format}</strong></span>
                            </div>
                            <div class="flex space-x-2">
                                <button class="nscale-btn-secondary text-sm" onclick="window.open('/api/download/${result.id}', '_blank')">
                                    <i class="fas fa-download mr-1"></i> Herunterladen
                                </button>
                                <button class="nscale-btn-secondary text-sm" onclick="window.open('/api/preview/${result.id}', '_blank')">
                                    <i class="fas fa-eye mr-1"></i> Vorschau
                                </button>
                            </div>
                        `;
                        
                        resultsList.appendChild(resultItem);
                    });
                    
                    // Fortschrittsanzeige zurücksetzen
                    setTimeout(() => {
                        progressBar.style.width = '0%';
                        progressContainer.classList.add('hidden');
                    }, 1000);
                    
                } catch (error) {
                    console.error('[DocConverter] Fehler beim Parsen der Antwort:', error);
                    showError('Die Serverantwort konnte nicht verarbeitet werden.');
                }
            } else {
                console.error('[DocConverter] Fehler beim Upload:', xhr.status, xhr.statusText);
                showError('Beim Upload ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.');
            }
        };
        
        // Fehlerbehandlung
        xhr.onerror = function() {
            console.error('[DocConverter] Netzwerkfehler beim Upload');
            showError('Ein Netzwerkfehler ist aufgetreten. Bitte überprüfen Sie Ihre Verbindung.');
        };
        
        // Upload starten
        xhr.send(formData);
    }
    
    // Hilfsfunktion für Dateigröße-Formatierung
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Fehlermeldung anzeigen
    function showError(message) {
        // Fehler-Toast anzeigen
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white py-2 px-4 rounded shadow-lg';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Nach 5 Sekunden automatisch ausblenden
        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }
    
    // Initialisierung starten
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDocConverter);
    } else {
        // Kurze Verzögerung, um sicherzustellen, dass die Seite vollständig geladen ist
        setTimeout(initDocConverter, 100);
    }
})();
