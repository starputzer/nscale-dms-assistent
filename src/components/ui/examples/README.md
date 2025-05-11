# UI Components Examples

This directory contains example implementations and usage demonstrations for the UI components in the nscale-assist application.

## Available Examples

The following component examples are available:

- **TextAreaExample.vue**: Demonstrates the various features of the TextArea component
- **ToggleExample.vue**: Demonstrates the various features of the Toggle component
- **TooltipExample.vue**: Demonstrates the various features of the Tooltip component
- **UIComponentsDemo.vue**: A unified demo page that showcases all components in a tabbed interface

## How to Use

### Option 1: Import the Demo Components

You can import these examples directly into your Vue component to see how they work:

```vue
<template>
  <div>
    <h1>UI Component Demos</h1>
    <UIComponentsDemo />
  </div>
</template>

<script setup>
import { UIComponentsDemo } from '@/components/ui/examples';
</script>
```

### Option 2: Copy Example Code

Each example component contains multiple usage patterns that you can copy into your own components. Look for specific sections such as:

- Basic usage
- With validation
- Different sizes
- Different themes/variants
- Various configuration options

## Demo Route

You can add a route to the demo in your router configuration:

```js
// In router/index.ts
import { UIComponentsDemo } from '@/components/ui/examples';

const routes = [
  // ... your existing routes
  {
    path: '/ui-components-demo',
    name: 'UIComponentsDemo',
    component: UIComponentsDemo
  }
];
```

## Documentation

For complete API documentation on these components, please refer to the UI Base Components documentation file:

`/docs/00_KONSOLIDIERTE_DOKUMENTATION/02_KOMPONENTEN/02_UI_BASISKOMPONENTEN.md`