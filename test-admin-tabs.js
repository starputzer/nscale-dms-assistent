#!/usr/bin/env node

/**
 * This script tests all admin panel tabs to ensure they're working properly.
 * It simulates clicking on each tab and checks if the component renders without errors.
 */

const puppeteer = require("puppeteer");

async function testAdminTabs() {
  console.log("Starting admin panel tabs test...");

  const browser = await puppeteer.launch({
    headless: false,
    args: ["--window-size=1280,800"],
  });

  try {
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });

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

    // Get all tab buttons
    const tabButtons = await page.$$(".admin-panel__nav-item");
    console.log(`Found ${tabButtons.length} admin tabs.`);

    // Click each tab and check for errors
    for (let i = 0; i < tabButtons.length; i++) {
      // Get tab name
      const tabName = await page.evaluate(
        (el) => el.textContent.trim(),
        tabButtons[i],
      );
      console.log(`Testing tab: ${tabName}...`);

      // Click tab
      await tabButtons[i].click();

      // Wait for content to load
      await page.waitForTimeout(1000);

      // Check for error message
      const hasError = await page.evaluate(() => {
        const errorElement = document.querySelector(".admin-panel__error");
        return errorElement && errorElement.style.display !== "none";
      });

      if (hasError) {
        console.error(`❌ Error detected on tab: ${tabName}`);

        // Get error message
        const errorMessage = await page.evaluate(() => {
          const errorElement = document.querySelector(".admin-panel__error");
          return errorElement
            ? errorElement.textContent.trim()
            : "Unknown error";
        });

        console.error(`   Error message: ${errorMessage}`);
      } else {
        console.log(`✅ Tab "${tabName}" loaded successfully.`);
      }

      // Take screenshot
      await page.screenshot({
        path: `admin-tab-${i}-${tabName.replace(/\s+/g, "-").toLowerCase()}.png`,
      });
    }

    console.log("\nAdmin panel tabs test completed.");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    // Keep browser open for manual inspection
    console.log("\nBrowser will remain open for inspection.");
    console.log("Press Ctrl+C to close the browser and exit.");
  }
}

testAdminTabs();
