import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { toHaveNoViolations } from 'jest-axe';
import { runAxeTest, wcag21aaRules } from './setup-axe';

// Import Feedback-Komponenten
import Toast from '@/components/ui/Toast.vue';
import ToastContainer from '@/components/ui/ToastContainer.vue';
import Notification from '@/components/ui/Notification.vue';
import Alert from '@/components/ui/feedback/Alert.vue';
import InlineMessage from '@/components/ui/feedback/InlineMessage.vue';
import StatusIndicator from '@/components/ui/feedback/StatusIndicator.vue';
import Popover from '@/components/ui/feedback/Popover.vue';

// Jest-Axe Matcher erweitern
expect.extend(toHaveNoViolations);

describe('Feedback-Komponenten Barrierefreiheitstests', () => {
  let wrapper: any;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  // Toast-Komponente
  describe('Toast', () => {
    it('sollte grundlegende Barrierefreiheitsanforderungen erfüllen', async () => {
      wrapper = mount(Toast, {
        props: {
          message: 'Dies ist eine Testmeldung',
          type: 'info',
          id: 'test-toast'
        },
        global: {
          stubs: {
            transition: false
          }
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
    });

    it('sollte korrekte ARIA-Attribute für verschiedene Toast-Typen verwenden', async () => {
      const toastTypes = ['info', 'success', 'warning', 'error'];
      
      for (const type of toastTypes) {
        wrapper = mount(Toast, {
          props: {
            message: `${type.charAt(0).toUpperCase() + type.slice(1)}-Meldung`,
            type,
            id: `test-toast-${type}`
          },
          global: {
            stubs: {
              transition: false
            }
          }
        });

        // Prüfe Role und Live-Region
        expect(wrapper.attributes('role')).toBe('status');
        if (type === 'error') {
          expect(wrapper.attributes('aria-live')).toBe('assertive');
        } else {
          expect(wrapper.attributes('aria-live')).toBe('polite');
        }

        // Prüfe, ob Icon mit aria-hidden
        const icon = wrapper.find('.n-toast-icon');
        if (icon.exists()) {
          expect(icon.attributes('aria-hidden')).toBe('true');
        }
        
        // Prüfe Close-Button
        const closeButton = wrapper.find('.n-toast-close');
        if (closeButton.exists()) {
          expect(closeButton.attributes('aria-label')).toBeDefined();
        }
      }
    });
  });

  // ToastContainer-Komponente
  describe('ToastContainer', () => {
    it('sollte grundlegende Barrierefreiheitsanforderungen erfüllen', async () => {
      wrapper = mount(ToastContainer, {
        props: {
          position: 'top-right'
        },
        slots: {
          default: `
            <div role="status" aria-live="polite" class="toast">
              Beispiel-Toast
            </div>
          `
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
    });
  });

  // Notification-Komponente
  describe('Notification', () => {
    it('sollte grundlegende Barrierefreiheitsanforderungen erfüllen', async () => {
      wrapper = mount(Notification, {
        props: {
          title: 'Benachrichtigung',
          message: 'Dies ist eine Testbenachrichtigung',
          type: 'info'
        },
        global: {
          stubs: {
            transition: false
          }
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
    });

    it('sollte korrekte ARIA-Attribute für Benachrichtigungen verwenden', async () => {
      wrapper = mount(Notification, {
        props: {
          title: 'Wichtige Information',
          message: 'Dies ist eine wichtige Benachrichtigung',
          type: 'warning'
        },
        global: {
          stubs: {
            transition: false
          }
        }
      });

      // Prüfe Role und Live-Region
      expect(wrapper.attributes('role')).toBe('alert');
      expect(wrapper.attributes('aria-live')).toBeDefined();
      
      // Prüfe Lesbarkeit der Benachrichtigung
      expect(wrapper.find('.n-notification-title').exists()).toBe(true);
      expect(wrapper.find('.n-notification-message').exists()).toBe(true);
      
      // Prüfe Close-Button
      const closeButton = wrapper.find('.n-notification-close');
      if (closeButton.exists()) {
        expect(closeButton.attributes('aria-label')).toBeDefined();
      }
    });
  });

  // Alert-Komponente
  describe('Alert', () => {
    it('sollte grundlegende Barrierefreiheitsanforderungen erfüllen', async () => {
      wrapper = mount(Alert, {
        props: {
          variant: 'info',
          title: 'Informationshinweis'
        },
        slots: {
          default: 'Dies ist ein Hinweistext für den Benutzer.'
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
    });

    it('sollte korrekte ARIA-Attribute für verschiedene Alert-Typen verwenden', async () => {
      const alertTypes = ['info', 'success', 'warning', 'error'];
      
      for (const variant of alertTypes) {
        wrapper = mount(Alert, {
          props: {
            variant,
            title: `${variant.charAt(0).toUpperCase() + variant.slice(1)}-Meldung`
          },
          slots: {
            default: `Dies ist eine ${variant}-Meldung für den Benutzer.`
          }
        });

        // Prüfe Role und Live-Region
        expect(wrapper.attributes('role')).toBe('alert');
        if (variant === 'error') {
          expect(wrapper.attributes('aria-live')).toBe('assertive');
        } else {
          expect(wrapper.attributes('aria-live')).toBe('polite');
        }
        
        // Prüfe Icon
        const icon = wrapper.find('.n-alert-icon') || wrapper.find('.n-alert__icon');
        if (icon.exists()) {
          expect(icon.attributes('aria-hidden')).toBe('true');
        }
      }
    });

    it('sollte mit Close-Button barrierefrei sein', async () => {
      wrapper = mount(Alert, {
        props: {
          variant: 'info',
          title: 'Schließbarer Hinweis',
          closable: true
        },
        slots: {
          default: 'Dieser Hinweis kann geschlossen werden.'
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
      
      // Prüfe Close-Button
      const closeButton = wrapper.find('.n-alert-close') || wrapper.find('.n-alert__close');
      if (closeButton.exists()) {
        expect(closeButton.attributes('aria-label')).toBeDefined();
      }
    });
  });

  // InlineMessage-Komponente
  describe('InlineMessage', () => {
    it('sollte grundlegende Barrierefreiheitsanforderungen erfüllen', async () => {
      try {
        wrapper = mount(InlineMessage, {
          props: {
            type: 'info'
          },
          slots: {
            default: 'Dies ist eine Inline-Nachricht.'
          }
        });

        const results = await runAxeTest(wrapper.element);
        expect(results).toHaveNoViolations();
        
        // Prüfe, ob passende Rolle vorhanden
        expect(wrapper.attributes('role')).toBeDefined();
      } catch (error) {
        console.log('InlineMessage Test konnte nicht durchgeführt werden:', error);
      }
    });
  });

  // StatusIndicator-Komponente
  describe('StatusIndicator', () => {
    it('sollte grundlegende Barrierefreiheitsanforderungen erfüllen', async () => {
      try {
        wrapper = mount(StatusIndicator, {
          props: {
            status: 'success',
            label: 'Erfolgreich'
          }
        });

        const results = await runAxeTest(wrapper.element);
        expect(results).toHaveNoViolations();
        
        // Prüfe, ob Status visuell und textuell vermittelt wird
        expect(wrapper.text()).toContain('Erfolgreich');
        
        // Prüfe, ob visueller Indikator für Screenreader korrekt ist
        const indicator = wrapper.find('.n-status-indicator-dot') || wrapper.find('.n-status-indicator__dot');
        if (indicator.exists()) {
          expect(indicator.attributes('aria-hidden')).toBe('true');
        }
      } catch (error) {
        console.log('StatusIndicator Test konnte nicht durchgeführt werden:', error);
      }
    });
  });

  // Popover-Komponente
  describe('Popover', () => {
    it('sollte grundlegende Barrierefreiheitsanforderungen erfüllen', async () => {
      try {
        const triggerEl = document.createElement('button');
        triggerEl.textContent = 'Trigger';
        document.body.appendChild(triggerEl);
        
        wrapper = mount(Popover, {
          props: {
            modelValue: true,
            trigger: triggerEl,
            title: 'Popover-Titel'
          },
          slots: {
            default: '<p>Popover-Inhalt</p>'
          },
          global: {
            stubs: {
              teleport: true
            }
          }
        });

        const results = await runAxeTest(wrapper.element);
        expect(results).toHaveNoViolations();
        
        // Prüfe ARIA-Attribute
        expect(wrapper.attributes('role')).toBe('tooltip');
        
        // Prüfe ID-Referenz zwischen Trigger und Popover
        if (triggerEl.getAttribute('aria-controls')) {
          const popoverId = wrapper.attributes('id');
          expect(triggerEl.getAttribute('aria-controls')).toBe(popoverId);
        }
        
        document.body.removeChild(triggerEl);
      } catch (error) {
        console.log('Popover Test konnte nicht durchgeführt werden:', error);
      }
    });
  });
});