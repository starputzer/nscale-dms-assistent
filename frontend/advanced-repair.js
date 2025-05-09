/**
 * Erweitertes Reparatur-Skript für fehlende Interaktivität im nscale DMS Assistent
 * 
 * Dieses Skript ist eine erweiterte Version der repair-interaction.js und behebt
 * spezifisch Probleme mit der Vue-Integration und Event-Delegation im Hauptindex.
 */

(function() {
  console.log('Erweitertes Reparatur-Skript wird ausgeführt...');
  
  // Globalen Zustand für interaktive Elemente initialisieren
  window._repairState = {
    mountSuccess: false,
    vueInitialized: false,
    eventHandlersAttached: false,
    repairAttempts: 0,
    maxRepairAttempts: 10,
    debugMode: true
  };
  
  // Debug-Helper für die Konsole und DOM
  function debugLog(message, data) {
    if (window._repairState.debugMode) {
      console.log(`[RepairDebug] ${message}`, data || '');
      
      // Füge Debug-Informationen als DOM-Element hinzu
      const debugContainer = document.querySelector('#repair-debug') || createDebugContainer();
      const debugEntry = document.createElement('div');
      debugEntry.className = 'debug-entry';
      debugEntry.innerHTML = `<span class="debug-time">${new Date().toLocaleTimeString()}</span> <span class="debug-msg">${message}</span>`;
      debugContainer.appendChild(debugEntry);
      
      // Nur die letzten 20 Nachrichten behalten
      const entries = debugContainer.querySelectorAll('.debug-entry');
      if (entries.length > 20) {
        debugContainer.removeChild(entries[0]);
      }
    }
  }
  
  // Erstellt einen Debug-Container, der im DOM angezeigt wird
  function createDebugContainer() {
    const container = document.createElement('div');
    container.id = 'repair-debug';
    container.style.cssText = 'position: fixed; bottom: 10px; right: 10px; width: 400px; max-height: 300px; overflow-y: auto; background: rgba(0,0,0,0.7); color: #0f0; font-family: monospace; padding: 10px; border-radius: 4px; z-index: 9999; font-size: 12px; display: none;';
    
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px solid #0f0; padding-bottom: 5px;';
    header.innerHTML = '<span>nScale-Fix Debug-Log</span><button id="repair-debug-toggle" style="background: none; border: none; color: #0f0; cursor: pointer;">Ausblenden</button>';
    container.appendChild(header);
    
    document.body.appendChild(container);
    
    // Event Listener für Toggle-Button
    document.getElementById('repair-debug-toggle').addEventListener('click', function() {
      const display = container.style.display;
      container.style.display = display === 'none' ? 'block' : 'none';
      this.textContent = display === 'none' ? 'Ausblenden' : 'Einblenden';
    });
    
    return container;
  }
  
  // Füge Debug-Tastenkombination hinzu (Alt+D)
  document.addEventListener('keydown', function(e) {
    if (e.altKey && e.key === 'd') {
      const debugContainer = document.querySelector('#repair-debug');
      if (debugContainer) {
        debugContainer.style.display = debugContainer.style.display === 'none' ? 'block' : 'none';
      }
    }
  });
  
  // Event-Liste für bequemen Zugriff
  const EVENT_TYPES = {
    SETTINGS: 'settings',
    ADMIN: 'admin',
    CHAT: 'chat',
    SESSION: 'session',
    AUTH: 'auth'
  };
  
  // Warten, bis das DOM vollständig geladen ist
  document.addEventListener('DOMContentLoaded', function() {
    debugLog('DOM vollständig geladen');
    setTimeout(initRepair, 300);
  });
  
  // Für den Fall, dass das DOM bereits geladen ist
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    debugLog('DOM bereits geladen, initialisiere in 300ms');
    setTimeout(initRepair, 300);
  }
  
  // Hauptinitialisierung der Reparatur
  function initRepair() {
    debugLog('Reparatur wird initialisiert');
    
    // Repariere Vue-Initialisierung
    repairVueInit();
    
    // Hauptreparaturschleife starten
    runMainRepairLoop();
    
    // Eventmonitor einrichten
    setupEventMonitor();
  }
  
  // Hauptreparaturschleife
  function runMainRepairLoop() {
    // Stellen Sie sicher, dass alle wesentlichen Reparaturen durchgeführt werden
    fixVueMount();
    repairEventHandlers();
    
    // Weitere Reparaturen hinzufügen
    repairVueComponents();
    repairLegacyComponents();
    
    // Überwachung fortsetzen
    window._repairState.repairAttempts++;
    
    if (window._repairState.repairAttempts < window._repairState.maxRepairAttempts) {
      debugLog(`Reparatur-Versuch ${window._repairState.repairAttempts} von ${window._repairState.maxRepairAttempts}`);
      setTimeout(runMainRepairLoop, 1000);
    } else {
      debugLog('Maximale Anzahl an Reparaturversuchen erreicht');
      
      // Einen letzten Versuch durchführen, falls bestimmte Elemente noch nicht funktionieren
      finalRepairAttempt();
    }
  }
  
  // Repariere Vue-Initialisierung
  function repairVueInit() {
    debugLog('Prüfe Vue-Initialisierung...');
    
    // Überprüfen, ob Vue existiert
    if (typeof Vue === 'undefined') {
      debugLog('Vue nicht gefunden, versuche neu zu laden');
      
      // Vue nachladen
      const vueScript = document.createElement('script');
      vueScript.src = 'https://cdn.jsdelivr.net/npm/vue@3.2.47/dist/vue.global.prod.js';
      vueScript.onload = function() {
        debugLog('Vue wurde nachgeladen');
        
        // VueDemi nachladen
        const vueDemiScript = document.createElement('script');
        vueDemiScript.src = 'https://cdn.jsdelivr.net/npm/vue-demi@0.13.11/lib/index.iife.js';
        vueDemiScript.onload = function() {
          debugLog('VueDemi wurde nachgeladen');
          
          // Pinia nachladen
          const piniaScript = document.createElement('script');
          piniaScript.src = 'https://cdn.jsdelivr.net/npm/pinia@2.0.33/dist/pinia.iife.js';
          document.head.appendChild(piniaScript);
        };
        document.head.appendChild(vueDemiScript);
      };
      document.head.appendChild(vueScript);
    } else {
      debugLog('Vue ist verfügbar', Vue.version);
      window._repairState.vueInitialized = true;
    }
  }
  
  // Repariere Vue Mount
  function fixVueMount() {
    if (window._repairState.mountSuccess) {
      return;
    }
    
    debugLog('Repariere Vue-Mount-Punkt...');
    
    // Stelle sicher, dass der Mountpunkt vorhanden ist
    const mountPoint = document.getElementById('vue-dms-app');
    if (!mountPoint) {
      debugLog('Mountpunkt nicht gefunden, erstelle neu');
      const appContainer = document.getElementById('app');
      if (appContainer) {
        const newMountPoint = document.createElement('div');
        newMountPoint.id = 'vue-dms-app';
        
        // Füge vor dem ersten Kind ein
        if (appContainer.firstChild) {
          appContainer.insertBefore(newMountPoint, appContainer.firstChild);
        } else {
          appContainer.appendChild(newMountPoint);
        }
        
        debugLog('Neuer Mountpunkt erstellt');
      }
    } else {
      debugLog('Mountpunkt gefunden');
      window._repairState.mountSuccess = true;
    }
  }
  
  // Repariere Event-Handler
  function repairEventHandlers() {
    debugLog('Repariere Event-Handler...');
    
    // Einstellungsbutton reparieren
    fixSettingsButton();
    
    // Admin-Tabs reparieren
    fixAdminTabs();
    
    // Chat reparieren
    fixChatInteraction();
    
    // Fokussierung reparieren
    fixFocusIssues();
    
    window._repairState.eventHandlersAttached = true;
    debugLog('Event-Handler repariert');
  }
  
  // Repariere Vue-Komponenten (SFCs)
  function repairVueComponents() {
    debugLog('Prüfe Vue-Komponenten...');
    
    // Stelle sicher, dass die Bridge richtig initialisiert ist
    if (window.nscale && window.nscale.events && typeof window.nscale.events.emit === 'function') {
      // Löse erneut das Bridge-Ready-Event aus
      window.nscale.events.emit('bridge-ready', { version: '1.0', forced: true });
      debugLog('Bridge-Ready-Event erneut ausgelöst');
      
      // Feature-Toggles überprüfen
      if (window.nscale.featureToggles) {
        const toggles = window.nscale.featureToggles;
        debugLog('Feature-Toggles geprüft', toggles);
        
        // Erzwinge Neuinitialisierung der SFC-Komponenten
        if (toggles.useSfcAdmin) {
          window.nscale.events.emit('admin-component-reset', {});
        }
      }
    } else {
      debugLog('Bridge nicht initialisiert, verwende Fallback');
      
      // Fallback: Bridge manuell initialisieren
      window.nscale = window.nscale || {};
      window.nscale.events = window.nscale.events || {
        on: function(event, callback) {
          window.addEventListener(`nscale:${event}`, function(e) {
            callback(e.detail);
          });
        },
        emit: function(event, data) {
          const customEvent = new CustomEvent(`nscale:${event}`, { detail: data });
          window.dispatchEvent(customEvent);
        }
      };
      
      // Standard-Feature-Toggles setzen
      window.nscale.featureToggles = window.nscale.featureToggles || {
        useSfcAdmin: true,
        useSfcDocConverter: false,
        useSfcChat: false,
        useSfcSettings: false,
        usePiniaAuth: true,
        usePiniaUI: true
      };
      
      debugLog('Bridge-Fallback initialisiert');
    }
  }
  
  // Repariere Legacy-Komponenten
  function repairLegacyComponents() {
    debugLog('Repariere Legacy-Komponenten...');
    
    // Überprüfe globale app-Variable
    if (window.app) {
      debugLog('Legacy-App gefunden');
      
      // Versuche, die App neu zu rendern
      if (typeof window.app.$forceUpdate === 'function') {
        window.app.$forceUpdate();
        debugLog('Forciertes Update der Legacy-App');
      }
    } else {
      debugLog('Legacy-App nicht gefunden');
    }
  }
  
  // Event-Überwachung einrichten
  function setupEventMonitor() {
    debugLog('Einrichtung der Event-Überwachung...');
    
    // Überwache wichtige DOM-Mutationen
    const observer = new MutationObserver(function(mutations) {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Prüfe auf neue interaktive Elemente
          setTimeout(repairEventHandlers, 100);
          break;
        }
      }
    });
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
    
    debugLog('Event-Überwachung eingerichtet');
  }
  
  // Einstellungsbutton-Probleme beheben
  function fixSettingsButton() {
    debugLog('Repariere Einstellungsbutton...');
    
    // Bessere Selektion für Settings-Button
    const settingsButtons = document.querySelectorAll('button[class*="settings"], button i.fa-cog, button i.fa-gear, header button:nth-child(1)');
    
    if (settingsButtons.length > 0) {
      debugLog(`${settingsButtons.length} Einstellungsbuttons gefunden`);
      
      settingsButtons.forEach(button => {
        // Button oder parent, wenn es ein Icon ist
        const targetButton = button.tagName === 'I' ? button.closest('button') : button;
        
        if (targetButton && !targetButton._repairHandled) {
          // Originalen Klick-Handler entfernen
          targetButton.removeEventListener('click', buttonClickHandler);
          
          // Neuen Klick-Handler hinzufügen
          targetButton.addEventListener('click', buttonClickHandler);
          
          // Markiere als behandelt
          targetButton._repairHandled = true;
          debugLog('Einstellungsbutton repariert', targetButton);
        }
      });
    } else {
      debugLog('Keine Einstellungsbuttons gefunden');
    }
    
    // Einstellungs-Button-Klick-Handler
    function buttonClickHandler(event) {
      event.preventDefault();
      event.stopPropagation();
      
      debugLog('Einstellungsbutton geklickt');
      
      // Versuche verschiedene Methoden, um die Einstellungen zu öffnen
      if (typeof window.toggleSettings === 'function') {
        window.toggleSettings();
      } else if (window.app && typeof window.app.toggleSettings === 'function') {
        window.app.toggleSettings();
      } else if (window.nscale && window.nscale.events) {
        // Verwende Event-System
        window.nscale.events.emit('toggle-settings', {});
      } else {
        // Fallback über DOM
        const settingsPanel = document.querySelector('.settings-dialog, .settings-dialog-overlay, .settings-panel');
        if (settingsPanel) {
          if (settingsPanel.style.display === 'none' || !settingsPanel.style.display) {
            settingsPanel.style.display = 'flex';
          } else {
            settingsPanel.style.display = 'none';
          }
          debugLog('Einstellungsbereich via DOM umgeschaltet');
        } else {
          debugLog('Einstellungsbereich nicht gefunden');
        }
      }
    }
  }
  
  // Admin-Tabs reparieren
  function fixAdminTabs() {
    debugLog('Repariere Admin-Tabs...');
    
    // Bessere Selektion für Admin-Tabs
    const adminTabButtons = document.querySelectorAll('.admin-tab-button, button[class*="admin"]');
    
    if (adminTabButtons.length > 0) {
      debugLog(`${adminTabButtons.length} Admin-Tab-Buttons gefunden`);
      
      adminTabButtons.forEach(button => {
        if (!button._repairHandled) {
          // Originalen Klick-Handler entfernen
          button.removeEventListener('click', adminTabClickHandler);
          
          // Neuen Klick-Handler hinzufügen
          button.addEventListener('click', adminTabClickHandler);
          
          // Markiere als behandelt
          button._repairHandled = true;
          debugLog('Admin-Tab-Button repariert', button);
        }
      });
    } else {
      debugLog('Keine Admin-Tab-Buttons gefunden');
    }
    
    // Admin-Tab-Klick-Handler
    function adminTabClickHandler(event) {
      event.preventDefault();
      event.stopPropagation();
      
      // Tab-ID aus dem Button-Text oder Attribut extrahieren
      const tabId = this.textContent.trim().toLowerCase() || 
                    this.getAttribute('data-tab') || 
                    (this.querySelector('span') ? this.querySelector('span').textContent.trim().toLowerCase() : null);
      
      debugLog(`Admin-Tab geklickt: ${tabId}`);
      
      // Versuche verschiedene Methoden, um die Tabs zu wechseln
      if (window.nscale && window.nscale.events) {
        // Verwende Event-System
        window.nscale.events.emit('admin-tab-change', { tab: tabId });
      }
      
      // Direkter DOM-Ansatz als Fallback
      const allTabs = document.querySelectorAll('.admin-tab-content, [class*="admin-tab"]');
      const targetTab = [...allTabs].find(tab => 
        tab.getAttribute('data-tab') === tabId || 
        tab.id === `tab-${tabId}` || 
        tab.className.includes(tabId)
      );
      
      if (targetTab) {
        // Alle Tabs ausblenden
        allTabs.forEach(tab => {
          tab.style.display = 'none';
        });
        
        // Zieltab einblenden
        targetTab.style.display = 'block';
        
        // Active-Klasse für Buttons aktualisieren
        adminTabButtons.forEach(btn => {
          btn.classList.remove('active');
        });
        this.classList.add('active');
        
        debugLog(`Tab ${tabId} aktiviert`);
      } else {
        debugLog(`Tab ${tabId} wurde nicht gefunden`);
      }
    }
  }
  
  // Chat-Interaktivität reparieren
  function fixChatInteraction() {
    debugLog('Repariere Chat-Interaktion...');
    
    // Chat-Elemente finden - präzisere Selektoren
    const chatForm = document.querySelector('form, .chat-form');
    const chatInput = document.querySelector('input[type="text"], textarea, .chat-input');
    const sendButton = document.querySelector('button[type="submit"], .send-button');
    
    if (chatForm && chatInput) {
      debugLog('Chat-Formular gefunden');
      
      if (!chatForm._repairHandled) {
        // Originalen Event-Listener entfernen
        chatForm.removeEventListener('submit', chatSubmitHandler);
        
        // Neuen Event-Listener hinzufügen
        chatForm.addEventListener('submit', chatSubmitHandler);
        
        // Markiere als behandelt
        chatForm._repairHandled = true;
        debugLog('Chat-Formular repariert');
      }
    } else {
      debugLog('Chat-Formular nicht gefunden');
    }
    
    // Chat-Submit-Handler
    function chatSubmitHandler(event) {
      event.preventDefault();
      
      // Wert aus dem Input holen (jQuery-unabhängig)
      const message = chatInput.value.trim();
      if (!message) return;
      
      debugLog(`Chat-Nachricht wird gesendet: ${message}`);
      
      // Verschiedene Methoden zum Senden versuchen
      if (typeof window.sendMessage === 'function') {
        window.sendMessage(message);
      } else if (window.app && typeof window.app.sendMessage === 'function') {
        window.app.sendMessage(message);
      } else if (window.nscale && window.nscale.events) {
        // Verwende Event-System
        window.nscale.events.emit('send-message', { text: message });
      } else {
        // Fallback: Füge Nachricht manuell zum DOM hinzu
        addMessageToChat(message, true);
      }
      
      // Input zurücksetzen
      chatInput.value = '';
      
      // Fokus zurücksetzen
      setTimeout(() => chatInput.focus(), 100);
    }
    
    // Hilfsfunktion, um Nachrichten manuell zum Chat hinzuzufügen
    function addMessageToChat(text, isUser = true) {
      debugLog(`Füge Nachricht zum Chat hinzu: ${text.substring(0, 30)}...`);
      
      const messagesContainer = document.querySelector('.message-container, .messages, [class*="message-list"]');
      if (!messagesContainer) {
        debugLog('Chat-Container nicht gefunden');
        return;
      }
      
      // Erstelle HTML für die Nachricht
      const messageDiv = document.createElement('div');
      messageDiv.className = isUser ? 'user-message-content' : 'assistant-message-content';
      
      // Erstellung der Nachricht entsprechend dem bestehenden Format
      const messageContent = `
        <div class="message-header">
          <div class="message-icon">
            <i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i>
          </div>
          <div class="message-info">
            <span class="message-sender">${isUser ? 'Sie' : 'Assistent'}</span>
            <span class="message-time">${new Date().toLocaleString()}</span>
          </div>
        </div>
        <div class="message-text">${text}</div>
      `;
      
      messageDiv.innerHTML = messageContent;
      messagesContainer.appendChild(messageDiv);
      
      // Scrolle nach unten
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }
  
  // Fokussierungsprobleme beheben
  function fixFocusIssues() {
    debugLog('Repariere Fokussierungsprobleme...');
    
    // Finde wichtige fokussierbare Elemente
    const focusableElements = document.querySelectorAll('button, input, textarea, select, a[href]');
    
    focusableElements.forEach(element => {
      if (!element._focusRepaired) {
        // Entferne potenzielle Transparenz-Probleme
        if (element.style.opacity === '0' || parseFloat(window.getComputedStyle(element).opacity) === 0) {
          debugLog(`Korrigiere unsichtbares Element: ${element.tagName}`);
          element.style.opacity = '1';
        }
        
        // Entferne potenzielle Pointer-Events-Probleme
        if (window.getComputedStyle(element).pointerEvents === 'none') {
          debugLog(`Korrigiere Element mit pointer-events:none: ${element.tagName}`);
          element.style.pointerEvents = 'auto';
        }
        
        element._focusRepaired = true;
      }
    });
  }
  
  // Letzter Reparaturversuch
  function finalRepairAttempt() {
    debugLog('Führe abschließenden Reparaturversuch durch...');
    
    // Versuche, die Vue-Instanz zurückzusetzen
    if (window.app) {
      try {
        // Auf Legacy-Vue prüfen
        if (typeof window.app.$destroy === 'function') {
          debugLog('Zerstöre alte Vue-Instanz');
          window.app.$destroy();
        }
      } catch (e) {
        debugLog('Fehler beim Zurücksetzen der Vue-Instanz', e.message);
      }
    }
    
    // Stelle sicher, dass das Feature-Toggle für Admin korrekt gesetzt ist
    if (window.nscale && window.nscale.featureToggles) {
      window.nscale.featureToggles.useSfcAdmin = true;
      localStorage.setItem('featureToggles', JSON.stringify(window.nscale.featureToggles));
      debugLog('Feature-Toggle für Admin aktualisiert');
    }
    
    // Stelle sicher, dass der Bridge-Ready-Event ausgelöst wird
    if (window.nscale && window.nscale.events) {
      window.nscale.events.emit('bridge-ready', { version: '1.0', force: true });
      debugLog('Bridge-Ready-Event final ausgelöst');
    }
    
    // Event-Delegation einrichten
    setupGlobalEventDelegation();
    
    debugLog('Abschließender Reparaturversuch abgeschlossen');
  }
  
  // Globales Event-Delegation-System einrichten
  function setupGlobalEventDelegation() {
    debugLog('Richte globales Event-Delegation ein...');
    
    // Höre auf Klick-Events auf der gesamten Seite
    document.body.addEventListener('click', function(event) {
      const target = event.target;
      
      // Einstellungsbutton-Prüfung über Delegation
      if (
        target.classList.contains('fa-cog') || 
        target.classList.contains('fa-gear') ||
        target.closest('button[class*="settings"]')
      ) {
        event.preventDefault();
        debugLog('Settings-Button über Delegation erkannt');
        
        // Öffne Einstellungen
        const settingsPanel = document.querySelector('.settings-dialog, .settings-dialog-overlay, .settings-panel');
        if (settingsPanel) {
          settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
          debugLog('Einstellungsbereich über Delegation umgeschaltet');
        }
      }
      
      // Admin-Tab-Prüfung über Delegation
      if (target.classList.contains('admin-tab-button') || target.closest('.admin-tab-button')) {
        const button = target.classList.contains('admin-tab-button') ? target : target.closest('.admin-tab-button');
        const tabId = button.textContent.trim().toLowerCase() || 
                      button.getAttribute('data-tab') || 
                      (button.querySelector('span') ? button.querySelector('span').textContent.trim().toLowerCase() : null);
        
        if (tabId) {
          debugLog(`Admin-Tab über Delegation erkannt: ${tabId}`);
          
          // Tabs umschalten
          const allTabs = document.querySelectorAll('.admin-tab-content, [class*="admin-tab"]');
          allTabs.forEach(tab => {
            tab.style.display = 'none';
          });
          
          const targetTab = document.querySelector(`.admin-tab-content[data-tab="${tabId}"], [class*="admin-tab"][data-tab="${tabId}"]`);
          if (targetTab) {
            targetTab.style.display = 'block';
            debugLog(`Tab ${tabId} über Delegation aktiviert`);
          }
        }
      }
    });
    
    // Formular-Delegation
    document.body.addEventListener('submit', function(event) {
      const form = event.target;
      
      // Chat-Formular-Prüfung
      if (form.querySelector('input[type="text"]') || form.querySelector('textarea')) {
        const input = form.querySelector('input[type="text"]') || form.querySelector('textarea');
        
        if (input) {
          event.preventDefault();
          const message = input.value.trim();
          
          if (message) {
            debugLog(`Nachricht über Delegation gesendet: ${message}`);
            
            // Füge Nachricht zum DOM hinzu
            const messagesContainer = document.querySelector('.message-container, .messages, [class*="message-list"]');
            if (messagesContainer) {
              const messageDiv = document.createElement('div');
              messageDiv.className = 'user-message-content';
              messageDiv.innerHTML = `
                <div class="message-header">
                  <div class="message-icon">
                    <i class="fas fa-user"></i>
                  </div>
                  <div class="message-info">
                    <span class="message-sender">Sie</span>
                    <span class="message-time">${new Date().toLocaleString()}</span>
                  </div>
                </div>
                <div class="message-text">${message}</div>
              `;
              messagesContainer.appendChild(messageDiv);
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            
            // Input zurücksetzen
            input.value = '';
          }
        }
      }
    });
    
    debugLog('Globales Event-Delegation eingerichtet');
  }
  
  // Aktiviere Debug-Modus initial
  setTimeout(() => {
    const debugContainer = document.querySelector('#repair-debug');
    if (debugContainer) {
      debugContainer.style.display = 'block';
    }
  }, 1000);
  
  debugLog('Erweitertes Reparatur-Skript wurde vollständig geladen');
})();