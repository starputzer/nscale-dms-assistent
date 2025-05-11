<template>
  <div
    class="n-tab-panel"
    :class="{
      'n-tab-panel--vertical': orientation === 'vertical',
      'n-tab-panel--bordered': bordered,
      'n-tab-panel--elevated': elevated,
      [`n-tab-panel--${size}`]: true,
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

      <div
        class="n-tab-panel__tabs"
        :class="{ 'n-tab-panel__tabs--scrollable': scrollable }"
      >
        <div
          v-if="scrollable && canScrollLeft"
          class="n-tab-panel__scroll-button n-tab-panel__scroll-button--left"
          @click="scrollLeft"
          tabindex="0"
          role="button"
          aria-label="Scroll tabs left"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </div>

        <div
          ref="tabsContainer"
          class="n-tab-panel__tabs-container"
          @scroll="handleScroll"
        >
          <div
            v-for="(tab, index) in visibleTabs"
            :key="tab.id"
            class="n-tab-panel__tab"
            :class="{
              'n-tab-panel__tab--active': activeTabId === tab.id,
              'n-tab-panel__tab--disabled': tab.disabled,
              'n-tab-panel__tab--pinned': tab.pinned,
              'n-tab-panel__tab--has-badge': tab.badge,
              [`n-tab-panel__tab--${props.displayType}`]: true,
            }"
            role="tab"
            :id="`tab-${tab.id}`"
            :aria-selected="activeTabId === tab.id ? 'true' : 'false'"
            :aria-controls="`panel-${tab.id}`"
            :tabindex="activeTabId === tab.id ? 0 : -1"
            :draggable="draggable && !tab.disabled"
            @click="!tab.disabled && selectTab(tab.id)"
            @contextmenu="props.contextMenu && handleContextMenu($event, tab)"
            @mouseenter="handleTabMouseEnter(tab.id, $event)"
            @mouseleave="handleTabMouseLeave()"
            @keydown.enter="!tab.disabled && selectTab(tab.id)"
            @keydown.space.prevent="!tab.disabled && selectTab(tab.id)"
            @keydown.right="handleTabKeyNavigation(index, 1)"
            @keydown.left="handleTabKeyNavigation(index, -1)"
            @keydown.down="
              orientation === 'vertical' && handleTabKeyNavigation(index, 1)
            "
            @keydown.up="
              orientation === 'vertical' && handleTabKeyNavigation(index, -1)
            "
            @keydown.delete="
              props.closable &&
              !tab.permanent &&
              !tab.disabled &&
              closeTab(tab.id)
            "
            @dragstart="
              draggable && !tab.disabled && handleDragStart($event, index)
            "
            @dragover="draggable && handleDragOver($event, index)"
            @dragend="draggable && !tab.disabled && handleDragEnd($event)"
            @drop="draggable && handleDrop($event, index)"
          >
            <slot name="tab" :tab="tab" :index="index">
              <div class="n-tab-panel__tab-inner">
                <span
                  v-if="tab.pinned && props.allowPinning"
                  class="n-tab-panel__tab-pin-indicator"
                  :title="'Pinned tab'"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M12 2L12 22"></path>
                    <path d="M5 5H19"></path>
                  </svg>
                </span>
                <span v-if="tab.icon" class="n-tab-panel__tab-icon">
                  <component
                    :is="getIconComponent(tab.icon)"
                    v-if="isComponent(tab.icon)"
                  />
                  <i v-else :class="tab.icon"></i>
                </span>
                <span class="n-tab-panel__tab-text">{{ tab.label }}</span>
                <span
                  v-if="tab.badge"
                  class="n-tab-panel__tab-badge"
                  :style="{
                    backgroundColor:
                      tab.badgeColor || 'var(--n-primary-color, #3182ce)',
                  }"
                >
                  {{ tab.badge }}
                </span>
                <button
                  v-if="props.allowPinning && !tab.disabled"
                  class="n-tab-panel__tab-pin"
                  @click.stop="togglePinTab(tab.id)"
                  :aria-label="tab.pinned ? 'Unpin tab' : 'Pin tab'"
                  :title="tab.pinned ? 'Unpin tab' : 'Pin tab'"
                  type="button"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M12 2L12 22"></path>
                    <path d="M5 5H19"></path>
                  </svg>
                </button>
                <button
                  v-if="closable && !tab.disabled && !tab.permanent"
                  class="n-tab-panel__tab-close"
                  @click.stop="closeTab(tab.id)"
                  aria-label="Close tab"
                  title="Close tab"
                  type="button"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
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
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
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
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </slot>
      </div>
    </div>

    <div
      class="n-tab-panel__content"
      :class="{ [`n-tab-panel__content--${props.displayType}`]: true }"
    >
      <div
        v-for="tab in props.tabs"
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

      <!-- Context Menu (wenn aktiviert) -->
      <div
        v-if="props.contextMenu && contextMenuVisible"
        class="n-tab-panel__context-menu"
        :style="{
          left: contextMenuPosition.x + 'px',
          top: contextMenuPosition.y + 'px',
        }"
      >
        <div
          v-if="
            contextMenuTab && props.allowPinning && !contextMenuTab.disabled
          "
          class="n-tab-panel__context-menu-item"
          @click="togglePinTab(contextMenuTab.id)"
        >
          <span class="n-tab-panel__context-menu-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 2L12 22"></path>
              <path d="M5 5H19"></path>
            </svg>
          </span>
          {{ contextMenuTab.pinned ? "Unpin Tab" : "Pin Tab" }}
        </div>
        <div
          v-if="
            contextMenuTab &&
            props.closable &&
            !contextMenuTab.permanent &&
            !contextMenuTab.disabled
          "
          class="n-tab-panel__context-menu-item"
          @click="closeTab(contextMenuTab.id)"
        >
          <span class="n-tab-panel__context-menu-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </span>
          Close
        </div>
        <div
          v-if="contextMenuTab && props.closable"
          class="n-tab-panel__context-menu-item"
          @click="closeOtherTabs(contextMenuTab.id)"
        >
          <span class="n-tab-panel__context-menu-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </span>
          Close Others
        </div>
        <div
          v-if="contextMenuTab"
          class="n-tab-panel__context-menu-item"
          @click="duplicateTab(contextMenuTab.id)"
        >
          <span class="n-tab-panel__context-menu-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path
                d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
              ></path>
            </svg>
          </span>
          Duplicate
        </div>
        <div
          v-if="props.closable"
          class="n-tab-panel__context-menu-item"
          @click="closeAllTabs"
        >
          <span class="n-tab-panel__context-menu-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </span>
          Close All
        </div>
      </div>

      <!-- Tab Preview (wenn aktiviert) -->
      <div
        v-if="
          props.showTabPreview &&
          showPreview &&
          previewTab &&
          previewTab.preview
        "
        class="n-tab-panel__preview"
        :style="{
          left: previewPosition.x + 'px',
          top: previewPosition.y + 'px',
        }"
      >
        <div class="n-tab-panel__preview-content">
          <img
            v-if="typeof previewTab.preview === 'string'"
            :src="previewTab.preview"
            alt="Tab preview"
          />
          <component v-else :is="previewTab.preview" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";

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
  orientation?: "horizontal" | "vertical";
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
  size?: "small" | "medium" | "large";
  /** Ob die Tabs scrollbar sein sollen, wenn sie nicht alle angezeigt werden können */
  scrollable?: boolean;
  /** Ob ein Kontextmenü für die Tabs angezeigt werden soll */
  contextMenu?: boolean;
  /** Maximale Anzahl an Tabs die gleichzeitig angezeigt werden können (0 = unbegrenzt) */
  maxTabs?: number;
  /** Typ der Anzeige für die Tabs */
  displayType?: "default" | "cards" | "pills" | "underlined";
  /** Ob eine Tab-Vorschau angezeigt werden soll, wenn man über einen Tab hovert */
  showTabPreview?: boolean;
  /** Ob Tab-Anheftungen (pinning) unterstützt werden sollen */
  allowPinning?: boolean;
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
  /** Ob der Tab angeheftet ist (wird immer zuerst angezeigt) */
  pinned?: boolean;
  /** Badge-Zähler oder Text der im Tab angezeigt wird */
  badge?: string | number;
  /** Farbe des Badges */
  badgeColor?: string;
  /** Vorschaubild oder Komponente für den Tab */
  preview?: string | object;
}

const props = withDefaults(defineProps<TabPanelProps>(), {
  activeId: "",
  orientation: "horizontal",
  closable: false,
  addable: false,
  draggable: false,
  lazy: false,
  bordered: true,
  elevated: false,
  size: "medium",
  scrollable: true,
  contextMenu: false,
  maxTabs: 0,
  displayType: "default",
  showTabPreview: false,
  allowPinning: false,
});

const emit = defineEmits<{
  /** Wird ausgelöst, wenn ein Tab ausgewählt wird */
  (e: "update:active-id", id: string): void;
  /** Wird ausgelöst, wenn ein Tab geschlossen wird */
  (e: "close", id: string): void;
  /** Wird ausgelöst, wenn die Reihenfolge der Tabs geändert wird */
  (e: "reorder", ids: string[]): void;
  /** Wird ausgelöst, wenn ein Tab hinzugefügt werden soll */
  (e: "add"): void;
  /** Wird ausgelöst, wenn ein Tab angeheftet oder losgelöst wird */
  (e: "pin", id: string, pinned: boolean): void;
  /** Wird ausgelöst, wenn das Kontextmenü für einen Tab geöffnet wird */
  (e: "context-menu", tab: Tab, event: MouseEvent): void;
  /** Wird ausgelöst, wenn ein Tab dupliziert werden soll */
  (e: "duplicate", id: string): void;
  /** Wird ausgelöst, wenn alle anderen Tabs geschlossen werden sollen */
  (e: "close-others", id: string): void;
  /** Wird ausgelöst, wenn alle Tabs geschlossen werden sollen */
  (e: "close-all"): void;
}>();

// Reaktive Zustände
const activeTabId = ref(
  props.activeId || (props.tabs.length > 0 ? props.tabs[0].id : ""),
);
const mountedTabs = ref(new Set<string>());
const tabsContainer = ref<HTMLElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
const isDragging = ref(false);
const draggedTabIndex = ref(-1);
const contextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuTabId = ref<string | null>(null);
const hoveredTabId = ref<string | null>(null);
const showPreview = ref(false);
const previewPosition = ref({ x: 0, y: 0 });
const tabHoverTimeout = ref<number | null>(null);

// Berechnete Eigenschaften
const sortedTabs = computed(() => {
  // Sortiere die Tabs so, dass angeheftete Tabs zuerst kommen
  if (!props.allowPinning) return props.tabs;

  return [...props.tabs].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });
});

const visibleTabs = computed(() => {
  if (props.maxTabs <= 0) return sortedTabs.value;

  // Wenn maxTabs gesetzt ist, zeige nur so viele Tabs an
  // Priorisiere den aktiven Tab und angeheftete Tabs
  const pinnedTabs = sortedTabs.value.filter((tab) => tab.pinned);
  const activeTab = sortedTabs.value.find(
    (tab) => tab.id === activeTabId.value && !tab.pinned,
  );

  // Wenn wir schon zu viele angeheftete Tabs haben
  if (pinnedTabs.length >= props.maxTabs) {
    // Stelle sicher, dass der aktive Tab dabei ist
    if (activeTab && !activeTab.pinned) {
      // Ersetze den letzten angehefteten Tab durch den aktiven Tab
      return [...pinnedTabs.slice(0, props.maxTabs - 1), activeTab];
    }
    // Zeige nur angeheftete Tabs an (begrenzt auf maxTabs)
    return pinnedTabs.slice(0, props.maxTabs);
  }

  // Normale Tabs (nicht angeheftet und nicht aktiv)
  const normalTabs = sortedTabs.value.filter(
    (tab) => !tab.pinned && tab.id !== activeTabId.value,
  );

  // Berechne, wie viele normale Tabs wir anzeigen können
  const remainingSlots =
    props.maxTabs - pinnedTabs.length - (activeTab ? 1 : 0);
  const visibleNormalTabs = normalTabs.slice(0, Math.max(0, remainingSlots));

  // Kombiniere alle sichtbaren Tabs
  const result = [...pinnedTabs];
  if (activeTab) result.push(activeTab);
  result.push(...visibleNormalTabs);

  return result;
});

const contextMenuTab = computed(() => {
  if (!contextMenuTabId.value) return null;
  return props.tabs.find((tab) => tab.id === contextMenuTabId.value) || null;
});

const previewTab = computed(() => {
  if (!hoveredTabId.value || !props.showTabPreview) return null;
  return props.tabs.find((tab) => tab.id === hoveredTabId.value) || null;
});

// Überwache Änderungen an der activeId-Prop
watch(
  () => props.activeId,
  (newValue) => {
    if (newValue && newValue !== activeTabId.value) {
      activeTabId.value = newValue;
    }
  },
);

// Überwache Änderungen am aktiven Tab
watch(
  () => activeTabId.value,
  (newValue) => {
    if (newValue && props.lazy) {
      mountedTabs.value.add(newValue);
    }
  },
);

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
watch(
  () => props.tabs,
  () => {
    nextTick(() => {
      checkScrollable();
    });
  },
  { deep: true },
);

/**
 * Wählt einen Tab aus
 * @param id Die ID des auszuwählenden Tabs
 */
function selectTab(id: string) {
  if (id === activeTabId.value) return;

  activeTabId.value = id;
  emit("update:active-id", id);

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
  emit("close", id);

  // Wenn der aktive Tab geschlossen wird, wähle einen anderen Tab aus
  if (id === activeTabId.value && props.tabs.length > 1) {
    // Finde den Index des aktuellen Tabs
    const currentIndex = props.tabs.findIndex((tab) => tab.id === id);

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
  emit("add");
}

/**
 * Überprüft, ob die Tabs scrollbar sind
 */
function checkScrollable() {
  if (!tabsContainer.value || !props.scrollable) return;

  const container = tabsContainer.value;
  canScrollLeft.value = container.scrollLeft > 0;
  canScrollRight.value =
    container.scrollLeft + container.clientWidth < container.scrollWidth;
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
  const activeTab = container.querySelector(
    ".n-tab-panel__tab--active",
  ) as HTMLElement;

  if (activeTab) {
    const containerRect = container.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();

    if (tabRect.left < containerRect.left) {
      // Tab ist links außerhalb des sichtbaren Bereichs
      container.scrollLeft -= containerRect.left - tabRect.left;
    } else if (tabRect.right > containerRect.right) {
      // Tab ist rechts außerhalb des sichtbaren Bereichs
      container.scrollLeft += tabRect.right - containerRect.right;
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
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", index.toString());

  // Füge eine Klasse zum Tab hinzu, um das Styling anzupassen
  const target = event.target as HTMLElement;
  target.classList.add("n-tab-panel__tab--dragging");
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
    event.dataTransfer.dropEffect = "move";
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
  target.classList.remove("n-tab-panel__tab--dragging");
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
  if (draggedTabIndex.value === dropIndex || draggedTabIndex.value === -1)
    return;

  // Wir arbeiten mit visibleTabs, müssen aber die Änderungen auf alle Tabs anwenden
  const draggedTabId = visibleTabs.value[draggedTabIndex.value].id;
  const dropTabId = visibleTabs.value[dropIndex].id;

  // Finde die tatsächlichen Indizes in der vollständigen tabs-Liste
  const actualDraggedIndex = props.tabs.findIndex(
    (tab) => tab.id === draggedTabId,
  );
  const actualDropIndex = props.tabs.findIndex((tab) => tab.id === dropTabId);

  if (actualDraggedIndex === -1 || actualDropIndex === -1) return;

  // Erstelle eine Kopie der Tabs und ordne sie neu an
  const newTabs = [...props.tabs];
  const draggedTab = newTabs[actualDraggedIndex];

  // Entferne den gezogenen Tab
  newTabs.splice(actualDraggedIndex, 1);

  // Füge ihn an der neuen Position ein
  newTabs.splice(actualDropIndex, 0, draggedTab);

  // Emittiere das Reorder-Event
  emit(
    "reorder",
    newTabs.map((tab) => tab.id),
  );
}

/**
 * Prüft, ob ein Icon ein Komponenten-Object ist
 * @param icon Das zu prüfende Icon
 */
function isComponent(icon: any): boolean {
  return typeof icon === "object";
}

/**
 * Gibt die Icon-Komponente zurück
 * @param icon Das Icon als String oder Komponente
 */
function getIconComponent(icon: any): any {
  return isComponent(icon) ? icon : null;
}

/**
 * Öffnet das Kontextmenü für einen Tab
 * @param event Das MouseEvent
 * @param tab Der Tab
 */
function handleContextMenu(event: MouseEvent, tab: Tab) {
  // Verhindere das Standard-Kontextmenü
  event.preventDefault();

  // Setze die Position des Kontextmenüs
  contextMenuPosition.value = { x: event.clientX, y: event.clientY };
  contextMenuTabId.value = tab.id;
  contextMenuVisible.value = true;

  // Emittiere das Context-Menu-Event
  emit("context-menu", tab, event);

  // Schließe das Kontextmenü, wenn außerhalb geklickt wird
  document.addEventListener("click", closeContextMenu);
}

/**
 * Schließt das Kontextmenü
 */
function closeContextMenu() {
  contextMenuVisible.value = false;
  contextMenuTabId.value = null;

  // Entferne den Event-Listener
  document.removeEventListener("click", closeContextMenu);
}

/**
 * Schaltet den angehefteten Zustand eines Tabs um
 * @param id Die ID des Tabs
 */
function togglePinTab(id: string) {
  if (!props.allowPinning) return;

  // Finde den Tab
  const tab = props.tabs.find((tab) => tab.id === id);
  if (!tab) return;

  // Schalte den angehefteten Zustand um
  const pinned = !tab.pinned;

  // Emittiere das Pin-Event
  emit("pin", id, pinned);

  // Schließe das Kontextmenü
  closeContextMenu();
}

/**
 * Schließt alle anderen Tabs außer dem angegebenen
 * @param id Die ID des Tabs, der nicht geschlossen werden soll
 */
function closeOtherTabs(id: string) {
  if (!props.closable) return;

  // Emittiere das Close-Others-Event
  emit("close-others", id);

  // Schließe das Kontextmenü
  closeContextMenu();
}

/**
 * Schließt alle Tabs
 */
function closeAllTabs() {
  if (!props.closable) return;

  // Emittiere das Close-All-Event
  emit("close-all");

  // Schließe das Kontextmenü
  closeContextMenu();
}

/**
 * Dupliziert einen Tab
 * @param id Die ID des Tabs
 */
function duplicateTab(id: string) {
  // Emittiere das Duplicate-Event
  emit("duplicate", id);

  // Schließe das Kontextmenü
  closeContextMenu();
}

/**
 * Behandelt das Mouseenter-Event eines Tabs
 * @param id Die ID des Tabs
 * @param event Das MouseEvent
 */
function handleTabMouseEnter(id: string, event: MouseEvent) {
  if (!props.showTabPreview) return;

  hoveredTabId.value = id;

  // Zeige die Vorschau nach einer kurzen Verzögerung an
  if (tabHoverTimeout.value !== null) {
    window.clearTimeout(tabHoverTimeout.value);
  }

  tabHoverTimeout.value = window.setTimeout(() => {
    const tab = props.tabs.find((t) => t.id === id);
    if (tab && tab.preview) {
      showPreview.value = true;

      // Positioniere die Vorschau unter dem Tab
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();

      previewPosition.value = {
        x: rect.left,
        y: rect.bottom + 8,
      };
    }
  }, 500); // 500ms Verzögerung
}

/**
 * Behandelt das Mouseleave-Event eines Tabs
 */
function handleTabMouseLeave() {
  if (!props.showTabPreview) return;

  // Verstecke die Vorschau nach einer kurzen Verzögerung
  if (tabHoverTimeout.value !== null) {
    window.clearTimeout(tabHoverTimeout.value);
    tabHoverTimeout.value = null;
  }

  // Verstecke die Vorschau nach einer kurzen Verzögerung
  tabHoverTimeout.value = window.setTimeout(() => {
    showPreview.value = false;
    hoveredTabId.value = null;
  }, 200); // 200ms Verzögerung
}
</script>

<style scoped>
/* Context Menu Styles */
.n-tab-panel__context-menu {
  position: fixed;
  background-color: var(--n-background-color, #ffffff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border-radius: var(--n-border-radius, 4px);
  padding: 8px 0;
  min-width: 180px;
  z-index: 1000;
}

.n-tab-panel__context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background-color 0.2s ease;
}

.n-tab-panel__context-menu-item:hover {
  background-color: var(--n-tab-panel-hover-color, rgba(0, 0, 0, 0.05));
}

.n-tab-panel__context-menu-icon {
  margin-right: 8px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.n-tab-panel__context-menu-icon svg {
  width: 14px;
  height: 14px;
}

/* Preview Styles */
.n-tab-panel__preview {
  position: fixed;
  z-index: 999;
  background-color: var(--n-background-color, #ffffff);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: var(--n-border-radius, 4px);
  overflow: hidden;
  max-width: 320px;
  max-height: 240px;
}

.n-tab-panel__preview-content {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.n-tab-panel__preview-content img {
  width: 100%;
  height: auto;
  object-fit: cover;
}

/* Badge Styles */
.n-tab-panel__tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 9px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  margin-left: 8px;
  background-color: var(--n-primary-color, #3182ce);
}

/* Pin Button Styles */
.n-tab-panel__tab-pin {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-left: 4px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: currentColor;
  opacity: 0.6;
  transition:
    opacity 0.2s ease,
    background-color 0.2s ease;
}

.n-tab-panel__tab-pin svg {
  width: 12px;
  height: 12px;
  transform: rotate(45deg);
}

.n-tab-panel__tab-pin:hover {
  opacity: 1;
  background-color: var(--n-tab-panel-hover-color, rgba(0, 0, 0, 0.1));
}

.n-tab-panel__tab-pin-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
  color: var(--n-primary-color, #3182ce);
}

.n-tab-panel__tab-pin-indicator svg {
  width: 12px;
  height: 12px;
  transform: rotate(45deg);
}

/* Pinned Tab Styles */
.n-tab-panel__tab--pinned {
  background-color: var(--n-tab-panel-pinned-color, rgba(49, 130, 206, 0.05));
}

/* Display Type Styles */
.n-tab-panel__tab--cards {
  border: 1px solid var(--n-border-color, #e2e8f0);
  border-bottom: none;
  border-radius: var(--n-border-radius, 4px) var(--n-border-radius, 4px) 0 0;
  margin-right: 4px;
  background-color: var(--n-tab-panel-card-bg, #f8fafc);
}

.n-tab-panel__tab--cards.n-tab-panel__tab--active {
  border-bottom: 1px solid var(--n-background-color, #ffffff);
  margin-bottom: -1px;
  background-color: var(--n-background-color, #ffffff);
}

.n-tab-panel__tab--cards.n-tab-panel__tab--active::after {
  display: none;
}

.n-tab-panel__tab--pills {
  border-radius: var(--n-border-radius, 4px);
  margin-right: 4px;
}

.n-tab-panel__tab--pills.n-tab-panel__tab--active {
  background-color: var(--n-primary-color, #3182ce);
  color: white;
}

.n-tab-panel__tab--pills.n-tab-panel__tab--active::after {
  display: none;
}

.n-tab-panel__tab--underlined {
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.n-tab-panel__tab--underlined.n-tab-panel__tab--active {
  border-bottom-color: var(--n-primary-color, #3182ce);
}

.n-tab-panel__tab--underlined.n-tab-panel__tab--active::after {
  display: none;
}
.n-tab-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: var(
    --n-tab-panel-background-color,
    var(--n-background-color, #f5f7fa)
  );
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
  background-color: var(
    --n-tab-panel-header-background-color,
    var(--n-background-color, #f5f7fa)
  );
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
  background-color: var(
    --n-tab-panel-header-background-color,
    var(--n-background-color, #f5f7fa)
  );
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
  transition:
    color 0.2s ease,
    background-color 0.2s ease;
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
  content: "";
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
  color: var(
    --n-tab-panel-tab-disabled-color,
    var(--n-text-disabled-color, #cbd5e0)
  );
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
  transition:
    opacity 0.2s ease,
    background-color 0.2s ease;
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
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
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
  background-color: var(
    --n-tab-panel-content-background-color,
    var(--n-background-color, #f5f7fa)
  );
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
