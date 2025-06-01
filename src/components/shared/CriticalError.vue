<template>
  <div class="critical-error-container" v-if="show">
    <div class="critical-error-content">
      <div class="critical-error-icon">!</div>

      <h2 class="critical-error-title">{{ title }}</h2>

      <p class="critical-error-message">{{ message }}</p>

      <div v-if="details" class="critical-error-details">
        <button
          class="critical-error-details-toggle"
          @click="toggleDetails"
          :aria-expanded="showDetails"
        >
          {{ showDetails ? "Details ausblenden" : "Details anzeigen" }}
          <span class="toggle-icon">{{ showDetails ? "▲" : "▼" }}</span>
        </button>

        <div v-if="showDetails" class="critical-error-details-content">
          <pre>{{ details }}</pre>
        </div>
      </div>

      <div class="critical-error-actions">
        <button
          v-if="canReload"
          class="critical-error-btn critical-error-btn-primary"
          @click="reload"
        >
          Seite neu laden
        </button>

        <button
          v-if="canRetry"
          class="critical-error-btn critical-error-btn-secondary"
          @click="retry"
        >
          Erneut versuchen
        </button>

        <button
          v-if="canReport"
          class="critical-error-btn critical-error-btn-tertiary"
          @click="report"
        >
          Fehler melden
        </button>
      </div>

      <div class="critical-error-footer">
        <p>
          <template v-if="errorId">Fehler-ID: {{ errorId }}</template>
          <template v-if="timestamp">{{ formatTimestamp(timestamp) }}</template>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useErrorReporting } from "@/composables/useErrorReporting";

// Props
const props = defineProps({
  show: {
    type: Boolean,
    default: true,
  },
  title: {
    type: String,
    default: "Schwerwiegender Fehler",
  },
  message: {
    type: String,
    default: "Es ist ein unerwarteter Fehler aufgetreten.",
  },
  details: {
    type: String,
    default: null,
  },
  errorId: {
    type: String,
    default: null,
  },
  timestamp: {
    type: Number, // Unix-Timestamp
    default: null,
  },
  canReload: {
    type: Boolean,
    default: true,
  },
  canRetry: {
    type: Boolean,
    default: false,
  },
  canReport: {
    type: Boolean,
    default: true,
  },
  error: {
    type: Error,
    default: null,
  },
  autoReport: {
    type: Boolean,
    default: true,
  },
});

// Emits
const emit = defineEmits(["reload", "retry", "report"]);

// State
const showDetails = ref(false);
const { reportError } = useErrorReporting();

// Methoden
const toggleDetails = () => {
  showDetails.value = !showDetails.value;
};

const reload = () => {
  emit("reload");
  window.location.reload();
};

const retry = () => {
  emit("retry");
};

const report = () => {
  if (props.error) {
    reportError(props.error, {
      context: "CriticalErrorComponent",
      errorId: props.errorId,
      timestamp: props.timestamp || Date.now(),
    });
  }

  emit("report");
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return "";

  try {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  } catch (e) {
    return "";
  }
};

// Automatisch Fehler melden, wenn autoReport aktiviert ist
onMounted(() => {
  if (props.autoReport && props.error) {
    reportError(props.error, {
      context: "CriticalErrorComponent",
      errorId: props.errorId,
      timestamp: props.timestamp || Date.now(),
      autoReported: true,
    });
  }
});
</script>

<style scoped>
.critical-error-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(244, 67, 54, 0.05);
  backdrop-filter: blur(4px);
  z-index: 9999;
  padding: 20px;
}

.critical-error-content {
  width: 100%;
  max-width: 600px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 30px;
  text-align: center;
  animation: errorFadeIn 0.3s ease;
}

@keyframes errorFadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.critical-error-icon {
  width: 80px;
  height: 80px;
  background-color: #ffebee;
  color: #d32f2f;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: bold;
  margin: 0 auto 24px;
}

.critical-error-title {
  color: #d32f2f;
  font-size: 1.5rem;
  margin: 0 0 16px;
}

.critical-error-message {
  font-size: 1.1rem;
  margin-bottom: 24px;
  color: var(--text-primary, #333);
}

.critical-error-details {
  margin-bottom: 24px;
}

.critical-error-details-toggle {
  background: none;
  border: none;
  color: var(--primary-color, #1976d2);
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0 auto;
}

.toggle-icon {
  font-size: 0.8rem;
}

.critical-error-details-content {
  margin-top: 16px;
  background-color: #f5f5f5;
  border-radius: 4px;
  padding: 16px;
  max-height: 200px;
  overflow-y: auto;
  text-align: left;
}

.critical-error-details-content pre {
  margin: 0;
  font-family: monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.critical-error-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;
}

.critical-error-btn {
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  border: none;
}

.critical-error-btn-primary {
  background-color: var(--primary-color, #1976d2);
  color: white;
}

.critical-error-btn-primary:hover {
  background-color: var(--primary-color-dark, #1565c0);
}

.critical-error-btn-secondary {
  background-color: #f5f5f5;
  color: var(--text-primary, #333);
  border: 1px solid #ddd;
}

.critical-error-btn-secondary:hover {
  background-color: #e8e8e8;
}

.critical-error-btn-tertiary {
  background-color: transparent;
  color: var(--primary-color, #1976d2);
  text-decoration: underline;
}

.critical-error-btn-tertiary:hover {
  color: var(--primary-color-dark, #1565c0);
}

.critical-error-footer {
  font-size: 0.8rem;
  color: var(--text-secondary, #777);
}

.critical-error-footer p {
  margin: 0;
}

@media (max-width: 600px) {
  .critical-error-content {
    padding: 20px;
  }

  .critical-error-actions {
    flex-direction: column;
  }

  .critical-error-btn {
    width: 100%;
  }
}
</style>
