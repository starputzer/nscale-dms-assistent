/**
 * MockChatService - Mock-Implementierung des ChatService
 *
 * Diese Klasse bietet eine lokale Implementierung des ChatService für die Entwicklung
 * ohne Backend-Verbindung. Sie simuliert API-Antworten und behält einen konsistenten State.
 */

import { v4 as uuidv4 } from "uuid";
import {
  ChatSession,
  ChatMessage,
  SendMessageRequest,
  CreateSessionRequest,
  ApiResponse,
  StreamingEvent,
} from "@/types/api";

import {
  ChatMessageOptions,
  StreamCallbacks,
} from "@/services/api/ChatService";

// Mock-Daten für Chat-Sessions
const MOCK_SESSIONS: ChatSession[] = [
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

// Mock-Daten für Chat-Nachrichten
const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  "1": [
    {
      id: "101",
      sessionId: "1",
      content: "Hallo, wie kann ich helfen?",
      role: "assistant",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "102",
      sessionId: "1",
      content: "Ich habe eine Frage zur Dokumentensuche",
      role: "user",
      timestamp: new Date(Date.now() - 86300000).toISOString(),
    },
    {
      id: "103",
      sessionId: "1",
      content:
        'Die Dokumentensuche können Sie über das Menü "Suchen" aufrufen. Dort können Sie nach Dokumenten suchen, indem Sie Stichwörter, Dateinamen oder Dokumenteninhalte eingeben.',
      role: "assistant",
      timestamp: new Date(Date.now() - 86200000).toISOString(),
    },
  ],
  "2": [
    {
      id: "201",
      sessionId: "2",
      content: "Guten Tag, wobei kann ich behilflich sein?",
      role: "assistant",
      timestamp: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: "202",
      sessionId: "2",
      content: "Wie kann ich Dokumente hochladen?",
      role: "user",
      timestamp: new Date(Date.now() - 172700000).toISOString(),
    },
    {
      id: "203",
      sessionId: "2",
      content:
        'Um Dokumente hochzuladen, klicken Sie auf den Button "Hochladen" in der oberen Menüleiste. Sie können dann Dateien von Ihrem Computer auswählen oder per Drag & Drop in das Uploadfenster ziehen.',
      role: "assistant",
      timestamp: new Date(Date.now() - 172600000).toISOString(),
    },
  ],
};

/**
 * Verzögerung für simulierte Netzwerklatenz
 */
const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * MockChatService - Mock-Implementierung des ChatService
 */
export class MockChatService {
  private sessions: ChatSession[] = [...MOCK_SESSIONS];
  private messages: Record<string, ChatMessage[]> = JSON.parse(
    JSON.stringify(MOCK_MESSAGES),
  );
  private activeStreams: Map<string, any> = new Map();

  /**
   * Konstruktor
   */
  constructor() {
    console.log("MockChatService initialisiert");
  }

  /**
   * Bereinigung beim Zerstören des Services
   */
  public destroy(): void {
    this.cancelAllStreams();
  }

  /**
   * Bricht alle aktiven Streams ab
   */
  public cancelAllStreams = (): void => {
    this.activeStreams.clear();
  };

  /**
   * Bricht einen spezifischen Stream ab
   */
  public cancelStream(sessionId: string): void {
    this.activeStreams.delete(sessionId);
  }

  /**
   * Lädt alle Sitzungen des Benutzers
   */
  public async getSessions(): Promise<ChatSession[]> {
    // Simuliere Netzwerklatenz
    await delay(300);
    return [...this.sessions];
  }

  /**
   * Lädt eine spezifische Sitzung
   */
  public async getSession(sessionId: string): Promise<ChatSession> {
    // Simuliere Netzwerklatenz
    await delay(200);

    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }

    return { ...session };
  }

  /**
   * Erstellt eine neue Chat-Sitzung
   */
  public async createSession(
    options: CreateSessionRequest = {},
  ): Promise<ChatSession> {
    // Simuliere Netzwerklatenz
    await delay(400);

    const now = new Date().toISOString();
    const newSession: ChatSession = {
      id: uuidv4(),
      title: options.title || "Neue Unterhaltung",
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.push(newSession);
    this.messages[newSession.id] = [];

    return { ...newSession };
  }

  /**
   * Aktualisiert den Titel einer Sitzung
   */
  public async updateSessionTitle(
    sessionId: string,
    title: string,
  ): Promise<ChatSession> {
    // Simuliere Netzwerklatenz
    await delay(200);

    const sessionIndex = this.sessions.findIndex((s) => s.id === sessionId);
    if (sessionIndex === -1) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }

    this.sessions[sessionIndex] = {
      ...this.sessions[sessionIndex],
      title,
      updatedAt: new Date().toISOString(),
    };

    return { ...this.sessions[sessionIndex] };
  }

  /**
   * Löscht eine Sitzung
   */
  public async deleteSession(sessionId: string): Promise<ApiResponse<void>> {
    // Simuliere Netzwerklatenz
    await delay(300);

    const sessionIndex = this.sessions.findIndex((s) => s.id === sessionId);
    if (sessionIndex === -1) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }

    this.sessions.splice(sessionIndex, 1);
    delete this.messages[sessionId];

    return { success: true, message: "Session deleted successfully" };
  }

  /**
   * Lädt die Nachrichten einer Sitzung
   */
  public async getMessages(sessionId: string): Promise<ChatMessage[]> {
    // Simuliere Netzwerklatenz
    await delay(300);

    const messages = this.messages[sessionId] || [];
    return [...messages];
  }

  /**
   * Sendet eine Chat-Nachricht
   */
  public async sendMessage(
    content: string,
    sessionId: string | null,
    options: ChatMessageOptions = {},
  ): Promise<ChatMessage> {
    // Wenn keine Session-ID angegeben ist und autoCreateSession aktiviert ist,
    // erstelle eine neue Session
    if (!sessionId && options.autoCreateSession) {
      const newSession = await this.createSession({
        title: content.length > 30 ? content.substring(0, 30) + "..." : content,
      });
      sessionId = newSession.id;
    }

    if (!sessionId) {
      throw new Error("Keine Session-ID angegeben");
    }

    // Wenn Streaming aktiviert ist
    if (options.stream) {
      return this.streamMessage(content, sessionId, options.onChunk);
    }

    // Simuliere Netzwerklatenz
    await delay(1000);

    // Erstelle eine Antwortnachricht basierend auf der Benutzereingabe
    const responseContent = this.generateResponse(content);

    const now = new Date().toISOString();
    const userMessageId = uuidv4();
    const assistantMessageId = uuidv4();

    // Benutzernachricht hinzufügen
    const userMessage: ChatMessage = {
      id: userMessageId,
      sessionId,
      content,
      role: "user",
      timestamp: now,
    };

    // Antwortnachricht generieren
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      sessionId,
      content: responseContent,
      role: "assistant",
      timestamp: new Date(Date.now() + 1000).toISOString(), // 1 Sekunde später
    };

    // Nachrichten zur Session hinzufügen
    if (!this.messages[sessionId]) {
      this.messages[sessionId] = [];
    }

    this.messages[sessionId].push(userMessage);
    this.messages[sessionId].push(assistantMessage);

    // Session-Aktualisierungszeit aktualisieren
    const sessionIndex = this.sessions.findIndex((s) => s.id === sessionId);
    if (sessionIndex !== -1) {
      this.sessions[sessionIndex].updatedAt = new Date().toISOString();
    }

    return assistantMessage;
  }

  /**
   * Simuliert eine Streaming-Antwort
   */
  public async streamMessage(
    content: string,
    sessionId: string,
    onChunk?: (chunk: string, metadata?: any) => void,
  ): Promise<ChatMessage> {
    return new Promise(async (resolve) => {
      // Simuliere Netzwerklatenz für die initiale Verbindung
      await delay(300);

      const now = new Date().toISOString();
      const userMessageId = uuidv4();
      const assistantMessageId = uuidv4();
      let fullResponse = "";

      // Benutzernachricht hinzufügen
      const userMessage: ChatMessage = {
        id: userMessageId,
        sessionId,
        content,
        role: "user",
        timestamp: now,
      };

      // Nachricht für initiales Hinzufügen
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        sessionId,
        content: "",
        role: "assistant",
        timestamp: new Date(Date.now() + 1000).toISOString(), // 1 Sekunde später
      };

      // Nachrichten zur Session hinzufügen
      if (!this.messages[sessionId]) {
        this.messages[sessionId] = [];
      }

      this.messages[sessionId].push(userMessage);
      this.messages[sessionId].push(assistantMessage);

      // Generiere Antwort
      const responseContent = this.generateResponse(content);

      // Registriere den Stream
      const streamId = sessionId;
      this.activeStreams.set(streamId, true);

      // Simuliere Streaming der Antwort in Chunks
      const words = responseContent.split(" ");
      let currentIndex = 0;

      const sendNextChunk = async () => {
        if (!this.activeStreams.has(streamId) || currentIndex >= words.length) {
          // Stream wurde abgebrochen oder ist beendet
          if (this.activeStreams.has(streamId)) {
            this.activeStreams.delete(streamId);
          }

          // Aktualisiere die Nachricht mit dem vollständigen Inhalt
          const messageIndex = this.messages[sessionId].findIndex(
            (m) => m.id === assistantMessageId,
          );
          if (messageIndex !== -1) {
            this.messages[sessionId][messageIndex].content = fullResponse;
          }

          // Session-Aktualisierungszeit aktualisieren
          const sessionIndex = this.sessions.findIndex(
            (s) => s.id === sessionId,
          );
          if (sessionIndex !== -1) {
            this.sessions[sessionIndex].updatedAt = new Date().toISOString();
          }

          resolve({
            id: assistantMessageId,
            sessionId,
            content: fullResponse,
            role: "assistant",
            timestamp: new Date().toISOString(),
          });

          return;
        }

        // Berechne die nächste Chunk-Größe (1-3 Wörter)
        const chunkSize = Math.min(
          1 + Math.floor(Math.random() * 3),
          words.length - currentIndex,
        );
        const chunk =
          words.slice(currentIndex, currentIndex + chunkSize).join(" ") + " ";

        fullResponse += chunk;
        currentIndex += chunkSize;

        // Chunk senden, wenn Callback vorhanden
        if (onChunk) {
          onChunk(chunk);
        }

        // Nachrichteninhalt aktualisieren
        const messageIndex = this.messages[sessionId].findIndex(
          (m) => m.id === assistantMessageId,
        );
        if (messageIndex !== -1) {
          this.messages[sessionId][messageIndex].content = fullResponse;
        }

        // Simuliere variable Verzögerung zwischen Chunks (50-150ms)
        const chunkDelay = 50 + Math.floor(Math.random() * 100);
        setTimeout(sendNextChunk, chunkDelay);
      };

      // Starte das Streaming
      sendNextChunk();
    });
  }

  /**
   * Generiert eine kontextabhängige Antwort basierend auf der Benutzereingabe
   */
  private generateResponse(userMessage: string): string {
    // Vereinfachte Implementierung einer Antwortgenerierung
    // In einer realen Anwendung würde hier ein Sprachmodell oder LLM verwendet

    const lowercaseMessage = userMessage.toLowerCase();

    // Anwendungsspezifische Antworten
    if (
      lowercaseMessage.includes("hallo") ||
      lowercaseMessage.includes("hi") ||
      lowercaseMessage.includes("guten tag")
    ) {
      return "Hallo! Wie kann ich Ihnen heute helfen?";
    }

    if (
      lowercaseMessage.includes("dokument") &&
      (lowercaseMessage.includes("hochladen") ||
        lowercaseMessage.includes("upload"))
    ) {
      return (
        'Um Dokumente hochzuladen, klicken Sie auf den Button "Hochladen" in der oberen Menüleiste. ' +
        "Sie können dann Dateien von Ihrem Computer auswählen oder per Drag & Drop in das Uploadfenster ziehen."
      );
    }

    if (
      lowercaseMessage.includes("suche") ||
      lowercaseMessage.includes("finden")
    ) {
      return (
        'Die Dokumentensuche finden Sie im Hauptmenü unter "Suchen". Dort können Sie Volltext- oder ' +
        "Metadatensuchen durchführen. Sie können auch erweiterte Suchfilter verwenden, um Ihre Ergebnisse einzugrenzen."
      );
    }

    if (
      lowercaseMessage.includes("einstellung") ||
      lowercaseMessage.includes("konfiguration") ||
      lowercaseMessage.includes("config")
    ) {
      return (
        "Die Einstellungen können Sie über das Zahnradsymbol in der oberen rechten Ecke aufrufen. " +
        "Dort können Sie verschiedene Aspekte der Anwendung anpassen, darunter Darstellung, Sprache und Benachrichtigungen."
      );
    }

    if (
      lowercaseMessage.includes("fehler") ||
      lowercaseMessage.includes("problem") ||
      lowercaseMessage.includes("funktioniert nicht")
    ) {
      return (
        "Es tut mir leid, dass Sie ein Problem haben. Hier sind einige allgemeine Schritte zur Fehlerbehebung:\n" +
        "1. Versuchen Sie, die Seite neu zu laden\n" +
        "2. Löschen Sie den Browser-Cache\n" +
        "3. Stellen Sie sicher, dass Ihre Internetverbindung stabil ist\n" +
        "4. Falls das Problem weiterhin besteht, kontaktieren Sie bitte unseren Support unter support@example.com"
      );
    }

    // Standardantwort, wenn keine spezifische Antwort verfügbar ist
    return (
      "Vielen Dank für Ihre Nachricht. Ich bin ein einfacher Mock-Service ohne echte KI-Funktionalität. " +
      "In der vollständigen Anwendung würde hier eine KI-generierte Antwort stehen. Kann ich Ihnen mit etwas anderem helfen?"
    );
  }

  /**
   * Gibt an, ob eine Sitzung aktiv streamt
   */
  public isStreaming(sessionId: string): boolean {
    return this.activeStreams.has(sessionId);
  }
}

// Singleton-Instanz
export const mockChatService = new MockChatService();

export default mockChatService;
