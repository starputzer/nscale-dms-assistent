import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick, computed } from "vue";
import { useApiCache } from "@/composables/useApiCache";

/**
 * Edge-Case Tests für useApiCache
 *
 * Diese Tests behandeln speziell extreme Grenzfälle und ungewöhnliche Nutzungsszenarien
 * des API-Cache-Composable, einschließlich Speicherlimits, Netzwerkszenarien und
 * Datenstrukturkomplexität.
 */

// Mock für Feature-Toggle und Logger
vi.mock("@/composables/useFeatureToggles", () => ({
  useFeatureToggles: () => ({
    isFeatureEnabled: vi.fn().mockReturnValue(true),
  }),
}));

vi.mock("@/composables/useLogger", () => ({
  useLogger: () => ({
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  }),
}));

// Mock für den Online-Status
let mockIsOnline = true;
vi.mock("@/composables/useOfflineDetection", () => ({
  useOfflineDetection: () => ({
    isOnline: computed(() => mockIsOnline),
  }),
}));

describe("useApiCache Edge Cases", () => {
  // Mock localStorage
  const mockGetItem = vi.fn();
  const mockSetItem = vi.fn();
  const mockRemoveItem = vi.fn();

  let mockLocalStorageData: Record<string, string> = {};
  let mockKeys: string[] = [];

  // Setup mock storage
  const mockStorage = {
    getItem: (key: string) => mockLocalStorageData[key] || null,
    setItem: (key: string, value: string) => {
      mockLocalStorageData[key] = value;
      if (!mockKeys.includes(key)) {
        mockKeys.push(key);
      }
    },
    removeItem: (key: string) => {
      delete mockLocalStorageData[key];
      mockKeys = mockKeys.filter((k) => k !== key);
    },
    clear: () => {
      mockLocalStorageData = {};
      mockKeys = [];
    },
    key: (index: number) => mockKeys[index] || null,
    length: 0,
  };

  beforeEach(() => {
    // Reset mocks und Werte
    mockGetItem.mockReset();
    mockSetItem.mockReset();
    mockRemoveItem.mockReset();
    mockLocalStorageData = {};
    mockKeys = [];
    mockIsOnline = true;

    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: mockStorage,
      writable: true,
    });

    // Mock localStorage.length Eigenschaft
    Object.defineProperty(mockStorage, "length", {
      get: () => mockKeys.length,
    });

    // Mock für performance.now
    vi.spyOn(performance, "now").mockImplementation(() => Date.now());

    // Mock JSON.stringify für edge cases
    const originalStringify = JSON.stringify;
    vi.spyOn(JSON, "stringify").mockImplementation((value) => {
      try {
        return originalStringify(value);
      } catch (error) {
        // Bei zyklischen Strukturen: Einfache String-Repräsentation
        if (error instanceof TypeError && error.message.includes("circular")) {
          return '"[Circular Structure]"';
        }
        throw error;
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sollte mit extremen Speicherlimitierungen umgehen können", async () => {
    // Mock localStorage.setItem um "QUOTA_EXCEEDED_ERR" zu simulieren
    const errorMessage = "QUOTA_EXCEEDED_ERR: DOM Exception 22";
    let quotaErrorTriggered = false;

    vi.spyOn(localStorage, "setItem").mockImplementation((key, value) => {
      // Nach 5 Einträgen Speicherlimit simulieren
      if (mockKeys.length >= 5 && !mockKeys.includes(key)) {
        quotaErrorTriggered = true;
        throw new Error(errorMessage);
      }

      // Normale Implementierung
      mockLocalStorageData[key] = value;
      if (!mockKeys.includes(key)) {
        mockKeys.push(key);
      }
    });

    const { setCache, getCached, cache, invalidateCache } = useApiCache({
      persistToStorage: true,
      maxSize: 20, // Größeres in-memory Limit
      debug: true,
    });

    // 10 Einträge hinzufügen - einige sollten fehlschlagen
    for (let i = 0; i < 10; i++) {
      const key = `test-key-${i}`;
      const data = { id: i, value: `Test Value ${i}` };

      try {
        setCache(key, data);
      } catch (e) {
        // Fehler abfangen aber ignorieren
      }
    }

    // Sollte localStorage Fehler ausgelöst haben
    expect(quotaErrorTriggered).toBe(true);

    // Trotz localStorage-Fehler sollten in-memory Caches funktionieren
    for (let i = 0; i < 10; i++) {
      const key = `test-key-${i}`;
      const data = getCached(key);

      if (i < 5) {
        // Die ersten 5 sollten auch in localStorage sein
        expect(mockLocalStorageData[`nscale_cache_${key}`]).toBeDefined();
      } else {
        // Die letzten sollten nicht in localStorage sein
        expect(mockLocalStorageData[`nscale_cache_${key}`]).toBeUndefined();
      }

      // Aber alle sollten im Memory-Cache sein
      expect(data).toEqual({ id: i, value: `Test Value ${i}` });
    }

    // Test für LRU-Eviction
    // Weitere 15 Einträge hinzufügen, um das maxSize-Limit zu überschreiten
    for (let i = 10; i < 25; i++) {
      const key = `test-key-${i}`;
      const data = { id: i, value: `Test Value ${i}` };

      setCache(key, data);

      // Simuliere Zugriff auf frühere Einträge in umgekehrter Reihenfolge,
      // um LRU-Priorität zu ändern
      if (i % 2 === 0) {
        getCached(`test-key-${i - 5}`);
      }
    }

    // Prüfe, ob LRU-Eviction korrekt funktioniert hat
    // Einige der ältesten, am wenigsten kürzlich verwendeten Einträge sollten weg sein
    let missingCount = 0;
    for (let i = 0; i < 25; i++) {
      if (getCached(`test-key-${i}`) === null) {
        missingCount++;
      }
    }

    // Bei maxSize=20 sollten einige Einträge evicted worden sein
    expect(missingCount).toBeGreaterThan(0);
    expect(missingCount).toBeLessThanOrEqual(5); // Höchstens 5 sollten fehlen
  });

  it("sollte mit großen und komplexen Datenstrukturen umgehen können", async () => {
    const { setCache, getCached } = useApiCache({
      persistToStorage: true,
    });

    // Erstelle einen sehr großen, verschachtelten Datensatz
    const createLargeData = (depth: number, breadth: number): any => {
      if (depth <= 0) return "leaf-value";

      const result: Record<string, any> = {};

      for (let i = 0; i < breadth; i++) {
        result[`key-${i}`] = createLargeData(depth - 1, breadth);
      }

      return result;
    };

    // Große, tiefe Struktur (kann zu Stack-Problemen führen)
    const largeData = createLargeData(6, 3); // 3^6 = 729 Blätter

    // Test mit großer Datenstruktur
    setCache("large-data", largeData);

    // Sollte erfolgreich im Cache sein
    const retrieved = getCached<any>("large-data");
    expect(retrieved).toEqual(largeData);

    // Zirkuläre Referenz - ein Edge Case, der zu JSON.stringify Fehlern führen kann
    const cyclicData: any = {
      level1: {
        level2: {
          level3: {},
        },
      },
    };
    // Erstelle zirkuläre Referenz
    cyclicData.level1.level2.level3.circular = cyclicData;

    // Versuche, zirkuläre Struktur zu cachen (sollte nicht abstürzen)
    let error = null;
    try {
      setCache("cyclic-data", cyclicData);
    } catch (e) {
      error = e;
    }

    // Sollte Fehler abfangen und nicht abstürzen
    expect(error).toBeNull();
  });

  it("sollte robust mit Offline/Online-Übergang umgehen", async () => {
    // Offline-Modus aktivieren
    mockIsOnline = false;

    const { setCache, getCached, invalidateCache, cache } = useApiCache({
      persistToStorage: true,
      ignoreWhenOnline: true,
    });

    // Testdaten
    const testData = { value: "offline-data" };

    // Im Offline-Modus cachen
    setCache("offline-key", testData);

    // Sollte im Cache sein, auch offline
    expect(getCached("offline-key")).toEqual(testData);

    // Weitere Offline-Operationen
    invalidateCache("other-key"); // Sollte keine Fehler werfen

    // Online-Modus aktivieren
    mockIsOnline = true;
    await nextTick();

    // Mit ignoreWhenOnline = true sollte Cache online ignoriert werden
    expect(getCached("offline-key")).toBeNull();

    // Ein neuer Cache ohne ignoreWhenOnline
    const { setCache: setNormalCache, getCached: getNormalCache } = useApiCache(
      {
        persistToStorage: true,
        ignoreWhenOnline: false,
      },
    );

    // Daten cachen
    setNormalCache("normal-key", testData);

    // Online sollte immer noch Cache verwenden
    expect(getNormalCache("normal-key")).toEqual(testData);

    // Simuliere intermittierende Verbindung
    mockIsOnline = false;
    await nextTick();
    expect(getNormalCache("normal-key")).toEqual(testData);

    mockIsOnline = true;
    await nextTick();
    expect(getNormalCache("normal-key")).toEqual(testData);
  });

  it("sollte mit Edge Cases bei der TTL-Verwaltung umgehen können", async () => {
    vi.useFakeTimers();

    const startTime = Date.now();
    vi.setSystemTime(startTime);

    const { setCache, getCached, refreshCache } = useApiCache({
      defaultTtl: 1000, // 1 Sekunde
    });

    // Datensatz mit normaler TTL
    setCache("normal-ttl", { value: "normal" });

    // Datensatz mit sehr kurzer TTL
    setCache("short-ttl", { value: "short" }, 100); // 100ms

    // Datensatz mit extrem langer TTL
    setCache("long-ttl", { value: "long" }, 365 * 24 * 60 * 60 * 1000); // 1 Jahr

    // Datensatz mit negativer TTL (sollte als abgelaufen behandelt werden)
    setCache("negative-ttl", { value: "negative" }, -1000);

    // Datensatz mit TTL = 0 (sofort abgelaufen)
    setCache("zero-ttl", { value: "zero" }, 0);

    // Prüfe initiale Zustände
    expect(getCached("normal-ttl")).toEqual({ value: "normal" });
    expect(getCached("short-ttl")).toEqual({ value: "short" });
    expect(getCached("long-ttl")).toEqual({ value: "long" });
    expect(getCached("negative-ttl")).toBeNull(); // Sollte bereits abgelaufen sein
    expect(getCached("zero-ttl")).toBeNull(); // Sollte bereits abgelaufen sein

    // Zeit voranschreiten - 200ms (kurze TTL sollte ablaufen)
    vi.advanceTimersByTime(200);

    expect(getCached("normal-ttl")).toEqual({ value: "normal" });
    expect(getCached("short-ttl")).toBeNull(); // Abgelaufen
    expect(getCached("long-ttl")).toEqual({ value: "long" });

    // Refresh eines abgelaufenen Caches
    refreshCache("short-ttl", 2000); // 2 Sekunden neues Leben

    // Sollte immer noch null sein, da Daten fehlen
    expect(getCached("short-ttl")).toBeNull();

    // Erneutes Cachen und dann Refresh
    setCache("refresh-test", { value: "refresh" }, 500);

    // 300ms später (noch nicht abgelaufen)
    vi.advanceTimersByTime(300);

    // Refresh mit neuer TTL
    refreshCache("refresh-test", 2000);

    // Nach weiteren 600ms (500+300 = 800ms)
    vi.advanceTimersByTime(600);

    // Wäre ohne Refresh abgelaufen, mit Refresh sollte es noch leben
    expect(getCached("refresh-test")).toEqual({ value: "refresh" });

    // Cache mit extremer TTL
    setCache("infinite-like", { value: "infinite" }, Number.MAX_SAFE_INTEGER);

    // Simulation eines Jahres später
    vi.advanceTimersByTime(365 * 24 * 60 * 60 * 1000);

    // Sollte immer noch im Cache sein
    expect(getCached("infinite-like")).toEqual({ value: "infinite" });

    vi.useRealTimers();
  });

  it("sollte mit dem gleichzeitigen Hinzufügen und Invalidieren von Cache-Einträgen umgehen können", async () => {
    const { setCache, getCached, invalidateCache, invalidateCacheByPrefix } =
      useApiCache();

    // Gleichzeitige Cache-Operationen simulieren
    const operations = [
      () => setCache("concurrent-1", { value: 1 }),
      () => setCache("concurrent-2", { value: 2 }),
      () => invalidateCache("concurrent-1"),
      () => setCache("concurrent-3", { value: 3 }),
      () => invalidateCacheByPrefix("concurrent-"),
      () => setCache("concurrent-1", { value: "updated" }),
    ];

    // Gleichzeitig ausführen
    await Promise.all(operations.map((op) => Promise.resolve().then(op)));

    // Erwartetes Ergebnis nach allen Operationen
    expect(getCached("concurrent-1")).toEqual({ value: "updated" });
    expect(getCached("concurrent-2")).toBeNull(); // Sollte durch Prefix-Invalidierung gelöscht sein
    expect(getCached("concurrent-3")).toBeNull(); // Sollte durch Prefix-Invalidierung gelöscht sein
  });

  it("sollte mit korrupten localStorage-Einträgen umgehen können", async () => {
    // Manuell korrupte Daten in localStorage setzen
    Object.defineProperty(localStorage, "getItem", {
      value: (key: string) => {
        if (key === "nscale_cache_corrupted") {
          return "{invalid:json:format}"; // Syntaktisch ungültiges JSON
        }
        if (key === "nscale_cache_incomplete") {
          return '{"data":{"id":1,"partial":true'; // Unvollständiges JSON
        }
        if (key === "nscale_cache_wrong-format") {
          return '"just a string"'; // Gültiges JSON, aber falsches Format
        }
        return mockLocalStorageData[key] || null;
      },
    });

    // Setze Test-Schlüssel, damit sie auftauchen
    mockKeys = [
      "nscale_cache_corrupted",
      "nscale_cache_incomplete",
      "nscale_cache_wrong-format",
      "nscale_cache_valid",
    ];

    mockLocalStorageData["nscale_cache_valid"] = JSON.stringify({
      data: { id: 1, name: "Valid Data" },
      timestamp: Date.now(),
      expires: Date.now() + 60000,
      key: "valid",
      lastAccessed: Date.now(),
    });

    const { getCached } = useApiCache({
      persistToStorage: true,
    });

    // Sollte nicht abstürzen und null für korrupte Einträge zurückgeben
    expect(getCached("corrupted")).toBeNull();
    expect(getCached("incomplete")).toBeNull();
    expect(getCached("wrong-format")).toBeNull();

    // Valider Eintrag sollte funktionieren
    expect(getCached("valid")).toEqual({ id: 1, name: "Valid Data" });
  });

  it("sollte extreme TTL-Werte korrekt handhaben", async () => {
    vi.useFakeTimers();

    // Start mit einem bestimmten Zeitstempel
    const startTime = new Date("2025-01-01").getTime();
    vi.setSystemTime(startTime);

    const { setCache, getCached } = useApiCache();

    // Sehr kleine TTL-Werte
    setCache("tiny-ttl", { value: "tiny" }, 1); // 1ms

    // Fast sofort verfallen
    vi.advanceTimersByTime(2);
    expect(getCached("tiny-ttl")).toBeNull();

    // Extreme große Werte (Jahrzehnte)
    const decadeInMs = 10 * 365 * 24 * 60 * 60 * 1000;
    setCache("decade-ttl", { value: "decade" }, decadeInMs);

    // Ein Jahr später...
    vi.advanceTimersByTime(365 * 24 * 60 * 60 * 1000);
    expect(getCached("decade-ttl")).toEqual({ value: "decade" });

    // Java-Integer-MAX (in JavaScript kein Problem, aber könnte in API vorkommen)
    setCache("java-max", { value: "java-max" }, 2147483647);
    vi.advanceTimersByTime(1000000000); // 1 Milliarde ms später
    expect(getCached("java-max")).toEqual({ value: "java-max" });

    vi.useRealTimers();
  });
});
