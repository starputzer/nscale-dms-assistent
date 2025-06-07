/**
 * Batch Debug Commands
 *
 * Debug-Befehle für die Analyse von Batch-Request-Problemen
 */

window.batchDebug = {
  // Batch response analysis aktivieren
  enableDebug: () => {
    if (window.batchResponseFix) {
      window.batchResponseFix.enableDebug();
      console.log("✅ Batch response debugging enabled");
    } else {
      console.error("❌ batchResponseFix not available");
    }
  },

  // Response history anzeigen
  showHistory: () => {
    if (window.batchResponseFix) {
      const history = window.batchResponseFix.getHistory();
      console.log("📋 Batch Response History:");
      history.forEach((entry, index) => {
        console.log(`\n=== Response ${index + 1} ===`);
        console.log("Expected:", entry.expectedFormat);
        console.log("Actual:", entry.actualFormat);
        console.log("Issues:", entry.issues);
        console.log("Raw:", entry.rawResponse);
        console.log("Processed:", entry.processedResponse);
      });
    }
  },

  // Test batch request
  testBatch: async () => {
    console.log("🧪 Testing batch request...");

    try {
      const batchService =
        window.__PINIA__.state.value.sessions?.batchRequestService ||
        window.batchRequestService;

      if (!batchService) {
        console.error("❌ Batch service not found");
        return;
      }

      const testRequests = [
        {
          id: "test-sessions",
          method: "GET",
<<<<<<< HEAD
          path: "/api/chat/sessions",
=======
          path: "/api/sessions",
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
          headers: {
            Authorization: `Bearer ${localStorage.getItem("nscale_access_token")}`,
          },
        },
      ];

      console.log("Sending test batch request...");
      const responses = await batchService.executeBatch(testRequests);

      console.log("✅ Batch test response:", responses);

      // Analyze with fix
      if (window.batchResponseFix) {
        window.batchResponseFix.analyzeResponse(responses);
      }
    } catch (error) {
      console.error("❌ Batch test failed:", error);
    }
  },

  // Manual response analysis
  analyze: (response) => {
    if (window.batchResponseFix) {
      const analysis = window.batchResponseFix.analyzeResponse(response);
      console.log("🔍 Response analysis:", analysis);
      return analysis;
    }
    console.error("❌ batchResponseFix not available");
  },

  // Check sessions store
  checkSessions: () => {
    const sessionsStore = window.__PINIA__.state.value.sessions;
    console.log("📦 Sessions Store:", {
      sessions: sessionsStore?.sessions,
      messages: sessionsStore?.messages,
      currentSessionId: sessionsStore?.currentSessionId,
      errors: sessionsStore?.error,
    });
  },

  // Clear debug data
  clear: () => {
    if (window.batchResponseFix) {
      window.batchResponseFix.clearHistory();
      console.log("✅ Debug data cleared");
    }
  },
};

console.log("🛠️ Batch debug commands loaded. Available commands:");
console.log("  window.batchDebug.enableDebug() - Enable response debugging");
console.log("  window.batchDebug.showHistory() - Show response history");
console.log("  window.batchDebug.testBatch()   - Test batch request");
console.log("  window.batchDebug.analyze(resp) - Analyze specific response");
console.log("  window.batchDebug.checkSessions() - Check sessions store");
console.log("  window.batchDebug.clear()       - Clear debug data");
