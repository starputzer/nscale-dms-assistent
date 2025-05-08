<template>
  <div 
    class="n-header"
    :class="{ 
      'n-header--fixed': fixed,
      'n-header--bordered': bordered,
      'n-header--elevated': elevated,
      [`n-header--${size}`]: true
    }"
    :style="{ height: `${height}px` }"
  >
    <div class="n-header__left">
      <button 
        v-if="showToggleButton"
        class="n-header__toggle-btn"
        @click="handleToggleClick"
        aria-label="Toggle sidebar"
        type="button"
      >
        <svg 
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          width="24"
          height="24"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      
      <div class="n-header__logo">
        <slot name="logo">
          <div v-if="logo" class="n-header__logo-image">
            <img :src="logo" :alt="logoAlt || title" />
          </div>
        </slot>
      </div>
      
      <h1 v-if="title && showTitle" class="n-header__title">
        <slot name="title">{{ title }}</slot>
      </h1>
    </div>
    
    <div class="n-header__center">
      <slot name="center"></slot>
    </div>
    
    <div class="n-header__right">
      <slot name="right">
        <div class="n-header__actions">
          <div v-if="$slots.notifications" class="n-header__notifications">
            <slot name="notifications"></slot>
          </div>
          
          <div v-if="$slots.user" class="n-header__user">
            <slot name="user"></slot>
          </div>
          
          <div v-else-if="user" class="n-header__user-menu">
            <button 
              class="n-header__user-button"
              @click="toggleUserMenu"
              type="button"
              aria-expanded="false"
              aria-haspopup="true"
            >
              <div v-if="user.avatar" class="n-header__user-avatar">
                <img :src="user.avatar" :alt="user.name || 'User'" />
              </div>
              <div v-else class="n-header__user-avatar n-header__user-avatar--placeholder">
                {{ getUserInitials(user.name) }}
              </div>
              <span v-if="size !== 'small'" class="n-header__user-name">{{ user.name }}</span>
              <svg class="n-header__user-arrow" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue';

/**
 * Header-Komponente für den nscale DMS Assistenten
 * Bietet einen flexiblen Header mit Logo, Titel und Aktionselementen.
 * @displayName Header
 */
export interface HeaderProps {
  /** Titel des Headers */
  title?: string;
  /** Logo-URL */
  logo?: string;
  /** Alt-Text für das Logo */
  logoAlt?: string;
  /** Ob der Header fixiert sein soll */
  fixed?: boolean;
  /** Ob der Header einen Rahmen haben soll */
  bordered?: boolean;
  /** Ob der Header erhöht (mit Schatten) sein soll */
  elevated?: boolean;
  /** Größe des Headers */
  size?: 'small' | 'medium' | 'large';
  /** Benutzerdefinierte Höhe des Headers in Pixeln */
  height?: number;
  /** Ob der Titel angezeigt werden soll */
  showTitle?: boolean;
  /** Ob der Toggle-Button für die Sidebar angezeigt werden soll */
  showToggleButton?: boolean;
  /** Benutzerinformationen */
  user?: {
    name?: string;
    avatar?: string;
    email?: string;
  };
}

const props = withDefaults(defineProps<HeaderProps>(), {
  title: 'nscale DMS Assistent',
  fixed: false,
  bordered: true,
  elevated: false,
  size: 'medium',
  showTitle: true,
  showToggleButton: true
});

const emit = defineEmits<{
  /** Wird ausgelöst, wenn auf den Toggle-Button geklickt wird */
  (e: 'toggle-sidebar'): void;
  /** Wird ausgelöst, wenn auf das Benutzermenü geklickt wird */
  (e: 'toggle-user-menu'): void;
}>();

// Layout-Kontext von der übergeordneten Komponente (falls vorhanden)
const layoutContext = inject('layout', null);

// Berechnete Höhe basierend auf Größe und benutzerdefinierter Höhe
const computedHeight = computed(() => {
  if (props.height) return props.height;
  
  switch (props.size) {
    case 'small': return 48;
    case 'large': return 72;
    default: return 64;
  }
});

/**
 * Behandelt Klicks auf den Toggle-Button
 */
function handleToggleClick() {
  emit('toggle-sidebar');
  
  // Falls layoutContext vorhanden ist, aktualisiere den Zustand dort
  if (layoutContext && typeof layoutContext.toggleSidebar === 'function') {
    layoutContext.toggleSidebar();
  }
}

/**
 * Schaltet das Benutzermenü um
 */
function toggleUserMenu() {
  emit('toggle-user-menu');
}

/**
 * Gibt die Initialen eines Benutzernamens zurück
 * @param name Der Benutzername
 */
function getUserInitials(name?: string): string {
  if (!name) return 'U';
  
  return name
    .split(' ')
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
}
</script>

<style scoped>
.n-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background-color: var(--n-header-background-color, var(--n-background-color, #f5f7fa));
  color: var(--n-header-text-color, var(--n-text-color, #2d3748));
  padding: 0 16px;
  transition: box-shadow 0.3s ease, background-color 0.3s ease, color 0.3s ease;
  z-index: var(--n-header-z-index, 10);
}

.n-header--fixed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
}

.n-header--bordered {
  border-bottom: 1px solid var(--n-border-color, #e2e8f0);
}

.n-header--elevated {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.n-header--small {
  min-height: 48px;
}

.n-header--medium {
  min-height: 64px;
}

.n-header--large {
  min-height: 72px;
}

.n-header__left,
.n-header__center,
.n-header__right {
  display: flex;
  align-items: center;
}

.n-header__left {
  flex: 1;
  min-width: 0;
}

.n-header__center {
  flex: 2;
  justify-content: center;
}

.n-header__right {
  flex: 1;
  justify-content: flex-end;
}

.n-header__toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--n-border-radius, 4px);
  cursor: pointer;
  margin-right: 16px;
  transition: background-color 0.2s ease;
  color: var(--n-header-icon-color, var(--n-text-color, #2d3748));
}

.n-header__toggle-btn:hover {
  background-color: var(--n-header-hover-color, rgba(0, 0, 0, 0.05));
}

.n-header__toggle-btn:focus-visible {
  outline: 2px solid var(--n-focus-color, #3182ce);
  outline-offset: 1px;
}

.n-header__logo {
  display: flex;
  align-items: center;
  margin-right: 16px;
}

.n-header__logo-image {
  height: 32px;
  width: auto;
  max-width: 120px;
}

.n-header__logo-image img {
  height: 100%;
  width: auto;
  object-fit: contain;
}

.n-header__title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  padding: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.n-header--small .n-header__title {
  font-size: 1.125rem;
}

.n-header--large .n-header__title {
  font-size: 1.375rem;
}

.n-header__actions {
  display: flex;
  align-items: center;
}

.n-header__notifications {
  margin-right: 16px;
}

.n-header__user,
.n-header__user-menu {
  position: relative;
}

.n-header__user-button {
  display: flex;
  align-items: center;
  background: transparent;
  border: none;
  padding: 8px;
  border-radius: var(--n-border-radius, 4px);
  cursor: pointer;
  color: var(--n-header-text-color, var(--n-text-color, #2d3748));
  transition: background-color 0.2s ease;
}

.n-header__user-button:hover {
  background-color: var(--n-header-hover-color, rgba(0, 0, 0, 0.05));
}

.n-header__user-button:focus-visible {
  outline: 2px solid var(--n-focus-color, #3182ce);
  outline-offset: 1px;
}

.n-header__user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 8px;
}

.n-header__user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.n-header__user-avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--n-primary-color, #3182ce);
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.n-header__user-name {
  margin-right: 4px;
  font-weight: 500;
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.n-header__user-arrow {
  margin-left: 4px;
  flex-shrink: 0;
}

/* Responsive styles */
@media (max-width: 768px) {
  .n-header {
    padding: 0 12px;
  }
  
  .n-header__center {
    display: none;
  }
  
  .n-header__title {
    font-size: 1.125rem;
    max-width: 140px;
  }
  
  .n-header__logo-image {
    height: 28px;
    max-width: 80px;
  }
  
  .n-header__user-name {
    display: none;
  }
  
  .n-header__toggle-btn {
    margin-right: 12px;
    width: 36px;
    height: 36px;
  }
}

@media (max-width: 480px) {
  .n-header__title {
    max-width: 100px;
  }
}
</style>