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
        showSettingsPanel.value = !showSettingsPanel.value;
    };
    
    /**
     * Setzt das Farbschema
     * @param {string} theme - 'light', 'dark' oder 'contrast'
     */
    const setTheme = (theme) => {
        currentTheme.value = theme;
        localStorage.setItem('theme', theme);
        
        // Entferne alle Theme-Klassen
        document.body.classList.remove('theme-light', 'theme-dark', 'theme-contrast');
        
        // Füge die ausgewählte Theme-Klasse hinzu
        if (theme !== 'light') {
            document.body.classList.add(`theme-${theme}`);
        }
    };
    
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
        accessibilitySettings.value = {...accessibilitySettings.value, ...settings};
        
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
    };
    
    // Einstellungen beim Laden initialisieren
    initializeSettings();
    
    // Watch für Einstellungsänderungen
    Vue.watch(accessibilitySettings, (newSettings) => {
        updateAccessibilitySettings(newSettings);
    }, { deep: true });
    
    // Rückgabe der Funktionen und Zustände für die Verwendung in der Vue-App
    return {
        showSettingsPanel,
        currentTheme,
        currentFontSize,
        accessibilitySettings,
        toggleSettings,
        setTheme,
        setFontSize,
        updateAccessibilitySettings
    };
}