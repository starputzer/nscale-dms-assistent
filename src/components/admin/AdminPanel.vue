<template>
  <div class="admin-panel" :class="[themeClass]" v-if="canAccessAdmin">
    <header class="admin-panel__header">
      <h1 class="admin-panel__title">
        {{ t("admin.title", "nscale DMS Assistent Administration") }}
      </h1>
      <div class="admin-panel__user-info">
        <span class="admin-panel__user-email">{{ currentUser?.email }}</span>
        <span
          class="admin-panel__role"
          :class="`admin-panel__role--${currentUser?.role}`"
        >
          {{ t(`admin.roles.${currentUser?.role}`, currentUser?.role) }}
        </span>
      </div>
    </header>

    <div class="admin-panel__main">
      <!-- Sidebar Navigation -->
      <aside class="admin-panel__sidebar">
        <nav class="admin-panel__nav">
          <button
            v-for="tab in availableTabs"
            :key="tab.id"
            class="admin-panel__nav-item"
            :class="{ 'admin-panel__nav-item--active': activeTab === tab.id }"
            :aria-current="activeTab === tab.id ? 'page' : undefined"
            @click="setActiveTab(tab.id)"
            :aria-label="tab.label"
          >
            <i
              :class="['admin-panel__nav-icon', tab.icon]"
              aria-hidden="true"
            ></i>
            <span class="admin-panel__nav-label">{{ tab.label }}</span>
          </button>
        </nav>

        <div class="admin-panel__sidebar-footer">
          <p class="admin-panel__version">
            {{ t("admin.version", "Version") }}: {{ appVersion }}
          </p>
          <button
            class="admin-panel__theme-toggle"
            @click="toggleTheme"
            :aria-label="
              isDarkMode
                ? t('admin.lightMode', 'Zum hellen Modus wechseln')
                : t('admin.darkMode', 'Zum dunklen Modus wechseln')
            "
          >
            <i
              :class="[
                'admin-panel__theme-icon',
                isDarkMode ? 'fas fa-sun' : 'fas fa-moon',
              ]"
              aria-hidden="true"
            ></i>
            <span>{{
              isDarkMode
                ? t("admin.lightMode", "Hell")
                : t("admin.darkMode", "Dunkel")
            }}</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="admin-panel__content">
        <Transition name="fade" mode="out-in">
          <div v-if="isLoading" class="admin-panel__loading">
            <div class="admin-panel__spinner"></div>
            <p>{{ t("admin.loading", "Lade Daten...") }}</p>
          </div>
          <component
            v-else-if="currentTabComponent"
            :is="currentTabComponent"
            @action="handleAction"
          ></component>
          <div v-else class="admin-panel__error">
            <p>{{ t("admin.tabNotFound", "Tab nicht gefunden") }}</p>
          </div>
        </Transition>
      </main>
    </div>

    <!-- Toast Notifications -->
    <Toast position="bottom-right" />

    <!-- Confirmation Dialog -->
    <Dialog />
  </div>
  <div v-else-if="isLoading" class="admin-panel__auth-loading">
    <div class="admin-panel__spinner"></div>
    <p>{{ t("admin.checkingPermissions", "Überprüfe Berechtigungen...") }}</p>
  </div>
  <div v-else class="admin-panel__no-access">
    <h2>{{ t("admin.noAccess.title", "Kein Zugriff") }}</h2>
    <p>
      {{
        t(
          "admin.noAccess.message",
          "Sie haben keine Berechtigung, auf den Admin-Bereich zuzugreifen.",
        )
      }}
    </p>
    <button class="admin-panel__back-button" @click="navigateToHome">
      {{ t("admin.noAccess.backToHome", "Zurück zur Startseite") }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, defineAsyncComponent } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

// Stores
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { useFeatureTogglesStore } from "@/stores/featureToggles";
import { useAdminUsersStore } from "@/stores/admin/users";
import { useAdminSystemStore } from "@/stores/admin/system";
import { useAdminFeedbackStore } from "@/stores/admin/feedback";
import { useAdminMotdStore } from "@/stores/admin/motd";

// Components
import { Toast, Dialog } from "@/components/ui";
import type { AdminTab } from "@/types/admin";

// Lazy-loaded Tab-Komponenten
const AdminDashboard = defineAsyncComponent(
  () => import("./tabs/AdminDashboard.vue"),
);
const AdminUsers = defineAsyncComponent(() => import("./tabs/AdminUsers.vue"));
const AdminFeedback = defineAsyncComponent(
  () => import("./tabs/AdminFeedback.enhanced.vue"),
);
const AdminMotd = defineAsyncComponent(() => import("./tabs/AdminMotd.enhanced.vue"));
const AdminSystem = defineAsyncComponent(
  () => import("./tabs/AdminSystem.enhanced.vue"),
);
const AdminStatistics = defineAsyncComponent(
  () => import("./tabs/AdminStatistics.vue"),
);
const AdminSystemSettings = defineAsyncComponent(
  () => import("./tabs/AdminSystemSettings.vue"),
);
const AdminFeatureToggles = defineAsyncComponent(
  () => import("./tabs/AdminFeatureToggles.enhanced.vue"),
);
const AdminLogViewer = defineAsyncComponent(
  () => import("./tabs/AdminLogViewerUpdated.vue"),
);

// i18n
const { t } = useI18n();

// Router
const router = useRouter();

// Stores
const authStore = useAuthStore();
const uiStore = useUIStore();
const featureTogglesStore = useFeatureTogglesStore();
const adminUsersStore = useAdminUsersStore();
const adminSystemStore = useAdminSystemStore();
const adminFeedbackStore = useAdminFeedbackStore();
const adminMotdStore = useAdminMotdStore();

// Reactive references from stores
const { currentUser, isAuthenticated } = storeToRefs(authStore);
const { isDarkMode, theme } = storeToRefs(uiStore);

// Local state
const isLoading = ref(true);
const activeTab = ref(localStorage.getItem("admin_active_tab") || "dashboard");
const appVersion = ref(import.meta.env.VITE_APP_VERSION || "1.0.0");

// Computed properties
const canAccessAdmin = computed(() => {
  if (!isAuthenticated.value) return false;
  return currentUser.value?.role === "admin";
});

const themeClass = computed(() => {
  return `theme-${theme.value}`;
});

// Tab definitions with permissions and feature flags
const allTabs = [
  {
    id: "dashboard",
    label: t("admin.tabs.dashboard", "Dashboard"),
    component: AdminDashboard,
    icon: "fas fa-tachometer-alt",
    requiredRole: "admin",
  },
  {
    id: "users",
    label: t("admin.tabs.users", "Benutzer"),
    component: AdminUsers,
    icon: "fas fa-users",
    requiredRole: "admin",
  },
  {
    id: "feedback",
    label: t("admin.tabs.feedback", "Feedback"),
    component: AdminFeedback,
    icon: "fas fa-comment",
    requiredRole: "admin",
  },
  {
    id: "motd",
    label: t("admin.tabs.motd", "Nachrichten"),
    component: AdminMotd,
    icon: "fas fa-bullhorn",
    requiredRole: "admin",
  },
  {
    id: "system",
    label: t("admin.tabs.system", "System"),
    component: AdminSystem,
    icon: "fas fa-cogs",
    requiredRole: "admin",
  },
  {
    id: "statistics",
    label: t("admin.tabs.statistics", "Statistiken"),
    component: AdminStatistics,
    icon: "fas fa-chart-line",
    requiredRole: "admin",
  },
  {
    id: "settings",
    label: t("admin.tabs.settings", "Einstellungen"),
    component: AdminSystemSettings,
    icon: "fas fa-sliders-h",
    requiredRole: "admin",
  },
  {
    id: "logs",
    label: t("admin.tabs.logs", "Protokolle"),
    component: AdminLogViewer,
    icon: "fas fa-clipboard-list",
    requiredRole: "admin",
  },
  {
    id: "featureToggles",
    label: t("admin.tabs.featureToggles", "Feature-Toggles"),
    component: AdminFeatureToggles,
    icon: "fas fa-toggle-on",
    requiredRole: "admin",
    featureFlag: "enableFeatureTogglesUi",
  },
];

// Filter tabs based on permissions and feature flags
const availableTabs = computed(() => {
  return allTabs.filter((tab) => {
    // Check role permissions
    if (tab.requiredRole && currentUser.value?.role !== tab.requiredRole) {
      return false;
    }

    // Check feature flags
    if (
      tab.featureFlag &&
      !featureTogglesStore.isFeatureEnabled(tab.featureFlag)
    ) {
      return false;
    }

    return true;
  });
});

// Get the current tab component
const currentTabComponent = computed(() => {
  const tab = availableTabs.value.find((t) => t.id === activeTab.value);
  return tab?.component || null;
});

// Methods
function setActiveTab(tabId: string) {
  if (availableTabs.value.some((tab) => tab.id === tabId)) {
    activeTab.value = tabId;
    localStorage.setItem("admin_active_tab", tabId);

    // Load data for the selected tab
    loadDataForTab(tabId);

    // Update URL if router is available
    if (router) {
      router.replace({
        query: { ...router.currentRoute.value.query, tab: tabId },
      });
    }
  }
}

function toggleTheme() {
  uiStore.toggleTheme();
}

function navigateToHome() {
  if (router) {
    router.push("/");
  } else {
    window.location.href = "/";
  }
}

function handleAction(action: string, payload?: any) {
  switch (action) {
    case "reload":
      loadDataForTab(activeTab.value);
      break;
    case "switchTab":
      if (typeof payload === "string") {
        setActiveTab(payload);
      }
      break;
    default:
      console.warn(`Unhandled action: ${action}`, payload);
  }
}

// Loading data based on active tab
async function loadDataForTab(tabId: string) {
  isLoading.value = true;

  try {
    switch (tabId) {
      case "dashboard":
        await Promise.all([
          adminSystemStore.fetchStats(),
          adminUsersStore.fetchUsers(),
          adminFeedbackStore.fetchStats(),
        ]);
        break;
      case "users":
        await adminUsersStore.fetchUsers();
        break;
      case "feedback":
        await Promise.all([
          adminFeedbackStore.fetchStats(),
          adminFeedbackStore.fetchNegativeFeedback(),
        ]);
        break;
      case "motd":
        await adminMotdStore.fetchConfig();
        break;
      case "system":
        await adminSystemStore.fetchStats();
        break;
      case "statistics":
        await adminSystemStore.fetchStats();
        break;
      case "logs":
        // Load logs data will be implemented in the component
        // No global store action needed at this point
        break;
      case "featureToggles":
        await featureTogglesStore.loadFeatureToggles();
        break;
    }
  } catch (error) {
    console.error(`Error loading data for tab ${tabId}:`, error);
  } finally {
    isLoading.value = false;
  }
}

// Check if URL contains a tab parameter
function checkUrlForTab() {
  if (router) {
    const tabParam = router.currentRoute.value.query.tab as string;
    if (tabParam && allTabs.some((tab) => tab.id === tabParam)) {
      activeTab.value = tabParam;
      localStorage.setItem("admin_active_tab", tabParam);
    }
  }
}

// Lifecycle hooks
onMounted(async () => {
  isLoading.value = true;

  // Check authentication and permissions
  if (!isAuthenticated.value) {
    await authStore.checkAuth();
  }

  // Check URL for active tab
  checkUrlForTab();

  // Load data for the active tab
  if (canAccessAdmin.value) {
    await loadDataForTab(activeTab.value);
  }

  isLoading.value = false;
});

// Watch for changes in authentication state
watch(canAccessAdmin, (newValue) => {
  if (newValue && activeTab.value) {
    loadDataForTab(activeTab.value);
  }
});
</script>

<style scoped>
.admin-panel {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  font-family: var(--n-font-family);
}

.admin-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
  border-bottom: 1px solid var(--n-color-border);
}

.admin-panel__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.admin-panel__user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.admin-panel__user-email {
  font-size: 0.9rem;
}

.admin-panel__role {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  background-color: rgba(255, 255, 255, 0.2);
}

.admin-panel__role--admin {
  background-color: rgba(var(--n-color-success-rgb), 0.2);
}

.admin-panel__main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.admin-panel__sidebar {
  width: 250px;
  background-color: var(--n-color-background-alt);
  border-right: 1px solid var(--n-color-border);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow-y: auto;
}

.admin-panel__nav {
  padding: 1rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.admin-panel__nav-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: var(--n-border-radius);
  cursor: pointer;
  background: transparent;
  border: none;
  color: var(--n-color-text-primary);
  text-align: left;
  transition: all 0.2s ease;
}

.admin-panel__nav-item:hover {
  background-color: var(--n-color-hover);
}

.admin-panel__nav-item--active {
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
}

.admin-panel__nav-icon {
  margin-right: 0.75rem;
  width: 1.25rem;
  text-align: center;
}

.admin-panel__sidebar-footer {
  padding: 1rem;
  border-top: 1px solid var(--n-color-border);
}

.admin-panel__version {
  font-size: 0.75rem;
  color: var(--n-color-text-secondary);
  margin-bottom: 0.75rem;
}

.admin-panel__theme-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem;
  background: transparent;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  color: var(--n-color-text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.admin-panel__theme-toggle:hover {
  background-color: var(--n-color-hover);
}

.admin-panel__content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  position: relative;
}

.admin-panel__loading,
.admin-panel__auth-loading {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  gap: 1rem;
  color: var(--n-color-text-secondary);
}

.admin-panel__spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(var(--n-color-primary-rgb, 0, 120, 212), 0.1);
  border-radius: 50%;
  border-top-color: var(--n-color-primary, #0078d4);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.admin-panel__error {
  padding: 2rem;
  text-align: center;
  color: var(--n-color-error);
}

.admin-panel__no-access {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  text-align: center;
  padding: 2rem;
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
}

.admin-panel__back-button {
  margin-top: 2rem;
  padding: 0.75rem 1.5rem;
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
  border: none;
  border-radius: var(--n-border-radius);
  cursor: pointer;
  transition: background-color 0.2s;
}

.admin-panel__back-button:hover {
  background-color: var(--n-color-primary-dark);
}

/* Animation Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .admin-panel__main {
    flex-direction: column;
  }

  .admin-panel__sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--n-color-border);
  }

  .admin-panel__nav {
    flex-direction: row;
    overflow-x: auto;
    padding: 0.5rem;
    gap: 0.25rem;
  }

  .admin-panel__nav-item {
    flex-direction: column;
    padding: 0.5rem;
    font-size: 0.75rem;
    text-align: center;
  }

  .admin-panel__nav-icon {
    margin-right: 0;
    margin-bottom: 0.25rem;
  }

  .admin-panel__sidebar-footer {
    display: none;
  }

  .admin-panel__content {
    padding: 1rem;
  }
}
</style>