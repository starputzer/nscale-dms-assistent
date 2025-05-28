#!/usr/bin/env node

/**
 * This script tests the Feature-Toggles tab in the admin panel.
 * It verifies that all components load correctly and that no console errors occur.
 */

const puppeteer = require("puppeteer");

async function testFeatureTogglesTab() {
  console.log("Starting Feature-Toggles tab test...");

  const browser = await puppeteer.launch({
    headless: false,
    args: ["--window-size=1280,800"],
  });

  try {
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error(`Console error: ${msg.text()}`);
      }
    });

    // Navigate to admin panel
    console.log("Navigating to admin panel...");
    await page.goto("http://localhost:3003/admin", {
      waitUntil: "networkidle2",
    });

    // Wait for login if needed
    if (await page.url().includes("login")) {
      console.log("Login page detected, attempting to log in...");
      await page.waitForSelector('input[type="text"]');
      await page.type('input[type="text"]', "admin");
      await page.type('input[type="password"]', "admin");
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: "networkidle2" });
    }

    // Wait for admin panel to load
    await page.waitForSelector(".admin-panel");
    console.log("Admin panel loaded successfully.");

    // Find and click the Feature-Toggles tab
    console.log("Locating Feature-Toggles tab...");
    const featureTogglesTab = await page.$$(".admin-panel__nav-item");

    // Find tab with text containing "Feature" or "Toggles"
    let togglesTab = null;
    for (const tab of featureTogglesTab) {
      const text = await page.evaluate((el) => el.textContent, tab);
      if (text.includes("Feature") || text.includes("Toggle")) {
        togglesTab = tab;
        break;
      }
    }

    if (!togglesTab) {
      throw new Error("Feature-Toggles tab not found");
    }

    console.log("Clicking on Feature-Toggles tab...");
    await togglesTab.click();

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: "feature-toggles-tab.png", fullPage: true });

    // Check for error messages
    const hasError = await page.evaluate(() => {
      const errorElement = document.querySelector(".admin-panel__error");
      return errorElement && errorElement.style.display !== "none";
    });

    if (hasError) {
      const errorMessage = await page.evaluate(() => {
        const errorElement = document.querySelector(".admin-panel__error");
        return errorElement ? errorElement.textContent.trim() : "Unknown error";
      });
      console.error(
        `❌ Error detected on Feature-Toggles tab: ${errorMessage}`,
      );
    } else {
      console.log("✅ Feature-Toggles tab loaded without errors.");

      // Check if specific Feature-Toggles components are rendered
      const hasComponents = await page.evaluate(() => {
        // Look for key components that should be present
        const hasTogglesList = !!document.querySelector(
          ".admin-feature-toggles-enhanced__features",
        );
        const hasManagementView = !!document.querySelector(
          ".admin-feature-toggles-enhanced__management",
        );

        return {
          hasTogglesList,
          hasManagementView,
        };
      });

      if (hasComponents.hasTogglesList) {
        console.log("✅ Feature toggles list component is present.");
      } else {
        console.warn("⚠️ Feature toggles list component not found.");
      }

      if (hasComponents.hasManagementView) {
        console.log("✅ Management view component is present.");
      } else {
        console.warn("⚠️ Management view component not found.");
      }
    }

    console.log("\nFeature-Toggles tab test completed.");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    // Keep browser open for manual inspection
    console.log("\nBrowser will remain open for inspection.");
    console.log("Press Ctrl+C to close the browser and exit.");
  }
}

testFeatureTogglesTab();
