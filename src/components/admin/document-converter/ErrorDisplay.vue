<template>
  <div 
    class="error-display" 
    :class="`error-display--${errorType}`" 
    role="alert" 
    aria-live="assertive"
  >
    <div class="error-icon" aria-hidden="true">
      <i :class="errorIcon"></i>
    </div>
    <div class="error-content">
      <h3 class="error-title">{{ errorTitle }}</h3>
      <p class="error-message">{{ errorMessage }}</p>
      
      <div v-if="errorDetails && (showDetails || detailsVisible)" class="error-details">
        <button 
          class="toggle-details-btn" 
          @click="toggleDetails"
          :aria-expanded="detailsVisible"
          aria-controls="error-details-content"
        >
          {{ $t(detailsVisible ? 'errorDisplay.hideDetails' : 'errorDisplay.showDetails') }}
        </button>
        
        <pre 
          v-if="detailsVisible" 
          id="error-details-content" 
          class="error-details-content"
        >{{ errorDetails }}</pre>
      </div>
      
      <div class="error-resolution" v-if="errorResolution">
        <h4 class="resolution-title">{{ $t('errorDisplay.resolutionTitle') }}</h4>
        <p class="resolution-text">{{ errorResolution }}</p>
      </div>
      
      <div class="error-actions">
        <button
          v-if="canRetry"
          @click="handleRetry"
          class="retry-btn"
          :aria-label="$t('errorDisplay.retryAriaLabel')"
        >
          <i class="fa fa-redo" aria-hidden="true"></i> 
          {{ $t('errorDisplay.retry') }}
        </button>
        
        <button
          v-if="canContactSupport"
          @click="handleContactSupport"
          class="support-btn"
          :aria-label="$t('errorDisplay.contactSupportAriaLabel')"
        >
          <i class="fa fa-headset" aria-hidden="true"></i> 
          {{ $t('errorDisplay.contactSupport') }}
        </button>
        
        <button
          v-if="showFallbackOption"
          @click="handleFallback"
          class="fallback-btn"
          :aria-label="$t('errorDisplay.fallbackAriaLabel')"
        >
          <i class="fa fa-file-alt" aria-hidden="true"></i> 
          {{ $t('errorDisplay.fallback') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

/**
 * Mögliche Fehlertypen im Dokumentenkonverter
 */
export type ErrorType = 'network' | 'format' | 'server' | 'permission' | 'unknown';

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
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: false,
  errorType: 'unknown',
  canRetry: true,
  canContactSupport: false,
  showFallbackOption: false
});

const emit = defineEmits<{
  (e: 'retry'): void;
  (e: 'contact-support'): void;
  (e: 'fallback'): void;
}>();

// Lokaler Zustand
const detailsVisible = ref(false);

/**
 * Berechnet den Fehlertyp aus dem Fehler oder verwendet den übergebenen Typ
 */
const resolvedErrorType = computed((): ErrorType => {
  // Wenn ein Typ explizit als Prop angegeben wurde, diesen verwenden
  if (props.errorType !== 'unknown') {
    return props.errorType;
  }
  
  // Versuche, den Fehlertyp aus dem Fehler selbst zu bestimmen
  if (typeof props.error === 'object' && props.error !== null) {
    // Für ErrorObject-Objekte
    if ('type' in props.error && typeof props.error.type === 'string') {
      const type = props.error.type as string;
      if (['network', 'format', 'server', 'permission'].includes(type)) {
        return type as ErrorType;
      }
    }
    
    // Versuche, den Typ aus der Fehlermeldung zu ermitteln
    const errorMessage = 'message' in props.error ? props.error.message : '';
    
    if (typeof errorMessage === 'string') {
      if (errorMessage.toLowerCase().includes('netzwerk') || 
          errorMessage.toLowerCase().includes('network') ||
          errorMessage.toLowerCase().includes('verbindung') ||
          errorMessage.toLowerCase().includes('connection')) {
        return 'network';
      }
      
      if (errorMessage.toLowerCase().includes('format') || 
          errorMessage.toLowerCase().includes('datei') ||
          errorMessage.toLowerCase().includes('file') ||
          errorMessage.toLowerCase().includes('konvertierung')) {
        return 'format';
      }
      
      if (errorMessage.toLowerCase().includes('server') ||
          errorMessage.toLowerCase().includes('dienst') ||
          errorMessage.toLowerCase().includes('service')) {
        return 'server';
      }
      
      if (errorMessage.toLowerCase().includes('berechtigung') ||
          errorMessage.toLowerCase().includes('permission') ||
          errorMessage.toLowerCase().includes('zugriff') ||
          errorMessage.toLowerCase().includes('access')) {
        return 'permission';
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
    unknown: 'fa fa-exclamation-circle'
  };
  
  return iconMap[resolvedErrorType.value];
});

/**
 * Extrahiert den Fehlertitel basierend auf dem Fehlertyp
 */
const errorTitle = computed(() => {
  // Prüfe, ob ein spezifischer Titel im Fehlerobjekt existiert
  if (typeof props.error === 'object' && props.error !== null && 'code' in props.error) {
    const code = props.error.code;
    
    if (code === 'FILE_FORMAT_ERROR') {
      return $t('errorDisplay.fileFormatError');
    }
    if (code === 'SERVER_ERROR') {
      return $t('errorDisplay.serverError');
    }
    if (code === 'NETWORK_ERROR') {
      return $t('errorDisplay.networkError');
    }
    if (code === 'PERMISSION_ERROR') {
      return $t('errorDisplay.permissionError');
    }
  }
  
  // Fallback auf typenbasierte Titel
  const titleMap: Record<ErrorType, string> = {
    network: $t('errorDisplay.networkProblem'),
    format: $t('errorDisplay.formatProblem'),
    server: $t('errorDisplay.serverProblem'),
    permission: $t('errorDisplay.permissionProblem'),
    unknown: $t('errorDisplay.unknownProblem')
  };
  
  return titleMap[resolvedErrorType.value];
});

/**
 * Extrahiert die benutzerfreundliche Fehlermeldung aus dem Fehler
 */
const errorMessage = computed((): string => {
  if (typeof props.error === 'string') {
    return props.error;
  }
  
  if (props.error instanceof Error) {
    return props.error.message || $t('errorDisplay.defaultMessage');
  }
  
  if (typeof props.error === 'object' && props.error !== null && 'message' in props.error) {
    return props.error.message as string || $t('errorDisplay.defaultMessage');
  }
  
  return $t('errorDisplay.defaultMessage');
});

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
    network: $t('errorDisplay.networkResolution'),
    format: $t('errorDisplay.formatResolution'),
    server: $t('errorDisplay.serverResolution'),
    permission: $t('errorDisplay.permissionResolution'),
    unknown: $t('errorDisplay.unknownResolution')
  };
  
  return resolutionMap[resolvedErrorType.value];
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
 * i18n-Fallback für Texte
 */
function $t(key: string): string {
  const messages: Record<string, string> = {
    'errorDisplay.networkProblem': 'Netzwerkfehler',
    'errorDisplay.formatProblem': 'Dateiformat-Fehler',
    'errorDisplay.serverProblem': 'Serverfehler',
    'errorDisplay.permissionProblem': 'Berechtigungsfehler',
    'errorDisplay.unknownProblem': 'Fehler aufgetreten',
    
    'errorDisplay.fileFormatError': 'Fehler beim Dateiformat',
    'errorDisplay.serverError': 'Serverfehler',
    'errorDisplay.networkError': 'Netzwerkfehler',
    'errorDisplay.permissionError': 'Berechtigungsfehler',
    
    'errorDisplay.defaultMessage': 'Ein unerwarteter Fehler ist aufgetreten.',
    
    'errorDisplay.networkResolution': 'Überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut. Bei anhaltenden Problemen kontaktieren Sie bitte den Support.',
    'errorDisplay.formatResolution': 'Die hochgeladene Datei hat ein nicht unterstütztes Format oder ist beschädigt. Versuchen Sie, die Datei in einem anderen Format zu speichern oder eine andere Datei zu verwenden.',
    'errorDisplay.serverResolution': 'Der Server konnte die Anfrage nicht verarbeiten. Bitte versuchen Sie es später erneut oder wenden Sie sich an den Support, wenn das Problem bestehen bleibt.',
    'errorDisplay.permissionResolution': 'Sie haben nicht die erforderlichen Berechtigungen für diese Aktion. Wenden Sie sich an Ihren Administrator, um die entsprechenden Rechte zu erhalten.',
    'errorDisplay.unknownResolution': 'Bitte versuchen Sie es erneut oder wenden Sie sich an den Support, wenn das Problem bestehen bleibt.',
    
    'errorDisplay.resolutionTitle': 'Lösungsvorschlag',
    'errorDisplay.showDetails': 'Technische Details anzeigen',
    'errorDisplay.hideDetails': 'Technische Details ausblenden',
    'errorDisplay.retry': 'Erneut versuchen',
    'errorDisplay.contactSupport': 'Support kontaktieren',
    'errorDisplay.fallback': 'Einfache Version verwenden',
    
    'errorDisplay.retryAriaLabel': 'Aktion erneut versuchen',
    'errorDisplay.contactSupportAriaLabel': 'Support über dieses Problem kontaktieren',
    'errorDisplay.fallbackAriaLabel': 'Alternative Version mit eingeschränkter Funktionalität verwenden'
  };
  
  return messages[key] || key;
}
</script>

<style scoped>
.error-display {
  display: flex;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
}

/* Fehlertyp-spezifische Stile */
.error-display--network {
  background-color: #e7f5ff;
  border-left: 5px solid #4dabf7;
  color: #1c7ed6;
}

.error-display--format {
  background-color: #fff3bf;
  border-left: 5px solid #fab005;
  color: #e67700;
}

.error-display--server {
  background-color: #ffe3e3;
  border-left: 5px solid #fa5252;
  color: #c92a2a;
}

.error-display--permission {
  background-color: #e5dbff;
  border-left: 5px solid #7950f2;
  color: #5f3dc4;
}

.error-display--unknown {
  background-color: #f8f9fa;
  border-left: 5px solid #adb5bd;
  color: #495057;
}

.error-icon {
  font-size: 2.25rem;
  margin-right: 1.5rem;
  display: flex;
  align-items: flex-start;
  padding-top: 0.25rem;
}

.error-content {
  flex: 1;
  min-width: 0;
}

.error-title {
  margin: 0 0 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
}

.error-message {
  margin: 0 0 1rem;
  line-height: 1.5;
  color: #495057;
}

.error-details {
  margin: 1rem 0;
  position: relative;
}

.toggle-details-btn {
  background: none;
  border: none;
  padding: 0.375rem 0.75rem;
  color: inherit;
  font-size: 0.875rem;
  cursor: pointer;
  text-decoration: underline;
  margin-left: -0.75rem;
  display: inline-flex;
  align-items: center;
}

.toggle-details-btn:hover {
  text-decoration: none;
}

.toggle-details-btn::before {
  content: "";
  display: inline-block;
  width: 0;
  height: 0;
  border-style: solid;
  margin-right: 0.375rem;
}

.toggle-details-btn[aria-expanded="true"]::before {
  border-width: 6px 4px 0 4px;
  border-color: currentColor transparent transparent transparent;
}

.toggle-details-btn[aria-expanded="false"]::before {
  border-width: 4px 0 4px 6px;
  border-color: transparent transparent transparent currentColor;
}

.error-details-content {
  margin-top: 0.75rem;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.04);
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  overflow-x: auto;
  color: #495057;
  max-height: 300px;
  overflow-y: auto;
}

.error-resolution {
  background-color: rgba(255, 255, 255, 0.5);
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
}

.resolution-title {
  font-size: 1rem;
  margin: 0 0 0.5rem;
  font-weight: 600;
}

.resolution-text {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
}

.error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.retry-btn, 
.support-btn, 
.fallback-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 4px;
  font-size: 0.95rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.retry-btn {
  background-color: #fff;
  border-color: currentColor;
}

.retry-btn:hover {
  background-color: rgba(255, 255, 255, 0.8);
}

.support-btn {
  background-color: rgba(0, 0, 0, 0.05);
  color: #495057;
}

.support-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.fallback-btn {
  background-color: rgba(0, 0, 0, 0.05);
  color: #495057;
}

.fallback-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

/* Fokus-Stile für Barrierefreiheit */
.toggle-details-btn:focus,
.retry-btn:focus,
.support-btn:focus,
.fallback-btn:focus {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .error-display {
    flex-direction: column;
    padding: 1.25rem;
  }
  
  .error-icon {
    margin-right: 0;
    margin-bottom: 1rem;
    justify-content: center;
  }
  
  .error-actions {
    justify-content: center;
  }
}
</style>