/**
 * Feedback Store für Vue.js-Implementierung
 * Verwaltet das Feedback-System und die Feedback-Daten für die Admin-Oberfläche
 */
import { defineStore } from 'pinia';
import axios from 'axios';
import { useAuthStore } from './authStore';

export const useFeedbackStore = defineStore('feedback', {
  state: () => ({
    // Feedback-Statistiken
    stats: {
      positive_count: 0,
      negative_count: 0,
      total_count: 0,
      with_comments_count: 0,
      timeline: []
    },
    
    // Alle Feedback-Einträge
    feedbackItems: [],
    
    // Aktuell ausgewähltes Feedback für Details
    selectedFeedback: null,
    
    // Aktueller Filter
    filter: {
      type: 'all',         // 'all', 'positive', 'negative', 'with_comment'
      dateRange: 'last7days', // 'today', 'yesterday', 'last7days', 'last30days', 'allTime'
      search: '',
      page: 1,
      pageSize: 10
    },
    
    // Status-Flags
    loading: false,
    statsLoading: false,
    error: null,
    
    // Pagination
    pagination: {
      enabled: true,
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10
    }
  }),
  
  getters: {
    /**
     * Gefilterte Feedback-Liste basierend auf aktuellen Filtern
     */
    filteredFeedback: (state) => {
      let result = [...state.feedbackItems];
      
      // Filter nach Typ
      if (state.filter.type !== 'all') {
        if (state.filter.type === 'positive') {
          result = result.filter(item => item.is_positive);
        } else if (state.filter.type === 'negative') {
          result = result.filter(item => !item.is_positive);
        } else if (state.filter.type === 'with_comment') {
          result = result.filter(item => item.comment && item.comment.trim().length > 0);
        }
      }
      
      // Suche
      if (state.filter.search.trim()) {
        const query = state.filter.search.toLowerCase();
        result = result.filter(item => 
          (item.message_text && item.message_text.toLowerCase().includes(query)) ||
          (item.comment && item.comment.toLowerCase().includes(query))
        );
      }
      
      return result;
    },
    
    /**
     * Prüft, ob der Store eine ausreichende Berechtigung hat
     */
    hasFeedbackAccess: () => {
      const authStore = useAuthStore();
      return authStore.canViewFeedback;
    },
    
    /**
     * Zeitraum für Überschrift formatieren
     */
    dateRangeFormatted: (state) => {
      switch (state.filter.dateRange) {
        case 'today':
          return 'Heute';
        case 'yesterday':
          return 'Gestern';
        case 'last7days':
          return 'Letzte 7 Tage';
        case 'last30days':
          return 'Letzte 30 Tage';
        case 'thisMonth':
          return 'Dieser Monat';
        case 'lastMonth':
          return 'Letzter Monat';
        case 'thisYear':
          return 'Dieses Jahr';
        default:
          return 'Alle Zeiten';
      }
    }
  },
  
  actions: {
    /**
     * Lädt die Feedback-Statistiken vom Server
     * @param {string} dateRange - Zeitraum für die Statistiken
     */
    async loadStats(dateRange = null) {
      if (!this.hasFeedbackAccess) return;
      
      this.statsLoading = true;
      this.error = null;
      
      // Wenn dateRange angegeben, Filter aktualisieren
      if (dateRange) {
        this.filter.dateRange = dateRange;
      }
      
      try {
        const response = await axios.get('/api/admin/feedback/stats', {
          params: {
            date_range: this.filter.dateRange
          }
        });
        
        this.stats = response.data;
        
      } catch (error) {
        console.error('Fehler beim Laden der Feedback-Statistiken:', error);
        this.error = error.response?.data?.detail || 'Fehler beim Laden der Feedback-Statistiken';
      } finally {
        this.statsLoading = false;
      }
    },
    
    /**
     * Lädt die Feedback-Liste vom Server
     * @param {Object} options - Optionen für die Anfrage
     */
    async loadFeedback(options = {}) {
      if (!this.hasFeedbackAccess) return;
      
      this.loading = true;
      this.error = null;
      
      // Filter aktualisieren, wenn Optionen angegeben sind
      if (options.type) this.filter.type = options.type;
      if (options.dateRange) this.filter.dateRange = options.dateRange;
      if (options.search !== undefined) this.filter.search = options.search;
      if (options.page) this.filter.page = options.page;
      
      try {
        const response = await axios.get('/api/admin/feedback', {
          params: {
            type: this.filter.type,
            date_range: this.filter.dateRange,
            search: this.filter.search,
            page: this.filter.page,
            page_size: this.filter.pageSize
          }
        });
        
        this.feedbackItems = response.data.items || [];
        
        // Pagination aktualisieren
        this.pagination = {
          enabled: true,
          currentPage: response.data.page || 1,
          totalPages: response.data.total_pages || 1,
          totalItems: response.data.total_items || 0,
          itemsPerPage: response.data.page_size || 10
        };
        
      } catch (error) {
        console.error('Fehler beim Laden der Feedback-Liste:', error);
        this.error = error.response?.data?.detail || 'Fehler beim Laden der Feedback-Liste';
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Lädt Details zu einem bestimmten Feedback-Eintrag
     * @param {number} feedbackId - ID des Feedback-Eintrags
     */
    async loadFeedbackDetail(feedbackId) {
      if (!this.hasFeedbackAccess) return;
      
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.get(`/api/admin/feedback/${feedbackId}`);
        this.selectedFeedback = response.data;
        return response.data;
      } catch (error) {
        console.error('Fehler beim Laden der Feedback-Details:', error);
        this.error = error.response?.data?.detail || 'Fehler beim Laden der Feedback-Details';
        return null;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Lädt die Konversation zu einem Feedback
     * @param {number} feedbackId - ID des Feedback-Eintrags
     * @param {number} sessionId - ID der Session
     */
    async loadFeedbackContext(feedbackId, sessionId) {
      if (!this.hasFeedbackAccess) return;
      
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.get(`/api/admin/feedback/${feedbackId}/context`, {
          params: {
            session_id: sessionId
          }
        });
        
        // Wenn selectedFeedback vorhanden ist, füge Kontext hinzu
        if (this.selectedFeedback && this.selectedFeedback.id === feedbackId) {
          this.selectedFeedback.context_messages = response.data.messages || [];
        }
        
        return response.data.messages || [];
      } catch (error) {
        console.error('Fehler beim Laden des Feedback-Kontexts:', error);
        this.error = error.response?.data?.detail || 'Fehler beim Laden des Feedback-Kontexts';
        return [];
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Setzt den aktuellen Filter zurück
     */
    resetFilter() {
      this.filter = {
        type: 'all',
        dateRange: 'last7days',
        search: '',
        page: 1,
        pageSize: 10
      };
      
      // Neu laden mit zurückgesetzten Filtern
      this.loadFeedback();
    },
    
    /**
     * Wechselt die Seite der Feedback-Liste
     * @param {number} page - Seitennummer
     */
    changePage(page) {
      if (page < 1 || page > this.pagination.totalPages) return;
      
      this.filter.page = page;
      this.loadFeedback();
    },
    
    /**
     * Exportiert Feedback-Daten als CSV-Datei
     * @param {string} dateRange - Zeitraum für den Export
     */
    async exportFeedbackCsv(dateRange = null) {
      if (!this.hasFeedbackAccess) return;
      
      this.loading = true;
      this.error = null;
      
      try {
        const params = {
          date_range: dateRange || this.filter.dateRange,
          type: this.filter.type !== 'all' ? this.filter.type : undefined,
          search: this.filter.search.trim() || undefined
        };
        
        const response = await axios.get('/api/admin/feedback/export', {
          params,
          responseType: 'blob'
        });
        
        // Datei herunterladen
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        // Dateiname generieren
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `feedback-export-${date}.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return true;
      } catch (error) {
        console.error('Fehler beim Exportieren der Feedback-Daten:', error);
        this.error = error.response?.data?.detail || 'Fehler beim Exportieren der Feedback-Daten';
        return false;
      } finally {
        this.loading = false;
      }
    }
  }
});