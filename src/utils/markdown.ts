/**
 * Markdown utility wrapper
 * Provides a safe way to use the marked library
 */

// Interface for marked library
interface MarkedLib {
  parse: (markdown: string) => string;
  setOptions?: (options: any) => void;
}

// Get marked from window object or use fallback
function getMarked(): MarkedLib | null {
  if (typeof window !== 'undefined' && (window as any).marked) {
    return (window as any).marked;
  }
  return null;
}

// Configure marked with safe options
function configureMarked(markedLib: MarkedLib) {
  if (markedLib.setOptions) {
    markedLib.setOptions({
      breaks: true,
      gfm: true,
      headerIds: false,
      mangle: false,
      pedantic: false,
      sanitize: false,
      smartLists: true,
      smartypants: false,
      xhtml: false
    });
  }
}

// Simple markdown to HTML converter for fallback
function simpleMarkdownToHtml(content: string): string {
  return content
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n/g, '<br>')
    // Paragraphs
    .replace(/<br><br>/g, '</p><p>')
    .replace(/^(.+)$/, '<p>$1</p>');
}

// Synchronous markdown parsing with fallback
export function parseMarkdown(content: string): string {
  if (!content) return '';
  
  const markedLib = getMarked();
  
  if (markedLib) {
    try {
      // Configure on first use
      if (!markedLib.setOptions || !(window as any).__markedConfigured) {
        configureMarked(markedLib);
        (window as any).__markedConfigured = true;
      }
      
      // Use marked.parse for v9.x API
      return markedLib.parse(content);
    } catch (error) {
      console.error('[Markdown] Parse error:', error);
    }
  } else {
    console.warn('[Markdown] Marked library not available, using fallback parser');
  }
  
  // Fallback: convert basic markdown to HTML
  return simpleMarkdownToHtml(content);
}

// Export marked for components that need direct access
export const marked = getMarked();