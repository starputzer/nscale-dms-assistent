// components/common/ToastContainer.vue
<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast', `toast-${toast.type}`, { 'toast-visible': toast.visible }]"
          role="alert"
        >
          <div class="toast-icon">
            <i :class="getIconClass(toast.type)"></i>
          </div>
          <div class="toast-content">
            <div class="toast-message">{{ toast.message }}</div>
          </div>
          <button 
            v-if="toast.dismissible" 
            class="toast-close" 
            @click="dismissToast(toast.id)"
            aria-label="Schließen"
          >
            <i class="fas fa-times"></i>
          </button>
          <div class="toast-progress-container">
            <div 
              class="toast-progress" 
              :style="{ width: `${toast.progress}%` }"
            ></div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToastContainer, useToast } from '@/composables/useToast';

// Toast-Daten holen
const { toasts } = useToastContainer();
const { dismissToast } = useToast();

// Icon-Klassen nach Toast-Typ
const getIconClass = (type) => {
  switch (type) {
    case 'success':
      return 'fas fa-check-circle';
    case 'error':
      return 'fas fa-exclamation-circle';
    case 'warning':
      return 'fas fa-exclamation-triangle';
    case 'info':
    default:
      return 'fas fa-info-circle';
  }
};
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 400px;
  width: calc(100% - 2rem);
}

.toast {
  position: relative;
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background-color: white;
  border-left: 4px solid;
  overflow: hidden;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.toast-visible {
  transform: translateX(0);
  opacity: 1;
}

.toast-enter-from,
.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.toast-enter-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.toast-leave-active {
  position: absolute;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.toast-move {
  transition: transform 0.3s ease;
}

.toast-icon {
  flex-shrink: 0;
  margin-right: 0.75rem;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.toast-content {
  flex-grow: 1;
  padding-right: 0.75rem;
}

.toast-message {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
}

.toast-close {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
  color: inherit;
  opacity: 0.7;
}

.toast-close:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.1);
}

.toast-progress-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background-color: rgba(0, 0, 0, 0.1);
}

.toast-progress {
  height: 100%;
  transition: width 0.1s linear;
}

/* Toast-Typen */
.toast-success {
  border-left-color: var(--nscale-primary, #00a550);
}

.toast-success .toast-icon {
  color: var(--nscale-primary, #00a550);
}

.toast-success .toast-progress {
  background-color: var(--nscale-primary, #00a550);
}

.toast-error {
  border-left-color: var(--nscale-red, #e53e3e);
}

.toast-error .toast-icon {
  color: var(--nscale-red, #e53e3e);
}

.toast-error .toast-progress {
  background-color: var(--nscale-red, #e53e3e);
}

.toast-warning {
  border-left-color: var(--nscale-yellow, #f6ad55);
}

.toast-warning .toast-icon {
  color: var(--nscale-yellow, #f6ad55);
}

.toast-warning .toast-progress {
  background-color: var(--nscale-yellow, #f6ad55);
}

.toast-info {
  border-left-color: var(--nscale-blue, #3182ce);
}

.toast-info .toast-icon {
  color: var(--nscale-blue, #3182ce);
}

.toast-info .toast-progress {
  background-color: var(--nscale-blue, #3182ce);
}

/* Dark Mode Anpassungen */
:global(.theme-dark) .toast {
  background-color: #1e1e1e;
  color: #f0f0f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

:global(.theme-dark) .toast-close:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

:global(.theme-dark) .toast-progress-container {
  background-color: rgba(255, 255, 255, 0.1);
}

:global(.theme-dark) .toast-success {
  border-left-color: #00c060;
}

:global(.theme-dark) .toast-success .toast-icon {
  color: #00c060;
}

:global(.theme-dark) .toast-success .toast-progress {
  background-color: #00c060;
}

/* Kontrast-Modus Anpassungen */
:global(.theme-contrast) .toast {
  background-color: #000000;
  color: #ffeb3b;
  border: 2px solid #ffeb3b;
  border-left-width: 4px;
  box-shadow: 0 4px 12px rgba(255, 235, 59, 0.2);
}

:global(.theme-contrast) .toast-close {
  color: #ffeb3b;
}

:global(.theme-contrast) .toast-close:hover {
  background-color: #333300;
}

:global(.theme-contrast) .toast-progress-container {
  background-color: #333300;
}

:global(.theme-contrast) .toast-success,
:global(.theme-contrast) .toast-info,
:global(.theme-contrast) .toast-warning {
  border-color: #ffeb3b;
}

:global(.theme-contrast) .toast-success .toast-icon,
:global(.theme-contrast) .toast-info .toast-icon,
:global(.theme-contrast) .toast-warning .toast-icon {
  color: #ffeb3b;
}

:global(.theme-contrast) .toast-success .toast-progress,
:global(.theme-contrast) .toast-info .toast-progress,
:global(.theme-contrast) .toast-warning .toast-progress {
  background-color: #ffeb3b;
}

:global(.theme-contrast) .toast-error {
  border-color: #ff4444;
}

:global(.theme-contrast) .toast-error .toast-icon {
  color: #ff4444;
}

:global(.theme-contrast) .toast-error .toast-progress {
  background-color: #ff4444;
}
</style>