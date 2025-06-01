/**
 * Prop-Validatoren und Hilfsfunktionen
 *
 * Diese Datei enthält Validierungsfunktionen und Hilfsfunktionen für Vue-Komponenten-Props,
 * um eine konsistente Validierung und bessere Typisierung in der gesamten Anwendung zu gewährleisten.
 */

/**
 * Validiert, dass ein Wert einer der erlaubten Werte ist
 *
 * @param allowedValues Array von erlaubten Werten
 * @returns Validierungsfunktion für Props
 *
 * @example
 * ```ts
 * const props = defineProps({
 *   status: {
 *     type: String,
 *     validator: isOneOf(['success', 'warning', 'error', 'info'])
 *   }
 * });
 * ```
 */
export function isOneOf<T>(
  allowedValues: readonly T[],
): (value: unknown) => boolean {
  return (value: unknown) => {
    return allowedValues.includes(value as T);
  };
}

/**
 * Validiert, dass ein String nicht leer ist
 *
 * @param value Der zu validierende Wert
 * @returns true, wenn der String nicht leer ist
 *
 * @example
 * ```ts
 * const props = defineProps({
 *   name: {
 *     type: String,
 *     required: true,
 *     validator: isNotEmpty
 *   }
 * });
 * ```
 */
export function isNotEmpty(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return value.trim().length > 0;
}

/**
 * Validiert, dass eine Zahl innerhalb eines bestimmten Bereichs liegt
 *
 * @param min Minimaler Wert (inklusiv)
 * @param max Maximaler Wert (inklusiv)
 * @returns Validierungsfunktion für Props
 *
 * @example
 * ```ts
 * const props = defineProps({
 *   age: {
 *     type: Number,
 *     validator: isInRange(0, 120)
 *   }
 * });
 * ```
 */
export function isInRange(
  min: number,
  max: number,
): (value: unknown) => boolean {
  return (value: unknown) => {
    if (typeof value !== "number") return false;
    return value >= min && value <= max;
  };
}

/**
 * Validiert, dass eine Zahl größer als ein bestimmter Wert ist
 *
 * @param min Minimaler Wert (exklusiv)
 * @returns Validierungsfunktion für Props
 *
 * @example
 * ```ts
 * const props = defineProps({
 *   count: {
 *     type: Number,
 *     validator: isGreaterThan(0) // Positiv
 *   }
 * });
 * ```
 */
export function isGreaterThan(min: number): (value: unknown) => boolean {
  return (value: unknown) => {
    if (typeof value !== "number") return false;
    return value > min;
  };
}

/**
 * Validiert, dass eine Zahl größer oder gleich einem bestimmten Wert ist
 *
 * @param min Minimaler Wert (inklusiv)
 * @returns Validierungsfunktion für Props
 */
export function isGreaterThanOrEqual(min: number): (value: unknown) => boolean {
  return (value: unknown) => {
    if (typeof value !== "number") return false;
    return value >= min;
  };
}

/**
 * Validiert, dass ein String einem bestimmten regulären Ausdruck entspricht
 *
 * @param pattern Regulärer Ausdruck
 * @returns Validierungsfunktion für Props
 *
 * @example
 * ```ts
 * const props = defineProps({
 *   email: {
 *     type: String,
 *     validator: matchesPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
 *   }
 * });
 * ```
 */
export function matchesPattern(pattern: RegExp): (value: unknown) => boolean {
  return (value: unknown) => {
    if (typeof value !== "string") return false;
    return pattern.test(value);
  };
}

/**
 * Validiert, dass ein Wert ein Array mit mindestens einer bestimmten Länge ist
 *
 * @param minLength Minimale Länge des Arrays (Standard: 1)
 * @returns Validierungsfunktion für Props
 *
 * @example
 * ```ts
 * const props = defineProps({
 *   items: {
 *     type: Array,
 *     validator: isArrayWithLength(1) // Mindestens ein Element
 *   },
 *   options: {
 *     type: Array,
 *     validator: isArrayWithLength(2, 5) // 2 bis 5 Elemente
 *   }
 * });
 * ```
 */
export function isArrayWithLength(
  minLength = 1,
  maxLength?: number,
): (value: unknown) => boolean {
  return (value: unknown) => {
    if (!Array.isArray(value)) return false;
    if (value.length < minLength) return false;
    if (maxLength !== undefined && value.length > maxLength) return false;
    return true;
  };
}

/**
 * Validiert, dass ein Wert ein Objekt mit einem bestimmten Schlüssel ist
 *
 * @param key Der erforderliche Schlüssel
 * @returns Validierungsfunktion für Props
 *
 * @example
 * ```ts
 * const props = defineProps({
 *   user: {
 *     type: Object,
 *     validator: hasRequiredKey('id')
 *   }
 * });
 * ```
 */
export function hasRequiredKey(key: string): (value: unknown) => boolean {
  return (value: unknown) => {
    if (typeof value !== "object" || value === null) return false;
    return key in value;
  };
}

/**
 * Validiert, dass ein Wert ein Objekt mit bestimmten Schlüsseln ist
 *
 * @param keys Array von erforderlichen Schlüsseln
 * @returns Validierungsfunktion für Props
 *
 * @example
 * ```ts
 * const props = defineProps({
 *   user: {
 *     type: Object,
 *     validator: hasRequiredKeys(['id', 'name', 'email'])
 *   }
 * });
 * ```
 */
export function hasRequiredKeys(keys: string[]): (value: unknown) => boolean {
  return (value: unknown) => {
    if (typeof value !== "object" || value === null) return false;
    return keys.every((key) => key in value);
  };
}

/**
 * Kombiniert mehrere Validatoren mit UND-Logik
 *
 * @param validators Array von Validierungsfunktionen
 * @returns Kombinierte Validierungsfunktion
 *
 * @example
 * ```ts
 * const props = defineProps({
 *   name: {
 *     type: String,
 *     validator: and([isNotEmpty, matchesPattern(/^[a-zA-Z\s]+$/)])
 *   }
 * });
 * ```
 */
export function and(
  validators: ((value: unknown) => boolean)[],
): (value: unknown) => boolean {
  return (value: unknown) => {
    return validators.every((validator) => validator(value));
  };
}

/**
 * Kombiniert mehrere Validatoren mit ODER-Logik
 *
 * @param validators Array von Validierungsfunktionen
 * @returns Kombinierte Validierungsfunktion
 *
 * @example
 * ```ts
 * const props = defineProps({
 *   identifier: {
 *     validator: or([
 *       matchesPattern(/^\d{9}$/), // 9-stellige Zahl
 *       matchesPattern(/^[A-Z]{2}\d{7}$/) // 2 Buchstaben + 7 Ziffern
 *     ])
 *   }
 * });
 * ```
 */
export function or(
  validators: ((value: unknown) => boolean)[],
): (value: unknown) => boolean {
  return (value: unknown) => {
    return validators.some((validator) => validator(value));
  };
}

/**
 * Negiert einen Validator
 *
 * @param validator Validierungsfunktion
 * @returns Negierte Validierungsfunktion
 *
 * @example
 * ```ts
 * const props = defineProps({
 *   reservedName: {
 *     type: String,
 *     validator: not(isOneOf(['admin', 'system', 'root']))
 *   }
 * });
 * ```
 */
export function not(
  validator: (value: unknown) => boolean,
): (value: unknown) => boolean {
  return (value: unknown) => {
    return !validator(value);
  };
}

/**
 * E-Mail-Validator
 *
 * @param value Der zu validierende Wert
 * @returns true, wenn der Wert eine gültige E-Mail-Adresse ist
 *
 * @example
 * ```ts
 * const props = defineProps({
 *   email: {
 *     type: String,
 *     validator: isEmail
 *   }
 * });
 * ```
 */
export function isEmail(value: unknown): boolean {
  if (typeof value !== "string") return false;
  // Einfache E-Mail-Validierung
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(value);
}

/**
 * URL-Validator
 *
 * @param value Der zu validierende Wert
 * @returns true, wenn der Wert eine gültige URL ist
 *
 * @example
 * ```ts
 * const props = defineProps({
 *   website: {
 *     type: String,
 *     validator: isUrl
 *   }
 * });
 * ```
 */
export function isUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * ISO-Datum-Validator
 *
 * @param value Der zu validierende Wert
 * @returns true, wenn der Wert ein gültiges ISO-Datum ist
 *
 * @example
 * ```ts
 * const props = defineProps({
 *   birthdate: {
 *     type: String,
 *     validator: isIsoDate
 *   }
 * });
 * ```
 */
export function isIsoDate(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const isoDatePattern =
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;

  if (!isoDatePattern.test(value)) return false;

  // Validiere, dass es ein gültiges Datum ist
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Validator für hexadezimale Farbcodes
 *
 * @param value Der zu validierende Wert
 * @returns true, wenn der Wert ein gültiger Hex-Farbcode ist
 *
 * @example
 * ```ts
 * const props = defineProps({
 *   color: {
 *     type: String,
 *     validator: isHexColor
 *   }
 * });
 * ```
 */
export function isHexColor(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^#([0-9A-F]{3}){1,2}$/i.test(value);
}

/**
 * Objekt zur einfachen Verwendung aller Validatoren
 */
export const validators = {
  isOneOf,
  isNotEmpty,
  isInRange,
  isGreaterThan,
  isGreaterThanOrEqual,
  matchesPattern,
  isArrayWithLength,
  hasRequiredKey,
  hasRequiredKeys,
  and,
  or,
  not,
  isEmail,
  isUrl,
  isIsoDate,
  isHexColor,
};

export default validators;
