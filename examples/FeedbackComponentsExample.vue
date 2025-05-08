<template>
  <div class="feedback-examples">
    <h1>Feedback Component Examples</h1>
    
    <section>
      <h2>Toast Examples</h2>
      <div class="button-group">
        <button @click="showSuccessToast">Success Toast</button>
        <button @click="showErrorToast">Error Toast</button>
        <button @click="showWarningToast">Warning Toast</button>
        <button @click="showInfoToast">Info Toast</button>
        <button @click="showToastWithAction">Toast with Action</button>
      </div>
    </section>
    
    <section>
      <h2>Dialog Examples</h2>
      <div class="button-group">
        <button @click="showConfirmDialog">Confirm Dialog</button>
        <button @click="showAlertDialog">Alert Dialog</button>
        <button @click="showPromptDialog">Prompt Dialog</button>
        <button @click="showCustomDialog">Custom Dialog</button>
      </div>
    </section>
    
    <section>
      <h2>Progress Indicator Examples</h2>
      <div class="examples-grid">
        <div class="example-card">
          <h3>Linear Progress (Determinate)</h3>
          <ProgressIndicator 
            type="linear" 
            :value="progressValue" 
            :max="100" 
            show-label
          />
          <button @click="incrementProgress">Increment Progress</button>
        </div>
        
        <div class="example-card">
          <h3>Linear Progress (Indeterminate)</h3>
          <ProgressIndicator type="linear" indeterminate />
        </div>
        
        <div class="example-card">
          <h3>Circular Progress</h3>
          <ProgressIndicator 
            type="circular" 
            :value="progressValue" 
            :max="100"
            size="large"
            show-label
          />
        </div>
        
        <div class="example-card">
          <h3>Segmented Progress</h3>
          <ProgressIndicator 
            type="segmented" 
            :value="currentStep" 
            :max="5" 
            :segments="5"
            show-label
          />
          <div class="button-group">
            <button @click="prevStep" :disabled="currentStep <= 0">Previous</button>
            <button @click="nextStep" :disabled="currentStep >= 5">Next</button>
          </div>
        </div>
      </div>
    </section>
    
    <section>
      <h2>Notification Examples</h2>
      <div class="button-group">
        <button @click="addInfoNotification">Info Notification</button>
        <button @click="addSuccessNotification">Success Notification</button>
        <button @click="addWarningNotification">Warning Notification</button>
        <button @click="addErrorNotification">Error Notification</button>
        <button @click="addGroupedNotifications">Add Multiple (Group)</button>
      </div>
    </section>
    
    <section>
      <h2>Loading Overlay Examples</h2>
      <div class="button-group">
        <button @click="showGlobalLoading">Global Loading (3s)</button>
        <button @click="showLocalLoading">Component Loading (3s)</button>
      </div>
      
      <div class="example-container" ref="loadingContainer">
        <div v-if="localContentReady" class="example-content">
          <h3>Component with Local Loading Overlay</h3>
          <p>This component can have its own loading state.</p>
        </div>
        <LoadingOverlay v-model="isLocalLoading" text="Loading component..." />
      </div>
    </section>
  </div>
  
  <!-- Include all our feedback components -->
  <Toast />
  <Dialog />
  <Notification />
  
  <!-- Global loading overlay -->
  <LoadingOverlay 
    v-model="isGlobalLoading" 
    fullscreen 
    text="Loading..."
    spinner-size="large"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Toast, Dialog, ProgressIndicator, Notification, LoadingOverlay } from '../src/components/ui';
import { toastService, dialogService, notificationService } from '../src/services/ui';

// Progress indicator state
const progressValue = ref(25);
const currentStep = ref(1);

const incrementProgress = () => {
  progressValue.value = (progressValue.value + 10) % 110;
};

const nextStep = () => {
  if (currentStep.value < 5) {
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

// Toast examples
const showSuccessToast = () => {
  toastService.success('Operation completed successfully!');
};

const showErrorToast = () => {
  toastService.error('An error occurred while processing your request.');
};

const showWarningToast = () => {
  toastService.warning('Please review your changes before continuing.', {
    duration: 5000
  });
};

const showInfoToast = () => {
  toastService.info('A new update is available for the application.');
};

const showToastWithAction = () => {
  toastService.info('Document has been archived.', {
    actions: [
      {
        label: 'Undo',
        handler: () => {
          toastService.success('Document has been restored!');
        }
      }
    ]
  });
};

// Dialog examples
const showConfirmDialog = async () => {
  const confirmed = await dialogService.confirm({
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed with this action?',
    confirmText: 'Yes, proceed',
    cancelText: 'No, cancel'
  });
  
  if (confirmed) {
    toastService.success('Action confirmed!');
  } else {
    toastService.info('Action cancelled.');
  }
};

const showAlertDialog = async () => {
  await dialogService.alert({
    title: 'Information',
    message: 'Your session will expire in 5 minutes.',
    type: 'info'
  });
};

const showPromptDialog = async () => {
  const name = await dialogService.prompt({
    title: 'Enter Information',
    message: 'Please enter your name:',
    placeholder: 'Your name',
    defaultValue: '',
    confirmText: 'Submit'
  });
  
  if (name) {
    toastService.success(`Hello, ${name}!`);
  }
};

const showCustomDialog = async () => {
  await dialogService.custom({
    title: 'Custom Dialog',
    component: {
      template: `
        <div style="padding: 20px;">
          <p>This is a custom dialog content with HTML.</p>
          <ul>
            <li>You can include any HTML or components</li>
            <li>Fully customizable content</li>
            <li>Can include forms, tables, etc.</li>
          </ul>
        </div>
      `
    },
    buttons: [
      {
        text: 'Close',
        type: 'primary',
        handler: (resolve) => {
          resolve(null);
        }
      }
    ]
  });
};

// Notification examples
const addInfoNotification = () => {
  notificationService.info('File upload completed', {
    title: 'Upload Status',
    actions: [
      {
        label: 'View File',
        type: 'primary',
        handler: () => {
          dialogService.alert('File viewer would open here');
        }
      }
    ]
  });
};

const addSuccessNotification = () => {
  notificationService.success('Your document has been successfully processed', {
    title: 'Processing Complete',
    priority: 'medium'
  });
};

const addWarningNotification = () => {
  notificationService.warning('Your storage is almost full (85% used)', {
    title: 'Storage Warning',
    priority: 'high',
    actions: [
      {
        label: 'Manage Storage',
        type: 'primary',
        handler: () => {
          dialogService.alert('Storage management would open here');
        }
      }
    ]
  });
};

const addErrorNotification = () => {
  notificationService.error('Failed to synchronize data with the server', {
    title: 'Sync Error',
    priority: 'high',
    details: 'Error code: ERR_CONNECTION_REFUSED. The server is not responding to sync requests. This could be due to network issues or server maintenance.',
    persistent: true
  });
};

const addGroupedNotifications = () => {
  const group = 'system-updates';
  
  notificationService.info('System update available: v2.3.4', {
    group,
    title: 'System Update',
    timestamp: Date.now()
  });
  
  setTimeout(() => {
    notificationService.info('Security patches available for installation', {
      group,
      title: 'System Update',
      timestamp: Date.now() + 100
    });
  }, 1000);
  
  setTimeout(() => {
    notificationService.warning('System restart required after updates', {
      group,
      title: 'System Update',
      priority: 'medium',
      timestamp: Date.now() + 200
    });
  }, 2000);
};

// Loading overlay examples
const isGlobalLoading = ref(false);
const isLocalLoading = ref(false);
const localContentReady = ref(true);
const loadingContainer = ref<HTMLElement | null>(null);

const showGlobalLoading = () => {
  isGlobalLoading.value = true;
  setTimeout(() => {
    isGlobalLoading.value = false;
    toastService.success('Global operation completed!');
  }, 3000);
};

const showLocalLoading = () => {
  isLocalLoading.value = true;
  localContentReady.value = false;
  
  setTimeout(() => {
    isLocalLoading.value = false;
    localContentReady.value = true;
    toastService.success('Component loaded successfully!');
  }, 3000);
};
</script>

<style>
.feedback-examples {
  font-family: var(--n-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif);
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

h1, h2, h3 {
  margin-top: 0;
  color: var(--n-color-text-primary, #333333);
}

section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  border-radius: var(--n-border-radius, 0.25rem);
  background-color: var(--n-color-background, #ffffff);
  box-shadow: var(--n-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.1));
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}

button {
  padding: 0.5rem 1rem;
  background-color: var(--n-color-primary, #3498db);
  color: var(--n-color-on-primary, #ffffff);
  border: none;
  border-radius: var(--n-border-radius, 0.25rem);
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

button:hover {
  background-color: var(--n-color-primary-dark, #2980b9);
}

button:disabled {
  background-color: var(--n-color-disabled, #cccccc);
  cursor: not-allowed;
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.example-card {
  padding: 1rem;
  border-radius: var(--n-border-radius, 0.25rem);
  border: 1px solid var(--n-color-border, #e0e0e0);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.example-container {
  position: relative;
  margin-top: 1.5rem;
  height: 200px;
  width: 100%;
  border: 1px solid var(--n-color-border, #e0e0e0);
  border-radius: var(--n-border-radius, 0.25rem);
  overflow: hidden;
}

.example-content {
  padding: 1.5rem;
  height: 100%;
}

@media (max-width: 768px) {
  .examples-grid {
    grid-template-columns: 1fr;
  }
}
</style>