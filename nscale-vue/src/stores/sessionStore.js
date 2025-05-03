/**
 * Session Store für Vue.js-Implementierung
 * Verwaltet alle Chat-Sessions und deren Zustände
 */
import { defineStore } from 'pinia';
import axios from 'axios';

export const useSessionStore = defineStore('session', {
  state: () => ({
    sessions: [],
    currentSessionId: null,
    loading: false,
    error: null,
    pollInterval: null,
  }),

  getters: {
    /**
     * Gibt die aktuelle Session zurück
     */
    currentSession: (state) => {
      if (!state.currentSessionId) return null;
      return state.sessions.find(s => s.id === state.currentSessionId) || null;
    },

    /**
     * Sortiert Sessions nach letztem Update und filtert nach Titel
     */
    sortedSessions: (state) => {
      return [...state.sessions].sort((a, b) => {
        // Nach Datum sortieren, neuste zuerst
        return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
      });
    }
  },

  actions: {
    /**
     * Lädt alle Sessions des aktuellen Benutzers
     */
    async fetchSessions() {
      this.loading = true;
      this.error = null;

      try {
        const response = await axios.get('/api/sessions');
        this.sessions = response.data.sessions || [];
        
        // Wenn es Sessions gibt und keine aktuelle ausgewählt ist
        if (this.sessions.length > 0 && !this.currentSessionId) {
          this.setCurrentSession(this.sessions[0].id);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Sessions:', error);
        this.error = error.response?.data?.detail || 'Fehler beim Laden der Sessions';
      } finally {
        this.loading = false;
      }
    },

    /**
     * Erstellt eine neue Session
     * @param {string} title - Titel der neuen Session
     */
    async createSession(title = 'Neue Unterhaltung') {
      this.loading = true;
      this.error = null;

      try {
        const response = await axios.post('/api/session', { title });
        const newSession = {
          id: response.data.session_id,
          title: response.data.title,
          created_at: new Date().toISOString(),
          messages: []
        };
        
        this.sessions.unshift(newSession);
        this.setCurrentSession(newSession.id);
        return newSession.id;
      } catch (error) {
        console.error('Fehler beim Erstellen einer neuen Session:', error);
        this.error = error.response?.data?.detail || 'Fehler beim Erstellen einer neuen Session';
        return null;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Setzt die aktuelle Session
     * @param {number} sessionId - ID der zu aktivierenden Session
     */
    async setCurrentSession(sessionId) {
      if (sessionId === this.currentSessionId) return;

      this.currentSessionId = sessionId;
      
      // Wenn die Session existiert aber keine Nachrichten hat, lade diese
      const session = this.sessions.find(s => s.id === sessionId);
      if (session && (!session.messages || session.messages.length === 0)) {
        await this.fetchSessionHistory(sessionId);
      }
    },

    /**
     * Löscht eine Session
     * @param {number} sessionId - ID der zu löschenden Session
     */
    async deleteSession(sessionId) {
      this.loading = true;
      this.error = null;

      try {
        await axios.delete(`/api/session/${sessionId}`);
        
        // Session aus der Liste entfernen
        this.sessions = this.sessions.filter(s => s.id !== sessionId);
        
        // Wenn die aktuelle Session gelöscht wurde, setze eine andere aktiv
        if (this.currentSessionId === sessionId) {
          this.currentSessionId = this.sessions[0]?.id || null;
        }
        
        return true;
      } catch (error) {
        console.error('Fehler beim Löschen der Session:', error);
        this.error = error.response?.data?.detail || 'Fehler beim Löschen der Session';
        return false;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Benennt eine Session um
     * @param {number} sessionId - ID der Session
     * @param {string} newTitle - Neuer Titel
     */
    async renameSession(sessionId, newTitle) {
      this.loading = true;
      this.error = null;

      try {
        await axios.put(`/api/session/rename`, {
          session_id: sessionId,
          title: newTitle
        });
        
        // Session in der Liste aktualisieren
        const session = this.sessions.find(s => s.id === sessionId);
        if (session) {
          session.title = newTitle;
        }
        
        return true;
      } catch (error) {
        console.error('Fehler beim Umbenennen der Session:', error);
        this.error = error.response?.data?.detail || 'Fehler beim Umbenennen der Session';
        return false;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Lädt den Verlauf einer Session
     * @param {number} sessionId - ID der Session
     */
    async fetchSessionHistory(sessionId) {
      this.loading = true;
      this.error = null;

      try {
        const response = await axios.get(`/api/session/${sessionId}`);
        
        // Finde die Session in unserer Liste
        const sessionIndex = this.sessions.findIndex(s => s.id === sessionId);
        if (sessionIndex !== -1) {
          // Aktualisiere die Session mit den geladenen Daten
          this.sessions[sessionIndex] = {
            ...this.sessions[sessionIndex],
            title: response.data.title,
            messages: response.data.messages || []
          };
        }
        
        return response.data.messages || [];
      } catch (error) {
        console.error('Fehler beim Laden des Session-Verlaufs:', error);
        this.error = error.response?.data?.detail || 'Fehler beim Laden des Session-Verlaufs';
        return [];
      } finally {
        this.loading = false;
      }
    },

    /**
     * Aktualisiert den Titel einer Session basierend auf der ersten Nachricht
     * @param {number} sessionId - ID der Session
     */
    async updateSessionTitle(sessionId) {
      try {
        const response = await axios.post(`/api/session/${sessionId}/update-title`);
        
        // Session in der Liste aktualisieren
        const session = this.sessions.find(s => s.id === sessionId);
        if (session && response.data.new_title) {
          session.title = response.data.new_title;
        }
        
        return true;
      } catch (error) {
        console.error('Fehler beim Aktualisieren des Session-Titels:', error);
        return false;
      }
    },

    /**
     * Bereinigt den Store (z.B. beim Logout)
     */
    clearStore() {
      this.sessions = [];
      this.currentSessionId = null;
      this.loading = false;
      this.error = null;
      
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
    },

    /**
     * Startet ein Polling für neue Sessions (nützlich für parallele Tabs)
     * @param {number} intervalMs - Polling-Intervall in Millisekunden
     */
    startSessionPolling(intervalMs = 30000) {
      // Beende vorhandenes Polling
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
      }
      
      // Starte neues Polling
      this.pollInterval = setInterval(() => {
        this.fetchSessions();
      }, intervalMs);
    },

    /**
     * Stoppt das Session-Polling
     */
    stopSessionPolling() {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
    }
  }
});