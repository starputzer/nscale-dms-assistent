// Base component types

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  content?: string;
}

export interface BaseButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export interface BaseInputProps {
  modelValue: string | number;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

export interface BaseSelectProps {
  modelValue: string | number | null;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

export interface BaseCheckboxProps {
  modelValue: boolean;
  label?: string;
  disabled?: boolean;
  indeterminate?: boolean;
}

export interface BaseTextareaProps {
  modelValue: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
  rows?: number;
  maxLength?: number;
}

export interface BaseCardProps {
  title?: string;
  subtitle?: string;
  padding?: boolean;
  shadow?: boolean;
  hoverable?: boolean;
}

export interface BaseTabsProps {
  modelValue: string;
  items: TabItem[];
}

export interface BaseAlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  closable?: boolean;
}

export interface BaseLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

export interface BaseToastProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  position?: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}