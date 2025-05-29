// Export all base UI components
export { default as Button } from "./Button.vue";
export { default as Input } from "./Input.vue";
export { default as Card } from "./Card.vue";
export { default as Alert } from "./Alert.vue";
export { default as Modal } from "./Modal.vue";
export { default as FocusTrap } from "./FocusTrap.vue";
export { default as TextArea } from "./TextArea.vue";
export { default as Toggle } from "./Toggle.vue";
export { default as Tooltip } from "./Tooltip.vue";
export { default as Badge } from "./Badge.vue";
export { default as Breadcrumb } from "./Breadcrumb.vue";
export { default as ProgressBar } from "./ProgressBar.vue";
export { default as Tabs } from "./Tabs.vue";
export { default as Stepper } from "./Stepper.vue";
export { default as Select } from "./Select.vue";

// Import components first to ensure they're available
import InputComponent from "./Input.vue";
import TextAreaComponent from "./TextArea.vue";
import ToggleComponent from "./Toggle.vue";
import BadgeComponent from "./Badge.vue";

// Workaround exports for missing components 
// This ensures that components referenced in admin panels are available
export const RadioGroup = InputComponent; // Temporary workaround
export const RichTextEditor = TextAreaComponent; // Temporary workaround
export const DateTimePicker = InputComponent; // Temporary workaround
export const DateRangePicker = InputComponent; // Temporary workaround
export const ColorPicker = InputComponent; // Temporary workaround
export const IconPicker = InputComponent; // Temporary workaround
export const NumberInput = InputComponent; // Temporary workaround
export const TimeSlotPicker = InputComponent; // Temporary workaround
export const Icon = BadgeComponent; // Temporary workaround
export const Checkbox = ToggleComponent; // Temporary workaround
export const Label = BadgeComponent; // Temporary workaround

import CardComponent from "./Card.vue";
export const FormGroup = CardComponent; // Temporary workaround
