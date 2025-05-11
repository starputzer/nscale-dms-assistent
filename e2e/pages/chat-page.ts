/**
 * Page Object für die Chat-Seite.
 * Enthält Selektoren und Methoden für die Interaktion mit der Chat-Seite.
 */
import { Page, Locator, expect } from "@playwright/test";

export class ChatPage {
  readonly page: Page;

  // UI-Elemente als Locator-Eigenschaften
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messageList: Locator;
  readonly messageItems: Locator;
  readonly userMessages: Locator;
  readonly assistantMessages: Locator;
  readonly sessionListContainer: Locator;
  readonly newSessionButton: Locator;
  readonly sessionItems: Locator;
  readonly userProfileButton: Locator;
  readonly logoutButton: Locator;
  readonly sessionNameDisplay: Locator;
  readonly loadingIndicator: Locator;
  readonly errorDisplay: Locator;
  readonly retryButton: Locator;
  readonly clearChatButton: Locator;
  readonly settingsButton: Locator;
  readonly searchButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Chat-Elemente
    this.messageInput = page.locator(
      '[data-testid="message-input"], textarea.message-input',
    );
    this.sendButton = page.locator(
      '[data-testid="send-button"], button.send-message-btn',
    );
    this.messageList = page.locator(
      '[data-testid="message-list"], .message-list',
    );
    this.messageItems = page.locator(
      '[data-testid="message-item"], .message-item',
    );
    this.userMessages = page.locator(
      '.message-item.user, .message-item[data-role="user"]',
    );
    this.assistantMessages = page.locator(
      '.message-item.assistant, .message-item[data-role="assistant"]',
    );

    // Session-Elemente
    this.sessionListContainer = page.locator(
      '[data-testid="session-list"], .session-list',
    );
    this.newSessionButton = page.locator(
      '[data-testid="new-session-button"], button.new-session-btn',
    );
    this.sessionItems = page.locator(
      '[data-testid="session-item"], .session-item',
    );
    this.sessionNameDisplay = page.locator(
      ".session-name, .current-session-title",
    );

    // Navigation und UI-Elemente
    this.userProfileButton = page.locator(".user-avatar, .user-profile-button");
    this.logoutButton = page.locator(
      'button[aria-label="Logout"], .logout-button',
    );
    this.loadingIndicator = page.locator(".loading-indicator, .spinner");
    this.errorDisplay = page.locator(".error-message, .error-display");
    this.retryButton = page.locator(
      'button[aria-label="Retry"], .retry-button',
    );
    this.clearChatButton = page.locator(
      'button[aria-label="Clear chat"], .clear-chat-button',
    );
    this.settingsButton = page.locator(
      'button[aria-label="Settings"], .settings-button',
    );
    this.searchButton = page.locator(
      'button[aria-label="Search"], .search-button',
    );
  }

  /**
   * Navigiert zur Chat-Seite.
   */
  async goto() {
    await this.page.goto("/chat");
    // Warten, bis die Seite geladen ist
    await this.messageInput.waitFor({ state: "visible" });
  }

  /**
   * Sendet eine Nachricht im Chat.
   */
  async sendMessage(message: string) {
    // Warten, bis die Eingabe bereit ist
    await this.messageInput.waitFor({ state: "visible" });

    // Nachricht eingeben und senden
    await this.messageInput.fill(message);
    await this.sendButton.click();

    // Warten, bis die Nachricht in der Liste erscheint
    const messageCount = await this.messageItems.count();
    await this.page.waitForSelector(
      `.message-item:nth-child(${messageCount + 1}), [data-testid="message-item"]:nth-child(${messageCount + 1})`,
      { state: "attached" },
    );
  }

  /**
   * Wartet auf die Antwort des Assistenten.
   */
  async waitForAssistantResponse(timeout = 30000) {
    // Auf das Erscheinen des Loading-Indikators warten
    await this.loadingIndicator
      .waitFor({ state: "visible", timeout: 5000 })
      .catch(() => {
        // Ignorieren, wenn kein Loading-Indikator erscheint (könnte schnell sein)
      });

    // Auf das Verschwinden des Loading-Indikators oder das Erscheinen einer neuen Nachricht warten
    await Promise.race([
      this.loadingIndicator.waitFor({ state: "hidden", timeout }),
      this.page.waitForFunction(
        () => {
          // Eine neue Assistenten-Nachricht ist erschienen
          const messages = document.querySelectorAll(
            '.message-item.assistant, .message-item[data-role="assistant"]',
          );
          return (
            messages.length > 0 &&
            messages[messages.length - 1].textContent?.trim().length > 0
          );
        },
        { timeout },
      ),
    ]);

    // Kurze Pause für eventuelle UI-Updates
    await this.page.waitForTimeout(300);
  }

  /**
   * Erstellt eine neue Chat-Session.
   */
  async createNewSession() {
    await this.newSessionButton.waitFor({ state: "visible" });
    await this.newSessionButton.click();

    // Warten, bis eine neue Session erstellt wurde
    // (z.B. indem wir auf eine leere Nachrichtenliste warten)
    await expect(this.messageItems).toHaveCount(0);
  }

  /**
   * Wechselt zu einer bestimmten Session.
   */
  async switchToSession(sessionIndex: number) {
    const sessions = this.sessionItems;
    const count = await sessions.count();

    if (sessionIndex < 0 || sessionIndex >= count) {
      throw new Error(
        `Session mit Index ${sessionIndex} nicht gefunden. Verfügbare Sessions: ${count}`,
      );
    }

    await sessions.nth(sessionIndex).click();

    // Warten, bis die Session geladen ist
    await this.loadingIndicator
      .waitFor({ state: "hidden", timeout: 5000 })
      .catch(() => {
        // Ignorieren, wenn kein Loading-Indikator erscheint
      });
  }

  /**
   * Meldet den Benutzer ab.
   */
  async logout() {
    await this.userProfileButton.click();
    await this.logoutButton.click();

    // Warten, bis zur Login-Seite weitergeleitet wird
    await this.page.waitForURL(/\/login/);
  }

  /**
   * Überprüft, ob eine bestimmte Anzahl von Nachrichten angezeigt wird.
   */
  async expectMessageCount(count: number) {
    await expect(this.messageItems).toHaveCount(count);
  }

  /**
   * Überprüft, ob die letzte Nachricht vom Assistenten einen bestimmten Text enthält.
   */
  async expectLastAssistantMessageContains(text: string) {
    const count = await this.assistantMessages.count();

    if (count === 0) {
      throw new Error("Keine Assistenten-Nachrichten gefunden");
    }

    await expect(this.assistantMessages.last()).toContainText(text);
  }

  /**
   * Überprüft, ob die letzte Nachricht vom Benutzer einen bestimmten Text enthält.
   */
  async expectLastUserMessageContains(text: string) {
    const count = await this.userMessages.count();

    if (count === 0) {
      throw new Error("Keine Benutzer-Nachrichten gefunden");
    }

    await expect(this.userMessages.last()).toContainText(text);
  }

  /**
   * Führt eine Chat-Konversation mit mehreren Runden durch.
   */
  async conductConversation(messages: string[]) {
    for (const message of messages) {
      await this.sendMessage(message);
      await this.waitForAssistantResponse();
    }
  }

  /**
   * Öffnet die Einstellungen.
   */
  async openSettings() {
    await this.settingsButton.click();
    // Warten, bis das Einstellungsmenü geöffnet ist
    await this.page.waitForSelector(
      '.settings-panel, [data-testid="settings-panel"]',
      {
        state: "visible",
        timeout: 5000,
      },
    );
  }

  /**
   * Löscht den aktuellen Chat.
   */
  async clearChat() {
    await this.clearChatButton.click();

    // Warten auf Bestätigungsdialog und bestätigen
    const confirmButton = this.page.locator(
      '.confirm-dialog button.confirm, [data-testid="confirm-button"]',
    );
    await confirmButton.click();

    // Warten, bis alle Nachrichten entfernt wurden
    await expect(this.messageItems).toHaveCount(0);
  }
}
