import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright-Konfiguration für E2E-Tests des nScale DMS Assistenten.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Verzeichnis mit den Testdateien
  testDir: "./e2e",

  // Muster, um Testdateien zu finden
  testMatch: "**/*.spec.ts",

  // Maximale Anzahl von fehlschlagenden Tests, bevor die Ausführung abgebrochen wird
  fullyParallel: true,
  forbidOnly: !!process.env.CI,

  // Neuversuche im CI besonders wichtig für Stabilität
  retries: process.env.CI ? 2 : 1,

  // Worker-Anzahl je nach Umgebung anpassen
  workers: process.env.CI ? 2 : undefined,

  // Reporter für Testergebnisse
  reporter: [
    // Standard-Reporter für Konsole
    ["list", { printSteps: true }],
    // HTML-Reporter für detaillierte Ansicht
    [
      "html",
      {
        outputFolder: "e2e-test-results/html",
        open: process.env.CI ? "never" : "on-failure",
      },
    ],
    // JUnit-Reporter für CI-Integration
    [
      "junit",
      {
        outputFile: "e2e-test-results/junit/results.xml",
        embedAnnotationsAsProperties: true,
      },
    ],
  ],

  // Gemeinsame Einstellungen
  use: {
    // Traces für alle Tests im CI, oder bei Fehler im Development
    trace: process.env.CI ? "on" : "on-first-retry",

    // Screenshots nur bei Fehlern
    screenshot: "only-on-failure",

    // Video für Debug-Zwecke
    video: process.env.CI ? "on-first-retry" : "on-failure",

    // Base URL aus Umgebungsvariablen oder Standardwert
    baseURL: process.env.BASE_URL || "http://localhost:3001",

    // Erhöhte Timeouts für Stabilität
    actionTimeout: 15000,
    navigationTimeout: 30000,

    // Langsame Tests im Development-Modus für bessere Sichtbarkeit
    launchOptions: {
      slowMo: process.env.CI ? 0 : 250,
    },

    // Accessibility Testing aktivieren
    bypassCSP: true,

    // Chrome DevTools für Debugging (nur im dev-mode)
    devtools: !process.env.CI,

    // Automatisches Warten auf bestimmte Netzwerkereignisse
    networkIdleTimeout: 1000,

    // Automatisches Warten auf DOM-Events
    waitForNavigation: "domcontentloaded",

    // Viewport-Standardgröße (für Desktop)
    viewport: { width: 1280, height: 720 },

    // HTTP-Credentials vorausfüllen
    httpCredentials: process.env.CI
      ? {
          username: process.env.HTTP_USERNAME || "",
          password: process.env.HTTP_PASSWORD || "",
        }
      : undefined,

    // Automatische Ignorierung von HTTPS-Zertifikatsfehlern
    ignoreHTTPSErrors: true,
  },

  // Konfiguration für den Testserver
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3001",
    reuseExistingServer: true, // Verwende existierenden Server
    timeout: 120 * 1000, // 2 Minuten Timeout für Serverstart
    stdout: "pipe",
    stderr: "pipe",
  },

  // Global setup, der vor den Tests ausgeführt wird
  globalSetup: "./e2e/global-setup.ts",

  // Ausgabeverzeichnis für Artefakte
  outputDir: "e2e-test-results/artifacts",

  // Konfiguration für verschiedene Browser und Geräte
  projects: [
    // Desktop-Browser
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["geolocation", "notifications"],
      },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    // Mobile-Geräte
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
        // Zusätzliche mobile spezifische Einstellungen
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "mobile-safari",
      use: {
        ...devices["iPhone 14"],
        // Zusätzliche mobile spezifische Einstellungen
        isMobile: true,
        hasTouch: true,
      },
    },

    // Spezielle Accessibility-Tests
    {
      name: "accessibility",
      use: {
        ...devices["Desktop Chrome"],
        // A11y-spezifische Einstellungen
        colorScheme: "dark",
        reducedMotion: "reduce",
        forcedColors: "active",
      },
      testMatch: "**/*.a11y.spec.ts",
    },

    // Visuelle Regressionstests
    {
      name: "visual-regression",
      use: {
        ...devices["Desktop Chrome"],
        // Für visuelle Tests immer Screenshots machen
        screenshot: "on",
      },
      testMatch: "**/*.visual.spec.ts",
    },
  ],

  // Expect-Optionen für Vergleiche
  expect: {
    timeout: 10000,
    toMatchSnapshot: {
      // Threshold für Pixelvergleiche bei visuellen Tests
      threshold: 0.2,
    },
  },

  // Einstellungen für Timestamps in Berichten
  metadata: {
    // Detaillierte Zeitstempel in Reports
    timestamp: new Date().toISOString(),
    revision: process.env.GIT_REVISION || "unknown",
  },
});
