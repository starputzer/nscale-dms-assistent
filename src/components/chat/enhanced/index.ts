/**
 * Exportiert alle verbesserten Chat-Komponenten
 * 
 * Diese Datei dient als zentraler Export-Punkt für alle verbesserten Chat-Komponenten.
 * Sie erleichtert die Verwendung dieser Komponenten in anderen Teilen der Anwendung.
 */

// Komponenten
import VirtualMessageList from './VirtualMessageList.vue';
import EnhancedMessageInput from './EnhancedMessageInput.vue';
import SessionManager from './SessionManager.vue';

// Exportiere alle Komponenten
export {
  VirtualMessageList,
  EnhancedMessageInput,
  SessionManager
};

// Exportiere Standard-Export für modularen Import
export default {
  VirtualMessageList,
  EnhancedMessageInput,
  SessionManager
};