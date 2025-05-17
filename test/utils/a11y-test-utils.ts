/**
 * Accessibility Testing Utilities
 * 
 * This file contains utility functions for running accessibility tests
 * and testing keyboard navigation.
 */

import axe from "axe-core";
import { vi } from "vitest";

/**
 * Runs axe-core accessibility tests on an element
 *
 * @param element - The HTML element to test
 * @param options - Optional axe-core configuration options
 * @returns The accessibility test results
 */
export async function runAxeTest(element: Element, options?: any): Promise<any> {
  // If no options provided, use default configuration
  const axeOptions = options || {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "best-practice"],
    },
  };
  
  try {
    const results = await axe.run(element, axeOptions);
    
    // Add a custom matcher for easier assertions
    if (!results.violations) {
      results.violations = [];
    }
    
    // Add a function to check for no violations
    results.toHaveNoViolations = function() {
      const violations = this.violations;
      return {
        pass: violations.length === 0,
        message: () => {
          return violations.length === 0
            ? "Expected no accessibility violations"
            : `Expected no accessibility violations but found ${violations.length}:\n${formatViolations(violations)}`;
        },
      };
    };
    
    return results;
  } catch (error) {
    console.error("Error running axe-core tests:", error);
    throw error;
  }
}

/**
 * Formats axe-core violations for more readable output
 *
 * @param violations - The violations array from axe-core results
 * @returns Formatted string with violation details
 */
function formatViolations(violations: any[]): string {
  return violations
    .map((violation) => {
      const nodeInfo = violation.nodes
        .map((node: any) => {
          return `\n    - ${node.html}\n      ${node.failureSummary}`;
        })
        .join("\n");
      
      return `\n  ${violation.impact.toUpperCase()}: ${violation.help} (${
        violation.id
      })
  Help: ${violation.helpUrl}
  Elements:${nodeInfo}`;
    })
    .join("\n\n");
}

/**
 * Tests keyboard navigation through a series of elements
 *
 * @param startElement - The element to start keyboard navigation from
 * @param selectors - Array of selectors to test navigation through
 * @returns Object with navigation results
 */
export async function testKeyboardNavigation(
  startElement: Element,
  selectors: string[]
): Promise<{
  success: boolean;
  reachedElements: string[];
  unreachableElements: string[];
  lastFocusedElement: Element | null;
}> {
  const result = {
    success: false,
    reachedElements: [] as string[],
    unreachableElements: [] as string[],
    lastFocusedElement: null as Element | null,
  };
  
  // Get all matching elements in the document
  const elements = selectors.map((selector) => {
    const matches = Array.from(document.querySelectorAll(selector));
    return matches.length > 0 ? matches[0] : null;
  });
  
  // Filter out null elements and get their selectors
  const validElements = elements.filter((el) => el !== null) as Element[];
  const validSelectors = selectors.filter((_, i) => elements[i] !== null);
  
  if (validElements.length === 0) {
    return {
      success: false,
      reachedElements: [],
      unreachableElements: selectors,
      lastFocusedElement: null,
    };
  }
  
  // Focus the first element to start
  const firstElement = validElements[0];
  firstElement.focus();
  result.lastFocusedElement = firstElement;
  result.reachedElements.push(validSelectors[0]);
  
  // Navigate through remaining elements using Tab key
  for (let i = 1; i < validElements.length; i++) {
    const expectedElement = validElements[i];
    
    // Simulate Tab key press
    const activeElement = document.activeElement;
    if (activeElement) {
      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        code: "Tab",
        bubbles: true,
        cancelable: true,
      });
      activeElement.dispatchEvent(tabEvent);
    }
    
    // Wait for focus to change
    await new Promise((resolve) => setTimeout(resolve, 50));
    
    // Check if we've reached the expected element
    if (document.activeElement === expectedElement) {
      result.reachedElements.push(validSelectors[i]);
      result.lastFocusedElement = expectedElement;
    } else {
      result.unreachableElements.push(validSelectors[i]);
    }
  }
  
  // Success if we reached all elements
  result.success = result.reachedElements.length === validSelectors.length;
  
  return result;
}

/**
 * Simulates user keyboard navigation through an interface
 *
 * @param startSelector - Selector for the element to start from
 * @param keySequence - Array of key events to simulate (e.g., ['Tab', 'ArrowDown'])
 * @returns The final focused element after key sequence
 */
export async function simulateKeyboardNavigation(
  startSelector: string,
  keySequence: string[]
): Promise<Element | null> {
  // Focus the start element
  const startElement = document.querySelector(startSelector);
  if (!startElement) {
    return null;
  }
  
  startElement.focus();
  let currentElement = startElement;
  
  // Simulate each key press
  for (const key of keySequence) {
    const keyEvent = new KeyboardEvent("keydown", {
      key,
      code: key,
      bubbles: true,
      cancelable: true,
    });
    
    currentElement.dispatchEvent(keyEvent);
    
    // Wait for focus to change
    await new Promise((resolve) => setTimeout(resolve, 50));
    
    // Update current element
    currentElement = document.activeElement as Element;
  }
  
  return document.activeElement;
}

/**
 * Tests if a component is keyboard operable
 *
 * @param component - The component element to test
 * @returns Object with test results
 */
export async function testKeyboardOperability(component: Element): Promise<{
  focusable: boolean;
  activatable: boolean;
  navigable: boolean;
}> {
  const result = {
    focusable: false,
    activatable: false,
    navigable: false,
  };
  
  // Test focusability
  component.focus();
  result.focusable = document.activeElement === component;
  
  // Test activatability (space/enter)
  if (result.focusable) {
    const clickHandler = vi.fn();
    component.addEventListener("click", clickHandler);
    
    // Try Space key
    const spaceEvent = new KeyboardEvent("keydown", {
      key: " ",
      code: "Space",
      bubbles: true,
      cancelable: true,
    });
    component.dispatchEvent(spaceEvent);
    
    // Try Enter key
    const enterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      bubbles: true,
      cancelable: true,
    });
    component.dispatchEvent(enterEvent);
    
    // Check if click handler was called
    result.activatable = clickHandler.mock.calls.length > 0;
    
    component.removeEventListener("click", clickHandler);
  }
  
  // Test navigability (arrow keys)
  if (result.focusable) {
    const arrowKeyHandler = vi.fn();
    component.addEventListener("keydown", arrowKeyHandler);
    
    // Try arrow keys
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].forEach((key) => {
      const arrowEvent = new KeyboardEvent("keydown", {
        key,
        code: key,
        bubbles: true,
        cancelable: true,
      });
      component.dispatchEvent(arrowEvent);
    });
    
    // Check if arrow key handler was called
    result.navigable = arrowKeyHandler.mock.calls.length > 0;
    
    component.removeEventListener("keydown", arrowKeyHandler);
  }
  
  return result;
}

/**
 * Checks component for proper ARIA attributes
 * 
 * @param element - The element to check
 * @param expectedRole - The expected ARIA role
 * @param expectedAttributes - Other expected ARIA attributes
 * @returns Object with test results
 */
export function checkAriaAttributes(
  element: Element,
  expectedRole?: string,
  expectedAttributes?: Record<string, string>
): {
  hasProperRole: boolean;
  missingAttributes: string[];
  invalidAttributes: { name: string; expected: string; actual: string }[];
} {
  const result = {
    hasProperRole: true,
    missingAttributes: [] as string[],
    invalidAttributes: [] as { name: string; expected: string; actual: string }[],
  };
  
  // Check role if specified
  if (expectedRole) {
    const role = element.getAttribute("role");
    result.hasProperRole = role === expectedRole;
  }
  
  // Check other attributes if specified
  if (expectedAttributes) {
    for (const [attr, expectedValue] of Object.entries(expectedAttributes)) {
      const actualValue = element.getAttribute(attr);
      if (actualValue === null) {
        result.missingAttributes.push(attr);
      } else if (actualValue !== expectedValue) {
        result.invalidAttributes.push({
          name: attr,
          expected: expectedValue,
          actual: actualValue,
        });
      }
    }
  }
  
  return result;
}

/**
 * Tests focus trapping in modal dialogs or other components
 * 
 * @param container - The container element that should trap focus
 * @returns Whether focus is properly trapped within the container
 */
export async function testFocusTrapping(container: Element): Promise<boolean> {
  // Find all focusable elements
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length === 0) {
    return false;
  }
  
  // Focus the last element and press Tab
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
  lastElement.focus();
  
  // Press Tab to see if focus wraps to first element
  const tabEvent = new KeyboardEvent("keydown", {
    key: "Tab",
    code: "Tab",
    bubbles: true,
    cancelable: true,
  });
  lastElement.dispatchEvent(tabEvent);
  
  // Wait for focus to change
  await new Promise((resolve) => setTimeout(resolve, 50));
  
  // Check if focus wrapped to first element
  const firstElement = focusableElements[0];
  return document.activeElement === firstElement;
}

/**
 * Checks color contrast between text and background
 * This is a simplified check that relies on axe-core's color contrast check
 * 
 * @param element - The element to check
 * @returns Promise that resolves to contrast test results
 */
export async function checkColorContrast(element: Element): Promise<any> {
  const options = {
    runOnly: {
      type: "rule",
      values: ["color-contrast"],
    },
  };
  
  return runAxeTest(element, options);
}

// Add vitest matcher for accessibility testing
if (typeof expect !== "undefined") {
  expect.extend({
    toHaveNoViolations(received) {
      if (!received || !Array.isArray(received.violations)) {
        return {
          pass: false,
          message: () => "Expected object to be axe results but it was not",
        };
      }
      
      const violations = received.violations;
      
      return {
        pass: violations.length === 0,
        message: () => {
          return violations.length === 0
            ? "Expected no accessibility violations"
            : `Expected no accessibility violations but found ${violations.length}:\n${formatViolations(violations)}`;
        },
      };
    },
  });
}