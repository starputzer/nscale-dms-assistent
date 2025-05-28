/**
 * Typdefinitionen für externe Module
 *
 * Diese Datei deklariert Typen für externe Bibliotheken und Module,
 * die keine eigenen TypeScript-Definitionen mitbringen oder bei denen
 * die vorhandenen Definitionen erweitert werden müssen.
 */

// Vue-Draggable
declare module "vuedraggable" {
  import { DefineComponent } from "vue";

  interface DraggableProps {
    modelValue?: any[];
    itemKey?: string | ((item: any) => string);
    clone?: (original: any) => any;
    tag?: string;
    componentData?: Record<string, any>;
    group?:
      | string
      | {
          name: string;
          pull?: boolean | "clone" | (() => string);
          put?: boolean | string[] | (() => boolean);
        };
    animation?: number;
    disabled?: boolean;
    ghostClass?: string;
    chosenClass?: string;
    dragClass?: string;
    filter?: string | ((event: Event) => boolean);
    draggable?: string;
    handle?: string;
    sort?: boolean;
    move?: (event: any) => boolean | undefined;
    [key: string]: any;
  }

  const component: DefineComponent<DraggableProps>;
  export default component;
}

// Date-fns
declare module "date-fns" {
  export function format(
    date: Date | number,
    format: string,
    options?: { locale?: Locale },
  ): string;
  export function formatDistanceToNow(
    date: Date | number,
    options?: { addSuffix?: boolean; locale?: Locale },
  ): string;
  export function parseISO(dateString: string): Date;
  export function isValid(date: any): boolean;
  export function differenceInDays(
    dateLeft: Date | number,
    dateRight: Date | number,
  ): number;
  export function differenceInHours(
    dateLeft: Date | number,
    dateRight: Date | number,
  ): number;
  export function differenceInMinutes(
    dateLeft: Date | number,
    dateRight: Date | number,
  ): number;
}

declare module "date-fns/locale" {
  export interface Locale {
    code: string;
    formatDistance: Function;
    formatRelative: Function;
    localize: {
      ordinalNumber: Function;
      era: Function;
      quarter: Function;
      month: Function;
      day: Function;
      dayPeriod: Function;
    };
    formatLong: {
      date: Function;
      time: Function;
      dateTime: Function;
    };
    match: {
      ordinalNumber: Function;
      era: Function;
      quarter: Function;
      month: Function;
      day: Function;
      dayPeriod: Function;
    };
    options?: {
      weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
      firstWeekContainsDate?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    };
  }

  export const de: Locale;
  export const enUS: Locale;
}

// Highlight.js
declare module "highlight.js" {
  export interface HighlightResult {
    language: string;
    relevance: number;
    value: string;
    top?: any;
    secondBest?: HighlightResult;
    illegal: boolean;
  }

  export interface HighlightOptions {
    language?: string;
    ignoreIllegals?: boolean;
  }

  export function highlight(
    code: string,
    options: HighlightOptions,
  ): HighlightResult;
  export function highlightAuto(
    code: string,
    languageSubset?: string[],
  ): HighlightResult;

  export const languages: Record<string, any>;

  interface HLJSApi {
    highlight: typeof highlight;
    highlightAuto: typeof highlightAuto;
    languages: typeof languages;
  }

  const hljs: HLJSApi;
  export default hljs;
}

// DOMPurify
declare module "dompurify" {
  export interface DOMPurifyOptions {
    ADD_ATTR?: string[];
    ADD_DATA_URI_TAGS?: string[];
    ADD_TAGS?: string[];
    ALLOW_DATA_ATTR?: boolean;
    ALLOW_UNKNOWN_PROTOCOLS?: boolean;
    ALLOWED_ATTR?: string[];
    ALLOWED_TAGS?: string[];
    ALLOWED_URI_REGEXP?: RegExp;
    FORCE_BODY?: boolean;
    FORBID_ATTR?: string[];
    FORBID_TAGS?: string[];
    KEEP_CONTENT?: boolean;
    RETURN_DOM?: boolean;
    RETURN_DOM_FRAGMENT?: boolean;
    RETURN_DOM_IMPORT?: boolean;
    RETURN_TRUSTED_TYPE?: boolean;
    SAFE_FOR_JQUERY?: boolean;
    SANITIZE_DOM?: boolean;
    USE_PROFILES?: {
      html?: boolean;
      svg?: boolean;
      svgFilters?: boolean;
      mathMl?: boolean;
    };
    WHOLE_DOCUMENT?: boolean;
  }

  export interface DOMPurify {
    sanitize(html: string | Node, options?: DOMPurifyOptions): string;
    addHook(hook: string, callback: Function): DOMPurify;
    removeHook(hook: string): DOMPurify;
    removeHooks(hook: string): DOMPurify;
    removeAllHooks(): DOMPurify;
    isValidAttribute(tag: string, attr: string, value: string): boolean;
    setConfig(cfg: DOMPurifyOptions): DOMPurify;
    clearConfig(): void;
    version: string;
  }

  const dompurify: DOMPurify;
  export default dompurify;
}

// Vuex für Legacy-Unterstützung
declare module "vuex" {
  export interface Store<S> {
    state: S;
    getters: any;
    commit(type: string, payload?: any, options?: any): void;
    dispatch(type: string, payload?: any, options?: any): Promise<any>;
    subscribe(fn: (mutation: any, state: S) => void): () => void;
    subscribeAction(fn: (action: any, state: S) => void): () => void;
    replaceState(state: S): void;
    watch<T>(
      getter: (state: S, getters: any) => T,
      cb: (newValue: T, oldValue: T) => void,
      options?: { immediate: boolean },
    ): () => void;
  }

  export function createStore<S>(options: any): Store<S>;
  export function useStore<S>(): Store<S>;
}

// Marked für Markdown-Rendering
declare module "marked" {
  export interface MarkedOptions {
    baseUrl?: string;
    breaks?: boolean;
    gfm?: boolean;
    headerIds?: boolean;
    headerPrefix?: string;
    langPrefix?: string;
    mangle?: boolean;
    pedantic?: boolean;
    sanitize?: boolean;
    sanitizer?: (html: string) => string;
    silent?: boolean;
    smartLists?: boolean;
    smartypants?: boolean;
    tokenizer?: Record<string, Function>;
    walkTokens?: (token: any) => void;
    xhtml?: boolean;
    highlight?: (
      code: string,
      lang: string,
      callback?: (error: any, result?: string) => void,
    ) => string | void;
  }

  export function marked(src: string, options?: MarkedOptions): string;
  export function parse(src: string, options?: MarkedOptions): string;
  export function parseInline(src: string, options?: MarkedOptions): string;
  export function setOptions(options: MarkedOptions): void;
}

// uuid Bibliothek
declare module "uuid" {
  export function v4(): string;
  export function v5(
    name: string,
    namespace: string | ArrayLike<number>,
  ): string;
  export function validate(uuid: string): boolean;
  export function version(uuid: string): number;
  export namespace v4 {
    function validate(uuid: string): boolean;
  }
}

// Axios für HTTP-Requests
declare module "axios" {
  export interface AxiosRequestConfig {
    url?: string;
    method?: string;
    baseURL?: string;
    headers?: Record<string, string>;
    params?: any;
    data?: any;
    timeout?: number;
    withCredentials?: boolean;
    responseType?:
      | "arraybuffer"
      | "blob"
      | "document"
      | "json"
      | "text"
      | "stream";
    validateStatus?: (status: number) => boolean;
    maxRedirects?: number;
    maxContentLength?: number;
    maxBodyLength?: number;
    proxy?: {
      host: string;
      port: number;
      auth?: {
        username: string;
        password: string;
      };
      protocol?: string;
    };
    [key: string]: any;
  }

  export interface AxiosResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    config: AxiosRequestConfig;
    request?: any;
  }

  export interface AxiosError<T = any> extends Error {
    config: AxiosRequestConfig;
    code?: string;
    request?: any;
    response?: AxiosResponse<T>;
    isAxiosError: boolean;
    toJSON: () => object;
  }

  export interface AxiosStatic {
    (config: AxiosRequestConfig): Promise<AxiosResponse>;
    (url: string, config?: AxiosRequestConfig): Promise<AxiosResponse>;
    defaults: AxiosRequestConfig;
    interceptors: {
      request: any;
      response: any;
    };
    get<T = any>(
      url: string,
      config?: AxiosRequestConfig,
    ): Promise<AxiosResponse<T>>;
    delete<T = any>(
      url: string,
      config?: AxiosRequestConfig,
    ): Promise<AxiosResponse<T>>;
    head<T = any>(
      url: string,
      config?: AxiosRequestConfig,
    ): Promise<AxiosResponse<T>>;
    options<T = any>(
      url: string,
      config?: AxiosRequestConfig,
    ): Promise<AxiosResponse<T>>;
    post<T = any>(
      url: string,
      data?: any,
      config?: AxiosRequestConfig,
    ): Promise<AxiosResponse<T>>;
    put<T = any>(
      url: string,
      data?: any,
      config?: AxiosRequestConfig,
    ): Promise<AxiosResponse<T>>;
    patch<T = any>(
      url: string,
      data?: any,
      config?: AxiosRequestConfig,
    ): Promise<AxiosResponse<T>>;
    create(config?: AxiosRequestConfig): AxiosStatic;
    CancelToken: any;
    Cancel: any;
    isCancel(value: any): boolean;
    isAxiosError(payload: any): payload is AxiosError;
    spread<T>(callback: (...args: any[]) => T): (array: any[]) => T;
    all<T>(values: Array<Promise<T>>): Promise<T[]>;
  }

  const axios: AxiosStatic;
  export default axios;
}
