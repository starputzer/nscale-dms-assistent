/**
 * Helper-Funktionen für die Simulation von Touch-Interaktionen in Tests
 */
import { Page, Locator, BrowserContext } from '@playwright/test';

/**
 * Konfiguriert den Browser-Kontext für die Simulation eines mobilen Geräts
 * @param context Der Browser-Kontext
 * @param deviceName Optionaler Gerätename (z.B. 'iPhone 12')
 */
export async function setupMobileContext(context: BrowserContext, deviceName?: string): Promise<void> {
  // Wenn ein spezifisches Gerät ausgewählt wurde, Geräteeigenschaften anwenden
  if (deviceName) {
    const device = devices[deviceName];
    if (device) {
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'userAgent', { value: device.userAgent });
        window.innerWidth = device.viewport.width;
        window.innerHeight = device.viewport.height;
        window.screen = {
          ...window.screen,
          width: device.viewport.width,
          height: device.viewport.height,
          availWidth: device.viewport.width,
          availHeight: device.viewport.height
        };
        // Touch-Unterstützung hinzufügen
        Object.defineProperty(navigator, 'maxTouchPoints', { value: 5 });
      });
    }
  } else {
    // Standard-Touch-Unterstützung hinzufügen
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 5 });
    });
  }
}

/**
 * Simuliert eine Swipe-Geste auf einem Element
 * @param page Die Playwright-Page
 * @param locator Der Locator für das Element, auf dem die Swipe-Geste ausgeführt werden soll
 * @param direction Die Richtung der Swipe-Geste ('left', 'right', 'up', 'down')
 * @param steps Die Anzahl der Zwischenschritte (höhere Werte für langsamere Swipes)
 */
export async function swipe(
  page: Page, 
  locator: Locator, 
  direction: 'left' | 'right' | 'up' | 'down', 
  steps: number = 10
): Promise<void> {
  const box = await locator.boundingBox();
  
  if (!box) {
    throw new Error('Element ist nicht sichtbar oder hat keine Größe');
  }
  
  let startX: number, startY: number, endX: number, endY: number;
  
  switch (direction) {
    case 'left':
      startX = box.x + box.width * 0.8;
      endX = box.x + box.width * 0.2;
      startY = endY = box.y + box.height / 2;
      break;
    case 'right':
      startX = box.x + box.width * 0.2;
      endX = box.x + box.width * 0.8;
      startY = endY = box.y + box.height / 2;
      break;
    case 'up':
      startX = endX = box.x + box.width / 2;
      startY = box.y + box.height * 0.8;
      endY = box.y + box.height * 0.2;
      break;
    case 'down':
      startX = endX = box.x + box.width / 2;
      startY = box.y + box.height * 0.2;
      endY = box.y + box.height * 0.8;
      break;
  }
  
  // Touch-Sequenz simulieren
  await page.touchscreen.tap(startX, startY);
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  
  // Schrittweise Bewegung für realistischere Simulation
  const stepX = (endX - startX) / steps;
  const stepY = (endY - startY) / steps;
  
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      startX + stepX * i,
      startY + stepY * i,
      { steps: 1 }
    );
  }
  
  await page.mouse.up();
}

/**
 * Simuliert einen Tap/Touch auf einem Element
 * @param page Die Playwright-Page
 * @param locator Der Locator für das Element
 * @param x Optionale X-Koordinate (relativ zum Element, 0.5 ist Mitte)
 * @param y Optionale Y-Koordinate (relativ zum Element, 0.5 ist Mitte)
 */
export async function tap(
  page: Page, 
  locator: Locator,
  x: number = 0.5, 
  y: number = 0.5
): Promise<void> {
  const box = await locator.boundingBox();
  
  if (!box) {
    throw new Error('Element ist nicht sichtbar oder hat keine Größe');
  }
  
  const tapX = box.x + box.width * x;
  const tapY = box.y + box.height * y;
  
  await page.touchscreen.tap(tapX, tapY);
}

/**
 * Simuliert einen doppelten Tap/Touch auf einem Element
 * @param page Die Playwright-Page
 * @param locator Der Locator für das Element
 */
export async function doubleTap(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox();
  
  if (!box) {
    throw new Error('Element ist nicht sichtbar oder hat keine Größe');
  }
  
  const tapX = box.x + box.width / 2;
  const tapY = box.y + box.height / 2;
  
  await page.touchscreen.tap(tapX, tapY);
  
  // Kurze Verzögerung für realistischeren Doppel-Tap
  await page.waitForTimeout(100);
  
  await page.touchscreen.tap(tapX, tapY);
}

/**
 * Simuliert einen langen Tap/Touch auf einem Element (Long Press)
 * @param page Die Playwright-Page
 * @param locator Der Locator für das Element
 * @param duration Dauer des langen Taps in Millisekunden (Standard: 1000ms)
 */
export async function longPress(
  page: Page, 
  locator: Locator, 
  duration: number = 1000
): Promise<void> {
  const box = await locator.boundingBox();
  
  if (!box) {
    throw new Error('Element ist nicht sichtbar oder hat keine Größe');
  }
  
  const pressX = box.x + box.width / 2;
  const pressY = box.y + box.height / 2;
  
  // Touch-Down-Event
  await page.touchscreen.tap(pressX, pressY);
  await page.mouse.move(pressX, pressY);
  await page.mouse.down();
  
  // Warten für die angegebene Dauer
  await page.waitForTimeout(duration);
  
  // Touch-Up-Event
  await page.mouse.up();
}

/**
 * Simuliert das Pinch-to-Zoom-Gesture (zwei Finger ziehen auseinander)
 * @param page Die Playwright-Page
 * @param locator Der Locator für das Element
 * @param scale Faktor, um den gezoomt werden soll (>1 für Zoom-In, <1 für Zoom-Out)
 */
export async function pinchZoom(
  page: Page,
  locator: Locator,
  scale: number = 2.0
): Promise<void> {
  const box = await locator.boundingBox();
  
  if (!box) {
    throw new Error('Element ist nicht sichtbar oder hat keine Größe');
  }
  
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  
  // Pinch-Gesture durch JavaScript-Eventauslösung simulieren
  await page.evaluate(({ centerX, centerY, scale }) => {
    // Einziger Weg, Pinch-Zoom in Playwright zu simulieren, ist über JS-Events
    const touchStartEvent = new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [
        new Touch({
          identifier: 0,
          target: document.elementFromPoint(centerX - 50, centerY - 50) || document.body,
          clientX: centerX - 50,
          clientY: centerY - 50,
          pageX: centerX - 50,
          pageY: centerY - 50
        }),
        new Touch({
          identifier: 1,
          target: document.elementFromPoint(centerX + 50, centerY + 50) || document.body,
          clientX: centerX + 50,
          clientY: centerY + 50,
          pageX: centerX + 50,
          pageY: centerY + 50
        })
      ]
    });
    
    document.elementFromPoint(centerX, centerY)?.dispatchEvent(touchStartEvent);
    
    // Simuliere Bewegung mit Zoom-Faktor
    const touchMoveEvent = new TouchEvent('touchmove', {
      bubbles: true,
      cancelable: true,
      touches: [
        new Touch({
          identifier: 0,
          target: document.elementFromPoint(centerX - 50 * scale, centerY - 50 * scale) || document.body,
          clientX: centerX - 50 * scale,
          clientY: centerY - 50 * scale,
          pageX: centerX - 50 * scale,
          pageY: centerY - 50 * scale
        }),
        new Touch({
          identifier: 1,
          target: document.elementFromPoint(centerX + 50 * scale, centerY + 50 * scale) || document.body,
          clientX: centerX + 50 * scale,
          clientY: centerY + 50 * scale,
          pageX: centerX + 50 * scale,
          pageY: centerY + 50 * scale
        })
      ]
    });
    
    document.elementFromPoint(centerX, centerY)?.dispatchEvent(touchMoveEvent);
    
    // Touch-Ende
    const touchEndEvent = new TouchEvent('touchend', {
      bubbles: true,
      cancelable: true,
      touches: []
    });
    
    document.elementFromPoint(centerX, centerY)?.dispatchEvent(touchEndEvent);
  }, { centerX, centerY, scale });
}

/**
 * Überprüft, ob ein Element eine ausreichende Größe für Touch-Interaktionen hat
 * @param locator Der Locator für das Element
 * @returns Promise<boolean> - True, wenn das Element die Mindestanforderungen erfüllt
 */
export async function hasSufficientTouchTargetSize(locator: Locator): Promise<boolean> {
  const box = await locator.boundingBox();
  
  if (!box) {
    return false;
  }
  
  // WCAG-Richtlinien empfehlen mindestens 44x44px
  return box.width >= 44 && box.height >= 44;
}

// Vordefinierte mobile Geräte-Konfigurationen
export const devices = {
  'iPhone SE': {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    viewport: {
      width: 375,
      height: 667
    }
  },
  'iPhone 12': {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    viewport: {
      width: 390,
      height: 844
    }
  },
  'iPad': {
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    viewport: {
      width: 768,
      height: 1024
    }
  },
  'Galaxy S20': {
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G980F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.50 Mobile Safari/537.36',
    viewport: {
      width: 360,
      height: 800
    }
  }
};