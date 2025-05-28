import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UseLocalStorageReturn } from "@/utils/composableTypes";
import {
  useLocalStorage,
  LocalStorageOptions,
  LocalStorageRef,
} from "@/composables/useLocalStorage";
import { nextTick, Ref } from "vue";

/**
 * Tests für das useLocalStorage Composable mit verbesserter TypeScript-Integration
 */
describe("useLocalStorage (Enhanced TypeScript)", () => {
  /**
   * Typen für die Test-Daten
   */
  type TestUser = {
    id: string;
    name: string;
    email: string;
    preferences?: {
      theme: "light" | "dark" | "system";
      language: string;
    };
  };

  // Mock für localStorage
  let mockStorage: Record<string, string> = {};

  // Mock für console.error
  const consoleErrorSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});

  /**
   * Typisierte Test-Funktionen
   */
  // Typisierte Wrapper-Funktion für useLocalStorage mit vordefiniertem Typ
  function createUserStorage(
    key: string,
    initialValue?: TestUser | (() => TestUser),
    options?: LocalStorageOptions<TestUser>,
  ): LocalStorageRef<TestUser> {
    return useLocalStorage<TestUser>(key, initialValue, options);
  }

  beforeEach(() => {
    // Mock für Storage zurücksetzen
    mockStorage = {};

    // Mock für localStorage-Methoden
    Storage.prototype.getItem = vi.fn(
      (key: string): string | null => mockStorage[key] || null,
    );

    Storage.prototype.setItem = vi.fn((key: string, value: string): void => {
      mockStorage[key] = value;
    });

    Storage.prototype.removeItem = vi.fn((key: string): void => {
      delete mockStorage[key];
    });

    Storage.prototype.clear = vi.fn((): void => {
      mockStorage = {};
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with the default value when no stored value exists", () => {
    // Arrange
    const defaultUser: TestUser = {
      id: "default-user",
      name: "Default User",
      email: "default@example.com",
    };

    // Act
    const { value } = createUserStorage("user", defaultUser);

    // Assert
    // TypeScript erkennt value als Ref<TestUser>
    expect(value.value).toEqual(defaultUser);
    expect(localStorage.getItem).toHaveBeenCalledWith("user");
  });

  it("should use the stored value if it exists", () => {
    // Arrange
    const storedUser: TestUser = {
      id: "stored-user",
      name: "Stored User",
      email: "stored@example.com",
    };

    mockStorage["user"] = JSON.stringify(storedUser);

    // Act
    const { value } = createUserStorage("user", {
      id: "default-user",
      name: "Default User",
      email: "default@example.com",
    });

    // Assert
    expect(value.value).toEqual(storedUser);
    expect(localStorage.getItem).toHaveBeenCalledWith("user");
  });

  it("should support using a function for the initial value", () => {
    // Arrange
    const initialValueFn = (): TestUser => ({
      id: "function-user",
      name: "Function User",
      email: "function@example.com",
    });

    // Act
    const { value } = createUserStorage("user", initialValueFn);

    // Assert
    expect(value.value).toEqual(initialValueFn());
  });

  it("should update localStorage when the value changes", async () => {
    // Arrange
    const { value } = createUserStorage("user", {
      id: "user-1",
      name: "Original Name",
      email: "user@example.com",
    });

    // Act
    value.value = {
      id: "user-1",
      name: "Updated Name",
      email: "user@example.com",
    };

    // Wait for Vue reactivity to update
    await nextTick();

    // Assert
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "user",
      JSON.stringify(value.value),
    );
  });

  it("should support serialization and deserialization of complex objects", () => {
    // Arrange
    const complexUser: TestUser = {
      id: "complex-user",
      name: "Complex User",
      email: "complex@example.com",
      preferences: {
        theme: "dark",
        language: "de",
      },
    };

    // Act
    const { value } = createUserStorage("user", complexUser);

    // Assert
    expect(value.value).toEqual(complexUser);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "user",
      JSON.stringify(complexUser),
    );
  });

  it("should handle localStorage errors during reading", () => {
    // Arrange
    const getItemError = new Error("getItem error");
    Storage.prototype.getItem = vi.fn().mockImplementation(() => {
      throw getItemError;
    });

    const defaultUser: TestUser = {
      id: "default-user",
      name: "Default User",
      email: "default@example.com",
    };

    // Act
    const { value } = createUserStorage("user", defaultUser);

    // Assert
    expect(value.value).toEqual(defaultUser);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("should handle localStorage errors during writing", async () => {
    // Arrange
    const setItemError = new Error("setItem error");
    Storage.prototype.setItem = vi.fn().mockImplementation(() => {
      throw setItemError;
    });

    const { value } = createUserStorage("user", {
      id: "user-1",
      name: "Original Name",
      email: "user@example.com",
    });

    // Act
    value.value = {
      id: "user-1",
      name: "Updated Name",
      email: "user@example.com",
    };

    // Wait for Vue reactivity to update
    await nextTick();

    // Assert
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("should support custom serialization and deserialization", () => {
    // Arrange - Custom serializer, der nur die ID und den Namen speichert
    const customSerializer = (user: TestUser): string => {
      return JSON.stringify({ id: user.id, name: user.name });
    };

    // Custom deserializer, der eine Standard-E-Mail hinzufügt, wenn keine vorhanden ist
    const customDeserializer = (value: string): TestUser => {
      const parsed = JSON.parse(value);
      return {
        ...parsed,
        email: parsed.email || "default@example.com",
      };
    };

    const initialUser: TestUser = {
      id: "custom-user",
      name: "Custom User",
      email: "custom@example.com",
    };

    // Act
    const { value } = createUserStorage("user", initialUser, {
      serializer: customSerializer,
      deserializer: customDeserializer,
    });

    // Assert
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "user",
      JSON.stringify({ id: initialUser.id, name: initialUser.name }),
    );
  });

  it("should support the removeItem method", () => {
    // Arrange
    const { value, removeItem } = createUserStorage("user", {
      id: "user-to-remove",
      name: "User To Remove",
      email: "remove@example.com",
    });

    // Act
    removeItem();

    // Assert
    expect(localStorage.removeItem).toHaveBeenCalledWith("user");
    expect(value.value).toBeNull(); // Rücksetzen auf den Standardwert (null)
  });

  it("should support the setValue method", () => {
    // Arrange
    const { setValue } = createUserStorage("user", {
      id: "original-user",
      name: "Original User",
      email: "original@example.com",
    });

    const newUser: TestUser = {
      id: "new-user",
      name: "New User",
      email: "new@example.com",
    };

    // Act
    setValue(newUser);

    // Assert
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "user",
      JSON.stringify(newUser),
    );
  });

  it("should support the hasItem method", () => {
    // Arrange
    mockStorage["existing-key"] = JSON.stringify({ data: "exists" });

    const { hasItem } = createUserStorage("existing-key");
    const { hasItem: hasNonExistingItem } =
      createUserStorage("non-existing-key");

    // Act & Assert
    expect(hasItem()).toBe(true);
    expect(hasNonExistingItem()).toBe(false);
  });

  it("should handle JSON parse errors during deserialization", () => {
    // Arrange - Ungültiges JSON in localStorage
    mockStorage["invalid-json"] = "{invalid-json}";

    const defaultUser: TestUser = {
      id: "default-user",
      name: "Default User",
      email: "default@example.com",
    };

    // Act
    const { value } = createUserStorage("invalid-json", defaultUser);

    // Assert
    expect(value.value).toEqual(defaultUser);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("should apply a prefix to the storage key when provided", () => {
    // Arrange
    const prefix = "app_";
    const key = "prefixed-user";

    // Act
    const { value } = createUserStorage(
      key,
      {
        id: "prefixed-user",
        name: "Prefixed User",
        email: "prefixed@example.com",
      },
      {
        prefix,
      },
    );

    // Assert
    expect(localStorage.getItem).toHaveBeenCalledWith(`${prefix}${key}`);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      `${prefix}${key}`,
      expect.any(String),
    );
  });

  it("should support the option to not watch value changes", async () => {
    // Arrange
    const { value } = createUserStorage(
      "no-watch-user",
      {
        id: "no-watch-user",
        name: "No Watch User",
        email: "nowatch@example.com",
      },
      {
        watchValue: false,
      },
    );

    // Act - localStorage.setItem würde normalerweise aufgerufen, wenn watchValue = true
    const setItemCallCount = vi.mocked(localStorage.setItem).mock.calls.length;

    value.value = {
      id: "no-watch-user",
      name: "Updated No Watch User",
      email: "nowatch@example.com",
    };

    // Wait for Vue reactivity to update
    await nextTick();

    // Assert - localStorage.setItem sollte nicht erneut aufgerufen worden sein
    expect(vi.mocked(localStorage.setItem).mock.calls.length).toBe(
      setItemCallCount,
    );
  });

  it("should support functional updates", () => {
    // Arrange
    const initialUser: TestUser = {
      id: "functional-user",
      name: "Functional User",
      email: "functional@example.com",
    };

    const { setValue } = createUserStorage("functional-user", initialUser);

    // Act - Funktionale Aktualisierung
    setValue((prev) => ({
      ...prev,
      name: "Updated " + prev.name,
    }));

    // Assert
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "functional-user",
      expect.stringContaining("Updated Functional User"),
    );
  });

  it("should satisfy the UseLocalStorageReturn interface from composableTypes", () => {
    // Diese Typdefinition hilft zu überprüfen, ob unsere Implementierung
    // korrekt die deklarierte Schnittstelle implementiert

    // Arrange & Act
    const storage = useLocalStorage<string>("test-key", "test-value");

    // Assert through TypeScript type checking:
    // Der folgende Code würde nur kompilieren, wenn die Implementierung
    // die Schnittstelle erfüllt

    // Explizite Typzuweisung zur Überprüfung der Kompatibilität
    const typedStorage: UseLocalStorageReturn<string> = {
      value: storage.value,
      reset: storage.removeItem, // In unserer Implementierung ist reset als removeItem implementiert
      save: storage.setValue, // save ist als setValue implementiert
      load: () => storage.value.value, // load kann die aktuelle value zurückgeben
      remove: storage.removeItem,
    };

    // Stellen sicher, dass die Methoden vorhanden sind
    expect(typeof storage.value).toBe("object");
    expect(typeof storage.setValue).toBe("function");
    expect(typeof storage.removeItem).toBe("function");
    expect(typeof storage.hasItem).toBe("function");
  });
});
