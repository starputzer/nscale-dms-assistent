/**
 * TypeScript-Definitionen für Komponenten
 * 
 * Strikte Typisierung für alle Vue-Komponenten
 */

import type { Component, VNode } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

// Base Component Props
export interface BaseComponentProps {
  id?: string;
  class?: string | string[] | Record<string, boolean>;
  style?: string | Record<string, string>;
  testId?: string;
}

// Button Component
export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  to?: RouteLocationRaw;
  href?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
}

// Input Component
export interface InputProps extends BaseComponentProps {
  modelValue: string | number;
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search';
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  autofocus?: boolean;
  autocomplete?: string;
  maxlength?: number;
  minlength?: number;
  pattern?: string;
  icon?: string;
  iconPosition?: 'left' | 'right';
  error?: string;
  hint?: string;
  label?: string;
  clearable?: boolean;
  mask?: string;
}

// Select Component
export interface SelectOption {
  value: any;
  label: string;
  disabled?: boolean;
  group?: string;
  icon?: string;
  description?: string;
}

export interface SelectProps extends BaseComponentProps {
  modelValue: any;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  loading?: boolean;
  error?: string;
  hint?: string;
  label?: string;
  groupBy?: string;
  valueKey?: string;
  labelKey?: string;
  maxSelections?: number;
}

// Modal Component
export interface ModalProps extends BaseComponentProps {
  modelValue: boolean;
  title?: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  closable?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  persistent?: boolean;
  loading?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  centered?: boolean;
  scrollable?: boolean;
  transition?: string;
}

// Card Component
export interface CardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  loading?: boolean;
  hoverable?: boolean;
  clickable?: boolean;
  disabled?: boolean;
  flat?: boolean;
  outlined?: boolean;
  raised?: boolean;
  header?: boolean;
  footer?: boolean;
  media?: string;
  mediaHeight?: string | number;
  mediaPosition?: 'top' | 'bottom' | 'left' | 'right';
}

// Table Component
export interface TableColumn<T = any> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  align?: 'left' | 'center' | 'right';
  headerAlign?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
  formatter?: (value: any, row: T, column: TableColumn<T>) => string | VNode;
  component?: Component;
  editable?: boolean;
  ellipsis?: boolean;
  tooltip?: boolean;
  hidden?: boolean;
  resizable?: boolean;
}

export interface TableProps<T = any> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  error?: string;
  emptyText?: string;
  rowKey?: keyof T | ((row: T) => string | number);
  selectable?: boolean;
  selectedRows?: T[];
  singleSelect?: boolean;
  expandable?: boolean;
  expandedRows?: (string | number)[];
  sortable?: boolean;
  defaultSort?: {
    key: string;
    order: 'asc' | 'desc';
  };
  filterable?: boolean;
  filters?: Record<string, any>;
  paginated?: boolean;
  pageSize?: number;
  currentPage?: number;
  totalRows?: number;
  rowClass?: string | ((row: T, index: number) => string);
  cellClass?: string | ((value: any, row: T, column: TableColumn<T>) => string);
  striped?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  dense?: boolean;
  stickyHeader?: boolean;
  height?: string | number;
  maxHeight?: string | number;
  virtualScroll?: boolean;
}

// Tabs Component
export interface TabItem {
  key: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  component?: Component;
  props?: Record<string, any>;
  keepAlive?: boolean;
  lazy?: boolean;
}

export interface TabsProps extends BaseComponentProps {
  modelValue: string;
  items: TabItem[];
  type?: 'line' | 'card' | 'button';
  position?: 'top' | 'bottom' | 'left' | 'right';
  closable?: boolean;
  addable?: boolean;
  draggable?: boolean;
  animated?: boolean;
  lazy?: boolean;
  beforeSwitch?: (from: string, to: string) => boolean | Promise<boolean>;
}

// Dropdown Component
export interface DropdownItem {
  key: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  divider?: boolean;
  header?: boolean;
  command?: string;
  to?: RouteLocationRaw;
  href?: string;
  target?: string;
  children?: DropdownItem[];
}

export interface DropdownProps extends BaseComponentProps {
  items: DropdownItem[];
  trigger?: 'click' | 'hover' | 'contextmenu';
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  offset?: [number, number];
  disabled?: boolean;
  hideOnClick?: boolean;
  showArrow?: boolean;
  appendToBody?: boolean;
  transition?: string;
}

// Toast Component
export interface ToastProps {
  id?: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  closable?: boolean;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  offset?: [number, number];
  showIcon?: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
  onClose?: () => void;
}

// Loading Component
export interface LoadingProps extends BaseComponentProps {
  active: boolean;
  text?: string;
  spinner?: 'circle' | 'dots' | 'bars' | 'pulse';
  size?: 'small' | 'medium' | 'large';
  color?: string;
  background?: string;
  opacity?: number;
  fullscreen?: boolean;
  lock?: boolean;
}

// Avatar Component
export interface AvatarProps extends BaseComponentProps {
  src?: string;
  alt?: string;
  size?: 'small' | 'medium' | 'large' | number;
  shape?: 'circle' | 'square';
  icon?: string;
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  border?: boolean;
  borderColor?: string;
  loading?: boolean;
  error?: boolean;
  fallbackSrc?: string;
}

// Badge Component
export interface BadgeProps extends BaseComponentProps {
  value?: string | number;
  max?: number;
  dot?: boolean;
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  offset?: [number, number];
  hidden?: boolean;
  showZero?: boolean;
}

// Progress Component
export interface ProgressProps extends BaseComponentProps {
  value: number;
  max?: number;
  type?: 'line' | 'circle' | 'dashboard';
  status?: 'active' | 'success' | 'exception' | 'warning';
  color?: string | string[] | ((percentage: number) => string);
  textInside?: boolean;
  strokeWidth?: number;
  showText?: boolean;
  format?: (percentage: number) => string;
  width?: number;
  indeterminate?: boolean;
}

// DatePicker Component
export interface DatePickerProps extends BaseComponentProps {
  modelValue: Date | Date[] | null;
  type?: 'date' | 'dates' | 'week' | 'month' | 'year' | 'daterange' | 'datetime' | 'datetimerange';
  format?: string;
  valueFormat?: string;
  placeholder?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  editable?: boolean;
  size?: 'small' | 'medium' | 'large';
  popperClass?: string;
  rangeSeparator?: string;
  defaultValue?: Date | Date[];
  defaultTime?: Date | Date[];
  name?: string;
  unlinkPanels?: boolean;
  prefixIcon?: string;
  clearIcon?: string;
  validateEvent?: boolean;
  disabledDate?: (date: Date) => boolean;
  shortcuts?: Array<{
    text: string;
    value: Date | Date[] | (() => Date | Date[]);
  }>;
}

// Slider Component
export interface SliderProps extends BaseComponentProps {
  modelValue: number | number[];
  min?: number;
  max?: number;
  step?: number;
  showInput?: boolean;
  showStops?: boolean;
  showTooltip?: boolean;
  formatTooltip?: (value: number) => string;
  range?: boolean;
  vertical?: boolean;
  height?: string;
  label?: string;
  disabled?: boolean;
  marks?: Record<number, string | { style?: Record<string, any>; label?: string }>;
  debounce?: number;
  tooltipClass?: string;
  inputSize?: 'small' | 'medium' | 'large';
}

// Upload Component
export interface UploadProps extends BaseComponentProps {
  modelValue?: File[];
  action?: string;
  headers?: Record<string, string>;
  multiple?: boolean;
  data?: Record<string, any>;
  name?: string;
  withCredentials?: boolean;
  showFileList?: boolean;
  drag?: boolean;
  accept?: string;
  onPreview?: (file: File) => void;
  onRemove?: (file: File, fileList: File[]) => void;
  onSuccess?: (response: any, file: File, fileList: File[]) => void;
  onError?: (error: Error, file: File, fileList: File[]) => void;
  onProgress?: (event: ProgressEvent, file: File, fileList: File[]) => void;
  onChange?: (file: File, fileList: File[]) => void;
  beforeUpload?: (file: File) => boolean | Promise<File | Blob | boolean>;
  beforeRemove?: (file: File, fileList: File[]) => boolean | Promise<boolean>;
  fileList?: File[];
  listType?: 'text' | 'picture' | 'picture-card';
  autoUpload?: boolean;
  httpRequest?: (options: any) => void;
  disabled?: boolean;
  limit?: number;
  onExceed?: (files: File[], fileList: File[]) => void;
}

// Pagination Component
export interface PaginationProps extends BaseComponentProps {
  modelValue: number;
  pageSize?: number;
  total: number;
  pageCount?: number;
  pagerCount?: number;
  layout?: string;
  pageSizes?: number[];
  popperClass?: string;
  prevText?: string;
  nextText?: string;
  background?: boolean;
  disabled?: boolean;
  hideOnSinglePage?: boolean;
}

// Tree Component
export interface TreeNode<T = any> {
  key: string | number;
  label: string;
  data?: T;
  children?: TreeNode<T>[];
  disabled?: boolean;
  isLeaf?: boolean;
  icon?: string;
  expandable?: boolean;
  selectable?: boolean;
  checkable?: boolean;
  draggable?: boolean;
  droppable?: boolean;
}

export interface TreeProps<T = any> extends BaseComponentProps {
  data: TreeNode<T>[];
  modelValue?: (string | number)[];
  nodeKey?: string;
  props?: {
    label?: string;
    children?: string;
    disabled?: string;
    isLeaf?: string;
  };
  renderLabel?: (node: TreeNode<T>) => VNode;
  lazy?: boolean;
  load?: (node: TreeNode<T>, resolve: (data: TreeNode<T>[]) => void) => void;
  accordion?: boolean;
  checkable?: boolean;
  checkStrictly?: boolean;
  defaultCheckedKeys?: (string | number)[];
  defaultExpandedKeys?: (string | number)[];
  defaultExpandAll?: boolean;
  expandOnClickNode?: boolean;
  checkOnClickNode?: boolean;
  autoExpandParent?: boolean;
  filterNodeMethod?: (value: string, data: TreeNode<T>, node: any) => boolean;
  emptyText?: string;
  draggable?: boolean;
  allowDrag?: (node: TreeNode<T>) => boolean;
  allowDrop?: (draggingNode: TreeNode<T>, dropNode: TreeNode<T>, type: 'prev' | 'inner' | 'next') => boolean;
}