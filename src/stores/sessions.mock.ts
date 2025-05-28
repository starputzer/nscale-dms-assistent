/**
 * Mock-Implementierung des Session-Stores
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { v4 as uuidv4 } from "@/utils/uuidUtil";

// Beispiel-Sessions für den Mock-Store
const MOCK_SESSIONS = [
  {
    id: "1",
    title: "Beispiel-Session 1",
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 Tag zuvor
    updatedAt: new Date(Date.now() - 3600000).toISOString(), // 1 Stunde zuvor
  },
  {
    id: "2",
    title: "Beispiel-Session 2",
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 Tage zuvor
    updatedAt: new Date(Date.now() - 7200000).toISOString(), // 2 Stunden zuvor
  },
];

// Beispiel-Nachrichten für den Mock-Store
const MOCK_MESSAGES = {
  "1": [
    {
      id: "101",
      sessionId: "1",
      text: "Hallo, wie kann ich helfen?",
      is_user: false,
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "102",
      sessionId: "1",
      text: "Ich habe eine Frage zur Dokumentensuche",
      is_user: true,
      timestamp: new Date(Date.now() - 86300000).toISOString(),
    },
    {
      id: "103",
      sessionId: "1",
      text: 'Die Dokumentensuche können Sie über das Menü "Suchen" aufrufen. Dort können Sie nach Dokumenten suchen, indem Sie Stichwörter, Dateinamen oder Dokumenteninhalte eingeben.',
      is_user: false,
      timestamp: new Date(Date.now() - 86200000).toISOString(),
    },
  ],
  "2": [
    {
      id: "201",
      sessionId: "2",
      text: "Guten Tag, wobei kann ich behilflich sein?",
      is_user: false,
      timestamp: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: "202",
      sessionId: "2",
      text: "Wie kann ich Dokumente hochladen?",
      is_user: true,
      timestamp: new Date(Date.now() - 172700000).toISOString(),
    },
    {
      id: "203",
      sessionId: "2",
      text: 'Um Dokumente hochzuladen, klicken Sie auf den Button "Hochladen" in der oberen Menüleiste. Sie können dann Dateien von Ihrem Computer auswählen oder per Drag & Drop in das Uploadfenster ziehen.',
      is_user: false,
      timestamp: new Date(Date.now() - 172600000).toISOString(),
    },
  ],
};

// Mock Session Store mit Original-Namen für bessere Kompatibilität
export const useSessionStore = defineStore("sessions", () => {
  // State
  const sessions = ref([...MOCK_SESSIONS]);
  const messages = ref({ ...MOCK_MESSAGES });
  const currentSessionId = ref("1");
  const isLoading = ref(false);
  const error = ref(null);
  const isStreaming = ref(false);
  const streamedMessageId = ref(null);

  // Computed
  const currentSession = computed(() => {
    return sessions.value.find((s) => s.id === currentSessionId.value) || null;
  });

  // Aktuelle Nachrichten
  const currentMessages = computed(() => {
    return messages.value[currentSessionId.value] || [];
  });

  // Actions
  async function createNewSession() {
    isLoading.value = true;

    try {
      // Simuliere API-Verzögerung
      await new Promise((resolve) => setTimeout(resolve, 500));

      const sessionId = uuidv4();
      const now = new Date().toISOString();

      // Neue Session erstellen
      const newSession = {
        id: sessionId,
        title: "Neue Unterhaltung",
        createdAt: now,
        updatedAt: now,
      };

      sessions.value.push(newSession);
      messages.value[sessionId] = [
        {
          id: uuidv4(),
          sessionId,
          text: "Hallo! Wie kann ich Ihnen heute helfen?",
          is_user: false,
          timestamp: now,
        },
      ];

      // Zur neuen Session wechseln
      currentSessionId.value = sessionId;

      return sessionId;
    } finally {
      isLoading.value = false;
    }
  }

  async function loadSessions() {
    isLoading.value = true;

    try {
      // Simuliere API-Verzögerung
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Wir verwenden die bereits definierten Mock-Sessions
      return sessions.value;
    } finally {
      isLoading.value = false;
    }
  }

  async function loadSession(sessionId) {
    isLoading.value = true;

    try {
      // Simuliere API-Verzögerung
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Session existiert?
      const session = sessions.value.find((s) => s.id === sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} nicht gefunden`);
      }

      // Session aktivieren
      currentSessionId.value = sessionId;

      return session;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteSession(sessionId) {
    isLoading.value = true;

    try {
      // Simuliere API-Verzögerung
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Session aus Liste entfernen
      sessions.value = sessions.value.filter((s) => s.id !== sessionId);

      // Nachrichten entfernen
      if (messages.value[sessionId]) {
        const { [sessionId]: removed, ...rest } = messages.value;
        messages.value = rest;
      }

      // Wenn die aktuelle Session gelöscht wurde, zur ersten verfügbaren wechseln
      if (currentSessionId.value === sessionId) {
        currentSessionId.value =
          sessions.value.length > 0 ? sessions.value[0].id : null;
      }

      return true;
    } finally {
      isLoading.value = false;
    }
  }

  function addMessage(messageObj) {
    const sessionId = currentSessionId.value;

    if (!sessionId) {
      console.error("Keine aktive Session zum Hinzufügen der Nachricht");
      return;
    }

    // Sicherstellen, dass die Session im Nachrichten-Objekt existiert
    if (!messages.value[sessionId]) {
      messages.value[sessionId] = [];
    }

    // Nachricht hinzufügen
    messages.value[sessionId].push(messageObj);

    // Session aktualisieren
    const sessionIndex = sessions.value.findIndex((s) => s.id === sessionId);
    if (sessionIndex !== -1) {
      sessions.value[sessionIndex] = {
        ...sessions.value[sessionIndex],
        updatedAt: new Date().toISOString(),
      };
    }
  }

  function updateStreamedMessage(content) {
    const sessionId = currentSessionId.value;

    if (!sessionId || !messages.value[sessionId]) {
      return;
    }

    // Letzte Nachricht aktualisieren, wenn es eine System-Nachricht ist
    const sessionMessages = messages.value[sessionId];
    const lastIndex = sessionMessages.length - 1;

    if (lastIndex >= 0 && !sessionMessages[lastIndex].is_user) {
      // Bestehende Nachricht aktualisieren
      sessionMessages[lastIndex] = {
        ...sessionMessages[lastIndex],
        text: content,
      };
    } else {
      // Neue System-Nachricht hinzufügen
      addMessage({
        id: uuidv4(),
        sessionId,
        text: content,
        is_user: false,
        timestamp: new Date().toISOString(),
      });
    }
  }

  function clearSessions() {
    sessions.value = [];
    messages.value = {};
    currentSessionId.value = null;
  }

  return {
    // State
    sessions,
    messages,
    currentSessionId,
    isLoading,
    error,
    isStreaming,

    // Computed
    currentSession,
    currentMessages,

    // Actions
    createNewSession,
    loadSessions,
    loadSession,
    deleteSession,
    addMessage,
    updateStreamedMessage,
    clearSessions,
  };
});

// Exportiere auch als useSessionsStore für Kompatibilität mit älterem Code
export const useSessionsStore = useSessionStore;
