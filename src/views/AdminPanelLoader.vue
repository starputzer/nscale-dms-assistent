<template>
  <div class="admin-panel-loader">
    <div v-if="loading" class="admin-panel-loading">
      <div class="spinner"></div>
      <p>{{ $t("admin.loading", "Lade Admin-Panel...") }}</p>
    </div>
    <div v-else-if="error" class="admin-panel-error">
      <div class="error-icon">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <h3>
        {{ $t("admin.error.title", "Fehler beim Laden des Admin-Panels") }}
      </h3>
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="reload">
        {{ $t("admin.error.retry", "Erneut versuchen") }}
      </button>
    </div>
    <component
      v-else
      :is="AdminPanelComponent"
      :force-tab="activeTab"
    ></component>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true
});
console.log('[i18n] Component initialized with global scope and inheritance');
const route = useRoute();

// Component state
const loading = ref(true);
const error = ref<string | null>(null);
const AdminPanelComponent = shallowRef<any>(null);

// Get active tab from route params
const activeTab = ref((route.params.tab as string) || "dashboard");

// Load the admin panel component safely
const loadAdminPanel = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Use dynamic import to load the admin panel
    const module = await import("@/components/admin/AdminPanel.vue").catch(
      (err) => {
        console.error("Failed to load AdminPanel.vue, trying fallback:", err);
        // Try to load simplified version as fallback
        return import("@/components/admin/AdminPanel.simplified.vue").catch(
          (fallbackErr) => {
            console.error("Failed to load fallback AdminPanel:", fallbackErr);
            throw new Error("Konnte Admin-Panel nicht laden");
          },
        );
      },
    );

    // Set the component after successful loading
    AdminPanelComponent.value = module.default;
  } catch (err: any) {
    console.error("Error loading admin panel:", err);
    error.value =
      err.message || "Unbekannter Fehler beim Laden des Admin-Panels";
  } finally {
    loading.value = false;
  }
};

// Reload function
const reload = () => {
  loadAdminPanel();
};

// Load on mount
onMounted(() => {
  loadAdminPanel();
});
</script>

<style scoped>
.admin-panel-loader {
  width: 100%;
  height: 100vh;
  position: relative;
}

.admin-panel-loading,
.admin-panel-error {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  text-align: center;
  padding: 2rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: var(--primary-color, #0078d4);
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-icon {
  font-size: 48px;
  color: var(--error-color, #d13438);
  margin-bottom: 1rem;
}

.btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: var(--primary-color, #0078d4);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn:hover {
  background-color: var(--primary-dark-color, #106ebe);
}
</style>
