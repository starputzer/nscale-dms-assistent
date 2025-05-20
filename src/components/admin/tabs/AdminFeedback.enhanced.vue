<template>
  <div class="admin-feedback">
    <div class="admin-feedback__header">
      <h2 class="admin-feedback__title">
        {{ t("admin.feedback.title", "Feedback-Übersicht") }}
      </h2>
      <div class="admin-feedback__actions">
        <div v-if="apiIntegrationEnabled" class="api-status-indicator">
          <span class="api-status-badge">
            <i class="fas fa-cloud"></i>
            {{ t("admin.feedback.apiEnabled", "API-Modus aktiv") }}
          </span>
        </div>
        <button class="btn btn-primary" @click="refreshData">
          <i class="fas fa-sync-alt"></i>
          {{ t("admin.feedback.refresh", "Aktualisieren") }}
        </button>
      </div>
    </div>

    <!-- Summary Statistics -->
    <div class="admin-feedback__stats">
      <div class="stats-card stats-card--total">
        <div class="stats-card__icon">
          <i class="fas fa-comments"></i>
        </div>
        <div class="stats-card__content">
          <div class="stats-card__value">{{ stats.total }}</div>
          <div class="stats-card__label">
            {{ t("admin.feedback.stats.total", "Gesamt") }}
          </div>
        </div>
      </div>

      <div class="stats-card stats-card--positive">
        <div class="stats-card__icon">
          <i class="fas fa-thumbs-up"></i>
        </div>
        <div class="stats-card__content">
          <div class="stats-card__value">{{ stats.positive }}</div>
          <div class="stats-card__label">
            {{ t("admin.feedback.stats.positive", "Positiv") }}
          </div>
        </div>
      </div>

      <div class="stats-card stats-card--negative">
        <div class="stats-card__icon">
          <i class="fas fa-thumbs-down"></i>
        </div>
        <div class="stats-card__content">
          <div class="stats-card__value">{{ stats.negative }}</div>
          <div class="stats-card__label">
            {{ t("admin.feedback.stats.negative", "Negativ") }}
          </div>
        </div>
      </div>

      <div class="stats-card stats-card--unresolved">
        <div class="stats-card__icon">
          <i class="fas fa-exclamation-circle"></i>
        </div>
        <div class="stats-card__content">
          <div class="stats-card__value">{{ stats.unresolved }}</div>
          <div class="stats-card__label">
            {{ t("admin.feedback.stats.unresolved", "Unbearbeitet") }}
          </div>
        </div>
      </div>

      <div class="stats-card stats-card--rate">
        <div class="stats-card__icon">
          <i class="fas fa-chart-line"></i>
        </div>
        <div class="stats-card__content">
          <div class="stats-card__value">{{ stats.positive_percent }}%</div>
          <div class="stats-card__label">
            {{ t("admin.feedback.stats.positiveRate", "Positive Quote") }}
          </div>
        </div>
      </div>
    </div>

    <!-- Data Visualization -->
    <div class="admin-feedback__charts" v-if="showCharts">
      <div class="chart-container">
        <h3>
          {{
            t(
              "admin.feedback.charts.feedbackOverTime",
              "Feedback im Zeitverlauf",
            )
          }}
        </h3>
        <div class="chart">
          <canvas ref="timeChartCanvas"></canvas>
        </div>
      </div>

      <div class="chart-container">
        <h3>
          {{ t("admin.feedback.charts.feedbackByType", "Feedback nach Typ") }}
        </h3>
        <div class="chart">
          <canvas ref="pieChartCanvas"></canvas>
        </div>
      </div>

      <div class="chart-container">
        <h3>
          {{ t("admin.feedback.charts.topIssues", "Häufigste Themen") }}
        </h3>
        <div class="chart">
          <canvas ref="topicsChartCanvas"></canvas>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="admin-feedback__filters">
      <div class="filter-section">
        <h3>{{ t("admin.feedback.filters.title", "Filter und Suche") }}</h3>

        <div class="filter-controls">
          <div class="filter-row">
            <div class="filter-group">
              <label for="date-from">
                {{ t("admin.feedback.filters.dateFrom", "Von") }}
              </label>
              <input
                type="date"
                id="date-from"
                v-model="filters.dateFrom"
                @change="applyFilters"
                class="form-control"
              />
            </div>

            <div class="filter-group">
              <label for="date-to">
                {{ t("admin.feedback.filters.dateTo", "Bis") }}
              </label>
              <input
                type="date"
                id="date-to"
                v-model="filters.dateTo"
                @change="applyFilters"
                class="form-control"
              />
            </div>

            <div class="filter-group">
              <label for="feedback-type">
                {{ t("admin.feedback.filters.type", "Typ") }}
              </label>
              <select
                id="feedback-type"
                v-model="filters.type"
                @change="applyFilters"
                class="form-control"
              >
                <option value="">
                  {{ t("admin.feedback.filters.all", "Alle") }}
                </option>
                <option value="positive">
                  {{ t("admin.feedback.filters.positive", "Positiv") }}
                </option>
                <option value="negative">
                  {{ t("admin.feedback.filters.negative", "Negativ") }}
                </option>
              </select>
            </div>

            <div class="filter-group">
              <label for="status">
                {{ t("admin.feedback.filters.status", "Status") }}
              </label>
              <select
                id="status"
                v-model="filters.status"
                @change="applyFilters"
                class="form-control"
              >
                <option value="">
                  {{ t("admin.feedback.filters.all", "Alle") }}
                </option>
                <option value="unresolved">
                  {{ t("admin.feedback.filters.unresolved", "Unbearbeitet") }}
                </option>
                <option value="resolved">
                  {{ t("admin.feedback.filters.resolved", "Bearbeitet") }}
                </option>
              </select>
            </div>
          </div>

          <div class="filter-row">
            <div class="search-group">
              <input
                type="text"
                v-model="filters.searchTerm"
                @input="debounceSearch"
                :placeholder="
                  t('admin.feedback.filters.search', 'Suche in Feedback...')
                "
                class="form-control search-input"
              />
              <button class="btn btn-icon" @click="applyFilters">
                <i class="fas fa-search"></i>
              </button>
            </div>

            <div class="filter-actions">
              <button class="btn btn-secondary" @click="resetFilters">
                <i class="fas fa-times"></i>
                {{ t("admin.feedback.filters.reset", "Zurücksetzen") }}
              </button>

              <button class="btn btn-primary" @click="showExportDialog = true">
                <i class="fas fa-file-export"></i>
                {{ t("admin.feedback.export", "Exportieren") }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Feedback Table -->
    <div class="admin-feedback__table-container">
      <table
        class="feedback-table"
        v-if="!loading && filteredFeedback.length > 0"
      >
        <thead>
          <tr>
            <th>
              <span @click="sortBy('created_at')" class="sortable-header">
                {{ t("admin.feedback.table.date", "Datum") }}
                <i :class="getSortIcon('created_at')"></i>
              </span>
            </th>
            <th>
              <span @click="sortBy('user_email')" class="sortable-header">
                {{ t("admin.feedback.table.user", "Benutzer") }}
                <i :class="getSortIcon('user_email')"></i>
              </span>
            </th>
            <th>
              <span @click="sortBy('is_positive')" class="sortable-header">
                {{ t("admin.feedback.table.type", "Typ") }}
                <i :class="getSortIcon('is_positive')"></i>
              </span>
            </th>
            <th>{{ t("admin.feedback.table.question", "Frage") }}</th>
            <th>{{ t("admin.feedback.table.comment", "Kommentar") }}</th>
            <th>
              <span @click="sortBy('status')" class="sortable-header">
                {{ t("admin.feedback.table.status", "Status") }}
                <i :class="getSortIcon('status')"></i>
              </span>
            </th>
            <th>{{ t("admin.feedback.table.actions", "Aktionen") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="feedback in paginatedFeedback"
            :key="feedback.id"
            :class="{
              'alt-row': feedback.id % 2 === 0,
              unresolved: feedback.status === 'unresolved',
            }"
          >
            <td>{{ formatDate(feedback.created_at) }}</td>
            <td>
              <div class="user-info">
                <span class="user-email">{{ feedback.user_email }}</span>
                <span v-if="feedback.user_name" class="user-name">
                  {{ feedback.user_name }}
                </span>
              </div>
            </td>
            <td>
              <span
                :class="
                  feedback.is_positive
                    ? 'badge badge-success'
                    : 'badge badge-danger'
                "
              >
                <i
                  :class="
                    feedback.is_positive
                      ? 'fas fa-thumbs-up'
                      : 'fas fa-thumbs-down'
                  "
                ></i>
                {{
                  feedback.is_positive
                    ? t("admin.feedback.positive", "Positiv")
                    : t("admin.feedback.negative", "Negativ")
                }}
              </span>
            </td>
            <td>
              <div class="truncated-text" :title="feedback.question">
                {{ truncateText(feedback.question, 50) }}
              </div>
            </td>
            <td>
              <div
                v-if="feedback.comment"
                class="truncated-text"
                :title="feedback.comment"
              >
                {{ truncateText(feedback.comment, 50) }}
              </div>
              <div v-else class="no-comment">
                {{ t("admin.feedback.noComment", "Kein Kommentar") }}
              </div>
            </td>
            <td>
              <span
                :class="[
                  'badge',
                  feedback.status === 'resolved'
                    ? 'badge-success'
                    : 'badge-warning',
                ]"
              >
                {{
                  feedback.status === "resolved"
                    ? t("admin.feedback.resolved", "Bearbeitet")
                    : t("admin.feedback.unresolved", "Unbearbeitet")
                }}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button
                  class="btn btn-sm btn-icon"
                  @click="viewFeedback(feedback)"
                  :title="t('admin.feedback.view', 'Ansehen')"
                >
                  <i class="fas fa-eye"></i>
                </button>
                <button
                  v-if="feedback.status !== 'resolved'"
                  class="btn btn-sm btn-icon"
                  @click="resolveFeedback(feedback)"
                  :title="
                    t('admin.feedback.resolve', 'Als bearbeitet markieren')
                  "
                >
                  <i class="fas fa-check"></i>
                </button>
                <button
                  class="btn btn-sm btn-icon"
                  @click="deleteFeedback(feedback)"
                  :title="t('admin.feedback.delete', 'Löschen')"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        {{ t("admin.feedback.loading", "Lade Feedback...") }}
        <div v-if="apiIntegrationEnabled" class="api-status">
          <span class="api-badge">
            <i class="fas fa-cloud"></i>
            {{ t("admin.feedback.apiMode", "API-Modus") }}
          </span>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && filteredFeedback.length === 0" class="empty-state">
        <i class="fas fa-comments"></i>
        <p>{{ t("admin.feedback.empty", "Kein Feedback gefunden") }}</p>
        <p v-if="error" class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          {{ error }}
        </p>
        <button class="btn btn-primary" @click="refreshData">
          <i class="fas fa-sync"></i>
          {{ t("admin.feedback.retry", "Erneut versuchen") }}
        </button>
      </div>
    </div>

    <!-- Pagination -->
    <div class="admin-feedback__pagination" v-if="totalPages > 1">
      <button
        class="btn btn-sm"
        :disabled="currentPage === 1"
        @click="currentPage = 1"
      >
        <i class="fas fa-angle-double-left"></i>
      </button>
      <button
        class="btn btn-sm"
        :disabled="currentPage === 1"
        @click="currentPage--"
      >
        <i class="fas fa-angle-left"></i>
      </button>

      <span class="page-info">
        {{
          t("admin.feedback.page", "Seite {current} von {total}", {
            current: currentPage,
            total: totalPages,
          })
        }}
      </span>

      <button
        class="btn btn-sm"
        :disabled="currentPage === totalPages"
        @click="currentPage++"
      >
        <i class="fas fa-angle-right"></i>
      </button>
      <button
        class="btn btn-sm"
        :disabled="currentPage === totalPages"
        @click="currentPage = totalPages"
      >
        <i class="fas fa-angle-double-right"></i>
      </button>
    </div>

    <!-- Feedback Detail Modal -->
    <div
      v-if="selectedFeedback"
      class="modal-overlay"
      @click="closeFeedbackModal"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ t("admin.feedback.detail.title", "Feedback Details") }}</h3>
          <button class="close-button" @click="closeFeedbackModal">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="detail-section">
            <label>{{ t("admin.feedback.detail.user", "Benutzer") }}</label>
            <p>{{ selectedFeedback.user_email }}</p>
          </div>

          <div class="detail-section">
            <label>{{ t("admin.feedback.detail.date", "Datum") }}</label>
            <p>{{ formatDate(selectedFeedback.created_at, true) }}</p>
          </div>

          <div class="detail-section">
            <label>{{ t("admin.feedback.detail.type", "Typ") }}</label>
            <p>
              <span
                :class="
                  selectedFeedback.is_positive
                    ? 'badge badge-success'
                    : 'badge badge-danger'
                "
              >
                {{
                  selectedFeedback.is_positive
                    ? t("admin.feedback.positive", "Positiv")
                    : t("admin.feedback.negative", "Negativ")
                }}
              </span>
            </p>
          </div>

          <div class="detail-section">
            <label>{{ t("admin.feedback.detail.question", "Frage") }}</label>
            <p>{{ selectedFeedback.question }}</p>
          </div>

          <div class="detail-section">
            <label>{{ t("admin.feedback.detail.answer", "Antwort") }}</label>
            <p>
              {{
                selectedFeedback.answer ||
                t("admin.feedback.noAnswer", "Keine Antwort")
              }}
            </p>
          </div>

          <div class="detail-section" v-if="selectedFeedback.comment">
            <label>{{ t("admin.feedback.detail.comment", "Kommentar") }}</label>
            <p>{{ selectedFeedback.comment }}</p>
          </div>

          <div class="detail-section">
            <label>{{
              t("admin.feedback.detail.metadata", "Metadaten")
            }}</label>
            <div class="metadata-grid">
              <div v-if="selectedFeedback.session_id">
                <strong>Session ID:</strong> {{ selectedFeedback.session_id }}
              </div>
              <div v-if="selectedFeedback.user_agent">
                <strong>User Agent:</strong> {{ selectedFeedback.user_agent }}
              </div>
              <div v-if="selectedFeedback.ip_address">
                <strong>IP Adresse:</strong> {{ selectedFeedback.ip_address }}
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button
            v-if="selectedFeedback.status !== 'resolved'"
            class="btn btn-primary"
            @click="resolveFeedback(selectedFeedback)"
          >
            {{ t("admin.feedback.resolve", "Als bearbeitet markieren") }}
          </button>
          <button class="btn btn-secondary" @click="closeFeedbackModal">
            {{ t("common.close", "Schließen") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Export Dialog -->
    <div
      v-if="showExportDialog"
      class="modal-overlay"
      @click="showExportDialog = false"
    >
      <div class="modal-content export-dialog" @click.stop>
        <div class="modal-header">
          <h3>
            {{ t("admin.feedback.export.title", "Feedback exportieren") }}
          </h3>
          <button class="close-button" @click="showExportDialog = false">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="export-options">
            <h4>{{ t("admin.feedback.export.format", "Export-Format") }}</h4>
            <div class="radio-group">
              <label>
                <input type="radio" v-model="exportFormat" value="csv" />
                CSV
              </label>
              <label>
                <input type="radio" v-model="exportFormat" value="xlsx" />
                Excel
              </label>
              <label>
                <input type="radio" v-model="exportFormat" value="json" />
                JSON
              </label>
            </div>
          </div>

          <div class="export-options">
            <h4>{{ t("admin.feedback.export.range", "Zeitraum") }}</h4>
            <div class="radio-group">
              <label>
                <input type="radio" v-model="exportRange" value="filtered" />
                {{ t("admin.feedback.export.filtered", "Gefilterte Daten") }}
              </label>
              <label>
                <input type="radio" v-model="exportRange" value="all" />
                {{ t("admin.feedback.export.all", "Alle Daten") }}
              </label>
            </div>
          </div>

          <div class="export-options">
            <h4>{{ t("admin.feedback.export.fields", "Felder") }}</h4>
            <div class="checkbox-group">
              <label v-for="field in exportFields" :key="field.key">
                <input type="checkbox" v-model="field.included" />
                {{ field.label }}
              </label>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-primary" @click="performExport">
            <i class="fas fa-download"></i>
            {{ t("admin.feedback.export.download", "Herunterladen") }}
          </button>
          <button class="btn btn-secondary" @click="showExportDialog = false">
            {{ t("common.cancel", "Abbrechen") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "@/composables/useI18n";
import { useToast } from "@/composables/useToast";
import { useAdminFeedbackStore } from "@/stores/admin/feedback";
import { shouldUseRealApi } from "@/config/api-flags";
import { Chart } from "chart.js/auto";
import { format } from "date-fns";
import { de } from "date-fns/locale";

// Composables
const { t, locale } = useI18n({ useScope: 'global', inheritLocale: true });
console.log('[i18n] Component initialized with global scope and inheritance');
const toast = useToast();
const feedbackStore = useAdminFeedbackStore();

// Store state
const { negativeFeedback, stats, loading, error } = storeToRefs(feedbackStore);

// Create a reactive reference to feedbackItems that uses negativeFeedback
const feedbackItems = computed(() => negativeFeedback.value);

// Local state
const showCharts = ref(true);
const currentPage = ref(1);
const itemsPerPage = ref(25);
const sortField = ref("created_at");
const sortOrder = ref("desc");
const selectedFeedback = ref(null);
const showExportDialog = ref(false);
const exportFormat = ref("csv");
const exportRange = ref("filtered");

// Filter state
const filters = ref({
  dateFrom: "",
  dateTo: "",
  type: "",
  status: "",
  searchTerm: "",
});

// Export fields configuration
const exportFields = ref([
  { key: "id", label: "ID", included: true },
  { key: "created_at", label: "Datum", included: true },
  { key: "user_email", label: "Benutzer", included: true },
  { key: "is_positive", label: "Typ", included: true },
  { key: "question", label: "Frage", included: true },
  { key: "answer", label: "Antwort", included: true },
  { key: "comment", label: "Kommentar", included: true },
  { key: "status", label: "Status", included: true },
  { key: "session_id", label: "Session ID", included: false },
  { key: "user_agent", label: "User Agent", included: false },
  { key: "ip_address", label: "IP Adresse", included: false },
]);

// Chart instances
let timeChart: Chart | null = null;
let pieChart: Chart | null = null;
let topicsChart: Chart | null = null;

// Canvas refs
const timeChartCanvas = ref<HTMLCanvasElement>();
const pieChartCanvas = ref<HTMLCanvasElement>();
const topicsChartCanvas = ref<HTMLCanvasElement>();

// Computed
const filteredFeedback = computed(() => {
  if (!feedbackItems.value) {
    return [];
  }

  let result = [...feedbackItems.value];

  // Apply date filters
  if (filters.value.dateFrom) {
    result = result.filter(
      (item) => new Date(item.created_at) >= new Date(filters.value.dateFrom),
    );
  }

  if (filters.value.dateTo) {
    result = result.filter(
      (item) => new Date(item.created_at) <= new Date(filters.value.dateTo),
    );
  }

  // Apply type filter
  if (filters.value.type) {
    result = result.filter((item) =>
      filters.value.type === "positive" ? item.is_positive : !item.is_positive,
    );
  }

  // Apply status filter
  if (filters.value.status) {
    result = result.filter((item) => item.status === filters.value.status);
  }

  // Apply search filter
  if (filters.value.searchTerm) {
    const searchLower = filters.value.searchTerm.toLowerCase();
    result = result.filter(
      (item) =>
        item.question.toLowerCase().includes(searchLower) ||
        item.comment?.toLowerCase().includes(searchLower) ||
        item.user_email.toLowerCase().includes(searchLower),
    );
  }

  // Apply sorting
  result.sort((a, b) => {
    const aValue = a[sortField.value];
    const bValue = b[sortField.value];

    if (sortOrder.value === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  return result;
});

const totalPages = computed(() =>
  Math.ceil(filteredFeedback.value.length / itemsPerPage.value),
);

const paginatedFeedback = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredFeedback.value.slice(start, end);
});

// Methods
const refreshData = async () => {
  try {
    // Show loading toast for better user feedback
    toast.info(
      t("admin.feedback.loading", "Lade Feedback-Daten...")
    );
    
    await Promise.all([
      feedbackStore.fetchNegativeFeedback(),
      feedbackStore.fetchStats()
    ]);
    
    // Show success message
    toast.success(
      t("admin.feedback.loadSuccess", "Feedback-Daten erfolgreich geladen")
    );
    
    updateCharts();
  } catch (err) {
    // Show error message when loading fails
    toast.error(
      t("admin.feedback.loadError", "Fehler beim Laden der Feedback-Daten")
    );
    console.error("Error loading feedback data:", err);
  }
};

const applyFilters = () => {
  currentPage.value = 1;
  updateCharts();
};

const resetFilters = () => {
  filters.value = {
    dateFrom: "",
    dateTo: "",
    type: "",
    status: "",
    searchTerm: "",
  };
  applyFilters();
};

const debounceSearch = (() => {
  let timeout: NodeJS.Timeout;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      applyFilters();
    }, 300);
  };
})();

const sortBy = (field: string) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortField.value = field;
    sortOrder.value = "desc";
  }
};

const getSortIcon = (field: string) => {
  if (sortField.value !== field) {
    return "fas fa-sort";
  }
  return sortOrder.value === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
};

const formatDate = (date: string, includeTime = false) => {
  if (!date) return "";
  const formatString = includeTime ? "dd.MM.yyyy HH:mm" : "dd.MM.yyyy";
  return format(new Date(date), formatString, { locale: de });
};

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

const viewFeedback = (feedback: any) => {
  selectedFeedback.value = feedback;
};

const closeFeedbackModal = () => {
  selectedFeedback.value = null;
};

const resolveFeedback = async (feedback: any) => {
  try {
    await feedbackStore.updateFeedbackStatus(feedback.id, "resolved");
    toast.success(
      t("admin.feedback.resolvedSuccess", "Feedback als bearbeitet markiert"),
    );
    closeFeedbackModal();
  } catch (error) {
    toast.error(
      t("admin.feedback.resolvedError", "Fehler beim Aktualisieren des Status"),
    );
  }
};

const deleteFeedback = async (feedback: any) => {
  if (
    !confirm(
      t(
        "admin.feedback.deleteConfirm",
        "Möchten Sie dieses Feedback wirklich löschen?",
      ),
    )
  ) {
    return;
  }

  try {
    await feedbackStore.deleteFeedback(feedback.id);
    toast.success(t("admin.feedback.deleteSuccess", "Feedback gelöscht"));
  } catch (error) {
    toast.error(
      t("admin.feedback.deleteError", "Fehler beim Löschen des Feedbacks"),
    );
  }
};

const performExport = async () => {
  try {
    const dataToExport =
      exportRange.value === "all"
        ? feedbackItems.value
        : filteredFeedback.value;

    const fieldsToInclude = exportFields.value
      .filter((field) => field.included)
      .map((field) => field.key);

    await feedbackStore.exportFeedback({
      format: exportFormat.value,
      data: dataToExport,
      fields: fieldsToInclude,
    });

    toast.success(t("admin.feedback.exportSuccess", "Export erfolgreich"));
    showExportDialog.value = false;
  } catch (error) {
    toast.error(t("admin.feedback.exportError", "Fehler beim Exportieren"));
  }
};

const updateCharts = () => {
  if (!showCharts.value) return;

  // Update time chart
  if (timeChart && timeChartCanvas.value) {
    const chartData = feedbackStore.getFeedbackTimeData(filteredFeedback.value);
    timeChart.data = chartData;
    timeChart.update();
  }

  // Update pie chart
  if (pieChart && pieChartCanvas.value) {
    const chartData = feedbackStore.getFeedbackTypeData(filteredFeedback.value);
    pieChart.data = chartData;
    pieChart.update();
  }

  // Update topics chart
  if (topicsChart && topicsChartCanvas.value) {
    const chartData = feedbackStore.getTopIssuesData(filteredFeedback.value);
    topicsChart.data = chartData;
    topicsChart.update();
  }
};

const initCharts = () => {
  if (!showCharts.value) return;

  // Initialize time chart
  if (timeChartCanvas.value) {
    const ctx = timeChartCanvas.value.getContext("2d");
    if (ctx) {
      timeChart = new Chart(ctx, {
        type: "line",
        data: feedbackStore.getFeedbackTimeData(filteredFeedback.value),
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: "bottom",
            },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  }

  // Initialize pie chart
  if (pieChartCanvas.value) {
    const ctx = pieChartCanvas.value.getContext("2d");
    if (ctx) {
      pieChart = new Chart(ctx, {
        type: "doughnut",
        data: feedbackStore.getFeedbackTypeData(filteredFeedback.value),
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: "bottom",
            },
          },
        },
      });
    }
  }

  // Initialize topics chart
  if (topicsChartCanvas.value) {
    const ctx = topicsChartCanvas.value.getContext("2d");
    if (ctx) {
      topicsChart = new Chart(ctx, {
        type: "bar",
        data: feedbackStore.getTopIssuesData(filteredFeedback.value),
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: "y",
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            x: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  }
};

// API integration status
const apiIntegrationEnabled = computed(() => shouldUseRealApi("useRealFeedbackApi"));

// Lifecycle
onMounted(async () => {
  // nextTick is already imported at the top
  await refreshData();
  await nextTick();
  initCharts();
  
  // Show API integration status
  if (apiIntegrationEnabled.value) {
    toast.info(
      t("admin.feedback.apiEnabled", "Feedback-API Integration ist aktiviert")
    );
  }
});

// Watchers
watch(filteredFeedback, () => {
  updateCharts();
});

// Cleanup
onUnmounted(() => {
  timeChart?.destroy();
  pieChart?.destroy();
  topicsChart?.destroy();
});

// Log i18n initialization status
console.log(`[AdminFeedback.enhanced] i18n initialized with locale: ${locale.value}`);

// Log i18n initialization status
console.log(`[AdminFeedback.enhanced] i18n initialized with locale: ${locale.value}`);
</script>

<style lang="scss" scoped>
@import "@/assets/styles/admin-consolidated.scss";

.admin-feedback {
  padding: 24px;

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

  &__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 32px;
  }

  &__charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 24px;
    margin-bottom: 32px;

    .chart-container {
      background: var(--admin-bg);
      border-radius: var(--admin-radius);
      padding: 20px;
      box-shadow: var(--admin-shadow-sm);

      h3 {
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 600;
      }

      .chart {
        height: 300px;
      }
    }
  }

  &__filters {
    background: var(--admin-bg);
    border-radius: var(--admin-radius);
    padding: 20px;
    margin-bottom: 24px;
    box-shadow: var(--admin-shadow-sm);

    .filter-section h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
    }

    .filter-controls {
      .filter-row {
        display: flex;
        gap: 16px;
        margin-bottom: 16px;

        @media (max-width: 768px) {
          flex-direction: column;
        }
      }

      .filter-group {
        flex: 1;

        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }
      }

      .search-group {
        flex: 2;
        display: flex;
        gap: 8px;

        .search-input {
          flex: 1;
        }
      }

      .filter-actions {
        display: flex;
        gap: 12px;
        align-items: flex-end;
      }
    }
  }

  &__table-container {
    background: var(--admin-bg);
    border-radius: var(--admin-radius);
    padding: 20px;
    box-shadow: var(--admin-shadow-sm);

    .feedback-table {
      width: 100%;
      border-collapse: collapse;

      th,
      td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid var(--admin-border);
      }

      th {
        font-weight: 600;
        background: var(--admin-bg-alt);

        .sortable-header {
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;

          &:hover {
            color: var(--admin-primary);
          }
        }
      }

      tr {
        &.alt-row {
          background: var(--admin-bg-alt);
        }

        &.unresolved {
          background: rgba(255, 193, 7, 0.1);
        }

        &:hover {
          background: var(--admin-bg-alt);
        }
      }

      .user-info {
        .user-email {
          font-weight: 500;
        }

        .user-name {
          display: block;
          font-size: 12px;
          color: var(--admin-text-secondary);
        }
      }

      .truncated-text {
        max-width: 250px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .no-comment {
        color: var(--admin-text-secondary);
        font-style: italic;
      }

      .action-buttons {
        display: flex;
        gap: 8px;
      }
    }

    .loading-state,
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--admin-text-secondary);

      i {
        font-size: 48px;
        margin-bottom: 16px;
        display: block;
      }
    }
  }

  &__pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-top: 20px;

    .page-info {
      font-weight: 500;
    }
  }
}

// API Status Indicators
.api-status-indicator {
  display: flex;
  align-items: center;
  margin-right: 16px;
}

.api-status-badge {
  background-color: var(--nscale-info-light);
  color: var(--nscale-info);
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.api-status {
  margin-top: 12px;
  font-size: 14px;
  
  .api-badge {
    background-color: var(--nscale-info-light);
    color: var(--nscale-info);
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
}

.error-message {
  color: var(--nscale-danger);
  margin: 12px 0;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

// Modal styles
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--admin-bg);
  border-radius: var(--admin-radius);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow: auto;
  box-shadow: var(--admin-shadow-lg);

  &.export-dialog {
    max-width: 500px;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--admin-border);

  h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 20px;
    color: var(--admin-text-secondary);
    cursor: pointer;
    padding: 4px 8px;

    &:hover {
      color: var(--admin-text);
    }
  }
}

.modal-body {
  padding: 20px;

  .detail-section {
    margin-bottom: 20px;

    label {
      display: block;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--admin-text-secondary);
    }

    p {
      margin: 0;
    }
  }

  .metadata-grid {
    display: grid;
    gap: 12px;
    font-size: 14px;
  }

  .export-options {
    margin-bottom: 24px;

    h4 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
    }

    .radio-group,
    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 8px;

      label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;

        input {
          margin: 0;
        }
      }
    }
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--admin-border);
}

// Badges
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;

  &.badge-success {
    background: var(--nscale-success-light);
    color: var(--nscale-success);
  }

  &.badge-danger {
    background: var(--nscale-danger-light);
    color: var(--nscale-danger);
  }

  &.badge-warning {
    background: var(--nscale-warning-light);
    color: var(--nscale-warning);
  }
}

// Buttons
.btn {
  @extend .admin-button;

  &.btn-sm {
    padding: 6px 12px;
    font-size: 13px;
  }

  &.btn-icon {
    padding: 8px;

    i {
      margin: 0;
    }
  }
}

// Dark mode adjustments
.theme-dark {
  .admin-feedback {
    &__charts {
      .chart-container {
        background: var(--admin-bg);
      }
    }

    &__filters,
    &__table-container {
      background: var(--admin-bg);
    }
  }

  .modal-content {
    background: var(--admin-bg);
    color: var(--admin-text);
  }
}
</style>
