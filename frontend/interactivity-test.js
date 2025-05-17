/**
 * Interaktivitätstest für den nscale DMS Assistent
 *
 * Dieses Skript überprüft, ob alle interaktiven Elemente ordnungsgemäß funktionieren
 * und zeigt ein Diagnose-Panel an, das Probleme erkennt und Lösungen vorschlägt.
 */

(function () {
  // Erstelle das Test-Panel
  function createTestPanel() {
    console.log("Erstelle Interaktivitätstest-Panel...");

    // Panel-Container
    const panel = document.createElement("div");
    panel.id = "interactivity-test-panel";
    panel.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      width: 300px;
      background: rgba(0, 0, 0, 0.8);
      color: #0f0;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 4px;
      z-index: 9999;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
      display: none;
    `;

    // Panel-Header
    const header = document.createElement("div");
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      border-bottom: 1px solid #0f0;
      padding-bottom: 5px;
    `;
    header.innerHTML =
      '<span>Interaktivitätstest</span><button id="test-panel-toggle" style="background: none; border: none; color: #0f0; cursor: pointer;">Schließen</button>';

    // Panel-Content
    const content = document.createElement("div");
    content.id = "test-panel-content";
    content.style.cssText = `
      max-height: 200px;
      overflow-y: auto;
    `;

    // Test-Buttons
    const buttons = document.createElement("div");
    buttons.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-top: 8px;
      border-top: 1px solid #0f0;
      padding-top: 5px;
    `;

    // Test-Button-Funktion
    function createTestButton(label, testFn) {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.style.cssText = `
        background: #333;
        color: #0f0;
        border: 1px solid #0f0;
        padding: 3px 6px;
        border-radius: 3px;
        cursor: pointer;
        font-family: monospace;
        margin-top: 3px;
      `;
      btn.addEventListener("click", testFn);
      return btn;
    }

    // Test-Buttons hinzufügen
    buttons.appendChild(createTestButton("Alle Tests ausführen", runAllTests));
    buttons.appendChild(
      createTestButton("Einstellungsbutton testen", testSettingsButton),
    );
    buttons.appendChild(createTestButton("Admin-Tabs testen", testAdminTabs));
    buttons.appendChild(
      createTestButton("Chat-Interaktion testen", testChatInteraction),
    );
    buttons.appendChild(
      createTestButton("Event-Handler prüfen", testEventHandlers),
    );
    buttons.appendChild(
      createTestButton("Feature-Toggles anzeigen", showFeatureToggles),
    );
    buttons.appendChild(createTestButton("Vue-Mount überprüfen", testVueMount));
    buttons.appendChild(
      createTestButton("Fehlersuche starten", diagnosticMode),
    );

    // Komponenten zusammenfügen
    panel.appendChild(header);
    panel.appendChild(content);
    panel.appendChild(buttons);
    document.body.appendChild(panel);

    // Toggle-Button-Event
    document
      .getElementById("test-panel-toggle")
      .addEventListener("click", function () {
        panel.style.display = "none";
      });

    return panel;
  }

  // Ausgabe zum Panel hinzufügen
  function logToPanel(message, type = "info") {
    const content = document.getElementById("test-panel-content");
    if (!content) return;

    const logEntry = document.createElement("div");
    logEntry.style.cssText = `
      margin-bottom: 4px;
      padding: 2px 4px;
      border-radius: 2px;
      ${type === "success" ? "color: #0f0;" : ""}
      ${type === "error" ? "color: #f00;" : ""}
      ${type === "warning" ? "color: #ff0;" : ""}
    `;

    // Zeitstempel
    const timestamp = new Date().toLocaleTimeString();
    logEntry.innerHTML = `<span style="color: #0ff;">[${timestamp}]</span> ${message}`;

    content.appendChild(logEntry);
    content.scrollTop = content.scrollHeight;
  }

  // Alle Tests ausführen
  function runAllTests() {
    logToPanel("--- Starte alle Tests ---", "info");

    // Tests nacheinander ausführen
    testSettingsButton();
    testAdminTabs();
    testChatInteraction();
    testEventHandlers();
    testVueMount();

    logToPanel("--- Tests abgeschlossen ---", "info");
  }

  // Einstellungsbutton testen
  function testSettingsButton() {
    logToPanel("Teste Einstellungsbutton...", "info");

    // Einstellungsbutton suchen
    const settingsButtons = document.querySelectorAll(
      'button[class*="settings"], button i.fa-cog, button i.fa-gear',
    );

    if (settingsButtons.length === 0) {
      logToPanel("❌ Kein Einstellungsbutton gefunden", "error");
      return false;
    }

    logToPanel(
      `✓ ${settingsButtons.length} Einstellungsbutton(s) gefunden`,
      "success",
    );

    // Prüfen, ob Events auf den Buttons registriert sind
    let hasEventListeners = false;

    settingsButtons.forEach((button) => {
      const btn = button.tagName === "I" ? button.closest("button") : button;

      if (
        btn &&
        (btn.onclick || btn._repairHandled || btn.getAttribute("onclick"))
      ) {
        hasEventListeners = true;
        logToPanel("✓ Einstellungsbutton hat Event-Listener", "success");
      }
    });

    if (!hasEventListeners) {
      logToPanel(
        "⚠️ Keine Event-Listener auf Einstellungsbuttons gefunden",
        "warning",
      );
      return false;
    }

    // Einstellungsdialog prüfen
    const settingsDialog = document.querySelector(
      ".settings-dialog, .settings-dialog-overlay, .settings-panel",
    );

    if (!settingsDialog) {
      logToPanel("❌ Kein Einstellungsdialog gefunden", "error");
      return false;
    }

    logToPanel("✓ Einstellungsdialog gefunden", "success");
    return true;
  }

  // Admin-Tabs testen
  function testAdminTabs() {
    logToPanel("Teste Admin-Tabs...", "info");

    // Admin-Tabs suchen
    const adminTabButtons = document.querySelectorAll(
      '.admin-tab-button, button[class*="admin"]',
    );

    if (adminTabButtons.length === 0) {
      logToPanel("❌ Keine Admin-Tabs gefunden", "error");
      return false;
    }

    logToPanel(`✓ ${adminTabButtons.length} Admin-Tab(s) gefunden`, "success");

    // Prüfen, ob Events auf den Tabs registriert sind
    let hasEventListeners = false;

    adminTabButtons.forEach((button) => {
      if (
        button.onclick ||
        button._repairHandled ||
        button.getAttribute("onclick")
      ) {
        hasEventListeners = true;
        logToPanel("✓ Admin-Tab hat Event-Listener", "success");
      }
    });

    if (!hasEventListeners) {
      logToPanel("⚠️ Keine Event-Listener auf Admin-Tabs gefunden", "warning");
      return false;
    }

    // Tab-Inhalte prüfen
    const tabContents = document.querySelectorAll(
      '.admin-tab-content, [class*="admin-tab"]',
    );

    if (tabContents.length === 0) {
      logToPanel("❌ Keine Tab-Inhalte gefunden", "error");
      return false;
    }

    logToPanel(`✓ ${tabContents.length} Tab-Inhalt(e) gefunden`, "success");
    return true;
  }

  // Chat-Interaktion testen
  function testChatInteraction() {
    logToPanel("Teste Chat-Interaktion...", "info");

    // Chat-Formular suchen
    const chatForm = document.querySelector("form, .chat-form");

    if (!chatForm) {
      logToPanel("❌ Kein Chat-Formular gefunden", "error");
      return false;
    }

    logToPanel("✓ Chat-Formular gefunden", "success");

    // Chat-Input prüfen
    const chatInput = document.querySelector(
      'input[type="text"], textarea, .chat-input',
    );

    if (!chatInput) {
      logToPanel("❌ Kein Chat-Input gefunden", "error");
      return false;
    }

    logToPanel("✓ Chat-Input gefunden", "success");

    // Sende-Button prüfen
    const sendButton = document.querySelector(
      'button[type="submit"], .send-button',
    );

    if (!sendButton) {
      logToPanel("❌ Kein Sende-Button gefunden", "error");
      return false;
    }

    logToPanel("✓ Sende-Button gefunden", "success");

    // Prüfen, ob Events auf dem Formular registriert sind
    if (
      chatForm.onsubmit ||
      chatForm._repairHandled ||
      chatForm.getAttribute("onsubmit")
    ) {
      logToPanel("✓ Chat-Formular hat Event-Listener", "success");
    } else {
      logToPanel(
        "⚠️ Kein Event-Listener auf Chat-Formular gefunden",
        "warning",
      );
    }

    // Nachrichtenliste prüfen
    const messageContainer = document.querySelector(
      '.message-container, .messages, [class*="message-list"]',
    );

    if (!messageContainer) {
      logToPanel("❌ Kein Nachrichten-Container gefunden", "error");
      return false;
    }

    logToPanel("✓ Nachrichten-Container gefunden", "success");
    return true;
  }

  // Event-Handler prüfen
  function testEventHandlers() {
    logToPanel("Teste Event-Handler...", "info");

    // Prüfe Bridge-Objekt
    if (window.nscale && window.nscale.events) {
      logToPanel("✓ Bridge-Objekt gefunden", "success");

      // Prüfe Event-Handler-Funktionen
      if (
        typeof window.nscale.events.on === "function" &&
        typeof window.nscale.events.emit === "function"
      ) {
        logToPanel("✓ Event-Handler-Funktionen gefunden", "success");
      } else {
        logToPanel("❌ Event-Handler-Funktionen fehlen", "error");
      }
    } else {
      logToPanel("❌ Bridge-Objekt fehlt", "error");
    }

    // Prüfe globale Funktionen
    const globalFunctions = ["toggleSettings", "sendMessage", "switchAdminTab"];

    globalFunctions.forEach((fn) => {
      if (typeof window[fn] === "function") {
        logToPanel(`✓ Globale Funktion ${fn} gefunden`, "success");
      } else if (window.app && typeof window.app[fn] === "function") {
        logToPanel(`✓ App-Funktion ${fn} gefunden`, "success");
      } else {
        logToPanel(`⚠️ Funktion ${fn} nicht gefunden`, "warning");
      }
    });

    return true;
  }

  // Feature-Toggles anzeigen
  function showFeatureToggles() {
    logToPanel("Feature-Toggles:", "info");

    // Prüfe Feature-Toggles
    if (window.nscale && window.nscale.featureToggles) {
      const toggles = window.nscale.featureToggles;
      Object.entries(toggles).forEach(([key, value]) => {
        const status = value ? "✓" : "✗";
        const color = value ? "success" : "error";
        logToPanel(`${status} ${key}: ${value}`, color);
      });
    } else {
      logToPanel("❌ Keine Feature-Toggles gefunden", "error");

      // Prüfe localStorage
      try {
        const storedToggles = localStorage.getItem("featureToggles");
        if (storedToggles) {
          const toggles = JSON.parse(storedToggles);
          logToPanel("Feature-Toggles aus localStorage:", "info");
          Object.entries(toggles).forEach(([key, value]) => {
            const status = value ? "✓" : "✗";
            const color = value ? "success" : "error";
            logToPanel(`${status} ${key}: ${value}`, color);
          });
        } else {
          logToPanel("❌ Keine Feature-Toggles in localStorage", "error");
        }
      } catch (e) {
        logToPanel(
          `❌ Fehler beim Lesen aus localStorage: ${e.message}`,
          "error",
        );
      }
    }
  }

  // Vue-Mount überprüfen
  function testVueMount() {
    logToPanel("Teste Vue-Mount...", "info");

    // Prüfe Vue
    if (typeof Vue !== "undefined") {
      logToPanel(`✓ Vue gefunden (Version ${Vue.version})`, "success");
    } else {
      logToPanel("❌ Vue nicht gefunden", "error");
      return false;
    }

    // Prüfe VueDemi
    if (typeof VueDemi !== "undefined") {
      logToPanel("✓ VueDemi gefunden", "success");
    } else {
      logToPanel("⚠️ VueDemi nicht gefunden", "warning");
    }

    // Prüfe Pinia
    if (typeof Pinia !== "undefined") {
      logToPanel("✓ Pinia gefunden", "success");
    } else {
      logToPanel("⚠️ Pinia nicht gefunden", "warning");
    }

    // Prüfe Mount-Punkt
    const mountPoint = document.getElementById("vue-dms-app");

    if (mountPoint) {
      logToPanel("✓ Vue-Mount-Punkt gefunden", "success");

      // Prüfe, ob der Mount-Punkt Kinder hat
      if (mountPoint.children.length > 0) {
        logToPanel(
          `✓ Mount-Punkt hat ${mountPoint.children.length} Kind(er)`,
          "success",
        );
      } else {
        logToPanel("⚠️ Mount-Punkt hat keine Kinder", "warning");
      }
    } else {
      logToPanel("❌ Vue-Mount-Punkt nicht gefunden", "error");
      return false;
    }

    return true;
  }

  // Diagnose-Modus
  function diagnosticMode() {
    logToPanel("Starte umfassende Fehlersuche...", "info");

    // Liste aller möglichen Probleme und Lösungen
    const diagnostics = [
      {
        test: () => testSettingsButton(),
        message: "Einstellungsbutton funktioniert nicht",
        solution:
          'Stellen Sie sicher, dass die Einstellungs-Handler korrekt geladen sind. Sie können die Aktion auch direkt über den "toggleSettings"-Befehl in der Konsole auslösen.',
      },
      {
        test: () => testAdminTabs(),
        message: "Admin-Tabs reagieren nicht auf Klicks",
        solution:
          'Prüfen Sie, ob die Tab-Handler korrekt geladen sind. Sie können die Tabs auch direkt über den "switchAdminTab"-Befehl in der Konsole ändern.',
      },
      {
        test: () => testChatInteraction(),
        message: "Chat-Interaktion funktioniert nicht",
        solution:
          'Stellen Sie sicher, dass das Chat-Formular einen Submit-Handler hat. Sie können Nachrichten auch direkt über den "sendMessage"-Befehl in der Konsole senden.',
      },
      {
        test: () => window.nscale && window.nscale.events,
        message: "Bridge-Objekt fehlt",
        solution:
          "Stellen Sie sicher, dass bridge-fix.js korrekt geladen wurde. Sie können das Bridge-Objekt auch manuell in der Konsole initialisieren.",
      },
      {
        test: () => typeof Vue !== "undefined",
        message: "Vue ist nicht definiert",
        solution:
          "Stellen Sie sicher, dass die Vue-Bibliothek korrekt geladen wurde. Prüfen Sie die Netzwerkanfragen auf Fehler beim Laden von Vue.",
      },
      {
        test: () => document.getElementById("vue-dms-app"),
        message: "Vue-Mount-Punkt fehlt",
        solution:
          'Stellen Sie sicher, dass das Element mit der ID "vue-dms-app" im DOM vorhanden ist.',
      },
      {
        test: () =>
          window.nscale &&
          window.nscale.featureToggles &&
          window.nscale.featureToggles.useSfcAdmin,
        message: "SFC-Admin-Feature ist deaktiviert",
        solution:
          "Aktivieren Sie das Feature über localStorage oder verwenden Sie den Befehl \"window.nscale.debug.toggleFeature('useSfcAdmin', true)\" in der Konsole.",
      },
    ];

    // Führe alle Diagnosen aus
    let foundProblems = 0;

    diagnostics.forEach((diag) => {
      const result = typeof diag.test === "function" ? diag.test() : diag.test;

      if (!result) {
        foundProblems++;
        logToPanel(`⚠️ Problem erkannt: ${diag.message}`, "warning");
        logToPanel(`🔧 Lösung: ${diag.solution}`, "info");
      }
    });

    if (foundProblems === 0) {
      logToPanel(
        "✓ Keine bekannten Probleme gefunden. Alle Tests bestanden!",
        "success",
      );
    } else {
      logToPanel(
        `❌ ${foundProblems} Problem(e) gefunden. Bitte die vorgeschlagenen Lösungen anwenden.`,
        "error",
      );
    }

    // DOM-Tiefe überprüfen
    const maxDepth = calculateDOMDepth(document.body);
    if (maxDepth > 20) {
      logToPanel(
        `⚠️ Die DOM-Tiefe von ${maxDepth} ist sehr hoch, was Performance-Probleme verursachen könnte.`,
        "warning",
      );
    } else {
      logToPanel(
        `✓ DOM-Tiefe: ${maxDepth} ist im normalen Bereich.`,
        "success",
      );
    }

    return true;
  }

  // Berechnet die maximale Tiefe des DOM-Baums
  function calculateDOMDepth(element, currentDepth = 0) {
    if (!element) return currentDepth;

    let maxDepth = currentDepth;

    for (let i = 0; i < element.children.length; i++) {
      const childDepth = calculateDOMDepth(
        element.children[i],
        currentDepth + 1,
      );
      maxDepth = Math.max(maxDepth, childDepth);
    }

    return maxDepth;
  }

  // Tastenkombination zum Anzeigen des Test-Panels (Alt+T)
  document.addEventListener("keydown", function (e) {
    if (e.altKey && e.key === "t") {
      const panel =
        document.getElementById("interactivity-test-panel") ||
        createTestPanel();
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    }
  });

  // Panel erstellen, aber ausgeblendet lassen
  setTimeout(() => {
    createTestPanel();
    logToPanel(
      "Interaktivitätstest geladen. Drücke Alt+T zum Ein-/Ausblenden.",
      "info",
    );
  }, 1000);

  console.log(
    "Interaktivitätstest-Skript geladen. Drücke Alt+T zum Anzeigen des Test-Panels.",
  );
})();
