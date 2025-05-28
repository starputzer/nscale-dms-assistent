<template>
  <div class="admin-doc-converter-enhanced">
    <div class="doc-converter-header">
      <h2>{{ $t("admin.documentConverter.title") }}</h2>
      <p class="description">{{ $t("admin.documentConverter.description") }}</p>
    </div>

    <!-- Statistics Overview -->
    <div class="stats-grid">
      <div class="stat-card">
        <i class="fas fa-file-alt stat-icon"></i>
        <div class="stat-content">
          <div class="stat-value">{{ stats.total_documents }}</div>
          <div class="stat-label">
            {{ $t("admin.documentConverter.totalDocuments") }}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <i class="fas fa-check-circle stat-icon success"></i>
        <div class="stat-content">
          <div class="stat-value">{{ stats.successful_conversions }}</div>
          <div class="stat-label">
            {{ $t("admin.documentConverter.successfulConversions") }}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <i class="fas fa-exclamation-circle stat-icon error"></i>
        <div class="stat-content">
          <div class="stat-value">{{ stats.failed_conversions }}</div>
          <div class="stat-label">
            {{ $t("admin.documentConverter.failedConversions") }}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <i class="fas fa-clock stat-icon"></i>
        <div class="stat-content">
          <div class="stat-value">
            {{ formatDuration(stats.avg_conversion_time) }}
          </div>
          <div class="stat-label">
            {{ $t("admin.documentConverter.avgConversionTime") }}
          </div>
        </div>
      </div>
    </div>

    <!-- Conversion Settings -->
    <div class="conversion-settings">
      <h3>{{ $t("admin.documentConverter.settings") }}</h3>

      <div class="settings-grid">
        <div class="setting-item">
          <label>{{ $t("admin.documentConverter.maxFileSize") }}</label>
          <input
            type="number"
            v-model.number="settings.max_file_size_mb"
            @change="updateSettings"
            min="1"
            max="100"
          />
          <span class="unit">MB</span>
        </div>

        <div class="setting-item">
          <label>{{ $t("admin.documentConverter.allowedFormats") }}</label>
          <div class="format-checkboxes">
            <label v-for="format in availableFormats" :key="format">
              <input
                type="checkbox"
                :checked="settings.allowed_formats.includes(format)"
                @change="toggleFormat(format)"
              />
              {{ format.toUpperCase() }}
            </label>
          </div>
        </div>

        <div class="setting-item">
          <label>{{ $t("admin.documentConverter.conversionQuality") }}</label>
          <select
            v-model="settings.conversion_quality"
            @change="updateSettings"
          >
            <option value="low">
              {{ $t("admin.documentConverter.quality.low") }}
            </option>
            <option value="medium">
              {{ $t("admin.documentConverter.quality.medium") }}
            </option>
            <option value="high">
              {{ $t("admin.documentConverter.quality.high") }}
            </option>
          </select>
        </div>

        <div class="setting-item">
          <label>
            <input
              type="checkbox"
              v-model="settings.auto_delete_after_conversion"
              @change="updateSettings"
            />
            {{ $t("admin.documentConverter.autoDeleteAfterConversion") }}
          </label>
        </div>
      </div>
    </div>

    <!-- Recent Conversions -->
    <div class="recent-conversions">
      <h3>{{ $t("admin.documentConverter.recentConversions") }}</h3>

      <div v-if="loading.conversions" class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        {{ $t("common.loading") }}
      </div>

      <div v-else-if="error" class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        {{ error }}
      </div>

      <div v-else class="conversions-table">
        <table>
          <thead>
            <tr>
              <th>{{ $t("admin.documentConverter.filename") }}</th>
              <th>{{ $t("admin.documentConverter.user") }}</th>
              <th>{{ $t("admin.documentConverter.status") }}</th>
              <th>{{ $t("admin.documentConverter.conversionTime") }}</th>
              <th>{{ $t("admin.documentConverter.fileSize") }}</th>
              <th>{{ $t("admin.documentConverter.date") }}</th>
              <th>{{ $t("admin.documentConverter.actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="conversion in conversions" :key="conversion.id">
              <td>
                <i
                  :class="getFileIcon(conversion.file_type)"
                  class="file-icon"
                ></i>
                {{ conversion.filename }}
              </td>
              <td>{{ conversion.user_name || conversion.user_email }}</td>
              <td>
                <span :class="['status', conversion.status]">
                  {{
                    $t(`admin.documentConverter.status.${conversion.status}`)
                  }}
                </span>
              </td>
              <td>{{ formatDuration(conversion.conversion_time_ms) }}</td>
              <td>{{ formatFileSize(conversion.file_size) }}</td>
              <td>{{ formatDate(conversion.created_at) }}</td>
              <td>
                <button
                  v-if="conversion.status === 'completed'"
                  @click="downloadConversion(conversion.id)"
                  class="btn btn-small btn-primary"
                  title="Download"
                >
                  <i class="fas fa-download"></i>
                </button>
                <button
                  v-if="conversion.status === 'failed'"
                  @click="retryConversion(conversion.id)"
                  class="btn btn-small btn-secondary"
                  title="Retry"
                >
                  <i class="fas fa-redo"></i>
                </button>
                <button
                  @click="deleteConversion(conversion.id)"
                  class="btn btn-small btn-danger"
                  title="Delete"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="conversions.length === 0" class="no-data">
          {{ $t("admin.documentConverter.noConversions") }}
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          @click="loadConversions(currentPage - 1)"
          :disabled="currentPage === 1"
          class="btn btn-small"
        >
          <i class="fas fa-chevron-left"></i>
        </button>

        <span class="page-info"> {{ currentPage }} / {{ totalPages }} </span>

        <button
          @click="loadConversions(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="btn btn-small"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>

    <!-- Conversion Queue -->
    <div class="conversion-queue">
      <h3>{{ $t("admin.documentConverter.conversionQueue") }}</h3>

      <div v-if="queue.length === 0" class="no-queue">
        {{ $t("admin.documentConverter.noQueuedConversions") }}
      </div>

      <div v-else class="queue-list">
        <div v-for="item in queue" :key="item.id" class="queue-item">
          <div class="queue-info">
            <span class="filename">{{ item.filename }}</span>
            <span class="user">{{ item.user_name || item.user_email }}</span>
            <span class="progress">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: `${item.progress}%` }"
                ></div>
              </div>
              {{ item.progress }}%
            </span>
          </div>
          <button
            @click="cancelConversion(item.id)"
            class="btn btn-small btn-danger"
            title="Cancel"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@/composables/useToast";
import { adminApi } from "@/services/api/admin";

interface ConversionStats {
  total_documents: number;
  successful_conversions: number;
  failed_conversions: number;
  avg_conversion_time: number;
}

interface ConversionSettings {
  max_file_size_mb: number;
  allowed_formats: string[];
  conversion_quality: "low" | "medium" | "high";
  auto_delete_after_conversion: boolean;
}

interface Conversion {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  user_id: string;
  user_name?: string;
  user_email?: string;
  status: "pending" | "processing" | "completed" | "failed";
  conversion_time_ms: number;
  created_at: number;
  error_message?: string;
}

interface QueueItem {
  id: string;
  filename: string;
  user_name?: string;
  user_email?: string;
  progress: number;
}

const { t } = useI18n();
const toast = useToast();

// State
const stats = ref<ConversionStats>({
  total_documents: 0,
  successful_conversions: 0,
  failed_conversions: 0,
  avg_conversion_time: 0,
});

const settings = ref<ConversionSettings>({
  max_file_size_mb: 10,
  allowed_formats: ["pdf", "docx", "xlsx", "pptx"],
  conversion_quality: "medium",
  auto_delete_after_conversion: false,
});

const conversions = ref<Conversion[]>([]);
const queue = ref<QueueItem[]>([]);

const loading = ref({
  stats: false,
  settings: false,
  conversions: false,
  queue: false,
});

const error = ref("");
const currentPage = ref(1);
const pageSize = ref(10);
const totalItems = ref(0);

// Available formats
const availableFormats = [
  "pdf",
  "docx",
  "doc",
  "xlsx",
  "xls",
  "pptx",
  "ppt",
  "odt",
  "ods",
  "odp",
];

// Polling interval for queue updates
let queueInterval: NodeJS.Timer | null = null;

// Computed
const totalPages = computed(() => Math.ceil(totalItems.value / pageSize.value));

// Methods
const formatDate = (timestamp: number): string => {
  if (!timestamp) return "";
  try {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

const formatDuration = (ms: number): string => {
  if (!ms) return "0s";

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getFileIcon = (fileType: string): string => {
  const iconMap: Record<string, string> = {
    pdf: "fas fa-file-pdf",
    docx: "fas fa-file-word",
    doc: "fas fa-file-word",
    xlsx: "fas fa-file-excel",
    xls: "fas fa-file-excel",
    pptx: "fas fa-file-powerpoint",
    ppt: "fas fa-file-powerpoint",
    odt: "fas fa-file-alt",
    ods: "fas fa-file-alt",
    odp: "fas fa-file-alt",
  };

  return iconMap[fileType] || "fas fa-file";
};

const loadStats = async () => {
  loading.value.stats = true;
  error.value = "";

  try {
    const response = await adminApi.getDocumentConverterStats();
    stats.value = response.data;
  } catch (err: any) {
    console.error("Error loading stats:", err);
    error.value = t("admin.documentConverter.statsError");
  } finally {
    loading.value.stats = false;
  }
};

const loadSettings = async () => {
  loading.value.settings = true;

  try {
    const response = await adminApi.getDocumentConverterSettings();
    settings.value = response.data;
  } catch (err: any) {
    console.error("Error loading settings:", err);
    toast.error(t("admin.documentConverter.settingsError"));
  } finally {
    loading.value.settings = false;
  }
};

const updateSettings = async () => {
  loading.value.settings = true;

  try {
    await adminApi.updateDocumentConverterSettings(settings.value);
    toast.success(t("admin.documentConverter.settingsUpdated"));
  } catch (err: any) {
    console.error("Error updating settings:", err);
    toast.error(t("admin.documentConverter.settingsUpdateError"));
  } finally {
    loading.value.settings = false;
  }
};

const toggleFormat = (format: string) => {
  const index = settings.value.allowed_formats.indexOf(format);
  if (index > -1) {
    settings.value.allowed_formats.splice(index, 1);
  } else {
    settings.value.allowed_formats.push(format);
  }
  updateSettings();
};

const loadConversions = async (page: number = 1) => {
  loading.value.conversions = true;
  error.value = "";
  currentPage.value = page;

  try {
    const response = await adminApi.getRecentConversions({
      page,
      limit: pageSize.value,
    });
    conversions.value = response.data.items;
    totalItems.value = response.data.total;
  } catch (err: any) {
    console.error("Error loading conversions:", err);
    error.value = t("admin.documentConverter.conversionsError");
  } finally {
    loading.value.conversions = false;
  }
};

const loadQueue = async () => {
  loading.value.queue = true;

  try {
    const response = await adminApi.getConversionQueue();
    queue.value = response.data;
  } catch (err: any) {
    console.error("Error loading queue:", err);
  } finally {
    loading.value.queue = false;
  }
};

const downloadConversion = async (id: string) => {
  try {
    const response = await adminApi.downloadConversion(id);
    // Create download link
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `converted_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    console.error("Error downloading conversion:", err);
    toast.error(t("admin.documentConverter.downloadError"));
  }
};

const retryConversion = async (id: string) => {
  try {
    await adminApi.retryConversion(id);
    toast.success(t("admin.documentConverter.retryStarted"));
    await loadConversions();
    await loadQueue();
  } catch (err: any) {
    console.error("Error retrying conversion:", err);
    toast.error(t("admin.documentConverter.retryError"));
  }
};

const deleteConversion = async (id: string) => {
  if (!confirm(t("admin.documentConverter.deleteConfirm"))) {
    return;
  }

  try {
    await adminApi.deleteConversion(id);
    toast.success(t("admin.documentConverter.deleted"));
    await loadConversions();
    await loadStats();
  } catch (err: any) {
    console.error("Error deleting conversion:", err);
    toast.error(t("admin.documentConverter.deleteError"));
  }
};

const cancelConversion = async (id: string) => {
  try {
    await adminApi.cancelConversion(id);
    toast.success(t("admin.documentConverter.cancelled"));
    await loadQueue();
  } catch (err: any) {
    console.error("Error cancelling conversion:", err);
    toast.error(t("admin.documentConverter.cancelError"));
  }
};

// Lifecycle
onMounted(() => {
  loadStats();
  loadSettings();
  loadConversions();
  loadQueue();

  // Poll queue every 5 seconds
  queueInterval = setInterval(() => {
    if (queue.value.length > 0) {
      loadQueue();
    }
  }, 5000);
});

onUnmounted(() => {
  if (queueInterval) {
    clearInterval(queueInterval);
  }
});
</script>

<style lang="scss" scoped>
.admin-doc-converter-improved {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;

  .doc-converter-header {
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

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px var(--shadow-color);
    display: flex;
    align-items: center;
    gap: 1rem;

    .stat-icon {
      font-size: 2rem;
      color: var(--primary-color);

      &.success {
        color: var(--color-success);
      }

      &.error {
        color: var(--color-danger);
      }
    }

    .stat-content {
      flex: 1;

      .stat-value {
        font-size: 1.8rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .stat-label {
        color: var(--text-secondary);
        font-size: 0.9rem;
      }
    }
  }

  .conversion-settings,
  .recent-conversions,
  .conversion-queue {
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

  .settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .setting-item {
    label {
      display: block;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    input[type="number"],
    select {
      width: 100%;
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

    input[type="number"] {
      width: calc(100% - 3rem);
    }

    .unit {
      color: var(--text-secondary);
      margin-left: 0.5rem;
    }

    .format-checkboxes {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;

      label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        margin-bottom: 0;

        input[type="checkbox"] {
          cursor: pointer;
        }
      }
    }
  }

  .loading-spinner,
  .error-message {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
  }

  .error-message {
    color: var(--color-danger);

    i {
      margin-right: 0.5rem;
    }
  }

  .conversions-table {
    overflow-x: auto;

    table {
      width: 100%;
      border-collapse: collapse;

      th,
      td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid var(--border-color);
      }

      th {
        font-weight: 600;
        color: var(--text-secondary);
        white-space: nowrap;
      }

      td {
        color: var(--text-primary);

        .file-icon {
          margin-right: 0.5rem;
          color: var(--text-secondary);
        }

        .status {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 500;

          &.pending {
            background: var(--bg-warning);
            color: var(--color-warning);
          }

          &.processing {
            background: var(--bg-info);
            color: var(--color-info);
          }

          &.completed {
            background: var(--bg-success);
            color: var(--color-success);
          }

          &.failed {
            background: var(--bg-danger);
            color: var(--color-danger);
          }
        }

        .btn-small {
          padding: 0.375rem 0.75rem;
          font-size: 0.85rem;
          margin-right: 0.5rem;
        }
      }
    }
  }

  .no-data,
  .no-queue {
    text-align: center;
    color: var(--text-secondary);
    padding: 2rem;
    font-style: italic;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 1rem;

    .page-info {
      color: var(--text-secondary);
    }
  }

  .queue-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .queue-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background: var(--bg-primary);
    border-radius: 4px;
    border: 1px solid var(--border-color);
    transition: all 0.3s ease;

    &:hover {
      border-color: var(--primary-color);
    }

    .queue-info {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;

      .filename {
        font-weight: 500;
        color: var(--text-primary);
      }

      .user {
        color: var(--text-secondary);
        font-size: 0.9rem;
      }

      .progress {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-left: auto;

        .progress-bar {
          width: 100px;
          height: 4px;
          background: var(--bg-tertiary);
          border-radius: 2px;
          overflow: hidden;

          .progress-fill {
            height: 100%;
            background: var(--primary-color);
            transition: width 0.3s ease;
          }
        }
      }
    }
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

    &.btn-primary {
      background: var(--primary-color);
      color: white;

      &:hover:not(:disabled) {
        background: var(--primary-hover);
        transform: translateY(-1px);
      }
    }

    &.btn-secondary {
      background: var(--bg-tertiary);
      color: var(--text-primary);

      &:hover:not(:disabled) {
        background: var(--bg-quaternary);
        transform: translateY(-1px);
      }
    }

    &.btn-danger {
      background: var(--color-danger);
      color: white;

      &:hover:not(:disabled) {
        background: var(--color-danger-hover);
        transform: translateY(-1px);
      }
    }

    &.btn-small {
      padding: 0.375rem 0.75rem;
      font-size: 0.85rem;
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
  .stat-card,
  .conversion-settings,
  .recent-conversions,
  .conversion-queue {
    background: var(--bg-tertiary);
  }

  .conversions-table table,
  .queue-item {
    background: var(--bg-quaternary);

    th,
    td {
      border-color: var(--border-color-dark);
    }
  }

  input,
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
