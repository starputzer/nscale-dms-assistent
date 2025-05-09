/**
 * enhanced-chat.js - Verbesserte Chat-Funktionalität mit Fehlerbehandlung und Self-Healing
 * 
 * Diese Datei enthält eine verbesserte Implementierung der Chat-Funktionalität mit
 * robuster Fehlerbehandlung, Self-Healing-Mechanismen und benutzerfreundlichen Meldungen.
 */

import apiClient from './api-client.js';
import errorHandler, { ErrorCategory, ErrorSeverity } from './error-handler.js';
import selfHealing, { HealingStrategy } from './self-healing.js';

/**
 * Verbesserte Chat-Konfiguration
 * @typedef {Object} EnhancedChatOptions
 * @property {Object} token - Referenz auf den Authentifizierungstoken
 * @property {Object} messages - Referenz auf die Chat-Nachrichten
 * @property {Object} question - Referenz auf die aktuelle Frage
 * @property {Object} currentSessionId - Referenz auf die aktuelle Session-ID
 * @property {Object} isLoading - Referenz auf den Ladestatus
 * @property {Object} isStreaming - Referenz auf den Streaming-Status
 * @property {Object} eventSource - Referenz auf die EventSource-Instanz
 * @property {Function} scrollToBottom - Funktion zum Scrollen zum Ende der Nachrichten
 * @property {Function} nextTick - Vue nextTick-Funktion
 * @property {Function} loadSessions - Funktion zum Laden der Sessions
 * @property {Object} motdDismissed - Referenz auf den MOTD-Dismissed-Status
 */

/**
 * Fehlernachrichten für verschiedene Szenarien
 * @enum {string}
 */
const ErrorMessages = {
    // Allgemeine Fehler
    GENERAL: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.',
    
    // Netzwerkfehler
    NETWORK: 'Es konnte keine Verbindung zum Server hergestellt werden. Bitte überprüfen Sie Ihre Internetverbindung.',
    TIMEOUT: 'Die Verbindung zum Server hat zu lange gedauert. Bitte versuchen Sie es später erneut.',
    
    // Serverfehler
    SERVER: 'Der Server konnte Ihre Anfrage nicht verarbeiten. Bitte versuchen Sie es später erneut.',
    
    // Authentifizierungsfehler
    AUTH: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',
    
    // Chat-spezifische Fehler
    EMPTY_RESPONSE: 'Es wurden keine Daten empfangen. Bitte versuchen Sie es später erneut.',
    STREAM_INTERRUPT: 'Die Verbindung wurde unterbrochen. Versuche, die Verbindung wiederherzustellen...',
    STREAM_RECONNECT: 'Verbindung wiederhergestellt. Setze Streaming fort...',
    STREAM_ERROR: 'Es ist ein Fehler beim Streaming aufgetreten. Die Antwort könnte unvollständig sein.',
    PARTIAL_RESPONSE: 'Die Antwort wurde möglicherweise abgeschnitten.'
};

/**
 * Erweitert die Chat-Funktionalität mit robuster Fehlerbehandlung und Self-Healing
 * @param {EnhancedChatOptions} options - Chat-Konfigurationsoptionen
 * @returns {Object} - Erweiterte Chat-Funktionen
 */
export function setupEnhancedChat(options) {
    const {
        token,
        messages,
        question,
        currentSessionId,
        isLoading,
        isStreaming,
        eventSource,
        scrollToBottom,
        nextTick,
        loadSessions,
        motdDismissed
    } = options;
    
    // Interne Zustandsvariablen
    let tokenCount = 0;
    let streamTimeout;
    let currentStreamRetryCount = 0;
    let completeResponse = "";
    let currentMessageId = null;
    let streamStartTime = 0;
    let lastTokenTime = 0;
    let offlineQueue = [];
    
    // Konstante Konfiguration
    const CONFIG = {
        STREAM_TIMEOUT_MS: 30000,          // 30 Sekunden Inaktivität
        MAX_STREAM_RETRIES: 3,             // Maximale Anzahl von Stream-Wiederholungsversuchen
        MIN_TOKEN_INTERVAL_MS: 50,         // Minimaler Abstand zwischen Tokens
        MAX_OFFLINE_QUEUE_SIZE: 10,        // Maximale Größe der Offline-Warteschlange
        RETRY_DELAY_MS: 1000,              // Basisverzögerung für Wiederholungsversuche
        RESPONSE_CHECK_INTERVAL_MS: 5000,  // Intervall zur Prüfung der Antwortqualität
        STREAM_HEALTH_CHECK_MS: 10000,     // Intervall zur Überprüfung der Stream-Gesundheit
        PARTIAL_TOKEN_THRESHOLD: 10,       // Schwellenwert für unvollständige Antworten
        RECONNECT_PAUSE_MS: 1000           // Pause vor Wiederverbindungsversuchen
    };
    
    /**
     * Bereinigt die EventSource-Verbindung und zugehörige Ressourcen
     */
    const cleanupStream = () => {
        console.log("Bereinige Stream-Verbindung");
        
        // Timer löschen
        if (streamTimeout) {
            clearTimeout(streamTimeout);
            streamTimeout = null;
        }
        
        // Zustand zurücksetzen
        tokenCount = 0;
        currentStreamRetryCount = 0;
        streamStartTime = 0;
        lastTokenTime = 0;
        
        // EventSource bereinigen, falls vorhanden
        if (eventSource.value) {
            try {
                console.log("Schließe EventSource-Verbindung");
                
                // Listener entfernen
                eventSource.value.onmessage = null;
                eventSource.value.onerror = null;
                eventSource.value.onopen = null;
                
                // Spezielle Listener entfernen
                eventSource.value.removeEventListener('done', doneEventHandler);
                eventSource.value.removeEventListener('open', openEventHandler);
                eventSource.value.removeEventListener('error', errorEventHandler);
                
                // EventSource schließen
                eventSource.value.close();
                eventSource.value = null;
            } catch (error) {
                console.error("Fehler beim Bereinigen der EventSource:", error);
                
                // Fehler protokollieren, aber nicht anzeigen
                errorHandler.handleError(error, {
                    category: ErrorCategory.APP,
                    severity: ErrorSeverity.WARNING,
                    handlerOptions: {
                        showUser: false,
                        showNotification: false
                    }
                });
            }
        }
        
        // Status zurücksetzen
        isLoading.value = false;
        isStreaming.value = false;
    };
    
    /**
     * Setzt den Timeout für inaktive Streams zurück
     */
    const resetStreamTimeout = () => {
        // Bestehenden Timer löschen
        if (streamTimeout) {
            clearTimeout(streamTimeout);
        }
        
        // Neuen Timer erstellen
        streamTimeout = setTimeout(() => {
            if (isStreaming.value) {
                console.warn(`Stream inaktiv für ${CONFIG.STREAM_TIMEOUT_MS / 1000}s, bisher ${tokenCount} Tokens empfangen`);
                
                // Je nach Anzahl der empfangenen Tokens unterschiedliche Fehlerbehandlung
                if (tokenCount === 0) {
                    // Keine Tokens empfangen - schwerwiegender Fehler
                    const errorMsg = 'Stream-Timeout: Keine Daten empfangen';
                    
                    errorHandler.handleError(new Error(errorMsg), {
                        category: ErrorCategory.NETWORK,
                        severity: ErrorSeverity.ERROR,
                        handlerOptions: {
                            showUser: true,
                            context: {
                                sessionId: currentSessionId.value,
                                elapsedTime: Date.now() - streamStartTime
                            }
                        }
                    });
                    
                    // Füge Fehlermeldung zur letzten Antwort hinzu
                    addErrorToLastMessage(ErrorMessages.TIMEOUT);
                } else {
                    // Einige Tokens wurden empfangen - weniger schwerwiegend
                    const warningMsg = `Stream-Timeout nach ${tokenCount} empfangenen Tokens`;
                    
                    errorHandler.handleError(new Error(warningMsg), {
                        category: ErrorCategory.NETWORK,
                        severity: ErrorSeverity.WARNING,
                        handlerOptions: {
                            showUser: false,
                            showNotification: true,
                            context: {
                                sessionId: currentSessionId.value,
                                tokenCount,
                                elapsedTime: Date.now() - streamStartTime
                            }
                        }
                    });
                    
                    // Füge Warnhinweis zur letzten Antwort hinzu
                    addWarningToLastMessage(ErrorMessages.PARTIAL_RESPONSE);
                }
                
                // Stream bereinigen
                cleanupStream();
            }
        }, CONFIG.STREAM_TIMEOUT_MS);
    };
    
    /**
     * Fügt eine Fehlermeldung zur letzten Assistentennachricht hinzu
     * @param {string} errorMessage - Die hinzuzufügende Fehlermeldung
     */
    const addErrorToLastMessage = (errorMessage) => {
        const assistantIndex = messages.value.length - 1;
        
        if (assistantIndex >= 0 && !messages.value[assistantIndex].is_user) {
            // Wenn die Nachricht leer ist, setze sie auf die Fehlermeldung
            if (!messages.value[assistantIndex].message.trim()) {
                messages.value[assistantIndex].message = errorMessage;
            }
            // Sonst hänge die Fehlermeldung an
            else {
                const currentMessage = messages.value[assistantIndex].message;
                
                // Prüfen, ob die Fehlermeldung bereits enthalten ist
                if (!currentMessage.includes(errorMessage)) {
                    messages.value[assistantIndex].message = `${currentMessage}\n\n**Fehler:** ${errorMessage}`;
                }
            }
            
            // Zum Ende scrollen
            nextTick().then(() => scrollToBottom());
        }
    };
    
    /**
     * Fügt einen Warnhinweis zur letzten Assistentennachricht hinzu
     * @param {string} warningMessage - Der hinzuzufügende Warnhinweis
     */
    const addWarningToLastMessage = (warningMessage) => {
        const assistantIndex = messages.value.length - 1;
        
        if (assistantIndex >= 0 && !messages.value[assistantIndex].is_user) {
            const currentMessage = messages.value[assistantIndex].message;
            
            // Prüfen, ob der Warnhinweis bereits enthalten ist
            if (!currentMessage.includes(warningMessage)) {
                messages.value[assistantIndex].message = `${currentMessage}\n\n**Hinweis:** ${warningMessage}`;
            }
            
            // Zum Ende scrollen
            nextTick().then(() => scrollToBottom());
        }
    };
    
    /**
     * Event-Handler für das 'done' Event
     * @param {Event} event - Das empfangene Event
     */
    const doneEventHandler = async (event) => {
        console.log("DONE Event empfangen, Stream beendet");
        
        // Prüfen, ob die Nachricht nicht leer ist
        const assistantIndex = messages.value.length - 1;
        if (assistantIndex >= 0 && !messages.value[assistantIndex].message.trim()) {
            messages.value[assistantIndex].message = ErrorMessages.EMPTY_RESPONSE;
        }
        
        // Wenn wir eine message_id empfangen haben, setze sie in der aktuellen Nachricht
        if (currentMessageId !== null && assistantIndex >= 0) {
            console.log(`Setze message_id ${currentMessageId} in Nachricht an Index ${assistantIndex}`);
            messages.value[assistantIndex].id = currentMessageId;
            messages.value[assistantIndex].session_id = currentSessionId.value;
        } else if (assistantIndex >= 0) {
            // Wenn keine ID vorhanden, setze einen temporären Wert
            const tempId = Date.now();
            console.log(`Keine message_id vorhanden, setze temporäre ID: ${tempId}`);
            messages.value[assistantIndex].id = tempId;
            messages.value[assistantIndex].session_id = currentSessionId.value;
        }
        
        // Session-Liste sofort aktualisieren, um den generierten Titel anzuzeigen
        try {
            if (loadSessions && typeof loadSessions === 'function') {
                console.log("Lade Sitzungen nach Stream-Ende...");
                await loadSessions();
            }
            
            // Titel aktualisieren, wenn der Titel noch "Neue Unterhaltung" ist
            const currentSession = (window.app?.$data?.sessions || []).find(
                s => s.id === currentSessionId.value
            );
            
            if (currentSession && currentSession.title === "Neue Unterhaltung") {
                console.log("Sitzungstitel ist noch 'Neue Unterhaltung', versuche zu aktualisieren...");
                
                if (window.updateSessionTitle && typeof window.updateSessionTitle === 'function') {
                    try {
                        await window.updateSessionTitle(currentSessionId.value);
                        console.log("Sitzungstitel aktualisiert nach Streaming-Ende");
                        
                        // Lade die Sitzungsliste neu
                        if (loadSessions && typeof loadSessions === 'function') {
                            await loadSessions();
                        }
                    } catch (e) {
                        console.error("Fehler bei der Titelaktualisierung nach Streaming:", e);
                        
                        // Fehler protokollieren, aber nicht anzeigen
                        errorHandler.handleError(e, {
                            category: ErrorCategory.APP,
                            severity: ErrorSeverity.WARNING,
                            handlerOptions: {
                                showUser: false,
                                showNotification: false
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Fehler beim Laden der aktualisierten Sitzungen:", error);
            
            // Fehler protokollieren, aber nicht anzeigen
            errorHandler.handleError(error, {
                category: ErrorCategory.API,
                severity: ErrorSeverity.WARNING,
                handlerOptions: {
                    showUser: false,
                    showNotification: false,
                    context: {
                        action: 'loadSessions',
                        message: 'Fehler beim Laden der aktualisierten Sitzungen nach Stream-Ende'
                    }
                }
            });
        }
        
        // Stream bereinigen
        cleanupStream();
    };
    
    /**
     * Event-Handler für das 'open' Event
     * @param {Event} event - Das empfangene Event
     */
    const openEventHandler = (event) => {
        console.log("EventSource-Verbindung erfolgreich geöffnet");
        
        // Startzeit setzen
        streamStartTime = Date.now();
        lastTokenTime = streamStartTime;
        
        // Health-Check für den Stream starten
        startStreamHealthCheck();
    };
    
    /**
     * Event-Handler für das 'error' Event
     * @param {Event} event - Das empfangene Event
     */
    const errorEventHandler = (event) => {
        console.error("EventSource-Fehler:", event);
        
        // Fehler je nach Anzahl der empfangenen Tokens behandeln
        if (tokenCount === 0) {
            // Keine Tokens empfangen - Verbindungsfehler
            errorHandler.handleEventSourceError(event, {
                showUser: true,
                context: {
                    sessionId: currentSessionId.value,
                    question: question.value,
                    elapsedTime: Date.now() - streamStartTime
                }
            });
            
            // Fehlermeldung zur letzten Nachricht hinzufügen
            addErrorToLastMessage(ErrorMessages.NETWORK);
        } else {
            // Einige Tokens empfangen - Verbindung unterbrochen
            errorHandler.handleEventSourceError(event, {
                showUser: false,
                showNotification: true,
                context: {
                    sessionId: currentSessionId.value,
                    tokenCount,
                    elapsedTime: Date.now() - streamStartTime
                }
            });
            
            // Warnhinweis zur letzten Nachricht hinzufügen
            addWarningToLastMessage(ErrorMessages.STREAM_ERROR);
            
            // Falls noch Wiederholungsversuche übrig sind, versuchen, den Stream wiederherzustellen
            if (currentStreamRetryCount < CONFIG.MAX_STREAM_RETRIES) {
                // Hinweis zur Wiederverbindung anzeigen
                addWarningToLastMessage(ErrorMessages.STREAM_INTERRUPT);
                
                // Self-Healing für Stream-Wiederherstellung starten
                selfHealing.heal({
                    strategy: HealingStrategy.RETRY,
                    maxAttempts: CONFIG.MAX_STREAM_RETRIES - currentStreamRetryCount,
                    delayBetweenAttempts: CONFIG.RETRY_DELAY_MS,
                    showIndicator: true,
                    context: {
                        type: 'stream_reconnect',
                        sessionId: currentSessionId.value,
                        question: question.value,
                        key: `stream_reconnect_${currentSessionId.value}`
                    },
                    onSuccess: () => {
                        // Erfolgsmeldung anzeigen
                        addWarningToLastMessage(ErrorMessages.STREAM_RECONNECT);
                    }
                });
                
                return;
            }
        }
        
        // Stream bereinigen
        cleanupStream();
    };
    
    /**
     * Startet eine regelmäßige Überprüfung der Stream-Gesundheit
     */
    const startStreamHealthCheck = () => {
        // Gesundheitscheck alle 10 Sekunden
        const healthCheckInterval = setInterval(() => {
            // Nur prüfen, wenn der Stream aktiv ist
            if (isStreaming.value && eventSource.value) {
                // Aktuelle Zeit
                const now = Date.now();
                
                // Zeit seit dem letzten Token
                const timeSinceLastToken = now - lastTokenTime;
                
                // Prüfen, ob der Stream inaktiv ist (längere Zeit keine Tokens)
                if (timeSinceLastToken > CONFIG.STREAM_HEALTH_CHECK_MS) {
                    console.warn(`Stream-Gesundheitscheck: Kein Token seit ${Math.round(timeSinceLastToken / 1000)}s`);
                    
                    // Wenn der Stream bereits länger inaktiv ist, aber noch nicht das Timeout erreicht hat,
                    // zeige eine Warnung an
                    if (timeSinceLastToken > CONFIG.STREAM_HEALTH_CHECK_MS * 2 && 
                        timeSinceLastToken < CONFIG.STREAM_TIMEOUT_MS) {
                        
                        // Warnhinweis protokollieren
                        errorHandler.handleError(
                            new Error(`Stream ist seit ${Math.round(timeSinceLastToken / 1000)}s inaktiv`),
                            {
                                category: ErrorCategory.NETWORK,
                                severity: ErrorSeverity.WARNING,
                                handlerOptions: {
                                    showUser: false,
                                    showNotification: false
                                }
                            }
                        );
                    }
                }
            } else {
                // Stream nicht mehr aktiv, Intervall löschen
                clearInterval(healthCheckInterval);
            }
        }, CONFIG.STREAM_HEALTH_CHECK_MS);
    };
    
    /**
     * Sendet eine Frage mit Streaming-Antwort
     */
    const sendQuestionStream = async () => {
        // Validierung
        if (!question.value.trim()) {
            errorHandler.handleError(
                new Error('Keine Frage eingegeben'),
                {
                    category: ErrorCategory.APP,
                    severity: ErrorSeverity.INFO,
                    handlerOptions: {
                        showUser: false,
                        showNotification: false
                    }
                }
            );
            return;
        }
        
        if (!currentSessionId.value) {
            errorHandler.handleError(
                new Error('Keine Session ausgewählt'),
                {
                    category: ErrorCategory.APP,
                    severity: ErrorSeverity.WARNING,
                    handlerOptions: {
                        showUser: true,
                        context: {
                            action: 'sendQuestionStream',
                            message: 'Bitte wählen Sie eine Session aus oder erstellen Sie eine neue Session.'
                        }
                    }
                }
            );
            return;
        }
        
        // Prüfen, ob offline
        if (!navigator.onLine) {
            // Frage in Offline-Warteschlange stellen
            enqueueOfflineQuestion(question.value);
            
            // Benutzer benachrichtigen
            errorHandler.handleError(
                new Error('Offline-Modus: Frage wird gespeichert und gesendet, sobald die Verbindung wiederhergestellt ist.'),
                {
                    category: ErrorCategory.NETWORK,
                    severity: ErrorSeverity.INFO,
                    handlerOptions: {
                        showUser: true,
                        showNotification: true
                    }
                }
            );
            
            // Eingabefeld leeren
            question.value = '';
            
            return;
        }
        
        // MOTD ausblenden, wenn eine Frage gestellt wird
        if (motdDismissed) {
            motdDismissed.value = true;
        }
        
        try {
            console.log(`Sende Frage: "${question.value}"`);
            isLoading.value = true;
            isStreaming.value = true;
            
            // message_id zurücksetzen
            currentMessageId = null;
            
            // Benutzernachricht sofort hinzufügen
            messages.value.push({
                is_user: true,
                message: question.value,
                timestamp: Date.now() / 1000
            });
            
            // Platz für Assistentennachricht reservieren
            const assistantIndex = messages.value.length;
            messages.value.push({
                is_user: false,
                message: '',
                timestamp: Date.now() / 1000,
                session_id: currentSessionId.value
            });
            
            await nextTick();
            scrollToBottom();
            
            // URL erstellen
            const url = new URL('/api/question/stream', window.location.origin);
            url.searchParams.append('question', question.value);
            url.searchParams.append('session_id', currentSessionId.value);
            
            // Einfache Sprache aktivieren, falls konfiguriert
            const useSimpleLanguage = window.useSimpleLanguage === true;
            if (useSimpleLanguage) {
                url.searchParams.append('simple_language', 'true');
                console.log("Einfache Sprache aktiviert für diese Anfrage");
            }
            
            // Token zur Authentifizierung hinzufügen
            const authToken = token.value.replace(/^Bearer\\s+/i, '');
            url.searchParams.append('auth_token', authToken);
            
            console.log(`Streaming URL: ${url.toString()}`);
            
            // Bestehende EventSource schließen
            if (eventSource.value) {
                console.log("Schließe bestehende EventSource");
                cleanupStream();
            }
            
            // Vor dem Starten des neuen Streams kurz warten
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // EventSource über apiClient erstellen
            eventSource.value = apiClient.createEventSource(url.toString(), null, {
                showErrors: true,
                context: {
                    sessionId: currentSessionId.value,
                    question: question.value
                }
            });
            
            // Zähler und Status zurücksetzen
            tokenCount = 0;
            currentStreamRetryCount = 0;
            completeResponse = "";
            streamStartTime = Date.now();
            lastTokenTime = streamStartTime;
            
            // Event-Handler hinzufügen
            eventSource.value.onmessage = handleStreamMessage;
            eventSource.value.addEventListener('done', doneEventHandler);
            eventSource.value.addEventListener('open', openEventHandler);
            eventSource.value.addEventListener('error', errorEventHandler);
            
            // Timeout für inaktive Streams
            resetStreamTimeout();
            
            // Eingabefeld leeren
            question.value = '';
        } catch (error) {
            console.error('Fehler beim Streaming:', error);
            
            // Fehler behandeln
            errorHandler.handleError(error, {
                category: ErrorCategory.APP,
                severity: ErrorSeverity.ERROR,
                handlerOptions: {
                    showUser: true,
                    context: {
                        action: 'sendQuestionStream',
                        sessionId: currentSessionId.value,
                        question: question.value
                    }
                }
            });
            
            // Status zurücksetzen
            isLoading.value = false;
            isStreaming.value = false;
            
            // Fehlermeldung zur Chat-Liste hinzufügen
            if (messages.value.length > 0 && messages.value[messages.value.length - 1].is_user) {
                messages.value.push({
                    is_user: false,
                    message: ErrorMessages.GENERAL,
                    timestamp: Date.now() / 1000
                });
                
                await nextTick();
                scrollToBottom();
            }
        }
    };
    
    /**
     * Verarbeitet eine Nachricht aus dem Stream
     * @param {MessageEvent} event - Das empfangene Message-Event
     */
    const handleStreamMessage = (event) => {
        try {
            console.log(`Rohes Event erhalten: ${event.data}`);
            
            // Zeit des letzten Tokens aktualisieren
            lastTokenTime = Date.now();
            
            // Timeout zurücksetzen
            resetStreamTimeout();
            
            // Leere Events ignorieren
            if (!event.data || event.data.trim() === '') {
                console.log("Leeres Datenevent ignorieren");
                return;
            }
            
            // Prüfen, ob es sich um ein 'done'-Event handelt
            if (event.data.includes('event: done')) {
                console.log("'done'-Event erkannt, verarbeite es wie ein Standard-done-Event");
                doneEventHandler(event);
                return;
            }
            
            // Spezielle Event-Flags prüfen
            if (handleSpecialEventFlags(event.data)) {
                return;
            }
            
            // Versuche, JSON zu parsen
            try {
                // JSON-Teil extrahieren
                let jsonData = event.data;
                if (jsonData.startsWith('data: ')) {
                    jsonData = jsonData.substring(6);
                }
                
                const data = JSON.parse(jsonData);
                
                // Prüfen, ob das Event eine message_id enthält
                if ('message_id' in data) {
                    console.log(`Message-ID vom Server empfangen: ${data.message_id}`);
                    currentMessageId = data.message_id;
                    
                    // ID direkt in der aktuellen Nachricht speichern
                    const assistantIndex = messages.value.length - 1;
                    if (assistantIndex >= 0 && !messages.value[assistantIndex].is_user) {
                        messages.value[assistantIndex].id = currentMessageId;
                        messages.value[assistantIndex].session_id = currentSessionId.value;
                    }
                    
                    return;
                }
                
                // Normales Token verarbeiten
                if ('response' in data) {
                    processToken(data.response);
                } else if (data.error) {
                    // Fehlermeldung verarbeiten
                    handleStreamError(data.error);
                }
            } catch (jsonError) {
                console.warn("Konnte Event-Daten nicht als JSON parsen, behandle als Rohtext:", event.data);
                
                // Versuche, den Rohtext als Token zu verwenden
                if (event.data && event.data.trim()) {
                    processToken(event.data);
                }
            }
        } catch (error) {
            console.error("Allgemeiner Fehler bei der Event-Verarbeitung:", error);
            
            // Fehler protokollieren, aber nicht anzeigen
            errorHandler.handleError(error, {
                category: ErrorCategory.APP,
                severity: ErrorSeverity.WARNING,
                handlerOptions: {
                    showUser: false,
                    showNotification: false,
                    context: {
                        action: 'handleStreamMessage',
                        eventData: event.data
                    }
                }
            });
        }
    };
    
    /**
     * Verarbeitet ein Stream-Token
     * @param {string} token - Das zu verarbeitende Token
     */
    const processToken = (token) => {
        // Token-Zähler erhöhen
        tokenCount++;
        
        // Für Debugging
        console.log(`Token #${tokenCount}: "${token}"`);
        
        // Token zur vollständigen Antwort hinzufügen
        completeResponse += token;
        
        // Nachricht aktualisieren
        const assistantIndex = messages.value.length - 1;
        if (assistantIndex >= 0 && !messages.value[assistantIndex].is_user) {
            messages.value[assistantIndex].message = completeResponse;
            
            // Zum Ende scrollen, aber nicht bei jedem Token (Leistungsoptimierung)
            if (tokenCount % 5 === 0 || token.includes('\n')) {
                nextTick().then(() => scrollToBottom());
            }
        }
        
        // Regelmäßige Prüfung der Antwortqualität
        if (tokenCount === CONFIG.PARTIAL_TOKEN_THRESHOLD || tokenCount % 50 === 0) {
            checkResponseQuality();
        }
    };
    
    /**
     * Behandelt spezielle Event-Flags im Stream
     * @param {string} eventData - Die Event-Daten
     * @returns {boolean} - Ob ein spezielles Flag behandelt wurde
     */
    const handleSpecialEventFlags = (eventData) => {
        // Stream-Retry-Flag
        if (eventData === '[STREAM_RETRY]') {
            console.log("Stream wird neu gestartet...");
            currentStreamRetryCount++;
            
            // Hinweis in der Nachricht anzeigen
            const assistantIndex = messages.value.length - 1;
            if (assistantIndex >= 0 && !messages.value[assistantIndex].is_user) {
                const retryMessage = `\n\n*Verbindung wird wiederhergestellt... Versuch ${currentStreamRetryCount}*\n\n`;
                
                // Nur hinzufügen, wenn diese Meldung noch nicht enthalten ist
                if (!messages.value[assistantIndex].message.includes(retryMessage)) {
                    messages.value[assistantIndex].message += retryMessage;
                    nextTick().then(() => scrollToBottom());
                }
            }
            
            return true;
        }
        
        // Timeout-Flag
        if (eventData === '[TIMEOUT]') {
            console.log("Timeout beim Stream.");
            addWarningToLastMessage(ErrorMessages.TIMEOUT);
            return true;
        }
        
        // Verschiedene Fehlermeldungen
        if (eventData.startsWith('[FINAL_TIMEOUT]') || 
            eventData.startsWith('[CONN_ERROR]') || 
            eventData.startsWith('[ERROR]') || 
            eventData.startsWith('[UNEXPECTED_ERROR]') || 
            eventData.startsWith('[NO_TOKENS]')) {
            
            console.error("Stream-Fehler:", eventData);
            
            // Fehlermeldung behandeln
            handleStreamError(eventData);
            
            return true;
        }
        
        // Kein spezielles Flag erkannt
        return false;
    };
    
    /**
     * Behandelt einen Fehler im Stream
     * @param {string} errorMessage - Die Fehlermeldung
     */
    const handleStreamError = (errorMessage) => {
        // Assistentennachricht finden
        const assistantIndex = messages.value.length - 1;
        
        // Fehler basierend auf Nachrichteninhalt behandeln
        if (assistantIndex >= 0 && !messages.value[assistantIndex].is_user) {
            // Wenn die Nachricht bereits Inhalt hat, nur eine Warnung anhängen
            if (messages.value[assistantIndex].message.trim()) {
                addWarningToLastMessage(ErrorMessages.PARTIAL_RESPONSE);
            } else {
                // Sonst Fehlermeldung anzeigen
                messages.value[assistantIndex].message = ErrorMessages.GENERAL;
            }
            
            nextTick().then(() => scrollToBottom());
        }
        
        // Fehler protokollieren
        errorHandler.handleError(
            new Error(errorMessage),
            {
                category: ErrorCategory.API,
                severity: ErrorSeverity.ERROR,
                handlerOptions: {
                    showUser: false,
                    showNotification: true,
                    context: {
                        action: 'streamError',
                        sessionId: currentSessionId.value,
                        tokenCount,
                        elapsedTime: Date.now() - streamStartTime
                    }
                }
            }
        );
        
        // Stream bereinigen
        cleanupStream();
    };
    
    /**
     * Prüft die Qualität der empfangenen Antwort
     */
    const checkResponseQuality = () => {
        // Keine Prüfung, wenn nicht im Streaming-Modus
        if (!isStreaming.value) {
            return;
        }
        
        // Aktuelles Timing
        const currentTime = Date.now();
        const elapsedTime = currentTime - streamStartTime;
        
        // Wenn wir bereits länger als 10 Sekunden streamen, aber weniger als 10 Tokens erhalten haben,
        // könnte etwas nicht stimmen
        if (elapsedTime > 10000 && tokenCount < 10) {
            console.warn(`Niedrige Antwortqualität: ${tokenCount} Tokens in ${Math.round(elapsedTime / 1000)}s`);
            
            // Warnung protokollieren
            errorHandler.handleError(
                new Error(`Langsame Stream-Antwort: ${tokenCount} Tokens in ${Math.round(elapsedTime / 1000)}s`),
                {
                    category: ErrorCategory.NETWORK,
                    severity: ErrorSeverity.WARNING,
                    handlerOptions: {
                        showUser: false,
                        showNotification: false
                    }
                }
            );
        }
    };
    
    /**
     * Stellt eine Frage in die Offline-Warteschlange
     * @param {string} questionText - Die zu stellende Frage
     */
    const enqueueOfflineQuestion = (questionText) => {
        // Offline-Warteschlange aus localStorage laden
        let offlineQueue = [];
        const storedQueue = localStorage.getItem('offlineQuestions');
        
        if (storedQueue) {
            try {
                offlineQueue = JSON.parse(storedQueue);
            } catch (error) {
                console.error("Fehler beim Parsen der Offline-Warteschlange:", error);
                offlineQueue = [];
            }
        }
        
        // Neue Frage hinzufügen
        offlineQueue.push({
            question: questionText,
            sessionId: currentSessionId.value,
            timestamp: Date.now()
        });
        
        // Warteschlange auf maximale Größe begrenzen
        if (offlineQueue.length > CONFIG.MAX_OFFLINE_QUEUE_SIZE) {
            offlineQueue = offlineQueue.slice(-CONFIG.MAX_OFFLINE_QUEUE_SIZE);
        }
        
        // Aktualisierte Warteschlange speichern
        localStorage.setItem('offlineQuestions', JSON.stringify(offlineQueue));
        
        // Benutzernachricht zur Liste hinzufügen
        messages.value.push({
            is_user: true,
            message: questionText,
            timestamp: Date.now() / 1000,
            offline: true
        });
        
        // Platzhalternachricht hinzufügen
        messages.value.push({
            is_user: false,
            message: '*Diese Frage wird gesendet, sobald die Verbindung wiederhergestellt ist.*',
            timestamp: Date.now() / 1000,
            offline: true
        });
        
        nextTick().then(() => scrollToBottom());
    };
    
    /**
     * Verarbeitet die Offline-Warteschlange nach Wiederherstellung der Verbindung
     */
    const processOfflineQueue = async () => {
        // Offline-Warteschlange aus localStorage laden
        const storedQueue = localStorage.getItem('offlineQuestions');
        if (!storedQueue) {
            return;
        }
        
        try {
            const offlineQueue = JSON.parse(storedQueue);
            
            // Wenn Warteschlange leer, nichts tun
            if (offlineQueue.length === 0) {
                return;
            }
            
            // Benutzer benachrichtigen
            errorHandler.handleError(
                new Error(`Verarbeite ${offlineQueue.length} Offline-Fragen`),
                {
                    category: ErrorCategory.NETWORK,
                    severity: ErrorSeverity.INFO,
                    handlerOptions: {
                        showUser: true,
                        showNotification: true
                    }
                }
            );
            
            // Warteschlange verarbeiten
            for (const item of offlineQueue) {
                // Zur entsprechenden Session wechseln
                if (currentSessionId.value !== item.sessionId) {
                    await loadSession(item.sessionId);
                }
                
                // Frage stellen
                question.value = item.question;
                await sendQuestionStream();
                
                // Kurz warten, um API-Limits zu vermeiden
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Warteschlange leeren
            localStorage.removeItem('offlineQuestions');
        } catch (error) {
            console.error("Fehler bei der Verarbeitung der Offline-Warteschlange:", error);
            
            // Fehler protokollieren
            errorHandler.handleError(error, {
                category: ErrorCategory.APP,
                severity: ErrorSeverity.ERROR,
                handlerOptions: {
                    showUser: true,
                    showNotification: true,
                    context: {
                        action: 'processOfflineQueue'
                    }
                }
            });
        }
    };
    
    /**
     * Sendet eine Frage ohne Streaming (Fallback)
     */
    const sendQuestion = async () => {
        // Validierung
        if (!question.value.trim()) {
            return;
        }
        
        if (!currentSessionId.value) {
            errorHandler.handleError(
                new Error('Keine Session ausgewählt'),
                {
                    category: ErrorCategory.APP,
                    severity: ErrorSeverity.WARNING,
                    handlerOptions: {
                        showUser: true,
                        context: {
                            action: 'sendQuestion',
                            message: 'Bitte wählen Sie eine Session aus oder erstellen Sie eine neue Session.'
                        }
                    }
                }
            );
            return;
        }
        
        // Prüfen, ob offline
        if (!navigator.onLine) {
            // Frage in Offline-Warteschlange stellen
            enqueueOfflineQuestion(question.value);
            
            // Benutzer benachrichtigen
            errorHandler.handleError(
                new Error('Offline-Modus: Frage wird gespeichert und gesendet, sobald die Verbindung wiederhergestellt ist.'),
                {
                    category: ErrorCategory.NETWORK,
                    severity: ErrorSeverity.INFO,
                    handlerOptions: {
                        showUser: true,
                        showNotification: true
                    }
                }
            );
            
            // Eingabefeld leeren
            question.value = '';
            
            return;
        }
        
        try {
            isLoading.value = true;
            
            // MOTD ausblenden, wenn eine Frage gestellt wird
            if (motdDismissed) {
                motdDismissed.value = true;
            }
            
            // Benutzernachricht sofort hinzufügen
            messages.value.push({
                is_user: true,
                message: question.value,
                timestamp: Date.now() / 1000
            });
            
            await nextTick();
            scrollToBottom();
            
            // API-Anfrage mit dem verbesserten API-Client
            const response = await apiClient.post('/api/question', {
                question: question.value,
                session_id: currentSessionId.value
            }, {
                timeout: 60000, // Längeres Timeout für Antworten ohne Streaming
                retry: true,
                maxRetries: 2,
                retryDelay: 1000,
                headers: window.useSimpleLanguage ? { 'X-Use-Simple-Language': 'true' } : {},
                showErrors: true,
                errorMessage: 'Fehler beim Senden der Frage'
            });
            
            // Assistentennachricht hinzufügen
            const assistantMessage = {
                id: response.message_id,
                is_user: false,
                message: response.answer,
                timestamp: Date.now() / 1000,
                session_id: currentSessionId.value
            };
            
            messages.value.push(assistantMessage);
            
            // Session-Liste aktualisieren
            try {
                if (loadSessions && typeof loadSessions === 'function') {
                    console.log("Lade Sitzungen nach Antwort...");
                    await loadSessions();
                }
            } catch (error) {
                console.error("Fehler beim Laden der aktualisierten Sitzungen:", error);
                
                // Fehler protokollieren, aber nicht anzeigen
                errorHandler.handleError(error, {
                    category: ErrorCategory.API,
                    severity: ErrorSeverity.WARNING,
                    handlerOptions: {
                        showUser: false,
                        showNotification: false,
                        context: {
                            action: 'loadSessions',
                            message: 'Fehler beim Laden der aktualisierten Sitzungen nach Antwort'
                        }
                    }
                });
            }
            
            // Eingabe leeren
            question.value = '';
            
            await nextTick();
            scrollToBottom();
        } catch (error) {
            console.error('Fehler beim Senden der Frage:', error);
            
            // Fehler wird bereits vom API-Client behandelt
            
            // Fehlermeldung zur Chat-Liste hinzufügen
            messages.value.push({
                is_user: false,
                message: ErrorMessages.GENERAL,
                timestamp: Date.now() / 1000
            });
            
            await nextTick();
            scrollToBottom();
        } finally {
            isLoading.value = false;
        }
    };
    
    // Online/Offline-Event-Listener einrichten
    window.addEventListener('online', async () => {
        console.log("Verbindung wiederhergestellt, verarbeite Offline-Warteschlange...");
        await processOfflineQueue();
    });
    
    // Variablen initialisieren
    let connectionCheckInterval;
    
    // Funktion zur regelmäßigen Überprüfung der Verbindung
    const startConnectionCheck = () => {
        // Vorhandenes Intervall löschen
        if (connectionCheckInterval) {
            clearInterval(connectionCheckInterval);
        }
        
        // Neues Intervall erstellen
        connectionCheckInterval = setInterval(() => {
            // Prüfen, ob online
            if (navigator.onLine) {
                // Falls online, nichts tun
                return;
            }
            
            // Falls offline und derzeit Streaming läuft, Benutzer informieren
            if (isStreaming.value) {
                errorHandler.handleError(
                    new Error('Verbindung verloren während des Streamings.'),
                    {
                        category: ErrorCategory.NETWORK,
                        severity: ErrorSeverity.WARNING,
                        handlerOptions: {
                            showUser: true,
                            showNotification: true
                        }
                    }
                );
                
                // Stream bereinigen
                cleanupStream();
                
                // Warnhinweis zur letzten Nachricht hinzufügen
                addWarningToLastMessage(ErrorMessages.NETWORK);
            }
        }, 5000); // Alle 5 Sekunden prüfen
    };
    
    // Verbindungsüberwachung starten
    startConnectionCheck();
    
    /**
     * Verbesserte Anzeige von Nachrichtenaktionen (Feedback-Buttons, Quellenbuttons) 
     * nach Abschluss des Streaming-Vorgangs
     */
    const enhanceMessageActions = () => {
        // Füge eine globale CSS-Klasse hinzu/entferne sie, je nachdem ob ein Stream läuft
        const updateStreamingClass = () => {
            if (isStreaming.value) {
                document.body.classList.add('is-streaming');
            } else {
                document.body.classList.remove('is-streaming');
                
                // Wenn das Streaming beendet ist, zeige die Aktionen mit Animation an
                setTimeout(() => {
                    const messageActionsElements = document.querySelectorAll('.message-actions');
                    messageActionsElements.forEach(element => {
                        element.style.opacity = '1';
                    });
                }, 500);
            }
        };
        
        // Initial setzen
        updateStreamingClass();
        
        // Beobachte die isStreaming-Variable 
        if (typeof Vue !== 'undefined' && Vue.watch) {
            Vue.watch(() => isStreaming.value, updateStreamingClass);
        } else {
            // Fallback, falls Vue.watch nicht verfügbar ist
            setInterval(() => {
                updateStreamingClass();
            }, 500);
        }
    };
    
    // Führe die Verbesserung der Nachrichtenaktionen aus
    enhanceMessageActions();
    
    // API und Funktionen zurückgeben
    return {
        sendQuestionStream,
        sendQuestion,
        cleanupStream,
        processOfflineQueue
    };
}

// Nach dem Laden der Seite die Funktionen ausführen
document.addEventListener('DOMContentLoaded', () => {
    // Starte mit kurzer Verzögerung, um sicherzustellen, dass alle Skripte geladen sind
    setTimeout(() => {
        // Prüfe, ob das Vue-App-Objekt existiert
        if (window.app) {
            // Hole die Optionen aus der app
            const options = {
                token: window.app.$data.token,
                messages: window.app.$data.messages,
                question: window.app.$data.question,
                currentSessionId: window.app.$data.currentSessionId,
                isLoading: window.app.$data.isLoading,
                isStreaming: window.app.$data.isStreaming,
                eventSource: window.app.$data.eventSource,
                scrollToBottom: window.app.scrollToBottom,
                nextTick: Vue.nextTick,
                loadSessions: window.app.loadSessions,
                motdDismissed: window.app.$data.motdDismissed
            };
            
            // Erweiterte Chat-Funktionalität initialisieren
            const enhancedChat = setupEnhancedChat(options);
            
            // Originale Funktionen sichern
            const originalSendQuestion = window.app.sendQuestion;
            const originalSendQuestionStream = window.app.sendQuestionStream;
            const originalCleanupStream = window.app.cleanupStream;
            
            // Verbesserte Funktionen global verfügbar machen
            window.app.sendQuestion = async function() {
                return enhancedChat.sendQuestion();
            };
            
            window.app.sendQuestionStream = async function() {
                return enhancedChat.sendQuestionStream();
            };
            
            window.app.cleanupStream = function() {
                return enhancedChat.cleanupStream();
            };
            
            // Offline-Warteschlange beim Start verarbeiten
            setTimeout(() => {
                if (navigator.onLine) {
                    enhancedChat.processOfflineQueue();
                }
            }, 2000);
            
            console.log("Erweiterte Chat-Funktionalität mit verbesserter Fehlerbehandlung aktiviert");
        }
    }, 800);
});