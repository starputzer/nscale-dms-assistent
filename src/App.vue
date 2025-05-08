<template>
  <div id="app" :class="{ 'theme-dark': isDarkTheme, 'theme-contrast': isContrastTheme }">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, provide } from 'vue';
import { useStore } from 'vuex';
import { useSettings } from '@/composables/useSettings';

const store = useStore();
const { isDarkTheme, isContrastTheme, loadSettings } = useSettings();

// Provide theme information to all components
provide('isDarkTheme', isDarkTheme);
provide('isContrastTheme', isContrastTheme);

// Check if user is authenticated on app mount
onMounted(() => {
  loadSettings();
  const token = localStorage.getItem('auth_token');
  if (token) {
    store.dispatch('auth/validateToken', token);
  }
});
</script>

<style>
:root {
  --nscale-green: #00a550;
  --nscale-green-dark: #009046;
  --nscale-light-green: #e8f7ef;
  --nscale-gray: #f7f7f7;
  --nscale-dark-gray: #333333;
  --nscale-text: #333333;
  --nscale-text-light: #666666;
  --nscale-background: #ffffff;
  --nscale-card-bg: #ffffff;
  --nscale-border: #e5e5e5;
  --nscale-assistant-bg: #e8f7ef;
  --nscale-user-bg: #f0f1f3;
  --nscale-header-bg: #ffffff;
  --nscale-sidebar-bg: #ffffff;
  --nscale-input-bg: #ffffff;
  --nscale-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.theme-dark {
  --nscale-text: #e5e5e5;
  --nscale-text-light: #b0b0b0;
  --nscale-background: #1e1e1e;
  --nscale-card-bg: #2d2d2d;
  --nscale-border: #444444;
  --nscale-assistant-bg: #1f3d2a;
  --nscale-user-bg: #2a2f3a;
  --nscale-header-bg: #2d2d2d;
  --nscale-sidebar-bg: #2d2d2d;
  --nscale-input-bg: #3a3a3a;
  --nscale-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.theme-contrast {
  --nscale-text: #ffffff;
  --nscale-text-light: #eeeeee;
  --nscale-background: #000000;
  --nscale-card-bg: #1a1a1a;
  --nscale-border: #ffffff;
  --nscale-assistant-bg: #004422;
  --nscale-user-bg: #001f60;
  --nscale-header-bg: #1a1a1a;
  --nscale-sidebar-bg: #1a1a1a;
  --nscale-input-bg: #1a1a1a;
  --nscale-shadow: 0 2px 10px rgba(255, 255, 255, 0.2);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body, html {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  height: 100%;
  width: 100%;
}

#app {
  color: var(--nscale-text);
  background-color: var(--nscale-background);
  min-height: 100vh;
  width: 100%;
}

.nscale-btn-primary {
  background-color: var(--nscale-green);
  color: white;
  border-radius: 4px;
  padding: 8px 16px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.nscale-btn-primary:hover {
  background-color: var(--nscale-green-dark);
}

.nscale-btn-secondary {
  background-color: transparent;
  color: var(--nscale-text);
  border: 1px solid var(--nscale-border);
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.nscale-btn-secondary:hover {
  background-color: var(--nscale-gray);
}

.nscale-input {
  border: 1px solid var(--nscale-border);
  border-radius: 4px;
  padding: 10px 12px;
  font-size: 14px;
  background-color: var(--nscale-input-bg);
  color: var(--nscale-text);
  width: 100%;
}

.nscale-input:focus {
  outline: none;
  border-color: var(--nscale-green);
  box-shadow: 0 0 0 2px rgba(0, 165, 80, 0.2);
}

.nscale-card {
  background-color: var(--nscale-card-bg);
  border-radius: 8px;
  box-shadow: var(--nscale-shadow);
}

/* Utility classes */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.justify-center { justify-content: center; }
.items-center { align-items: center; }
.space-x-2 > * + * { margin-left: 0.5rem; }
.space-y-4 > * + * { margin-top: 1rem; }
.w-full { width: 100%; }
.max-w-md { max-width: 28rem; }
.p-4 { padding: 1rem; }
.p-8 { padding: 2rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
.text-center { text-align: center; }
.text-lg { font-size: 1.125rem; }
.font-medium { font-weight: 500; }
.border-b { border-bottom: 1px solid var(--nscale-border); }
</style>