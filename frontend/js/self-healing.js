/**
 * self-healing.js - Self-Healing-Mechanismen für nScale DMS Assistent
 * 
 * Dieses Modul bietet Self-Healing-Mechanismen zur automatischen Wiederherstellung
 * nach Fehlern und zur Verbesserung der Robustheit der Anwendung.
 */

import errorHandler, { ErrorCategory } from './error-handler.js';
import apiClient from './api-client.js';

/**
 * Self-Healing-Strategien für verschiedene Szenarien
 * @enum {string}
 */
export const HealingStrategy = {
    // Wiederholungsversuch für fehlgeschlagene Operationen
    RETRY: 'retry',
    
    // Neuladen der aktuellen Seite
    RELOAD: 'reload',
    
    // Wiederherstellen von Daten aus dem lokalen Speicher
    RESTORE_LOCAL: 'restore_local',
    
    // Wiederherstellen von Daten vom Server
    RESTORE_SERVER: 'restore_server',
    
    // Sitzung neu initialisieren
    REINITIALIZE_SESSION: 'reinitialize_session',
    
    // Benutzeroberfläche neu rendern
    RERENDER_UI: 'rerender_ui'
};

/**
 * Konfigurationsoptionen für Self-Healing
 * @typedef {Object} SelfHealingOptions
 * @property {HealingStrategy} strategy - Die zu verwendende Healing-Strategie
 * @property {number} [maxAttempts=3] - Maximale Anzahl von Heilungsversuchen
 * @property {number} [delayBetweenAttempts=2000] - Verzögerung zwischen den Versuchen in ms
 * @property {Function} [onHealing] - Callback-Funktion, die während des Heilungsprozesses aufgerufen wird
 * @property {Function} [onSuccess] - Callback-Funktion, die bei erfolgreicher Heilung aufgerufen wird
 * @property {Function} [onFailure] - Callback-Funktion, die bei fehlgeschlagener Heilung aufgerufen wird
 * @property {boolean} [showIndicator=true] - Ob ein Heilungsindikator angezeigt werden soll
 */

/**
 * Hauptklasse für Self-Healing-Funktionalität
 */
class SelfHealing {
    constructor() {
        // Laufende Heilungsprozesse
        this.healingProcesses = new Map();
        
        // Heilungsversuche pro Kontext
        this.healingAttempts = new Map();
        
        // Maximale gespeicherte Zustände pro Kontext
        this.MAX_STORED_STATES = 5;
        
        // Zustandsspeicher für verschiedene Kontexte
        this.stateStore = new Map();
        
        // UI-Elemente
        this.healingIndicator = null;
        
        // Initialisieren, sobald das DOM geladen ist
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeUI());
        } else {
            this.initializeUI();
        }
        
        // Event-Listener für Offline/Online-Status
        this.setupConnectionHandlers();
    }
    
    /**
     * Initialisiert die UI-Elemente für Healing-Indikatoren
     * @private
     */
    initializeUI() {
        // Healing-Indikator erstellen, falls nicht vorhanden
        if (!this.healingIndicator) {
            this.healingIndicator = document.getElementById('healing-indicator');
            if (!this.healingIndicator) {
                this.healingIndicator = document.createElement('div');
                this.healingIndicator.id = 'healing-indicator';
                this.healingIndicator.className = 'healing-indicator';
                this.healingIndicator.style.display = 'none';
                document.body.appendChild(this.healingIndicator);
            }
        }
        
        // CSS für die Healing-Anzeige einbinden
        this.injectHealingStyles();
    }
    
    /**
     * Injiziert CSS-Stile für Healing-Indikatoren
     * @private
     */
    injectHealingStyles() {
        if (!document.getElementById('self-healing-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'self-healing-styles';
            styleElement.textContent = `
                .healing-indicator {
                    position: fixed;
                    top: 10px;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                    padding: 8px 16px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 14px;
                    color: #495057;
                    max-width: 300px;
                    animation: slideDown 0.3s forwards;
                }
                .healing-indicator-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid #e9ecef;
                    border-top-color: #007bff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes slideDown {
                    from { transform: translate(-50%, -20px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
            `;
            document.head.appendChild(styleElement);
        }
    }
    
    /**
     * Richtet Handler für Verbindungsänderungen ein
     * @private
     */
    setupConnectionHandlers() {
        // Online-Event
        window.addEventListener('online', () => {
            console.log('Verbindung wiederhergestellt, prüfe auf ausstehende Operationen...');
            this.handleConnectionRestored();
        });
        
        // Offline-Event
        window.addEventListener('offline', () => {
            console.log('Verbindung verloren, speichere aktuellen Zustand...');
            this.handleConnectionLost();
        });
        
        // Visibility-Change-Event (Tab wird wieder aktiv)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('Tab wurde wieder aktiv, prüfe auf Aktualisierungsbedarf...');
                this.handleVisibilityRestore();
            }
        });
    }
    
    /**
     * Behandelt die Wiederherstellung der Verbindung
     * @private
     */
    async handleConnectionRestored() {
        // Prüfen, ob ausstehende Operationen vorhanden sind
        const pendingOperations = this.getPendingOperations();
        
        if (pendingOperations.length > 0) {
            // Benutzer benachrichtigen
            this.showHealingIndicator('Verbindung wiederhergestellt, synchronisiere Daten...');
            
            // Für jede ausstehende Operation einen Heilungsprozess starten
            for (const operation of pendingOperations) {
                await this.heal({
                    strategy: HealingStrategy.RETRY,
                    maxAttempts: 3,
                    onHealing: () => {
                        console.log(`Wiederhole Operation: ${operation.type}`);
                    },
                    context: operation
                });
            }
            
            // Indikator ausblenden
            this.hideHealingIndicator();
        }
        
        // Zustand der Anwendung aktualisieren
        this.refreshApplicationState();
    }
    
    /**
     * Behandelt den Verlust der Verbindung
     * @private
     */
    handleConnectionLost() {
        // Aktuellen Zustand speichern
        this.saveCurrentState('connection_lost');
        
        // Benutzer benachrichtigen
        errorHandler.handleError(
            new Error('Internetverbindung verloren. Änderungen werden gespeichert und synchronisiert, sobald die Verbindung wiederhergestellt ist.'),
            {
                category: ErrorCategory.NETWORK,
                handlerOptions: {
                    showNotification: true,
                    showUser: false
                }
            }
        );
    }
    
    /**
     * Behandelt die Wiederherstellung der Tab-Sichtbarkeit
     * @private
     */
    handleVisibilityRestore() {
        // Wenn die Seite länger als 5 Minuten im Hintergrund war, aktualisieren
        const lastActiveTime = parseInt(sessionStorage.getItem('lastActiveTime') || '0');
        const currentTime = Date.now();
        const inactiveTime = currentTime - lastActiveTime;
        
        if (inactiveTime > 5 * 60 * 1000) {  // 5 Minuten
            console.log(`Seite war ${Math.round(inactiveTime / 1000 / 60)} Minuten inaktiv, aktualisiere Daten...`);
            this.refreshApplicationState();
        }
        
        // Aktuelle Zeit speichern
        sessionStorage.setItem('lastActiveTime', currentTime.toString());
    }
    
    /**
     * Speichert den aktuellen Zustand der Anwendung
     * @param {string} context - Der Kontext für den gespeicherten Zustand
     * @private
     */
    saveCurrentState(context = 'default') {
        try {
            // Zustand aus relevanten Quellen sammeln
            const state = {
                timestamp: Date.now(),
                
                // Daten aus sessionStorage
                sessionStorage: {},
                
                // Daten aus localStorage
                localStorage: {
                    token: localStorage.getItem('token'),
                    lastActiveSession: localStorage.getItem('lastActiveSession'),
                    motdDismissed: localStorage.getItem('motdDismissed')
                },
                
                // Daten aus der Vue-App, falls verfügbar
                appState: window.app && window.app.$data ? this.extractAppState(window.app.$data) : null
            };
            
            // SessionStorage-Daten sammeln
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key) {
                    state.sessionStorage[key] = sessionStorage.getItem(key);
                }
            }
            
            // Aktuelle States für den Kontext abrufen oder initialisieren
            if (!this.stateStore.has(context)) {
                this.stateStore.set(context, []);
            }
            
            const states = this.stateStore.get(context);
            
            // Neuen State hinzufügen
            states.unshift(state);
            
            // Anzahl der gespeicherten States begrenzen
            if (states.length > this.MAX_STORED_STATES) {
                states.pop();
            }
            
            console.log(`Zustand für Kontext '${context}' gespeichert:`, state);
        } catch (error) {
            console.error('Fehler beim Speichern des Zustands:', error);
        }
    }
    
    /**
     * Extrahiert den relevanten App-Zustand aus den Vue-Daten
     * @param {Object} appData - Vue $data Objekt
     * @returns {Object} - Extrahierter Zustand
     * @private
     */
    extractAppState(appData) {
        // Ausgewählte Daten aus dem App-Zustand extrahieren
        return {
            currentSessionId: appData.currentSessionId,
            activeView: appData.activeView,
            isStreaming: appData.isStreaming,
            isLoading: appData.isLoading,
            sessions: appData.sessions ? appData.sessions.map(s => ({
                id: s.id,
                title: s.title,
                created_at: s.created_at
            })) : []
        };
    }
    
    /**
     * Stellt einen gespeicherten Zustand wieder her
     * @param {string} context - Der Kontext des wiederherzustellenden Zustands
     * @param {number} [index=0] - Der Index des wiederherzustellenden Zustands (0 = neuester)
     * @returns {boolean} - Ob die Wiederherstellung erfolgreich war
     * @private
     */
    restoreState(context = 'default', index = 0) {
        try {
            // Prüfen, ob States für den Kontext vorhanden sind
            if (!this.stateStore.has(context) || this.stateStore.get(context).length <= index) {
                console.warn(`Kein gespeicherter Zustand für Kontext '${context}' mit Index ${index} vorhanden`);
                return false;
            }
            
            const state = this.stateStore.get(context)[index];
            
            console.log(`Stelle Zustand für Kontext '${context}' wieder her:`, state);
            
            // LocalStorage-Daten wiederherstellen
            if (state.localStorage) {
                for (const [key, value] of Object.entries(state.localStorage)) {
                    if (value !== null) {
                        localStorage.setItem(key, value);
                    } else {
                        localStorage.removeItem(key);
                    }
                }
            }
            
            // SessionStorage-Daten wiederherstellen
            if (state.sessionStorage) {
                for (const [key, value] of Object.entries(state.sessionStorage)) {
                    if (value !== null) {
                        sessionStorage.setItem(key, value);
                    } else {
                        sessionStorage.removeItem(key);
                    }
                }
            }
            
            // App-Zustand wiederherstellen, falls möglich
            if (state.appState && window.app && window.app.$data) {
                this.restoreAppState(state.appState);
            }
            
            return true;
        } catch (error) {
            console.error('Fehler beim Wiederherstellen des Zustands:', error);
            return false;
        }
    }
    
    /**
     * Stellt den App-Zustand wieder her
     * @param {Object} appState - Der wiederherzustellende App-Zustand
     * @private
     */
    restoreAppState(appState) {
        // App-Funktionen für die Wiederherstellung
        const app = window.app;
        
        // Prüfen, ob erforderliche Funktionen vorhanden sind
        if (!app || !app.loadSessions || !app.loadSession) {
            console.warn('App-Funktionen für die Zustandswiederherstellung nicht verfügbar');
            return;
        }
        
        // Sessions laden
        app.loadSessions().then(() => {
            // Wenn eine aktive Session existiert, diese laden
            if (appState.currentSessionId && app.$data.sessions.some(s => s.id === appState.currentSessionId)) {
                app.loadSession(appState.currentSessionId);
            }
            
            // View wiederherstellen
            if (appState.activeView) {
                app.$data.activeView = appState.activeView;
            }
        }).catch(error => {
            console.error('Fehler beim Wiederherstellen des App-Zustands:', error);
        });
    }
    
    /**
     * Gibt ausstehende Operationen zurück
     * @returns {Array} - Liste der ausstehenden Operationen
     * @private
     */
    getPendingOperations() {
        // Aus localStorage ausstehende Operationen laden
        const pendingOperationsJson = localStorage.getItem('pendingOperations');
        if (!pendingOperationsJson) {
            return [];
        }
        
        try {
            return JSON.parse(pendingOperationsJson);
        } catch (error) {
            console.error('Fehler beim Parsen der ausstehenden Operationen:', error);
            return [];
        }
    }
    
    /**
     * Speichert eine ausstehende Operation
     * @param {Object} operation - Die zu speichernde Operation
     * @private
     */
    savePendingOperation(operation) {
        // Aktuelle ausstehende Operationen laden
        const pendingOperations = this.getPendingOperations();
        
        // Operation hinzufügen
        pendingOperations.push({
            ...operation,
            timestamp: Date.now()
        });
        
        // Zurück in localStorage speichern
        localStorage.setItem('pendingOperations', JSON.stringify(pendingOperations));
    }
    
    /**
     * Entfernt eine ausstehende Operation
     * @param {string} operationId - Die ID der zu entfernenden Operation
     * @private
     */
    removePendingOperation(operationId) {
        // Aktuelle ausstehende Operationen laden
        const pendingOperations = this.getPendingOperations();
        
        // Operation entfernen
        const updatedOperations = pendingOperations.filter(op => op.id !== operationId);
        
        // Zurück in localStorage speichern
        localStorage.setItem('pendingOperations', JSON.stringify(updatedOperations));
    }
    
    /**
     * Aktualisiert den Anwendungszustand
     * @private
     */
    refreshApplicationState() {
        // Prüfen, ob App verfügbar ist
        if (!window.app) {
            console.warn('App nicht verfügbar für Aktualisierung');
            return;
        }
        
        // Sessions laden
        if (window.app.loadSessions) {
            window.app.loadSessions().catch(error => {
                console.error('Fehler beim Laden der Sessions:', error);
            });
        }
        
        // Aktuelle Session neu laden, falls vorhanden
        if (window.app.$data && window.app.$data.currentSessionId && window.app.loadSession) {
            window.app.loadSession(window.app.$data.currentSessionId).catch(error => {
                console.error('Fehler beim Laden der aktuellen Session:', error);
            });
        }
        
        // MOTD laden
        if (window.app.loadMotd) {
            window.app.loadMotd().catch(error => {
                console.error('Fehler beim Laden der MOTD:', error);
            });
        }
    }
    
    /**
     * Zeigt den Healing-Indikator an
     * @param {string} message - Die anzuzeigende Nachricht
     * @private
     */
    showHealingIndicator(message) {
        // Überprüfen, ob die UI initialisiert wurde
        if (!this.healingIndicator) {
            this.initializeUI();
        }
        
        // Indikator leeren
        this.healingIndicator.innerHTML = '';
        
        // Spinner erstellen
        const spinner = document.createElement('div');
        spinner.className = 'healing-indicator-spinner';
        
        // Nachrichtenelement erstellen
        const messageElement = document.createElement('div');
        messageElement.className = 'healing-indicator-message';
        messageElement.textContent = message;
        
        // Elemente zum Indikator hinzufügen
        this.healingIndicator.appendChild(spinner);
        this.healingIndicator.appendChild(messageElement);
        
        // Indikator anzeigen
        this.healingIndicator.style.display = 'flex';
    }
    
    /**
     * Verbirgt den Healing-Indikator
     * @private
     */
    hideHealingIndicator() {
        if (this.healingIndicator) {
            this.healingIndicator.style.display = 'none';
        }
    }
    
    /**
     * Führt einen Heilungsprozess durch
     * @param {SelfHealingOptions} options - Optionen für den Heilungsprozess
     * @returns {Promise<boolean>} - Ob die Heilung erfolgreich war
     */
    async heal(options) {
        const {
            strategy = HealingStrategy.RETRY,
            maxAttempts = 3,
            delayBetweenAttempts = 2000,
            onHealing = null,
            onSuccess = null,
            onFailure = null,
            showIndicator = true,
            context = {}
        } = options;
        
        // Healing-ID generieren
        const healingId = `${strategy}-${Date.now()}`;
        
        // Kontextschlüssel generieren
        const contextKey = context.key || strategy;
        
        // Anzahl der Heilungsversuche für diesen Kontext abrufen
        const attempts = this.healingAttempts.get(contextKey) || 0;
        
        // Prüfen, ob maximale Anzahl an Versuchen erreicht ist
        if (attempts >= maxAttempts) {
            console.warn(`Maximale Anzahl an Heilungsversuchen (${maxAttempts}) für Kontext ${contextKey} erreicht`);
            
            // Callback aufrufen, wenn vorhanden
            if (onFailure) {
                onFailure(new Error(`Maximale Anzahl an Heilungsversuchen erreicht`), attempts);
            }
            
            return false;
        }
        
        // Anzahl der Heilungsversuche erhöhen
        this.healingAttempts.set(contextKey, attempts + 1);
        
        // Wenn Indikator angezeigt werden soll
        if (showIndicator) {
            this.showHealingIndicator(this.getHealingMessage(strategy, attempts + 1, maxAttempts));
        }
        
        try {
            // Healing-Strategie anwenden
            switch (strategy) {
                case HealingStrategy.RETRY:
                    await this.applyRetryStrategy(options, attempts);
                    break;
                    
                case HealingStrategy.RELOAD:
                    this.applyReloadStrategy();
                    return true; // Rückgabewert irrelevant, da Seite neu geladen wird
                    
                case HealingStrategy.RESTORE_LOCAL:
                    await this.applyRestoreLocalStrategy(context);
                    break;
                    
                case HealingStrategy.RESTORE_SERVER:
                    await this.applyRestoreServerStrategy(context);
                    break;
                    
                case HealingStrategy.REINITIALIZE_SESSION:
                    await this.applyReinitializeSessionStrategy();
                    break;
                    
                case HealingStrategy.RERENDER_UI:
                    await this.applyRerenderUIStrategy();
                    break;
                    
                default:
                    throw new Error(`Unbekannte Healing-Strategie: ${strategy}`);
            }
            
            // Indikator ausblenden
            if (showIndicator) {
                this.hideHealingIndicator();
            }
            
            // Erfolgs-Callback aufrufen, wenn vorhanden
            if (onSuccess) {
                onSuccess();
            }
            
            // Heilungsversuche zurücksetzen
            this.healingAttempts.delete(contextKey);
            
            return true;
        } catch (error) {
            console.error(`Fehler bei Heilungsstrategie ${strategy}:`, error);
            
            // Indikator ausblenden
            if (showIndicator) {
                this.hideHealingIndicator();
            }
            
            // Nach Verzögerung erneut versuchen, falls noch Versuche übrig sind
            if (attempts + 1 < maxAttempts) {
                console.log(`Neuer Heilungsversuch in ${delayBetweenAttempts}ms...`);
                
                // Verzögerung
                await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
                
                // Rekursiver Aufruf für nächsten Versuch
                return this.heal({
                    ...options,
                    context
                });
            } else {
                // Maximale Anzahl an Versuchen erreicht
                console.warn(`Maximale Anzahl an Heilungsversuchen (${maxAttempts}) für Kontext ${contextKey} erreicht`);
                
                // Fehler-Callback aufrufen, wenn vorhanden
                if (onFailure) {
                    onFailure(error, attempts + 1);
                }
                
                // Heilungsversuche zurücksetzen
                this.healingAttempts.delete(contextKey);
                
                return false;
            }
        }
    }
    
    /**
     * Wendet die Retry-Strategie an
     * @param {SelfHealingOptions} options - Optionen für den Heilungsprozess
     * @param {number} attempts - Anzahl der bisherigen Versuche
     * @private
     */
    async applyRetryStrategy(options, attempts) {
        const { context, onHealing } = options;
        
        // Callback aufrufen, wenn vorhanden
        if (onHealing) {
            onHealing(attempts + 1);
        }
        
        // Spezifische Logik basierend auf Kontext
        if (context.type === 'api_call') {
            // API-Aufruf wiederholen
            const { method, url, data, config } = context;
            
            // Methode auswählen
            switch (method) {
                case 'GET':
                    await apiClient.get(url, null, config);
                    break;
                    
                case 'POST':
                    await apiClient.post(url, data, config);
                    break;
                    
                case 'PUT':
                    await apiClient.put(url, data, config);
                    break;
                    
                case 'DELETE':
                    await apiClient.delete(url, config);
                    break;
                    
                default:
                    throw new Error(`Unbekannte HTTP-Methode: ${method}`);
            }
            
            // Operation aus ausstehenden Operationen entfernen
            if (context.id) {
                this.removePendingOperation(context.id);
            }
        } else if (context.type === 'stream_reconnect') {
            // Stream neu verbinden
            if (window.app && window.app.cleanupStream && window.app.sendQuestionStream) {
                // Alten Stream bereinigen
                window.app.cleanupStream();
                
                // Warten, um sicherzustellen, dass der alte Stream vollständig geschlossen ist
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Neuen Stream starten
                window.app.sendQuestionStream();
            } else {
                throw new Error('Stream-Funktionen nicht verfügbar');
            }
        } else if (context.type === 'session_reload') {
            // Session neu laden
            if (window.app && window.app.loadSession && context.sessionId) {
                await window.app.loadSession(context.sessionId);
            } else {
                throw new Error('Session-Funktionen oder Session-ID nicht verfügbar');
            }
        } else {
            throw new Error(`Unbekannter Kontext-Typ für Retry: ${context.type}`);
        }
    }
    
    /**
     * Wendet die Reload-Strategie an
     * @private
     */
    applyReloadStrategy() {
        // Aktuellen Zustand vor dem Neuladen speichern
        this.saveCurrentState('before_reload');
        
        // Seite neu laden
        window.location.reload();
    }
    
    /**
     * Wendet die Restore-Local-Strategie an
     * @param {Object} context - Kontext für die Wiederherstellung
     * @private
     */
    async applyRestoreLocalStrategy(context) {
        // Lokalen Zustand wiederherstellen
        const success = this.restoreState(context.stateContext || 'default', context.stateIndex || 0);
        
        if (!success) {
            throw new Error('Lokaler Zustand konnte nicht wiederhergestellt werden');
        }
    }
    
    /**
     * Wendet die Restore-Server-Strategie an
     * @param {Object} context - Kontext für die Wiederherstellung
     * @private
     */
    async applyRestoreServerStrategy(context) {
        // Prüfen, ob erforderliche Informationen vorhanden sind
        if (!context.sessionId) {
            throw new Error('Keine Session-ID für Wiederherstellung vom Server angegeben');
        }
        
        // Session vom Server laden
        if (window.app && window.app.loadSession) {
            await window.app.loadSession(context.sessionId);
        } else {
            throw new Error('Session-Funktionen nicht verfügbar');
        }
    }
    
    /**
     * Wendet die Reinitialize-Session-Strategie an
     * @private
     */
    async applyReinitializeSessionStrategy() {
        // Prüfen, ob App verfügbar ist
        if (!window.app || !window.app.startNewSession) {
            throw new Error('App-Funktionen für Session-Neuinitialisierung nicht verfügbar');
        }
        
        // Aktuelle Session-ID speichern
        const currentSessionId = window.app.$data ? window.app.$data.currentSessionId : null;
        
        try {
            // Neue Session starten
            await window.app.startNewSession();
            
            // Erfolgreich
            return;
        } catch (error) {
            // Falls möglich, zur vorherigen Session zurückkehren
            if (currentSessionId && window.app.loadSession) {
                await window.app.loadSession(currentSessionId);
            }
            
            // Fehler weiterwerfen
            throw error;
        }
    }
    
    /**
     * Wendet die Rerender-UI-Strategie an
     * @private
     */
    async applyRerenderUIStrategy() {
        // Prüfen, ob App verfügbar ist
        if (!window.app) {
            throw new Error('App nicht verfügbar für UI-Rerendering');
        }
        
        // Aktuellen Zustand speichern
        const currentState = window.app.$data ? this.extractAppState(window.app.$data) : null;
        
        // Sessions neu laden
        if (window.app.loadSessions) {
            await window.app.loadSessions();
        }
        
        // Aktuelle Session neu laden, falls vorhanden
        if (currentState && currentState.currentSessionId && window.app.loadSession) {
            await window.app.loadSession(currentState.currentSessionId);
        }
    }
    
    /**
     * Generiert eine Heilungsnachricht basierend auf der Strategie
     * @param {HealingStrategy} strategy - Die Healing-Strategie
     * @param {number} attempt - Aktueller Versuch
     * @param {number} maxAttempts - Maximale Anzahl von Versuchen
     * @returns {string} - Heilungsnachricht
     * @private
     */
    getHealingMessage(strategy, attempt, maxAttempts) {
        switch (strategy) {
            case HealingStrategy.RETRY:
                return `Wiederhole Operation... (${attempt}/${maxAttempts})`;
                
            case HealingStrategy.RELOAD:
                return 'Lade Seite neu...';
                
            case HealingStrategy.RESTORE_LOCAL:
                return 'Stelle lokalen Zustand wieder her...';
                
            case HealingStrategy.RESTORE_SERVER:
                return 'Lade Daten vom Server...';
                
            case HealingStrategy.REINITIALIZE_SESSION:
                return 'Initialisiere Sitzung neu...';
                
            case HealingStrategy.RERENDER_UI:
                return 'Aktualisiere Benutzeroberfläche...';
                
            default:
                return `Selbstheilung aktiv... (${attempt}/${maxAttempts})`;
        }
    }
}

// Singleton-Instanz erstellen
const selfHealing = new SelfHealing();

// Module exportieren
export default selfHealing;