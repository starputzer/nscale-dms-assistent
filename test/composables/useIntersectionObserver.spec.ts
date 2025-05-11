import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref, nextTick } from "vue";
import { useIntersectionObserver } from "@/composables/useIntersectionObserver";

describe("useIntersectionObserver", () => {
  // Mock IntersectionObserver
  const mockObserve = vi.fn();
  const mockUnobserve = vi.fn();
  const mockDisconnect = vi.fn();
  let mockIntersectionCallback: (entries: IntersectionObserverEntry[]) => void;

  beforeEach(() => {
    // Reset all mocks
    mockObserve.mockReset();
    mockUnobserve.mockReset();
    mockDisconnect.mockReset();

    // Mock the IntersectionObserver implementation
    global.IntersectionObserver = vi.fn((callback, options) => {
      mockIntersectionCallback = callback;
      return {
        observe: mockObserve,
        unobserve: mockUnobserve,
        disconnect: mockDisconnect,
        root: options?.root || null,
        rootMargin: options?.rootMargin || "0px",
        thresholds: Array.isArray(options?.threshold)
          ? options.threshold
          : [options?.threshold || 0],
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with correct default values", () => {
    const targetRef = ref<Element | null>(null);
    const { isIntersecting } = useIntersectionObserver(targetRef);

    expect(isIntersecting.value).toBe(false);
  });

  it("should observe the target element when it exists", () => {
    const targetRef = ref<Element | null>({ tagName: "DIV" } as Element);
    useIntersectionObserver(targetRef);

    expect(mockObserve).toHaveBeenCalledWith(targetRef.value);
  });

  it("should not observe if target is null", () => {
    const targetRef = ref<Element | null>(null);
    useIntersectionObserver(targetRef);

    expect(mockObserve).not.toHaveBeenCalled();
  });

  it("should update intersection state when entries change", async () => {
    const targetRef = ref<Element | null>({ tagName: "DIV" } as Element);
    const { isIntersecting } = useIntersectionObserver(targetRef);

    expect(isIntersecting.value).toBe(false);

    // Simulate intersection
    mockIntersectionCallback([
      {
        isIntersecting: true,
        target: targetRef.value,
      } as IntersectionObserverEntry,
    ]);

    await nextTick();
    expect(isIntersecting.value).toBe(true);

    // Simulate leaving intersection
    mockIntersectionCallback([
      {
        isIntersecting: false,
        target: targetRef.value,
      } as IntersectionObserverEntry,
    ]);

    await nextTick();
    expect(isIntersecting.value).toBe(false);
  });

  it("should disconnect when cleanup is called", () => {
    const targetRef = ref<Element | null>({ tagName: "DIV" } as Element);
    const { cleanup } = useIntersectionObserver(targetRef);

    cleanup();

    expect(mockUnobserve).toHaveBeenCalledWith(targetRef.value);
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("should stop observing when once option is true and element intersects", async () => {
    const targetRef = ref<Element | null>({ tagName: "DIV" } as Element);
    useIntersectionObserver(targetRef, { once: true });

    // Simulate intersection
    mockIntersectionCallback([
      {
        isIntersecting: true,
        target: targetRef.value,
      } as IntersectionObserverEntry,
    ]);

    await nextTick();

    expect(mockUnobserve).toHaveBeenCalledWith(targetRef.value);
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("should not stop observing with once:true if element does not intersect", async () => {
    const targetRef = ref<Element | null>({ tagName: "DIV" } as Element);
    useIntersectionObserver(targetRef, { once: true });

    // Simulate non-intersection
    mockIntersectionCallback([
      {
        isIntersecting: false,
        target: targetRef.value,
      } as IntersectionObserverEntry,
    ]);

    await nextTick();

    expect(mockUnobserve).not.toHaveBeenCalled();
    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it("should pass correct options to IntersectionObserver", () => {
    const targetRef = ref<Element | null>({ tagName: "DIV" } as Element);
    const options = {
      root: document.createElement("div"),
      rootMargin: "10px",
      threshold: 0.5,
    };

    useIntersectionObserver(targetRef, options);

    expect(global.IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        root: options.root,
        rootMargin: options.rootMargin,
        threshold: options.threshold,
      }),
    );
  });

  it("should expose entry information", async () => {
    const targetRef = ref<Element | null>({ tagName: "DIV" } as Element);
    const { entry } = useIntersectionObserver(targetRef);

    expect(entry.value).toBeNull();

    const mockEntry = {
      isIntersecting: true,
      target: targetRef.value,
      intersectionRatio: 0.8,
      boundingClientRect: {},
      intersectionRect: {},
      rootBounds: {},
    } as IntersectionObserverEntry;

    // Simulate intersection
    mockIntersectionCallback([mockEntry]);

    await nextTick();
    expect(entry.value).toEqual(mockEntry);
  });
});
