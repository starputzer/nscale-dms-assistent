/**
 * Page Object für die Login-Seite.
 * Enthält Selektoren und Methoden für die Interaktion mit der Login-Seite.
 */
import { Page, Locator, expect } from "@playwright/test";

export class LoginPage {
  readonly page: Page;

  // UI-Elemente als Locator-Eigenschaften für bessere Typisierung und IntelliSense
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly usernameInput: Locator;
  readonly passwordConfirmInput: Locator;
  readonly submitButton: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly errorMessage: Locator;
  readonly loginTab: Locator;
  readonly registerTab: Locator;
  readonly passwordStrengthIndicator: Locator;
  readonly passwordMatchError: Locator;
  readonly forgotPasswordLink: Locator;
  readonly resetEmailInput: Locator;
  readonly resetPasswordInput: Locator;
  readonly resetPasswordConfirmInput: Locator;
  readonly resetRequestButton: Locator;
  readonly resetPasswordButton: Locator;
  readonly userProfileButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Login-Formular-Elemente
<<<<<<< HEAD
    this.emailInput = page.locator('input#email');
    this.passwordInput = page.locator('input#password');
=======
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordConfirmInput = page.locator('input[name="passwordConfirm"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.rememberMeCheckbox = page.locator('input[name="rememberMe"]');
    this.errorMessage = page.locator(".error-message");

    // Tab-Elemente
    this.loginTab = page
      .locator(".auth-tabs .tab-item")
      .filter({ hasText: "Anmelden" });
    this.registerTab = page
      .locator(".auth-tabs .tab-item")
      .filter({ hasText: "Registrieren" });

    // Registrierungsspezifische Elemente
    this.passwordStrengthIndicator = page.locator(
      ".password-strength-indicator .indicator-bar",
    );
    this.passwordMatchError = page.locator(".password-match-error");

    // Passwort-Reset-Elemente
    this.forgotPasswordLink = page
      .locator("a")
      .filter({ hasText: "Passwort vergessen" });
    this.resetEmailInput = page.locator('input[name="resetEmail"]');
    this.resetPasswordInput = page.locator('input[name="newPassword"]');
    this.resetPasswordConfirmInput = page.locator(
      'input[name="confirmNewPassword"]',
    );
    this.resetRequestButton = page
      .locator('button[type="submit"]')
      .filter({ hasText: "Reset anfordern" });
    this.resetPasswordButton = page
      .locator('button[type="submit"]')
      .filter({ hasText: "Passwort zurücksetzen" });

    // Profilbereich
    this.userProfileButton = page.locator(".user-avatar, .user-profile-button");
  }

  /**
   * Navigiert zur Login-Seite.
   */
  async goto() {
    await this.page.goto("/login");
    // Warten, bis das Formular vollständig geladen ist
    await this.emailInput.waitFor({ state: "visible" });
  }

  /**
   * Führt den Login-Prozess durch.
   * @param email E-Mail-Adresse für die Anmeldung
   * @param password Passwort für die Anmeldung
   */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();

    // Warten auf Weiterleitung oder Fehlermeldung
    await Promise.race([
      this.page.waitForURL(/\/(?!login)/), // Erfolg: Weiterleitung zu einer anderen Seite
      this.errorMessage.waitFor({ state: "visible", timeout: 5000 }), // Fehler: Fehlermeldung erscheint
    ]);
  }

  /**
   * Führt den Registrierungsprozess durch.
   */
  async register(
    email: string,
    username: string,
    password: string,
    displayName?: string,
  ) {
    // Zum Registrierungs-Tab wechseln
    await this.registerTab.click();

    // Formular ausfüllen
    await this.emailInput.fill(email);
    await this.usernameInput.fill(username);
    if (displayName) {
      await this.page.locator('input[name="displayName"]').fill(displayName);
    }
    await this.passwordInput.fill(password);
    await this.passwordConfirmInput.fill(password);

    // Formular absenden
    await this.submitButton.click();

    // Warten auf Weiterleitung oder Fehlermeldung
    await Promise.race([
      this.page.waitForURL(/\/(?!login)/), // Erfolg: Weiterleitung zu einer anderen Seite
      this.errorMessage.waitFor({ state: "visible", timeout: 5000 }), // Fehler: Fehlermeldung erscheint
    ]);
  }

  /**
   * Navigiert zur Passwort-vergessen-Seite.
   */
  async navigateToForgotPassword() {
    await this.forgotPasswordLink.click();
    await this.resetEmailInput.waitFor({ state: "visible" });
  }

  /**
   * Fordert einen Passwort-Reset für eine E-Mail-Adresse an.
   * @param email E-Mail-Adresse für den Reset
   */
  async requestPasswordReset(email: string) {
    await this.resetEmailInput.fill(email);
    await this.resetRequestButton.click();
  }

  /**
   * Setzt das Passwort zurück mit einem Token aus der URL.
   * @param newPassword Neues Passwort
   * @param confirmPassword Passwort zur Bestätigung
   */
  async resetPassword(newPassword: string, confirmPassword: string) {
    await this.resetPasswordInput.fill(newPassword);
    await this.resetPasswordConfirmInput.fill(confirmPassword);
    await this.resetPasswordButton.click();
  }

  /**
   * Überprüft, ob das Formular für ungültige Eingaben validiert wird.
   */
  async expectFormValidation() {
    // Senden ohne Eingaben
    await this.submitButton.click();

    // Überprüfen, ob Fehlermeldungen angezeigt werden
    const emailError = this.page.locator(
      'input[name="email"] + .error-message, input[name="email"][aria-invalid="true"]',
    );
    const passwordError = this.page.locator(
      'input[name="password"] + .error-message, input[name="password"][aria-invalid="true"]',
    );

    await expect(emailError).toBeVisible();
    await expect(passwordError).toBeVisible();

    // Überprüfen, ob wir auf der Login-Seite bleiben
    await expect(this.page).toHaveURL(/\/login/);
  }

  /**
   * Überprüft die Passwort-Stärke-Anzeige.
   */
  async checkPasswordStrength(
    password: string,
    expectedStrength: "weak" | "medium" | "strong" | "very-strong",
  ) {
    // Zum Registrierungs-Tab wechseln
    await this.registerTab.click();

    // Passwort eingeben
    await this.passwordInput.fill(password);

    // Warten, bis der Stärkeindikator aktualisiert wurde
    await this.passwordStrengthIndicator.waitFor({ state: "visible" });

    // Überprüfen des Stärkeindikators
    const strengthClasses = {
      weak: "bg-red-500",
      medium: "bg-yellow-500",
      strong: "bg-green-500",
      "very-strong": "bg-green-600",
    };

    await expect(this.passwordStrengthIndicator).toHaveClass(
      new RegExp(strengthClasses[expectedStrength]),
    );
  }

  /**
   * Überprüft die Übereinstimmung der Passwörter.
   */
  async checkPasswordMatch(
    password: string,
    confirmPassword: string,
    shouldMatch: boolean,
  ) {
    // Zum Registrierungs-Tab wechseln
    await this.registerTab.click();

    // Passwörter eingeben
    await this.passwordInput.fill(password);
    await this.passwordConfirmInput.fill(confirmPassword);

    // Kurze Pause für UI-Updates
    await this.page.waitForTimeout(300);

    if (shouldMatch) {
      await expect(this.passwordMatchError).not.toBeVisible();
    } else {
      await expect(this.passwordMatchError).toBeVisible();
    }
  }

  /**
   * Wechselt zwischen Login- und Registrierungs-Tabs.
   */
  async switchToRegisterTab() {
    await this.registerTab.click();
    await expect(this.usernameInput).toBeVisible();
  }

  async switchToLoginTab() {
    await this.loginTab.click();
    await expect(this.usernameInput).not.toBeVisible();
  }
}
