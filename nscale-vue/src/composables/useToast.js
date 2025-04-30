// composables/useToast.js
import { ref, computed } from 'vue';

// Globale Zustände für alle Toast-Benachrichtigungen
const toasts = ref([]);
const toastIdCounter = ref(0);

/**
 * Composable für Toast-Benachrichtigungen
 * Ermöglicht das Anzeigen von temporären Benachrichtigungen
 */
export function useToast() {
  /**
   * Erstellt und zeigt eine neue Toast-Benachrichtigung an
   * 
   * @param {string} message - Anzuzeigender Text
   * @param {string} type - Art der Benachrichtigung: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Anzeigedauer in Millisekunden (Standard: 5000ms)
   * @param {boolean} dismissible - Ob der Toast manuell geschlossen werden kann (Standard: true)
   * @returns {number} - ID des erstellten Toasts
   */
  const showToast = (message, type = 'info', duration = 5000, dismissible = true) => {
    // Inkrementiere den Zähler für eindeutige IDs
    const id = ++toastIdCounter.value;
    
    // Toast-Objekt erstellen
    const toast = {
      id,
      message,
      type,
      dismissible,
      visible: true,
      progress: 100, // Fortschrittsbalken für die verbleibende Zeit
    };
    
    // Toast zum Array hinzufügen
    toasts.value.push(toast);
    
    // Automatisches Ausblenden nach der angegebenen Dauer
    if (duration > 0) {
      // Start-Zeit speichern
      const startTime = Date.now();
      const endTime = startTime + duration;
      
      // Aktualisiere den Fortschrittsbalken alle 16ms (ca. 60fps)
      const progressInterval = setInterval(() => {
        const currentTime = Date.now();
        const remainingTime = Math.max(0, endTime - currentTime);
        const progress = (remainingTime / duration) * 100;
        
        // Finde den Toast im Array und aktualisiere den Fortschritt
        const index = toasts.value.findIndex(t => t.id === id);
        if (index !== -1) {
          toasts.value[index].progress = progress;
        }
        
        // Wenn die Zeit abgelaufen ist, stoppe das Intervall
        if (remainingTime <= 0) {
          clearInterval(progressInterval);
        }
      }, 16);
      
      // Timeout für das Ausblenden des Toasts
      setTimeout(() => {
        dismissToast(id);
        clearInterval(progressInterval);
      }, duration);
    }
    
    return id;
  };
  
  /**
   * Schließt einen bestimmten Toast
   * 
   * @param {number} id - ID des zu schließenden Toasts
   */
  const dismissToast = (id) => {
    const index = toasts.value.findIndex(toast => toast.id === id);
    if (index !== -1) {
      // Auf unsichtbar setzen, damit die Ausblend-Animation gestartet werden kann
      toasts.value[index].visible = false;
      
      // Nach der Animation aus dem Array entfernen
      setTimeout(() => {
        toasts.value = toasts.value.filter(toast => toast.id !== id);
      }, 300); // Entspricht der Dauer der CSS-Transition
    }
  };
  
  /**
   * Schließt alle aktiven Toasts
   */
  const dismissAllToasts = () => {
    toasts.value.forEach(toast => {
      dismissToast(toast.id);
    });
  };
  
  /**
   * Kurzform für Success-Toast
   */
  const showSuccessToast = (message, duration = 5000, dismissible = true) => {
    return showToast(message, 'success', duration, dismissible);
  };
  
  /**
   * Kurzform für Error-Toast
   */
  const showErrorToast = (message, duration = 5000, dismissible = true) => {
    return showToast(message, 'error', duration, dismissible);
  };
  
  /**
   * Kurzform für Warning-Toast
   */
  const showWarningToast = (message, duration = 5000, dismissible = true) => {
    return showToast(message, 'warning', duration, dismissible);
  };
  
  /**
   * Kurzform für Info-Toast
   */
  const showInfoToast = (message, duration = 5000, dismissible = true) => {
    return showToast(message, 'info', duration, dismissible);
  };
  
  // Gebe die Funktionen und reaktive Variablen zurück
  return {
    // Hauptfunktionen
    showToast,
    dismissToast,
    dismissAllToasts,
    
    // Kurzformen
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    showInfoToast,
    
    // Toast-Datenreferenz
    toasts
  };
}

/**
 * ToastContainer-Komponente für die Anzeige aller Toasts
 * Diese Komponente sollte einmal in der App.vue eingebunden werden
 */
export function useToastContainer() {
  return {
    toasts
  };
}