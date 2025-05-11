<template>
  <div class="demo-container">
    <div class="demo-sidebar">
      <DemoSidebar @select-component="selectComponent" />
    </div>
    <div class="demo-content">
      <component :is="activeComponent" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { useFeatureTogglesStore } from "@/stores/featureToggles";
import {
  UIComponentsDemo,
  TextAreaExample,
  ToggleExample,
  TooltipExample,
} from "@/components/ui/examples";
import { toastService } from "@/services/ui/ToastService";
import DemoSidebar from "@/components/ui/examples/components/DemoSidebar.vue";

const featureStore = useFeatureTogglesStore();
const selectedComponent = ref("");

onMounted(() => {
  // Check if the feature is enabled
  if (!featureStore.isEnabled("uiComponentsDemo")) {
    toastService.warning(
      "UI Components Demo ist deaktiviert. Bitte aktivieren Sie es in den Feature-Toggles.",
    );
  }
});

const selectComponent = (component: string) => {
  selectedComponent.value = component;
};

const activeComponent = computed(() => {
  switch (selectedComponent.value) {
    case "textarea":
      return TextAreaExample;
    case "toggle":
      return ToggleExample;
    case "tooltip":
      return TooltipExample;
    default:
      return UIComponentsDemo;
  }
});
</script>

<style scoped>
.demo-container {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.demo-sidebar {
  flex-shrink: 0;
}

.demo-content {
  flex: 1;
  overflow: auto;
  padding: 0;
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .demo-container {
    flex-direction: column;
  }

  .demo-content {
    height: 0;
    flex: 1;
  }
}
</style>
