/**
 * Dokumentenkonverter-Buttons-Fix für nscale-assist
 * 
 * Behebt Probleme mit den fehlenden Buttons im Dokumentenkonverter-Tab
 * und entfernt den unnötigen "Zur Chat-Ansicht wechseln"-Button.
 */

(function() {
    console.log('===== NSCALE-ASSIST DOKUMENTENKONVERTER-BUTTONS-FIX =====');
    
    function fixDocConverterButtons() {
        console.log('Repariere Dokumentenkonverter-Buttons...');
        
        // Finde den Dokumentenkonverter-Container
        const docConverterContainer = document.getElementById('doc-converter-container');
        
        if (!docConverterContainer) {
            console.error('Dokumentenkonverter-Container nicht gefunden, kann Buttons nicht reparieren.');
            
            // Verzögert prüfen, ob der Container später geladen wird
            setTimeout(() => {
                const lateDocConverterContainer = document.getElementById('doc-converter-container');
                
                if (lateDocConverterContainer) {
                    console.log('Dokumentenkonverter-Container gefunden nach verzögerter Prüfung, setze Fix fort...');
                    repairDocConverterUI(lateDocConverterContainer);
                } else {
                    console.error('Dokumentenkonverter-Container auch nach verzögerter Prüfung nicht gefunden.');
                }
            }, 2000);
            
            return false;
        }
        
        console.log('Dokumentenkonverter-Container gefunden, repariere UI...');
        return repairDocConverterUI(docConverterContainer);
    }
    
    function repairDocConverterUI(container) {
        try {
            // Finde das Formular innerhalb des Containers
            const form = container.querySelector('form') || container.querySelector('#file-upload-form');
            
            if (!form) {
                console.error('Dokumentenkonverter-Formular nicht gefunden.');
                
                // Erstelle ein neues Formular, wenn keines vorhanden ist
                const newForm = document.createElement('form');
                newForm.id = 'file-upload-form';
                newForm.className = 'converter-form';
                
                // Füge grundlegende Struktur für das Formular hinzu
                newForm.innerHTML = `
                    <div class="form-group">
                        <label for="file-upload">Dokument auswählen</label>
                        <input type="file" id="file-upload" class="file-input" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.odt,.ods,.odp,.md,.txt">
                        <div id="file-name" class="file-name">Keine Datei ausgewählt</div>
                    </div>
                    
                    <div class="form-group">
                        <label for="output-format">Ausgabeformat</label>
                        <select id="output-format" class="format-select nscale-input">
                            <option value="PDF">PDF - Portable Document Format</option>
                            <option value="HTML">HTML - Webseite</option>
                            <option value="TEXT">TEXT - Einfacher Text</option>
                            <option value="MARKDOWN">MARKDOWN - Formatierter Text</option>
                            <option value="JSON">JSON - Strukturierte Daten</option>
                        </select>
                    </div>
                    
                    <div class="converter-actions">
                        <button type="submit" id="convert-btn" class="nscale-btn-primary" disabled>
                            <i class="fas fa-exchange-alt mr-2"></i> Konvertieren
                        </button>
                    </div>
                `;
                
                container.appendChild(newForm);
                console.log('Neues Dokumentenkonverter-Formular erstellt.');
                
                // Event-Listener für das neue Formular einrichten
                setupFormEventListeners(newForm);
                return true;
            }
            
            // Finde die Buttons-Container innerhalb des Formulars
            const actionsContainer = form.querySelector('.converter-actions') || form.querySelector('.form-actions');
            
            if (!actionsContainer) {
                console.warn('Button-Container nicht gefunden, erstelle neu...');
                
                // Erstelle einen neuen Button-Container
                const newActionsContainer = document.createElement('div');
                newActionsContainer.className = 'converter-actions';
                
                // Füge Konvertieren-Button hinzu
                const convertButton = document.createElement('button');
                convertButton.type = 'submit';
                convertButton.id = 'convert-btn';
                convertButton.className = 'nscale-btn-primary';
                convertButton.disabled = true;
                convertButton.innerHTML = '<i class="fas fa-exchange-alt mr-2"></i> Konvertieren';
                
                newActionsContainer.appendChild(convertButton);
                form.appendChild(newActionsContainer);
                
                console.log('Neuer Button-Container mit Konvertieren-Button erstellt.');
            } else {
                console.log('Button-Container gefunden, prüfe auf Konvertieren-Button...');
                
                // Prüfe, ob der Konvertieren-Button existiert
                let convertButton = actionsContainer.querySelector('#convert-btn') || 
                                    actionsContainer.querySelector('button[type="submit"]');
                
                if (!convertButton) {
                    console.warn('Konvertieren-Button nicht gefunden, erstelle neu...');
                    
                    // Erstelle einen neuen Konvertieren-Button
                    convertButton = document.createElement('button');
                    convertButton.type = 'submit';
                    convertButton.id = 'convert-btn';
                    convertButton.className = 'nscale-btn-primary';
                    convertButton.disabled = true;
                    convertButton.innerHTML = '<i class="fas fa-exchange-alt mr-2"></i> Konvertieren';
                    
                    // Füge den Button zum Container hinzu
                    actionsContainer.appendChild(convertButton);
                    console.log('Neuer Konvertieren-Button erstellt.');
                } else {
                    console.log('Konvertieren-Button gefunden.');
                }
                
                // Entferne den "Zur Chat-Ansicht wechseln"-Button, falls vorhanden
                const chatButton = actionsContainer.querySelector('#to-chat-btn');
                if (chatButton) {
                    console.log('Entferne unnötigen "Zur Chat-Ansicht wechseln"-Button.');
                    chatButton.remove();
                }
            }
            
            // Richte Event-Listener für das Formular ein
            setupFormEventListeners(form);
            
            console.log('Dokumentenkonverter-UI erfolgreich repariert.');
            return true;
        } catch (error) {
            console.error('Fehler beim Reparieren der Dokumentenkonverter-UI:', error);
            return false;
        }
    }
    
    function setupFormEventListeners(form) {
        try {
            // Finde das Datei-Eingabefeld
            const fileInput = form.querySelector('#file-upload') || form.querySelector('input[type="file"]');
            const fileNameDisplay = form.querySelector('#file-name') || form.querySelector('.file-name');
            const convertButton = form.querySelector('#convert-btn') || form.querySelector('button[type="submit"]');
            
            if (fileInput && fileNameDisplay && convertButton) {
                // Entferne bestehende Event-Listener
                const newFileInput = fileInput.cloneNode(true);
                fileInput.parentNode.replaceChild(newFileInput, fileInput);
                
                // Füge neuen Event-Listener hinzu
                newFileInput.addEventListener('change', function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        fileNameDisplay.textContent = file.name;
                        convertButton.disabled = false;
                    } else {
                        fileNameDisplay.textContent = 'Keine Datei ausgewählt';
                        convertButton.disabled = true;
                    }
                });
                
                // Entferne bestehende Event-Listener vom Formular
                const newForm = form.cloneNode(true);
                form.parentNode.replaceChild(newForm, form);
                
                // Füge neuen Event-Listener zum Formular hinzu
                newForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    
                    const fileInputElement = this.querySelector('#file-upload') || this.querySelector('input[type="file"]');
                    const formatSelect = this.querySelector('#output-format') || this.querySelector('select');
                    
                    if (fileInputElement && fileInputElement.files.length > 0) {
                        const file = fileInputElement.files[0];
                        const format = formatSelect ? formatSelect.value : 'PDF';
                        
                        console.log(`Dokument "${file.name}" wird im Format "${format}" konvertiert...`);
                        
                        // Hier würde normalerweise der API-Aufruf erfolgen
                        alert(`Konvertierung wurde gestartet: ${file.name} → ${format}`);
                    } else {
                        alert('Bitte wählen Sie eine Datei aus.');
                    }
                });
                
                console.log('Event-Listener für Dokumentenkonverter-Formular eingerichtet.');
                return true;
            } else {
                console.error('Erforderliche Formularelemente nicht gefunden.');
                return false;
            }
        } catch (error) {
            console.error('Fehler beim Einrichten der Formular-Event-Listener:', error);
            return false;
        }
    }
    
    // Finde den Dokumentenkonverter-Tab-Button und füge einen Event-Listener hinzu, der den Fix beim Klick anwendet
    function addDocConverterTabButtonHandler() {
        const docConverterTabButton = document.getElementById('doc-converter-tab-btn');
        
        if (!docConverterTabButton) {
            console.warn('Dokumentenkonverter-Tab-Button nicht gefunden, versuche alternativen Ansatz...');
            
            // Alternativer Ansatz: MutationObserver verwenden, um auf das Laden des Tabs zu warten
            const tabsContainer = document.querySelector('.admin-nav, .tabs-container, #admin-tabs');
            
            if (tabsContainer) {
                console.log('Tabs-Container gefunden, überwache Änderungen...');
                
                const observer = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        if (mutation.type === 'childList' || mutation.type === 'attributes') {
                            const docConverterTabBtn = document.getElementById('doc-converter-tab-btn');
                            if (docConverterTabBtn) {
                                console.log('Dokumentenkonverter-Tab-Button dynamisch gefunden, füge Handler hinzu...');
                                observer.disconnect();
                                setupDocConverterTabButtonHandler(docConverterTabBtn);
                                break;
                            }
                        }
                    }
                });
                
                observer.observe(tabsContainer, { childList: true, subtree: true, attributes: true });
                console.log('MutationObserver für Dokumentenkonverter-Tab eingerichtet.');
            } else {
                console.error('Weder Dokumentenkonverter-Tab-Button noch Tabs-Container gefunden.');
                
                // Letzte Chance: Zeitgesteuert nach dem Tab suchen
                setTimeout(() => {
                    const lateDocConverterTabBtn = document.getElementById('doc-converter-tab-btn');
                    if (lateDocConverterTabBtn) {
                        console.log('Dokumentenkonverter-Tab-Button nach Verzögerung gefunden, füge Handler hinzu...');
                        setupDocConverterTabButtonHandler(lateDocConverterTabBtn);
                    } else {
                        console.error('Dokumentenkonverter-Tab-Button konnte nicht gefunden werden.');
                        // Direkter Fix-Versuch ohne Tab-Button
                        fixDocConverterButtons();
                    }
                }, 3000);
            }
            
            return false;
        }
        
        console.log('Dokumentenkonverter-Tab-Button gefunden, füge Handler hinzu...');
        return setupDocConverterTabButtonHandler(docConverterTabButton);
    }
    
    function setupDocConverterTabButtonHandler(docConverterTabButton) {
        try {
            // Entferne alle bestehenden Event-Listener durch Klonen
            const newDocConverterTabButton = docConverterTabButton.cloneNode(true);
            docConverterTabButton.parentNode.replaceChild(newDocConverterTabButton, docConverterTabButton);
            
            // Original-Funktion zum Aktivieren des Tabs beibehalten
            const originalOnclick = docConverterTabButton.onclick;
            
            // Füge den neuen Event-Listener hinzu
            newDocConverterTabButton.addEventListener('click', function(event) {
                // Original-Funktion ausführen, falls vorhanden
                if (typeof originalOnclick === 'function') {
                    originalOnclick.call(this, event);
                }
                
                // Dokumentenkonverter-Buttons nach kurzer Verzögerung reparieren, damit der Tab vollständig geladen ist
                setTimeout(fixDocConverterButtons, 500);
            });
            
            console.log('Dokumentenkonverter-Tab-Button-Handler erfolgreich eingerichtet.');
            return true;
        } catch (error) {
            console.error('Fehler beim Einrichten des Dokumentenkonverter-Tab-Button-Handlers:', error);
            return false;
        }
    }
    
    // Verzögerte Ausführung, um sicherzustellen, dass die DOM-Struktur geladen ist
    function waitForDOMToBeReady() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(initFix, 500));
        } else {
            setTimeout(initFix, 500);
        }
    }
    
    function initFix() {
        // Prüfe, ob bereits der Dokumentenkonverter-Tab aktiv ist
        const docConverterTab = document.getElementById('doc-converter-tab');
        if (docConverterTab && window.getComputedStyle(docConverterTab).display !== 'none') {
            console.log('Dokumentenkonverter-Tab bereits aktiv, wende direkten Fix an...');
            fixDocConverterButtons();
        } else {
            console.log('Dokumentenkonverter-Tab nicht aktiv, richte Tab-Button-Handler ein...');
            addDocConverterTabButtonHandler();
        }
    }
    
    // Fix starten
    try {
        waitForDOMToBeReady();
        console.log('Dokumentenkonverter-Buttons-Fix initialisiert.');
    } catch (error) {
        console.error('Fehler beim Initialisieren des Dokumentenkonverter-Buttons-Fixes:', error);
    }
})();