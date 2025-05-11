/**
 * @deprecated Diese Legacy-Komponente ist veraltet und wird in Kürze entfernt.
 * Verwende stattdessen die Vue 3 SFC-Implementierung.
 * Geplantes Entfernungsdatum: 2025-06-10
 */


// Monitoring für Legacy-Code-Nutzung
function trackLegacyUsage(componentName, action) {
  if (typeof window.telemetry !== 'undefined') {
    window.telemetry.trackEvent('legacy_code_usage', {
      component: componentName,
      action: action,
      timestamp: new Date().toISOString()
    });
  }
}

// Tracking bei Modulinitialisierung
trackLegacyUsage('app.optimized', 'initialize');


import { setupChat } from "./chat.optimized.js";
import { setupFeedback } from "./feedback.js";
import { setupAdmin } from "./admin.js";
import { setupSettings } from "./settings.js";
import { setupSourceReferences } from "./source-references.js";
import "./performance-metrics.js";
import { DOMBatch } from "./dom-batch.js";
import { DataOptimization } from "./data-optimization.js";
import { AsyncOptimization } from "./async-optimization.js";

// Vue global verfügbar machen
const Vue = window.Vue;
const { createApp, ref, onMounted, watch, nextTick, computed, reactive } = Vue;

// Performance-Messung starten
PerformanceMetrics.startMeasure("app_initialization");

// Farbpaletten vorberechnen und cachen
const colorThemes = {
  warning: {
    backgroundColor: "#fff3cd",
    borderColor: "#ffeeba",
    textColor: "#856404",
  },
  info: {
    backgroundColor: "#e1ecf8",
    borderColor: "#bee5eb",
    textColor: "#0c5460",
  },
  success: {
    backgroundColor: "#e0f5ea",
    borderColor: "#c3e6cb",
    textColor: "#155724",
  },
  danger: {
    backgroundColor: "#f8d7da",
    borderColor: "#f5c6cb",
    textColor: "#721c24",
  },
  neutral: {
    backgroundColor: "#f8f9fa",
    borderColor: "#dee2e6",
    textColor: "#495057",
  },
};

createApp({
  setup() {
    // Optimierte State-Verwaltung mit Memoization
    const token = ref(localStorage.getItem("token") || "");
    const email = ref("");
    const password = ref("");
    const authMode = ref("login");
    const loading = ref(false);
    const errorMessage = ref("");
    const successMessage = ref("");

    // Chat-Zustand mit Virtualized Rendering-Optimierung
    const sessions = ref([]);
    const currentSessionId = ref(null);
    const messages = ref([]);
    const question = ref("");
    const isLoading = ref(false);
    const chatMessages = ref(null);
    const isStreaming = ref(false);
    const eventSource = ref(null);

    // Ansichts-State
    const activeView = ref("chat");

    // Benutzerrolle
    const userRole = ref("user");

    // Feedback state
    const showFeedbackDialog = ref(false);
    const feedbackComment = ref("");
    const feedbackMessage = ref(null);

    // MOTD state mit Memoization
    const motd = ref(null);
    const motdDismissed = ref(
      localStorage.getItem("motdDismissed") === "true" || false,
    );

    // Ausgewähltes Farbthema
    const selectedColorTheme = ref("warning");

    // Optimierte berechnete Eigenschaften mit Memoization
    const isLoggedIn = computed(() => !!token.value);
    const isAdmin = computed(() => userRole.value === "admin");

    // Speichern des Scroll-Status zwischen Renders
    const scrollPositions = new Map();

    // Sitzungspersistenz-Funktionen
    const saveCurrentSessionToStorage = AsyncOptimization.debounce(
      (sessionId) => {
        if (sessionId) {
          localStorage.setItem("lastActiveSession", sessionId);
          console.log(
            `Aktuelle Session ${sessionId} im localStorage gespeichert`,
          );
        }
      },
      500,
    );

    const restoreLastActiveSession = async () => {
      try {
        const lastSessionId = localStorage.getItem("lastActiveSession");

        if (lastSessionId && sessions.value.length > 0) {
          // Prüfen, ob die Session noch existiert
          const sessionExists = sessions.value.some(
            (session) => session.id === parseInt(lastSessionId),
          );

          if (sessionExists) {
            console.log(
              `Lade zuletzt aktive Session ${lastSessionId} aus localStorage`,
            );
            await loadSession(parseInt(lastSessionId));
            return true;
          } else {
            console.log(
              `Zuletzt aktive Session ${lastSessionId} existiert nicht mehr`,
            );
            localStorage.removeItem("lastActiveSession");
          }
        }
      } catch (error) {
        console.error(
          "Fehler beim Wiederherstellen der letzten Session:",
          error,
        );
      }

      return false;
    };

    // Setup axios mit auth header
    const setupAxios = () => {
      axios.defaults.headers.common["Authorization"] = token.value
        ? `Bearer ${token.value}`
        : "";
    };

    // Auth-Funktionen mit API-Batch-Optimierung
    const login = async () => {
      try {
        loading.value = true;
        errorMessage.value = "";

        const response = await AsyncOptimization.post(
          "/api/auth/login",
          {
            email: email.value,
            password: password.value,
          },
          {
            priority: 1, // Hohe Priorität für Login
            retry: true,
          },
        );

        token.value = response.token;
        localStorage.setItem("token", token.value);
        setupAxios();

        // Eingabefelder leeren
        email.value = "";
        password.value = "";

        // Benutzerrolle laden und Sessions vorausladen
        await Promise.all([adminFunctions.loadUserRole(), loadSessions()]);
      } catch (error) {
        errorMessage.value =
          error.response?.data?.detail ||
          "Anmeldefehler. Bitte versuchen Sie es erneut.";
      } finally {
        loading.value = false;
      }
    };

    const register = async () => {
      try {
        loading.value = true;
        errorMessage.value = "";

        await AsyncOptimization.post("/api/auth/register", {
          email: email.value,
          password: password.value,
        });

        // Zur Anmeldung wechseln nach erfolgreicher Registrierung
        authMode.value = "login";
        successMessage.value =
          "Registrierung erfolgreich. Bitte melden Sie sich an.";

        // Eingabefelder leeren
        email.value = "";
        password.value = "";
      } catch (error) {
        errorMessage.value =
          error.response?.data?.detail ||
          "Registrierungsfehler. Bitte versuchen Sie es erneut.";
      } finally {
        loading.value = false;
      }
    };

    const resetPassword = async () => {
      try {
        loading.value = true;
        errorMessage.value = "";
        successMessage.value = "";

        const response = await AsyncOptimization.post(
          "/api/auth/reset-password",
          {
            email: email.value,
          },
        );

        successMessage.value = response.message;

        // In einer realen App würde der Benutzer eine E-Mail mit dem Token erhalten
        // Für dieses Beispiel zeigen wir das Token direkt an
        if (response.token) {
          successMessage.value += ` Token: ${response.token}`;
        }
      } catch (error) {
        errorMessage.value =
          error.response?.data?.detail ||
          "Fehler beim Zurücksetzen des Passworts.";
      } finally {
        loading.value = false;
      }
    };

    const logout = () => {
      // Aktuelle Scroll-Position speichern
      if (chatMessages.value) {
        scrollPositions.set("chat", chatMessages.value.scrollTop);
      }

      // Authentifizierungsdaten zurücksetzen
      token.value = "";
      localStorage.removeItem("token");
      setupAxios();

      // Session-Daten zurücksetzen
      currentSessionId.value = null;
      sessions.value = [];
      messages.value = [];
      userRole.value = "user";
      activeView.value = "chat";
      localStorage.removeItem("lastActiveSession");

      // EventSource schließen, falls vorhanden
      if (eventSource.value) {
        eventSource.value.close();
        eventSource.value = null;
      }

      // Cache leeren
      DataOptimization.cacheClear();
    };

    // Session-Handling mit verbesserter Persistenz und DOM-Batching
    const loadSession = async (sessionId) => {
      try {
        // Aktuelle Scroll-Position speichern
        if (chatMessages.value && currentSessionId.value) {
          scrollPositions.set(
            `session_${currentSessionId.value}`,
            chatMessages.value.scrollTop,
          );
        }

        isLoading.value = true;
        console.log(`Lade Session ${sessionId}...`);

        // Sitzungsdaten aus dem Cache verwenden, falls verfügbar
        const cacheKey = `session_${sessionId}`;
        let sessionData = DataOptimization.cacheGet(cacheKey);

        if (!sessionData) {
          // Nicht im Cache, von der API laden
          const response = await AsyncOptimization.get(
            `/api/session/${sessionId}`,
          );
          sessionData = response;

          // Im Cache speichern für 5 Minuten
          DataOptimization.cacheSet(cacheKey, sessionData, 5 * 60 * 1000);
        }

        // Sitzungs-ID setzen
        currentSessionId.value = sessionId;

        // Session im localStorage speichern für Persistenz nach Reload
        saveCurrentSessionToStorage(sessionId);

        // DOM-Batch für effiziente Aktualisierungen
        DOMBatch.groupOperations(() => {
          // Nachrichten setzen
          messages.value = sessionData.messages;

          // MOTD-Logik: Wenn bereits Nachrichten existieren, MOTD ausblenden
          if (messages.value && messages.value.length > 0) {
            console.log(
              `Session ${sessionId} hat ${messages.value.length} Nachrichten - MOTD wird ausgeblendet`,
            );
            motdDismissed.value = true;
            localStorage.setItem("motdDismissed", "true");
          } else {
            console.log(
              `Session ${sessionId} hat keine Nachrichten - MOTD wird angezeigt`,
            );
            motdDismissed.value = false;
            localStorage.removeItem("motdDismissed");
          }

          // Zur Chat-Ansicht wechseln
          activeView.value = "chat";
        });

        // Feedback für jede Assistenten-Nachricht asynchron laden
        const feedbackPromises = messages.value
          .filter((message) => !message.is_user && message.id)
          .map((message) => feedbackFunctions.loadMessageFeedback(message.id));

        // Parallel ausführen
        await Promise.all(feedbackPromises);

        // Nach dem Laden der Nachrichten zum Ende scrollen
        await nextTick();

        // Gespeicherte Scroll-Position wiederherstellen oder zum Ende scrollen
        if (scrollPositions.has(`session_${sessionId}`)) {
          chatMessages.value.scrollTop = scrollPositions.get(
            `session_${sessionId}`,
          );
        } else {
          scrollToBottom();
        }
      } catch (error) {
        console.error("Error loading session:", error);
      } finally {
        isLoading.value = false;
      }
    };

    // Verbesserte loadSessions-Funktion mit automatischer Aktualisierung und Immutability
    const loadSessions = AsyncOptimization.debounce(async () => {
      try {
        const cacheKey = "all_sessions";
        let sessionsData = null;

        // Bei aktivem Streaming immer frische Daten laden
        if (!isStreaming.value) {
          sessionsData = DataOptimization.cacheGet(cacheKey);
        }

        if (!sessionsData) {
          const response = await AsyncOptimization.get("/api/sessions");
          sessionsData = response.sessions;

          // Im Cache speichern, aber mit kurzer TTL
          DataOptimization.cacheSet(cacheKey, sessionsData, 30000); // 30 Sekunden
        }

        // Optimierte Prüfung, ob sich etwas geändert hat, mittels immutableUpdate
        if (sessions.value.length !== sessionsData.length) {
          // Anzahl hat sich geändert, vollständige Aktualisierung
          console.log("Sessions-Anzahl hat sich geändert, aktualisiere Liste");
          sessions.value = DataOptimization.immutableCopy(sessionsData);
          return;
        }

        // Prüfen, ob sich die Titel geändert haben
        let titlesChanged = false;

        for (let i = 0; i < sessions.value.length; i++) {
          if (sessions.value[i].title !== sessionsData[i].title) {
            titlesChanged = true;
            console.log(
              `Titel für Session ${sessions.value[i].id} hat sich geändert: "${sessions.value[i].title}" -> "${sessionsData[i].title}"`,
            );
            break;
          }
        }

        // Nur aktualisieren, wenn sich etwas geändert hat
        if (titlesChanged) {
          console.log("Session-Titel wurden aktualisiert");
          sessions.value = DataOptimization.immutableCopy(sessionsData);
        }
      } catch (error) {
        console.error("Error loading sessions:", error);
      }
    }, 1000);

    const startNewSession = async () => {
      try {
        // MOTD für neue Unterhaltungen zurücksetzen
        motdDismissed.value = false;
        localStorage.removeItem("motdDismissed");

        isLoading.value = true;
        const response = await AsyncOptimization.post("/api/session", {
          title: "Neue Unterhaltung",
        });

        await loadSessions();
        await loadSession(response.session_id);

        // Zur Chat-Ansicht wechseln
        activeView.value = "chat";
      } catch (error) {
        console.error("Error starting new session:", error);
      } finally {
        isLoading.value = false;
      }
    };

    const deleteSession = async (sessionId) => {
      if (!confirm("Möchten Sie diese Unterhaltung wirklich löschen?")) {
        return;
      }

      try {
        await AsyncOptimization.delete(`/api/session/${sessionId}`);

        if (currentSessionId.value === sessionId) {
          currentSessionId.value = null;
          messages.value = [];
          // Entferne auch aus dem localStorage
          localStorage.removeItem("lastActiveSession");
        }

        // Cache für die gelöschte Session entfernen
        DataOptimization.cacheDelete(`session_${sessionId}`);

        // Cache für die Sessionliste zurücksetzen
        DataOptimization.cacheDelete("all_sessions");

        await loadSessions();
      } catch (error) {
        console.error("Error deleting session:", error);
      }
    };

    // Memoize formatMessage für bessere Performance
    const formatMessage = DataOptimization.memoize(
      (text) => {
        return marked.parse(text);
      },
      (text) => `format_${text.substr(0, 50)}`,
      60000,
    ); // 1 Minute Cache

    const scrollToBottom = AsyncOptimization.throttle(() => {
      if (chatMessages.value) {
        const { scrollHeight, clientHeight } = chatMessages.value;

        // Sanftes Scrollen, wenn wir nicht zu weit vom Ende entfernt sind
        const isNearBottom =
          chatMessages.value.scrollTop + clientHeight > scrollHeight - 300;

        if (isNearBottom) {
          // Sanftes Scrollen mit Animation
          chatMessages.value.scrollTo({
            top: scrollHeight,
            behavior: "smooth",
          });
        } else {
          // Sofortiges Scrollen, wenn wir weit vom Ende entfernt sind
          chatMessages.value.scrollTop = scrollHeight;
        }
      }
    }, 100);

    /**
     * Aktualisiert den Titel einer bestimmten Session
     * @param {number} sessionId - Die ID der zu aktualisierenden Session
     * @returns {boolean} - Erfolg der Aktualisierung
     */
    const updateSessionTitle = AsyncOptimization.debounce(async (sessionId) => {
      if (!sessionId) {
        console.warn("Keine Session-ID zum Aktualisieren angegeben");
        return false;
      }

      try {
        console.log(`Titel für Session ${sessionId} wird aktualisiert...`);

        const response = await AsyncOptimization.post(
          `/api/session/${sessionId}/update-title`,
        );

        if (response && response.new_title) {
          console.log(
            `Session ${sessionId} Titel aktualisiert zu: "${response.new_title}"`,
          );

          // Cache für die Sessionliste zurücksetzen
          DataOptimization.cacheDelete("all_sessions");

          // Aktualisiere auch die Session-Liste
          await loadSessions();
          return true;
        } else {
          console.warn("Keine neue Titel-Information vom Server erhalten");
          return false;
        }
      } catch (error) {
        console.error(
          `Fehler beim Aktualisieren des Titels für Session ${sessionId}:`,
          error,
        );
        return false;
      }
    }, 500);

    /**
     * Aktualisiert alle Sitzungen (kann als regelmäßiger Job verwendet werden)
     */
    const updateAllSessionTitles = async () => {
      if (!sessions.value || sessions.value.length === 0) {
        console.log("Keine Sessions zum Aktualisieren vorhanden");
        return;
      }

      try {
        // Lade die aktuelle Session-Liste
        await loadSessions();

        // Beginne mit der aktuellen Session, falls vorhanden
        if (currentSessionId.value) {
          await updateSessionTitle(currentSessionId.value);
        }

        console.log("Alle Session-Titel wurden aktualisiert");
      } catch (error) {
        console.error("Fehler beim Aktualisieren aller Session-Titel:", error);
      }
    };

    /**
     * Lädt die aktuelle Session neu (für Feedback-Funktionalität)
     */
    const reloadCurrentSession = async () => {
      if (currentSessionId.value) {
        try {
          console.log(`Lade aktuelle Session ${currentSessionId.value} neu...`);

          // Cache für diese Session zurücksetzen
          DataOptimization.cacheDelete(`session_${currentSessionId.value}`);

          await loadSession(currentSessionId.value);
          return true;
        } catch (error) {
          console.error("Fehler beim Neuladen der aktuellen Session:", error);
          return false;
        }
      }
      return false;
    };

    // MOTD-Funktionen
    const dismissMotd = () => {
      motdDismissed.value = true;
      localStorage.setItem("motdDismissed", "true");
    };

    // Memoize formatMotdContent für bessere Performance
    const formatMotdContent = DataOptimization.memoize(
      (content) => {
        if (!content) return "";

        // Einfache Markdown-Formatierung
        return content
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\n\n/g, "<br/><br/>")
          .replace(/\n-\s/g, "<br/>• ");
      },
      (content) => `motd_format_${content?.substr(0, 50)}`,
    );

    // Farbthema für MOTD anwenden mit reaktiver Aktualisierung
    const applyColorTheme = () => {
      if (
        selectedColorTheme.value !== "custom" &&
        colorThemes[selectedColorTheme.value]
      ) {
        const theme = colorThemes[selectedColorTheme.value];

        if (motdConfig.value) {
          DOMBatch.setStyle(motdConfig.value, {
            backgroundColor: theme.backgroundColor,
            borderColor: theme.borderColor,
            color: theme.textColor,
          });
        }
      }
    };

    // Initialize chat functionality
    const chatFunctions = setupChat({
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
      motdDismissed,
    });

    // Initialize feedback functionality
    const feedbackFunctions = setupFeedback({
      messages,
      currentSessionId,
      showFeedbackDialog,
      feedbackComment,
      feedbackMessage,
    });

    // Initialize admin functionality
    const adminFunctions = setupAdmin({
      token,
      userRole,
      isLoading,
    });

    // Initialize settings functionality
    const settingsFunction = setupSettings({
      token,
    });

    // Initialize source references functionality
    const sourceReferences = setupSourceReferences({
      token,
      messages,
      isLoading,
    });

    // Extrahiere die toggleSettings-Funktion aus dem settingsFunction-Objekt
    const { toggleSettings } = settingsFunction;

    // UI-Navigation Funktionen
    // Aktualisierte toggleView Funktion - Öffnet Barrierefreiheitseinstellungen für alle Benutzer
    const toggleView = () => {
      // Das Zahnrad-Symbol unten öffnet für alle Benutzer die Barrierefreiheitseinstellungen
      toggleSettings();
    };

    // Neue Funktion - Wechselt für Admins zum Admin-Bereich
    const toggleAdminView = () => {
      if (userRole.value === "admin") {
        // Scroll-Position speichern, bevor zwischen Ansichten gewechselt wird
        if (chatMessages.value && activeView.value === "chat") {
          scrollPositions.set("chat", chatMessages.value.scrollTop);
        }

        // Wechsel zwischen Chat und Admin
        activeView.value = activeView.value === "chat" ? "admin" : "chat";

        // Beim Wechsel zum Chat Scroll-Position wiederherstellen
        if (activeView.value === "chat") {
          nextTick().then(() => {
            if (chatMessages.value && scrollPositions.has("chat")) {
              chatMessages.value.scrollTop = scrollPositions.get("chat");
            }
          });
        }
      }
    };

    // Hilfsfunktion für admin Tab-Titel
    const getAdminTabTitle = () => {
      switch (adminFunctions.adminTab.value) {
        case "users":
          return "Benutzerverwaltung";
        case "system":
          return "Systemüberwachung";
        case "feedback":
          return "Feedback-Analyse";
        case "motd":
          return "Message of the Day";
        default:
          return "Administration";
      }
    };

    // Laden der MOTD mit Cache-Optimierung
    const loadMotd = async () => {
      try {
        // Versuche zuerst, MOTD aus dem Cache zu laden
        const cachedMotd = DataOptimization.cacheGet("motd");

        if (cachedMotd) {
          motd.value = cachedMotd;
        } else {
          const response = await AsyncOptimization.get("/api/motd", {
            priority: 5, // Höhere Priorität, aber nicht so hoch wie Auth
            retry: true,
          });

          motd.value = response;

          // Cache für 10 Minuten
          DataOptimization.cacheSet("motd", response, 10 * 60 * 1000);
        }

        console.log("MOTD geladen:", motd.value);

        // Bestimme Farbthema basierend auf aktuellen MOTD-Farben
        if (motd.value && motd.value.style) {
          // Finde passendes Thema oder setze auf custom
          let matchFound = false;
          for (const [theme, colors] of Object.entries(colorThemes)) {
            if (colors.backgroundColor === motd.value.style.backgroundColor) {
              selectedColorTheme.value = theme;
              matchFound = true;
              break;
            }
          }
          if (!matchFound) {
            selectedColorTheme.value = "custom";
          }
        }
      } catch (error) {
        console.error("Fehler beim Laden der MOTD:", error);
      }
    };

    // Memoize formatMessageWithSources für bessere Performance
    const formatMessageWithSources = DataOptimization.memoize(
      (text) => {
        if (!text) return "";

        // Prüfen, ob die Nachricht Quellenverweise enthält
        if (sourceReferences.hasSourceReferences(text)) {
          // Wenn ja, mit Quellenhervorhebung formatieren
          const formattedText =
            sourceReferences.formatMessageWithSourceHighlighting(text);
          return marked.parse(formattedText);
        } else {
          // Wenn nicht, normale Formatierung verwenden
          return formatMessage(text);
        }
      },
      (text) => `format_sources_${text?.substr(0, 50)}`,
      60000,
    ); // 1 Minute Cache

    // Event-Listener für Seiten-Reload mit Debounce
    const handleBeforeUnload = AsyncOptimization.debounce(() => {
      // Aktuelle Session speichern, bevor die Seite neu geladen wird
      if (currentSessionId.value) {
        saveCurrentSessionToStorage(currentSessionId.value);
      }

      // Performance-Metriken speichern
      PerformanceMetrics.saveMeasurementsToStorage();
    }, 100);

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Virtualisiertes Rendering für Chat-Nachrichten vorbereiten
    let messagesVirtualList = null;

    // Nachricht-Cache für virtualisiertes Rendering
    const messageCache = new Map();

    // Initialize
    onMounted(async () => {
      // Performance-Messung beenden
      PerformanceMetrics.endMeasure("app_initialization", "app_init_complete");

      // DOM-Messung starten
      PerformanceMetrics.measureDOMChanges("#app", "app_dom_changes");
      PerformanceMetrics.measureScrollPerformance(
        "#chatMessages",
        "chat_scroll_performance",
      );

      setupAxios();

      // Chat-Container-Element für virtualisiertes Rendering vorbereiten
      if (chatMessages.value) {
        messagesVirtualList = DataOptimization.initVirtualList(
          "chat_messages",
          [],
          {
            itemHeight: 80, // Geschätzte Durchschnittshöhe einer Nachricht
            overscan: 5,
          },
        );

        // Scroll-Event-Listener registrieren
        DataOptimization.registerVirtualListEvents(
          "chat_messages",
          chatMessages.value,
          renderVisibleMessages,
        );
      }

      if (token.value) {
        // Parallele Ausführung von unabhängigen Anfragen
        await Promise.all([loadSessions(), adminFunctions.loadUserRole()]);

        // Versuche, die letzte aktive Session wiederherzustellen
        await restoreLastActiveSession();
      }

      // MOTD laden (auch wenn nicht eingeloggt)
      loadMotd();

      // Session neu laden Funktion global verfügbar machen
      window.reloadCurrentSession = reloadCurrentSession;

      // HINZUGEFÜGT: Mache die Session-Titel-Update-Funktionen global verfügbar
      window.updateSessionTitle = updateSessionTitle;
      window.updateAllSessionTitles = updateAllSessionTitles;

      // Automatische Session-Aktualisierung mit optimiertem Intervall
      const sessionRefreshInterval = setInterval(async () => {
        if (token.value && activeView.value === "chat" && !isStreaming.value) {
          await loadSessions();
        }

        // Performance-Metriken aktualisieren
        const stats = PerformanceMetrics.getStats("app_dom_changes", 10000);

        // Bei hoher DOM-Aktivität das Intervall anpassen
        if (stats.count > 50 && sessionRefreshInterval === 10000) {
          clearInterval(sessionRefreshInterval);
          setInterval(async () => {
            if (
              token.value &&
              activeView.value === "chat" &&
              !isStreaming.value
            ) {
              await loadSessions();
            }
          }, 15000); // Längeres Intervall bei hoher Aktivität
        }
      }, 10000);

      // HINZUGEFÜGT: Regelmäßige Aktualisierung der Sitzungstitel mit optimiertem Timer
      setInterval(async () => {
        if (
          token.value &&
          activeView.value === "chat" &&
          currentSessionId.value
        ) {
          // Versuche die aktuelle Session zu aktualisieren
          if (
            window.updateSessionTitle &&
            typeof window.updateSessionTitle === "function"
          ) {
            try {
              await window.updateSessionTitle(currentSessionId.value);
            } catch (e) {
              console.error(
                "Fehler bei der planmäßigen Titelaktualisierung:",
                e,
              );
            }
          }
        }
      }, 30000); // Alle 30 Sekunden

      // Clear messages when auth state changes
      watch(token, (newValue) => {
        if (!newValue) {
          messages.value = [];
          currentSessionId.value = null;
          userRole.value = "user";
          activeView.value = "chat";
          localStorage.removeItem("lastActiveSession");

          // Cache leeren
          DataOptimization.cacheClear();
        } else {
          // Wenn sich der Token ändert (z.B. nach Login), Benutzerrolle laden
          adminFunctions.loadUserRole();
        }
      });

      // Clear error message when auth mode changes
      watch(authMode, () => {
        errorMessage.value = "";
        successMessage.value = "";
      });

      // EventSource bereinigen, wenn die Komponente zerstört wird
      window.addEventListener("beforeunload", () => {
        if (eventSource.value) {
          eventSource.value.close();
        }
      });

      // Stellen Sie die loadMotd-Funktion global zur Verfügung
      window.loadMotd = loadMotd;

      // Virtuelle Liste aktualisieren, wenn sich die Nachrichten ändern
      watch(messages, (newMessages) => {
        if (messagesVirtualList) {
          DataOptimization.updateVirtualListItems("chat_messages", newMessages);

          // Rendere sichtbare Nachrichten
          if (chatMessages.value) {
            renderVisibleMessages({
              visibleItems: DataOptimization.getVirtualListVisibleItems(
                "chat_messages",
                chatMessages.value.scrollTop,
                chatMessages.value.clientHeight,
              ).visibleItems,
            });
          }
        }
      });
    });

    /**
     * Rendert nur die sichtbaren Chat-Nachrichten
     * @param {Object} data - Daten über sichtbare Elemente
     */
    const renderVisibleMessages = (data) => {
      if (!data || !data.visibleItems) return;

      // DOM-Batch verwenden, um Rendering zu optimieren
      DOMBatch.groupOperations(() => {
        data.visibleItems.forEach((item) => {
          const index = item.index;
          const message = messages.value[index];

          if (!message) return;

          // Unique ID für jede Nachricht
          const messageId = `message_${message.id || index}`;
          const messageElement = document.getElementById(messageId);

          if (messageElement) {
            // Element existiert bereits, nur aktualisieren wenn nötig
            if (
              !messageCache.has(messageId) ||
              messageCache.get(messageId) !== message.message
            ) {
              // Nachrichteninhalt aktualisieren
              const contentElement =
                messageElement.querySelector(".message-content");
              if (contentElement) {
                // Cached formatierte Nachrichten verwenden
                const formattedContent = message.is_user
                  ? formatMessage(message.message)
                  : formatMessageWithSources(message.message);

                // Inhalt nur setzen, wenn er sich geändert hat
                if (contentElement.innerHTML !== formattedContent) {
                  DOMBatch.setText(contentElement, formattedContent);
                }
              }

              // Cache aktualisieren
              messageCache.set(messageId, message.message);
            }
          }
        });
      });
    };

    return {
      // Auth state
      token,
      email,
      password,
      authMode,
      loading,
      errorMessage,
      successMessage,

      // Berechnete Eigenschaften
      isLoggedIn,
      isAdmin,

      // Auth functions
      login,
      register,
      resetPassword,
      logout,

      // View state
      activeView,

      // Chat state
      sessions,
      currentSessionId,
      messages,
      question,
      isLoading,
      chatMessages,
      isStreaming,

      // Chat functions
      loadSessions,
      loadSession,
      startNewSession,
      deleteSession,
      formatMessage,
      scrollToBottom,

      // Session persistence
      saveCurrentSessionToStorage,
      restoreLastActiveSession,

      // Chat streaming functionality
      ...chatFunctions,

      // Feedback functionality
      ...feedbackFunctions,
      showFeedbackDialog,
      feedbackComment,

      // Admin functionality
      ...adminFunctions,
      userRole,
      getAdminTabTitle,
      toggleView,
      toggleAdminView,

      // Settings functionality
      ...settingsFunction,

      // Quellenreferenzen
      ...sourceReferences,
      formatMessageWithSources,

      // MOTD
      motd,
      motdDismissed,
      loadMotd,
      dismissMotd,
      formatMotdContent,

      // MOTD Editor
      selectedColorTheme,
      applyColorTheme,

      // Session title functionality
      updateSessionTitle,
      updateAllSessionTitles,
      reloadCurrentSession,
    };
  },
}).mount("#app");
