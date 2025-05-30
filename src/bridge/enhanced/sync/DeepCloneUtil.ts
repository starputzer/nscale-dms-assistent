/**
 * DeepCloneUtil.ts
 *
 * Stellt spezialisierte Funktionen zur tiefen Objektkopie und
 * zum Vergleich komplexer Objektstrukturen bereit.
 * Unterstützt spezialisierte Datentypen, Zirkularitätserkennung
 * und performanceoptimierte Gleichheitsüberprüfung.
 */

import { logger } from "../logger";

/**
 * Optionen für Deep Clone
 */
export interface DeepCloneOptions {
  // Grundlegend
  maxDepth?: number; // Maximale Rekursionstiefe
  includeNonEnumerable?: boolean; // Nicht-enumerierbare Eigenschaften einbeziehen?
  preserveGettersSetters?: boolean; // Getter/Setter-Eigenschaften beibehalten?

  // Zirkularitätserkennung
  handleCircularReferences?: boolean; // Zirkuläre Referenzen erkennen und behandeln?
  circularReferencePlaceholder?: any; // Ersatzwert für zirkuläre Referenzen

  // Spezialisierte Datentypen
  cloneSpecialObjects?: boolean; // Spezialisierte Objekte klonen?
  cloneFunctions?: boolean; // Funktionen klonen?
  cloneInstancesOf?: (new (...args: any[]) => any)[]; // Instanzen dieser Klassen klonen

  // Transformationen
  beforeClone?: (value: any, key?: string | number, parent?: any) => any; // Vor dem Klonen aufrufen
  afterClone?: (clone: any, original: any, key?: string | number) => any; // Nach dem Klonen aufrufen

  // Performance
  useStructuredClone?: boolean; // Strukturierte Klonung verwenden, wenn verfügbar?
  cachingEnabled?: boolean; // Cache für bereits geklonte Objekte aktivieren?
}

/**
 * Standard-Optionen für Deep Clone
 */
const DEFAULT_CLONE_OPTIONS: DeepCloneOptions = {
  maxDepth: 100,
  includeNonEnumerable: false,
  preserveGettersSetters: false,
  handleCircularReferences: true,
  circularReferencePlaceholder: "[Circular Reference]",
  cloneSpecialObjects: true,
  cloneFunctions: false,
  useStructuredClone: true,
  cachingEnabled: true,
};

/**
 * Optionen für Deep Equal
 */
export interface DeepEqualOptions {
  // Grundlegend
  maxDepth?: number; // Maximale Rekursionstiefe
  strict?: boolean; // Strikte Gleichheit verwenden (===)?

  // Zirkularitätserkennung
  handleCircularReferences?: boolean; // Zirkuläre Referenzen erkennen und behandeln?

  // Spezialisierte Vergleiche
  compareNonEnumerableProps?: boolean; // Nicht-enumerierbare Eigenschaften vergleichen?
  compareSymbols?: boolean; // Symbol-Eigenschaften vergleichen?
  ignoreUndefinedProperties?: boolean; // Undefinierte Eigenschaften ignorieren?
  ignorePropertyOrder?: boolean; // Reihenfolge der Eigenschaften ignorieren?
  ignoreArrayOrder?: boolean; // Reihenfolge der Array-Elemente ignorieren?

  // Transformationen
  beforeCompare?: (value: any, key?: string | number, parent?: any) => any; // Vor dem Vergleich aufrufen

  // Leistungsoptimierungen
  useFastComparison?: boolean; // Schnelle Vergleichsmethoden für häufige Fälle verwenden?
  cachingEnabled?: boolean; // Cache für bereits verglichene Objekte aktivieren?
}

/**
 * Standard-Optionen für Deep Equal
 */
const DEFAULT_EQUAL_OPTIONS: DeepEqualOptions = {
  maxDepth: 100,
  strict: false,
  handleCircularReferences: true,
  compareNonEnumerableProps: false,
  compareSymbols: false,
  ignoreUndefinedProperties: false,
  ignorePropertyOrder: false,
  ignoreArrayOrder: false,
  useFastComparison: true,
  cachingEnabled: true,
};

/**
 * Klont ein Objekt tief (rekursiv)
 * @param source Das zu klonende Objekt
 * @param options Optionen für den Klon-Vorgang
 * @returns Eine tiefe Kopie des Objekts
 */
export function deepClone<T>(
  source: T,
  options?: Partial<DeepCloneOptions>,
): T {
  const opts = { ...DEFAULT_CLONE_OPTIONS, ...options };

  // Fast-Path für primitive Werte
  if (source === null || source === undefined || typeof source !== "object") {
    return source;
  }

  // Falls verfügbar und aktiviert, strukturierte Klonung verwenden
  if (
    opts.useStructuredClone &&
    typeof structuredClone === "function" &&
    !opts.beforeClone &&
    !opts.afterClone &&
    !opts.includeNonEnumerable &&
    !opts.preserveGettersSetters &&
    !opts.cloneFunctions
  ) {
    try {
      return structuredClone(source);
    } catch (error) {
      // Fallback zur manuellen Klonung bei Fehler
      logger.debug(
        "structuredClone failed, falling back to manual clone:",
        error,
      );
      // Weiter mit manueller Klonung
    }
  }

  // Objekte für Zirkularitätserkennung verfolgen, falls aktiviert
  const references = new Map<any, any>();

  return cloneRecursive(source, opts, references, undefined, undefined, 0);
}

/**
 * Interne Funktion für rekursives Klonen
 * @private
 */
function cloneRecursive<T>(
  source: T,
  options: DeepCloneOptions,
  references: Map<any, any>,
  key?: string | number,
  parent?: any,
  depth: number = 0,
): T {
  // Tiefenlimit prüfen
  if (depth > (options.maxDepth || 100)) {
    logger.warn(
      `Max recursion depth (${options.maxDepth}) reached during deep clone`,
    );
    return options.circularReferencePlaceholder as unknown as T;
  }

  // Null/Undefined direkt zurückgeben
  if (source === null || source === undefined) {
    return source;
  }

  // BeforeClone-Hook anwenden, falls vorhanden
  if (options.beforeClone) {
    const transformed = options.beforeClone(source, key, parent);
    if (transformed !== source) {
      return transformed;
    }
  }

  // Primitive Werte direkt zurückgeben
  if (typeof source !== "object" && typeof source !== "function") {
    return source;
  }

  // Funktionen behandeln
  if (typeof source === "function") {
    if (!options.cloneFunctions) {
      return source;
    }

    // Klonen von Funktionen (sehr eingeschränkt möglich)
    try {
      const clonedFunc = source.bind({});
      // Eigenschaften übertragen
      Object.assign(clonedFunc, source);
      return clonedFunc as unknown as T;
    } catch (error) {
      logger.warn("Failed to clone function, returning original:", error);
      return source;
    }
  }

  // Zirkuläre Referenzen behandeln
  if (options.handleCircularReferences && references.has(source)) {
    return options.circularReferencePlaceholder as unknown as T;
  }

  // Spezialisierte Datentypen behandeln
  if (options.cloneSpecialObjects) {
    // Date-Objekte
    if (source instanceof Date) {
      return new Date(source.getTime()) as unknown as T;
    }

    // RegExp-Objekte
    if (source instanceof RegExp) {
      return new RegExp(source.source, source.flags) as unknown as T;
    }

    // Map-Objekte
    if (source instanceof Map) {
      const clonedMap = new Map();
      // In Referenzen aufnehmen, um Zirkularität zu erkennen
      if (options.handleCircularReferences) {
        references.set(source, clonedMap);
      }

      for (const [k, v] of source.entries()) {
        clonedMap.set(
          cloneRecursive(k, options, references, undefined, source, depth + 1),
          cloneRecursive(v, options, references, k, source, depth + 1),
        );
      }

      return clonedMap as unknown as T;
    }

    // Set-Objekte
    if (source instanceof Set) {
      const clonedSet = new Set();
      // In Referenzen aufnehmen, um Zirkularität zu erkennen
      if (options.handleCircularReferences) {
        references.set(source, clonedSet);
      }

      for (const item of source) {
        clonedSet.add(
          cloneRecursive(
            item,
            options,
            references,
            undefined,
            source,
            depth + 1,
          ),
        );
      }

      return clonedSet as unknown as T;
    }

    // ArrayBuffer und TypedArrays
    if (source instanceof ArrayBuffer) {
      return source.slice(0) as unknown as T;
    }

    if (ArrayBuffer.isView(source) && !(source instanceof DataView)) {
      // TypedArray (Uint8Array, Float32Array, etc.)
      const typedArrayConstructor = source.constructor as any;
      return new typedArrayConstructor(
        source.buffer.slice(0),
        source.byteOffset,
        source.length,
      ) as unknown as T;
    }

    // DataView
    if (source instanceof DataView) {
      const buffer = source.buffer.slice(0);
      return new DataView(
        buffer,
        source.byteOffset,
        source.byteLength,
      ) as unknown as T;
    }

    // Blob (wird als Referenz behandelt, da es nicht direkt klonbar ist)
    if (source instanceof Blob) {
      return source;
    }

    // Benutzerdefinierte Klassen, falls angegeben
    if (options.cloneInstancesOf && options.cloneInstancesOf.length > 0) {
      for (const Constructor of options.cloneInstancesOf) {
        if (source instanceof Constructor) {
          try {
            // Einfacher Ansatz: leere Instanz erstellen und Eigenschaften kopieren
            const clone = new Constructor();

            // In Referenzen aufnehmen, um Zirkularität zu erkennen
            if (options.handleCircularReferences) {
              references.set(source, clone);
            }

            // Eigenschaften kopieren
            for (const prop of Object.getOwnPropertyNames(source)) {
              const descriptor = Object.getOwnPropertyDescriptor(source, prop);
              if (
                descriptor &&
                (!descriptor.get || options.preserveGettersSetters)
              ) {
                Object.defineProperty(clone, prop, descriptor);
              } else if (descriptor && descriptor.get) {
                // Einfache Zuweisung für Getter
                (clone as any)[prop] = (source as any)[prop];
              }
            }

            return clone as unknown as T;
          } catch (error) {
            logger.warn(
              `Failed to clone instance of ${Constructor.name}:`,
              error,
            );
            return source;
          }
        }
      }
    }
  }

  // Array behandeln
  if (Array.isArray(source)) {
    const clonedArray: any[] = [];

    // In Referenzen aufnehmen, um Zirkularität zu erkennen
    if (options.handleCircularReferences) {
      references.set(source, clonedArray);
    }

    // Array-Elemente rekursiv klonen
    for (let i = 0; i < source.length; i++) {
      clonedArray[i] = cloneRecursive(
        source[i],
        options,
        references,
        i,
        source,
        depth + 1,
      );
    }

    return clonedArray as unknown as T;
  }

  // Standardfall: Objekt
  const clonedObj = Object.create(Object.getPrototypeOf(source));

  // In Referenzen aufnehmen, um Zirkularität zu erkennen
  if (options.handleCircularReferences) {
    references.set(source, clonedObj);
  }

  // Eigenschaften auslesen und klonen
  const props = options.includeNonEnumerable
    ? Object.getOwnPropertyNames(source)
    : Object.keys(source as object);

  // Symbol-Eigenschaften, falls vorhanden
  if (options.includeNonEnumerable) {
    props.push(
      ...(Object.getOwnPropertySymbols(
        source as object,
      ) as unknown as string[]),
    );
  }

  // Eigenschaften durchgehen und rekursiv klonen
  for (const prop of props) {
    const descriptor = Object.getOwnPropertyDescriptor(source as object, prop);

    if (descriptor) {
      if (descriptor.get || descriptor.set) {
        // Getter/Setter
        if (options.preserveGettersSetters) {
          Object.defineProperty(clonedObj, prop, descriptor);
        } else if (descriptor.get) {
          // Wert lesen und als normale Eigenschaft setzen
          try {
            const value = (source as any)[prop];
            clonedObj[prop] = cloneRecursive(
              value,
              options,
              references,
              prop,
              source,
              depth + 1,
            );
          } catch (error) {
            logger.warn(
              `Error accessing getter during clone: ${String(prop)}`,
              error,
            );
          }
        }
      } else {
        // Normale Eigenschaft
        clonedObj[prop] = cloneRecursive(
          (source as any)[prop],
          options,
          references,
          prop,
          source,
          depth + 1,
        );
      }
    }
  }

  // AfterClone-Hook anwenden, falls vorhanden
  if (options.afterClone) {
    return options.afterClone(clonedObj, source, key) as unknown as T;
  }

  return clonedObj;
}

/**
 * Vergleicht zwei Werte tief auf Gleichheit
 * @param a Erster Wert
 * @param b Zweiter Wert
 * @param options Optionen für den Vergleich
 * @returns True, wenn die Werte tief gleich sind, ansonsten False
 */
export function deepEqual(
  a: any,
  b: any,
  options?: Partial<DeepEqualOptions>,
): boolean {
  const opts = { ...DEFAULT_EQUAL_OPTIONS, ...options };

  // Verarbeitete Paare verfolgen (für Zirkularitätserkennung)
  const comparedPairs = new Map<any, Set<any>>();

  return equalRecursive(a, b, opts, comparedPairs, 0);
}

/**
 * Interne Funktion für rekursiven Gleichheitsvergleich
 * @private
 */
function equalRecursive(
  a: any,
  b: any,
  options: DeepEqualOptions,
  comparedPairs: Map<any, Set<any>>,
  depth: number,
): boolean {
  // Tiefenlimit prüfen
  if (depth > (options.maxDepth || 100)) {
    logger.warn(
      `Max recursion depth (${options.maxDepth}) reached during deep comparison`,
    );
    return false;
  }

  // BeforeCompare-Hook anwenden, falls vorhanden
  if (options.beforeCompare) {
    a = options.beforeCompare(a);
    b = options.beforeCompare(b);
  }

  // Fast-Path für Identität
  if (a === b) {
    return true;
  }

  // Null/Undefined Check
  if (a === null || a === undefined || b === null || b === undefined) {
    return a === b;
  }

  // Typprüfung
  const typeA = typeof a;
  const typeB = typeof b;

  if (typeA !== typeB) {
    return false;
  }

  // Schneller Vergleich für primitive Typen
  if (typeA !== "object" && typeA !== "function") {
    if (options.strict) {
      return a === b;
    }

    // NaN-Vergleich (einziger Fall, wo NaN === NaN wahr sein soll)
    if (typeA === "number" && isNaN(a) && isNaN(b)) {
      return true;
    }

    return a == b;
  }

  // Zirkuläre Referenzen behandeln
  if (options.handleCircularReferences) {
    // Prüfen, ob dieses Paar bereits verglichen wurde
    if (comparedPairs.has(a)) {
      const pairs = comparedPairs.get(a)!;
      if (pairs.has(b)) {
        return true; // Wir nehmen an, dass sie gleich sind, da wir noch rekursiv vergleichen
      }
    } else {
      comparedPairs.set(a, new Set());
    }

    // Paar als verglichen markieren
    comparedPairs.get(a)!.add(b);
  }

  // Spezielle Objekttypen vergleichen

  // Dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // RegExp
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.source === b.source && a.flags === b.flags;
  }

  // Maps
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) {
      return false;
    }

    // Alle Einträge vergleichen
    for (const [key, valueA] of a.entries()) {
      // Prüfen, ob der Schlüssel existiert
      if (!b.has(key)) {
        return false;
      }

      // Werte rekursiv vergleichen
      const valueB = b.get(key);
      if (!equalRecursive(valueA, valueB, options, comparedPairs, depth + 1)) {
        return false;
      }
    }

    return true;
  }

  // Sets
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) {
      return false;
    }

    // Sets als Arrays konvertieren und vergleichen
    const arrayA = Array.from(a);
    const arrayB = Array.from(b);

    if (options.ignoreArrayOrder) {
      // Jedes Element aus a muss in b vorkommen und umgekehrt
      for (const itemA of arrayA) {
        // Äquivalentes Element in arrayB finden
        const foundIndex = arrayB.findIndex((itemB) =>
          equalRecursive(itemA, itemB, options, comparedPairs, depth + 1),
        );

        if (foundIndex === -1) {
          return false;
        }

        // Gefundenes Element entfernen (um Duplikate zu berücksichtigen)
        arrayB.splice(foundIndex, 1);
      }

      return arrayB.length === 0;
    } else {
      // Elementweise vergleichen
      return equalRecursive(arrayA, arrayB, options, comparedPairs, depth + 1);
    }
  }

  // ArrayBuffer
  if (a instanceof ArrayBuffer && b instanceof ArrayBuffer) {
    if (a.byteLength !== b.byteLength) {
      return false;
    }

    // Byte für Byte vergleichen
    const viewA = new Uint8Array(a);
    const viewB = new Uint8Array(b);

    for (let i = 0; i < viewA.length; i++) {
      if (viewA[i] !== viewB[i]) {
        return false;
      }
    }

    return true;
  }

  // TypedArrays (Float32Array, Uint8Array, etc.)
  if (
    ArrayBuffer.isView(a) &&
    ArrayBuffer.isView(b) &&
    a.constructor === b.constructor &&
    !(a instanceof DataView)
  ) {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }

  // DataView
  if (a instanceof DataView && b instanceof DataView) {
    if (a.byteLength !== b.byteLength) {
      return false;
    }

    for (let i = 0; i < a.byteLength; i++) {
      if (a.getUint8(i) !== b.getUint8(i)) {
        return false;
      }
    }

    return true;
  }

  // Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }

    if (options.ignoreArrayOrder) {
      // Kopien erstellen, um Elemente entfernen zu können
      const remainingB = [...b];

      // Für jedes Element in a ein passendes in b finden
      for (const itemA of a) {
        const foundIndex = remainingB.findIndex((itemB) =>
          equalRecursive(itemA, itemB, options, comparedPairs, depth + 1),
        );

        if (foundIndex === -1) {
          return false;
        }

        // Gefundenes Element entfernen
        remainingB.splice(foundIndex, 1);
      }

      return true;
    } else {
      // Elementweise vergleichen
      for (let i = 0; i < a.length; i++) {
        if (!equalRecursive(a[i], b[i], options, comparedPairs, depth + 1)) {
          return false;
        }
      }

      return true;
    }
  }

  // Standard-Objekte

  // Prototypen prüfen
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
    return false;
  }

  // Eigenschaften auslesen
  const propsA = options.compareNonEnumerableProps
    ? Object.getOwnPropertyNames(a)
    : Object.keys(a);
  const propsB = options.compareNonEnumerableProps
    ? Object.getOwnPropertyNames(b)
    : Object.keys(b);

  // Symbol-Eigenschaften hinzufügen, falls aktiviert
  if (options.compareSymbols) {
    propsA.push(...(Object.getOwnPropertySymbols(a) as unknown as string[]));
    propsB.push(...(Object.getOwnPropertySymbols(b) as unknown as string[]));
  }

  // Undefinierte Eigenschaften ignorieren, falls aktiviert
  if (options.ignoreUndefinedProperties) {
    const filteredPropsA = propsA.filter((prop: any) => a[prop] !== undefined);
    const filteredPropsB = propsB.filter((prop: any) => b[prop] !== undefined);

    // Aktualisierte Eigenschaftslisten verwenden
    propsA.length = 0;
    propsB.length = 0;
    propsA.push(...filteredPropsA);
    propsB.push(...filteredPropsB);
  }

  // Eigenschaftsreihenfolge ignorieren, falls aktiviert
  if (options.ignorePropertyOrder) {
    propsA.sort();
    propsB.sort();
  }

  // Anzahl der Eigenschaften prüfen
  if (propsA.length !== propsB.length) {
    return false;
  }

  // Prüfen, ob alle Eigenschaften von a auch in b existieren
  if (!options.ignorePropertyOrder) {
    for (const prop of propsA) {
      if (!propsB.includes(prop)) {
        return false;
      }
    }
  }

  // Eigenschaften vergleichen
  for (const prop of propsA) {
    // Getter/Setter berücksichtigen
    const descriptorA = Object.getOwnPropertyDescriptor(a, prop);
    const descriptorB = Object.getOwnPropertyDescriptor(b, prop);

    if (descriptorA && descriptorB) {
      // Prüfen ob beide Getter/Setter sind oder keiner
      const aHasAccessor =
        descriptorA.get !== undefined || descriptorA.set !== undefined;
      const bHasAccessor =
        descriptorB.get !== undefined || descriptorB.set !== undefined;

      if (aHasAccessor !== bHasAccessor) {
        return false;
      }

      if (aHasAccessor && bHasAccessor) {
        // Getter/Setter vergleichen ist kompliziert, wir prüfen nur, ob es die gleichen Funktionen sind
        if (
          descriptorA.get !== descriptorB.get ||
          descriptorA.set !== descriptorB.set
        ) {
          return false;
        }
      } else {
        // Werte rekursiv vergleichen
        if (
          !equalRecursive(
            a[prop],
            b[prop],
            options,
            comparedPairs,
            depth + a[prop - 1],
          )
        ) {
          return false;
        }
      }
    } else {
      // Ein Objekt hat einen Descriptor, das andere nicht
      return false;
    }
  }

  return true;
}

/**
 * Erzeugt einen Hash-Wert für ein Objekt, der für Cachingzwecke verwendet werden kann
 * @param value Das Objekt, für das ein Hash erzeugt werden soll
 * @param maxDepth Maximale Rekursionstiefe
 * @returns Ein String-Hash des Objekts
 */
export function objectHash(value: any, maxDepth: number = 10): string {
  // Objekte für Zirkularitätserkennung verfolgen
  const visited = new WeakSet();

  return hashRecursive(value, visited, 0, maxDepth);
}

/**
 * Interne Funktion zur rekursiven Hash-Berechnung
 * @private
 */
function hashRecursive(
  value: any,
  visited: WeakSet<any>,
  depth: number,
  maxDepth: number,
): string {
  // Tiefenlimit prüfen
  if (depth > maxDepth) {
    return "[max-depth]";
  }

  // Null/Undefined
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  // Primitive Typen
  if (typeof value !== "object" && typeof value !== "function") {
    return `${typeof value}:${String(value)}`;
  }

  // Zirkuläre Referenzen verhindern
  if (visited.has(value)) {
    return "[circular]";
  }

  // Spezielle Objekttypen
  if (value instanceof Date) {
    return `date:${value.getTime()}`;
  }

  if (value instanceof RegExp) {
    return `regexp:${value.source}:${value.flags}`;
  }

  if (value instanceof Error) {
    return `error:${value.name}:${value.message}`;
  }

  // Objekt als besucht markieren
  visited.add(value);

  // Arrays
  if (Array.isArray(value)) {
    const arrayHash = value
      .map((item, index: any) =>
        hashRecursive(item, visited, depth + 1, maxDepth),
      )
      .join(",");

    return `array:[${arrayHash}]`;
  }

  // Maps
  if (value instanceof Map) {
    const mapEntries = Array.from(value.entries())
      .map(([k, v]: any) => {
        const keyHash = hashRecursive(k, visited, depth + 1, maxDepth);
        const valueHash = hashRecursive(v, visited, depth + 1, maxDepth);
        return `${keyHash}=>${valueHash}`;
      })
      .join(",");

    return `map:{${mapEntries}}`;
  }

  // Sets
  if (value instanceof Set) {
    const setItems = Array.from(value)
      .map((item: any) => hashRecursive(item, visited, depth + 1, maxDepth))
      .join(",");

    return `set:{${setItems}}`;
  }

  // Standard-Objekte
  const props = Object.keys(value).sort(); // Sortieren für Konsistenz

  const objHash = props
    .map((prop: any) => {
      try {
        const propValue = value[prop];
        const propHash = hashRecursive(propValue, visited, depth + 1, maxDepth);
        return `${prop}:${propHash}`;
      } catch (error) {
        return `${prop}:[error]`;
      }
    })
    .join(",");

  return `object:{${objHash}}`;
}

export default {
  deepClone,
  deepEqual,
  objectHash,
};
