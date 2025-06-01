<template>
  <div class="admin-panel" :class="[`theme-${theme}`]">
    <!-- Header -->
    <header class="admin-header">
      <div class="admin-header__content">
        <div class="admin-header__brand">
          <i class="fas fa-cog admin-header__icon"></i>
          <h1 class="admin-header__title">
            Digitale Akte Assistent - Verwaltung
          </h1>
        </div>
        <div class="admin-header__user">
          <div class="admin-header__user-info">
            <span class="admin-header__user-name">{{ currentUserName }}</span>
            <span class="admin-header__user-role">Administrator</span>
          </div>
          <button @click="toggleTheme" class="admin-header__theme-toggle">
            <i :class="theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'"></i>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Layout -->
    <div class="admin-layout">
      <!-- Sidebar -->
      <aside class="admin-sidebar">
        <nav class="admin-nav">
          <a
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'admin-nav__item',
              { 'admin-nav__item--active': activeTab === tab.id },
            ]"
          >
            <i :class="['admin-nav__icon', tab.icon]"></i>
            <span class="admin-nav__label">{{ tab.label }}</span>
          </a>
        </nav>
      </aside>

      <!-- Content -->
      <main class="admin-content">
        <!-- Dashboard -->
        <div v-if="activeTab === 'dashboard'" class="admin-dashboard">
          <h2 class="admin-content__title">Dashboard Übersicht</h2>

          <div class="dashboard-stats">
            <div class="stat-card">
              <i class="fas fa-users stat-card__icon"></i>
              <div class="stat-card__content">
                <div class="stat-card__value">
                  {{ dashboardStats.totalUsers }}
                </div>
                <div class="stat-card__label">Gesamtbenutzer</div>
              </div>
            </div>
            <div class="stat-card">
              <i
                class="fas fa-user-check stat-card__icon stat-card__icon--success"
              ></i>
              <div class="stat-card__content">
                <div class="stat-card__value">
                  {{ dashboardStats.activeUsers }}
                </div>
                <div class="stat-card__label">Aktive Benutzer</div>
              </div>
            </div>
            <div class="stat-card">
              <i
                class="fas fa-comments stat-card__icon stat-card__icon--info"
              ></i>
              <div class="stat-card__content">
                <div class="stat-card__value">
                  {{ dashboardStats.feedbackCount }}
                </div>
                <div class="stat-card__label">Feedback-Einträge</div>
              </div>
            </div>
            <div class="stat-card">
              <i
                class="fas fa-clock stat-card__icon stat-card__icon--warning"
              ></i>
              <div class="stat-card__content">
                <div class="stat-card__value">
                  {{ dashboardStats.avgResponseTime }}ms
                </div>
                <div class="stat-card__label">Ø Antwortzeit</div>
              </div>
            </div>
          </div>

          <div class="dashboard-charts">
            <div class="chart-card">
              <h3 class="chart-card__title">Benutzeraktivität (7 Tage)</h3>
              <canvas ref="activityChart"></canvas>
            </div>
            <div class="chart-card">
              <h3 class="chart-card__title">Feedback-Übersicht</h3>
              <canvas ref="feedbackChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Users Management -->
        <AdminUsersImproved
          v-if="activeTab === 'users'"
          :currentUser="currentUser"
          @error="handleError"
        />

        <!-- Feedback Management -->
        <AdminFeedbackImproved
          v-if="activeTab === 'feedback'"
          @error="handleError"
        />

        <!-- MOTD Editor -->
        <AdminMotdImproved v-if="activeTab === 'motd'" @error="handleError" />

        <!-- System Settings -->
        <div v-if="activeTab === 'system'" class="admin-system">
          <h2 class="admin-content__title">Systemeinstellungen</h2>
          <p>Systemeinstellungen werden hier angezeigt...</p>
        </div>
      </main>
    </div>

    <!-- Notifications -->
    <div class="admin-notifications">
      <TransitionGroup name="notification">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="['notification', `notification--${notification.type}`]"
        >
          <i :class="['notification__icon', notification.icon]"></i>
          <div class="notification__content">
            <div class="notification__title">{{ notification.title }}</div>
            <div class="notification__message">{{ notification.message }}</div>
          </div>
          <button
            @click="removeNotification(notification.id)"
            class="notification__close"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { Chart } from "chart.js/auto";
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { useAdminUsersStore } from "@/stores/admin/users";
import { useAdminFeedbackStore } from "@/stores/admin/feedback";
import AdminUsersImproved from "./improved/AdminUsersImproved.vue";
import AdminFeedbackImproved from "./improved/AdminFeedbackImproved.vue";
import AdminMotdImproved from "./improved/AdminMotdImproved.vue";

// Stores
const authStore = useAuthStore();
const uiStore = useUIStore();
const usersStore = useAdminUsersStore();
const feedbackStore = useAdminFeedbackStore();

// Store refs
const { currentUser } = storeToRefs(authStore);
const { theme } = storeToRefs(uiStore);

// State
const activeTab = ref("dashboard");
const notifications = ref<
  Array<{
    id: string;
    type: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
    icon: string;
  }>
>([]);

// Charts
const activityChart = ref<HTMLCanvasElement>();
const feedbackChart = ref<HTMLCanvasElement>();
let activityChartInstance: Chart | null = null;
let feedbackChartInstance: Chart | null = null;

// Dashboard stats
const dashboardStats = ref({
  totalUsers: 0,
  activeUsers: 0,
  feedbackCount: 0,
  avgResponseTime: 0,
});

// Tabs configuration
const tabs = [
  { id: "dashboard", label: "Dashboard", icon: "fas fa-home" },
  { id: "users", label: "Benutzer", icon: "fas fa-users" },
  { id: "feedback", label: "Feedback", icon: "fas fa-comments" },
  { id: "motd", label: "Nachrichten", icon: "fas fa-bullhorn" },
  { id: "system", label: "System", icon: "fas fa-cogs" },
];

// Computed
const currentUserName = computed(() => {
  return currentUser.value?.name || currentUser.value?.email || "Administrator";
});

// Methods
const toggleTheme = () => {
  uiStore.toggleTheme();
};

const handleError = (error: any) => {
  console.error("Admin panel error:", error);
  addNotification(
    "error",
    "Fehler aufgetreten",
    error.message || "Ein unerwarteter Fehler ist aufgetreten",
  );
};

const addNotification = (
  type: "success" | "error" | "warning" | "info",
  title: string,
  message: string,
) => {
  const iconMap = {
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-circle",
    warning: "fas fa-exclamation-triangle",
    info: "fas fa-info-circle",
  };

  const notification = {
    id: Date.now().toString(),
    type,
    title,
    message,
    icon: iconMap[type],
  };

  notifications.value.push(notification);

  // Auto-remove notification after 5 seconds
  setTimeout(() => {
    removeNotification(notification.id);
  }, 5000);
};

const removeNotification = (id: string) => {
  const index = notifications.value.findIndex((n) => n.id === id);
  if (index > -1) {
    notifications.value.splice(index, 1);
  }
};

const loadDashboardData = async () => {
  try {
    // Load stats
    await Promise.all([usersStore.fetchStats(), feedbackStore.fetchStats()]);

    // Update dashboard stats
    const userStats = usersStore.stats;
    const feedbackStats = feedbackStore.stats;

    dashboardStats.value = {
      totalUsers: userStats?.total_users || 0,
      activeUsers: userStats?.active_users_today || 0,
      feedbackCount: feedbackStats?.total || 0,
      avgResponseTime: userStats?.avg_response_time_ms || 0,
    };

    // Update charts
    updateCharts();
  } catch (error) {
    handleError(error);
  }
};

const updateCharts = () => {
  // Activity chart
  if (activityChart.value) {
    const ctx = activityChart.value.getContext("2d");
    if (ctx) {
      if (activityChartInstance) {
        activityChartInstance.destroy();
      }

      activityChartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
          datasets: [
            {
              label: "Aktive Benutzer",
              data: [120, 150, 180, 170, 190, 130, 140],
              borderColor: "rgb(75, 192, 192)",
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      });
    }
  }

  // Feedback chart
  if (feedbackChart.value) {
    const ctx = feedbackChart.value.getContext("2d");
    if (ctx) {
      if (feedbackChartInstance) {
        feedbackChartInstance.destroy();
      }

      feedbackChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Positiv", "Negativ"],
          datasets: [
            {
              data: [
                feedbackStore.stats?.positive || 0,
                feedbackStore.stats?.negative || 0,
              ],
              backgroundColor: ["rgb(75, 192, 192)", "rgb(255, 99, 132)"],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      });
    }
  }
};

// Lifecycle
onMounted(() => {
  loadDashboardData();
});

onUnmounted(() => {
  if (activityChartInstance) {
    activityChartInstance.destroy();
  }
  if (feedbackChartInstance) {
    feedbackChartInstance.destroy();
  }
});
</script>

<style lang="scss" scoped>
.admin-panel {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

// Theme variables
.theme-light {
  --bg-primary: #f5f5f5;
  --bg-secondary: #ffffff;
  --bg-tertiary: #fafafa;
  --text-primary: #212121;
  --text-secondary: #757575;
  --accent-primary: #4a90e2;
  --accent-success: #52c41a;
  --accent-warning: #faad14;
  --accent-danger: #f5222d;
  --accent-info: #1890ff;
  --border: #e0e0e0;
  --shadow: rgba(0, 0, 0, 0.1);
}

.theme-dark {
  --bg-primary: #121212;
  --bg-secondary: #1e1e1e;
  --bg-tertiary: #2a2a2a;
  --text-primary: #ffffff;
  --text-secondary: #b0b0b0;
  --accent-primary: #5a9ff5;
  --accent-success: #67d23a;
  --accent-warning: #ffc107;
  --accent-danger: #ff5252;
  --accent-info: #2196f3;
  --border: #3a3a3a;
  --shadow: rgba(0, 0, 0, 0.3);
}

// Header
.admin-header {
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 2px 4px var(--shadow);
  z-index: 100;

  &__content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 64px;
    padding: 0 24px;
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__icon {
    font-size: 24px;
    color: var(--accent-primary);
  }

  &__title {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }

  &__user {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  &__user-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  &__user-name {
    font-weight: 500;
  }

  &__user-role {
    font-size: 14px;
    color: var(--text-secondary);
  }

  &__theme-toggle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background-color: var(--accent-primary);
      color: white;
    }
  }
}

// Layout
.admin-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

// Sidebar
.admin-sidebar {
  width: 260px;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border);
  overflow-y: auto;
}

.admin-nav {
  padding: 16px 0;

  &__item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 24px;
    color: var(--text-secondary);
    text-decoration: none;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background-color: var(--bg-tertiary);
      color: var(--text-primary);
    }

    &--active {
      background-color: var(--accent-primary);
      color: white;

      &:hover {
        background-color: var(--accent-primary);
        color: white;
      }

      .admin-nav__icon {
        color: white;
      }
    }
  }

  &__icon {
    width: 20px;
    text-align: center;
    color: var(--text-secondary);
  }

  &__label {
    font-size: 15px;
    font-weight: 500;
  }
}

// Content
.admin-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;

  &__title {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 24px;
  }
}

// Dashboard
.admin-dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px var(--shadow);
  display: flex;
  align-items: center;
  gap: 16px;

  &__icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    background-color: var(--bg-tertiary);
    color: var(--accent-primary);

    &--success {
      color: var(--accent-success);
    }

    &--warning {
      color: var(--accent-warning);
    }

    &--info {
      color: var(--accent-info);
    }
  }

  &__content {
    flex: 1;
  }

  &__value {
    font-size: 28px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  &__label {
    font-size: 14px;
    color: var(--text-secondary);
  }
}

.dashboard-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.chart-card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px var(--shadow);

  &__title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 16px;
  }

  canvas {
    height: 300px !important;
  }
}

// Notifications
.admin-notifications {
  position: fixed;
  top: 80px;
  right: 24px;
  z-index: 1000;
  width: 360px;
}

.notification {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 4px 8px var(--shadow);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;

  &__icon {
    font-size: 20px;
  }

  &__content {
    flex: 1;
  }

  &__title {
    font-weight: 600;
    margin-bottom: 4px;
  }

  &__message {
    font-size: 14px;
    color: var(--text-secondary);
  }

  &__close {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 24px;
    height: 24px;
    border: none;
    background: none;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color 0.3s ease;

    &:hover {
      color: var(--text-primary);
    }
  }

  // Notification types
  &--success {
    border-left: 4px solid var(--accent-success);

    .notification__icon {
      color: var(--accent-success);
    }
  }

  &--error {
    border-left: 4px solid var(--accent-danger);

    .notification__icon {
      color: var(--accent-danger);
    }
  }

  &--warning {
    border-left: 4px solid var(--accent-warning);

    .notification__icon {
      color: var(--accent-warning);
    }
  }

  &--info {
    border-left: 4px solid var(--accent-info);

    .notification__icon {
      color: var(--accent-info);
    }
  }
}

// Notification transitions
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.notification-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

// Responsive
@media (max-width: 768px) {
  .admin-layout {
    flex-direction: column;
  }

  .admin-sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }

  .admin-nav {
    display: flex;
    overflow-x: auto;
    padding: 0;

    &__item {
      flex-direction: column;
      gap: 4px;
      padding: 12px 16px;
      white-space: nowrap;
    }

    &__icon {
      width: auto;
    }

    &__label {
      font-size: 13px;
    }
  }

  .dashboard-stats {
    grid-template-columns: 1fr;
  }

  .dashboard-charts {
    grid-template-columns: 1fr;
  }

  .admin-notifications {
    right: 12px;
    width: calc(100% - 24px);
    max-width: 360px;
  }
}
</style>
