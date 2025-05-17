import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useFeatureTogglesStore } from "@/stores/featureToggles";

// Setup fresh pinia for each test
beforeEach(() => {
  // Create a fresh pinia and make it active so it's automatically picked
  // up by any useStore() call without having to pass it to it
  setActivePinia(createPinia());
});

describe("Feature Toggles Store", () => {
  describe("Basic Store Functionality", () => {
    it("should initialize with default values", () => {
      const store = useFeatureTogglesStore();

      // Check the version
      expect(store.version).toBe(2);

      // Check that key features have default values
      expect(store.usePiniaAuth).toBe(true);
      expect(store.usePiniaUI).toBe(true);
      expect(store.useNewUIComponents).toBe(true);
    });

    it("should have functions to toggle features", () => {
      const store = useFeatureTogglesStore();

      // Set a feature flag to a known state
      store.useToastNotifications = true;
      expect(store.useToastNotifications).toBe(true);

      // Toggle the feature
      store.toggleFeature("useToastNotifications");
      expect(store.useToastNotifications).toBe(false);

      // Toggle it back
      store.toggleFeature("useToastNotifications");
      expect(store.useToastNotifications).toBe(true);
    });

    it("should have helper functions for bulk operations", () => {
      const store = useFeatureTogglesStore();

      // Disable all UI base components
      store.disableAllUIBaseComponents();
      expect(store.useSfcUIButton).toBe(false);
      expect(store.useSfcUIInput).toBe(false);
      expect(store.useSfcUICard).toBe(false);

      // Enable all UI base components
      store.enableAllUIBaseComponents();
      expect(store.useSfcUIButton).toBe(true);
      expect(store.useSfcUIInput).toBe(true);
      expect(store.useSfcUICard).toBe(true);
    });
  });

  describe("Dependency Management", () => {
    it("should handle feature dependencies correctly", () => {
      const store = useFeatureTogglesStore();

      // Disable prerequisites first
      store.useNewUIComponents = false;
      store.useSfcUIButton = false;

      // Try to enable a feature with dependencies
      expect(store.areDependenciesSatisfied("useSfcChatMessageItem")).toBe(false);
      
      // Enable prerequisite
      store.useNewUIComponents = true;
      store.useSfcUIButton = true;
      store.useSfcUICard = true;
      
      // Now dependencies should be satisfied
      expect(store.areDependenciesSatisfied("useSfcChatMessageItem")).toBe(true);
    });

    it("should automatically enable dependencies when requested", () => {
      const store = useFeatureTogglesStore();
      
      // Reset to a known state
      store.useNewUIComponents = false;
      store.useSfcUIButton = false;
      store.useSfcUICard = false;
      
      // Enable a feature with dependencies
      store.enableFeature("useSfcChatMessageItem");
      
      // Dependencies should be automatically enabled
      expect(store.useNewUIComponents).toBe(true);
      expect(store.useSfcUIButton).toBe(true);
      expect(store.useSfcUICard).toBe(true);
      expect(store.useSfcChatMessageItem).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should report feature errors and activate fallbacks", () => {
      const store = useFeatureTogglesStore();
      
      // Enable a feature to start with
      store.useSfcChatContainer = true;
      expect(store.useSfcChatContainer).toBe(true);
      
      // Report an error for the feature
      store.reportFeatureError(
        "useSfcChatContainer",
        "Test error message",
        { detail: "test" },
        true
      );
      
      // Fallback should be activated and feature disabled
      expect(store.isFallbackActive("useSfcChatContainer")).toBe(true);
      expect(store.useSfcChatContainer).toBe(false);
      
      // Check that error was recorded
      const errors = store.errors["useSfcChatContainer"] || [];
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe("Test error message");
      expect(errors[0].fallbackActive).toBe(true);
    });
    
    it("should clear feature errors when requested", () => {
      const store = useFeatureTogglesStore();
      
      // Create an error
      store.reportFeatureError("useSfcChatContainer", "Test error message");
      
      // Verify error exists
      expect(store.errors["useSfcChatContainer"]?.length).toBeGreaterThan(0);
      
      // Clear errors
      store.clearFeatureErrors("useSfcChatContainer");
      
      // Verify errors are cleared
      expect(store.errors["useSfcChatContainer"]?.length).toBe(0);
    });
  });

  describe("Feature Status", () => {
    it("should provide comprehensive feature status", () => {
      const store = useFeatureTogglesStore();
      
      // Set up test conditions
      store.useSfcChatContainer = true;
      store.reportFeatureError(
        "useSfcChatContainer",
        "Test error message",
        null,
        true
      );
      
      // Get feature status
      const status = store.getFeatureStatus("useSfcChatContainer");
      
      // Check status properties
      expect(status.isActive).toBe(false); // Deactivated due to error
      expect(status.hasFallback).toBe(true);
      expect(status.isFallbackActive).toBe(true);
      expect(status.errors.length).toBeGreaterThan(0);
    });
    
    it("should provide all feature configurations with status", () => {
      const store = useFeatureTogglesStore();
      
      // Check all configurations
      const configs = store.allFeatureConfigs;
      
      // Sample a few features to verify
      expect(configs.useSfcUIButton).toBeDefined();
      expect(configs.useSfcUIButton.name).toBe("SFC Button-Komponente");
      expect(configs.useSfcUIButton.status).toBeDefined();
      
      expect(configs.useSfcChatContainer).toBeDefined();
      expect(configs.useSfcChatContainer.name).toBe("SFC Chat-Container");
    });
  });

  describe("Document Converter Features", () => {
    it("should have all Document Converter features defined", () => {
      const store = useFeatureTogglesStore();
      
      // Check that all expected Document Converter features exist
      expect(store.useSfcDocConverterContainer).toBeDefined();
      expect(store.useSfcDocConverterFileUpload).toBeDefined();
      expect(store.useSfcDocConverterBatchUpload).toBeDefined();
      expect(store.useSfcDocConverterProgress).toBeDefined();
      expect(store.useSfcDocConverterResult).toBeDefined();
      expect(store.useSfcDocConverterList).toBeDefined();
      expect(store.useSfcDocConverterPreview).toBeDefined();
      expect(store.useSfcDocConverterStats).toBeDefined();
      expect(store.useSfcDocConverterErrorDisplay).toBeDefined();
    });
    
    it("should enable all Document Converter features with enableAllDocConverterComponents", () => {
      const store = useFeatureTogglesStore();
      
      // First disable all features
      store.disableAllDocConverterComponents();
      
      // Verify they're disabled
      expect(store.useSfcDocConverterContainer).toBe(false);
      expect(store.useSfcDocConverterFileUpload).toBe(false);
      expect(store.useSfcDocConverterBatchUpload).toBe(false);
      
      // Enable all Document Converter features
      store.enableAllDocConverterComponents();
      
      // Verify they're all enabled
      expect(store.useSfcDocConverterContainer).toBe(true);
      expect(store.useSfcDocConverterFileUpload).toBe(true);
      expect(store.useSfcDocConverterBatchUpload).toBe(true);
      expect(store.useSfcDocConverterProgress).toBe(true);
      expect(store.useSfcDocConverterResult).toBe(true);
      expect(store.useSfcDocConverterList).toBe(true);
      expect(store.useSfcDocConverterPreview).toBe(true);
      expect(store.useSfcDocConverterStats).toBe(true);
      expect(store.useSfcDocConverterErrorDisplay).toBe(true);
      
      // Check that parent feature is also enabled
      expect(store.useSfcDocConverter).toBe(true);
    });
    
    it("should disable all Document Converter features with disableAllDocConverterComponents", () => {
      const store = useFeatureTogglesStore();
      
      // First enable all features
      store.enableAllDocConverterComponents();
      
      // Then disable them
      store.disableAllDocConverterComponents();
      
      // Verify they're all disabled
      expect(store.useSfcDocConverterContainer).toBe(false);
      expect(store.useSfcDocConverterFileUpload).toBe(false);
      expect(store.useSfcDocConverterBatchUpload).toBe(false);
      expect(store.useSfcDocConverterProgress).toBe(false);
      expect(store.useSfcDocConverterResult).toBe(false);
      expect(store.useSfcDocConverterList).toBe(false);
      expect(store.useSfcDocConverterPreview).toBe(false);
      expect(store.useSfcDocConverterStats).toBe(false);
      expect(store.useSfcDocConverterErrorDisplay).toBe(false);
      
      // Check that parent feature is also disabled
      expect(store.useSfcDocConverter).toBe(false);
    });
    
    it("should respect Document Converter feature dependencies", () => {
      const store = useFeatureTogglesStore();
      
      // Reset to known state
      store.disableAllDocConverterComponents();
      
      // Try to enable a feature with a dependency on the container
      store.useSfcDocConverterContainer = false;
      store.useSfcUIButton = true;
      
      // Dependencies not satisfied yet
      expect(store.areDependenciesSatisfied("useSfcDocConverterFileUpload")).toBe(false);
      
      // Enable container
      store.useSfcDocConverterContainer = true;
      
      // Now dependencies should be satisfied
      expect(store.areDependenciesSatisfied("useSfcDocConverterFileUpload")).toBe(true);
      
      // Enable the feature
      store.enableFeature("useSfcDocConverterFileUpload");
      expect(store.useSfcDocConverterFileUpload).toBe(true);
    });
    
    it("should include Document Converter features in enableAllSfcFeatures", () => {
      const store = useFeatureTogglesStore();
      
      // Disable all SFC features including Document Converter
      store.disableAllSfcFeatures();
      
      // Verify they're disabled
      expect(store.useSfcDocConverter).toBe(false);
      expect(store.useSfcDocConverterContainer).toBe(false);
      
      // Enable all SFC features
      store.enableAllSfcFeatures();
      
      // Verify Document Converter features are enabled
      expect(store.useSfcDocConverter).toBe(true);
      expect(store.useSfcDocConverterContainer).toBe(true);
      expect(store.useSfcDocConverterFileUpload).toBe(true);
    });
  });
  
  describe("Feature Errors and Fallbacks", () => {
    it("should handle Document Converter component errors", () => {
      const store = useFeatureTogglesStore();
      
      // Enable a Document Converter feature
      store.useSfcDocConverterFileUpload = true;
      
      // Report an error
      store.reportFeatureError(
        "useSfcDocConverterFileUpload",
        "File upload error",
        { errorCode: "UPLOAD_FAILED" },
        true
      );
      
      // Verify fallback is activated
      expect(store.isFallbackActive("useSfcDocConverterFileUpload")).toBe(true);
      expect(store.useSfcDocConverterFileUpload).toBe(false);
      
      // Check error details
      const errors = store.errors["useSfcDocConverterFileUpload"] || [];
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe("File upload error");
      expect(errors[0].details).toEqual({ errorCode: "UPLOAD_FAILED" });
    });
    
    it("should clear errors when disabling Document Converter features", () => {
      const store = useFeatureTogglesStore();
      
      // Report errors for multiple Document Converter features
      store.reportFeatureError("useSfcDocConverterContainer", "Container error");
      store.reportFeatureError("useSfcDocConverterFileUpload", "Upload error");
      
      // Disable all Document Converter features
      store.disableAllDocConverterComponents();
      
      // Verify errors are cleared
      expect(store.errors["useSfcDocConverterContainer"]?.length).toBe(0);
      expect(store.errors["useSfcDocConverterFileUpload"]?.length).toBe(0);
      
      // Verify fallbacks are deactivated
      expect(store.isFallbackActive("useSfcDocConverterContainer")).toBe(false);
      expect(store.isFallbackActive("useSfcDocConverterFileUpload")).toBe(false);
    });
  });
});