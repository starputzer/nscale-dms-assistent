<template>
  <div class="login-container flex justify-center items-center min-h-screen p-4">
    <div class="nscale-card max-w-md w-full p-8">
      <div class="nscale-logo text-center mb-6">
        <img src="@/assets/images/senmvku-logo.png" alt="nscale DMS Assistent" class="h-12 mx-auto mb-4">
        <h1 class="text-xl">nscale DMS Assistent</h1>
      </div>
      <div class="flex border-b mb-6">
        <button 
          class="py-2 px-4 w-1/2 text-center" 
          :class="{ 'active-tab': activeTab === 'login' }"
          @click="activeTab = 'login'"
        >
          Anmelden
        </button>
        <button 
          class="py-2 px-4 w-1/2 text-center" 
          :class="{ 'active-tab': activeTab === 'register' }"
          @click="activeTab = 'register'"
        >
          Registrieren
        </button>
      </div>
      
      <form class="space-y-4" @submit.prevent="submitForm">
        <div class="form-group">
          <label for="email" class="form-label">E-Mail</label>
          <input 
            id="email"
            v-model="email" 
            class="nscale-input w-full" 
            type="email" 
            placeholder="name@example.de"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="password" class="form-label">Passwort</label>
          <input 
            id="password"
            v-model="password" 
            class="nscale-input w-full" 
            type="password" 
            placeholder="••••••••"
            required
          >
        </div>
        
        <div v-if="activeTab === 'register'" class="form-group">
          <label for="passwordConfirm" class="form-label">Passwort bestätigen</label>
          <input 
            id="passwordConfirm"
            v-model="passwordConfirm" 
            class="nscale-input w-full" 
            type="password" 
            placeholder="••••••••"
            required
          >
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <button 
          class="nscale-btn-primary w-full" 
          type="submit"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="loading-spinner mr-2"></span>
          {{ activeTab === 'login' ? 'Anmelden' : 'Registrieren' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';

const store = useStore();
const router = useRouter();
const { login, register, isLoading, error } = useAuth();

const activeTab = ref('login');
const email = ref('');
const password = ref('');
const passwordConfirm = ref('');

async function submitForm() {
  try {
    if (activeTab.value === 'login') {
      await login(email.value, password.value);
      router.push('/');
    } else {
      if (password.value !== passwordConfirm.value) {
        store.commit('auth/setError', 'Die Passwörter stimmen nicht überein.');
        return;
      }
      await register(email.value, password.value);
      router.push('/');
    }
  } catch (err) {
    // Error handling is done in the useAuth composable
  }
}
</script>

<style scoped>
.login-container {
  background-color: var(--nscale-background);
}

.nscale-logo {
  color: var(--nscale-text);
}

.active-tab {
  color: var(--nscale-green);
  border-bottom: 2px solid var(--nscale-green);
  font-weight: 500;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--nscale-text-light);
}

.error-message {
  color: #e53e3e;
  font-size: 0.875rem;
  padding: 0.5rem;
  background-color: rgba(229, 62, 62, 0.1);
  border-radius: 4px;
}

.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.mx-auto { margin-left: auto; margin-right: auto; }
.mb-4 { margin-bottom: 1rem; }
.min-h-screen { min-height: 100vh; }
.h-12 { height: 3rem; }
.text-xl { font-size: 1.25rem; }
.w-1/2 { width: 50%; }
.mr-2 { margin-right: 0.5rem; }
</style>