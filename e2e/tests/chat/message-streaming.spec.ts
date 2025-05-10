/**
 * End-to-End-Tests für das Streaming von Chat-Nachrichten.
 */
import { test, expect } from '@playwright/test';
import { ChatPage } from '../../pages/chat-page';

test.describe('Chat-Nachrichten Streaming', () => {
  // Bestehende Authentifizierungsdaten für jeden Test verwenden
  test.use({ storageState: './e2e/fixtures/user-auth.json' });

  // Test für das Stream-Verhalten bei Chat-Antworten
  test('Streaming von Assistentenantworten', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // Nachricht senden, die eine längere Antwort erfordert
    const testMessage = 'Erkläre mir die gesamte Geschichte der künstlichen Intelligenz in mindestens 500 Wörtern';
    await chatPage.sendMessage(testMessage);

    // Prüfen, ob die Benutzernachricht angezeigt wird
    await chatPage.expectLastUserMessageContains(testMessage);
    
    // Auf das Erscheinen des Streaming-Indikators warten
    await expect(chatPage.streamingIndicator).toBeVisible();
    
    // Erste Version der Antwort speichern
    await chatPage.waitForAssistantResponseStart();
    const initialResponse = await chatPage.getLastAssistantMessageText();
    
    // Warten, um das Streaming zu beobachten
    await page.waitForTimeout(2000);
    
    // Zweite Version der Antwort speichern und vergleichen
    const updatedResponse = await chatPage.getLastAssistantMessageText();
    
    // Die aktualisierte Antwort sollte länger sein als die ursprüngliche (Streaming)
    expect(updatedResponse.length).toBeGreaterThan(initialResponse.length);
    
    // Warten, bis das Streaming abgeschlossen ist
    await chatPage.waitForStreamingComplete();
    
    // Prüfen, ob der Streaming-Indikator verschwunden ist
    await expect(chatPage.streamingIndicator).not.toBeVisible();
    
    // Die endgültige Antwort sollte noch länger sein
    const finalResponse = await chatPage.getLastAssistantMessageText();
    expect(finalResponse.length).toBeGreaterThan(updatedResponse.length);
  });

  // Test für die Unterbrechung des Streamings
  test('Unterbrechen des Streaming-Prozesses', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // Eine Nachricht senden, die eine lange Antwort erfordert
    const testMessage = 'Schreibe mir eine ausführliche Geschichte über Künstliche Intelligenz und deren Entwicklung';
    await chatPage.sendMessage(testMessage);

    // Warten bis die Antwort zu streamen beginnt
    await chatPage.waitForAssistantResponseStart();
    await expect(chatPage.streamingIndicator).toBeVisible();
    
    // Streaming-Antwort abbrechen
    await chatPage.stopStreaming();
    
    // Prüfen, ob der Streaming-Indikator verschwunden ist
    await expect(chatPage.streamingIndicator).not.toBeVisible();
    
    // Prüfen, ob die Antwort unvollständig angezeigt wird
    const incompleteResponse = await chatPage.getLastAssistantMessageText();
    expect(incompleteResponse.length).toBeGreaterThan(0);
    
    // Prüfen, ob ein "Abgebrochen"-Hinweis angezeigt wird
    await expect(chatPage.streamingCancelledIndicator).toBeVisible();
  });

  // Test für das Wiederherstellen der Verbindung nach einem Netzwerkfehler
  test('Wiederherstellen der Verbindung nach einem Netzwerkfehler', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // Nachricht senden
    await chatPage.sendMessage('Hallo, wie geht es dir?');
    
    // Auf das Erscheinen der Antwort warten
    await chatPage.waitForAssistantResponseStart();
    
    // Netzwerkverbindung unterbrechen
    await page.context().setOffline(true);
    
    // Versuchen, eine weitere Nachricht zu senden
    await chatPage.sendMessage('Dies ist eine Nachricht während der Offline-Phase');
    
    // Prüfen, ob eine Offline-Warnung angezeigt wird
    await expect(chatPage.offlineWarning).toBeVisible();
    
    // Netzwerkverbindung wiederherstellen
    await page.context().setOffline(false);
    
    // Prüfen, ob die Offline-Warnung verschwindet
    await expect(chatPage.offlineWarning).not.toBeVisible({ timeout: 10000 });
    
    // Prüfen, ob die Nachricht jetzt gesendet werden kann
    await chatPage.waitForReconnect();
    await chatPage.sendMessage('Dies ist eine Nachricht nach der Wiederverbindung');
    
    // Auf die Antwort warten
    await chatPage.waitForAssistantResponse();
    
    // Prüfen, ob die Antwort angezeigt wird
    await expect(chatPage.assistantMessages.last()).toBeVisible();
  });
  
  // Test für automatisches Weiterschreiben bei unterbrochener Verbindung
  test('Automatisches Weiterschreiben bei unterbrochener Verbindung', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // Eine Nachricht senden, die eine lange Antwort erfordert
    const testMessage = 'Erkläre mir die Geschichte der modernen Programmiersprachen';
    await chatPage.sendMessage(testMessage);

    // Warten bis die Antwort zu streamen beginnt
    await chatPage.waitForAssistantResponseStart();
    const initialResponse = await chatPage.getLastAssistantMessageText();
    
    // Netzwerkverbindung unterbrechen
    await page.context().setOffline(true);
    
    // Kurz warten und prüfen, ob eine Warnung angezeigt wird
    await page.waitForTimeout(2000);
    await expect(chatPage.connectionErrorIndicator).toBeVisible();
    
    // Verbindung wiederherstellen
    await page.context().setOffline(false);
    await chatPage.waitForReconnect();
    
    // Warten, bis die Antwort fortgesetzt wird
    await chatPage.waitForStreamingComplete();
    
    // Die endgültige Antwort sollte länger sein als die ursprüngliche
    const finalResponse = await chatPage.getLastAssistantMessageText();
    expect(finalResponse.length).toBeGreaterThan(initialResponse.length);
  });
});