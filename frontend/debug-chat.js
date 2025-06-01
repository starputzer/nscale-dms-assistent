/**
 * Debug-Skript für Chat-Funktionalität
 * Hilft bei der Diagnose von Problemen mit dem Nachrichtenversand
 */

document.addEventListener("DOMContentLoaded", () => {
  console.log("Chat Debug-Skript geladen");

  // Nach einer kurzen Verzögerung starten, um sicherzustellen, dass die App geladen ist
  setTimeout(() => {
    // Hole Referenzen zu wichtigen Elementen
    const debugInfo = document.createElement("div");
    debugInfo.style.position = "fixed";
    debugInfo.style.bottom = "50px";
    debugInfo.style.right = "10px";
    debugInfo.style.backgroundColor = "#333";
    debugInfo.style.color = "#0f0";
    debugInfo.style.padding = "10px";
    debugInfo.style.borderRadius = "5px";
    debugInfo.style.fontFamily = "monospace";
    debugInfo.style.zIndex = "9999";
    debugInfo.style.maxWidth = "400px";
    debugInfo.style.maxHeight = "300px";
    debugInfo.style.overflow = "auto";
    debugInfo.style.fontSize = "12px";
    debugInfo.innerHTML =
      '<h3>Chat Debug-Panel</h3><div id="debug-content"></div>';
    document.body.appendChild(debugInfo);

    const debugContent = document.getElementById("debug-content");

    // Zeige App-Status an
    function updateDebugInfo() {
      if (!window.app) {
        debugContent.innerHTML =
          '<p style="color: red">App nicht gefunden!</p>';
        return;
      }

      // Prüfe, ob Vue-Instanz verfügbar ist
      if (!window.app._instance) {
        debugContent.innerHTML =
          '<p style="color: yellow">Vue-Instanz noch nicht initialisiert</p>';
        return;
      }

      const instance = window.app._instance;
      const state = instance.setupState || {};

      // Extrahiere relevante Zustandsvariablen
      const token =
        state.token?.value || localStorage.getItem("token") || "Nicht gefunden";
      const userRole =
        state.userRole?.value ||
        localStorage.getItem("userRole") ||
        "Nicht gefunden";
      const currentSessionId = state.currentSessionId?.value || "Keine Sitzung";
      const messageCount = state.messages?.value?.length || 0;
      const isLoading = state.isLoading?.value || false;
      const isStreaming = state.isStreaming?.value || false;

      // Formatiere Debugging-Informationen
      debugContent.innerHTML = `
                <p><strong>Token:</strong> ${token.substring(0, 15)}...</p>
                <p><strong>Rolle:</strong> ${userRole}</p>
                <p><strong>Aktive Sitzung:</strong> ${currentSessionId}</p>
                <p><strong>Nachrichten:</strong> ${messageCount}</p>
                <p><strong>Lädt:</strong> ${isLoading}</p>
                <p><strong>Streaming:</strong> ${isStreaming}</p>
            `;

      // Füge Debug-Buttons hinzu
      if (!document.getElementById("debug-send-button")) {
        const sendBtn = document.createElement("button");
        sendBtn.id = "debug-send-button";
        sendBtn.innerText = "Test-Nachricht senden";
        sendBtn.style.backgroundColor = "#4CAF50";
        sendBtn.style.color = "white";
        sendBtn.style.padding = "5px 10px";
        sendBtn.style.margin = "5px 0";
        sendBtn.style.border = "none";
        sendBtn.style.borderRadius = "3px";
        sendBtn.style.cursor = "pointer";

        sendBtn.addEventListener("click", () => {
          testSendMessage();
        });

        debugContent.appendChild(sendBtn);

        // API-Check Button
        const apiCheckBtn = document.createElement("button");
        apiCheckBtn.id = "api-check-button";
        apiCheckBtn.innerText = "API-Verbindung prüfen";
        apiCheckBtn.style.backgroundColor = "#2196F3";
        apiCheckBtn.style.color = "white";
        apiCheckBtn.style.padding = "5px 10px";
        apiCheckBtn.style.margin = "5px 0 5px 5px";
        apiCheckBtn.style.border = "none";
        apiCheckBtn.style.borderRadius = "3px";
        apiCheckBtn.style.cursor = "pointer";

        apiCheckBtn.addEventListener("click", () => {
          checkApiConnection();
        });

        debugContent.appendChild(apiCheckBtn);

        // Login-Fix Button
        const loginFixBtn = document.createElement("button");
        loginFixBtn.id = "login-fix-button";
        loginFixBtn.innerText = "Login-Reset";
        loginFixBtn.style.backgroundColor = "#FF9800";
        loginFixBtn.style.color = "white";
        loginFixBtn.style.padding = "5px 10px";
        loginFixBtn.style.margin = "5px 0 5px 5px";
        loginFixBtn.style.border = "none";
        loginFixBtn.style.borderRadius = "3px";
        loginFixBtn.style.cursor = "pointer";

        loginFixBtn.addEventListener("click", () => {
          resetLogin();
        });

        debugContent.appendChild(loginFixBtn);
      }
    }

    // Testen der sendMessage-Funktion
    function testSendMessage() {
      try {
        if (!window.app || !window.app._instance) {
          showResult("App oder Vue-Instanz nicht gefunden!", true);
          return;
        }

        const instance = window.app._instance;
        const state = instance.setupState || {};

        // Überprüfe, ob die sendMessage-Funktion existiert
        if (typeof state.sendMessage !== "function") {
          // Versuche direkt einen API-Call zu machen
          directApiCall();
          return;
        }

        // Setze Testfrage
        if (state.question && state.question.value !== undefined) {
          state.question.value = "Testfrage vom Debug-Tool";
        }

        // Rufe sendMessage auf
        state.sendMessage();

        showResult("Nachrichtenversand initiiert");
      } catch (error) {
        showResult(`Fehler beim Senden: ${error.message}`, true);
        console.error("Fehler beim Senden der Nachricht:", error);
      }
    }

    // Direkte API-Anfrage
    function directApiCall() {
      const token = localStorage.getItem("token");
      if (!token) {
        showResult("Kein Token vorhanden!", true);
        return;
      }

      // Frage bestimmen
      let question = "Testfrage vom Debug-Tool via direktem API-Call";

      // Bestimme die aktive Session oder erstelle eine neue
      let sessionId = localStorage.getItem("lastActiveSession");

      fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: question,
          session_id: sessionId || null,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP Fehler: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          showResult(
            `API-Antwort: ${JSON.stringify(data).substring(0, 100)}...`,
          );
          console.log("API-Antwort:", data);
        })
        .catch((error) => {
          showResult(`API-Fehler: ${error.message}`, true);
          console.error("API-Fehler:", error);
        });
    }

    // Prüfen der API-Verbindung
    function checkApiConnection() {
      fetch("/api/health")
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP Fehler: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          showResult(`API ist erreichbar: ${JSON.stringify(data)}`);
        })
        .catch((error) => {
          showResult(`API nicht erreichbar: ${error.message}`, true);
        });
    }

    // Login zurücksetzen
    function resetLogin() {
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      localStorage.removeItem("lastActiveSession");

      showResult("Login-Daten zurückgesetzt. Seite wird neu geladen...");

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }

    // Zeigt Ergebnisse im Debug-Panel an
    function showResult(message, isError = false) {
      const resultElem = document.createElement("div");
      resultElem.style.margin = "10px 0";
      resultElem.style.padding = "5px";
      resultElem.style.borderLeft = `3px solid ${isError ? "red" : "green"}`;
      resultElem.style.backgroundColor = isError
        ? "rgba(255,0,0,0.1)"
        : "rgba(0,255,0,0.1)";
      resultElem.textContent = message;

      debugContent.appendChild(resultElem);

      // Scroll zum letzten Eintrag
      debugContent.scrollTop = debugContent.scrollHeight;
    }

    // Initialisiere das Debug-Panel
    updateDebugInfo();

    // Regelmäßig aktualisieren
    setInterval(updateDebugInfo, 2000);

    console.log("Debug-Panel initialisiert");
  }, 2000);
});
