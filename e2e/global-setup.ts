/**
 * Global Setup für die E2E-Tests.
 * Dieser Code wird einmal vor allen Tests ausgeführt.
 */
import { chromium, FullConfig } from "@playwright/test";
import { createTestUsers } from "./fixtures/test-users";

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  console.log(`Starting global setup with baseURL: ${baseURL}`);

  // Testdatenbank mit vordefinierten Testdaten erstellen
  try {
    await createTestUsers();
    console.log("Test users created successfully");
  } catch (error) {
    console.error("Failed to create test users:", error);
    // Nicht abbrechen, wenn Testdaten nicht erstellt werden konnten
  }

  // Auth-State für verschiedene Rollen vorbereiten
  const browser = await chromium.launch();

  // Admin-Benutzer: Anmelden und Auth-State speichern
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await adminPage.goto(`${baseURL}/login`);
  await adminPage.fill('input[name="username"]', "admin");
  await adminPage.fill('input[name="password"]', "admin123");
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForURL(`${baseURL}/`);
  await adminContext.storageState({ path: "./e2e/fixtures/admin-auth.json" });

  // Standard-Benutzer: Anmelden und Auth-State speichern
  const userContext = await browser.newContext();
  const userPage = await userContext.newPage();
  await userPage.goto(`${baseURL}/login`);
  await userPage.fill('input[name="username"]', "user");
  await userPage.fill('input[name="password"]', "user123");
  await userPage.click('button[type="submit"]');
  await userPage.waitForURL(`${baseURL}/`);
  await userContext.storageState({ path: "./e2e/fixtures/user-auth.json" });

  await browser.close();

  console.log("Global setup completed");
}

export default globalSetup;
