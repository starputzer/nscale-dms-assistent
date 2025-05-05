// ConversionProgress.vue
<template>
  <div class="conversion-progress">
    <div v-if="error" class="error-container">
      <div class="error-icon">
        <i class="fas fa-exclamation-circle"></i>
      </div>
      <div class="error-content">
        <h3 class="error-title">Fehler bei der Konvertierung</h3>
        <p class="error-message">{{ error }}</p>
        <button class="retry-button" @click="$emit('retry')">
          <i class="fas fa-redo-alt"></i>
          Erneut versuchen
        </button>
      </div>
    </div>
    
    <div v-else class="progress-container">
      <div class="progress-header">
        <h3 class="progress-title">Dokumente werden konvertiert</h3>
        <div class="progress-percentage">{{ Math.round(progress) }}%</div>
      </div>
      
      <div class="progress-bar-container">
        <div 
          class="progress-bar" 
          :style="{ width: `${progress}%` }"
          :class="{ 'complete': progress >= 100 }"
        ></div>
      </div>
      
      <div class="progress-details">
        <div v-if="currentFile" class="current-file">
          <i class="fas fa-file-alt"></i>
          <span>{{ currentFile }}</span>
        </div>
        <div v-else class="preparing">
          <i class="fas fa-cog fa-spin"></i>
          <span>Bereite Konvertierung vor...</span>
        </div>
      </div>
      
      <div class="actions">
        <button class="cancel-button" @click="$emit('cancel')">
          <i class="fas fa-times"></i>
          Abbrechen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Props
const props = defineProps({
  progress: {
    type: Number,
    default: 0
  },
  currentFile: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: null
  }
});

// Emits
defineEmits(['cancel', 'retry']);
</script>

<style scoped>
.conversion-progress {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  padding: 2rem;
  width: 100%;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.progress-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--nscale-dark-gray);
}

.progress-percentage {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--nscale-primary);
}

.progress-bar-container {
  height: 12px;
  background-color: var(--nscale-gray-light);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-bar {
  height: 100%;
  background-color: var(--nscale-primary);
  border-radius: 6px;
  transition: width 0.3s ease;
}

.progress-bar.complete {
  background-color: #22c55e; /* Grün für abgeschlossen */
}

.progress-details {
  margin-bottom: 1.5rem;
  min-height: 24px;
}

.current-file, .preparing {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  color: var(--nscale-gray-dark);
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.cancel-button {
  background-color: transparent;
  color: var(--nscale-gray-dark);
  border: 1px solid var(--nscale-gray-medium);
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cancel-button:hover {
  background-color: var(--nscale-gray-light);
  color: var(--nscale-red);
  border-color: var(--nscale-red-light);
}

/* Fehlerstil */
.error-container {
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem;
  background-color: var(--nscale-red-light);
  border-radius: 8px;
  border-left: 4px solid var(--nscale-red);
}

.error-icon {
  font-size: 2rem;
  color: var(--nscale-red);
}

.error-content {
  flex: 1;
}

.error-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--nscale-red);
  margin-bottom: 0.5rem;
}

.error-message {
  font-size: 0.95rem;
  color: var(--nscale-dark-gray);
  margin-bottom: 1rem;
}

.retry-button {
  background-color: var(--nscale-primary);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.retry-button:hover {
  background-color: var(--nscale-primary-dark);
  transform: translateY(-1px);
}

/* Dark Mode Anpassungen */
:global(.theme-dark) .conversion-progress {
  background-color: #1e1e1e;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

:global(.theme-dark) .progress-title {
  color: #f0f0f0;
}

:global(.theme-dark) .progress-percentage {
  color: #00c060;
}

:global(.theme-dark) .progress-bar-container {
  background-color: #333;
}

:global(.theme-dark) .progress-bar {
  background-color: #00c060;
}

:global(.theme-dark) .progress-bar.complete {
  background-color: #22c55e;
}

:global(.theme-dark) .current-file,
:global(.theme-dark) .preparing {
  color: #aaa;
}

:global(.theme-dark) .cancel-button {
  color: #aaa;
  border-color: #555;
}

:global(.theme-dark) .cancel-button:hover {
  background-color: #333;
  color: #ff4d4d;
  border-color: #662222;
}

:global(.theme-dark) .error-container {
  background-color: rgba(229, 62, 62, 0.1);
  border-left-color: #e53e3e;
}

:global(.theme-dark) .error-title {
  color: #ff4d4d;
}

:global(.theme-dark) .error-message {
  color: #f0f0f0;
}

:global(.theme-dark) .retry-button {
  background-color: #00c060;
}

:global(.theme-dark) .retry-button:hover {
  background-color: #00a550;
}

/* Kontrast-Modus Anpassungen */
:global(.theme-contrast) .conversion-progress {
  background-color: #000000;
  border: 2px solid #ffeb3b;
  box-shadow: 0 4px 15px rgba(255, 235, 59, 0.2);
}

:global(.theme-contrast) .progress-title,
:global(.theme-contrast) .progress-percentage {
  color: #ffeb3b;
}

:global(.theme-contrast) .progress-bar-container {
  background-color: #333300;
  border: 1px solid #ffeb3b;
}

:global(.theme-contrast) .progress-bar {
  background-color: #ffeb3b;
}

:global(.theme-contrast) .progress-bar.complete {
  background-color: #ffeb3b;
}

:global(.theme-contrast) .current-file,
:global(.theme-contrast) .preparing {
  color: #ffffff;
}

:global(.theme-contrast) .cancel-button {
  color: #ffeb3b;
  border: 2px solid #ffeb3b;
  background-color: #000000;
}

:global(.theme-contrast) .cancel-button:hover {
  background-color: #333300;
  color: #ff4444;
  border-color: #ff4444;
}

:global(.theme-contrast) .error-container {
  background-color: #330000;
  border: 2px solid #ff4444;
  border-left-width: 4px;
}

:global(.theme-contrast) .error-icon,
:global(.theme-contrast) .error-title {
  color: #ff4444;
}

:global(.theme-contrast) .error-message {
  color: #ffffff;
}

:global(.theme-contrast) .retry-button {
  background-color: #ffeb3b;
  color: #000000;
  font-weight: bold;
}

:global(.theme-contrast) .retry-button:hover {
  background-color: #ffd600;
}
</style>