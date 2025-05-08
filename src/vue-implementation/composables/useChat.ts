import { ref, computed } from 'vue';
import type { ChatSession, ChatMessage } from '../types';
import { v4 as uuidv4 } from '../utils/uuidUtil';

// Simulierte Antworten vom Assistenten
const ASSISTANT_RESPONSES = [
  "Ich verstehe. Ich bin bereit, dir als Assistent zu helfen. Bitte stelle deine Frage, und ich werde dir eine direkte und kurze Antwort geben.",
  "Die nscale DMS-Software ermöglicht eine strukturierte Dokumentenverwaltung mit umfangreichen Suchfunktionen.",
  "Um einen neuen Benutzer anzulegen, gehen Sie in der nscale Administration auf 'Benutzerverwaltung' und klicken Sie auf 'Neuer Benutzer'.",
  "Die OCR-Funktion von nscale kann Dokumente automatisch textuell erfassen und durchsuchbar machen.",
  "Zur Konfiguration des nscale Servers benötigen Sie Administratorrechte im System."
];

export function useChat() {
  // State
  const sessions = ref<ChatSession[]>([
    {
      id: '1',
      title: 'nscale Installation',
      timestamp: '2025-05-07T14:30:00.000Z',
      isActive: true,
      messages: [
        {
          id: '101',
          text: 'Hallo, wie kann ich Ihnen mit nscale helfen?',
          isAssistant: true,
          timestamp: '2025-05-07T14:30:00.000Z'
        },
        {
          id: '102',
          text: 'Ich benötige Hilfe bei der Installation von nscale.',
          isAssistant: false,
          timestamp: '2025-05-07T14:31:00.000Z'
        },
        {
          id: '103',
          text: ASSISTANT_RESPONSES[0],
          isAssistant: true,
          timestamp: '2025-05-07T14:32:00.000Z'
        }
      ]
    },
    {
      id: '2',
      title: 'Dokumenten-Import',
      timestamp: '2025-05-06T10:15:00.000Z',
      messages: [
        {
          id: '201',
          text: 'Hallo, wie kann ich Ihnen mit nscale helfen?',
          isAssistant: true,
          timestamp: '2025-05-06T10:15:00.000Z'
        },
        {
          id: '202',
          text: 'Wie importiere ich Dokumente in nscale?',
          isAssistant: false,
          timestamp: '2025-05-06T10:16:00.000Z'
        },
        {
          id: '203',
          text: 'Sie können Dokumente über die Import-Funktion oder per Drag & Drop importieren. Was möchten Sie genau wissen?',
          isAssistant: true,
          timestamp: '2025-05-06T10:17:00.000Z'
        }
      ]
    },
    {
      id: '3',
      title: 'Berechtigungen einrichten',
      timestamp: '2025-05-05T09:45:00.000Z',
      messages: [
        {
          id: '301',
          text: 'Hallo, wie kann ich Ihnen mit nscale helfen?',
          isAssistant: true,
          timestamp: '2025-05-05T09:45:00.000Z'
        }
      ]
    }
  ]);

  // Current active session
  const activeSession = computed(() => 
    sessions.value.find(session => session.isActive) || sessions.value[0]
  );

  // Methoden
  const setActiveSession = (sessionId: string) => {
    sessions.value = sessions.value.map(session => ({
      ...session,
      isActive: session.id === sessionId
    }));
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: uuidv4(),
      title: 'Neue Unterhaltung',
      timestamp: new Date().toISOString(),
      isActive: true,
      messages: [
        {
          id: uuidv4(),
          text: 'Hallo, wie kann ich Ihnen mit nscale helfen?',
          isAssistant: true,
          timestamp: new Date().toISOString()
        }
      ]
    };

    // Setze alle Sessions auf inaktiv
    sessions.value = sessions.value.map(session => ({
      ...session,
      isActive: false
    }));

    // Füge neue Session hinzu
    sessions.value.unshift(newSession);
  };

  const deleteSession = (sessionId: string) => {
    const sessionIndex = sessions.value.findIndex(s => s.id === sessionId);
    const isActiveSession = sessions.value[sessionIndex].isActive;
    
    sessions.value = sessions.value.filter(s => s.id !== sessionId);
    
    // Wenn die aktive Session gelöscht wurde, aktiviere die erste Session
    if (isActiveSession && sessions.value.length > 0) {
      sessions.value[0].isActive = true;
    }
  };

  const sendMessage = (text: string) => {
    if (!text.trim() || !activeSession.value) return;

    // Benutzer-Nachricht hinzufügen
    const userMessage: ChatMessage = {
      id: uuidv4(),
      text,
      isAssistant: false,
      timestamp: new Date().toISOString()
    };

    activeSession.value.messages.push(userMessage);
    
    // Simuliere Verzögerung beim Antworten
    setTimeout(() => {
      // Assistenten-Antwort hinzufügen
      const randomIndex = Math.floor(Math.random() * ASSISTANT_RESPONSES.length);
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        text: ASSISTANT_RESPONSES[randomIndex],
        isAssistant: true,
        timestamp: new Date().toISOString()
      };
      
      if (activeSession.value) {
        activeSession.value.messages.push(assistantMessage);
      }
    }, 1000);
  };

  const giveFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    if (!activeSession.value) return;
    
    activeSession.value.messages = activeSession.value.messages.map(message => {
      if (message.id === messageId) {
        return {
          ...message,
          feedback
        };
      }
      return message;
    });
  };

  return {
    sessions,
    activeSession,
    setActiveSession,
    createNewSession,
    deleteSession,
    sendMessage,
    giveFeedback
  };
}