<template>
  <div class="admin-view">
    <AdminPanel />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useFeatureTogglesStore } from '@/stores/featureToggles';
import AdminPanel from '@/components/admin/AdminPanel.vue';

// Stores
const authStore = useAuthStore();
const featureTogglesStore = useFeatureTogglesStore();
const router = useRouter();

// Check if user has admin permissions
onMounted(async () => {
  // If not authenticated, redirect to login
  if (!authStore.isAuthenticated) {
    try {
      await authStore.checkAuth();
    } catch (error) {
      console.error('Authentication check failed:', error);
      router.push('/login');
      return;
    }
  }

  // If not an admin, redirect to home
  if (!authStore.hasRole('admin')) {
    console.warn('Non-admin user tried to access admin view');
    router.push('/');
    return;
  }

  // Check if admin feature toggle is enabled
  if (!featureTogglesStore.isEnabled('useSfcAdmin')) {
    // Fall back to legacy admin panel if needed
    console.warn('SFC Admin feature is disabled, using legacy admin');
    // You might want to dispatch an event or use other fallback mechanisms here
    // This would depend on how your application handles feature toggle fallbacks
  }
});
</script>

<style scoped>
.admin-view {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}
</style>