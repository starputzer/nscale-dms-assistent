/**
 * Rendering Performance Tests
 * 
 * These tests specifically target rendering performance for list components
 * and other UI elements that need to handle large amounts of data efficiently.
 * The tests verify that rendering remains performant even with large datasets.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { nextTick } from 'vue';

// Import components that render lists
import ChatView from '@/views/ChatView.vue';
import DocumentsView from '@/views/DocumentsView.vue';
import AdminUsersTab from '@/components/admin/AdminUsersTab.vue';
import MessageList from '@/components/MessageList.vue';
import VirtualListComponent from '@/components/VirtualListComponent.vue';

// Import performance utilities
import {
  startMeasurement,
  endMeasurement,
  measureFunctionTime,
  measureFrameRate,
  captureLongTasks,
  createPerformanceReport
} from '../utils/performance-test-utils';

// Constants for performance thresholds
const RENDERING_THRESHOLDS = {
  SMALL_LIST_RENDER: 100, // ms for rendering lists with <50 items
  MEDIUM_LIST_RENDER: 200, // ms for rendering lists with 50-500 items
  LARGE_LIST_RENDER: 500, // ms for rendering lists with >500 items
  LIST_ITEM_RENDER: 0.5, // ms per individual list item
  SCROLLING_FPS_MIN: 30, // minimum acceptable FPS during scrolling
  INTERACTION_DELAY: 100, // ms maximum delay for user interactions
  VIRTUALIZED_LIST_RENDER: 300, // ms for virtualized list initial render
};

// Test data generators
const generateChatMessages = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `Message ${i} with content that is long enough to be realistic for a typical conversation. This includes formatting and potentially longer paragraphs that might appear in real usage. The length of this message is deliberate to ensure realistic rendering performance.`,
    timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
  }));
};

const generateDocuments = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `doc-${i}`,
    title: `Document ${i} with a reasonably long title that might contain specific details about the document content or metadata`,
    type: ['pdf', 'docx', 'xlsx', 'pptx', 'txt'][i % 5],
    size: Math.floor(Math.random() * 10000000),
    created: new Date(Date.now() - (count - i) * 3600000).toISOString(),
    tags: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => `tag-${j}`),
    author: `Author ${Math.floor(i / 10)}`,
    lastModified: new Date(Date.now() - (count - i) * 1800000).toISOString(),
  }));
};

const generateUsers = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i}`,
    email: `user${i}@example.com`,
    role: i % 20 === 0 ? 'admin' : 'user',
    firstName: `First${i}`,
    lastName: `Last${i}`,
    created: new Date(Date.now() - (count - i) * 86400000).toISOString(),
    lastActive: new Date(Date.now() - Math.floor(Math.random() * 7) * 86400000).toISOString(),
    status: ['active', 'inactive', 'suspended'][i % 3],
    permissions: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => `permission-${j}`),
  }));
};

// Helper to create a wrapper with testing pinia
const createWrapper = (Component, props = {}, options = {}) => {
  return mount(Component, {
    props,
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            ...options.initialState,
          },
        }),
      ],
      mocks: {
        $t: (key, fallback) => fallback || key,
        ...(options.mocks || {}),
      },
      stubs: {
        RouterView: true,
        RouterLink: true,
        ...(options.stubs || {}),
      },
    },
    attachTo: document.body,
    ...options,
  });
};

describe('Rendering Performance Tests', () => {
  beforeEach(() => {
    // Clear DOM before each test
    document.body.innerHTML = '';
    
    // Clear performance marks/measures
    window.performance.clearMarks();
    window.performance.clearMeasures();
  });
  
  afterEach(() => {
    // Clean up DOM after each test
    document.body.innerHTML = '';
  });
  
  describe('Message List Rendering', () => {
    it('measures small message list rendering performance (20 messages)', async () => {
      const messages = generateChatMessages(20);
      
      const renderTime = await measureFunctionTime(async () => {
        const wrapper = createWrapper(MessageList, {
          messages,
        });
        
        await nextTick();
        await flushPromises();
      });
      
      console.log(`Small message list (20 items) render time: ${renderTime.toFixed(2)}ms`);
      expect(renderTime).toBeLessThan(RENDERING_THRESHOLDS.SMALL_LIST_RENDER);
    });
    
    it('measures medium message list rendering performance (100 messages)', async () => {
      const messages = generateChatMessages(100);
      
      const renderTime = await measureFunctionTime(async () => {
        const wrapper = createWrapper(MessageList, {
          messages,
        });
        
        await nextTick();
        await flushPromises();
      });
      
      console.log(`Medium message list (100 items) render time: ${renderTime.toFixed(2)}ms`);
      expect(renderTime).toBeLessThan(RENDERING_THRESHOLDS.MEDIUM_LIST_RENDER);
      expect(renderTime / messages.length).toBeLessThan(RENDERING_THRESHOLDS.LIST_ITEM_RENDER * 2);
    });
    
    it('measures large message list rendering performance (500 messages)', async () => {
      const messages = generateChatMessages(500);
      
      const renderTime = await measureFunctionTime(async () => {
        const wrapper = createWrapper(MessageList, {
          messages,
        });
        
        await nextTick();
        await flushPromises();
      });
      
      console.log(`Large message list (500 items) render time: ${renderTime.toFixed(2)}ms`);
      expect(renderTime).toBeLessThan(RENDERING_THRESHOLDS.LARGE_LIST_RENDER);
      expect(renderTime / messages.length).toBeLessThan(RENDERING_THRESHOLDS.LIST_ITEM_RENDER * 3);
    });
    
    it('measures message list scrolling performance', async () => {
      const messages = generateChatMessages(200);
      
      const wrapper = createWrapper(MessageList, {
        messages,
      });
      await flushPromises();
      
      const messageListElement = wrapper.find('.message-list').element;
      expect(messageListElement).toBeDefined();
      
      // Capture long tasks during scrolling
      const longTasks = await captureLongTasks(async () => {
        // Simulate scrolling
        for (let i = 0; i < 10; i++) {
          messageListElement.scrollTop += 200;
          await new Promise(resolve => setTimeout(resolve, 16)); // Wait for next frame
        }
      });
      
      // Measure framerate during scrolling
      const fps = await measureFrameRate(500); // Measure for 500ms
      
      console.log(`Message list scrolling FPS: ${fps.toFixed(2)}`);
      console.log(`Message list scrolling long tasks: ${longTasks.length}`);
      
      expect(fps).toBeGreaterThan(RENDERING_THRESHOLDS.SCROLLING_FPS_MIN);
      expect(longTasks.length).toBeLessThanOrEqual(3); // Allow some long tasks, but not too many
    });
    
    it('measures incremental message list updates', async () => {
      // Start with a smaller list
      const initialMessages = generateChatMessages(50);
      
      const wrapper = createWrapper(MessageList, {
        messages: initialMessages,
      });
      await flushPromises();
      
      // Additional messages to add
      const additionalMessages = generateChatMessages(10);
      
      // Measure time to add new messages
      const updateTime = await measureFunctionTime(async () => {
        await wrapper.setProps({
          messages: [...initialMessages, ...additionalMessages],
        });
        await nextTick();
        await flushPromises();
      });
      
      console.log(`Message list incremental update time (10 new items): ${updateTime.toFixed(2)}ms`);
      expect(updateTime).toBeLessThan(RENDERING_THRESHOLDS.INTERACTION_DELAY);
      expect(updateTime / additionalMessages.length).toBeLessThan(RENDERING_THRESHOLDS.LIST_ITEM_RENDER * 2);
    });
  });
  
  describe('Document List Rendering', () => {
    it('measures small document list rendering performance (30 documents)', async () => {
      const documents = generateDocuments(30);
      
      const renderTime = await measureFunctionTime(async () => {
        const wrapper = createWrapper(DocumentsView, {}, {
          initialState: {
            documents: {
              items: documents,
              isLoading: false,
            },
          },
        });
        
        await nextTick();
        await flushPromises();
      });
      
      console.log(`Small document list (30 items) render time: ${renderTime.toFixed(2)}ms`);
      expect(renderTime).toBeLessThan(RENDERING_THRESHOLDS.SMALL_LIST_RENDER);
    });
    
    it('measures medium document list rendering performance (150 documents)', async () => {
      const documents = generateDocuments(150);
      
      const renderTime = await measureFunctionTime(async () => {
        const wrapper = createWrapper(DocumentsView, {}, {
          initialState: {
            documents: {
              items: documents,
              isLoading: false,
            },
          },
        });
        
        await nextTick();
        await flushPromises();
      });
      
      console.log(`Medium document list (150 items) render time: ${renderTime.toFixed(2)}ms`);
      expect(renderTime).toBeLessThan(RENDERING_THRESHOLDS.MEDIUM_LIST_RENDER);
    });
    
    it('measures large document list rendering performance (500 documents)', async () => {
      const documents = generateDocuments(500);
      
      const renderTime = await measureFunctionTime(async () => {
        const wrapper = createWrapper(DocumentsView, {}, {
          initialState: {
            documents: {
              items: documents,
              isLoading: false,
            },
          },
        });
        
        await nextTick();
        await flushPromises();
      });
      
      console.log(`Large document list (500 items) render time: ${renderTime.toFixed(2)}ms`);
      expect(renderTime).toBeLessThan(RENDERING_THRESHOLDS.LARGE_LIST_RENDER);
    });
    
    it('measures document filtering performance', async () => {
      const documents = generateDocuments(200);
      
      const wrapper = createWrapper(DocumentsView, {}, {
        initialState: {
          documents: {
            items: documents,
            isLoading: false,
          },
        },
      });
      await flushPromises();
      
      // Measure filter performance
      const filterTime = await measureFunctionTime(async () => {
        // Get filter input
        const filterInput = wrapper.find('.document-filter-input');
        if (filterInput.exists()) {
          // Set filter value
          await filterInput.setValue('pdf');
          await nextTick();
          await flushPromises();
        }
      });
      
      console.log(`Document list filter time: ${filterTime.toFixed(2)}ms`);
      expect(filterTime).toBeLessThan(RENDERING_THRESHOLDS.INTERACTION_DELAY);
    });
    
    it('measures document sorting performance', async () => {
      const documents = generateDocuments(200);
      
      const wrapper = createWrapper(DocumentsView, {}, {
        initialState: {
          documents: {
            items: documents,
            isLoading: false,
          },
        },
      });
      await flushPromises();
      
      // Measure sort performance
      const sortTime = await measureFunctionTime(async () => {
        // Get sort dropdown/button
        const sortButton = wrapper.find('.document-sort-button');
        if (sortButton.exists()) {
          // Click sort button
          await sortButton.trigger('click');
          await nextTick();
          
          // Click a sort option (if available)
          const sortOption = wrapper.find('.sort-by-date');
          if (sortOption.exists()) {
            await sortOption.trigger('click');
          }
          
          await flushPromises();
        }
      });
      
      console.log(`Document list sort time: ${sortTime.toFixed(2)}ms`);
      expect(sortTime).toBeLessThan(RENDERING_THRESHOLDS.INTERACTION_DELAY * 1.5);
    });
  });
  
  describe('Admin Users List Rendering', () => {
    it('measures admin users table rendering performance (50 users)', async () => {
      const users = generateUsers(50);
      
      const renderTime = await measureFunctionTime(async () => {
        const wrapper = createWrapper(AdminUsersTab, {}, {
          initialState: {
            admin: {
              users,
              isLoading: false,
            },
          },
        });
        
        await nextTick();
        await flushPromises();
      });
      
      console.log(`Admin users table (50 items) render time: ${renderTime.toFixed(2)}ms`);
      expect(renderTime).toBeLessThan(RENDERING_THRESHOLDS.MEDIUM_LIST_RENDER);
    });
    
    it('measures admin users table rendering performance (200 users)', async () => {
      const users = generateUsers(200);
      
      const renderTime = await measureFunctionTime(async () => {
        const wrapper = createWrapper(AdminUsersTab, {}, {
          initialState: {
            admin: {
              users,
              isLoading: false,
            },
          },
        });
        
        await nextTick();
        await flushPromises();
      });
      
      console.log(`Admin users table (200 items) render time: ${renderTime.toFixed(2)}ms`);
      expect(renderTime).toBeLessThan(RENDERING_THRESHOLDS.MEDIUM_LIST_RENDER * 1.5);
    });
    
    it('measures pagination performance in admin users table', async () => {
      const users = generateUsers(200);
      
      const wrapper = createWrapper(AdminUsersTab, {}, {
        initialState: {
          admin: {
            users,
            isLoading: false,
          },
        },
      });
      await flushPromises();
      
      // Measure pagination performance
      const paginationTime = await measureFunctionTime(async () => {
        // Find pagination controls
        const nextPageButton = wrapper.find('.pagination-next');
        if (nextPageButton.exists()) {
          // Click next page button
          await nextPageButton.trigger('click');
          await nextTick();
          await flushPromises();
        }
      });
      
      console.log(`Admin users table pagination time: ${paginationTime.toFixed(2)}ms`);
      expect(paginationTime).toBeLessThan(RENDERING_THRESHOLDS.INTERACTION_DELAY);
    });
    
    it('measures search filtering performance in admin users table', async () => {
      const users = generateUsers(200);
      
      const wrapper = createWrapper(AdminUsersTab, {}, {
        initialState: {
          admin: {
            users,
            isLoading: false,
          },
        },
      });
      await flushPromises();
      
      // Measure search performance
      const searchTime = await measureFunctionTime(async () => {
        // Find search input
        const searchInput = wrapper.find('.user-search-input');
        if (searchInput.exists()) {
          // Set search value
          await searchInput.setValue('admin');
          await nextTick();
          await flushPromises();
        }
      });
      
      console.log(`Admin users table search time: ${searchTime.toFixed(2)}ms`);
      expect(searchTime).toBeLessThan(RENDERING_THRESHOLDS.INTERACTION_DELAY);
    });
  });
  
  describe('Virtual List Rendering', () => {
    it('measures virtualized list initial rendering (1000 items)', async () => {
      // Create 1000 items
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        text: `Item ${i} content`,
      }));
      
      const renderTime = await measureFunctionTime(async () => {
        const wrapper = createWrapper(VirtualListComponent, {
          items,
          itemHeight: 50,
        });
        
        await nextTick();
        await flushPromises();
      });
      
      console.log(`Virtual list (1000 items) initial render time: ${renderTime.toFixed(2)}ms`);
      expect(renderTime).toBeLessThan(RENDERING_THRESHOLDS.VIRTUALIZED_LIST_RENDER);
    });
    
    it('measures virtualized list scrolling performance', async () => {
      // Create 1000 items
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        text: `Item ${i} content that has enough text to be realistic for UI testing purposes`,
      }));
      
      const wrapper = createWrapper(VirtualListComponent, {
        items,
        itemHeight: 50,
      });
      await flushPromises();
      
      const listElement = wrapper.find('.virtual-list-container').element;
      expect(listElement).toBeDefined();
      
      // Measure scroll performance
      startMeasurement('virtual-list-scroll');
      
      // Simulate fast scrolling
      for (let i = 0; i < 10; i++) {
        listElement.scrollTop += 500; // Scroll by multiple items at once
        await new Promise(resolve => setTimeout(resolve, 16)); // Wait for frame
      }
      
      // Wait for any post-scroll rendering
      await flushPromises();
      
      const scrollTime = endMeasurement('virtual-list-scroll');
      
      console.log(`Virtual list scroll time: ${scrollTime.toFixed(2)}ms`);
      
      // Virtualized lists should handle scrolling efficiently
      expect(scrollTime / 10).toBeLessThan(RENDERING_THRESHOLDS.INTERACTION_DELAY); // Average per scroll event
      
      // Check visible items
      const visibleItems = wrapper.findAll('.virtual-list-item');
      
      // Even with 1000 items, only a small subset should be rendered
      expect(visibleItems.length).toBeLessThan(50);
    });
    
    it('measures item rendition during virtualized list scrolling', async () => {
      // Create 1000 items
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        text: `Item ${i} content`,
      }));
      
      const wrapper = createWrapper(VirtualListComponent, {
        items,
        itemHeight: 50,
      });
      await flushPromises();
      
      const listElement = wrapper.find('.virtual-list-container').element;
      
      // Get initial visible items
      const initialItems = wrapper.findAll('.virtual-list-item').map(item => item.text());
      
      // Scroll down
      listElement.scrollTop = 1000; // Scroll down to reveal different items
      await nextTick();
      await flushPromises();
      
      // Get new visible items
      const newItems = wrapper.findAll('.virtual-list-item').map(item => item.text());
      
      // Items should be different after scrolling
      expect(initialItems).not.toEqual(newItems);
      
      // Even after scrolling, the number of rendered items should remain reasonable
      expect(wrapper.findAll('.virtual-list-item').length).toBeLessThan(50);
    });
  });
  
  describe('Conditional Rendering Performance', () => {
    it('measures performance of showing/hiding complex components', async () => {
      const wrapper = createWrapper(ChatView, {}, {
        initialState: {
          sessions: {
            currentSession: { id: 'session-1', title: 'Test Session' },
            messages: {
              'session-1': generateChatMessages(20),
            },
          },
          ui: {
            sidebarVisible: false,
          },
        },
      });
      await flushPromises();
      
      // Measure sidebar toggle performance
      const toggleTime = await measureFunctionTime(async () => {
        // Toggle sidebar visibility
        wrapper.vm.$store.ui.sidebarVisible = true;
        await nextTick();
        await flushPromises();
      });
      
      console.log(`Sidebar show/hide toggle time: ${toggleTime.toFixed(2)}ms`);
      expect(toggleTime).toBeLessThan(RENDERING_THRESHOLDS.INTERACTION_DELAY);
    });
    
    it('measures performance of dynamic component switching', async () => {
      const wrapper = createWrapper(AdminView);
      await flushPromises();
      
      // Measure tab switching performance
      const switchTime = await measureFunctionTime(async () => {
        // Switch to a different tab
        if (typeof wrapper.vm.setActiveTab === 'function') {
          wrapper.vm.setActiveTab('users');
          await nextTick();
          await flushPromises();
        }
      });
      
      console.log(`Admin tab switching time: ${switchTime.toFixed(2)}ms`);
      expect(switchTime).toBeLessThan(RENDERING_THRESHOLDS.INTERACTION_DELAY * 1.5);
    });
  });
  
  describe('Complex Component Rerendering', () => {
    it('measures performance when updating props that affect child components', async () => {
      const messages = generateChatMessages(50);
      
      const wrapper = createWrapper(ChatView, {}, {
        initialState: {
          sessions: {
            currentSession: { id: 'session-1', title: 'Test Session' },
            messages: {
              'session-1': messages,
            },
          },
          ui: {
            theme: 'light',
          },
        },
      });
      await flushPromises();
      
      // Measure time to update theme (should trigger style recalculation)
      const updateTime = await measureFunctionTime(async () => {
        wrapper.vm.$store.ui.theme = 'dark';
        await nextTick();
        await flushPromises();
      });
      
      console.log(`Theme update rerender time: ${updateTime.toFixed(2)}ms`);
      expect(updateTime).toBeLessThan(RENDERING_THRESHOLDS.INTERACTION_DELAY * 2);
    });
    
    it('measures performance of list reordering', async () => {
      const documents = generateDocuments(50);
      
      const wrapper = createWrapper(DocumentsView, {}, {
        initialState: {
          documents: {
            items: documents,
            isLoading: false,
          },
        },
      });
      await flushPromises();
      
      // Measure time to reorder documents
      const reorderTime = await measureFunctionTime(async () => {
        // Reverse the order
        wrapper.vm.$store.documents.items = [...documents].reverse();
        await nextTick();
        await flushPromises();
      });
      
      console.log(`Document list reordering time: ${reorderTime.toFixed(2)}ms`);
      expect(reorderTime).toBeLessThan(RENDERING_THRESHOLDS.INTERACTION_DELAY * 2);
    });
  });
  
  describe('Performance Report Generation', () => {
    it('generates a rendering performance summary report', async () => {
      const testResults: Record<string, any> = {};
      
      // Measure small list rendering
      testResults['Small List Rendering'] = {
        value: await measureFunctionTime(async () => {
          const wrapper = createWrapper(MessageList, {
            messages: generateChatMessages(20),
          });
          await flushPromises();
        }),
        threshold: RENDERING_THRESHOLDS.SMALL_LIST_RENDER,
        unit: 'ms',
      };
      
      // Measure medium list rendering
      testResults['Medium List Rendering'] = {
        value: await measureFunctionTime(async () => {
          const wrapper = createWrapper(MessageList, {
            messages: generateChatMessages(100),
          });
          await flushPromises();
        }),
        threshold: RENDERING_THRESHOLDS.MEDIUM_LIST_RENDER,
        unit: 'ms',
      };
      
      // Measure virtualized list rendering
      testResults['Virtualized List Rendering'] = {
        value: await measureFunctionTime(async () => {
          const wrapper = createWrapper(VirtualListComponent, {
            items: Array.from({ length: 1000 }, (_, i) => ({
              id: `item-${i}`,
              text: `Item ${i} content`,
            })),
            itemHeight: 50,
          });
          await flushPromises();
        }),
        threshold: RENDERING_THRESHOLDS.VIRTUALIZED_LIST_RENDER,
        unit: 'ms',
      };
      
      // Generate report
      const report = createPerformanceReport(testResults);
      
      // Log report
      console.log('Rendering Performance Report:');
      console.log(report);
      
      // Verify report was generated
      expect(report).toBeTruthy();
      expect(Object.keys(report)).toContain('Small List Rendering');
      expect(Object.keys(report)).toContain('Medium List Rendering');
      expect(Object.keys(report)).toContain('Virtualized List Rendering');
    });
  });
});