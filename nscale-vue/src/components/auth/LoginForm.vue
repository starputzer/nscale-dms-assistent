<template>
  <div class="nscale-card max-w-md w-full p-8">
    <div class="text-center mb-8">
      <div class="nscale-logo mx-auto">nscale DMS Assistent</div>
      <p class="text-gray-500 mt-2">Ihr Digitalisierungspartner für DMS-Lösungen</p>
    </div>
    
    <!-- MOTD auch auf der Login-Seite anzeigen -->
    <div v-if="motd && motd.enabled && !motdDismissed" 
         :style="{
           backgroundColor: motd.style.backgroundColor,
           borderColor: motd.style.borderColor,
           color: motd.style.textColor,
           border: '1px solid ' + motd.style.borderColor
         }"
         class="p-4 mb-4 rounded-lg relative">
      <button v-if="motd.display.dismissible" 
              @click="$emit('dismiss-motd')" 
              class="absolute top-2 right-2 font-bold"
              :style="{ color: motd.style.textColor }">
        ×
      </button>
      <div v-html="formatMotdContent(motd.content)" class="motd-content"></div>
    </div>
    
    <div class="flex border-b border-gray-200 mb-6">
      <button @click="authMode = 'login'" 
        :class="['py-2 px-4 w-1/2 text-center focus:outline-none', 
        authMode === 'login' ? 'border-b-2 border-green-500 text-green-600 font-medium' : 'text-gray-500']">
        Anmelden
      </button>
      <button @click="authMode = 'register'" 
        :class="['py-2 px-4 w-1/2 text-center focus:outline-none', 
        authMode === 'register' ? 'border-b-2 border-green-500 text-green-600 font-medium' : 'text-gray-500']">
        Registrieren
      </button>
    </div>
    
    <!-- Login Form -->
    <form v-if="authMode === 'login'" @submit.prevent="login" class="space-y-4">
      <div>
        <label class="block text-gray-700 text-sm font-medium mb-2" for="email">E-Mail</label>
        <input v-model="email" class="nscale-input w-full" 
          id="email" type="email" placeholder="Ihre E-Mail-Adresse" required>
      </div>
      <div>
        <label class="block text-gray-700 text-sm font-medium mb-2" for="password">Passwort</label>
        <input v-model="password" class="nscale-input w-full" 
          id="password" type="password" placeholder="Ihr Passwort" required>
      </div>
      <div class="flex items-center justify-between mt-6">
        <button class="nscale-btn-primary w-full" 
          type="submit" :disabled="loading">
          <span v-if="loading" class="loading-dots">Anmelden</span>
          <span v-else>Anmelden</span>
        </button>
      </div>
      <div class="text-center mt-4">
        <a class="text-sm text-nscale hover:text-nscale-dark" href="#" @click.prevent="authMode = 'reset'">
          Passwort vergessen?
        </a>
      </div>
      <div v-if="errorMessage" class="mt-4 text-red-500 text-sm text-center">{{ errorMessage }}</div>
    </form>
    
    <!-- Register Form -->
    <form v-if="authMode === 'register'" @submit.prevent="register" class="space-y-4">
      <div>
        <label class="block text-gray-700 text-sm font-medium mb-2" for="reg-email">E-Mail</label>
        <input v-model="email" class="nscale-input w-full" 
          id="reg-email" type="email" placeholder="Ihre E-Mail-Adresse" required>
      </div>
      <div>
        <label class="block text-gray-700 text-sm font-medium mb-2" for="reg-password">Passwort</label>
        <input v-model="password" class="nscale-input w-full" 
          id="reg-password" type="password" placeholder="Ihr sicheres Passwort" required>
      </div>
      <div class="flex items-center justify-between mt-6">
        <button class="nscale-btn-primary w-full" 
          type="submit" :disabled="loading">
          <span v-if="loading" class="loading-dots">Registrieren</span>
          <span v-else>Registrieren</span>
        </button>
      </div>
      <div v-if="errorMessage" class="mt-4 text-red-500 text-sm text-center">{{ errorMessage }}</div>
    </form>
    
    <!-- Reset Password Form -->
    <form v-if="authMode === 'reset'" @submit.prevent="resetPassword" class="space-y-4">
      <div>
        <label class="block text-gray-700 text-sm font-medium mb-2" for="reset-email">E-Mail</label>
        <input v-model="email" class="nscale-input w-full" 
          id="reset-email" type="email" placeholder="Ihre E-Mail-Adresse" required>
      </div>
      <div class="flex items-center justify-between mt-6">
        <button class="nscale-btn-primary w-full" 
          type="submit" :disabled="loading">
          <span v-if="loading" class="loading-dots">Passwort zurücksetzen</span>
          <span v-else>Passwort zurücksetzen</span>
        </button>
      </div>
      <div class="text-center mt-4">
        <a class="text-sm text-nscale hover:text-nscale-dark" href="#" @click.prevent="authMode = 'login'">
          Zurück zur Anmeldung
        </a>
      </div>
      <div v-if="successMessage" class="mt-4 text-green-600 text-sm text-center">{{ successMessage }}</div>
      <div v-if="errorMessage" class="mt-4 text-red-500 text-sm text-center">{{ errorMessage }}</div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import marked from 'marked';

// Props
const props = defineProps({
  motd: {
    type: Object,
    default: () => null
  },
  motdDismissed: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['login-success', 'dismiss-motd']);

// Stores
const authStore = useAuthStore();

// Reaktiver Zustand
const authMode = ref('login');
const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

// Methoden
function formatMotdContent(content) {
  if (!content) return '';
  return props.motd.format === 'markdown' ? marked(content) : content;
}

async function login() {
  if (loading.value) return;
  
  errorMessage.value = '';
  loading.value = true;
  
  try {
    const result = await authStore.login(email.value, password.value);
    
    if (result.success) {
      emit('login-success', {
        token: authStore.token,
        role: authStore.userRole
      });
    } else {
      errorMessage.value = result.message || 'Anmeldung fehlgeschlagen';
    }
  } catch (error) {
    errorMessage.value = error.message || 'Ein unerwarteter Fehler ist aufgetreten';
  } finally {
    loading.value = false;
  }
}

async function register() {
  if (loading.value) return;
  
  errorMessage.value = '';
  loading.value = true;
  
  try {
    // Hier würde ein API-Call zur Registrierung stattfinden
    // Mock-Implementierung
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Nach erfolgreicher Registrierung direkt anmelden
    const result = await authStore.login(email.value, password.value);
    
    if (result.success) {
      emit('login-success', {
        token: authStore.token,
        role: authStore.userRole
      });
    } else {
      errorMessage.value = result.message || 'Registrierung fehlgeschlagen';
    }
  } catch (error) {
    errorMessage.value = error.message || 'Ein unerwarteter Fehler ist aufgetreten';
  } finally {
    loading.value = false;
  }
}

async function resetPassword() {
  if (loading.value) return;
  
  errorMessage.value = '';
  successMessage.value = '';
  loading.value = true;
  
  try {
    const result = await authStore.resetPassword(email.value);
    
    if (result.success) {
      successMessage.value = result.message || 'Passwort-Reset-E-Mail wurde gesendet';
      email.value = ''; // Feld leeren
    } else {
      errorMessage.value = result.message || 'Passwort zurücksetzen fehlgeschlagen';
    }
  } catch (error) {
    errorMessage.value = error.message || 'Ein unerwarteter Fehler ist aufgetreten';
  } finally {
    loading.value = false;
  }
}
</script>

<style>
/* Keine scoped Styles, um die globalen CSS-Klassen zu verwenden */

/* Aber wir fügen die wichtigsten Stile hier hinzu, falls die globalen CSS-Dateien nicht geladen werden */
.nscale-card {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.nscale-logo {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2563eb;
}

.nscale-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 1rem;
  line-height: 1.5;
  transition: border-color 0.15s ease-in-out;
}

.nscale-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

.nscale-btn-primary {
  display: flex;
  justify-content: center;
  padding: 0.5rem 1rem;
  font-weight: 500;
  background-color: #2563eb;
  color: white;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
}

.nscale-btn-primary:hover {
  background-color: #1d4ed8;
}

.nscale-btn-primary:disabled {
  background-color: #93c5fd;
  cursor: not-allowed;
}

/* Loading-Animation */
.loading-dots::after {
  content: "...";
  animation: dots 1.5s infinite;
  display: inline-block;
  width: 1.5em;
  text-align: left;
}

@keyframes dots {
  0%, 20% { content: "."; }
  40% { content: ".."; }
  60%, 100% { content: "..."; }
}

/* Dark Mode */
:global(.theme-dark) .nscale-card {
  background-color: #1f2937;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
}

:global(.theme-dark) .nscale-logo {
  color: #3b82f6;
}

:global(.theme-dark) .nscale-input {
  background-color: #111827;
  border-color: #374151;
  color: #f9fafb;
}

:global(.theme-dark) .nscale-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
}

/* Kontrast Mode */
:global(.theme-contrast) .nscale-card {
  background-color: #000000;
  border: 2px solid #ffeb3b;
  box-shadow: none;
}

:global(.theme-contrast) .nscale-logo {
  color: #ffeb3b;
}

:global(.theme-contrast) .nscale-input {
  background-color: #000000;
  border: 2px solid #ffeb3b;
  color: #ffffff;
}

:global(.theme-contrast) .nscale-input:focus {
  border-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(255, 235, 59, 0.5);
}

:global(.theme-contrast) .nscale-btn-primary {
  background-color: #ffeb3b;
  color: #000000;
  border: 2px solid #ffffff;
}

:global(.theme-contrast) .nscale-btn-primary:hover {
  background-color: #ffd600;
}
</style>