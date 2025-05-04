// stores/authStore.js
import { defineStore } from 'pinia';
import axios from 'axios';
import { useToast } from '@/composables/useToast';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    loading: false,
    error: null
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    isFeedbackAnalyst: (state) => state.user?.role === 'feedback_analyst', 
    canViewFeedback: (state) => ['admin', 'feedback_analyst'].includes(state.user?.role),
    userRole: (state) => state.user?.role || 'guest',
    userId: (state) => state.user?.id,
    userEmail: (state) => state.user?.email
  },
  
  actions: {
    /**
     * Setzt die HTTP Auth-Header für alle API-Anfragen
     */
    setAuthHeader() {
      axios.defaults.headers.common['Authorization'] = this.token ? `Bearer ${this.token}` : '';
    },
    
    /**
     * Versucht, den Benutzer anzumelden
     * @param {Object} credentials - Anmeldedaten (E-Mail und Passwort)
     */
    async login(credentials) {
      const { showToast } = useToast();
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.post('/api/auth/login', credentials);
        
        this.token = response.data.token;
        localStorage.setItem('token', this.token);
        
        // Setze Auth-Header für zukünftige API-Anfragen
        this.setAuthHeader();
        
        // Lade Benutzerinformationen
        await this.fetchUserInfo();
        
        // Erfolgsmeldung anzeigen
        showToast('Erfolgreich angemeldet', 'success');
        
        return true;
      } catch (error) {
        this.error = error.response?.data?.detail || 'Bei der Anmeldung ist ein Fehler aufgetreten.';
        console.error('Login error:', error);
        
        // Fehlermeldung anzeigen
        showToast(this.error, 'error');
        
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Registriert einen neuen Benutzer
     * @param {Object} userData - Benutzerdaten (E-Mail, Passwort)
     */
    async register(userData) {
      const { showToast } = useToast();
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.post('/api/auth/register', userData);
        
        // Erfolgsmeldung anzeigen
        showToast('Registrierung erfolgreich. Bitte melden Sie sich an.', 'success');
        
        return true;
      } catch (error) {
        this.error = error.response?.data?.detail || 'Bei der Registrierung ist ein Fehler aufgetreten.';
        console.error('Registration error:', error);
        
        // Fehlermeldung anzeigen
        showToast(this.error, 'error');
        
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Startet den Prozess zum Zurücksetzen des Passworts
     * @param {string} email - E-Mail-Adresse des Benutzers
     */
    async forgotPassword(email) {
      const { showToast } = useToast();
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.post('/api/auth/reset-password', { email });
        
        // Erfolgsmeldung anzeigen
        showToast('E-Mail zum Zurücksetzen des Passworts wurde versendet.', 'success');
        
        return response.data;
      } catch (error) {
        this.error = error.response?.data?.detail || 'Beim Zurücksetzen des Passworts ist ein Fehler aufgetreten.';
        console.error('Password reset error:', error);
        
        // Fehlermeldung anzeigen
        showToast(this.error, 'error');
        
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Setzt ein neues Passwort mit Token
     * @param {Object} resetData - Token und neues Passwort
     */
    async resetPassword(resetData) {
      const { showToast } = useToast();
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.post('/api/auth/confirm-reset-password', resetData);
        
        // Erfolgsmeldung anzeigen
        showToast('Passwort erfolgreich zurückgesetzt. Bitte melden Sie sich an.', 'success');
        
        return true;
      } catch (error) {
        this.error = error.response?.data?.detail || 'Beim Zurücksetzen des Passworts ist ein Fehler aufgetreten.';
        console.error('Password reset confirmation error:', error);
        
        // Fehlermeldung anzeigen
        showToast(this.error, 'error');
        
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Lädt die Benutzerinformationen vom Server
     */
    async fetchUserInfo() {
      if (!this.token) return null;
      
      try {
        const response = await axios.get('/api/user/profile');
        this.user = response.data;
        localStorage.setItem('user', JSON.stringify(this.user));
        
        return this.user;
      } catch (error) {
        console.error('Fehler beim Laden der Benutzerinformationen:', error);
        
        // Wenn der Token ungültig ist, abmelden
        if (error.response?.status === 401) {
          this.logout();
        }
        
        return null;
      }
    },
    
    /**
     * Aktualisiert das Benutzerprofil
     * @param {Object} profileData - Zu aktualisierende Profildaten
     */
    async updateProfile(profileData) {
      const { showToast } = useToast();
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.put('/api/user/profile', profileData);
        
        // Benutzerinformationen aktualisieren
        this.user = {
          ...this.user,
          ...response.data
        };
        localStorage.setItem('user', JSON.stringify(this.user));
        
        // Erfolgsmeldung anzeigen
        showToast('Profil erfolgreich aktualisiert', 'success');
        
        return true;
      } catch (error) {
        this.error = error.response?.data?.detail || 'Beim Aktualisieren des Profils ist ein Fehler aufgetreten.';
        console.error('Profile update error:', error);
        
        // Fehlermeldung anzeigen
        showToast(this.error, 'error');
        
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Aktualisiert das Benutzerpasswort
     * @param {Object} passwordData - Altes und neues Passwort
     */
    async updatePassword(passwordData) {
      const { showToast } = useToast();
      this.loading = true;
      this.error = null;
      
      try {
        await axios.put('/api/user/password', passwordData);
        
        // Erfolgsmeldung anzeigen
        showToast('Passwort erfolgreich aktualisiert', 'success');
        
        return true;
      } catch (error) {
        this.error = error.response?.data?.detail || 'Beim Aktualisieren des Passworts ist ein Fehler aufgetreten.';
        console.error('Password update error:', error);
        
        // Fehlermeldung anzeigen
        showToast(this.error, 'error');
        
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Meldet den Benutzer ab
     */
    logout() {
      const { showToast } = useToast();
      
      this.token = '';
      this.user = null;
      
      // Entferne Token und Benutzerinformationen aus dem localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('lastActiveSession');
      
      // Entferne Auth-Header
      delete axios.defaults.headers.common['Authorization'];
      
      // Erfolgsmeldung anzeigen
      showToast('Erfolgreich abgemeldet', 'info');
      
      return true;
    },
    
    /**
     * Prüft, ob der Token noch gültig ist
     */
    async validateToken() {
      if (!this.token) return false;
      
      try {
        await axios.get('/api/auth/validate');
        return true;
      } catch (error) {
        console.error('Token validation error:', error);
        
        // Wenn der Token ungültig ist, abmelden
        if (error.response?.status === 401) {
          this.logout();
        }
        
        return false;
      }
    },
    
    /**
     * Initialisiert den Auth-Store beim App-Start
     */
    async init() {
      this.setAuthHeader();
      
      if (this.token) {
        // Prüfe, ob der Token noch gültig ist
        const isValid = await this.validateToken();
        
        if (isValid) {
          // Lade Benutzerinformationen, wenn der Token gültig ist
          await this.fetchUserInfo();
        }
      }
    }
  }
});