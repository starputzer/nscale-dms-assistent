import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import AdminFeedback from '@/components/admin/tabs/AdminFeedback.vue';
import { useAdminFeedbackStore } from '@/stores/admin/feedback';
import type { FeedbackEntry } from '@/types/admin';
import { createI18n } from 'vue-i18n';

// Create a basic i18n instance for testing
const i18n = createI18n({
  legacy: false,
  locale: 'de',
  messages: {
    de: {
      'admin.feedback.title': 'Feedback',
      'admin.feedback.noData': 'Keine Feedback-Daten vorhanden',
      'admin.feedback.export': 'Als CSV exportieren',
      'admin.feedback.resetFilters': 'Filter zurücksetzen',
      'admin.feedback.search': 'Suche',
      'admin.feedback.from': 'Von',
      'admin.feedback.to': 'Bis',
      'admin.feedback.onlyWithComments': 'Nur mit Kommentaren',
      'admin.feedback.dateRange': 'Zeitraum',
      'admin.feedback.filter': 'Filter',
      'admin.feedback.details': 'Details',
      'admin.feedback.user': 'Benutzer',
      'admin.feedback.session': 'Sitzung',
      'admin.feedback.source': 'Quelle',
      'admin.feedback.rating': 'Bewertung',
      'admin.feedback.comment': 'Kommentar',
      'admin.feedback.date': 'Datum',
      'admin.feedback.actions': 'Aktionen',
      'admin.feedback.sourceChart': 'Feedback nach Quelle',
      'admin.feedback.trendChart': 'Feedback-Trend',
      'admin.feedback.total': 'Gesamt',
      'admin.feedback.average': 'Durchschnitt',
      'admin.feedback.positive': 'Positiv',
      'admin.feedback.negative': 'Negativ',
      'admin.feedback.withComments': 'Mit Kommentaren',
      'admin.feedback.back': 'Zurück',
      'admin.feedback.next': 'Weiter',
      'admin.feedback.page': 'Seite',
      'admin.feedback.of': 'von'
    }
  }
});

// Mock the Chart.js component to avoid rendering issues in tests
vi.mock('chart.js', () => ({
  Chart: vi.fn(),
  registerables: []
}));

// Sample feedback data for testing
const mockFeedbackData: FeedbackEntry[] = [
  {
    id: '1',
    sessionId: 'session1',
    timestamp: new Date('2023-04-10T10:00:00').toISOString(),
    rating: 2,
    comment: 'This feature is confusing',
    source: 'document-converter',
    userId: 'user1'
  },
  {
    id: '2',
    sessionId: 'session2',
    timestamp: new Date('2023-04-15T09:30:00').toISOString(),
    rating: 1,
    comment: 'System is too slow',
    source: 'chat',
    userId: 'user2'
  },
  {
    id: '3',
    sessionId: 'session3',
    timestamp: new Date('2023-04-20T14:45:00').toISOString(),
    rating: 3,
    comment: '',
    source: 'chat',
    userId: 'user3'
  },
  {
    id: '4',
    sessionId: 'session4',
    timestamp: new Date('2023-05-05T11:15:00').toISOString(),
    rating: 2,
    comment: 'Need more features',
    source: 'admin',
    userId: 'user1'
  }
];

// Mock stats data
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

describe('AdminFeedback Component', () => {
  beforeEach(() => {
    // Create a fresh pinia instance for each test
    vi.clearAllMocks();
  });

  it('should render the component', async () => {
    const wrapper = mount(AdminFeedback, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              'adminFeedback': {
                stats: mockStatsData,
                feedback: mockFeedbackData,
                filter: {
                  startDate: null,
                  endDate: null,
                  onlyWithComments: false,
                  searchTerm: ''
                },
                loading: false
              }
            }
          }),
          i18n
        ],
        stubs: {
          'Chart': true,
          'Dialog': true,
          'BaseInput': true,
          'BaseButton': true,
          'BaseCheckbox': true
        },
        mocks: {
          $t: (key: string) => key
        }
      }
    });

    // Verify the store was initialized
    const store = useAdminFeedbackStore();
    expect(store.fetchStats).toHaveBeenCalledOnce();
    expect(store.fetchNegativeFeedback).toHaveBeenCalledOnce();

    // Verify the component renders key elements
    expect(wrapper.find('[data-test="feedback-table"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="feedback-filters"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="stats-section"]').exists()).toBe(true);
  });

  it('should filter feedback by date range', async () => {
    const wrapper = mount(AdminFeedback, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              'adminFeedback': {
                stats: mockStatsData,
                feedback: mockFeedbackData,
                filter: {
                  startDate: null,
                  endDate: null,
                  onlyWithComments: false,
                  searchTerm: ''
                },
                loading: false
              }
            }
          }),
          i18n
        ],
        stubs: {
          'Chart': true,
          'Dialog': true,
          'BaseInput': true,
          'BaseButton': true,
          'BaseCheckbox': true
        },
        mocks: {
          $t: (key: string) => key
        }
      }
    });

    const store = useAdminFeedbackStore();
    
    // Mock filteredFeedback to return results based on the filter
    store.filteredFeedback = vi.fn().mockImplementation(() => {
      const startDate = store.filter.startDate ? new Date(store.filter.startDate) : null;
      const endDate = store.filter.endDate ? new Date(store.filter.endDate) : null;
      
      return mockFeedbackData.filter(item => {
        const itemDate = new Date(item.timestamp);
        const passesStartDate = startDate ? itemDate >= startDate : true;
        const passesEndDate = endDate ? itemDate <= endDate : true;
        return passesStartDate && passesEndDate;
      });
    });

    // Set date range filter
    await wrapper.vm.updateDateFilter('2023-04-15', '2023-04-30');

    // Verify store filter was updated
    expect(store.setFilter).toHaveBeenCalledWith({
      startDate: '2023-04-15',
      endDate: '2023-04-30'
    });
    
    // Force computed properties to update
    await wrapper.vm.$nextTick();
    
    // Verify filtered results (only items between Apr 15 and Apr 30 should be shown)
    expect(wrapper.vm.displayedFeedback.length).toBe(2);
    expect(wrapper.vm.displayedFeedback.some(item => item.id === '2')).toBe(true);
    expect(wrapper.vm.displayedFeedback.some(item => item.id === '3')).toBe(true);
  });

  it('should filter feedback by comments presence', async () => {
    const wrapper = mount(AdminFeedback, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              'adminFeedback': {
                stats: mockStatsData,
                feedback: mockFeedbackData,
                filter: {
                  startDate: null,
                  endDate: null,
                  onlyWithComments: false,
                  searchTerm: ''
                },
                loading: false
              }
            }
          }),
          i18n
        ],
        stubs: {
          'Chart': true,
          'Dialog': true,
          'BaseInput': true,
          'BaseButton': true,
          'BaseCheckbox': true
        },
        mocks: {
          $t: (key: string) => key
        }
      }
    });

    const store = useAdminFeedbackStore();
    
    // Mock filteredFeedback to return results based on the filter
    store.filteredFeedback = vi.fn().mockImplementation(() => {
      return store.filter.onlyWithComments 
        ? mockFeedbackData.filter(item => item.comment && item.comment.trim().length > 0)
        : mockFeedbackData;
    });

    // Initially all feedback should be shown
    expect(wrapper.vm.displayedFeedback.length).toBe(4);
    
    // Update filter to show only items with comments
    await wrapper.vm.toggleCommentFilter(true);
    
    // Verify store filter was updated
    expect(store.setFilter).toHaveBeenCalledWith({
      onlyWithComments: true
    });
    
    // Force computed properties to update
    await wrapper.vm.$nextTick();
    
    // Verify filtered results (only items with comments should be shown)
    expect(wrapper.vm.displayedFeedback.length).toBe(3);
    expect(wrapper.vm.displayedFeedback.some(item => item.id === '3')).toBe(false);
  });

  it('should filter feedback by search term', async () => {
    const wrapper = mount(AdminFeedback, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              'adminFeedback': {
                stats: mockStatsData,
                feedback: mockFeedbackData,
                filter: {
                  startDate: null,
                  endDate: null,
                  onlyWithComments: false,
                  searchTerm: ''
                },
                loading: false
              }
            }
          }),
          i18n
        ],
        stubs: {
          'Chart': true,
          'Dialog': true,
          'BaseInput': true,
          'BaseButton': true,
          'BaseCheckbox': true
        },
        mocks: {
          $t: (key: string) => key
        }
      }
    });

    const store = useAdminFeedbackStore();
    
    // Mock filteredFeedback to return results based on the filter
    store.filteredFeedback = vi.fn().mockImplementation(() => {
      const searchTerm = store.filter.searchTerm.toLowerCase();
      if (!searchTerm) return mockFeedbackData;
      
      return mockFeedbackData.filter(item => 
        (item.comment && item.comment.toLowerCase().includes(searchTerm)) ||
        item.source.toLowerCase().includes(searchTerm) ||
        item.userId.toLowerCase().includes(searchTerm)
      );
    });

    // Initially all feedback should be shown
    expect(wrapper.vm.displayedFeedback.length).toBe(4);
    
    // Update search filter
    await wrapper.vm.updateSearchTerm('slow');
    
    // Verify store filter was updated
    expect(store.setFilter).toHaveBeenCalledWith({
      searchTerm: 'slow'
    });
    
    // Force computed properties to update
    await wrapper.vm.$nextTick();
    
    // Verify filtered results (only items containing "slow" should be shown)
    expect(wrapper.vm.displayedFeedback.length).toBe(1);
    expect(wrapper.vm.displayedFeedback[0].id).toBe('2');
  });

  it('should sort feedback by different columns', async () => {
    const wrapper = mount(AdminFeedback, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              'adminFeedback': {
                stats: mockStatsData,
                feedback: mockFeedbackData,
                filter: {
                  startDate: null,
                  endDate: null,
                  onlyWithComments: false,
                  searchTerm: ''
                },
                loading: false
              }
            }
          }),
          i18n
        ],
        stubs: {
          'Chart': true,
          'Dialog': true,
          'BaseInput': true,
          'BaseButton': true,
          'BaseCheckbox': true
        },
        mocks: {
          $t: (key: string) => key
        }
      }
    });

    // Test sorting by timestamp
    await wrapper.vm.sortBy('timestamp');
    expect(wrapper.vm.displayedFeedback[0].id).toBe('1'); // Oldest first
    
    // Test sorting by timestamp in reverse
    await wrapper.vm.sortBy('timestamp');
    expect(wrapper.vm.displayedFeedback[0].id).toBe('4'); // Newest first
    
    // Test sorting by rating
    await wrapper.vm.sortBy('rating');
    expect(wrapper.vm.displayedFeedback[0].id).toBe('2'); // Lowest rating first
    
    // Test sorting by rating in reverse
    await wrapper.vm.sortBy('rating');
    expect(wrapper.vm.displayedFeedback[0].id).toBe('3'); // Highest rating first
  });

  it('should export filtered feedback to CSV', async () => {
    const wrapper = mount(AdminFeedback, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              'adminFeedback': {
                stats: mockStatsData,
                feedback: mockFeedbackData,
                filter: {
                  startDate: null,
                  endDate: null,
                  onlyWithComments: false,
                  searchTerm: ''
                },
                loading: false
              }
            }
          }),
          i18n
        ],
        stubs: {
          'Chart': true,
          'Dialog': true,
          'BaseInput': true,
          'BaseButton': true,
          'BaseCheckbox': true
        },
        mocks: {
          $t: (key: string) => key
        }
      }
    });

    // Mock document.createElement and URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
      remove: vi.fn()
    };
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn().mockImplementation((tag) => {
      if (tag === 'a') return mockLink;
      return originalCreateElement.call(document, tag);
    });
    
    // Call export function
    await wrapper.vm.exportToCsv();
    
    // Verify a link was created and clicked
    expect(mockLink.download).toBe('feedback_export.csv');
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockLink.remove).toHaveBeenCalled();
  });

  it('should show detail modal when clicking on a feedback row', async () => {
    const wrapper = mount(AdminFeedback, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              'adminFeedback': {
                stats: mockStatsData,
                feedback: mockFeedbackData,
                filter: {
                  startDate: null,
                  endDate: null,
                  onlyWithComments: false,
                  searchTerm: ''
                },
                loading: false
              }
            }
          }),
          i18n
        ],
        stubs: {
          'Chart': true,
          'Dialog': true,
          'BaseInput': true,
          'BaseButton': true,
          'BaseCheckbox': true
        },
        mocks: {
          $t: (key: string) => key
        }
      }
    });

    // Initially the detail modal should be hidden
    expect(wrapper.vm.showDetailModal).toBe(false);
    expect(wrapper.vm.selectedFeedback).toBe(null);
    
    // Show detail modal for a feedback entry
    await wrapper.vm.showDetail(mockFeedbackData[1]);
    
    // Verify modal is shown with the correct feedback data
    expect(wrapper.vm.showDetailModal).toBe(true);
    expect(wrapper.vm.selectedFeedback).toEqual(mockFeedbackData[1]);
  });

  it('should reset all filters', async () => {
    const wrapper = mount(AdminFeedback, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              'adminFeedback': {
                stats: mockStatsData,
                feedback: mockFeedbackData,
                filter: {
                  startDate: '2023-04-01',
                  endDate: '2023-04-30',
                  onlyWithComments: true,
                  searchTerm: 'test'
                },
                loading: false
              }
            }
          })
        ],
        stubs: {
          'Chart': true,
          'Dialog': true
        }
      }
    });

    const store = useAdminFeedbackStore();
    
    // Call reset filters
    await wrapper.vm.resetFilters();
    
    // Verify store resetFilter was called
    expect(store.resetFilter).toHaveBeenCalled();
    
    // Verify local search term was reset
    expect(wrapper.vm.searchTerm).toBe('');
  });
});