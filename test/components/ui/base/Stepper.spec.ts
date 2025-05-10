import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Stepper from '@/components/ui/base/Stepper.vue';

describe('Stepper Component', () => {
  const defaultSteps = [
    { title: 'Step 1', description: 'Description 1' },
    { title: 'Step 2', description: 'Description 2' },
    { title: 'Step 3', description: 'Description 3' }
  ];

  // Basic rendering
  it('renders properly with default props', () => {
    const wrapper = mount(Stepper, {
      props: {
        steps: defaultSteps
      }
    });
    
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.classes()).toContain('n-stepper');
    expect(wrapper.classes()).toContain('n-stepper--filled');
    expect(wrapper.classes()).toContain('n-stepper--medium');
    expect(wrapper.classes()).toContain('n-stepper--interactive');
    
    // Should render all steps
    const stepElements = wrapper.findAll('.n-stepper__step');
    expect(stepElements.length).toBe(3);
  });

  it('renders step content correctly', () => {
    const wrapper = mount(Stepper, {
      props: {
        steps: defaultSteps
      }
    });
    
    const titles = wrapper.findAll('.n-stepper__title');
    expect(titles.length).toBe(3);
    expect(titles[0].text()).toBe('Step 1');
    expect(titles[1].text()).toBe('Step 2');
    expect(titles[2].text()).toBe('Step 3');
    
    const descriptions = wrapper.findAll('.n-stepper__description');
    expect(descriptions.length).toBe(3);
    expect(descriptions[0].text()).toBe('Description 1');
    expect(descriptions[1].text()).toBe('Description 2');
    expect(descriptions[2].text()).toBe('Description 3');
  });

  // Active step
  it('highlights the active step', () => {
    const wrapper = mount(Stepper, {
      props: {
        steps: defaultSteps,
        modelValue: 1
      }
    });
    
    const activeSteps = wrapper.findAll('.n-stepper__step--active');
    expect(activeSteps.length).toBe(1);
    
    const titles = wrapper.findAll('.n-stepper__title');
    expect(activeSteps[0].find('.n-stepper__title').text()).toBe('Step 2');
  });

  it('uses activeIndex when modelValue is not provided', () => {
    const wrapper = mount(Stepper, {
      props: {
        steps: defaultSteps,
        activeIndex: 2
      }
    });
    
    const activeSteps = wrapper.findAll('.n-stepper__step--active');
    expect(activeSteps[0].find('.n-stepper__title').text()).toBe('Step 3');
  });

  // Completed steps
  it('marks steps as completed with "auto" mode', () => {
    const wrapper = mount(Stepper, {
      props: {
        steps: defaultSteps,
        modelValue: 2,
        completed: 'auto'
      }
    });
    
    const completedSteps = wrapper.findAll('.n-stepper__step--completed');
    expect(completedSteps.length).toBe(2); // Steps 0 and 1 should be completed
  });

  it('marks specific steps as completed when array is provided', () => {
    const wrapper = mount(Stepper, {
      props: {
        steps: defaultSteps,
        modelValue: 2,
        completed: [0] // Only first step is completed
      }
    });
    
    const completedSteps = wrapper.findAll('.n-stepper__step--completed');
    expect(completedSteps.length).toBe(1);
    expect(completedSteps[0].find('.n-stepper__title').text()).toBe('Step 1');
  });

  // Disabled steps
  it('adds disabled class to disabled steps', () => {
    const stepsWithDisabled = [
      { title: 'Step 1' },
      { title: 'Step 2', disabled: true },
      { title: 'Step 3' }
    ];
    
    const wrapper = mount(Stepper, {
      props: {
        steps: stepsWithDisabled
      }
    });
    
    const disabledSteps = wrapper.findAll('.n-stepper__step--disabled');
    expect(disabledSteps.length).toBe(1);
    expect(disabledSteps[0].find('.n-stepper__title').text()).toBe('Step 2');
  });

  // Variants
  it('applies variant classes correctly', () => {
    const variants = ['filled', 'outlined', 'minimal'];
    
    variants.forEach(variant => {
      const wrapper = mount(Stepper, {
        props: {
          steps: defaultSteps,
          variant
        }
      });
      expect(wrapper.classes()).toContain(`n-stepper--${variant}`);
    });
  });

  // Sizes
  it('applies size classes correctly', () => {
    const sizes = ['small', 'medium', 'large'];
    
    sizes.forEach(size => {
      const wrapper = mount(Stepper, {
        props: {
          steps: defaultSteps,
          size
        }
      });
      expect(wrapper.classes()).toContain(`n-stepper--${size}`);
    });
  });

  // Layout
  it('applies vertical layout when vertical is true', () => {
    const wrapper = mount(Stepper, {
      props: {
        steps: defaultSteps,
        vertical: true
      }
    });
    
    expect(wrapper.classes()).toContain('n-stepper--vertical');
  });

  // Interaction
  it('emits update:modelValue when clicking a step', async () => {
    const wrapper = mount(Stepper, {
      props: {
        steps: defaultSteps,
        modelValue: 0,
        interactive: true
      }
    });
    
    // Click the second step
    const stepIndicators = wrapper.findAll('.n-stepper__indicator');
    await stepIndicators[1].trigger('click');
    
    // Should emit update event
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([1]);
    
    // Should also emit step-change event
    expect(wrapper.emitted('step-change')).toBeTruthy();
    expect(wrapper.emitted('step-change')![0][0]).toBe(1);
    expect(wrapper.emitted('step-change')![0][1]).toEqual(defaultSteps[1]);
  });

  it('does not emit events when clicking a disabled step', async () => {
    const stepsWithDisabled = [
      { title: 'Step 1' },
      { title: 'Step 2', disabled: true },
      { title: 'Step 3' }
    ];
    
    const wrapper = mount(Stepper, {
      props: {
        steps: stepsWithDisabled,
        modelValue: 0
      }
    });
    
    // Click the disabled step
    const stepIndicators = wrapper.findAll('.n-stepper__indicator');
    await stepIndicators[1].trigger('click');
    
    // Should not emit events
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
    expect(wrapper.emitted('step-change')).toBeFalsy();
  });

  it('does not allow step interaction when interactive is false', async () => {
    const wrapper = mount(Stepper, {
      props: {
        steps: defaultSteps,
        modelValue: 0,
        interactive: false
      }
    });
    
    // Click the second step
    const stepIndicators = wrapper.findAll('.n-stepper__indicator');
    await stepIndicators[1].trigger('click');
    
    // Should not emit events
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
    expect(wrapper.emitted('step-change')).toBeFalsy();
  });

  // Navigation
  it('renders navigation buttons when showNavigation is true', () => {
    const wrapper = mount(Stepper, {
      props: {
        steps: defaultSteps,
        showNavigation: true
      }
    });
    
    expect(wrapper.find('.n-stepper__navigation').exists()).toBe(true);
    const buttons = wrapper.findAll('.n-stepper__navigation button');
    expect(buttons.length).toBe(2);
  });

  it('emits next event when clicking next button', async () => {
    const wrapper = mount(Stepper, {
      props: {
        steps: defaultSteps,
        modelValue: 0,
        showNavigation: true
      }
    });
    
    const nextButton = wrapper.findAll('.n-stepper__navigation button')[1];
    await nextButton.trigger('click');
    
    expect(wrapper.emitted('next')).toBeTruthy();
    expect(wrapper.emitted('next')![0][0]).toBe(1);
    expect(wrapper.emitted('next')![0][1]).toEqual(defaultSteps[1]);
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([1]);
  });

  it('emits prev event when clicking previous button', async () => {
    const wrapper = mount(Stepper, {
      props: {
        steps: defaultSteps,
        modelValue: 1,
        showNavigation: true
      }
    });
    
    const prevButton = wrapper.findAll('.n-stepper__navigation button')[0];
    await prevButton.trigger('click');
    
    expect(wrapper.emitted('prev')).toBeTruthy();
    expect(wrapper.emitted('prev')![0][0]).toBe(0);
    expect(wrapper.emitted('prev')![0][1]).toEqual(defaultSteps[0]);
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([0]);
  });

  it('disables previous button on first step', () => {
    const wrapper = mount(Stepper, {
      props: {
        steps: defaultSteps,
        modelValue: 0,
        showNavigation: true
      }
    });
    
    const prevButton = wrapper.findAll('.n-stepper__navigation button')[0];
    expect(prevButton.attributes('disabled')).toBeDefined();
  });

  it('disables next button on last step', () => {
    const wrapper = mount(Stepper, {
      props: {
        steps: defaultSteps,
        modelValue: 2,
        showNavigation: true
      }
    });
    
    const nextButton = wrapper.findAll('.n-stepper__navigation button')[1];
    expect(nextButton.attributes('disabled')).toBeDefined();
  });

  it('disables all navigation when isNavigationDisabled is true', () => {
    const wrapper = mount(Stepper, {
      props: {
        steps: defaultSteps,
        modelValue: 1,
        showNavigation: true,
        isNavigationDisabled: true
      }
    });
    
    const buttons = wrapper.findAll('.n-stepper__navigation button');
    expect(buttons[0].attributes('disabled')).toBeDefined();
    expect(buttons[1].attributes('disabled')).toBeDefined();
  });

  // Step content via slots
  it('renders step content via slot', () => {
    const wrapper = mount(Stepper, {
      props: {
        steps: defaultSteps
      },
      slots: {
        'step-0': '<div class="custom-step-content">Custom Content</div>'
      }
    });
    
    expect(wrapper.find('.custom-step-content').exists()).toBe(true);
    expect(wrapper.find('.custom-step-content').text()).toBe('Custom Content');
  });

  // Accessibility
  it('has correct ARIA attributes for accessibility', () => {
    const wrapper = mount(Stepper, {
      props: {
        steps: defaultSteps,
        modelValue: 1
      }
    });
    
    const stepper = wrapper.find('.n-stepper');
    expect(stepper.attributes('role')).toBe('navigation');
    expect(stepper.attributes('aria-label')).toBe('Progress Steps');
    
    const activeIndicator = wrapper.findAll('.n-stepper__indicator')[1];
    expect(activeIndicator.attributes('aria-current')).toBe('step');
  });
});