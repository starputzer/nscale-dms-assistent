import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsPanel from '@/components/settings/SettingsPanel.vue';
import { useSettingsStore } from '@/stores/settings';

// Mock der Toast-Funktionalität
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn()
  })
}));

// Mock der I18n-Funktionalität
const $t = (key: string) => key;

// Helper zum Erstellen des Wrappers mit Standardprops
const createWrapper = (props = {}) => {
  return mount(SettingsPanel, {
    props: {
      isVisible: true,
      ...props
    },
    global: {
      plugins: [createPinia()],
      mocks: {
        $t
      },
      stubs: {
        // Stubs für die asynchronen Komponenten
        AppearanceSettings: {
          template: '<div class="mocked-appearance-settings">AppearanceSettings</div>',
          methods: {
            emits: ['apply-settings', 'reset']
          }
        },
        NotificationSettings: {
          template: '<div class="mocked-notification-settings">NotificationSettings</div>',
          methods: {
            emits: ['apply-settings', 'reset']
          }
        },
        PrivacySettings: {
          template: '<div class="mocked-privacy-settings">PrivacySettings</div>',
          methods: {
            emits: ['apply-settings', 'reset']
          }
        },
        AccessibilitySettings: {
          template: '<div class="mocked-accessibility-settings">AccessibilitySettings</div>',
          methods: {
            emits: ['apply-settings', 'reset']
          }
        }
      }
    }
  });
};

describe('SettingsPanel.vue', () => {
  beforeEach(() => {
    // Pinia-Store für jeden Test zurücksetzen
    setActivePinia(createPinia());
    
    // Mock von window.confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  // Rendering-Tests
  describe('Rendering', () => {
    it('renders the component when visible', () => {
      const wrapper = createWrapper();
      
      expect(wrapper.find('.settings-panel').exists()).toBe(true);
      expect(wrapper.find('.settings-panel--visible').exists()).toBe(true);
      expect(wrapper.find('.settings-panel__title').text()).toBe('settings.title');
    });
    
    it('does not show visible class when isVisible is false', () => {
      const wrapper = createWrapper({ isVisible: false });
      
      expect(wrapper.find('.settings-panel').exists()).toBe(true);
      expect(wrapper.find('.settings-panel--visible').exists()).toBe(false);
    });
    
    it('renders all category buttons', () => {
      const wrapper = createWrapper();
      const categoryButtons = wrapper.findAll('.settings-panel__category-button');
      
      expect(categoryButtons.length).toBe(4); // 4 Kategorien: Appearance, Notifications, Privacy, Accessibility
      expect(categoryButtons[0].text()).toContain('settings.categories.appearance');
      expect(categoryButtons[1].text()).toContain('settings.categories.notifications');
      expect(categoryButtons[2].text()).toContain('settings.categories.privacy');
      expect(categoryButtons[3].text()).toContain('settings.categories.accessibility');
    });

    it('sets the first category as active by default', () => {
      const wrapper = createWrapper();
      const activeButton = wrapper.find('.settings-panel__category-button--active');
      
      expect(activeButton.exists()).toBe(true);
      expect(activeButton.text()).toContain('settings.categories.appearance');
    });
    
    it('renders the active category component', () => {
      const wrapper = createWrapper();
      
      // Standard ist die erste Kategorie (appearance)
      expect(wrapper.find('.mocked-appearance-settings').exists()).toBe(true);
    });
  });

  // Interaktion-Tests
  describe('Interactions', () => {
    it('switches between categories when clicking category buttons', async () => {
      const wrapper = createWrapper();
      const categoryButtons = wrapper.findAll('.settings-panel__category-button');
      
      // Auf Notifications-Kategorie klicken
      await categoryButtons[1].trigger('click');
      expect(wrapper.find('.mocked-notification-settings').exists()).toBe(true);
      expect(wrapper.find('.mocked-appearance-settings').exists()).toBe(false);
      
      // Auf Privacy-Kategorie klicken
      await categoryButtons[2].trigger('click');
      expect(wrapper.find('.mocked-privacy-settings').exists()).toBe(true);
      
      // Auf Accessibility-Kategorie klicken
      await categoryButtons[3].trigger('click');
      expect(wrapper.find('.mocked-accessibility-settings').exists()).toBe(true);
    });

    it('emits close event when close button is clicked', async () => {
      const wrapper = createWrapper();
      await wrapper.find('.settings-panel__close-button').trigger('click');
      
      expect(wrapper.emitted('close')).toBeTruthy();
      expect(wrapper.emitted('close')).toHaveLength(1);
    });
    
    it('calls window.confirm when closing with unsaved changes', async () => {
      const wrapper = createWrapper();
      const settingsStore = useSettingsStore();
      
      // Mock hasUnsavedChanges
      vi.spyOn(settingsStore, 'hasUnsavedChanges', 'get').mockReturnValue(true);
      
      await wrapper.find('.settings-panel__close-button').trigger('click');
      
      expect(window.confirm).toHaveBeenCalled();
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('does not emit close when user cancels confirm dialog', async () => {
      const wrapper = createWrapper();
      const settingsStore = useSettingsStore();
      
      // Mock hasUnsavedChanges
      vi.spyOn(settingsStore, 'hasUnsavedChanges', 'get').mockReturnValue(true);
      vi.spyOn(window, 'confirm').mockImplementation(() => false);
      
      await wrapper.find('.settings-panel__close-button').trigger('click');
      
      expect(window.confirm).toHaveBeenCalled();
      expect(wrapper.emitted('close')).toBeFalsy();
    });
  });

  // Settings-Handling-Tests
  describe('Settings Handling', () => {
    it('calls handleApplySettings when apply-settings event is emitted from child component', async () => {
      const wrapper = createWrapper();
      const settingsStore = useSettingsStore();
      
      // Mock setTheme-Methode
      const setThemeSpy = vi.spyOn(settingsStore, 'setTheme');
      
      // apply-settings-Event vom aktuellen Kind-Element auslösen
      wrapper.vm.handleApplySettings('appearance', { theme: 'test-theme' });
      
      expect(setThemeSpy).toHaveBeenCalledWith('test-theme');
    });
    
    it('calls saveSettings when handleSave is called', async () => {
      const wrapper = createWrapper();
      const settingsStore = useSettingsStore();
      
      // Mock saveSettings-Methode
      const saveSettingsSpy = vi.spyOn(settingsStore, 'saveSettings').mockResolvedValue(true);
      
      // handleSave-Methode aufrufen
      await wrapper.vm.handleSave();
      await flushPromises();
      
      expect(saveSettingsSpy).toHaveBeenCalled();
      expect(wrapper.emitted('save')).toBeTruthy();
    });
    
    it('calls resetChanges when handleReset is called', async () => {
      const wrapper = createWrapper();
      const settingsStore = useSettingsStore();
      
      // Mock resetChanges-Methode
      const resetChangesSpy = vi.spyOn(settingsStore, 'resetChanges');
      
      // handleReset-Methode aufrufen
      wrapper.vm.handleReset();
      
      expect(resetChangesSpy).toHaveBeenCalled();
    });
    
    it('opens confirm dialog when handleRestoreDefaults is called', async () => {
      const wrapper = createWrapper();
      const showModalSpy = vi.fn();
      
      // Mock dialog.showModal
      wrapper.vm.confirmDialog = { showModal: showModalSpy };
      
      // handleRestoreDefaults-Methode aufrufen
      wrapper.vm.handleRestoreDefaults();
      
      expect(showModalSpy).toHaveBeenCalled();
    });
    
    it('calls resetToDefault when confirmRestoreDefaults is called', async () => {
      const wrapper = createWrapper();
      const settingsStore = useSettingsStore();
      const closeDialogSpy = vi.fn();
      
      // Mock dialog.close und settingsStore.resetToDefault
      wrapper.vm.confirmDialog = { close: closeDialogSpy };
      const resetToDefaultSpy = vi.spyOn(settingsStore, 'resetToDefault').mockResolvedValue();
      
      // confirmRestoreDefaults-Methode aufrufen
      await wrapper.vm.confirmRestoreDefaults();
      await flushPromises();
      
      expect(closeDialogSpy).toHaveBeenCalled();
      expect(resetToDefaultSpy).toHaveBeenCalled();
    });
  });

  // Keyboard-Handling-Tests
  describe('Keyboard Handling', () => {
    it('calls handleClose when Escape key is pressed', async () => {
      const wrapper = createWrapper();
      const closeSpy = vi.spyOn(wrapper.vm, 'handleClose');
      
      // Escape-Tastendruck simulieren
      await window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      
      expect(closeSpy).toHaveBeenCalled();
    });
    
    it('does not call handleClose on Escape if panel is not visible', async () => {
      const wrapper = createWrapper({ isVisible: false });
      const closeSpy = vi.spyOn(wrapper.vm, 'handleClose');
      
      // Escape-Tastendruck simulieren
      await window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      
      expect(closeSpy).not.toHaveBeenCalled();
    });
  });

  // Mobile-Ansichts-Tests
  describe('Mobile View', () => {
    it('has responsive styles for mobile screens', () => {
      const wrapper = createWrapper();
      const style = wrapper.find('.settings-panel').attributes('style');
      
      // Prüfen, ob das Media Query für mobile Geräte vorhanden ist
      const styleElement = document.createElement('style');
      styleElement.textContent = wrapper.vm.$.type.__scopeId ? document.querySelector(`style[data-v-${wrapper.vm.$.type.__scopeId.replace('data-v-', '')}]`)?.textContent || '' : '';
      
      // Test sollte bestehen, wenn Mobile-Stile vorhanden sind
      expect(styleElement.textContent).toContain('@media');
    });
  });
});