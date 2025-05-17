<template>
  <div v-if="isMobileView" class="admin-mobile-tab-bar">
    <button 
      v-for="tab in tabs" 
      :key="tab.id"
      @click="handleTabClick(tab.id)"
      :class="{ 
        'admin-mobile-tab-bar__tab': true, 
        'active': modelValue === tab.id 
      }"
      :aria-selected="modelValue === tab.id"
      role="tab"
    >
      <i v-if="tab.icon" :class="['fas', `fa-${tab.icon}`]"></i>
      <span>{{ tab.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed } from 'vue';
import { useWindowSize } from '@/composables/useWindowSize';

interface Tab {
  id: string;
  label: string;
  icon?: string;
}

const props = defineProps({
  /**
   * The tabs to display
   */
  tabs: {
    type: Array as () => Tab[],
    required: true,
  },
  /**
   * The ID of the currently active tab
   */
  modelValue: {
    type: String,
    required: true,
  },
  /**
   * Enforce display regardless of screen size
   */
  forceDisplay: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue']);

// Determine if we should show the mobile tab bar
const { isMobile } = useWindowSize();
const isMobileView = computed(() => props.forceDisplay || isMobile.value);

// Handle tab clicks
const handleTabClick = (tabId: string) => {
  emit('update:modelValue', tabId);
};
</script>

<style lang="scss">
.admin-mobile-tab-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  
  &__tab {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 0.5rem;
    background-color: var(--bg-secondary, #f9fafb);
    color: var(--text-primary, #111827);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 44px; /* Better touch target */
    
    &:hover {
      background-color: var(--bg-hover, #f3f4f6);
    }
    
    &.active {
      background-color: var(--primary, #3b82f6);
      color: white;
      border-color: var(--primary, #3b82f6);
    }
    
    i {
      font-size: 1rem;
    }
  }
  
  /* Responsive adjustments for very small screens */
  @media (max-width: 480px) {
    grid-template-columns: 1fr 1fr;
    
    &__tab {
      padding: 0.75rem 0.5rem;
      
      span {
        font-size: 0.875rem;
      }
    }
  }
}
</style>