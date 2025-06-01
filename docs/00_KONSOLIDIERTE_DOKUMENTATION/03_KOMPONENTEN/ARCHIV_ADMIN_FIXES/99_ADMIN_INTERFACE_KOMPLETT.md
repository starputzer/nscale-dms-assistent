---
title: "Admin-Interface - Vollständige Dokumentation"
version: "1.0.0"
date: "17.05.2025"
lastUpdate: "17.05.2025"
author: "Claude"
status: "Aktiv"
priority: "Hoch"
category: "Komponenten/Admin"
tags: ["Admin", "Dashboard", "Management", "Interface", "TypeScript", "Vue3"]
---

# Admin-Interface - Vollständige Dokumentation

> **Letzte Aktualisierung:** 17.05.2025 | **Version:** 1.0.0 | **Status:** Aktiv

## Übersicht

Das Admin-Interface des Digitale Akte Assistenten bietet eine umfassende Verwaltungsoberfläche für Systemadministratoren. Es ermöglicht die Verwaltung von Benutzern, Systemeinstellungen, Feedback, MOTD (Message of the Day), Feature-Toggles und System-Logs.

## Architektur

### Komponenten-Struktur

```
src/
├── views/
│   └── AdminView.vue           # Haupt-Admin-View mit Tab-Navigation
├── components/admin/tabs/
│   ├── AdminDashboard.vue      # Dashboard-Übersicht
│   ├── AdminUsers.vue          # Benutzerverwaltung
│   ├── AdminFeedback.vue       # Feedback-Verwaltung
│   ├── AdminMotd.vue           # MOTD-Editor
│   ├── AdminSystem.vue         # Systemeinstellungen
│   ├── AdminLogViewer.vue      # Log-Viewer
│   └── AdminFeatureToggles.vue # Feature-Toggle-Management
└── stores/admin/
    ├── index.ts                # Zentraler Admin-Store
    ├── users.ts                # Benutzer-Store
    ├── feedback.ts             # Feedback-Store
    ├── motd.ts                 # MOTD-Store
    ├── system.ts               # System-Store
    └── logs.ts                 # Logs-Store
```

### Store-Integration

Das Admin-Interface nutzt Pinia-Stores für die Zustandsverwaltung:

```typescript
// stores/admin/index.ts
export const useAdminStore = defineStore("admin", () => {
  const currentSection = ref<AdminSection>("dashboard");
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  // Sub-Stores
  const usersStore = useAdminUsersStore();
  const systemStore = useAdminSystemStore();
  const feedbackStore = useAdminFeedbackStore();
  const motdStore = useAdminMotdStore();
  
  // Methoden zum Laden von Daten pro Sektion
  async function loadSectionData(section: AdminSection) {
    // ...
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

## Komponenten-Details

### AdminView.vue

Die Hauptkomponente für die Admin-Oberfläche mit Tab-Navigation:

```vue
<template>
  <div class="admin-view">
    <div class="admin-header">
      <h1>{{ sectionTitle }}</h1>
    </div>
    
    <!-- Tab Navigation -->
    <div class="admin-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="currentSection = tab.id"
        :class="{ active: currentSection === tab.id }"
        class="tab-button"
      >
        <i :class="['fas', tab.icon]" class="tab-icon"></i>
        {{ tab.label }}
      </button>
    </div>
    
    <!-- Main Content Area -->
    <div class="admin-content">
      <component :is="currentTabComponent" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAdminStore } from '@/stores/admin'

// Import aller Tab-Komponenten
import AdminDashboard from '@/components/admin/tabs/AdminDashboard.vue'
import AdminUsers from '@/components/admin/tabs/AdminUsers.vue'
// ... weitere Imports

const tabs = ref<Tab[]>([
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'fa-tachometer-alt',
    component: AdminDashboard
  },
  // ... weitere Tabs
]);
</script>
```

### AdminDashboard.vue

Dashboard-Übersicht mit System-Status und Statistiken:

```vue
<template>
  <div class="admin-dashboard">
    <h2>{{ t("admin.dashboard.title", "Dashboard") }}</h2>
    
    <!-- System Status Card -->
    <div class="admin-dashboard__status-card" :class="systemStatusClass">
      <div class="admin-dashboard__status-icon">
        <i class="fas" :class="systemStatusIcon"></i>
      </div>
      <div class="admin-dashboard__status-content">
        <h3>{{ t("admin.dashboard.systemStatus", "Systemstatus") }}</h3>
        <p>{{ systemStatusText }}</p>
      </div>
    </div>
    
    <!-- Statistic Cards Grid -->
    <div class="admin-dashboard__stats-grid">
      <div v-for="stat in statsCards" :key="stat.id" class="stat-card">
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useAdminSystemStore } from "@/stores/admin/system";
import { useAdminUsersStore } from "@/stores/admin/users";
import { useAdminFeedbackStore } from "@/stores/admin/feedback";

const adminSystemStore = useAdminSystemStore();
const adminUsersStore = useAdminUsersStore();
const adminFeedbackStore = useAdminFeedbackStore();

const { stats: systemStats } = storeToRefs(adminSystemStore);
const { totalUsers } = storeToRefs(adminUsersStore);
const { stats: feedbackStats } = storeToRefs(adminFeedbackStore);
</script>
```

### AdminUsers.vue

Benutzerverwaltung mit CRUD-Operationen:

```vue
<template>
  <div class="admin-users">
    <h2>{{ t("admin.users.title", "Benutzerverwaltung") }}</h2>
    
    <!-- User Statistics -->
    <div class="admin-users__stats">
      <div class="stat-card">
        <div class="stat-value">{{ totalUsers }}</div>
        <div class="stat-label">{{ t("admin.users.totalUsers", "Gesamtzahl") }}</div>
      </div>
    </div>
    
    <!-- User List -->
    <div class="admin-users__list">
      <table class="users-table">
        <thead>
          <tr>
            <th>{{ t("admin.users.name", "Name") }}</th>
            <th>{{ t("admin.users.email", "E-Mail") }}</th>
            <th>{{ t("admin.users.role", "Rolle") }}</th>
            <th>{{ t("admin.users.status", "Status") }}</th>
            <th>{{ t("admin.users.actions", "Aktionen") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.role }}</td>
            <td>{{ user.status }}</td>
            <td>
              <button @click="editUser(user)">
                <i class="fas fa-edit"></i>
              </button>
              <button @click="deleteUser(user)">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useAdminUsersStore } from "@/stores/admin/users";

const usersStore = useAdminUsersStore();
const { users, totalUsers, loading } = storeToRefs(usersStore);

const editUser = (user: User) => {
  // Bearbeiten-Logik
};

const deleteUser = async (user: User) => {
  await usersStore.deleteUser(user.id);
};
</script>
```

### AdminFeedback.vue

Feedback-Verwaltung mit Filterung und Sortierung:

```vue
<template>
  <div class="admin-feedback">
    <h2>{{ t("admin.feedback.title", "Feedback-Übersicht") }}</h2>
    
    <!-- Summary Statistics -->
    <div class="admin-feedback__stats">
      <div class="stats-card stats-card--total">
        <div class="stats-card__value">{{ stats.total }}</div>
        <div class="stats-card__label">{{ t("admin.feedback.stats.total", "Gesamt") }}</div>
      </div>
      <div class="stats-card stats-card--positive">
        <div class="stats-card__value">{{ stats.positive }}</div>
        <div class="stats-card__label">{{ t("admin.feedback.stats.positive", "Positiv") }}</div>
      </div>
      <div class="stats-card stats-card--negative">
        <div class="stats-card__value">{{ stats.negative }}</div>
        <div class="stats-card__label">{{ t("admin.feedback.stats.negative", "Negativ") }}</div>
      </div>
    </div>
    
    <!-- Feedback List -->
    <div class="admin-feedback__list">
      <div v-for="feedback in feedbackItems" :key="feedback.id" 
           class="feedback-item">
        <div class="feedback-header">
          <span class="feedback-user">{{ feedback.user }}</span>
          <span class="feedback-date">{{ formatDate(feedback.date) }}</span>
        </div>
        <div class="feedback-content">{{ feedback.content }}</div>
        <div class="feedback-actions">
          <button @click="markAsResolved(feedback)">
            {{ t("admin.feedback.resolve", "Als gelöst markieren") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
```

### AdminMotd.vue

Message-of-the-Day Editor mit Vorschau:

```vue
<template>
  <div class="admin-motd">
    <h2>{{ t("admin.motd.title", "Message of the Day Editor") }}</h2>
    
    <div class="admin-motd__actions">
      <Button
        variant="primary"
        :disabled="!hasUnsavedChanges"
        @click="saveMotd"
        :loading="loading"
      >
        {{ t("admin.motd.save", "Speichern") }}
      </Button>
      <Button variant="outline" @click="togglePreview">
        {{ previewMode ? t("admin.motd.edit", "Bearbeiten") : t("admin.motd.preview", "Vorschau") }}
      </Button>
    </div>
    
    <!-- Editor -->
    <div v-if="!previewMode" class="admin-motd__editor">
      <div class="admin-motd__field">
        <Toggle
          v-model="motdConfig.enabled"
          :label="t('admin.motd.enabled', 'Aktiviert')"
        />
      </div>
      
      <div class="admin-motd__field">
        <label>{{ t("admin.motd.message", "Nachricht") }}</label>
        <textarea
          v-model="motdConfig.message"
          rows="10"
          placeholder="Nachricht eingeben..."
        ></textarea>
      </div>
    </div>
    
    <!-- Preview -->
    <div v-else class="admin-motd__preview">
      <h3>{{ t("admin.motd.previewTitle", "Vorschau") }}</h3>
      <div class="motd-preview-content" v-html="formattedMessage"></div>
    </div>
  </div>
</template>
```

### AdminSystem.vue

Systemeinstellungen und Ressourcenübersicht:

```vue
<template>
  <div class="admin-system">
    <h2>{{ t("admin.system.title", "Systemeinstellungen") }}</h2>
    
    <!-- System Resource Metrics -->
    <div class="admin-system__metrics">
      <h3>{{ t("admin.system.resourceMetrics", "Ressourcennutzung") }}</h3>
      
      <div class="admin-system__metrics-grid">
        <!-- CPU Usage -->
        <div class="admin-system__metric-card">
          <div class="admin-system__metric-title">
            <i class="fas fa-microchip"></i>
            <span>{{ t("admin.system.metrics.cpu", "CPU-Auslastung") }}</span>
          </div>
          <div class="admin-system__meter">
            <div class="admin-system__meter-fill"
                 :style="{ width: `${stats.cpu_usage_percent || 0}%` }"></div>
          </div>
          <div class="admin-system__meter-value">
            {{ stats.cpu_usage_percent || 0 }}%
          </div>
        </div>
        
        <!-- Memory Usage -->
        <div class="admin-system__metric-card">
          <div class="admin-system__metric-title">
            <i class="fas fa-memory"></i>
            <span>{{ t("admin.system.metrics.memory", "Speicherauslastung") }}</span>
          </div>
          <div class="admin-system__meter">
            <div class="admin-system__meter-fill"
                 :style="{ width: `${stats.memory_usage_percent || 0}%` }"></div>
          </div>
          <div class="admin-system__meter-value">
            {{ stats.memory_usage_percent || 0 }}%
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

## API-Integration

### Admin API Service

```typescript
// services/api/admin.ts
export class AdminApiService {
  // User Management
  async getUsers(params?: UserQueryParams): Promise<User[]> {
    return apiClient.get('/admin/users', { params });
  }
  
  async createUser(userData: CreateUserDto): Promise<User> {
    return apiClient.post('/admin/users', userData);
  }
  
  async updateUser(userId: string, userData: UpdateUserDto): Promise<User> {
    return apiClient.put(`/admin/users/${userId}`, userData);
  }
  
  async deleteUser(userId: string): Promise<void> {
    return apiClient.delete(`/admin/users/${userId}`);
  }
  
  // System Stats
  async getSystemStats(): Promise<SystemStats> {
    return apiClient.get('/admin/system/stats');
  }
  
  // Feedback Management
  async getFeedback(params?: FeedbackQueryParams): Promise<Feedback[]> {
    return apiClient.get('/admin/feedback', { params });
  }
  
  async resolveFeedback(feedbackId: string): Promise<void> {
    return apiClient.post(`/admin/feedback/${feedbackId}/resolve`);
  }
  
  // MOTD Management
  async getMotdConfig(): Promise<MotdConfig> {
    return apiClient.get('/admin/motd');
  }
  
  async updateMotdConfig(config: MotdConfig): Promise<void> {
    return apiClient.put('/admin/motd', config);
  }
}
```

## Berechtigungskonzept

### Route Guards

```typescript
// router/index.ts
const adminRoutes = {
  path: '/admin',
  name: 'Admin',
  component: AdminView,
  meta: { requiresAdmin: true },
  beforeEnter: (to, from, next) => {
    const authStore = useAuthStore();
    if (!authStore.isAdmin) {
      return next('/unauthorized');
    }
    next();
  },
  children: [
    // Admin sub-routes
  ]
};
```

### Store-Level Authorization

```typescript
// stores/admin/index.ts
export const useAdminStore = defineStore("admin", () => {
  const authStore = useAuthStore();
  
  // Authorization check
  const canAccess = computed(() => {
    return authStore.isAuthenticated && authStore.isAdmin;
  });
  
  // Protected actions
  async function performAdminAction() {
    if (!canAccess.value) {
      throw new UnauthorizedError("Admin access required");
    }
    // Perform action
  }
});
```

## Fehlerbehandlung

### Error Boundaries

```typescript
// components/admin/ErrorBoundary.vue
export default defineComponent({
  name: 'AdminErrorBoundary',
  
  errorCaptured(error: Error, instance: ComponentInternalInstance | null, info: string) {
    console.error('Admin error:', error);
    
    // Log to monitoring
    this.$monitoring.captureException(error, {
      context: 'admin',
      componentInfo: info
    });
    
    // Show user-friendly error
    this.$toast.error('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
    
    return false; // Prevent propagation
  }
});
```

### Store Error Handling

```typescript
// stores/admin/users.ts
export const useAdminUsersStore = defineStore("adminUsers", () => {
  const error = ref<string | null>(null);
  const loading = ref(false);
  
  async function fetchUsers() {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await adminApi.getUsers();
      users.value = response;
    } catch (err) {
      error.value = err.message || 'Fehler beim Laden der Benutzer';
      console.error('Failed to fetch users:', err);
    } finally {
      loading.value = false;
    }
  }
});
```

## Performance-Optimierung

### Lazy Loading

```typescript
// router/index.ts
const adminRoutes = {
  path: '/admin',
  component: () => import(
    /* webpackChunkName: "admin" */
    '@/views/AdminView.vue'
  ),
  children: [
    {
      path: 'users',
      component: () => import(
        /* webpackChunkName: "admin-users" */
        '@/components/admin/tabs/AdminUsers.vue'
      )
    }
    // weitere Tabs...
  ]
};
```

### Virtualisierung für große Listen

```vue
<!-- components/admin/tabs/AdminUsers.vue -->
<template>
  <RecycleScroller
    :items="users"
    :item-size="60"
    key-field="id"
    v-slot="{ item }"
  >
    <UserListItem :user="item" />
  </RecycleScroller>
</template>
```

### Caching Strategien

```typescript
// stores/admin/users.ts
export const useAdminUsersStore = defineStore("adminUsers", () => {
  const users = ref<User[]>([]);
  const lastFetch = ref<Date | null>(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 Minuten
  
  async function fetchUsers(force = false) {
    const now = new Date();
    
    if (!force && lastFetch.value && 
        now.getTime() - lastFetch.value.getTime() < CACHE_DURATION) {
      return; // Use cached data
    }
    
    // Fetch fresh data
    const response = await adminApi.getUsers();
    users.value = response;
    lastFetch.value = now;
  }
});
```

## Responsive Design

### Mobile Anpassungen

```scss
// styles/admin.scss
.admin-view {
  @media (max-width: 768px) {
    .admin-tabs {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      
      .tab-button {
        min-width: 120px;
        padding: 12px 16px;
      }
    }
    
    .admin-content {
      padding: 16px;
    }
  }
}

.admin-dashboard__stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}
```

### Touch-Optimierung

```vue
<!-- components/admin/tabs/AdminUsers.vue -->
<template>
  <SwipeableListItem
    v-for="user in users"
    :key="user.id"
    @swipe-left="showActions(user)"
    @swipe-right="hideActions(user)"
  >
    <UserCard :user="user" />
    
    <template #actions>
      <button @click="editUser(user)">Bearbeiten</button>
      <button @click="deleteUser(user)">Löschen</button>
    </template>
  </SwipeableListItem>
</template>
```

## Testing

### Component Tests

```typescript
// test/components/admin/AdminDashboard.spec.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AdminDashboard from '@/components/admin/tabs/AdminDashboard.vue';
import { createTestingPinia } from '@pinia/testing';

describe('AdminDashboard', () => {
  it('displays system status correctly', async () => {
    const wrapper = mount(AdminDashboard, {
      global: {
        plugins: [
          createTestingPinia({
            initialState: {
              adminSystem: {
                stats: {
                  cpu_usage_percent: 45,
                  memory_usage_percent: 60
                }
              }
            }
          })
        ]
      }
    });
    
    expect(wrapper.find('.admin-dashboard__status-value').text())
      .toBe('Normal');
    expect(wrapper.find('.admin-dashboard__status-card')
      .classes()).toContain('admin-dashboard__status-card--normal');
  });
});
```

### E2E Tests

```typescript
// test/e2e/admin/admin-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('#email', 'admin@example.com');
    await page.fill('#password', 'admin-password');
    await page.click('button[type="submit"]');
    
    // Navigate to admin
    await page.goto('/admin');
  });
  
  test('can navigate between tabs', async ({ page }) => {
    // Click on Users tab
    await page.click('button:text("Benutzer")');
    await expect(page.locator('h2')).toContainText('Benutzerverwaltung');
    
    // Click on Feedback tab
    await page.click('button:text("Feedback")');
    await expect(page.locator('h2')).toContainText('Feedback-Übersicht');
  });
  
  test('can create new user', async ({ page }) => {
    await page.click('button:text("Benutzer")');
    await page.click('button:text("Neuer Benutzer")');
    
    // Fill form
    await page.fill('#user-name', 'Test User');
    await page.fill('#user-email', 'test@example.com');
    await page.selectOption('#user-role', 'user');
    
    // Submit
    await page.click('button:text("Speichern")');
    
    // Verify user appears in list
    await expect(page.locator('td:text("Test User")')).toBeVisible();
  });
});
```

## Bekannte Einschränkungen

1. **Echtzeit-Updates**: Derzeit keine WebSocket-Integration für Live-Updates
2. **Batch-Operationen**: Keine Mehrfachauswahl für Batch-Aktionen
3. **Export-Funktionen**: Export nur für Logs implementiert, nicht für andere Daten
4. **Audit-Trail**: Limitierte Nachverfolgung von Admin-Aktionen

## Geplante Verbesserungen

1. **WebSocket-Integration**:
   - Live-Updates für System-Metriken
   - Echtzeit-Benachrichtigungen für neue Feedbacks
   - Multi-User-Synchronisation

2. **Erweiterte Filterung**:
   - Erweiterte Suchfilter für alle Listen
   - Gespeicherte Filtervorlagen
   - Export gefilterter Daten

3. **Audit-System**:
   - Vollständiges Audit-Trail für alle Admin-Aktionen
   - Änderungshistorie für Benutzer und Einstellungen
   - Compliance-Reports

4. **Dashboard-Erweiterungen**:
   - Anpassbare Dashboard-Widgets
   - Historische Datenvisualisierung
   - Predictive Analytics

5. **Bulk-Operationen**:
   - Mehrfachauswahl für Benutzer
   - Batch-Import/Export
   - Massenaktionen

## Fazit

Das Admin-Interface bietet eine solide Basis für die Verwaltung des Digitale Akte Assistenten. Die modulare Architektur ermöglicht einfache Erweiterungen und Anpassungen. Die Verwendung von TypeScript und Vue 3 Composition API sorgt für Type-Safety und bessere Wartbarkeit.

Die klare Trennung zwischen UI-Komponenten und Business-Logik in Stores macht das System testbar und wartungsfreundlich. Die implementierte Fehlerbehandlung und das Berechtigungskonzept sorgen für eine sichere und stabile Admin-Umgebung.