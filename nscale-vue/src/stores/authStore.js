// authStore.js
import { defineStore } from 'pinia';

/**
 * Auth Store für die Verwaltung der Benutzerauthentifizierung
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    userRole: localStorage.getItem('userRole') || 'user',
    email: '',
    isAuthenticated: !!localStorage.getItem('token')
  }),
  
  getters: {
    /**
     * Überprüft, ob der Benutzer angemeldet ist
     */
    loggedIn: (state) => !!state.token,
    
    /**
     * Überprüft, ob der Benutzer Admin-Rechte hat
     */
    isAdmin: (state) => state.userRole === 'admin'
  },
  
  actions: {
    /**
     * Benutzer anmelden
     * @param {string} email - E-Mail-Adresse des Benutzers
     * @param {string} password - Passwort des Benutzers
     * @returns {Promise} Promise mit Erfolg oder Fehlermeldung
     */
    async login(email, password) {
      try {
        // Mock-Implementierung - in Produktion mit echtem API-Call ersetzen
        this.email = email;
        this.token = 'mock-token-' + Math.random().toString(36).substring(2, 15);
        this.userRole = email.includes('admin') ? 'admin' : 'user';
        this.isAuthenticated = true;
        
        // Token und Rolle im localStorage speichern
        localStorage.setItem('token', this.token);
        localStorage.setItem('userRole', this.userRole);
        
        return {
          success: true,
          message: 'Anmeldung erfolgreich'
        };
      } catch (error) {
        console.error('Login-Fehler:', error);
        return {
          success: false,
          message: error.message || 'Anmeldung fehlgeschlagen'
        };
      }
    },
    
    /**
     * Benutzer abmelden
     */
    logout() {
      this.token = null;
      this.userRole = 'user';
      this.email = '';
      this.isAuthenticated = false;
      
      // Token und Rolle aus localStorage entfernen
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
    },
    
    /**
     * Passwort zurücksetzen
     * @param {string} email - E-Mail-Adresse des Benutzers
     * @returns {Promise} Promise mit Erfolg oder Fehlermeldung
     */
    async resetPassword(email) {
      try {
        // Mock-Implementierung - in Produktion mit echtem API-Call ersetzen
        return {
          success: true,
          message: 'Passwort-Reset-Link wurde an Ihre E-Mail-Adresse gesendet'
        };
      } catch (error) {
        console.error('Passwort-Reset-Fehler:', error);
        return {
          success: false,
          message: error.message || 'Passwort-Reset fehlgeschlagen'
        };
      }
    }
  }
});