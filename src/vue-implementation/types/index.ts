// Types für den nscale DMS Assistenten

export interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  messages: ChatMessage[];
  isActive?: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  isAssistant: boolean;
  timestamp: string;
  feedback?: 'positive' | 'negative' | null;
}

export type ButtonVariant = 'primary' | 'secondary';
export type IconName = 
  | 'plus' 
  | 'settings' 
  | 'logout' 
  | 'trash' 
  | 'send' 
  | 'thumbsUp' 
  | 'thumbsDown' 
  | 'chatBubble';

/**
 * Erweiterung für den UUID Utility
 */
export interface UUIDUtil {
  generateUUID: () => string;
  v4: () => string;
  generateSecureUUID: () => string;
  generateSequentialId: (prefix?: string) => string;
  generateTimeBasedId: () => string;
}