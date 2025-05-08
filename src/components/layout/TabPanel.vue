<template>
  <div 
    class="n-tab-panel"
    :class="{ 
      'n-tab-panel--vertical': orientation === 'vertical',
      'n-tab-panel--bordered': bordered,
      'n-tab-panel--elevated': elevated,
      [`n-tab-panel--${size}`]: true
    }"
  >
    <div 
      class="n-tab-panel__header"
      role="tablist"
      :aria-orientation="orientation"
    >
      <div v-if="$slots.before" class="n-tab-panel__header-before">
        <slot name="before"></slot>
      </div>
      
      <div class="n-tab-panel__tabs" :class="{ 'n-tab-panel__tabs--scrollable': scrollable }">
        <div 
          v-if="scrollable && canScrollLeft" 
          class="n-tab-panel__scroll-button n-tab-panel__scroll-button--left"
          @click="scrollLeft"
          tabindex="0"
          role="button"
          aria-label="Scroll tabs left"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </div>
        
        <div 
          ref="tabsContainer"
          class="n-tab-panel__tabs-container"
          @scroll="handleScroll"
        >
          <div
            v-for="(tab, index) in tabs"
            :key="tab.id"
            class="n-tab-panel__tab"
            :class="{ 
              'n-tab-panel__tab--active': activeTabId === tab.id,
              'n-tab-panel__tab--disabled': tab.disabled
            }"
            role="tab"
            :id="`tab-${tab.id}`"
            :aria-selected="activeTabId === tab.id ? 'true' : 'false'"
            :aria-controls="`panel-${tab.id}`"
            :tabindex="activeTabId === tab.id ? 0 : -1"
            :draggable="draggable"
            @click="!tab.disabled && selectTab(tab.id)"
            @keydown.enter="!tab.disabled && selectTab(tab.id)"
            @keydown.space.prevent="!tab.disabled && selectTab(tab.id)"
            @keydown.right="handleTabKeyNavigation(index, 1)"
            @keydown.left="handleTabKeyNavigation(index, -1)"
            @keydown.down="orientation === 'vertical' && handleTabKeyNavigation(index, 1)"
            @keydown.up="orientation === 'vertical' && handleTabKeyNavigation(index, -1)"
            @dragstart="draggable && handleDragStart($event, index)"
            @dragover="draggable && handleDragOver($event, index)"
            @dragend="draggable && handleDragEnd($event)"
            @drop="draggable && handleDrop($event, index)"
          >
            <slot name="tab" :tab="tab" :index="index">
              <div class="n-tab-panel__tab-inner">
                <span v-if="tab.icon" class="n-tab-panel__tab-icon">
                  <component :is="getIconComponent(tab.icon)" v-if="isComponent(tab.icon)" />
                  <i v-else :class="tab.icon"></i>
                </span>
                <span class="n-tab-panel__tab-text">{{ tab.label }}</span>
                <button 
                  v-if="closable && !tab.disabled && !tab.permanent"
                  class="n-tab-panel__tab-close"
                  @click.stop="closeTab(tab.id)"
                  aria-label="Close tab"
                  type="button"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </slot>
          </div>
        </div>
        
        <div 
          v-if="scrollable && canScrollRight" 
          class="n-tab-panel__scroll-button n-tab-panel__scroll-button--right"
          @click="scrollRight"
          tabindex="0"
          role="button"
          aria-label="Scroll tabs right"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>
      
      <div v-if="$slots.after || addable" class="n-tab-panel__header-after">
        <slot name="after">
          <button 
            v-if="addable"
            class="n-tab-panel__add-button"
            @click="handleAddTab"
            aria-label="Add tab"
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </slot>
      </div>
    </div>
    
    <div class="n-tab-panel__content">
      <div
        v-for="tab in tabs"
        :key="`panel-${tab.id}`"
        class="n-tab-panel__pane"
        :class="{ 'n-tab-panel__pane--active': activeTabId === tab.id }"
        :id="`panel-${tab.id}`"
        role="tabpanel"
        :aria-labelledby="`tab-${tab.id}`"
        :hidden="activeTabId !== tab.id"
      >
        <slot 
          v-if="!lazy || activeTabId === tab.id || mountedTabs.has(tab.id)" 
          :name="tab.id" 
          :tab="tab"
        >
          <slot name="default" :tab="tab"></slot>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';

/**
 * TabPanel-Komponente für den nscale DMS Assistenten
 * Bietet ein flexibles Tab-System mit verschiedenen Layouts und Funktionen.
 * @displayName TabPanel
 */
export interface TabPanelProps {
  /** Die Tabs der TabPanel */
  tabs: Tab[];
  /** Die ID des aktiven Tabs */
  activeId?: string;
  /** Die Ausrichtung der Tabs */
  orientation?: 'horizontal' | 'vertical';
  /** Ob die Tabs geschlossen werden können */
  closable?: boolean;
  /** Ob ein Tab hinzugefügt werden kann */
  addable?: boolean;
  /** Ob die Tabs per Drag & Drop neu angeordnet werden können */
  draggable?: boolean;
  /** Ob die Tabs nur bei Aktivierung geladen werden sollen */
  lazy?: boolean;
  /** Ob die Tabs einen Rahmen haben sollen */
  bordered?: boolean;
  /** Ob die Tabs erhöht (mit Schatten) sein sollen */
  elevated?: boolean;
  /** Größe der Tabs */
  size?: 'small' | 'medium' | 'large';
  /** Ob die Tabs scrollbar sein sollen, wenn sie nicht alle angezeigt werden können */
  scrollable?: boolean;
}

export interface Tab {
  /** Eindeutige ID des Tabs */
  id: string;
  /** Anzeigename des Tabs */
  label: string;
  /** Icon des Tabs (optional) */
  icon?: string | object;
  /** Ob der Tab deaktiviert ist */
  disabled?: boolean;
  /** Ob der Tab permanent ist (kann nicht geschlossen werden) */
  permanent?: boolean;
  /** Benutzerdefinierte Daten */
  data?: any;
}

const props = withDefaults(defineProps<TabPanelProps>(), {
  activeId: '',
  orientation: 'horizontal',
  closable: false,
  addable: false,
  draggable: false,
  lazy: false,
  bordered: true,
  elevated: false,
  size: 'medium',
  scrollable: true
});

const emit = defineEmits<{
  /** Wird ausgelöst, wenn ein Tab ausgewählt wird */
  (e: 'update:active-id', id: string): void;
  /** Wird ausgelöst, wenn ein Tab geschlossen wird */
  (e: 'close', id: string): void;
  /** Wird ausgelöst, wenn die Reihenfolge der Tabs geändert wird */
  (e: 'reorder', ids: string[]): void;
  /** Wird ausgelöst, wenn ein Tab hinzugefügt werden soll */
  (e: 'add'): void;
}>();

// Reaktive Zustände
const activeTabId = ref(props.activeId || (props.tabs.length > 0 ? props.tabs[0].id : ''));
const mountedTabs = ref(new Set<string>());
const tabsContainer = ref<HTMLElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
const isDragging = ref(false);
const draggedTabIndex = ref(-1);

// Überwache Änderungen an der activeId-Prop
watch(() => props.activeId, (newValue) => {
  if (newValue && newValue !== activeTabId.value) {
    activeTabId.value = newValue;
  }
});

// Überwache Änderungen am aktiven Tab
watch(() => activeTabId.value, (newValue) => {
  if (newValue && props.lazy) {
    mountedTabs.value.add(newValue);
  }
});

// Initialisierung
onMounted(() => {
  // Initialisiere gemountete Tabs, wenn lazy loading aktiviert ist
  if (props.lazy && activeTabId.value) {
    mountedTabs.value.add(activeTabId.value);
  }
  
  // Überprüfe Scrollbarkeit
  checkScrollable();
  
  // Scrolle zum aktiven Tab
  scrollToActiveTab();
});

// Überwache Änderungen an den Tabs, um die Scrollbarkeit zu überprüfen
watch(() => props.tabs, () => {
  nextTick(() => {
    checkScrollable();
  });
}, { deep: true });

/**
 * Wählt einen Tab aus
 * @param id Die ID des auszuwählenden Tabs
 */
function selectTab(id: string) {
  if (id === activeTabId.value) return;
  
  activeTabId.value = id;
  emit('update:active-id', id);
  
  if (props.lazy) {
    mountedTabs.value.add(id);
  }
  
  // Scrolle zum ausgewählten Tab
  nextTick(() => {
    scrollToActiveTab();
  });
}

/**
 * Schließt einen Tab
 * @param id Die ID des zu schließenden Tabs
 */
function closeTab(id: string) {
  emit('close', id);
  
  // Wenn der aktive Tab geschlossen wird, wähle einen anderen Tab aus
  if (id === activeTabId.value && props.tabs.length > 1) {
    // Finde den Index des aktuellen Tabs
    const currentIndex = props.tabs.findIndex(tab => tab.id === id);
    
    // Wähle den nächsten Tab aus, oder den vorherigen, wenn es keinen nächsten gibt
    if (currentIndex < props.tabs.length - 1) {
      selectTab(props.tabs[currentIndex + 1].id);
    } else if (currentIndex > 0) {
      selectTab(props.tabs[currentIndex - 1].id);
    }
  }
}

/**
 * Fügt einen neuen Tab hinzu
 */
function handleAddTab() {
  emit('add');
}

/**
 * Überprüft, ob die Tabs scrollbar sind
 */
function checkScrollable() {
  if (!tabsContainer.value || !props.scrollable) return;
  
  const container = tabsContainer.value;
  canScrollLeft.value = container.scrollLeft > 0;
  canScrollRight.value = container.scrollLeft + container.clientWidth < container.scrollWidth;
}

/**
 * Behandelt das Scrollen der Tabs
 */
function handleScroll() {
  checkScrollable();
}

/**
 * Scrollt nach links
 */
function scrollLeft() {
  if (!tabsContainer.value) return;
  
  const container = tabsContainer.value;
  container.scrollLeft -= 100;
  checkScrollable();
}

/**
 * Scrollt nach rechts
 */
function scrollRight() {
  if (!tabsContainer.value) return;
  
  const container = tabsContainer.value;
  container.scrollLeft += 100;
  checkScrollable();
}

/**
 * Scrollt zum aktiven Tab
 */
function scrollToActiveTab() {
  if (!tabsContainer.value || !props.scrollable) return;
  
  const container = tabsContainer.value;
  const activeTab = container.querySelector('.n-tab-panel__tab--active') as HTMLElement;
  
  if (activeTab) {
    const containerRect = container.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    
    if (tabRect.left < containerRect.left) {
      // Tab ist links außerhalb des sichtbaren Bereichs
      container.scrollLeft -= (containerRect.left - tabRect.left);
    } else if (tabRect.right > containerRect.right) {
      // Tab ist rechts außerhalb des sichtbaren Bereichs
      container.scrollLeft += (tabRect.right - containerRect.right);
    }
    
    checkScrollable();
  }
}

/**
 * Behandelt die Tab-Navigation per Tastatur
 * @param currentIndex Der aktuelle Tab-Index
 * @param direction Die Richtung (1 für rechts/unten, -1 für links/oben)
 */
function handleTabKeyNavigation(currentIndex: number, direction: number) {
  const tabs = props.tabs;
  let nextIndex = currentIndex + direction;
  
  // Finde den nächsten nicht deaktivierten Tab
  while (nextIndex >= 0 && nextIndex < tabs.length) {
    if (!tabs[nextIndex].disabled) {
      selectTab(tabs[nextIndex].id);
      
      // Fokussiere den Tab
      nextTick(() => {
        const tabElement = document.getElementById(`tab-${tabs[nextIndex].id}`);
        if (tabElement) {
          tabElement.focus();
        }
      });
      
      break;
    }
    
    nextIndex += direction;
  }
}

/**
 * Behandelt den Start des Drag & Drop
 * @param event Das DragEvent
 * @param index Der Index des gezogenen Tabs
 */
function handleDragStart(event: DragEvent, index: number) {
  if (!event.dataTransfer) return;
  
  isDragging.value = true;
  draggedTabIndex.value = index;
  
  // Setze die Drag-Daten
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', index.toString());
  
  // Füge eine Klasse zum Tab hinzu, um das Styling anzupassen
  const target = event.target as HTMLElement;
  target.classList.add('n-tab-panel__tab--dragging');
}

/**
 * Behandelt das Dragover-Event
 * @param event Das DragEvent
 * @param index Der Index des Tabs, über dem das Drag stattfindet
 */
function handleDragOver(event: DragEvent, index: number) {
  if (!isDragging.value || draggedTabIndex.value === index) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  // Setze den Drop-Effekt
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

/**
 * Behandelt das Ende des Drag & Drop
 * @param event Das DragEvent
 */
function handleDragEnd(event: DragEvent) {
  isDragging.value = false;
  draggedTabIndex.value = -1;
  
  // Entferne die Klasse vom Tab
  const target = event.target as HTMLElement;
  target.classList.remove('n-tab-panel__tab--dragging');
}

/**
 * Behandelt das Drop-Event
 * @param event Das DragEvent
 * @param dropIndex Der Index des Tabs, auf dem das Drop stattfindet
 */
function handleDrop(event: DragEvent, dropIndex: number) {
  event.preventDefault();
  event.stopPropagation();
  
  // Ignoriere, wenn der Tab auf sich selbst gezogen wird
  if (draggedTabIndex.value === dropIndex || draggedTabIndex.value === -1) return;
  
  // Erstelle eine Kopie der Tabs und ordne sie neu an
  const newTabs = [...props.tabs];
  const draggedTab = newTabs[draggedTabIndex.value];
  
  // Entferne den gezogenen Tab
  newTabs.splice(draggedTabIndex.value, 1);
  
  // Füge ihn an der neuen Position ein
  newTabs.splice(dropIndex, 0, draggedTab);
  
  // Emittiere das Reorder-Event
  emit('reorder', newTabs.map(tab => tab.id));
}

/**
 * Prüft, ob ein Icon ein Komponenten-Object ist
 * @param icon Das zu prüfende Icon
 */
function isComponent(icon: any): boolean {
  return typeof icon === 'object';
}

/**
 * Gibt die Icon-Komponente zurück
 * @param icon Das Icon als String oder Komponente
 */
function getIconComponent(icon: any): any {
  return isComponent(icon) ? icon : null;
}
</script>

<style scoped>
.n-tab-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: var(--n-tab-panel-background-color, var(--n-background-color, #f5f7fa));
  color: var(--n-tab-panel-text-color, var(--n-text-color, #2d3748));
}

.n-tab-panel--vertical {
  flex-direction: row;
}

.n-tab-panel--bordered {
  border: 1px solid var(--n-border-color, #e2e8f0);
  border-radius: var(--n-border-radius, 4px);
}

.n-tab-panel--elevated {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.n-tab-panel__header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--n-border-color, #e2e8f0);
  background-color: var(--n-tab-panel-header-background-color, var(--n-background-color, #f5f7fa));
  position: relative;
  z-index: 1;
}

.n-tab-panel--vertical .n-tab-panel__header {
  flex-direction: column;
  border-bottom: none;
  border-right: 1px solid var(--n-border-color, #e2e8f0);
  width: var(--n-tab-panel-vertical-width, 200px);
  overflow-y: auto;
  align-items: stretch;
}

.n-tab-panel__header-before,
.n-tab-panel__header-after {
  display: flex;
  align-items: center;
  padding: 0 8px;
  flex-shrink: 0;
}

.n-tab-panel--vertical .n-tab-panel__header-before,
.n-tab-panel--vertical .n-tab-panel__header-after {
  width: 100%;
  padding: 8px;
}

.n-tab-panel__tabs {
  display: flex;
  position: relative;
  flex: 1;
}

.n-tab-panel--vertical .n-tab-panel__tabs {
  flex-direction: column;
  width: 100%;
}

.n-tab-panel__tabs--scrollable {
  overflow: hidden;
}

.n-tab-panel__tabs-container {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  scroll-behavior: smooth;
}

.n-tab-panel__tabs-container::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}

.n-tab-panel--vertical .n-tab-panel__tabs-container {
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
}

.n-tab-panel__scroll-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 100%;
  background-color: var(--n-tab-panel-header-background-color, var(--n-background-color, #f5f7fa));
  border: none;
  cursor: pointer;
  position: absolute;
  top: 0;
  z-index: 2;
  color: var(--n-tab-panel-text-color, var(--n-text-color, #2d3748));
  transition: background-color 0.2s ease;
}

.n-tab-panel__scroll-button svg {
  width: 16px;
  height: 16px;
}

.n-tab-panel__scroll-button:hover {
  background-color: var(--n-tab-panel-hover-color, rgba(0, 0, 0, 0.05));
}

.n-tab-panel__scroll-button:focus-visible {
  outline: 2px solid var(--n-focus-color, #3182ce);
  outline-offset: -2px;
}

.n-tab-panel__scroll-button--left {
  left: 0;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
  border-right: 1px solid var(--n-border-color, #e2e8f0);
}

.n-tab-panel__scroll-button--right {
  right: 0;
  box-shadow: -2px 0 4px rgba(0, 0, 0, 0.05);
  border-left: 1px solid var(--n-border-color, #e2e8f0);
}

.n-tab-panel__tab {
  display: flex;
  align-items: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  position: relative;
  font-size: var(--n-font-size-md, 1rem);
  color: var(--n-tab-panel-tab-color, var(--n-text-secondary-color, #718096));
  transition: color 0.2s ease, background-color 0.2s ease;
  white-space: nowrap;
  user-select: none;
  outline: none;
}

.n-tab-panel--small .n-tab-panel__tab {
  font-size: var(--n-font-size-sm, 0.875rem);
}

.n-tab-panel--large .n-tab-panel__tab {
  font-size: var(--n-font-size-lg, 1.125rem);
}

.n-tab-panel__tab-inner {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  width: 100%;
  height: 100%;
}

.n-tab-panel--small .n-tab-panel__tab-inner {
  padding: 8px 12px;
}

.n-tab-panel--large .n-tab-panel__tab-inner {
  padding: 16px 20px;
}

.n-tab-panel--vertical .n-tab-panel__tab-inner {
  justify-content: flex-start;
}

.n-tab-panel__tab:hover {
  background-color: var(--n-tab-panel-hover-color, rgba(0, 0, 0, 0.05));
  color: var(--n-tab-panel-tab-hover-color, var(--n-text-color, #2d3748));
}

.n-tab-panel__tab:focus-visible {
  outline: 2px solid var(--n-focus-color, #3182ce);
  outline-offset: -2px;
}

.n-tab-panel__tab--active {
  color: var(--n-tab-panel-tab-active-color, var(--n-primary-color, #3182ce));
  font-weight: 500;
}

.n-tab-panel__tab--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--n-primary-color, #3182ce);
}

.n-tab-panel--vertical .n-tab-panel__tab--active::after {
  top: 0;
  bottom: 0;
  right: 0;
  left: auto;
  width: 2px;
  height: auto;
}

.n-tab-panel__tab--disabled {
  color: var(--n-tab-panel-tab-disabled-color, var(--n-text-disabled-color, #cbd5e0));
  cursor: not-allowed;
  pointer-events: none;
}

.n-tab-panel__tab--dragging {
  opacity: 0.6;
}

.n-tab-panel__tab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
}

.n-tab-panel__tab-icon i,
.n-tab-panel__tab-icon svg {
  width: 18px;
  height: 18px;
}

.n-tab-panel--small .n-tab-panel__tab-icon i,
.n-tab-panel--small .n-tab-panel__tab-icon svg {
  width: 16px;
  height: 16px;
}

.n-tab-panel--large .n-tab-panel__tab-icon i,
.n-tab-panel--large .n-tab-panel__tab-icon svg {
  width: 20px;
  height: 20px;
}

.n-tab-panel__tab-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.n-tab-panel__tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-left: 8px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: currentColor;
  opacity: 0.6;
  transition: opacity 0.2s ease, background-color 0.2s ease;
}

.n-tab-panel__tab-close svg {
  width: 12px;
  height: 12px;
}

.n-tab-panel__tab-close:hover {
  opacity: 1;
  background-color: var(--n-tab-panel-close-hover-color, rgba(0, 0, 0, 0.1));
}

.n-tab-panel__tab-close:focus-visible {
  outline: 2px solid var(--n-focus-color, #3182ce);
  outline-offset: 0;
}

.n-tab-panel__add-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: 1px solid var(--n-border-color, #e2e8f0);
  border-radius: var(--n-border-radius, 4px);
  cursor: pointer;
  color: var(--n-tab-panel-text-color, var(--n-text-color, #2d3748));
  transition: background-color 0.2s ease, color 0.2s ease;
}

.n-tab-panel__add-button svg {
  width: 16px;
  height: 16px;
}

.n-tab-panel__add-button:hover {
  background-color: var(--n-tab-panel-hover-color, rgba(0, 0, 0, 0.05));
  color: var(--n-primary-color, #3182ce);
}

.n-tab-panel__add-button:focus-visible {
  outline: 2px solid var(--n-focus-color, #3182ce);
  outline-offset: 1px;
}

.n-tab-panel__content {
  flex: 1;
  overflow: auto;
  position: relative;
  background-color: var(--n-tab-panel-content-background-color, var(--n-background-color, #f5f7fa));
}

.n-tab-panel__pane {
  display: none;
  height: 100%;
  width: 100%;
  padding: var(--n-tab-panel-content-padding, 16px);
}

.n-tab-panel__pane--active {
  display: block;
}

/* Responsive styles */
@media (max-width: 768px) {
  .n-tab-panel--vertical {
    flex-direction: column;
  }
  
  .n-tab-panel--vertical .n-tab-panel__header {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--n-border-color, #e2e8f0);
  }
  
  .n-tab-panel__tab-inner {
    padding: 12px;
  }
  
  .n-tab-panel--small .n-tab-panel__tab-inner {
    padding: 8px;
  }
  
  .n-tab-panel--large .n-tab-panel__tab-inner {
    padding: 14px;
  }
  
  .n-tab-panel__pane {
    padding: 12px;
  }
}
</style>