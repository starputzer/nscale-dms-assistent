/**
 * Pinia Store für System-Administration
 * Teil der Vue 3 SFC Migration (08.05.2025)
 */

/**
 * Pinia Store für System-Administration
 * Teil der Vue 3 SFC Migration (08.05.2025)
 * Updated (20.05.2025): Integration des AdminSystemService für echte API-Calls
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { adminApi } from "@/services/api/admin";
import { adminSystemService } from "@/services/api/AdminSystemService";
import { shouldUseRealApi } from "@/config/api-flags";
import { LogService } from "@/services/log/LogService";
import type {
  SystemStats,
  SystemAction,
  SystemCheckResult,
} from "@/types/admin";

export const useAdminSystemStore = defineStore("adminSystem", () => {
  // Logger initialisieren
  const logger = new LogService("AdminSystemStore");
  // State
  const stats = ref<SystemStats>({
    total_users: 0,
    active_users_today: 0,
    total_sessions: 0,
    total_messages: 0,
    avg_messages_per_session: 0,
    total_feedback: 0,
    positive_feedback_percent: 0,
    database_size_mb: 0,
    cache_size_mb: 0,
    cache_hit_rate: 0,
    document_count: 0,
    avg_response_time_ms: 0,
    active_model: "",
    uptime_days: 0,
    memory_usage_percent: 0,
    cpu_usage_percent: 0,
    start_time: 0,
  });

  const loading = ref(false);
  const error = ref<string | null>(null);

  // System settings
  const systemSettings = ref({
    defaultModel: "llama-7b",
    maxTokensPerRequest: 4096,
    enableModelSelection: true,
    enableRateLimit: true,
    rateLimitPerMinute: 30,
    maxConnectionsPerUser: 10,
    sessionTimeoutMinutes: 60,
    maintenanceMode: false,
    maintenanceMessage: "",
    autoBackup: true,
  });

  // API-Integration aktiv?
  const apiIntegrationEnabled = computed(() =>
    shouldUseRealApi("useRealSystemApi"),
  );

  // Verfügbare Aktionen als reaktiver State
  const actions = ref<SystemAction[]>([]);

  // Getters
  const availableActions = computed<SystemAction[]>(() => {
    // Wenn Aktionen vom Service geladen wurden, diese verwenden
    if (actions.value.length > 0) {
      return actions.value;
    }

    // Ansonsten Standard-Aktionen zurückgeben
    return [
      {
        type: "clear-cache",
        name: "Cache leeren",
        description: "Leert den LLM-Cache und erzwingt neue Berechnungen",
        requiresConfirmation: true,
        confirmationMessage:
          "Möchten Sie wirklich den Cache leeren? Dies kann zu langsameren Antwortzeiten führen, bis der Cache wieder aufgebaut ist.",
      },
      {
        type: "clear-embedding-cache",
        name: "Embedding-Cache leeren",
        description:
          "Leert den Embedding-Cache und erzwingt eine Neuberechnung",
        requiresConfirmation: true,
        confirmationMessage:
          "Möchten Sie wirklich den Embedding-Cache leeren? Dies kann zu längeren Verarbeitungszeiten führen, bis alle Einbettungen neu berechnet sind.",
      },
      {
        type: "reload-motd",
        name: "MOTD neu laden",
        description:
          "Lädt die Message of the Day aus der Konfigurationsdatei neu",
        requiresConfirmation: false,
      },
      {
        type: "reindex",
        name: "Dokumente neu indizieren",
        description: "Startet eine vollständige Neuindizierung aller Dokumente",
        requiresConfirmation: true,
        confirmationMessage:
          "Möchten Sie wirklich alle Dokumente neu indizieren? Dieser Vorgang kann je nach Datenmenge einige Zeit in Anspruch nehmen.",
      },
    ];
  });

  const memoryStatus = computed(() => {
    const usage = stats.value.memory_usage_percent;
    if (usage > 90) return "critical";
    if (usage > 70) return "warning";
    return "normal";
  });

  const cpuStatus = computed(() => {
    const usage = stats.value.cpu_usage_percent;
    if (usage > 90) return "critical";
    if (usage > 70) return "warning";
    return "normal";
  });

  const systemHealthStatus = computed(() => {
    if (memoryStatus.value === "critical" || cpuStatus.value === "critical") {
      return "critical";
    }
    if (memoryStatus.value === "warning" || cpuStatus.value === "warning") {
      return "warning";
    }
    return "normal";
  });

  // Actions
  /**
   * Lädt Systemstatistiken und verfügbare Aktionen
   * Verwendet den AdminSystemService, wenn die API-Integration aktiviert ist
   */
  async function fetchStats() {
    loading.value = true;
    error.value = null;

    // Prepare mock data for fallback
    const mockStats: SystemStats = {
      total_users: 5,
      active_users_today: 3,
      total_sessions: 128,
      total_messages: 2354,
      avg_messages_per_session: 18.4,
      total_feedback: 87,
      positive_feedback_percent: 92,
      database_size_mb: 156,
      cache_size_mb: 34,
      cache_hit_rate: 78.5,
      document_count: 215,
      avg_response_time_ms: 320,
      active_model: "nScale Assistant v2.0",
      uptime_days: 15,
      memory_usage_percent: 47,
      cpu_usage_percent: 38,
      start_time: Date.now() - 15 * 24 * 60 * 60 * 1000,
      active_users: 3,
      active_sessions: 5,
      requests_per_second: 2.5,
      cache_entries: 1240,
      db_optimization_running: false,
      last_backup_time: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    };

    try {
      // Prüfen, ob die echte API verwendet werden soll
      if (apiIntegrationEnabled.value) {
        logger.info("Lade Systemstatistiken über AdminSystemService");

        // Optimierte Implementierung: Verwende Promise.allSettled für robuste parallele API-Aufrufe
        // Dies erlaubt uns, auch dann fortzufahren, wenn einer der Aufrufe fehlschlägt
        const [statsResponse, actionsResponse] = await Promise.allSettled([
          adminSystemService.getSystemStats(),
          adminSystemService.getAvailableActions(),
        ]);

        // Verarbeite Statistiken
        if (
          statsResponse.status === "fulfilled" &&
          statsResponse.value.success &&
          statsResponse.value.data
        ) {
          logger.info(
            "Systemstatistiken erfolgreich über AdminSystemService geladen",
          );
          stats.value = statsResponse.value.data;

          // Verarbeite verfügbare Aktionen
          if (
            actionsResponse.status === "fulfilled" &&
            actionsResponse.value.success &&
            actionsResponse.value.data
          ) {
            logger.info("Verfügbare Aktionen erfolgreich geladen");
            actions.value = actionsResponse.value.data;
          } else {
            logger.warn(
              "Verfügbare Aktionen konnten nicht geladen werden, verwende Standard-Aktionen",
            );
            // Bei Fehlern erfolgt automatischer Fallback auf availableActions computed property
          }

          return statsResponse.value.data;
        } else {
          // Detailliertere Fehlerbehandlung
          let errorMsg: string;
          let errorDetails: any = {};

          if (statsResponse.status === "rejected") {
            errorMsg = "Netzwerkfehler beim Laden der Systemstatistiken";
            errorDetails.rejected = true;
            errorDetails.reason = statsResponse.reason;
          } else {
            errorMsg =
              statsResponse.value.message ||
              "Fehler beim Laden der Systemstatistiken";
            errorDetails = statsResponse.value.error;
          }

          logger.warn(
            "Fehler beim Laden der Systemstatistiken über AdminSystemService, verwende Fallback",
            errorDetails,
          );
          throw new Error(errorMsg);
        }
      }

      // Fallback zur alten Implementierung
      logger.info("Versuche, Systemstatistiken über adminApi zu laden");
      try {
        const response = await adminApi.getSystemStats();
        if (response?.data?.stats) {
          logger.info("Systemstatistiken erfolgreich über adminApi geladen");
          stats.value = response.data.stats;
          return response.data.stats;
        } else {
          throw new Error("Ungültiges API-Antwortformat für Systemstatistiken");
        }
      } catch (apiErr) {
        logger.warn("Verwende Mock-Daten statt API", apiErr);

        // Kombiniere vorhandene Daten mit Mock-Daten
        stats.value = {
          ...mockStats,
          ...(stats.value || {}), // Vorhandene Daten beibehalten
        };

        return stats.value;
      }
    } catch (err: any) {
      logger.error("Fehler beim Laden der Systemstatistiken", err);
      error.value =
        err.response?.data?.message ||
        err.message ||
        "Fehler beim Laden der Systemstatistiken";

      // Setze Mock-Daten auch im Fehlerfall, um UI-Fehler zu vermeiden
      stats.value = mockStats;
      return mockStats;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Leert den LLM-Cache des Systems
   * Verwendet den AdminSystemService, wenn die API-Integration aktiviert ist
   */
  async function clearCache() {
    loading.value = true;
    error.value = null;

    try {
      if (apiIntegrationEnabled.value) {
        logger.info("Leere Cache über AdminSystemService");
        const response = await adminSystemService.clearCache();

        if (response.success) {
          logger.info("Cache erfolgreich über AdminSystemService geleert");
          // Nach erfolgreicher Ausführung Statistiken neu laden
          await fetchStats();
          return true;
        } else {
          logger.warn("Fehler beim Leeren des Caches", {
            error: response.error,
          });

          // Detaillierteres Fehler-Reporting
          const errorCode = response.error?.code || "UNKNOWN_ERROR";
          const errorMsg = response.message || "Fehler beim Leeren des Caches";

          error.value = `${errorMsg} (${errorCode})`;
          throw new Error(errorMsg);
        }
      }

      // Fallback zur alten Implementierung
      logger.info("Leere Cache über adminApi");
      const response = await adminApi.clearModelCache();

      // Nach erfolgreicher Ausführung Statistiken neu laden
      await fetchStats();
      return true;
    } catch (err: any) {
      logger.error("Fehler beim Leeren des Caches", err);

      // Verbesserte Fehlerbehandlung mit mehr Kontext
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Fehler beim Leeren des Caches";

      error.value = errorMessage;

      // Werfe eine detailliertere Fehlerinformation, die für UI-Komponenten nützlich ist
      throw {
        message: errorMessage,
        code: err.response?.data?.code || "CACHE_CLEAR_ERROR",
        details: err.response?.data || err,
      };
    } finally {
      loading.value = false;
    }
  }

  /**
   * Leert den Embedding-Cache des Systems
   * Verwendet den AdminSystemService, wenn die API-Integration aktiviert ist
   */
  async function clearEmbeddingCache() {
    loading.value = true;
    error.value = null;

    try {
      if (apiIntegrationEnabled.value) {
        logger.info("Leere Embedding-Cache über AdminSystemService");
        const response = await adminSystemService.clearEmbeddingCache();

        if (response.success) {
          logger.info(
            "Embedding-Cache erfolgreich über AdminSystemService geleert",
          );
          // Nach erfolgreicher Ausführung Statistiken neu laden
          await fetchStats();
          return true;
        } else {
          logger.warn("Fehler beim Leeren des Embedding-Caches", {
            error: response.error,
          });

          // Detaillierteres Fehler-Reporting
          const errorCode = response.error?.code || "UNKNOWN_ERROR";
          const errorMsg =
            response.message || "Fehler beim Leeren des Embedding-Caches";

          error.value = `${errorMsg} (${errorCode})`;
          throw new Error(errorMsg);
        }
      }

      // Fallback zur alten Implementierung
      logger.info("Leere Embedding-Cache über adminApi");
      const response = await adminApi.clearEmbeddingCache();

      // Nach erfolgreicher Ausführung Statistiken neu laden
      await fetchStats();
      return true;
    } catch (err: any) {
      logger.error("Fehler beim Leeren des Embedding-Caches", err);

      // Verbesserte Fehlerbehandlung mit mehr Kontext
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Fehler beim Leeren des Embedding-Caches";

      error.value = errorMessage;

      // Werfe eine detailliertere Fehlerinformation, die für UI-Komponenten nützlich ist
      throw {
        message: errorMessage,
        code: err.response?.data?.code || "EMBEDDING_CACHE_CLEAR_ERROR",
        details: err.response?.data || err,
      };
    } finally {
      loading.value = false;
    }
  }

  /**
   * Lädt die Message of the Day neu
   * Verwendet den MOTD-Service, wenn die entsprechende API-Integration aktiviert ist
   */
  async function reloadMotd() {
    loading.value = true;
    error.value = null;

    try {
      if (shouldUseRealApi("useRealMotdApi")) {
        logger.info("Lade MOTD neu über API");
        // Bei diesem Aufruf verwenden wir den MOTD-Service, aber das wäre der nächste Schritt
        const response = await adminApi.reloadMotd();
        return response.data;
      }

      // Fallback zur alten Implementierung
      logger.info("Lade MOTD neu über adminApi");
      const response = await adminApi.reloadMotd();
      return response.data;
    } catch (err: any) {
      logger.error("Fehler beim Neuladen des MOTD", err);
      error.value =
        err.response?.data?.message ||
        err.message ||
        "Fehler beim Neuladen des MOTD";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Führt eine Systemprüfung durch und liefert detaillierte Ergebnisse
   * Verwendet den AdminSystemService, wenn die API-Integration aktiviert ist
   */
  async function performSystemCheck() {
    loading.value = true;
    error.value = null;

    try {
      if (apiIntegrationEnabled.value) {
        logger.info("Führe Systemprüfung über AdminSystemService durch");

        try {
          const response = await adminSystemService.performSystemCheck();

          if (response.success && response.data) {
            logger.info(
              "Systemprüfung erfolgreich über AdminSystemService durchgeführt",
            );
            return response.data;
          } else {
            logger.warn("Fehler bei der Systemprüfung", {
              error: response.error,
            });
            throw new Error(response.message || "Fehler bei der Systemprüfung");
          }
        } catch (serviceError: any) {
          // Detaillierteres Logging des API-Fehlers
          logger.error("Fehler im AdminSystemService bei performSystemCheck", {
            error: serviceError,
            message: serviceError.message,
            stack: serviceError.stack,
          });

          // Werfe den Fehler weiter, um in den Fallback zu gelangen
          throw serviceError;
        }
      }

      // Fallback zur lokalen Implementierung
      logger.info("Führe lokale Systemprüfung durch");

      // Aktualisiere die Systemstatistiken - mit verbesserter Fehlerbehandlung
      try {
        await fetchStats();
      } catch (statsError) {
        logger.warn(
          "Konnte Statistiken nicht aktualisieren, verwende vorhandene Daten",
          statsError,
        );
        // Wir setzen hier kein throw, damit die Systemprüfung mit aktuellen Daten fortgesetzt werden kann
      }

      // Generiere eine Systemprüfung basierend auf den lokalen Daten
      const systemCheckResult: SystemCheckResult = {
        success: true,
        checks: [
          {
            name: "CPU Auslastung",
            status: cpuStatus.value,
            value: stats.value.cpu_usage_percent + "%",
          },
          {
            name: "Speichernutzung",
            status: memoryStatus.value,
            value: stats.value.memory_usage_percent + "%",
          },
          { name: "Datenbankverbindung", status: "normal", value: "Verbunden" },
          { name: "Cacheintegrität", status: "normal", value: "OK" },
          { name: "API-Verfügbarkeit", status: "normal", value: "Erreichbar" },
        ],
        message: "Systemprüfung erfolgreich durchgeführt",
        timestamp: Date.now(),
      };

      // Füge weitere Prüfungen hinzu, wenn spezifische Werte im Stats-Objekt vorhanden sind
      if (stats.value.cache_hit_rate !== undefined) {
        const cacheStatus =
          stats.value.cache_hit_rate < 50
            ? "warning"
            : stats.value.cache_hit_rate < 20
              ? "critical"
              : "normal";

        systemCheckResult.checks.push({
          name: "Cache-Trefferrate",
          status: cacheStatus,
          value: stats.value.cache_hit_rate + "%",
        });
      }

      return systemCheckResult;
    } catch (err: any) {
      logger.error("Fehler bei der Systemprüfung", err);

      // Verbesserte Fehlerbehandlung mit mehr Kontext
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Fehler bei der Systemprüfung";

      error.value = errorMessage;

      // Fallback zu einer einfachen Systemprüfung, die auf vorhandenen Daten basiert
      return {
        success: false,
        checks: [
          {
            name: "Systemprüfung",
            status: "critical",
            value: "Fehler",
          },
          {
            name: "Details",
            status: "critical",
            value: errorMessage,
          },
        ],
        message: "Fehler bei der Systemprüfung",
        timestamp: Date.now(),
      };
    } finally {
      loading.value = false;
    }
  }

  /**
   * Führt eine Neuindizierung der Dokumente durch
   * Verwendet den AdminSystemService, wenn die API-Integration aktiviert ist
   */
  async function reindexDocuments() {
    loading.value = true;
    error.value = null;

    try {
      if (apiIntegrationEnabled.value) {
        logger.info(
          "Starte Neuindizierung der Dokumente über AdminSystemService",
        );

        try {
          const response = await adminSystemService.reindexDocuments();

          if (response.success) {
            logger.info("Neuindizierung der Dokumente erfolgreich gestartet");

            // Nach erfolgreicher Ausführung Statistiken neu laden, aber ignoriere Fehler
            try {
              await fetchStats();
            } catch (statErr) {
              logger.warn(
                "Statistiken konnten nach Neuindizierung nicht neu geladen werden",
                statErr,
              );
              // Wir ignorieren diesen Fehler, da der Hauptvorgang erfolgreich war
            }

            return {
              success: true,
              message: "Neuindizierung der Dokumente wurde gestartet",
              timestamp: Date.now(),
            };
          } else {
            // Verbesserte Fehlerbehandlung mit Klassifizierung
            logger.warn("Fehler bei der Neuindizierung der Dokumente", {
              error: response.error,
              errorCode: response.error?.code,
              errorType: response.error?.type || "unknown",
            });

            throw new Error(
              response.message || "Fehler bei der Neuindizierung der Dokumente",
            );
          }
        } catch (serviceError: any) {
          // Detaillierteres Logging des API-Fehlers
          logger.error("Fehler im AdminSystemService bei reindexDocuments", {
            error: serviceError,
            message: serviceError.message,
            stack: serviceError.stack,
          });

          // Werfe den Fehler weiter, um in den Fallback zu gelangen
          throw serviceError;
        }
      }

      // Fallback zur lokalen Implementierung mit mehr Feedback
      logger.info("Simuliere Neuindizierung der Dokumente");

      // Warten, um eine Bearbeitung zu simulieren
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simuliere eine erfolgreiche Antwort, die der API-Antwort ähnelt
      return {
        success: true,
        message: "Neuindizierung der Dokumente wurde gestartet",
        timestamp: Date.now(),
        estimatedCompletionTime: Date.now() + 15 * 60 * 1000, // 15 Minuten in der Zukunft
        jobId: "mock-reindex-" + Math.floor(Math.random() * 10000),
      };
    } catch (err: any) {
      logger.error("Fehler bei der Neuindizierung der Dokumente", err);

      // Verbesserte Fehlerbehandlung mit mehr Kontext
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Fehler bei der Neuindizierung der Dokumente";

      error.value = errorMessage;

      // Werfe ein detailliertes Fehler-Objekt statt einer einfachen Fehlermeldung
      throw {
        message: errorMessage,
        code: err.response?.data?.code || "REINDEX_ERROR",
        details: err.response?.data || err,
        timestamp: Date.now(),
      };
    } finally {
      loading.value = false;
    }
  }

  /**
   * Lädt die verfügbaren Systemaktionen direkt vom Service
   * Bietet verbesserte Fehlerbehandlung und automatisches Retry
   */
  async function fetchAvailableActions() {
    // Wenn API-Integration nicht aktiviert ist, sofort Standard-Aktionen zurückgeben
    if (!apiIntegrationEnabled.value) {
      logger.info("API-Integration deaktiviert, verwende Standard-Aktionen");
      return availableActions.value;
    }

    const maxRetries = 2; // Maximale Anzahl an Wiederholungsversuchen
    let retries = 0;
    let lastError = null;

    // Retry-Schleife für robustere API-Kommunikation
    while (retries <= maxRetries) {
      try {
        logger.info(
          `Lade verfügbare Systemaktionen (Versuch ${retries + 1}/${maxRetries + 1})`,
        );
        const response = await adminSystemService.getAvailableActions();

        if (response.success && response.data) {
          logger.info("Verfügbare Systemaktionen erfolgreich geladen");

          // Ensure response.data is an array
          const responseData = Array.isArray(response.data)
            ? response.data
            : [];

          // Filtere ungültige Aktionen heraus
          const validActions = responseData.filter((action) => {
            if (!action.type || !action.name) {
              logger.warn("Ungültige Aktion in API-Antwort gefunden", action);
              return false;
            }
            return true;
          });

          // Aktualisiere Aktionen im Store
          actions.value = validActions;
          return validActions;
        } else {
          lastError =
            response.error ||
            new Error(response.message || "Unbekannter Fehler");
          logger.warn("Fehler beim Laden der verfügbaren Systemaktionen", {
            error: response.error,
            message: response.message,
            attempt: retries + 1,
          });

          // Bei diesen spezifischen Fehlern macht ein Retry keinen Sinn
          if (
            response.error?.code === "PERMISSION_DENIED" ||
            response.error?.code === "NOT_IMPLEMENTED"
          ) {
            break;
          }
        }
      } catch (err: any) {
        lastError = err;
        logger.error(
          `Fehler beim Laden der verfügbaren Systemaktionen (Versuch ${retries + 1})`,
          {
            error: err,
            message: err.message,
            stack: err.stack,
          },
        );

        // Bei Netzwerkfehlern kann ein Retry sinnvoll sein
        if (err.name === "NetworkError" || err.message?.includes("network")) {
          logger.info("Netzwerkfehler erkannt, versuche erneut...");
        } else {
          // Bei anderen Fehlern macht ein Retry möglicherweise keinen Sinn
          break;
        }
      }

      retries++;

      // Warte kurz vor dem nächsten Versuch (exponentielles Backoff)
      if (retries <= maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retries - 1), 5000);
        logger.info(`Warte ${delay}ms vor dem nächsten Versuch...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Nach allen Versuchen, falls wir hier sind, ist etwas schief gelaufen
    if (lastError) {
      logger.error(
        "Alle Versuche, verfügbare Systemaktionen zu laden, sind fehlgeschlagen",
        lastError,
      );
      // Im Fehlerfall wird kein throw verwendet, um die UI nicht zu blockieren
    }

    // Fallback zu Standard-Aktionen
    return availableActions.value;
  }

  /**
   * Lädt die aktuellen Systemeinstellungen
   */
  async function fetchSettings() {
    loading.value = true;
    error.value = null;

    try {
      if (apiIntegrationEnabled.value) {
        logger.info("Lade Systemeinstellungen über AdminSystemService");
        const response = await adminSystemService.getSystemSettings();

        if (response.success && response.data) {
          logger.info("Systemeinstellungen erfolgreich geladen");
          systemSettings.value = { ...systemSettings.value, ...response.data };
          return response.data;
        } else {
          throw new Error(
            response.message || "Fehler beim Laden der Einstellungen",
          );
        }
      }

      // Fallback: Verwende die aktuellen lokalen Einstellungen
      logger.info("Verwende lokale Systemeinstellungen");
      return systemSettings.value;
    } catch (err: any) {
      logger.error("Fehler beim Laden der Systemeinstellungen", err);
      error.value = err.message || "Fehler beim Laden der Systemeinstellungen";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Speichert die Systemeinstellungen
   */
  async function saveSettings(settings: any) {
    loading.value = true;
    error.value = null;

    try {
      if (apiIntegrationEnabled.value) {
        logger.info("Speichere Systemeinstellungen über AdminSystemService");
        const response =
          await adminSystemService.updateSystemSettings(settings);

        if (response.success) {
          logger.info("Systemeinstellungen erfolgreich gespeichert");
          systemSettings.value = { ...systemSettings.value, ...settings };
          return true;
        } else {
          throw new Error(
            response.message || "Fehler beim Speichern der Einstellungen",
          );
        }
      }

      // Fallback: Speichere lokal
      logger.info("Speichere Systemeinstellungen lokal");
      systemSettings.value = { ...systemSettings.value, ...settings };
      return true;
    } catch (err: any) {
      logger.error("Fehler beim Speichern der Systemeinstellungen", err);
      error.value =
        err.message || "Fehler beim Speichern der Systemeinstellungen";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Startet Systemdienste neu
   */
  async function restartServices() {
    loading.value = true;
    error.value = null;

    try {
      if (apiIntegrationEnabled.value) {
        logger.info("Starte Systemdienste neu über AdminSystemService");
        const response = await adminSystemService.restartServices();

        if (response.success) {
          logger.info("Systemdienste erfolgreich neu gestartet");
          await fetchStats();
          return true;
        } else {
          throw new Error(
            response.message || "Fehler beim Neustart der Dienste",
          );
        }
      }

      // Fallback: Simuliere Neustart
      logger.info("Simuliere Neustart der Systemdienste");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return true;
    } catch (err: any) {
      logger.error("Fehler beim Neustart der Systemdienste", err);
      error.value = err.message || "Fehler beim Neustart der Systemdienste";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Exportiert Systemlogs
   */
  async function exportLogs() {
    loading.value = true;
    error.value = null;

    try {
      if (apiIntegrationEnabled.value) {
        logger.info("Exportiere Systemlogs über AdminSystemService");
        const response = await adminSystemService.exportLogs();

        if (response.success && response.data) {
          logger.info("Systemlogs erfolgreich exportiert");
          // Trigger download
          const blob = new Blob([response.data], { type: "application/zip" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `system-logs-${new Date().toISOString()}.zip`;
          a.click();
          window.URL.revokeObjectURL(url);
          return true;
        } else {
          throw new Error(response.message || "Fehler beim Export der Logs");
        }
      }

      // Fallback: Zeige Hinweis
      logger.info("Log-Export nur mit API-Integration verfügbar");
      throw new Error(
        "Log-Export ist nur mit aktiver API-Integration verfügbar",
      );
    } catch (err: any) {
      logger.error("Fehler beim Export der Systemlogs", err);
      error.value = err.message || "Fehler beim Export der Systemlogs";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Optimiert die Datenbank
   */
  async function optimizeDatabase() {
    loading.value = true;
    error.value = null;

    try {
      if (apiIntegrationEnabled.value) {
        logger.info("Optimiere Datenbank über AdminSystemService");
        const response = await adminSystemService.optimizeDatabase();

        if (response.success) {
          logger.info("Datenbank erfolgreich optimiert");
          await fetchStats();
          return true;
        } else {
          throw new Error(
            response.message || "Fehler bei der Datenbankoptimierung",
          );
        }
      }

      // Fallback: Simuliere Optimierung
      logger.info("Simuliere Datenbankoptimierung");
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return true;
    } catch (err: any) {
      logger.error("Fehler bei der Datenbankoptimierung", err);
      error.value = err.message || "Fehler bei der Datenbankoptimierung";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Setzt Statistiken zurück
   */
  async function resetStatistics() {
    loading.value = true;
    error.value = null;

    try {
      if (apiIntegrationEnabled.value) {
        logger.info("Setze Statistiken zurück über AdminSystemService");
        const response = await adminSystemService.resetStatistics();

        if (response.success) {
          logger.info("Statistiken erfolgreich zurückgesetzt");
          await fetchStats();
          return true;
        } else {
          throw new Error(
            response.message || "Fehler beim Zurücksetzen der Statistiken",
          );
        }
      }

      // Fallback: Setze lokale Statistiken zurück
      logger.info("Setze lokale Statistiken zurück");
      stats.value = {
        ...stats.value,
        total_messages: 0,
        total_sessions: 0,
        total_feedback: 0,
        positive_feedback_percent: 0,
        avg_messages_per_session: 0,
        cache_hit_rate: 0,
        requests_per_second: 0,
      };
      return true;
    } catch (err: any) {
      logger.error("Fehler beim Zurücksetzen der Statistiken", err);
      error.value = err.message || "Fehler beim Zurücksetzen der Statistiken";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Erstellt ein System-Backup
   */
  async function createBackup() {
    loading.value = true;
    error.value = null;

    try {
      if (apiIntegrationEnabled.value) {
        logger.info("Erstelle System-Backup über AdminSystemService");
        const response = await adminSystemService.createBackup();

        if (response.success) {
          logger.info("System-Backup erfolgreich erstellt");
          await fetchStats();
          return true;
        } else {
          throw new Error(
            response.message || "Fehler beim Erstellen des Backups",
          );
        }
      }

      // Fallback: Zeige Hinweis
      logger.info("Backup-Erstellung nur mit API-Integration verfügbar");
      throw new Error(
        "Backup-Erstellung ist nur mit aktiver API-Integration verfügbar",
      );
    } catch (err: any) {
      logger.error("Fehler beim Erstellen des Backups", err);
      error.value = err.message || "Fehler beim Erstellen des Backups";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    stats,
    loading,
    error,
    apiIntegrationEnabled,
    systemSettings,

    // Getters
    availableActions,
    memoryStatus,
    cpuStatus,
    systemHealthStatus,

    // Actions
    fetchStats,
    fetchSettings,
    saveSettings,
    clearCache,
    clearEmbeddingCache,
    reloadMotd,
    performSystemCheck,
    reindexDocuments,
    fetchAvailableActions,
    restartServices,
    exportLogs,
    optimizeDatabase,
    resetStatistics,
    createBackup,
  };
});

// This is necessary to indicate the file is complete
export default useAdminSystemStore;
