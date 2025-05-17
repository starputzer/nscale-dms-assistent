import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick, ref } from "vue";
import { useOfflineDetection } from "@/composables/useOfflineDetection";

/**
 * Edge-Case Tests für useOfflineDetection
 *
 * Diese Tests decken extreme Szenarien ab, wie:
 * - Verbindungen mit hoher Latenz aber technisch "online"
 * - Intermittierende Verbindungen
 * - Wechsel zwischen verschiedenen Netzwerktypen
 * - Edge Cases für den Ping-Mechanismus
 */

describe("useOfflineDetection Edge Cases", () => {
  // Mocks für XMLHttpRequest
  let xhrMock: any;
  let originalXHR: typeof XMLHttpRequest;
  let originalNavigatorOnline: boolean;
  let lastXhrInstance: any = null;
  let networkCondition: "offline" | "online" | "flaky" | "high-latency" =
    "online";

  beforeEach(() => {
    // Speichern des originalen navigator.onLine
    originalNavigatorOnline = navigator.onLine;

    // Standard XHR speichern
    originalXHR = window.XMLHttpRequest;

    // Online-Status mocken
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => networkCondition !== "offline",
      set: () => {},
    });

    // Mock für XMLHttpRequest
    xhrMock = {
      open: vi.fn(),
      send: vi.fn(),
      setRequestHeader: vi.fn(),
      readyState: 0,
      status: 0,
      statusText: "",
      response: "",
      responseText: "",
      onload: null as any,
      onerror: null as any,
      ontimeout: null as any,
      onreadystatechange: null as any,
    };

    // Mock XMLHttpRequest
    (window as any).XMLHttpRequest = vi.fn(() => {
      lastXhrInstance = { ...xhrMock };
      return lastXhrInstance;
    });

    // Mock window Event Listener
    vi.spyOn(window, "addEventListener").mockImplementation(
      (event, handler) => {
        // Speichere Handler für manuelle Simulation
        if (event === "online" || event === "offline") {
          (window as any)[`${event}Handler`] = handler;
        }
      },
    );

    vi.spyOn(window, "removeEventListener").mockImplementation(() => {});

    // Performance.now mock
    vi.spyOn(performance, "now").mockImplementation(() => Date.now());

    // Resette den Netzwerkzustand
    networkCondition = "online";

    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();

    // Originalen navigator.onLine wiederherstellen
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => originalNavigatorOnline,
      set: () => {},
    });

    // Originalen XMLHttpRequest wiederherstellen
    window.XMLHttpRequest = originalXHR;
  });

  // Hilfsfunktion zum Simulieren von Netzwerkereignissen
  function simulateNetworkEvent(eventType: "online" | "offline") {
    networkCondition = eventType === "online" ? "online" : "offline";
    const event = new Event(eventType);
    window.dispatchEvent(event);

    // Manuell den gespeicherten Handler aufrufen
    if ((window as any)[`${eventType}Handler`]) {
      (window as any)[`${eventType}Handler`](event);
    }
  }

  // Hilfsfunktion zum Simulieren von Ping-Antworten
  function simulatePingResponse(success: boolean, delay = 0) {
    // Verzögerte Antwort simulieren
    setTimeout(() => {
      if (lastXhrInstance) {
        lastXhrInstance.readyState = 4;
        lastXhrInstance.status = success ? 200 : 500;

        if (lastXhrInstance.onreadystatechange) {
          lastXhrInstance.onreadystatechange();
        }

        if (success && lastXhrInstance.onload) {
          lastXhrInstance.onload();
        } else if (!success && lastXhrInstance.onerror) {
          lastXhrInstance.onerror(new Error("Network error"));
        }
      }
    }, delay);
  }

  it("sollte mit schwankenden Verbindungen umgehen können", async () => {
    // Online zu Beginn
    networkCondition = "online";

    // Erstellen des Composable
    const onOffline = vi.fn();
    const onOnline = vi.fn();

    const { isOnline, isOffline, checkConnection, lastOnlineTime } =
      useOfflineDetection({
        pingUrl: "/api/ping",
        pingInterval: 1000, // 1s Intervall für schnelle Tests
        onOffline,
        onOnline,
      });

    // Initial sollte online sein
    expect(isOnline.value).toBe(true);
    expect(isOffline.value).toBe(false);

    // Offline gehen
    simulateNetworkEvent("offline");
    await nextTick();

    // Sollte jetzt offline sein
    expect(isOnline.value).toBe(false);
    expect(isOffline.value).toBe(true);
    expect(onOffline).toHaveBeenCalledTimes(1);

    // Online zurückkehren
    simulateNetworkEvent("online");
    await nextTick();

    // Sollte wieder online sein
    expect(isOnline.value).toBe(true);
    expect(isOffline.value).toBe(false);
    expect(onOnline).toHaveBeenCalledTimes(1);

    // Schnelle Wechsel simulieren
    for (let i = 0; i < 5; i++) {
      simulateNetworkEvent("offline");
      await nextTick();
      simulateNetworkEvent("online");
      await nextTick();
    }

    // Callbacks sollten für jeden Wechsel aufgerufen worden sein
    expect(onOffline).toHaveBeenCalledTimes(6); // 1 + 5
    expect(onOnline).toHaveBeenCalledTimes(6); // 1 + 5

    // lastOnlineTime sollte aktualisiert worden sein
    expect(lastOnlineTime.value).not.toBeNull();
  });

  it("sollte mit Verbindungen mit hoher Latenz umgehen können", async () => {
    // Erstellen des Composable mit kurzen Timeouts für den Test
    const { isOnline, isOffline, checkConnection } = useOfflineDetection({
      pingUrl: "/api/ping",
      pingInterval: 0, // Disable auto-ping for this test
      timeout: 100, // Kurzer Timeout für den Test
    });

    // Initial sollte online sein (basierend auf navigator.onLine)
    expect(isOnline.value).toBe(true);

    // Manuelle Verbindungsprüfung mit hoher Latenz
    const checkPromise = checkConnection();

    // Ping-Antwort mit hoher Latenz simulieren (länger als Timeout)
    simulatePingResponse(true, 200);

    // Das Promise sollte mit false auflösen (Timeout)
    await expect(checkPromise).resolves.toBe(false);

    // Sollte jetzt offline sein aufgrund des Timeouts
    expect(isOnline.value).toBe(false);

    // Neue Prüfung, diesmal mit Antwort innerhalb des Timeouts
    const quickCheckPromise = checkConnection();
    simulatePingResponse(true, 50);

    // Das Promise sollte mit true auflösen
    await expect(quickCheckPromise).resolves.toBe(true);

    // Sollte wieder online sein
    expect(isOnline.value).toBe(true);
  });

  it("sollte intermittierende Ping-Fehler tolerieren", async () => {
    // Erstellen des Composable
    const { isOnline, isOffline, checkConnection } = useOfflineDetection({
      pingUrl: "/api/ping",
      pingInterval: 0, // Disable auto-ping for this test
      consecutiveFailuresThreshold: 3, // Mehrere Fehler tolerieren
    });

    // Initial sollte online sein
    expect(isOnline.value).toBe(true);

    // Erster fehlgeschlagener Ping
    let checkPromise = checkConnection();
    simulatePingResponse(false, 10);
    await expect(checkPromise).resolves.toBe(false);

    // Nach einem Fehlschlag sollte es noch online sein
    expect(isOnline.value).toBe(true);

    // Zweiter fehlgeschlagener Ping
    checkPromise = checkConnection();
    simulatePingResponse(false, 10);
    await expect(checkPromise).resolves.toBe(false);

    // Nach zwei Fehlschlägen sollte es noch online sein
    expect(isOnline.value).toBe(true);

    // Dritter fehlgeschlagener Ping - sollte die Schwelle überschreiten
    checkPromise = checkConnection();
    simulatePingResponse(false, 10);
    await expect(checkPromise).resolves.toBe(false);

    // Nach drei Fehlschlägen sollte es offline gehen
    expect(isOnline.value).toBe(false);

    // Ein erfolgreicher Ping sollte es wieder online setzen
    checkPromise = checkConnection();
    simulatePingResponse(true, 10);
    await expect(checkPromise).resolves.toBe(true);

    // Sollte wieder online sein
    expect(isOnline.value).toBe(true);
  });

  it("sollte mit dem auto-ping Intervall korrekt umgehen", async () => {
    // Erstellen des Composable mit kurzem Intervall
    const pingInterval = 1000; // 1s

    const { isOnline, checkConnection } = useOfflineDetection({
      pingUrl: "/api/ping",
      pingInterval: pingInterval,
    });

    // Initial sollte online sein und noch keinen Ping gesendet haben
    expect(isOnline.value).toBe(true);
    expect(lastXhrInstance).toBeNull();

    // Zeit voranschreiten lassen
    vi.advanceTimersByTime(pingInterval + 100);

    // Nach dem Intervall sollte ein Ping gesendet worden sein
    expect(lastXhrInstance).not.toBeNull();
    expect(lastXhrInstance.open).toHaveBeenCalledWith(
      "HEAD",
      "/api/ping",
      true,
    );

    // Ping als erfolgreich simulieren
    simulatePingResponse(true, 10);

    // Sollte immer noch online sein
    expect(isOnline.value).toBe(true);

    // Zurücksetzen des XHR-Mocks für den nächsten Test
    lastXhrInstance = null;

    // Nächstes Intervall
    vi.advanceTimersByTime(pingInterval + 100);

    // Ein weiterer Ping sollte gesendet worden sein
    expect(lastXhrInstance).not.toBeNull();

    // Ping als fehlgeschlagen simulieren
    simulatePingResponse(false, 10);

    // Ein fehlgeschlagener Ping sollte noch nicht zu offline führen
    expect(isOnline.value).toBe(true);

    // Weitere Fehlschläge simulieren, um die Schwelle zu überschreiten
    lastXhrInstance = null;
    vi.advanceTimersByTime(pingInterval + 100);
    simulatePingResponse(false, 10);

    lastXhrInstance = null;
    vi.advanceTimersByTime(pingInterval + 100);
    simulatePingResponse(false, 10);

    // Nach mehreren Fehlschlägen sollte es offline gehen
    expect(isOnline.value).toBe(false);
  });

  it("sollte mit dynamischen Backend-Antworten umgehen können", async () => {
    // Erstellen des Composable
    const { isOnline, checkConnection } = useOfflineDetection({
      pingUrl: "/api/ping",
      pingInterval: 0, // Deaktiviere Auto-Ping
    });

    // Fallback-Optionen simulieren, wenn der Haupt-Ping fehlschlägt

    // Erster Versuch: Hauptendpunkt fehlgeschlagen
    let checkPromise = checkConnection();
    simulatePingResponse(false, 10);
    await expect(checkPromise).resolves.toBe(false);

    // Zweiter Versuch: Alternative URL verwenden
    lastXhrInstance = null;
    checkPromise = checkConnection("/api/health");
    simulatePingResponse(true, 10);
    await expect(checkPromise).resolves.toBe(true);

    // Sollte online sein
    expect(isOnline.value).toBe(true);

    // HTTP Codes simulieren

    // 1. HTTP 200 OK
    lastXhrInstance = null;
    checkPromise = checkConnection();
    lastXhrInstance.status = 200;
    lastXhrInstance.readyState = 4;
    lastXhrInstance.onreadystatechange && lastXhrInstance.onreadystatechange();
    lastXhrInstance.onload && lastXhrInstance.onload();
    await expect(checkPromise).resolves.toBe(true);

    // 2. HTTP 204 No Content
    lastXhrInstance = null;
    checkPromise = checkConnection();
    lastXhrInstance.status = 204;
    lastXhrInstance.readyState = 4;
    lastXhrInstance.onreadystatechange && lastXhrInstance.onreadystatechange();
    lastXhrInstance.onload && lastXhrInstance.onload();
    await expect(checkPromise).resolves.toBe(true);

    // 3. HTTP 404 Not Found
    lastXhrInstance = null;
    checkPromise = checkConnection();
    lastXhrInstance.status = 404;
    lastXhrInstance.readyState = 4;
    lastXhrInstance.onreadystatechange && lastXhrInstance.onreadystatechange();
    lastXhrInstance.onload && lastXhrInstance.onload();
    // Backend existiert, aber Endpoint nicht - sollte trotzdem als online gelten
    await expect(checkPromise).resolves.toBe(true);

    // 4. HTTP 500 Server Error
    lastXhrInstance = null;
    checkPromise = checkConnection();
    lastXhrInstance.status = 500;
    lastXhrInstance.readyState = 4;
    lastXhrInstance.onreadystatechange && lastXhrInstance.onreadystatechange();
    lastXhrInstance.onload && lastXhrInstance.onload();
    // Server-Fehler, aber erreichbar - sollte als online gelten
    await expect(checkPromise).resolves.toBe(true);
  });

  it("sollte Network Connection API verwenden, wenn verfügbar", async () => {
    // Mock der Connection API
    const connectionMock = {
      type: "4g",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    // Connection API verfügbar machen
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: connectionMock,
      writable: true,
    });

    // Erstellen des Composable
    const { isOnline, checkConnection } = useOfflineDetection({
      pingUrl: "/api/ping",
      useConnectionAPI: true,
    });

    // Sollte Event Listener für die Connection API registriert haben
    expect(connectionMock.addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );

    // Wir simulieren einen Verbindungstyp-Wechsel über die API
    const changeHandler = connectionMock.addEventListener.mock.calls[0][1];

    // Wechsel zu langsamer Verbindung
    connectionMock.type = "2g";
    changeHandler();

    // Sollte trotzdem online sein
    expect(isOnline.value).toBe(true);

    // Wechsel zu offline
    connectionMock.type = "none";
    changeHandler();

    // Sollte als offline erkannt werden
    expect(isOnline.value).toBe(false);

    // Wechsel zu WiFi
    connectionMock.type = "wifi";
    changeHandler();

    // Sollte wieder online sein
    expect(isOnline.value).toBe(true);

    // Connection API-Unterstützung entfernen
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: undefined,
      writable: true,
    });
  });

  it("sollte robust mit Geräten im Stromsparmodus umgehen", async () => {
    let isBatterySaving = false;

    // Mock der getBattery API
    Object.defineProperty(navigator, "getBattery", {
      configurable: true,
      value: () =>
        Promise.resolve({
          charging: false,
          level: 0.2, // 20%
          addEventListener: vi.fn((event, handler) => {
            if (event === "chargingchange") {
              (navigator as any).batteryChargingHandler = handler;
            }
          }),
          removeEventListener: vi.fn(),
        }),
      writable: true,
    });

    // Mock der Energiesparmodus-Erkennung
    vi.spyOn(navigator, "userAgent", "get").mockImplementation(() =>
      isBatterySaving ? "Battery Saving" : "Normal Mode",
    );

    // Erstellen des Composable mit Option für Batterieerkennung
    const { isOnline, checkConnection } = useOfflineDetection({
      pingUrl: "/api/ping",
      pingInterval: 5000, // 5s normal
      batteryAwarePingInterval: true,
    });

    // Zeit voranschreiten lassen
    vi.advanceTimersByTime(5100);

    // Ping sollte normal gesendet worden sein
    expect(lastXhrInstance).not.toBeNull();
    lastXhrInstance = null;

    // Batterie-Event simulieren - Gerät geht auf Batterie
    isBatterySaving = true;
    if ((navigator as any).batteryChargingHandler) {
      (navigator as any).batteryChargingHandler();
    }

    // Ping-Intervall sollte jetzt länger sein - Test durch Warten auf die Hälfte
    vi.advanceTimersByTime(7500); // Etwas mehr als die Hälfte von 10-15s

    // Sollte noch keinen neuen Ping gesendet haben
    expect(lastXhrInstance).toBeNull();

    // Gesamtes längeres Intervall abwarten
    vi.advanceTimersByTime(7500); // Gesamt ~15s

    // Jetzt sollte ein Ping gesendet worden sein
    expect(lastXhrInstance).not.toBeNull();
  });

  it("sollte adaptive Ping-Intervalle basierend auf Antwortzeiten implementieren", async () => {
    // Erstellen des Composable mit adaptivem Ping-Intervall
    const {
      checkConnection,
      getAdaptivePingInterval, // Extra-Methode für diesen Test
    } = useOfflineDetection({
      pingUrl: "/api/ping",
      adaptivePingInterval: true,
      minPingInterval: 1000, // 1s
      maxPingInterval: 30000, // 30s
      pingInterval: 5000, // Startintervall 5s
    });

    // Erste Ping-Antwort mit niedriger Latenz
    const lowLatencyPromise = checkConnection();
    simulatePingResponse(true, 50); // 50ms Antwort
    await lowLatencyPromise;

    // Intervall sollte sich verringern (schnelleres Netzwerk)
    const firstInterval = getAdaptivePingInterval();
    expect(firstInterval).toBeLessThan(5000);

    // Zweite Ping-Antwort mit hoher Latenz
    const highLatencyPromise = checkConnection();
    simulatePingResponse(true, 800); // 800ms Antwort (langsam)
    await highLatencyPromise;

    // Intervall sollte sich erhöhen (langsameres Netzwerk)
    const secondInterval = getAdaptivePingInterval();
    expect(secondInterval).toBeGreaterThan(firstInterval);

    // Ping-Fehler sollte zu noch längerem Intervall führen
    const errorPromise = checkConnection();
    simulatePingResponse(false, 100);
    await errorPromise;

    // Nach Fehler sollte Intervall noch länger sein
    const thirdInterval = getAdaptivePingInterval();
    expect(thirdInterval).toBeGreaterThan(secondInterval);

    // Sollte innerhalb der Min/Max-Grenzen bleiben
    expect(thirdInterval).toBeGreaterThanOrEqual(1000);
    expect(thirdInterval).toBeLessThanOrEqual(30000);
  });
});
