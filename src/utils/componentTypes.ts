/**
 * Component Utility Types
 *
 * Diese Datei enthält Utility-Typen speziell für die Arbeit mit Vue-Komponenten.
 * Sie bietet Typen für Props, Emits, Slots, Refs und andere komponentenspezifische Konzepte.
 */

import { ComputedRef, Ref, SetupContext } from "vue";

/**
 * DefineProps<T> - Hilfstyp für typsichere Props-Definitionen
 */
export type DefineProps<T> = Readonly<T>;

/**
 * PropType<T> - Hilfstyp für typsichere einzelne Prop-Definitionen
 *
 * @template T Der Typ der Prop
 */
export type PropType<T> = {
  type: PropConstructor<T> | PropConstructor<T>[] | null;
  required?: boolean;
  default?: T | (() => T);
  validator?(value: unknown): boolean;
};

/**
 * PropConstructor<T> - Konstruktortyp für Props
 *
 * @template T Der Typ der Prop
 */
export type PropConstructor<T> =
  | { new (...args: any[]): T & object }
  | { (): T }
  | PropMethod<T>;

/**
 * PropMethod<T> - Methodentyp für Funktionsprops
 *
 * @template T Der Rückgabetyp der Methode
 */
export type PropMethod<T, TArgs extends any[] = any[]> = (...args: TArgs) => T;

/**
 * EmitFn<Events> - Typsichere Emit-Funktion mit verbesserten Typannotationen
 *
 * @template Events Eine Record-Struktur, die Event-Namen zu Argument-Typen zuordnet
 * @example
 * ```ts
 * // Definition
 * type MyEvents = {
 *   'update:modelValue': [string];
 *   'change': [string, number];
 *   'click': [MouseEvent];
 * }
 *
 * // Verwendung
 * const emit = defineEmits<MyEvents>();
 * emit('update:modelValue', 'new value'); // Korrekt
 * emit('change', 'value', 42); // Korrekt
 * emit('click', new MouseEvent('click')); // Korrekt
 * emit('invalid', 123); // Fehler: Event existiert nicht
 * emit('change', 123); // Fehler: Falscher Typ für erstes Argument
 * ```
 */
export type EmitFn<Events extends Record<string, any[]>> = {
  <E extends keyof Events>(event: E, ...args: Events[E]): void;
};

/**
 * ComponentEmits<T> - Hilfstyp für typsichere Emits-Definitionen
 *
 * @template T Eine Record-Struktur, die Event-Namen zu Argument-Typen zuordnet
 */
export type ComponentEmits<T extends Record<string, any[]>> = {
  [K in keyof T]: (...args: T[K]) => void;
};

/**
 * EmitValidator<T> - Typ für Emit-Validierungsfunktionen
 *
 * @template T Der Typ der zu validierenden Payload
 */
export type EmitValidator<T extends any[]> = (...args: T) => boolean;

/**
 * EmitOptions<T> - Optionen für Emit-Definitionen mit Validatoren
 *
 * @template T Eine Record-Struktur, die Event-Namen zu Validierungsfunktionen zuordnet
 */
export type EmitOptions<T extends Record<string, any[]>> = {
  [K in keyof T]?: EmitValidator<T[K]>;
};

/**
 * SlotProps<T> - Hilfstyp für Slot-Props
 *
 * @template T Die Struktur der Props, die an einen Slot übergeben werden
 */
export type SlotProps<T> = { [K in keyof T]: T[K] };

/**
 * SlotFn<T> - Hilfstyp für Slot-Funktionen
 *
 * @template T Der Typ der Props, die an die Slot-Funktion übergeben werden
 */
export type SlotFn<T = any> = (props: T) => any;

/**
 * Slots<T> - Hilfstyp für alle verfügbaren Slots
 *
 * @template T Eine Record-Struktur, die Slot-Namen zu Prop-Typen zuordnet
 */
export type Slots<T extends Record<string, any>> = {
  [K in keyof T]?: SlotFn<T[K]>;
};

/**
 * ComponentInstance - Allgemeiner Typ für Komponenteninstanzen
 */
export interface ComponentInstance {
  $el: HTMLElement;
  $refs: Record<string, any>;
  $props: Record<string, any>;
  $attrs: Record<string, any>;
  $slots: Record<string, SlotFn>;
  $root: ComponentInstance;
  $parent: ComponentInstance | null;
  $emit: (event: string, ...args: any[]) => void;
  $forceUpdate: () => void;
  $nextTick: (fn?: () => void) => Promise<void>;
}

/**
 * ComponentRef<T> - Typsicherer Zugriff auf Template-Refs
 */
export type ComponentRef<T> = Ref<T | null>;

/**
 * UnwrapComponentRef<T> - Entpackt einen ComponentRef-Typ
 */
export type UnwrapComponentRef<T> = T extends Ref<infer V> ? V : T;

/**
 * ClassComponent<Props, Emits> - Typ für klassenbasierte Komponenten
 */
export interface ClassComponent<Props = {}, Emits = {}> {
  new (...args: any[]): {
    $props: Props;
    $emit: EmitFn<Emits>;
  };
}

/**
 * VModelType<T> - Hilfstyp für v-model mit spezifischem Typ
 *
 * @template T Der Typ des modelValue
 */
export interface VModelType<T> {
  modelValue: T;
  "onUpdate:modelValue": (value: T) => void;
}

/**
 * VModelProps<T> - Props für ein Komponente mit v-model
 *
 * @template T Der Typ des modelValue
 */
export type VModelProps<T> = {
  modelValue?: T;
};

/**
 * VModelEmits<T> - Emits für ein Komponente mit v-model
 *
 * @template T Der Typ des modelValue
 */
export type VModelEmits<T> = {
  "update:modelValue": [T];
};

/**
 * NamedVModelType<Name, T> - Hilfstyp für benannte v-models mit spezifischem Typ
 *
 * @template Name Der Name des v-model (z.B. 'search', 'selected')
 * @template T Der Typ des modelValue
 */
export type NamedVModelType<Name extends string, T> = {
  [K in `${Name}ModelValue`]: T;
} & {
  [K in `onUpdate:${Name}ModelValue`]: (value: T) => void;
};

/**
 * UseModelReturn<T> - Rückgabetyp für useModel-Composable
 *
 * @template T Der Typ des modelValue
 */
export interface UseModelReturn<T> {
  value: Ref<T>;
  onInput: (value: T) => void;
  onChange: (value: T) => void;
  internalValue: Ref<T>;
  setValue: (value: T) => void;
  reset: () => void;
}

/**
 * UseNamedModelReturn<T> - Rückgabetyp für useNamedModel-Composable
 *
 * @template T Der Typ des modelValue
 */
export interface UseNamedModelReturn<T> extends UseModelReturn<T> {
  propName: string;
  updateEventName: string;
}

/**
 * FormItemValidationStatus - Status für Formular-Validierungen
 */
export type FormItemValidationStatus =
  | "success"
  | "error"
  | "warning"
  | "validating"
  | "";

/**
 * FormValidationRule<T> - Validierungsregel für Formulare
 */
export interface FormValidationRule<T = any> {
  required?: boolean;
  message?: string;
  min?: number;
  max?: number;
  pattern?: RegExp;
  validator?: (value: T) => boolean | string | Promise<boolean | string>;
  trigger?: "blur" | "change" | Array<"blur" | "change">;
}

/**
 * FormItemProps - Props für Formular-Elemente
 */
export interface FormItemProps<T = any> {
  label?: string;
  name?: string;
  value?: T;
  rules?: FormValidationRule<T> | FormValidationRule<T>[];
  required?: boolean;
  validateStatus?: FormItemValidationStatus;
  help?: string;
  extra?: string;
  validateTrigger?: "blur" | "change" | Array<"blur" | "change">;
}

/**
 * ComponentSize - Größenoptionen für Komponenten
 */
export type ComponentSize = "small" | "medium" | "large" | "default";

/**
 * ComponentVariant - Variantenoptionen für Komponenten
 */
export type ComponentVariant =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

/**
 * PropOptions<T> - Hilfsfunktion zum Erstellen von Prop-Optionen
 *
 * @template T Der Typ der Prop
 * @param options Die Optionen für die Prop-Definition
 * @returns Ein Prop-Options-Objekt mit Typisierung für Vue
 *
 * @example
 * ```ts
 * const props = defineProps({
 *   name: propOptions<string>({
 *     type: String,
 *     required: true,
 *     validator: (value) => value.length > 0
 *   }),
 *   age: propOptions<number>({
 *     type: Number,
 *     default: 18
 *   })
 * });
 * ```
 */
export function propOptions<T>(
  options: Partial<PropType<T>> & { type?: any },
): any {
  return options;
}

/**
 * RequiredProp<T> - Hilfsfunktion für erforderliche Props
 *
 * @template T Der Typ der Prop
 * @param type Der Konstruktor für den Prop-Typ (z.B. String, Number)
 * @param validator Optional: Eine Validierungsfunktion
 * @returns Ein Prop-Options-Objekt für erforderliche Props
 *
 * @example
 * ```ts
 * const props = defineProps({
 *   name: requiredProp(String, (value) => value.length > 0),
 *   id: requiredProp(Number)
 * });
 * ```
 */
export function requiredProp<T>(
  type: PropConstructor<T> | PropConstructor<T>[],
  validator?: (value: unknown) => boolean,
): any {
  return {
    type,
    required: true,
    validator,
  };
}

/**
 * WithDefaultProp<T> - Hilfsfunktion für Props mit Standardwert
 *
 * @template T Der Typ der Prop
 * @param type Der Konstruktor für den Prop-Typ (z.B. String, Number)
 * @param defaultValue Der Standardwert
 * @param validator Optional: Eine Validierungsfunktion
 * @returns Ein Prop-Options-Objekt für Props mit Standardwert
 *
 * @example
 * ```ts
 * const props = defineProps({
 *   variant: withDefaultProp(String, 'primary'),
 *   count: withDefaultProp(Number, 0, (value) => value >= 0)
 * });
 * ```
 */
export function withDefaultProp<T>(
  type: PropConstructor<T> | PropConstructor<T>[],
  defaultValue: T | (() => T),
  validator?: (value: unknown) => boolean,
): any {
  return {
    type,
    default: defaultValue,
    validator,
  };
}

/**
 * UseComponentHookReturn<T> - Standardrückgabetyp für Komponenten-Hooks
 */
export interface UseComponentHookReturn<T> {
  /** Reaktive Referenz auf das Datenmodell */
  model: Ref<T>;

  /** Callback bei Änderungen */
  onChange: (value: T) => void;

  /** Lädt die Daten neu */
  refresh: () => Promise<void>;

  /** Setzt das Modell zurück */
  reset: () => void;

  /** Zeigt den Ladezustand an */
  loading: Ref<boolean>;

  /** Zeigt den Fehlerzustand an */
  error: Ref<string | null>;
}

/**
 * StrictComponentProps<T> - Strenge Typprüfung für Komponenten-Props
 *
 * Dieser Typ stellt sicher, dass alle erforderlichen Props vorhanden sind
 * und keine zusätzlichen Props verwendet werden.
 */
export type StrictComponentProps<T> = {
  [K in keyof T]-?: T[K];
} & {
  [key: string]: never;
};

/**
 * ComponentRenderContext - Kontext für Render-Funktionen
 */
export interface ComponentRenderContext<
  Props = {},
  Emit extends Record<string, any[]> = {},
> {
  attrs: Record<string, any>;
  slots: Record<string, SlotFn>;
  emit: EmitFn<Emit>;
  props: Props;
}

/**
 * SetupFn<Props, Emit> - Typ für die Setup-Funktion
 */
export type SetupFn<
  Props = {},
  Emit extends Record<string, any[]> = {},
  Return = any,
> = (props: Props, context: SetupContext<any>) => Return;

/**
 * UseForm<T> - Typen für Formular-Composables
 */
export interface UseForm<T> {
  values: Ref<T>;
  errors: Ref<Record<keyof T, string | null>>;
  touched: Ref<Record<keyof T, boolean>>;
  dirty: Ref<boolean>;
  isValid: ComputedRef<boolean>;
  isSubmitting: Ref<boolean>;
  handleChange: <K extends keyof T>(field: K, value: T[K]) => void;
  handleBlur: <K extends keyof T>(field: K) => void;
  handleSubmit: (e?: Event) => Promise<void>;
  resetForm: () => void;
  validateField: <K extends keyof T>(field: K) => Promise<boolean>;
  validateForm: () => Promise<boolean>;
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setFieldError: <K extends keyof T>(field: K, error: string | null) => void;
  setValues: (values: Partial<T>) => void;
  setErrors: (errors: Partial<Record<keyof T, string | null>>) => void;
}

/**
 * DynamicComponent<Props> - Typ für dynamisch geladene Komponenten
 */
export interface DynamicComponent<Props = any> {
  component: any;
  props?: Props;
  loading: boolean;
  error: Error | null;
}

/**
 * PortalTarget - Ziel für Portal-Komponenten
 */
export type PortalTarget = string | HTMLElement;

/**
 * LazyComponentOptions - Optionen für Lazy-Loading von Komponenten
 */
export interface LazyComponentOptions {
  loadingComponent?: any;
  errorComponent?: any;
  delay?: number;
  timeout?: number;
  suspensible?: boolean;
  onError?: (error: Error, retry: () => void, fail: () => void) => void;
}

/**
 * TransitionProps - Props für Übergangseffekte
 */
export interface TransitionProps {
  name?: string;
  appear?: boolean;
  mode?: "in-out" | "out-in";
  duration?: number | { enter: number; leave: number };
  enterClass?: string;
  leaveClass?: string;
  appearClass?: string;
  enterToClass?: string;
  leaveToClass?: string;
  appearToClass?: string;
  enterActiveClass?: string;
  leaveActiveClass?: string;
  appearActiveClass?: string;
}

/**
 * ComponentAction - Aktionen für Komponenten
 */
export interface ComponentAction {
  label: string;
  icon?: string;
  handler: () => void;
  disabled?: boolean;
  visible?: boolean;
  variant?: ComponentVariant;
  tooltip?: string;
  permission?: string;
}

/**
 * WithDefault<T, D> - Hilfstyp zum Erzwingen von Standardwerten
 */
export type WithDefault<T, D extends T> = T & { __defaultValue: D };

/**
 * TemplateRef<T> - Hilfsfunktion zum Erstellen typsicherer Template-Refs
 */
export function templateRef<T>(defaultValue: T | null = null): Ref<T | null> {
  return defaultValue as unknown as Ref<T | null>;
}

/**
 * FocusableElement - Typ für fokussierbare HTML-Elemente
 */
export type FocusableElement =
  | HTMLButtonElement
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement
  | HTMLAnchorElement;

/**
 * DefaultSlotProps - Standardprops für Default-Slots
 */
export interface DefaultSlotProps {
  [key: string]: any;
}

/**
 * WithClassProps - Mixin für Komponenten mit class-Prop
 */
export interface WithClassProps {
  class?: string | string[] | Record<string, boolean>;
}

/**
 * WithStyleProps - Mixin für Komponenten mit style-Prop
 */
export interface WithStyleProps {
  style?: string | Record<string, string> | Record<string, string>[];
}
