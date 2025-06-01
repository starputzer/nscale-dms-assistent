import { test, expect } from "@playwright/test";

test.describe("Chat Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/");
    await page.fill(
      'input[type="text"]',
      process.env.TEST_USERNAME || "test_user",
    );
    await page.fill(
      'input[type="password"]',
      process.env.TEST_PASSWORD || "test_password",
    );
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("/chat");
  });

  test("should display chat interface", async ({ page }) => {
    await expect(page.locator(".chat-container")).toBeVisible();
    await expect(page.locator(".message-list")).toBeVisible();
    await expect(page.locator(".message-input")).toBeVisible();
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible();
  });

  test("should create a new chat session", async ({ page }) => {
    await page.locator('[data-testid="new-session-button"]').click();
    await expect(page.locator(".session-item.active")).toBeVisible();
  });

  test("should send a message", async ({ page }) => {
    const message = "Hello, this is a test message!";

    await page.locator(".message-input textarea").fill(message);
    await page.locator('[data-testid="send-button"]').click();

    // Wait for message to appear in list
    await expect(page.locator(".message-item").last()).toContainText(message);

    // Wait for AI response
    await expect(page.locator(".message-item.ai-message")).toBeVisible({
      timeout: 30000,
    });
  });

  test("should send message with Enter key", async ({ page }) => {
    const message = "Message sent with Enter key";

    await page.locator(".message-input textarea").fill(message);
    await page.keyboard.press("Enter");

    await expect(page.locator(".message-item").last()).toContainText(message);
  });

  test("should preserve multiline with Shift+Enter", async ({ page }) => {
    const textarea = page.locator(".message-input textarea");

    await textarea.fill("Line 1");
    await page.keyboard.down("Shift");
    await page.keyboard.press("Enter");
    await page.keyboard.up("Shift");
    await textarea.type("Line 2");

    const value = await textarea.inputValue();
    expect(value).toContain("Line 1\nLine 2");
  });

  test("should show typing indicator while AI responds", async ({ page }) => {
    await page
      .locator(".message-input textarea")
      .fill("Test message for typing indicator");
    await page.locator('[data-testid="send-button"]').click();

    // Check for typing indicator
    await expect(page.locator(".typing-indicator")).toBeVisible();

    // Wait for it to disappear after response
    await expect(page.locator(".typing-indicator")).not.toBeVisible({
      timeout: 30000,
    });
  });

  test("should switch between chat sessions", async ({ page }) => {
    // Create first session and send message
    await page.locator('[data-testid="new-session-button"]').click();
    await page.locator(".message-input textarea").fill("First session message");
    await page.locator('[data-testid="send-button"]').click();

    // Create second session and send message
    await page.locator('[data-testid="new-session-button"]').click();
    await page
      .locator(".message-input textarea")
      .fill("Second session message");
    await page.locator('[data-testid="send-button"]').click();

    // Switch back to first session
    await page.locator(".session-item").first().click();

    // Verify we see the first session's message
    await expect(page.locator(".message-item")).toContainText(
      "First session message",
    );
  });

  test("should delete a chat session", async ({ page }) => {
    // Create a new session
    await page.locator('[data-testid="new-session-button"]').click();

    // Delete the session
    await page.locator(".session-item").hover();
    await page.locator('[data-testid="delete-session-button"]').click();

    // Confirm deletion
    await page.locator('[data-testid="confirm-delete"]').click();

    // Verify session is removed
    await expect(page.locator(".session-item")).toHaveCount(0);
  });

  test("should handle message streaming", async ({ page }) => {
    await page.locator(".message-input textarea").fill("Tell me a story");
    await page.locator('[data-testid="send-button"]').click();

    // Wait for streaming to start
    await page.waitForSelector(".message-item.ai-message");

    // Get initial content
    const initialContent = await page
      .locator(".message-item.ai-message")
      .last()
      .textContent();

    // Wait a bit for more content to stream
    await page.waitForTimeout(1000);

    // Get updated content
    const updatedContent = await page
      .locator(".message-item.ai-message")
      .last()
      .textContent();

    // Verify content is streaming (getting longer)
    expect(updatedContent!.length).toBeGreaterThan(initialContent!.length);
  });

  test("should provide feedback on messages", async ({ page }) => {
    // Send a message
    await page
      .locator(".message-input textarea")
      .fill("Test message for feedback");
    await page.locator('[data-testid="send-button"]').click();

    // Wait for AI response
    await page.waitForSelector(".message-item.ai-message");

    // Click feedback button
    await page.locator(".message-item.ai-message").last().hover();
    await page.locator('[data-testid="feedback-button"]').click();

    // Submit feedback
    await page.locator('[data-testid="feedback-rating-positive"]').click();
    await page
      .locator('[data-testid="feedback-comment"]')
      .fill("Good response!");
    await page.locator('[data-testid="submit-feedback"]').click();

    // Verify feedback was submitted
    await expect(page.locator(".feedback-success")).toBeVisible();
  });
});
