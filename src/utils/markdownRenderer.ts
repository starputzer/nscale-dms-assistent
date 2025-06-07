/**
 * Optimized markdown renderer with lazy loading
 * Reduces bundle size by loading marked and DOMPurify only when needed
 */

// Types for lazy-loaded modules
type Marked = typeof import('marked').marked;
type DOMPurify = typeof import('dompurify').default;

// Cached instances
let marked: Marked | null = null;
let domPurify: DOMPurify | null = null;

/**
 * Lazy load marked library
 */
async function loadMarked(): Promise<Marked> {
  if (!marked) {
    const module = await import('marked');
    marked = module.marked;
    
    // Configure marked options
<<<<<<< HEAD
    (marked as any).setOptions({
=======
    marked.setOptions({
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
      breaks: true,
      gfm: true,
      headerIds: false,
      mangle: false,
      sanitize: false, // We use DOMPurify for sanitization
    });
  }
  return marked;
}

/**
 * Lazy load DOMPurify
 */
async function loadDOMPurify(): Promise<DOMPurify> {
  if (!domPurify) {
    const module = await import('dompurify');
    domPurify = module.default;
  }
  return domPurify;
}

/**
 * Render markdown to HTML with sanitization
 * Lazy loads dependencies on first use
 */
export async function renderMarkdown(content: string): Promise<string> {
  try {
    // Load dependencies
    const [markedLib, purifier] = await Promise.all([
      loadMarked(),
      loadDOMPurify()
    ]);
    
    // Render markdown
    const rawHtml = markedLib(content);
    
    // Sanitize HTML
    const cleanHtml = purifier.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
        'blockquote', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3',
        'h4', 'h5', 'h6', 'hr', 'table', 'thead', 'tbody', 'tr',
        'th', 'td', 'img', 'span', 'div'
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'src', 'alt', 'title',
        'class', 'id', 'data-*'
      ],
      ALLOW_DATA_ATTR: true,
    });
    
    return cleanHtml;
  } catch (error) {
    console.error('Error rendering markdown:', error);
    // Return escaped content as fallback
    return escapeHtml(content);
  }
}

/**
 * Simple HTML escape function for fallback
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Synchronous markdown rendering (basic, without full parsing)
 * For use when async is not possible
 */
export function renderMarkdownSync(content: string): string {
  // Basic markdown transformations without full parser
  let html = escapeHtml(content);
  
  // Convert line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  
  // Wrap in paragraphs
  html = '<p>' + html + '</p>';
  
  // Basic formatting
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic
  html = html.replace(/`(.*?)`/g, '<code>$1</code>'); // Inline code
  
  return html;
}

/**
 * Check if content has markdown formatting
 */
export function hasMarkdown(content: string): boolean {
  // Check for common markdown patterns
  const patterns = [
    /^#{1,6}\s/m,           // Headers
    /\*\*[^*]+\*\*/,        // Bold
    /\*[^*]+\*/,            // Italic
    /\[[^\]]+\]\([^)]+\)/,  // Links
    /^[-*+]\s/m,            // Lists
    /^>\s/m,                // Blockquotes
    /```[\s\S]*?```/,       // Code blocks
    /`[^`]+`/               // Inline code
  ];
  
  return patterns.some(pattern => pattern.test(content));
}