<template>
  <div class="auth-layout">
    <Header
      title="Digitale Akte Assistent"
      :fixed="false"
      :bordered="true"
      :elevated="false"
      size="medium"
      :showToggleButton="true"
      :showTitle="true"
      :showSearch="false"
      :showNotifications="false"
      :user="user"
      :showLogout="true"
      @toggle-sidebar="handleSidebarToggle"
      @logout="handleLogout"
    >
      <template #logo>
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
      </template>
    </Header>

    <div class="auth-content">
      <Sidebar
        :theme="effectiveTheme"
        :collapsed="uiStore.sidebarCollapsed"
        @navigate="handleNavigation"
        @logout="handleLogout"
      />

      <div class="content-area">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { useThemeStore } from "@/stores/theme";
import Header from "@/components/layout/Header-redesigned.vue";
import Sidebar from "@/components/layout/Sidebar-redesigned.vue";

const authStore = useAuthStore();
const uiStore = useUIStore();
const themeStore = useThemeStore();
const router = useRouter();

// Computed
const user = computed(() => authStore.user);
const effectiveTheme = computed(() => themeStore.effectiveTheme);

// Methods
const handleSidebarToggle = () => {
  uiStore.toggleSidebar();
};

const handleLogout = async () => {
  try {
    await authStore.logout();
    router.push("/login");
  } catch (error) {
    console.error("Logout error:", error);
  }
};

const handleNavigation = (itemId: string) => {
  switch (itemId) {
    case "chat":
      router.push("/chat");
      break;
    case "documents":
      router.push("/documents");
      break;
    case "settings":
      router.push("/settings");
      break;
    case "admin":
      router.push("/admin");
      break;
    case "help":
      router.push("/help");
      break;
  }
};

onMounted(() => {
  // Check authentication when layout mounts
  if (!authStore.isAuthenticated) {
    router.push("/login");
  }
});
</script>

<style scoped>
.auth-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--nscale-background);
}

.auth-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.content-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: var(--nscale-background);
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--nscale-primary);
}

.app-logo svg {
  width: 32px;
  height: 32px;
}

@media (max-width: 768px) {
  .auth-content {
    flex-direction: column;
  }
}
</style>
