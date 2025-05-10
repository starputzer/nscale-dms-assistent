<template>
  <footer
    class="n-footer"
    :class="{
      'n-footer--sticky': sticky,
      'n-footer--elevated': elevated,
      'n-footer--fixed': fixed,
      'n-footer--bordered': bordered,
      [`n-footer--size-${size}`]: true,
      [`n-footer--variant-${variant}`]: true
    }"
    :style="computedStyles"
  >
    <div class="n-footer__container" :class="{ 'n-footer__container--full-width': fullWidth }">
      <!-- Left Section -->
      <div class="n-footer__section n-footer__section--left">
        <slot name="left">
          <div class="n-footer__copyright" v-if="copyright">
            &copy; {{ copyright }} {{ currentYear }}
          </div>
          <div v-if="$slots.links" class="n-footer__links">
            <slot name="links"></slot>
          </div>
        </slot>
      </div>

      <!-- Middle Section -->
      <div class="n-footer__section n-footer__section--middle">
        <slot></slot>
      </div>

      <!-- Right Section -->
      <div class="n-footer__section n-footer__section--right">
        <slot name="right">
          <div v-if="showVersion && version" class="n-footer__version">
            <span>{{ versionPrefix }} {{ version }}</span>
          </div>
        </slot>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useUIStore } from '../../stores/ui';

/**
 * Footer-Komponente für den nscale DMS Assistenten
 * Bietet einen flexiblen Footer mit verschiedenen Bereichen und Darstellungsoptionen
 * @displayName Footer
 */
export interface FooterProps {
  /** Copyright-Text (ohne Jahr) */
  copyright?: string;
  /** Versionsnummer */
  version?: string;
  /** Präfix für die Versionsnummer */
  versionPrefix?: string;
  /** Ob die Versionsnummer angezeigt werden soll */
  showVersion?: boolean;
  /** Ob der Footer sticky sein soll (am unteren Bildschirmrand fixiert) */
  sticky?: boolean;
  /** Ob der Footer erhöht (mit Schatten) sein soll */
  elevated?: boolean;
  /** Ob der Footer fixiert sein soll (unabhängig vom Scroll-Status) */
  fixed?: boolean;
  /** Ob der Footer eine Umrandung haben soll */
  bordered?: boolean;
  /** Größe des Footers */
  size?: 'small' | 'medium' | 'large';
  /** Variante des Footers */
  variant?: 'default' | 'minimal' | 'compact' | 'dark' | 'primary';
  /** Ob der Footer die volle Breite einnehmen soll */
  fullWidth?: boolean;
  /** Benutzerdefinierte Höhe des Footers */
  height?: string;
  /** Benutzerdefinierte CSS-Variablen */
  customCssVars?: Record<string, string>;
  /** Responsive Verhalten für Mobilgeräte */
  stackOnMobile?: boolean;
}

const props = withDefaults(defineProps<FooterProps>(), {
  versionPrefix: 'Version',
  showVersion: true,
  sticky: false,
  elevated: false,
  fixed: false,
  bordered: true,
  size: 'medium',
  variant: 'default',
  fullWidth: false,
  stackOnMobile: true
});

// UI Store für globale UI-Zustände
const uiStore = useUIStore();

// Reaktive Zustände
const currentYear = ref(new Date().getFullYear());

// Berechnete Styles für den Footer
const computedStyles = computed(() => {
  const styles: Record<string, string> = {};
  
  // Benutzerdefinierte Höhe
  if (props.height) {
    styles['--n-footer-height'] = props.height;
  }
  
  // Benutzerdefinierte CSS-Variablen
  if (props.customCssVars) {
    Object.entries(props.customCssVars).forEach(([key, value]) => {
      styles[key] = value;
    });
  }
  
  return styles;
});

// Funktionen für externe Verwendung
defineExpose({
  // Keine speziellen Funktionen
});
</script>

<style scoped>
.n-footer {
  background-color: var(--n-footer-background-color, var(--n-background-color, #f5f7fa));
  color: var(--n-footer-text-color, var(--n-text-color, #2d3748));
  position: relative;
  width: 100%;
  transition: box-shadow 0.3s ease, background-color 0.3s ease;
}

/* Container für den Inhalt */
.n-footer__container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: var(--n-content-max-width, 1200px);
  margin: 0 auto;
  padding: 0 var(--n-footer-padding-x, 16px);
}

.n-footer__container--full-width {
  max-width: 100%;
}

/* Footer-Sektionen */
.n-footer__section {
  display: flex;
  align-items: center;
}

.n-footer__section--left {
  justify-content: flex-start;
  margin-right: auto;
}

.n-footer__section--middle {
  justify-content: center;
  flex: 1;
  text-align: center;
}

.n-footer__section--right {
  justify-content: flex-end;
  margin-left: auto;
}

/* Varianten */
.n-footer--variant-default {
  /* Standard ist bereits oben definiert */
}

.n-footer--variant-minimal {
  background-color: transparent;
  border-top: none;
}

.n-footer--variant-compact .n-footer__container {
  padding: 0 8px;
}

.n-footer--variant-dark {
  background-color: var(--n-footer-dark-background-color, var(--n-dark-background-color, #1a202c));
  color: var(--n-footer-dark-text-color, var(--n-dark-text-color, #f7fafc));
}

.n-footer--variant-primary {
  background-color: var(--n-primary-color, #3182ce);
  color: white;
}

/* Größen */
.n-footer--size-small {
  height: var(--n-footer-height-small, 32px);
  font-size: var(--n-footer-font-size-small, 0.75rem);
}

.n-footer--size-medium {
  height: var(--n-footer-height-medium, 48px);
  font-size: var(--n-footer-font-size-medium, 0.875rem);
}

.n-footer--size-large {
  height: var(--n-footer-height-large, 64px);
  font-size: var(--n-footer-font-size-large, 1rem);
}

/* Sticky Footer */
.n-footer--sticky {
  position: sticky;
  bottom: 0;
  z-index: 10;
}

/* Fixed Footer */
.n-footer--fixed {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99;
}

/* Elevated Footer */
.n-footer--elevated {
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}

/* Bordered Footer */
.n-footer--bordered {
  border-top: 1px solid var(--n-border-color, #e2e8f0);
}

/* Copyright Text */
.n-footer__copyright {
  font-size: inherit;
  color: inherit;
}

/* Version Text */
.n-footer__version {
  font-size: inherit;
  color: var(--n-footer-version-color, var(--n-text-secondary-color, #718096));
  opacity: 0.8;
}

/* Footer Links */
.n-footer__links {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: 16px;
}

.n-footer__links a {
  color: var(--n-footer-link-color, var(--n-primary-color, #3182ce));
  text-decoration: none;
  transition: color 0.2s ease;
}

.n-footer__links a:hover {
  color: var(--n-footer-link-hover-color, var(--n-primary-color-dark, #2c5282));
  text-decoration: underline;
}

/* Responsive Design */
@media (max-width: 768px) {
  .n-footer__container[data-stack-on-mobile="true"] {
    flex-direction: column;
    padding: 12px 16px;
    gap: 8px;
    height: auto;
  }
  
  .n-footer__container[data-stack-on-mobile="true"] .n-footer__section {
    width: 100%;
    justify-content: center;
    margin: 0;
  }
  
  .n-footer__container[data-stack-on-mobile="true"] .n-footer__section--left {
    order: 1;
  }
  
  .n-footer__container[data-stack-on-mobile="true"] .n-footer__section--middle {
    order: 2;
  }
  
  .n-footer__container[data-stack-on-mobile="true"] .n-footer__section--right {
    order: 3;
  }
  
  .n-footer__links {
    flex-wrap: wrap;
    justify-content: center;
    margin-left: 0;
    gap: 12px;
  }
  
  .n-footer--size-small,
  .n-footer--size-medium,
  .n-footer--size-large {
    height: auto;
  }
}

/* Reduced Motion für Barrierefreiheit */
@media (prefers-reduced-motion: reduce) {
  .n-footer {
    transition: none;
  }
}
</style>