<template>
  <fieldset class="admin-field-group">
    <legend v-if="title" class="admin-field-group__title">{{ title }}</legend>
    <div v-if="$slots.description" class="admin-field-group__description">
      <slot name="description"></slot>
    </div>
    <div class="admin-field-group__fields" :class="columnsClass">
      <slot></slot>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps({
  /**
   * The title of the field group (displayed as a legend)
   */
  title: {
    type: String,
    default: "",
  },
  /**
   * Number of columns to display in the field group (for grid layout)
   * Adjust automatically based on screen size
   */
  columns: {
    type: Number,
    default: 1,
    validator: (val: number) => val >= 1 && val <= 4,
  },
  /**
   * Whether to collapse margins between fields
   */
  compact: {
    type: Boolean,
    default: false,
  },
});

const columnsClass = computed(() => {
  return props.columns > 1
    ? `admin-field-group__fields--columns-${props.columns}`
    : "";
});
</script>

<style lang="scss">
.admin-field-group {
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 0.5rem;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  background-color: var(--card-bg, white);

  &:last-child {
    margin-bottom: 0;
  }

  &__title {
    font-weight: 600;
    font-size: 0.9rem;
    padding: 0 0.5rem;
    color: var(--text-primary, #111827);
  }

  &__description {
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  &__fields {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;

    // Default field spacing
    & > * {
      margin-bottom: var(--field-spacing, 1rem);
    }

    & > *:last-child {
      margin-bottom: 0;
    }

    // Optional grid layout for multi-column forms
    &--columns-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
    }

    &--columns-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
    }

    &--columns-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
    }
  }

  // Compact mode reduces gaps between fields
  &.compact {
    .admin-field-group__fields {
      gap: 0.75rem;

      & > * {
        margin-bottom: 0.5rem;
      }
    }
  }

  /* Responsive adjustments */
  @media (max-width: 1024px) {
    .admin-field-group__fields--columns-4 {
      grid-template-columns: repeat(2, 1fr);
    }

    .admin-field-group__fields--columns-3 {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    padding: 1rem;

    .admin-field-group__fields--columns-2,
    .admin-field-group__fields--columns-3,
    .admin-field-group__fields--columns-4 {
      grid-template-columns: 1fr;
    }
  }
}
</style>
