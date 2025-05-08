/**
 * Pinia Store für Feedback-Administration
 * Teil der Vue 3 SFC Migration (08.05.2025)
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { adminApi } from '@/services/api/admin';
import type { FeedbackStats, FeedbackEntry, FeedbackFilter, AdminFeedbackState } from '@/types/admin';

export const useAdminFeedbackStore = defineStore('adminFeedback', () => {
  // State
  const stats = ref<FeedbackStats>({
    total: 0,
    positive: 0,
    negative: 0,
    positive_percent: 0,
    with_comments: 0,
    feedback_rate: 0,
    feedback_by_day: []
  });
  
  const negativeFeedback = ref<FeedbackEntry[]>([]);
  const filter = ref<FeedbackFilter>({
    dateFrom: undefined,
    dateTo: undefined,
    isPositive: undefined,
    hasComment: undefined,
    searchTerm: undefined
  });
  
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  // Getters
  const filteredFeedback = computed(() => {
    return negativeFeedback.value.filter(feedback => {
      let matches = true;
      
      // Filter by date range
      if (filter.value.dateFrom && feedback.created_at < filter.value.dateFrom) {
        matches = false;
      }
      if (filter.value.dateTo && feedback.created_at > filter.value.dateTo) {
        matches = false;
      }
      
      // Filter by whether it has comments
      if (filter.value.hasComment !== undefined) {
        if (filter.value.hasComment && !feedback.comment) {
          matches = false;
        } else if (!filter.value.hasComment && feedback.comment) {
          matches = false;
        }
      }
      
      // Filter by search term
      if (filter.value.searchTerm) {
        const searchTerm = filter.value.searchTerm.toLowerCase();
        const hasMatch = 
          feedback.question?.toLowerCase().includes(searchTerm) || 
          feedback.answer?.toLowerCase().includes(searchTerm) || 
          feedback.comment?.toLowerCase().includes(searchTerm) ||
          feedback.user_email?.toLowerCase().includes(searchTerm);
        
        if (!hasMatch) {
          matches = false;
        }
      }
      
      return matches;
    });
  });
  
  const feedbackWithComments = computed(() => {
    return filteredFeedback.value.filter(feedback => !!feedback.comment);
  });
  
  // Actions
  async function fetchStats() {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await adminApi.getFeedbackStats();
      stats.value = response.data.stats;
      return response.data.stats;
    } catch (err: any) {
      console.error('Fehler beim Laden der Feedback-Statistiken:', err);
      error.value = err.response?.data?.message || 'Fehler beim Laden der Feedback-Statistiken';
      throw err;
    } finally {
      loading.value = false;
    }
  }
  
  async function fetchNegativeFeedback() {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await adminApi.getNegativeFeedback();
      negativeFeedback.value = response.data.feedback;
      return response.data.feedback;
    } catch (err: any) {
      console.error('Fehler beim Laden des negativen Feedbacks:', err);
      error.value = err.response?.data?.message || 'Fehler beim Laden des negativen Feedbacks';
      throw err;
    } finally {
      loading.value = false;
    }
  }
  
  function setFilter(newFilter: Partial<FeedbackFilter>) {
    filter.value = { ...filter.value, ...newFilter };
  }
  
  function resetFilter() {
    filter.value = {
      dateFrom: undefined,
      dateTo: undefined,
      isPositive: undefined,
      hasComment: undefined,
      searchTerm: undefined
    };
  }
  
  return {
    // State
    stats,
    negativeFeedback,
    filter,
    loading,
    error,
    
    // Getters
    filteredFeedback,
    feedbackWithComments,
    
    // Actions
    fetchStats,
    fetchNegativeFeedback,
    setFilter,
    resetFilter
  };
});