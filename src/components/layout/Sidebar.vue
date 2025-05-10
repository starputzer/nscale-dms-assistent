<template>
  <div 
    class="n-sidebar"
    :class="{ 
      'n-sidebar--collapsed': collapsed,
      'n-sidebar--mini': mini && collapsed
    }"
    :aria-expanded="!collapsed"
  >
    <div class="n-sidebar__inner">
      <!-- Sidebar Header -->
      <div class="n-sidebar__header">
        <slot name="header">
          <div 
            v-if="!collapsed || !mini" 
            class="n-sidebar__title"
          >
            {{ title }}
          </div>
          <button 
            class="n-sidebar__toggle-btn"
            @click="toggleCollapse"
            aria-label="Toggle sidebar"
            tabindex="0"
          >
            <svg 
              class="n-sidebar__toggle-icon" 
              :class="{ 'n-sidebar__toggle-icon--collapsed': collapsed }"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        </slot>
      </div>
      
      <!-- Sidebar Content -->
      <div class="n-sidebar__content">
        <slot>
          <!-- Favorites Section (if enabled) -->
          <div
            v-if="props.showFavorites && favoriteMenuItems.length > 0"
            class="n-sidebar__favorites"
          >
            <div class="n-sidebar__section-title">
              <span v-if="!collapsed || !mini">Favoriten</span>
            </div>
            <ul class="n-sidebar__nav-list">
              <li
                v-for="item in favoriteMenuItems"
                :key="item.id"
                :class="{
                  'n-sidebar__nav-item--active': item.active,
                  'n-sidebar__nav-item--has-children': item.children?.length,
                  'n-sidebar__nav-item--expanded': expandedItems.includes(item.id),
                  'n-sidebar__nav-item--favorite': true
                }"
                class="n-sidebar__nav-item"
                :draggable="props.favoritesDraggable"
                @dragstart="handleDragStart($event, item.id, true)"
                @dragover="handleDragOver($event, item.id, true)"
                @dragleave="handleDragLeave($event)"
                @dragend="handleDragEnd($event)"
                @drop="handleDrop($event, item.id, true)"
                @contextmenu="openContextMenu($event, item)"
              >
                <div
                  class="n-sidebar__nav-link-wrapper"
                  @click="handleItemClick(item)"
                  @keydown.enter="handleItemClick(item)"
                  @keydown.space="handleItemClick(item)"
                  :tabindex="item.disabled ? -1 : 0"
                  :aria-disabled="item.disabled"
                  :aria-current="item.active ? 'page' : undefined"
                  role="menuitem"
                >
                  <a
                    v-if="item.route && !item.disabled"
                    :href="item.route"
                    class="n-sidebar__nav-link"
                    :class="{ 'n-sidebar__nav-link--active': item.active }"
                    @click.prevent="navigateTo(item)"
                  >
                    <span v-if="item.icon" class="n-sidebar__nav-icon">
                      <component :is="getIconComponent(item.icon)" v-if="isComponent(item.icon)" />
                      <i v-else :class="item.icon"></i>
                    </span>
                    <span v-if="!collapsed || !mini" class="n-sidebar__nav-label">{{ item.label }}</span>

                    <!-- Remove from favorites button -->
                    <button
                      v-if="(!collapsed || !mini)"
                      class="n-sidebar__action-button n-sidebar__action-button--remove-favorite"
                      @click.stop="removeFromFavorites(item.id)"
                      aria-label="Remove from favorites"
                      title="Remove from favorites"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 17.75l-6.172 3.245 1.179-6.873-4.993-4.867 6.9-1.002L12 2l3.086 6.253 6.9 1.002-4.993 4.867 1.179 6.873z"></path>
                      </svg>
                    </button>
                  </a>
                  <!-- Non-route version handled similarly -->
                  <div
                    v-else
                    class="n-sidebar__nav-link"
                    :class="{
                      'n-sidebar__nav-link--active': item.active,
                      'n-sidebar__nav-link--disabled': item.disabled
                    }"
                  >
                    <span v-if="item.icon" class="n-sidebar__nav-icon">
                      <component :is="getIconComponent(item.icon)" v-if="isComponent(item.icon)" />
                      <i v-else :class="item.icon"></i>
                    </span>
                    <span v-if="!collapsed || !mini" class="n-sidebar__nav-label">{{ item.label }}</span>

                    <!-- Remove from favorites button -->
                    <button
                      v-if="(!collapsed || !mini)"
                      class="n-sidebar__action-button n-sidebar__action-button--remove-favorite"
                      @click.stop="removeFromFavorites(item.id)"
                      aria-label="Remove from favorites"
                      title="Remove from favorites"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 17.75l-6.172 3.245 1.179-6.873-4.993-4.867 6.9-1.002L12 2l3.086 6.253 6.9 1.002-4.993 4.867 1.179 6.873z"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            </ul>
            <div class="n-sidebar__section-divider"></div>
          </div>

          <!-- Default Navigation Menu -->
          <nav class="n-sidebar__nav" aria-label="Main Navigation">
            <ul class="n-sidebar__nav-list">
              <li
                v-for="item in regularMenuItems"
                :key="item.id"
                :class="{
                  'n-sidebar__nav-item--active': item.active,
                  'n-sidebar__nav-item--has-children': item.children?.length,
                  'n-sidebar__nav-item--expanded': expandedItems.includes(item.id)
                }"
                class="n-sidebar__nav-item"
                :draggable="props.draggable"
                @dragstart="handleDragStart($event, item.id)"
                @dragover="handleDragOver($event, item.id)"
                @dragleave="handleDragLeave($event)"
                @dragend="handleDragEnd($event)"
                @drop="handleDrop($event, item.id)"
                @contextmenu="openContextMenu($event, item)"
              >
                <div 
                  class="n-sidebar__nav-link-wrapper"
                  @click="handleItemClick(item)"
                  @keydown.enter="handleItemClick(item)"
                  @keydown.space="handleItemClick(item)"
                  :tabindex="item.disabled ? -1 : 0"
                  :aria-disabled="item.disabled"
                  :aria-current="item.active ? 'page' : undefined"
                  role="menuitem"
                >
                  <a 
                    v-if="item.route && !item.disabled"
                    :href="item.route"
                    class="n-sidebar__nav-link"
                    :class="{ 'n-sidebar__nav-link--active': item.active }"
                    @click.prevent="navigateTo(item)"
                  >
                    <span v-if="item.icon" class="n-sidebar__nav-icon">
                      <component :is="getIconComponent(item.icon)" v-if="isComponent(item.icon)" />
                      <i v-else :class="item.icon"></i>
                    </span>
                    <span v-if="!collapsed || !mini" class="n-sidebar__nav-label">{{ item.label }}</span>
                  </a>
                  <div 
                    v-else
                    class="n-sidebar__nav-link"
                    :class="{ 
                      'n-sidebar__nav-link--active': item.active,
                      'n-sidebar__nav-link--disabled': item.disabled
                    }"
                  >
                    <span v-if="item.icon" class="n-sidebar__nav-icon">
                      <component :is="getIconComponent(item.icon)" v-if="isComponent(item.icon)" />
                      <i v-else :class="item.icon"></i>
                    </span>
                    <span v-if="!collapsed || !mini" class="n-sidebar__nav-label">{{ item.label }}</span>
                    
                    <span
                      v-if="item.children?.length && (!collapsed || !mini)"
                      class="n-sidebar__nav-arrow"
                      :class="{ 'n-sidebar__nav-arrow--expanded': expandedItems.includes(item.id) }"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </span>

                    <!-- Add to favorites button -->
                    <button
                      v-if="props.showFavorites && (!collapsed || !mini) && !favoriteItems.includes(item.id)"
                      class="n-sidebar__action-button n-sidebar__action-button--add-favorite"
                      @click.stop="addToFavorites(item.id)"
                      aria-label="Add to favorites"
                      title="Add to favorites"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 17.75l-6.172 3.245 1.179-6.873-4.993-4.867 6.9-1.002L12 2l3.086 6.253 6.9 1.002-4.993 4.867 1.179 6.873z"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                
                <!-- Nested menu items -->
                <transition 
                  name="n-sidebar-submenu"
                  @enter="startSubmenuTransition"
                  @after-enter="endSubmenuTransition"
                  @before-leave="startSubmenuTransition"
                  @after-leave="endSubmenuTransition"
                >
                  <ul 
                    v-if="item.children?.length && expandedItems.includes(item.id) && (!collapsed || !mini)" 
                    class="n-sidebar__nav-submenu"
                    role="menu"
                  >
                    <li 
                      v-for="child in item.children" 
                      :key="child.id"
                      class="n-sidebar__nav-subitem"
                      :class="{ 'n-sidebar__nav-subitem--active': child.active }"
                    >
                      <a 
                        v-if="child.route && !child.disabled"
                        :href="child.route"
                        class="n-sidebar__nav-sublink"
                        :class="{ 'n-sidebar__nav-sublink--active': child.active }"
                        @click.prevent="navigateTo(child)"
                        role="menuitem"
                        :tabindex="child.disabled ? -1 : 0"
                        :aria-disabled="child.disabled"
                        :aria-current="child.active ? 'page' : undefined"
                      >
                        <span v-if="child.icon" class="n-sidebar__nav-subicon">
                          <component :is="getIconComponent(child.icon)" v-if="isComponent(child.icon)" />
                          <i v-else :class="child.icon"></i>
                        </span>
                        <span class="n-sidebar__nav-sublabel">{{ child.label }}</span>
                      </a>
                      <div 
                        v-else
                        class="n-sidebar__nav-sublink"
                        :class="{ 
                          'n-sidebar__nav-sublink--active': child.active,
                          'n-sidebar__nav-sublink--disabled': child.disabled
                        }"
                        role="menuitem"
                        :tabindex="child.disabled ? -1 : 0"
                        :aria-disabled="child.disabled"
                      >
                        <span v-if="child.icon" class="n-sidebar__nav-subicon">
                          <component :is="getIconComponent(child.icon)" v-if="isComponent(child.icon)" />
                          <i v-else :class="child.icon"></i>
                        </span>
                        <span class="n-sidebar__nav-sublabel">{{ child.label }}</span>
                      </div>
                    </li>
                  </ul>
                </transition>
              </li>
            </ul>
          </nav>
        </slot>
      </div>

      <!-- Context Menu (Shown when right-clicking on a menu item) -->
      <div
        v-if="contextMenuVisible"
        class="n-sidebar-context-menu"
        :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }"
      >
        <div
          v-if="contextMenuItem"
          class="n-sidebar-context-menu__item"
          @click="addToFavorites(contextMenuItem.id)"
          v-show="props.showFavorites && !favoriteItems.includes(contextMenuItem.id)"
        >
          <span class="n-sidebar-context-menu__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 17.75l-6.172 3.245 1.179-6.873-4.993-4.867 6.9-1.002L12 2l3.086 6.253 6.9 1.002-4.993 4.867 1.179 6.873z"></path>
            </svg>
          </span>
          Add to favorites
        </div>
        <div
          v-if="contextMenuItem"
          class="n-sidebar-context-menu__item"
          @click="removeFromFavorites(contextMenuItem.id)"
          v-show="props.showFavorites && favoriteItems.includes(contextMenuItem.id)"
        >
          <span class="n-sidebar-context-menu__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 17.75l-6.172 3.245 1.179-6.873-4.993-4.867 6.9-1.002L12 2l3.086 6.253 6.9 1.002-4.993 4.867 1.179 6.873z"></path>
            </svg>
          </span>
          Remove from favorites
        </div>
        <div
          class="n-sidebar-context-menu__item"
          @click="contextMenuItemClick('expand', contextMenuItem)"
          v-show="contextMenuItem && contextMenuItem.children?.length"
        >
          <span class="n-sidebar-context-menu__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
          {{expandedItems.includes(contextMenuItem?.id || '') ? 'Collapse' : 'Expand'}}
        </div>
      </div>

      <!-- Sidebar Footer -->
      <div class="n-sidebar__footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch } from 'vue';
import type { SidebarItem } from './MainLayout.vue';

/**
 * Sidebar-Komponente für den nscale DMS Assistenten
 * Bietet eine zusammenklappbare Seitenleiste mit Navigationselementen.
 * @displayName Sidebar
 */
export interface SidebarProps {
  /** Titel der Sidebar */
  title?: string;
  /** Ob die Sidebar eingeklappt ist */
  collapsed?: boolean;
  /** Navigationselemente der Sidebar */
  items?: SidebarItem[];
  /** Ob die Sidebar im Mini-Modus (nur Icons) angezeigt werden soll, wenn eingeklappt */
  mini?: boolean;
  /** Standardmäßig ausgefahrene Elemente (nach ID) */
  defaultExpanded?: string[];
  /** Ob das Umschalten per Klick auf Elemente möglich sein soll */
  collapseOnItemClick?: boolean;
  /** Ob Drag & Drop für Menüpunkte aktiviert sein soll */
  draggable?: boolean;
  /** Ob ein Favoritenbereich angezeigt werden soll */
  showFavorites?: boolean;
  /** Favorisierte Menüpunkte (IDs) */
  favorites?: string[];
  /** Modus der Sidebar-Navigation */
  mode?: 'default' | 'tree' | 'accordion';
  /** Auto-Collapse bei kleinen Bildschirmen */
  autoCollapseOnMobile?: boolean;
  /** Ob Drag & Drop für Favoritenmenüpunkte aktiviert sein soll */
  favoritesDraggable?: boolean;
}

const props = withDefaults(defineProps<SidebarProps>(), {
  title: 'Navigation',
  collapsed: false,
  items: () => [],
  mini: true,
  defaultExpanded: () => [],
  collapseOnItemClick: false,
  draggable: false,
  showFavorites: false,
  favorites: () => [],
  mode: 'default',
  autoCollapseOnMobile: true,
  favoritesDraggable: true
});

const emit = defineEmits<{
  /** Wird ausgelöst, wenn sich der eingeklappte Zustand der Sidebar ändert */
  (e: 'collapse', value: boolean): void;
  /** Wird ausgelöst, wenn auf ein Element geklickt wird */
  (e: 'item-click', item: SidebarItem): void;
  /** Wird ausgelöst, wenn sich der ausgefahrene Zustand eines Elements ändert */
  (e: 'item-expand', itemId: string, expanded: boolean): void;
  /** Wird ausgelöst, wenn die Reihenfolge der Elemente geändert wird */
  (e: 'reorder', items: SidebarItem[]): void;
  /** Wird ausgelöst, wenn ein Element zu den Favoriten hinzugefügt wird */
  (e: 'add-favorite', itemId: string): void;
  /** Wird ausgelöst, wenn ein Element aus den Favoriten entfernt wird */
  (e: 'remove-favorite', itemId: string): void;
  /** Wird ausgelöst, wenn die Reihenfolge der Favoriten geändert wird */
  (e: 'reorder-favorites', favoriteIds: string[]): void;
  /** Wird ausgelöst, wenn das Kontextmenü für ein Element geöffnet wird */
  (e: 'context-menu', item: SidebarItem, event: MouseEvent): void;
}>();

// Layout-Kontext von der übergeordneten Komponente (falls vorhanden)
const layoutContext = inject('layout', null);

// Berechnete Eigenschaften
const favoriteMenuItems = computed(() => {
  if (!props.showFavorites) return [];

  return favoriteItems.value
    .map(id => props.items.find(item => item.id === id))
    .filter(item => item) as SidebarItem[];
});

const regularMenuItems = computed(() => {
  if (!props.showFavorites) return props.items;

  // Wenn Favoriten angezeigt werden, zeige nur die Elemente, die nicht in den Favoriten sind
  return props.items.filter(item => !favoriteItems.value.includes(item.id));
});

// Reaktive Zustände
const expandedItems = ref<string[]>(props.defaultExpanded || []);
const isMobile = ref(false);
const favoriteItems = ref<string[]>(props.favorites || []);
const isDragging = ref(false);
const draggedItemId = ref<string | null>(null);
const draggedFavoriteId = ref<string | null>(null);
const isDraggingFavorite = ref(false);
const contextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuItem = ref<SidebarItem | null>(null);

// Überwache Änderungen an der collapsed-Prop
watch(() => props.collapsed, (newValue) => {
  // Wenn die Sidebar eingeklappt wird und im Mini-Modus ist, werden alle ausgefahrenen Elemente geschlossen
  if (newValue && props.mini) {
    expandedItems.value = [];
  }
});

// Überwache Änderungen an den Favoriten
watch(() => props.favorites, (newValue) => {
  if (newValue) {
    favoriteItems.value = [...newValue];
  }
}, { deep: true });

// Überwache den Mobile-Status des Layout-Kontext
watch(() => layoutContext?.isMobile?.value, (newValue) => {
  if (newValue !== undefined) {
    isMobile.value = newValue;

    // Auto-Collapse auf Mobile-Geräten, wenn aktiviert
    if (props.autoCollapseOnMobile && newValue && !props.collapsed) {
      toggleCollapse();
    }
  }
}, { immediate: true });

// Überwache Änderungen am Mode, um Akkordeon-Verhalten zu implementieren
watch(() => props.mode, () => {
  // Akkordeon-Modus: Nur ein Element kann gleichzeitig expandiert sein
  if (props.mode === 'accordion' && expandedItems.value.length > 1) {
    // Behalte nur das zuletzt expandierte Element
    const lastExpandedItem = expandedItems.value[expandedItems.value.length - 1];
    expandedItems.value = [lastExpandedItem];
  }
});

/**
 * Schaltet den eingeklappten Zustand der Sidebar um
 */
function toggleCollapse() {
  emit('collapse', !props.collapsed);
  
  // Falls layoutContext vorhanden ist, aktualisiere den Zustand dort
  if (layoutContext && typeof layoutContext.toggleSidebar === 'function') {
    layoutContext.toggleSidebar();
  }
}

/**
 * Behandelt Klicks auf Navigationselemente
 * @param item Das angeklickte Element
 */
function handleItemClick(item: SidebarItem) {
  // Deaktivierte Elemente ignorieren
  if (item.disabled) return;
  
  emit('item-click', item);
  
  // Wenn das Element Kinder hat, schalte den ausgefahrenen Zustand um
  if (item.children?.length) {
    toggleItemExpand(item.id);
  } else if (item.route) {
    // Wenn das Element eine Route hat, navigiere dorthin
    navigateTo(item);
    
    // Wenn collapseOnItemClick aktiviert ist, klappe die Sidebar ein
    if (props.collapseOnItemClick && !props.collapsed) {
      toggleCollapse();
    }
  }
}

/**
 * Schaltet den ausgefahrenen Zustand eines Elements um
 * @param itemId Die ID des Elements
 */
function toggleItemExpand(itemId: string) {
  const index = expandedItems.value.indexOf(itemId);
  const expanded = index === -1;
  
  if (expanded) {
    expandedItems.value.push(itemId);
  } else {
    expandedItems.value.splice(index, 1);
  }
  
  emit('item-expand', itemId, expanded);
}

/**
 * Navigiert zu einer Route
 * @param item Das Element mit der Route
 */
function navigateTo(item: SidebarItem) {
  if (item.disabled || !item.route) return;

  // Hier würde die eigentliche Navigation erfolgen (z.B. mit Vue Router)
  // Für diese Komponente wird nur das Event ausgelöst
  emit('item-click', item);

  // Wenn Vue Router verfügbar ist, nutze es für die Navigation
  if (window.hasOwnProperty('$router')) {
    // @ts-ignore - $router ist nicht im globalen Scope definiert
    window.$router.push(item.route);
  } else {
    // Fallback: Öffne die Route als normalen Link
    window.location.href = item.route;
  }
}

/**
 * Fügt ein Element zu den Favoriten hinzu
 * @param itemId Die ID des Elements
 */
function addToFavorites(itemId: string) {
  if (!favoriteItems.value.includes(itemId)) {
    favoriteItems.value.push(itemId);
    emit('add-favorite', itemId);
  }
}

/**
 * Entfernt ein Element aus den Favoriten
 * @param itemId Die ID des Elements
 */
function removeFromFavorites(itemId: string) {
  const index = favoriteItems.value.indexOf(itemId);
  if (index !== -1) {
    favoriteItems.value.splice(index, 1);
    emit('remove-favorite', itemId);
  }
}

/**
 * Behandelt den Start des Drag & Drop für Menüpunkte
 * @param event Das DragEvent
 * @param itemId Die ID des Elements
 * @param isFavorite Ob das Element ein Favorit ist
 */
function handleDragStart(event: DragEvent, itemId: string, isFavorite: boolean = false) {
  if (!event.dataTransfer) return;

  if (isFavorite && !props.favoritesDraggable) return;
  if (!isFavorite && !props.draggable) return;

  isDragging.value = true;
  isDraggingFavorite.value = isFavorite;

  if (isFavorite) {
    draggedFavoriteId.value = itemId;
  } else {
    draggedItemId.value = itemId;
  }

  // Setze die Drag-Daten
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', itemId);
  event.dataTransfer.setData('application/x-item-type', isFavorite ? 'favorite' : 'regular');

  // Füge eine Klasse zum Element hinzu, um das Styling anzupassen
  const target = event.target as HTMLElement;
  target.classList.add('n-sidebar__nav-item--dragging');
}

/**
 * Behandelt das Dragover-Event
 * @param event Das DragEvent
 * @param itemId Die ID des Elements
 * @param isFavorite Ob das Element ein Favorit ist
 */
function handleDragOver(event: DragEvent, itemId: string, isFavorite: boolean = false) {
  // Prüfe, ob das Item vom gleichen Typ ist (Favorit zu Favorit, Regular zu Regular)
  if (isDraggingFavorite.value !== isFavorite) return;

  // Ignoriere, wenn über das gezogene Element selbst
  if ((isFavorite && draggedFavoriteId.value === itemId) ||
      (!isFavorite && draggedItemId.value === itemId)) return;

  event.preventDefault();
  event.stopPropagation();

  // Setze den Drop-Effekt
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }

  // Füge eine Klasse zum Element hinzu, um das Styling anzupassen
  const target = event.currentTarget as HTMLElement;
  target.classList.add('n-sidebar__nav-item--drop-target');
}

/**
 * Behandelt das Dragleave-Event
 * @param event Das DragEvent
 */
function handleDragLeave(event: DragEvent) {
  // Entferne die Klasse vom Element
  const target = event.currentTarget as HTMLElement;
  target.classList.remove('n-sidebar__nav-item--drop-target');
}

/**
 * Behandelt das Ende des Drag & Drop
 * @param event Das DragEvent
 */
function handleDragEnd(event: DragEvent) {
  isDragging.value = false;
  isDraggingFavorite.value = false;
  draggedItemId.value = null;
  draggedFavoriteId.value = null;

  // Entferne die Klasse vom Element
  const target = event.target as HTMLElement;
  target.classList.remove('n-sidebar__nav-item--dragging');

  // Entferne die Drop-Target-Klasse von allen Elementen
  document.querySelectorAll('.n-sidebar__nav-item--drop-target').forEach(element => {
    element.classList.remove('n-sidebar__nav-item--drop-target');
  });
}

/**
 * Behandelt das Drop-Event
 * @param event Das DragEvent
 * @param dropItemId Die ID des Elements, auf dem das Drop stattfindet
 * @param isFavorite Ob das Element ein Favorit ist
 */
function handleDrop(event: DragEvent, dropItemId: string, isFavorite: boolean = false) {
  event.preventDefault();
  event.stopPropagation();

  // Entferne die Drop-Target-Klasse
  const target = event.currentTarget as HTMLElement;
  target.classList.remove('n-sidebar__nav-item--drop-target');

  // Prüfe, ob das Item vom gleichen Typ ist (Favorit zu Favorit, Regular zu Regular)
  if (isDraggingFavorite.value !== isFavorite) return;

  if (isFavorite) {
    // Favoriten neu anordnen
    if (!draggedFavoriteId.value) return;

    // Finde die Indizes der Items
    const draggedIndex = favoriteItems.value.indexOf(draggedFavoriteId.value);
    const dropIndex = favoriteItems.value.indexOf(dropItemId);

    if (draggedIndex === -1 || dropIndex === -1) return;

    // Erstelle eine Kopie der Favoriten und ordne sie neu an
    const newFavorites = [...favoriteItems.value];
    const draggedItem = newFavorites[draggedIndex];

    // Entferne das gezogene Item
    newFavorites.splice(draggedIndex, 1);

    // Füge es an der neuen Position ein
    newFavorites.splice(dropIndex, 0, draggedItem);

    // Aktualisiere die Favoriten
    favoriteItems.value = newFavorites;

    // Emittiere das Reorder-Favorites-Event
    emit('reorder-favorites', newFavorites);
  } else {
    // Reguläre Items neu anordnen
    if (!draggedItemId.value) return;

    // Finde die Indizes der Items anhand der IDs
    const draggedItem = props.items.find(item => item.id === draggedItemId.value);
    const dropItem = props.items.find(item => item.id === dropItemId);

    if (!draggedItem || !dropItem) return;

    const draggedIndex = props.items.indexOf(draggedItem);
    const dropIndex = props.items.indexOf(dropItem);

    if (draggedIndex === -1 || dropIndex === -1) return;

    // Erstelle eine Kopie der Items und ordne sie neu an
    const newItems = [...props.items];

    // Entferne das gezogene Item
    newItems.splice(draggedIndex, 1);

    // Füge es an der neuen Position ein
    newItems.splice(dropIndex, 0, draggedItem);

    // Emittiere das Reorder-Event
    emit('reorder', newItems);
  }
}

/**
 * Öffnet das Kontextmenü für ein Element
 * @param event Das MouseEvent
 * @param item Das Element
 */
function openContextMenu(event: MouseEvent, item: SidebarItem) {
  event.preventDefault();

  // Setze die Position des Kontextmenüs
  contextMenuPosition.value = { x: event.clientX, y: event.clientY };
  contextMenuItem.value = item;
  contextMenuVisible.value = true;

  // Emittiere das Context-Menu-Event
  emit('context-menu', item, event);

  // Füge einen Event-Listener hinzu, um das Kontextmenü zu schließen, wenn außerhalb geklickt wird
  document.addEventListener('click', closeContextMenu);
}

/**
 * Schließt das Kontextmenü
 */
function closeContextMenu() {
  contextMenuVisible.value = false;
  contextMenuItem.value = null;

  // Entferne den Event-Listener
  document.removeEventListener('click', closeContextMenu);
}

/**
 * Behandelt Klicks auf Kontextmenü-Elemente
 * @param action Die auszuführende Aktion
 * @param item Das betreffende Element
 */
function contextMenuItemClick(action: string, item: SidebarItem | null) {
  if (!item) return;

  switch (action) {
    case 'expand':
      toggleItemExpand(item.id);
      break;
  }

  closeContextMenu();
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

/**
 * Startet die Transition eines Untermenüs
 * @param el Das DOM-Element
 */
function startSubmenuTransition(el: HTMLElement) {
  el.style.height = 'auto';
  const height = el.scrollHeight;
  el.style.height = '0px';
  // Force repaint
  el.offsetHeight;
  el.style.height = `${height}px`;
}

/**
 * Beendet die Transition eines Untermenüs
 * @param el Das DOM-Element
 */
function endSubmenuTransition(el: HTMLElement) {
  el.style.height = '';
}
</script>

<style scoped>
/* Context Menu Styles */
.n-sidebar-context-menu {
  position: fixed;
  background-color: var(--n-background-color, #ffffff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border-radius: var(--n-border-radius, 4px);
  padding: 8px 0;
  min-width: 180px;
  z-index: 1000;
}

.n-sidebar-context-menu__item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background-color 0.2s ease;
}

.n-sidebar-context-menu__item:hover {
  background-color: var(--n-sidebar-hover-color, rgba(0, 0, 0, 0.05));
}

.n-sidebar-context-menu__icon {
  margin-right: 8px;
  width: 16px;
  height: 16px;
}

/* Drag and Drop Styles */
.n-sidebar__nav-item--dragging {
  opacity: 0.5;
}

.n-sidebar__nav-item--drop-target {
  position: relative;
}

.n-sidebar__nav-item--drop-target::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background-color: var(--n-primary-color, #3182ce);
}

/* Action Button Styles */
.n-sidebar__action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  width: 20px;
  height: 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--n-text-secondary-color, #a0aec0);
  transition: color 0.2s ease;
  opacity: 0;
  margin-left: 4px;
}

.n-sidebar__nav-link:hover .n-sidebar__action-button,
.n-sidebar__nav-link:focus-within .n-sidebar__action-button {
  opacity: 1;
}

.n-sidebar__action-button:hover {
  color: var(--n-primary-color, #3182ce);
}

.n-sidebar__action-button--add-favorite svg,
.n-sidebar__action-button--remove-favorite svg {
  width: 16px;
  height: 16px;
}

.n-sidebar__action-button--remove-favorite {
  color: var(--n-warning-color, #dd6b20);
}

/* Favorites section */
.n-sidebar__favorites {
  margin-bottom: 8px;
}

.n-sidebar__section-title {
  padding: 8px 16px;
  font-size: 0.75rem;
  color: var(--n-text-secondary-color, #a0aec0);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.n-sidebar__section-divider {
  height: 1px;
  background-color: var(--n-border-color, #e2e8f0);
  margin: 8px 16px;
}

.n-sidebar__nav-item--favorite .n-sidebar__nav-link {
  background-color: var(--n-sidebar-favorite-bg, rgba(49, 130, 206, 0.05));
}

.n-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: var(--n-sidebar-background-color, var(--n-background-color, #f5f7fa));
  color: var(--n-sidebar-text-color, var(--n-text-color, #2d3748));
  transition: width 0.3s ease;
  overflow: hidden;
  position: relative;
}

.n-sidebar__inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.n-sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  height: var(--n-sidebar-header-height, 64px);
  border-bottom: 1px solid var(--n-border-color, #e2e8f0);
  flex-shrink: 0;
}

.n-sidebar__title {
  font-weight: 600;
  font-size: 1.125rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: opacity 0.3s ease;
}

.n-sidebar__toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--n-border-radius, 4px);
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.3s ease;
  color: var(--n-sidebar-text-color, var(--n-text-color, #2d3748));
}

.n-sidebar__toggle-btn:hover {
  background-color: var(--n-sidebar-hover-color, rgba(0, 0, 0, 0.05));
}

.n-sidebar__toggle-btn:focus-visible {
  outline: 2px solid var(--n-focus-color, #3182ce);
  outline-offset: 1px;
}

.n-sidebar__toggle-icon {
  width: 20px;
  height: 20px;
  transition: transform 0.3s ease;
}

.n-sidebar__toggle-icon--collapsed {
  transform: rotate(180deg);
}

.n-sidebar__content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
}

.n-sidebar__nav {
  width: 100%;
}

.n-sidebar__nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  width: 100%;
}

.n-sidebar__nav-item {
  position: relative;
  width: 100%;
}

.n-sidebar__nav-link-wrapper {
  cursor: pointer;
  display: block;
  width: 100%;
  outline: none;
}

.n-sidebar__nav-link {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  color: var(--n-sidebar-link-color, var(--n-text-color, #2d3748));
  transition: background-color 0.2s ease, color 0.2s ease;
  text-decoration: none;
  position: relative;
  width: 100%;
}

.n-sidebar__nav-link:hover,
.n-sidebar__nav-link:focus-visible {
  background-color: var(--n-sidebar-hover-color, rgba(0, 0, 0, 0.05));
  color: var(--n-sidebar-hover-text-color, var(--n-text-color, #2d3748));
}

.n-sidebar__nav-link--active {
  background-color: var(--n-sidebar-active-color, rgba(0, 0, 0, 0.075));
  color: var(--n-sidebar-active-text-color, var(--n-primary-color, #3182ce));
  font-weight: 500;
}

.n-sidebar__nav-link--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: var(--n-primary-color, #3182ce);
}

.n-sidebar__nav-link--disabled {
  color: var(--n-sidebar-disabled-color, var(--n-text-secondary-color, #a0aec0));
  cursor: not-allowed;
  pointer-events: none;
}

.n-sidebar__nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.n-sidebar__nav-icon i,
.n-sidebar__nav-icon svg {
  width: 20px;
  height: 20px;
}

.n-sidebar__nav-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: opacity 0.3s ease;
}

.n-sidebar__nav-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  transition: transform 0.3s ease;
}

.n-sidebar__nav-arrow svg {
  width: 14px;
  height: 14px;
}

.n-sidebar__nav-arrow--expanded {
  transform: rotate(180deg);
}

.n-sidebar__nav-submenu {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow: hidden;
  background-color: var(--n-sidebar-submenu-bg, rgba(0, 0, 0, 0.02));
  transition: height 0.3s ease;
}

.n-sidebar__nav-subitem {
  width: 100%;
}

.n-sidebar__nav-sublink {
  display: flex;
  align-items: center;
  padding: 10px 16px 10px 48px;
  color: var(--n-sidebar-sublink-color, var(--n-text-color, #2d3748));
  transition: background-color 0.2s ease, color 0.2s ease;
  text-decoration: none;
  position: relative;
  width: 100%;
}

.n-sidebar__nav-sublink:hover,
.n-sidebar__nav-sublink:focus-visible {
  background-color: var(--n-sidebar-hover-color, rgba(0, 0, 0, 0.05));
  color: var(--n-sidebar-hover-text-color, var(--n-text-color, #2d3748));
}

.n-sidebar__nav-sublink--active {
  background-color: var(--n-sidebar-active-color, rgba(0, 0, 0, 0.075));
  color: var(--n-sidebar-active-text-color, var(--n-primary-color, #3182ce));
  font-weight: 500;
}

.n-sidebar__nav-sublink--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: var(--n-primary-color, #3182ce);
}

.n-sidebar__nav-sublink--disabled {
  color: var(--n-sidebar-disabled-color, var(--n-text-secondary-color, #a0aec0));
  cursor: not-allowed;
  pointer-events: none;
}

.n-sidebar__nav-subicon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.n-sidebar__nav-subicon i,
.n-sidebar__nav-subicon svg {
  width: 14px;
  height: 14px;
}

.n-sidebar__nav-sublabel {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.n-sidebar__footer {
  padding: 16px;
  border-top: 1px solid var(--n-border-color, #e2e8f0);
  flex-shrink: 0;
}

/* Collapsed state */
.n-sidebar--collapsed {
  width: var(--n-sidebar-collapsed-width, 64px);
}

.n-sidebar--collapsed .n-sidebar__header {
  justify-content: center;
  padding: 16px 8px;
}

.n-sidebar--collapsed .n-sidebar__title {
  display: none;
}

/* Mini mode */
.n-sidebar--mini.n-sidebar--collapsed .n-sidebar__nav-link {
  justify-content: center;
  padding: 12px 0;
}

.n-sidebar--mini.n-sidebar--collapsed .n-sidebar__nav-icon {
  margin-right: 0;
}

/* Submenu transition */
.n-sidebar-submenu-enter-active,
.n-sidebar-submenu-leave-active {
  transition: height 0.3s ease;
  overflow: hidden;
}

.n-sidebar-submenu-enter-from,
.n-sidebar-submenu-leave-to {
  height: 0 !important;
}

/* Keyboard focus styles */
.n-sidebar__nav-link:focus-visible,
.n-sidebar__nav-sublink:focus-visible {
  outline: 2px solid var(--n-focus-color, #3182ce);
  outline-offset: -2px;
}

/* Responsive styles */
@media (max-width: 768px) {
  .n-sidebar__nav-link {
    padding: 14px 16px;
  }
  
  .n-sidebar__nav-sublink {
    padding: 12px 16px 12px 48px;
  }
}
</style>