import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { createI18n } from 'vue-i18n';
import AdminMotd from '@/components/admin/tabs/AdminMotd.vue';

describe('AdminMotd Component - Basic', () => {
  it('should render without crashing', async () => {
    // Create a basic i18n instance for testing
    const i18n = createI18n({
      legacy: false,
      locale: 'de',
      messages: {
        de: {
          'admin.motd.title': 'Message of the Day Editor',
          'admin.motd.save': 'Speichern',
          'admin.motd.reset': 'Zurücksetzen',
          'admin.motd.preview': 'Vorschau',
          'admin.motd.edit': 'Bearbeiten',
          'admin.motd.content': 'Inhalt',
          'admin.motd.generalSettings': 'Allgemeine Einstellungen',
          'admin.motd.displaySettings': 'Anzeige-Einstellungen',
          'admin.motd.styleSettings': 'Stil-Einstellungen',
          'admin.motd.scheduling': 'Zeitplanung',
          'admin.motd.versionHistory': 'Versionshistorie'
        }
      }
    });

    // Mock store data
    const mockStore = {
      adminMotd: {
        config: {
          enabled: true,
          format: 'markdown',
          content: 'Test content',
          style: {
            backgroundColor: '#fff3cd',
            borderColor: '#ffeeba',
            textColor: '#856404',
            iconClass: 'info-circle'
          },
          display: {
            position: 'top',
            dismissible: true,
            showOnStartup: false,
            showInChat: true
          }
        },
        loading: false,
        error: null,
        previewMode: false,
        hasUnsavedChanges: false,
        previewHtml: 'Test content',
        fetchConfig: vi.fn(),
        saveConfig: vi.fn(),
        updateConfig: vi.fn(),
        updateStyle: vi.fn(),
        updateDisplay: vi.fn(),
        resetConfig: vi.fn(),
        setDefaultConfig: vi.fn(),
        togglePreviewMode: vi.fn()
      }
    };

    // Mount the component with minimal configuration
    const wrapper = mount(AdminMotd, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: mockStore
          }),
          i18n
        ],
        stubs: {
          // Stub all child components
          'BaseButton': true,
          'BaseInput': true,
          'BaseSelect': true,
          'BaseCheckbox': true,
          'Alert': true
        },
        mocks: {
          $t: (key: string) => key
        }
      }
    });

    // Basic assertions to verify the component is mounted
    expect(wrapper.exists()).toBe(true);
    
    // Check that the title is rendered
    expect(wrapper.find('.admin-motd__title').exists()).toBe(true);
    
    // Check that the editor sections are rendered when not in preview mode
    expect(wrapper.find('.admin-motd__editor').exists()).toBe(true);
    expect(wrapper.find('.admin-motd__settings-panel').exists()).toBe(true);
    expect(wrapper.find('.admin-motd__content-editor').exists()).toBe(true);
  });
});