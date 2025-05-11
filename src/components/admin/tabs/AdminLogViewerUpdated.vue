<template>
  <div class="admin-log-viewer">
    <h2 class="admin-log-viewer__title">
      {{ t("admin.logViewer.title", "Systemprotokoll") }}
    </h2>
    <p class="admin-log-viewer__description">
      {{
        t(
          "admin.logViewer.description",
          "Verwalten und überwachen Sie Systemprotokolle.",
        )
      }}
    </p>

    <!-- Controls -->
    <div class="admin-log-viewer__controls">
      <div class="admin-log-viewer__search">
        <div class="admin-log-viewer__search-input-container">
          <i
            class="fas fa-search admin-log-viewer__search-icon"
            aria-hidden="true"
          ></i>
          <input
            v-model="searchQuery"
            type="text"
            class="admin-log-viewer__search-input"
            :placeholder="
              t(
                'admin.logViewer.search.placeholder',
                'Protokolle durchsuchen...',
              )
            "
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="admin-log-viewer__search-clear"
            aria-label="Suche zurücksetzen"
          >
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <div class="admin-log-viewer__filters">
        <div class="admin-log-viewer__filter">
          <label for="log-level-filter" class="admin-log-viewer__filter-label">
            {{ t("admin.logViewer.filter.level", "Log-Level:") }}
          </label>
          <select
            id="log-level-filter"
            v-model="selectedLevel"
            class="admin-log-viewer__filter-select"
          >
            <option value="">
              {{ t("admin.logViewer.filter.allLevels", "Alle Level") }}
            </option>
            <option value="error">
              {{ t("admin.logViewer.level.error", "Fehler") }}
            </option>
            <option value="warn">
              {{ t("admin.logViewer.level.warn", "Warnung") }}
            </option>
            <option value="info">
              {{ t("admin.logViewer.level.info", "Info") }}
            </option>
            <option value="debug">
              {{ t("admin.logViewer.level.debug", "Debug") }}
            </option>
          </select>
        </div>

        <div class="admin-log-viewer__filter">
          <label for="component-filter" class="admin-log-viewer__filter-label">
            {{ t("admin.logViewer.filter.component", "Komponente:") }}
          </label>
          <select
            id="component-filter"
            v-model="selectedComponent"
            class="admin-log-viewer__filter-select"
          >
            <option value="">
              {{
                t("admin.logViewer.filter.allComponents", "Alle Komponenten")
              }}
            </option>
            <option
              v-for="component in availableComponents"
              :key="component"
              :value="component"
            >
              {{ component }}
            </option>
          </select>
        </div>

        <div class="admin-log-viewer__filter">
          <label for="date-filter" class="admin-log-viewer__filter-label">
            {{ t("admin.logViewer.filter.date", "Zeitraum:") }}
          </label>
          <select
            id="date-filter"
            v-model="selectedTimeRange"
            class="admin-log-viewer__filter-select"
          >
            <option value="1h">
              {{ t("admin.logViewer.filter.lastHour", "Letzte Stunde") }}
            </option>
            <option value="24h">
              {{ t("admin.logViewer.filter.last24Hours", "Letzte 24 Stunden") }}
            </option>
            <option value="7d">
              {{ t("admin.logViewer.filter.lastWeek", "Letzte Woche") }}
            </option>
            <option value="30d">
              {{ t("admin.logViewer.filter.lastMonth", "Letzter Monat") }}
            </option>
            <option value="custom">
              {{ t("admin.logViewer.filter.custom", "Benutzerdefiniert") }}
            </option>
          </select>
        </div>

        <div
          v-if="selectedTimeRange === 'custom'"
          class="admin-log-viewer__custom-date-range"
        >
          <div class="admin-log-viewer__date-input">
            <label for="start-date" class="admin-log-viewer__filter-label">
              {{ t("admin.logViewer.filter.startDate", "Von:") }}
            </label>
            <input
              id="start-date"
              v-model="customStartDate"
              type="datetime-local"
              class="admin-log-viewer__date-input-field"
            />
          </div>
          <div class="admin-log-viewer__date-input">
            <label for="end-date" class="admin-log-viewer__filter-label">
              {{ t("admin.logViewer.filter.endDate", "Bis:") }}
            </label>
            <input
              id="end-date"
              v-model="customEndDate"
              type="datetime-local"
              class="admin-log-viewer__date-input-field"
            />
          </div>
        </div>
      </div>

      <div class="admin-log-viewer__actions">
        <button
          @click="refreshLogs"
          class="admin-log-viewer__action-button admin-log-viewer__action-button--primary"
          :disabled="isLoading"
        >
          <i
            v-if="isLoading"
            class="fas fa-spinner fa-spin"
            aria-hidden="true"
          ></i>
          <i v-else class="fas fa-sync-alt" aria-hidden="true"></i>
          {{ t("admin.logViewer.actions.refresh", "Aktualisieren") }}
        </button>
        <button
          @click="exportLogs"
          class="admin-log-viewer__action-button admin-log-viewer__action-button--secondary"
          :disabled="isLoading || logs.length === 0"
        >
          <i class="fas fa-file-export" aria-hidden="true"></i>
          {{ t("admin.logViewer.actions.export", "Exportieren") }}
        </button>
        <button
          @click="clearLogs"
          class="admin-log-viewer__action-button admin-log-viewer__action-button--danger"
          :disabled="isLoading || logs.length === 0"
        >
          <i class="fas fa-trash-alt" aria-hidden="true"></i>
          {{ t("admin.logViewer.actions.clear", "Löschen") }}
        </button>
      </div>
    </div>

    <!-- Log Table -->
    <div class="admin-log-viewer__content">
      <div v-if="isLoading" class="admin-log-viewer__loading">
        <i
          class="fas fa-spinner fa-spin admin-log-viewer__loading-icon"
          aria-hidden="true"
        ></i>
        <p>
          {{ t("admin.logViewer.loading", "Protokolle werden geladen...") }}
        </p>
      </div>

      <div v-else-if="logs.length === 0" class="admin-log-viewer__empty">
        <i
          class="fas fa-file-alt admin-log-viewer__empty-icon"
          aria-hidden="true"
        ></i>
        <p>
          {{ t("admin.logViewer.noLogs", "Keine Protokolleinträge gefunden.") }}
        </p>
        <button
          v-if="hasFilters"
          @click="clearFilters"
          class="admin-log-viewer__clear-filters"
        >
          {{ t("admin.logViewer.clearFilters", "Filter zurücksetzen") }}
        </button>
      </div>

      <div v-else class="admin-log-viewer__table-container">
        <table class="admin-log-viewer__table">
          <thead>
            <tr>
              <th
                @click="sortBy('timestamp')"
                :class="{ sorted: sortField === 'timestamp' }"
              >
                {{ t("admin.logViewer.table.timestamp", "Zeitpunkt") }}
                <i
                  v-if="sortField === 'timestamp'"
                  class="fas"
                  :class="
                    sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down'
                  "
                  aria-hidden="true"
                ></i>
              </th>
              <th
                @click="sortBy('level')"
                :class="{ sorted: sortField === 'level' }"
              >
                {{ t("admin.logViewer.table.level", "Level") }}
                <i
                  v-if="sortField === 'level'"
                  class="fas"
                  :class="
                    sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down'
                  "
                  aria-hidden="true"
                ></i>
              </th>
              <th
                @click="sortBy('component')"
                :class="{ sorted: sortField === 'component' }"
              >
                {{ t("admin.logViewer.table.component", "Komponente") }}
                <i
                  v-if="sortField === 'component'"
                  class="fas"
                  :class="
                    sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down'
                  "
                  aria-hidden="true"
                ></i>
              </th>
              <th class="admin-log-viewer__table-header--message">
                {{ t("admin.logViewer.table.message", "Nachricht") }}
              </th>
              <th>{{ t("admin.logViewer.table.actions", "Aktionen") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in logs"
              :key="log.id"
              :class="{
                'log-error': log.level === 'error',
                'log-warn': log.level === 'warn',
                'log-info': log.level === 'info',
                'log-debug': log.level === 'debug',
              }"
            >
              <td
                class="admin-log-viewer__table-cell admin-log-viewer__table-cell--timestamp"
              >
                {{ formatDate(log.timestamp) }}
              </td>
              <td
                class="admin-log-viewer__table-cell admin-log-viewer__table-cell--level"
              >
                <span
                  class="log-level-badge"
                  :class="`log-level-badge--${log.level}`"
                >
                  {{ t(`admin.logViewer.level.${log.level}`, log.level) }}
                </span>
              </td>
              <td
                class="admin-log-viewer__table-cell admin-log-viewer__table-cell--component"
              >
                {{ log.component }}
              </td>
              <td
                class="admin-log-viewer__table-cell admin-log-viewer__table-cell--message"
              >
                <div class="log-message-content">{{ log.message }}</div>
                <button
                  v-if="log.details"
                  @click="toggleDetails(log.id)"
                  class="view-details-button"
                >
                  {{
                    detailsVisible[log.id]
                      ? t("admin.logViewer.hideDetails", "Details ausblenden")
                      : t("admin.logViewer.viewDetails", "Details anzeigen")
                  }}
                </button>
                <div
                  v-if="detailsVisible[log.id] && log.details"
                  class="log-details"
                >
                  <pre>{{ log.details }}</pre>
                </div>
              </td>
              <td
                class="admin-log-viewer__table-cell admin-log-viewer__table-cell--actions"
              >
                <button
                  @click="copyToClipboard(log)"
                  class="admin-log-viewer__action-button-small admin-log-viewer__action-button-small--copy"
                  :title="
                    t(
                      'admin.logViewer.actions.copy',
                      'In Zwischenablage kopieren',
                    )
                  "
                >
                  <i class="fas fa-copy" aria-hidden="true"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="admin-log-viewer__pagination">
        <button
          @click="prevPage"
          :disabled="currentPage === 1"
          class="admin-log-viewer__pagination-button"
        >
          <i class="fas fa-chevron-left" aria-hidden="true"></i>
          {{ t("admin.logViewer.pagination.previous", "Zurück") }}
        </button>
        <span class="admin-log-viewer__pagination-info">
          {{ t("admin.logViewer.pagination.page", "Seite") }}
          {{ currentPage }} / {{ totalPages }}
        </span>
        <button
          @click="nextPage"
          :disabled="currentPage === totalPages"
          class="admin-log-viewer__pagination-button"
        >
          {{ t("admin.logViewer.pagination.next", "Weiter") }}
          <i class="fas fa-chevron-right" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@/composables/useToast";
import { useDialog } from "@/composables/useDialog";
import { logService, type LogEntry } from "@/services/api/LogServiceWrapper";

// i18n
const { t } = useI18n();
const { showToast } = useToast();
const { showConfirmDialog } = useDialog();

// State
const logs = ref<LogEntry[]>([]);
const isLoading = ref(false);
const searchQuery = ref("");
const selectedLevel = ref("");
const selectedComponent = ref("");
const selectedTimeRange = ref("24h");
const customStartDate = ref("");
const customEndDate = ref("");
const sortField = ref("timestamp");
const sortDirection = ref<"asc" | "desc">("desc");
const currentPage = ref(1);
const itemsPerPage = ref(20);
const totalItems = ref(0);
const totalPages = ref(1);
const detailsVisible = ref<Record<string, boolean>>({});

// Computed values
const availableComponents = computed(() => {
  return [...new Set(logs.value.map((log) => log.component))];
});

const hasFilters = computed(() => {
  return (
    searchQuery.value !== "" ||
    selectedLevel.value !== "" ||
    selectedComponent.value !== "" ||
    selectedTimeRange.value === "custom"
  );
});

const timeRangeStart = computed(() => {
  const now = Date.now();

  switch (selectedTimeRange.value) {
    case "1h":
      return now - 60 * 60 * 1000;
    case "24h":
      return now - 24 * 60 * 60 * 1000;
    case "7d":
      return now - 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return now - 30 * 24 * 60 * 60 * 1000;
    case "custom":
      return customStartDate.value
        ? new Date(customStartDate.value).getTime()
        : 0;
    default:
      return now - 24 * 60 * 60 * 1000; // Default to 24h
  }
});

const timeRangeEnd = computed(() => {
  if (selectedTimeRange.value === "custom" && customEndDate.value) {
    return new Date(customEndDate.value).getTime();
  }
  return Date.now();
});

// Methods
function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

function sortBy(field: string) {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  } else {
    sortField.value = field;
    sortDirection.value = "asc";
  }
}

function toggleDetails(logId: string) {
  detailsVisible.value = {
    ...detailsVisible.value,
    [logId]: !detailsVisible.value[logId],
  };
}

function clearFilters() {
  searchQuery.value = "";
  selectedLevel.value = "";
  selectedComponent.value = "";
  selectedTimeRange.value = "24h";
  customStartDate.value = "";
  customEndDate.value = "";
  currentPage.value = 1;
  refreshLogs();
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    fetchLogs();
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    fetchLogs();
  }
}

async function refreshLogs() {
  isLoading.value = true;

  try {
    currentPage.value = 1; // Zurück zur ersten Seite bei Aktualisierung
    await fetchLogs();

    showToast({
      type: "success",
      title: t("admin.logViewer.toast.refreshSuccess", "Aktualisiert"),
      message: t(
        "admin.logViewer.toast.refreshSuccessMessage",
        "Die Protokolle wurden erfolgreich aktualisiert",
      ),
    });
  } catch (error) {
    console.error("Error refreshing logs:", error);

    showToast({
      type: "error",
      title: t("admin.logViewer.toast.refreshError", "Fehler"),
      message: t(
        "admin.logViewer.toast.refreshErrorMessage",
        "Fehler beim Aktualisieren der Protokolle",
      ),
    });
  } finally {
    isLoading.value = false;
  }
}

async function fetchLogs() {
  try {
    const params = {
      level: selectedLevel.value || undefined,
      component: selectedComponent.value || undefined,
      startTime: timeRangeStart.value,
      endTime: timeRangeEnd.value,
      search: searchQuery.value || undefined,
      page: currentPage.value,
      pageSize: itemsPerPage.value,
    };

    const response = await logService.getLogs(params);

    logs.value = response.logs;
    totalItems.value = response.total;
    totalPages.value = response.totalPages;

    // Aktualisiere Paginierungszustand
    currentPage.value = response.page;
    itemsPerPage.value = response.pageSize;

    return response;
  } catch (error) {
    console.error("Error fetching logs:", error);
    showToast({
      type: "error",
      title: t("admin.logViewer.toast.fetchError", "Fehler"),
      message:
        error.message ||
        t(
          "admin.logViewer.toast.fetchErrorMessage",
          "Fehler beim Laden der Protokolle",
        ),
    });

    // Leere Log-Liste anzeigen
    logs.value = [];
    totalItems.value = 0;
    totalPages.value = 1;

    throw error;
  }
}

async function clearLogs() {
  // Confirm before clearing
  const confirmed = await showConfirmDialog({
    title: t("admin.logViewer.confirm.clearTitle", "Protokolle löschen"),
    message: t(
      "admin.logViewer.confirm.clearMessage",
      "Sind Sie sicher, dass Sie alle Protokolle löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.",
    ),
    confirmText: t("admin.logViewer.confirm.clearConfirm", "Löschen"),
    cancelText: t("admin.logViewer.confirm.clearCancel", "Abbrechen"),
  });

  if (!confirmed) return;

  isLoading.value = true;

  try {
    await logService.clearLogs();

    // Zurücksetzen des Zustands
    logs.value = [];
    totalItems.value = 0;
    totalPages.value = 1;
    currentPage.value = 1;

    showToast({
      type: "success",
      title: t("admin.logViewer.toast.clearSuccess", "Gelöscht"),
      message: t(
        "admin.logViewer.toast.clearSuccessMessage",
        "Die Protokolle wurden erfolgreich gelöscht",
      ),
    });
  } catch (error) {
    console.error("Error clearing logs:", error);

    showToast({
      type: "error",
      title: t("admin.logViewer.toast.clearError", "Fehler"),
      message:
        error.message ||
        t(
          "admin.logViewer.toast.clearErrorMessage",
          "Fehler beim Löschen der Protokolle",
        ),
    });
  } finally {
    isLoading.value = false;
  }
}

async function exportLogs() {
  isLoading.value = true;

  try {
    // Bereite Filter für Export vor
    const filter = {
      level: selectedLevel.value || undefined,
      component: selectedComponent.value || undefined,
      startTime: timeRangeStart.value,
      endTime: timeRangeEnd.value,
      search: searchQuery.value || undefined,
    };

    // Verwende den LogServiceWrapper für den Export
    const blob = await logService.exportLogs(filter);

    // Erstelle Download-Link
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();

    // Aufräumen
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast({
      type: "success",
      title: t("admin.logViewer.toast.exportSuccess", "Exportiert"),
      message: t(
        "admin.logViewer.toast.exportSuccessMessage",
        "Die Protokolle wurden erfolgreich exportiert",
      ),
    });
  } catch (error) {
    console.error("Error exporting logs:", error);

    showToast({
      type: "error",
      title: t("admin.logViewer.toast.exportError", "Fehler"),
      message:
        error.message ||
        t(
          "admin.logViewer.toast.exportErrorMessage",
          "Fehler beim Exportieren der Protokolle",
        ),
    });
  } finally {
    isLoading.value = false;
  }
}

function copyToClipboard(log: LogEntry) {
  try {
    const text = `[${formatDate(log.timestamp)}] [${log.level.toUpperCase()}] [${log.component}] ${log.message}${log.details ? "\n" + log.details : ""}`;
    navigator.clipboard.writeText(text);

    showToast({
      type: "success",
      title: t("admin.logViewer.toast.copySuccess", "Kopiert"),
      message: t(
        "admin.logViewer.toast.copySuccessMessage",
        "Der Protokolleintrag wurde in die Zwischenablage kopiert",
      ),
    });
  } catch (error) {
    console.error("Error copying to clipboard:", error);

    showToast({
      type: "error",
      title: t("admin.logViewer.toast.copyError", "Fehler"),
      message: t(
        "admin.logViewer.toast.copyErrorMessage",
        "Fehler beim Kopieren in die Zwischenablage",
      ),
    });
  }
}

// Watchers
watch(
  [
    searchQuery,
    selectedLevel,
    selectedComponent,
    selectedTimeRange,
    customStartDate,
    customEndDate,
  ],
  () => {
    currentPage.value = 1;
    refreshLogs(); // Lade Logs neu, wenn Filter geändert werden
  },
);

// Lifecycle hooks
onMounted(async () => {
  await refreshLogs();
});
</script>

<style scoped>
.admin-log-viewer {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
}

.admin-log-viewer__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.admin-log-viewer__description {
  margin: 0.5rem 0 0 0;
  color: var(--n-color-text-secondary);
  line-height: 1.5;
}

/* Controls */
.admin-log-viewer__controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  border: 1px solid var(--n-color-border);
}

.admin-log-viewer__search {
  width: 100%;
}

.admin-log-viewer__search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.admin-log-viewer__search-icon {
  position: absolute;
  left: 0.75rem;
  color: var(--n-color-text-tertiary);
}

.admin-log-viewer__search-input {
  width: 100%;
  padding: 0.5rem 2.5rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  font-size: 0.9rem;
}

.admin-log-viewer__search-clear {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  color: var(--n-color-text-tertiary);
  cursor: pointer;
  padding: 0;
  font-size: 0.9rem;
}

.admin-log-viewer__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
}

.admin-log-viewer__filter {
  flex: 1;
  min-width: 150px;
}

.admin-log-viewer__filter-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--n-color-text-secondary);
}

.admin-log-viewer__filter-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  font-size: 0.9rem;
}

.admin-log-viewer__custom-date-range {
  display: flex;
  gap: 1rem;
  width: 100%;
  margin-top: 0.5rem;
}

.admin-log-viewer__date-input {
  flex: 1;
}

.admin-log-viewer__date-input-field {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  font-size: 0.9rem;
}

.admin-log-viewer__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.admin-log-viewer__action-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: var(--n-border-radius);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.admin-log-viewer__action-button--primary {
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
}

.admin-log-viewer__action-button--primary:hover {
  background-color: var(--n-color-primary-dark);
}

.admin-log-viewer__action-button--secondary {
  background-color: var(--n-color-background);
  border: 1px solid var(--n-color-primary);
  color: var(--n-color-primary);
}

.admin-log-viewer__action-button--secondary:hover {
  background-color: var(--n-color-hover);
}

.admin-log-viewer__action-button--danger {
  background-color: var(--n-color-background);
  border: 1px solid var(--n-color-error);
  color: var(--n-color-error);
}

.admin-log-viewer__action-button--danger:hover {
  background-color: rgba(var(--n-color-error-rgb), 0.1);
}

.admin-log-viewer__action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Content */
.admin-log-viewer__content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.admin-log-viewer__loading,
.admin-log-viewer__empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex: 1;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--n-color-text-tertiary);
}

.admin-log-viewer__loading-icon,
.admin-log-viewer__empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.admin-log-viewer__clear-filters {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: transparent;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  color: var(--n-color-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.admin-log-viewer__clear-filters:hover {
  background-color: var(--n-color-hover);
  border-color: var(--n-color-primary);
}

.admin-log-viewer__table-container {
  overflow: auto;
  flex: 1;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
}

.admin-log-viewer__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.admin-log-viewer__table th {
  position: sticky;
  top: 0;
  background-color: var(--n-color-background-alt);
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--n-color-text-primary);
  border-bottom: 1px solid var(--n-color-border);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.admin-log-viewer__table th.sorted {
  background-color: rgba(var(--n-color-primary-rgb), 0.05);
}

.admin-log-viewer__table th.admin-log-viewer__table-header--message {
  cursor: default;
}

.admin-log-viewer__table th i {
  margin-left: 0.25rem;
  font-size: 0.8rem;
}

.admin-log-viewer__table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--n-color-border);
  vertical-align: top;
}

.admin-log-viewer__table tr:hover {
  background-color: var(--n-color-hover);
}

.admin-log-viewer__table tr.log-error {
  background-color: rgba(var(--n-color-error-rgb), 0.05);
}

.admin-log-viewer__table tr.log-warn {
  background-color: rgba(var(--n-color-warning-rgb), 0.05);
}

.admin-log-viewer__table-cell--timestamp {
  white-space: nowrap;
  font-size: 0.85rem;
  color: var(--n-color-text-secondary);
}

.admin-log-viewer__table-cell--level {
  white-space: nowrap;
}

.admin-log-viewer__table-cell--component {
  white-space: nowrap;
  font-weight: 500;
}

.admin-log-viewer__table-cell--message {
  max-width: 50vw;
  overflow-wrap: break-word;
}

.admin-log-viewer__table-cell--actions {
  white-space: nowrap;
  text-align: right;
}

.log-level-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.log-level-badge--error {
  background-color: rgba(var(--n-color-error-rgb), 0.1);
  color: var(--n-color-error);
}

.log-level-badge--warn {
  background-color: rgba(var(--n-color-warning-rgb), 0.1);
  color: var(--n-color-warning);
}

.log-level-badge--info {
  background-color: rgba(var(--n-color-info-rgb), 0.1);
  color: var(--n-color-info);
}

.log-level-badge--debug {
  background-color: rgba(var(--n-color-text-tertiary-rgb), 0.1);
  color: var(--n-color-text-tertiary);
}

.log-message-content {
  margin-bottom: 0.5rem;
}

.view-details-button {
  background: none;
  border: none;
  color: var(--n-color-primary);
  padding: 0;
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
}

.log-details {
  margin-top: 0.5rem;
  background-color: var(--n-color-background-alt);
  padding: 0.75rem;
  border-radius: var(--n-border-radius);
  font-family: monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  color: var(--n-color-text-secondary);
  max-height: 200px;
  overflow-y: auto;
}

.admin-log-viewer__action-button-small {
  background: none;
  border: none;
  color: var(--n-color-text-tertiary);
  padding: 0.25rem;
  cursor: pointer;
  border-radius: var(--n-border-radius);
  transition: all 0.2s;
}

.admin-log-viewer__action-button-small:hover {
  background-color: var(--n-color-hover);
  color: var(--n-color-text-primary);
}

.admin-log-viewer__action-button-small--copy:hover {
  color: var(--n-color-primary);
}

/* Pagination */
.admin-log-viewer__pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
}

.admin-log-viewer__pagination-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.admin-log-viewer__pagination-button:hover {
  background-color: var(--n-color-hover);
}

.admin-log-viewer__pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.admin-log-viewer__pagination-info {
  color: var(--n-color-text-secondary);
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .admin-log-viewer__filters,
  .admin-log-viewer__custom-date-range,
  .admin-log-viewer__actions {
    flex-direction: column;
  }

  .admin-log-viewer__filter {
    width: 100%;
  }

  .admin-log-viewer__action-button {
    width: 100%;
  }

  .admin-log-viewer__table th,
  .admin-log-viewer__table td {
    padding: 0.5rem;
  }

  .admin-log-viewer__table-cell--message {
    max-width: 200px;
  }
}
</style>
