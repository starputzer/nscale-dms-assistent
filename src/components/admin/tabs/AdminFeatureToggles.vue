<template>
  <div class="admin-feature-toggles">
    <div class="admin-feature-toggles__header">
      <h3>{{ t("admin.featureToggles.title") }}</h3>
      <div class="admin-feature-toggles__controls">
        <BaseSwitch
          v-model="viewMode"
          :options="viewModeOptions"
          class="admin-feature-toggles__view-mode"
        />
        <div class="admin-feature-toggles__search-container">
          <BaseInput
            v-model="searchQuery"
            :placeholder="t('admin.featureToggles.search')"
            prepend-icon="search"
            class="admin-feature-toggles__search"
          />
          <BaseSelect
            v-model="categoryFilter"
            :options="categoryOptions"
            :placeholder="t('admin.featureToggles.filterByCategory')"
            class="admin-feature-toggles__category-filter"
          />
          <BaseSelect
            v-model="statusFilter"
            :options="statusOptions"
            :placeholder="t('admin.featureToggles.filterByStatus')"
            class="admin-feature-toggles__status-filter"
          />
        </div>
      </div>
    </div>

    <!-- Management View -->
    <div
      v-if="viewMode === 'management'"
      class="admin-feature-toggles__management"
    >
      <div class="admin-feature-toggles__stats">
        <div class="admin-feature-toggles__stat-card">
          <div class="admin-feature-toggles__stat-icon enabled">
            <i class="fas fa-toggle-on"></i>
          </div>
          <div class="admin-feature-toggles__stat-content">
            <div class="admin-feature-toggles__stat-value">
              {{ enabledCount }}
            </div>
            <div class="admin-feature-toggles__stat-label">
              {{ t("admin.featureToggles.enabledFeatures") }}
            </div>
          </div>
        </div>
        <div class="admin-feature-toggles__stat-card">
          <div class="admin-feature-toggles__stat-icon disabled">
            <i class="fas fa-toggle-off"></i>
          </div>
          <div class="admin-feature-toggles__stat-content">
            <div class="admin-feature-toggles__stat-value">
              {{ disabledCount }}
            </div>
            <div class="admin-feature-toggles__stat-label">
              {{ t("admin.featureToggles.disabledFeatures") }}
            </div>
          </div>
        </div>
        <div class="admin-feature-toggles__stat-card">
          <div class="admin-feature-toggles__stat-icon">
            <i class="fas fa-code-branch"></i>
          </div>
          <div class="admin-feature-toggles__stat-content">
            <div class="admin-feature-toggles__stat-value">
              {{ categoryCount }}
            </div>
            <div class="admin-feature-toggles__stat-label">
              {{ t("admin.featureToggles.categories") }}
            </div>
          </div>
        </div>
      </div>

      <div class="admin-feature-toggles__actions">
        <BaseButton primary icon="plus" @click="openCreateFeatureModal">
          {{ t("admin.featureToggles.addFeature") }}
        </BaseButton>
        <BaseButton secondary icon="file-export" @click="exportFeatures">
          {{ t("admin.featureToggles.export") }}
        </BaseButton>
        <BaseButton tertiary icon="file-import" @click="openImportModal">
          {{ t("admin.featureToggles.import") }}
        </BaseButton>
      </div>

      <div class="admin-feature-toggles__feature-groups">
        <div
          v-for="(features, category) in groupedFeatures"
          :key="category"
          class="admin-feature-toggles__feature-group"
        >
          <div class="admin-feature-toggles__category-header">
            <h4>{{ category }}</h4>
            <span class="admin-feature-toggles__category-count">{{
              features.length
            }}</span>
            <div class="admin-feature-toggles__category-toggle">
              <BaseButton
                small
                :icon="allEnabled(features) ? 'toggle-off' : 'toggle-on'"
                @click="toggleCategory(category, !allEnabled(features))"
              >
                {{
                  allEnabled(features)
                    ? t("admin.featureToggles.disableAll")
                    : t("admin.featureToggles.enableAll")
                }}
              </BaseButton>
            </div>
          </div>

          <transition-group
            name="feature-list"
            tag="div"
            class="admin-feature-toggles__features"
          >
            <div
              v-for="feature in features"
              :key="feature.key"
              class="admin-feature-toggles__feature-item"
            >
              <div class="admin-feature-toggles__feature-info">
                <div class="admin-feature-toggles__feature-name">
                  {{ feature.name }}
                  <span
                    v-if="feature.experimental"
                    class="admin-feature-toggles__experimental-badge"
                    :title="t('admin.featureToggles.experimental')"
                  >
                    BETA
                  </span>
                </div>
                <div class="admin-feature-toggles__feature-key">
                  {{ feature.key }}
                </div>
                <div class="admin-feature-toggles__feature-description">
                  {{ feature.description }}
                </div>
                <div
                  v-if="feature.dependencies && feature.dependencies.length"
                  class="admin-feature-toggles__feature-dependencies"
                >
                  <span>{{ t("admin.featureToggles.dependencies") }}:</span>
                  <span
                    v-for="dep in feature.dependencies"
                    :key="dep"
                    :class="[
                      'admin-feature-toggles__dependency-tag',
                      { disabled: !isFeatureEnabled(dep) },
                    ]"
                    :title="
                      isFeatureEnabled(dep)
                        ? t('admin.featureToggles.dependencyEnabled')
                        : t('admin.featureToggles.dependencyDisabled')
                    "
                  >
                    {{ dep }}
                  </span>
                </div>
              </div>
              <div class="admin-feature-toggles__feature-actions">
                <BaseToggle
                  v-model="feature.enabled"
                  :disabled="
                    isFeatureLocked(feature) || !canEnableFeature(feature)
                  "
                  @change="updateFeature(feature)"
                />
                <div class="admin-feature-toggles__feature-buttons">
                  <BaseButton
                    icon="edit"
                    small
                    @click="editFeature(feature)"
                    :title="t('admin.featureToggles.edit')"
                  />
                  <BaseButton
                    icon="history"
                    small
                    @click="showHistory(feature)"
                    :title="t('admin.featureToggles.history')"
                  />
                  <BaseButton
                    icon="trash"
                    small
                    danger
                    @click="confirmDeleteFeature(feature)"
                    :disabled="isFeatureLocked(feature)"
                    :title="t('admin.featureToggles.delete')"
                  />
                </div>
              </div>
            </div>
          </transition-group>
        </div>
      </div>
    </div>

    <!-- Monitoring View -->
    <div v-else class="admin-feature-toggles__monitoring">
      <AdminFeatureMetrics
        :features="metricsFeatures"
        :error-logs="errorLogs"
        :loading="refreshingMetrics"
        :date-range="dateRange"
        @refresh="fetchUsageMetrics"
        @date-range-change="onDateRangeChange"
      />
    </div>

    <!-- Modals -->
    <BaseModal
      v-model="showCreateModal"
      :title="
        editingFeature
          ? t('admin.featureToggles.editFeature')
          : t('admin.featureToggles.addFeature')
      "
    >
      <AdminFeatureToggleForm
        :feature="editingFeature"
        :categories="categories"
        :dependency-options="dependencyOptions"
        :is-new="!editingFeature"
        @save="saveFeature"
        @cancel="cancelFeatureEdit"
      />
    </BaseModal>

    <BaseModal
      v-model="showHistoryModal"
      :title="t('admin.featureToggles.featureHistory')"
      size="large"
    >
      <AdminFeatureHistory
        :feature="selectedFeature"
        :history="featureHistory"
        :loading-history="loadingHistory"
      />
    </BaseModal>

    <BaseModal
      v-model="showImportModal"
      :title="t('admin.featureToggles.importFeatures')"
      @confirm="importFeatures"
    >
      <div class="admin-feature-toggles__import-form">
        <BaseTextarea
          v-model="importData"
          :label="t('admin.featureToggles.importData')"
          rows="10"
          placeholder="Fügen Sie hier die JSON-Daten ein..."
          required
        />
        <BaseToggle
          v-model="importOptions.overwrite"
          :label="t('admin.featureToggles.importOverwrite')"
        />
        <BaseToggle
          v-model="importOptions.keepEnabled"
          :label="t('admin.featureToggles.importKeepEnabled')"
        />
      </div>
    </BaseModal>

    <BaseConfirmDialog
      v-model="showDeleteConfirm"
      :title="t('admin.featureToggles.confirmDelete')"
      :message="t('admin.featureToggles.deleteWarning')"
      @confirm="deleteFeature"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useFeatureTogglesStore } from "@/stores/featureToggles";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "@/composables/useToast";

// Base components
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseSelect from "@/components/base/BaseSelect.vue";
import BaseToggle from "@/components/base/BaseToggle.vue";
import BaseSwitch from "@/components/base/BaseSwitch.vue";
import BaseTextarea from "@/components/base/BaseTextarea.vue";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseConfirmDialog from "@/components/base/BaseConfirmDialog.vue";

// Specialized components
import AdminFeatureToggleForm from "@/components/admin/AdminFeatureToggleForm.vue";
import AdminFeatureHistory from "@/components/admin/AdminFeatureHistory.vue";
import AdminFeatureMetrics from "@/components/admin/AdminFeatureMetrics.vue";

// Types
import type {
  FeatureToggle,
  FeatureMetrics,
  FeatureHistoryEntry,
  FeatureErrorLog,
} from "@/types/featureToggles";

const { t, locale } = useI18n({ useScope: "global", inheritLocale: true });
console.log("[i18n] Component initialized with global scope and inheritance");
const featureStore = useFeatureTogglesStore();
const authStore = useAuthStore();
const { toggles: enhancedFeatures, categories } = storeToRefs(featureStore);
const toast = useToast();

// View state
const viewMode = ref<"management" | "monitoring">("management");
const viewModeOptions = [
  {
    value: "management",
    label: t("admin.featureToggles.managementView"),
  },
  {
    value: "monitoring",
    label: t("admin.featureToggles.monitoringView"),
  },
];

// Filters
const searchQuery = ref("");
const categoryFilter = ref<string | null>(null);
const statusFilter = ref<string | null>(null);

// Feature form
const showCreateModal = ref(false);
const editingFeature = ref<FeatureToggle | null>(null);

// History view
const showHistoryModal = ref(false);
const selectedFeature = ref<FeatureToggle | null>(null);
const featureHistory = ref<FeatureHistoryEntry[]>([]);
const loadingHistory = ref(false);

// Import/Export
const showImportModal = ref(false);
const importData = ref("");
const importOptions = ref({
  overwrite: false,
  keepEnabled: true,
});

// Delete confirmation
const showDeleteConfirm = ref(false);
const featureToDelete = ref<FeatureToggle | null>(null);

// Monitoring
const dateRange = ref({
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
  end: new Date(),
});
const refreshingMetrics = ref(false);
const metricsFeatures = ref<(FeatureToggle & { metrics?: FeatureMetrics })[]>(
  [],
);
const errorLogs = ref<FeatureErrorLog[]>([]);

// Computed properties
const filteredFeatures = computed(() => {
  let result = [...(enhancedFeatures.value || [])];

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (feature) =>
        feature.name.toLowerCase().includes(query) ||
        feature.key.toLowerCase().includes(query) ||
        (feature.description &&
          feature.description.toLowerCase().includes(query)),
    );
  }

  if (categoryFilter.value) {
    result = result.filter(
      (feature) => feature.category === categoryFilter.value,
    );
  }

  if (statusFilter.value) {
    const enabled = statusFilter.value === "enabled";
    result = result.filter((feature) => feature.enabled === enabled);
  }

  return result;
});

const groupedFeatures = computed(() => {
  const grouped: Record<string, FeatureToggle[]> = {};

  filteredFeatures.value.forEach((feature) => {
    if (!grouped[feature.category]) {
      grouped[feature.category] = [];
    }
    grouped[feature.category].push(feature);
  });

  // Sort categories alphabetically
  return Object.fromEntries(
    Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)),
  );
});

const enabledCount = computed(
  () => (enhancedFeatures.value || []).filter((f) => f.enabled).length,
);

const disabledCount = computed(
  () => (enhancedFeatures.value || []).filter((f) => !f.enabled).length,
);

const categoryCount = computed(
  () => new Set((enhancedFeatures.value || []).map((f) => f.category)).size,
);

const categoryOptions = computed(() => {
  return [
    {
      value: null,
      label: t("admin.featureToggles.allCategories"),
    },
    ...categories.value.map((cat) => ({ value: cat, label: cat })),
  ];
});

const statusOptions = computed(() => [
  { value: null, label: t("admin.featureToggles.allStatuses") },
  {
    value: "enabled",
    label: t("admin.featureToggles.statusEnabled"),
  },
  {
    value: "disabled",
    label: t("admin.featureToggles.statusDisabled"),
  },
]);

const dependencyOptions = computed(() => {
  return (enhancedFeatures.value || [])
    .filter((f) => f.key !== editingFeature.value?.key)
    .map((f) => ({ value: f.key, label: f.name }));
});

// Methods
function openCreateFeatureModal() {
  editingFeature.value = null;
  showCreateModal.value = true;
}

function editFeature(feature: FeatureToggle) {
  editingFeature.value = feature;
  showCreateModal.value = true;
}

async function saveFeature(feature: FeatureToggle) {
  try {
    if (editingFeature.value) {
      await featureStore.updateFeature({
        ...feature,
        key: editingFeature.value.key,
      });
      toast.success(t("admin.featureToggles.notifications.updateSuccess"));
    } else {
      await featureStore.createFeature(feature);
      toast.success(t("admin.featureToggles.notifications.createSuccess"));
    }
    showCreateModal.value = false;
  } catch (error) {
    console.error("Failed to save feature:", error);
    toast.error(t("admin.featureToggles.notifications.saveError"));
  }
}

function cancelFeatureEdit() {
  showCreateModal.value = false;
  editingFeature.value = null;
}

function confirmDeleteFeature(feature: FeatureToggle) {
  featureToDelete.value = feature;
  showDeleteConfirm.value = true;
}

async function deleteFeature() {
  if (!featureToDelete.value) return;

  try {
    await featureStore.deleteFeature(featureToDelete.value.key);
    toast.success(t("admin.featureToggles.notifications.deleteSuccess"));
    showDeleteConfirm.value = false;
    featureToDelete.value = null;
  } catch (error) {
    console.error("Failed to delete feature:", error);
    toast.error(t("admin.featureToggles.notifications.deleteError"));
  }
}

async function updateFeature(feature: FeatureToggle) {
  try {
    await featureStore.updateFeature(feature);
    toast.success(
      feature.enabled
        ? t("admin.featureToggles.notifications.featureEnabled")
        : t("admin.featureToggles.notifications.featureDisabled"),
    );
  } catch (error) {
    console.error("Failed to update feature:", error);
    // Revert toggle state
    feature.enabled = !feature.enabled;
    toast.error(t("admin.featureToggles.notifications.updateError"));
  }
}

async function toggleCategory(category: string, enabled: boolean) {
  try {
    await featureStore.updateCategoryFeatures(category, enabled);
    toast.success(
      enabled
        ? t("admin.featureToggles.notifications.categoryEnabled", { category })
        : t("admin.featureToggles.notifications.categoryDisabled", {
            category,
          }),
    );
  } catch (error) {
    console.error("Failed to toggle category:", error);
    toast.error(t("admin.featureToggles.notifications.categoryUpdateError"));
  }
}

function allEnabled(features: FeatureToggle[]) {
  return features.every((f) => f.enabled);
}

function isFeatureLocked(feature: FeatureToggle) {
  return feature.locked || false;
}

function isFeatureEnabled(featureKey: string) {
  return featureStore.isFeatureEnabled(featureKey);
}

function canEnableFeature(feature: FeatureToggle) {
  if (!feature.dependencies || feature.dependencies.length === 0) {
    return true;
  }

  return feature.dependencies.every((dep) => isFeatureEnabled(dep));
}

async function showHistory(feature: FeatureToggle) {
  selectedFeature.value = feature;
  loadingHistory.value = true;

  try {
    featureHistory.value = await featureStore.getFeatureHistory(feature.key);
    showHistoryModal.value = true;
  } catch (error) {
    console.error("Failed to fetch feature history:", error);
    toast.error(t("admin.featureToggles.notifications.historyError"));
  } finally {
    loadingHistory.value = false;
  }
}

async function exportFeatures() {
  try {
    const exportData = JSON.stringify(enhancedFeatures.value || [], null, 2);
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feature-toggles-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("admin.featureToggles.notifications.exportSuccess"));
  } catch (error) {
    console.error("Failed to export features:", error);
    toast.error(t("admin.featureToggles.notifications.exportError"));
  }
}

function openImportModal() {
  importData.value = "";
  showImportModal.value = true;
}

async function importFeatures() {
  try {
    const data = JSON.parse(importData.value);

    if (!Array.isArray(data)) {
      throw new Error(
        "Invalid import data format. Expected an array of features.",
      );
    }

    await featureStore.importFeatures(data, importOptions.value);
    toast.success(t("admin.featureToggles.notifications.importSuccess"));
    showImportModal.value = false;
  } catch (error) {
    console.error("Failed to import features:", error);
    toast.error(t("admin.featureToggles.notifications.importError"));
  }
}

async function fetchUsageMetrics() {
  refreshingMetrics.value = true;

  try {
    const metrics = await featureStore.getFeatureMetrics({
      startDate: dateRange.value.start,
      endDate: dateRange.value.end,
    });

    metricsFeatures.value = (enhancedFeatures.value || []).map((feature) => {
      const featureMetrics = metrics.features[feature.key];
      return {
        ...feature,
        metrics: featureMetrics,
      };
    });

    errorLogs.value = await featureStore.getFeatureErrors({
      startDate: dateRange.value.start,
      endDate: dateRange.value.end,
      limit: 10,
    });
  } catch (error) {
    console.error("Failed to fetch usage metrics:", error);
    toast.error(t("admin.featureToggles.notifications.metricsError"));
  } finally {
    refreshingMetrics.value = false;
  }
}

function onDateRangeChange(newDateRange: { start: Date; end: Date }) {
  dateRange.value = newDateRange;
  fetchUsageMetrics();
}

// Lifecycle hooks
onMounted(async () => {
  try {
    await featureStore.loadFeatures();
    featureStore.updateEnhancedFeatures();
    featureStore.updateCategories();

    if (viewMode.value === "monitoring") {
      await fetchUsageMetrics();
    }
  } catch (error) {
    console.error("Failed to load features:", error);
    toast.error(t("admin.featureToggles.notifications.loadError"));
  }
});

watch(viewMode, async (newMode) => {
  if (newMode === "monitoring") {
    await fetchUsageMetrics();
  }
});

// Log i18n initialization status
console.log(
  `[AdminFeatureToggles] i18n initialized with locale: ${locale.value}`,
);

// Log i18n initialization status
console.log(
  `[AdminFeatureToggles] i18n initialized with locale: ${locale.value}`,
);
</script>

<style lang="scss">
@import "@/assets/styles/admin-consolidated.scss";

.admin-feature-toggles {
  display: flex;
  flex-direction: column;
  width: 100%;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;

    h3 {
      margin: 0;
      font-size: 1.5rem;
    }
  }

  &__controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }

  &__view-mode {
    min-width: 200px;
  }

  &__search-container {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  &__search {
    min-width: 250px;
    flex-grow: 1;
  }

  &__category-filter,
  &__status-filter {
    min-width: 150px;
    flex-basis: 180px;
    flex-grow: 1;
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  &__stat-card {
    display: flex;
    align-items: center;
    padding: 1rem;
    background-color: var(--card-bg);
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  &__stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    margin-right: 1rem;
    background-color: var(--primary-light);
    color: var(--primary);

    &.enabled {
      background-color: var(--success-light);
      color: var(--success);
    }

    &.disabled {
      background-color: var(--warning-light);
      color: var(--warning);
    }

    i {
      font-size: 1.5rem;
    }
  }

  &__stat-content {
    display: flex;
    flex-direction: column;
  }

  &__stat-value {
    font-size: 1.75rem;
    font-weight: bold;
    line-height: 1;
  }

  &__stat-label {
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }

  &__actions {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  &__feature-groups {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  &__feature-group {
    background-color: var(--card-bg);
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    overflow: hidden;
  }

  &__category-header {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);

    h4 {
      margin: 0;
      font-size: 1.125rem;
      flex-grow: 1;
    }
  }

  &__category-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-tertiary);
    border-radius: 1rem;
    padding: 0.125rem 0.5rem;
    font-size: 0.75rem;
    margin-right: 0.75rem;
  }

  &__features {
    padding: 0.5rem;
  }

  &__feature-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);

    &:last-child {
      border-bottom: none;
    }
  }

  &__feature-info {
    flex-grow: 1;
    margin-right: 1rem;
  }

  &__feature-name {
    font-weight: bold;
    margin-bottom: 0.25rem;
    display: flex;
    align-items: center;
  }

  &__experimental-badge {
    display: inline-block;
    background-color: var(--warning);
    color: white;
    font-size: 0.625rem;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    margin-left: 0.5rem;
    font-weight: bold;
  }

  &__feature-key {
    font-family: monospace;
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
  }

  &__feature-description {
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }

  &__feature-dependencies {
    font-size: 0.75rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    align-items: center;

    > span:first-child {
      color: var(--text-secondary);
      margin-right: 0.25rem;
    }
  }

  &__dependency-tag {
    display: inline-block;
    background-color: var(--success-light);
    color: var(--success);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;

    &.disabled {
      background-color: var(--danger-light);
      color: var(--danger);
    }
  }

  &__feature-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.75rem;
  }

  &__feature-buttons {
    display: flex;
    gap: 0.5rem;

    button {
      min-width: 36px;
      min-height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  // Import form
  &__import-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  // Animations
  .feature-list-enter-active,
  .feature-list-leave-active {
    transition: all 0.3s;
  }

  .feature-list-enter-from,
  .feature-list-leave-to {
    opacity: 0;
    transform: translateY(30px);
  }

  // Responsive adjustments
  @media (max-width: 992px) {
    &__feature-group {
      overflow-x: auto;
    }
  }

  @media (max-width: 768px) {
    &__header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    &__controls {
      width: 100%;
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    &__view-mode {
      width: 100%;
    }

    &__search-container {
      flex-direction: column;
      width: 100%;
    }

    &__search,
    &__category-filter,
    &__status-filter {
      width: 100%;
    }

    &__actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      width: 100%;
      gap: 0.5rem;
    }

    &__feature-item {
      flex-direction: column;
    }

    &__feature-actions {
      margin-top: 1rem;
      flex-direction: row;
      width: 100%;
      justify-content: space-between;
      align-items: center;
    }

    &__category-header {
      flex-wrap: wrap;
      gap: 0.5rem;

      h4 {
        width: 100%;
      }
    }
  }

  @media (max-width: 480px) {
    &__feature-buttons {
      flex-wrap: wrap;
      justify-content: flex-end;

      button {
        min-width: 44px;
        min-height: 44px;
      }
    }

    &__stat-card {
      padding: 0.75rem;
    }

    &__import-form {
      gap: 1.5rem;
    }
  }
}
</style>
