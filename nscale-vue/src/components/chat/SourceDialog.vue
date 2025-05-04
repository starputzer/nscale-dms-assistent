<template>
  <div v-if="show" class="source-dialog-overlay" @click="closeOnBackdrop ? $emit('close') : null">
    <div class="source-dialog" @click.stop>
      <div class="dialog-header">
        <h3>{{ title }}</h3>
        <button class="close-button" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="dialog-content">
        <div v-if="loading" class="loading-state">
          <div class="loader"></div>
          <p>Lade Informationen...</p>
        </div>
        
        <template v-else>
          <!-- Source details view -->
          <template v-if="source">
            <div class="source-details">
              <h4 class="source-title">{{ source.title }}</h4>
              
              <div class="source-metadata">
                <div class="metadata-item">
                  <span class="metadata-label">Quelle:</span>
                  <span class="metadata-value">{{ source.document }}</span>
                </div>
                
                <div class="metadata-item">
                  <span class="metadata-label">Relevanz:</span>
                  <span class="metadata-value">{{ formatRelevance(source.relevance) }}</span>
                </div>
                
                <div class="metadata-item">
                  <span class="metadata-label">Zuletzt aktualisiert:</span>
                  <span class="metadata-value">{{ formatDate(source.updated) }}</span>
                </div>
              </div>
              
              <div class="source-content">
                <div class="content-label">Inhalt:</div>
                <div class="content-text" v-html="formatContent(source.content)"></div>
              </div>
            </div>
          </template>
          
          <!-- Sources list view -->
          <template v-else-if="sources && sources.length > 0">
            <ul class="sources-list">
              <li 
                v-for="(src, index) in sources" 
                :key="index"
                class="source-item"
                @click="$emit('select-source', src)"
              >
                <div class="source-item-title">
                  <span class="source-number">[{{ index + 1 }}]</span>
                  <span class="source-name">{{ src.title || src.document }}</span>
                </div>
                <div class="source-item-preview">
                  {{ truncate(src.content, 120) }}
                </div>
                <div class="source-item-metadata">
                  <span class="relevance-badge" :style="getRelevanceStyle(src.relevance)">
                    {{ formatRelevance(src.relevance) }}
                  </span>
                </div>
              </li>
            </ul>
          </template>
          
          <!-- Explanation view -->
          <template v-else-if="explanation">
            <div class="explanation-content">
              <h4 class="explanation-title">Erklärung der Antwort</h4>
              
              <div class="explanation-text" v-html="formatContent(explanation.explanation)"></div>
              
              <div v-if="explanation.sources && explanation.sources.length > 0" class="explanation-sources">
                <h4 class="explanation-subtitle">Verwendete Quellen</h4>
                <ul class="explanation-sources-list">
                  <li 
                    v-for="(src, index) in explanation.sources" 
                    :key="index"
                    class="explanation-source-item"
                    @click="$emit('select-source', src)"
                  >
                    <span class="source-number">[{{ index + 1 }}]</span>
                    <span class="source-name">{{ src.title || src.document }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </template>
          
          <!-- Empty state -->
          <div v-else class="empty-state">
            <p>Keine Informationen verfügbar</p>
          </div>
        </template>
      </div>
      
      <div class="dialog-footer">
        <button class="back-button" v-if="source || explanation" @click="$emit('back')">
          <i class="fas fa-arrow-left"></i>
          Zurück zur Übersicht
        </button>
        <button class="close-button-text" @click="$emit('close')">
          Schließen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { marked } from 'marked';

// Props
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Quelleninformationen'
  },
  sources: {
    type: Array,
    default: () => []
  },
  source: {
    type: Object,
    default: null
  },
  explanation: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true
  }
});

// Emits
const emit = defineEmits(['close', 'back', 'select-source']);

// Format relevance score (0-100)
const formatRelevance = (score) => {
  if (score === undefined || score === null) return 'Unbekannt';
  
  const relevance = Math.round(score * 100);
  
  if (relevance >= 90) return 'Sehr hoch';
  if (relevance >= 75) return 'Hoch';
  if (relevance >= 60) return 'Mittel';
  if (relevance >= 40) return 'Niedrig';
  return 'Sehr niedrig';
};

// Get color style based on relevance
const getRelevanceStyle = (score) => {
  if (score === undefined || score === null) return {};
  
  const relevance = Math.round(score * 100);
  
  if (relevance >= 90) return { backgroundColor: '#dcfce7', color: '#166534' };
  if (relevance >= 75) return { backgroundColor: '#d1fae5', color: '#065f46' };
  if (relevance >= 60) return { backgroundColor: '#ecfdf5', color: '#047857' };
  if (relevance >= 40) return { backgroundColor: '#f0fdfa', color: '#0f766e' };
  return { backgroundColor: '#eff6ff', color: '#1d4ed8' };
};

// Format date string
const formatDate = (dateString) => {
  if (!dateString) return 'Unbekannt';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
};

// Format content with markdown
const formatContent = (text) => {
  if (!text) return '';
  
  return marked.parse(text, {
    gfm: true,
    breaks: true,
    sanitize: true
  });
};

// Truncate text with ellipsis
const truncate = (text, length) => {
  if (!text) return '';
  if (text.length <= length) return text;
  
  return text.substring(0, length) + '...';
};
</script>

<style scoped>
.source-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.source-dialog {
  background-color: white;
  border-radius: 0.5rem;
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.dialog-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-button {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background-color: #f1f5f9;
  color: #334155;
}

.dialog-content {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.dialog-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* Source details styles */
.source-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.source-title {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-size: 1.125rem;
  font-weight: 600;
}

.source-metadata {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background-color: #f8fafc;
  padding: 0.75rem;
  border-radius: 0.375rem;
}

.metadata-item {
  display: flex;
  font-size: 0.875rem;
}

.metadata-label {
  font-weight: 500;
  color: #475569;
  width: 160px;
  flex-shrink: 0;
}

.metadata-value {
  color: #1e293b;
}

.source-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.content-label {
  font-weight: 500;
  color: #475569;
  font-size: 0.875rem;
}

.content-text {
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  background-color: #f8fafc;
  font-size: 0.95rem;
  line-height: 1.5;
  max-height: 300px;
  overflow-y: auto;
}

/* Sources list styles */
.sources-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.source-item {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.source-item:hover {
  background-color: #f1f5f9;
  border-color: #cbd5e1;
}

.source-item-title {
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.source-number {
  background-color: #e0f2fe;
  color: #0369a1;
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.source-item-preview {
  font-size: 0.875rem;
  color: #475569;
  margin-bottom: 0.5rem;
}

.source-item-metadata {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: flex-end;
}

.relevance-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 1rem;
  background-color: #dbeafe;
  color: #2563eb;
  font-weight: 500;
}

/* Explanation styles */
.explanation-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.explanation-title, .explanation-subtitle {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-weight: 600;
}

.explanation-text {
  font-size: 0.95rem;
  line-height: 1.5;
  color: #334155;
  background-color: #f8fafc;
  padding: 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid #e2e8f0;
}

.explanation-sources-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.explanation-source-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: #f8fafc;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.explanation-source-item:hover {
  background-color: #f1f5f9;
}

/* Loading and empty states */
.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #94a3b8;
  text-align: center;
}

.loader {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Footer buttons */
.back-button, .close-button-text {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.back-button {
  background-color: #eff6ff;
  color: #2563eb;
  border: none;
}

.back-button:hover {
  background-color: #dbeafe;
}

.close-button-text {
  background-color: #f1f5f9;
  color: #475569;
  border: none;
}

.close-button-text:hover {
  background-color: #e2e8f0;
  color: #334155;
}
</style>