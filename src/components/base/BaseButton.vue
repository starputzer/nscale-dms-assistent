<template>
  <button
    class="base-button"
    :class="[
      `base-button--${variant}`,
      { 'base-button--block': block, 'base-button--disabled': disabled },
      sizeClass,
    ]"
    :disabled="disabled"
    :type="type"
    @click="$emit('click', $event)"
  >
    <i v-if="icon" :class="['base-button__icon', icon]"></i>
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "light"
    | "dark";
  size?: "sm" | "md" | "lg";
  block?: boolean;
  disabled?: boolean;
  icon?: string;
  type?: "button" | "submit" | "reset";
}

const props = withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "md",
  block: false,
  disabled: false,
  icon: undefined,
  type: "button",
});

defineEmits(["click"]);

const sizeClass = computed(() => {
  return `base-button--${props.size}`;
});
</script>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  text-align: center;
  white-space: nowrap;
  vertical-align: middle;
  cursor: pointer;
  user-select: none;
  border: 1px solid transparent;
  border-radius: 4px;
  transition: all 0.2s ease-in-out;
  outline: none;
}

.base-button--block {
  display: flex;
  width: 100%;
}

.base-button--disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.base-button__icon {
  margin-right: 0.5rem;
}

/* Size variants */
.base-button--sm {
  padding: 0.25rem 0.5rem;
  font-size: 12px;
  border-radius: 3px;
}

.base-button--md {
  padding: 0.5rem 1rem;
  font-size: 14px;
}

.base-button--lg {
  padding: 0.75rem 1.5rem;
  font-size: 16px;
}

/* Color variants */
.base-button--primary {
  background-color: var(--nscale-primary, #0078d4);
  color: white;
}

.base-button--primary:not(.base-button--disabled):hover {
  background-color: var(--nscale-primary-dark, #106ebe);
}

.base-button--secondary {
  background-color: var(--nscale-secondary, #6c757d);
  color: white;
}

.base-button--secondary:not(.base-button--disabled):hover {
  background-color: var(--nscale-secondary-dark, #5a6268);
}

.base-button--success {
  background-color: var(--nscale-success, #28a745);
  color: white;
}

.base-button--success:not(.base-button--disabled):hover {
  background-color: var(--nscale-success-dark, #218838);
}

.base-button--danger {
  background-color: var(--nscale-danger, #dc3545);
  color: white;
}

.base-button--danger:not(.base-button--disabled):hover {
  background-color: var(--nscale-danger-dark, #c82333);
}

.base-button--warning {
  background-color: var(--nscale-warning, #ffc107);
  color: #212529;
}

.base-button--warning:not(.base-button--disabled):hover {
  background-color: var(--nscale-warning-dark, #e0a800);
}

.base-button--info {
  background-color: var(--nscale-info, #17a2b8);
  color: white;
}

.base-button--info:not(.base-button--disabled):hover {
  background-color: var(--nscale-info-dark, #138496);
}

.base-button--light {
  background-color: var(--nscale-light, #f8f9fa);
  color: #212529;
  border: 1px solid #ddd;
}

.base-button--light:not(.base-button--disabled):hover {
  background-color: var(--nscale-light-dark, #e2e6ea);
}

.base-button--dark {
  background-color: var(--nscale-dark, #343a40);
  color: white;
}

.base-button--dark:not(.base-button--disabled):hover {
  background-color: var(--nscale-dark-dark, #23272b);
}
</style>
