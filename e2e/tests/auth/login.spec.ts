/**
 * End-to-End-Tests für den Authentifizierungs-Flow.
 */
import { test, expect } from "@playwright/test";
import { LoginPage } from "../../pages/login-page";
import { ChatPage } from "../../pages/chat-page";

test.describe("Authentifizierungs-Flow", () => {
  let loginPage: LoginPage;
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    chatPage = new ChatPage(page);

    // Zur Login-Seite navigieren
    await loginPage.goto();
  });

  // Test für erfolgreiche Anmeldung mit gültigen Anmeldedaten
  test("Erfolgreiche Anmeldung mit gültigen Anmeldedaten", async ({ page }) => {
    // Anmelden mit gültigen Anmeldedaten
    await loginPage.login("admin@example.com", "admin123");

    // Nach erfolgreicher Anmeldung sollte die Seite zur Hauptseite weitergeleitet werden
    await expect(page).toHaveURL("/chat");

    // Elemente prüfen, die nur nach erfolgreicher Anmeldung sichtbar sein sollten
    await expect(chatPage.userProfileButton).toBeVisible();
    await expect(chatPage.messageInput).toBeVisible();
  });

  // Test für fehlgeschlagene Anmeldung mit ungültigen Anmeldedaten
  test("Fehlgeschlagene Anmeldung mit ungültigen Anmeldedaten", async () => {
    // Anmelden mit ungültigen Anmeldedaten
    await loginPage.login("falsch@example.com", "falschesPasswort");

    // Bei ungültigen Anmeldedaten sollte eine Fehlermeldung angezeigt werden
    await expect(loginPage.errorMessage).toBeVisible();

    // Die URL sollte weiterhin auf der Login-Seite sein
    await expect(loginPage.page).toHaveURL(/.*\/login/);
  });

  // Test für automatischen Redirect zur Login-Seite bei nicht authentifizierten Anfragen
  test("Redirect zur Login-Seite bei nicht authentifizierten Anfragen", async ({
    page,
  }) => {
    // Direkt zur geschützten Seite navigieren ohne vorherige Anmeldung
    await page.goto("/chat");

    // Sollte zur Login-Seite weitergeleitet werden
    await expect(page).toHaveURL(/.*\/login/);
  });

  // Test für korrekte Speicherung des Authentifizierungsstatus
  test("Authentifizierungsstatus bleibt nach Seitenaktualisierung erhalten", async ({
    page,
  }) => {
    // "Angemeldet bleiben" aktivieren
    await loginPage.rememberMeCheckbox.check();

    // Anmelden mit gültigen Anmeldedaten
    await loginPage.login("admin@example.com", "admin123");

    // Warten auf erfolgreiche Anmeldung und Navigation zur Hauptseite
    await expect(page).toHaveURL("/chat");

    // Seite aktualisieren
    await page.reload();

    // Nach der Aktualisierung sollte der Benutzer weiterhin angemeldet sein
    await expect(page).not.toHaveURL(/.*\/login/);
    await expect(chatPage.userProfileButton).toBeVisible();
  });

  // Test für erfolgreichen Logout
  test("Erfolgreicher Logout", async () => {
    // Anmelden mit gültigen Anmeldedaten
    await loginPage.login("admin@example.com", "admin123");

    // Warten auf erfolgreiche Anmeldung und Navigation zur Hauptseite
    await expect(loginPage.page).toHaveURL("/chat");

    // Logout durchführen
    await chatPage.logout();

    // Nach dem Logout sollte zur Login-Seite weitergeleitet werden
    await expect(loginPage.page).toHaveURL(/.*\/login/);

    // Prüfen, ob Anmeldefelder angezeigt werden
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
  });

  // Test für das Umschalten zwischen Login- und Registrierungs-Tabs
  test("Umschalten zwischen Login- und Registrierungs-Tabs", async () => {
    // Zum Registrierungs-Tab wechseln
    await loginPage.switchToRegisterTab();

    // Überprüfen, ob Registrierungsfelder angezeigt werden
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordConfirmInput).toBeVisible();

    // Zurück zum Login-Tab wechseln
    await loginPage.switchToLoginTab();

    // Überprüfen, ob nur Login-Felder angezeigt werden
    await expect(loginPage.usernameInput).not.toBeVisible();
    await expect(loginPage.passwordConfirmInput).not.toBeVisible();
  });

  // Test für Passwort-Stärke-Anzeige
  test("Passwort-Stärke-Anzeige bei der Registrierung", async () => {
    // Zum Registrierungs-Tab wechseln
    await loginPage.switchToRegisterTab();

    // Testen verschiedener Passwort-Stärken
    await loginPage.checkPasswordStrength("123", "weak");
    await loginPage.checkPasswordStrength("password123", "medium");
    await loginPage.checkPasswordStrength("Password123", "strong");
    await loginPage.checkPasswordStrength("Password123!@#", "very-strong");
  });

  // Test für Passwort-Übereinstimmung bei der Registrierung
  test("Passwort-Übereinstimmung bei der Registrierung", async () => {
    // Nicht übereinstimmende Passwörter
    await loginPage.checkPasswordMatch("Password123", "Password456", false);

    // Übereinstimmende Passwörter
    await loginPage.checkPasswordMatch("Password123", "Password123", true);
  });

  // Test für Formularvalidierung
  test("Formularvalidierung bei leeren Eingaben", async () => {
    await loginPage.expectFormValidation();
  });

  // Test für erfolgreiche Registrierung
  test("Erfolgreiche Registrierung mit gültigen Daten", async () => {
    // Zufällige E-Mail-Adresse generieren, um Kollisionen zu vermeiden
    const timestamp = new Date().getTime();
    const email = `test${timestamp}@example.com`;
    const username = `testuser${timestamp}`;

    // Registrierung durchführen
    await loginPage.register(email, username, "Password123", "Test User");

    // Nach erfolgreicher Registrierung sollte die Seite zur Hauptseite weitergeleitet werden
    await expect(loginPage.page).toHaveURL("/chat");

    // Elemente prüfen, die nur nach erfolgreicher Anmeldung sichtbar sein sollten
    await expect(chatPage.userProfileButton).toBeVisible();
  });
});

// Barrierefreiheitstests für die Login-Seite
test.describe("Barrierefreiheit der Login-Seite", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  // Test für Tastatur-Navigation
  test("Tastatur-Navigation funktioniert korrekt", async ({ page }) => {
    // Tab-Navigation zum E-Mail-Feld
    await page.keyboard.press("Tab");
    await expect(loginPage.emailInput).toBeFocused();

    // Tab-Navigation zum Passwort-Feld
    await page.keyboard.press("Tab");
    await expect(loginPage.passwordInput).toBeFocused();

    // Tab-Navigation zur Checkbox
    await page.keyboard.press("Tab");
    await expect(loginPage.rememberMeCheckbox).toBeFocused();

    // Tab-Navigation zum Login-Button
    await page.keyboard.press("Tab");
    await expect(loginPage.submitButton).toBeFocused();
  });

  // Test für Formular-Submission per Enter-Taste
  test("Formular kann mit Enter-Taste abgeschickt werden", async () => {
    // E-Mail eingeben
    await loginPage.emailInput.fill("admin@example.com");

    // Passwort eingeben und Enter drücken
    await loginPage.passwordInput.fill("admin123");
    await loginPage.passwordInput.press("Enter");

    // Sollte zur Hauptseite weitergeleitet werden
    await expect(loginPage.page).toHaveURL("/chat");
  });
});
