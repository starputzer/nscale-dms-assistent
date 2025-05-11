/**
 * Layout-Komponenten für den nscale DMS Assistenten
 */

// Export aller Layout-Komponenten
export { default as MainLayout } from "./MainLayout.vue";
export { default as Sidebar } from "./Sidebar.vue";
export { default as Header } from "./Header.vue";
export { default as TabPanel } from "./TabPanel.vue";
export { default as SplitPane } from "./SplitPane.vue";

// Export der Typen aus den Komponenten
export type { MainLayoutProps, SidebarItem } from "./MainLayout.vue";
export type { SidebarProps } from "./Sidebar.vue";
export type { HeaderProps } from "./Header.vue";
export type { TabPanelProps, Tab } from "./TabPanel.vue";
export type { SplitPaneProps } from "./SplitPane.vue";
