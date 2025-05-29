<template>
  <div class="admin-system-enhanced">
    <div class="admin-section">
      <h2 class="admin-heading">
        {{ t("admin.system.title", "Systemeinstellungen") }}
      </h2>
      <p class="admin-description">
        {{
          t(
            "admin.system.description",
            "Überwachen und konfigurieren Sie Systemeinstellungen und -ressourcen.",
          )
        }}
      </p>
      
      <!-- API-Integration-Banner -->
      <div v-if="systemStore.apiIntegrationEnabled" class="admin-info-banner admin-info-banner--success">
        <i class="fas fa-check-circle"></i>
        <div>
          <strong>{{ t("admin.system.apiActive.title", "API-Integration aktiv:") }}</strong>
          {{ t("admin.system.apiActive.description", "Diese Oberfläche kommuniziert direkt mit dem Backend-System. Es werden echte Daten angezeigt und Änderungen werden im System gespeichert.") }}
        </div>
      </div>
      
      <!-- Error-Banner anzeigen wenn Fehler aufgetreten ist -->
      <div v-if="systemStore.error" class="admin-info-banner admin-info-banner--error">
        <i class="fas fa-exclamation-triangle"></i>
        <div>
          <strong>{{ t("admin.system.error.title", "Fehler:") }}</strong>
          {{ systemStore.error }}
          <button 
            class="admin-button admin-button--small admin-button--text" 
            @click="refreshAll"
          >
            {{ t("admin.system.error.retry", "Erneut versuchen") }}
          </button>
        </div>
      </div>
      
      <div class="admin-system-enhanced__actions">
        <button
          class="admin-button admin-button--secondary"
          @click="refreshAll"
          :disabled="systemStore.loading"
        >
          <i v-if="systemStore.loading" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-sync-alt"></i>
          {{ systemStore.loading 
            ? t("admin.system.loading", "Wird geladen...") 
            : t("admin.system.refresh", "Aktualisieren") }}
        </button>
      </div>
    </div>

    <!-- System Status Overview -->
    <div class="admin-grid admin-grid--2-columns">
      <AdminCard
        :variant="systemHealthStatusVariant"
        elevated
        class="admin-system-enhanced__health-card"
      >
        <template #header>
          <div class="admin-card__header-with-icon">
            <i class="fas" :class="systemHealthIcon" aria-hidden="true"></i>
            <h3>{{ t("admin.system.healthStatus", "Systemstatus") }}</h3>
          </div>
        </template>

        <div class="admin-system-enhanced__status-content">
          <div class="admin-metric admin-metric--centered admin-metric--large">
            <span class="admin-metric__value">{{ systemHealthText }}</span>
            <span v-if="systemHealthDetails" class="admin-metric__label">{{
              systemHealthDetails
            }}</span>
          </div>
          <div class="admin-system-enhanced__health-metrics">
            <div class="admin-system-enhanced__mini-metric">
              <span>{{ t("admin.system.uptime", "Betriebszeit") }}</span>
              <strong>{{ formatUptime(stats.uptime_days || 0) }}</strong>
            </div>
            <div class="admin-system-enhanced__mini-metric">
              <span>{{ t("admin.system.lastCheck", "Letzte Prüfung") }}</span>
              <strong>{{ lastCheckTime }}</strong>
            </div>
          </div>
        </div>
      </AdminCard>

      <AdminCard elevated>
        <template #header>
          <div class="admin-card__header-with-icon">
            <i class="fas fa-tachometer-alt" aria-hidden="true"></i>
            <h3>
              {{ t("admin.system.performance", "Performance-Übersicht") }}
            </h3>
          </div>
        </template>

        <div class="admin-system-enhanced__chart-container">
          <canvas ref="performanceChart"></canvas>
        </div>
      </AdminCard>
    </div>

    <!-- System Resource Metrics -->
    <AdminCard elevated>
      <template #header>
        <div class="admin-card__header-with-icon">
          <i class="fas fa-microchip" aria-hidden="true"></i>
          <h3>{{ t("admin.system.resourceMetrics", "Ressourcennutzung") }}</h3>
        </div>
      </template>

      <div class="admin-grid admin-grid--2-columns">
        <!-- CPU Usage -->
        <div class="admin-system-enhanced__metric-card">
          <div class="admin-system-enhanced__metric-header">
            <div class="admin-system-enhanced__metric-title">
              <i class="fas fa-microchip" aria-hidden="true"></i>
              <span>{{ t("admin.system.metrics.cpu", "CPU-Auslastung") }}</span>
            </div>
            <div class="admin-badge" :class="`admin-badge--${cpuStatus}`">
              {{ getStatusText(cpuStatus) }}
            </div>
          </div>

          <div class="admin-system-enhanced__meter-container">
            <div class="admin-system-enhanced__meter">
              <div
                class="admin-system-enhanced__meter-fill"
                :class="`admin-system-enhanced__meter-fill--${cpuStatus}`"
                :style="{ width: `${stats.cpu_usage_percent || 0}%` }"
              ></div>
            </div>
            <div class="admin-system-enhanced__meter-value">
              {{ stats.cpu_usage_percent || 0 }}%
            </div>
          </div>
        </div>

        <!-- Memory Usage -->
        <div class="admin-system-enhanced__metric-card">
          <div class="admin-system-enhanced__metric-header">
            <div class="admin-system-enhanced__metric-title">
              <i class="fas fa-memory" aria-hidden="true"></i>
              <span>{{
                t("admin.system.metrics.memory", "Speicherauslastung")
              }}</span>
            </div>
            <div class="admin-badge" :class="`admin-badge--${memoryStatus}`">
              {{ getStatusText(memoryStatus) }}
            </div>
          </div>

          <div class="admin-system-enhanced__meter-container">
            <div class="admin-system-enhanced__meter">
              <div
                class="admin-system-enhanced__meter-fill"
                :class="`admin-system-enhanced__meter-fill--${memoryStatus}`"
                :style="{ width: `${stats.memory_usage_percent || 0}%` }"
              ></div>
            </div>
            <div class="admin-system-enhanced__meter-value">
              {{ stats.memory_usage_percent || 0 }}%
            </div>
          </div>
        </div>
      </div>
    </AdminCard>

    <!-- System Information Cards -->
    <div class="admin-grid admin-grid--4-columns">
      <!-- Database Size -->
      <AdminCard bordered>
        <template #header>
          <div class="admin-card__header-with-icon">
            <i class="fas fa-database" aria-hidden="true"></i>
            <h3>{{ t("admin.system.metrics.database", "Datenbankgröße") }}</h3>
          </div>
        </template>

        <div class="admin-metric admin-metric--centered">
          <span class="admin-metric__value">{{
            formatBytes(stats.database_size_mb * 1024 * 1024 || 0)
          }}</span>
        </div>
      </AdminCard>

      <!-- Cache Info -->
      <AdminCard bordered>
        <template #header>
          <div class="admin-card__header-with-icon">
            <i class="fas fa-bolt" aria-hidden="true"></i>
            <h3>{{ t("admin.system.metrics.cache", "Cache") }}</h3>
          </div>
        </template>

        <div class="admin-system-enhanced__info-list">
          <div class="admin-system-enhanced__info-item">
            <span>{{ t("admin.system.metrics.cacheSize", "Größe:") }}</span>
            <strong>{{
              formatBytes(stats.cache_size_mb * 1024 * 1024 || 0)
            }}</strong>
          </div>
          <div class="admin-system-enhanced__info-item">
            <span>{{
              t("admin.system.metrics.cacheHitRate", "Trefferrate:")
            }}</span>
            <strong>{{ stats.cache_hit_rate || 0 }}%</strong>
          </div>
        </div>
      </AdminCard>

      <!-- Uptime -->
      <AdminCard bordered>
        <template #header>
          <div class="admin-card__header-with-icon">
            <i class="fas fa-clock" aria-hidden="true"></i>
            <h3>{{ t("admin.system.info.uptime", "Betriebszeit") }}</h3>
          </div>
        </template>

        <div class="admin-metric admin-metric--centered">
          <span class="admin-metric__value">{{
            formatUptime(stats.uptime_days || 0)
          }}</span>
          <div class="admin-metric__secondary">
            {{ t("admin.system.info.startTime", "Start:") }}
            {{ formatDateRelative(stats.start_time) }}
          </div>
        </div>
      </AdminCard>

      <!-- Active Model -->
      <AdminCard bordered>
        <template #header>
          <div class="admin-card__header-with-icon">
            <i class="fas fa-robot" aria-hidden="true"></i>
            <h3>{{ t("admin.system.info.activeModel", "Aktives Modell") }}</h3>
          </div>
        </template>

        <div class="admin-metric admin-metric--centered">
          <span class="admin-metric__value admin-metric__value--text">{{
            stats.active_model || "-"
          }}</span>
          <div class="admin-metric__secondary">
            {{ t("admin.system.info.avgResponseTime", "Antwortzeit:") }}
            {{ stats.avg_response_time_ms || 0 }} ms
          </div>
        </div>
      </AdminCard>
    </div>

    <!-- Application Metrics -->
    <AdminCard elevated>
      <template #header>
        <div class="admin-card__header-with-icon">
          <i class="fas fa-chart-line" aria-hidden="true"></i>
          <h3>{{ t("admin.system.appMetrics", "Anwendungsmetriken") }}</h3>
        </div>
      </template>

      <div class="admin-grid admin-grid--4-columns">
        <div class="admin-metric">
          <div class="admin-metric__icon">
            <i class="fas fa-users"></i>
          </div>
          <div class="admin-metric__content">
            <div class="admin-metric__value">{{ stats.active_users || 0 }}</div>
            <div class="admin-metric__label">
              {{ t("admin.system.activeUsers", "Aktive Benutzer") }}
            </div>
          </div>
        </div>

        <div class="admin-metric">
          <div class="admin-metric__icon">
            <i class="fas fa-comments"></i>
          </div>
          <div class="admin-metric__content">
            <div class="admin-metric__value">
              {{ stats.active_sessions || 0 }}
            </div>
            <div class="admin-metric__label">
              {{ t("admin.system.activeSessions", "Aktive Sitzungen") }}
            </div>
          </div>
        </div>

        <div class="admin-metric">
          <div class="admin-metric__icon">
            <i class="fas fa-bolt"></i>
          </div>
          <div class="admin-metric__content">
            <div class="admin-metric__value">
              {{ stats.requests_per_second || 0 }}
            </div>
            <div class="admin-metric__label">
              {{ t("admin.system.requestsPerSecond", "Anfragen/Sek") }}
            </div>
          </div>
        </div>

        <div class="admin-metric">
          <div class="admin-metric__icon">
            <i class="fas fa-clock"></i>
          </div>
          <div class="admin-metric__content">
            <div class="admin-metric__value">
              {{ stats.avg_response_time_ms || 0 }} ms
            </div>
            <div class="admin-metric__label">
              {{ t("admin.system.avgResponseTime", "Ø Antwortzeit") }}
            </div>
          </div>
        </div>
      </div>
    </AdminCard>

    <!-- Network & Disk Stats -->
    <div class="admin-grid admin-grid--2-columns">
      <!-- Network Stats -->
      <AdminCard bordered>
        <template #header>
          <div class="admin-card__header-with-icon">
            <i class="fas fa-network-wired"></i>
            <h3>{{ t("admin.system.networkStats", "Netzwerkstatistiken") }}</h3>
          </div>
        </template>

        <div class="admin-system-enhanced__network-grid">
          <div class="admin-system-enhanced__network-item">
            <i class="fas fa-download"></i>
            <div>
              <span>{{ t("admin.system.download", "Download") }}</span>
              <strong>{{ formatBytesPerSecond(networkStats.rxSpeed) }}</strong>
            </div>
          </div>
          <div class="admin-system-enhanced__network-item">
            <i class="fas fa-upload"></i>
            <div>
              <span>{{ t("admin.system.upload", "Upload") }}</span>
              <strong>{{ formatBytesPerSecond(networkStats.txSpeed) }}</strong>
            </div>
          </div>
          <div class="admin-system-enhanced__network-item">
            <i class="fas fa-chart-line"></i>
            <div>
              <span>{{ t("admin.system.totalTraffic", "Gesamt") }}</span>
              <strong>{{ formatBytes(networkStats.total) }}</strong>
            </div>
          </div>
        </div>
      </AdminCard>

      <!-- Disk Usage -->
      <AdminCard bordered>
        <template #header>
          <div class="admin-card__header-with-icon">
            <i class="fas fa-hdd"></i>
            <h3>{{ t("admin.system.diskUsage", "Festplattennutzung") }}</h3>
          </div>
        </template>

        <div
          v-for="disk in diskUsage"
          :key="disk.mount"
          class="admin-system-enhanced__disk-item"
        >
          <div class="admin-system-enhanced__disk-header">
            <span>{{ disk.mount }}</span>
            <span>{{ disk.percentage }}%</span>
          </div>
          <div class="admin-system-enhanced__disk-meter">
            <div
              class="admin-system-enhanced__disk-fill"
              :style="{ width: `${disk.percentage}%` }"
              :class="`admin-system-enhanced__disk-fill--${getDiskStatus(disk.percentage)}`"
            ></div>
          </div>
          <div class="admin-system-enhanced__disk-info">
            <span
              >{{ formatBytes(disk.used) }} /
              {{ formatBytes(disk.total) }}</span
            >
            <span
              >{{ formatBytes(disk.available) }}
              {{ t("admin.system.available", "verfügbar") }}</span
            >
          </div>
        </div>
      </AdminCard>
    </div>

    <!-- System Settings -->
    <AdminCard elevated>
      <template #header>
        <div class="admin-card__header-with-actions">
          <div class="admin-card__header-with-icon">
            <i class="fas fa-cogs" aria-hidden="true"></i>
            <h3>
              {{ t("admin.system.settings.title", "Systemeinstellungen") }}
            </h3>
          </div>
          <div class="admin-card__header-actions">
            <button
              v-if="!isEditMode"
              @click="toggleEditMode"
              class="admin-button admin-button--primary"
            >
              <i class="fas fa-edit"></i>
              {{ t("admin.system.settings.edit", "Bearbeiten") }}
            </button>
            <template v-else>
              <button
                class="admin-button admin-button--secondary"
                @click="toggleEditMode"
              >
                {{ t("admin.system.settings.cancel", "Abbrechen") }}
              </button>
              <button
                class="admin-button admin-button--primary"
                @click="saveSettings"
                :disabled="isSubmitting"
              >
                <i
                  v-if="isSubmitting"
                  class="fas fa-spinner fa-spin"
                  aria-hidden="true"
                ></i>
                {{ t("admin.system.settings.save", "Speichern") }}
              </button>
            </template>
          </div>
        </div>
      </template>

      <form
        @submit.prevent="saveSettings"
        class="admin-system-enhanced__settings-form"
      >
        <!-- Simplified settings panel -->
        <div class="admin-grid admin-grid--2-columns">
          <!-- Model Settings -->
          <fieldset class="admin-system-enhanced__settings-group">
            <legend>
              {{ t("admin.system.settings.models", "Modelleinstellungen") }}
            </legend>

            <div class="admin-form-field">
              <label for="default-model" class="admin-form-field__label">
                {{ t("admin.system.settings.defaultModel", "Standardmodell") }}
              </label>
              <select
                id="default-model"
                v-model="systemSettings.defaultModel"
                class="admin-form-field__select"
                :disabled="!isEditMode"
              >
                <option
                  v-for="model in modelOptions"
                  :key="model.value"
                  :value="model.value"
                >
                  {{ model.label }}
                </option>
              </select>
            </div>

            <div class="admin-form-field">
              <label for="max-tokens" class="admin-form-field__label">
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
                class="admin-form-field__input"
                :disabled="!isEditMode"
              />
            </div>

            <div class="admin-form-field admin-form-field--switch">
              <div class="admin-form-field__switch-label">
                <label for="enable-model-selection">
                  {{
                    t(
                      "admin.system.settings.allowModelSelection",
                      "Modellauswahl erlauben",
                    )
                  }}
                </label>
              </div>
              <label class="admin-toggle">
                <input
                  id="enable-model-selection"
                  type="checkbox"
                  v-model="systemSettings.enableModelSelection"
                  :disabled="!isEditMode"
                />
                <span class="admin-toggle__slider"></span>
              </label>
            </div>
          </fieldset>

          <!-- Rate Limiting Settings -->
          <fieldset class="admin-system-enhanced__settings-group">
            <legend>
              {{ t("admin.system.settings.rateLimiting", "Rate-Limiting") }}
            </legend>

            <div class="admin-form-field admin-form-field--switch">
              <div class="admin-form-field__switch-label">
                <label for="enable-rate-limit">
                  {{
                    t(
                      "admin.system.settings.enableRateLimiting",
                      "Rate-Limiting aktivieren",
                    )
                  }}
                </label>
              </div>
              <label class="admin-toggle">
                <input
                  id="enable-rate-limit"
                  type="checkbox"
                  v-model="systemSettings.enableRateLimit"
                  :disabled="!isEditMode"
                />
                <span class="admin-toggle__slider"></span>
              </label>
            </div>

            <div class="admin-form-field" v-if="systemSettings.enableRateLimit">
              <label for="rate-limit" class="admin-form-field__label">
                {{
                  t(
                    "admin.system.settings.requestsPerMinute",
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
                class="admin-form-field__input"
                :disabled="!isEditMode"
              />
            </div>
          </fieldset>

          <!-- Session Settings -->
          <fieldset class="admin-system-enhanced__settings-group">
            <legend>
              {{ t("admin.system.settings.sessions", "Sitzungen") }}
            </legend>

            <div class="admin-form-field">
              <label for="max-sessions" class="admin-form-field__label">
                {{
                  t(
                    "admin.system.settings.maxConnectionsPerUser",
                    "Max. Verbindungen pro Benutzer",
                  )
                }}
              </label>
              <input
                id="max-sessions"
                v-model.number="systemSettings.maxConnectionsPerUser"
                type="number"
                min="1"
                max="100"
                class="admin-form-field__input"
                :disabled="!isEditMode"
              />
            </div>

            <div class="admin-form-field">
              <label for="session-timeout" class="admin-form-field__label">
                {{
                  t(
                    "admin.system.settings.sessionTimeout",
                    "Sitzungs-Timeout (Min)",
                  )
                }}
              </label>
              <input
                id="session-timeout"
                v-model.number="systemSettings.sessionTimeoutMinutes"
                type="number"
                min="5"
                max="1440"
                class="admin-form-field__input"
                :disabled="!isEditMode"
              />
            </div>
          </fieldset>

          <!-- Maintenance Settings -->
          <fieldset class="admin-system-enhanced__settings-group">
            <legend>
              {{ t("admin.system.settings.maintenance", "Wartung") }}
            </legend>

            <div class="admin-form-field admin-form-field--switch">
              <div class="admin-form-field__switch-label">
                <label for="maintenance-mode">
                  {{
                    t(
                      "admin.system.settings.enableMaintenance",
                      "Wartungsmodus",
                    )
                  }}
                </label>
              </div>
              <label class="admin-toggle">
                <input
                  id="maintenance-mode"
                  type="checkbox"
                  v-model="systemSettings.maintenanceMode"
                  :disabled="!isEditMode"
                />
                <span class="admin-toggle__slider"></span>
              </label>
            </div>

            <div class="admin-form-field" v-if="systemSettings.maintenanceMode">
              <label for="maintenance-message" class="admin-form-field__label">
                {{
                  t(
                    "admin.system.settings.maintenanceMessage",
                    "Wartungsnachricht",
                  )
                }}
              </label>
              <textarea
                id="maintenance-message"
                v-model="systemSettings.maintenanceMessage"
                class="admin-form-field__textarea"
                rows="3"
                :disabled="!isEditMode"
              ></textarea>
            </div>

            <div class="admin-form-field admin-form-field--switch">
              <div class="admin-form-field__switch-label">
                <label for="enable-backup">
                  {{
                    t(
                      "admin.system.settings.enableAutoBackup",
                      "Automatische Backups",
                    )
                  }}
                </label>
              </div>
              <label class="admin-toggle">
                <input
                  id="enable-backup"
                  type="checkbox"
                  v-model="systemSettings.autoBackup"
                  :disabled="!isEditMode"
                />
                <span class="admin-toggle__slider"></span>
              </label>
            </div>
          </fieldset>
        </div>
      </form>
    </AdminCard>

    <!-- System Actions -->
    <AdminCard elevated>
      <template #header>
        <div class="admin-card__header-with-icon">
          <i class="fas fa-play-circle" aria-hidden="true"></i>
          <h3>{{ t("admin.system.actions.title", "Systemaktionen") }}</h3>
        </div>
      </template>

      <div class="admin-grid admin-grid--3-columns">
        <div
          v-for="action in actions"
          :key="action.id"
          class="admin-card admin-action-card"
          :class="{ 'admin-action-card--danger': action.isDanger }"
        >
          <div class="admin-action-card__icon">
            <i :class="['fas', action.icon]"></i>
          </div>
          <div class="admin-action-card__content">
            <h4 class="admin-action-card__title">{{ action.name }}</h4>
            <p class="admin-action-card__description">
              {{ action.description }}
            </p>
            <div v-if="action.stats" class="admin-action-card__stats">
              <div
                v-for="stat in action.stats"
                :key="stat.label"
                class="admin-action-card__stat"
              >
                <span>{{ stat.label }}:</span>
                <strong>{{ stat.value }}</strong>
              </div>
            </div>
          </div>
          <button
            @click="executeAction(action)"
            class="admin-button"
            :class="
              action.isDanger
                ? 'admin-button--danger'
                : 'admin-button--secondary'
            "
            :disabled="action.disabled || currentAction === action.id"
          >
            <i
              v-if="currentAction === action.id"
              class="fas fa-spinner fa-spin"
              aria-hidden="true"
            ></i>
            <span>{{
              action.buttonText ||
              t("admin.system.actions.execute", "Ausführen")
            }}</span>
          </button>
        </div>
      </div>
    </AdminCard>

    <!-- Confirmation Dialog -->
    <dialog ref="confirmDialog" class="admin-dialog">
      <div class="admin-dialog__content">
        <div class="admin-dialog__header">
          <h3 class="admin-dialog__title">{{ confirmDialogTitle }}</h3>
          <button
            @click="closeConfirmDialog"
            class="admin-dialog__close"
            aria-label="Schließen"
          >
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>

        <div class="admin-dialog__body">
          <i
            class="fas fa-exclamation-triangle admin-dialog__icon"
            aria-hidden="true"
          ></i>
          <p class="admin-dialog__message">{{ confirmDialogMessage }}</p>
          <div v-if="confirmDialogWarning" class="admin-dialog__warning">
            {{ confirmDialogWarning }}
          </div>
        </div>

        <div class="admin-dialog__actions">
          <button
            @click="closeConfirmDialog"
            class="admin-button admin-button--secondary"
            :disabled="isActionPending"
          >
            {{ t("admin.system.dialog.cancel", "Abbrechen") }}
          </button>
          <button
            @click="confirmAction"
            class="admin-button"
            :class="
              confirmDialogDanger
                ? 'admin-button--danger'
                : 'admin-button--primary'
            "
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
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useAdminSystemStore } from "@/stores/admin/system";
import { useToast } from "@/composables/useToast";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import Chart from "chart.js/auto";
import AdminCard from "@/components/admin/shared/AdminCard.vue";

// i18n
const { t, locale } = useI18n({ useScope: 'global', inheritLocale: true });
console.log('[i18n] Component initialized with global scope and inheritance');

// Store with proper reactive references
const systemStore = useAdminSystemStore();
const { stats, loading, error, apiIntegrationEnabled, systemSettings } = storeToRefs(systemStore);

// Toast
const toast = useToast();

// Refs
const confirmDialog = ref<HTMLDialogElement | null>(null);
const performanceChart = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

// Local state
const isLoading = ref(false);
const isSubmitting = ref(false);
const isActionPending = ref(false);
const isEditMode = ref(false);
const currentAction = ref<string | null>(null);

// Confirm Dialog
const confirmDialogTitle = ref("");
const confirmDialogMessage = ref("");
const confirmDialogWarning = ref("");
const confirmDialogIcon = ref("fa-exclamation-triangle");
const confirmDialogDanger = ref(false);
const pendingActionCallback = ref<() => void>();

// Real-time data
const cpuHistory = ref<number[]>([]);
const memoryHistory = ref<number[]>([]);
const cpuPeak = ref(0);
const memoryPeak = ref(0);
const lastUpdateTime = ref(Date.now());

// Refresh interval
let refreshInterval: number | null = null;

// Computed properties
const systemHealthStatus = computed(() => {
  if (cpuStatus.value === "critical" || memoryStatus.value === "critical") {
    return "critical";
  }
  if (cpuStatus.value === "warning" || memoryStatus.value === "warning") {
    return "warning";
  }
  return "normal";
});

const systemHealthStatusVariant = computed(() => {
  switch (systemHealthStatus.value) {
    case "critical":
      return "danger";
    case "warning":
      return "warning";
    default:
      return "success";
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
  const details = [];
  if (cpuStatus.value === "critical") {
    details.push(t("admin.system.cpuCritical", "CPU-Auslastung kritisch"));
  } else if (cpuStatus.value === "warning") {
    details.push(t("admin.system.cpuWarning", "CPU-Auslastung hoch"));
  }
  if (memoryStatus.value === "critical") {
    details.push(t("admin.system.memoryCritical", "Speicher kritisch"));
  } else if (memoryStatus.value === "warning") {
    details.push(t("admin.system.memoryWarning", "Speicher hoch"));
  }
  return details.join(", ");
});

const cpuStatus = computed(() => {
  const usage = stats.value.cpu_usage_percent || 0;
  if (usage >= 90) return "critical";
  if (usage >= 70) return "warning";
  return "normal";
});

const memoryStatus = computed(() => {
  const usage = stats.value.memory_usage_percent || 0;
  if (usage >= 90) return "critical";
  if (usage >= 70) return "warning";
  return "normal";
});

const lastCheckTime = computed(() => {
  return formatDistanceToNow(lastUpdateTime.value, {
    addSuffix: true,
    locale: de,
  });
});

const diskUsage = computed(() => {
  // Simulated disk usage data
  return [
    {
      mount: "/",
      total: 100 * 1024 * 1024 * 1024,
      used: 45 * 1024 * 1024 * 1024,
      available: 55 * 1024 * 1024 * 1024,
      percentage: 45,
    },
    {
      mount: "/data",
      total: 500 * 1024 * 1024 * 1024,
      used: 312 * 1024 * 1024 * 1024,
      available: 188 * 1024 * 1024 * 1024,
      percentage: 62,
    },
  ];
});

const networkStats = computed(() => {
  // Simulated network stats
  return {
    rxSpeed: 12.5 * 1024 * 1024, // 12.5 MB/s
    txSpeed: 3.2 * 1024 * 1024, // 3.2 MB/s
    total: 45.7 * 1024 * 1024 * 1024, // 45.7 GB
  };
});

// Options for selects
const modelOptions = [
  { value: "llama-7b", label: "LLaMA 7B" },
  { value: "llama-13b", label: "LLaMA 13B" },
  { value: "mistral-7b", label: "Mistral 7B" },
  { value: "mixtral-8x7b", label: "Mixtral 8x7B" },
];

// Actions
const actions = computed(() => [
  {
    id: "clear-cache",
    name: t("admin.system.actions.clearCache", "Cache leeren"),
    description: t(
      "admin.system.actions.clearCacheDesc",
      "Löscht alle zwischengespeicherten Daten",
    ),
    icon: "fa-trash",
    stats: [
      {
        label: t("admin.system.cacheSize", "Größe"),
        value: formatBytes(stats.value.cache_size_mb * 1024 * 1024 || 0),
      },
      {
        label: t("admin.system.cacheEntries", "Einträge"),
        value: stats.value.cache_entries || 0,
      },
    ],
  },
  {
    id: "restart-services",
    name: t("admin.system.actions.restartServices", "Services neustarten"),
    description: t(
      "admin.system.actions.restartServicesDesc",
      "Startet alle Systemdienste neu",
    ),
    icon: "fa-redo",
    isDanger: true,
    requiresConfirmation: true,
  },
  {
    id: "export-logs",
    name: t("admin.system.actions.exportLogs", "Logs exportieren"),
    description: t(
      "admin.system.actions.exportLogsDesc",
      "Exportiert Systemlogs als ZIP-Datei",
    ),
    icon: "fa-download",
    buttonText: t("admin.system.actions.download", "Herunterladen"),
  },
  {
    id: "optimize-db",
    name: t("admin.system.actions.optimizeDb", "Datenbank optimieren"),
    description: t(
      "admin.system.actions.optimizeDbDesc",
      "Defragmentiert und optimiert die Datenbank",
    ),
    icon: "fa-database",
    disabled: stats.value.db_optimization_running,
  },
  {
    id: "reset-stats",
    name: t("admin.system.actions.resetStats", "Statistiken zurücksetzen"),
    description: t(
      "admin.system.actions.resetStatsDesc",
      "Setzt alle Systemstatistiken zurück",
    ),
    icon: "fa-chart-line",
    isDanger: true,
    requiresConfirmation: true,
  },
  {
    id: "create-backup",
    name: t("admin.system.actions.createBackup", "Backup erstellen"),
    description: t(
      "admin.system.actions.createBackupDesc",
      "Erstellt ein vollständiges System-Backup",
    ),
    icon: "fa-save",
    stats: [
      {
        label: t("admin.system.lastBackup", "Letztes Backup"),
        value: formatDateRelative(stats.value.last_backup_time),
      },
    ],
  },
]);

// Methods
function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatBytesPerSecond(bytes: number): string {
  return `${formatBytes(bytes)}/s`;
}

function formatUptime(days: number): string {
  if (days < 1) {
    return t("admin.system.lessThanDay", "< 1 Tag");
  }
  return t("admin.system.days", "{days} Tage", { days });
}

function formatDateRelative(timestamp: number | undefined): string {
  if (!timestamp) return "-";
  return formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
    locale: de,
  });
}

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

function getDiskStatus(percentage: number): string {
  if (percentage >= 90) return "critical";
  if (percentage >= 70) return "warning";
  return "normal";
}

function initChart() {
  if (performanceChart.value && !chartInstance) {
    const ctx = performanceChart.value.getContext("2d");
    if (!ctx) return;

    // Sample data for the chart
    const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const cpuData = Array.from({ length: 24 }, () =>
      Math.floor(Math.random() * 100),
    );
    const memoryData = Array.from({ length: 24 }, () =>
      Math.floor(Math.random() * 100),
    );

    chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: t("admin.system.metrics.cpu", "CPU-Auslastung"),
            data: cpuData,
            borderColor: "rgba(54, 162, 235, 1)",
            backgroundColor: "rgba(54, 162, 235, 0.2)",
            tension: 0.4,
            fill: true,
          },
          {
            label: t("admin.system.metrics.memory", "Speicherauslastung"),
            data: memoryData,
            borderColor: "rgba(255, 99, 132, 1)",
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => `${value}%`,
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: (context) =>
                `${context.dataset.label}: ${context.parsed.y}%`,
            },
          },
        },
      },
    });
  }
}

async function refreshAll() {
  try {
    // Wir verwenden das loading state aus dem Store
    await systemStore.fetchStats();
    
    // Laden der Systemaktionen optional basierend auf dem Ergebnis von fetchStats
    if (!systemStore.error) {
      // Auch Aktionen neu laden, wenn die Statistiken erfolgreich geladen wurden
      await systemStore.fetchAvailableActions();
      toast.success(t("admin.system.dataRefreshed", "Daten aktualisiert"));
    }
  } catch (error: any) {
    console.error("Fehler beim Aktualisieren der Systemstatistiken:", error);
    
    // Verbesserte Fehlermeldung mit mehr Kontext
    let errorMessage = t("admin.system.refreshError", "Fehler beim Aktualisieren");
    
    // Zusätzliche Details für Entwickler in der Konsole
    if (error.code) {
      console.error(`Fehlercode: ${error.code}`);
    }
    
    if (error.details) {
      console.error("Fehlerdetails:", error.details);
    }
    
    // Anzeige des Fehlers mit Toast
    toast.error(errorMessage);
  } finally {
    // Aktualisierungszeit wird immer gesetzt, auch wenn ein Fehler auftritt
    lastUpdateTime.value = Date.now();
  }
}

function toggleEditMode() {
  isEditMode.value = !isEditMode.value;
  if (!isEditMode.value) {
    // Reset settings if cancelling edit mode
    loadSettings();
  }
}

async function loadSettings() {
  try {
    await systemStore.fetchSettings();
  } catch (error) {
    console.error("Fehler beim Laden der Einstellungen:", error);
  }
}

async function saveSettings() {
  isSubmitting.value = true;
  try {
    await systemStore.saveSettings(systemSettings.value);
    toast.success(t("admin.system.settingsSaved", "Einstellungen gespeichert"));
    isEditMode.value = false;
  } catch (error) {
    toast.error(t("admin.system.saveError", "Fehler beim Speichern"));
  } finally {
    isSubmitting.value = false;
  }
}

function executeAction(action: any) {
  currentAction.value = action.id;

  if (action.requiresConfirmation) {
    confirmDialogTitle.value = action.name;
    confirmDialogMessage.value =
      action.confirmMessage ||
      t(
        "admin.system.confirmActionMessage",
        "Möchten Sie diese Aktion wirklich ausführen?",
      );
    confirmDialogWarning.value = action.confirmWarning || "";
    confirmDialogIcon.value = action.icon;
    confirmDialogDanger.value = action.isDanger;

    if (confirmDialog.value) {
      confirmDialog.value.showModal();
    }

    pendingActionCallback.value = () => performAction(action);
  } else {
    performAction(action);
  }
}

async function performAction(action: any) {
  isActionPending.value = true;

  try {
    switch (action.id) {
      case "clear-cache":
        await systemStore.clearCache();
        toast.success(t("admin.system.cacheCleared", "Cache geleert"));
        break;
      case "restart-services":
        await systemStore.restartServices();
        toast.success(
          t("admin.system.servicesRestarted", "Services neu gestartet"),
        );
        break;
      case "export-logs":
        await systemStore.exportLogs();
        toast.success(t("admin.system.logsExported", "Logs exportiert"));
        break;
      case "optimize-db":
        await systemStore.optimizeDatabase();
        toast.success(t("admin.system.dbOptimized", "Datenbank optimiert"));
        break;
      case "reset-stats":
        await systemStore.resetStatistics();
        toast.success(
          t("admin.system.statsReset", "Statistiken zurückgesetzt"),
        );
        break;
      case "create-backup":
        await systemStore.createBackup();
        toast.success(t("admin.system.backupCreated", "Backup erstellt"));
        break;
    }

    // Refresh stats after action
    await refreshAll();
  } catch (error) {
    toast.error(t("admin.system.actionError", "Fehler bei der Aktion"));
  } finally {
    isActionPending.value = false;
    currentAction.value = null;
  }
}

async function confirmAction() {
  if (!pendingActionCallback.value) {
    closeConfirmDialog();
    return;
  }
  
  isActionPending.value = true;
  
  try {
    // Ausführen der Aktion mit besserer Fehlerbehandlung
    await pendingActionCallback.value();
    closeConfirmDialog();
    
    // Feedback für den Benutzer
    toast.success(t("admin.system.actionSuccess", "Aktion erfolgreich ausgeführt"));
    
    // Aktualisieren der Daten nach erfolgreicher Aktion
    refreshAll();
  } catch (error: any) {
    console.error("Fehler beim Ausführen der Aktion:", error);
    
    // Verbesserte Fehlermeldung mit mehr Kontext
    let errorMessage = t("admin.system.actionError", "Fehler bei der Ausführung der Aktion");
    
    if (error.message) {
      errorMessage = error.message;
    }
    
    // Anzeige des Fehlers mit Toast
    toast.error(errorMessage);
    
    // Dialog trotzdem schließen
    closeConfirmDialog();
  } finally {
    isActionPending.value = false;
  }
}

function closeConfirmDialog() {
  if (confirmDialog.value) {
    confirmDialog.value.close();
  }
  pendingActionCallback.value = undefined;
  currentAction.value = null;
}

// Lifecycle
onMounted(async () => {
  // Versuche, Daten zu laden und behandle Fehler angemessen
  try {
    await refreshAll();
    
    // Wenn wir API-Integration verwenden, auch Systemaktionen laden
    if (apiIntegrationEnabled.value) {
      await systemStore.fetchAvailableActions();
    }
  } catch (error) {
    console.error("Fehler beim initialen Laden der Systemdaten:", error);
    // Fehler wird in refreshAll bereits behandelt, kein zusätzliches Toast erforderlich
  }

  // Initialize chart after DOM is ready
  setTimeout(() => {
    initChart();
  }, 100);

  // Start refresh interval with optimierten Abständen (jetzt alle 45 Sekunden statt 30)
  refreshInterval = window.setInterval(() => {
    refreshAll();
  }, 45000);
  
  // Logge erweiterte Diagnoseinformationen
  console.log(`[AdminSystem] Komponente initialisiert, API-Integration: ${apiIntegrationEnabled.value}`);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  if (chartInstance) {
    chartInstance.destroy();
  }
});

// Log i18n initialization status
console.log(`[AdminSystem.enhanced] i18n initialized with locale: ${locale.value}`);

// Log i18n initialization status
console.log(`[AdminSystem.enhanced] i18n initialized with locale: ${locale.value}`);
</script>

<style lang="scss">
@import "@/assets/styles/admin-consolidated.scss";
@import "@/assets/styles/admin-form-styles.scss";

.admin-system-enhanced {
  display: flex;
  flex-direction: column;
  gap: var(--admin-spacing-lg);

  &__actions {
    display: flex;
    justify-content: flex-end;
    margin-top: var(--admin-spacing-sm);
  }

  &__status-content {
    padding: var(--admin-spacing-md) 0;
  }

  &__health-metrics {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--admin-spacing-md);
    margin-top: var(--admin-spacing-md);
  }

  &__mini-metric {
    display: flex;
    flex-direction: column;

    span {
      font-size: var(--admin-font-size-sm);
      color: var(--admin-color-text-secondary);
    }

    strong {
      font-size: var(--admin-font-size-md);
      color: var(--admin-color-text-primary);
    }
  }

  &__chart-container {
    height: 240px;
    position: relative;
  }

  &__metric-card {
    padding: var(--admin-spacing-md);
    background-color: var(--admin-color-background-alt);
    border-radius: var(--admin-border-radius);
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
    box-shadow: var(--admin-shadow-sm);

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--admin-shadow-md);
    }
  }

  &__metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--admin-spacing-md);
  }

  &__metric-title {
    display: flex;
    align-items: center;
    gap: var(--admin-spacing-xs);
    font-weight: var(--admin-font-weight-medium);

    i {
      color: var(--admin-color-primary);
    }
  }

  &__meter-container {
    display: flex;
    align-items: center;
    gap: var(--admin-spacing-sm);
  }

  &__meter {
    flex: 1;
    height: 8px;
    background-color: var(--admin-color-background-alt);
    border-radius: var(--admin-border-radius-sm);
    overflow: hidden;
  }

  &__meter-fill {
    height: 100%;
    transition: width 0.5s ease;

    &--normal {
      background-color: var(--admin-color-success);
    }

    &--warning {
      background-color: var(--admin-color-warning);
    }

    &--critical {
      background-color: var(--admin-color-danger);
    }
  }

  &__meter-value {
    min-width: 40px;
    font-weight: var(--admin-font-weight-bold);
    text-align: right;
  }

  &__info-list {
    display: flex;
    flex-direction: column;
    gap: var(--admin-spacing-sm);
  }

  &__info-item {
    display: flex;
    justify-content: space-between;

    span {
      color: var(--admin-color-text-secondary);
    }

    strong {
      font-weight: var(--admin-font-weight-bold);
    }
  }

  &__settings-form {
    margin-top: var(--admin-spacing-md);
  }

  &__settings-group {
    border: 1px solid var(--admin-color-border);
    border-radius: var(--admin-border-radius);
    padding: var(--admin-spacing-md);
    margin-bottom: var(--admin-spacing-md);

    legend {
      padding: 0 var(--admin-spacing-xs);
      font-weight: var(--admin-font-weight-medium);
      color: var(--admin-color-text-primary);
    }
  }

  &__network-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--admin-spacing-md);
    margin-top: var(--admin-spacing-sm);
  }

  &__network-item {
    display: flex;
    align-items: center;
    gap: var(--admin-spacing-sm);

    i {
      color: var(--admin-color-primary);
      font-size: 1.25rem;
    }

    div {
      display: flex;
      flex-direction: column;

      span {
        font-size: var(--admin-font-size-sm);
        color: var(--admin-color-text-secondary);
      }

      strong {
        font-size: var(--admin-font-size-md);
        color: var(--admin-color-text-primary);
      }
    }
  }

  &__disk-item {
    margin-bottom: var(--admin-spacing-md);

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__disk-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--admin-spacing-xs);
    font-weight: var(--admin-font-weight-medium);
  }

  &__disk-meter {
    height: 8px;
    background-color: var(--admin-color-background-alt);
    border-radius: var(--admin-border-radius-sm);
    overflow: hidden;
    margin-bottom: var(--admin-spacing-xs);
  }

  &__disk-fill {
    height: 100%;
    transition: width 0.5s ease;

    &--normal {
      background-color: var(--admin-color-success);
    }

    &--warning {
      background-color: var(--admin-color-warning);
    }

    &--critical {
      background-color: var(--admin-color-danger);
    }
  }

  &__disk-info {
    display: flex;
    justify-content: space-between;
    font-size: var(--admin-font-size-sm);
    color: var(--admin-color-text-secondary);
  }
}

.admin-action-card {
  display: flex;
  flex-direction: column;
  background-color: var(--admin-color-background-alt);
  border-radius: var(--admin-border-radius);
  padding: var(--admin-spacing-md);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  border: 1px solid var(--admin-color-border);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--admin-shadow-md);
  }

  &--danger {
    border-color: var(--admin-color-danger);

    &:hover {
      background-color: rgba(var(--admin-color-danger-rgb, 220, 38, 38), 0.05);
    }
  }

  &__icon {
    font-size: 1.5rem;
    color: var(--admin-color-primary);
    margin-bottom: var(--admin-spacing-sm);

    .admin-action-card--danger & {
      color: var(--admin-color-danger);
    }
  }

  &__content {
    flex: 1;
    margin-bottom: var(--admin-spacing-md);
  }

  &__title {
    font-size: var(--admin-font-size-lg);
    font-weight: var(--admin-font-weight-medium);
    margin-bottom: var(--admin-spacing-xs);
    color: var(--admin-color-text-primary);
  }

  &__description {
    color: var(--admin-color-text-secondary);
    font-size: var(--admin-font-size-sm);
    margin-bottom: var(--admin-spacing-md);
  }

  &__stats {
    display: flex;
    flex-direction: column;
    gap: var(--admin-spacing-xs);
  }

  &__stat {
    display: flex;
    justify-content: space-between;
    font-size: var(--admin-font-size-sm);
    color: var(--admin-color-text-secondary);

    strong {
      color: var(--admin-color-text-primary);
    }
  }
}

.admin-dialog__warning {
  margin-top: var(--admin-spacing-md);
  padding: var(--admin-spacing-sm);
  background-color: rgba(var(--admin-color-warning-rgb, 245, 158, 11), 0.1);
  border: 1px solid var(--admin-color-warning);
  border-radius: var(--admin-border-radius);
  color: var(--admin-color-warning);
  font-size: var(--admin-font-size-sm);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .admin-grid--4-columns,
  .admin-grid--3-columns {
    grid-template-columns: repeat(1, 1fr);
  }

  .admin-system-enhanced__health-metrics {
    grid-template-columns: 1fr;
  }

  .admin-system-enhanced__chart-container {
    height: 200px;
  }
}
</style>
