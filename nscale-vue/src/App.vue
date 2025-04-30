<!-- App.vue -->
<template>
  <div id="app" class="app">
    <!-- Toast-Container für Benachrichtigungen -->
    <ToastContainer />
    
    <!-- Router-View für Layout -->
    <router-view />
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { watch } from 'vue';

const router = useRouter();
const authStore = useAuthStore();

// Initialisiere Auth-Store
onMounted(async () => {
  // Initialisiere den Auth-Store
  await authStore.init();
  
  // Überwache Änderungen an der Fenstergröße für responsive Anpassungen
  window.addEventListener('resize', handleResize);
  handleResize();
  
  // Event-Handler für Netzwerkstatus
  window.addEventListener('online', handleOnlineStatus);
  window.addEventListener('offline', handleOfflineStatus);
  
  // Einmalige CSS-Variablen initialisieren
  initCssVariables();
});

// Event-Listener entfernen
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('online', handleOnlineStatus);
  window.removeEventListener('offline', handleOfflineStatus);
});

// CSS-Variablen initialisieren
const initCssVariables = () => {
  // Viewport-Höhe für mobile Geräte fixieren
  // (verhindert Sprünge bei Ausblendem der Adressleiste in mobilen Browsern)
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
};

// Responsive Anpassungen
const handleResize = () => {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  document.documentElement.style.setProperty('--window-width', `${window.innerWidth}px`);
};

// Online/Offline-Status behandeln
const handleOnlineStatus = () => {
  document.body.classList.remove('is-offline');
};

const handleOfflineStatus = () => {
  document.body.classList.add('is-offline');
};

// Benutzerrolle überwachen
watch(() => authStore.userRole, (newRole) => {
  // Wenn die Benutzerrolle wechselt, prüfen ob der Benutzer die aktuelle Seite besuchen darf
  const currentRoute = router.currentRoute.value;
  
  // Prüfe, ob der Zugriff auf die aktuelle Route erlaubt ist
  if (currentRoute.meta.requiresAdmin && newRole !== 'admin') {
    router.push({ name: 'Home' });
  }
});
</script>

<style>
/* Globale Stile, die für alle Seiten gelten */
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* Alternative Berechnung für iOS Safari */
  min-height: calc(var(--vh, 1vh) * 100);
}

/* Offline-Status-Anzeige */
.is-offline {
  /* Subtile Anzeige für Offline-Status */
  position: relative;
}

.is-offline::before {
  content: "Offline-Modus";
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: var(--nscale-red, #e53e3e);
  color: white;
  text-align: center;
  padding: 0.25rem;
  font-size: 0.85rem;
  z-index: 9999;
}

.is-offline .app {
  margin-top: 1.75rem;
}

/* Globale Animationen */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Reduzierte Animation für Benutzer, die reduzierte Bewegung bevorzugen */
.reduce-motion * {
  transition: none !important;
  animation: none !important;
}

/* Theme-Anpassungen werden in separaten CSS-Dateien definiert */
</style>