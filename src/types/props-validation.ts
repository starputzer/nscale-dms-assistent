/**
 * Type-sichere Props-Validierung für Vue-Komponenten
 *
 * Utility-Funktionen zur Laufzeit-Validierung von Component Props
 */

import type { PropType } from "vue";

// Basis-Validator-Interface
export interface PropValidator<T> {
  type?: PropType<T>;
  required?: boolean;
  default?: T | (() => T);
  validator?: (value: T) => boolean;
}

// String-Validator mit erweiterten Optionen
export function stringProp(
  options: {
    required?: boolean;
    default?: string;
    validator?: (value: string) => boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    enum?: string[];
  } = {},
): PropValidator<string> {
  const validators: Array<(value: string) => boolean> = [];

  if (options.minLength !== undefined) {
    validators.push((value) => value.length >= options.minLength!);
  }

  if (options.maxLength !== undefined) {
    validators.push((value) => value.length <= options.maxLength!);
  }

  if (options.pattern) {
    validators.push((value) => options.pattern!.test(value));
  }

  if (options.enum) {
    validators.push((value) => options.enum!.includes(value));
  }

  if (options.validator) {
    validators.push(options.validator);
  }

  return {
    type: String as PropType<string>,
    required: options.required,
    default: options.default,
    validator:
      validators.length > 0
        ? (value: string) => validators.every((v) => v(value))
        : undefined,
  };
}

// Number-Validator mit erweiterten Optionen
export function numberProp(
  options: {
    required?: boolean;
    default?: number;
    validator?: (value: number) => boolean;
    min?: number;
    max?: number;
    integer?: boolean;
    positive?: boolean;
  } = {},
): PropValidator<number> {
  const validators: Array<(value: number) => boolean> = [];

  if (options.min !== undefined) {
    validators.push((value) => value >= options.min!);
  }

  if (options.max !== undefined) {
    validators.push((value) => value <= options.max!);
  }

  if (options.integer) {
    validators.push((value) => Number.isInteger(value));
  }

  if (options.positive) {
    validators.push((value) => value > 0);
  }

  if (options.validator) {
    validators.push(options.validator);
  }

  return {
    type: Number as PropType<number>,
    required: options.required,
    default: options.default,
    validator:
      validators.length > 0
        ? (value: number) => validators.every((v) => v(value))
        : undefined,
  };
}

// Boolean-Validator
export function booleanProp(
  options: {
    required?: boolean;
    default?: boolean;
  } = {},
): PropValidator<boolean> {
  return {
    type: Boolean as PropType<boolean>,
    required: options.required,
    default: options.default,
  };
}

// Array-Validator mit Type-Safety
export function arrayProp<T>(
  options: {
    required?: boolean;
    default?: () => T[];
    validator?: (value: T[]) => boolean;
    minLength?: number;
    maxLength?: number;
    itemValidator?: (item: T) => boolean;
  } = {},
): PropValidator<T[]> {
  const validators: Array<(value: T[]) => boolean> = [];

  if (options.minLength !== undefined) {
    validators.push((value) => value.length >= options.minLength!);
  }

  if (options.maxLength !== undefined) {
    validators.push((value) => value.length <= options.maxLength!);
  }

  if (options.itemValidator) {
    validators.push((value) => value.every(options.itemValidator!));
  }

  if (options.validator) {
    validators.push(options.validator);
  }

  return {
    type: Array as PropType<T[]>,
    required: options.required,
    default: options.default,
    validator:
      validators.length > 0
        ? (value: T[]) => validators.every((v) => v(value))
        : undefined,
  };
}

// Object-Validator mit Type-Safety
export function objectProp<T extends Record<string, any>>(
  options: {
    required?: boolean;
    default?: () => T;
    validator?: (value: T) => boolean;
    shape?: {
      [K in keyof T]?: PropValidator<T[K]>;
    };
  } = {},
): PropValidator<T> {
  const validators: Array<(value: T) => boolean> = [];

  if (options.shape) {
    validators.push((value) => {
      return Object.entries(options.shape!).every(
        ([key, validator]: [string, any]) => {
          const propValue = value[key];
          if (validator.required && propValue === undefined) return false;
          if (validator.validator && propValue !== undefined) {
            return validator.validator(propValue);
          }
          return true;
        },
      );
    });
  }

  if (options.validator) {
    validators.push(options.validator);
  }

  return {
    type: Object as PropType<T>,
    required: options.required,
    default: options.default,
    validator:
      validators.length > 0
        ? (value: T) => validators.every((v) => v(value))
        : undefined,
  };
}

// Enum-Validator für strikte Werte
export function enumProp<T extends string | number>(
  values: readonly T[],
  options: {
    required?: boolean;
    default?: T;
  } = {},
): PropValidator<T> {
  return {
    type: [String, Number] as PropType<T>,
    required: options.required,
    default: options.default,
    validator: (value: T) => values.includes(value),
  };
}

// Function-Validator
export function functionProp<T extends (...args: any[]) => any>(
  options: {
    required?: boolean;
    default?: T;
  } = {},
): PropValidator<T> {
  return {
    type: Function as PropType<T>,
    required: options.required,
    default: options.default,
  };
}

// Date-Validator
export function dateProp(
  options: {
    required?: boolean;
    default?: Date | (() => Date);
    validator?: (value: Date) => boolean;
    min?: Date;
    max?: Date;
    future?: boolean;
    past?: boolean;
  } = {},
): PropValidator<Date> {
  const validators: Array<(value: Date) => boolean> = [];

  if (options.min) {
    validators.push((value) => value >= options.min!);
  }

  if (options.max) {
    validators.push((value) => value <= options.max!);
  }

  if (options.future) {
    validators.push((value) => value > new Date());
  }

  if (options.past) {
    validators.push((value) => value < new Date());
  }

  if (options.validator) {
    validators.push(options.validator);
  }

  return {
    type: Date as PropType<Date>,
    required: options.required,
    default: options.default,
    validator:
      validators.length > 0
        ? (value: Date) => validators.every((v) => v(value))
        : undefined,
  };
}

// Union-Type-Validator
export function unionProp<T>(
  types: Array<PropType<T>>,
  options: {
    required?: boolean;
    default?: T | (() => T);
    validator?: (value: T) => boolean;
  } = {},
): PropValidator<T> {
  return {
    type: types,
    required: options.required,
    default: options.default,
    validator: options.validator,
  };
}

// Custom-Validator-Factory
export function customProp<T>(
  type: PropType<T>,
  options: {
    required?: boolean;
    default?: T | (() => T);
    validator?: (value: T) => boolean;
  } = {},
): PropValidator<T> {
  return {
    type,
    required: options.required,
    default: options.default,
    validator: options.validator,
  };
}

// Helper für Conditional Props
export function conditionalProp<T>(
  condition: () => boolean,
  trueProp: PropValidator<T>,
  falseProp: PropValidator<T>,
): PropValidator<T> {
  return condition() ? trueProp : falseProp;
}

// Helper für Composed Props
export function composedProp<T>(
  ...validators: Array<PropValidator<T>>
): PropValidator<T> {
  const composed: PropValidator<T> = {};

  for (const validator of validators) {
    if (validator.type) composed.type = validator.type;
    if (validator.required !== undefined)
      composed.required = validator.required;
    if (validator.default !== undefined) composed.default = validator.default;
    if (validator.validator) {
      const prevValidator = composed.validator;
      composed.validator = prevValidator
        ? (value: T) => prevValidator(value) && validator.validator!(value)
        : validator.validator;
    }
  }

  return composed;
}

// Beispiel-Verwendung in einer Komponente:
/*
export default defineComponent({
  props: {
    title: stringProp({ 
      required: true, 
      minLength: 3, 
      maxLength: 100 
    }),
    
    count: numberProp({ 
      default: 0, 
      min: 0, 
      max: 100,
      integer: true
    }),
    
    status: enumProp(['active', 'inactive', 'pending'], {
      default: 'pending'
    }),
    
    tags: arrayProp<string>({
      default: () => [],
      itemValidator: tag => tag.length > 0
    }),
    
    config: objectProp({
      default: () => ({ theme: 'light', size: 'medium' }),
      shape: {
        theme: enumProp(['light', 'dark']),
        size: enumProp(['small', 'medium', 'large'])
      }
    })
  }
})
*/
