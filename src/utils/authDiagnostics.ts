/**
 * Authentication Diagnostics Tool
 * Provides detailed logging and debugging for auth flow
 */

import { watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { apiService } from "@/services/api/ApiService";
import axios from "axios";

interface AuthDiagnosticEntry {
  timestamp: string;
  type:
    | "login"
    | "token_storage"
    | "request"
    | "response"
    | "error"
    | "interceptor";
  action: string;
  details: any;
  stackTrace?: string;
}

class AuthDiagnostics {
  private entries: AuthDiagnosticEntry[] = [];
  private isEnabled: boolean = false;
  private authStore: any = null;
  private originalConsoleLog: any;
  private originalConsoleError: any;
  private axiosRequestInterceptor: number | null = null;
  private axiosResponseInterceptor: number | null = null;

  constructor() {
    this.originalConsoleLog = console.log;
    this.originalConsoleError = console.error;
  }

  enable() {
    this.isEnabled = true;
    this.log("diagnostics" as any, "Authentication diagnostics enabled" as any);

    // Hook into auth store
    this.hookAuthStore();

    // Hook into axios interceptors
    this.hookAxiosInterceptors();

    // Hook into localStorage
    this.hookLocalStorage();

    // Hook into console for additional context
    this.hookConsole();

    // Monitor API service
    this.monitorApiService();

    console.log(
      "🔍 Auth Diagnostics Enabled - Use window.authDiagnostics.report() to see the log",
    );
  }

  disable() {
    this.isEnabled = false;
    this.unhookAll();
    console.log("🔍 Auth Diagnostics Disabled");
  }

  private log(
    type: AuthDiagnosticEntry["type"],
    action: string,
    details?: any,
  ) {
    if (!this.isEnabled) return;

    const entry: AuthDiagnosticEntry = {
      timestamp: new Date().toISOString(),
      type,
      action,
      details: details || {},
      stackTrace: new Error().stack,
    };

    this.entries.push(entry);

    // Also log to console for real-time monitoring
    this.originalConsoleLog(
      `[AUTH-DIAG] ${type.toUpperCase()}: ${action}`,
      details,
    );
  }

  private hookAuthStore() {
    try {
      this.authStore = useAuthStore();

      // Watch auth store state changes
      const watchers = ["token", "user", "isAuthenticated", "error"];

      watchers.forEach((key: any) => {
        watch(
          () => (this.authStore as any)[key],
          (newValue: any, oldValue: any) => {
            this.log("token_storage", `Auth store ${key} changed`, {
              key,
              oldValue: this.sanitizeValue(oldValue),
              newValue: this.sanitizeValue(newValue),
              location: "Pinia store",
            });
          },
          { immediate: true },
        );
      });

      // Hook into auth methods
      const methods = ["login", "logout", "refreshToken", "setToken"];
      methods.forEach((method: any) => {
        const original = this.authStore[method];
        if (original) {
          this.authStore[method] = async (...args: any[]) => {
            this.log("login", `Auth store ${method} called`, {
              method,
              args: this.sanitizeValue(args),
            });
            try {
              const result = await original.apply(this.authStore, args);
              this.log("login", `Auth store ${method} completed`, {
                method,
                result: this.sanitizeValue(result),
              });
              return result;
            } catch (error) {
              this.log("error", `Auth store ${method} failed`, {
                method,
                error: error.message,
              });
              throw error;
            }
          };
        }
      });
    } catch (error) {
      this.log("error", "Failed to hook auth store", { error: error.message });
    }
  }

  private hookAxiosInterceptors() {
    // Add request interceptor
    this.axiosRequestInterceptor = axios.interceptors.request.use(
      (config: any) => {
        this.log("request", "Axios request intercepted", {
          url: config.url,
          method: config.method,
          headers: this.sanitizeHeaders(config.headers),
          authHeader: config.headers?.Authorization,
        });
        return config;
      },
      (error: any) => {
        this.log("error", "Axios request error", { error: error.message });
        return Promise.reject(error);
      },
    );

    // Add response interceptor
    this.axiosResponseInterceptor = axios.interceptors.response.use(
      (response: any) => {
        this.log("response", "Axios response received", {
          url: response.config.url,
          status: response.status,
          headers: this.sanitizeHeaders(response.headers),
          data: this.sanitizeValue(response.data),
        });
        return response;
      },
      (error: any) => {
        this.log("error", "Axios response error", {
          url: error.config?.url,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      },
    );
  }

  private hookLocalStorage() {
    const originalSetItem = localStorage.setItem;
    const originalGetItem = localStorage.getItem;
    const originalRemoveItem = localStorage.removeItem;

    localStorage.setItem = (key: string, value: string) => {
      if (key.includes("token") || key.includes("auth")) {
        this.log("token_storage", "localStorage.setItem", {
          key,
          value: this.sanitizeValue(value),
          valueLength: value?.length,
        });
      }
      return originalSetItem.call(localStorage, key, value);
    };

    localStorage.getItem = (key: string) => {
      const value = originalGetItem.call(localStorage, key);
      if (key.includes("token") || key.includes("auth")) {
        this.log("token_storage", "localStorage.getItem", {
          key,
          value: this.sanitizeValue(value),
          valueLength: value?.length,
          found: value !== null,
        });
      }
      return value;
    };

    localStorage.removeItem = (key: string) => {
      if (key.includes("token") || key.includes("auth")) {
        this.log("token_storage", "localStorage.removeItem", { key });
      }
      return originalRemoveItem.call(localStorage, key);
    };
  }

  private hookConsole() {
    console.log = (...args: any[]) => {
      const message = args[0];
      if (
        typeof message === "string" &&
        (message.includes("token") ||
          message.includes("auth") ||
          message.includes("Authorization"))
      ) {
        this.log("interceptor", "Console log", { message, args });
      }
      this.originalConsoleLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
      const message = args[0];
      if (
        typeof message === "string" &&
        (message.includes("token") ||
          message.includes("auth") ||
          message.includes("401"))
      ) {
        this.log("error", "Console error", { message, args });
      }
      this.originalConsoleError.apply(console, args);
    };
  }

  private monitorApiService() {
    // Hook into API service methods if available
    try {
      const methods = ["get", "post", "put", "delete", "customRequest"];
      methods.forEach((method: any) => {
        const original = (apiService as any)[method];
        if (original) {
          (apiService as any)[method] = async (...args: any[]) => {
            this.log("request", `ApiService.${method} called`, {
              method,
              args: this.sanitizeValue(args),
            });
            try {
              const result = await original.apply(apiService, args);
              this.log("response", `ApiService.${method} completed`, {
                method,
                result: this.sanitizeValue(result),
              });
              return result;
            } catch (error) {
              this.log("error", `ApiService.${method} failed`, {
                method,
                error: error.message,
              });
              throw error;
            }
          };
        }
      });
    } catch (error) {
      this.log("error", "Failed to monitor API service", {
        error: error.message,
      });
    }
  }

  private sanitizeValue(value: any): any {
    if (!value) return value;

    // Handle tokens
    if (typeof value === "string" && value.length > 50) {
      return value.substring(0, 20) + "...[TRUNCATED]";
    }

    // Handle objects with tokens
    if (typeof value === "object") {
      const sanitized: any = Array.isArray(value) ? [] : {};
      for (const key in value) {
        if (
          key.toLowerCase().includes("token") ||
          key.toLowerCase().includes("password")
        ) {
          sanitized[key] = this.sanitizeValue(value[key]);
        } else {
          sanitized[key] = value[key];
        }
      }
      return sanitized;
    }

    return value;
  }

  private sanitizeHeaders(headers: any): any {
    if (!headers) return headers;

    const sanitized: any = {};
    for (const key in headers) {
      if (key.toLowerCase() === "authorization") {
        const value = headers[key];
        sanitized[key] = value ? value.substring(0, 30) + "..." : null;
      } else {
        sanitized[key] = headers[key];
      }
    }
    return sanitized;
  }

  private unhookAll() {
    // Restore console
    console.log = this.originalConsoleLog;
    console.error = this.originalConsoleError;

    // Remove axios interceptors
    if (this.axiosRequestInterceptor !== null) {
      axios.interceptors.request.eject(this.axiosRequestInterceptor);
    }
    if (this.axiosResponseInterceptor !== null) {
      axios.interceptors.response.eject(this.axiosResponseInterceptor);
    }

    // Note: Can't easily unhook localStorage and auth store methods
    // They would need to be reloaded
  }

  report(): void {
    console.log("=== Authentication Diagnostics Report ===");
    console.log(`Total entries: ${this.entries.length}`);
    console.log("");

    // Group by type
    const grouped = this.entries.reduce(
      (acc, entry) => {
        acc[entry.type] = acc[entry.type] || [];
        acc[entry.type].push(entry);
        return acc;
      },
      {} as Record<string, AuthDiagnosticEntry[]>,
    );

    // Display each type
    Object.keys(grouped).forEach((type: any) => {
      console.log(`\n--- ${type.toUpperCase()} ---`);
      grouped[type].forEach((entry: any) => {
        console.log(`${entry.timestamp} - ${entry.action}`);
        console.log("Details:", entry.details);
      });
    });

    // Show current localStorage state
    console.log("\n--- Current LocalStorage State ---");
    const authKeys = Object.keys(localStorage).filter(
      (key) => key.includes("token") || key.includes("auth"),
    );
    authKeys.forEach((key: any) => {
      const value = localStorage.getItem(key);
      console.log(`${key}: ${this.sanitizeValue(value)}`);
    });

    // Show last errors
    const errors = grouped.error || [];
    if (errors.length > 0) {
      console.log("\n--- Last Errors ---");
      errors.slice(-5).forEach((entry: any) => {
        console.log(`${entry.timestamp} - ${entry.action}`);
        console.log("Details:", entry.details);
      });
    }
  }

  exportLog(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  clear(): void {
    this.entries = [];
    console.log("Diagnostic log cleared");
  }
}

// Create global instance
export const authDiagnostics = new AuthDiagnostics();

// Attach to window for easy access
if (typeof window !== "undefined") {
  (window as any).authDiagnostics = authDiagnostics;
}

export default authDiagnostics;
