<template>
  <div class="base-components-demo">
    <h1>Basis-UI-Komponenten Demo</h1>
    
    <section>
      <h2>Buttons</h2>
      <div class="demo-grid">
        <div v-for="variant in buttonVariants" :key="`btn-${variant}`" class="demo-item">
          <h3>{{ variant }}</h3>
          <div class="button-row">
            <Button 
              :variant="variant" 
              size="small"
            >
              Small
            </Button>
            
            <Button 
              :variant="variant"
            >
              Medium
            </Button>
            
            <Button 
              :variant="variant" 
              size="large"
            >
              Large
            </Button>
          </div>
          
          <div class="button-row">
            <Button 
              :variant="variant" 
              :loading="true"
            >
              Loading
            </Button>
            
            <Button 
              :variant="variant" 
              disabled
            >
              Disabled
            </Button>
            
            <Button 
              :variant="variant" 
              :iconLeft="iconSearch"
            >
              With Icon
            </Button>
          </div>
        </div>
      </div>
    </section>
    
    <section>
      <h2>Inputs</h2>
      <div class="demo-grid">
        <div class="demo-item">
          <Input
            v-model="textInput"
            label="Text Input"
            placeholder="Enter some text"
            helperText="This is a standard text input"
          />
        </div>
        
        <div class="demo-item">
          <Input
            v-model="passwordInput"
            type="password"
            label="Password Input"
            placeholder="Enter your password"
          />
        </div>
        
        <div class="demo-item">
          <Input
            v-model="errorInput"
            label="Input with Error"
            error="This field has an error"
          />
        </div>
        
        <div class="demo-item">
          <Input
            v-model="disabledInput"
            label="Disabled Input"
            disabled
            placeholder="This input is disabled"
          />
        </div>
      </div>
    </section>
    
    <section>
      <h2>Cards</h2>
      <div class="demo-grid">
        <div v-for="variant in cardVariants" :key="`card-${variant}`" class="demo-item">
          <Card 
            :title="`${variant} Card`" 
            :variant="variant"
          >
            <p>This is a {{ variant }} card example with some content.</p>
            <template #footer>
              <Button size="small" variant="tertiary">Cancel</Button>
              <Button size="small" variant="primary">Save</Button>
            </template>
          </Card>
        </div>
        
        <div class="demo-item">
          <Card 
            title="Interactive Card" 
            :interactive="true"
            @click="showAlert('Card clicked!')"
          >
            <p>This card is interactive. Click anywhere on it to trigger an action.</p>
          </Card>
        </div>
      </div>
    </section>
    
    <section>
      <h2>Alerts</h2>
      <div class="demo-stacked">
        <div v-for="type in alertTypes" :key="`alert-${type}`" class="demo-item">
          <Alert
            :type="type"
            :title="`${type} Alert`"
            :message="`This is a ${type} alert message with important information.`"
            :dismissible="true"
          />
        </div>
      </div>
    </section>
    
    <section>
      <h2>Modals</h2>
      <div class="demo-grid">
        <div v-for="size in modalSizes" :key="`modal-${size}`" class="demo-item">
          <Button @click="openModal(size)">
            Open {{ size }} Modal
          </Button>
          
          <Modal
            :open="openModals[size]"
            :title="`${size} Modal`"
            :size="size"
            @close="closeModal(size)"
          >
            <p>This is a {{ size }} modal with some content.</p>
            <p>Modals are useful for displaying focused content that requires user attention or interaction.</p>
            
            <template #footer>
              <Button variant="secondary" @click="closeModal(size)">Cancel</Button>
              <Button variant="primary" @click="confirmModal(size)">Confirm</Button>
            </template>
          </Modal>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { Button, Input, Card, Alert, Modal } from '@/components/ui/base';

// Button demo data
const buttonVariants = ['primary', 'secondary', 'tertiary', 'danger', 'ghost'];

// Mock icon component for demonstration
const iconSearch = {
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
  `
};

// Input demo data
const textInput = ref('');
const passwordInput = ref('');
const errorInput = ref('Invalid input');
const disabledInput = ref('Disabled value');

// Card demo data
const cardVariants = ['default', 'elevated', 'bordered', 'flat'];

// Alert demo data
const alertTypes = ['info', 'success', 'warning', 'error'];

// Modal demo data
const modalSizes = ['small', 'medium', 'large', 'full'];
const openModals = reactive({
  small: false,
  medium: false,
  large: false,
  full: false
});

// Modal functions
function openModal(size: string) {
  openModals[size] = true;
}

function closeModal(size: string) {
  openModals[size] = false;
}

function confirmModal(size: string) {
  showAlert(`${size} modal confirmed!`);
  closeModal(size);
}

// Alert demo function
function showAlert(message: string) {
  alert(message);
}
</script>

<style scoped>
.base-components-demo {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: var(--n-font-family, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
}

section {
  margin-bottom: 3rem;
}

h1 {
  font-size: 2rem;
  margin-bottom: 2rem;
  color: var(--n-color-gray-900, #1a202c);
}

h2 {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--n-color-gray-800, #2d3748);
  border-bottom: 1px solid var(--n-color-gray-200, #e2e8f0);
  padding-bottom: 0.5rem;
}

h3 {
  font-size: 1rem;
  margin-bottom: 1rem;
  color: var(--n-color-gray-700, #4a5568);
  text-transform: capitalize;
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.demo-stacked {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.demo-item {
  margin-bottom: 1rem;
}

.button-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .base-components-demo {
    background-color: var(--n-color-gray-900, #1a202c);
    color: var(--n-color-gray-100, #f7fafc);
  }

  h1 {
    color: var(--n-color-gray-100, #f7fafc);
  }

  h2 {
    color: var(--n-color-gray-200, #edf2f7);
    border-bottom-color: var(--n-color-gray-700, #4a5568);
  }

  h3 {
    color: var(--n-color-gray-300, #e2e8f0);
  }
}
</style>