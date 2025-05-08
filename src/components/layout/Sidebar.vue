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
          <!-- Default Navigation Menu -->
          <nav class="n-sidebar__nav" aria-label="Main Navigation">
            <ul class="n-sidebar__nav-list">
              <li 
                v-for="item in items" 
                :key="item.id" 
                :class="{ 
                  'n-sidebar__nav-item--active': item.active,
                  'n-sidebar__nav-item--has-children': item.children?.length,
                  'n-sidebar__nav-item--expanded': expandedItems.includes(item.id)
                }"
                class="n-sidebar__nav-item"
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
}

const props = withDefaults(defineProps<SidebarProps>(), {
  title: 'Navigation',
  collapsed: false,
  items: () => [],
  mini: true,
  defaultExpanded: () => [],
  collapseOnItemClick: false
});

const emit = defineEmits<{
  /** Wird ausgelöst, wenn sich der eingeklappte Zustand der Sidebar ändert */
  (e: 'collapse', value: boolean): void;
  /** Wird ausgelöst, wenn auf ein Element geklickt wird */
  (e: 'item-click', item: SidebarItem): void;
  /** Wird ausgelöst, wenn sich der ausgefahrene Zustand eines Elements ändert */
  (e: 'item-expand', itemId: string, expanded: boolean): void;
}>();

// Layout-Kontext von der übergeordneten Komponente (falls vorhanden)
const layoutContext = inject('layout', null);

// Reaktive Zustände
const expandedItems = ref<string[]>(props.defaultExpanded || []);

// Überwache Änderungen an der collapsed-Prop
watch(() => props.collapsed, (newValue) => {
  // Wenn die Sidebar eingeklappt wird und im Mini-Modus ist, werden alle ausgefahrenen Elemente geschlossen
  if (newValue && props.mini) {
    expandedItems.value = [];
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
  
  // Öffne die Route (für diese Beispielimplementierung)
  window.location.href = item.route;
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