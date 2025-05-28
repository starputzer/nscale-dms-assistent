/**
 * Endpoint Validator
 *
 * Validates and fixes API endpoints before batch requests
 */

export class EndpointValidator {
  // Known working endpoints
  private static validEndpoints = [
    "/api/sessions",
    "/api/sessions/stats",
    "/api/sessions/:id",
    "/api/sessions/:id/messages",
    "/api/chat",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
  ];

  // Known problematic endpoints
  private static problemEndpoints = [
    "/api/sessions/:id/metadata",
    "/api/sessions/:id/bookmarks",
    "/api/sessions/:id/tags",
  ];

  /**
   * Check if an endpoint is valid
   */
  static isValidEndpoint(endpoint: string): boolean {
    // Replace dynamic parts with placeholders
    const normalizedEndpoint = endpoint.replace(/[a-f0-9-]{36}/g, ":id");

    // Check if it's in the problematic list
    if (
      this.problemEndpoints.some((pattern) =>
        this.matchPattern(pattern, normalizedEndpoint),
      )
    ) {
      console.warn(`⚠️ Problematic endpoint detected: ${endpoint}`);
      return false;
    }

    // Check if it's in the valid list
    return this.validEndpoints.some((pattern) =>
      this.matchPattern(pattern, normalizedEndpoint),
    );
  }

  /**
   * Fix batch requests by removing invalid endpoints
   */
  static fixBatchRequests(requests: any[]): any[] {
    return requests.filter((request) => {
      const endpoint = request.endpoint || request.path;
      if (!endpoint) return true; // Let the server handle it

      if (!this.isValidEndpoint(endpoint)) {
        console.warn(`🚫 Removing invalid endpoint from batch: ${endpoint}`);
        return false;
      }

      return true;
    });
  }

  /**
   * Match pattern with placeholders
   */
  private static matchPattern(pattern: string, endpoint: string): boolean {
    // Convert pattern to regex
    const regexPattern = pattern.replace(/\//g, "\\/").replace(/:id/g, "[^/]+");

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(endpoint);
  }

  /**
   * Get alternative endpoint
   */
  static getAlternativeEndpoint(endpoint: string): string | null {
    if (endpoint.includes("/metadata")) {
      // For metadata, we can use the session details endpoint
      return endpoint.replace("/metadata", "");
    }

    return null;
  }
}

// Export for debugging
if (typeof window !== "undefined") {
  (window as any).endpointValidator = EndpointValidator;
}
