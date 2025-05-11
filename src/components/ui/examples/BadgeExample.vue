<template>
  <div class="component-demo">
    <h2>Badge Component</h2>

    <div class="demo-section">
      <h3>Basic Badges</h3>
      <div class="badge-examples">
        <Badge>Default</Badge>
        <Badge variant="primary">Primary</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="error">Error</Badge>
        <Badge variant="info">Info</Badge>
      </div>
    </div>

    <div class="demo-section">
      <h3>Pill Badges</h3>
      <div class="badge-examples">
        <Badge pill>Default</Badge>
        <Badge variant="primary" pill>Primary</Badge>
        <Badge variant="success" pill>Success</Badge>
        <Badge variant="warning" pill>Warning</Badge>
        <Badge variant="error" pill>Error</Badge>
        <Badge variant="info" pill>Info</Badge>
      </div>
    </div>

    <div class="demo-section">
      <h3>Badge Sizes</h3>
      <div class="badge-examples">
        <Badge size="small">Small</Badge>
        <Badge size="medium">Medium</Badge>
        <Badge size="large">Large</Badge>
      </div>
    </div>

    <div class="demo-section">
      <h3>Numeric Badges</h3>
      <div class="badge-examples">
        <Badge :value="count" variant="primary">Counter</Badge>
        <Badge :value="largeCount" variant="error" :max="99">Max Value</Badge>
        <Badge :value="0" variant="success">Zero</Badge>
        <div class="badge-control">
          <Button @click="decrementCount">-</Button>
          <span>{{ count }}</span>
          <Button @click="incrementCount">+</Button>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h3>Badge Positioning (Overlay)</h3>
      <div class="badge-examples">
        <div class="badge-container">
          <Badge dot variant="primary">
            <div class="badge-box">Top Right (Default)</div>
          </Badge>
        </div>

        <div class="badge-container">
          <Badge dot variant="primary" position="top-left">
            <div class="badge-box">Top Left</div>
          </Badge>
        </div>

        <div class="badge-container">
          <Badge dot variant="primary" position="bottom-right">
            <div class="badge-box">Bottom Right</div>
          </Badge>
        </div>

        <div class="badge-container">
          <Badge dot variant="primary" position="bottom-left">
            <div class="badge-box">Bottom Left</div>
          </Badge>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h3>Notification Dots</h3>
      <div class="badge-examples">
        <Badge dot variant="primary">
          <Button>Messages</Button>
        </Badge>

        <Badge dot variant="error">
          <Button>Alerts</Button>
        </Badge>

        <Badge dot variant="success">
          <Button>Updates</Button>
        </Badge>
      </div>
    </div>

    <div class="demo-section">
      <h3>Notification Counters</h3>
      <div class="badge-examples">
        <Badge :value="5" variant="primary">
          <Button iconLeft="inbox">Inbox</Button>
        </Badge>

        <Badge :value="99" variant="error" :max="99">
          <Button iconLeft="notifications">Notifications</Button>
        </Badge>

        <Badge :value="3" variant="success">
          <Button iconLeft="message">Messages</Button>
        </Badge>
      </div>
    </div>

    <div class="demo-section">
      <h3>Hidden Badges</h3>
      <div class="badge-examples">
        <Badge :value="hideCount ? 0 : 5" variant="primary" :hidden="hideCount">
          <Button>{{ hideCount ? "Show" : "Hide" }} Badge</Button>
        </Badge>

        <Button @click="hideCount = !hideCount"> Toggle Badge </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Badge, Button } from "../base";

const count = ref(5);
const largeCount = ref(142);
const hideCount = ref(false);

function incrementCount() {
  count.value++;
}

function decrementCount() {
  if (count.value > 0) {
    count.value--;
  }
}
</script>

<style scoped>
.component-demo {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h2 {
  margin-bottom: 20px;
  color: var(--color-primary);
}

h3 {
  margin: 15px 0;
  color: var(--color-text-secondary);
}

.demo-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-background-light);
}

.badge-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin: 15px 0;
  align-items: center;
}

.badge-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.badge-container {
  display: inline-block;
  margin: 10px;
}

.badge-box {
  width: 120px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-background-secondary);
  border: 1px dashed var(--color-border);
  border-radius: 4px;
  text-align: center;
  padding: 10px;
  font-size: 0.8rem;
}

@media (prefers-color-scheme: dark) {
  .demo-section {
    background-color: var(--color-background-dark);
  }

  .badge-box {
    background-color: var(--color-gray-800);
  }
}
</style>
