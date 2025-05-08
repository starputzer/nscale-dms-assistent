&lt;template>
  &lt;div class="nscale-theme-switcher">
    &lt;div class="nscale-theme-switcher-header">
      &lt;h3 class="nscale-theme-switcher-title">{{ $t('themeSettings') }}&lt;/h3>
    &lt;/div>
    
    &lt;div class="nscale-theme-switcher-body">
      &lt;div class="nscale-form-group">
        &lt;label class="nscale-checkbox-label">
          &lt;input
            type="checkbox"
            v-model="useSystemTheme"
            @change="updateSystemThemePreference"
          />
          {{ $t('useSystemTheme') }}
        &lt;/label>
      &lt;/div>
      
      &lt;div class="nscale-theme-options" v-if="!useSystemTheme">
        &lt;button
          class="nscale-theme-option"
          :class="{ active: currentTheme === 'light' }"
          @click="selectTheme('light')"
        >
          &lt;div class="nscale-theme-preview light-theme-preview">
            &lt;div class="preview-header">&lt;/div>
            &lt;div class="preview-sidebar">&lt;/div>
            &lt;div class="preview-content">&lt;/div>
          &lt;/div>
          &lt;span>{{ $t('lightTheme') }}&lt;/span>
        &lt;/button>
        
        &lt;button
          class="nscale-theme-option"
          :class="{ active: currentTheme === 'dark' }"
          @click="selectTheme('dark')"
        >
          &lt;div class="nscale-theme-preview dark-theme-preview">
            &lt;div class="preview-header">&lt;/div>
            &lt;div class="preview-sidebar">&lt;/div>
            &lt;div class="preview-content">&lt;/div>
          &lt;/div>
          &lt;span>{{ $t('darkTheme') }}&lt;/span>
        &lt;/button>
        
        &lt;button
          class="nscale-theme-option"
          :class="{ active: currentTheme === 'contrast' }"
          @click="selectTheme('contrast')"
        >
          &lt;div class="nscale-theme-preview contrast-theme-preview">
            &lt;div class="preview-header">&lt;/div>
            &lt;div class="preview-sidebar">&lt;/div>
            &lt;div class="preview-content">&lt;/div>
          &lt;/div>
          &lt;span>{{ $t('contrastTheme') }}&lt;/span>
        &lt;/button>
      &lt;/div>
    &lt;/div>
    
    &lt;div class="nscale-theme-switcher-footer">
      &lt;p class="nscale-text-sm nscale-text-gray-600">
        {{ useSystemTheme ? $t('systemThemeDescription') : $t('manualThemeDescription') }}
      &lt;/p>
    &lt;/div>
  &lt;/div>
&lt;/template>

&lt;script>
import { ref, onMounted, onUnmounted } from 'vue';
import { themeManager, THEMES } from '@/assets/theme-switcher';

export default {
  name: 'ThemeSwitcher',
  
  setup() {
    const currentTheme = ref('light');
    const useSystemTheme = ref(true);
    
    // Theme-Änderung überwachen
    const handleThemeChange = (event) => {
      currentTheme.value = event.detail.theme;
      useSystemTheme.value = event.detail.useSystemTheme;
    };
    
    // Initial-Werte setzen
    onMounted(() => {
      currentTheme.value = themeManager.getCurrentTheme();
      useSystemTheme.value = themeManager.isUsingSystemTheme();
      
      // Event-Listener registrieren
      document.addEventListener('nscale-theme-change', handleThemeChange);
    });
    
    // Event-Listener entfernen
    onUnmounted(() => {
      document.removeEventListener('nscale-theme-change', handleThemeChange);
    });
    
    // Theme manuell auswählen
    const selectTheme = (theme) => {
      if (Object.values(THEMES).includes(theme)) {
        themeManager.setTheme(theme);
        currentTheme.value = theme;
      }
    };
    
    // Verwendung des Systemthemes aktualisieren
    const updateSystemThemePreference = () => {
      themeManager.setUseSystemTheme(useSystemTheme.value);
    };
    
    return {
      currentTheme,
      useSystemTheme,
      selectTheme,
      updateSystemThemePreference,
    };
  }
};
&lt;/script>

&lt;style scoped>
.nscale-theme-switcher {
  background-color: var(--nscale-card-bg);
  border-radius: var(--nscale-border-radius-md);
  box-shadow: var(--nscale-shadow-md);
  overflow: hidden;
  border: 1px solid var(--nscale-card-border);
}

.nscale-theme-switcher-header {
  padding: var(--nscale-space-4);
  border-bottom: 1px solid var(--nscale-card-border);
}

.nscale-theme-switcher-title {
  margin: 0;
  font-size: var(--nscale-font-size-lg);
  font-weight: var(--nscale-font-weight-semibold);
  color: var(--nscale-body-color);
}

.nscale-theme-switcher-body {
  padding: var(--nscale-space-4);
}

.nscale-theme-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--nscale-space-4);
  margin-top: var(--nscale-space-4);
}

.nscale-theme-option {
  background: none;
  border: 1px solid var(--nscale-card-border);
  border-radius: var(--nscale-border-radius-md);
  padding: var(--nscale-space-3);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all var(--nscale-transition-quick) ease;
}

.nscale-theme-option:hover {
  transform: translateY(-2px);
  box-shadow: var(--nscale-shadow-md);
}

.nscale-theme-option.active {
  border-color: var(--nscale-primary);
  box-shadow: 0 0 0 2px rgba(0, 165, 80, 0.2);
}

.nscale-theme-preview {
  width: 100%;
  height: 100px;
  border-radius: var(--nscale-border-radius-sm);
  margin-bottom: var(--nscale-space-2);
  overflow: hidden;
  border: 1px solid var(--nscale-card-border);
  display: grid;
  grid-template-rows: 20px 1fr;
  grid-template-columns: 30px 1fr;
  grid-template-areas:
    "header header"
    "sidebar content";
}

.preview-header {
  grid-area: header;
}

.preview-sidebar {
  grid-area: sidebar;
}

.preview-content {
  grid-area: content;
}

/* Light Theme Preview */
.light-theme-preview .preview-header {
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}

.light-theme-preview .preview-sidebar {
  background-color: #f8f9fa;
  border-right: 1px solid #e2e8f0;
}

.light-theme-preview .preview-content {
  background-color: #ffffff;
}

/* Dark Theme Preview */
.dark-theme-preview .preview-header {
  background-color: #1e1e1e;
  border-bottom: 1px solid #333333;
}

.dark-theme-preview .preview-sidebar {
  background-color: #2a2a2a;
  border-right: 1px solid #333333;
}

.dark-theme-preview .preview-content {
  background-color: #121212;
}

/* Contrast Theme Preview */
.contrast-theme-preview .preview-header {
  background-color: #000000;
  border-bottom: 1px solid #ffeb3b;
}

.contrast-theme-preview .preview-sidebar {
  background-color: #000000;
  border-right: 1px solid #ffeb3b;
}

.contrast-theme-preview .preview-content {
  background-color: #000000;
}

.nscale-theme-switcher-footer {
  padding: var(--nscale-space-4);
  border-top: 1px solid var(--nscale-card-border);
  font-size: var(--nscale-font-size-sm);
  color: var(--nscale-gray-600);
}
&lt;/style>