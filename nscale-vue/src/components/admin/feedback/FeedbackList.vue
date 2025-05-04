<template>
  <div class="feedback-list">
    <div class="list-header">
      <h2 class="list-title">{{ title }}</h2>
      <div class="filter-controls">
        <!-- Filter by feedback type -->
        <div class="filter-select">
          <select v-model="activeFilter" @change="applyFilters">
            <option value="all">Alle</option>
            <option value="positive">Positiv</option>
            <option value="negative">Negativ</option>
            <option value="with_comment">Mit Kommentar</option>
          </select>
        </div>
        
        <!-- Search input -->
        <div class="search-box">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Suche..." 
            @input="applyFilters"
          />
          <i class="fas fa-search"></i>
        </div>
      </div>
    </div>
    
    <!-- Loading indicator -->
    <div v-if="loading" class="loading-container">
      <div class="loader"></div>
      <span>Feedback wird geladen...</span>
    </div>
    
    <!-- Empty state -->
    <div v-else-if="filteredFeedback.length === 0" class="empty-state">
      <i class="fas fa-comment-slash"></i>
      <p>{{ emptyStateMessage }}</p>
      <button 
        v-if="hasActiveFilters" 
        class="reset-filters-btn" 
        @click="resetFilters"
      >
        Filter zurücksetzen
      </button>
    </div>
    
    <!-- Feedback items -->
    <div v-else class="feedback-items">
      <div 
        v-for="feedback in filteredFeedback" 
        :key="feedback.id" 
        class="feedback-item"
        :class="{
          'positive': feedback.is_positive,
          'negative': !feedback.is_positive,
          'with-comment': !!feedback.comment
        }"
      >
        <div class="feedback-header">
          <div class="feedback-badge" :class="feedback.is_positive ? 'positive' : 'negative'">
            <i :class="[
              'fas', 
              feedback.is_positive ? 'fa-thumbs-up' : 'fa-thumbs-down'
            ]"></i>
          </div>
          <div class="feedback-meta">
            <div class="feedback-session">
              Session: <span class="session-id">{{ feedback.session_id }}</span>
            </div>
            <div class="feedback-time">
              {{ formatDate(feedback.created_at) }}
            </div>
          </div>
          <div class="feedback-actions">
            <button 
              class="action-btn view-btn" 
              title="Nachricht anzeigen"
              @click="$emit('view-message', feedback)"
            >
              <i class="fas fa-eye"></i>
            </button>
            <button 
              class="action-btn view-session-btn" 
              title="Session ansehen"
              @click="$emit('view-session', feedback.session_id)"
            >
              <i class="fas fa-comments"></i>
            </button>
          </div>
        </div>
        
        <div v-if="feedback.comment" class="feedback-comment">
          <span class="comment-label">Kommentar:</span>
          <p class="comment-text">{{ feedback.comment }}</p>
        </div>
        
        <div class="feedback-message">
          <div class="message-preview" :class="{ 'expanded': expandedItems[feedback.id] }">
            {{ truncateMessage(feedback.message_text) }}
          </div>
          <button 
            v-if="shouldShowExpandButton(feedback.message_text)" 
            class="expand-btn"
            @click="toggleExpand(feedback.id)"
          >
            {{ expandedItems[feedback.id] ? 'Weniger anzeigen' : 'Mehr anzeigen' }}
          </button>
        </div>
      </div>
      
      <!-- Pagination controls -->
      <div v-if="hasPagination" class="pagination-controls">
        <button 
          class="pagination-btn prev-btn" 
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >
          <i class="fas fa-chevron-left"></i>
          Zurück
        </button>
        
        <div class="pagination-info">
          Seite {{ currentPage }} von {{ totalPages }}
        </div>
        
        <button 
          class="pagination-btn next-btn" 
          :disabled="currentPage === totalPages"
          @click="changePage(currentPage + 1)"
        >
          Weiter
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

// Props
const props = defineProps({
  feedbackItems: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Feedback'
  },
  pagination: {
    type: Object,
    default: () => ({ 
      enabled: false, 
      itemsPerPage: 10, 
      currentPage: 1, 
      totalPages: 1 
    })
  }
});

// Emits
const emit = defineEmits([
  'view-message', 
  'view-session', 
  'filter-change',
  'search-change',
  'page-change'
]);

// Local state
const activeFilter = ref('all');
const searchQuery = ref('');
const expandedItems = ref({});
const currentPage = ref(props.pagination?.currentPage || 1);

// Computed properties
const filteredFeedback = computed(() => {
  let result = [...props.feedbackItems];
  
  // Apply filter
  if (activeFilter.value !== 'all') {
    if (activeFilter.value === 'positive') {
      result = result.filter(item => item.is_positive);
    } else if (activeFilter.value === 'negative') {
      result = result.filter(item => !item.is_positive);
    } else if (activeFilter.value === 'with_comment') {
      result = result.filter(item => item.comment && item.comment.trim().length > 0);
    }
  }
  
  // Apply search
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(item => 
      (item.message_text && item.message_text.toLowerCase().includes(query)) ||
      (item.comment && item.comment.toLowerCase().includes(query))
    );
  }
  
  return result;
});

const hasActiveFilters = computed(() => {
  return activeFilter.value !== 'all' || searchQuery.value.trim() !== '';
});

const emptyStateMessage = computed(() => {
  if (hasActiveFilters.value) {
    return 'Keine passenden Feedback-Einträge gefunden.';
  }
  return 'Noch kein Feedback vorhanden.';
});

const hasPagination = computed(() => {
  return props.pagination && props.pagination.enabled;
});

const totalPages = computed(() => {
  return props.pagination?.totalPages || 1;
});

// Methods
const applyFilters = () => {
  emit('filter-change', activeFilter.value);
  emit('search-change', searchQuery.value);
  
  // Reset to first page when filters change
  if (hasPagination.value && currentPage.value !== 1) {
    currentPage.value = 1;
    emit('page-change', 1);
  }
};

const resetFilters = () => {
  activeFilter.value = 'all';
  searchQuery.value = '';
  applyFilters();
};

const changePage = (page) => {
  currentPage.value = page;
  emit('page-change', page);
};

const toggleExpand = (feedbackId) => {
  expandedItems.value = {
    ...expandedItems.value,
    [feedbackId]: !expandedItems.value[feedbackId]
  };
};

const truncateMessage = (message) => {
  if (!message) return '';
  
  // If already expanded, show full message
  if (expandedItems.value[message.id]) {
    return message;
  }
  
  // Otherwise truncate to 150 characters
  if (message.length > 150) {
    return message.substring(0, 150) + '...';
  }
  
  return message;
};

const shouldShowExpandButton = (message) => {
  return message && message.length > 150;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Watch for changes in pagination from parent
watch(() => props.pagination, (newVal) => {
  if (newVal && newVal.currentPage) {
    currentPage.value = newVal.currentPage;
  }
}, { deep: true });
</script>

<style scoped>
.feedback-list {
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.list-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.filter-controls {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.filter-select select {
  padding: 0.5rem 2rem 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  background-color: #f8fafc;
  font-size: 0.875rem;
  color: #475569;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 1.25rem;
}

.search-box {
  position: relative;
}

.search-box input {
  padding: 0.5rem 2.5rem 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  background-color: #f8fafc;
  font-size: 0.875rem;
  color: #475569;
  width: 200px;
}

.search-box i {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #64748b;
}

.loader {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: #64748b;
}

.empty-state i {
  font-size: 3rem;
  opacity: 0.5;
  margin-bottom: 1rem;
}

.reset-filters-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  color: #475569;
  font-size: 0.875rem;
  cursor: pointer;
}

.reset-filters-btn:hover {
  background-color: #f1f5f9;
}

.feedback-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.feedback-item {
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  overflow: hidden;
}

.feedback-item.positive {
  border-left: 4px solid #22c55e;
}

.feedback-item.negative {
  border-left: 4px solid #ef4444;
}

.feedback-header {
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  background-color: #f8fafc;
}

.feedback-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  color: white;
  flex-shrink: 0;
}

.feedback-badge.positive {
  background-color: #22c55e;
}

.feedback-badge.negative {
  background-color: #ef4444;
}

.feedback-meta {
  flex-grow: 1;
}

.feedback-session {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.session-id {
  font-family: monospace;
  font-weight: 500;
}

.feedback-time {
  font-size: 0.75rem;
  color: #94a3b8;
}

.feedback-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: none;
  padding: 0.375rem;
  border-radius: 0.25rem;
  color: #64748b;
  cursor: pointer;
}

.action-btn:hover {
  background-color: #e2e8f0;
  color: #1e293b;
}

.feedback-comment {
  padding: 1rem;
  background-color: #fffbeb;
  border-bottom: 1px solid #fef3c7;
}

.comment-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #d97706;
  display: block;
  margin-bottom: 0.25rem;
}

.comment-text {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #92400e;
}

.feedback-message {
  padding: 1rem;
}

.message-preview {
  font-size: 0.875rem;
  line-height: 1.6;
  color: #334155;
  white-space: pre-line;
  max-height: 4.8rem;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.message-preview.expanded {
  max-height: none;
}

.expand-btn {
  background: none;
  border: none;
  padding: 0;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #3b82f6;
  cursor: pointer;
}

.expand-btn:hover {
  text-decoration: underline;
}

.pagination-controls {
  margin-top: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #e2e8f0;
  padding-top: 1rem;
}

.pagination-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  color: #475569;
  font-size: 0.875rem;
  cursor: pointer;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #f1f5f9;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 0.875rem;
  color: #64748b;
}

/* Dark Mode Support */
:global(.theme-dark) .feedback-list {
  background-color: #1e1e1e;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

:global(.theme-dark) .list-title {
  color: #e0e0e0;
}

:global(.theme-dark) .filter-select select {
  background-color: #252525;
  border-color: #444;
  color: #e0e0e0;
}

:global(.theme-dark) .search-box input {
  background-color: #252525;
  border-color: #444;
  color: #e0e0e0;
}

:global(.theme-dark) .search-box i {
  color: #777;
}

:global(.theme-dark) .loading-container {
  color: #bbb;
}

:global(.theme-dark) .loader {
  border-color: #333;
  border-top-color: #3b82f6;
}

:global(.theme-dark) .empty-state {
  color: #aaa;
}

:global(.theme-dark) .reset-filters-btn {
  background-color: #252525;
  border-color: #444;
  color: #bbb;
}

:global(.theme-dark) .reset-filters-btn:hover {
  background-color: #333;
}

:global(.theme-dark) .feedback-item {
  border-color: #333;
}

:global(.theme-dark) .feedback-header {
  background-color: #252525;
}

:global(.theme-dark) .feedback-session {
  color: #bbb;
}

:global(.theme-dark) .feedback-time {
  color: #777;
}

:global(.theme-dark) .action-btn {
  color: #bbb;
}

:global(.theme-dark) .action-btn:hover {
  background-color: #333;
  color: #e0e0e0;
}

:global(.theme-dark) .feedback-comment {
  background-color: #332711;
  border-bottom-color: #443b11;
}

:global(.theme-dark) .comment-text {
  color: #e0e0e0;
}

:global(.theme-dark) .feedback-message {
  background-color: #1e1e1e;
}

:global(.theme-dark) .message-preview {
  color: #e0e0e0;
}

:global(.theme-dark) .expand-btn {
  color: #5c9be0;
}

:global(.theme-dark) .pagination-controls {
  border-top-color: #333;
}

:global(.theme-dark) .pagination-btn {
  background-color: #252525;
  border-color: #444;
  color: #bbb;
}

:global(.theme-dark) .pagination-btn:hover:not(:disabled) {
  background-color: #333;
  color: #e0e0e0;
}

:global(.theme-dark) .pagination-info {
  color: #bbb;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .filter-controls {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .search-box input {
    width: 100%;
  }
  
  .feedback-header {
    flex-wrap: wrap;
  }
}
</style>