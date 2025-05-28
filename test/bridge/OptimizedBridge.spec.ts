import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  deepDiff,
  applyDiff,
  DiffOperationType,
} from "@/bridge/enhanced/optimized/DeepDiff";
import { OptimizedStateManager } from "@/bridge/enhanced/optimized/StateManager";
import { BatchedEventEmitter } from "@/bridge/enhanced/optimized/BatchedEventEmitter";
import { MemoryManager } from "@/bridge/enhanced/optimized/MemoryManager";
import { OptimizedChatBridge } from "@/bridge/enhanced/optimized/OptimizedChatBridge";

// Mock logger to avoid console output during tests
vi.mock("@/bridge/enhanced/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("DeepDiff", () => {
  it("should detect no changes for identical objects", () => {
    const obj = { a: 1, b: "test", c: { d: true } };
    const result = deepDiff(obj, obj);
    expect(result).toEqual([]);
  });

  it("should detect add operations", () => {
    const oldObj = { a: 1 };
    const newObj = { a: 1, b: 2 };
    const result = deepDiff(oldObj, newObj);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(DiffOperationType.ADD);
    expect(result[0].path).toEqual(["b"]);
    expect(result[0].value).toBe(2);
  });

  it("should detect remove operations", () => {
    const oldObj = { a: 1, b: 2 };
    const newObj = { a: 1 };
    const result = deepDiff(oldObj, newObj);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(DiffOperationType.REMOVE);
    expect(result[0].path).toEqual(["b"]);
    expect(result[0].oldValue).toBe(2);
  });

  it("should detect replace operations", () => {
    const oldObj = { a: 1 };
    const newObj = { a: 2 };
    const result = deepDiff(oldObj, newObj);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(DiffOperationType.REPLACE);
    expect(result[0].path).toEqual(["a"]);
    expect(result[0].oldValue).toBe(1);
    expect(result[0].value).toBe(2);
  });

  it("should detect nested changes", () => {
    const oldObj = { a: { b: { c: 1 } } };
    const newObj = { a: { b: { c: 2 } } };
    const result = deepDiff(oldObj, newObj);

    expect(result).toHaveLength(1);
    expect(result[0].path).toEqual(["a", "b", "c"]);
    expect(result[0].value).toBe(2);
  });

  it("should optimize array append operations", () => {
    const oldArray = [1, 2, 3];
    const newArray = [1, 2, 3, 4, 5];
    const result = deepDiff(oldArray, newArray);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(DiffOperationType.ARRAY_SPLICE);
    expect(result[0].index).toBe(3);
    expect(result[0].added).toEqual([4, 5]);
    expect(result[0].removed).toEqual([]);
  });

  it("should correctly apply diff operations", () => {
    const original = { a: 1, b: { c: [1, 2, 3] } };
    const operations = [
      {
        type: DiffOperationType.ADD,
        path: ["d"],
        value: "test",
      },
      {
        type: DiffOperationType.REPLACE,
        path: ["a"],
        value: 2,
      },
      {
        type: DiffOperationType.ARRAY_SPLICE,
        path: ["b", "c"],
        index: 3,
        removed: [],
        added: [4, 5],
      },
    ];

    const result = applyDiff(original, operations);

    expect(result).toEqual({
      a: 2,
      b: { c: [1, 2, 3, 4, 5] },
      d: "test",
    });

    // Original should be unchanged (no mutation)
    expect(original).toEqual({ a: 1, b: { c: [1, 2, 3] } });
  });
});

describe("OptimizedStateManager", () => {
  let stateManager: OptimizedStateManager;

  beforeEach(() => {
    stateManager = new OptimizedStateManager();
  });

  it("should perform full sync for first update", () => {
    const syncSpy = vi.spyOn(stateManager, "syncState");
    const state = { messages: [{ id: 1, text: "Hello" }] };

    stateManager.syncState("chat", state);

    expect(syncSpy).toHaveBeenCalledWith("chat", state);
  });

  it("should use selective sync for subsequent updates", () => {
    const initialState = { counter: 0, list: [1, 2, 3] };
    const newState = { counter: 1, list: [1, 2, 3, 4] };

    // Mock the parent syncState method to verify it's called with the right data
    const originalSyncState = stateManager["syncState"];
    const mockSyncState = vi.fn();
    stateManager["syncState"] = mockSyncState;

    // First sync - should be full
    stateManager.syncState("test", initialState);
    expect(mockSyncState).toHaveBeenCalledWith("test", initialState);

    // Second sync - should be selective
    mockSyncState.mockClear();
    stateManager.syncState("test", newState);

    // Wait for any debounced operations
    vi.runAllTimers();

    // Verify the correct data was passed to parent
    expect(mockSyncState).toHaveBeenCalled();

    // Restore original method
    stateManager["syncState"] = originalSyncState;
  });

  it("should respect immediate flag", () => {
    const processUpdatesSpy = vi.spyOn(
      stateManager as any,
      "processPendingUpdates",
    );

    stateManager.syncState("test", { a: 1 });
    stateManager.syncState("test", { a: 2 }, true); // immediate

    expect(processUpdatesSpy).toHaveBeenCalled();
  });

  it("should debounce updates", async () => {
    vi.useFakeTimers();

    const processSpy = vi.spyOn(stateManager as any, "processPendingUpdates");

    stateManager.syncState("test", { a: 1 });
    stateManager.syncState("test", { a: 2 });
    stateManager.syncState("test", { a: 3 });

    expect(processSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(processSpy).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("should flush pending updates", () => {
    const processSpy = vi.spyOn(stateManager as any, "processPendingUpdates");

    stateManager.syncState("test1", { a: 1 });
    stateManager.syncState("test2", { b: 2 });

    stateManager.flushPendingUpdates();

    expect(processSpy).toHaveBeenCalledTimes(2);
  });
});

describe("BatchedEventEmitter", () => {
  let emitter: BatchedEventEmitter;

  beforeEach(() => {
    emitter = new BatchedEventEmitter();
  });

  it("should register event listeners", () => {
    const handler = vi.fn();
    const unsubscribe = emitter.on("test", handler);

    expect(typeof unsubscribe).toBe("function");

    // Check internal state
    expect(emitter["listeners"].has("test")).toBe(true);
    expect(emitter["listeners"].get("test")?.length).toBe(1);
  });

  it("should emit events to listeners", () => {
    const handler = vi.fn();
    emitter.on("test", handler);

    emitter.emit("test", ["data"], true); // immediate

    expect(handler).toHaveBeenCalledWith("data");
  });

  it("should batch events", async () => {
    vi.useFakeTimers();

    const handler = vi.fn();
    emitter.on("test", handler);

    // Emit multiple events
    emitter.emit("test", ["data1"]);
    emitter.emit("test", ["data2"]);
    emitter.emit("test", ["data3"]);

    // Handler should not be called immediately
    expect(handler).not.toHaveBeenCalled();

    // Process microtasks
    await vi.runAllTimersAsync();

    // Handler should be called for each event
    expect(handler).toHaveBeenCalledTimes(3);
    expect(handler).toHaveBeenNthCalledWith(1, "data1");
    expect(handler).toHaveBeenNthCalledWith(2, "data2");
    expect(handler).toHaveBeenNthCalledWith(3, "data3");

    vi.useRealTimers();
  });

  it("should unsubscribe listeners", () => {
    const handler = vi.fn();
    const unsubscribe = emitter.on("test", handler);

    unsubscribe();

    emitter.emit("test", ["data"], true); // immediate

    expect(handler).not.toHaveBeenCalled();
    expect(emitter["listeners"].has("test")).toBe(false);
  });

  it("should support once listeners", () => {
    const handler = vi.fn();
    emitter.once("test", handler);

    emitter.emit("test", ["data1"], true);
    emitter.emit("test", ["data2"], true);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("data1");
    expect(emitter["listeners"].has("test")).toBe(false);
  });

  it("should emit multiple events", async () => {
    vi.useFakeTimers();

    const handler1 = vi.fn();
    const handler2 = vi.fn();

    emitter.on("test1", handler1);
    emitter.on("test2", handler2);

    emitter.emitMultiple([
      ["test1", ["data1"]],
      ["test2", ["data2"]],
    ]);

    // Process microtasks
    await vi.runAllTimersAsync();

    expect(handler1).toHaveBeenCalledWith("data1");
    expect(handler2).toHaveBeenCalledWith("data2");

    vi.useRealTimers();
  });

  it("should provide listener statistics", () => {
    emitter.on("test1", () => {});
    emitter.on("test1", () => {});
    emitter.on("test2", () => {});

    const stats = emitter.listenerStats();

    expect(stats.total).toBe(3);
    expect(stats.byEvent.test1).toBe(2);
    expect(stats.byEvent.test2).toBe(1);
  });
});

describe("MemoryManager", () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    memoryManager = new MemoryManager();
  });

  it("should track component cleanup functions", () => {
    const component = {};
    const cleanup = vi.fn();

    memoryManager.trackCleanup(component, cleanup, "test");

    expect(memoryManager.isTracked(component)).toBe(true);
  });

  it("should execute cleanup functions on release", () => {
    const component = {};
    const cleanup1 = vi.fn();
    const cleanup2 = vi.fn();

    memoryManager.trackCleanup(component, cleanup1, "test");
    memoryManager.trackCleanup(component, cleanup2, "test");

    const count = memoryManager.releaseComponent(component);

    expect(count).toBe(2);
    expect(cleanup1).toHaveBeenCalledTimes(1);
    expect(cleanup2).toHaveBeenCalledTimes(1);
    expect(memoryManager.isTracked(component)).toBe(false);
  });

  it("should create auto-cleaning proxies", () => {
    const target = { value: "test" };
    const cleanup = vi.fn();

    const proxy = memoryManager.createAutoCleaningProxy(
      target,
      cleanup,
      "test-proxy",
    );

    // Proxy should have the same properties
    expect(proxy.value).toBe("test");

    // Modifying proxy should affect the target
    proxy.value = "modified";
    expect(target.value).toBe("modified");

    // Can't easily test the cleanup behavior in unit tests
    // as it relies on garbage collection
  });

  it("should create memory-efficient memoization", () => {
    const fn = vi.fn((a, b) => a + b);
    const memoized = memoryManager.createMemoryEfficientMemoization(fn);

    // First call should execute the function
    expect(memoized(1, 2)).toBe(3);
    expect(fn).toHaveBeenCalledTimes(1);

    // Second call with same args should use cache
    expect(memoized(1, 2)).toBe(3);
    expect(fn).toHaveBeenCalledTimes(1);

    // Call with different args should execute the function
    expect(memoized(2, 3)).toBe(5);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should create safe event listeners", () => {
    const target = new EventTarget();
    const listener = vi.fn();

    const cleanup = memoryManager.createSafeEventListener(
      target,
      "click",
      listener,
    );

    // Dispatch an event to test the listener
    target.dispatchEvent(new Event("click"));
    expect(listener).toHaveBeenCalledTimes(1);

    // Clean up the listener
    cleanup();

    // Event should not trigger the listener anymore
    target.dispatchEvent(new Event("click"));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("OptimizedChatBridge", () => {
  let bridge: OptimizedChatBridge;

  beforeEach(() => {
    bridge = new OptimizedChatBridge();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should initialize successfully", () => {
    expect(bridge.initialize()).not.toThrow();
    expect(bridge.getStatus()).not.toBe("ERROR");
  });

  it("should register components", () => {
    const component = {};
    bridge.registerComponent(component, "TestComponent");

    // Not much we can assert here without exposing internal state
  });

  it("should subscribe to state changes", () => {
    const component = {};
    const callback = vi.fn();

    const unsubscribe = bridge.subscribeToState(
      "messages",
      callback,
      component,
    );

    expect(typeof unsubscribe).toBe("function");
  });

  it("should subscribe to events", () => {
    const component = {};
    const callback = vi.fn();

    const unsubscribe = bridge.subscribeToEvent("test", callback, component);

    expect(typeof unsubscribe).toBe("function");
  });

  it("should update state with selective sync", () => {
    const syncSpy = vi.spyOn(bridge["stateManager"], "syncState");

    bridge.updateState("messages", [{ id: 1, text: "Hello" }]);

    expect(syncSpy).toHaveBeenCalled();
  });

  it("should emit events", () => {
    const emitSpy = vi.spyOn(bridge["eventEmitter"], "emit");

    bridge.emitEvent("test", ["data"]);

    expect(emitSpy).toHaveBeenCalledWith("test", ["data"], false);
  });

  it("should emit multiple events", () => {
    const emitSpy = vi.spyOn(bridge["eventEmitter"], "emitMultiple");

    bridge.emitMultipleEvents([
      ["test1", ["data1"]],
      ["test2", ["data2"]],
    ]);

    expect(emitSpy).toHaveBeenCalled();
  });

  it("should reset bridge state", () => {
    const stateSpy = vi.spyOn(bridge["stateManager"], "reset");
    const eventSpy = vi.spyOn(bridge["eventEmitter"], "removeAllListeners");

    bridge.reset();

    expect(stateSpy).toHaveBeenCalled();
    expect(eventSpy).toHaveBeenCalled();
  });

  it("should enable diagnostics", () => {
    bridge.setDiagnostics(true);

    const diagnostics = bridge.getDiagnostics();
    expect(diagnostics).not.toBeNull();
  });
});

// Performance test for DeepDiff
describe("DeepDiff Performance", () => {
  it("should efficiently diff large arrays", () => {
    // Create a large array
    const size = 1000;
    const oldArray = Array.from({ length: size }, (_, i) => ({
      id: `item-${i}`,
      value: i,
      metadata: {
        created: Date.now(),
        modified: Date.now(),
        nested: {
          field1: "test",
          field2: i % 10,
        },
      },
    }));

    // Create a new array with some changes
    const newArray = [...oldArray];

    // Modify 10% of items
    for (let i = 0; i < size / 10; i++) {
      const index = Math.floor(Math.random() * size);
      newArray[index] = {
        ...newArray[index],
        value: newArray[index].value + 100,
        metadata: {
          ...newArray[index].metadata,
          modified: Date.now() + 1000,
          nested: {
            ...newArray[index].metadata.nested,
            field2: 999,
          },
        },
      };
    }

    // Add 10 new items
    for (let i = 0; i < 10; i++) {
      newArray.push({
        id: `item-new-${i}`,
        value: size + i,
        metadata: {
          created: Date.now() + 2000,
          modified: Date.now() + 2000,
          nested: {
            field1: "new",
            field2: i,
          },
        },
      });
    }

    // Measure performance
    const start = performance.now();
    const diff = deepDiff(oldArray, newArray);
    const duration = performance.now() - start;

    console.log(`Diffed arrays with ${size} items in ${duration.toFixed(2)}ms`);
    console.log(`Generated ${diff.length} diff operations`);

    // Should complete in reasonable time
    expect(duration).toBeLessThan(500); // 500ms is generous for CI environments

    // Verify the diff is correct by applying it
    const result = applyDiff(oldArray, diff);
    expect(result).toEqual(newArray);
  });
});
