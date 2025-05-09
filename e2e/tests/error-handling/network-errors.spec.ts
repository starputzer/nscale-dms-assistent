/**
 * End-to-End-Tests für die Fehlerbehandlung bei Netzwerkproblemen.
 */
import { test, expect } from '@playwright/test';
import { ChatPage } from '../../pages/chat-page';
import { simulateNetworkErrors, simulateNetworkDelay } from '../../utils/test-helpers';

// Tests mit vorgefertigten Authentifizierungsdaten ausführen
test.describe('Fehlerbehandlung bei Netzwerkproblemen', () => {
  // Bestehende Authentifizierungsdaten für jeden Test verwenden
  test.use({ storageState: './e2e/fixtures/user-auth.json' });
  
  // Test für die Fehlerbehandlung bei einem API-Fehler während des Nachrichtensendens
  test('Fehlerbehandlung bei API-Fehler während des Nachrichtensendens', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();
    
    // Simuliere Netzwerkfehler für die Nachrichten-API
    await simulateNetworkErrors(page, '**/api/sessions/*/messages', 1.0); // 100% Fehlerrate
    
    // Nachricht senden
    await chatPage.sendMessage('Testnachricht mit Netzwerkfehler');
    
    // Prüfen, ob eine Fehlermeldung angezeigt wird
    await expect(page.locator('.error-message')).toBeVisible();
    
    // Prüfen, ob ein Wiederholungs-Button angezeigt wird
    await expect(page.locator('.retry-button')).toBeVisible();
    
    // Netzwerkfehler-Simulation zurücksetzen
    await page.unroute('**/api/sessions/*/messages');
    
    // Wiederholungs-Button klicken
    await page.click('.retry-button');
    
    // Prüfen, ob die Nachricht gesendet wurde (Benutzernachricht sollte angezeigt werden)
    await expect(page.locator('.message-item.message-user')).toContainText('Testnachricht mit Netzwerkfehler');
  });
  
  // Test für die Fehlerbehandlung bei Timeout während des Nachrichtensendens
  test('Fehlerbehandlung bei Timeout während des Nachrichtensendens', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();
    
    // Simuliere Netzwerkverzögerung für die Nachrichten-API
    await simulateNetworkDelay(page, 60000); // 60 Sekunden Verzögerung
    
    // Nachricht senden
    await chatPage.sendMessage('Testnachricht mit Timeout');
    
    // Prüfen, ob eine Timeout-Fehlermeldung angezeigt wird
    await expect(page.locator('.error-message:has-text("Timeout")')).toBeVisible({ timeout: 30000 });
    
    // Prüfen, ob ein Wiederholungs-Button angezeigt wird
    await expect(page.locator('.retry-button')).toBeVisible();
    
    // Netzwerkverzögerung zurücksetzen
    await page.unroute('**/*');
  });
  
  // Test für die automatische Wiederherstellung einer Verbindung nach einem Netzwerkfehler
  test('Automatische Wiederherstellung nach einem Netzwerkfehler', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();
    
    // Offline-Modus simulieren
    await page.context().setOffline(true);
    
    // Nachricht senden (sollte fehlschlagen)
    await chatPage.sendMessage('Testnachricht im Offline-Modus');
    
    // Prüfen, ob eine Fehlermeldung angezeigt wird
    await expect(page.locator('.error-message')).toBeVisible();
    
    // Online-Modus wiederherstellen
    await page.context().setOffline(false);
    
    // Wiederholungs-Button klicken
    await page.click('.retry-button');
    
    // Prüfen, ob die Nachricht gesendet wurde
    await expect(page.locator('.message-item.message-user')).toContainText('Testnachricht im Offline-Modus');
    
    // Auf Antwort des Assistenten warten
    await chatPage.waitForAssistantResponse();
    
    // Prüfen, ob eine Antwort vom Assistenten angezeigt wird
    await expect(page.locator('.message-item.message-assistant').last()).toBeVisible();
  });
  
  // Test für die Fehlerbehandlung bei einem Verbindungsverlust während des Streamings
  test('Fehlerbehandlung bei Verbindungsverlust während des Streamings', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();
    
    // Nachricht senden, um das Streaming zu starten
    await chatPage.sendMessage('Testnachricht für Streaming-Test');
    
    // Warten, bis das Streaming beginnt
    await page.waitForSelector('.message-item.message-assistant.streaming', {
      state: 'attached',
      timeout: 10000
    });
    
    // Offline-Modus simulieren, während das Streaming läuft
    await page.context().setOffline(true);
    
    // Warten, bis eine Fehlermeldung angezeigt wird
    await expect(page.locator('.streaming-error')).toBeVisible({ timeout: 30000 });
    
    // Online-Modus wiederherstellen
    await page.context().setOffline(false);
    
    // Prüfen, ob ein Wiederholungs-Button angezeigt wird
    await expect(page.locator('.retry-streaming-button')).toBeVisible();
    
    // Wiederholungs-Button klicken
    await page.click('.retry-streaming-button');
    
    // Warten, bis das Streaming fortgesetzt wird
    await expect(page.locator('.message-item.message-assistant.streaming')).toBeVisible();
    
    // Warten, bis das Streaming abgeschlossen ist
    await page.waitForSelector('.message-item.message-assistant.streaming', {
      state: 'detached',
      timeout: 30000
    });
    
    // Prüfen, ob die Antwort des Assistenten angezeigt wird
    await expect(page.locator('.message-item.message-assistant').last()).toBeVisible();
  });
});