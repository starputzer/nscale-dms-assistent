/**
 * Visual Regression Tests für kritische UI-Komponenten.
 */
import { test, expect } from "@playwright/test";

// Tests mit vorgefertigten Authentifizierungsdaten ausführen
test.describe("Visual Regression Tests", () => {
  // Bestehende Authentifizierungsdaten für jeden Test verwenden
  test.use({ storageState: "./e2e/fixtures/user-auth.json" });

  // Screenshot-Vergleich für die Hauptseite
  test("Hauptseite sollte visuell konsistent sein", async ({ page }) => {
    await page.goto("/");

    // Warten, bis die Seite vollständig geladen ist
    await page.waitForLoadState("networkidle");

    // Screenshot erstellen und mit Baseline vergleichen
    await expect(page).toHaveScreenshot("homepage.png");
  });

  // Screenshot-Vergleich für die Chat-Oberfläche
  test("Chat-Oberfläche sollte visuell konsistent sein", async ({ page }) => {
    await page.goto("/");

    // Warten, bis die Seite vollständig geladen ist
    await page.waitForLoadState("networkidle");

    // Screenshot der Chat-Komponente erstellen und mit Baseline vergleichen
    await expect(page.locator(".chat-container")).toHaveScreenshot(
      "chat-container.png",
    );
  });

  // Screenshot-Vergleich für die Session-Liste
  test("Session-Liste sollte visuell konsistent sein", async ({ page }) => {
    await page.goto("/");

    // Warten, bis die Seite vollständig geladen ist
    await page.waitForLoadState("networkidle");

    // Screenshot der Session-Liste erstellen und mit Baseline vergleichen
    await expect(page.locator(".session-list")).toHaveScreenshot(
      "session-list.png",
    );
  });

  // Screenshot-Vergleich für die Dokumentenkonverter-Oberfläche
  test("Dokumentenkonverter-Oberfläche sollte visuell konsistent sein", async ({
    page,
  }) => {
    await page.goto("/document-converter");

    // Warten, bis die Seite vollständig geladen ist
    await page.waitForLoadState("networkidle");

    // Screenshot erstellen und mit Baseline vergleichen
    await expect(page).toHaveScreenshot("document-converter.png");
  });

  // Screenshot-Vergleich für die Admin-Panel-Oberfläche
  test("Admin-Panel-Oberfläche sollte visuell konsistent sein", async ({
    page,
  }) => {
    // Administrator-Anmeldedaten verwenden
    await page
      .context()
      .storageState({ path: "./e2e/fixtures/admin-auth.json" });
    await page.goto("/");

    // Admin-Panel öffnen
    await page.click('button[aria-label="Admin"]');

    // Warten, bis das Admin-Panel vollständig geladen ist
    await page.waitForSelector(".admin-panel", { state: "visible" });

    // Screenshot erstellen und mit Baseline vergleichen
    await expect(page.locator(".admin-panel")).toHaveScreenshot(
      "admin-panel.png",
    );
  });

  // Screenshot-Vergleich für verschiedene Themes
  test("Dark Mode sollte korrekt angewendet werden", async ({ page }) => {
    await page.goto("/");

    // Warten, bis die Seite vollständig geladen ist
    await page.waitForLoadState("networkidle");

    // Light Mode Screenshot erstellen
    await expect(page).toHaveScreenshot("light-mode.png");

    // In den Dark Mode wechseln
    await page.click('button[aria-label="Theme wechseln"]');

    // Warten, bis das Theme angewendet wurde
    await page.waitForSelector('body[data-theme="dark"]');

    // Dark Mode Screenshot erstellen
    await expect(page).toHaveScreenshot("dark-mode.png");
  });

  // Screenshot-Vergleich für verschiedene Viewport-Größen
  test("Responsive Design sollte korrekt funktionieren", async ({ page }) => {
    // Desktop Screenshot
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("desktop-view.png");

    // Tablet Screenshot
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("tablet-view.png");

    // Mobile Screenshot
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("mobile-view.png");
  });
});
