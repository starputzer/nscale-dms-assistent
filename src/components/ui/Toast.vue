<template>
  <Teleport to="body">
    <div 
      v-if="visibleToasts.length > 0"
      class="n-toast-container"
      :class="[`n-toast-container--${position}`]"
      :style="containerStyle"
      aria-live="polite"
      aria-atomic="true"
    >
      <TransitionGroup 
        name="n-toast"
        tag="div"
        :class="['n-toast-list', { 'n-toast-list--reversed': isPositionBottomAligned }]"
        @after-leave="checkQueue"
      >
        <div 
          v-for="toast in visibleToasts" 
          :key="toast.id"
          class="n-toast"
          :class="[
            `n-toast--${toast.type}`, 
            { 'n-toast--with-title': !!toast.title },
            { 'n-toast--with-action': !!toast.action },
            toast.customClass
          ]"
          role="alert"
          :aria-label="`${toast.type} ${toast.title ? toast.title + ':' : ''} ${toast.message}`"
          @mouseenter="pauseToast(toast)"
          @mouseleave="resumeToast(toast)"
        >
          <div v-if="toast.showIcon" class="n-toast__icon">
            <component :is="getIconComponent(toast.type)" />
          </div>
          
          <div class="n-toast__content">
            <div v-if="toast.title" class="n-toast__title">{{ toast.title }}</div>
            <div class="n-toast__message">{{ toast.message }}</div>
            
            <button 
              v-if="toast.action"
              class="n-toast__action-button"
              type="button"
              @click="handleAction(toast)"
            >
              {{ toast.action.label }}
            </button>
          </div>
          
          <button 
            v-if="toast.closable"
            class="n-toast__close"
            type="button"
            @click="() => dismissToast(toast.id)"
            :aria-label="$t('toast.close')"
          >
            <CloseIcon />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { toastService, type Toast, type ToastPosition } from '@/services/ui/ToastService';

// Icons
import SuccessIcon from '@/components/icons/SuccessIcon.vue';
import ErrorIcon from '@/components/icons/ErrorIcon.vue';
import WarningIcon from '@/components/icons/WarningIcon.vue';
import InfoIcon from '@/components/icons/InfoIcon.vue';
import CloseIcon from '@/components/icons/CloseIcon.vue';

// Internationalisierung
const { t } = useI18n();

/**
 * Toast Container Props
 */
export interface ToastContainerProps {
  /**
   * Position des Toast-Containers
   */
  position?: ToastPosition;
  
  /**
   * Maximale Anzahl gleichzeitig angezeigter Toasts
   */
  limit?: number;
  
  /**
   * Abstand vom Rand in Pixeln
   */
  offset?: number;
  
  /**
   * Gibt an, ob die Toasts automatisch pausiert werden sollen, wenn der Mauszeiger darüber ist
   */
  pauseOnHover?: boolean;
  
  /**
   * Z-Index des Toast-Containers
   */
  zIndex?: number;
}

const props = withDefaults(defineProps<ToastContainerProps>(), {
  position: 'bottom-right',
  limit: 5,
  offset: 16,
  pauseOnHover: true,
  zIndex: 9999
});

// Map für pausierte Toasts (ID -> setTimeout-ID)
const pausedToasts = ref<Map<string, number>>(new Map());

// Berechneter Container-Style basierend auf den Props
const containerStyle = computed(() => {
  return {
    zIndex: `${props.zIndex}`,
    [`${getPositionSide(props.position).y}`]: `${props.offset}px`,
    [`${getPositionSide(props.position).x}`]: `${props.offset}px`
  };
});

// Prüft, ob die Position unten ausgerichtet ist (für umgekehrte Reihenfolge)
const isPositionBottomAligned = computed(() => {
  return props.position.startsWith('bottom');
});

// Berechnet die sichtbaren Toasts basierend auf der Position und dem Limit
const visibleToasts = computed(() => {
  // Filtere Toasts für die aktuelle Position
  let filteredToasts = toastService.toasts.filter(toast => 
    toast.position === props.position
  );
  
  // Sortiere nach Zeitstempel (neueste zuerst)
  filteredToasts = filteredToasts.sort((a, b) => 
    b.timestamp.getTime() - a.timestamp.getTime()
  );
  
  // Wende das Limit an
  if (props.limit && props.limit > 0) {
    filteredToasts = filteredToasts.slice(0, props.limit);
  }
  
  return filteredToasts;
});

// Gibt die Icon-Komponente für den Toast-Typ zurück
function getIconComponent(type: string) {
  switch (type) {
    case 'success': return SuccessIcon;
    case 'error': return ErrorIcon;
    case 'warning': return WarningIcon;
    case 'info': 
    default: return InfoIcon;
  }
}

// Entfernt einen Toast
function dismissToast(id: string) {
  toastService.remove(id);
}

// Behandelt die Aktion eines Toasts
function handleAction(toast: Toast) {
  if (toast.action && toast.action.onClick) {
    toast.action.onClick();
  }
  
  // Toast automatisch schließen, wenn closeOnClick nicht explizit auf false gesetzt ist
  if (toast.action && toast.action.closeOnClick !== false) {
    dismissToast(toast.id);
  }
}

// Pausiert einen Toast (stoppt den Timer)
function pauseToast(toast: Toast) {
  if (!props.pauseOnHover || toast.duration <= 0) return;
  
  const timeLeft = (toast as any).__timeoutEnd - Date.now();
  if (timeLeft <= 0) return;
  
  // Löschen des aktuellen Timeouts
  if ((toast as any).__timeoutId) {
    clearTimeout((toast as any).__timeoutId);
    (toast as any).__timeoutId = null;
  }
  
  // Speichern der verbleibenden Zeit
  pausedToasts.value.set(toast.id, timeLeft);
}

// Setzt einen pausierten Toast fort
function resumeToast(toast: Toast) {
  if (!props.pauseOnHover || toast.duration <= 0) return;
  
  const timeLeft = pausedToasts.value.get(toast.id);
  if (!timeLeft) return;
  
  // Entfernen aus der Map
  pausedToasts.value.delete(toast.id);
  
  // Neuen Timeout mit der verbleibenden Zeit setzen
  (toast as any).__timeoutId = setTimeout(() => {
    dismissToast(toast.id);
  }, timeLeft);
  
  // Neue Ende-Zeit setzen
  (toast as any).__timeoutEnd = Date.now() + timeLeft;
}

// Prüft die Warteschlange und zeigt ggf. neue Toasts an
function checkQueue() {
  if (toastService.queueSize > 0 && visibleToasts.value.length < props.limit) {
    // Der ToastService kümmert sich bereits um das Queue Processing
  }
}

// Hilfsfunktion, um die richtigen CSS-Positionswerte zu erhalten
function getPositionSide(position: ToastPosition): { x: string, y: string } {
  const positions: Record<ToastPosition, { x: string, y: string }> = {
    'top-right': { y: 'top', x: 'right' },
    'top-left': { y: 'top', x: 'left' },
    'bottom-right': { y: 'bottom', x: 'right' },
    'bottom-left': { y: 'bottom', x: 'left' },
    'top-center': { y: 'top', x: 'left' }, // 'left' mit transform: translateX(-50%)
    'bottom-center': { y: 'bottom', x: 'left' } // 'left' mit transform: translateX(-50%)
  };
  
  return positions[position];
}

// Bei Änderung des Limits oder der Position
watch(() => props.limit, (newLimit) => {
  toastService.setMaxToasts(newLimit);
});

// Bei der Komponenten-Initialisierung
onMounted(() => {
  // Setze das Limit im Service
  toastService.setMaxToasts(props.limit);
});
</script>

<style scoped>
.n-toast-container {
  position: fixed;
  display: flex;
  flex-direction: column;
  max-width: 400px;
  width: calc(100% - 32px);
  pointer-events: none;
  box-sizing: border-box;
}

.n-toast-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.n-toast-list--reversed {
  flex-direction: column-reverse;
}

/* Positionen */
.n-toast-container--top-center,
.n-toast-container--bottom-center {
  left: 50%;
  transform: translateX(-50%);
}

.n-toast {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  border-radius: var(--n-border-radius, 4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background-color: var(--n-background-color, #ffffff);
  color: var(--n-text-color, #1a202c);
  pointer-events: auto;
  max-width: 100%;
  overflow: hidden;
  position: relative;
  animation: n-toast-in 0.3s ease forwards;
}

.n-toast--with-title {
  padding-top: 10px;
  padding-bottom: 10px;
}

.n-toast--with-action {
  padding-bottom: 10px;
}

/* Toast-Typen */
.n-toast--success {
  border-left: 4px solid var(--n-success-color, #10b981);
}

.n-toast--error {
  border-left: 4px solid var(--n-error-color, #ef4444);
}

.n-toast--warning {
  border-left: 4px solid var(--n-warning-color, #f59e0b);
}

.n-toast--info {
  border-left: 4px solid var(--n-info-color, #3b82f6);
}

.n-toast__icon {
  display: flex;
  flex-shrink: 0;
  margin-right: 12px;
  width: 20px;
  height: 20px;
  margin-top: 2px;
}

.n-toast--success .n-toast__icon {
  color: var(--n-success-color, #10b981);
}

.n-toast--error .n-toast__icon {
  color: var(--n-error-color, #ef4444);
}

.n-toast--warning .n-toast__icon {
  color: var(--n-warning-color, #f59e0b);
}

.n-toast--info .n-toast__icon {
  color: var(--n-info-color, #3b82f6);
}

.n-toast__content {
  flex: 1;
  min-width: 0;
}

.n-toast__title {
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 4px;
  color: var(--n-toast-title-color, var(--n-text-color, #1a202c));
}

.n-toast__message {
  font-size: 0.875rem;
  line-height: 1.5;
  word-break: break-word;
  color: var(--n-toast-message-color, var(--n-text-secondary-color, #4a5568));
}

.n-toast__action-button {
  display: inline-block;
  margin-top: 8px;
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 500;
  border: none;
  background-color: transparent;
  border-radius: var(--n-border-radius-sm, 2px);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.n-toast--success .n-toast__action-button {
  color: var(--n-success-color, #10b981);
}

.n-toast--success .n-toast__action-button:hover {
  background-color: rgba(16, 185, 129, 0.1);
}

.n-toast--error .n-toast__action-button {
  color: var(--n-error-color, #ef4444);
}

.n-toast--error .n-toast__action-button:hover {
  background-color: rgba(239, 68, 68, 0.1);
}

.n-toast--warning .n-toast__action-button {
  color: var(--n-warning-color, #f59e0b);
}

.n-toast--warning .n-toast__action-button:hover {
  background-color: rgba(245, 158, 11, 0.1);
}

.n-toast--info .n-toast__action-button {
  color: var(--n-info-color, #3b82f6);
}

.n-toast--info .n-toast__action-button:hover {
  background-color: rgba(59, 130, 246, 0.1);
}

.n-toast__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  padding: 0;
  margin-left: 8px;
  color: var(--n-text-secondary-color, #718096);
  opacity: 0.7;
  cursor: pointer;
  border-radius: 50%;
  transition: opacity 0.2s ease, background-color 0.2s ease;
  flex-shrink: 0;
}

.n-toast__close:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.05);
}

/* Animationen */
@keyframes n-toast-in {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.n-toast-enter-active {
  animation: n-toast-in 0.3s ease forwards;
}

.n-toast-leave-active {
  transition: all 0.3s ease;
}

.n-toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* Darkmode Support */
@media (prefers-color-scheme: dark) {
  .n-toast {
    background-color: var(--n-background-color-dark, #2d3748);
    color: var(--n-text-color-dark, #f7fafc);
  }
  
  .n-toast__title {
    color: var(--n-toast-title-color-dark, var(--n-text-color-dark, #f7fafc));
  }
  
  .n-toast__message {
    color: var(--n-toast-message-color-dark, var(--n-text-secondary-color-dark, #a0aec0));
  }
  
  .n-toast__close {
    color: var(--n-text-secondary-color-dark, #a0aec0);
  }
  
  .n-toast__close:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .n-toast-enter-active,
  .n-toast-leave-active {
    transition: opacity 0.1s;
    animation: none;
  }
  
  .n-toast-leave-to {
    transform: none;
  }
  
  @keyframes n-toast-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
}

/* Responsive Design */
@media (max-width: 480px) {
  .n-toast-container {
    max-width: 100%;
  }
  
  .n-toast-container--top-center,
  .n-toast-container--bottom-center {
    width: calc(100% - 32px);
    left: 16px;
    transform: none;
  }
}
</style>