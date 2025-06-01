<template>
  <div class="admin-doc-converter">
    <h2>{{ t("admin.docConverter.title", "Dokumentenkonverter") }}</h2>

    <div class="section-header">
      <p>
        {{
          t(
            "admin.docConverter.description",
            "Konfiguration und Überwachung des Dokumentenkonverters.",
          )
        }}
      </p>
    </div>

    <div class="doc-converter-integration">
      <DocConverterContainer />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import DocConverterContainer from "../document-converter/DocConverterContainer.vue";

// i18n
const { t } = useI18n();

// Component state
const isLoading = ref(false);

// Lifecycle hooks
onMounted(() => {
  // Initialisierungscode hier
});
</script>

<style scoped>
.admin-doc-converter {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: var(--n-color-text-primary);
}

.section-header {
  margin-bottom: 1rem;
}

.section-header p {
  color: var(--n-color-text-secondary);
  margin-bottom: 1rem;
}

.doc-converter-integration {
  border-radius: var(--n-border-radius);
  overflow: hidden;
}
</style>
