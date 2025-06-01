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
              <i class="fas fa-user-clock stat-card__icon"></i>
              <div class="stat-card__content">
                <div class="stat-card__value">
                  {{ dashboardStats.activeUsers }}
                </div>
                <div class="stat-card__label">Aktive Benutzer (heute)</div>
              </div>
            </div>

            <div class="stat-card">
              <i class="fas fa-comments stat-card__icon"></i>
              <div class="stat-card__content">
                <div class="stat-card__value">
                  {{ dashboardStats.feedbackCount }}
                </div>
                <div class="stat-card__label">Feedbacks gesamt</div>
              </div>
            </div>

            <div class="stat-card">
              <i class="fas fa-tachometer-alt stat-card__icon"></i>
              <div class="stat-card__content">
                <div class="stat-card__value">
                  {{ dashboardStats.avgResponseTime }}ms
                </div>
                <div class="stat-card__label">Ø Antwortzeit</div>
              </div>
            </div>
          </div>

          <div class="dashboard-charts">
            <div class="chart-container">
              <h3>Benutzeraktivität (Letzte Woche)</h3>
              <canvas ref="activityChart"></canvas>
            </div>

            <div class="chart-container">
              <h3>Feedback Verteilung</h3>
              <canvas ref="feedbackChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Users Management -->
        <AdminUsersImproved v-if="activeTab === 'users'" @error="handleError" />

        <!-- Feedback Management -->
        <AdminFeedbackImproved
          v-if="activeTab === 'feedback'"
          @error="handleError"
        />

        <!-- MOTD Editor -->
        <AdminMotdImproved v-if="activeTab === 'motd'" @error="handleError" />

        <!-- Document Converter Management -->
        <AdminDocConverterImproved
          v-if="activeTab === 'document-converter'"
          @error="handleError"
        />

        <!-- System Settings -->
        <AdminSystemImproved
          v-if="activeTab === 'system'"
          @error="handleError"
        />

        <!-- Feature Toggles -->
        <div
          v-if="activeTab === 'feature-toggles'"
          class="admin-feature-toggles"
        >
          <h2 class="admin-content__title">Feature Toggles</h2>

          <div class="feature-toggles-container">
            <div v-if="loading.featureToggles" class="loading-spinner">
              <i class="fas fa-spinner fa-spin"></i>
              {{ t("common.loading") }}
            </div>
            <div v-else-if="error" class="error-message">
              <i class="fas fa-exclamation-triangle"></i>
              {{ error }}
            </div>
            <div v-else>
              <div class="feature-toggle-grid">
                <div
                  v-for="toggle in featureToggles"
                  :key="toggle.id"
                  class="feature-toggle-card"
                >
                  <div class="toggle-header">
                    <h3>{{ toggle.name }}</h3>
                    <div class="toggle-switch">
                      <input
                        type="checkbox"
                        :id="toggle.id"
                        v-model="toggle.enabled"
                        @change="updateFeatureToggle(toggle)"
                      />
                      <label :for="toggle.id"></label>
                    </div>
                  </div>

                  <p class="toggle-description">{{ toggle.description }}</p>

                  <div class="toggle-meta">
                    <span class="toggle-env">{{ toggle.environment }}</span>
                    <span class="toggle-since">{{
                      formatDate(toggle.created_at)
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Statistics -->
        <div v-if="activeTab === 'statistics'" class="admin-statistics">
          <h2 class="admin-content__title">Statistiken</h2>

          <div class="statistics-filters">
            <div class="filter-item">
              <label>Zeitraum</label>
              <select v-model="statsTimeframe" @change="loadStatistics">
                <option value="day">Heute</option>
                <option value="week">Letzte Woche</option>
                <option value="month">Letzter Monat</option>
                <option value="year">Letztes Jahr</option>
              </select>
            </div>

            <div class="filter-item">
              <label>Typ</label>
              <select v-model="statsType" @change="loadStatistics">
                <option value="users">Benutzer</option>
                <option value="sessions">Sitzungen</option>
                <option value="messages">Nachrichten</option>
                <option value="feedback">Feedback</option>
              </select>
            </div>

            <button class="btn btn-small" @click="loadStatistics">
              <i class="fas fa-sync-alt"></i>
              Aktualisieren
            </button>
          </div>

          <div class="statistics-charts">
            <div class="chart-container full-width">
              <h3>{{ getStatsChartTitle() }}</h3>
              <canvas ref="statisticsChart"></canvas>
            </div>

            <div class="statistics-summary">
              <div class="summary-item">
                <span class="summary-label">Gesamt:</span>
                <span class="summary-value">{{
                  formatStatValue(statisticsData.total)
                }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Durchschnitt:</span>
                <span class="summary-value">{{
                  formatStatValue(statisticsData.average)
                }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Maximum:</span>
                <span class="summary-value">{{
                  formatStatValue(statisticsData.maximum)
                }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Minimum:</span>
                <span class="summary-value">{{
                  formatStatValue(statisticsData.minimum)
                }}</span>
              </div>
            </div>
          </div>
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
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { Chart } from "chart.js/auto";
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { useAdminUsersStore } from "@/stores/admin/users";
import { useAdminFeedbackStore } from "@/stores/admin/feedback";
import { useFeatureTogglesStore } from "@/stores/featureToggles";
import AdminUsersImproved from "./improved/AdminUsersImproved.vue";
import AdminFeedbackImproved from "./improved/AdminFeedbackImproved.vue";
import AdminMotdImproved from "./improved/AdminMotdImproved.vue";
import AdminDocConverterImproved from "./improved/AdminDocConverterImproved.vue";
import AdminSystemImproved from "./improved/AdminSystemImproved.vue";

// Stores
const authStore = useAuthStore();
const uiStore = useUIStore();
const usersStore = useAdminUsersStore();
const feedbackStore = useAdminFeedbackStore();
const featureToggleStore = useFeatureTogglesStore();

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
const statisticsChart = ref<HTMLCanvasElement>();
let activityChartInstance: Chart | null = null;
let feedbackChartInstance: Chart | null = null;
let statisticsChartInstance: Chart | null = null;

// Dashboard stats
const dashboardStats = ref({
  totalUsers: 0,
  activeUsers: 0,
  feedbackCount: 0,
  avgResponseTime: 0,
});

// Feature Toggles
const featureToggles = ref<
  Array<{
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    environment: string;
    created_at: number;
  }>
>([]);

// Statistics
const statsTimeframe = ref("week");
const statsType = ref("users");
const statisticsData = ref({
  labels: [] as string[],
  values: [] as number[],
  total: 0,
  average: 0,
  maximum: 0,
  minimum: 0,
});

// Loading states
const loading = ref({
  dashboard: false,
  featureToggles: false,
  statistics: false,
});

const error = ref("");

// Tabs configuration
const tabs = [
  { id: "dashboard", label: "Dashboard", icon: "fas fa-home" },
  { id: "users", label: "Benutzer", icon: "fas fa-users" },
  { id: "feedback", label: "Feedback", icon: "fas fa-comments" },
  { id: "motd", label: "Nachrichten", icon: "fas fa-bullhorn" },
  {
    id: "document-converter",
    label: "Dokumentenkonverter",
    icon: "fas fa-file-alt",
  },
  { id: "system", label: "System", icon: "fas fa-cogs" },
  { id: "feature-toggles", label: "Feature Toggles", icon: "fas fa-toggle-on" },
  { id: "statistics", label: "Statistiken", icon: "fas fa-chart-bar" },
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
  loading.value.dashboard = true;
  error.value = "";

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
  } finally {
    loading.value.dashboard = false;
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
              data: usersStore.weeklyActiveUsers || [
                120, 150, 180, 170, 190, 130, 140,
              ],
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

const loadFeatureToggles = async () => {
  loading.value.featureToggles = true;
  error.value = "";

  try {
    await featureToggleStore.fetchToggles();
    featureToggles.value = featureToggleStore.toggles;
  } catch (error: any) {
    handleError(error);
  } finally {
    loading.value.featureToggles = false;
  }
};

const updateFeatureToggle = async (toggle: any) => {
  try {
    await featureToggleStore.updateToggle(toggle.id, {
      enabled: toggle.enabled,
    });
    addNotification(
      "success",
      "Toggle aktualisiert",
      `Feature "${toggle.name}" wurde ${toggle.enabled ? "aktiviert" : "deaktiviert"}.`,
    );
  } catch (error: any) {
    handleError(error);
    // Revert the UI change
    toggle.enabled = !toggle.enabled;
  }
};

const loadStatistics = async () => {
  loading.value.statistics = true;
  error.value = "";

  try {
    // In a real implementation, fetch data from API
    // For now, generate sample data
    const labels = [];
    const values = [];
    let total = 0;

    switch (statsTimeframe.value) {
      case "day":
        for (let i = 0; i < 24; i++) {
          labels.push(`${i}:00`);
          const value = Math.floor(Math.random() * 100);
          values.push(value);
          total += value;
        }
        break;
      case "week":
        labels.push("Mo", "Di", "Mi", "Do", "Fr", "Sa", "So");
        for (let i = 0; i < 7; i++) {
          const value = Math.floor(Math.random() * 500);
          values.push(value);
          total += value;
        }
        break;
      case "month":
        for (let i = 1; i <= 30; i++) {
          labels.push(`${i}`);
          const value = Math.floor(Math.random() * 200);
          values.push(value);
          total += value;
        }
        break;
      case "year":
        labels.push(
          "Jan",
          "Feb",
          "Mär",
          "Apr",
          "Mai",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Okt",
          "Nov",
          "Dez",
        );
        for (let i = 0; i < 12; i++) {
          const value = Math.floor(Math.random() * 2000);
          values.push(value);
          total += value;
        }
        break;
    }

    statisticsData.value = {
      labels,
      values,
      total,
      average: Math.round(total / labels.length),
      maximum: Math.max(...values),
      minimum: Math.min(...values),
    };

    updateStatisticsChart();
  } catch (error: any) {
    handleError(error);
  } finally {
    loading.value.statistics = false;
  }
};

const updateStatisticsChart = () => {
  if (statisticsChart.value) {
    const ctx = statisticsChart.value.getContext("2d");
    if (ctx) {
      if (statisticsChartInstance) {
        statisticsChartInstance.destroy();
      }

      const chartType = statsType.value === "feedback" ? "bar" : "line";
      const chartColor =
        statsType.value === "users"
          ? "rgb(75, 192, 192)"
          : statsType.value === "sessions"
            ? "rgb(54, 162, 235)"
            : statsType.value === "messages"
              ? "rgb(153, 102, 255)"
              : "rgb(255, 159, 64)";

      statisticsChartInstance = new Chart(ctx, {
        type: chartType,
        data: {
          labels: statisticsData.value.labels,
          datasets: [
            {
              label: getStatsChartTitle(),
              data: statisticsData.value.values,
              borderColor: chartColor,
              backgroundColor: chartColor,
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
};

const getStatsChartTitle = () => {
  const typeLabel =
    statsType.value === "users"
      ? "Benutzeraktivität"
      : statsType.value === "sessions"
        ? "Sitzungen"
        : statsType.value === "messages"
          ? "Nachrichten"
          : "Feedback";

  const timeLabel =
    statsTimeframe.value === "day"
      ? "heute"
      : statsTimeframe.value === "week"
        ? "letzte Woche"
        : statsTimeframe.value === "month"
          ? "letzter Monat"
          : "letztes Jahr";

  return `${typeLabel} (${timeLabel})`;
};

const formatStatValue = (value: number) => {
  if (statsType.value === "messages" && statsTimeframe.value === "year") {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString();
  }
  return value.toString();
};

const formatDate = (timestamp: number): string => {
  if (!timestamp) return "";
  try {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

onMounted(() => {
  loadDashboardData();
  loadFeatureToggles();
  loadStatistics();
});

// Watch for tab changes to load data
watch(activeTab, (newTab) => {
  if (newTab === "dashboard") {
    loadDashboardData();
  } else if (newTab === "feature-toggles") {
    loadFeatureToggles();
  } else if (newTab === "statistics") {
    loadStatistics();
  }
});
</script>

<style lang="scss" scoped>
.admin-panel {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
    Arial, sans-serif;

  // Header
  .admin-header {
    background-color: var(--bg-secondary);
    box-shadow: 0 1px 3px var(--shadow-color);
    padding: 1rem 1.5rem;
    position: sticky;
    top: 0;
    z-index: 10;

    &__content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;
    }

    &__brand {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    &__icon {
      font-size: 1.5rem;
      color: var(--primary-color);
    }

    &__title {
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    &__user {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    &__user-info {
      text-align: right;
    }

    &__user-name {
      display: block;
      font-weight: 600;
      color: var(--text-primary);
    }

    &__user-role {
      display: block;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    &__theme-toggle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: transparent;
      border: none;
      color: var(--text-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      transition: all 0.3s ease;

      &:hover {
        background: var(--bg-tertiary);
      }

      &:focus {
        outline: none;
        box-shadow: 0 0 0 2px var(--primary-color);
      }
    }
  }

  // Main Layout
  .admin-layout {
    display: flex;
    max-width: 1600px;
    margin: 0 auto;
    min-height: calc(100vh - 70px);
  }

  // Sidebar
  .admin-sidebar {
    width: 250px;
    background-color: var(--bg-secondary);
    padding: 1.5rem 0;
    border-right: 1px solid var(--border-color);
    height: calc(100vh - 70px);
    position: sticky;
    top: 70px;
    overflow-y: auto;
  }

  .admin-nav {
    &__item {
      display: flex;
      align-items: center;
      padding: 0.75rem 1.5rem;
      color: var(--text-primary);
      transition: all 0.3s ease;
      cursor: pointer;
      text-decoration: none;
      font-weight: 500;

      &:hover {
        background-color: var(--bg-tertiary);
      }

      &--active {
        background-color: var(--primary-color);
        color: white;

        .admin-nav__icon {
          color: white;
        }
      }
    }

    &__icon {
      width: 24px;
      margin-right: 1rem;
      color: var(--text-secondary);
    }
  }

  // Content
  .admin-content {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;

    &__title {
      margin-top: 0;
      margin-bottom: 1.5rem;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  // Dashboard
  .admin-dashboard {
    .dashboard-stats {
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

      &__icon {
        font-size: 2rem;
        color: var(--primary-color);
      }

      &__content {
        flex: 1;
      }

      &__value {
        font-size: 1.8rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      &__label {
        color: var(--text-secondary);
        font-size: 0.9rem;
      }
    }

    .dashboard-charts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 1.5rem;
    }

    .chart-container {
      background: var(--bg-secondary);
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 2px 4px var(--shadow-color);
      height: 300px;

      h3 {
        margin-top: 0;
        margin-bottom: 1rem;
        font-size: 1.1rem;
        color: var(--text-primary);
      }

      &.full-width {
        grid-column: 1 / -1;
      }
    }
  }

  // Notifications
  .admin-notifications {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    width: 350px;
    z-index: 100;
  }

  .notification {
    background: var(--bg-secondary);
    border-radius: 8px;
    box-shadow: 0 4px 12px var(--shadow-color);
    padding: 1rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    transition: all 0.3s ease;

    &__icon {
      font-size: 1.25rem;
      margin-top: 0.25rem;
    }

    &__content {
      flex: 1;
    }

    &__title {
      font-weight: 600;
      margin-bottom: 0.25rem;
      color: var(--text-primary);
    }

    &__message {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    &__close {
      border: none;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.9rem;
      opacity: 0.7;
      transition: opacity 0.3s ease;

      &:hover {
        opacity: 1;
      }
    }

    &--success {
      border-left: 4px solid var(--color-success);
      .notification__icon {
        color: var(--color-success);
      }
    }

    &--error {
      border-left: 4px solid var(--color-danger);
      .notification__icon {
        color: var(--color-danger);
      }
    }

    &--warning {
      border-left: 4px solid var(--color-warning);
      .notification__icon {
        color: var(--color-warning);
      }
    }

    &--info {
      border-left: 4px solid var(--color-info);
      .notification__icon {
        color: var(--color-info);
      }
    }
  }

  // Feature Toggles
  .admin-feature-toggles {
    .feature-toggle-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .feature-toggle-card {
      background: var(--bg-secondary);
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 2px 4px var(--shadow-color);

      .toggle-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;

        h3 {
          margin: 0;
          font-size: 1.2rem;
          color: var(--text-primary);
        }
      }

      .toggle-description {
        color: var(--text-secondary);
        margin-bottom: 1.5rem;
        font-size: 0.95rem;
      }

      .toggle-meta {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;

        .toggle-env {
          background: var(--bg-tertiary);
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          color: var(--text-secondary);
        }

        .toggle-since {
          color: var(--text-secondary);
        }
      }
    }

    .toggle-switch {
      position: relative;

      input[type="checkbox"] {
        opacity: 0;
        width: 0;
        height: 0;
      }

      label {
        display: inline-block;
        width: 50px;
        height: 26px;
        background: var(--bg-tertiary);
        border-radius: 13px;
        position: relative;
        cursor: pointer;
        transition: background 0.3s ease;

        &::after {
          content: "";
          position: absolute;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          top: 3px;
          left: 3px;
          transition: left 0.3s ease;
        }
      }

      input:checked + label {
        background: var(--primary-color);

        &::after {
          left: 27px;
        }
      }
    }
  }

  // Statistics
  .admin-statistics {
    .statistics-filters {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;

      .filter-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        label {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        select {
          min-width: 150px;
          padding: 0.5rem;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          background: var(--bg-primary);
          color: var(--text-primary);
        }
      }

      .btn {
        margin-top: auto;
      }
    }

    .statistics-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 1.5rem;

      .summary-item {
        background: var(--bg-secondary);
        border-radius: 8px;
        padding: 1rem;
        text-align: center;

        .summary-label {
          display: block;
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }

        .summary-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
        }
      }
    }
  }

  // Loading and error states
  .loading-spinner {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
    color: var(--text-secondary);

    i {
      margin-right: 0.5rem;
    }
  }

  .error-message {
    background: var(--bg-danger);
    color: var(--color-danger);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.5rem;

    i {
      margin-right: 0.5rem;
    }
  }

  // Button styles
  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    background: var(--primary-color);
    color: white;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;

    &:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &.btn-secondary {
      background: var(--bg-tertiary);
      color: var(--text-primary);

      &:hover {
        background: var(--bg-quaternary);
      }
    }

    &.btn-small {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
    }

    i {
      font-size: 0.9rem;
    }
  }
}

// Transitions for notifications
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from,
.notification-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
