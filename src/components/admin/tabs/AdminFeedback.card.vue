<template>
  <div class="admin-feedback">
    <div class="admin-section">
      <h2 class="admin-section__title">
        {{ t("admin.feedback.title", "Feedback-Übersicht") }}
      </h2>
      <div class="admin-grid admin-grid--4-columns">
        <!-- Summary Statistics Cards -->
        <AdminCard variant="primary" elevated>
          <template #header>
            <div class="admin-card__header-with-icon">
              <i class="fas fa-comments" aria-hidden="true"></i>
              <h3>{{ t("admin.feedback.stats.total", "Gesamt") }}</h3>
            </div>
          </template>
          <div class="admin-metric">
            <div class="admin-metric__value">{{ stats.total }}</div>
            <div class="admin-metric__label">
              {{ t("admin.feedback.stats.feedbackItems", "Feedback-Einträge") }}
            </div>
          </div>
        </AdminCard>

        <AdminCard variant="success" elevated>
          <template #header>
            <div class="admin-card__header-with-icon">
              <i class="fas fa-thumbs-up" aria-hidden="true"></i>
              <h3>{{ t("admin.feedback.stats.positive", "Positiv") }}</h3>
            </div>
          </template>
          <div class="admin-metric">
            <div class="admin-metric__value">{{ stats.positive }}</div>
            <div class="admin-metric__label">
              {{
                t("admin.feedback.stats.positiveCount", "Positive Bewertungen")
              }}
            </div>
          </div>
        </AdminCard>

        <AdminCard variant="danger" elevated>
          <template #header>
            <div class="admin-card__header-with-icon">
              <i class="fas fa-thumbs-down" aria-hidden="true"></i>
              <h3>{{ t("admin.feedback.stats.negative", "Negativ") }}</h3>
            </div>
          </template>
          <div class="admin-metric">
            <div class="admin-metric__value">{{ stats.negative }}</div>
            <div class="admin-metric__label">
              {{
                t("admin.feedback.stats.negativeCount", "Negative Bewertungen")
              }}
            </div>
          </div>
        </AdminCard>

        <AdminCard variant="warning" elevated>
          <template #header>
            <div class="admin-card__header-with-icon">
              <i class="fas fa-exclamation-circle" aria-hidden="true"></i>
              <h3>
                {{ t("admin.feedback.stats.unresolved", "Unbearbeitet") }}
              </h3>
            </div>
          </template>
          <div class="admin-metric">
            <div class="admin-metric__value">{{ stats.unresolved }}</div>
            <div class="admin-metric__label">
              {{
                t("admin.feedback.stats.needAction", "Benötigen Bearbeitung")
              }}
            </div>
          </div>
        </AdminCard>
      </div>
    </div>

    <!-- Data Visualization -->
    <div class="admin-section" v-if="showCharts">
      <h2 class="admin-section__title">
        {{ t("admin.feedback.charts.title", "Datenvisualisierung") }}
      </h2>
      <div class="admin-grid admin-grid--3-columns">
        <AdminCard elevated>
          <template #header>
            <div class="admin-card__header-with-icon">
              <i class="fas fa-chart-line" aria-hidden="true"></i>
              <h3>
                {{
                  t(
                    "admin.feedback.charts.feedbackOverTime",
                    "Feedback im Zeitverlauf",
                  )
                }}
              </h3>
            </div>
          </template>
          <div class="chart-container">
            <canvas ref="timeChartCanvas"></canvas>
          </div>
        </AdminCard>

        <AdminCard elevated>
          <template #header>
            <div class="admin-card__header-with-icon">
              <i class="fas fa-chart-pie" aria-hidden="true"></i>
              <h3>
                {{
                  t("admin.feedback.charts.feedbackByType", "Feedback nach Typ")
                }}
              </h3>
            </div>
          </template>
          <div class="chart-container">
            <canvas ref="pieChartCanvas"></canvas>
          </div>
        </AdminCard>

        <AdminCard elevated>
          <template #header>
            <div class="admin-card__header-with-icon">
              <i class="fas fa-list" aria-hidden="true"></i>
              <h3>
                {{ t("admin.feedback.charts.topIssues", "Häufigste Themen") }}
              </h3>
            </div>
          </template>
          <div class="chart-container">
            <canvas ref="topicsChartCanvas"></canvas>
          </div>
        </AdminCard>
      </div>
    </div>

    <!-- Filters -->
    <AdminCard elevated class="admin-section">
      <template #header>
        <div class="admin-card__header-with-icon">
          <i class="fas fa-filter" aria-hidden="true"></i>
          <h3>{{ t("admin.feedback.filters.title", "Filter und Suche") }}</h3>
        </div>
        <div class="admin-card__header-actions">
          <button
            class="admin-button admin-button--secondary"
            @click="resetFilters"
          >
            <i class="fas fa-times" aria-hidden="true"></i>
            {{ t("admin.feedback.filters.reset", "Zurücksetzen") }}
          </button>
          <button
            class="admin-button admin-button--primary"
            @click="refreshData"
          >
            <i class="fas fa-sync-alt" aria-hidden="true"></i>
            {{ t("admin.feedback.refresh", "Aktualisieren") }}
          </button>
        </div>
      </template>

      <div class="filter-controls">
        <div class="filter-row">
          <div class="admin-form__group">
            <label class="admin-form__label" for="date-from">
              {{ t("admin.feedback.filters.dateFrom", "Von") }}
            </label>
            <input
              type="date"
              id="date-from"
              v-model="filters.dateFrom"
              @change="applyFilters"
              class="admin-form__input"
            />
          </div>

          <div class="admin-form__group">
            <label class="admin-form__label" for="date-to">
              {{ t("admin.feedback.filters.dateTo", "Bis") }}
            </label>
            <input
              type="date"
              id="date-to"
              v-model="filters.dateTo"
              @change="applyFilters"
              class="admin-form__input"
            />
          </div>

          <div class="admin-form__group">
            <label class="admin-form__label" for="feedback-type">
              {{ t("admin.feedback.filters.type", "Typ") }}
            </label>
            <select
              id="feedback-type"
              v-model="filters.type"
              @change="applyFilters"
              class="admin-form__select"
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

          <div class="admin-form__group">
            <label class="admin-form__label" for="status">
              {{ t("admin.feedback.filters.status", "Status") }}
            </label>
            <select
              id="status"
              v-model="filters.status"
              @change="applyFilters"
              class="admin-form__select"
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
              class="admin-form__input search-input"
            />
            <button
              class="admin-button admin-button--icon"
              @click="applyFilters"
            >
              <i class="fas fa-search" aria-hidden="true"></i>
            </button>
          </div>

          <div class="filter-actions">
            <button
              class="admin-button admin-button--primary"
              @click="showExportDialog = true"
            >
              <i class="fas fa-file-export" aria-hidden="true"></i>
              {{ t("admin.feedback.export", "Exportieren") }}
            </button>
          </div>
        </div>
      </div>
    </AdminCard>

    <!-- Feedback Table -->
    <AdminCard elevated class="admin-section">
      <template #header>
        <div class="admin-card__header-with-icon">
          <i class="fas fa-list-alt" aria-hidden="true"></i>
          <h3>{{ t("admin.feedback.table.title", "Feedback-Übersicht") }}</h3>
        </div>
        <div class="admin-card__header-actions">
          <div class="page-info" v-if="totalPages > 0">
            {{
              t("admin.feedback.page", "Seite {current} von {total}", {
                current: currentPage,
                total: totalPages,
              })
            }}
          </div>
        </div>
      </template>

      <div
        class="admin-table admin-table--responsive"
        v-if="!loading && filteredFeedback.length > 0"
      >
        <table>
          <thead>
            <tr>
              <th>
                <span @click="sortBy('created_at')" class="sortable-header">
                  {{ t("admin.feedback.table.date", "Datum") }}
                  <i :class="getSortIcon('created_at')" aria-hidden="true"></i>
                </span>
              </th>
              <th>
                <span @click="sortBy('user_email')" class="sortable-header">
                  {{ t("admin.feedback.table.user", "Benutzer") }}
                  <i :class="getSortIcon('user_email')" aria-hidden="true"></i>
                </span>
              </th>
              <th>
                <span @click="sortBy('is_positive')" class="sortable-header">
                  {{ t("admin.feedback.table.type", "Typ") }}
                  <i :class="getSortIcon('is_positive')" aria-hidden="true"></i>
                </span>
              </th>
              <th>{{ t("admin.feedback.table.question", "Frage") }}</th>
              <th>{{ t("admin.feedback.table.comment", "Kommentar") }}</th>
              <th>
                <span @click="sortBy('status')" class="sortable-header">
                  {{ t("admin.feedback.table.status", "Status") }}
                  <i :class="getSortIcon('status')" aria-hidden="true"></i>
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
                      ? 'admin-badge admin-badge--success'
                      : 'admin-badge admin-badge--danger'
                  "
                >
                  <i
                    :class="
                      feedback.is_positive
                        ? 'fas fa-thumbs-up'
                        : 'fas fa-thumbs-down'
                    "
                    aria-hidden="true"
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
                    'admin-badge',
                    feedback.status === 'resolved'
                      ? 'admin-badge--success'
                      : 'admin-badge--warning',
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
                    class="admin-button admin-button--icon"
                    @click="viewFeedback(feedback)"
                    :title="t('admin.feedback.view', 'Ansehen')"
                  >
                    <i class="fas fa-eye" aria-hidden="true"></i>
                  </button>
                  <button
                    v-if="feedback.status !== 'resolved'"
                    class="admin-button admin-button--icon"
                    @click="resolveFeedback(feedback)"
                    :title="
                      t('admin.feedback.resolve', 'Als bearbeitet markieren')
                    "
                  >
                    <i class="fas fa-check" aria-hidden="true"></i>
                  </button>
                  <button
                    class="admin-button admin-button--icon admin-button--danger"
                    @click="deleteFeedback(feedback)"
                    :title="t('admin.feedback.delete', 'Löschen')"
                  >
                    <i class="fas fa-trash" aria-hidden="true"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="admin-loading">
        <div class="admin-loading__spinner"></div>
        <div class="admin-loading__text">
          {{ t("admin.feedback.loading", "Lade Feedback...") }}
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && filteredFeedback.length === 0" class="empty-state">
        <i class="fas fa-comments" aria-hidden="true"></i>
        <p>{{ t("admin.feedback.empty", "Kein Feedback gefunden") }}</p>
        <button
          class="admin-button admin-button--secondary"
          @click="resetFilters"
        >
          {{ t("admin.feedback.filters.reset", "Filter zurücksetzen") }}
        </button>
      </div>

      <!-- Pagination -->
      <template #footer v-if="totalPages > 1">
        <div class="admin-pagination">
          <button
            class="admin-button admin-button--icon"
            :disabled="currentPage === 1"
            @click="currentPage = 1"
            :title="t('admin.common.firstPage', 'Erste Seite')"
          >
            <i class="fas fa-angle-double-left" aria-hidden="true"></i>
          </button>
          <button
            class="admin-button admin-button--icon"
            :disabled="currentPage === 1"
            @click="currentPage--"
            :title="t('admin.common.previousPage', 'Vorherige Seite')"
          >
            <i class="fas fa-angle-left" aria-hidden="true"></i>
          </button>

          <span class="admin-pagination__info">
            {{
              t("admin.feedback.page", "Seite {current} von {total}", {
                current: currentPage,
                total: totalPages,
              })
            }}
          </span>

          <button
            class="admin-button admin-button--icon"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
            :title="t('admin.common.nextPage', 'Nächste Seite')"
          >
            <i class="fas fa-angle-right" aria-hidden="true"></i>
          </button>
          <button
            class="admin-button admin-button--icon"
            :disabled="currentPage === totalPages"
            @click="currentPage = totalPages"
            :title="t('admin.common.lastPage', 'Letzte Seite')"
          >
            <i class="fas fa-angle-double-right" aria-hidden="true"></i>
          </button>
        </div>
      </template>
    </AdminCard>

    <!-- Feedback Detail Modal -->
    <div
      v-if="selectedFeedback"
      class="modal-overlay"
      @click="closeFeedbackModal"
    >
      <AdminCard class="modal-content" @click.stop>
        <template #header>
          <div class="admin-card__header-with-icon">
            <i class="fas fa-info-circle" aria-hidden="true"></i>
            <h3>{{ t("admin.feedback.detail.title", "Feedback Details") }}</h3>
          </div>
          <div class="admin-card__header-actions">
            <button
              class="admin-button admin-button--icon"
              @click="closeFeedbackModal"
            >
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </div>
        </template>

        <div class="modal-body">
          <div class="detail-section">
            <label class="admin-form__label">{{
              t("admin.feedback.detail.user", "Benutzer")
            }}</label>
            <p>{{ selectedFeedback.user_email }}</p>
          </div>

          <div class="detail-section">
            <label class="admin-form__label">{{
              t("admin.feedback.detail.date", "Datum")
            }}</label>
            <p>{{ formatDate(selectedFeedback.created_at, true) }}</p>
          </div>

          <div class="detail-section">
            <label class="admin-form__label">{{
              t("admin.feedback.detail.type", "Typ")
            }}</label>
            <p>
              <span
                :class="
                  selectedFeedback.is_positive
                    ? 'admin-badge admin-badge--success'
                    : 'admin-badge admin-badge--danger'
                "
              >
                <i
                  :class="
                    selectedFeedback.is_positive
                      ? 'fas fa-thumbs-up'
                      : 'fas fa-thumbs-down'
                  "
                  aria-hidden="true"
                ></i>
                {{
                  selectedFeedback.is_positive
                    ? t("admin.feedback.positive", "Positiv")
                    : t("admin.feedback.negative", "Negativ")
                }}
              </span>
            </p>
          </div>

          <div class="detail-section">
            <label class="admin-form__label">{{
              t("admin.feedback.detail.question", "Frage")
            }}</label>
            <p>{{ selectedFeedback.question }}</p>
          </div>

          <div class="detail-section">
            <label class="admin-form__label">{{
              t("admin.feedback.detail.answer", "Antwort")
            }}</label>
            <p>
              {{
                selectedFeedback.answer ||
                t("admin.feedback.noAnswer", "Keine Antwort")
              }}
            </p>
          </div>

          <div class="detail-section" v-if="selectedFeedback.comment">
            <label class="admin-form__label">{{
              t("admin.feedback.detail.comment", "Kommentar")
            }}</label>
            <p>{{ selectedFeedback.comment }}</p>
          </div>

          <div class="detail-section">
            <label class="admin-form__label">{{
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

        <template #footer>
          <div class="modal-footer-actions">
            <button
              v-if="selectedFeedback.status !== 'resolved'"
              class="admin-button admin-button--primary"
              @click="resolveFeedback(selectedFeedback)"
            >
              <i class="fas fa-check" aria-hidden="true"></i>
              {{ t("admin.feedback.resolve", "Als bearbeitet markieren") }}
            </button>
            <button
              class="admin-button admin-button--secondary"
              @click="closeFeedbackModal"
            >
              {{ t("common.close", "Schließen") }}
            </button>
          </div>
        </template>
      </AdminCard>
    </div>

    <!-- Export Dialog -->
    <div
      v-if="showExportDialog"
      class="modal-overlay"
      @click="showExportDialog = false"
    >
      <AdminCard class="modal-content export-dialog" @click.stop>
        <template #header>
          <div class="admin-card__header-with-icon">
            <i class="fas fa-file-export" aria-hidden="true"></i>
            <h3>
              {{ t("admin.feedback.export.title", "Feedback exportieren") }}
            </h3>
          </div>
          <div class="admin-card__header-actions">
            <button
              class="admin-button admin-button--icon"
              @click="showExportDialog = false"
            >
              <i class="fas fa-times" aria-hidden="true"></i>
            </button>
          </div>
        </template>

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

          <h4>{{ t("admin.feedback.export.fields", "Felder") }}</h4>
          <div class="checkbox-group">
            <label v-for="field in exportFields" :key="field.key">
              <input type="checkbox" v-model="field.included" />
              {{ field.label }}
            </label>
          </div>
        </div>

        <template #footer>
          <div class="modal-footer-actions">
            <button
              class="admin-button admin-button--primary"
              @click="performExport"
            >
              <i class="fas fa-download" aria-hidden="true"></i>
              {{ t("admin.feedback.export.download", "Herunterladen") }}
            </button>
            <button
              class="admin-button admin-button--secondary"
              @click="showExportDialog = false"
            >
              {{ t("common.cancel", "Abbrechen") }}
            </button>
          </div>
        </template>
      </AdminCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "@/composables/useI18n";
import { useToast } from "@/composables/useToast";
import { useAdminFeedbackStore } from "@/stores/admin/feedback";
import { Chart } from "chart.js/auto";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import AdminCard from "@/components/admin/shared/AdminCard.vue";

// Composables
const { t, locale } = useI18n({ useScope: "global", inheritLocale: true });
console.log("[i18n] Component initialized with global scope and inheritance");
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
  await feedbackStore.fetchNegativeFeedback();
  await feedbackStore.fetchStats();
  updateCharts();
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

// Lifecycle
onMounted(async () => {
  await refreshData();
  await nextTick();
  initCharts();
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
console.log(
  `[AdminFeedback.card] i18n initialized with locale: ${locale.value}`,
);

// Log i18n initialization status
console.log(
  `[AdminFeedback.card] i18n initialized with locale: ${locale.value}`,
);
</script>

<style lang="scss" scoped>
@import "@/assets/styles/admin-consolidated.scss";

.admin-feedback {
  .admin-card__header-with-icon {
    display: flex;
    align-items: center;
    gap: 10px;

    i {
      font-size: 1.2rem;
      color: var(--admin-primary);
    }

    h3 {
      margin: 0;
    }
  }

  .admin-metric {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 20px 0;

    &__value {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--admin-text);
      line-height: 1;
    }

    &__label {
      font-size: 0.9rem;
      color: var(--admin-text-secondary);
      margin-top: 8px;
    }
  }

  .chart-container {
    height: 300px;
    width: 100%;
    padding: 10px 0;
  }

  .filter-controls {
    .filter-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;

      @media (max-width: 768px) {
        flex-direction: column;
      }
    }

    .search-group {
      display: flex;
      gap: 8px;
      flex: 2;

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

  .sortable-header {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;

    &:hover {
      color: var(--admin-primary);
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

  .admin-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;

    &__info {
      font-weight: 500;
    }
  }

  // Modal content styles
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
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow: auto;

    &.export-dialog {
      max-width: 500px;
    }
  }

  .detail-section {
    margin-bottom: 20px;

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
    h4 {
      margin: 16px 0 12px 0;
      font-size: 16px;
      font-weight: 600;

      &:first-child {
        margin-top: 0;
      }
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

  .modal-footer-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  // Responsive adjustments
  @media (max-width: 992px) {
    .admin-card {
      margin-bottom: 1rem;
    }
  }

  @media (max-width: 768px) {
    .admin-feedback__charts {
      grid-template-columns: 1fr;
    }
  }
}
</style>
