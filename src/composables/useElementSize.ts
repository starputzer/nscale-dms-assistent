import { ref, onMounted, onBeforeUnmount, watch } from "vue";

/**
 * Composable zur reaktiven Beobachtung der Größe eines Elements
 *
 * @param elementRef - Vue-Ref des zu beobachtenden Elements
 * @returns Objekt mit reaktiven width und height Eigenschaften
 */
export function useElementSize(elementRef: any) {
  const width = ref(0);
  const height = ref(0);
  let resizeObserver: ResizeObserver | null = null;

  /**
   * Aktualisiert die Größenwerte basierend auf dem Element
   */
  const updateSize = () => {
    if (elementRef.value) {
      const rect = elementRef.value.getBoundingClientRect();
      width.value = rect.width;
      height.value = rect.height;
    }
  };

  onMounted(() => {
    updateSize();

    // ResizeObserver für dynamische Größenänderungen einrichten
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        updateSize();
      });

      if (elementRef.value) {
        resizeObserver.observe(elementRef.value);
      }
    } else {
      // Fallback für Browser ohne ResizeObserver
      window.addEventListener("resize", updateSize);
    }
  });

  onBeforeUnmount(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    } else {
      window.removeEventListener("resize", updateSize);
    }
  });

  // Beobachte Änderungen am Ref-Objekt
  watch(
    () => elementRef.value,
    (newValue) => {
      if (resizeObserver) {
        resizeObserver.disconnect();

        if (newValue) {
          resizeObserver.observe(newValue);
          updateSize();
        }
      }
    },
  );

  return { width, height, updateSize };
}
