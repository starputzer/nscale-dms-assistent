<template>
  <div class="admin-system-improved">
    <div class="system-header">
      <h2>{{ $t("admin.system.title") }}</h2>
      <p class="description">{{ $t("admin.system.description") }}</p>
    </div>

    <!-- System Health Overview -->
    <div class="health-overview">
      <div class="health-card" :class="systemHealthStatus">
        <i class="fas fa-heartbeat health-icon"></i>
        <div class="health-content">
          <div class="health-status">
            {{ $t(`admin.system.health.${systemHealthStatus}`) }}
          </div>
          <div class="health-label">{{ $t("admin.system.systemHealth") }}</div>
        </div>
      </div>

      <div class="system-info">
        <div class="info-item">
          <span class="info-label">{{ $t("admin.system.uptime") }}:</span>
          <span class="info-value">{{ formatUptime(stats.uptime_days) }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">{{ $t("admin.system.startTime") }}:</span>
          <span class="info-value">{{ formatDate(stats.start_time) }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">{{ $t("admin.system.activeModel") }}:</span>
          <span class="info-value">{{ stats.active_model || "N/A" }}</span>
        </div>
      </div>
    </div>

    <!-- System Metrics -->
    <div class="metrics-grid">
      <div class="metric-card">
        <h3>{{ $t("admin.system.resourceUsage") }}</h3>

        <div class="metric-item">
          <div class="metric-header">
            <span>{{ $t("admin.system.cpuUsage") }}</span>
            <span class="metric-value">{{ stats.cpu_usage_percent }}%</span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :class="cpuStatus"
              :style="{ width: `${stats.cpu_usage_percent}%` }"
            ></div>
          </div>
        </div>

        <div class="metric-item">
          <div class="metric-header">
            <span>{{ $t("admin.system.memoryUsage") }}</span>
            <span class="metric-value">{{ stats.memory_usage_percent }}%</span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :class="memoryStatus"
              :style="{ width: `${stats.memory_usage_percent}%` }"
            ></div>
          </div>
        </div>

        <div class="metric-item">
          <div class="metric-header">
            <span>{{ $t("admin.system.diskUsage") }}</span>
            <span class="metric-value">{{
              formatFileSize(stats.database_size_mb * 1024 * 1024)
            }}</span>
          </div>
        </div>
      </div>

      <div class="metric-card">
        <h3>{{ $t("admin.system.cacheMetrics") }}</h3>

        <div class="metric-item">
          <div class="metric-header">
            <span>{{ $t("admin.system.cacheSize") }}</span>
            <span class="metric-value">{{
              formatFileSize(stats.cache_size_mb * 1024 * 1024)
            }}</span>
          </div>
        </div>

        <div class="metric-item">
          <div class="metric-header">
            <span>{{ $t("admin.system.cacheHitRate") }}</span>
            <span class="metric-value"
              >{{ stats.cache_hit_rate.toFixed(1) }}%</span
            >
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill success"
              :style="{ width: `${stats.cache_hit_rate}%` }"
            ></div>
          </div>
        </div>
      </div>

      <div class="metric-card">
        <h3>{{ $t("admin.system.performanceMetrics") }}</h3>

        <div class="metric-stats">
          <div class="stat-item">
            <i class="fas fa-tachometer-alt stat-icon"></i>
            <div class="stat-content">
              <div class="stat-value">{{ stats.avg_response_time_ms }}ms</div>
              <div class="stat-label">
                {{ $t("admin.system.avgResponseTime") }}
              </div>
            </div>
          </div>

          <div class="stat-item">
            <i class="fas fa-file-alt stat-icon"></i>
            <div class="stat-content">
              <div class="stat-value">{{ stats.document_count }}</div>
              <div class="stat-label">{{ $t("admin.system.documents") }}</div>
            </div>
          </div>

          <div class="stat-item">
            <i class="fas fa-comments stat-icon"></i>
            <div class="stat-content">
              <div class="stat-value">{{ stats.total_messages }}</div>
              <div class="stat-label">{{ $t("admin.system.messages") }}</div>
            </div>
          </div>

          <div class="stat-item">
            <i class="fas fa-chart-line stat-icon"></i>
            <div class="stat-content">
              <div class="stat-value">
                {{ stats.avg_messages_per_session.toFixed(1) }}
              </div>
              <div class="stat-label">
                {{ $t("admin.system.avgMessagesPerSession") }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- System Actions -->
    <div class="system-actions">
      <h3>{{ $t("admin.system.actions") }}</h3>

      <div class="actions-grid">
        <div
          v-for="action in availableActions"
          :key="action.type"
          class="action-item"
        >
          <h4>{{ action.name }}</h4>
          <p>{{ action.description }}</p>
          <button
            @click="performAction(action)"
            :disabled="loading.action"
            class="btn btn-secondary"
          >
            <i class="fas fa-play" v-if="!loading.action"></i>
            <i class="fas fa-spinner fa-spin" v-else></i>
            {{ $t("admin.system.execute") }}
          </button>
        </div>
      </div>
    </div>

    <!-- System Logs -->
    <div class="system-logs">
      <h3>{{ $t("admin.system.recentLogs") }}</h3>

      <div class="log-filters">
        <select v-model="logLevel" @change="loadLogs">
          <option value="">{{ $t("admin.system.allLevels") }}</option>
          <option value="error">{{ $t("admin.system.error") }}</option>
          <option value="warn">{{ $t("admin.system.warning") }}</option>
          <option value="info">{{ $t("admin.system.info") }}</option>
          <option value="debug">{{ $t("admin.system.debug") }}</option>
        </select>

        <button @click="refreshLogs" class="btn btn-small">
          <i class="fas fa-sync-alt"></i>
          {{ $t("admin.system.refresh") }}
        </button>
      </div>

      <div v-if="loading.logs" class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        {{ $t("common.loading") }}
      </div>

      <div v-else class="log-entries">
        <div
          v-for="log in logs"
          :key="log.id"
          :class="['log-entry', log.level]"
        >
          <span class="log-time">{{ formatLogTime(log.timestamp) }}</span>
          <span :class="['log-level', log.level]">{{
            log.level.toUpperCase()
          }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>

        <div v-if="logs.length === 0" class="no-logs">
          {{ $t("admin.system.noLogs") }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@/composables/useToast";
import { storeToRefs } from "pinia";
import { useAdminSystemStore } from "@/stores/admin/system";
import type { SystemAction } from "@/types/admin";

interface LogEntry {
  id: string;
  timestamp: number;
  level: "error" | "warn" | "info" | "debug";
  message: string;
}

const { t } = useI18n();
const toast = useToast();
const systemStore = useAdminSystemStore();

const {
  stats,
  loading: storeLoading,
  error: storeError,
  availableActions,
  memoryStatus,
  cpuStatus,
  systemHealthStatus,
} = storeToRefs(systemStore);

// Local state
const logs = ref<LogEntry[]>([]);
const logLevel = ref("");
const loading = ref({
  logs: false,
  action: false,
});

// Auto-refresh interval
let refreshInterval: NodeJS.Timer | null = null;

// Methods
const formatDate = (timestamp: number): string => {
  if (!timestamp) return "";
  try {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

const formatLogTime = (timestamp: number): string => {
  if (!timestamp) return "";
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  } catch (error) {
    console.error("Error formatting log time:", error);
    return "";
  }
};

const formatUptime = (days: number): string => {
  if (!days) return "0d";

  if (days < 1) {
    const hours = Math.floor(days * 24);
    return `${hours}h`;
  }

  const wholeDays = Math.floor(days);
  const hours = Math.floor((days - wholeDays) * 24);

  return `${wholeDays}d ${hours}h`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const loadLogs = async () => {
  loading.value.logs = true;

  try {
    // In real implementation, this would be an API call
    // For now, generate mock logs
    const mockLogs: LogEntry[] = [];
    const levels = ["error", "warn", "info", "debug"] as const;
    const messages = [
      "System startup completed",
      "Cache cleared successfully",
      "Database connection established",
      "Model loaded: GPT-4",
      "API request processed",
      "User session started",
      "Document conversion completed",
      "Memory usage threshold reached",
      "Background job completed",
      "Configuration updated",
    ];

    for (let i = 0; i < 20; i++) {
      const level = levels[Math.floor(Math.random() * levels.length)];
      if (!logLevel.value || level === logLevel.value) {
        mockLogs.push({
          id: `log-${i}`,
          timestamp: Date.now() - i * 60000,
          level,
          message: messages[Math.floor(Math.random() * messages.length)],
        });
      }
    }

    logs.value = mockLogs;
  } catch (error) {
    console.error("Error loading logs:", error);
    toast.error(t("admin.system.logsError"));
  } finally {
    loading.value.logs = false;
  }
};

const refreshLogs = () => {
  loadLogs();
};

const performAction = async (action: SystemAction) => {
  if (action.requiresConfirmation) {
    if (!confirm(action.confirmationMessage)) {
      return;
    }
  }

  loading.value.action = true;

  try {
    switch (action.type) {
      case "clear-cache":
        await systemStore.clearCache();
        toast.success(t("admin.system.cacheCleared"));
        break;
      case "clear-embedding-cache":
        await systemStore.clearEmbeddingCache();
        toast.success(t("admin.system.embeddingCacheCleared"));
        break;
      case "reload-motd":
        await systemStore.reloadMotd();
        toast.success(t("admin.system.motdReloaded"));
        break;
      case "reindex":
        // In real implementation, this would trigger a reindexing process
        toast.info(t("admin.system.reindexStarted"));
        break;
      default:
        toast.error(t("admin.system.unknownAction"));
    }

    // Refresh stats after action
    await systemStore.fetchStats();
  } catch (error: any) {
    console.error("Error performing action:", error);
    toast.error(error.message || t("admin.system.actionError"));
  } finally {
    loading.value.action = false;
  }
};

// Lifecycle
onMounted(() => {
  systemStore.fetchStats();
  loadLogs();

  // Auto-refresh stats every 30 seconds
  refreshInterval = setInterval(() => {
    systemStore.fetchStats();
  }, 30000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>

<style lang="scss" scoped>
.admin-system-improved {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;

  .system-header {
    margin-bottom: 2rem;

    h2 {
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }

    .description {
      color: var(--text-secondary);
      font-size: 0.95rem;
    }
  }

  .health-overview {
    display: flex;
    gap: 2rem;
    margin-bottom: 2rem;
    align-items: center;
  }

  .health-card {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px var(--shadow-color);
    display: flex;
    align-items: center;
    gap: 1rem;

    &.normal {
      .health-icon {
        color: var(--color-success);
      }
    }

    &.warning {
      .health-icon {
        color: var(--color-warning);
      }
    }

    &.critical {
      .health-icon {
        color: var(--color-danger);
      }
    }

    .health-icon {
      font-size: 2.5rem;
    }

    .health-content {
      .health-status {
        font-size: 1.4rem;
        font-weight: 600;
        color: var(--text-primary);
        text-transform: capitalize;
      }

      .health-label {
        color: var(--text-secondary);
        font-size: 0.9rem;
      }
    }
  }

  .system-info {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px var(--shadow-color);
    flex: 1;

    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border-color);

      &:last-child {
        border-bottom: none;
      }

      .info-label {
        color: var(--text-secondary);
        font-weight: 500;
      }

      .info-value {
        color: var(--text-primary);
        font-weight: 600;
      }
    }
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .metric-card {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px var(--shadow-color);

    h3 {
      color: var(--text-primary);
      margin-bottom: 1rem;
      font-size: 1.2rem;
    }

    .metric-item {
      margin-bottom: 1.5rem;

      &:last-child {
        margin-bottom: 0;
      }

      .metric-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;

        span {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .metric-value {
          color: var(--text-primary);
          font-weight: 600;
        }
      }
    }

    .metric-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .stat-icon {
          font-size: 1.5rem;
          color: var(--primary-color);
        }

        .stat-content {
          .stat-value {
            font-size: 1.2rem;
            font-weight: 600;
            color: var(--text-primary);
          }

          .stat-label {
            color: var(--text-secondary);
            font-size: 0.85rem;
          }
        }
      }
    }
  }

  .progress-bar {
    width: 100%;
    height: 6px;
    background: var(--bg-tertiary);
    border-radius: 3px;
    overflow: hidden;

    .progress-fill {
      height: 100%;
      background: var(--primary-color);
      transition: width 0.3s ease;

      &.success {
        background: var(--color-success);
      }

      &.warning {
        background: var(--color-warning);
      }

      &.critical {
        background: var(--color-danger);
      }

      &.normal {
        background: var(--color-success);
      }
    }
  }

  .system-actions,
  .system-logs {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 4px var(--shadow-color);

    h3 {
      color: var(--text-primary);
      margin-bottom: 1rem;
      font-size: 1.2rem;
    }
  }

  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .action-item {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 1.25rem;
    transition: all 0.3s ease;

    &:hover {
      border-color: var(--primary-color);
      transform: translateY(-1px);
    }

    h4 {
      color: var(--text-primary);
      margin-bottom: 0.5rem;
      font-size: 1.1rem;
    }

    p {
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }

    .btn {
      width: 100%;
    }
  }

  .log-filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;

    select {
      flex: 1;
      padding: 0.5rem;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background: var(--bg-primary);
      color: var(--text-primary);
      font-size: 1rem;

      &:focus {
        outline: none;
        border-color: var(--primary-color);
      }
    }
  }

  .loading-spinner {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
  }

  .log-entries {
    max-height: 400px;
    overflow-y: auto;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 0.5rem;
  }

  .log-entry {
    display: flex;
    gap: 1rem;
    padding: 0.5rem;
    border-bottom: 1px solid var(--border-color);
    font-family: "Courier New", monospace;
    font-size: 0.85rem;

    &:last-child {
      border-bottom: none;
    }

    .log-time {
      color: var(--text-secondary);
      white-space: nowrap;
    }

    .log-level {
      font-weight: 600;
      width: 60px;

      &.error {
        color: var(--color-danger);
      }

      &.warn {
        color: var(--color-warning);
      }

      &.info {
        color: var(--color-info);
      }

      &.debug {
        color: var(--text-secondary);
      }
    }

    .log-message {
      color: var(--text-primary);
      flex: 1;
    }
  }

  .no-logs {
    text-align: center;
    color: var(--text-secondary);
    padding: 2rem;
    font-style: italic;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;

    &.btn-secondary {
      background: var(--bg-tertiary);
      color: var(--text-primary);

      &:hover:not(:disabled) {
        background: var(--bg-quaternary);
        transform: translateY(-1px);
      }
    }

    &.btn-small {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    i {
      font-size: 0.9rem;
    }
  }
}

// Dark mode adjustments
.dark-mode {
  .health-card,
  .system-info,
  .metric-card,
  .system-actions,
  .system-logs {
    background: var(--bg-tertiary);
  }

  .action-item,
  .log-entries {
    background: var(--bg-quaternary);
    border-color: var(--border-color-dark);
  }

  select {
    background: var(--bg-quaternary);
    border-color: var(--border-color-dark);
    color: var(--text-primary);

    &:focus {
      border-color: var(--primary-color);
    }
  }
}
</style>
