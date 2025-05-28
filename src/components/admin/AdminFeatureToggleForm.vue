<template>
  <div class="admin-feature-toggle-form">
    <BaseInput
      v-model="formData.name"
      :label="t('admin.featureToggles.featureName', 'Feature-Name')"
      :error="errors.name"
      required
    />
    <BaseInput
      v-model="formData.key"
      :label="t('admin.featureToggles.featureKey', 'Feature-Key')"
      :disabled="isEditing"
      :error="errors.key"
      required
      :help="
        t(
          'admin.featureToggles.keyHelp',
          'Eindeutiger Schlüssel für den Programmcode',
        )
      "
    />
    <BaseTextarea
      v-model="formData.description"
      :label="t('admin.featureToggles.featureDescription', 'Beschreibung')"
      rows="3"
    />
    <BaseSelect
      v-model="formData.category"
      :options="categoryOptions"
      :label="t('admin.featureToggles.featureCategory', 'Kategorie')"
      :error="errors.category"
      allow-create
      required
    />
    <BaseMultiSelect
      v-model="formData.dependencies"
      :options="dependencyOptions"
      :label="t('admin.featureToggles.featureDependencies', 'Abhängigkeiten')"
      :help="
        t(
          'admin.featureToggles.dependenciesHelp',
          'Features, die aktiviert sein müssen, damit dieses Feature funktioniert',
        )
      "
    />
    <BaseToggle
      v-model="formData.locked"
      :label="
        t(
          'admin.featureToggles.featureLocked',
          'Gesperrt (kann nicht geändert werden)',
        )
      "
    />
    <BaseToggle
      v-model="formData.experimental"
      :label="
        t(
          'admin.featureToggles.featureExperimental',
          'Als experimentell kennzeichnen',
        )
      "
    />
    <BaseToggle
      v-model="formData.enabled"
      :label="t('admin.featureToggles.featureEnabled', 'Feature aktivieren')"
    />

    <div class="admin-feature-toggle-form__actions">
      <BaseButton secondary @click="cancel">
        {{ t("admin.featureToggles.cancel", "Abbrechen") }}
      </BaseButton>
      <BaseButton primary :disabled="!isValid" @click="save">
        {{
          isEditing
            ? t("admin.featureToggles.saveChanges", "Änderungen speichern")
            : t("admin.featureToggles.createFeature", "Feature erstellen")
        }}
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from "vue";
import { useI18n } from "vue-i18n";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseSelect from "@/components/base/BaseSelect.vue";
import BaseMultiSelect from "@/components/base/BaseMultiSelect.vue";
import BaseToggle from "@/components/base/BaseToggle.vue";
import BaseTextarea from "@/components/base/BaseTextarea.vue";
import type { FeatureToggle, FeatureCategory } from "@/types/featureToggles";

const { t } = useI18n({
  useScope: 'global',
  inheritLocale: true
});
console.log('[i18n] Component initialized with global scope and inheritance');

interface Props {
  feature?: FeatureToggle | null;
  categories: FeatureCategory[];
  dependencyOptions: { value: string; label: string }[];
  isNew: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  feature: null,
  isNew: true,
});

const emit = defineEmits<{
  (e: "save", feature: FeatureToggle): void;
  (e: "cancel"): void;
}>();

// Form state
const formData = reactive({
  name: "",
  key: "",
  description: "",
  category: "",
  dependencies: [] as string[],
  locked: false,
  experimental: false,
  enabled: false,
});

// Form validation
const errors = reactive({
  name: "",
  key: "",
  category: "",
});

// Computed properties
const isEditing = computed(() => !props.isNew);

const categoryOptions = computed(() => {
  return props.categories.map((cat) => ({ value: cat, label: cat }));
});

const isValid = computed(() => {
  // Reset validation errors
  errors.name = "";
  errors.key = "";
  errors.category = "";

  // Validate required fields
  if (!formData.name.trim()) {
    errors.name = t(
      "admin.featureToggles.validation.nameRequired",
      "Name ist erforderlich",
    );
    return false;
  }

  if (!formData.key.trim()) {
    errors.key = t(
      "admin.featureToggles.validation.keyRequired",
      "Key ist erforderlich",
    );
    return false;
  }

  if (!formData.category.trim()) {
    errors.category = t(
      "admin.featureToggles.validation.categoryRequired",
      "Kategorie ist erforderlich",
    );
    return false;
  }

  // Validate key format (alphanumeric and underscores only)
  const keyRegex = /^[a-zA-Z0-9_]+$/;
  if (!keyRegex.test(formData.key)) {
    errors.key = t(
      "admin.featureToggles.validation.keyFormat",
      "Key darf nur Buchstaben, Zahlen und Unterstriche enthalten",
    );
    return false;
  }

  return true;
});

// Methods
function initializeForm() {
  if (props.feature) {
    formData.name = props.feature.name;
    formData.key = props.feature.key;
    formData.description = props.feature.description || "";
    formData.category = props.feature.category;
    formData.dependencies = props.feature.dependencies || [];
    formData.locked = props.feature.locked || false;
    formData.experimental = props.feature.experimental || false;
    formData.enabled = props.feature.enabled;
  } else {
    // Default values for a new feature
    formData.name = "";
    formData.key = "";
    formData.description = "";
    formData.category = props.categories.length > 0 ? props.categories[0] : "";
    formData.dependencies = [];
    formData.locked = false;
    formData.experimental = false;
    formData.enabled = false;
  }
}

function save() {
  if (!isValid.value) return;

  const featureData: FeatureToggle = {
    name: formData.name.trim(),
    key: formData.key.trim(),
    description: formData.description.trim() || undefined,
    category: formData.category.trim(),
    dependencies: formData.dependencies.length
      ? formData.dependencies
      : undefined,
    locked: formData.locked || undefined,
    experimental: formData.experimental || undefined,
    enabled: formData.enabled,
  };

  emit("save", featureData);
}

function cancel() {
  emit("cancel");
}

// Initialize form data when component mounts or feature prop changes
watch(
  () => props.feature,
  () => {
    initializeForm();
  },
  { immediate: true },
);
</script>

<style lang="scss">
.admin-feature-toggle-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1rem;
  }
}
</style>
