<template>
  <div class="admin-background-processing">
    <!-- Header with controls -->
    <div class="processing-header">
      <h3>{{ $t('admin.backgroundProcessing.title') }}</h3>
      
      <div class="control-buttons">
        <button 
          v-if="!queueStatus.paused" 
          @click="pauseProcessing"
          class="btn-secondary"
          :disabled="loading"
        >
          <i class="icon-pause"></i>
          {{ $t('admin.backgroundProcessing.pause') }}
        </button>
        <button 
          v-else 
          @click="resumeProcessing"
          class="btn-primary"
          :disabled="loading"
        >
          <i class="icon-play"></i>
          {{ $t('admin.backgroundProcessing.resume') }}
        </button>
        
        <button 
          @click="refreshStatus" 
          class="btn-icon"
          :disabled="loading"
        >
          <i class="icon-refresh" :class="{ 'spinning': loading }"></i>
        </button>
      </div>
    </div>

    <!-- Queue Status Cards -->
    <div class="status-cards">
      <div class="status-card">
        <div class="card-icon queued">
          <i class="icon-clock"></i>
        </div>
        <div class="card-content">
          <div class="card-value">{{ queueStatus.queued }}</div>
          <div class="card-label">{{ $t('admin.backgroundProcessing.queued') }}</div>
        </div>
      </div>
      
      <div class="status-card">
        <div class="card-icon active">
          <i class="icon-activity"></i>
        </div>
        <div class="card-content">
          <div class="card-value">{{ queueStatus.processing }}</div>
          <div class="card-label">{{ $t('admin.backgroundProcessing.active') }}</div>
        </div>
      </div>
      
      <div class="status-card">
        <div class="card-icon completed">
          <i class="icon-check-circle"></i>
        </div>
        <div class="card-content">
          <div class="card-value">{{ queueStatus.completed }}</div>
          <div class="card-label">{{ $t('admin.backgroundProcessing.completed') }}</div>
        </div>
      </div>
      
      <div class="status-card">
        <div class="card-icon workers">
          <i class="icon-cpu"></i>
        </div>
        <div class="card-content">
          <div class="card-value">{{ queueStatus.active_workers }}</div>
          <div class="card-label">{{ $t('admin.backgroundProcessing.workers') }}</div>
        </div>
      </div>
    </div>

    <!-- Upload Section -->
    <div class="upload-section">
      <h4>{{ $t('admin.backgroundProcessing.submitDocuments') }}</h4>
      
      <div class="upload-area" 
           @drop="handleDrop"
           @dragover.prevent
           @dragenter.prevent
           :class="{ 'drag-over': isDragging }"
      >
        <input 
          type="file" 
          ref="fileInput"
          @change="handleFileSelect"
          multiple
          accept=".pdf,.docx,.txt,.md,.html"
          style="display: none"
        >
        
        <div class="upload-prompt" @click="$refs.fileInput.click()">
          <i class="icon-upload-cloud"></i>
          <p>{{ $t('admin.backgroundProcessing.dropFiles') }}</p>
          <p class="upload-hint">{{ $t('admin.backgroundProcessing.supportedFormats') }}</p>
        </div>
      </div>
      
      <div v-if="selectedFiles.length > 0" class="selected-files">
        <h5>{{ $t('admin.backgroundProcessing.selectedFiles') }} ({{ selectedFiles.length }})</h5>
        <ul>
          <li v-for="(file, index) in selectedFiles" :key="index">
            {{ file.name }}
            <button @click="removeFile(index)" class="btn-remove">
              <i class="icon-x"></i>
            </button>
          </li>
        </ul>
        
        <div class="submit-controls">
          <select v-model="submitPriority" class="priority-select">
            <option value="critical">{{ $t('admin.backgroundProcessing.priority.critical') }}</option>
            <option value="high">{{ $t('admin.backgroundProcessing.priority.high') }}</option>
            <option value="normal" selected>{{ $t('admin.backgroundProcessing.priority.normal') }}</option>
            <option value="low">{{ $t('admin.backgroundProcessing.priority.low') }}</option>
            <option value="background">{{ $t('admin.backgroundProcessing.priority.background') }}</option>
          </select>
          
          <button 
            @click="submitFiles" 
            class="btn-primary"
            :disabled="submitting"
          >
            <i class="icon-send"></i>
            {{ $t('admin.backgroundProcessing.submit') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Active Jobs -->
    <div class="active-jobs" v-if="activeJobs.length > 0">
      <h4>{{ $t('admin.backgroundProcessing.activeJobs') }}</h4>
      
      <div class="job-list">
        <div v-for="job in activeJobs" :key="job.id" class="job-item">
          <div class="job-header">
            <span class="job-file">{{ job.data.filename || job.type }}</span>
            <span class="job-status" :class="job.status">{{ job.status }}</span>
          </div>
          
          <div class="job-progress">
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :style="{ width: `${job.progress}%` }"
              ></div>
            </div>
            <span class="progress-text">{{ Math.round(job.progress) }}%</span>
          </div>
          
          <div class="job-details">
            <span class="current-step">{{ job.type }}</span>
            <button 
              @click="cancelJob(job.id)" 
              class="btn-cancel"
              :disabled="job.status !== 'processing'"
            >
              {{ $t('admin.backgroundProcessing.cancel') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Queue Health -->
    <div class="queue-health">
      <h4>{{ $t('admin.backgroundProcessing.queueHealth') }}</h4>
      
      <div class="health-status" :class="health.status">
        <i :class="getHealthIcon(health.status)"></i>
        <span>{{ $t(`admin.backgroundProcessing.health.${health.status}`) }}</span>
      </div>
      
      <div v-if="health.alerts.length > 0" class="health-alerts">
        <div v-for="(alert, index) in health.alerts" :key="index" 
             class="alert" :class="alert.level">
          <i :class="getAlertIcon(alert.level)"></i>
          {{ alert.message }}
        </div>
      </div>
      
      <div class="health-metrics">
        <div class="metric">
          <span class="metric-label">{{ $t('admin.backgroundProcessing.oldestJob') }}:</span>
          <span class="metric-value">
            {{ health.oldest_job_age ? formatAge(health.oldest_job_age) : '-' }}
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">{{ $t('admin.backgroundProcessing.failedJobs') }}:</span>
          <span class="metric-value">{{ health.failed_jobs }}</span>
        </div>
      </div>
    </div>

    <!-- Statistics -->
    <div class="statistics">
      <h4>{{ $t('admin.backgroundProcessing.statistics') }}</h4>
      
      <div class="stats-summary">
        <div class="stat-item">
          <div class="stat-value">{{ stats.jobs_per_hour || 0 }}</div>
          <div class="stat-label">{{ $t('admin.backgroundProcessing.jobsPerHour') }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ formatPercentage(stats.success_rate || 0) }}</div>
          <div class="stat-label">{{ $t('admin.backgroundProcessing.successRate') }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ formatTime(stats.avg_processing_time || 0) }}</div>
          <div class="stat-label">{{ $t('admin.backgroundProcessing.avgTime') }}</div>
        </div>
      </div>
      
      <!-- Daily breakdown chart would go here -->
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const { showToast } = useToast()

// State
const loading = ref(false)
const submitting = ref(false)
const isDragging = ref(false)
const selectedFiles = ref([])
const submitPriority = ref('normal')
const refreshInterval = ref(null)

const queueStatus = ref({
  queued: 0,
  active: 0,
  completed: 0,
  paused: false,
  workers: 4,
  stats: {}
})

const activeJobs = ref([])
const health = ref({
  status: 'healthy',
  total_jobs: 0,
  queued_jobs: 0,
  processing_jobs: 0,
  failed_jobs: 0,
  oldest_job_age: null,
  alerts: []
})

const stats = ref({
  summary: {
    total_jobs: 0,
    success_rate: 0,
    average_processing_time: 0
  },
  daily_breakdown: []
})

// Methods
const refreshStatus = async () => {
  try {
    loading.value = true
    
    // Fetch queue status
    const statusResponse = await fetch('/api/background-processing/queue/status', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    })
    if (statusResponse.ok) {
      queueStatus.value = await statusResponse.json()
    }
    
    // Fetch active jobs
    const activeResponse = await fetch('/api/background-processing/jobs?status=processing&limit=10', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    })
    if (activeResponse.ok) {
      activeJobs.value = await activeResponse.json()
    }
    
    // Fetch statistics
    const statsResponse = await fetch('/api/background-processing/stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    })
    if (statsResponse.ok) {
      stats.value = await statsResponse.json()
    }
    
  } catch (error) {
    console.error('Error refreshing status:', error)
    showToast(t('admin.backgroundProcessing.errors.refreshFailed'), 'error')
  } finally {
    loading.value = false
  }
}

const pauseProcessing = async () => {
  try {
    const response = await fetch('/api/background-processing/queue/pause', { 
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    })
    if (response.ok) {
      queueStatus.value.paused = true
      showToast(t('admin.backgroundProcessing.messages.paused'), 'success')
      await refreshStatus()
    }
  } catch (error) {
    showToast(t('admin.backgroundProcessing.errors.pauseFailed'), 'error')
  }
}

const resumeProcessing = async () => {
  try {
    const response = await fetch('/api/background-processing/queue/resume', { 
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    })
    if (response.ok) {
      queueStatus.value.paused = false
      showToast(t('admin.backgroundProcessing.messages.resumed'), 'success')
      await refreshStatus()
    }
  } catch (error) {
    showToast(t('admin.backgroundProcessing.errors.resumeFailed'), 'error')
  }
}

const handleDrop = (e) => {
  e.preventDefault()
  isDragging.value = false
  
  const files = Array.from(e.dataTransfer.files)
  addFiles(files)
}

const handleFileSelect = (e) => {
  const files = Array.from(e.target.files)
  addFiles(files)
}

const addFiles = (files) => {
  const validFiles = files.filter(file => {
    const ext = file.name.split('.').pop().toLowerCase()
    return ['pdf', 'docx', 'txt', 'md', 'html'].includes(ext)
  })
  
  selectedFiles.value.push(...validFiles)
  
  if (validFiles.length < files.length) {
    showToast(t('admin.backgroundProcessing.errors.unsupportedFiles'), 'warning')
  }
}

const removeFile = (index) => {
  selectedFiles.value.splice(index, 1)
}

const submitFiles = async () => {
  if (selectedFiles.value.length === 0) return
  
  try {
    submitting.value = true
    
    // Create batch submission
    const jobs = selectedFiles.value.map(file => ({
      job_type: 'document_conversion',
      priority: submitPriority.value === 'high' ? 8 : submitPriority.value === 'low' ? 3 : 5,
      data: {
        filename: file.name,
        file_size: file.size,
        file_type: file.name.split('.').pop().toLowerCase()
      }
    }))
    
    const response = await fetch('/api/background-processing/submit-batch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jobs: jobs,
        priority: submitPriority.value === 'high' ? 8 : submitPriority.value === 'low' ? 3 : 5
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      showToast(
        t('admin.backgroundProcessing.messages.submitted', { count: result.total }), 
        'success'
      )
      selectedFiles.value = []
      refreshStatus()
    } else {
      throw new Error('Submit failed')
    }
    
  } catch (error) {
    showToast(t('admin.backgroundProcessing.errors.submitFailed'), 'error')
  } finally {
    submitting.value = false
  }
}

const cancelJob = async (jobId) => {
  try {
    const response = await fetch(`/api/background-processing/cancel/${jobId}`, { 
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      showToast(t('admin.backgroundProcessing.messages.cancelled'), 'success')
      refreshStatus()
    }
  } catch (error) {
    showToast(t('admin.backgroundProcessing.errors.cancelFailed'), 'error')
  }
}

// Utility functions
const getFileName = (path) => {
  return path.split('/').pop()
}

const getHealthIcon = (status) => {
  const icons = {
    healthy: 'icon-check-circle',
    warning: 'icon-alert-triangle',
    critical: 'icon-alert-circle'
  }
  return icons[status] || 'icon-help-circle'
}

const getAlertIcon = (level) => {
  const icons = {
    info: 'icon-info',
    warning: 'icon-alert-triangle',
    error: 'icon-alert-circle'
  }
  return icons[level] || 'icon-info'
}

const formatAge = (hours) => {
  if (hours < 1) {
    return t('admin.backgroundProcessing.lessThanHour')
  } else if (hours < 24) {
    return t('admin.backgroundProcessing.hoursAgo', { hours: Math.round(hours) })
  } else {
    return t('admin.backgroundProcessing.daysAgo', { days: Math.round(hours / 24) })
  }
}

const formatPercentage = (value) => {
  return `${Math.round(value)}%`
}

const formatTime = (seconds) => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  } else {
    return `${Math.round(seconds / 60)}m`
  }
}

// Lifecycle
onMounted(() => {
  refreshStatus()
  // Auto-refresh every 5 seconds
  refreshInterval.value = setInterval(refreshStatus, 5000)
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<style scoped>
.admin-background-processing {
  padding: 1.5rem;
}

.processing-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.processing-header h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.control-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-secondary,
.btn-primary,
.btn-icon {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-icon {
  padding: 0.5rem;
  background: transparent;
  border: 1px solid #e5e7eb;
}

.status-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.status-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.card-icon.queued {
  background: #fef3c7;
  color: #d97706;
}

.card-icon.active {
  background: #dbeafe;
  color: #3b82f6;
}

.card-icon.completed {
  background: #d1fae5;
  color: #10b981;
}

.card-icon.workers {
  background: #e9d5ff;
  color: #9333ea;
}

.card-value {
  font-size: 2rem;
  font-weight: 700;
}

.card-label {
  color: #6b7280;
  font-size: 0.875rem;
}

.upload-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.upload-area {
  border: 2px dashed #e5e7eb;
  border-radius: 8px;
  padding: 3rem;
  text-align: center;
  transition: all 0.2s;
  cursor: pointer;
}

.upload-area.drag-over {
  border-color: #3b82f6;
  background: #eff6ff;
}

.upload-prompt {
  color: #6b7280;
}

.upload-prompt i {
  font-size: 3rem;
  color: #9ca3af;
  display: block;
  margin-bottom: 1rem;
}

.upload-hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.selected-files {
  margin-top: 1rem;
}

.selected-files ul {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0;
}

.selected-files li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 4px;
  margin-bottom: 0.25rem;
}

.btn-remove {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.25rem;
}

.submit-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-top: 1rem;
}

.priority-select {
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: white;
}

.active-jobs {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.job-list {
  margin-top: 1rem;
}

.job-item {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 0.75rem;
}

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.job-file {
  font-weight: 500;
}

.job-status {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.job-status.processing {
  background: #dbeafe;
  color: #3b82f6;
}

.job-status.completed {
  background: #d1fae5;
  color: #10b981;
}

.job-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
}

.job-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.current-step {
  font-size: 0.875rem;
  color: #6b7280;
}

.btn-cancel {
  padding: 0.25rem 0.75rem;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.queue-health,
.statistics {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.health-status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  margin-bottom: 1rem;
}

.health-status.healthy {
  background: #d1fae5;
  color: #10b981;
}

.health-status.warning {
  background: #fef3c7;
  color: #d97706;
}

.health-status.critical {
  background: #fee2e2;
  color: #dc2626;
}

.health-alerts {
  margin-bottom: 1rem;
}

.alert {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.alert.warning {
  background: #fef3c7;
  color: #92400e;
}

.alert.error {
  background: #fee2e2;
  color: #991b1b;
}

.health-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  color: #6b7280;
}

.metric-value {
  font-weight: 600;
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
  text-align: center;
}

.stat-item {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>