/**
 * Markdown utility wrapper
 * Provides a safe way to use the marked library
 */

let markedLib: any = null;

// Try to import marked dynamically
export async function loadMarked() {
  if (markedLib) return markedLib;
  
  try {
    const module = await import('marked');
    markedLib = module.marked || module.default || module;
    return markedLib;
  } catch (error) {
    console.error('[Markdown] Failed to load marked library:', error);
    return null;
  }
}

// Synchronous markdown parsing with fallback
export function parseMarkdown(content: string): string {
  if (!content) return '';
  
  // If marked is already loaded, use it
  if (markedLib && markedLib.parse) {
    try {
      return markedLib.parse(content);
    } catch (error) {
      console.error('[Markdown] Parse error:', error);
    }
  }
  
  // Fallback: convert basic markdown to HTML
  return content
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')  // Bold
    .replace(/\*(.+?)\*/g, '<em>$1</em>')              // Italic
    .replace(/\n/g, '<br>');                           // Line breaks
}

// Initialize marked on module load
loadMarked().then(marked => {
  if (marked) {
    console.log('[Markdown] Marked library loaded successfully');
  }
});