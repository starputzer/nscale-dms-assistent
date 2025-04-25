/**
 * Stellt die Einstellungs-Funktionalität bereit
 * @param {Object} options - Konfigurationsoptionen
 * @returns {Object} - Einstellungs-Funktionen und -Zustand
 */
export function setupSettings(options) {
    const {
        token
    } = options;
    
    // Einstellungszustand
    const showSettingsPanel = Vue.ref(false);
    const currentTheme = Vue.ref(localStorage.getItem('theme') || 'light');
    const currentFontSize = Vue.ref(localStorage.getItem('fontSize') || 'medium');
    const accessibilitySettings = Vue.ref({
        reduceMotion: localStorage.getItem('reduceMotion') === 'true',
        simpleLanguage: localStorage.getItem('simpleLanguage') === 'true'
    });
    
    /**
     * Öffnet/Schließt das Einstellungs-Panel
     */
    const toggleSettings = () => {
        console.log("Toggle Settings Panel", showSettingsPanel.value);
        showSettingsPanel.value = !showSettingsPanel.value;
        
        // Event-Listener für ESC-Taste hinzufügen, wenn Panel geöffnet ist
        if (showSettingsPanel.value) {
            document.addEventListener('keydown', handleEscapeKey);
            // Event-Listener für Klicks außerhalb des Panels hinzufügen
            setTimeout(() => {
                document.addEventListener('click', handleOutsideClick);
            }, 100);
        } else {
            document.removeEventListener('keydown', handleEscapeKey);
            document.removeEventListener('click', handleOutsideClick);
        }
    };

    // Funktion zum Schließen des Panels mit ESC-Taste
    const handleEscapeKey = (event) => {
        if (event.key === 'Escape') {
            closeSettingsPanel();
        }
    };
    
    // Funktion zum Schließen des Panels bei Klick außerhalb
    const handleOutsideClick = (event) => {
        // Prüfen, ob der Klick außerhalb des Panels erfolgte
        const settingsPanel = document.querySelector('.settings-panel');
        if (settingsPanel && !settingsPanel.contains(event.target) && 
            !event.target.classList.contains('floating-action-button') &&
            !event.target.closest('.floating-action-button')) {
            closeSettingsPanel();
        }
    };
    
    // Separate Funktion zum Schließen des Panels
    const closeSettingsPanel = () => {
        showSettingsPanel.value = false;
        document.removeEventListener('keydown', handleEscapeKey);
        document.removeEventListener('click', handleOutsideClick);
    };
    
    /**
     * Setzt das Farbschema
     * @param {string} theme - 'light', 'dark' oder 'contrast'
     */
    const setTheme = (theme) => {
        // Debug-Ausgabe hinzufügen
        console.log(`Setze Theme auf: ${theme}`);
        
        // Wert aktualisieren
        currentTheme.value = theme;
        localStorage.setItem('theme', theme);
        
        // WICHTIG: Verzögerung hinzufügen, um sicherzustellen, dass Vue die DOM-Updates abgeschlossen hat
        setTimeout(() => {
            // Alle Theme-Klassen entfernen und explizit auflisten
            document.body.classList.remove('theme-light', 'theme-dark', 'theme-contrast');
            
            // Theme-Klasse hinzufügen (für alle Themes, nicht nur für nicht-light)
            document.body.classList.add(`theme-${theme}`);
            
            console.log(`Theme-Klasse gesetzt: theme-${theme}`);
            
            // Kontrast-Modus Handling bleibt gleich
            if (theme === 'contrast') {
                document.documentElement.style.setProperty('--focus-ring-color', '#ffeb3b');
            } else {
                document.documentElement.style.removeProperty('--focus-ring-color');
            }
        }, 50);
    }
    
    /**
     * Setzt die Schriftgröße
     * @param {string} size - 'small', 'medium' oder 'large'
     */
    const setFontSize = (size) => {
        currentFontSize.value = size;
        localStorage.setItem('fontSize', size);
        
        // Entferne alle Schriftgrößen-Klassen
        document.body.classList.remove('font-small', 'font-medium', 'font-large');
        
        // Füge die ausgewählte Schriftgrößen-Klasse hinzu
        if (size !== 'medium') {
            document.body.classList.add(`font-${size}`);
        }
    };
    
    /**
     * Aktualisiert die Barrierefreiheits-Einstellungen
     * @param {Object} settings - Die Einstellungen
     */
    const updateAccessibilitySettings = (settings) => {
        // Erstelle eine Kopie der aktuellen Einstellungen
        const newSettings = {...accessibilitySettings.value, ...settings};
        
        // BUGFIX: Event-Handling-Fix für reduceMotion
        // Vor dem Aktivieren/Deaktivieren mögliche Event-Listener entfernen
        if ('reduceMotion' in settings) {
            // Wenn sich der Wert für reduceMotion ändert
            if (settings.reduceMotion !== accessibilitySettings.value.reduceMotion) {
                // Wenn wir Animationen reduzieren werden, Event-Listener für Klicks außerhalb entfernen und neu hinzufügen
                if (settings.reduceMotion) {
                    console.log("Entferne Event-Listener vor Aktivierung von reduceMotion");
                    document.removeEventListener('click', handleOutsideClick);
                    document.removeEventListener('keydown', handleEscapeKey);
                    
                    // Nach kurzer Verzögerung wieder hinzufügen, wenn das Panel noch geöffnet ist
                    setTimeout(() => {
                        if (showSettingsPanel.value) {
                            console.log("Füge Event-Listener nach Aktivierung von reduceMotion wieder hinzu");
                            document.addEventListener('click', handleOutsideClick);
                            document.addEventListener('keydown', handleEscapeKey);
                        }
                    }, 100);
                }
            }
        }
        
        // Setze die neuen Einstellungen
        accessibilitySettings.value = newSettings;
        
        // Speichere alle Einstellungen im localStorage
        for (const [key, value] of Object.entries(accessibilitySettings.value)) {
            localStorage.setItem(key, value);
        }
        
        // Anwenden der reduzierten Bewegung
        if (accessibilitySettings.value.reduceMotion) {
            document.body.classList.add('reduce-motion');
        } else {
            document.body.classList.remove('reduce-motion');
        }
        
        // Wenn sich die Spracheinstellung ändert, müssen wir das UI aktualisieren
        // und den Prompt anpassen
        if ('simpleLanguage' in settings) {
            applySimpleLanguageSettings(settings.simpleLanguage);
        }
    };
    
    /**
     * Wendet die Einstellung für einfache Sprache an
     * @param {boolean} useSimpleLanguage - Ob einfache Sprache verwendet werden soll
     */
    const applySimpleLanguageSettings = (useSimpleLanguage) => {
        console.log(`Einfache Sprache ${useSimpleLanguage ? 'aktiviert' : 'deaktiviert'}`);
        
        // Hier könnte man einen Event auslösen oder einen globalen Zustand setzen,
        // der dann vom Chat-Modul für die Prompt-Generierung verwendet wird
        
        // Beispiel: Globale Variable setzen, die vom Chat-Modul geprüft wird
        window.useSimpleLanguage = useSimpleLanguage;
        
        // Alternativ: Event auslösen, das andere Module abfangen können
        const event = new CustomEvent('simpleLanguageChanged', { 
            detail: { enabled: useSimpleLanguage } 
        });
        document.dispatchEvent(event);
        
        // Wenn eine aktive Anfrage läuft, Header für nächste Anfrage setzen
        if (useSimpleLanguage) {
            if (axios && axios.defaults && axios.defaults.headers) {
                axios.defaults.headers.common['X-Use-Simple-Language'] = 'true';
            }
        } else {
            if (axios && axios.defaults && axios.defaults.headers) {
                delete axios.defaults.headers.common['X-Use-Simple-Language'];
            }
        }
    };
    
    /**
     * Initialisiert die Einstellungen beim Start
     */
    const initializeSettings = () => {
        // Theme anwenden
        setTheme(currentTheme.value);
        
        // Schriftgröße anwenden
        setFontSize(currentFontSize.value);
        
        // Barrierefreiheits-Einstellungen anwenden
        if (accessibilitySettings.value.reduceMotion) {
            document.body.classList.add('reduce-motion');
        }
        
        // Initialisiere die globale Variable für einfache Sprache
        window.useSimpleLanguage = accessibilitySettings.value.simpleLanguage;
        
        // Header für einfache Sprache setzen, falls aktiviert
        if (accessibilitySettings.value.simpleLanguage) {
            if (axios && axios.defaults && axios.defaults.headers) {
                axios.defaults.headers.common['X-Use-Simple-Language'] = 'true';
            }
        }
    };
    
    // Einstellungen beim Laden initialisieren
    initializeSettings();
    
    // Watch für Einstellungsänderungen
    Vue.watch(() => currentTheme.value, (newTheme) => {
        setTheme(newTheme);
    });
    
    Vue.watch(() => currentFontSize.value, (newSize) => {
        setFontSize(newSize);
    });
    
    // Überwachung der Änderungen an den Barrierefreiheits-Einstellungen
    // Verwende Options API für bessere Kontrolle
    Vue.watch(() => accessibilitySettings.value.reduceMotion, (newValue, oldValue) => {
        if (newValue !== oldValue) {
            console.log(`reduceMotion geändert: ${oldValue} -> ${newValue}`);
            updateAccessibilitySettings({ reduceMotion: newValue });
        }
    });
    
    Vue.watch(() => accessibilitySettings.value.simpleLanguage, (newValue, oldValue) => {
        if (newValue !== oldValue) {
            console.log(`simpleLanguage geändert: ${oldValue} -> ${newValue}`);
            updateAccessibilitySettings({ simpleLanguage: newValue });
        }
    });
    
    // Rückgabe der Funktionen und Zustände für die Verwendung in der Vue-App
    return {
        showSettingsPanel,
        currentTheme,
        currentFontSize,
        accessibilitySettings,
        toggleSettings,
        closeSettingsPanel,
        setTheme,
        setFontSize,
        updateAccessibilitySettings
    };
}