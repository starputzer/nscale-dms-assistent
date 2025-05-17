/**
 * Pinia Store für Feedback-Administration
 * Teil der Vue 3 SFC Migration (08.05.2025)
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { AdminService } from "@/services/api/AdminService";
import type {
  FeedbackStats,
  FeedbackEntry,
  FeedbackFilter,
} from "@/types/admin";

export const useAdminFeedbackStore = defineStore("adminFeedback", () => {
  // State
  const stats = ref<FeedbackStats>({
    total: 0,
    positive: 0,
    negative: 0,
    positive_percent: 0,
    with_comments: 0,
    feedback_by_day: [],
  });

  const negativeFeedback = ref<FeedbackEntry[]>([]);
  const filter = ref<FeedbackFilter>({});
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Service
  const adminService = new AdminService();

  // Computed
  const filteredFeedback = computed(() => {
    let filtered = [...negativeFeedback.value];

    // Apply date filters
    if (filter.value.dateFrom) {
      filtered = filtered.filter((f) => f.created_at >= filter.value.dateFrom!);
    }

    if (filter.value.dateTo) {
      filtered = filtered.filter((f) => f.created_at <= filter.value.dateTo!);
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
      const response = await adminService.getFeedbackStats();
      stats.value = response;
    } catch (err) {
      error.value = "Fehler beim Laden der Statistiken";
      console.error("Fehler beim Laden der Feedback-Statistiken:", err);
    } finally {
      loading.value = false;
    }
  }

  async function fetchNegativeFeedback(limit: number = 100) {
    loading.value = true;
    error.value = null;

    try {
      const response = await adminService.getNegativeFeedback(limit);
      negativeFeedback.value = response;
    } catch (err) {
      error.value = "Fehler beim Laden des negativen Feedbacks";
      console.error("Fehler beim Laden des negativen Feedbacks:", err);
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

  return {
    // State
    stats,
    negativeFeedback,
    filter,
    loading,
    error,

    // Computed
    filteredFeedback,

    // Actions
    fetchStats,
    fetchNegativeFeedback,
    setFilter,
    resetFilter,
  };
});
