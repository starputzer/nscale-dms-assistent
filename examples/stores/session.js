// stores/session.js
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axios from "axios";
import { useAuthStore } from "./auth";

export const useSessionStore = defineStore("session", () => {
  // Auth Store für Token-Zugriff
  const authStore = useAuthStore();

  // State
  const sessions = ref([]);
  const currentSessionId = ref(null);
  const messages = ref([]);
  const isLoading = ref(false);
  const isStreaming = ref(false);
  const eventSource = ref(null);

  // Getter
  const currentSession = computed(() => {
    return sessions.value.find((s) => s.id === currentSessionId.value) || null;
  });

  // Actions
  // Sessions laden
  const loadSessions = async () => {
    if (!authStore.token) return;

    try {
      const response = await axios.get("/api/sessions", {
        headers: { Authorization: `Bearer ${authStore.token}` },
      });

      if (response.data.success) {
        // Sortiere Sessions nach letzter Änderung (neueste zuerst)
        sessions.value = response.data.sessions.sort((a, b) => {
          return new Date(b.modified) - new Date(a.modified);
        });
      }
    } catch (error) {
      console.error("Fehler beim Laden der Sessions:", error);
    }
  };

  // Session laden
  const loadSession = async (sessionId) => {
    if (!authStore.token || !sessionId) return;

    try {
      isLoading.value = true;
      currentSessionId.value = sessionId;

      const response = await axios.get(`/api/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      });

      if (response.data.success) {
        messages.value = response.data.messages || [];
        // Speichere sessionId in localStorage für die nächste Anmeldung
        localStorage.setItem("last_session_id", sessionId);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Session:", error);
    } finally {
      isLoading.value = false;
    }
  };

  // Neue Session starten
  const startNewSession = async () => {
    if (!authStore.token) return;

    try {
      isLoading.value = true;

      const response = await axios.post(
        "/api/sessions",
        {},
        {
          headers: { Authorization: `Bearer ${authStore.token}` },
        },
      );

      if (response.data.success) {
        const newSession = response.data.session;

        // Session der Liste hinzufügen
        sessions.value = [newSession, ...sessions.value];

        // Neue Session aktivieren
        currentSessionId.value = newSession.id;
        messages.value = [];

        // In localStorage speichern
        localStorage.setItem("last_session_id", newSession.id);
      }
    } catch (error) {
      console.error("Fehler beim Erstellen einer neuen Session:", error);
    } finally {
      isLoading.value = false;
    }
  };

  // Session löschen
  const deleteSession = async (sessionId) => {
    if (!authStore.token || !sessionId) return;

    try {
      const response = await axios.delete(`/api/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      });

      if (response.data.success) {
        // Session aus der Liste entfernen
        sessions.value = sessions.value.filter((s) => s.id !== sessionId);

        // Falls die aktuelle Session gelöscht wurde, setze currentSessionId zurück
        if (currentSessionId.value === sessionId) {
          currentSessionId.value = null;
          messages.value = [];
          localStorage.removeItem("last_session_id");
        }
      }
    } catch (error) {
      console.error("Fehler beim Löschen der Session:", error);
    }
  };

  // Nachricht senden mit Streaming-Antwort
  const sendMessage = async (question) => {
    if (!authStore.token || !currentSessionId.value || !question) return;

    try {
      isLoading.value = true;

      // Eigene Nachricht zur Anzeige hinzufügen
      const userMessage = {
        id: `temp-${Date.now()}`,
        message: question,
        is_user: true,
        timestamp: new Date().toISOString(),
      };

      messages.value = [...messages.value, userMessage];

      // Platzhalter für die Assistentenantwort
      const assistantMessageId = `temp-assistant-${Date.now()}`;
      const assistantMessage = {
        id: assistantMessageId,
        message: "",
        is_user: false,
        timestamp: new Date().toISOString(),
      };

      messages.value = [...messages.value, assistantMessage];

      // Event-Stream starten
      setupEventSource(question, assistantMessageId);
    } catch (error) {
      console.error("Fehler beim Senden der Nachricht:", error);
      isLoading.value = false;
    }
  };

  // Event-Source für Streaming-Antworten einrichten
  const setupEventSource = (question, assistantMessageId) => {
    if (eventSource.value) {
      eventSource.value.close();
    }

    isStreaming.value = true;

    const source = new EventSource(
      `/api/chat/stream?session_id=${currentSessionId.value}&question=${encodeURIComponent(question)}&token=${authStore.token}`,
    );

    source.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.content) {
        // Assistentenantwort aktualisieren
        const index = messages.value.findIndex(
          (m) => m.id === assistantMessageId,
        );

        if (index !== -1) {
          const updatedMessage = { ...messages.value[index] };
          updatedMessage.message += data.content;

          // Nachrichtenarray aktualisieren
          messages.value = [
            ...messages.value.slice(0, index),
            updatedMessage,
            ...messages.value.slice(index + 1),
          ];
        }
      }

      if (data.message_id) {
        // Permanente ID für die Nachricht speichern
        const index = messages.value.findIndex(
          (m) => m.id === assistantMessageId,
        );

        if (index !== -1) {
          const updatedMessage = {
            ...messages.value[index],
            id: data.message_id,
          };

          // Nachrichtenarray aktualisieren
          messages.value = [
            ...messages.value.slice(0, index),
            updatedMessage,
            ...messages.value.slice(index + 1),
          ];
        }
      }
    };

    source.onerror = (error) => {
      console.error("EventSource-Fehler:", error);
      source.close();
      isStreaming.value = false;
      isLoading.value = false;
      updateSessionTitle();
    };

    source.addEventListener("end", () => {
      source.close();
      isStreaming.value = false;
      isLoading.value = false;
      updateSessionTitle();
    });

    eventSource.value = source;
  };

  // Aktualisiert den Titel der aktuellen Session
  const updateSessionTitle = async () => {
    if (!authStore.token || !currentSessionId.value) return;

    try {
      const response = await axios.post(
        `/api/sessions/${currentSessionId.value}/title`,
        {},
        {
          headers: { Authorization: `Bearer ${authStore.token}` },
        },
      );

      if (response.data.success && response.data.title) {
        // Session in der Liste aktualisieren
        sessions.value = sessions.value.map((s) => {
          if (s.id === currentSessionId.value) {
            return { ...s, title: response.data.title };
          }
          return s;
        });
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Session-Titels:", error);
    }
  };

  // Initialisiere Session-Daten beim Start
  const initialize = async () => {
    await loadSessions();

    // Letzte aktive Session wiederherstellen
    const lastSessionId = localStorage.getItem("last_session_id");
    if (lastSessionId && sessions.value.some((s) => s.id === lastSessionId)) {
      await loadSession(lastSessionId);
    }
  };

  return {
    // State
    sessions,
    currentSessionId,
    messages,
    isLoading,
    isStreaming,

    // Getters
    currentSession,

    // Actions
    loadSessions,
    loadSession,
    startNewSession,
    deleteSession,
    sendMessage,
    updateSessionTitle,
    initialize,
  };
});
