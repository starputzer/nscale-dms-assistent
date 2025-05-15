import {
  createRouter,
  createWebHistory,
  RouteRecordRaw,
  NavigationGuardNext,
  RouteLocationNormalized,
} from "vue-router";

// Routen-Definitionen
const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: "/chat",
  },
  {
    path: "/chat",
    name: "Chat",
    component: () => import("@/views/ChatView.vue"),
    meta: {
      requiresAuth: true,
      title: "nscale DMS Assistant",
    },
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/EnhancedLoginView.vue"),
    meta: {
      guest: true,
      title: "Login",
    },
  },
  {
    path: "/admin",
    name: "Admin",
    component: () => import("@/views/AdminView.vue"),
    meta: {
      requiresAuth: true,
      adminOnly: true,
      title: "Administration",
    },
  },
  {
    path: "/documents",
    name: "Documents",
    component: () => import("@/views/DocumentsView.vue"),
    meta: {
      requiresAuth: true,
      title: "Dokumentenkonverter",
    },
  },
  {
    path: "/settings",
    name: "Settings",
    component: () => import("@/views/SettingsView.vue"),
    meta: {
      requiresAuth: true,
      title: "Einstellungen",
    },
  },
  {
    path: "/error",
    name: "Error",
    component: () => import("@/views/ErrorView.vue"),
    meta: {
      title: "Fehler",
    },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/NotFoundView.vue"),
    meta: {
      title: "Seite nicht gefunden",
    },
  },
];

// Router-Instanz erstellen
const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Einfacher globaler Guard - nur das Nötigste
router.beforeEach(async (to, from, next) => {
  console.log(`Navigation: ${from.path} -> ${to.path}`);
  
  // Lazy-Load Auth Store
  let authStore;
  try {
    const { useAuthStore } = await import("@/stores/auth");
    authStore = useAuthStore();
  } catch (error) {
    console.error('Auth Store Fehler:', error);
    return next('/error');
  }

  // Skip-auth routes
  if (['/login', '/error', '/404'].includes(to.path)) {
    return next();
  }

  // Auth check
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    console.log('Nicht authentifiziert, redirect zu /login');
    return next(`/login?redirect=${to.fullPath}`);
  }

  // Guest routes (redirect authenticated users)
  if (to.meta.guest && authStore.isAuthenticated) {
    console.log('Bereits authentifiziert, redirect zu /chat');
    return next('/chat');
  }

  // Admin check
  if (to.meta.adminOnly && !authStore.isAdmin) {
    console.log('Keine Admin-Rechte');
    return next('/error');
  }

  // Alles OK
  next();
});

export default router;