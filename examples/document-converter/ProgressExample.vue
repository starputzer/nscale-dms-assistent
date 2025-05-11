<template>
  <div class="conversion-example">
    <h2>Dokumentenkonvertierung</h2>

    <ConversionProgress
      :progress="conversionState.progress"
      :current-step="conversionState.currentStep"
      :estimated-time-remaining="conversionState.timeRemaining"
      :details="conversionState.details"
      @cancel="handleCancelConversion"
    />

    <div class="demo-controls">
      <h3>Demo-Steuerung</h3>
      <div class="control-group">
        <label for="progress-slider"
          >Fortschritt: {{ conversionState.progress }}%</label
        >
        <input
          id="progress-slider"
          type="range"
          min="0"
          max="100"
          v-model.number="conversionState.progress"
        />
      </div>

      <div class="control-group">
        <label for="time-slider"
          >Verbleibende Zeit:
          {{ conversionState.timeRemaining }} Sekunden</label
        >
        <input
          id="time-slider"
          type="range"
          min="0"
          max="300"
          v-model.number="conversionState.timeRemaining"
        />
      </div>

      <div class="control-group">
        <label for="step-select">Aktueller Schritt:</label>
        <select id="step-select" v-model="conversionState.currentStep">
          <option value="Dokument wird konvertiert...">
            Dokument wird konvertiert...
          </option>
          <option value="Extrahiere Text aus PDF...">
            Extrahiere Text aus PDF...
          </option>
          <option value="Analysiere Dokumentstruktur...">
            Analysiere Dokumentstruktur...
          </option>
          <option value="Tabellen werden erkannt...">
            Tabellen werden erkannt...
          </option>
          <option value="Wandle Inhalt in Textformat um...">
            Wandle Inhalt in Textformat um...
          </option>
          <option value="Optimiere Ausgabe...">Optimiere Ausgabe...</option>
          <option value="Finalisiere Konvertierung...">
            Finalisiere Konvertierung...
          </option>
        </select>
      </div>

      <div class="control-group">
        <label for="details-input">Details:</label>
        <textarea
          id="details-input"
          v-model="conversionState.details"
          rows="3"
          placeholder="Optionale Details zur Konvertierung"
        ></textarea>
      </div>

      <div class="demo-buttons">
        <button @click="startDemoProgress">Demo starten</button>
        <button @click="resetDemoProgress">Zurücksetzen</button>
      </div>
    </div>

    <div v-if="cancelRequested" class="cancel-notification">
      Konvertierung wurde abgebrochen!
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import ConversionProgress from "@/components/admin/document-converter/ConversionProgress.vue";

// Status der Konvertierung
const conversionState = reactive({
  progress: 0,
  currentStep: "Dokument wird konvertiert...",
  timeRemaining: 120,
  details: "",
});

// Flag für Abbruch-Benachrichtigung
const cancelRequested = ref(false);

// Demo-Konversionsprozess
let demoInterval: number | null = null;

// Startet eine Demo-Konvertierung
const startDemoProgress = () => {
  // Zurücksetzen, falls schon gestartet
  if (demoInterval) {
    clearInterval(demoInterval);
  }

  cancelRequested.value = false;
  conversionState.progress = 0;
  conversionState.timeRemaining = 120;

  // Schritte für die Demo-Konvertierung
  const steps = [
    { progress: 5, step: "Dokument wird analysiert..." },
    { progress: 15, step: "Extrahiere Text aus PDF..." },
    { progress: 35, step: "Analysiere Dokumentstruktur..." },
    { progress: 55, step: "Tabellen werden erkannt..." },
    { progress: 75, step: "Wandle Inhalt in Textformat um..." },
    { progress: 90, step: "Optimiere Ausgabe..." },
    { progress: 98, step: "Finalisiere Konvertierung..." },
    { progress: 100, step: "Konvertierung abgeschlossen!" },
  ];

  let currentStepIndex = 0;

  // Simuliert den Fortschritt
  demoInterval = window.setInterval(() => {
    // Schrittweise Erhöhung des Fortschritts
    if (conversionState.progress < 100) {
      conversionState.progress += 1;

      // Zeit verringert sich mit dem Fortschritt
      if (conversionState.timeRemaining > 0) {
        conversionState.timeRemaining = Math.max(
          0,
          120 - Math.floor(conversionState.progress * 1.2),
        );
      }

      // Aktualisiert den Schritt basierend auf dem Fortschritt
      if (
        currentStepIndex < steps.length &&
        conversionState.progress >= steps[currentStepIndex].progress
      ) {
        conversionState.currentStep = steps[currentStepIndex].step;

        // Fügt Details hinzu
        if (currentStepIndex > 0) {
          conversionState.details = `Schritt ${currentStepIndex + 1}/${steps.length}\nVerarbeite Seite ${currentStepIndex * 2 + 1}`;
        }

        currentStepIndex++;
      }

      // Schließt die Demo ab
      if (conversionState.progress >= 100) {
        conversionState.progress = 100;
        conversionState.timeRemaining = 0;
        conversionState.details =
          "Alle Seiten erfolgreich konvertiert. Dokument bereit.";
        clearInterval(demoInterval!);
        demoInterval = null;
      }
    } else {
      clearInterval(demoInterval!);
      demoInterval = null;
    }
  }, 150);
};

// Setzt die Demo zurück
const resetDemoProgress = () => {
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
  }

  conversionState.progress = 0;
  conversionState.currentStep = "Dokument wird konvertiert...";
  conversionState.timeRemaining = 120;
  conversionState.details = "";
  cancelRequested.value = false;
};

// Handler für Abbrech-Button-Klick
const handleCancelConversion = () => {
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
  }

  cancelRequested.value = true;
  conversionState.progress = 0;
  conversionState.currentStep = "Konvertierung abgebrochen";
  conversionState.timeRemaining = 0;
  conversionState.details = "Die Konvertierung wurde vom Benutzer abgebrochen.";
};
</script>

<style scoped>
.conversion-example {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

h2 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
}

.demo-controls {
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.control-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

input[type="range"] {
  width: 100%;
  margin-top: 0.5rem;
}

select,
textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
}

.demo-buttons {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

button {
  padding: 0.5rem 1rem;
  background-color: #4a6cf7;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

button:hover {
  background-color: #3b5bd9;
}

.cancel-notification {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: #e74c3c;
  color: white;
  border-radius: 4px;
  text-align: center;
  font-weight: 500;
}
</style>
