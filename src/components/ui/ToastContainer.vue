<template>
  <div class="toast-container" :class="containerPosition">
    <transition-group name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="['toast--' + toast.type, { 'toast--with-icon': showIcons }]"
      >
        <div v-if="showIcons" class="toast-icon">
          <i :class="getIconClass(toast.type)"></i>
        </div>
        <div class="toast-content">
          <div class="toast-message">{{ toast.message }}</div>
        </div>
        <button
          class="toast-close"
          @click="dismiss(toast.id)"
          aria-label="Benachrichtigung schließen"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useToast } from "@/composables/useToast";

/**
 * Toast-Container Props
 */
interface ToastContainerProps {
  /**
   * Position des Toast-Containers
   */
  position?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "bottom-center";

  /**
   * Gibt an, ob Icons angezeigt werden sollen
   */
  showIcons?: boolean;

  /**
   * Maximale Anzahl gleichzeitiger Toasts
   */
  maxToasts?: number;
}

const props = withDefaults(defineProps<ToastContainerProps>(), {
  position: "bottom-right",
  showIcons: true,
  maxToasts: 5,
});

// Toast-Service verwenden
const { toasts, dismiss } = useToast();

// Nur die Toasts anzeigen, die zur ausgewählten Position gehören
// oder alle, wenn keine Position im Toast spezifiziert ist
const filteredToasts = computed(() => {
  return toasts
    .filter((toast) => !toast.position || toast.position === props.position)
    .slice(0, props.maxToasts);
});

// CSS-Klasse für die Container-Position
const containerPosition = computed(() => {
  return `toast-container--${props.position}`;
});

/**
 * Gibt die Icon-Klasse für den Toast-Typ zurück
 */
function getIconClass(type: string): string {
  switch (type) {
    case "success":
      return "fas fa-check-circle";
    case "error":
      return "fas fa-exclamation-circle";
    case "warning":
      return "fas fa-exclamation-triangle";
    case "info":
    default:
      return "fas fa-info-circle";
  }
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  max-width: 350px;
  gap: 8px;
  pointer-events: none;
}

/* Positionierungen */
.toast-container--top-right {
  top: 16px;
  right: 16px;
}

.toast-container--top-left {
  top: 16px;
  left: 16px;
}

.toast-container--bottom-right {
  bottom: 16px;
  right: 16px;
}

.toast-container--bottom-left {
  bottom: 16px;
  left: 16px;
}

.toast-container--top-center {
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
}

.toast-container--bottom-center {
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
}

.toast {
  padding: 12px 16px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  position: relative;
  background-color: white;
  color: #333;
  max-width: 100%;
  min-width: 250px;
  animation: slideIn 0.3s ease-out;
  pointer-events: auto;
}

.toast--success {
  border-left: 4px solid #10b981;
  background-color: #ecfdf5;
}

.toast--error {
  border-left: 4px solid #ef4444;
  background-color: #fef2f2;
}

.toast--warning {
  border-left: 4px solid #f59e0b;
  background-color: #fffbeb;
}

.toast--info {
  border-left: 4px solid #3b82f6;
  background-color: #eff6ff;
}

.toast--with-icon {
  padding-left: 12px;
}

.toast-icon {
  margin-right: 12px;
  font-size: 18px;
  display: flex;
  align-items: center;
}

.toast--success .toast-icon {
  color: #10b981;
}

.toast--error .toast-icon {
  color: #ef4444;
}

.toast--warning .toast-icon {
  color: #f59e0b;
}

.toast--info .toast-icon {
  color: #3b82f6;
}

.toast-content {
  flex: 1;
  margin-right: 16px;
}

.toast-message {
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.toast-close {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.toast-close:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #475569;
}

/* Animationen */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 480px) {
  .toast-container {
    left: 16px;
    right: 16px;
    max-width: calc(100% - 32px);
    width: calc(100% - 32px);
  }

  .toast-container--top-center,
  .toast-container--bottom-center {
    transform: none;
  }

  .toast {
    min-width: 0;
    width: 100%;
  }
}
</style>
