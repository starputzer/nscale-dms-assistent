<template>
  <div class="conversion-progress" role="region" aria-live="polite" aria-label="Dokumentenkonvertierungsfortschritt">
    <div class="progress-bar-container">
      <div 
        class="progress-bar" 
        :style="{ width: `${progress}%` }" 
        role="progressbar" 
        :aria-valuenow="progress" 
        aria-valuemin="0" 
        aria-valuemax="100"
      ></div>
    </div>
    
    <div class="progress-info">
      <span class="progress-percentage">{{ progress }}%</span>
      <span v-if="estimatedTimeRemaining > 0" class="estimated-time">
        {{ $t('converter.estimatedTimeRemaining', { time: formatTime(estimatedTimeRemaining) }) }}
      </span>
    </div>
    
    <div class="conversion-details" v-if="currentStep">
      <p class="current-step">{{ currentStep }}</p>
      <p v-if="details" class="conversion-details-text">{{ details }}</p>
    </div>
    
    <div class="actions">
      <button 
        class="cancel-button" 
        @click="handleCancel" 
        :disabled="progress >= 100"
        aria-label="Konvertierung abbrechen"
      >
        {{ $t('converter.cancelConversion') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';

// Definiere die Props mit TypeScript-Typen
interface Props {
  progress: number;
  currentStep: string;
  estimatedTimeRemaining: number;
  details?: string;
}

const props = withDefaults(defineProps<Props>(), {
  progress: 0,
  currentStep: 'Dokument wird konvertiert...',
  estimatedTimeRemaining: 0,
  details: ''
});

// Definiere die Emits
const emit = defineEmits<{
  (e: 'cancel'): void;
}>();

/**
 * Formatiert die geschätzte verbleibende Zeit in ein benutzerfreundliches Format
 * @param seconds - Die verbleibende Zeit in Sekunden
 * @returns Formatierte Zeit als String (z.B. "2 Minuten" oder "30 Sekunden")
 */
const formatTime = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (minutes > 0) {
    if (remainingSeconds > 0) {
      return `${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'} ${remainingSeconds} ${remainingSeconds === 1 ? 'Sekunde' : 'Sekunden'}`;
    }
    return `${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`;
  } else {
    return `${remainingSeconds} ${remainingSeconds === 1 ? 'Sekunde' : 'Sekunden'}`;
  }
};

/**
 * Handler für den Abbrechen-Button
 */
const handleCancel = (): void => {
  emit('cancel');
};

// i18n-Polyfill, falls keine i18n-Bibliothek im Projekt verwendet wird
const $t = (key: string, params: Record<string, any> = {}): string => {
  const messages: Record<string, string> = {
    'converter.estimatedTimeRemaining': 'Geschätzte verbleibende Zeit: {time}',
    'converter.cancelConversion': 'Konvertierung abbrechen'
  };
  
  let result = messages[key] || key;
  
  // Parameter ersetzen
  Object.entries(params).forEach(([param, value]) => {
    result = result.replace(`{${param}}`, String(value));
  });
  
  return result;
};

// Animation für fließenden Übergang
watch(() => props.progress, (newValue, oldValue) => {
  if (newValue > oldValue) {
    // Optionaler Animation-Code hier möglich
  }
});
</script>

<style scoped>
.conversion-progress {
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 1.5rem;
}

.progress-bar-container {
  width: 100%;
  height: 12px;
  background-color: #e9ecef;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.progress-bar {
  height: 100%;
  background-color: #4a6cf7;
  border-radius: 6px;
  transition: width 0.3s ease-in-out;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #6c757d;
  margin-bottom: 1rem;
}

.progress-percentage {
  font-weight: 600;
}

.conversion-details {
  font-size: 0.85rem;
  color: #495057;
  background-color: #e9ecef;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.current-step {
  margin: 0;
  font-weight: 500;
}

.conversion-details-text {
  margin-top: 0.5rem;
  margin-bottom: 0;
  font-family: monospace;
  font-size: 0.8rem;
  white-space: pre-wrap;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.cancel-button {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.cancel-button:hover {
  background-color: #c0392b;
}

.cancel-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.3);
}

.cancel-button:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}
</style>