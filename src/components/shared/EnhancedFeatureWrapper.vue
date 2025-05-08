<template>
  <ErrorBoundary
    :feature-flag="feature"
    :max-retries="maxRetries"
    :fallback-strategy="fallbackStrategy"
    :retry-interval="retryInterval"
    :permanent="permanent"
    :error-categories="errorCategories"
    :min-severity="minSeverity"
    :error-threshold="errorThreshold"
    :log-errors="logErrors"
    :report-errors="reportErrors"
    :deduplicate-errors="deduplicateErrors"
    @error="handleError"
    @fallback="handleFallback"
    @retry="handleRetry"
    @reset="handleReset"
  >
    <!-- Neue Komponente (Standard-Slot) -->
    <component 
      v-if="!useIntermediateComponent"
      :is="newComponent" 
      v-bind="$attrs"
    >
      <template v-for="(_, slot) in $slots" v-slot:[slot]="slotProps">
        <slot :name="slot" v-bind="slotProps" />
      </template>
    </component>
    
    <!-- Intermediäre Komponente (falls vorhanden und aktiviert) -->
    <component 
      v-else-if="intermediateComponent"
      :is="intermediateComponent" 
      v-bind="$attrs"
    >
      <template v-for="(_, slot) in $slots" v-slot:[slot]="slotProps">
        <slot :name="slot" v-bind="slotProps" />
      </template>
    </component>
    
    <!-- Fehlerzustand (Slot "error") -->
    <template #error="{ error, retry, report }">
      <slot 
        name="error" 
        :error="error" 
        :retry="retry" 
        :report="report"
      >
        <!-- Standard-Fehlerdarstellung, wenn kein Error-Slot bereitgestellt wurde -->
        <div v-if="showErrorUI" class="feature-error">
          <div class="feature-error-header">
            <h3>{{ $t('featureWrapper.errorTitle', 'Fehler aufgetreten') }}</h3>
            <div class="feature-error-actions">
              <button 
                class="feature-error-retry" 
                @click="retry"
              >
                {{ $t('featureWrapper.retry', 'Erneut versuchen') }}
              </button>
              <button 
                v-if="!isGlobalFallbackActive"
                class="feature-error-fallback" 
                @click="activateGlobalFallback"
              >
                {{ $t('featureWrapper.useFallback', 'Fallback verwenden') }}
              </button>
            </div>
          </div>
          <div class="feature-error-details">
            <p class="feature-error-message">{{ error.message }}</p>
            <div v-if="showDebugInfo" class="feature-error-debug">
              <pre>{{ error.stack }}</pre>
              <button 
                class="feature-error-report" 
                @click="report"
              >
                {{ $t('featureWrapper.reportError', 'Fehler melden') }}
              </button>
            </div>
          </div>
        </div>
        <!-- Minimale Fehleranzeige, wenn showErrorUI=false -->
        <div v-else class="feature-error-minimal">
          <button 
            class="feature-error-retry-minimal" 
            @click="retry"
          >
            {{ $t('featureWrapper.retry', 'Erneut versuchen') }}
          </button>
        </div>
      </slot>
    </template>
    
    <!-- Fallback (Slot "fallback") -->
    <template #fallback="{ error, resetFallback }">
      <slot name="fallback" :error="error" :reset-fallback="resetFallback">
        <component 
          :is="legacyComponent" 
          v-bind="$attrs"
        >
          <template v-for="(_, slot) in $slots" v-slot:[slot]="slotProps">
            <slot :name="slot" v-bind="slotProps" />
          </template>
        </component>
        
        <!-- Admin-Reset-Kontrolle, wenn showAdminControls aktiviert ist -->
        <div v-if="showAdminControls" class="feature-admin-controls">
          <button 
            class="feature-reset-fallback" 
            @click="resetFallback"
          >
            {{ $t('featureWrapper.resetFallback', 'Fallback zurücksetzen') }}
          </button>
          <span class="feature-admin-info">
            {{ $t('featureWrapper.adminInfo', 'Admin: Feature zurückgesetzt zu normaler Ansicht') }}
          </span>
        </div>
      </slot>
    </template>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, getCurrentInstance, inject } from 'vue';
import { useFeatureToggles } from '@/composables/useFeatureToggles';
import { useLogger } from '@/composables/useLogger';
import ErrorBoundary, { 
  type FallbackStrategy, 
  type ErrorSeverity, 
  type ErrorCategory,
  type BoundaryError
} from '@/components/shared/ErrorBoundary.vue';

/**
 * Definiert die Props für den EnhancedFeatureWrapper
 */
interface EnhancedFeatureWrapperProps {
  /** Name des Feature-Flags (z.B. 'useSfcDocConverter') */
  feature: string;
  /** Die neue SFC-Komponente bei aktiviertem Feature */
  newComponent: object;
  /** Die Legacy-Komponente als Fallback */
  legacyComponent: object;
  /** Optionale intermediäre Komponente für progressive Fallbacks */
  intermediateComponent?: object;
  /** Maximale Anzahl von Wiederholungsversuchen */
  maxRetries?: number;
  /** Strategie für Fallback-Aktivierung */
  fallbackStrategy?: FallbackStrategy;
  /** Zeitintervall für automatische Wiederholungsversuche (in ms) */
  retryInterval?: number;
  /** Ob der Fallback permanent sein soll (kein auto-recovery) */
  permanent?: boolean;
  /** Fehlertypen, die abgefangen werden sollen (leeres Array = alle) */
  errorCategories?: ErrorCategory[];
  /** Minimaler Schweregrad für Fallback-Aktivierung */
  minSeverity?: ErrorSeverity;
  /** Schwellwert für Fehleranzahl vor Fallback */
  errorThreshold?: number;
  /** Ob Fehler geloggt werden sollen */
  logErrors?: boolean;
  /** Ob Fehler an externe Dienste gemeldet werden sollen */
  reportErrors?: boolean;
  /** Ob Fehler dedupliziert werden sollen */
  deduplicateErrors?: boolean;
  /** Ob die intermediäre Komponente verwendet werden soll bei Fehlern unterhalb des Schwellwerts */
  useIntermediateFailover?: boolean;
  /** Ob Fehler-UI angezeigt werden soll */
  showErrorUI?: boolean;
  /** Ob Debug-Informationen angezeigt werden sollen */
  showDebugInfo?: boolean;
  /** Ob Admin-Kontrollen angezeigt werden sollen */
  showAdminControls?: boolean;
}

// Props-Definition mit Standardwerten
const props = withDefaults(defineProps<EnhancedFeatureWrapperProps>(), {
  maxRetries: 3,
  fallbackStrategy: 'threshold',
  retryInterval: 5000, // 5 Sekunden
  permanent: false,
  errorCategories: () => [],
  minSeverity: 'medium',
  errorThreshold: 3,
  logErrors: true,
  reportErrors: true,
  deduplicateErrors: true,
  useIntermediateFailover: false,
  showErrorUI: true,
  showDebugInfo: process.env.NODE_ENV !== 'production',
  showAdminControls: false
});

// Definieren der Emits
const emit = defineEmits<{
  (e: 'feature-error', error: BoundaryError, feature: string): void;
  (e: 'feature-fallback', error: BoundaryError, feature: string): void;
  (e: 'feature-retry', error: BoundaryError, feature: string, attempt: number): void;
  (e: 'feature-reset', feature: string, success: boolean): void;
  (e: 'component-mounted', feature: string, stage: 'new' | 'intermediate' | 'legacy'): void;
}>();

// Feature-Toggles und Logger verwenden
const featureToggles = useFeatureToggles();
const logger = useLogger();

// Status zum Tracking, ob der globale Fallback aktiv ist
const isGlobalFallbackActive = computed(() => 
  featureToggles.isFallbackActive(props.feature)
);

// Aktueller Benutzer und Berechtigungen
const userInfo = inject('userInfo', { role: 'user', isAdmin: false });

// Versucht, den globalen Fallback zu aktivieren
function activateGlobalFallback(): void {
  featureToggles.activateFallback(props.feature);
  
  logger.info(`[FeatureWrapper] Globaler Fallback für ${props.feature} manuell aktiviert`, {
    user: userInfo.role,
    feature: props.feature
  });
}

// Handler für ErrorBoundary-Events
function handleError(error: BoundaryError): void {
  logger.error(`[FeatureWrapper] Fehler in ${props.feature}`, {
    feature: props.feature,
    error: error.message,
    severity: error.severity,
    category: error.category
  });
  
  emit('feature-error', error, props.feature);
}

function handleFallback(error: BoundaryError): void {
  logger.warn(`[FeatureWrapper] Fallback für ${props.feature} aktiviert`, {
    feature: props.feature,
    error: error.message,
    severity: error.severity,
    category: error.category
  });
  
  emit('feature-fallback', error, props.feature);
}

function handleRetry(error: BoundaryError): void {
  logger.info(`[FeatureWrapper] Wiederholungsversuch für ${props.feature}`, {
    feature: props.feature,
    error: error.message
  });
  
  // Aktuelle Anzahl der Versuche ermitteln
  const currentRetries = error.context?.retryCount || 1;
  
  emit('feature-retry', error, props.feature, currentRetries);
}

function handleReset(success: boolean): void {
  logger.info(`[FeatureWrapper] Fallback für ${props.feature} zurückgesetzt`, {
    feature: props.feature,
    success
  });
  
  emit('feature-reset', props.feature, success);
}

// Bei Komponentenmountierung Erfolg melden
onMounted(() => {
  // Bestimmen, welche Komponente verwendet wird
  let stage: 'new' | 'intermediate' | 'legacy';
  
  if (featureToggles.isFallbackActive(props.feature) || 
      !featureToggles.shouldUseFeature(props.feature)) {
    stage = 'legacy';
  } else if (props.useIntermediateFailover && props.intermediateComponent) {
    stage = 'intermediate';
  } else {
    stage = 'new';
  }
  
  // Status emittieren
  emit('component-mounted', props.feature, stage);
  
  // Loggen
  logger.debug(`[FeatureWrapper] Komponente für ${props.feature} gemountet`, {
    feature: props.feature,
    stage
  });
});

// Übersetzungsfunktion
function $t(key: string, fallback: string): string {
  // Fallback für i18n
  const i18n = inject('i18n', null);
  if (i18n && typeof i18n.t === 'function') {
    return i18n.t(key);
  }
  return fallback;
}
</script>

<style scoped>
/* Base styles for error UI */
.feature-error {
  background-color: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 6px;
  padding: 1rem;
  margin: 1rem 0;
  color: #b91c1c;
}

.feature-error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.feature-error-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.feature-error-actions {
  display: flex;
  gap: 0.5rem;
}

.feature-error-retry,
.feature-error-fallback {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 0.25rem;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.feature-error-retry {
  background-color: #fee2e2;
  color: #b91c1c;
}

.feature-error-retry:hover {
  background-color: #fecaca;
}

.feature-error-fallback {
  background-color: #e5e7eb;
  color: #374151;
}

.feature-error-fallback:hover {
  background-color: #d1d5db;
}

.feature-error-message {
  margin: 0 0 0.75rem;
}

.feature-error-debug {
  margin-top: 0.75rem;
  padding: 0.5rem;
  background-color: #f9fafb;
  border-radius: 0.25rem;
  border: 1px solid #e5e7eb;
  font-family: monospace;
  font-size: 0.75rem;
  white-space: pre-wrap;
  overflow-x: auto;
  max-height: 15rem;
  overflow-y: auto;
}

.feature-error-report {
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background-color: #e5e7eb;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.feature-error-report:hover {
  background-color: #d1d5db;
}

/* Minimal error UI */
.feature-error-minimal {
  display: inline-block;
  margin: 0.5rem 0;
}

.feature-error-retry-minimal {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background-color: #fee2e2;
  color: #b91c1c;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.feature-error-retry-minimal:hover {
  background-color: #fecaca;
}

/* Admin controls */
.feature-admin-controls {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  background-color: #e0f2fe;
  border: 1px solid #bae6fd;
  border-radius: 0.25rem;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  z-index: 100;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.feature-reset-fallback {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background-color: #0ea5e9;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.feature-reset-fallback:hover {
  background-color: #0284c7;
}

.feature-admin-info {
  font-size: 0.75rem;
  color: #0369a1;
}

@media (max-width: 640px) {
  .feature-error-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .feature-admin-controls {
    left: 1rem;
    right: 1rem;
    flex-direction: column;
  }
}
</style>