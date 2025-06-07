# Test info

- Name: Complete Login Flow >> Kann Feedback geben
- Location: /opt/nscale-assist/app/e2e/tests/simple-complete-login.spec.ts:25:3

# Error details

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.message.assistant') to be visible

    at /opt/nscale-assist/app/e2e/tests/simple-complete-login.spec.ts:38:16
```

# Page snapshot

```yaml
- banner:
  - img
  - heading "Digitale Akte Assistent" [level=1]
  - button "MA":
    - text: MA
    - img
- complementary:
  - navigation:
    - button "Chat":
      - img
      - text: Chat
    - button "Hilfe":
      - img
      - text: Hilfe
  - heading "Unterhaltungen" [level=3]
  - button "Neue Unterhaltung":
    - img
    - text: Neue Unterhaltung
  - text: Testtetssat
  - button "Unterhaltung löschen":
    - img
  - text: Hallo Asfsaffas
  - button "Unterhaltung löschen":
    - img
  - text: Test
  - button "Unterhaltung löschen":
    - img
  - text: Heyho
  - button "Unterhaltung löschen":
    - img
  - text: Neue Unterhaltung
  - button "Unterhaltung löschen":
    - img
- main:
  - heading "Neue Unterhaltung" [level=2]
  - text: M Sie Invalid Date Test-Nachricht für Feedback
  - textbox "Nachricht eingeben..."
  - button [disabled]:
    - img
```

# Test source

```ts
   1 | import { test, expect } from "@playwright/test";
   2 |
   3 | test.describe("Complete Login Flow", () => {
   4 |   test("Kann sich erfolgreich anmelden", async ({ page }) => {
   5 |     // Zur Login-Seite navigieren
   6 |     await page.goto("/login");
   7 |     
   8 |     // Formular ausfüllen
   9 |     await page.fill('input#email', 'martin@danglefeet.com');
  10 |     await page.fill('input#password', '123');
  11 |     
  12 |     // Submit
  13 |     await page.click('button[type="submit"]');
  14 |     
  15 |     // Warten auf Navigation
  16 |     await page.waitForURL('/chat');
  17 |     
  18 |     // Prüfen ob wir auf der Chat-Seite sind
  19 |     await expect(page).toHaveURL('/chat');
  20 |     
  21 |     // Prüfen ob Chat-View vorhanden ist
  22 |     await expect(page.locator('.chat-view')).toBeVisible();
  23 |   });
  24 |
  25 |   test("Kann Feedback geben", async ({ page }) => {
  26 |     // Login
  27 |     await page.goto("/login");
  28 |     await page.fill('input#email', 'martin@danglefeet.com');
  29 |     await page.fill('input#password', '123');
  30 |     await page.click('button[type="submit"]');
  31 |     await page.waitForURL('/chat');
  32 |     
  33 |     // Nachricht senden
  34 |     await page.fill('input.message-input', 'Test-Nachricht für Feedback');
  35 |     await page.press('input.message-input', 'Enter');
  36 |     
  37 |     // Auf Antwort warten
> 38 |     await page.waitForSelector('.message.assistant', { timeout: 30000 });
     |                ^ Error: page.waitForSelector: Test timeout of 30000ms exceeded.
  39 |     
  40 |     // Feedback-Buttons sollten sichtbar sein
  41 |     const feedbackButtons = await page.$$('.message.assistant .feedback-buttons button');
  42 |     expect(feedbackButtons.length).toBe(2);
  43 |     
  44 |     // Positives Feedback geben
  45 |     await feedbackButtons[0].click();
  46 |     
  47 |     // Erfolgsbestätigung sollte erscheinen
  48 |     await expect(page.locator('.feedback-confirmation, .toast-success')).toBeVisible({ timeout: 5000 });
  49 |   });
  50 | });
```