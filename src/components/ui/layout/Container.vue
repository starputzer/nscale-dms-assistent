<template>
  <div class="n-container" :class="classes">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

/**
 * Container component for layout with optional maximum width constraints
 * @displayName Container
 * @example
 * <Container size="lg" fluid>
 *   Container content
 * </Container>
 */
export interface ContainerProps {
  /** Container size variant */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** Whether the container is fluid (full width) */
  fluid?: boolean;
  /** Additional padding control */
  padding?: boolean | "sm" | "md" | "lg" | "none";
}

const props = withDefaults(defineProps<ContainerProps>(), {
  size: "lg",
  fluid: false,
  padding: true,
});

// Compute container classes based on props
const classes = computed(() => {
  const paddingClass =
    typeof props.padding === "boolean"
      ? props.padding
        ? "n-container--padded"
        : "n-container--no-padding"
      : `n-container--padding-${props.padding}`;

  return [
    `n-container--${props.size}`,
    props.fluid && "n-container--fluid",
    paddingClass,
  ];
});
</script>

<style>
.n-container {
  width: 100%;
  margin-right: auto;
  margin-left: auto;
  box-sizing: border-box;
}

/* Base padding */
.n-container--padded {
  padding-left: var(--nscale-space-4, 1rem);
  padding-right: var(--nscale-space-4, 1rem);
}

/* Padding variants */
.n-container--padding-sm {
  padding-left: var(--nscale-space-2, 0.5rem);
  padding-right: var(--nscale-space-2, 0.5rem);
}

.n-container--padding-md {
  padding-left: var(--nscale-space-4, 1rem);
  padding-right: var(--nscale-space-4, 1rem);
}

.n-container--padding-lg {
  padding-left: var(--nscale-space-6, 1.5rem);
  padding-right: var(--nscale-space-6, 1.5rem);
}

.n-container--padding-none {
  padding-left: 0;
  padding-right: 0;
}

/* Container sizes */
.n-container--sm:not(.n-container--fluid) {
  max-width: 640px;
}

.n-container--md:not(.n-container--fluid) {
  max-width: 768px;
}

.n-container--lg:not(.n-container--fluid) {
  max-width: 1024px;
}

.n-container--xl:not(.n-container--fluid) {
  max-width: 1280px;
}

.n-container--full {
  max-width: 100%;
}

/* Responsive adjustments */
@media (min-width: 640px) {
  .n-container--padded,
  .n-container--padding-md {
    padding-left: var(--nscale-space-5, 1.25rem);
    padding-right: var(--nscale-space-5, 1.25rem);
  }

  .n-container--padding-lg {
    padding-left: var(--nscale-space-8, 2rem);
    padding-right: var(--nscale-space-8, 2rem);
  }
}

@media (min-width: 1024px) {
  .n-container--padded,
  .n-container--padding-md {
    padding-left: var(--nscale-space-6, 1.5rem);
    padding-right: var(--nscale-space-6, 1.5rem);
  }

  .n-container--padding-lg {
    padding-left: var(--nscale-space-10, 2.5rem);
    padding-right: var(--nscale-space-10, 2.5rem);
  }
}
</style>
