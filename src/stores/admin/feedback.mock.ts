/**
 * Mock Implementation des Feedback Stores
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type {
  FeedbackStats,
  FeedbackEntry,
  FeedbackFilter,
} from "@/types/admin";
import { v4 as uuidv4 } from "@/utils/uuidUtil";

// Beispiel-Feedback-Daten
const MOCK_FEEDBACK: FeedbackEntry[] = [
  {
    id: "1",
    messageId: "msg-1",
    sessionId: "session-1",
    type: "positive",
    comment: "Sehr hilfreiche Antwort!",
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 Stunde zurück
  },
  {
    id: "2",
    messageId: "msg-2",
    sessionId: "session-1",
    type: "negative",
    comment: "Die Antwort war nicht hilfreich.",
    timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 Stunden zurück
  },
  {
    id: "3",
    messageId: "msg-3",
    sessionId: "session-2",
    type: "positive",
    comment: "",
    timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 Tag zurück
  },
];

export const useFeedbackStore = defineStore("admin-feedback", () => {
  // State
  const feedback = ref<FeedbackEntry[]>([...MOCK_FEEDBACK]);
  const currentFilter = ref<FeedbackFilter>({});
  const isLoading = ref<boolean>(false);

  // Computed
  const stats = computed<FeedbackStats>(() => {
    const total = feedback.value.length;
    const positive = feedback.value.filter((f: any) => f.type === "positive").length;
    const negative = feedback.value.filter((f: any) => f.type === "negative").length;
    const withComments = feedback.value.filter(
      (f) => f.comment && f.comment.trim() !== "",
    ).length;

    return {
      total,
      positive,
      negative,
      positive_percent: total > 0 ? Math.round((positive / total) * 100) : 0,
      with_comments: withComments,
      feedback_rate: 0.12, // Mock-Wert
      feedback_by_day: [], // Würde normalerweise Feedback pro Tag enthalten
    };
  });

  const filteredFeedback = computed(() => {
    return feedback.value
      .filter((f: any) => {
        if (currentFilter.value.hasComment !== undefined) {
          const hasComment = f.comment && f.comment.trim() !== "";
          if (currentFilter.value.hasComment !== hasComment) return false;
        }

        if (currentFilter.value.isPositive !== undefined) {
          const isPositive = f.type === "positive";
          if (currentFilter.value.isPositive !== isPositive) return false;
        }

        if (currentFilter.value.searchTerm) {
          const term = currentFilter.value.searchTerm.toLowerCase();
          const commentMatches =
            f.comment && f.comment.toLowerCase().includes(term);
          if (!commentMatches) return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
  });

  // Actions
  const fetchFeedback = async () => {
    isLoading.value = true;

    try {
      // Simulieren einer API-Anfrage
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log("[Mock] Feedback geladen");

      // In der Mock-Implementierung laden wir die Beispieldaten
      feedback.value = [...MOCK_FEEDBACK];
    } catch (error) {
      console.error("[Mock] Fehler beim Laden des Feedbacks:", error);
    } finally {
      isLoading.value = false;
    }
  };

  const submitFeedback = async (feedbackData: {
    messageId: string;
    type: string;
    comment: string;
    sessionId: string;
  }) => {
    isLoading.value = true;

    try {
      // Simulieren einer API-Anfrage
      await new Promise((resolve) => setTimeout(resolve, 300));

      const newFeedback: FeedbackEntry = {
        id: uuidv4(),
        messageId: feedbackData.messageId,
        sessionId: feedbackData.sessionId,
        type: feedbackData.type,
        comment: feedbackData.comment,
        timestamp: new Date().toISOString(),
      };

      // Füge das neue Feedback zu unserer Liste hinzu
      feedback.value.unshift(newFeedback);

      console.log("[Mock] Feedback gesendet:", newFeedback);
      return newFeedback;
    } catch (error) {
      console.error("[Mock] Fehler beim Senden des Feedbacks:", error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  const applyFilter = (filter: FeedbackFilter) => {
    currentFilter.value = { ...filter };
  };

  const resetFilter = () => {
    currentFilter.value = {};
  };

  return {
    feedback,
    filteredFeedback,
    stats,
    currentFilter,
    isLoading,
    fetchFeedback,
    submitFeedback,
    applyFilter,
    resetFilter,
  };
});
