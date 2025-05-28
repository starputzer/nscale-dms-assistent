/**
 * @deprecated Diese Legacy-Komponente ist veraltet und wird in Kürze entfernt.
 * Verwende stattdessen die Vue 3 SFC-Implementierung.
 * Geplantes Entfernungsdatum: 2025-06-10
 */

/**
 * performance-monitor.js
 *
 * Stellt eine visuelle Echtzeitüberwachung der Anwendungsleistung bereit und
 * sammelt Metriken für DOM-Operationen, Netzwerkanfragen und Rendering.
 */

// Monitoring für Legacy-Code-Nutzung
function trackLegacyUsage(componentName, action) {
  if (typeof window.telemetry !== "undefined") {
    window.telemetry.trackEvent("legacy_code_usage", {
      component: componentName,
      action: action,
      timestamp: new Date().toISOString(),
    });
  }
}

// Tracking bei Modulinitialisierung
trackLegacyUsage("performance-monitor", "initialize");

(function () {
  // Konfiguration
  const config = {
    updateInterval: 1000, // Aktualisierungsintervall in ms
    maxDataPoints: 60, // Maximale Anzahl von Datenpunkten
    displayTime: 60, // Anzeigezeit in Sekunden
    autoCollapse: true, // Automatisch einklappen bei Inaktivität
    inactivityTimeout: 10000, // Inaktivitäts-Timeout in ms
    chartHeight: 100, // Höhe der Diagramme in Pixeln
    showNotifications: true, // Leistungsbenachrichtigungen anzeigen
  };

  // Messdaten
  const metrics = {
    domOperations: [],
    networkRequests: [],
    renderTime: [],
    memoryUsage: [],
    fps: [],
  };

  // Referenzen auf UI-Elemente
  let container, domChart, networkChart, fpsChart, memoryChart;
  let lastInteractionTime = Date.now();
  let isCollapsed = false;
  let updateTimer;

  /**
   * Erstellt das Monitor-UI
   */
  function createUI() {
    // Container erstellen
    container = document.createElement("div");
    container.className = "performance-monitor";
    container.innerHTML = `
            <div class="performance-monitor-header">
                <h3>Performance Monitor</h3>
                <div class="performance-monitor-controls">
                    <button class="collapse-btn">Einklappen</button>
                    <button class="clear-btn">Zurücksetzen</button>
                    <button class="close-btn">×</button>
                </div>
            </div>
            <div class="performance-monitor-body">
                <div class="metric-container">
                    <h4>DOM Operationen <span class="metric-value" id="dom-value">0/s</span></h4>
                    <canvas id="dom-chart" height="${config.chartHeight}"></canvas>
                </div>
                <div class="metric-container">
                    <h4>Netzwerkanfragen <span class="metric-value" id="network-value">0/s</span></h4>
                    <canvas id="network-chart" height="${config.chartHeight}"></canvas>
                </div>
                <div class="metric-container">
                    <h4>FPS <span class="metric-value" id="fps-value">0</span></h4>
                    <canvas id="fps-chart" height="${config.chartHeight}"></canvas>
                </div>
                <div class="metric-container">
                    <h4>Speichernutzung <span class="metric-value" id="memory-value">0 MB</span></h4>
                    <canvas id="memory-chart" height="${config.chartHeight}"></canvas>
                </div>
            </div>
        `;

    // Styling hinzufügen
    const style = document.createElement("style");
    style.textContent = `
            .performance-monitor {
                position: fixed;
                bottom: 10px;
                right: 10px;
                width: 350px;
                background-color: rgba(33, 33, 33, 0.9);
                color: #f0f0f0;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                font-family: monospace;
                z-index: 9999;
                transition: transform 0.3s ease, height 0.3s ease;
                overflow: hidden;
            }
            
            .performance-monitor.collapsed {
                height: 30px;
                overflow: hidden;
            }
            
            .performance-monitor-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 5px 10px;
                background-color: rgba(66, 66, 66, 0.8);
                cursor: pointer;
            }
            
            .performance-monitor-header h3 {
                margin: 0;
                font-size: 14px;
                font-weight: normal;
            }
            
            .performance-monitor-controls {
                display: flex;
                gap: 5px;
            }
            
            .performance-monitor-controls button {
                background: none;
                border: none;
                color: #ddd;
                cursor: pointer;
                font-size: 12px;
                padding: 2px 5px;
            }
            
            .performance-monitor-controls button:hover {
                color: white;
                background-color: rgba(255, 255, 255, 0.1);
            }
            
            .performance-monitor-body {
                padding: 10px;
                overflow-y: auto;
                max-height: 400px;
            }
            
            .metric-container {
                margin-bottom: 15px;
            }
            
            .metric-container h4 {
                margin: 0 0 5px 0;
                font-size: 12px;
                font-weight: normal;
                display: flex;
                justify-content: space-between;
            }
            
            .metric-value {
                font-weight: bold;
            }
            
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 15px;
                background-color: rgba(33, 33, 33, 0.9);
                color: white;
                border-radius: 4px;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                animation: fadeInOut 3s forwards;
                font-family: monospace;
            }
            
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateY(-20px); }
                15% { opacity: 1; transform: translateY(0); }
                85% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-20px); }
            }
        `;

    // UI zum DOM hinzufügen
    document.head.appendChild(style);
    document.body.appendChild(container);

    // Event-Listener hinzufügen
    const header = container.querySelector(".performance-monitor-header");
    const collapseBtn = container.querySelector(".collapse-btn");
    const clearBtn = container.querySelector(".clear-btn");
    const closeBtn = container.querySelector(".close-btn");

    header.addEventListener("click", (e) => {
      if (e.target === header) {
        toggleCollapse();
      }
      updateLastInteraction();
    });

    collapseBtn.addEventListener("click", () => {
      toggleCollapse();
      updateLastInteraction();
    });

    clearBtn.addEventListener("click", () => {
      clearMetrics();
      updateLastInteraction();
    });

    closeBtn.addEventListener("click", () => {
      destroyMonitor();
    });

    // Charts initialisieren
    initCharts();
  }

  /**
   * Initialisiert die Diagramme
   */
  function initCharts() {
    // Grundlegende Konfiguration für alle Charts
    const commonConfig = {
      type: "line",
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        elements: {
          point: {
            radius: 0,
          },
          line: {
            tension: 0.2,
          },
        },
        scales: {
          x: {
            display: false,
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
            ticks: {
              color: "#ddd",
              font: {
                size: 10,
              },
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: false,
          },
        },
      },
    };

    // Labels für die x-Achse (werden bei allen Charts wiederverwendet)
    const labels = Array.from({ length: config.maxDataPoints }, (_, i) => i);

    // DOM-Operationen Chart
    domChart = new Chart(document.getElementById("dom-chart"), {
      ...commonConfig,
      data: {
        labels,
        datasets: [
          {
            label: "DOM Operationen/s",
            data: metrics.domOperations,
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
            fill: true,
          },
        ],
      },
    });

    // Netzwerkanfragen Chart
    networkChart = new Chart(document.getElementById("network-chart"), {
      ...commonConfig,
      data: {
        labels,
        datasets: [
          {
            label: "Netzwerkanfragen/s",
            data: metrics.networkRequests,
            backgroundColor: "rgba(153, 102, 255, 0.2)",
            borderColor: "rgba(153, 102, 255, 1)",
            borderWidth: 1,
            fill: true,
          },
        ],
      },
    });

    // FPS Chart
    fpsChart = new Chart(document.getElementById("fps-chart"), {
      ...commonConfig,
      data: {
        labels,
        datasets: [
          {
            label: "FPS",
            data: metrics.fps,
            backgroundColor: "rgba(255, 206, 86, 0.2)",
            borderColor: "rgba(255, 206, 86, 1)",
            borderWidth: 1,
            fill: true,
          },
        ],
      },
      options: {
        ...commonConfig.options,
        scales: {
          ...commonConfig.options.scales,
          y: {
            ...commonConfig.options.scales.y,
            min: 0,
            max: 60,
            ticks: {
              ...commonConfig.options.scales.y.ticks,
              stepSize: 10,
            },
          },
        },
      },
    });

    // Speichernutzung Chart
    memoryChart = new Chart(document.getElementById("memory-chart"), {
      ...commonConfig,
      data: {
        labels,
        datasets: [
          {
            label: "Speichernutzung (MB)",
            data: metrics.memoryUsage,
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
            fill: true,
          },
        ],
      },
    });
  }

  /**
   * Aktualisiert die angezeigten Metrikwerte
   */
  function updateMetricValues() {
    document.getElementById("dom-value").textContent =
      `${metrics.domOperations.length > 0 ? metrics.domOperations[metrics.domOperations.length - 1].toFixed(1) : "0"}/s`;

    document.getElementById("network-value").textContent =
      `${metrics.networkRequests.length > 0 ? metrics.networkRequests[metrics.networkRequests.length - 1].toFixed(1) : "0"}/s`;

    document.getElementById("fps-value").textContent =
      `${metrics.fps.length > 0 ? Math.round(metrics.fps[metrics.fps.length - 1]) : "0"}`;

    document.getElementById("memory-value").textContent =
      `${metrics.memoryUsage.length > 0 ? metrics.memoryUsage[metrics.memoryUsage.length - 1].toFixed(1) : "0"} MB`;
  }

  /**
   * Aktualisiert die Diagramme mit den neuesten Daten
   */
  function updateCharts() {
    domChart.update();
    networkChart.update();
    fpsChart.update();
    memoryChart.update();
  }

  /**
   * Sammelt die aktuellen Leistungsmetriken
   */
  function collectMetrics() {
    // DOM-Operationen und andere Metriken aus dem Performance-Modul abrufen
    const domStats = PerformanceMetrics.getStats("app_dom_changes", 1000);
    const domOpsPerSecond = domStats.count || 0;

    // Netzwerkanfragen aus den PerformanceObserver-Einträgen
    const networkStats = getNetworkStats();

    // FPS aus dem requestAnimationFrame-Delta
    const fps = getFPS();

    // Speichernutzung
    const memory = performance.memory
      ? performance.memory.usedJSHeapSize / (1024 * 1024)
      : 0;

    // Metriken zu den Arrays hinzufügen
    addMetric(metrics.domOperations, domOpsPerSecond);
    addMetric(metrics.networkRequests, networkStats);
    addMetric(metrics.fps, fps);
    addMetric(metrics.memoryUsage, memory);

    // UI aktualisieren
    updateMetricValues();
    updateCharts();

    // Benachrichtigungen für Leistungsprobleme
    checkPerformanceIssues({
      domOps: domOpsPerSecond,
      networkReqs: networkStats,
      fps,
      memory,
    });

    // Automatisches Einklappen bei Inaktivität
    checkInactivity();
  }

  /**
   * Fügt einen Metrik-Wert zum angegebenen Array hinzu und begrenzt die Größe
   * @param {Array} array - Das Array für die Metrik
   * @param {number} value - Der neue Wert
   */
  function addMetric(array, value) {
    array.push(value);
    if (array.length > config.maxDataPoints) {
      array.shift();
    }
  }

  /**
   * Gibt die aktuelle FPS-Rate zurück
   * @returns {number} Die FPS-Rate
   */
  function getFPS() {
    const perfNow = performance.now();
    const fps = window._fpsWindow || [];

    // Alte Einträge entfernen
    const expireTime = perfNow - 1000; // 1 Sekunde
    while (fps.length > 0 && fps[0] < expireTime) {
      fps.shift();
    }

    window._fpsWindow = fps;
    return fps.length;
  }

  /**
   * Gibt Netzwerkstatistiken zurück
   * @returns {number} Die Anzahl der Netzwerkanfragen pro Sekunde
   */
  function getNetworkStats() {
    const now = performance.now();
    const requests = window._networkRequests || [];

    // Alte Einträge entfernen
    const expireTime = now - 1000; // 1 Sekunde
    let count = 0;

    for (let i = requests.length - 1; i >= 0; i--) {
      if (requests[i] < expireTime) {
        break;
      }
      count++;
    }

    return count;
  }

  /**
   * Prüft auf Leistungsprobleme und zeigt ggf. Benachrichtigungen an
   * @param {Object} metrics - Die aktuellen Metrikwerte
   */
  function checkPerformanceIssues(metrics) {
    if (!config.showNotifications) return;

    // Prüfen auf niedrige FPS
    if (metrics.fps < 30 && metrics.fps > 0) {
      showNotification(`Niedrige Bildrate: ${Math.round(metrics.fps)} FPS`);
    }

    // Prüfen auf viele DOM-Operationen
    if (metrics.domOps > 100) {
      showNotification(
        `Hohe DOM-Aktivität: ${Math.round(metrics.domOps)} Ops/s`,
      );
    }

    // Prüfen auf viele Netzwerkanfragen
    if (metrics.networkReqs > 10) {
      showNotification(`Viele Netzwerkanfragen: ${metrics.networkReqs} Req/s`);
    }

    // Prüfen auf hohe Speichernutzung
    if (metrics.memory > 100) {
      showNotification(
        `Hohe Speichernutzung: ${Math.round(metrics.memory)} MB`,
      );
    }
  }

  /**
   * Zeigt eine Benachrichtigung an
   * @param {string} message - Die Nachricht
   */
  function showNotification(message) {
    // Nicht zu viele Benachrichtigungen anzeigen
    const existingNotifications = document.querySelectorAll(".notification");
    if (existingNotifications.length >= 3) return;

    const notification = document.createElement("div");
    notification.className = "notification";
    notification.textContent = message;

    document.body.appendChild(notification);

    // Automatisch entfernen nach 3 Sekunden
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  /**
   * Aktualisiert den Zeitpunkt der letzten Interaktion
   */
  function updateLastInteraction() {
    lastInteractionTime = Date.now();

    // Wenn eingeklappt, wieder ausklappen
    if (isCollapsed) {
      toggleCollapse();
    }
  }

  /**
   * Prüft auf Inaktivität und klappt den Monitor ggf. ein
   */
  function checkInactivity() {
    if (!config.autoCollapse) return;

    const now = Date.now();
    if (!isCollapsed && now - lastInteractionTime > config.inactivityTimeout) {
      toggleCollapse();
    }
  }

  /**
   * Klappt den Monitor ein oder aus
   */
  function toggleCollapse() {
    isCollapsed = !isCollapsed;
    container.classList.toggle("collapsed", isCollapsed);

    const collapseBtn = container.querySelector(".collapse-btn");
    collapseBtn.textContent = isCollapsed ? "Ausklappen" : "Einklappen";
  }

  /**
   * Setzt alle Metriken zurück
   */
  function clearMetrics() {
    metrics.domOperations = [];
    metrics.networkRequests = [];
    metrics.fps = [];
    metrics.memoryUsage = [];

    domChart.data.datasets[0].data = metrics.domOperations;
    networkChart.data.datasets[0].data = metrics.networkRequests;
    fpsChart.data.datasets[0].data = metrics.fps;
    memoryChart.data.datasets[0].data = metrics.memoryUsage;

    updateCharts();
    updateMetricValues();
  }

  /**
   * Entfernt den Monitor aus dem DOM
   */
  function destroyMonitor() {
    if (updateTimer) {
      clearInterval(updateTimer);
    }

    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }

  /**
   * Initialisiert den FPS-Zähler
   */
  function initFPSCounter() {
    if (!window._fpsWindow) {
      window._fpsWindow = [];
    }

    function updateFPS() {
      window._fpsWindow.push(performance.now());
      requestAnimationFrame(updateFPS);
    }

    requestAnimationFrame(updateFPS);
  }

  /**
   * Initialisiert den Netzwerkrequest-Zähler
   */
  function initNetworkCounter() {
    if (!window._networkRequests) {
      window._networkRequests = [];
    }

    // Performance Observer für Netzwerkanfragen
    if (window.PerformanceObserver) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.entryType === "resource") {
              window._networkRequests.push(performance.now());
            }
          }

          // Alte Einträge bereinigen
          const now = performance.now();
          const expireTime = now - 5000; // 5 Sekunden
          while (
            window._networkRequests.length > 0 &&
            window._networkRequests[0] < expireTime
          ) {
            window._networkRequests.shift();
          }
        });

        observer.observe({ entryTypes: ["resource"] });
      } catch (e) {
        console.error(
          "PerformanceObserver für Netzwerkanfragen konnte nicht initialisiert werden:",
          e,
        );
      }
    }

    // Überschreiben der fetch-Funktion
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      window._networkRequests.push(performance.now());
      return originalFetch.apply(this, args);
    };

    // Überschreiben der XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (...args) {
      this.addEventListener("load", () => {
        window._networkRequests.push(performance.now());
      });
      return originalOpen.apply(this, args);
    };
  }

  /**
   * Initialisiert den Performance-Monitor
   */
  function init() {
    // Prüfen, ob Chart.js verfügbar ist
    if (typeof Chart === "undefined") {
      loadChartJS(() => {
        initMonitor();
      });
    } else {
      initMonitor();
    }
  }

  /**
   * Lädt Chart.js dynamisch
   * @param {Function} callback - Callback-Funktion nach dem Laden
   */
  function loadChartJS(callback) {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/chart.js";
    script.onload = callback;
    document.head.appendChild(script);
  }

  /**
   * Initialisiert den Monitor
   */
  function initMonitor() {
    initFPSCounter();
    initNetworkCounter();
    createUI();

    // Regelmäßige Aktualisierung
    updateTimer = setInterval(collectMetrics, config.updateInterval);

    // Erste Metriksammlung
    collectMetrics();
  }

  // Öffentliche API
  window.PerformanceMonitor = {
    init,
    clearMetrics,
    toggleCollapse,
    destroy: destroyMonitor,
    configure: function (newConfig) {
      Object.assign(config, newConfig);
    },
  };
})();

// Den Monitor automatisch initialisieren, wenn das DOM geladen ist
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(() => {
    // Warten auf PerformanceMetrics und Chart.js
    if (window.PerformanceMetrics) {
      window.PerformanceMonitor.init();
    }
  }, 1000);
});
