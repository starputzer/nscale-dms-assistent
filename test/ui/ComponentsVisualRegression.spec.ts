/**
 * UI Component Visual Regression Tests
 * 
 * These tests verify that UI components render correctly in various states and configurations.
 * They cover appearance, states, interactions, and responsiveness.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";

// Import UI components
// Base components
import Button from "@/components/ui/base/Button.vue";
import Input from "@/components/ui/base/Input.vue";
import Checkbox from "@/components/ui/base/Checkbox.vue";
import Toggle from "@/components/ui/base/Toggle.vue";
import Dropdown from "@/components/ui/base/Dropdown.vue";
import Modal from "@/components/ui/base/Modal.vue";
import Card from "@/components/ui/base/Card.vue";
import Tabs from "@/components/ui/base/Tabs.vue";
import Badge from "@/components/ui/base/Badge.vue";
import Alert from "@/components/ui/base/Alert.vue";
import ProgressBar from "@/components/ui/base/ProgressBar.vue";
import TextArea from "@/components/ui/base/TextArea.vue";
import Tooltip from "@/components/ui/base/Tooltip.vue";

// Feedback components
import StatusIndicator from "@/components/ui/feedback/StatusIndicator.vue";
import InlineMessage from "@/components/ui/feedback/InlineMessage.vue";
import Banner from "@/components/ui/feedback/Banner.vue";

// Mock utilities and stores as needed
vi.mock("@/composables/useToast", () => ({
  useToast: () => ({
    showToast: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

// Helper to create a testing pinia instance with common settings
const createTestPinia = (initialState = {}) => {
  return createTestingPinia({
    createSpy: vi.fn,
    initialState: {
      ui: {
        theme: "light",
        fontSize: "medium",
        ...initialState.ui,
      },
      ...initialState,
    },
  });
};

// Helper to create a standard wrapper for all component tests
const createWrapper = (Component, props = {}, options = {}) => {
  return mount(Component, {
    props,
    global: {
      plugins: [createTestPinia(options.initialState || {})],
      mocks: {
        $t: (key, fallback) => fallback || key,
        ...(options.mocks || {}),
      },
      stubs: options.stubs || {},
      provide: options.provide || {},
    },
    ...options,
  });
};

describe("UI Components Visual Regression", () => {
  // Base Components
  describe("Button Component", () => {
    it("renders in various variants and states", async () => {
      // Test primary button
      const primaryButton = createWrapper(Button, {
        variant: "primary",
        label: "Primary Button",
      });
      expect(primaryButton.find(".nscale-btn--primary").exists()).toBe(true);
      expect(primaryButton.text()).toBe("Primary Button");
      
      // Test secondary button
      const secondaryButton = createWrapper(Button, {
        variant: "secondary",
        label: "Secondary Button",
      });
      expect(secondaryButton.find(".nscale-btn--secondary").exists()).toBe(true);
      
      // Test danger button
      const dangerButton = createWrapper(Button, {
        variant: "danger",
        label: "Danger Button",
      });
      expect(dangerButton.find(".nscale-btn--danger").exists()).toBe(true);
      
      // Test ghost button
      const ghostButton = createWrapper(Button, {
        variant: "ghost",
        label: "Ghost Button",
      });
      expect(ghostButton.find(".nscale-btn--ghost").exists()).toBe(true);
      
      // Test disabled state
      const disabledButton = createWrapper(Button, {
        variant: "primary",
        label: "Disabled Button",
        disabled: true,
      });
      expect(disabledButton.find(".nscale-btn--disabled").exists()).toBe(true);
      expect(disabledButton.attributes("disabled")).toBeDefined();
      
      // Test loading state
      const loadingButton = createWrapper(Button, {
        variant: "primary",
        label: "Loading Button",
        loading: true,
      });
      expect(loadingButton.find(".nscale-btn--loading").exists()).toBe(true);
      expect(loadingButton.find(".nscale-btn__spinner").exists()).toBe(true);
      
      // Test with icon
      const iconButton = createWrapper(Button, {
        variant: "primary",
        label: "Icon Button",
        icon: "save",
      });
      expect(iconButton.find(".nscale-btn__icon").exists()).toBe(true);
      
      // Test icon-only button
      const iconOnlyButton = createWrapper(Button, {
        variant: "primary",
        icon: "trash",
        iconOnly: true,
        ariaLabel: "Delete",
      });
      expect(iconOnlyButton.find(".nscale-btn--icon-only").exists()).toBe(true);
      expect(iconOnlyButton.attributes("aria-label")).toBe("Delete");
    });
    
    it("emits click events when clicked", async () => {
      const button = createWrapper(Button, {
        variant: "primary",
        label: "Click Me",
      });
      
      await button.trigger("click");
      expect(button.emitted("click")).toBeTruthy();
      
      // Disabled button should not emit click
      const disabledButton = createWrapper(Button, {
        variant: "primary",
        label: "Disabled Button",
        disabled: true,
      });
      
      await disabledButton.trigger("click");
      expect(disabledButton.emitted("click")).toBeFalsy();
    });
  });

  describe("Input Component", () => {
    it("renders in various states", async () => {
      // Basic input
      const input = createWrapper(Input, {
        modelValue: "",
        placeholder: "Enter value",
        label: "Text Input",
      });
      
      expect(input.find("input").exists()).toBe(true);
      expect(input.find("label").exists()).toBe(true);
      expect(input.find("label").text()).toBe("Text Input");
      expect(input.find("input").attributes("placeholder")).toBe("Enter value");
      
      // With value
      const valueInput = createWrapper(Input, {
        modelValue: "Test Value",
        label: "Input with Value",
      });
      
      expect(valueInput.find("input").element.value).toBe("Test Value");
      
      // Disabled input
      const disabledInput = createWrapper(Input, {
        modelValue: "",
        label: "Disabled Input",
        disabled: true,
      });
      
      expect(disabledInput.find("input").attributes("disabled")).toBeDefined();
      
      // Error state
      const errorInput = createWrapper(Input, {
        modelValue: "",
        label: "Error Input",
        error: "This field is required",
      });
      
      expect(errorInput.find(".nscale-input--error").exists()).toBe(true);
      expect(errorInput.find(".nscale-input__error-message").text()).toBe("This field is required");
      
      // With prefix/suffix
      const affixInput = createWrapper(Input, {
        modelValue: "100",
        label: "Currency Input",
        prefix: "$",
        suffix: ".00",
      });
      
      expect(affixInput.find(".nscale-input__prefix").exists()).toBe(true);
      expect(affixInput.find(".nscale-input__prefix").text()).toBe("$");
      expect(affixInput.find(".nscale-input__suffix").exists()).toBe(true);
      expect(affixInput.find(".nscale-input__suffix").text()).toBe(".00");
    });
    
    it("emits update:modelValue event when value changes", async () => {
      const input = createWrapper(Input, {
        modelValue: "",
        label: "Test Input",
      });
      
      await input.find("input").setValue("New Value");
      expect(input.emitted("update:modelValue")).toBeTruthy();
      expect(input.emitted("update:modelValue")[0]).toEqual(["New Value"]);
    });
  });
  
  describe("Checkbox Component", () => {
    it("renders in various states", async () => {
      // Unchecked
      const checkbox = createWrapper(Checkbox, {
        modelValue: false,
        label: "Accept terms",
      });
      
      expect(checkbox.find("input[type='checkbox']").exists()).toBe(true);
      expect(checkbox.find("input").element.checked).toBe(false);
      expect(checkbox.find("label").text()).toBe("Accept terms");
      
      // Checked
      const checkedCheckbox = createWrapper(Checkbox, {
        modelValue: true,
        label: "Checked option",
      });
      
      expect(checkedCheckbox.find("input").element.checked).toBe(true);
      
      // Disabled unchecked
      const disabledCheckbox = createWrapper(Checkbox, {
        modelValue: false,
        label: "Disabled option",
        disabled: true,
      });
      
      expect(disabledCheckbox.find("input").attributes("disabled")).toBeDefined();
      
      // Disabled checked
      const disabledCheckedCheckbox = createWrapper(Checkbox, {
        modelValue: true,
        label: "Disabled checked option",
        disabled: true,
      });
      
      expect(disabledCheckedCheckbox.find("input").element.checked).toBe(true);
      expect(disabledCheckedCheckbox.find("input").attributes("disabled")).toBeDefined();
      
      // With HTML in label (sanitized)
      const htmlLabelCheckbox = createWrapper(Checkbox, {
        modelValue: false,
        label: "Accept <a href='#'>terms</a>",
      });
      
      expect(htmlLabelCheckbox.find("label").text()).toBe("Accept terms");
    });
    
    it("emits update:modelValue event when toggled", async () => {
      const checkbox = createWrapper(Checkbox, {
        modelValue: false,
        label: "Test Checkbox",
      });
      
      await checkbox.find("input").setValue(true);
      expect(checkbox.emitted("update:modelValue")).toBeTruthy();
      expect(checkbox.emitted("update:modelValue")[0]).toEqual([true]);
      
      // Disabled checkbox should not emit events
      const disabledCheckbox = createWrapper(Checkbox, {
        modelValue: false,
        label: "Disabled Checkbox",
        disabled: true,
      });
      
      await disabledCheckbox.find("input").setValue(true);
      expect(disabledCheckbox.emitted("update:modelValue")).toBeFalsy();
    });
  });
  
  describe("Toggle Component", () => {
    it("renders in various states", async () => {
      // Off state
      const toggle = createWrapper(Toggle, {
        modelValue: false,
        label: "Dark mode",
      });
      
      expect(toggle.find(".nscale-toggle").exists()).toBe(true);
      expect(toggle.find(".nscale-toggle--active").exists()).toBe(false);
      expect(toggle.find(".nscale-toggle__label").text()).toBe("Dark mode");
      
      // On state
      const activeToggle = createWrapper(Toggle, {
        modelValue: true,
        label: "Notifications",
      });
      
      expect(activeToggle.find(".nscale-toggle--active").exists()).toBe(true);
      
      // Disabled off state
      const disabledToggle = createWrapper(Toggle, {
        modelValue: false,
        label: "Disabled toggle",
        disabled: true,
      });
      
      expect(disabledToggle.find(".nscale-toggle--disabled").exists()).toBe(true);
      
      // Disabled on state
      const disabledActiveToggle = createWrapper(Toggle, {
        modelValue: true,
        label: "Disabled active toggle",
        disabled: true,
      });
      
      expect(disabledActiveToggle.find(".nscale-toggle--active").exists()).toBe(true);
      expect(disabledActiveToggle.find(".nscale-toggle--disabled").exists()).toBe(true);
    });
    
    it("emits update:modelValue event when toggled", async () => {
      const toggle = createWrapper(Toggle, {
        modelValue: false,
        label: "Test Toggle",
      });
      
      await toggle.find(".nscale-toggle").trigger("click");
      expect(toggle.emitted("update:modelValue")).toBeTruthy();
      expect(toggle.emitted("update:modelValue")[0]).toEqual([true]);
      
      // Disabled toggle should not emit events
      const disabledToggle = createWrapper(Toggle, {
        modelValue: false,
        label: "Disabled Toggle",
        disabled: true,
      });
      
      await disabledToggle.find(".nscale-toggle").trigger("click");
      expect(disabledToggle.emitted("update:modelValue")).toBeFalsy();
    });
  });
  
  describe("Modal Component", () => {
    it("renders when visible with various content", async () => {
      // Basic modal
      const modal = createWrapper(Modal, {
        title: "Confirmation",
        isVisible: true,
      }, {
        slots: {
          default: '<div>Modal content</div>',
          footer: '<button>Confirm</button><button>Cancel</button>',
        },
      });
      
      expect(modal.find(".nscale-modal").exists()).toBe(true);
      expect(modal.find(".nscale-modal__title").text()).toBe("Confirmation");
      expect(modal.find(".nscale-modal__content").text()).toBe("Modal content");
      expect(modal.find(".nscale-modal__footer").text()).toContain("Confirm");
      expect(modal.find(".nscale-modal__footer").text()).toContain("Cancel");
      
      // Hidden modal
      const hiddenModal = createWrapper(Modal, {
        title: "Hidden Modal",
        isVisible: false,
      }, {
        slots: {
          default: '<div>Hidden content</div>',
        },
      });
      
      expect(hiddenModal.find(".nscale-modal").exists()).toBe(false);
      
      // Modal with close button
      const closeableModal = createWrapper(Modal, {
        title: "Closeable Modal",
        isVisible: true,
        closable: true,
      });
      
      expect(closeableModal.find(".nscale-modal__close-button").exists()).toBe(true);
      
      // Modal with different sizes
      const smallModal = createWrapper(Modal, {
        title: "Small Modal",
        isVisible: true,
        size: "small",
      });
      
      expect(smallModal.find(".nscale-modal--small").exists()).toBe(true);
      
      const largeModal = createWrapper(Modal, {
        title: "Large Modal",
        isVisible: true,
        size: "large",
      });
      
      expect(largeModal.find(".nscale-modal--large").exists()).toBe(true);
    });
    
    it("emits close event when close button is clicked", async () => {
      const modal = createWrapper(Modal, {
        title: "Closeable Modal",
        isVisible: true,
        closable: true,
      });
      
      await modal.find(".nscale-modal__close-button").trigger("click");
      expect(modal.emitted("close")).toBeTruthy();
    });
    
    it("emits close event when clicking outside modal if closeOnClickOutside is true", async () => {
      const modal = createWrapper(Modal, {
        title: "Clickable Outside Modal",
        isVisible: true,
        closeOnClickOutside: true,
      });
      
      await modal.find(".nscale-modal__overlay").trigger("click");
      expect(modal.emitted("close")).toBeTruthy();
      
      // Modal without closeOnClickOutside
      const nonClickableModal = createWrapper(Modal, {
        title: "Non-clickable Outside Modal",
        isVisible: true,
        closeOnClickOutside: false,
      });
      
      await nonClickableModal.find(".nscale-modal__overlay").trigger("click");
      expect(nonClickableModal.emitted("close")).toBeFalsy();
    });
  });
  
  describe("Card Component", () => {
    it("renders with different content and styles", async () => {
      // Basic card
      const card = createWrapper(Card, {
        title: "Card Title",
      }, {
        slots: {
          default: '<p>Card content</p>',
          footer: '<button>Action</button>',
        },
      });
      
      expect(card.find(".nscale-card").exists()).toBe(true);
      expect(card.find(".nscale-card__title").text()).toBe("Card Title");
      expect(card.find(".nscale-card__content").text()).toBe("Card content");
      expect(card.find(".nscale-card__footer").text()).toBe("Action");
      
      // Card without title
      const noTitleCard = createWrapper(Card, {}, {
        slots: {
          default: '<p>Content only</p>',
        },
      });
      
      expect(noTitleCard.find(".nscale-card__title").exists()).toBe(false);
      expect(noTitleCard.find(".nscale-card__content").text()).toBe("Content only");
      
      // Card with different variants
      const borderedCard = createWrapper(Card, {
        title: "Bordered Card",
        variant: "bordered",
      }, {
        slots: {
          default: '<p>Card with border</p>',
        },
      });
      
      expect(borderedCard.find(".nscale-card--bordered").exists()).toBe(true);
      
      const elevatedCard = createWrapper(Card, {
        title: "Elevated Card",
        variant: "elevated",
      }, {
        slots: {
          default: '<p>Card with elevation</p>',
        },
      });
      
      expect(elevatedCard.find(".nscale-card--elevated").exists()).toBe(true);
    });
  });
  
  describe("Tabs Component", () => {
    it("renders tabs with different states and selections", async () => {
      // Define tabs
      const tabs = [
        { id: "tab1", label: "First Tab" },
        { id: "tab2", label: "Second Tab" },
        { id: "tab3", label: "Third Tab" },
      ];
      
      // Basic tabs with first tab active
      const tabsComponent = createWrapper(Tabs, {
        tabs,
        activeTab: "tab1",
      });
      
      expect(tabsComponent.find(".nscale-tabs").exists()).toBe(true);
      expect(tabsComponent.findAll(".nscale-tabs__tab").length).toBe(3);
      expect(tabsComponent.find(".nscale-tabs__tab--active").text()).toBe("First Tab");
      
      // Change active tab
      await tabsComponent.setProps({ activeTab: "tab2" });
      expect(tabsComponent.find(".nscale-tabs__tab--active").text()).toBe("Second Tab");
      
      // Tabs with disabled tab
      const tabsWithDisabled = createWrapper(Tabs, {
        tabs: [
          { id: "tab1", label: "Enabled Tab" },
          { id: "tab2", label: "Disabled Tab", disabled: true },
        ],
        activeTab: "tab1",
      });
      
      expect(tabsWithDisabled.find(".nscale-tabs__tab--disabled").text()).toBe("Disabled Tab");
      
      // Tabs with different variants
      const verticalTabs = createWrapper(Tabs, {
        tabs,
        activeTab: "tab1",
        variant: "vertical",
      });
      
      expect(verticalTabs.find(".nscale-tabs--vertical").exists()).toBe(true);
      
      const pillTabs = createWrapper(Tabs, {
        tabs,
        activeTab: "tab1",
        variant: "pills",
      });
      
      expect(pillTabs.find(".nscale-tabs--pills").exists()).toBe(true);
    });
    
    it("emits tab-change event when clicking tabs", async () => {
      const tabs = [
        { id: "tab1", label: "First Tab" },
        { id: "tab2", label: "Second Tab" },
      ];
      
      const tabsComponent = createWrapper(Tabs, {
        tabs,
        activeTab: "tab1",
      });
      
      // Click second tab
      await tabsComponent.findAll(".nscale-tabs__tab")[1].trigger("click");
      
      expect(tabsComponent.emitted("tab-change")).toBeTruthy();
      expect(tabsComponent.emitted("tab-change")[0]).toEqual(["tab2"]);
      
      // Disabled tab should not emit events
      const tabsWithDisabled = createWrapper(Tabs, {
        tabs: [
          { id: "tab1", label: "Enabled Tab" },
          { id: "tab2", label: "Disabled Tab", disabled: true },
        ],
        activeTab: "tab1",
      });
      
      await tabsWithDisabled.findAll(".nscale-tabs__tab")[1].trigger("click");
      expect(tabsWithDisabled.emitted("tab-change")).toBeFalsy();
    });
  });
  
  describe("Badge Component", () => {
    it("renders with different variants and content", async () => {
      // Default badge
      const badge = createWrapper(Badge, {
        label: "New",
      });
      
      expect(badge.find(".nscale-badge").exists()).toBe(true);
      expect(badge.text()).toBe("New");
      
      // Badge with different variants
      const successBadge = createWrapper(Badge, {
        label: "Success",
        variant: "success",
      });
      
      expect(successBadge.find(".nscale-badge--success").exists()).toBe(true);
      
      const warningBadge = createWrapper(Badge, {
        label: "Warning",
        variant: "warning",
      });
      
      expect(warningBadge.find(".nscale-badge--warning").exists()).toBe(true);
      
      const errorBadge = createWrapper(Badge, {
        label: "Error",
        variant: "error",
      });
      
      expect(errorBadge.find(".nscale-badge--error").exists()).toBe(true);
      
      const infoBadge = createWrapper(Badge, {
        label: "Info",
        variant: "info",
      });
      
      expect(infoBadge.find(".nscale-badge--info").exists()).toBe(true);
      
      // Badge with different sizes
      const smallBadge = createWrapper(Badge, {
        label: "Small",
        size: "small",
      });
      
      expect(smallBadge.find(".nscale-badge--small").exists()).toBe(true);
      
      const largeBadge = createWrapper(Badge, {
        label: "Large",
        size: "large",
      });
      
      expect(largeBadge.find(".nscale-badge--large").exists()).toBe(true);
    });
  });
  
  describe("Alert Component", () => {
    it("renders with different variants and content", async () => {
      // Default alert
      const alert = createWrapper(Alert, {
        title: "Information",
        message: "This is an informational alert",
      });
      
      expect(alert.find(".nscale-alert").exists()).toBe(true);
      expect(alert.find(".nscale-alert__title").text()).toBe("Information");
      expect(alert.find(".nscale-alert__message").text()).toBe("This is an informational alert");
      
      // Alert with different variants
      const successAlert = createWrapper(Alert, {
        title: "Success",
        message: "Operation completed successfully",
        variant: "success",
      });
      
      expect(successAlert.find(".nscale-alert--success").exists()).toBe(true);
      
      const warningAlert = createWrapper(Alert, {
        title: "Warning",
        message: "Proceed with caution",
        variant: "warning",
      });
      
      expect(warningAlert.find(".nscale-alert--warning").exists()).toBe(true);
      
      const errorAlert = createWrapper(Alert, {
        title: "Error",
        message: "An error occurred",
        variant: "error",
      });
      
      expect(errorAlert.find(".nscale-alert--error").exists()).toBe(true);
      
      // Alert with dismiss button
      const dismissibleAlert = createWrapper(Alert, {
        title: "Dismissible",
        message: "You can dismiss this alert",
        dismissible: true,
      });
      
      expect(dismissibleAlert.find(".nscale-alert__dismiss").exists()).toBe(true);
      
      // Alert with custom icon
      const customIconAlert = createWrapper(Alert, {
        title: "Custom Icon",
        message: "Alert with custom icon",
        icon: "bell",
      });
      
      expect(customIconAlert.find(".nscale-alert__icon").exists()).toBe(true);
    });
    
    it("emits dismiss event when dismiss button is clicked", async () => {
      const alert = createWrapper(Alert, {
        title: "Dismissible",
        message: "You can dismiss this alert",
        dismissible: true,
      });
      
      await alert.find(".nscale-alert__dismiss").trigger("click");
      expect(alert.emitted("dismiss")).toBeTruthy();
    });
  });
  
  describe("ProgressBar Component", () => {
    it("renders with different values and variants", async () => {
      // Basic progress bar at 50%
      const progressBar = createWrapper(ProgressBar, {
        value: 50,
        max: 100,
      });
      
      expect(progressBar.find(".nscale-progress").exists()).toBe(true);
      expect(progressBar.find(".nscale-progress__bar").attributes("style")).toContain("width: 50%");
      
      // Progress bar with different variants
      const successProgressBar = createWrapper(ProgressBar, {
        value: 75,
        max: 100,
        variant: "success",
      });
      
      expect(successProgressBar.find(".nscale-progress--success").exists()).toBe(true);
      expect(successProgressBar.find(".nscale-progress__bar").attributes("style")).toContain("width: 75%");
      
      const warningProgressBar = createWrapper(ProgressBar, {
        value: 80,
        max: 100,
        variant: "warning",
      });
      
      expect(warningProgressBar.find(".nscale-progress--warning").exists()).toBe(true);
      
      const errorProgressBar = createWrapper(ProgressBar, {
        value: 30,
        max: 100,
        variant: "error",
      });
      
      expect(errorProgressBar.find(".nscale-progress--error").exists()).toBe(true);
      
      // Indeterminate progress bar
      const indeterminateProgressBar = createWrapper(ProgressBar, {
        indeterminate: true,
      });
      
      expect(indeterminateProgressBar.find(".nscale-progress--indeterminate").exists()).toBe(true);
      
      // Progress bar with label
      const labeledProgressBar = createWrapper(ProgressBar, {
        value: 40,
        max: 100,
        showLabel: true,
      });
      
      expect(labeledProgressBar.find(".nscale-progress__label").exists()).toBe(true);
      expect(labeledProgressBar.find(".nscale-progress__label").text()).toContain("40%");
    });
  });
  
  // Feedback components
  describe("StatusIndicator Component", () => {
    it("renders with different states", async () => {
      // Success status
      const successIndicator = createWrapper(StatusIndicator, {
        status: "success",
        label: "Completed",
      });
      
      expect(successIndicator.find(".nscale-status-indicator").exists()).toBe(true);
      expect(successIndicator.find(".nscale-status-indicator--success").exists()).toBe(true);
      expect(successIndicator.find(".nscale-status-indicator__label").text()).toBe("Completed");
      
      // Warning status
      const warningIndicator = createWrapper(StatusIndicator, {
        status: "warning",
        label: "Pending",
      });
      
      expect(warningIndicator.find(".nscale-status-indicator--warning").exists()).toBe(true);
      
      // Error status
      const errorIndicator = createWrapper(StatusIndicator, {
        status: "error",
        label: "Failed",
      });
      
      expect(errorIndicator.find(".nscale-status-indicator--error").exists()).toBe(true);
      
      // Info status
      const infoIndicator = createWrapper(StatusIndicator, {
        status: "info",
        label: "Processing",
      });
      
      expect(infoIndicator.find(".nscale-status-indicator--info").exists()).toBe(true);
      
      // Loading status
      const loadingIndicator = createWrapper(StatusIndicator, {
        status: "loading",
        label: "Loading",
      });
      
      expect(loadingIndicator.find(".nscale-status-indicator--loading").exists()).toBe(true);
      expect(loadingIndicator.find(".nscale-status-indicator__spinner").exists()).toBe(true);
    });
  });
  
  describe("InlineMessage Component", () => {
    it("renders with different variants and content", async () => {
      // Default (info) message
      const defaultMessage = createWrapper(InlineMessage, {
        message: "This is an information message",
      });
      
      expect(defaultMessage.find(".nscale-inline-message").exists()).toBe(true);
      expect(defaultMessage.find(".nscale-inline-message--info").exists()).toBe(true);
      expect(defaultMessage.text()).toContain("This is an information message");
      
      // Success message
      const successMessage = createWrapper(InlineMessage, {
        message: "Operation successful",
        variant: "success",
      });
      
      expect(successMessage.find(".nscale-inline-message--success").exists()).toBe(true);
      
      // Warning message
      const warningMessage = createWrapper(InlineMessage, {
        message: "Proceed with caution",
        variant: "warning",
      });
      
      expect(warningMessage.find(".nscale-inline-message--warning").exists()).toBe(true);
      
      // Error message
      const errorMessage = createWrapper(InlineMessage, {
        message: "An error occurred",
        variant: "error",
      });
      
      expect(errorMessage.find(".nscale-inline-message--error").exists()).toBe(true);
      
      // Message with title
      const titledMessage = createWrapper(InlineMessage, {
        title: "Important",
        message: "Pay attention to this",
      });
      
      expect(titledMessage.find(".nscale-inline-message__title").exists()).toBe(true);
      expect(titledMessage.find(".nscale-inline-message__title").text()).toBe("Important");
      
      // Message with icon
      const iconMessage = createWrapper(InlineMessage, {
        message: "Message with icon",
        icon: true,
      });
      
      expect(iconMessage.find(".nscale-inline-message__icon").exists()).toBe(true);
    });
  });
  
  describe("Banner Component", () => {
    it("renders with different variants and content", async () => {
      // Default banner
      const defaultBanner = createWrapper(Banner, {
        message: "Welcome to the application",
      });
      
      expect(defaultBanner.find(".nscale-banner").exists()).toBe(true);
      expect(defaultBanner.text()).toContain("Welcome to the application");
      
      // Banner with different variants
      const infoBanner = createWrapper(Banner, {
        message: "Information banner",
        variant: "info",
      });
      
      expect(infoBanner.find(".nscale-banner--info").exists()).toBe(true);
      
      const successBanner = createWrapper(Banner, {
        message: "Success banner",
        variant: "success",
      });
      
      expect(successBanner.find(".nscale-banner--success").exists()).toBe(true);
      
      const warningBanner = createWrapper(Banner, {
        message: "Warning banner",
        variant: "warning",
      });
      
      expect(warningBanner.find(".nscale-banner--warning").exists()).toBe(true);
      
      const errorBanner = createWrapper(Banner, {
        message: "Error banner",
        variant: "error",
      });
      
      expect(errorBanner.find(".nscale-banner--error").exists()).toBe(true);
      
      // Banner with dismiss button
      const dismissibleBanner = createWrapper(Banner, {
        message: "Dismissible banner",
        dismissible: true,
      });
      
      expect(dismissibleBanner.find(".nscale-banner__dismiss").exists()).toBe(true);
      
      // Banner with title
      const titledBanner = createWrapper(Banner, {
        title: "Announcement",
        message: "Important announcement",
      });
      
      expect(titledBanner.find(".nscale-banner__title").exists()).toBe(true);
      expect(titledBanner.find(".nscale-banner__title").text()).toBe("Announcement");
      
      // Banner with action button
      const actionBanner = createWrapper(Banner, {
        message: "Banner with action",
        actionText: "Learn More",
      });
      
      expect(actionBanner.find(".nscale-banner__action").exists()).toBe(true);
      expect(actionBanner.find(".nscale-banner__action").text()).toBe("Learn More");
    });
    
    it("emits dismiss and action events", async () => {
      // Banner with dismiss button
      const dismissibleBanner = createWrapper(Banner, {
        message: "Dismissible banner",
        dismissible: true,
      });
      
      await dismissibleBanner.find(".nscale-banner__dismiss").trigger("click");
      expect(dismissibleBanner.emitted("dismiss")).toBeTruthy();
      
      // Banner with action button
      const actionBanner = createWrapper(Banner, {
        message: "Banner with action",
        actionText: "Learn More",
      });
      
      await actionBanner.find(".nscale-banner__action").trigger("click");
      expect(actionBanner.emitted("action")).toBeTruthy();
    });
  });
  
  // Theme integration tests
  describe("Theme Integration", () => {
    it("applies theme classes correctly", async () => {
      // Create component with light theme
      const lightButton = createWrapper(Button, {
        variant: "primary",
        label: "Light Theme Button",
      }, {
        initialState: {
          ui: {
            theme: "light",
          },
        },
      });
      
      expect(lightButton.find(".theme-light").exists()).toBe(true);
      
      // Create component with dark theme
      const darkButton = createWrapper(Button, {
        variant: "primary",
        label: "Dark Theme Button",
      }, {
        initialState: {
          ui: {
            theme: "dark",
          },
        },
      });
      
      expect(darkButton.find(".theme-dark").exists()).toBe(true);
    });
    
    it("handles theme changes reactively", async () => {
      const button = createWrapper(Button, {
        variant: "primary",
        label: "Theme Changing Button",
      }, {
        initialState: {
          ui: {
            theme: "light",
          },
        },
      });
      
      expect(button.find(".theme-light").exists()).toBe(true);
      
      // Change theme in the store
      const uiStore = button.vm.uiStore;
      uiStore.theme = "dark";
      await flushPromises();
      
      // Component should reflect the theme change
      expect(button.find(".theme-dark").exists()).toBe(true);
    });
  });
});