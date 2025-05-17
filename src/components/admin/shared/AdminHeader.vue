<template>
  <div class="admin-header">
    <div class="admin-header__title-section">
      <h2 v-if="title" class="admin-header__title">{{ title }}</h2>
      <div v-if="$slots.title" class="admin-header__title-slot">
        <slot name="title"></slot>
      </div>
      <div v-if="$slots.subtitle" class="admin-header__subtitle">
        <slot name="subtitle"></slot>
      </div>
    </div>
    <div class="admin-header__actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';

defineProps({
  /**
   * The main title to be displayed in the header
   * If not provided, use the title slot instead
   */
  title: {
    type: String,
    default: '',
  },
});
</script>

<style lang="scss">
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
  width: 100%;
  flex-wrap: wrap;
  gap: 1rem;
  
  &__title-section {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  &__title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
    color: var(--text-primary, #111827);
  }
  
  &__subtitle {
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
  }
  
  &__actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    
    &__actions {
      width: 100%;
      justify-content: flex-start;
      margin-top: 0.5rem;
    }
  }
  
  @media (max-width: 480px) {
    &__actions {
      flex-direction: column;
      align-items: stretch;
      width: 100%;
      
      & > * {
        width: 100%;
      }
    }
  }
}
</style>