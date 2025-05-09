/**
 * Reparatur-Skript für fehlende Interaktivität im nscale DMS Assistent
 * 
 * Dieses Skript behebt Probleme mit Event-Handleren, die oft nach Updates verloren gehen.
 * Es wird nach dem Laden der Seite ausgeführt und stellt sicher, dass alle Klick-Handler 
 * wieder korrekt funktionieren.
 */

(function() {
  console.log('Repair-Interaction-Skript wird ausgeführt...');
  
  // Warten, bis das DOM vollständig geladen ist
  document.addEventListener('DOMContentLoaded', function() {
    // Warte kurz, um sicherzustellen, dass Vue alle Komponenten initialisiert hat
    setTimeout(repairInteractions, 500);
  });
  
  // Event-Handler direkt auf dem Window-Objekt, falls das DOM bereits geladen ist
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(repairInteractions, 500);
  }
  
  // Hauptfunktion zur Reparatur der interaktiven Elemente
  function repairInteractions() {
    console.log('Interaktionen werden repariert...');
    
    // Einstellungsbutton reparieren
    fixSettingsButton();
    
    // Admin-Views reparieren
    fixAdminTabs();
    
    // Chat-Input reparieren
    fixChatInteraction();
    
    // Event-Handler-Monitor einrichten
    monitorEventHandlers();
    
    console.log('Interaktionen wurden repariert');
  }
  
  // Einstellungsbutton-Probleme beheben
  function fixSettingsButton() {
    console.log('Repariere Einstellungsbutton...');
    
    // Finde alle Einstellungs-Buttons
    const settingsButtons = document.querySelectorAll('button[class*="settings"], button i.fa-cog, button i.fa-gear');
    
    // Füge Event-Listener direkt hinzu
    settingsButtons.forEach(button => {
      // Entferne alte Event-Listener (wenn möglich)
      button.replaceWith(button.cloneNode(true));
      
      // Hole den neuen Button
      const newButton = (button.tagName === 'I') 
        ? document.querySelector('button i.fa-cog, button i.fa-gear').parentElement
        : document.querySelector('button[class*="settings"]');
      
      if (newButton) {
        // Direkter Event-Listener
        newButton.addEventListener('click', function(event) {
          event.stopPropagation();
          console.log('Einstellungen-Button wurde geklickt');
          
          // Suche nach einer toggleSettings-Funktion im globalen Scope
          if (typeof window.toggleSettings === 'function') {
            window.toggleSettings();
          } else if (window.app && typeof window.app.toggleSettings === 'function') {
            window.app.toggleSettings();
          } else {
            // Fallback: Versuche, das Settings-Modal direkt über DOM zu finden und zu öffnen
            const settingsPanel = document.querySelector('.settings-dialog, .settings-panel');
            if (settingsPanel) {
              settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
            }
          }
        });
        
        console.log('Einstellungsbutton-Handler wiederhergestellt');
      }
    });
  }
  
  // Admin-Tabs reparieren
  function fixAdminTabs() {
    console.log('Repariere Admin-Tabs...');
    
    // Finde alle Admin-Tab-Buttons
    const adminTabButtons = document.querySelectorAll('.admin-tab-button, button[class*="admin"]');
    
    adminTabButtons.forEach(button => {
      // Entferne alte Event-Listener
      button.replaceWith(button.cloneNode(true));
      
      // Hole den neuen Button
      const tabId = button.textContent.trim().toLowerCase() || 
                    button.getAttribute('data-tab') || 
                    (button.querySelector('span') ? button.querySelector('span').textContent.trim().toLowerCase() : null);
      
      const newButton = document.querySelector(`.admin-tab-button:contains("${tabId}"), button[class*="admin"]:contains("${tabId}")`);
      
      if (newButton) {
        newButton.addEventListener('click', function(event) {
          event.stopPropagation();
          
          // Tab-ID aus dem Button-Text oder Attribut extrahieren
          const tabId = this.textContent.trim().toLowerCase() || 
                        this.getAttribute('data-tab') || 
                        (this.querySelector('span') ? this.querySelector('span').textContent.trim().toLowerCase() : null);
          
          console.log(`Admin-Tab geklickt: ${tabId}`);
          
          // Alle Tabs ausblenden
          const tabContents = document.querySelectorAll('.admin-tab-content, [class*="admin-tab"]');
          tabContents.forEach(tab => {
            tab.style.display = 'none';
          });
          
          // Zieltab einblenden
          const targetTab = document.querySelector(`.admin-tab-content[data-tab="${tabId}"], [class*="admin-tab"][data-tab="${tabId}"]`);
          if (targetTab) {
            targetTab.style.display = 'block';
          }
          
          // Active-Klasse für Buttons aktualisieren
          adminTabButtons.forEach(btn => {
            btn.classList.remove('active');
          });
          this.classList.add('active');
        });
      }
    });
  }
  
  // Chat-Interaktivität reparieren
  function fixChatInteraction() {
    console.log('Repariere Chat-Interaktion...');
    
    // Chat-Eingabeformular finden
    const chatForm = document.querySelector('form');
    const chatInput = document.querySelector('input[type="text"], textarea');
    const sendButton = document.querySelector('button[type="submit"]');
    
    if (chatForm && chatInput && sendButton) {
      // Alte Event-Listener entfernen
      chatForm.replaceWith(chatForm.cloneNode(true));
      
      // Neues Formular holen
      const newForm = document.querySelector('form');
      const newInput = document.querySelector('input[type="text"], textarea');
      
      // Neuen Event-Listener hinzufügen
      newForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const message = newInput.value.trim();
        if (!message) return;
        
        console.log('Nachricht wird gesendet:', message);
        
        // Verschiedene Methoden zum Senden der Nachricht versuchen
        if (typeof window.sendMessage === 'function') {
          window.sendMessage(message);
        } else if (window.app && typeof window.app.sendMessage === 'function') {
          window.app.sendMessage(message);
        } else {
          // Fallback: Nachricht direkt in den Chat einfügen
          const messagesContainer = document.querySelector('.message-container, .messages');
          if (messagesContainer) {
            const messageEl = document.createElement('div');
            messageEl.className = 'user-message';
            messageEl.textContent = message;
            messagesContainer.appendChild(messageEl);
            
            // Input zurücksetzen
            newInput.value = '';
          }
        }
      });
      
      console.log('Chat-Interaktion wiederhergestellt');
    }
  }
  
  // Überwacht kontinuierlich Event-Handler
  function monitorEventHandlers() {
    // Alle 2 Sekunden prüfen
    setInterval(() => {
      // Prüfe Einstellungsbutton
      const settingsButton = document.querySelector('button[class*="settings"], button i.fa-cog, button i.fa-gear');
      if (settingsButton && !settingsButton._monitoredForInteraction) {
        fixSettingsButton();
        settingsButton._monitoredForInteraction = true;
      }
      
      // Prüfe Admin-Tabs
      const adminTabs = document.querySelectorAll('.admin-tab-button, button[class*="admin"]');
      let needsRepair = false;
      
      adminTabs.forEach(tab => {
        if (!tab._monitoredForInteraction) {
          needsRepair = true;
        }
      });
      
      if (needsRepair && adminTabs.length > 0) {
        fixAdminTabs();
        adminTabs.forEach(tab => {
          tab._monitoredForInteraction = true;
        });
      }
    }, 2000);
  }
})();