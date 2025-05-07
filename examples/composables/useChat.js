// composables/useChat.js
import { ref, computed } from 'vue';
import { useSessionStore } from '@/stores/session';
import { useAuthStore } from '@/stores/auth';

export function useChat() {
  // Store-Referenzen
  const sessionStore = useSessionStore();
  const authStore = useAuthStore();
  
  // Lokaler Zustand
  const lastTypingTime = ref(0);
  const typingTimeout = ref(null);
  const isUserTyping = ref(false);
  
  // Computed
  const canSendMessage = computed(() => {
    return authStore.isAuthenticated && 
           sessionStore.currentSessionId !== null && 
           !sessionStore.isLoading;
  });
  
  // Methoden
  /**
   * Nachricht senden
   * @param {string} message - Die zu sendende Nachricht
   */
  const sendMessage = async (message) => {
    if (!message.trim() || !canSendMessage.value) return;
    
    await sessionStore.sendMessage(message);
    return true;
  };
  
  /**
   * Verarbeite Tippaktivität
   * Sendet ein Signal, dass der Benutzer gerade tippt
   */
  const handleTyping = () => {
    const now = Date.now();
    lastTypingTime.value = now;
    
    if (!isUserTyping.value) {
      isUserTyping.value = true;
      // TODO: Implement signaling to indicate user is typing
    }
    
    // Zurücksetzen des Typing-Status nach Inaktivität
    clearTimeout(typingTimeout.value);
    typingTimeout.value = setTimeout(() => {
      const typingTimer = now;
      const timeDiff = typingTimer - lastTypingTime.value;
      if (timeDiff >= 3000 && isUserTyping.value) {
        isUserTyping.value = false;
        // TODO: Implement signaling to indicate user stopped typing
      }
    }, 3000);
  };
  
  /**
   * Nachrichtenverlauf nach unten scrollen
   * @param {Element} container - Das Container-Element, das gescrollt werden soll
   */
  const scrollToBottom = (container) => {
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };
  
  /**
   * Chat-Verlauf löschen
   */
  const clearChat = async () => {
    await sessionStore.startNewSession();
  };
  
  /**
   * Nachricht mit Klick auf Eingabetaste senden
   * @param {Event} event - Das Tastaturevent
   * @param {string} message - Die zu sendende Nachricht
   */
  const handleKeyDown = (event, message) => {
    // Prüfen, ob es sich um die Eingabetaste handelt und ob nicht gleichzeitig Shift gedrückt wird
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(message);
      return true;
    }
    return false;
  };
  
  // Bereinigungsfunktion
  const cleanup = () => {
    if (typingTimeout.value) {
      clearTimeout(typingTimeout.value);
    }
  };
  
  return {
    // Zustand
    isUserTyping,
    canSendMessage,
    
    // Methoden
    sendMessage,
    handleTyping,
    scrollToBottom,
    clearChat,
    handleKeyDown,
    cleanup
  };
}