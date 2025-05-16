<template>
  <div class="theme-selector">
    <h3 class="theme-selector__title">Theme</h3>
    <p class="theme-selector__description">
      Wählen Sie ein Farbschema für die Anwendung
    </p>
    
    <!-- Auto Mode Toggle -->
    <div class="theme-selector__auto-mode">
      <label class="auto-mode-toggle">
        <input
          type="checkbox"
          v-model="isAutoMode"
          @change="handleAutoModeToggle"
          class="auto-mode-checkbox"
        />
        <span class="auto-mode-label">
          <i class="fas fa-magic"></i>
          Automatisch (Systemeinstellung folgen)
        </span>
      </label>
    </div>
    
    <!-- Theme Options -->
    <div class="theme-selector__options" :class="{ 'theme-selector__options--disabled': isAutoMode }">
      <button
        v-for="theme in themeOptions"
        :key="theme.id"
        @click="selectTheme(theme.id)"
        :class="[
          'theme-option',
          { 'theme-option--active': currentTheme === theme.id && !isAutoMode }
        ]"
        :disabled="isAutoMode"
      >
        <div class="theme-option__preview">
          <div 
            class="preview-bar preview-bar--bg" 
            :style="{ backgroundColor: theme.preview.background }"
          />
          <div 
            class="preview-bar preview-bar--surface" 
            :style="{ backgroundColor: theme.preview.surface }"
          />
          <div 
            class="preview-bar preview-bar--text" 
            :style="{ backgroundColor: theme.preview.text }"
          />
          <div 
            class="preview-bar preview-bar--primary" 
            :style="{ backgroundColor: theme.preview.primary }"
          />
        </div>
        <div class="theme-option__info">
          <div class="theme-option__header">
            <i :class="theme.icon"></i>
            <h4 class="theme-option__name">{{ theme.name }}</h4>
          </div>
          <p class="theme-option__description">{{ theme.description }}</p>
        </div>
        <div v-if="currentTheme === theme.id && !isAutoMode" class="theme-option__indicator">
          <i class="fas fa-check-circle"></i>
        </div>
      </button>
    </div>
    
    <!-- Current System Preference -->
    <div v-if="isAutoMode && systemPreference" class="theme-selector__system-info">
      <i class="fas fa-info-circle"></i>
      <span>
        Ihre Systemeinstellung ist aktuell: 
        <strong>{{ systemPreference === 'dark' ? 'Dunkel' : 'Hell' }}</strong>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

// Computed properties
const currentTheme = computed(() => themeStore.currentTheme)
const isAutoMode = computed({
  get: () => themeStore.isAutoMode,
  set: (value) => themeStore.toggleAutoMode()
})
const systemPreference = computed(() => themeStore.systemPreference)
const themeOptions = computed(() => themeStore.themeOptions)

// Methods
const selectTheme = (theme: string) => {
  if (!isAutoMode.value) {
    themeStore.setTheme(theme as 'light' | 'dark' | 'high-contrast')
  }
}

const handleAutoModeToggle = () => {
  // The v-model already handles the toggle
  // This is just for any additional logic if needed
}
</script>

<style scoped>
.theme-selector {
  padding: 1.5rem;
}

.theme-selector__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--nscale-text-heading);
}

.theme-selector__description {
  margin: 0 0 1.5rem 0;
  color: var(--nscale-text-secondary);
}

.theme-selector__auto-mode {
  margin-bottom: 1.5rem;
}

.auto-mode-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.auto-mode-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.75rem;
  cursor: pointer;
}

.auto-mode-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--nscale-text-primary);
  font-weight: 500;
}

.theme-selector__options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: opacity var(--nscale-transition-normal);
}

.theme-selector__options--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--nscale-bg-surface);
  border: 2px solid var(--nscale-border-default);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all var(--nscale-transition-normal);
  position: relative;
}

.theme-option:hover:not(:disabled) {
  border-color: var(--nscale-border-strong);
  transform: translateY(-2px);
  box-shadow: var(--nscale-shadow-md);
}

.theme-option--active {
  border-color: var(--nscale-primary);
  background: var(--nscale-primary-ultra-light);
}

.theme-option:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.theme-option__preview {
  display: flex;
  gap: 2px;
  padding: 0.25rem;
  background: var(--nscale-bg-tertiary);
  border-radius: 0.25rem;
  width: 80px;
  flex-shrink: 0;
}

.preview-bar {
  width: 16px;
  height: 40px;
  border-radius: 2px;
  transition: background-color var(--nscale-transition-normal);
}

.theme-option__info {
  flex: 1;
}

.theme-option__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.theme-option__header i {
  color: var(--nscale-text-secondary);
}

.theme-option__name {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--nscale-text-heading);
}

.theme-option__description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--nscale-text-secondary);
}

.theme-option__indicator {
  position: absolute;
  top: 1rem;
  right: 1rem;
  color: var(--nscale-primary);
  font-size: 1.25rem;
}

.theme-selector__system-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: var(--nscale-state-info-bg);
  color: var(--nscale-state-info);
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.theme-selector__system-info i {
  font-size: 1rem;
}

/* Responsive design */
@media (max-width: 640px) {
  .theme-option {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .theme-option__preview {
    width: 100%;
    max-width: 200px;
  }
  
  .theme-option__indicator {
    top: 0.5rem;
    right: 0.5rem;
  }
}

/* High contrast mode adjustments */
[data-theme="high-contrast"] .theme-option {
  border-width: 3px;
}

[data-theme="high-contrast"] .theme-option__indicator {
  font-weight: bold;
}
</style>