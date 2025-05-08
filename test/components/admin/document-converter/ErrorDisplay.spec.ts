import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ErrorDisplay from '@/components/admin/document-converter/ErrorDisplay.vue';

// Helper to create wrapper with default props
const createWrapper = (props = {}) => {
  return mount(ErrorDisplay, {
    props: {
      error: 'Default error message',
      ...props
    },
    global: {
      mocks: {
        $t: (key: string) => key // Using i18n mock from setup.ts
      }
    }
  });
};

describe('ErrorDisplay.vue', () => {
  // Rendering tests
  describe('Rendering', () => {
    it('renders correctly with a string error', () => {
      const errorMessage = 'Test error message';
      const wrapper = createWrapper({ error: errorMessage });
      
      expect(wrapper.find('.error-display').exists()).toBe(true);
      expect(wrapper.find('.error-message').text()).toBe(errorMessage);
      expect(wrapper.find('.error-icon').exists()).toBe(true);
      expect(wrapper.find('.error-title').exists()).toBe(true);
    });
    
    it('renders correctly with an Error object', () => {
      const errorObj = new Error('Test error from Error object');
      const wrapper = createWrapper({ error: errorObj });
      
      expect(wrapper.find('.error-message').text()).toBe('Test error from Error object');
    });
    
    it('renders correctly with an ErrorObject', () => {
      const errorObj = {
        message: 'Test error from ErrorObject',
        code: 'TEST_ERROR',
        type: 'network' as const
      };
      
      const wrapper = createWrapper({ error: errorObj });
      
      expect(wrapper.find('.error-message').text()).toBe('Test error from ErrorObject');
      expect(wrapper.find('.error-display').classes()).toContain('error-display--network');
    });
    
    it('applies the correct error type class', () => {
      const errorTypes = ['network', 'format', 'server', 'permission', 'unknown'];
      
      errorTypes.forEach(type => {
        const wrapper = createWrapper({ errorType: type });
        expect(wrapper.find('.error-display').classes()).toContain(`error-display--${type}`);
      });
    });
    
    it('shows error details section when showDetails is true', () => {
      const wrapper = createWrapper({ 
        error: new Error('Test error'),
        showDetails: true 
      });
      
      expect(wrapper.find('.error-details').exists()).toBe(true);
    });
    
    it('hides error details section by default', () => {
      const wrapper = createWrapper({ 
        error: new Error('Test error') 
      });
      
      // The details container exists but the content should be hidden
      const detailsToggle = wrapper.find('.toggle-details-btn');
      expect(detailsToggle.exists()).toBe(false);
    });

    it('conditionally renders retry button based on canRetry prop', () => {
      const wrapperWithRetry = createWrapper({ canRetry: true });
      expect(wrapperWithRetry.find('.retry-btn').exists()).toBe(true);
      
      const wrapperWithoutRetry = createWrapper({ canRetry: false });
      expect(wrapperWithoutRetry.find('.retry-btn').exists()).toBe(false);
    });
    
    it('conditionally renders contact support button based on canContactSupport prop', () => {
      const wrapperWithSupport = createWrapper({ canContactSupport: true });
      expect(wrapperWithSupport.find('.support-btn').exists()).toBe(true);
      
      const wrapperWithoutSupport = createWrapper({ canContactSupport: false });
      expect(wrapperWithoutSupport.find('.support-btn').exists()).toBe(false);
    });
    
    it('conditionally renders fallback button based on showFallbackOption prop', () => {
      const wrapperWithFallback = createWrapper({ showFallbackOption: true });
      expect(wrapperWithFallback.find('.fallback-btn').exists()).toBe(true);
      
      const wrapperWithoutFallback = createWrapper({ showFallbackOption: false });
      expect(wrapperWithoutFallback.find('.fallback-btn').exists()).toBe(false);
    });
  });
  
  // Interaction tests
  describe('Interactions', () => {
    it('toggles error details visibility when toggle button is clicked', async () => {
      const wrapper = createWrapper({ 
        error: { 
          message: 'Test error', 
          details: 'Detailed error information'
        } 
      });
      
      // Initially details should not be visible
      expect(wrapper.find('.error-details-content').exists()).toBe(false);
      
      // Click the toggle button
      await wrapper.find('.toggle-details-btn').trigger('click');
      
      // Now details should be visible
      expect(wrapper.find('.error-details-content').exists()).toBe(true);
      
      // Click again to hide
      await wrapper.find('.toggle-details-btn').trigger('click');
      
      // Details should be hidden again
      expect(wrapper.find('.error-details-content').exists()).toBe(false);
    });
    
    it('emits retry event when retry button is clicked', async () => {
      const wrapper = createWrapper();
      
      await wrapper.find('.retry-btn').trigger('click');
      
      expect(wrapper.emitted()).toHaveProperty('retry');
      expect(wrapper.emitted('retry')).toHaveLength(1);
    });
    
    it('emits contact-support event when support button is clicked', async () => {
      const wrapper = createWrapper({ canContactSupport: true });
      
      await wrapper.find('.support-btn').trigger('click');
      
      expect(wrapper.emitted()).toHaveProperty('contact-support');
      expect(wrapper.emitted('contact-support')).toHaveLength(1);
    });
    
    it('emits fallback event when fallback button is clicked', async () => {
      const wrapper = createWrapper({ showFallbackOption: true });
      
      await wrapper.find('.fallback-btn').trigger('click');
      
      expect(wrapper.emitted()).toHaveProperty('fallback');
      expect(wrapper.emitted('fallback')).toHaveLength(1);
    });
  });
  
  // Props tests
  describe('Props', () => {
    it('uses default props when not provided', () => {
      const wrapper = createWrapper();
      
      // Test default error type class
      expect(wrapper.find('.error-display').classes()).toContain('error-display--unknown');
      
      // Test retry button presence (default is true)
      expect(wrapper.find('.retry-btn').exists()).toBe(true);
      
      // Test support button absence (default is false)
      expect(wrapper.find('.support-btn').exists()).toBe(false);
      
      // Test fallback button absence (default is false)
      expect(wrapper.find('.fallback-btn').exists()).toBe(false);
    });
    
    it('correctly determines error type from error message content', () => {
      const networkError = createWrapper({ 
        error: 'Network connection error occurred',
        errorType: 'unknown' // This should be overridden by the content
      });
      
      const formatError = createWrapper({ 
        error: 'File format is not supported',
        errorType: 'unknown'
      });
      
      const serverError = createWrapper({ 
        error: 'Server is temporarily unavailable',
        errorType: 'unknown'
      });
      
      const permissionError = createWrapper({ 
        error: 'Access permission denied',
        errorType: 'unknown'
      });
      
      // Check that error types are correctly determined from the content
      expect(networkError.find('.error-display').classes()).toContain('error-display--network');
      expect(formatError.find('.error-display').classes()).toContain('error-display--format');
      expect(serverError.find('.error-display').classes()).toContain('error-display--server');
      expect(permissionError.find('.error-display').classes()).toContain('error-display--permission');
    });
    
    it('prioritizes explicit errorType prop over detected type', () => {
      const wrapper = createWrapper({
        error: 'Network connection error occurred', // Would normally be detected as 'network'
        errorType: 'server' // Should override the detection
      });
      
      expect(wrapper.find('.error-display').classes()).toContain('error-display--server');
    });
  });
  
  // Edge cases tests
  describe('Edge cases', () => {
    it('handles null or undefined error gracefully', () => {
      // @ts-expect-error - Testing edge case with invalid prop
      const wrapperWithNull = createWrapper({ error: null });
      expect(wrapperWithNull.find('.error-message').text()).toBe('errorDisplay.defaultMessage');
      
      // @ts-expect-error - Testing edge case with invalid prop
      const wrapperWithUndefined = createWrapper({ error: undefined });
      expect(wrapperWithUndefined.find('.error-message').text()).toBe('errorDisplay.defaultMessage');
    });
    
    it('handles non-standard error objects', () => {
      const customError = {
        foo: 'bar',
        baz: 123
      };
      
      // @ts-expect-error - Testing edge case with invalid prop
      const wrapper = createWrapper({ error: customError });
      
      // Should fall back to default message
      expect(wrapper.find('.error-message').text()).toBe('errorDisplay.defaultMessage');
      
      // Should use unknown error type
      expect(wrapper.find('.error-display').classes()).toContain('error-display--unknown');
    });
    
    it('sanitizes error details for display', () => {
      const circularObj: any = {};
      circularObj.self = circularObj; // Create circular reference
      
      const wrapper = createWrapper({
        error: {
          message: 'Error with circular reference',
          details: circularObj
        },
        showDetails: true
      });
      
      // Click to show details
      wrapper.find('.toggle-details-btn').trigger('click');
      
      // The component should handle the circular reference without crashing
      expect(wrapper.find('.error-details-content').exists()).toBe(true);
    });
  });
});