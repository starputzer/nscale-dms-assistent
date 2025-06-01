<template>
  <div class="admin-dashboard">
    <div v-if="loading" class="loading-spinner">
      Loading dashboard data...
    </div>

    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-else class="dashboard-content">
      <!-- User Statistics Card -->
      <div class="stat-card">
        <h3>User Statistics</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">{{ userStats.total }}</span>
            <span class="stat-label">Total Users</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ userStats.active }}</span>
            <span class="stat-label">Active Users</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ userStats.admin }}</span>
            <span class="stat-label">Admins</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ userStats.locked }}</span>
            <span class="stat-label">Locked</span>
          </div>
        </div>
      </div>

      <!-- Feedback Statistics Card -->
      <div class="stat-card">
        <h3>Feedback Statistics</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">{{ feedbackStats.total }}</span>
            <span class="stat-label">Total Feedback</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ feedbackStats.positive }}</span>
            <span class="stat-label">Positive</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ feedbackStats.negative }}</span>
            <span class="stat-label">Negative</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ feedbackStats.average_rating.toFixed(1) }}</span>
            <span class="stat-label">Avg Rating</span>
          </div>
        </div>
      </div>

      <!-- System Information Card -->
      <div class="stat-card">
        <h3>System Information</h3>
        <div class="info-list">
          <div class="info-item">
            <span class="info-label">Platform:</span>
            <span class="info-value">{{ systemInfo.platform }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Python Version:</span>
            <span class="info-value">{{ systemInfo.python_version }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">CPU Cores:</span>
            <span class="info-value">{{ systemInfo.cpu_count }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Memory Usage:</span>
            <span class="info-value">{{ memoryUsagePercent }}%</span>
          </div>
          <div class="info-item">
            <span class="info-label">Disk Usage:</span>
            <span class="info-value">{{ systemInfo.disk_usage }}%</span>
          </div>
        </div>
      </div>

      <!-- Recent Users Table -->
      <div class="data-table-card">
        <h3>Recent Users</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.email }}</td>
              <td>
                <span class="role-badge" :class="`role-${user.role}`">
                  {{ user.role }}
                </span>
              </td>
              <td>{{ formatDate(user.created_at) }}</td>
              <td>
                <span class="status-badge" :class="user.is_active ? 'active' : 'inactive'">
                  {{ user.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Feature Toggles -->
      <div class="feature-toggles-card">
        <h3>Feature Toggles</h3>
        <div class="toggle-list">
          <div v-for="toggle in featureToggles" :key="toggle.id" class="toggle-item">
            <div class="toggle-info">
              <h4>{{ toggle.name }}</h4>
              <p>{{ toggle.description }}</p>
            </div>
            <div class="toggle-switch">
              <input
                type="checkbox"
                :id="`toggle-${toggle.id}`"
                v-model="toggle.enabled"
                @change="updateToggle(toggle)"
              />
              <label :for="`toggle-${toggle.id}`"></label>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Negative Feedback -->
      <div class="feedback-card">
        <h3>Recent Negative Feedback</h3>
        <div class="feedback-list">
          <div v-for="feedback in recentFeedback" :key="feedback.id" class="feedback-item">
            <div class="feedback-header">
              <span class="feedback-rating">★ {{ feedback.rating }}</span>
              <span class="feedback-date">{{ formatDate(feedback.created_at) }}</span>
            </div>
            <p class="feedback-text">{{ feedback.message }}</p>
            <button @click="markFeedbackResolved(feedback.id)" class="resolve-btn">
              Mark as Resolved
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance Comparison -->
    <div class="performance-comparison" v-if="showPerformance">
      <h3>Performance Comparison</h3>
      <p>Load time with batch API: <strong>{{ batchLoadTime }}ms</strong></p>
      <p>Estimated sequential load time: <strong>{{ estimatedSequentialTime }}ms</strong></p>
      <p>Performance improvement: <strong>{{ performanceImprovement }}%</strong></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { batchAdminService, type AdminDashboardData } from '@/services/api/BatchAdminService';
import { useToast } from '@/composables/useToast';

// State
const loading = ref(true);
const error = ref<string | null>(null);
const dashboardData = ref<AdminDashboardData | null>(null);
const showPerformance = ref(true);
const batchLoadTime = ref(0);

// Toast notifications
const { showToast } = useToast();

// Computed properties
const users = computed(() => dashboardData.value?.users || []);
const userStats = computed(() => dashboardData.value?.userStats || {
  total: 0,
  active: 0,
  admin: 0,
  locked: 0
});
const feedbackStats = computed(() => dashboardData.value?.feedbackStats || {
  total: 0,
  positive: 0,
  negative: 0,
  average_rating: 0
});
const systemInfo = computed(() => dashboardData.value?.systemInfo || {});
const featureToggles = computed(() => dashboardData.value?.featureToggles || []);
const recentFeedback = computed(() => dashboardData.value?.recentFeedback || []);

const memoryUsagePercent = computed(() => {
  if (!systemInfo.value.memory_total || !systemInfo.value.memory_available) return 0;
  const used = systemInfo.value.memory_total - systemInfo.value.memory_available;
  return Math.round((used / systemInfo.value.memory_total) * 100);
});

const estimatedSequentialTime = computed(() => {
  // Estimate: 6 API calls * 100ms average per call
  return 600;
});

const performanceImprovement = computed(() => {
  if (!batchLoadTime.value) return 0;
  const improvement = ((estimatedSequentialTime.value - batchLoadTime.value) / estimatedSequentialTime.value) * 100;
  return Math.round(improvement);
});

// Methods
async function loadDashboardData() {
  loading.value = true;
  error.value = null;
  
  const startTime = performance.now();
  
  try {
    // Load all dashboard data in a single batch request
    dashboardData.value = await batchAdminService.loadAdminDashboard();
    
    // Calculate load time
    batchLoadTime.value = Math.round(performance.now() - startTime);
    
    // Prefetch additional data for smooth navigation
    batchAdminService.prefetchAdminData();
    
  } catch (err: any) {
    error.value = err.message || 'Failed to load dashboard data';
    showToast({
      message: 'Failed to load dashboard data',
      type: 'error'
    });
  } finally {
    loading.value = false;
  }
}

async function updateToggle(toggle: any) {
  try {
    const results = await batchAdminService.updateFeatureToggles([{
      id: toggle.id,
      enabled: toggle.enabled
    }]);
    
    showToast({
      message: `Feature "${toggle.name}" ${toggle.enabled ? 'enabled' : 'disabled'}`,
      type: 'success'
    });
    
    // Update stats from batch response
    if (results.stats) {
      // Update local stats if needed
    }
  } catch (err: any) {
    // Revert toggle on error
    toggle.enabled = !toggle.enabled;
    showToast({
      message: `Failed to update feature toggle: ${err.message}`,
      type: 'error'
    });
  }
}

async function markFeedbackResolved(feedbackId: string) {
  try {
    const results = await batchAdminService.processFeedbackBatch({
      updateStatus: [{
        feedbackId,
        status: 'resolved'
      }]
    });
    
    showToast({
      message: 'Feedback marked as resolved',
      type: 'success'
    });
    
    // Remove from local list
    const index = recentFeedback.value.findIndex(f => f.id === feedbackId);
    if (index > -1) {
      recentFeedback.value.splice(index, 1);
    }
    
    // Update stats from batch response
    if (results.stats && dashboardData.value) {
      dashboardData.value.feedbackStats = results.stats;
    }
  } catch (err: any) {
    showToast({
      message: `Failed to update feedback: ${err.message}`,
      type: 'error'
    });
  }
}

function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Lifecycle
onMounted(() => {
  loadDashboardData();
  
  // Set up real-time updates
  const updateInterval = setInterval(async () => {
    if (!loading.value) {
      try {
        const realtimeData = await batchAdminService.getRealtimeStats();
        // Update relevant parts of dashboard
        if (realtimeData.activeUsers && dashboardData.value) {
          dashboardData.value.userStats.active = realtimeData.activeUsers.length;
        }
      } catch (err) {
        // Silently handle real-time update errors
        console.error('Real-time update failed:', err);
      }
    }
  }, 30000); // Update every 30 seconds
  
  // Cleanup
  onUnmounted(() => {
    clearInterval(updateInterval);
  });
});
</script>

<style scoped>
.admin-dashboard {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.loading-spinner {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
}

.error-message {
  background-color: #fee;
  color: #c00;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.dashboard-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.stat-card,
.data-table-card,
.feature-toggles-card,
.feedback-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-card h3,
.data-table-card h3,
.feature-toggles-card h3,
.feedback-card h3 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 18px;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 32px;
  font-weight: bold;
  color: #2c3e50;
}

.stat-label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.info-label {
  font-weight: 500;
  color: #666;
}

.info-value {
  color: #333;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  text-align: left;
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.data-table th {
  font-weight: 600;
  color: #666;
  background-color: #f8f9fa;
}

.role-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.role-badge.role-admin {
  background-color: #e3f2fd;
  color: #1976d2;
}

.role-badge.role-user {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background-color: #e8f5e9;
  color: #388e3c;
}

.status-badge.inactive {
  background-color: #ffebee;
  color: #c62828;
}

.toggle-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toggle-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.toggle-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
}

.toggle-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.toggle-switch {
  position: relative;
}

.toggle-switch input[type="checkbox"] {
  display: none;
}

.toggle-switch label {
  display: block;
  width: 48px;
  height: 24px;
  background-color: #ccc;
  border-radius: 24px;
  cursor: pointer;
  transition: background-color 0.3s;
  position: relative;
}

.toggle-switch label::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.3s;
}

.toggle-switch input[type="checkbox"]:checked + label {
  background-color: #4caf50;
}

.toggle-switch input[type="checkbox"]:checked + label::after {
  transform: translateX(24px);
}

.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feedback-item {
  padding: 16px;
  background-color: #fff3e0;
  border-radius: 8px;
  border-left: 4px solid #ff9800;
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.feedback-rating {
  color: #ff9800;
  font-weight: bold;
}

.feedback-date {
  color: #666;
  font-size: 14px;
}

.feedback-text {
  margin: 8px 0;
  color: #333;
}

.resolve-btn {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.resolve-btn:hover {
  background-color: #45a049;
}

.performance-comparison {
  margin-top: 20px;
  padding: 20px;
  background-color: #e8f5e9;
  border-radius: 8px;
  border-left: 4px solid #4caf50;
}

.performance-comparison h3 {
  margin-top: 0;
  color: #2e7d32;
}

.performance-comparison p {
  margin: 8px 0;
  color: #333;
}

.performance-comparison strong {
  color: #2e7d32;
  font-weight: bold;
}

/* Grid adjustments for larger screens */
@media (min-width: 1200px) {
  .dashboard-content {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .data-table-card,
  .feature-toggles-card,
  .feedback-card {
    grid-column: span 2;
  }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .dashboard-content {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .data-table {
    font-size: 14px;
  }
  
  .data-table th,
  .data-table td {
    padding: 8px;
  }
}
</style>