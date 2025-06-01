import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import AdminPanel from '@/components/admin/AdminPanel.vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';

// Mock components
vi.mock('@/components/ui', () => ({
  Toast: {
    name: 'Toast',
    template: '<div class="toast-mock"></div>'
  },
  Dialog: {
    name: 'Dialog',
    template: '<div class="dialog-mock"></div>'
  },
  LoadingSpinner: {
    name: 'LoadingSpinner',
    props: ['size'],
    template: '<div class="loading-spinner" :data-size="size"></div>'
  }
}));

// Mock async components
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue');
  return {
    ...actual,
    defineAsyncComponent: (loader) => {
      // Return a simple component stub
      return {
        name: 'AsyncComponent',
        template: '<div class="async-component-mock"></div>'
      };
    }
  };
});

// Create a test router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
    { path: '/admin', name: 'admin', component: AdminPanel }
  ]
});

// Helper to create wrapper with default props and configs
const createWrapper = (options = {}) => {
  return mount(AdminPanel, {
    global: {
      plugins: [
        router,
        createTestingPinia({
          createSpy: vi.fn,
          initialState: {
            auth: {
              currentUser: { 
                id: 'user-1', 
                email: 'admin@example.com', 
                role: 'admin' 
              },
              isAuthenticated: true
            },
            ui: {
              isDarkMode: false,
              theme: 'light'
            },
            featureToggles: {
              toggles: {
                enableFeatureTogglesUi: true
              }
            }
          }
        })
      ],
      stubs: {
        Transition: false,
        RouterLink: true
      },
      mocks: {
        $t: (key, fallback) => fallback || key
      },
      ...options
    }
  });
};

describe('AdminPanel.vue', () => {
  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn().mockImplementation((key) => {
        if (key === 'admin_active_tab') return 'dashboard';
        return null;
      }),
      setItem: vi.fn(),
      clear: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    
    // Mock environment variables
    vi.stubGlobal('import.meta', { env: { VITE_APP_VERSION: '1.0.0-test' } });
    
    // Reset router
    router.push('/');
  });

  // Rendering Tests
  describe('Rendering', () => {
    it('renders the admin panel when user has access', async () => {
      const wrapper = createWrapper();
      await flushPromises();
      
      expect(wrapper.find('.admin-panel').exists()).toBe(true);
      expect(wrapper.find('.admin-panel__title').exists()).toBe(true);
    });
    
    it('shows loading state while checking permissions', async () => {
      const wrapper = createWrapper({
        mocks: {
          useAuthStore: () => ({
            currentUser: null,
            isAuthenticated: false,
            checkAuth: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
          })
        }
      });
      
      // Set loading state manually since we're testing before the auth check completes
      await wrapper.setData({ isLoading: true });
      
      expect(wrapper.find('.admin-panel__auth-loading').exists()).toBe(true);
      expect(wrapper.find('.loading-spinner').exists()).toBe(true);
    });
    
    it('shows access denied message when user has no access', async () => {
      const wrapper = createWrapper({
        initialState: {
          auth: {
            currentUser: { id: 'user-1', email: 'user@example.com', role: 'user' },
            isAuthenticated: true
          }
        }
      });
      await flushPromises();
      
      // Set canAccessAdmin computed property to false
      await wrapper.vm.$data.isLoading = false;
      await flushPromises();
      
      expect(wrapper.find('.admin-panel__no-access').exists()).toBe(true);
      expect(wrapper.text()).toContain('Kein Zugriff');
      expect(wrapper.find('.admin-panel__back-button').exists()).toBe(true);
    });
    
    it('renders user info correctly', async () => {
      const wrapper = createWrapper();
      await flushPromises();
      
      const userInfo = wrapper.find('.admin-panel__user-info');
      expect(userInfo.exists()).toBe(true);
      expect(userInfo.find('.admin-panel__user-email').text()).toBe('admin@example.com');
      expect(userInfo.find('.admin-panel__role').exists()).toBe(true);
      expect(userInfo.find('.admin-panel__role--admin').exists()).toBe(true);
    });
    
    it('renders navigation sidebar with tabs', async () => {
      const wrapper = createWrapper();
      await flushPromises();
      
      const sidebar = wrapper.find('.admin-panel__sidebar');
      expect(sidebar.exists()).toBe(true);
      
      const navItems = wrapper.findAll('.admin-panel__nav-item');
      expect(navItems.length).toBeGreaterThan(0);
      
      // Check if at least the dashboard tab exists
      const dashboardTab = navItems.find(item => item.text().includes('Dashboard'));
      expect(dashboardTab).toBeDefined();
    });
    
    it('renders app version correctly', async () => {
      const wrapper = createWrapper();
      await flushPromises();
      
      const versionText = wrapper.find('.admin-panel__version');
      expect(versionText.exists()).toBe(true);
      expect(versionText.text()).toContain('1.0.0-test');
    });
    
    it('renders theme toggle button', async () => {
      const wrapper = createWrapper();
      await flushPromises();
      
      const themeToggle = wrapper.find('.admin-panel__theme-toggle');
      expect(themeToggle.exists()).toBe(true);
      
      // Default should be light mode
      expect(themeToggle.find('.fa-moon').exists()).toBe(true);
      expect(themeToggle.text()).toContain('Dunkel');
    });
  });

  // Navigation and Tab Management Tests
  describe('Navigation and Tabs', () => {
    it('selects the correct initial tab from localStorage', async () => {
      // Mock localStorage to return a specific tab
      window.localStorage.getItem = vi.fn().mockReturnValue('users');
      
      const wrapper = createWrapper();
      await flushPromises();
      
      expect(wrapper.vm.activeTab).toBe('users');
      const activeTab = wrapper.find('.admin-panel__nav-item--active');
      expect(activeTab.exists()).toBe(true);
      expect(activeTab.text()).toContain('Benutzer');
    });
    
    it('changes tab when clicking on a navigation item', async () => {
      const wrapper = createWrapper();
      await flushPromises();
      
      // Find a tab that is not currently active
      const inactiveTab = wrapper.findAll('.admin-panel__nav-item')
        .find(item => !item.classes().includes('admin-panel__nav-item--active'));
      
      expect(inactiveTab).toBeDefined();
      
      // Click the tab
      await inactiveTab.trigger('click');
      
      // Check if tab was activated
      expect(inactiveTab.classes()).toContain('admin-panel__nav-item--active');
      
      // Check if localStorage was updated
      expect(window.localStorage.setItem).toHaveBeenCalled();
    });
    
    it('loads correct tab content when changing tabs', async () => {
      const wrapper = createWrapper();
      await flushPromises();
      
      // Spy on the loadDataForTab method
      const loadDataSpy = vi.spyOn(wrapper.vm, 'loadDataForTab');
      
      // Find users tab
      const usersTab = wrapper.findAll('.admin-panel__nav-item')
        .find(item => item.text().includes('Benutzer'));
      
      expect(usersTab).toBeDefined();
      
      // Click the tab
      await usersTab.trigger('click');
      
      // Check if data loading was triggered for the correct tab
      expect(loadDataSpy).toHaveBeenCalledWith('users');
    });
    
    it('adds tab parameter to URL when changing tabs', async () => {
      const wrapper = createWrapper();
      await flushPromises();
      
      // Navigate to admin page
      await router.push('/admin');
      
      // Find users tab
      const usersTab = wrapper.findAll('.admin-panel__nav-item')
        .find(item => item.text().includes('Benutzer'));
      
      // Click the tab
      await usersTab.trigger('click');
      
      // Check if URL was updated
      expect(router.currentRoute.value.query.tab).toBe('users');
    });
    
    it('selects tab from URL query parameter', async () => {
      // Navigate to admin page with tab query param
      await router.push('/admin?tab=feedback');
      
      const wrapper = createWrapper();
      await flushPromises();
      
      // Check if the correct tab is active
      expect(wrapper.vm.activeTab).toBe('feedback');
      
      const activeTab = wrapper.find('.admin-panel__nav-item--active');
      expect(activeTab.exists()).toBe(true);
      expect(activeTab.text()).toContain('Feedback');
    });
  });

  // Theme Toggling Tests
  describe('Theme Toggling', () => {
    it('toggles theme when clicking the theme toggle button', async () => {
      const wrapper = createWrapper();
      await flushPromises();
      
      // Get the UI store
      const uiStore = wrapper.vm.uiStore;
      
      // Spy on the toggleTheme method
      const toggleSpy = vi.spyOn(uiStore, 'toggleTheme');
      
      // Click the theme toggle button
      const themeToggle = wrapper.find('.admin-panel__theme-toggle');
      await themeToggle.trigger('click');
      
      // Check if the store method was called
      expect(toggleSpy).toHaveBeenCalled();
    });
    
    it('shows correct theme toggle icon based on current theme', async () => {
      // Create wrapper with dark mode enabled
      const wrapper = createWrapper({
        initialState: {
          ui: {
            isDarkMode: true,
            theme: 'dark'
          }
        }
      });
      await flushPromises();
      
      const themeToggle = wrapper.find('.admin-panel__theme-toggle');
      
      // Should show sun icon in dark mode
      expect(themeToggle.find('.fa-sun').exists()).toBe(true);
      expect(themeToggle.text()).toContain('Hell');
    });
    
    it('applies correct theme class to the admin panel', async () => {
      // Create wrapper with dark mode enabled
      const wrapper = createWrapper({
        initialState: {
          ui: {
            isDarkMode: true,
            theme: 'dark'
          }
        }
      });
      await flushPromises();
      
      expect(wrapper.find('.admin-panel').classes()).toContain('theme-dark');
      
      // Create wrapper with light mode
      const lightWrapper = createWrapper();
      await flushPromises();
      
      expect(lightWrapper.find('.admin-panel').classes()).toContain('theme-light');
    });
  });

  // Data Loading Tests
  describe('Data Loading', () => {
    it('shows loading state when loading data', async () => {
      const wrapper = createWrapper();
      
      // Set loading state manually
      await wrapper.setData({ isLoading: true });
      
      expect(wrapper.find('.admin-panel__loading').exists()).toBe(true);
      expect(wrapper.find('.loading-spinner').exists()).toBe(true);
    });
    
    it('loads data for the active tab on mount', async () => {
      const wrapper = createWrapper();
      
      // Spy on the loadDataForTab method
      const loadDataSpy = vi.spyOn(wrapper.vm, 'loadDataForTab');
      
      // Wait for component to mount and initial data to load
      await wrapper.vm.$options.mounted?.call(wrapper.vm);
      await flushPromises();
      
      // Check if data loading was triggered for the initial tab (dashboard)
      expect(loadDataSpy).toHaveBeenCalledWith('dashboard');
    });
    
    it('loads appropriate data based on selected tab', async () => {
      const wrapper = createWrapper();
      await flushPromises();
      
      // Get store instances
      const adminUsersStore = wrapper.vm.adminUsersStore;
      const adminFeedbackStore = wrapper.vm.adminFeedbackStore;
      
      // Spy on store methods
      const fetchUsersSpy = vi.spyOn(adminUsersStore, 'fetchUsers');
      const fetchFeedbackSpy = vi.spyOn(adminFeedbackStore, 'fetchNegativeFeedback');
      
      // Switch to users tab
      await wrapper.vm.setActiveTab('users');
      await flushPromises();
      
      // Check if correct store method was called
      expect(fetchUsersSpy).toHaveBeenCalled();
      
      // Switch to feedback tab
      await wrapper.vm.setActiveTab('feedback');
      await flushPromises();
      
      // Check if correct store methods were called
      expect(fetchFeedbackSpy).toHaveBeenCalled();
    });
    
    it('handles data loading errors gracefully', async () => {
      const wrapper = createWrapper();
      await flushPromises();
      
      // Mock console.error to prevent test output noise
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Get a store instance
      const adminUsersStore = wrapper.vm.adminUsersStore;
      
      // Make the store method throw an error
      vi.spyOn(adminUsersStore, 'fetchUsers').mockRejectedValue(new Error('API error'));
      
      // Switch to users tab to trigger data loading
      await wrapper.vm.setActiveTab('users');
      await flushPromises();
      
      // Check if error was handled and loading state was reset
      expect(wrapper.vm.isLoading).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });

  // Action Handling Tests
  describe('Action Handling', () => {
    it('reloads data when receiving reload action', async () => {
      const wrapper = createWrapper();
      await flushPromises();
      
      // Spy on the loadDataForTab method
      const loadDataSpy = vi.spyOn(wrapper.vm, 'loadDataForTab');
      
      // Call handleAction with reload action
      await wrapper.vm.handleAction('reload');
      
      // Check if data loading was triggered for the current tab
      expect(loadDataSpy).toHaveBeenCalledWith(wrapper.vm.activeTab);
    });
    
    it('switches tab when receiving switchTab action', async () => {
      const wrapper = createWrapper();
      await flushPromises();
      
      // Spy on the setActiveTab method
      const setActiveTabSpy = vi.spyOn(wrapper.vm, 'setActiveTab');
      
      // Call handleAction with switchTab action
      await wrapper.vm.handleAction('switchTab', 'logs');
      
      // Check if tab switch was triggered
      expect(setActiveTabSpy).toHaveBeenCalledWith('logs');
    });
    
    it('logs warning for unhandled actions', async () => {
      const wrapper = createWrapper();
      await flushPromises();
      
      // Spy on console.warn
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Call handleAction with unknown action
      await wrapper.vm.handleAction('unknownAction', { data: 'test' });
      
      // Check if warning was logged
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('Unhandled action: unknownAction');
      
      // Restore console.warn
      consoleWarnSpy.mockRestore();
    });
  });

  // Navigation Tests
  describe('Navigation', () => {
    it('navigates to home page when clicking back button', async () => {
      // Create wrapper with user without admin rights to see back button
      const wrapper = createWrapper({
        initialState: {
          auth: {
            currentUser: { id: 'user-1', email: 'user@example.com', role: 'user' },
            isAuthenticated: true
          }
        }
      });
      await flushPromises();
      
      // Set loading finished to ensure we see the access denied view
      await wrapper.setData({ isLoading: false });
      await flushPromises();
      
      // Spy on router.push
      const routerPushSpy = vi.spyOn(router, 'push');
      
      // Click the back button
      await wrapper.find('.admin-panel__back-button').trigger('click');
      
      // Check if router.push was called with correct path
      expect(routerPushSpy).toHaveBeenCalledWith('/');
    });
    
    it('falls back to window.location if router is not available', async () => {
      // Create wrapper with user without admin rights to see back button
      const wrapper = createWrapper({
        initialState: {
          auth: {
            currentUser: { id: 'user-1', email: 'user@example.com', role: 'user' },
            isAuthenticated: true
          }
        }
      });
      await flushPromises();
      
      // Set loading finished to ensure we see the access denied view
      await wrapper.setData({ isLoading: false });
      await flushPromises();
      
      // Mock window.location
      const originalLocation = window.location;
      delete window.location;
      window.location = { href: '' };
      
      // Set router to null
      wrapper.vm.router = null;
      
      // Click the back button
      await wrapper.find('.admin-panel__back-button').trigger('click');
      
      // Check if window.location.href was set correctly
      expect(window.location.href).toBe('/');
      
      // Restore window.location
      window.location = originalLocation;
    });
  });

  // Feature Flag Tests
  describe('Feature Flags', () => {
    it('shows feature toggles tab when feature flag is enabled', async () => {
      const wrapper = createWrapper({
        initialState: {
          featureToggles: {
            toggles: {
              enableFeatureTogglesUi: true
            }
          }
        }
      });
      await flushPromises();
      
      // Find all nav items and check if feature toggles tab exists
      const navItems = wrapper.findAll('.admin-panel__nav-item');
      const featureTogglesTab = navItems.find(item => item.text().includes('Feature-Toggles'));
      
      expect(featureTogglesTab).toBeDefined();
    });
    
    it('hides feature toggles tab when feature flag is disabled', async () => {
      const wrapper = createWrapper({
        initialState: {
          featureToggles: {
            toggles: {
              enableFeatureTogglesUi: false
            }
          }
        }
      });
      await flushPromises();
      
      // Find all nav items and check if feature toggles tab does not exist
      const navItems = wrapper.findAll('.admin-panel__nav-item');
      const featureTogglesTab = navItems.find(item => item.text().includes('Feature-Toggles'));
      
      expect(featureTogglesTab).toBeUndefined();
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('uses correct ARIA attributes for navigation', async () => {
      const wrapper = createWrapper();
      await flushPromises();
      
      // Set an active tab
      await wrapper.vm.setActiveTab('dashboard');
      await flushPromises();
      
      // Check active tab has correct aria-current attribute
      const activeTab = wrapper.find('.admin-panel__nav-item--active');
      expect(activeTab.attributes('aria-current')).toBe('page');
      
      // Check other tabs don't have aria-current
      const inactiveTabs = wrapper.findAll('.admin-panel__nav-item:not(.admin-panel__nav-item--active)');
      inactiveTabs.forEach(tab => {
        expect(tab.attributes('aria-current')).toBeUndefined();
      });
    });
    
    it('uses proper labels for theme toggle button', async () => {
      // Create wrapper with light theme
      const lightWrapper = createWrapper();
      await flushPromises();
      
      const lightThemeToggle = lightWrapper.find('.admin-panel__theme-toggle');
      expect(lightThemeToggle.attributes('aria-label')).toContain('dunklen Modus');
      
      // Create wrapper with dark theme
      const darkWrapper = createWrapper({
        initialState: {
          ui: {
            isDarkMode: true,
            theme: 'dark'
          }
        }
      });
      await flushPromises();
      
      const darkThemeToggle = darkWrapper.find('.admin-panel__theme-toggle');
      expect(darkThemeToggle.attributes('aria-label')).toContain('hellen Modus');
    });
  });
});