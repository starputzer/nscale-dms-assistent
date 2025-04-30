// nscale-vue/src/stores/docConverterStore.js
import { defineStore } from 'pinia'
import axios from 'axios'

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
    jobId: null
  }),

  getters: {
    hasFiles: (state) => state.files.length > 0,
    totalFiles: (state) => state.files.length,
    totalProgress: (state) => {
      if (!state.files.length) return 0
      
      const totalProgress = Object.values(state.uploadProgress)
        .reduce((sum, progress) => sum + progress, 0)
      
      return Math.round(totalProgress / state.files.length)
    },
    isConverting: (state) => state.conversionStatus === 'converting',
    isComplete: (state) => state.conversionStatus === 'complete',
    hasError: (state) => state.error !== null,
    hasResults: (state) => state.conversionResults.length > 0
  },

  actions: {
    addFiles(newFiles) {
      // Filter für bereits hinzugefügte Dateien
      const uniqueFiles = Array.from(newFiles).filter(file => 
        !this.files.some(existingFile => 
          existingFile.name === file.name && 
          existingFile.size === file.size
        )
      )
      
      // Füge neue Dateien hinzu
      this.files.push(...uniqueFiles)
      
      // Initialisiere Upload-Fortschritt für neue Dateien
      uniqueFiles.forEach(file => {
        this.uploadProgress[file.name] = 0
      })
    },

    removeFile(fileName) {
      const index = this.files.findIndex(file => file.name === fileName)
      if (index !== -1) {
        this.files.splice(index, 1)
        delete this.uploadProgress[fileName]
      }
    },

    clearFiles() {
      this.files = []
      this.uploadProgress = {}
    },

    updateConversionOptions(options) {
      this.conversionOptions = { ...this.conversionOptions, ...options }
    },

    async startConversion() {
      if (!this.files.length) return

      try {
        this.conversionStatus = 'uploading'
        this.error = null
        this.conversionResults = []
        
        // Erstelle FormData mit Dateien und Optionen
        const formData = new FormData()
        this.files.forEach(file => {
          formData.append('files', file)
        })
        formData.append('options', JSON.stringify(this.conversionOptions))
        
        // Upload starten mit Fortschrittsanzeige
        const response = await axios.post('/api/doc-converter/upload', formData, {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
            
            // Verteile den Fortschritt gleichmäßig auf alle Dateien
            this.files.forEach(file => {
              this.uploadProgress[file.name] = percentCompleted
            })
          }
        })
        
        if (response.data && response.data.job_id) {
          this.jobId = response.data.job_id
          this.conversionStatus = 'converting'
          
          // Starte Polling für Konvertierungsstatus
          this.pollConversionStatus()
        } else {
          throw new Error('Keine Job-ID vom Server erhalten')
        }
      } catch (error) {
        console.error('Fehler beim Starten der Konvertierung:', error)
        this.conversionStatus = 'error'
        this.error = error.response?.data?.message || error.message
      }
    },

    async pollConversionStatus() {
      if (!this.jobId) return
      
      try {
        const response = await axios.get(`/api/doc-converter/status/${this.jobId}`)
        const { status, progress, results } = response.data
        
        if (status === 'complete') {
          this.conversionStatus = 'complete'
          this.conversionResults = results || []
        } else if (status === 'error') {
          this.conversionStatus = 'error'
          this.error = response.data.error || 'Fehler bei der Konvertierung'
        } else {
          // Status ist noch 'processing'
          // Warte 2 Sekunden und frage erneut ab
          setTimeout(() => this.pollConversionStatus(), 2000)
        }
      } catch (error) {
        console.error('Fehler beim Abrufen des Konvertierungsstatus:', error)
        this.conversionStatus = 'error'
        this.error = error.response?.data?.message || error.message
      }
    },

    setActivePreview(resultId) {
      this.activePreview = resultId
    },

    async downloadResult(resultId) {
      try {
        const result = this.conversionResults.find(r => r.id === resultId)
        if (!result) return
        
        const response = await axios.get(`/api/doc-converter/download/${resultId}`, {
          responseType: 'blob'
        })
        
        // Erstelle Download-Link
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', result.outputFileName || 'converted-document.md')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (error) {
        console.error('Fehler beim Herunterladen der Ergebnisdatei:', error)
        this.error = error.response?.data?.message || error.message
      }
    },

    resetStore() {
      this.files = []
      this.uploadProgress = {}
      this.conversionStatus = 'idle'
      this.conversionResults = []
      this.error = null
      this.activePreview = null
      this.jobId = null
      // Behalte Konvertierungsoptionen bei
    }
  }
})