/**
 * Page Object für die Admin-Seite.
 */
import { Page, expect } from "@playwright/test";

export class AdminPage {
  readonly page: Page;

  // Selektoren für Elemente auf der Admin-Seite
  readonly adminButton = 'button[aria-label="Admin"]';
  readonly adminPanel = ".admin-panel";
  readonly adminTabs = ".admin-tabs .tab-button";
  readonly userManagementTab = '.tab-button[data-tab="users"]';
  readonly systemSettingsTab = '.tab-button[data-tab="system"]';
  readonly featureTogglesTab = '.tab-button[data-tab="features"]';
  readonly userTable = ".user-table";
  readonly userRows = ".user-table .user-row";
  readonly addUserButton = 'button[aria-label="Benutzer hinzufügen"]';
  readonly usernameInput = 'input[name="username"]';
  readonly passwordInput = 'input[name="password"]';
  readonly roleInput = 'select[name="role"]';
  readonly saveUserButton = 'button[type="submit"]';
  readonly deleteUserButton = 'button[aria-label="Benutzer löschen"]';
  readonly featureToggleRows = ".feature-toggle-row";
  readonly featureToggleSwitches = ".feature-toggle-switch";
  readonly saveSettingsButton = 'button[aria-label="Einstellungen speichern"]';
  readonly closeButton = 'button[aria-label="Schließen"]';

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Öffnet das Admin-Panel.
   */
  async openAdminPanel() {
    await this.page.click(this.adminButton);
    await this.page.waitForSelector(this.adminPanel, { state: "visible" });
  }

  /**
   * Wechselt zu einem bestimmten Tab im Admin-Panel.
   * @param tabName Name des Tabs: 'users', 'system', 'features', etc.
   */
  async switchToTab(tabName: string) {
    await this.page.click(`.tab-button[data-tab="${tabName}"]`);
  }

  /**
   * Alias für switchToTab für Kompatibilität mit existierenden Tests
   * @param tabName Name des Tabs
   */
  async selectTab(tabName: string) {
    await this.switchToTab(tabName);
  }

  /**
   * Erzeugt einen neuen Benutzer.
   */
  async createUser(
    username: string,
    password: string,
    role: "admin" | "user" = "user",
  ) {
    // Zum Benutzer-Tab wechseln
    await this.switchToTab("users");

    // "Benutzer hinzufügen" klicken
    await this.page.click(this.addUserButton);

    // Benutzerdaten eingeben
    await this.page.fill(this.usernameInput, username);
    await this.page.fill(this.passwordInput, password);
    await this.page.selectOption(this.roleInput, role);

    // Speichern
    await this.page.click(this.saveUserButton);

    // Warten, bis der neue Benutzer in der Tabelle erscheint
    await this.page.waitForSelector(`.user-row:has-text("${username}")`);
  }

  /**
   * Löscht einen Benutzer.
   * @param username Benutzername des zu löschenden Benutzers.
   */
  async deleteUser(username: string) {
    // Zum Benutzer-Tab wechseln
    await this.switchToTab("users");

    // Benutzer finden und Lösch-Button klicken
    const userRow = this.page
      .locator(this.userRows)
      .filter({ hasText: username });
    await userRow.locator(this.deleteUserButton).click();

    // Löschen bestätigen
    await this.page.click(".confirm-dialog button.confirm");

    // Warten, bis der Benutzer aus der Tabelle verschwunden ist
    await expect(
      this.page.locator(this.userRows).filter({ hasText: username }),
    ).not.toBeVisible();
  }

  /**
   * Aktiviert oder deaktiviert ein Feature-Toggle.
   * @param featureName Name des Features.
   * @param enable true zum Aktivieren, false zum Deaktivieren.
   */
  async toggleFeature(featureName: string, enable: boolean) {
    // Zum Feature-Toggles-Tab wechseln
    await this.switchToTab("features");

    // Feature-Zeile finden
    const featureRow = this.page
      .locator(this.featureToggleRows)
      .filter({ hasText: featureName });
    const featureSwitch = featureRow.locator('input[type="checkbox"]');

    // Aktuellen Status prüfen und ggf. ändern
    const isChecked = await featureSwitch.isChecked();
    if ((enable && !isChecked) || (!enable && isChecked)) {
      await featureSwitch.click();
    }

    // Änderungen speichern
    await this.page.click(this.saveSettingsButton);
  }

  /**
   * Schließt das Admin-Panel.
   */
  async closeAdminPanel() {
    await this.page.click(this.closeButton);
    await this.page.waitForSelector(this.adminPanel, { state: "hidden" });
  }

  /**
   * Prüft, ob eine bestimmte Anzahl von Benutzern in der Tabelle angezeigt wird.
   */
  async expectUserCount(count: number) {
    await this.switchToTab("users");
    await expect(this.page.locator(this.userRows)).toHaveCount(count);
  }

  /**
   * Prüft, ob ein Benutzer mit einem bestimmten Namen in der Tabelle vorhanden ist.
   */
  async expectUserExists(username: string) {
    await this.switchToTab("users");
    await expect(
      this.page.locator(this.userRows).filter({ hasText: username }),
    ).toBeVisible();
  }

  /**
   * Prüft, ob ein Feature-Toggle aktiviert ist.
   */
  async expectFeatureEnabled(featureName: string, enabled: boolean) {
    await this.switchToTab("features");
    const featureRow = this.page
      .locator(this.featureToggleRows)
      .filter({ hasText: featureName });
    const featureSwitch = featureRow.locator('input[type="checkbox"]');

    if (enabled) {
      await expect(featureSwitch).toBeChecked();
    } else {
      await expect(featureSwitch).not.toBeChecked();
    }
  }
}
