import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import Tooltip from '@/components/ui/base/Tooltip.vue';

// Mock window methods
vi.stubGlobal('setTimeout', vi.fn((fn, time) => {
  fn();
  return 123;
}));

vi.stubGlobal('clearTimeout', vi.fn());

function createWrapper(props = {}, slots = {}) {
  return mount(Tooltip, {
    props: {
      content: 'Tooltip content',
      ...props
    },
    slots: {
      default: '<button>Hover me</button>',
      ...slots
    },
    attachTo: document.body
  });
}

describe('Tooltip.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });
  
  describe('Rendering', () => {
    it('renders correctly with default props', () => {
      const wrapper = createWrapper();
      expect(wrapper.find('.n-tooltip-container').exists()).toBe(true);
      expect(wrapper.find('button').exists()).toBe(true);
      expect(wrapper.find('.n-tooltip').exists()).toBe(true);
      expect(wrapper.find('.n-tooltip').isVisible()).toBe(false);
    });
    
    it('renders tooltip content correctly', () => {
      const wrapper = createWrapper({ content: 'Test tooltip' });
      expect(wrapper.find('.n-tooltip-content').text()).toBe('Test tooltip');
    });
    
    it('renders HTML content when html prop is provided', () => {
      const wrapper = createWrapper({ 
        html: '<span class="test-html">HTML content</span>' 
      });
      
      expect(wrapper.find('.n-tooltip-content').html()).toContain('<span class="test-html">HTML content</span>');
    });
    
    it('renders with arrow when arrow prop is true', () => {
      const wrapper = createWrapper({ arrow: true });
      expect(wrapper.find('.n-tooltip--has-arrow').exists()).toBe(true);
      expect(wrapper.find('.n-tooltip-arrow').exists()).toBe(true);
    });
    
    it('does not render arrow when arrow prop is false', () => {
      const wrapper = createWrapper({ arrow: false });
      expect(wrapper.find('.n-tooltip--has-arrow').exists()).toBe(false);
      expect(wrapper.find('.n-tooltip-arrow').exists()).toBe(false);
    });
  });
  
  describe('Positioning', () => {
    it('applies top position class', () => {
      const wrapper = createWrapper({ position: 'top' });
      expect(wrapper.find('.n-tooltip--top').exists()).toBe(true);
    });
    
    it('applies bottom position class', () => {
      const wrapper = createWrapper({ position: 'bottom' });
      expect(wrapper.find('.n-tooltip--bottom').exists()).toBe(true);
    });
    
    it('applies left position class', () => {
      const wrapper = createWrapper({ position: 'left' });
      expect(wrapper.find('.n-tooltip--left').exists()).toBe(true);
    });
    
    it('applies right position class', () => {
      const wrapper = createWrapper({ position: 'right' });
      expect(wrapper.find('.n-tooltip--right').exists()).toBe(true);
    });
    
    it('applies top-start position class', () => {
      const wrapper = createWrapper({ position: 'top-start' });
      expect(wrapper.find('.n-tooltip--top-start').exists()).toBe(true);
    });
  });
  
  describe('Variants', () => {
    it('applies default variant class', () => {
      const wrapper = createWrapper({ variant: 'default' });
      expect(wrapper.find('.n-tooltip--default').exists()).toBe(false); // Default has no class
    });
    
    it('applies light variant class', () => {
      const wrapper = createWrapper({ variant: 'light' });
      expect(wrapper.find('.n-tooltip--light').exists()).toBe(true);
    });
    
    it('applies dark variant class', () => {
      const wrapper = createWrapper({ variant: 'dark' });
      expect(wrapper.find('.n-tooltip--dark').exists()).toBe(true);
    });
    
    it('applies info variant class', () => {
      const wrapper = createWrapper({ variant: 'info' });
      expect(wrapper.find('.n-tooltip--info').exists()).toBe(true);
    });
    
    it('applies success variant class', () => {
      const wrapper = createWrapper({ variant: 'success' });
      expect(wrapper.find('.n-tooltip--success').exists()).toBe(true);
    });
    
    it('applies warning variant class', () => {
      const wrapper = createWrapper({ variant: 'warning' });
      expect(wrapper.find('.n-tooltip--warning').exists()).toBe(true);
    });
    
    it('applies error variant class', () => {
      const wrapper = createWrapper({ variant: 'error' });
      expect(wrapper.find('.n-tooltip--error').exists()).toBe(true);
    });
  });
  
  describe('Trigger behavior', () => {
    it('shows tooltip on hover when trigger is hover', async () => {
      const wrapper = createWrapper({ trigger: 'hover' });
      
      // Initially not visible
      expect(wrapper.find('.n-tooltip').isVisible()).toBe(false);
      
      // Trigger mouseenter
      await wrapper.find('.n-tooltip-container').trigger('mouseenter');
      
      // Should be visible
      expect(wrapper.find('.n-tooltip').isVisible()).toBe(true);
      
      // Trigger mouseleave
      await wrapper.find('.n-tooltip-container').trigger('mouseleave');
      
      // Should be hidden again
      expect(wrapper.find('.n-tooltip').isVisible()).toBe(false);
    });
    
    it('shows tooltip on focus when trigger is focus', async () => {
      const wrapper = createWrapper({ trigger: 'focus' });
      
      // Initially not visible
      expect(wrapper.find('.n-tooltip').isVisible()).toBe(false);
      
      // Trigger focusin
      await wrapper.find('.n-tooltip-container').trigger('focusin');
      
      // Should be visible
      expect(wrapper.find('.n-tooltip').isVisible()).toBe(true);
      
      // Trigger focusout
      await wrapper.find('.n-tooltip-container').trigger('focusout');
      
      // Should be hidden again
      expect(wrapper.find('.n-tooltip').isVisible()).toBe(false);
    });
    
    it('respects modelValue when trigger is manual', async () => {
      const wrapper = createWrapper({ 
        trigger: 'manual',
        modelValue: false
      });
      
      // Initially not visible
      expect(wrapper.find('.n-tooltip').isVisible()).toBe(false);
      
      // Update modelValue
      await wrapper.setProps({ modelValue: true });
      
      // Should be visible
      expect(wrapper.find('.n-tooltip').isVisible()).toBe(true);
      
      // Update modelValue again
      await wrapper.setProps({ modelValue: false });
      
      // Should be hidden again
      expect(wrapper.find('.n-tooltip').isVisible()).toBe(false);
    });
  });
  
  describe('Events', () => {
    it('emits update:modelValue event when visibility changes', async () => {
      const wrapper = createWrapper({ trigger: 'hover' });
      
      // Trigger mouseenter
      await wrapper.find('.n-tooltip-container').trigger('mouseenter');
      
      // Should emit update:modelValue with true
      expect(wrapper.emitted('update:modelValue')).toBeTruthy();
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([true]);
      
      // Trigger mouseleave
      await wrapper.find('.n-tooltip-container').trigger('mouseleave');
      
      // Should emit update:modelValue with false
      expect(wrapper.emitted('update:modelValue')![1]).toEqual([false]);
    });
    
    it('emits show and hide events', async () => {
      const wrapper = createWrapper({ trigger: 'hover' });
      
      // Trigger mouseenter
      await wrapper.find('.n-tooltip-container').trigger('mouseenter');
      
      // Should emit show
      expect(wrapper.emitted('show')).toBeTruthy();
      
      // Trigger mouseleave
      await wrapper.find('.n-tooltip-container').trigger('mouseleave');
      
      // Should emit hide
      expect(wrapper.emitted('hide')).toBeTruthy();
    });
  });
  
  describe('Interactive mode', () => {
    it('adds interactive class when interactive prop is true', () => {
      const wrapper = createWrapper({ interactive: true });
      expect(wrapper.find('.n-tooltip--interactive').exists()).toBe(true);
    });
  });
  
  describe('Styles', () => {
    it('applies maxWidth style', () => {
      const wrapper = createWrapper({ maxWidth: 200 });
      expect(wrapper.find('.n-tooltip').attributes('style')).toContain('max-width: 200px');
    });
    
    it('applies zIndex style', () => {
      const wrapper = createWrapper({ zIndex: 2000 });
      expect(wrapper.find('.n-tooltip').attributes('style')).toContain('z-index: 2000');
    });
  });
});