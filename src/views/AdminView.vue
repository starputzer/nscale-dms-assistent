<template>
  <div class="admin-view">
    <!-- Show Access Denied component if access is denied -->
    <AdminAccessDenied
      v-if="accessDenied"
      :errorCode="errorCode"
      :customMessage="errorMessage"
    />

    <!-- Use AdminPanel component directly instead of showing duplicate navigation -->
    <AdminPanel v-else @auth-error="handleAuthError" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";

// Import admin components
import AdminAccessDenied from "@/components/admin/shared/AdminAccessDenied.vue";
import AdminPanel from "@/components/admin/AdminPanel.vue";

// Enable live data for admin panel
import { enableLiveData } from "@/components/admin/useLiveData";

const authStore = useAuthStore();

// Access denied state
const accessDenied = ref(false);
const errorCode = ref(403); // Default to 403 (Forbidden)
const errorMessage = ref("");

// Handle auth errors from components
const handleAuthError = (error: any) => {
  console.error("[AdminView] Auth error occurred:", error);

  // Set error code based on error status
  if (error?.response?.status) {
    errorCode.value = error.response.status;
  } else if (!authStore.isAuthenticated) {
    errorCode.value = 401; // Unauthorized
  } else {
    errorCode.value = 403; // Forbidden
  }

  // Set custom error message if provided
  if (error?.response?.data?.message) {
    errorMessage.value = error.response.data.message;
  } else if (error?.message) {
    errorMessage.value = error.message;
  } else {
    errorMessage.value = "";
  }

  // Show access denied component
  accessDenied.value = true;

  // Try to refresh token if it's a 401 error
  if (errorCode.value === 401 && authStore.isAuthenticated) {
    console.log("[AdminView] Attempting to refresh token after 401 error");
    authStore
      .refreshAuthToken()
      .then((success) => {
        if (success) {
          console.log(
            "[AdminView] Token refreshed successfully, removing error state",
          );
          accessDenied.value = false;
        }
      })
      .catch((err) => {
        console.error("[AdminView] Token refresh failed:", err);
      });
  }
};

// Check admin access
onMounted(() => {
  // Enable live data for admin panel as per user's request
  enableLiveData();
  console.log("Live data enabled for admin panel in AdminView");
  
  // DEBUG: Log current user object and admin status
  console.log("=== AdminView Debug ===");
  console.log("isAuthenticated:", authStore.isAuthenticated);
  console.log("Current user object:", authStore.user);
  console.log("User role:", authStore.user?.role);
  console.log("User roles array:", authStore.user?.roles);
  console.log("Is admin computed:", authStore.isAdmin);
  console.log("UserRole getter:", authStore.userRole);
  console.log("===================");

  if (!authStore.isAuthenticated) {
    console.warn("[AdminView] Not authenticated - showing access denied");
    accessDenied.value = true;
    errorCode.value = 401;
    return;
  }

  // Check if user has admin access
  if (!authStore.isAdmin) {
    console.warn("[AdminView] Admin access denied - showing access denied", {
      user: authStore.user,
      isAdmin: authStore.isAdmin,
    });
    accessDenied.value = true;
    errorCode.value = 403;
    return;
  }

  // Check token validity and refresh if needed
  authStore.getTokenExpiry() &&
    authStore.refreshAuthToken().catch((err) => {
      console.error("[AdminView] Token refresh check failed:", err);
    });
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
