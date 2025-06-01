import { describe, it, expect, vi } from "vitest";
import {
  typedMount,
  createTypedMock,
  mockStoreAction,
} from "../../../utils/typescript-test-utils";
import TypedButton from "@/components/examples/TypedButton.vue";
import {
  BUTTON_VARIANTS,
  BUTTON_SIZES,
  ButtonVariant,
  ButtonSize,
} from "@/components/examples/TypedButton.vue";

/**
 * Tests für die TypedButton Komponente
 *
 * Dieser Test nutzt die verbesserten TypeScript-Funktionen für bessere Typprüfung und Fehlererkennung.
 */
describe("TypedButton.vue", () => {
  // Typisierte Prop-Defaults definieren
  const defaultProps = {
    variant: "primary" as ButtonVariant,
    size: "medium" as ButtonSize,
    type: "button" as const,
    disabled: false,
    loading: false,
    fullWidth: false,
    iconOnly: false,
    iconLeft: null as any,
    iconRight: null as any,
  };

  // Typsichere Mount-Funktion mit DefaultProps-Typunterstützung
  const createWrapper = (props = {}) => {
    return typedMount(TypedButton, {
      props: {
        ...defaultProps,
        ...props,
      },
      slots: {
        default: "Test Button",
      },
    });
  };

  // Rendering Tests
  describe("Rendering", () => {
    it("renders the button correctly with default props", () => {
      const wrapper = createWrapper();

      expect(wrapper.find("button").exists()).toBe(true);
      expect(wrapper.text()).toContain("Test Button");
      expect(wrapper.classes()).toContain("n-button");
      expect(wrapper.classes()).toContain("n-button--primary"); // Default variant
    });

    it("applies the correct variant class", () => {
      // Typsicher: Nur erlaubte Varianten können hier verwendet werden
      const wrapper = createWrapper({
        variant: "secondary",
      });

      expect(wrapper.classes()).toContain("n-button--secondary");
    });

    it("applies size classes correctly", () => {
      // Typsicher: Nur erlaubte Größen können hier verwendet werden
      const smallWrapper = createWrapper({ size: "small" });
      const largeWrapper = createWrapper({ size: "large" });

      expect(smallWrapper.classes()).toContain("n-button--small");
      expect(largeWrapper.classes()).toContain("n-button--large");

      // Dies würde einen TypeScript-Fehler auslösen:
      // const invalidWrapper = createWrapper({ size: "invalid" });
    });

    it("applies disabled state correctly", () => {
      const wrapper = createWrapper({
        disabled: true,
      });

      expect(wrapper.find("button").attributes("disabled")).toBeDefined();
      expect(wrapper.find("button").attributes("aria-disabled")).toBe("true");
    });

    it("adds loading state when loading prop is true", () => {
      const wrapper = createWrapper({
        loading: true,
      });

      expect(wrapper.classes()).toContain("n-button--loading");
      expect(wrapper.find(".n-button__spinner").exists()).toBe(true);
      expect(wrapper.find("button").attributes("aria-busy")).toBe("true");
    });

    it("applies full-width class when fullWidth prop is true", () => {
      const wrapper = createWrapper({ fullWidth: true });

      expect(wrapper.classes()).toContain("n-button--full-width");
    });

    it("applies icon-only class when iconOnly prop is true", () => {
      const wrapper = createWrapper({ iconOnly: true });

      expect(wrapper.classes()).toContain("n-button--icon-only");
    });

    it("renders left icon when provided", () => {
      // Mock icon component
      const IconComponent = {
        template: '<div class="test-icon"></div>',
      };

      const wrapper = createWrapper({
        iconLeft: IconComponent,
      });

      expect(wrapper.find(".n-button__icon--left").exists()).toBe(true);
      expect(wrapper.findComponent(IconComponent).exists()).toBe(true);
    });

    it("renders right icon when provided", () => {
      // Mock icon component
      const IconComponent = {
        template: '<div class="test-icon"></div>',
      };

      const wrapper = createWrapper({
        iconRight: IconComponent,
      });

      expect(wrapper.find(".n-button__icon--right").exists()).toBe(true);
      expect(wrapper.findComponent(IconComponent).exists()).toBe(true);
    });
  });

  // Interactions and Events
  describe("Interactions", () => {
    it("emits click event when clicked", async () => {
      const wrapper = createWrapper();

      await wrapper.find("button").trigger("click");

      // Typsicher: Wir prüfen auf den exakten Event-Namen
      expect(wrapper.emitted()).toHaveProperty("click");
      expect(wrapper.emitted("click")).toHaveLength(1);

      // Prüfen, ob der Event mit dem korrekten Event-Objekt emittiert wurde
      const clickEvent = wrapper.emitted("click")?.[0]?.[0];
      expect(clickEvent).toBeDefined();
      expect(clickEvent instanceof MouseEvent).toBe(true);
    });

    it("does not emit click event when disabled", async () => {
      const wrapper = createWrapper({
        disabled: true,
      });

      await wrapper.find("button").trigger("click");

      expect(wrapper.emitted("click")).toBeFalsy();
    });

    it("does not emit click event when loading", async () => {
      const wrapper = createWrapper({
        loading: true,
      });

      await wrapper.find("button").trigger("click");

      expect(wrapper.emitted("click")).toBeFalsy();
    });

    it("emits click event on Enter key press", async () => {
      const wrapper = createWrapper();

      await wrapper.find("button").trigger("keydown.enter");

      expect(wrapper.emitted("click")).toHaveLength(1);
    });

    it("emits click event on Space key press", async () => {
      const wrapper = createWrapper();

      await wrapper.find("button").trigger("keydown.space");

      expect(wrapper.emitted("click")).toHaveLength(1);
    });

    it("does not emit click event on other key presses", async () => {
      const wrapper = createWrapper();

      await wrapper.find("button").trigger("keydown.tab");

      expect(wrapper.emitted("click")).toBeFalsy();
    });
  });

  // Slots Tests
  describe("Slots", () => {
    it("renders default slot content", () => {
      const wrapper = typedMount(TypedButton, {
        props: defaultProps,
        slots: {
          default: '<span class="custom-content">Custom Content</span>',
        },
      });

      expect(wrapper.find(".custom-content").exists()).toBe(true);
      expect(wrapper.text()).toContain("Custom Content");
    });

    it("supports using html content in slot", () => {
      const wrapper = typedMount(TypedButton, {
        props: defaultProps,
        slots: {
          default: "<strong>Bold</strong> and <em>italic</em>",
        },
      });

      expect(wrapper.find("strong").exists()).toBe(true);
      expect(wrapper.find("em").exists()).toBe(true);
      expect(wrapper.text()).toContain("Bold and italic");
    });
  });

  // Props Validation
  describe("Props Validation", () => {
    // TypeScript würde diese Tests unnötig machen, da ungültige Props
    // bereits zur Kompilierungszeit erkannt werden würden, aber wir können
    // trotzdem die Validierung testen

    it("validates variant prop with allowed values", () => {
      // Alle erlaubten Varianten testen
      BUTTON_VARIANTS.forEach((variant) => {
        const wrapper = createWrapper({ variant });
        expect(wrapper.classes()).toContain(`n-button--${variant}`);
      });
    });

    it("validates size prop with allowed values", () => {
      // Alle erlaubten Größen testen
      BUTTON_SIZES.forEach((size) => {
        const wrapper = createWrapper({ size });
        expect(wrapper.classes()).toContain(`n-button--${size}`);
      });
    });
  });

  // Accessibility
  describe("Accessibility", () => {
    it("sets aria-busy attribute when loading", () => {
      const wrapper = createWrapper({ loading: true });
      expect(wrapper.find("button").attributes("aria-busy")).toBe("true");
    });

    it("sets aria-disabled attribute when disabled", () => {
      const wrapper = createWrapper({ disabled: true });
      expect(wrapper.find("button").attributes("aria-disabled")).toBe("true");
    });

    it("makes icons have aria-hidden", () => {
      const IconComponent = {
        template: '<div class="test-icon"></div>',
      };

      const wrapper = createWrapper({
        iconLeft: IconComponent,
        iconRight: IconComponent,
      });

      expect(
        wrapper.find(".n-button__icon--left").attributes("aria-hidden"),
      ).toBe("true");
      expect(
        wrapper.find(".n-button__icon--right").attributes("aria-hidden"),
      ).toBe("true");
    });
  });
});
