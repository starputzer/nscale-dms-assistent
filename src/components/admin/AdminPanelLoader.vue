<template>
  <div class="admin-panel-loader">
    <!-- Preload the required UI components -->
    <div v-if="isLoading" class="admin-panel-loader__loading">
      <div class="admin-panel-loader__spinner"></div>
      <p>{{ t("admin.loading", "Lade Admin-Panel...") }}</p>
    </div>

    <!-- Render the actual panel once loaded -->
    <component
      v-else
      :is="adminPanelComponent"
      :force-tab="forcedTab"
    ></component>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineProps } from "vue";
import { useI18n } from "vue-i18n";
import {
  lazyLoadComponent,
  preloadComponents,
} from "@/services/lazy-loading.fixed";

// i18n with global scope and composition disabled to fix the "Not available in legacy mode" error
const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true
});
console.log('[AdminPanelLoader] i18n initialized with global scope and inheritance');

// Props
const props = defineProps({
  forcedTab: {
    type: String,
    default: null,
  },
});

// State
const isLoading = ref(true);
const adminPanelComponent = ref(null);

// Lifecycle
onMounted(async () => {
  isLoading.value = true;

  try {
    // First preload required UI components
    console.log("[AdminPanelLoader] Preloading UI components");
    await preloadComponents(["Input", "Toast", "Dialog"]);

    console.log("[AdminPanelLoader] Loading AdminPanel component");
    // Then load the admin panel
    adminPanelComponent.value = lazyLoadComponent("AdminPanel");
  } catch (error) {
    console.error("[AdminPanelLoader] Error loading AdminPanel:", error);
    // Fall back to simplified version in case of errors
    adminPanelComponent.value = lazyLoadComponent("AdminPanel"); // Force it to try again
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
.admin-panel-loader {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.admin-panel-loader__loading {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  gap: 1rem;
  color: var(--n-color-text-secondary);
}

.admin-panel-loader__spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(var(--n-color-primary-rgb, 0, 120, 212), 0.1);
  border-radius: 50%;
  border-top-color: var(--n-color-primary, #0078d4);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
