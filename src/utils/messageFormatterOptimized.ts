/**
 * Optimized message formatter with lazy loading for highlight.js
 * Reduces initial bundle size by ~900KB
 */

// Type for lazy-loaded highlight.js
type HighlightJS = typeof import('highlight.js').default;
let hljs: HighlightJS | null = null;

/**
 * Lazy load highlight.js only when needed
 */
async function loadHighlightJS(): Promise<HighlightJS> {
  if (!hljs) {
    // Dynamic import - only loads when first code block needs highlighting
    const module = await import('highlight.js/lib/core');
    hljs = module.default;
    
    // Only load commonly used languages to reduce bundle size
    const languages = [
      'javascript',
      'typescript', 
      'python',
      'json',
      'xml',
      'css',
      'sql',
      'bash',
      'markdown'
    ];
    
    // Load languages on demand
    await Promise.all(
      languages.map(async (lang) => {
        try {
          const langModule = await import(`highlight.js/lib/languages/${lang}`);
          (hljs as any).registerLanguage(lang, langModule.default);
        } catch (e) {
          console.warn(`Failed to load language: ${lang}`, e);
        }
      })
    );
  }
  return hljs;
}

/**
 * Markiert die angegebenen Quellen-Referenzen in einem Text
 *
 * @param content HTML-Content, der Quellenreferenzen enthält
 * @returns HTML-Content mit klickbaren Quellenreferenzen
 */
export function linkifySourceReferences(content: string): string {
  // Ersetzt Quellen-Markierungen mit klickbaren Spans
  // Beispiel: [[src:1]] wird zu <span class="source-reference" data-source-id="1">[1]</span>
  return content.replace(
    /\[\[src:([^\]]+)\]\]/g,
    (_match, sourceId) =>
      `<span class="source-reference" data-source-id="${sourceId}">[${sourceId}]</span>`,
  );
}

/**
 * Prüft, ob ein Text Quellenreferenzen enthält
 *
 * @param content Der zu prüfende Text
 * @returns true, wenn Quellenreferenzen gefunden wurden
 */
export function hasSourceReferences(content: string): boolean {
  return /\[\[src:[^\]]+\]\]/i.test(content);
}

/**
 * Verwendet highlight.js, um Code-Blöcke im HTML-Element hervorzuheben
 * Lädt highlight.js nur bei Bedarf (lazy loading)
 *
 * @param element Das DOM-Element, das Codeblöcke enthält
 */
export async function highlightCode(element: HTMLElement): Promise<void> {
  try {
    // Alle pre>code Elemente finden
    const codeBlocks = element.querySelectorAll("pre code");
    
    // Nur laden wenn es tatsächlich Code-Blöcke gibt
    if (codeBlocks.length === 0) {
      return;
    }
    
    // Lazy load highlight.js
    const highlighter = await loadHighlightJS();
    
    codeBlocks.forEach((block) => {
      (highlighter as any).highlightElement(block as HTMLElement);
    });
  } catch (error) {
    console.error("Fehler beim Syntax-Highlighting:", error);
  }
}

/**
 * Synchrone Version für Kompatibilität (ohne Highlighting)
 * @deprecated Use async highlightCode instead
 */
export function highlightCodeSync(element: HTMLElement): void {
  // Add basic styling without syntax highlighting
  const codeBlocks = element.querySelectorAll("pre code");
  codeBlocks.forEach((block) => {
    block.classList.add('hljs');
  });
}

/**
 * Formatiert einen Zeitstempel zu einem lesbaren Format
 *
 * @param timestamp Der zu formatierende Zeitstempel
 * @param format Das gewünschte Format ('short' | 'medium' | 'long')
 * @returns Formatierter Zeitstempel
 */
export function formatTimestamp(
  timestamp: string | Date,
  format: "short" | "medium" | "long" = "short",
): string {
  try {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

    switch (format) {
      case "short":
        return date.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        });
      case "medium":
        return date.toLocaleString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        });
      case "long":
        return date.toLocaleString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      default:
        return date.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        });
    }
  } catch (error) {
    console.error("Fehler beim Formatieren des Zeitstempels:", error);
    return "";
  }
}

/**
 * Lightweight alternative using CSS for basic code styling
 */
export function applyCodeStyling(element: HTMLElement): void {
  const codeBlocks = element.querySelectorAll("pre code");
  codeBlocks.forEach((block) => {
    // Add classes for CSS-based styling
    block.classList.add('code-block');
    
    // Detect language from class name (e.g., language-javascript)
    const langClass = Array.from(block.classList).find(c => c.startsWith('language-'));
    if (langClass) {
      const lang = langClass.replace('language-', '');
      block.setAttribute('data-language', lang);
    }
  });
}