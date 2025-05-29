---
title: "Admin-Bereich Architektur"
version: "1.0.0"
date: "17.05.2025"
lastUpdate: "17.05.2025"
author: "Claude"
status: "Aktiv"
priority: "Hoch"
category: "Architektur"
tags: ["Admin", "Architektur", "Store", "TypeScript", "Vue3", "Pinia"]
---

# Admin-Bereich Architektur

> **Letzte Aktualisierung:** 17.05.2025 | **Version:** 1.0.0 | **Status:** Aktiv

## Übersicht

Der Admin-Bereich des Digitale Akte Assistenten ist als modulares, erweiterbares System konzipiert. Er folgt einer klaren Architektur mit Trennung von UI, Business-Logik und Datenschicht.

## Architektonische Prinzipien

1. **Modularität**: Jeder Admin-Bereich (Users, Feedback, etc.) ist eigenständig
2. **Separation of Concerns**: Klare Trennung zwischen UI, Store und API
3. **Type Safety**: Durchgängige TypeScript-Nutzung
4. **Composable Design**: Wiederverwendbare Vue 3 Composables
5. **Progressive Enhancement**: Basis-Funktionalität mit optionalen Erweiterungen

## Schichten-Architektur

### 1. Präsentationsschicht (UI)

```
views/
└── AdminView.vue                # Hauptcontainer mit Tab-Navigation

components/admin/tabs/
├── AdminDashboard.vue          # Dashboard-Übersicht
├── AdminUsers.vue              # Benutzerverwaltung
├── AdminFeedback.vue           # Feedback-Management
├── AdminMotd.vue               # MOTD-Editor
├── AdminSystem.vue             # System-Einstellungen
├── AdminLogViewer.vue          # Log-Viewer
└── AdminFeatureToggles.vue     # Feature-Toggle-Management
```

### 2. Business-Logik (Stores)

```
stores/admin/
├── index.ts                    # Zentraler Admin-Store
├── users.ts                    # Benutzer-Verwaltung
├── feedback.ts                 # Feedback-Verwaltung
├── motd.ts                     # MOTD-Konfiguration
├── system.ts                   # System-Metriken
└── logs.ts                     # Log-Verwaltung
```

### 3. Datenschicht (API Services)

```
services/api/
├── admin.ts                    # Admin API Service
├── AdminService.ts             # Type-Safe API Wrapper
└── AdminServiceWrapper.ts      # Error Handling Layer
```

## Datenfluss

```mermaid
graph TD
    A[UI Components] --> B[Pinia Stores]
    B --> C[API Services]
    C --> D[Backend API]
    D --> C
    C --> B
    B --> A
    
    E[Route Guards] --> B
    F[Error Boundaries] --> A
    G[Composables] --> A
```

## Store-Struktur

### Zentraler Admin-Store

```typescript
export const useAdminStore = defineStore("admin", () => {
  // State
  const currentSection = ref<AdminSection>("dashboard");
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  // Sub-Store References
  const usersStore = useAdminUsersStore();
  const systemStore = useAdminSystemStore();
  const feedbackStore = useAdminFeedbackStore();
  const motdStore = useAdminMotdStore();
  
  // Section Management
  async function setCurrentSection(section: AdminSection) {
    currentSection.value = section;
    await loadSectionData(section);
  }
  
  // Data Loading
  async function loadSectionData(section: AdminSection) {
    isLoading.value = true;
    error.value = null;
    
    try {
      switch (section) {
        case "dashboard":
          await loadDashboardData();
          break;
        case "users":
          await usersStore.fetchUsers();
          break;
        // ... weitere Sektionen
      }
    } catch (err) {
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  }
  
  return {
    currentSection,
    isLoading,
    error,
    setCurrentSection,
    loadSectionData
  };
});
```

### Spezialisierte Sub-Stores

```typescript
export const useAdminUsersStore = defineStore("adminUsers", () => {
  // State
  const users = ref<User[]>([]);
  const totalUsers = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  // Computed
  const adminUsers = computed(() => 
    users.value.filter(u => u.role === 'admin')
  );
  
  // Actions
  async function fetchUsers(params?: UserQueryParams) {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await adminApi.getUsers(params);
      users.value = response.data;
      totalUsers.value = response.total;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }
  
  return {
    users,
    totalUsers,
    loading,
    error,
    adminUsers,
    fetchUsers
  };
});
```

## Routing-Konzept

```typescript
const adminRoutes = {
  path: '/admin',
  name: 'Admin',
  component: AdminView,
  meta: { requiresAdmin: true },
  beforeEnter: adminGuard,
  children: [
    {
      path: '',
      redirect: 'dashboard'
    },
    {
      path: 'dashboard',
      name: 'AdminDashboard',
      component: () => import('@/components/admin/tabs/AdminDashboard.vue')
    },
    {
      path: 'users',
      name: 'AdminUsers',
      component: () => import('@/components/admin/tabs/AdminUsers.vue')
    }
    // ... weitere Sub-Routes
  ]
};
```

## Sicherheitskonzept

### Route Guards

```typescript
export const adminGuard: NavigationGuard = (to, from, next) => {
  const authStore = useAuthStore();
  
  if (!authStore.isAuthenticated) {
    return next({
      name: 'Login',
      query: { redirect: to.fullPath }
    });
  }
  
  if (!authStore.isAdmin) {
    return next({
      name: 'Unauthorized',
      params: { message: 'Admin-Zugriff erforderlich' }
    });
  }
  
  next();
};
```

### API-Level Security

```typescript
export class AdminApiService {
  private apiClient: AxiosInstance;
  
  constructor() {
    this.apiClient = axios.create({
      baseURL: '/api/admin',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Auth Interceptor
    this.apiClient.interceptors.request.use(
      (config) => {
        const token = authStore.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }
}
```

## Performance-Optimierung

### Lazy Loading

```typescript
// Component-Level
const AdminDashboard = () => import(
  /* webpackChunkName: "admin-dashboard" */
  '@/components/admin/tabs/AdminDashboard.vue'
);

// Store-Level
const useAdminUsersStore = () => import(
  /* webpackChunkName: "admin-users-store" */
  '@/stores/admin/users'
).then(m => m.useAdminUsersStore);
```

### Caching-Strategie

```typescript
export const useAdminCache = () => {
  const cache = new Map<string, CacheEntry>();
  const TTL = 5 * 60 * 1000; // 5 Minuten
  
  function get<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > TTL) {
      cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  function set<T>(key: string, data: T): void {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  return { get, set };
};
```

## Error Handling

### Global Error Boundary

```typescript
export const AdminErrorBoundary = defineComponent({
  name: 'AdminErrorBoundary',
  
  setup(props, { slots }) {
    const error = ref<Error | null>(null);
    
    onErrorCaptured((err: Error) => {
      error.value = err;
      
      // Log to monitoring service
      monitoring.captureException(err, {
        context: 'admin',
        user: authStore.user
      });
      
      // Prevent propagation
      return false;
    });
    
    return () => {
      if (error.value) {
        return h('div', { class: 'admin-error' }, [
          h('h2', 'Ein Fehler ist aufgetreten'),
          h('p', error.value.message),
          h('button', {
            onClick: () => error.value = null
          }, 'Erneut versuchen')
        ]);
      }
      
      return slots.default?.();
    };
  }
});
```

### Store Error Handling

```typescript
export const useErrorHandler = () => {
  const toast = useToast();
  
  return {
    async handleAction<T>(
      action: () => Promise<T>,
      options: ErrorHandlerOptions = {}
    ): Promise<T | null> {
      try {
        return await action();
      } catch (error) {
        const message = options.message || 'Ein Fehler ist aufgetreten';
        
        if (options.silent !== true) {
          toast.error(message);
        }
        
        if (options.rethrow) {
          throw error;
        }
        
        console.error('Admin action failed:', error);
        return null;
      }
    }
  };
};
```

## Testing-Strategie

### Unit Tests

```typescript
// stores/admin/users.spec.ts
describe('AdminUsersStore', () => {
  let store: ReturnType<typeof useAdminUsersStore>;
  
  beforeEach(() => {
    setActivePinia(createPinia());
    store = useAdminUsersStore();
  });
  
  it('fetches users successfully', async () => {
    const mockUsers = [
      { id: '1', name: 'Test User', email: 'test@example.com' }
    ];
    
    vi.mocked(adminApi.getUsers).mockResolvedValue({
      data: mockUsers,
      total: 1
    });
    
    await store.fetchUsers();
    
    expect(store.users).toEqual(mockUsers);
    expect(store.totalUsers).toBe(1);
    expect(store.loading).toBe(false);
  });
});
```

### Integration Tests

```typescript
// test/integration/admin-flow.spec.ts
describe('Admin Flow', () => {
  it('navigates through admin sections', async () => {
    const wrapper = mount(AdminView, {
      global: {
        plugins: [router, pinia]
      }
    });
    
    // Click on Users tab
    await wrapper.find('[data-test="tab-users"]').trigger('click');
    expect(wrapper.findComponent(AdminUsers).exists()).toBe(true);
    
    // Click on Feedback tab  
    await wrapper.find('[data-test="tab-feedback"]').trigger('click');
    expect(wrapper.findComponent(AdminFeedback).exists()).toBe(true);
  });
});
```

## Erweiterbarkeit

### Plugin-System

```typescript
export interface AdminPlugin {
  id: string;
  name: string;
  component: Component;
  icon: string;
  order?: number;
  permissions?: string[];
}

export const useAdminPlugins = () => {
  const plugins = ref<AdminPlugin[]>([]);
  
  function registerPlugin(plugin: AdminPlugin) {
    plugins.value.push(plugin);
    plugins.value.sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  
  return {
    plugins: readonly(plugins),
    registerPlugin
  };
};
```

### Custom Hooks

```typescript
// composables/useAdminTable.ts
export function useAdminTable<T>() {
  const items = ref<T[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  const pagination = reactive({
    page: 1,
    limit: 20,
    total: 0
  });
  
  const filters = reactive({
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc'
  });
  
  async function loadData(
    fetcher: (params: any) => Promise<{ data: T[], total: number }>
  ) {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await fetcher({
        ...pagination,
        ...filters
      });
      
      items.value = response.data;
      pagination.total = response.total;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }
  
  return {
    items,
    loading,
    error,
    pagination,
    filters,
    loadData
  };
}
```

## Fazit

Die Admin-Architektur des Digitale Akte Assistenten bietet:

- **Modularität**: Leicht erweiterbar um neue Admin-Bereiche
- **Type Safety**: Durchgängige TypeScript-Nutzung
- **Performance**: Lazy Loading und Caching
- **Sicherheit**: Mehrschichtige Zugriffskontrollen
- **Wartbarkeit**: Klare Trennung der Verantwortlichkeiten
- **Testbarkeit**: Umfassende Test-Abdeckung möglich

Die gewählte Architektur ermöglicht es, den Admin-Bereich kontinuierlich zu erweitern und an neue Anforderungen anzupassen, ohne die bestehende Funktionalität zu gefährden.