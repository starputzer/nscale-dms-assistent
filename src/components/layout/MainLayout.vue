<template>
  <div
    ref="layoutRef"
    class="n-main-layout"
    :class="{
      'n-main-layout--sidebar-collapsed': isSidebarCollapsed,
      'n-main-layout--sidebar-hidden': !showSidebar,
      'n-main-layout--footer-hidden': !showFooter,
      [`n-main-layout--${theme}`]: true,
      [`n-main-layout--grid-${gridLayout}`]: true,
      [`n-main-layout--content-width-${contentWidth}`]: true,
      'n-main-layout--has-sidebar-overlay': hasSidebarOverlay,
      'n-main-layout--mobile': isMobile,
    }"
    :style="customStyles"
  >
    <!-- Skip links for keyboard navigation -->
    <a id="skip-to-main-content" href="#main-content" class="skip-link">
      Zum Hauptinhalt springen
    </a>
    <a
      v-if="showSidebar"
      id="skip-to-navigation"
      href="#main-nav"
      class="skip-link"
    >
      Zur Navigation springen
    </a>
    <!-- Header -->
    <header
      v-if="showHeader"
      class="n-main-layout__header"
      :class="{
        'n-main-layout__header--sticky': stickyHeader,
        'n-main-layout__header--elevated': headerElevation,
        [`n-main-layout__header--${headerSize}`]: true,
      }"
    >
      <slot name="header">
        <Header
          :title="title"
          :show-toggle-button="showSidebar"
          :logo="logo"
          :logo-alt="logoAlt"
          :size="headerSize"
          :user="user"
          @toggle-sidebar="toggleSidebar"
        />
      </slot>
    </header>

    <div class="n-main-layout__body">
      <!-- Sidebar -->
      <aside
        v-if="showSidebar"
        class="n-main-layout__sidebar"
        :class="{
          'n-main-layout__sidebar--fixed': sidebarFixed,
          'n-main-layout__sidebar--elevated': sidebarElevation,
        }"
        role="navigation"
        aria-label="Hauptnavigation"
        id="main-nav"
      >
        <slot name="sidebar">
          <Sidebar
            :items="sidebarItems"
            :active-item-id="activeSidebarItemId"
            :title="sidebarTitle"
            :collapsed="isSidebarCollapsed"
            @toggle-collapse="setSidebarCollapsed"
            @select="handleSidebarItemSelect"
          />
        </slot>
      </aside>

      <!-- Sidebar Overlay für mobile Ansicht -->
      <div
        v-if="hasSidebarOverlay && showSidebar"
        class="n-main-layout__sidebar-overlay"
        @click="closeSidebarOnMobile"
      ></div>

      <!-- Main Content -->
      <main
        id="main-content"
        class="n-main-layout__content"
        :class="{
          'n-main-layout__content--has-padding': contentPadding,
          [`n-main-layout__content--align-${contentAlignment}`]: true,
          'n-main-layout__content--full-height': fullHeightContent,
        }"
        tabindex="-1"
        role="main"
        aria-label="Hauptinhalt"
      >
        <div
          class="n-main-layout__content-container"
          :class="{
            [`n-main-layout__content-container--width-${contentWidth}`]: true,
          }"
        >
          <slot></slot>
        </div>
      </main>
    </div>

    <!-- Footer -->
    <footer
      v-if="showFooter"
      class="n-main-layout__footer"
      :class="{
        'n-main-layout__footer--sticky': stickyFooter,
        'n-main-layout__footer--elevated': footerElevation,
      }"
      role="contentinfo"
      aria-label="Fußzeile"
    >
      <slot name="footer">
        <div class="n-main-layout__footer-content">
          <p>© {{ currentYear }} {{ footerText || title }}</p>
          <div v-if="showVersionInfo" class="n-main-layout__version-info">
            <span>Version {{ versionInfo }}</span>
          </div>
        </div>
      </slot>
    </footer>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  provide,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { useUIStore } from "../../stores/ui";
import Header from "./Header.vue";
import Sidebar from "./Sidebar.vue";

/**
 * Hauptlayout-Komponente für den nscale DMS Assistenten
 * Bietet eine vollständige Seitenlayout-Struktur mit Header, Sidebar, Content und Footer
 * @displayName MainLayout
 */
export interface MainLayoutProps {
  /** Titel der Anwendung */
  title?: string;
  /** Logo-URL */
  logo?: string;
  /** Alt-Text für das Logo */
  logoAlt?: string;
  /** Ob der Header angezeigt werden soll */
  showHeader?: boolean;
  /** Ob die Sidebar angezeigt werden soll */
  showSidebar?: boolean;
  /** Ob der Footer angezeigt werden soll */
  showFooter?: boolean;
  /** Navigationselemente für die Sidebar */
  sidebarItems?: SidebarItem[];
  /** Ob die Sidebar eingeklappt sein soll */
  sidebarCollapsed?: boolean;
  /** Theme der Anwendung */
  theme?: "light" | "dark" | "system";
  /** Ob der Header sticky (immer sichtbar beim Scrollen) sein soll */
  stickyHeader?: boolean;
  /** Ob der Footer sticky sein soll */
  stickyFooter?: boolean;
  /** Titel der Sidebar */
  sidebarTitle?: string;
  /** ID des aktiven Sidebar-Elements */
  activeSidebarItemId?: string;
  /** Grid-Layout der Anwendung */
  gridLayout?:
    | "default"
    | "sidebar-left"
    | "sidebar-right"
    | "full-width"
    | "centered";
  /** Breite des Content-Bereichs */
  contentWidth?: "narrow" | "medium" | "wide" | "full";
  /** Ob das Content-Panel Padding haben soll */
  contentPadding?: boolean;
  /** Ausrichtung des Contents */
  contentAlignment?: "left" | "center" | "right";
  /** Ob der Content die volle Höhe einnehmen soll */
  fullHeightContent?: boolean;
  /** Ob die Sidebar fixiert sein soll */
  sidebarFixed?: boolean;
  /** Benutzerdefinierte CSS-Variablen */
  customCssVars?: Record<string, string>;
  /** Benutzerinformationen für den Header */
  user?: {
    name?: string;
    avatar?: string;
    email?: string;
  };
  /** Größe des Headers */
  headerSize?: "small" | "medium" | "large";
  /** Ob der Header einen Schattenwurf haben soll */
  headerElevation?: boolean;
  /** Ob die Sidebar einen Schattenwurf haben soll */
  sidebarElevation?: boolean;
  /** Ob der Footer einen Schattenwurf haben soll */
  footerElevation?: boolean;
  /** Footer-Text */
  footerText?: string;
  /** Versionsnummer die im Footer angezeigt wird */
  versionInfo?: string;
  /** Ob die Versionsnummer angezeigt werden soll */
  showVersionInfo?: boolean;
}

export interface SidebarItem {
  /** Eindeutige ID des Menüpunkts */
  id: string;
  /** Anzeigename des Menüpunkts */
  label: string;
  /** Icon des Menüpunkts (optional) */
  icon?: string;
  /** Routenziel des Menüpunkts (optional) */
  route?: string;
  /** Untermenüpunkte (optional) */
  children?: SidebarItem[];
  /** Ob der Menüpunkt deaktiviert ist */
  disabled?: boolean;
  /** Ob der Menüpunkt aktuell aktiv ist */
  active?: boolean;
  /** Badge-Text oder -Zahl */
  badge?: string | number;
  /** Badge-Typ */
  badgeType?: "default" | "primary" | "success" | "warning" | "error";
  /** Berechtigungen, die für diesen Menüpunkt benötigt werden */
  permissions?: string[];
  /** Tooltip-Text */
  tooltip?: string;
}

const props = withDefaults(defineProps<MainLayoutProps>(), {
  title: "nscale DMS Assistent",
  showHeader: true,
  showSidebar: true,
  showFooter: true,
  sidebarItems: () => [],
  sidebarCollapsed: false,
  theme: "system",
  stickyHeader: false,
  stickyFooter: false,
  sidebarTitle: "Navigation",
  activeSidebarItemId: "",
  gridLayout: "default",
  contentWidth: "medium",
  contentPadding: true,
  contentAlignment: "left",
  fullHeightContent: false,
  sidebarFixed: false,
  headerSize: "medium",
  headerElevation: false,
  sidebarElevation: false,
  footerElevation: false,
  showVersionInfo: false,
});

const emit = defineEmits<{
  /** Wird ausgelöst, wenn sich der eingeklappte Zustand der Sidebar ändert */
  (e: "update:sidebarCollapsed", value: boolean): void;
  /** Wird ausgelöst, wenn die Sidebar umgeschaltet wird */
  (e: "sidebar-toggle", value: boolean): void;
  /** Wird ausgelöst, wenn ein Sidebar-Element ausgewählt wird */
  (e: "sidebar-item-select", id: string): void;
  /** Wird ausgelöst, wenn sich die Breite des Viewports ändert */
  (e: "viewport-change", isMobile: boolean): void;
}>();

// UI Store für globale UI-Zustände
const uiStore = useUIStore();

// Reaktive Zustände
const isSidebarCollapsed = ref(props.sidebarCollapsed);
const currentYear = computed(() => new Date().getFullYear());
const isMobile = ref(false);
const hasSidebarOverlay = ref(false);
const layoutRef = ref<HTMLElement | null>(null);

// Überwache Änderungen an der sidebarCollapsed-Prop
watch(
  () => props.sidebarCollapsed,
  (newValue) => {
    isSidebarCollapsed.value = newValue;
  },
);

// Überwache Änderungen am Viewport
watch(isMobile, (newValue) => {
  emit("viewport-change", newValue);

  // Bei mobiler Ansicht Sidebar-Overlay anzeigen
  hasSidebarOverlay.value =
    newValue && !isSidebarCollapsed.value && props.showSidebar;
});

// Überwache Änderungen an der Sidebar-Sichtbarkeit
watch(
  [() => props.showSidebar, isSidebarCollapsed],
  ([showSidebar, collapsed]) => {
    // Nur auf mobilen Geräten ein Overlay anzeigen
    hasSidebarOverlay.value = isMobile.value && showSidebar && !collapsed;
  },
);

// Benutzerdefinierte CSS-Variablen
const customStyles = computed(() => {
  const styles: Record<string, string> = {};

  // Standard-CSS-Variablen aus dem Theme
  if (props.theme === "dark") {
    styles["--n-background-color"] = "#1a202c";
    styles["--n-text-color"] = "#f7fafc";
    styles["--n-border-color"] = "#2d3748";
    styles["--n-text-secondary-color"] = "#a0aec0";
  } else if (props.theme === "light") {
    styles["--n-background-color"] = "#f5f7fa";
    styles["--n-text-color"] = "#2d3748";
    styles["--n-border-color"] = "#e2e8f0";
    styles["--n-text-secondary-color"] = "#718096";
  }

  // Benutzerdefinierte CSS-Variablen aus den Props
  if (props.customCssVars) {
    Object.entries(props.customCssVars).forEach(([key, value]) => {
      styles[key] = value;
    });
  }

  return styles;
});

// Methoden
/**
 * Schaltet den eingeklappten Zustand der Sidebar um
 */
function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  emit("update:sidebarCollapsed", isSidebarCollapsed.value);
  emit("sidebar-toggle", isSidebarCollapsed.value);

  // Bei mobiler Ansicht Overlay anzeigen/ausblenden
  if (isMobile.value) {
    hasSidebarOverlay.value = !isSidebarCollapsed.value && props.showSidebar;
  }
}

/**
 * Setzt den eingeklappten Zustand der Sidebar
 * @param value Der neue eingeklappte Zustand
 */
function setSidebarCollapsed(value: boolean) {
  isSidebarCollapsed.value = value;
  emit("update:sidebarCollapsed", value);
  emit("sidebar-toggle", value);

  // Bei mobiler Ansicht Overlay anzeigen/ausblenden
  if (isMobile.value) {
    hasSidebarOverlay.value = !value && props.showSidebar;
  }
}

/**
 * Behandelt die Auswahl eines Sidebar-Elements
 * @param id Die ID des ausgewählten Elements
 */
function handleSidebarItemSelect(id: string) {
  emit("sidebar-item-select", id);

  // Auf mobilen Geräten die Sidebar nach Auswahl schließen
  if (isMobile.value) {
    nextTick(() => {
      isSidebarCollapsed.value = true;
      emit("update:sidebarCollapsed", true);
      hasSidebarOverlay.value = false;
    });
  }
}

/**
 * Schließt die Sidebar auf mobilen Geräten
 */
function closeSidebarOnMobile() {
  if (isMobile.value) {
    isSidebarCollapsed.value = true;
    emit("update:sidebarCollapsed", true);
    hasSidebarOverlay.value = false;
  }
}

/**
 * Prüft, ob das Gerät mobil ist
 */
function checkIfMobile() {
  if (window.matchMedia) {
    isMobile.value = window.matchMedia("(max-width: 768px)").matches;
  } else {
    isMobile.value = window.innerWidth < 768;
  }
}

/**
 * Überwacht Änderungen an der Fenstergröße
 */
function handleResize() {
  checkIfMobile();
}

// Lifecycle Hooks
onMounted(() => {
  checkIfMobile();
  window.addEventListener("resize", handleResize);

  // Layout-Element in den UI-Store einhängen für globalen Zugriff
  if (layoutRef.value) {
    uiStore.registerLayoutElement(layoutRef.value);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);

  // Layout-Element aus dem UI-Store entfernen
  uiStore.unregisterLayoutElement();
});

// Bereitstellen des Layout-Kontexts für Kindkomponenten
provide("layout", {
  isSidebarCollapsed,
  isMobile,
  showSidebar: computed(() => props.showSidebar),
  showHeader: computed(() => props.showHeader),
  showFooter: computed(() => props.showFooter),
  theme: computed(() => props.theme),
  gridLayout: computed(() => props.gridLayout),
  contentWidth: computed(() => props.contentWidth),
  toggleSidebar,
  closeSidebarOnMobile,
});
</script>

<style scoped>
.n-main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background-color: var(--n-background-color, #f5f7fa);
  color: var(--n-text-color, #2d3748);
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
  position: relative;
}

.n-main-layout--dark {
  --n-background-color: #1a202c;
  --n-text-color: #f7fafc;
  --n-border-color: #2d3748;
  --n-text-secondary-color: #a0aec0;
}

.n-main-layout--light {
  --n-background-color: #f5f7fa;
  --n-text-color: #2d3748;
  --n-border-color: #e2e8f0;
  --n-text-secondary-color: #718096;
}

.n-main-layout--system {
  /* System-Theme: verwendet die Systemeinstellungen, wird durch Mediequeries implementiert */
}

/* Grid-Layout-Varianten */
.n-main-layout--grid-default {
  --n-content-max-width: 1200px;
  --n-content-min-width: 280px;
  --n-grid-columns: 1fr;
}

.n-main-layout--grid-sidebar-left {
  --n-content-max-width: 1200px;
  --n-content-min-width: 280px;
  --n-grid-columns: var(--n-sidebar-width, 256px) 1fr;
}

.n-main-layout--grid-sidebar-right {
  --n-content-max-width: 1200px;
  --n-content-min-width: 280px;
  --n-grid-columns: 1fr var(--n-sidebar-width, 256px);
}

.n-main-layout--grid-full-width {
  --n-content-max-width: 100%;
  --n-content-min-width: 100%;
  --n-grid-columns: 1fr;
}

.n-main-layout--grid-centered {
  --n-content-max-width: 800px;
  --n-content-min-width: 280px;
  --n-grid-columns: 1fr;
}

/* Content-Breite-Varianten */
.n-main-layout--content-width-narrow .n-main-layout__content-container {
  max-width: 800px;
}

.n-main-layout--content-width-medium .n-main-layout__content-container {
  max-width: 1200px;
}

.n-main-layout--content-width-wide .n-main-layout__content-container {
  max-width: 1600px;
}

.n-main-layout--content-width-full .n-main-layout__content-container {
  max-width: 100%;
  width: 100%;
}

.n-main-layout__body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.n-main-layout__header {
  flex-shrink: 0;
  height: var(--n-header-height, 64px);
  border-bottom: 1px solid var(--n-border-color, #e2e8f0);
  z-index: 10;
  background-color: var(
    --n-header-background-color,
    var(--n-background-color, #f5f7fa)
  );
  transition:
    box-shadow 0.3s ease,
    height 0.3s ease;
  width: 100%;
}

.n-main-layout__header--sticky {
  position: sticky;
  top: 0;
  z-index: 1000;
}

.n-main-layout__header--elevated {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.n-main-layout__header--small {
  height: var(--n-header-height-small, 48px);
}

.n-main-layout__header--medium {
  height: var(--n-header-height-medium, 64px);
}

.n-main-layout__header--large {
  height: var(--n-header-height-large, 72px);
}

.n-main-layout__sidebar {
  flex-shrink: 0;
  width: var(--n-sidebar-width, 256px);
  transition:
    width 0.3s ease,
    transform 0.3s ease,
    box-shadow 0.3s ease;
  border-right: 1px solid var(--n-border-color, #e2e8f0);
  overflow: hidden;
  z-index: 5;
  background-color: var(
    --n-sidebar-background-color,
    var(--n-background-color, #f5f7fa)
  );
  height: calc(100vh - var(--n-header-height, 64px));
}

.n-main-layout__sidebar--fixed {
  position: sticky;
  top: var(--n-header-height, 64px);
  height: calc(100vh - var(--n-header-height, 64px));
}

.n-main-layout__sidebar--elevated {
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
}

.n-main-layout--sidebar-collapsed .n-main-layout__sidebar {
  width: var(--n-sidebar-collapsed-width, 64px);
}

.n-main-layout--sidebar-hidden .n-main-layout__sidebar {
  display: none;
}

.n-main-layout__sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 4;
  display: none;
  animation: fadeIn 0.3s ease;
}

.n-main-layout--has-sidebar-overlay .n-main-layout__sidebar-overlay {
  display: block;
}

.n-main-layout__content {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  background-color: var(
    --n-content-background-color,
    var(--n-background-color, #f5f7fa)
  );
  min-height: 0;
}

.n-main-layout__content--has-padding {
  padding: var(--n-content-padding, 24px);
}

.n-main-layout__content--align-center {
  align-items: center;
}

.n-main-layout__content--align-right {
  align-items: flex-end;
}

.n-main-layout__content--full-height {
  height: 100%;
}

.n-main-layout__content-container {
  width: 100%;
  margin: 0 auto;
  flex: 1;
  min-width: var(--n-content-min-width, 280px);
}

.n-main-layout__content-container--width-narrow {
  max-width: var(--n-content-width-narrow, 800px);
}

.n-main-layout__content-container--width-medium {
  max-width: var(--n-content-width-medium, 1200px);
}

.n-main-layout__content-container--width-wide {
  max-width: var(--n-content-width-wide, 1600px);
}

.n-main-layout__content-container--width-full {
  max-width: 100%;
}

.n-main-layout__footer {
  flex-shrink: 0;
  height: var(--n-footer-height, 48px);
  border-top: 1px solid var(--n-border-color, #e2e8f0);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(
    --n-footer-background-color,
    var(--n-background-color, #f5f7fa)
  );
  transition: box-shadow 0.3s ease;
}

.n-main-layout__footer--sticky {
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.n-main-layout__footer--elevated {
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}

.n-main-layout--footer-hidden .n-main-layout__footer {
  display: none;
}

.n-main-layout__footer-content {
  padding: 0 16px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  color: var(--n-text-secondary-color, #718096);
}

.n-main-layout__version-info {
  font-size: 0.75rem;
  opacity: 0.8;
}

/* Animation für Sidebar-Overlay */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Responsive Anpassungen */
@media (max-width: 768px) {
  .n-main-layout--mobile .n-main-layout__sidebar {
    position: fixed;
    top: var(--n-header-height-mobile, 56px);
    bottom: 0;
    left: 0;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 20;
    background-color: var(--n-background-color, #f5f7fa);
    width: var(--n-sidebar-mobile-width, 80%);
    max-width: 300px;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
    height: calc(100% - var(--n-header-height-mobile, 56px));
  }

  .n-main-layout--mobile .n-main-layout__sidebar--fixed {
    position: fixed;
  }

  .n-main-layout--mobile:not(.n-main-layout--sidebar-collapsed)
    .n-main-layout__sidebar {
    transform: translateX(0);
  }

  .n-main-layout--mobile .n-main-layout__content {
    padding: var(--n-content-padding-mobile, 16px);
  }

  .n-main-layout--mobile .n-main-layout__header {
    height: var(--n-header-height-mobile, 56px);
  }

  .n-main-layout--mobile .n-main-layout__footer {
    height: var(--n-footer-height-mobile, 40px);
  }

  .n-main-layout--mobile .n-main-layout__content-container {
    max-width: 100%;
  }

  .n-main-layout--mobile .n-main-layout__footer-content {
    flex-direction: column;
    text-align: center;
  }

  .n-main-layout--mobile .n-main-layout__version-info {
    margin-top: 4px;
  }
}

/* Tablet-Ansicht Anpassungen */
@media (min-width: 769px) and (max-width: 1024px) {
  .n-main-layout__content {
    padding: var(--n-content-padding-tablet, 20px);
  }
}

/* Large Desktop Anpassungen */
@media (min-width: 1921px) {
  .n-main-layout__content-container {
    max-width: var(--n-content-max-width-xlarge, 1800px);
  }
}

/* Dark Mode Media Query für System-Theme */
@media (prefers-color-scheme: dark) {
  .n-main-layout--system {
    --n-background-color: #1a202c;
    --n-text-color: #f7fafc;
    --n-border-color: #2d3748;
    --n-text-secondary-color: #a0aec0;
  }
}

/* Reduced Motion für Barrierefreiheit */
@media (prefers-reduced-motion: reduce) {
  .n-main-layout,
  .n-main-layout__header,
  .n-main-layout__sidebar,
  .n-main-layout__sidebar-overlay {
    transition: none;
  }
}
</style>
