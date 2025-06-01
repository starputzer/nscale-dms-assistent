import { describe, it, expect, vi, beforeEach } from "vitest";
import { migrationDiagnostics } from "../../src/migration/MigrationDiagnostics";
import { MigrationStatus } from "../../src/migration/types";

// Mock für logger
vi.mock("../../src/bridge/enhanced/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
  },
}));

describe("MigrationDiagnostics", () => {
  beforeEach(() => {
    // MigrationDiagnostics initialisieren
    migrationDiagnostics.initialize();
  });

  it("should initialize and start migration tracking", () => {
    // Arrange + Act
    const exportedData = migrationDiagnostics.getExportedData();

    // Assert
    expect(exportedData.status).toBe(MigrationStatus.IN_PROGRESS);
    expect(exportedData.startTime).toBeDefined();
    expect(exportedData.progress).toBe(0);
  });

  it("should register components for migration", () => {
    // Act
    migrationDiagnostics.registerComponent("comp1", "Component 1", 3);
    migrationDiagnostics.registerComponent("comp2", "Component 2", 2);

    // Assert
    const report = migrationDiagnostics.generateReport();
    expect(Object.keys(report.stateReports)).toHaveLength(2);
    expect(report.stateReports).toHaveProperty("comp1");
    expect(report.stateReports).toHaveProperty("comp2");
    expect(report.stateReports.comp1.status).toBe(MigrationStatus.NOT_STARTED);
    expect(report.stateReports.comp2.status).toBe(MigrationStatus.NOT_STARTED);
  });

  it("should track migration progress", () => {
    // Arrange
    migrationDiagnostics.registerComponent("comp1", "Component 1", 3);

    // Act
    migrationDiagnostics.reportProgress("comp1", "step-1", true);

    // Assert
    const report = migrationDiagnostics.generateReport();
    expect(report.stateReports.comp1.status).toBe(MigrationStatus.IN_PROGRESS);
    expect(report.stateReports.comp1.migratedParts).toContain("step-1");
    expect(report.completionPercentage).toBeGreaterThan(0);
  });

  it("should handle failed migration steps", () => {
    // Arrange
    migrationDiagnostics.registerComponent("comp1", "Component 1", 2);

    // Act
    migrationDiagnostics.reportProgress("comp1", "step-1", false, {
      message: "Test error",
    });

    // Assert
    const report = migrationDiagnostics.generateReport();
    expect(report.stateReports.comp1.errors).toBeDefined();
    expect(report.stateReports.comp1.errors?.length).toBeGreaterThan(0);
    expect(report.criticalIssues).toBeDefined();
  });

  it("should track complete migrations", () => {
    // Arrange
    migrationDiagnostics.registerComponent("comp1", "Component 1", 2);

    // Act - Complete all steps
    migrationDiagnostics.reportProgress("comp1", "step-1", true);
    migrationDiagnostics.reportProgress("comp1", "step-2", true);

    // Assert
    const report = migrationDiagnostics.generateReport();
    expect(report.stateReports.comp1.status).toBe(MigrationStatus.COMPLETED);
    expect(report.stateReports.comp1.completedAt).toBeDefined();
  });

  it("should identify partially completed migrations", () => {
    // Arrange
    migrationDiagnostics.registerComponent("comp1", "Component 1", 3);

    // Act - Complete some steps, fail others
    migrationDiagnostics.reportProgress("comp1", "step-1", true);
    migrationDiagnostics.reportProgress("comp1", "step-2", true);
    migrationDiagnostics.reportProgress("comp1", "step-3", false, {
      message: "Test error",
    });

    // Assert
    const report = migrationDiagnostics.generateReport();
    expect(report.stateReports.comp1.status).toBe(
      MigrationStatus.PARTIALLY_COMPLETED,
    );
  });

  it("should report legacy code usage", () => {
    // Act
    migrationDiagnostics.reportLegacyCodeUsage("oldAPI.function", 3);
    migrationDiagnostics.reportLegacyCodeUsage("anotherOldAPI.method");
    migrationDiagnostics.reportLegacyCodeUsage("oldAPI.function", 2);

    // Assert
    const legacyUsage = migrationDiagnostics.identifyLegacyCodeUsage();
    expect(legacyUsage).toHaveLength(2);
    expect(legacyUsage[0].source).toBe("oldAPI.function");
    expect(legacyUsage[0].count).toBe(5);
    expect(legacyUsage[1].source).toBe("anotherOldAPI.method");
    expect(legacyUsage[1].count).toBe(1);
  });

  it("should log deprecated API usage", () => {
    // Act
    migrationDiagnostics.logDeprecatedApiUsage(
      "oldAPI.function",
      "SomeComponent",
      ["newAPI.function", "alternativeAPI.method"],
    );

    // Assert
    const legacyUsage = migrationDiagnostics.identifyLegacyCodeUsage();
    expect(legacyUsage).toHaveLength(1);
    expect(legacyUsage[0].source).toBe("oldAPI.function");

    // Check warnings
    const report = migrationDiagnostics.generateReport();
    expect(report.warnings).toBeDefined();
    expect(report.warnings?.some((w) => w.includes("Deprecated API"))).toBe(
      true,
    );
  });

  it("should calculate overall migration status", () => {
    // Arrange
    migrationDiagnostics.registerComponent("comp1", "Component 1", 1);
    migrationDiagnostics.registerComponent("comp2", "Component 2", 1);
    migrationDiagnostics.registerComponent("comp3", "Component 3", 1);

    // Act - Different outcomes for each component
    migrationDiagnostics.reportProgress("comp1", "step-1", true);
    migrationDiagnostics.reportProgress("comp2", "step-1", false, {
      message: "Test error",
    });
    migrationDiagnostics.reportProgress("comp3", "step-1", true);

    // Assert
    const report = migrationDiagnostics.generateReport();
    expect(report.overallStatus).toBe(MigrationStatus.PARTIALLY_COMPLETED);
    expect(report.completionPercentage).toBe(100); // All steps attempted
  });

  it("should handle completed migration", () => {
    // Arrange
    migrationDiagnostics.registerComponent("comp1", "Component 1", 1);

    // Act - Complete the migration
    migrationDiagnostics.reportProgress("comp1", "step-1", true);

    // Assert
    const report = migrationDiagnostics.generateReport();
    expect(report.overallStatus).toBe(MigrationStatus.COMPLETED);
    expect(report.completionPercentage).toBe(100);
    expect(report.completedAt).toBeDefined();
  });

  it("should generate recommended actions", () => {
    // Arrange
    migrationDiagnostics.registerComponent("comp1", "Component 1", 2);
    migrationDiagnostics.reportProgress("comp1", "step-1", true);
    migrationDiagnostics.reportProgress("comp1", "step-2", false, {
      message: "Test error",
    });

    // Act
    const report = migrationDiagnostics.generateReport();

    // Assert
    expect(report.recommendedActions).toBeDefined();
    expect(report.recommendedActions?.length).toBeGreaterThan(0);
    expect(
      report.recommendedActions?.some((a) => a.includes("Review error logs")),
    ).toBe(true);
  });

  it("should update log configuration", () => {
    // Act
    migrationDiagnostics.setLogConfig({
      logLevel: "debug",
      logToConsole: true,
    });

    // Assert
    const config = migrationDiagnostics.getLogConfig();
    expect(config.logLevel).toBe("debug");
    expect(config.logToConsole).toBe(true);
  });

  it("should enable and configure dashboard", () => {
    // Act
    migrationDiagnostics.enableDashboard(true);
    migrationDiagnostics.setDashboardConfig({
      autoRefresh: true,
      refreshInterval: 3000,
    });

    // Assert
    const config = migrationDiagnostics.getDashboardConfig();
    expect(config.enabled).toBe(true);
    expect(config.autoRefresh).toBe(true);
    expect(config.refreshInterval).toBe(3000);
  });
});
