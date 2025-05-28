<template>
  <div
    class="admin-card"
    :class="[
      `admin-card--${variant}`,
      elevated ? 'admin-card--elevated' : '',
      bordered ? 'admin-card--bordered' : '',
      padded ? 'admin-card--padded' : '',
      fullHeight ? 'admin-card--full-height' : '',
    ]"
  >
    <div v-if="$slots.header || title" class="admin-card__header">
      <h3 v-if="title" class="admin-card__title">{{ title }}</h3>
      <slot name="header"></slot>
      <div v-if="$slots.headerActions" class="admin-card__header-actions">
        <slot name="headerActions"></slot>
      </div>
    </div>

    <div class="admin-card__body">
      <slot></slot>
    </div>

    <div v-if="$slots.footer" class="admin-card__footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  /**
   * Card title to be displayed in header
   */
  title: {
    type: String,
    default: "",
  },
  /**
   * Apply styling variant
   * @values default, primary, success, warning, danger
   */
  variant: {
    type: String,
    default: "default",
    validator: (value: string) => {
      return ["default", "primary", "success", "warning", "danger"].includes(
        value,
      );
    },
  },
  /**
   * Apply subtle shadow for elevated appearance
   */
  elevated: {
    type: Boolean,
    default: true,
  },
  /**
   * Apply borders around the card
   */
  bordered: {
    type: Boolean,
    default: false,
  },
  /**
   * Apply default padding to card content
   */
  padded: {
    type: Boolean,
    default: true,
  },
  /**
   * Make the card take full height of parent container
   */
  fullHeight: {
    type: Boolean,
    default: false,
  },
});
</script>

<style lang="scss">
.admin-card {
  background-color: var(--n-color-background-alt, #ffffff);
  border-radius: var(--n-border-radius, 8px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;

  // Variants
  &--primary {
    border-left: 4px solid var(--n-color-primary, #0078d4);
  }

  &--success {
    border-left: 4px solid var(--n-color-success, #16a34a);
  }

  &--warning {
    border-left: 4px solid var(--n-color-warning, #f59e0b);
  }

  &--danger {
    border-left: 4px solid var(--n-color-error, #dc2626);
  }

  // Modifiers
  &--elevated {
    box-shadow: var(--n-shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.1));

    &:hover {
      box-shadow: var(--n-shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
    }
  }

  &--bordered {
    border: 1px solid var(--n-color-border, #e5e7eb);
  }

  &--padded {
    .admin-card__body {
      padding: 1.25rem;
    }
  }

  &--full-height {
    height: 100%;
  }

  // Header
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--n-color-border, #e5e7eb);
  }

  &__title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--n-color-text-primary, #111827);
  }

  &__header-actions {
    display: flex;
    gap: 0.5rem;
  }

  // Body
  &__body {
    flex: 1;
  }

  // Footer
  &__footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--n-color-border, #e5e7eb);
    background-color: rgba(0, 0, 0, 0.02);
  }

  // Responsive adjustments
  @media (max-width: 768px) {
    &__header,
    &__footer {
      padding: 0.75rem 1rem;
    }

    &--padded .admin-card__body {
      padding: 1rem;
    }
  }
}
</style>
