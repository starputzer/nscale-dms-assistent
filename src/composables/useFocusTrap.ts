import { ref, onBeforeUnmount, type Ref } from 'vue';

/**
 * Composable to create a focus trap within a specified container element.
 * Keeps focus within the container for accessibility purposes.
 * 
 * @param containerRef - Reference to the container element
 * @returns Methods to activate and deactivate the focus trap
 */
export function useFocusTrap(containerRef: Ref<HTMLElement | null>) {
  const previouslyFocusedElement = ref<HTMLElement | null>(null);
  const isActive = ref(false);
  
  /**
   * Get all focusable elements within the container
   */
  const getFocusableElements = (): HTMLElement[] => {
    if (!containerRef.value) return [];
    
    return Array.from(
      containerRef.value.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.hasAttribute('disabled'));
  };
  
  /**
   * Handle tab key press to trap focus within the container
   */
  const handleTabKey = (event: KeyboardEvent): void => {
    if (!isActive.value || !containerRef.value) return;
    
    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // Handle tabbing based on Shift key state
    if (event.shiftKey) {
      // If shift+tab on first element, move to last element
      if (document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      }
    } else {
      // If tab on last element, move to first element
      if (document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  };
  
  /**
   * Activate the focus trap
   */
  const activate = (): void => {
    if (!containerRef.value || isActive.value) return;
    
    // Store currently focused element to restore later
    previouslyFocusedElement.value = document.activeElement as HTMLElement;
    
    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);
    
    isActive.value = true;
  };
  
  /**
   * Deactivate the focus trap
   */
  const deactivate = (): void => {
    if (!isActive.value) return;
    
    // Remove keyboard event listener
    document.removeEventListener('keydown', handleKeyDown);
    
    // Restore focus to previously focused element
    if (previouslyFocusedElement.value) {
      previouslyFocusedElement.value.focus();
      previouslyFocusedElement.value = null;
    }
    
    isActive.value = false;
  };
  
  /**
   * Handle keydown events for Tab and Escape
   */
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Tab') {
      handleTabKey(event);
    }
  };
  
  // Cleanup when the component is unmounted
  onBeforeUnmount(() => {
    if (isActive.value) {
      deactivate();
    }
  });
  
  return {
    activate,
    deactivate,
    isActive
  };
}