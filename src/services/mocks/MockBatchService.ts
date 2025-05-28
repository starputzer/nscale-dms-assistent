/**
 * Mock Batch Service for demo mode
 */

import { v4 as uuidv4 } from "uuid";

export class MockBatchService {
  async sendBatch(requests: any[]): Promise<any> {
    console.log(
      "[MockBatchService] Handling batch request with",
      requests.length,
      "requests",
    );

    // Return mock responses for each request
    const responses = requests.map((request) => {
      const { endpoint, method } = request;

      console.log("[MockBatchService] Processing request:", {
        endpoint,
        method,
      });

      // Sessions endpoints
      if (endpoint === "/sessions" && method === "GET") {
        return {
          success: true,
          data: {
            sessions: [
              {
                id: "demo-session-1",
                title: "Demo Chat Session",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_message: "This is a demo session",
                preview: "Welcome to the demo chat",
              },
            ],
            total: 1,
          },
        };
      }

      // Session stats endpoint
      if (endpoint === "/sessions/stats") {
        return {
          success: true,
          data: {
            totalSessions: 1,
            totalMessages: 5,
            averageSessionLength: 3,
          },
        };
      }

      // Messages endpoint
      if (endpoint && endpoint.includes("/messages") && method === "GET") {
        return {
          success: true,
          data: {
            messages: [
              {
                id: uuidv4(),
                content:
                  "Welcome to the demo version of the Digital File Assistant! This is a demonstration environment.",
                role: "assistant",
                created_at: new Date(Date.now() - 60000).toISOString(),
                session_id: "demo-session-1",
              },
              {
                id: uuidv4(),
                content: "How can I help you with your documents today?",
                role: "assistant",
                created_at: new Date().toISOString(),
                session_id: "demo-session-1",
              },
            ],
            total: 2,
          },
        };
      }

      // Create session endpoint
      if (endpoint === "/sessions" && method === "POST") {
        return {
          success: true,
          data: {
            id: "demo-session-" + Date.now(),
            title: "New Demo Session",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };
      }

      // Default response
      return {
        success: true,
        data: {},
      };
    });

    return Promise.resolve({
      success: true,
      data: responses,
    });
  }
}

export const mockBatchService = new MockBatchService();
