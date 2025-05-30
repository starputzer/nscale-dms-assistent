/**
 * This declaration file is necessary for TypeScript to understand .vue files
 * It tells TypeScript that .vue files can be imported as modules
 */

declare module '*.vue' {
  import { defineComponent } from 'vue';
  const component: ReturnType<typeof defineComponent>;
  export default component;
}

/**
 * This adds support for importing from Vue with the @ alias
 */
declare module '@/*' {
  const content: any;
  export default content;
  export * from content;
}

/**
 * This adds support for arbitrary Vue modules
 */
declare module 'vue' {
  import { DefineComponent } from 'vue';
  const defineComponent: typeof DefineComponent;
  export { defineComponent };

  // Core Composables
  export const ref: <T>(value: T) => Ref<T>;
  export const shallowRef: <T>(value: T) => Ref<T>;
  export const computed: <T>(getter: () => T) => ComputedRef<T>;
  export const reactive: <T extends object>(target: T) => T;
  export const readonly: <T extends object>(target: T) => Readonly<T>;
  export const watch: any;
  export const watchEffect: (effect: (onCleanup: (cleanupFn: () => void) => void) => WatchStopHandle) => void;
  export const toRef: <T extends object, K extends keyof T>(object: T, key: K) => Ref<T[K]>;
  export const toRefs: <T extends object>(object: T) => { [K in keyof T]: Ref<T[K]> };
  export const unref: <T>(ref: T | Ref<T>) => T;
  export const isRef: (r: any) => r is Ref<any>;
  export const isReactive: (value: unknown) => boolean;
  export const isReadonly: (value: unknown) => boolean;
  export const markRaw: <T extends object>(value: T) => T;

  // Lifecycle Hooks
  export const onMounted: (hook: () => any) => void;
  export const onBeforeMount: (hook: () => any) => void;
  export const onBeforeUpdate: (hook: () => any) => void;
  export const onUpdated: (hook: () => any) => void;
  export const onBeforeUnmount: (hook: () => any) => void;
  export const onUnmounted: (hook: () => any) => void;
  export const onErrorCaptured: (hook: (err: unknown, instance: any, info: string) => boolean | void) => void;
  export const onActivated: (hook: () => any) => void;
  export const onDeactivated: (hook: () => any) => void;

  // Dependency Injection
  export const provide: (key: string | Symbol, value: any) => void;
  export const inject: <T>(key: string | Symbol, defaultValue?: T) => T;
  export const getCurrentInstance: () => any;

  // Utilities
  export const nextTick: (fn?: () => void) => Promise<void>;
  export const createApp: (rootComponent: Component, rootProps?: any) => App;
  export const h: any;

  // Types
  export type Component = any;
  export type ComponentPublicInstance = any;
  export type ComponentCustomProps = any;
  export type AllowedComponentProps = any;
  export type VNodeProps = any;
  export type ComputedRef<T> = { readonly value: T };
  export type WritableComputedRef<T> = { value: T };
  export type Ref<T> = { value: T };
  export type UnwrapRef<T> = T extends Ref<infer V> ? V : T;
  export type PropType<T> = { (): T } | { new(...args: any[]): T & object };
  export type ObjectDirective<T = any, V = any> = any;
  export type DirectiveBinding<V = any> = any;
  export type Plugin = any;
  export type InjectionKey<T> = Symbol & { __TYPE__: T };
  export type WatchOptions = {
    immediate?: boolean;
    deep?: boolean;
    flush?: 'pre' | 'post' | 'sync';
  };
  export type WatchSource<T = any> = Ref<T> | ComputedRef<T> | (() => T);
  export type WatchStopHandle = () => void;
  export type App = {
    use(plugin: Plugin, ...options: any[]): App;
    mount(rootContainer: Element | string): ComponentPublicInstance;
    unmount(): void;
    component(name: string, component?: Component): any;
    directive(name: string, directive?: ObjectDirective): any;
    provide(key: InjectionKey<any> | string, value: any): App;
    config: {
      globalProperties: Record<string, any>;
      errorHandler?: (err: unknown, instance: ComponentPublicInstance | null, info: string) => void;
    };
  };
  export type VNode = any;
}

/**
 * Global interface declarations
 */
interface Window {
  APP_CONFIG: {
    buildVersion: string;
    environment: string;
  };
  telemetry: {
    trackEvent: (name: string, props?: Record<string, any>) => void;
    trackError: (error: Error | unknown, props?: Record<string, any>) => void;
    trackPerformance: (name: string, duration: number, props?: Record<string, any>) => void;
  };
  isSourceReferencesVisible: (message: any) => boolean;
  toggleSourceReferences: () => void;
  getSourceReferences: () => any[];
  __sourceReferencesComposable: {
    isSourceReferencesVisible: () => boolean;
    toggleSourceReferences: () => void;
  };
}