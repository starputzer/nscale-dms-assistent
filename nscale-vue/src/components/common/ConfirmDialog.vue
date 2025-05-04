<template>
  <div class="confirm-dialog-overlay" v-if="show" @click="emit('cancel')">
    <div class="confirm-dialog" @click.stop>
      <div class="dialog-header">
        <h3>{{ title }}</h3>
        <button class="close-btn" @click="emit('cancel')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="dialog-body">
        <div class="dialog-icon">
          <i :class="['fas', iconClass]"></i>
        </div>
        <p class="dialog-message">{{ message }}</p>
      </div>
      
      <div class="dialog-footer">
        <button 
          type="button" 
          class="cancel-btn" 
          @click="emit('cancel')"
        >
          {{ cancelText }}
        </button>
        <button 
          type="button" 
          :class="['confirm-btn', buttonClass]" 
          @click="emit('confirm')"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

// Props
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Bestätigung'
  },
  message: {
    type: String,
    default: 'Möchten Sie diese Aktion wirklich durchführen?'
  },
  type: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'danger', 'warning', 'info'].includes(value)
  },
  confirmText: {
    type: String,
    default: 'Bestätigen'
  },
  cancelText: {
    type: String,
    default: 'Abbrechen'
  }
});

// Emits
const emit = defineEmits(['confirm', 'cancel']);

// Computed properties
const iconClass = computed(() => {
  switch (props.type) {
    case 'danger':
      return 'fa-exclamation-circle';
    case 'warning':
      return 'fa-exclamation-triangle';
    case 'info':
      return 'fa-info-circle';
    default:
      return 'fa-question-circle';
  }
});

const buttonClass = computed(() => {
  switch (props.type) {
    case 'danger':
      return 'confirm-btn-danger';
    case 'warning':
      return 'confirm-btn-warning';
    case 'info':
      return 'confirm-btn-info';
    default:
      return 'confirm-btn-primary';
  }
});
</script>

<style scoped>
.confirm-dialog-overlay {
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

.confirm-dialog {
  background-color: white;
  border-radius: 0.5rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.dialog-header h3 {
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

.dialog-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.dialog-icon {
  margin-bottom: 1rem;
  font-size: 2.5rem;
}

.dialog-icon .fa-exclamation-circle {
  color: #ef4444;
}

.dialog-icon .fa-exclamation-triangle {
  color: #f59e0b;
}

.dialog-icon .fa-info-circle {
  color: #3b82f6;
}

.dialog-icon .fa-question-circle {
  color: #6366f1;
}

.dialog-message {
  margin: 0;
  color: #475569;
  font-size: 1rem;
  line-height: 1.5;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.cancel-btn, .confirm-btn {
  padding: 0.625rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.cancel-btn {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.cancel-btn:hover {
  background-color: #e2e8f0;
}

.confirm-btn {
  border: none;
  color: white;
}

.confirm-btn-primary {
  background-color: #3b82f6;
}

.confirm-btn-primary:hover {
  background-color: #2563eb;
}

.confirm-btn-danger {
  background-color: #ef4444;
}

.confirm-btn-danger:hover {
  background-color: #dc2626;
}

.confirm-btn-warning {
  background-color: #f59e0b;
}

.confirm-btn-warning:hover {
  background-color: #d97706;
}

.confirm-btn-info {
  background-color: #3b82f6;
}

.confirm-btn-info:hover {
  background-color: #2563eb;
}

/* Dark Mode Support */
:global(.theme-dark) .confirm-dialog {
  background-color: #1e1e1e;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
}

:global(.theme-dark) .dialog-header {
  border-bottom-color: #333;
}

:global(.theme-dark) .dialog-header h3 {
  color: #e0e0e0;
}

:global(.theme-dark) .close-btn {
  color: #aaa;
}

:global(.theme-dark) .close-btn:hover {
  color: #ef4444;
}

:global(.theme-dark) .dialog-message {
  color: #bbb;
}

:global(.theme-dark) .dialog-footer {
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

:global(.theme-dark) .confirm-btn-primary {
  background-color: #2563eb;
}

:global(.theme-dark) .confirm-btn-primary:hover {
  background-color: #1d4ed8;
}

:global(.theme-dark) .confirm-btn-danger {
  background-color: #dc2626;
}

:global(.theme-dark) .confirm-btn-danger:hover {
  background-color: #b91c1c;
}

:global(.theme-dark) .confirm-btn-warning {
  background-color: #d97706;
}

:global(.theme-dark) .confirm-btn-warning:hover {
  background-color: #b45309;
}

:global(.theme-dark) .confirm-btn-info {
  background-color: #2563eb;
}

:global(.theme-dark) .confirm-btn-info:hover {
  background-color: #1d4ed8;
}

/* Contrast mode */
:global(.theme-contrast) .confirm-dialog {
  background-color: #000;
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .dialog-header {
  border-bottom-color: #ffeb3b;
}

:global(.theme-contrast) .dialog-header h3 {
  color: #ffeb3b;
}

:global(.theme-contrast) .dialog-message {
  color: #fff;
}

:global(.theme-contrast) .dialog-footer {
  border-top-color: #ffeb3b;
}

:global(.theme-contrast) .confirm-btn, 
:global(.theme-contrast) .cancel-btn {
  border: 2px solid #ffeb3b;
  color: #000;
  background-color: #ffeb3b;
  font-weight: bold;
}

:global(.theme-contrast) .cancel-btn:hover,
:global(.theme-contrast) .confirm-btn:hover {
  background-color: #000;
  color: #ffeb3b;
}
</style>