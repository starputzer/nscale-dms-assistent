import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useLogger } from "./useLogger";

/**
 * Vereinfachtes Route Fallback ohne DOM-Fehlererkennnung
 */
export function useBasicRouteFallback() {
  const router = useRouter();
  const logger = useLogger();
  const enabled = ref(true);

  function navigateToFallback() {
    logger.info("Navigiere zu Fallback-Route");
    router.push("/").catch((error) => {
      logger.error("Fehler bei Fallback-Navigation:", error);
    });
  }

  function disable() {
    enabled.value = false;
  }

  function enable() {
    enabled.value = true;
  }

  // Router Error Handler
  const handleRouterError = (error: Error) => {
    if (!enabled.value) return;

    logger.error("Router-Fehler:", error);

    // Nur bei echten Navigationsfehlern
    if (error.name === "NavigationDuplicated") {
      // Ignoriere duplizierte Navigation
      return;
    }

    // Bei anderen Fehlern zur Startseite navigieren
    navigateToFallback();
  };

  onMounted(() => {
    router.onError(handleRouterError);
  });

  onUnmounted(() => {
    router.onError(() => {}); // Entferne Error Handler
  });

  return {
    navigateToFallback,
    disable,
    enable,
    enabled,
  };
}
