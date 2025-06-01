/**
 * Session-Aware Batch Handler
 *
 * Dieses Modul ist ein Proxy für den Batch-Request-Service, der die Session-ID-Handhabung verbessert.
 * Es löst kritische API-Kommunikationsprobleme, die durch Unterschiede im Session-ID-Format
 * zwischen Frontend (UUID) und Backend (numerisch) verursacht werden.
 */

import { batchRequestService } from "./BatchRequestService";
import {
  toNumericFormat,
  extractAndMapSessionId,
  prepareSessionIdForRequest,
} from "@/utils/sessionIdAdapter";

// Interface für Batch-Anfragen
interface BatchRequest {
  id: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  params?: any;
  data?: any;
  headers?: Record<string, string>;
  meta?: any;
}

// Optimierte Version des Batch-Request-Service mit Session-ID-Handhabung
class SessionAwareBatchHandler {
  // Original-Service
  private originalService = batchRequestService;

  /**
   * Führt einen Batch-Request mit optimierter Session-ID-Handhabung aus
   */
  async executeBatch(requests: BatchRequest[]): Promise<any> {
    console.log(
      "SessionAwareBatchHandler: Ausführung von Batch-Requests mit optimierter Session-ID-Handhabung",
    );

    // Requests transformieren, um Session-IDs zu normalisieren
    const transformedRequests = requests.map((request) =>
      this.transformRequest(request),
    );

    // Original-Service aufrufen
    const response =
      await this.originalService.executeBatch(transformedRequests);

    // Antwort verarbeiten und Session-ID-Mappings aktualisieren
    const processedResponse = this.processResponse(
      response,
      transformedRequests,
    );

    return processedResponse;
  }

  /**
   * Transformiert eine Anfrage, um korrekte Session-IDs zu verwenden
   */
  private transformRequest(request: BatchRequest): BatchRequest {
    const transformed = { ...request };

    // Endpunkt überprüfen, ob er eine Session-ID enthält
    if (transformed.endpoint.includes("/sessions/")) {
      // Session-ID aus dem Endpunkt extrahieren
      const match = transformed.endpoint.match(/\/sessions\/([^\/]+)/);
      if (match && match[1]) {
        const sessionId = match[1];
        const numericId = toNumericFormat(sessionId);

        // Endpunkt aktualisieren, wenn eine numerische ID gefunden wurde
        if (numericId !== sessionId) {
          transformed.endpoint = transformed.endpoint.replace(
            `/sessions/${sessionId}`,
            `/sessions/${numericId}`,
          );

          console.log(
            `SessionAwareBatchHandler: Endpunkt für Request ${request.id} transformiert: ${request.endpoint} -> ${transformed.endpoint}`,
          );
        }
      }
    }

    // Parameter überprüfen
    if (transformed.params) {
      const paramKeys = ["sessionId", "session_id", "session_id_str"];

      paramKeys.forEach((key) => {
        if (transformed.params && transformed.params[key]) {
          transformed.params = prepareSessionIdForRequest(
            transformed.params,
            key,
          );
        }
      });
    }

    // Daten überprüfen
    if (transformed.data) {
      const dataKeys = ["sessionId", "session_id", "session_id_str", "id"];

      dataKeys.forEach((key) => {
        if (transformed.data && transformed.data[key]) {
          transformed.data = prepareSessionIdForRequest(transformed.data, key);
        }
      });
    }

    return transformed;
  }

  /**
   * Verarbeitet die Antwort und aktualisiert Session-ID-Mappings
   */
  private processResponse(
    response: any,
    originalRequests: BatchRequest[],
  ): any {
    if (!response) return response;

    try {
      // Verschiedene Antwortformate überprüfen
      let responses = response;

      if (response.data?.responses) {
        responses = response.data.responses;
      } else if (response.responses) {
        responses = response.responses;
      } else if (!Array.isArray(response)) {
        // Wenn nicht bereits ein Array, versuchen ob es einzelne Antwort ist
        responses = [response];
      }

      // Nicht verarbeiten, wenn keine Array-Struktur erkannt wurde
      if (!Array.isArray(responses)) {
        return response;
      }

      // Mappings aus den Antworten extrahieren
      responses.forEach((resp, index: any) => {
        const request = originalRequests[index];
        if (!request) return;

        // Session-ID aus der Anfrage extrahieren (UUID-Format vom Client)
        let clientSessionId = "";

        // Aus Endpunkt extrahieren
        const endpointMatch = request.endpoint.match(/\/sessions\/([^\/]+)/);
        if (endpointMatch && endpointMatch[1]) {
          clientSessionId = endpointMatch[1];
        }
        // Oder aus Parametern/Daten
        else if (request.params?.sessionId) {
          clientSessionId = request.params.sessionId;
        } else if (request.data?.sessionId) {
          clientSessionId = request.data.sessionId;
        }

        // Wenn Client-ID gefunden, nach Server-ID suchen und Mapping aktualisieren
        if (clientSessionId) {
          extractAndMapSessionId(resp, clientSessionId);
        }
      });

      return response;
    } catch (error) {
      console.error(
        "SessionAwareBatchHandler: Fehler bei der Antwortverarbeitung:",
        error,
      );
      return response;
    }
  }

  /**
   * Macht einen einzelnen API-Request mit optimierter Session-ID-Handhabung
   */
  async executeRequest(request: BatchRequest): Promise<any> {
    return this.executeBatch([request]).then((response) => {
      if (Array.isArray(response) && response.length > 0) {
        return response[0];
      }
      return response;
    });
  }
}

// Erstelle eine Singleton-Instanz
export const sessionAwareBatchHandler = new SessionAwareBatchHandler();

// Exportiere auch als Default
export default sessionAwareBatchHandler;
