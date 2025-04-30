<!-- layouts/DefaultLayout.vue -->
<template>
  <div class="layout-default">
    <!-- Header -->
    <header class="nscale-header shadow-sm">
      <div class="container mx-auto px-4 py-3 flex justify-between items-center">
        <div class="flex items-center">
          <img src="@/assets/images/senmvku-logo.png" alt="Berlin Logo" class="h-12 mr-4">
          <router-link to="/" class="nscale-logo">nscale DMS Assistent</router-link>
        </div>
        
        <!-- Navigation -->
        <nav class="flex items-center gap-4">
          <router-link 
            to="/chat" 
            class="nav-link" 
            :class="{ 'active': isActiveRoute('/chat') }"
            title="Chat"
          >
            <font-awesome-icon icon="comment" class="mr-2" />
            <span class="hidden md:inline">Chat</span>
          </router-link>
          
          <router-link 
            to="/doc-converter" 
            class="nav-link" 
            :class="{ 'active': isActiveRoute('/doc-converter') }"
            title="Dokumentkonverter"
          >
            <font-awesome-icon icon="file-alt" class="mr-2" />
            <span class="hidden md:inline">Dokumentkonverter</span>
          </router-link>
          
          <router-link 
            v-if="isAdmin"
            to="/admin" 
            class="nav-link" 
            :class="{ 'active': isActiveRoute('/admin') }"
            title="Administration"
          >
            <font-awesome-icon icon="cog" class="mr-2" />
            <span class="hidden md:inline">Administration</span>
          </router-link>
          
          <div class="user-menu relative">
            <button 
              @click="toggleUserMenu" 
              class="user-menu-button flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 transition-colors"
              :class="{ 'active': showUserMenu }"
            >
              <font-awesome-icon icon="user" />
              <span class="hidden md:inline">{{ userEmail }}</span>
              <font-awesome-icon 
                :icon="showUserMenu ? 'chevron-up' : 'chevron-down'" 
                class="text-xs opacity-70"
              />
            </button>
            
            <!-- Benutzermenü Dropdown -->
            <div v-if="showUserMenu" class="user-dropdown">
              <div class="user-dropdown-header">
                <span class="user-email">{{ userEmail }}</span>
                <span class="user-role">{{ userRoleLabel }}</span>
              </div>
              
              <div class="user-dropdown-content">
                <router-link to="/settings" class="dropdown-item">
                  <font-awesome-icon icon="cog" class="mr-2" />
                  Einstellungen
                </router-link>
                
                <button @click="logout" class="dropdown-item text-red-600">
                  <font-awesome-icon icon="sign-out-alt" class="mr-2" />
                  Abmelden
                </button>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </header>
    
    <!-- MOTD Banner -->
    <div 
      v-if="motd && motd.enabled && !motdDismissed" 
      class="motd-banner"
      :style="{
        backgroundColor: motd.style.backgroundColor,
        borderColor: motd.style.borderColor,
        color: motd.style.textColor,
        borderTop: '1px solid ' + motd.style.borderColor,
        borderBottom: '1px solid ' + motd.style.borderColor
      }"
    >
      <div class="container mx-auto px-4 py-3 relative">
        <button 
          v-if="motd.display.dismissible" 
          @click="dismissMotd" 
          class="absolute top-2 right-4 font-bold"
          :style="{ color: motd.style.textColor }"
        >
          ×
        </button>
        <div v-html="formatMotdContent(motd.content)" class="motd-content"></div>
      </div>
    </div>
    
    <!-- Hauptinhalt -->
    <main class="flex-1 container mx-auto px-4 py-6">
      <router-view />
    </main>
    
    <!-- Barrierefreiheits-Button (schwebendes Zahnrad) -->
    <button
      @click="openAccessibilitySettings"
      aria-label="Barrierefreiheits-Einstellungen öffnen"
      class="accessibility-button"
      title="Barrierefreiheits-Einstellungen"
    >
      <font-awesome-icon icon="universal-access" />
    </button>
    
    <!-- Einstellungspanel -->
    <SettingsPanel 
      v-if="showSettingsPanel"
      @close="closeSettingsPanel"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMotdStore } from '@/stores/motdStore';
import { marked } from 'marked';
import SettingsPanel from '@/components/settings/SettingsPanel.vue';

// Router und Stores
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const motdStore = useMotdStore();

// Lokaler Zustand
const showUserMenu = ref(false);
const showSettingsPanel = ref(false);

// Benutzerinformationen aus dem Auth-Store
const userEmail = computed(() => authStore.userEmail || 'Benutzer');
const isAdmin = computed(() => authStore.isAdmin);
const userRoleLabel = computed(() => 
  authStore.isAdmin ? 'Administrator' : 'Benutzer'
);

// MOTD-Zustände
const motd = computed(() => motdStore.motd);
const motdDismissed = computed({
  get: () => motdStore.dismissed,
  set: (value) => motdStore.setDismissed(value)
});

// Methoden
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value;
};

const logout = async () => {
  await authStore.logout();
  router.push('/auth/login');
};

const dismissMotd = () => {
  motdDismissed.value = true;
};

const formatMotdContent = (content) => {
  if (!content) return '';
  
  try {
    return marked(content);
  } catch (error) {
    console.error('Fehler beim Formatieren der MOTD:', error);
    return content;
  }
};

const isActiveRoute = (path) => {
  return route.path.startsWith(path);
};

const openAccessibilitySettings = () => {
  showSettingsPanel.value = true;
};

const closeSettingsPanel = () => {
  showSettingsPanel.value = false;
};

// Klick außerhalb des Benutzermenüs schließt es
const handleOutsideClick = (event) => {
  const userMenu = document.querySelector('.user-menu');
  if (userMenu && !userMenu.contains(event.target)) {
    showUserMenu.value = false;
  }
};

// Lifecycle-Hooks
onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
  
  // MOTD laden
  motdStore.loadMotd();
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
});

// Watch für Route-Änderungen, um Benutzermenü zu schließen
watch(() => route.path, () => {
  showUserMenu.value = false;
});
</script>

<style scoped>
.layout-default {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* Alternative Berechnung für iOS Safari */
  min-height: calc(var(--vh, 1vh) * 100);
}

/* Header und Navigation */
.nscale-header {
  background-color: white;
  border-bottom: 1px solid #eaeaea;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.nscale-logo {
  font-weight: 600;
  font-size: 1.25rem;
  color: var(--nscale-green);
  text-decoration: none;
}

.nav-link {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  color: var(--nscale-dark-gray);
  text-decoration: none;
  transition: all 0.2s;
}

.nav-link:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--nscale-green);
}

.nav-link.active {
  background-color: var(--nscale-light-green);
  color: var(--nscale-green);
  font-weight: 500;
}

/* User-Menü */
.user-menu-button {
  border: 1px solid transparent;
}

.user-menu-button.active {
  background-color: var(--nscale-gray-light);
  border-color: var(--nscale-gray-medium);
  border-radius: 6px 6px 0 0;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 220px;
  background-color: white;
  border: 1px solid var(--nscale-gray-medium);
  border-radius: 0 0 6px 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 20;
}

.user-dropdown-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--nscale-gray-medium);
}

.user-email {
  display: block;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.user-role {
  display: block;
  font-size: 0.85rem;
  color: var(--nscale-gray-dark);
}

.user-dropdown-content {
  padding: 0.5rem;
}

.dropdown-item {
  display: flex;
  align-items: center;
  width: 100%;
  text-align: left;
  padding: 0.6rem 0.75rem;
  border-radius: 4px;
  font-size: 0.95rem;
  transition: background-color 0.2s;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: none;
  color: var(--nscale-dark-gray);
}

.dropdown-item:hover {
  background-color: var(--nscale-gray-light);
}

/* MOTD */
.motd-banner {
  width: 100%;
}

.motd-content {
  font-size: 0.95rem;
  line-height: 1.5;
}

.motd-content :deep(p) {
  margin-bottom: 0.75rem;
}

.motd-content :deep(p:last-child) {
  margin-bottom: 0;
}

.motd-content :deep(strong) {
  font-weight: 600;
}

.motd-content :deep(ul) {
  margin-left: 1.5rem;
  margin-bottom: 0.75rem;
  list-style-type: disc;
}

/* Barrierefreiheits-Button (schwebendes Zahnrad) */
.accessibility-button {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background-color: var(--nscale-green);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 50;
  font-size: 1.25rem;
}

.accessibility-button:hover {
  background-color: var(--nscale-green-dark);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.accessibility-button:active {
  transform: translateY(0);
}

/* Dark Mode Anpassungen */
:global(.theme-dark) .nscale-header {
  background-color: #1e1e1e;
  border-bottom-color: #333;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

:global(.theme-dark) .nscale-logo {
  color: #00c060;
}

:global(.theme-dark) .nav-link {
  color: #f0f0f0;
}

:global(.theme-dark) .nav-link:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: #00c060;
}

:global(.theme-dark) .nav-link.active {
  background-color: rgba(0, 192, 96, 0.1);
  color: #00c060;
}

:global(.theme-dark) .user-dropdown {
  background-color: #1e1e1e;
  border-color: #333;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

:global(.theme-dark) .user-dropdown-header {
  border-bottom-color: #333;
}

:global(.theme-dark) .user-email {
  color: #f0f0f0;
}

:global(.theme-dark) .user-role,
:global(.theme-dark) .dropdown-item {
  color: #aaa;
}

:global(.theme-dark) .dropdown-item:hover {
  background-color: #333;
}

:global(.theme-dark) .dropdown-item.text-red-600 {
  color: #ff4d4d;
}

:global(.theme-dark) .user-menu-button.active {
  background-color: #333;
  border-color: #444;
}

:global(.theme-dark) .user-menu-button:hover {
  background-color: #333;
}

:global(.theme-dark) .accessibility-button {
  background-color: #00c060;
}

:global(.theme-dark) .accessibility-button:hover {
  background-color: #00a550;
}

/* Kontrast-Modus Anpassungen */
:global(.theme-contrast) .nscale-header {
  background-color: #000000;
  border-bottom: 2px solid #ffeb3b;
  box-shadow: 0 2px 10px rgba(255, 235, 59, 0.2);
}

:global(.theme-contrast) .nscale-logo {
  color: #ffeb3b;
  font-weight: bold;
}

:global(.theme-contrast) .nav-link,
:global(.theme-contrast) .user-email,
:global(.theme-contrast) .user-role,
:global(.theme-contrast) .dropdown-item {
  color: #ffeb3b;
}

:global(.theme-contrast) .nav-link:hover,
:global(.theme-contrast) .dropdown-item:hover,
:global(.theme-contrast) .user-menu-button:hover {
  background-color: #333300;
  color: #ffeb3b;
}

:global(.theme-contrast) .nav-link.active {
  background-color: #333300;
  color: #ffeb3b;
  border: 1px solid #ffeb3b;
  font-weight: bold;
}

:global(.theme-contrast) .user-dropdown {
  background-color: #000000;
  border: 2px solid #ffeb3b;
  border-top: none;
  box-shadow: 0 4px 12px rgba(255, 235, 59, 0.2);
}

:global(.theme-contrast) .user-dropdown-header {
  border-bottom-color: #ffeb3b;
}

:global(.theme-contrast) .user-menu-button.active {
  background-color: #000000;
  border: 2px solid #ffeb3b;
  border-bottom: none;
}

:global(.theme-contrast) .dropdown-item.text-red-600 {
  color: #ff4444;
}

:global(.theme-contrast) .accessibility-button {
  background-color: #ffeb3b;
  color: #000000;
  font-weight: bold;
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .accessibility-button:hover {
  background-color: #ffd600;
  border-color: #ffd600;
}
</style>