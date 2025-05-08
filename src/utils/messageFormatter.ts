/**
 * Dienstprogramm zur Formatierung von Chat-Nachrichten
 * - Formatiert Markdown-Text
 * - Fügt Syntax-Highlighting für Codeblöcke hinzu
 * - Verarbeitet Quellenreferenzen
 */

import hljs from 'highlight.js';

/**
 * Markiert die angegebenen Quellen-Referenzen in einem Text
 * 
 * @param content HTML-Content, der Quellenreferenzen enthält
 * @returns HTML-Content mit klickbaren Quellenreferenzen
 */
export function linkifySourceReferences(content: string): string {
  // Ersetzt Quellen-Markierungen mit klickbaren Spans
  // Beispiel: [[src:1]] wird zu <span class="source-reference" data-source-id="1">[1]</span>
  return content.replace(/\[\[src:([^\]]+)\]\]/g, 
    (match, sourceId) => `<span class="source-reference" data-source-id="${sourceId}">[${sourceId}]</span>`
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
 * 
 * @param element Das DOM-Element, das Codeblöcke enthält
 */
export function highlightCode(element: HTMLElement): void {
  try {
    // Alle pre>code Elemente finden
    const codeBlocks = element.querySelectorAll('pre code');
    
    codeBlocks.forEach((block) => {
      hljs.highlightElement(block as HTMLElement);
    });
  } catch (error) {
    console.error('Fehler beim Syntax-Highlighting:', error);
  }
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
  format: 'short' | 'medium' | 'long' = 'short'
): string {
  try {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    switch (format) {
      case 'short':
        return date.toLocaleTimeString('de-DE', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      case 'medium':
        return date.toLocaleString('de-DE', { 
          hour: '2-digit', 
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit'
        });
      case 'long':
        return date.toLocaleString('de-DE', { 
          hour: '2-digit', 
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      default:
        return date.toLocaleTimeString('de-DE', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
    }
  } catch (error) {
    console.error('Fehler beim Formatieren des Zeitstempels:', error);
    return '';
  }
}

/**
 * Kürzt einen Text auf die angegebene Länge
 * 
 * @param content Der zu kürzende Text
 * @param maxLength Die maximale Länge
 * @returns Gekürzter Text mit Auslassungspunkten
 */
export function truncateContent(content: string, maxLength: number): string {
  if (!content || content.length <= maxLength) return content || '';
  return content.substring(0, maxLength) + '...';
}

/**
 * Gibt ein lesbares Label für eine Nachrichtenrolle zurück
 * 
 * @param role Die Rolle ('user', 'assistant', 'system')
 * @returns Lesbares Label
 */
export function messageRoleLabel(role: string): string {
  switch (role) {
    case 'user': return 'Sie';
    case 'assistant': return 'Assistent';
    case 'system': return 'System';
    default: return role;
  }
}