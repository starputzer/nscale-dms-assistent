import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../../fixtures/login-utils";

test.describe("Admin User Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/users");

    // Wait for users to load
    await page.waitForSelector(".admin-users__list");
  });

  test("should display user list", async ({ page }) => {
    // User statistics should be visible
    await expect(page.locator(".admin-users__stats")).toBeVisible();

    // User table should have headers
    await expect(page.locator('th:text("Name")')).toBeVisible();
    await expect(page.locator('th:text("E-Mail")')).toBeVisible();
    await expect(page.locator('th:text("Rolle")')).toBeVisible();
    await expect(page.locator('th:text("Status")')).toBeVisible();
    await expect(page.locator('th:text("Aktionen")')).toBeVisible();

    // At least one user should be visible
    await expect(page.locator("tbody tr")).toHaveCount({ min: 1 });
  });

  test("should search users", async ({ page }) => {
    // Enter search term
    await page.fill('input[placeholder*="Suchen"]', "admin");

    // Wait for filtered results
    await page.waitForTimeout(500); // Debounce delay

    // Should show filtered users
    const userRows = page.locator("tbody tr");
    const count = await userRows.count();

    for (let i = 0; i < count; i++) {
      const rowText = await userRows.nth(i).textContent();
      expect(rowText?.toLowerCase()).toContain("admin");
    }
  });

  test("should sort users by column", async ({ page }) => {
    // Click on email column header to sort
    await page.click('th:text("E-Mail")');

    // Wait for sort to complete
    await page.waitForTimeout(300);

    // Get all email cells
    const emailCells = page.locator("td:nth-child(2)");
    const emails = await emailCells.allTextContents();

    // Check if sorted alphabetically
    const sortedEmails = [...emails].sort();
    expect(emails).toEqual(sortedEmails);
  });

  test("should open user edit dialog", async ({ page }) => {
    // Click edit button on first user
    await page.click('tbody tr:first-child button[title*="Bearbeiten"]');

    // Edit dialog should be visible
    await expect(page.locator(".user-edit-dialog")).toBeVisible();

    // Form fields should be populated
    await expect(page.locator('input[name="name"]')).toHaveValue(/.+/);
    await expect(page.locator('input[name="email"]')).toHaveValue(/.+@.+/);
  });

  test("should update user role", async ({ page }) => {
    // Click edit button on first user
    await page.click('tbody tr:first-child button[title*="Bearbeiten"]');

    // Wait for dialog
    await page.waitForSelector(".user-edit-dialog");

    // Change role
    await page.selectOption('select[name="role"]', "admin");

    // Save changes
    await page.click('button:text("Speichern")');

    // Success message should appear
    await expect(page.locator(".toast-success")).toContainText("aktualisiert");

    // Dialog should close
    await expect(page.locator(".user-edit-dialog")).toBeHidden();
  });

  test("should create new user", async ({ page }) => {
    // Click new user button
    await page.click('button:text("Neuer Benutzer")');

    // Create user dialog should appear
    await expect(page.locator(".user-create-dialog")).toBeVisible();

    // Fill out form
    await page.fill('input[name="name"]', "Test User");
    await page.fill('input[name="email"]', `test_${Date.now()}@example.com`);
    await page.fill('input[name="password"]', "testpassword123");
    await page.selectOption('select[name="role"]', "user");

    // Submit form
    await page.click('button:text("Erstellen")');

    // Success message
    await expect(page.locator(".toast-success")).toContainText("erstellt");

    // New user should appear in list
    await expect(page.locator('td:text("Test User")')).toBeVisible();
  });

  test("should validate user form", async ({ page }) => {
    // Click new user button
    await page.click('button:text("Neuer Benutzer")');

    // Try to submit empty form
    await page.click('button:text("Erstellen")');

    // Validation errors should appear
    await expect(
      page.locator('.error:text("Name ist erforderlich")'),
    ).toBeVisible();
    await expect(
      page.locator('.error:text("E-Mail ist erforderlich")'),
    ).toBeVisible();
    await expect(
      page.locator('.error:text("Passwort ist erforderlich")'),
    ).toBeVisible();

    // Enter invalid email
    await page.fill('input[name="email"]', "invalid-email");
    await page.click('button:text("Erstellen")');

    // Email validation error
    await expect(page.locator('.error:text("Ungültige E-Mail")')).toBeVisible();
  });

  test("should delete user with confirmation", async ({ page }) => {
    // Get user count before deletion
    const initialCount = await page.locator("tbody tr").count();

    // Click delete button on last user
    await page.click('tbody tr:last-child button[title*="Löschen"]');

    // Confirmation dialog should appear
    await expect(page.locator(".confirm-dialog")).toBeVisible();
    await expect(page.locator(".confirm-dialog")).toContainText(
      "wirklich löschen",
    );

    // Confirm deletion
    await page.click('button:text("Ja, löschen")');

    // Success message
    await expect(page.locator(".toast-success")).toContainText("gelöscht");

    // User count should decrease
    const finalCount = await page.locator("tbody tr").count();
    expect(finalCount).toBe(initialCount - 1);
  });

  test("should handle bulk actions", async ({ page }) => {
    // Select multiple users
    await page.check('tbody tr:nth-child(1) input[type="checkbox"]');
    await page.check('tbody tr:nth-child(2) input[type="checkbox"]');

    // Bulk actions should be visible
    await expect(page.locator(".bulk-actions")).toBeVisible();
    await expect(page.locator(".bulk-actions")).toContainText("2 ausgewählt");

    // Click bulk deactivate
    await page.click('button:text("Deaktivieren")');

    // Confirmation dialog
    await expect(page.locator(".confirm-dialog")).toContainText(
      "2 Benutzer deaktivieren",
    );

    // Confirm
    await page.click('button:text("Deaktivieren")');

    // Success message
    await expect(page.locator(".toast-success")).toContainText(
      "2 Benutzer deaktiviert",
    );
  });

  test("should export user list", async ({ page }) => {
    // Click export button
    const downloadPromise = page.waitForEvent("download");
    await page.click('button:text("Exportieren")');

    // Select export format
    await page.click('button:text("CSV")');

    // Wait for download
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toMatch(/users.*\.csv/);
  });

  test("should paginate user list", async ({ page }) => {
    // Check if pagination is visible (only if there are many users)
    const paginationExists = await page.locator(".pagination").isVisible();

    if (paginationExists) {
      // Get current page info
      const pageInfo = await page.locator(".pagination-info").textContent();
      expect(pageInfo).toMatch(/Seite \d+ von \d+/);

      // Navigate to next page
      await page.click('button[aria-label="Nächste Seite"]');

      // Page should change
      const newPageInfo = await page.locator(".pagination-info").textContent();
      expect(newPageInfo).not.toBe(pageInfo);
    }
  });

  test("should filter users by role", async ({ page }) => {
    // Select admin role filter
    await page.selectOption('select[name="roleFilter"]', "admin");

    // Wait for filter to apply
    await page.waitForTimeout(300);

    // All visible users should be admins
    const roleCells = page.locator("td:nth-child(3)");
    const roles = await roleCells.allTextContents();

    roles.forEach((role) => {
      expect(role.toLowerCase()).toContain("admin");
    });
  });

  test("should filter users by status", async ({ page }) => {
    // Select active status filter
    await page.click('button:text("Status")');
    await page.click('label:text("Aktiv")');

    // Wait for filter to apply
    await page.waitForTimeout(300);

    // All visible users should be active
    const statusCells = page.locator("td:nth-child(4)");
    const statuses = await statusCells.allTextContents();

    statuses.forEach((status) => {
      expect(status.toLowerCase()).toContain("aktiv");
    });
  });
});
