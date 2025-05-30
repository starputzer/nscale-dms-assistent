/**
 * Typdefinitionen für den Sessions-Store
 */

export interface SessionTag {
  id: string;
  name: string;
  color?: string;
  description?: string;
}

export interface SessionCategory {
  id: string;
  name: string;
  color?: string;
  description?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  isArchived?: boolean;
  isPinned?: boolean;
  tags?: SessionTag[];
  category?: SessionCategory;
  preview?: string;
  messageCount?: number;
  customData?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: string;
  isStreaming?: boolean;
  status?: "pending" | "sent" | "error";
  metadata?: {
    sourceReferences?: SourceReference[];
    processingTime?: number;
    tokens?: {
      prompt?: number;
      completion?: number;
      total?: number;
    };
    [key: string]: any;
  };
}

export interface SourceReference {
  id: string;
  title: string;
  content: string;
  source: string;
  url?: string;
  relevanceScore?: number;
  pageNumber?: number;
}

export interface StreamingStatus {
  isActive: boolean;
  progress: number;
  currentSessionId: string | null;
}

export interface SessionsState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  messages: Record<string, ChatMessage[]>;
  streaming: StreamingStatus;
  isLoading: boolean;
  error: string | null;
}

export interface SendMessageParams {
  sessionId: string;
  content: string;
  role?: "user" | "system";
}

/**
 * Type aliases for backward compatibility
 */
export type Session = ChatSession;
export type Message = ChatMessage;
