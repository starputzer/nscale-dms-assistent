<template>
  <div
    class="n-progress"
    :class="[
      `n-progress--${type}`,
      `n-progress--${size}`,
      { 'n-progress--indeterminate': indeterminate },
      { 'n-progress--with-label': showLabel },
      customClass,
    ]"
    :role="getAriaRole()"
    :aria-valuenow="indeterminate ? undefined : value"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuetext="ariaValueText"
    :aria-label="ariaLabel"
  >
    <!-- Linearer Fortschrittsbalken -->
    <template v-if="type === 'linear'">
      <div class="n-progress__track">
        <div class="n-progress__fill" :style="linearProgressStyle"></div>

        <div v-if="showSteps && steps.length > 0" class="n-progress__steps">
          <div
            v-for="(step, index) in normalizedSteps"
            :key="index"
            class="n-progress__step"
            :class="{
              'n-progress__step--active': value >= step.value,
              'n-progress__step--current': currentStepIndex === index,
            }"
            :style="{ left: `${getStepPosition(step.value)}%` }"
            :title="step.label"
          >
            <div
              v-if="step.label && showStepLabels"
              class="n-progress__step-label"
            >
              {{ step.label }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="showLabel" class="n-progress__label">
        <slot name="label">
          {{ displayLabel }}
        </slot>
      </div>

      <div v-if="description" class="n-progress__description">
        {{ description }}
      </div>
    </template>

    <!-- Zirkulärer Fortschrittsbalken -->
    <template v-else-if="type === 'circular'">
      <svg class="n-progress__circular" viewBox="0 0 36 36">
        <circle
          class="n-progress__track-circle"
          cx="18"
          cy="18"
          :r="16"
          fill="none"
          :stroke-width="circularStrokeWidth"
        ></circle>

        <circle
          class="n-progress__fill-circle"
          cx="18"
          cy="18"
          :r="16"
          fill="none"
          :stroke-width="circularStrokeWidth"
          :stroke-dasharray="`${getCircleCircumference()}`"
          :stroke-dashoffset="getCircleDashOffset()"
          transform="rotate(-90 18 18)"
        ></circle>
      </svg>

      <div
        v-if="showLabel || $slots.center"
        class="n-progress__circular-center"
      >
        <slot name="center">
          {{ displayLabel }}
        </slot>
      </div>

      <div v-if="description" class="n-progress__description">
        {{ description }}
      </div>
    </template>

    <!-- Segmentierter Fortschrittsbalken -->
    <template v-else-if="type === 'segmented'">
      <div class="n-progress__segments">
        <div
          v-for="index in segmentCount"
          :key="index"
          class="n-progress__segment"
          :class="{
            'n-progress__segment--active': getSegmentActive(index),
          }"
        ></div>
      </div>

      <div v-if="showLabel" class="n-progress__label">
        <slot name="label">
          {{ displayLabel }}
        </slot>
      </div>

      <div v-if="description" class="n-progress__description">
        {{ description }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, PropType } from "vue";

/**
 * Schritt in einem Fortschrittsbalken
 */
export interface ProgressStep {
  /**
   * Wert des Schritts
   */
  value: number;

  /**
   * Label des Schritts
   */
  label?: string;

  /**
   * Status des Schritts (completed, current, upcoming)
   */
  status?: "completed" | "current" | "upcoming";
}

/**
 * Typen des Fortschrittsbalkens
 */
export type ProgressType = "linear" | "circular" | "segmented";

/**
 * Größen des Fortschrittsbalkens
 */
export type ProgressSize = "small" | "medium" | "large";

/**
 * Eigenschaften für ProgressIndicator
 */
export interface ProgressIndicatorProps {
  /**
   * Aktueller Wert des Fortschrittsbalkens
   */
  value?: number;

  /**
   * Minimaler Wert
   */
  min?: number;

  /**
   * Maximaler Wert
   */
  max?: number;

  /**
   * Ob der Fortschritt unbestimmt ist
   */
  indeterminate?: boolean;

  /**
   * Typ des Fortschrittsbalkens
   */
  type?: ProgressType;

  /**
   * Größe des Fortschrittsbalkens
   */
  size?: ProgressSize;

  /**
   * Ob das Label angezeigt werden soll
   */
  showLabel?: boolean;

  /**
   * Ob der Wert in Prozent angezeigt werden soll
   */
  showPercentage?: boolean;

  /**
   * Format des Labels
   */
  labelFormat?: string;

  /**
   * Beschreibungstext
   */
  description?: string;

  /**
   * Farbe des Fortschrittsbalkens
   */
  color?: string;

  /**
   * Hintergrundfarbe des Fortschrittsbalkens
   */
  trackColor?: string;

  /**
   * Schritte im Fortschrittsbalken
   */
  steps?: ProgressStep[];

  /**
   * Ob Schritte angezeigt werden sollen
   */
  showSteps?: boolean;

  /**
   * Ob Labels für die Schritte angezeigt werden sollen
   */
  showStepLabels?: boolean;

  /**
   * ARIA-Label
   */
  ariaLabel?: string;

  /**
   * ARIA-ValueText
   */
  ariaValueText?: string;

  /**
   * Anzahl der Segmente (für segmented type)
   */
  segmentCount?: number;

  /**
   * Anpassbare CSS-Klasse
   */
  customClass?: string;

  /**
   * Strichstärke des zirkulären Fortschrittsbalkens
   */
  circularStrokeWidth?: number;

  /**
   * Animation verzögern (ms)
   */
  animationDelay?: number;
}

// Default-Werte definieren
const props = withDefaults(defineProps<ProgressIndicatorProps>(), {
  value: 0,
  min: 0,
  max: 100,
  indeterminate: false,
  type: "linear",
  size: "medium",
  showLabel: false,
  showPercentage: true,
  showSteps: true,
  showStepLabels: false,
  segmentCount: 5,
  circularStrokeWidth: 3,
  animationDelay: 300,
});

/**
 * Berechnet den normalisierten Wert zwischen 0 und 100
 */
const normalizedValue = computed((): number => {
  if (props.indeterminate) return 0;

  // Begrenze den Wert zwischen min und max
  const boundedValue = Math.max(props.min, Math.min(props.max, props.value));

  // Normalisiere auf 0-100
  const range = props.max - props.min;
  return range <= 0 ? 0 : ((boundedValue - props.min) / range) * 100;
});

/**
 * Style für linearen Fortschrittsbalken
 */
const linearProgressStyle = computed(() => {
  return {
    width: props.indeterminate ? undefined : `${normalizedValue.value}%`,
    backgroundColor: props.color,
  };
});

/**
 * Gibt das anzuzeigende Label zurück
 */
const displayLabel = computed((): string => {
  if (props.indeterminate) return "";

  if (props.showPercentage) {
    return `${Math.round(normalizedValue.value)}%`;
  }

  if (props.labelFormat) {
    // Einfache Formatierung mit {value}, {min}, {max}, {percent}
    return props.labelFormat
      .replace("{value}", props.value.toString())
      .replace("{min}", props.min.toString())
      .replace("{max}", props.max.toString())
      .replace("{percent}", Math.round(normalizedValue.value).toString());
  }

  return props.value.toString();
});

/**
 * Normalisiert die Steps für die Anzeige
 */
const normalizedSteps = computed((): ProgressStep[] => {
  if (!props.steps || props.steps.length === 0) return [];

  return props.steps.map((step) => ({
    ...step,
    value: Math.max(props.min, Math.min(props.max, step.value)),
  }));
});

/**
 * Bestimmt den aktuellen Schritt-Index
 */
const currentStepIndex = computed((): number => {
  if (!props.steps || props.steps.length === 0) return -1;

  // Finde den Schritt mit Status 'current'
  const currentStepByStatus = props.steps.findIndex(
    (step) => step.status === "current",
  );
  if (currentStepByStatus !== -1) return currentStepByStatus;

  // Finde den nächsten Schritt basierend auf dem aktuellen Wert
  for (let i = 0; i < props.steps.length; i++) {
    if (props.value < props.steps[i].value) {
      return i > 0 ? i - 1 : 0;
    }
  }

  return props.steps.length - 1;
});

/**
 * Berechnet die Position eines Schritts in Prozent
 */
function getStepPosition(value: number): number {
  const range = props.max - props.min;
  if (range <= 0) return 0;

  return ((value - props.min) / range) * 100;
}

/**
 * Gibt den ARIA-Role für den Fortschrittsbalken zurück
 */
function getAriaRole(): string {
  return props.indeterminate ? "progressbar" : "progressbar";
}

/**
 * Berechnet den Umfang des Kreises für zirkulären Fortschrittsbalken
 */
function getCircleCircumference(): number {
  // 2 * PI * r
  return 2 * Math.PI * 16;
}

/**
 * Berechnet den Stroke-Dashoffset für zirkulären Fortschrittsbalken
 */
function getCircleDashOffset(): number {
  const circumference = getCircleCircumference();
  if (props.indeterminate) return 0;

  // Der Offset wird relativ zum Umfang berechnet
  // 100% = kein Offset, 0% = voller Offset
  return circumference * (1 - normalizedValue.value / 100);
}

/**
 * Prüft, ob ein Segment aktiviert ist
 */
function getSegmentActive(index: number): boolean {
  if (props.indeterminate) {
    // Bei indeterminate: Animiere die Segmente
    return true;
  }

  // Berechne, wie viele Segmente aktiviert sein sollten
  const activeSegments = Math.round(
    (normalizedValue.value / 100) * props.segmentCount,
  );
  return index <= activeSegments;
}
</script>

<style scoped>
.n-progress {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  position: relative;
}

/* Linearer Fortschrittsbalken */
.n-progress--linear .n-progress__track {
  width: 100%;
  height: var(--n-progress-height, 8px);
  background-color: var(--n-progress-track-color, #e2e8f0);
  border-radius: var(--n-progress-border-radius, 4px);
  overflow: hidden;
  position: relative;
}

.n-progress--linear .n-progress__fill {
  height: 100%;
  background-color: var(--n-progress-color, #3b82f6);
  border-radius: var(--n-progress-border-radius, 4px);
  transition: width 0.3s ease;
}

/* Größenvarianten für linearen Fortschrittsbalken */
.n-progress--linear.n-progress--small .n-progress__track {
  height: var(--n-progress-height-small, 4px);
}

.n-progress--linear.n-progress--large .n-progress__track {
  height: var(--n-progress-height-large, 12px);
}

/* Zirkulärer Fortschrittsbalken */
.n-progress--circular {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  width: auto;
}

.n-progress__circular {
  transform: rotate(-90deg);
  transition: transform 0.3s ease;
}

.n-progress--circular.n-progress--small .n-progress__circular {
  width: var(--n-progress-circular-size-small, 30px);
  height: var(--n-progress-circular-size-small, 30px);
}

.n-progress--circular.n-progress--medium .n-progress__circular {
  width: var(--n-progress-circular-size-medium, 48px);
  height: var(--n-progress-circular-size-medium, 48px);
}

.n-progress--circular.n-progress--large .n-progress__circular {
  width: var(--n-progress-circular-size-large, 64px);
  height: var(--n-progress-circular-size-large, 64px);
}

.n-progress__track-circle {
  stroke: var(--n-progress-track-color, #e2e8f0);
}

.n-progress__fill-circle {
  stroke: var(--n-progress-color, #3b82f6);
  transition: stroke-dashoffset 0.3s ease;
}

.n-progress__circular-center {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75em;
  font-weight: 500;
}

/* Segmentierter Fortschrittsbalken */
.n-progress--segmented .n-progress__segments {
  display: flex;
  width: 100%;
  gap: 4px;
}

.n-progress__segment {
  flex: 1;
  height: var(--n-progress-height, 8px);
  background-color: var(--n-progress-track-color, #e2e8f0);
  border-radius: var(--n-progress-border-radius, 4px);
  transition: background-color 0.3s ease;
}

.n-progress__segment--active {
  background-color: var(--n-progress-color, #3b82f6);
}

.n-progress--segmented.n-progress--small .n-progress__segment {
  height: var(--n-progress-height-small, 4px);
}

.n-progress--segmented.n-progress--large .n-progress__segment {
  height: var(--n-progress-height-large, 12px);
}

/* Schritte */
.n-progress__steps {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 0;
}

.n-progress__step {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: var(--n-progress-track-color, #e2e8f0);
  border: 2px solid var(--n-progress-track-color, #e2e8f0);
  transform: translate(-50%, -50%);
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
  z-index: 1;
}

.n-progress__step--active {
  background-color: var(--n-progress-color, #3b82f6);
  border-color: var(--n-progress-color, #3b82f6);
}

.n-progress__step--current {
  background-color: white;
  border-color: var(--n-progress-color, #3b82f6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

.n-progress__step-label {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.75rem;
  white-space: nowrap;
  color: var(--n-text-secondary-color, #718096);
}

/* Labels und Beschreibungen */
.n-progress__label {
  margin-top: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--n-text-color, #1a202c);
}

.n-progress__description {
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--n-text-secondary-color, #718096);
}

/* Unbestimmter Zustand */
.n-progress--indeterminate .n-progress__fill {
  width: 40%;
  animation: n-progress-indeterminate 1.5s infinite ease-in-out;
  transform-origin: left center;
}

.n-progress--indeterminate .n-progress__fill-circle {
  animation: n-progress-circular-indeterminate 1.5s infinite linear;
}

.n-progress--indeterminate .n-progress__segment--active {
  animation: n-progress-segment-pulse 1.5s infinite ease-in-out;
}

@keyframes n-progress-indeterminate {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes n-progress-circular-indeterminate {
  0% {
    stroke-dasharray: 1, 100;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 80, 100;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 1, 100;
    stroke-dashoffset: -100;
  }
}

@keyframes n-progress-segment-pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .n-progress__fill,
  .n-progress__fill-circle,
  .n-progress__step,
  .n-progress__segment {
    transition: none !important;
  }

  .n-progress--indeterminate .n-progress__fill,
  .n-progress--indeterminate .n-progress__fill-circle,
  .n-progress--indeterminate .n-progress__segment--active {
    animation-duration: 10s !important;
  }
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  .n-progress__track,
  .n-progress__track-circle,
  .n-progress__segment,
  .n-progress__step {
    background-color: var(--n-progress-track-color-dark, #2d3748);
  }

  .n-progress__step {
    border-color: var(--n-progress-track-color-dark, #2d3748);
  }

  .n-progress__step--current {
    background-color: var(--n-background-color-dark, #1a202c);
  }

  .n-progress__label {
    color: var(--n-text-color-dark, #f7fafc);
  }

  .n-progress__description,
  .n-progress__step-label {
    color: var(--n-text-secondary-color-dark, #a0aec0);
  }
}
</style>
