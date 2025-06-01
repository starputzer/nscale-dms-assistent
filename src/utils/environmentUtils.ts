/**
 * Utility-Funktionen zum sicheren Zugriff auf Umgebungsvariablen
 * Funktioniert sowohl im Browser als auch in Node.js.
 */

/**
 * Gibt den Wert einer Umgebungsvariable zurück oder einen Standardwert
 * @param name Name der Umgebungsvariable
 * @param defaultValue Standardwert, falls die Variable nicht existiert
 * @returns Der Wert der Umgebungsvariable oder der Standardwert
 */
export const getEnvVar = (name: string, defaultValue: string): string => {
  // In Vite werden Umgebungsvariablen mit import.meta.env zur Verfügung gestellt
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return (import.meta.env[name] as string) || defaultValue;
  }
  // Fallback für Node.js-Umgebung oder wenn import.meta nicht verfügbar ist
  return typeof window !== "undefined"
    ? defaultValue
    : (process?.env?.[name] as string) || defaultValue;
};

/**
 * Gibt die aktuelle Node-Umgebung zurück (development, production, test)
 * @returns Die aktuelle Umgebung oder "development" als Standard
 */
export const getNodeEnv = (): string => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env.MODE || "development";
  }
  return typeof window !== "undefined"
    ? "development"
    : process?.env?.NODE_ENV || "development";
};

/**
 * Prüft, ob die Anwendung im Entwicklungsmodus läuft
 * @returns true, wenn die Anwendung im Entwicklungsmodus läuft
 */
export const isDevelopment = (): boolean => {
  return getNodeEnv() === "development";
};

/**
 * Prüft, ob die Anwendung im Produktionsmodus läuft
 * @returns true, wenn die Anwendung im Produktionsmodus läuft
 */
export const isProduction = (): boolean => {
  return getNodeEnv() === "production";
};

/**
 * Prüft, ob die Anwendung im Testmodus läuft
 * @returns true, wenn die Anwendung im Testmodus läuft
 */
export const isTest = (): boolean => {
  return getNodeEnv() === "test";
};

export default {
  getEnvVar,
  getNodeEnv,
  isDevelopment,
  isProduction,
  isTest,
};
