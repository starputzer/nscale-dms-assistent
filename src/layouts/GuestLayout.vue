<template>
  <div class="guest-layout">
    <div class="guest-content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const router = useRouter();

onMounted(() => {
  // If already authenticated, redirect to main app
  if (authStore.isAuthenticated) {
    router.push("/");
  }
});
</script>

<style scoped>
.guest-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--nscale-background);
}

.guest-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>