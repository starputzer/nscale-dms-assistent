<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="user-form" @click.stop>
      <div class="form-header">
        <h3>{{ isCreateMode ? 'Neuen Benutzer erstellen' : 'Benutzer bearbeiten' }}</h3>
        <button class="close-btn" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div v-if="error" class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        {{ error }}
      </div>
      
      <div class="form-body">
        <div class="form-group">
          <label for="email">E-Mail-Adresse</label>
          <input 
            type="email" 
            id="email" 
            v-model="formData.email" 
            :disabled="!isCreateMode"
            class="form-control"
            :class="{ 'is-invalid': validationErrors.email }"
          />
          <div v-if="validationErrors.email" class="validation-error">
            {{ validationErrors.email }}
          </div>
        </div>
        
        <div class="form-group">
          <label for="password">Passwort</label>
          <div class="password-field">
            <input 
              :type="showPassword ? 'text' : 'password'" 
              id="password" 
              v-model="formData.password" 
              class="form-control"
              :class="{ 'is-invalid': validationErrors.password }"
            />
            <button 
              type="button" 
              class="toggle-password" 
              @click="showPassword = !showPassword"
            >
              <i :class="['fas', showPassword ? 'fa-eye-slash' : 'fa-eye']"></i>
            </button>
          </div>
          <div v-if="validationErrors.password" class="validation-error">
            {{ validationErrors.password }}
          </div>
        </div>
        
        <div class="form-group">
          <label for="role">Rolle</label>
          <select 
            id="role" 
            v-model="formData.role" 
            class="form-control"
          >
            <option value="user">Standardbenutzer</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
        
        <div v-if="formData.role === 'admin'" class="role-info">
          <i class="fas fa-info-circle"></i>
          Administratoren haben vollen Zugriff auf alle Systemfunktionen, einschließlich Benutzerverwaltung und Konfigurationseinstellungen.
        </div>
      </div>
      
      <div class="form-footer">
        <button 
          type="button" 
          class="cancel-btn" 
          @click="$emit('close')"
        >
          Abbrechen
        </button>
        <button 
          type="button" 
          class="save-btn" 
          :disabled="loading || !isFormValid" 
          @click="saveUser"
        >
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          {{ isCreateMode ? 'Benutzer erstellen' : 'Benutzer speichern' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

// Props
const props = defineProps({
  mode: {
    type: String,
    default: 'create',
    validator: (value) => ['create', 'edit'].includes(value)
  },
  user: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  }
});

// Emits
const emit = defineEmits(['save', 'close']);

// Local state
const showPassword = ref(false);
const formData = ref({
  email: '',
  password: '',
  role: 'user'
});
const validationErrors = ref({
  email: '',
  password: ''
});

// Computed properties
const isCreateMode = computed(() => props.mode === 'create');
const isFormValid = computed(() => {
  if (!formData.value.email) return false;
  if (isCreateMode.value && !formData.value.password) return false;
  return !validationErrors.value.email && !validationErrors.value.password;
});

// Methods
const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!formData.value.email) {
    validationErrors.value.email = 'E-Mail-Adresse ist erforderlich';
    return false;
  } else if (!emailRegex.test(formData.value.email)) {
    validationErrors.value.email = 'Ungültige E-Mail-Adresse';
    return false;
  } else {
    validationErrors.value.email = '';
    return true;
  }
};

const validatePassword = () => {
  if (isCreateMode.value && !formData.value.password) {
    validationErrors.value.password = 'Passwort ist erforderlich';
    return false;
  } else if (formData.value.password && formData.value.password.length < 8) {
    validationErrors.value.password = 'Passwort muss mindestens 8 Zeichen lang sein';
    return false;
  } else {
    validationErrors.value.password = '';
    return true;
  }
};

const validateForm = () => {
  const isEmailValid = validateEmail();
  const isPasswordValid = validatePassword();
  return isEmailValid && isPasswordValid;
};

const saveUser = () => {
  if (!validateForm()) return;
  
  emit('save', {
    email: formData.value.email,
    password: formData.value.password,
    role: formData.value.role
  });
};

// Initialize form data if user is provided
watch(() => props.user, (newUser) => {
  if (newUser) {
    formData.value = {
      email: newUser.email || '',
      password: '',
      role: newUser.role || 'user'
    };
  } else {
    // Reset form if no user is provided
    formData.value = {
      email: '',
      password: '',
      role: 'user'
    };
  }
}, { immediate: true });

// Validate on input
watch(() => formData.value.email, validateEmail);
watch(() => formData.value.password, validatePassword);
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.user-form {
  background-color: white;
  border-radius: 0.5rem;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.form-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.close-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #ef4444;
}

.error-message {
  margin: 1rem 1.5rem 0;
  padding: 0.75rem;
  background-color: #fee2e2;
  border-left: 4px solid #ef4444;
  color: #b91c1c;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #475569;
  font-size: 0.875rem;
}

.form-control {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #1e293b;
  background-color: white;
}

.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-control.is-invalid {
  border-color: #ef4444;
}

.password-field {
  position: relative;
}

.toggle-password {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem;
}

.validation-error {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: #ef4444;
}

.role-info {
  background-color: #eff6ff;
  padding: 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  color: #1e40af;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.role-info i {
  margin-top: 0.125rem;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.cancel-btn, .save-btn {
  padding: 0.625rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cancel-btn {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.cancel-btn:hover {
  background-color: #e2e8f0;
}

.save-btn {
  background-color: #3b82f6;
  color: white;
  border: none;
}

.save-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Dark Mode Support */
:global(.theme-dark) .user-form {
  background-color: #1e1e1e;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
}

:global(.theme-dark) .form-header {
  border-bottom-color: #333;
}

:global(.theme-dark) .form-header h3 {
  color: #e0e0e0;
}

:global(.theme-dark) .close-btn {
  color: #aaa;
}

:global(.theme-dark) .close-btn:hover {
  color: #ef4444;
}

:global(.theme-dark) .form-group label {
  color: #bbb;
}

:global(.theme-dark) .form-control {
  background-color: #252525;
  border-color: #444;
  color: #e0e0e0;
}

:global(.theme-dark) .form-control:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

:global(.theme-dark) .toggle-password {
  color: #aaa;
}

:global(.theme-dark) .role-info {
  background-color: #1a365d;
  color: #93c5fd;
}

:global(.theme-dark) .form-footer {
  border-top-color: #333;
}

:global(.theme-dark) .cancel-btn {
  background-color: #252525;
  color: #bbb;
  border-color: #444;
}

:global(.theme-dark) .cancel-btn:hover {
  background-color: #333;
}

:global(.theme-dark) .save-btn {
  background-color: #2563eb;
}

:global(.theme-dark) .save-btn:hover:not(:disabled) {
  background-color: #1d4ed8;
}
</style>