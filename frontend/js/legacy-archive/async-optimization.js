/**
 * @deprecated Diese Legacy-Komponente ist veraltet und wird in Kürze entfernt.
 * Verwende stattdessen die Vue 3 SFC-Implementierung.
 * Geplantes Entfernungsdatum: 2025-06-10
 */

/**
 * async-optimization.js
 *
 * Bietet Funktionen zur Optimierung asynchroner Operationen,
 * einschließlich API-Aufrufe, Batch-Verarbeitung, Priorisierung und
 * progressives Laden von Inhalten.
 */


// Monitoring für Legacy-Code-Nutzung
function trackLegacyUsage(componentName, action) {
  if (typeof window.telemetry !== 'undefined') {
    window.telemetry.trackEvent('legacy_code_usage', {
      component: componentName,
      action: action,
      timestamp: new Date().toISOString()
    });
  }
}

// Tracking bei Modulinitialisierung
trackLegacyUsage('async-optimization', 'initialize');


const AsyncOptimization = (function () {
  // Speicherung der Anfrage-Warteschlangen
  const requestQueues = new Map();

  // Speicherung von Preload-Anfragen
  const preloadedResources = new Map();

  // Speicherung von ausstehenden Batches
  const pendingBatches = new Map();

  // Konfiguration
  const config = {
    // Standardverzögerung für das Debouncing von Anfragen (ms)
    defaultDebounceDelay: 300,

    // Maximale Wartezeit für Batch-Anfragen (ms)
    maxBatchWaitTime: 50,

    // Standardpriorität für Anfragen (niedrigere Zahlen = höhere Priorität)
    defaultPriority: 10,

    // Standardanzahl paralleler Anfragen pro Warteschlange
    concurrentRequests: 4,

    // Standardzeitlimit für Anfragen (ms)
    requestTimeout: 30000,

    // Standardverzögerung für Wiederholungsversuche (ms)
    retryDelayBase: 1000,

    // Maximale Anzahl von Wiederholungsversuchen
    maxRetries: 3,

    // Standardgröße für Batches
    batchSize: 10,

    // Verwaltung von Präfixen für API-Anfragen
    apiPrefixes: {
      default: "/api",
    },

    // Größe des Preload-Caches
    preloadCacheSize: 50,

    // TTL für Preload-Cache-Einträge (ms)
    preloadCacheTTL: 60000,

    // Debug-Modus
    debug: false,
  };

  /**
   * RequestQueue Klasse für verwaltete Anfragen
   */
  class RequestQueue {
    constructor(queueId, queueConfig = {}) {
      this.id = queueId;
      this.config = { ...config, ...queueConfig };
      this.queue = [];
      this.processing = 0;
      this.pendingRequests = new Map();
      this.timers = new Map();
      this.abortControllers = new Map();
    }

    /**
     * Fügt eine Anfrage zur Warteschlange hinzu
     * @param {Object} request - Die Anfrageinformationen
     * @returns {Promise} - Promise, der das Ergebnis liefert
     */
    enqueue(request) {
      const requestId =
        request.id ||
        `${this.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Wenn eine identische Anfrage bereits läuft, diese wiederverwenden
      if (this.pendingRequests.has(requestId)) {
        if (config.debug) {
          console.log(
            `[AsyncOptimization] Reusing pending request: ${requestId}`,
          );
        }
        return this.pendingRequests.get(requestId);
      }

      // Erstelle eine neue Promise für diese Anfrage
      const requestPromise = new Promise((resolve, reject) => {
        const abortController = new AbortController();

        // Füge die Anfrage zur Warteschlange hinzu
        this.queue.push({
          id: requestId,
          request,
          resolve,
          reject,
          abortController,
          priority: request.priority || this.config.defaultPriority,
          addedAt: Date.now(),
        });

        // Sortiere die Warteschlange nach Priorität
        this.sortQueue();

        // Speichere die Promise für spätere Referenz
        this.pendingRequests.set(requestId, requestPromise);
        this.abortControllers.set(requestId, abortController);

        // Starte die Verarbeitung, wenn möglich
        this.processQueue();
      });

      return requestPromise;
    }

    /**
     * Sortiert die Warteschlange nach Priorität
     */
    sortQueue() {
      this.queue.sort((a, b) => {
        // Zuerst nach Priorität (niedrigere Zahl = höhere Priorität)
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        // Bei gleicher Priorität nach Hinzufügezeit
        return a.addedAt - b.addedAt;
      });
    }

    /**
     * Verarbeitet Anfragen aus der Warteschlange
     */
    processQueue() {
      // Anzahl verfügbarer Slots berechnen
      const availableSlots = this.config.concurrentRequests - this.processing;

      // Wenn keine Slots verfügbar oder die Warteschlange leer ist, beenden
      if (availableSlots <= 0 || this.queue.length === 0) {
        return;
      }

      // Verarbeite bis zu availableSlots Anfragen
      for (let i = 0; i < Math.min(availableSlots, this.queue.length); i++) {
        this.processNextRequest();
      }
    }

    /**
     * Verarbeitet die nächste Anfrage in der Warteschlange
     */
    processNextRequest() {
      if (this.queue.length === 0) {
        return;
      }

      // Nächste Anfrage aus der Warteschlange holen
      const queueItem = this.queue.shift();
      const { id, request, resolve, reject, abortController } = queueItem;

      // Aktualisiere den Zähler für laufende Anfragen
      this.processing++;

      if (config.debug) {
        console.log(
          `[AsyncOptimization] Processing request: ${id} (${this.processing}/${this.config.concurrentRequests})`,
        );
      }

      // Timeout-Timer erstellen
      const timeoutDuration = request.timeout || this.config.requestTimeout;
      const timeoutId = setTimeout(() => {
        if (this.abortControllers.has(id)) {
          if (config.debug) {
            console.warn(`[AsyncOptimization] Request timeout: ${id}`);
          }

          // Anfrage abbrechen
          abortController.abort();

          // Fehler zurückgeben
          reject(new Error(`Request timeout after ${timeoutDuration}ms`));

          // Bereinigen
          this.cleanupRequest(id);
        }
      }, timeoutDuration);

      this.timers.set(id, timeoutId);

      // Anfrage ausführen
      this.executeRequest(request, id, abortController.signal)
        .then((result) => {
          resolve(result);
          this.cleanupRequest(id);
        })
        .catch((error) => {
          // Wenn die Anfrage abgebrochen wurde, keinen Fehler melden
          if (error.name === "AbortError") {
            return;
          }

          // Wenn Wiederholungsversuche konfiguriert sind, erneut versuchen
          if (
            request.retry &&
            request.retryCount < (request.maxRetries || this.config.maxRetries)
          ) {
            const retryCount = (request.retryCount || 0) + 1;
            const retryDelay = this.calculateRetryDelay(retryCount, request);

            if (config.debug) {
              console.log(
                `[AsyncOptimization] Retrying request: ${id} (${retryCount}/${request.maxRetries || this.config.maxRetries}) after ${retryDelay}ms`,
              );
            }

            // Neuen Wiederholungsversuch planen
            setTimeout(() => {
              const retryRequest = {
                ...request,
                retryCount,
              };

              this.enqueue(retryRequest).then(resolve).catch(reject);
            }, retryDelay);
          } else {
            reject(error);
          }

          this.cleanupRequest(id);
        })
        .finally(() => {
          // Warteschlange weiter verarbeiten
          this.processing--;
          this.processQueue();
        });
    }

    /**
     * Führt eine Anfrage aus
     * @param {Object} request - Die Anfrageinformationen
     * @param {string} requestId - Die ID der Anfrage
     * @param {AbortSignal} signal - Signal zum Abbrechen der Anfrage
     * @returns {Promise} - Promise mit dem Ergebnis
     */
    async executeRequest(request, requestId, signal) {
      try {
        const {
          url,
          method = "GET",
          body,
          headers = {},
          responseType = "json",
        } = request;

        if (config.debug) {
          console.log(
            `[AsyncOptimization] Executing ${method} request: ${url}`,
          );
        }

        // Preloaded Resource verwenden, wenn verfügbar
        if (method === "GET" && preloadedResources.has(url)) {
          const preloadedResource = preloadedResources.get(url);

          if (config.debug) {
            console.log(`[AsyncOptimization] Using preloaded resource: ${url}`);
          }

          // Entferne die Resource aus dem Preload-Cache
          preloadedResources.delete(url);

          return preloadedResource;
        }

        // Anfrage ausführen
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal,
        });

        // Fehler bei ungültigen Status-Codes
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Request failed with status ${response.status}: ${errorText}`,
          );
        }

        // Antwort je nach responseType verarbeiten
        let result;

        switch (responseType) {
          case "json":
            result = await response.json();
            break;
          case "text":
            result = await response.text();
            break;
          case "blob":
            result = await response.blob();
            break;
          case "arrayBuffer":
            result = await response.arrayBuffer();
            break;
          default:
            result = await response.json();
        }

        return result;
      } catch (error) {
        // Wenn die Anfrage abgebrochen wurde, eine spezifische Fehlermeldung senden
        if (error.name === "AbortError") {
          throw new Error(`Request was aborted: ${requestId}`);
        }

        throw error;
      }
    }

    /**
     * Bereinigt Ressourcen für eine abgeschlossene Anfrage
     * @param {string} requestId - Die ID der Anfrage
     */
    cleanupRequest(requestId) {
      // Timer löschen
      if (this.timers.has(requestId)) {
        clearTimeout(this.timers.get(requestId));
        this.timers.delete(requestId);
      }

      // AbortController entfernen
      this.abortControllers.delete(requestId);

      // Anfrage aus pendingRequests entfernen
      this.pendingRequests.delete(requestId);
    }

    /**
     * Berechnet die Verzögerung für einen Wiederholungsversuch
     * @param {number} retryCount - Die Anzahl der bisherigen Versuche
     * @param {Object} request - Die Anfrageinformationen
     * @returns {number} - Die Verzögerung in Millisekunden
     */
    calculateRetryDelay(retryCount, request) {
      // Basis-Verzögerung
      const baseDelay = request.retryDelay || this.config.retryDelayBase;

      // Exponentielles Backoff mit Jitter
      const exponentialPart = Math.pow(2, retryCount - 1) * baseDelay;
      const jitter = Math.random() * 0.5 * exponentialPart; // 0-50% Jitter

      return Math.floor(exponentialPart + jitter);
    }

    /**
     * Bricht alle laufenden Anfragen ab
     */
    abortAllRequests() {
      for (const [requestId, controller] of this.abortControllers.entries()) {
        if (config.debug) {
          console.log(`[AsyncOptimization] Aborting request: ${requestId}`);
        }

        controller.abort();
        this.cleanupRequest(requestId);
      }

      // Warteschlange leeren
      this.queue = [];
      this.processing = 0;
    }
  }

  /**
   * Erstellt oder gibt eine bestehende Anfrage-Warteschlange zurück
   * @param {string} queueId - Die ID der Warteschlange
   * @param {Object} queueConfig - Konfiguration für die Warteschlange
   * @returns {RequestQueue} - Die Warteschlange
   */
  function getQueue(queueId, queueConfig = {}) {
    if (!requestQueues.has(queueId)) {
      requestQueues.set(queueId, new RequestQueue(queueId, queueConfig));
    }

    return requestQueues.get(queueId);
  }

  /**
   * Verzögert die Ausführung einer Funktion (Debouncing)
   * @param {Function} fn - Die zu verzögernde Funktion
   * @param {number} delay - Die Verzögerung in Millisekunden
   * @returns {Function} - Die verzögerte Funktion
   */
  function debounce(fn, delay = config.defaultDebounceDelay) {
    let timeoutId;

    return function (...args) {
      const context = this;

      clearTimeout(timeoutId);

      return new Promise((resolve) => {
        timeoutId = setTimeout(() => {
          const result = fn.apply(context, args);
          resolve(result);
        }, delay);
      });
    };
  }

  /**
   * Begrenzt die Häufigkeit der Ausführung einer Funktion (Throttling)
   * @param {Function} fn - Die zu begrenzende Funktion
   * @param {number} limit - Die minimale Zeit zwischen Ausführungen (ms)
   * @returns {Function} - Die begrenzte Funktion
   */
  function throttle(fn, limit = config.defaultDebounceDelay) {
    let lastExecution = 0;
    let timeoutId;
    let lastArgs;
    let lastContext;
    let pendingExecution = false;

    const executeNow = function () {
      lastExecution = Date.now();
      timeoutId = null;
      pendingExecution = false;
      return fn.apply(lastContext, lastArgs);
    };

    return function (...args) {
      const context = this;
      lastArgs = args;
      lastContext = context;

      const now = Date.now();
      const remaining = limit - (now - lastExecution);

      return new Promise((resolve) => {
        if (remaining <= 0 || remaining > limit) {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }

          lastExecution = now;
          pendingExecution = false;
          const result = fn.apply(context, args);
          resolve(result);
        } else if (!pendingExecution) {
          pendingExecution = true;

          timeoutId = setTimeout(() => {
            const result = executeNow();
            resolve(result);
          }, remaining);
        }
      });
    };
  }

  /**
   * Führt eine API-Anfrage aus mit optimierten Optionen
   * @param {string} url - Die URL der Anfrage
   * @param {Object} options - Optionen für die Anfrage
   * @returns {Promise} - Promise mit dem Ergebnis
   */
  function request(url, options = {}) {
    const {
      method = "GET",
      body,
      headers = {},
      queueId = "default",
      priority,
      timeout,
      retry = true,
      maxRetries,
      retryDelay,
      responseType = "json",
      apiPrefix = "default",
    } = options;

    // URL mit API-Präfix ergänzen, falls erforderlich
    const fullUrl =
      url.startsWith("http") || url.startsWith("/")
        ? url
        : `${config.apiPrefixes[apiPrefix] || config.apiPrefixes.default}/${url}`;

    // Erstelle Anfrageobjekt
    const requestObj = {
      url: fullUrl,
      method,
      body,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...headers,
      },
      priority,
      timeout,
      retry,
      maxRetries,
      retryDelay,
      responseType,
    };

    // Anfrage über die Warteschlange ausführen
    return getQueue(queueId).enqueue(requestObj);
  }

  /**
   * GET-Anfrage mit optimierten Optionen
   * @param {string} url - Die URL der Anfrage
   * @param {Object} options - Optionen für die Anfrage
   * @returns {Promise} - Promise mit dem Ergebnis
   */
  function get(url, options = {}) {
    return request(url, { ...options, method: "GET" });
  }

  /**
   * POST-Anfrage mit optimierten Optionen
   * @param {string} url - Die URL der Anfrage
   * @param {Object} body - Der Body der Anfrage
   * @param {Object} options - Optionen für die Anfrage
   * @returns {Promise} - Promise mit dem Ergebnis
   */
  function post(url, body, options = {}) {
    return request(url, { ...options, method: "POST", body });
  }

  /**
   * PUT-Anfrage mit optimierten Optionen
   * @param {string} url - Die URL der Anfrage
   * @param {Object} body - Der Body der Anfrage
   * @param {Object} options - Optionen für die Anfrage
   * @returns {Promise} - Promise mit dem Ergebnis
   */
  function put(url, body, options = {}) {
    return request(url, { ...options, method: "PUT", body });
  }

  /**
   * DELETE-Anfrage mit optimierten Optionen
   * @param {string} url - Die URL der Anfrage
   * @param {Object} options - Optionen für die Anfrage
   * @returns {Promise} - Promise mit dem Ergebnis
   */
  function del(url, options = {}) {
    return request(url, { ...options, method: "DELETE" });
  }

  /**
   * Führt mehrere Anfragen als Batch aus
   * @param {Array} requests - Array von Anfrageobjekten
   * @param {Object} options - Optionen für den Batch
   * @returns {Promise} - Promise mit den Ergebnissen aller Anfragen
   */
  function batchRequests(requests, options = {}) {
    if (!requests || !requests.length) {
      return Promise.resolve([]);
    }

    const {
      batchSize = config.batchSize,
      queueId = "batch",
      concurrentRequests = config.concurrentRequests,
      collectResults = true,
    } = options;

    // Warteschlange mit angepasster Konfiguration erstellen
    const queue = getQueue(queueId, { concurrentRequests });

    // Anfragen in Batches aufteilen
    const batches = [];
    for (let i = 0; i < requests.length; i += batchSize) {
      batches.push(requests.slice(i, i + batchSize));
    }

    // Alle Batches sequentiell ausführen
    return batches.reduce(
      async (prevPromise, batch, batchIndex) => {
        const prevResults = await prevPromise;

        if (config.debug) {
          console.log(
            `[AsyncOptimization] Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} requests`,
          );
        }

        // Alle Anfragen im aktuellen Batch parallel ausführen
        const batchPromises = batch.map((req) => queue.enqueue(req));
        const batchResults = await Promise.all(batchPromises);

        // Ergebnisse sammeln, wenn gewünscht
        if (collectResults) {
          return [...prevResults, ...batchResults];
        }

        return prevResults;
      },
      Promise.resolve(collectResults ? [] : undefined),
    );
  }

  /**
   * Gruppiert ähnliche API-Aufrufe und führt sie als eine Anfrage aus
   * @param {string} batchId - Eindeutige ID für diesen Batch
   * @param {Function} batchFn - Funktion, die den Batch ausführt
   * @param {Object} options - Optionen für das Batching
   * @returns {Function} - Funktion zum Hinzufügen von Elementen zum Batch
   */
  function createRequestBatcher(batchId, batchFn, options = {}) {
    const {
      maxBatchWaitTime = config.maxBatchWaitTime,
      maxBatchSize = config.batchSize,
      processKey = (item) => JSON.stringify(item), // Schlüssel-Generierungsfunktion
      processResults = (results, keys) => {
        // Standardmäßig Ergebnisse nach Schlüsseln zuordnen
        const resultMap = new Map();
        results.forEach((result, index) => {
          resultMap.set(keys[index], result);
        });
        return resultMap;
      },
    } = options;

    // Neuen Batch erstellen, wenn er noch nicht existiert
    if (!pendingBatches.has(batchId)) {
      pendingBatches.set(batchId, {
        items: [],
        keys: [],
        promises: new Map(),
        timeoutId: null,
      });
    }

    // Batch-Verarbeitung
    const processBatch = async () => {
      const batch = pendingBatches.get(batchId);

      if (!batch || batch.items.length === 0) {
        return;
      }

      // Aktuellen Batch-Status speichern und neuen Batch erstellen
      const { items, keys, promises } = batch;

      // Batch-Status zurücksetzen
      pendingBatches.set(batchId, {
        items: [],
        keys: [],
        promises: new Map(),
        timeoutId: null,
      });

      try {
        if (config.debug) {
          console.log(
            `[AsyncOptimization] Processing batch ${batchId} with ${items.length} items`,
          );
        }

        // Batch-Funktion aufrufen
        const results = await batchFn(items);

        // Ergebnisse verarbeiten und zuordnen
        const processedResults = processResults(results, keys);

        // Promises erfüllen
        if (processedResults instanceof Map) {
          // Map mit Ergebnissen nach Schlüsseln
          for (const [key, promise] of promises.entries()) {
            if (processedResults.has(key)) {
              promise.resolve(processedResults.get(key));
            } else {
              promise.reject(new Error(`No result found for key: ${key}`));
            }
          }
        } else {
          // Einfaches Array von Ergebnissen
          keys.forEach((key, index) => {
            if (index < results.length) {
              promises.get(key).resolve(results[index]);
            } else {
              promises
                .get(key)
                .reject(new Error(`No result found for index: ${index}`));
            }
          });
        }
      } catch (error) {
        if (config.debug) {
          console.error(`[AsyncOptimization] Batch ${batchId} error:`, error);
        }

        // Alle Promises mit dem Fehler ablehnen
        for (const promise of promises.values()) {
          promise.reject(error);
        }
      }
    };

    // Rückgabefunktion zum Hinzufügen von Elementen zum Batch
    return (item) => {
      const batch = pendingBatches.get(batchId);
      const key = processKey(item);

      // Promise für dieses Element erstellen
      const promise = new Promise((resolve, reject) => {
        batch.promises.set(key, { resolve, reject });
      });

      // Element zum Batch hinzufügen
      batch.items.push(item);
      batch.keys.push(key);

      // Timer zurücksetzen
      if (batch.timeoutId) {
        clearTimeout(batch.timeoutId);
      }

      // Batch sofort verarbeiten, wenn die maximale Größe erreicht ist
      if (batch.items.length >= maxBatchSize) {
        processBatch();
      } else {
        // Andernfalls Timer für die Verarbeitung setzen
        batch.timeoutId = setTimeout(processBatch, maxBatchWaitTime);
      }

      return promise;
    };
  }

  /**
   * Lädt eine Ressource im Voraus und speichert sie für späteren Zugriff
   * @param {string} url - Die URL der zu ladenden Ressource
   * @param {Object} options - Optionen für die Anfrage
   * @returns {Promise} - Promise, der das Ergebnis liefert
   */
  function preloadResource(url, options = {}) {
    // Prüfen, ob bereits eine Vorladung für diese URL läuft
    if (preloadedResources.has(url)) {
      return Promise.resolve();
    }

    // Konfiguration für Preload-Anfragen
    const requestOptions = {
      ...options,
      priority: options.priority || 20, // Niedrigere Priorität für Preloads
      queueId: options.queueId || "preload",
    };

    // Anfrage starten
    const requestPromise = get(url, requestOptions);

    // Ressource im Preload-Cache speichern
    preloadedResources.set(url, requestPromise);

    // Cache-Größe überprüfen und ggf. älteste Einträge entfernen
    if (preloadedResources.size > config.preloadCacheSize) {
      const keys = Array.from(preloadedResources.keys());
      const oldestKey = keys[0];
      preloadedResources.delete(oldestKey);

      if (config.debug) {
        console.log(
          `[AsyncOptimization] Removed oldest preloaded resource: ${oldestKey}`,
        );
      }
    }

    // Automatisches Entfernen nach TTL
    setTimeout(() => {
      if (preloadedResources.has(url)) {
        preloadedResources.delete(url);

        if (config.debug) {
          console.log(`[AsyncOptimization] Preloaded resource expired: ${url}`);
        }
      }
    }, options.ttl || config.preloadCacheTTL);

    return requestPromise;
  }

  /**
   * Lädt mehrere verwandte Ressourcen progressiv
   * @param {Array} urls - URLs der zu ladenden Ressourcen, sortiert nach Priorität
   * @param {Function} processResourceFn - Funktion zur Verarbeitung jeder geladenen Ressource
   * @param {Object} options - Optionen für das progressive Laden
   * @returns {Promise} - Promise, der ein Objekt mit allen Ergebnissen liefert
   */
  function loadProgressively(urls, processResourceFn, options = {}) {
    if (!urls || !urls.length) {
      return Promise.resolve({});
    }

    const {
      concurrentLoads = 2,
      timeout = config.requestTimeout,
      signal = null,
      onProgress = null,
      stopOnError = false,
    } = options;

    // Objekt für gesammelte Ergebnisse
    const results = {};

    // Status-Variablen
    let completed = 0;
    let currentIndex = 0;
    let errors = [];
    let aborted = false;

    // Promise für die Gesamtoperation
    return new Promise((resolve, reject) => {
      // Abbruch-Handler, wenn ein Signal bereitgestellt wurde
      if (signal) {
        signal.addEventListener("abort", () => {
          aborted = true;
          reject(new Error("Progressive loading aborted"));
        });
      }

      // Funktion zum Laden der nächsten Ressource
      const loadNext = () => {
        if (aborted || currentIndex >= urls.length) {
          return;
        }

        const url = urls[currentIndex++];

        // Anfrage starten
        get(url, { timeout })
          .then(async (data) => {
            if (aborted) return;

            try {
              // Ressource verarbeiten
              if (processResourceFn) {
                results[url] = await processResourceFn(data, url, completed);
              } else {
                results[url] = data;
              }

              // Fortschritt aktualisieren
              completed++;

              // Fortschritts-Callback aufrufen
              if (onProgress) {
                onProgress({
                  completed,
                  total: urls.length,
                  progress: completed / urls.length,
                  currentUrl: url,
                  results,
                });
              }

              // Nächste Ressource laden
              loadNext();

              // Alle Ressourcen geladen
              if (completed === urls.length) {
                resolve(results);
              }
            } catch (error) {
              errors.push({ url, error });

              if (stopOnError) {
                reject(error);
              } else {
                // Trotz Fehler weitermachen
                loadNext();
              }
            }
          })
          .catch((error) => {
            if (aborted) return;

            errors.push({ url, error });

            if (stopOnError) {
              reject(error);
            } else {
              // Zähler aktualisieren, auch bei Fehler
              completed++;

              // Nächste Ressource laden
              loadNext();

              // Alle Ressourcen versucht
              if (completed === urls.length) {
                // Wenn alle fehlgeschlagen sind, Fehler zurückgeben
                if (Object.keys(results).length === 0) {
                  reject(
                    new Error(`All ${urls.length} progressive loads failed`),
                  );
                } else {
                  // Sonst trotz einiger Fehler die Ergebnisse zurückgeben
                  resolve(results);
                }
              }
            }
          });
      };

      // Starte den Ladeprozess mit der konfigurierten Anzahl paralleler Ladungen
      for (let i = 0; i < Math.min(concurrentLoads, urls.length); i++) {
        loadNext();
      }
    });
  }

  /**
   * Erstellt eine optimierte Baumstruktur für progressive Ladung
   * @param {Object} tree - Baum mit parent-child Beziehungen
   * @param {Object} options - Optionen für die Baumoptimierung
   * @returns {Array} - Optimal sortierte Liste von Load-Operationen
   */
  function createProgressiveTree(tree, options = {}) {
    const {
      rootId = "root",
      childrenKey = "children",
      idKey = "id",
      urlKey = "url",
      depthFirst = false,
    } = options;

    // Ergebnisliste
    const result = [];

    // Rekursive Funktion zum Durchlaufen des Baums
    function traverse(node, depth = 0) {
      if (!node) return;

      // Node zur Ergebnisliste hinzufügen
      result.push({
        id: node[idKey],
        url: node[urlKey],
        depth,
        parentId: node.parentId,
      });

      // Kinder verarbeiten, wenn vorhanden
      const children = node[childrenKey] || [];

      if (depthFirst) {
        // Tiefensuche - zuerst durch alle Kinder des ersten Knotens
        for (const child of children) {
          traverse({ ...child, parentId: node[idKey] }, depth + 1);
        }
      } else {
        // Breitensuche - zuerst alle Knoten auf einer Ebene
        // Dazu sortieren wir die Ergebnisliste später
      }
    }

    // Baum durchlaufen
    traverse(tree);

    // Bei Breitensuche nach Tiefe sortieren
    if (!depthFirst) {
      result.sort((a, b) => a.depth - b.depth);
    }

    // Nur die URLs in der richtigen Reihenfolge zurückgeben
    return result.map((item) => item.url);
  }

  /**
   * Konfiguriert das AsyncOptimization-Modul
   * @param {Object} options - Konfigurationsoptionen
   */
  function configure(options) {
    Object.assign(config, options);
  }

  // API für ESM-Export
  const api = {
    request,
    get,
    post,
    put,
    delete: del, // 'delete' ist ein reserviertes Wort
    batchRequests,
    createRequestBatcher,
    debounce,
    throttle,
    preloadResource,
    loadProgressively,
    createProgressiveTree,
    configure,

    // Abbruch und Bereinigung
    abortQueue: (queueId) => {
      if (requestQueues.has(queueId)) {
        requestQueues.get(queueId).abortAllRequests();
      }
    },

    abortAllQueues: () => {
      for (const queue of requestQueues.values()) {
        queue.abortAllRequests();
      }
    },

    clearPreloadCache: () => {
      preloadedResources.clear();
    },
  };

  // Für ESM-Import
  if (typeof exports !== "undefined") {
    exports.AsyncOptimization = api;
  }

  // Für globalen Zugriff
  window.AsyncOptimization = api;

  return api;
})();
