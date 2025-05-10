<template>
  <Teleport to="body">
    <!-- Overlay backdrop -->
    <div
      v-if="modelValue && hasBackdrop"
      class="n-drawer-backdrop"
      :class="{ 
        'n-drawer-backdrop--active': modelValue,
        'n-drawer-backdrop--transparent': backdropTransparent
      }"
      @click="handleBackdropClick"
      aria-hidden="true"
    ></div>

    <!-- Drawer container -->
    <div
      ref="drawerRef"
      v-show="modelValue"
      class="n-drawer"
      :class="{ 
        'n-drawer--active': modelValue,
        [`n-drawer--position-${position}`]: true,
        [`n-drawer--size-${size}`]: true,
        'n-drawer--elevated': elevated,
        'n-drawer--borderless': !bordered,
        'n-drawer--fullscreen': fullScreen,
        'n-drawer--nested': nested
      }"
      :style="drawerStyles"
      :aria-hidden="!modelValue"
      :aria-modal="hasBackdrop"
      role="dialog"
      tabindex="-1"
      @keydown.esc="handleEscPress"
    >
      <!-- Header (optional) -->
      <div 
        v-if="$slots.header || title || showCloseButton" 
        class="n-drawer__header"
        :class="{ 'n-drawer__header--with-border': headerBordered }"
      >
        <slot name="header">
          <h3 v-if="title" class="n-drawer__title">{{ title }}</h3>
          <button
            v-if="showCloseButton"
            class="n-drawer__close-button"
            aria-label="Close drawer"
            @click="close"
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </slot>
      </div>

      <!-- Content -->
      <div class="n-drawer__content">
        <slot></slot>
      </div>

      <!-- Footer (optional) -->
      <div 
        v-if="$slots.footer" 
        class="n-drawer__footer"
        :class="{ 'n-drawer__footer--with-border': footerBordered }"
      >
        <slot name="footer"></slot>
      </div>

      <!-- Resize handle (for resizable drawers) -->
      <div
        v-if="resizable"
        class="n-drawer__resize-handle"
        :class="`n-drawer__resize-handle--${position}`"
        @mousedown="startResize"
        @touchstart="startResize"
      ></div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useUIStore } from '../../stores/ui';
import { useFocusTrap } from '../../composables/useFocusTrap';

/**
 * Drawer-Komponente für den nscale DMS Assistenten
 * Bietet ein seitenbasiertes Overlay-Menü/Panel, das von den Rändern des Fensters eingeblendet werden kann
 * @displayName Drawer
 */
export interface DrawerProps {
  /** Steuert die Sichtbarkeit des Drawers (v-model) */
  modelValue: boolean;
  /** Position des Drawers */
  position?: 'left' | 'right' | 'top' | 'bottom';
  /** Größe des Drawers */
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'auto';
  /** Benutzerdefinierte Weite (bei left/right) oder Höhe (bei top/bottom) in px oder % */
  customSize?: string;
  /** Ob der Drawer einen sichtbaren Rahmen hat */
  bordered?: boolean;
  /** Ob der Drawer einen Schattenwurf hat */
  elevated?: boolean;
  /** Ob der Drawer per ESC-Taste geschlossen werden kann */
  closeOnEscape?: boolean;
  /** Titel des Drawers (optional) */
  title?: string;
  /** Ob ein Schließen-Button angezeigt werden soll */
  showCloseButton?: boolean;
  /** Ob ein Backdrop angezeigt werden soll */
  hasBackdrop?: boolean;
  /** Ob ein Klick auf den Backdrop den Drawer schließt */
  closeOnBackdropClick?: boolean;
  /** Ob der Drawer als Vollbild angezeigt werden soll */
  fullScreen?: boolean;
  /** Ob der Drawer in einem anderen Drawer verschachtelt ist */
  nested?: boolean;
  /** Ob der Drawer in der Größe veränderbar sein soll */
  resizable?: boolean;
  /** Minimale Größe bei veränderbarer Größe */
  minSize?: number;
  /** Maximale Größe bei veränderbarer Größe */
  maxSize?: number;
  /** Ob der Header einen Rahmen haben soll */
  headerBordered?: boolean;
  /** Ob der Footer einen Rahmen haben soll */
  footerBordered?: boolean;
  /** Z-Index des Drawers */
  zIndex?: number;
  /** Ob der Backdrop transparent sein soll */
  backdropTransparent?: boolean;
  /** Ob der Drawer-Fokus verwaltet werden soll (für Barrierefreiheit) */
  manageFocus?: boolean;
}

const props = withDefaults(defineProps<DrawerProps>(), {
  position: 'right',
  size: 'medium',
  bordered: true,
  elevated: true,
  closeOnEscape: true,
  showCloseButton: true,
  hasBackdrop: true,
  closeOnBackdropClick: true,
  fullScreen: false,
  nested: false,
  resizable: false,
  minSize: 100,
  maxSize: 600,
  headerBordered: true,
  footerBordered: true,
  zIndex: 1000,
  backdropTransparent: false,
  manageFocus: true
});

const emit = defineEmits<{
  /** Wird ausgelöst, wenn sich der Sichtbarkeitszustand ändert */
  (e: 'update:modelValue', value: boolean): void;
  /** Wird ausgelöst, wenn der Drawer geöffnet wird */
  (e: 'open'): void;
  /** Wird ausgelöst, wenn der Drawer geschlossen wird */
  (e: 'close'): void;
  /** Wird ausgelöst, wenn die Größe des Drawers geändert wird */
  (e: 'resize', size: number): void;
}>();

// UI Store für globale UI-Zustände
const uiStore = useUIStore();

// Reaktive Zustände
const drawerRef = ref<HTMLElement | null>(null);
const isResizing = ref(false);
const currentSize = ref<number>(0);
const startPos = ref<number>(0);
const startSize = ref<number>(0);

// Berechneter Drawer-Stil
const drawerStyles = computed(() => {
  const styles: Record<string, string> = {};
  
  // Z-Index
  styles['z-index'] = props.zIndex.toString();
  
  // Größe basierend auf Position
  if (props.customSize) {
    if (props.position === 'left' || props.position === 'right') {
      styles['width'] = props.customSize;
    } else if (props.position === 'top' || props.position === 'bottom') {
      styles['height'] = props.customSize;
    }
  } else if (isResizing.value && currentSize.value > 0) {
    if (props.position === 'left' || props.position === 'right') {
      styles['width'] = `${currentSize.value}px`;
    } else if (props.position === 'top' || props.position === 'bottom') {
      styles['height'] = `${currentSize.value}px`;
    }
  }
  
  return styles;
});

// Fokus-Verwaltung für Barrierefreiheit
const { activate: activateFocusTrap, deactivate: deactivateFocusTrap } = useFocusTrap(drawerRef);

// Überwache Änderungen am modelValue
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    open();
  } else {
    handleDrawerClose();
  }
});

/**
 * Öffnet den Drawer
 */
function open(): void {
  nextTick(() => {
    if (props.manageFocus && drawerRef.value) {
      activateFocusTrap();
      
      // Fokus auf den ersten fokussierbaren Element im Drawer setzen
      const focusableElement = drawerRef.value.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') as HTMLElement;
      if (focusableElement) {
        focusableElement.focus();
      } else {
        // Wenn kein fokussierbares Element vorhanden ist, den Drawer selbst fokussieren
        drawerRef.value.focus();
      }
    }
    
    // Scrolle verhindern, wenn der Drawer geöffnet ist und einen Backdrop hat
    if (props.hasBackdrop && !props.nested) {
      document.body.style.overflow = 'hidden';
    }
    
    emit('open');
  });
}

/**
 * Schließt den Drawer
 */
function close(): void {
  emit('update:modelValue', false);
}

/**
 * Behandelt das Schließen des Drawers
 */
function handleDrawerClose(): void {
  if (props.manageFocus) {
    deactivateFocusTrap();
  }
  
  // Scrolle wieder aktivieren
  if (props.hasBackdrop && !props.nested) {
    document.body.style.overflow = '';
  }
  
  emit('close');
}

/**
 * Behandelt Klicks auf den Backdrop
 */
function handleBackdropClick(): void {
  if (props.closeOnBackdropClick) {
    close();
  }
}

/**
 * Behandelt Drücken der ESC-Taste
 */
function handleEscPress(event: KeyboardEvent): void {
  if (props.closeOnEscape && !event.defaultPrevented) {
    close();
  }
}

/**
 * Startet das Ändern der Größe
 */
function startResize(event: MouseEvent | TouchEvent): void {
  if (!props.resizable) return;
  
  isResizing.value = true;
  
  // Initialen Zustand speichern
  if (event instanceof MouseEvent) {
    startPos.value = props.position === 'left' || props.position === 'right' 
      ? event.clientX 
      : event.clientY;
  } else {
    startPos.value = props.position === 'left' || props.position === 'right' 
      ? event.touches[0].clientX 
      : event.touches[0].clientY;
  }
  
  // Aktuelle Größe als Ausgangsbasis
  if (drawerRef.value) {
    startSize.value = props.position === 'left' || props.position === 'right' 
      ? drawerRef.value.offsetWidth 
      : drawerRef.value.offsetHeight;
    currentSize.value = startSize.value;
  }
  
  // Event-Listener für Resize-Vorgang
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('touchmove', handleResize);
  document.addEventListener('mouseup', endResize);
  document.addEventListener('touchend', endResize);
  
  // Cursor ändern
  if (props.position === 'left' || props.position === 'right') {
    document.body.style.cursor = 'ew-resize';
  } else {
    document.body.style.cursor = 'ns-resize';
  }
  
  // Verhindern, dass der Text ausgewählt wird während des Resizens
  document.body.style.userSelect = 'none';
}

/**
 * Behandelt das Ändern der Größe
 */
function handleResize(event: MouseEvent | TouchEvent): void {
  if (!isResizing.value) return;
  
  let currentPosition: number;
  
  if (event instanceof MouseEvent) {
    currentPosition = props.position === 'left' || props.position === 'right' 
      ? event.clientX 
      : event.clientY;
  } else {
    currentPosition = props.position === 'left' || props.position === 'right' 
      ? event.touches[0].clientX 
      : event.touches[0].clientY;
  }
  
  let delta = currentPosition - startPos.value;
  
  // Anpassen basierend auf der Position des Drawers
  if (props.position === 'right' || props.position === 'bottom') {
    delta = -delta;
  }
  
  // Neue Größe berechnen und auf Min/Max begrenzen
  const newSize = Math.max(props.minSize, Math.min(props.maxSize, startSize.value + delta));
  currentSize.value = newSize;
  
  emit('resize', newSize);
}

/**
 * Beendet das Ändern der Größe
 */
function endResize(): void {
  isResizing.value = false;
  
  // Event-Listener entfernen
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('touchmove', handleResize);
  document.removeEventListener('mouseup', endResize);
  document.removeEventListener('touchend', endResize);
  
  // Cursor zurücksetzen
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
}

// Bereinigung
onBeforeUnmount(() => {
  if (isResizing.value) {
    endResize();
  }
  
  // Scrolle wieder aktivieren
  if (props.hasBackdrop && !props.nested && props.modelValue) {
    document.body.style.overflow = '';
  }
});

// Initialer Zustand
onMounted(() => {
  if (props.modelValue) {
    open();
  }
});

// Expose functions for programmatic use
defineExpose({
  open,
  close
});
</script>

<style scoped>
.n-drawer-backdrop {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: var(--n-drawer-backdrop-color, rgba(0, 0, 0, 0.5));
  z-index: calc(var(--n-drawer-z-index, 1000) - 1);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

.n-drawer-backdrop--active {
  opacity: 1;
  visibility: visible;
}

.n-drawer-backdrop--transparent {
  background-color: transparent;
}

.n-drawer {
  position: fixed;
  background-color: var(--n-drawer-background-color, var(--n-background-color, #ffffff));
  color: var(--n-drawer-text-color, var(--n-text-color, #2d3748));
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: var(--n-drawer-z-index, 1000);
  transition: transform 0.3s ease, width 0.2s ease, height 0.2s ease;
}

/* Position Varianten */
.n-drawer--position-right {
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--n-drawer-width, 320px);
  transform: translateX(100%);
}

.n-drawer--position-left {
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--n-drawer-width, 320px);
  transform: translateX(-100%);
}

.n-drawer--position-top {
  top: 0;
  left: 0;
  right: 0;
  height: var(--n-drawer-height, 320px);
  transform: translateY(-100%);
}

.n-drawer--position-bottom {
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--n-drawer-height, 320px);
  transform: translateY(100%);
}

/* Größenvarianten */
.n-drawer--size-small.n-drawer--position-left,
.n-drawer--size-small.n-drawer--position-right {
  width: var(--n-drawer-width-small, 240px);
}

.n-drawer--size-small.n-drawer--position-top,
.n-drawer--size-small.n-drawer--position-bottom {
  height: var(--n-drawer-height-small, 240px);
}

.n-drawer--size-medium.n-drawer--position-left,
.n-drawer--size-medium.n-drawer--position-right {
  width: var(--n-drawer-width-medium, 320px);
}

.n-drawer--size-medium.n-drawer--position-top,
.n-drawer--size-medium.n-drawer--position-bottom {
  height: var(--n-drawer-height-medium, 320px);
}

.n-drawer--size-large.n-drawer--position-left,
.n-drawer--size-large.n-drawer--position-right {
  width: var(--n-drawer-width-large, 480px);
}

.n-drawer--size-large.n-drawer--position-top,
.n-drawer--size-large.n-drawer--position-bottom {
  height: var(--n-drawer-height-large, 480px);
}

.n-drawer--size-xlarge.n-drawer--position-left,
.n-drawer--size-xlarge.n-drawer--position-right {
  width: var(--n-drawer-width-xlarge, 600px);
}

.n-drawer--size-xlarge.n-drawer--position-top,
.n-drawer--size-xlarge.n-drawer--position-bottom {
  height: var(--n-drawer-height-xlarge, 600px);
}

/* Aktiver Zustand */
.n-drawer--active {
  transform: translate(0);
}

/* Vollbild */
.n-drawer--fullscreen {
  width: 100%;
  height: 100%;
}

/* Schatten und Rahmen */
.n-drawer--elevated {
  box-shadow: var(--n-drawer-shadow, 0 4px 12px rgba(0, 0, 0, 0.15));
}

.n-drawer:not(.n-drawer--borderless) {
  border: 1px solid var(--n-border-color, #e2e8f0);
}

/* Nested Drawer Positionen anpassen */
.n-drawer--nested.n-drawer--position-right {
  right: 20px;
  top: 20px;
  bottom: 20px;
  border-radius: var(--n-border-radius, 8px);
}

.n-drawer--nested.n-drawer--position-left {
  left: 20px;
  top: 20px;
  bottom: 20px;
  border-radius: var(--n-border-radius, 8px);
}

.n-drawer--nested.n-drawer--position-top {
  top: 20px;
  left: 20px;
  right: 20px;
  border-radius: var(--n-border-radius, 8px);
}

.n-drawer--nested.n-drawer--position-bottom {
  bottom: 20px;
  left: 20px;
  right: 20px;
  border-radius: var(--n-border-radius, 8px);
}

/* Header */
.n-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  flex-shrink: 0;
}

.n-drawer__header--with-border {
  border-bottom: 1px solid var(--n-border-color, #e2e8f0);
}

.n-drawer__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--n-drawer-title-color, var(--n-text-color, #2d3748));
  margin: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.n-drawer__close-button {
  background: transparent;
  border: none;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--n-drawer-icon-color, var(--n-text-secondary-color, #718096));
  transition: color 0.2s ease, background-color 0.2s ease;
  border-radius: var(--n-border-radius, 4px);
}

.n-drawer__close-button:hover {
  background-color: var(--n-drawer-hover-color, rgba(0, 0, 0, 0.05));
  color: var(--n-drawer-icon-hover-color, var(--n-text-color, #2d3748));
}

.n-drawer__close-button svg {
  width: 20px;
  height: 20px;
}

/* Content */
.n-drawer__content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
}

/* Footer */
.n-drawer__footer {
  padding: 16px 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.n-drawer__footer--with-border {
  border-top: 1px solid var(--n-border-color, #e2e8f0);
}

/* Resize Handle */
.n-drawer__resize-handle {
  position: absolute;
  background-color: transparent;
  z-index: 1;
}

.n-drawer__resize-handle--left {
  right: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
}

.n-drawer__resize-handle--right {
  left: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
}

.n-drawer__resize-handle--top {
  bottom: 0;
  left: 0;
  right: 0;
  height: 8px;
  cursor: ns-resize;
}

.n-drawer__resize-handle--bottom {
  top: 0;
  left: 0;
  right: 0;
  height: 8px;
  cursor: ns-resize;
}

/* Eingebettete Transitions für Maus-Hover auf dem Resize-Handle */
.n-drawer__resize-handle:hover::before {
  content: '';
  position: absolute;
  background-color: var(--n-primary-color, #3182ce);
  opacity: 0.2;
}

.n-drawer__resize-handle--left:hover::before,
.n-drawer__resize-handle--right:hover::before {
  top: 0;
  bottom: 0;
  width: 4px;
  left: 50%;
  transform: translateX(-50%);
}

.n-drawer__resize-handle--top:hover::before,
.n-drawer__resize-handle--bottom:hover::before {
  left: 0;
  right: 0;
  height: 4px;
  top: 50%;
  transform: translateY(-50%);
}

/* Responsive Anpassungen */
@media (max-width: 768px) {
  .n-drawer--position-left,
  .n-drawer--position-right {
    width: 90% !important;
    max-width: 360px;
  }
  
  .n-drawer--position-top,
  .n-drawer--position-bottom {
    height: 50% !important;
  }
  
  .n-drawer__header {
    padding: 12px 16px;
  }
  
  .n-drawer__content {
    padding: 16px;
  }
  
  .n-drawer__footer {
    padding: 12px 16px;
  }
}

/* Reduced Motion für Barrierefreiheit */
@media (prefers-reduced-motion: reduce) {
  .n-drawer,
  .n-drawer-backdrop {
    transition: none;
  }
}
</style>