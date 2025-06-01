/**
 * Module declarations for TypeScript
 */

// Bridge modules
declare module "@/bridge/enhanced" {
  export function useBridge(): any;
}

declare module "@/bridge/enhanced/types" {
  export interface BridgeAPI {
    on(event: string, callback: (data?: any) => void, caller?: string): any;
    emit(event: string, data?: any): void;
  }
}

// Adapter modules
declare module "@/composables/adapters/useChatAdapter" {
  export function useChatAdapter(): any;
}

declare module "@/stores/adapters/sessionStoreAdapter" {
  export function useSessionsStoreCompat(): any;
}

// Component modules
declare module "@/components/chat/enhanced" {
  import { DefineComponent } from "vue";
  export const VirtualMessageList: DefineComponent<any, any, any>;
  export const EnhancedMessageInput: DefineComponent<any, any, any>;
  export const SessionManager: DefineComponent<any, any, any>;
}

// Type modules
declare module "@/types/session" {
  export interface Session {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    isArchived?: boolean;
    isPinned?: boolean;
    [key: string]: any;
  }
}
