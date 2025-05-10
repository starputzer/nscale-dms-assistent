<template>
  <div 
    class="n-stepper" 
    :class="[
      `n-stepper--${variant}`,
      `n-stepper--${size}`,
      {
        'n-stepper--vertical': vertical,
        'n-stepper--interactive': interactive
      }
    ]"
    role="navigation"
    aria-label="Progress Steps"
  >
    <div class="n-stepper__list">
      <div
        v-for="(step, index) in steps"
        :key="index"
        class="n-stepper__step"
        :class="{
          'n-stepper__step--active': index === activeStep,
          'n-stepper__step--completed': isCompleted(index),
          'n-stepper__step--disabled': isDisabled(index)
        }"
      >
        <!-- Step connector/line -->
        <div 
          v-if="index > 0" 
          class="n-stepper__connector"
          :class="{
            'n-stepper__connector--active': isCompleted(index - 1)
          }"
        ></div>
        
        <!-- Step indicator -->
        <div class="n-stepper__indicator-wrapper">
          <div 
            class="n-stepper__indicator"
            :class="{
              'n-stepper__indicator--clickable': interactive && !isDisabled(index)
            }"
            @click="handleStepClick(index)"
            :aria-current="index === activeStep ? 'step' : undefined"
            :tabindex="interactive && !isDisabled(index) ? 0 : -1"
            @keydown.enter="interactive && !isDisabled(index) && handleStepClick(index)"
            @keydown.space="interactive && !isDisabled(index) && handleStepClick(index)"
          >
            <div class="n-stepper__indicator-content">
              <component 
                v-if="isCompleted(index) && checkIcon" 
                :is="checkIcon" 
                class="n-stepper__icon"
              />
              <component 
                v-else-if="step.icon" 
                :is="step.icon" 
                class="n-stepper__icon"
              />
              <template v-else>{{ index + 1 }}</template>
            </div>
          </div>
        </div>
        
        <!-- Step content -->
        <div class="n-stepper__content">
          <div class="n-stepper__title">{{ step.title }}</div>
          <div v-if="step.description" class="n-stepper__description">
            {{ step.description }}
          </div>
          
          <!-- Optional step content through slot -->
          <div v-if="$slots[`step-${index}`]" class="n-stepper__slot">
            <slot :name="`step-${index}`" :step="step" :index="index"></slot>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Navigation buttons -->
    <div v-if="showNavigation" class="n-stepper__navigation">
      <Button 
        size="medium" 
        variant="secondary" 
        :disabled="activeStep === 0 || isNavigationDisabled"
        @click="prevStep"
      >
        {{ prevButtonText }}
      </Button>
      
      <Button 
        size="medium"
        variant="primary"
        :disabled="activeStep === steps.length - 1 || isNavigationDisabled"
        @click="nextStep"
      >
        {{ nextButtonText }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Button from './Button.vue';

/**
 * Step item interface
 */
export interface StepItem {
  /** Title of the step */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional icon component */
  icon?: any;
  /** Whether the step is disabled */
  disabled?: boolean;
  /** Whether the step is optional */
  optional?: boolean;
  /** Optional data associated with the step */
  data?: any;
}

/**
 * Stepper component that displays a sequence of steps.
 * @displayName Stepper
 * @example
 * <Stepper :steps="[{ title: 'Step 1' }, { title: 'Step 2' }]" />
 * <Stepper :steps="steps" v-model="activeStep" variant="outlined" />
 */
export interface StepperProps {
  /** Array of step items */
  steps: StepItem[];
  /** Active step index (for v-model binding) */
  modelValue?: number;
  /** Default active step index when not using v-model */
  activeIndex?: number;
  /** Completed steps (array of indices or 'auto') */
  completed?: number[] | 'auto';
  /** Visual variant */
  variant?: 'filled' | 'outlined' | 'minimal';
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show in vertical layout */
  vertical?: boolean;
  /** Whether steps are clickable to navigate */
  interactive?: boolean;
  /** Icon component to use for completed steps */
  checkIcon?: any;
  /** Whether to show navigation buttons */
  showNavigation?: boolean;
  /** Text for the Previous button */
  prevButtonText?: string;
  /** Text for the Next button */
  nextButtonText?: string;
  /** Whether navigation buttons are disabled */
  isNavigationDisabled?: boolean;
}

const props = withDefaults(defineProps<StepperProps>(), {
  modelValue: undefined,
  activeIndex: 0,
  completed: 'auto',
  variant: 'filled',
  size: 'medium',
  vertical: false,
  interactive: true,
  checkIcon: undefined,
  showNavigation: false,
  prevButtonText: 'Previous',
  nextButtonText: 'Next',
  isNavigationDisabled: false
});

// Active step state
const activeStep = computed({
  get: () => props.modelValue !== undefined ? props.modelValue : props.activeIndex,
  set: (value) => {
    emit('update:modelValue', value);
    emit('step-change', value, props.steps[value]);
  }
});

// Check if a step is completed
function isCompleted(index: number): boolean {
  // If completed is 'auto', all steps before activeStep are completed
  if (props.completed === 'auto') {
    return index < activeStep.value;
  }
  
  // Otherwise check if the index is in the completed array
  return Array.isArray(props.completed) && props.completed.includes(index);
}

// Check if a step is disabled
function isDisabled(index: number): boolean {
  // Check if the step is explicitly disabled
  if (props.steps[index]?.disabled) {
    return true;
  }
  
  // For linear steppers, steps after activeStep + 1 are disabled
  if (!props.interactive) {
    return index > activeStep.value + 1;
  }
  
  return false;
}

// Handle step click
function handleStepClick(index: number) {
  if (props.interactive && !isDisabled(index)) {
    activeStep.value = index;
  }
}

// Navigation methods
function nextStep() {
  if (activeStep.value < props.steps.length - 1 && !props.isNavigationDisabled) {
    activeStep.value++;
    emit('next', activeStep.value, props.steps[activeStep.value]);
  }
}

function prevStep() {
  if (activeStep.value > 0 && !props.isNavigationDisabled) {
    activeStep.value--;
    emit('prev', activeStep.value, props.steps[activeStep.value]);
  }
}

// Emit events
const emit = defineEmits<{
  (e: 'update:modelValue', index: number): void;
  (e: 'step-change', index: number, step: StepItem): void;
  (e: 'next', index: number, step: StepItem): void;
  (e: 'prev', index: number, step: StepItem): void;
}>();
</script>

<style scoped>
.n-stepper {
  /* Base styles */
  display: flex;
  flex-direction: column;
  font-family: var(--n-font-family, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  width: 100%;
}

.n-stepper__list {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  width: 100%;
}

/* Vertical layout */
.n-stepper--vertical .n-stepper__list {
  flex-direction: column;
}

/* Step item */
.n-stepper__step {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.n-stepper--vertical .n-stepper__step {
  flex: initial;
  width: 100%;
  flex-direction: row;
  margin-bottom: 1.5rem;
}

/* Connector line between steps */
.n-stepper__connector {
  position: absolute;
  top: calc(var(--n-indicator-size, 32px) / 2);
  left: calc(-50% + var(--n-indicator-size, 32px) / 2);
  right: calc(50% + var(--n-indicator-size, 32px) / 2);
  height: 2px;
  background-color: var(--n-color-gray-300, #e2e8f0);
  transition: background-color 0.3s ease;
}

.n-stepper__connector--active {
  background-color: var(--n-color-primary, #0066cc);
}

.n-stepper--vertical .n-stepper__connector {
  left: calc(var(--n-indicator-size, 32px) / 2);
  top: calc(-50% + var(--n-indicator-size, 32px) / 2);
  bottom: calc(50% + var(--n-indicator-size, 32px) / 2);
  width: 2px;
  height: auto;
  right: auto;
}

/* Step indicator */
.n-stepper__indicator-wrapper {
  position: relative;
  z-index: 1;
  margin-bottom: 0.75rem;
}

.n-stepper--vertical .n-stepper__indicator-wrapper {
  margin-bottom: 0;
  margin-right: 1rem;
}

.n-stepper__indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: 600;
  background-color: var(--n-color-gray-200, #e2e8f0);
  color: var(--n-color-text-secondary, #718096);
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

/* Size variants for indicators */
.n-stepper--small .n-stepper__indicator {
  --n-indicator-size: 24px;
  width: var(--n-indicator-size);
  height: var(--n-indicator-size);
  font-size: 12px;
}

.n-stepper--medium .n-stepper__indicator {
  --n-indicator-size: 32px;
  width: var(--n-indicator-size);
  height: var(--n-indicator-size);
  font-size: 14px;
}

.n-stepper--large .n-stepper__indicator {
  --n-indicator-size: 40px;
  width: var(--n-indicator-size);
  height: var(--n-indicator-size);
  font-size: 16px;
}

/* Variant styles */
/* Filled variant */
.n-stepper--filled .n-stepper__step--active .n-stepper__indicator,
.n-stepper--filled .n-stepper__step--completed .n-stepper__indicator {
  background-color: var(--n-color-primary, #0066cc);
  color: var(--n-color-white, #ffffff);
}

/* Outlined variant */
.n-stepper--outlined .n-stepper__indicator {
  background-color: transparent;
  border: 2px solid var(--n-color-gray-300, #e2e8f0);
}

.n-stepper--outlined .n-stepper__step--active .n-stepper__indicator {
  border-color: var(--n-color-primary, #0066cc);
  color: var(--n-color-primary, #0066cc);
}

.n-stepper--outlined .n-stepper__step--completed .n-stepper__indicator {
  background-color: var(--n-color-primary, #0066cc);
  border-color: var(--n-color-primary, #0066cc);
  color: var(--n-color-white, #ffffff);
}

/* Minimal variant */
.n-stepper--minimal .n-stepper__indicator {
  background-color: transparent;
  color: var(--n-color-text-primary, #1a202c);
}

.n-stepper--minimal .n-stepper__step--active .n-stepper__indicator {
  color: var(--n-color-primary, #0066cc);
}

.n-stepper--minimal .n-stepper__step--completed .n-stepper__indicator {
  color: var(--n-color-success, #48bb78);
}

/* Step states */
.n-stepper__step--disabled .n-stepper__indicator {
  background-color: var(--n-color-gray-100, #f7fafc);
  color: var(--n-color-text-disabled, #a0aec0);
  cursor: not-allowed;
}

.n-stepper__step--disabled .n-stepper__title,
.n-stepper__step--disabled .n-stepper__description {
  color: var(--n-color-text-disabled, #a0aec0);
}

.n-stepper__indicator--clickable {
  cursor: pointer;
}

.n-stepper__indicator--clickable:hover {
  transform: scale(1.05);
}

.n-stepper__indicator--clickable:focus-visible {
  outline: 2px solid var(--n-color-primary-light, #4299e1);
  outline-offset: 2px;
}

/* Step content */
.n-stepper__content {
  text-align: center;
  padding: 0 0.5rem;
}

.n-stepper--vertical .n-stepper__content {
  text-align: left;
  flex: 1;
  padding: 0;
}

.n-stepper__title {
  font-weight: 600;
  color: var(--n-color-text-primary, #1a202c);
  margin-bottom: 0.25rem;
}

.n-stepper__description {
  font-size: 0.875rem;
  color: var(--n-color-text-secondary, #718096);
  margin-bottom: 0.5rem;
}

.n-stepper__slot {
  margin-top: 0.5rem;
}

/* Step icons */
.n-stepper__icon {
  width: 1em;
  height: 1em;
}

/* Navigation buttons */
.n-stepper__navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 1.5rem;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .n-stepper__connector {
    background-color: var(--n-color-gray-600, #4a5568);
  }
  
  .n-stepper__indicator {
    background-color: var(--n-color-gray-700, #2d3748);
    color: var(--n-color-text-secondary-dark, #a0aec0);
  }
  
  .n-stepper__title {
    color: var(--n-color-text-primary-dark, #f7fafc);
  }
  
  .n-stepper__description {
    color: var(--n-color-text-secondary-dark, #a0aec0);
  }
  
  /* Outlined variant in dark mode */
  .n-stepper--outlined .n-stepper__indicator {
    border-color: var(--n-color-gray-600, #4a5568);
  }
  
  /* Minimal variant in dark mode */
  .n-stepper--minimal .n-stepper__indicator {
    color: var(--n-color-text-primary-dark, #f7fafc);
  }
  
  /* Disabled state in dark mode */
  .n-stepper__step--disabled .n-stepper__indicator {
    background-color: var(--n-color-gray-800, #1a202c);
    color: var(--n-color-text-disabled-dark, #718096);
  }
  
  .n-stepper__step--disabled .n-stepper__title,
  .n-stepper__step--disabled .n-stepper__description {
    color: var(--n-color-text-disabled-dark, #718096);
  }
}
</style>