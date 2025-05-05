/**
 * Document Converter Direkte Lösung
 * Eine eigenständige Datei zur Behebung aller Probleme mit dem Dokumentenkonverter-Tab
 */

(function() {
    // Sofort ausführen, wenn das DOM geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    function initialize() {
        console.log('DocConverter Direct Fix: Initialisiere');
        
        // DocConverter-Container suchen oder erstellen
        const container = findOrCreateContainer();
        
        if (container) {
            console.log('DocConverter Direct Fix: Container gefunden oder erstellt, zeige UI an');
            showDirectUI(container);
        } else {
            console.error('DocConverter Direct Fix: Konnte keinen Container finden oder erstellen');
        }
    }
    
    function findOrCreateContainer() {
        // Vorhandene Container suchen
        const existingContainer = 
            document.getElementById('doc-converter-container') || 
            document.querySelector('#rescue-tab-doc-converter') ||
            document.getElementById('doc-converter-app') ||
            document.querySelector('[data-tab="docConverter"]');
            
        if (existingContainer) {
            console.log('DocConverter Direct Fix: Existierenden Container gefunden');
            return existingContainer;
        }
        
        // Keinen Container gefunden, neuen erstellen
        console.log('DocConverter Direct Fix: Erstelle neuen Container');
        
        // Suche nach einem Admin-Bereich, wo wir den Container einfügen können
        const adminContent = document.querySelector('.admin-content') || 
                            document.querySelector('.admin-panel-content') || 
                            document.querySelector('.content-container') ||
                            document.querySelector('.main-content') ||
                            document.querySelector('main') ||
                            document.body; // Notfalls in den Body einbinden
                            
        if (!adminContent) {
            console.error('DocConverter Direct Fix: Kein Ziel für Container-Einfügung gefunden');
            return null;
        }
        
        // Container erstellen
        const container = document.createElement('div');
        container.id = 'doc-converter-container';
        container.className = 'doc-converter admin-tab-content';
        container.setAttribute('data-tab', 'docConverter');
        container.style.cssText = `
            display: block \!important;
            visibility: visible \!important;
            opacity: 1 \!important;
            min-height: 400px;
            width: 100%;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin: 20px 0;
        `;
        
        adminContent.appendChild(container);
        return container;
    }
    
    function showDirectUI(container) {
        // Stile für Container hinzufügen
        container.style.display = 'block';
        container.style.visibility = 'visible';
        container.style.opacity = '1';
        
        // UI direkt in den Container einfügen
        container.innerHTML = `
            <div class="doc-converter classic-ui">
                <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">Dokumenten-Konverter (Direkte Lösung)</h2>
                
                <div style="padding: 1rem; margin-bottom: 1.5rem; background-color: #eefbff; border-left: 4px solid #3b82f6;">
                    <p style="margin-bottom: 0.5rem;">Die direkte Lösung für den Dokumentenkonverter wurde aktiviert.</p>
                    <p style="margin-bottom: 0;">Diese Implementierung arbeitet unabhängig von Vue.js oder anderen Skripten.</p>
                </div>
                
                <form action="/api/admin/upload/document" method="post" enctype="multipart/form-data">
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
                        <button type="submit" style="background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 500;">
                            Dokument konvertieren
                        </button>
                        
                        <button type="reset" style="background: #e5e7eb; color: #374151; padding: 0.75rem 1.5rem; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 500;">
                            Zurücksetzen
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        // CSS für die direkte Lösung einfügen
        addCSSToHead();
        
        console.log('DocConverter Direct Fix: UI erfolgreich angezeigt');
    }
    
    function addCSSToHead() {
        // Prüfen, ob CSS bereits existiert
        if (document.querySelector('style[data-id="doc-converter-direct-fix"]')) {
            return; // CSS bereits vorhanden
        }
        
        const styleEl = document.createElement('style');
        styleEl.setAttribute('data-id', 'doc-converter-direct-fix');
        styleEl.textContent = `
            /* Direktes CSS für DocConverter */
            #doc-converter-container,
            #doc-converter-app,
            .doc-converter,
            [data-tab="docConverter"],
            #rescue-tab-doc-converter,
            .admin-tab-content[data-tab="docConverter"],
            .admin-tab-content.docConverter {
                display: block \!important;
                visibility: visible \!important;
                opacity: 1 \!important;
                min-height: 400px;
                width: 100%;
            }
            
            .doc-converter.classic-ui {
                padding: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            }
            
            .doc-converter.classic-ui input[type="file"] {
                transition: border-color 0.2s;
            }
            
            .doc-converter.classic-ui input[type="file"]:hover {
                border-color: #3b82f6;
            }
            
            .doc-converter.classic-ui button {
                transition: background-color 0.2s, transform 0.1s;
            }
            
            .doc-converter.classic-ui button:hover {
                transform: translateY(-1px);
            }
            
            .doc-converter.classic-ui button[type="submit"]:hover {
                background-color: #2563eb;
            }
            
            .doc-converter.classic-ui button[type="reset"]:hover {
                background-color: #d1d5db;
            }
        `;
        
        document.head.appendChild(styleEl);
    }
})();
