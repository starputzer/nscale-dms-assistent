/**
 * UUID-Generator-Utilities
 * Bietet Funktionen zum Generieren von universell eindeutigen Identifikatoren (UUIDs)
 */

/**
 * Generiert eine UUID v4 (zufällig)
 * @returns Eine zufällige UUID
 */
export function generateUUID(): string {
  let d = new Date().getTime();
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  ) {
    d += performance.now(); // Hinzufügen der Performance-Zeit für höhere Genauigkeit
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Alias für die v4-Funktion, um Kompatibilität mit dem uuid-Paket zu gewährleisten
 */
export const v4 = generateUUID;

/**
 * Generiert eine sichere UUID mit der Crypto-API, wenn verfügbar
 * Fällt zurück auf die normale generateUUID-Funktion, wenn Crypto nicht verfügbar ist
 * @returns Eine kryptografisch sichere UUID
 */
export function generateSecureUUID(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  } else if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const buffer = new Uint8Array(16);
    crypto.getRandomValues(buffer);

    // UUID-Version und -Variante setzen
    buffer[6] = (buffer[6] & 0x0f) | 0x40; // Version 4
    buffer[8] = (buffer[8] & 0x3f) | 0x80; // Variante 1

    // In UUID-String konvertieren
    const hexValues = Array.from(buffer).map((b) =>
      b.toString(16).padStart(2, "0"),
    );
    return [
      hexValues.slice(0, 4).join(""),
      hexValues.slice(4, 6).join(""),
      hexValues.slice(6, 8).join(""),
      hexValues.slice(8, 10).join(""),
      hexValues.slice(10).join(""),
    ].join("-");
  }

  // Fallback zur normalen UUID-Generierung
  return generateUUID();
}

export default {
  generateUUID,
  v4,
  generateSecureUUID,
};
