/**
 * @deprecated Diese Legacy-Komponente ist veraltet und wird in Kürze entfernt.
 * Verwende stattdessen die Vue 3 SFC-Implementierung.
 * Geplantes Entfernungsdatum: 2025-06-10
 */

/**
 * error-handler.js - Zentrales Fehlerbehandlungsmodul für nScale DMS Assistent
 *
 * Dieses Modul bietet einen einheitlichen Mechanismus für die Behandlung von Fehlern
 * in der gesamten Anwendung. Es kategorisiert Fehler, protokolliert sie konsistent
 * und bietet benutzerfreundliche Fehlermeldungen und Wiederherstellungsoptionen.
 */

/**
 * Fehlerkategorien
 * @enum {string}
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
trackLegacyUsage('error-handler', 'initialize');


export const ErrorCategory = {
  // Netzwerkfehler: Verbindungsprobleme, Timeouts, etc.
  NETWORK: "network",

  // API-Fehler: Ungültige Anfragen, Serverprobleme, etc.
  API: "api",

  // Authentifizierungsfehler: Ungültiger Token, fehlende Berechtigungen, etc.
  AUTH: "auth",

  // Datenverarbeitungsfehler: Ungültiges JSON, fehlende Felder, etc.
  DATA: "data",

  // Anwendungsfehler: Logikfehler, unerwartete Zustände, etc.
  APP: "app",

  // Unbekannte Fehler, die in keine andere Kategorie passen
  UNKNOWN: "unknown",
};

/**
 * Schweregrade für Fehler
 * @enum {string}
 */
export const ErrorSeverity = {
  // Kritische Fehler, die die Anwendung blockieren
  CRITICAL: "critical",

  // Schwerwiegende Fehler, die die Hauptfunktionalität beeinträchtigen
  ERROR: "error",

  // Warnungen, die die Funktionalität nicht blockieren, aber problematisch sein könnten
  WARNING: "warning",

  // Informative Fehler, die keine unmittelbare Auswirkung haben
  INFO: "info",
};

/**
 * Optionen für die Fehlerbehandlung
 * @typedef {Object} ErrorHandlerOptions
 * @property {boolean} [showUser=true] - Ob der Fehler dem Benutzer angezeigt werden soll
 * @property {boolean} [retry=false] - Ob der Vorgang automatisch wiederholt werden soll
 * @property {number} [retryDelay=2000] - Verzögerung in ms vor einem Wiederholungsversuch
 * @property {number} [maxRetries=3] - Maximale Anzahl von Wiederholungsversuchen
 * @property {Function} [retryCallback] - Callback-Funktion für Wiederholungsversuche
 * @property {Function} [onError] - Callback-Funktion, die aufgerufen wird, wenn der Fehler auftritt
 * @property {boolean} [showNotification=true] - Ob eine Benachrichtigung angezeigt werden soll
 * @property {Object} [context] - Zusätzlicher Kontext für den Fehler
 */

/**
 * Standardoptionen für die Fehlerbehandlung
 * @type {ErrorHandlerOptions}
 */
const defaultOptions = {
  showUser: true,
  retry: false,
  retryDelay: 2000,
  maxRetries: 3,
  retryCallback: null,
  onError: null,
  showNotification: true,
  context: {},
};

/**
 * Hauptklasse für die Fehlerbehandlung
 */
class ErrorHandler {
  constructor() {
    // Aktive Wiederholungsversuche
    this.retryAttempts = new Map();

    // Fehlerhistorie (begrenzt auf die letzten 50 Fehler)
    this.errorHistory = [];
    this.MAX_ERROR_HISTORY = 50;

    // UI-Elemente
    this.errorContainer = null;
    this.notificationContainer = null;

    // Initialisieren, sobald das DOM geladen ist
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.initializeUI());
    } else {
      this.initializeUI();
    }

    // Globalen Error-Handler einrichten
    this.setupGlobalHandlers();
  }

  /**
   * Initialisiert die UI-Elemente für Fehlermeldungen
   * @private
   */
  initializeUI() {
    // Fehlercontainer erstellen, falls nicht vorhanden
    if (!this.errorContainer) {
      this.errorContainer = document.getElementById("error-container");
      if (!this.errorContainer) {
        this.errorContainer = document.createElement("div");
        this.errorContainer.id = "error-container";
        this.errorContainer.className = "error-container";
        this.errorContainer.style.display = "none";
        document.body.appendChild(this.errorContainer);
      }
    }

    // Benachrichtigungscontainer erstellen, falls nicht vorhanden
    if (!this.notificationContainer) {
      this.notificationContainer = document.getElementById(
        "notification-container",
      );
      if (!this.notificationContainer) {
        this.notificationContainer = document.createElement("div");
        this.notificationContainer.id = "notification-container";
        this.notificationContainer.className = "notification-container";
        document.body.appendChild(this.notificationContainer);
      }
    }

    // CSS für die Fehleranzeige einbinden
    this.injectErrorStyles();
  }

  /**
   * Injiziert CSS-Stile für Fehlermeldungen
   * @private
   */
  injectErrorStyles() {
    if (!document.getElementById("error-handler-styles")) {
      const styleElement = document.createElement("style");
      styleElement.id = "error-handler-styles";
      styleElement.textContent = `
                .error-container {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background-color: #f8d7da;
                    color: #721c24;
                    padding: 15px;
                    z-index: 1000;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
                    transition: transform 0.3s ease-in-out;
                    transform: translateY(100%);
                }
                .error-container.visible {
                    transform: translateY(0);
                }
                .error-message {
                    flex-grow: 1;
                }
                .error-actions {
                    display: flex;
                    gap: 10px;
                }
                .error-close, .error-retry {
                    border: none;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .error-close {
                    background-color: #f8d7da;
                    color: #721c24;
                    border: 1px solid #721c24;
                }
                .error-retry {
                    background-color: #721c24;
                    color: white;
                }
                
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 4px;
                    color: white;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    z-index: 1001;
                    animation: slideIn 0.3s forwards, fadeOut 0.5s 5s forwards;
                    max-width: 350px;
                }
                .notification.critical {
                    background-color: #dc3545;
                }
                .notification.error {
                    background-color: #f8d7da;
                    color: #721c24;
                }
                .notification.warning {
                    background-color: #fff3cd;
                    color: #856404;
                }
                .notification.info {
                    background-color: #d1ecf1;
                    color: #0c5460;
                }
                
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; visibility: hidden; }
                }
            `;
      document.head.appendChild(styleElement);
    }
  }

  /**
   * Richtet globale Error-Handler ein
   * @private
   */
  setupGlobalHandlers() {
    // Globalen unhandled error handler hinzufügen
    window.addEventListener("error", (event) => {
      this.handleError(event.error || new Error("Unbekannter Fehler"), {
        category: ErrorCategory.APP,
        severity: ErrorSeverity.ERROR,
        context: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });

      // Das Event nicht weiterpropagieren
      event.preventDefault();
    });

    // Unhandled Promise Rejection Handler
    window.addEventListener("unhandledrejection", (event) => {
      this.handleError(
        event.reason || new Error("Unbehandelte Promise-Ablehnung"),
        {
          category: ErrorCategory.APP,
          severity: ErrorSeverity.ERROR,
          context: {
            reason: event.reason,
          },
        },
      );

      // Das Event nicht weiterpropagieren
      event.preventDefault();
    });

    // Axios-Interceptor für Netzwerkanfragen, falls axios global verfügbar ist
    if (window.axios) {
      // Request Interceptor für Fehler vor dem Senden der Anfrage
      window.axios.interceptors.request.use(
        (config) => config,
        (error) => {
          this.handleError(error, {
            category: ErrorCategory.NETWORK,
            severity: ErrorSeverity.ERROR,
            context: {
              config: error.config,
            },
          });
          return Promise.reject(error);
        },
      );

      // Response Interceptor für Fehler nach dem Empfangen der Antwort
      window.axios.interceptors.response.use(
        (response) => response,
        (error) => {
          let category = ErrorCategory.API;
          let severity = ErrorSeverity.ERROR;

          // Bestimme Fehlerkategorie basierend auf Status-Code
          if (!error.response) {
            category = ErrorCategory.NETWORK;
          } else if (
            error.response.status === 401 ||
            error.response.status === 403
          ) {
            category = ErrorCategory.AUTH;
            severity = ErrorSeverity.CRITICAL;
          } else if (error.response.status >= 500) {
            severity = ErrorSeverity.CRITICAL;
          }

          this.handleError(error, {
            category,
            severity,
            context: {
              status: error.response?.status,
              data: error.response?.data,
              config: error.config,
            },
          });

          return Promise.reject(error);
        },
      );
    }
  }

  /**
   * Verarbeitet einen Fehler
   * @param {Error} error - Der aufgetretene Fehler
   * @param {Object} [options] - Optionen für die Fehlerbehandlung
   * @param {ErrorCategory} [options.category=UNKNOWN] - Fehlerkategorie
   * @param {ErrorSeverity} [options.severity=ERROR] - Fehlerschweregrad
   * @param {ErrorHandlerOptions} [options.handlerOptions] - Optionen für die Fehlerbehandlung
   * @returns {Error} - Der bearbeitete Fehler zur Weitergabe
   */
  handleError(error, options = {}) {
    const {
      category = ErrorCategory.UNKNOWN,
      severity = ErrorSeverity.ERROR,
      handlerOptions = {},
    } = options;

    // Optionen mit Standardwerten zusammenführen
    const mergedOptions = { ...defaultOptions, ...handlerOptions };

    // Fehler in Konsole protokollieren
    this.logError(error, category, severity, mergedOptions.context);

    // Fehler zur Historie hinzufügen
    this.addToErrorHistory(error, category, severity, mergedOptions.context);

    // Benutzerfreundliche Meldung anzeigen, wenn gewünscht
    if (mergedOptions.showUser) {
      this.showUserError(error, category, severity, mergedOptions);
    }

    // Benachrichtigung anzeigen, wenn gewünscht
    if (mergedOptions.showNotification) {
      this.showNotification(
        this.getUserFriendlyMessage(error, category),
        severity,
      );
    }

    // Callback ausführen, wenn vorhanden
    if (typeof mergedOptions.onError === "function") {
      try {
        mergedOptions.onError(error, category, severity, mergedOptions.context);
      } catch (callbackError) {
        console.error("Fehler im onError-Callback:", callbackError);
      }
    }

    // Wiederholungsversuch starten, wenn aktiviert
    if (
      mergedOptions.retry &&
      typeof mergedOptions.retryCallback === "function"
    ) {
      this.startRetry(error, mergedOptions);
    }

    // Fehler zur Weitergabe zurückgeben
    return error;
  }

  /**
   * Protokolliert einen Fehler in der Konsole
   * @param {Error} error - Der Fehler
   * @param {ErrorCategory} category - Fehlerkategorie
   * @param {ErrorSeverity} severity - Fehlerschweregrad
   * @param {Object} context - Zusätzlicher Kontext
   * @private
   */
  logError(error, category, severity, context) {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      message: error.message,
      category,
      severity,
      stack: error.stack,
      context,
    };

    // Je nach Schweregrad unterschiedlich protokollieren
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        console.error(
          `[KRITISCH][${category}][${timestamp}]`,
          error.message,
          errorInfo,
        );
        break;
      case ErrorSeverity.ERROR:
        console.error(
          `[FEHLER][${category}][${timestamp}]`,
          error.message,
          errorInfo,
        );
        break;
      case ErrorSeverity.WARNING:
        console.warn(
          `[WARNUNG][${category}][${timestamp}]`,
          error.message,
          errorInfo,
        );
        break;
      case ErrorSeverity.INFO:
        console.info(
          `[INFO][${category}][${timestamp}]`,
          error.message,
          errorInfo,
        );
        break;
      default:
        console.log(
          `[${severity}][${category}][${timestamp}]`,
          error.message,
          errorInfo,
        );
    }
  }

  /**
   * Fügt einen Fehler zur Fehlerhistorie hinzu
   * @param {Error} error - Der Fehler
   * @param {ErrorCategory} category - Fehlerkategorie
   * @param {ErrorSeverity} severity - Fehlerschweregrad
   * @param {Object} context - Zusätzlicher Kontext
   * @private
   */
  addToErrorHistory(error, category, severity, context) {
    // Füge Fehler zur Historie hinzu
    this.errorHistory.unshift({
      timestamp: new Date(),
      message: error.message,
      category,
      severity,
      stack: error.stack,
      context,
    });

    // Begrenze die Größe der Historie
    if (this.errorHistory.length > this.MAX_ERROR_HISTORY) {
      this.errorHistory = this.errorHistory.slice(0, this.MAX_ERROR_HISTORY);
    }
  }

  /**
   * Zeigt dem Benutzer eine Fehlermeldung an
   * @param {Error} error - Der Fehler
   * @param {ErrorCategory} category - Fehlerkategorie
   * @param {ErrorSeverity} severity - Fehlerschweregrad
   * @param {ErrorHandlerOptions} options - Fehlerbehandlungsoptionen
   * @private
   */
  showUserError(error, category, severity, options) {
    // Überprüfen, ob die UI initialisiert wurde
    if (!this.errorContainer) {
      this.initializeUI();
    }

    // Fehlermeldung für den Benutzer generieren
    const userMessage = this.getUserFriendlyMessage(error, category);

    // Fehlercontainer leeren
    this.errorContainer.innerHTML = "";

    // Fehlermeldung erstellen
    const messageElement = document.createElement("div");
    messageElement.className = "error-message";
    messageElement.textContent = userMessage;

    // Aktionsbereich erstellen
    const actionsElement = document.createElement("div");
    actionsElement.className = "error-actions";

    // Schließen-Button hinzufügen
    const closeButton = document.createElement("button");
    closeButton.className = "error-close";
    closeButton.textContent = "Schließen";
    closeButton.addEventListener("click", () => {
      this.errorContainer.classList.remove("visible");
      setTimeout(() => {
        this.errorContainer.style.display = "none";
      }, 300);
    });

    actionsElement.appendChild(closeButton);

    // Wenn Wiederholung möglich ist, Wiederholungs-Button hinzufügen
    if (options.retry && typeof options.retryCallback === "function") {
      const retryButton = document.createElement("button");
      retryButton.className = "error-retry";
      retryButton.textContent = "Wiederholen";
      retryButton.addEventListener("click", () => {
        // Fehler ausblenden
        this.errorContainer.classList.remove("visible");
        setTimeout(() => {
          this.errorContainer.style.display = "none";
        }, 300);

        // Wiederholungsversuch starten
        if (typeof options.retryCallback === "function") {
          options.retryCallback();
        }
      });

      actionsElement.appendChild(retryButton);
    }

    // Elemente zum Container hinzufügen
    this.errorContainer.appendChild(messageElement);
    this.errorContainer.appendChild(actionsElement);

    // Container anzeigen
    this.errorContainer.style.display = "flex";
    setTimeout(() => {
      this.errorContainer.classList.add("visible");
    }, 10);
  }

  /**
   * Zeigt eine Benachrichtigung an
   * @param {string} message - Die Nachricht
   * @param {ErrorSeverity} severity - Fehlerschweregrad
   * @private
   */
  showNotification(message, severity) {
    // Überprüfen, ob die UI initialisiert wurde
    if (!this.notificationContainer) {
      this.initializeUI();
    }

    // Benachrichtigung erstellen
    const notification = document.createElement("div");
    notification.className = `notification ${severity}`;
    notification.textContent = message;

    // Zum Container hinzufügen
    this.notificationContainer.appendChild(notification);

    // Nach 5 Sekunden entfernen
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5500);
  }

  /**
   * Generiert eine benutzerfreundliche Fehlermeldung
   * @param {Error} error - Der Fehler
   * @param {ErrorCategory} category - Fehlerkategorie
   * @returns {string} - Die benutzerfreundliche Fehlermeldung
   * @private
   */
  getUserFriendlyMessage(error, category) {
    // Fallback für den Fall, dass der Fehler eine leere Nachricht hat
    if (!error.message) {
      return "Ein unbekannter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.";
    }

    // Standard-Fehlermeldung
    let userMessage = error.message;

    // Anpassungen basierend auf Kategorie
    switch (category) {
      case ErrorCategory.NETWORK:
        // Netzwerkfehler
        if (
          error.message.includes("timeout") ||
          error.message.includes("Timeout")
        ) {
          userMessage =
            "Die Verbindung zum Server hat zu lange gedauert. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.";
        } else if (error.message.includes("Network Error")) {
          userMessage =
            "Es konnte keine Verbindung zum Server hergestellt werden. Bitte überprüfen Sie Ihre Internetverbindung.";
        } else {
          userMessage =
            "Ein Netzwerkfehler ist aufgetreten. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.";
        }
        break;

      case ErrorCategory.API:
        // API-Fehler
        if (error.response) {
          // Versuche, eine Fehlermeldung aus der API-Antwort zu extrahieren
          const data = error.response.data;
          if (data && typeof data === "object") {
            if (data.message) {
              userMessage = data.message;
            } else if (data.error) {
              userMessage = data.error;
            } else if (data.detail) {
              userMessage = data.detail;
            }
          }

          // Falls keine Nachricht gefunden wurde, verwende Standard-Nachrichten basierend auf Status-Code
          if (userMessage === error.message) {
            switch (error.response.status) {
              case 400:
                userMessage =
                  "Die Anfrage konnte nicht verarbeitet werden. Bitte überprüfen Sie Ihre Eingaben.";
                break;
              case 404:
                userMessage =
                  "Die angeforderte Ressource wurde nicht gefunden.";
                break;
              case 500:
                userMessage =
                  "Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.";
                break;
              case 503:
                userMessage =
                  "Der Service ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut.";
                break;
              default:
                userMessage = `Ein API-Fehler ist aufgetreten (${error.response.status}). Bitte versuchen Sie es später erneut.`;
            }
          }
        } else {
          userMessage =
            "Ein Fehler bei der Kommunikation mit dem Server ist aufgetreten. Bitte versuchen Sie es später erneut.";
        }
        break;

      case ErrorCategory.AUTH:
        // Authentifizierungsfehler
        if (error.response && error.response.status === 401) {
          userMessage =
            "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.";
        } else if (error.response && error.response.status === 403) {
          userMessage =
            "Sie haben keine Berechtigung, diese Aktion auszuführen.";
        } else {
          userMessage =
            "Ein Authentifizierungsfehler ist aufgetreten. Bitte melden Sie sich erneut an.";
        }
        break;

      case ErrorCategory.DATA:
        // Datenverarbeitungsfehler
        userMessage =
          "Es ist ein Fehler bei der Verarbeitung der Daten aufgetreten. Bitte versuchen Sie es erneut.";
        break;

      case ErrorCategory.APP:
        // Anwendungsfehler
        userMessage =
          "Es ist ein interner Anwendungsfehler aufgetreten. Bitte aktualisieren Sie die Seite und versuchen Sie es erneut.";
        break;

      case ErrorCategory.UNKNOWN:
      default:
        // Unbekannte Fehler
        userMessage =
          "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.";
    }

    return userMessage;
  }

  /**
   * Startet einen Wiederholungsversuch
   * @param {Error} error - Der Fehler
   * @param {ErrorHandlerOptions} options - Fehlerbehandlungsoptionen
   * @private
   */
  startRetry(error, options) {
    // Eindeutige ID für den Wiederholungsversuch generieren
    const retryId = Date.now().toString();

    // Aktuellen Versuch zählen
    const currentAttempt = this.retryAttempts.get(retryId) || 0;

    // Prüfen, ob maximale Anzahl an Versuchen erreicht ist
    if (currentAttempt >= options.maxRetries) {
      console.warn(
        `Maximale Anzahl an Wiederholungsversuchen (${options.maxRetries}) erreicht.`,
      );
      return;
    }

    // Neue Anzahl an Versuchen speichern
    this.retryAttempts.set(retryId, currentAttempt + 1);

    // Nach der angegebenen Verzögerung wiederholen
    setTimeout(
      () => {
        // Callback aufrufen
        if (typeof options.retryCallback === "function") {
          try {
            options.retryCallback();
          } catch (retryError) {
            console.error("Fehler beim Wiederholungsversuch:", retryError);

            // Rekursiven Aufruf für den nächsten Versuch
            this.startRetry(retryError, options);
          }
        }
      },
      options.retryDelay * (currentAttempt + 1),
    ); // Exponentielles Backoff
  }

  /**
   * Generiert einen formatieren Fehlerreport
   * @returns {string} - Fehlerreport
   */
  generateErrorReport() {
    if (this.errorHistory.length === 0) {
      return "Keine Fehler aufgetreten.";
    }

    let report = "=== FEHLERREPORT ===\n\n";
    report += `Zeitpunkt des Reports: ${new Date().toISOString()}\n`;
    report += `Anzahl der Fehler: ${this.errorHistory.length}\n\n`;

    // Fehler nach Kategorie gruppieren
    const categorizedErrors = {};

    this.errorHistory.forEach((error) => {
      if (!categorizedErrors[error.category]) {
        categorizedErrors[error.category] = [];
      }
      categorizedErrors[error.category].push(error);
    });

    // Für jede Kategorie Fehler auflisten
    for (const [category, errors] of Object.entries(categorizedErrors)) {
      report += `=== ${category.toUpperCase()} (${errors.length}) ===\n\n`;

      errors.forEach((error, index) => {
        report += `[${index + 1}] ${error.timestamp.toISOString()}\n`;
        report += `    Nachricht: ${error.message}\n`;
        report += `    Schweregrad: ${error.severity}\n`;

        if (error.stack) {
          report += `    Stack: ${error.stack.split("\n")[0]}\n`;
        }

        if (error.context && Object.keys(error.context).length > 0) {
          report += "    Kontext:\n";
          for (const [key, value] of Object.entries(error.context)) {
            const valueStr =
              typeof value === "object" ? JSON.stringify(value) : value;
            report += `      ${key}: ${valueStr}\n`;
          }
        }

        report += "\n";
      });
    }

    return report;
  }

  /**
   * Verarbeitet einen axios Fehler
   * @param {Error} error - Der axios Fehler
   * @param {ErrorHandlerOptions} [options] - Optionen für die Fehlerbehandlung
   * @returns {Error} - Der bearbeitete Fehler zur Weitergabe
   */
  handleAxiosError(error, options = {}) {
    // Bestimme Fehlerkategorie basierend auf Status-Code
    let category = ErrorCategory.API;
    let severity = ErrorSeverity.ERROR;

    if (!error.response) {
      category = ErrorCategory.NETWORK;
    } else if (error.response.status === 401 || error.response.status === 403) {
      category = ErrorCategory.AUTH;
      severity = ErrorSeverity.CRITICAL;
    } else if (error.response.status >= 500) {
      severity = ErrorSeverity.CRITICAL;
    }

    return this.handleError(error, {
      category,
      severity,
      handlerOptions: options,
      context: {
        status: error.response?.status,
        data: error.response?.data,
        config: error.config,
      },
    });
  }

  /**
   * Verarbeitet einen EventSource Fehler
   * @param {Event} event - Das Event
   * @param {ErrorHandlerOptions} [options] - Optionen für die Fehlerbehandlung
   * @returns {Error} - Der bearbeitete Fehler zur Weitergabe
   */
  handleEventSourceError(event, options = {}) {
    // EventSource-Fehler sind meistens Netzwerkprobleme
    const error = new Error("EventSource-Verbindungsfehler");

    return this.handleError(error, {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.ERROR,
      handlerOptions: options,
      context: {
        event,
        eventType: event.type,
        eventTarget: event.target,
      },
    });
  }
}

// Singleton-Instanz erstellen
const errorHandler = new ErrorHandler();

// Module exportieren
export default errorHandler;
