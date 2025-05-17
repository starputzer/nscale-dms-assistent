import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick, ref } from "vue";
import { useClipboard } from "@/composables/useClipboard";

describe("useClipboard", () => {
  // Mock Clipboard API
  const mockWriteText = vi.fn();
  const mockReadText = vi.fn();

  // Mock execCommand for fallback
  const mockExecCommand = vi.fn();

  // Setup mocked DOM elements
  let appendChildSpy: any;
  let removeChildSpy: any;
  let mockTextArea: any;

  beforeEach(() => {
    // Reset all mocks
    mockWriteText.mockReset();
    mockReadText.mockReset();
    mockExecCommand.mockReset();

    // Default successful copy/paste
    mockWriteText.mockResolvedValue(undefined);
    mockReadText.mockResolvedValue("Clipboard content");
    mockExecCommand.mockReturnValue(true);

    // Mock navigator.clipboard
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: mockWriteText,
        readText: mockReadText,
      },
      writable: true,
      configurable: true,
    });

    // Mock document.execCommand
    document.execCommand = mockExecCommand;

    // Mock DOM methods
    mockTextArea = {
      value: "",
      style: {},
      focus: vi.fn(),
      select: vi.fn(),
    };

    appendChildSpy = vi
      .spyOn(document.body, "appendChild")
      .mockImplementation(() => {});
    removeChildSpy = vi
      .spyOn(document.body, "removeChild")
      .mockImplementation(() => {});
    vi.spyOn(document, "createElement").mockImplementation(() => mockTextArea);

    // Mock console methods
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with correct default state", () => {
    const { copied, error, text } = useClipboard();

    expect(copied.value).toBe(false);
    expect(error.value).toBeNull();
    expect(text.value).toBe("");
  });

  it("should copy text using Clipboard API when available", async () => {
    const { copy, copied, text, error } = useClipboard();
    const testText = "Test text to copy";

    await copy(testText);

    // Should have used Clipboard API
    expect(mockWriteText).toHaveBeenCalledWith(testText);

    // State should be updated
    expect(copied.value).toBe(true);
    expect(text.value).toBe(testText);
    expect(error.value).toBeNull();
  });

  it("should use fallback mechanism when Clipboard API is not available", async () => {
    // Remove Clipboard API mock
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { copy, copied, text } = useClipboard();
    const testText = "Fallback text";

    await copy(testText);

    // Should have created a textarea element
    expect(document.createElement).toHaveBeenCalledWith("textarea");

    // Should have set the text value
    expect(mockTextArea.value).toBe(testText);

    // Should have used execCommand
    expect(mockExecCommand).toHaveBeenCalledWith("copy");

    // Should have added/removed from DOM
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    // State should be updated
    expect(copied.value).toBe(true);
    expect(text.value).toBe(testText);
  });

  it("should throw error when Clipboard API fails", async () => {
    // Mock clipboard writeText to fail
    mockWriteText.mockRejectedValue(new Error("Permission denied"));

    const { copy, copied, error } = useClipboard();

    // Should throw error
    await expect(copy("Test text")).rejects.toThrow("Permission denied");

    // State should reflect failure
    expect(copied.value).toBe(false);
    expect(error.value).toBeInstanceOf(Error);
    expect(error.value?.message).toBe("Permission denied");
  });

  it("should throw error when fallback copy fails", async () => {
    // Remove Clipboard API mock
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    // Mock execCommand to fail
    mockExecCommand.mockReturnValue(false);

    const { copy, copied, error } = useClipboard();

    // Should throw error
    await expect(copy("Test text")).rejects.toThrow(
      "Failed to copy text using execCommand",
    );

    // State should reflect failure
    expect(copied.value).toBe(false);
    expect(error.value).toBeInstanceOf(Error);
    expect(error.value?.message).toBe("Failed to copy text using execCommand.");
  });

  it("should copy text from an element", async () => {
    const { copyFromElement, copied, text } = useClipboard();

    // Create mock element with text content
    const mockElement = {
      innerText: "Element inner text",
      textContent: "Should not use this",
    } as unknown as HTMLElement;

    await copyFromElement(mockElement);

    // Should use the element's innerText
    expect(mockWriteText).toHaveBeenCalledWith("Element inner text");

    // State should be updated
    expect(copied.value).toBe(true);
    expect(text.value).toBe("Element inner text");
  });

  it("should use textContent if innerText is not available", async () => {
    const { copyFromElement } = useClipboard();

    // Create mock element with only textContent
    const mockElement = {
      innerText: "",
      textContent: "Element text content",
    } as unknown as HTMLElement;

    await copyFromElement(mockElement);

    // Should use textContent as fallback
    expect(mockWriteText).toHaveBeenCalledWith("Element text content");
  });

  it("should handle empty content when copying from element", async () => {
    const { copyFromElement } = useClipboard();

    // Create mock element with no content
    const mockElement = {
      innerText: "",
      textContent: "",
    } as unknown as HTMLElement;

    await copyFromElement(mockElement);

    // Should copy empty string
    expect(mockWriteText).toHaveBeenCalledWith("");
  });

  it("should paste text from clipboard", async () => {
    const clipboardContent = "Clipboard content";
    mockReadText.mockResolvedValue(clipboardContent);

    const { paste, text } = useClipboard();

    const result = await paste();

    // Should have called readText
    expect(mockReadText).toHaveBeenCalled();

    // Should return clipboard content
    expect(result).toBe(clipboardContent);

    // Should update text state
    expect(text.value).toBe(clipboardContent);
  });

  it("should throw error when paste fails", async () => {
    // Mock clipboard readText to fail
    mockReadText.mockRejectedValue(new Error("Read permission denied"));

    const { paste, error } = useClipboard();

    // Should return empty string when failed
    const result = await paste();
    expect(result).toBe("");

    // State should reflect failure
    expect(error.value).toBeInstanceOf(Error);
    expect(error.value?.message).toBe("Read permission denied");
  });

  it("should throw error when browser does not support reading from clipboard", async () => {
    // Remove readText from Clipboard API mock
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    });

    const { paste, error } = useClipboard();

    // Should return empty string
    const result = await paste();
    expect(result).toBe("");

    // Should have error
    expect(error.value).toBeInstanceOf(Error);
    expect(error.value?.message).toBe(
      "Clipboard reading not supported in this browser.",
    );
  });

  it("should reset copy state after timeout", async () => {
    const { copy, copied } = useClipboard({ timeout: 100 });

    await copy("Test timeout");

    // Initially copied should be true
    expect(copied.value).toBe(true);

    // After timeout, copied should be false
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(copied.value).toBe(false);
  });

  it("should reset error state after timeout", async () => {
    mockWriteText.mockRejectedValue(new Error("Test error"));

    const { copy, error } = useClipboard({ timeout: 100 });

    // Copy should fail
    await expect(copy("Test error timeout")).rejects.toThrow();

    // Initially error should be set
    expect(error.value).toBeInstanceOf(Error);

    // After timeout, error should be cleared
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(error.value).toBeNull();
  });

  it("should not use timeout when timeout is set to 0", async () => {
    const { copy, copied } = useClipboard({ timeout: 0 });

    await copy("Test no timeout");

    // Copied should be true
    expect(copied.value).toBe(true);

    // Should remain true even after waiting
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(copied.value).toBe(true);
  });

  it("should reset state when reset method is called", async () => {
    const { copy, copied, error, text, reset } = useClipboard();

    // Set up some state
    await copy("Test reset");
    expect(copied.value).toBe(true);
    expect(text.value).toBe("Test reset");

    // Call reset
    reset();

    // State should be reset
    expect(copied.value).toBe(false);
    expect(error.value).toBeNull();
    // text.value doesn't get reset in the implementation
  });

  it("should handle non-Error objects in catch blocks", async () => {
    // Mock clipboard writeText to throw a string instead of an Error
    mockWriteText.mockRejectedValue("String error");

    const { copy, error } = useClipboard();

    // Should throw error
    await expect(copy("Test text")).rejects.toThrow("String error");

    // Error should be converted to Error instance
    expect(error.value).toBeInstanceOf(Error);
    expect(error.value?.message).toBe("String error");
  });

  it("should position the textarea offscreen when using fallback", async () => {
    // Remove Clipboard API mock
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { copy } = useClipboard();
    await copy("Test positioning");

    // Should have positioned the textarea offscreen
    expect(mockTextArea.style.position).toBe("fixed");
    expect(mockTextArea.style.left).toBe("-999999px");
    expect(mockTextArea.style.top).toBe("-999999px");
  });
});
