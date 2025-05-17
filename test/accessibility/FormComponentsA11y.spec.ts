import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { runAxeTest, toHaveNoViolations, wcag21aaRules } from "./setup-axe";

// Import komplexere Formular-Komponenten
import Form from "@/components/ui/Form.vue";
import FormField from "@/components/ui/FormField.vue";
import ErrorBoundary from "@/components/shared/ErrorBoundary.vue";
import ToggleSwitch from "@/components/ui/base/Toggle.vue";
import Stepper from "@/components/ui/base/Stepper.vue";
import Tooltip from "@/components/ui/base/Tooltip.vue";
import AutoComplete from "@/components/ui/AutoComplete.vue";
import FocusTrap from "@/components/ui/base/FocusTrap.vue";

// Define custom matcher for Vitest
expect.extend({
  toHaveNoViolations(received) {
    const result = toHaveNoViolations(received);
    return {
      message: () => result.message(),
      pass: result.pass,
    };
  },
});

describe("Formular-Komponenten Barrierefreiheitstests", () => {
  let wrapper: any;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  // Form-Komponente
  describe("Form", () => {
    it("sollte barrierefrei sein (einfaches Formular)", async () => {
      wrapper = mount(Form, {
        props: {
          title: "Kontaktformular",
          submitText: "Senden",
        },
        slots: {
          default: `
            <FormField label="Name" name="name" />
            <FormField label="E-Mail" name="email" type="email" required />
            <FormField label="Nachricht" name="message" type="textarea" />
          `,
        },
        global: {
          stubs: {
            FormField: true,
          },
        },
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();
    });

    it("sollte barrierefrei sein (mit Fehlermeldungen)", async () => {
      wrapper = mount(Form, {
        props: {
          title: "Anmeldeformular",
          submitText: "Anmelden",
          errors: {
            password: "Passwort ist zu kurz (mind. 8 Zeichen)",
          },
        },
        slots: {
          default: `
            <FormField label="Benutzername" name="username" />
            <FormField label="Passwort" name="password" type="password" />
          `,
        },
        global: {
          stubs: {
            FormField: true,
          },
        },
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();

      // Prüfe, ob Formular-Fehler korrekt angezeigt werden
      const formError = wrapper.find('[role="alert"]');
      expect(formError.exists()).toBe(true);
    });
  });

  // FormField-Komponente
  describe("FormField", () => {
    it("sollte barrierefrei sein (standard Inputfeld)", async () => {
      wrapper = mount(FormField, {
        props: {
          label: "Suchbegriff",
          name: "search",
          type: "text",
          hint: "Mindestens 3 Zeichen eingeben",
        },
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();

      // Prüfe Verknüpfung zwischen Label und Input
      const input = wrapper.find("input").element;
      const label = wrapper.find("label").element;
      const hint = wrapper.find('[id$="-hint"]').element;

      expect(label.getAttribute("for")).toBe(input.id);
      expect(input.getAttribute("aria-describedby")).toBe(hint.id);
    });

    it("sollte barrierefrei sein (Pflichtfeld mit Fehler)", async () => {
      wrapper = mount(FormField, {
        props: {
          label: "Telefonnummer",
          name: "phone",
          type: "tel",
          required: true,
          error: "Bitte geben Sie eine gültige Telefonnummer ein",
        },
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();

      // Prüfe auf required-Attribut
      const input = wrapper.find("input").element;
      expect(input.hasAttribute("required")).toBe(true);
      expect(input.getAttribute("aria-required")).toBe("true");

      // Prüfe auf Error-Verknüpfung
      const error = wrapper.find('[role="alert"]').element;
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(input.getAttribute("aria-describedby")).toBe(error.id);
    });
  });

  // ErrorBoundary-Komponente
  describe("ErrorBoundary", () => {
    it("sollte barrierefrei sein", async () => {
      const errorMessage = "Es ist ein Fehler aufgetreten";

      wrapper = mount(ErrorBoundary, {
        props: {
          error: new Error(errorMessage),
          componentName: "TestKomponente",
        },
        slots: {
          default: "<div>Normal content</div>",
          fallback: `
            <div role="alert" class="error-container">
              <h3>Fehler in TestKomponente</h3>
              <p>{{ error.message }}</p>
              <button @click="retry">Erneut versuchen</button>
            </div>
          `,
        },
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();

      // Prüfe Error-Boundary Ausgabe
      const alertRegion = wrapper.find('[role="alert"]');
      expect(alertRegion.exists()).toBe(true);
      expect(alertRegion.text()).toContain(errorMessage);
    });
  });

  // ToggleSwitch-Komponente
  describe("ToggleSwitch", () => {
    it("sollte barrierefrei sein", async () => {
      wrapper = mount(ToggleSwitch, {
        props: {
          label: "Dunkel-Modus",
          modelValue: false,
          id: "dark-mode-toggle",
        },
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();

      // Prüfe auf korrektes role
      const toggle = wrapper.find("button").element;
      expect(toggle.getAttribute("role")).toBe("switch");
      expect(toggle.getAttribute("aria-checked")).toBe("false");
      expect(toggle.getAttribute("aria-labelledby")).toBeDefined();
    });
  });

  // Stepper-Komponente
  describe("Stepper", () => {
    it("sollte barrierefrei sein", async () => {
      wrapper = mount(Stepper, {
        props: {
          label: "Anzahl",
          modelValue: 1,
          min: 0,
          max: 10,
          step: 1,
          id: "quantity-stepper",
        },
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();

      // Prüfe auf spinbutton role
      const stepper = wrapper.find('[role="spinbutton"]').element;
      expect(stepper.getAttribute("aria-valuemin")).toBe("0");
      expect(stepper.getAttribute("aria-valuemax")).toBe("10");
      expect(stepper.getAttribute("aria-valuenow")).toBe("1");
      expect(stepper.getAttribute("aria-valuetext")).toBe("1");
    });
  });

  // Tooltip-Komponente
  describe("Tooltip", () => {
    it("sollte barrierefrei sein", async () => {
      wrapper = mount({
        template: `
          <div>
            <button id="help-button" aria-describedby="help-tooltip">Hilfe</button>
            <Tooltip id="help-tooltip" target="help-button">
              Hier finden Sie Hilfe zu diesem Thema
            </Tooltip>
          </div>
        `,
        components: { Tooltip },
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();

      // Prüfe auf tooltip role
      const tooltip = wrapper.find('[role="tooltip"]').element;
      expect(tooltip.id).toBe("help-tooltip");

      // Prüfe Verknüpfung mit Button
      const button = wrapper.find("#help-button").element;
      expect(button.getAttribute("aria-describedby")).toBe("help-tooltip");
    });
  });

  // AutoComplete-Komponente
  describe("AutoComplete", () => {
    it("sollte barrierefrei sein", async () => {
      wrapper = mount(AutoComplete, {
        props: {
          label: "Stadt",
          id: "city-autocomplete",
          options: ["Berlin", "Hamburg", "München", "Köln", "Frankfurt"],
          modelValue: "",
        },
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();

      // Prüfe auf combobox role
      const combobox = wrapper.find('[role="combobox"]').element;
      expect(combobox.getAttribute("aria-autocomplete")).toBe("list");
      expect(combobox.getAttribute("aria-expanded")).toBe("false");
      expect(combobox.getAttribute("aria-owns")).toBeDefined();
      expect(combobox.getAttribute("aria-haspopup")).toBe("listbox");
    });
  });

  // FocusTrap-Komponente
  describe("FocusTrap", () => {
    it("sollte barrierefrei sein", async () => {
      wrapper = mount({
        template: `
          <FocusTrap>
            <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
              <h2 id="dialog-title">Bestätigen</h2>
              <p>Möchten Sie diese Aktion wirklich durchführen?</p>
              <div class="dialog-buttons">
                <button id="cancel-btn">Abbrechen</button>
                <button id="confirm-btn">Bestätigen</button>
              </div>
            </div>
          </FocusTrap>
        `,
        components: { FocusTrap },
      });

      const results = await runAxeTest(wrapper.element);
      expect(results).toHaveNoViolations();

      // Prüfe auf Dialog-Attribute
      const dialog = wrapper.find('[role="dialog"]').element;
      expect(dialog.getAttribute("aria-modal")).toBe("true");
      expect(dialog.getAttribute("aria-labelledby")).toBe("dialog-title");
    });
  });
});
