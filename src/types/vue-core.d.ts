/**
 * Core Vue types and declarations
 */

// We're using a simpler approach to avoid complex syntax errors
declare module 'vue' {
  // Re-export the basic types that are commonly needed
  export type Ref<T> = { value: T };
  export type ComputedRef<T> = { readonly value: T };
  export type PropType<T> = any;
  export type Component = any;
  export type InjectionKey<T> = Symbol;
}