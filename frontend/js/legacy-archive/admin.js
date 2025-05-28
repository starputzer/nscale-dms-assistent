/**
 * @deprecated Diese Legacy-Komponente ist veraltet und wird in Kürze entfernt.
 * Verwende stattdessen die Vue 3 SFC-Implementierung.
 * Geplantes Entfernungsdatum: 2025-06-10
 */

/**
 * Stellt die Admin-Funktionalität bereit
 * @param {Object} options - Konfigurationsoptionen
 * @returns {Object} - Admin-Funktionen und -Zustand
 */

// Monitoring für Legacy-Code-Nutzung
function trackLegacyUsage(componentName, action) {
  if (typeof window.telemetry !== "undefined") {
    window.telemetry.trackEvent("legacy_code_usage", {
      component: componentName,
      action: action,
      timestamp: new Date().toISOString(),
    });
  }
}

// Tracking bei Modulinitialisierung
trackLegacyUsage("admin", "initialize");

export function setupAdmin(options) {
  const { token, userRole, isLoading } = options;

  // Admin-State (Vue Reactive Referenzen)
  const showAdminPanel = Vue.ref(false);
  const adminTab = Vue.ref("users");
  const adminUsers = Vue.ref([]);
  const newUser = Vue.ref({ email: "", password: "", role: "user" });
  const systemStats = Vue.ref({});
  const feedbackStats = Vue.ref({});
  const negativeFeedback = Vue.ref([]);
  const abTests = Vue.ref([]);
  // Speichere die ID des aktuellen Benutzers
  const currentUserId = Vue.ref(null);

  // MOTD-Konfiguration
  const motdConfig = Vue.ref({
    enabled: true,
    format: "markdown",
    content: "",
    style: {
      backgroundColor: "#fff3cd",
      borderColor: "#ffeeba",
      textColor: "#856404",
      iconClass: "info-circle",
    },
    display: {
      position: "top",
      dismissible: true,
      showOnStartup: false,
      showInChat: true,
    },
  });

  // Watch für adminTab, um automatisch Daten zu laden
  Vue.watch(
    () => adminTab.value,
    (newTab) => {
      console.log(`Admin-Tab gewechselt zu: ${newTab}`);
      if (newTab === "users") {
        loadUsers();
      } else if (newTab === "system") {
        loadSystemStats();
      } else if (newTab === "feedback") {
        loadFeedbackStats();
        loadNegativeFeedback();
      } else if (newTab === "motd") {
        loadMotdConfig();
      } else if (newTab === "abtests") {
        loadABTests();
      }
    },
  );

  /**
   * Lädt die Benutzerrolle vom Server
   */
  const loadUserRole = async () => {
    try {
      if (token.value) {
        console.log("Token vorhanden, lade Benutzerrolle...");
        const response = await axios.get("/api/user/role");
        console.log("Server-Antwort:", response.data);
        userRole.value = response.data.role;

        // Speichere auch die Benutzer-ID, wenn sie in der Antwort enthalten ist
        if (response.data.user_id) {
          currentUserId.value = response.data.user_id;
        }
        console.log(`Benutzerrolle geladen: ${userRole.value}`);

        // Wenn der Benutzer ein Admin ist, lade die Benutzerliste
        if (userRole.value === "admin") {
          await loadUsers();
        }
      }
    } catch (error) {
      console.error("Fehler beim Laden der Benutzerrolle:", error);
      userRole.value = "user"; // Fallback zur Standardrolle
    }
  };

  /**
   * Lädt alle Benutzer (nur für Administratoren)
   */
  const loadUsers = async () => {
    try {
      if (userRole.value === "admin") {
        isLoading.value = true;
        console.log("Lade Benutzerliste...");
        const response = await axios.get("/api/admin/users");

        // Prüfe, ob die Antwort eine leere Liste oder null enthält
        if (response.data.users && response.data.users.length > 0) {
          adminUsers.value = response.data.users;
          console.log(
            `${adminUsers.value.length} Benutzer geladen:`,
            adminUsers.value,
          );
        } else {
          console.warn(
            "Keine Benutzer vom Server zurückgegeben oder leere Liste",
          );
          adminUsers.value = [];
        }
      }
    } catch (error) {
      console.error("Fehler beim Laden der Benutzer:", error);

      // Zeige Fehlermeldung
      if (error.response && error.response.status === 403) {
        alert("Sie haben keine Berechtigung für diese Aktion.");
      } else {
        alert(
          "Fehler beim Laden der Benutzerliste: " +
            (error.response?.data?.detail || error.message),
        );
      }
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Erstellt einen neuen Benutzer (nur für Administratoren)
   */
  const createUser = async () => {
    try {
      if (userRole.value === "admin") {
        // Validierung
        if (!newUser.value.email || !newUser.value.password) {
          alert("Bitte füllen Sie alle Pflichtfelder aus.");
          return;
        }

        isLoading.value = true;
        console.log("Erstelle neuen Benutzer:", newUser.value.email);

        await axios.post("/api/admin/users", newUser.value);
        await loadUsers();

        // Erfolgsbenachrichtigung
        alert(`Benutzer ${newUser.value.email} wurde erfolgreich erstellt.`);

        // Formular zurücksetzen
        newUser.value = { email: "", password: "", role: "user" };
      }
    } catch (error) {
      console.error("Fehler beim Erstellen des Benutzers:", error);

      // Zeige Fehlermeldung
      if (error.response && error.response.status === 400) {
        alert("Benutzer existiert bereits oder ungültige Daten.");
      } else {
        alert(
          "Fehler beim Erstellen des Benutzers: " +
            (error.response?.data?.detail || error.message),
        );
      }
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Aktualisiert die Rolle eines Benutzers (nur für Administratoren)
   */
  const updateUserRole = async (userId, newRole) => {
    try {
      if (userRole.value === "admin") {
        // Überprüfe, ob der Admin versucht, seine eigene Rolle zu ändern
        if (userId === currentUserId.value) {
          alert("Sie können Ihre eigene Rolle nicht ändern.");
          // Lade die Benutzer neu, um ursprüngliche Rollen wiederherzustellen
          await loadUsers();
          return;
        }

        isLoading.value = true;
        console.log(`Aktualisiere Rolle für Benutzer ${userId} auf ${newRole}`);

        await axios.put(`/api/admin/users/${userId}/role`, { role: newRole });

        // Erfolgsbenachrichtigung
        alert(`Die Rolle des Benutzers wurde auf ${newRole} aktualisiert.`);

        await loadUsers();
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Benutzerrolle:", error);

      // Zeige Fehlermeldung
      alert(
        "Fehler beim Aktualisieren der Benutzerrolle: " +
          (error.response?.data?.detail || error.message),
      );

      // Lade die Liste neu, um den ursprünglichen Zustand wiederherzustellen
      await loadUsers();
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Löscht einen Benutzer (nur für Administratoren)
   */
  const deleteUser = async (userId) => {
    try {
      if (userRole.value === "admin") {
        // Überprüfe, ob der Admin versucht, sich selbst zu löschen
        if (userId === currentUserId.value) {
          alert("Sie können Ihr eigenes Konto nicht löschen.");
          return;
        }

        // Überprüfe, ob der zu löschende Benutzer ein Admin ist
        const userToDelete = adminUsers.value.find(
          (user) => user.id === userId,
        );
        if (userToDelete && userToDelete.role === "admin") {
          alert("Administratoren können nicht gelöscht werden.");
          return;
        }

        if (!confirm("Möchten Sie diesen Benutzer wirklich löschen?")) {
          return;
        }

        isLoading.value = true;
        await axios.delete(`/api/admin/users/${userId}`);

        // Erfolgsbenachrichtigung
        alert("Benutzer wurde erfolgreich gelöscht.");

        await loadUsers();
      }
    } catch (error) {
      console.error("Fehler beim Löschen des Benutzers:", error);

      // Zeige Fehlermeldung
      if (error.response) {
        if (error.response.status === 400) {
          alert(
            "Der Benutzer kann nicht gelöscht werden: " +
              error.response.data.detail,
          );
        } else if (error.response.status === 403) {
          alert("Sie haben keine Berechtigung zum Löschen dieses Benutzers.");
        } else {
          alert(
            "Fehler beim Löschen des Benutzers: " +
              (error.response.data.detail || error.message),
          );
        }
      } else {
        alert("Fehler beim Löschen des Benutzers: " + error.message);
      }
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Lädt Systemstatistiken (nur für Administratoren)
   */
  const loadSystemStats = async () => {
    try {
      if (userRole.value === "admin") {
        isLoading.value = true;
        console.log("Lade Systemstatistiken...");

        const response = await axios.get("/api/admin/stats");
        systemStats.value = response.data.stats;

        console.log("Systemstatistiken geladen:", systemStats.value);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Systemstatistiken:", error);

      // Zeige Fehlermeldung
      alert(
        "Fehler beim Laden der Systemstatistiken: " +
          (error.response?.data?.detail || error.message),
      );
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Lädt Feedback-Statistiken
   */
  const loadFeedbackStats = async () => {
    try {
      if (userRole.value === "admin") {
        isLoading.value = true;
        console.log("Lade Feedback-Statistiken...");

        const response = await axios.get("/api/admin/feedback/stats");
        feedbackStats.value = response.data.stats;

        console.log("Feedback-Statistiken geladen:", feedbackStats.value);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Feedback-Statistiken:", error);

      // Zeige Fehlermeldung
      alert(
        "Fehler beim Laden der Feedback-Statistiken: " +
          (error.response?.data?.detail || error.message),
      );
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Lädt negatives Feedback mit Kommentaren
   */
  const loadNegativeFeedback = async () => {
    try {
      if (userRole.value === "admin") {
        isLoading.value = true;
        console.log("Lade negatives Feedback...");

        const response = await axios.get("/api/admin/feedback/negative");
        negativeFeedback.value = response.data.feedback;

        console.log("Negatives Feedback geladen:", negativeFeedback.value);
      }
    } catch (error) {
      console.error("Fehler beim Laden des negativen Feedbacks:", error);

      // Zeige Fehlermeldung
      alert(
        "Fehler beim Laden des negativen Feedbacks: " +
          (error.response?.data?.detail || error.message),
      );
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Lädt die MOTD (Message of the Day) neu
   */
  const reloadMotd = async () => {
    try {
      if (userRole.value === "admin") {
        isLoading.value = true;
        console.log("Lade MOTD neu...");

        await axios.post("/api/admin/reload-motd");

        // Lade die globale MOTD auch neu
        if (typeof window.loadMotd === "function") {
          await window.loadMotd();
        }

        alert("MOTD wurde erfolgreich neu geladen");
      }
    } catch (error) {
      console.error("Fehler beim Neuladen der MOTD:", error);
      alert(
        "Fehler beim Neuladen der MOTD: " +
          (error.response?.data?.detail || error.message),
      );
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Löscht den LLM-Cache
   */
  const clearModelCache = async () => {
    try {
      if (
        userRole.value === "admin" &&
        confirm("Möchten Sie wirklich den Modell-Cache leeren?")
      ) {
        isLoading.value = true;
        console.log("Leere Modell-Cache...");

        const response = await axios.post("/api/admin/clear-cache");
        alert(response.data.message || "Cache wurde geleert");
      }
    } catch (error) {
      console.error("Fehler beim Leeren des Modell-Caches:", error);
      alert(
        "Fehler beim Leeren des Caches: " +
          (error.response?.data?.detail || error.message),
      );
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Löscht den Embedding-Cache
   */
  const clearEmbeddingCache = async () => {
    try {
      if (
        userRole.value === "admin" &&
        confirm("Möchten Sie wirklich den Embedding-Cache leeren?")
      ) {
        isLoading.value = true;
        console.log("Leere Embedding-Cache...");

        await axios.post("/api/admin/clear-embedding-cache");
        alert("Embedding-Cache wurde erfolgreich geleert");
      }
    } catch (error) {
      console.error("Fehler beim Leeren des Embedding-Caches:", error);
      alert(
        "Fehler beim Leeren des Embedding-Caches: " +
          (error.response?.data?.detail || error.message),
      );
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Lädt die aktuelle MOTD-Konfiguration
   */
  const loadMotdConfig = async () => {
    try {
      if (userRole.value === "admin") {
        isLoading.value = true;
        console.log("Lade MOTD-Konfiguration...");

        const response = await axios.get("/api/motd");

        // Tiefe Kopie der Konfiguration erstellen
        motdConfig.value = JSON.parse(JSON.stringify(response.data));

        console.log("MOTD-Konfiguration geladen:", motdConfig.value);
      }
    } catch (error) {
      console.error("Fehler beim Laden der MOTD-Konfiguration:", error);
      alert(
        "Fehler beim Laden der MOTD-Konfiguration: " +
          (error.response?.data?.detail || error.message),
      );
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Setzt die MOTD-Konfiguration auf Standardwerte zurück
   */
  const resetMotdConfig = () => {
    if (!confirm("Möchten Sie die MOTD-Konfiguration wirklich zurücksetzen?")) {
      return;
    }

    motdConfig.value = {
      enabled: true,
      format: "markdown",
      content:
        "🛠️ **BETA-VERSION: Lokaler KI-Assistent für nscale**\n\nDieser Assistent beantwortet Fragen zur Nutzung der nscale DMS-Software auf Basis interner Informationen.\n\n🔒 **Wichtige Hinweise:**\n- Alle Datenverarbeitungen erfolgen **ausschließlich lokal im Landesnetz Berlin**.\n- Es besteht **keine Verbindung zum Internet** – Ihre Eingaben verlassen niemals das System.\n- **Niemand außer Ihnen** hat Zugriff auf Ihre Eingaben oder Fragen.\n- Die Antworten werden von einer KI generiert – **Fehlinformationen sind möglich**.\n- Bitte geben Sie **keine sensiblen oder personenbezogenen Daten** ein.\n\n🧠 Der Assistent befindet sich in der Erprobung und wird stetig weiterentwickelt.",
      style: {
        backgroundColor: "#fff3cd",
        borderColor: "#ffeeba",
        textColor: "#856404",
        iconClass: "info-circle",
      },
      display: {
        position: "top",
        dismissible: true,
        showOnStartup: false,
        showInChat: true,
      },
    };
  };

  /**
   * Speichert die MOTD-Konfiguration
   */
  const saveMotdConfig = async () => {
    try {
      if (userRole.value === "admin") {
        isLoading.value = true;
        console.log("Speichere MOTD-Konfiguration...");

        // Validierung
        if (!motdConfig.value.content.trim()) {
          alert("Der MOTD-Inhalt darf nicht leer sein.");
          isLoading.value = false;
          return;
        }

        await axios.post("/api/admin/update-motd", motdConfig.value);

        // Lade die aktuelle MOTD neu
        if (typeof window.loadMotd === "function") {
          await window.loadMotd();
        }

        alert("MOTD-Konfiguration erfolgreich gespeichert!");
      }
    } catch (error) {
      console.error("Fehler beim Speichern der MOTD-Konfiguration:", error);
      alert(
        `Fehler beim Speichern: ${error.response?.data?.detail || error.message}`,
      );
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Formatiert den MOTD-Inhalt für die Vorschau
   */
  const formatMotdContent = (content) => {
    if (!content) return "";

    // Einfache Markdown-Formatierung
    return content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n\n/g, "<br/><br/>")
      .replace(/\n-\s/g, "<br/>• ");
  };

  /**
   * Lädt A/B-Tests und deren Status
   */
  const loadABTests = () => {
    try {
      if (userRole.value === "admin") {
        isLoading.value = true;
        console.log("Lade A/B-Tests...");

        // A/B-Testing-System global verfügbar?
        if (window.abTesting && window.abTesting.listAvailableTests) {
          const availableTests = window.abTesting.listAvailableTests();

          // Tests mit aktuellen Varianten anreichern
          abTests.value = availableTests.map((test) => ({
            ...test,
            currentVariant:
              window.abTesting.getUserTestVariant(test.id) ||
              "Nicht zugewiesen",
          }));

          console.log("A/B-Tests geladen:", abTests.value);
        } else {
          console.warn("A/B-Testing-System nicht verfügbar");
          abTests.value = [];
        }
      }
    } catch (error) {
      console.error("Fehler beim Laden der A/B-Tests:", error);
      alert("Fehler beim Laden der A/B-Tests: " + error.message);
    } finally {
      isLoading.value = false;
    }
  };

  return {
    // State
    userRole,
    showAdminPanel,
    adminTab,
    adminUsers,
    newUser,
    systemStats,
    feedbackStats,
    negativeFeedback,
    motdConfig,
    currentUserId,
    abTests,

    // Funktionen
    loadUserRole,
    loadUsers,
    createUser,
    updateUserRole,
    deleteUser,
    loadSystemStats,
    loadFeedbackStats,
    loadNegativeFeedback,
    reloadMotd,
    clearModelCache,
    clearEmbeddingCache,

    // MOTD-Funktionen
    loadMotdConfig,
    resetMotdConfig,
    saveMotdConfig,
    formatMotdContent,

    // A/B-Test-Funktionen
    loadABTests,
  };
}
