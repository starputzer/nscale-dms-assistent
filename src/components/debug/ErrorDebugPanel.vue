<template>
  <Teleport to="body">
    <div
      v-if="isVisible"
      class="error-debug-panel"
      :class="{ minimized: isMinimized }"
    >
      <!-- Header -->
      <div class="debug-header" @click="toggleMinimize">
        <h3>🔍 Error Debug Panel</h3>
        <div class="header-actions">
          <Button size="small" @click.stop="clearLogs">Clear</Button>
          <Button size="small" @click.stop="exportLogs">Export</Button>
          <Button size="small" @click.stop="close">×</Button>
        </div>
      </div>

      <!-- Content -->
      <div v-if="!isMinimized" class="debug-content">
        <!-- Tabs -->
        <div class="debug-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-button"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
            <span v-if="tab.count" class="tab-count">{{ tab.count }}</span>
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <!-- Current State Tab -->
          <div v-if="activeTab === 'state'" class="state-panel">
            <h4>Current System State</h4>
            <div class="state-info">
              <div class="info-item">
                <span class="label">Route:</span>
                <span class="value">{{ currentRoute }}</span>
              </div>
              <div class="info-item">
                <span class="label">Error Type:</span>
                <span class="value" :class="errorTypeClass">{{
                  errorType || "None"
                }}</span>
              </div>
              <div class="info-item">
                <span class="label">DOM Status:</span>
                <span class="value">{{ domStatus }}</span>
              </div>
              <div class="info-item">
                <span class="label">Feature Flags:</span>
                <div class="feature-flags">
                  <span
                    v-for="(value, key) in featureFlags"
                    :key="key"
                    class="flag-item"
                    :class="{ enabled: value }"
                  >
                    {{ key }}: {{ value ? "✓" : "✗" }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Diagnostics Tab -->
          <div v-if="activeTab === 'diagnostics'" class="diagnostics-panel">
            <h4>Error Diagnostics</h4>
            <div class="diagnostics-actions">
              <Button size="small" @click="runDiagnostics"
                >Run Diagnostics</Button
              >
              <Button size="small" @click="runSelfHealing"
                >Attempt Self-Healing</Button
              >
            </div>
            <div v-if="lastDiagnostics" class="diagnostics-result">
              <pre>{{ JSON.stringify(lastDiagnostics, null, 2) }}</pre>
            </div>
          </div>

          <!-- History Tab -->
          <div v-if="activeTab === 'history'" class="history-panel">
            <h4>Error History</h4>
            <div class="history-list">
              <div
                v-for="(error, index) in errorHistory"
                :key="index"
                class="history-item"
                :class="{ critical: error.severity === 'critical' }"
              >
                <div class="error-time">{{ formatTime(error.timestamp) }}</div>
                <div class="error-type">{{ error.type }}</div>
                <div class="error-message">{{ error.message }}</div>
                <div v-if="error.stack" class="error-stack">
                  <details>
                    <summary>Stack Trace</summary>
                    <pre>{{ error.stack }}</pre>
                  </details>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions Tab -->
          <div v-if="activeTab === 'actions'" class="actions-panel">
            <h4>Recovery Actions</h4>
            <div class="action-buttons">
              <Button @click="clearCache">Clear Cache</Button>
              <Button @click="resetRouter">Reset Router</Button>
              <Button @click="reloadPage">Reload Page</Button>
              <Button @click="navigateHome">Go to Home</Button>
              <Button @click="toggleFeatureFlags">Toggle Features</Button>
              <Button @click="exportDebugInfo">Export Debug Info</Button>
            </div>
            <div v-if="actionResult" class="action-result">
              <Alert :type="actionResult.type">{{
                actionResult.message
              }}</Alert>
            </div>
          </div>

          <!-- Console Tab -->
          <div v-if="activeTab === 'console'" class="console-panel">
            <h4>Debug Console</h4>
            <div class="console-input">
              <Input
                v-model="consoleCommand"
                placeholder="Enter debug command..."
                @keyup.enter="executeCommand"
              />
              <Button @click="executeCommand">Execute</Button>
            </div>
            <div class="console-output">
              <div
                v-for="(output, index) in consoleOutput"
                :key="index"
                class="console-line"
                :class="output.type"
              >
                <span class="console-prefix">{{
                  output.type === "input" ? ">" : "<"
                }}</span>
                <span class="console-text">{{ output.text }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Status Bar -->
      <div class="debug-status-bar">
        <span class="status-item">Memory: {{ memoryUsage }}MB</span>
        <span class="status-item">Errors: {{ errorCount }}</span>
        <span class="status-item">Uptime: {{ uptime }}</span>
        <span class="status-item">Mode: {{ isDevMode ? "Dev" : "Prod" }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useLogger } from "@/composables/useLogger";
import { domErrorDetector } from "@/utils/domErrorDiagnostics";
import { selfHealingService } from "@/services/selfHealing/SelfHealingService";
import { useFeatureTogglesStore } from "@/stores/featureToggles";
import Button from "@/components/ui/base/Button.vue";
import Input from "@/components/ui/base/Input.vue";
import Alert from "@/components/ui/base/Alert.vue";

interface Props {
  enabled?: boolean;
  startMinimized?: boolean;
  position?: "top-right" | "bottom-right" | "top-left" | "bottom-left";
}

const props = withDefaults(defineProps<Props>(), {
  enabled: true,
  startMinimized: false,
  position: "bottom-right",
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "action", action: string, result: any): void;
}>();

// Services
const router = useRouter();
const route = useRoute();
const logger = useLogger();
const featureToggles = useFeatureTogglesStore();

// State
const isVisible = ref(props.enabled);
const isMinimized = ref(props.startMinimized);
const activeTab = ref("state");
const lastDiagnostics = ref<any>(null);
const errorHistory = ref<any[]>([]);
const consoleCommand = ref("");
const consoleOutput = ref<any[]>([]);
const actionResult = ref<any>(null);
const startTime = Date.now();

// Computed
const currentRoute = computed(() => route.fullPath);
const errorType = computed(() => lastDiagnostics.value?.errorType || null);
const domStatus = computed(() =>
  lastDiagnostics.value?.hasErrorScreen ? "Error Detected" : "Normal",
);
const featureFlags = computed(() => featureToggles.getAllToggles());
const isDevMode = computed(() => import.meta.env.DEV);

const tabs = computed(() => [
  { id: "state", label: "State", count: null },
  { id: "diagnostics", label: "Diagnostics", count: null },
  { id: "history", label: "History", count: errorHistory.value.length },
  { id: "actions", label: "Actions", count: null },
  { id: "console", label: "Console", count: null },
]);

const errorCount = computed(() => errorHistory.value.length);

const memoryUsage = computed(() => {
  if ("memory" in performance) {
    const memory = (performance as any).memory;
    return Math.round(memory.usedJSHeapSize / 1048576);
  }
  return "N/A";
});

const uptime = computed(() => {
  const seconds = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
});

const errorTypeClass = computed(() => {
  const type = errorType.value;
  if (!type) return "";
  if (type === "critical") return "error-critical";
  if (type === "notFound") return "error-404";
  return "error-default";
});

// Methods
const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value;
};

const close = () => {
  isVisible.value = false;
  emit("close");
};

const clearLogs = () => {
  errorHistory.value = [];
  consoleOutput.value = [];
  actionResult.value = null;
};

const exportLogs = () => {
  const debugData = {
    timestamp: new Date().toISOString(),
    currentState: {
      route: currentRoute.value,
      errorType: errorType.value,
      domStatus: domStatus.value,
      featureFlags: featureFlags.value,
    },
    diagnostics: lastDiagnostics.value,
    errorHistory: errorHistory.value,
    consoleOutput: consoleOutput.value,
    systemInfo: {
      memoryUsage: memoryUsage.value,
      uptime: uptime.value,
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    },
  };

  const blob = new Blob([JSON.stringify(debugData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `error-debug-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  actionResult.value = { type: "success", message: "Debug data exported" };
};

const runDiagnostics = () => {
  const diagnostics = domErrorDetector.detectErrorState();
  lastDiagnostics.value = diagnostics;

  // Log to history
  if (diagnostics.hasErrorScreen) {
    errorHistory.value.push({
      timestamp: Date.now(),
      type: diagnostics.errorType,
      message: diagnostics.errorMessage,
      severity: diagnostics.errorType === "critical" ? "critical" : "normal",
      diagnostics,
    });
  }

  consoleOutput.value.push({
    type: "output",
    text: `Diagnostics complete: ${diagnostics.hasErrorScreen ? "Error detected" : "No errors"}`,
  });
};

const runSelfHealing = async () => {
  consoleOutput.value.push({
    type: "input",
    text: "Running self-healing...",
  });

  const result = await selfHealingService.heal();

  consoleOutput.value.push({
    type: result.success ? "success" : "error",
    text: `Self-healing ${result.success ? "successful" : "failed"}: ${result.strategy}`,
  });

  actionResult.value = {
    type: result.success ? "success" : "error",
    message: `Self-healing ${result.success ? "completed" : "failed"}`,
  };
};

const clearCache = async () => {
  try {
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
    actionResult.value = {
      type: "success",
      message: "Cache cleared successfully",
    };
  } catch (error) {
    actionResult.value = { type: "error", message: "Failed to clear cache" };
  }
};

const resetRouter = async () => {
  try {
    await router.push("/");
    actionResult.value = { type: "success", message: "Router reset" };
  } catch (error) {
    actionResult.value = { type: "error", message: "Failed to reset router" };
  }
};

const reloadPage = () => {
  window.location.reload();
};

const navigateHome = async () => {
  try {
    await router.push("/");
    actionResult.value = { type: "success", message: "Navigated to home" };
  } catch (error) {
    window.location.href = "/";
  }
};

const toggleFeatureFlags = () => {
  const problematicFeatures = [
    "useSfcChat",
    "useSfcDocConverter",
    "useSfcAdmin",
  ];

  problematicFeatures.forEach((feature) => {
    const currentState = featureToggles.isEnabled(feature);
    featureToggles.setFallbackMode(feature, !currentState);
  });

  actionResult.value = { type: "info", message: "Feature flags toggled" };
};

const executeCommand = () => {
  if (!consoleCommand.value.trim()) return;

  consoleOutput.value.push({
    type: "input",
    text: consoleCommand.value,
  });

  try {
    // Security: Nur vordefinierte Befehle erlauben
    const commands: Record<string, () => any> = {
      help: () =>
        "Available commands: help, diagnostics, heal, clear, route, features",
      diagnostics: () => {
        runDiagnostics();
        return "Running diagnostics...";
      },
      heal: () => {
        runSelfHealing();
        return "Starting self-healing...";
      },
      clear: () => {
        clearLogs();
        return "Logs cleared";
      },
      route: () => `Current route: ${currentRoute.value}`,
      features: () => JSON.stringify(featureFlags.value, null, 2),
    };

    const cmd = consoleCommand.value.trim().toLowerCase();
    const result = commands[cmd] ? commands[cmd]() : `Unknown command: ${cmd}`;

    consoleOutput.value.push({
      type: "output",
      text: String(result),
    });
  } catch (error) {
    consoleOutput.value.push({
      type: "error",
      text: `Error: ${error}`,
    });
  }

  consoleCommand.value = "";
};

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString();
};

// Lifecycle
onMounted(() => {
  // Initial diagnostics
  runDiagnostics();

  // Keyboard shortcut
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === "D") {
      isVisible.value = !isVisible.value;
    }
  };

  window.addEventListener("keydown", handleKeyPress);

  onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeyPress);
  });
});

// Watch route changes
watch(
  () => route.path,
  () => {
    if (isVisible.value) {
      runDiagnostics();
    }
  },
);
</script>

<style scoped>
.error-debug-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 500px;
  max-height: 600px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  font-family: monospace;
  font-size: 12px;
  transition: all 0.3s ease;
}

.error-debug-panel.minimized {
  height: auto;
  max-height: none;
}

.debug-header {
  padding: 10px 15px;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
}

.debug-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 5px;
}

.debug-content {
  max-height: 500px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.debug-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background-soft);
}

.tab-button {
  padding: 8px 15px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text);
  position: relative;
  transition: all 0.2s;
}

.tab-button:hover {
  background: var(--color-background-mute);
}

.tab-button.active {
  color: var(--color-primary);
  background: var(--color-background);
}

.tab-button.active::after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-primary);
}

.tab-count {
  margin-left: 5px;
  padding: 2px 6px;
  background: var(--color-primary);
  color: white;
  border-radius: 10px;
  font-size: 10px;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.state-panel .info-item {
  margin-bottom: 10px;
  display: flex;
  align-items: flex-start;
}

.state-panel .label {
  font-weight: 600;
  margin-right: 10px;
  min-width: 100px;
}

.state-panel .value {
  flex: 1;
}

.feature-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.flag-item {
  padding: 2px 8px;
  background: var(--color-background-soft);
  border-radius: 4px;
  font-size: 11px;
}

.flag-item.enabled {
  background: var(--color-success-light);
  color: var(--color-success);
}

.diagnostics-panel,
.actions-panel {
  padding: 10px 0;
}

.diagnostics-actions,
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.diagnostics-result {
  background: var(--color-background-soft);
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}

.history-list {
  max-height: 400px;
  overflow-y: auto;
}

.history-item {
  padding: 10px;
  margin-bottom: 10px;
  background: var(--color-background-soft);
  border-radius: 4px;
  border-left: 3px solid var(--color-border);
}

.history-item.critical {
  border-left-color: var(--color-danger);
}

.error-time {
  color: var(--color-text-light);
  font-size: 11px;
}

.error-type {
  font-weight: 600;
  color: var(--color-primary);
  margin: 5px 0;
}

.error-message {
  color: var(--color-text);
}

.error-stack details {
  margin-top: 10px;
}

.error-stack pre {
  margin: 5px 0;
  padding: 5px;
  background: var(--color-background);
  border-radius: 4px;
  font-size: 10px;
  overflow-x: auto;
}

.console-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.console-input {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.console-output {
  flex: 1;
  background: var(--color-background-soft);
  padding: 10px;
  border-radius: 4px;
  overflow-y: auto;
  font-family: "Courier New", monospace;
}

.console-line {
  margin-bottom: 5px;
  display: flex;
  align-items: flex-start;
}

.console-prefix {
  margin-right: 10px;
  color: var(--color-text-light);
}

.console-line.error {
  color: var(--color-danger);
}

.console-line.success {
  color: var(--color-success);
}

.action-result {
  margin-top: 15px;
}

.debug-status-bar {
  padding: 5px 15px;
  background: var(--color-background-soft);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--color-text-light);
  border-radius: 0 0 8px 8px;
}

.status-item {
  display: flex;
  align-items: center;
}

.error-critical {
  color: var(--color-danger);
  font-weight: 600;
}

.error-404 {
  color: var(--color-warning);
  font-weight: 600;
}

.error-default {
  color: var(--color-info);
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .error-debug-panel {
    background: #1a1a1a;
    border-color: #333;
  }

  .debug-header,
  .debug-tabs,
  .debug-status-bar {
    background: #222;
  }

  .tab-button:hover {
    background: #333;
  }

  .tab-button.active {
    background: #1a1a1a;
  }
}
</style>
