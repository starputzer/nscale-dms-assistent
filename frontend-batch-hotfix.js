/**
 * Frontend Hotfix für Batch-Anfragen und Session-Probleme
 * Dieses Skript als <script>-Tag in die index.html einfügen
 * oder in die Konsole kopieren
 */

(function() {
  // Warte, bis die App vollständig geladen ist
  function waitForApp() {
    if (window.__pinia && window.__pinia._s && window.__pinia._s.get('sessions')) {
      applyFixes();
    } else {
      console.log('Warte auf App-Initialisierung...');
      setTimeout(waitForApp, 500);
    }
  }
  
  // Alle Fixes anwenden
  function applyFixes() {
    console.log('Wende Frontend-Hotfixes an...');
    
    // Fix 1: Verbesserte Batch-Response-Verarbeitung
    patchBatchResponseProcessing();
    
    // Fix 2: Verbesserte Session-Message-Verarbeitung
    patchSessionMessageFetching();
    
    // Fix 3: Spezieller Fix für numerische vs. UUID Session-IDs
    patchSessionIdHandling();
    
    // Fix 4: Automatische Session-Erstellung falls nötig
    patchAutoSessionCreation();
    
    console.log('✅ Alle Fixes wurden angewendet');
  }
  
  // Fix 1: Verbesserte Batch-Response-Verarbeitung
  function patchBatchResponseProcessing() {
    try {
      const sessionsStore = window.__pinia._s.get('sessions');
      
      // Nur patchen, wenn die Originalfunktion existiert
      if (!sessionsStore.processBatchResponse && typeof sessionsStore.processBatchResponse !== 'function') {
        // Neue Funktion hinzufügen
        sessionsStore.processBatchResponse = function(response, source = 'unknown') {
          console.log(`[BatchFix] Verarbeite Batch-Response von: ${source}`);
          
          if (!response) {
            console.warn('[BatchFix] Leere Response erhalten');
            return { responses: [] };
          }
          
          let responses;
          
          try {
            // Verschiedene Antwortformate behandeln
            if (typeof response === 'string') {
              responses = JSON.parse(response);
            } else if (response.data) {
              // Manchmal ist die Antwort bereits in .data verpackt
              responses = response.data;
            } else {
              responses = response;
            }
            
            // Sicherstellen, dass responses.data.responses existiert
            if (responses.data && Array.isArray(responses.data.responses)) {
              return responses;
            } else if (Array.isArray(responses.responses)) {
              // Manchmal ist responses direkt ein Array
              return { data: { responses: responses.responses } };
            } else if (Array.isArray(responses)) {
              // Manchmal ist responses direkt ein Array
              return { data: { responses: responses } };
            } else {
              console.warn('[BatchFix] Unerwartetes Response-Format:', responses);
              return { data: { responses: [] } };
            }
          } catch (error) {
            console.error('[BatchFix] Fehler bei der Batch-Response-Verarbeitung:', error);
            return { data: { responses: [] } };
          }
        };
        
        console.log('✅ Batch-Response-Verarbeitung verbessert');
      }
    } catch (error) {
      console.error('Fehler beim Patch für Batch-Response-Verarbeitung:', error);
    }
  }
  
  // Fix 2: Verbesserte Session-Message-Verarbeitung
  function patchSessionMessageFetching() {
    try {
      const sessionsStore = window.__pinia._s.get('sessions');
      const originalFetchMessages = sessionsStore.fetchMessages;
      
      if (typeof originalFetchMessages === 'function') {
        sessionsStore.fetchMessages = async function(sessionId) {
          console.log(`[MessageFix] Lade Nachrichten für Session: ${sessionId}`);
          
          if (!sessionId) {
            console.warn('[MessageFix] Keine Session-ID angegeben');
            return [];
          }
          
          // Prüfen Sie Auth-Status
          const authStore = window.__pinia._s.get('auth');
          if (!authStore.isAuthenticated) {
            console.warn('[MessageFix] Nicht authentifiziert');
            return [];
          }
          
          try {
            // Prüfen, ob wir bereits Nachrichten im Cache haben
            if (sessionsStore.messages[sessionId] && sessionsStore.messages[sessionId].length > 0) {
              console.log(`[MessageFix] Verwende gecachte Nachrichten für Session ${sessionId}`);
              return sessionsStore.messages[sessionId];
            }
            
            // Direkte API-Anfrage statt Batch für mehr Stabilität
            const authHeaders = authStore.createAuthHeaders ? authStore.createAuthHeaders() : 
                                { 'Authorization': `Bearer ${authStore.token}` };
            
            console.log(`[MessageFix] Direkte API-Anfrage für Session ${sessionId}...`);
            sessionsStore.isLoading = true;
            
            const response = await fetch(`/api/sessions/${sessionId}/messages`, {
              method: 'GET',
              headers: authHeaders
            });
            
            if (!response.ok) {
              throw new Error(`API-Fehler: ${response.status} ${response.statusText}`);
            }
            
            const messages = await response.json();
            console.log(`[MessageFix] ${messages.length} Nachrichten geladen`);
            
            // Nachrichten validieren
            const validMessages = Array.isArray(messages) ? messages : [];
            
            // In den Store schreiben
            sessionsStore.messages = {
              ...sessionsStore.messages,
              [sessionId]: validMessages
            };
            
            sessionsStore.isLoading = false;
            return validMessages;
          } catch (error) {
            console.error(`[MessageFix] Fehler beim Laden der Nachrichten:`, error);
            sessionsStore.error = `Fehler beim Laden der Nachrichten: ${error.message}`;
            sessionsStore.isLoading = false;
            
            // Versuch, die Originalmethode als Fallback zu verwenden
            try {
              return await originalFetchMessages.call(sessionsStore, sessionId);
            } catch (fallbackError) {
              console.error('[MessageFix] Auch Fallback fehlgeschlagen:', fallbackError);
              return [];
            }
          }
        };
        
        console.log('✅ Session-Message-Verarbeitung verbessert');
      }
    } catch (error) {
      console.error('Fehler beim Patch für Session-Message-Verarbeitung:', error);
    }
  }
  
  // Fix 3: Spezieller Fix für numerische vs. UUID Session-IDs
  function patchSessionIdHandling() {
    try {
      const sessionsStore = window.__pinia._s.get('sessions');
      const originalSendMessage = sessionsStore.sendMessage;
      
      if (typeof originalSendMessage === 'function') {
        sessionsStore.sendMessage = async function(params) {
          console.log(`[SessionIdFix] Sende Nachricht für Session: ${params.sessionId}`);
          
          // Session-ID-Format prüfen und korrigieren
          let sessionId = params.sessionId;
          
          // Ist es eine UUID?
          const isUuid = typeof sessionId === 'string' && 
                         /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);
          
          // Ist es eine Zahl als String?
          const isNumericString = typeof sessionId === 'string' && /^\d+$/.test(sessionId);
          
          console.log(`[SessionIdFix] Session-ID-Typ: ${isUuid ? 'UUID' : (isNumericString ? 'Numerischer String' : 'Anderes Format')}`);
          
          if (isNumericString) {
            // Für numerische Session-IDs als Zahl senden
            params = {
              ...params,
              sessionId: parseInt(sessionId, 10)
            };
            console.log(`[SessionIdFix] Session-ID zu Zahl konvertiert: ${params.sessionId}`);
          }
          
          // Original-Methode mit korrigierten Parametern aufrufen
          return originalSendMessage.call(sessionsStore, params);
        };
        
        console.log('✅ Session-ID-Behandlung verbessert');
      }
    } catch (error) {
      console.error('Fehler beim Patch für Session-ID-Behandlung:', error);
    }
  }
  
  // Fix 4: Automatische Session-Erstellung falls nötig
  function patchAutoSessionCreation() {
    try {
      const sessionsStore = window.__pinia._s.get('sessions');
      const originalSetCurrentSession = sessionsStore.setCurrentSession;
      
      if (typeof originalSetCurrentSession === 'function') {
        sessionsStore.setCurrentSession = async function(sessionId) {
          console.log(`[AutoSessionFix] Wechsle zu Session: ${sessionId}`);
          
          // Wenn keine Session-ID angegeben ist oder keine Sessions vorhanden sind
          if (!sessionId) {
            console.log('[AutoSessionFix] Keine Session-ID angegeben');
            
            if (sessionsStore.sessions.length === 0) {
              console.log('[AutoSessionFix] Keine Sessions vorhanden, erstelle neue Session');
              try {
                const newSessionId = await sessionsStore.createSession('Neue Unterhaltung');
                console.log(`[AutoSessionFix] Neue Session erstellt: ${newSessionId}`);
                return originalSetCurrentSession.call(sessionsStore, newSessionId);
              } catch (error) {
                console.error('[AutoSessionFix] Fehler beim Erstellen einer neuen Session:', error);
              }
            } else {
              // Verwende die erste verfügbare Session
              const firstSessionId = sessionsStore.sessions[0].id;
              console.log(`[AutoSessionFix] Verwende erste verfügbare Session: ${firstSessionId}`);
              return originalSetCurrentSession.call(sessionsStore, firstSessionId);
            }
          }
          
          // Prüfen, ob die Session existiert
          const sessionExists = sessionsStore.sessions.some(s => s.id === sessionId);
          
          if (!sessionExists) {
            console.warn(`[AutoSessionFix] Session ${sessionId} existiert nicht!`);
            
            // Versuche, die Session neu zu laden
            try {
              await sessionsStore.synchronizeSessions();
              
              // Erneut prüfen
              const sessionExistsNow = sessionsStore.sessions.some(s => s.id === sessionId);
              
              if (!sessionExistsNow) {
                console.warn(`[AutoSessionFix] Session ${sessionId} existiert auch nach Sync nicht`);
                
                if (sessionsStore.sessions.length > 0) {
                  // Verwende die erste verfügbare Session
                  const firstSessionId = sessionsStore.sessions[0].id;
                  console.log(`[AutoSessionFix] Fallback auf erste Session: ${firstSessionId}`);
                  return originalSetCurrentSession.call(sessionsStore, firstSessionId);
                } else {
                  // Erstelle eine neue Session als letzten Ausweg
                  console.log('[AutoSessionFix] Erstelle Notfall-Session');
                  const newSessionId = await sessionsStore.createSession('Neue Unterhaltung');
                  return originalSetCurrentSession.call(sessionsStore, newSessionId);
                }
              }
            } catch (error) {
              console.error('[AutoSessionFix] Fehler beim Synchronisieren:', error);
            }
          }
          
          // Original-Methode aufrufen
          return originalSetCurrentSession.call(sessionsStore, sessionId);
        };
        
        console.log('✅ Automatische Session-Erstellung implementiert');
      }
    } catch (error) {
      console.error('Fehler beim Patch für Auto-Session-Erstellung:', error);
    }
  }
  
  // Starte den Fix-Prozess
  console.log('Frontend Batch-Hotfix wird initialisiert...');
  waitForApp();
  
  // Funktion zur manuellen Ausführung
  window.applyFrontendFixes = function() {
    waitForApp();
    return 'Frontend-Fixes werden angewendet...';
  };
})();