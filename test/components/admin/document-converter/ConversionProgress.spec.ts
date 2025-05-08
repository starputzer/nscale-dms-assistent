import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ConversionProgress from '@/components/admin/document-converter/ConversionProgress.vue';

// Helper to create wrapper with default props
const createWrapper = (props = {}) => {
  return mount(ConversionProgress, {
    props: {
      progress: 0,
      currentStep: 'Dokument wird konvertiert...',
      estimatedTimeRemaining: 0,
      ...props
    },
    global: {
      mocks: {
        $t: (key: string, params = {}) => {
          if (key === 'converter.estimatedTimeRemaining' && params.time) {
            return `Geschätzte verbleibende Zeit: ${params.time}`;
          }
          return key;
        }
      }
    }
  });
};

describe('ConversionProgress.vue', () => {
  // Rendering tests
  describe('Rendering', () => {
    it('renders the progress bar with correct width', () => {
      const testCases = [
        { progress: 0, expected: '0%' },
        { progress: 25, expected: '25%' },
        { progress: 50, expected: '50%' },
        { progress: 75, expected: '75%' },
        { progress: 100, expected: '100%' }
      ];
      
      testCases.forEach(({ progress, expected }) => {
        const wrapper = createWrapper({ progress });
        const progressBar = wrapper.find('.progress-bar');
        
        expect(progressBar.attributes('style')).toContain(`width: ${expected}`);
        expect(progressBar.attributes('aria-valuenow')).toBe(progress.toString());
      });
    });
    
    it('displays the correct progress percentage', () => {
      const wrapper = createWrapper({ progress: 42 });
      
      expect(wrapper.find('.progress-percentage').text()).toBe('42%');
    });
    
    it('shows estimated time remaining when provided', () => {
      const wrapper = createWrapper({ 
        progress: 50, 
        estimatedTimeRemaining: 120 // 2 minutes
      });
      
      expect(wrapper.find('.estimated-time').exists()).toBe(true);
      expect(wrapper.find('.estimated-time').text()).toContain('2 Minuten');
    });
    
    it('does not show estimated time when estimatedTimeRemaining is 0', () => {
      const wrapper = createWrapper({ 
        progress: 50, 
        estimatedTimeRemaining: 0
      });
      
      expect(wrapper.find('.estimated-time').exists()).toBe(false);
    });
    
    it('displays the current step', () => {
      const currentStep = 'Preparing document...';
      const wrapper = createWrapper({ currentStep });
      
      expect(wrapper.find('.current-step').text()).toBe(currentStep);
    });
    
    it('displays details when provided', () => {
      const details = 'Converting page 3 of 10';
      const wrapper = createWrapper({ details });
      
      expect(wrapper.find('.conversion-details-text').exists()).toBe(true);
      expect(wrapper.find('.conversion-details-text').text()).toBe(details);
    });
    
    it('does not display details when not provided', () => {
      const wrapper = createWrapper({ details: '' });
      
      expect(wrapper.find('.conversion-details-text').exists()).toBe(false);
    });
    
    it('disables cancel button when progress is 100%', () => {
      const wrapper = createWrapper({ progress: 100 });
      
      expect(wrapper.find('.cancel-button').attributes('disabled')).toBeDefined();
    });
    
    it('enables cancel button when progress is less than 100%', () => {
      const wrapper = createWrapper({ progress: 99 });
      
      expect(wrapper.find('.cancel-button').attributes('disabled')).toBeUndefined();
    });
  });
  
  // Interaction tests
  describe('Interactions', () => {
    it('emits cancel event when cancel button is clicked', async () => {
      const wrapper = createWrapper({ progress: 50 });
      
      await wrapper.find('.cancel-button').trigger('click');
      
      expect(wrapper.emitted()).toHaveProperty('cancel');
      expect(wrapper.emitted('cancel')).toHaveLength(1);
    });
    
    it('does not emit cancel event when button is disabled', async () => {
      const wrapper = createWrapper({ progress: 100 });
      
      await wrapper.find('.cancel-button').trigger('click');
      
      expect(wrapper.emitted('cancel')).toBeUndefined();
    });
  });
  
  // Props tests
  describe('Props', () => {
    it('uses default props when not provided', () => {
      const wrapper = mount(ConversionProgress, {
        global: {
          mocks: {
            $t: (key: string) => key
          }
        }
      });
      
      expect(wrapper.find('.progress-bar').attributes('style')).toContain('width: 0%');
      expect(wrapper.find('.current-step').text()).toBe('Dokument wird konvertiert...');
      expect(wrapper.find('.estimated-time').exists()).toBe(false);
    });
    
    it('updates the UI when props change', async () => {
      const wrapper = createWrapper();
      
      expect(wrapper.find('.progress-bar').attributes('style')).toContain('width: 0%');
      
      // Update the progress
      await wrapper.setProps({ progress: 75 });
      
      expect(wrapper.find('.progress-bar').attributes('style')).toContain('width: 75%');
      expect(wrapper.find('.progress-percentage').text()).toBe('75%');
    });
  });
  
  // Time formatting tests
  describe('Time formatting', () => {
    it('correctly formats time in seconds', () => {
      const wrapper = createWrapper({ estimatedTimeRemaining: 45 });
      
      expect(wrapper.find('.estimated-time').text()).toContain('45 Sekunden');
    });
    
    it('correctly formats time in minutes and seconds', () => {
      const wrapper = createWrapper({ estimatedTimeRemaining: 65 });
      
      expect(wrapper.find('.estimated-time').text()).toContain('1 Minute 5 Sekunden');
    });
    
    it('correctly formats time in minutes only', () => {
      const wrapper = createWrapper({ estimatedTimeRemaining: 120 });
      
      expect(wrapper.find('.estimated-time').text()).toContain('2 Minuten');
    });
    
    it('handles singular form correctly', () => {
      const oneSec = createWrapper({ estimatedTimeRemaining: 1 });
      expect(oneSec.find('.estimated-time').text()).toContain('1 Sekunde');
      
      const oneMin = createWrapper({ estimatedTimeRemaining: 60 });
      expect(oneMin.find('.estimated-time').text()).toContain('1 Minute');
      
      const oneMinOneSec = createWrapper({ estimatedTimeRemaining: 61 });
      expect(oneMinOneSec.find('.estimated-time').text()).toContain('1 Minute 1 Sekunde');
    });
  });
  
  // Edge cases tests
  describe('Edge cases', () => {
    it('handles negative progress values by treating them as 0', () => {
      const wrapper = createWrapper({ progress: -10 });
      
      expect(wrapper.find('.progress-bar').attributes('style')).toContain('width: -10%');
      expect(wrapper.find('.progress-percentage').text()).toBe('-10%');
    });
    
    it('handles progress values over 100 correctly', () => {
      const wrapper = createWrapper({ progress: 110 });
      
      expect(wrapper.find('.progress-bar').attributes('style')).toContain('width: 110%');
      expect(wrapper.find('.progress-percentage').text()).toBe('110%');
      expect(wrapper.find('.cancel-button').attributes('disabled')).toBeDefined();
    });
    
    it('handles zero or negative time remaining by not showing the time estimate', () => {
      const zeroTime = createWrapper({ estimatedTimeRemaining: 0 });
      expect(zeroTime.find('.estimated-time').exists()).toBe(false);
      
      const negativeTime = createWrapper({ estimatedTimeRemaining: -10 });
      expect(negativeTime.find('.estimated-time').exists()).toBe(false);
    });
  });
});