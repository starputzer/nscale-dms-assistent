// stores/systemStore.js
import { defineStore } from 'pinia';
import axios from 'axios';
import { useAuthStore } from './authStore';

/**
 * Store zur Verwaltung von Systemüberwachungsdaten
 * Enthält Funktionen zum Laden von Systemstatistiken, Dokumentenstatus und Konvertereinstellungen
 */
export const useSystemStore = defineStore('system', {
  state: () => ({
    // Systemstatistiken
    stats: {
      document_count: 0,
      chunk_count: 0,
      documents: {}
    },

    // Dokumentenkonverter-Status
    converterStatus: {
      available: false,
      converters: {},
      post_processing: false,
      parallel_processing: false
    },

    // Neueste Konvertierungen
    recentConversions: [],

    // System-Logs
    logs: [],

    // Status-Flags
    loading: {
      stats: false,
      converterStatus: false,
      conversions: false,
      logs: false
    },
    
    // Fehlermeldungen
    error: {
      stats: null,
      converterStatus: null,
      conversions: null,
      logs: null
    },

    // Intervall-IDs für automatische Aktualisierung
    refreshIntervals: {
      stats: null,
      converterStatus: null
    },

    // Aktualisierungsintervall in Millisekunden (default: 30 Sekunden)
    refreshInterval: 30000
  }),

  getters: {
    /**
     * Prüft, ob der Store eine ausreichende Berechtigung hat
     */
    hasAdminAccess: () => {
      const authStore = useAuthStore();
      return authStore.isAdmin;
    },

    /**
     * Gibt die Gesamtanzahl der Dokumente zurück
     */
    totalDocuments: (state) => {
      return state.stats.document_count || 0;
    },

    /**
     * Gibt die Gesamtanzahl der Chunks zurück
     */
    totalChunks: (state) => {
      return state.stats.chunk_count || 0;
    },

    /**
     * Gibt die Dokumentenliste als Array zurück
     */
    documentList: (state) => {
      const docs = state.stats.documents || {};
      return Object.keys(docs).map(filename => ({
        filename,
        ...docs[filename]
      }));
    },

    /**
     * Gibt die verfügbaren Konvertertypen zurück
     */
    availableConverters: (state) => {
      const converters = state.converterStatus.converters || {};
      return Object.keys(converters)
        .filter(type => converters[type])
        .map(type => type.toUpperCase());
    },

    /**
     * Prüft, ob der Dokumentenkonverter verfügbar ist
     */
    isConverterAvailable: (state) => {
      return state.converterStatus.available || false;
    }
  },

  actions: {
    /**
     * Lädt die Systemstatistiken vom Server
     */
    async loadStats() {
      if (!this.hasAdminAccess) return;
      
      this.loading.stats = true;
      this.error.stats = null;
      
      try {
        const response = await axios.get('/api/admin/stats');
        this.stats = response.data.stats || {
          document_count: 0,
          chunk_count: 0,
          documents: {}
        };
      } catch (error) {
        console.error('Fehler beim Laden der Systemstatistiken:', error);
        this.error.stats = error.response?.data?.detail || 'Fehler beim Laden der Systemstatistiken';
      } finally {
        this.loading.stats = false;
      }
    },

    /**
     * Lädt den Status des Dokumentenkonverters vom Server
     */
    async loadConverterStatus() {
      if (!this.hasAdminAccess) return;
      
      this.loading.converterStatus = true;
      this.error.converterStatus = null;
      
      try {
        const response = await axios.get('/api/admin/converter/status');
        this.converterStatus = response.data || {
          available: false,
          converters: {},
          post_processing: false,
          parallel_processing: false
        };
      } catch (error) {
        console.error('Fehler beim Laden des Konverterstatus:', error);
        this.error.converterStatus = error.response?.data?.detail || 'Fehler beim Laden des Konverterstatus';
      } finally {
        this.loading.converterStatus = false;
      }
    },

    /**
     * Lädt die letzten Konvertierungen
     */
    async loadRecentConversions() {
      if (!this.hasAdminAccess) return;
      
      this.loading.conversions = true;
      this.error.conversions = null;
      
      try {
        const response = await axios.get('/api/admin/conversions/recent');
        this.recentConversions = response.data.conversions || [];
      } catch (error) {
        console.error('Fehler beim Laden der Konvertierungshistorie:', error);
        this.error.conversions = error.response?.data?.detail || 'Fehler beim Laden der Konvertierungshistorie';
      } finally {
        this.loading.conversions = false;
      }
    },

    /**
     * Löscht den LLM-Cache
     */
    async clearLLMCache() {
      if (!this.hasAdminAccess) return null;
      
      try {
        const response = await axios.post('/api/admin/clear-cache');
        return response.data;
      } catch (error) {
        console.error('Fehler beim Löschen des LLM-Cache:', error);
        throw new Error(error.response?.data?.detail || 'Fehler beim Löschen des LLM-Cache');
      }
    },

    /**
     * Löscht den Embedding-Cache
     */
    async clearEmbeddingCache() {
      if (!this.hasAdminAccess) return null;
      
      try {
        const response = await axios.post('/api/admin/clear-embedding-cache');
        return response.data;
      } catch (error) {
        console.error('Fehler beim Löschen des Embedding-Cache:', error);
        throw new Error(error.response?.data?.detail || 'Fehler beim Löschen des Embedding-Cache');
      }
    },

    /**
     * Lädt die Dokumente neu
     */
    async reloadDocuments() {
      if (!this.hasAdminAccess) return null;
      
      try {
        const response = await axios.post('/api/admin/reload-documents');
        // Nach erfolgreichem Neuladen aktualisiere die Statistiken
        if (response.data.success) {
          await this.loadStats();
        }
        return response.data;
      } catch (error) {
        console.error('Fehler beim Neuladen der Dokumente:', error);
        throw new Error(error.response?.data?.detail || 'Fehler beim Neuladen der Dokumente');
      }
    },

    /**
     * Startet die automatische Aktualisierung der Daten
     */
    startAutoRefresh() {
      if (!this.hasAdminAccess) return;

      // Lösche existierende Intervalle
      this.stopAutoRefresh();
      
      // Starte neue Intervalle
      this.refreshIntervals.stats = setInterval(() => {
        this.loadStats();
      }, this.refreshInterval);
      
      this.refreshIntervals.converterStatus = setInterval(() => {
        this.loadConverterStatus();
      }, this.refreshInterval);
    },

    /**
     * Stoppt die automatische Aktualisierung der Daten
     */
    stopAutoRefresh() {
      // Lösche alle laufenden Intervalle
      Object.keys(this.refreshIntervals).forEach(key => {
        if (this.refreshIntervals[key]) {
          clearInterval(this.refreshIntervals[key]);
          this.refreshIntervals[key] = null;
        }
      });
    },

    /**
     * Setzt das Aktualisierungsintervall
     * @param {number} interval - Intervall in Millisekunden
     */
    setRefreshInterval(interval) {
      if (typeof interval === 'number' && interval >= 5000) {
        this.refreshInterval = interval;
        // Neustarten der Intervalle mit neuem Wert, wenn sie laufen
        if (this.refreshIntervals.stats || this.refreshIntervals.converterStatus) {
          this.startAutoRefresh();
        }
      }
    },

    /**
     * Laden aller Systemdaten auf einmal
     */
    async loadAllData() {
      if (!this.hasAdminAccess) return;
      
      try {
        await Promise.all([
          this.loadStats(),
          this.loadConverterStatus(),
          this.loadRecentConversions()
        ]);
      } catch (error) {
        console.error('Fehler beim Laden der Systemdaten:', error);
      }
    }
  }
});