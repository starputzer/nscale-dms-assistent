/**
 * Entwicklungs-Logs für nscale-assist
 * Bietet ein an- und abschaltbares Logging-System mit Export-Funktionen
 */
(function() {
    // Konfiguration
    const defaultConfig = {
        enabled: false,
        logErrors: true,
        logWarnings: true,
        logInfo: false,
        maxLogEntries: 200,
        showTimestamps: true,
        floatingConsole: false,
        consolePosition: 'bottom-right', // bottom-right, bottom-left, top-right, top-left
        demoMode: false // Falls Demo-Modus, werden sensible Daten maskiert
    };
    
    // Initialer State
    let logs = {
        errors: [],
        warnings: [],
        info: []
    };
    
    let config = loadConfig();
    let floatingConsole = null;
    let consoleVisible = false;
    let devMode = localStorage.getItem('devMode') === 'true';
    
    // Config aus localStorage laden
    function loadConfig() {
        try {
            const savedConfig = localStorage.getItem('dev-logs-config');
            if (savedConfig) {
                return { ...defaultConfig, ...JSON.parse(savedConfig) };
            }
        } catch (e) {
            console.error('Fehler beim Laden der Log-Konfiguration:', e);
        }
        return { ...defaultConfig };
    }
    
    // Config speichern
    function saveConfig() {
        try {
            localStorage.setItem('dev-logs-config', JSON.stringify(config));
        } catch (e) {
            console.error('Fehler beim Speichern der Log-Konfiguration:', e);
        }
    }
    
    // Logging-Funktionen überschreiben
    function interceptConsole() {
        // Originale Funktionen sichern
        const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };
        
        // Error überschreiben
        console.error = function() {
            // Original-Funktion aufrufen
            originalConsole.error.apply(console, arguments);
            
            // Logging, wenn aktiviert
            if (config.enabled && config.logErrors) {
                const timestamp = new Date().toISOString();
                const args = Array.from(arguments).map(arg => {
                    if (typeof arg === 'object') {
                        try {
                            return JSON.stringify(arg);
                        } catch (e) {
                            return String(arg);
                        }
                    }
                    return String(arg);
                }).join(' ');
                
                logs.errors.push({ timestamp, message: args });
                
                // Begrenze die Anzahl der Log-Einträge
                if (logs.errors.length > config.maxLogEntries) {
                    logs.errors.shift();
                }
                
                // UI aktualisieren, wenn sichtbar
                if (consoleVisible) {
                    updateConsoleUI();
                }
            }
        };
        
        // Warning überschreiben
        console.warn = function() {
            // Original-Funktion aufrufen
            originalConsole.warn.apply(console, arguments);
            
            // Logging, wenn aktiviert
            if (config.enabled && config.logWarnings) {
                const timestamp = new Date().toISOString();
                const args = Array.from(arguments).map(arg => {
                    if (typeof arg === 'object') {
                        try {
                            return JSON.stringify(arg);
                        } catch (e) {
                            return String(arg);
                        }
                    }
                    return String(arg);
                }).join(' ');
                
                logs.warnings.push({ timestamp, message: args });
                
                // Begrenze die Anzahl der Log-Einträge
                if (logs.warnings.length > config.maxLogEntries) {
                    logs.warnings.shift();
                }
                
                // UI aktualisieren, wenn sichtbar
                if (consoleVisible) {
                    updateConsoleUI();
                }
            }
        };
        
        // Info überschreiben
        console.info = function() {
            // Original-Funktion aufrufen
            originalConsole.info.apply(console, arguments);
            
            // Logging, wenn aktiviert
            if (config.enabled && config.logInfo) {
                const timestamp = new Date().toISOString();
                const args = Array.from(arguments).map(arg => {
                    if (typeof arg === 'object') {
                        try {
                            return JSON.stringify(arg);
                        } catch (e) {
                            return String(arg);
                        }
                    }
                    return String(arg);
                }).join(' ');
                
                logs.info.push({ timestamp, message: args });
                
                // Begrenze die Anzahl der Log-Einträge
                if (logs.info.length > config.maxLogEntries) {
                    logs.info.shift();
                }
                
                // UI aktualisieren, wenn sichtbar
                if (consoleVisible) {
                    updateConsoleUI();
                }
            }
        };
        
        // Log überschreiben
        console.log = function() {
            // Original-Funktion aufrufen
            originalConsole.log.apply(console, arguments);
            
            // Logging für Info-Meldungen, wenn aktiviert
            if (config.enabled && config.logInfo) {
                const timestamp = new Date().toISOString();
                const args = Array.from(arguments).map(arg => {
                    if (typeof arg === 'object') {
                        try {
                            return JSON.stringify(arg);
                        } catch (e) {
                            return String(arg);
                        }
                    }
                    return String(arg);
                }).join(' ');
                
                logs.info.push({ timestamp, message: args });
                
                // Begrenze die Anzahl der Log-Einträge
                if (logs.info.length > config.maxLogEntries) {
                    logs.info.shift();
                }
                
                // UI aktualisieren, wenn sichtbar
                if (consoleVisible) {
                    updateConsoleUI();
                }
            }
        };
    }
    
    // UI für Konfiguration und Anzeige erstellen
    function createDevConsoleUI() {
        // Wenn bereits eine Konsole existiert, entfernen
        if (floatingConsole) {
            document.body.removeChild(floatingConsole);
            floatingConsole = null;
        }
        
        // Konsole erstellen
        floatingConsole = document.createElement('div');
        floatingConsole.id = 'dev-console';
        floatingConsole.style.cssText = `
            position: fixed;
            ${config.consolePosition.includes('bottom') ? 'bottom: 10px;' : 'top: 10px;'}
            ${config.consolePosition.includes('right') ? 'right: 10px;' : 'left: 10px;'}
            width: 400px;
            max-height: 500px;
            background-color: rgba(0, 0, 0, 0.85);
            color: white;
            border-radius: 5px;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            overflow: hidden;
            transition: height 0.3s ease;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
            display: ${config.floatingConsole ? 'block' : 'none'};
        `;
        
        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
            padding-bottom: 5px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        `;
        
        const title = document.createElement('div');
        title.textContent = 'Dev Console';
        title.style.fontWeight = 'bold';
        
        const controls = document.createElement('div');
        
        // Toggle-Button für Floating-Konsole
        const toggleFloating = document.createElement('button');
        toggleFloating.textContent = config.floatingConsole ? 'Dock' : 'Float';
        toggleFloating.style.cssText = `
            background: none;
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 2px 5px;
            border-radius: 3px;
            cursor: pointer;
            margin-right: 5px;
            font-size: 10px;
        `;
        toggleFloating.onclick = function() {
            config.floatingConsole = !config.floatingConsole;
            toggleFloating.textContent = config.floatingConsole ? 'Dock' : 'Float';
            saveConfig();
        };
        
        // Schließen-Button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'X';
        closeButton.style.cssText = `
            background: none;
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 2px 5px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
        `;
        closeButton.onclick = function() {
            hideConsole();
        };
        
        controls.appendChild(toggleFloating);
        controls.appendChild(closeButton);
        header.appendChild(title);
        header.appendChild(controls);
        floatingConsole.appendChild(header);
        
        // Tab-Leiste
        const tabBar = document.createElement('div');
        tabBar.style.cssText = `
            display: flex;
            margin-bottom: 10px;
        `;
        
        // Tabs erstellen
        const tabs = [
            { id: 'errors', label: 'Errors', color: '#ff5252' },
            { id: 'warnings', label: 'Warnings', color: '#ffab40' },
            { id: 'info', label: 'Info', color: '#4fc3f7' },
            { id: 'settings', label: 'Settings', color: '#b0bec5' }
        ];
        
        let activeTab = 'errors';
        
        tabs.forEach(tab => {
            const tabButton = document.createElement('button');
            tabButton.textContent = tab.label;
            tabButton.dataset.tab = tab.id;
            tabButton.style.cssText = `
                flex: 1;
                background: none;
                border: none;
                color: ${tab.color};
                padding: 5px;
                cursor: pointer;
                border-bottom: 2px solid ${tab.id === activeTab ? tab.color : 'transparent'};
                transition: background-color 0.2s;
            `;
            
            tabButton.onmouseover = function() {
                this.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            };
            
            tabButton.onmouseout = function() {
                this.style.backgroundColor = 'transparent';
            };
            
            tabButton.onclick = function() {
                // Vorherigen aktiven Tab deaktivieren
                document.querySelectorAll('#dev-console [data-tab]').forEach(el => {
                    if (el.tagName === 'BUTTON') {
                        el.style.borderBottom = '2px solid transparent';
                    } else {
                        el.style.display = 'none';
                    }
                });
                
                // Neuen Tab aktivieren
                this.style.borderBottom = `2px solid ${tab.color}`;
                activeTab = tab.id;
                
                // Tab-Inhalt anzeigen
                const tabContent = document.querySelector(`#dev-console .tab-content[data-tab="${tab.id}"]`);
                if (tabContent) {
                    tabContent.style.display = 'block';
                }
                
                // UI aktualisieren
                updateConsoleUI();
            };
            
            tabBar.appendChild(tabButton);
        });
        
        floatingConsole.appendChild(tabBar);
        
        // Tab-Inhalte
        tabs.forEach(tab => {
            const tabContent = document.createElement('div');
            tabContent.className = 'tab-content';
            tabContent.dataset.tab = tab.id;
            tabContent.style.cssText = `
                max-height: 400px;
                overflow-y: auto;
                display: ${tab.id === activeTab ? 'block' : 'none'};
                margin-bottom: 10px;
            `;
            
            if (tab.id === 'settings') {
                // Settings-Tab
                tabContent.innerHTML = `
                    <div style="padding: 10px;">
                        <label style="display: flex; align-items: center; margin-bottom: 10px;">
                            <input type="checkbox" id="setting-enabled" ${config.enabled ? 'checked' : ''}>
                            <span style="margin-left: 5px;">Logging aktivieren</span>
                        </label>
                        
                        <label style="display: flex; align-items: center; margin-bottom: 10px;">
                            <input type="checkbox" id="setting-log-errors" ${config.logErrors ? 'checked' : ''}>
                            <span style="margin-left: 5px;">Fehler protokollieren</span>
                        </label>
                        
                        <label style="display: flex; align-items: center; margin-bottom: 10px;">
                            <input type="checkbox" id="setting-log-warnings" ${config.logWarnings ? 'checked' : ''}>
                            <span style="margin-left: 5px;">Warnungen protokollieren</span>
                        </label>
                        
                        <label style="display: flex; align-items: center; margin-bottom: 10px;">
                            <input type="checkbox" id="setting-log-info" ${config.logInfo ? 'checked' : ''}>
                            <span style="margin-left: 5px;">Info-Meldungen protokollieren</span>
                        </label>
                        
                        <label style="display: flex; align-items: center; margin-bottom: 10px;">
                            <input type="checkbox" id="setting-timestamps" ${config.showTimestamps ? 'checked' : ''}>
                            <span style="margin-left: 5px;">Zeitstempel anzeigen</span>
                        </label>
                        
                        <div style="margin-bottom: 10px;">
                            <label for="setting-max-entries" style="display: block; margin-bottom: 5px;">Max. Einträge pro Kategorie:</label>
                            <input type="number" id="setting-max-entries" value="${config.maxLogEntries}" style="width: 100%; padding: 5px; background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 3px;">
                        </div>
                        
                        <div style="margin-bottom: 10px;">
                            <label for="setting-position" style="display: block; margin-bottom: 5px;">Position:</label>
                            <select id="setting-position" style="width: 100%; padding: 5px; background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 3px;">
                                <option value="bottom-right" ${config.consolePosition === 'bottom-right' ? 'selected' : ''}>Unten rechts</option>
                                <option value="bottom-left" ${config.consolePosition === 'bottom-left' ? 'selected' : ''}>Unten links</option>
                                <option value="top-right" ${config.consolePosition === 'top-right' ? 'selected' : ''}>Oben rechts</option>
                                <option value="top-left" ${config.consolePosition === 'top-left' ? 'selected' : ''}>Oben links</option>
                            </select>
                        </div>
                        
                        <button id="setting-save" style="background: #4caf50; color: white; border: none; padding: 8px 12px; border-radius: 3px; cursor: pointer; margin-top: 10px;">Speichern</button>
                        <button id="setting-clear-logs" style="background: #f44336; color: white; border: none; padding: 8px 12px; border-radius: 3px; cursor: pointer; margin-top: 10px; margin-left: 10px;">Logs löschen</button>
                    </div>
                `;
            } else {
                // Log-Tabs (errors, warnings, info)
                tabContent.innerHTML = `
                    <div class="log-content" style="font-family: monospace; white-space: pre-wrap; word-break: break-all;"></div>
                    <div style="margin-top: 10px; display: flex; justify-content: space-between;">
                        <button class="btn-copy-all" style="background: #2196f3; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Alles kopieren</button>
                        <button class="btn-clear" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Löschen</button>
                    </div>
                `;
            }
            
            floatingConsole.appendChild(tabContent);
        });
        
        // Event-Listener für Settings
        setTimeout(() => {
            const saveButton = document.getElementById('setting-save');
            if (saveButton) {
                saveButton.addEventListener('click', () => {
                    config.enabled = document.getElementById('setting-enabled').checked;
                    config.logErrors = document.getElementById('setting-log-errors').checked;
                    config.logWarnings = document.getElementById('setting-log-warnings').checked;
                    config.logInfo = document.getElementById('setting-log-info').checked;
                    config.showTimestamps = document.getElementById('setting-timestamps').checked;
                    config.maxLogEntries = parseInt(document.getElementById('setting-max-entries').value) || 200;
                    config.consolePosition = document.getElementById('setting-position').value;
                    
                    saveConfig();
                    createDevConsoleUI(); // UI neu erstellen mit aktualisierten Einstellungen
                });
            }
            
            const clearLogsButton = document.getElementById('setting-clear-logs');
            if (clearLogsButton) {
                clearLogsButton.addEventListener('click', () => {
                    logs = { errors: [], warnings: [], info: [] };
                    updateConsoleUI();
                });
            }
            
            // Event-Listener für Copy & Clear Buttons
            document.querySelectorAll('#dev-console .btn-copy-all').forEach(button => {
                button.addEventListener('click', function() {
                    const tabId = this.closest('.tab-content').dataset.tab;
                    copyLogs(tabId);
                });
            });
            
            document.querySelectorAll('#dev-console .btn-clear').forEach(button => {
                button.addEventListener('click', function() {
                    const tabId = this.closest('.tab-content').dataset.tab;
                    clearLogs(tabId);
                });
            });
        }, 0);
        
        document.body.appendChild(floatingConsole);
        
        // Initial UI aktualisieren
        updateConsoleUI();
    }
    
    // UI aktualisieren
    function updateConsoleUI() {
        if (!floatingConsole) return;
        
        // Für jeden Tab den Inhalt aktualisieren
        ['errors', 'warnings', 'info'].forEach(type => {
            const logContent = floatingConsole.querySelector(`.tab-content[data-tab="${type}"] .log-content`);
            if (!logContent) return;
            
            // Log-Einträge formatieren
            let content = '';
            logs[type].forEach(entry => {
                const time = config.showTimestamps ? `[${entry.timestamp.split('T')[1].split('.')[0]}] ` : '';
                content += `<div style="margin-bottom: 5px; color: ${getColorForType(type)};">${time}${sanitizeHTML(entry.message)}</div>`;
            });
            
            // Wenn keine Einträge, Info anzeigen
            if (logs[type].length === 0) {
                content = `<div style="color: gray; font-style: italic;">Keine ${getTypeLabel(type)} vorhanden.</div>`;
            }
            
            logContent.innerHTML = content;
            
            // Scroll nach unten
            logContent.scrollTop = logContent.scrollHeight;
        });
    }
    
    // Hilfsfunktionen
    function getColorForType(type) {
        switch (type) {
            case 'errors': return '#ff5252';
            case 'warnings': return '#ffab40';
            case 'info': return '#4fc3f7';
            default: return 'white';
        }
    }
    
    function getTypeLabel(type) {
        switch (type) {
            case 'errors': return 'Fehler';
            case 'warnings': return 'Warnungen';
            case 'info': return 'Info-Meldungen';
            default: return type;
        }
    }
    
    function sanitizeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Logs für einen Tab kopieren
    function copyLogs(type) {
        let content = '';
        
        logs[type].forEach(entry => {
            const time = config.showTimestamps ? `[${entry.timestamp}] ` : '';
            content += `${time}${entry.message}\n`;
        });
        
        if (content === '') {
            content = `Keine ${getTypeLabel(type)} vorhanden.`;
        }
        
        // In die Zwischenablage kopieren
        navigator.clipboard.writeText(content).then(() => {
            alert(`${getTypeLabel(type)} wurden in die Zwischenablage kopiert.`);
        }).catch(err => {
            console.error('Fehler beim Kopieren in die Zwischenablage:', err);
            
            // Fallback für ältere Browser
            const textarea = document.createElement('textarea');
            textarea.value = content;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            alert(`${getTypeLabel(type)} wurden in die Zwischenablage kopiert.`);
        });
    }
    
    // Logs für einen Tab löschen
    function clearLogs(type) {
        logs[type] = [];
        updateConsoleUI();
    }
    
    // Konsole anzeigen/verstecken
    function showConsole() {
        if (!floatingConsole) {
            createDevConsoleUI();
        }
        
        if (floatingConsole) {
            floatingConsole.style.display = 'block';
            consoleVisible = true;
            updateConsoleUI();
        }
    }
    
    function hideConsole() {
        if (floatingConsole) {
            floatingConsole.style.display = 'none';
            consoleVisible = false;
        }
    }
    
    // Tastenkombination zum Ein-/Ausblenden
    function setupKeyboardShortcut() {
        document.addEventListener('keydown', function(e) {
            // Alt+D für DevTools
            if (e.altKey && e.key === 'd') {
                if (consoleVisible) {
                    hideConsole();
                } else {
                    showConsole();
                }
            }
        });
    }
    
    // Admin-Panel-Button zum Ein-/Ausblenden hinzufügen
    function addAdminPanelButton() {
        // Warten, bis die Admin-Navigation geladen ist
        const checkInterval = setInterval(() => {
            const adminNav = document.querySelector('.admin-nav, .admin-sidebar, .admin-menu');
            
            if (adminNav) {
                clearInterval(checkInterval);
                
                // Prüfen, ob der Button bereits existiert
                if (document.getElementById('dev-console-toggle')) return;
                
                // Button erstellen
                const devButton = document.createElement('div');
                devButton.id = 'dev-console-toggle';
                devButton.className = 'admin-nav-item';
                devButton.innerHTML = '<i class="fas fa-bug"></i> <span>Dev Console</span>';
                devButton.style.cssText = `
                    display: flex;
                    align-items: center;
                    padding: 10px;
                    cursor: pointer;
                    color: ${config.enabled ? '#4caf50' : 'inherit'};
                    border-left: 3px solid transparent;
                `;
                
                // Event-Listener für Klick
                devButton.addEventListener('click', function() {
                    if (consoleVisible) {
                        hideConsole();
                    } else {
                        showConsole();
                    }
                });
                
                // Button zur Navigation hinzufügen
                adminNav.appendChild(devButton);
            }
        }, 500);
    }
    
    // Öffentliche API
    window.devLogs = {
        enable: function() {
            config.enabled = true;
            saveConfig();
            return 'Logging aktiviert';
        },
        disable: function() {
            config.enabled = false;
            saveConfig();
            return 'Logging deaktiviert';
        },
        show: showConsole,
        hide: hideConsole,
        clear: function() {
            logs = { errors: [], warnings: [], info: [] };
            updateConsoleUI();
            return 'Logs gelöscht';
        },
        getErrors: function() {
            return [...logs.errors];
        },
        getWarnings: function() {
            return [...logs.warnings];
        },
        getInfo: function() {
            return [...logs.info];
        },
        copyErrors: function() {
            copyLogs('errors');
        },
        copyWarnings: function() {
            copyLogs('warnings');
        },
        copyInfo: function() {
            copyLogs('info');
        }
    };
    
    // Initialisierung
    function init() {
        // Nur im Dev-Modus oder wenn explizit aktiviert aktivieren
        if (devMode || config.enabled) {
            // Console überschreiben
            interceptConsole();
            
            // Tastenkombination einrichten
            setupKeyboardShortcut();
            
            // Wenn im Admin-Bereich, Button hinzufügen
            setTimeout(() => {
                if (document.querySelector('.admin-panel, .admin-view, .admin-nav, .admin-sidebar')) {
                    addAdminPanelButton();
                }
            }, 1000);
            
            // Wenn Floating-Konsole aktiviert, anzeigen
            if (config.floatingConsole) {
                setTimeout(() => {
                    showConsole();
                }, 1000);
            }
        }
    }
    
    // Nach DOM-Laden initialisieren
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();