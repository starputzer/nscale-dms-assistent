/**
 * UUID-Generator-Hilfsfunktionen
 *
 * Stellt Funktionen zur Generierung von UUIDs bereit.
 */

/**
 * Generiert eine UUID v4 (zufallsbasiert)
 * @returns {string} Eine UUID v4 im Format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function v4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generiert eine pseudo-UUID, die für die meisten Anwendungsfälle ausreichend ist
 * @returns {string} Eine einfache ID im Format: timestamp-randomString
 */
export function simple() {
  const timestamp = new Date().getTime().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomStr}`;
}

/**
 * Prüft, ob eine UUID gültig ist
 * @param {string} uuid - Die zu prüfende UUID
 * @returns {boolean} True, wenn die UUID gültig ist
 */
export function isValid(uuid) {
  const regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

/**
 * Erzeugt eine deterministische UUID basierend auf einem String
 * @param {string} str - Der Eingabe-String
 * @returns {string} Eine UUID, die für den gleichen String immer gleich ist
 */
export function fromString(str) {
  let hash = 0;
  if (str.length === 0) return hash.toString();

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Format as UUID
  const hashStr = Math.abs(hash).toString(16).padStart(8, "0");
  return `${hashStr.substr(0, 8)}-${hashStr.substr(0, 4)}-4${hashStr.substr(0, 3)}-8${hashStr.substr(0, 3)}-${"0".repeat(12)}`.substr(
    0,
    36,
  );
}

// Globaler Export
if (typeof window !== "undefined") {
  window.uuidUtil = {
    v4,
    simple,
    isValid,
    fromString,
  };
}
