// router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

// Layouts
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import AuthLayout from '@/layouts/AuthLayout.vue';

// Views
import LoginView from '@/views/LoginView.vue';
import RegisterView from '@/views/RegisterView.vue';
import ForgotPasswordView from '@/views/ForgotPasswordView.vue';
import ChatView from '@/views/ChatView.vue';
import AdminView from '@/views/AdminView.vue';
import DocConverterView from '@/views/DocConverter.vue';
import SettingsView from '@/views/SettingsView.vue';
import NotFoundView from '@/views/NotFoundView.vue';

// Lazy-loaded Admin Subviews
const AdminUsersView = () => import('@/views/admin/UsersView.vue');
const AdminSystemView = () => import('@/views/admin/SystemView.vue');
const AdminFeedbackView = () => import('@/views/admin/FeedbackView.vue');
const AdminMotdView = () => import('@/views/admin/MotdView.vue');

const routes = [
  {
    path: '/',
    component: DefaultLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Home',
        redirect: '/chat'
      },
      {
        path: 'chat',
        name: 'Chat',
        component: ChatView,
        meta: { title: 'nscale DMS Assistent' }
      },
      {
        path: 'chat/:sessionId',
        name: 'ChatSession',
        component: ChatView,
        meta: { title: 'nscale DMS Assistent - Chat' },
        props: true
      },
      {
        path: 'doc-converter',
        name: 'DocConverter',
        component: DocConverterView,
        meta: { 
          title: 'nscale DMS Assistent - Dokumentkonverter',
          requiresAdmin: true  // Nur für Admins zugänglich
        }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: SettingsView,
        meta: { title: 'nscale DMS Assistent - Einstellungen' }
      },
      {
        path: 'admin',
        name: 'Admin',
        component: AdminView,
        meta: { requiresAdmin: true, title: 'nscale DMS Assistent - Administration' },
        children: [
          {
            path: '',
            redirect: { name: 'AdminUsers' }
          },
          {
            path: 'users',
            name: 'AdminUsers',
            component: AdminUsersView,
            meta: { title: 'nscale DMS Assistent - Benutzerverwaltung' }
          },
          {
            path: 'system',
            name: 'AdminSystem',
            component: AdminSystemView,
            meta: { title: 'nscale DMS Assistent - Systemüberwachung' }
          },
          {
            path: 'feedback',
            name: 'AdminFeedback',
            component: AdminFeedbackView,
            meta: { 
              title: 'nscale DMS Assistent - Feedback-Analyse',
              requiresFeedbackAccess: true 
            }
          },
          {
            path: 'motd',
            name: 'AdminMotd',
            component: AdminMotdView,
            meta: { title: 'nscale DMS Assistent - MOTD-Konfiguration' }
          }
        ]
      }
    ]
  },
  {
    path: '/auth',
    component: AuthLayout,
    meta: { requiresGuest: true },
    children: [
      {
        path: 'login',
        name: 'Login',
        component: LoginView,
        meta: { title: 'nscale DMS Assistent - Anmelden' }
      },
      {
        path: 'register',
        name: 'Register',
        component: RegisterView,
        meta: { title: 'nscale DMS Assistent - Registrieren' }
      },
      {
        path: 'forgot-password',
        name: 'ForgotPassword',
        component: ForgotPasswordView,
        meta: { title: 'nscale DMS Assistent - Passwort vergessen' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFoundView,
    meta: { title: 'nscale DMS Assistent - Seite nicht gefunden' }
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// Middleware für Authentifizierung und Berechtigungen
router.beforeEach(async (to, from, next) => {
  // Setze Dokumententitel
  document.title = to.meta.title || 'nscale DMS Assistent';

  const authStore = useAuthStore();
  const isAuthenticated = authStore.isAuthenticated;
  const isAdmin = authStore.isAdmin;
  const canViewFeedback = authStore.canViewFeedback;

  // Wenn die Route Authentifizierung erfordert und der Benutzer nicht angemeldet ist,
  // leite zur Login-Seite weiter
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'Login', query: { redirect: to.fullPath } });
  }

  // Wenn die Route Admin-Rechte erfordert und der Benutzer kein Admin ist,
  // leite zur Startseite weiter
  if (to.meta.requiresAdmin && !isAdmin) {
    return next({ name: 'Home' });
  }
  
  // Wenn die Route Feedback-Zugriff erfordert und der Benutzer keinen Zugriff hat,
  // leite zur Startseite weiter
  if (to.meta.requiresFeedbackAccess && !canViewFeedback) {
    return next({ name: 'Home' });
  }

  // Wenn die Route für Gäste ist und der Benutzer angemeldet ist,
  // leite zur Startseite weiter
  if (to.meta.requiresGuest && isAuthenticated) {
    return next({ name: 'Home' });
  }

  // Ansonsten erlaube den Zugriff
  next();
});

export default router;