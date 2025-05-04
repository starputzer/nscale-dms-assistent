/**
 * Notfalllösung für Probleme mit der Vue.js-Initialisierung
 * Dieses Skript behebt Probleme mit der Anzeige der Tabs und Panels direkt im DOM
 */
window.addEventListener('load', function() {
  console.log('Emergency-Fix: Starte direkte DOM-Manipulation...');

  // Direktes CSS hinzufügen
  const style = document.createElement('style');
  style.textContent = `
    /* CSS-Fix für nicht initialisierte Vue.js-Strukturen */
    body .admin-panel-content[data-tab] {
      display: none !important;
    }
    
    /* Erstes Tab anzeigen oder spezifisch aktiviertes */
    body .admin-panel-content.active-tab,
    body .admin-panel-content[data-tab="users"]:not(.emergency-fixed) {
      display: block !important;
    }
    
    /* Verhindere, dass alle Tabs/Popups gleichzeitig angezeigt werden */
    body > * {
      z-index: 1;
    }
    
    /* Jedes Tab bekommt eine eigene z-index-Schicht */
    body .admin-panel-content[data-tab="users"] { z-index: 10; }
    body .admin-panel-content[data-tab="system"] { z-index: 11; }
    body .admin-panel-content[data-tab="docConverter"] { z-index: 12; }
    body .admin-panel-content[data-tab="feedback"] { z-index: 13; }
    body .admin-panel-content[data-tab="motd"] { z-index: 14; }
    body .admin-panel-content[data-tab="features"] { z-index: 15; }
    
    /* Aktives Tab hat höchsten z-index */
    body .admin-panel-content.active-tab {
      z-index: 100 !important;
    }
  `;
  document.head.appendChild(style);
  
  // Funktion zum Markieren des ersten gefundenen Tabs
  function markFirstTabAsActive() {
    const tabs = document.querySelectorAll('.admin-panel-content[data-tab]');
    if (tabs.length > 0) {
      console.log(`Emergency-Fix: ${tabs.length} Tabs gefunden, markiere ersten als aktiv`);
      
      // Alle anderen ausblenden
      tabs.forEach(tab => {
        tab.classList.add('emergency-fixed');
        tab.style.display = 'none';
      });
      
      // Ersten anzeigen
      if (tabs[0]) {
        tabs[0].style.display = 'block';
      }
      
      // Das wird beim Seiten-Update automatisch ausgelöst
      setupTabNavigation();
    } else {
      console.log('Emergency-Fix: Noch keine Tabs gefunden, warte...');
      setTimeout(markFirstTabAsActive, 500);
    }
  }
  
  // Tab-Navigation einrichten
  function setupTabNavigation() {
    const navButtons = document.querySelectorAll('.admin-nav-item[data-tab]');
    if (navButtons.length === 0) {
      console.log('Emergency-Fix: Keine Nav-Buttons gefunden, warte...');
      setTimeout(setupTabNavigation, 500);
      return;
    }
    
    console.log(`Emergency-Fix: ${navButtons.length} Nav-Buttons gefunden, richte Event-Listener ein`);
    
    navButtons.forEach(button => {
      // Nur einrichten, wenn noch nicht geschehen
      if (!button.hasAttribute('data-emergency-fixed')) {
        button.setAttribute('data-emergency-fixed', 'true');
        
        button.addEventListener('click', function() {
          const tabName = this.getAttribute('data-tab');
          console.log(`Emergency-Fix: Button für Tab ${tabName} geklickt`);
          
          // Alle Buttons deaktivieren
          navButtons.forEach(btn => btn.classList.remove('active'));
          
          // Diesen Button aktivieren
          this.classList.add('active');
          
          // Alle Tab-Panels verstecken
          const tabPanels = document.querySelectorAll('.admin-panel-content[data-tab]');
          tabPanels.forEach(panel => {
            panel.classList.remove('active-tab');
            panel.style.display = 'none';
          });
          
          // Ziel-Panel anzeigen
          const targetPanel = document.querySelector(`.admin-panel-content[data-tab="${tabName}"]`);
          if (targetPanel) {
            targetPanel.classList.add('active-tab');
            targetPanel.style.display = 'block';
            
            // Für DocConverter spezielle Initialisierung
            if (tabName === 'docConverter') {
              console.log('Emergency-Fix: DocConverter-Tab aktiviert, versuche Initialisierung...');
              if (typeof window.initDocConverter === 'function') {
                setTimeout(window.initDocConverter, 100);
              }
            }
          } else {
            console.warn(`Emergency-Fix: Tab-Panel ${tabName} nicht gefunden!`);
          }
        });
      }
    });
    
    // Direkt ersten Tab aktivieren, falls keiner aktiv ist
    if (!document.querySelector('.admin-nav-item.active')) {
      const firstNavButton = navButtons[0];
      if (firstNavButton) {
        console.log('Emergency-Fix: Kein aktiver Tab gefunden, aktiviere ersten Tab');
        firstNavButton.click();
      }
    }
  }
  
  // DOM-Beobachter für dynamische Änderungen
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      // Wenn neue Knoten hinzugefügt wurden, prüfen ob es Tabs sind
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Nur prüfen, wenn wir neue Tab-Panels haben könnten
        if ([...mutation.addedNodes].some(node => 
            node.nodeType === 1 && 
            (node.classList?.contains('admin-panel-content') || 
             node.querySelector?.('.admin-panel-content')))) {
          
          console.log('Emergency-Fix: Neue Tab-Panels erkannt, aktualisiere Tab-Navigation');
          setupTabNavigation();
          
          // Wenn keine aktiven Tabs gefunden, ersten aktivieren
          const activeTabs = document.querySelectorAll('.admin-panel-content.active-tab');
          if (activeTabs.length === 0) {
            markFirstTabAsActive();
          }
        }
      }
    });
  });
  
  // DOM auf Änderungen überwachen
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
  
  // Starte die Initialisierung
  markFirstTabAsActive();
  
  // Zusätzlicher Check nach kurzer Zeit
  setTimeout(function() {
    console.log('Emergency-Fix: Führe erneuten Check durch...');
    setupTabNavigation();
  }, 1000);
});