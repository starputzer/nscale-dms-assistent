<template>
  <div v-if="hasError" class="n-error-boundary" :class="errorClasses">
    <div class="n-error-boundary__content">
      <slot name="fallback" v-bind="{ error, componentName, retry }">
        <div class="n-error-boundary__header">
          <ErrorIcon v-if="showIcon" class="n-error-boundary__icon" />
          <h3 class="n-error-boundary__title">{{ title }}</h3>
          <button
            v-if="showCloseButton"
            class="n-error-boundary__close-button"
            aria-label="Schließen"
            @click="hide"
          >
            <CloseIcon />
          </button>
        </div>

        <div v-if="showFallbackUI" class="n-error-boundary__message">
          <p>{{ errorMessage }}</p>

          <div v-if="showStack && error?.stack" class="n-error-boundary__stack">
            <details>
              <summary>Technische Details</summary>
              <pre>{{ stack }}</pre>
            </details>
          </div>

          <div
            v-if="showResourceInfo && resourceError"
            class="n-error-boundary__resource"
          >
            <p><strong>Mögliche Ursache:</strong> Ressourcenknappheit.</p>
            <ul>
              <li v-if="resourceInfo.memory">
                Speicher: {{ resourceInfo.memory }}
              </li>
              <li v-if="resourceInfo.cpu">CPU: {{ resourceInfo.cpu }}</li>
              <li v-if="resourceInfo.network">
                Netzwerk: {{ resourceInfo.network }}
              </li>
            </ul>
          </div>
        </div>

        <div v-if="showFallbackUI" class="n-error-boundary__actions">
          <template v-if="hasAlternativeAction">
            <button
              class="n-button n-button--primary"
              @click="handleAlternativeAction"
            >
              {{ alternativeActionLabel }}
            </button>
          </template>

          <button
            v-if="showRetrybutton"
            class="n-button n-button--secondary"
            @click="retry"
          >
            {{ retryLabel }}
          </button>
        </div>
      </slot>
    </div>
  </div>
  <slot v-else></slot>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, PropType } from "vue";
import CloseIcon from "@/components/icons/CloseIcon.vue";
import ErrorIcon from "@/components/icons/ErrorIcon.vue";
import { DegradationLevel } from "@/config/edge-cases";
import { useErrorReporting } from "@/composables/useErrorReporting";
import { useLogger } from "@/composables/useLogger";
import ErrorClassifier from "@/utils/ErrorClassifier";

// Typen für Resource-Informationen
interface ResourceInfo {
  memory?: string;
  cpu?: string;
  network?: string;
}

// Typen für Error-Kategorie
type ErrorCategory =
  | "network"
  | "resource"
  | "validation"
  | "permission"
  | "unknown";

export default defineComponent({
  name: "EnhancedErrorBoundary",
  components: {
    CloseIcon,
    ErrorIcon,
  },
  props: {
    /**
     * Name der Komponente für bessere Fehlermeldungen
     */
    componentName: {
      type: String,
      default: "Komponente",
    },
    /**
     * Titel der Fehlermeldung
     */
    title: {
      type: String,
      default: "Ein Fehler ist aufgetreten",
    },
    /**
     * Angepasste Fehlermeldung anstelle der standardmäßigen
     */
    message: {
      type: String,
      default: "",
    },
    /**
     * Zeigt einen Schließen-Button
     */
    showCloseButton: {
      type: Boolean,
      default: false,
    },
    /**
     * Zeigt einen Fehler-Icon
     */
    showIcon: {
      type: Boolean,
      default: true,
    },
    /**
     * Zeigt den Stacktrace an
     */
    showStack: {
      type: Boolean,
      default: false,
    },
    /**
     * Zeigt einen Retry-Button an
     */
    showRetryButton: {
      type: Boolean,
      default: true,
    },
    /**
     * Konfigurierbare Beschriftung für den Retry-Button
     */
    retryLabel: {
      type: String,
      default: "Erneut versuchen",
    },
    /**
     * Zeigt Informationen zu Ressourcen an (bei Ressourcen-Fehlern)
     */
    showResourceInfo: {
      type: Boolean,
      default: true,
    },
    /**
     * Optionale Funktion für alternativen Lösungsweg
     */
    alternativeAction: {
      type: Function as PropType<() => void>,
      default: null,
    },
    /**
     * Beschriftung für alternativen Lösungsweg Button
     */
    alternativeActionLabel: {
      type: String,
      default: "Alternative Ansicht",
    },
    /**
     * Optionale Fehler-Variante (für Styling)
     */
    variant: {
      type: String,
      default: "alert", // 'alert', 'badge', 'banner', 'inline'
      validator: (v: string) =>
        ["alert", "badge", "banner", "inline"].includes(v),
    },
    /**
     * Automatische Degradation aktivieren
     */
    autoDegradation: {
      type: Boolean,
      default: true,
    },
    /**
     * Callback bei Fehler (z.B. für Metriken)
     */
    onError: {
      type: Function as PropType<(error: Error, info: any) => void>,
      default: null,
    },
    /**
     * Fallback-UI anzeigen oder nur den Fehler loggen
     */
    showFallbackUI: {
      type: Boolean,
      default: true,
    },
  },

  // Vue 3 Error Boundary API
  errorCaptured(err: Error, instance: any, info: string) {
    this.captureError(err, info);
    return false; // Verhindern, dass der Fehler weiter nach oben propagiert
  },

  setup(props) {
    const error = ref<Error | null>(null);
    const errorInfo = ref<string | null>(null);
    const hasError = ref(false);
    const degradationLevel = ref<DegradationLevel>(DegradationLevel.NONE);
    const resourceInfo = ref<ResourceInfo>({});
    const currentErrorCategory = ref<ErrorCategory>("unknown");
    const errorCount = ref(0);

    // Logger und Error Reporting
    const logger = useLogger("ErrorBoundary");
    const { reportError } = useErrorReporting();

    // Computed Properties
    const hasAlternativeAction = computed(() =>
      Boolean(props.alternativeAction),
    );

    const stack = computed(() => {
      if (!error.value?.stack) return "";

      // Stack für bessere Lesbarkeit formatieren
      const cleanedStack = error.value.stack
        .replace(/^Error: /, "")
        .replace(/https?:\/\/[^/]+\//g, "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n");

      return cleanedStack;
    });

    const errorMessage = computed(() => {
      if (props.message) return props.message;

      if (!error.value) return "Ein unbekannter Fehler ist aufgetreten.";

      // Benutzerfreundliche Fehlermeldungen je nach Kategorie
      switch (currentErrorCategory.value) {
        case "network":
          return "Es konnte keine Verbindung zum Server hergestellt werden. Bitte prüfen Sie Ihre Internetverbindung.";
        case "resource":
          return "Die Anwendung hat nicht genügend Ressourcen. Eine vereinfachte Ansicht wird geladen.";
        case "permission":
          return "Sie haben keine Berechtigung, auf diese Ressource zuzugreifen.";
        case "validation":
          return "Die eingegebenen Daten konnten nicht verarbeitet werden.";
        default:
          return (
            error.value.message || "Ein unbekannter Fehler ist aufgetreten."
          );
      }
    });

    const errorClasses = computed(() => ({
      [`n-error-boundary--${props.variant}`]: true,
      [`n-error-boundary--${currentErrorCategory.value}`]: true,
      [`n-error-boundary--level-${degradationLevel.value}`]: true,
    }));

    const resourceError = computed(
      () =>
        currentErrorCategory.value === "resource" ||
        degradationLevel.value > DegradationLevel.NONE,
    );

    // Methoden
    const captureError = (err: Error, info: string) => {
      error.value = err;
      errorInfo.value = info;
      hasError.value = true;
      errorCount.value++;

      // Kategorisieren des Fehlers
      currentErrorCategory.value = ErrorClassifier.categorizeError(err);

      // Ressourcen-Informationen sammeln
      if (currentErrorCategory.value === "resource" || props.autoDegradation) {
        collectResourceInfo();
      }

      // Fehlerdegradation, wenn konfiguriert
      if (props.autoDegradation) {
        applyDegradation();
      }

      // Fehler zum Error-Reporting-System senden
      reportError(err, {
        componentName: props.componentName,
        info,
        category: currentErrorCategory.value,
        degradationLevel: degradationLevel.value,
        resourceInfo: resourceInfo.value,
      });

      logger.error(`Fehler in ${props.componentName}:`, err, info);

      // Props Callback aufrufen
      if (props.onError) {
        props.onError(err, {
          info,
          category: currentErrorCategory.value,
          degradationLevel: degradationLevel.value,
        });
      }
    };

    const collectResourceInfo = () => {
      const info: ResourceInfo = {};

      // Memory-Info sammeln (wenn verfügbar)
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        const usedHeapSizeMB = Math.round(
          memory.usedJSHeapSize / (1024 * 1024),
        );
        const totalHeapSizeMB = Math.round(
          memory.jsHeapSizeLimit / (1024 * 1024),
        );
        info.memory = `${usedHeapSizeMB}MB / ${totalHeapSizeMB}MB`;
      }

      // Netzwerkinfo sammeln (wenn Connection API verfügbar)
      if ((navigator as any).connection) {
        const connection = (navigator as any).connection;
        info.network =
          connection.effectiveType || connection.type || "unbekannt";
      }

      // CPU-Info (indirekt abschätzen über Anzahl der Hardware-Kerne)
      if (navigator.hardwareConcurrency) {
        info.cpu = `${navigator.hardwareConcurrency} Kerne`;
      }

      resourceInfo.value = info;
    };

    const applyDegradation = () => {
      // Basierend auf Fehlertyp und -anzahl Degradation anwenden
      if (currentErrorCategory.value === "resource") {
        degradationLevel.value = DegradationLevel.MEDIUM;
      } else if (errorCount.value >= 3) {
        // Nach mehreren Fehlern in Folge auch degradieren
        degradationLevel.value = DegradationLevel.LIGHT;
      }

      // Degradationsmaßnahmen anwenden (Emit Event zur Verarbeitung in übergeordneten Komponenten)
    };

    const retry = () => {
      hasError.value = false;
      error.value = null;
      errorInfo.value = null;
    };

    const hide = () => {
      hasError.value = false;
    };

    const handleAlternativeAction = () => {
      if (props.alternativeAction) {
        props.alternativeAction();
      }
    };

    // Bei Änderung der Degradationsstufe automatisch degradieren
    watch(degradationLevel, (newLevel) => {
      if (newLevel > DegradationLevel.NONE) {
        // Hier können zusätzliche Maßnahmen für Degradation eingeleitet werden
      }
    });

    return {
      error,
      errorInfo,
      hasError,
      resourceInfo,
      currentErrorCategory,
      errorClasses,
      stack,
      errorMessage,
      hasAlternativeAction,
      resourceError,
      captureError,
      retry,
      hide,
      handleAlternativeAction,
    };
  },
});
</script>

<style lang="scss">
.n-error-boundary {
  width: 100%;
  border-radius: var(--n-border-radius, 4px);
  overflow: hidden;
  margin: var(--n-spacing-2, 0.5rem) 0;

  // Varianten
  &--alert {
    padding: var(--n-spacing-4, 1rem);
    background-color: var(--n-color-error-bg, #fde8e8);
    border: 1px solid var(--n-color-error-border, #f8b4b4);
  }

  &--banner {
    padding: var(--n-spacing-4, 1rem);
    background-color: var(--n-color-error-bg, #fde8e8);
    width: 100%;
    border-top: 1px solid var(--n-color-error-border, #f8b4b4);
    border-bottom: 1px solid var(--n-color-error-border, #f8b4b4);
  }

  &--badge {
    display: inline-block;
    padding: var(--n-spacing-2, 0.5rem) var(--n-spacing-3, 0.75rem);
    background-color: var(--n-color-error, #e53e3e);
    color: white;
    border-radius: var(--n-border-radius-full, 9999px);
    font-size: var(--n-font-size-sm, 0.875rem);
  }

  &--inline {
    display: inline-flex;
    align-items: center;
    color: var(--n-color-error, #e53e3e);
    font-size: var(--n-font-size-sm, 0.875rem);
  }

  // Fehlertypen-spezifisches Styling
  &--network {
    background-color: var(--n-color-warning-bg, #fefcbf);
    border-color: var(--n-color-warning-border, #f6e05e);
  }

  &--resource {
    background-color: var(--n-color-info-bg, #e6f6ff);
    border-color: var(--n-color-info-border, #90cdf4);
  }

  // Degradation Levels
  &--level-2,
  &--level-3,
  &--level-4 {
    // Vereinfachtes Styling für Degradationsmodus
    animation: none !important;
    transition: none !important;
  }

  // Komponenten
  &__header {
    display: flex;
    align-items: center;
    margin-bottom: var(--n-spacing-3, 0.75rem);
  }

  &__icon {
    margin-right: var(--n-spacing-3, 0.75rem);
    color: var(--n-color-error, #e53e3e);
    flex-shrink: 0;

    .n-error-boundary--network & {
      color: var(--n-color-warning, #d97706);
    }

    .n-error-boundary--resource & {
      color: var(--n-color-info, #3182ce);
    }
  }

  &__title {
    margin: 0;
    font-size: var(--n-font-size-lg, 1.125rem);
    font-weight: var(--n-font-weight-medium, 500);
    flex: 1;
  }

  &__close-button {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--n-color-text-secondary, #6b7280);
    padding: var(--n-spacing-1, 0.25rem);

    &:hover {
      color: var(--n-color-text, #1f2937);
    }
  }

  &__message {
    margin-bottom: var(--n-spacing-4, 1rem);

    p {
      margin: 0 0 var(--n-spacing-3, 0.75rem) 0;
    }
  }

  &__stack {
    font-family: monospace;
    font-size: var(--n-font-size-sm, 0.875rem);
    margin-top: var(--n-spacing-3, 0.75rem);

    details {
      margin-bottom: var(--n-spacing-3, 0.75rem);
    }

    summary {
      cursor: pointer;
      color: var(--n-color-primary, #3182ce);
      margin-bottom: var(--n-spacing-2, 0.5rem);
    }

    pre {
      background-color: rgba(0, 0, 0, 0.05);
      padding: var(--n-spacing-3, 0.75rem);
      border-radius: var(--n-border-radius-sm, 0.125rem);
      overflow: auto;
      max-height: 15rem;
      margin: 0;
    }
  }

  &__resource {
    background-color: rgba(0, 0, 0, 0.03);
    padding: var(--n-spacing-3, 0.75rem);
    border-radius: var(--n-border-radius-sm, 0.125rem);
    margin-top: var(--n-spacing-3, 0.75rem);

    ul {
      margin: var(--n-spacing-2, 0.5rem) 0 0 0;
      padding-left: var(--n-spacing-5, 1.25rem);
    }
  }

  &__actions {
    display: flex;
    gap: var(--n-spacing-3, 0.75rem);
    margin-top: var(--n-spacing-4, 1rem);
  }
}

.n-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--n-spacing-2, 0.5rem) var(--n-spacing-4, 1rem);
  border-radius: var(--n-border-radius, 0.25rem);
  font-weight: var(--n-font-weight-medium, 500);
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s,
    color 0.2s;

  &--primary {
    background-color: var(--n-color-primary, #3182ce);
    color: white;
    border: 1px solid var(--n-color-primary, #3182ce);

    &:hover {
      background-color: var(--n-color-primary-dark, #2c5282);
      border-color: var(--n-color-primary-dark, #2c5282);
    }
  }

  &--secondary {
    background-color: white;
    color: var(--n-color-primary, #3182ce);
    border: 1px solid var(--n-color-primary, #3182ce);

    &:hover {
      background-color: var(--n-color-primary-bg, #ebf8ff);
    }
  }
}
</style>
