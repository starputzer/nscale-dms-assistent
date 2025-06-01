<template>
  <div class="advanced-404-container">
    <div class="error-content">
      <div class="error-header">
        <h1 class="error-code">404</h1>
        <h2 class="error-title">Seite nicht gefunden</h2>
        <p class="error-description">
          Die angeforderte Seite konnte nicht gefunden werden.
          <span v-if="diagnostics.isRecurring" class="recurring-indicator">
            (Wiederkehrender Fehler erkannt)
          </span>
        </p>
      </div>

      <!-- Router Status Visualization -->
      <div class="router-status">
        <h3>Router-Status</h3>
        <div class="status-grid">
          <div
            class="status-item"
            :class="{ ok: healthMetrics.initStatus === 'ready' }"
          >
            <span class="status-label">Initialisiert</span>
            <span class="status-value">{{ healthMetrics.initStatus }}</span>
          </div>
          <div
            class="status-item"
            :class="{ ok: healthMetrics.currentRouteAvailable }"
          >
            <span class="status-label">Current Route</span>
            <span class="status-value">{{
              healthMetrics.currentRouteAvailable
                ? "Verfügbar"
                : "Nicht verfügbar"
            }}</span>
          </div>
          <div class="status-item" :class="{ ok: healthMetrics.piniaReady }">
            <span class="status-label">Store-System</span>
            <span class="status-value">{{
              healthMetrics.piniaReady ? "Bereit" : "Nicht bereit"
            }}</span>
          </div>
          <div
            class="status-item"
            :class="{ ok: healthMetrics.errorCount === 0 }"
          >
            <span class="status-label">Fehler</span>
            <span class="status-value">{{ healthMetrics.errorCount }}</span>
          </div>
        </div>
      </div>

      <!-- Recovery Options -->
      <div class="recovery-section">
        <h3>Recovery-Optionen</h3>

        <div v-if="activeRecovery" class="recovery-progress">
          <p>Recovery läuft: {{ activeRecovery.name }}</p>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${recoveryProgress}%` }"
            ></div>
          </div>
        </div>

        <div v-else class="recovery-actions">
          <button
            v-for="option in recoveryOptions"
            :key="option.action"
            @click="executeRecovery(option.action)"
            :disabled="isRecovering"
            class="recovery-button"
          >
            <span class="recovery-icon">{{ option.icon }}</span>
            <span class="recovery-text">
              <strong>{{ option.title }}</strong>
              <small>{{ option.description }}</small>
            </span>
          </button>
        </div>
      </div>

      <!-- Manual Navigation -->
      <div class="manual-navigation">
        <h3>Manuelle Navigation</h3>
        <div class="nav-options">
          <button @click="navigateTo('/')" class="nav-button">
            <span class="nav-icon">🏠</span>
            Zur Startseite
          </button>
          <button @click="navigateTo('/chat')" class="nav-button">
            <span class="nav-icon">💬</span>
            Zum Chat
          </button>
          <button @click="navigateTo('/documents')" class="nav-button">
            <span class="nav-icon">📄</span>
            Zu Dokumenten
          </button>
        </div>
      </div>

      <!-- Session Recovery -->
      <div v-if="isInChatRoute" class="session-recovery">
        <h3>Session-Wiederherstellung</h3>
        <p>
          Sie befanden sich in einer Chat-Session. Möchten Sie diese
          wiederherstellen?
        </p>
        <button @click="recoverSession" class="session-recover-button">
          Session wiederherstellen
        </button>
      </div>

      <!-- Debug Information -->
      <div v-if="showDebugInfo" class="debug-info">
        <h3>Debug-Informationen</h3>
        <pre>{{ debugData }}</pre>
      </div>
    </div>

    <!-- Floating Help Button -->
    <button @click="toggleDebugInfo" class="debug-toggle">
      <span v-if="!showDebugInfo">🐛</span>
      <span v-else>✕</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { unifiedDiagnosticsService } from "@/services/diagnostics/UnifiedDiagnosticsServiceFixed";
import { selfHealingService } from "@/services/selfHealing/SelfHealingService";
import { routerService } from "@/services/router/RouterServiceFixed";
import { useLogger } from "@/composables/useLogger";
import { useToast } from "@/composables/useToast";
import type { RecoveryOption } from "@/types/recovery";

const router = useRouter();
const route = useRoute();
const logger = useLogger();
const toast = useToast();

// State
const showDebugInfo = ref(false);
const isRecovering = ref(false);
const recoveryProgress = ref(0);
const activeRecovery = ref<any>(null);
const sessionId = ref<string | null>(null);

// Diagnostics data
const healthMetrics = unifiedDiagnosticsService.getHealthMetrics();
const diagnosticsHistory = unifiedDiagnosticsService.getDiagnosticsHistory();

// Computed
const isInChatRoute = computed(() => {
  return route.path.startsWith("/chat") || route.path.startsWith("/session");
});

const diagnostics = computed(() => {
  const recent = diagnosticsHistory.value.slice(-10);
  const recurring404s = recent.filter((r) => r.router404.has404Issues).length;

  return {
    isRecurring: recurring404s > 3,
    errorCount: recent.reduce((sum, r) => sum + r.router404.errorCount, 0),
    lastError: recent[recent.length - 1]?.healthMetrics.lastError,
  };
});

const recoveryOptions = computed((): RecoveryOption[] => {
  const options: RecoveryOption[] = [
    {
      title: "Soft Reset",
      description: "Router-State zurücksetzen",
      action: "soft_reset",
      icon: "🔄",
    },
    {
      title: "Hard Reset",
      description: "Voller Neustart der Anwendung",
      action: "hard_reset",
      icon: "🔁",
    },
    {
      title: "Cache leeren",
      description: "Browser-Cache leeren und neu laden",
      action: "clear_cache",
      icon: "🧹",
    },
  ];

  if (diagnostics.value.isRecurring) {
    options.unshift({
      title: "Smart Recovery",
      description: "Automatische Fehlerbehebung basierend auf Diagnose",
      action: "smart_recovery",
      icon: "🤖",
    });
  }

  return options;
});

const debugData = computed(() => {
  return {
    route: {
      path: route.path,
      name: route.name,
      params: route.params,
      query: route.query,
    },
    healthMetrics: healthMetrics.value,
    diagnostics: diagnostics.value,
    activeRecoveries: unifiedDiagnosticsService.getActiveRecoveries().value,
  };
});

// Methods
const toggleDebugInfo = () => {
  showDebugInfo.value = !showDebugInfo.value;
};

const executeRecovery = async (action: string) => {
  isRecovering.value = true;
  recoveryProgress.value = 0;

  try {
    switch (action) {
      case "soft_reset":
        await performSoftReset();
        break;
      case "hard_reset":
        await performHardReset();
        break;
      case "clear_cache":
        await performCacheClear();
        break;
      case "smart_recovery":
        await performSmartRecovery();
        break;
    }

    toast.success("Recovery erfolgreich abgeschlossen");
  } catch (error) {
    logger.error("Recovery fehlgeschlagen:", error);
    toast.error("Recovery fehlgeschlagen. Bitte versuchen Sie es erneut.");
  } finally {
    isRecovering.value = false;
    recoveryProgress.value = 0;
    activeRecovery.value = null;
  }
};

const performSoftReset = async () => {
  activeRecovery.value = { name: "Soft Reset" };

  // Schritt 1: Router State zurücksetzen
  recoveryProgress.value = 33;
  await routerService.reset();

  // Schritt 2: Navigation Queue leeren
  recoveryProgress.value = 66;
  routerService.clearNavigationQueue();

  // Schritt 3: Zur Startseite navigieren
  recoveryProgress.value = 100;
  await router.push("/");
};

const performHardReset = async () => {
  activeRecovery.value = { name: "Hard Reset" };

  // Schritt 1: Alle Stores zurücksetzen
  recoveryProgress.value = 25;
  // Reset stores logic here

  // Schritt 2: Router unmounten
  recoveryProgress.value = 50;
  // Unmount router logic here

  // Schritt 3: Cache leeren
  recoveryProgress.value = 75;
  selfHealingService.clearCaches();

  // Schritt 4: Seite neu laden
  recoveryProgress.value = 100;
  window.location.href = "/";
};

const performCacheClear = async () => {
  activeRecovery.value = { name: "Cache leeren" };

  // Schritt 1: localStorage leeren
  recoveryProgress.value = 33;
  localStorage.clear();

  // Schritt 2: sessionStorage leeren
  recoveryProgress.value = 66;
  sessionStorage.clear();

  // Schritt 3: Seite neu laden
  recoveryProgress.value = 100;
  window.location.reload();
};

const performSmartRecovery = async () => {
  activeRecovery.value = { name: "Smart Recovery" };

  // Nutze UnifiedDiagnosticsService für intelligente Recovery
  await unifiedDiagnosticsService.triggerManualRecovery("recurring_404");

  // Simuliere Fortschritt
  const interval = setInterval(() => {
    recoveryProgress.value += 10;
    if (recoveryProgress.value >= 100) {
      clearInterval(interval);
    }
  }, 300);
};

const navigateTo = async (path: string) => {
  try {
    // Nutze RouterService für sichere Navigation
    await routerService.navigate({ path });
  } catch (error) {
    logger.error("Navigation fehlgeschlagen:", error);
    toast.error("Navigation fehlgeschlagen");
  }
};

const recoverSession = async () => {
  if (!sessionId.value) {
    toast.warning("Keine Session-ID gefunden");
    return;
  }

  try {
    await router.push(`/session/${sessionId.value}`);
  } catch (error) {
    logger.error("Session-Wiederherstellung fehlgeschlagen:", error);
    toast.error("Session konnte nicht wiederhergestellt werden");
  }
};

// Lifecycle
onMounted(() => {
  // Extrahiere Session-ID wenn in Chat-Route
  if (isInChatRoute.value) {
    const pathParts = route.path.split("/");
    sessionId.value = pathParts[pathParts.length - 1] || null;
  }

  // Starte Diagnose
  unifiedDiagnosticsService.generateReport();
});

// Auto-Recovery bei wiederkehrenden Fehlern
watch(
  () => diagnostics.value.isRecurring,
  (isRecurring) => {
    if (isRecurring && !isRecovering.value) {
      toast.warning(
        "Wiederkehrende Fehler erkannt. Smart Recovery wird vorgeschlagen.",
      );
    }
  },
);
</script>

<style scoped>
.advanced-404-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
}

.error-content {
  max-width: 800px;
  width: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 2rem;
}

.error-header {
  text-align: center;
  margin-bottom: 2rem;
}

.error-code {
  font-size: 6rem;
  font-weight: 700;
  color: #e74c3c;
  margin: 0;
}

.error-title {
  font-size: 1.5rem;
  color: #333;
  margin: 0.5rem 0;
}

.error-description {
  color: #666;
  font-size: 1.1rem;
}

.recurring-indicator {
  color: #f39c12;
  font-weight: 500;
}

.router-status {
  margin: 2rem 0;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.router-status h3 {
  margin-top: 0;
  color: #333;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.status-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  border: 2px solid #e0e0e0;
}

.status-item.ok {
  border-color: #27ae60;
}

.status-label {
  font-weight: 500;
  color: #555;
}

.status-value {
  color: #333;
}

.recovery-section {
  margin: 2rem 0;
}

.recovery-section h3 {
  color: #333;
  margin-bottom: 1rem;
}

.recovery-progress {
  margin-bottom: 1.5rem;
}

.progress-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: #3498db;
  transition: width 0.3s ease;
}

.recovery-actions {
  display: grid;
  gap: 1rem;
}

.recovery-button {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.recovery-button:hover {
  border-color: #3498db;
  background: #f8f9fa;
}

.recovery-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.recovery-icon {
  font-size: 2rem;
  margin-right: 1rem;
}

.recovery-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.recovery-text strong {
  color: #333;
  margin-bottom: 0.25rem;
}

.recovery-text small {
  color: #666;
  font-size: 0.875rem;
}

.manual-navigation {
  margin: 2rem 0;
}

.manual-navigation h3 {
  color: #333;
  margin-bottom: 1rem;
}

.nav-options {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.nav-button {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s ease;
}

.nav-button:hover {
  background: #2980b9;
}

.nav-icon {
  margin-right: 0.5rem;
  font-size: 1.2rem;
}

.session-recovery {
  margin: 2rem 0;
  padding: 1.5rem;
  background: #e8f4f8;
  border-radius: 8px;
  border: 2px solid #3498db;
}

.session-recovery h3 {
  color: #2980b9;
  margin-top: 0;
}

.session-recover-button {
  margin-top: 1rem;
  padding: 0.75rem 2rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s ease;
}

.session-recover-button:hover {
  background: #2980b9;
}

.debug-info {
  margin-top: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.debug-info h3 {
  margin-top: 0;
  color: #555;
}

.debug-info pre {
  margin: 0;
  font-size: 0.875rem;
  overflow-x: auto;
  white-space: pre-wrap;
}

.debug-toggle {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #333;
  color: white;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.debug-toggle:hover {
  transform: scale(1.1);
  background: #555;
}

@media (max-width: 768px) {
  .error-content {
    padding: 1.5rem;
  }

  .error-code {
    font-size: 4rem;
  }

  .status-grid {
    grid-template-columns: 1fr;
  }

  .nav-options {
    flex-direction: column;
  }

  .nav-button {
    width: 100%;
  }
}
</style>
