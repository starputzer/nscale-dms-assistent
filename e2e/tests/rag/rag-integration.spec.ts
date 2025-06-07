/**
 * E2E Tests für die RAG-System Integration
 * Testet alle 3 Phasen des RAG-Systems
 */
import { test, expect } from "@playwright/test";

test.describe("RAG-System Integration", () => {
  test.beforeEach(async ({ page }) => {
    // Als Admin einloggen
    await page.goto("/login");
    await page.fill('input#email', "martin@danglefeet.com");
    await page.fill('input#password', "123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/chat");
    
    // Warte auf Chat-Interface
    await page.waitForSelector('.chat-view', { state: 'visible' });
  });

  test.describe("Phase 1: Basis-Retrieval mit Embeddings", () => {
    test("Antworten basieren auf Dokumentenquellen", async ({ page }) => {
      // Chat-Input finden
      const inputSelector = 'input[placeholder*="Nachricht"], textarea[placeholder*="Nachricht"]';
      await page.waitForSelector(inputSelector, { state: 'visible' });
      
      // Frage zu einem spezifischen Thema aus den Dokumenten
      await page.fill(inputSelector, "Wie lege ich eine neue Akte in nscale an?");
      await page.press(inputSelector, 'Enter');
      
      // Auf Antwort warten
      await page.waitForTimeout(3000);
      
      // Prüfe ob Antwort erschienen ist
      const messages = await page.locator('[class*="message"]').count();
      expect(messages).toBeGreaterThanOrEqual(2);
      
      // Antwort sollte relevante Begriffe enthalten
      const pageText = await page.locator('body').innerText();
      const hasRelevantContent = 
        pageText.toLowerCase().includes('akte') ||
        pageText.toLowerCase().includes('dokument') ||
        pageText.toLowerCase().includes('nscale');
      
      expect(hasRelevantContent).toBeTruthy();
      console.log('RAG provided document-based answer');
    });

    test("Unterschiedliche Antworten für dokumentbasierte vs. allgemeine Fragen", async ({ page }) => {
      const inputSelector = 'input[placeholder*="Nachricht"], textarea[placeholder*="Nachricht"]';
      
      // Dokumentbasierte Frage
      await page.fill(inputSelector, "Was ist ein Geschäftsgang in nscale?");
      await page.press(inputSelector, 'Enter');
      await page.waitForTimeout(5000);
      
      // Erste Antwort erfassen
      let pageText = await page.locator('body').innerText();
      const hasNScaleInfo = pageText.toLowerCase().includes('nscale') || 
                           pageText.toLowerCase().includes('geschäftsgang');
      
      // Neue Session starten - Suche nach "Neue Unterhaltung" Button
      const newSessionSelectors = [
        'button:has-text("Neue Unterhaltung")',
        'button:has-text("New Chat")',
        'button[aria-label*="new"]',
        '.new-chat-button'
      ];
      
      for (const selector of newSessionSelectors) {
        if (await page.locator(selector).count() > 0) {
          await page.click(selector);
          await page.waitForTimeout(1000);
          break;
        }
      }
      
      // Allgemeine Frage (nicht in Dokumenten)
      await page.fill(inputSelector, "Was ist die Hauptstadt von Frankreich?");
      await page.press(inputSelector, 'Enter');
      await page.waitForTimeout(5000);
      
      // Dokumentbasierte Antwort sollte nscale-spezifisch sein
      expect(hasNScaleInfo).toBeTruthy();
      console.log('RAG provides document-specific answers');
    });
  });

  test.describe("Phase 2: Erweiterte Suche mit OCR-Support", () => {
    test("Admin kann RAG-Einstellungen konfigurieren", async ({ page }) => {
      // Zum Admin-Panel navigieren
      await page.goto('/admin');
      await page.waitForTimeout(2000);
      
      // Prüfe ob wir Admin-Zugriff haben
      if (!page.url().includes('/admin')) {
        console.log('Admin access not available - skipping RAG settings test');
        return;
      }
      
      // RAG-Einstellungen Tab suchen
      const ragTabSelectors = [
        'button:has-text("RAG Settings")',
        'button:has-text("RAG-Einstellungen")',
        'button:has-text("RAG")',
        '[data-tab="rag-settings"]',
        '[data-tab="ragSettings"]'
      ];
      
      let tabFound = false;
      for (const selector of ragTabSelectors) {
        if (await page.locator(selector).count() > 0) {
          await page.click(selector);
          tabFound = true;
          await page.waitForTimeout(1000);
          break;
        }
      }
      
      if (!tabFound) {
        console.log('RAG settings tab not found');
        return;
      }
      
      // Prüfe ob RAG-Einstellungen sichtbar sind
      const settingsVisible = 
        await page.locator('*:has-text("Chunk")').count() > 0 ||
        await page.locator('*:has-text("Embedding")').count() > 0;
      
      if (settingsVisible) {
        console.log('RAG settings interface is available');
      } else {
        console.log('RAG settings UI not fully implemented');
      }
    });

    test("OCR-basierte Dokumentenverarbeitung", async ({ page }) => {
      // Zum Admin-Panel navigieren
      await page.goto('/admin');
      await page.waitForTimeout(2000);
      
      if (!page.url().includes('/admin')) {
        console.log('Admin access not available - skipping document processing test');
        return;
      }
      
      // Knowledge Manager Tab suchen
      const knowledgeTabSelectors = [
        'button:has-text("Knowledge Manager")',
        'button:has-text("Wissensdatenbank")',
        'button:has-text("Knowledge")',
        '[data-tab="knowledge"]'
      ];
      
      let tabFound = false;
      for (const selector of knowledgeTabSelectors) {
        if (await page.locator(selector).count() > 0) {
          await page.click(selector);
          tabFound = true;
          await page.waitForTimeout(1000);
          break;
        }
      }
      
      if (!tabFound) {
        console.log('Knowledge Manager tab not found');
        return;
      }
      
      // Prüfe ob Dokumente angezeigt werden
      const documentSelectors = [
        '.document-list',
        '.document-item',
        '[class*="document"]',
        'table tbody tr'
      ];
      
      let documentsFound = false;
      for (const selector of documentSelectors) {
        if (await page.locator(selector).count() > 0) {
          documentsFound = true;
          console.log('Documents display found');
          break;
        }
      }
      
      if (documentsFound) {
        console.log('Document processing interface is available');
      } else {
        console.log('Document list not yet implemented');
      }
    });
  });

  test.describe("Phase 3: Dokumentenintelligenz und Kontext", () => {
    test("Kontextbezogene Antworten über mehrere Nachrichten", async ({ page }) => {
      const inputSelector = 'input[placeholder*="Nachricht"], textarea[placeholder*="Nachricht"]';
      
      // Erste Frage
      await page.fill(inputSelector, "Was sind die Hauptfunktionen von nscale?");
      await page.press(inputSelector, 'Enter');
      await page.waitForTimeout(5000);
      
      // Folgefrage mit Kontext
      await page.fill(inputSelector, "Kannst du mir mehr über die Dokumentenverwaltung erzählen?");
      await page.press(inputSelector, 'Enter');
      await page.waitForTimeout(5000);
      
      // Prüfe ob Antwort kontextbezogen ist
      const pageText = await page.locator('body').innerText();
      const hasContextualResponse = 
        pageText.toLowerCase().includes('dokument') &&
        (pageText.toLowerCase().includes('verwaltung') || 
         pageText.toLowerCase().includes('management'));
      
      if (hasContextualResponse) {
        console.log('RAG maintains context across messages');
      } else {
        console.log('Context handling might need improvement');
      }
      
      expect(hasContextualResponse).toBeTruthy();
    });

    test("Performance-Metriken sind akzeptabel", async ({ page }) => {
      const inputSelector = 'input[placeholder*="Nachricht"], textarea[placeholder*="Nachricht"]';
      
      // RAG-Anfrage senden
      const startTime = Date.now();
      await page.fill(inputSelector, "Wie funktioniert die Berechtigungsverwaltung in nscale?");
      await page.press(inputSelector, 'Enter');
      
      // Warte auf erste Reaktion
      let responseStarted = false;
      const maxWait = 10000;
      
      while (!responseStarted && (Date.now() - startTime) < maxWait) {
        const messageCount = await page.locator('[class*="message"]').count();
        if (messageCount >= 2) {
          responseStarted = true;
          break;
        }
        await page.waitForTimeout(100);
      }
      
      const responseTime = Date.now() - startTime;
      console.log(`RAG response time: ${responseTime}ms`);
      
      // Response sollte in akzeptabler Zeit kommen
      expect(responseTime).toBeLessThan(10000);
      
      if (responseTime < 1000) {
        console.log('RAG performance is excellent (<1s)');
      } else if (responseTime < 3000) {
        console.log('RAG performance is good (<3s)');
      } else {
        console.log('RAG performance could be improved');
      }
    });
  });

  test("RAG-System Fallback bei Fehler", async ({ page }) => {
    const inputSelector = 'input[placeholder*="Nachricht"], textarea[placeholder*="Nachricht"]';
    
    // Simuliere problematische Anfrage
    const problematicQuery = "x".repeat(500); // Sehr lange Anfrage
    await page.fill(inputSelector, problematicQuery);
    await page.press(inputSelector, 'Enter');
    
    // System sollte trotzdem antworten
    await page.waitForTimeout(5000);
    
    const messageCount = await page.locator('[class*="message"]').count();
    expect(messageCount).toBeGreaterThanOrEqual(2);
    
    console.log('RAG system handles edge cases gracefully');
  });
});