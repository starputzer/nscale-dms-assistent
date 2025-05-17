<template>
  <div class="main-layout" :class="layoutClasses">
    <header class="main-layout__header">
      <slot name="header"></slot>
    </header>

    <div class="main-layout__body">
      <aside class="main-layout__sidebar" :class="{ 'main-layout__sidebar--collapsed': sidebarCollapsed }">
        <slot name="sidebar"></slot>
      </aside>

      <main class="main-layout__content">
        <slot></slot>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()

const sidebarCollapsed = computed(() => uiStore.sidebarCollapsed)

const layoutClasses = computed(() => ({
  'main-layout--sidebar-collapsed': sidebarCollapsed.value
}))
</script>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.main-layout__header {
  flex-shrink: 0;
  z-index: 100;
}

.main-layout__body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.main-layout__sidebar {
  width: 280px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  transition: all 0.3s ease;
}

.main-layout__sidebar--collapsed {
  width: 0;
  overflow: hidden;
}

.main-layout__content {
  flex: 1;
  overflow-y: auto;
  background: var(--background);
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .main-layout__sidebar {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    z-index: 50;
    transform: translateX(-100%);
  }

  .main-layout__sidebar:not(.main-layout__sidebar--collapsed) {
    transform: translateX(0);
  }

  .main-layout__body {
    position: relative;
  }

  .main-layout__content {
    width: 100%;
  }

  /* Overlay when sidebar is open on mobile */
  .main-layout__body::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 40;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
  }

  .main-layout:not(.main-layout--sidebar-collapsed) .main-layout__body::before {
    opacity: 1;
    pointer-events: auto;
  }
}

/* Desktop Responsiveness */
@media (min-width: 769px) {
  .main-layout__sidebar {
    position: relative;
  }
}
</style>