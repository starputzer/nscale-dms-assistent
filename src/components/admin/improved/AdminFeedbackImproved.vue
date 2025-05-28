<template>
  <div class="admin-feedback">
    <div class="admin-feedback__header">
      <h2 class="admin-feedback__title">Feedback-Verwaltung</h2>
      <button @click="refreshData" class="admin-btn admin-btn--primary">
        <i class="fas fa-sync-alt" v-if="!isLoading"></i>
        <i class="fas fa-spinner fa-spin" v-else></i>
        Aktualisieren
      </button>
    </div>

    <!-- Feedback Statistics -->
    <div class="feedback-stats">
      <div class="stat-box">
        <i class="fas fa-comments stat-box__icon"></i>
        <div class="stat-box__content">
          <div class="stat-box__value">{{ stats.total }}</div>
          <div class="stat-box__label">Gesamt</div>
        </div>
      </div>
      <div class="stat-box">
        <i class="fas fa-thumbs-up stat-box__icon stat-box__icon--success"></i>
        <div class="stat-box__content">
          <div class="stat-box__value">{{ stats.positive }}</div>
          <div class="stat-box__label">Positiv</div>
        </div>
      </div>
      <div class="stat-box">
        <i class="fas fa-thumbs-down stat-box__icon stat-box__icon--danger"></i>
        <div class="stat-box__content">
          <div class="stat-box__value">{{ stats.negative }}</div>
          <div class="stat-box__label">Negativ</div>
        </div>
      </div>
      <div class="stat-box">
        <i class="fas fa-percentage stat-box__icon stat-box__icon--info"></i>
        <div class="stat-box__content">
          <div class="stat-box__value">{{ stats.positive_percent }}%</div>
          <div class="stat-box__label">Zufriedenheit</div>
        </div>
      </div>
    </div>

    <!-- Feedback Charts -->
    <div class="feedback-charts">
      <div class="chart-container">
        <h3>Feedback-Verlauf (7 Tage)</h3>
        <canvas ref="trendChart"></canvas>
      </div>
      <div class="chart-container">
        <h3>Feedback-Verteilung</h3>
        <canvas ref="typeChart"></canvas>
      </div>
    </div>

    <!-- Feedback Table -->
    <div class="feedback-table-container" v-if="!isLoading">
      <div class="feedback-filters">
        <div class="filter-group">
          <label>Zeitraum</label>
          <select
            v-model="filters.dateRange"
            @change="applyFilters"
            class="form-control"
          >
            <option value="all">Alle</option>
            <option value="today">Heute</option>
            <option value="week">Diese Woche</option>
            <option value="month">Dieser Monat</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Typ</label>
          <select
            v-model="filters.type"
            @change="applyFilters"
            class="form-control"
          >
            <option value="all">Alle</option>
            <option value="positive">Positiv</option>
            <option value="negative">Negativ</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Status</label>
          <select
            v-model="filters.status"
            @change="applyFilters"
            class="form-control"
          >
            <option value="all">Alle</option>
            <option value="resolved">Bearbeitet</option>
            <option value="unresolved">Unbearbeitet</option>
          </select>
        </div>
        <div class="search-box">
          <i class="fas fa-search search-box__icon"></i>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Feedback durchsuchen..."
            class="search-box__input"
          />
        </div>
      </div>

      <table class="feedback-table" v-if="filteredFeedback.length > 0">
        <thead>
          <tr>
            <th @click="sort('created_at')" class="sortable">
              Datum
              <i :class="getSortIcon('created_at')"></i>
            </th>
            <th @click="sort('user_email')" class="sortable">
              Benutzer
              <i :class="getSortIcon('user_email')"></i>
            </th>
            <th @click="sort('is_positive')" class="sortable">
              Typ
              <i :class="getSortIcon('is_positive')"></i>
            </th>
            <th>Frage</th>
            <th>Kommentar</th>
            <th @click="sort('status')" class="sortable">
              Status
              <i :class="getSortIcon('status')"></i>
            </th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="feedback in paginatedFeedback" :key="feedback.id">
            <td>{{ formatDate(feedback.created_at) }}</td>
            <td>{{ feedback.user_email }}</td>
            <td>
              <span
                :class="[
                  'type-badge',
                  feedback.is_positive
                    ? 'type-badge--positive'
                    : 'type-badge--negative',
                ]"
              >
                <i
                  :class="
                    feedback.is_positive
                      ? 'fas fa-thumbs-up'
                      : 'fas fa-thumbs-down'
                  "
                ></i>
                {{ feedback.is_positive ? "Positiv" : "Negativ" }}
              </span>
            </td>
            <td class="truncate">{{ feedback.question }}</td>
            <td class="truncate">{{ feedback.comment || "-" }}</td>
            <td>
              <span
                :class="['status-badge', `status-badge--${feedback.status}`]"
              >
                {{
                  feedback.status === "resolved" ? "Bearbeitet" : "Unbearbeitet"
                }}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button
                  @click="viewFeedback(feedback)"
                  class="admin-btn admin-btn--sm admin-btn--primary"
                  title="Details anzeigen"
                >
                  <i class="fas fa-eye"></i>
                </button>
                <button
                  v-if="feedback.status !== 'resolved'"
                  @click="markAsResolved(feedback)"
                  class="admin-btn admin-btn--sm admin-btn--success"
                  title="Als bearbeitet markieren"
                >
                  <i class="fas fa-check"></i>
                </button>
                <button
                  @click="confirmDelete(feedback)"
                  class="admin-btn admin-btn--sm admin-btn--danger"
                  title="Löschen"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty-state">
        <i class="fas fa-comments empty-state__icon"></i>
        <p>Kein Feedback gefunden</p>
      </div>

      <!-- Pagination -->
      <div class="pagination" v-if="totalPages > 1">
        <button
          @click="currentPage--"
          :disabled="currentPage === 1"
          class="admin-btn admin-btn--sm"
        >
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="pagination__info">
          Seite {{ currentPage }} von {{ totalPages }}
        </span>
        <button
          @click="currentPage++"
          :disabled="currentPage === totalPages"
          class="admin-btn admin-btn--sm"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="loading-state">
      <i class="fas fa-spinner fa-spin loading-state__icon"></i>
      <p>Lade Feedback-Daten...</p>
    </div>

    <!-- Feedback Detail Modal -->
    <div
      v-if="selectedFeedback"
      class="modal-overlay"
      @click="selectedFeedback = null"
    >
      <div class="modal modal--large" @click.stop>
        <div class="modal__header">
          <h3>Feedback-Details</h3>
          <button @click="selectedFeedback = null" class="modal__close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal__body">
          <div class="feedback-detail">
            <div class="detail-row">
              <strong>Benutzer:</strong>
              <span>{{ selectedFeedback.user_email }}</span>
            </div>
            <div class="detail-row">
              <strong>Datum:</strong>
              <span>{{ formatDate(selectedFeedback.created_at, true) }}</span>
            </div>
            <div class="detail-row">
              <strong>Typ:</strong>
              <span
                :class="[
                  'type-badge',
                  selectedFeedback.is_positive
                    ? 'type-badge--positive'
                    : 'type-badge--negative',
                ]"
              >
                <i
                  :class="
                    selectedFeedback.is_positive
                      ? 'fas fa-thumbs-up'
                      : 'fas fa-thumbs-down'
                  "
                ></i>
                {{ selectedFeedback.is_positive ? "Positiv" : "Negativ" }}
              </span>
            </div>
            <div class="detail-row">
              <strong>Status:</strong>
              <span
                :class="[
                  'status-badge',
                  `status-badge--${selectedFeedback.status}`,
                ]"
              >
                {{
                  selectedFeedback.status === "resolved"
                    ? "Bearbeitet"
                    : "Unbearbeitet"
                }}
              </span>
            </div>
            <div class="detail-section">
              <strong>Frage:</strong>
              <p>{{ selectedFeedback.question }}</p>
            </div>
            <div class="detail-section">
              <strong>Antwort:</strong>
              <p>{{ selectedFeedback.answer || "Keine Antwort verfügbar" }}</p>
            </div>
            <div class="detail-section" v-if="selectedFeedback.comment">
              <strong>Kommentar:</strong>
              <p>{{ selectedFeedback.comment }}</p>
            </div>
            <div class="detail-section" v-if="selectedFeedback.session_id">
              <strong>Session ID:</strong>
              <code>{{ selectedFeedback.session_id }}</code>
            </div>
          </div>
        </div>
        <div class="modal__footer">
          <button
            v-if="selectedFeedback.status !== 'resolved'"
            @click="markAsResolved(selectedFeedback)"
            class="admin-btn admin-btn--success"
          >
            Als bearbeitet markieren
          </button>
          <button
            @click="selectedFeedback = null"
            class="admin-btn admin-btn--secondary"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="feedbackToDelete"
      class="modal-overlay"
      @click="feedbackToDelete = null"
    >
      <div class="modal modal--small" @click.stop>
        <div class="modal__header">
          <h3>Feedback löschen</h3>
          <button @click="feedbackToDelete = null" class="modal__close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal__body">
          <p>Möchten Sie dieses Feedback wirklich löschen?</p>
          <p class="text-danger">
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
        </div>
        <div class="modal__footer">
          <button
            @click="feedbackToDelete = null"
            class="admin-btn admin-btn--secondary"
          >
            Abbrechen
          </button>
          <button @click="deleteFeedback" class="admin-btn admin-btn--danger">
            Löschen bestätigen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { Chart } from "chart.js/auto";
import { useAdminFeedbackStore } from "@/stores/admin/feedback";
import type { FeedbackEntry } from "@/types/admin";

// Emits
const emit = defineEmits<{
  error: [error: any];
}>();

// Store
const feedbackStore = useAdminFeedbackStore();
const { negativeFeedback, stats, loading } = storeToRefs(feedbackStore);

// State
const isLoading = ref(false);
const searchQuery = ref("");
const sortBy = ref<keyof FeedbackEntry>("created_at");
const sortOrder = ref<"asc" | "desc">("desc");
const currentPage = ref(1);
const itemsPerPage = 10;
const selectedFeedback = ref<FeedbackEntry | null>(null);
const feedbackToDelete = ref<FeedbackEntry | null>(null);

// Filter state
const filters = ref({
  dateRange: "all",
  type: "all",
  status: "all",
});

// Chart refs
const trendChart = ref<HTMLCanvasElement>();
const typeChart = ref<HTMLCanvasElement>();
let trendChartInstance: Chart | null = null;
let typeChartInstance: Chart | null = null;

// Computed
const filteredFeedback = computed(() => {
  let result = [...(negativeFeedback.value || [])];

  // Date range filter
  if (filters.value.dateRange !== "all") {
    const now = new Date();
    let startDate: Date;

    switch (filters.value.dateRange) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = new Date(0);
    }

    result = result.filter((f) => new Date(f.created_at) >= startDate);
  }

  // Type filter
  if (filters.value.type !== "all") {
    result = result.filter((f) =>
      filters.value.type === "positive" ? f.is_positive : !f.is_positive,
    );
  }

  // Status filter
  if (filters.value.status !== "all") {
    result = result.filter((f) => f.status === filters.value.status);
  }

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (f) =>
        f.user_email.toLowerCase().includes(query) ||
        f.question.toLowerCase().includes(query) ||
        (f.comment && f.comment.toLowerCase().includes(query)),
    );
  }

  // Sorting
  result.sort((a, b) => {
    const aVal = a[sortBy.value];
    const bVal = b[sortBy.value];

    if (sortOrder.value === "asc") {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  return result;
});

const totalPages = computed(() =>
  Math.ceil(filteredFeedback.value.length / itemsPerPage),
);

const paginatedFeedback = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredFeedback.value.slice(start, end);
});

// Methods
const refreshData = async () => {
  isLoading.value = true;
  try {
    await feedbackStore.fetchStats();
    await feedbackStore.fetchNegativeFeedback();
    updateCharts();
  } catch (error) {
    emit("error", error);
  } finally {
    isLoading.value = false;
  }
};

const formatDate = (
  timestamp: number | string,
  includeTime = false,
): string => {
  if (!timestamp) return "";

  try {
    let date: Date;

    if (typeof timestamp === "string") {
      date = new Date(timestamp);
    } else {
      // Assume UNIX timestamp in seconds
      date = new Date(timestamp * 1000);
    }

    if (isNaN(date.getTime())) {
      console.warn("Invalid date timestamp:", timestamp);
      return "";
    }

    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };

    if (includeTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
    }

    return new Intl.DateTimeFormat("de-DE", options).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

const sort = (field: keyof FeedbackEntry) => {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = field;
    sortOrder.value = "desc";
  }
  currentPage.value = 1;
};

const getSortIcon = (field: string) => {
  if (sortBy.value !== field) return "fas fa-sort";
  return sortOrder.value === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
};

const applyFilters = () => {
  currentPage.value = 1;
  updateCharts();
};

const viewFeedback = (feedback: FeedbackEntry) => {
  selectedFeedback.value = feedback;
};

const markAsResolved = async (feedback: FeedbackEntry) => {
  try {
    await feedbackStore.updateFeedbackStatus(feedback.id, "resolved");
    if (selectedFeedback.value?.id === feedback.id) {
      selectedFeedback.value = null;
    }
  } catch (error) {
    emit("error", error);
  }
};

const confirmDelete = (feedback: FeedbackEntry) => {
  feedbackToDelete.value = feedback;
};

const deleteFeedback = async () => {
  if (!feedbackToDelete.value) return;

  try {
    await feedbackStore.deleteFeedback(feedbackToDelete.value.id);
    feedbackToDelete.value = null;
  } catch (error) {
    emit("error", error);
  }
};

const updateCharts = () => {
  // Update trend chart
  if (trendChart.value) {
    const ctx = trendChart.value.getContext("2d");
    if (ctx) {
      if (trendChartInstance) {
        trendChartInstance.destroy();
      }

      const labels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
      const positiveData = [12, 15, 18, 16, 20, 14, 15];
      const negativeData = [3, 2, 4, 3, 3, 2, 3];

      trendChartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Positiv",
              data: positiveData,
              borderColor: "rgb(75, 192, 192)",
              backgroundColor: "rgba(75, 192, 192, 0.2)",
              tension: 0.1,
            },
            {
              label: "Negativ",
              data: negativeData,
              borderColor: "rgb(255, 99, 132)",
              backgroundColor: "rgba(255, 99, 132, 0.2)",
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  }

  // Update type chart
  if (typeChart.value) {
    const ctx = typeChart.value.getContext("2d");
    if (ctx) {
      if (typeChartInstance) {
        typeChartInstance.destroy();
      }

      typeChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Positiv", "Negativ"],
          datasets: [
            {
              data: [stats.value.positive, stats.value.negative],
              backgroundColor: ["rgb(75, 192, 192)", "rgb(255, 99, 132)"],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      });
    }
  }
};

// Lifecycle
onMounted(() => {
  refreshData();
});

onUnmounted(() => {
  if (trendChartInstance) {
    trendChartInstance.destroy();
  }
  if (typeChartInstance) {
    typeChartInstance.destroy();
  }
});

// Watch for page changes
watch(currentPage, () => {
  window.scrollTo(0, 0);
});
</script>

<style lang="scss" scoped>
.admin-feedback {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  &__title {
    font-size: 24px;
    font-weight: 600;
    margin: 0;
  }
}

// Statistics
.feedback-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-box {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 4px var(--shadow);

  &__icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    background: var(--bg-tertiary);
    color: var(--accent-primary);

    &--success {
      color: var(--accent-success);
    }

    &--danger {
      color: var(--accent-danger);
    }

    &--info {
      color: var(--accent-info);
    }
  }

  &__content {
    flex: 1;
  }

  &__value {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  &__label {
    font-size: 14px;
    color: var(--text-secondary);
  }
}

// Charts
.feedback-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.chart-container {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px var(--shadow);

  h3 {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 16px 0;
  }

  canvas {
    height: 300px !important;
  }
}

// Table
.feedback-table-container {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px var(--shadow);
}

.feedback-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.filter-group {
  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    font-size: 14px;
  }
}

.search-box {
  position: relative;
  grid-column: span 2;

  &__icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
  }

  &__input {
    width: 100%;
    padding: 8px 16px 8px 36px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);

    &:focus {
      outline: none;
      border-color: var(--accent-primary);
    }
  }
}

.feedback-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }

  th {
    font-weight: 600;
    color: var(--text-secondary);

    &.sortable {
      cursor: pointer;
      user-select: none;

      &:hover {
        color: var(--text-primary);
      }

      i {
        margin-left: 8px;
        font-size: 12px;
      }
    }
  }

  tr {
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--bg-tertiary);
    }
  }

  .truncate {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

// Badges
.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;

  &--positive {
    background-color: rgba(75, 192, 192, 0.2);
    color: rgb(75, 192, 192);
  }

  &--negative {
    background-color: rgba(255, 99, 132, 0.2);
    color: rgb(255, 99, 132);
  }
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;

  &--resolved {
    background-color: rgba(75, 192, 192, 0.2);
    color: rgb(75, 192, 192);
  }

  &--unresolved {
    background-color: rgba(255, 193, 7, 0.2);
    color: rgb(255, 193, 7);
  }
}

// Feedback detail
.feedback-detail {
  .detail-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;

    strong {
      min-width: 120px;
    }
  }

  .detail-section {
    margin-bottom: 20px;

    strong {
      display: block;
      margin-bottom: 8px;
    }

    p {
      margin: 0;
      line-height: 1.6;
    }

    code {
      background: var(--bg-tertiary);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
    }
  }
}

// Common styles
.admin-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &--primary {
    background-color: var(--accent-primary);
    color: white;

    &:hover:not(:disabled) {
      background-color: darken($color: #4a90e2, $amount: 10%);
    }
  }

  &--success {
    background-color: var(--accent-success);
    color: white;

    &:hover:not(:disabled) {
      background-color: darken($color: #52c41a, $amount: 10%);
    }
  }

  &--danger {
    background-color: var(--accent-danger);
    color: white;

    &:hover:not(:disabled) {
      background-color: darken($color: #f5222d, $amount: 10%);
    }
  }

  &--secondary {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);

    &:hover:not(:disabled) {
      background-color: var(--bg-primary);
    }
  }

  &--sm {
    padding: 4px 8px;
    font-size: 13px;
  }
}

.action-buttons {
  display: flex;
  gap: 8px;
}

// States
.empty-state,
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);

  &__icon {
    font-size: 48px;
    margin-bottom: 16px;
    color: var(--text-secondary);
  }

  p {
    font-size: 16px;
    margin: 0;
  }
}

// Pagination
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 20px;

  &__info {
    font-size: 14px;
    color: var(--text-secondary);
  }
}

// Forms
.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
  }
}

// Modals
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

.modal {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 8px 16px var(--shadow);

  &--small {
    max-width: 400px;
  }

  &--large {
    max-width: 700px;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid var(--border);

    h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }
  }

  &__close {
    width: 32px;
    height: 32px;
    border: none;
    background: none;
    color: var(--text-secondary);
    font-size: 20px;
    cursor: pointer;
    transition: color 0.3s ease;

    &:hover {
      color: var(--text-primary);
    }
  }

  &__body {
    padding: 20px;
  }

  &__footer {
    padding: 20px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}

// Utilities
.text-danger {
  color: var(--accent-danger);
}
</style>
