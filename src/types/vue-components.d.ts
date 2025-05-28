/**
 * Type declarations for Vue components
 */

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Specific component declarations for explicit imports
declare module "@/views/AuthView.vue" {
  import type { DefineComponent } from "vue";

  export interface AuthViewProps {
    // Add any props specific to AuthView here if needed
  }

  const AuthView: DefineComponent<
    AuthViewProps,
    {},
    {
      loginForm: {
        username: string;
        password: string;
        rememberMe: boolean;
      };
      registerForm: {
        username: string;
        email: string;
        password: string;
        confirmPassword: string;
      };
      activeTab: string;
      showRegister: boolean;
      version: string;
      currentYear: number;
      handleLogin: () => Promise<void>;
      handleRegister: () => Promise<void>;
      showForgotPassword: () => void;
    }
  >;

  export default AuthView;
}

declare module "@/views/ChatView.vue" {
  import type { DefineComponent } from "vue";
  const ChatView: DefineComponent<{}, {}, any>;
  export default ChatView;
}

declare module "@/views/AdminView.vue" {
  import type { DefineComponent } from "vue";
  const AdminView: DefineComponent<{}, {}, any>;
  export default AdminView;
}

declare module "@/views/SettingsView.vue" {
  import type { DefineComponent } from "vue";
  const SettingsView: DefineComponent<{}, {}, any>;
  export default SettingsView;
}

declare module "@/views/ErrorView.vue" {
  import type { DefineComponent } from "vue";
  const ErrorView: DefineComponent<{}, {}, any>;
  export default ErrorView;
}
