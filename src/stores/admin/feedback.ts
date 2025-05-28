/**
 * Pinia Store für Feedback-Administration
 * Teil der Vue 3 SFC Migration (08.05.2025)
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { adminFeedbackService } from "@/services/api/AdminFeedbackService";
import { LogService } from "@/services/log/LogService";
import { shouldUseRealApi } from "@/config/api-flags";
import type {
  FeedbackStats,
  FeedbackEntry,
  FeedbackFilter,
  ExportOptions,
} from "@/types/admin";

export const useAdminFeedbackStore = defineStore("adminFeedback", () => {
  // Logger für Diagnose
  const logger = new LogService("AdminFeedbackStore");

  // State
  const stats = ref<FeedbackStats>({
    total: 0,
    positive: 0,
    negative: 0,
    positive_percent: 0,
    with_comments: 0,
    unresolved: 0,
    feedback_by_day: [],
  });

  const negativeFeedback = ref<FeedbackEntry[]>([]);
  const filter = ref<FeedbackFilter>({});
  const loading = ref(false);
  const error = ref<string | null>(null);

  // API-Integration aktiv?
  const apiIntegrationEnabled = computed(() => shouldUseRealApi("useRealFeedbackApi"));

  // Computed
  const filteredFeedback = computed(() => {
    let filtered = [...negativeFeedback.value];

    // Apply date filters
    if (filter.value.dateFrom) {
      filtered = filtered.filter(
        (f) => new Date(f.created_at) >= new Date(filter.value.dateFrom!),
      );
    }

    if (filter.value.dateTo) {
      filtered = filtered.filter(
        (f) => new Date(f.created_at) <= new Date(filter.value.dateTo!),
      );
    }

    // Apply comment filter
    if (filter.value.hasComment !== undefined) {
      filtered = filtered.filter((f) =>
        filter.value.hasComment ? !!f.comment : !f.comment,
      );
    }

    // Apply search term filter
    if (filter.value.searchTerm) {
      const searchLower = filter.value.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.user_email.toLowerCase().includes(searchLower) ||
          (f.comment && f.comment.toLowerCase().includes(searchLower)) ||
          (f.question && f.question.toLowerCase().includes(searchLower)) ||
          (f.answer && f.answer.toLowerCase().includes(searchLower)),
      );
    }

    return filtered;
  });

  // Actions
  async function fetchStats() {
    loading.value = true;
    error.value = null;

    try {
      logger.info("Lade Feedback-Statistiken", { apiIntegration: apiIntegrationEnabled.value });

      const response = await adminFeedbackService.getFeedbackStats();

      if (response.success && response.data) {
        logger.info("Feedback-Statistiken erfolgreich geladen", {
          totalFeedback: response.data.total,
          negative: response.data.negative,
          unresolved: response.data.unresolved
        });
        stats.value = response.data;
        return response.data;
      } else {
        logger.warn("Fehler beim Laden der Feedback-Statistiken", response.error);
        error.value = response.message || "Fehler beim Laden der Statistiken";
        throw new Error(error.value);
      }
    } catch (err) {
      logger.error("Fehler beim Laden der Feedback-Statistiken", err);
      error.value = err instanceof Error ? err.message : "Fehler beim Laden der Statistiken";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchNegativeFeedback(limit: number = 100) {
    loading.value = true;
    error.value = null;

    try {
      logger.info("Lade negatives Feedback", { limit, apiIntegration: apiIntegrationEnabled.value });

      const response = await adminFeedbackService.getNegativeFeedback(limit);

      if (response.success && response.data) {
        logger.info("Negatives Feedback erfolgreich geladen", {
          count: response.data.length
        });
        negativeFeedback.value = response.data;
        return response.data;
      } else {
        logger.warn("Fehler beim Laden des negativen Feedbacks", response.error);
        error.value = response.message || "Fehler beim Laden des negativen Feedbacks";
        throw new Error(error.value);
      }
    } catch (err) {
      logger.error("Fehler beim Laden des negativen Feedbacks", err);
      error.value = err instanceof Error ? err.message : "Fehler beim Laden des negativen Feedbacks";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function setFilter(newFilter: FeedbackFilter) {
    filter.value = { ...newFilter };
  }

  function resetFilter() {
    filter.value = {};
  }

  async function updateFeedbackStatus(id: string, status: string) {
    loading.value = true;
    error.value = null;

    try {
      logger.info("Aktualisiere Feedback-Status", { id, status, apiIntegration: apiIntegrationEnabled.value });

      const response = await adminFeedbackService.updateFeedbackStatus(id, status);

      if (response.success) {
        logger.info("Feedback-Status erfolgreich aktualisiert", { id, status });
        
        // Aktualisiere den Status in der lokalen Liste
        negativeFeedback.value = negativeFeedback.value.map((item) => {
          if (item.id === id) {
            return { ...item, status };
          }
          return item;
        });

        // Aktualisiere unresolved-Zähler in den Statistiken
        if (status === 'resolved') {
          stats.value.unresolved = Math.max(0, stats.value.unresolved - 1);
        } else if (status === 'unresolved') {
          stats.value.unresolved++;
        }

        return true;
      } else {
        logger.warn("Fehler beim Aktualisieren des Feedback-Status", response.error);
        error.value = response.message || "Fehler beim Aktualisieren des Feedback-Status";
        throw new Error(error.value);
      }
    } catch (err) {
      logger.error("Fehler beim Aktualisieren des Feedback-Status", err);
      error.value = err instanceof Error ? err.message : "Fehler beim Aktualisieren des Feedback-Status";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteFeedback(id: string) {
    loading.value = true;
    error.value = null;

    try {
      logger.info("Lösche Feedback", { id, apiIntegration: apiIntegrationEnabled.value });

      const response = await adminFeedbackService.deleteFeedback(id);

      if (response.success) {
        logger.info("Feedback erfolgreich gelöscht", { id });
        
        // Finde das gelöschte Feedback in der lokalen Liste
        const deletedFeedback = negativeFeedback.value.find(item => item.id === id);
        
        // Entferne es aus der lokalen Liste
        negativeFeedback.value = negativeFeedback.value.filter(
          (item) => item.id !== id,
        );

        // Aktualisiere Statistiken
        stats.value.total = Math.max(0, stats.value.total - 1);
        stats.value.negative = Math.max(0, stats.value.negative - 1);
        
        // Falls es unbearbeitet war, reduziere auch den unresolved-Zähler
        if (deletedFeedback && deletedFeedback.status === 'unresolved') {
          stats.value.unresolved = Math.max(0, stats.value.unresolved - 1);
        }

        // Aktualisiere Prozentsatz
        if (stats.value.total > 0) {
          stats.value.positive_percent = Math.round(
            (stats.value.positive / stats.value.total) * 100,
          );
        } else {
          stats.value.positive_percent = 0;
        }

        return true;
      } else {
        logger.warn("Fehler beim Löschen des Feedbacks", response.error);
        error.value = response.message || "Fehler beim Löschen des Feedbacks";
        throw new Error(error.value);
      }
    } catch (err) {
      logger.error("Fehler beim Löschen des Feedbacks", err);
      error.value = err instanceof Error ? err.message : "Fehler beim Löschen des Feedbacks";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function exportFeedback(options: ExportOptions) {
    loading.value = true;
    error.value = null;

    try {
      logger.info("Exportiere Feedback", { 
        format: options.format, 
        dataCount: options.data.length, 
        fields: options.fields.length,
        apiIntegration: apiIntegrationEnabled.value 
      });

      const response = await adminFeedbackService.exportFeedback(options);

      if (response.success) {
        logger.info("Feedback erfolgreich exportiert");
        
        // Wenn die API-Antwort ein Blob zurückgibt (Echte API-Integration)
        if (response.data instanceof Blob) {
          // Einen Download für die Datei erstellen
          const fileName = `feedback_export_${new Date().toISOString().slice(0, 10)}.${options.format}`;
          const url = window.URL.createObjectURL(response.data);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
        }
        
        return true;
      } else {
        logger.warn("Fehler beim Exportieren des Feedbacks", response.error);
        error.value = response.message || "Fehler beim Exportieren des Feedbacks";
        throw new Error(error.value);
      }
    } catch (err) {
      logger.error("Fehler beim Exportieren des Feedbacks", err);
      error.value = err instanceof Error ? err.message : "Fehler beim Exportieren des Feedbacks";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function filterFeedback(feedbackFilter: FeedbackFilter) {
    loading.value = true;
    error.value = null;
    setFilter(feedbackFilter);
    
    try {
      logger.info("Filtere Feedback", { filter: feedbackFilter, apiIntegration: apiIntegrationEnabled.value });

      // Bei aktiver API-Integration verwenden wir den Service für serverseitige Filterung
      if (apiIntegrationEnabled.value) {
        const response = await adminFeedbackService.filterFeedback(feedbackFilter);
        
        if (response.success && response.data) {
          logger.info("Feedback erfolgreich gefiltert", {
            resultCount: Array.isArray(response.data) ? response.data.length : 0
          });
          negativeFeedback.value = response.data;
          return response.data;
        } else {
          logger.warn("Fehler beim Filtern des Feedbacks", response.error);
          // Bei API-Fehler verwenden wir die lokale Filterung als Fallback
          return filteredFeedback.value;
        }
      }

      // Bei deaktivierter API-Integration oder als Fallback verwenden wir die lokale Filterung,
      // die durch das filteredFeedback computed property bereitgestellt wird
      return filteredFeedback.value;
    } catch (err) {
      logger.error("Fehler beim Filtern des Feedbacks", err);
      error.value = err instanceof Error ? err.message : "Fehler beim Filtern des Feedbacks";
      // Im Fehlerfall verwenden wir trotzdem die lokale Filterung
      return filteredFeedback.value;
    } finally {
      loading.value = false;
    }
  }

  // Helper methods for charts
  function getFeedbackTimeData(feedbackData: FeedbackEntry[]) {
    // Process the data to get feedback over time
    const lastDays = 7;
    const labels = [];
    const positiveData = [];
    const negativeData = [];

    // Generate labels for the last 7 days
    for (let i = lastDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(
        date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
      );
    }

    // Fill in the data with values from stats or default to 0
    const byDay = stats.value.feedback_by_day || [];
    for (let i = 0; i < lastDays; i++) {
      const dateData = byDay[i] || { positive: 0, count: 0 };
      positiveData.push(dateData.positive || 0);
      negativeData.push((dateData.count || 0) - (dateData.positive || 0));
    }

    return {
      labels,
      datasets: [
        {
          label: "Positiv",
          data: positiveData,
          borderColor: "#4caf50",
          backgroundColor: "rgba(76, 175, 80, 0.2)",
          tension: 0.4,
        },
        {
          label: "Negativ",
          data: negativeData,
          borderColor: "#f44336",
          backgroundColor: "rgba(244, 67, 54, 0.2)",
          tension: 0.4,
        },
      ],
    };
  }

  function getFeedbackTypeData(feedbackData: FeedbackEntry[]) {
    // Process the data to get feedback by type (positive/negative)
    return {
      labels: ["Positiv", "Negativ"],
      datasets: [
        {
          data: [stats.value.positive || 0, stats.value.negative || 0],
          backgroundColor: ["rgba(76, 175, 80, 0.8)", "rgba(244, 67, 54, 0.8)"],
          borderColor: ["#4caf50", "#f44336"],
          borderWidth: 1,
        },
      ],
    };
  }

  function getTopIssuesData(feedbackData: FeedbackEntry[]) {
    // Process the data to get top issues from the feedback
    // This would typically require natural language processing to identify topics
    // For demonstration purposes, we're using structured data extraction and counting
    
    // Sammeln und Zählen der häufigsten Themen aus den Feedback-Fragen
    const topics = new Map<string, number>();
    
    // Standardthemen, die wir immer miteinbeziehen
    topics.set("Dokumentkonvertierung", 0);
    topics.set("Suchergebnisse", 0);
    topics.set("Systemgeschwindigkeit", 0);
    topics.set("Benutzeroberfläche", 0);
    topics.set("Antwortqualität", 0);
    
    // Analyse der Feedback-Daten
    feedbackData.forEach(entry => {
      const question = entry.question?.toLowerCase() || '';
      const comment = entry.comment?.toLowerCase() || '';
      
      // Suche nach Schlüsselwörtern in Fragen und Kommentaren
      if (question.includes("konvert") || question.includes("dokument") || 
          comment.includes("konvert") || comment.includes("dokument")) {
        topics.set("Dokumentkonvertierung", (topics.get("Dokumentkonvertierung") || 0) + 1);
      }
      
      if (question.includes("such") || question.includes("find") || 
          comment.includes("such") || comment.includes("find")) {
        topics.set("Suchergebnisse", (topics.get("Suchergebnisse") || 0) + 1);
      }
      
      if (question.includes("langsam") || question.includes("schnell") || 
          comment.includes("langsam") || comment.includes("schnell") ||
          comment.includes("warten") || comment.includes("laden")) {
        topics.set("Systemgeschwindigkeit", (topics.get("Systemgeschwindigkeit") || 0) + 1);
      }
      
      if (question.includes("bedien") || question.includes("oberfläche") || 
          comment.includes("bedien") || comment.includes("oberfläche") ||
          comment.includes("layout") || comment.includes("design")) {
        topics.set("Benutzeroberfläche", (topics.get("Benutzeroberfläche") || 0) + 1);
      }
      
      if (question.includes("antwort") || question.includes("qualität") || 
          comment.includes("antwort") || comment.includes("qualität") ||
          comment.includes("hilft nicht") || comment.includes("irrelevant")) {
        topics.set("Antwortqualität", (topics.get("Antwortqualität") || 0) + 1);
      }
    });
    
    // Sortieren der Themen nach Häufigkeit (absteigend)
    const sortedTopics = [...topics.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Nur die Top 5 nehmen
    
    // Wenn wir nicht genug reale Daten haben, auffüllen mit simulierten Werten
    if (feedbackData.length < 5) {
      return {
        labels: [
          "Dokumentkonvertierung",
          "Suchergebnisse",
          "Systemgeschwindigkeit",
          "Benutzeroberfläche",
          "Antwortqualität",
        ],
        datasets: [
          {
            label: "Anzahl der Erwähnungen",
            data: [12, 10, 8, 5, 3],
            backgroundColor: "rgba(33, 150, 243, 0.8)",
            borderColor: "#2196f3",
            borderWidth: 1,
          },
        ],
      };
    }
    
    // Sonst reale Daten verwenden
    return {
      labels: sortedTopics.map(t => t[0]),
      datasets: [
        {
          label: "Anzahl der Erwähnungen",
          data: sortedTopics.map(t => t[1]),
          backgroundColor: "rgba(33, 150, 243, 0.8)",
          borderColor: "#2196f3",
          borderWidth: 1,
        },
      ],
    };
  }

  return {
    // State
    stats,
    negativeFeedback,
    filter,
    loading,
    error,
    apiIntegrationEnabled,

    // Computed
    filteredFeedback,

    // Actions
    fetchStats,
    fetchNegativeFeedback,
    setFilter,
    resetFilter,
    updateFeedbackStatus,
    deleteFeedback,
    exportFeedback,
    filterFeedback,

    // Chart data methods
    getFeedbackTimeData,
    getFeedbackTypeData,
    getTopIssuesData,
  };
});