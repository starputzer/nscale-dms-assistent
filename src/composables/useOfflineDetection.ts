import { ref, onMounted, onUnmounted } from 'vue';

/**
 * Interface for useOfflineDetection options
 */
export interface OfflineDetectionOptions {
  /** Automatically check connection by pinging an endpoint */
  enableActiveChecking?: boolean;
  /** URL to ping to actively check connectivity, defaults to /api/health */
  pingUrl?: string;
  /** Ping interval in milliseconds, defaults to 30000 (30 seconds) */
  pingInterval?: number;
  /** Ping timeout in milliseconds, defaults to 5000 (5 seconds) */
  pingTimeout?: number;
  /** Callback when online status changes */
  onStatusChange?: (isOnline: boolean) => void;
}

/**
 * Composable to detect network status and provide online/offline indicators
 * 
 * @param options - Configuration options
 * @returns Object containing online status and utility methods
 * 
 * @example
 * const { isOnline, checkConnection } = useOfflineDetection({
 *   enableActiveChecking: true,
 *   onStatusChange: (online) => {
 *     if (!online) {
 *       toastService.warning('You are currently offline');
 *     }
 *   }
 * });
 * 
 * // Watch for online status changes
 * watch(isOnline, (online) => {
 *   if (online) {
 *     syncPendingData();
 *   }
 * });
 */
export function useOfflineDetection(options: OfflineDetectionOptions = {}) {
  const {
    enableActiveChecking = false,
    pingUrl = '/api/health',
    pingInterval = 30000,
    pingTimeout = 5000,
    onStatusChange
  } = options;
  
  // State
  const isOnline = ref(navigator.onLine);
  const isCheckingConnection = ref(false);
  const lastPingTime = ref<number | null>(null);
  const pingIntervalId = ref<number | null>(null);

  // Check connection actively by pinging the server
  const checkConnection = async () => {
    if (isCheckingConnection.value) return;

    isCheckingConnection.value = true;
    
    try {
      // Use a controller to support timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), pingTimeout);
      
      const response = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const newStatus = response.ok;
      
      // Only update if the status has changed to avoid unnecessary reactions
      if (newStatus !== isOnline.value) {
        isOnline.value = newStatus;
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
      }
      
      lastPingTime.value = Date.now();
    } catch (error) {
      // If there's a network error, we're likely offline
      if (isOnline.value) {
        isOnline.value = false;
        if (onStatusChange) {
          onStatusChange(false);
        }
      }
    } finally {
      isCheckingConnection.value = false;
    }
  };

  // Event handlers for browser's online/offline events
  const handleOnline = () => {
    isOnline.value = true;
    if (onStatusChange) {
      onStatusChange(true);
    }
    // When we go online, immediately check the connection to confirm
    if (enableActiveChecking) {
      checkConnection();
    }
  };

  const handleOffline = () => {
    isOnline.value = false;
    if (onStatusChange) {
      onStatusChange(false);
    }
  };

  // Start and stop the ping interval
  const startPingInterval = () => {
    if (enableActiveChecking && !pingIntervalId.value) {
      checkConnection(); // Initial check
      pingIntervalId.value = window.setInterval(checkConnection, pingInterval);
    }
  };

  const stopPingInterval = () => {
    if (pingIntervalId.value) {
      clearInterval(pingIntervalId.value);
      pingIntervalId.value = null;
    }
  };

  // Lifecycle hooks
  onMounted(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (enableActiveChecking) {
      startPingInterval();
    }
  });

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    stopPingInterval();
  });

  return {
    isOnline,
    isCheckingConnection,
    lastPingTime,
    checkConnection,
    startPingInterval,
    stopPingInterval
  };
}

export default useOfflineDetection;