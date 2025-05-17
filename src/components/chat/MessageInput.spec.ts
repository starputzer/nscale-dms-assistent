/**
 * Tests für MessageInput Komponente
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import MessageInput from './MessageInput.vue';

describe('MessageInput', () => {
  const defaultProps = {
    modelValue: '',
    placeholder: 'Type a message...',
    disabled: false,
    isLoading: false,
    isStreaming: false,
    maxLength: 1000
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      const wrapper = mount(MessageInput, {
        props: defaultProps
      });

      expect(wrapper.find('.n-chat-input').exists()).toBe(true);
      expect(wrapper.find('.n-chat-input__textarea').exists()).toBe(true);
      expect(wrapper.find('.n-chat-input__send-btn').exists()).toBe(true);
    });

    it('displays placeholder text', () => {
      const wrapper = mount(MessageInput, {
        props: {
          ...defaultProps,
          placeholder: 'Custom placeholder'
        }
      });

      const textarea = wrapper.find('.n-chat-input__textarea');
      expect(textarea.attributes('placeholder')).toBe('Custom placeholder');
    });

    it('shows character count when enabled', () => {
      const wrapper = mount(MessageInput, {
        props: {
          ...defaultProps,
          modelValue: 'Hello',
          showCharacterCount: true,
          maxLength: 100
        }
      });

      expect(wrapper.find('.n-chat-input__char-count').text()).toBe('5/100');
    });

    it('shows streaming status when streaming', () => {
      const wrapper = mount(MessageInput, {
        props: {
          ...defaultProps,
          isStreaming: true
        }
      });

      expect(wrapper.find('.n-chat-input__streaming-status').exists()).toBe(true);
      expect(wrapper.find('.n-chat-input__streaming-text').text()).toBe('Antwort wird generiert...');
    });

    it('shows editing status when editing', () => {
      const wrapper = mount(MessageInput, {
        props: {
          ...defaultProps,
          isEditing: true
        }
      });

      expect(wrapper.find('.n-chat-input__editing-status').exists()).toBe(true);
      expect(wrapper.find('.n-chat-input__editing-text').text()).toBe('Nachricht bearbeiten');
    });
  });

  describe('User Interactions', () => {
    it('updates modelValue on input', async () => {
      const wrapper = mount(MessageInput, {
        props: defaultProps
      });

      const textarea = wrapper.find('.n-chat-input__textarea');
      await textarea.setValue('Hello, world!');

      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Hello, world!']);
    });

    it('emits submit event on Enter key', async () => {
      const wrapper = mount(MessageInput, {
        props: {
          ...defaultProps,
          modelValue: 'Test message'
        }
      });

      const textarea = wrapper.find('.n-chat-input__textarea');
      await textarea.trigger('keydown', { key: 'Enter', shiftKey: false });

      expect(wrapper.emitted('submit')?.[0]).toEqual(['Test message']);
    });

    it('allows new line with Shift+Enter', async () => {
      const wrapper = mount(MessageInput, {
        props: defaultProps
      });

      const textarea = wrapper.find('.n-chat-input__textarea');
      await textarea.trigger('keydown', { key: 'Enter', shiftKey: true });

      expect(wrapper.emitted('submit')).toBeUndefined();
    });

    it('emits submit on send button click', async () => {
      const wrapper = mount(MessageInput, {
        props: {
          ...defaultProps,
          modelValue: 'Test message'
        }
      });

      const sendButton = wrapper.find('.n-chat-input__send-btn');
      await sendButton.trigger('click');

      expect(wrapper.emitted('submit')?.[0]).toEqual(['Test message']);
    });

    it('disables send button when input is empty', () => {
      const wrapper = mount(MessageInput, {
        props: {
          ...defaultProps,
          modelValue: ''
        }
      });

      const sendButton = wrapper.find('.n-chat-input__send-btn');
      expect(sendButton.attributes('disabled')).toBeDefined();
    });

    it('disables send button when streaming', () => {
      const wrapper = mount(MessageInput, {
        props: {
          ...defaultProps,
          modelValue: 'Test',
          isStreaming: true
        }
      });

      const sendButton = wrapper.find('.n-chat-input__send-btn');
      expect(sendButton.attributes('disabled')).toBeDefined();
    });

    it('emits stop-stream event when cancel button clicked', async () => {
      const wrapper = mount(MessageInput, {
        props: {
          ...defaultProps,
          isStreaming: true
        }
      });

      const stopButton = wrapper.find('.n-chat-input__stop-btn');
      await stopButton.trigger('click');

      expect(wrapper.emitted('stop-stream')).toBeDefined();
    });

    it('emits cancel-edit event when cancel edit clicked', async () => {
      const wrapper = mount(MessageInput, {
        props: {
          ...defaultProps,
          isEditing: true
        }
      });

      const cancelButton = wrapper.find('.n-chat-input__cancel-btn');
      await cancelButton.trigger('click');

      expect(wrapper.emitted('cancel-edit')).toBeDefined();
    });
  });

  describe('Auto-resize behavior', () => {
    it('adjusts height based on content', async () => {
      const wrapper = mount(MessageInput, {
        props: {
          ...defaultProps,
          minHeight: 50,
          maxHeight: 200,
          initialHeight: 50
        }
      });

      const textarea = wrapper.find('.n-chat-input__textarea').element as HTMLTextAreaElement;
      
      // Mock scrollHeight
      Object.defineProperty(textarea, 'scrollHeight', {
        configurable: true,
        value: 100
      });

      // Trigger resize
      await textarea.dispatchEvent(new Event('input'));
      await nextTick();

      expect(textarea.style.height).toBe('100px');
    });

    it('respects max height limit', async () => {
      const wrapper = mount(MessageInput, {
        props: {
          ...defaultProps,
          maxHeight: 150
        }
      });

      const textarea = wrapper.find('.n-chat-input__textarea').element as HTMLTextAreaElement;
      
      // Mock large scrollHeight
      Object.defineProperty(textarea, 'scrollHeight', {
        configurable: true,
        value: 300
      });

      await textarea.dispatchEvent(new Event('input'));
      await nextTick();

      expect(textarea.style.height).toBe('150px');
    });
  });

  describe('Template handling', () => {
    it('shows templates when enabled', () => {
      const templates = [
        { label: 'Hello', content: 'Hello, how can I help?' },
        { label: 'Thanks', content: 'Thank you!' }
      ];

      const wrapper = mount(MessageInput, {
        props: {
          ...defaultProps,
          showTemplates: true,
          templates
        }
      });

      expect(wrapper.find('.n-chat-input__templates').exists()).toBe(true);
      expect(wrapper.findAll('.n-chat-input__template-btn')).toHaveLength(2);
    });

    it('applies template on click', async () => {
      const templates = [
        { label: 'Hello', content: 'Hello, how can I help?' }
      ];

      const wrapper = mount(MessageInput, {
        props: {
          ...defaultProps,
          showTemplates: true,
          templates
        }
      });

      const templateButton = wrapper.find('.n-chat-input__template-btn');
      await templateButton.trigger('click');

      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Hello, how can I help?']);
    });
  });

  describe('Focus behavior', () => {
    it('emits focus event on textarea focus', async () => {
      const wrapper = mount(MessageInput, {
        props: defaultProps
      });

      const textarea = wrapper.find('.n-chat-input__textarea');
      await textarea.trigger('focus');

      expect(wrapper.emitted('focus')).toBeDefined();
      expect(wrapper.find('.n-chat-input--focused').exists()).toBe(true);
    });

    it('emits blur event on textarea blur', async () => {
      const wrapper = mount(MessageInput, {
        props: defaultProps
      });

      const textarea = wrapper.find('.n-chat-input__textarea');
      await textarea.trigger('focus');
      await textarea.trigger('blur');

      expect(wrapper.emitted('blur')).toBeDefined();
      expect(wrapper.find('.n-chat-input--focused').exists()).toBe(false);
    });

    it('loses focus when streaming starts', async () => {
      const wrapper = mount(MessageInput, {
        props: defaultProps
      });

      const textarea = wrapper.find('.n-chat-input__textarea');
      const element = textarea.element as HTMLTextAreaElement;
      element.focus();
      
      // Mock blur method
      const blurSpy = vi.spyOn(element, 'blur');

      await wrapper.setProps({ isStreaming: true });
      await nextTick();

      expect(blurSpy).toHaveBeenCalled();
    });
  });

  describe('Draft handling', () => {
    it('saves draft on blur', async () => {
      vi.useFakeTimers();
      
      const wrapper = mount(MessageInput, {
        props: {
          ...defaultProps,
          modelValue: 'Draft content'
        }
      });

      const textarea = wrapper.find('.n-chat-input__textarea');
      await textarea.trigger('blur');

      // Fast forward timers
      vi.advanceTimersByTime(500);

      expect(wrapper.emitted('draft-change')?.[0]).toEqual(['Draft content']);
      
      vi.useRealTimers();
    });

    it('clears draft on submit', async () => {
      const wrapper = mount(MessageInput, {
        props: {
          ...defaultProps,
          modelValue: 'Test message'
        }
      });

      const sendButton = wrapper.find('.n-chat-input__send-btn');
      await sendButton.trigger('click');

      expect(wrapper.emitted('draft-change')?.[0]).toEqual(['']);
    });
  });

  describe('Error and hint display', () => {
    it('displays error message', () => {
      const wrapper = mount(MessageInput, {
        props: {
          ...defaultProps,
          error: 'Invalid input'
        }
      });

      expect(wrapper.find('.n-chat-input__error').text()).toBe('Invalid input');
    });

    it('displays hint message', () => {
      const wrapper = mount(MessageInput, {
        props: {
          ...defaultProps,
          hint: 'Press Enter to send'
        }
      });

      expect(wrapper.find('.n-chat-input__hint').text()).toBe('Press Enter to send');
    });
  });

  describe('Accessibility', () => {
    it('has proper aria labels', () => {
      const wrapper = mount(MessageInput, {
        props: defaultProps
      });

      const textarea = wrapper.find('.n-chat-input__textarea');
      expect(textarea.attributes('aria-label')).toBe('Nachrichteneingabe');

      const sendButton = wrapper.find('.n-chat-input__send-btn');
      expect(sendButton.attributes('aria-label')).toBe('Nachricht senden');
    });

    it('marks error with proper role', () => {
      const wrapper = mount(MessageInput, {
        props: {
          ...defaultProps,
          error: 'Error message'
        }
      });

      const error = wrapper.find('.n-chat-input__error');
      expect(error.attributes('role')).toBe('alert');
    });
  });
});