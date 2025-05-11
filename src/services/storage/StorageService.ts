/**
 * StorageService - Speicherverwaltungsdienst für die Anwendung
 *
 * Diese Klasse bietet eine einheitliche Schnittstelle für den Zugriff auf verschiedene
 * Speichermechanismen (localStorage, sessionStorage, IndexedDB) mit Fallbacks.
 */

/**
 * Optionen für StorageService
 */
export interface StorageServiceOptions {
  /** Speichertyp (localStorage, sessionStorage, indexedDB) */
  storageType?: "localStorage" | "sessionStorage" | "indexedDB";

  /** Präfix für Speicherschlüssel */
  keyPrefix?: string;

  /** Verschlüsselung aktivieren */
  encryption?: boolean;

  /** Nach Fehler auf anderen Speicher zurückfallen */
  useFallback?: boolean;
}

/**
 * StorageService - Speicherverwaltungsklasse
 */
export class StorageService {
  /** Primärer Speicher-Typ */
  private storageType: "localStorage" | "sessionStorage" | "indexedDB";

  /** Präfix für alle Speicherschlüssel */
  private keyPrefix: string;

  /** Verschlüsselung aktivieren */
  private encryption: boolean;

  /** Nach Fehler auf anderen Speicher zurückfallen */
  private useFallback: boolean;

  /** In-Memory-Fallback für den Fall, dass keine Speicherung möglich ist */
  private memoryStorage: Map<string, string> = new Map();

  /**
   * Konstruktor
   */
  constructor(options: StorageServiceOptions = {}) {
    this.storageType = options.storageType || "localStorage";
    this.keyPrefix = options.keyPrefix || "nscale_";
    this.encryption = options.encryption || false;
    this.useFallback = options.useFallback !== false;
  }

  /**
   * Speichert einen Wert
   */
  public setItem(key: string, value: string): void {
    const prefixedKey = this.getKeyWithPrefix(key);
    const valueToStore = this.encryption ? this.encrypt(value) : value;

    try {
      if (this.storageType === "localStorage") {
        localStorage.setItem(prefixedKey, valueToStore);
      } else if (this.storageType === "sessionStorage") {
        sessionStorage.setItem(prefixedKey, valueToStore);
      } else {
        // IndexedDB wird hier nicht implementiert, könnte bei Bedarf hinzugefügt werden
        throw new Error("IndexedDB nicht implementiert");
      }
    } catch (error) {
      console.warn(`Fehler beim Speichern von ${key}:`, error);

      // Auf anderen Speicher zurückfallen
      if (this.useFallback) {
        try {
          if (this.storageType === "localStorage") {
            sessionStorage.setItem(prefixedKey, valueToStore);
          } else {
            localStorage.setItem(prefixedKey, valueToStore);
          }
        } catch (fallbackError) {
          // Letzter Ausweg: In-Memory-Speicher
          this.memoryStorage.set(prefixedKey, valueToStore);
        }
      } else {
        // Auch ohne Fallback im Memory-Speicher speichern
        this.memoryStorage.set(prefixedKey, valueToStore);
      }
    }
  }

  /**
   * Liest einen Wert
   */
  public getItem(key: string): string | null {
    const prefixedKey = this.getKeyWithPrefix(key);
    let value: string | null = null;

    try {
      if (this.storageType === "localStorage") {
        value = localStorage.getItem(prefixedKey);
      } else if (this.storageType === "sessionStorage") {
        value = sessionStorage.getItem(prefixedKey);
      } else {
        throw new Error("IndexedDB nicht implementiert");
      }

      // Wenn nicht im primären Speicher, versuche Fallbacks
      if (value === null && this.useFallback) {
        if (this.storageType === "localStorage") {
          value = sessionStorage.getItem(prefixedKey);
        } else {
          value = localStorage.getItem(prefixedKey);
        }
      }

      // Wenn immer noch nicht gefunden, prüfe In-Memory-Speicher
      if (value === null) {
        value = this.memoryStorage.get(prefixedKey) || null;
      }

      // Entschlüsseln, falls aktiviert und ein Wert gefunden wurde
      if (value !== null && this.encryption) {
        value = this.decrypt(value);
      }
    } catch (error) {
      console.warn(`Fehler beim Lesen von ${key}:`, error);

      // Aus In-Memory-Speicher versuchen
      value = this.memoryStorage.get(prefixedKey) || null;

      if (value !== null && this.encryption) {
        value = this.decrypt(value);
      }
    }

    return value;
  }

  /**
   * Entfernt einen Wert
   */
  public removeItem(key: string): void {
    const prefixedKey = this.getKeyWithPrefix(key);

    try {
      // Aus allen Speicherorten entfernen
      localStorage.removeItem(prefixedKey);
      sessionStorage.removeItem(prefixedKey);
      this.memoryStorage.delete(prefixedKey);
    } catch (error) {
      console.warn(`Fehler beim Entfernen von ${key}:`, error);

      // Mindestens aus In-Memory-Speicher entfernen
      this.memoryStorage.delete(prefixedKey);
    }
  }

  /**
   * Löscht alle Werte mit dem konfigurierten Präfix
   */
  public clear(): void {
    try {
      // Suche alle Schlüssel mit dem Präfix in localStorage
      const localStorageKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.keyPrefix)) {
          localStorageKeys.push(key);
        }
      }

      // Aus localStorage entfernen
      localStorageKeys.forEach((key) => localStorage.removeItem(key));

      // Suche alle Schlüssel mit dem Präfix in sessionStorage
      const sessionStorageKeys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(this.keyPrefix)) {
          sessionStorageKeys.push(key);
        }
      }

      // Aus sessionStorage entfernen
      sessionStorageKeys.forEach((key) => sessionStorage.removeItem(key));

      // In-Memory-Speicher leeren
      this.memoryStorage.clear();
    } catch (error) {
      console.warn("Fehler beim Löschen aller Daten:", error);
    }
  }

  /**
   * Gibt alle Schlüssel mit dem Präfix zurück
   */
  public getKeys(): string[] {
    const keys = new Set<string>();

    try {
      // Schlüssel aus localStorage sammeln
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.keyPrefix)) {
          keys.add(key.substring(this.keyPrefix.length));
        }
      }

      // Schlüssel aus sessionStorage sammeln
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(this.keyPrefix)) {
          keys.add(key.substring(this.keyPrefix.length));
        }
      }

      // Schlüssel aus In-Memory-Speicher sammeln
      for (const key of this.memoryStorage.keys()) {
        if (key.startsWith(this.keyPrefix)) {
          keys.add(key.substring(this.keyPrefix.length));
        }
      }
    } catch (error) {
      console.warn("Fehler beim Abrufen der Schlüssel:", error);
    }

    return Array.from(keys);
  }

  /**
   * Kombiniert den Schlüssel mit dem Präfix
   */
  private getKeyWithPrefix(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Einfache Verschlüsselungsmethode (nur zur Verschleierung, nicht sicher!)
   */
  private encrypt(value: string): string {
    if (!this.encryption) return value;

    // Einfache Base64-Codierung (keine echte Verschlüsselung)
    return btoa(value);
  }

  /**
   * Einfache Entschlüsselungsmethode
   */
  private decrypt(value: string): string {
    if (!this.encryption) return value;

    // Base64-Decodierung
    try {
      return atob(value);
    } catch (e) {
      // Wenn Decodierung fehlschlägt, Original zurückgeben
      return value;
    }
  }
}

export default StorageService;
