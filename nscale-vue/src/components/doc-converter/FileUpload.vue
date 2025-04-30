// FileUpload.vue
<template>
  <div 
    class="file-upload"
    :class="{ 'dragging': isDragging }"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="upload-area">
      <i class="upload-icon fas fa-cloud-upload-alt"></i>
      <h3 class="upload-title">Dateien ablegen oder auswählen</h3>
      <p class="upload-hint">
        Unterstützte Formate: {{ formattedAcceptedFormats }}
      </p>
      <p class="upload-limit">Maximale Dateigröße: {{ formattedMaxFileSize }}</p>
      
      <div class="upload-actions">
        <label class="upload-button" for="file-input">
          Dateien auswählen
        </label>
        <input
          id="file-input"
          type="file"
          :accept="acceptedFormatsString"
          :multiple="multiple"
          class="hidden-input"
          @change="onFileSelect"
        />
      </div>
    </div>
    
    <!-- Fehleranzeige -->
    <div v-if="fileErrors.length > 0" class="upload-errors">
      <div v-for="(error, index) in fileErrors" :key="index" class="error-item">
        <i class="fas fa-exclamation-triangle"></i>
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

// Props
const props = defineProps({
  acceptedFormats: {
    type: Array,
    default: () => ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.html', '.txt']
  },
  maxFileSize: {
    type: Number,
    default: 50 * 1024 * 1024 // 50 MB
  },
  multiple: {
    type: Boolean,
    default: true
  }
});

// Emits
const emit = defineEmits(['files-selected']);

// Reaktiver Zustand
const isDragging = ref(false);
const fileErrors = ref([]);

// Berechnete Eigenschaften
const acceptedFormatsString = computed(() => {
  return props.acceptedFormats.join(',');
});

const formattedAcceptedFormats = computed(() => {
  return props.acceptedFormats.join(', ');
});

const formattedMaxFileSize = computed(() => {
  if (props.maxFileSize >= 1024 * 1024 * 1024) {
    return `${(props.maxFileSize / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  } else if (props.maxFileSize >= 1024 * 1024) {
    return `${(props.maxFileSize / (1024 * 1024)).toFixed(0)} MB`;
  } else {
    return `${(props.maxFileSize / 1024).toFixed(0)} KB`;
  }
});

// Methoden
const onDragOver = () => {
  isDragging.value = true;
};

const onDragLeave = () => {
  isDragging.value = false;
};

const onDrop = (e) => {
  isDragging.value = false;
  const files = e.dataTransfer.files;
  processFiles(files);
};

const onFileSelect = (e) => {
  const files = e.target.files;
  processFiles(files);
  // Zurücksetzen des Eingabefelds, damit dasselbe File erneut hochgeladen werden kann
  e.target.value = null;
};

const processFiles = (files) => {
  fileErrors.value = [];
  const validFiles = [];
  
  // Dateien validieren
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const errors = validateFile(file);
    
    if (errors.length === 0) {
      validFiles.push(file);
    } else {
      fileErrors.value.push(`${file.name}: ${errors.join(', ')}`);
    }
  }
  
  if (validFiles.length > 0) {
    emit('files-selected', validFiles);
  }
};

const validateFile = (file) => {
  const errors = [];
  
  // Dateigröße überprüfen
  if (file.size > props.maxFileSize) {
    errors.push(`Datei ist zu groß (${formatFileSize(file.size)} > ${formatFileSize(props.maxFileSize)})`);
  }
  
  // Dateityp überprüfen
  if (props.acceptedFormats.length > 0) {
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!props.acceptedFormats.some(ext => ext.toLowerCase() === fileExt)) {
      errors.push(`Ungültiges Dateiformat ${fileExt}`);
    }
  }
  
  return errors;
};

const formatFileSize = (bytes) => {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  } else if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
};
</script>

<style scoped>
.file-upload {
  width: 100%;
  border: 2px dashed var(--nscale-gray-medium);
  border-radius: 8px;
  background-color: var(--nscale-gray-light);
  transition: all 0.2s ease;
}

.file-upload.dragging {
  background-color: var(--nscale-primary-light);
  border-color: var(--nscale-primary);
  transform: scale(1.01);
}

.upload-area {
  padding: 2rem;
  text-align: center;
}

.upload-icon {
  font-size: 2.5rem;
  color: var(--nscale-primary);
  margin-bottom: 1rem;
}

.upload-title {
  font-size: 1.25rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--nscale-dark-gray);
}

.upload-hint, .upload-limit {
  font-size: 0.9rem;
  color: var(--nscale-gray-dark);
  margin-bottom: 0.25rem;
}

.upload-actions {
  margin-top: 1.5rem;
}

.upload-button {
  display: inline-block;
  background-color: var(--nscale-primary);
  color: white;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.upload-button:hover {
  background-color: var(--nscale-primary-dark);
  transform: translateY(-2px);
}

.hidden-input {
  opacity: 0;
  position: absolute;
  z-index: -1;
}

.upload-errors {
  border-top: 1px solid var(--nscale-red-light);
  padding: 1rem 1.5rem;
  background-color: rgba(229, 62, 62, 0.05);
}

.error-item {
  color: var(--nscale-red);
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.error-item:last-child {
  margin-bottom: 0;
}

/* Dark Mode Anpassungen */
:global(.theme-dark) .file-upload {
  background-color: #333;
  border-color: #555;
}

:global(.theme-dark) .file-upload.dragging {
  background-color: rgba(0, 192, 96, 0.1);
  border-color: #00c060;
}

:global(.theme-dark) .upload-icon {
  color: #00c060;
}

:global(.theme-dark) .upload-title {
  color: #f0f0f0;
}

:global(.theme-dark) .upload-hint,
:global(.theme-dark) .upload-limit {
  color: #aaa;
}

:global(.theme-dark) .upload-button {
  background-color: #00c060;
}

:global(.theme-dark) .upload-button:hover {
  background-color: #00a550;
}

:global(.theme-dark) .upload-errors {
  background-color: rgba(229, 62, 62, 0.1);
  border-top-color: #662222;
}

/* Kontrast-Modus Anpassungen */
:global(.theme-contrast) .file-upload {
  background-color: #000000;
  border: 2px dashed #ffeb3b;
}

:global(.theme-contrast) .file-upload.dragging {
  background-color: #333300;
  border-color: #ffeb3b;
}

:global(.theme-contrast) .upload-icon,
:global(.theme-contrast) .upload-title,
:global(.theme-contrast) .upload-hint,
:global(.theme-contrast) .upload-limit {
  color: #ffeb3b;
}

:global(.theme-contrast) .upload-button {
  background-color: #ffeb3b;
  color: #000000;
  font-weight: bold;
}

:global(.theme-contrast) .upload-button:hover {
  background-color: #ffd600;
}

:global(.theme-contrast) .upload-errors {
  background-color: #330000;
  border-top-color: #ff4444;
}

:global(.theme-contrast) .error-item {
  color: #ff4444;
}
</style>