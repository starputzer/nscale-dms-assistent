<template>
  <div class="admin-feature-toggles">
    <h2 class="admin-feature-toggles__title">
      {{ t("admin.featureToggles.title", "Feature-Toggles") }}
    </h2>
    <p class="admin-feature-toggles__description">
      {{
        t(
          "admin.featureToggles.description",
          "Verwalten Sie hier die Feature-Flags, um neue Funktionalitäten zu aktivieren oder zu deaktivieren.",
        )
      }}
    </p>

    <!-- Info-Box für Administratoren -->
    <div class="admin-feature-toggles__info-box">
      <div class="admin-feature-toggles__info-icon">
        <i class="fas fa-info-circle" aria-hidden="true"></i>
      </div>
      <div class="admin-feature-toggles__info-content">
        <h3>{{ t("admin.featureToggles.info.title", "Wichtige Hinweise") }}</h3>
        <p>
          {{
            t(
              "admin.featureToggles.info.content",
              "Das Ändern von Feature-Toggles kann sich auf die Stabilität und Funktionalität der Anwendung auswirken. Bitte aktivieren Sie neue Features mit Vorsicht und testen Sie gründlich nach jeder Änderung.",
            )
          }}
        </p>
      </div>
    </div>

    <!-- Toggle zwischen Verwaltung und Monitoring -->
    <div class="admin-feature-toggles__mode-switch">
      <button
        @click="activeMode = 'management'"
        class="admin-feature-toggles__mode-button"
        :class="{
          'admin-feature-toggles__mode-button--active':
            activeMode === 'management',
        }"
      >
        <i class="fas fa-toggle-on" aria-hidden="true"></i>
        {{ t("admin.featureToggles.modes.management", "Verwaltung") }}
      </button>
      <button
        @click="activeMode = 'monitoring'"
        class="admin-feature-toggles__mode-button"
        :class="{
          'admin-feature-toggles__mode-button--active':
            activeMode === 'monitoring',
        }"
      >
        <i class="fas fa-chart-line" aria-hidden="true"></i>
        {{ t("admin.featureToggles.modes.monitoring", "Monitoring") }}
      </button>
    </div>

    <!-- Management Mode -->
    <div v-if="activeMode === 'management'">
      <!-- Kategoriefilter für Feature-Toggles -->
      <div class="admin-feature-toggles__filter">
        <label
          for="category-filter"
          class="admin-feature-toggles__filter-label"
        >
          {{
            t("admin.featureToggles.filter.label", "Nach Kategorie filtern:")
          }}
        </label>
        <select
          id="category-filter"
          v-model="selectedCategory"
          class="admin-feature-toggles__filter-select"
        >
          <option value="all">
            {{ t("admin.featureToggles.filter.all", "Alle Kategorien") }}
          </option>
          <option
            v-for="(_, category) in categorizedToggles"
            :key="category"
            :value="category"
          >
            {{ translateCategory(category) }}
          </option>
        </select>

        <!-- Suchfeld für Feature-Toggles -->
        <div class="admin-feature-toggles__search">
          <label
            for="toggle-search"
            class="admin-feature-toggles__search-label"
          >
            {{
              t("admin.featureToggles.search.label", "Features durchsuchen:")
            }}
          </label>
          <div class="admin-feature-toggles__search-input-container">
            <i
              class="fas fa-search admin-feature-toggles__search-icon"
              aria-hidden="true"
            ></i>
            <input
              id="toggle-search"
              v-model="searchQuery"
              type="text"
              class="admin-feature-toggles__search-input"
              :placeholder="
                t(
                  'admin.featureToggles.search.placeholder',
                  'Suche nach Feature-Namen oder Beschreibung...',
                )
              "
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
          {{
            t(
              "admin.featureToggles.actions.enableAll",
              "Alle Features aktivieren",
            )
          }}
        </button>
        <button
          @click="disableAllFeatures"
          class="admin-feature-toggles__action-button admin-feature-toggles__action-button--secondary"
          :disabled="isLoading"
        >
          <i class="fas fa-times-circle" aria-hidden="true"></i>
          {{
            t(
              "admin.featureToggles.actions.disableAll",
              "Alle Features deaktivieren",
            )
          }}
        </button>
        <button
          @click="resetToDefaults"
          class="admin-feature-toggles__action-button admin-feature-toggles__action-button--danger"
          :disabled="isLoading"
        >
          <i class="fas fa-undo" aria-hidden="true"></i>
          {{
            t("admin.featureToggles.actions.reset", "Auf Standard zurücksetzen")
          }}
        </button>
      </div>

      <!-- Feature-Toggle-Listen nach Kategorie -->
      <div
        v-if="filteredTogglesByCategory.length > 0"
        class="admin-feature-toggles__categories"
      >
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
                'admin-feature-toggles__toggle-item--dev-only': toggle.dev,
                'admin-feature-toggles__toggle-item--has-errors': hasErrors(
                  toggle.id,
                ),
              }"
            >
              <div class="admin-feature-toggles__toggle-header">
                <div class="admin-feature-toggles__toggle-name-container">
                  <span
                    v-if="toggle.dev"
                    class="admin-feature-toggles__toggle-badge admin-feature-toggles__toggle-badge--dev"
                  >
                    {{ t("admin.featureToggles.badges.dev", "Entwicklung") }}
                  </span>
                  <span
                    v-if="hasErrors(toggle.id)"
                    class="admin-feature-toggles__toggle-badge admin-feature-toggles__toggle-badge--error"
                  >
                    {{ t("admin.featureToggles.badges.error", "Fehler") }}
                  </span>
                  <span
                    v-if="isFallbackActive(toggle.id)"
                    class="admin-feature-toggles__toggle-badge admin-feature-toggles__toggle-badge--fallback"
                  >
                    {{
                      t(
                        "admin.featureToggles.badges.fallback",
                        "Fallback aktiv",
                      )
                    }}
                  </span>
                  <h4 class="admin-feature-toggles__toggle-name">
                    {{ toggle.name }}
                  </h4>
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

              <!-- Dependencies -->
              <div
                v-if="toggle.dependencies && toggle.dependencies.length > 0"
                class="admin-feature-toggles__toggle-dependencies"
              >
                <span class="admin-feature-toggles__toggle-dependencies-label">
                  {{
                    t("admin.featureToggles.dependencies", "Abhängigkeiten:")
                  }}
                </span>
                <div class="admin-feature-toggles__toggle-dependency-list">
                  <span
                    v-for="dep in toggle.dependencies"
                    :key="dep"
                    class="admin-feature-toggles__toggle-dependency"
                    :class="{
                      'admin-feature-toggles__toggle-dependency--active':
                        isFeatureEnabled(dep),
                      'admin-feature-toggles__toggle-dependency--inactive':
                        !isFeatureEnabled(dep),
                    }"
                  >
                    {{ dep }}
                  </span>
                </div>
              </div>

              <!-- Error display -->
              <div
                v-if="hasErrors(toggle.id)"
                class="admin-feature-toggles__toggle-errors"
              >
                <div class="admin-feature-toggles__toggle-errors-header">
                  <span>{{
                    t("admin.featureToggles.errors.title", "Fehler:")
                  }}</span>
                  <button
                    @click="clearErrors(toggle.id)"
                    class="admin-feature-toggles__clear-errors-button"
                    :title="
                      t('admin.featureToggles.errors.clear', 'Fehler löschen')
                    "
                  >
                    <i class="fas fa-times" aria-hidden="true"></i>
                  </button>
                </div>
                <ul class="admin-feature-toggles__toggle-error-list">
                  <li
                    v-for="(error, index) in getFeatureErrors(toggle.id)"
                    :key="index"
                    class="admin-feature-toggles__toggle-error"
                  >
                    {{ error.message }}
                    <span class="admin-feature-toggles__toggle-error-time">
                      {{ formatErrorTime(error.timestamp) }}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Keine Ergebnisse -->
      <div v-else class="admin-feature-toggles__no-results">
        <i class="fas fa-search" aria-hidden="true"></i>
        <p>
          {{
            t(
              "admin.featureToggles.noResults",
              "Keine Feature-Toggles gefunden, die Ihren Filterkriterien entsprechen.",
            )
          }}
        </p>
        <button
          @click="clearFilters"
          class="admin-feature-toggles__clear-filters"
        >
          {{ t("admin.featureToggles.clearFilters", "Filter zurücksetzen") }}
        </button>
      </div>
    </div>

    <!-- Monitoring Mode -->
    <div
      v-else-if="activeMode === 'monitoring'"
      class="admin-feature-toggles__monitoring"
    >
      <!-- System Health Summary -->
      <div
        class="admin-feature-toggles__health-summary"
        :class="{
          'admin-feature-toggles__health-summary--good':
            featureHealthStatus === 'good',
          'admin-feature-toggles__health-summary--warning':
            featureHealthStatus === 'warning',
          'admin-feature-toggles__health-summary--critical':
            featureHealthStatus === 'critical',
        }"
      >
        <div class="admin-feature-toggles__health-icon">
          <i
            class="fas"
            :class="{
              'fa-check-circle': featureHealthStatus === 'good',
              'fa-exclamation-circle': featureHealthStatus === 'warning',
              'fa-exclamation-triangle': featureHealthStatus === 'critical',
            }"
            aria-hidden="true"
          ></i>
        </div>
        <div class="admin-feature-toggles__health-content">
          <h3 class="admin-feature-toggles__health-title">
            {{
              t(
                "admin.featureToggles.monitoring.healthStatus",
                "Feature Status",
              )
            }}
          </h3>
          <p class="admin-feature-toggles__health-text">
            {{ featureHealthStatusText }}
          </p>
        </div>
      </div>

      <!-- Feature Statistics -->
      <div class="admin-feature-toggles__stats-grid">
        <div class="admin-feature-toggles__stat-card">
          <div class="admin-feature-toggles__stat-icon">
            <i class="fas fa-toggle-on" aria-hidden="true"></i>
          </div>
          <div class="admin-feature-toggles__stat-content">
            <h4 class="admin-feature-toggles__stat-title">
              {{
                t(
                  "admin.featureToggles.monitoring.activeFeatures",
                  "Aktive Features",
                )
              }}
            </h4>
            <p class="admin-feature-toggles__stat-value">
              {{ activeFeatureCount }}
            </p>
            <p class="admin-feature-toggles__stat-detail">
              {{ t('admin.featureToggles.monitoring.outOfTotal', 'von {{total}}
              Features', { total: totalFeatureCount }) }}
            </p>
          </div>
        </div>

        <div class="admin-feature-toggles__stat-card">
          <div
            class="admin-feature-toggles__stat-icon admin-feature-toggles__stat-icon--warning"
          >
            <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
          </div>
          <div class="admin-feature-toggles__stat-content">
            <h4 class="admin-feature-toggles__stat-title">
              {{
                t(
                  "admin.featureToggles.monitoring.featuresWithErrors",
                  "Features mit Fehlern",
                )
              }}
            </h4>
            <p class="admin-feature-toggles__stat-value">
              {{ featuresWithErrorsCount }}
            </p>
            <p class="admin-feature-toggles__stat-detail">
              {{ t('admin.featureToggles.monitoring.totalErrors', 'Insgesamt {{count}}
              Fehler', { count: totalErrorsCount }) }}
            </p>
          </div>
        </div>

        <div class="admin-feature-toggles__stat-card">
          <div
            class="admin-feature-toggles__stat-icon admin-feature-toggles__stat-icon--info"
          >
            <i class="fas fa-life-ring" aria-hidden="true"></i>
          </div>
          <div class="admin-feature-toggles__stat-content">
            <h4 class="admin-feature-toggles__stat-title">
              {{
                t(
                  "admin.featureToggles.monitoring.activeFallbacks",
                  "Aktive Fallbacks",
                )
              }}
            </h4>
            <p class="admin-feature-toggles__stat-value">
              {{ activeFallbacksCount }}
            </p>
            <p class="admin-feature-toggles__stat-detail">
              {{ t('admin.featureToggles.monitoring.fallbacksAvailable', '{{count}}
              Features mit Fallback', { count: featuresWithFallbackCount }) }}
            </p>
          </div>
        </div>

        <div class="admin-feature-toggles__stat-card">
          <div
            class="admin-feature-toggles__stat-icon admin-feature-toggles__stat-icon--success"
          >
            <i class="fas fa-code-branch" aria-hidden="true"></i>
          </div>
          <div class="admin-feature-toggles__stat-content">
            <h4 class="admin-feature-toggles__stat-title">
              {{
                t(
                  "admin.featureToggles.monitoring.migratedFeatures",
                  "Migrierte Features",
                )
              }}
            </h4>
            <p class="admin-feature-toggles__stat-value">
              {{ migratedFeaturesCount }}
            </p>
            <p class="admin-feature-toggles__stat-detail">
              {{ t('admin.featureToggles.monitoring.migrationProgress', '{{percent}}% abgeschlossen', { percent: migrationProgressPercent }) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Error Timeline Chart -->
      <div class="admin-feature-toggles__error-chart">
        <h3 class="admin-feature-toggles__section-title">
          {{
            t(
              "admin.featureToggles.monitoring.errorTimeline",
              "Fehler-Zeitverlauf",
            )
          }}
        </h3>
        <div class="admin-feature-toggles__chart-container">
          <div
            v-if="errorTimelineEntries.length === 0"
            class="admin-feature-toggles__chart-empty"
          >
            <i class="fas fa-chart-line" aria-hidden="true"></i>
            <p>
              {{
                t(
                  "admin.featureToggles.monitoring.noErrorsRecorded",
                  "Keine Fehler aufgezeichnet",
                )
              }}
            </p>
          </div>
          <div v-else class="admin-feature-toggles__timeline">
            <div
              v-for="(entry, index) in errorTimelineEntries"
              :key="index"
              class="admin-feature-toggles__timeline-entry"
            >
              <div class="admin-feature-toggles__timeline-marker"></div>
              <div class="admin-feature-toggles__timeline-content">
                <span class="admin-feature-toggles__timeline-time">
                  {{ formatErrorTime(entry.timestamp) }}
                </span>
                <div class="admin-feature-toggles__timeline-feature">
                  {{ entry.feature }}
                </div>
                <p class="admin-feature-toggles__timeline-message">
                  {{ entry.message }}
                </p>
                <div class="admin-feature-toggles__timeline-actions">
                  <span
                    class="admin-feature-toggles__timeline-fallback"
                    v-if="entry.fallbackActive"
                  >
                    <i class="fas fa-exchange-alt" aria-hidden="true"></i>
                    {{
                      t(
                        "admin.featureToggles.monitoring.fallbackActivated",
                        "Fallback aktiviert",
                      )
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Feature Usage -->
      <div class="admin-feature-toggles__usage-section">
        <h3 class="admin-feature-toggles__section-title">
          {{
            t("admin.featureToggles.monitoring.featureUsage", "Feature-Nutzung")
          }}
        </h3>
        <div class="admin-feature-toggles__usage-container">
          <div class="admin-feature-toggles__usage-header">
            <span class="admin-feature-toggles__usage-header-name">
              {{ t("admin.featureToggles.monitoring.featureName", "Feature") }}
            </span>
            <span class="admin-feature-toggles__usage-header-status">
              {{ t("admin.featureToggles.monitoring.status", "Status") }}
            </span>
            <span class="admin-feature-toggles__usage-header-usage">
              {{ t("admin.featureToggles.monitoring.usage", "Nutzung") }}
            </span>
          </div>

          <div class="admin-feature-toggles__usage-body">
            <div
              v-for="feature in topUsedFeatures"
              :key="feature.id"
              class="admin-feature-toggles__usage-item"
            >
              <span class="admin-feature-toggles__usage-name">{{
                feature.name
              }}</span>
              <span class="admin-feature-toggles__usage-status">
                <span
                  class="admin-feature-toggles__usage-status-indicator"
                  :class="{
                    'admin-feature-toggles__usage-status-indicator--on':
                      feature.enabled,
                    'admin-feature-toggles__usage-status-indicator--off':
                      !feature.enabled,
                    'admin-feature-toggles__usage-status-indicator--error':
                      hasErrors(feature.id),
                  }"
                ></span>
                {{
                  feature.enabled
                    ? t("admin.featureToggles.monitoring.enabled", "Aktiv")
                    : t("admin.featureToggles.monitoring.disabled", "Inaktiv")
                }}
              </span>
              <div class="admin-feature-toggles__usage-meter">
                <div
                  class="admin-feature-toggles__usage-meter-fill"
                  :style="{
                    width: `${(feature.usageCount / maxUsageCount) * 100}%`,
                  }"
                ></div>
                <span class="admin-feature-toggles__usage-meter-value">
                  {{ feature.usageCount }}
                  {{ t("admin.featureToggles.monitoring.calls", "Aufrufe") }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Logging Controls -->
      <div class="admin-feature-toggles__logging-controls">
        <h3 class="admin-feature-toggles__section-title">
          {{
            t(
              "admin.featureToggles.monitoring.loggingControls",
              "Logging-Steuerung",
            )
          }}
        </h3>
        <div class="admin-feature-toggles__logging-options">
          <div class="admin-feature-toggles__logging-option">
            <label class="admin-feature-toggles__toggle-switch">
              <input type="checkbox" v-model="logSettings.detailedLogging" />
              <span class="admin-feature-toggles__toggle-slider"></span>
            </label>
            <div class="admin-feature-toggles__logging-option-text">
              <span class="admin-feature-toggles__logging-option-label">
                {{
                  t(
                    "admin.featureToggles.monitoring.detailedLogging",
                    "Detailliertes Logging",
                  )
                }}
              </span>
              <span class="admin-feature-toggles__logging-option-description">
                {{
                  t(
                    "admin.featureToggles.monitoring.detailedLoggingDesc",
                    "Erfasst zusätzliche Informationen zu Feature-Toggle-Nutzung",
                  )
                }}
              </span>
            </div>
          </div>

          <div class="admin-feature-toggles__logging-option">
            <label class="admin-feature-toggles__toggle-switch">
              <input type="checkbox" v-model="logSettings.consoleErrors" />
              <span class="admin-feature-toggles__toggle-slider"></span>
            </label>
            <div class="admin-feature-toggles__logging-option-text">
              <span class="admin-feature-toggles__logging-option-label">
                {{
                  t(
                    "admin.featureToggles.monitoring.consoleErrors",
                    "Fehler in Konsole ausgeben",
                  )
                }}
              </span>
              <span class="admin-feature-toggles__logging-option-description">
                {{
                  t(
                    "admin.featureToggles.monitoring.consoleErrorsDesc",
                    "Gibt Feature-Toggle-Fehler in der Browser-Konsole aus",
                  )
                }}
              </span>
            </div>
          </div>

          <div class="admin-feature-toggles__logging-option">
            <label class="admin-feature-toggles__toggle-switch">
              <input type="checkbox" v-model="logSettings.sessionLogging" />
              <span class="admin-feature-toggles__toggle-slider"></span>
            </label>
            <div class="admin-feature-toggles__logging-option-text">
              <span class="admin-feature-toggles__logging-option-label">
                {{
                  t(
                    "admin.featureToggles.monitoring.sessionLogging",
                    "Session-Logging",
                  )
                }}
              </span>
              <span class="admin-feature-toggles__logging-option-description">
                {{
                  t(
                    "admin.featureToggles.monitoring.sessionLoggingDesc",
                    "Speichert Feature-Toggle-Status für jede Benutzersitzung",
                  )
                }}
              </span>
            </div>
          </div>

          <div class="admin-feature-toggles__logging-actions">
            <button
              @click="clearAllErrors"
              class="admin-feature-toggles__action-button admin-feature-toggles__action-button--secondary"
            >
              <i class="fas fa-trash-alt" aria-hidden="true"></i>
              {{
                t(
                  "admin.featureToggles.monitoring.clearAllErrors",
                  "Alle Fehler löschen",
                )
              }}
            </button>
            <button
              @click="exportErrorLog"
              class="admin-feature-toggles__action-button admin-feature-toggles__action-button--primary"
            >
              <i class="fas fa-file-export" aria-hidden="true"></i>
              {{
                t(
                  "admin.featureToggles.monitoring.exportErrorLog",
                  "Fehlerprotokoll exportieren",
                )
              }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useFeatureTogglesStore } from "@/stores/featureToggles";
import { storeToRefs } from "pinia";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { FeatureToggleError } from "@/stores/featureToggles";

// i18n
const { t } = useI18n();

// Store
const featureTogglesStore = useFeatureTogglesStore();
const { errors, activeFallbacks } = storeToRefs(featureTogglesStore);

// Local state
const isLoading = ref(false);
const selectedCategory = ref("all");
const searchQuery = ref("");
const activeMode = ref<"management" | "monitoring">("management");

// Logging settings
const logSettings = ref({
  detailedLogging: true,
  consoleErrors: true,
  sessionLogging: false,
});

// Simulated feature usage data
const featureUsageData = ref(
  Object.fromEntries(
    Object.keys(featureTogglesStore.featureConfigs).map((key) => [
      key,
      Math.floor(Math.random() * 1000),
    ]),
  ),
);

// Load all toggles from store
onMounted(async () => {
  isLoading.value = true;

  try {
    await featureTogglesStore.loadFeatureToggles();
  } catch (error) {
    console.error("Error loading feature toggles:", error);
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
  const categories =
    selectedCategory.value === "all"
      ? Object.keys(categorizedToggles.value)
      : [selectedCategory.value];

  for (const category of categories) {
    // Skip if category doesn't exist
    if (!categorizedToggles.value[category]) continue;

    // Filter toggles by search query
    const toggles = categorizedToggles.value[category].filter((toggle) => {
      if (!searchQuery.value) return true;

      const query = searchQuery.value.toLowerCase();
      return (
        toggle.name.toLowerCase().includes(query) ||
        toggle.description.toLowerCase().includes(query) ||
        toggle.id.toLowerCase().includes(query)
      );
    });

    // Add category to result if it has toggles
    if (toggles.length > 0) {
      result.push({
        name: category,
        toggles,
      });
    }
  }

  return result;
});

// Feature health status
const featureHealthStatus = computed(() => {
  const errorCount = totalErrorsCount.value;
  const fallbackCount = activeFallbacksCount.value;

  if (errorCount > 5 || fallbackCount > 3) return "critical";
  if (errorCount > 0 || fallbackCount > 0) return "warning";
  return "good";
});

const featureHealthStatusText = computed(() => {
  switch (featureHealthStatus.value) {
    case "critical":
      return t(
        "admin.featureToggles.monitoring.healthCritical",
        "Kritisch: Mehrere Fehler oder Fallbacks aktiv",
      );
    case "warning":
      return t(
        "admin.featureToggles.monitoring.healthWarning",
        "Warnung: Fehler oder Fallbacks aktiv",
      );
    default:
      return t(
        "admin.featureToggles.monitoring.healthGood",
        "Alle Features funktionieren normal",
      );
  }
});

// Feature statistics
const totalFeatureCount = computed(() => {
  return Object.keys(featureTogglesStore.featureConfigs).length;
});

const activeFeatureCount = computed(() => {
  return Object.keys(featureTogglesStore.featureConfigs).filter((id) =>
    featureTogglesStore.isEnabled(id),
  ).length;
});

const featuresWithErrorsCount = computed(() => {
  return Object.keys(errors.value).length;
});

const totalErrorsCount = computed(() => {
  return Object.values(errors.value).reduce(
    (sum, errArray) => sum + errArray.length,
    0,
  );
});

const activeFallbacksCount = computed(() => {
  return Object.values(activeFallbacks.value).filter(Boolean).length;
});

const featuresWithFallbackCount = computed(() => {
  return Object.values(featureTogglesStore.featureConfigs).filter(
    (config) => config.hasFallback,
  ).length;
});

const migratedFeaturesCount = computed(() => {
  // Count SFC migration features that are enabled
  return Object.entries(featureTogglesStore.featureConfigs).filter(
    ([id, config]) =>
      config.group === "sfcMigration" && featureTogglesStore.isEnabled(id),
  ).length;
});

const migrationProgressPercent = computed(() => {
  // Calculate migration progress percentage
  const total = Object.values(featureTogglesStore.featureConfigs).filter(
    (config) => config.group === "sfcMigration",
  ).length;

  if (total === 0) return 0;
  return Math.round((migratedFeaturesCount.value / total) * 100);
});

// Error timeline entries
const errorTimelineEntries = computed(() => {
  const allErrors: Array<FeatureToggleError & { feature: string }> = [];

  Object.entries(errors.value).forEach(([feature, errArray]) => {
    errArray.forEach((err) => {
      allErrors.push({
        ...err,
        feature,
      });
    });
  });

  // Sort by timestamp, most recent first
  return allErrors.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
});

// Top used features
const topUsedFeatures = computed(() => {
  const allFeatures = Object.entries(featureTogglesStore.featureConfigs).map(
    ([id, config]) => {
      const isEnabled = featureTogglesStore.isEnabled(id);
      return {
        id,
        name: config.name,
        enabled: isEnabled,
        usageCount: featureUsageData.value[id] || 0,
      };
    },
  );

  // Sort by usage count, highest first
  return allFeatures.sort((a, b) => b.usageCount - a.usageCount).slice(0, 5); // Take top 5
});

const maxUsageCount = computed(() => {
  const counts = topUsedFeatures.value.map((f) => f.usageCount);
  return Math.max(...counts, 1); // Avoid division by zero
});

// Methods
function toggleFeature(featureId: string) {
  featureTogglesStore.toggleFeature(featureId);
}

function hasErrors(featureId: string): boolean {
  return !!errors.value[featureId] && errors.value[featureId].length > 0;
}

function getFeatureErrors(featureId: string): FeatureToggleError[] {
  return errors.value[featureId] || [];
}

function isFallbackActive(featureId: string): boolean {
  return !!activeFallbacks.value[featureId];
}

function clearErrors(featureId: string) {
  featureTogglesStore.clearFeatureErrors(featureId);
}

function clearAllErrors() {
  Object.keys(errors.value).forEach((featureId) => {
    featureTogglesStore.clearFeatureErrors(featureId);
  });
}

function formatErrorTime(timestamp: Date): string {
  try {
    return format(new Date(timestamp), "dd.MM.yyyy HH:mm:ss", { locale: de });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
}

function isFeatureEnabled(featureId: string): boolean {
  return featureTogglesStore.isEnabled(featureId);
}

function enableAllFeatures() {
  if (
    confirm(
      t(
        "admin.featureToggles.confirmations.enableAll",
        "Sind Sie sicher, dass Sie alle Features aktivieren möchten? Dies kann die Anwendungsstabilität beeinflussen.",
      ),
    )
  ) {
    isLoading.value = true;
    setTimeout(() => {
      try {
        if (selectedCategory.value === "all") {
          Object.values(categorizedToggles.value)
            .flat()
            .forEach((toggle) => {
              featureTogglesStore.enableFeature(toggle.id);
            });
        } else {
          categorizedToggles.value[selectedCategory.value].forEach((toggle) => {
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
  if (
    confirm(
      t(
        "admin.featureToggles.confirmations.disableAll",
        "Sind Sie sicher, dass Sie alle Features deaktivieren möchten? Dies kann dazu führen, dass Teile der Anwendung nicht mehr funktionieren.",
      ),
    )
  ) {
    isLoading.value = true;
    setTimeout(() => {
      try {
        if (selectedCategory.value === "all") {
          Object.values(categorizedToggles.value)
            .flat()
            .forEach((toggle) => {
              featureTogglesStore.disableFeature(toggle.id);
            });
        } else {
          categorizedToggles.value[selectedCategory.value].forEach((toggle) => {
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
  if (
    confirm(
      t(
        "admin.featureToggles.confirmations.reset",
        "Sind Sie sicher, dass Sie alle Feature-Toggles auf die Standardwerte zurücksetzen möchten?",
      ),
    )
  ) {
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
          enableDebugMode: false,
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
  selectedCategory.value = "all";
  searchQuery.value = "";
}

function translateCategory(category: string): string {
  const translations: Record<string, string> = {
    migration: t("admin.featureToggles.categories.migration", "Migration"),
    ui: t("admin.featureToggles.categories.ui", "Benutzeroberfläche"),
    feature: t("admin.featureToggles.categories.feature", "Funktionen"),
    development: t(
      "admin.featureToggles.categories.development",
      "Entwicklung",
    ),
    admin: t("admin.featureToggles.categories.admin", "Administration"),
  };

  return translations[category] || category;
}

function exportErrorLog() {
  const errorLog = JSON.stringify(errorTimelineEntries.value, null, 2);
  const blob = new Blob([errorLog], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `feature-toggle-errors-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Watch for changes to logging settings
watch(
  logSettings,
  (newSettings) => {
    console.log("Logging settings updated:", newSettings);
    // In a real app, would save these settings to the backend or localStorage
  },
  { deep: true },
);
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

.admin-feature-toggles__section-title {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
  border-bottom: 1px solid var(--n-color-border);
  padding-bottom: 0.5rem;
}

/* Mode Switch */
.admin-feature-toggles__mode-switch {
  display: flex;
  border-radius: var(--n-border-radius);
  border: 1px solid var(--n-color-border);
  overflow: hidden;
  width: fit-content;
}

.admin-feature-toggles__mode-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: none;
  background-color: var(--n-color-background);
  color: var(--n-color-text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.admin-feature-toggles__mode-button--active {
  background-color: var(--n-color-primary);
  color: var(--n-color-on-primary);
}

.admin-feature-toggles__mode-button:first-child {
  border-right: 1px solid var(--n-color-border);
}

/* Info Box */
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

/* Filter */
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

/* Quick Actions */
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

/* Categories */
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

.admin-feature-toggles__toggle-item--has-errors {
  border-left: 3px solid var(--n-color-error);
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
  flex-wrap: wrap;
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

.admin-feature-toggles__toggle-badge--error {
  background-color: var(--n-color-error);
  color: var(--n-color-on-error);
}

.admin-feature-toggles__toggle-badge--fallback {
  background-color: var(--n-color-info);
  color: var(--n-color-on-info);
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

/* Dependencies */
.admin-feature-toggles__toggle-dependencies {
  margin-top: 0.5rem;
  font-size: 0.8125rem;
}

.admin-feature-toggles__toggle-dependencies-label {
  font-weight: 500;
  color: var(--n-color-text-secondary);
}

.admin-feature-toggles__toggle-dependency-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.25rem;
}

.admin-feature-toggles__toggle-dependency {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  border-radius: 0.75rem;
  background-color: var(--n-color-background);
  border: 1px solid var(--n-color-border);
  font-size: 0.75rem;
}

.admin-feature-toggles__toggle-dependency--active {
  background-color: rgba(var(--n-color-success-rgb), 0.1);
  border-color: var(--n-color-success);
  color: var(--n-color-success);
}

.admin-feature-toggles__toggle-dependency--inactive {
  background-color: rgba(var(--n-color-error-rgb), 0.1);
  border-color: var(--n-color-error);
  color: var(--n-color-error);
}

/* Error display */
.admin-feature-toggles__toggle-errors {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: rgba(var(--n-color-error-rgb), 0.05);
  border-radius: var(--n-border-radius);
  border: 1px solid rgba(var(--n-color-error-rgb), 0.2);
}

.admin-feature-toggles__toggle-errors-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.admin-feature-toggles__toggle-errors-header span {
  font-weight: 500;
  font-size: 0.8125rem;
  color: var(--n-color-error);
}

.admin-feature-toggles__clear-errors-button {
  background: none;
  border: none;
  color: var(--n-color-text-tertiary);
  cursor: pointer;
  padding: 0;
  font-size: 0.75rem;
}

.admin-feature-toggles__toggle-error-list {
  margin: 0;
  padding: 0 0 0 1.25rem;
  font-size: 0.75rem;
}

.admin-feature-toggles__toggle-error {
  margin-bottom: 0.25rem;
  color: var(--n-color-text-primary);
}

.admin-feature-toggles__toggle-error-time {
  display: block;
  color: var(--n-color-text-tertiary);
  font-size: 0.6875rem;
  margin-top: 0.125rem;
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
  transition: 0.4s;
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
  transition: 0.4s;
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

input:disabled + .admin-feature-toggles__toggle-slider {
  opacity: 0.7;
  cursor: not-allowed;
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

/* Monitoring Mode */
.admin-feature-toggles__monitoring {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Health Summary */
.admin-feature-toggles__health-summary {
  display: flex;
  padding: 1.25rem;
  border-radius: var(--n-border-radius);
  background-color: var(--n-color-background-alt);
  box-shadow: var(--n-shadow-sm);
  border-left: 4px solid;
}

.admin-feature-toggles__health-summary--good {
  border-left-color: var(--n-color-success);
}

.admin-feature-toggles__health-summary--warning {
  border-left-color: var(--n-color-warning);
}

.admin-feature-toggles__health-summary--critical {
  border-left-color: var(--n-color-error);
}

.admin-feature-toggles__health-icon {
  font-size: 2.5rem;
  margin-right: 1.5rem;
}

.admin-feature-toggles__health-summary--good
  .admin-feature-toggles__health-icon {
  color: var(--n-color-success);
}

.admin-feature-toggles__health-summary--warning
  .admin-feature-toggles__health-icon {
  color: var(--n-color-warning);
}

.admin-feature-toggles__health-summary--critical
  .admin-feature-toggles__health-icon {
  color: var(--n-color-error);
}

.admin-feature-toggles__health-content {
  flex: 1;
}

.admin-feature-toggles__health-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.admin-feature-toggles__health-text {
  margin: 0.25rem 0 0 0;
  font-size: 1.125rem;
  color: var(--n-color-text-primary);
}

/* Stats Grid */
.admin-feature-toggles__stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.admin-feature-toggles__stat-card {
  display: flex;
  padding: 1.25rem;
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  box-shadow: var(--n-shadow-sm);
}

.admin-feature-toggles__stat-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 3rem;
  height: 3rem;
  margin-right: 1rem;
  border-radius: 50%;
  background-color: rgba(var(--n-color-primary-rgb), 0.1);
  color: var(--n-color-primary);
  font-size: 1.25rem;
}

.admin-feature-toggles__stat-icon--warning {
  background-color: rgba(var(--n-color-warning-rgb), 0.1);
  color: var(--n-color-warning);
}

.admin-feature-toggles__stat-icon--info {
  background-color: rgba(var(--n-color-info-rgb), 0.1);
  color: var(--n-color-info);
}

.admin-feature-toggles__stat-icon--success {
  background-color: rgba(var(--n-color-success-rgb), 0.1);
  color: var(--n-color-success);
}

.admin-feature-toggles__stat-content {
  flex: 1;
}

.admin-feature-toggles__stat-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--n-color-text-secondary);
}

.admin-feature-toggles__stat-value {
  margin: 0.25rem 0 0 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--n-color-text-primary);
}

.admin-feature-toggles__stat-detail {
  margin: 0.25rem 0 0 0;
  font-size: 0.75rem;
  color: var(--n-color-text-tertiary);
}

/* Error Timeline */
.admin-feature-toggles__error-chart {
  margin-top: 1rem;
}

.admin-feature-toggles__chart-container {
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.25rem;
  min-height: 200px;
}

.admin-feature-toggles__chart-empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: var(--n-color-text-tertiary);
  text-align: center;
}

.admin-feature-toggles__chart-empty i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.admin-feature-toggles__timeline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.admin-feature-toggles__timeline-entry {
  display: flex;
  gap: 1rem;
}

.admin-feature-toggles__timeline-marker {
  position: relative;
  width: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.admin-feature-toggles__timeline-marker::before {
  content: "";
  position: absolute;
  top: 0.75rem;
  left: 0.6875rem;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background-color: var(--n-color-error);
  z-index: 1;
}

.admin-feature-toggles__timeline-marker::after {
  content: "";
  position: absolute;
  top: 1.5rem;
  bottom: -1rem;
  left: 0.75rem;
  width: 0.125rem;
  background-color: var(--n-color-border);
}

.admin-feature-toggles__timeline-entry:last-child
  .admin-feature-toggles__timeline-marker::after {
  display: none;
}

.admin-feature-toggles__timeline-content {
  flex: 1;
  padding: 0.75rem;
  background-color: var(--n-color-background);
  border-radius: var(--n-border-radius);
  border: 1px solid var(--n-color-border);
}

.admin-feature-toggles__timeline-time {
  display: block;
  font-size: 0.75rem;
  color: var(--n-color-text-tertiary);
  margin-bottom: 0.25rem;
}

.admin-feature-toggles__timeline-feature {
  font-weight: 500;
  color: var(--n-color-text-primary);
  margin-bottom: 0.25rem;
}

.admin-feature-toggles__timeline-message {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: var(--n-color-text-secondary);
}

.admin-feature-toggles__timeline-actions {
  display: flex;
  justify-content: flex-end;
}

.admin-feature-toggles__timeline-fallback {
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--n-color-info);
}

/* Feature Usage */
.admin-feature-toggles__usage-container {
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  overflow: hidden;
}

.admin-feature-toggles__usage-header {
  display: grid;
  grid-template-columns: 2fr 1fr 2fr;
  background-color: var(--n-color-background);
  border-bottom: 1px solid var(--n-color-border);
  padding: 0.75rem 1rem;
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--n-color-text-primary);
}

.admin-feature-toggles__usage-body {
  padding: 0.5rem 0;
}

.admin-feature-toggles__usage-item {
  display: grid;
  grid-template-columns: 2fr 1fr 2fr;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  align-items: center;
  border-bottom: 1px solid rgba(var(--n-color-border-rgb), 0.3);
}

.admin-feature-toggles__usage-item:last-child {
  border-bottom: none;
}

.admin-feature-toggles__usage-name {
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.admin-feature-toggles__usage-status {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--n-color-text-secondary);
}

.admin-feature-toggles__usage-status-indicator {
  display: inline-block;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}

.admin-feature-toggles__usage-status-indicator--on {
  background-color: var(--n-color-success);
}

.admin-feature-toggles__usage-status-indicator--off {
  background-color: var(--n-color-text-tertiary);
}

.admin-feature-toggles__usage-status-indicator--error {
  background-color: var(--n-color-error);
}

.admin-feature-toggles__usage-meter {
  position: relative;
  height: 0.5rem;
  background-color: rgba(var(--n-color-primary-rgb), 0.1);
  border-radius: 0.25rem;
}

.admin-feature-toggles__usage-meter-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 0.25rem;
  background-color: var(--n-color-primary);
}

.admin-feature-toggles__usage-meter-value {
  position: absolute;
  top: 0.625rem;
  right: 0;
  font-size: 0.75rem;
  color: var(--n-color-text-secondary);
}

/* Logging Controls */
.admin-feature-toggles__logging-options {
  background-color: var(--n-color-background-alt);
  border-radius: var(--n-border-radius);
  padding: 1.25rem;
}

.admin-feature-toggles__logging-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--n-color-border);
}

.admin-feature-toggles__logging-option:last-of-type {
  border-bottom: none;
  margin-bottom: 1rem;
}

.admin-feature-toggles__logging-option-text {
  display: flex;
  flex-direction: column;
}

.admin-feature-toggles__logging-option-label {
  font-weight: 500;
  color: var(--n-color-text-primary);
}

.admin-feature-toggles__logging-option-description {
  font-size: 0.75rem;
  color: var(--n-color-text-secondary);
}

.admin-feature-toggles__logging-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--n-color-border);
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

  .admin-feature-toggles__stats-grid {
    grid-template-columns: 1fr;
  }

  .admin-feature-toggles__health-summary {
    flex-direction: column;
    text-align: center;
  }

  .admin-feature-toggles__health-icon {
    margin-right: 0;
    margin-bottom: 1rem;
  }

  .admin-feature-toggles__usage-header,
  .admin-feature-toggles__usage-item {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .admin-feature-toggles__usage-meter {
    margin-top: 1rem;
  }

  .admin-feature-toggles__logging-option {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .admin-feature-toggles__logging-actions {
    flex-direction: column;
  }
}
</style>
