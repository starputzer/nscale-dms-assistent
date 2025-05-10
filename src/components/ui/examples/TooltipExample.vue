<template>
  <div class="component-demo">
    <h2>Tooltip Component</h2>
    
    <div class="demo-section">
      <h3>Basic Tooltip (Hover)</h3>
      <div class="tooltip-demo">
        <Tooltip content="This is a basic tooltip">
          <Button>Hover me</Button>
        </Tooltip>
      </div>
    </div>

    <div class="demo-section">
      <h3>Different Positions</h3>
      <div class="position-examples">
        <Tooltip content="Tooltip on top" position="top">
          <Button>Top</Button>
        </Tooltip>

        <Tooltip content="Tooltip on right" position="right">
          <Button>Right</Button>
        </Tooltip>

        <Tooltip content="Tooltip on bottom" position="bottom">
          <Button>Bottom</Button>
        </Tooltip>

        <Tooltip content="Tooltip on left" position="left">
          <Button>Left</Button>
        </Tooltip>
      </div>
      
      <div class="position-examples margin-top">
        <Tooltip content="Top start aligned" position="top-start">
          <Button>Top Start</Button>
        </Tooltip>

        <Tooltip content="Top end aligned" position="top-end">
          <Button>Top End</Button>
        </Tooltip>

        <Tooltip content="Bottom start aligned" position="bottom-start">
          <Button>Bottom Start</Button>
        </Tooltip>

        <Tooltip content="Bottom end aligned" position="bottom-end">
          <Button>Bottom End</Button>
        </Tooltip>
      </div>
    </div>

    <div class="demo-section">
      <h3>Trigger Types</h3>
      <div class="trigger-examples">
        <Tooltip content="Hover to show tooltip" trigger="hover">
          <Button>Hover Trigger</Button>
        </Tooltip>

        <Tooltip content="Click to toggle tooltip" trigger="click">
          <Button>Click Trigger</Button>
        </Tooltip>

        <Tooltip content="Focus to show tooltip" trigger="focus">
          <Button>Focus Trigger</Button>
        </Tooltip>

        <Tooltip 
          content="Manual control" 
          trigger="manual"
          :visible="manualVisible"
        >
          <Button @click="manualVisible = !manualVisible">
            Toggle Manually ({{ manualVisible ? 'Hide' : 'Show' }})
          </Button>
        </Tooltip>
      </div>
    </div>

    <div class="demo-section">
      <h3>With Arrow / No Arrow</h3>
      <div class="arrow-examples">
        <Tooltip content="Tooltip with arrow" :arrow="true">
          <Button>With Arrow</Button>
        </Tooltip>

        <Tooltip content="Tooltip without arrow" :arrow="false">
          <Button>Without Arrow</Button>
        </Tooltip>
      </div>
    </div>

    <div class="demo-section">
      <h3>Variants / Themes</h3>
      <div class="variant-examples">
        <Tooltip content="Default variant" variant="default">
          <Button>Default</Button>
        </Tooltip>

        <Tooltip content="Light variant" variant="light">
          <Button>Light</Button>
        </Tooltip>

        <Tooltip content="Dark variant" variant="dark">
          <Button>Dark</Button>
        </Tooltip>

        <Tooltip content="Info variant" variant="info">
          <Button>Info</Button>
        </Tooltip>

        <Tooltip content="Success variant" variant="success">
          <Button>Success</Button>
        </Tooltip>

        <Tooltip content="Warning variant" variant="warning">
          <Button>Warning</Button>
        </Tooltip>

        <Tooltip content="Error variant" variant="error">
          <Button>Error</Button>
        </Tooltip>
      </div>
    </div>

    <div class="demo-section">
      <h3>HTML Content</h3>
      <div class="html-example">
        <Tooltip 
          :html="tooltipHtml"
          :maxWidth="300"
          interactive
        >
          <Button>Rich Content</Button>
        </Tooltip>
      </div>
    </div>

    <div class="demo-section">
      <h3>With Delay</h3>
      <div class="delay-examples">
        <Tooltip 
          content="Shows after 1 second, hides instantly" 
          :showDelay="1000"
          :hideDelay="0"
        >
          <Button>Show Delay</Button>
        </Tooltip>

        <Tooltip 
          content="Shows instantly, hides after 1 second" 
          :showDelay="0"
          :hideDelay="1000"
        >
          <Button>Hide Delay</Button>
        </Tooltip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Tooltip, Button } from '../base';

const manualVisible = ref(false);

const tooltipHtml = `
<div style="text-align: left;">
  <h4 style="margin-top: 0;">Rich Tooltip Content</h4>
  <p>This tooltip contains <strong>formatted HTML</strong> with:</p>
  <ul>
    <li>Lists</li>
    <li>Formatting</li>
    <li>And even <a href="#" style="color: blue;">links</a></li>
  </ul>
</div>
`;
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

.tooltip-demo,
.html-example {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.position-examples,
.trigger-examples,
.arrow-examples,
.variant-examples,
.delay-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  justify-content: center;
  margin: 20px 0;
}

.margin-top {
  margin-top: 20px;
}

@media (prefers-color-scheme: dark) {
  .demo-section {
    background-color: var(--color-background-dark);
  }
}
</style>