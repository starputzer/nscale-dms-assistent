/**
 * UUID Utility - Implementierungen ohne externe Abhängigkeiten
 * 
 * Dieser Modul bietet Funktionen zur Generierung von UUIDs ohne Abhängigkeit von externen Paketen.
 * Es enthält mehrere Implementierungen mit unterschiedlicher Komplexität und Zufälligkeit.
 */

/**
 * Standard-UUID v4 (zufällig) Implementierung ohne externe Abhängigkeiten
 * Generiert eine UUID v4-kompatible ID unter Verwendung von Math.random()
 */
export function generateUUID(): string {
  let d = new Date().getTime();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    d += performance.now(); // Verwende höhere Präzision, wenn verfügbar
  }
  
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/**
 * Alias-Funktion für v4 UUID-Generierung, kompatibel mit der uuid-Paket API
 * Kann als direkter Ersatz für 'import { v4 as uuidv4 } from "uuid";' verwendet werden
 */
export const v4 = generateUUID;

/**
 * Sichere UUID-Generierung mit Web Crypto API (falls verfügbar)
 * Hinweis: Diese Funktion funktioniert nur in modernen Browsern und sicheren Kontexten
 */
export function generateSecureUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    // Verwende native API, wenn verfügbar (moderne Browser)
    return crypto.randomUUID();
  } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    // Fallback für ältere Browser mit Crypto-Unterstützung
    const buffer = new Uint8Array(16);
    crypto.getRandomValues(buffer);
    
    // Setze UUID-Version und -Variante
    buffer[6] = (buffer[6] & 0x0f) | 0x40; // Version 4
    buffer[8] = (buffer[8] & 0x3f) | 0x80; // Variante 1
    
    // Konvertiere zu Hex und formatiere als UUID
    const hexValues = Array.from(buffer).map(b => b.toString(16).padStart(2, '0'));
    return [
      hexValues.slice(0, 4).join(''),
      hexValues.slice(4, 6).join(''),
      hexValues.slice(6, 8).join(''),
      hexValues.slice(8, 10).join(''),
      hexValues.slice(10).join('')
    ].join('-');
  } else {
    // Fallback zur Standard-Methode, wenn keine Crypto-API verfügbar ist
    return generateUUID();
  }
}

/**
 * Einfache inkrementelle ID-Generierung (nicht wirklich UUID, aber eindeutig innerhalb der Anwendungssitzung)
 * Nützlich für Entwicklungs- und Testzwecke, wenn echte UUIDs nicht benötigt werden
 */
let sequentialId = 0;
export function generateSequentialId(prefix = 'id-'): string {
  return `${prefix}${++sequentialId}`;
}

/**
 * Zeitbasierte eindeutige ID
 * Kombiniert Zeitstempel mit zufälliger Komponente
 */
export function generateTimeBasedId(): string {
  const timestamp = new Date().getTime().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomPart}`;
}