import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import FeatureWrapper from '@/components/shared/FeatureWrapper.vue';
import { useFeatureToggles } from '@/composables/useFeatureToggles';

// Mock dependencies
vi.mock('@/composables/useFeatureToggles', () => ({
  useFeatureToggles: vi.fn()
}));

// Mock components for testing
const NewComponent = {
  name: 'NewComponent',
  template: '<div class="new-component">New Implementation</div>'
};

const LegacyComponent = {
  name: 'LegacyComponent',
  template: '<div class="legacy-component">Legacy Implementation</div>'
};

// Error throwing component for testing error handling
const ErrorComponent = {
  name: 'ErrorComponent',
  setup() {
    throw new Error('Test error');
  },
  template: '<div>Error Component</div>'
};

describe('FeatureWrapper.vue', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  describe('Feature Toggle Behavior', () => {
    it('shows new component when feature is enabled', () => {
      // Mock feature toggle to be enabled
      vi.mocked(useFeatureToggles).mockReturnValue({
        isEnabled: vi.fn().mockReturnValue(true)
      });
      
      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: 'testFeature',
          newComponent: NewComponent,
          legacyComponent: LegacyComponent
        }
      });
      
      expect(wrapper.findComponent(NewComponent).exists()).toBe(true);
      expect(wrapper.findComponent(LegacyComponent).exists()).toBe(false);
    });
    
    it('shows legacy component when feature is disabled', () => {
      // Mock feature toggle to be disabled
      vi.mocked(useFeatureToggles).mockReturnValue({
        isEnabled: vi.fn().mockReturnValue(false)
      });
      
      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: 'testFeature',
          newComponent: NewComponent,
          legacyComponent: LegacyComponent
        }
      });
      
      expect(wrapper.findComponent(LegacyComponent).exists()).toBe(true);
      expect(wrapper.findComponent(NewComponent).exists()).toBe(false);
    });
    
    it('calls isEnabled with correct feature name', () => {
      const isEnabledMock = vi.fn().mockReturnValue(true);
      vi.mocked(useFeatureToggles).mockReturnValue({
        isEnabled: isEnabledMock
      });
      
      mount(FeatureWrapper, {
        props: {
          feature: 'testFeature',
          newComponent: NewComponent,
          legacyComponent: LegacyComponent
        }
      });
      
      expect(isEnabledMock).toHaveBeenCalledWith('testFeature');
    });
    
    it('shows nothing when both components are undefined and renderEmpty is false', () => {
      vi.mocked(useFeatureToggles).mockReturnValue({
        isEnabled: vi.fn().mockReturnValue(true)
      });
      
      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: 'testFeature',
          renderEmpty: false
        }
      });
      
      expect(wrapper.html()).toBe('');
    });
    
    it('shows new component with renderEmpty true even when legacy is undefined', () => {
      vi.mocked(useFeatureToggles).mockReturnValue({
        isEnabled: vi.fn().mockReturnValue(true)
      });
      
      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: 'testFeature',
          newComponent: NewComponent,
          renderEmpty: true
        }
      });
      
      expect(wrapper.findComponent(NewComponent).exists()).toBe(true);
    });
  });
  
  describe('Error Handling', () => {
    it('falls back to legacy component when new component throws an error and autoFallback is true', async () => {
      // Mock feature toggle to be enabled
      const reportFeatureErrorMock = vi.fn();
      vi.mocked(useFeatureToggles).mockReturnValue({
        isEnabled: vi.fn().mockReturnValue(true),
        reportFeatureError: reportFeatureErrorMock
      });
      
      // Suppress expected console error from thrown error
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: 'testFeature',
          newComponent: ErrorComponent,
          legacyComponent: LegacyComponent,
          captureErrors: true,
          autoFallback: true
        }
      });
      
      // Should fall back to legacy component
      expect(wrapper.findComponent(LegacyComponent).exists()).toBe(true);
      
      // Should report the error
      expect(reportFeatureErrorMock).toHaveBeenCalled();
      expect(reportFeatureErrorMock.mock.calls[0][0]).toBe('testFeature');
      expect(reportFeatureErrorMock.mock.calls[0][1]).toContain('Test error');
      
      errorSpy.mockRestore();
    });
    
    it('emits feature-error event when an error occurs', async () => {
      // Mock feature toggle to be enabled
      vi.mocked(useFeatureToggles).mockReturnValue({
        isEnabled: vi.fn().mockReturnValue(true),
        reportFeatureError: vi.fn()
      });
      
      // Suppress expected console error from thrown error
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: 'testFeature',
          newComponent: ErrorComponent,
          legacyComponent: LegacyComponent,
          captureErrors: true,
          autoFallback: false // Don't auto fallback
        }
      });
      
      // Should emit feature-error event
      expect(wrapper.emitted()).toHaveProperty('feature-error');
      expect(wrapper.emitted('feature-error')?.[0][0]).toBeInstanceOf(Error);
      expect(wrapper.emitted('feature-error')?.[0][0].message).toBe('Test error');
      
      errorSpy.mockRestore();
    });
    
    it('does not capture errors when captureErrors is false', async () => {
      vi.mocked(useFeatureToggles).mockReturnValue({
        isEnabled: vi.fn().mockReturnValue(true),
        reportFeatureError: vi.fn()
      });
      
      // Suppress expected console error from thrown error
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        mount(FeatureWrapper, {
          props: {
            feature: 'testFeature',
            newComponent: ErrorComponent,
            legacyComponent: LegacyComponent,
            captureErrors: false
          }
        });
      }).toThrow('Test error');
      
      errorSpy.mockRestore();
    });
  });
  
  describe('Fallback Functionality', () => {
    it('switches to legacy component when forceUseLegacy is true', async () => {
      // Mock feature toggle to be enabled
      vi.mocked(useFeatureToggles).mockReturnValue({
        isEnabled: vi.fn().mockReturnValue(true)
      });
      
      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: 'testFeature',
          newComponent: NewComponent,
          legacyComponent: LegacyComponent,
          forceUseLegacy: false
        }
      });
      
      // Initially should show new component
      expect(wrapper.findComponent(NewComponent).exists()).toBe(true);
      
      // Update prop to force legacy
      await wrapper.setProps({ forceUseLegacy: true });
      
      // Should now show legacy component
      expect(wrapper.findComponent(LegacyComponent).exists()).toBe(true);
      expect(wrapper.findComponent(NewComponent).exists()).toBe(false);
    });
    
    it('emits feature-fallback event when falling back', async () => {
      // Mock feature toggle to be enabled
      vi.mocked(useFeatureToggles).mockReturnValue({
        isEnabled: vi.fn().mockReturnValue(true),
        reportFeatureError: vi.fn()
      });
      
      // Suppress expected console error from thrown error
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: 'testFeature',
          newComponent: ErrorComponent,
          legacyComponent: LegacyComponent,
          captureErrors: true,
          autoFallback: true
        }
      });
      
      // Should emit feature-fallback event
      expect(wrapper.emitted()).toHaveProperty('feature-fallback');
      expect(wrapper.emitted('feature-fallback')?.[0][0]).toBe('testFeature');
      
      errorSpy.mockRestore();
    });
    
    it('does not render legacy component when it is not provided and error occurs', async () => {
      // Mock feature toggle to be enabled
      vi.mocked(useFeatureToggles).mockReturnValue({
        isEnabled: vi.fn().mockReturnValue(true),
        reportFeatureError: vi.fn()
      });
      
      // Suppress expected console error from thrown error
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: 'testFeature',
          newComponent: ErrorComponent,
          captureErrors: true,
          autoFallback: true
        }
      });
      
      // Should render nothing when falling back with no legacy component
      expect(wrapper.html()).toBe('');
      
      errorSpy.mockRestore();
    });
  });
  
  describe('Props Passing', () => {
    it('passes props to new component when enabled', () => {
      // Mock feature toggle to be enabled
      vi.mocked(useFeatureToggles).mockReturnValue({
        isEnabled: vi.fn().mockReturnValue(true)
      });
      
      const PropsTestComponent = {
        name: 'PropsTestComponent',
        props: ['testProp'],
        template: '<div>{{ testProp }}</div>'
      };
      
      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: 'testFeature',
          newComponent: PropsTestComponent,
          legacyComponent: LegacyComponent,
          componentProps: {
            testProp: 'test value'
          }
        }
      });
      
      const newComponent = wrapper.findComponent(PropsTestComponent);
      expect(newComponent.props('testProp')).toBe('test value');
    });
    
    it('passes props to legacy component when disabled', () => {
      // Mock feature toggle to be disabled
      vi.mocked(useFeatureToggles).mockReturnValue({
        isEnabled: vi.fn().mockReturnValue(false)
      });
      
      const LegacyWithProps = {
        name: 'LegacyWithProps',
        props: ['testProp'],
        template: '<div>{{ testProp }}</div>'
      };
      
      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: 'testFeature',
          newComponent: NewComponent,
          legacyComponent: LegacyWithProps,
          componentProps: {
            testProp: 'test value'
          }
        }
      });
      
      const legacyComponent = wrapper.findComponent(LegacyWithProps);
      expect(legacyComponent.props('testProp')).toBe('test value');
    });
    
    it('passes dynamic props updates to the rendered component', async () => {
      // Mock feature toggle to be enabled
      vi.mocked(useFeatureToggles).mockReturnValue({
        isEnabled: vi.fn().mockReturnValue(true)
      });
      
      const PropsTestComponent = {
        name: 'PropsTestComponent',
        props: ['testProp'],
        template: '<div class="test-component">{{ testProp }}</div>'
      };
      
      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: 'testFeature',
          newComponent: PropsTestComponent,
          componentProps: {
            testProp: 'initial value'
          }
        }
      });
      
      // Check initial value
      expect(wrapper.find('.test-component').text()).toBe('initial value');
      
      // Update props
      await wrapper.setProps({
        componentProps: {
          testProp: 'updated value'
        }
      });
      
      // Check updated value
      expect(wrapper.find('.test-component').text()).toBe('updated value');
    });
  });
  
  describe('Events Handling', () => {
    it('forwards events from new component when enabled', async () => {
      // Mock feature toggle to be enabled
      vi.mocked(useFeatureToggles).mockReturnValue({
        isEnabled: vi.fn().mockReturnValue(true)
      });
      
      const EventComponent = {
        name: 'EventComponent',
        emits: ['test-event'],
        template: '<button @click="$emit(\'test-event\', \'event-data\')">Click me</button>'
      };
      
      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: 'testFeature',
          newComponent: EventComponent,
          legacyComponent: LegacyComponent
        }
      });
      
      // Trigger event in child component
      await wrapper.find('button').trigger('click');
      
      // Event should be forwarded
      expect(wrapper.emitted()).toHaveProperty('test-event');
      expect(wrapper.emitted('test-event')?.[0][0]).toBe('event-data');
    });
    
    it('forwards events from legacy component when disabled', async () => {
      // Mock feature toggle to be disabled
      vi.mocked(useFeatureToggles).mockReturnValue({
        isEnabled: vi.fn().mockReturnValue(false)
      });
      
      const LegacyEventComponent = {
        name: 'LegacyEventComponent',
        emits: ['test-event'],
        template: '<button @click="$emit(\'test-event\', \'legacy-event-data\')">Click me</button>'
      };
      
      const wrapper = mount(FeatureWrapper, {
        props: {
          feature: 'testFeature',
          newComponent: NewComponent,
          legacyComponent: LegacyEventComponent
        }
      });
      
      // Trigger event in child component
      await wrapper.find('button').trigger('click');
      
      // Event should be forwarded
      expect(wrapper.emitted()).toHaveProperty('test-event');
      expect(wrapper.emitted('test-event')?.[0][0]).toBe('legacy-event-data');
    });
  });
  
  describe('Feature Tracking', () => {
    it('tracks feature usage when trackUsage is true', () => {
      const trackFeatureUsageMock = vi.fn();
      vi.mocked(useFeatureToggles).mockReturnValue({
        isEnabled: vi.fn().mockReturnValue(true),
        trackFeatureUsage: trackFeatureUsageMock
      });
      
      mount(FeatureWrapper, {
        props: {
          feature: 'testFeature',
          newComponent: NewComponent,
          trackUsage: true
        }
      });
      
      expect(trackFeatureUsageMock).toHaveBeenCalledWith('testFeature');
    });
    
    it('does not track feature usage when trackUsage is false', () => {
      const trackFeatureUsageMock = vi.fn();
      vi.mocked(useFeatureToggles).mockReturnValue({
        isEnabled: vi.fn().mockReturnValue(true),
        trackFeatureUsage: trackFeatureUsageMock
      });
      
      mount(FeatureWrapper, {
        props: {
          feature: 'testFeature',
          newComponent: NewComponent,
          trackUsage: false
        }
      });
      
      expect(trackFeatureUsageMock).not.toHaveBeenCalled();
    });
  });
});