# Development Best Practices - nscale DMS Assistant

## 🎯 Übersicht

Dieses Dokument beschreibt die Best Practices und Coding-Standards für die Entwicklung am nscale DMS Assistant. Es dient als Referenz für konsistente, wartbare und performante Code-Entwicklung.

## 📋 Inhaltsverzeichnis

1. [Code-Organisation](#code-organisation)
2. [TypeScript Best Practices](#typescript-best-practices)
3. [Vue 3 Patterns](#vue-3-patterns)
4. [State Management](#state-management)
5. [Performance Optimization](#performance-optimization)
6. [Testing Standards](#testing-standards)
7. [Error Handling](#error-handling)
8. [Security Guidelines](#security-guidelines)
9. [Documentation](#documentation)
10. [Code Review Checklist](#code-review-checklist)

## 📁 Code-Organisation

### Datei-Struktur

```
feature/
├── components/
│   ├── FeatureComponent.vue
│   ├── FeatureComponent.spec.ts
│   └── FeatureComponent.stories.ts
├── composables/
│   ├── useFeature.ts
│   └── useFeature.spec.ts
├── stores/
│   ├── feature.ts
│   └── feature.spec.ts
├── types/
│   └── feature.ts
└── utils/
    ├── featureHelpers.ts
    └── featureHelpers.spec.ts
```

### Naming Conventions

#### Dateien
- **Components**: PascalCase - `UserProfile.vue`
- **Composables**: camelCase mit `use` Prefix - `useAuthentication.ts`
- **Stores**: camelCase - `sessions.ts`
- **Utils**: camelCase - `dateFormatter.ts`
- **Types**: PascalCase für Interfaces/Types - `ChatMessage.ts`

#### Code
```typescript
// Interfaces: PascalCase mit 'I' Prefix (optional)
interface UserProfile {
  id: string;
  name: string;
}

// Type Aliases: PascalCase
type MessageStatus = 'sent' | 'delivered' | 'read';

// Enums: PascalCase
enum UserRole {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest'
}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = '/api/v1';

// Functions: camelCase
function calculateMessageHash(content: string): string {
  // Implementation
}
```

## 📘 TypeScript Best Practices

### 1. Strict Type Safety

```typescript
// tsconfig.json sollte strict mode aktiviert haben
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### 2. Type Inference nutzen

```typescript
// ✅ Gut - Type wird inferiert
const messages = ref<ChatMessage[]>([]);
const count = computed(() => messages.value.length);

// ❌ Unnötig - Type ist redundant
const count: ComputedRef<number> = computed(() => messages.value.length);
```

### 3. Union Types und Type Guards

```typescript
// Union Type Definition
type ApiResponse<T> = 
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

// Type Guard
function isErrorResponse<T>(
  response: ApiResponse<T>
): response is { status: 'error'; error: string } {
  return response.status === 'error';
}

// Verwendung
const response = await fetchData();
if (isErrorResponse(response)) {
  console.error(response.error);
} else {
  processData(response.data);
}
```

### 4. Generics effektiv nutzen

```typescript
// Reusable API Hook
function useApi<T>(endpoint: string) {
  const data = ref<T | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function fetch(params?: Record<string, any>) {
    loading.value = true;
    try {
      const response = await api.get<T>(endpoint, { params });
      data.value = response.data;
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  }

  return { data, loading, error, fetch };
}
```

## 🎨 Vue 3 Patterns

### 1. Composition API mit TypeScript

```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { PropType } from 'vue';

// Props mit TypeScript
interface Props {
  userId: string;
  initialData?: UserData;
  onUpdate?: (data: UserData) => void;
}

const props = withDefaults(defineProps<Props>(), {
  initialData: () => ({})
});

// Emits mit TypeScript
const emit = defineEmits<{
  'update:modelValue': [value: string];
  'save': [data: UserData];
  'cancel': [];
}>();

// Refs mit expliziten Typen
const formData = ref<UserData>({ ...props.initialData });
const isValid = computed(() => validateForm(formData.value));

// Lifecycle Hooks
onMounted(async () => {
  if (!props.initialData) {
    await loadUserData(props.userId);
  }
});
</script>
```

### 2. Composables Pattern

```typescript
// composables/useDebounce.ts
export function useDebounce<T>(
  value: Ref<T>,
  delay: number = 300
): Readonly<Ref<T>> {
  const debouncedValue = ref<T>(value.value) as Ref<T>;
  let timeout: ReturnType<typeof setTimeout>;

  const updateDebouncedValue = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      debouncedValue.value = value.value;
    }, delay);
  };

  watch(value, updateDebouncedValue);

  onUnmounted(() => clearTimeout(timeout));

  return readonly(debouncedValue);
}

// Verwendung
const searchQuery = ref('');
const debouncedQuery = useDebounce(searchQuery, 500);

watch(debouncedQuery, (query) => {
  performSearch(query);
});
```

### 3. Provide/Inject mit TypeScript

```typescript
// types/injection-keys.ts
import type { InjectionKey } from 'vue';
import type { UserService } from '@/services/UserService';

export const UserServiceKey: InjectionKey<UserService> = Symbol('UserService');

// Parent Component
import { provide } from 'vue';
import { UserServiceKey } from '@/types/injection-keys';

provide(UserServiceKey, new UserService());

// Child Component
import { inject } from 'vue';
import { UserServiceKey } from '@/types/injection-keys';

const userService = inject(UserServiceKey);
if (!userService) {
  throw new Error('UserService not provided');
}
```

## 🗄️ State Management

### 1. Pinia Store Best Practices

```typescript
// stores/sessions.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useShallowArray } from '@/composables/useShallowReactivity';
import type { ChatSession, ChatMessage } from '@/types/chat';

export const useSessionsStore = defineStore('sessions', () => {
  // State - Shallow Reactivity für Performance
  const [sessions, sessionsBatch] = useShallowArray<ChatSession>();
  const currentSessionId = ref<string | null>(null);
  const messagesMap = new Map<string, ChatMessage[]>();

  // Getters
  const currentSession = computed(() => 
    sessions.value.find(s => s.id === currentSessionId.value)
  );

  const currentMessages = computed(() => 
    currentSessionId.value 
      ? messagesMap.get(currentSessionId.value) || []
      : []
  );

  // Private Helpers
  function validateSession(session: Partial<ChatSession>): session is ChatSession {
    return !!(session.id && session.title);
  }

  // Actions
  async function createSession(title: string): Promise<string> {
    try {
      const response = await api.post<ChatSession>('/sessions', { title });
      if (validateSession(response.data)) {
        sessionsBatch.add(response.data);
        return response.data.id;
      }
      throw new Error('Invalid session data');
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  // Store Reset
  function $reset() {
    sessionsBatch.clear();
    currentSessionId.value = null;
    messagesMap.clear();
  }

  return {
    // State (readonly)
    sessions: readonly(sessions),
    currentSessionId: readonly(currentSessionId),
    
    // Getters
    currentSession,
    currentMessages,
    
    // Actions
    createSession,
    $reset
  };
});
```

### 2. Store Composition

```typescript
// stores/chat.ts
export const useChatStore = defineStore('chat', () => {
  const sessionsStore = useSessionsStore();
  const authStore = useAuthStore();
  
  // Compose stores
  const canSendMessage = computed(() => 
    authStore.isAuthenticated && 
    sessionsStore.currentSession !== null
  );

  async function sendMessage(content: string) {
    if (!canSendMessage.value) {
      throw new Error('Cannot send message: Not authenticated or no session');
    }
    
    // Implementation
  }

  return { canSendMessage, sendMessage };
});
```

## ⚡ Performance Optimization

### 1. Shallow Reactivity für große Datensätze

```typescript
import { useShallowArray, useShallowMap } from '@/composables/useShallowReactivity';

// Für Listen mit 100+ Items
const [messages, messagesBatch] = useShallowArray<ChatMessage>();

// Für Maps mit häufigen Updates
const sessionCache = useShallowMap<string, ChatSession>();

// Batch-Updates für bessere Performance
function addMultipleMessages(newMessages: ChatMessage[]) {
  // Schlecht - Triggert multiple Updates
  newMessages.forEach(msg => messages.value.push(msg));
  
  // Gut - Ein Update für alle
  messagesBatch.update(
    () => true,
    (messages) => [...messages, ...newMessages]
  );
}
```

### 2. Virtual Scrolling Implementation

```vue
<template>
  <OptimizedMessageList
    ref="messageListRef"
    :messages="messages"
    :item-height="estimatedItemHeight"
    :buffer-size="10"
    @reach-top="loadOlderMessages"
  />
</template>

<script setup lang="ts">
const estimatedItemHeight = computed(() => {
  // Dynamische Höhe basierend auf durchschnittlicher Nachrichtenlänge
  const avgLength = messages.value.reduce(
    (sum, msg) => sum + msg.content.length, 0
  ) / messages.value.length;
  
  return Math.max(80, Math.min(200, avgLength * 0.5));
});
</script>
```

### 3. Memoization Strategies

```typescript
import { useMemoizedComputed, useMemoizedFunction } from '@/composables/useMemoizedComputed';

// Expensive Computed mit TTL
const searchResults = useMemoizedComputed(
  () => {
    return messages.value.filter(msg => 
      msg.content.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  },
  [messages, searchQuery],
  { ttl: 30000 } // 30 Sekunden Cache
);

// Function Memoization mit LRU Cache
const processMessage = useMemoizedFunction(
  (message: ChatMessage): ProcessedMessage => {
    // Expensive processing
    return {
      ...message,
      html: marked(message.content),
      tokens: tokenize(message.content),
      sentiment: analyzeSentiment(message.content)
    };
  },
  { maxCacheSize: 100 }
);
```

### 4. Batch Update Manager

```typescript
import { BatchUpdateManager } from '@/utils/BatchUpdateManager';

// Für Streaming Updates
const streamingBatch = new BatchUpdateManager<string>(
  (tokens: string[]) => {
    // Update message content in batches
    const combined = tokens.join('');
    updateStreamingMessage(combined);
  },
  {
    maxBatchSize: 100,
    flushIntervalMs: 16, // 60 FPS
    adaptiveThrottling: true,
    priority: 'high'
  }
);

// In Streaming Handler
function handleStreamToken(token: string) {
  streamingBatch.enqueue(token);
}
```

## 🧪 Testing Standards

### 1. Unit Test Structure

```typescript
// stores/sessions.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSessionsStore } from '@/stores/sessions';
import { mockApi } from '@/tests/mocks/api';

describe('SessionsStore', () => {
  let store: ReturnType<typeof useSessionsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useSessionsStore();
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const mockSession = { id: '123', title: 'Test Session' };
      mockApi.post.mockResolvedValue({ data: mockSession });

      const sessionId = await store.createSession('Test Session');

      expect(sessionId).toBe('123');
      expect(store.sessions).toContainEqual(mockSession);
      expect(mockApi.post).toHaveBeenCalledWith('/sessions', { title: 'Test Session' });
    });

    it('should handle API errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Network error'));

      await expect(store.createSession('Test')).rejects.toThrow('Network error');
      expect(store.sessions).toHaveLength(0);
    });
  });
});
```

### 2. Component Testing

```typescript
// components/ChatMessage.spec.ts
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ChatMessage from '@/components/ChatMessage.vue';
import { createTestingPinia } from '@pinia/testing';

describe('ChatMessage', () => {
  const defaultProps = {
    message: {
      id: '1',
      content: 'Hello World',
      role: 'user',
      timestamp: '2024-01-01T00:00:00Z'
    }
  };

  it('renders message content', () => {
    const wrapper = mount(ChatMessage, {
      props: defaultProps,
      global: {
        plugins: [createTestingPinia()]
      }
    });

    expect(wrapper.text()).toContain('Hello World');
    expect(wrapper.find('.message-role').text()).toBe('user');
  });

  it('emits edit event when edit button clicked', async () => {
    const wrapper = mount(ChatMessage, {
      props: { ...defaultProps, editable: true }
    });

    await wrapper.find('[data-test="edit-button"]').trigger('click');
    
    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('edit')[0]).toEqual([defaultProps.message]);
  });
});
```

### 3. E2E Testing

```typescript
// e2e/chat-flow.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { mockStreamingResponse } from './helpers/streaming';

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'testuser@example.com');
    await page.goto('/chat');
  });

  test('complete chat interaction', async ({ page }) => {
    // Start new session
    await page.click('[data-test="new-session-button"]');
    
    // Type message
    const input = page.locator('[data-test="message-input"]');
    await input.fill('Was ist nscale?');
    await input.press('Enter');
    
    // Wait for response
    await expect(page.locator('.message-assistant')).toBeVisible();
    
    // Verify streaming
    const streamingIndicator = page.locator('.streaming-indicator');
    await expect(streamingIndicator).toBeVisible();
    await expect(streamingIndicator).toBeHidden({ timeout: 10000 });
    
    // Verify message saved
    await expect(page.locator('.message-list .message-item')).toHaveCount(2);
  });
});
```

## 🚨 Error Handling

### 1. Global Error Handler

```typescript
// utils/errorHandler.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (axios.isAxiosError(error)) {
    return new AppError(
      error.response?.data?.message || error.message,
      'API_ERROR',
      error.response?.status,
      error.response?.data
    );
  }
  
  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR');
  }
  
  return new AppError('An unknown error occurred', 'UNKNOWN_ERROR');
}
```

### 2. Component Error Boundaries

```vue
<!-- components/ErrorBoundary.vue -->
<template>
  <div v-if="hasError" class="error-boundary">
    <h2>Oops! Etwas ist schiefgelaufen.</h2>
    <p>{{ error.message }}</p>
    <button @click="reset">Neu laden</button>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';

const hasError = ref(false);
const error = ref<Error | null>(null);

onErrorCaptured((err) => {
  hasError.value = true;
  error.value = err;
  
  // Log to monitoring service
  console.error('Component error:', err);
  
  // Prevent propagation
  return false;
});

function reset() {
  hasError.value = false;
  error.value = null;
}
</script>
```

### 3. Async Error Handling

```typescript
// composables/useAsyncOperation.ts
export function useAsyncOperation<T>() {
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const data = ref<T | null>(null);

  async function execute(
    operation: () => Promise<T>,
    options: {
      onError?: (error: Error) => void;
      retries?: number;
      retryDelay?: number;
    } = {}
  ) {
    loading.value = true;
    error.value = null;
    
    let lastError: Error;
    
    for (let i = 0; i <= (options.retries || 0); i++) {
      try {
        data.value = await operation();
        return data.value;
      } catch (e) {
        lastError = handleError(e);
        
        if (i < (options.retries || 0)) {
          await new Promise(resolve => 
            setTimeout(resolve, options.retryDelay || 1000)
          );
        }
      }
    }
    
    error.value = lastError!;
    options.onError?.(lastError!);
    throw lastError!;
  } finally {
    loading.value = false;
  }

  return { loading, error, data, execute };
}
```

## 🔒 Security Guidelines

### 1. Input Sanitization

```typescript
import DOMPurify from 'dompurify';

// Sanitize HTML content
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
}

// Validate and sanitize user input
export function sanitizeUserInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML
    .slice(0, 5000); // Limit length
}
```

### 2. Authentication & Authorization

```typescript
// composables/useSecureApi.ts
export function useSecureApi() {
  const authStore = useAuthStore();
  
  const secureAxios = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 30000,
    withCredentials: true
  });

  // Request interceptor
  secureAxios.interceptors.request.use(
    (config) => {
      // Add auth token
      const token = authStore.accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Add CSRF token
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
      
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor
  secureAxios.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        // Token expired, try refresh
        try {
          await authStore.refreshToken();
          return secureAxios.request(error.config);
        } catch {
          authStore.logout();
          router.push('/login');
        }
      }
      return Promise.reject(error);
    }
  );

  return secureAxios;
}
```

### 3. Environment Variables

```typescript
// utils/config.ts
interface AppConfig {
  apiBaseUrl: string;
  apiTimeout: number;
  maxUploadSize: number;
  enableTelemetry: boolean;
}

// Validate and type environment variables
export const config: AppConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  apiTimeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
  maxUploadSize: parseInt(import.meta.env.VITE_MAX_UPLOAD_SIZE || '10485760'), // 10MB
  enableTelemetry: import.meta.env.VITE_ENABLE_TELEMETRY === 'true'
};

// Validate config at startup
if (!config.apiBaseUrl.startsWith('http')) {
  throw new Error('Invalid API base URL');
}
```

## 📝 Documentation

### 1. Component Documentation

```vue
<!-- 
  UserProfile.vue
  
  Displays and manages user profile information.
  
  @component
  @example
  <UserProfile 
    :user-id="currentUserId"
    :editable="true"
    @update="handleProfileUpdate"
  />
-->
<template>
  <!-- Component template -->
</template>

<script setup lang="ts">
/**
 * Props for UserProfile component
 */
interface Props {
  /** User ID to display */
  userId: string;
  /** Whether the profile can be edited */
  editable?: boolean;
  /** Initial user data (optional) */
  initialData?: UserData;
}

/**
 * Emitted events
 */
interface Emits {
  /** Emitted when profile is updated */
  (e: 'update', data: UserData): void;
  /** Emitted when edit is cancelled */
  (e: 'cancel'): void;
}

const props = withDefaults(defineProps<Props>(), {
  editable: false
});

const emit = defineEmits<Emits>();
</script>
```

### 2. Function Documentation

```typescript
/**
 * Calculates the similarity score between two messages using Levenshtein distance.
 * 
 * @param message1 - First message to compare
 * @param message2 - Second message to compare
 * @returns Similarity score between 0 and 1 (1 = identical)
 * 
 * @example
 * const score = calculateSimilarity("Hello World", "Hello Wrld");
 * console.log(score); // 0.91
 */
export function calculateSimilarity(message1: string, message2: string): number {
  // Implementation
}

/**
 * Formats a date for display in the chat interface.
 * 
 * @param date - Date to format (string, Date, or timestamp)
 * @param options - Formatting options
 * @returns Formatted date string
 * 
 * @throws {InvalidDateError} If the date is invalid
 */
export function formatChatDate(
  date: string | Date | number,
  options: FormatOptions = {}
): string {
  // Implementation
}
```

### 3. API Documentation

```typescript
/**
 * Chat API Service
 * 
 * Handles all chat-related API operations.
 * 
 * @class ChatApiService
 */
export class ChatApiService {
  /**
   * Creates a new chat session.
   * 
   * @param title - Session title
   * @param metadata - Optional session metadata
   * @returns Promise resolving to the created session
   * 
   * @throws {ApiError} If the API request fails
   * @throws {ValidationError} If the input is invalid
   * 
   * @example
   * const session = await chatApi.createSession('Project Discussion', {
   *   projectId: '123',
   *   participants: ['user1', 'user2']
   * });
   */
  async createSession(
    title: string,
    metadata?: Record<string, any>
  ): Promise<ChatSession> {
    // Implementation
  }
}
```

## ✅ Code Review Checklist

### General
- [ ] Code follows project style guidelines
- [ ] No commented-out code or debug statements
- [ ] Meaningful variable and function names
- [ ] DRY principle followed (no duplicated code)

### TypeScript
- [ ] Proper types (no `any` unless justified)
- [ ] Type inference used where appropriate
- [ ] Interfaces/types are exported and documented
- [ ] Null/undefined handled correctly

### Vue Components
- [ ] Props are properly typed
- [ ] Emits are properly typed
- [ ] Composition API used correctly
- [ ] No memory leaks (cleanup in onUnmounted)
- [ ] Computed properties for derived state
- [ ] Watchers used sparingly and with good reason

### Performance
- [ ] Large lists use virtual scrolling
- [ ] Heavy computations are memoized
- [ ] Batch updates for frequent changes
- [ ] Shallow reactivity for large data structures
- [ ] Images are optimized

### Testing
- [ ] Unit tests for new functions/components
- [ ] Edge cases covered
- [ ] Error scenarios tested
- [ ] Mocks used appropriately

### Security
- [ ] User input is sanitized
- [ ] API calls use authentication
- [ ] Sensitive data not exposed in logs
- [ ] Environment variables used for config

### Documentation
- [ ] Complex logic is commented
- [ ] Public APIs are documented
- [ ] README updated if needed
- [ ] Breaking changes noted

### Accessibility
- [ ] Proper ARIA labels
- [ ] Keyboard navigation works
- [ ] Color contrast sufficient
- [ ] Screen reader friendly

---

**Version**: 1.0  
**Letzte Aktualisierung**: Mai 2025  
**Maintainer**: Development Team