<template>
  <div class="component-demo">
    <h2>ProgressBar Component</h2>
    
    <div class="demo-section">
      <h3>Basic Progress Bars</h3>
      <div class="progress-example">
        <ProgressBar :value="30" />
      </div>
      
      <div class="progress-example">
        <ProgressBar :value="60" variant="success" />
      </div>
      
      <div class="progress-example">
        <ProgressBar :value="45" variant="warning" />
      </div>
      
      <div class="progress-example">
        <ProgressBar :value="80" variant="error" />
      </div>
      
      <div class="progress-example">
        <ProgressBar :value="25" variant="info" />
      </div>
    </div>

    <div class="demo-section">
      <h3>Size Variants</h3>
      <div class="progress-example">
        <ProgressBar :value="50" size="small" />
      </div>
      
      <div class="progress-example">
        <ProgressBar :value="50" size="medium" />
      </div>
      
      <div class="progress-example">
        <ProgressBar :value="50" size="large" />
      </div>
      
      <div class="progress-example">
        <ProgressBar :value="50" trackHeight="20px" />
      </div>
    </div>

    <div class="demo-section">
      <h3>Stylistic Variants</h3>
      <div class="progress-example">
        <ProgressBar :value="60" striped />
      </div>
      
      <div class="progress-example">
        <ProgressBar :value="60" striped animated />
      </div>
      
      <div class="progress-example">
        <ProgressBar :value="60" :rounded="false" />
      </div>
    </div>

    <div class="demo-section">
      <h3>With Labels</h3>
      <div class="progress-example">
        <ProgressBar :value="lowValue" showLabel />
      </div>
      
      <div class="progress-example">
        <ProgressBar :value="mediumValue" showLabel labelPosition="inside" />
      </div>
      
      <div class="progress-example">
        <ProgressBar :value="highValue" showLabel labelPosition="outside" />
      </div>
      
      <div class="progress-example">
        <ProgressBar 
          :value="customLabelValue" 
          showLabel 
          :format="(val) => `${val} of 100 tasks completed`" 
          labelPosition="outside" 
        />
      </div>
    </div>

    <div class="demo-section">
      <h3>Interactive Progress Bar</h3>
      <div class="progress-example">
        <ProgressBar 
          :value="interactiveValue" 
          showLabel 
          labelPosition="inside" 
          :labelThreshold="20"
          variant="primary"
          striped
          :animated="interactiveValue < 100"
        />
        
        <div class="controls">
          <Button @click="decreaseValue" :disabled="interactiveValue <= 0">Decrease</Button>
          <Button @click="resetValue">Reset</Button>
          <Button @click="increaseValue" :disabled="interactiveValue >= 100">Increase</Button>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h3>Indeterminate Progress</h3>
      <div class="progress-example">
        <ProgressBar indeterminate />
      </div>
      
      <div class="progress-example">
        <ProgressBar indeterminate variant="success" />
      </div>
      
      <div class="progress-example">
        <div class="flex gap-2 align-center">
          <ProgressBar 
            :indeterminate="loading" 
            :value="loading ? 0 : 100" 
            variant="primary"
            style="flex: 1"
          />
          <Button @click="toggleLoading">
            {{ loading ? 'Complete' : 'Simulate Loading' }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ProgressBar, Button } from '../base';

// Static demo values
const lowValue = ref(15);
const mediumValue = ref(50);
const highValue = ref(85);
const customLabelValue = ref(73);

// Interactive example
const interactiveValue = ref(40);
const loading = ref(false);

function increaseValue() {
  interactiveValue.value = Math.min(100, interactiveValue.value + 10);
}

function decreaseValue() {
  interactiveValue.value = Math.max(0, interactiveValue.value - 10);
}

function resetValue() {
  interactiveValue.value = 40;
}

function toggleLoading() {
  loading.value = !loading.value;
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

.progress-example {
  margin-bottom: 20px;
}

.controls {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  justify-content: center;
}

.flex {
  display: flex;
}

.gap-2 {
  gap: 10px;
}

.align-center {
  align-items: center;
}

@media (prefers-color-scheme: dark) {
  .demo-section {
    background-color: var(--color-background-dark);
  }
}
</style>