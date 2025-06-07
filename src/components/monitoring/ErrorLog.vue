<template>
  <div class="error-log">
    <div class="error-log-header">
      <h3>{{ t("monitoring.errorLog.title", "Fehlerprotokolle") }}</h3>
      <div class="error-log-controls">
        <div class="search-container">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('monitoring.errorLog.search', 'Fehler suchen...')"
            class="search-input"
          />
        </div>
        <div class="filter-container">
          <select v-model="selectedFeature" class="filter-select">
            <option value="">
              {{ t("monitoring.errorLog.allFeatures", "Alle Features") }}
            </option>
            <option
              v-for="feature in availableFeatures"
              :key="feature"
              :value="feature"
            >
              {{ formatFeatureName(feature) }}
            </option>
          </select>
          <select v-model="selectedSeverity" class="filter-select">
            <option value="">
              {{ t("monitoring.errorLog.allSeverities", "Alle Schweregrade") }}
            </option>
            <option value="critical">
              {{ t("monitoring.errorLog.severity.critical", "Kritisch") }}
            </option>
            <option value="high">
              {{ t("monitoring.errorLog.severity.high", "Hoch") }}
            </option>
            <option value="medium">
              {{ t("monitoring.errorLog.severity.medium", "Mittel") }}
            </option>
            <option value="low">
              {{ t("monitoring.errorLog.severity.low", "Niedrig") }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="error-log-content">
      <div v-if="filteredErrors.length === 0" class="no-errors">
        {{ t("monitoring.errorLog.noErrors", "Keine Fehler gefunden") }}
      </div>
      <div v-else class="error-table-container">
        <table class="error-table">
          <thead>
            <tr>
              <th
                @click="sortBy('timestamp')"
                :class="{ sorted: sortField === 'timestamp' }"
              >
                {{ t("monitoring.errorLog.columns.timestamp", "Zeitpunkt") }}
                <span v-if="sortField === 'timestamp'" class="sort-icon">{{
                  sortDirection === "asc" ? "▲" : "▼"
                }}</span>
              </th>
              <th
                @click="sortBy('feature')"
                :class="{ sorted: sortField === 'feature' }"
              >
                {{ t("monitoring.errorLog.columns.feature", "Feature") }}
                <span v-if="sortField === 'feature'" class="sort-icon">{{
                  sortDirection === "asc" ? "▲" : "▼"
                }}</span>
              </th>
              <th
                @click="sortBy('component')"
                :class="{ sorted: sortField === 'component' }"
              >
                {{ t("monitoring.errorLog.columns.component", "Komponente") }}
                <span v-if="sortField === 'component'" class="sort-icon">{{
                  sortDirection === "asc" ? "▲" : "▼"
                }}</span>
              </th>
              <th
                @click="sortBy('severity')"
                :class="{ sorted: sortField === 'severity' }"
              >
                {{ t("monitoring.errorLog.columns.severity", "Schweregrad") }}
                <span v-if="sortField === 'severity'" class="sort-icon">{{
                  sortDirection === "asc" ? "▲" : "▼"
                }}</span>
              </th>
              <th>
                {{ t("monitoring.errorLog.columns.message", "Nachricht") }}
              </th>
              <th>
                {{ t("monitoring.errorLog.columns.actions", "Aktionen") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="error in paginatedErrors"
              :key="error.id"
              :class="{
                'error-critical': error.severity === 'critical',
                'error-high': error.severity === 'high',
                'error-medium': error.severity === 'medium',
                'error-low': error.severity === 'low',
              }"
            >
              <td class="error-timestamp">{{ formatDate(error.timestamp) }}</td>
              <td class="error-feature">
                {{ formatFeatureName(error.feature) }}
              </td>
              <td class="error-component">{{ error.component || "-" }}</td>
              <td class="error-severity">
                <span
                  class="severity-badge"
                  :class="`severity-${error.severity}`"
                >
                  {{
                    t(
                      `monitoring.errorLog.severity.${error.severity}`,
                      error.severity,
                    )
                  }}
                </span>
              </td>
              <td class="error-message">
                <div class="message-content">{{ error.message }}</div>
                <button
                  v-if="error.stack"
                  @click="toggleDetails(error.id)"
                  class="view-details-button"
                >
                  {{
                    detailsVisible[error.id]
                      ? t(
                          "monitoring.errorLog.hideDetails",
                          "Details ausblenden",
                        )
                      : t("monitoring.errorLog.viewDetails", "Details anzeigen")
                  }}
                </button>
                <div
                  v-if="detailsVisible[error.id] && error.stack"
                  class="error-details"
                >
                  <pre>{{ error.stack }}</pre>
                </div>
              </td>
              <td class="error-actions">
                <button
                  @click="markAsResolved(error.id)"
                  class="action-button action-resolve"
                >
                  {{ t("monitoring.errorLog.resolve", "Erledigt") }}
                </button>
                <button
                  @click="createAlert(error)"
                  class="action-button action-alert"
                >
                  {{ t("monitoring.errorLog.alert", "Warnung") }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filteredErrors.length > itemsPerPage" class="pagination">
        <button
          @click="currentPage = Math.max(1, currentPage - 1)"
          :disabled="currentPage === 1"
          class="pagination-button"
        >
          &laquo; {{ t("monitoring.errorLog.previous", "Zurück") }}
        </button>
        <span class="pagination-info">
          {{ t("monitoring.errorLog.page", "Seite") }} {{ currentPage }} /
          {{ totalPages }}
        </span>
        <button
          @click="currentPage = Math.min(totalPages, currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="pagination-button"
        >
          {{ t("monitoring.errorLog.next", "Weiter") }} &raquo;
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "@/composables/useI18n";
import { useMonitoringStore } from "@/stores/monitoringStore";

// Props
interface Error {
  id: string;
  timestamp: Date;
  feature: string;
  component?: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  stack?: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
  resolved?: boolean;
}

interface ErrorLogProps {
  errors: Error[];
}

const props = defineProps<ErrorLogProps>();

// Composables
const { t } = useI18n();
const monitoringStore = useMonitoringStore();

// State
const searchQuery = ref<string>("");
const selectedFeature = ref<string>("");
const selectedSeverity = ref<string>("");
const sortField = ref<string>("timestamp");
const sortDirection = ref<"asc" | "desc">("desc");
const currentPage = ref<number>(1);
const itemsPerPage = ref<number>(15);
const detailsVisible = ref<Record<string, boolean>>({});

// Computed
const availableFeatures = computed(() => {
<<<<<<< HEAD
  return [...new Set(props.errors.map(error) => error.feature))];
=======
  return [...new Set(props.errors.map((error) => error.feature))];
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
});

const filteredErrors = computed(() => {
  let result = [...props.errors];

  // Nach Suchbegriff filtern
  if (searchQuery.value) {
    const lowerQuery = searchQuery.value.toLowerCase();
<<<<<<< HEAD
    result = result.filter(error) => {
=======
    result = result.filter((error) => {
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      return (
        error.message.toLowerCase().includes(lowerQuery) ||
        error.feature.toLowerCase().includes(lowerQuery) ||
        (error.component && error.component.toLowerCase().includes(lowerQuery))
      );
    });
  }

  // Nach Feature filtern
  if (selectedFeature.value) {
<<<<<<< HEAD
    result = result.filter(error) => error.feature === selectedFeature.value);
=======
    result = result.filter((error) => error.feature === selectedFeature.value);
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
  }

  // Nach Schweregrad filtern
  if (selectedSeverity.value) {
    result = result.filter(
      (error) => error.severity === selectedSeverity.value,
    );
  }

  // Sortieren
  result.sort((a, b) => {
    let comparison = 0;

    switch (sortField.value) {
      case "timestamp":
        comparison = a.timestamp.getTime() - b.timestamp.getTime();
        break;
      case "feature":
        comparison = a.feature.localeCompare(b.feature);
        break;
      case "component":
        comparison = (a.component || "").localeCompare(b.component || "");
        break;
      case "severity":
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        comparison = severityOrder[a.severity] - severityOrder[b.severity];
        break;
      default:
        comparison = 0;
    }

    return sortDirection.value === "asc" ? comparison : -comparison;
  });

  return result;
});

const totalPages = computed(() => {
  return Math.ceil(filteredErrors.value.length / itemsPerPage.value);
});

const paginatedErrors = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage.value;
  const endIndex = startIndex + itemsPerPage.value;
  return filteredErrors.value.slice(startIndex, endIndex);
});

// Methoden
function sortBy(field: string) {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  } else {
    sortField.value = field;
    sortDirection.value = "asc";
  }
}

function toggleDetails(errorId: string) {
  detailsVisible.value = {
    ...detailsVisible.value,
    [errorId]: !detailsVisible.value[errorId],
  };
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatFeatureName(feature: string): string {
  return feature
    .replace(/^use/, "")
    .replace(/([A-Z])/g, " $1")
    .trim();
}

function markAsResolved(errorId: string) {
  monitoringStore.markErrorAsResolved(errorId);
}

function createAlert(error: Error) {
  monitoringStore.createAlertFromError(error);
}

// Watchs
watch([searchQuery, selectedFeature, selectedSeverity], () => {
  currentPage.value = 1;
});
</script>

<style scoped>
.error-log {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.error-log-header {
  margin-bottom: 20px;
}

.error-log-header h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.2rem;
  color: #555;
}

.error-log-controls {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.search-container {
  flex: 1;
  min-width: 200px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.filter-container {
  display: flex;
  gap: 10px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  font-size: 0.9rem;
}

.error-table-container {
  overflow-x: auto;
  border-radius: 6px;
  border: 1px solid #eee;
}

.error-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.error-table th {
  text-align: left;
  padding: 12px 15px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}

.error-table th.sorted {
  background-color: #f0f0f0;
}

.sort-icon {
  display: inline-block;
  margin-left: 5px;
  font-size: 0.8rem;
}

.error-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
  vertical-align: top;
}

.error-table tr:last-child td {
  border-bottom: none;
}

.error-timestamp {
  white-space: nowrap;
  color: #666;
  font-size: 0.85rem;
}

.error-feature {
  font-weight: 500;
}

.error-component {
  color: #666;
  font-size: 0.85rem;
}

.error-severity {
  white-space: nowrap;
}

.severity-badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.severity-critical {
  background-color: #fee2e2;
  color: #dc2626;
}

.severity-high {
  background-color: #fff7ed;
  color: #ea580c;
}

.severity-medium {
  background-color: #fffbeb;
  color: #d97706;
}

.severity-low {
  background-color: #f0f9ff;
  color: #0ea5e9;
}

.error-message {
  line-height: 1.4;
}

.message-content {
  margin-bottom: 8px;
}

.view-details-button {
  background: none;
  border: none;
  color: #3b82f6;
  padding: 0;
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
}

.error-details {
  margin-top: 10px;
  background-color: #f9fafb;
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  color: #666;
  max-height: 200px;
  overflow-y: auto;
}

.error-actions {
  white-space: nowrap;
}

.action-button {
  padding: 6px 10px;
  margin-right: 5px;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
}

.action-resolve {
  background-color: #dcfce7;
  color: #16a34a;
}

.action-resolve:hover {
  background-color: #bbf7d0;
}

.action-alert {
  background-color: #fef3c7;
  color: #d97706;
}

.action-alert:hover {
  background-color: #fde68a;
}

.error-critical {
  background-color: rgba(254, 242, 242, 0.3);
}

.error-high {
  background-color: rgba(255, 247, 237, 0.3);
}

.no-errors {
  text-align: center;
  padding: 30px;
  color: #666;
  font-style: italic;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  color: #666;
}

@media (max-width: 768px) {
  .error-log-controls {
    flex-direction: column;
  }

  .filter-container {
    flex-direction: column;
  }

  .error-table th,
  .error-table td {
    padding: 8px 10px;
  }

  .error-actions {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .action-button {
    margin-right: 0;
  }
}
</style>
