/**
 * Kompatibilitätstypen für optimierte und ältere ChatMessage-Implementierungen
 *
 * Dieses Modul definiert Adapter- und Kompatibilitätstypen für die Migration
 * zwischen dem älteren Nachrichtenformat und dem neuen, typisierten Format.
 */

import type { ChatMessage } from "@/types/session";

/**
 * Legacy-Nachrichtenformat (verwendet in älteren Komponenten)
 */
export interface LegacyChatMessage {
  id: string;
  text: string;
  is_user: boolean;
  timestamp: string;
  sources?: Array<{
    id: string;
    title: string;
    content: string;
    source: string;
    url?: string;
  }>;
}

/**
 * Konvertiert eine Legacy-Nachricht in das neue Format
 */
export function convertLegacyMessageToTyped(
  legacy: LegacyChatMessage,
  sessionId: string,
): ChatMessage {
  return {
    id: legacy.id,
    sessionId: sessionId,
    content: legacy.text,
    role: legacy.is_user ? "user" : "assistant",
    timestamp: legacy.timestamp,
    metadata: legacy.sources
      ? {
          sourceReferences: legacy.sources.map((source) => ({
            id: source.id,
            title: source.title,
            content: source.content,
            source: source.source,
            url: source.url,
          })),
        }
      : undefined,
  };
}

/**
 * Konvertiert eine typisierte Nachricht in das Legacy-Format
 */
export function convertTypedMessageToLegacy(
  typed: ChatMessage,
): LegacyChatMessage {
  return {
    id: typed.id,
    text: typed.content,
    is_user: typed.role === "user",
    timestamp: typed.timestamp,
    sources: typed.metadata?.sourceReferences?.map((ref) => ({
      id: ref.id,
      title: ref.title,
      content: ref.content,
      source: ref.source,
      url: ref.url,
    })),
  };
}

/**
 * Type Guard zur Unterscheidung zwischen Legacy- und neuen Nachrichtenformaten
 */
export function isLegacyMessage(message: any): message is LegacyChatMessage {
  return (
    message &&
    typeof message === "object" &&
    "is_user" in message &&
    "text" in message
  );
}

/**
 * Type Guard für typisierte Nachrichten
 */
export function isTypedMessage(message: any): message is ChatMessage {
  return (
    message &&
    typeof message === "object" &&
    "role" in message &&
    "content" in message
  );
}
