/**
 * Typdefinitionen für Tests
 *
 * Diese Datei enthält Typen, die speziell für Tests benötigt werden,
 * einschließlich Mock-Daten-Typen und Test-Konfigurationen.
 */

import { User, TokenStatus } from "@/types/auth";
import { ChatSession, ChatMessage } from "@/types/session";
import { DocumentState } from "@/types/documentConverter";
import { Feature } from "@/config/featureFlags";

/**
 * Standard-Benutzer für Tests
 */
export interface TestUser extends User {
  displayName: string;
  lastLogin: string;
  preferences: {
    theme: string;
    language: string;
  };
}

/**
 * Standard-Session für Tests
 */
export interface TestSession extends ChatSession {
  messages: ChatMessage[];
  updatedAt: string;
  createdAt: string;
}

/**
 * Erweiterte Nachricht für Tests
 */
export interface TestMessage extends ChatMessage {
  status: "pending" | "sent" | "delivered" | "error";
  timestamp: string;
}

/**
 * Test-Dokument
 */
export interface TestDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  status: DocumentState;
  userId: string;
  createdAt: string;
  pages?: number;
  thumbnail?: string;
  error?: string;
}

/**
 * Test-Konfiguration für App-Features
 */
export interface TestFeatureConfig {
  feature: Feature;
  enabled: boolean;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  isExperimental?: boolean;
}

/**
 * Mock für API-Antwort mit Pagination
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Mock für eine Checkbox-Option in einem Formular
 */
export interface TestCheckboxOption {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
}

/**
 * Mock für eine Formularoption (Select, Radio, etc.)
 */
export interface TestFormOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  group?: string;
}

/**
 * Definiert erwartete Emits einer Komponente für Tests
 */
export interface ExpectedEmits {
  event: string;
  args?: any[];
  count?: number;
}

/**
 * Konfiguration für Mock eines HTTP-Aufrufs
 */
export interface MockHttpConfig {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  status: number;
  responseData?: any;
  errorMessage?: string;
  delay?: number;
  validateRequest?: (data: any) => boolean;
}

/**
 * Konfiguration für Test-Stores
 */
export interface TestStoreConfig {
  name: string;
  initialState?: Record<string, any>;
  mockActions?: string[];
  mockGetters?: Record<string, any>;
}

/**
 * Erweiterte Store-Kontext für Tests
 */
export interface TestStoreContext<S = any, G = any, A = any> {
  state: S;
  getters: G;
  actions: A;
  lastAction?: {
    name: string;
    args: any[];
  };
  actionCalls: Record<string, number>;
}

/**
 * Konfiguration für Router-Tests
 */
export interface TestRouterConfig {
  initialRoute: string;
  mockNavigations?: boolean;
  routes?: Array<{
    path: string;
    name?: string;
    component?: any;
    meta?: Record<string, any>;
  }>;
}

/**
 * Mock für Benutzer-Anmeldeinformationen
 */
export interface TestCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

/**
 * Mock für Benutzer-Registrierungsinformationen
 */
export interface TestRegisterCredentials extends TestCredentials {
  name: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

/**
 * Mock für Token-Information
 */
export interface TestTokenInfo {
  token: string;
  refreshToken: string;
  expiresIn: number;
  status: TokenStatus;
}

/**
 * Mock-Event für Tests
 */
export interface TestEvent<T = any> {
  type: string;
  payload: T;
  timestamp: string;
}

/**
 * Standard-Mock-Funktionen für häufig verwendete Komponenten
 */
export type TestMockFunctions = {
  onInput: jest.Mock;
  onChange: jest.Mock;
  onClick: jest.Mock;
  onSubmit: jest.Mock;
  onReset: jest.Mock;
  onFocus: jest.Mock;
  onBlur: jest.Mock;
  onSelect: jest.Mock;
  onNavigate: jest.Mock;
  onLogin: jest.Mock;
  onLogout: jest.Mock;
};

// Export von Fabrik-Funktionen für Test-Daten
export const createDefaultTestUser = (): TestUser => ({
  id: "test-user-1",
  email: "user@example.com",
  username: "testuser",
  displayName: "Test User",
  lastLogin: new Date().toISOString(),
  roles: ["user"],
  permissions: ["docs:read", "docs:write"],
  preferences: {
    theme: "light",
    language: "de",
  },
});

export const createDefaultTestSession = (): TestSession => ({
  id: "test-session-1",
  title: "Test Session",
  userId: "test-user-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [],
  isPinned: false,
});

export const createDefaultTestMessage = (
  role: "user" | "assistant" = "user",
): TestMessage => ({
  id: `msg-${Date.now()}`,
  sessionId: "test-session-1",
  content: role === "user" ? "Test user message" : "Test assistant response",
  role,
  timestamp: new Date().toISOString(),
  status: "sent",
});

export const createDefaultTestDocument = (): TestDocument => ({
  id: "doc-1",
  name: "test-document.pdf",
  size: 1024,
  type: "application/pdf",
  status: "converted",
  userId: "test-user-1",
  createdAt: new Date().toISOString(),
});
