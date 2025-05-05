import { defineStore } from 'pinia'
import axios from 'axios'

export const useChatStore = defineStore('chat', {
  state: () => ({
    currentSessionId: null,
    messages: [],
    question: '',
    isLoading: false,
    isStreaming: false,
    streamSource: null
  }),
  
  getters: {
    hasMessages: (state) => state.messages.length > 0,
    lastMessage: (state) => state.messages.length > 0 ? state.messages[state.messages.length - 1] : null
  },
  
  actions: {
    /**
     * Alle Nachrichten einer Sitzung laden
     * @param {number} sessionId - Die ID der Sitzung
     */
    async loadMessages(sessionId) {
      if (!sessionId) return false
      
      try {
        this.isLoading = true
        this.currentSessionId = sessionId
        
        const response = await axios.get(`/api/session/${sessionId}`)
        
        if (response.data && Array.isArray(response.data.messages)) {
          this.messages = response.data.messages
          return true
        } else {
          this.messages = []
          return false
        }
      } catch (error) {
        console.error('Fehler beim Laden der Nachrichten:', error)
        this.messages = []
        return false
      } finally {
        this.isLoading = false
      }
    },
    
    /**
     * Frage senden und Antwort empfangen
     * @param {string} question - Die Frage des Benutzers
     */
    async sendQuestion(question) {
      if (!this.currentSessionId || !question.trim()) return false
      
      try {
        this.isLoading = true
        
        // Sofort die Benutzerfrage anzeigen
        const userMessage = {
          id: `temp-${Date.now()}`,
          message: question,
          is_user: true,
          timestamp: Math.floor(Date.now() / 1000)
        }
        this.messages.push(userMessage)
        this.question = ''
        
        // Antwort vom Server abrufen
        const response = await axios.post(`/api/chat/${this.currentSessionId}`, {
          question: question
        })
        
        if (response.data && response.data.message) {
          // Antwort des Assistenten hinzufügen
          const assistantMessage = {
            id: response.data.message_id,
            message: response.data.message,
            is_user: false,
            timestamp: Math.floor(Date.now() / 1000)
          }
          this.messages.push(assistantMessage)
          return true
        }
        return false
      } catch (error) {
        console.error('Fehler beim Senden der Frage:', error)
        
        // Fehlermeldung als Systemnachricht hinzufügen
        this.messages.push({
          id: `error-${Date.now()}`,
          message: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.',
          is_system: true,
          timestamp: Math.floor(Date.now() / 1000)
        })
        return false
      } finally {
        this.isLoading = false
      }
    },
    
    /**
     * Streaming-Antwort vom Server empfangen
     * @param {string} question - Die Frage des Benutzers
     */
    async startQuestionStream(question) {
      if (!this.currentSessionId || !question.trim() || this.isStreaming) return false
      
      try {
        // Benutzerfrage sofort anzeigen
        const userMessage = {
          id: `temp-${Date.now()}`,
          message: question,
          is_user: true,
          timestamp: Math.floor(Date.now() / 1000)
        }
        this.messages.push(userMessage)
        
        // Platzhalter für die Assistentenantwort
        const assistantMessage = {
          id: `stream-${Date.now()}`,
          message: '',
          is_user: false,
          timestamp: Math.floor(Date.now() / 1000),
          streaming: true
        }
        this.messages.push(assistantMessage)
        
        // Textfeld leeren
        this.question = ''
        
        // Streaming starten
        this.isStreaming = true
        const eventSource = new EventSource(`/api/chat/${this.currentSessionId}/stream?question=${encodeURIComponent(question)}`)
        this.streamSource = eventSource
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            if (data.message_chunk) {
              // Letzter Nachricht das Chunk hinzufügen
              this.messages[this.messages.length - 1].message += data.message_chunk
            }
            
            if (data.message_id) {
              // ID aktualisieren, wenn wir sie vom Server bekommen
              this.messages[this.messages.length - 1].id = data.message_id
            }
            
            if (data.done) {
              // Streaming beenden, wenn wir fertig sind
              this.messages[this.messages.length - 1].streaming = false
              eventSource.close()
              this.isStreaming = false
              this.streamSource = null
            }
          } catch (error) {
            console.error('Fehler beim Verarbeiten des Streams:', error)
          }
        }
        
        eventSource.onerror = (error) => {
          console.error('Stream-Fehler:', error)
          eventSource.close()
          this.isStreaming = false
          this.streamSource = null
          
          // Streaming-Status der letzten Nachricht aktualisieren
          if (this.messages.length > 0) {
            this.messages[this.messages.length - 1].streaming = false
          }
        }
        
        return true
      } catch (error) {
        console.error('Fehler beim Starten des Streams:', error)
        this.isStreaming = false
        return false
      }
    },
    
    /**
     * Laufendes Streaming abbrechen
     */
    cancelStream() {
      if (this.streamSource) {
        this.streamSource.close()
        this.streamSource = null
        this.isStreaming = false
        
        // Streaming-Status der letzten Nachricht aktualisieren
        if (this.messages.length > 0) {
          this.messages[this.messages.length - 1].streaming = false
        }
      }
    },
    
    /**
     * Feedback zu einer Nachricht abgeben
     * @param {number} messageId - Die ID der Nachricht
     * @param {boolean} isPositive - Positives oder negatives Feedback
     * @param {string} comment - Optionaler Kommentar
     */
    async submitFeedback(messageId, isPositive, comment = '') {
      if (!messageId || !this.currentSessionId) return false
      
      try {
        const response = await axios.post(`/api/feedback/${messageId}`, {
          session_id: this.currentSessionId,
          positive: isPositive,
          comment: comment
        })
        
        if (response.data && response.data.success) {
          // Nachricht im lokalen Status aktualisieren
          const messageIndex = this.messages.findIndex(msg => msg.id === messageId)
          if (messageIndex !== -1) {
            this.messages[messageIndex].feedback_positive = isPositive
            if (comment) {
              this.messages[messageIndex].feedback_comment = comment
            }
          }
          return true
        }
        return false
      } catch (error) {
        console.error('Fehler beim Senden des Feedbacks:', error)
        return false
      }
    },
    
    /**
     * Store zurücksetzen
     */
    reset() {
      this.currentSessionId = null
      this.messages = []
      this.question = ''
      this.isLoading = false
      
      // Laufenden Stream beenden
      this.cancelStream()
    }
  }
})