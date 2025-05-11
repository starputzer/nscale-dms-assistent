/**
 * Bridge zur Integration der neuen Session-Management-Komponenten mit Legacy-Code
 *
 * Diese Bridge ermöglicht die nahtlose Kommunikation zwischen dem neuen Vue 3 SFC-basierten
 * Session-Management und der bestehenden JavaScript-Implementierung.
 */

import { useSessionsStore } from "@/stores/sessions";
import { useFeatureTogglesStore } from "@/stores/featureToggles";
import type { ChatSession } from "@/types/session";

export interface LegacySessionEvent {
  type: string;
  sessionId?: string;
  data?: any;
}

export interface LegacySessionData {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
  isArchived?: boolean;
  [key: string]: any;
}

/**
 * Initialisiert die Session Bridge
 * - Registriert Event-Listener für Legacy-Events
 * - Stellt Methoden für Legacy-Code bereit
 */
export function initSessionBridge() {
  const sessionsStore = useSessionsStore();
  const featureTogglesStore = useFeatureTogglesStore();

  // Nur initialisieren, wenn Feature-Flags aktiv sind
  if (!featureTogglesStore.useSfcSessionManagement) {
    console.info(
      "SFC Session-Management ist deaktiviert, Bridge wird nicht initialisiert",
    );
    return;
  }

  console.info("Initialisiere Session-Management Bridge");

  // Event-Bus für die Kommunikation mit Legacy-Code
  const eventHandlers: Record<
    string,
    ((event: CustomEvent<LegacySessionEvent>) => void)[]
  > = {};

  /**
   * Registriert einen Event-Handler
   */
  function addEventHandler(
    type: string,
    handler: (event: CustomEvent<LegacySessionEvent>) => void,
  ) {
    if (!eventHandlers[type]) {
      eventHandlers[type] = [];
    }
    eventHandlers[type].push(handler);
  }

  /**
   * Entfernt einen Event-Handler
   */
  function removeEventHandler(
    type: string,
    handler: (event: CustomEvent<LegacySessionEvent>) => void,
  ) {
    if (eventHandlers[type]) {
      eventHandlers[type] = eventHandlers[type].filter((h) => h !== handler);
    }
  }

  /**
   * Löst ein Event aus
   */
  function dispatchEvent(type: string, detail: LegacySessionEvent) {
    const event = new CustomEvent<LegacySessionEvent>(
      `nscale:session:${type}`,
      { detail },
    );
    window.dispatchEvent(event);

    // Lokale Handler aufrufen
    if (eventHandlers[type]) {
      eventHandlers[type].forEach((handler) =>
        handler(new CustomEvent<LegacySessionEvent>("", { detail })),
      );
    }
  }

  /**
   * Konvertiert ein Legacy-Session-Objekt in ein Store-Session-Objekt
   */
  function convertLegacySession(legacySession: LegacySessionData): ChatSession {
    return {
      id: legacySession.id,
      title: legacySession.title,
      createdAt: legacySession.createdAt,
      updatedAt: legacySession.updatedAt,
      userId: legacySession.userId || "unknown",
      isPinned: legacySession.isPinned || false,
      isArchived: legacySession.isArchived || false,
      customData: {
        legacy: true,
        ...(legacySession.customData || {}),
      },
    };
  }

  /**
   * Konvertiert ein Store-Session-Objekt in ein Legacy-Session-Objekt
   */
  function convertToLegacySession(session: ChatSession): LegacySessionData {
    return {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      userId: session.userId,
      isPinned: session.isPinned || false,
      isArchived: session.isArchived || false,
      customData: session.customData,
    };
  }

  // API für Legacy-Code
  const legacyAPI = {
    /**
     * Lädt alle Sessions
     */
    loadSessions: async (): Promise<LegacySessionData[]> => {
      await sessionsStore.fetchSessions();
      return sessionsStore.sessions.map(convertToLegacySession);
    },

    /**
     * Erstellt eine neue Session
     */
    createSession: async (title?: string): Promise<LegacySessionData> => {
      const sessionId = await sessionsStore.createSession(title);

      // Umwandeln für Legacy-Format
      const session = sessionsStore.sessions.find((s) => s.id === sessionId);
      if (!session) {
        throw new Error(
          "Session wurde erstellt, konnte aber nicht gefunden werden",
        );
      }

      return convertToLegacySession(session);
    },

    /**
     * Wählt eine Session aus
     */
    selectSession: async (sessionId: string): Promise<void> => {
      await sessionsStore.setCurrentSession(sessionId);

      // Legacy-Event dispatchen
      dispatchEvent("selected", {
        type: "selected",
        sessionId,
      });
    },

    /**
     * Gibt die aktuelle Session-ID zurück
     */
    getCurrentSessionId: (): string | null => {
      return sessionsStore.currentSessionId;
    },

    /**
     * Löscht eine Session
     */
    deleteSession: async (sessionId: string): Promise<void> => {
      await sessionsStore.archiveSession(sessionId);

      // Legacy-Event dispatchen
      dispatchEvent("deleted", {
        type: "deleted",
        sessionId,
      });
    },

    /**
     * Aktualisiert den Titel einer Session
     */
    updateSessionTitle: async (
      sessionId: string,
      newTitle: string,
    ): Promise<void> => {
      await sessionsStore.updateSessionTitle(sessionId, newTitle);

      // Legacy-Event dispatchen
      dispatchEvent("updated", {
        type: "updated",
        sessionId,
        data: { title: newTitle },
      });
    },

    /**
     * Ändert den Pin-Status einer Session
     */
    togglePinSession: async (sessionId: string): Promise<void> => {
      await sessionsStore.togglePinSession(sessionId);

      // Legacy-Event dispatchen
      const session = sessionsStore.sessions.find((s) => s.id === sessionId);
      dispatchEvent("updated", {
        type: "updated",
        sessionId,
        data: { isPinned: session?.isPinned },
      });
    },

    /**
     * Registriert Event-Listener für Session-Events
     */
    on: (type: string, callback: (event: LegacySessionEvent) => void): void => {
      const handler = (event: CustomEvent<LegacySessionEvent>) =>
        callback(event.detail);
      addEventHandler(type, handler);
      window.addEventListener(
        `nscale:session:${type}`,
        handler as EventListener,
      );
    },

    /**
     * Entfernt Event-Listener für Session-Events
     */
    off: (
      type: string,
      callback: (event: LegacySessionEvent) => void,
    ): void => {
      const handlers = eventHandlers[type];
      if (handlers) {
        const handler = handlers.find(
          (h) => h.toString() === callback.toString(),
        );
        if (handler) {
          removeEventHandler(type, handler);
          window.removeEventListener(
            `nscale:session:${type}`,
            handler as EventListener,
          );
        }
      }
    },
  };

  // Event-Listener für Store-Änderungen
  sessionsStore.$subscribe((mutation, state) => {
    // Legacy-Code über Änderungen informieren
    if (mutation.type === "direct" || mutation.type === "patchObject") {
      // Nur dispatchen, wenn es wirklich Änderungen gibt, um unendliche Schleifen zu vermeiden
      if (mutation.payload?.currentSessionId !== undefined) {
        dispatchEvent("selected", {
          type: "selected",
          sessionId: state.currentSessionId || undefined,
        });
      }
    }
  });

  // API am window-Objekt bereitstellen
  (window as any).nscaleSessionManager = legacyAPI;

  // Rückgabe der API für die Verwendung im App-Code
  return legacyAPI;
}

/**
 * Zugriff auf die Bridge
 */
export function useSessionBridge() {
  return (window as any).nscaleSessionManager || null;
}
