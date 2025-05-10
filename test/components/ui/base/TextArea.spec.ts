import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import TextArea from '@/components/ui/base/TextArea.vue';

// Mock marked module
vi.mock('marked', () => ({
  marked: {
    parse: vi.fn((text) => `<p>${text}</p>`)
  }
}));

// Mock window methods
vi.stubGlobal('setTimeout', vi.fn((fn) => {
  fn();
  return 123;
}));

vi.stubGlobal('clearTimeout', vi.fn());

function createWrapper(props = {}) {
  return mount(TextArea, {
    props: {
      modelValue: '',
      ...props
    }
  });
}

describe('TextArea.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Rendering', () => {
    it('renders correctly with default props', () => {
      const wrapper = createWrapper();
      expect(wrapper.find('.n-textarea-wrapper').exists()).toBe(true);
      expect(wrapper.find('textarea').exists()).toBe(true);
    });
    
    it('renders with label when provided', () => {
      const wrapper = createWrapper({ label: 'Test Label' });
      expect(wrapper.find('.n-textarea-label').text()).toBe('Test Label');
    });
    
    it('applies required state correctly', () => {
      const wrapper = createWrapper({ label: 'Test Label', required: true });
      expect(wrapper.find('.n-textarea-label--required').exists()).toBe(true);
    });
    
    it('renders helper text when provided', () => {
      const wrapper = createWrapper({ helperText: 'Helper text' });
      expect(wrapper.find('.n-textarea-helper-text').text()).toBe('Helper text');
    });
    
    it('renders error message when provided', () => {
      const wrapper = createWrapper({ error: 'Error message' });
      expect(wrapper.find('.n-textarea-error-text').text()).toBe('Error message');
    });
    
    it('shows character count when enabled with maxlength', () => {
      const wrapper = createWrapper({ 
        maxlength: 100, 
        showCharacterCount: true,
        modelValue: 'Hello'
      });
      expect(wrapper.find('.n-textarea-character-count').text()).toBe('5 / 100');
    });
  });
  
  describe('Interaction', () => {
    it('emits update:modelValue event when text changes', async () => {
      const wrapper = createWrapper();
      const textarea = wrapper.find('textarea');
      
      await textarea.setValue('New value');
      
      expect(wrapper.emitted('update:modelValue')).toBeTruthy();
      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['New value']);
    });
    
    it('emits focus and blur events', async () => {
      const wrapper = createWrapper();
      const textarea = wrapper.find('textarea');
      
      await textarea.trigger('focus');
      expect(wrapper.emitted('focus')).toBeTruthy();
      
      await textarea.trigger('blur');
      expect(wrapper.emitted('blur')).toBeTruthy();
    });
    
    it('emits keydown event', async () => {
      const wrapper = createWrapper();
      const textarea = wrapper.find('textarea');
      
      await textarea.trigger('keydown', { key: 'Enter' });
      
      expect(wrapper.emitted('keydown')).toBeTruthy();
    });
  });
  
  describe('Auto-resize functionality', () => {
    it('calls resizeTextarea when content changes', async () => {
      const wrapper = createWrapper({ autoResize: true });
      const resizeSpy = vi.spyOn(wrapper.vm, 'resizeTextarea');
      
      await wrapper.setProps({ modelValue: 'New content with multiple lines\nSecond line\nThird line' });
      await nextTick();
      
      expect(resizeSpy).toHaveBeenCalled();
    });
    
    it('does not call resizeTextarea when autoResize is false', async () => {
      const wrapper = createWrapper({ autoResize: false });
      const resizeSpy = vi.spyOn(wrapper.vm, 'resizeTextarea');
      
      await wrapper.setProps({ modelValue: 'New content' });
      await nextTick();
      
      expect(resizeSpy).not.toHaveBeenCalled();
    });
  });
  
  describe('Markdown preview', () => {
    it('toggles markdown preview when the toggle button is clicked', async () => {
      const wrapper = createWrapper({ 
        showMarkdownToggle: true,
        modelValue: '# Heading'
      });
      
      // Initially, preview should not be visible
      expect(wrapper.find('.n-textarea-markdown-preview').exists()).toBe(false);
      
      // Click the toggle button
      await wrapper.find('.n-textarea-toggle-btn').trigger('click');
      
      // Preview should now be visible
      expect(wrapper.find('.n-textarea-markdown-preview').exists()).toBe(true);
      
      // Check that marked was called
      expect(wrapper.find('.n-textarea-preview-content').html()).toContain('<p># Heading</p>');
    });
    
    it('does not show markdown toggle when disabled', () => {
      const wrapper = createWrapper({ showMarkdownToggle: false });
      expect(wrapper.find('.n-textarea-markdown-toggle').exists()).toBe(false);
    });
  });
  
  describe('Accessibility', () => {
    it('sets aria-invalid attribute when there is an error', () => {
      const wrapper = createWrapper({ error: 'Error message' });
      expect(wrapper.find('textarea').attributes('aria-invalid')).toBe('true');
    });
    
    it('sets aria-describedby attribute when there is helper text or error', () => {
      const wrapper = createWrapper({ helperText: 'Helper text', id: 'test-textarea' });
      expect(wrapper.find('textarea').attributes('aria-describedby')).toBe('test-textarea-helper');
    });
  });
  
  describe('Disabled state', () => {
    it('applies disabled class and attribute when disabled', () => {
      const wrapper = createWrapper({ disabled: true });
      expect(wrapper.find('.n-textarea-wrapper--disabled').exists()).toBe(true);
      expect(wrapper.find('textarea').attributes('disabled')).toBe('');
    });
  });
  
  describe('Auto-focus behavior', () => {
    it('focuses the textarea when autofocus is true', async () => {
      const focusSpy = vi.spyOn(HTMLTextAreaElement.prototype, 'focus');
      
      createWrapper({ autofocus: true });
      await nextTick();
      
      expect(focusSpy).toHaveBeenCalled();
    });
    
    it('does not focus when autofocus is false', async () => {
      const focusSpy = vi.spyOn(HTMLTextAreaElement.prototype, 'focus');
      
      createWrapper({ autofocus: false });
      await nextTick();
      
      expect(focusSpy).not.toHaveBeenCalled();
    });
  });
});