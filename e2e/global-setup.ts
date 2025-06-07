/**
 * Global Setup für die E2E-Tests.
 * Dieser Code wird einmal vor allen Tests ausgeführt.
 */
import { chromium, FullConfig } from "@playwright/test";
import fs from "fs";
import path from "path";

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  console.log(`Starting global setup with baseURL: ${baseURL}`);

  // Ensure fixtures directory exists
  const fixturesDir = path.join(process.cwd(), "e2e", "fixtures");
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
    console.log(`Created fixtures directory: ${fixturesDir}`);
  }

  // Test-User existieren bereits in der Datenbank
  console.log("Using existing test users");

  // Auth-State für verschiedene Rollen vorbereiten
  const browser = await chromium.launch();

  try {
    // Admin-Benutzer: Anmelden und Auth-State speichern
    console.log("Logging in as admin...");
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    
    // Enable console logging for debugging
    adminPage.on('console', msg => console.log('Admin page log:', msg.text()));
    adminPage.on('pageerror', err => console.error('Admin page error:', err));
    
    await adminPage.goto(`${baseURL}/login`);
    
    // Wait for the form to be ready
    await adminPage.waitForSelector('input#email', { state: 'visible' });
    
    await adminPage.fill('input#email', "martin@danglefeet.com");
    await adminPage.fill('input#password', "123");
    await adminPage.click('button[type="submit"]');
    
    // Wait for navigation with longer timeout
    await adminPage.waitForURL('**/chat', { timeout: 30000 });
    console.log("Admin login successful");
    
    await adminContext.storageState({ path: path.join(fixturesDir, "admin-auth.json") });
    console.log("Admin auth state saved");

    // Standard-Benutzer: Anmelden und Auth-State speichern
    console.log("Logging in as standard user...");
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    
    // Enable console logging for debugging
    userPage.on('console', msg => console.log('User page log:', msg.text()));
    userPage.on('pageerror', err => console.error('User page error:', err));
    
    await userPage.goto(`${baseURL}/login`);
    
    // Wait for the form to be ready
    await userPage.waitForSelector('input#email', { state: 'visible' });
    
    await userPage.fill('input#email', "user@example.com");
    await userPage.fill('input#password', "password123");
    await userPage.click('button[type="submit"]');
    
    // Wait for navigation with longer timeout
    await userPage.waitForURL('**/chat', { timeout: 30000 });
    console.log("User login successful");
    
    await userContext.storageState({ path: path.join(fixturesDir, "user-auth.json") });
    console.log("User auth state saved");
    
  } catch (error) {
    console.error("Global setup failed:", error);
    // Take screenshots for debugging
    const screenshotDir = path.join(process.cwd(), "e2e-test-results");
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const pages = await browser.contexts().flatMap(ctx => ctx.pages());
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const screenshotPath = path.join(screenshotDir, `global-setup-failure-${i}.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`Screenshot saved: ${screenshotPath}`);
    }
    
    throw error;
  } finally {
    await browser.close();
  }

  console.log("Global setup completed");
}

export default globalSetup;
