/**
 * Zentrale Export-Datei für alle Utility-Typen
 *
 * Diese Datei dient als zentrale Anlaufstelle für den Import aller
 * gemeinsamen Utility-Typen und -Funktionen im Projekt.
 */

// Selektive Re-Exports der wichtigsten Typen
// Vermeidet Namenskonflikte durch explizite Importe und Re-Exports

// Import und expliziter Re-Export aus './types'
import {
  FunctionType as AnyFunctionType,
  AsyncFunction as AsyncFunctionFromTypes,
  Nullable as NullableFromTypes,
  Optional as OptionalFromTypes,
  DeepPartial,
  DeepReadonly,
} from "./types";

// Expliziter Re-Export mit export type für isolatedModules
export type { DeepPartial, DeepReadonly };
export type AnyFunction = AnyFunctionType;

// Differenzierte Type-Aliase für Typen mit gleichem Namen
export type AsyncFunctionType = AsyncFunctionFromTypes;
export type NullableType<T> = NullableFromTypes<T>;
export type OptionalType<T> = OptionalFromTypes<T>;

// Import und expliziter Re-Export aus './apiTypes'
import {
  APIResponse,
  APIError,
  APIClientConfig as ApiConfigType,
  APIRequest as ApiOptionsType,
  PaginationParams as PaginationParamsFromApi,
} from "./apiTypes";

// Expliziter Re-Export mit richtigen Typnamen
export type ApiResponse = APIResponse;
export type ApiError = APIError;
export type ApiConfig = ApiConfigType;
export type ApiOptions = ApiOptionsType;

export type PaginationParamsType = PaginationParamsFromApi;

// Import und Re-Export aus './storeTypes'
import {
  StoreActions as StoreActionType,
  StoreGetters as StoreGetterType,
  StoreActions as StoreMutationType,
  StoreState,
} from "./storeTypes";

// Expliziter Re-Export mit export type
export type StoreAction = StoreActionType;
export type StoreGetter = StoreGetterType;
export type StoreMutation = StoreMutationType;
export type { StoreState };

// Import und Re-Export aus './eventTypes'
import { EventHandler as EventHandlerFromEvents } from "./eventTypes";

export type EventHandlerType = EventHandlerFromEvents<any>;

// Import und Re-Export aus './serviceTypes'
import { ServiceConfiguration as ServiceConfigType } from "./serviceTypes";
import { APIRequest } from "./apiTypes";

export type ServiceConfig = ServiceConfigType;
export type ServiceOptions = APIRequest;

// Komponenten-bezogene Typen explizit importieren
import {
  ComponentRef,
  ComponentEmits,
  ComponentSize as ComponentPropsType,
} from "./componentTypes";

// Expliziter Re-Export mit export type
export type { ComponentRef, ComponentEmits };
export type ComponentProps = ComponentPropsType;
export type ComponentSlots = Record<string, any>;
export type ComponentExpose = Record<string, any>;

// Composable-bezogene Typen explizit importieren
import { ComposableReturn, ComposableOptions } from "./composableTypes";

// Expliziter Re-Export mit export type
export type { ComposableReturn, ComposableOptions };
export type ComposableContext = Record<string, any>;

/**
 * Namespaced-Exporte für bessere Organisation
 *
 * Diese Namespaces ermöglichen einen strukturierteren Zugriff auf die
 * verschiedenen Typen im Projekt, z.B. ApiUtils.Types.ApiResponse
 */

// Importiere die Typen in separate Namespace-Einträge
import * as ApiTypesNamespace from "./apiTypes";
import * as StoreTypesNamespace from "./storeTypes";
import * as EventTypesNamespace from "./eventTypes";
import * as ServiceTypesNamespace from "./serviceTypes";
import * as ComponentTypesNamespace from "./componentTypes";
import * as ComposableTypesNamespace from "./composableTypes";

// Exportiere die Namespaces als separate Utility-Objekte
export namespace ApiUtils {
  export const Types = ApiTypesNamespace;
}

export namespace StoreUtils {
  export const Types = StoreTypesNamespace;
}

export namespace EventUtils {
  export const Types = EventTypesNamespace;
}

export namespace ServiceUtils {
  export const Types = ServiceTypesNamespace;
}

export namespace ComponentUtils {
  export const Types = ComponentTypesNamespace;
}

export namespace ComposableUtils {
  export const Types = ComposableTypesNamespace;
}
