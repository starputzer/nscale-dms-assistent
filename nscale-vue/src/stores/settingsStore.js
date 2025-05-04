// stores/settingsStore.js
import { defineStore } from 'pinia';
import axios from 'axios';
import { useAuthStore } from './authStore';

/**
 * Store zur Verwaltung der Benutzereinstellungen
 * Enthält Funktionen für Theme, Schriftgröße, Barrierefreiheitsoptionen und mehr
 */
export const useSettingsStore = defineStore('settings', {
  state: () => ({
    // Theme: 'light', 'dark', 'contrast'
    theme: localStorage.getItem('theme') || 'light',
    
    // Schriftgröße: 'small', 'medium', 'large'
    fontSize: localStorage.getItem('fontSize') || 'medium',
    
    // Barrierefreiheitseinstellungen
    accessibility: {
      reduceMotion: localStorage.getItem('reduceMotion') === 'true' || false,
      simpleLanguage: localStorage.getItem('simpleLanguage') === 'true' || false
    },
    
    // Benachrichtigungseinstellungen
    notifications: {
      sessions: localStorage.getItem('notifySessions') === 'true' || true,
      system: localStorage.getItem('notifySystem') === 'true' || false,
      email: localStorage.getItem('notifyEmail') === 'true' || false
    },
    
    // Anwendungseinstellungen
    appSettings: {
      defaultView: localStorage.getItem('defaultView') || 'chat',
      language: localStorage.getItem('uiLanguage') || 'de',
      autoSave: localStorage.getItem('autoSave') === 'true' || true
    },
    
    // Panel-Zustand
    showSettingsPanel: false,
    
    // Laden-Status
    loading: false,
    
    // Fehler-Status
    error: null,
    
    // Flag für serverseitige Synchronisierung der Einstellungen
    synced: false
  }),
  
  getters: {
    /**
     * Gibt den Klassen-Namen für das aktuelle Theme
     */
    themeClass: (state) => `theme-${state.theme}`,
    
    /**
     * Gibt den Klassen-Namen für die aktuelle Schriftgröße
     */
    fontSizeClass: (state) => state.fontSize !== 'medium' ? `font-${state.fontSize}` : '',
    
    /**
     * Prüft, ob reduzierte Bewegung aktiviert ist
     */
    hasReducedMotion: (state) => state.accessibility.reduceMotion,
    
    /**
     * Prüft, ob einfache Sprache aktiviert ist
     */
    usesSimpleLanguage: (state) => state.accessibility.simpleLanguage
  },
  
  actions: {
    /**
     * Setzt das Theme und aktualisiert das DOM entsprechend
     * @param {string} theme - Das neue Theme ('light', 'dark', 'contrast')
     */
    setTheme(theme) {
      if (!['light', 'dark', 'contrast'].includes(theme)) {
        console.error(`Ungültiges Theme: ${theme}`);
        return;
      }
      
      // Altes Theme vom body entfernen
      document.body.classList.remove('theme-light', 'theme-dark', 'theme-contrast');
      
      // Neues Theme setzen
      document.body.classList.add(`theme-${theme}`);
      
      // Im Store und localStorage speichern
      this.theme = theme;
      localStorage.setItem('theme', theme);
      
      // Zusätzliche Anpassungen für Kontrast-Modus
      if (theme === 'contrast') {
        document.documentElement.style.setProperty('--focus-ring-color', '#ffeb3b');
      } else {
        document.documentElement.style.removeProperty('--focus-ring-color');
      }
      
      // Zum Server synchronisieren, wenn Benutzer angemeldet ist
      this.syncSettings();
    },
    
    /**
     * Setzt die Schriftgröße und aktualisiert das DOM entsprechend
     * @param {string} size - Die neue Schriftgröße ('small', 'medium', 'large')
     */
    setFontSize(size) {
      if (!['small', 'medium', 'large'].includes(size)) {
        console.error(`Ungültige Schriftgröße: ${size}`);
        return;
      }
      
      // Alte Schriftgröße vom body entfernen
      document.body.classList.remove('font-small', 'font-medium', 'font-large');
      
      // Neue Schriftgröße setzen (außer bei 'medium', das ist der Standard)
      if (size !== 'medium') {
        document.body.classList.add(`font-${size}`);
      }
      
      // Im Store und localStorage speichern
      this.fontSize = size;
      localStorage.setItem('fontSize', size);
      
      // Zum Server synchronisieren, wenn Benutzer angemeldet ist
      this.syncSettings();
    },
    
    /**
     * Aktualisiert die Barrierefreiheitseinstellungen
     * @param {Object} settings - Objekt mit den zu aktualisierenden Einstellungen
     */
    updateAccessibilitySettings(settings) {
      // Einstellungen zusammenführen
      this.accessibility = {
        ...this.accessibility,
        ...settings
      };
      
      // Reduzierte Bewegung anwenden
      if (this.accessibility.reduceMotion) {
        document.body.classList.add('reduce-motion');
      } else {
        document.body.classList.remove('reduce-motion');
      }
      
      // Einfache Sprache speichern
      localStorage.setItem('reduceMotion', this.accessibility.reduceMotion.toString());
      localStorage.setItem('simpleLanguage', this.accessibility.simpleLanguage.toString());
      
      // Headers für einfache Sprache setzen, falls aktiviert
      if (this.accessibility.simpleLanguage) {
        if (axios.defaults.headers) {
          axios.defaults.headers.common['X-Use-Simple-Language'] = 'true';
        }
      } else {
        if (axios.defaults.headers && axios.defaults.headers.common) {
          delete axios.defaults.headers.common['X-Use-Simple-Language'];
        }
      }
      
      // Ein Event für andere Komponenten auslösen
      const event = new CustomEvent('simpleLanguageChanged', { 
        detail: { enabled: this.accessibility.simpleLanguage } 
      });
      document.dispatchEvent(event);
      
      // Zum Server synchronisieren, wenn Benutzer angemeldet ist
      this.syncSettings();
    },
    
    /**
     * Öffnet/schließt das Einstellungs-Panel
     * @param {boolean} show - Optional: Explizit öffnen oder schließen
     */
    toggleSettingsPanel(show) {
      if (show === undefined) {
        this.showSettingsPanel = !this.showSettingsPanel;
      } else {
        this.showSettingsPanel = show;
      }
      
      // Event-Listener für Escape-Taste hinzufügen/entfernen
      if (this.showSettingsPanel) {
        document.addEventListener('keydown', this.handleEscapeKey);
        // Verzögerung für Klicks außerhalb
        setTimeout(() => {
          document.addEventListener('click', this.handleOutsideClick);
        }, 100);
      } else {
        document.removeEventListener('keydown', this.handleEscapeKey);
        document.removeEventListener('click', this.handleOutsideClick);
      }
    },
    
    /**
     * Schließt das Panel bei Drücken der Escape-Taste
     */
    handleEscapeKey(event) {
      if (event.key === 'Escape') {
        this.toggleSettingsPanel(false);
      }
    },
    
    /**
     * Schließt das Panel bei Klick außerhalb
     */
    handleOutsideClick(event) {
      // Prüfen, ob der Klick außerhalb des Panels erfolgte
      const settingsPanel = document.querySelector('.settings-panel');
      if (settingsPanel && !settingsPanel.contains(event.target) && 
          !event.target.classList.contains('accessibility-button') &&
          !event.target.closest('.accessibility-button')) {
        this.toggleSettingsPanel(false);
      }
    },
    
    /**
     * Synchronisiert die Einstellungen mit dem Server (für eingeloggte Benutzer)
     */
    async syncSettings() {
      // Prüfen, ob Benutzer angemeldet ist
      const authStore = useAuthStore();
      if (!authStore.isAuthenticated || this.synced) return;
      
      this.loading = true;
      this.error = null;
      
      try {
        // Aktuelle Einstellungen zum Server senden
        await axios.post('/api/user/settings', {
          theme: this.theme,
          fontSize: this.fontSize,
          accessibility: this.accessibility
        });
        
        this.synced = true;
      } catch (error) {
        console.error('Fehler beim Synchronisieren der Einstellungen:', error);
        this.error = error.response?.data?.detail || 'Einstellungen konnten nicht gespeichert werden';
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Lädt die Einstellungen vom Server (für eingeloggte Benutzer)
     */
    async loadSettings() {
      // Prüfen, ob Benutzer angemeldet ist
      const authStore = useAuthStore();
      if (!authStore.isAuthenticated) return;
      
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.get('/api/user/settings');
        const settings = response.data;
        
        // Theme aktualisieren (falls vorhanden)
        if (settings.theme) {
          this.setTheme(settings.theme);
        }
        
        // Schriftgröße aktualisieren (falls vorhanden)
        if (settings.fontSize) {
          this.setFontSize(settings.fontSize);
        }
        
        // Barrierefreiheitseinstellungen aktualisieren (falls vorhanden)
        if (settings.accessibility) {
          this.updateAccessibilitySettings(settings.accessibility);
        }
        
        this.synced = true;
      } catch (error) {
        console.error('Fehler beim Laden der Einstellungen:', error);
        this.error = error.response?.data?.detail || 'Einstellungen konnten nicht geladen werden';
        
        // Bei Fehler die lokalen Einstellungen verwenden
        this.applyLocalSettings();
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Wendet die lokalen Einstellungen auf das DOM an
     */
    applyLocalSettings() {
      // Theme
      document.body.classList.remove('theme-light', 'theme-dark', 'theme-contrast');
      document.body.classList.add(`theme-${this.theme}`);
      
      // Schriftgröße
      document.body.classList.remove('font-small', 'font-medium', 'font-large');
      if (this.fontSize !== 'medium') {
        document.body.classList.add(`font-${this.fontSize}`);
      }
      
      // Reduzierte Bewegung
      if (this.accessibility.reduceMotion) {
        document.body.classList.add('reduce-motion');
      } else {
        document.body.classList.remove('reduce-motion');
      }
      
      // Headers für einfache Sprache
      if (this.accessibility.simpleLanguage) {
        if (axios.defaults.headers) {
          axios.defaults.headers.common['X-Use-Simple-Language'] = 'true';
        }
      }
    },
    
    /**
     * Initialisiert den Settings-Store
     */
    init() {
      // Lokale Einstellungen anwenden
      this.applyLocalSettings();
      
      // Versuchen, vom Server zu laden (falls Benutzer angemeldet ist)
      this.loadSettings();
    }
  }
});