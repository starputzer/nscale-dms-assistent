<template>
  <div class="admin-feedback">
    <h2 class="admin-feedback__title">{{ t('admin.feedback.title', 'Feedback-Übersicht') }}</h2>
    
    <!-- Summary Statistics -->
    <div class="admin-feedback__stats">
      <div class="stats-card stats-card--total">
        <div class="stats-card__icon">
          <i class="fas fa-comments"></i>
        </div>
        <div class="stats-card__content">
          <div class="stats-card__value">{{ stats.total }}</div>
          <div class="stats-card__label">{{ t('admin.feedback.stats.total', 'Gesamt') }}</div>
        </div>
      </div>
      
      <div class="stats-card stats-card--positive">
        <div class="stats-card__icon">
          <i class="fas fa-thumbs-up"></i>
        </div>
        <div class="stats-card__content">
          <div class="stats-card__value">{{ stats.positive }}</div>
          <div class="stats-card__label">{{ t('admin.feedback.stats.positive', 'Positiv') }}</div>
        </div>
      </div>
      
      <div class="stats-card stats-card--negative">
        <div class="stats-card__icon">
          <i class="fas fa-thumbs-down"></i>
        </div>
        <div class="stats-card__content">
          <div class="stats-card__value">{{ stats.negative }}</div>
          <div class="stats-card__label">{{ t('admin.feedback.stats.negative', 'Negativ') }}</div>
        </div>
      </div>
      
      <div class="stats-card stats-card--comments">
        <div class="stats-card__icon">
          <i class="fas fa-comment-dots"></i>
        </div>
        <div class="stats-card__content">
          <div class="stats-card__value">{{ stats.with_comments }}</div>
          <div class="stats-card__label">{{ t('admin.feedback.stats.withComments', 'Mit Kommentaren') }}</div>
        </div>
      </div>
      
      <div class="stats-card stats-card--rate">
        <div class="stats-card__icon">
          <i class="fas fa-chart-line"></i>
        </div>
        <div class="stats-card__content">
          <div class="stats-card__value">{{ stats.positive_percent }}%</div>
          <div class="stats-card__label">{{ t('admin.feedback.stats.positiveRate', 'Positive Quote') }}</div>
        </div>
      </div>
    </div>

    <!-- Data Visualization -->
    <div class="admin-feedback__charts">
      <div class="chart-container">
        <h3>{{ t('admin.feedback.charts.feedbackOverTime', 'Feedback im Zeitverlauf') }}</h3>
        <div ref="timeChartContainer" class="chart">
          <canvas ref="timeChartCanvas"></canvas>
        </div>
      </div>
      
      <div class="chart-container">
        <h3>{{ t('admin.feedback.charts.feedbackDistribution', 'Feedback-Verteilung') }}</h3>
        <div ref="pieChartContainer" class="chart">
          <canvas ref="pieChartCanvas"></canvas>
        </div>
      </div>
    </div>
    
    <!-- Filters -->
    <div class="admin-feedback__filters">
      <div class="filter-section">
        <h3>{{ t('admin.feedback.filters.title', 'Filter und Suche') }}</h3>
        
        <div class="filter-controls">
          <div class="filter-group">
            <label for="date-from">{{ t('admin.feedback.filters.dateFrom', 'Von') }}</label>
            <input 
              type="date" 
              id="date-from" 
              v-model="dateFrom" 
              @change="applyFilters"
              class="date-input"
            />
          </div>
          
          <div class="filter-group">
            <label for="date-to">{{ t('admin.feedback.filters.dateTo', 'Bis') }}</label>
            <input 
              type="date" 
              id="date-to" 
              v-model="dateTo" 
              @change="applyFilters"
              class="date-input"
            />
          </div>
          
          <div class="filter-group">
            <label for="has-comment">{{ t('admin.feedback.filters.hasComment', 'Nur mit Kommentar') }}</label>
            <input 
              type="checkbox" 
              id="has-comment" 
              v-model="hasComment" 
              @change="applyFilters"
              class="checkbox-input"
            />
          </div>
          
          <div class="search-group">
            <input 
              type="text" 
              v-model="searchTerm" 
              @input="debounceSearch"
              placeholder="Suchbegriff..."
              class="search-input"
            />
            <button class="search-button" @click="applyFilters">
              <i class="fas fa-search"></i>
            </button>
          </div>
          
          <button class="reset-button" @click="resetFilters">
            <i class="fas fa-times"></i>
            {{ t('admin.feedback.filters.reset', 'Zurücksetzen') }}
          </button>
          
          <button class="export-button" @click="exportFeedback">
            <i class="fas fa-file-export"></i>
            {{ t('admin.feedback.export', 'Exportieren') }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Feedback Table -->
    <div class="admin-feedback__table-container">
      <table class="feedback-table" v-if="!loading && filteredFeedback.length > 0">
        <thead>
          <tr>
            <th>
              <span @click="sortBy('created_at')" class="sortable-header">
                {{ t('admin.feedback.table.date', 'Datum') }}
                <i :class="getSortIcon('created_at')"></i>
              </span>
            </th>
            <th>
              <span @click="sortBy('user_email')" class="sortable-header">
                {{ t('admin.feedback.table.user', 'Benutzer') }}
                <i :class="getSortIcon('user_email')"></i>
              </span>
            </th>
            <th>
              <span @click="sortBy('is_positive')" class="sortable-header">
                {{ t('admin.feedback.table.type', 'Typ') }}
                <i :class="getSortIcon('is_positive')"></i>
              </span>
            </th>
            <th>{{ t('admin.feedback.table.question', 'Frage') }}</th>
            <th>{{ t('admin.feedback.table.comment', 'Kommentar') }}</th>
            <th>{{ t('admin.feedback.table.actions', 'Aktionen') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(feedback, index) in paginatedFeedback" :key="feedback.id" :class="{'alt-row': index % 2 !== 0}">
            <td>{{ formatDate(feedback.created_at) }}</td>
            <td>{{ feedback.user_email }}</td>
            <td>
              <span :class="feedback.is_positive ? 'status-positive' : 'status-negative'">
                {{ feedback.is_positive ? 
                  t('admin.feedback.positive', 'Positiv') : 
                  t('admin.feedback.negative', 'Negativ') 
                }}
              </span>
            </td>
            <td>
              <div class="truncated-text" :title="feedback.question">
                {{ truncateText(feedback.question, 50) }}
              </div>
            </td>
            <td>
              <div v-if="feedback.comment" class="truncated-text" :title="feedback.comment">
                {{ truncateText(feedback.comment, 50) }}
              </div>
              <div v-else class="no-comment">
                {{ t('admin.feedback.noComment', 'Kein Kommentar') }}
              </div>
            </td>
            <td>
              <button class="action-button" @click="viewFeedback(feedback)">
                <i class="fas fa-eye"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-else-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>{{ t('admin.feedback.loading', 'Lade Feedback-Daten...') }}</p>
      </div>
      
      <div v-else class="empty-state">
        <i class="fas fa-comment-slash empty-icon"></i>
        <p>{{ t('admin.feedback.noFeedback', 'Keine Feedback-Einträge gefunden') }}</p>
        <button class="reset-button" @click="resetFilters">
          {{ t('admin.feedback.filters.reset', 'Filter zurücksetzen') }}
        </button>
      </div>
    </div>
    
    <!-- Pagination -->
    <div class="admin-feedback__pagination" v-if="totalPages > 1">
      <button 
        class="pagination-button" 
        @click="changePage(currentPage - 1)" 
        :disabled="currentPage === 1"
      >
        <i class="fas fa-chevron-left"></i>
      </button>
      
      <div class="pagination-info">
        {{ t('admin.feedback.pagination', 'Seite {current} von {total}', { 
          current: currentPage, 
          total: totalPages 
        }) }}
      </div>
      
      <button 
        class="pagination-button" 
        @click="changePage(currentPage + 1)" 
        :disabled="currentPage === totalPages"
      >
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
    
    <!-- Detail Modal -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="closeModal">
      <div class="detail-modal">
        <div class="modal-header">
          <h3>{{ t('admin.feedback.detailTitle', 'Feedback-Details') }}</h3>
          <button class="close-button" @click="closeModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-content">
          <div class="detail-section">
            <div class="detail-label">{{ t('admin.feedback.detail.status', 'Status') }}</div>
            <div class="detail-value">
              <span :class="selectedFeedback.is_positive ? 'status-positive' : 'status-negative'">
                {{ selectedFeedback.is_positive ? 
                  t('admin.feedback.positive', 'Positiv') : 
                  t('admin.feedback.negative', 'Negativ') 
                }}
              </span>
            </div>
          </div>
          
          <div class="detail-section">
            <div class="detail-label">{{ t('admin.feedback.detail.date', 'Datum') }}</div>
            <div class="detail-value">{{ formatDate(selectedFeedback.created_at, true) }}</div>
          </div>
          
          <div class="detail-section">
            <div class="detail-label">{{ t('admin.feedback.detail.user', 'Benutzer') }}</div>
            <div class="detail-value">{{ selectedFeedback.user_email }}</div>
          </div>
          
          <div class="detail-section">
            <div class="detail-label">{{ t('admin.feedback.detail.question', 'Frage') }}</div>
            <div class="detail-value detail-text">{{ selectedFeedback.question }}</div>
          </div>
          
          <div class="detail-section">
            <div class="detail-label">{{ t('admin.feedback.detail.answer', 'Antwort') }}</div>
            <div class="detail-value detail-text">{{ selectedFeedback.answer }}</div>
          </div>
          
          <div class="detail-section" v-if="selectedFeedback.comment">
            <div class="detail-label">{{ t('admin.feedback.detail.comment', 'Kommentar') }}</div>
            <div class="detail-value detail-text">{{ selectedFeedback.comment }}</div>
          </div>
          
          <div class="detail-section">
            <div class="detail-label">{{ t('admin.feedback.detail.sessionId', 'Sitzungs-ID') }}</div>
            <div class="detail-value">{{ selectedFeedback.session_id }}</div>
          </div>
          
          <div class="detail-section">
            <div class="detail-label">{{ t('admin.feedback.detail.messageId', 'Nachrichten-ID') }}</div>
            <div class="detail-value">{{ selectedFeedback.message_id }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useAdminFeedbackStore } from '@/stores/admin/feedback';
import type { FeedbackEntry, FeedbackFilter } from '@/types/admin';

// i18n
const { t } = useI18n();

// Store
const feedbackStore = useAdminFeedbackStore();
const { stats, negativeFeedback, filter, loading } = storeToRefs(feedbackStore);

// Local state for filtering
const dateFrom = ref('');
const dateTo = ref('');
const hasComment = ref<boolean | undefined>(undefined);
const searchTerm = ref('');
const currentPage = ref(1);
const itemsPerPage = ref(10);
const sortField = ref('created_at');
const sortDirection = ref<'asc' | 'desc'>('desc');
const debounceTimeout = ref<number | null>(null);

// Local state for detail view
const showDetailModal = ref(false);
const selectedFeedback = ref<FeedbackEntry>({
  id: '',
  message_id: '',
  session_id: '',
  user_id: '',
  user_email: '',
  is_positive: false,
  comment: null,
  question: '',
  answer: '',
  created_at: 0
});

// Chart references
const timeChartContainer = ref<HTMLElement | null>(null);
const timeChartCanvas = ref<HTMLCanvasElement | null>(null);
const pieChartContainer = ref<HTMLElement | null>(null);
const pieChartCanvas = ref<HTMLCanvasElement | null>(null);

// Chart instances
const timeChart = ref<any>(null);
const pieChart = ref<any>(null);

// Computed properties
const filteredFeedback = computed(() => {
  return feedbackStore.filteredFeedback;
});

const totalPages = computed(() => {
  return Math.ceil(filteredFeedback.value.length / itemsPerPage.value);
});

const paginatedFeedback = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  
  let sorted = [...filteredFeedback.value];
  
  // Sort based on current sort field and direction
  sorted.sort((a, b) => {
    let comparison = 0;
    
    switch (sortField.value) {
      case 'created_at':
        comparison = a.created_at - b.created_at;
        break;
      case 'user_email':
        comparison = a.user_email.localeCompare(b.user_email);
        break;
      case 'is_positive':
        comparison = Number(a.is_positive) - Number(b.is_positive);
        break;
      default:
        comparison = 0;
    }
    
    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
  
  return sorted.slice(start, end);
});

// Functions
function applyFilters() {
  // Convert date strings to timestamps
  let fromTimestamp: number | undefined;
  let toTimestamp: number | undefined;
  
  if (dateFrom.value) {
    fromTimestamp = new Date(dateFrom.value).getTime();
  }
  
  if (dateTo.value) {
    // Set to end of day
    const date = new Date(dateTo.value);
    date.setHours(23, 59, 59, 999);
    toTimestamp = date.getTime();
  }
  
  // Apply filters to store
  feedbackStore.setFilter({
    dateFrom: fromTimestamp,
    dateTo: toTimestamp,
    hasComment: hasComment.value,
    searchTerm: searchTerm.value || undefined
  });
  
  // Reset to first page when applying filters
  currentPage.value = 1;
  
  // Update charts after filter change
  nextTick(() => {
    updateCharts();
  });
}

function resetFilters() {
  dateFrom.value = '';
  dateTo.value = '';
  hasComment.value = undefined;
  searchTerm.value = '';
  
  feedbackStore.resetFilter();
  currentPage.value = 1;
  
  // Update charts after filter reset
  nextTick(() => {
    updateCharts();
  });
}

function debounceSearch() {
  if (debounceTimeout.value) {
    clearTimeout(debounceTimeout.value);
  }
  
  debounceTimeout.value = window.setTimeout(() => {
    applyFilters();
  }, 300);
}

function changePage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
}

function sortBy(field: string) {
  // If already sorting by this field, toggle direction
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    // Otherwise, sort by this field in ascending order
    sortField.value = field;
    sortDirection.value = 'asc';
  }
}

function getSortIcon(field: string) {
  if (sortField.value !== field) {
    return 'fas fa-sort';
  }
  
  return sortDirection.value === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
}

function viewFeedback(feedback: FeedbackEntry) {
  selectedFeedback.value = { ...feedback };
  showDetailModal.value = true;
}

function closeModal() {
  showDetailModal.value = false;
}

function formatDate(timestamp: number, includeTime: boolean = false) {
  const date = new Date(timestamp);
  
  if (includeTime) {
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength) + '...';
}

function exportFeedback() {
  // Create CSV content
  const headers = [
    'Datum',
    'Benutzer',
    'Typ',
    'Frage',
    'Antwort',
    'Kommentar',
    'Sitzungs-ID',
    'Nachrichten-ID'
  ];
  
  const csvRows = [
    headers.join(',')
  ];
  
  // Add data rows
  filteredFeedback.value.forEach(feedback => {
    const row = [
      `"${formatDate(feedback.created_at, true)}"`,
      `"${feedback.user_email}"`,
      `"${feedback.is_positive ? 'Positiv' : 'Negativ'}"`,
      `"${feedback.question.replace(/"/g, '""')}"`,
      `"${feedback.answer.replace(/"/g, '""')}"`,
      `"${feedback.comment ? feedback.comment.replace(/"/g, '""') : ''}"`,
      `"${feedback.session_id}"`,
      `"${feedback.message_id}"`
    ];
    
    csvRows.push(row.join(','));
  });
  
  const csvContent = csvRows.join('\n');
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', `feedback-export-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Mock Chart.js implementation for testing
function initCharts() {
  // This would normally import Chart.js dynamically
  const mockChartJS = {
    Chart: class MockChart {
      constructor(ctx: CanvasRenderingContext2D, config: any) {
        console.log('Creating chart with config:', config);
      }
      
      update() {
        console.log('Updating chart');
      }
      
      destroy() {
        console.log('Destroying chart');
      }
    }
  };
  
  return mockChartJS;
}

function updateCharts() {
  const Chart = initCharts();
  
  // Time series chart
  if (timeChartCanvas.value && timeChartContainer.value) {
    const ctx = timeChartCanvas.value.getContext('2d');
    
    if (ctx) {
      // Prepare data for time series chart
      const feedbackByDay = stats.value.feedback_by_day || [];
      
      // Destroy previous chart if it exists
      if (timeChart.value) {
        timeChart.value.destroy();
      }
      
      // Create new chart
      timeChart.value = new Chart.Chart(ctx, {
        type: 'line',
        data: {
          labels: feedbackByDay.map(day => day.date),
          datasets: [
            {
              label: t('admin.feedback.charts.positive', 'Positiv'),
              data: feedbackByDay.map(day => day.positive),
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1,
              tension: 0.1
            },
            {
              label: t('admin.feedback.charts.negative', 'Negativ'),
              data: feedbackByDay.map(day => day.negative),
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 1,
              tension: 0.1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: t('admin.feedback.charts.feedbackOverTime', 'Feedback im Zeitverlauf')
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: t('admin.feedback.charts.count', 'Anzahl')
              }
            },
            x: {
              title: {
                display: true,
                text: t('admin.feedback.charts.date', 'Datum')
              }
            }
          }
        }
      });
    }
  }
  
  // Pie chart
  if (pieChartCanvas.value && pieChartContainer.value) {
    const ctx = pieChartCanvas.value.getContext('2d');
    
    if (ctx) {
      // Destroy previous chart if it exists
      if (pieChart.value) {
        pieChart.value.destroy();
      }
      
      // Create new chart
      pieChart.value = new Chart.Chart(ctx, {
        type: 'pie',
        data: {
          labels: [
            t('admin.feedback.charts.positive', 'Positiv'),
            t('admin.feedback.charts.negative', 'Negativ')
          ],
          datasets: [{
            data: [stats.value.positive, stats.value.negative],
            backgroundColor: [
              'rgba(75, 192, 192, 0.7)',
              'rgba(255, 99, 132, 0.7)'
            ],
            borderColor: [
              'rgba(75, 192, 192, 1)',
              'rgba(255, 99, 132, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: t('admin.feedback.charts.feedbackDistribution', 'Feedback-Verteilung')
            }
          }
        }
      });
    }
  }
}

// Lifecycle hooks
onMounted(async () => {
  // Load initial data if not already loaded
  if (!negativeFeedback.value.length || !stats.value.total) {
    await Promise.all([
      feedbackStore.fetchStats(),
      feedbackStore.fetchNegativeFeedback()
    ]);
  }
  
  // Initialize charts after data is loaded
  nextTick(() => {
    updateCharts();
  });
  
  // Add resize handler for charts
  window.addEventListener('resize', handleResize);
});

function handleResize() {
  if (timeChart.value) {
    timeChart.value.update();
  }
  
  if (pieChart.value) {
    pieChart.value.update();
  }
}

// Clean up
onUnmounted(() => {
  // Clean up charts
  if (timeChart.value) {
    timeChart.value.destroy();
  }
  
  if (pieChart.value) {
    pieChart.value.destroy();
  }
  
  // Remove resize handler
  window.removeEventListener('resize', handleResize);
  
  // Clear debounce timeout
  if (debounceTimeout.value) {
    clearTimeout(debounceTimeout.value);
  }
});
</script>

<style scoped>
.admin-feedback {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.admin-feedback__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

/* Statistics Cards */
.admin-feedback__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.stats-card {
  display: flex;
  align-items: center;
  padding: 1.25rem;
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background-alt);
  border-left: 4px solid var(--n-color-primary);
}

.stats-card--total {
  border-left-color: var(--n-color-primary);
}

.stats-card--positive {
  border-left-color: var(--n-color-success);
}

.stats-card--negative {
  border-left-color: var(--n-color-error);
}

.stats-card--comments {
  border-left-color: var(--n-color-warning);
}

.stats-card--rate {
  border-left-color: var(--n-color-info);
}

.stats-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: rgba(var(--n-color-primary-rgb), 0.1);
  color: var(--n-color-primary);
  font-size: 1.25rem;
  margin-right: 1rem;
}

.stats-card--total .stats-card__icon {
  background-color: rgba(var(--n-color-primary-rgb), 0.1);
  color: var(--n-color-primary);
}

.stats-card--positive .stats-card__icon {
  background-color: rgba(var(--n-color-success-rgb), 0.1);
  color: var(--n-color-success);
}

.stats-card--negative .stats-card__icon {
  background-color: rgba(var(--n-color-error-rgb), 0.1);
  color: var(--n-color-error);
}

.stats-card--comments .stats-card__icon {
  background-color: rgba(var(--n-color-warning-rgb), 0.1);
  color: var(--n-color-warning);
}

.stats-card--rate .stats-card__icon {
  background-color: rgba(var(--n-color-info-rgb), 0.1);
  color: var(--n-color-info);
}

.stats-card__value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--n-color-text-primary);
}

.stats-card__label {
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

/* Charts */
.admin-feedback__charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.chart-container {
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1rem;
  height: 300px;
}

.chart-container h3 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.chart {
  height: calc(100% - 2rem);
  position: relative;
}

/* Filters */
.admin-feedback__filters {
  margin-bottom: 1rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1rem;
}

.filter-section h3 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.filter-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-group label {
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

.date-input {
  padding: 0.5rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius-sm);
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
}

.checkbox-input {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}

.search-group {
  flex-grow: 1;
  display: flex;
  position: relative;
}

.search-input {
  flex-grow: 1;
  padding: 0.5rem 2.5rem 0.5rem 0.75rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius-sm);
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
}

.search-button {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--n-color-text-secondary);
  cursor: pointer;
}

.reset-button,
.export-button {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius-sm);
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background-color 0.2s;
}

.reset-button:hover,
.export-button:hover {
  background-color: var(--n-color-hover);
}

.export-button {
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
  border-color: var(--n-color-primary);
}

.export-button:hover {
  background-color: var(--n-color-primary-dark);
}

/* Table */
.admin-feedback__table-container {
  overflow-x: auto;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
}

.feedback-table {
  width: 100%;
  border-collapse: collapse;
}

.feedback-table thead th {
  background-color: var(--n-color-background-alt);
  color: var(--n-color-text-primary);
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1;
}

.sortable-header {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.sortable-header i {
  margin-left: 0.5rem;
  font-size: 0.75rem;
}

.feedback-table tbody td {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--n-color-border-light);
  color: var(--n-color-text-primary);
}

.alt-row {
  background-color: rgba(var(--n-color-background-rgb), 0.5);
}

.truncated-text {
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-comment {
  font-style: italic;
  color: var(--n-color-text-tertiary);
}

.status-positive {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  background-color: rgba(var(--n-color-success-rgb), 0.1);
  color: var(--n-color-success);
  font-size: 0.75rem;
  font-weight: 500;
}

.status-negative {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  background-color: rgba(var(--n-color-error-rgb), 0.1);
  color: var(--n-color-error);
  font-size: 0.75rem;
  font-weight: 500;
}

.action-button {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-button:hover {
  background-color: var(--n-color-hover);
}

/* Loading and Empty State */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--n-color-text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(var(--n-color-primary-rgb), 0.1);
  border-radius: 50%;
  border-top-color: var(--n-color-primary);
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--n-color-text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

/* Pagination */
.admin-feedback__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}

.pagination-button {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--n-border-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--n-color-border);
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  cursor: pointer;
  transition: background-color 0.2s;
}

.pagination-button:hover:not(:disabled) {
  background-color: var(--n-color-hover);
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

/* Modal */
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
}

.detail-modal {
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  background-color: var(--n-color-background);
  border-radius: var(--n-border-radius);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--n-color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.close-button {
  background: none;
  border: none;
  color: var(--n-color-text-secondary);
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.close-button:hover {
  background-color: var(--n-color-hover);
}

.modal-content {
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--n-color-text-secondary);
}

.detail-value {
  color: var(--n-color-text-primary);
}

.detail-text {
  white-space: pre-wrap;
  line-height: 1.5;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .admin-feedback__charts {
    grid-template-columns: 1fr;
  }
  
  .filter-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-group {
    width: 100%;
  }
  
  .search-group {
    width: 100%;
  }
  
  .reset-button,
  .export-button {
    width: 100%;
    justify-content: center;
  }
  
  .detail-modal {
    width: 95%;
    max-height: 95vh;
  }
}
</style>