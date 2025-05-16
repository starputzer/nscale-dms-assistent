<!--
Digitale Akte Assistent - Hauptkomponente
-->
<template>
  <div class="app-container" :data-theme="effectiveTheme">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

// Computed
const effectiveTheme = computed(() => themeStore.effectiveTheme)
</script>

<style scoped>
.app-container {
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background: var(--nscale-background);
  color: var(--nscale-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>