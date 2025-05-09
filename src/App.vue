<template>
  <div class="app-container">
    <template v-if="authStore.isAuthenticated">
      <MainLayout>
        <template #header>
          <Header 
            :user="authStore.user" 
            @logout="authStore.logout"
          />
        </template>
        
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </MainLayout>
    </template>
    
    <template v-else>
      <router-view />
    </template>
    
    <Toast />
    <DialogProvider />
  </div>
</template>

<script setup lang="ts">
import { onMounted, provide } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { useTheme } from '@/composables/useTheme';

// Komponenten
import MainLayout from '@/components/layout/MainLayout.vue';
import Header from '@/components/layout/Header.vue';
import Toast from '@/components/ui/Toast.vue';
import DialogProvider from '@/components/dialog/DialogProvider.vue';

// Stores
const authStore = useAuthStore();
const uiStore = useUIStore();
const router = useRouter();

// Theme-Informationen
const { currentTheme, isDarkTheme, isLightTheme, isContrastTheme, setTheme } = useTheme();

// Stelle UI-Context zur Verfügung, um Prop-Drilling zu vermeiden
provide('uiStore', uiStore);

// Provide theme information to all components
provide('isDarkTheme', isDarkTheme);
provide('isContrastTheme', isContrastTheme);
provide('isLightTheme', isLightTheme);
provide('currentTheme', currentTheme);
provide('setTheme', setTheme);

// Prüfe Authentifizierung beim App-Start
onMounted(async () => {
  const isAuthenticated = await authStore.checkAuth();
  
  if (!isAuthenticated && router.currentRoute.value.meta.requiresAuth) {
    router.push('/login');
  }
});
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body, html {
  font-family: var(--nscale-font-family-base);
  height: 100%;
  width: 100%;
}

.app-container {
  color: var(--nscale-foreground);
  background-color: var(--nscale-background);
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Base UI classes updated with new design system */
.nscale-btn-primary {
  background-color: var(--nscale-btn-primary-bg);
  color: var(--nscale-btn-primary-text);
  border-radius: var(--nscale-border-radius-md);
  padding: var(--nscale-space-2) var(--nscale-space-4);
  border: 1px solid var(--nscale-btn-primary-border);
  font-weight: var(--nscale-font-weight-medium);
  cursor: pointer;
  transition: background-color var(--nscale-transition-quick) ease;
}

.nscale-btn-primary:hover {
  background-color: var(--nscale-btn-primary-hover-bg);
}

.nscale-btn-secondary {
  background-color: var(--nscale-btn-secondary-bg);
  color: var(--nscale-btn-secondary-text);
  border: 1px solid var(--nscale-btn-secondary-border);
  border-radius: var(--nscale-border-radius-md);
  padding: var(--nscale-space-2) var(--nscale-space-4);
  font-weight: var(--nscale-font-weight-medium);
  cursor: pointer;
  transition: background-color var(--nscale-transition-quick) ease;
}

.nscale-btn-secondary:hover {
  background-color: var(--nscale-btn-secondary-hover-bg);
}

.nscale-input {
  border: 1px solid var(--nscale-input-border);
  border-radius: var(--nscale-border-radius-md);
  padding: var(--nscale-space-3) var(--nscale-space-4);
  font-size: var(--nscale-font-size-sm);
  background-color: var(--nscale-input-bg);
  color: var(--nscale-input-text);
  width: 100%;
}

.nscale-input:focus {
  outline: none;
  border-color: var(--nscale-input-focus-border);
  box-shadow: 0 0 0 2px var(--nscale-focus-ring);
}

.nscale-card {
  background-color: var(--nscale-card-bg);
  border-radius: var(--nscale-border-radius-lg);
  box-shadow: var(--nscale-shadow-md);
  border: 1px solid var(--nscale-card-border);
}

/* Utility classes updated with design system spacing variables */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.justify-center { justify-content: center; }
.items-center { align-items: center; }
.space-x-2 > * + * { margin-left: var(--nscale-space-2); }
.space-y-4 > * + * { margin-top: var(--nscale-space-4); }
.w-full { width: 100%; }
.max-w-md { max-width: 28rem; }
.p-4 { padding: var(--nscale-space-4); }
.p-8 { padding: var(--nscale-space-8); }
.py-2 { padding-top: var(--nscale-space-2); padding-bottom: var(--nscale-space-2); }
.px-4 { padding-left: var(--nscale-space-4); padding-right: var(--nscale-space-4); }
.mb-6 { margin-bottom: var(--nscale-space-6); }
.text-center { text-align: center; }
.text-lg { font-size: var(--nscale-font-size-lg); }
.font-medium { font-weight: var(--nscale-font-weight-medium); }
.border-b { border-bottom: 1px solid var(--nscale-border); }
</style>