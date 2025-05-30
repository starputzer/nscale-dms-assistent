<template>
  <div class="admin-panel" :class="[themeClass]" v-if="canAccessAdmin">
    <header class="admin-panel__header">
      <h1 class="admin-panel__title">
        {{ t("admin.title", "nscale DMS Assistent Administration") }}
      </h1>

      <!-- Improved close button -->
      <button
        class="admin-panel__close-button"
        @click="navigateToHome"
        aria-label="Administration schließen"
      >
        <i class="fas fa-times"></i>
        <span class="button-text">Schließen</span>
      </button>
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
            :data-tab-id="tab.id"
          >
            <i
              :class="['admin-panel__nav-icon', tab.icon]"
              aria-hidden="true"
            ></i>
            <span class="admin-panel__nav-label">{{
              tab.label || tab.id
            }}</span>
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
                ? "Hell"
                : "Dunkel"
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
          <div v-else-if="error" class="admin-panel__error">
            <div class="error-icon">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>{{ t("admin.error.title", "Ein Fehler ist aufgetreten") }}</h3>
            <p>{{ error }}</p>
            <button class="btn btn-primary" @click="window.location.reload()">
              {{ t("admin.error.refresh", "Seite neu laden") }}
            </button>
          </div>
          <div v-else-if="currentTabComponent" class="admin-tab-container">
            <component
              :is="currentTabComponent"
              @action="handleAction"
            ></component>
          </div>
          <div v-else class="admin-panel__error">
            <p>{{ t("admin.tabNotFound", "Tab nicht gefunden") }}</p>
          </div>
        </Transition>
      </main>
    </div>
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
import {
  ref,
  computed,
  watch,
  onMounted,
  shallowRef,
  defineProps,
  defineEmits,
} from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

// Stores with safe imports
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { useFeatureTogglesStore } from "@/stores/featureToggles";
import { useDocumentConverterStore } from "@/stores/documentConverter";

// Nicht mehr notwendig, da wir immer echte Daten verwenden
// import API_FLAGS from "@/config/api-flags";

// Admin stores
let useAdminUsersStore;
let useAdminSystemStore;
let useAdminFeedbackStore;
let useAdminMotdStore;

// Dynamically import admin stores to avoid dependency issues
try {
  import("@/stores/admin/users")
    .then((module) => {
      useAdminUsersStore = module.useAdminUsersStore;
      console.log("[AdminPanel] Successfully imported admin users store");
    })
    .catch((err) => {
      console.error("[AdminPanel] Failed to import admin users store:", err);
      useAdminUsersStore = () => ({ users: [], loading: false });
    });

  import("@/stores/admin/system")
    .then((module) => {
      useAdminSystemStore = module.useAdminSystemStore;
      console.log("[AdminPanel] Successfully imported admin system store");
    })
    .catch((err) => {
      console.error("[AdminPanel] Failed to import admin system store:", err);
      useAdminSystemStore = () => ({ systemInfo: {}, loading: false });
    });

  import("@/stores/admin/feedback")
    .then((module) => {
      useAdminFeedbackStore = module.useAdminFeedbackStore;
      console.log("[AdminPanel] Successfully imported admin feedback store");
    })
    .catch((err) => {
      console.error("[AdminPanel] Failed to import admin feedback store:", err);
      useAdminFeedbackStore = () => ({ feedbackItems: [], loading: false });
    });

  import("@/stores/admin/motd")
    .then((module) => {
      useAdminMotdStore = module.useAdminMotdStore;
      console.log("[AdminPanel] Successfully imported admin motd store");
    })
    .catch((err) => {
      console.error("[AdminPanel] Failed to import admin motd store:", err);
      useAdminMotdStore = () => ({ messages: [], loading: false });
    });
} catch (error) {
  console.error("[AdminPanel] Error importing admin stores:", error);
}

// Define props
const props = defineProps({
  forceTab: {
    type: String,
    default: null,
  },
});

// Define emits
const emit = defineEmits(["auth-error"]);

// i18n
const { t } = useI18n();

// Router
const router = useRouter();

// Core stores that are always available
const authStore = useAuthStore();
const uiStore = useUIStore();
const featureTogglesStore = useFeatureTogglesStore();
const documentConverterStore = useDocumentConverterStore();

// Admin stores with safe initialization
const adminUsersStore = ref(null);
const adminSystemStore = ref(null);
const adminFeedbackStore = ref(null);
const adminMotdStore = ref(null);

// Initialize stores safely when they become available
function initializeAdminStores() {
  try {
    if (typeof useAdminUsersStore === "function") {
      adminUsersStore.value = useAdminUsersStore();
      console.log("[AdminPanel] Users store initialized");
    }

    if (typeof useAdminSystemStore === "function") {
      adminSystemStore.value = useAdminSystemStore();
      console.log("[AdminPanel] System store initialized");
    }

    if (typeof useAdminFeedbackStore === "function") {
      adminFeedbackStore.value = useAdminFeedbackStore();
      console.log("[AdminPanel] Feedback store initialized");
    }

    if (typeof useAdminMotdStore === "function") {
      adminMotdStore.value = useAdminMotdStore();
      console.log("[AdminPanel] MOTD store initialized");
    }
  } catch (error) {
    console.error("[AdminPanel] Error initializing admin stores:", error);
  }
}

// Reactive references from stores (with safe access)
const currentUser = computed(() => {
  if (authStore && "currentUser" in authStore) {
    return authStore.currentUser;
  }
  return null;
});

const isAuthenticated = computed(() => {
  if (authStore && "isAuthenticated" in authStore) {
    return authStore.isAuthenticated;
  }
  return true; // Default to true for development
});

const isDarkMode = computed(() => {
  if (uiStore && "isDarkMode" in uiStore) {
    return uiStore.isDarkMode;
  }
  return false;
});

const theme = computed(() => {
  if (uiStore && "theme" in uiStore) {
    return uiStore.theme;
  }
  return "light";
});

// Local state
const isLoading = ref(true);
const error = ref<string | null>(null);
const activeTabState = ref(
  localStorage.getItem("admin_active_tab") || "dashboard",
);
const appVersion = ref(import.meta.env.VITE_APP_VERSION || "1.0.0");
// Immer auf true gesetzt, um die API-Integration in allen Umgebungen zu zeigen
const useRealApiGlobal = ref(true);

// Use forceTab prop if provided, otherwise use activeTabState
const activeTab = computed(() => {
  if (props.forceTab) {
    // When forceTab is provided, sync it to activeTabState
    if (props.forceTab !== activeTabState.value) {
      activeTabState.value = props.forceTab;
    }
    return props.forceTab;
  }

  return activeTabState.value || "dashboard";
});

// Computed properties
const canAccessAdmin = computed(() => {
  // For development, allow access
  return true;
});

const themeClass = computed(() => {
  return `theme-${theme.value || "light"}`;
});

// Simplified tab definitions - use computed to ensure i18n is ready
const allTabs = computed(() => [
  {
    id: "dashboard",
    label: t("admin.tabs.dashboard", "Dashboard"),
    icon: "fas fa-tachometer-alt",
  },
  {
    id: "users",
    label: t("admin.tabs.users", "Benutzer"),
    icon: "fas fa-users",
  },
  {
    id: "feedback",
    label: t("admin.tabs.feedback", "Feedback"),
    icon: "fas fa-comment",
  },
  {
    id: "motd",
    label: t("admin.tabs.motd", "Nachrichten"),
    icon: "fas fa-bullhorn",
  },
  {
    id: "docConverter",
    label: t("admin.tabs.docConverter", "Dokumentenkonverter"),
    icon: "fas fa-file-alt",
  },
  {
    id: "system",
    label: t("admin.tabs.system", "System"),
    icon: "fas fa-cogs",
  },
  {
    id: "statistics",
    label: t("admin.tabs.statistics", "Statistiken"),
    icon: "fas fa-chart-line",
  },
  {
    id: "settings",
    label: t("admin.tabs.settings", "Einstellungen"),
    icon: "fas fa-sliders-h",
  },
  {
    id: "logs",
    label: t("admin.tabs.logs", "Protokolle"),
    icon: "fas fa-clipboard-list",
  },
  {
    id: "featureToggles",
    label: t("admin.tabs.featureToggles", "Feature-Toggles"),
    icon: "fas fa-toggle-on",
  },
]);

// In simplified version, all tabs are available
const availableTabs = computed(() => allTabs.value);

// Current tab component (using dynamic import for safety)
const currentTabComponent = shallowRef(null);

// Watch for activeTab changes to load the appropriate component
watch(activeTab, async (newTab) => {
  if (newTab) {
    await loadTabComponent(newTab);
  }
});

// Methods
async function setActiveTab(tabId) {
  if (availableTabs.value.some((tab) => tab.id === tabId)) {
    // Don't do navigation if we're controlled by forceTab prop
    if (props.forceTab) {
      // When controlled by prop, just update URL without reloading
      if (router) {
        const adminPath = `/admin/${tabId}`;
        // Use replace to avoid adding to history
        if (router.currentRoute.value.path !== adminPath) {
          router.replace(adminPath).catch((err) => {
            console.error("[AdminPanel] Navigation error:", err);
          });
        }
      }
    } else {
      // When not controlled by prop, update local state
      activeTabState.value = tabId;
      localStorage.setItem("admin_active_tab", tabId);
    }

    // Always load the tab component
    await loadTabComponent(tabId);
  }
}

function toggleTheme() {
  if (uiStore && typeof uiStore.toggleTheme === "function") {
    uiStore.toggleTheme();
  }
}

function navigateToHome() {
  if (router) {
    router.push("/");
  } else {
    window.location.href = "/";
  }
}

function handleAction(action, payload) {
  switch (action) {
    case "reload":
      loadTabComponent(activeTab.value);
      break;
    case "switchTab":
      if (typeof payload === "string") {
        setActiveTab(payload);
      }
      break;
    case "auth-error":
      emit("auth-error", payload);
      break;
    default:
      console.warn(`Unhandled action: ${action}`, payload);
  }
}

// Safely load a tab component
async function loadTabComponent(tabId) {
  isLoading.value = true;
  error.value = null;

  try {
    // Map tab ID to enhanced component path
    const componentMap = {
      dashboard: () => import("@/components/admin/tabs/AdminDashboard.vue"),
      users: () => import("@/components/admin/tabs/AdminUsers.enhanced.vue"),
      feedback: () =>
        import("@/components/admin/tabs/AdminFeedback.enhanced.vue"),
      motd: () => import("@/components/admin/tabs/AdminMotd.enhanced.vue"),
      docConverter: () =>
        import("@/components/admin/tabs/AdminDocConverter.vue"),
      system: () => import("@/components/admin/tabs/AdminSystem.enhanced.vue"),
      statistics: () => import("@/components/admin/tabs/AdminStatistics.vue"),
      settings: () => import("@/components/admin/tabs/AdminSystemSettings.vue"),
      logs: () => import("@/components/admin/tabs/AdminLogViewerUpdated.vue"),
      featureToggles: () =>
        import("@/components/admin/tabs/AdminFeatureToggles.enhanced.vue"),
    };

    if (componentMap[tabId]) {
      const module = await componentMap[tabId]();
      currentTabComponent.value = module.default;
    } else {
      error.value = t("admin.tabNotFound", "Tab nicht gefunden");
    }
  } catch (err) {
    console.error(`Error loading tab component for ${tabId}:`, err);
    error.value = t("admin.tabLoadError", "Fehler beim Laden des Tabs");
  } finally {
    isLoading.value = false;
  }
}

// Lifecycle hooks
onMounted(() => {
  // Wrap the initialization in a try-catch block to handle any potential errors
  const initializePanel = async () => {
    try {
      isLoading.value = true;
      console.log(
        "[AdminPanel] Initializing admin panel, active tab:",
        activeTab.value,
      );

      // Initialize admin stores when dynamic imports complete
      setTimeout(() => {
        initializeAdminStores();
      }, 1000);

      // Make sure documentConverterStore is properly initialized
      if (
        documentConverterStore &&
        typeof documentConverterStore.initialize === "function"
      ) {
        await documentConverterStore.initialize();
        console.log("[AdminPanel] Document converter store initialized");
      } else {
        console.warn(
          "[AdminPanel] Document converter store initialize method not found",
        );
      }

      // Initial tab loading
      await loadTabComponent(activeTab.value);
    } catch (err) {
      console.error("[AdminPanel] Error initializing admin panel:", err);
      error.value = t("admin.initError", "Fehler bei der Initialisierung des Admin-Panels");
    } finally {
      isLoading.value = false;
    }
  };

  // Start the initialization process
  initializePanel();
});
</script>

<style scoped>
.admin-panel {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--n-color-background, #f8f8f8);
  color: var(--n-color-text-primary, #333);
  font-family: var(--n-font-family, Arial, sans-serif);
}

.admin-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.75rem;
  background: linear-gradient(
    to right,
    var(--admin-primary, #00a550),
    var(--admin-primary-dark, #008542)
  );
  color: white;
  position: relative;
  box-shadow: var(--admin-shadow, 0 2px 4px rgba(0, 0, 0, 0.1));
  z-index: 5;
}

.admin-panel__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.admin-panel__user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.admin-panel__close-button {
  position: absolute;
  right: 1.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  height: 40px;
  padding: 0 16px 0 14px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.admin-panel__close-button i {
  margin-right: 8px;
}

.admin-panel__close-button .button-text {
  font-weight: 500;
}

.admin-panel__close-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-50%) scale(1.05);
}

.admin-panel__close-button:active {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-50%) scale(0.98);
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
  background-color: rgba(0, 255, 0, 0.2);
}

.admin-panel__main {
  display: flex;
  flex: 1;
  overflow: hidden;
  background-color: var(--admin-bg-alt, #f9fafb);
}

.admin-panel__sidebar {
  width: 280px;
  background-color: var(--admin-bg, #ffffff);
  border-right: 1px solid var(--admin-border, #e5e7eb);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow-y: auto;
  box-shadow: var(--admin-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
  z-index: 4;
}

.admin-panel__nav {
  padding: 1.25rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.admin-panel__nav-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.25rem;
  margin: 0.25rem 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  background: transparent;
  border: none;
  color: var(--admin-text, #333333);
  text-align: left;
  transition: all 0.15s ease;
  font-weight: 500;
}

.admin-panel__nav-item:hover {
  background-color: var(--admin-bg-hover, #f5f7fa);
  transform: translateX(2px);
}

.admin-panel__nav-item--active {
  background-color: var(--admin-primary-light, #e6f7ef);
  color: var(--admin-primary, #00a550);
  border-left: 3px solid var(--admin-primary, #00a550);
  padding-left: calc(1.25rem - 3px);
}

.admin-panel__nav-item--active:hover {
  transform: none;
}

.admin-panel__nav-icon {
  margin-right: 0.75rem;
  width: 1.25rem;
  text-align: center;
  color: inherit;
  opacity: 0.8;
}

.admin-panel__sidebar-footer {
  padding: 1rem;
  border-top: 1px solid var(--n-color-border, #eaeaea);
}

.admin-panel__version {
  font-size: 0.75rem;
  color: var(--n-color-text-secondary, #666);
  margin-bottom: 0.75rem;
}

.admin-panel__theme-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem;
  background: transparent;
  border: 1px solid var(--n-color-border, #eaeaea);
  border-radius: 4px;
  color: var(--n-color-text-primary, #333);
  cursor: pointer;
  transition: all 0.2s ease;
}

.admin-panel__theme-toggle:hover {
  background-color: var(--n-color-hover, #e6e6e6);
}

.admin-panel__content {
  flex: 1;
  padding: 1.75rem 2rem;
  overflow-y: auto;
  position: relative;
  background-color: var(--admin-bg-alt, #f9fafb);
}

.admin-tab-container {
  max-width: 1200px;
  margin: 0 auto;
}

.admin-panel__loading,
.admin-panel__auth-loading {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  gap: 1rem;
  color: var(--n-color-text-secondary, #666);
}

.admin-panel__spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(0, 120, 212, 0.1);
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
  color: var(--n-color-error, #d13438);
}

.error-icon {
  font-size: 48px;
  margin-bottom: 1rem;
}

.admin-panel__no-access {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  text-align: center;
  padding: 2rem;
  background-color: var(--n-color-background, #f8f8f8);
  color: var(--n-color-text-primary, #333);
}

.admin-panel__back-button {
  margin-top: 2rem;
  padding: 0.75rem 1.5rem;
  background-color: var(--n-color-primary, #0078d4);
  color: var(--n-color-on-primary, #fff);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.admin-panel__back-button:hover {
  background-color: var(--n-color-primary-dark, #005a9e);
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-primary {
  background-color: var(--n-color-primary, #0078d4);
  color: var(--n-color-on-primary, #fff);
}

.btn-primary:hover {
  background-color: var(--n-color-primary-dark, #005a9e);
}

/* Admin info banner */
.admin-info-banner {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  margin-bottom: 20px;
  background-color: #e6f7ef;
  border-left: 4px solid #00a550;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.admin-info-banner i {
  font-size: 24px;
  color: #00a550;
  margin-right: 15px;
  flex-shrink: 0;
}

.admin-info-banner strong {
  font-weight: 600;
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
    border-bottom: 1px solid var(--n-color-border, #eaeaea);
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
