import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { nextTick } from 'vue';
import AdminFeedback from '@/components/admin/tabs/AdminFeedback.vue';
import { useAdminFeedbackStore } from '@/stores/admin/feedback';

// Mock Chart.js
vi.mock('chart.js', () => {
  return {
    Chart: vi.fn().mockImplementation(() => ({
      destroy: vi.fn()
    })),
    registerables: []
  };
});

// Mock feedback statistics data
const mockStatsData = {
  total: 100,
  averageRating: 3.2,
  positiveCount: 70,
  negativeCount: 30,
  withCommentsCount: 25,
  bySource: {
    'chat': 45,
    'document-converter': 35,
    'admin': 20
  },
  byWeek: {
    '2023-04-10': 20,
    '2023-04-17': 25,
    '2023-04-24': 30,
    '2023-05-01': 25
  }
};

describe('Feedback Charts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.innerWidth to control responsive behavior
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024 // Desktop width by default
    });
  });

  it('should render charts when stats data is available', async () => {
    const wrapper = mount(AdminFeedback, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              'adminFeedback': {
                stats: mockStatsData,
                feedback: [],
                filter: {
                  startDate: null,
                  endDate: null,
                  onlyWithComments: false,
                  searchTerm: ''
                },
                loading: false
              }
            }
          })
        ],
        stubs: {
          'Dialog': true
        }
      }
    });

    // Verify the store was initialized
    const store = useAdminFeedbackStore();
    expect(store.fetchStats).toHaveBeenCalledOnce();

    // Verify chart containers are rendered
    expect(wrapper.find('[data-test="source-chart-container"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="trend-chart-container"]').exists()).toBe(true);
    
    // Check chart data preparation functions
    expect(wrapper.vm.prepareSourceChartData()).toEqual({
      labels: ['chat', 'document-converter', 'admin'],
      datasets: [expect.objectContaining({
        data: [45, 35, 20]
      })]
    });
    
    expect(wrapper.vm.prepareTrendChartData()).toEqual({
      labels: ['2023-04-10', '2023-04-17', '2023-04-24', '2023-05-01'],
      datasets: [expect.objectContaining({
        data: [20, 25, 30, 25]
      })]
    });
  });

  it('should handle responsive chart display based on window width', async () => {
    // Start with desktop width
    window.innerWidth = 1024;
    
    const wrapper = mount(AdminFeedback, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              'adminFeedback': {
                stats: mockStatsData,
                feedback: [],
                filter: {
                  startDate: null,
                  endDate: null,
                  onlyWithComments: false,
                  searchTerm: ''
                },
                loading: false
              }
            }
          })
        ],
        stubs: {
          'Dialog': true
        }
      }
    });

    // Check if charts are displayed side by side on desktop
    expect(wrapper.find('.chart-container.desktop-layout').exists()).toBe(true);
    
    // Simulate mobile width
    window.innerWidth = 500;
    
    // Manually trigger the resize event
    global.dispatchEvent(new Event('resize'));
    
    // Wait for the next tick to ensure the component reacts to the resize
    await nextTick();
    
    // Check if charts are displayed in a column on mobile
    expect(wrapper.find('.chart-container.mobile-layout').exists()).toBe(true);
  });

  it('should recreate charts when stats data changes', async () => {
    const wrapper = mount(AdminFeedback, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              'adminFeedback': {
                stats: mockStatsData,
                feedback: [],
                filter: {
                  startDate: null,
                  endDate: null,
                  onlyWithComments: false,
                  searchTerm: ''
                },
                loading: false
              }
            }
          })
        ],
        stubs: {
          'Dialog': true
        }
      }
    });

    const store = useAdminFeedbackStore();
    
    // Mock to track chart creation and destruction
    let destroyCalled = 0;
    let createCalled = 0;
    
    // Mock for the chartsInitialized flag
    wrapper.vm.chartsInitialized = true;
    
    // Mock for chart instance and its destroy method
    wrapper.vm.sourceChart = { destroy: vi.fn().mockImplementation(() => { destroyCalled++; }) };
    wrapper.vm.trendChart = { destroy: vi.fn().mockImplementation(() => { destroyCalled++; }) };
    
    // Mock createCharts to track calls
    const originalCreateCharts = wrapper.vm.createCharts;
    wrapper.vm.createCharts = vi.fn().mockImplementation(() => {
      createCalled++;
      return originalCreateCharts.call(wrapper.vm);
    });
    
    // Update store stats
    const updatedStats = {
      ...mockStatsData,
      bySource: {
        'chat': 50,
        'document-converter': 40,
        'admin': 10
      },
      byWeek: {
        '2023-04-10': 15,
        '2023-04-17': 20,
        '2023-04-24': 35,
        '2023-05-01': 30
      }
    };
    
    // Simulate stats update
    vi.spyOn(store, 'stats', 'get').mockReturnValue(updatedStats);
    
    // Trigger watcher by forcing component update
    wrapper.vm.$forceUpdate();
    await nextTick();
    
    // Check if charts were destroyed and recreated
    expect(destroyCalled).toBeGreaterThan(0);
    expect(createCalled).toBeGreaterThan(0);
    
    // Verify new chart data matches updated stats
    expect(wrapper.vm.prepareSourceChartData()).toEqual({
      labels: ['chat', 'document-converter', 'admin'],
      datasets: [expect.objectContaining({
        data: [50, 40, 10]
      })]
    });
  });

  it('should display loading state when store is loading', async () => {
    const wrapper = mount(AdminFeedback, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              'adminFeedback': {
                stats: null,
                feedback: [],
                filter: {
                  startDate: null,
                  endDate: null,
                  onlyWithComments: false,
                  searchTerm: ''
                },
                loading: true
              }
            }
          })
        ],
        stubs: {
          'Dialog': true
        }
      }
    });

    // Verify loading indicator is shown
    expect(wrapper.find('[data-test="loading-indicator"]').exists()).toBe(true);
    
    // Update loading state
    const store = useAdminFeedbackStore();
    vi.spyOn(store, 'loading', 'get').mockReturnValue(false);
    vi.spyOn(store, 'stats', 'get').mockReturnValue(mockStatsData);
    
    // Trigger reactivity
    wrapper.vm.$forceUpdate();
    await nextTick();
    
    // Verify loading indicator is hidden and charts are shown
    expect(wrapper.find('[data-test="loading-indicator"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="stats-section"]').exists()).toBe(true);
  });

  it('should format dates correctly in trend chart', () => {
    const wrapper = mount(AdminFeedback, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              'adminFeedback': {
                stats: mockStatsData,
                feedback: [],
                filter: {
                  startDate: null,
                  endDate: null,
                  onlyWithComments: false,
                  searchTerm: ''
                },
                loading: false
              }
            }
          })
        ],
        stubs: {
          'Dialog': true
        }
      }
    });

    // Call the formatDate method with a date string
    const formattedDate = wrapper.vm.formatDateForDisplay('2023-04-10');
    
    // Check if date is formatted correctly - the exact format may vary based on implementation
    expect(formattedDate).toMatch(/^(0?[1-9]|[12][0-9]|3[01])[\/\-\.](0?[1-9]|1[012])[\/\-\.]\d{4}$|^\d{4}[\/\-\.](0?[1-9]|1[012])[\/\-\.](0?[1-9]|[12][0-9]|3[01])$/);
  });
});