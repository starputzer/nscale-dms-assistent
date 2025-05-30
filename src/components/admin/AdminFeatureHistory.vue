<template>
  <div class="admin-feature-history">
    <div v-if="feature" class="admin-feature-history__header">
      <h4>
        {{ feature.name }}
        <span class="admin-feature-history__key">({{ feature.key }})</span>
      </h4>
    </div>

    <div v-if="loadingHistory" class="admin-feature-history__loading">
      <div class="admin-feature-history__spinner"></div>
      <p>
        {{
          t("admin.featureToggles.history.loading", "Lade Änderungsverlauf...")
        }}
      </p>
    </div>

    <div v-else-if="!history.length" class="admin-feature-history__empty">
      <p>
        {{
          t(
            "admin.featureToggles.history.noEntries",
            "Keine Änderungen gefunden.",
          )
        }}
      </p>
    </div>

    <div v-else class="admin-feature-history__timeline">
      <div
        v-for="(entry, index) in history"
        :key="index"
        class="admin-feature-history__entry"
      >
        <div class="admin-feature-history__date">
          {{ formatDate(entry.timestamp) }}
        </div>
        <div class="admin-feature-history__content">
          <div class="admin-feature-history__user">
            {{ entry.user }}
          </div>
          <div class="admin-feature-history__changes">
            <div
              v-for="(change, field) in entry.changes"
              :key="field"
              class="admin-feature-history__change"
            >
              <span class="admin-feature-history__field">{{
                formatFieldName(field)
              }}</span>
              <span class="admin-feature-history__old">{{
                formatChangeValue(change.old)
              }}</span>
              <i class="fas fa-arrow-right"></i>
              <span class="admin-feature-history__new">{{
                formatChangeValue(change.new)
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type {
  FeatureToggle,
  FeatureHistoryEntry,
} from "@/types/featureToggles";

const { t } = useI18n({
  useScope: "global",
  inheritLocale: true,
});
console.log("[i18n] Component initialized with global scope and inheritance");

interface Props {
  feature: FeatureToggle | null;
  history: FeatureHistoryEntry[];
  loadingHistory: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  feature: null,
  history: () => [],
  loadingHistory: false,
});

// Methods
function formatDate(timestamp: string | number | Date) {
  return new Date(timestamp).toLocaleString();
}

function formatChangeValue(value: any): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "boolean") {
    return value
      ? t("admin.featureToggles.history.booleanTrue", "Ja")
      : t("admin.featureToggles.history.booleanFalse", "Nein");
  }

  if (Array.isArray(value)) {
    return value.join(", ") || "-";
  }

  return String(value);
}

function formatFieldName(field: string): string {
  // Map field names to localized display names
  const fieldNameMap: Record<string, string> = {
    name: t("admin.featureToggles.featureName", "Feature-Name"),
    key: t("admin.featureToggles.featureKey", "Feature-Key"),
    description: t("admin.featureToggles.featureDescription", "Beschreibung"),
    category: t("admin.featureToggles.featureCategory", "Kategorie"),
    enabled: t("admin.featureToggles.featureEnabled", "Aktiviert"),
    dependencies: t(
      "admin.featureToggles.featureDependencies",
      "Abhängigkeiten",
    ),
    locked: t("admin.featureToggles.featureLocked", "Gesperrt"),
    experimental: t(
      "admin.featureToggles.featureExperimental",
      "Experimentell",
    ),
  };

  return fieldNameMap[field] || field;
}
</script>

<style lang="scss">
.admin-feature-history {
  display: flex;
  flex-direction: column;
  width: 100%;

  &__header {
    margin-bottom: 1.5rem;

    h4 {
      margin: 0;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  }

  &__key {
    font-weight: normal;
    color: var(--text-secondary);
    font-family: monospace;
    font-size: 0.9em;
  }

  &__loading,
  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    color: var(--text-secondary);
  }

  &__spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-color);
    border-radius: 50%;
    border-top-color: var(--primary);
    animation: spin 1s ease-in-out infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  &__timeline {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  &__entry {
    display: flex;
    gap: 1rem;
  }

  &__date {
    flex-shrink: 0;
    width: 150px;
    padding-top: 0.25rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  &__content {
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

  &__user {
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  &__changes {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__change {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  &__field {
    font-weight: 500;
    width: 120px;
  }

  &__old {
    text-decoration: line-through;
    color: var(--danger);
  }

  &__new {
    color: var(--success);
  }

  // Responsive adjustments
  @media (max-width: 768px) {
    &__entry {
      flex-direction: column;
      gap: 0.5rem;
    }

    &__date {
      width: 100%;
    }

    &__content {
      margin-left: 0.5rem;
    }
  }

  @media (max-width: 480px) {
    &__field {
      width: 100%;
      margin-bottom: 0.25rem;
    }

    &__change {
      padding-bottom: 0.5rem;
      margin-bottom: 0.5rem;
      border-bottom: 1px dashed var(--border-color);

      &:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }
    }
  }
}
</style>
