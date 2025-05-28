/**
 * Type definitions for the application
 *
 * This file provides TypeScript type definitions for the nscale DMS Assistant
 * and exports the interfaces defined in app.d.ts for use in other files.
 */

// User type
export interface User {
  id: string;
  username: string;
  role: string;
  status: string;
}

// Session and chat types
export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  text: string;
  is_user: boolean;
  timestamp: string;
  sources?: any[];
}

// Admin and configuration types
export interface MotdConfig {
  enabled: boolean;
  title: string;
  content: string;
  display?: {
    showInChat: boolean;
    showOnStartup: boolean;
  };
}

export interface FeedbackData {
  messageId?: string;
  type: string;
  comment: string;
  sessionId?: string;
}

export interface SystemInfo {
  version: string;
  build: string;
  model: string;
  endpoint: string;
}

export interface FeedbackStats {
  positive: number;
  negative: number;
  total: number;
}

export interface Feedback {
  id: string;
  type: string;
  comment: string;
  sessionId?: string;
  messageId?: string;
  timestamp: string;
  user?: User;
}

export interface SystemStats {
  name: string;
  value: number;
  unit?: string;
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  variants: ABTestVariant[];
  startDate?: string;
  endDate?: string;
}

export interface ABTestVariant {
  id: string;
  name: string;
  weight: number;
  isControl: boolean;
}
