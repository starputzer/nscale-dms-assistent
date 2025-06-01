<template>
  <Transition :name="transitionName" :duration="transitionDuration">
    <div
      v-if="modelValue || isActive"
      ref="overlayRef"
      class="n-loading-overlay"
      :class="[
        overlayClass,
        {
          'n-loading-overlay--fullscreen': fullscreen,
          'n-loading-overlay--fixed': fixed,
          'n-loading-overlay--blur': blur,
          'n-loading-overlay--fade-background': fadeBackground,
          [`n-loading-overlay--${color}`]: !!color,
        },
      ]"
      :style="overlayStyle"
      :aria-busy="modelValue || isActive ? 'true' : 'false'"
      :aria-hidden="modelValue || isActive ? 'false' : 'true'"
      :role="fullscreen ? 'dialog' : 'status'"
      :aria-modal="fullscreen ? 'true' : undefined"
      :aria-label="ariaLabel || $t('loading.ariaLabel')"
    >
      <div class="n-loading-overlay__content" :class="contentClass">
        <!-- Spinner or custom loader -->
        <div class="n-loading-overlay__spinner">
          <slot name="spinner">
            <component :is="loaderComponent" v-if="loaderComponent" />
            <ProgressIndicator
              v-else-if="progress !== undefined"
              :value="progress"
              :type="progressType"
              :size="progressSize"
              :indeterminate="progress === null"
              :show-label="showProgressLabel"
              :aria-label="$t('loading.progress', { progress })"
            />
            <SpinnerIcon v-else />
          </slot>
        </div>

        <!-- Loading text -->
        <div v-if="text" class="n-loading-overlay__text">
          {{ text }}
        </div>

        <!-- Additional content slot -->
        <div v-if="$slots.default" class="n-loading-overlay__additional">
          <slot></slot>
        </div>

        <!-- Action button (like cancel) -->
        <div
          v-if="$slots.action || actionText"
          class="n-loading-overlay__action"
        >
          <slot name="action">
            <button
              v-if="actionText"
              class="n-loading-overlay__action-button"
              type="button"
              @click="$emit('action')"
            >
              {{ actionText }}
            </button>
          </slot>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import SpinnerIcon from "@/components/icons/SpinnerIcon.vue";
import ProgressIndicator from "./ProgressIndicator.vue";

const { t } = useI18n();

/**
 * Props für die LoadingOverlay-Komponente
 */
export interface LoadingOverlayProps {
  /**
   * Ob die Overlay angezeigt werden soll
   */
  modelValue?: boolean;

  /**
   * Verzögerung vor dem Anzeigen in Millisekunden
   */
  delay?: number;

  /**
   * Minimale Anzeigedauer in Millisekunden
   */
  minDuration?: number;

  /**
   * Text, der angezeigt werden soll
   */
  text?: string;

  /**
   * Ob die Overlay den ganzen Bildschirm ausfüllen soll
   */
  fullscreen?: boolean;

  /**
   * Ob die Overlay mit position: fixed positioniert werden soll
   */
  fixed?: boolean;

  /**
   * Z-Index der Overlay
   */
  zIndex?: number;

  /**
   * Ob der Hintergrund unscharf gemacht werden soll
   */
  blur?: boolean;

  /**
   * Ob der Hintergrund eingeblendet werden soll
   */
  fadeBackground?: boolean;

  /**
   * Farbe der Overlay (primary, secondary, info, success, warning, error)
   */
  color?: "primary" | "secondary" | "info" | "success" | "warning" | "error";

  /**
   * Benutzerdefinierte CSS-Klasse für die Overlay
   */
  overlayClass?: string | object | Array<string | object>;

  /**
   * Benutzerdefinierte CSS-Klasse für den Inhalt
   */
  contentClass?: string | object | Array<string | object>;

  /**
   * Benutzerdefinierter Inline-Style für die Overlay
   */
  overlayStyle?: object;

  /**
   * Name der Übergangsanimation
   */
  transition?: string;

  /**
   * Dauer der Übergangsanimation in ms
   */
  transitionDuration?: number | { enter: number; leave: number };

  /**
   * Ob die Animation überhaupt angezeigt werden soll
   */
  disableTransition?: boolean;

  /**
   * Fortschritt (0-100), wenn ein Fortschrittsbalken angezeigt werden soll
   * `null` für unbestimmt, `undefined` für keinen Fortschrittsbalken
   */
  progress?: number | null;

  /**
   * Typ des Fortschrittsbalkens
   */
  progressType?: "linear" | "circular";

  /**
   * Größe des Fortschrittsbalkens
   */
  progressSize?: "small" | "medium" | "large";

  /**
   * Ob das Label für den Fortschritt angezeigt werden soll
   */
  showProgressLabel?: boolean;

  /**
   * Text für den Aktionsbutton
   */
  actionText?: string;

  /**
   * ARIA-Label für die Overlay
   */
  ariaLabel?: string;

  /**
   * Komponente für den Loader
   */
  loaderComponent?: any;

  /**
   * Ob die Scrollbarkeit des Dokuments deaktiviert werden soll
   */
  lockScroll?: boolean;
}

const props = withDefaults(defineProps<LoadingOverlayProps>(), {
  modelValue: false,
  delay: 300,
  minDuration: 400,
  fullscreen: false,
  fixed: false,
  zIndex: 1050,
  blur: false,
  fadeBackground: true,
  transition: "n-fade",
  transitionDuration: 300,
  disableTransition: false,
  progressType: "circular",
  progressSize: "medium",
  showProgressLabel: true,
  lockScroll: true,
});

/**
 * Emits
 */
const emit = defineEmits<{
  /**
   * Wird ausgelöst, wenn sich der Sichtbarkeitsstatus ändert
   */
  (e: "update:modelValue", value: boolean): void;

  /**
   * Wird ausgelöst, wenn der Aktionsbutton geklickt wird
   */
  (e: "action"): void;

  /**
   * Wird ausgelöst, wenn die Overlay angezeigt wird
   */
  (e: "show"): void;

  /**
   * Wird ausgelöst, wenn die Overlay ausgeblendet wird
   */
  (e: "hide"): void;
}>();

// Refs und interner Zustand
const overlayRef = ref<HTMLElement | null>(null);
const delayTimeout = ref<number | null>(null);
const minDurationTimeout = ref<number | null>(null);
const startTime = ref<number>(0);
const isActive = ref<boolean>(false);
const hasBeenShown = ref<boolean>(false);

/**
 * Berechnete Eigenschaften
 */
const transitionName = computed(() => {
  if (props.disableTransition) return "";
  return props.transition;
});

/**
 * Watcher für Änderungen am modelValue
 */
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      show();
    } else {
      hide();
    }
  },
  { immediate: true },
);

/**
 * Anzeigen der Overlay mit Verzögerung
 */
function show(): void {
  // Falls bereits ein Timeout läuft, diesen abbrechen
  if (delayTimeout.value !== null) {
    window.clearTimeout(delayTimeout.value);
    delayTimeout.value = null;
  }

  // Wenn bereits aktiv, nichts tun
  if (isActive.value) return;

  // Verzögerung anwenden
  if (props.delay > 0) {
    delayTimeout.value = window.setTimeout(() => {
      activateOverlay();
    }, props.delay);
  } else {
    activateOverlay();
  }
}

/**
 * Aktiviert die Overlay
 */
function activateOverlay(): void {
  startTime.value = Date.now();
  isActive.value = true;
  hasBeenShown.value = true;
  emit("show");

  // Body-Scroll sperren, wenn fullscreen
  if (props.fullscreen && props.lockScroll && typeof document !== "undefined") {
    document.body.style.overflow = "hidden";
  }
}

/**
 * Ausblenden der Overlay mit minimaler Anzeigedauer
 */
function hide(): void {
  // Falls bereits ein Timeout läuft, diesen abbrechen
  if (delayTimeout.value !== null) {
    window.clearTimeout(delayTimeout.value);
    delayTimeout.value = null;
  }

  // Wenn nicht aktiv, nichts tun
  if (!isActive.value) return;

  // Minimale Anzeigedauer beachten
  const elapsedTime = Date.now() - startTime.value;
  const remainingTime = Math.max(0, props.minDuration - elapsedTime);

  if (remainingTime > 0 && hasBeenShown.value) {
    minDurationTimeout.value = window.setTimeout(() => {
      deactivateOverlay();
    }, remainingTime);
  } else {
    deactivateOverlay();
  }
}

/**
 * Deaktiviert die Overlay
 */
function deactivateOverlay(): void {
  isActive.value = false;
  emit("hide");

  // Body-Scroll wiederherstellen
  if (props.fullscreen && props.lockScroll && typeof document !== "undefined") {
    document.body.style.overflow = "";
  }
}

/**
 * Zwingt die Overlay, sofort anzuzeigen
 */
function forceShow(): void {
  if (delayTimeout.value !== null) {
    window.clearTimeout(delayTimeout.value);
    delayTimeout.value = null;
  }
  activateOverlay();
}

/**
 * Zwingt die Overlay, sofort auszublenden
 */
function forceHide(): void {
  if (minDurationTimeout.value !== null) {
    window.clearTimeout(minDurationTimeout.value);
    minDurationTimeout.value = null;
  }
  deactivateOverlay();
}

/**
 * Lifecycle-Hooks
 */
onMounted(() => {
  // Wenn modelValue initial true ist, direkt anzeigen
  if (props.modelValue) {
    show();
  }
});

onBeforeUnmount(() => {
  // Timeouts aufräumen
  if (delayTimeout.value !== null) {
    window.clearTimeout(delayTimeout.value);
  }

  if (minDurationTimeout.value !== null) {
    window.clearTimeout(minDurationTimeout.value);
  }

  // Body-Scroll wiederherstellen
  if (
    isActive.value &&
    props.fullscreen &&
    props.lockScroll &&
    typeof document !== "undefined"
  ) {
    document.body.style.overflow = "";
  }
});

// Diese Methoden auch nach außen verfügbar machen
defineExpose({
  forceShow,
  forceHide,
});
</script>

<style scoped>
.n-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--n-loading-overlay-bg, rgba(255, 255, 255, 0.8));
  z-index: v-bind("props.zIndex");
}

.n-loading-overlay--fullscreen {
  position: fixed;
  z-index: v-bind("props.zIndex + 100");
}

.n-loading-overlay--fixed {
  position: fixed;
}

.n-loading-overlay--blur {
  backdrop-filter: blur(4px);
}

.n-loading-overlay--fade-background {
  background-color: var(--n-loading-overlay-bg-fade, rgba(255, 255, 255, 0.9));
}

.n-loading-overlay__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  border-radius: var(--n-border-radius, 8px);
  background-color: var(--n-loading-content-bg, rgba(255, 255, 255, 0.95));
  box-shadow: var(--n-loading-content-shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
  max-width: 80%;
  text-align: center;
}

.n-loading-overlay--fullscreen .n-loading-overlay__content {
  min-width: 200px;
}

.n-loading-overlay__spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 0.75rem;
  color: var(--n-loading-spinner-color, #3b82f6);
  width: 40px;
  height: 40px;
}

.n-loading-overlay__text {
  margin-bottom: 0.75rem;
  font-size: 1rem;
  color: var(--n-loading-text-color, #1a202c);
  font-weight: 500;
  max-width: 100%;
  word-break: break-word;
}

.n-loading-overlay__additional {
  margin-bottom: 0.75rem;
  max-width: 100%;
}

.n-loading-overlay__action {
  margin-top: 0.5rem;
}

.n-loading-overlay__action-button {
  padding: 0.375rem 1rem;
  font-size: 0.875rem;
  border-radius: var(--n-border-radius-sm, 0.25rem);
  border: 1px solid var(--n-border-color, #e2e8f0);
  background-color: var(--n-button-bg, #f8fafc);
  color: var(--n-button-color, #3b82f6);
  cursor: pointer;
  transition: all 0.2s ease;
}

.n-loading-overlay__action-button:hover {
  background-color: var(--n-button-hover-bg, #f1f5f9);
}

.n-loading-overlay__action-button:active {
  transform: translateY(1px);
}

/* Color Varianten */
.n-loading-overlay--primary .n-loading-overlay__spinner {
  color: var(--n-primary-color, #3b82f6);
}

.n-loading-overlay--secondary .n-loading-overlay__spinner {
  color: var(--n-secondary-color, #6b7280);
}

.n-loading-overlay--info .n-loading-overlay__spinner {
  color: var(--n-info-color, #3b82f6);
}

.n-loading-overlay--success .n-loading-overlay__spinner {
  color: var(--n-success-color, #10b981);
}

.n-loading-overlay--warning .n-loading-overlay__spinner {
  color: var(--n-warning-color, #f59e0b);
}

.n-loading-overlay--error .n-loading-overlay__spinner {
  color: var(--n-error-color, #ef4444);
}

/* Animationen */
.n-fade-enter-active,
.n-fade-leave-active {
  transition: opacity
    v-bind(
      'typeof props.transitionDuration === "object" ? props.transitionDuration.enter : props.transitionDuration'
    )
    ms ease;
}

.n-fade-enter-from,
.n-fade-leave-to {
  opacity: 0;
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  .n-loading-overlay {
    background-color: var(--n-loading-overlay-bg-dark, rgba(26, 32, 44, 0.8));
  }

  .n-loading-overlay--fade-background {
    background-color: var(
      --n-loading-overlay-bg-fade-dark,
      rgba(26, 32, 44, 0.9)
    );
  }

  .n-loading-overlay__content {
    background-color: var(--n-loading-content-bg-dark, rgba(45, 55, 72, 0.95));
    box-shadow: var(
      --n-loading-content-shadow-dark,
      0 4px 12px rgba(0, 0, 0, 0.3)
    );
  }

  .n-loading-overlay__text {
    color: var(--n-loading-text-color-dark, #f7fafc);
  }

  .n-loading-overlay__action-button {
    border-color: var(--n-border-color-dark, #4a5568);
    background-color: var(--n-button-bg-dark, #2d3748);
    color: var(--n-button-color-dark, #63b3ed);
  }

  .n-loading-overlay__action-button:hover {
    background-color: var(--n-button-hover-bg-dark, #4a5568);
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .n-fade-enter-active,
  .n-fade-leave-active {
    transition-duration: 0.01ms !important;
  }
}

/* Responsive Design */
@media (max-width: 640px) {
  .n-loading-overlay__content {
    width: 90%;
    padding: 1rem;
  }
}
</style>
