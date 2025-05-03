/**
 * Initialisierung für den Dokumentenkonverter
 * Dieses Skript wird im Admin-Panel im DocConverter-Tab verwendet
 */
(function() {
    console.log('Dokumentenkonverter-Initialisierung gestartet');
    console.log('Dokumentenkonverter Debug: Skript erfolgreich geladen');
    
    /**
     * Zeigt die Minimal-UI für den Dokumentenkonverter an, wenn alles andere fehlschlägt
     */
    function showMinimalUI() {
        console.log('Zeige minimale Notfall-UI für den Dokumentenkonverter');
        const docConverterApp = document.getElementById('doc-converter-app');
        
        if (docConverterApp) {
            docConverterApp.innerHTML = `
                <div class="p-6">
                    <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                <i class="fas fa-exclamation-triangle text-red-500"></i>
                            </div>
                            <div class="ml-3">
                                <p class="text-sm text-red-700">
                                    Fehler: Weder die Vue.js-Komponente noch die Fallback-Lösung konnten geladen werden.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="border rounded-lg p-6 bg-white shadow-sm">
                        <h3 class="text-lg font-medium mb-4">Einfache Upload-Funktion</h3>
                        
                        <form action="/api/admin/upload/document" method="post" enctype="multipart/form-data" class="space-y-4">
                            <div>
                                <label class="block text-gray-700 text-sm font-medium mb-2">Datei auswählen</label>
                                <input type="file" name="file" class="border rounded p-2 w-full" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.html,.txt">
                            </div>
                            
                            <div>
                                <label class="block text-gray-700 text-sm font-medium mb-2">Optionen</label>
                                <div class="flex items-center">
                                    <input type="checkbox" name="post_processing" id="post_processing" checked class="mr-2">
                                    <label for="post_processing" class="text-sm text-gray-600">Nachbearbeitung aktivieren (verbessert Struktur und Format)</label>
                                </div>
                            </div>
                            
                            <div class="pt-4">
                                <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded">
                                    <i class="fas fa-upload mr-2"></i>Dokument hochladen und konvertieren
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Prüft die Feature-Toggle-Einstellungen
     * @returns {Object} - Feature-Toggle-Einstellungen
     */
    function checkFeatureToggleSettings() {
        // Standardeinstellung: Vue.js ist aktiviert, wenn nichts anderes konfiguriert ist
        const defaultSettings = {
            useNewUI: true,
            vueDocConverter: true
        };
        
        try {
            // Prüfe, ob globale UI-Version aktiviert ist
            const useNewUI = localStorage.getItem('useNewUI') === 'true';
            
            // Wenn neue UI deaktiviert ist, verwende die alte Implementierung
            if (useNewUI === false) {
                return { useNewUI: false, vueDocConverter: false };
            }
            
            // Prüfe spezifischen Feature-Toggle für DocConverter
            const vueDocConverter = localStorage.getItem('feature_vueDocConverter') !== 'false';
            
            return { 
                useNewUI: useNewUI, 
                vueDocConverter: vueDocConverter 
            };
        } catch (e) {
            console.warn('Fehler beim Lesen der Feature-Toggle-Einstellungen:', e);
            return defaultSettings;
        }
    }

    /**
     * Lädt die klassische Fallback-Implementierung
     */
    function loadFallbackImplementation() {
        console.log('Lade klassische Implementierung für Dokumentenkonverter');
        
        try {
            const fallbackScript = document.createElement('script');
            fallbackScript.src = '/static/js/doc-converter-fallback.js';
            
            // Bei Fehler des Fallback-Skripts
            fallbackScript.onerror = function() {
                console.error('Fehler beim Laden der klassischen Implementierung');
                // Letzte Rettung: Minimale UI anzeigen
                showMinimalUI();
            };
            
            document.body.appendChild(fallbackScript);
        } catch (e) {
            console.error('Kritischer Fehler beim Laden der Fallback-Implementierung:', e);
            showMinimalUI();
        }
    }

    // Funktionen für den Tab "Dokumente konvertieren"
    function setupDocConverter() {
        console.log('DocConverter-Tab initialisiert');
        
        try {
            // Feature-Toggle-Einstellungen prüfen
            const featureSettings = checkFeatureToggleSettings();
            console.log('Feature-Toggle-Einstellungen für DocConverter:', featureSettings);
            
            // Dev-Modus: UI-Hinweis anzeigen
            const devMode = localStorage.getItem('devMode') === 'true';
            if (devMode) {
                try {
                    // Füge Hinweis zur aktiven UI-Version ein
                    const uiVersionInfo = document.createElement('div');
                    uiVersionInfo.className = 'text-xs text-gray-500 mb-4 p-2 bg-gray-100 rounded';
                    uiVersionInfo.innerHTML = featureSettings.vueDocConverter ? 
                        '<i class="fas fa-info-circle mr-1"></i> Aktiv: <strong>Vue.js-Komponente</strong>' : 
                        '<i class="fas fa-info-circle mr-1"></i> Aktiv: <strong>Klassische Implementierung</strong>';
                    
                    // Toggle-Button hinzufügen
                    const toggleButton = document.createElement('button');
                    toggleButton.className = 'ml-4 text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded';
                    toggleButton.textContent = featureSettings.vueDocConverter ? 'Zu klassischer UI wechseln' : 'Zu Vue.js UI wechseln';
                    toggleButton.onclick = function() {
                        localStorage.setItem('feature_vueDocConverter', (!featureSettings.vueDocConverter).toString());
                        window.location.reload();
                    };
                    
                    uiVersionInfo.appendChild(toggleButton);
                    
                    // Vor dem Konverter-Container einfügen
                    const container = document.querySelector('#doc-converter-app');
                    if (container) {
                        container.parentNode.insertBefore(uiVersionInfo, container);
                    }
                } catch (e) {
                    console.warn('Fehler beim Anzeigen des Dev-Modus-Hinweises:', e);
                }
            }
            
            // Basierend auf Feature-Toggle entscheiden, welche Implementierung geladen wird
            if (featureSettings.useNewUI && featureSettings.vueDocConverter) {
                console.log('Versuche Vue.js-Implementierung zu laden');
                
                try {
                    // Zeitüberwachung einrichten - wenn nach 5 Sekunden nicht geladen, Fallback nutzen
                    const loadTimeout = setTimeout(function() {
                        console.warn('Vue.js-Dokumentenkonverter konnte nicht innerhalb von 5 Sekunden geladen werden, wechsle zu Fallback');
                        loadFallbackImplementation();
                    }, 5000);
                    
                    // Dynamisch Vue-Komponente laden
                    const converterScript = document.createElement('script');
                    converterScript.src = '/static/vue/standalone/doc-converter.js';
                    converterScript.type = 'module';
                    
                    // Bei Erfolg
                    converterScript.onload = function() {
                        console.log('Vue.js-Dokumentenkonverter erfolgreich geladen');
                        clearTimeout(loadTimeout);
                    };
                    
                    // Bei Fehler Fallback laden
                    converterScript.onerror = function() {
                        console.error('Fehler beim Laden des Vue.js-Dokumentenkonverters');
                        clearTimeout(loadTimeout);
                        loadFallbackImplementation();
                    };
                    
                    document.body.appendChild(converterScript);
                } catch (e) {
                    console.error('Fehler beim Laden der Vue.js-Implementierung:', e);
                    loadFallbackImplementation();
                }
            } else {
                // Fallback-Implementierung direkt laden
                loadFallbackImplementation();
            }
        } catch (e) {
            console.error('Kritischer Fehler beim Initialisieren des Dokumentenkonverters:', e);
            showMinimalUI();
        }
    }
    
    // Prüfen, ob der Doc-Converter-Tab aktiv ist und ggf. initialisieren
    function checkAndInitDocConverter() {
        console.log('Prüfe auf aktiven DocConverter-Tab');
        
        // Direkt initialisieren, da wir bereits wissen, dass wir im DocConverter-Tab sind
        console.log('DocConverter-Tab sollte aktiv sein, initialisiere direkt...');
        
        // Überprüfen, ob der Container sichtbar ist
        const container = document.getElementById('doc-converter-container');
        if (container) {
            console.log('DocConverter-Container gefunden:', container);
            setupDocConverter();
        } else {
            console.log('DocConverter-Container NICHT gefunden! Suche nach anderen Elementen...');
            
            // Versuche, andere wichtige Elemente zu finden
            const docConverterApp = document.getElementById('doc-converter-app');
            console.log('doc-converter-app gefunden:', !!docConverterApp);
            
            // Liste alle Container in der DOM-Struktur auf
            const allDivs = document.querySelectorAll('div[id]');
            console.log('Alle DIVs mit IDs:', Array.from(allDivs).map(div => div.id).join(', '));
            
            // Trotzdem versuchen zu initialisieren
            setTimeout(setupDocConverter, 500);
        }
        
        // Backup: Event-Listener für Tab-Wechsel
        document.querySelectorAll('.admin-nav-item').forEach(tab => {
            tab.addEventListener('click', function() {
                if (this.textContent && this.textContent.includes('Dokumente konvertieren')) {
                    console.log('Wechsel zum DocConverter-Tab erkannt durch Klick');
                    setTimeout(setupDocConverter, 300);
                }
            });
        });
    }
    
    // Initialisierung starten wenn DOM geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndInitDocConverter);
    } else {
        checkAndInitDocConverter();
    }
    
    // Globale Methode für manuelle Initialisierung
    window.initDocConverter = setupDocConverter;
})();