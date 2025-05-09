/**
 * data-optimization.js
 * 
 * Bietet Funktionen zur Optimierung des Datenzugriffs und der Datenverarbeitung,
 * einschließlich Caching, virtualisiertem Rendering und Speicheroptimierung.
 */

const DataOptimization = (function() {
    // Cache-Speicher mit TTL (Time To Live)
    const cache = new Map();
    
    // LRU (Least Recently Used) Tracking
    const lruList = [];
    
    // Virtual List State
    const virtualLists = new Map();
    
    // Konfiguration
    const config = {
        // Maximale Cache-Größe
        maxCacheSize: 100,
        // Standard-TTL in Millisekunden (10 Minuten)
        defaultTTL: 10 * 60 * 1000,
        // Virtual List Standard-Konfiguration
        virtualList: {
            itemHeight: 40,
            overscan: 5,
            debounceDelay: 16,
            useDividerItems: false
        },
        // Debug-Modus
        debug: false
    };
    
    /**
     * Cache-Management
     */
    
    /**
     * Speichert einen Wert im Cache
     * @param {string} key - Schlüssel für den Cache-Eintrag
     * @param {*} value - Zu speichernder Wert
     * @param {number} [ttl=config.defaultTTL] - Time-to-Live in Millisekunden
     * @param {Object} [metadata={}] - Zusätzliche Metadaten für den Cache-Eintrag
     * @returns {boolean} - True, wenn der Eintrag erfolgreich gespeichert wurde
     */
    function cacheSet(key, value, ttl = config.defaultTTL, metadata = {}) {
        // Maximale Cache-Größe überprüfen und ggf. älteste Einträge entfernen
        if (cache.size >= config.maxCacheSize && !cache.has(key)) {
            evictOldestEntries(1);
        }
        
        const now = Date.now();
        const expiresAt = ttl ? now + ttl : 0; // 0 bedeutet kein Ablauf
        
        cache.set(key, {
            value,
            createdAt: now,
            expiresAt,
            accessCount: 0,
            lastAccessed: now,
            metadata
        });
        
        // LRU-Tracking aktualisieren
        updateLRU(key);
        
        if (config.debug) {
            console.log(`[DataOptimization] Cached value for key: ${key}, expires in ${ttl}ms`);
        }
        
        return true;
    }
    
    /**
     * Liest einen Wert aus dem Cache
     * @param {string} key - Schlüssel des Cache-Eintrags
     * @returns {*|null} - Der gespeicherte Wert oder null, wenn nicht vorhanden oder abgelaufen
     */
    function cacheGet(key) {
        const entry = cache.get(key);
        
        if (!entry) {
            return null;
        }
        
        const now = Date.now();
        
        // Prüfe, ob der Eintrag abgelaufen ist
        if (entry.expiresAt > 0 && now > entry.expiresAt) {
            cache.delete(key);
            removeLRU(key);
            
            if (config.debug) {
                console.log(`[DataOptimization] Cache entry expired for key: ${key}`);
            }
            
            return null;
        }
        
        // Aktualisiere die Zugriffsstatistik
        entry.accessCount++;
        entry.lastAccessed = now;
        
        // LRU-Tracking aktualisieren
        updateLRU(key);
        
        return entry.value;
    }
    
    /**
     * Aktualisiert die LRU-Liste nach Zugriff auf einen Schlüssel
     * @param {string} key - Der Schlüssel, der aktualisiert wird
     */
    function updateLRU(key) {
        // Entferne den Schlüssel, wenn er bereits in der Liste ist
        removeLRU(key);
        
        // Füge den Schlüssel am Anfang der Liste ein (zuletzt verwendet)
        lruList.unshift(key);
    }
    
    /**
     * Entfernt einen Schlüssel aus der LRU-Liste
     * @param {string} key - Der zu entfernende Schlüssel
     */
    function removeLRU(key) {
        const index = lruList.indexOf(key);
        if (index !== -1) {
            lruList.splice(index, 1);
        }
    }
    
    /**
     * Entfernt die ältesten Einträge aus dem Cache
     * @param {number} count - Anzahl der zu entfernenden Einträge
     */
    function evictOldestEntries(count) {
        // Die am wenigsten verwendeten Einträge sind am Ende der LRU-Liste
        const toRemove = lruList.splice(-count, count);
        
        for (const key of toRemove) {
            if (config.debug) {
                console.log(`[DataOptimization] Evicting cache entry: ${key}`);
            }
            cache.delete(key);
        }
    }
    
    /**
     * Entfernt einen bestimmten Eintrag aus dem Cache
     * @param {string} key - Schlüssel des zu entfernenden Eintrags
     * @returns {boolean} - True, wenn der Eintrag gefunden und entfernt wurde
     */
    function cacheDelete(key) {
        const success = cache.delete(key);
        removeLRU(key);
        
        if (config.debug && success) {
            console.log(`[DataOptimization] Deleted cache entry: ${key}`);
        }
        
        return success;
    }
    
    /**
     * Löscht alle Einträge aus dem Cache
     */
    function cacheClear() {
        cache.clear();
        lruList.length = 0;
        
        if (config.debug) {
            console.log(`[DataOptimization] Cache cleared`);
        }
    }
    
    /**
     * Löscht abgelaufene Einträge aus dem Cache
     * @returns {number} - Anzahl der gelöschten Einträge
     */
    function clearExpiredEntries() {
        const now = Date.now();
        let count = 0;
        
        for (const [key, entry] of cache.entries()) {
            if (entry.expiresAt > 0 && now > entry.expiresAt) {
                cache.delete(key);
                removeLRU(key);
                count++;
            }
        }
        
        if (config.debug && count > 0) {
            console.log(`[DataOptimization] Cleared ${count} expired cache entries`);
        }
        
        return count;
    }
    
    /**
     * Gibt Cache-Statistiken zurück
     * @returns {Object} - Statistiken zum Cache-Zustand
     */
    function getCacheStats() {
        const now = Date.now();
        let activeCount = 0;
        let expiredCount = 0;
        let totalSize = 0;
        let oldestEntryAge = 0;
        let newestEntryAge = Infinity;
        
        for (const entry of cache.values()) {
            if (entry.expiresAt === 0 || now < entry.expiresAt) {
                activeCount++;
            } else {
                expiredCount++;
            }
            
            const age = now - entry.createdAt;
            oldestEntryAge = Math.max(oldestEntryAge, age);
            newestEntryAge = Math.min(newestEntryAge, age);
            
            // Grobe Schätzung der Größe (nicht exakt)
            try {
                const jsonSize = JSON.stringify(entry.value).length * 2; // Ungefähre Größe in Bytes
                totalSize += jsonSize;
            } catch (e) {
                // Ignoriere nicht serialisierbare Werte
            }
        }
        
        return {
            totalEntries: cache.size,
            activeEntries: activeCount,
            expiredEntries: expiredCount,
            totalSizeBytes: totalSize,
            oldestEntryAge,
            newestEntryAge: newestEntryAge === Infinity ? 0 : newestEntryAge,
            lruListSize: lruList.length
        };
    }
    
    /**
     * Memoization von Funktionsaufrufen
     * @param {Function} fn - Die zu memoizierende Funktion
     * @param {Function} [keyFn] - Optionale Funktion zur Generierung des Cache-Schlüssels
     * @param {number} [ttl=config.defaultTTL] - Time-to-Live für Cache-Einträge
     * @returns {Function} - Die memoizierte Funktion
     */
    function memoize(fn, keyFn, ttl = config.defaultTTL) {
        return function(...args) {
            const key = keyFn 
                ? keyFn(...args) 
                : `memoize_${fn.name || 'anonymous'}_${JSON.stringify(args)}`;
            
            const cachedResult = cacheGet(key);
            
            if (cachedResult !== null) {
                return cachedResult;
            }
            
            const result = fn.apply(this, args);
            
            // Behandle Promises gesondert
            if (result instanceof Promise) {
                return result.then(value => {
                    cacheSet(key, value, ttl);
                    return value;
                });
            }
            
            cacheSet(key, result, ttl);
            return result;
        };
    }
    
    /**
     * Virtualisiertes Rendering
     */
    
    /**
     * Initialisiert ein virtualisiertes Listenrendering
     * @param {string} listId - Eindeutige ID für die Liste
     * @param {Array} items - Die vollständige Liste der Elemente
     * @param {Object} options - Konfigurationsoptionen für die virtualisierte Liste
     * @returns {Object} - State-Objekt für die virtualisierte Liste
     */
    function initVirtualList(listId, items, options = {}) {
        const listOptions = {
            ...config.virtualList,
            ...options
        };
        
        const state = {
            items,
            visibleStartIndex: 0,
            visibleEndIndex: Math.min(items.length - 1, listOptions.overscan * 2),
            scrollTop: 0,
            containerHeight: 0,
            itemHeight: listOptions.itemHeight,
            overscan: listOptions.overscan,
            scrollListener: null,
            resizeListener: null,
            debounceTimeout: null,
            debounceDelay: listOptions.debounceDelay,
            useDividerItems: listOptions.useDividerItems,
            dividerIndices: options.dividerIndices || []
        };
        
        virtualLists.set(listId, state);
        
        if (config.debug) {
            console.log(`[DataOptimization] Initialized virtual list: ${listId} with ${items.length} items`);
        }
        
        return state;
    }
    
    /**
     * Aktualisiert die Daten einer virtualisierten Liste
     * @param {string} listId - ID der Liste
     * @param {Array} items - Neue Elemente für die Liste
     * @returns {Object} - Aktualisiertes State-Objekt
     */
    function updateVirtualListItems(listId, items) {
        const state = virtualLists.get(listId);
        
        if (!state) {
            console.warn(`[DataOptimization] Virtual list not found: ${listId}`);
            return null;
        }
        
        state.items = items;
        
        // Anpassung der sichtbaren Indizes bei Änderung der Listenlänge
        state.visibleEndIndex = Math.min(
            items.length - 1, 
            state.visibleStartIndex + state.overscan * 2
        );
        
        if (config.debug) {
            console.log(`[DataOptimization] Updated virtual list: ${listId} with ${items.length} items`);
        }
        
        return state;
    }
    
    /**
     * Berechnet die aktuell sichtbaren Elemente für eine virtualisierte Liste
     * @param {string} listId - ID der Liste
     * @param {number} scrollTop - Aktuelle Scroll-Position
     * @param {number} containerHeight - Höhe des sichtbaren Bereichs
     * @returns {Object} - Objekt mit aktualisierten Informationen zur Liste
     */
    function getVirtualListVisibleItems(listId, scrollTop, containerHeight) {
        const state = virtualLists.get(listId);
        
        if (!state) {
            console.warn(`[DataOptimization] Virtual list not found: ${listId}`);
            return null;
        }
        
        state.scrollTop = scrollTop;
        state.containerHeight = containerHeight;
        
        // Berechne die sichtbaren Indizes
        const itemHeight = state.itemHeight;
        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - state.overscan);
        const endIndex = Math.min(
            state.items.length - 1, 
            Math.ceil((scrollTop + containerHeight) / itemHeight) + state.overscan
        );
        
        state.visibleStartIndex = startIndex;
        state.visibleEndIndex = endIndex;
        
        // Berechne den Offset für das Containerplatzhalter-Element
        const totalHeight = state.items.length * itemHeight;
        const offsetY = startIndex * itemHeight;
        
        // Sichtbare Elemente extrahieren
        const visibleItems = state.items.slice(startIndex, endIndex + 1);
        
        // Wenn Trennelemente verwendet werden, diese einbeziehen
        let visibleItemsWithDividers = visibleItems;
        if (state.useDividerItems && state.dividerIndices.length > 0) {
            // Bestimme sichtbare Trennelemente
            const visibleDividers = state.dividerIndices
                .filter(idx => idx >= startIndex && idx <= endIndex)
                .map(idx => ({ 
                    isDivider: true, 
                    index: idx, 
                    offsetIndex: idx - startIndex 
                }));
                
            if (visibleDividers.length > 0) {
                // Erweitere visibleItems mit Trennelementen
                visibleItemsWithDividers = [];
                let currentDividerIndex = 0;
                
                for (let i = 0; i < visibleItems.length; i++) {
                    const absoluteIndex = startIndex + i;
                    
                    // Füge Trennelemente an der richtigen Stelle ein
                    while (
                        currentDividerIndex < visibleDividers.length && 
                        visibleDividers[currentDividerIndex].index === absoluteIndex
                    ) {
                        visibleItemsWithDividers.push(visibleDividers[currentDividerIndex]);
                        currentDividerIndex++;
                    }
                    
                    // Füge das eigentliche Element hinzu
                    visibleItemsWithDividers.push({
                        item: visibleItems[i],
                        index: absoluteIndex,
                        isDivider: false
                    });
                }
            } else {
                // Wenn keine Trennelemente sichtbar sind, formatiere die Elemente einheitlich
                visibleItemsWithDividers = visibleItems.map((item, i) => ({
                    item,
                    index: startIndex + i,
                    isDivider: false
                }));
            }
        }
        
        return {
            visibleItems: visibleItemsWithDividers,
            startIndex,
            endIndex,
            totalHeight,
            offsetY,
            scrollTop,
            containerHeight
        };
    }
    
    /**
     * Erstellt eine Scroll-Handler-Funktion für eine virtualisierte Liste
     * @param {string} listId - ID der Liste
     * @param {Function} renderCallback - Callback-Funktion, die beim Scrollen aufgerufen wird
     * @returns {Function} - Scroll-Handler-Funktion
     */
    function createVirtualListScrollHandler(listId, renderCallback) {
        return function(event) {
            const state = virtualLists.get(listId);
            
            if (!state) {
                return;
            }
            
            const target = event.target;
            const scrollTop = target.scrollTop;
            const containerHeight = target.clientHeight;
            
            // Debounce, um zu häufige Aktualisierungen zu vermeiden
            if (state.debounceTimeout) {
                clearTimeout(state.debounceTimeout);
            }
            
            state.debounceTimeout = setTimeout(() => {
                const visibleItemsData = getVirtualListVisibleItems(
                    listId, 
                    scrollTop, 
                    containerHeight
                );
                
                if (renderCallback && visibleItemsData) {
                    renderCallback(visibleItemsData);
                }
            }, state.debounceDelay);
        };
    }
    
    /**
     * Registriert Event-Listener für eine virtualisierte Liste
     * @param {string} listId - ID der Liste
     * @param {Element} containerElement - Das Container-Element
     * @param {Function} renderCallback - Callback-Funktion für Aktualisierungen
     */
    function registerVirtualListEvents(listId, containerElement, renderCallback) {
        const state = virtualLists.get(listId);
        
        if (!state || !containerElement) {
            return;
        }
        
        // Bestehende Listener entfernen
        cleanupVirtualListEvents(listId);
        
        // Neuen Scroll-Listener erstellen
        state.scrollListener = createVirtualListScrollHandler(listId, renderCallback);
        containerElement.addEventListener('scroll', state.scrollListener);
        
        // Resize-Listener für Containergrößenänderungen
        state.resizeListener = function() {
            if (state.debounceTimeout) {
                clearTimeout(state.debounceTimeout);
            }
            
            state.debounceTimeout = setTimeout(() => {
                const visibleItemsData = getVirtualListVisibleItems(
                    listId, 
                    containerElement.scrollTop, 
                    containerElement.clientHeight
                );
                
                if (renderCallback && visibleItemsData) {
                    renderCallback(visibleItemsData);
                }
            }, state.debounceDelay);
        };
        
        // ResizeObserver verwenden, falls verfügbar
        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver(state.resizeListener);
            resizeObserver.observe(containerElement);
            state.resizeObserver = resizeObserver;
        } else {
            // Fallback auf Window-Resize
            window.addEventListener('resize', state.resizeListener);
        }
        
        // Initiale Berechnung
        const visibleItemsData = getVirtualListVisibleItems(
            listId, 
            containerElement.scrollTop, 
            containerElement.clientHeight
        );
        
        if (renderCallback && visibleItemsData) {
            renderCallback(visibleItemsData);
        }
    }
    
    /**
     * Entfernt Event-Listener für eine virtualisierte Liste
     * @param {string} listId - ID der Liste
     */
    function cleanupVirtualListEvents(listId) {
        const state = virtualLists.get(listId);
        
        if (!state) {
            return;
        }
        
        if (state.debounceTimeout) {
            clearTimeout(state.debounceTimeout);
            state.debounceTimeout = null;
        }
        
        if (state.scrollListener) {
            document.removeEventListener('scroll', state.scrollListener);
            state.scrollListener = null;
        }
        
        if (state.resizeObserver) {
            state.resizeObserver.disconnect();
            state.resizeObserver = null;
        } else if (state.resizeListener) {
            window.removeEventListener('resize', state.resizeListener);
            state.resizeListener = null;
        }
    }
    
    /**
     * Entfernt eine virtualisierte Liste
     * @param {string} listId - ID der Liste
     */
    function destroyVirtualList(listId) {
        cleanupVirtualListEvents(listId);
        virtualLists.delete(listId);
        
        if (config.debug) {
            console.log(`[DataOptimization] Destroyed virtual list: ${listId}`);
        }
    }
    
    /**
     * Speicheroptimierung
     */
    
    /**
     * Optimiert ein großes Array durch Verwendung von TypedArrays wo möglich
     * @param {Array} array - Das zu optimierende Array
     * @returns {Object} - Ein optimiertes Array-Objekt mit Hilfsmethoden
     */
    function optimizeArray(array) {
        if (!array || !array.length) {
            return { data: [], type: 'empty', get: (i) => undefined, length: 0 };
        }
        
        // Überprüfe den Typ der Elemente im Array
        const firstItem = array[0];
        let optimizedData;
        let type;
        
        if (typeof firstItem === 'number') {
            // Prüfe, ob alle Elemente Zahlen sind
            const allNumbers = array.every(item => typeof item === 'number');
            
            if (allNumbers) {
                // Prüfe, ob alle Zahlen Integer sind
                const allIntegers = array.every(item => Number.isInteger(item));
                
                if (allIntegers) {
                    // Prüfe, ob alle Zahlen im Bereich von Int32 liegen
                    const allInInt32Range = array.every(item => 
                        item >= -2147483648 && item <= 2147483647);
                    
                    if (allInInt32Range) {
                        optimizedData = new Int32Array(array);
                        type = 'int32';
                    } else {
                        // Float64Array für große oder Fließkommazahlen
                        optimizedData = new Float64Array(array);
                        type = 'float64';
                    }
                } else {
                    // Float64Array für Fließkommazahlen
                    optimizedData = new Float64Array(array);
                    type = 'float64';
                }
            } else {
                // Gemischte Typen, normales Array verwenden
                optimizedData = array;
                type = 'mixed';
            }
        } else {
            // Nicht-numerische Daten, normales Array verwenden
            optimizedData = array;
            type = typeof firstItem;
        }
        
        return {
            data: optimizedData,
            type,
            get: (i) => optimizedData[i],
            length: array.length,
            // Hilfsmethoden
            map: (fn) => Array.from(optimizedData).map(fn),
            filter: (fn) => Array.from(optimizedData).filter(fn),
            slice: (start, end) => Array.from(optimizedData).slice(start, end),
            forEach: (fn) => Array.from(optimizedData).forEach(fn)
        };
    }
    
    /**
     * Erstellt eine Wrapper-Funktion, die Argumente und Rückgabewerte optimiert
     * @param {Function} fn - Die zu optimierende Funktion
     * @returns {Function} - Die optimierte Funktion
     */
    function optimizeFunction(fn) {
        return function(...args) {
            // Optimiere Eingabeargumente
            const optimizedArgs = args.map(arg => {
                if (Array.isArray(arg) && arg.length > 100) {
                    return optimizeArray(arg);
                }
                return arg;
            });
            
            // Rufe die Original-Funktion auf
            const result = fn.apply(this, optimizedArgs.map(arg => 
                arg && arg.data ? arg.data : arg
            ));
            
            // Optimiere den Rückgabewert, wenn möglich
            if (Array.isArray(result) && result.length > 100) {
                return optimizeArray(result);
            }
            
            return result;
        };
    }
    
    /**
     * Erstellt eine tiefe, immutable Kopie eines Objekts oder Arrays
     * Vermeidet unnötige Kopien von unveränderten Teilen
     * @param {Object|Array} obj - Das zu kopierende Objekt oder Array
     * @returns {Object|Array} - Eine Kopie des Objekts oder Arrays
     */
    function immutableCopy(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (Array.isArray(obj)) {
            // Optimierte Array-Kopie
            if (obj.length > 1000) {
                // Verwende Structured Clone für sehr große Arrays
                return structuredClone ? structuredClone(obj) : [...obj];
            }
            return [...obj];
        }
        
        // Für Objekte
        return { ...obj };
    }
    
    /**
     * Erstellt eine tiefe, immutable Kopie eines Objekts oder Arrays
     * Spezialisiert auf große Datenstrukturen mit Referenzieller Transparenz
     * @param {Object|Array} obj - Das zu kopierende Objekt oder Array
     * @param {Object|Array} nextObj - Das Objekt oder Array mit Änderungen
     * @returns {Object|Array} - Eine optimierte Kopie mit Teilen des Originals
     */
    function immutableUpdate(obj, nextObj) {
        // Wenn eines der Argumente kein Objekt ist, verwende nextObj
        if (obj === null || typeof obj !== 'object' || 
            nextObj === null || typeof nextObj !== 'object') {
            return nextObj;
        }
        
        // Wenn beide Arrays sind
        if (Array.isArray(obj) && Array.isArray(nextObj)) {
            // Wenn die Arrays gleiche Länge haben, prüfe auf Unterschiede
            if (obj.length === nextObj.length) {
                let hasChanges = false;
                
                for (let i = 0; i < obj.length; i++) {
                    if (obj[i] !== nextObj[i]) {
                        hasChanges = true;
                        break;
                    }
                }
                
                // Wenn keine Änderungen, gib das Original zurück
                if (!hasChanges) {
                    return obj;
                }
            }
            
            return nextObj;
        }
        
        // Für reguläre Objekte
        const result = { ...obj };
        let hasChanges = false;
        
        // Überprüfe jede Eigenschaft auf Änderungen
        for (const key in nextObj) {
            if (Object.prototype.hasOwnProperty.call(nextObj, key)) {
                const value = obj[key];
                const nextValue = nextObj[key];
                
                if (value !== nextValue) {
                    // Wenn beide Werte Objekte sind, rekursiv aktualisieren
                    if (value !== null && typeof value === 'object' && 
                        nextValue !== null && typeof nextValue === 'object') {
                        result[key] = immutableUpdate(value, nextValue);
                    } else {
                        result[key] = nextValue;
                    }
                    
                    hasChanges = true;
                }
            }
        }
        
        // Bei fehlenden Eigenschaften in nextObj
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key) && 
                !Object.prototype.hasOwnProperty.call(nextObj, key)) {
                hasChanges = true;
                break;
            }
        }
        
        // Wenn keine Änderungen, gib das Original zurück
        return hasChanges ? result : obj;
    }
    
    /**
     * Konfiguriert das DataOptimization-Modul
     * @param {Object} options - Konfigurationsoptionen
     */
    function configure(options) {
        Object.assign(config, options);
    }
    
    // Automatische Bereinigung abgelaufener Cache-Einträge
    setInterval(clearExpiredEntries, 60000); // Alle 60 Sekunden
    
    // Öffentliche API
    return {
        // Cache-Funktionen
        cacheSet,
        cacheGet,
        cacheDelete,
        cacheClear,
        clearExpiredEntries,
        getCacheStats,
        
        // Funktionsoptimierung
        memoize,
        
        // Virtuelles Listen-Rendering
        initVirtualList,
        updateVirtualListItems,
        getVirtualListVisibleItems,
        createVirtualListScrollHandler,
        registerVirtualListEvents,
        cleanupVirtualListEvents,
        destroyVirtualList,
        
        // Speicheroptimierung
        optimizeArray,
        optimizeFunction,
        immutableCopy,
        immutableUpdate,
        
        // Konfiguration
        configure
    };
})();

// Für ESM-Import
if (typeof exports !== 'undefined') {
    exports.DataOptimization = DataOptimization;
}

// Für globalen Zugriff
window.DataOptimization = DataOptimization;