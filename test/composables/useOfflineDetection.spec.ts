import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";
import { useOfflineDetection } from "@/composables/useOfflineDetection";

describe("useOfflineDetection", () => {
  // Mock navigator.onLine
  let mockOnline = true;

  // Mock addEventListener, removeEventListener
  const mockAddEventListener = vi.fn();
  const mockRemoveEventListener = vi.fn();

  // Mock fetch
  const mockFetch = vi.fn();

  // Mock setTimeout and clearTimeout
  const mockSetTimeout = vi.fn();
  const mockClearTimeout = vi.fn();

  // Mock setInterval and clearInterval
  const mockSetInterval = vi.fn().mockReturnValue(123); // Return interval ID
  const mockClearInterval = vi.fn();

  beforeEach(() => {
    // Reset all mocks
    mockAddEventListener.mockReset();
    mockRemoveEventListener.mockReset();
    mockFetch.mockReset();
    mockSetTimeout.mockReset();
    mockClearTimeout.mockReset();
    mockSetInterval.mockReset();
    mockClearInterval.mockReset();

    // Mock navigator.onLine
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => mockOnline,
    });

    // Mock window event listeners
    window.addEventListener = mockAddEventListener;
    window.removeEventListener = mockRemoveEventListener;

    // Mock fetch
    global.fetch = mockFetch;
    global.AbortController = vi.fn().mockImplementation(() => ({
      signal: {},
      abort: vi.fn(),
    }));

    // Mock timers
    global.setTimeout = mockSetTimeout;
    global.clearTimeout = mockClearTimeout;
    global.setInterval = mockSetInterval;
    global.clearInterval = mockClearInterval;

    // Default to online
    mockOnline = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with navigator.onLine value", () => {
    const { isOnline } = useOfflineDetection();

    expect(isOnline.value).toBe(true);

    // Test when offline
    mockOnline = false;
    const { isOnline: isOnline2 } = useOfflineDetection();

    expect(isOnline2.value).toBe(false);
  });

  it("should register online/offline event listeners", () => {
    useOfflineDetection();

    expect(mockAddEventListener).toHaveBeenCalledWith(
      "online",
      expect.any(Function),
    );
    expect(mockAddEventListener).toHaveBeenCalledWith(
      "offline",
      expect.any(Function),
    );
  });

  it("should remove event listeners on unmount", () => {
    const { isOnline } = useOfflineDetection();

    // Manually trigger unmount hook
    const unmountHook = vi
      .getMockContext()
      .getCalls()
      .filter((call) => call.funcName === "onUnmounted")
      .pop()?.args[0];

    if (unmountHook) {
      unmountHook();
    }

    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "online",
      expect.any(Function),
    );
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "offline",
      expect.any(Function),
    );
  });

  it("should start ping interval when enableActiveChecking is true", () => {
    useOfflineDetection({ enableActiveChecking: true });

    // Should have called fetch initially
    expect(mockFetch).toHaveBeenCalled();

    // Should have set up interval
    expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 30000); // Default interval
  });

  it("should clear ping interval on unmount", () => {
    useOfflineDetection({ enableActiveChecking: true });

    // Manually trigger unmount hook
    const unmountHook = vi
      .getMockContext()
      .getCalls()
      .filter((call) => call.funcName === "onUnmounted")
      .pop()?.args[0];

    if (unmountHook) {
      unmountHook();
    }

    expect(mockClearInterval).toHaveBeenCalledWith(123);
  });

  it("should update online status when online/offline events are triggered", async () => {
    const { isOnline } = useOfflineDetection();

    // Initial state is online
    expect(isOnline.value).toBe(true);

    // Extract event handlers
    const onlineHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "online",
    )[1];
    const offlineHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "offline",
    )[1];

    // Trigger offline event
    offlineHandler();
    await nextTick();
    expect(isOnline.value).toBe(false);

    // Trigger online event
    onlineHandler();
    await nextTick();
    expect(isOnline.value).toBe(true);
  });

  it("should call onStatusChange callback when status changes", async () => {
    const onStatusChange = vi.fn();
    useOfflineDetection({ onStatusChange });

    // Extract event handlers
    const onlineHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "online",
    )[1];
    const offlineHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "offline",
    )[1];

    // Trigger offline event
    offlineHandler();
    await nextTick();
    expect(onStatusChange).toHaveBeenCalledWith(false);

    // Trigger online event
    onlineHandler();
    await nextTick();
    expect(onStatusChange).toHaveBeenCalledWith(true);
  });

  it("should check connection actively when called", async () => {
    // Mock successful fetch
    mockFetch.mockResolvedValueOnce({ ok: true });

    const { checkConnection, isOnline } = useOfflineDetection();

    // Initial state is online
    expect(isOnline.value).toBe(true);

    // Force offline state
    isOnline.value = false;

    // Check connection
    await checkConnection();

    // Should have called fetch
    expect(mockFetch).toHaveBeenCalled();

    // Should have updated state to online
    expect(isOnline.value).toBe(true);
  });

  it("should handle network errors during active check", async () => {
    // Mock failed fetch
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { checkConnection, isOnline } = useOfflineDetection();

    // Initial state is online
    expect(isOnline.value).toBe(true);

    // Check connection
    await checkConnection();

    // Should have called fetch
    expect(mockFetch).toHaveBeenCalled();

    // Should have updated state to offline
    expect(isOnline.value).toBe(false);
  });

  it("should handle unsuccessful response during active check", async () => {
    // Mock unsuccessful response
    mockFetch.mockResolvedValueOnce({ ok: false });

    const { checkConnection, isOnline } = useOfflineDetection();

    // Initial state is online
    expect(isOnline.value).toBe(true);

    // Check connection
    await checkConnection();

    // Should have called fetch
    expect(mockFetch).toHaveBeenCalled();

    // Should have updated state to offline
    expect(isOnline.value).toBe(false);
  });

  it("should use custom ping URL if provided", async () => {
    const customPingUrl = "/api/custom-health";
    useOfflineDetection({ enableActiveChecking: true, pingUrl: customPingUrl });

    // Should have called fetch with custom URL
    expect(mockFetch).toHaveBeenCalledWith(
      customPingUrl,
      expect.objectContaining({
        method: "HEAD",
        cache: "no-store",
        signal: expect.anything(),
      }),
    );
  });

  it("should use custom ping interval if provided", () => {
    const customPingInterval = 60000; // 1 minute
    useOfflineDetection({
      enableActiveChecking: true,
      pingInterval: customPingInterval,
    });

    // Should have set up interval with custom interval
    expect(mockSetInterval).toHaveBeenCalledWith(
      expect.any(Function),
      customPingInterval,
    );
  });
});
