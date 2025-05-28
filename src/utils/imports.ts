/**
 * Optimierte Imports für Tree-Shaking
 *
 * Diese Datei definiert optimierte Imports für häufig verwendete Bibliotheken,
 * um die Bundle-Größe zu reduzieren.
 */

// Lodash - nur benötigte Funktionen importieren
export { default as debounce } from "lodash-es/debounce";
export { default as throttle } from "lodash-es/throttle";
export { default as cloneDeep } from "lodash-es/cloneDeep";
export { default as merge } from "lodash-es/merge";
export { default as isEqual } from "lodash-es/isEqual";

// Date-fns - nur benötigte Funktionen
export { format } from "date-fns/format";
export { parseISO } from "date-fns/parseISO";
export { differenceInDays } from "date-fns/differenceInDays";
export { addDays } from "date-fns/addDays";
export { isBefore } from "date-fns/isBefore";
export { isAfter } from "date-fns/isAfter";
export { startOfDay } from "date-fns/startOfDay";
export { endOfDay } from "date-fns/endOfDay";

// VueUse - nur benötigte Composables
export {
  useStorage,
  useLocalStorage,
  useSessionStorage,
  useDebounce,
  useThrottleFn,
  useBreakpoints,
  useMediaQuery,
  useResizeObserver,
  useIntersectionObserver,
  useEventListener,
  useAsyncState,
  useNetwork,
  useOnline,
  useDark,
  useToggle,
  useClipboard,
  useFocus,
  useFullscreen,
  useKeyModifier,
  useMouse,
  useMouseInElement,
  useScroll,
  useScrollLock,
  useWindowScroll,
  useWindowSize,
  useDocumentVisibility,
  useIdle,
  usePageLeave,
  usePreferredDark,
  usePreferredLanguages,
  useScreenOrientation,
  useShare,
  useTextSelection,
  useTitle,
  useUrlSearchParams,
  useUserMedia,
  useVibrate,
  useWakeLock,
  useWebNotification,
  useWebWorker,
  useWebWorkerFn,
} from "@vueuse/core";

// re-export als named exports für einfacheren Zugriff
export const utils = {
  debounce,
  throttle,
  cloneDeep,
  merge,
  isEqual,
};

export const dateUtils = {
  format,
  parseISO,
  differenceInDays,
  addDays,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
};
