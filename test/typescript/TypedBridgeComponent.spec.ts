/**
 * Tests für die TypedBridgeComponent
 *
 * Diese Tests überprüfen die TypeScript-Kompatibilität und Funktionalität
 * der TypedBridgeComponent, die das Result<T, E>-Pattern implementiert.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TypedBridgeComponent } from "@/bridge/enhanced/examples/bridgeResultExample";
import {
  BridgeErrorCode,
  BridgeResult,
  isBridgeError,
} from "@/bridge/enhanced/bridgeErrorUtils";
import { AssertType } from "../utils/typescript-test-utils";

// Mock für Logger
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

describe("TypedBridgeComponent TypeScript-Kompatibilität", () => {
  let component: TypedBridgeComponent;

  beforeEach(() => {
    component = new TypedBridgeComponent();
  });

  describe("Initialisierung und Grundfunktionen", () => {
    it("sollte initialize mit korrektem Rückgabetyp aufrufen", async () => {
      const result = await component.initialize();

      // Typprüfung
      type InitResultType = AssertType<typeof result, BridgeResult<boolean>>;

      // Ergebnisprüfung
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it("sollte performOperation mit korrektem Rückgabetyp aufrufen", async () => {
      // Zuerst initialisieren
      await component.initialize();

      // Normale Operation
      const successResult = await component.performOperation("test123");

      // Typprüfung
      type OpResultType = AssertType<
        typeof successResult,
        BridgeResult<string>
      >;

      // Ergebnisprüfung für erfolgreiche Operation
      expect(successResult.success).toBe(true);
      if (successResult.success) {
        expect(successResult.data).toBe("Ergebnis für test123");
      }

      // Fehlerfall mit spezieller ID 'error'
      const errorResult = await component.performOperation("error");

      // Dies sollte einen wiederhergestellten Wert haben durch den Self-Healing-Mechanismus
      expect(errorResult.success).toBe(true);
      if (errorResult.success) {
        expect(errorResult.data).toContain("Fallback-Ergebnis");
      }
    });

    it("sollte processData mit korrektem Rückgabetyp aufrufen", async () => {
      // Zuerst initialisieren
      await component.initialize();

      // Gültige Daten
      const validResult = await component.processData({ id: "valid-id" });

      // Typprüfung
      type ProcessResultType = AssertType<
        typeof validResult,
        BridgeResult<{ processed: boolean; id: string }>
      >;

      // Ergebnisprüfung
      expect(validResult.success).toBe(true);
      if (validResult.success) {
        expect(validResult.data.processed).toBe(true);
        expect(validResult.data.id).toBe("valid-id");
      }

      // Ungültige Daten
      const invalidResult = await component.processData(null);

      // Ergebnisprüfung
      expect(invalidResult.success).toBe(false);
      if (!invalidResult.success) {
        expect(invalidResult.error.code).toBe(BridgeErrorCode.INVALID_STATE);
      }
    });
  });

  describe("Legacy-Code-Integration", () => {
    it("sollte getProcessedDataForLegacyCode mit korrektem Rückgabetyp aufrufen", async () => {
      // Zuerst initialisieren
      await component.initialize();

      // Normale Operation sollte ein String zurückgeben (kein BridgeResult)
      const result = await component.getProcessedDataForLegacyCode({
        id: "legacy-id",
      });

      // Typprüfung - dies sollte ein String sein, kein BridgeResult
      expect(typeof result).toBe("string");

      // Ergebnisprüfung - sollte gültiges JSON sein
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty("processed", true);
      expect(parsed).toHaveProperty("id", "legacy-id");

      // Fehlerfall sollte eine Exception werfen
      await expect(
        component.getProcessedDataForLegacyCode(null),
      ).rejects.toThrow();
    });
  });

  describe("Fehlerverhalten", () => {
    it("sollte performOperation fehlschlagen, wenn nicht initialisiert", async () => {
      // Neue Komponente ohne Initialisierung
      const uninitializedComponent = new TypedBridgeComponent();

      // Operation sollte fehlschlagen
      const result = await uninitializedComponent.performOperation("test");

      // Ergebnisprüfung
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(BridgeErrorCode.COMPONENT_INACTIVE);
        expect(result.error.message).toBe("Komponente ist nicht initialisiert");
      }
    });

    it("sollte mehrfache Wiederherstellungsversuche verarbeiten", async () => {
      // Zuerst initialisieren
      await component.initialize();

      // Erste Fehleroperation
      const firstError = await component.performOperation("error");

      // Ergebnisprüfung - erste Wiederherstellung sollte erfolgreich sein
      expect(firstError.success).toBe(true);

      // Zweite Fehleroperation
      const secondError = await component.performOperation("error");

      // Ergebnisprüfung - zweite Wiederherstellung sollte erfolgreich sein
      expect(secondError.success).toBe(true);

      // Dritte Fehleroperation
      const thirdError = await component.performOperation("error");

      // Ergebnisprüfung - dritte Wiederherstellung sollte erfolgreich sein
      expect(thirdError.success).toBe(true);

      // Vierte Fehleroperation (überschreitet maxRetries = 3)
      const fourthError = await component.performOperation("error");

      // Jetzt sollte die Wiederherstellung fehlschlagen (maxRetries = 3)
      expect(fourthError.success).toBe(false);
      if (!fourthError.success) {
        expect(fourthError.error.code).toBe(
          BridgeErrorCode.RETRY_LIMIT_EXCEEDED,
        );
        expect(fourthError.error.message).toContain(
          "Maximale Anzahl an Wiederholungsversuchen",
        );
      }
    });
  });
});
