/**
 * Mock-Service für Admin-API-Aufrufe
 * Entwickelt für die Nutzung während der Entwicklung oder wenn Backend-Dienste nicht verfügbar sind
 */

import { random } from "lodash-es";

// Mock data generator and store
export const adminMockService = {
  // Configuration - can be set via environment variables
  shouldAlwaysUseMock: process.env.NODE_ENV === "development" || false,
  
  // Helper to determine whether to use mock data
  shouldUseMock(endpoint: string): boolean {
    // Check for URL parameters
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      
      // Force mock data if URL parameter is set
      if (urlParams.get('forceMock') === 'true') {
        console.info(`[adminMockService] Verwende Mock-Daten für ${endpoint} (via URL-Parameter)`);
        return true;
      }
      
      // Force real API if URL parameter is set
      if (urlParams.get('forceReal') === 'true') {
        console.info(`[adminMockService] Verwende echte API für ${endpoint} (via URL-Parameter)`);
        return false;
      }
    }
    
    // Always use mock data in development (safer option)
    if (process.env.NODE_ENV === 'development') {
      // Specific endpoints that are known to have issues
      if (endpoint.includes('/admin/system') || 
          endpoint.includes('/admin/stats') || 
          endpoint.includes('/api/motd') ||
          endpoint.includes('/admin/feature-toggles') ||
          endpoint.includes('/admin/doc-converter')) {
        return true;
      }
    }
    
    return this.shouldAlwaysUseMock;
  },

  // Get mock response for a specific endpoint
  async getMockResponse(endpoint: string, params?: any): Promise<any> {
    // Split the endpoint to get the base path
    const path = endpoint.split("?")[0];

    // Match endpoints to mock generators
    if (path.startsWith("/admin/users")) {
      return this.getUsersMockData(path, params);
    }

    if (path.startsWith("/admin/stats")) {
      return this.getSystemStatsMockData();
    }

    if (path.startsWith("/admin/feedback")) {
      return this.getFeedbackMockData(path);
    }

    if (path.startsWith("/api/motd")) {
      return this.getMotdMockData();
    }

    if (path.startsWith("/admin/doc-converter")) {
      return this.getDocConverterMockData(path, params);
    }

    if (path.startsWith("/admin/logs")) {
      return this.getLogsMockData(path, params);
    }

    if (path.startsWith("/admin/feature-toggles")) {
      return this.getFeatureTogglesMockData(path, params);
    }

    // Default empty response
    return {};
  },

  // Mock data generators for each endpoint group
  getUsersMockData(path: string, params?: any): any {
    // List users
    if (path === "/admin/users") {
      return {
        users: [
          {
            id: "user1",
            name: "Admin User",
            email: "admin@example.com",
            role: "admin",
            active: true,
            created_at: Date.now() / 1000 - 365 * 24 * 60 * 60, // 1 year ago
            last_login: Date.now() / 1000 - 2 * 60 * 60, // 2 hours ago
          },
          {
            id: "user2",
            name: "Regular User",
            email: "user@example.com",
            role: "user",
            active: true,
            created_at: Date.now() / 1000 - 180 * 24 * 60 * 60, // 180 days ago
            last_login: Date.now() / 1000 - 1 * 24 * 60 * 60, // 1 day ago
          },
          {
            id: "user3",
            name: "Inactive User",
            email: "inactive@example.com",
            role: "user",
            active: false,
            created_at: Date.now() / 1000 - 200 * 24 * 60 * 60, // 200 days ago
            last_login: Date.now() / 1000 - 60 * 24 * 60 * 60, // 60 days ago
          },
          {
            id: "user4",
            name: "New User",
            email: "new@example.com",
            role: "user",
            active: true,
            created_at: Date.now() / 1000 - 5 * 24 * 60 * 60, // 5 days ago
            last_login: Date.now() / 1000 - 1 * 60 * 60, // 1 hour ago
          },
        ],
      };
    }

    // Update user role
    if (path.includes("/role") && params) {
      return { success: true };
    }

    // Delete user
    if (path.includes("/users/") && !path.includes("/role")) {
      return { success: true };
    }

    return {};
  },

  getSystemStatsMockData(): any {
    return {
      total_users: 987,
      active_users_today: 234,
      total_sessions: 5432,
      total_messages: 87654,
      avg_messages_per_session: 16.14,
      total_feedback: 321,
      positive_feedback_percent: 87,
      database_size_mb: 1254,
      cache_size_mb: 432,
      cache_hit_rate: 91.5,
      document_count: 789,
      avg_response_time_ms: 856,
      active_model: "GPT-4",
      uptime_days: 42.5,
      memory_usage_percent: 63,
      cpu_usage_percent: 47,
      start_time: Date.now() / 1000 - 42.5 * 24 * 60 * 60,
    };
  },

  getFeedbackMockData(path: string): any {
    // Feedback stats
    if (path.includes("/stats")) {
      return {
        total: 321,
        positive: 279,
        negative: 42,
        neutral: 0,
        avg_rating: 4.7,
      };
    }

    // Negative feedback
    if (path.includes("/negative")) {
      return {
        items: [
          {
            id: "feedback1",
            user_id: "user2",
            user_email: "user@example.com",
            message: "Die Antworten sind manchmal zu langsam.",
            rating: 2,
            created_at: Date.now() / 1000 - 5 * 24 * 60 * 60,
            session_id: "session123",
            status: "pending",
            is_positive: false,
          },
          {
            id: "feedback2",
            user_id: "user3",
            user_email: "inactive@example.com",
            message: "Die Ergebnisse sind nicht immer relevant.",
            rating: 1,
            created_at: Date.now() / 1000 - 10 * 24 * 60 * 60,
            session_id: "session456",
            status: "in_progress",
            is_positive: false,
          },
          {
            id: "feedback3",
            user_id: "user4",
            user_email: "new@example.com",
            message: "Könnte mehr Dokumenttypen unterstützen.",
            rating: 3,
            created_at: Date.now() / 1000 - 2 * 24 * 60 * 60,
            session_id: "session789",
            status: "resolved",
            is_positive: false,
          },
        ],
      };
    }

    return {};
  },

  getMotdMockData(): any {
    return {
      config: {
        enabled: true,
        format: "markdown",
        content:
          "🛠️ **Willkommen beim Digitale Akte Assistent**\n\nSie können jetzt mit Ihrem eigenen Dokumenten chatten und Antworten in Echtzeit erhalten.",
        style: {
          backgroundColor: "#d1ecf1",
          borderColor: "#bee5eb",
          textColor: "#0c5460",
          iconClass: "info-circle",
        },
        display: {
          position: "top",
          dismissible: true,
          showOnStartup: true,
          showInChat: true,
        },
      },
    };
  },

  getDocConverterMockData(path: string, params?: any): any {
    // Status
    if (path.includes("/status")) {
      return {
        status: "running",
        worker_count: 4,
        queue_length: 2,
        active_jobs: 1,
        last_update: Date.now() / 1000,
      };
    }

    // Settings
    if (path.includes("/settings")) {
      if (params) {
        // Update settings
        return { success: true };
      }

      // Get settings
      return {
        max_file_size_mb: 25,
        allowed_formats: ["pdf", "docx", "xlsx", "pptx", "odt"],
        conversion_quality: "high",
        auto_delete_after_conversion: false,
      };
    }

    // Document converter stats
    if (path.includes("/doc-converter/stats")) {
      return {
        total_documents: 567,
        successful_conversions: 543,
        failed_conversions: 24,
        avg_conversion_time: 12500, // 12.5 seconds
      };
    }

    // Recent conversions
    if (path.includes("/doc-converter/recent")) {
      const page = params?.page || 1;
      const limit = params?.limit || 10;

      const conversions = [];
      for (let i = 0; i < limit; i++) {
        const timestamp = Date.now() / 1000 - (i * 24 * 60 * 60) / limit;
        const fileTypes = ["pdf", "docx", "xlsx", "pptx"];
        const fileType =
          fileTypes[Math.floor(Math.random() * fileTypes.length)];
        const statuses = ["completed", "failed", "pending", "processing"];
        const statusWeights = [0.8, 0.1, 0.05, 0.05]; // 80% completed, 10% failed, etc.

        // Weighted random status
        let status;
        const rand = Math.random();
        let accWeight = 0;
        for (let j = 0; j < statuses.length; j++) {
          accWeight += statusWeights[j];
          if (rand <= accWeight) {
            status = statuses[j];
            break;
          }
        }

        conversions.push({
          id: `job-${(page - 1) * limit + i + 1}`,
          filename: `Dokument-${(page - 1) * limit + i + 1}.${fileType}`,
          file_type: fileType,
          file_size: Math.floor(Math.random() * 1000000) + 100000, // 100KB to 1.1MB
          user_id: `user${Math.floor(Math.random() * 4) + 1}`,
          user_name:
            i % 3 === 0 ? null : `User ${Math.floor(Math.random() * 4) + 1}`,
          user_email: `user${Math.floor(Math.random() * 4) + 1}@example.com`,
          status,
          conversion_time_ms:
            status === "completed"
              ? Math.floor(Math.random() * 20000) + 5000
              : 0,
          created_at: timestamp,
          error_message:
            status === "failed"
              ? "Datei konnte nicht verarbeitet werden."
              : undefined,
        });
      }

      return {
        items: conversions,
        total: 50,
        page,
        limit,
      };
    }

    // Conversion queue
    if (path.includes("/doc-converter/queue")) {
      const queue = [];
      for (let i = 0; i < 2; i++) {
        queue.push({
          id: `queue-${i + 1}`,
          filename: `Wartende-Datei-${i + 1}.docx`,
          user_name: i === 0 ? "Admin User" : null,
          user_email: i === 0 ? "admin@example.com" : "user@example.com",
          progress: i === 0 ? 65 : 12,
        });
      }

      return queue;
    }

    // Job management
    if (path.includes("/jobs/")) {
      if (path.includes("/start") || path.includes("/cancel")) {
        return { success: true };
      }
    }

    return {};
  },

  getLogsMockData(path: string, params?: any): any {
    if (path === "/admin/logs") {
      const level = params?.level || "";
      const logLevels = ["error", "warn", "info", "debug"];
      const logs = [];

      for (let i = 0; i < 20; i++) {
        const timestamp = Date.now() - i * 60000; // Every minute
        const randomLevel =
          logLevels[Math.floor(Math.random() * logLevels.length)];

        // Skip if filtering by level
        if (level && level !== randomLevel) {
          continue;
        }

        const messages = {
          error: [
            "Failed to connect to database",
            "Out of memory exception",
            "Invalid token received",
            "API limit reached",
          ],
          warn: [
            "Slow query detected",
            "Cache invalidation triggered",
            "Rate limit approaching",
            "Resource usage high",
          ],
          info: [
            "User logged in",
            "Document converted successfully",
            "System backup completed",
            "Cache refreshed",
          ],
          debug: [
            "Request parameters: {...}",
            "Response time: 235ms",
            "Cache hit ratio: 87%",
            "Memory usage: 63%",
          ],
        };

        logs.push({
          id: `log-${i}`,
          timestamp,
          level: randomLevel,
          message:
            messages[randomLevel][
              Math.floor(Math.random() * messages[randomLevel].length)
            ],
        });
      }

      return logs;
    }

    if (path.includes("/export") || path.includes("/clear")) {
      return { success: true };
    }

    return {};
  },

  getFeatureTogglesMockData(path: string, params?: any): any {
    if (path === "/admin/feature-toggles") {
      return {
        toggles: [
          {
            id: "enhanced-chat",
            name: "Enhanced Chat",
            description:
              "Aktiviert die erweiterte Chat-Oberfläche mit zusätzlichen Funktionen.",
            enabled: true,
            environment: "production",
            created_at: Date.now() / 1000 - 90 * 24 * 60 * 60,
          },
          {
            id: "document-converter",
            name: "Dokumentenkonverter",
            description:
              "Ermöglicht das Konvertieren und Analysieren von Dokumenten.",
            enabled: true,
            environment: "production",
            created_at: Date.now() / 1000 - 120 * 24 * 60 * 60,
          },
          {
            id: "advanced-search",
            name: "Erweiterte Suche",
            description: "Aktiviert die semantische Suche in Dokumenten.",
            enabled: false,
            environment: "staging",
            created_at: Date.now() / 1000 - 45 * 24 * 60 * 60,
          },
          {
            id: "source-references",
            name: "Quellenangaben",
            description: "Zeigt Quellenangaben für Antworten an.",
            enabled: true,
            environment: "production",
            created_at: Date.now() / 1000 - 60 * 24 * 60 * 60,
          },
          {
            id: "feedback-system",
            name: "Feedback-System",
            description:
              "Ermöglicht Benutzern, Feedback zu Antworten zu geben.",
            enabled: true,
            environment: "production",
            created_at: Date.now() / 1000 - 180 * 24 * 60 * 60,
          },
        ],
      };
    }

    if (path.includes("/feature-toggles/") && params) {
      return { success: true };
    }

    return {};
  },
};
