import { ref, onMounted, onUnmounted, Ref } from "vue";

export interface IntersectionObserverOptions {
  root?: Element | Document | null;
  rootMargin?: string;
  threshold?: number | number[];
  once?: boolean;
}

/**
 * Composable to detect when an element intersects with the viewport using the Intersection Observer API
 *
 * @param targetRef - Vue ref containing the target element to observe
 * @param options - Intersection Observer options
 * @returns Object containing isIntersecting state and utilities
 *
 * @example
 * const elementRef = ref<HTMLElement | null>(null);
 * const { isIntersecting } = useIntersectionObserver(elementRef, { threshold: 0.5 });
 *
 * watch(isIntersecting, (value) => {
 *   if (value) {
 *     console.log('Element is visible in viewport');
 *   } else {
 *     console.log('Element is not visible in viewport');
 *   }
 * });
 */
export function useIntersectionObserver(
  targetRef: Ref<Element | null>,
  options: IntersectionObserverOptions = {},
) {
  const {
    root = null,
    rootMargin = "0px",
    threshold = 0,
    once = false,
  } = options;

  const isIntersecting = ref(false);
  const entry = ref<IntersectionObserverEntry | null>(null);
  let observer: IntersectionObserver | null = null;

  const cleanup = () => {
    if (observer && targetRef.value) {
      observer.unobserve(targetRef.value);
      observer.disconnect();
      observer = null;
    }
  };

  const observe = () => {
    if (!targetRef.value) return;

    cleanup();

    observer = new IntersectionObserver(
      (entries) => {
        const [firstEntry] = entries;
        entry.value = firstEntry;
        isIntersecting.value = firstEntry.isIntersecting;

        // If once is true and the element is intersecting, stop observing
        if (once && firstEntry.isIntersecting && observer) {
          cleanup();
        }
      },
      { root, rootMargin, threshold },
    );

    observer.observe(targetRef.value);
  };

  onMounted(observe);
  onUnmounted(cleanup);

  return {
    isIntersecting,
    entry,
    observe,
    cleanup,
  };
}

export default useIntersectionObserver;
