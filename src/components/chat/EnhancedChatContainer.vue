<template>
  <div class="enhanced-chat-container">
    <FeatureWrapper feature="enhancedChatComponents" :fallback="LegacyChatView">
      <EnhancedChatView />
    </FeatureWrapper>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import FeatureWrapper from "@/components/shared/FeatureWrapper.vue";

// Lazy-Laden der Chat-Komponenten zur Optimierung der Ladezeit
const EnhancedChatView = defineAsyncComponent(
  () => import("@/views/EnhancedChatView.vue"),
);

// Legacy-Komponente als Fallback
const LegacyChatView = defineAsyncComponent(
  () => import("@/views/ChatView.vue"),
);
</script>

<style scoped>
.enhanced-chat-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
