<template>
  <aside class="sidebar" :class="{ 'sidebar--collapsed': collapsed }">
    <div class="sidebar__header">
      <h2 v-if="!collapsed" class="sidebar__title">{{ title }}</h2>
      <button 
        class="sidebar__toggle"
        @click="toggleSidebar"
        :aria-label="collapsed ? 'Seitenleiste öffnen' : 'Seitenleiste schließen'"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline :points="collapsed ? '13 17 18 12 13 7' : '11 17 6 12 11 7'"></polyline>
        </svg>
      </button>
    </div>

    <nav class="sidebar__nav">
      <ul class="sidebar__list">
        <li 
          v-for="item in navigationItems"
          :key="item.id"
          class="sidebar__item"
        >
          <button
            v-if="!item.route"
            class="sidebar__link"
            :class="{ 'sidebar__link--active': item.active }"
            @click="handleItemClick(item)"
            :title="collapsed ? item.label : undefined"
          >
            <span class="sidebar__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="item.icon">
              </svg>
            </span>
            <span v-if="!collapsed" class="sidebar__label">{{ item.label }}</span>
          </button>
          <router-link
            v-else
            :to="item.route"
            class="sidebar__link"
            :class="{ 'sidebar__link--active': item.active }"
            :title="collapsed ? item.label : undefined"
          >
            <span class="sidebar__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="item.icon">
              </svg>
            </span>
            <span v-if="!collapsed" class="sidebar__label">{{ item.label }}</span>
          </router-link>
        </li>
      </ul>
    </nav>

    <div class="sidebar__footer">
      <slot name="footer"></slot>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUIStore } from '@/stores/ui'

export interface SidebarItem {
  id: string
  label: string
  icon: string
  route?: string
  active?: boolean
  onClick?: () => void
}

interface Props {
  title?: string
  items?: SidebarItem[]
  collapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Navigation',
  items: () => [],
  collapsed: false
})

const emit = defineEmits<{
  'toggle': [collapsed: boolean]
  'item-click': [item: SidebarItem]
}>()

const uiStore = useUIStore()

// Simple navigation items for clean UI
const navigationItems = computed(() => [
  {
    id: 'chat',
    label: 'Chat',
    icon: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>',
    route: '/chat',
    active: true
  },
  {
    id: 'docs',
    label: 'Dokumente',
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>',
    route: '/documents'
  },
  {
    id: 'help',
    label: 'Hilfe',
    icon: '<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>',
    route: '/help'
  }
])

const toggleSidebar = () => {
  uiStore.toggleSidebar()
  emit('toggle', !props.collapsed)
}

const handleItemClick = (item: SidebarItem) => {
  emit('item-click', item)
  if (item.onClick) {
    item.onClick()
  }
}
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width, 280px);
  height: 100%;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-slow);
}

.sidebar--collapsed {
  width: 60px;
}

.sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border);
  height: 64px;
}

.sidebar__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__toggle {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-normal);
  flex-shrink: 0;
}

.sidebar__toggle:hover {
  background: var(--button-hover);
  color: var(--text);
}

.sidebar__toggle svg {
  width: 18px;
  height: 18px;
}

.sidebar__nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.sidebar__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.sidebar__item {
  margin-bottom: 4px;
}

.sidebar__link {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-normal);
  gap: 12px;
}

.sidebar__link:hover {
  background: var(--button-hover);
  color: var(--text);
}

.sidebar__link--active {
  background: var(--primary-light);
  color: var(--primary);
}

.sidebar__icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar__icon svg {
  width: 20px;
  height: 20px;
}

.sidebar__label {
  flex: 1;
  text-align: left;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__footer {
  padding: 16px;
  border-top: 1px solid var(--border);
}

/* Collapsed state */
.sidebar--collapsed .sidebar__header {
  justify-content: center;
  padding: 16px 8px;
}

.sidebar--collapsed .sidebar__nav {
  padding: 8px 4px;
}

.sidebar--collapsed .sidebar__link {
  justify-content: center;
  padding: 12px 8px;
}

.sidebar--collapsed .sidebar__footer {
  padding: 16px 8px;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    height: 100%;
    z-index: var(--z-fixed);
    transform: translateX(-100%);
    transition: transform var(--transition-slow);
  }

  .sidebar:not(.sidebar--collapsed) {
    transform: translateX(0);
  }
}
</style>