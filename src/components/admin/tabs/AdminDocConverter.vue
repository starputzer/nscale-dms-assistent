<template>
  <div class="admin-doc-converter">
    <div class="doc-converter-header">
      <h2>{{ $t("admin.docConverter.title") || "Dokumentenkonverter" }}</h2>
      <p class="description">{{ $t("admin.docConverter.description") || "Verwaltung von Dokumentkonvertierungen und Einstellungen" }}</p>
      <div class="admin-card-actions">
        <button
          class="btn btn-primary"
          @click="refreshData"
          :disabled="isLoading"
        >
          <i class="fas fa-sync-alt"></i>
          {{ $t("admin.common.refresh") || "Aktualisieren" }}
        </button>
      </div>
    </div>

    <!-- Statistics Overview -->
    <div class="stats-grid">
      <div class="stat-card">
        <i class="fas fa-file-alt stat-icon"></i>
        <div class="stat-content">
          <div class="stat-value">{{ statistics.totalConversions }}</div>
          <div class="stat-label">
            {{ $t("admin.docConverter.totalDocuments") || "Dokumente insgesamt" }}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <i class="fas fa-check-circle stat-icon success"></i>
        <div class="stat-content">
          <div class="stat-value">{{ Math.floor(statistics.totalConversions * statistics.successRate / 100) }}</div>
          <div class="stat-label">
            {{ $t("admin.docConverter.successfulConversions") || "Erfolgreiche Konvertierungen" }}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <i class="fas fa-exclamation-circle stat-icon error"></i>
        <div class="stat-content">
          <div class="stat-value">{{ Math.floor(statistics.totalConversions * (100 - statistics.successRate) / 100) }}</div>
          <div class="stat-label">
            {{ $t("admin.docConverter.failedConversions") || "Fehlgeschlagene Konvertierungen" }}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <i class="fas fa-clock stat-icon"></i>
        <div class="stat-content">
          <div class="stat-value">{{ statistics.activeConversions }}</div>
          <div class="stat-label">
            {{ $t("admin.docConverter.activeConversions") || "Aktive Konvertierungen" }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="admin-loading">
      <div class="spinner"></div>
      <p>{{ $t("admin.common.loading") || "Wird geladen..." }}</p>
    </div>

    <div v-else-if="error" class="admin-error">
      <div class="error-icon">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <div class="error-content">
        <h3>{{ $t("admin.common.error") || "Fehler" }}</h3>
        <p>{{ error }}</p>
        <button class="btn btn-secondary" @click="refreshData">
          {{ $t("admin.common.retry") || "Erneut versuchen" }}
        </button>
      </div>
    </div>

    <div v-else class="admin-content">
      <!-- Tabs for different converter views -->
      <div class="converter-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-button', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          <i :class="tab.icon"></i>
          {{ tab.label }}
        </button>
      </div>

      <!-- Statistics -->
      <div v-if="activeTab === 'statistics'" class="converter-statistics">
        <h3>{{ $t("admin.docConverter.statistics") || "Statistiken" }}</h3>
        <p>{{ $t("admin.docConverter.statisticsDescription") || "Hier werden Statistiken zur Dokumentenkonvertierung angezeigt." }}</p>
      </div>

      <!-- Document Upload Tab -->
      <div v-else-if="activeTab === 'upload'" class="document-upload">
        <h3>{{ $t("admin.docConverter.upload") || "Dokumente hochladen" }}</h3>
        <p>{{ $t("admin.docConverter.uploadDescription") || "Hier können Sie Dokumente hochladen." }}</p>
      </div>

      <!-- Recent conversions -->
      <div v-else-if="activeTab === 'recent'" class="recent-conversions">
        <h3>{{ $t("admin.docConverter.recent") || "Letzte Konvertierungen" }}</h3>
        <p>{{ $t("admin.docConverter.recentDescription") || "Hier werden die letzten Konvertierungen angezeigt." }}</p>
      </div>

      <!-- Settings -->
      <div v-else-if="activeTab === 'settings'" class="converter-settings">
        <h3>{{ $t("admin.docConverter.settings") || "Einstellungen" }}</h3>
        <p>{{ $t("admin.docConverter.settingsDescription") || "Hier können Sie die Einstellungen für den Dokumentenkonverter anpassen." }}</p>
      </div>

      <!-- Queue -->
      <div v-else-if="activeTab === 'queue'" class="conversion-queue">
        <h3>{{ $t("admin.docConverter.queue") || "Warteschlange" }}</h3>
        <p>{{ $t("admin.docConverter.queueDescription") || "Hier können Sie die Warteschlange der Konvertierungen verwalten." }}</p>
      </div>
    </div>

    <!-- Confirmation Dialog -->
    <div
      v-if="showConfirmDialog"
      class="confirm-dialog-backdrop"
      @click="cancelDialog"
    >
      <div class="confirm-dialog" @click.stop>
        <h3>{{ confirmDialogTitle }}</h3>
        <p>{{ confirmDialogMessage }}</p>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="cancelDialog">
            {{ $t("admin.common.cancel") }}
          </button>
          <button class="btn btn-danger" @click="confirmAction">
            {{ $t("admin.common.confirm") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useDocumentConverterStore } from "@/stores/documentConverter";
import { useI18n } from "vue-i18n";
import { useToast } from "@/composables/useToast";
import BaseFileUpload from "@/components/base/BaseFileUpload.vue";

const { t, locale } = useI18n({ useScope: 'global' });
const documentConverterStore = useDocumentConverterStore();
const toast = useToast();

// Logging to check i18n initialization
console.log(`[AdminDocConverter] i18n initialized with locale: ${locale.value}`);

// Data
const isLoading = ref(false);
const error = ref<string | null>(null);
const activeTab = ref("statistics");
const searchQuery = ref("");
const statusFilter = ref("all");
const currentPage = ref(1);
const itemsPerPage = 10;
const queuePaused = ref(false);

// Confirmation dialog
const showConfirmDialog = ref(false);
const confirmDialogTitle = ref("");
const confirmDialogMessage = ref("");
const confirmAction = ref(() => {});

// Tabs
const tabs = [
  {
    id: "statistics",
    label: "Statistiken",
    icon: "icon-chart",
  },
  {
    id: "upload",
    label: "Dokumente hochladen",
    icon: "icon-upload",
  },
  {
    id: "recent",
    label: "Letzte Konvertierungen",
    icon: "icon-history",
  },
  {
    id: "queue",
    label: "Konvertierungswarteschlange",
    icon: "icon-queue",
  },
  {
    id: "settings",
    label: "Einstellungen",
    icon: "icon-settings",
  },
];

// Data models
const statistics = ref({
  totalConversions: 0,
  conversionsPastWeek: 0,
  successRate: 0,
  activeConversions: 0,
  conversionsByFormat: {} as Record<string, number>,
  conversionTrend: [0, 0, 0, 0, 0, 0, 0], // Last 7 days
});

// Methods
const refreshData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    await loadStatistics();
    toast.success("Daten wurden erfolgreich aktualisiert");
  } catch (err: any) {
    error.value = err.message || "Ein unbekannter Fehler ist aufgetreten";
    toast.error(`Fehler beim Laden der Daten: ${error.value}`);
    console.error("Failed to load document converter data:", err);
  } finally {
    isLoading.value = false;
  }
};

const loadStatistics = async () => {
  try {
    // Mock API call, replace with actual API
    const response = await documentConverterStore.getDocumentStatistics();
    statistics.value = response;
  } catch (err: any) {
    console.error("Failed to load statistics:", err);
    throw new Error("Fehler beim Laden der Statistiken");
  }
};

const cancelDialog = () => {
  showConfirmDialog.value = false;
};

// Lifecycle hooks
onMounted(() => {
  // Initialize data when the component is mounted
  const initializeData = async () => {
    try {
      await refreshData();
    } catch (err) {
      console.error("[AdminDocConverter] Error initializing data:", err);
      error.value = "Fehler beim Laden der Dokumentenkonverter-Daten";
    }
  };

  initializeData();
});
</script>

<style scoped lang="scss">
.admin-doc-converter {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;

  .doc-converter-header {
    margin-bottom: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;

    h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary, #333);
      flex: 1 0 100%;
    }

    .description {
      color: var(--text-secondary, #666);
      margin: 0 0 1rem 0;
      font-size: 0.95rem;
      flex: 1 0 100%;
    }

    .admin-card-actions {
      margin-left: auto;
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: var(--bg-secondary, #ffffff);
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px var(--shadow-color, rgba(0, 0, 0, 0.1));
    display: flex;
    align-items: center;
    gap: 1rem;

    .stat-icon {
      font-size: 2rem;
      color: var(--primary-color, #00a550);

      &.success {
        color: var(--color-success, #22c55e);
      }

      &.error {
        color: var(--color-danger, #ef4444);
      }
    }

    .stat-content {
      flex: 1;

      .stat-value {
        font-size: 1.8rem;
        font-weight: 600;
        color: var(--text-primary, #333);
      }

      .stat-label {
        color: var(--text-secondary, #666);
        font-size: 0.9rem;
      }
    }
  }

  .admin-loading,
  .admin-error {
    padding: 40px;
    text-align: center;
    background: var(--bg-secondary, #ffffff);
    border-radius: 8px;
    box-shadow: 0 2px 4px var(--shadow-color, rgba(0, 0, 0, 0.1));
    margin-bottom: 1.5rem;

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top-color: var(--primary-color, #00a550);
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  }

  .admin-error {
    .error-icon {
      font-size: 40px;
      color: var(--error-color, #ef4444);
      margin-bottom: 15px;
    }

    .error-content {
      h3 {
        margin-top: 0;
        font-size: 18px;
      }
    }
  }

  .admin-content {
    background: var(--bg-secondary, #ffffff);
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px var(--shadow-color, rgba(0, 0, 0, 0.1));
  }

  .converter-tabs {
    display: flex;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border-color);

    .tab-button {
      padding: 12px 20px;
      border: none;
      background: none;
      font-size: 14px;
      cursor: pointer;
      position: relative;

      &.active {
        color: var(--primary-color);
        font-weight: 600;

        &:after {
          content: "";
          position: absolute;
          bottom: -1px;
          left: 0;
          width: 100%;
          height: 2px;
          background-color: var(--primary-color);
        }
      }

      i {
        margin-right: 8px;
      }
    }
  }

  // Buttons
  .btn {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    font-size: 14px;
    cursor: pointer;

    &.btn-primary {
      background-color: var(--primary-color);
      color: white;
    }

    &.btn-secondary {
      background-color: var(--secondary-color);
      color: white;
    }

    &.btn-danger {
      background-color: var(--error-color);
      color: white;
    }

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  }

  // Confirmation dialog
  .confirm-dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;

    .confirm-dialog {
      background-color: var(--card-bg);
      border-radius: 8px;
      padding: 20px;
      width: 100%;
      max-width: 400px;

      h3 {
        margin-top: 0;
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
      }
    }
  }
}

// Responsive styles
@media (max-width: 768px) {
  .admin-doc-converter {
    .converter-tabs {
      flex-wrap: wrap;

      .tab-button {
        flex-grow: 1;
        text-align: center;
        padding: 10px;

        i {
          display: block;
          margin: 0 auto 5px;
        }
      }
    }
  }
}

@media (max-width: 480px) {
  .admin-doc-converter {
    .stats-grid {
      grid-template-columns: 1fr !important;
    }
  }
}
</style>