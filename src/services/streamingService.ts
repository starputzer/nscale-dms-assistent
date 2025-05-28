/**
 * Streaming Service für Server-Sent Events
 * Ersetzt EventSource durch fetch() mit ReadableStream für bessere Header-Unterstützung
 */

import { useAuthStore } from "@/stores/auth";

export interface StreamingOptions {
  question: string;
  sessionId: string;
  simpleLanguage?: boolean;
  onMessage?: (data: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export class StreamingService {
  private controller: AbortController | null = null;

  /**
   * Startet einen Stream für die Frage-Antwort
   */
  async startStream(options: StreamingOptions): Promise<void> {
    const authStore = useAuthStore();
    const token = authStore.token;

    if (!token) {
      throw new Error("Nicht authentifiziert");
    }

    // Erstelle URL mit korrektem Encoding
    const params = new URLSearchParams({
      question: options.question,
      session_id: options.sessionId,
      ...(options.simpleLanguage && { simple_language: "true" }),
    });

    const url = `/api/question/stream?${params.toString()}`;

    // Abbruch-Controller für Stream-Kontrolle
    this.controller = new AbortController();

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        signal: this.controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `HTTP Fehler: ${response.status} ${response.statusText}`,
        );
      }

      // Verarbeite den Stream
      await this.processStream(response, options);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          console.log("Stream wurde abgebrochen");
        } else {
          console.error("Stream-Fehler:", error);
          options.onError?.(error);
        }
      }
    }
  }

  /**
   * Verarbeitet den Response-Stream
   */
  private async processStream(
    response: Response,
    options: StreamingOptions,
  ): Promise<void> {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    if (!reader) {
      throw new Error("Kein Stream verfügbar");
    }

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Stream abgeschlossen
          options.onComplete?.();
          break;
        }

        // Dekodiere den Chunk
        buffer += decoder.decode(value, { stream: true });

        // Verarbeite vollständige Zeilen
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Behalte unvollständige Zeile im Buffer

        for (const line of lines) {
          if (line.trim()) {
            this.processLine(line, options);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Verarbeitet eine einzelne SSE-Zeile
   */
  private processLine(line: string, options: StreamingOptions): void {
    // SSE-Format: "data: {...}" oder "event: eventName"
    if (line.startsWith("data: ")) {
      const data = line.slice(6); // Entferne "data: "

      if (data.trim() === "[DONE]") {
        options.onComplete?.();
        return;
      }

      try {
        // Versuche JSON zu parsen
        const parsed = JSON.parse(data);

        if (parsed.content) {
          options.onMessage?.(parsed.content);
        } else if (parsed.error) {
          options.onError?.(new Error(parsed.error));
        }
      } catch {
        // Wenn kein JSON, behandle als Text
        options.onMessage?.(data);
      }
    } else if (line.startsWith("event: ")) {
      const event = line.slice(7);
      if (event === "done") {
        options.onComplete?.();
      }
    }
  }

  /**
   * Stoppt den aktuellen Stream
   */
  stopStream(): void {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }
}

// Singleton-Instanz
export const streamingService = new StreamingService();
