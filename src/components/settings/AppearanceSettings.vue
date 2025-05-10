<template>
  <div class="appearance-settings">
    <h3 class="appearance-settings__title">{{ t('settings.appearance.title', 'Erscheinungsbild') }}</h3>
    
    <!-- Thema-Auswahl -->
    <div class="appearance-settings__section">
      <h4 class="appearance-settings__section-title">{{ t('settings.appearance.theme', 'Farbschema') }}</h4>
      
      <div class="appearance-settings__themes">
        <div 
          v-for="theme in settingsStore.allThemes" 
          :key="theme.id"
          class="appearance-settings__theme-card"
          :class="{ 'appearance-settings__theme-card--active': selectedTheme === theme.id }"
          @click="selectTheme(theme.id)"
        >
          <div 
            class="appearance-settings__theme-preview" 
            :style="getThemePreviewStyle(theme)"
          ></div>
          <div class="appearance-settings__theme-name">{{ theme.name }}</div>
        </div>
      </div>
    </div>

    <!-- Schriftgröße -->
    <div class="appearance-settings__section">
      <h4 class="appearance-settings__section-title">{{ t('settings.appearance.fontSize', 'Schriftgröße') }}</h4>
      
      <div class="appearance-settings__font-sizes">
        <button 
          v-for="size in fontSizes" 
          :key="size.value"
          class="appearance-settings__font-size-button" 
          :class="{ 'appearance-settings__font-size-button--active': fontSettings.size === size.value }"
          @click="setFontSize(size.value)"
          :style="{ fontSize: size.preview }"
        >
          {{ size.label }}
        </button>
      </div>
    </div>

    <!-- Schriftart -->
    <div class="appearance-settings__section">
      <h4 class="appearance-settings__section-title">{{ t('settings.appearance.fontFamily', 'Schriftart') }}</h4>
      
      <div class="appearance-settings__select-container">
        <select 
          v-model="fontSettings.family"
          class="appearance-settings__select"
          @change="applyFontSettings"
        >
          <option 
            v-for="family in fontFamilies" 
            :key="family.value" 
            :value="family.value"
            :style="{ fontFamily: family.preview }"
          >
            {{ family.label }}
          </option>
        </select>
      </div>
      
      <div class="appearance-settings__font-preview" :style="{ fontFamily: currentFontFamily }">
        {{ t('settings.appearance.fontPreview', 'Dies ist ein Beispieltext in der ausgewählten Schriftart.') }}
      </div>
    </div>

    <!-- Zeilenhöhe -->
    <div class="appearance-settings__section">
      <h4 class="appearance-settings__section-title">{{ t('settings.appearance.lineHeight', 'Zeilenhöhe') }}</h4>
      
      <div class="appearance-settings__line-heights">
        <button 
          v-for="height in lineHeights" 
          :key="height.value"
          class="appearance-settings__line-height-button" 
          :class="{ 'appearance-settings__line-height-button--active': fontSettings.lineHeight === height.value }"
          @click="setLineHeight(height.value)"
        >
          <div class="appearance-settings__line-height-preview" :style="{ lineHeight: height.preview }">
            <div class="appearance-settings__line"></div>
            <div class="appearance-settings__line"></div>
            <div class="appearance-settings__line"></div>
          </div>
          <span>{{ height.label }}</span>
        </button>
      </div>
    </div>

    <!-- Benutzerdefiniertes Thema -->
    <div class="appearance-settings__section">
      <div class="appearance-settings__section-header">
        <h4 class="appearance-settings__section-title">{{ t('settings.appearance.customTheme', 'Benutzerdefiniertes Thema') }}</h4>
        <button 
          class="appearance-settings__toggle-button"
          @click="showCustomThemeEditor = !showCustomThemeEditor"
        >
          <i 
            :class="['fas', showCustomThemeEditor ? 'fa-chevron-up' : 'fa-chevron-down']" 
            aria-hidden="true"
          ></i>
          {{ showCustomThemeEditor ? t('settings.appearance.hideEditor', 'Editor ausblenden') : t('settings.appearance.showEditor', 'Editor anzeigen') }}
        </button>
      </div>
      
      <div v-if="showCustomThemeEditor" class="appearance-settings__custom-theme">
        <div class="appearance-settings__form-group">
          <label for="theme-name" class="appearance-settings__label">{{ t('settings.appearance.themeName', 'Name') }}</label>
          <input 
            id="theme-name"
            v-model="customTheme.name"
            type="text" 
            class="appearance-settings__input"
            :placeholder="t('settings.appearance.themeNamePlaceholder', 'Mein benutzerdefiniertes Thema')"
          />
        </div>
        
        <div class="appearance-settings__form-group">
          <label class="appearance-settings__label">{{ t('settings.appearance.darkMode', 'Dunkelmodus') }}</label>
          <div class="appearance-settings__toggle">
            <label class="appearance-settings__toggle-switch">
              <input 
                type="checkbox"
                v-model="customTheme.isDark"
              />
              <span class="appearance-settings__toggle-slider"></span>
            </label>
            <span>{{ customTheme.isDark ? t('settings.appearance.enabled', 'Aktiviert') : t('settings.appearance.disabled', 'Deaktiviert') }}</span>
          </div>
        </div>

        <div class="appearance-settings__colors-grid">
          <div 
            v-for="(color, key) in customTheme.colors" 
            :key="key"
            class="appearance-settings__color-picker"
          >
            <label :for="`color-${key}`" class="appearance-settings__label">
              {{ t(`settings.appearance.colors.${key}`, key) }}
            </label>
            <div class="appearance-settings__color-input-container">
              <input 
                :id="`color-${key}`"
                v-model="customTheme.colors[key]"
                type="color" 
                class="appearance-settings__color-input"
              />
              <input 
                v-model="customTheme.colors[key]"
                type="text" 
                class="appearance-settings__color-text"
                maxlength="7"
              />
            </div>
          </div>
        </div>

        <div class="appearance-settings__custom-theme-preview" :style="getCustomThemePreviewStyle()">
          <div class="appearance-settings__preview-header" :style="{ backgroundColor: customTheme.colors.primary, color: customTheme.colors.text }">
            {{ t('settings.appearance.previewHeader', 'Vorschau des benutzerdefinierten Themas') }}
          </div>
          <div class="appearance-settings__preview-content" :style="{ backgroundColor: customTheme.colors.background, color: customTheme.colors.text }">
            <p>{{ t('settings.appearance.previewText', 'Dies ist ein Beispieltext mit der primären Textfarbe.') }}</p>
            <p :style="{ color: customTheme.colors.secondary }">{{ t('settings.appearance.previewSecondaryText', 'Dies ist ein Text mit der sekundären Textfarbe.') }}</p>
            <div class="appearance-settings__preview-buttons">
              <button :style="{ backgroundColor: customTheme.colors.primary, color: customTheme.isDark ? '#ffffff' : '#ffffff' }">
                {{ t('settings.appearance.previewPrimaryButton', 'Primär') }}
              </button>
              <button :style="{ backgroundColor: customTheme.colors.secondary, color: customTheme.isDark ? '#ffffff' : '#ffffff' }">
                {{ t('settings.appearance.previewSecondaryButton', 'Sekundär') }}
              </button>
              <button :style="{ backgroundColor: customTheme.colors.accent, color: customTheme.isDark ? '#ffffff' : '#ffffff' }">
                {{ t('settings.appearance.previewAccentButton', 'Akzent') }}
              </button>
            </div>
            <div class="appearance-settings__preview-alerts">
              <div class="appearance-settings__preview-alert" :style="{ backgroundColor: customTheme.colors.success, color: '#ffffff' }">
                {{ t('settings.appearance.previewSuccess', 'Erfolg') }}
              </div>
              <div class="appearance-settings__preview-alert" :style="{ backgroundColor: customTheme.colors.warning, color: '#ffffff' }">
                {{ t('settings.appearance.previewWarning', 'Warnung') }}
              </div>
              <div class="appearance-settings__preview-alert" :style="{ backgroundColor: customTheme.colors.error, color: '#ffffff' }">
                {{ t('settings.appearance.previewError', 'Fehler') }}
              </div>
            </div>
          </div>
        </div>

        <div class="appearance-settings__custom-theme-actions">
          <button 
            class="appearance-settings__button appearance-settings__button--secondary"
            @click="resetCustomTheme"
          >
            {{ t('settings.appearance.resetTheme', 'Zurücksetzen') }}
          </button>
          <button 
            class="appearance-settings__button appearance-settings__button--primary"
            @click="saveCustomTheme"
          >
            {{ t('settings.appearance.saveTheme', 'Speichern und anwenden') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/stores/settings';
import { useToast } from '@/composables/useToast';
import type { FontSettings, ColorTheme } from '@/types/settings';

// Emit Events
const emit = defineEmits<{
  (e: 'apply-settings', category: string, settings: any): void;
}>();

// Store und Services
const settingsStore = useSettingsStore();
const { t } = useI18n();
const { showToast } = useToast();

// Referenzen
const selectedTheme = ref(settingsStore.theme.currentTheme);
const fontSettings = reactive<FontSettings>({ ...settingsStore.font });
const showCustomThemeEditor = ref(false);

// Default-Werte für das benutzerdefinierte Thema
const defaultCustomTheme: ColorTheme = {
  id: 'custom-theme',
  name: 'Benutzerdefiniertes Thema',
  isDark: false,
  colors: {
    primary: '#3b82f6',
    secondary: '#64748b',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981'
  }
};

// Benutzerdefiniertes Thema
const customTheme = reactive<ColorTheme>({ ...defaultCustomTheme });

// Font-Größen Optionen
const fontSizes = [
  { value: 'small', label: t('settings.appearance.fontSizes.small', 'Klein'), preview: '0.875rem' },
  { value: 'medium', label: t('settings.appearance.fontSizes.medium', 'Mittel'), preview: '1rem' },
  { value: 'large', label: t('settings.appearance.fontSizes.large', 'Groß'), preview: '1.125rem' },
  { value: 'extra-large', label: t('settings.appearance.fontSizes.extraLarge', 'Sehr groß'), preview: '1.25rem' }
];

// Font-Familien Optionen
const fontFamilies = [
  { 
    value: 'system', 
    label: t('settings.appearance.fontFamilies.system', 'System'), 
    preview: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif' 
  },
  { 
    value: 'serif', 
    label: t('settings.appearance.fontFamilies.serif', 'Serif'), 
    preview: 'Georgia, serif' 
  },
  { 
    value: 'sans-serif', 
    label: t('settings.appearance.fontFamilies.sansSerif', 'Sans-Serif'), 
    preview: 'Helvetica, Arial, sans-serif' 
  },
  { 
    value: 'monospace', 
    label: t('settings.appearance.fontFamilies.monospace', 'Monospace'), 
    preview: 'Consolas, monospace' 
  }
];

// Zeilenhöhen Optionen
const lineHeights = [
  { value: 'compact', label: t('settings.appearance.lineHeights.compact', 'Kompakt'), preview: '1.2' },
  { value: 'normal', label: t('settings.appearance.lineHeights.normal', 'Normal'), preview: '1.5' },
  { value: 'relaxed', label: t('settings.appearance.lineHeights.relaxed', 'Weit'), preview: '1.8' }
];

// Computed Properties
const currentFontFamily = computed(() => {
  const family = fontFamilies.find(f => f.value === fontSettings.family);
  return family ? family.preview : fontFamilies[0].preview;
});

// Methoden
function selectTheme(themeId: string) {
  selectedTheme.value = themeId;
  
  // Theme-Änderung an Parent-Komponente weitergeben
  emit('apply-settings', 'appearance', { theme: themeId });
}

function setFontSize(size: string) {
  fontSettings.size = size as FontSettings['size'];
  applyFontSettings();
}

function setLineHeight(height: string) {
  fontSettings.lineHeight = height as FontSettings['lineHeight'];
  applyFontSettings();
}

function applyFontSettings() {
  // Font-Einstellungen an Parent-Komponente weitergeben
  emit('apply-settings', 'appearance', { font: fontSettings });
}

function getThemePreviewStyle(theme: ColorTheme) {
  return {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border || theme.colors.primary,
    '--primary-color': theme.colors.primary,
    '--secondary-color': theme.colors.secondary,
    '--text-color': theme.colors.text
  };
}

function getCustomThemePreviewStyle() {
  return {
    borderColor: customTheme.colors.primary
  };
}

function resetCustomTheme() {
  Object.assign(customTheme, defaultCustomTheme);
}

function saveCustomTheme() {
  try {
    // Theme-ID generieren, falls nicht vorhanden
    if (!customTheme.id || customTheme.id === 'custom-theme') {
      customTheme.id = `custom-${Date.now()}`;
    }
    
    // Kopie des Themas erstellen
    const newTheme: ColorTheme = JSON.parse(JSON.stringify(customTheme));
    
    // Zum Store hinzufügen
    settingsStore.addCustomTheme(newTheme);
    
    // Als aktuelles Thema setzen
    selectTheme(newTheme.id);
    
    showToast({
      type: 'success',
      title: t('settings.appearance.customThemeSuccess', 'Thema gespeichert'),
      message: t('settings.appearance.customThemeSuccessMessage', 'Ihr benutzerdefiniertes Thema wurde gespeichert und angewendet.')
    });
  } catch (error) {
    console.error('Error saving custom theme:', error);
    showToast({
      type: 'error',
      title: t('settings.appearance.customThemeError', 'Fehler'),
      message: t('settings.appearance.customThemeErrorMessage', 'Das benutzerdefinierte Thema konnte nicht gespeichert werden.')
    });
  }
}

// Lifecycle Hooks
onMounted(() => {
  // Aktuelles Thema auf den Store-Wert setzen
  selectedTheme.value = settingsStore.theme.currentTheme;
  
  // Font-Einstellungen mit den Store-Werten initialisieren
  Object.assign(fontSettings, settingsStore.font);
});
</script>

<style scoped>
.appearance-settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.appearance-settings__title {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.appearance-settings__section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--n-color-border);
}

.appearance-settings__section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.appearance-settings__section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.appearance-settings__section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.appearance-settings__toggle-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: var(--n-color-primary);
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: var(--n-border-radius);
}

.appearance-settings__toggle-button:hover {
  background-color: var(--n-color-hover);
}

/* Themen-Auswahl */
.appearance-settings__themes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
}

.appearance-settings__theme-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2px solid transparent;
  border-radius: var(--n-border-radius);
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.appearance-settings__theme-card:hover {
  background-color: var(--n-color-hover);
}

.appearance-settings__theme-card--active {
  border-color: var(--n-color-primary);
}

.appearance-settings__theme-preview {
  width: 100%;
  height: 80px;
  border-radius: var(--n-border-radius);
  border: 1px solid var(--n-color-border);
  margin-bottom: 0.5rem;
  overflow: hidden;
  position: relative;
}

.appearance-settings__theme-preview::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 30%;
  background-color: var(--primary-color, #3b82f6);
}

.appearance-settings__theme-preview::after {
  content: "";
  position: absolute;
  bottom: 10px;
  left: 10px;
  right: 10px;
  height: 20px;
  background-color: var(--secondary-color, #64748b);
  border-radius: 4px;
}

.appearance-settings__theme-name {
  font-size: 0.875rem;
  text-align: center;
  color: var(--n-color-text-primary);
}

/* Schriftgrößen */
.appearance-settings__font-sizes {
  display: flex;
  gap: 0.5rem;
}

.appearance-settings__font-size-button {
  flex: 1;
  padding: 0.75rem 1rem;
  background-color: var(--n-color-background-alt);
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.appearance-settings__font-size-button:hover {
  background-color: var(--n-color-hover);
}

.appearance-settings__font-size-button--active {
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
  border-color: var(--n-color-primary);
}

/* Schriftart */
.appearance-settings__select-container {
  position: relative;
}

.appearance-settings__select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  appearance: none;
}

.appearance-settings__select-container::after {
  content: "\f078"; /* FontAwesome chevron-down */
  font-family: "Font Awesome 5 Free";
  font-weight: 900;
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.appearance-settings__font-preview {
  padding: 1rem;
  margin-top: 0.5rem;
  background-color: var(--n-color-background-alt);
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  line-height: 1.5;
}

/* Zeilenhöhe */
.appearance-settings__line-heights {
  display: flex;
  gap: 0.5rem;
}

.appearance-settings__line-height-button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: var(--n-color-background-alt);
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  cursor: pointer;
  transition: all 0.2s;
}

.appearance-settings__line-height-button:hover {
  background-color: var(--n-color-hover);
}

.appearance-settings__line-height-button--active {
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
  border-color: var(--n-color-primary);
}

.appearance-settings__line-height-preview {
  width: 100%;
  padding: 0 0.5rem;
}

.appearance-settings__line {
  height: 4px;
  background-color: currentColor;
  border-radius: 2px;
  margin: 0.5em 0;
  opacity: 0.7;
}

/* Benutzerdefiniertes Thema */
.appearance-settings__custom-theme {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.appearance-settings__form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.appearance-settings__label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.appearance-settings__input {
  padding: 0.75rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
}

.appearance-settings__toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.appearance-settings__toggle-switch {
  position: relative;
  display: inline-block;
  width: 3rem;
  height: 1.5rem;
}

.appearance-settings__toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.appearance-settings__toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--n-color-border);
  transition: .4s;
  border-radius: 1.5rem;
}

.appearance-settings__toggle-slider:before {
  position: absolute;
  content: "";
  height: 1.125rem;
  width: 1.125rem;
  left: 0.1875rem;
  bottom: 0.1875rem;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .appearance-settings__toggle-slider {
  background-color: var(--n-color-primary);
}

input:focus + .appearance-settings__toggle-slider {
  box-shadow: 0 0 1px var(--n-color-primary);
}

input:checked + .appearance-settings__toggle-slider:before {
  transform: translateX(1.5rem);
}

.appearance-settings__colors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.appearance-settings__color-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.appearance-settings__color-input-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.appearance-settings__color-input {
  width: 3rem;
  height: 2rem;
  padding: 0;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  cursor: pointer;
}

.appearance-settings__color-text {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  font-family: monospace;
}

.appearance-settings__custom-theme-preview {
  margin-top: 1.5rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  overflow: hidden;
}

.appearance-settings__preview-header {
  padding: 1rem;
  font-weight: 600;
}

.appearance-settings__preview-content {
  padding: 1rem;
}

.appearance-settings__preview-buttons {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
}

.appearance-settings__preview-buttons button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--n-border-radius);
  cursor: pointer;
}

.appearance-settings__preview-alerts {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.appearance-settings__preview-alert {
  padding: 0.5rem 1rem;
  border-radius: var(--n-border-radius);
  text-align: center;
  flex: 1;
}

.appearance-settings__custom-theme-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.appearance-settings__button {
  padding: 0.625rem 1rem;
  border-radius: var(--n-border-radius);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.appearance-settings__button--primary {
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
  border: 1px solid var(--n-color-primary);
}

.appearance-settings__button--primary:hover {
  background-color: var(--n-color-primary-dark);
}

.appearance-settings__button--secondary {
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  border: 1px solid var(--n-color-border);
}

.appearance-settings__button--secondary:hover {
  background-color: var(--n-color-hover);
}

/* Responsive Anpassungen */
@media (max-width: 480px) {
  .appearance-settings__themes,
  .appearance-settings__colors-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .appearance-settings__font-sizes,
  .appearance-settings__line-heights {
    flex-direction: column;
  }
  
  .appearance-settings__custom-theme-actions {
    flex-direction: column;
  }
  
  .appearance-settings__preview-buttons,
  .appearance-settings__preview-alerts {
    flex-direction: column;
  }
}
</style>