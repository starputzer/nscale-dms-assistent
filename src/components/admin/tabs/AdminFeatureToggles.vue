<template>
  <div class="admin-feature-toggles">
    <h2 class="admin-feature-toggles__title">{{ t('admin.featureToggles.title', 'Feature-Toggles') }}</h2>
    <p class="admin-feature-toggles__description">
      {{ t('admin.featureToggles.description', 'Verwalten Sie hier die Feature-Flags, um neue Funktionalitäten zu aktivieren oder zu deaktivieren.') }}
    </p>
    
    <!-- Info-Box für Administratoren -->
    <div class="admin-feature-toggles__info-box">
      <div class="admin-feature-toggles__info-icon">
        <i class="fas fa-info-circle" aria-hidden="true"></i>
      </div>
      <div class="admin-feature-toggles__info-content">
        <h3>{{ t('admin.featureToggles.info.title', 'Wichtige Hinweise') }}</h3>
        <p>{{ t('admin.featureToggles.info.content', 'Das Ändern von Feature-Toggles kann sich auf die Stabilität und Funktionalität der Anwendung auswirken. Bitte aktivieren Sie neue Features mit Vorsicht und testen Sie gründlich nach jeder Änderung.') }}</p>
      </div>
    </div>
    
    <!-- Kategoriefilter für Feature-Toggles -->
    <div class="admin-feature-toggles__filter">
      <label for="category-filter" class="admin-feature-toggles__filter-label">
        {{ t('admin.featureToggles.filter.label', 'Nach Kategorie filtern:') }}
      </label>
      <select
        id="category-filter"
        v-model="selectedCategory"
        class="admin-feature-toggles__filter-select"
      >
        <option value="all">{{ t('admin.featureToggles.filter.all', 'Alle Kategorien') }}</option>
        <option v-for="(_, category) in categorizedToggles" :key="category" :value="category">
          {{ translateCategory(category) }}
        </option>
      </select>
      
      <!-- Suchfeld für Feature-Toggles -->
      <div class="admin-feature-toggles__search">
        <label for="toggle-search" class="admin-feature-toggles__search-label">
          {{ t('admin.featureToggles.search.label', 'Features durchsuchen:') }}
        </label>
        <div class="admin-feature-toggles__search-input-container">
          <i class="fas fa-search admin-feature-toggles__search-icon" aria-hidden="true"></i>
          <input
            id="toggle-search"
            v-model="searchQuery"
            type="text"
            class="admin-feature-toggles__search-input"
            :placeholder="t('admin.featureToggles.search.placeholder', 'Suche nach Feature-Namen oder Beschreibung...')"
          />
          <button 
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="admin-feature-toggles__search-clear"
            aria-label="Suche zurücksetzen"
          >
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Quick Actions -->
    <div class="admin-feature-toggles__quick-actions">
      <button
        @click="enableAllFeatures"
        class="admin-feature-toggles__action-button admin-feature-toggles__action-button--primary"
        :disabled="isLoading"
      >
        <i class="fas fa-check-circle" aria-hidden="true"></i>
        {{ t('admin.featureToggles.actions.enableAll', 'Alle Features aktivieren') }}
      </button>
      <button
        @click="disableAllFeatures"
        class="admin-feature-toggles__action-button admin-feature-toggles__action-button--secondary"
        :disabled="isLoading"
      >
        <i class="fas fa-times-circle" aria-hidden="true"></i>
        {{ t('admin.featureToggles.actions.disableAll', 'Alle Features deaktivieren') }}
      </button>
      <button
        @click="resetToDefaults"
        class="admin-feature-toggles__action-button admin-feature-toggles__action-button--danger"
        :disabled="isLoading"
      >
        <i class="fas fa-undo" aria-hidden="true"></i>
        {{ t('admin.featureToggles.actions.reset', 'Auf Standard zurücksetzen') }}
      </button>
    </div>
    
    <!-- Feature-Toggle-Listen nach Kategorie -->
    <div v-if="filteredTogglesByCategory.length > 0" class="admin-feature-toggles__categories">
      <div 
        v-for="category in filteredTogglesByCategory" 
        :key="category.name"
        class="admin-feature-toggles__category"
      >
        <h3 class="admin-feature-toggles__category-title">
          {{ translateCategory(category.name) }}
          <span class="admin-feature-toggles__category-count">
            ({{ category.toggles.length }})
          </span>
        </h3>
        
        <div class="admin-feature-toggles__toggle-list">
          <div 
            v-for="toggle in category.toggles" 
            :key="toggle.id"
            class="admin-feature-toggles__toggle-item"
            :class="{
              'admin-feature-toggles__toggle-item--enabled': toggle.enabled,
              'admin-feature-toggles__toggle-item--disabled': !toggle.enabled,
              'admin-feature-toggles__toggle-item--dev-only': toggle.dev
            }"
          >
            <div class="admin-feature-toggles__toggle-header">
              <div class="admin-feature-toggles__toggle-name-container">
                <span 
                  v-if="toggle.dev"
                  class="admin-feature-toggles__toggle-badge admin-feature-toggles__toggle-badge--dev"
                >
                  {{ t('admin.featureToggles.badges.dev', 'Entwicklung') }}
                </span>
                <h4 class="admin-feature-toggles__toggle-name">{{ toggle.name }}</h4>
              </div>
              
              <label class="admin-feature-toggles__toggle-switch">
                <input 
                  type="checkbox" 
                  :checked="toggle.enabled"
                  @change="toggleFeature(toggle.id)"
                  :disabled="isLoading"
                  :id="`toggle-${toggle.id}`"
                />
                <span class="admin-feature-toggles__toggle-slider"></span>
              </label>
            </div>
            
            <p class="admin-feature-toggles__toggle-description">
              {{ toggle.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Keine Ergebnisse -->
    <div v-else class="admin-feature-toggles__no-results">
      <i class="fas fa-search" aria-hidden="true"></i>
      <p>{{ t('admin.featureToggles.noResults', 'Keine Feature-Toggles gefunden, die Ihren Filterkriterien entsprechen.') }}</p>
      <button 
        @click="clearFilters"
        class="admin-feature-toggles__clear-filters"
      >
        {{ t('admin.featureToggles.clearFilters', 'Filter zurücksetzen') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFeatureTogglesStore } from '@/stores/featureToggles';

// i18n
const { t } = useI18n();

// Store
const featureTogglesStore = useFeatureTogglesStore();

// Local state
const isLoading = ref(false);
const selectedCategory = ref('all');
const searchQuery = ref('');

// Load all toggles from store
onMounted(async () => {
  isLoading.value = true;
  
  try {
    await featureTogglesStore.loadFeatureToggles();
  } catch (error) {
    console.error('Error loading feature toggles:', error);
  } finally {
    isLoading.value = false;
  }
});

// Computed properties
const categorizedToggles = computed(() => {
  return featureTogglesStore.categorizedToggles;
});

// Filter toggles by category and search query
const filteredTogglesByCategory = computed(() => {
  const result = [];
  const categories = selectedCategory.value === 'all' 
    ? Object.keys(categorizedToggles.value) 
    : [selectedCategory.value];
  
  for (const category of categories) {
    // Skip if category doesn't exist
    if (!categorizedToggles.value[category]) continue;
    
    // Filter toggles by search query
    const toggles = categorizedToggles.value[category].filter(toggle => {
      if (!searchQuery.value) return true;
      
      const query = searchQuery.value.toLowerCase();
      return toggle.name.toLowerCase().includes(query) || 
             toggle.description.toLowerCase().includes(query) ||
             toggle.id.toLowerCase().includes(query);
    });
    
    // Add category to result if it has toggles
    if (toggles.length > 0) {
      result.push({
        name: category,
        toggles
      });
    }
  }
  
  return result;
});

// Methods
function toggleFeature(featureId: string) {
  featureTogglesStore.toggleFeature(featureId);
}

function enableAllFeatures() {
  if (confirm(t('admin.featureToggles.confirmations.enableAll', 'Sind Sie sicher, dass Sie alle Features aktivieren möchten? Dies kann die Anwendungsstabilität beeinflussen.'))) {
    isLoading.value = true;
    setTimeout(() => {
      try {
        if (selectedCategory.value === 'all') {
          Object.values(categorizedToggles.value).flat().forEach(toggle => {
            featureTogglesStore.enableFeature(toggle.id);
          });
        } else {
          categorizedToggles.value[selectedCategory.value].forEach(toggle => {
            featureTogglesStore.enableFeature(toggle.id);
          });
        }
      } finally {
        isLoading.value = false;
      }
    }, 500); // Simulate some work
  }
}

function disableAllFeatures() {
  if (confirm(t('admin.featureToggles.confirmations.disableAll', 'Sind Sie sicher, dass Sie alle Features deaktivieren möchten? Dies kann dazu führen, dass Teile der Anwendung nicht mehr funktionieren.'))) {
    isLoading.value = true;
    setTimeout(() => {
      try {
        if (selectedCategory.value === 'all') {
          Object.values(categorizedToggles.value).flat().forEach(toggle => {
            featureTogglesStore.disableFeature(toggle.id);
          });
        } else {
          categorizedToggles.value[selectedCategory.value].forEach(toggle => {
            featureTogglesStore.disableFeature(toggle.id);
          });
        }
      } finally {
        isLoading.value = false;
      }
    }, 500); // Simulate some work
  }
}

function resetToDefaults() {
  if (confirm(t('admin.featureToggles.confirmations.reset', 'Sind Sie sicher, dass Sie alle Feature-Toggles auf die Standardwerte zurücksetzen möchten?'))) {
    isLoading.value = true;
    setTimeout(() => {
      try {
        // Default toggles
        const defaults = {
          enableSfcAdminPanel: true,
          enableFeatureTogglesUi: true,
          enableSfcDocConverter: false,
          enableSfcChat: false,
          enableSfcSettings: false,
          enableDarkMode: false,
          enableAdvancedSearch: false,
          enableDebugMode: false
        };
        
        // Reset toggles
        Object.entries(defaults).forEach(([id, value]) => {
          if (value) {
            featureTogglesStore.enableFeature(id);
          } else {
            featureTogglesStore.disableFeature(id);
          }
        });
      } finally {
        isLoading.value = false;
      }
    }, 1000); // Simulate some work
  }
}

function clearFilters() {
  selectedCategory.value = 'all';
  searchQuery.value = '';
}

function translateCategory(category: string): string {
  const translations: Record<string, string> = {
    'migration': t('admin.featureToggles.categories.migration', 'Migration'),
    'ui': t('admin.featureToggles.categories.ui', 'Benutzeroberfläche'),
    'feature': t('admin.featureToggles.categories.feature', 'Funktionen'),
    'development': t('admin.featureToggles.categories.development', 'Entwicklung'),
    'admin': t('admin.featureToggles.categories.admin', 'Administration')
  };
  
  return translations[category] || category;
}
</script>

<style scoped>
.admin-feature-toggles {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.admin-feature-toggles__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.admin-feature-toggles__description {
  margin: 0;
  color: var(--n-color-text-secondary);
  line-height: 1.5;
}

.admin-feature-toggles__info-box {
  display: flex;
  padding: 1rem;
  background-color: rgba(var(--n-color-info-rgb), 0.1);
  border-left: 4px solid var(--n-color-info);
  border-radius: var(--n-border-radius);
}

.admin-feature-toggles__info-icon {
  flex-shrink: 0;
  margin-right: 1rem;
  font-size: 1.5rem;
  color: var(--n-color-info);
}

.admin-feature-toggles__info-content h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
}

.admin-feature-toggles__info-content p {
  margin: 0;
  line-height: 1.5;
}

.admin-feature-toggles__filter {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
}

.admin-feature-toggles__filter-label,
.admin-feature-toggles__search-label {
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.admin-feature-toggles__filter-select {
  padding: 0.5rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  font-size: 0.875rem;
}

.admin-feature-toggles__search {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.admin-feature-toggles__search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.admin-feature-toggles__search-icon {
  position: absolute;
  left: 0.75rem;
  color: var(--n-color-text-tertiary);
}

.admin-feature-toggles__search-input {
  width: 100%;
  padding: 0.5rem 2.5rem;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  font-size: 0.875rem;
}

.admin-feature-toggles__search-clear {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  color: var(--n-color-text-tertiary);
  cursor: pointer;
  padding: 0;
  font-size: 0.875rem;
}

.admin-feature-toggles__quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.admin-feature-toggles__action-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: var(--n-border-radius);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.admin-feature-toggles__action-button--primary {
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
}

.admin-feature-toggles__action-button--primary:hover {
  background-color: var(--n-color-primary-dark);
}

.admin-feature-toggles__action-button--secondary {
  background-color: var(--n-color-background);
  border-color: var(--n-color-border);
  color: var(--n-color-text-primary);
}

.admin-feature-toggles__action-button--secondary:hover {
  background-color: var(--n-color-background-alt);
}

.admin-feature-toggles__action-button--danger {
  background-color: var(--n-color-background);
  border-color: var(--n-color-error);
  color: var(--n-color-error);
}

.admin-feature-toggles__action-button--danger:hover {
  background-color: var(--n-color-error);
  color: var(--n-color-on-error);
}

.admin-feature-toggles__action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.admin-feature-toggles__categories {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.admin-feature-toggles__category-title {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
  border-bottom: 1px solid var(--n-color-border);
  padding-bottom: 0.5rem;
}

.admin-feature-toggles__category-count {
  font-size: 0.875rem;
  font-weight: normal;
  color: var(--n-color-text-tertiary);
}

.admin-feature-toggles__toggle-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
}

.admin-feature-toggles__toggle-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background-alt);
  border: 1px solid var(--n-color-border);
  transition: all 0.2s;
}

.admin-feature-toggles__toggle-item--enabled {
  border-left: 3px solid var(--n-color-success);
}

.admin-feature-toggles__toggle-item--disabled {
  opacity: 0.8;
}

.admin-feature-toggles__toggle-item--dev-only {
  border-left: 3px solid var(--n-color-warning);
}

.admin-feature-toggles__toggle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.admin-feature-toggles__toggle-name-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.admin-feature-toggles__toggle-badge {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: 1rem;
  text-transform: uppercase;
}

.admin-feature-toggles__toggle-badge--dev {
  background-color: var(--n-color-warning);
  color: var(--n-color-on-warning);
}

.admin-feature-toggles__toggle-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.admin-feature-toggles__toggle-description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
  line-height: 1.5;
}

/* Toggle switch styles */
.admin-feature-toggles__toggle-switch {
  position: relative;
  display: inline-block;
  width: 3rem;
  height: 1.5rem;
}

.admin-feature-toggles__toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.admin-feature-toggles__toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--n-color-border);
  transition: .4s;
  border-radius: 1.5rem;
}

.admin-feature-toggles__toggle-slider:before {
  position: absolute;
  content: "";
  height: 1.125rem;
  width: 1.125rem;
  left: 0.1875rem;
  bottom: 0.1875rem;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .admin-feature-toggles__toggle-slider {
  background-color: var(--n-color-primary);
}

input:focus + .admin-feature-toggles__toggle-slider {
  box-shadow: 0 0 1px var(--n-color-primary);
}

input:checked + .admin-feature-toggles__toggle-slider:before {
  transform: translateX(1.5rem);
}

/* No results state */
.admin-feature-toggles__no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  gap: 1rem;
  color: var(--n-color-text-tertiary);
  text-align: center;
}

.admin-feature-toggles__no-results i {
  font-size: 3rem;
  opacity: 0.5;
}

.admin-feature-toggles__clear-filters {
  background-color: transparent;
  border: 1px solid var(--n-color-border);
  border-radius: var(--n-border-radius);
  padding: 0.5rem 1rem;
  color: var(--n-color-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.admin-feature-toggles__clear-filters:hover {
  background-color: var(--n-color-background-alt);
  border-color: var(--n-color-primary);
}

/* Responsive design */
@media (max-width: 768px) {
  .admin-feature-toggles__filter,
  .admin-feature-toggles__quick-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .admin-feature-toggles__toggle-list {
    grid-template-columns: 1fr;
  }
}
</style>