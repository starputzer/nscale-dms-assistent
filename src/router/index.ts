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

const PerformanceDashboard = () =>
  import(
    /* webpackChunkName: "view-performance" */
    "@/views/PerformanceDashboard.vue"
  );

// We're using AdminView directly, so no need for the loader

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
        name: "ChatWithId",
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

      // Admin
      {
        path: "admin",
        meta: { requiresAdmin: true },
        beforeEnter: adminGuard,
        children: [
          {
            path: "",
            name: "AdminDashboard",
            component: AdminView,
          },
          {
            path: ":tab",
            name: "AdminTab",
            component: AdminView,
          },
        ],
      },

      // Performance Dashboard
      {
        path: "performance",
        name: "Performance",
        component: PerformanceDashboard,
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
<<<<<<< HEAD
  scrollBehavior(to, _from, savedPosition) {
=======
  scrollBehavior(to, from, savedPosition) {
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
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
<<<<<<< HEAD
    _from: RouteLocationNormalized,
=======
    from: RouteLocationNormalized,
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
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
