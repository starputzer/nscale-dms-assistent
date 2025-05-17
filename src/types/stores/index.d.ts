// Type declaration file for the Vue application's store imports
// This file enables TypeScript to understand the module imports

declare module '@/stores/auth' {
  export function useAuthStore(): {
    isAuthenticated: boolean;
    token: string | null;
    userRole: string;
    logout(): void;
    validateToken(): Promise<void>;
  };
}

declare module '@/stores/sessions' {
  import type { ChatSession, ChatMessage } from '@/types/session';
  
  export function useSessionsStore(): {
    sessions: ChatSession[];
    currentSession: ChatSession | null;
    messages: ChatMessage[];
    loadSessions(): Promise<void>;
    createNewSession(): Promise<void>;
    loadSession(sessionId: string): Promise<void>;
    deleteSession(sessionId: string): Promise<void>;
    addMessage(message: ChatMessage): void;
    updateStreamedMessage(content: string): void;
    clearSessions(): void;
  };
}

declare module '@/stores/settings' {
  export function useSettingsStore(): {
    fontSizeLevel: number;
    contrastMode: string;
    colorMode: string;
    language: string;
    streamingEnabled: boolean;
    setFontSizeLevel(value: number): void;
    setContrastMode(value: string): void;
    setColorMode(value: string): void;
    setLanguage(value: string): void;
    setStreamingEnabled(value: boolean): void;
    resetToDefaults(): void;
  };
}

declare module '@/stores/ui' {
  export function useUIStore(): {
    activeView: string;
    settingsVisible: boolean;
    setActiveView(view: string): void;
    toggleSettings(): void;
    showToast(toast: {type: string, message: string}): void;
  };
}

declare module '@/stores/admin/motd' {
  import type { MotdConfig } from '@/types/admin';
  
  export function useMotdStore(): {
    config: MotdConfig;
    editConfig: MotdConfig;
    dismissed: boolean;
    dismiss(): void;
    saveConfig(config: MotdConfig): void;
  };
}

declare module '@/stores/admin/feedback' {
  export function useFeedbackStore(): {
    submitFeedback(feedback: {
      messageId: string | null;
      type: string;
      comment: string;
      sessionId: string | null;
    }): Promise<void>;
  };
}

declare module '@/stores/abTests' {
  export function useABTestStore(): {
    tests: any[];
    loadTests(): Promise<void>;
  };
}

// Component declarations
declare module '@/views/AuthView.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module '@/views/ChatView.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module '@/views/AdminView.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module '@/components/layout/Header.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module '@/components/ui/Motd.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module '@/components/ui/ToastContainer.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module '@/components/dialog/FeedbackDialog.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module '@/components/dialog/SettingsDialog.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module '@/components/shared/ErrorBoundary.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module '@/components/shared/CriticalError.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}