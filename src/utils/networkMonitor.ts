/**
 * Netzwerk-Überwachungs-Modul für die nscale DMS Assistant Anwendung
 * Verantwortlich für die Überwachung des Netzwerkstatus und das Auslösen von Ereignissen
 */

import { ref } from "vue";

// Status-Variablen
export const isOnline = ref(navigator.onLine);
export const connectionType = ref<string | null>(null);
export const connectionQuality = ref<"poor" | "medium" | "good" | "unknown">(
  "unknown",
);
export const lastOfflineTime = ref<number | null>(null);

// Event-Funktionen
type NetworkStatusChangeHandler = (status: boolean) => void;
const networkStatusHandlers: Set<NetworkStatusChangeHandler> = new Set();

/**
 * Registriert einen Handler für Netzwerkstatusänderungen
 */
export function onNetworkStatusChange(
  handler: NetworkStatusChangeHandler,
): () => void {
  networkStatusHandlers.add(handler);

  // Unsubscribe-Funktion zurückgeben
  return () => {
    networkStatusHandlers.delete(handler);
  };
}

/**
 * Benachrichtigt alle registrierten Handler über eine Statusänderung
 */
function notifyNetworkStatusHandlers(status: boolean): void {
  networkStatusHandlers.forEach((handler: any) => handler(status));
}

/**
 * Aktualisiert den Netzwerkstatus
 */
function updateOnlineStatus(): void {
  const wasOnline = isOnline.value;
  isOnline.value = navigator.onLine;

  // Werte speichern
  if (wasOnline && !isOnline.value) {
    lastOfflineTime.value = Date.now();
  }

  // Falls sich der Status geändert hat, Handler benachrichtigen
  if (wasOnline !== isOnline.value) {
    notifyNetworkStatusHandlers(isOnline.value);
  }
}

/**
 * Liest die Verbindungstyp-Informationen aus der Network Information API
 */
function updateConnectionInfo(): void {
  // @ts-ignore - NetworkInformation API ist noch ein experimentelles Feature
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;

  if (connection) {
    connectionType.value = connection.type || null;

    // Verbindungsqualität anhand der effektiven Bandbreite bestimmen
    if ("effectiveType" in connection) {
      switch (connection.effectiveType) {
        case "slow-2g":
        case "2g":
          connectionQuality.value = "poor";
          break;
        case "3g":
          connectionQuality.value = "medium";
          break;
        case "4g":
          connectionQuality.value = "good";
          break;
        default:
          connectionQuality.value = "unknown";
      }
    }
  }
}

/**
 * Prüft die Latenz zum Server durch Senden einer kleinen Anfrage
 * und bewertet die Verbindungsqualität
 */
async function checkLatency(): Promise<void> {
  if (!isOnline.value) return;

  try {
    const startTime = performance.now();
    const response = await fetch("/api/health", { method: "HEAD" });

    if (response.ok) {
      const latency = performance.now() - startTime;

      // Verbindungsqualität basierend auf der Latenz bewerten
      if (latency < 200) {
        connectionQuality.value = "good";
      } else if (latency < 600) {
        connectionQuality.value = "medium";
      } else {
        connectionQuality.value = "poor";
      }
    }
  } catch (error) {
    console.warn("Latenzprüfung fehlgeschlagen:", error);
  }
}

/**
 * Richtet die Netzwerküberwachung ein
 */
export function setupNetworkMonitoring(): void {
  // Initialen Status setzen
  updateOnlineStatus();
  updateConnectionInfo();

  // Event-Listener für Online-/Offline-Status
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);

  // Network Information API-Events, wenn verfügbar
  // @ts-ignore - NetworkInformation API ist noch ein experimentelles Feature
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;

  if (connection) {
    (connection as any).addEventListener("change", updateConnectionInfo);
  }

  // Regelmäßige Latenzprüfung im Hintergrund einrichten
  setInterval(checkLatency, 60000); // Jede Minute

  // Erste Latenzprüfung durchführen
  checkLatency();

  console.log("Netzwerküberwachung gestartet");
}
