import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { toHaveNoViolations } from 'jest-axe';
import { runAxeTest, wcag21aaRules } from './setup-axe';

// Import UI-Komponenten
import Button from '@/components/ui/base/Button.vue';
import Input from '@/components/ui/base/Input.vue';
import Select from '@/components/ui/base/Select.vue';
import Modal from '@/components/ui/base/Modal.vue';
import Checkbox from '@/components/ui/base/Checkbox.vue';
import Radio from '@/components/ui/base/Radio.vue';
import Alert from '@/components/ui/base/Alert.vue';
import TextArea from '@/components/ui/base/TextArea.vue';
import ProgressBar from '@/components/ui/base/ProgressBar.vue';

// Jest-Axe Matcher erweitern
expect.extend(toHaveNoViolations);

describe('Basis UI-Komponenten Barrierefreiheitstests', () => {
  let wrapper: any;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  // Button-Komponente
  describe('Button', () => {
    it('sollte barrierefrei sein (primär)', async () => {
      wrapper = mount(Button, {
        props: {
          variant: 'primary',
          label: 'Primärer Button'
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
    });

    it('sollte barrierefrei sein (disabled)', async () => {
      wrapper = mount(Button, {
        props: {
          variant: 'primary',
          label: 'Deaktivierter Button',
          disabled: true
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
      
      // Spezifische Prüfung für aria-disabled
      const button = wrapper.find('button').element;
      expect(button.hasAttribute('disabled')).toBe(true);
      expect(button.getAttribute('aria-disabled')).toBe('true');
    });

    it('sollte barrierefrei sein (mit Icon)', async () => {
      wrapper = mount(Button, {
        props: {
          variant: 'primary',
          label: 'Button mit Icon',
          iconLeft: 'save'
        },
        slots: {
          default: 'Speichern'
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
    });

    it('sollte als Icon-Button mit aria-label barrierefrei sein', async () => {
      wrapper = mount(Button, {
        props: {
          variant: 'icon',
          ariaLabel: 'Dokument löschen',
          icon: 'delete'
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
      
      // Prüfe aria-label bei Icon-Button
      const button = wrapper.find('button').element;
      expect(button.getAttribute('aria-label')).toBe('Dokument löschen');
    });
  });

  // Input-Komponente
  describe('Input', () => {
    it('sollte barrierefrei sein (standard)', async () => {
      wrapper = mount(Input, {
        props: {
          label: 'Name',
          id: 'test-name',
          placeholder: 'Bitte Namen eingeben'
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
      
      // Prüfe label verknüpfung
      const input = wrapper.find('input').element;
      const label = wrapper.find('label').element;
      expect(label.getAttribute('for')).toBe(input.id);
    });

    it('sollte barrierefrei sein (erforderlich)', async () => {
      wrapper = mount(Input, {
        props: {
          label: 'E-Mail',
          id: 'test-email',
          type: 'email',
          required: true,
          placeholder: 'name@beispiel.de'
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
      
      // Prüfe required Attribute
      const input = wrapper.find('input').element;
      expect(input.hasAttribute('required')).toBe(true);
      expect(input.getAttribute('aria-required')).toBe('true');
    });

    it('sollte barrierefrei sein (mit Fehlermeldung)', async () => {
      wrapper = mount(Input, {
        props: {
          label: 'Passwort',
          id: 'test-password',
          type: 'password',
          error: 'Das Passwort muss mindestens 8 Zeichen enthalten.'
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
      
      // Prüfe Fehlerverknüpfung
      const input = wrapper.find('input').element;
      const errorId = input.getAttribute('aria-describedby');
      const errorEl = document.getElementById(errorId);
      expect(errorEl).not.toBeNull();
      expect(errorEl.textContent).toContain('Das Passwort muss mindestens 8 Zeichen enthalten.');
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });
  });

  // Select-Komponente
  describe('Select', () => {
    it('sollte barrierefrei sein (standard)', async () => {
      wrapper = mount(Select, {
        props: {
          label: 'Land auswählen',
          id: 'test-country',
          options: [
            { value: 'de', label: 'Deutschland' },
            { value: 'at', label: 'Österreich' },
            { value: 'ch', label: 'Schweiz' }
          ]
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
    });

    it('sollte barrierefrei sein (gruppiert)', async () => {
      wrapper = mount(Select, {
        props: {
          label: 'Region auswählen',
          id: 'test-region',
          groups: [
            { 
              label: 'Europa', 
              options: [
                { value: 'de', label: 'Deutschland' },
                { value: 'fr', label: 'Frankreich' }
              ]
            },
            { 
              label: 'Nordamerika', 
              options: [
                { value: 'us', label: 'USA' },
                { value: 'ca', label: 'Kanada' }
              ]
            }
          ]
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
      
      // Prüfe auf optgroup
      const optgroups = wrapper.findAll('optgroup');
      expect(optgroups.length).toBe(2);
      expect(optgroups[0].attributes('label')).toBe('Europa');
    });
  });

  // Modal-Komponente
  describe('Modal', () => {
    it('sollte barrierefrei sein', async () => {
      wrapper = mount(Modal, {
        props: {
          modelValue: true,
          title: 'Testdialog',
          ariaLabelledby: 'dialog-title'
        },
        slots: {
          default: '<p>Dialog-Inhalt</p>',
          footer: '<button>Schließen</button>'
        },
        global: {
          stubs: {
            teleport: true
          }
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
      
      // Dialog-Attribute prüfen
      const dialog = wrapper.find('[role="dialog"]').element;
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-labelledby')).toBe('dialog-title');
    });
  });

  // Alert-Komponente
  describe('Alert', () => {
    it('sollte barrierefrei sein (info)', async () => {
      wrapper = mount(Alert, {
        props: {
          variant: 'info',
          title: 'Information'
        },
        slots: {
          default: 'Dies ist eine Informationsmeldung.'
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
      
      // role=alert prüfen
      const alert = wrapper.element;
      expect(alert.getAttribute('role')).toBe('alert');
      expect(alert.getAttribute('aria-live')).toBe('polite');
    });

    it('sollte barrierefrei sein (error)', async () => {
      wrapper = mount(Alert, {
        props: {
          variant: 'error',
          title: 'Fehler'
        },
        slots: {
          default: 'Es ist ein Fehler aufgetreten.'
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
      
      // role=alert und aria-live für Fehler prüfen
      const alert = wrapper.element;
      expect(alert.getAttribute('role')).toBe('alert');
      expect(alert.getAttribute('aria-live')).toBe('assertive');
    });
  });

  // Checkbox-Komponente
  describe('Checkbox', () => {
    it('sollte barrierefrei sein', async () => {
      wrapper = mount(Checkbox, {
        props: {
          label: 'AGB akzeptieren',
          id: 'test-checkbox',
          modelValue: false
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
      
      // Label-Verknüpfung prüfen
      const input = wrapper.find('input[type="checkbox"]').element;
      const label = wrapper.find('label').element;
      expect(label.getAttribute('for')).toBe(input.id);
    });
  });

  // Radio-Komponente
  describe('Radio', () => {
    it('sollte barrierefrei sein (Radiogruppe)', async () => {
      wrapper = mount({
        template: `
          <fieldset>
            <legend>Zahlungsmethode</legend>
            <Radio 
              v-for="option in options" 
              :key="option.value"
              :id="'payment-' + option.value"
              :value="option.value"
              :label="option.label"
              v-model="selectedPayment"
              name="payment"
            />
          </fieldset>
        `,
        components: { Radio },
        data() {
          return {
            selectedPayment: 'credit',
            options: [
              { value: 'credit', label: 'Kreditkarte' },
              { value: 'paypal', label: 'PayPal' },
              { value: 'bank', label: 'Banküberweisung' }
            ]
          };
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
      
      // Radiogruppe mit fieldset und legend prüfen
      expect(wrapper.find('fieldset').exists()).toBe(true);
      expect(wrapper.find('legend').exists()).toBe(true);
      
      // Gleicher Name für alle Radio-Buttons
      const radios = wrapper.findAll('input[type="radio"]');
      expect(radios.length).toBe(3);
      radios.forEach(radio => {
        expect(radio.attributes('name')).toBe('payment');
      });
    });
  });

  // TextArea-Komponente
  describe('TextArea', () => {
    it('sollte barrierefrei sein', async () => {
      wrapper = mount(TextArea, {
        props: {
          label: 'Beschreibung',
          id: 'test-textarea',
          rows: 4,
          placeholder: 'Beschreibung eingeben...'
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
    });
  });

  // ProgressBar-Komponente
  describe('ProgressBar', () => {
    it('sollte barrierefrei sein', async () => {
      wrapper = mount(ProgressBar, {
        props: {
          value: 75,
          max: 100,
          label: 'Fortschritt'
        }
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
      
      // ARIA-Attribute für Progressbar prüfen
      const progressbar = wrapper.find('[role="progressbar"]').element;
      expect(progressbar.getAttribute('aria-valuenow')).toBe('75');
      expect(progressbar.getAttribute('aria-valuemin')).toBe('0');
      expect(progressbar.getAttribute('aria-valuemax')).toBe('100');
      expect(progressbar.getAttribute('aria-label')).toBe('Fortschritt');
    });
  });
});