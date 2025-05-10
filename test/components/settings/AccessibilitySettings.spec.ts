import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AccessibilitySettings from '@/components/settings/AccessibilitySettings.vue';
import { useSettingsStore } from '@/stores/settings';

// Mock für i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}));

// Mock für localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; })
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock für document.documentElement.classList
const classListMock = {
  add: vi.fn(),
  remove: vi.fn(),
  contains: vi.fn()
};

// Original classList speichern
const originalClassList = document.documentElement.classList;

// Hilfsfunktion zum Erstellen eines Wrappers mit Standard-Konfiguration
function createWrapper() {
  return mount(AccessibilitySettings, {
    global: {
      plugins: [createPinia()],
      stubs: {
        // Stubs für verschiedene Komponenten, falls nötig
      }
    }
  });
}

describe('AccessibilitySettings.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorageMock.clear();
    
    // Überschreibe classList mit dem Mock
    Object.defineProperty(document.documentElement, 'classList', {
      value: classListMock,
      configurable: true
    });
  });
  
  afterEach(() => {
    // Stelle die originale classList wieder her
    Object.defineProperty(document.documentElement, 'classList', {
      value: originalClassList,
      configurable: true
    });
  });

  describe('Rendering', () => {
    it('rendert die Komponente korrekt', () => {
      const wrapper = createWrapper();
      expect(wrapper.find('.accessibility-settings').exists()).toBe(true);
      expect(wrapper.find('.accessibility-settings__title').text()).toBe('settings.accessibility.title');
    });

    it('zeigt alle Abschnitte an', () => {
      const wrapper = createWrapper();
      const sections = wrapper.findAll('.accessibility-settings__section');
      
      // Wir erwarten mindestens die grundlegenden Abschnitte
      expect(sections.length).toBeGreaterThanOrEqual(4);
      
      // Prüfe, ob wichtige Einstellungen vorhanden sind
      expect(wrapper.find('#a11y-reduce-motion').exists()).toBe(true);
      expect(wrapper.find('#a11y-high-contrast').exists()).toBe(true);
      expect(wrapper.find('#a11y-large-text').exists()).toBe(true);
      expect(wrapper.find('#a11y-screen-reader').exists()).toBe(true);
    });
  });

  describe('Interaktionen', () => {
    it('emittet Ereignisse bei Änderungen der Einstellungen', async () => {
      const wrapper = createWrapper();
      
      // Ändere eine Einstellung
      await wrapper.find('#a11y-reduce-motion').setValue(true);
      await wrapper.find('#a11y-reduce-motion').trigger('change');
      
      // Prüfe, ob 'apply-settings' emittiert wurde
      expect(wrapper.emitted('apply-settings')).toBeTruthy();
    });
  });

  describe('Store Integration', () => {
    it('hat Zugriff auf den Store', () => {
      const store = useSettingsStore();
      expect(store).toBeDefined();

      const wrapper = createWrapper();
      expect(wrapper.vm.a11ySettings).toBeDefined();
    });
  });
});