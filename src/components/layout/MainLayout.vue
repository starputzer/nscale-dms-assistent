<template>
  <div 
    class="n-main-layout"
    :class="{ 
      'n-main-layout--sidebar-collapsed': isSidebarCollapsed,
      'n-main-layout--sidebar-hidden': !showSidebar,
      'n-main-layout--footer-hidden': !showFooter,
      [`n-main-layout--${theme}`]: true
    }"
  >
    <!-- Header -->
    <header v-if="showHeader" class="n-main-layout__header" :class="{ 'n-main-layout__header--sticky': stickyHeader }">
      <slot name="header">
        <NavigationBar
          :title="title"
          :show-sidebar-toggle="showSidebar"
          @sidebar-toggle="toggleSidebar"
        />
      </slot>
    </header>
    
    <div class="n-main-layout__body">
      <!-- Sidebar -->
      <aside v-if="showSidebar" class="n-main-layout__sidebar">
        <slot name="sidebar">
          <Sidebar 
            :items="sidebarItems"
            :active-item-id="activeSidebarItemId"
            :title="sidebarTitle"
            @toggle-collapse="setSidebarCollapsed"
            @select="handleSidebarItemSelect"
          />
        </slot>
      </aside>
      
      <!-- Main Content -->
      <main class="n-main-layout__content">
        <slot></slot>
      </main>
    </div>
    
    <!-- Footer -->
    <footer v-if="showFooter" class="n-main-layout__footer">
      <slot name="footer">
        <div class="n-main-layout__footer-content">
          <p>© {{ currentYear }} nscale DMS Assistent</p>
        </div>
      </slot>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, provide, watch } from 'vue';
import Header from './Header.vue';
import Sidebar from './Sidebar.vue';
import NavigationBar from '../NavigationBar.vue';

/**
 * Hauptlayout-Komponente für den nscale DMS Assistenten
 * Bietet eine vollständige Seitenlayout-Struktur mit Header, Sidebar, Content und Footer
 * @displayName MainLayout
 */
export interface MainLayoutProps {
  /** Titel der Anwendung */
  title?: string;
  /** Ob der Header angezeigt werden soll */
  showHeader?: boolean;
  /** Ob die Sidebar angezeigt werden soll */
  showSidebar?: boolean;
  /** Ob der Footer angezeigt werden soll */
  showFooter?: boolean;
  /** Navigationselemente für die Sidebar */
  sidebarItems?: SidebarItem[];
  /** Ob die Sidebar eingeklappt sein soll */
  sidebarCollapsed?: boolean;
  /** Theme der Anwendung */
  theme?: 'light' | 'dark' | 'system';
  /** Ob der Header sticky (immer sichtbar beim Scrollen) sein soll */
  stickyHeader?: boolean;
  /** Titel der Sidebar */
  sidebarTitle?: string;
  /** ID des aktiven Sidebar-Elements */
  activeSidebarItemId?: string;
}

export interface SidebarItem {
  /** Eindeutige ID des Menüpunkts */
  id: string;
  /** Anzeigename des Menüpunkts */
  label: string;
  /** Icon des Menüpunkts (optional) */
  icon?: string;
  /** Routenziel des Menüpunkts (optional) */
  route?: string;
  /** Untermenüpunkte (optional) */
  children?: SidebarItem[];
  /** Ob der Menüpunkt deaktiviert ist */
  disabled?: boolean;
  /** Ob der Menüpunkt aktuell aktiv ist */
  active?: boolean;
}

const props = withDefaults(defineProps<MainLayoutProps>(), {
  title: 'nscale DMS Assistent',
  showHeader: true,
  showSidebar: true,
  showFooter: true,
  sidebarItems: () => [],
  sidebarCollapsed: false,
  theme: 'system',
  stickyHeader: false,
  sidebarTitle: 'Navigation',
  activeSidebarItemId: ''
});

const emit = defineEmits<{
  /** Wird ausgelöst, wenn sich der eingeklappte Zustand der Sidebar ändert */
  (e: 'update:sidebarCollapsed', value: boolean): void;
  /** Wird ausgelöst, wenn die Sidebar umgeschaltet wird */
  (e: 'sidebar-toggle', value: boolean): void;
  /** Wird ausgelöst, wenn ein Sidebar-Element ausgewählt wird */
  (e: 'sidebar-item-select', id: string): void;
}>();

// Reaktive Zustände
const isSidebarCollapsed = ref(props.sidebarCollapsed);
const currentYear = computed(() => new Date().getFullYear());

// Überwache Änderungen an der sidebarCollapsed-Prop
watch(() => props.sidebarCollapsed, (newValue) => {
  isSidebarCollapsed.value = newValue;
});

// Methoden
/**
 * Schaltet den eingeklappten Zustand der Sidebar um
 */
function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  emit('update:sidebarCollapsed', isSidebarCollapsed.value);
  emit('sidebar-toggle', isSidebarCollapsed.value);
}

/**
 * Setzt den eingeklappten Zustand der Sidebar
 * @param value Der neue eingeklappte Zustand
 */
function setSidebarCollapsed(value: boolean) {
  isSidebarCollapsed.value = value;
  emit('update:sidebarCollapsed', value);
  emit('sidebar-toggle', value);
}

/**
 * Behandelt die Auswahl eines Sidebar-Elements
 * @param id Die ID des ausgewählten Elements
 */
function handleSidebarItemSelect(id: string) {
  emit('sidebar-item-select', id);
}

// Bereitstellen des Layout-Kontexts für Kindkomponenten
provide('layout', {
  isSidebarCollapsed,
  showSidebar: computed(() => props.showSidebar),
  showHeader: computed(() => props.showHeader),
  showFooter: computed(() => props.showFooter),
  theme: computed(() => props.theme),
  toggleSidebar
});
</script>

<style scoped>
.n-main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background-color: var(--n-background-color, #f5f7fa);
  color: var(--n-text-color, #2d3748);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.n-main-layout--dark {
  --n-background-color: #1a202c;
  --n-text-color: #f7fafc;
  --n-border-color: #2d3748;
  --n-text-secondary-color: #a0aec0;
}

.n-main-layout--light {
  --n-background-color: #f5f7fa;
  --n-text-color: #2d3748;
  --n-border-color: #e2e8f0;
  --n-text-secondary-color: #718096;
}

.n-main-layout--system {
  /* System-Theme: verwendet die Systemeinstellungen, wird durch Mediequeries implementiert */
}

.n-main-layout__body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.n-main-layout__header {
  flex-shrink: 0;
  height: var(--n-header-height, 64px);
  border-bottom: 1px solid var(--n-border-color, #e2e8f0);
  z-index: 10;
  background-color: var(--n-background-color, #f5f7fa);
  transition: box-shadow 0.3s ease;
}

.n-main-layout__header--sticky {
  position: sticky;
  top: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.n-main-layout__sidebar {
  flex-shrink: 0;
  width: var(--n-sidebar-width, 256px);
  transition: width 0.3s ease;
  border-right: 1px solid var(--n-border-color, #e2e8f0);
  overflow: hidden;
  z-index: 5;
  background-color: var(--n-sidebar-background-color, var(--n-background-color, #f5f7fa));
}

.n-main-layout--sidebar-collapsed .n-main-layout__sidebar {
  width: var(--n-sidebar-collapsed-width, 64px);
}

.n-main-layout--sidebar-hidden .n-main-layout__sidebar {
  display: none;
}

.n-main-layout__content {
  flex: 1;
  overflow: auto;
  padding: var(--n-content-padding, 24px);
  background-color: var(--n-content-background-color, var(--n-background-color, #f5f7fa));
}

.n-main-layout__footer {
  flex-shrink: 0;
  height: var(--n-footer-height, 48px);
  border-top: 1px solid var(--n-border-color, #e2e8f0);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--n-footer-background-color, var(--n-background-color, #f5f7fa));
}

.n-main-layout--footer-hidden .n-main-layout__footer {
  display: none;
}

.n-main-layout__footer-content {
  padding: 0 16px;
  width: 100%;
  text-align: center;
  font-size: 0.875rem;
  color: var(--n-text-secondary-color, #718096);
}

/* Responsive Anpassungen */
@media (max-width: 768px) {
  .n-main-layout__sidebar {
    position: absolute;
    top: var(--n-header-height, 64px);
    bottom: 0;
    left: 0;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 20;
    background-color: var(--n-background-color, #f5f7fa);
    width: var(--n-sidebar-mobile-width, 80%);
    max-width: 300px;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  }
  
  .n-main-layout--sidebar-collapsed .n-main-layout__sidebar {
    width: var(--n-sidebar-collapsed-width, 64px);
  }
  
  .n-main-layout:not(.n-main-layout--sidebar-hidden) .n-main-layout__sidebar {
    transform: translateX(0);
  }
  
  .n-main-layout__content {
    padding: var(--n-content-padding-mobile, 16px);
  }
  
  .n-main-layout__header {
    height: var(--n-header-height-mobile, 56px);
  }
  
  .n-main-layout__footer {
    height: var(--n-footer-height-mobile, 40px);
  }
}

/* Dark Mode Media Query für System-Theme */
@media (prefers-color-scheme: dark) {
  .n-main-layout--system {
    --n-background-color: #1a202c;
    --n-text-color: #f7fafc;
    --n-border-color: #2d3748;
    --n-text-secondary-color: #a0aec0;
  }
}
</style>