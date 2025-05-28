<template>
  <div class="admin-view">
    <!-- Use simplified AdminPanel component for better error handling -->
    <AdminPanelSimplified :forceTab="currentTab" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

// Import simplified admin component with better error handling
import AdminPanelSimplified from "@/components/admin/AdminPanel.simplified.vue";

const route = useRoute();

// Get current tab from route
const currentTab = computed(() => {
  try {
    // Extract the tab from the route path
    const path = route.path;
    console.log("[AdminView] Current route path:", path);
    
    if (path === "/admin") return "dashboard";
    
    // Extract the last segment of the path (e.g., "/admin/dashboard" -> "dashboard")
    const segments = path.split('/');
    const lastSegment = segments[segments.length - 1];
    
    console.log("[AdminView] Detected tab from URL:", lastSegment);
    return lastSegment || "dashboard";
  } catch (error) {
    console.error("[AdminView] Error detecting tab from URL:", error);
    return "dashboard";
  }
});
</script>

<style lang="scss" scoped>
// Diese Komponente nutzt jetzt die konsolidierten Styles
@import "@/assets/styles/admin-consolidated.scss";

.admin-view {
  height: 100vh;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
