/**
 * Composables Barrel-Export-Datei
 *
 * Diese Datei ermöglicht es, alle Composables zentral zu importieren.
 * Anstatt einzelne Importe wie `import { useA } from '@/composables/useA'`
 * und `import { useB } from '@/composables/useB'` zu verwenden, kann man
 * einfach `import { useA, useB } from '@/composables'` schreiben.
 */

// Core composables
export { useAuth } from "./useAuth";
export { useChat } from "./useChat";
export { useUI } from "./useUI";
export { useSettings } from "./useSettings";
export { useTheme } from "./useTheme";

// Dialog and UI composables
export { useDialog } from "./useDialog";
export { useToast } from "./useToast";
export { useWindowSize } from "./useWindowSize";
export { useElementSize } from "./useElementSize";
export { useFocusTrap } from "./useFocusTrap";
export { useIntersectionObserver } from "./useIntersectionObserver";
export { useClipboard } from "./useClipboard";

// Optimization composables
export { useThrottleFn } from "./useThrottleFn";
export { useMobileFocus } from "./useMobileFocus";
export { useOfflineDetection } from "./useOfflineDetection";
export { useApiCache } from "./useApiCache";

// Feature composables
export { useDocumentConverter } from "./useDocumentConverter";
export { useFeatureToggles } from "./useFeatureToggles";
export { useNScale } from "./useNScale";
export { useForm } from "./useForm";
export { useLocalStorage } from "./useLocalStorage";

// Specialized chat composables
export { useSourceReferences } from "./useSourceReferences";

// Logging and monitoring
export { useErrorReporting } from "./useErrorReporting";
export { useLogger } from "./useLogger";
export { useMonitoring } from "./useMonitoring";

// Internationalization
export { useI18n } from "./useI18n";
