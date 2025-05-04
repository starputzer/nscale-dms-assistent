// src/stores/docConverterStore.js
import { defineStore } from 'pinia';
import axios from 'axios';
import { useAuthStore } from './authStore';

export const useDocConverterStore = defineStore('docConverter', {
  state: () => ({
    files: [],
    uploadProgress: {},
    conversionStatus: 'idle', // 'idle', 'uploading', 'converting', 'complete', 'error'
    conversionOptions: {
      format: 'markdown',
      splitSections: true,
      removeRedundantText: true,
      optimizeForRAG: true,
      preserveTables: true,
      includeImages: false,
      priority: 'normal' // 'low', 'normal', 'high'
    },
    conversionResults: [],
    error: null,
    activePreview: null,
    jobId: null,
    isLoading: false,
    currentConversionId: null,
    abortController: null,
    previewCache: {} // Cache für Vorschauinhalte
  }),

  getters: {
    hasFiles: (state) => state.files.length > 0,
    totalFiles: (state) => state.files.length,
    totalProgress: (state) => {
      if (!state.files.length) return 0;
      
      const totalProgress = Object.values(state.uploadProgress)
        .reduce((sum, progress) => sum + progress, 0);
      
      return Math.round(totalProgress / state.files.length);
    },
    isConverting: (state) => state.conversionStatus === 'converting',
    isComplete: (state) => state.conversionStatus === 'complete',
    hasError: (state) => state.error !== null,
    hasResults: (state) => state.conversionResults.length > 0,
    resultsByDate: (state) => {
      return [...state.conversionResults].sort((a, b) => b.timestamp - a.timestamp);
    }
  },

  actions: {
    addFiles(newFiles) {
      // Filter für bereits hinzugefügte Dateien
      const uniqueFiles = Array.from(newFiles).filter(file => 
        !this.files.some(existingFile => 
          existingFile.name === file.name && 
          existingFile.size === file.size
        )
      );
      
      // Füge neue Dateien hinzu
      this.files.push(...uniqueFiles);
      
      // Initialisiere Upload-Fortschritt für neue Dateien
      uniqueFiles.forEach(file => {
        this.uploadProgress[file.name] = 0;
      });
    },

    removeFile(fileName) {
      const index = this.files.findIndex(file => file.name === fileName);
      if (index !== -1) {
        this.files.splice(index, 1);
        delete this.uploadProgress[fileName];
      }
    },

    clearFiles() {
      this.files = [];
      this.uploadProgress = {};
    },

    updateConversionOptions(options) {
      this.conversionOptions = { ...this.conversionOptions, ...options };
    },

    async loadPreviousResults() {
      this.isLoading = true;
      this.error = null;
      
      try {
        const authStore = useAuthStore();
        if (!authStore.token) {
          throw new Error('Benutzer ist nicht angemeldet');
        }
        
        const response = await axios.get('/api/doc-converter/results', {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        });
        
        this.conversionResults = response.data.results || [];
        return this.conversionResults;
      } catch (error) {
        this.error = error.response?.data?.message || error.message || 'Fehler beim Laden der Ergebnisse';
        console.error('Fehler beim Laden der vorherigen Ergebnisse:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    
    async convertDocuments(formData, progressCallback) {
      this.isLoading = true;
      this.error = null;
      
      // Abbruchkontroller für Fetch API erstellen
      this.abortController = new AbortController();
      const signal = this.abortController.signal;
      
      try {
        const authStore = useAuthStore();
        if (!authStore.token) {
          throw new Error('Benutzer ist nicht angemeldet');
        }
        
        // Initiale Anfrage zur Erstellung eines Konvertierungsjobs
        const initResponse = await axios.post('/api/doc-converter/create-job', {}, {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        });
        
        this.currentConversionId = initResponse.data.job_id;
        
        // Dateien hochladen
        const uploadResponse = await axios.post(
          `/api/doc-converter/upload/${this.currentConversionId}`, 
          formData, 
          {
            headers: {
              'Authorization': `Bearer ${authStore.token}`,
              'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
              const uploadProgress = (progressEvent.loaded / progressEvent.total) * 50; // 50% Fortschritt für Upload
              progressCallback(uploadProgress, 'Dateien werden hochgeladen...');
            },
            signal
          }
        );
        
        // Konvertierung starten
        const startResponse = await axios.post(
          `/api/doc-converter/start/${this.currentConversionId}`,
          {}, 
          {
            headers: {
              'Authorization': `Bearer ${authStore.token}`
            },
            signal
          }
        );
        
        // Konvertierungsfortschritt überwachen
        let isCompleted = false;
        let progress = 50; // Start bei 50% nach Upload
        
        while (!isCompleted && !signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 Sekunde warten
          
          const statusResponse = await axios.get(
            `/api/doc-converter/status/${this.currentConversionId}`,
            {
              headers: {
                'Authorization': `Bearer ${authStore.token}`
              },
              signal
            }
          );
          
          const status = statusResponse.data;
          
          if (status.error) {
            throw new Error(status.error);
          }
          
          // Berechne den Gesamtfortschritt (50% für Upload + 50% für Konvertierung)
          const conversionProgress = status.progress || 0;
          progress = 50 + (conversionProgress * 0.5);
          
          if (status.current_file) {
            progressCallback(progress, status.current_file);
          } else {
            progressCallback(progress, '');
          }
          
          isCompleted = status.status === 'completed';
          
          if (isCompleted) {
            // Ergebnisse abrufen
            const resultsResponse = await axios.get(
              `/api/doc-converter/results/${this.currentConversionId}`,
              {
                headers: {
                  'Authorization': `Bearer ${authStore.token}`
                }
              }
            );
            
            // Ergebnisse zum lokalen State hinzufügen
            const newResults = resultsResponse.data.results || [];
            this.conversionResults = [...this.conversionResults, ...newResults];
            
            return { 
              results: newResults,
              jobId: this.currentConversionId 
            };
          }
        }
        
        if (signal.aborted) {
          throw new Error('Konvertierung wurde abgebrochen');
        }
        
      } catch (error) {
        if (error.name === 'AbortError' || signal.aborted) {
          this.error = 'Konvertierung wurde abgebrochen';
        } else {
          this.error = error.response?.data?.message || error.message || 'Fehler bei der Konvertierung';
        }
        console.error('Fehler bei der Dokumentenkonvertierung:', error);
        throw error;
      } finally {
        this.isLoading = false;
        this.abortController = null;
      }
    },
    
    async cancelConversion() {
      if (this.abortController) {
        this.abortController.abort();
      }
      
      if (this.currentConversionId) {
        try {
          const authStore = useAuthStore();
          await axios.post(
            `/api/doc-converter/cancel/${this.currentConversionId}`,
            {},
            {
              headers: {
                'Authorization': `Bearer ${authStore.token}`
              }
            }
          );
        } catch (error) {
          console.error('Fehler beim Abbrechen der Konvertierung:', error);
        }
      }
      
      this.currentConversionId = null;
      this.isLoading = false;
    },
    
    async getPreviewContent(resultId) {
      // Prüfen, ob der Inhalt bereits im Cache ist
      if (this.previewCache[resultId]) {
        return this.previewCache[resultId];
      }
      
      try {
        const authStore = useAuthStore();
        if (!authStore.token) {
          throw new Error('Benutzer ist nicht angemeldet');
        }
        
        const response = await axios.get(`/api/doc-converter/preview/${resultId}`, {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        });
        
        // Speichere Inhalt im Cache
        this.previewCache[resultId] = response.data.content || '';
        
        return this.previewCache[resultId];
      } catch (error) {
        console.error('Fehler beim Laden der Vorschau:', error);
        throw error;
      }
    },
    
    async downloadConvertedFile(resultId) {
      try {
        const authStore = useAuthStore();
        if (!authStore.token) {
          throw new Error('Benutzer ist nicht angemeldet');
        }
        
        // Direkte Download-Anfrage
        const response = await axios.get(`/api/doc-converter/download/${resultId}`, {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          },
          responseType: 'blob' // Wichtig für das Herunterladen von Dateien
        });
        
        // Blob aus der Antwort extrahieren
        const blob = new Blob([response.data]);
        
        // Dateinamen aus dem Header extrahieren oder Fallback verwenden
        const contentDisposition = response.headers['content-disposition'];
        let filename = 'konvertiertes_dokument.md';
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1];
          }
        } else {
          // Fallback: Verwende den Dateinamen aus dem Ergebnisobjekt
          const result = this.conversionResults.find(r => r.id === resultId);
          if (result && result.fileName) {
            filename = result.fileName;
          }
        }
        
        // Download-Link erstellen und klicken
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        return true;
      } catch (error) {
        this.error = error.response?.data?.message || error.message || 'Fehler beim Herunterladen der Datei';
        console.error('Fehler beim Herunterladen der konvertierten Datei:', error);
        throw error;
      }
    },
    
    async deleteResult(resultId) {
      try {
        const authStore = useAuthStore();
        if (!authStore.token) {
          throw new Error('Benutzer ist nicht angemeldet');
        }
        
        await axios.delete(`/api/doc-converter/results/${resultId}`, {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        });
        
        // Ergebnis aus dem lokalen State entfernen
        this.conversionResults = this.conversionResults.filter(result => result.id !== resultId);
        
        // Entferne den Eintrag aus dem Cache, falls vorhanden
        if (this.previewCache[resultId]) {
          delete this.previewCache[resultId];
        }
        
        return true;
      } catch (error) {
        this.error = error.response?.data?.message || error.message || 'Fehler beim Löschen des Ergebnisses';
        console.error('Fehler beim Löschen des Konvertierungsergebnisses:', error);
        throw error;
      }
    },
    
    // Alle Ergebnisse löschen
    async clearAllResults() {
      try {
        const authStore = useAuthStore();
        if (!authStore.token) {
          throw new Error('Benutzer ist nicht angemeldet');
        }
        
        await axios.delete('/api/doc-converter/results', {
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        });
        
        // Lokalen State leeren
        this.conversionResults = [];
        
        // Cache leeren
        this.previewCache = {};
        
        return true;
      } catch (error) {
        this.error = error.response?.data?.message || error.message || 'Fehler beim Löschen aller Ergebnisse';
        console.error('Fehler beim Löschen aller Konvertierungsergebnisse:', error);
        throw error;
      }
    },

    setActivePreview(resultId) {
      this.activePreview = resultId;
    },

    resetStore() {
      this.files = [];
      this.uploadProgress = {};
      this.conversionStatus = 'idle';
      this.conversionResults = [];
      this.error = null;
      this.activePreview = null;
      this.jobId = null;
      this.currentConversionId = null;
      this.isLoading = false;
      this.previewCache = {};
      // Behalte Konvertierungsoptionen bei
    }
  }
});