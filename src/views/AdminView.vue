<template>
  <div class="admin-view">
    <div class="admin-header">
      <h1>{{ sectionTitle }}</h1>
    </div>
    
    <!-- Dashboard Section -->
    <div class="admin-content" v-if="currentSection === 'dashboard'">
      <div class="admin-section">
        <h2>Benutzer</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ totalUsers }}</div>
            <div class="stat-label">Gesamtbenutzer</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ activeUsers }}</div>
            <div class="stat-label">Aktive Benutzer</div>
          </div>
        </div>
      </div>

      <div class="admin-section">
        <h2>System</h2>
        <div class="system-info">
          <div class="info-item">
            <span class="info-label">Status:</span>
            <span class="info-value status-online">Online</span>
          </div>
          <div class="info-item">
            <span class="info-label">Version:</span>
            <span class="info-value">1.0.0</span>
          </div>
          <div class="info-item">
            <span class="info-label">Uptime:</span>
            <span class="info-value">{{ uptime }}</span>
          </div>
        </div>
      </div>

      <div class="admin-section">
        <h2>Aktivitäten</h2>
        <div class="activity-log">
          <div class="log-entry" v-for="entry in activityLog" :key="entry.id">
            <span class="log-time">{{ formatTime(entry.timestamp) }}</span>
            <span class="log-message">{{ entry.message }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Users Section -->
    <div class="admin-content" v-else-if="currentSection === 'users'">
      <div class="admin-section">
        <h2>Benutzerverwaltung</h2>
        <div class="user-list">
          <div class="user-item" v-for="user in users" :key="user.id">
            <div class="user-info">
              <span class="user-name">{{ user.name }}</span>
              <span class="user-email">{{ user.email }}</span>
            </div>
            <span class="user-role">{{ user.role }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Feedback Section -->
    <div class="admin-content" v-else-if="currentSection === 'feedback'">
      <div class="admin-section">
        <h2>Benutzerfeedback</h2>
        <div class="feedback-stats">
          <div class="stat-card">
            <div class="stat-value">{{ feedbackStats.total }}</div>
            <div class="stat-label">Gesamt</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ feedbackStats.positive }}</div>
            <div class="stat-label">Positiv</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ feedbackStats.negative }}</div>
            <div class="stat-label">Negativ</div>
          </div>
        </div>
        <div class="feedback-list">
          <div class="feedback-item" v-for="item in feedbackItems" :key="item.id">
            <div class="feedback-header">
              <span class="feedback-user">{{ item.user }}</span>
              <span class="feedback-date">{{ formatDate(item.date) }}</span>
            </div>
            <div class="feedback-content">{{ item.content }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- MOTD Section -->
    <div class="admin-content" v-else-if="currentSection === 'motd'">
      <div class="admin-section">
        <h2>Message of the Day</h2>
        <div class="motd-config">
          <div class="form-group">
            <label>MOTD aktiviert</label>
            <input type="checkbox" v-model="motdConfig.enabled" />
          </div>
          <div class="form-group">
            <label>Nachricht</label>
            <textarea v-model="motdConfig.message" rows="5"></textarea>
          </div>
          <button class="primary-button" @click="saveMOTD">Speichern</button>
        </div>
      </div>
    </div>
    
    <!-- System Section -->
    <div class="admin-content" v-else-if="currentSection === 'system'">
      <div class="admin-section">
        <h2>Systemeinstellungen</h2>
        <div class="system-stats">
          <div class="stat-card">
            <div class="stat-value">{{ systemStats.cpu }}%</div>
            <div class="stat-label">CPU-Auslastung</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ systemStats.memory }}%</div>
            <div class="stat-label">Speichernutzung</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ systemStats.disk }}%</div>
            <div class="stat-label">Festplattennutzung</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Logs Section -->
    <div class="admin-content" v-else-if="currentSection === 'logs'">
      <div class="admin-section">
        <h2>System Logs</h2>
        <div class="log-viewer">
          <div class="log-filters">
            <select v-model="logLevel">
              <option value="all">Alle</option>
              <option value="error">Fehler</option>
              <option value="warning">Warnungen</option>
              <option value="info">Info</option>
            </select>
          </div>
          <div class="log-entries">
            <div class="log-entry" v-for="entry in filteredLogs" :key="entry.id">
              <span class="log-time">{{ formatTime(entry.timestamp) }}</span>
              <span class="log-level" :class="`level-${entry.level}`">{{ entry.level }}</span>
              <span class="log-message">{{ entry.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Feature Toggles Section -->
    <div class="admin-content" v-else-if="currentSection === 'featureToggles'">
      <div class="admin-section">
        <h2>Feature-Umschaltungen</h2>
        <div class="feature-toggles">
          <div class="feature-item" v-for="feature in featureToggles" :key="feature.id">
            <div class="feature-info">
              <span class="feature-name">{{ feature.name }}</span>
              <span class="feature-description">{{ feature.description }}</span>
            </div>
            <input type="checkbox" v-model="feature.enabled" @change="toggleFeature(feature)" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAdminStore } from '@/stores/admin'
import type { AdminSection } from '@/stores/admin'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const adminStore = useAdminStore()

// Get the current section from the admin store
const currentSection = computed(() => adminStore.currentSection)

// Section titles
const sectionTitle = computed(() => {
  const titles: Record<AdminSection, string> = {
    dashboard: 'Dashboard',
    users: 'Benutzer',
    feedback: 'Feedback',
    motd: 'MOTD',
    system: 'System',
    logs: 'Logs',
    featureToggles: 'Features'
  }
  return titles[currentSection.value as AdminSection] || 'Administration'
})

// Mock data
const totalUsers = ref(42)
const activeUsers = ref(12)
const uptime = ref('5 Tage, 3 Stunden')
const activityLog = ref([
  { id: 1, timestamp: new Date(), message: 'Benutzer Martin hat sich angemeldet' },
  { id: 2, timestamp: new Date(Date.now() - 3600000), message: 'Systembackup abgeschlossen' },
  { id: 3, timestamp: new Date(Date.now() - 7200000), message: 'Neue Dokumente indexiert' }
])

const users = ref([
  { id: 1, name: 'Martin', email: 'martin@danglefeet.com', role: 'admin' },
  { id: 2, name: 'Test User', email: 'test@example.com', role: 'user' }
])

const feedbackStats = ref({ total: 120, positive: 85, negative: 35 })
const feedbackItems = ref([
  { id: 1, user: 'User 1', date: new Date(), content: 'Great system!' },
  { id: 2, user: 'User 2', date: new Date(), content: 'Could be improved' }
])

const motdConfig = ref({ enabled: false, message: '' })
const systemStats = ref({ cpu: 23, memory: 45, disk: 67 })

const logLevel = ref('all')
const logs = ref([
  { id: 1, timestamp: new Date(), level: 'info', message: 'System started' },
  { id: 2, timestamp: new Date(), level: 'warning', message: 'High memory usage detected' },
  { id: 3, timestamp: new Date(), level: 'error', message: 'Failed to connect to database' }
])

const filteredLogs = computed(() => {
  if (logLevel.value === 'all') return logs.value
  return logs.value.filter(log => log.level === logLevel.value)
})

const featureToggles = ref([
  { id: 1, name: 'New Chat UI', description: 'Enable new chat interface', enabled: true },
  { id: 2, name: 'Beta Features', description: 'Show beta features', enabled: false }
])

// Methods
const formatTime = (date: Date) => {
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('de-DE')
}

const saveMOTD = () => {
  console.log('Saving MOTD:', motdConfig.value)
  // TODO: Implement actual save
}

const toggleFeature = (feature: any) => {
  console.log('Toggling feature:', feature)
  // TODO: Implement actual toggle
}

// Check admin access
onMounted(() => {
  // DEBUG: Log current user object and admin status
  console.log('=== AdminView Debug ===')
  console.log('isAuthenticated:', authStore.isAuthenticated)
  console.log('Current user object:', authStore.user)
  console.log('User role:', authStore.user?.role)
  console.log('User roles array:', authStore.user?.roles)
  console.log('Is admin computed:', authStore.isAdmin)
  console.log('UserRole getter:', authStore.userRole)
  console.log('===================')
  
  if (!authStore.isAuthenticated) {
    console.warn('Not authenticated - redirecting to login')
    router.push('/login')
    return
  }
  
  // Temporär für debug: Admin check auskommentiert
  /* 
  if (!authStore.isAdmin) {
    console.warn('Admin access denied - redirecting to home', {
      user: authStore.user,
      isAdmin: authStore.isAdmin
    })
    router.push('/')
    return
  }
  */
  
  // Load data for current section
  adminStore.setCurrentSection(currentSection.value as AdminSection)
})
</script>

<style scoped>
.admin-view {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  overflow-y: auto;
}

.admin-header {
  margin-bottom: 32px;
}

.admin-header h1 {
  font-size: 32px;
  font-weight: 600;
  margin: 0;
  color: var(--nscale-text);
}

.admin-content {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.admin-section {
  margin-bottom: 32px;
  padding: 24px;
  background: var(--nscale-surface, white);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.admin-section h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 24px 0;
  color: var(--nscale-text);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  padding: 20px;
  background: var(--nscale-background);
  border-radius: 8px;
  text-align: center;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--nscale-primary);
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: var(--nscale-text-secondary);
}

.system-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--nscale-border);
}

.info-label {
  font-weight: 500;
  color: var(--nscale-text-secondary);
}

.info-value {
  font-weight: 500;
}

.status-online {
  color: var(--nscale-success);
}

.activity-log {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-entry {
  display: flex;
  gap: 16px;
  padding: 8px 0;
  align-items: center;
}

.log-time {
  color: var(--nscale-text-secondary);
  font-size: 14px;
  width: 80px;
}

.log-message {
  flex: 1;
}

.log-level {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.level-info {
  background: var(--nscale-info-light);
  color: var(--nscale-info);
}

.level-warning {
  background: var(--nscale-warning-light);
  color: var(--nscale-warning);
}

.level-error {
  background: var(--nscale-danger-light);
  color: var(--nscale-danger);
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--nscale-background);
  border-radius: 8px;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name {
  font-weight: 500;
}

.user-email {
  font-size: 14px;
  color: var(--nscale-text-secondary);
}

.user-role {
  padding: 4px 12px;
  background: var(--nscale-primary-light);
  color: var(--nscale-primary);
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
}

.feedback-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feedback-item {
  padding: 16px;
  background: var(--nscale-background);
  border-radius: 8px;
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.feedback-user {
  font-weight: 500;
}

.feedback-date {
  font-size: 14px;
  color: var(--nscale-text-secondary);
}

.feedback-content {
  color: var(--nscale-text);
}

.motd-config {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 600px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: var(--nscale-text);
}

.form-group input[type="checkbox"] {
  width: 20px;
  height: 20px;
}

.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--nscale-border);
  border-radius: 8px;
  font-family: inherit;
  resize: vertical;
}

.primary-button {
  background: var(--nscale-primary);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.primary-button:hover {
  background: var(--nscale-primary-dark);
}

.system-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.log-viewer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.log-filters {
  display: flex;
  gap: 12px;
}

.log-filters select {
  padding: 8px 12px;
  border: 1px solid var(--nscale-border);
  border-radius: 8px;
  background: var(--nscale-surface);
}

.log-entries {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
  padding: 12px;
  background: var(--nscale-background);
  border-radius: 8px;
}

.feature-toggles {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--nscale-background);
  border-radius: 8px;
}

.feature-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.feature-name {
  font-weight: 500;
}

.feature-description {
  font-size: 14px;
  color: var(--nscale-text-secondary);
}

.feature-item input[type="checkbox"] {
  width: 48px;
  height: 24px;
  cursor: pointer;
}
</style>