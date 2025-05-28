import {
  createRouter,
  createWebHistory,
  RouteRecordRaw,
  RouteLocationNormalized,
  NavigationGuardNext,
} from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { adminGuard } from "@/router/guards/adminGuard";

// Lazy load layouts mit Webpack-Chunk-Namen
const GuestLayout = () =>
  import(/* webpackChunkName: "layout-guest" */ "@/layouts/GuestLayout.vue");
const MainAppLayout = () =>
  import(/* webpackChunkName: "layout-main" */ "@/layouts/MainAppLayout.vue");

// Kritische Views direkt importieren (Login und Chat)
import LoginView from "@/views/LoginView.vue";
import SimpleChatView from "@/views/SimpleChatView.vue";

// Lazy load weniger kritische Views
const DocumentsView = () =>
  import(
    /* webpackChunkName: "view-documents" */
    "@/views/DocumentsView.vue"
  );
const SettingsView = () =>
  import(
    /* webpackChunkName: "view-settings" */
    "@/views/SettingsView.vue"
  );
const HelpView = () =>
  import(
    /* webpackChunkName: "view-help" */
    "@/views/Advanced404View.vue"
  );
const NotFoundView = () =>
  import(
    /* webpackChunkName: "view-404" */
    "@/views/NotFoundView.vue"
  );
const AdminView = () =>
  import(
    /* webpackChunkName: "view-admin" */
    "@/views/AdminView.vue"
  );

// Import our fixed admin view
const CompleteAdminView = () =>
  import(
    /* webpackChunkName: "view-admin-complete" */
    "@/views/CompleteAdminView.fixed.vue"
  );

const routes: RouteRecordRaw[] = [
  // Guest routes (no authentication required)
  {
    path: "/login",
    component: GuestLayout,
    children: [
      {
        path: "",
        name: "Login",
        component: LoginView,
      },
    ],
  },

  // Authenticated routes
  {
    path: "/",
    component: MainAppLayout,
    meta: { requiresAuth: true },
    children: [
      // Redirect root to chat
      {
        path: "",
        redirect: "/chat",
      },

      // Chat routes
      {
        path: "chat",
        name: "Chat",
        component: SimpleChatView,
      },
      {
        path: "chat/:id",
        name: "ChatSession",
        component: SimpleChatView,
      },

      // Documents
      {
        path: "documents",
        name: "Documents",
        component: DocumentsView,
      },

      // Settings
      {
        path: "settings",
        name: "Settings",
        component: SettingsView,
      },

      // Help
      {
        path: "help",
        name: "Help",
        component: HelpView,
      },

      // Admin - with specific tabs
      {
        path: "admin",
        meta: { requiresAdmin: true },
        beforeEnter: adminGuard,
        children: [
          {
            path: "",
            name: "AdminDashboard",
            component: CompleteAdminView,
          },
          // Add specific tab routes for direct access
          {
            path: "dashboard",
            name: "AdminDashboardTab",
            component: CompleteAdminView,
            props: { forcedTab: "dashboard" },
          },
          {
            path: "users",
            name: "AdminUsersTab",
            component: CompleteAdminView,
            props: { forcedTab: "users" },
          },
          {
            path: "feedback",
            name: "AdminFeedbackTab",
            component: CompleteAdminView,
            props: { forcedTab: "feedback" },
          },
          {
            path: "system",
            name: "AdminSystemTab",
            component: CompleteAdminView,
            props: { forcedTab: "system" },
          },
          {
            path: "settings",
            name: "AdminSettingsTab",
            component: CompleteAdminView,
            props: { forcedTab: "settings" },
          },
          {
            path: "logs",
            name: "AdminLogsTab",
            component: CompleteAdminView,
            props: { forcedTab: "logs" },
          },
          {
            path: "featureToggles",
            name: "AdminFeatureTogglesTab",
            component: CompleteAdminView,
            props: { forcedTab: "featureToggles" },
          },
        ],
      },
    ],
  },

  // 404 route
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: NotFoundView,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  // Scrollverhalten für bessere UX
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else if (to.hash) {
      return {
        el: to.hash,
        behavior: "smooth",
      };
    } else {
      return { top: 0 };
    }
  },
});

// Navigation guards
router.beforeEach(
  async (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ) => {
    const authStore = useAuthStore();

    // Check if route requires authentication
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      // Redirect to login
      return next({
        path: "/login",
        query: { redirect: to.fullPath },
      });
    }

    // If logged in and trying to access login, redirect to chat
    if (to.path === "/login" && authStore.isAuthenticated) {
      return next("/chat");
    }

    next();
  },
);

export default router;
