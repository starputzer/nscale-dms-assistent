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

// Workaround exports for missing components 
// This ensures that components referenced in admin panels are available
export const RadioGroup = Input; // Temporary workaround
export const RichTextEditor = TextArea; // Temporary workaround
export const DateTimePicker = Input; // Temporary workaround
export const DateRangePicker = Input; // Temporary workaround
export const ColorPicker = Input; // Temporary workaround
export const IconPicker = Input; // Temporary workaround
export const NumberInput = Input; // Temporary workaround
export const TimeSlotPicker = Input; // Temporary workaround
export const Icon = Badge; // Temporary workaround
export const Checkbox = Toggle; // Temporary workaround
export const Label = Badge; // Temporary workaround
export const FormGroup = Card; // Temporary workaround
