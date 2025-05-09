<template>
  <div class="theme-switcher">
    <label class="theme-option">
      <input
        type="radio"
        name="theme"
        :value="THEMES.LIGHT"
        :checked="currentTheme === THEMES.LIGHT && !useSystemTheme"
        @change="setTheme(THEMES.LIGHT)"
      />
      <span class="theme-preview light">
        <span class="theme-name">Hell</span>
      </span>
    </label>
    
    <label class="theme-option">
      <input
        type="radio"
        name="theme"
        :value="THEMES.DARK"
        :checked="currentTheme === THEMES.DARK && !useSystemTheme"
        @change="setTheme(THEMES.DARK)"
      />
      <span class="theme-preview dark">
        <span class="theme-name">Dunkel</span>
      </span>
    </label>
    
    <label class="theme-option">
      <input
        type="radio"
        name="theme"
        :value="THEMES.CONTRAST"
        :checked="currentTheme === THEMES.CONTRAST"
        @change="setTheme(THEMES.CONTRAST)"
      />
      <span class="theme-preview contrast">
        <span class="theme-name">Kontrast</span>
      </span>
    </label>
    
    <label class="system-theme-option">
      <input
        type="checkbox"
        :checked="useSystemTheme"
        @change="setUseSystemTheme(!useSystemTheme)"
      />
      <span>Systemeinstellung verwenden</span>
    </label>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '@/composables/useTheme';

const { 
  currentTheme, 
  useSystemTheme,
  setTheme, 
  setUseSystemTheme,
  THEMES 
} = useTheme();
</script>

<style scoped>
.theme-switcher {
  display: flex;
  flex-direction: column;
  gap: var(--nscale-space-4);
  padding: var(--nscale-space-4);
  border-radius: var(--nscale-border-radius-md);
  background-color: var(--nscale-background);
  box-shadow: var(--nscale-shadow-sm);
  border: 1px solid var(--nscale-border);
  max-width: 300px;
}

.theme-option {
  cursor: pointer;
  display: flex;
  align-items: center;
}

.theme-option input[type="radio"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  margin: 0;
}

.theme-preview {
  flex-grow: 1;
  height: 60px;
  border-radius: var(--nscale-border-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 2px solid transparent;
  transition: border-color var(--nscale-transition-quick) ease;
}

/* Light Theme Preview */
.theme-preview.light {
  background-color: #ffffff;
  color: #1e293b;
  box-shadow: var(--nscale-shadow-sm);
}

.theme-preview.light::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 10px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #00a550;
}

/* Dark Theme Preview */
.theme-preview.dark {
  background-color: #0f172a;
  color: #f8f9fa;
}

.theme-preview.dark::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 10px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #56c596;
}

/* Contrast Theme Preview */
.theme-preview.contrast {
  background-color: #000000;
  color: #ffffff;
}

.theme-preview.contrast::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 10px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #ffeb3b;
}

.theme-name {
  font-size: var(--nscale-font-size-sm);
  font-weight: var(--nscale-font-weight-medium);
}

/* Selected Theme Style */
input[type="radio"]:checked + .theme-preview {
  border-color: var(--nscale-primary);
}

input[type="radio"]:focus-visible + .theme-preview {
  outline: 2px solid var(--nscale-focus-ring);
  outline-offset: 2px;
}

.system-theme-option {
  display: flex;
  align-items: center;
  gap: var(--nscale-space-2);
  margin-top: var(--nscale-space-2);
  cursor: pointer;
  font-size: var(--nscale-font-size-sm);
  color: var(--nscale-foreground);
}

.system-theme-option input[type="checkbox"] {
  accent-color: var(--nscale-primary);
}
</style>