/**
 * Pinia Store für Feedback-Administration
 * Teil der Vue 3 SFC Migration (08.05.2025)
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { v4 as uuidv4 } from '@/utils/uuidUtil';

import type {
  FeedbackStats,
  FeedbackEntry,
  FeedbackFilter,
} from "@/types/admin";

export const useFeedbackStore = defineStore("feedback", () => {
  // State
  const feedbacks = ref([
    {
      id: '1',
      messageId: '103',
      sessionId: '1',
      type: 'positive',
      comment: 'Sehr hilfreiche Antwort!',
      timestamp: new Date(Date.now() - 86000000).toISOString() // 1 Tag zuvor
    },
    {
      id: '2',
      messageId: '203',
      sessionId: '2',
      type: 'negative',
      comment: 'Die Information war nicht vollständig.',
      timestamp: new Date(Date.now() - 172000000).toISOString() // 2 Tage zuvor
    }
  ]);

  const isSubmitting = ref(false);
  const error = ref<string | null>(null);

  // Actions
  async function submitFeedback(feedback: any) {
    isSubmitting.value = true;
    error.value = null;

    try {
      // Mock API-Latenz
      await new Promise(resolve => setTimeout(resolve, 500));

      // Einfach zum lokalen Array hinzufügen
      feedbacks.value.push({
        id: uuidv4(),
        messageId: feedback.messageId,
        sessionId: feedback.sessionId,
        type: feedback.type,
        comment: feedback.comment,
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (err) {
      console.error('Fehler beim Senden des Feedbacks:', err);
      error.value = 'Fehler beim Senden des Feedbacks';
      throw err;
    } finally {
      isSubmitting.value = false;
    }
  }

  function getFeedbackForMessage(messageId: string) {
    return feedbacks.value.find(f => f.messageId === messageId) || null;
  }

  return {
    // State
    feedbacks,
    isSubmitting,
    error,

    // Actions
    submitFeedback,
    getFeedbackForMessage
  };
});

// Für Legacy-Code auch als useAdminFeedbackStore exportieren 
export const useAdminFeedbackStore = useFeedbackStore;