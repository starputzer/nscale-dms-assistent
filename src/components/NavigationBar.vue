<template>
  <nav
    class="n-navigation-bar"
    :class="{
      'n-navigation-bar--condensed': condensed,
      'n-navigation-bar--bordered': bordered,
      'n-navigation-bar--elevated': elevated,
    }"
  >
    <div class="n-navigation-bar__left">
      <!-- Toggle Sidebar Button -->
      <button
        v-if="showSidebarToggle"
        class="n-navigation-bar__toggle-btn"
        type="button"
        aria-label="Toggle Sidebar"
        @click="onSidebarToggle"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <!-- Logo -->
      <div class="n-navigation-bar__logo">
        <slot name="logo">
          <img
            v-if="logo"
            :src="logo"
            :alt="logoAlt || title"
            class="n-navigation-bar__logo-img"
          />
          <template v-else>
            <img
              src="/assets/images/senmvku-logo.png"
              alt="nscale Logo"
              class="n-navigation-bar__logo-img"
            />
          </template>
        </slot>
      </div>

      <!-- Title -->
      <h1 v-if="showTitle && title" class="n-navigation-bar__title">
        <slot name="title">{{ title }}</slot>
      </h1>
    </div>

    <!-- Center Section -->
    <div class="n-navigation-bar__center">
      <slot name="center"></slot>
    </div>

    <!-- Right Section -->
    <div class="n-navigation-bar__right">
      <slot name="right">
        <!-- Actions -->
        <div class="n-navigation-bar__actions">
          <slot name="actions">
            <template v-if="isAuthenticated">
              <button
                class="n-navigation-bar__action-button n-navigation-bar__action-button--primary"
                @click="$emit('new-chat')"
                title="Neue Unterhaltung"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="n-navigation-bar__action-icon"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span class="n-navigation-bar__action-text"
                  >Neue Unterhaltung</span
                >
              </button>

              <button
                v-if="userRole === 'admin'"
                class="n-navigation-bar__action-button"
                @click="toggleAdminView"
                title="Administration"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="n-navigation-bar__action-icon"
                >
                  <circle cx="12" cy="12" r="3"></circle>
                  <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                  ></path>
                </svg>
                <span class="n-navigation-bar__action-text"
                  >Administration</span
                >
              </button>

              <button
                class="n-navigation-bar__action-button n-navigation-bar__action-button--icon-only"
                @click="toggleTheme"
                title="Theme wechseln"
              >
                <svg
                  v-if="isDarkTheme"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="n-navigation-bar__action-icon"
                >
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
                <svg
                  v-else
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="n-navigation-bar__action-icon"
                >
                  <path
                    d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                  ></path>
                </svg>
              </button>

              <button
                class="n-navigation-bar__action-button"
                @click="$emit('logout')"
                title="Abmelden"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="n-navigation-bar__action-icon"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span class="n-navigation-bar__action-text">Abmelden</span>
              </button>
            </template>
          </slot>
        </div>
      </slot>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useSettingsStore } from "../stores/settings";

export interface NavigationBarProps {
  /** Titel in der Navigationsleiste */
  title?: string;
  /** URL des Logos */
  logo?: string;
  /** Alt-Text des Logos */
  logoAlt?: string;
  /** Ob die Navigationsleiste in kondensierter Form angezeigt werden soll */
  condensed?: boolean;
  /** Ob die Navigationsleiste einen Rahmen haben soll */
  bordered?: boolean;
  /** Ob die Navigationsleiste erhöht (mit Schatten) sein soll */
  elevated?: boolean;
  /** Ob der Titel angezeigt werden soll */
  showTitle?: boolean;
  /** Ob der Sidebar-Toggle angezeigt werden soll */
  showSidebarToggle?: boolean;
  /** Ob der Nutzer authentifiziert ist */
  isAuthenticated?: boolean;
  /** Rolle des Nutzers */
  userRole?: string;
}

const props = withDefaults(defineProps<NavigationBarProps>(), {
  title: "nscale DMS Assistent",
  condensed: false,
  bordered: true,
  elevated: false,
  showTitle: true,
  showSidebarToggle: true,
  isAuthenticated: true,
  userRole: "",
});

const emit = defineEmits<{
  /** Wird ausgelöst, wenn der Sidebar-Toggle geklickt wird */
  (e: "sidebar-toggle"): void;
  /** Wird ausgelöst, wenn der Abmelden-Button geklickt wird */
  (e: "logout"): void;
  /** Wird ausgelöst, wenn eine neue Unterhaltung gestartet werden soll */
  (e: "new-chat"): void;
  /** Wird ausgelöst, wenn die Admin-Ansicht umgeschaltet werden soll */
  (e: "toggle-admin"): void;
}>();

// Store
const settingsStore = useSettingsStore();

// Computed properties
const isDarkTheme = computed(() => settingsStore.isDarkMode);

/**
 * Schaltet das Theme um
 */
function toggleTheme() {
  settingsStore.toggleDarkMode();
}

/**
 * Löst das Sidebar-Toggle-Event aus
 */
function onSidebarToggle() {
  emit("sidebar-toggle");
}

/**
 * Schaltet die Admin-Ansicht um
 */
function toggleAdminView() {
  if (props.userRole === "admin") {
    emit("toggle-admin");
  }
}
</script>

<style scoped>
.n-navigation-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--n-navigation-bar-height, 64px);
  padding: 0 var(--n-spacing-md, 16px);
  background-color: var(--n-navigation-bar-bg, var(--n-surface-color, #ffffff));
  color: var(--n-navigation-bar-color, var(--n-text-color-primary, #2d3748));
  width: 100%;
  box-sizing: border-box;
  z-index: var(--n-navigation-bar-z-index, 100);
  transition:
    height 0.3s ease,
    box-shadow 0.3s ease;
}

.n-navigation-bar--condensed {
  height: var(--n-navigation-bar-height-condensed, 48px);
}

.n-navigation-bar--bordered {
  border-bottom: 1px solid var(--n-border-color, #e2e8f0);
}

.n-navigation-bar--elevated {
  box-shadow: var(--n-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.1));
}

.n-navigation-bar__left,
.n-navigation-bar__center,
.n-navigation-bar__right {
  display: flex;
  align-items: center;
}

.n-navigation-bar__left {
  flex: 1;
  min-width: 0;
}

.n-navigation-bar__center {
  flex: 1;
  justify-content: center;
}

.n-navigation-bar__right {
  flex: 1;
  justify-content: flex-end;
  gap: var(--n-spacing-sm, 8px);
}

.n-navigation-bar__toggle-btn {
  background: transparent;
  border: none;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(
    --n-navigation-bar-icon-color,
    var(--n-text-color-primary, #2d3748)
  );
  border-radius: var(--n-border-radius-md, 4px);
  margin-right: var(--n-spacing-md, 16px);
  transition: background-color 0.2s ease;
}

.n-navigation-bar__toggle-btn:hover {
  background-color: var(--n-hover-color, rgba(0, 0, 0, 0.05));
}

.n-navigation-bar__toggle-btn:focus-visible {
  outline: 2px solid var(--n-focus-color, #3182ce);
  outline-offset: 1px;
}

.n-navigation-bar__toggle-btn svg {
  width: 24px;
  height: 24px;
}

.n-navigation-bar__logo {
  display: flex;
  align-items: center;
  margin-right: var(--n-spacing-md, 16px);
}

.n-navigation-bar__logo-img {
  height: 32px;
  max-width: 120px;
  object-fit: contain;
}

.n-navigation-bar__title {
  font-size: var(--n-font-size-lg, 1.25rem);
  font-weight: var(--n-font-weight-semibold, 600);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(
    --n-navigation-bar-title-color,
    var(--n-text-color-primary, #2d3748)
  );
}

.n-navigation-bar--condensed .n-navigation-bar__title {
  font-size: var(--n-font-size-md, 1rem);
}

.n-navigation-bar__actions {
  display: flex;
  align-items: center;
  gap: var(--n-spacing-sm, 8px);
}

.n-navigation-bar__action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--n-spacing-md, 16px);
  height: 36px;
  background-color: var(--n-button-bg, transparent);
  color: var(--n-button-color, var(--n-text-color-primary, #2d3748));
  border: 1px solid var(--n-border-color, #e2e8f0);
  border-radius: var(--n-border-radius-md, 4px);
  font-size: var(--n-font-size-sm, 0.875rem);
  font-weight: var(--n-font-weight-medium, 500);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.1s ease;
  white-space: nowrap;
}

.n-navigation-bar__action-button:hover {
  background-color: var(--n-button-hover-bg, rgba(0, 0, 0, 0.05));
}

.n-navigation-bar__action-button:active {
  transform: translateY(1px);
}

.n-navigation-bar__action-button:focus-visible {
  outline: 2px solid var(--n-focus-color, #3182ce);
  outline-offset: 1px;
}

.n-navigation-bar__action-button--primary {
  background-color: var(--n-primary-color, #0d7a40);
  color: white;
  border-color: transparent;
}

.n-navigation-bar__action-button--primary:hover {
  background-color: var(--n-primary-color-dark, #0a6032);
}

.n-navigation-bar__action-button--icon-only {
  width: 36px;
  padding: 0;
}

.n-navigation-bar__action-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.n-navigation-bar__action-text {
  margin-left: var(--n-spacing-xs, 4px);
}

/* Responsive Styles */
@media (max-width: 768px) {
  .n-navigation-bar {
    padding: 0 var(--n-spacing-sm, 8px);
  }

  .n-navigation-bar__title {
    max-width: 160px;
  }

  .n-navigation-bar__center {
    display: none;
  }

  .n-navigation-bar__action-text {
    display: none;
  }

  .n-navigation-bar__action-button {
    width: 36px;
    padding: 0;
  }
}

@media (max-width: 480px) {
  .n-navigation-bar__title {
    max-width: 100px;
  }

  .n-navigation-bar__toggle-btn {
    width: 36px;
    height: 36px;
    margin-right: var(--n-spacing-sm, 8px);
  }

  .n-navigation-bar__logo-img {
    height: 24px;
    max-width: 80px;
  }
}
</style>
