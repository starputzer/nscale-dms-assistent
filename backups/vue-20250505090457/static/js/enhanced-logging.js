/**
 * Erweitertes Logging-System für nscale Assist
 * Verbessert die Konsole-Ausgabe und bietet zentralisierte Fehlererfassung und -berichterstattung
 */

(function() {
    console.log('Initialisiere erweitertes Logging-System...');
    
    // Konfiguration
    const config = {
        enableEnhancedLogging: true,    // Aktiviert/deaktiviert verbessertes Logging
        logLevel: 'debug',              // Minimales Log-Level (debug, info, warn, error)
        colorizeOutput: true,           // Bunte Farben für verschiedene Log-Typen
        groupByModule: true,            // Gruppierung von Logs nach Modulen
        showTimestamps: true,           // Zeitstempel anzeigen
        maxLogItems: 1000,              // Maximale Anzahl der gespeicherten Logs im Memory
        saveErrorsToLocalStorage: true  // Fehler zusätzlich im localStorage speichern
    };
    
    // Log-Levels und ihre numerischen Werte
    const LOG_LEVELS = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
    };
    
    // Farben für verschiedene Log-Typen
    const LOG_COLORS = {
        debug: '#6b7280',   // Grau
        info: '#3b82f6',    // Blau
        warn: '#f59e0b',    // Orange
        error: '#ef4444',   // Rot
        success: '#10b981', // Grün
        module: '#8b5cf6'   // Violett (für Modultitel)
    };
    
    // Store für Logs im Memory
    const logStore = {
        logs: [],
        errors: [],
        
        // Fügt einen Log-Eintrag hinzu
        addLog(level, message, module, data) {
            const logEntry = {
                level,
                message,
                module: module || 'global',
                timestamp: new Date(),
                data
            };
            
            // Zur Logs-Liste hinzufügen
            this.logs.unshift(logEntry);
            
            // Fehler zusätzlich in Fehler-Liste speichern
            if (level === 'error') {
                this.errors.unshift(logEntry);
                
                // In localStorage speichern, wenn aktiviert
                if (config.saveErrorsToLocalStorage) {
                    try {
                        const storedErrors = JSON.parse(localStorage.getItem('nscale_errors') || '[]');
                        storedErrors.unshift(logEntry);
                        localStorage.setItem('nscale_errors', JSON.stringify(storedErrors.slice(0, 50)));
                    } catch (e) {
                        // Fehler beim Speichern ignorieren
                    }
                }
            }
            
            // Begrenzung der Log-Liste einhalten
            if (this.logs.length > config.maxLogItems) {
                this.logs = this.logs.slice(0, config.maxLogItems);
            }
            
            return logEntry;
        },
        
        // Löscht alle Logs
        clearLogs() {
            this.logs = [];
        },
        
        // Löscht alle Fehler
        clearErrors() {
            this.errors = [];
            if (config.saveErrorsToLocalStorage) {
                try {
                    localStorage.removeItem('nscale_errors');
                } catch (e) {
                    // Fehler beim Löschen ignorieren
                }
            }
        },
        
        // Gibt alle Logs zurück
        getLogs(filter = {}) {
            let filteredLogs = [...this.logs];
            
            // Nach Level filtern
            if (filter.level) {
                const minLevelValue = LOG_LEVELS[filter.level];
                filteredLogs = filteredLogs.filter(log => LOG_LEVELS[log.level] >= minLevelValue);
            }
            
            // Nach Modul filtern
            if (filter.module) {
                filteredLogs = filteredLogs.filter(log => log.module === filter.module);
            }
            
            // Nach Zeitraum filtern
            if (filter.since) {
                filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.since);
            }
            
            return filteredLogs;
        },
        
        // Gibt alle Fehler zurück
        getErrors() {
            return [...this.errors];
        }
    };
    
    // Erweitertes Logger-Objekt
    const enhancedLogger = {
        // Logging-Methoden
        debug(message, module, data) {
            this._log('debug', message, module, data);
        },
        
        info(message, module, data) {
            this._log('info', message, module, data);
        },
        
        warn(message, module, data) {
            this._log('warn', message, module, data);
        },
        
        error(message, module, data) {
            this._log('error', message, module, data);
        },
        
        success(message, module, data) {
            // success ist ein spezieller info-Log mit grüner Farbe
            this._log('info', message, module, data, 'success');
        },
        
        // Gruppierung von Logs
        groupStart(title, module) {
            if (!this._shouldLog('debug')) return;
            
            const formattedTitle = this._formatMessage(title, module, 'module');
            console.group(formattedTitle);
        },
        
        groupEnd() {
            if (!this._shouldLog('debug')) return;
            console.groupEnd();
        },
        
        // Interne Logging-Methode
        _log(level, message, module, data, specialColor) {
            // Prüfen, ob das Log-Level ausreichend ist
            if (!this._shouldLog(level)) return;
            
            // Log-Eintrag speichern
            logStore.addLog(level, message, module, data);
            
            // Log in Konsole ausgeben
            const formattedMessage = this._formatMessage(message, module, specialColor || level);
            
            switch (level) {
                case 'debug':
                    console.debug(formattedMessage, data || '');
                    break;
                case 'info':
                    console.info(formattedMessage, data || '');
                    break;
                case 'warn':
                    console.warn(formattedMessage, data || '');
                    break;
                case 'error':
                    console.error(formattedMessage, data || '');
                    break;
                default:
                    console.log(formattedMessage, data || '');
            }
        },
        
        // Prüft, ob ein Log mit dem gegebenen Level ausgegeben werden soll
        _shouldLog(level) {
            if (!config.enableEnhancedLogging) return false;
            
            const configLevelValue = LOG_LEVELS[config.logLevel];
            const currentLevelValue = LOG_LEVELS[level];
            
            return currentLevelValue >= configLevelValue;
        },
        
        // Formatiert eine Log-Nachricht
        _formatMessage(message, module, level) {
            const parts = [];
            
            // Zeitstempel hinzufügen
            if (config.showTimestamps) {
                const now = new Date();
                const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
                parts.push(`[${timeString}]`);
            }
            
            // Level hinzufügen
            const levelUpper = level.toUpperCase();
            if (config.colorizeOutput) {
                const color = LOG_COLORS[level] || '#000';
                parts.push(`%c[${levelUpper}]%c`);
            } else {
                parts.push(`[${levelUpper}]`);
            }
            
            // Modul hinzufügen, wenn vorhanden
            if (module) {
                if (config.colorizeOutput) {
                    parts.push(`%c[${module}]%c`);
                } else {
                    parts.push(`[${module}]`);
                }
            }
            
            // Nachricht hinzufügen
            parts.push(message);
            
            // Ergebnis zusammensetzen
            let result = parts.join(' ');
            
            // Styling-Parameter hinzufügen, wenn Farbausgabe aktiviert ist
            if (config.colorizeOutput) {
                const color = LOG_COLORS[level] || '#000';
                if (module) {
                    return [result, `color: ${color}; font-weight: bold;`, '', `color: ${LOG_COLORS.module}; font-weight: bold;`, ''];
                } else {
                    return [result, `color: ${color}; font-weight: bold;`, ''];
                }
            }
            
            return result;
        },
        
        // Nützliche Hilfsmethoden
        
        // Misst die Ausführungszeit einer Funktion
        time(label, func) {
            const start = performance.now();
            const result = func();
            const end = performance.now();
            const duration = end - start;
            
            this.info(`${label}: ${duration.toFixed(2)}ms`, 'performance');
            
            return result;
        },
        
        // Asynchrone Version von time()
        async timeAsync(label, asyncFunc) {
            const start = performance.now();
            const result = await asyncFunc();
            const end = performance.now();
            const duration = end - start;
            
            this.info(`${label}: ${duration.toFixed(2)}ms`, 'performance');
            
            return result;
        },
        
        // Gibt alle Logs in der Konsole aus
        showLogs(filter = {}) {
            const logs = logStore.getLogs(filter);
            
            if (logs.length === 0) {
                console.log('Keine Logs gefunden');
                return;
            }
            
            console.group(`Logs (${logs.length})`);
            logs.forEach(log => {
                const { level, message, module, timestamp, data } = log;
                const formattedMessage = this._formatMessage(message, module, level);
                
                switch (level) {
                    case 'debug':
                        console.debug(formattedMessage, data || '');
                        break;
                    case 'info':
                        console.info(formattedMessage, data || '');
                        break;
                    case 'warn':
                        console.warn(formattedMessage, data || '');
                        break;
                    case 'error':
                        console.error(formattedMessage, data || '');
                        break;
                    default:
                        console.log(formattedMessage, data || '');
                }
            });
            console.groupEnd();
        },
        
        // Gibt alle Fehler in der Konsole aus
        showErrors() {
            const errors = logStore.getErrors();
            
            if (errors.length === 0) {
                console.log('Keine Fehler gefunden');
                return;
            }
            
            console.group(`Fehler (${errors.length})`);
            errors.forEach(error => {
                const { message, module, timestamp, data } = error;
                const formattedMessage = this._formatMessage(message, module, 'error');
                
                console.error(formattedMessage, data || '');
            });
            console.groupEnd();
        },
        
        // Löscht alle Logs
        clearLogs() {
            logStore.clearLogs();
            this.info('Logs gelöscht', 'logger');
        },
        
        // Löscht alle Fehler
        clearErrors() {
            logStore.clearErrors();
            this.info('Fehler gelöscht', 'logger');
        }
    };
    
    // Original-Console-Methoden sichern
    const originalConsole = {
        log: console.log,
        debug: console.debug,
        info: console.info,
        warn: console.warn,
        error: console.error
    };
    
    // Globalen Error-Handler hinzufügen, um unbehandelte Fehler zu erfassen
    window.addEventListener('error', function(event) {
        enhancedLogger.error(`Unbehandelte Exception: ${event.message}`, 'window', {
            error: event.error,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    });
    
    // Unbehandelte Promise-Rejections erfassen
    window.addEventListener('unhandledrejection', function(event) {
        enhancedLogger.error(`Unbehandelte Promise-Rejection: ${event.reason}`, 'promise', {
            reason: event.reason
        });
    });
    
    // Debug-Info ausgeben
    enhancedLogger.debug('Erweitertes Logging-System initialisiert', 'logger', {
        config,
        browser: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`
    });
    
    // Logger global verfügbar machen
    window.logger = enhancedLogger;
    
    // Schnellzugriff auf Logger-Methoden im globalen Namespace
    window.log = enhancedLogger.info.bind(enhancedLogger);
    window.logDebug = enhancedLogger.debug.bind(enhancedLogger);
    window.logWarn = enhancedLogger.warn.bind(enhancedLogger);
    window.logError = enhancedLogger.error.bind(enhancedLogger);
    window.logSuccess = enhancedLogger.success.bind(enhancedLogger);
    
    // Konsolenausgabe für alle Fehler verbessern
    if (config.enableEnhancedLogging) {
        // Console-Methoden überschreiben (nur für Fehler, um andere Bibliotheken nicht zu stören)
        console.error = function() {
            // Original-Funktion aufrufen
            originalConsole.error.apply(console, arguments);
            
            // Zusätzlich im Logger speichern
            try {
                const message = Array.from(arguments).map(arg => {
                    if (typeof arg === 'object') {
                        try {
                            return JSON.stringify(arg);
                        } catch (e) {
                            return String(arg);
                        }
                    }
                    return String(arg);
                }).join(' ');
                
                logStore.addLog('error', message, 'console');
            } catch (e) {
                // Ignorieren, um Endlosschleife zu vermeiden
            }
        };
    }
    
    enhancedLogger.info('Logging-System bereit', 'logger');
})();