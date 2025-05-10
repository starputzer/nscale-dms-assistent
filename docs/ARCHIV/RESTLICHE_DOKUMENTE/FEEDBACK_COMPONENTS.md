# Feedback Components

This guide documents the feedback component collection for the nscale DMS Assistenten. These components provide a consistent way to display feedback to users throughout the application.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Components](#components)
  - [Toast](#toast)
  - [Dialog](#dialog)
  - [ProgressIndicator](#progressindicator)
  - [Notification](#notification)
  - [LoadingOverlay](#loadingoverlay)
- [Services](#services)
  - [ToastService](#toastservice)
  - [DialogService](#dialogservice)
  - [NotificationService](#notificationservice)
- [Accessibility](#accessibility)
- [Theming](#theming)
- [Internationalization](#internationalization)
- [Examples](#examples)

## Overview

The feedback component collection is built with Vue 3's Composition API using `<script setup>` syntax and TypeScript for type safety. The components are designed to be accessible, customizable, and fully responsive.

Key features:
- Vue 3 Composition API with `<script setup>` syntax
- TypeScript support with comprehensive type definitions
- Centralized service modules for managing UI feedback components
- ARIA attributes for accessibility
- Support for reduced motion preferences
- i18n support
- Comprehensive theming using CSS variables

## Installation

The components are designed to be used within the nscale DMS Assistenten application. They are automatically available when importing from the components directory.

```js
// Import components
import { Toast, Dialog, ProgressIndicator, Notification, LoadingOverlay } from '@/components/ui';

// Import services
import { toastService, dialogService, notificationService } from '@/services/ui';
```

## Components

### Toast

`Toast.vue` is a component that displays temporary, non-blocking notifications.

**Features:**
- Different types (success, error, warning, info)
- Configurable duration, position and animation
- Optional action buttons
- Queue management for multiple toasts
- Accessibility support
- Reduced motion support

**Usage:**
```vue
<template>
  <!-- Include the Toast component once in your app -->
  <Toast />
</template>

<script setup>
import { Toast } from '@/components/ui';
import { toastService } from '@/services/ui';

// Display toasts using the service
toastService.success('Operation successful!');
toastService.error('An error occurred.');
toastService.warning('Please review your changes.');
toastService.info('New update available.');

// Toast with action
toastService.info('File uploaded', {
  actions: [{
    label: 'View',
    handler: () => { /* Handler code */ }
  }]
});
</script>
```

### Dialog

`Dialog.vue` provides modal dialogs for important messages and actions.

**Features:**
- Different types (confirm, alert, prompt, custom)
- Promise-based API
- Keyboard navigation and focus management
- Customizable buttons and content
- Fullscreen mode
- Animation and transition effects

**Usage:**
```vue
<template>
  <!-- Include the Dialog component once in your app -->
  <Dialog />
</template>

<script setup>
import { Dialog } from '@/components/ui';
import { dialogService } from '@/services/ui';

// Confirm dialog
const handleConfirm = async () => {
  const result = await dialogService.confirm({
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?'
  });
  
  if (result) {
    // User confirmed
  }
};

// Alert dialog
const showAlert = async () => {
  await dialogService.alert('This is an alert message');
};

// Prompt dialog
const promptUser = async () => {
  const name = await dialogService.prompt({
    title: 'Enter Information',
    message: 'Please enter your name',
    placeholder: 'Your name'
  });
  
  if (name) {
    // User entered a value
  }
};

// Custom dialog
const showCustomDialog = async () => {
  const result = await dialogService.custom({
    title: 'Custom Dialog',
    component: YourCustomComponent,
    props: { /* Your component props */ }
  });
};
</script>
```

### ProgressIndicator

`ProgressIndicator.vue` displays progress for operations in various formats.

**Features:**
- Linear, circular, and segmented progress types
- Determinate and indeterminate states
- Size variants (small, medium, large)
- Step/stage visualization
- Accessible text labels

**Usage:**
```vue
<template>
  <!-- Linear progress (determinate) -->
  <ProgressIndicator 
    type="linear" 
    :value="progress" 
    :max="100" 
    show-label
  />
  
  <!-- Linear progress (indeterminate) -->
  <ProgressIndicator 
    type="linear" 
    indeterminate 
  />
  
  <!-- Circular progress -->
  <ProgressIndicator 
    type="circular" 
    :value="progress" 
    :max="100"
    size="large"
  />
  
  <!-- Segmented progress (steps) -->
  <ProgressIndicator 
    type="segmented" 
    :value="currentStep" 
    :max="5" 
    :segments="5"
  />
</template>

<script setup>
import { ref } from 'vue';
import { ProgressIndicator } from '@/components/ui';

const progress = ref(45);
const currentStep = ref(2);
</script>
```

### Notification

`Notification.vue` displays more permanent notifications than toasts with advanced features.

**Features:**
- Various notification types and priority levels
- Read/unread states
- Grouping capabilities
- Interactive elements like buttons
- Notification center for viewing all notifications
- Filtering and sorting options

**Usage:**
```vue
<template>
  <!-- Include the Notification component once in your app -->
  <Notification />
</template>

<script setup>
import { Notification } from '@/components/ui';
import { notificationService } from '@/services/ui';

// Display notifications
notificationService.info('New message received');
notificationService.success('Document processed successfully');
notificationService.warning('Your session will expire soon');
notificationService.error('Failed to save changes');

// Notification with actions
notificationService.info('New file shared with you', {
  title: 'File Sharing',
  actions: [{
    label: 'View File',
    handler: () => { /* Handler code */ }
  }]
});

// Grouped notifications
notificationService.info('System update available', {
  group: 'updates',
  priority: 'medium'
});
</script>
```

### LoadingOverlay

`LoadingOverlay.vue` provides loading indicators for operations.

**Features:**
- Fullscreen or component-specific loading overlays
- Customizable spinner and text
- Delayed appearance to prevent flickering
- Minimum display duration
- Z-index management

**Usage:**
```vue
<template>
  <!-- Global loading overlay -->
  <LoadingOverlay 
    v-model="isGlobalLoading" 
    fullscreen 
    text="Loading data..."
  />
  
  <!-- Component-specific loading overlay -->
  <div class="container">
    <div v-if="dataLoaded" class="content">
      <!-- Your content -->
    </div>
    <LoadingOverlay 
      v-model="isLoading" 
      delay="300"
      text="Loading component..."
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { LoadingOverlay } from '@/components/ui';

const isGlobalLoading = ref(false);
const isLoading = ref(true);
const dataLoaded = ref(false);

// Show loading overlay
const fetchData = async () => {
  isLoading.value = true;
  try {
    // Fetch data
    dataLoaded.value = true;
  } finally {
    isLoading.value = false;
  }
};
</script>
```

## Services

### ToastService

`ToastService.ts` is a centralized service for managing toast notifications.

**Methods:**
- `show(message, type, options)`: Display a toast with specified type and options
- `success(message, options)`: Display a success toast
- `error(message, options)`: Display an error toast
- `warning(message, options)`: Display a warning toast
- `info(message, options)`: Display an info toast
- `remove(id)`: Remove a specific toast
- `clear()`: Remove all toasts

**Options:**
```typescript
interface ToastOptions {
  duration?: number;           // Duration in milliseconds (0 for persistent)
  position?: ToastPosition;    // 'top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'
  closable?: boolean;          // Show close button
  actions?: ToastAction[];     // Action buttons
  showProgress?: boolean;      // Show progress bar
  customClass?: string;        // Custom CSS class
  group?: string;              // Group identifier for similar toasts
  zIndex?: number;             // Custom z-index
}
```

### DialogService

`DialogService.ts` provides methods for displaying various types of dialogs.

**Methods:**
- `confirm(options)`: Display a confirmation dialog, returns Promise<boolean>
- `alert(options)`: Display an alert dialog, returns Promise<void>
- `prompt(options)`: Display a prompt dialog, returns Promise<string | null>
- `info(options)`: Display an info dialog
- `warning(options)`: Display a warning dialog
- `error(options)`: Display an error dialog
- `success(options)`: Display a success dialog
- `custom(options)`: Display a custom dialog, returns Promise<T>

**Options:**
```typescript
interface DialogOptions {
  title?: string;              // Dialog title
  message?: string | VNode;    // Dialog message
  type?: DialogType;           // 'info', 'success', 'warning', 'error', 'confirm', 'prompt'
  confirmText?: string;        // Text for confirm button
  cancelText?: string;         // Text for cancel button
  buttons?: DialogButton[];    // Custom buttons
  closable?: boolean;          // Show close button
  closeOnEsc?: boolean;        // Close on Escape key
  closeOnClickOutside?: boolean; // Close when clicking outside
  fullscreen?: boolean;        // Fullscreen mode
  persistent?: boolean;        // Cannot be dismissed by clicking outside
  component?: Component;       // Custom component for custom dialogs
  props?: Record<string, any>; // Props for custom component
  width?: string;              // Dialog width
  zIndex?: number;             // Custom z-index
}
```

### NotificationService

`NotificationService.ts` manages more persistent notifications with advanced features.

**Methods:**
- `add(message, options)`: Add a notification, returns id
- `info(message, options)`: Add an info notification
- `success(message, options)`: Add a success notification
- `warning(message, options)`: Add a warning notification
- `error(message, options)`: Add an error notification
- `system(message, options)`: Add a system notification
- `remove(id)`: Remove a notification by id
- `markAsRead(id)`: Mark a notification as read
- `markAllAsRead()`: Mark all notifications as read
- `clear()`: Remove all notifications
- `getUnreadCount()`: Get count of unread notifications
- `getByGroup(group)`: Get notifications by group

**Options:**
```typescript
interface NotificationOptions {
  title?: string;              // Notification title
  type?: NotificationType;     // 'info', 'success', 'warning', 'error', 'system'
  priority?: NotificationPriority; // 'high', 'medium', 'low'
  actions?: NotificationAction[]; // Action buttons
  group?: string;              // Group identifier
  details?: string;            // Additional details
  timestamp?: number;          // Notification timestamp
  persistent?: boolean;        // Persists across app restarts
  closable?: boolean;          // Can be dismissed
  read?: boolean;              // Initial read state
  customClass?: string;        // Custom CSS class
  expiration?: number;         // Auto-expire time in milliseconds
}
```

## Accessibility

All components implement accessibility features:

- ARIA attributes for screen readers
- Keyboard navigation
- Focus management for modal dialogs
- Support for reduced motion preferences
- Color contrast compliance
- Screen reader announcements for dynamic content

## Theming

The components use CSS variables for theming. The main variables include:

```css
:root {
  /* Colors */
  --n-color-primary: #3498db;
  --n-color-success: #2ecc71;
  --n-color-warning: #f39c12;
  --n-color-error: #e74c3c;
  --n-color-info: #3498db;
  --n-color-background: #ffffff;
  --n-color-text-primary: #333333;
  --n-color-text-secondary: #666666;
  --n-color-text-tertiary: #999999;
  --n-color-border: #e0e0e0;
  
  /* Sizing and spacing */
  --n-border-radius: 0.25rem;
  --n-border-radius-sm: 0.125rem;
  --n-border-radius-lg: 0.5rem;
  
  /* Z-index */
  --n-z-index-toast: 9000;
  --n-z-index-dialog: 9500;
  --n-z-index-loading: 9800;
  
  /* Shadows */
  --n-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --n-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --n-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  
  /* Typography */
  --n-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
}
```

## Internationalization

The components support internationalization through the Vue I18n library. Translations are provided in the `src/i18n/feedback.ts` file.

## Examples

A complete example demonstrating all feedback components can be found in `/examples/FeedbackComponentsExample.vue`.