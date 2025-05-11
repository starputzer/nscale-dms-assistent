# Mobile Testing Utilities

This directory contains utilities for testing mobile and touch interactions in the application.

## Available Utilities

### Mobile Touch Helper (`mobile-touch-helper.ts`)

Provides functions to simulate and test touch interactions:

- `setupMobileContext`: Configures the browser context for mobile device simulation
- `swipe`: Simulates a swipe gesture on an element (left, right, up, down)
- `tap`: Simulates a tap/touch on an element
- `doubleTap`: Simulates a double tap on an element
- `longPress`: Simulates a long press (press and hold) on an element
- `pinchZoom`: Simulates a pinch-to-zoom gesture
- `hasSufficientTouchTargetSize`: Checks if an element meets accessibility touch size requirements

### Predefined Devices

The helper includes configurations for popular mobile devices:

- iPhone SE
- iPhone 12
- iPad
- Galaxy S20

## Usage Examples

### Setting up a Mobile Test

```typescript
import { test } from '@playwright/test';
import { setupMobileContext, devices } from '../utils/mobile-touch-helper';

test.beforeEach(async ({ context }) => {
  // Configure context for iPhone 12
  await setupMobileContext(context, 'iPhone 12');
});
```

### Simulating Touch Gestures

```typescript
import { swipe, tap, longPress } from '../utils/mobile-touch-helper';

test('mobile interactions', async ({ page }) => {
  // Navigate to the page
  await page.goto('/document-converter');
  
  // Get element locators
  const documentItem = page.locator('.document-item').first();
  const menuButton = page.locator('.menu-button');
  
  // Perform touch gestures
  await tap(page, menuButton);
  await swipe(page, documentItem, 'left');
  await longPress(page, page.locator('.document-title'), 1000);
});
```

### Testing Touch Target Sizes

```typescript
import { hasSufficientTouchTargetSize } from '../utils/mobile-touch-helper';

test('action buttons have sufficient touch target size', async ({ page }) => {
  // Navigate to the page with action buttons
  await page.goto('/document-converter');
  
  // Check all action buttons
  const actionButtons = page.locator('.action-button');
  const count = await actionButtons.count();
  
  for (let i = 0; i < count; i++) {
    const button = actionButtons.nth(i);
    expect(await hasSufficientTouchTargetSize(button)).toBe(true);
  }
});
```

## Integration with Page Objects

The mobile touch utilities are designed to work seamlessly with Page Object patterns:

```typescript
// document-converter-page.ts
import { Page, Locator } from '@playwright/test';
import { swipe, tap } from '../utils/mobile-touch-helper';

export class DocumentConverterPage {
  readonly page: Page;
  readonly documentItems: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.documentItems = page.locator('.document-item');
  }
  
  async swipeDocumentLeft(index: number) {
    const item = this.documentItems.nth(index);
    await swipe(this.page, item, 'left');
  }
  
  async tapActionButton() {
    await tap(this.page, this.page.locator('.action-button'));
  }
}
```

## Best Practices

1. **Realistic Simulations**: Use appropriate gesture speeds and patterns (steps parameter in swipe)
2. **Device Variety**: Test across multiple device configurations
3. **Visual Verification**: Take screenshots after interactions to verify correct UI changes
4. **Size Requirements**: Verify all touch targets are at least 44×44px (WCAG guidance)
5. **Combine Gestures**: Test complex interaction patterns (swipe followed by tap)

## Resources

- [WCAG Touch Target Size Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Playwright Touch API Documentation](https://playwright.dev/docs/api/class-page#page-touchscreen)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/adaptivity-and-layout/)
- [Android Touch Target Guidelines](https://material.io/design/usability/accessibility.html#layout-and-typography)