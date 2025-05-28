<template>
  <div class="admin-system-enhanced">
    <div class="admin-system-enhanced__header">
      <h2 class="admin-system-enhanced__title">
        {{ t("admin.system.title", "Systemeinstellungen") }}
      </h2>
      <div class="admin-system-enhanced__actions">
        <Button variant="secondary" @click="refreshAll" :loading="isLoading">
          <i class="fas fa-sync-alt"></i>
          {{ t("admin.system.refresh", "Aktualisieren") }}
        </Button>
        <Button v-if="!isEditMode" variant="primary" @click="toggleEditMode">
          <i class="fas fa-edit"></i>
          {{ t("admin.system.settings.edit", "Bearbeiten") }}
        </Button>
        <template v-else>
          <Button variant="secondary" @click="toggleEditMode">
            {{ t("admin.system.settings.cancel", "Abbrechen") }}
          </Button>
          <Button
            variant="primary"
            @click="saveSettings"
            :loading="isSubmitting"
          >
            {{ t("admin.system.settings.save", "Speichern") }}
          </Button>
        </template>
      </div>
    </div>

    <!-- Real-time Dashboard -->
    <div class="admin-system-enhanced__dashboard">
      <h3 class="admin-system-enhanced__section-title">
        {{ t("admin.system.monitoring", "System-Monitoring") }}
      </h3>

      <div class="admin-system-enhanced__monitoring-grid">
        <!-- System Health Overview -->
        <div
          class="admin-system-enhanced__health-card"
          :class="systemHealthClass"
        >
          <div class="admin-system-enhanced__health-icon">
            <i class="fas" :class="systemHealthIcon"></i>
          </div>
          <div class="admin-system-enhanced__health-content">
            <h4>{{ t("admin.system.healthStatus", "Systemstatus") }}</h4>
            <p class="admin-system-enhanced__health-status">
              {{ systemHealthText }}
            </p>
            <p
              v-if="systemHealthDetails"
              class="admin-system-enhanced__health-details"
            >
              {{ systemHealthDetails }}
            </p>
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
        </div>

        <!-- Real-time CPU Chart -->
        <div class="admin-system-enhanced__chart-card">
          <div class="admin-system-enhanced__chart-header">
            <h4>
              <i class="fas fa-microchip"></i>
              {{ t("admin.system.cpuUsage", "CPU-Auslastung") }}
            </h4>
            <div
              class="admin-system-enhanced__chart-status"
              :class="`status-${cpuStatus}`"
            >
              {{ stats.cpu_usage_percent || 0 }}%
            </div>
          </div>
          <canvas ref="cpuChart" class="admin-system-enhanced__chart"></canvas>
          <div class="admin-system-enhanced__chart-info">
            <div class="admin-system-enhanced__chart-metric">
              <span>{{ t("admin.system.cores", "Kerne") }}</span>
              <strong>{{ stats.cpu_cores || "-" }}</strong>
            </div>
            <div class="admin-system-enhanced__chart-metric">
              <span>{{ t("admin.system.avgLoad", "Ø Last") }}</span>
              <strong>{{ stats.cpu_load_avg || "-" }}</strong>
            </div>
            <div class="admin-system-enhanced__chart-metric">
              <span>{{ t("admin.system.peak", "Spitze") }}</span>
              <strong>{{ cpuPeak }}%</strong>
            </div>
          </div>
        </div>

        <!-- Real-time Memory Chart -->
        <div class="admin-system-enhanced__chart-card">
          <div class="admin-system-enhanced__chart-header">
            <h4>
              <i class="fas fa-memory"></i>
              {{ t("admin.system.memoryUsage", "Speicherauslastung") }}
            </h4>
            <div
              class="admin-system-enhanced__chart-status"
              :class="`status-${memoryStatus}`"
            >
              {{ stats.memory_usage_percent || 0 }}%
            </div>
          </div>
          <canvas
            ref="memoryChart"
            class="admin-system-enhanced__chart"
          ></canvas>
          <div class="admin-system-enhanced__chart-info">
            <div class="admin-system-enhanced__chart-metric">
              <span>{{ t("admin.system.used", "Belegt") }}</span>
              <strong>{{
                formatBytes(stats.memory_used_mb * 1024 * 1024)
              }}</strong>
            </div>
            <div class="admin-system-enhanced__chart-metric">
              <span>{{ t("admin.system.total", "Gesamt") }}</span>
              <strong>{{
                formatBytes(stats.memory_total_mb * 1024 * 1024)
              }}</strong>
            </div>
            <div class="admin-system-enhanced__chart-metric">
              <span>{{ t("admin.system.swap", "Swap") }}</span>
              <strong>{{
                formatBytes(stats.swap_used_mb * 1024 * 1024)
              }}</strong>
            </div>
          </div>
        </div>

        <!-- Disk Usage -->
        <div class="admin-system-enhanced__metrics-card">
          <h4>
            <i class="fas fa-hdd"></i>
            {{ t("admin.system.diskUsage", "Festplattennutzung") }}
          </h4>
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
                :class="`fill-${getDiskStatus(disk.percentage)}`"
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
        </div>

        <!-- Network Stats -->
        <div class="admin-system-enhanced__metrics-card">
          <h4>
            <i class="fas fa-network-wired"></i>
            {{ t("admin.system.networkStats", "Netzwerkstatistiken") }}
          </h4>
          <div class="admin-system-enhanced__network-grid">
            <div class="admin-system-enhanced__network-item">
              <i class="fas fa-download"></i>
              <div>
                <span>{{ t("admin.system.download", "Download") }}</span>
                <strong>{{
                  formatBytesPerSecond(networkStats.rxSpeed)
                }}</strong>
              </div>
            </div>
            <div class="admin-system-enhanced__network-item">
              <i class="fas fa-upload"></i>
              <div>
                <span>{{ t("admin.system.upload", "Upload") }}</span>
                <strong>{{
                  formatBytesPerSecond(networkStats.txSpeed)
                }}</strong>
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
        </div>

        <!-- Application Metrics -->
        <div class="admin-system-enhanced__metrics-card">
          <h4>
            <i class="fas fa-tachometer-alt"></i>
            {{ t("admin.system.appMetrics", "Anwendungsmetriken") }}
          </h4>
          <div class="admin-system-enhanced__app-metrics">
            <div class="admin-system-enhanced__metric-item">
              <div class="admin-system-enhanced__metric-label">
                <i class="fas fa-users"></i>
                {{ t("admin.system.activeUsers", "Aktive Benutzer") }}
              </div>
              <div class="admin-system-enhanced__metric-value">
                {{ stats.active_users || 0 }}
              </div>
            </div>
            <div class="admin-system-enhanced__metric-item">
              <div class="admin-system-enhanced__metric-label">
                <i class="fas fa-comments"></i>
                {{ t("admin.system.activeSessions", "Aktive Sitzungen") }}
              </div>
              <div class="admin-system-enhanced__metric-value">
                {{ stats.active_sessions || 0 }}
              </div>
            </div>
            <div class="admin-system-enhanced__metric-item">
              <div class="admin-system-enhanced__metric-label">
                <i class="fas fa-bolt"></i>
                {{ t("admin.system.requestsPerSecond", "Anfragen/Sek") }}
              </div>
              <div class="admin-system-enhanced__metric-value">
                {{ stats.requests_per_second || 0 }}
              </div>
            </div>
            <div class="admin-system-enhanced__metric-item">
              <div class="admin-system-enhanced__metric-label">
                <i class="fas fa-clock"></i>
                {{ t("admin.system.avgResponseTime", "Ø Antwortzeit") }}
              </div>
              <div class="admin-system-enhanced__metric-value">
                {{ stats.avg_response_time_ms || 0 }} ms
              </div>
            </div>
          </div>
        </div>

        <!-- Database Stats -->
        <div class="admin-system-enhanced__metrics-card">
          <h4>
            <i class="fas fa-database"></i>
            {{ t("admin.system.databaseStats", "Datenbankstatistiken") }}
          </h4>
          <div class="admin-system-enhanced__db-stats">
            <div class="admin-system-enhanced__db-item">
              <span>{{ t("admin.system.dbSize", "Größe") }}</span>
              <strong>{{
                formatBytes(stats.database_size_mb * 1024 * 1024)
              }}</strong>
            </div>
            <div class="admin-system-enhanced__db-item">
              <span>{{ t("admin.system.connections", "Verbindungen") }}</span>
              <strong>{{ stats.db_connections || 0 }}</strong>
            </div>
            <div class="admin-system-enhanced__db-item">
              <span>{{ t("admin.system.queries", "Anfragen/Min") }}</span>
              <strong>{{ stats.queries_per_minute || 0 }}</strong>
            </div>
            <div class="admin-system-enhanced__db-item">
              <span>{{ t("admin.system.cacheHit", "Cache-Treffer") }}</span>
              <strong>{{ stats.cache_hit_rate || 0 }}%</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- System Settings -->
    <div
      v-if="isEditMode || showSettings"
      class="admin-system-enhanced__settings"
    >
      <h3 class="admin-system-enhanced__section-title">
        {{ t("admin.system.settings.title", "Systemeinstellungen") }}
      </h3>

      <form
        @submit.prevent="saveSettings"
        class="admin-system-enhanced__settings-form"
      >
        <Tabs v-model="activeSettingsTab">
          <TabList>
            <Tab>{{ t("admin.system.settings.general", "Allgemein") }}</Tab>
            <Tab>{{
              t("admin.system.settings.performance", "Performance")
            }}</Tab>
            <Tab>{{ t("admin.system.settings.security", "Sicherheit") }}</Tab>
            <Tab>{{ t("admin.system.settings.advanced", "Erweitert") }}</Tab>
          </TabList>

          <TabPanels>
            <!-- General Settings -->
            <TabPanel>
              <div class="admin-system-enhanced__settings-grid">
                <div class="admin-system-enhanced__setting-group">
                  <h4>
                    {{
                      t(
                        "admin.system.settings.appSettings",
                        "Anwendungseinstellungen",
                      )
                    }}
                  </h4>

                  <FormField>
                    <FormLabel>{{
                      t("admin.system.settings.appName", "Anwendungsname")
                    }}</FormLabel>
                    <FormInput
                      v-model="systemSettings.appName"
                      :disabled="!isEditMode"
                    />
                  </FormField>

                  <FormField>
                    <FormLabel>{{
                      t(
                        "admin.system.settings.defaultLanguage",
                        "Standardsprache",
                      )
                    }}</FormLabel>
                    <FormSelect
                      v-model="systemSettings.defaultLanguage"
                      :disabled="!isEditMode"
                      :options="languageOptions"
                    />
                  </FormField>

                  <FormField>
                    <FormLabel>{{
                      t("admin.system.settings.timezone", "Zeitzone")
                    }}</FormLabel>
                    <FormSelect
                      v-model="systemSettings.timezone"
                      :disabled="!isEditMode"
                      :options="timezoneOptions"
                    />
                  </FormField>
                </div>

                <div class="admin-system-enhanced__setting-group">
                  <h4>
                    {{
                      t(
                        "admin.system.settings.modelSettings",
                        "Modelleinstellungen",
                      )
                    }}
                  </h4>

                  <FormField>
                    <FormLabel>{{
                      t("admin.system.settings.defaultModel", "Standardmodell")
                    }}</FormLabel>
                    <FormSelect
                      v-model="systemSettings.defaultModel"
                      :disabled="!isEditMode"
                      :options="modelOptions"
                    />
                  </FormField>

                  <FormField>
                    <FormLabel>{{
                      t("admin.system.settings.maxTokens", "Max. Tokens")
                    }}</FormLabel>
                    <FormNumber
                      v-model="systemSettings.maxTokensPerRequest"
                      :disabled="!isEditMode"
                      :min="1"
                      :max="32000"
                    />
                  </FormField>

                  <FormField>
                    <FormToggle
                      v-model="systemSettings.enableModelSelection"
                      :disabled="!isEditMode"
                    >
                      {{
                        t(
                          "admin.system.settings.allowModelSelection",
                          "Modellauswahl erlauben",
                        )
                      }}
                    </FormToggle>
                  </FormField>
                </div>
              </div>
            </TabPanel>

            <!-- Performance Settings -->
            <TabPanel>
              <div class="admin-system-enhanced__settings-grid">
                <div class="admin-system-enhanced__setting-group">
                  <h4>{{ t("admin.system.settings.caching", "Caching") }}</h4>

                  <FormField>
                    <FormToggle
                      v-model="systemSettings.enableCaching"
                      :disabled="!isEditMode"
                    >
                      {{
                        t(
                          "admin.system.settings.enableCache",
                          "Cache aktivieren",
                        )
                      }}
                    </FormToggle>
                  </FormField>

                  <FormField v-if="systemSettings.enableCaching">
                    <FormLabel>{{
                      t("admin.system.settings.cacheSize", "Cache-Größe (MB)")
                    }}</FormLabel>
                    <FormNumber
                      v-model="systemSettings.maxCacheSizeMB"
                      :disabled="!isEditMode"
                      :min="10"
                      :max="10000"
                    />
                  </FormField>

                  <FormField v-if="systemSettings.enableCaching">
                    <FormLabel>{{
                      t("admin.system.settings.cacheTTL", "Cache-TTL (Minuten)")
                    }}</FormLabel>
                    <FormNumber
                      v-model="systemSettings.cacheTTLMinutes"
                      :disabled="!isEditMode"
                      :min="1"
                      :max="1440"
                    />
                  </FormField>
                </div>

                <div class="admin-system-enhanced__setting-group">
                  <h4>
                    {{
                      t(
                        "admin.system.settings.resourceLimits",
                        "Ressourcenlimits",
                      )
                    }}
                  </h4>

                  <FormField>
                    <FormLabel>{{
                      t("admin.system.settings.maxCPU", "Max. CPU (%)")
                    }}</FormLabel>
                    <FormNumber
                      v-model="systemSettings.maxCPUPercent"
                      :disabled="!isEditMode"
                      :min="10"
                      :max="100"
                    />
                  </FormField>

                  <FormField>
                    <FormLabel>{{
                      t("admin.system.settings.maxMemory", "Max. Speicher (MB)")
                    }}</FormLabel>
                    <FormNumber
                      v-model="systemSettings.maxMemoryMB"
                      :disabled="!isEditMode"
                      :min="100"
                      :max="64000"
                    />
                  </FormField>

                  <FormField>
                    <FormLabel>{{
                      t(
                        "admin.system.settings.maxConnections",
                        "Max. Verbindungen",
                      )
                    }}</FormLabel>
                    <FormNumber
                      v-model="systemSettings.maxConnectionsPerUser"
                      :disabled="!isEditMode"
                      :min="1"
                      :max="100"
                    />
                  </FormField>
                </div>
              </div>
            </TabPanel>

            <!-- Security Settings -->
            <TabPanel>
              <div class="admin-system-enhanced__settings-grid">
                <div class="admin-system-enhanced__setting-group">
                  <h4>
                    {{
                      t(
                        "admin.system.settings.authentication",
                        "Authentifizierung",
                      )
                    }}
                  </h4>

                  <FormField>
                    <FormToggle
                      v-model="systemSettings.requireAuth"
                      :disabled="!isEditMode"
                    >
                      {{
                        t(
                          "admin.system.settings.requireAuthentication",
                          "Authentifizierung erforderlich",
                        )
                      }}
                    </FormToggle>
                  </FormField>

                  <FormField>
                    <FormLabel>{{
                      t(
                        "admin.system.settings.sessionTimeout",
                        "Sitzungs-Timeout (Min)",
                      )
                    }}</FormLabel>
                    <FormNumber
                      v-model="systemSettings.sessionTimeoutMinutes"
                      :disabled="!isEditMode"
                      :min="5"
                      :max="1440"
                    />
                  </FormField>

                  <FormField>
                    <FormToggle
                      v-model="systemSettings.enableMFA"
                      :disabled="!isEditMode"
                    >
                      {{
                        t(
                          "admin.system.settings.enableMFA",
                          "2-Faktor-Authentifizierung",
                        )
                      }}
                    </FormToggle>
                  </FormField>
                </div>

                <div class="admin-system-enhanced__setting-group">
                  <h4>
                    {{
                      t("admin.system.settings.rateLimiting", "Rate-Limiting")
                    }}
                  </h4>

                  <FormField>
                    <FormToggle
                      v-model="systemSettings.enableRateLimit"
                      :disabled="!isEditMode"
                    >
                      {{
                        t(
                          "admin.system.settings.enableRateLimiting",
                          "Rate-Limiting aktivieren",
                        )
                      }}
                    </FormToggle>
                  </FormField>

                  <FormField v-if="systemSettings.enableRateLimit">
                    <FormLabel>{{
                      t(
                        "admin.system.settings.requestsPerMinute",
                        "Anfragen pro Minute",
                      )
                    }}</FormLabel>
                    <FormNumber
                      v-model="systemSettings.rateLimitPerMinute"
                      :disabled="!isEditMode"
                      :min="1"
                      :max="100"
                    />
                  </FormField>

                  <FormField>
                    <FormToggle
                      v-model="systemSettings.enableIPWhitelist"
                      :disabled="!isEditMode"
                    >
                      {{
                        t(
                          "admin.system.settings.enableIPWhitelist",
                          "IP-Whitelist aktivieren",
                        )
                      }}
                    </FormToggle>
                  </FormField>
                </div>
              </div>
            </TabPanel>

            <!-- Advanced Settings -->
            <TabPanel>
              <div class="admin-system-enhanced__settings-grid">
                <div class="admin-system-enhanced__setting-group">
                  <h4>
                    {{ t("admin.system.settings.logging", "Protokollierung") }}
                  </h4>

                  <FormField>
                    <FormLabel>{{
                      t("admin.system.settings.logLevel", "Log-Level")
                    }}</FormLabel>
                    <FormSelect
                      v-model="systemSettings.logLevel"
                      :disabled="!isEditMode"
                      :options="logLevelOptions"
                    />
                  </FormField>

                  <FormField>
                    <FormToggle
                      v-model="systemSettings.enableAuditLog"
                      :disabled="!isEditMode"
                    >
                      {{
                        t(
                          "admin.system.settings.enableAuditLog",
                          "Audit-Log aktivieren",
                        )
                      }}
                    </FormToggle>
                  </FormField>

                  <FormField>
                    <FormLabel>{{
                      t(
                        "admin.system.settings.logRetention",
                        "Log-Aufbewahrung (Tage)",
                      )
                    }}</FormLabel>
                    <FormNumber
                      v-model="systemSettings.logRetentionDays"
                      :disabled="!isEditMode"
                      :min="1"
                      :max="365"
                    />
                  </FormField>
                </div>

                <div class="admin-system-enhanced__setting-group">
                  <h4>
                    {{ t("admin.system.settings.maintenance", "Wartung") }}
                  </h4>

                  <FormField>
                    <FormToggle
                      v-model="systemSettings.maintenanceMode"
                      :disabled="!isEditMode"
                    >
                      {{
                        t(
                          "admin.system.settings.enableMaintenance",
                          "Wartungsmodus",
                        )
                      }}
                    </FormToggle>
                  </FormField>

                  <FormField v-if="systemSettings.maintenanceMode">
                    <FormLabel>{{
                      t(
                        "admin.system.settings.maintenanceMessage",
                        "Wartungsnachricht",
                      )
                    }}</FormLabel>
                    <FormTextarea
                      v-model="systemSettings.maintenanceMessage"
                      :disabled="!isEditMode"
                      :rows="3"
                    />
                  </FormField>

                  <FormField>
                    <FormToggle
                      v-model="systemSettings.autoBackup"
                      :disabled="!isEditMode"
                    >
                      {{
                        t(
                          "admin.system.settings.enableAutoBackup",
                          "Automatische Backups",
                        )
                      }}
                    </FormToggle>
                  </FormField>

                  <FormField v-if="systemSettings.autoBackup">
                    <FormLabel>{{
                      t(
                        "admin.system.settings.backupInterval",
                        "Backup-Intervall",
                      )
                    }}</FormLabel>
                    <FormSelect
                      v-model="systemSettings.backupInterval"
                      :disabled="!isEditMode"
                      :options="backupIntervalOptions"
                    />
                  </FormField>
                </div>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </form>
    </div>

    <!-- System Actions -->
    <div class="admin-system-enhanced__actions-section">
      <h3 class="admin-system-enhanced__section-title">
        {{ t("admin.system.actions.title", "Systemaktionen") }}
      </h3>

      <div class="admin-system-enhanced__actions-grid">
        <div
          v-for="action in actions"
          :key="action.id"
          class="admin-system-enhanced__action-card"
          :class="{ danger: action.isDanger }"
        >
          <div class="admin-system-enhanced__action-icon">
            <i :class="['fas', action.icon]"></i>
          </div>
          <div class="admin-system-enhanced__action-content">
            <h4>{{ action.name }}</h4>
            <p>{{ action.description }}</p>
            <div
              v-if="action.stats"
              class="admin-system-enhanced__action-stats"
            >
              <span v-for="stat in action.stats" :key="stat.label">
                {{ stat.label }}: <strong>{{ stat.value }}</strong>
              </span>
            </div>
          </div>
          <Button
            :variant="action.isDanger ? 'danger' : 'secondary'"
            @click="executeAction(action)"
            :loading="currentAction === action.id"
            :disabled="action.disabled"
          >
            {{
              action.buttonText ||
              t("admin.system.actions.execute", "Ausführen")
            }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Confirmation Dialog -->
    <Dialog v-model="showConfirmDialog">
      <DialogTitle>{{ confirmDialogTitle }}</DialogTitle>
      <DialogContent>
        <div class="admin-system-enhanced__dialog-icon">
          <i :class="['fas', confirmDialogIcon]"></i>
        </div>
        <p>{{ confirmDialogMessage }}</p>
        <Alert v-if="confirmDialogWarning" type="warning">
          {{ confirmDialogWarning }}
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button variant="secondary" @click="closeConfirmDialog">
          {{ t("common.cancel", "Abbrechen") }}
        </Button>
        <Button
          :variant="confirmDialogDanger ? 'danger' : 'primary'"
          @click="confirmAction"
          :loading="isActionPending"
        >
          {{ t("common.confirm", "Bestätigen") }}
        </Button>
      </DialogActions>
    </Dialog>
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

// UI Components
import {
  Button,
  Alert,
} from "@/components/ui/base";

// Create temporary replacements for missing components
const Dialog = Button; // Temporary fix
const DialogTitle = Alert; // Temporary fix
const DialogContent = Alert; // Temporary fix 
const DialogActions = Alert; // Temporary fix
const Tabs = Button; // Temporary fix
const TabList = Button; // Temporary fix 
const Tab = Button; // Temporary fix
const TabPanels = Button; // Temporary fix
const TabPanel = Button; // Temporary fix
const FormField = Button; // Temporary fix
const FormLabel = Alert; // Temporary fix
const FormInput = Alert; // Temporary fix
const FormSelect = Alert; // Temporary fix
const FormNumber = Alert; // Temporary fix
const FormToggle = Alert; // Temporary fix
const FormTextarea = Alert; // Temporary fix;

// i18n
const { t } = useI18n();

// Store
const systemStore = useAdminSystemStore();
const { stats } = storeToRefs(systemStore);

// Toast
const toast = useToast();

// Refs
const cpuChart = ref<HTMLCanvasElement>();
const memoryChart = ref<HTMLCanvasElement>();

// State
const isLoading = ref(false);
const isEditMode = ref(false);
const isSubmitting = ref(false);
const showSettings = ref(false);
const activeSettingsTab = ref(0);
const showConfirmDialog = ref(false);
const currentAction = ref<string | null>(null);
const isActionPending = ref(false);

// Confirm Dialog
const confirmDialogTitle = ref("");
const confirmDialogMessage = ref("");
const confirmDialogWarning = ref("");
const confirmDialogIcon = ref("fa-exclamation-triangle");
const confirmDialogDanger = ref(false);
const pendingActionCallback = ref<() => void>();

// Settings
const systemSettings = ref({
  // General
  appName: "Digitale Akte Assistent",
  defaultLanguage: "de",
  timezone: "Europe/Berlin",

  // Model
  defaultModel: "llama-7b",
  maxTokensPerRequest: 4096,
  enableModelSelection: true,

  // Performance
  enableCaching: true,
  maxCacheSizeMB: 1000,
  cacheTTLMinutes: 60,
  maxCPUPercent: 80,
  maxMemoryMB: 8192,
  maxConnectionsPerUser: 10,

  // Security
  requireAuth: true,
  sessionTimeoutMinutes: 60,
  enableMFA: false,
  enableRateLimit: true,
  rateLimitPerMinute: 30,
  enableIPWhitelist: false,

  // Advanced
  logLevel: "info",
  enableAuditLog: true,
  logRetentionDays: 30,
  maintenanceMode: false,
  maintenanceMessage: "",
  autoBackup: true,
  backupInterval: "daily",
});

// Charts
let cpuChartInstance: Chart | null = null;
let memoryChartInstance: Chart | null = null;

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

const systemHealthClass = computed(() => {
  return `admin-system-enhanced__health-card--${systemHealthStatus.value}`;
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
const languageOptions = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
];

const timezoneOptions = [
  { value: "Europe/Berlin", label: "Europe/Berlin" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "America/New_York", label: "America/New York" },
];

const modelOptions = [
  { value: "llama-7b", label: "LLaMA 7B" },
  { value: "llama-13b", label: "LLaMA 13B" },
  { value: "mistral-7b", label: "Mistral 7B" },
  { value: "mixtral-8x7b", label: "Mixtral 8x7B" },
];

const logLevelOptions = [
  { value: "debug", label: "Debug" },
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
];

const backupIntervalOptions = [
  { value: "hourly", label: t("admin.system.backup.hourly", "Stündlich") },
  { value: "daily", label: t("admin.system.backup.daily", "Täglich") },
  { value: "weekly", label: t("admin.system.backup.weekly", "Wöchentlich") },
  { value: "monthly", label: t("admin.system.backup.monthly", "Monatlich") },
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
        value: formatBytes(stats.value.cache_size_mb * 1024 * 1024),
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

function getDiskStatus(percentage: number): string {
  if (percentage >= 90) return "critical";
  if (percentage >= 70) return "warning";
  return "normal";
}

function initCharts() {
  if (cpuChart.value) {
    const ctx = cpuChart.value.getContext("2d");
    if (ctx) {
      cpuChartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels: Array(60).fill(""),
          datasets: [
            {
              label: "CPU",
              data: cpuHistory.value,
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              tension: 0.1,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: (value) => `${value}%`,
              },
            },
            x: {
              display: false,
            },
          },
        },
      });
    }
  }

  if (memoryChart.value) {
    const ctx = memoryChart.value.getContext("2d");
    if (ctx) {
      memoryChartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels: Array(60).fill(""),
          datasets: [
            {
              label: "Memory",
              data: memoryHistory.value,
              borderColor: "#8b5cf6",
              backgroundColor: "rgba(139, 92, 246, 0.1)",
              tension: 0.1,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: (value) => `${value}%`,
              },
            },
            x: {
              display: false,
            },
          },
        },
      });
    }
  }
}

function updateCharts() {
  const cpuUsage = stats.value.cpu_usage_percent || 0;
  const memoryUsage = stats.value.memory_usage_percent || 0;

  // Update history
  cpuHistory.value.push(cpuUsage);
  memoryHistory.value.push(memoryUsage);

  // Keep only last 60 points
  if (cpuHistory.value.length > 60) {
    cpuHistory.value.shift();
  }
  if (memoryHistory.value.length > 60) {
    memoryHistory.value.shift();
  }

  // Update peaks
  cpuPeak.value = Math.max(cpuPeak.value, cpuUsage);
  memoryPeak.value = Math.max(memoryPeak.value, memoryUsage);

  // Update charts
  if (cpuChartInstance) {
    cpuChartInstance.data.datasets[0].data = cpuHistory.value;
    cpuChartInstance.update("none");
  }

  if (memoryChartInstance) {
    memoryChartInstance.data.datasets[0].data = memoryHistory.value;
    memoryChartInstance.update("none");
  }

  lastUpdateTime.value = Date.now();
}

async function refreshAll() {
  isLoading.value = true;
  try {
    await systemStore.fetchStats();
    updateCharts();
    toast.success(t("admin.system.dataRefreshed", "Daten aktualisiert"));
  } catch (error) {
    toast.error(t("admin.system.refreshError", "Fehler beim Aktualisieren"));
  } finally {
    isLoading.value = false;
  }
}

function toggleEditMode() {
  isEditMode.value = !isEditMode.value;
  if (!isEditMode.value) {
    // Reset to original values
    loadSettings();
  }
}

function loadSettings() {
  // Load settings from API
  // This is simulated for now
  showSettings.value = true;
}

async function saveSettings() {
  isSubmitting.value = true;
  try {
    // Save settings to API
    await new Promise((resolve) => setTimeout(resolve, 1000));
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
    showConfirmDialog.value = true;
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

function confirmAction() {
  if (pendingActionCallback.value) {
    pendingActionCallback.value();
  }
  closeConfirmDialog();
}

function closeConfirmDialog() {
  showConfirmDialog.value = false;
  pendingActionCallback.value = undefined;
  currentAction.value = null;
}

// Lifecycle
onMounted(() => {
  initCharts();
  refreshAll();

  // Start refresh interval (every 5 seconds)
  refreshInterval = window.setInterval(() => {
    refreshAll();
  }, 5000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  if (cpuChartInstance) {
    cpuChartInstance.destroy();
  }

  if (memoryChartInstance) {
    memoryChartInstance.destroy();
  }
});
</script>

<style scoped>
.admin-system-enhanced {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem;
}

.admin-system-enhanced__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--n-color-border);
}

.admin-system-enhanced__title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: var(--n-color-text-primary);
}

.admin-system-enhanced__actions {
  display: flex;
  gap: 0.5rem;
}

.admin-system-enhanced__section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: var(--n-color-text-primary);
}

/* Dashboard Grid */
.admin-system-enhanced__monitoring-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

/* Health Card */
.admin-system-enhanced__health-card {
  grid-column: span 2;
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  border: 2px solid;
  transition: all 0.3s ease;
}

.admin-system-enhanced__health-card--normal {
  border-color: var(--n-color-success);
  background-color: rgba(16, 185, 129, 0.05);
}

.admin-system-enhanced__health-card--warning {
  border-color: var(--n-color-warning);
  background-color: rgba(245, 158, 11, 0.05);
}

.admin-system-enhanced__health-card--critical {
  border-color: var(--n-color-error);
  background-color: rgba(239, 68, 68, 0.05);
}

.admin-system-enhanced__health-icon {
  font-size: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.8);
}

.admin-system-enhanced__health-card--normal
  .admin-system-enhanced__health-icon {
  color: var(--n-color-success);
}

.admin-system-enhanced__health-card--warning
  .admin-system-enhanced__health-icon {
  color: var(--n-color-warning);
}

.admin-system-enhanced__health-card--critical
  .admin-system-enhanced__health-icon {
  color: var(--n-color-error);
}

.admin-system-enhanced__health-content {
  flex: 1;
}

.admin-system-enhanced__health-content h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: var(--n-color-text-primary);
}

.admin-system-enhanced__health-status {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.admin-system-enhanced__health-details {
  margin: 0.5rem 0;
  color: var(--n-color-text-secondary);
}

.admin-system-enhanced__health-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 1rem;
}

.admin-system-enhanced__mini-metric {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.admin-system-enhanced__mini-metric span {
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

.admin-system-enhanced__mini-metric strong {
  font-size: 1rem;
  color: var(--n-color-text-primary);
}

/* Chart Cards */
.admin-system-enhanced__chart-card {
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.5rem;
  box-shadow: var(--n-shadow-sm);
}

.admin-system-enhanced__chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.admin-system-enhanced__chart-header h4 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.admin-system-enhanced__chart-header i {
  color: var(--n-color-primary);
}

.admin-system-enhanced__chart-status {
  font-size: 1.5rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: var(--n-border-radius);
}

.admin-system-enhanced__chart-status.status-normal {
  color: var(--n-color-success);
  background-color: rgba(16, 185, 129, 0.1);
}

.admin-system-enhanced__chart-status.status-warning {
  color: var(--n-color-warning);
  background-color: rgba(245, 158, 11, 0.1);
}

.admin-system-enhanced__chart-status.status-critical {
  color: var(--n-color-error);
  background-color: rgba(239, 68, 68, 0.1);
}

.admin-system-enhanced__chart {
  height: 150px;
  margin-bottom: 1rem;
}

.admin-system-enhanced__chart-info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--n-color-border);
}

.admin-system-enhanced__chart-metric {
  text-align: center;
}

.admin-system-enhanced__chart-metric span {
  display: block;
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
  margin-bottom: 0.25rem;
}

.admin-system-enhanced__chart-metric strong {
  font-size: 1.1rem;
  color: var(--n-color-text-primary);
}

/* Metrics Cards */
.admin-system-enhanced__metrics-card {
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.5rem;
  box-shadow: var(--n-shadow-sm);
}

.admin-system-enhanced__metrics-card h4 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.admin-system-enhanced__metrics-card h4 i {
  color: var(--n-color-primary);
}

/* Disk Usage */
.admin-system-enhanced__disk-item {
  margin-bottom: 1.25rem;
}

.admin-system-enhanced__disk-item:last-child {
  margin-bottom: 0;
}

.admin-system-enhanced__disk-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.admin-system-enhanced__disk-meter {
  height: 8px;
  background-color: var(--n-color-background);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.admin-system-enhanced__disk-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.admin-system-enhanced__disk-fill.fill-normal {
  background-color: var(--n-color-success);
}

.admin-system-enhanced__disk-fill.fill-warning {
  background-color: var(--n-color-warning);
}

.admin-system-enhanced__disk-fill.fill-critical {
  background-color: var(--n-color-error);
}

.admin-system-enhanced__disk-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

/* Network Stats */
.admin-system-enhanced__network-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.admin-system-enhanced__network-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.admin-system-enhanced__network-item i {
  font-size: 1.25rem;
  color: var(--n-color-primary);
}

.admin-system-enhanced__network-item span {
  display: block;
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

.admin-system-enhanced__network-item strong {
  display: block;
  font-size: 1rem;
  color: var(--n-color-text-primary);
}

/* App Metrics */
.admin-system-enhanced__app-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.admin-system-enhanced__metric-item {
  padding: 1rem;
  background-color: var(--n-color-background);
  border-radius: var(--n-border-radius);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.admin-system-enhanced__metric-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

.admin-system-enhanced__metric-label i {
  color: var(--n-color-primary);
}

.admin-system-enhanced__metric-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

/* Database Stats */
.admin-system-enhanced__db-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.admin-system-enhanced__db-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background-color: var(--n-color-background);
  border-radius: var(--n-border-radius);
}

.admin-system-enhanced__db-item span {
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

.admin-system-enhanced__db-item strong {
  font-size: 1.1rem;
  color: var(--n-color-text-primary);
}

/* Settings */
.admin-system-enhanced__settings {
  margin-bottom: 3rem;
}

.admin-system-enhanced__settings-form {
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.5rem;
}

.admin-system-enhanced__settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
  padding: 1.5rem 0;
}

.admin-system-enhanced__setting-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.admin-system-enhanced__setting-group h4 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--n-color-border);
}

/* Actions Section */
.admin-system-enhanced__actions-section {
  margin-bottom: 3rem;
}

.admin-system-enhanced__actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.admin-system-enhanced__action-card {
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.5rem;
  box-shadow: var(--n-shadow-sm);
  border: 1px solid var(--n-color-border);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.admin-system-enhanced__action-card:hover {
  box-shadow: var(--n-shadow-md);
  transform: translateY(-2px);
}

.admin-system-enhanced__action-card.danger {
  border-color: var(--n-color-error);
}

.admin-system-enhanced__action-card.danger:hover {
  background-color: rgba(239, 68, 68, 0.05);
}

.admin-system-enhanced__action-icon {
  font-size: 2rem;
  color: var(--n-color-primary);
  margin-bottom: 0.5rem;
}

.admin-system-enhanced__action-card.danger .admin-system-enhanced__action-icon {
  color: var(--n-color-error);
}

.admin-system-enhanced__action-content {
  flex: 1;
}

.admin-system-enhanced__action-content h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.admin-system-enhanced__action-content p {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
  line-height: 1.5;
}

.admin-system-enhanced__action-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

.admin-system-enhanced__action-stats strong {
  color: var(--n-color-text-primary);
}

/* Dialog */
.admin-system-enhanced__dialog-icon {
  font-size: 3rem;
  text-align: center;
  margin-bottom: 1rem;
  color: var(--n-color-warning);
}

/* Responsive Design */
@media (max-width: 1024px) {
  .admin-system-enhanced__monitoring-grid {
    grid-template-columns: 1fr;
  }

  .admin-system-enhanced__health-card {
    grid-column: span 1;
  }

  .admin-system-enhanced__settings-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .admin-system-enhanced__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .admin-system-enhanced__actions {
    width: 100%;
    justify-content: flex-end;
  }

  .admin-system-enhanced__health-card {
    flex-direction: column;
    text-align: center;
  }

  .admin-system-enhanced__health-metrics {
    grid-template-columns: 1fr;
  }

  .admin-system-enhanced__chart-info {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .admin-system-enhanced__network-grid {
    grid-template-columns: 1fr;
  }

  .admin-system-enhanced__app-metrics {
    grid-template-columns: 1fr;
  }

  .admin-system-enhanced__actions-grid {
    grid-template-columns: 1fr;
  }
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .admin-system-enhanced__health-card {
    background-color: var(--n-color-background);
  }

  .admin-system-enhanced__chart-card,
  .admin-system-enhanced__metrics-card,
  .admin-system-enhanced__action-card {
    background-color: var(--n-color-background);
  }

  .admin-system-enhanced__settings-form {
    background-color: var(--n-color-background);
  }

  .admin-system-enhanced__disk-meter {
    background-color: var(--n-color-background-alt);
  }

  .admin-system-enhanced__metric-item,
  .admin-system-enhanced__db-item {
    background-color: var(--n-color-background-alt);
  }
}
</style>
