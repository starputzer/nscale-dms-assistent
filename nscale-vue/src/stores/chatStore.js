/**
 * Chat Store für Vue.js-Implementierung
 * Verwaltet den Chat-Status, Nachrichten und die Kommunikation mit dem Backend
 */
import { defineStore } from 'pinia';
import axios from 'axios';
import { useSessionStore } from './sessionStore';

export const useChatStore = defineStore('chat', {
  state: () => ({
    // Aktueller Chat-Zustand
    loading: false,
    sending: false,
    streaming: false,
    streamController: null,
    currentQuestion: '',
    currentAnswer: '',
    pendingQuestion: '',
    error: null,
    
    // Feedback-System
    currentFeedback: {
      messageId: null,
      isPositive: null,
      comment: ''
    },
    
    // Chat-Einstellungen
    useSimpleLanguage: false,
    useStreaming: true,
    
    // UI-Zustand
    showExplanation: false,
    currentExplanation: null,
    showFeedbackDialog: false,
    showSourcesDialog: false,
    selectedSource: null,
    
    // Falls die Session noch nicht geladen wurde
    pendingMessages: [],
  }),

  getters: {
    /**
     * Prüft, ob gerade eine Anfrage läuft und Benutzereingaben deaktiviert werden sollten
     */
    isProcessing: (state) => {
      return state.sending || state.streaming || state.loading;
    },
    
    /**
     * Gibt die verfügbaren Quellen der aktuellen Antwort zurück
     */
    currentSources: (state) => {
      const sessionStore = useSessionStore();
      const currentSession = sessionStore.currentSession;
      
      if (!currentSession) return [];
      
      // Suche die letzte Antwort des Assistenten
      const lastMessage = [...currentSession.messages]
        .reverse()
        .find(m => !m.is_user);
        
      if (!lastMessage || !lastMessage.sources) return [];
      
      return lastMessage.sources;
    },
    
    /**
     * Prüft, ob es aktive Chats gibt
     */
    hasActiveChats: () => {
      const sessionStore = useSessionStore();
      return sessionStore.sessions.length > 0;
    }
  },

  actions: {
    /**
     * Setzt eine Frage und bereitet den Chat vor
     * @param {string} question - Die zu stellende Frage
     */
    setQuestion(question) {
      this.pendingQuestion = question;
      this.currentFeedback = {
        messageId: null,
        isPositive: null,
        comment: ''
      };
    },
    
    /**
     * Sendet eine Frage an das Backend
     * @param {string} question - Die zu stellende Frage (optional, falls bereits gesetzt)
     */
    async sendQuestion(question = null) {
      // Benutze entweder die übergebene Frage oder die ausstehende Frage
      const finalQuestion = question || this.pendingQuestion;
      if (!finalQuestion.trim()) return;
      
      // Setze Zustand
      this.sending = true;
      this.error = null;
      this.currentQuestion = finalQuestion;
      this.pendingQuestion = '';
      
      const sessionStore = useSessionStore();
      let sessionId = sessionStore.currentSessionId;
      
      // Wenn keine Session existiert, erstelle eine neue
      if (!sessionId) {
        sessionId = await sessionStore.createSession();
        if (!sessionId) {
          this.error = 'Fehler beim Erstellen einer neuen Session';
          this.sending = false;
          return;
        }
      }
      
      // Füge die Frage lokal zur Session hinzu (für sofortige Anzeige)
      const tempUserMessage = {
        id: Date.now(), // Temporäre ID
        session_id: sessionId,
        message: finalQuestion,
        is_user: true,
        created_at: new Date().toISOString()
      };
      
      const currentSession = sessionStore.sessions.find(s => s.id === sessionId);
      if (currentSession) {
        // Direkt zum Store hinzufügen, falls Session existiert
        if (!currentSession.messages) {
          currentSession.messages = [];
        }
        currentSession.messages.push(tempUserMessage);
      } else {
        // Für später zwischenspeichern
        this.pendingMessages.push(tempUserMessage);
      }
      
      try {
        if (this.useStreaming) {
          // Streaming-Anfrage starten
          await this.startStreaming(finalQuestion, sessionId);
        } else {
          // Normale Anfrage senden
          const response = await axios.post('/api/question', {
            question: finalQuestion,
            session_id: sessionId
          }, {
            headers: {
              'X-Use-Simple-Language': this.useSimpleLanguage ? 'true' : 'false'
            }
          });
          
          // Antwort verarbeiten
          const { answer, message_id, sources } = response.data;
          
          // Assistenten-Antwort zur Session hinzufügen
          const assistantMessage = {
            id: message_id,
            session_id: sessionId,
            message: answer,
            is_user: false,
            created_at: new Date().toISOString(),
            sources: sources || []
          };
          
          if (currentSession) {
            currentSession.messages.push(assistantMessage);
          } else {
            this.pendingMessages.push(assistantMessage);
          }
          
          // Aktualisiere den Session-Titel nach der ersten Nachricht
          if (currentSession?.messages.length <= 2) {
            await sessionStore.updateSessionTitle(sessionId);
          }
        }
      } catch (error) {
        console.error('Fehler beim Senden der Frage:', error);
        this.error = error.response?.data?.detail || 'Fehler beim Senden der Frage';
        
        // Fehlerantwort zur Session hinzufügen
        const errorMessage = {
          id: -Date.now(), // Negative temporäre ID für Fehler
          session_id: sessionId,
          message: `Fehler: ${this.error}`,
          is_user: false,
          is_error: true,
          created_at: new Date().toISOString()
        };
        
        if (currentSession) {
          currentSession.messages.push(errorMessage);
        } else {
          this.pendingMessages.push(errorMessage);
        }
      } finally {
        this.sending = false;
      }
    },
    
    /**
     * Startet einen Streaming-Antwort-Prozess
     * @param {string} question - Die zu stellende Frage
     * @param {number} sessionId - Die Session-ID
     */
    async startStreaming(question, sessionId) {
      // Setze Streaming-Zustand
      this.streaming = true;
      this.currentAnswer = '';
      
      try {
        // URL-Parameter für Streaming-Anfrage vorbereiten
        const params = new URLSearchParams({
          question,
          session_id: sessionId,
          simple_language: this.useSimpleLanguage ? 'true' : 'false'
        });
        
        // Erzeuge AbortController für die Anfrage
        this.streamController = new AbortController();
        const { signal } = this.streamController;
        
        // Hole den JWT-Token
        const token = localStorage.getItem('auth_token');
        
        // EventSource für Server-Sent Events erstellen
        const eventSource = new EventSource(`/api/question/stream?${params}`);
        let fullAnswer = '';
        let messageId = null;
        let sources = [];
        
        // Event-Listener für Nachrichten einrichten
        eventSource.onmessage = (event) => {
          try {
            if (!event.data || event.data === '[DONE]') {
              // Streaming beendet
              return;
            }
            
            const data = JSON.parse(event.data);
            
            if (data.error) {
              // Fehler vom Server
              this.error = data.error;
              eventSource.close();
              this.streaming = false;
              return;
            }
            
            if (data.token) {
              // Token für neue Nachricht
              fullAnswer += data.token;
              this.currentAnswer = fullAnswer;
            }
            
            if (data.message_id) {
              // Message-ID für die Antwort
              messageId = data.message_id;
            }
            
            if (data.sources) {
              // Quellen für die Antwort
              sources = data.sources;
            }
          } catch (error) {
            console.error('Fehler beim Verarbeiten der Streaming-Antwort:', error);
          }
        };
        
        // Ereignis bei Streaming-Ende
        eventSource.addEventListener('done', () => {
          eventSource.close();
          this.streaming = false;
          
          // Assistenten-Antwort zur Session hinzufügen, wenn fertig
          if (fullAnswer) {
            const sessionStore = useSessionStore();
            const currentSession = sessionStore.sessions.find(s => s.id === sessionId);
            
            const assistantMessage = {
              id: messageId || Date.now(),
              session_id: sessionId,
              message: fullAnswer,
              is_user: false,
              created_at: new Date().toISOString(),
              sources: sources || []
            };
            
            if (currentSession) {
              if (!currentSession.messages) {
                currentSession.messages = [];
              }
              currentSession.messages.push(assistantMessage);
            } else {
              this.pendingMessages.push(assistantMessage);
            }
            
            // Aktualisiere den Session-Titel nach der ersten Nachricht
            if (currentSession?.messages.length <= 2) {
              sessionStore.updateSessionTitle(sessionId);
            }
          }
        });
        
        // Ereignis bei Fehlern im Streaming
        eventSource.onerror = (error) => {
          console.error('EventSource-Fehler:', error);
          eventSource.close();
          this.streaming = false;
          this.error = 'Verbindungsfehler beim Streaming der Antwort';
        };
        
        // Auf Signal warten, um das Streaming abzubrechen
        if (signal) {
          signal.addEventListener('abort', () => {
            eventSource.close();
            this.streaming = false;
          });
        }
      } catch (error) {
        console.error('Fehler beim Streaming-Start:', error);
        this.error = 'Fehler beim Starten des Antwort-Streams';
        this.streaming = false;
      }
    },
    
    /**
     * Bricht den aktuellen Streaming-Prozess ab
     */
    cancelStreaming() {
      if (!this.streaming || !this.streamController) return;
      
      try {
        this.streamController.abort();
        this.streamController = null;
      } catch (error) {
        console.error('Fehler beim Abbrechen des Streamings:', error);
      }
    },
    
    /**
     * Lädt eine Erklärung für eine bestimmte Nachricht
     * @param {number} messageId - Die ID der zu erklärenden Nachricht
     */
    async loadExplanation(messageId) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.get(`/api/explain/${messageId}`);
        this.currentExplanation = response.data;
        this.showExplanation = true;
      } catch (error) {
        console.error('Fehler beim Laden der Erklärung:', error);
        this.error = error.response?.data?.detail || 'Fehler beim Laden der Erklärung';
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Zeigt die Quellen-Dialog an und setzt die ausgewählte Quelle
     * @param {Object} source - Die ausgewählte Quelle
     */
    showSourceDetails(source) {
      this.selectedSource = source;
      this.showSourcesDialog = true;
    },
    
    /**
     * Sendet Feedback zu einer Assistentenantwort
     * @param {number} messageId - Die ID der Nachricht
     * @param {number} sessionId - Die ID der Session
     * @param {boolean} isPositive - Positives (true) oder negatives (false) Feedback
     * @param {string} comment - Optionaler Kommentar zum Feedback
     */
    async sendFeedback(messageId, sessionId, isPositive, comment = '') {
      this.loading = true;
      this.error = null;
      
      try {
        await axios.post('/api/feedback', {
          message_id: messageId,
          session_id: sessionId,
          is_positive: isPositive,
          comment: comment
        });
        
        // Feedback-Status aktualisieren
        this.currentFeedback = {
          messageId,
          isPositive,
          comment
        };
        
        // Dialog schließen
        this.showFeedbackDialog = false;
        
        return true;
      } catch (error) {
        console.error('Fehler beim Senden des Feedbacks:', error);
        this.error = error.response?.data?.detail || 'Fehler beim Senden des Feedbacks';
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Bereitet das Feedback-Formular für eine bestimmte Nachricht vor
     * @param {number} messageId - Die ID der Nachricht
     * @param {number} sessionId - Die ID der Session
     */
    prepareFeedback(messageId, sessionId) {
      this.currentFeedback = {
        messageId,
        sessionId,
        isPositive: null,
        comment: ''
      };
      this.showFeedbackDialog = true;
    },
    
    /**
     * Ändert die Einstellung für einfache Sprache
     * @param {boolean} value - Einfache Sprache aktivieren (true) oder deaktivieren (false)
     */
    setSimpleLanguage(value) {
      this.useSimpleLanguage = !!value;
      localStorage.setItem('use_simple_language', value ? 'true' : 'false');
    },
    
    /**
     * Ändert die Einstellung für Streaming
     * @param {boolean} value - Streaming aktivieren (true) oder deaktivieren (false)
     */
    setStreaming(value) {
      this.useStreaming = !!value;
      localStorage.setItem('use_streaming', value ? 'true' : 'false');
    },
    
    /**
     * Lädt die Einstellungen aus dem lokalen Speicher
     */
    loadSettings() {
      const simpleLanguage = localStorage.getItem('use_simple_language');
      const streaming = localStorage.getItem('use_streaming');
      
      if (simpleLanguage !== null) {
        this.useSimpleLanguage = simpleLanguage === 'true';
      }
      
      if (streaming !== null) {
        this.useStreaming = streaming === 'true';
      }
    },
    
    /**
     * Bereinigt den Store (z.B. beim Logout)
     */
    clearStore() {
      this.loading = false;
      this.sending = false;
      this.streaming = false;
      this.currentQuestion = '';
      this.currentAnswer = '';
      this.pendingQuestion = '';
      this.error = null;
      this.currentFeedback = { messageId: null, isPositive: null, comment: '' };
      this.showExplanation = false;
      this.currentExplanation = null;
      this.showFeedbackDialog = false;
      this.showSourcesDialog = false;
      this.selectedSource = null;
      this.pendingMessages = [];
      
      if (this.streamController) {
        try {
          this.streamController.abort();
        } catch (e) {
          console.error('Fehler beim Abbrechen des Streamings:', e);
        }
        this.streamController = null;
      }
    }
  }
});