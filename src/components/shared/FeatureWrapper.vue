<template>
  <component 
    :is="componentToRender" 
    v-bind="$attrs"
    v-on="$listeners"
  >
    <template v-for="(_, slot) in $slots" v-slot:[slot]="slotProps">
      <slot :name="slot" v-bind="slotProps" />
    </template>
  </component>
</template>

<script setup lang="ts">
import { computed, ref, onErrorCaptured, onMounted, getCurrentInstance } from 'vue';
import { useFeatureToggles } from '@/composables/useFeatureToggles';

/**
 * Definiert die Props für den FeatureWrapper
 */
interface FeatureWrapperProps {
  /** Name des Feature-Flags (z.B. 'useSfcDocConverter') */
  feature: string;
  /** Die neue SFC-Komponente bei aktiviertem Feature */
  newComponent: object;
  /** Die Legacy-Komponente als Fallback */
  legacyComponent: object;
  /** Gibt an, ob Fehler automatisch erfasst werden sollen */
  captureErrors?: boolean;
  /** Gibt an, ob bei Fehlern automatisch auf Legacy zurückgefallen werden soll */
  autoFallback?: boolean;
}

// Props-Definition
const props = withDefaults(defineProps<FeatureWrapperProps>(), {
  captureErrors: true,
  autoFallback: true
});

// Definieren der Emits
const emit = defineEmits<{
  (e: 'feature-error', error: Error, feature: string): void;
  (e: 'feature-fallback', feature: string): void;
  (e: 'component-mounted', feature: string, isNew: boolean): void;
}>();

// Feature-Toggles verwenden
const featureToggles = useFeatureToggles({
  autoFallback: props.autoFallback
});

// Lokaler Fehlerstatus
const hasError = ref(false);
const errorDetails = ref<Error | null>(null);
const isLocalFallbackActive = ref(false);

/**
 * Berechnet die anzuzeigende Komponente basierend auf Feature-Status und Fehlern
 */
const componentToRender = computed(() => {
  // Fallback bei lokalen Fehlern oder wenn das Feature deaktiviert ist
  if (
    hasError.value || 
    isLocalFallbackActive.value || 
    featureToggles.isFallbackActive(props.feature) || 
    !featureToggles.shouldUseFeature(props.feature)
  ) {
    return props.legacyComponent;
  }
  
  return props.newComponent;
});

/**
 * Erfasst Fehler in der neuen Komponente und aktiviert ggf. den Fallback
 */
onErrorCaptured((error, instance, info) => {
  // Nur Fehler in aktivierter neuen Komponente erfassen
  if (!props.captureErrors || !featureToggles.shouldUseFeature(props.feature)) {
    return false;
  }
  
  console.error(`Fehler in Feature-Komponente ${props.feature}:`, error);
  
  // Fehlerstatus setzen
  hasError.value = true;
  errorDetails.value = error instanceof Error ? error : new Error(String(error));
  
  // Event auslösen
  emit('feature-error', errorDetails.value, props.feature);
  
  // Fehler im Feature-Toggle-System erfassen
  featureToggles.reportError(
    props.feature,
    `Fehler in Feature-Komponente: ${error instanceof Error ? error.message : String(error)}`,
    { error, info, instance }
  );
  
  // Lokalen Fallback aktivieren, wenn gewünscht
  if (props.autoFallback) {
    isLocalFallbackActive.value = true;
    emit('feature-fallback', props.feature);
  }
  
  // Fehler abfangen, um Absturz zu vermeiden
  return true;
});

/**
 * Bei Komponentenmountierung Erfolg melden
 */
onMounted(() => {
  // Melden, welche Komponente verwendet wird
  emit('component-mounted', props.feature, componentToRender.value === props.newComponent);
});
</script>

<script lang="ts">
// Optionale Options-API für Vue 2-Kompatibilität der Slots
export default {
  name: 'FeatureWrapper',
  inheritAttrs: false,
}
</script>