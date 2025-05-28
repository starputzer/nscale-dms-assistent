<!--
Digitale Akte Assistent - Hauptkomponente mit Performance-Optimierungen
-->
<template>
  <div class="app-container" :data-theme="effectiveTheme">
    <Suspense>
      <template #default>
        <router-view v-slot="{ Component, route }">
          <transition :name="route.meta.transition || 'fade'" mode="out-in">
            <keep-alive :include="cachedViews">
              <component :is="Component" :key="route.fullPath" />
            </keep-alive>
          </transition>
        </router-view>
      </template>
      <template #fallback>
        <div class="loading-container">
          <LoadingSpinner />
        </div>
      </template>
    </Suspense>

    <!-- Toast Container für Benachrichtigungen -->
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useThemeStore } from "@/stores/theme";
import { useRouter } from "vue-router";
import LoadingSpinner from "@/components/common/LoadingSpinner.vue";
import ToastContainer from "@/components/ui/ToastContainer.vue";
import { setupIntelligentPreloading } from "@/services/lazy-loading";

const themeStore = useThemeStore();
const router = useRouter();

// Cached Views für bessere Performance
const cachedViews = ref<string[]>([
  "SimpleChatView",
  "DocumentsView",
  "SettingsView",
]);

// Computed
const effectiveTheme = computed(() => themeStore.effectiveTheme);

// Performance-Optimierungen beim Start
onMounted(() => {
  // Intelligentes Preloading aktivieren
  setupIntelligentPreloading();

  // Prefetch wichtige Routen
  router.afterEach((to, from) => {
    // Prefetch möglicherweise benötigte nächste Routen (nur wenn unterstützt)
    if (router.prefetch) {
      if (to.name === "Login") {
        router.prefetch("/chat");
      } else if (to.name === "Chat") {
        router.prefetch("/documents");
        router.prefetch("/settings");
      }
    }
  });

  // Performance Observer für Web Vitals
  if ("PerformanceObserver" in window) {
    const perfObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Log performance metrics
        console.log(
          "Performance:",
          entry.name,
          entry.startTime,
          entry.duration,
        );
      }
    });

    perfObserver.observe({ entryTypes: ["navigation", "resource", "measure"] });
  }

  // Service Worker registrieren (falls vorhanden)
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => console.log("SW registered:", registration))
      .catch((error) => console.error("SW registration failed:", error));
  }
});

// Cleanup bei Unmount
onUnmounted(() => {
  // Cleanup von Event Listeners oder Observern falls nötig
});
</script>

<style scoped>
.app-container {
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background: var(--nscale-background);
  color: var(--nscale-text);
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  contain: layout style paint;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100%;
}

/* Transition Styles */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(100%);
}

.slide-leave-to {
  transform: translateX(-100%);
}

/* Performance-Optimierungen */
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active,
  .slide-enter-active,
  .slide-leave-active {
    transition: none;
  }
}
</style>
