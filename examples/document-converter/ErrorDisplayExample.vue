<template>
  <div class="error-example">
    <h2>Fehlermeldungen für Dokumentenkonverter</h2>
    
    <div class="controls">
      <div class="control-group">
        <label for="error-type">Fehlertyp:</label>
        <select id="error-type" v-model="selectedErrorType">
          <option value="network">Netzwerkfehler</option>
          <option value="format">Dateiformat-Fehler</option>
          <option value="server">Serverfehler</option>
          <option value="permission">Berechtigungsfehler</option>
          <option value="unknown">Unbekannter Fehler</option>
        </select>
      </div>
      
      <div class="control-group">
        <label>Details anzeigen:</label>
        <div class="toggle-wrapper">
          <input 
            type="checkbox" 
            id="show-details" 
            v-model="showDetails"
          >
          <label for="show-details" class="toggle-label"></label>
        </div>
      </div>
      
      <div class="control-group">
        <label>Support-Button anzeigen:</label>
        <div class="toggle-wrapper">
          <input 
            type="checkbox" 
            id="show-support" 
            v-model="showSupport"
          >
          <label for="show-support" class="toggle-label"></label>
        </div>
      </div>
      
      <div class="control-group">
        <label>Fallback-Button anzeigen:</label>
        <div class="toggle-wrapper">
          <input 
            type="checkbox" 
            id="show-fallback" 
            v-model="showFallback"
          >
          <label for="show-fallback" class="toggle-label"></label>
        </div>
      </div>
    </div>
    
    <div class="error-container">
      <ErrorDisplay 
        :error="currentError"
        :error-type="selectedErrorType"
        :show-details="showDetails"
        :can-retry="true"
        :can-contact-support="showSupport"
        :show-fallback-option="showFallback"
        @retry="handleRetry"
        @contact-support="handleContactSupport"
        @fallback="handleFallback"
      />
    </div>
    
    <div v-if="lastAction" class="action-log">
      <h3>Letzte Aktion:</h3>
      <p>{{ lastAction }}</p>
    </div>
    
    <div class="extra-controls">
      <h3>Benutzerdefinierte Fehler</h3>
      <button @click="setSimpleError" class="action-btn">
        Einfache Fehlermeldung
      </button>
      <button @click="setErrorWithDetails" class="action-btn">
        Fehler mit technischen Details
      </button>
      <button @click="setErrorWithResolution" class="action-btn">
        Fehler mit Lösungsvorschlag
      </button>
      <button @click="setComplexError" class="action-btn">
        Komplexes Fehlerobjekt
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import ErrorDisplay, { ErrorType, ErrorObject } from '@/components/admin/document-converter/ErrorDisplay.vue';

// Zustandsvariablen
const selectedErrorType = ref<ErrorType>('network');
const showDetails = ref(false);
const showSupport = ref(false);
const showFallback = ref(false);
const lastAction = ref<string | null>(null);
const customError = ref<Error | ErrorObject | string | null>(null);

// Vordefinierte Fehlermeldungen basierend auf dem Fehlertyp
const errorMessages = {
  network: 'Verbindung zum Konvertierungsserver fehlgeschlagen. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
  format: 'Das Format der Datei "Präsentation.pptx" wird nicht unterstützt oder die Datei ist beschädigt.',
  server: 'Der Dokumentenkonverter-Service ist derzeit nicht verfügbar. Unsere Techniker wurden benachrichtigt.',
  permission: 'Sie haben keine Berechtigung, um Dokumente dieses Typs zu konvertieren. Bitte kontaktieren Sie Ihren Administrator.',
  unknown: 'Bei der Konvertierung ist ein unerwarteter Fehler aufgetreten.'
};

// Stack-Trace für technische Details
const sampleStackTrace = `Error: Konvertierungsfehler
  at DocumentConverter.convertDocument (/opt/nscale-assist/app/src/services/converter.ts:126:23)
  at async ConversionManager.processDocument (/opt/nscale-assist/app/src/managers/conversion.ts:84:18)
  at async DocumentController.handleConversion (/opt/nscale-assist/app/src/controllers/document.ts:57:12)
  at async Router.handleRequest (/opt/nscale-assist/app/src/router.ts:245:10)`;

// Der aktuell anzuzeigende Fehler
const currentError = computed(() => {
  // Wenn ein benutzerdefinierter Fehler gesetzt ist, diesen verwenden
  if (customError.value) {
    return customError.value;
  }
  
  // Ansonsten einen Fehler basierend auf dem ausgewählten Typ zurückgeben
  return errorMessages[selectedErrorType.value] || 'Unbekannter Fehler';
});

// Event-Handler für Retry-Button
function handleRetry(): void {
  lastAction.value = 'Benutzer hat "Erneut versuchen" angeklickt. Die Konvertierung würde neu gestartet werden.';
  // In einer echten Anwendung würde hier die Konvertierung neu gestartet
}

// Event-Handler für Support-Button
function handleContactSupport(): void {
  lastAction.value = 'Benutzer hat "Support kontaktieren" angeklickt. Ein Support-Ticket würde erstellt werden.';
  // In einer echten Anwendung würde hier ein Supportformular angezeigt
}

// Event-Handler für Fallback-Button
function handleFallback(): void {
  lastAction.value = 'Benutzer hat "Einfache Version verwenden" angeklickt. Die vereinfachte Konvertierung würde gestartet.';
  // In einer echten Anwendung würde hier eine alternative Konvertierungsmethode verwendet
}

// Setzt eine einfache Fehlermeldung als String
function setSimpleError(): void {
  customError.value = 'Die Konvertierung der Datei ist fehlgeschlagen.';
  lastAction.value = 'Einfache Fehlermeldung wurde gesetzt';
}

// Setzt einen Fehler mit technischen Details
function setErrorWithDetails(): void {
  const error = new Error('PDF-Konvertierung fehlgeschlagen: Dokument enthält nicht unterstütztes Inhaltsformat');
  error.stack = sampleStackTrace;
  customError.value = error;
  lastAction.value = 'Fehler mit technischen Details wurde gesetzt';
}

// Setzt ein komplexes ErrorObject mit einem Lösungsvorschlag
function setErrorWithResolution(): void {
  customError.value = {
    message: 'Die Konvertierung konnte nicht abgeschlossen werden, da die maximale Größe überschritten wurde.',
    code: 'SIZE_LIMIT_EXCEEDED',
    type: 'format',
    resolution: 'Versuchen Sie die Datei in kleinere Teile aufzuteilen oder verwenden Sie die Komprimierungsoption vor dem Hochladen.'
  };
  lastAction.value = 'Fehler mit Lösungsvorschlag wurde gesetzt';
}

// Setzt ein komplexes Fehlerobjekt mit allen möglichen Details
function setComplexError(): void {
  customError.value = {
    message: 'Kritischer Fehler bei der Konvertierung des Dokumentes',
    code: 'CONVERSION_CRITICAL_ERROR',
    type: 'server',
    details: `{
  "requestId": "conv-2023-05-08-15:42:31-123",
  "httpStatus": 500,
  "errorCode": "INTERNAL_SERVER_ERROR",
  "failedStep": "table-extraction",
  "processingTimeMs": 5432,
  "affectedPages": [3, 7, 12],
  "systemDetails": {
    "serviceVersion": "2.5.0",
    "engineName": "pdfConverter",
    "memory": "85% used",
    "cpuLoad": "High"
  }
}`,
    stack: sampleStackTrace,
    resolution: 'Der Konvertierungsserver hat einen kritischen Fehler gemeldet. Bitte versuchen Sie es später erneut oder kontaktieren Sie unseren technischen Support mit der Fehlernummer conv-2023-05-08-15:42:31-123.'
  };
  lastAction.value = 'Komplexes Fehlerobjekt wurde gesetzt';
}
</script>

<style scoped>
.error-example {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1.5rem;
}

h2 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
}

h3 {
  color: #2c3e50;
  margin-bottom: 1rem;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 2rem;
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-weight: 500;
  font-size: 0.95rem;
}

select {
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.95rem;
  background-color: white;
  min-width: 200px;
}

.error-container {
  margin-bottom: 2rem;
}

.action-log {
  margin-top: 2rem;
  padding: 1rem;
  background-color: #e7f5ff;
  border-radius: 8px;
  border-left: 5px solid #4dabf7;
}

.action-log h3 {
  margin-top: 0;
  color: #1c7ed6;
  font-size: 1.1rem;
}

.action-log p {
  margin: 0;
  font-family: monospace;
  font-size: 0.9rem;
}

.extra-controls {
  margin-top: 2rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.action-btn {
  padding: 0.5rem 1rem;
  background-color: #4a6cf7;
  color: white;
  border: none;
  border-radius: 4px;
  margin-right: 0.75rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.action-btn:hover {
  background-color: #3a5bd9;
}

/* Toggle-Switch für Checkboxen */
.toggle-wrapper {
  position: relative;
  display: inline-block;
}

input[type="checkbox"] {
  height: 0;
  width: 0;
  opacity: 0;
  position: absolute;
}

.toggle-label {
  display: inline-block;
  width: 48px;
  height: 24px;
  background: #e9ecef;
  border-radius: 24px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.2s;
}

.toggle-label:after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}

input:checked + .toggle-label {
  background: #4a6cf7;
}

input:checked + .toggle-label:after {
  transform: translateX(24px);
}

input:focus + .toggle-label {
  box-shadow: 0 0 0 2px rgba(74, 108, 247, 0.5);
}

@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    gap: 1rem;
  }
  
  .control-group {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
</style>