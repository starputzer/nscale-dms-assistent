<script setup>
import { ref, onMounted } from 'vue'
import { useFeatureToggleStore } from '../stores/featureToggleStore'

const featureToggleStore = useFeatureToggleStore()
const isVueVersion = ref(featureToggleStore.isDocConverterEnabled)
const files = ref([])
const results = ref([])
const isUploading = ref(false)
const uploadProgress = ref(0)
const dragActive = ref(false)

// Datei-Upload-Handler
const handleFileUpload = (event) => {
  files.value = event.target.files
  if (files.value.length > 0) {
    uploadFiles()
  }
}

// Drag-and-Drop-Funktionen
const handleDragEnter = (e) => {
  e.preventDefault()
  e.stopPropagation()
  dragActive.value = true
}

const handleDragLeave = (e) => {
  e.preventDefault()
  e.stopPropagation()
  dragActive.value = false
}

const handleDragOver = (e) => {
  e.preventDefault()
  e.stopPropagation()
}

const handleDrop = (e) => {
  e.preventDefault()
  e.stopPropagation()
  dragActive.value = false
  
  if (e.dataTransfer.files.length > 0) {
    files.value = e.dataTransfer.files
    uploadFiles()
  }
}

// Dateien hochladen und konvertieren
const uploadFiles = async () => {
  if (!files.value || files.value.length === 0) return
  
  isUploading.value = true
  uploadProgress.value = 0
  
  // Für jede Datei ein Ergebnis-Element erstellen
  results.value = Array.from(files.value).map(file => ({
    name: file.name,
    status: 'uploading',
    message: 'Wird hochgeladen...',
    downloadUrl: null,
    previewUrl: null,
    error: null
  }))
  
  // Fortschrittsbalken simulieren
  const progressInterval = setInterval(() => {
    if (uploadProgress.value < 90) {
      uploadProgress.value += Math.random() * 10
    }
  }, 200)
  
  try {
    // FormData erstellen und Dateien anhängen
    const formData = new FormData()
    Array.from(files.value).forEach((file, index) => {
      formData.append('files', file)
    })
    
    // API-Aufruf simulieren (kann später durch echten Aufruf ersetzt werden)
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000))
    
    // Erfolgsfall simulieren
    Array.from(files.value).forEach((file, index) => {
      results.value[index].status = 'success'
      results.value[index].message = 'Konvertierung erfolgreich'
      results.value[index].downloadUrl = '#' // Hier später echte URL einfügen
      results.value[index].previewUrl = '#' // Hier später echte URL einfügen
    })
    
    uploadProgress.value = 100
  } catch (error) {
    console.error('Fehler beim Hochladen:', error)
    
    // Fehlerfall für alle Dateien setzen
    results.value.forEach((result, index) => {
      result.status = 'error'
      result.message = 'Fehler bei der Konvertierung'
      result.error = error.message || 'Unbekannter Fehler'
    })
  } finally {
    clearInterval(progressInterval)
    setTimeout(() => {
      isUploading.value = false
    }, 500)
  }
}

// Beim Laden prüfen, ob Vue-Version aktiviert werden soll
onMounted(() => {
  isVueVersion.value = featureToggleStore.isDocConverterEnabled
  
  // Feature-Toggle-Änderungen beobachten
  featureToggleStore.$subscribe((_mutation, state) => {
    isVueVersion.value = state.features.vueDocConverter
  })
})
</script>

<template>
  <div class="doc-converter-container">
    <div class="doc-converter-header">
      <h1 class="doc-converter-title">Dokumentenkonverter</h1>
      <p class="doc-converter-description">
        Laden Sie Dokumente hoch, um sie in durchsuchbaren Text zu konvertieren.
      </p>
    </div>
    
    <div class="doc-converter-card">
      <div 
        class="upload-zone"
        :class="{ 'active': dragActive }"
        @dragenter="handleDragEnter"
        @dragleave="handleDragLeave"
        @dragover="handleDragOver"
        @drop="handleDrop"
      >
        <div class="upload-icon">
          <i class="fas fa-cloud-upload-alt"></i>
        </div>
        <p class="upload-text">Dateien hierher ziehen oder</p>
        <input 
          type="file" 
          id="file-upload" 
          class="file-input" 
          multiple
          @change="handleFileUpload"
        />
        <label for="file-upload" class="upload-button">
          Dateien auswählen
        </label>
        <p class="upload-hint">
          Unterstützte Formate: PDF, DOCX, XLSX, PPTX, HTML
        </p>
      </div>
      
      <!-- Fortschrittsanzeige -->
      <div class="progress-container" v-if="isUploading">
        <p class="progress-label">Konvertierung läuft...</p>
        <div class="progress-bar-container">
          <div 
            class="progress-bar" 
            :style="{ width: `${uploadProgress}%` }"
          ></div>
        </div>
      </div>
      
      <!-- Ergebnisse -->
      <div class="results-container" v-if="results.length > 0">
        <h3 class="results-title">Konvertierte Dokumente</h3>
        <div class="results-list">
          <div 
            v-for="(result, index) in results" 
            :key="index"
            class="result-item"
            :class="result.status"
          >
            <div class="result-icon">
              <i v-if="result.status === 'uploading'" class="fas fa-spinner fa-spin"></i>
              <i v-else-if="result.status === 'success'" class="fas fa-check-circle"></i>
              <i v-else-if="result.status === 'error'" class="fas fa-times-circle"></i>
              <i v-else class="fas fa-file-alt"></i>
            </div>
            <div class="result-content">
              <h4 class="result-name">{{ result.name }}</h4>
              <p class="result-message">{{ result.message }}</p>
              <div class="result-actions" v-if="result.status === 'success'">
                <a 
                  :href="result.downloadUrl" 
                  class="result-action download"
                  target="_blank"
                >
                  <i class="fas fa-download"></i> Herunterladen
                </a>
                <a 
                  :href="result.previewUrl" 
                  class="result-action preview"
                  target="_blank"
                >
                  <i class="fas fa-eye"></i> Vorschau
                </a>
              </div>
              <p class="result-error" v-if="result.error">
                {{ result.error }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.doc-converter-container {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.doc-converter-header {
  margin-bottom: 2rem;
  text-align: center;
}

.doc-converter-title {
  font-size: 2rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.5rem;
}

.doc-converter-description {
  color: #666;
  font-size: 1.1rem;
}

.doc-converter-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 2rem;
}

.upload-zone {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 3rem 2rem;
  text-align: center;
  transition: all 0.3s ease;
}

.upload-zone.active {
  border-color: #38a169;
  background-color: rgba(56, 161, 105, 0.05);
}

.upload-icon {
  font-size: 3rem;
  color: #a0aec0;
  margin-bottom: 1rem;
}

.upload-text {
  margin-bottom: 1rem;
  color: #4a5568;
}

.file-input {
  display: none;
}

.upload-button {
  display: inline-block;
  background-color: #38a169;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.upload-button:hover {
  background-color: #2f855a;
}

.upload-hint {
  margin-top: 1rem;
  font-size: 0.875rem;
  color: #718096;
}

.progress-container {
  margin-top: 2rem;
}

.progress-label {
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.progress-bar-container {
  height: 8px;
  background-color: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background-color: #38a169;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.results-container {
  margin-top: 2rem;
}

.results-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-item {
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.result-item.success {
  border-left: 4px solid #38a169;
}

.result-item.error {
  border-left: 4px solid #e53e3e;
}

.result-item.uploading {
  border-left: 4px solid #3182ce;
}

.result-icon {
  flex-shrink: 0;
  font-size: 1.5rem;
  margin-right: 1rem;
}

.result-item.success .result-icon {
  color: #38a169;
}

.result-item.error .result-icon {
  color: #e53e3e;
}

.result-item.uploading .result-icon {
  color: #3182ce;
}

.result-content {
  flex-grow: 1;
}

.result-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.result-message {
  color: #718096;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.result-actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.result-action {
  font-size: 0.875rem;
  color: #3182ce;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.result-action:hover {
  text-decoration: underline;
}

.result-error {
  margin-top: 0.5rem;
  color: #e53e3e;
  font-size: 0.875rem;
}
</style>