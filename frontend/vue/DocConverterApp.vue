<!-- DocConverterApp.vue -->
<template>
  <div class="doc-converter-app" :class="{ 'dark': isDarkMode }">
    <div class="app-header">
      <h1>nscale Dokumentenkonverter</h1>
      <div class="theme-toggle">
        <button @click="toggleTheme" class="theme-btn">
          <span v-if="isDarkMode">☀️</span>
          <span v-else>🌙</span>
        </button>
      </div>
    </div>

    <div class="upload-section">
      <div 
        class="upload-zone"
        :class="{ 'drag-active': isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleFileDrop"
      >
        <div v-if="!uploadActive">
          <i class="upload-icon">📄</i>
          <p>Dateien hierher ziehen oder <span class="browse-text" @click="triggerFileInput">durchsuchen</span></p>
          <input 
            type="file" 
            ref="fileInput" 
            @change="handleFileSelect" 
            multiple 
            class="hidden-input"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv"
          >
        </div>
        <div v-else class="upload-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
          </div>
          <p>{{ uploadStatus }}</p>
          <button @click="cancelUpload" class="cancel-btn">Abbrechen</button>
        </div>
      </div>
    </div>

    <div v-if="documents.length > 0" class="documents-section">
      <h2>Dokumente</h2>
      <div class="documents-list">
        <div 
          v-for="(doc, index) in documents" 
          :key="index"
          class="document-item"
          :class="{ 'processing': doc.status === 'processing' }"
        >
          <div class="doc-icon">
            <span v-if="doc.status === 'completed'">✅</span>
            <span v-else-if="doc.status === 'processing'">⏳</span>
            <span v-else-if="doc.status === 'error'">❌</span>
            <span v-else>📄</span>
          </div>
          <div class="doc-info">
            <div class="doc-name">{{ doc.name }}</div>
            <div class="doc-status">{{ getStatusText(doc.status) }}</div>
            <div v-if="doc.progress" class="doc-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: doc.progress + '%' }"></div>
              </div>
            </div>
          </div>
          <div class="doc-actions">
            <button 
              v-if="doc.status === 'completed'" 
              @click="downloadDocument(doc)" 
              class="action-btn download-btn"
            >
              Herunterladen
            </button>
            <button 
              @click="removeDocument(index)" 
              class="action-btn remove-btn"
            >
              Entfernen
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

// State
const isDarkMode = ref(false);
const isDragging = ref(false);
const uploadActive = ref(false);
const uploadProgress = ref(0);
const uploadStatus = ref('');
const fileInput = ref(null);
const documents = ref([]);

// Berechnete Eigenschaften
const getStatusText = (status) => {
  switch (status) {
    case 'uploaded': return 'Hochgeladen';
    case 'processing': return 'Wird verarbeitet...';
    case 'completed': return 'Fertiggestellt';
    case 'error': return 'Fehler';
    default: return 'Unbekannt';
  }
};

// Methoden
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  localStorage.setItem('docConverterTheme', isDarkMode.value ? 'dark' : 'light');
};

const triggerFileInput = () => {
  fileInput.value.click();
};

const handleFileSelect = (event) => {
  const files = event.target.files;
  if (files.length > 0) {
    processFiles(files);
  }
};

const handleFileDrop = (event) => {
  isDragging.value = false;
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    processFiles(files);
  }
};

const processFiles = (files) => {
  uploadActive.value = true;
  uploadProgress.value = 0;
  uploadStatus.value = `Verarbeite ${files.length} Dateien...`;

  // Füge Dateien zur Liste hinzu
  Array.from(files).forEach(file => {
    documents.value.push({
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploaded',
      progress: 0
    });
  });

  // Simuliere Upload-Fortschritt
  const totalFiles = files.length;
  let processedFiles = 0;
  
  const processNextFile = (index) => {
    if (index >= totalFiles) {
      uploadActive.value = false;
      uploadStatus.value = 'Upload abgeschlossen';
      return;
    }
    
    const file = files[index];
    const docIndex = documents.value.findIndex(d => d.name === file.name);
    
    if (docIndex !== -1) {
      documents.value[docIndex].status = 'processing';
      
      // Simuliere Verarbeitung
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        documents.value[docIndex].progress = progress;
        
        if (progress >= 100) {
          clearInterval(interval);
          documents.value[docIndex].status = 'completed';
          documents.value[docIndex].progress = 100;
          
          processedFiles++;
          uploadProgress.value = Math.floor((processedFiles / totalFiles) * 100);
          uploadStatus.value = `${processedFiles}/${totalFiles} Dateien verarbeitet`;
          
          processNextFile(index + 1);
        }
      }, 200);
    } else {
      processNextFile(index + 1);
    }
  };
  
  processNextFile(0);
};

const cancelUpload = () => {
  uploadActive.value = false;
  uploadProgress.value = 0;
  uploadStatus.value = '';
};

const downloadDocument = (doc) => {
  // In einer realen Anwendung würde hier der Download stattfinden
  console.log('Herunterladen von:', doc.name);
  alert(`Download von "${doc.name}" gestartet`);
};

const removeDocument = (index) => {
  documents.value.splice(index, 1);
};

// Lebenszyklus-Hooks
onMounted(() => {
  // Lade Theme-Präferenz aus localStorage
  const savedTheme = localStorage.getItem('docConverterTheme');
  if (savedTheme) {
    isDarkMode.value = savedTheme === 'dark';
  } else {
    // Prüfe System-Theme-Präferenz
    isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
});
</script>

<style scoped>
.doc-converter-app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  border-radius: 8px;
  background-color: #f8f9fa;
  color: #333;
}

.doc-converter-app.dark {
  background-color: #2a2a2a;
  color: #f1f1f1;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.theme-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.theme-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.dark .theme-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.upload-section {
  margin-bottom: 2rem;
}

.upload-zone {
  border: 2px dashed #ced4da;
  border-radius: 8px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.dark .upload-zone {
  border-color: #666;
}

.upload-zone:hover, .upload-zone.drag-active {
  border-color: #20c997;
  background-color: rgba(32, 201, 151, 0.05);
}

.dark .upload-zone:hover, .dark .upload-zone.drag-active {
  border-color: #2ecc71;
  background-color: rgba(46, 204, 113, 0.1);
}

.upload-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  display: inline-block;
}

.browse-text {
  color: #20c997;
  text-decoration: underline;
  cursor: pointer;
}

.dark .browse-text {
  color: #2ecc71;
}

.hidden-input {
  display: none;
}

.upload-progress {
  width: 100%;
}

.progress-bar {
  height: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin: 1rem 0;
}

.dark .progress-bar {
  background-color: #444;
}

.progress-fill {
  height: 100%;
  background-color: #20c997;
  transition: width 0.3s;
}

.dark .progress-fill {
  background-color: #2ecc71;
}

.cancel-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
}

.dark .cancel-btn {
  background-color: #e74c3c;
}

.documents-section {
  margin-top: 2rem;
}

.documents-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.document-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.dark .document-item {
  background-color: #333;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.document-item.processing {
  background-color: rgba(32, 201, 151, 0.05);
}

.dark .document-item.processing {
  background-color: rgba(46, 204, 113, 0.1);
}

.doc-icon {
  font-size: 1.5rem;
  margin-right: 1rem;
  width: 40px;
  text-align: center;
}

.doc-info {
  flex: 1;
}

.doc-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.doc-status {
  font-size: 0.875rem;
  color: #6c757d;
}

.dark .doc-status {
  color: #adb5bd;
}

.doc-progress {
  margin-top: 0.5rem;
}

.doc-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.download-btn {
  background-color: #20c997;
  color: white;
}

.dark .download-btn {
  background-color: #2ecc71;
}

.remove-btn {
  background-color: transparent;
  color: #dc3545;
  border: 1px solid #dc3545;
}

.dark .remove-btn {
  color: #e74c3c;
  border-color: #e74c3c;
}
</style>