<template>
  <div v-if="showMonitor" class="router-health-monitor" :class="monitorClasses">
    <div class="monitor-header" @click="toggleExpanded">
      <span class="monitor-icon" :style="{ color: statusColor }">{{ statusIcon }}</span>
      <span class="monitor-title">Router Status</span>
      <span class="monitor-toggle">{{ isExpanded ? '▼' : '▶' }}</span>
    </div>

    <div v-if="isExpanded" class="monitor-content">
      <!-- Quick Stats -->
      <div class="quick-stats">
        <div class="stat-item">
          <span class="stat-label">Status</span>
          <span class="stat-value" :style="{ color: statusColor }">{{ routerStatus }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Fehler</span>
          <span class="stat-value">{{ healthMetrics.errorCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Success Rate</span>
          <span class="stat-value">{{ successRatePercent }}%</span>
        </div>
      </div>

      <!-- Current Route Info -->
      <div class="route-info">
        <h4>Aktuelle Route</h4>
        <div v-if="currentRoute" class="route-details">
          <p><strong>Path:</strong> {{ currentRoute.path }}</p>
          <p><strong>Name:</strong> {{ currentRoute.name || 'N/A' }}</p>
        </div>
        <div v-else class="route-error">
          Route nicht verfügbar
        </div>
      </div>

      <!-- Recent Errors -->
      <div v-if="recentErrors.length > 0" class="recent-errors">
        <h4>Letzte Fehler</h4>
        <div v-for="error in recentErrors" :key="error.timestamp" class="error-item">
          <span class="error-time">{{ formatTime(error.timestamp) }}</span>
          <span class="error-message">{{ error.message }}</span>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <h4>Quick Actions</h4>
        <div class="action-buttons">
          <button @click="softReset" class="action-btn">
            🔄 Soft Reset
          </button>
          <button @click="clearErrors" class="action-btn">
            🧹 Clear Errors
          </button>
          <button @click="openDebugPanel" class="action-btn">
            🐛 Debug Panel
          </button>
          <button @click="exportDiagnostics" class="action-btn">
            💾 Export
          </button>
        </div>
      </div>

      <!-- Recovery Status -->
      <div v-if="activeRecoveries.length > 0" class="recovery-status">
        <h4>Active Recoveries</h4>
        <div v-for="[issue, strategy] in activeRecoveries" :key="issue" class="recovery-item">
          <span class="recovery-issue">{{ issue }}</span>
          <span class="recovery-strategy">{{ strategy.name }}</span>
        </div>
      </div>
    </div>

    <!-- Minimized View -->
    <div v-else-if="!isExpanded" class="monitor-minimal">
      <span class="minimal-status" :style="{ background: statusColor }"></span>
      <span class="minimal-text">{{ healthMetrics.errorCount }} errors</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { unifiedDiagnosticsService } from '@/services/diagnostics/UnifiedDiagnosticsServiceFixed';
import { routerService } from '@/services/router/RouterServiceFixed';
import { useLogger } from '@/composables/useLogger';
import { useToast } from '@/composables/useToast';

// Props
interface Props {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  startExpanded?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
}

const props = withDefaults(defineProps<Props>(), {
  position: 'bottom-right',
  startExpanded: false,
  autoHide: true,
  autoHideDelay: 30000 // 30 seconds
});

// Services
const router = useRouter();
const route = useRoute();
const logger = useLogger();
const toast = useToast();

// State
const isExpanded = ref(props.startExpanded);
const showMonitor = ref(true);
const autoHideTimer = ref<number | null>(null);

// Diagnostics data
const healthMetrics = unifiedDiagnosticsService.getHealthMetrics();
const diagnosticsHistory = unifiedDiagnosticsService.getDiagnosticsHistory();
const activeRecoveries = unifiedDiagnosticsService.getActiveRecoveries();

// Computed
const monitorClasses = computed(() => ({
  [`position-${props.position}`]: true,
  'is-expanded': isExpanded.value,
  'has-errors': healthMetrics.value.errorCount > 0,
  'is-critical': healthMetrics.value.consecutiveFailures > 3
}));

const statusColor = computed(() => {
  if (healthMetrics.value.consecutiveFailures > 3) return '#e74c3c';
  if (healthMetrics.value.errorCount > 0) return '#f39c12';
  if (healthMetrics.value.initStatus !== 'ready') return '#95a5a6';
  return '#27ae60';
});

const statusIcon = computed(() => {
  if (healthMetrics.value.consecutiveFailures > 3) return '❌';
  if (healthMetrics.value.errorCount > 0) return '⚠️';
  if (healthMetrics.value.initStatus !== 'ready') return '🔄';
  return '✅';
});

const routerStatus = computed(() => {
  if (healthMetrics.value.consecutiveFailures > 3) return 'Kritisch';
  if (healthMetrics.value.errorCount > 0) return 'Fehler';
  if (healthMetrics.value.initStatus !== 'ready') return 'Initialisierung';
  return 'OK';
});

const successRatePercent = computed(() => {
  const rate = healthMetrics.value.navigationSuccessRate;
  return Math.round(rate * 100);
});

const currentRoute = computed(() => {
  try {
    return route;
  } catch (error) {
    return null;
  }
});

const recentErrors = computed(() => {
  const recent = diagnosticsHistory.value.slice(-5);
  const errors = [];
  
  for (const report of recent) {
    if (report.healthMetrics.lastError) {
      errors.push(report.healthMetrics.lastError);
    }
  }
  
  return errors.slice(-3); // Show last 3 errors
});

// Methods
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
  resetAutoHideTimer();
};

const resetAutoHideTimer = () => {
  if (autoHideTimer.value) {
    clearTimeout(autoHideTimer.value);
  }

  if (props.autoHide && healthMetrics.value.errorCount === 0) {
    autoHideTimer.value = window.setTimeout(() => {
      showMonitor.value = false;
    }, props.autoHideDelay);
  }
};

const softReset = async () => {
  try {
    await routerService.reset();
    toast.success('Router reset erfolgreich');
  } catch (error) {
    logger.error('Router reset fehlgeschlagen:', error);
    toast.error('Router reset fehlgeschlagen');
  }
};

const clearErrors = () => {
  // Clear error count in diagnostics
  healthMetrics.value.errorCount = 0;
  healthMetrics.value.lastError = null;
  toast.success('Fehler zurückgesetzt');
};

const openDebugPanel = () => {
  // Emit event to open debug panel
  window.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'd',
    ctrlKey: true,
    shiftKey: true
  }));
};

const exportDiagnostics = () => {
  unifiedDiagnosticsService.exportDiagnostics();
  toast.success('Diagnose-Daten exportiert');
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Lifecycle
onMounted(() => {
  resetAutoHideTimer();

  // Show monitor when errors occur
  watch(
    () => healthMetrics.value.errorCount,
    (newCount, oldCount) => {
      if (newCount > oldCount) {
        showMonitor.value = true;
        isExpanded.value = true;
        resetAutoHideTimer();
      }
    }
  );
});

onUnmounted(() => {
  if (autoHideTimer.value) {
    clearTimeout(autoHideTimer.value);
  }
});

// Expose methods for external control
defineExpose({
  show: () => { showMonitor.value = true; },
  hide: () => { showMonitor.value = false; },
  expand: () => { isExpanded.value = true; },
  collapse: () => { isExpanded.value = false; }
});
</script>

<style scoped>
.router-health-monitor {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 300px;
  max-width: 400px;
  z-index: 9999;
  transition: all 0.3s ease;
}

/* Position Classes */
.position-top-left {
  top: 20px;
  left: 20px;
}

.position-top-right {
  top: 20px;
  right: 20px;
}

.position-bottom-left {
  bottom: 20px;
  left: 20px;
}

.position-bottom-right {
  bottom: 20px;
  right: 20px;
}

/* State Classes */
.has-errors {
  border: 2px solid #f39c12;
}

.is-critical {
  border: 2px solid #e74c3c;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
  50% { box-shadow: 0 4px 20px rgba(231, 76, 60, 0.3); }
  100% { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
}

/* Header */
.monitor-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #e0e0e0;
  user-select: none;
}

.monitor-icon {
  font-size: 1.2rem;
  margin-right: 8px;
}

.monitor-title {
  flex: 1;
  font-weight: 600;
  color: #333;
}

.monitor-toggle {
  color: #666;
  font-size: 0.8rem;
}

/* Content */
.monitor-content {
  padding: 16px;
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-weight: 600;
  font-size: 1.1rem;
}

/* Sections */
.route-info,
.recent-errors,
.quick-actions,
.recovery-status {
  margin-bottom: 16px;
}

.route-info h4,
.recent-errors h4,
.quick-actions h4,
.recovery-status h4 {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  color: #555;
}

.route-details {
  background: #f8f9fa;
  padding: 8px;
  border-radius: 4px;
  font-size: 0.85rem;
}

.route-details p {
  margin: 4px 0;
}

.route-error {
  color: #e74c3c;
  font-size: 0.85rem;
  font-style: italic;
}

/* Errors */
.error-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.85rem;
}

.error-time {
  color: #666;
  margin-right: 8px;
  font-family: monospace;
}

.error-message {
  color: #e74c3c;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Actions */
.action-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

/* Recovery Status */
.recovery-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 8px;
  background: #fff9e6;
  border-radius: 4px;
  margin-bottom: 6px;
  font-size: 0.85rem;
}

.recovery-issue {
  font-weight: 500;
  color: #856404;
}

.recovery-strategy {
  color: #666;
}

/* Minimal View */
.monitor-minimal {
  display: flex;
  align-items: center;
  padding: 8px 16px;
}

.minimal-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
}

.minimal-text {
  font-size: 0.85rem;
  color: #666;
}

/* Responsive */
@media (max-width: 480px) {
  .router-health-monitor {
    min-width: 280px;
    max-width: calc(100vw - 40px);
  }

  .position-top-left,
  .position-top-right,
  .position-bottom-left,
  .position-bottom-right {
    left: 20px;
    right: 20px;
  }

  .action-buttons {
    grid-template-columns: 1fr;
  }
}
</style>