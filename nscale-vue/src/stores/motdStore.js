// stores/motdStore.js
import { defineStore } from 'pinia';
import axios from 'axios';
import { useAuthStore } from './authStore';

/**
 * Store zur Verwaltung der Message of the Day (MOTD)
 * Enthält Funktionen zum Laden, Speichern und Anzeigen der MOTD
 */
export const useMotdStore = defineStore('motd', {
  state: () => ({
    // MOTD-Inhalt
    motd: null,
    
    // MOTD ausgeblendet?
    dismissed: localStorage.getItem('motdDismissed') === 'true' || false,
    
    // Standardwerte für MOTD, falls keine vom Server geladen werden kann
    defaultMotd: {
      enabled: true,
      format: 'markdown',
      content: '🛠️ **BETA-VERSION: Lokaler KI-Assistent für nscale**\n\nDieser Assistent beantwortet Fragen zur Nutzung der nscale DMS-Software auf Basis interner Informationen.\n\n🔒 **Wichtige Hinweise:**\n- Alle Datenverarbeitungen erfolgen **ausschließlich lokal im Landesnetz Berlin**.\n- Es besteht **keine Verbindung zum Internet** – Ihre Eingaben verlassen niemals das System.\n- **Niemand außer Ihnen** hat Zugriff auf Ihre Eingaben oder Fragen.\n- Die Antworten werden von einer KI generiert – **Fehlinformationen sind möglich**.\n- Bitte geben Sie **keine sensiblen oder personenbezogenen Daten** ein.\n\n🧠 Der Assistent befindet sich in der Erprobung und wird stetig weiterentwickelt.',
      style: {
        backgroundColor: '#fff3cd',
        borderColor: '#ffeeba',
        textColor: '#856404',
        iconClass: "info-circle"
      },
      display: {
        position: "top",
        dismissible: true,
        showOnStartup: false,
        showInChat: true
      }
    },
    
    // Admin-Bearbeitungsansicht
    adminEdit: {
      enabled: true,
      format: 'markdown',
      content: '',
      style: {
        backgroundColor: '#fff3cd',
        borderColor: '#ffeeba',
        textColor: '#856404',
        iconClass: "info-circle"
      },
      display: {
        position: "top",
        dismissible: true,
        showOnStartup: false,
        showInChat: true
      }
    },
    
    // Vordefinierte Farbschemata
    colorThemes: {
      warning: {
        backgroundColor: '#fff3cd',
        borderColor: '#ffeeba',
        textColor: '#856404'
      },
      info: {
        backgroundColor: '#e1ecf8',
        borderColor: '#bee5eb',
        textColor: '#0c5460'
      },
      success: {
        backgroundColor: '#e0f5ea',
        borderColor: '#c3e6cb',
        textColor: '#155724'
      },
      danger: {
        backgroundColor: '#f8d7da',
        borderColor: '#f5c6cb',
        textColor: '#721c24'
      },
      neutral: {
        backgroundColor: '#f8f9fa',
        borderColor: '#dee2e6',
        textColor: '#495057'
      }
    },
    
    // UI-Zustand
    selectedColorTheme: 'warning',
    
    // Laden-Status
    loading: false,
    
    // Fehler-Status
    error: null
  }),
  
  getters: {
    /**
     * Prüft, ob die MOTD angezeigt werden soll
     */
    shouldShowMotd: (state) => {
      return state.motd && 
             state.motd.enabled && 
             !state.dismissed;
    },
    
    /**
     * Gibt den MOTD-Inhalt für die Anzeige zurück
     */
    motdContent: (state) => {
      return state.motd?.content || '';
    },
    
    /**
     * Gibt zurück, ob der Admin Bearbeitungsmodus aktiv ist
     */
    isAdminEditMode: (state, getters, rootState, rootGetters) => {
      const authStore = useAuthStore();
      return authStore.isAdmin;
    }
  },
  
  actions: {
    /**
     * Lädt die MOTD vom Server
     */
    async loadMotd() {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.get('/api/motd');
        this.motd = response.data;
        
        // Bestimme das Farbschema basierend auf der aktuellen MOTD
        if (this.motd && this.motd.style) {
          let matchFound = false;
          for (const [theme, colors] of Object.entries(this.colorThemes)) {
            if (colors.backgroundColor === this.motd.style.backgroundColor) {
              this.selectedColorTheme = theme;
              matchFound = true;
              break;
            }
          }
          if (!matchFound) {
            this.selectedColorTheme = 'custom';
          }
        }
        
        console.log("MOTD geladen:", this.motd);
      } catch (error) {
        console.error('Fehler beim Laden der MOTD:', error);
        this.error = error.response?.data?.detail || 'MOTD konnte nicht geladen werden';
        
        // Bei Fehler die Standardwerte verwenden
        this.motd = { ...this.defaultMotd };
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Blendet die MOTD aus
     */
    setDismissed(value = true) {
      this.dismissed = value;
      localStorage.setItem('motdDismissed', value.toString());
    },
    
    /**
     * Setzt die MOTD zurück (macht sie wieder sichtbar)
     */
    resetDismissed() {
      this.dismissed = false;
      localStorage.removeItem('motdDismissed');
    },
    
    /**
     * Lädt die MOTD für die Admin-Bearbeitung
     */
    async loadMotdForEditing() {
      const authStore = useAuthStore();
      if (!authStore.isAdmin) return;
      
      this.loading = true;
      
      try {
        const response = await axios.get('/api/motd');
        // Tiefe Kopie erstellen
        this.adminEdit = JSON.parse(JSON.stringify(response.data));
        
        // Bestimme das Farbschema
        let matchFound = false;
        for (const [theme, colors] of Object.entries(this.colorThemes)) {
          if (colors.backgroundColor === this.adminEdit.style.backgroundColor) {
            this.selectedColorTheme = theme;
            matchFound = true;
            break;
          }
        }
        if (!matchFound) {
          this.selectedColorTheme = 'custom';
        }
      } catch (error) {
        console.error('Fehler beim Laden der MOTD für die Bearbeitung:', error);
        // Bei Fehler die Standardwerte verwenden
        this.adminEdit = { ...this.defaultMotd };
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Speichert die bearbeitete MOTD
     */
    async saveMotd() {
      const authStore = useAuthStore();
      if (!authStore.isAdmin) return;
      
      this.loading = true;
      this.error = null;
      
      try {
        // Validierung
        if (!this.adminEdit.content.trim()) {
          throw new Error('Der MOTD-Inhalt darf nicht leer sein.');
        }
        
        // Zum Server speichern
        await axios.post('/api/admin/update-motd', this.adminEdit);
        
        // Lokale MOTD aktualisieren
        this.motd = JSON.parse(JSON.stringify(this.adminEdit));
        
        // MOTD sichtbar machen für alle Benutzer
        this.resetDismissed();
        
        return true;
      } catch (error) {
        console.error('Fehler beim Speichern der MOTD:', error);
        this.error = error.message || 'MOTD konnte nicht gespeichert werden';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Setzt die MOTD auf die Standardwerte zurück
     */
    resetMotdToDefaults() {
      this.adminEdit = { ...this.defaultMotd };
      this.selectedColorTheme = 'warning';
    },
    
    /**
     * Lädt die MOTD neu vom Server
     */
    async reloadMotd() {
      const authStore = useAuthStore();
      if (!authStore.isAdmin) return;
      
      this.loading = true;
      
      try {
        await axios.post('/api/admin/reload-motd');
        
        // MOTD neu laden
        await this.loadMotd();
        
        // MOTD für alle Benutzer sichtbar machen
        this.resetDismissed();
        
        return true;
      } catch (error) {
        console.error('Fehler beim Neuladen der MOTD:', error);
        this.error = error.response?.data?.detail || 'MOTD konnte nicht neu geladen werden';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Wendet ein vordefiniertes Farbschema auf die MOTD an
     * @param {string} themeName - Name des Farbschemas
     */
    applyColorTheme(themeName) {
      if (themeName !== 'custom' && this.colorThemes[themeName]) {
        const theme = this.colorThemes[themeName];
        this.adminEdit.style.backgroundColor = theme.backgroundColor;
        this.adminEdit.style.borderColor = theme.borderColor;
        this.adminEdit.style.textColor = theme.textColor;
      }
      
      this.selectedColorTheme = themeName;
    }
  }
});