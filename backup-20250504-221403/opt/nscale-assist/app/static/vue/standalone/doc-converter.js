/**
 * Dokument-Konverter (Standalone-Version ohne Abhängigkeiten)
 * Diese Datei stellt eine eigenständige Implementation des Dokumenten-Konverters dar,
 * die ohne Vue.js oder andere externe Abhängigkeiten funktioniert.
 */

(function() {
    // Konfiguration
    const DEBUG = true;
    const AUTO_INIT = true;
    const AUTO_FIX_VISIBILITY = true;
    
    // Logging-Funktionen
    function log(message, type = 'info') {
        const prefix = `[DocConverter]`;
        
        switch(type) {
            case 'error': console.error(prefix, message); break;
            case 'warn': console.warn(prefix, message); break;
            default: console.log(prefix, message);
        }
    }
    
    // DOM-Hilfsfunktionen
    function findOrCreateContainer() {
        log('Suche nach DocConverter-Container...');
        
        // Suche nach bekannten Selektoren
        const selectors = [
            '#doc-converter-container',
            '#doc-converter-app',
            '.doc-converter',
            '[data-tab="docConverter"]',
            '.admin-tab-content[data-tab="docConverter"]',
            '.tab-content[data-active-tab="docConverter"]'
        ];
        
        let container = null;
        
        // Versuche jeden Selektor
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                container = elements[0];
                log(`Container gefunden mit Selektor: ${selector}`);
                break;
            }
        }
        
        // Wenn kein Container gefunden wurde, versuche einen zu erstellen
        if (!container) {
            log('Kein Container gefunden, versuche einen zu erstellen', 'warn');
            
            // Mögliche Eltern-Container
            const parentSelectors = [
                '.admin-content',
                '.admin-panel-content',
                '.content-container',
                'main',
                '.main-content',
                'body'
            ];
            
            let parent = null;
            
            // Finde ein Elternelement
            for (const selector of parentSelectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    parent = elements[0];
                    log(`Elternelement gefunden mit Selektor: ${selector}`);
                    break;
                }
            }
            
            // Wenn ein Elternelement gefunden wurde, erstelle den Container
            if (parent) {
                container = document.createElement('div');
                container.id = 'doc-converter-container';
                container.className = 'doc-converter admin-tab-content';
                container.setAttribute('data-tab', 'docConverter');
                
                // Stelle sicher, dass der Container sichtbar ist
                container.style.display = 'block';
                container.style.visibility = 'visible';
                container.style.opacity = '1';
                
                parent.appendChild(container);
                log('Container erfolgreich erstellt');
            } else {
                log('Kein geeignetes Elternelement gefunden', 'error');
            }
        }
        
        return container;
    }
    
    // Prüfe auf Sichtbarkeitsprobleme und korrigiere diese
    function fixVisibility(container) {
        if (!container) return;
        
        // Prüfe den berechneten Stil
        const style = window.getComputedStyle(container);
        
        // Prüfe, ob das Element unsichtbar ist
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            log('Container ist unsichtbar, wende Korrekturen an', 'warn');
            
            // Erzwinge Sichtbarkeit mit !important
            container.style.setProperty('display', 'block', 'important');
            container.style.setProperty('visibility', 'visible', 'important');
            container.style.setProperty('opacity', '1', 'important');
            
            // Füge Klasse für CSS-Selektoren hinzu
            container.classList.add('doc-converter-force-visible');
        }
    }
    
    // Erstelle die UI des Dokumenten-Konverters
    function createUI(container) {
        if (!container) return;
        
        log('Erstelle DocConverter UI');
        
        // UI-HTML
        container.innerHTML = `
            <div class="doc-converter-view classic-ui">
                <header class="header">
                    <h1 class="title">nscale Dokumenten-Konverter</h1>
                    <p class="subtitle">Konvertieren Sie Ihre Dokumente zu durchsuchbarem Text für das nscale DMS</p>
                </header>
                
                <main class="main-content">
                    <div class="panel-section">
                        <h2 class="section-title">Dokumente hochladen</h2>
                        
                        <form action="/api/admin/upload/document" method="post" enctype="multipart/form-data" id="converter-form">
                            <div style="margin-bottom: 1.5rem;">
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Datei auswählen</label>
                                <input type="file" name="file" style="border: 1px solid #e5e7eb; padding: 0.75rem; width: 100%; border-radius: 0.25rem; background-color: #f9fafb;" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.html,.txt">
                                <p style="margin-top: 0.5rem; color: #6b7280; font-size: 0.875rem;">Unterstützte Formate: PDF, DOCX, XLSX, PPTX, HTML, TXT</p>
                            </div>
                            
                            <div style="margin-bottom: 1.5rem;">
                                <label style="display: block; margin-bottom: 0.75rem; font-weight: 500;">Konvertierungsoptionen</label>
                                
                                <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-left: 0.5rem;">
                                    <label style="display: flex; align-items: center;">
                                        <input type="checkbox" name="post_processing" checked style="margin-right: 0.5rem;">
                                        <span>Nachbearbeitung (verbessert Struktur und Format)</span>
                                    </label>
                                    
                                    <label style="display: flex; align-items: center;">
                                        <input type="checkbox" name="split_sections" checked style="margin-right: 0.5rem;">
                                        <span>In Abschnitte aufteilen</span>
                                    </label>
                                    
                                    <label style="display: flex; align-items: center;">
                                        <input type="checkbox" name="extract_images" checked style="margin-right: 0.5rem;">
                                        <span>Bilder extrahieren (wenn verfügbar)</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                                <button type="submit" style="background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 500;" id="converter-submit">
                                    Dokument konvertieren
                                </button>
                                
                                <button type="reset" style="background: #e5e7eb; color: #374151; padding: 0.75rem 1.5rem; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 500;">
                                    Zurücksetzen
                                </button>
                            </div>
                        </form>
                        
                        <div id="conversion-progress" style="display: none; margin-top: 2rem;">
                            <h3>Konvertierung läuft...</h3>
                            <div class="progress-bar" style="height: 8px; overflow: hidden; background-color: #e5e7eb; border-radius: 9999px; margin: 1rem 0;">
                                <div class="progress-bar-inner" style="height: 100%; background-color: #10b981; transition: width 0.3s ease; width: 0%;"></div>
                            </div>
                            <p class="progress-text">0%</p>
                        </div>
                        
                        <div id="conversion-results" style="display: none; margin-top: 2rem;">
                            <h3>Konvertierung abgeschlossen</h3>
                            <div class="results-container"></div>
                        </div>
                    </div>
                </main>
            </div>
        `;
        
        // Fortschrittsbalken-Simulation
        const form = container.querySelector('#converter-form');
        const progressContainer = container.querySelector('#conversion-progress');
        const progressBar = container.querySelector('.progress-bar-inner');
        const progressText = container.querySelector('.progress-text');
        const resultsContainer = container.querySelector('#conversion-results');
        
        if (form) {
            form.addEventListener('submit', function(e) {
                // Zeige den Fortschrittsbalken
                if (progressContainer) {
                    progressContainer.style.display = 'block';
                }
                
                // Simuliere Fortschritt (in einer echten Anwendung würde hier AJAX verwendet)
                let progress = 0;
                const interval = setInterval(function() {
                    progress += Math.random() * 10;
                    if (progress > 100) {
                        progress = 100;
                        clearInterval(interval);
                        
                        // Zeige Ergebnisse nach Abschluss
                        setTimeout(function() {
                            if (progressContainer) {
                                progressContainer.style.display = 'none';
                            }
                            if (resultsContainer) {
                                resultsContainer.style.display = 'block';
                                resultsContainer.querySelector('.results-container').innerHTML = `
                                    <div style="padding: 1rem; margin-bottom: 1rem; background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 0.25rem;">
                                        <p style="margin-bottom: 0.5rem; font-weight: 500;">Konvertierung erfolgreich</p>
                                        <p style="margin-bottom: 0;">Die Datei wurde erfolgreich konvertiert und kann jetzt verwendet werden.</p>
                                    </div>
                                    <button style="background: #3b82f6; color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 500; margin-top: 1rem;">
                                        Ergebnis herunterladen
                                    </button>
                                `;
                            }
                        }, 500);
                    }
                    
                    if (progressBar) {
                        progressBar.style.width = progress + '%';
                    }
                    if (progressText) {
                        progressText.textContent = Math.round(progress) + '%';
                    }
                }, 200);
                
                // In der Beispielimplementierung verhindern wir das tatsächliche Absenden
                // des Formulars, da dies nur eine UI-Demo ist
                if (!window.docConverterAllowFormSubmit) {
                    e.preventDefault();
                }
            });
        }
    }
    
    // Überwache DOM-Änderungen, um den DocConverter-Container zu finden
    function setupMutationObserver() {
        // Erstelle einen Observer, der DOM-Änderungen überwacht
        const observer = new MutationObserver(function(mutations) {
            // Prüfe, ob der Tab oder Container jetzt vorhanden ist
            const container = findOrCreateContainer();
            
            if (container && !container.hasAttribute('data-doc-converter-initialized')) {
                log('Container durch DOM-Änderung gefunden, initialisiere UI');
                
                // Markiere den Container als initialisiert
                container.setAttribute('data-doc-converter-initialized', 'true');
                
                // Erstelle die UI
                createUI(container);
                
                // Stelle sicher, dass der Container sichtbar ist
                if (AUTO_FIX_VISIBILITY) {
                    fixVisibility(container);
                }
            }
        });
        
        // Starte die Beobachtung mit den angegebenen Optionen
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        log('DOM-Beobachtung für DocConverter initialisiert');
    }
    
    // Hauptinitialisierungsfunktion
    function initialize() {
        log('Initialisiere DocConverter');
        
        // Warte, bis das DOM geladen ist
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                log('DOMContentLoaded ausgelöst, suche nach Container');
                initializeUI();
            });
        } else {
            log('DOM bereits geladen, initialisiere sofort');
            initializeUI();
        }
        
        // Stelle auch einen MutationObserver bereit, um den Tab zu erkennen, wenn er später hinzugefügt wird
        setupMutationObserver();
    }
    
    // UI-Initialisierung
    function initializeUI() {
        const container = findOrCreateContainer();
        
        if (container) {
            // Vermeidet doppelte Initialisierung
            if (!container.hasAttribute('data-doc-converter-initialized')) {
                container.setAttribute('data-doc-converter-initialized', 'true');
                createUI(container);
            }
            
            // Stelle sicher, dass der Container sichtbar ist
            if (AUTO_FIX_VISIBILITY) {
                fixVisibility(container);
                
                // Prüfe nochmals nach einer kurzen Verzögerung (für den Fall, dass CSS später geladen wird)
                setTimeout(function() {
                    fixVisibility(container);
                }, 500);
            }
        } else {
            log('Kein Container gefunden, verwende MutationObserver für spätere Erkennung', 'warn');
        }
    }
    
    // Globale Funktion zur manuellen Initialisierung
    window.initializeClassicDocConverter = function() {
        log('Manuelle Initialisierung aufgerufen');
        initializeUI();
        return true;
    };
    
    // Setze globale Flags
    window.docConverterStandalone = true;
    
    // Starte die Initialisierung
    if (AUTO_INIT) {
        initialize();
    }
})();