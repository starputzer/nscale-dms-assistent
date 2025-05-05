<script setup>
import { onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/authStore'
import { useFeatureToggleStore } from './stores/featureToggleStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const featureToggleStore = useFeatureToggleStore()

// Berechnung, ob Einstellungsdialog angezeigt werden soll
const showSettings = computed(() => {
  return route.name === 'settings'
})

// Initialisierung
onMounted(() => {
  // Auth wiederherstellen
  authStore.initAuth()
  // Features initialisieren
  featureToggleStore.initFeatures()
})
</script>

<template>
  <div class="app-container">
    <!-- Hauptnavigation - nur anzeigen, wenn angemeldet -->
    <header v-if="authStore.isAuthenticated" class="main-header">
      <div class="logo">nscale DMS Assistent</div>
      <nav class="main-nav">
        <router-link to="/" class="nav-item">Home</router-link>
        <router-link to="/chat" class="nav-item">Chat</router-link>
        <router-link to="/doc-converter" class="nav-item">Dokumentenkonverter</router-link>
        <router-link to="/admin" class="nav-item" v-if="authStore.isAdmin">Admin</router-link>
      </nav>
      <div class="user-actions">
        <router-link to="/settings" class="nav-item">Einstellungen</router-link>
        <button @click="authStore.logout" class="logout-btn">Abmelden</button>
      </div>
    </header>

    <!-- Hauptinhalt -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Footer -->
    <footer v-if="authStore.isAuthenticated" class="main-footer">
      <div>© 2025 nscale DMS Assistent</div>
    </footer>
  </div>
</template>

<style>
/* Reset und Grundstil */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 16px;
  color: #333;
  background-color: #f5f5f5;
}

#app, .app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header Styles */
.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  background-color: #2c3e50;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
}

.main-nav {
  display: flex;
  gap: 20px;
}

.nav-item {
  color: white;
  text-decoration: none;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.router-link-active {
  background-color: rgba(255, 255, 255, 0.2);
  font-weight: bold;
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.logout-btn {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.logout-btn:hover {
  background-color: #c0392b;
}

/* Main Content */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* Footer Styles */
.main-footer {
  display: flex;
  justify-content: center;
  padding: 15px;
  background-color: #f8f9fa;
  border-top: 1px solid #e9ecef;
  color: #6c757d;
  font-size: 0.9rem;
}

/* Übergänge für Router-Ansichten */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Allgemeine Utility-Klassen */
.nscale-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}

.nscale-btn-primary {
  background-color: #38a169;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.nscale-btn-primary:hover {
  background-color: #2f855a;
}

.nscale-btn-secondary {
  background-color: #718096;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.nscale-btn-secondary:hover {
  background-color: #4a5568;
}

.nscale-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.nscale-input:focus {
  border-color: #38a169;
  box-shadow: 0 0 0 2px rgba(56, 161, 105, 0.2);
}

/* Loading-Animation */
.loader {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #38a169;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-dots:after {
  content: '.';
  animation: dots 1.5s steps(5, end) infinite;
}

@keyframes dots {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60% { content: '...'; }
  80%, 100% { content: ''; }
}
</style>
