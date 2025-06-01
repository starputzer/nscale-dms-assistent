/**
 * Tests für Bridge Event Type Guards
 *
 * Diese Tests überprüfen die TypeScript-Kompatibilität und Funktionalität
 * der erweiterten Type Guards für Bridge-Events.
 */

import { describe, it, expect, vi } from "vitest";
import * as eventGuards from "@/bridge/enhanced/bridgeEventGuards";
import {
  BridgeInitializedEvent,
  BridgeErrorEvent,
  BridgeStatusEvent,
  BridgeHealthCheckEvent,
  LegacySessionEvent,
  LegacyMessageEvent,
  VueSendMessageEvent,
} from "@/bridge/enhanced/bridgeEventTypes";
import { AssertType } from "../utils/typescript-test-utils";

describe("BridgeEventGuards TypeScript-Kompatibilität", () => {
  describe("Basisprüfungen", () => {
    it("sollte isEventPayload korrekt validieren", () => {
      expect(eventGuards.isEventPayload({})).toBe(true);
      expect(eventGuards.isEventPayload({ data: "test" })).toBe(true);
      expect(eventGuards.isEventPayload(null)).toBe(false);
      expect(eventGuards.isEventPayload(undefined)).toBe(false);
      expect(eventGuards.isEventPayload("string")).toBe(false);
      expect(eventGuards.isEventPayload(123)).toBe(false);
    });
  });

  describe("Event-spezifische Type Guards", () => {
    it("sollte isBridgeInitializedEvent korrekt validieren", () => {
      const validEvent: BridgeInitializedEvent = {
        timestamp: Date.now(),
        bridgeVersion: "1.0.0",
        configuration: {
          debugging: true,
          selfHealing: true,
          selectiveSync: true,
          eventBatching: true,
          performanceMonitoring: true,
        },
        environment: {
          isProduction: false,
          browserInfo: {
            name: "Chrome",
            version: "100.0.0",
          },
        },
      };

      expect(eventGuards.isBridgeInitializedEvent(validEvent)).toBe(true);

      // Ungültige Events
      expect(eventGuards.isBridgeInitializedEvent({})).toBe(false);
      expect(
        eventGuards.isBridgeInitializedEvent({
          ...validEvent,
          timestamp: "not a number",
        }),
      ).toBe(false);
      expect(
        eventGuards.isBridgeInitializedEvent({
          ...validEvent,
          configuration: null,
        }),
      ).toBe(false);
    });

    it("sollte isBridgeErrorEvent korrekt validieren", () => {
      const validEvent: BridgeErrorEvent = {
        code: "ERROR_CODE",
        message: "Error message",
        timestamp: Date.now(),
        recoverable: true,
      };

      expect(eventGuards.isBridgeErrorEvent(validEvent)).toBe(true);

      // Mit optionalen Feldern
      expect(
        eventGuards.isBridgeErrorEvent({
          ...validEvent,
          component: "TestComponent",
          details: { additionalInfo: "test" },
        }),
      ).toBe(true);

      // Ungültige Events
      expect(eventGuards.isBridgeErrorEvent({})).toBe(false);
      expect(
        eventGuards.isBridgeErrorEvent({
          ...validEvent,
          recoverable: "true", // String statt boolean
        }),
      ).toBe(false);
    });

    it("sollte isBridgeStatusEvent korrekt validieren", () => {
      const validEvent: BridgeStatusEvent = {
        status: "active",
        timestamp: Date.now(),
      };

      expect(eventGuards.isBridgeStatusEvent(validEvent)).toBe(true);

      // Mit optionalen Feldern
      expect(
        eventGuards.isBridgeStatusEvent({
          ...validEvent,
          previousStatus: "initializing",
          message: "Bridge is now active",
          affectedComponents: ["component1", "component2"],
          recoveryAttempts: 0,
        }),
      ).toBe(true);

      // Ungültige Events
      expect(eventGuards.isBridgeStatusEvent({})).toBe(false);
      expect(
        eventGuards.isBridgeStatusEvent({
          ...validEvent,
          status: "invalid-status",
        }),
      ).toBe(false);
    });

    it("sollte isBridgeHealthCheckEvent korrekt validieren", () => {
      const validEvent: BridgeHealthCheckEvent = {
        timestamp: Date.now(),
        components: {
          component1: { status: "healthy" },
          component2: { status: "degraded", details: "Slow response time" },
        },
        overall: "degraded",
      };

      expect(eventGuards.isBridgeHealthCheckEvent(validEvent)).toBe(true);

      // Ungültige Events
      expect(eventGuards.isBridgeHealthCheckEvent({})).toBe(false);
      expect(
        eventGuards.isBridgeHealthCheckEvent({
          ...validEvent,
          overall: "invalid-status",
        }),
      ).toBe(false);
      expect(
        eventGuards.isBridgeHealthCheckEvent({
          ...validEvent,
          components: {
            component1: { status: "invalid-status" },
          },
        }),
      ).toBe(false);
    });
  });

  describe("Legacy-Event Type Guards", () => {
    it("sollte isLegacySessionEvent korrekt validieren", () => {
      const validEvent: LegacySessionEvent = {
        sessionId: "session-123",
        title: "Test Session",
        timestamp: Date.now(),
      };

      expect(eventGuards.isLegacySessionEvent(validEvent)).toBe(true);

      // Mit optionalen Feldern
      expect(
        eventGuards.isLegacySessionEvent({
          ...validEvent,
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messageCount: 5,
            isPinned: true,
            tags: ["tag1", "tag2"],
          },
        }),
      ).toBe(true);

      // Ungültige Events
      expect(eventGuards.isLegacySessionEvent({})).toBe(false);
      expect(
        eventGuards.isLegacySessionEvent({
          ...validEvent,
          sessionId: 123, // Nummer statt String
        }),
      ).toBe(false);
    });

    it("sollte isLegacyMessageEvent korrekt validieren", () => {
      const validEvent: LegacyMessageEvent = {
        messageId: "msg-123",
        sessionId: "session-123",
        content: "Hello world",
        role: "user",
        timestamp: Date.now(),
      };

      expect(eventGuards.isLegacyMessageEvent(validEvent)).toBe(true);

      // Mit anderen Rollen
      expect(
        eventGuards.isLegacyMessageEvent({
          ...validEvent,
          role: "assistant",
        }),
      ).toBe(true);
      expect(
        eventGuards.isLegacyMessageEvent({
          ...validEvent,
          role: "system",
        }),
      ).toBe(true);

      // Mit optionalen Feldern
      expect(
        eventGuards.isLegacyMessageEvent({
          ...validEvent,
          metadata: {
            status: "sent",
            tokens: {
              prompt: 10,
              completion: 20,
              total: 30,
            },
          },
        }),
      ).toBe(true);

      // Ungültige Events
      expect(eventGuards.isLegacyMessageEvent({})).toBe(false);
      expect(
        eventGuards.isLegacyMessageEvent({
          ...validEvent,
          role: "invalid-role",
        }),
      ).toBe(false);
    });
  });

  describe("Vue-Command Type Guards", () => {
    it("sollte isVueSendMessageEvent korrekt validieren", () => {
      const validEvent: VueSendMessageEvent = {
        requestId: "req-123",
        timestamp: Date.now(),
        command: "sendMessage",
        sessionId: "session-123",
        content: "Hello world",
      };

      expect(eventGuards.isVueSendMessageEvent(validEvent)).toBe(true);

      // Mit optionalen Feldern
      expect(
        eventGuards.isVueSendMessageEvent({
          ...validEvent,
          role: "user",
        }),
      ).toBe(true);

      // Ungültige Events
      expect(eventGuards.isVueSendMessageEvent({})).toBe(false);
      expect(
        eventGuards.isVueSendMessageEvent({
          ...validEvent,
          command: "invalidCommand",
        }),
      ).toBe(false);
      expect(
        eventGuards.isVueSendMessageEvent({
          ...validEvent,
          role: "invalid-role",
        }),
      ).toBe(false);
    });
  });

  describe("Generische Type Guards", () => {
    it("sollte isBridgeEvent korrekt validieren", () => {
      // Initialize Event validieren
      const initEvent: BridgeInitializedEvent = {
        timestamp: Date.now(),
        bridgeVersion: "1.0.0",
        configuration: {
          debugging: true,
          selfHealing: true,
          selectiveSync: true,
          eventBatching: true,
          performanceMonitoring: true,
        },
        environment: {
          isProduction: false,
          browserInfo: {
            name: "Chrome",
            version: "100.0.0",
          },
        },
      };

      expect(eventGuards.isBridgeEvent("bridge:initialized", initEvent)).toBe(
        true,
      );
      expect(eventGuards.isBridgeEvent("bridge:initialized", {})).toBe(false);

      // Error Event validieren
      const errorEvent: BridgeErrorEvent = {
        code: "ERROR_CODE",
        message: "Error message",
        timestamp: Date.now(),
        recoverable: true,
      };

      expect(eventGuards.isBridgeEvent("bridge:error", errorEvent)).toBe(true);
      expect(eventGuards.isBridgeEvent("bridge:error", {})).toBe(false);

      // Session Command Event validieren
      const sessionEvent = {
        requestId: "req-123",
        timestamp: Date.now(),
        command: "selectSession",
        sessionId: "session-123",
      };

      expect(eventGuards.isBridgeEvent("vue:selectSession", sessionEvent)).toBe(
        true,
      );
      expect(eventGuards.isBridgeEvent("vue:selectSession", {})).toBe(false);
    });

    it("sollte assertBridgeEvent korrekt validieren", () => {
      // Gültiges Event
      const initEvent: BridgeInitializedEvent = {
        timestamp: Date.now(),
        bridgeVersion: "1.0.0",
        configuration: {
          debugging: true,
          selfHealing: true,
          selectiveSync: true,
          eventBatching: true,
          performanceMonitoring: true,
        },
        environment: {
          isProduction: false,
          browserInfo: {
            name: "Chrome",
            version: "100.0.0",
          },
        },
      };

      expect(() =>
        eventGuards.assertBridgeEvent("bridge:initialized", initEvent),
      ).not.toThrow();

      // Typsicherheit testen - der Rückgabewert sollte dem erwarteten Typ entsprechen
      const result = eventGuards.assertBridgeEvent(
        "bridge:initialized",
        initEvent,
      );
      type ResultAssert = AssertType<typeof result, BridgeInitializedEvent>;

      // Ungültiges Event
      expect(() =>
        eventGuards.assertBridgeEvent("bridge:initialized", {}),
      ).toThrow();
    });

    it("sollte processTypedEvent korrekt verarbeiten", () => {
      // Test-Handler
      const handler = vi.fn();

      // Gültiges Event
      const initEvent: BridgeInitializedEvent = {
        timestamp: Date.now(),
        bridgeVersion: "1.0.0",
        configuration: {
          debugging: true,
          selfHealing: true,
          selectiveSync: true,
          eventBatching: true,
          performanceMonitoring: true,
        },
        environment: {
          isProduction: false,
          browserInfo: {
            name: "Chrome",
            version: "100.0.0",
          },
        },
      };

      // Verarbeitung testen
      const result = eventGuards.processTypedEvent(
        "bridge:initialized",
        initEvent,
        handler,
      );
      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith(initEvent);

      // Ungültiges Event
      handler.mockClear();
      const invalidResult = eventGuards.processTypedEvent(
        "bridge:initialized",
        {},
        handler,
      );
      expect(invalidResult).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
