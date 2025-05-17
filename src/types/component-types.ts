/**
 * Komponentenspezifische Typdefinitionen für Vue-Komponenten
 * 
 * Diese Datei enthält Typdefinitionen für Komponenten-Props, Emits und Slots,
 * um die Entwicklung von Vue-Komponenten mit TypeScript zu erleichtern.
 */

import type { PropType, VNode, DefineComponent } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import type { ChatMessage, ChatSession, User } from './store-types';

// ====================
// Generische Komponententypen
// ====================

/**
 * Basistypen für Komponentenprops
 */
export interface BaseProps {
  id?: string;
  class?: string | string[] | Record<string, boolean>;
  style?: string | Record<string, string>;
}

/**
 * Buttonkomponente
 */
export interface ButtonProps extends BaseProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'text' | 'link' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  iconLeft?: string;
  iconRight?: string;
  block?: boolean;
  rounded?: boolean;
  to?: RouteLocationRaw;
}

/**
 * Inputkomponente
 */
export interface InputProps extends BaseProps {
  modelValue?: string | number;
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search';
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  error?: string;
  success?: string;
  size?: 'sm' | 'md' | 'lg';
  clearable?: boolean;
  prependIcon?: string;
  appendIcon?: string;
  maxlength?: number;
  autofocus?: boolean;
}

/**
 * Selectkomponente
 */
export interface SelectProps extends BaseProps {
  modelValue?: any;
  options: Array<{
    label: string;
    value: any;
    disabled?: boolean;
  }>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  multiple?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  loading?: boolean;
}

/**
 * Formkomponente
 */
export interface FormProps extends BaseProps {
  onSubmit?: () => void;
  disabled?: boolean;
  loading?: boolean;
  inline?: boolean;
  labelWidth?: string | number;
}

// ====================
// Spezifische Komponentenprops
// ====================

/**
 * Navigation
 */
export interface SidebarProps extends BaseProps {
  open?: boolean;
  width?: number;
  expanded?: boolean;
  items?: Array<{
    id: string;
    label: string;
    icon?: string;
    badge?: number | string;
    to?: RouteLocationRaw;
    action?: () => void;
    children?: Array<{
      id: string;
      label: string;
      to?: RouteLocationRaw;
      action?: () => void;
    }>;
  }>;
}

export interface AppHeaderProps extends BaseProps {
  title?: string;
  subtitle?: string;
  user?: User;
  hasNotifications?: boolean;
  hasSidebar?: boolean;
  sidebarOpen?: boolean;
  showSettingsButton?: boolean;
  showLogoutButton?: boolean;
  actions?: Array<{
    id: string;
    label: string;
    icon?: string;
    action?: () => void;
  }>;
}

/**
 * Chat-Komponenten
 */
export interface MessageListProps extends BaseProps {
  messages: ChatMessage[];
  session?: ChatSession;
  isStreaming?: boolean;
  isLoading?: boolean;
  showTypingIndicator?: boolean;
  showTimestamps?: boolean;
  showSenderAvatar?: boolean;
  messageAlignment?: 'alternate' | 'left' | 'right';
  compactMode?: boolean;
  enableHighlighting?: boolean;
  enableSourceReferences?: boolean;
}

export interface MessageInputProps extends BaseProps {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  isStreaming?: boolean;
  isLoading?: boolean;
  showAttachButton?: boolean;
  showEmojiButton?: boolean;
  sendOnEnter?: boolean;
  sendOnCtrlEnter?: boolean;
  maxLength?: number;
  showCharacterCount?: boolean;
}

export interface SessionListProps extends BaseProps {
  sessions: ChatSession[];
  currentSessionId?: string;
  loading?: boolean;
  selectable?: boolean;
  showCreateButton?: boolean;
  showDeleteButton?: boolean;
  showPinButton?: boolean;
  showTimestamps?: boolean;
  compactMode?: boolean;
  showSearch?: boolean;
  showEmptyState?: boolean;
  selectedSessionIds?: string[];
  multiSelect?: boolean;
}

export interface ChatViewProps extends BaseProps {
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  sessions: ChatSession[];
  isStreaming?: boolean;
  isLoading?: boolean;
  showSidebar?: boolean;
  sidebarWidth?: number;
  showEmptyState?: boolean;
}

/**
 * Admin-Komponenten
 */
export interface AdminPanelProps extends BaseProps {
  activeTab?: string;
  tabs?: Array<{
    id: string;
    label: string;
    icon?: string;
    badge?: number | string;
  }>;
  tabPosition?: 'top' | 'left';
}

export interface UserListProps extends BaseProps {
  users: User[];
  loading?: boolean;
  selectable?: boolean;
  showRoles?: boolean;
  showStatus?: boolean;
  showLastLogin?: boolean;
  showActions?: boolean;
  selectedUserIds?: string[];
  multiSelect?: boolean;
}

/**
 * UI-Komponenten
 */
export interface ModalProps extends BaseProps {
  open?: boolean;
  title?: string;
  closable?: boolean;
  fullscreen?: boolean;
  width?: string | number;
  height?: string | number;
  position?: 'center' | 'top' | 'right' | 'bottom' | 'left';
  overlayClose?: boolean;
}

export interface ToastProps extends BaseProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  duration?: number;
  closable?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top' | 'bottom';
  showProgress?: boolean;
}

// ====================
// Komponenten-Emit-Typen
// ====================

/**
 * Ereignistypen für Komponenten
 */
export type ButtonEmits = {
  click: [event: MouseEvent];
};

export type InputEmits = {
  'update:modelValue': [value: string | number];
  input: [value: string | number];
  change: [value: string | number];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
  clear: [];
};

export type SelectEmits = {
  'update:modelValue': [value: any];
  change: [value: any];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
  clear: [];
  search: [query: string];
};

export type FormEmits = {
  submit: [event: Event];
  reset: [];
};

export type SidebarEmits = {
  'update:open': [open: boolean];
  'update:width': [width: number];
  'item-click': [itemId: string];
};

export type MessageListEmits = {
  'message-click': [message: ChatMessage];
  'source-click': [source: any, message: ChatMessage];
  'load-more': [];
};

export type MessageInputEmits = {
  'update:value': [value: string];
  submit: [message: string];
  typing: [isTyping: boolean];
  attach: [];
};

export type SessionListEmits = {
  'session-click': [session: ChatSession];
  'new-session': [];
  'delete-session': [sessionId: string];
  'pin-session': [sessionId: string, pinned: boolean];
  'select-session': [sessionId: string, selected: boolean];
  'search': [query: string];
};

export type ChatViewEmits = {
  'new-session': [];
  'load-session': [sessionId: string];
  'delete-session': [sessionId: string];
  'send-message': [message: string];
};

export type ModalEmits = {
  'update:open': [open: boolean];
  close: [];
  afterClose: [];
  beforeClose: [done: () => void];
};

export type ToastEmits = {
  close: [];
  action: [actionId: string];
};

// ====================
// Slot-Props und Contexte
// ====================

/**
 * Slot-Props für verschiedene Komponenten
 */
export interface MessageSlotProps {
  message: ChatMessage;
  isLastMessage: boolean;
  isFirstUserMessage: boolean;
  isFirstAssistantMessage: boolean;
}

export interface SessionItemSlotProps {
  session: ChatSession;
  isActive: boolean;
  isSelected: boolean;
}

export interface TabSlotProps {
  tab: {
    id: string;
    label: string;
    icon?: string;
  };
  isActive: boolean;
  activate: () => void;
}

// ====================
// Factory-Funktion für typisierte Komponenten
// ====================

/**
 * Hilfs-Typ-Helfer für Vue-Komponenten mit Generics
 */
export type TypedComponent<Props = {}, Emits = {}, Slots = {}> = DefineComponent<
  Props extends Record<string, any> ? Props : {},
  {},
  {},
  {},
  {},
  {},
  {},
  Emits extends Record<string, any> ? Emits : {},
  string,
  never,
  {}
> & {
  __slots?: Slots;
};