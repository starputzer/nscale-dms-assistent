<template>
  <!-- This is an invisible, renderless component -->
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useMobileFocus } from '@/composables/useMobileFocus';

// Initialize the focus manager
const { hasTouchCapability } = useMobileFocus();

onMounted(() => {
  // Add touch detection class to body for global styling
  if (hasTouchCapability.value) {
    document.body.classList.add('has-touch-capability');
  }
});

onUnmounted(() => {
  // Clean up by removing the class when component is unmounted
  document.body.classList.remove('has-touch-capability');
  document.body.classList.remove('using-touch');
  document.body.classList.remove('using-keyboard');
});
</script>