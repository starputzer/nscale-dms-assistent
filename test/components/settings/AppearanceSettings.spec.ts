import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AppearanceSettings from '@/components/settings/AppearanceSettings.vue';
import { useSettingsStore } from '@/stores/settings';

// Mock der I18n-Funktionalität
const $t = (key: string) => key;

// Helper zum Erstellen des Wrappers
const createWrapper = () => {
  return mount(AppearanceSettings, {
    global: {
      plugins: [createPinia()],
      mocks: {
        $t
      }
    }
  });
};

describe('AppearanceSettings.vue', () => {
  beforeEach(() => {
    // Pinia-Store für jeden Test zurücksetzen
    setActivePinia(createPinia());
  });

  // Rendering-Tests
  describe('Rendering', () => {
    it('renders the component correctly', () => {
      const wrapper = createWrapper();
      
      expect(wrapper.find('.appearance-settings').exists()).toBe(true);
      expect(wrapper.find('.appearance-settings__title').text()).toBe('settings.appearance.title');
    });
    
    it('renders theme options from the store', () => {
      const wrapper = createWrapper();
      const settingsStore = useSettingsStore();
      
      // Anzahl der Themes prüfen
      const themeOptions = wrapper.findAll('.appearance-settings__theme-option');
      expect(themeOptions.length).toBe(settingsStore.allThemes.length);
    });
    
    it('renders font settings options', () => {
      const wrapper = createWrapper();
      
      // Font-Size-Optionen prüfen
      expect(wrapper.find('.appearance-settings__font-settings').exists()).toBe(true);
      
      // Font-Size-Optionen
      const fontSizeOptions = wrapper.findAll('.appearance-settings__font-size-option');
      expect(fontSizeOptions.length).toBe(4); // small, medium, large, extra-large
      
      // Font-Family-Optionen
      const fontFamilyOptions = wrapper.findAll('.appearance-settings__font-family-option');
      expect(fontFamilyOptions.length).toBe(4); // system, serif, sans-serif, monospace
    });
    
    it('marks the current theme as selected', () => {
      const wrapper = createWrapper();
      const settingsStore = useSettingsStore();
      
      // Aktuelles Theme ermitteln
      const currentTheme = settingsStore.currentTheme;
      
      // Prüfen, ob das aktuelle Theme als ausgewählt markiert ist
      const activeThemeOption = wrapper.find('.appearance-settings__theme-option--active');
      expect(activeThemeOption.exists()).toBe(true);
      
      // Text des aktiven Themes sollte den Namen des aktuellen Themes enthalten
      expect(activeThemeOption.text()).toContain(currentTheme.name);
    });
  });

  // Interaktion-Tests
  describe('Interactions', () => {
    it('emits apply-settings event when selecting a theme', async () => {
      const wrapper = createWrapper();
      const settingsStore = useSettingsStore();
      
      // Alle Theme-Optionen finden
      const themeOptions = wrapper.findAll('.appearance-settings__theme-option');
      
      // Auf eine andere Theme-Option klicken (nicht die aktive)
      const targetIndex = settingsStore.currentTheme.id === settingsStore.allThemes[0].id ? 1 : 0;
      await themeOptions[targetIndex].trigger('click');
      
      // Events prüfen
      expect(wrapper.emitted('apply-settings')).toBeTruthy();
      expect(wrapper.emitted('apply-settings')?.[0][0]).toBe('appearance');
      expect(wrapper.emitted('apply-settings')?.[0][1]).toHaveProperty('theme', settingsStore.allThemes[targetIndex].id);
    });
    
    it('updates font size and emits apply-settings event', async () => {
      const wrapper = createWrapper();
      
      // Font-Size-Optionen finden
      const fontSizeOptions = wrapper.findAll('.appearance-settings__font-size-option');
      
      // Auf eine Schriftgröße klicken (z.B. 'large')
      await fontSizeOptions[2].trigger('click'); // Index 2 sollte 'large' sein
      
      // Events prüfen
      expect(wrapper.emitted('apply-settings')).toBeTruthy();
      expect(wrapper.emitted('apply-settings')?.[0][0]).toBe('appearance');
      expect(wrapper.emitted('apply-settings')?.[0][1]).toHaveProperty('font');
      expect(wrapper.emitted('apply-settings')?.[0][1].font).toHaveProperty('size', 'large');
    });
    
    it('updates font family and emits apply-settings event', async () => {
      const wrapper = createWrapper();
      
      // Font-Family-Optionen finden
      const fontFamilyOptions = wrapper.findAll('.appearance-settings__font-family-option');
      
      // Auf eine Schriftart klicken (z.B. 'serif')
      await fontFamilyOptions[1].trigger('click'); // Index 1 sollte 'serif' sein
      
      // Events prüfen
      expect(wrapper.emitted('apply-settings')).toBeTruthy();
      expect(wrapper.emitted('apply-settings')?.[0][0]).toBe('appearance');
      expect(wrapper.emitted('apply-settings')?.[0][1]).toHaveProperty('font');
      expect(wrapper.emitted('apply-settings')?.[0][1].font).toHaveProperty('family', 'serif');
    });
    
    it('updates line height and emits apply-settings event', async () => {
      const wrapper = createWrapper();
      
      // Line-Height-Optionen finden
      const lineHeightOptions = wrapper.findAll('.appearance-settings__line-height-option');
      
      // Auf eine Zeilenhöhe klicken (z.B. 'relaxed')
      await lineHeightOptions[2].trigger('click'); // Index 2 sollte 'relaxed' sein
      
      // Events prüfen
      expect(wrapper.emitted('apply-settings')).toBeTruthy();
      expect(wrapper.emitted('apply-settings')?.[0][0]).toBe('appearance');
      expect(wrapper.emitted('apply-settings')?.[0][1]).toHaveProperty('font');
      expect(wrapper.emitted('apply-settings')?.[0][1].font).toHaveProperty('lineHeight', 'relaxed');
    });
  });

  // Custom-Theme-Tests
  describe('Custom Themes', () => {
    it('opens custom theme editor when the corresponding button is clicked', async () => {
      const wrapper = createWrapper();
      
      // "Benutzerdefiniertes Theme erstellen"-Button finden und klicken
      const customThemeButton = wrapper.find('.appearance-settings__custom-theme-button');
      expect(customThemeButton.exists()).toBe(true);
      
      await customThemeButton.trigger('click');
      
      // Prüfen, ob der Custom-Theme-Editor angezeigt wird
      expect(wrapper.find('.appearance-settings__custom-theme-editor').exists()).toBe(true);
    });
    
    it('can save a custom theme', async () => {
      const wrapper = createWrapper();
      const settingsStore = useSettingsStore();
      
      // Custom-Theme-Editor öffnen
      await wrapper.find('.appearance-settings__custom-theme-button').trigger('click');
      
      // Spy auf addCustomTheme im Store setzen
      const addCustomThemeSpy = vi.spyOn(settingsStore, 'addCustomTheme');
      
      // Theme-Name eingeben
      const nameInput = wrapper.find('.appearance-settings__custom-theme-name');
      await nameInput.setValue('Mein Test-Theme');
      
      // Theme speichern
      const saveButton = wrapper.find('.appearance-settings__custom-theme-save');
      await saveButton.trigger('click');
      
      // Prüfen, ob addCustomTheme aufgerufen wurde
      expect(addCustomThemeSpy).toHaveBeenCalled();
      expect(addCustomThemeSpy.mock.calls[0][0]).toHaveProperty('name', 'Mein Test-Theme');
    });
    
    it('shows error message when trying to save with an empty name', async () => {
      const wrapper = createWrapper();
      
      // Custom-Theme-Editor öffnen
      await wrapper.find('.appearance-settings__custom-theme-button').trigger('click');
      
      // Theme-Name leer lassen
      
      // Theme speichern
      const saveButton = wrapper.find('.appearance-settings__custom-theme-save');
      await saveButton.trigger('click');
      
      // Prüfen, ob Fehlermeldung angezeigt wird
      expect(wrapper.find('.appearance-settings__custom-theme-error').exists()).toBe(true);
    });
  });

  // Responsive-Design-Tests
  describe('Responsive Design', () => {
    it('has responsive styles for mobile screens', () => {
      const wrapper = createWrapper();
      
      // Prüfen, ob das Media Query für mobile Geräte vorhanden ist
      const styleElement = document.createElement('style');
      styleElement.textContent = wrapper.vm.$.type.__scopeId ? document.querySelector(`style[data-v-${wrapper.vm.$.type.__scopeId.replace('data-v-', '')}]`)?.textContent || '' : '';
      
      // Test sollte bestehen, wenn Mobile-Stile vorhanden sind
      expect(styleElement.textContent).toContain('@media');
    });
  });
});