// Layout component types

export interface SidebarItem {
  id: string;
  label: string;
  icon?: string;
  route?: string;
  action?: () => void;
  children?: SidebarItem[];
  badge?: string | number;
  disabled?: boolean;
}

export interface MainLayoutProps {
  sidebarCollapsed?: boolean;
  showHeader?: boolean;
  showSidebar?: boolean;
  contentPadding?: boolean;
}

export interface SidebarProps {
  collapsed?: boolean;
  items: SidebarItem[];
  activeItemId?: string;
  width?: string;
  collapsedWidth?: string;
}

export interface HeaderProps {
  title?: string;
  showMenu?: boolean;
  showNotifications?: boolean;
  showProfile?: boolean;
  userName?: string;
  userAvatar?: string;
}

export interface Tab {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

export interface TabPanelProps {
  tabs: Tab[];
  modelValue: string;
}

export interface SplitPaneProps {
  split?: 'horizontal' | 'vertical';
  minSize?: number;
  maxSize?: number;
  defaultSize?: number;
  resizerWidth?: number;
}