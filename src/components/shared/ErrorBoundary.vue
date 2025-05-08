<template>
  <div class="error-boundary">
    <slot v-if="!hasError && !useFallback" />
    <slot v-else-if="hasError && !useFallback" name="error" :error="error" :retry="resetError" :report="reportErrorToService" />
    <slot v-else name="fallback" :error="error" :resetFallback="resetFallback" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onErrorCaptured, provide, watch, onMounted, onBeforeUnmount } from 'vue';
import { useFeatureTogglesStore } from '@/stores/featureToggles';
import { useLogger } from '@/composables/useLogger';

/**
 * Typen für die Fallback-Strategie
 */
export type FallbackStrategy = 'immediate' | 'threshold' | 'progressive' | 'manual';

/**
 * Schweregrade für Fehler
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Kategorien für Fehler
 */
export type ErrorCategory = 'render' | 'lifecycle' | 'api' | 'data' | 'network' | 'user' | 'unknown';

/**
 * Struktur für Fehler im ErrorBoundary
 */
export interface BoundaryError {
  /** Original-Fehler */
  originalError: Error;
  /** Nachricht des Fehlers */
  message: string;
  /** Stack-Trace, falls vorhanden */
  stack?: string;
  /** Komponente, in der der Fehler aufgetreten ist */
  component?: string;
  /** Kategorie des Fehlers */
  category: ErrorCategory;
  /** Schweregrad des Fehlers */
  severity: ErrorSeverity;
  /** Kontext-Informationen */
  context?: Record<string, any>;
  /** Zeitstempel des Auftretens */
  timestamp: Date;
  /** Hash zur Fehler-Deduplizierung */
  hash: string;
}

/**
 * Props für die ErrorBoundary-Komponente
 */
interface ErrorBoundaryProps {
  /** Feature-Flag, das diese Komponente steuert */
  featureFlag?: string;
  /** Maximale Anzahl von Wiederholungsversuchen */
  maxRetries?: number;
  /** Strategien für Fallback */
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
  /** Callback für Fehlerbehandlung */
  onError?: (error: BoundaryError) => void;
  /** Callback für Fallback-Aktivierung */
  onFallback?: (error: BoundaryError) => void;
  /** Ob Fehler geloggt werden sollen */
  logErrors?: boolean;
  /** Ob Fehler an externe Dienste gemeldet werden sollen */
  reportErrors?: boolean;
  /** Ob Fehler dedupliziert werden sollen */
  deduplicateErrors?: boolean;
}

// Props definieren mit Standardwerten
const props = withDefaults(defineProps<ErrorBoundaryProps>(), {
  maxRetries: 3,
  fallbackStrategy: 'threshold',
  retryInterval: 5000, // 5 Sekunden
  permanent: false,
  errorCategories: () => [],
  minSeverity: 'medium',
  errorThreshold: 3,
  logErrors: true,
  reportErrors: true,
  deduplicateErrors: true
});

// Emits definieren
const emit = defineEmits<{
  (e: 'error', error: BoundaryError): void;
  (e: 'fallback', error: BoundaryError): void;
  (e: 'retry', error: BoundaryError): void;
  (e: 'reset', success: boolean): void;
}>();

// Store und Logger
const featureToggles = useFeatureTogglesStore();
const logger = useLogger();

// Lokale Zustandsvariablen
const hasError = ref<boolean>(false);
const error = ref<BoundaryError | null>(null);
const errorCount = ref<number>(0);
const retryCount = ref<number>(0);
const retryTimerId = ref<number | null>(null);
const errorRegistry = reactive<Record<string, number>>({});

// UseFallback berechnen
const useFallback = computed(() => {
  // Bei manuellem Fallback den Store-Status verwenden
  if (props.featureFlag && featureToggles.isFallbackActive(props.featureFlag)) {
    return true;
  }

  // Wenn keine Fehler vorliegen, kein Fallback
  if (!hasError.value) {
    return false;
  }

  // Bei manueller Strategie nie automatisch Fallback verwenden
  if (props.fallbackStrategy === 'manual') {
    return false;
  }

  // Bei sofortigem Fallback direkt aktivieren
  if (props.fallbackStrategy === 'immediate') {
    return true;
  }

  // Bei Threshold-Strategie prüfen, ob Schwellwert überschritten wurde
  if (props.fallbackStrategy === 'threshold') {
    return errorCount.value >= props.errorThreshold;
  }

  // Bei progressiver Strategie basierend auf Retry-Anzahl entscheiden
  if (props.fallbackStrategy === 'progressive') {
    return retryCount.value >= props.maxRetries;
  }

  return false;
});

/**
 * Ermittelt den Schweregrad eines Fehlers
 * @param err Der zu bewertende Fehler
 * @returns Schweregrad des Fehlers
 */
function determineErrorSeverity(err: Error): ErrorSeverity {
  // Netzwerkfehler haben hohen Schweregrad
  if (err.message.includes('network') || err.message.includes('fetch') || 
      err.message.includes('ajax') || err.message.includes('xhr')) {
    return 'high';
  }

  // TypeError und ReferenceError sind meist kritisch
  if (err instanceof TypeError || err instanceof ReferenceError) {
    return 'high';
  }

  // Fehler mit "undefined" oder "null" sind meist kritisch
  if (err.message.includes('undefined') || err.message.includes('null')) {
    return 'high';
  }

  // Standard für andere Fehler
  return 'medium';
}

/**
 * Ermittelt die Kategorie eines Fehlers
 * @param err Der zu bewertende Fehler
 * @param info Zusätzliche Info zum Fehler
 * @returns Kategorie des Fehlers
 */
function determineErrorCategory(err: Error, info?: string): ErrorCategory {
  // Netzwerkfehler erkennen
  if (err.message.includes('network') || err.message.includes('fetch') || 
      err.message.includes('ajax') || err.message.includes('xhr')) {
    return 'network';
  }

  // Datenfehler erkennen
  if (err.message.includes('data') || err.message.includes('property') || 
      err.message.includes('object') || err instanceof TypeError) {
    return 'data';
  }

  // Rendering-Fehler erkennen
  if (info?.includes('render') || err.message.includes('render') || 
      err.message.includes('template') || err.message.includes('component')) {
    return 'render';
  }

  // Lifecycle-Fehler erkennen
  if (info?.includes('mount') || info?.includes('update') || 
      info?.includes('unmount') || info?.includes('hook')) {
    return 'lifecycle';
  }

  return 'unknown';
}

/**
 * Generiert einen Hash für einen Fehler zur Deduplizierung
 * @param err Der zu hashende Fehler
 * @returns Hash des Fehlers
 */
function generateErrorHash(err: Error): string {
  const hashInput = (err.name || 'Error') + ':' + err.message + ':' + 
    (err.stack?.split('\n')[1] || ''); // Erste Stack-Zeile nach Fehlermeldung
  
  // Simple Hash-Funktion
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Auf 32bit Integer konvertieren
  }
  return hash.toString(16);
}

/**
 * Erstellt ein strukturiertes Error-Objekt
 * @param err Original-Fehler
 * @param info Zusätzliche Informationen (z.B. von onErrorCaptured)
 * @param context Kontext-Informationen
 * @returns Strukturiertes Fehler-Objekt
 */
function createBoundaryError(err: Error, info?: string, context?: Record<string, any>): BoundaryError {
  const category = determineErrorCategory(err, info);
  const severity = determineErrorSeverity(err);
  const hash = generateErrorHash(err);
  
  const component = context?.instance?.$options?.name || 
                    context?.instance?.$.vnode?.type?.__name || 
                    'UnknownComponent';

  return {
    originalError: err,
    message: err.message,
    stack: err.stack,
    component,
    category,
    severity,
    context,
    timestamp: new Date(),
    hash
  };
}

/**
 * Prüft, ob ein Fehler zur Fallback-Aktivierung führen sollte
 * @param boundaryError Der zu prüfende Fehler
 * @returns Ob Fallback aktiviert werden soll
 */
function shouldTriggerFallback(boundaryError: BoundaryError): boolean {
  // Wenn Kategorie-Filter aktiv ist und Fehler nicht darin enthalten ist
  if (props.errorCategories.length > 0 && 
      !props.errorCategories.includes(boundaryError.category)) {
    return false;
  }

  // Wenn Schweregrad unter dem Minimum liegt
  const severityLevel = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
  if (severityLevel[boundaryError.severity] < severityLevel[props.minSeverity]) {
    return false;
  }

  // Bei sofortigem Fallback direkt aktivieren
  if (props.fallbackStrategy === 'immediate') {
    return true;
  }

  // Bei manueller Strategie nicht automatisch aktivieren
  if (props.fallbackStrategy === 'manual') {
    return false;
  }

  // Bei Threshold-Strategie prüfen, ob Schwellwert überschritten wurde
  if (props.fallbackStrategy === 'threshold') {
    return errorCount.value >= props.errorThreshold;
  }

  // Bei progressiver Strategie basierend auf Retry-Anzahl entscheiden
  if (props.fallbackStrategy === 'progressive') {
    return retryCount.value >= props.maxRetries;
  }

  return false;
}

/**
 * Startet einen Timer für automatische Wiederholungsversuche
 */
function scheduleRetry(): void {
  // Timer nur starten, wenn nicht permanent und Strategie nicht manuell
  if (props.permanent || props.fallbackStrategy === 'manual') {
    return;
  }

  // Bestehenden Timer löschen
  clearRetryTimer();

  // Neuen Timer erstellen
  retryTimerId.value = window.setTimeout(() => {
    resetError();
  }, props.retryInterval);
}

/**
 * Löscht den Timer für Wiederholungsversuche
 */
function clearRetryTimer(): void {
  if (retryTimerId.value !== null) {
    window.clearTimeout(retryTimerId.value);
    retryTimerId.value = null;
  }
}

/**
 * Setzt den Fehlerstatus zurück und versucht erneut
 */
function resetError(): void {
  // Retry-Zähler erhöhen
  retryCount.value++;

  // Fehler zurücksetzen
  hasError.value = false;
  
  // Event emittieren
  if (error.value) {
    emit('retry', error.value);
  }
  
  // Timer löschen
  clearRetryTimer();
}

/**
 * Setzt den Fallback-Status zurück
 */
function resetFallback(): void {
  // Fehler und Fehlerzähler zurücksetzen
  hasError.value = false;
  errorCount.value = 0;
  retryCount.value = 0;
  error.value = null;
  
  // Fallback im Store deaktivieren (wenn Feature Flag gesetzt)
  if (props.featureFlag) {
    featureToggles.setFallbackMode(props.featureFlag, false);
    featureToggles.clearFeatureErrors(props.featureFlag);
  }
  
  // Event emittieren
  emit('reset', true);
  
  // Timer löschen
  clearRetryTimer();
}

/**
 * Meldet einen Fehler an externe Dienste
 * @param boundaryError Der zu meldende Fehler
 */
function reportErrorToService(boundaryError: BoundaryError = error.value!): void {
  if (!props.reportErrors || !boundaryError) return;
  
  // An Feature-Toggle-Store melden, wenn Feature-Flag gesetzt
  if (props.featureFlag) {
    featureToggles.reportFeatureError(
      props.featureFlag,
      boundaryError.message,
      {
        stack: boundaryError.stack,
        component: boundaryError.component,
        category: boundaryError.category,
        severity: boundaryError.severity,
        context: boundaryError.context
      },
      // Fallback nur aktivieren, wenn die Strategie es erlaubt
      shouldTriggerFallback(boundaryError)
    );
  }
  
  // An externen Fehler-Tracking-Dienst melden (wenn verfügbar)
  if (window.errorTrackingService) {
    window.errorTrackingService.captureError(boundaryError.originalError, {
      tags: {
        component: boundaryError.component || 'unknown',
        category: boundaryError.category,
        severity: boundaryError.severity
      },
      extra: boundaryError.context
    });
  }
}

/**
 * Verarbeitet einen neuen Fehler
 * @param err Der aufgetretene Fehler
 * @param instance Die Komponenten-Instanz (vom onErrorCaptured-Hook)
 * @param info Zusätzliche Informationen (vom onErrorCaptured-Hook)
 */
function processError(err: Error, instance?: any, info?: string): void {
  // Strukturiertes Fehler-Objekt erstellen
  const boundaryError = createBoundaryError(err, info, { instance });
  
  // Fehler deduplizieren, wenn aktiviert
  if (props.deduplicateErrors) {
    // Hash des Fehlers ermitteln
    const errorHash = boundaryError.hash;
    
    // Prüfen, ob dieser Fehler bereits aufgetreten ist
    if (errorRegistry[errorHash]) {
      // Anzahl erhöhen
      errorRegistry[errorHash]++;
      
      // Bei zu vielen duplizierten Fehlern direkt Fallback aktivieren
      if (errorRegistry[errorHash] > props.maxRetries) {
        if (props.featureFlag) {
          featureToggles.setFallbackMode(props.featureFlag, true);
        }
        return;
      }
      
      // Nicht weiter verarbeiten, wenn bereits bekannt
      return;
    }
    
    // Neuen Fehler registrieren
    errorRegistry[errorHash] = 1;
  }
  
  // Fehlerzustand setzen
  hasError.value = true;
  error.value = boundaryError;
  errorCount.value++;
  
  // Fehler loggen, wenn aktiviert
  if (props.logErrors) {
    logger.error(
      `[ErrorBoundary] ${boundaryError.message}`,
      {
        component: boundaryError.component,
        category: boundaryError.category,
        severity: boundaryError.severity,
        stack: boundaryError.stack,
        context: boundaryError.context
      }
    );
  }
  
  // Fehler melden, wenn aktiviert
  if (props.reportErrors) {
    reportErrorToService(boundaryError);
  }
  
  // Event emittieren
  emit('error', boundaryError);
  
  // Wenn Fehler zu Fallback führen soll
  if (shouldTriggerFallback(boundaryError)) {
    // Wenn Feature-Flag gesetzt, im Store Fallback aktivieren
    if (props.featureFlag) {
      featureToggles.setFallbackMode(props.featureFlag, true);
    }
    
    // Event emittieren
    emit('fallback', boundaryError);
  } else {
    // Sonst Wiederholungsversuch planen
    scheduleRetry();
  }
}

// Fehler in der Komponente abfangen
onErrorCaptured((err, instance, info) => {
  processError(err, instance, info);
  
  // Fehler nicht weiter propagieren
  return false;
});

// Kontext für verschachtelte Komponenten bereitstellen
provide('errorBoundary', {
  hasError,
  error,
  useFallback,
  resetError,
  resetFallback,
  reportError: (err: Error) => processError(err)
});

// Bei Komponenten-Unmount Timer löschen
onBeforeUnmount(() => {
  clearRetryTimer();
});

// Public API nach außen verfügbar machen
defineExpose({
  hasError,
  error,
  useFallback,
  resetError,
  resetFallback,
  reportError: (err: Error) => processError(err)
});
</script>

<style scoped>
.error-boundary {
  display: contents;
}
</style>