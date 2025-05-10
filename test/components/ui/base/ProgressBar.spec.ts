import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ProgressBar from '@/components/ui/base/ProgressBar.vue';

describe('ProgressBar Component', () => {
  // Basic rendering
  it('renders properly with default props', () => {
    const wrapper = mount(ProgressBar);
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.classes()).toContain('n-progress-bar');
    expect(wrapper.classes()).toContain('n-progress-bar--medium');
    expect(wrapper.classes()).toContain('n-progress-bar--primary');
    expect(wrapper.classes()).toContain('n-progress-bar--rounded');
  });

  it('sets correct aria attributes', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        value: 50,
        min: 0,
        max: 100
      }
    });
    
    expect(wrapper.attributes('role')).toBe('progressbar');
    expect(wrapper.attributes('aria-valuenow')).toBe('50');
    expect(wrapper.attributes('aria-valuemin')).toBe('0');
    expect(wrapper.attributes('aria-valuemax')).toBe('100');
    expect(wrapper.attributes('aria-valuetext')).toBe('50%');
  });

  it('accepts custom aria value text', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        value: 50,
        ariaValueText: 'Halfway done'
      }
    });
    
    expect(wrapper.attributes('aria-valuetext')).toBe('Halfway done');
  });

  // Progress calculation
  it('sets the fill width correctly based on value', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        value: 25,
        min: 0,
        max: 100
      }
    });
    
    const fill = wrapper.find('.n-progress-bar__fill');
    expect(fill.attributes('style')).toContain('width: 25%');
  });

  it('clamps values to min and max range', () => {
    // Test value below min
    let wrapper = mount(ProgressBar, {
      props: {
        value: -10,
        min: 0,
        max: 100
      }
    });
    
    let fill = wrapper.find('.n-progress-bar__fill');
    expect(fill.attributes('style')).toContain('width: 0%');
    
    // Test value above max
    wrapper = mount(ProgressBar, {
      props: {
        value: 150,
        min: 0,
        max: 100
      }
    });
    
    fill = wrapper.find('.n-progress-bar__fill');
    expect(fill.attributes('style')).toContain('width: 100%');
  });

  // Variants
  it('applies variant classes correctly', () => {
    const variants = ['primary', 'secondary', 'success', 'warning', 'error', 'info'];
    
    variants.forEach(variant => {
      const wrapper = mount(ProgressBar, {
        props: { variant }
      });
      expect(wrapper.classes()).toContain(`n-progress-bar--${variant}`);
    });
  });

  // Sizes
  it('applies size classes correctly', () => {
    const sizes = ['small', 'medium', 'large'];
    
    sizes.forEach(size => {
      const wrapper = mount(ProgressBar, {
        props: { size }
      });
      expect(wrapper.classes()).toContain(`n-progress-bar--${size}`);
    });
  });

  // Styles
  it('applies striped class when striped is true', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        striped: true
      }
    });
    
    expect(wrapper.classes()).toContain('n-progress-bar--striped');
  });

  it('applies animated class when animated is true', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        animated: true
      }
    });
    
    expect(wrapper.classes()).toContain('n-progress-bar--animated');
  });

  it('does not use rounded corners when rounded is false', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        rounded: false
      }
    });
    
    expect(wrapper.classes()).not.toContain('n-progress-bar--rounded');
  });

  // Indeterminate state
  it('sets indeterminate class when indeterminate is true', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        indeterminate: true
      }
    });
    
    const track = wrapper.find('.n-progress-bar__track');
    const fill = wrapper.find('.n-progress-bar__fill');
    
    expect(track.classes()).toContain('n-progress-bar__track--indeterminate');
    expect(fill.classes()).toContain('n-progress-bar__fill--indeterminate');
    expect(fill.attributes('style')).toContain('width: 100%');
  });

  // Track height
  it('sets custom track height when provided', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        trackHeight: '10px'
      }
    });
    
    const track = wrapper.find('.n-progress-bar__track');
    expect(track.attributes('style')).toContain('height: 10px');
  });

  // Label
  it('shows label when showLabel is true', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        value: 42,
        showLabel: true
      }
    });
    
    const label = wrapper.find('.n-progress-bar__label');
    expect(label.exists()).toBe(true);
    expect(label.text()).toBe('42%');
  });

  it('does not show label when showLabel is false', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        value: 42,
        showLabel: false
      }
    });
    
    expect(wrapper.find('.n-progress-bar__label').exists()).toBe(false);
  });

  it('positions label correctly based on labelPosition', () => {
    // Inside position
    let wrapper = mount(ProgressBar, {
      props: {
        value: 50,
        showLabel: true,
        labelPosition: 'inside'
      }
    });
    
    let label = wrapper.find('.n-progress-bar__label');
    expect(label.classes()).toContain('n-progress-bar__label--inside');
    
    // Outside position
    wrapper = mount(ProgressBar, {
      props: {
        value: 50,
        showLabel: true,
        labelPosition: 'outside'
      }
    });
    
    label = wrapper.find('.n-progress-bar__label');
    expect(label.classes()).toContain('n-progress-bar__label--outside');
  });

  it('shows inside label only when value exceeds labelThreshold', () => {
    // Below threshold
    let wrapper = mount(ProgressBar, {
      props: {
        value: 20,
        showLabel: true,
        labelPosition: 'inside',
        labelThreshold: 30
      }
    });
    
    let label = wrapper.find('.n-progress-bar__label');
    expect(label.classes()).not.toContain('n-progress-bar__label--inside');
    
    // Above threshold
    wrapper = mount(ProgressBar, {
      props: {
        value: 40,
        showLabel: true,
        labelPosition: 'inside',
        labelThreshold: 30
      }
    });
    
    label = wrapper.find('.n-progress-bar__label');
    expect(label.classes()).toContain('n-progress-bar__label--inside');
  });

  it('uses custom format function when provided', () => {
    const formatFn = (value: number) => `${value} of 100 steps completed`;
    
    const wrapper = mount(ProgressBar, {
      props: {
        value: 25,
        showLabel: true,
        format: formatFn
      }
    });
    
    const label = wrapper.find('.n-progress-bar__label');
    expect(label.text()).toBe('25 of 100 steps completed');
  });

  // Custom slot
  it('renders label slot when provided', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        value: 75,
        showLabel: true
      },
      slots: {
        label: 'Custom Label Text'
      }
    });
    
    const label = wrapper.find('.n-progress-bar__label');
    expect(label.text()).toBe('Custom Label Text');
  });
});