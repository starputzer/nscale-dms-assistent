/**
 * TypeScript type declarations for the nscale DMS Assistant
 */

// Global interfaces for App.vue component
interface User {
  id: string;
  username: string;
  role: string;
  status: string;
}

interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  text: string;
  is_user: boolean;
  timestamp: string;
  sources?: any[];
}

interface MotdConfig {
  enabled: boolean;
  title: string;
  content: string;
  display?: {
    showInChat: boolean;
    showOnStartup: boolean;
  }
}

interface FeedbackData {
  messageId?: string;
  type: string;
  comment: string;
  sessionId?: string;
}

interface SystemInfo {
  version: string;
  build: string;
  model: string;
  endpoint: string;
}

interface FeedbackStats {
  positive: number;
  negative: number;
  total: number;
}

// Declare global window properties
declare global {
  interface Window {
    APP_CONFIG: {
      buildVersion: string;
      environment: string;
    };
  }
}

// Declare module augmentations for Vue
declare module 'vue' {
  interface ComponentCustomProperties {
    $chatService: any;
    $sourceReferences: any;
  }
}