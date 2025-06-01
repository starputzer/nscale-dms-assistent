<template>
  <div v-if="!isAuthenticated" class="quick-login-banner">
    <div class="quick-login-content">
      <span class="info-text">Nicht angemeldet</span>
      <button @click="quickLogin" class="quick-login-btn" :disabled="isLoading">
        {{ isLoading ? 'Anmelden...' : 'Als Admin anmelden' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const isLoading = ref(false);

const isAuthenticated = computed(() => authStore.isAuthenticated);

async function quickLogin() {
  isLoading.value = true;
  
  try {
    const success = await authStore.login({
      email: 'martin@danglefeet.com',
      password: '123'
    });
    
    if (success) {
      console.log('Quick login successful!');
      // Navigate to admin if that was the intent
      if (window.location.pathname.includes('admin')) {
        await router.push('/admin');
      }
    } else {
      console.error('Quick login failed');
    }
  } catch (error) {
    console.error('Quick login error:', error);
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.quick-login-banner {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.quick-login-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.info-text {
  color: #6c757d;
  font-size: 14px;
}

.quick-login-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.quick-login-btn:hover:not(:disabled) {
  background: #0056b3;
}

.quick-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>