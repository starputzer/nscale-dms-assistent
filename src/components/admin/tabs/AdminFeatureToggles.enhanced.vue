<template>
  <div class="admin-feature-toggles-enhanced">
    <div class="admin-feature-toggles-enhanced__header">
      <h3>{{ t("admin.featureToggles.title", "Feature-Toggles") }}</h3>
      <div class="admin-feature-toggles-enhanced__controls">
        <BaseSwitch
          v-model="viewMode"
          :options="viewModeOptions"
          class="admin-feature-toggles-enhanced__view-mode"
        />
        <div class="admin-feature-toggles-enhanced__search-container">
          <BaseInput
            v-model="searchQuery"
            :placeholder="
              t('admin.featureToggles.search', 'Features durchsuchen...')
            "
            prepend-icon="search"
            class="admin-feature-toggles-enhanced__search"
          />
          <BaseSelect
            v-model="categoryFilter"
            :options="categoryOptions"
            :placeholder="
              t(
                'admin.featureToggles.filterByCategory',
                'Nach Kategorie filtern',
              )
            "
            class="admin-feature-toggles-enhanced__category-filter"
          />
          <BaseSelect
            v-model="statusFilter"
            :options="statusOptions"
            :placeholder="
              t('admin.featureToggles.filterByStatus', 'Nach Status filtern')
            "
            class="admin-feature-toggles-enhanced__status-filter"
          />
        </div>
      </div>
    </div>

    <!-- Management View -->
    <div
      v-if="viewMode === 'management'"
      class="admin-feature-toggles-enhanced__management"
    >
      <div class="admin-feature-toggles-enhanced__stats">
        <div class="admin-feature-toggles-enhanced__stat-card">
          <div class="admin-feature-toggles-enhanced__stat-icon enabled">
            <i class="fas fa-toggle-on"></i>
          </div>
          <div class="admin-feature-toggles-enhanced__stat-content">
            <div class="admin-feature-toggles-enhanced__stat-value">
              {{ enabledCount }}
            </div>
            <div class="admin-feature-toggles-enhanced__stat-label">
              {{
                t("admin.featureToggles.enabledFeatures", "Aktivierte Features")
              }}
            </div>
          </div>
        </div>
        <div class="admin-feature-toggles-enhanced__stat-card">
          <div class="admin-feature-toggles-enhanced__stat-icon disabled">
            <i class="fas fa-toggle-off"></i>
          </div>
          <div class="admin-feature-toggles-enhanced__stat-content">
            <div class="admin-feature-toggles-enhanced__stat-value">
              {{ disabledCount }}
            </div>
            <div class="admin-feature-toggles-enhanced__stat-label">
              {{
                t(
                  "admin.featureToggles.disabledFeatures",
                  "Deaktivierte Features",
                )
              }}
            </div>
          </div>
        </div>
        <div class="admin-feature-toggles-enhanced__stat-card">
          <div class="admin-feature-toggles-enhanced__stat-icon">
            <i class="fas fa-code-branch"></i>
          </div>
          <div class="admin-feature-toggles-enhanced__stat-content">
            <div class="admin-feature-toggles-enhanced__stat-value">
              {{ categoryCount }}
            </div>
            <div class="admin-feature-toggles-enhanced__stat-label">
              {{ t("admin.featureToggles.categories", "Kategorien") }}
            </div>
          </div>
        </div>
      </div>

      <div class="admin-feature-toggles-enhanced__actions">
        <BaseButton primary icon="plus" @click="openCreateFeatureModal">
          {{ t("admin.featureToggles.addFeature", "Feature hinzufügen") }}
        </BaseButton>
        <BaseButton secondary icon="file-export" @click="exportFeatures">
          {{ t("admin.featureToggles.export", "Exportieren") }}
        </BaseButton>
        <BaseButton tertiary icon="file-import" @click="openImportModal">
          {{ t("admin.featureToggles.import", "Importieren") }}
        </BaseButton>
      </div>

      <div class="admin-feature-toggles-enhanced__feature-groups">
        <div
          v-for="(features, category) in groupedFeatures"
          :key="category"
          class="admin-feature-toggles-enhanced__feature-group"
        >
          <div class="admin-feature-toggles-enhanced__category-header">
            <h4>{{ category }}</h4>
            <span class="admin-feature-toggles-enhanced__category-count">{{
              features.length
            }}</span>
            <div class="admin-feature-toggles-enhanced__category-toggle">
              <BaseButton
                small
                :icon="allEnabled(features) ? 'toggle-off' : 'toggle-on'"
                @click="toggleCategory(category, !allEnabled(features))"
              >
                {{
                  allEnabled(features)
                    ? t("admin.featureToggles.disableAll", "Alle deaktivieren")
                    : t("admin.featureToggles.enableAll", "Alle aktivieren")
                }}
              </BaseButton>
            </div>
          </div>

          <transition-group
            name="feature-list"
            tag="div"
            class="admin-feature-toggles-enhanced__features"
          >
            <div
              v-for="feature in features"
              :key="feature.key"
              class="admin-feature-toggles-enhanced__feature-item"
            >
              <div class="admin-feature-toggles-enhanced__feature-info">
                <div class="admin-feature-toggles-enhanced__feature-name">
                  {{ feature.name }}
                  <span
                    v-if="feature.experimental"
                    class="admin-feature-toggles-enhanced__experimental-badge"
                    :title="
                      t(
                        'admin.featureToggles.experimental',
                        'Experimentelles Feature',
                      )
                    "
                  >
                    BETA
                  </span>
                </div>
                <div class="admin-feature-toggles-enhanced__feature-key">
                  {{ feature.key }}
                </div>
                <div
                  class="admin-feature-toggles-enhanced__feature-description"
                >
                  {{ feature.description }}
                </div>
                <div
                  v-if="feature.dependencies && feature.dependencies.length"
                  class="admin-feature-toggles-enhanced__feature-dependencies"
                >
                  <span
                    >{{
                      t("admin.featureToggles.dependencies", "Abhängigkeiten")
                    }}:</span
                  >
                  <span
                    v-for="dep in feature.dependencies"
                    :key="dep"
                    :class="[
                      'admin-feature-toggles-enhanced__dependency-tag',
                      { disabled: !isFeatureEnabled(dep) },
                    ]"
                    :title="
                      isFeatureEnabled(dep)
                        ? t(
                            'admin.featureToggles.dependencyEnabled',
                            'Abhängigkeit aktiv',
                          )
                        : t(
                            'admin.featureToggles.dependencyDisabled',
                            'Abhängigkeit nicht aktiv!',
                          )
                    "
                  >
                    {{ dep }}
                  </span>
                </div>
              </div>
              <div class="admin-feature-toggles-enhanced__feature-actions">
                <BaseToggle
                  v-model="feature.enabled"
                  :disabled="
                    isFeatureLocked(feature) || !canEnableFeature(feature)
                  "
                  @change="updateFeature(feature)"
                />
                <div class="admin-feature-toggles-enhanced__feature-buttons">
                  <BaseButton
                    icon="edit"
                    small
                    @click="editFeature(feature)"
                    :title="
                      t('admin.featureToggles.edit', 'Feature bearbeiten')
                    "
                  />
                  <BaseButton
                    icon="history"
                    small
                    @click="showHistory(feature)"
                    :title="
                      t(
                        'admin.featureToggles.history',
                        'Änderungsverlauf anzeigen',
                      )
                    "
                  />
                  <BaseButton
                    icon="trash"
                    small
                    danger
                    @click="confirmDeleteFeature(feature)"
                    :disabled="isFeatureLocked(feature)"
                    :title="t('admin.featureToggles.delete', 'Feature löschen')"
                  />
                </div>
              </div>
            </div>
          </transition-group>
        </div>
      </div>
    </div>

    <!-- Monitoring View -->
    <div v-else class="admin-feature-toggles-enhanced__monitoring">
      <div class="admin-feature-toggles-enhanced__monitoring-header">
        <h4>
          {{
            t(
              "admin.featureToggles.monitoring.title",
              "Feature-Nutzung & Metriken",
            )
          }}
        </h4>
        <div class="admin-feature-toggles-enhanced__date-range">
          <BaseDateRangePicker
            v-model="dateRange"
            @change="fetchUsageMetrics"
          />
          <BaseButton
            icon="sync"
            @click="refreshMetrics"
            :loading="refreshingMetrics"
            :title="
              t(
                'admin.featureToggles.monitoring.refresh',
                'Metriken aktualisieren',
              )
            "
          />
        </div>
      </div>

      <div class="admin-feature-toggles-enhanced__charts">
        <div class="admin-feature-toggles-enhanced__chart-card">
          <h5>
            {{ t("admin.featureToggles.monitoring.usage", "Feature-Nutzung") }}
          </h5>
          <canvas ref="usageChart" height="200"></canvas>
        </div>
        <div class="admin-feature-toggles-enhanced__chart-card">
          <h5>
            {{ t("admin.featureToggles.monitoring.errors", "Feature-Fehler") }}
          </h5>
          <canvas ref="errorChart" height="200"></canvas>
        </div>
      </div>

      <div class="admin-feature-toggles-enhanced__metrics-grid">
        <div
          v-for="feature in metricsFeatures"
          :key="feature.key"
          class="admin-feature-toggles-enhanced__metric-card"
        >
          <div class="admin-feature-toggles-enhanced__metric-header">
            <h5>{{ feature.name }}</h5>
            <span
              :class="[
                'admin-feature-toggles-enhanced__metric-status',
                { enabled: feature.enabled, disabled: !feature.enabled },
              ]"
            >
              {{
                feature.enabled
                  ? t("admin.featureToggles.enabled", "Aktiviert")
                  : t("admin.featureToggles.disabled", "Deaktiviert")
              }}
            </span>
          </div>
          <div class="admin-feature-toggles-enhanced__metric-stats">
            <div class="admin-feature-toggles-enhanced__metric-item">
              <div class="admin-feature-toggles-enhanced__metric-value">
                {{ feature.metrics?.usageCount || 0 }}
              </div>
              <div class="admin-feature-toggles-enhanced__metric-label">
                {{
                  t("admin.featureToggles.monitoring.usageCount", "Nutzungen")
                }}
              </div>
            </div>
            <div class="admin-feature-toggles-enhanced__metric-item">
              <div class="admin-feature-toggles-enhanced__metric-value">
                {{ feature.metrics?.errorCount || 0 }}
              </div>
              <div class="admin-feature-toggles-enhanced__metric-label">
                {{ t("admin.featureToggles.monitoring.errorCount", "Fehler") }}
              </div>
            </div>
            <div class="admin-feature-toggles-enhanced__metric-item">
              <div class="admin-feature-toggles-enhanced__metric-value">
                {{ formatPercentage(feature.metrics?.errorRate) }}
              </div>
              <div class="admin-feature-toggles-enhanced__metric-label">
                {{
                  t("admin.featureToggles.monitoring.errorRate", "Fehlerrate")
                }}
              </div>
            </div>
          </div>
          <div
            v-if="feature.metrics?.trend"
            class="admin-feature-toggles-enhanced__metric-trend"
          >
            <canvas :ref="`trendChart_${feature.key}`" height="60"></canvas>
          </div>
        </div>
      </div>

      <div
        v-if="errorLogs.length"
        class="admin-feature-toggles-enhanced__error-logs"
      >
        <h4>
          {{
            t("admin.featureToggles.monitoring.recentErrors", "Neueste Fehler")
          }}
        </h4>
        <div class="admin-feature-toggles-enhanced__error-container">
          <div
            v-for="(error, index) in errorLogs"
            :key="index"
            class="admin-feature-toggles-enhanced__error-entry"
          >
            <div class="admin-feature-toggles-enhanced__error-header">
              <span class="admin-feature-toggles-enhanced__error-feature">{{
                error.feature
              }}</span>
              <span class="admin-feature-toggles-enhanced__error-time">{{
                formatDate(error.timestamp)
              }}</span>
            </div>
            <div class="admin-feature-toggles-enhanced__error-message">
              {{ error.message }}
            </div>
            <div
              v-if="error.stackTrace"
              class="admin-feature-toggles-enhanced__error-stack"
              v-show="expandedErrors.includes(index)"
            >
              <pre>{{ error.stackTrace }}</pre>
            </div>
            <BaseButton
              text
              small
              :icon="
                expandedErrors.includes(index) ? 'chevron-up' : 'chevron-down'
              "
              @click="toggleErrorExpand(index)"
              class="admin-feature-toggles-enhanced__error-expand"
            >
              {{
                expandedErrors.includes(index)
                  ? t(
                      "admin.featureToggles.monitoring.hideDetails",
                      "Details ausblenden",
                    )
                  : t(
                      "admin.featureToggles.monitoring.showDetails",
                      "Details anzeigen",
                    )
              }}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <BaseModal
      v-model="showCreateModal"
      :title="
        editingFeature
          ? t('admin.featureToggles.editFeature', 'Feature bearbeiten')
          : t('admin.featureToggles.addFeature', 'Neues Feature hinzufügen')
      "
      @confirm="saveFeature"
      @cancel="cancelFeatureEdit"
    >
      <div class="admin-feature-toggles-enhanced__feature-form">
        <BaseInput
          v-model="featureForm.name"
          :label="t('admin.featureToggles.featureName', 'Feature-Name')"
          required
        />
        <BaseInput
          v-model="featureForm.key"
          :label="t('admin.featureToggles.featureKey', 'Feature-Key')"
          :disabled="editingFeature !== null"
          required
          help="Eindeutiger Schlüssel für den Programmcode"
        />
        <BaseTextarea
          v-model="featureForm.description"
          :label="t('admin.featureToggles.featureDescription', 'Beschreibung')"
          rows="3"
        />
        <BaseSelect
          v-model="featureForm.category"
          :options="allCategoryOptions"
          :label="t('admin.featureToggles.featureCategory', 'Kategorie')"
          allow-create
          required
        />
        <BaseMultiSelect
          v-model="featureForm.dependencies"
          :options="dependencyOptions"
          :label="
            t('admin.featureToggles.featureDependencies', 'Abhängigkeiten')
          "
          help="Features, die aktiviert sein müssen, damit dieses Feature funktioniert"
        />
        <BaseToggle
          v-model="featureForm.locked"
          :label="
            t(
              'admin.featureToggles.featureLocked',
              'Gesperrt (kann nicht geändert werden)',
            )
          "
        />
        <BaseToggle
          v-model="featureForm.experimental"
          :label="
            t(
              'admin.featureToggles.featureExperimental',
              'Als experimentell kennzeichnen',
            )
          "
        />
        <BaseToggle
          v-model="featureForm.enabled"
          :label="
            t('admin.featureToggles.featureEnabled', 'Feature aktivieren')
          "
        />
      </div>
    </BaseModal>

    <BaseModal
      v-model="showHistoryModal"
      :title="
        t('admin.featureToggles.featureHistory', 'Feature-Änderungsverlauf')
      "
      size="large"
    >
      <div
        v-if="selectedFeature"
        class="admin-feature-toggles-enhanced__history"
      >
        <h4>
          {{ selectedFeature.name }}
          <span class="admin-feature-toggles-enhanced__history-key"
            >({{ selectedFeature.key }})</span
          >
        </h4>

        <div class="admin-feature-toggles-enhanced__history-timeline">
          <div
            v-for="(entry, index) in featureHistory"
            :key="index"
            class="admin-feature-toggles-enhanced__history-entry"
          >
            <div class="admin-feature-toggles-enhanced__history-date">
              {{ formatDate(entry.timestamp) }}
            </div>
            <div class="admin-feature-toggles-enhanced__history-content">
              <div class="admin-feature-toggles-enhanced__history-user">
                {{ entry.user }}
              </div>
              <div class="admin-feature-toggles-enhanced__history-changes">
                <div
                  v-for="(change, field) in entry.changes"
                  :key="field"
                  class="admin-feature-toggles-enhanced__history-change"
                >
                  <span class="admin-feature-toggles-enhanced__history-field">{{
                    field
                  }}</span>
                  <span class="admin-feature-toggles-enhanced__history-old">{{
                    formatChangeValue(change.old)
                  }}</span>
                  <i class="fas fa-arrow-right"></i>
                  <span class="admin-feature-toggles-enhanced__history-new">{{
                    formatChangeValue(change.new)
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>

    <BaseModal
      v-model="showImportModal"
      :title="t('admin.featureToggles.importFeatures', 'Features importieren')"
      @confirm="importFeatures"
    >
      <div class="admin-feature-toggles-enhanced__import-form">
        <BaseTextarea
          v-model="importData"
          :label="t('admin.featureToggles.importData', 'Feature-Daten (JSON)')"
          rows="10"
          placeholder="Fügen Sie hier die JSON-Daten ein..."
          required
        />
        <BaseToggle
          v-model="importOptions.overwrite"
          :label="
            t(
              'admin.featureToggles.importOverwrite',
              'Bestehende Features überschreiben',
            )
          "
        />
        <BaseToggle
          v-model="importOptions.keepEnabled"
          :label="
            t(
              'admin.featureToggles.importKeepEnabled',
              'Behalte aktuelle Aktivierungszustände bei',
            )
          "
        />
      </div>
    </BaseModal>

    <BaseConfirmDialog
      v-model="showDeleteConfirm"
      :title="t('admin.featureToggles.confirmDelete', 'Feature löschen?')"
      :message="
        t(
          'admin.featureToggles.deleteWarning',
          'Sind Sie sicher, dass Sie dieses Feature löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
        )
      "
      @confirm="deleteFeature"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import Chart from "chart.js/auto";
import { storeToRefs } from "pinia";
import { useFeatureTogglesStore } from "@/stores/featureToggles";
import { useAuthStore } from "@/stores/auth";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseSelect from "@/components/base/BaseSelect.vue";
import BaseMultiSelect from "@/components/base/BaseMultiSelect.vue";
import BaseToggle from "@/components/base/BaseToggle.vue";
import BaseSwitch from "@/components/base/BaseSwitch.vue";
import BaseTextarea from "@/components/base/BaseTextarea.vue";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseConfirmDialog from "@/components/base/BaseConfirmDialog.vue";
import BaseDateRangePicker from "@/components/base/BaseDateRangePicker.vue";
import type {
  FeatureToggle,
  FeatureCategory,
  FeatureMetrics,
  FeatureHistoryEntry,
  FeatureErrorLog,
} from "@/types/featureToggles";

const { t } = useI18n();
const featureStore = useFeatureTogglesStore();
const authStore = useAuthStore();
const { features, categories } = storeToRefs(featureStore);

// View state
const viewMode = ref<"management" | "monitoring">("management");
const viewModeOptions = [
  {
    value: "management",
    label: t("admin.featureToggles.managementView", "Verwaltung"),
  },
  {
    value: "monitoring",
    label: t("admin.featureToggles.monitoringView", "Monitoring"),
  },
];

// Filters
const searchQuery = ref("");
const categoryFilter = ref<string | null>(null);
const statusFilter = ref<string | null>(null);

// Charts references
const usageChart = ref<HTMLCanvasElement | null>(null);
const errorChart = ref<HTMLCanvasElement | null>(null);
const usageChartInstance = ref<Chart | null>(null);
const errorChartInstance = ref<Chart | null>(null);
const trendCharts = ref<Record<string, Chart | null>>({});

// Feature form
const showCreateModal = ref(false);
const editingFeature = ref<FeatureToggle | null>(null);
const featureForm = ref({
  name: "",
  key: "",
  description: "",
  category: "",
  dependencies: [] as string[],
  locked: false,
  experimental: false,
  enabled: false,
});

// History view
const showHistoryModal = ref(false);
const selectedFeature = ref<FeatureToggle | null>(null);
const featureHistory = ref<FeatureHistoryEntry[]>([]);

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
const expandedErrors = ref<number[]>([]);

// Computed properties
const filteredFeatures = computed(() => {
  let result = [...features.value];

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (feature) =>
        feature.name.toLowerCase().includes(query) ||
        feature.key.toLowerCase().includes(query) ||
        feature.description.toLowerCase().includes(query),
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
  () => features.value.filter((f) => f.enabled).length,
);
const disabledCount = computed(
  () => features.value.filter((f) => !f.enabled).length,
);
const categoryCount = computed(
  () => new Set(features.value.map((f) => f.category)).size,
);

const categoryOptions = computed(() => {
  return [
    {
      value: null,
      label: t("admin.featureToggles.allCategories", "Alle Kategorien"),
    },
    ...categories.value.map((cat) => ({ value: cat, label: cat })),
  ];
});

const allCategoryOptions = computed(() => {
  return categories.value.map((cat) => ({ value: cat, label: cat }));
});

const statusOptions = computed(() => [
  { value: null, label: t("admin.featureToggles.allStatuses", "Alle Status") },
  {
    value: "enabled",
    label: t("admin.featureToggles.statusEnabled", "Aktiviert"),
  },
  {
    value: "disabled",
    label: t("admin.featureToggles.statusDisabled", "Deaktiviert"),
  },
]);

const dependencyOptions = computed(() => {
  return features.value
    .filter((f) => f.key !== editingFeature.value?.key) // Exclude current feature
    .map((f) => ({ value: f.key, label: f.name }));
});

// Methods
function openCreateFeatureModal() {
  editingFeature.value = null;
  featureForm.value = {
    name: "",
    key: "",
    description: "",
    category: categories.value.length > 0 ? categories.value[0] : "",
    dependencies: [],
    locked: false,
    experimental: false,
    enabled: false,
  };
  showCreateModal.value = true;
}

function editFeature(feature: FeatureToggle) {
  editingFeature.value = feature;
  featureForm.value = {
    name: feature.name,
    key: feature.key,
    description: feature.description || "",
    category: feature.category,
    dependencies: feature.dependencies || [],
    locked: feature.locked || false,
    experimental: feature.experimental || false,
    enabled: feature.enabled,
  };
  showCreateModal.value = true;
}

async function saveFeature() {
  try {
    if (editingFeature.value) {
      await featureStore.updateFeature({
        ...editingFeature.value,
        name: featureForm.value.name,
        description: featureForm.value.description,
        category: featureForm.value.category,
        dependencies: featureForm.value.dependencies,
        locked: featureForm.value.locked,
        experimental: featureForm.value.experimental,
        enabled: featureForm.value.enabled,
      });
    } else {
      await featureStore.createFeature({
        name: featureForm.value.name,
        key: featureForm.value.key,
        description: featureForm.value.description,
        category: featureForm.value.category,
        dependencies: featureForm.value.dependencies,
        locked: featureForm.value.locked,
        experimental: featureForm.value.experimental,
        enabled: featureForm.value.enabled,
      });
    }
    showCreateModal.value = false;
  } catch (error) {
    console.error("Failed to save feature:", error);
    // Show error notification
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
    showDeleteConfirm.value = false;
    featureToDelete.value = null;
  } catch (error) {
    console.error("Failed to delete feature:", error);
    // Show error notification
  }
}

async function updateFeature(feature: FeatureToggle) {
  try {
    await featureStore.updateFeature(feature);
  } catch (error) {
    console.error("Failed to update feature:", error);
    // Revert toggle state
    feature.enabled = !feature.enabled;
  }
}

async function toggleCategory(category: string, enabled: boolean) {
  try {
    await featureStore.updateCategoryFeatures(category, enabled);
  } catch (error) {
    console.error("Failed to toggle category:", error);
  }
}

function allEnabled(features: FeatureToggle[]) {
  return features.every((f) => f.enabled);
}

function isFeatureLocked(feature: FeatureToggle) {
  return feature.locked || false;
}

function isFeatureEnabled(featureKey: string) {
  const feature = features.value.find((f) => f.key === featureKey);
  return feature?.enabled || false;
}

function canEnableFeature(feature: FeatureToggle) {
  if (!feature.dependencies || feature.dependencies.length === 0) {
    return true;
  }

  return feature.dependencies.every((dep) => isFeatureEnabled(dep));
}

async function showHistory(feature: FeatureToggle) {
  selectedFeature.value = feature;

  try {
    featureHistory.value = await featureStore.getFeatureHistory(feature.key);
    showHistoryModal.value = true;
  } catch (error) {
    console.error("Failed to fetch feature history:", error);
    // Show error notification
  }
}

function formatChangeValue(value: any): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Ja" : "Nein";
  }

  if (Array.isArray(value)) {
    return value.join(", ") || "-";
  }

  return String(value);
}

function formatDate(timestamp: string | number | Date) {
  return new Date(timestamp).toLocaleString();
}

function formatPercentage(value?: number) {
  if (value === undefined || value === null) {
    return "0%";
  }
  return `${(value * 100).toFixed(1)}%`;
}

async function exportFeatures() {
  try {
    const exportData = JSON.stringify(features.value, null, 2);
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feature-toggles-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to export features:", error);
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
    showImportModal.value = false;
  } catch (error) {
    console.error("Failed to import features:", error);
    // Show error notification
  }
}

async function fetchUsageMetrics() {
  refreshingMetrics.value = true;

  try {
    const metrics = await featureStore.getFeatureMetrics({
      startDate: dateRange.value.start,
      endDate: dateRange.value.end,
    });

    metricsFeatures.value = features.value.map((feature) => {
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

    await nextTick();
    updateCharts(metrics);
    updateTrendCharts();
  } catch (error) {
    console.error("Failed to fetch usage metrics:", error);
  } finally {
    refreshingMetrics.value = false;
  }
}

function refreshMetrics() {
  fetchUsageMetrics();
}

function toggleErrorExpand(index: number) {
  const idx = expandedErrors.value.indexOf(index);
  if (idx === -1) {
    expandedErrors.value.push(index);
  } else {
    expandedErrors.value.splice(idx, 1);
  }
}

function updateCharts(metrics: any) {
  // Update usage chart
  if (usageChartInstance.value) {
    usageChartInstance.value.destroy();
  }

  if (usageChart.value) {
    const ctx = usageChart.value.getContext("2d");
    if (ctx) {
      const topFeatures = Object.entries(metrics.features)
        .sort(([, a]: any, [, b]: any) => b.usageCount - a.usageCount)
        .slice(0, 10);

      usageChartInstance.value = new Chart(ctx, {
        type: "bar",
        data: {
          labels: topFeatures.map(([key]: any) => {
            const feature = features.value.find((f) => f.key === key);
            return feature?.name || key;
          }),
          datasets: [
            {
              label: t(
                "admin.featureToggles.monitoring.usageCount",
                "Nutzungen",
              ),
              data: topFeatures.map(([, data]: any) => data.usageCount),
              backgroundColor: "rgba(54, 162, 235, 0.6)",
              borderColor: "rgba(54, 162, 235, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  }

  // Update error chart
  if (errorChartInstance.value) {
    errorChartInstance.value.destroy();
  }

  if (errorChart.value) {
    const ctx = errorChart.value.getContext("2d");
    if (ctx) {
      const topErrorFeatures = Object.entries(metrics.features)
        .sort(([, a]: any, [, b]: any) => b.errorCount - a.errorCount)
        .slice(0, 10);

      errorChartInstance.value = new Chart(ctx, {
        type: "bar",
        data: {
          labels: topErrorFeatures.map(([key]: any) => {
            const feature = features.value.find((f) => f.key === key);
            return feature?.name || key;
          }),
          datasets: [
            {
              label: t("admin.featureToggles.monitoring.errorCount", "Fehler"),
              data: topErrorFeatures.map(([, data]: any) => data.errorCount),
              backgroundColor: "rgba(255, 99, 132, 0.6)",
              borderColor: "rgba(255, 99, 132, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  }
}

function updateTrendCharts() {
  // Clean up old chart instances
  Object.values(trendCharts.value).forEach((chart) => {
    if (chart) chart.destroy();
  });
  trendCharts.value = {};

  // Create trend charts for each feature
  metricsFeatures.value.forEach((feature) => {
    if (!feature.metrics?.trend) return;

    const chartRef = `trendChart_${feature.key}`;
    const canvas = document.querySelector(
      `[ref="${chartRef}"]`,
    ) as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    trendCharts.value[feature.key] = new Chart(ctx, {
      type: "line",
      data: {
        labels: feature.metrics.trend.map((t) =>
          new Date(t.date).toLocaleDateString(),
        ),
        datasets: [
          {
            label: t("admin.featureToggles.monitoring.usage", "Nutzung"),
            data: feature.metrics.trend.map((t) => t.count),
            borderColor: "rgba(54, 162, 235, 1)",
            backgroundColor: "rgba(54, 162, 235, 0.1)",
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            display: false,
          },
          x: {
            display: false,
          },
        },
        elements: {
          point: {
            radius: 0,
          },
        },
      },
    });
  });
}

// Lifecycle hooks
onMounted(async () => {
  await featureStore.loadFeatures();

  if (viewMode.value === "monitoring") {
    await fetchUsageMetrics();
  }
});

watch(viewMode, async (newMode) => {
  if (newMode === "monitoring") {
    await fetchUsageMetrics();
  }
});

watch(
  dateRange,
  () => {
    if (viewMode.value === "monitoring") {
      fetchUsageMetrics();
    }
  },
  { deep: true },
);
</script>

<style lang="scss">
.admin-feature-toggles-enhanced {
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

  // Monitoring view styles
  &__monitoring {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  &__monitoring-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;

    h4 {
      margin: 0;
    }
  }

  &__date-range {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  &__charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  &__chart-card {
    background-color: var(--card-bg);
    border-radius: 0.5rem;
    padding: 1rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

    h5 {
      margin-top: 0;
      margin-bottom: 1rem;
    }
  }

  &__metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }

  &__metric-card {
    background-color: var(--card-bg);
    border-radius: 0.5rem;
    padding: 1rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  &__metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;

    h5 {
      margin: 0;
      font-size: 1rem;
    }
  }

  &__metric-status {
    display: inline-block;
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;

    &.enabled {
      background-color: var(--success-light);
      color: var(--success);
    }

    &.disabled {
      background-color: var(--warning-light);
      color: var(--warning);
    }
  }

  &__metric-stats {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  &__metric-item {
    flex: 1;
  }

  &__metric-value {
    font-size: 1.25rem;
    font-weight: bold;
  }

  &__metric-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  &__error-logs {
    background-color: var(--card-bg);
    border-radius: 0.5rem;
    padding: 1rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

    h4 {
      margin-top: 0;
      margin-bottom: 1rem;
    }
  }

  &__error-container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__error-entry {
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    overflow: hidden;
  }

  &__error-header {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    background-color: var(--bg-secondary);
    font-size: 0.875rem;
  }

  &__error-feature {
    font-weight: bold;
  }

  &__error-time {
    color: var(--text-secondary);
  }

  &__error-message {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-color);
  }

  &__error-stack {
    padding: 0.75rem;
    background-color: var(--code-bg);
    font-family: monospace;
    font-size: 0.75rem;
    white-space: pre-wrap;
    overflow-x: auto;
    border-bottom: 1px solid var(--border-color);
  }

  &__error-expand {
    display: flex;
    justify-content: center;
    padding: 0.25rem;
    width: 100%;
  }

  // Feature form
  &__feature-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  // History view
  &__history {
    h4 {
      margin-top: 0;
      margin-bottom: 1.5rem;
    }
  }

  &__history-key {
    font-weight: normal;
    color: var(--text-secondary);
    font-family: monospace;
  }

  &__history-timeline {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__history-entry {
    display: flex;
    gap: 1rem;
  }

  &__history-date {
    flex-shrink: 0;
    width: 150px;
    padding-top: 0.25rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  &__history-content {
    flex-grow: 1;
    border-left: 2px solid var(--border-color);
    padding-left: 1rem;
    position: relative;

    &::before {
      content: "";
      position: absolute;
      width: 12px;
      height: 12px;
      background-color: var(--primary);
      border-radius: 50%;
      left: -7px;
      top: 5px;
    }
  }

  &__history-user {
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  &__history-changes {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__history-change {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  &__history-field {
    font-weight: 500;
    width: 120px;
  }

  &__history-old {
    text-decoration: line-through;
    color: var(--danger);
  }

  &__history-new {
    color: var(--success);
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
    &__date-range {
      flex-wrap: wrap;
    }

    &__metric-stats {
      flex-wrap: wrap;
    }

    &__feature-group {
      overflow-x: auto;
    }

    &__charts {
      grid-template-columns: 1fr;
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

    &__monitoring-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    &__date-range {
      width: 100%;
    }

    &__monitoring {
      gap: 1rem;
    }

    &__history-entry {
      flex-direction: column;
      gap: 0.5rem;
    }

    &__history-date {
      width: 100%;
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

    &__metric-stats {
      flex-direction: column;
      align-items: flex-start;
    }

    &__metric-item {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: center;

      &:not(:last-child) {
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.5rem;
        margin-bottom: 0.5rem;
      }
    }

    &__error-header {
      flex-direction: column;
      align-items: flex-start;
    }

    &__stat-card {
      padding: 0.75rem;
    }

    &__import-form,
    &__feature-form {
      gap: 1.5rem;
    }
  }
}
</style>
