/**
 * Feedback Service
 * Service für das Senden von Feedback zu Chat-Nachrichten
 */

import { BaseApiService } from './BaseApiService';
import type { AxiosResponse } from 'axios';

export interface MessageFeedback {
  id?: string;
  messageId: string;
  sessionId: string;
  userId?: string;
  type: 'positive' | 'negative';
  comment?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface FeedbackResponse {
  success: boolean;
  feedbackId?: string;
  message?: string;
}

export interface FeedbackStats {
  total: number;
  positive: number;
  negative: number;
  withComments: number;
}

class FeedbackService extends BaseApiService {
  constructor() {
    super('FeedbackService');
  }

  /**
   * Sendet Feedback für eine spezifische Nachricht
   */
  async submitMessageFeedback(
    messageId: string,
    sessionId: string,
    type: 'positive' | 'negative',
    comment?: string
  ): Promise<FeedbackResponse> {
    try {
      this.logger.info('Submitting message feedback', { messageId, type });
      
      const response = await this.post<FeedbackResponse>('/feedback/message', {
        messageId,
        sessionId,
        type,
        comment,
        timestamp: new Date().toISOString()
      });

      if (response.data.success) {
        this.logger.info('Feedback submitted successfully', { 
          feedbackId: response.data.feedbackId 
        });
      }

      return response.data;
    } catch (error) {
      this.logger.error('Error submitting feedback', error);
      throw this.handleError(error);
    }
  }

  /**
   * Holt das Feedback für eine spezifische Nachricht
   */
  async getFeedbackForMessage(messageId: string): Promise<MessageFeedback | null> {
    try {
      const response = await this.get<MessageFeedback>(`/feedback/message/${messageId}`);
      return response.data;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Aktualisiert bestehendes Feedback
   */
  async updateFeedback(
    feedbackId: string, 
    updates: Partial<MessageFeedback>
  ): Promise<FeedbackResponse> {
    try {
      this.logger.info('Updating feedback', { feedbackId });
      
      const response = await this.put<FeedbackResponse>(
        `/feedback/${feedbackId}`, 
        updates
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error updating feedback', error);
      throw this.handleError(error);
    }
  }

  /**
   * Löscht Feedback
   */
  async deleteFeedback(feedbackId: string): Promise<FeedbackResponse> {
    try {
      this.logger.info('Deleting feedback', { feedbackId });
      
      const response = await this.delete<FeedbackResponse>(
        `/feedback/${feedbackId}`
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error deleting feedback', error);
      throw this.handleError(error);
    }
  }

  /**
   * Holt Feedback-Statistiken für eine Session
   */
  async getSessionFeedbackStats(sessionId: string): Promise<FeedbackStats> {
    try {
      const response = await this.get<FeedbackStats>(
        `/feedback/stats/session/${sessionId}`
      );
      return response.data;
    } catch (error) {
      this.logger.error('Error getting feedback stats', error);
      throw this.handleError(error);
    }
  }

  /**
   * Holt alle Feedbacks für eine Session
   */
  async getSessionFeedbacks(sessionId: string): Promise<MessageFeedback[]> {
    try {
      const response = await this.get<MessageFeedback[]>(
        `/feedback/session/${sessionId}`
      );
      return response.data;
    } catch (error) {
      this.logger.error('Error getting session feedbacks', error);
      throw this.handleError(error);
    }
  }

  /**
   * Prüft ob ein 404 Fehler vorliegt
   */
  private isNotFoundError(error: any): boolean {
    return error?.response?.status === 404;
  }
}

// Export singleton instance
export const feedbackService = new FeedbackService();

// Export für Tests
export { FeedbackService };