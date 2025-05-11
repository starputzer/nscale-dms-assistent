/**
 * @deprecated Diese Legacy-Komponente ist veraltet und wird in Kürze entfernt.
 * Verwende stattdessen die Vue 3 SFC-Implementierung.
 * Geplantes Entfernungsdatum: 2025-06-10
 */

/**
 * performance-metrics.js
 * Werkzeug zur Messung und Protokollierung der Leistung der Vanilla-JS-Komponenten
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
trackLegacyUsage('performance-metrics', 'initialize');


const PerformanceMetrics = (function () {
  // Speicherung der Messergebnisse
  const measurements = {};
  const observers = {};

  // Konfiguration
  const config = {
    // Anzahl der Messungen, die im Speicher behalten werden sollen
    maxMeasurements: 100,
    // Druchschnittliche Berechnungsintervalle (ms)
    avgIntervals: [1000, 5000, 30000],
    // Debug-Modus
    debug: false,
  };

  /**
   * Markiert den Beginn einer Leistungsmessung
   * @param {string} metricName - Name der zu messenden Metrik
   * @param {Object} [details={}] - Zusätzliche Details zur Messung
   * @returns {string} Eine eindeutige ID für diese Messung
   */
  function startMeasure(metricName, details = {}) {
    if (!measurements[metricName]) {
      measurements[metricName] = [];
    }

    const measureId = `${metricName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();

    measurements[metricName].push({
      id: measureId,
      startTime,
      details,
      inProgress: true,
    });

    // Begrenze die Anzahl der gespeicherten Messungen
    if (measurements[metricName].length > config.maxMeasurements) {
      measurements[metricName] = measurements[metricName].slice(
        -config.maxMeasurements,
      );
    }

    if (config.debug) {
      console.log(
        `[PerformanceMetrics] Started measuring '${metricName}'`,
        details,
      );
    }

    return measureId;
  }

  /**
   * Beendet eine Leistungsmessung
   * @param {string} metricName - Name der gemessenen Metrik
   * @param {string} measureId - Die eindeutige ID der Messung
   * @param {Object} [additionalDetails={}] - Zusätzliche Details, die nach der Messung hinzugefügt werden sollen
   * @returns {Object|null} Die Messergebnisse oder null, wenn die Messung nicht gefunden wurde
   */
  function endMeasure(metricName, measureId, additionalDetails = {}) {
    if (!measurements[metricName]) {
      console.warn(
        `[PerformanceMetrics] No measurements found for '${metricName}'`,
      );
      return null;
    }

    const endTime = performance.now();
    const measureIndex = measurements[metricName].findIndex(
      (m) => m.id === measureId,
    );

    if (measureIndex === -1) {
      console.warn(
        `[PerformanceMetrics] Measurement with ID '${measureId}' not found for '${metricName}'`,
      );
      return null;
    }

    const measurement = measurements[metricName][measureIndex];
    const duration = endTime - measurement.startTime;

    // Aktualisiere die Messung
    measurements[metricName][measureIndex] = {
      ...measurement,
      endTime,
      duration,
      additionalDetails,
      inProgress: false,
    };

    const result = measurements[metricName][measureIndex];

    if (config.debug) {
      console.log(
        `[PerformanceMetrics] Completed measuring '${metricName}': ${duration.toFixed(2)}ms`,
        result,
      );
    }

    // Benachrichtige Observer
    notifyObservers(metricName, result);

    return result;
  }

  /**
   * Führt eine einmalige Messung durch
   * @param {string} metricName - Name der zu messenden Metrik
   * @param {Function} fn - Die auszuführende Funktion
   * @param {Object} [details={}] - Zusätzliche Details zur Messung
   * @returns {Object} Das Ergebnis der Funktion und die Messdaten
   */
  function measure(metricName, fn, details = {}) {
    const measureId = startMeasure(metricName, details);
    let result, error;

    try {
      result = fn();
    } catch (e) {
      error = e;
      throw e;
    } finally {
      const additionalDetails = {
        ...details,
        success: !error,
        error: error ? error.message : undefined,
      };

      const measurementData = endMeasure(
        metricName,
        measureId,
        additionalDetails,
      );

      if (result instanceof Promise) {
        return result
          .then((asyncResult) => {
            additionalDetails.success = true;
            endMeasure(metricName, measureId, additionalDetails);
            return asyncResult;
          })
          .catch((e) => {
            additionalDetails.success = false;
            additionalDetails.error = e.message;
            endMeasure(metricName, measureId, additionalDetails);
            throw e;
          });
      }

      return { result, measurement: measurementData };
    }
  }

  /**
   * Gibt die Statistiken für eine bestimmte Metrik zurück
   * @param {string} metricName - Name der Metrik
   * @param {number} [timeWindow=30000] - Zeitfenster in Millisekunden für die Berechnung
   * @returns {Object} Die Statistiken
   */
  function getStats(metricName, timeWindow = 30000) {
    if (!measurements[metricName]) {
      return {
        count: 0,
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        successRate: 100,
        inProgressCount: 0,
      };
    }

    const now = performance.now();
    const relevantMeasurements = measurements[metricName].filter(
      (m) => !m.inProgress && now - m.endTime <= timeWindow,
    );

    if (relevantMeasurements.length === 0) {
      return {
        count: 0,
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        successRate: 100,
        inProgressCount: measurements[metricName].filter((m) => m.inProgress)
          .length,
      };
    }

    const durations = relevantMeasurements
      .map((m) => m.duration)
      .sort((a, b) => a - b);
    const successCount = relevantMeasurements.filter(
      (m) => m.additionalDetails && m.additionalDetails.success !== false,
    ).length;

    const stats = {
      count: durations.length,
      avg:
        durations.reduce((sum, duration) => sum + duration, 0) /
        durations.length,
      min: durations[0],
      max: durations[durations.length - 1],
      p50: durations[Math.floor(durations.length * 0.5)],
      p90: durations[Math.floor(durations.length * 0.9)],
      p95: durations[Math.floor(durations.length * 0.95)],
      successRate: (successCount / relevantMeasurements.length) * 100,
      inProgressCount: measurements[metricName].filter((m) => m.inProgress)
        .length,
    };

    return stats;
  }

  /**
   * Registriert einen Observer für eine bestimmte Metrik
   * @param {string} metricName - Name der Metrik
   * @param {Function} callback - Callback-Funktion, die bei Änderungen aufgerufen wird
   * @returns {Function} Eine Funktion zum Entfernen des Observers
   */
  function observeMetric(metricName, callback) {
    if (!observers[metricName]) {
      observers[metricName] = [];
    }

    observers[metricName].push(callback);

    return () => {
      observers[metricName] = observers[metricName].filter(
        (cb) => cb !== callback,
      );
    };
  }

  /**
   * Benachrichtigt alle Observer für eine bestimmte Metrik
   * @param {string} metricName - Name der Metrik
   * @param {Object} data - Die Messdaten
   */
  function notifyObservers(metricName, data) {
    if (!observers[metricName]) {
      return;
    }

    observers[metricName].forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(
          `[PerformanceMetrics] Error in observer for '${metricName}':`,
          error,
        );
      }
    });
  }

  /**
   * Misst die DOM-Änderungsrate
   * @param {string} selector - CSS-Selector für das zu beobachtende Element
   * @param {string} customMetricName - Optionaler benutzerdefinierter Name für die Metrik
   * @returns {Function} Eine Funktion zum Stoppen der Messung
   */
  function measureDOMChanges(selector, customMetricName) {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn(`[PerformanceMetrics] Element not found: ${selector}`);
      return () => {};
    }

    const metricName = customMetricName || `dom_changes_${selector}`;
    let lastMutationTime = performance.now();
    let mutationCount = 0;
    let intervalId;

    // Erstelle einen MutationObserver
    const observer = new MutationObserver((mutations) => {
      mutationCount += mutations.length;
      lastMutationTime = performance.now();
    });

    // Starte die Beobachtung
    observer.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    // Erstelle ein Intervall zur Aufzeichnung der Mutations-Rate
    intervalId = setInterval(() => {
      const now = performance.now();
      const elapsed = now - lastMutationTime;

      if (mutationCount > 0) {
        startMeasure(metricName, { selector, mutationCount });
        endMeasure(metricName, `${metricName}_${now}`, {
          selector,
          mutationCount,
          elapsedSinceLastMutation: elapsed,
        });

        // Setze die Zählung zurück
        mutationCount = 0;
      }
    }, 1000);

    // Funktion zum Stoppen der Messung zurückgeben
    return () => {
      observer.disconnect();
      clearInterval(intervalId);
    };
  }

  /**
   * Misst die Zeit eines Netzwerkaufrufs
   * @param {string} metricName - Name der Metrik
   * @param {string} url - Die URL, an die die Anfrage gesendet werden soll
   * @param {Object} options - Anfrage-Optionen (wie bei fetch)
   * @returns {Promise} Ein Promise mit der Antwort
   */
  function measureFetch(metricName, url, options = {}) {
    return measure(
      metricName,
      () => fetch(url, options).then((response) => response.json()),
      { url, ...options },
    );
  }

  /**
   * Überwacht die Rendering-Performance
   * @returns {Function} Eine Funktion zum Stoppen der Überwachung
   */
  function monitorRenderingPerformance() {
    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let animFrameId;

    function updateFps() {
      frameCount++;

      const now = performance.now();
      const elapsed = now - lastFpsUpdate;

      if (elapsed >= 1000) {
        const fps = (frameCount / elapsed) * 1000;

        startMeasure("rendering_fps", { frameCount, elapsed });
        endMeasure("rendering_fps", `fps_${now}`, {
          fps,
          frameCount,
          elapsed,
        });

        frameCount = 0;
        lastFpsUpdate = now;
      }

      animFrameId = requestAnimationFrame(updateFps);
    }

    updateFps();

    return () => {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
      }
    };
  }

  /**
   * Misst die Scroll-Performance
   * @param {string} selector - CSS-Selector für das zu überwachende Element
   * @param {string} customMetricName - Optionaler benutzerdefinierter Name für die Metrik
   * @returns {Function} Eine Funktion zum Stoppen der Überwachung
   */
  function measureScrollPerformance(selector, customMetricName) {
    const element = document.querySelector(selector) || window;
    const metricName = customMetricName || `scroll_performance_${selector}`;

    let lastScrollTime = 0;
    let scrollCount = 0;
    let isScrolling = false;
    let scrollMetricId = null;
    let scrollTimeout;

    function handleScroll() {
      const now = performance.now();
      scrollCount++;

      if (!isScrolling) {
        isScrolling = true;
        scrollMetricId = startMeasure(metricName, { selector });
        lastScrollTime = now;
      }

      // Setze den Timeout zurück
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (isScrolling) {
          isScrolling = false;
          endMeasure(metricName, scrollMetricId, {
            selector,
            scrollCount,
            duration: performance.now() - lastScrollTime,
          });
          scrollCount = 0;
        }
      }, 100);
    }

    // Registriere den Event-Listener
    element.addEventListener("scroll", handleScroll, { passive: true });

    // Funktion zum Entfernen des Listeners zurückgeben
    return () => {
      element.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);

      if (isScrolling) {
        endMeasure(metricName, scrollMetricId, {
          selector,
          scrollCount,
          duration: performance.now() - lastScrollTime,
          terminated: true,
        });
      }
    };
  }

  /**
   * Misst die Event-Loop-Blockierungszeit
   * @returns {Function} Eine Funktion zum Stoppen der Überwachung
   */
  function measureEventLoopBlocking() {
    let lastTime = performance.now();
    let intervalId;

    intervalId = setInterval(() => {
      const now = performance.now();
      const elapsed = now - lastTime;

      // Wenn die verstrichene Zeit deutlich höher ist als das Intervall,
      // wurde der Event-Loop möglicherweise blockiert
      if (elapsed > 120) {
        startMeasure("event_loop_blocking", { expectedInterval: 100 });
        endMeasure("event_loop_blocking", `blocking_${now}`, {
          blockingTime: elapsed - 100,
          timestamp: now,
        });
      }

      lastTime = now;
    }, 100);

    return () => clearInterval(intervalId);
  }

  /**
   * Speichert alle aktuellen Messwerte im localStorage
   */
  function saveMeasurementsToStorage() {
    try {
      const allStats = {};

      // Berechne Statistiken für alle Metriken
      Object.keys(measurements).forEach((metricName) => {
        config.avgIntervals.forEach((interval) => {
          allStats[`${metricName}_${interval}ms`] = getStats(
            metricName,
            interval,
          );
        });
      });

      // Speichere im localStorage
      localStorage.setItem(
        "performance_metrics",
        JSON.stringify({
          timestamp: Date.now(),
          stats: allStats,
        }),
      );

      if (config.debug) {
        console.log("[PerformanceMetrics] Saved measurements to localStorage");
      }
    } catch (error) {
      console.error("[PerformanceMetrics] Error saving measurements:", error);
    }
  }

  /**
   * Lädt Messwerte aus dem localStorage
   * @returns {Object|null} Die geladenen Messwerte oder null, wenn keine vorhanden sind
   */
  function loadMeasurementsFromStorage() {
    try {
      const storedData = localStorage.getItem("performance_metrics");
      if (!storedData) {
        return null;
      }

      return JSON.parse(storedData);
    } catch (error) {
      console.error("[PerformanceMetrics] Error loading measurements:", error);
      return null;
    }
  }

  /**
   * Gibt eine Web Vitals-kompatible Messfunktion zurück
   * @param {string} metricName - Name der Metrik
   * @returns {Function} Eine Web Vitals-kompatible Messfunktion
   */
  function getWebVitalsReporter(metricName) {
    return (metric) => {
      const measureId = `webvitals_${metricName}_${Date.now()}`;
      startMeasure(`webvitals_${metricName}`, {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        navigationType: metric.navigationType,
      });

      endMeasure(`webvitals_${metricName}`, measureId, {
        delta: metric.delta,
        id: metric.id,
        entries: metric.entries ? Array.from(metric.entries) : [],
      });
    };
  }

  /**
   * Konfiguriert die PerformanceMetrics
   * @param {Object} newConfig - Neue Konfigurationsoptionen
   */
  function configure(newConfig) {
    Object.assign(config, newConfig);
  }

  // Rückgabe der öffentlichen API
  return {
    startMeasure,
    endMeasure,
    measure,
    getStats,
    observeMetric,
    measureDOMChanges,
    measureFetch,
    monitorRenderingPerformance,
    measureScrollPerformance,
    measureEventLoopBlocking,
    saveMeasurementsToStorage,
    loadMeasurementsFromStorage,
    getWebVitalsReporter,
    configure,
  };
})();

// Für ESM-Import
if (typeof exports !== "undefined") {
  exports.PerformanceMetrics = PerformanceMetrics;
}

// Für globalen Zugriff
window.PerformanceMetrics = PerformanceMetrics;
