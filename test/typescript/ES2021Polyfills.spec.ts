/**
 * Tests für die ES2021-Polyfills
 *
 * Diese Tests überprüfen die TypeScript-Kompatibilität und Funktionalität
 * der ES2021-Polyfills, insbesondere WeakRef und FinalizationRegistry.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getWeakRefConstructor,
  getFinalizationRegistryConstructor,
  ES2021_SUPPORT,
} from "@/utils/es2021-polyfills";
import { AssertType } from "../utils/typescript-test-utils";

// Simuliere verschiedene Browser-Umgebungen
const createGlobalWithES2021 = () => ({
  WeakRef: class MockWeakRef {
    constructor(target: any) {
      this.target = target;
    }
    target: any;
    deref() {
      return this.target;
    }
  },
  FinalizationRegistry: class MockFinalizationRegistry {
    constructor(callback: (heldValue: any) => void) {
      this.callback = callback;
    }
    callback: (heldValue: any) => void;
    register(target: object, heldValue: any, unregisterToken?: object) {}
    unregister(unregisterToken: object) {}
  },
});

const createGlobalWithoutES2021 = () => ({});

describe("ES2021Polyfills TypeScript-Kompatibilität", () => {
  let originalGlobal: any;

  // Speichere Original-Global-Objekt
  beforeEach(() => {
    originalGlobal = { ...global };
  });

  // Stelle das Original-Global-Objekt wieder her
  afterEach(() => {
    global.WeakRef = originalGlobal.WeakRef;
    global.FinalizationRegistry = originalGlobal.FinalizationRegistry;
  });

  describe("WeakRef-Kompatibilität", () => {
    it("sollte native WeakRef erkennen, wenn verfügbar", () => {
      // Simuliere Browser mit nativem WeakRef
      const mockGlobal = createGlobalWithES2021();
      global.WeakRef = mockGlobal.WeakRef;

      // WeakRef sollte erkannt werden
      const WeakRefConstructor = getWeakRefConstructor();
      expect(WeakRefConstructor).toBe(global.WeakRef);
      expect(ES2021_SUPPORT.WeakRef).toBe(true);

      // Erstelle eine WeakRef-Instanz
      const obj = { test: "value" };
      const weakRef = new WeakRefConstructor(obj);

      // Typprüfung - sollte eine deref-Methode haben
      expect(typeof weakRef.deref).toBe("function");

      // Funktionalitätsprüfung - sollte das Original-Objekt zurückgeben
      const ref = weakRef.deref();
      expect(ref).toBe(obj);
    });

    it("sollte Polyfill für WeakRef bereitstellen, wenn nicht verfügbar", () => {
      // Simuliere Browser ohne WeakRef
      global.WeakRef = undefined;

      // WeakRef sollte polyfilled werden
      const WeakRefConstructor = getWeakRefConstructor();
      expect(WeakRefConstructor).not.toBe(undefined);
      expect(ES2021_SUPPORT.WeakRef).toBe(false);

      // Erstelle eine WeakRef-Instanz mit dem Polyfill
      const obj = { test: "value" };
      const weakRef = new WeakRefConstructor(obj);

      // Typprüfung - sollte eine deref-Methode haben
      expect(typeof weakRef.deref).toBe("function");

      // Funktionalitätsprüfung - Polyfill sollte das Original-Objekt zurückgeben (nicht schwach)
      const ref = weakRef.deref();
      expect(ref).toBe(obj);
    });

    it("sollte WeakRef typsicher verwenden können", () => {
      // Hole den WeakRef-Konstruktor
      const SafeWeakRef = getWeakRefConstructor();

      // Erstelle einen typsicheren WeakRef
      class TestObject {
        value: string = "test";
        method() {
          return this.value;
        }
      }

      const obj = new TestObject();
      const weakRef = new SafeWeakRef(obj);

      // TypeScript unterstützt leider keine vollständige Typisierung für WeakRef in diesem Fall,
      // daher müssen wir Laufzeitprüfungen durchführen
      const ref = weakRef.deref();

      if (ref) {
        // Prüfe, ob die Eigenschaften und Methoden vorhanden sind
        expect(ref.value).toBe("test");
        expect(typeof ref.method).toBe("function");
        expect(ref.method()).toBe("test");
      }
    });
  });

  describe("FinalizationRegistry-Kompatibilität", () => {
    it("sollte native FinalizationRegistry erkennen, wenn verfügbar", () => {
      // Simuliere Browser mit nativer FinalizationRegistry
      const mockGlobal = createGlobalWithES2021();
      global.FinalizationRegistry = mockGlobal.FinalizationRegistry;

      // FinalizationRegistry sollte erkannt werden
      const FinalizationRegistryConstructor =
        getFinalizationRegistryConstructor();
      expect(FinalizationRegistryConstructor).toBe(global.FinalizationRegistry);
      expect(ES2021_SUPPORT.FinalizationRegistry).toBe(true);

      // Erstelle eine FinalizationRegistry-Instanz
      const callback = vi.fn();
      const registry = new FinalizationRegistryConstructor(callback);

      // Typprüfung - sollte register- und unregister-Methoden haben
      expect(typeof registry.register).toBe("function");
      expect(typeof registry.unregister).toBe("function");

      // Funktionalitätsprüfung - sollte Objekte registrieren können
      const obj = { test: "value" };
      const token = { id: 1 };

      // Sollte keine Fehler werfen
      expect(() => {
        registry.register(obj, "heldValue", token);
        registry.unregister(token);
      }).not.toThrow();
    });

    it("sollte Polyfill für FinalizationRegistry bereitstellen, wenn nicht verfügbar", () => {
      // Simuliere Browser ohne FinalizationRegistry
      global.FinalizationRegistry = undefined;

      // FinalizationRegistry sollte polyfilled werden
      const FinalizationRegistryConstructor =
        getFinalizationRegistryConstructor();
      expect(FinalizationRegistryConstructor).not.toBe(undefined);
      expect(ES2021_SUPPORT.FinalizationRegistry).toBe(false);

      // Erstelle eine FinalizationRegistry-Instanz mit dem Polyfill
      const callback = vi.fn();
      const registry = new FinalizationRegistryConstructor(callback);

      // Typprüfung - sollte register- und unregister-Methoden haben
      expect(typeof registry.register).toBe("function");
      expect(typeof registry.unregister).toBe("function");

      // Funktionalitätsprüfung - sollte Objekte registrieren können, aber nicht tatsächlich finalisieren
      const obj = { test: "value" };
      const token = { id: 1 };

      // Sollte keine Fehler werfen
      expect(() => {
        registry.register(obj, "heldValue", token);
        registry.unregister(token);
      }).not.toThrow();

      // Der Callback wird nie aufgerufen, da es ein Polyfill ist
      expect(callback).not.toHaveBeenCalled();
    });

    it("sollte FinalizationRegistry typsicher verwenden können", () => {
      // Hole den FinalizationRegistry-Konstruktor
      const SafeFinalizationRegistry = getFinalizationRegistryConstructor();

      // Erstelle eine typsichere FinalizationRegistry
      const callback = vi.fn();
      const registry = new SafeFinalizationRegistry(callback);

      // Typsicherheit prüfen - register sollte 3 Parameter akzeptieren
      const obj = { test: "value" };
      const token = { id: 1 };

      // Diese Aufrufe sollten kompilieren und keine Fehler werfen
      registry.register(obj, "heldValue", token);
      registry.register(obj, "heldValue"); // Optionaler dritter Parameter
      registry.unregister(token);

      // TypeScript-Kompatibilität mit dem polyfilled Interface
      type RegistryType = typeof registry;
      expect(typeof registry.register).toBe("function");
    });
  });

  describe("Integration mit Bridge-Komponenten", () => {
    it("sollte SafeWeakRef und SafeFinalizationRegistry in Komponenten verwenden können", () => {
      // Simuliere eine Bridge-Komponente mit WeakRef und FinalizationRegistry
      class TestBridgeComponent {
        private refs = new Set<any>();
        private registry: any;

        constructor() {
          const SafeFinalizationRegistry = getFinalizationRegistryConstructor();
          this.registry = new SafeFinalizationRegistry((heldValue: string) => {
            console.log(`Object with key ${heldValue} was garbage collected`);
          });
        }

        addObject(obj: object, key: string): void {
          const SafeWeakRef = getWeakRefConstructor();
          const ref = new SafeWeakRef(obj);
          this.refs.add(ref);
          this.registry.register(obj, key);
        }

        getObject(ref: any): any {
          return ref.deref();
        }
      }

      // Erstelle eine Test-Komponente
      const component = new TestBridgeComponent();

      // Objekt hinzufügen
      const obj = { test: "value" };
      component.addObject(obj, "test-key");

      // Die Operationen sollten keine Fehler werfen
      expect(() => {
        // Typische WeakRef/FinalizationRegistry-Operationen durchführen
        const weakRef = Array.from(component["refs"])[0];
        const retrieved = component.getObject(weakRef);
        expect(retrieved).toBe(obj);
      }).not.toThrow();
    });
  });
});
