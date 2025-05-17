<!--
Digitale Akte Assistent - Hauptkomponente
Inspiriert vom Claude UI-Design
-->
<template>
  <div class="app-container" :data-theme="effectiveTheme">
    <!-- Guest Layout for Login/Register/Password Reset -->
    <div v-if="isGuestRoute" class="guest-layout">
      <router-view />
    </div>
    
    <!-- Main Layout with Header and Sidebar for authenticated routes -->
    <MainLayout v-else>
      <template #header>
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
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <line x1="8" y1="16" x2="11" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
          </template>
        </Header>
      </template>

      <template #sidebar>
        <Sidebar 
          :theme="effectiveTheme"
          :collapsed="uiStore.sidebarCollapsed"
          @navigate="handleNavigation"
          @logout="handleLogout"
        />
      </template>

      <template #default>
        <router-view />
      </template>
    </MainLayout>

    <!-- Settings Modal -->
    <SettingsModal 
      v-if="showSettings"
      @close="showSettings = false"
    />

    <!-- Admin Panel Modal -->
    <AdminPanel 
      v-if="showAdminPanel"
      @close="showAdminPanel = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useThemeStore } from '@/stores/theme'
import MainLayout from '@/components/layout/MainLayout.vue'
import Header from '@/components/layout/Header-redesigned.vue'
import Sidebar from '@/components/layout/Sidebar-redesigned.vue'
import SettingsModal from '@/components/settings/SettingsModal.vue'
import AdminPanel from '@/components/admin/AdminPanel-redesigned.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUIStore()
const themeStore = useThemeStore()

// State
const showSettings = ref(false)
const showAdminPanel = ref(false)

// Computed
const user = computed(() => authStore.user)
const hasAdminAccess = computed(() => authStore.hasRole('admin'))
const effectiveTheme = computed(() => themeStore.effectiveTheme)

// Check if current route is a guest route
const isGuestRoute = computed(() => {
  const guestPaths = ['/login', '/register', '/forgot-password', '/reset-password']
  return guestPaths.some(path => route.path.startsWith(path))
})

// Methods
const handleSidebarToggle = () => {
  uiStore.toggleSidebar()
}

const handleLogout = async () => {
  try {
    await authStore.logout()
    router.push('/login')
  } catch (error) {
    console.error('Logout error:', error)
  }
}

const handleSettings = () => {
  showSettings.value = true
}

const handleAdminAccess = () => {
  showAdminPanel.value = true
}

const handleNavigation = (itemId: string) => {
  switch (itemId) {
    case 'chat':
      router.push('/chat')
      break
    case 'documents':
      router.push('/documents')
      break
    case 'settings':
      showSettings.value = true
      break
    case 'admin':
      showAdminPanel.value = true
      break
    case 'help':
      router.push('/help')
      break
  }
}

// Lifecycle
onMounted(() => {
  // Initialize app
  console.log('Digitale Akte Assistent loaded')
})
</script>

<style scoped>
.app-container {
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background: var(--background);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text);
}

.app-logo svg {
  width: 32px;
  height: 32px;
}

.guest-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--background);
  padding: 20px;
}


/* Theme variables */
:root {
  /* Light theme */
  --background: #ffffff;
  --surface: #f9fafb;
  --border: #e5e5e5;
  --text: #111111;
  --text-secondary: #666666;
  --text-muted: #999999;
  --button-hover: rgba(0, 0, 0, 0.05);
  --primary: #0066cc;
  --primary-hover: #0052a3;
}

.theme-dark {
  --background: #1a1a1a;
  --surface: #242424;
  --border: #3a3a3a;
  --text: #ffffff;
  --text-secondary: #999999;
  --text-muted: #666666;
  --button-hover: rgba(255, 255, 255, 0.05);
  --primary: #4da3ff;
  --primary-hover: #66b3ff;
}
</style>