<template>
  <component :is="currentLayout">
    <router-view />
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import GuestLayout from "./GuestLayout.vue";
import AuthLayout from "./AuthLayout.vue";

const route = useRoute();

// Determine which layout to use based on the route
const currentLayout = computed(() => {
  // Use GuestLayout for login and other auth pages
  if (
    route.path.startsWith("/login") ||
    route.path.startsWith("/register") ||
    route.path.startsWith("/forgot-password") ||
    route.path.startsWith("/reset-password")
  ) {
    return GuestLayout;
  }

  // Use AuthLayout for all other pages
  return AuthLayout;
});
</script>
