/**
 * Lazy Loading Service für optimierte Komponenten-Ladung
 *
 * Lädt Komponenten nur wenn sie benötigt werden
 * und cached sie für spätere Verwendung
 */

import { Component, defineAsyncComponent } from "vue";

// Cache für geladene Komponenten
const componentCache = new Map<string, Component>();

// Komponenten-Registry mit Lazy-Load-Definitionen
const componentRegistry = {
  // Admin Komponenten
  AdminPanel: () => import("@/components/admin/AdminPanel.vue"),
  AdminDashboard: () => import("@/components/admin/tabs/AdminDashboard.vue"),
  AdminUsers: () => import("@/components/admin/tabs/AdminUsers.vue"),
  AdminSettings: () =>
    import("@/components/admin/tabs/AdminSystemSettings.vue"),
  AdminLogs: () => import("@/components/admin/tabs/AdminLogViewer.vue"),
  AdminStatistics: () => import("@/components/admin/tabs/AdminStatistics.vue"),

  // Document Converter
  DocumentConverter: () =>
    import("@/components/admin/document-converter/DocConverterContainer.vue"),
  FallbackConverter: () =>
    import("@/components/admin/document-converter/FallbackConverter.vue"),
  ConverterStats: () =>
    import("@/components/admin/document-converter/ConversionStats.vue"),

  // Chat Komponenten
  EnhancedChat: () => import("@/components/chat/EnhancedChatContainer.vue"),
  MessageComposer: () =>
    import("@/components/chat/enhanced/EnhancedMessageInput.vue"),
  SessionManager: () => import("@/components/chat/enhanced/SessionManager.vue"),
  MessageActions: () => import("@/components/chat/MessageInput.vue"),

  // UI Komponenten
  DataTable: () => import("@/components/ui/data/Table.vue"),
  VirtualScroller: () =>
    import("@/components/chat/enhanced/VirtualMessageList.vue"),
  RichEditor: () => import("@/components/ui/base/TextArea.vue"),
  ChartComponent: () => import("@/components/monitoring/charts/UsageChart.vue"),

  // Feature Komponenten (momentan auskommentiert, da sie nicht existieren)
  // 'UserProfile': () => import('@/components/features/UserProfile.vue'),
  // 'NotificationCenter': () => import('@/components/features/NotificationCenter.vue'),
  // 'SearchInterface': () => import('@/components/features/SearchInterface.vue'),
  // 'FileUploader': () => import('@/components/features/FileUploader.vue'),

  // Layout Komponenten
  SidebarMenu: () => import("@/components/layout/Sidebar.vue"),
  HeaderBar: () => import("@/components/layout/Header.vue"),
  FooterBar: () => import("@/components/layout/Footer.vue"),
  BreadcrumbNav: () => import("@/components/ui/base/Breadcrumb.vue"),
};

/**
 * Lädt eine Komponente lazy und cached sie
 */
export function lazyLoadComponent(name: string): Component {
  // Prüfe Cache
  if (componentCache.has(name)) {
    return componentCache.get(name)!;
  }

  // Prüfe Registry
  const loader = componentRegistry[name as keyof typeof componentRegistry];
  if (!loader) {
    throw new Error(`Component ${name} not found in registry`);
  }

  // Erstelle Async-Komponente mit Fehlerbehandlung
  const component = defineAsyncComponent({
    loader,
    loadingComponent: () => import("@/components/common/LoadingSpinner.vue"),
    errorComponent: () => import("@/components/common/ErrorBoundary.vue"),
    delay: 200, // Zeige Loading nach 200ms
    timeout: 10000, // Timeout nach 10s
    suspensible: false,
    onError(error, retry, fail, attempts) {
      if (attempts <= 3) {
        // Retry bis zu 3 mal
        console.warn(`Retrying component load ${name}, attempt ${attempts}`);
        retry();
      } else {
        console.error(
          `Failed to load component ${name} after ${attempts} attempts`,
        );
        fail();
      }
    },
  });

  // Cache die Komponente
  componentCache.set(name, component);

  return component;
}

/**
 * Preload wichtige Komponenten im Hintergrund
 */
export async function preloadComponents(
  componentNames: string[],
): Promise<void> {
  const promises = componentNames.map((name) => {
    const loader = componentRegistry[name as keyof typeof componentRegistry];
    if (loader) {
      return loader().catch((err) => {
        console.warn(`Failed to preload component ${name}:`, err);
      });
    }
    return Promise.resolve();
  });

  await Promise.all(promises);
}

/**
 * Clear Component Cache (für Entwicklung/Testing)
 */
export function clearComponentCache(): void {
  componentCache.clear();
}

/**
 * Registriere neue Komponente zur Laufzeit
 */
export function registerComponent(
  name: string,
  loader: () => Promise<any>,
): void {
  if (componentRegistry[name as keyof typeof componentRegistry]) {
    console.warn(`Component ${name} already registered, overwriting...`);
  }
  (componentRegistry as any)[name] = loader;
}

/**
 * Prüfe ob Komponente registriert ist
 */
export function isComponentRegistered(name: string): boolean {
  return name in componentRegistry;
}

/**
 * Entferne Komponente aus Registry
 */
export function unregisterComponent(name: string): void {
  delete (componentRegistry as any)[name];
  componentCache.delete(name);
}

/**
 * Route-basiertes Preloading
 * Lädt Komponenten vor, die wahrscheinlich als nächstes benötigt werden
 */
export function preloadForRoute(routeName: string): Promise<void> {
  const routeComponents: Record<string, string[]> = {
    Admin: ["AdminPanel", "AdminDashboard", "AdminUsers"],
    Chat: ["EnhancedChat", "MessageComposer", "SessionManager"],
    Documents: ["DocumentConverter", "FileUploader"],
    Settings: ["UserProfile", "NotificationCenter"],
  };

  const components = routeComponents[routeName] || [];
  return preloadComponents(components);
}

/**
 * Intelligentes Preloading basierend auf Benutzerverhalten
 */
export function setupIntelligentPreloading(): void {
  // Preload Admin-Komponenten wenn User Admin-Rechte hat
  const authStore = useAuthStore();
  if (authStore.isAdmin) {
    setTimeout(() => {
      preloadComponents(["AdminPanel", "AdminDashboard", "AdminUsers"]);
    }, 2000);
  }

  // Preload häufig genutzte Komponenten nach Initial-Load
  window.addEventListener("load", () => {
    setTimeout(() => {
      preloadComponents(["MessageComposer", "SessionManager", "UserProfile"]);
    }, 3000);
  });

  // Preload beim Hovern über Navigation
  document.addEventListener("mouseover", (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest("a[data-preload]");
    if (link) {
      const routeName = link.getAttribute("data-preload");
      if (routeName) {
        preloadForRoute(routeName);
      }
    }
  });
}

// Type für den Composition API Helper
type LazyComponentOptions = {
  name: string;
  fallback?: Component;
  errorComponent?: Component;
  loadingComponent?: Component;
  delay?: number;
  timeout?: number;
};

/**
 * Composition API Helper für Lazy Loading
 */
export function useLazyComponent(options: LazyComponentOptions) {
  const component = ref<Component | null>(null);
  const isLoading = ref(true);
  const error = ref<Error | null>(null);

  const load = async () => {
    try {
      isLoading.value = true;
      error.value = null;
      component.value = lazyLoadComponent(options.name);
    } catch (err) {
      error.value = err as Error;
      component.value = options.fallback || null;
    } finally {
      isLoading.value = false;
    }
  };

  // Auto-load on mount
  onMounted(load);

  return {
    component: readonly(component),
    isLoading: readonly(isLoading),
    error: readonly(error),
    reload: load,
  };
}

// Auto-import für Composition API
import { ref, readonly, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";

// Export default service
export default {
  lazyLoadComponent,
  preloadComponents,
  clearComponentCache,
  registerComponent,
  unregisterComponent,
  isComponentRegistered,
  preloadForRoute,
  setupIntelligentPreloading,
  useLazyComponent,
};
