<template>
  <div class="source-references">
    <h3 class="text-xl font-semibold mb-4">{{ title }}</h3>
    <div v-if="loading" class="flex justify-center py-4">
      <div class="spinner"></div>
    </div>
    <div v-else-if="sources.length === 0" class="text-gray-500 italic">
      {{ noSourcesMessage }}
    </div>
    <ul v-else class="space-y-4">
      <li v-for="(source, index) in sources" :key="index" class="source-item">
        <div class="source-header flex justify-between items-center">
          <div class="source-title">
            <span class="source-number">{{ index + 1 }}.</span>
            <span class="font-medium">{{ source.title }}</span>
          </div>
          <div class="source-actions flex space-x-2">
            <button 
              v-if="source.content" 
              @click="toggleSourceContent(index)" 
              class="action-button"
              :title="source.expanded ? 'Inhalt ausblenden' : 'Vollständigen Inhalt anzeigen'"
            >
              <font-awesome-icon :icon="source.expanded ? 'chevron-up' : 'chevron-down'" />
            </button>
          </div>
        </div>
        
        <div v-if="source.path" class="source-path text-sm text-gray-500 mt-1">
          {{ source.path }}
        </div>
        
        <div v-if="source.relevance" class="source-relevance text-sm mt-1">
          <span class="text-gray-600">Relevanz:</span> 
          <span :class="getRelevanceClass(source.relevance)">{{ getRelevanceText(source.relevance) }}</span>
        </div>
        
        <div v-if="source.expanded && source.content" class="source-content mt-2 p-3 rounded bg-gray-50 dark:bg-gray-800">
          <ContentRenderer :content="source.content" />
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import ContentRenderer from '@/components/common/ContentRenderer.vue';

const props = defineProps({
  sources: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Quellen'
  }
});

// Lokaler Zustand für erweiterte Quellen
const expandedSources = ref({});

// Berechnete Quellen mit Expanded-Status
const sources = computed(() => {
  return props.sources.map((source, index) => ({
    ...source,
    expanded: !!expandedSources.value[index]
  }));
});

// Keine Quellen Nachricht
const noSourcesMessage = computed(() => {
  return props.loading ? 'Quellen werden geladen...' : 'Keine Quellen verfügbar.';
});

// Quelle ein-/ausklappen
function toggleSourceContent(index) {
  expandedSources.value = {
    ...expandedSources.value,
    [index]: !expandedSources.value[index]
  };
}

// Relevanz-Texte
function getRelevanceText(relevance) {
  const map = {
    high: 'Hoch',
    medium: 'Mittel',
    low: 'Niedrig'
  };
  return map[relevance] || relevance;
}

// Relevanz-Klassen
function getRelevanceClass(relevance) {
  const classes = {
    high: 'text-green-600 font-medium',
    medium: 'text-yellow-600',
    low: 'text-red-600'
  };
  return classes[relevance] || '';
}
</script>

<style scoped>
.source-references {
  font-family: var(--font-family-sans);
}

.source-item {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  background-color: var(--card-bg);
}

.source-number {
  font-weight: 500;
  margin-right: 0.5rem;
  color: var(--text-secondary);
}

.action-button {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  background-color: var(--button-bg-subtle);
  color: var(--text-secondary);
  transition: background-color 0.2s;
}

.action-button:hover {
  background-color: var(--button-bg-subtle-hover);
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 0.25rem solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: var(--primary-color);
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.source-content {
  max-height: 400px;
  overflow-y: auto;
}

@media (prefers-color-scheme: dark) {
  .spinner {
    border-color: rgba(255, 255, 255, 0.1);
    border-top-color: var(--primary-color);
  }
}
</style>