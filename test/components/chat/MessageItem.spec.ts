import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import MessageItem from '@/components/chat/MessageItem.vue';

// Mock dependencies
vi.mock('@/composables/useDialog', () => ({
  useGlobalDialog: vi.fn(() => ({
    confirm: vi.fn().mockResolvedValue(true)
  }))
}));

vi.mock('@/composables/useI18n', () => ({
  useI18n: vi.fn(() => ({
    t: (key: string, fallback: string) => fallback || key
  }))
}));

// Default test message
const createDefaultMessage = (overrides = {}) => ({
  id: 'msg-1',
  content: 'This is a test message',
  role: 'user',
  timestamp: new Date('2025-05-08T14:30:00Z').toISOString(),
  isError: false,
  ...overrides
});

// Helper to create wrapper with default props
const createWrapper = (props = {}) => {
  return mount(MessageItem, {
    props: {
      message: createDefaultMessage(),
      isActive: false,
      ...props
    }
  });
};

describe('MessageItem.vue', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  // Rendering Tests
  describe('Rendering', () => {
    it('renders the message content correctly', () => {
      const wrapper = createWrapper();
      
      expect(wrapper.find('.message-item').exists()).toBe(true);
      expect(wrapper.find('.message-content').text()).toBe('This is a test message');
    });
    
    it('applies appropriate class based on message role', () => {
      const userMessage = createWrapper({
        message: createDefaultMessage({ role: 'user' })
      });
      
      const assistantMessage = createWrapper({
        message: createDefaultMessage({ role: 'assistant' })
      });
      
      expect(userMessage.find('.message-item').classes()).toContain('message-user');
      expect(assistantMessage.find('.message-item').classes()).toContain('message-assistant');
    });
    
    it('shows error styles for error messages', () => {
      const wrapper = createWrapper({
        message: createDefaultMessage({ isError: true })
      });
      
      expect(wrapper.find('.message-item').classes()).toContain('message-error');
      expect(wrapper.find('.error-icon').exists()).toBe(true);
    });
    
    it('displays timestamp in correct format', () => {
      const timestamp = new Date('2025-05-08T14:30:00Z').toISOString();
      const wrapper = createWrapper({
        message: createDefaultMessage({ timestamp })
      });
      
      // Default format in German locale
      expect(wrapper.find('.message-time').text()).toContain('14:30');
    });
    
    it('shows actions only when message is active', () => {
      const inactiveWrapper = createWrapper();
      const activeWrapper = createWrapper({ isActive: true });
      
      expect(inactiveWrapper.find('.message-actions').exists()).toBe(false);
      expect(activeWrapper.find('.message-actions').exists()).toBe(true);
    });
    
    it('renders system messages differently', () => {
      const wrapper = createWrapper({
        message: createDefaultMessage({ role: 'system' })
      });
      
      expect(wrapper.find('.message-item').classes()).toContain('message-system');
    });
    
    it('renders markdown content when enabled', () => {
      const wrapper = createWrapper({
        message: createDefaultMessage({ 
          content: '**Bold text** and [link](https://example.com)',
          enableMarkdown: true
        })
      });
      
      expect(wrapper.find('strong').exists()).toBe(true);
      expect(wrapper.find('a').exists()).toBe(true);
    });
  });
  
  // Interaction Tests
  describe('Interactions', () => {
    it('emits select event when message is clicked', async () => {
      const wrapper = createWrapper();
      
      await wrapper.find('.message-item').trigger('click');
      
      expect(wrapper.emitted()).toHaveProperty('select');
      expect(wrapper.emitted('select')?.[0][0]).toBe('msg-1');
    });
    
    it('emits copy event when copy button is clicked', async () => {
      const wrapper = createWrapper({ isActive: true });
      const copyButton = wrapper.find('[data-action="copy"]');
      
      expect(copyButton.exists()).toBe(true);
      await copyButton.trigger('click');
      
      expect(wrapper.emitted()).toHaveProperty('copy');
      expect(wrapper.emitted('copy')?.[0][0]).toBe('msg-1');
    });
    
    it('does not emit click events when clicking action buttons', async () => {
      const wrapper = createWrapper({ isActive: true });
      
      await wrapper.find('[data-action="copy"]').trigger('click');
      
      // Should emit copy but not select
      expect(wrapper.emitted()).toHaveProperty('copy');
      expect(wrapper.emitted('select')).toBeFalsy();
    });
    
    it('emits delete event after confirmation', async () => {
      const mockDialogConfirm = vi.fn().mockResolvedValue(true);
      const { useGlobalDialog } = await import('@/composables/useDialog');
      vi.mocked(useGlobalDialog).mockReturnValue({
        confirm: mockDialogConfirm
      });
      
      const wrapper = createWrapper({ isActive: true });
      await wrapper.find('[data-action="delete"]').trigger('click');
      
      expect(mockDialogConfirm).toHaveBeenCalled();
      expect(wrapper.emitted()).toHaveProperty('delete');
      expect(wrapper.emitted('delete')?.[0][0]).toBe('msg-1');
    });
    
    it('does not emit delete event when confirmation is cancelled', async () => {
      const mockDialogConfirm = vi.fn().mockResolvedValue(false);
      const { useGlobalDialog } = await import('@/composables/useDialog');
      vi.mocked(useGlobalDialog).mockReturnValue({
        confirm: mockDialogConfirm
      });
      
      const wrapper = createWrapper({ isActive: true });
      await wrapper.find('[data-action="delete"]').trigger('click');
      
      expect(mockDialogConfirm).toHaveBeenCalled();
      expect(wrapper.emitted('delete')).toBeFalsy();
    });
    
    it('emits edit event when edit button is clicked', async () => {
      const wrapper = createWrapper({ 
        isActive: true,
        message: createDefaultMessage({ role: 'user' }) // Only user messages can be edited
      });
      
      await wrapper.find('[data-action="edit"]').trigger('click');
      
      expect(wrapper.emitted()).toHaveProperty('edit');
      expect(wrapper.emitted('edit')?.[0][0]).toBe('msg-1');
    });
  });
  
  // Accessibility Tests
  describe('Accessibility', () => {
    it('has appropriate aria attributes', () => {
      const wrapper = createWrapper();
      
      expect(wrapper.find('.message-item').attributes('role')).toBe('listitem');
      expect(wrapper.find('.message-item').attributes('aria-labelledby')).toBeDefined();
    });
    
    it('marks error messages with aria-invalid', () => {
      const wrapper = createWrapper({
        message: createDefaultMessage({ isError: true })
      });
      
      expect(wrapper.find('.message-item').attributes('aria-invalid')).toBe('true');
    });
    
    it('has accessible action buttons', () => {
      const wrapper = createWrapper({ isActive: true });
      
      const copyButton = wrapper.find('[data-action="copy"]');
      const deleteButton = wrapper.find('[data-action="delete"]');
      
      expect(copyButton.attributes('aria-label')).toBeDefined();
      expect(deleteButton.attributes('aria-label')).toBeDefined();
    });
    
    it('has accessible timestamp', () => {
      const timestamp = new Date('2025-05-08T14:30:00Z').toISOString();
      const wrapper = createWrapper({
        message: createDefaultMessage({ timestamp })
      });
      
      expect(wrapper.find('.message-time').attributes('title')).toBeDefined();
      expect(wrapper.find('.message-time').attributes('aria-label')).toBeDefined();
    });
  });
  
  // Slot Tests
  describe('Slots', () => {
    it('renders avatar slot content', () => {
      const wrapper = mount(MessageItem, {
        props: {
          message: createDefaultMessage()
        },
        slots: {
          avatar: '<div class="custom-avatar">A</div>'
        }
      });
      
      expect(wrapper.find('.custom-avatar').exists()).toBe(true);
    });
    
    it('renders custom actions when provided', () => {
      const wrapper = mount(MessageItem, {
        props: {
          message: createDefaultMessage(),
          isActive: true
        },
        slots: {
          actions: '<button class="custom-action">Custom Action</button>'
        }
      });
      
      expect(wrapper.find('.custom-action').exists()).toBe(true);
    });
    
    it('renders additional content in footer slot', () => {
      const wrapper = mount(MessageItem, {
        props: {
          message: createDefaultMessage()
        },
        slots: {
          footer: '<div class="message-footer-content">Additional information</div>'
        }
      });
      
      expect(wrapper.find('.message-footer-content').exists()).toBe(true);
      expect(wrapper.find('.message-footer-content').text()).toBe('Additional information');
    });
  });
  
  // Edge Cases
  describe('Edge Cases', () => {
    it('handles messages with empty content', () => {
      const wrapper = createWrapper({
        message: createDefaultMessage({ content: '' })
      });
      
      expect(wrapper.find('.message-content').exists()).toBe(true);
      expect(wrapper.find('.message-content').text()).toBe('');
    });
    
    it('handles messages with HTML content safely', () => {
      const wrapper = createWrapper({
        message: createDefaultMessage({ 
          content: '<script>alert("XSS")</script><b>Bold</b>',
          enableMarkdown: false
        })
      });
      
      // HTML should be escaped when markdown is disabled
      expect(wrapper.find('script').exists()).toBe(false);
      expect(wrapper.find('b').exists()).toBe(false);
      expect(wrapper.find('.message-content').text()).toContain('<script>');
    });
    
    it('handles extremely long messages', () => {
      const longContent = 'A'.repeat(10000);
      const wrapper = createWrapper({
        message: createDefaultMessage({ content: longContent })
      });
      
      expect(wrapper.find('.message-content').text().length).toBe(10000);
    });
    
    it('handles missing timestamp', () => {
      const wrapper = createWrapper({
        message: createDefaultMessage({ timestamp: undefined })
      });
      
      // Should still render without crashing
      expect(wrapper.find('.message-item').exists()).toBe(true);
    });
  });
});