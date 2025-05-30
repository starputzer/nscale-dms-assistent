<template>
  <Toast
    :position="position"
    :offset="16"
    :limit="maxToasts"
    :z-index="9999"
    pause-on-hover
  />
</template>

<script setup lang="ts">
import Toast from "./Toast.vue";

/**
 * Toast-Container Props
 */
interface ToastContainerProps {
  /**
   * Position des Toast-Containers
   */
  position?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "bottom-center";

  /**
   * Maximale Anzahl gleichzeitiger Toasts
   */
  maxToasts?: number;
}

const props = withDefaults(defineProps<ToastContainerProps>(), {
  position: "bottom-right",
  maxToasts: 6,
});
</script>
