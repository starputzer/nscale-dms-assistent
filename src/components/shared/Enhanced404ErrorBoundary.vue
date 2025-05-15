<template>
  <div class="enhanced-error-boundary">
    <!-- Normaler Content, wenn kein Fehler -->
    <slot v-if="!hasError && !is404Error" />
    
    <!-- Spezielle 404-Fehlerbehandlung -->
    <div v-else-if="is404Error" class="error-404-handler">
      <div class="error-404-content">
        <h1>404 - Seite nicht gefunden</h1>
        <p>{{ error404Message }}</p>
        
        <div class="error-404-actions">
          <Button @click="navigateToHome" type="primary">
            Zur Startseite
          </Button>
          <Button @click="navigateBack" v-if="canGoBack">
            Zurück
          </Button>
          <Button @click="attemptRecovery" type="secondary">
            Seite reparieren
          </Button>
        </div>

        <div class="error-404-diagnostics" v-if="showDiagnostics">
          <h3>Diagnose-Informationen</h3>
          <pre>{{ diagnosticsInfo }}</pre>
        </div>
      </div>
    </div>
    
    <!-- Standard-Fehlerbehandlung für andere Fehler -->
    <div v-else-if="hasError" class="error-boundary-fallback">
      <slot
        name="error"
        :error="error"
        :retry="resetError"
        :report="reportErrorToService"
      >
        <!-- Default Error Fallback -->
        <div class="default-error-fallback">
          <ErrorIcon size="large" />
          <h2>Ein Fehler ist aufgetreten</h2>
          <p>{{ error?.message }}</p>
          <Button @click="resetError">Erneut versuchen</Button>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onErrorCaptured, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useLogger } from '@/composables/useLogger';
import { domErrorDetector, type DomErrorDiagnostics } from '@/utils/domErrorDiagnostics';
import Button from '@/components/ui/base/Button.vue';
import ErrorIcon from '@/components/icons/ErrorIcon.vue';

interface Props {
  maxRetries?: number;
  enable404Recovery?: boolean;
  autoDetectInterval?: number;
  showDiagnostics?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  maxRetries: 3,
  enable404Recovery: true,
  autoDetectInterval: 3000,
  showDiagnostics: import.meta.env.DEV
});

const emit = defineEmits<{
  (e: '404-detected', diagnostics: DomErrorDiagnostics): void;
  (e: 'recovery-attempted', success: boolean): void;
  (e: 'error', error: Error): void;
}>();

const router = useRouter();
const route = useRoute();
const logger = useLogger();

// Zustandsvariablen
const hasError = ref(false);
const error = ref<Error | null>(null);
const is404Error = ref(false);
const error404Message = ref('Die angeforderte Seite konnte nicht gefunden werden.');
const retryCount = ref(0);
const diagnosticsInfo = ref<any>({});
const stopAutoDetection = ref<(() => void) | null>(null);

// Computed Properties
const canGoBack = computed(() => window.history.length > 1);

// DOM-Fehler-Erkennung
const checkFor404Error = () => {
  const diagnostics = domErrorDetector.detectErrorState();
  
  if (diagnostics.has404Page || diagnostics.errorMessage?.includes('404')) {
    is404Error.value = true;
    diagnosticsInfo.value = diagnostics;
    error404Message.value = diagnostics.errorMessage || error404Message.value;
    emit('404-detected', diagnostics);
    return true;
  }
  
  // Prüfe auch Route-Status
  if (route.name === 'NotFound' || route.path.includes('404')) {
    is404Error.value = true;
    return true;
  }
  
  return false;
};

// Navigation-Methoden
const navigateToHome = async () => {
  try {
    await router.push('/');
    resetError();
  } catch (err) {
    logger.error('Fehler bei Navigation zur Startseite:', err);
    window.location.href = '/';
  }
};

const navigateBack = () => {
  if (canGoBack.value) {
    router.back();
  } else {
    navigateToHome();
  }
};

// Wiederherstellungs-Logik
const attemptRecovery = async () => {
  try {
    logger.info('Starte 404-Wiederherstellung...');
    
    // 1. Cache leeren
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // 2. Service Worker deregistrieren
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    }
    
    // 3. Vue Router zurücksetzen
    try {
      // Versuche zur letzten funktionierenden Route
      const lastWorkingRoute = localStorage.getItem('lastWorkingRoute');
      if (lastWorkingRoute && lastWorkingRoute !== route.path) {
        await router.push(lastWorkingRoute);
      } else {
        await router.push('/');
      }
      
      emit('recovery-attempted', true);
      resetError();
    } catch (routerError) {
      logger.error('Router-Wiederherstellung fehlgeschlagen:', routerError);
      
      // Hard reload als letzter Ausweg
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    }
  } catch (err) {
    logger.error('Wiederherstellung fehlgeschlagen:', err);
    emit('recovery-attempted', false);
  }
};

// Fehler-Reset
const resetError = () => {
  hasError.value = false;
  error.value = null;
  is404Error.value = false;
  retryCount.value = 0;
  diagnosticsInfo.value = {};
};

// Error Handler
onErrorCaptured((err, instance, info) => {
  logger.error('ErrorBoundary hat Fehler gefangen:', err, info);
  
  hasError.value = true;
  error.value = err;
  
  // Prüfe auf 404-spezifische Fehler
  if (err.message.includes('404') || err.message.includes('not found')) {
    is404Error.value = true;
  }
  
  // Prüfe DOM auf 404-Seite
  checkFor404Error();
  
  emit('error', err);
  
  // Fehler nicht weiter propagieren
  return false;
});

// Lifecycle Hooks
onMounted(() => {
  // Speichere funktionierende Route
  if (route.path !== '/error' && !route.path.includes('404')) {
    localStorage.setItem('lastWorkingRoute', route.path);
  }
  
  // Starte Auto-Detection wenn aktiviert
  if (props.enable404Recovery) {
    stopAutoDetection.value = domErrorDetector.startAutoDetection(props.autoDetectInterval);
    
    // Lausche auf DOM-Fehler-Events
    const handleDomError = (event: CustomEvent) => {
      const diagnostics = event.detail as DomErrorDiagnostics;
      if (diagnostics.has404Page) {
        is404Error.value = true;
        diagnosticsInfo.value = diagnostics;
        emit('404-detected', diagnostics);
        
        // Auto-Recovery versuchen nach Verzögerung
        setTimeout(() => {
          if (retryCount.value < props.maxRetries) {
            retryCount.value++;
            attemptRecovery();
          }
        }, 2000);
      }
    };
    
    window.addEventListener('dom-error-detected', handleDomError as EventListener);
    
    // Cleanup
    onBeforeUnmount(() => {
      window.removeEventListener('dom-error-detected', handleDomError as EventListener);
    });
  }
  
  // Initiale Prüfung
  checkFor404Error();
});

onBeforeUnmount(() => {
  if (stopAutoDetection.value) {
    stopAutoDetection.value();
  }
});

// Route-Watcher für 404-Erkennung
watch(() => route.path, () => {
  checkFor404Error();
});

// Fehler-Reporting
const reportErrorToService = () => {
  if (error.value) {
    logger.error('Fehler wird gemeldet:', error.value);
    // Hier könnte die Integration mit einem Error-Tracking-Service erfolgen
  }
};

// Public API
defineExpose({
  hasError,
  is404Error,
  error,
  resetError,
  attemptRecovery,
  checkFor404Error
});
</script>

<style scoped>
.enhanced-error-boundary {
  display: contents;
}

.error-404-handler {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.error-404-content {
  max-width: 600px;
  padding: 2rem;
  text-align: center;
}

.error-404-content h1 {
  font-size: 3rem;
  color: var(--color-danger);
  margin-bottom: 1rem;
}

.error-404-content p {
  font-size: 1.2rem;
  color: var(--color-text-light);
  margin-bottom: 2rem;
}

.error-404-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
}

.error-404-diagnostics {
  margin-top: 2rem;
  padding: 1rem;
  background: var(--color-background-soft);
  border-radius: 8px;
  text-align: left;
}

.error-404-diagnostics h3 {
  margin-bottom: 0.5rem;
  color: var(--color-warning);
}

.error-404-diagnostics pre {
  font-size: 0.875rem;
  overflow-x: auto;
  white-space: pre-wrap;
}

.error-boundary-fallback {
  padding: 2rem;
  text-align: center;
}

.default-error-fallback {
  max-width: 500px;
  margin: 0 auto;
}

.default-error-fallback h2 {
  margin: 1rem 0;
  color: var(--color-danger);
}

.default-error-fallback p {
  margin-bottom: 1.5rem;
  color: var(--color-text-light);
}
</style>