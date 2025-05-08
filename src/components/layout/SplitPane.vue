<template>
  <div 
    class="n-split-pane"
    :class="{ 
      'n-split-pane--vertical': orientation === 'vertical',
      'n-split-pane--dragging': isDragging,
      'n-split-pane--bordered': bordered
    }"
  >
    <div 
      ref="firstPaneRef"
      class="n-split-pane__first"
      :style="firstPaneStyle"
    >
      <slot name="first"></slot>
    </div>
    
    <div 
      ref="separatorRef"
      class="n-split-pane__separator"
      :aria-orientation="orientation"
      aria-valuenow="50"
      aria-valuemin="0"
      aria-valuemax="100"
      role="separator"
      tabindex="0"
      :class="{ 'n-split-pane__separator--no-resize': !resizable }"
      @mousedown="resizable && startDrag"
      @touchstart="resizable && startDrag"
      @keydown.left="resizable && handleKeyboard('left')"
      @keydown.right="resizable && handleKeyboard('right')"
      @keydown.up="resizable && handleKeyboard('up')"
      @keydown.down="resizable && handleKeyboard('down')"
    >
      <div v-if="resizable" class="n-split-pane__separator-handle">
        <slot name="separator">
          <div class="n-split-pane__separator-dots"></div>
        </slot>
      </div>
    </div>
    
    <div 
      ref="secondPaneRef"
      class="n-split-pane__second"
      :style="secondPaneStyle"
    >
      <slot name="second"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

/**
 * SplitPane-Komponente für den nscale DMS Assistenten
 * Bietet einen teilbaren Bereich mit anpassbarer Trennlinie.
 * @displayName SplitPane
 */
export interface SplitPaneProps {
  /** Die Ausrichtung der Teilung */
  orientation?: 'horizontal' | 'vertical';
  /** Der initiale Split-Wert in Prozent (0-100) */
  initialSplit?: number;
  /** Minimale Größe der ersten Seite in Prozent */
  minFirst?: number;
  /** Maximale Größe der ersten Seite in Prozent */
  maxFirst?: number;
  /** Minimale Größe der zweiten Seite in Prozent */
  minSecond?: number;
  /** Maximale Größe der zweiten Seite in Prozent */
  maxSecond?: number;
  /** Ob die Größe per Drag angepasst werden kann */
  resizable?: boolean;
  /** Die Breite des Separators in Pixeln */
  separatorWidth?: number;
  /** Der Speicherort für die Benutzerpräferenz */
  storageKey?: string;
  /** Ob der SplitPane einen Rahmen haben soll */
  bordered?: boolean;
}

const props = withDefaults(defineProps<SplitPaneProps>(), {
  orientation: 'horizontal',
  initialSplit: 50,
  minFirst: 10,
  maxFirst: 90,
  minSecond: 10,
  maxSecond: 90,
  resizable: true,
  separatorWidth: 4,
  storageKey: '',
  bordered: false
});

const emit = defineEmits<{
  /** Wird ausgelöst, wenn sich der Split-Wert ändert */
  (e: 'update:split', value: number): void;
  /** Wird ausgelöst, wenn das Ziehen beginnt */
  (e: 'drag-start'): void;
  /** Wird ausgelöst, wenn das Ziehen endet */
  (e: 'drag-end', value: number): void;
}>();

// Refs für DOM-Elemente
const firstPaneRef = ref<HTMLElement | null>(null);
const secondPaneRef = ref<HTMLElement | null>(null);
const separatorRef = ref<HTMLElement | null>(null);

// Zustandsvariablen
const isDragging = ref(false);
const splitValue = ref(getSavedSplitValue());
const dragStartPosition = ref(0);
const containerSize = ref(0);

// Berechne die Stile für die Teilbereiche
const firstPaneStyle = computed(() => {
  const sizeProperty = props.orientation === 'horizontal' ? 'width' : 'height';
  const flexProperty = props.orientation === 'horizontal' ? 'flex-basis' : 'flex-basis';
  
  return {
    [sizeProperty]: `calc(${splitValue.value}% - ${props.separatorWidth / 2}px)`,
    [flexProperty]: `calc(${splitValue.value}% - ${props.separatorWidth / 2}px)`
  };
});

const secondPaneStyle = computed(() => {
  const sizeProperty = props.orientation === 'horizontal' ? 'width' : 'height';
  const flexProperty = props.orientation === 'horizontal' ? 'flex-basis' : 'flex-basis';
  const secondSplit = 100 - splitValue.value;
  
  return {
    [sizeProperty]: `calc(${secondSplit}% - ${props.separatorWidth / 2}px)`,
    [flexProperty]: `calc(${secondSplit}% - ${props.separatorWidth / 2}px)`
  };
});

// Initialisierung
onMounted(() => {
  window.addEventListener('resize', updateContainerSize);
  updateContainerSize();
});

// Aufräumen
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateContainerSize);
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('touchmove', handleDrag);
  document.removeEventListener('mouseup', endDrag);
  document.removeEventListener('touchend', endDrag);
});

// Überwache Änderungen am Split-Wert
watch(splitValue, (newValue) => {
  emit('update:split', newValue);
  
  // Speichere den Wert, wenn ein Speicherschlüssel definiert ist
  if (props.storageKey) {
    localStorage.setItem(props.storageKey, String(newValue));
  }
});

/**
 * Laden des gespeicherten Split-Werts
 */
function getSavedSplitValue(): number {
  if (props.storageKey) {
    const savedValue = localStorage.getItem(props.storageKey);
    if (savedValue !== null) {
      const parsed = parseFloat(savedValue);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
  }
  
  return props.initialSplit;
}

/**
 * Aktualisiert die Größe des Containers
 */
function updateContainerSize() {
  if (!firstPaneRef.value || !secondPaneRef.value) return;
  
  const container = firstPaneRef.value.parentElement;
  if (!container) return;
  
  if (props.orientation === 'horizontal') {
    containerSize.value = container.clientWidth;
  } else {
    containerSize.value = container.clientHeight;
  }
}

/**
 * Startet den Drag-Vorgang
 * @param event Das Mouse- oder Touch-Event
 */
function startDrag(event: MouseEvent | TouchEvent) {
  event.preventDefault();
  isDragging.value = true;
  
  const clientPosition = getClientPosition(event);
  dragStartPosition.value = clientPosition;
  
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('touchmove', handleDrag);
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchend', endDrag);
  
  emit('drag-start');
}

/**
 * Behandelt den Drag-Vorgang
 * @param event Das Mouse- oder Touch-Event
 */
function handleDrag(event: MouseEvent | TouchEvent) {
  if (!isDragging.value) return;
  event.preventDefault();
  
  const clientPosition = getClientPosition(event);
  const delta = clientPosition - dragStartPosition.value;
  
  // Berechne den neuen Split-Wert basierend auf der Bewegung
  const deltaPercent = (delta / containerSize.value) * 100;
  const newSplit = props.orientation === 'horizontal'
    ? splitValue.value + deltaPercent
    : splitValue.value - deltaPercent;
  
  setSplitValue(newSplit);
  dragStartPosition.value = clientPosition;
}

/**
 * Beendet den Drag-Vorgang
 */
function endDrag() {
  isDragging.value = false;
  
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('touchmove', handleDrag);
  document.removeEventListener('mouseup', endDrag);
  document.removeEventListener('touchend', endDrag);
  
  emit('drag-end', splitValue.value);
}

/**
 * Setzt den Split-Wert unter Berücksichtigung der Grenzwerte
 * @param value Der neue Split-Wert
 */
function setSplitValue(value: number) {
  const minValue = Math.max(props.minFirst, 100 - props.maxSecond);
  const maxValue = Math.min(props.maxFirst, 100 - props.minSecond);
  
  splitValue.value = Math.max(minValue, Math.min(maxValue, value));
}

/**
 * Gibt die Client-Position eines Mouse- oder Touch-Events zurück
 * @param event Das Event
 */
function getClientPosition(event: MouseEvent | TouchEvent): number {
  if (props.orientation === 'horizontal') {
    return 'touches' in event
      ? event.touches[0].clientX
      : (event as MouseEvent).clientX;
  } else {
    return 'touches' in event
      ? event.touches[0].clientY
      : (event as MouseEvent).clientY;
  }
}

/**
 * Behandelt die Tastaturnavigation
 * @param direction Die Richtung der Tastatureingabe
 */
function handleKeyboard(direction: 'left' | 'right' | 'up' | 'down') {
  const step = 1; // 1% pro Tastendruck
  
  if (
    (props.orientation === 'horizontal' && (direction === 'left' || direction === 'right')) ||
    (props.orientation === 'vertical' && (direction === 'up' || direction === 'down'))
  ) {
    const delta = (direction === 'right' || direction === 'down') ? step : -step;
    const newSplit = splitValue.value + delta;
    
    setSplitValue(newSplit);
  }
}
</script>

<style scoped>
.n-split-pane {
  display: flex;
  width: 100%;
  height: 100%;
  position: relative;
}

.n-split-pane--vertical {
  flex-direction: column;
}

.n-split-pane--bordered {
  border: 1px solid var(--n-border-color, #e2e8f0);
  border-radius: var(--n-border-radius, 4px);
}

.n-split-pane__first,
.n-split-pane__second {
  overflow: auto;
  min-height: 0;
  min-width: 0;
  transition: flex-basis 0.1s ease;
}

.n-split-pane--dragging .n-split-pane__first,
.n-split-pane--dragging .n-split-pane__second {
  transition: none;
  pointer-events: none;
  user-select: none;
}

.n-split-pane__separator {
  flex: 0 0 v-bind('props.separatorWidth + "px"');
  background-color: var(--n-split-pane-separator-color, var(--n-border-color, #e2e8f0));
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: col-resize;
  z-index: 1;
  transition: background-color 0.2s ease;
}

.n-split-pane--vertical .n-split-pane__separator {
  cursor: row-resize;
}

.n-split-pane__separator:hover,
.n-split-pane__separator:focus-visible {
  background-color: var(--n-split-pane-separator-hover-color, var(--n-primary-color, #3182ce));
}

.n-split-pane__separator:focus-visible {
  outline: none;
}

.n-split-pane__separator--no-resize {
  cursor: default;
}

.n-split-pane__separator-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

.n-split-pane__separator-dots {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.n-split-pane--vertical .n-split-pane__separator-dots {
  flex-direction: row;
}

.n-split-pane__separator-dots::before,
.n-split-pane__separator-dots::after {
  content: '';
  display: block;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background-color: currentColor;
  opacity: 0.5;
  margin: 2px 0;
}

.n-split-pane--vertical .n-split-pane__separator-dots::before,
.n-split-pane--vertical .n-split-pane__separator-dots::after {
  margin: 0 2px;
}

/* Für Touch-Devices einen breiteren Drag-Bereich bieten */
@media (pointer: coarse) {
  .n-split-pane__separator {
    flex: 0 0 calc(v-bind('props.separatorWidth') * 2.5 + "px");
  }
}
</style>