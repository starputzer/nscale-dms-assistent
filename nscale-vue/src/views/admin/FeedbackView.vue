<template>
  <div class="admin-feedback-view">
    <div class="page-header">
      <h1 class="page-title">Feedback-Analyse</h1>
      <div class="header-actions">
        <!-- Date range selector -->
        <div class="date-range-selector">
          <label for="date-range" class="selector-label">Zeitraum:</label>
          <select 
            id="date-range" 
            v-model="selectedDateRange"
            @change="handleDateRangeChange"
            class="date-range-select"
          >
            <option value="today">Heute</option>
            <option value="yesterday">Gestern</option>
            <option value="last7days">Letzte 7 Tage</option>
            <option value="last30days">Letzte 30 Tage</option>
            <option value="thisMonth">Dieser Monat</option>
            <option value="lastMonth">Letzter Monat</option>
            <option value="thisYear">Dieses Jahr</option>
            <option value="allTime">Alle Zeit</option>
          </select>
        </div>
        
        <!-- Export button -->
        <button 
          @click="exportFeedback" 
          class="export-btn"
          :disabled="loading"
        >
          <i class="fas fa-file-export"></i>
          Exportieren (CSV)
        </button>
        
        <!-- Refresh button -->
        <button 
          @click="refreshAllData" 
          class="refresh-btn"
          :disabled="loading"
        >
          <i class="fas fa-sync-alt"></i>
          Aktualisieren
        </button>
      </div>
    </div>
    
    <!-- Statistics section -->
    <FeedbackStats 
      :stats="feedbackStats" 
      :date-range="selectedDateRange"
      :title="`Feedback-Statistiken (${dateRangeText})`"
      @refresh="refreshAllData"
    />
    
    <!-- Feedback list section -->
    <FeedbackList 
      :feedback-items="feedbackItems"
      :loading="loading"
      :title="`Feedback-Einträge (${dateRangeText})`"
      :pagination="pagination"
      @view-message="handleViewFeedback"
      @view-session="handleViewSession"
      @filter-change="handleFilterChange"
      @search-change="handleSearchChange"
      @page-change="handlePageChange"
    />
    
    <!-- Feedback detail dialog -->
    <div v-if="showDetailModal" class="modal-overlay" @click="closeDetailModal">
      <FeedbackDetail 
        v-if="selectedFeedback"
        :feedback="selectedFeedback"
        @close="closeDetailModal"
        @view-session="handleViewSession"
        @click.stop
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useFeedbackStore } from '@/stores/feedbackStore';
import FeedbackStats from '@/components/admin/feedback/FeedbackStats.vue';
import FeedbackList from '@/components/admin/feedback/FeedbackList.vue';
import FeedbackDetail from '@/components/admin/feedback/FeedbackDetail.vue';

// Store & Router
const feedbackStore = useFeedbackStore();
const router = useRouter();

// Refs
const selectedDateRange = ref('last7days');
const showDetailModal = ref(false);
const selectedFeedback = ref(null);
const pollingInterval = ref(null);

// Computed properties
const feedbackStats = computed(() => feedbackStore.stats);
const feedbackItems = computed(() => feedbackStore.feedbackItems);
const loading = computed(() => feedbackStore.loading || feedbackStore.statsLoading);
const dateRangeText = computed(() => feedbackStore.dateRangeFormatted);
const pagination = computed(() => feedbackStore.pagination);

// Methods
const refreshAllData = async () => {
  await Promise.all([
    feedbackStore.loadStats(selectedDateRange.value),
    feedbackStore.loadFeedback({ dateRange: selectedDateRange.value })
  ]);
};

const handleDateRangeChange = () => {
  refreshAllData();
};

const handleFilterChange = (filterType) => {
  feedbackStore.loadFeedback({ type: filterType });
};

const handleSearchChange = (query) => {
  feedbackStore.loadFeedback({ search: query });
};

const handlePageChange = (page) => {
  feedbackStore.changePage(page);
};

const handleViewFeedback = async (feedback) => {
  // If we already have full feedback details with context, show it
  if (feedback.context_messages) {
    selectedFeedback.value = feedback;
    showDetailModal.value = true;
    return;
  }
  
  // Otherwise, load full details first
  const detailedFeedback = await feedbackStore.loadFeedbackDetail(feedback.id);
  
  if (detailedFeedback) {
    // Load conversation context
    await feedbackStore.loadFeedbackContext(
      detailedFeedback.id, 
      detailedFeedback.session_id
    );
    
    selectedFeedback.value = feedbackStore.selectedFeedback;
    showDetailModal.value = true;
  }
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  // Clear selection after a short delay (for animation)
  setTimeout(() => {
    selectedFeedback.value = null;
  }, 300);
};

const handleViewSession = (sessionId) => {
  // Zur Chat-Ansicht mit der ausgewählten Session navigieren
  console.log('Öffne Session:', sessionId);
  
  // Ggf. Dialog schließen, wenn geöffnet
  if (showDetailModal.value) {
    closeDetailModal();
  }
  
  // Navigation zur Chat-Ansicht mit der Session-ID
  router.push({ 
    name: 'ChatSession', 
    params: { sessionId }
  });
};

const exportFeedback = () => {
  feedbackStore.exportFeedbackCsv(selectedDateRange.value);
};

// Start polling for updates
const startPolling = () => {
  // Poll every 5 minutes for updates
  pollingInterval.value = setInterval(() => {
    refreshAllData();
  }, 5 * 60 * 1000);
};

// Lifecycle hooks
onMounted(async () => {
  // Initial data load
  await refreshAllData();
  
  // Start polling
  startPolling();
});

onUnmounted(() => {
  // Clear polling interval
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value);
  }
});
</script>

<style scoped>
.admin-feedback-view {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.date-range-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.selector-label {
  font-size: 0.875rem;
  color: #475569;
}

.date-range-select {
  padding: 0.5rem 2rem 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  background-color: white;
  color: #1e293b;
  font-size: 0.875rem;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 1.25rem;
}

.export-btn, .refresh-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.export-btn {
  background-color: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.export-btn:hover:not(:disabled) {
  background-color: #f1f5f9;
  color: #1e293b;
}

.refresh-btn {
  background-color: #eff6ff;
  color: #3b82f6;
  border: 1px solid #bfdbfe;
}

.refresh-btn:hover:not(:disabled) {
  background-color: #dbeafe;
  color: #2563eb;
}

.export-btn:disabled, .refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal styling */
.modal-overlay {
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
  padding: 1rem;
}

/* Dark Mode Support */
:global(.theme-dark) .admin-feedback-view {
  color: #e0e0e0;
}

:global(.theme-dark) .page-title {
  color: #e0e0e0;
}

:global(.theme-dark) .selector-label {
  color: #bbb;
}

:global(.theme-dark) .date-range-select {
  background-color: #252525;
  border-color: #444;
  color: #e0e0e0;
}

:global(.theme-dark) .export-btn {
  background-color: #252525;
  color: #bbb;
  border-color: #444;
}

:global(.theme-dark) .export-btn:hover:not(:disabled) {
  background-color: #333;
  color: #e0e0e0;
}

:global(.theme-dark) .refresh-btn {
  background-color: #1a3668;
  color: #90caf9;
  border-color: #264f82;
}

:global(.theme-dark) .refresh-btn:hover:not(:disabled) {
  background-color: #1e4072;
  color: #bdd7f7;
}

:global(.theme-dark) .modal-overlay {
  background-color: rgba(0, 0, 0, 0.7);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>