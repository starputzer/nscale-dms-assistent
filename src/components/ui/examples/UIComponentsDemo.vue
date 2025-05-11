<template>
  <div class="ui-components-demo">
    <header>
      <h1>UI Base Components Demo</h1>
      <p>Interactive examples of the nscale-assist UI components</p>
    </header>

    <nav class="demo-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['nav-button', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <main class="demo-content">
      <component :is="activeComponent" />
    </main>

    <footer>
      <p>
        UI Components v1.3.0 - Documentation available in
        <code
          >/docs/00_KONSOLIDIERTE_DOKUMENTATION/02_KOMPONENTEN/02_UI_BASISKOMPONENTEN.md</code
        >
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import TextAreaExample from "./TextAreaExample.vue";
import ToggleExample from "./ToggleExample.vue";
import TooltipExample from "./TooltipExample.vue";
import BadgeExample from "./BadgeExample.vue";
import BreadcrumbExample from "./BreadcrumbExample.vue";
import ProgressBarExample from "./ProgressBarExample.vue";
import TabsExample from "./TabsExample.vue";
import StepperExample from "./StepperExample.vue";

const tabs = [
  { id: "textarea", label: "TextArea" },
  { id: "toggle", label: "Toggle" },
  { id: "tooltip", label: "Tooltip" },
  { id: "badge", label: "Badge" },
  { id: "breadcrumb", label: "Breadcrumb" },
  { id: "progressbar", label: "ProgressBar" },
  { id: "tabs", label: "Tabs" },
  { id: "stepper", label: "Stepper" },
];

const activeTab = ref("textarea");

const activeComponent = computed(() => {
  switch (activeTab.value) {
    case "textarea":
      return TextAreaExample;
    case "toggle":
      return ToggleExample;
    case "tooltip":
      return TooltipExample;
    case "badge":
      return BadgeExample;
    case "breadcrumb":
      return BreadcrumbExample;
    case "progressbar":
      return ProgressBarExample;
    case "tabs":
      return TabsExample;
    case "stepper":
      return StepperExample;
    default:
      return TextAreaExample;
  }
});
</script>

<style scoped>
.ui-components-demo {
  font-family: var(
    --font-family,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif
  );
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-border);
}

h1 {
  color: var(--color-primary);
  margin-bottom: 10px;
}

.demo-nav {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 30px;
}

.nav-button {
  padding: 10px 20px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background-secondary);
  color: var(--color-text-primary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
}

.nav-button:hover {
  background-color: var(--color-primary-light);
}

.nav-button.active {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.demo-content {
  background-color: var(--color-background-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  min-height: 600px;
}

footer {
  margin-top: 30px;
  text-align: center;
  font-size: 14px;
  color: var(--color-text-secondary);
}

@media (prefers-color-scheme: dark) {
  .nav-button {
    background-color: var(--color-background-dark);
  }

  .nav-button:hover {
    background-color: var(--color-primary-dark);
  }

  .demo-content {
    background-color: var(--color-background-dark);
  }
}

@media (max-width: 768px) {
  .demo-nav {
    flex-direction: column;
    gap: 5px;
  }

  .nav-button {
    width: 100%;
  }
}
</style>
