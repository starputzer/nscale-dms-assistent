/**
 * Direkter Event-Handler für kritische Aktionen im nscale DMS Assistent
 *
 * Dieses Skript stellt sicher, dass kritische Interaktionen unabhängig
 * vom Vue-Status oder der Bridge-Implementierung funktionieren.
 * Es verwendet Event-Delegation auf Dokumentebene, um alle Klicks zu überwachen.
 */

document.addEventListener("DOMContentLoaded", function () {
  console.log("Direkter Event-Handler wird initialisiert...");

  // Statusvariablen
  let settingsVisible = false;
  let currentAdminTab = "system";

  // Event-Delegation für alle Klicks
  document.addEventListener("click", function (event) {
    const target = event.target;

    // Utility-Funktion zum Finden des nächsten Elements, das dem Selektor entspricht
    function closest(element, selector) {
      if (!element) return null;
      if (element.matches(selector)) return element;
      return closest(element.parentElement, selector);
    }

    // 1. Einstellungsbutton-Handler
    const settingsButton = closest(
      target,
      'button[class*="settings"], button:has(i.fa-cog), button:has(i.fa-gear)',
    );
    if (settingsButton || target.matches("i.fa-cog, i.fa-gear")) {
      console.log("Einstellungsbutton geklickt (direkter Handler)");
      event.preventDefault();
      event.stopPropagation();

      // Einstellungsdialog umschalten
      const settingsDialog = document.querySelector(".settings-dialog-overlay");
      if (settingsDialog) {
        settingsVisible = !settingsVisible;
        settingsDialog.style.display = settingsVisible ? "flex" : "none";
        console.log(
          "Einstellungsdialog umgeschaltet auf: " +
            (settingsVisible ? "sichtbar" : "versteckt"),
        );
      }
      return;
    }

    // Schließen-Button im Einstellungsdialog
    const closeSettingsButton = closest(
      target,
      ".settings-dialog-header .close-button, .settings-dialog-header button:has(i.fa-times)",
    );
    if (
      closeSettingsButton ||
      (target.matches("i.fa-times") &&
        closest(target, ".settings-dialog-header"))
    ) {
      console.log("Einstellungen schließen geklickt (direkter Handler)");
      event.preventDefault();

      // Einstellungsdialog schließen
      const settingsDialog = document.querySelector(".settings-dialog-overlay");
      if (settingsDialog) {
        settingsVisible = false;
        settingsDialog.style.display = "none";
        console.log("Einstellungsdialog geschlossen");
      }
      return;
    }

    // 2. Admin-Tab-Handler
    const adminTabButton = closest(
      target,
      '.admin-tab-button, button[class*="admin-tab"]',
    );
    if (
      adminTabButton ||
      (target.matches("span") && closest(target, ".admin-tab-button"))
    ) {
      const button = adminTabButton || closest(target, ".admin-tab-button");
      if (button) {
        console.log("Admin-Tab geklickt (direkter Handler)");
        event.preventDefault();

        // Tab-ID ermitteln
        let tabId = "";
        if (button.dataset.tab) {
          tabId = button.dataset.tab;
        } else if (button.querySelector("span")) {
          tabId = button.querySelector("span").textContent.trim().toLowerCase();
        } else {
          tabId = button.textContent.trim().toLowerCase();
        }

        // Bekannte Tab-IDs normalisieren
        if (tabId.includes("system")) tabId = "system";
        if (tabId.includes("benutzer") || tabId.includes("user"))
          tabId = "users";
        if (tabId.includes("feedback")) tabId = "feedback";
        if (tabId.includes("motd")) tabId = "motd";
        if (tabId.includes("dokument") || tabId.includes("doc"))
          tabId = "doc-converter";

        console.log("Admin-Tab-ID: " + tabId);
        currentAdminTab = tabId;

        // Alle Tabs ausblenden und aktuellen Tab einblenden
        const allTabButtons = document.querySelectorAll(
          '.admin-tab-button, button[class*="admin-tab"]',
        );
        allTabButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        const allTabContents = document.querySelectorAll(
          '[class*="admin-tab-content"], [data-tab]',
        );
        allTabContents.forEach((content) => {
          content.style.display = "none";
        });

        // Versuche verschiedene Selektoren für den Tab-Inhalt
        const selectors = [
          `.admin-tab-content[data-tab="${tabId}"]`,
          `[data-tab="${tabId}"]`,
          `#tab-${tabId}`,
          `[class*="admin-tab"][class*="${tabId}"]`,
          `[class*="admin-tab-content"][class*="${tabId}"]`,
        ];

        let found = false;
        for (const selector of selectors) {
          const tabContent = document.querySelector(selector);
          if (tabContent) {
            tabContent.style.display = "block";
            console.log("Tab-Inhalt angezeigt: " + selector);
            found = true;
            break;
          }
        }

        if (!found) {
          console.log("Kein passender Tab-Inhalt gefunden für: " + tabId);
        }
        return;
      }
    }

    // 3. Chat-Formular-Submit-Handler wird über das submit-Event behandelt

    // 4. Feedback-Dialog-Handler
    const feedbackButton = closest(
      target,
      '.feedback-button, button[class*="feedback"]',
    );
    if (
      feedbackButton ||
      (target.matches("i.fa-thumbs-up, i.fa-thumbs-down") &&
        closest(target, ".feedback-button"))
    ) {
      console.log("Feedback-Button geklickt (direkter Handler)");
      event.preventDefault();

      // Feedback-Dialog anzeigen
      const feedbackDialog = document.querySelector(".feedback-dialog-overlay");
      if (feedbackDialog) {
        feedbackDialog.style.display = "flex";
        console.log("Feedback-Dialog angezeigt");
      }
      return;
    }

    // Schließen-Button im Feedback-Dialog
    const closeFeedbackButton = closest(
      target,
      ".feedback-dialog-header .close-button, .feedback-dialog-header button:has(i.fa-times)",
    );
    if (
      closeFeedbackButton ||
      (target.matches("i.fa-times") &&
        closest(target, ".feedback-dialog-header"))
    ) {
      console.log("Feedback schließen geklickt (direkter Handler)");
      event.preventDefault();

      // Feedback-Dialog schließen
      const feedbackDialog = document.querySelector(".feedback-dialog-overlay");
      if (feedbackDialog) {
        feedbackDialog.style.display = "none";
        console.log("Feedback-Dialog geschlossen");
      }
      return;
    }

    // 5. Session-Handling
    const sessionItem = closest(target, ".session-item");
    if (sessionItem && !closest(target, "button")) {
      console.log("Session-Item geklickt (direkter Handler)");
      event.preventDefault();

      // Session-ID extrahieren (falls vorhanden)
      const sessionId = sessionItem.dataset.id || "";
      console.log("Session-ID: " + sessionId);

      // Alle Session-Items deaktivieren und aktuelles aktivieren
      const allSessionItems = document.querySelectorAll(".session-item");
      allSessionItems.forEach((item) => item.classList.remove("bg-indigo-100"));
      sessionItem.classList.add("bg-indigo-100");

      // Event auslösen, falls nscale-Events verfügbar sind
      if (window.nscale && window.nscale.events) {
        window.nscale.events.emit("load-session", { id: sessionId });
      }
      return;
    }

    // 6. Admin-View-Umschaltung
    const adminToggleButton = closest(
      target,
      "button:has(i.fa-tools), button:has(i.fa-comments)",
    );
    if (
      adminToggleButton ||
      (target.matches("i.fa-tools, i.fa-comments") && closest(target, "button"))
    ) {
      console.log("Admin-Toggle geklickt (direkter Handler)");
      event.preventDefault();

      // Chat-View und Admin-View umschalten
      const chatView = document.querySelector(
        "[v-if=\"activeView === 'chat'\"]",
      );
      const adminView = document.querySelector(
        "[v-if=\"activeView === 'admin'\"]",
      );

      if (chatView && adminView) {
        const isChatActive = chatView.style.display !== "none";

        chatView.style.display = isChatActive ? "none" : "flex";
        adminView.style.display = isChatActive ? "flex" : "none";

        console.log(
          "View umgeschaltet auf: " + (isChatActive ? "Admin" : "Chat"),
        );

        // Button-Icon anpassen
        const icon = adminToggleButton.querySelector("i") || target;
        if (icon) {
          icon.className = isChatActive ? "fas fa-comments" : "fas fa-tools";
        }

        // Button-Text anpassen
        const span = adminToggleButton.querySelector("span");
        if (span) {
          span.textContent = isChatActive ? "Chat" : "Admin";
        }
      }
      return;
    }
  });

  // Chat-Formular-Submit-Handler
  document.addEventListener("submit", function (event) {
    const form = event.target;

    // Chat-Formular erkennen
    if (
      form.querySelector('input[type="text"]') &&
      form.querySelector('button[type="submit"]')
    ) {
      console.log("Chat-Formular abgesendet (direkter Handler)");
      event.preventDefault();

      const input = form.querySelector('input[type="text"]');
      const message = input.value.trim();

      if (message) {
        console.log("Nachricht: " + message);

        // Nachricht zum DOM hinzufügen
        const messagesContainer = document.querySelector(
          ".flex-1.overflow-y-auto.p-4.space-y-4, .messages",
        );
        if (messagesContainer) {
          // Neue Message-Container erstellen
          const messageContainer = document.createElement("div");
          messageContainer.className = "message-container user-message";

          // User-Message-Content erstellen
          const userMessageContent = document.createElement("div");
          userMessageContent.className = "user-message-content";

          // Message-Header erstellen
          const messageHeader = document.createElement("div");
          messageHeader.className = "message-header";
          messageHeader.innerHTML = `
                        <div class="message-icon">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="message-info">
                            <span class="message-sender">Sie</span>
                            <span class="message-time">${new Date().toLocaleString()}</span>
                        </div>
                    `;

          // Message-Text erstellen
          const messageText = document.createElement("div");
          messageText.className = "message-text";
          messageText.textContent = message;

          // Alles zusammenfügen
          userMessageContent.appendChild(messageHeader);
          userMessageContent.appendChild(messageText);
          messageContainer.appendChild(userMessageContent);
          messagesContainer.appendChild(messageContainer);

          // Zum Ende scrollen
          messagesContainer.scrollTop = messagesContainer.scrollHeight;

          // Input leeren
          input.value = "";

          // Event auslösen, falls nscale-Events verfügbar sind
          if (window.nscale && window.nscale.events) {
            window.nscale.events.emit("send-message", { text: message });
          }

          console.log("Nachricht zum DOM hinzugefügt");
        }
      }
    }
  });

  // Tastaturkürzel für kritische Aktionen
  document.addEventListener("keydown", function (event) {
    // ESC drücken, um Dialoge zu schließen
    if (event.key === "Escape") {
      // Alle Dialoge schließen
      const dialogs = document.querySelectorAll(
        ".settings-dialog-overlay, .feedback-dialog-overlay",
      );
      dialogs.forEach((dialog) => {
        dialog.style.display = "none";
      });

      settingsVisible = false;
      console.log("Alle Dialoge durch ESC geschlossen");
    }

    // STRG+SHIFT+A für Admin-View umschalten
    if (event.ctrlKey && event.shiftKey && event.key === "A") {
      const adminToggleButton = document.querySelector(
        "button:has(i.fa-tools), button:has(i.fa-comments)",
      );
      if (adminToggleButton) {
        adminToggleButton.click();
        console.log("Admin-View durch Tastenkürzel umgeschaltet");
      }
    }

    // STRG+SHIFT+S für Einstellungen umschalten
    if (event.ctrlKey && event.shiftKey && event.key === "S") {
      const settingsButton = document.querySelector(
        "button:has(i.fa-cog), button:has(i.fa-gear)",
      );
      if (settingsButton) {
        settingsButton.click();
        console.log("Einstellungen durch Tastenkürzel umgeschaltet");
      }
    }
  });

  // Hilfsmethoden für lokale Fallbacks, falls Vue oder andere Funktionen fehlen

  // Methode zum Umschalten der Einstellungen
  window.toggleSettings =
    window.toggleSettings ||
    function () {
      settingsVisible = !settingsVisible;
      const settingsDialog = document.querySelector(".settings-dialog-overlay");
      if (settingsDialog) {
        settingsDialog.style.display = settingsVisible ? "flex" : "none";
        console.log(
          "Einstellungen umgeschaltet auf: " +
            (settingsVisible ? "sichtbar" : "versteckt"),
        );
      }
    };

  // Methode zum Wechseln des Admin-Tabs
  window.switchAdminTab =
    window.switchAdminTab ||
    function (tabId) {
      const tabButton = document.querySelector(
        `.admin-tab-button:has(span:contains("${tabId}")), .admin-tab-button[data-tab="${tabId}"]`,
      );
      if (tabButton) {
        tabButton.click();
        return true;
      }
      return false;
    };

  // Methode zum Senden von Nachrichten
  window.sendMessage =
    window.sendMessage ||
    function (text) {
      if (!text || typeof text !== "string") return false;

      const form = document.querySelector("form");
      const input = form ? form.querySelector('input[type="text"]') : null;

      if (form && input) {
        input.value = text;
        const submitEvent = new Event("submit", {
          bubbles: true,
          cancelable: true,
        });
        form.dispatchEvent(submitEvent);
        return true;
      }
      return false;
    };

  console.log("Direkter Event-Handler wurde initialisiert");
});
