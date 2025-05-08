<template>
  <header class="nscale-header">
    <div class="header-container">
      <div class="header-logo">
        <img src="@/assets/images/senmvku-logo.png" alt="nscale DMS" class="logo-image">
        <h1 class="logo-text">nscale DMS Assistent</h1>
      </div>
      
      <div class="header-actions">
        <button 
          class="action-button new-chat-btn" 
          @click="createNewSession"
          title="Neue Unterhaltung"
        >
          <i class="fas fa-plus-circle"></i>
          <span class="button-text">Neue Unterhaltung</span>
        </button>
        
        <button 
          v-if="isAdmin"
          class="action-button admin-btn" 
          @click="navigateToAdmin"
          title="Administration"
        >
          <i class="fas fa-cog"></i>
          <span class="button-text">Administration</span>
        </button>
        
        <div class="settings-dropdown">
          <button 
            class="action-button settings-btn"
            @click="toggleSettingsMenu"
            title="Einstellungen"
          >
            <i class="fas fa-ellipsis-v"></i>
          </button>
          
          <div v-if="showSettingsMenu" class="settings-menu">
            <button 
              class="settings-item theme-toggle"
              @click="toggleTheme"
            >
              <i :class="isDarkTheme ? 'fas fa-sun' : 'fas fa-moon'"></i>
              {{ isDarkTheme ? 'Helles Design' : 'Dunkles Design' }}
            </button>
            
            <button 
              class="settings-item"
              @click="navigateToSettings"
            >
              <i class="fas fa-sliders-h"></i>
              Einstellungen
            </button>
            
            <button 
              class="settings-item logout-btn"
              @click="logout"
            >
              <i class="fas fa-sign-out-alt"></i>
              Abmelden
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { useSettings } from '@/composables/useSettings';

const store = useStore();
const router = useRouter();
const { logout: authLogout } = useAuth();
const { toggleTheme } = useSettings();

const isDarkTheme = inject('isDarkTheme') as unknown as boolean;

const showSettingsMenu = ref(false);
const isAdmin = computed(() => store.getters['auth/isAdmin']);

function toggleSettingsMenu() {
  showSettingsMenu.value = !showSettingsMenu.value;
}

function createNewSession() {
  store.dispatch('sessions/createSession');
}

function navigateToAdmin() {
  router.push('/admin');
}

function navigateToSettings() {
  router.push('/settings');
  showSettingsMenu.value = false;
}

async function logout() {
  await authLogout();
  router.push('/login');
}

// Close settings menu when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.settings-dropdown') && showSettingsMenu.value) {
    showSettingsMenu.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.nscale-header {
  background-color: var(--nscale-header-bg);
  border-bottom: 1px solid var(--nscale-border);
  padding: 0.75rem 1.5rem;
  height: 64px;
  display: flex;
  align-items: center;
  position: relative;
  z-index: 10;
}

.header-container {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-logo {
  display: flex;
  align-items: center;
}

.logo-image {
  height: 32px;
  margin-right: 12px;
}

.logo-text {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--nscale-text);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--nscale-text);
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.action-button:hover {
  background-color: var(--nscale-gray);
}

.new-chat-btn i, .admin-btn i {
  margin-right: 8px;
}

.settings-dropdown {
  position: relative;
}

.settings-menu {
  position: absolute;
  top: 100%;
  right: 0;
  width: 200px;
  background-color: var(--nscale-card-bg);
  border: 1px solid var(--nscale-border);
  border-radius: 4px;
  box-shadow: var(--nscale-shadow);
  margin-top: 8px;
  z-index: 100;
}

.settings-item {
  display: flex;
  align-items: center;
  width: 100%;
  text-align: left;
  padding: 10px 16px;
  background: none;
  border: none;
  color: var(--nscale-text);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.settings-item:hover {
  background-color: var(--nscale-gray);
}

.settings-item i {
  width: 20px;
  margin-right: 12px;
}

.logout-btn {
  color: #e53e3e;
  border-top: 1px solid var(--nscale-border);
}

@media (max-width: 768px) {
  .button-text {
    display: none;
  }
  
  .logo-text {
    display: none;
  }
  
  .header-logo {
    flex: 1;
    justify-content: center;
  }
  
  .nscale-header {
    padding: 0.75rem;
  }
}
</style>