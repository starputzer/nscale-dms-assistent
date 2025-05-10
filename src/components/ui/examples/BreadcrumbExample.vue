<template>
  <div class="component-demo">
    <h2>Breadcrumb Component</h2>
    
    <div class="demo-section">
      <h3>Basic Breadcrumb</h3>
      <Breadcrumb :items="basicItems" />
    </div>

    <div class="demo-section">
      <h3>Custom Separator</h3>
      <Breadcrumb :items="basicItems" separator=">" />
      
      <div class="mt-4">
        <Breadcrumb :items="basicItems" separator="|" />
      </div>
      
      <div class="mt-4">
        <Breadcrumb :items="basicItems">
          <template #separator>
            <span class="custom-separator">→</span>
          </template>
        </Breadcrumb>
      </div>
    </div>

    <div class="demo-section">
      <h3>With Icons</h3>
      <Breadcrumb :items="itemsWithIcons" />
    </div>

    <div class="demo-section">
      <h3>Collapsed Breadcrumbs (Long Path)</h3>
      <Breadcrumb :items="longPathItems" :maxVisible="3" />
      
      <div class="note mt-4">
        <p>Click on the ellipsis (...) to see the collapsed items.</p>
      </div>
    </div>

    <div class="demo-section">
      <h3>Always Show Home & Current Page</h3>
      <Breadcrumb 
        :items="longPathItems" 
        :maxVisible="3" 
        :alwaysShowHome="true" 
        :alwaysShowCurrent="true" 
      />
    </div>

    <div class="demo-section">
      <h3>With Disabled Items</h3>
      <Breadcrumb :items="itemsWithDisabled" />
    </div>

    <div class="demo-section">
      <h3>Interactive Example</h3>
      <div class="interactive-breadcrumb">
        <Breadcrumb 
          :items="dynamicItems" 
          @click="handleBreadcrumbClick"
        />
        
        <div class="breadcrumb-nav mt-4">
          <Button 
            v-for="(item, index) in availableItems" 
            :key="index"
            @click="navigateTo(index)"
            :variant="dynamicItems.length > index ? 'secondary' : 'primary'"
          >
            {{ item.text }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Breadcrumb, Button } from '../base';
import type { BreadcrumbItem } from '../base/Breadcrumb.vue';

// Mock icons for demo
const HomeIcon = {
  template: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>`
};

const FolderIcon = {
  template: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"></path>
  </svg>`
};

const FileIcon = {
  template: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>`
};

// Sample breadcrumb configurations
const basicItems = ref<BreadcrumbItem[]>([
  { text: 'Home', href: '/' },
  { text: 'Products', href: '/products' },
  { text: 'Electronics', href: '/products/electronics' },
  { text: 'Smartphones', active: true }
]);

const itemsWithIcons = ref<BreadcrumbItem[]>([
  { text: 'Home', href: '/', icon: HomeIcon },
  { text: 'Documents', href: '/documents', icon: FolderIcon },
  { text: 'Projects', href: '/documents/projects', icon: FolderIcon },
  { text: 'Project Report.pdf', active: true, icon: FileIcon }
]);

const longPathItems = ref<BreadcrumbItem[]>([
  { text: 'Home', href: '/' },
  { text: 'Documentation', href: '/docs' },
  { text: 'Components', href: '/docs/components' },
  { text: 'UI Elements', href: '/docs/components/ui' },
  { text: 'Navigation', href: '/docs/components/ui/navigation' },
  { text: 'Breadcrumb', active: true }
]);

const itemsWithDisabled = ref<BreadcrumbItem[]>([
  { text: 'Home', href: '/' },
  { text: 'Admin', href: '/admin' },
  { text: 'Settings', disabled: true },
  { text: 'User Profile', active: true }
]);

// Dynamic breadcrumb example
const availableItems = [
  { text: 'Home', href: '/' },
  { text: 'Shop', href: '/shop' },
  { text: 'Categories', href: '/shop/categories' },
  { text: 'Electronics', href: '/shop/categories/electronics' },
  { text: 'Computers', href: '/shop/categories/electronics/computers' },
  { text: 'Laptops', href: '/shop/categories/electronics/computers/laptops' }
];

const dynamicItems = ref<BreadcrumbItem[]>([
  { ...availableItems[0] }
]);

// Navigation for the dynamic breadcrumb
function navigateTo(index: number) {
  // Cap the index at the available items length
  if (index >= availableItems.length) return;
  
  // Reset to home
  if (index === 0) {
    dynamicItems.value = [{ ...availableItems[0] }];
    return;
  }
  
  // Navigate to the specified index
  const newItems: BreadcrumbItem[] = [];
  
  for (let i = 0; i <= index; i++) {
    const item = { ...availableItems[i] };
    
    // Mark the last item as active
    if (i === index) {
      item.active = true;
      delete item.href; // Remove href from active item
    }
    
    newItems.push(item);
  }
  
  dynamicItems.value = newItems;
}

// Handle breadcrumb clicks
function handleBreadcrumbClick(item: BreadcrumbItem, index: number) {
  console.log('Breadcrumb clicked:', item, index);
  
  // Navigate to the clicked item
  if (index < dynamicItems.value.length - 1) {
    navigateTo(index);
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

.mt-4 {
  margin-top: 20px;
}

.note {
  padding: 10px;
  border-radius: 4px;
  background-color: var(--color-info-light);
  color: var(--color-info);
  font-size: 0.875rem;
}

.custom-separator {
  margin: 0 8px;
  font-weight: bold;
  color: var(--color-primary);
}

.breadcrumb-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

@media (prefers-color-scheme: dark) {
  .demo-section {
    background-color: var(--color-background-dark);
  }
  
  .note {
    background-color: rgba(49, 130, 206, 0.2);
  }
}
</style>