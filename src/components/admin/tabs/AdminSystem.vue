<template>
  <div class="admin-system">
    <h2 class="admin-system__title">
      {{ t("admin.system.title", "Systemeinstellungen") }}
    </h2>
    <p class="admin-system__description">
      {{
        t(
          "admin.system.description",
          "Überwachen und konfigurieren Sie Systemeinstellungen und -ressourcen.",
        )
      }}
    </p>

    <!-- System Health Status -->
    <div class="admin-system__status-card" :class="systemHealthClass">
      <div class="admin-system__status-icon">
        <i class="fas" :class="systemHealthIcon" aria-hidden="true"></i>
      </div>
      <div class="admin-system__status-content">
        <h3 class="admin-system__status-title">
          {{ t("admin.system.healthStatus", "Systemstatus") }}
        </h3>
        <p class="admin-system__status-value">{{ systemHealthText }}</p>
        <p class="admin-system__status-details" v-if="systemHealthDetails">
          {{ systemHealthDetails }}
        </p>
      </div>
    </div>

    <!-- System Resource Metrics -->
    <div class="admin-system__metrics">
      <h3 class="admin-system__section-title">
        {{ t("admin.system.resourceMetrics", "Ressourcennutzung") }}
      </h3>

      <div class="admin-system__metrics-grid">
        <!-- CPU Usage -->
        <div class="admin-system__metric-card">
          <div class="admin-system__metric-header">
            <div class="admin-system__metric-title">
              <i class="fas fa-microchip" aria-hidden="true"></i>
              <span>{{ t("admin.system.metrics.cpu", "CPU-Auslastung") }}</span>
            </div>
            <div
              class="admin-system__metric-status"
              :class="`admin-system__metric-status--${cpuStatus}`"
              :title="getStatusText(cpuStatus)"
            ></div>
          </div>

          <div class="admin-system__meter-container">
            <div class="admin-system__meter">
              <div
                class="admin-system__meter-fill"
                :class="`admin-system__meter-fill--${cpuStatus}`"
                :style="{ width: `${stats.cpu_usage_percent || 0}%` }"
              ></div>
            </div>
            <div class="admin-system__meter-value">
              {{ stats.cpu_usage_percent || 0 }}%
            </div>
          </div>
        </div>

        <!-- Memory Usage -->
        <div class="admin-system__metric-card">
          <div class="admin-system__metric-header">
            <div class="admin-system__metric-title">
              <i class="fas fa-memory" aria-hidden="true"></i>
              <span>{{
                t("admin.system.metrics.memory", "Speicherauslastung")
              }}</span>
            </div>
            <div
              class="admin-system__metric-status"
              :class="`admin-system__metric-status--${memoryStatus}`"
              :title="getStatusText(memoryStatus)"
            ></div>
          </div>

          <div class="admin-system__meter-container">
            <div class="admin-system__meter">
              <div
                class="admin-system__meter-fill"
                :class="`admin-system__meter-fill--${memoryStatus}`"
                :style="{ width: `${stats.memory_usage_percent || 0}%` }"
              ></div>
            </div>
            <div class="admin-system__meter-value">
              {{ stats.memory_usage_percent || 0 }}%
            </div>
          </div>
        </div>

        <!-- Database Size -->
        <div class="admin-system__metric-card">
          <div class="admin-system__metric-header">
            <div class="admin-system__metric-title">
              <i class="fas fa-database" aria-hidden="true"></i>
              <span>{{
                t("admin.system.metrics.database", "Datenbankgröße")
              }}</span>
            </div>
          </div>

          <div class="admin-system__metric-value-large">
            {{ stats.database_size_mb || 0 }} MB
          </div>
        </div>

        <!-- Cache -->
        <div class="admin-system__metric-card">
          <div class="admin-system__metric-header">
            <div class="admin-system__metric-title">
              <i class="fas fa-bolt" aria-hidden="true"></i>
              <span>{{ t("admin.system.metrics.cache", "Cache") }}</span>
            </div>
          </div>

          <div class="admin-system__metric-values">
            <div class="admin-system__metric-value-item">
              <span>{{ t("admin.system.metrics.cacheSize", "Größe:") }}</span>
              <strong>{{ stats.cache_size_mb || 0 }} MB</strong>
            </div>
            <div class="admin-system__metric-value-item">
              <span>{{
                t("admin.system.metrics.cacheHitRate", "Trefferrate:")
              }}</span>
              <strong>{{ stats.cache_hit_rate || 0 }}%</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- System Information -->
    <div class="admin-system__info">
      <h3 class="admin-system__section-title">
        {{ t("admin.system.information", "Systeminformationen") }}
      </h3>

      <div class="admin-system__info-grid">
        <div class="admin-system__info-card">
          <div class="admin-system__info-title">
            <i class="fas fa-clock" aria-hidden="true"></i>
            <span>{{ t("admin.system.info.uptime", "Betriebszeit") }}</span>
          </div>
          <div class="admin-system__info-value">
            {{ stats.uptime_days || 0 }} {{ t("admin.system.days", "Tage") }}
          </div>
          <div class="admin-system__info-details">
            {{ t("admin.system.info.startTime", "Start:") }}
            {{ formatDate(stats.start_time) }}
          </div>
        </div>

        <div class="admin-system__info-card">
          <div class="admin-system__info-title">
            <i class="fas fa-robot" aria-hidden="true"></i>
            <span>{{
              t("admin.system.info.activeModel", "Aktives Modell")
            }}</span>
          </div>
          <div class="admin-system__info-value">
            {{ stats.active_model || "-" }}
          </div>
          <div class="admin-system__info-details">
            {{ t("admin.system.info.avgResponseTime", "Antwortzeit:") }}
            {{ stats.avg_response_time_ms || 0 }} ms
          </div>
        </div>

        <div class="admin-system__info-card">
          <div class="admin-system__info-title">
            <i class="fas fa-file-alt" aria-hidden="true"></i>
            <span>{{ t("admin.system.info.documents", "Dokumente") }}</span>
          </div>
          <div class="admin-system__info-value">
            {{ stats.document_count || 0 }}
          </div>
        </div>

        <div class="admin-system__info-card">
          <div class="admin-system__info-title">
            <i class="fas fa-comments" aria-hidden="true"></i>
            <span>{{
              t("admin.system.info.interactions", "Interaktionen")
            }}</span>
          </div>
          <div class="admin-system__info-values">
            <div class="admin-system__info-value-item">
              <span>{{ t("admin.system.info.sessions", "Sitzungen:") }}</span>
              <strong>{{ stats.total_sessions || 0 }}</strong>
            </div>
            <div class="admin-system__info-value-item">
              <span>{{ t("admin.system.info.messages", "Nachrichten:") }}</span>
              <strong>{{ stats.total_messages || 0 }}</strong>
            </div>
            <div class="admin-system__info-value-item">
              <span>{{
                t("admin.system.info.messagesPerSession", "Ø pro Sitzung:")
              }}</span>
              <strong>{{ stats.avg_messages_per_session || 0 }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- System Settings -->
    <div class="admin-system__settings">
      <div class="admin-system__settings-header">
        <h3 class="admin-system__section-title">
          {{ t("admin.system.settings.title", "Systemeinstellungen") }}
        </h3>
        <button
          @click="toggleEditMode"
          class="admin-system__toggle-edit-button"
          :class="{ 'admin-system__toggle-edit-button--active': isEditMode }"
        >
          <i
            class="fas"
            :class="isEditMode ? 'fa-times' : 'fa-edit'"
            aria-hidden="true"
          ></i>
          <span>{{
            isEditMode
              ? t("admin.system.settings.cancelEdit", "Abbrechen")
              : t("admin.system.settings.edit", "Bearbeiten")
          }}</span>
        </button>
      </div>

      <form @submit.prevent="saveSettings" class="admin-system__settings-form">
        <div class="admin-system__settings-grid">
          <!-- Model Settings -->
          <fieldset class="admin-system__settings-group">
            <legend>
              {{ t("admin.system.settings.models", "Modelleinstellungen") }}
            </legend>

            <div class="admin-system__setting-item">
              <label for="default-model" class="admin-system__setting-label">
                {{ t("admin.system.settings.defaultModel", "Standardmodell") }}
              </label>
              <select
                id="default-model"
                v-model="systemSettings.defaultModel"
                class="admin-system__setting-select"
                :disabled="!isEditMode"
              >
                <option
                  v-for="model in systemSettings.availableModels"
                  :key="model"
                  :value="model"
                >
                  {{ model }}
                </option>
              </select>
            </div>

            <div class="admin-system__setting-item">
              <label for="max-tokens" class="admin-system__setting-label">
                {{
                  t(
                    "admin.system.settings.maxTokens",
                    "Max. Tokens pro Anfrage",
                  )
                }}
              </label>
              <input
                id="max-tokens"
                v-model.number="systemSettings.maxTokensPerRequest"
                type="number"
                min="1"
                max="32000"
                class="admin-system__setting-input"
                :disabled="!isEditMode"
              />
            </div>
          </fieldset>

          <!-- Rate Limiting Settings -->
          <fieldset class="admin-system__settings-group">
            <legend>
              {{ t("admin.system.settings.rateLimiting", "Rate-Limiting") }}
            </legend>

            <div
              class="admin-system__setting-item admin-system__setting-item--switch"
            >
              <div class="admin-system__setting-switch-label">
                <label for="enable-rate-limit">
                  {{
                    t(
                      "admin.system.settings.enableRateLimit",
                      "Rate-Limiting aktivieren",
                    )
                  }}
                </label>
              </div>
              <label class="admin-system__toggle-switch">
                <input
                  id="enable-rate-limit"
                  type="checkbox"
                  v-model="systemSettings.enableRateLimit"
                  :disabled="!isEditMode"
                />
                <span class="admin-system__toggle-slider"></span>
              </label>
            </div>

            <div
              class="admin-system__setting-item"
              v-if="systemSettings.enableRateLimit"
            >
              <label for="rate-limit" class="admin-system__setting-label">
                {{
                  t(
                    "admin.system.settings.rateLimitPerMinute",
                    "Anfragen pro Minute",
                  )
                }}
              </label>
              <input
                id="rate-limit"
                v-model.number="systemSettings.rateLimitPerMinute"
                type="number"
                min="1"
                max="100"
                class="admin-system__setting-input"
                :disabled="!isEditMode"
              />
            </div>
          </fieldset>

          <!-- Session Settings -->
          <fieldset class="admin-system__settings-group">
            <legend>
              {{ t("admin.system.settings.sessions", "Sitzungen") }}
            </legend>

            <div class="admin-system__setting-item">
              <label for="max-sessions" class="admin-system__setting-label">
                {{
                  t(
                    "admin.system.settings.maxSessionsPerUser",
                    "Max. Sitzungen pro Benutzer",
                  )
                }}
              </label>
              <input
                id="max-sessions"
                v-model.number="systemSettings.maxSessionsPerUser"
                type="number"
                min="1"
                max="100"
                class="admin-system__setting-input"
                :disabled="!isEditMode"
              />
            </div>

            <div class="admin-system__setting-item">
              <label for="session-timeout" class="admin-system__setting-label">
                {{
                  t(
                    "admin.system.settings.sessionTimeout",
                    "Sitzungs-Timeout (Minuten)",
                  )
                }}
              </label>
              <input
                id="session-timeout"
                v-model.number="systemSettings.sessionTimeoutMinutes"
                type="number"
                min="5"
                max="1440"
                class="admin-system__setting-input"
                :disabled="!isEditMode"
              />
            </div>
          </fieldset>

          <!-- Feedback Settings -->
          <fieldset class="admin-system__settings-group">
            <legend>
              {{ t("admin.system.settings.feedback", "Feedback") }}
            </legend>

            <div
              class="admin-system__setting-item admin-system__setting-item--switch"
            >
              <div class="admin-system__setting-switch-label">
                <label for="enable-feedback">
                  {{
                    t(
                      "admin.system.settings.enableFeedback",
                      "Feedback aktivieren",
                    )
                  }}
                </label>
              </div>
              <label class="admin-system__toggle-switch">
                <input
                  id="enable-feedback"
                  type="checkbox"
                  v-model="systemSettings.enableFeedback"
                  :disabled="!isEditMode"
                />
                <span class="admin-system__toggle-slider"></span>
              </label>
            </div>
          </fieldset>

          <!-- Maintenance Settings -->
          <fieldset class="admin-system__settings-group">
            <legend>
              {{ t("admin.system.settings.maintenance", "Wartung") }}
            </legend>

            <div
              class="admin-system__setting-item admin-system__setting-item--switch"
            >
              <div class="admin-system__setting-switch-label">
                <label for="maintenance-mode">
                  {{
                    t("admin.system.settings.maintenanceMode", "Wartungsmodus")
                  }}
                </label>
              </div>
              <label class="admin-system__toggle-switch">
                <input
                  id="maintenance-mode"
                  type="checkbox"
                  v-model="systemSettings.maintenanceMode"
                  :disabled="!isEditMode"
                />
                <span class="admin-system__toggle-slider"></span>
              </label>
            </div>

            <div
              class="admin-system__setting-item"
              v-if="systemSettings.maintenanceMode"
            >
              <label
                for="maintenance-message"
                class="admin-system__setting-label"
              >
                {{
                  t(
                    "admin.system.settings.maintenanceMessage",
                    "Wartungsmeldung",
                  )
                }}
              </label>
              <textarea
                id="maintenance-message"
                v-model="systemSettings.maintenanceMessage"
                class="admin-system__setting-textarea"
                rows="3"
                :disabled="!isEditMode"
              ></textarea>
            </div>
          </fieldset>
        </div>

        <div class="admin-system__settings-actions" v-if="isEditMode">
          <button
            type="button"
            @click="resetSettings"
            class="admin-system__settings-button admin-system__settings-button--cancel"
            :disabled="isSubmitting"
          >
            {{ t("admin.system.settings.reset", "Zurücksetzen") }}
          </button>
          <button
            type="submit"
            class="admin-system__settings-button admin-system__settings-button--save"
            :disabled="isSubmitting"
          >
            <i
              v-if="isSubmitting"
              class="fas fa-spinner fa-spin"
              aria-hidden="true"
            ></i>
            {{ t("admin.system.settings.save", "Speichern") }}
          </button>
        </div>
      </form>
    </div>

    <!-- System Actions -->
    <div class="admin-system__actions">
      <h3 class="admin-system__section-title">
        {{ t("admin.system.actions.title", "Systemaktionen") }}
      </h3>

      <div class="admin-system__actions-grid">
        <div
          v-for="action in availableActions"
          :key="action.type"
          class="admin-system__action-card"
        >
          <div class="admin-system__action-content">
            <h4 class="admin-system__action-title">{{ action.name }}</h4>
            <p class="admin-system__action-description">
              {{ action.description }}
            </p>
          </div>
          <button
            @click="executeAction(action)"
            class="admin-system__action-button"
            :disabled="isActionPending"
          >
            <i
              v-if="isActionPending && pendingAction === action.type"
              class="fas fa-spinner fa-spin"
              aria-hidden="true"
            ></i>
            <span>{{ t("admin.system.actions.execute", "Ausführen") }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmation Dialog -->
    <dialog ref="confirmDialog" class="admin-system__dialog">
      <div class="admin-system__dialog-content">
        <div class="admin-system__dialog-header">
          <h3>{{ confirmDialogTitle }}</h3>
          <button
            @click="closeConfirmDialog"
            class="admin-system__dialog-close"
            aria-label="Schließen"
          >
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>

        <div class="admin-system__dialog-body">
          <i
            class="fas fa-exclamation-triangle admin-system__dialog-icon"
            aria-hidden="true"
          ></i>
          <p class="admin-system__dialog-message">{{ confirmDialogMessage }}</p>
        </div>

        <div class="admin-system__dialog-actions">
          <button
            @click="closeConfirmDialog"
            class="admin-system__dialog-button admin-system__dialog-button--cancel"
            :disabled="isActionPending"
          >
            {{ t("admin.system.dialog.cancel", "Abbrechen") }}
          </button>
          <button
            @click="confirmAction"
            class="admin-system__dialog-button admin-system__dialog-button--confirm"
            :disabled="isActionPending"
          >
            <i
              v-if="isActionPending"
              class="fas fa-spinner fa-spin"
              aria-hidden="true"
            ></i>
            {{ t("admin.system.dialog.confirm", "Bestätigen") }}
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useAdminSystemStore } from "@/stores/admin/system";
import { useToast } from "@/composables/useToast";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { SystemAction } from "@/types/admin";

// i18n
const { t, locale } = useI18n({ useScope: 'global', inheritLocale: true });
console.log('[i18n] Component initialized with global scope and inheritance');

// Stores
const adminSystemStore = useAdminSystemStore();

// Store state
const { stats, availableActions, memoryStatus, cpuStatus, systemHealthStatus } =
  storeToRefs(adminSystemStore);

// Toast notifications
const { showToast } = useToast();

// Dialog refs
const confirmDialog = ref<HTMLDialogElement | null>(null);

// Local state
const isLoading = ref(false);
const isSubmitting = ref(false);
const isActionPending = ref(false);
const pendingAction = ref<string | null>(null);
const confirmDialogTitle = ref("");
const confirmDialogMessage = ref("");
const currentAction = ref<SystemAction | null>(null);
const isEditMode = ref(false);

// System Settings (would typically be loaded from an API)
const originalSettings = ref({
  maxTokensPerRequest: 4096,
  defaultModel: "llama-7b",
  availableModels: ["llama-7b", "llama-13b", "mistral-7b", "mistral-7bq4"],
  enableRateLimit: true,
  rateLimitPerMinute: 30,
  maxSessionsPerUser: 10,
  sessionTimeoutMinutes: 60,
  enableFeedback: true,
  enableLogging: true,
  maintenanceMode: false,
  maintenanceMessage:
    "System wird gewartet und ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.",
});

const systemSettings = ref({ ...originalSettings.value });

// Computed properties
const systemHealthClass = computed(() => {
  switch (systemHealthStatus.value) {
    case "critical":
      return "admin-system__status-card--critical";
    case "warning":
      return "admin-system__status-card--warning";
    default:
      return "admin-system__status-card--normal";
  }
});

const systemHealthIcon = computed(() => {
  switch (systemHealthStatus.value) {
    case "critical":
      return "fa-exclamation-triangle";
    case "warning":
      return "fa-exclamation-circle";
    default:
      return "fa-check-circle";
  }
});

const systemHealthText = computed(() => {
  switch (systemHealthStatus.value) {
    case "critical":
      return t("admin.system.healthStatusCritical", "Kritisch");
    case "warning":
      return t("admin.system.healthStatusWarning", "Warnung");
    default:
      return t("admin.system.healthStatusNormal", "Normal");
  }
});

const systemHealthDetails = computed(() => {
  if (systemHealthStatus.value === "critical") {
    if (memoryStatus.value === "critical") {
      return t(
        "admin.system.healthDetailMemoryCritical",
        "Arbeitsspeicherauslastung kritisch hoch",
      );
    }
    if (cpuStatus.value === "critical") {
      return t(
        "admin.system.healthDetailCpuCritical",
        "CPU-Auslastung kritisch hoch",
      );
    }
  }

  if (systemHealthStatus.value === "warning") {
    if (memoryStatus.value === "warning") {
      return t(
        "admin.system.healthDetailMemoryWarning",
        "Arbeitsspeicherauslastung erhöht",
      );
    }
    if (cpuStatus.value === "warning") {
      return t("admin.system.healthDetailCpuWarning", "CPU-Auslastung erhöht");
    }
  }

  return null;
});

// Methods
function getStatusText(status: string): string {
  switch (status) {
    case "critical":
      return t("admin.system.statusCritical", "Kritisch");
    case "warning":
      return t("admin.system.statusWarning", "Warnung");
    default:
      return t("admin.system.statusNormal", "Normal");
  }
}

function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return "-";

  try {
    return format(new Date(timestamp), "dd.MM.yyyy HH:mm", { locale: de });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "-";
  }
}

function toggleEditMode() {
  if (isEditMode.value) {
    // Reset to original values if cancelling
    systemSettings.value = { ...originalSettings.value };
  }

  isEditMode.value = !isEditMode.value;
}

function resetSettings() {
  systemSettings.value = { ...originalSettings.value };
}

async function saveSettings() {
  if (!isEditMode.value) return;

  isSubmitting.value = true;

  // Simulate API call for settings update
  setTimeout(() => {
    originalSettings.value = { ...systemSettings.value };

    showToast({
      type: "success",
      title: t("admin.system.toast.settingsSaved", "Einstellungen gespeichert"),
      message: t(
        "admin.system.toast.settingsSavedMessage",
        "Die Systemeinstellungen wurden erfolgreich aktualisiert",
      ),
    });

    isSubmitting.value = false;
    isEditMode.value = false;
  }, 1000);
}

function executeAction(action: SystemAction) {
  if (isActionPending.value) return;

  if (action.requiresConfirmation) {
    currentAction.value = action;
    confirmDialogTitle.value = action.name;
    confirmDialogMessage.value = action.confirmationMessage || "";

    if (confirmDialog.value) {
      confirmDialog.value.showModal();
    }
  } else {
    runAction(action);
  }
}

function closeConfirmDialog() {
  if (confirmDialog.value) {
    confirmDialog.value.close();
    currentAction.value = null;
  }
}

function confirmAction() {
  if (!currentAction.value) return;

  closeConfirmDialog();
  runAction(currentAction.value);
  currentAction.value = null;
}

async function runAction(action: SystemAction) {
  if (isActionPending.value) return;

  isActionPending.value = true;
  pendingAction.value = action.type;

  try {
    switch (action.type) {
      case "clear-cache":
        await adminSystemStore.clearCache();
        break;
      case "clear-embedding-cache":
        await adminSystemStore.clearEmbeddingCache();
        break;
      case "reload-motd":
        await adminSystemStore.reloadMotd();
        break;
      default:
        throw new Error(`Unknown action: ${action.type}`);
    }

    showToast({
      type: "success",
      title: t("admin.system.toast.actionSuccess", "Aktion erfolgreich"),
      message: t(
        "admin.system.toast.actionSuccessMessage",
        `Die Aktion "${action.name}" wurde erfolgreich ausgeführt`,
      ),
    });
  } catch (error: any) {
    const errorMessage =
      error?.message ||
      t(
        "admin.system.error.actionFailed",
        "Die Aktion konnte nicht ausgeführt werden",
      );

    showToast({
      type: "error",
      title: t("admin.system.toast.actionError", "Fehler"),
      message: errorMessage,
    });

    console.error("Error executing action:", error);
  } finally {
    isActionPending.value = false;
    pendingAction.value = null;

    // Refresh stats after action
    refreshStats();
  }
}

async function refreshStats() {
  isLoading.value = true;

  try {
    await adminSystemStore.fetchStats();
  } catch (error) {
    console.error("Error fetching system stats:", error);
  } finally {
    isLoading.value = false;
  }
}

// Lifecycle hooks
onMounted(async () => {
  refreshStats();
});

// Log i18n initialization status
console.log(`[AdminSystem] i18n initialized with locale: ${locale.value}`);

// Log i18n initialization status
console.log(`[AdminSystem] i18n initialized with locale: ${locale.value}`);
</script>

<style scoped>
.admin-system {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.admin-system__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.admin-system__description {
  margin: 0;
  color: var(--n-color-text-secondary);
  line-height: 1.5;
}

.admin-system__section-title {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
  border-bottom: 1px solid var(--n-color-border);
  padding-bottom: 0.5rem;
}

/* Status Card */
.admin-system__status-card {
  display: flex;
  padding: 1.25rem;
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background-alt);
  box-shadow: var(--n-shadow-sm);
  border-left: 4px solid;
}

.admin-system__status-card--normal {
  border-left-color: var(--n-color-success);
}

.admin-system__status-card--warning {
  border-left-color: var(--n-color-warning);
}

.admin-system__status-card--critical {
  border-left-color: var(--n-color-error);
}

.admin-system__status-icon {
  font-size: 2.5rem;
  margin-right: 1.5rem;
}

.admin-system__status-card--normal .admin-system__status-icon {
  color: var(--n-color-success);
}

.admin-system__status-card--warning .admin-system__status-icon {
  color: var(--n-color-warning);
}

.admin-system__status-card--critical .admin-system__status-icon {
  color: var(--n-color-error);
}

.admin-system__status-content {
  flex: 1;
}

.admin-system__status-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.admin-system__status-value {
  margin: 0.25rem 0 0 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.admin-system__status-details {
  margin: 0.5rem 0 0 0;
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

/* Metrics */
.admin-system__metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.25rem;
}

.admin-system__metric-card {
  padding: 1.25rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  box-shadow: var(--n-shadow-sm);
}

.admin-system__metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.admin-system__metric-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.admin-system__metric-title i {
  color: var(--n-color-primary);
}

.admin-system__metric-status {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
}

.admin-system__metric-status--normal {
  background-color: var(--n-color-success);
}

.admin-system__metric-status--warning {
  background-color: var(--n-color-warning);
}

.admin-system__metric-status--critical {
  background-color: var(--n-color-error);
}

.admin-system__meter-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.admin-system__meter {
  flex: 1;
  height: 0.5rem;
  background-color: var(--n-color-background);
  border-radius: 1rem;
  overflow: hidden;
}

.admin-system__meter-fill {
  height: 100%;
  border-radius: 1rem;
  transition: width 0.5s ease;
}

.admin-system__meter-fill--normal {
  background-color: var(--n-color-success);
}

.admin-system__meter-fill--warning {
  background-color: var(--n-color-warning);
}

.admin-system__meter-fill--critical {
  background-color: var(--n-color-error);
}

.admin-system__meter-value {
  min-width: 3rem;
  font-weight: 600;
  text-align: right;
  color: var(--n-color-text-primary);
}

.admin-system__metric-value-large {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
  text-align: center;
  margin-top: 0.5rem;
}

.admin-system__metric-values,
.admin-system__metric-value-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  line-height: 1.75;
  color: var(--n-color-text-primary);
}

.admin-system__metric-values {
  flex-direction: column;
  gap: 0.5rem;
}

/* Info Section */
.admin-system__info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.25rem;
}

.admin-system__info-card {
  padding: 1.25rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  box-shadow: var(--n-shadow-sm);
}

.admin-system__info-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
  margin-bottom: 0.75rem;
}

.admin-system__info-title i {
  color: var(--n-color-primary);
}

.admin-system__info-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
  margin-bottom: 0.5rem;
}

.admin-system__info-details {
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

.admin-system__info-values {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.admin-system__info-value-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--n-color-text-primary);
}

/* Settings Section */
.admin-system__settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.admin-system__toggle-edit-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background-color: var(--n-color-background-alt);
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  color: var(--n-color-text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.admin-system__toggle-edit-button:hover {
  background-color: var(--n-color-hover);
}

.admin-system__toggle-edit-button--active {
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
  border-color: var(--n-color-primary);
}

.admin-system__settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.admin-system__settings-group {
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  padding: 1.25rem;
  background-color: var(--n-color-background-alt);
}

.admin-system__settings-group legend {
  padding: 0 0.5rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.admin-system__setting-item {
  margin-bottom: 1.25rem;
}

.admin-system__setting-item:last-child {
  margin-bottom: 0;
}

.admin-system__setting-item--switch {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.admin-system__setting-switch-label {
  display: flex;
  flex-direction: column;
}

.admin-system__setting-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--n-color-text-primary);
}

.admin-system__setting-input,
.admin-system__setting-select,
.admin-system__setting-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.admin-system__setting-input:focus,
.admin-system__setting-select:focus,
.admin-system__setting-textarea:focus {
  border-color: var(--n-color-primary);
  outline: none;
}

.admin-system__setting-input:disabled,
.admin-system__setting-select:disabled,
.admin-system__setting-textarea:disabled {
  background-color: var(--n-color-background);
  opacity: 0.7;
  cursor: not-allowed;
}

/* Toggle Switch */
.admin-system__toggle-switch {
  position: relative;
  display: inline-block;
  width: 3rem;
  height: 1.5rem;
}

.admin-system__toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.admin-system__toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--n-color-border);
  transition: 0.4s;
  border-radius: 1.5rem;
}

.admin-system__toggle-slider:before {
  position: absolute;
  content: "";
  height: 1.125rem;
  width: 1.125rem;
  left: 0.1875rem;
  bottom: 0.1875rem;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .admin-system__toggle-slider {
  background-color: var(--n-color-primary);
}

input:focus + .admin-system__toggle-slider {
  box-shadow: 0 0 1px var(--n-color-primary);
}

input:checked + .admin-system__toggle-slider:before {
  transform: translateX(1.5rem);
}

input:disabled + .admin-system__toggle-slider {
  opacity: 0.7;
  cursor: not-allowed;
}

.admin-system__settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.admin-system__settings-button {
  padding: 0.625rem 1.25rem;
  border-radius: var(--n-border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.admin-system__settings-button--cancel {
  background-color: var(--n-color-background);
  border: 1px solid var(--n-color-border);
  color: var(--n-color-text-primary);
}

.admin-system__settings-button--cancel:hover {
  background-color: var(--n-color-background-alt);
  border-color: var(--n-color-text-secondary);
}

.admin-system__settings-button--save {
  background-color: var(--n-color-primary);
  border: 1px solid var(--n-color-primary);
  color: var(--n-color-on-primary);
}

.admin-system__settings-button--save:hover {
  background-color: var(--n-color-primary-dark);
}

.admin-system__settings-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Actions Section */
.admin-system__actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.25rem;
}

.admin-system__action-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.25rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  box-shadow: var(--n-shadow-sm);
  border: 1px solid var(--n-color-border);
  height: 100%;
}

.admin-system__action-content {
  margin-bottom: 1rem;
}

.admin-system__action-title {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.admin-system__action-description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
  line-height: 1.5;
}

.admin-system__action-button {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem;
  background-color: var(--n-color-background);
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  color: var(--n-color-text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: auto;
  width: 100%;
}

.admin-system__action-button:hover {
  background-color: var(--n-color-primary);
  border-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
}

.admin-system__action-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Dialog */
.admin-system__dialog {
  padding: 0;
  border: none;
  border-radius: var(--n-border-radius);
  box-shadow: var(--n-shadow-lg);
  max-width: 500px;
  width: 90%;
}

.admin-system__dialog::backdrop {
  background-color: rgba(0, 0, 0, 0.5);
}

.admin-system__dialog-content {
  padding: 0;
}

.admin-system__dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background-color: var(--n-color-background-alt);
  border-bottom: 1px solid var(--n-color-border);
  border-top-left-radius: var(--n-border-radius);
  border-top-right-radius: var(--n-border-radius);
}

.admin-system__dialog-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.admin-system__dialog-close {
  background: none;
  border: none;
  font-size: 1rem;
  color: var(--n-color-text-secondary);
  cursor: pointer;
  transition: color 0.2s;
}

.admin-system__dialog-close:hover {
  color: var(--n-color-error);
}

.admin-system__dialog-body {
  padding: 1.5rem;
  text-align: center;
}

.admin-system__dialog-icon {
  font-size: 3rem;
  color: var(--n-color-warning);
  margin-bottom: 1rem;
}

.admin-system__dialog-message {
  margin: 0;
  color: var(--n-color-text-primary);
  line-height: 1.5;
}

.admin-system__dialog-actions {
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  border-top: 1px solid var(--n-color-border);
}

.admin-system__dialog-button {
  padding: 0.625rem 1.25rem;
  border-radius: var(--n-border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.admin-system__dialog-button--cancel {
  background-color: var(--n-color-background);
  border: 1px solid var(--n-color-border);
  color: var(--n-color-text-primary);
}

.admin-system__dialog-button--cancel:hover {
  background-color: var(--n-color-background-alt);
  border-color: var(--n-color-text-secondary);
}

.admin-system__dialog-button--confirm {
  background-color: var(--n-color-warning);
  border: 1px solid var(--n-color-warning);
  color: var(--n-color-on-warning);
}

.admin-system__dialog-button--confirm:hover {
  background-color: var(--n-color-warning-dark, #e6a102);
}

.admin-system__dialog-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Responsive Design */
@media (max-width: 768px) {
  .admin-system__metrics-grid,
  .admin-system__info-grid,
  .admin-system__settings-grid,
  .admin-system__actions-grid {
    grid-template-columns: 1fr;
  }

  .admin-system__status-card {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .admin-system__status-icon {
    margin-right: 0;
    margin-bottom: 1rem;
  }

  .admin-system__settings-actions {
    flex-direction: column;
    gap: 0.75rem;
  }
}
</style>
