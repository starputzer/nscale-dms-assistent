<template>
  <div
    class="conversion-progress"
    role="region"
    aria-live="polite"
    aria-label="Dokumentenkonvertierungsfortschritt"
  >
    <div class="conversion-progress__header">
      <h3 class="conversion-progress__title">{{ title }}</h3>
      <button
        v-if="cancelable"
        class="conversion-progress__cancel-btn"
        @click="handleCancel"
        aria-label="Konvertierung abbrechen"
      >
        <i class="fa fa-times"></i>
      </button>
    </div>

    <div class="conversion-progress__visualization">
      <!-- Desktop steps visualization -->
      <div
        class="conversion-progress__steps conversion-progress__steps--desktop"
        aria-hidden="true"
      >
        <div
          v-for="(step, index) in conversionSteps"
          :key="index"
          class="conversion-progress__step"
          :class="{
            'conversion-progress__step--active': currentStepIndex === index,
            'conversion-progress__step--completed': currentStepIndex > index,
          }"
        >
          <div class="conversion-progress__step-icon">
            <i
              :class="
                currentStepIndex > index
                  ? 'fa fa-check'
                  : currentStepIndex === index
                    ? 'fa fa-spinner fa-spin'
                    : 'fa fa-circle'
              "
            ></i>
          </div>
          <div class="conversion-progress__step-label">
            {{ step.label }}
          </div>
        </div>
      </div>

      <!-- Mobile optimized steps visualization -->
      <div
        class="conversion-progress__steps conversion-progress__steps--mobile"
        aria-hidden="true"
      >
        <div
          v-for="(step, index) in conversionSteps"
          :key="'mobile-' + index"
          class="conversion-progress__step"
          :class="{
            'conversion-progress__step--active': currentStepIndex === index,
            'conversion-progress__step--completed': currentStepIndex > index,
          }"
        >
          <div class="conversion-progress__step-icon">
            <i
              :class="
                currentStepIndex > index
                  ? 'fa fa-check-circle'
                  : currentStepIndex === index
                    ? 'fa fa-spinner fa-spin'
                    : 'fa fa-circle'
              "
            ></i>
          </div>
          <div class="conversion-progress__step-label">
            <span class="conversion-progress__step-number"
              >{{ index + 1 }}.</span
            >
            {{ step.label }}
          </div>
        </div>
      </div>

      <div class="conversion-progress__bar-container">
        <div
          class="conversion-progress__bar"
          :style="{ width: `${progress}%` }"
          role="progressbar"
          :aria-valuenow="progress"
          aria-valuemin="0"
          aria-valuemax="100"
        ></div>
        <div class="conversion-progress__progress-text">
          <span class="conversion-progress__percentage">{{ progress }}%</span>
          <span
            v-if="showEstimatedTime && estimatedTime > 0"
            class="conversion-progress__estimated-time"
          >
            {{
              $t(
                "converter.estimatedTimeRemaining",
                "Geschätzte Zeit verbleibend:",
              )
            }}
            {{ formatTime(estimatedTime) }}
          </span>
        </div>
      </div>
    </div>

    <div class="conversion-progress__details">
      <div class="conversion-progress__current-operation">
        <span class="conversion-progress__operation-label">{{
          $t("converter.currentOperation", "Aktuelle Operation:")
        }}</span>
        <span class="conversion-progress__operation-text">{{
          currentStep
        }}</span>
      </div>

      <div v-if="details" class="conversion-progress__additional-info">
        <div class="conversion-progress__info-header">
          <span>{{
            $t("converter.processingDetails", "Verarbeitungsdetails")
          }}</span>
          <button
            @click="toggleDetails"
            class="conversion-progress__toggle-details"
            :aria-expanded="showDetailsExpanded"
            aria-controls="conversion-details-section"
          >
            <i
              :class="
                showDetailsExpanded ? 'fa fa-chevron-up' : 'fa fa-chevron-down'
              "
            ></i>
          </button>
        </div>

        <pre
          v-if="showDetailsExpanded"
          id="conversion-details-section"
          class="conversion-progress__details-content"
          >{{ details }}</pre
        >
      </div>
    </div>

    <div class="conversion-progress__actions">
      <button
        class="conversion-progress__action-btn conversion-progress__cancel-action"
        @click="handleCancel"
        :disabled="progress >= 100 || !cancelable"
      >
        {{ $t("converter.cancelConversion", "Konvertierung abbrechen") }}
      </button>

      <button
        v-if="hasWarnings"
        class="conversion-progress__action-btn conversion-progress__warning-action"
        @click="toggleWarnings"
      >
        <i class="fa fa-exclamation-triangle"></i>
        {{
          showWarnings
            ? $t("converter.hideWarnings", "Warnungen ausblenden")
            : $t("converter.showWarnings", "Warnungen anzeigen") +
              ` (${warnings.length})`
        }}
      </button>
    </div>

    <div
      v-if="showWarnings && hasWarnings"
      class="conversion-progress__warnings"
    >
      <div
        v-for="(warning, index) in warnings"
        :key="index"
        class="conversion-progress__warning-item"
      >
        <i
          class="fa fa-exclamation-triangle conversion-progress__warning-icon"
        ></i>
        <div class="conversion-progress__warning-content">
          <div class="conversion-progress__warning-message">
            {{ warning.message }}
          </div>
          <div
            v-if="warning.details"
            class="conversion-progress__warning-details"
          >
            {{ warning.details }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";

/**
 * Schnittstelle für Konvertierungsschritte
 */
interface ConversionStep {
  label: string;
  value: string;
}

/**
 * Schnittstelle für Warnungen während der Konvertierung
 */
interface ConversionWarning {
  message: string;
  details?: string;
  level: "low" | "medium" | "high";
  timestamp: Date;
}

interface Props {
  // Aktueller Fortschritt in Prozent (0-100)
  progress: number;

  // Aktueller Konvertierungsschritt als Textbeschreibung
  currentStep: string;

  // Geschätzte verbleibende Zeit in Sekunden
  estimatedTime?: number;

  // Zusätzliche Details zum Konvertierungsprozess
  details?: string;

  // Ob der Konvertierungsprozess abgebrochen werden kann
  cancelable?: boolean;

  // Titel der Komponente
  title?: string;

  // Warnungen während des Konvertierungsprozesses
  warnings?: ConversionWarning[];

  // Ob die geschätzte Zeit angezeigt werden soll
  showEstimatedTime?: boolean;
}

// Props mit Standardwerten
const props = withDefaults(defineProps<Props>(), {
  progress: 0,
  currentStep: "Dokument wird konvertiert...",
  estimatedTime: 0,
  details: "",
  cancelable: true,
  title: "Dokument wird konvertiert",
  warnings: () => [],
  showEstimatedTime: true,
});

// Emits für Events
const emit = defineEmits<{
  (e: "cancel"): void;
  (e: "warning-acknowledged", warning: ConversionWarning): void;
}>();

// Lokaler Zustand
const showDetailsExpanded = ref(false);
const showWarnings = ref(false);

// Konvertierungsschritte
const conversionSteps = ref<ConversionStep[]>([
  { label: "Initialisierung", value: "init" },
  { label: "Dokument analysieren", value: "analyze" },
  { label: "Inhaltsextraktion", value: "extract" },
  { label: "Formatierung", value: "format" },
  { label: "Metadaten", value: "metadata" },
  { label: "Fertigstellung", value: "finalize" },
]);

// Berechne den aktuellen Schritt basierend auf dem Fortschritt
const currentStepIndex = computed(() => {
  if (props.progress >= 100) return conversionSteps.value.length - 1;

  // Nutze den Text des aktuellen Schritts, um den Index zu ermitteln
  const stepText = props.currentStep.toLowerCase();

  for (let i = 0; i < conversionSteps.value.length; i++) {
    if (stepText.includes(conversionSteps.value[i].value)) {
      return i;
    }
  }

  // Fallback: Schritt basierend auf Fortschritt schätzen
  return Math.min(
    Math.floor((props.progress / 100) * conversionSteps.value.length),
    conversionSteps.value.length - 1,
  );
});

// Prüfe, ob Warnungen vorhanden sind
const hasWarnings = computed(() => props.warnings.length > 0);

/**
 * Formatiert die geschätzte verbleibende Zeit in ein benutzerfreundliches Format
 * @param seconds - Die verbleibende Zeit in Sekunden
 * @returns Formatierte Zeit als String (z.B. "2 Minuten" oder "30 Sekunden")
 */
const formatTime = (seconds: number): string => {
  if (!seconds || seconds <= 0) return "";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (minutes > 0) {
    if (remainingSeconds > 0) {
      return `${minutes} ${minutes === 1 ? "Minute" : "Minuten"} ${remainingSeconds} ${remainingSeconds === 1 ? "Sekunde" : "Sekunden"}`;
    }
    return `${minutes} ${minutes === 1 ? "Minute" : "Minuten"}`;
  } else {
    return `${remainingSeconds} ${remainingSeconds === 1 ? "Sekunde" : "Sekunden"}`;
  }
};

/**
 * Handler für den Abbrechen-Button
 */
const handleCancel = (): void => {
  emit("cancel");
};

/**
 * Details ein-/ausblenden
 */
const toggleDetails = (): void => {
  showDetailsExpanded.value = !showDetailsExpanded.value;
};

/**
 * Warnungen ein-/ausblenden
 */
const toggleWarnings = (): void => {
  showWarnings.value = !showWarnings.value;
};

/**
 * Warnung als gelesen markieren
 */
const acknowledgeWarning = (warning: ConversionWarning): void => {
  emit("warning-acknowledged", warning);
};

// i18n-Hilfsfunktion (als Polyfill, falls keine i18n-Bibliothek verwendet wird)
const $t = (key: string, fallback: string): string => {
  return fallback;
};

// UI-Verbesserungen bei Fortschrittsänderungen
watch(
  () => props.progress,
  (newProgress, oldProgress) => {
    if (newProgress > oldProgress) {
      // Optionale Animationen oder UI-Feedback hier
    }

    // Automatisches Anzeigen der Details bei bestimmten Meilensteinen
    if (newProgress >= 25 && newProgress < 30 && oldProgress < 25) {
      showDetailsExpanded.value = true;
    }

    // Automatisches Anzeigen der Warnungen, wenn neue hinzukommen
    if (props.warnings.length > 0 && !showWarnings.value) {
      showWarnings.value = true;
    }
  },
);

// Initialisierung der Komponente
onMounted(() => {
  // Initialisierungscode, falls erforderlich
});
</script>

<style scoped>
.conversion-progress {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.conversion-progress__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.conversion-progress__title {
  margin: 0;
  font-size: 1.25rem;
  color: #0d7a40; /* nscale Grün */
  font-weight: 600;
}

.conversion-progress__cancel-btn {
  background: none;
  border: none;
  color: #6c757d;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.conversion-progress__cancel-btn:hover {
  color: #dc3545;
}

.conversion-progress__visualization {
  margin-bottom: 1.5rem;
}

.conversion-progress__steps {
  margin-bottom: 1.5rem;
  position: relative;
}

.conversion-progress__steps--mobile {
  display: none; /* Hide on desktop */
  flex-direction: column;
  gap: 0.75rem;
}

.conversion-progress__steps--desktop {
  display: flex; /* Show on desktop */
  justify-content: space-between;
}

.conversion-progress__steps--desktop::before {
  content: "";
  position: absolute;
  top: 14px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #e9ecef;
  z-index: 1;
}

.conversion-progress__step {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
  width: 16.66%;
}

.conversion-progress__step-icon {
  width: 30px;
  height: 30px;
  background-color: #fff;
  border: 2px solid #ced4da;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  color: #6c757d;
  transition: all 0.3s ease;
}

.conversion-progress__step--completed .conversion-progress__step-icon {
  background-color: #0d7a40;
  border-color: #0d7a40;
  color: white;
}

.conversion-progress__step--active .conversion-progress__step-icon {
  border-color: #0d7a40;
  color: #0d7a40;
}

.conversion-progress__step-label {
  font-size: 0.8rem;
  color: #6c757d;
  text-align: center;
  white-space: nowrap;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversion-progress__step-number {
  display: none; /* Hide on desktop */
  font-weight: 600;
  color: #444;
  margin-right: 0.25rem;
}

.conversion-progress__step--active .conversion-progress__step-label {
  font-weight: 600;
  color: #0d7a40;
}

.conversion-progress__bar-container {
  width: 100%;
  height: 12px;
  background-color: #e9ecef;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.conversion-progress__bar {
  height: 100%;
  background-color: #0d7a40;
  border-radius: 6px;
  transition: width 0.3s ease-in-out;
}

.conversion-progress__progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #6c757d;
}

.conversion-progress__percentage {
  font-weight: 600;
}

.conversion-progress__details {
  margin-bottom: 1.5rem;
}

.conversion-progress__current-operation {
  display: flex;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
}

.conversion-progress__operation-label {
  font-weight: 600;
  margin-right: 0.5rem;
  color: #495057;
  white-space: nowrap;
}

.conversion-progress__operation-text {
  color: #212529;
}

.conversion-progress__additional-info {
  background-color: #f8f9fa;
  border-radius: 6px;
  padding: 0.75rem;
}

.conversion-progress__info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.conversion-progress__info-header span {
  font-weight: 500;
  font-size: 0.9rem;
  color: #495057;
}

.conversion-progress__toggle-details {
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
}

.conversion-progress__details-content {
  font-family: monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  background-color: #fff;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 0.75rem;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
  color: #495057;
}

.conversion-progress__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.conversion-progress__action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.conversion-progress__cancel-action {
  background-color: #e9ecef;
  border: 1px solid #ced4da;
  color: #495057;
}

.conversion-progress__cancel-action:hover:not(:disabled) {
  background-color: #e74c3c;
  border-color: #e74c3c;
  color: white;
}

.conversion-progress__cancel-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.conversion-progress__warning-action {
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  color: #856404;
}

.conversion-progress__warning-action:hover {
  background-color: #ffeeba;
}

.conversion-progress__warnings {
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.conversion-progress__warning-item {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.conversion-progress__warning-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.conversion-progress__warning-icon {
  color: #e67e22;
  font-size: 1.25rem;
  flex-shrink: 0;
  margin-top: 0.2rem;
}

.conversion-progress__warning-message {
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: #856404;
}

.conversion-progress__warning-details {
  font-size: 0.85rem;
  color: #856404;
  opacity: 0.9;
}

/* Responsive Design */
@media (max-width: 768px) {
  .conversion-progress {
    padding: 1.25rem;
    border-radius: 8px;
  }

  .conversion-progress__header {
    margin-bottom: 1.25rem;
  }

  .conversion-progress__title {
    font-size: 1.2rem;
  }

  .conversion-progress__cancel-btn {
    width: 44px; /* Touch-friendly size */
    height: 44px; /* Touch-friendly size */
    font-size: 1.2rem;
  }

  /* Mobile steps visualization */
  .conversion-progress__steps--mobile {
    display: flex; /* Show on mobile */
    padding: 0.75rem;
    background-color: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e9ecef;
  }

  .conversion-progress__steps--desktop {
    display: none; /* Hide on mobile */
  }

  .conversion-progress__step {
    flex-direction: row;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 0;
  }

  .conversion-progress__step-icon {
    font-size: 1.2rem;
    min-width: 44px; /* Touch-friendly size */
    height: 44px; /* Touch-friendly size */
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .conversion-progress__step-label {
    font-size: 0.95rem;
    margin-top: 0;
    text-align: left;
    white-space: normal; /* Allow wrapping on mobile */
    max-width: none;
  }

  .conversion-progress__step-number {
    display: inline-block; /* Show on mobile */
  }

  /* Progress bar improvements */
  .conversion-progress__bar-container {
    height: 12px; /* Taller progress bar */
    margin: 1.5rem 0;
  }

  .conversion-progress__progress-text {
    margin-top: 0.75rem;
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .conversion-progress__percentage {
    font-size: 1.2rem;
    font-weight: 600;
  }

  .conversion-progress__estimated-time {
    font-size: 0.95rem;
    color: #666;
    margin-top: 0.5rem;
    width: 100%;
  }

  /* Operation details */
  .conversion-progress__current-operation {
    flex-direction: column;
    background-color: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.25rem;
  }

  .conversion-progress__operation-label {
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #444;
  }

  .conversion-progress__operation-text {
    font-size: 1rem;
    line-height: 1.4;
  }

  /* Action buttons */
  .conversion-progress__actions {
    flex-direction: column;
    gap: 0.75rem;
  }

  .conversion-progress__action-btn {
    width: 100%;
    justify-content: center;
    height: 44px; /* Touch-friendly height */
    font-size: 1rem;
    border-radius: 8px;
  }

  /* Warnings section */
  .conversion-progress__warnings {
    margin-top: 1.25rem;
  }

  .conversion-progress__warning-item {
    padding: 1rem;
    border-radius: 8px;
  }

  .conversion-progress__warning-icon {
    font-size: 1.5rem;
    margin-right: 1rem;
  }

  /* Details toggle */
  .conversion-progress__toggle-details {
    width: 44px; /* Touch-friendly width */
    height: 44px; /* Touch-friendly height */
    font-size: 1.2rem;
  }
}

/* Small mobile screens */
@media (max-width: 480px) {
  .conversion-progress {
    padding: 1rem;
  }

  .conversion-progress__details-content {
    font-size: 0.8rem;
    max-height: 150px;
  }

  .conversion-progress__info-header {
    font-size: 0.95rem;
  }
}
</style>
