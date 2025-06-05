<template>
  <div class="admin-dashboard">
    <header class="dashboard-header">
      <h2 class="dashboard-title">{{ t('admin.dashboard.title', 'System-Dashboard') }}</h2>
      <div class="dashboard-actions">
        <button class="btn-refresh" @click="refreshAllData" :disabled="isRefreshing">
          <i :class="['fas fa-sync-alt', { 'fa-spin': isRefreshing }]"></i>
          {{ t('admin.dashboard.refresh', 'Aktualisieren') }}
        </button>
        <span class="last-updated">
          {{ t('admin.dashboard.lastUpdated', 'Zuletzt aktualisiert') }}: 
          {{ lastUpdated ? formatTime(lastUpdated) : '-' }}
        </span>
      </div>
    </header>

    <!-- System Health Overview -->
    <section class="system-health">
      <h3 class="section-title">
        <i class="fas fa-heartbeat"></i>
        {{ t('admin.dashboard.systemHealth', 'System-Gesundheit') }}
      </h3>
      <div class="health-cards">
        <div class="health-card" :class="getHealthClass(systemHealth.overall)">
          <div class="health-icon">
            <i :class="getHealthIcon(systemHealth.overall)"></i>
          </div>
          <div class="health-info">
            <h4>{{ t('admin.dashboard.overallStatus', 'Gesamtstatus') }}</h4>
            <p class="health-status">{{ getHealthLabel(systemHealth.overall) }}</p>
          </div>
        </div>

        <div class="health-card" :class="getHealthClass(systemHealth.api)">
          <div class="health-icon">
            <i class="fas fa-server"></i>
          </div>
          <div class="health-info">
            <h4>{{ t('admin.dashboard.apiStatus', 'API-Status') }}</h4>
            <p class="health-status">{{ getHealthLabel(systemHealth.api) }}</p>
          </div>
        </div>

        <div class="health-card" :class="getHealthClass(systemHealth.database)">
          <div class="health-icon">
            <i class="fas fa-database"></i>
          </div>
          <div class="health-info">
            <h4>{{ t('admin.dashboard.databaseStatus', 'Datenbank') }}</h4>
            <p class="health-status">{{ getHealthLabel(systemHealth.database) }}</p>
          </div>
        </div>

        <div class="health-card" :class="getHealthClass(systemHealth.documents)">
          <div class="health-icon">
            <i class="fas fa-file-alt"></i>
          </div>
          <div class="health-info">
            <h4>{{ t('admin.dashboard.documentProcessor', 'Dokumentenverarbeitung') }}</h4>
            <p class="health-status">{{ getHealthLabel(systemHealth.documents) }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Key Metrics -->
    <section class="key-metrics">
      <h3 class="section-title">
        <i class="fas fa-chart-line"></i>
        {{ t('admin.dashboard.keyMetrics', 'Wichtige Metriken') }}
      </h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon">
            <i class="fas fa-users"></i>
          </div>
          <div class="metric-content">
            <h4>{{ t('admin.dashboard.activeUsers', 'Aktive Benutzer') }}</h4>
            <p class="metric-value">{{ statistics.active_users || 0 }}</p>
            <p class="metric-trend" :class="getTrendClass(userTrend)">
              <i :class="getTrendIcon(userTrend)"></i>
              {{ Math.abs(userTrend) }}% {{ t('admin.dashboard.vsLastWeek', 'ggü. Vorwoche') }}
            </p>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">
            <i class="fas fa-file-upload"></i>
          </div>
          <div class="metric-content">
            <h4>{{ t('admin.dashboard.documentsProcessed', 'Verarbeitete Dokumente') }}</h4>
            <p class="metric-value">{{ documentStats.totalProcessed || 0 }}</p>
            <p class="metric-trend" :class="getTrendClass(documentTrend)">
              <i :class="getTrendIcon(documentTrend)"></i>
              {{ Math.abs(documentTrend) }}% {{ t('admin.dashboard.vsLastWeek', 'ggü. Vorwoche') }}
            </p>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">
            <i class="fas fa-comments"></i>
          </div>
          <div class="metric-content">
            <h4>{{ t('admin.dashboard.ragQueries', 'RAG-Anfragen') }}</h4>
            <p class="metric-value">{{ ragStats.totalQueries || 0 }}</p>
            <p class="metric-trend" :class="getTrendClass(ragTrend)">
              <i :class="getTrendIcon(ragTrend)"></i>
              {{ Math.abs(ragTrend) }}% {{ t('admin.dashboard.vsLastWeek', 'ggü. Vorwoche') }}
            </p>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">
            <i class="fas fa-clock"></i>
          </div>
          <div class="metric-content">
            <h4>{{ t('admin.dashboard.avgResponseTime', 'Ø Antwortzeit') }}</h4>
            <p class="metric-value">{{ formatResponseTime(statistics.avg_response_time_ms) }}</p>
            <p class="metric-trend" :class="getTrendClass(-responseTrend)">
              <i :class="getTrendIcon(-responseTrend)"></i>
              {{ Math.abs(responseTrend) }}% {{ t('admin.dashboard.vsLastWeek', 'ggü. Vorwoche') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Document Processing Queue -->
    <section class="processing-queue">
      <h3 class="section-title">
        <i class="fas fa-tasks"></i>
        {{ t('admin.dashboard.processingQueue', 'Verarbeitungswarteschlange') }}
      </h3>
      <div class="queue-overview">
        <div class="queue-stats">
          <div class="queue-stat">
            <span class="stat-label">{{ t('admin.dashboard.queuedDocuments', 'In Warteschlange') }}</span>
            <span class="stat-value">{{ queueStats.queued || 0 }}</span>
          </div>
          <div class="queue-stat">
            <span class="stat-label">{{ t('admin.dashboard.processingDocuments', 'In Bearbeitung') }}</span>
            <span class="stat-value">{{ queueStats.processing || 0 }}</span>
          </div>
          <div class="queue-stat">
            <span class="stat-label">{{ t('admin.dashboard.completedToday', 'Heute abgeschlossen') }}</span>
            <span class="stat-value">{{ queueStats.completedToday || 0 }}</span>
          </div>
          <div class="queue-stat">
            <span class="stat-label">{{ t('admin.dashboard.failedToday', 'Heute fehlgeschlagen') }}</span>
            <span class="stat-value error">{{ queueStats.failedToday || 0 }}</span>
          </div>
        </div>
        
        <div class="queue-actions">
          <button 
            class="btn btn-secondary" 
            @click="pauseQueue"
            v-if="!queueStats.paused"
            :disabled="isPerformingAction"
          >
            <i class="fas fa-pause"></i>
            {{ t('admin.dashboard.pauseQueue', 'Warteschlange pausieren') }}
          </button>
          <button 
            class="btn btn-success" 
            @click="resumeQueue"
            v-else
            :disabled="isPerformingAction"
          >
            <i class="fas fa-play"></i>
            {{ t('admin.dashboard.resumeQueue', 'Warteschlange fortsetzen') }}
          </button>
        </div>
      </div>
    </section>

    <!-- RAG Performance -->
    <section class="rag-performance">
      <h3 class="section-title">
        <i class="fas fa-brain"></i>
        {{ t('admin.dashboard.ragPerformance', 'RAG-Systemleistung') }}
      </h3>
      <div class="performance-grid">
        <div class="performance-card">
          <h4>{{ t('admin.dashboard.queryAccuracy', 'Abfragegenauigkeit') }}</h4>
          <div class="progress-circle" :data-percentage="ragStats.accuracy">
            <svg viewBox="0 0 36 36">
              <path class="circle-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path class="circle"
                :stroke-dasharray="`${ragStats.accuracy}, 100`"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <text x="18" y="20.35" class="percentage">{{ ragStats.accuracy }}%</text>
            </svg>
          </div>
        </div>

        <div class="performance-card">
          <h4>{{ t('admin.dashboard.cacheHitRate', 'Cache-Trefferquote') }}</h4>
          <div class="progress-circle" :data-percentage="ragStats.cacheHitRate">
            <svg viewBox="0 0 36 36">
              <path class="circle-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path class="circle"
                :stroke-dasharray="`${ragStats.cacheHitRate}, 100`"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <text x="18" y="20.35" class="percentage">{{ ragStats.cacheHitRate }}%</text>
            </svg>
          </div>
        </div>

        <div class="performance-metrics">
          <div class="metric-row">
            <span class="metric-label">{{ t('admin.dashboard.avgContextSize', 'Ø Kontextgröße') }}</span>
            <span class="metric-value">{{ ragStats.avgContextSize || 0 }} Tokens</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">{{ t('admin.dashboard.avgRetrievalTime', 'Ø Abrufzeit') }}</span>
            <span class="metric-value">{{ ragStats.avgRetrievalTime || 0 }}ms</span>
          </div>
          <div class="metric-row">
            <span class="metric-label">{{ t('admin.dashboard.totalEmbeddings', 'Gesamt-Embeddings') }}</span>
            <span class="metric-value">{{ formatNumber(ragStats.totalEmbeddings) }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Recent Activities -->
    <section class="recent-activities">
      <h3 class="section-title">
        <i class="fas fa-history"></i>
        {{ t('admin.dashboard.recentActivities', 'Letzte Aktivitäten') }}
      </h3>
      <div class="activities-list">
        <div 
          v-for="activity in recentActivities" 
          :key="activity.id"
          class="activity-item"
          :class="`activity-${activity.type}`"
        >
          <div class="activity-icon">
            <i :class="getActivityIcon(activity.type)"></i>
          </div>
          <div class="activity-content">
            <p class="activity-description">{{ activity.description }}</p>
            <span class="activity-time">{{ formatTimeAgo(activity.timestamp) }}</span>
          </div>
        </div>
        <div v-if="recentActivities.length === 0" class="no-activities">
          <i class="fas fa-info-circle"></i>
          {{ t('admin.dashboard.noRecentActivities', 'Keine aktuellen Aktivitäten') }}
        </div>
      </div>
    </section>

    <!-- Quick Actions -->
    <section class="quick-actions">
      <h3 class="section-title">
        <i class="fas fa-bolt"></i>
        {{ t('admin.dashboard.quickActions', 'Schnellaktionen') }}
      </h3>
      <div class="actions-grid">
        <button class="action-card" @click="reindexDocuments" :disabled="isPerformingAction">
          <i class="fas fa-sync"></i>
          <span>{{ t('admin.dashboard.reindexDocuments', 'Dokumente neu indizieren') }}</span>
        </button>
        <button class="action-card" @click="clearCache" :disabled="isPerformingAction">
          <i class="fas fa-broom"></i>
          <span>{{ t('admin.dashboard.clearCache', 'Cache leeren') }}</span>
        </button>
        <button class="action-card" @click="optimizeDatabase" :disabled="isPerformingAction">
          <i class="fas fa-database"></i>
          <span>{{ t('admin.dashboard.optimizeDatabase', 'Datenbank optimieren') }}</span>
        </button>
        <button class="action-card" @click="exportStatistics" :disabled="isPerformingAction">
          <i class="fas fa-download"></i>
          <span>{{ t('admin.dashboard.exportStats', 'Statistiken exportieren') }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAdminSystemStore } from '@/stores/admin/system';
import { useDocumentConverterStore } from '@/stores/documentConverter';
import { useRAGStore } from '@/stores/rag';
import { useToast } from '@/composables/useToast';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import apiService from '@/services/api/ApiService';

const { t } = useI18n();
const systemStore = useAdminSystemStore();
const documentStore = useDocumentConverterStore();
const ragStore = useRAGStore();
const toast = useToast();

// State
const isRefreshing = ref(false);
const isPerformingAction = ref(false);
const lastUpdated = ref<Date | null>(null);
const refreshInterval = ref<number | null>(null);

// System Health
const systemHealth = ref({
  overall: 'healthy',
  api: 'healthy',
  database: 'healthy',
  documents: 'healthy'
});

// Statistics
const statistics = computed(() => systemStore.stats || {});
const documentStats = ref({
  totalProcessed: 0,
  totalFailed: 0,
  processingRate: 0
});

const ragStats = ref({
  totalQueries: 0,
  accuracy: 92,
  cacheHitRate: 78,
  avgContextSize: 512,
  avgRetrievalTime: 145,
  totalEmbeddings: 125000
});

const queueStats = ref({
  queued: 0,
  processing: 0,
  completedToday: 0,
  failedToday: 0,
  paused: false
});

// Trends (mock data for now)
const userTrend = ref(12);
const documentTrend = ref(25);
const ragTrend = ref(8);
const responseTrend = ref(-15);

// Recent Activities
const recentActivities = ref([
  {
    id: 1,
    type: 'document',
    description: 'Neues Dokument "Handbuch_2024.pdf" erfolgreich verarbeitet',
    timestamp: new Date(Date.now() - 5 * 60 * 1000)
  },
  {
    id: 2,
    type: 'user',
    description: 'Neuer Benutzer "m.schmidt@example.com" registriert',
    timestamp: new Date(Date.now() - 15 * 60 * 1000)
  },
  {
    id: 3,
    type: 'system',
    description: 'Automatische Datenbankoptimierung durchgeführt',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
  }
]);

// Methods
const refreshAllData = async () => {
  isRefreshing.value = true;
  try {
    // Fetch comprehensive dashboard summary from new API
    const response = await apiService.get('/admin-dashboard/summary');
    
    if (response.success && response.data) {
      const summary = response.data;
      
      // Update system health
      if (summary.health) {
        systemHealth.value = {
          overall: summary.health.overall || 'unknown',
          api: summary.health.api || 'unknown',
          database: summary.health.database || 'unknown',
          documents: summary.health.documents || 'unknown'
        };
      }
      
      // Update statistics
      if (summary.statistics) {
        const stats = summary.statistics;
        statistics.value.active_users = stats.active_users;
        statistics.value.total_users = stats.total_users;
        statistics.value.avg_response_time_ms = stats.avg_response_time_ms;
        
        documentStats.value.totalProcessed = stats.documents_processed_week;
        documentStats.value.totalFailed = stats.documents_failed_today;
        
        userTrend.value = stats.user_trend_percent;
        documentTrend.value = stats.document_trend_percent;
        responseTrend.value = stats.response_trend_percent;
      }
      
      // Update RAG metrics
      if (summary.rag_metrics) {
        const metrics = summary.rag_metrics;
        ragStats.value.totalQueries = metrics.total_queries;
        ragStats.value.accuracy = metrics.accuracy_percent;
        ragStats.value.cacheHitRate = metrics.cache_hit_rate;
        ragStats.value.avgContextSize = metrics.avg_context_size;
        ragStats.value.avgRetrievalTime = metrics.avg_retrieval_time_ms;
        ragStats.value.totalEmbeddings = metrics.total_embeddings;
        ragTrend.value = metrics.query_trend_percent;
      }
      
      // Update queue statistics
      if (summary.queue_stats) {
        queueStats.value = {
          queued: summary.queue_stats.queued,
          processing: summary.queue_stats.processing,
          completedToday: summary.queue_stats.completed_today,
          failedToday: summary.queue_stats.failed_today,
          paused: summary.queue_stats.paused
        };
      }
      
      // Update recent activities
      if (summary.recent_activities) {
        recentActivities.value = summary.recent_activities.map(activity => ({
          id: activity.id,
          type: activity.type,
          description: activity.description,
          timestamp: new Date(activity.timestamp)
        }));
      }
    }
    
    lastUpdated.value = new Date();
    toast.success(t('admin.dashboard.dataRefreshed', 'Daten aktualisiert'));
  } catch (error) {
    console.error('Error refreshing dashboard data:', error);
    toast.error(t('admin.dashboard.refreshError', 'Fehler beim Aktualisieren'));
  } finally {
    isRefreshing.value = false;
  }
};

// Removed fetchRAGStats and fetchQueueStats - now handled by refreshAllData

const pauseQueue = async () => {
  isPerformingAction.value = true;
  try {
    const response = await apiService.post('/admin-dashboard/queue/pause');
    if (response.success) {
      queueStats.value.paused = true;
      toast.success(t('admin.dashboard.queuePaused', 'Warteschlange pausiert'));
    }
  } catch (error) {
    toast.error(t('admin.dashboard.actionError', 'Aktion fehlgeschlagen'));
  } finally {
    isPerformingAction.value = false;
  }
};

const resumeQueue = async () => {
  isPerformingAction.value = true;
  try {
    const response = await apiService.post('/admin-dashboard/queue/resume');
    if (response.success) {
      queueStats.value.paused = false;
      toast.success(t('admin.dashboard.queueResumed', 'Warteschlange fortgesetzt'));
    }
  } catch (error) {
    toast.error(t('admin.dashboard.actionError', 'Aktion fehlgeschlagen'));
  } finally {
    isPerformingAction.value = false;
  }
};

const reindexDocuments = async () => {
  if (!confirm(t('admin.dashboard.confirmReindex', 'Möchten Sie wirklich alle Dokumente neu indizieren?'))) {
    return;
  }
  
  isPerformingAction.value = true;
  try {
    const response = await apiService.post('/admin-dashboard/actions/reindex');
    if (response.success) {
      toast.success(t('admin.dashboard.reindexStarted', 'Neuindizierung gestartet'));
    }
  } catch (error) {
    toast.error(t('admin.dashboard.actionError', 'Aktion fehlgeschlagen'));
  } finally {
    isPerformingAction.value = false;
  }
};

const clearCache = async () => {
  if (!confirm(t('admin.dashboard.confirmClearCache', 'Möchten Sie wirklich den Cache leeren?'))) {
    return;
  }
  
  isPerformingAction.value = true;
  try {
    const response = await apiService.post('/admin-dashboard/actions/clear-cache');
    if (response.success) {
      toast.success(t('admin.dashboard.cacheCleared', 'Cache geleert'));
    }
  } catch (error) {
    toast.error(t('admin.dashboard.actionError', 'Aktion fehlgeschlagen'));
  } finally {
    isPerformingAction.value = false;
  }
};

const optimizeDatabase = async () => {
  isPerformingAction.value = true;
  try {
    const response = await apiService.post('/admin-dashboard/actions/optimize-database');
    if (response.success) {
      toast.success(t('admin.dashboard.optimizationStarted', 'Datenbankoptimierung gestartet'));
    }
  } catch (error) {
    toast.error(t('admin.dashboard.actionError', 'Aktion fehlgeschlagen'));
  } finally {
    isPerformingAction.value = false;
  }
};

const exportStatistics = async () => {
  isPerformingAction.value = true;
  try {
    // Generate and download statistics report
    const data = {
      exportDate: new Date().toISOString(),
      statistics: statistics.value,
      documentStats: documentStats.value,
      ragStats: ragStats.value,
      queueStats: queueStats.value
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `digitale-akte-stats-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success(t('admin.dashboard.statsExported', 'Statistiken exportiert'));
  } catch (error) {
    toast.error(t('admin.dashboard.actionError', 'Aktion fehlgeschlagen'));
  } finally {
    isPerformingAction.value = false;
  }
};

// Utility functions
const getHealthClass = (status: string) => {
  const classes = {
    healthy: 'health-good',
    warning: 'health-warning',
    error: 'health-error'
  };
  return classes[status] || 'health-unknown';
};

const getHealthIcon = (status: string) => {
  const icons = {
    healthy: 'fas fa-check-circle',
    warning: 'fas fa-exclamation-triangle',
    error: 'fas fa-times-circle'
  };
  return icons[status] || 'fas fa-question-circle';
};

const getHealthLabel = (status: string) => {
  const labels = {
    healthy: t('admin.dashboard.statusHealthy', 'Gesund'),
    warning: t('admin.dashboard.statusWarning', 'Warnung'),
    error: t('admin.dashboard.statusError', 'Fehler')
  };
  return labels[status] || t('admin.dashboard.statusUnknown', 'Unbekannt');
};

const getTrendClass = (trend: number) => {
  return trend > 0 ? 'trend-up' : trend < 0 ? 'trend-down' : 'trend-neutral';
};

const getTrendIcon = (trend: number) => {
  return trend > 0 ? 'fas fa-arrow-up' : trend < 0 ? 'fas fa-arrow-down' : 'fas fa-minus';
};

const getActivityIcon = (type: string) => {
  const icons = {
    document: 'fas fa-file-alt',
    user: 'fas fa-user',
    system: 'fas fa-cog',
    error: 'fas fa-exclamation-triangle'
  };
  return icons[type] || 'fas fa-info-circle';
};

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
};

const formatTimeAgo = (date: Date) => {
  return formatDistanceToNow(date, { addSuffix: true, locale: de });
};

const formatResponseTime = (ms: number) => {
  if (!ms) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const formatNumber = (num: number) => {
  if (!num) return '0';
  return new Intl.NumberFormat('de-DE').format(num);
};

// Lifecycle
onMounted(() => {
  refreshAllData();
  // Auto-refresh every 30 seconds
  refreshInterval.value = window.setInterval(refreshAllData, 30000);
});

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
});
</script>

<style scoped>
.admin-dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.dashboard-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--admin-text-primary);
}

.dashboard-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-refresh {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--admin-primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh:hover:not(:disabled) {
  background: var(--admin-primary-dark);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.last-updated {
  font-size: 0.875rem;
  color: var(--admin-text-secondary);
}

/* Section styles */
section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
  color: var(--admin-text-primary);
}

.section-title i {
  color: var(--admin-primary);
}

/* Health Cards */
.health-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.health-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.health-card.health-good {
  background: #e6f7ef;
  border-color: #00a550;
}

.health-card.health-warning {
  background: #fff7e6;
  border-color: #ffa500;
}

.health-card.health-error {
  background: #ffe6e6;
  border-color: #dc3545;
}

.health-icon {
  font-size: 2rem;
  width: 3rem;
  text-align: center;
}

.health-good .health-icon { color: #00a550; }
.health-warning .health-icon { color: #ffa500; }
.health-error .health-icon { color: #dc3545; }

.health-info h4 {
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0 0 0.25rem 0;
  color: var(--admin-text-secondary);
}

.health-status {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
}

.metric-card {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  background: #f8f9fa;
  border-radius: 8px;
  transition: all 0.2s;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.metric-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  background: var(--admin-primary-light);
  border-radius: 50%;
  font-size: 1.25rem;
  color: var(--admin-primary);
  flex-shrink: 0;
}

.metric-content h4 {
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0 0 0.5rem 0;
  color: var(--admin-text-secondary);
}

.metric-value {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
  color: var(--admin-text-primary);
}

.metric-trend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.trend-up { color: #00a550; }
.trend-down { color: #dc3545; }
.trend-neutral { color: var(--admin-text-secondary); }

/* Queue Overview */
.queue-overview {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2rem;
  align-items: center;
}

.queue-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
}

.queue-stat {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.875rem;
  color: var(--admin-text-secondary);
  margin-bottom: 0.25rem;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--admin-text-primary);
}

.stat-value.error {
  color: #dc3545;
}

/* Performance Grid */
.performance-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr;
  gap: 2rem;
  align-items: center;
}

.performance-card {
  text-align: center;
}

.performance-card h4 {
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0 0 1rem 0;
  color: var(--admin-text-secondary);
}

/* Progress Circles */
.progress-circle {
  width: 120px;
  height: 120px;
  margin: 0 auto;
}

.progress-circle svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.circle-bg {
  fill: none;
  stroke: #e6e6e6;
  stroke-width: 3;
}

.circle {
  fill: none;
  stroke: var(--admin-primary);
  stroke-width: 3;
  stroke-linecap: round;
  animation: progress 1s ease-out forwards;
}

@keyframes progress {
  to {
    stroke-dasharray: var(--percentage);
  }
}

.percentage {
  fill: var(--admin-text-primary);
  font-size: 0.5em;
  text-anchor: middle;
  transform: rotate(90deg);
  transform-origin: center;
}

.performance-metrics {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e6e6e6;
}

.metric-row:last-child {
  border-bottom: none;
}

.metric-label {
  font-size: 0.875rem;
  color: var(--admin-text-secondary);
}

/* Activities List */
.activities-list {
  max-height: 300px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  border-left: 3px solid transparent;
  transition: all 0.2s;
}

.activity-item:hover {
  background: #f8f9fa;
}

.activity-document { border-left-color: #0078d4; }
.activity-user { border-left-color: #00a550; }
.activity-system { border-left-color: #6c757d; }
.activity-error { border-left-color: #dc3545; }

.activity-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: #f8f9fa;
  border-radius: 50%;
  flex-shrink: 0;
}

.activity-description {
  margin: 0 0 0.25rem 0;
  font-size: 0.875rem;
  color: var(--admin-text-primary);
}

.activity-time {
  font-size: 0.75rem;
  color: var(--admin-text-secondary);
}

.no-activities {
  text-align: center;
  padding: 2rem;
  color: var(--admin-text-secondary);
}

/* Quick Actions */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-card:hover:not(:disabled) {
  border-color: var(--admin-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.action-card:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-card i {
  font-size: 2rem;
  color: var(--admin-primary);
}

.action-card span {
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  color: var(--admin-text-primary);
}

/* Buttons */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-success {
  background: #00a550;
  color: white;
}

.btn-success:hover {
  background: #008542;
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .performance-grid {
    grid-template-columns: 1fr;
  }
  
  .queue-overview {
    grid-template-columns: 1fr;
  }
}
</style>