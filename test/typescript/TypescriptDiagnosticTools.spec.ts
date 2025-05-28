/**
 * Tests für TypescriptDiagnosticTools
 *
 * Diese Tests überprüfen die TypeScript-Kompatibilität und Funktionalität
 * der typisierten Diagnose-Tools für Bridge-Komponenten.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  TypescriptDiagnosticTools,
  BridgeComponentName,
  BridgeComponentStatus,
  ComponentDiagnostic,
  DiagnosticCapable,
} from "@/bridge/enhanced/TypescriptDiagnosticTools";
import { BridgeResult } from "@/bridge/enhanced/bridgeErrorUtils";
import { AssertType } from "../utils/typescript-test-utils";

// Mock für createLogger
vi.mock("@/bridge/enhanced/logger/index", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLogs: vi.fn(),
    clearLogs: vi.fn(),
  }),
}));

// Mock für window.performance
const mockPerformance = {
  memory: {
    jsHeapSizeLimit: 4294967296, // 4GB
    totalJSHeapSize: 2147483648, // 2GB
    usedJSHeapSize: 1073741824, // 1GB
  },
};

Object.defineProperty(window, "performance", {
  value: mockPerformance,
  writable: true,
});

describe("TypescriptDiagnosticTools TypeScript-Kompatibilität", () => {
  let diagnosticTools: TypescriptDiagnosticTools;

  // Mock Komponenten
  const createMockHealthyComponent = (): DiagnosticCapable => ({
    getDiagnostics: vi.fn(async () =>
      createSuccessResult<ComponentDiagnostic>({
        name: BridgeComponentName.EVENT_BUS,
        status: BridgeComponentStatus.HEALTHY,
        memoryUsage: 1024 * 1024, // 1MB
        issues: [],
        warnings: [],
        metrics: {
          eventProcessingTime: 5,
          listenerCount: 10,
        },
        timestamp: Date.now(),
      }),
    ),
  });

  const createMockDegradedComponent = (): DiagnosticCapable => ({
    getDiagnostics: vi.fn(async () =>
      createSuccessResult<ComponentDiagnostic>({
        name: BridgeComponentName.STATE_MANAGER,
        status: BridgeComponentStatus.DEGRADED,
        memoryUsage: 10 * 1024 * 1024, // 10MB
        issues: [],
        warnings: ["Hohe Synchronisationszeit"],
        metrics: {
          stateUpdateTime: 50,
          syncCount: 100,
        },
        timestamp: Date.now(),
      }),
    ),
  });

  const createMockErrorComponent = (): DiagnosticCapable => ({
    getDiagnostics: vi.fn(async () =>
      createSuccessResult<ComponentDiagnostic>({
        name: BridgeComponentName.MEMORY_MANAGER,
        status: BridgeComponentStatus.ERROR,
        memoryUsage: 100 * 1024 * 1024, // 100MB
        issues: ["Speicherleck erkannt"],
        warnings: ["Hoher Speicherverbrauch"],
        metrics: {
          leakSuspects: 5,
        },
        timestamp: Date.now(),
      }),
    ),
  });

  const createMockFailingComponent = (): DiagnosticCapable => ({
    getDiagnostics: vi.fn(async () =>
      createErrorResult<ComponentDiagnostic>({
        message: "Diagnose fehlgeschlagen",
        code: "DIAGNOSTIC_ERROR",
      }),
    ),
  });

  // Mock für Event-Bus
  const mockEventBus = {
    emit: vi.fn(async () => createSuccessResult(undefined)),
  };

  // Hilfsfunktionen
  const createSuccessResult = <T>(data: T): BridgeResult<T> => ({
    success: true,
    data,
  });

  const createErrorResult = <T>(error: any): BridgeResult<T> => ({
    success: false,
    error,
  });

  beforeEach(() => {
    diagnosticTools = new TypescriptDiagnosticTools();
    vi.clearAllMocks();
  });

  describe("Diagnose-Funktionen", () => {
    it("sollte Komponenten registrieren können", async () => {
      const mockComponent = createMockHealthyComponent();

      const result = await diagnosticTools.registerComponent(
        BridgeComponentName.EVENT_BUS,
        mockComponent,
      );

      expect(result.success).toBe(true);
    });

    it("sollte Event-Bus setzen können", async () => {
      const result = await diagnosticTools.setEventBus(mockEventBus);

      expect(result.success).toBe(true);
    });

    it("sollte eine einzelne Komponente diagnostizieren können", async () => {
      // Komponente registrieren
      const mockComponent = createMockHealthyComponent();
      await diagnosticTools.registerComponent(
        BridgeComponentName.EVENT_BUS,
        mockComponent,
      );

      // Komponente diagnostizieren
      const result = await diagnosticTools.diagnoseComponent(
        BridgeComponentName.EVENT_BUS,
      );

      // Erfolg prüfen
      expect(result.success).toBe(true);

      // Diagnose-Ergebnis prüfen
      if (result.success) {
        expect(result.data.name).toBe(BridgeComponentName.EVENT_BUS);
        expect(result.data.status).toBe(BridgeComponentStatus.HEALTHY);
        expect(result.data.issues).toEqual([]);
        expect(result.data.warnings).toEqual([]);
        expect(result.data.metrics).toBeDefined();
        expect(result.data.timestamp).toBeDefined();
      }

      // getDiagnostics sollte aufgerufen worden sein
      expect(mockComponent.getDiagnostics).toHaveBeenCalled();
    });

    it("sollte alle Komponenten diagnostizieren können", async () => {
      // Komponenten registrieren
      const mockEventBus = createMockHealthyComponent();
      const mockStateManager = createMockDegradedComponent();
      const mockMemoryManager = createMockErrorComponent();

      await diagnosticTools.registerComponent(
        BridgeComponentName.EVENT_BUS,
        mockEventBus,
      );

      await diagnosticTools.registerComponent(
        BridgeComponentName.STATE_MANAGER,
        mockStateManager,
      );

      await diagnosticTools.registerComponent(
        BridgeComponentName.MEMORY_MANAGER,
        mockMemoryManager,
      );

      // Event-Bus setzen
      await diagnosticTools.setEventBus(mockEventBus);

      // Gesamtdiagnose durchführen
      const result = await diagnosticTools.runDiagnostics({
        detailed: true,
        includePerformanceMetrics: true,
        includeMemoryInfo: true,
      });

      // Erfolg prüfen
      expect(result.success).toBe(true);

      // Diagnose-Ergebnis prüfen
      if (result.success) {
        // Komponenten-Ergebnisse prüfen
        expect(result.data.components).toBeDefined();
        expect(Object.keys(result.data.components).length).toBe(3);

        // Gesamtstatus sollte ERROR sein (wegen der ERROR-Komponente)
        expect(result.data.overall).toBe(BridgeComponentStatus.ERROR);

        // Performance-Metriken sollten vorhanden sein
        expect(result.data.performanceMetrics).toBeDefined();

        // Empfehlungen sollten vorhanden sein
        expect(result.data.recommendations.length).toBeGreaterThan(0);
      }

      // getDiagnostics sollte für alle Komponenten aufgerufen worden sein
      expect(mockEventBus.getDiagnostics).toHaveBeenCalled();
      expect(mockStateManager.getDiagnostics).toHaveBeenCalled();
      expect(mockMemoryManager.getDiagnostics).toHaveBeenCalled();
    });

    it("sollte Komponenten filtern können", async () => {
      // Komponenten registrieren
      const mockEventBus = createMockHealthyComponent();
      const mockStateManager = createMockDegradedComponent();

      await diagnosticTools.registerComponent(
        BridgeComponentName.EVENT_BUS,
        mockEventBus,
      );

      await diagnosticTools.registerComponent(
        BridgeComponentName.STATE_MANAGER,
        mockStateManager,
      );

      // Gesamtdiagnose mit Filter durchführen
      const result = await diagnosticTools.runDiagnostics({
        componentFilter: [BridgeComponentName.EVENT_BUS],
      });

      // Erfolg prüfen
      expect(result.success).toBe(true);

      // Diagnose-Ergebnis prüfen
      if (result.success) {
        // Nur EVENT_BUS sollte in den Ergebnissen sein
        expect(Object.keys(result.data.components)).toEqual([
          BridgeComponentName.EVENT_BUS,
        ]);

        // Gesamtstatus sollte HEALTHY sein (nur die HEALTHY-Komponente wurde geprüft)
        expect(result.data.overall).toBe(BridgeComponentStatus.HEALTHY);
      }

      // getDiagnostics sollte nur für EVENT_BUS aufgerufen worden sein
      expect(mockEventBus.getDiagnostics).toHaveBeenCalled();
      expect(mockStateManager.getDiagnostics).not.toHaveBeenCalled();
    });

    it("sollte mit fehlgeschlagenen Diagnosen umgehen können", async () => {
      // Komponenten registrieren
      const mockHealthyComponent = createMockHealthyComponent();
      const mockFailingComponent = createMockFailingComponent();

      await diagnosticTools.registerComponent(
        BridgeComponentName.EVENT_BUS,
        mockHealthyComponent,
      );

      await diagnosticTools.registerComponent(
        BridgeComponentName.MEMORY_MANAGER,
        mockFailingComponent,
      );

      // Gesamtdiagnose durchführen
      const result = await diagnosticTools.runDiagnostics();

      // Erfolg prüfen
      expect(result.success).toBe(true);

      // Diagnose-Ergebnis prüfen
      if (result.success) {
        // Beide Komponenten sollten in den Ergebnissen sein
        expect(Object.keys(result.data.components)).toEqual([
          BridgeComponentName.EVENT_BUS,
          BridgeComponentName.MEMORY_MANAGER,
        ]);

        // MEMORY_MANAGER sollte ERROR-Status haben
        expect(
          result.data.components[BridgeComponentName.MEMORY_MANAGER].status,
        ).toBe(BridgeComponentStatus.ERROR);

        // Gesamtstatus sollte ERROR sein
        expect(result.data.overall).toBe(BridgeComponentStatus.ERROR);

        // Empfehlungen sollten vorhanden sein
        expect(result.data.recommendations.length).toBeGreaterThan(0);
      }
    });

    it("sollte Diagnose-Events senden", async () => {
      // Komponenten registrieren
      const mockHealthyComponent = createMockHealthyComponent();

      await diagnosticTools.registerComponent(
        BridgeComponentName.EVENT_BUS,
        mockHealthyComponent,
      );

      // Event-Bus setzen
      await diagnosticTools.setEventBus(mockEventBus);

      // Gesamtdiagnose durchführen
      await diagnosticTools.runDiagnostics({
        includePerformanceMetrics: true,
        includeMemoryInfo: true,
      });

      // Events sollten gesendet worden sein
      expect(mockEventBus.emit).toHaveBeenCalledTimes(2);

      // Das erste Event sollte ein Health-Check-Event sein
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "bridge:healthCheck",
        expect.objectContaining({
          timestamp: expect.any(Number),
          components: expect.any(Object),
          overall: expect.any(String),
        }),
      );

      // Das zweite Event sollte ein Performance-Event sein
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        "bridge:performanceReport",
        expect.objectContaining({
          timestamp: expect.any(Number),
          metrics: expect.any(Object),
        }),
      );
    });
  });

  describe("Typ-Definitionen", () => {
    it("sollte BridgeComponentName als Enum korrekt definieren", () => {
      // BridgeComponentName sollte ein Enum sein
      expect(BridgeComponentName).toBeDefined();
      expect(BridgeComponentName.EVENT_BUS).toBe("EventBus");

      // Type-Check
      const componentName: BridgeComponentName = BridgeComponentName.EVENT_BUS;
      expect(componentName).toBeDefined();
    });

    it("sollte BridgeComponentStatus als Enum korrekt definieren", () => {
      // BridgeComponentStatus sollte ein Enum sein
      expect(BridgeComponentStatus).toBeDefined();
      expect(BridgeComponentStatus.HEALTHY).toBe("healthy");

      // Type-Check
      const componentStatus: BridgeComponentStatus =
        BridgeComponentStatus.HEALTHY;
      expect(componentStatus).toBeDefined();
    });

    it("sollte ComponentDiagnostic korrekt typisieren", () => {
      // Type-Check über Objekt-Literal
      const diagnostic: ComponentDiagnostic = {
        name: BridgeComponentName.EVENT_BUS,
        status: BridgeComponentStatus.HEALTHY,
        issues: [],
        warnings: [],
        metrics: {},
        timestamp: Date.now(),
      };

      expect(diagnostic).toBeDefined();

      // Type-Check mit optionalen Feldern
      const diagnosticWithOptionals: ComponentDiagnostic = {
        name: BridgeComponentName.EVENT_BUS,
        status: BridgeComponentStatus.HEALTHY,
        memoryUsage: 1024 * 1024,
        issues: [],
        warnings: [],
        metrics: {
          metric1: 123,
          metric2: "string value",
        },
        timestamp: Date.now(),
      };

      expect(diagnosticWithOptionals).toBeDefined();
    });

    it("sollte DiagnosticCapable korrekt typisieren", () => {
      // Implementierung von DiagnosticCapable
      class TestDiagnosticComponent implements DiagnosticCapable {
        async getDiagnostics(): Promise<BridgeResult<ComponentDiagnostic>> {
          return createSuccessResult({
            name: "TestComponent",
            status: BridgeComponentStatus.HEALTHY,
            issues: [],
            warnings: [],
            metrics: {},
            timestamp: Date.now(),
          });
        }
      }

      const component = new TestDiagnosticComponent();

      // Type-Check
      const diagnosticCapable: DiagnosticCapable = component;
      expect(diagnosticCapable).toBeDefined();
      expect(typeof diagnosticCapable.getDiagnostics).toBe("function");
    });
  });
});
