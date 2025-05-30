import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useAdminStore } from '@/stores/admin';
import AdminPanel from '@/views/AdminPanel.vue';
import router from '@/router';

// Mock axios for API calls
vi.mock('axios');

describe('Admin Panel Access Control Tests', () => {
  let authStore: any;
  let adminStore: any;
  let mockRouter: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    authStore = useAuthStore();
    adminStore = useAdminStore();
    
    // Create a mock router
    mockRouter = createRouter({
      history: createWebHistory(),
      routes: router.options.routes
    });
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Access Control', () => {
    it('should deny access to unauthenticated users', async () => {
      authStore.$patch({
        isAuthenticated: false,
        user: null
      });

      const routerPush = vi.spyOn(mockRouter, 'push');
      
      await mockRouter.push('/admin');
      await flushPromises();

      expect(routerPush).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/login',
          query: { redirect: '/admin' }
        })
      );
    });

    it('should deny access to non-admin users', async () => {
      authStore.$patch({
        isAuthenticated: true,
        user: {
          id: '123',
          username: 'regularuser',
          role: 'user',
          permissions: []
        }
      });

      const routerPush = vi.spyOn(mockRouter, 'push');
      
      await mockRouter.push('/admin');
      await flushPromises();

      expect(routerPush).toHaveBeenCalledWith('/unauthorized');
    });

    it('should allow access to admin users', async () => {
      authStore.$patch({
        isAuthenticated: true,
        user: {
          id: '456',
          username: 'adminuser',
          role: 'admin',
          permissions: ['admin', 'viewUsers', 'editUsers']
        }
      });

      const wrapper = mount(AdminPanel, {
        global: {
          plugins: [mockRouter]
        }
      });

      await flushPromises();

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('.admin-panel').exists()).toBe(true);
    });

    it('should allow partial access based on permissions', async () => {
      authStore.$patch({
        isAuthenticated: true,
        user: {
          id: '789',
          username: 'moderator',
          role: 'moderator',
          permissions: ['adminView', 'viewUsers']
        }
      });

      const wrapper = mount(AdminPanel, {
        global: {
          plugins: [mockRouter]
        }
      });

      await flushPromises();

      // Should see admin panel but with limited tabs
      expect(wrapper.find('.admin-panel').exists()).toBe(true);
      expect(wrapper.find('[data-tab="users"]').exists()).toBe(true);
      expect(wrapper.find('[data-tab="system"]').exists()).toBe(false);
    });
  });

  describe('Admin Panel Navigation', () => {
    beforeEach(() => {
      authStore.$patch({
        isAuthenticated: true,
        user: {
          id: '999',
          username: 'superadmin',
          role: 'admin',
          permissions: ['admin', 'all']
        }
      });
    });

    it('should load dashboard by default', async () => {
      const wrapper = mount(AdminPanel, {
        global: {
          plugins: [mockRouter]
        }
      });

      await flushPromises();

      expect(adminStore.currentSection).toBe('dashboard');
      expect(wrapper.find('.admin-dashboard').exists()).toBe(true);
    });

    it('should switch between admin sections', async () => {
      const wrapper = mount(AdminPanel, {
        global: {
          plugins: [mockRouter]
        }
      });

      await flushPromises();

      // Click on users tab
      await wrapper.find('[data-tab="users"]').trigger('click');
      await flushPromises();

      expect(adminStore.currentSection).toBe('users');
      expect(wrapper.find('.admin-users-tab').exists()).toBe(true);

      // Click on system tab
      await wrapper.find('[data-tab="system"]').trigger('click');
      await flushPromises();

      expect(adminStore.currentSection).toBe('system');
      expect(wrapper.find('.admin-system-tab').exists()).toBe(true);
    });

    it('should handle deep linking to specific sections', async () => {
      await mockRouter.push('/admin/feedback');
      
      const wrapper = mount(AdminPanel, {
        global: {
          plugins: [mockRouter]
        }
      });

      await flushPromises();

      expect(adminStore.currentSection).toBe('feedback');
      expect(wrapper.find('.admin-feedback-tab').exists()).toBe(true);
    });
  });

  describe('Admin Data Loading', () => {
    beforeEach(() => {
      authStore.$patch({
        isAuthenticated: true,
        user: {
          id: '111',
          username: 'admin',
          role: 'admin',
          permissions: ['admin']
        }
      });
    });

    it('should load users list when accessing users tab', async () => {
      const mockUsers = [
        { id: '1', username: 'user1', email: 'user1@test.com' },
        { id: '2', username: 'user2', email: 'user2@test.com' }
      ];

      vi.spyOn(adminStore, 'loadUsers').mockResolvedValueOnce(mockUsers);

      const wrapper = mount(AdminPanel, {
        global: {
          plugins: [mockRouter]
        }
      });

      await wrapper.find('[data-tab="users"]').trigger('click');
      await flushPromises();

      expect(adminStore.loadUsers).toHaveBeenCalled();
      expect(wrapper.findAll('.user-row')).toHaveLength(mockUsers.length);
    });

    it('should load system stats on dashboard', async () => {
      const mockStats = {
        totalUsers: 150,
        activeUsers: 45,
        totalSessions: 1200,
        totalDocuments: 350
      };

      vi.spyOn(adminStore, 'loadDashboardData').mockResolvedValueOnce(mockStats);

      const wrapper = mount(AdminPanel, {
        global: {
          plugins: [mockRouter]
        }
      });

      await flushPromises();

      expect(adminStore.loadDashboardData).toHaveBeenCalled();
      expect(wrapper.text()).toContain('150'); // Total users
      expect(wrapper.text()).toContain('45');  // Active users
    });

    it('should handle data loading errors gracefully', async () => {
      vi.spyOn(adminStore, 'loadUsers').mockRejectedValueOnce(
        new Error('Failed to load users')
      );

      const wrapper = mount(AdminPanel, {
        global: {
          plugins: [mockRouter]
        }
      });

      await wrapper.find('[data-tab="users"]').trigger('click');
      await flushPromises();

      expect(wrapper.find('.error-message').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to load users');
    });
  });

  describe('Admin Actions', () => {
    beforeEach(() => {
      authStore.$patch({
        isAuthenticated: true,
        user: {
          id: '222',
          username: 'admin',
          role: 'admin',
          permissions: ['admin', 'editUsers', 'deleteUsers']
        }
      });
    });

    it('should allow editing user details', async () => {
      const mockUser = {
        id: '333',
        username: 'edituser',
        email: 'edit@test.com',
        role: 'user'
      };

      vi.spyOn(adminStore, 'updateUser').mockResolvedValueOnce({
        ...mockUser,
        role: 'moderator'
      });

      const wrapper = mount(AdminPanel, {
        global: {
          plugins: [mockRouter]
        }
      });

      // Navigate to users tab
      await wrapper.find('[data-tab="users"]').trigger('click');
      await flushPromises();

      // Click edit on a user
      await wrapper.find('.edit-user-btn').trigger('click');
      
      // Change role
      await wrapper.find('select[name="role"]').setValue('moderator');
      
      // Save changes
      await wrapper.find('.save-user-btn').trigger('click');
      await flushPromises();

      expect(adminStore.updateUser).toHaveBeenCalledWith('333', {
        role: 'moderator'
      });
    });

    it('should confirm before deleting users', async () => {
      window.confirm = vi.fn().mockReturnValue(true);
      
      vi.spyOn(adminStore, 'deleteUser').mockResolvedValueOnce(true);

      const wrapper = mount(AdminPanel, {
        global: {
          plugins: [mockRouter]
        }
      });

      await wrapper.find('[data-tab="users"]').trigger('click');
      await flushPromises();

      await wrapper.find('.delete-user-btn').trigger('click');
      await flushPromises();

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('delete this user')
      );
      expect(adminStore.deleteUser).toHaveBeenCalled();
    });

    it('should update system settings', async () => {
      const newSettings = {
        maintenanceMode: true,
        maxUploadSize: 10485760,
        sessionTimeout: 3600
      };

      vi.spyOn(adminStore, 'updateSystemSettings').mockResolvedValueOnce(newSettings);

      const wrapper = mount(AdminPanel, {
        global: {
          plugins: [mockRouter]
        }
      });

      await wrapper.find('[data-tab="system"]').trigger('click');
      await flushPromises();

      // Toggle maintenance mode
      await wrapper.find('input[name="maintenanceMode"]').setChecked(true);
      
      // Save settings
      await wrapper.find('.save-settings-btn').trigger('click');
      await flushPromises();

      expect(adminStore.updateSystemSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          maintenanceMode: true
        })
      );
    });
  });

  describe('Feature Toggle Management', () => {
    beforeEach(() => {
      authStore.$patch({
        isAuthenticated: true,
        user: {
          id: '444',
          username: 'admin',
          role: 'admin',
          permissions: ['admin', 'manageFeatures']
        }
      });
    });

    it('should display and manage feature toggles', async () => {
      const mockFeatures = {
        documentConverter: true,
        advancedSearch: false,
        betaFeatures: false
      };

      vi.spyOn(adminStore, 'loadFeatureToggles').mockResolvedValueOnce(mockFeatures);
      vi.spyOn(adminStore, 'updateFeatureToggle').mockResolvedValueOnce(true);

      const wrapper = mount(AdminPanel, {
        global: {
          plugins: [mockRouter]
        }
      });

      await wrapper.find('[data-tab="features"]').trigger('click');
      await flushPromises();

      expect(adminStore.loadFeatureToggles).toHaveBeenCalled();
      
      // Check current state
      const docConverterToggle = wrapper.find('input[name="documentConverter"]');
      expect(docConverterToggle.element.checked).toBe(true);

      // Toggle advanced search
      const advancedSearchToggle = wrapper.find('input[name="advancedSearch"]');
      await advancedSearchToggle.setChecked(true);
      await flushPromises();

      expect(adminStore.updateFeatureToggle).toHaveBeenCalledWith(
        'advancedSearch',
        true
      );
    });
  });

  describe('Session Timeout', () => {
    it('should handle session timeout in admin panel', async () => {
      authStore.$patch({
        isAuthenticated: true,
        user: {
          id: '555',
          username: 'admin',
          role: 'admin'
        }
      });

      const wrapper = mount(AdminPanel, {
        global: {
          plugins: [mockRouter]
        }
      });

      await flushPromises();

      // Simulate session timeout
      authStore.$patch({
        isAuthenticated: false,
        user: null
      });

      await flushPromises();

      // Should redirect to login
      expect(mockRouter.currentRoute.value.path).toBe('/login');
    });
  });
});