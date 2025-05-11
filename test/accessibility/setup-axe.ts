// Importiere axe-core
import axeCore from "axe-core";

// Konfiguriere axe mit deutschen Lokalisierungen und zusätzlichen Regeln
axeCore.configure({
  locale: {
    lang: "de",
    rules: {
      accesskeys: {
        description: "Ensures every accesskey attribute value is unique",
        help: "Accesskey-Werte müssen eindeutig sein",
      },
      "aria-allowed-attr": {
        description:
          "Ensures ARIA attributes are allowed for an element's role",
        help: "Elemente müssen nur erlaubte ARIA-Attribute für ihre Rolle verwenden",
      },
      // Weitere Übersetzungen hier..
    },
  },
  rules: [
    // Regel für WCAG 2.1 (Tastaturnavigation)
    {
      id: "keyboard-nav",
      selector: "a, button, [tabindex]",
      tags: ["wcag2a", "keyboard"],
      any: ["has-visible-text", "has-alt-text", "has-aria-label"],
      all: ["focusable-element"],
    },
    // Regel für WCAG 2.1 (Textskalierung)
    {
      id: "text-scaling",
      selector: "html",
      tags: ["wcag2a", "resize-text"],
      all: ["css-orientation-lock"],
    },
  ],
  checks: [
    {
      id: "focusable-element",
      evaluate: function (node) {
        return node.getAttribute("tabindex") !== "-1";
      },
    },
    {
      id: "css-orientation-lock",
      evaluate: function () {
        const style = window.getComputedStyle(document.documentElement);
        return (
          style.getPropertyValue("max-width") !== "none" &&
          style.getPropertyValue("max-height") !== "none"
        );
      },
    },
  ],
});

// Benutzerdefinierte Regel-Tags für WCAG 2.1 AA
export const wcag21aaRules = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "best-practice",
];

// Konfiguration für erweiterte Tests mit zusätzlichen Regeln
export const extendedAxeConfig = {
  rules: {
    // Regeln aktivieren
    "color-contrast": { enabled: true },
    "aria-hidden-focus": { enabled: true },
    "aria-required-attr": { enabled: true },
    "aria-required-children": { enabled: true },
    "aria-required-parent": { enabled: true },
    "duplicate-id-active": { enabled: true },
    "button-name": { enabled: true },
    label: { enabled: true },
    "label-content-name-mismatch": { enabled: true },
    "frame-title": { enabled: true },
    "focus-order-semantics": { enabled: true },
    "landmark-one-main": { enabled: true },
    region: { enabled: true },

    // Regeln deaktivieren die zu viele false positives generieren
    "landmark-complementary-is-top-level": { enabled: false },
    "landmark-unique": { enabled: false },
    "page-has-heading-one": { enabled: false },
    "scrollable-region-focusable": { enabled: false },
  },
  resultTypes: ["violations", "incomplete"],
  reporter: "v1",
};

// Adapter-Funktion, die dem toHaveNoViolations Jest-Matcher entspricht
export function toHaveNoViolations(results: any) {
  const violations = results.violations || [];
  return {
    pass: violations.length === 0,
    message: () => {
      return `Expected no accessibility violations but ${violations.length} were found:\n${JSON.stringify(violations, null, 2)}`;
    },
  };
}

// Funktion zum Ausführen eines Axe-Tests mit Vue Test Utils
export async function runAxeTest(
  container: HTMLElement,
  rules = wcag21aaRules,
) {
  const options = {
    runOnly: {
      type: "tag",
      values: rules,
    },
    ...extendedAxeConfig,
  };

  return axeCore.run(container, options);
}
