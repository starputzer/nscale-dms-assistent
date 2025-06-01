/**
 * Tests für die Bridge-Error-Utilities
 *
 * Diese Tests überprüfen die TypeScript-Kompatibilität und Funktionalität
 * der Bridge-Error-Utilities, insbesondere des Result<T, E>-Patterns.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  BridgeErrorCode,
  BridgeError,
  BridgeResult,
  createBridgeError,
  failure,
  success,
  executeBridgeOperation,
  unwrapResult,
  withRecovery,
  isBridgeError,
  isRecoverable,
  hasErrorCode,
} from "@/bridge/enhanced/bridgeErrorUtils";
import {
  AssertType,
  assertType,
  createSuccessResult,
  createErrorResult,
} from "../utils/typescript-test-utils";

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

describe("BridgeErrorUtils TypeScript-Kompatibilität", () => {
  // Typdefinitionen für Tests
  type TestDataType = { value: string; count: number };

  let successResult: BridgeResult<TestDataType>;
  let failureResult: BridgeResult<TestDataType>;
  let testError: BridgeError;

  beforeEach(() => {
    testError = createBridgeError(
      BridgeErrorCode.COMMUNICATION_ERROR,
      "Test error message",
      {
        component: "TestComponent",
        operation: "testOperation",
        details: { context: "Test context" },
        recoverable: true,
      },
    );

    successResult = success<TestDataType>({ value: "test", count: 123 });
    failureResult = failure<TestDataType>(
      BridgeErrorCode.COMMUNICATION_ERROR,
      "Test error message",
      {
        component: "TestComponent",
        operation: "testOperation",
      },
    );
  });

  describe("Type Assertions", () => {
    it("sollte BridgeErrorCode als Enum-Typ haben", () => {
      // Statische Typüberprüfung für BridgeErrorCode
      const errorCode: BridgeErrorCode = BridgeErrorCode.COMMUNICATION_ERROR;
      const errorCodeString: string = errorCode;

      // Prüfe, dass BridgeErrorCode ein String-Enum ist
      expect(typeof errorCode).toBe("string");

      // Der folgende Ausdruck würde einen Kompilierungsfehler verursachen, wenn BridgeErrorCode nicht korrekt ist:
      // @ts-expect-error - Ungültiger Enum-Wert
      const invalidErrorCode: BridgeErrorCode = "INVALID_ERROR_CODE";
    });

    it("sollte BridgeError als Interface-Typ haben", () => {
      // Statische Typüberprüfung für BridgeError
      const error: BridgeError = testError;

      // Prüfe erforderliche Eigenschaften
      expect(error.code).toBeDefined();
      expect(error.message).toBeDefined();
      expect(error.recoverable).toBeDefined();
      expect(error.timestamp).toBeDefined();

      // Der folgende Ausdruck würde einen Kompilierungsfehler verursachen, wenn BridgeError nicht korrekt ist:
      type ErrorAssignment = AssertType<
        typeof error,
        {
          code: BridgeErrorCode;
          message: string;
          component?: string;
          operation?: string;
          details?: unknown;
          originalError?: unknown;
          recoverable: boolean;
          timestamp: number;
        }
      >;
    });

    it("sollte BridgeResult als Union-Typ haben", () => {
      // Statische Typüberprüfung für BridgeResult
      const result: BridgeResult<string> = success("test");

      // Überprüfe Diskriminierte Union mit success-Eigenschaft
      if (result.success) {
        expect(result.data).toBeDefined();
        type SuccessAssignment = AssertType<
          typeof result,
          { success: true; data: string }
        >;
      } else {
        expect(result.error).toBeDefined();
        type ErrorAssignment = AssertType<
          typeof result,
          { success: false; error: BridgeError }
        >;
      }

      // Der folgende Ausdruck würde einen Kompilierungsfehler verursachen, wenn BridgeResult nicht korrekt ist:
      if (result.success) {
        // @ts-expect-error - error existiert nicht in Erfolgsfall
        expect(result.error).toBeUndefined();
      } else {
        // @ts-expect-error - data existiert nicht im Fehlerfall
        expect(result.data).toBeUndefined();
      }
    });
  });

  describe("Funktionen", () => {
    it("sollte createBridgeError korrekt typisieren", () => {
      const error = createBridgeError(
        BridgeErrorCode.STATE_SYNC_ERROR,
        "Sync failed",
        { component: "TestComponent" },
      );

      // Ergebnistyp überprüfen
      type ErrorTypeCheck = AssertType<typeof error, BridgeError>;

      // Werte überprüfen
      expect(error.code).toBe(BridgeErrorCode.STATE_SYNC_ERROR);
      expect(error.message).toBe("Sync failed");
      expect(error.component).toBe("TestComponent");
      expect(error.recoverable).toBe(true); // Standard ist true
    });

    it("sollte success-Funktion korrekt typisieren", () => {
      const result = success<number[]>([1, 2, 3]);

      // Ergebnistyp überprüfen
      type SuccessTypeCheck = AssertType<typeof result, BridgeResult<number[]>>;

      // Werte überprüfen
      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
    });

    it("sollte failure-Funktion korrekt typisieren", () => {
      const result = failure<string>(
        BridgeErrorCode.COMPONENT_INACTIVE,
        "Component not active",
        { recoverable: false },
      );

      // Ergebnistyp überprüfen
      type FailureTypeCheck = AssertType<typeof result, BridgeResult<string>>;

      // Werte überprüfen
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(BridgeErrorCode.COMPONENT_INACTIVE);
      expect(result.error.message).toBe("Component not active");
      expect(result.error.recoverable).toBe(false);
    });

    it("sollte executeBridgeOperation korrekt typisieren", async () => {
      // Mit erfolgreicher Operation
      const successOperation = await executeBridgeOperation(() => "Success", {
        component: "TestComponent",
        operationName: "testOperation",
      });

      // Ergebnistyp überprüfen
      type SuccessOpTypeCheck = AssertType<
        typeof successOperation,
        BridgeResult<string>
      >;

      expect(successOperation.success).toBe(true);
      if (successOperation.success) {
        expect(successOperation.data).toBe("Success");
      }

      // Mit fehlgeschlagener Operation
      const failOperation = await executeBridgeOperation<number>(
        () => {
          throw new Error("Test error");
        },
        {
          component: "TestComponent",
          operationName: "failOperation",
          errorCode: BridgeErrorCode.TIMEOUT,
          errorMessage: "Custom error message",
        },
      );

      // Ergebnistyp überprüfen
      type FailOpTypeCheck = AssertType<
        typeof failOperation,
        BridgeResult<number>
      >;

      expect(failOperation.success).toBe(false);
      if (!failOperation.success) {
        expect(failOperation.error.code).toBe(BridgeErrorCode.TIMEOUT);
        expect(failOperation.error.message).toBe("Custom error message");
      }
    });

    it("sollte unwrapResult korrekt typisieren", () => {
      // Erfolgsfall
      if (successResult.success) {
        const data = unwrapResult(successResult);

        // Ergebnistyp überprüfen
        type UnwrapSuccessTypeCheck = AssertType<typeof data, TestDataType>;

        expect(data.value).toBe("test");
        expect(data.count).toBe(123);
      }

      // Fehlerfall sollte eine Exception werfen
      expect(() => {
        unwrapResult(failureResult);
      }).toThrow();
    });

    it("sollte withRecovery korrekt typisieren", async () => {
      // Mit Wiederherstellung
      const recoveredResult = await withRecovery(failureResult, () =>
        success<TestDataType>({ value: "recovered", count: 456 }),
      );

      // Ergebnistyp überprüfen
      type RecoveryTypeCheck = AssertType<
        typeof recoveredResult,
        BridgeResult<TestDataType>
      >;

      // Erfolgreiche Wiederherstellung
      expect(recoveredResult.success).toBe(true);
      if (recoveredResult.success) {
        expect(recoveredResult.data.value).toBe("recovered");
      }

      // Mit fehlgeschlagener Wiederherstellung
      const nonRecoverableError = createBridgeError(
        BridgeErrorCode.RETRY_LIMIT_EXCEEDED,
        "Recovery failed",
        { recoverable: false },
      );

      const nonRecoverableResult: BridgeResult<TestDataType> = {
        success: false,
        error: nonRecoverableError,
      };

      const notRecoveredResult = await withRecovery(nonRecoverableResult, () =>
        success<TestDataType>({ value: "should not happen", count: 789 }),
      );

      // Nicht wiederherstellbar (recoverable = false)
      expect(notRecoveredResult.success).toBe(false);
    });
  });

  describe("Type Guards", () => {
    it("sollte isBridgeError korrekt typisieren", () => {
      // Gültiger BridgeError
      const validError = testError;
      expect(isBridgeError(validError)).toBe(true);

      // Ungültiger Wert
      const invalidError = { message: "Not a BridgeError" };
      expect(isBridgeError(invalidError)).toBe(false);

      // Type narrowing testen
      function processError(error: unknown) {
        if (isBridgeError(error)) {
          // In diesem Block sollte error als BridgeError typisiert sein
          const code: BridgeErrorCode = error.code;
          return code;
        }
        return null;
      }

      expect(processError(validError)).toBe(
        BridgeErrorCode.COMMUNICATION_ERROR,
      );
      expect(processError(invalidError)).toBe(null);
    });

    it("sollte isRecoverable korrekt typisieren", () => {
      // Wiederherstellbarer Fehler
      const recoverableError = createBridgeError(
        BridgeErrorCode.COMMUNICATION_ERROR,
        "Recoverable error",
        { recoverable: true },
      );
      expect(isRecoverable(recoverableError)).toBe(true);

      // Nicht wiederherstellbarer Fehler
      const nonRecoverableError = createBridgeError(
        BridgeErrorCode.RETRY_LIMIT_EXCEEDED,
        "Non-recoverable error",
        { recoverable: false },
      );
      expect(isRecoverable(nonRecoverableError)).toBe(false);

      // Null/Undefined
      expect(isRecoverable(null)).toBe(false);
      expect(isRecoverable(undefined)).toBe(false);
    });

    it("sollte hasErrorCode korrekt typisieren", () => {
      // Mit korrektem Code
      expect(hasErrorCode(testError, BridgeErrorCode.COMMUNICATION_ERROR)).toBe(
        true,
      );

      // Mit falschem Code
      expect(
        hasErrorCode(testError, BridgeErrorCode.INITIALIZATION_FAILED),
      ).toBe(false);

      // Mit Null/Undefined
      expect(hasErrorCode(null, BridgeErrorCode.COMMUNICATION_ERROR)).toBe(
        false,
      );
      expect(hasErrorCode(undefined, BridgeErrorCode.COMMUNICATION_ERROR)).toBe(
        false,
      );
    });
  });
});
