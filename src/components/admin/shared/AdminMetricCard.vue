<template>
  <div class="admin-metric-card" :class="getVariantClass">
    <div class="admin-metric-card__icon" :class="getIconVariantClass">
      <i :class="['fas', `fa-${icon}`]"></i>
    </div>
    <div class="admin-metric-card__content">
      <div class="admin-metric-card__value">
        <slot name="value">{{ value }}</slot>
      </div>
      <div class="admin-metric-card__label">
        <slot name="label">{{ label }}</slot>
      </div>
      <div v-if="$slots.trend" class="admin-metric-card__trend">
        <slot name="trend"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  /**
   * The numerical value to display
   */
  value: {
    type: [Number, String],
    default: 0,
  },
  /**
   * Descriptive label for the metric
   */
  label: {
    type: String,
    default: '',
  },
  /**
   * The icon to display (FontAwesome icon name without the 'fa-' prefix)
   */
  icon: {
    type: String,
    default: 'chart-line',
  },
  /**
   * Visual variant to apply to the card
   * Can be 'default', 'success', 'warning', 'danger', or 'primary'
   */
  variant: {
    type: String,
    default: 'default',
    validator: (val: string) => ['default', 'success', 'warning', 'danger', 'primary'].includes(val),
  },
});

const getVariantClass = computed(() => {
  return props.variant !== 'default' ? `admin-metric-card--${props.variant}` : '';
});

const getIconVariantClass = computed(() => {
  return props.variant !== 'default' ? `admin-metric-card__icon--${props.variant}` : '';
});
</script>

<style lang="scss">
.admin-metric-card {
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: var(--card-bg, white);
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  
  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    margin-right: 1rem;
    background-color: var(--primary-light, #e0e7ff);
    color: var(--primary, #3b82f6);
    
    i {
      font-size: 1.5rem;
    }
    
    &--success {
      background-color: var(--success-light, #dcfce7);
      color: var(--success, #16a34a);
    }
    
    &--warning {
      background-color: var(--warning-light, #fef3c7);
      color: var(--warning, #f59e0b);
    }
    
    &--danger {
      background-color: var(--danger-light, #fee2e2);
      color: var(--danger, #dc2626);
    }
    
    &--primary {
      background-color: var(--primary-light, #e0e7ff);
      color: var(--primary, #3b82f6);
    }
  }
  
  &__content {
    display: flex;
    flex-direction: column;
    flex: 1;
  }
  
  &__value {
    font-size: 1.75rem;
    font-weight: bold;
    line-height: 1;
    color: var(--text-primary, #111827);
  }
  
  &__label {
    color: var(--text-secondary, #6b7280);
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }
  
  &__trend {
    margin-top: 0.5rem;
    font-size: 0.875rem;
  }
  
  /* Variants */
  &--success {
    border-left: 4px solid var(--success, #16a34a);
  }
  
  &--warning {
    border-left: 4px solid var(--warning, #f59e0b);
  }
  
  &--danger {
    border-left: 4px solid var(--danger, #dc2626);
  }
  
  &--primary {
    border-left: 4px solid var(--primary, #3b82f6);
  }
  
  /* Responsive adjustments */
  @media (max-width: 480px) {
    padding: 0.75rem;
    
    &__icon {
      width: 40px;
      height: 40px;
      margin-right: 0.75rem;
      
      i {
        font-size: 1.25rem;
      }
    }
    
    &__value {
      font-size: 1.5rem;
    }
  }
}
</style>