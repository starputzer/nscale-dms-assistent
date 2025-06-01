<template>
  <div class="main-layout">
    <HeaderComponent />

    <div class="main-content">
      <SidebarComponent />

      <div class="content-area">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useSessionsStore } from "@/stores/sessions";
import HeaderComponent from "@/components/HeaderComponent.vue";
import SidebarComponent from "@/components/SidebarComponent.vue";

const authStore = useAuthStore();
const sessionsStore = useSessionsStore();
const router = useRouter();

onMounted(() => {
  if (!authStore.isAuthenticated) {
    router.push("/login");
  } else {
    // Load sessions when layout is mounted
    sessionsStore.synchronizeSessions();
  }
});
</script>

<style scoped>
.main-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.content-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: var(--nscale-background);
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }
}
</style>
