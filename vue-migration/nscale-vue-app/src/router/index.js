import { createRouter, createWebHistory } from 'vue-router'

// Lazy-Load-Komponenten
const HomeView = () => import('../views/HomeView.vue')
const LoginView = () => import('../views/LoginView.vue')
const AdminView = () => import('../views/AdminView.vue')
const ChatView = () => import('../views/ChatView.vue')
const DocConverterView = () => import('../views/DocConverterView.vue')
const SettingsView = () => import('../views/SettingsView.vue')
const NotFoundView = () => import('../views/NotFoundView.vue')

// Routes erstellen
const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { requiresAuth: false }
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminView,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/chat',
    name: 'chat',
    component: ChatView,
    meta: { requiresAuth: true }
  },
  {
    path: '/doc-converter',
    name: 'doc-converter',
    component: DocConverterView,
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView
  }
]

// Router erstellen
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Globaler Navigationsschutz
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const userRole = localStorage.getItem('userRole') || 'user'
  
  // Authentifizierung
  if (to.meta.requiresAuth && !token) {
    next({ name: 'login' })
  } 
  // Admin-Berechtigung
  else if (to.meta.requiresAdmin && userRole !== 'admin') {
    next({ name: 'home' })
  } 
  // Anmeldung überspringen, wenn bereits angemeldet
  else if (to.name === 'login' && token) {
    next({ name: 'home' })
  } 
  // Normale Navigation
  else {
    next()
  }
})

export default router