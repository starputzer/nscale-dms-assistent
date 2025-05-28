/**
 * SessionID Adapter
 * 
 * Dies löst das kritische Problem der Session-ID-Inkompatibilität zwischen
 * dem Frontend, das UUIDs verwendet (z.B. "153bbcf0-2a3c-4140-afed-a1e807905fd5"),
 * und dem Backend, das numerische IDs erzeugt (z.B. "183").
 * 
 * Funktionen:
 * - Bidirektionale Konvertierung zwischen UUID und numerischen IDs
 * - Session-ID-Zwischenspeicher für schnellen Zugriff
 * - Automatische Erkennung des ID-Formats
 * - Persistenz von ID-Mappings über Browser-Reloads hinweg
 */

// Typ für das Mapping zwischen numerischen IDs und UUIDs
export interface SessionIdMapping {
  numericToUuid: Record<string, string>;
  uuidToNumeric: Record<string, string>;
}

// Cache für Session-ID-Mappings, der auch Browser-Reloads überlebt
let sessionIdCache: SessionIdMapping | null = null;

/**
 * Initialisiert den Session-ID-Cache aus dem localStorage
 */
function initializeCache(): SessionIdMapping {
  if (sessionIdCache) {
    return sessionIdCache;
  }

  try {
    // Versuche, den Cache aus dem localStorage zu laden
    const cachedData = localStorage.getItem('session_id_mapping');
    if (cachedData) {
      sessionIdCache = JSON.parse(cachedData);
      console.log(`[SessionIdAdapter] Erfolgreich ${Object.keys(sessionIdCache?.numericToUuid || {}).length} ID-Mappings geladen`);
    } else {
      sessionIdCache = {
        numericToUuid: {},
        uuidToNumeric: {}
      };
    }
  } catch (error) {
    console.error('[SessionIdAdapter] Fehler beim Laden des Session-ID-Caches:', error);
    sessionIdCache = {
      numericToUuid: {},
      uuidToNumeric: {}
    };
  }

  return sessionIdCache;
}

/**
 * Speichert den Session-ID-Cache im localStorage
 */
function saveCache(): void {
  if (!sessionIdCache) return;

  try {
    localStorage.setItem('session_id_mapping', JSON.stringify(sessionIdCache));
  } catch (error) {
    console.error('[SessionIdAdapter] Fehler beim Speichern des Session-ID-Caches:', error);
  }
}

/**
 * Prüft, ob eine Session-ID im UUID-Format ist
 */
export function isUuidFormat(sessionId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);
}

/**
 * Prüft, ob eine Session-ID im numerischen Format ist
 */
export function isNumericFormat(sessionId: string): boolean {
  return /^\d+$/.test(sessionId);
}

/**
 * Fügt ein Mapping zwischen UUID und numerischer ID hinzu
 */
export function addMapping(uuidId: string, numericId: string): void {
  const cache = initializeCache();
  
  // Beide Richtungen speichern
  cache.numericToUuid[numericId] = uuidId;
  cache.uuidToNumeric[uuidId] = numericId;
  
  // Cache speichern
  saveCache();
  
  console.log(`[SessionIdAdapter] Mapping hinzugefügt: ${numericId} <-> ${uuidId}`);
}

/**
 * Konvertiert eine ID zum UUID-Format (für Frontend-Verwendung)
 * 
 * Gibt die Original-ID zurück, wenn sie bereits im UUID-Format ist oder
 * keine Konvertierung möglich ist.
 */
export function toUuidFormat(sessionId: string | number | null | undefined): string {
  if (!sessionId) return '';
  
  // In String umwandeln
  const idStr = String(sessionId);
  
  // Wenn bereits UUID-Format, unverändert zurückgeben
  if (isUuidFormat(idStr)) {
    return idStr;
  }
  
  // Cache initialisieren
  const cache = initializeCache();
  
  // Im Cache nachschlagen
  if (isNumericFormat(idStr) && cache.numericToUuid[idStr]) {
    return cache.numericToUuid[idStr];
  }
  
  // Keine Konvertierung möglich, Original zurückgeben
  console.warn(`[SessionIdAdapter] Keine UUID-Konvertierung für ${idStr} gefunden`);
  return idStr;
}

/**
 * Konvertiert eine ID zum numerischen Format (für Backend-Verwendung)
 * 
 * Gibt die Original-ID zurück, wenn sie bereits im numerischen Format ist oder
 * keine Konvertierung möglich ist.
 */
export function toNumericFormat(sessionId: string | null | undefined): string {
  if (!sessionId) return '';
  
  // Wenn bereits numerisch, unverändert zurückgeben
  if (isNumericFormat(sessionId)) {
    return sessionId;
  }
  
  // Cache initialisieren
  const cache = initializeCache();
  
  // Im Cache nachschlagen
  if (isUuidFormat(sessionId) && cache.uuidToNumeric[sessionId]) {
    return cache.uuidToNumeric[sessionId];
  }
  
  // Keine Konvertierung möglich, Original zurückgeben
  console.warn(`[SessionIdAdapter] Keine numerische Konvertierung für ${sessionId} gefunden`);
  return sessionId;
}

/**
 * Bereitet API-Anfrageparameter auf, um die richtige Session-ID-Format zu verwenden
 * 
 * Diese Funktion ist besonders nützlich für die Batch-API und andere Endpunkte,
 * die unterschiedliche Parameterformate verwenden können.
 */
export function prepareSessionIdForRequest(params: Record<string, any>, idKey: string = 'sessionId'): Record<string, any> {
  const sessionId = params[idKey];
  if (!sessionId) return params;
  
  const result = { ...params };
  
  // Standardfall: sessionId als String
  result[idKey] = sessionId;
  
  // Zusätzliche Varianten für verschiedene API-Endpunkte
  if (isUuidFormat(String(sessionId))) {
    // Wenn UUID, versuche eine numerische Version zu finden
    const numericId = toNumericFormat(String(sessionId));
    if (isNumericFormat(numericId)) {
      // Beide Formate bereitstellen
      result.session_id = parseInt(numericId, 10);
      result.session_id_numeric = parseInt(numericId, 10);
      result.session_id_str = sessionId;
    }
  } else if (isNumericFormat(String(sessionId))) {
    // Wenn numerisch, als Zahl und String bereitstellen
    result.session_id = parseInt(String(sessionId), 10);
    result.session_id_numeric = parseInt(String(sessionId), 10);
    result.session_id_str = sessionId;
  }
  
  console.log(`[SessionIdAdapter] Prepared request params:`, result);
  return result;
}

/**
 * Extrahiert die Session-ID aus einer API-Antwort und aktualisiert das Mapping
 * 
 * Diese Funktion ist nützlich, um automatisch Mappings zu erstellen, wenn
 * das Backend eine neue Session-ID zurückgibt.
 */
export function extractAndMapSessionId(response: any, clientUuid: string): string | null {
  try {
    if (!response) return null;
    
    // Verschiedene Formate probieren
    let serverId = null;
    
    if (response.id) {
      serverId = String(response.id);
    } else if (response.sessionId) {
      serverId = String(response.sessionId);
    } else if (response.session_id) {
      serverId = String(response.session_id);
    } else if (response.data?.id) {
      serverId = String(response.data.id);
    } else if (response.data?.sessionId) {
      serverId = String(response.data.sessionId);
    }
    
    if (!serverId) {
      console.warn('[SessionIdAdapter] Keine Server-Session-ID in Antwort gefunden');
      return null;
    }
    
    // Mapping hinzufügen, wenn das Format unterschiedlich ist
    const isServerNumeric = isNumericFormat(serverId);
    const isClientUuid = isUuidFormat(clientUuid);
    
    if (isServerNumeric && isClientUuid) {
      addMapping(clientUuid, serverId);
      return serverId;
    }
    
    return serverId;
  } catch (error) {
    console.error('[SessionIdAdapter] Fehler beim Extrahieren der Session-ID:', error);
    return null;
  }
}

/**
 * Bereitet eine URL für eine API-Anfrage vor, indem die Session-ID im richtigen Format eingefügt wird
 */
export function formatApiUrl(url: string): string {
  // Regex um Session-ID in URL zu finden
  const sessionIdRegex = /\/sessions\/([^\/]+)/;
  const match = url.match(sessionIdRegex);
  
  if (!match || match.length < 2) {
    return url; // Keine Session-ID in der URL
  }
  
  const sessionId = match[1];
  
  // Für Backend-Anfragen immer numerisches Format verwenden, wenn möglich
  if (isUuidFormat(sessionId)) {
    const numericId = toNumericFormat(sessionId);
    if (isNumericFormat(numericId) && numericId !== sessionId) {
      return url.replace(sessionIdRegex, `/sessions/${numericId}`);
    }
  }
  
  return url;
}

// Event Listener für Session-ID-Mapping aus Server-Antworten
export function setupSessionIdListener(): void {
  if (typeof window === 'undefined') return;
  
  // Event für neue Session-ID-Mappings
  window.addEventListener('session_id_mapping', ((event: CustomEvent) => {
    try {
      const { uuidId, numericId } = event.detail;
      if (uuidId && numericId) {
        addMapping(uuidId, numericId);
      }
    } catch (error) {
      console.error('[SessionIdAdapter] Fehler beim Verarbeiten des session_id_mapping-Events:', error);
    }
  }) as EventListener);
  
  console.log('[SessionIdAdapter] Session-ID-Listener eingerichtet');
}

// Automatisches Setup beim Import
setupSessionIdListener();

// Bekannte Session-ID-Mappings hinzufügen (aus Server-Logs extrahiert)
addMapping("40966d90-6115-4190-826f-ade80b8c74a4", "191");

// Add mappings for problematic UUIDs that were observed in the error logs
addMapping("371e24f2-d88a-4052-8c98-ed39761e751b", "188");
addMapping("85e59bd5-5cae-4c51-a231-93e68c02ab2c", "192");
addMapping("a28c096c-4da6-401f-9249-6c83fa232ed6", "193");
addMapping("6eddee49-d898-4d9d-b8cf-b44205e30925", "194"); // Added mapping for newly observed UUID

// Function to clear session ID mappings for debugging/resetting
export function clearMappings(): void {
  if (sessionIdCache) {
    sessionIdCache.numericToUuid = {};
    sessionIdCache.uuidToNumeric = {};
    saveCache();
    console.log('[SessionIdAdapter] Session-ID-Mappings wurden gelöscht');
  }
}

// Function to get all current mappings for debugging
export function getAllMappings(): SessionIdMapping {
  return initializeCache();
}

export default {
  toUuidFormat,
  toNumericFormat,
  isUuidFormat,
  isNumericFormat,
  addMapping,
  prepareSessionIdForRequest,
  extractAndMapSessionId,
  formatApiUrl,
  clearMappings,
  getAllMappings
};