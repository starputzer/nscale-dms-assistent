<template>
  <div id="app" :class="{ 'dark-mode': isDarkMode }">
    <header class="app-header">
      <div class="logo">
        <img src="/images/nscale-logo.svg" alt="nscale DMS Assistent Logo" />
        <h1>nscale DMS Assistent</h1>
      </div>
      <button @click="toggleDarkMode" class="theme-toggle" :title="isDarkMode ? 'Zum hellen Design wechseln' : 'Zum dunklen Design wechseln'">
        <span class="sr-only">{{ isDarkMode ? 'Zum hellen Design wechseln' : 'Zum dunklen Design wechseln' }}</span>
        <svg v-if="isDarkMode" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      </button>
    </header>
    
    <main class="app-main">
      <ErrorReportingExample />
    </main>
    
    <footer class="app-footer">
      <p>&copy; 2025 nscale DMS Assistent | <button @click="showAbout" class="text-button">Über diese Anwendung</button></p>
    </footer>
    
    <!-- DialogProvider für benutzerdefinierte Dialoge -->
    <DialogProvider />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useGlobalDialog } from '@/composables/useDialog';
import ErrorReportingExample from './ErrorReportingExample.vue';

// Theme-Zustand
const isDarkMode = ref(false);

// Dialog-Service
const dialog = useGlobalDialog();

// Theme umschalten
const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value;
  
  // Theme im localStorage speichern
  localStorage.setItem('nscale-theme', isDarkMode.value ? 'dark' : 'light');
  
  // Theme auf dem HTML-Element setzen für CSS-Variablen
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }
};

// Über-Dialog anzeigen
const showAbout = () => {
  dialog.info({
    title: 'Über nscale DMS Assistent',
    message: `
      nscale DMS Assistent ist ein intelligenter Assistent für die nscale Dokumentenmanagement-Software.
      
      Version: 1.0.0
      Entwickelt mit Vue 3 und TypeScript.
    `,
    confirmButtonText: 'Schließen'
  });
};

// Theme aus localStorage laden
const initTheme = () => {
  const savedTheme = localStorage.getItem('nscale-theme');
  if (savedTheme === 'dark') {
    isDarkMode.value = true;
    document.documentElement.classList.add('dark-mode');
  }
};

// Theme beim Laden initialisieren
initTheme();
</script>

<style>
/* Globale CSS-Variablen */
:root {
  --primary-color: #0d7a40;
  --primary-color-light: #10b981;
  --primary-color-dark: #0a6032;
  --text-color: #1f2937;
  --text-color-light: #6b7280;
  --bg-color: #ffffff;
  --bg-color-light: #f3f4f6;
  --border-color: #e5e7eb;
}

/* Dark Mode Variablen */
.dark-mode {
  --primary-color: #10b981;
  --primary-color-light: #34d399;
  --primary-color-dark: #059669;
  --text-color: #f3f4f6;
  --text-color-light: #9ca3af;
  --bg-color: #111827;
  --bg-color-light: #1f2937;
  --border-color: #374151;
}

/* Grundlegende Stile */
body {
  margin: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: var(--text-color);
  background-color: var(--bg-color);
  transition: background-color 0.3s, color 0.3s;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: var(--primary-color);
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo img {
  height: 36px;
}

.logo h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.theme-toggle {
  background: none;
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.theme-toggle:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.theme-toggle svg {
  width: 24px;
  height: 24px;
}

.app-main {
  flex: 1;
  padding: 24px;
}

.app-footer {
  padding: 16px 24px;
  background-color: var(--bg-color-light);
  color: var(--text-color-light);
  font-size: 14px;
  text-align: center;
  border-top: 1px solid var(--border-color);
}

.text-button {
  background: none;
  border: none;
  color: var(--primary-color);
  font-size: inherit;
  font-family: inherit;
  padding: 0;
  margin: 0;
  cursor: pointer;
  text-decoration: underline;
}

.text-button:hover {
  color: var(--primary-color-light);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>