<template>
  <div class="admin-dashboard">
    <h2 class="admin-dashboard__title">
      {{ t("admin.dashboard.title", "Dashboard") }}
    </h2>

    <!-- System Status Card -->
    <div class="admin-dashboard__status-card" :class="systemStatusClass">
      <div class="admin-dashboard__status-icon">
        <i class="fas" :class="systemStatusIcon" aria-hidden="true"></i>
      </div>
      <div class="admin-dashboard__status-content">
        <h3 class="admin-dashboard__status-title">
          {{ t("admin.dashboard.systemStatus", "Systemstatus") }}
        </h3>
        <p class="admin-dashboard__status-value">{{ systemStatusText }}</p>
      </div>
    </div>

    <!-- Statistic Cards Grid -->
    <div class="admin-dashboard__stats-grid">
      <div
        v-for="(stat, index) in statsCards"
        :key="index"
        class="admin-dashboard__stat-card"
      >
        <div class="admin-dashboard__stat-icon">
          <i :class="['fas', stat.icon]" aria-hidden="true"></i>
        </div>
        <div class="admin-dashboard__stat-content">
          <h3 class="admin-dashboard__stat-label">{{ stat.label }}</h3>
          <p class="admin-dashboard__stat-value">{{ stat.value }}</p>
          <p
            v-if="stat.trend"
            class="admin-dashboard__stat-trend"
            :class="{
              'admin-dashboard__stat-trend--up': stat.trend > 0,
              'admin-dashboard__stat-trend--down': stat.trend < 0,
            }"
          >
            <i
              class="fas"
              :class="stat.trend > 0 ? 'fa-arrow-up' : 'fa-arrow-down'"
              aria-hidden="true"
            ></i>
            {{ Math.abs(stat.trend) }}%
          </p>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="admin-dashboard__actions">
      <h3 class="admin-dashboard__section-title">
        {{ t("admin.dashboard.quickActions", "Schnellaktionen") }}
      </h3>
      <div class="admin-dashboard__actions-grid">
        <button
          v-for="action in quickActions"
          :key="action.id"
          class="admin-dashboard__action-button"
          @click="executeAction(action.id)"
          :disabled="isLoading"
        >
          <i :class="['fas', action.icon]" aria-hidden="true"></i>
          <span>{{ action.label }}</span>
        </button>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="admin-dashboard__activity">
      <h3 class="admin-dashboard__section-title">
        {{ t("admin.dashboard.recentActivity", "Letzte Aktivitäten") }}
      </h3>
      <div
        v-if="recentActivity.length > 0"
        class="admin-dashboard__activity-list"
      >
        <div
          v-for="(activity, index) in recentActivity"
          :key="index"
          class="admin-dashboard__activity-item"
        >
          <div class="admin-dashboard__activity-icon">
            <i
              :class="['fas', getActivityIcon(activity.type)]"
              aria-hidden="true"
            ></i>
          </div>
          <div class="admin-dashboard__activity-content">
            <p class="admin-dashboard__activity-text">
              <span class="admin-dashboard__activity-user">{{
                activity.user
              }}</span>
              {{ activity.text }}
            </p>
            <p class="admin-dashboard__activity-time">
              {{ formatTime(activity.timestamp) }}
            </p>
          </div>
        </div>
      </div>
      <p v-else class="admin-dashboard__no-activity">
        {{
          t(
            "admin.dashboard.noRecentActivity",
            "Keine aktuellen Aktivitäten vorhanden",
          )
        }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useAdminSystemStore } from "@/stores/admin/system";
import { useAdminUsersStore } from "@/stores/admin/users";
import { useAdminFeedbackStore } from "@/stores/admin/feedback";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

// i18n
const { t } = useI18n();

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

// Computed
const systemStatusClass = computed(() => {
  const memoryUsage = systemStats.value.memory_usage_percent || 0;
  const cpuUsage = systemStats.value.cpu_usage_percent || 0;

  if (memoryUsage > 90 || cpuUsage > 90) {
    return "admin-dashboard__status-card--critical";
  } else if (memoryUsage > 70 || cpuUsage > 70) {
    return "admin-dashboard__status-card--warning";
  } else {
    return "admin-dashboard__status-card--normal";
  }
});

const systemStatusIcon = computed(() => {
  const memoryUsage = systemStats.value.memory_usage_percent || 0;
  const cpuUsage = systemStats.value.cpu_usage_percent || 0;

  if (memoryUsage > 90 || cpuUsage > 90) {
    return "fa-exclamation-triangle";
  } else if (memoryUsage > 70 || cpuUsage > 70) {
    return "fa-exclamation-circle";
  } else {
    return "fa-check-circle";
  }
});

const systemStatusText = computed(() => {
  const memoryUsage = systemStats.value.memory_usage_percent || 0;
  const cpuUsage = systemStats.value.cpu_usage_percent || 0;

  if (memoryUsage > 90 || cpuUsage > 90) {
    return t("admin.dashboard.systemStatusCritical", "Kritisch");
  } else if (memoryUsage > 70 || cpuUsage > 70) {
    return t("admin.dashboard.systemStatusWarning", "Warnung");
  } else {
    return t("admin.dashboard.systemStatusNormal", "Normal");
  }
});

const statsCards = computed(() => {
  return [
    {
      label: t("admin.dashboard.totalUsers", "Benutzer"),
      value: totalUsers.value || 0,
      icon: "fa-users",
      trend: 5, // Beispiel: 5% Wachstum
    },
    {
      label: t("admin.dashboard.totalSessions", "Sitzungen"),
      value: systemStats.value.total_sessions || 0,
      icon: "fa-comments",
      trend: 12, // Beispiel: 12% Wachstum
    },
    {
      label: t("admin.dashboard.totalMessages", "Nachrichten"),
      value: systemStats.value.total_messages || 0,
      icon: "fa-envelope",
      trend: 8, // Beispiel: 8% Wachstum
    },
    {
      label: t("admin.dashboard.positiveFeedback", "Positives Feedback"),
      value: `${feedbackStats.value.positive_percent || 0}%`,
      icon: "fa-thumbs-up",
      trend: -2, // Beispiel: 2% Rückgang
    },
    {
      label: t("admin.dashboard.avgResponseTime", "Durchschn. Antwortzeit"),
      value: `${systemStats.value.avg_response_time_ms || 0} ms`,
      icon: "fa-clock",
      trend: -5, // Beispiel: 5% Verbesserung (schneller)
    },
    {
      label: t("admin.dashboard.uptime", "Uptime"),
      value: `${systemStats.value.uptime_days || 0} ${t("admin.dashboard.days", "Tage")}`,
      icon: "fa-server",
      trend: 0, // Kein Trend
    },
  ];
});

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
    timestamp: Date.now() - 2 * 60 * 1000, // 2 Minuten zurück
  },
  {
    type: "settings",
    user: "admin",
    text: t(
      "admin.dashboard.activity.changedSettings",
      "hat Systemeinstellungen geändert",
    ),
    timestamp: Date.now() - 25 * 60 * 1000, // 25 Minuten zurück
  },
  {
    type: "user",
    user: "admin",
    text: t(
      "admin.dashboard.activity.addedUser",
      "hat einen neuen Benutzer hinzugefügt",
    ),
    timestamp: Date.now() - 3 * 60 * 60 * 1000, // 3 Stunden zurück
  },
  {
    type: "cache",
    user: "admin",
    text: t("admin.dashboard.activity.clearedCache", "hat den Cache geleert"),
    timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 Tag zurück
  },
]);

// Methods
function executeAction(actionId: string) {
  isLoading.value = true;

  // Implementiere die entsprechenden Aktionen
  switch (actionId) {
    case "clearCache":
      adminSystemStore
        .clearCache()
        .then(() => {
          // Erfolgsbenachrichtigung
          console.log("Cache geleert");
        })
        .catch((error) => {
          console.error("Fehler beim Leeren des Caches:", error);
        })
        .finally(() => {
          isLoading.value = false;
        });
      break;

    case "reloadMotd":
      adminSystemStore
        .reloadMotd()
        .then(() => {
          console.log("MOTD neu geladen");
        })
        .catch((error) => {
          console.error("Fehler beim Neuladen des MOTD:", error);
        })
        .finally(() => {
          isLoading.value = false;
        });
      break;

    case "exportStats":
      // Beispielimplementierung für Statistikexport
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
      isLoading.value = false;
      break;

    case "systemCheck":
      // Beispielimplementierung für Systemprüfung
      setTimeout(() => {
        console.log("Systemprüfung abgeschlossen");
        isLoading.value = false;
      }, 2000);
      break;

    default:
      console.warn(`Unbekannte Aktion: ${actionId}`);
      isLoading.value = false;
  }
}

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
</script>

<style scoped>
.admin-dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.admin-dashboard__title {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.admin-dashboard__status-card {
  display: flex;
  align-items: center;
  padding: 1.25rem;
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background-alt);
  box-shadow: var(--n-shadow-sm);
  border-left: 4px solid;
}

.admin-dashboard__status-card--normal {
  border-left-color: var(--n-color-success);
}

.admin-dashboard__status-card--warning {
  border-left-color: var(--n-color-warning);
}

.admin-dashboard__status-card--critical {
  border-left-color: var(--n-color-error);
}

.admin-dashboard__status-icon {
  font-size: 2rem;
  margin-right: 1rem;
}

.admin-dashboard__status-card--normal .admin-dashboard__status-icon {
  color: var(--n-color-success);
}

.admin-dashboard__status-card--warning .admin-dashboard__status-icon {
  color: var(--n-color-warning);
}

.admin-dashboard__status-card--critical .admin-dashboard__status-icon {
  color: var(--n-color-error);
}

.admin-dashboard__status-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.admin-dashboard__status-value {
  margin: 0.25rem 0 0 0;
  font-size: 1rem;
  color: var(--n-color-text-secondary);
}

.admin-dashboard__stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.admin-dashboard__stat-card {
  display: flex;
  align-items: flex-start;
  padding: 1.25rem;
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background-alt);
  box-shadow: var(--n-shadow-sm);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.admin-dashboard__stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--n-shadow-md);
}

.admin-dashboard__stat-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2.5rem;
  height: 2.5rem;
  margin-right: 1rem;
  border-radius: 50%;
  background-color: rgba(var(--n-color-primary-rgb), 0.1);
  color: var(--n-color-primary);
  font-size: 1.1rem;
}

.admin-dashboard__stat-content {
  flex: 1;
}

.admin-dashboard__stat-label {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--n-color-text-secondary);
}

.admin-dashboard__stat-value {
  margin: 0.25rem 0 0 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.admin-dashboard__stat-trend {
  margin: 0.25rem 0 0 0;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.admin-dashboard__stat-trend--up {
  color: var(--n-color-success);
}

.admin-dashboard__stat-trend--down {
  color: var(--n-color-error);
}

.admin-dashboard__section-title {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.admin-dashboard__actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.admin-dashboard__action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background-alt);
  border: 1px solid var(--n-color-border);
  color: var(--n-color-text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.admin-dashboard__action-button:hover {
  background-color: var(--n-color-hover);
  border-color: var(--n-color-primary);
}

.admin-dashboard__action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.admin-dashboard__action-button i {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: var(--n-color-primary);
}

.admin-dashboard__activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.admin-dashboard__activity-item {
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background-alt);
  border-left: 3px solid var(--n-color-primary);
}

.admin-dashboard__activity-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2rem;
  height: 2rem;
  margin-right: 0.75rem;
  border-radius: 50%;
  background-color: rgba(var(--n-color-primary-rgb), 0.1);
  color: var(--n-color-primary);
}

.admin-dashboard__activity-content {
  flex: 1;
}

.admin-dashboard__activity-text {
  margin: 0;
  font-size: 0.9rem;
  color: var(--n-color-text-primary);
}

.admin-dashboard__activity-user {
  font-weight: 600;
  margin-right: 0.25rem;
}

.admin-dashboard__activity-time {
  margin: 0.25rem 0 0 0;
  font-size: 0.8rem;
  color: var(--n-color-text-secondary);
}

.admin-dashboard__no-activity {
  text-align: center;
  padding: 2rem;
  color: var(--n-color-text-secondary);
  font-style: italic;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
}

/* Responsive Design */
@media (max-width: 768px) {
  .admin-dashboard__stats-grid,
  .admin-dashboard__actions-grid {
    grid-template-columns: repeat(auto-fill, minmax(100%, 1fr));
  }
}
</style>
