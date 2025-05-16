import { createRouter, createWebHistory, RouteRecordRaw, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Import layouts
import GuestLayout from '@/layouts/GuestLayout.vue'
import MainAppLayout from '@/layouts/MainAppLayout.vue'

// Import views
import LoginView from '@/views/LoginView.vue'
import SimpleChatView from '@/views/SimpleChatView.vue'
import DocumentsView from '@/views/DocumentsView.vue'
import SettingsView from '@/views/SettingsView.vue'
import HelpView from '@/views/Advanced404View.vue' // Using 404 as help for now
import NotFoundView from '@/views/NotFoundView.vue'

const routes: RouteRecordRaw[] = [
  // Guest routes (no authentication required)
  {
    path: '/login',
    component: GuestLayout,
    children: [
      {
        path: '',
        name: 'Login',
        component: LoginView
      }
    ]
  },
  
  // Authenticated routes
  {
    path: '/',
    component: MainAppLayout,
    meta: { requiresAuth: true },
    children: [
      // Redirect root to chat
      {
        path: '',
        redirect: '/chat'
      },
      
      // Chat routes
      {
        path: 'chat',
        name: 'Chat',
        component: SimpleChatView
      },
      {
        path: 'chat/:id',
        name: 'ChatSession',
        component: SimpleChatView
      },
      
      // Documents
      {
        path: 'documents',
        name: 'Documents',
        component: DocumentsView
      },
      
      // Settings
      {
        path: 'settings',
        name: 'Settings',
        component: SettingsView
      },
      
      // Help
      {
        path: 'help',
        name: 'Help',
        component: HelpView
      },
      
      // Admin
      {
        path: 'admin',
        name: 'Admin',
        component: () => import('@/views/AdminView.vue'),
        meta: { requiresAdmin: true }
      }
    ]
  },
  
  // 404 route
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFoundView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guards
router.beforeEach(async (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
  const authStore = useAuthStore()
  
  // Check if route requires authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Redirect to login
    return next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  }
  
  // If logged in and trying to access login, redirect to chat
  if (to.path === '/login' && authStore.isAuthenticated) {
    return next('/chat')
  }
  
  next()
})

export default router