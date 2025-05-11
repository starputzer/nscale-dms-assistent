import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick, ref } from "vue";
import { useLocalStorage } from "@/composables/useLocalStorage";

describe("useLocalStorage", () => {
  // Mock localStorage
  const mockGetItem = vi.fn();
  const mockSetItem = vi.fn();
  const mockRemoveItem = vi.fn();

  // Setup mock storage
  const mockStorage = {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
    length: 0,
    clear: vi.fn(),
    key: vi.fn(),
  };

  beforeEach(() => {
    // Reset all mocks
    mockGetItem.mockReset();
    mockSetItem.mockReset();
    mockRemoveItem.mockReset();

    // Mock console error
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should use the initial value when no stored value exists", () => {
    // Mock no stored value
    mockGetItem.mockReturnValue(null);

    const initialValue = "initial value";
    const { value } = useLocalStorage("test-key", initialValue, {
      storage: mockStorage,
    });

    expect(value.value).toBe(initialValue);
  });

  it("should use the stored value when it exists", () => {
    // Mock stored value
    const storedValue = JSON.stringify("stored value");
    mockGetItem.mockReturnValue(storedValue);

    const { value } = useLocalStorage("test-key", "initial value", {
      storage: mockStorage,
    });

    expect(value.value).toBe("stored value");
    expect(mockGetItem).toHaveBeenCalledWith("test-key");
  });

  it("should handle JSON parsing errors", () => {
    // Mock invalid JSON
    mockGetItem.mockReturnValue("invalid-json");

    const { value } = useLocalStorage("test-key", "initial value", {
      storage: mockStorage,
    });

    // Should fall back to initial value
    expect(value.value).toBe("initial value");
    // Should log error
    expect(console.error).toHaveBeenCalled();
  });

  it("should use prefix if provided", () => {
    mockGetItem.mockReturnValue(null);

    const prefix = "app_";
    useLocalStorage("test-key", "value", {
      storage: mockStorage,
      prefix,
    });

    expect(mockGetItem).toHaveBeenCalledWith("app_test-key");
  });

  it("should store value when changed", async () => {
    mockGetItem.mockReturnValue(null);

    const { value } = useLocalStorage("test-key", "initial", {
      storage: mockStorage,
    });

    // Update value
    value.value = "new value";
    await nextTick();

    // Should have stored the new value
    expect(mockSetItem).toHaveBeenCalledWith(
      "test-key",
      JSON.stringify("new value"),
    );
  });

  it("should handle initial value as function", () => {
    mockGetItem.mockReturnValue(null);

    const initialValueFn = () => "function result";
    const { value } = useLocalStorage("test-key", initialValueFn, {
      storage: mockStorage,
    });

    expect(value.value).toBe("function result");
  });

  it("should use default value when no initial value or stored value", () => {
    mockGetItem.mockReturnValue(null);

    const { value } = useLocalStorage("test-key", undefined, {
      storage: mockStorage,
      defaultValue: "default value",
    });

    expect(value.value).toBe("default value");
  });

  it("should not use JSON when useJSON is false", () => {
    mockGetItem.mockReturnValue("123");

    const { value } = useLocalStorage<string>("test-key", "0", {
      storage: mockStorage,
      useJSON: false,
    });

    // Should not attempt to parse JSON
    expect(value.value).toBe("123");

    // Update value
    value.value = "456";

    // Should have stored without JSON.stringify
    expect(mockSetItem).toHaveBeenCalledWith("test-key", "456");
  });

  it("should remove item from storage", () => {
    mockGetItem.mockReturnValue(JSON.stringify("stored value"));

    const { removeItem } = useLocalStorage("test-key", "initial", {
      storage: mockStorage,
    });

    removeItem();

    expect(mockRemoveItem).toHaveBeenCalledWith("test-key");
  });

  it("should handle setValue with function updater", async () => {
    mockGetItem.mockReturnValue(JSON.stringify(5));

    const { setValue } = useLocalStorage<number>("test-key", 0, {
      storage: mockStorage,
    });

    // Update with function
    setValue((prev) => prev + 10);
    await nextTick();

    // Should have stored the new value
    expect(mockSetItem).toHaveBeenCalledWith("test-key", JSON.stringify(15));
  });

  it("should handle setValue with direct value", async () => {
    mockGetItem.mockReturnValue(JSON.stringify(5));

    const { setValue } = useLocalStorage<number>("test-key", 0, {
      storage: mockStorage,
    });

    // Update with direct value
    setValue(20);
    await nextTick();

    // Should have stored the new value
    expect(mockSetItem).toHaveBeenCalledWith("test-key", JSON.stringify(20));
  });

  it("should check if item exists", () => {
    // Mock no stored value
    mockGetItem.mockReturnValue(null);

    const { hasItem } = useLocalStorage("test-key", "initial", {
      storage: mockStorage,
    });

    expect(hasItem()).toBe(false);

    // Mock stored value
    mockGetItem.mockReturnValue(JSON.stringify("stored value"));

    expect(hasItem()).toBe(true);
  });

  it("should use custom serializer and deserializer if provided", () => {
    // Mock stored value
    mockGetItem.mockReturnValue("custom format");

    // Custom serializer/deserializer
    const serializer = (value: any) => `serialized-${value}`;
    const deserializer = (value: string) => value.replace("custom ", "");

    const { value, setValue } = useLocalStorage("test-key", "initial", {
      storage: mockStorage,
      serializer,
      deserializer,
    });

    // Should use custom deserializer
    expect(value.value).toBe("format");

    // Update value
    setValue("new value");

    // Should use custom serializer
    expect(mockSetItem).toHaveBeenCalledWith(
      "test-key",
      "serialized-new value",
    );
  });

  it("should handle storage errors", () => {
    // Mock storage error
    mockGetItem.mockImplementation(() => {
      throw new Error("Storage error");
    });

    const { value } = useLocalStorage("test-key", "initial", {
      storage: mockStorage,
    });

    // Should fall back to initial value
    expect(value.value).toBe("initial");
    // Should log error
    expect(console.error).toHaveBeenCalled();
  });

  it("should not watch value changes when watchValue is false", async () => {
    mockGetItem.mockReturnValue(null);

    const { value } = useLocalStorage("test-key", "initial", {
      storage: mockStorage,
      watchValue: false,
    });

    // Initial call to set the value
    expect(mockSetItem).toHaveBeenCalledTimes(0);

    // Update value
    value.value = "new value";
    await nextTick();

    // Should not have called setItem from the watcher
    expect(mockSetItem).toHaveBeenCalledTimes(0);
  });

  it("should delete item when value is null and deleteIfNull is true", async () => {
    mockGetItem.mockReturnValue(JSON.stringify("stored value"));

    const { value } = useLocalStorage("test-key", "initial", {
      storage: mockStorage,
      deleteIfNull: true,
    });

    // Update value to null
    value.value = null as any;
    await nextTick();

    // Should have called removeItem instead of setItem
    expect(mockRemoveItem).toHaveBeenCalledWith("test-key");
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});
