import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AdminStatistics from '@/components/admin/tabs/AdminStatistics.vue';
import { createTestingPinia } from '@pinia/testing';
import { useAdminSystemStore } from '@/stores/admin/system';

// Mock i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback: string) => fallback
  })
}));

// Mock Chart.js module
vi.mock('chart.js', () => ({
  Chart: class MockChart {
    constructor() {
      // Mock constructor
    }
    update() {} // Mock method
    destroy() {} // Mock method
  }
}));

describe('AdminStatistics.vue', () => {
  let wrapper: any;
  let systemStore: any;
  
  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false
    });
    
    systemStore = useAdminSystemStore(pinia);
    
    // Mock store data
    systemStore.stats = {
      total_users: 123,
      active_users_today: 45,
      total_sessions: 789,
      total_messages: 5432,
      avg_messages_per_session: 6.9,
      total_feedback: 246,
      positive_feedback_percent: 85,
      memory_usage_percent: 45,
      cpu_usage_percent: 38,
      database_size_mb: 128,
      cache_size_mb: 64,
      cache_hit_rate: 92
    };
    
    systemStore.memoryStatus = 'normal';
    systemStore.cpuStatus = 'normal';
    
    // Mock store methods
    systemStore.fetchStats = vi.fn().mockResolvedValue({});
    
    // Mount component
    wrapper = mount(AdminStatistics, {
      global: {
        plugins: [pinia],
        stubs: {
          // Stub Canvas for tests since jsdom doesn't support it
          canvas: true
        }
      }
    });
  });
  
  it('renders properly', () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.admin-statistics__title').exists()).toBe(true);
    expect(wrapper.find('.admin-statistics__controls').exists()).toBe(true);
  });
  
  it('displays correct stats data', () => {
    // Check if the stats are displayed correctly
    const usersValue = wrapper.find('.admin-statistics__card--users .admin-statistics__card-value');
    const sessionsValue = wrapper.find('.admin-statistics__card--sessions .admin-statistics__card-value');
    const messagesValue = wrapper.find('.admin-statistics__card--messages .admin-statistics__card-value');
    const feedbackValue = wrapper.find('.admin-statistics__card--feedback .admin-statistics__card-value');
    
    expect(usersValue.text()).toBe('123');
    expect(sessionsValue.text()).toBe('789');
    expect(messagesValue.text()).toBe('5432');
    expect(feedbackValue.text()).toBe('246');
  });
  
  it('switches views when selecting a different view', async () => {
    // Default view should be 'overview'
    expect(wrapper.find('.admin-statistics__overview').exists()).toBe(true);
    
    // Select users view
    const viewSelect = wrapper.find('.admin-statistics__view-select');
    await viewSelect.setValue('users');
    
    // Overview should be hidden and users view should be visible
    expect(wrapper.find('.admin-statistics__overview').exists()).toBe(false);
    expect(wrapper.find('.admin-statistics__users').exists()).toBe(true);
  });
  
  it('switches time range when clicking range buttons', async () => {
    // Default time range should be 'week'
    const activeButton = wrapper.find('.admin-statistics__range-button--active');
    expect(activeButton.text()).toBe('Woche');
    
    // Click day button
    const dayButton = wrapper.findAll('.admin-statistics__range-button')[0];
    await dayButton.trigger('click');
    
    // Day button should now be active
    const newActiveButton = wrapper.find('.admin-statistics__range-button--active');
    expect(newActiveButton.text()).toBe('Tag');
  });
  
  it('calls fetchStats on mount', () => {
    expect(systemStore.fetchStats).toHaveBeenCalled();
  });
  
  it('correctly displays resource usage metrics', () => {
    const cpuUsage = wrapper.find('.admin-statistics__resource-card:nth-child(1) .admin-statistics__meter-value');
    const memoryUsage = wrapper.find('.admin-statistics__resource-card:nth-child(2) .admin-statistics__meter-value');
    
    expect(cpuUsage.text()).toBe('38%');
    expect(memoryUsage.text()).toBe('45%');
  });
});