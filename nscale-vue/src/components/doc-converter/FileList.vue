// FileList.vue
<template>
  <div class="file-list">
    <ul class="files">
      <li v-for="(file, index) in files" :key="index" class="file-item">
        <div class="file-icon">
          <i :class="getFileIcon(file)"></i>
        </div>
        <div class="file-details">
          <span class="file-name">{{ file.name }}</span>
          <span class="file-size">{{ formatFileSize(file.size) }}</span>
        </div>
        <button 
          class="remove-file" 
          @click="$emit('remove-file', file)"
          title="Datei entfernen"
        >
          <i class="fas fa-times"></i>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue';

// Props
const props = defineProps({
  files: {
    type: Array,
    required: true
  }
});

// Emits
defineEmits(['remove-file']);

// Dateigröße formatieren
const formatFileSize = (bytes) => {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  } else if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  } else {
    return `${bytes} B`;
  }
};

// Datei-Icon basierend auf Dateiendung bestimmen
const getFileIcon = (file) => {
  const extension = file.name.split('.').pop().toLowerCase();
  
  const iconMap = {
    pdf: 'fas fa-file-pdf',
    doc: 'fas fa-file-word',
    docx: 'fas fa-file-word',
    xls: 'fas fa-file-excel',
    xlsx: 'fas fa-file-excel',
    csv: 'fas fa-file-csv',
    ppt: 'fas fa-file-powerpoint',
    pptx: 'fas fa-file-powerpoint',
    jpg: 'fas fa-file-image',
    jpeg: 'fas fa-file-image',
    png: 'fas fa-file-image',
    gif: 'fas fa-file-image',
    txt: 'fas fa-file-alt',
    html: 'fas fa-file-code',
    htm: 'fas fa-file-code',
    zip: 'fas fa-file-archive',
    rar: 'fas fa-file-archive',
    // Weitere Dateitypen hier hinzufügen
  };
  
  return iconMap[extension] || 'fas fa-file';
};
</script>

<style scoped>
.file-list {
  width: 100%;
}

.files {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--nscale-gray-medium);
  border-radius: 4px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--nscale-gray-medium);
  background-color: white;
  transition: background-color 0.2s;
}

.file-item:last-child {
  border-bottom: none;
}

.file-item:hover {
  background-color: var(--nscale-gray-light);
}

.file-icon {
  margin-right: 1rem;
  font-size: 1.25rem;
  width: 24px;
  text-align: center;
  color: var(--nscale-gray-dark);
}

.file-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.file-name {
  font-weight: 500;
  margin-bottom: 0.25rem;
  word-break: break-word;
}

.file-size {
  font-size: 0.85rem;
  color: var(--nscale-gray-dark);
}

.remove-file {
  background: none;
  border: none;
  color: var(--nscale-gray-dark);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-file:hover {
  background-color: var(--nscale-red-light);
  color: var(--nscale-red);
}

/* Anpassung der Scrollbar */
.files::-webkit-scrollbar {
  width: 8px;
}

.files::-webkit-scrollbar-track {
  background: var(--nscale-gray-light);
}

.files::-webkit-scrollbar-thumb {
  background-color: var(--nscale-gray-medium);
  border-radius: 4px;
}

.files::-webkit-scrollbar-thumb:hover {
  background-color: var(--nscale-gray-dark);
}

/* Dark Mode Anpassungen */
:global(.theme-dark) .file-item {
  background-color: #1e1e1e;
  border-bottom-color: #333;
}

:global(.theme-dark) .file-item:hover {
  background-color: #333;
}

:global(.theme-dark) .files {
  border-color: #555;
  background-color: #1e1e1e;
}

:global(.theme-dark) .file-icon,
:global(.theme-dark) .file-size {
  color: #aaa;
}

:global(.theme-dark) .file-name {
  color: #f0f0f0;
}

:global(.theme-dark) .remove-file {
  color: #aaa;
}

:global(.theme-dark) .remove-file:hover {
  background-color: rgba(229, 62, 62, 0.2);
  color: #ff4d4d;
}

:global(.theme-dark) .files::-webkit-scrollbar-track {
  background: #333;
}

:global(.theme-dark) .files::-webkit-scrollbar-thumb {
  background-color: #555;
}

:global(.theme-dark) .files::-webkit-scrollbar-thumb:hover {
  background-color: #777;
}

/* Kontrast-Modus Anpassungen */
:global(.theme-contrast) .file-item {
  background-color: #000000;
  border: 1px solid #ffeb3b;
}

:global(.theme-contrast) .file-item:hover {
  background-color: #333300;
}

:global(.theme-contrast) .files {
  border: 2px solid #ffeb3b;
  background-color: #000000;
}

:global(.theme-contrast) .file-icon,
:global(.theme-contrast) .file-name,
:global(.theme-contrast) .file-size {
  color: #ffeb3b;
}

:global(.theme-contrast) .remove-file {
  color: #ffeb3b;
}

:global(.theme-contrast) .remove-file:hover {
  background-color: #330000;
  color: #ff4444;
}

:global(.theme-contrast) .files::-webkit-scrollbar-track {
  background: #333300;
}

:global(.theme-contrast) .files::-webkit-scrollbar-thumb {
  background-color: #ffeb3b;
}

:global(.theme-contrast) .files::-webkit-scrollbar-thumb:hover {
  background-color: #ffd600;
}
</style>