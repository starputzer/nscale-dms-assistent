import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsUser } from "../../fixtures/login-utils";

test.describe("Admin Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto("/");
  });

  test("should allow admin users to access admin panel", async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to admin panel
    await page.goto("/admin");

    // Should be on admin page
    await expect(page).toHaveURL(/.*\/admin/);

    // Admin header should be visible
    await expect(page.locator(".admin-header h1")).toContainText("Dashboard");

    // All admin tabs should be visible
    await expect(page.locator('.tab-button:text("Dashboard")')).toBeVisible();
    await expect(page.locator('.tab-button:text("Benutzer")')).toBeVisible();
    await expect(page.locator('.tab-button:text("Feedback")')).toBeVisible();
    await expect(page.locator('.tab-button:text("Nachrichten")')).toBeVisible();
    await expect(page.locator('.tab-button:text("System")')).toBeVisible();
    await expect(page.locator('.tab-button:text("Logs")')).toBeVisible();
    await expect(page.locator('.tab-button:text("Features")')).toBeVisible();
  });

  test("should redirect non-admin users to login", async ({ page }) => {
    // Try to access admin panel without authentication
    await page.goto("/admin");

    // Should be redirected to login
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page).toHaveURL(/.*redirect=.*admin/);
  });

  test("should show error for authenticated non-admin users", async ({
    page,
  }) => {
    // Login as regular user
    await loginAsUser(page);

    // Try to access admin panel
    await page.goto("/admin");

    // Should be redirected away from admin
    await expect(page).not.toHaveURL(/.*\/admin/);

    // Error toast should be visible
    await expect(page.locator(".toast-error")).toContainText(
      "keine Berechtigung",
    );
  });

  test("should navigate between admin tabs", async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);
    await page.goto("/admin");

    // Click on Users tab
    await page.click('.tab-button:text("Benutzer")');
    await expect(page.locator(".admin-content")).toContainText(
      "Benutzerverwaltung",
    );
    await expect(page.locator('.tab-button:text("Benutzer")')).toHaveClass(
      /active/,
    );

    // Click on Feedback tab
    await page.click('.tab-button:text("Feedback")');
    await expect(page.locator(".admin-content")).toContainText(
      "Feedback-Übersicht",
    );
    await expect(page.locator('.tab-button:text("Feedback")')).toHaveClass(
      /active/,
    );

    // Click on System tab
    await page.click('.tab-button:text("System")');
    await expect(page.locator(".admin-content")).toContainText(
      "Systemeinstellungen",
    );
    await expect(page.locator('.tab-button:text("System")')).toHaveClass(
      /active/,
    );
  });

  test("should handle admin session expiry", async ({ page, context }) => {
    // Login as admin
    await loginAsAdmin(page);
    await page.goto("/admin");

    // Clear auth tokens to simulate session expiry
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("refresh_token");
    });

    // Try to navigate to another admin tab
    await page.click('.tab-button:text("Benutzer")');

    // Should be redirected to login
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("should persist admin tab selection across page refresh", async ({
    page,
  }) => {
    // Login as admin
    await loginAsAdmin(page);
    await page.goto("/admin");

    // Navigate to System tab
    await page.click('.tab-button:text("System")');
    await expect(page.locator('.tab-button:text("System")')).toHaveClass(
      /active/,
    );

    // Refresh page
    await page.reload();

    // Should still be on System tab
    await expect(page.locator('.tab-button:text("System")')).toHaveClass(
      /active/,
    );
    await expect(page.locator(".admin-content")).toContainText(
      "Systemeinstellungen",
    );
  });

  test("should show loading states during data fetch", async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Navigate to admin panel with network throttling
    await page.route("**/api/admin/**", async (route) => {
      await page.waitForTimeout(1000); // Simulate slow network
      await route.continue();
    });

    await page.goto("/admin");

    // Should show loading indicator
    await expect(page.locator(".admin-loading")).toBeVisible();

    // Loading should disappear after data loads
    await expect(page.locator(".admin-loading")).toBeHidden({ timeout: 5000 });
  });

  test("should handle API errors gracefully", async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);

    // Mock API error
    await page.route("**/api/admin/stats", (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await page.goto("/admin/dashboard");

    // Should show error message
    await expect(page.locator(".error-message")).toContainText("Fehler");
  });

  test("should be responsive on mobile devices", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login as admin
    await loginAsAdmin(page);
    await page.goto("/admin");

    // Tabs should be scrollable on mobile
    const tabsContainer = page.locator(".admin-tabs");
    await expect(tabsContainer).toHaveCSS("overflow-x", "auto");

    // Admin header should be smaller on mobile
    const header = page.locator(".admin-header h1");
    const fontSize = await header.evaluate(
      (el) => window.getComputedStyle(el).fontSize,
    );
    expect(parseInt(fontSize)).toBeLessThan(32);
  });

  test("should support keyboard navigation", async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);
    await page.goto("/admin");

    // Focus on first tab
    await page.locator(".tab-button").first().focus();

    // Navigate with arrow keys
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".tab-button:nth-child(2)")).toBeFocused();

    // Activate tab with Enter
    await page.keyboard.press("Enter");
    await expect(page.locator(".tab-button:nth-child(2)")).toHaveClass(
      /active/,
    );
  });
});

test.describe("Admin Authentication Flow", () => {
  test("should show admin login prompt for protected routes", async ({
    page,
  }) => {
    // Navigate to admin without authentication
    await page.goto("/admin/users");

    // Should redirect to login with admin message
    await expect(page).toHaveURL(/.*\/login\?.*admin_required/);

    // Login form should be visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("should handle admin login with invalid credentials", async ({
    page,
  }) => {
    await page.goto("/login");

    // Try to login with invalid credentials
    await page.fill('input[type="email"]', "invalid@example.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator(".error-message")).toContainText(
      "fehlgeschlagen",
    );
  });

  test("should handle admin login with non-admin account", async ({ page }) => {
    await page.goto("/login");

    // Login as regular user
    await page.fill('input[type="email"]', "user@example.com");
    await page.fill('input[type="password"]', "userpassword");
    await page.click('button[type="submit"]');

    // Should login successfully
    await expect(page).toHaveURL(/.*\/chat/);

    // Try to access admin
    await page.goto("/admin");

    // Should be redirected
    await expect(page).not.toHaveURL(/.*\/admin/);
  });
});
