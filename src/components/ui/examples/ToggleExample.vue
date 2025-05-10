<template>
  <div class="component-demo">
    <h2>Toggle Component</h2>
    
    <div class="demo-section">
      <h3>Basic Toggle</h3>
      <Toggle
        v-model="basicToggle"
        label="Basic Toggle"
      />
      <div class="value-display">Value: {{ basicToggle }}</div>
    </div>

    <div class="demo-section">
      <h3>With Labels</h3>
      <Toggle
        v-model="labeledToggle"
        label="Toggle with ON/OFF labels"
        showLabels
      />
      <div class="value-display">Value: {{ labeledToggle }}</div>
    </div>

    <div class="demo-section">
      <h3>Different Sizes</h3>
      <div class="size-examples">
        <Toggle
          v-model="smallToggle"
          label="Small Toggle"
          size="sm"
        />
        <Toggle
          v-model="mediumToggle"
          label="Medium Toggle (default)"
          size="md"
        />
        <Toggle
          v-model="largeToggle"
          label="Large Toggle"
          size="lg"
        />
      </div>
    </div>

    <div class="demo-section">
      <h3>Custom Colors</h3>
      <div class="color-examples">
        <Toggle
          v-model="primaryToggle"
          label="Primary Color (default)"
          color="primary"
        />
        <Toggle
          v-model="successToggle"
          label="Success Color"
          color="success"
        />
        <Toggle
          v-model="warningToggle"
          label="Warning Color"
          color="warning"
        />
        <Toggle
          v-model="errorToggle"
          label="Error Color"
          color="error"
        />
        <Toggle
          v-model="infoToggle"
          label="Info Color"
          color="info"
        />
      </div>
    </div>

    <div class="demo-section">
      <h3>With Helper Text & Error</h3>
      <Toggle
        v-model="validationToggle"
        label="Required Toggle"
        required
        :error="validationError"
        helperText="This toggle is required"
        @change="validateToggle"
      />
    </div>

    <div class="demo-section">
      <h3>Custom Labels</h3>
      <Toggle
        v-model="customLabelToggle"
        label="Custom Labels"
        showLabels
        onLabel="YES"
        offLabel="NO"
      />
    </div>

    <div class="demo-section">
      <h3>Disabled State</h3>
      <Toggle
        v-model="disabledToggle"
        label="Disabled Toggle"
        disabled
        helperText="This toggle cannot be changed"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Toggle } from '../base';

const basicToggle = ref(false);
const labeledToggle = ref(true);
const smallToggle = ref(false);
const mediumToggle = ref(true);
const largeToggle = ref(false);
const primaryToggle = ref(true);
const successToggle = ref(true);
const warningToggle = ref(true);
const errorToggle = ref(true);
const infoToggle = ref(true);
const validationToggle = ref(false);
const customLabelToggle = ref(true);
const disabledToggle = ref(true);

const validationError = ref('');

const validateToggle = () => {
  if (!validationToggle.value) {
    validationError.value = 'This toggle must be enabled';
  } else {
    validationError.value = '';
  }
};

// Initial validation
validateToggle();

// Watch for changes and validate
watch(validationToggle, validateToggle);
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

.value-display {
  margin-top: 10px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.size-examples,
.color-examples {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (prefers-color-scheme: dark) {
  .demo-section {
    background-color: var(--color-background-dark);
  }
}
</style>