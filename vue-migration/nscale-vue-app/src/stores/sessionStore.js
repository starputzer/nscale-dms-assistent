import { defineStore } from 'pinia'
import axios from 'axios'

export const useSessionStore = defineStore('session', {
  state: () => ({
    sessions: [],
    loading: false,
    error: null
  }),
  
  getters: {
    hasSessions: (state) => state.sessions.length > 0,
    sessionById: (state) => (id) => state.sessions.find(session => session.id === id),
    // Sortiere Sessions nach letzter Aktivität (neueste zuerst)
    sortedSessions: (state) => {
      return [...state.sessions].sort((a, b) => {
        // Verwendung des last_activity Timestamps oder Fallback auf id
        const aTime = a.last_activity || a.id
        const bTime = b.last_activity || b.id
        return bTime - aTime
      })
    }
  },
  
  actions: {
    /**
     * Alle Sessions laden
     */
    async loadSessions() {
      try {
        this.loading = true
        const response = await axios.get('/api/sessions')
        
        if (response.data && Array.isArray(response.data.sessions)) {
          this.sessions = response.data.sessions
        } else {
          this.sessions = []
        }
      } catch (error) {
        console.error('Fehler beim Laden der Sessions:', error)
        this.error = 'Fehler beim Laden der Sessions'
        this.sessions = []
      } finally {
        this.loading = false
      }
    },
    
    /**
     * Neue Session erstellen
     * @param {string} title - Optionaler Titel (Standard: "Neue Unterhaltung")
     * @returns {number|null} - ID der neuen Session oder null bei Fehler
     */
    async createSession(title = 'Neue Unterhaltung') {
      try {
        this.loading = true
        const response = await axios.post('/api/session', { title })
        
        if (response.data && response.data.session_id) {
          // Neue Session zur Liste hinzufügen
          const newSession = {
            id: response.data.session_id,
            title: title,
            last_activity: Math.floor(Date.now() / 1000)
          }
          this.sessions.unshift(newSession)
          
          return response.data.session_id
        }
        return null
      } catch (error) {
        console.error('Fehler beim Erstellen einer Session:', error)
        this.error = 'Fehler beim Erstellen einer Session'
        return null
      } finally {
        this.loading = false
      }
    },
    
    /**
     * Session löschen
     * @param {number} sessionId - ID der zu löschenden Session
     * @returns {boolean} - Erfolg oder Misserfolg
     */
    async deleteSession(sessionId) {
      if (!sessionId) return false
      
      try {
        const response = await axios.delete(`/api/session/${sessionId}`)
        
        if (response.data && response.data.success) {
          // Session aus der Liste entfernen
          this.sessions = this.sessions.filter(session => session.id !== sessionId)
          return true
        }
        return false
      } catch (error) {
        console.error('Fehler beim Löschen der Session:', error)
        this.error = 'Fehler beim Löschen der Session'
        return false
      }
    },
    
    /**
     * Session-Titel aktualisieren (automatisch vom Server generiert)
     * @param {number} sessionId - ID der zu aktualisierenden Session
     */
    async updateSessionTitle(sessionId) {
      if (!sessionId) return false
      
      try {
        const response = await axios.post(`/api/session/${sessionId}/update-title`)
        
        if (response.data && response.data.new_title) {
          // Session in der Liste aktualisieren
          const sessionIndex = this.sessions.findIndex(session => session.id === sessionId)
          if (sessionIndex !== -1) {
            this.sessions[sessionIndex].title = response.data.new_title
          }
          return true
        }
        return false
      } catch (error) {
        console.error('Fehler beim Aktualisieren des Session-Titels:', error)
        return false
      }
    },
    
    /**
     * Sessions aktualisieren ohne Neuladen vom Server (für regelmäßige Aktualisierung)
     * @param {Array} updatedSessions - Neue Session-Liste
     */
    updateSessions(updatedSessions) {
      if (Array.isArray(updatedSessions)) {
        this.sessions = updatedSessions
      }
    },
    
    /**
     * Speichert die aktuelle Session in localStorage
     * @param {number} sessionId - ID der Session
     */
    saveCurrentSessionToStorage(sessionId) {
      if (sessionId) {
        localStorage.setItem('lastActiveSession', sessionId.toString())
      }
    },
    
    /**
     * Lädt die letzte aktive Session aus localStorage
     * @returns {number|null} - ID der Session oder null
     */
    getLastSessionFromStorage() {
      const sessionId = localStorage.getItem('lastActiveSession')
      if (sessionId && !isNaN(parseInt(sessionId))) {
        return parseInt(sessionId)
      }
      return null
    },
    
    /**
     * Aktualisiert das letzte Aktivitätsdatum einer Session
     * @param {number} sessionId - ID der Session
     */
    updateSessionActivity(sessionId) {
      if (!sessionId) return
      
      const sessionIndex = this.sessions.findIndex(session => session.id === sessionId)
      if (sessionIndex !== -1) {
        this.sessions[sessionIndex].last_activity = Math.floor(Date.now() / 1000)
      }
    }
  }
})