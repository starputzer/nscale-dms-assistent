/**
 * Batch-Request Debug Script
 * Kopieren Sie diesen Code in die Browser-Konsole, um die Batch-Anfragen zu analysieren
 */

(function() {
  // Debug-Funktionen
  const originalFetch = window.fetch;
  let debugMode = true;
  
  // Fetch überschreiben
  window.fetch = async function(url, options) {
    // Nur Batch-Anfragen abfangen
    if (typeof url === 'string' && (url.includes('/api/batch') || url.includes('/api/v1/batch'))) {
      console.group('🔍 Batch Request Debug');
      console.log('URL:', url);
      
      try {
        // Request-Body analysieren
        if (options && options.body) {
          const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
          console.log('Request Payload:', body);
          
          // Headers überprüfen
          console.log('Headers:', options.headers);
          
          if (!options.headers || !options.headers.Authorization) {
            console.warn('⚠️ Authorization Header fehlt!');
          }
        }
        
        // Original-Anfrage ausführen
        const response = await originalFetch(url, options);
        
        // Klon erstellen, um den Response-Body zu lesen (wird sonst verbraucht)
        const clonedResponse = response.clone();
        
        try {
          // Response parsen
          const responseBody = await clonedResponse.json();
          console.log('Response Status:', response.status);
          console.log('Response Body:', responseBody);
          
          if (!response.ok) {
            console.error('❌ Request fehlgeschlagen:', response.status, response.statusText);
          }
          
          // Tiefere Analyse der Response
          if (responseBody && responseBody.data && responseBody.data.responses) {
            const failedResponses = responseBody.data.responses.filter(r => !r.success);
            
            if (failedResponses.length > 0) {
              console.error('❌ Fehlerhafte Teilanfragen:', failedResponses.length);
              failedResponses.forEach((resp, idx) => {
                console.error(`Fehler #${idx+1}:`, resp.error || 'Unbekannter Fehler', resp);
              });
            }
          }
        } catch (parseError) {
          console.error('Fehler beim Parsen der Response:', parseError);
        }
        
        console.groupEnd();
        return response;
      } catch (error) {
        console.error('❌ Fetch Error:', error);
        console.groupEnd();
        throw error;
      }
    }
    
    // Alle anderen Anfragen normal durchführen
    return originalFetch(url, options);
  };
  
  // Session-Store-Debugging
  function debugSessionStore() {
    try {
      // Versuche auf das Pinia-Store zu zugreifen
      if (window.__pinia && window.__pinia.state.value.sessions) {
        const sessionsState = window.__pinia.state.value.sessions;
        
        console.group('📊 Sessions Store Status');
        console.log('Sessions:', sessionsState.sessions);
        console.log('Current Session ID:', sessionsState.currentSessionId);
        
        // Prüfe, ob eine aktuelle Session existiert
        if (sessionsState.currentSessionId) {
          const currentSession = sessionsState.sessions.find(s => s.id === sessionsState.currentSessionId);
          console.log('Current Session:', currentSession);
          
          const messagesForCurrentSession = sessionsState.messages[sessionsState.currentSessionId];
          console.log('Messages for current session:', messagesForCurrentSession);
          
          if (!messagesForCurrentSession || messagesForCurrentSession.length === 0) {
            console.warn('⚠️ Keine Nachrichten für die aktuelle Session gefunden!');
          }
        } else {
          console.warn('⚠️ Keine aktuelle Session ausgewählt!');
        }
        
        console.log('Streaming Status:', sessionsState.streaming);
        console.log('Error State:', sessionsState.error);
        console.groupEnd();
      } else {
        console.warn('Sessions-Store nicht gefunden. Stellen Sie sicher, dass Pinia initialisiert wurde.');
      }
    } catch (error) {
      console.error('Fehler beim Zugriff auf den Sessions-Store:', error);
    }
  }
  
  // Auth-Store-Debugging
  function debugAuthStore() {
    try {
      if (window.__pinia && window.__pinia.state.value.auth) {
        const authState = window.__pinia.state.value.auth;
        
        console.group('🔐 Auth Store Status');
        console.log('Authenticated:', authState.isAuthenticated);
        console.log('Token vorhanden:', !!authState.token);
        if (authState.token) {
          const tokenParts = authState.token.split('.');
          if (tokenParts.length === 3) {
            try {
              const payload = JSON.parse(atob(tokenParts[1]));
              console.log('Token Payload:', payload);
              
              // Token-Ablauf überprüfen
              if (payload.exp) {
                const expiryDate = new Date(payload.exp * 1000);
                const now = new Date();
                console.log('Token gültig bis:', expiryDate);
                console.log('Token abgelaufen:', expiryDate < now);
              }
            } catch (e) {
              console.log('Token konnte nicht dekodiert werden');
            }
          }
        }
        console.log('User:', authState.user);
        console.groupEnd();
      } else {
        console.warn('Auth-Store nicht gefunden. Stellen Sie sicher, dass Pinia initialisiert wurde.');
      }
    } catch (error) {
      console.error('Fehler beim Zugriff auf den Auth-Store:', error);
    }
  }

  // Batch API Debugging-Funktion
  function testBatchAPI() {
    console.group('🔄 Batch API Test');
    
    // Token aus dem Store holen (falls verfügbar)
    let token = '';
    try {
      if (window.__pinia && window.__pinia.state.value.auth) {
        token = window.__pinia.state.value.auth.token;
      }
    } catch (e) {
      console.warn('Konnte Token nicht aus Store laden');
    }
    
    if (!token) {
      // Alternative Token-Quellen probieren
      token = localStorage.getItem('auth_token') || 
              localStorage.getItem('token') || 
              localStorage.getItem('authToken') || 
              '';
              
      if (!token) {
        console.error('Kein Auth-Token gefunden. Test kann nicht durchgeführt werden.');
        console.groupEnd();
        return;
      }
    }
    
    console.log('Verwende Token:', token.substring(0, 15) + '...');
    
    // Einfache Batch-Anfrage für Sessions
    const testBatchRequest = {
      requests: [
        {
          id: 'get_sessions',
          endpoint: '/api/sessions',
          method: 'GET'
        }
      ]
    };
    
    console.log('Sende Test-Batch-Anfrage...');
    
    fetch('/api/batch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testBatchRequest)
    })
    .then(response => response.json())
    .then(data => {
      console.log('Test-Batch-Antwort:', data);
      
      if (data.success) {
        console.log('✅ Batch API funktioniert grundsätzlich');
      } else {
        console.error('❌ Batch API funktioniert nicht korrekt');
      }
      
      console.groupEnd();
    })
    .catch(error => {
      console.error('❌ Fehler bei der Test-Batch-Anfrage:', error);
      console.groupEnd();
    });
  }
  
  // Patch für die fetchMessages-Funktion im Sessions-Store
  function patchSessionsStore() {
    try {
      // Prüfen, ob wir Zugriff auf das Pinia-Store haben
      if (!window.__pinia || !window.__pinia._s || !window.__pinia._s.get('sessions')) {
        console.warn('Sessions-Store nicht gefunden, kann nicht gepatcht werden');
        return false;
      }
      
      const sessionsStore = window.__pinia._s.get('sessions');
      
      if (!sessionsStore || typeof sessionsStore.fetchMessages !== 'function') {
        console.warn('fetchMessages-Funktion nicht gefunden, kann nicht gepatcht werden');
        return false;
      }
      
      // Original-Funktion sichern
      const originalFetchMessages = sessionsStore.fetchMessages;
      
      // Ersetzen mit verbesserter Version
      sessionsStore.fetchMessages = async function(sessionId) {
        console.log('🛠️ Patched fetchMessages ausgeführt für Session:', sessionId);
        
        if (!sessionId) {
          console.warn('Keine Session-ID angegeben');
          return [];
        }
        
        // Prüfen Sie die Auth-Status
        const authStore = window.__pinia._s.get('auth');
        if (!authStore || !authStore.isAuthenticated) {
          console.warn('Nicht authentifiziert, Nachrichten können nicht geladen werden');
          return [];
        }
        
        try {
          // Direkte API-Anfrage statt Batch
          const authHeaders = authStore.createAuthHeaders();
          
          if (!authHeaders || !authHeaders['Authorization']) {
            console.warn('Keine Auth-Header verfügbar, verwende Notfall-Lösung');
            authHeaders = { 'Authorization': `Bearer ${authStore.token}` };
          }
          
          console.log(`Direkte Anfrage für Nachrichten der Session ${sessionId}...`);
          
          const response = await fetch(`/api/sessions/${sessionId}/messages`, {
            method: 'GET',
            headers: authHeaders
          });
          
          if (!response.ok) {
            throw new Error(`API-Fehler: ${response.status} ${response.statusText}`);
          }
          
          const messages = await response.json();
          console.log(`✅ ${messages.length} Nachrichten geladen für Session ${sessionId}`);
          
          // Nachrichten im Store speichern
          sessionsStore.messages[sessionId] = messages;
          
          return messages;
        } catch (error) {
          console.error(`Fehler beim Laden der Nachrichten für Session ${sessionId}:`, error);
          
          // Fallback auf Original-Methode
          console.log('Versuche Fallback auf Original-Methode...');
          return originalFetchMessages.call(sessionsStore, sessionId);
        }
      };
      
      console.log('✅ Sessions Store wurde gepatcht');
      return true;
    } catch (error) {
      console.error('Fehler beim Patchen des Sessions Store:', error);
      return false;
    }
  }
  
  // Hauptfunktionen exportieren
  window.chatDebug = {
    testBatchAPI,
    debugSessionStore,
    debugAuthStore,
    patchSessionsStore,
    enableDebug: () => { debugMode = true; console.log('Debug-Modus aktiviert'); },
    disableDebug: () => { debugMode = false; console.log('Debug-Modus deaktiviert'); }
  };
  
  console.log(`
  ===========================================
  Chat-Debugging-Tools installiert!
  
  Verwenden Sie folgende Funktionen:
  
  chatDebug.testBatchAPI()      - Testet die Batch-API
  chatDebug.debugSessionStore() - Zeigt den Status des Session-Stores
  chatDebug.debugAuthStore()    - Zeigt den Status des Auth-Stores
  chatDebug.patchSessionsStore() - Patcht den Sessions-Store für direkte API-Anfragen
  
  chatDebug.enableDebug()  - Aktiviert Debug-Modus
  chatDebug.disableDebug() - Deaktiviert Debug-Modus
  ===========================================
  `);
})();