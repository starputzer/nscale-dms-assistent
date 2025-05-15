<template>
  <div class="improved-error-boundary">
    <!-- Normaler Content -->
    <slot v-if="!hasError && !isRecovering" />
    
    <!-- Recovery in Progress -->
    <div v-else-if="isRecovering" class="recovery-overlay">
      <div class="recovery-content">
        <SpinnerIcon size="large" />
        <h2>Wiederherstellung läuft...</h2>
        <p>Versuch {{ recoveryAttempt }} von {{ maxRecoveryAttempts }}</p>
        <div class="recovery-steps">
          <div 
            v-for="step in recoverySteps" 
            :key="step.id"
            class="recovery-step"
            :class="{
              active: step.id === currentStep,
              completed: step.completed,
              failed: step.failed
            }"
          >
            <span class="step-icon">{{ getStepIcon(step) }}</span>
            <span class="step-label">{{ step.label }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 404 Error -->
    <div v-else-if="error404" class="error-404-view">
      <div class="error-404-container">
        <h1>404</h1>
        <h2>Seite nicht gefunden</h2>
        <p>{{ error404Message }}</p>
        
        <div class="error-actions">
          <Button @click="navigateHome" type="primary">
            Zur Startseite
          </Button>
          <Button @click="goBack" v-if="canGoBack">
            Zurück
          </Button>
          <Button @click="attemptRecovery" :loading="isRecovering">
            Automatische Reparatur
          </Button>
        </div>

        <div v-if="showDiagnostics" class="diagnostics-panel">
          <h3>Diagnostics</h3>
          <pre>{{ diagnosticsData }}</pre>
          <Button size="small" @click="copyDiagnostics">
            Diagnostics kopieren
          </Button>
        </div>
      </div>
    </div>
    
    <!-- Generic Error -->
    <div v-else-if="hasError" class="error-generic-view">
      <div class="error-container">
        <ErrorIcon size="large" />
        <h2>Ein Fehler ist aufgetreten</h2>
        <p>{{ errorMessage }}</p>
        
        <div class="error-details" v-if="showDetails">
          <pre>{{ errorStack }}</pre>
        </div>
        
        <div class="error-actions">
          <Button @click="retry" type="primary">
            Erneut versuchen
          </Button>
          <Button @click="reportError">
            Fehler melden
          </Button>
          <Button @click="toggleDetails" variant="text">
            {{ showDetails ? 'Details ausblenden' : 'Details anzeigen' }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onErrorCaptured, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useLogger } from '@/composables/useLogger';
import { useEnhancedRouteFallback } from '@/composables/useEnhancedRouteFallback';
import { routerService } from '@/services/router/RouterServiceFixed';
import { domErrorDetector } from '@/utils/domErrorDiagnostics';
import { selfHealingService } from '@/services/selfHealing/SelfHealingService';
import Button from '@/components/ui/base/Button.vue';
import ErrorIcon from '@/components/icons/ErrorIcon.vue';
import SpinnerIcon from '@/components/icons/SpinnerIcon.vue';

interface Props {
  maxRecoveryAttempts?: number;
  enableAutoRecovery?: boolean;
  showDiagnostics?: boolean;
  recoveryDelay?: number;
}

const props = withDefaults(defineProps<Props>(), {
  maxRecoveryAttempts: 3,
  enableAutoRecovery: true,
  showDiagnostics: import.meta.env.DEV,
  recoveryDelay: 2000
});

const emit = defineEmits<{
  (e: 'error', error: Error): void;
  (e: 'recovery-started'): void;
  (e: 'recovery-completed', success: boolean): void;
}>();

const router = useRouter();
const route = useRoute();
const logger = useLogger();

// State
const hasError = ref(false);
const error = ref<Error | null>(null);
const error404 = ref(false);
const error404Message = ref('Die angeforderte Seite konnte nicht gefunden werden.');
const isRecovering = ref(false);
const recoveryAttempt = ref(0);
const currentStep = ref<string>('');
const showDetails = ref(false);
const diagnosticsData = ref<any>({});

// Recovery Steps
const recoverySteps = ref([
  { id: 'detect', label: 'Fehler erkennen', completed: false, failed: false },
  { id: 'analyze', label: 'Problem analysieren', completed: false, failed: false },
  { id: 'repair', label: 'Reparatur durchführen', completed: false, failed: false },
  { id: 'validate', label: 'Validierung', completed: false, failed: false },
  { id: 'restore', label: 'Navigation wiederherstellen', completed: false, failed: false }
]);

// Enhanced Route Fallback - TEMPORÄR DEAKTIVIERT
// const { 
//   safeNavigate, 
//   checkRouteHealth,
//   getDiagnostics 
// } = useEnhancedRouteFallback({
//   enabled: true,
//   autoRepairEnabled: props.enableAutoRecovery

// Temporäre Ersatzfunktionen
const safeNavigate = async (path: string) => {
  try {
    await router.push(path);
    return { success: true };
  } catch (error) {
    logger.error('Navigation fehlgeschlagen', error);
    return { success: false, error };
  }
};

const checkRouteHealth = async () => {
  // Einfache Prüfung ob Route existiert
  const currentRoute = router.currentRoute.value;
  return currentRoute && !currentRoute.matched.length === 0;
};

const getDiagnostics = () => {
  return {
    routerStatus: 'operational',
    errorCount: 0
  };
};

// Computed
const canGoBack = computed(() => window.history.length > 1);
const errorMessage = computed(() => error.value?.message || 'Ein unbekannter Fehler ist aufgetreten');
const errorStack = computed(() => error.value?.stack || '');

// Methods
const getStepIcon = (step: any) => {
  if (step.completed) return '✓';
  if (step.failed) return '✗';
  if (step.id === currentStep.value) return '⟳';
  return '○';
};

const detect404Error = () => {
  const diagnostics = domErrorDetector.detectErrorState();
  
  if (diagnostics.has404Page) {
    error404.value = true;
    error404Message.value = diagnostics.errorMessage || error404Message.value;
    diagnosticsData.value = diagnostics;
    return true;
  }

  // Prüfe Route
  if (route.name === 'NotFound' || route.path.includes('404')) {
    error404.value = true;
    return true;
  }

  // Prüfe Error-Message
  if (error.value?.message.includes('404') || error.value?.message.includes('not found')) {
    error404.value = true;
    return true;
  }

  return false;
};

const attemptRecovery = async () => {
  if (isRecovering.value || recoveryAttempt.value >= props.maxRecoveryAttempts) {
    return;
  }

  isRecovering.value = true;
  recoveryAttempt.value++;
  emit('recovery-started');

  try {
    // Reset steps
    recoverySteps.value.forEach(step => {
      step.completed = false;
      step.failed = false;
    });

    // Step 1: Detect
    await executeRecoveryStep('detect', async () => {
      diagnosticsData.value = getDiagnostics();
      detect404Error();
    });

    // Step 2: Analyze
    await executeRecoveryStep('analyze', async () => {
      // Analysiere das Problem
      const routerState = routerService.getState();
      if (!routerState.isInitialized) {
        throw new Error('Router nicht initialisiert');
      }
    });

    // Step 3: Repair
    await executeRecoveryStep('repair', async () => {
      // DOM-Bereinigung
      const errorElements = document.querySelectorAll('.error-view, .error-404');
      errorElements.forEach(el => el.remove());

      // Self-Healing aktivieren
      const healingResult = await selfHealingService.heal();
      if (!healingResult.success) {
        throw new Error('Self-Healing fehlgeschlagen');
      }
    });

    // Step 4: Validate
    await executeRecoveryStep('validate', async () => {
      await checkRouteHealth();
    });

    // Step 5: Restore Navigation
    await executeRecoveryStep('restore', async () => {
      const result = await routerService.navigateToHome();
      if (!result.success) {
        throw new Error('Navigation konnte nicht wiederhergestellt werden');
      }
    });

    // Erfolg
    emit('recovery-completed', true);
    resetError();
  } catch (error) {
    logger.error('Recovery fehlgeschlagen', error);
    
    if (recoveryAttempt.value < props.maxRecoveryAttempts) {
      // Nächster Versuch nach Verzögerung
      setTimeout(() => {
        attemptRecovery();
      }, props.recoveryDelay);
    } else {
      // Maximale Versuche erreicht
      emit('recovery-completed', false);
      isRecovering.value = false;
    }
  }
};

const executeRecoveryStep = async (stepId: string, action: () => Promise<void>) => {
  currentStep.value = stepId;
  const step = recoverySteps.value.find(s => s.id === stepId);
  
  if (!step) return;

  try {
    await action();
    step.completed = true;
  } catch (error) {
    step.failed = true;
    throw error;
  }
};

const navigateHome = () => {
  safeNavigate('/');
};

const goBack = () => {
  if (canGoBack.value) {
    router.back();
  } else {
    navigateHome();
  }
};

const retry = () => {
  resetError();
  router.go(0); // Seite neu laden
};

const reportError = () => {
  // Error Reporting implementieren
  const report = {
    error: error.value,
    diagnostics: diagnosticsData.value,
    route: route.fullPath,
    timestamp: new Date().toISOString()
  };
  
  logger.error('Error Report', report);
  // Hier könnte eine API-Anfrage erfolgen
};

const toggleDetails = () => {
  showDetails.value = !showDetails.value;
};

const copyDiagnostics = () => {
  const text = JSON.stringify(diagnosticsData.value, null, 2);
  navigator.clipboard.writeText(text);
};

const resetError = () => {
  hasError.value = false;
  error.value = null;
  error404.value = false;
  isRecovering.value = false;
  recoveryAttempt.value = 0;
  currentStep.value = '';
};

// Error Capturing
onErrorCaptured((err, instance, info) => {
  logger.error('ErrorBoundary captured error', { err, info });
  
  hasError.value = true;
  error.value = err;
  
  // 404-Erkennung
  detect404Error();
  
  // Auto-Recovery
  if (props.enableAutoRecovery) {
    setTimeout(() => {
      attemptRecovery();
    }, 1000);
  }
  
  emit('error', err);
  
  return false; // Fehler nicht weiter propagieren
});

// Lifecycle
onMounted(() => {
  // Initial check
  detect404Error();
  
  // DOM Error Detection
  const stopDetection = domErrorDetector.startAutoDetection(3000);
  
  onBeforeUnmount(() => {
    stopDetection();
  });
});

// Route watching
watch(() => route.path, () => {
  if (hasError.value) {
    detect404Error();
  }
});
</script>

<style scoped>
.improved-error-boundary {
  position: relative;
  min-height: 100vh;
}

.recovery-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.recovery-content {
  text-align: center;
  max-width: 500px;
  padding: 2rem;
}

.recovery-content h2 {
  margin: 1rem 0;
  color: var(--color-primary);
}

.recovery-steps {
  margin: 2rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.recovery-step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.3s;
}

.recovery-step.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.recovery-step.completed {
  color: var(--color-success);
}

.recovery-step.failed {
  color: var(--color-danger);
}

.error-404-view,
.error-generic-view {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
}

.error-404-container,
.error-container {
  text-align: center;
  max-width: 600px;
  padding: 2rem;
}

.error-404-container h1 {
  font-size: 6rem;
  margin: 0;
  color: var(--color-danger);
}

.error-actions {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.diagnostics-panel {
  margin-top: 2rem;
  padding: 1rem;
  background: var(--color-background-soft);
  border-radius: 8px;
  text-align: left;
}

.diagnostics-panel pre {
  font-size: 0.875rem;
  overflow-x: auto;
  max-height: 200px;
}

.error-details {
  margin: 1rem 0;
  padding: 1rem;
  background: var(--color-background-soft);
  border-radius: 4px;
  text-align: left;
  overflow-x: auto;
}

.error-details pre {
  font-size: 0.75rem;
  white-space: pre-wrap;
  word-break: break-all;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .recovery-overlay {
    background: rgba(0, 0, 0, 0.95);
  }
  
  .recovery-overlay,
  .error-404-view,
  .error-generic-view {
    color: var(--color-text-dark);
  }
}
</style>