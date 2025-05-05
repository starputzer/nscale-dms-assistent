// stores/sourceReferenceStore.js
import { defineStore } from 'pinia';
import axios from 'axios';

export const useSourceReferenceStore = defineStore('sourceReference', {
  state: () => ({
    sources: [],
    selectedMessageId: null,
    loading: false,
    error: null,
    showDialog: false
  }),
  
  getters: {
    hasSources: (state) => state.sources.length > 0,
    sortedSources: (state) => {
      return [...state.sources].sort((a, b) => {
        // Sortiere nach Relevanz (hoch nach niedrig)
        const relevanceOrder = { high: 3, medium: 2, low: 1 };
        return (relevanceOrder[b.relevance] || 0) - (relevanceOrder[a.relevance] || 0);
      });
    }
  },
  
  actions: {
    /**
     * Quellen für eine bestimmte Nachricht laden
     * @param {number} messageId Die ID der Nachricht
     */
    async fetchSources(messageId) {
      if (!messageId) return;
      
      this.loading = true;
      this.error = null;
      this.selectedMessageId = messageId;
      
      try {
        const response = await axios.get(`/api/explain/${messageId}`);
        
        if (response.data && Array.isArray(response.data.source_references)) {
          this.sources = response.data.source_references.map(source => ({
            title: source.title || 'Untitled Source',
            path: source.path,
            content: source.content,
            relevance: source.relevance || 'medium'
          }));
        } else {
          this.sources = [];
        }
      } catch (error) {
        console.error('Error fetching sources:', error);
        this.error = 'Fehler beim Laden der Quellen. Bitte versuchen Sie es später erneut.';
        this.sources = [];
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Dialog zum Anzeigen der Quellen öffnen
     * @param {number} messageId Die ID der Nachricht (optional, falls bereits geladen)
     */
    async openSourceDialog(messageId) {
      // Falls eine neue MessageId übergeben wird, lade die Quellen
      if (messageId && messageId !== this.selectedMessageId) {
        await this.fetchSources(messageId);
      }
      
      this.showDialog = true;
    },
    
    /**
     * Dialog schließen
     */
    closeSourceDialog() {
      this.showDialog = false;
    },
    
    /**
     * Alle Daten zurücksetzen
     */
    reset() {
      this.sources = [];
      this.selectedMessageId = null;
      this.loading = false;
      this.error = null;
      this.showDialog = false;
    }
  }
});