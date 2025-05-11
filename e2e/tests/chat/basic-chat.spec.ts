/**
 * End-to-End-Tests für den grundlegenden Chat-Flow.
 */
import { test, expect } from "@playwright/test";
import { ChatPage } from "../../pages/chat-page";

// Tests mit vorgefertigten Authentifizierungsdaten ausführen
test.describe("Grundlegender Chat-Flow", () => {
  // Bestehende Authentifizierungsdaten für jeden Test verwenden
  test.use({ storageState: "./e2e/fixtures/user-auth.json" });

  // Test für das Senden einer Nachricht und Empfangen einer Antwort
  test("Senden einer Nachricht und Empfangen einer Antwort", async ({
    page,
  }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // Nachricht senden
    const testMessage = "Was ist nScale?";
    await chatPage.sendMessage(testMessage);

    // Prüfen, ob die Benutzernachricht angezeigt wird
    await expect(
      page.locator(".message-item.message-user").last(),
    ).toContainText(testMessage);

    // Auf Antwort des Assistenten warten
    await chatPage.waitForAssistantResponse();

    // Prüfen, ob eine Antwort vom Assistenten angezeigt wird
    await expect(
      page.locator(".message-item.message-assistant").last(),
    ).toBeVisible();
  });

  // Test für die Erstellung einer neuen Chat-Session
  test("Erstellen einer neuen Chat-Session", async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // Anzahl der Sessions vor dem Erstellen einer neuen Session zählen
    const initialSessionCount = await page.locator(".session-item").count();

    // Neue Session erstellen
    await chatPage.createNewSession();

    // Prüfen, ob eine neue Session erstellt wurde
    await expect(page.locator(".session-item")).toHaveCount(
      initialSessionCount + 1,
    );

    // Prüfen, ob die neue Session aktiv ist
    await expect(page.locator(".session-item.active")).toBeVisible();
  });

  // Test für das Umbenennen einer Chat-Session
  test("Umbenennen einer Chat-Session", async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // Neue Session erstellen
    await chatPage.createNewSession();

    // Nachricht senden, um die neue Session zu initialisieren
    await chatPage.sendMessage("Hallo, das ist ein Test");

    // Auf Antwort des Assistenten warten
    await chatPage.waitForAssistantResponse();

    // Session umbenennen
    const newSessionTitle = "Mein Test-Chat " + Date.now();
    await chatPage.renameSession(0, newSessionTitle);

    // Prüfen, ob der neue Titel angezeigt wird
    await expect(page.locator(".session-item").first()).toContainText(
      newSessionTitle,
    );
  });

  // Test für das Wechseln zwischen Chat-Sessions
  test("Wechseln zwischen Chat-Sessions", async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // Nachricht in der aktuellen Session senden
    const firstSessionMessage = "Nachricht in Session 1";
    await chatPage.sendMessage(firstSessionMessage);

    // Auf Antwort des Assistenten warten
    await chatPage.waitForAssistantResponse();

    // Neue Session erstellen
    await chatPage.createNewSession();

    // Nachricht in der neuen Session senden
    const secondSessionMessage = "Nachricht in Session 2";
    await chatPage.sendMessage(secondSessionMessage);

    // Auf Antwort des Assistenten warten
    await chatPage.waitForAssistantResponse();

    // Zurück zur ersten Session wechseln
    await chatPage.switchToSession(1);

    // Prüfen, ob die Nachricht der ersten Session angezeigt wird
    await expect(page.locator(".message-item.message-user")).toContainText(
      firstSessionMessage,
    );

    // Wieder zur zweiten Session wechseln
    await chatPage.switchToSession(0);

    // Prüfen, ob die Nachricht der zweiten Session angezeigt wird
    await expect(page.locator(".message-item.message-user")).toContainText(
      secondSessionMessage,
    );
  });

  // Test für das Löschen einer Chat-Session
  test("Löschen einer Chat-Session", async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // Anzahl der Sessions vor dem Erstellen einer neuen Session zählen
    const initialSessionCount = await page.locator(".session-item").count();

    // Neue Session erstellen
    await chatPage.createNewSession();

    // Prüfen, ob eine neue Session erstellt wurde
    await expect(page.locator(".session-item")).toHaveCount(
      initialSessionCount + 1,
    );

    // Session löschen
    await chatPage.deleteSession(0);

    // Prüfen, ob die Session gelöscht wurde
    await expect(page.locator(".session-item")).toHaveCount(
      initialSessionCount,
    );
  });
});
