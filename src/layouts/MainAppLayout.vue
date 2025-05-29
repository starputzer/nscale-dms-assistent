<template>
  <div class="main-app-layout" :data-theme="effectiveTheme">
    <!-- Header -->
    <header class="app-header">
      <div class="app-header-left">
        <div class="app-logo">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="2"
              stroke="currentColor"
              stroke-width="2"
            />
            <line
              x1="8"
              y1="8"
              x2="16"
              y2="8"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <line
              x1="8"
              y1="12"
              x2="16"
              y2="12"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <line
              x1="8"
              y1="16"
              x2="11"
              y2="16"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <h1 class="app-title">Digitale Akte Assistent</h1>
      </div>

      <div class="app-header-right">
        <!-- Close admin button removed - using the one from AdminPanel instead -->

        <div class="user-menu">
          <button class="user-menu-button" @click.stop="toggleUserMenu">
            <div class="user-avatar">
              <span>{{ userInitials }}</span>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <div v-if="showUserMenu" class="user-dropdown">
            <div class="user-info">
              <div class="user-name">
                {{ user?.displayName || user?.username || "Benutzer" }}
              </div>
              <div class="user-email">{{ user?.email || "" }}</div>
            </div>
            <div class="dropdown-divider"></div>
            <!-- Chat menu item - shown when in admin view -->
            <button
              v-if="currentView === 'admin'"
              class="dropdown-item"
              @click="goToChat"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                ></path>
              </svg>
              Chat
            </button>
            <!-- Admin menu item - only show for admin users -->
            <button v-if="isAdmin" class="dropdown-item" @click="handleAdmin">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M12 2L2 7v10c0 5.3 3.4 8.9 10 13c6.6-4.1 10-7.7 10-13V7L12 2z"
                ></path>
                <path d="M12 7v5"></path>
                <path d="M12 16h.01"></path>
              </svg>
              Administration
            </button>
            <button class="dropdown-item" @click="handleSettings">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6m11-11h-6m-6 0H1"></path>
              </svg>
              Einstellungen
            </button>
            <button class="dropdown-item" @click="handleLogout">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Abmelden
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <div class="app-content">
      <!-- Left Sidebar - Hide completely when in admin view -->
      <aside v-if="currentView !== 'admin'" class="app-sidebar">
        <!-- Navigation -->
        <nav class="sidebar-nav">
          <button
            class="nav-item"
            :class="{ active: currentView === 'chat' }"
            @click="navigateTo('chat')"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              ></path>
            </svg>
            <span>Chat</span>
          </button>

          <button
            class="nav-item"
            :class="{ active: currentView === 'help' }"
            @click="navigateTo('help')"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>Hilfe</span>
          </button>
        </nav>

        <!-- Conversation List -->
        <div class="conversation-list">
          <div class="conversation-header">
            <h3>Unterhaltungen</h3>
            <button class="new-chat-btn" @click="createNewChat">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Neue Unterhaltung</span>
            </button>
          </div>

          <div class="conversation-items">
            <div
              v-for="conversation in conversations"
              :key="conversation.id"
              class="conversation-item"
              :class="{ active: conversation.id === currentConversationId }"
              @click="selectConversation(conversation.id)"
            >
              <div class="conversation-content">
                <div class="conversation-title">{{ conversation.title }}</div>
                <div class="conversation-preview">
                  {{ conversation.preview }}
                </div>
              </div>
              <button
                class="delete-btn"
                @click.stop="deleteConversation(conversation.id)"
                title="Unterhaltung löschen"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path
                    d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                  ></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Panel -->
      <main
        class="app-main"
        :class="{ 'app-main--admin': currentView === 'admin' }"
      >
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useSessionsStore } from "@/stores/sessions";
import { useThemeStore } from "@/stores/theme";
import { useAdminStore } from "@/stores/admin";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const sessionsStore = useSessionsStore();
const themeStore = useThemeStore();
const adminStore = useAdminStore();

// State
const showUserMenu = ref(false);
const currentView = ref("chat");
const currentConversationId = ref<string | null>(null);

// Synchronize view with route
watch(
  () => route.path,
  (newPath) => {
    if (newPath.startsWith("/admin")) {
      currentView.value = "admin";
    } else if (newPath.startsWith("/chat")) {
      currentView.value = "chat";
      // Sync conversation ID from route params
      const id = route.params.id as string;
      if (id) {
        currentConversationId.value = id;
      }
    } else if (newPath.startsWith("/help")) {
      currentView.value = "help";
    }
  },
  { immediate: true },
);

// Sync with sessions store
watch(
  () => sessionsStore.currentSessionId,
  (newId) => {
    currentConversationId.value = newId;
  },
  { immediate: true },
);

// Computed
const user = computed(() => authStore.user);
const isAdmin = computed(() => authStore.isAdmin);
const userInitials = computed(() => {
  if (user.value?.displayName) {
    return user.value.displayName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (user.value?.email) {
    return user.value.email.substring(0, 2).toUpperCase();
  }
  return "B"; // Default Benutzer
});
const effectiveTheme = computed(() => themeStore.effectiveTheme);
const conversations = computed(() => sessionsStore.sessions);
const adminSection = computed(() => adminStore.currentSection);

// Methods
const toggleUserMenu = (event: MouseEvent) => {
  event.stopPropagation();
  showUserMenu.value = !showUserMenu.value;
  console.log("User menu toggled:", showUserMenu.value);
};

const handleAdmin = () => {
  showUserMenu.value = false;
  currentView.value = "admin";
  adminStore.setCurrentSection("dashboard");
  router.push("/admin/dashboard");
};

const handleSettings = () => {
  showUserMenu.value = false;
  router.push("/settings");
};

const handleLogout = async () => {
  console.log("Logout clicked");
  showUserMenu.value = false;

  try {
    // Call store logout which handles cleanup
    await authStore.logout();
  } catch (e) {
    console.error("Error during logout:", e);
  }

  // Use router push instead of window.location
  router.push("/login");
};

const navigateTo = (view: string) => {
  currentView.value = view;
  router.push(`/${view}`);
};

const navigateToAdmin = (section: string) => {
  currentView.value = "admin";
  adminStore.setCurrentSection(section as any);
  router.push(`/admin/${section}`);
};

const closeAdmin = () => {
  currentView.value = "chat";
  router.push("/chat");
};

const goToChat = () => {
  showUserMenu.value = false;
  currentView.value = "chat";
  router.push("/chat");
};

const createNewChat = async () => {
  const session = await sessionsStore.createSession();
  currentConversationId.value = session.id;
  router.push(`/chat/${session.id}`);
};

const selectConversation = async (id: string) => {
  // Prevent selecting the same conversation
  if (currentConversationId.value === id) return;
  
  // Update local state immediately
  currentConversationId.value = id;
  
  // Set session in store first
  await sessionsStore.setCurrentSession(id);
  
  // Then navigate to the route
  router.push(`/chat/${id}`);
};

const deleteConversation = async (id: string) => {
  const confirmed = window.confirm(
    "Möchten Sie diese Unterhaltung wirklich löschen?",
  );
  if (confirmed) {
    try {
      await sessionsStore.deleteSession(id);
      // If we deleted the current conversation, go to chat home
      if (currentConversationId.value === id) {
        currentConversationId.value = null;
        router.push("/chat");
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      alert("Fehler beim Löschen der Unterhaltung: " + error.message);
    }
  }
};

// Click outside handler
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest(".user-menu")) {
    showUserMenu.value = false;
  }
};

// Lifecycle
onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  // Load conversations
  sessionsStore.synchronizeSessions();
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
.main-app-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--nscale-background);
  color: var(--nscale-text);
}

/* Header */
.app-header {
  height: 64px;
  background: var(--nscale-surface);
  border-bottom: 1px solid var(--nscale-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.app-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-logo {
  color: var(--nscale-primary);
}

.app-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--nscale-text);
}

.app-header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Close admin button removed - using the one from AdminPanel instead */

.user-menu {
  position: relative;
}

.user-menu-button {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background 0.2s;
}

.user-menu-button:hover {
  background: var(--nscale-button-hover);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--nscale-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--nscale-surface, white);
  border: 1px solid var(--nscale-border, #e5e5e5);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 240px;
  overflow: hidden;
  z-index: 9999;
}

.user-info {
  padding: 16px;
}

.user-name {
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--nscale-text);
}

.user-email {
  font-size: 14px;
  color: var(--nscale-text-secondary);
}

.dropdown-divider {
  height: 1px;
  background: var(--nscale-border);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
  color: var(--nscale-text);
}

.dropdown-item:hover {
  background: var(--nscale-button-hover);
}

/* Content Area */
.app-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar */
.app-sidebar {
  width: 260px;
  background: var(--nscale-surface);
  border-right: 1px solid var(--nscale-border);
  display: flex;
  flex-direction: column;
}

.sidebar-nav {
  padding: 16px 8px;
  border-bottom: 1px solid var(--nscale-border);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  color: var(--nscale-text-secondary);
  margin-bottom: 4px;
}

.nav-item:hover {
  background: var(--nscale-button-hover);
  color: var(--nscale-text);
}

.nav-item.active {
  background: var(--nscale-primary-light);
  color: var(--nscale-primary);
}

/* Admin Navigation */
.admin-nav {
  margin-top: 24px;
  border-top: 1px solid var(--nscale-border);
  padding-top: 16px;
}

.nav-section-header {
  padding: 8px 16px;
  margin-bottom: 8px;
}

.nav-section-header h3 {
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--nscale-text-secondary);
  margin: 0;
}

.conversation-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.conversation-header {
  padding: 16px;
  border-bottom: 1px solid var(--nscale-border);
}

.conversation-header h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: var(--nscale-text-secondary);
}

.new-chat-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  border: 1px solid var(--nscale-border);
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  color: var(--nscale-primary);
}

.new-chat-btn:hover {
  background: var(--nscale-primary-light);
}

.conversation-items {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.conversation-item {
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.conversation-content {
  flex: 1;
  min-width: 0;
}

.conversation-item:hover {
  background: var(--nscale-button-hover);
}

.conversation-item.active {
  background: var(--nscale-primary-light);
}

.conversation-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.conversation-preview {
  font-size: 14px;
  color: var(--nscale-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: var(--nscale-text-secondary);
  opacity: 0;
  transition: all 0.2s;
}

.conversation-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: var(--nscale-danger-light, #fee);
  color: var(--nscale-danger, #dc3545);
}

/* Main Panel */
.app-main {
  flex: 1;
  overflow: auto;
  background: var(--nscale-background);
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* When in admin view, use full width */
.app-main--admin {
  width: 100%;
}
</style>
