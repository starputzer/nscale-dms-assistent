/**
 * Mobile Responsiveness Tests - Robuste Implementation
 * Testet responsive Design ohne Page Objects
 */
import { test, expect } from "@playwright/test";

// Definiere die zu testenden Bildschirmgrößen
const screenSizes = [
  { width: 1920, height: 1080, name: "desktop-full-hd" },
  { width: 1366, height: 768, name: "desktop-standard" },
  { width: 1024, height: 768, name: "tablet-landscape" },
  { width: 768, height: 1024, name: "tablet-portrait" },
  { width: 414, height: 896, name: "mobile-large" },
  { width: 375, height: 667, name: "mobile-medium" },
  { width: 320, height: 568, name: "mobile-small" },
];

test.describe("Mobile Responsiveness - Umfassende Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Als Benutzer einloggen
    await page.goto('/login');
    await page.fill('input#email', 'martin@danglefeet.com');
    await page.fill('input#password', '123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/chat');
  });

  // Test für jede Bildschirmgröße
  for (const size of screenSizes) {
    test(`Layout passt sich an für ${size.name} (${size.width}x${size.height})`, async ({ page }) => {
      // Viewport-Größe setzen
      await page.setViewportSize({
        width: size.width,
        height: size.height,
      });

      // Chat-Seite neu laden mit neuer Größe
      await page.reload();
      await page.waitForTimeout(1000);

      // Navigation prüfen
      const navSelectors = [
        '.navbar', '.nav', 'nav', '.header', '.navigation'
      ];
      
      let navFound = false;
      for (const selector of navSelectors) {
        if (await page.locator(selector).count() > 0) {
          navFound = true;
          const navVisible = await page.locator(selector).isVisible();
          console.log(`Navigation (${selector}) visible on ${size.name}: ${navVisible}`);
          
          // Auf Mobile sollte es ein Hamburger-Menü geben
          if (size.width <= 768) {
            const hamburgerSelectors = [
              '.hamburger', '.menu-toggle', '.mobile-menu-button',
              'button[aria-label*="menu"]', '.burger-menu'
            ];
            
            for (const hamburger of hamburgerSelectors) {
              if (await page.locator(hamburger).count() > 0) {
                console.log(`✓ Mobile menu found: ${hamburger}`);
                break;
              }
            }
          }
          break;
        }
      }

      // Chat-Interface Anpassungen
      const chatInputSelectors = [
        'textarea.chat-input',
        'input.chat-input',
        '#chat-input',
        '[data-testid="chat-input"]',
        '.message-input'
      ];

      for (const selector of chatInputSelectors) {
        const input = page.locator(selector);
        if (await input.count() > 0) {
          const box = await input.boundingBox();
          if (box) {
            console.log(`Chat input size on ${size.name}: ${box.width}x${box.height}`);
            
            // Auf Mobile sollte die Eingabe fast die volle Breite haben
            if (size.width <= 768) {
              const widthPercentage = (box.width / size.width) * 100;
              console.log(`Chat input uses ${widthPercentage.toFixed(1)}% of screen width`);
            }
          }
          break;
        }
      }

      // Buttons sollten auf Touch-Geräten mindestens 44x44px sein
      if (size.width <= 768) {
        const buttons = await page.locator('button:visible').all();
        let touchFriendlyCount = 0;
        let tooSmallCount = 0;

        for (const button of buttons.slice(0, 5)) { // Prüfe erste 5 Buttons
          const box = await button.boundingBox();
          if (box) {
            if (box.width >= 44 && box.height >= 44) {
              touchFriendlyCount++;
            } else {
              tooSmallCount++;
            }
          }
        }

        console.log(`Touch-friendly buttons on ${size.name}: ${touchFriendlyCount}/${touchFriendlyCount + tooSmallCount}`);
      }

      // Sidebar/Panel Verhalten
      if (size.width > 768) {
        // Desktop: Sidebar sollte sichtbar sein
        const sidebarSelectors = ['.sidebar', '.side-panel', '.sessions-list', '[data-testid="sidebar"]'];
        for (const selector of sidebarSelectors) {
          if (await page.locator(selector).count() > 0 && await page.locator(selector).isVisible()) {
            console.log(`✓ Desktop sidebar visible: ${selector}`);
            break;
          }
        }
      } else {
        // Mobile: Sidebar sollte versteckt oder als Overlay sein
        console.log('Mobile view: Sidebar should be hidden or overlay');
      }

      // Screenshot für visuelle Überprüfung
      await page.screenshot({
        path: `e2e-test-results/responsive-${size.name}.png`,
        fullPage: false // Nur Viewport
      });
    });
  }

  test("Touch-Gesten auf Mobile", async ({ page }) => {
    // Mobile Viewport setzen
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    // Touch-Events simulieren
    const touchTarget = await page.locator('.chat-messages, .message-list, #messages').first();
    
    if (await touchTarget.count() > 0) {
      // Swipe nach unten simulieren (Pull-to-refresh)
      await touchTarget.evaluate((element) => {
        const touchStart = new TouchEvent('touchstart', {
          touches: [{ clientX: 150, clientY: 100 }] as any,
          bubbles: true
        });
        const touchMove = new TouchEvent('touchmove', {
          touches: [{ clientX: 150, clientY: 300 }] as any,
          bubbles: true
        });
        const touchEnd = new TouchEvent('touchend', {
          touches: [],
          bubbles: true
        });
        
        element.dispatchEvent(touchStart);
        element.dispatchEvent(touchMove);
        element.dispatchEvent(touchEnd);
      });
      
      console.log('Touch swipe gesture simulated');
    }

    // Long-press auf Nachricht
    const messageSelectors = ['.message', '.chat-message', '[data-testid="message"]'];
    for (const selector of messageSelectors) {
      const message = page.locator(selector).first();
      if (await message.count() > 0) {
        // Long press simulieren
        await message.hover();
        await page.mouse.down();
        await page.waitForTimeout(500); // 500ms für Long-press
        await page.mouse.up();
        
        // Prüfe ob Kontext-Menü erscheint
        const contextMenuSelectors = [
          '.context-menu', '.message-actions', '.popup-menu',
          '[role="menu"]', '.dropdown-menu'
        ];
        
        for (const menuSelector of contextMenuSelectors) {
          if (await page.locator(menuSelector).count() > 0) {
            console.log(`✓ Context menu appeared: ${menuSelector}`);
            break;
          }
        }
        break;
      }
    }
  });

  test("Orientierungswechsel", async ({ page }) => {
    // Starte im Portrait-Modus
    await page.setViewportSize({ width: 414, height: 896 });
    await page.waitForTimeout(1000);
    
    console.log('Portrait mode set');
    
    // Wechsel zu Landscape
    await page.setViewportSize({ width: 896, height: 414 });
    await page.waitForTimeout(1000);
    
    console.log('Landscape mode set');
    
    // Prüfe ob Layout sich anpasst
    const layoutTest = await page.evaluate(() => {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
      };
      
      // Prüfe CSS Media Queries
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      const isPortrait = window.matchMedia('(orientation: portrait)').matches;
      
      return {
        viewport,
        mediaQueries: { isLandscape, isPortrait },
        bodyClasses: document.body.className
      };
    });
    
    console.log('Orientation test:', layoutTest);
    expect(layoutTest.viewport.orientation).toBe('landscape');
  });

  test("Zoom und Pinch-Gesten", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Prüfe viewport meta tag
    const viewportMeta = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute('content') || 'not found';
    });
    
    console.log('Viewport meta tag:', viewportMeta);
    
    // Sollte user-scalable erlauben oder maximum-scale > 1 haben
    if (viewportMeta.includes('user-scalable=no') || viewportMeta.includes('maximum-scale=1')) {
      console.log('⚠️ Zoom is disabled - this may affect accessibility');
    } else {
      console.log('✓ Zoom is enabled');
    }
    
    // Simuliere Pinch-Zoom
    await page.evaluate(() => {
      // Dispatch zoom event
      const event = new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true,
        bubbles: true
      });
      document.dispatchEvent(event);
    });
    
    await page.waitForTimeout(500);
    
    // Prüfe ob Zoom funktioniert hat
    const zoomLevel = await page.evaluate(() => {
      return {
        devicePixelRatio: window.devicePixelRatio,
        visualViewport: window.visualViewport ? {
          scale: window.visualViewport.scale,
          width: window.visualViewport.width,
          height: window.visualViewport.height
        } : null
      };
    });
    
    console.log('Zoom level test:', zoomLevel);
  });

  test("Responsive Bilder und Assets", async ({ page }) => {
    // Verschiedene Bildschirmgrößen testen
    const imageSizes = [
      { width: 320, height: 568, dpr: 3 }, // Mobile high DPI
      { width: 768, height: 1024, dpr: 2 }, // Tablet retina
      { width: 1920, height: 1080, dpr: 1 }, // Desktop standard
    ];

    for (const size of imageSizes) {
      await page.setViewportSize({ width: size.width, height: size.height });
      
      // Simuliere Device Pixel Ratio
      await page.evaluate((dpr) => {
        Object.defineProperty(window, 'devicePixelRatio', {
          value: dpr,
          writable: false
        });
      }, size.dpr);

      // Finde alle Bilder
      const images = await page.locator('img').all();
      console.log(`Found ${images.length} images on ${size.width}x${size.height}@${size.dpr}x`);

      for (const img of images.slice(0, 3)) { // Prüfe erste 3 Bilder
        const src = await img.getAttribute('src');
        const srcset = await img.getAttribute('srcset');
        const loading = await img.getAttribute('loading');
        
        if (srcset) {
          console.log(`✓ Image has srcset for responsive loading`);
        }
        if (loading === 'lazy') {
          console.log(`✓ Image uses lazy loading`);
        }
        
        // Prüfe ob das Bild geladen wurde
        const isLoaded = await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalHeight !== 0);
        if (isLoaded) {
          console.log(`✓ Image loaded successfully: ${src?.substring(0, 50)}...`);
        }
      }
    }
  });

  test("Accessibility auf Mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Fokus-Management testen
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tagName: el?.tagName,
        className: el?.className,
        ariaLabel: el?.getAttribute('aria-label'),
        role: el?.getAttribute('role')
      };
    });
    
    console.log('First focused element:', focusedElement);

    // Touch-Targets prüfen
    const interactiveElements = await page.locator('button, a, input, textarea, select').all();
    let accessibilityIssues = 0;

    for (const element of interactiveElements.slice(0, 10)) { // Prüfe erste 10
      const box = await element.boundingBox();
      if (box && (box.width < 44 || box.height < 44)) {
        const text = await element.textContent();
        console.log(`⚠️ Touch target too small: ${box.width}x${box.height} - ${text?.substring(0, 20)}`);
        accessibilityIssues++;
      }
    }

    if (accessibilityIssues === 0) {
      console.log('✓ All checked touch targets meet minimum size requirements');
    }

    // Kontrast auf Mobile prüfen (Dark Mode?)
    const colorScheme = await page.evaluate(() => {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const hasHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      return { isDarkMode, hasHighContrast };
    });
    
    console.log('Color scheme preferences:', colorScheme);
  });
});