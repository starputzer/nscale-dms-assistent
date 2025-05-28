#!/usr/bin/env node

/**
 * Dieses Skript testet das modernisierte Admin-Panel.
 */

const puppeteer = require("puppeteer");

async function testModernAdmin() {
  console.log("Starte Test des modernisierten Admin-Panels...");

  const browser = await puppeteer.launch({
    headless: false,
    args: ["--window-size=1280,800"],
  });

  try {
    const page = await browser.newPage();

    // Viewport einstellen
    await page.setViewport({ width: 1280, height: 800 });

    // Navigiere zum Admin-Panel
    console.log("Navigiere zum Admin-Panel...");
    await page.goto("http://localhost:3003/admin", {
      waitUntil: "networkidle2",
    });

    // Warte auf Login falls nötig
    if (await page.url().includes("login")) {
      console.log("Login-Seite erkannt, versuche einzuloggen...");
      await page.waitForSelector('input[type="text"]');
      await page.type('input[type="text"]', "admin");
      await page.type('input[type="password"]', "admin");
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: "networkidle2" });
    }

    // Warte auf das Admin-Panel
    await page.waitForSelector(".admin-panel");
    console.log("Admin-Panel erfolgreich geladen.");

    // Screenshot erstellen
    await page.screenshot({ path: "modern-admin-panel.png", fullPage: true });
    console.log("Screenshot erstellt: modern-admin-panel.png");

    // Überprüfe die Darstellung der Navigation
    const navButtonStyle = await page.evaluate(() => {
      const navButton = document.querySelector(".admin-panel__nav-item");
      if (!navButton) return null;

      const styles = window.getComputedStyle(navButton);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderRadius: styles.borderRadius,
        padding: styles.padding,
        fontWeight: styles.fontWeight,
      };
    });

    console.log("Navigationsstil:", navButtonStyle);

    // Überprüfe den Stil des aktiven Navigations-Tabs
    const activeNavButtonStyle = await page.evaluate(() => {
      const activeNavButton = document.querySelector(
        ".admin-panel__nav-item--active",
      );
      if (!activeNavButton) return null;

      const styles = window.getComputedStyle(activeNavButton);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderLeft: styles.borderLeft,
      };
    });

    console.log("Aktiver Tab-Stil:", activeNavButtonStyle);

    // Klicke auf jeden Tab und mache Screenshots
    const tabButtons = await page.$$(".admin-panel__nav-item");

    for (let i = 0; i < tabButtons.length; i++) {
      const tabName = await page.evaluate(
        (el) => el.textContent.trim(),
        tabButtons[i],
      );
      console.log(`Teste Tab: ${tabName}...`);

      // Klicke auf Tab
      await tabButtons[i].click();

      // Warte auf Inhaltsladung
      await page.waitForTimeout(1000);

      // Erstelle Screenshot
      await page.screenshot({
        path: `modern-admin-tab-${i}-${tabName.replace(/\s+/g, "-").toLowerCase()}.png`,
      });
    }

    console.log("\nTest des modernisierten Admin-Panels abgeschlossen.");
  } catch (error) {
    console.error("Test fehlgeschlagen:", error);
  } finally {
    // Browser offen lassen zur manuellen Überprüfung
    console.log("\nBrowser bleibt zur Überprüfung geöffnet.");
    console.log("Drücke Ctrl+C zum Schließen des Browsers und Beenden.");
  }
}

testModernAdmin();
