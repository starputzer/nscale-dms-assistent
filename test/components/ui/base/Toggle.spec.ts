import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import Toggle from '@/components/ui/base/Toggle.vue';

function createWrapper(props = {}) {
  return mount(Toggle, {
    props: {
      modelValue: false,
      ...props
    }
  });
}

describe('Toggle.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Rendering', () => {
    it('renders correctly with default props', () => {
      const wrapper = createWrapper();
      expect(wrapper.find('.n-toggle-wrapper').exists()).toBe(true);
      expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true);
    });
    
    it('renders with label when provided as prop', () => {
      const wrapper = createWrapper({ label: 'Test Label' });
      expect(wrapper.find('.n-toggle-label').text()).toBe('Test Label');
    });
    
    it('renders with slot content as label', () => {
      const wrapper = mount(Toggle, {
        props: { modelValue: false },
        slots: {
          default: 'Slot Label'
        }
      });
      expect(wrapper.find('.n-toggle-label').text()).toBe('Slot Label');
    });
    
    it('applies required state correctly', () => {
      const wrapper = createWrapper({ label: 'Test Label', required: true });
      expect(wrapper.find('.n-toggle-label--required').exists()).toBe(true);
    });
    
    it('renders helper text when provided', () => {
      const wrapper = createWrapper({ helperText: 'Helper text' });
      expect(wrapper.find('.n-toggle-helper-text').text()).toBe('Helper text');
    });
    
    it('renders error message when provided', () => {
      const wrapper = createWrapper({ error: 'Error message' });
      expect(wrapper.find('.n-toggle-error').text()).toBe('Error message');
    });
    
    it('renders in checked state when modelValue is true', () => {
      const wrapper = createWrapper({ modelValue: true });
      expect(wrapper.find('.n-toggle-wrapper--checked').exists()).toBe(true);
      expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(true);
    });
  });
  
  describe('Sizes', () => {
    it('applies small size correctly', () => {
      const wrapper = createWrapper({ size: 'sm' });
      const toggleStyle = window.getComputedStyle(wrapper.find('.n-toggle-switch').element);
      expect(toggleStyle.getPropertyValue('--toggle-width')).toBe('36px');
    });
    
    it('applies medium size correctly', () => {
      const wrapper = createWrapper({ size: 'md' });
      const toggleStyle = window.getComputedStyle(wrapper.find('.n-toggle-switch').element);
      expect(toggleStyle.getPropertyValue('--toggle-width')).toBe('46px');
    });
    
    it('applies large size correctly', () => {
      const wrapper = createWrapper({ size: 'lg' });
      const toggleStyle = window.getComputedStyle(wrapper.find('.n-toggle-switch').element);
      expect(toggleStyle.getPropertyValue('--toggle-width')).toBe('56px');
    });
  });
  
  describe('Labels', () => {
    it('shows on/off labels when showLabels is true', () => {
      const wrapper = createWrapper({ 
        showLabels: true,
        labelOn: 'ON',
        labelOff: 'OFF'
      });
      
      const toggleSwitch = wrapper.find('.n-toggle-switch');
      expect(toggleSwitch.attributes('data-label-on')).toBe('ON');
      expect(toggleSwitch.attributes('data-label-off')).toBe('OFF');
    });
    
    it('does not show on/off labels when showLabels is false', () => {
      const wrapper = createWrapper({ showLabels: false });
      
      const toggleSwitch = wrapper.find('.n-toggle-switch');
      expect(toggleSwitch.attributes('data-label-on')).toBeUndefined();
      expect(toggleSwitch.attributes('data-label-off')).toBeUndefined();
    });
  });
  
  describe('Interaction', () => {
    it('emits update:modelValue event when toggled', async () => {
      const wrapper = createWrapper();
      const checkbox = wrapper.find('input[type="checkbox"]');
      
      await checkbox.setValue(true);
      
      expect(wrapper.emitted('update:modelValue')).toBeTruthy();
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([true]);
    });
    
    it('emits change event when toggled', async () => {
      const wrapper = createWrapper();
      const checkbox = wrapper.find('input[type="checkbox"]');
      
      await checkbox.setValue(true);
      
      expect(wrapper.emitted('change')).toBeTruthy();
    });
  });
  
  describe('Disabled state', () => {
    it('applies disabled class when disabled', () => {
      const wrapper = createWrapper({ disabled: true });
      expect(wrapper.find('.n-toggle-wrapper--disabled').exists()).toBe(true);
    });
    
    it('disables the input when disabled', () => {
      const wrapper = createWrapper({ disabled: true });
      expect(wrapper.find('input[type="checkbox"]').attributes('disabled')).toBe('');
    });
  });
  
  describe('Colors', () => {
    it('applies custom color when provided', () => {
      const wrapper = createWrapper({ 
        color: '#ff0000',
        modelValue: true
      });
      
      const toggleStyle = window.getComputedStyle(wrapper.find('.n-toggle-switch').element);
      expect(toggleStyle.getPropertyValue('--toggle-color')).toBe('#ff0000');
    });
  });
  
  describe('Accessibility', () => {
    it('sets aria-invalid attribute when there is an error', () => {
      const wrapper = createWrapper({ error: 'Error message' });
      expect(wrapper.find('input[type="checkbox"]').attributes('aria-invalid')).toBe('true');
    });
    
    it('sets aria-describedby attribute when there is helper text or error', () => {
      const wrapper = createWrapper({ 
        helperText: 'Helper text', 
        id: 'test-toggle' 
      });
      
      expect(wrapper.find('input[type="checkbox"]').attributes('aria-describedby')).toBe('test-toggle-helper');
    });
  });
});