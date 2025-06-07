<template>
  <div class="system-monitor">
    <header class="monitor-header">
      <h2 class="monitor-title">{{ t('admin.systemMonitor.title', 'System-Überwachung') }}</h2>
      <div class="monitor-controls">
        <select v-model="refreshInterval" @change="updateRefreshInterval" class="interval-select">
          <option :value="5000">{{ t('admin.systemMonitor.refresh5s', '5 Sekunden') }}</option>
          <option :value="10000">{{ t('admin.systemMonitor.refresh10s', '10 Sekunden') }}</option>
          <option :value="30000">{{ t('admin.systemMonitor.refresh30s', '30 Sekunden') }}</option>
          <option :value="60000">{{ t('admin.systemMonitor.refresh1m', '1 Minute') }}</option>
          <option :value="0">{{ t('admin.systemMonitor.refreshManual', 'Manuell') }}</option>
        </select>
        <button class="btn btn-secondary" @click="refreshData" :disabled="isRefreshing">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': isRefreshing }"></i>
          {{ t('admin.systemMonitor.refresh', 'Aktualisieren') }}
        </button>
      </div>
    </header>

    <!-- System Resources -->
    <section class="monitor-section">
      <h3 class="section-title">
        <i class="fas fa-server"></i>
        {{ t('admin.systemMonitor.systemResources', 'System-Ressourcen') }}
      </h3>
      
      <div class="resources-grid">
        <!-- CPU Usage -->
        <div class="resource-card">
          <h4>{{ t('admin.systemMonitor.cpuUsage', 'CPU-Auslastung') }}</h4>
          <div class="gauge-container">
            <canvas ref="cpuGauge" width="200" height="160"></canvas>
          </div>
          <div class="resource-details">
            <div class="detail-row">
              <span>{{ t('admin.systemMonitor.cores', 'Kerne') }}:</span>
              <span>{{ systemInfo.cpuCores || 0 }}</span>
            </div>
            <div class="detail-row">
              <span>{{ t('admin.systemMonitor.threads', 'Threads') }}:</span>
              <span>{{ systemInfo.cpuThreads || 0 }}</span>
            </div>
            <div class="detail-row">
              <span>{{ t('admin.systemMonitor.temperature', 'Temperatur') }}:</span>
              <span>{{ systemInfo.cpuTemp || 'N/A' }}°C</span>
            </div>
          </div>
        </div>

        <!-- Memory Usage -->
        <div class="resource-card">
          <h4>{{ t('admin.systemMonitor.memoryUsage', 'Speichernutzung') }}</h4>
          <div class="gauge-container">
            <canvas ref="memoryGauge" width="200" height="160"></canvas>
          </div>
          <div class="resource-details">
            <div class="detail-row">
              <span>{{ t('admin.systemMonitor.used', 'Verwendet') }}:</span>
              <span>{{ formatBytes(memoryInfo.used) }}</span>
            </div>
            <div class="detail-row">
              <span>{{ t('admin.systemMonitor.total', 'Gesamt') }}:</span>
              <span>{{ formatBytes(memoryInfo.total) }}</span>
            </div>
            <div class="detail-row">
              <span>{{ t('admin.systemMonitor.available', 'Verfügbar') }}:</span>
              <span>{{ formatBytes(memoryInfo.available) }}</span>
            </div>
          </div>
        </div>

        <!-- Disk Usage -->
        <div class="resource-card">
          <h4>{{ t('admin.systemMonitor.diskUsage', 'Festplattennutzung') }}</h4>
          <div class="gauge-container">
            <canvas ref="diskGauge" width="200" height="160"></canvas>
          </div>
          <div class="resource-details">
            <div class="detail-row">
              <span>{{ t('admin.systemMonitor.used', 'Verwendet') }}:</span>
              <span>{{ formatBytes(diskInfo.used) }}</span>
            </div>
            <div class="detail-row">
              <span>{{ t('admin.systemMonitor.total', 'Gesamt') }}:</span>
              <span>{{ formatBytes(diskInfo.total) }}</span>
            </div>
            <div class="detail-row">
              <span>{{ t('admin.systemMonitor.free', 'Frei') }}:</span>
              <span>{{ formatBytes(diskInfo.free) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Process Information -->
    <section class="monitor-section">
      <h3 class="section-title">
        <i class="fas fa-microchip"></i>
        {{ t('admin.systemMonitor.processInfo', 'Prozessinformationen') }}
      </h3>
      
      <div class="process-stats">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-clock"></i>
          </div>
          <div class="stat-content">
            <h4>{{ t('admin.systemMonitor.uptime', 'Laufzeit') }}</h4>
            <p>{{ formatUptime(processInfo.uptime) }}</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-memory"></i>
          </div>
          <div class="stat-content">
            <h4>{{ t('admin.systemMonitor.processMemory', 'Prozessspeicher') }}</h4>
            <p>{{ formatBytes(processInfo.memory) }}</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-tasks"></i>
          </div>
          <div class="stat-content">
            <h4>{{ t('admin.systemMonitor.activeThreads', 'Aktive Threads') }}</h4>
            <p>{{ processInfo.threads || 0 }}</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-tachometer-alt"></i>
          </div>
          <div class="stat-content">
            <h4>{{ t('admin.systemMonitor.processCPU', 'Prozess-CPU') }}</h4>
            <p>{{ processInfo.cpuUsage || 0 }}%</p>
          </div>
        </div>
      </div>
    </section>

    <!-- RAG System Status -->
    <section class="monitor-section">
      <h3 class="section-title">
        <i class="fas fa-brain"></i>
        {{ t('admin.systemMonitor.ragStatus', 'RAG-System Status') }}
      </h3>
      
      <div class="rag-metrics">
        <div class="metric-card">
          <h4>{{ t('admin.systemMonitor.queryPerformance', 'Abfrageleistung') }}</h4>
          <canvas ref="queryChart" width="400" height="200"></canvas>
        </div>

        <div class="metric-card">
          <h4>{{ t('admin.systemMonitor.cachePerformance', 'Cache-Leistung') }}</h4>
          <div class="cache-stats">
            <div class="cache-stat">
              <span class="label">{{ t('admin.systemMonitor.hitRate', 'Trefferquote') }}:</span>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: ragMetrics.cacheHitRate + '%' }"></div>
              </div>
              <span class="value">{{ ragMetrics.cacheHitRate }}%</span>
            </div>
            <div class="cache-stat">
              <span class="label">{{ t('admin.systemMonitor.cacheSize', 'Cache-Größe') }}:</span>
              <span class="value">{{ formatBytes(ragMetrics.cacheSize) }}</span>
            </div>
            <div class="cache-stat">
              <span class="label">{{ t('admin.systemMonitor.cacheEntries', 'Einträge') }}:</span>
              <span class="value">{{ formatNumber(ragMetrics.cacheEntries) }}</span>
            </div>
          </div>
        </div>

        <div class="metric-card">
          <h4>{{ t('admin.systemMonitor.embeddingStatus', 'Embedding-Status') }}</h4>
          <div class="embedding-stats">
            <div class="stat-row">
              <span>{{ t('admin.systemMonitor.totalEmbeddings', 'Gesamt') }}:</span>
              <span>{{ formatNumber(ragMetrics.totalEmbeddings) }}</span>
            </div>
            <div class="stat-row">
              <span>{{ t('admin.systemMonitor.avgEmbeddingTime', 'Ø Zeit') }}:</span>
              <span>{{ ragMetrics.avgEmbeddingTime }}ms</span>
            </div>
            <div class="stat-row">
              <span>{{ t('admin.systemMonitor.embeddingQueue', 'Warteschlange') }}:</span>
              <span>{{ ragMetrics.embeddingQueue }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Background Jobs -->
    <section class="monitor-section">
      <h3 class="section-title">
        <i class="fas fa-tasks"></i>
        {{ t('admin.systemMonitor.backgroundJobs', 'Hintergrund-Jobs') }}
      </h3>
      
      <div class="jobs-table">
        <table>
          <thead>
            <tr>
              <th>{{ t('admin.systemMonitor.jobName', 'Job-Name') }}</th>
              <th>{{ t('admin.systemMonitor.status', 'Status') }}</th>
              <th>{{ t('admin.systemMonitor.progress', 'Fortschritt') }}</th>
              <th>{{ t('admin.systemMonitor.startTime', 'Startzeit') }}</th>
              <th>{{ t('admin.systemMonitor.duration', 'Dauer') }}</th>
              <th>{{ t('admin.systemMonitor.actions', 'Aktionen') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="job in backgroundJobs" :key="job.id">
              <td>{{ job.name }}</td>
              <td>
                <span class="status-badge" :class="`status-${job.status}`">
                  {{ getStatusLabel(job.status) }}
                </span>
              </td>
              <td>
                <div class="progress-cell">
                  <div class="progress-bar small">
                    <div class="progress-fill" :style="{ width: job.progress + '%' }"></div>
                  </div>
                  <span>{{ job.progress }}%</span>
                </div>
              </td>
              <td>{{ formatTime(job.startTime) }}</td>
              <td>{{ formatDuration(job.duration) }}</td>
              <td>
                <button 
                  v-if="job.status === 'running'" 
                  class="btn-icon"
                  @click="pauseJob(job.id)"
                  title="Pausieren"
                >
                  <i class="fas fa-pause"></i>
                </button>
                <button 
                  v-if="job.status === 'paused'" 
                  class="btn-icon"
                  @click="resumeJob(job.id)"
                  title="Fortsetzen"
                >
                  <i class="fas fa-play"></i>
                </button>
                <button 
                  v-if="job.status !== 'completed'" 
                  class="btn-icon danger"
                  @click="cancelJob(job.id)"
                  title="Abbrechen"
                >
                  <i class="fas fa-stop"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="backgroundJobs.length === 0" class="no-jobs">
          <i class="fas fa-check-circle"></i>
          <p>{{ t('admin.systemMonitor.noActiveJobs', 'Keine aktiven Jobs') }}</p>
        </div>
      </div>
    </section>

    <!-- System Logs -->
    <section class="monitor-section">
      <h3 class="section-title">
        <i class="fas fa-clipboard-list"></i>
        {{ t('admin.systemMonitor.systemLogs', 'System-Logs') }}
      </h3>
      
      <div class="logs-container">
        <div class="logs-filter">
          <select v-model="logLevel" @change="filterLogs" class="log-level-select">
            <option value="all">{{ t('admin.systemMonitor.allLevels', 'Alle Level') }}</option>
            <option value="error">{{ t('admin.systemMonitor.errors', 'Fehler') }}</option>
            <option value="warning">{{ t('admin.systemMonitor.warnings', 'Warnungen') }}</option>
            <option value="info">{{ t('admin.systemMonitor.info', 'Info') }}</option>
            <option value="debug">{{ t('admin.systemMonitor.debug', 'Debug') }}</option>
          </select>
          <input 
            type="text" 
            v-model="logSearch"
            @input="searchLogs"
            class="log-search"
            :placeholder="t('admin.systemMonitor.searchLogs', 'Logs durchsuchen...')"
          >
          <button class="btn btn-sm" @click="clearLogs">
            <i class="fas fa-broom"></i>
            {{ t('admin.systemMonitor.clearLogs', 'Logs löschen') }}
          </button>
        </div>
        
        <div class="logs-viewer" ref="logsViewer">
          <div 
            v-for="log in filteredLogs" 
            :key="log.id"
            class="log-entry"
            :class="`log-${log.level}`"
          >
            <span class="log-time">{{ formatLogTime(log.timestamp) }}</span>
            <span class="log-level">{{ log.level.toUpperCase() }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSystemStore } from '@/stores/system';
import { useToast } from '@/composables/useToast';
import apiService from '@/services/api/ApiService';

const { t } = useI18n();
const systemStore = useSystemStore();
const toast = useToast();

// State
const isRefreshing = ref(false);
const refreshInterval = ref(10000); // 10 seconds default
const refreshTimer = ref<number | null>(null);

// Canvas refs
const cpuGauge = ref<HTMLCanvasElement | null>(null);
const memoryGauge = ref<HTMLCanvasElement | null>(null);
const diskGauge = ref<HTMLCanvasElement | null>(null);
const queryChart = ref<HTMLCanvasElement | null>(null);
const logsViewer = ref<HTMLDivElement | null>(null);

// System Info
const systemInfo = ref({
  cpuCores: 8,
  cpuThreads: 16,
  cpuTemp: 45,
  cpuUsage: 0
});

const memoryInfo = ref({
  total: 16 * 1024 * 1024 * 1024, // 16 GB
  used: 0,
  available: 0,
  percent: 0
});

const diskInfo = ref({
  total: 500 * 1024 * 1024 * 1024, // 500 GB
  used: 0,
  free: 0,
  percent: 0
});

const processInfo = ref({
  uptime: 0,
  memory: 0,
  threads: 0,
  cpuUsage: 0
});

// RAG Metrics
const ragMetrics = ref({
  queryTimes: [] as number[],
  cacheHitRate: 78,
  cacheSize: 125 * 1024 * 1024,
  cacheEntries: 1567,
  totalEmbeddings: 125000,
  avgEmbeddingTime: 145,
  embeddingQueue: 0
});

// Background Jobs
const backgroundJobs = ref([]);

// Network Stats
const networkStats = ref({
  rxSpeed: 0,
  txSpeed: 0,
  total: 0
});

// Logs
const logLevel = ref('all');
const logSearch = ref('');
const systemLogs = ref([]);

// Computed
const filteredLogs = computed(() => {
  let logs = [...systemLogs.value];
  
  // Filter by level
  if (logLevel.value !== 'all') {
    logs = logs.filter(log => log.level === logLevel.value);
  }
  
  // Filter by search
  if (logSearch.value) {
    const search = logSearch.value.toLowerCase();
    logs = logs.filter(log => 
      log.message.toLowerCase().includes(search)
    );
  }
  
  return logs.reverse(); // Newest first
});

// Methods
const refreshData = async () => {
  isRefreshing.value = true;
  try {
    // Fetch real system data
    await Promise.all([
      fetchSystemInfo(),
      fetchProcesses(),
      fetchNetworkInfo(),
      fetchRAGMetrics(),
      fetchBackgroundJobs(),
      fetchSystemLogs()
    ]);
    
    // Update charts
    await nextTick();
    drawGauges();
    drawQueryChart();
    
    toast.success(t('admin.systemMonitor.dataRefreshed', 'Daten aktualisiert'));
  } catch (error) {
    toast.error(t('admin.systemMonitor.refreshError', 'Fehler beim Aktualisieren'));
  } finally {
    isRefreshing.value = false;
  }
};

// API fetch functions
const fetchSystemInfo = async () => {
  try {
    const response = await apiService.get('/system-monitor/info');
    if (response.success && response.data) {
      const data = response.data;
      systemInfo.value.cpuCores = data.cpuCores;
      systemInfo.value.cpuThreads = data.cpuThreads;
      systemInfo.value.cpuTemp = data.cpuTemp;
      systemInfo.value.cpuUsage = data.cpuUsage;
      
      memoryInfo.value.total = data.memoryTotal;
      memoryInfo.value.used = data.memoryUsed;
      memoryInfo.value.available = data.memoryAvailable;
      memoryInfo.value.percent = data.memoryPercent;
      
      diskInfo.value.total = data.diskTotal;
      diskInfo.value.used = data.diskUsed;
      diskInfo.value.free = data.diskFree;
      diskInfo.value.percent = data.diskPercent;
      
      processInfo.value.uptime = Date.now() - (data.uptime * 1000);
    }
  } catch (error) {
    console.error('Error fetching system info:', error);
  }
};

const fetchProcesses = async () => {
  try {
    const response = await apiService.get('/system-monitor/processes?limit=10');
    if (response.success && response.data) {
      // Process data can be displayed in a future enhancement
    }
  } catch (error) {
    console.error('Error fetching processes:', error);
  }
};

const fetchNetworkInfo = async () => {
  try {
    const response = await apiService.get('/system-monitor/network');
    if (response.success && response.data) {
      // Initialize networkStats if undefined
      if (!networkStats.value) {
        networkStats.value = {
          rxSpeed: 0,
          txSpeed: 0,
          total: 0
        };
      }
      
      // Update with response data
      networkStats.value = {
        rxSpeed: response.data.rxSpeed || response.data.recv_rate_mbps || 0,
        txSpeed: response.data.txSpeed || response.data.send_rate_mbps || 0,
        total: response.data.totalTraffic || response.data.total_bytes_recv || 0
      };
    }
  } catch (error) {
    console.error('Error fetching network info:', error);
    // Initialize with default values on error
    networkStats.value = {
      rxSpeed: 0,
      txSpeed: 0,
      total: 0
    };
  }
};

const fetchRAGMetrics = async () => {
  try {
    const response = await apiService.get('/system-monitor/rag/metrics');
    if (response.success && response.data) {
      ragMetrics.value.queryTimes = response.data.queryTimes;
      ragMetrics.value.cacheHitRate = response.data.cacheHitRate;
      ragMetrics.value.cacheSize = response.data.cacheSize;
      ragMetrics.value.cacheEntries = response.data.cacheEntries;
      ragMetrics.value.totalEmbeddings = response.data.totalEmbeddings;
      ragMetrics.value.avgEmbeddingTime = response.data.avgEmbeddingTime;
      ragMetrics.value.embeddingQueue = response.data.embeddingQueue;
    }
  } catch (error) {
    console.error('Error fetching RAG metrics:', error);
  }
};

const fetchBackgroundJobs = async () => {
  try {
    const response = await apiService.get('/system-monitor/jobs');
    if (response.success && response.data) {
      // Handle different response formats
      const jobData = response.data.recent_jobs || response.data.jobs || response.data;
      
      if (Array.isArray(jobData)) {
        backgroundJobs.value = jobData.map(job => ({
          id: job.id,
          name: job.name || job.type,
          status: job.status,
          progress: job.progress || 0,
          startTime: job.started_at ? new Date(job.started_at) : new Date(),
          duration: job.duration || job.duration_seconds || 0
        }));
      } else {
        backgroundJobs.value = [];
      }
    }
  } catch (error) {
    console.error('Error fetching background jobs:', error);
  }
};

const fetchSystemLogs = async () => {
  try {
    const response = await apiService.get(`/system-monitor/logs?limit=100${logLevel.value !== 'all' ? '&level=' + logLevel.value : ''}`);
    if (response.success && response.data) {
      // Handle different response formats
      const logsData = response.data.logs || response.data;
      
      if (Array.isArray(logsData)) {
        systemLogs.value = logsData.map((log, index) => ({
          id: log.id || index,
          timestamp: new Date(log.timestamp),
          level: log.level,
          message: log.message
        }));
      } else {
        systemLogs.value = [];
      }
    }
  } catch (error) {
    console.error('Error fetching system logs:', error);
  }
};

const updateRefreshInterval = () => {
  // Clear existing timer
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
    refreshTimer.value = null;
  }
  
  // Set new timer if not manual
  if (refreshInterval.value > 0) {
    refreshTimer.value = window.setInterval(refreshData, refreshInterval.value);
  }
};

// Gauge drawing
const drawGauge = (canvas: HTMLCanvasElement, value: number, label: string, color: string) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height - 20;
  const radius = 70;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw background arc
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, Math.PI, 0, false);
  ctx.lineWidth = 20;
  ctx.strokeStyle = '#e6e6e6';
  ctx.stroke();
  
  // Draw value arc
  const angle = (value / 100) * Math.PI;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, Math.PI, Math.PI + angle, false);
  ctx.lineWidth = 20;
  ctx.strokeStyle = color;
  ctx.stroke();
  
  // Draw value text
  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = '#333';
  ctx.textAlign = 'center';
  ctx.fillText(`${value}%`, centerX, centerY - 10);
  
  // Draw label
  ctx.font = '14px Arial';
  ctx.fillStyle = '#666';
  ctx.fillText(label, centerX, centerY + 20);
};

const drawGauges = () => {
  if (cpuGauge.value) {
    drawGauge(cpuGauge.value, systemInfo.value.cpuUsage, 'CPU', '#0078d4');
  }
  if (memoryGauge.value) {
    drawGauge(memoryGauge.value, memoryInfo.value.percent, 'RAM', '#00a550');
  }
  if (diskGauge.value) {
    drawGauge(diskGauge.value, diskInfo.value.percent, 'Disk', '#ff8c00');
  }
};

const drawQueryChart = () => {
  const canvas = queryChart.value;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const data = ragMetrics.value.queryTimes;
  const width = canvas.width;
  const height = canvas.height;
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Draw axes
  ctx.strokeStyle = '#ccc';
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();
  
  // Draw data
  if (data.length > 0) {
    const maxValue = Math.max(...data);
    const barWidth = chartWidth / data.length;
    
    ctx.fillStyle = '#0078d4';
    data.forEach((value, index) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = padding + index * barWidth;
      const y = height - padding - barHeight;
      
      ctx.fillRect(x + 2, y, barWidth - 4, barHeight);
    });
  }
  
  // Draw labels
  ctx.font = '12px Arial';
  ctx.fillStyle = '#666';
  ctx.textAlign = 'center';
  ctx.fillText('Query Response Times (ms)', width / 2, padding - 5);
};

// Job management
const pauseJob = async (jobId: string) => {
  try {
    const response = await apiService.post(`/system-monitor/jobs/${jobId}/pause`);
    if (response.success) {
      await fetchBackgroundJobs();
      toast.success(t('admin.systemMonitor.jobPaused', 'Job pausiert'));
    }
  } catch (error) {
    toast.error(t('admin.systemMonitor.jobError', 'Fehler beim Pausieren'));
  }
};

const resumeJob = async (jobId: string) => {
  try {
    const response = await apiService.post(`/system-monitor/jobs/${jobId}/resume`);
    if (response.success) {
      await fetchBackgroundJobs();
      toast.success(t('admin.systemMonitor.jobResumed', 'Job fortgesetzt'));
    }
  } catch (error) {
    toast.error(t('admin.systemMonitor.jobError', 'Fehler beim Fortsetzen'));
  }
};

const cancelJob = async (jobId: string) => {
  if (confirm(t('admin.systemMonitor.confirmCancel', 'Möchten Sie diesen Job wirklich abbrechen?'))) {
    try {
      const response = await apiService.delete(`/system-monitor/jobs/${jobId}`);
      if (response.success) {
        await fetchBackgroundJobs();
        toast.success(t('admin.systemMonitor.jobCancelled', 'Job abgebrochen'));
      }
    } catch (error) {
      toast.error(t('admin.systemMonitor.jobError', 'Fehler beim Abbrechen'));
    }
  }
};

// Log management
const filterLogs = async () => {
  await fetchSystemLogs();
};

const searchLogs = () => {
  // Searching is handled by computed property
};

const clearLogs = async () => {
  if (confirm(t('admin.systemMonitor.confirmClearLogs', 'Möchten Sie wirklich alle Logs löschen?'))) {
    try {
      const response = await apiService.delete('/system-monitor/logs');
      if (response.success) {
        systemLogs.value = [];
        toast.success(t('admin.systemMonitor.logsCleared', 'Logs gelöscht'));
      }
    } catch (error) {
      toast.error(t('admin.systemMonitor.clearError', 'Fehler beim Löschen'));
    }
  }
};

// Utility functions
const formatBytes = (bytes: number) => {
  if (bytes === undefined || bytes === null || isNaN(bytes)) {
    return '0 B';
  }
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('de-DE').format(num);
};

const formatUptime = (startTime: number) => {
  const uptime = Date.now() - startTime;
  const days = Math.floor(uptime / (24 * 60 * 60 * 1000));
  const hours = Math.floor((uptime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((uptime % (60 * 60 * 1000)) / (60 * 1000));
  
  return `${days}d ${hours}h ${minutes}m`;
};

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / (60 * 1000));
  const seconds = Math.floor((ms % (60 * 1000)) / 1000);
  return `${minutes}m ${seconds}s`;
};

const formatLogTime = (date: Date) => {
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    running: t('admin.systemMonitor.running', 'Läuft'),
    paused: t('admin.systemMonitor.paused', 'Pausiert'),
    completed: t('admin.systemMonitor.completed', 'Abgeschlossen'),
    failed: t('admin.systemMonitor.failed', 'Fehlgeschlagen')
  };
  return labels[status] || status;
};

// Lifecycle
onMounted(() => {
  refreshData();
  updateRefreshInterval();
});

onUnmounted(() => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
  }
});
</script>

<style scoped>
.system-monitor {
  max-width: 1400px;
  margin: 0 auto;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.monitor-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--admin-text-primary);
}

.monitor-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.interval-select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--admin-border);
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
}

/* Sections */
.monitor-section {
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

/* Resources Grid */
.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.resource-card {
  padding: 1.25rem;
  background: #f8f9fa;
  border-radius: 8px;
  text-align: center;
}

.resource-card h4 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: var(--admin-text-primary);
}

.gauge-container {
  margin-bottom: 1rem;
}

.resource-details {
  text-align: left;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  font-size: 0.875rem;
  color: var(--admin-text-secondary);
}

/* Process Stats */
.process-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.25rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  background: var(--admin-primary-light);
  border-radius: 50%;
  font-size: 1.25rem;
  color: var(--admin-primary);
}

.stat-content h4 {
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0 0 0.25rem 0;
  color: var(--admin-text-secondary);
}

.stat-content p {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: var(--admin-text-primary);
}

/* RAG Metrics */
.rag-metrics {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 1.5rem;
}

.metric-card {
  padding: 1.25rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.metric-card h4 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: var(--admin-text-primary);
}

.cache-stats,
.embedding-stats {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cache-stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cache-stat .label {
  font-size: 0.875rem;
  color: var(--admin-text-secondary);
}

.cache-stat .value {
  font-weight: 600;
  color: var(--admin-text-primary);
}

.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.stat-row span:first-child {
  color: var(--admin-text-secondary);
}

.stat-row span:last-child {
  font-weight: 600;
  color: var(--admin-text-primary);
}

/* Progress Bar */
.progress-bar {
  height: 6px;
  background: #e6e6e6;
  border-radius: 3px;
  overflow: hidden;
  margin: 0.25rem 0;
}

.progress-bar.small {
  height: 4px;
}

.progress-fill {
  height: 100%;
  background: var(--admin-primary);
  transition: width 0.3s;
}

/* Jobs Table */
.jobs-table {
  overflow-x: auto;
}

.jobs-table table {
  width: 100%;
  border-collapse: collapse;
}

.jobs-table th,
.jobs-table td {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 1px solid var(--admin-border);
}

.jobs-table th {
  font-weight: 600;
  color: var(--admin-text-secondary);
  font-size: 0.875rem;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-running { background: #e6f7ff; color: #0078d4; }
.status-paused { background: #fff7e6; color: #ff8c00; }
.status-completed { background: #e6f7ef; color: #00a550; }
.status-failed { background: #ffe6e6; color: #dc3545; }

.progress-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-cell .progress-bar {
  flex: 1;
  max-width: 100px;
}

.no-jobs {
  text-align: center;
  padding: 3rem;
  color: var(--admin-text-secondary);
}

.no-jobs i {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #00a550;
}

/* Logs */
.logs-container {
  height: 400px;
  display: flex;
  flex-direction: column;
}

.logs-filter {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.log-level-select,
.log-search {
  padding: 0.5rem 1rem;
  border: 1px solid var(--admin-border);
  border-radius: 4px;
  font-size: 0.875rem;
}

.log-search {
  flex: 1;
}

.logs-viewer {
  flex: 1;
  overflow-y: auto;
  background: #1e1e1e;
  border-radius: 4px;
  padding: 1rem;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
}

.log-entry {
  display: flex;
  gap: 1rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid #333;
}

.log-time {
  color: #888;
  white-space: nowrap;
}

.log-level {
  font-weight: 600;
  width: 60px;
}

.log-message {
  flex: 1;
  word-break: break-word;
}

.log-info { color: #58a6ff; }
.log-warning { color: #ffa500; }
.log-error { color: #ff6b6b; }
.log-debug { color: #888; }

/* Buttons */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.btn-icon {
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid var(--admin-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--admin-bg-hover);
}

.btn-icon.danger:hover {
  background: #ffe6e6;
  border-color: #dc3545;
  color: #dc3545;
}

.btn:disabled,
.btn-icon:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 1200px) {
  .rag-metrics {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .monitor-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .resources-grid {
    grid-template-columns: 1fr;
  }
  
  .logs-filter {
    flex-direction: column;
  }
}
</style>