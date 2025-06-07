<template>
  <div class="admin-widget-marketplace">
    <h2 class="marketplace__title">
      {{ t('admin.widgets.title', 'Widget Marketplace') }}
    </h2>

    <!-- Stats Overview -->
    <div class="marketplace__stats">
      <div class="stat-card">
        <div class="stat-card__icon">
          <i class="fas fa-puzzle-piece"></i>
        </div>
        <div class="stat-card__content">
          <div class="stat-card__value">{{ stats.total_available }}</div>
          <div class="stat-card__label">
            {{ t('admin.widgets.stats.available', 'Verfügbare Widgets') }}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card__icon">
          <i class="fas fa-download"></i>
        </div>
        <div class="stat-card__content">
          <div class="stat-card__value">{{ stats.total_installed }}</div>
          <div class="stat-card__label">
            {{ t('admin.widgets.stats.installed', 'Installierte Widgets') }}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card__icon">
          <i class="fas fa-star"></i>
        </div>
        <div class="stat-card__content">
          <div class="stat-card__value">{{ stats.average_rating?.toFixed(1) || '0.0' }}</div>
          <div class="stat-card__label">
            {{ t('admin.widgets.stats.avgRating', 'Durchschnittliche Bewertung') }}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card__icon">
          <i class="fas fa-cloud-download-alt"></i>
        </div>
        <div class="stat-card__content">
          <div class="stat-card__value">{{ formatNumber(stats.total_downloads) }}</div>
          <div class="stat-card__label">
            {{ t('admin.widgets.stats.downloads', 'Gesamt Downloads') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="marketplace__tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-button"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <i :class="tab.icon"></i>
        {{ tab.label }}
      </button>
    </div>

    <!-- Available Widgets Tab -->
    <div v-if="activeTab === 'available'" class="marketplace__content">
      <!-- Search and Filters -->
      <div class="marketplace__controls">
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input
            v-model="searchTerm"
            type="text"
            :placeholder="t('admin.widgets.search', 'Widgets suchen...')"
            @input="debouncedSearch"
          />
        </div>

        <select v-model="selectedCategory" @change="fetchAvailableWidgets" class="category-filter">
          <option value="">
            {{ t('admin.widgets.allCategories', 'Alle Kategorien') }}
          </option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>

      <!-- Widget Grid -->
      <div v-if="!loading" class="widgets-grid">
        <div
          v-for="widget in availableWidgets"
          :key="widget.id"
          class="widget-card"
          :class="{ installed: widget.status === 'installed' }"
        >
          <div class="widget-card__header">
            <img
              v-if="widget.icon"
              :src="widget.icon"
              :alt="widget.name"
              class="widget-icon"
              @error="handleImageError"
            />
            <div v-else class="widget-icon-placeholder">
              <i class="fas fa-puzzle-piece"></i>
            </div>
            <div class="widget-info">
              <h3 class="widget-name">{{ widget.name }}</h3>
              <p class="widget-author">{{ widget.author }}</p>
            </div>
            <div class="widget-rating">
              <i class="fas fa-star"></i>
              {{ widget.rating.toFixed(1) }}
            </div>
          </div>

          <p class="widget-description">{{ widget.description }}</p>

          <div class="widget-tags">
            <span v-for="tag in widget.tags.slice(0, 3)" :key="tag" class="tag">
              {{ tag }}
            </span>
          </div>

          <div class="widget-footer">
            <div class="widget-stats">
              <span>
                <i class="fas fa-download"></i>
                {{ formatNumber(widget.downloads) }}
              </span>
              <span>
                <i class="fas fa-code-branch"></i>
                v{{ widget.current_version.version }}
              </span>
            </div>

            <button
              v-if="widget.status === 'available'"
              class="install-button"
              @click="installWidget(widget.id)"
              :disabled="installing[widget.id]"
            >
              <i class="fas fa-download"></i>
              {{ t('admin.widgets.install', 'Installieren') }}
            </button>

            <button
              v-else-if="widget.status === 'installed'"
              class="installed-button"
              disabled
            >
              <i class="fas fa-check"></i>
              {{ t('admin.widgets.installed', 'Installiert') }}
            </button>

            <button
              v-else-if="widget.status === 'update_available'"
              class="update-button"
              @click="updateWidget(widget.id)"
              :disabled="updating[widget.id]"
            >
              <i class="fas fa-sync"></i>
              {{ t('admin.widgets.update', 'Update') }}
            </button>
          </div>
        </div>
      </div>

      <div v-else class="loading-container">
        <div class="loading-spinner"></div>
        <p>{{ t('admin.widgets.loading', 'Lade Widgets...') }}</p>
      </div>
    </div>

    <!-- Installed Widgets Tab -->
    <div v-else-if="activeTab === 'installed'" class="marketplace__content">
      <div v-if="installedWidgets.length > 0" class="installed-widgets">
        <div
          v-for="widget in installedWidgets"
          :key="widget.id"
          class="installed-widget-card"
        >
          <div class="widget-header">
            <h3>{{ widget.name }}</h3>
            <div class="widget-version">
              v{{ widget.installed_version }}
              <span v-if="widget.has_update" class="update-badge">
                {{ t('admin.widgets.updateAvailable', 'Update verfügbar') }}
              </span>
            </div>
          </div>

          <p class="widget-description">{{ widget.description }}</p>

          <div class="widget-meta">
            <span class="meta-item">
              <i class="fas fa-calendar"></i>
              {{ t('admin.widgets.installedOn', 'Installiert am') }}:
              {{ formatDate(widget.installed_at) }}
            </span>
            <span class="meta-item">
              <i class="fas fa-folder"></i>
              {{ widget.category }}
            </span>
          </div>

          <div class="widget-actions">
            <button
              v-if="widget.is_enabled"
              class="action-button disable"
              @click="disableWidget(widget.id)"
            >
              <i class="fas fa-power-off"></i>
              {{ t('admin.widgets.disable', 'Deaktivieren') }}
            </button>
            <button
              v-else
              class="action-button enable"
              @click="enableWidget(widget.id)"
            >
              <i class="fas fa-power-off"></i>
              {{ t('admin.widgets.enable', 'Aktivieren') }}
            </button>

            <button
              v-if="widget.has_update"
              class="action-button update"
              @click="updateWidget(widget.id)"
            >
              <i class="fas fa-sync"></i>
              {{ t('admin.widgets.update', 'Update') }}
            </button>

            <button
              class="action-button configure"
              @click="configureWidget(widget.id)"
            >
              <i class="fas fa-cog"></i>
              {{ t('admin.widgets.configure', 'Konfigurieren') }}
            </button>

            <button
              class="action-button uninstall"
              @click="uninstallWidget(widget.id)"
            >
              <i class="fas fa-trash"></i>
              {{ t('admin.widgets.uninstall', 'Deinstallieren') }}
            </button>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <i class="fas fa-puzzle-piece"></i>
        <p>{{ t('admin.widgets.noInstalled', 'Keine Widgets installiert') }}</p>
        <button class="primary-button" @click="activeTab = 'available'">
          {{ t('admin.widgets.browseWidgets', 'Widgets durchsuchen') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '@/composables/useToast';
import { AdminService } from '@/services/api/AdminService';

const { t } = useI18n();
const toast = useToast();
const adminService = new AdminService();

// State
const activeTab = ref<'available' | 'installed'>('available');
const loading = ref(false);
const searchTerm = ref('');
const selectedCategory = ref('');
const availableWidgets = ref<any[]>([]);
const installedWidgets = ref<any[]>([]);
const categories = ref<any[]>([]);
const stats = ref({
  total_available: 0,
  total_installed: 0,
  total_downloads: 0,
  average_rating: 0
});

const installing = ref<Record<string, boolean>>({});
const updating = ref<Record<string, boolean>>({});

// Tabs configuration
const tabs = [
  {
    id: 'available',
    label: t('admin.widgets.tabs.available', 'Verfügbare Widgets'),
    icon: 'fas fa-store'
  },
  {
    id: 'installed',
    label: t('admin.widgets.tabs.installed', 'Installierte Widgets'),
    icon: 'fas fa-download'
  }
];

// Debounced search
let searchTimeout: number;
const debouncedSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = window.setTimeout(() => {
    fetchAvailableWidgets();
  }, 300);
};

// Fetch functions
async function fetchAvailableWidgets() {
  loading.value = true;
  try {
    const response = await adminService.request('/api/admin/widgets/available', {
      params: {
        category: selectedCategory.value || undefined,
        search: searchTerm.value || undefined
      }
    });
    
    if (response.data.success) {
      availableWidgets.value = response.data.widgets;
    }
  } catch (error) {
    console.error('Failed to fetch widgets:', error);
    toast.error(t('admin.widgets.errors.fetchFailed', 'Fehler beim Laden der Widgets'));
  } finally {
    loading.value = false;
  }
}

async function fetchInstalledWidgets() {
  try {
    const response = await adminService.request('/api/admin/widgets/installed');
    
    if (response.data.success) {
      installedWidgets.value = response.data.widgets;
    }
  } catch (error) {
    console.error('Failed to fetch installed widgets:', error);
  }
}

async function fetchCategories() {
  try {
    const response = await adminService.request('/api/admin/widgets/categories');
    
    if (response.data.success) {
      categories.value = response.data.categories;
    }
  } catch (error) {
    console.error('Failed to fetch categories:', error);
  }
}

async function fetchStats() {
  try {
    const response = await adminService.request('/api/admin/widgets/stats');
    
    if (response.data.success) {
      stats.value = response.data.stats;
    }
  } catch (error) {
    console.error('Failed to fetch stats:', error);
  }
}

// Widget actions
async function installWidget(widgetId: string) {
  installing.value[widgetId] = true;
  try {
    const response = await adminService.request(`/api/admin/widgets/install/${widgetId}`, {
      method: 'POST'
    });
    
    if (response.data.success) {
      toast.success(t('admin.widgets.installSuccess', 'Widget erfolgreich installiert'));
      await Promise.all([
        fetchAvailableWidgets(),
        fetchInstalledWidgets(),
        fetchStats()
      ]);
    }
  } catch (error) {
    console.error('Failed to install widget:', error);
    toast.error(t('admin.widgets.errors.installFailed', 'Installation fehlgeschlagen'));
  } finally {
    installing.value[widgetId] = false;
  }
}

async function uninstallWidget(widgetId: string) {
  if (!confirm(t('admin.widgets.confirmUninstall', 'Widget wirklich deinstallieren?'))) {
    return;
  }
  
  try {
    const response = await adminService.request(`/api/admin/widgets/uninstall/${widgetId}`, {
      method: 'DELETE'
    });
    
    if (response.data.success) {
      toast.success(t('admin.widgets.uninstallSuccess', 'Widget erfolgreich deinstalliert'));
      await Promise.all([
        fetchAvailableWidgets(),
        fetchInstalledWidgets(),
        fetchStats()
      ]);
    }
  } catch (error) {
    console.error('Failed to uninstall widget:', error);
    toast.error(t('admin.widgets.errors.uninstallFailed', 'Deinstallation fehlgeschlagen'));
  }
}

async function updateWidget(widgetId: string) {
  updating.value[widgetId] = true;
  try {
    const response = await adminService.request(`/api/admin/widgets/update/${widgetId}`, {
      method: 'PUT'
    });
    
    if (response.data.success) {
      toast.success(t('admin.widgets.updateSuccess', 'Widget erfolgreich aktualisiert'));
      await Promise.all([
        fetchAvailableWidgets(),
        fetchInstalledWidgets()
      ]);
    }
  } catch (error) {
    console.error('Failed to update widget:', error);
    toast.error(t('admin.widgets.errors.updateFailed', 'Update fehlgeschlagen'));
  } finally {
    updating.value[widgetId] = false;
  }
}

async function enableWidget(widgetId: string) {
  try {
    const response = await adminService.request(`/api/admin/widgets/enable/${widgetId}`, {
      method: 'PUT'
    });
    
    if (response.data.success) {
      toast.success(t('admin.widgets.enableSuccess', 'Widget aktiviert'));
      await fetchInstalledWidgets();
    }
  } catch (error) {
    console.error('Failed to enable widget:', error);
    toast.error(t('admin.widgets.errors.enableFailed', 'Aktivierung fehlgeschlagen'));
  }
}

async function disableWidget(widgetId: string) {
  try {
    const response = await adminService.request(`/api/admin/widgets/disable/${widgetId}`, {
      method: 'PUT'
    });
    
    if (response.data.success) {
      toast.success(t('admin.widgets.disableSuccess', 'Widget deaktiviert'));
      await fetchInstalledWidgets();
    }
  } catch (error) {
    console.error('Failed to disable widget:', error);
    toast.error(t('admin.widgets.errors.disableFailed', 'Deaktivierung fehlgeschlagen'));
  }
}

function configureWidget(widgetId: string) {
  // TODO: Open configuration dialog
  toast.info(t('admin.widgets.configureInfo', 'Widget-Konfiguration wird geöffnet...'));
}

// Utility functions
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
  const placeholder = img.nextElementSibling;
  if (placeholder) {
    (placeholder as HTMLElement).style.display = 'flex';
  }
}

// Watch tab changes
watch(activeTab, (newTab) => {
  if (newTab === 'installed') {
    fetchInstalledWidgets();
  }
});

// Initialize
onMounted(async () => {
  await Promise.all([
    fetchAvailableWidgets(),
    fetchCategories(),
    fetchStats()
  ]);
});
</script>

<style scoped>
.admin-widget-marketplace {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.marketplace__title {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--n-color-text-primary);
}

/* Stats */
.marketplace__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 1.25rem;
  background: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  border-left: 4px solid var(--n-color-primary);
}

.stat-card__icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--n-color-primary-rgb), 0.1);
  color: var(--n-color-primary);
  border-radius: 50%;
  font-size: 1.25rem;
  margin-right: 1rem;
}

.stat-card__value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--n-color-text-primary);
}

.stat-card__label {
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

/* Tabs */
.marketplace__tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--n-color-border);
}

.tab-button {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  color: var(--n-color-text-secondary);
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  position: relative;
}

.tab-button:hover {
  color: var(--n-color-text-primary);
}

.tab-button.active {
  color: var(--n-color-primary);
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--n-color-primary);
}

/* Controls */
.marketplace__controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.search-box {
  flex: 1;
  position: relative;
}

.search-box i {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--n-color-text-tertiary);
}

.search-box input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background: var(--n-color-background);
  font-size: inherit;
}

.category-filter {
  padding: 0.75rem 1rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background: var(--n-color-background);
  font-size: inherit;
  cursor: pointer;
}

/* Widget Grid */
.widgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.widget-card {
  background: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
}

.widget-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.widget-card.installed {
  border: 2px solid var(--n-color-success);
}

.widget-card__header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.widget-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--n-border-radius);
  object-fit: cover;
}

.widget-icon-placeholder {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--n-color-primary-rgb), 0.1);
  color: var(--n-color-primary);
  border-radius: var(--n-border-radius);
  font-size: 1.25rem;
}

.widget-info {
  flex: 1;
}

.widget-name {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.widget-author {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

.widget-rating {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--n-color-warning);
  font-weight: 500;
}

.widget-description {
  color: var(--n-color-text-secondary);
  line-height: 1.5;
  margin-bottom: 1rem;
  flex: 1;
}

.widget-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tag {
  padding: 0.25rem 0.5rem;
  background: rgba(var(--n-color-primary-rgb), 0.1);
  color: var(--n-color-primary);
  border-radius: var(--n-border-radius-sm);
  font-size: 0.75rem;
}

.widget-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid var(--n-color-border);
}

.widget-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--n-color-text-tertiary);
}

.widget-stats span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.install-button,
.update-button,
.installed-button {
  padding: 0.5rem 1rem;
  border-radius: var(--n-border-radius);
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  border: none;
}

.install-button {
  background: var(--n-color-primary);
  color: var(--n-color-on-primary);
}

.install-button:hover:not(:disabled) {
  background: var(--n-color-primary-dark);
}

.update-button {
  background: var(--n-color-warning);
  color: white;
}

.update-button:hover:not(:disabled) {
  background: var(--n-color-warning-dark);
}

.installed-button {
  background: var(--n-color-success);
  color: white;
  cursor: default;
}

/* Installed Widgets */
.installed-widgets {
  display: grid;
  gap: 1rem;
}

.installed-widget-card {
  background: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.5rem;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.widget-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--n-color-text-primary);
}

.widget-version {
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

.update-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  background: var(--n-color-warning);
  color: white;
  border-radius: var(--n-border-radius-sm);
  font-size: 0.75rem;
  margin-left: 0.5rem;
}

.widget-meta {
  display: flex;
  gap: 1.5rem;
  margin: 1rem 0;
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.widget-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--n-color-border);
}

.action-button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background: var(--n-color-background);
  color: var(--n-color-text-primary);
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.action-button:hover {
  background: var(--n-color-hover);
}

.action-button.uninstall {
  color: var(--n-color-error);
  border-color: var(--n-color-error);
}

.action-button.uninstall:hover {
  background: rgba(var(--n-color-error-rgb), 0.1);
}

/* Loading and Empty States */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  color: var(--n-color-text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(var(--n-color-primary-rgb), 0.1);
  border-radius: 50%;
  border-top-color: var(--n-color-primary);
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  text-align: center;
}

.empty-state i {
  font-size: 3rem;
  color: var(--n-color-text-tertiary);
  margin-bottom: 1rem;
}

.empty-state p {
  color: var(--n-color-text-secondary);
  margin-bottom: 1.5rem;
}

.primary-button {
  padding: 0.75rem 1.5rem;
  background: var(--n-color-primary);
  color: var(--n-color-on-primary);
  border: none;
  border-radius: var(--n-border-radius);
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.primary-button:hover {
  background: var(--n-color-primary-dark);
}

/* Responsive */
@media (max-width: 768px) {
  .marketplace__stats {
    grid-template-columns: 1fr 1fr;
  }

  .marketplace__controls {
    flex-direction: column;
  }

  .widgets-grid {
    grid-template-columns: 1fr;
  }

  .widget-actions {
    flex-wrap: wrap;
  }
}
</style>