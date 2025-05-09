<template>
  <div 
    class="error-display" 
    :class="`error-display--${errorType}`" 
    role="alert" 
    aria-live="assertive"
  >
    <div class="error-display__header">
      <div class="error-display__title-area">
        <div class="error-display__icon" aria-hidden="true">
          <i :class="errorIcon"></i>
        </div>
        <h3 class="error-display__title">{{ errorTitle }}</h3>
      </div>
      
      <div class="error-display__actions">
        <button 
          v-if="isClosable"
          @click="handleClose" 
          class="error-display__close-btn" 
          aria-label="Fehlermeldung schließen"
        >
          <i class="fa fa-times"></i>
        </button>
      </div>
    </div>
    
    <div class="error-display__content">
      <p class="error-display__message">{{ errorMessage }}</p>
      
      <div v-if="errorDetails && (showDetails || detailsVisible)" class="error-display__details">
        <button 
          class="error-display__toggle-details" 
          @click="toggleDetails"
          :aria-expanded="detailsVisible"
          aria-controls="error-details-content"
        >
          <i :class="detailsVisible ? 'fa fa-chevron-up' : 'fa fa-chevron-down'" aria-hidden="true"></i>
          {{ detailsVisible ? $t('errorDisplay.hideDetails', 'Details ausblenden') : $t('errorDisplay.showDetails', 'Details anzeigen') }}
        </button>
        
        <pre 
          v-if="detailsVisible" 
          id="error-details-content" 
          class="error-display__details-content"
        >{{ errorDetails }}</pre>
      </div>
      
      <div class="error-display__resolution" v-if="errorResolution">
        <h4 class="error-display__resolution-title">{{ $t('errorDisplay.resolutionTitle', 'Lösungsvorschlag') }}</h4>
        <p class="error-display__resolution-text" v-html="formattedResolution"></p>
      </div>

      <div class="error-display__help-items" v-if="helpItems.length > 0">
        <h4 class="error-display__help-title">{{ $t('errorDisplay.helpItemsTitle', 'Mögliche Lösungsschritte') }}</h4>
        <ul class="error-display__help-list">
          <li 
            v-for="(item, index) in helpItems" 
            :key="index" 
            class="error-display__help-item"
          >
            {{ item }}
          </li>
        </ul>
      </div>
      
      <div class="error-display__action-buttons">
        <button
          v-if="canRetry"
          @click="handleRetry"
          class="error-display__action-btn error-display__retry-btn"
          :aria-label="$t('errorDisplay.retryAriaLabel', 'Erneut versuchen')"
        >
          <i class="fa fa-redo" aria-hidden="true"></i> 
          {{ $t('errorDisplay.retry', 'Erneut versuchen') }}
        </button>
        
        <button
          v-if="canContactSupport"
          @click="handleContactSupport"
          class="error-display__action-btn error-display__support-btn"
          :aria-label="$t('errorDisplay.contactSupportAriaLabel', 'Support kontaktieren')"
        >
          <i class="fa fa-headset" aria-hidden="true"></i> 
          {{ $t('errorDisplay.contactSupport', 'Support kontaktieren') }}
        </button>
        
        <button
          v-if="showFallbackOption"
          @click="handleFallback"
          class="error-display__action-btn error-display__fallback-btn"
          :aria-label="$t('errorDisplay.fallbackAriaLabel', 'Alternative Version verwenden')"
        >
          <i class="fa fa-file-alt" aria-hidden="true"></i> 
          {{ $t('errorDisplay.fallback', 'Alternative Version verwenden') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

/**
 * Mögliche Fehlertypen im Dokumentenkonverter
 */
export type ErrorType = 'network' | 'format' | 'server' | 'permission' | 'validation' | 'timeout' | 'unknown';

/**
 * Interface für strukturierte Fehlerobjekte
 */
export interface ErrorObject {
  message: string;
  code?: string;
  details?: string;
  type?: ErrorType;
  stack?: string;
  resolution?: string;
  helpItems?: string[];
}

/**
 * Props-Definition für die ErrorDisplay-Komponente
 */
interface Props {
  /** Der anzuzeigende Fehler (Error-Objekt, ErrorObject oder String) */
  error: Error | ErrorObject | string;
  
  /** Ob technische Details standardmäßig angezeigt werden sollen */
  showDetails?: boolean;
  
  /** Art des Fehlers für visuelle Unterscheidung */
  errorType?: ErrorType;
  
  /** Ob ein Wiederholungsversuch möglich ist */
  canRetry?: boolean;
  
  /** Ob die Option zum Kontaktieren des Supports angezeigt werden soll */
  canContactSupport?: boolean;
  
  /** Ob eine Fallback-Option angezeigt werden soll */
  showFallbackOption?: boolean;
  
  /** Ob die Komponente schließbar ist */
  isClosable?: boolean;
  
  /** Zusätzliche Lösungsvorschläge */
  helpItems?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: false,
  errorType: 'unknown',
  canRetry: true,
  canContactSupport: false,
  showFallbackOption: false,
  isClosable: false,
  helpItems: () => []
});

const emit = defineEmits<{
  (e: 'retry'): void;
  (e: 'contact-support'): void;
  (e: 'fallback'): void;
  (e: 'close'): void;
}>();

// Lokaler Zustand
const detailsVisible = ref(false);

/**
 * Berechnet den Fehlertyp aus dem Fehler oder verwendet den übergebenen Typ
 */
const errorType = computed((): ErrorType => {
  // Wenn ein Typ explizit als Prop angegeben wurde, diesen verwenden
  if (props.errorType !== 'unknown') {
    return props.errorType;
  }
  
  // Versuche, den Fehlertyp aus dem Fehler selbst zu bestimmen
  if (typeof props.error === 'object' && props.error !== null) {
    // Für ErrorObject-Objekte
    if ('type' in props.error && typeof props.error.type === 'string') {
      const type = props.error.type as string;
      if (['network', 'format', 'server', 'permission', 'validation', 'timeout'].includes(type)) {
        return type as ErrorType;
      }
    }
    
    // Versuche, den Typ aus der Fehlermeldung zu ermitteln
    const errorMessage = getErrorMessage(props.error);
    
    if (typeof errorMessage === 'string') {
      const messageLower = errorMessage.toLowerCase();
      
      if (messageLower.includes('netzwerk') || 
          messageLower.includes('network') ||
          messageLower.includes('verbindung') ||
          messageLower.includes('connection')) {
        return 'network';
      }
      
      if (messageLower.includes('format') || 
          messageLower.includes('typ') ||
          messageLower.includes('konvertierung')) {
        return 'format';
      }
      
      if (messageLower.includes('server') ||
          messageLower.includes('dienst') ||
          messageLower.includes('service')) {
        return 'server';
      }
      
      if (messageLower.includes('berechtigung') ||
          messageLower.includes('permission') ||
          messageLower.includes('zugriff') ||
          messageLower.includes('access')) {
        return 'permission';
      }
      
      if (messageLower.includes('validierung') ||
          messageLower.includes('validation') ||
          messageLower.includes('gültig') ||
          messageLower.includes('valid')) {
        return 'validation';
      }
      
      if (messageLower.includes('timeout') ||
          messageLower.includes('zeitüberschreitung') ||
          messageLower.includes('zu lange')) {
        return 'timeout';
      }
    }
    
    // Für JavaScript Error-Objekte
    if (props.error instanceof Error) {
      const errorName = props.error.name;
      if (errorName === 'NetworkError' || errorName === 'AbortError') {
        return 'network';
      }
      if (errorName === 'TimeoutError') {
        return 'timeout';
      }
    }
  }
  
  return 'unknown';
});

/**
 * Bestimmt das anzuzeigende Icon basierend auf dem Fehlertyp
 */
const errorIcon = computed(() => {
  const iconMap: Record<ErrorType, string> = {
    network: 'fa fa-wifi',
    format: 'fa fa-file-excel',
    server: 'fa fa-server',
    permission: 'fa fa-lock',
    validation: 'fa fa-exclamation-triangle',
    timeout: 'fa fa-clock',
    unknown: 'fa fa-exclamation-circle'
  };
  
  return iconMap[errorType.value];
});

/**
 * Extrahiert den Fehlertitel basierend auf dem Fehlertyp und Code
 */
const errorTitle = computed(() => {
  // Prüfe, ob ein spezifischer Titel im Fehlerobjekt existiert
  if (typeof props.error === 'object' && props.error !== null && 'code' in props.error) {
    const code = props.error.code;
    
    if (code === 'FILE_FORMAT_ERROR') {
      return $t('errorDisplay.fileFormatError', 'Fehler beim Dateiformat');
    }
    if (code === 'SERVER_ERROR') {
      return $t('errorDisplay.serverError', 'Serverfehler');
    }
    if (code === 'NETWORK_ERROR') {
      return $t('errorDisplay.networkError', 'Netzwerkfehler');
    }
    if (code === 'PERMISSION_ERROR') {
      return $t('errorDisplay.permissionError', 'Berechtigungsfehler');
    }
    if (code === 'VALIDATION_ERROR') {
      return $t('errorDisplay.validationError', 'Validierungsfehler');
    }
    if (code === 'TIMEOUT_ERROR') {
      return $t('errorDisplay.timeoutError', 'Zeitüberschreitung');
    }
    if (code === 'CONVERSION_FAILED') {
      return $t('errorDisplay.conversionError', 'Konvertierungsfehler');
    }
  }
  
  // Fallback auf typenbasierte Titel
  const titleMap: Record<ErrorType, string> = {
    network: $t('errorDisplay.networkProblem', 'Netzwerkfehler'),
    format: $t('errorDisplay.formatProblem', 'Dateiformat-Fehler'),
    server: $t('errorDisplay.serverProblem', 'Serverfehler'),
    permission: $t('errorDisplay.permissionProblem', 'Berechtigungsfehler'),
    validation: $t('errorDisplay.validationProblem', 'Validierungsfehler'),
    timeout: $t('errorDisplay.timeoutProblem', 'Zeitüberschreitung'),
    unknown: $t('errorDisplay.unknownProblem', 'Fehler aufgetreten')
  };
  
  return titleMap[errorType.value];
});

/**
 * Extrahiert die benutzerfreundliche Fehlermeldung aus dem Fehler
 */
const errorMessage = computed((): string => {
  return getErrorMessage(props.error);
});

/**
 * Helper-Funktion zum Extrahieren der Fehlermeldung aus verschiedenen Fehlertypen
 */
function getErrorMessage(error: Error | ErrorObject | string): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message || $t('errorDisplay.defaultMessage', 'Ein unerwarteter Fehler ist aufgetreten.');
  }
  
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return error.message as string || $t('errorDisplay.defaultMessage', 'Ein unerwarteter Fehler ist aufgetreten.');
  }
  
  return $t('errorDisplay.defaultMessage', 'Ein unerwarteter Fehler ist aufgetreten.');
}

/**
 * Extrahiert technische Details aus dem Fehler, falls vorhanden
 */
const errorDetails = computed((): string | null => {
  // Für Standard-Error-Objekte
  if (props.error instanceof Error && props.error.stack) {
    return props.error.stack;
  }
  
  // Für angepasste ErrorObject-Objekte
  if (typeof props.error === 'object' && props.error !== null) {
    if ('details' in props.error && props.error.details) {
      return props.error.details as string;
    }
    
    if ('stack' in props.error && props.error.stack) {
      return props.error.stack as string;
    }
    
    // Für API-Fehler oder andere strukturierte Fehler ohne spezifische Details
    try {
      return JSON.stringify(props.error, null, 2);
    } catch (e) {
      // Falls JSON-Serialisierung fehlschlägt
      return String(props.error);
    }
  }
  
  return null;
});

/**
 * Lösungsvorschläge basierend auf dem Fehlertyp
 */
const errorResolution = computed((): string | null => {
  // Prüfe, ob eine spezifische Resolution im Fehlerobjekt existiert
  if (typeof props.error === 'object' && props.error !== null && 'resolution' in props.error) {
    return props.error.resolution as string || null;
  }
  
  // Fallback auf typenbasierte Lösungsvorschläge
  const resolutionMap: Record<ErrorType, string> = {
    network: $t('errorDisplay.networkResolution', 'Überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut. Bei anhaltenden Problemen kontaktieren Sie bitte den Support.'),
    format: $t('errorDisplay.formatResolution', 'Die hochgeladene Datei hat ein nicht unterstütztes Format oder ist beschädigt. Versuchen Sie, die Datei in einem anderen Format zu speichern oder eine andere Datei zu verwenden.'),
    server: $t('errorDisplay.serverResolution', 'Der Server konnte die Anfrage nicht verarbeiten. Bitte versuchen Sie es später erneut oder wenden Sie sich an den Support, wenn das Problem bestehen bleibt.'),
    permission: $t('errorDisplay.permissionResolution', 'Sie haben nicht die erforderlichen Berechtigungen für diese Aktion. Wenden Sie sich an Ihren Administrator, um die entsprechenden Rechte zu erhalten.'),
    validation: $t('errorDisplay.validationResolution', 'Bitte überprüfen Sie die Eingabedaten auf Fehler und stellen Sie sicher, dass alle erforderlichen Felder ausgefüllt sind.'),
    timeout: $t('errorDisplay.timeoutResolution', 'Die Operation hat zu lange gedauert und wurde abgebrochen. Bitte versuchen Sie es später erneut oder mit einer kleineren Datei.'),
    unknown: $t('errorDisplay.unknownResolution', 'Bitte versuchen Sie es erneut oder wenden Sie sich an den Support, wenn das Problem bestehen bleibt.')
  };
  
  return resolutionMap[errorType.value];
});

/**
 * Formatiert den Lösungsvorschlag für HTML-Anzeige
 */
const formattedResolution = computed(() => {
  if (!errorResolution.value) return '';
  
  // Einfache Formatierung für URLs
  return errorResolution.value
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n/g, '<br>');
});

/**
 * Extrahiert Lösungsschritte aus dem Fehler, falls vorhanden
 */
const helpItems = computed((): string[] => {
  // Prüfe, ob spezifische Hilfspunkte im Fehlerobjekt existieren
  if (typeof props.error === 'object' && props.error !== null && 'helpItems' in props.error) {
    const items = props.error.helpItems as string[] | undefined;
    if (Array.isArray(items)) {
      return items;
    }
  }
  
  // Sonst die aus den Props verwenden
  return props.helpItems;
});

/**
 * Schaltet die Anzeige technischer Details um
 */
function toggleDetails(): void {
  detailsVisible.value = !detailsVisible.value;
}

/**
 * Löst das retry-Event aus
 */
function handleRetry(): void {
  emit('retry');
}

/**
 * Löst das contact-support-Event aus
 */
function handleContactSupport(): void {
  emit('contact-support');
}

/**
 * Löst das fallback-Event aus
 */
function handleFallback(): void {
  emit('fallback');
}

/**
 * Löst das close-Event aus
 */
function handleClose(): void {
  emit('close');
}

/**
 * i18n-Hilfsfunktion
 */
function $t(key: string, fallback: string): string {
  return fallback;
}

// Initialisierung
onMounted(() => {
  // Automatisches Anzeigen der Details bei bestimmten Fehlertypen
  if (errorType.value === 'server' || errorType.value === 'unknown') {
    detailsVisible.value = props.showDetails;
  }
});
</script>

<style scoped>
.error-display {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  margin-bottom: 1.5rem;
  overflow: hidden;
  position: relative;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Fehlertyp-spezifische Stile */
.error-display--network {
  border-left: 5px solid #4dabf7;
}

.error-display--format {
  border-left: 5px solid #fab005;
}

.error-display--server {
  border-left: 5px solid #fa5252;
}

.error-display--permission {
  border-left: 5px solid #7950f2;
}

.error-display--validation {
  border-left: 5px solid #ff922b;
}

.error-display--timeout {
  border-left: 5px solid #74c0fc;
}

.error-display--unknown {
  border-left: 5px solid #adb5bd;
}

.error-display__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  background-color: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.error-display__title-area {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.error-display__icon {
  font-size: 1.5rem;
}

.error-display--network .error-display__icon { color: #4dabf7; }
.error-display--format .error-display__icon { color: #fab005; }
.error-display--server .error-display__icon { color: #fa5252; }
.error-display--permission .error-display__icon { color: #7950f2; }
.error-display--validation .error-display__icon { color: #ff922b; }
.error-display--timeout .error-display__icon { color: #74c0fc; }
.error-display--unknown .error-display__icon { color: #adb5bd; }

.error-display__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #343a40;
}

.error-display__close-btn {
  background: none;
  border: none;
  color: #adb5bd;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.error-display__close-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #495057;
}

.error-display__content {
  padding: 1.5rem;
}

.error-display__message {
  margin: 0 0 1.25rem;
  font-size: 1rem;
  line-height: 1.5;
  color: #495057;
}

.error-display__details {
  margin-bottom: 1.25rem;
}

.error-display__toggle-details {
  background: none;
  border: none;
  padding: 0;
  color: #6c757d;
  font-size: 0.9rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.error-display__toggle-details:hover {
  color: #343a40;
}

.error-display__details-content {
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  white-space: pre-wrap;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
  color: #495057;
  margin: 0;
}

.error-display__resolution {
  margin-bottom: 1.25rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #0d7a40;
}

.error-display__resolution-title {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #343a40;
}

.error-display__resolution-text {
  margin: 0;
  line-height: 1.5;
  color: #495057;
}

.error-display__resolution-text a {
  color: #0d7a40;
  text-decoration: none;
}

.error-display__resolution-text a:hover {
  text-decoration: underline;
}

.error-display__help-items {
  margin-bottom: 1.25rem;
}

.error-display__help-title {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  color: #343a40;
}

.error-display__help-list {
  margin: 0;
  padding-left: 1.5rem;
}

.error-display__help-item {
  margin-bottom: 0.5rem;
  color: #495057;
  line-height: 1.5;
}

.error-display__help-item:last-child {
  margin-bottom: 0;
}

.error-display__action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.error-display__action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.error-display__retry-btn {
  background-color: #0d7a40;
  color: white;
}

.error-display__retry-btn:hover {
  background-color: #0a6032;
}

.error-display__support-btn {
  background-color: #f8f9fa;
  border-color: #ced4da;
  color: #495057;
}

.error-display__support-btn:hover {
  background-color: #e9ecef;
}

.error-display__fallback-btn {
  background-color: #fff3bf;
  color: #e67700;
  border-color: #ffec99;
}

.error-display__fallback-btn:hover {
  background-color: #ffec99;
}

@media (max-width: 768px) {
  .error-display__header {
    padding: 1rem;
  }
  
  .error-display__content {
    padding: 1rem;
  }
  
  .error-display__action-buttons {
    flex-direction: column;
  }
  
  .error-display__action-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>