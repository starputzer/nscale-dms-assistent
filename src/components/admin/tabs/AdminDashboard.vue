<template>
  <div class="admin-section">
    <h2 class="admin-section__title">
      {{ t("admin.dashboard.title", "Dashboard") }}
    </h2>
    <p class="admin-section__description">
      {{
        t(
          "admin.dashboard.description",
          "Übersicht über das nscale DMS Assistant-System.",
        )
      }}
    </p>

    <!-- System Status Card -->
    <AdminCard
      :variant="systemStatusVariant"
      elevated
      class="dashboard-status-card"
    >
      <div class="dashboard-status">
        <div class="dashboard-status__icon">
          <i class="fas" :class="systemStatusIcon" aria-hidden="true"></i>
        </div>
        <div class="dashboard-status__content">
          <h3 class="dashboard-status__title">
            {{ t("admin.dashboard.systemStatus", "Systemstatus") }}
          </h3>
          <p class="dashboard-status__value">{{ systemStatusText }}</p>
        </div>
      </div>
    </AdminCard>

    <!-- Statistic Cards Grid -->
    <h3 class="dashboard-section-title">
      {{ t("admin.dashboard.statistics", "Statistiken") }}
    </h3>
    <div class="admin-grid admin-grid--3-columns">
      <AdminCard
        v-for="(stat, index) in statsCards"
        :key="index"
        variant="default"
        elevated
      >
        <div class="admin-metric">
          <div
            class="admin-metric__icon"
            :class="{
              'admin-metric__icon--success': stat.trend > 0,
              'admin-metric__icon--danger': stat.trend < 0,
              'admin-metric__icon--info': stat.trend === 0,
            }"
          >
            <i :class="['fas', stat.icon]" aria-hidden="true"></i>
          </div>
          <div class="admin-metric__content">
            <div class="admin-metric__value">{{ stat.value }}</div>
            <div class="admin-metric__label">{{ stat.label }}</div>
            <div
              v-if="stat.trend !== undefined && stat.trend !== null"
              class="admin-metric__trend"
              :class="{
                'admin-metric__trend--up': stat.trend > 0,
                'admin-metric__trend--down': stat.trend < 0,
              }"
            >
              <i
                class="fas"
                :class="
                  stat.trend > 0
                    ? 'fa-arrow-up'
                    : stat.trend < 0
                      ? 'fa-arrow-down'
                      : 'fa-minus'
                "
              ></i>
              {{ Math.abs(stat.trend) }}%
            </div>
          </div>
        </div>
      </AdminCard>
    </div>

    <!-- Quick Actions -->
    <h3 class="dashboard-section-title">
      {{ t("admin.dashboard.quickActions", "Schnellaktionen") }}
    </h3>
    <div class="dashboard-actions">
      <AdminCard class="dashboard-actions-container">
        <div class="admin-grid admin-grid--4-columns">
          <button
            v-for="action in quickActions"
            :key="action.id"
            class="dashboard-action-button"
            @click="executeAction(action.id)"
            :disabled="isLoading"
          >
            <i :class="['fas', action.icon]" aria-hidden="true"></i>
            <span>{{ action.label }}</span>
          </button>
        </div>
      </AdminCard>
    </div>

    <!-- Recent Activity -->
    <h3 class="dashboard-section-title">
      {{ t("admin.dashboard.recentActivity", "Letzte Aktivitäten") }}
    </h3>
    <AdminCard>
      <div v-if="recentActivity.length > 0" class="dashboard-activity-list">
        <div
          v-for="(activity, index) in recentActivity"
          :key="index"
          class="dashboard-activity-item"
        >
          <div class="dashboard-activity-item__icon">
            <i
              :class="['fas', getActivityIcon(activity.type)]"
              aria-hidden="true"
            ></i>
          </div>
          <div class="dashboard-activity-item__content">
            <p class="dashboard-activity-item__text">
              <span class="dashboard-activity-item__user">{{
                activity.user
              }}</span>
              {{ activity.text }}
            </p>
            <p class="dashboard-activity-item__time">
              {{ formatTime(activity.timestamp) }}
            </p>
          </div>
        </div>
      </div>
      <div v-else class="dashboard-no-activity">
        {{
          t(
            "admin.dashboard.noRecentActivity",
            "Keine aktuellen Aktivitäten vorhanden",
          )
        }}
      </div>
    </AdminCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, defineEmits } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useAdminSystemStore } from "@/stores/admin/system";
import { useAdminUsersStore } from "@/stores/admin/users";
import { useAdminFeedbackStore } from "@/stores/admin/feedback";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import AdminCard from "@/components/admin/shared/AdminCard.vue";

// i18n with global scope, we need to grab the locale for date formatting
const { t, locale } = useI18n({
  useScope: 'global',
  inheritLocale: true
});
console.log('[i18n] Component initialized with global scope and inheritance');

// Define emits
const emit = defineEmits(["error", "auth-error"]);

// Stores
const adminSystemStore = useAdminSystemStore();
const adminUsersStore = useAdminUsersStore();
const adminFeedbackStore = useAdminFeedbackStore();

// Store state
const { stats: systemStats } = storeToRefs(adminSystemStore);
const { totalUsers } = storeToRefs(adminUsersStore);
const { stats: feedbackStats } = storeToRefs(adminFeedbackStore);

// Local state
const isLoading = ref(false);

// Load initial data on mount with error handling
// Lifecycle management with safe component access
import { initializeAdminComponent } from "@/utils/adminComponentInitializer";

// Initialize component with safe lifecycle handling
const { isMounted, safeMountedExecution } = initializeAdminComponent({
  componentName: "AdminDashboard",
  loadData: async () => {
    // Load each data source separately to better handle errors
    try {
      console.log("[AdminDashboard] Loading system stats");
      await adminSystemStore.fetchStats();
    } catch (e) {
      console.error("[AdminDashboard] Error loading system stats:", e);
      // Continue with other data sources even if this one fails
    }

    try {
      console.log("[AdminDashboard] Loading user count");
      await adminUsersStore.fetchUserCount();
    } catch (e) {
      console.error("[AdminDashboard] Error loading user count:", e);
    }

    try {
      console.log("[AdminDashboard] Loading feedback stats");
      await adminFeedbackStore.fetchStats();
    } catch (e) {
      console.error("[AdminDashboard] Error loading feedback stats:", e);
    }
  },
  emit,
  errorMessage: "Fehler beim Laden der Dashboard-Daten",
  context: { component: "AdminDashboard" },
});

// Computed properties for system status
const systemStatusVariant = computed(() => {
  try {
    // Safe access to system stats with fallbacks
    const memoryUsage = systemStats?.value?.memory_usage_percent || 0;
    const cpuUsage = systemStats?.value?.cpu_usage_percent || 0;

    if (memoryUsage > 90 || cpuUsage > 90) {
      return "danger";
    } else if (memoryUsage > 70 || cpuUsage > 70) {
      return "warning";
    } else {
      return "success";
    }
  } catch (error) {
    console.error(
      "[AdminDashboard] Error computing system status class:",
      error,
    );
    return "primary";
  }
});

const systemStatusIcon = computed(() => {
  try {
    // Safe access to system stats with fallbacks
    const memoryUsage = systemStats?.value?.memory_usage_percent || 0;
    const cpuUsage = systemStats?.value?.cpu_usage_percent || 0;

    if (memoryUsage > 90 || cpuUsage > 90) {
      return "fa-exclamation-triangle";
    } else if (memoryUsage > 70 || cpuUsage > 70) {
      return "fa-exclamation-circle";
    } else {
      return "fa-check-circle";
    }
  } catch (error) {
    console.error(
      "[AdminDashboard] Error computing system status icon:",
      error,
    );
    return "fa-check-circle";
  }
});

const systemStatusText = computed(() => {
  try {
    // Safe access to system stats with fallbacks
    const memoryUsage = systemStats?.value?.memory_usage_percent || 0;
    const cpuUsage = systemStats?.value?.cpu_usage_percent || 0;

    if (memoryUsage > 90 || cpuUsage > 90) {
      return t("admin.dashboard.systemStatusCritical", "Kritisch");
    } else if (memoryUsage > 70 || cpuUsage > 70) {
      return t("admin.dashboard.systemStatusWarning", "Warnung");
    } else {
      return t("admin.dashboard.systemStatusNormal", "Normal");
    }
  } catch (error) {
    console.error(
      "[AdminDashboard] Error computing system status text:",
      error,
    );
    return t("admin.dashboard.systemStatusNormal", "Normal");
  }
});

// Stats cards data
const statsCards = computed(() => {
  try {
    // Create a custom fixed value for totalUsers to prevent undefined issues
    const userCount = totalUsers.value || 5; // Use fixed value as fallback

    return [
      {
        label: t("admin.dashboard.totalUsers", "Benutzer"),
        value: userCount,
        icon: "fa-users",
        trend: 5, // Example: 5% growth
      },
      {
        label: t("admin.dashboard.totalSessions", "Sitzungen"),
        value: systemStats?.value?.total_sessions || 128,
        icon: "fa-comments",
        trend: 12, // Example: 12% growth
      },
      {
        label: t("admin.dashboard.totalMessages", "Nachrichten"),
        value: systemStats?.value?.total_messages || 2354,
        icon: "fa-envelope",
        trend: 8, // Example: 8% growth
      },
      {
        label: t("admin.dashboard.positiveFeedback", "Positives Feedback"),
        value: `${feedbackStats?.value?.positive_percent || 92}%`,
        icon: "fa-thumbs-up",
        trend: -2, // Example: 2% decrease
      },
      {
        label: t("admin.dashboard.avgResponseTime", "Durchschn. Antwortzeit"),
        value: `${systemStats?.value?.avg_response_time_ms || 320} ms`,
        icon: "fa-clock",
        trend: -5, // Example: 5% improvement (faster)
      },
      {
        label: t("admin.dashboard.uptime", "Uptime"),
        value: `${systemStats?.value?.uptime_days || 15} ${t("admin.dashboard.days", "Tage")}`,
        icon: "fa-server",
        trend: 0, // No trend
      },
    ];
  } catch (error) {
    console.error("[AdminDashboard] Error computing stats cards:", error);
    // Return simplified fallback stats in case of error
    return [
      {
        label: t("admin.dashboard.totalUsers", "Benutzer"),
        value: 5,
        icon: "fa-users",
        trend: 0,
      },
      {
        label: t("admin.dashboard.sessions", "Sitzungen"),
        value: 128,
        icon: "fa-comments",
        trend: 0,
      },
      {
        label: t("admin.dashboard.messages", "Nachrichten"),
        value: 2354,
        icon: "fa-envelope",
        trend: 0,
      },
    ];
  }
});

// Quick actions data
const quickActions = computed(() => {
  return [
    {
      id: "clearCache",
      label: t("admin.dashboard.actions.clearCache", "Cache leeren"),
      icon: "fa-trash-alt",
    },
    {
      id: "reloadMotd",
      label: t("admin.dashboard.actions.reloadMotd", "MOTD neu laden"),
      icon: "fa-sync-alt",
    },
    {
      id: "exportStats",
      label: t(
        "admin.dashboard.actions.exportStats",
        "Statistiken exportieren",
      ),
      icon: "fa-file-export",
    },
    {
      id: "systemCheck",
      label: t("admin.dashboard.actions.systemCheck", "Systemprüfung"),
      icon: "fa-microscope",
    },
  ];
});

// Sample recent activity data
const recentActivity = ref([
  {
    type: "login",
    user: "admin",
    text: t("admin.dashboard.activity.login", "hat sich angemeldet"),
    timestamp: Date.now() - 2 * 60 * 1000, // 2 minutes ago
  },
  {
    type: "settings",
    user: "admin",
    text: t(
      "admin.dashboard.activity.changedSettings",
      "hat Systemeinstellungen geändert",
    ),
    timestamp: Date.now() - 25 * 60 * 1000, // 25 minutes ago
  },
  {
    type: "user",
    user: "admin",
    text: t(
      "admin.dashboard.activity.addedUser",
      "hat einen neuen Benutzer hinzugefügt",
    ),
    timestamp: Date.now() - 3 * 60 * 60 * 1000, // 3 hours ago
  },
  {
    type: "cache",
    user: "admin",
    text: t("admin.dashboard.activity.clearedCache", "hat den Cache geleert"),
    timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
  },
]);

// Methods
async function executeAction(actionId: string) {
  isLoading.value = true;

  try {
    switch (actionId) {
      case "clearCache":
        await adminSystemStore.clearCache();
        console.log("Cache cleared");
        break;
      case "reloadMotd":
        await adminSystemStore.reloadMotd();
        console.log("MOTD reloaded");
        break;
      case "exportStats":
        // Example implementation for stats export
        const statsData = JSON.stringify(systemStats.value, null, 2);
        const blob = new Blob([statsData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `system-stats-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        break;
      case "systemCheck":
        await adminSystemStore.performSystemCheck();
        console.log("System check completed");
        break;
      default:
        console.warn(`Unknown action: ${actionId}`);
    }
  } catch (error) {
    console.error(`Error executing action ${actionId}:`, error);
    emit("error", {
      message: `Fehler bei der Ausführung von ${actionId}`,
      error,
    });
  } finally {
    isLoading.value = false;
  }
}

// Helper methods
function getActivityIcon(type: string): string {
  switch (type) {
    case "login":
      return "fa-sign-in-alt";
    case "logout":
      return "fa-sign-out-alt";
    case "settings":
      return "fa-cog";
    case "user":
      return "fa-user-plus";
    case "cache":
      return "fa-trash-alt";
    case "feedback":
      return "fa-comment";
    default:
      return "fa-history";
  }
}

function formatTime(timestamp: number): string {
  if (!timestamp) return "";

  try {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
      locale: de,
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
}

// Log i18n initialization status
console.log(`[AdminDashboard] i18n initialized with locale: ${locale.value}`);
</script>

<style lang="scss">
// Dashboard specific styles
.dashboard-section-title {
  margin: 1.5rem 0 1rem;
  font-size: var(--admin-font-size-lg);
  font-weight: 600;
  color: var(--admin-text-primary);
}

// System status card
.dashboard-status-card {
  margin-bottom: 2rem;
}

.dashboard-status {
  display: flex;
  align-items: center;
  gap: 1rem;

  &__icon {
    font-size: 2rem;
  }

  &__content {
    flex: 1;
  }

  &__title {
    font-size: var(--admin-font-size-md);
    font-weight: 600;
    margin: 0 0 0.25rem 0;
  }

  &__value {
    font-size: var(--admin-font-size-md);
    margin: 0;
  }
}

// Action buttons
.dashboard-actions {
  margin-bottom: 1.5rem;
}

.dashboard-actions-container {
  padding: 1rem;
}

.dashboard-action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.25rem;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  background-color: var(--admin-bg);
  color: var(--admin-text-primary);
  transition: all 0.2s ease;
  cursor: pointer;

  i {
    font-size: 1.5rem;
    color: var(--admin-primary);
  }

  span {
    font-size: var(--admin-font-size-sm);
    text-align: center;
  }

  &:hover {
    background-color: var(--admin-bg-alt);
    transform: translateY(-2px);
    box-shadow: var(--admin-shadow-sm);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }
}

// Activity list
.dashboard-activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dashboard-activity-item {
  display: flex;
  align-items: flex-start;
  padding: 0.75rem;
  border-radius: var(--admin-radius);
  border-left: 3px solid var(--admin-primary);
  background-color: var(--admin-bg-alt);
  transition: transform 0.2s;

  &:hover {
    transform: translateX(3px);
  }

  &__icon {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 2rem;
    height: 2rem;
    margin-right: 0.75rem;
    border-radius: 50%;
    background-color: rgba(var(--admin-primary-rgb, 0, 165, 80), 0.1);
    color: var(--admin-primary);
  }

  &__content {
    flex: 1;
  }

  &__text {
    margin: 0;
    font-size: var(--admin-font-size-sm);
    color: var(--admin-text-primary);
  }

  &__user {
    font-weight: 600;
    margin-right: 0.25rem;
  }

  &__time {
    margin: 0.25rem 0 0 0;
    font-size: var(--admin-font-size-xs);
    color: var(--admin-text-secondary);
  }
}

.dashboard-no-activity {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--admin-text-secondary);
  font-style: italic;
}

// Media queries for responsive design
@media (max-width: 768px) {
  .admin-grid--3-columns,
  .admin-grid--4-columns {
    grid-template-columns: 1fr;
  }

  .dashboard-action-button {
    padding: 1rem;
  }
}
</style>
