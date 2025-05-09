import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupChat } from '../../../frontend/js/chat.js';
import axios from 'axios';

/**
 * Tests for the chat.js functionality
 * 
 * These tests cover:
 * - Sending questions with streaming (sendQuestionStream)
 * - Sending questions without streaming (sendQuestion)
 * - Event handling for streaming responses
 * - Stream cleanup behavior
 * - Edge cases and error handling
 */
describe('chat.js', () => {
  // Commonly used test variables
  let chatFunctions;
  let mockOptions;
  let mockEventSource;
  let motdDismissed;
  
  // Common setup before each test
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Set up mock values
    motdDismissed = { value: false };
    mockEventSource = { value: null };
    
    // Mock options for setupChat
    mockOptions = {
      token: { value: 'test-token' },
      messages: { value: [] },
      question: { value: 'Test question?' },
      currentSessionId: { value: '123' },
      isLoading: { value: false },
      isStreaming: { value: false },
      eventSource: mockEventSource,
      scrollToBottom: vi.fn(),
      nextTick: vi.fn().mockResolvedValue(),
      loadSessions: vi.fn().mockResolvedValue(),
      motdDismissed
    };
    
    // Set up axios mocks
    axios.post.mockResolvedValue({
      data: {
        answer: 'Test answer',
        message_id: 'msg-456'
      }
    });
    
    // Initialize chat functions
    chatFunctions = setupChat(mockOptions);
  });
  
  afterEach(() => {
    // Make sure to clean up event source if it exists
    if (mockEventSource.value) {
      mockEventSource.value.close();
      mockEventSource.value = null;
    }
  });
  
  // Test suite for sendQuestionStream function
  describe('sendQuestionStream', () => {
    it('should not send an empty question', async () => {
      // Set up empty question
      mockOptions.question.value = '';
      
      // Call function
      await chatFunctions.sendQuestionStream();
      
      // Verify behavior
      expect(mockOptions.isLoading.value).toBe(false);
      expect(mockOptions.isStreaming.value).toBe(false);
      expect(mockOptions.messages.value.length).toBe(0);
      expect(mockEventSource.value).toBeNull();
    });
    
    it('should not send if no session is selected', async () => {
      // Set up null session
      mockOptions.currentSessionId.value = null;
      
      // Call function
      await chatFunctions.sendQuestionStream();
      
      // Verify behavior
      expect(mockOptions.isLoading.value).toBe(false);
      expect(mockOptions.isStreaming.value).toBe(false);
      expect(mockOptions.messages.value.length).toBe(0);
      expect(mockEventSource.value).toBeNull();
    });
    
    it('should create an EventSource and add user message', async () => {
      // Call function
      await chatFunctions.sendQuestionStream();
      
      // Verify behavior
      expect(mockOptions.isLoading.value).toBe(true);
      expect(mockOptions.isStreaming.value).toBe(true);
      expect(mockOptions.messages.value.length).toBe(2); // User message + assistant placeholder
      expect(mockOptions.messages.value[0].is_user).toBe(true);
      expect(mockOptions.messages.value[0].message).toBe('Test question?');
      expect(mockOptions.messages.value[1].is_user).toBe(false);
      expect(mockOptions.messages.value[1].message).toBe('');
      expect(mockEventSource.value).not.toBeNull();
      expect(mockEventSource.value.url).toContain('/api/question/stream');
      expect(mockEventSource.value.url).toContain('question=Test%20question');
      expect(mockEventSource.value.url).toContain('session_id=123');
      expect(mockOptions.nextTick).toHaveBeenCalled();
      expect(mockOptions.scrollToBottom).toHaveBeenCalled();
    });

    it('should use einfache Sprache parameter when enabled', async () => {
      // Enable simple language
      window.useSimpleLanguage = true;
      
      // Call function
      await chatFunctions.sendQuestionStream();
      
      // Verify URL has simple language parameter
      expect(mockEventSource.value.url).toContain('simple_language=true');
      
      // Clean up
      window.useSimpleLanguage = false;
    });
    
    it('should handle receiving tokens from the stream', async () => {
      // Call function to initiate stream
      await chatFunctions.sendQuestionStream();
      
      // Simulate message event
      mockEventSource.value.dispatchEvent({
        type: 'message',
        data: 'data: {"response": "Hello"}'
      });
      
      // Send another token
      mockEventSource.value.dispatchEvent({
        type: 'message',
        data: 'data: {"response": " world"}'
      });
      
      // Verify that messages are updated
      expect(mockOptions.messages.value[1].message).toBe('Hello world');
    });
    
    it('should handle the done event', async () => {
      // Call function to initiate stream
      await chatFunctions.sendQuestionStream();
      
      // Add some message content
      mockEventSource.value.dispatchEvent({
        type: 'message',
        data: 'data: {"response": "Completed answer"}'
      });
      
      // Simulate done event
      mockEventSource.value.dispatchEvent({
        type: 'done'
      });
      
      // Verify cleanup happens
      expect(mockOptions.isLoading.value).toBe(false);
      expect(mockOptions.isStreaming.value).toBe(false);
      expect(mockEventSource.value).toBeNull();
      expect(mockOptions.loadSessions).toHaveBeenCalled();
    });
    
    it('should handle receiving message_id from the stream', async () => {
      // Call function to initiate stream
      await chatFunctions.sendQuestionStream();
      
      // Simulate message_id event
      mockEventSource.value.dispatchEvent({
        type: 'message',
        data: 'data: {"message_id": "msg-789"}'
      });
      
      // Verify message ID is stored
      expect(mockOptions.messages.value[1].id).toBe('msg-789');
    });
    
    it('should handle connection errors', async () => {
      // Call function to initiate stream
      await chatFunctions.sendQuestionStream();
      
      // Simulate error event
      mockEventSource.value.dispatchEvent({
        type: 'error'
      });
      
      // Verify error handling
      expect(mockOptions.messages.value[1].message).toBe('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
      expect(mockOptions.isLoading.value).toBe(false);
      expect(mockOptions.isStreaming.value).toBe(false);
      expect(mockEventSource.value).toBeNull();
    });
    
    it('should handle stream timeout errors', async () => {
      // Call function to initiate stream
      await chatFunctions.sendQuestionStream();
      
      // Simulate timeout error message
      mockEventSource.value.dispatchEvent({
        type: 'message',
        data: '[FINAL_TIMEOUT]'
      });
      
      // Verify error handling
      expect(mockOptions.messages.value[1].message).toBe('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
      expect(mockOptions.isLoading.value).toBe(false);
      expect(mockOptions.isStreaming.value).toBe(false);
    });
    
    it('should handle stream retry events', async () => {
      // Call function to initiate stream
      await chatFunctions.sendQuestionStream();
      
      // Simulate retry message
      mockEventSource.value.dispatchEvent({
        type: 'message',
        data: '[STREAM_RETRY]'
      });
      
      // Verify retry handling
      expect(mockOptions.messages.value[1].message).toContain('Verbindung wird wiederhergestellt');
    });
    
    it('should close previous EventSource when creating a new one', async () => {
      // Set up a mock EventSource
      const mockClose = vi.fn();
      mockEventSource.value = {
        close: mockClose,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      };
      
      // Call function
      await chatFunctions.sendQuestionStream();
      
      // Verify previous EventSource was closed
      expect(mockClose).toHaveBeenCalled();
    });
    
    it('should handle JSON parse errors gracefully', async () => {
      // Call function to initiate stream
      await chatFunctions.sendQuestionStream();
      
      // Simulate invalid JSON
      mockEventSource.value.dispatchEvent({
        type: 'message',
        data: 'data: {invalid json}'
      });
      
      // Should not crash, continue functioning
      expect(mockOptions.isStreaming.value).toBe(true);
      
      // Can still receive valid messages after
      mockEventSource.value.dispatchEvent({
        type: 'message',
        data: 'data: {"response": "Valid message"}'
      });
      
      expect(mockOptions.messages.value[1].message).toBe('Valid message');
    });
  });
  
  // Test suite for sendQuestion function (non-streaming)
  describe('sendQuestion', () => {
    it('should not send an empty question', async () => {
      // Set up empty question
      mockOptions.question.value = '';
      
      // Call function
      await chatFunctions.sendQuestion();
      
      // Verify behavior
      expect(mockOptions.isLoading.value).toBe(false);
      expect(mockOptions.messages.value.length).toBe(0);
      expect(axios.post).not.toHaveBeenCalled();
    });
    
    it('should not send if no session is selected', async () => {
      // Set up null session
      mockOptions.currentSessionId.value = null;
      
      // Call function
      await chatFunctions.sendQuestion();
      
      // Verify behavior
      expect(mockOptions.isLoading.value).toBe(false);
      expect(mockOptions.messages.value.length).toBe(0);
      expect(axios.post).not.toHaveBeenCalled();
    });
    
    it('should send question and add response to messages', async () => {
      // Call function
      await chatFunctions.sendQuestion();
      
      // Verify API call
      expect(axios.post).toHaveBeenCalledWith(
        '/api/question',
        {
          question: 'Test question?',
          session_id: '123'
        },
        { headers: {} }
      );
      
      // Verify messages are updated
      expect(mockOptions.messages.value.length).toBe(2);
      expect(mockOptions.messages.value[0].is_user).toBe(true);
      expect(mockOptions.messages.value[0].message).toBe('Test question?');
      expect(mockOptions.messages.value[1].is_user).toBe(false);
      expect(mockOptions.messages.value[1].message).toBe('Test answer');
      expect(mockOptions.messages.value[1].id).toBe('msg-456');
      expect(mockOptions.messages.value[1].session_id).toBe('123');
      
      // Verify UI updates
      expect(mockOptions.question.value).toBe('');
      expect(mockOptions.loadSessions).toHaveBeenCalled();
      expect(mockOptions.nextTick).toHaveBeenCalled();
      expect(mockOptions.scrollToBottom).toHaveBeenCalled();
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      axios.post.mockRejectedValueOnce(new Error('Network error'));
      
      // Call function
      await chatFunctions.sendQuestion();
      
      // Verify error handling
      expect(mockOptions.messages.value.length).toBe(2);
      expect(mockOptions.messages.value[0].is_user).toBe(true);
      expect(mockOptions.messages.value[1].is_user).toBe(false);
      expect(mockOptions.messages.value[1].message).toBe('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
      expect(mockOptions.isLoading.value).toBe(false);
    });
    
    it('should use simple language header when enabled', async () => {
      // Enable simple language
      window.useSimpleLanguage = true;
      
      // Call function
      await chatFunctions.sendQuestion();
      
      // Verify headers
      expect(axios.post).toHaveBeenCalledWith(
        '/api/question',
        {
          question: 'Test question?',
          session_id: '123'
        },
        { 
          headers: { 
            'X-Use-Simple-Language': 'true' 
          } 
        }
      );
      
      // Clean up
      window.useSimpleLanguage = false;
    });
    
    it('should dismiss MOTD when asking a question', async () => {
      // Set up MOTD state
      mockOptions.motdDismissed.value = false;
      
      // Call function
      await chatFunctions.sendQuestion();
      
      // Verify MOTD is dismissed
      expect(mockOptions.motdDismissed.value).toBe(true);
    });
  });
  
  // Test suite for cleanupStream function
  describe('cleanupStream', () => {
    it('should clean up the EventSource and reset state', () => {
      // Setup mock EventSource
      const mockRemoveEventListener = vi.fn();
      mockEventSource.value = {
        onmessage: vi.fn(),
        onerror: vi.fn(),
        close: vi.fn(),
        removeEventListener: mockRemoveEventListener
      };
      
      // Set loading and streaming to true
      mockOptions.isLoading.value = true;
      mockOptions.isStreaming.value = true;
      
      // Call function
      chatFunctions.cleanupStream();
      
      // Verify cleanup
      expect(mockEventSource.value).toBeNull();
      expect(mockOptions.isLoading.value).toBe(false);
      expect(mockOptions.isStreaming.value).toBe(false);
      expect(mockRemoveEventListener).toHaveBeenCalledWith('done', expect.any(Function));
    });
    
    it('should handle being called when eventSource is null', () => {
      // Ensure eventSource is null
      mockEventSource.value = null;
      
      // Call function
      chatFunctions.cleanupStream();
      
      // Verify state is reset without errors
      expect(mockOptions.isLoading.value).toBe(false);
      expect(mockOptions.isStreaming.value).toBe(false);
    });
    
    it('should handle errors during EventSource cleanup', () => {
      // Setup mock EventSource that throws on close
      mockEventSource.value = {
        onmessage: vi.fn(),
        onerror: vi.fn(),
        close: vi.fn(() => { throw new Error('Close error'); }),
        removeEventListener: vi.fn()
      };
      
      // Call function
      chatFunctions.cleanupStream();
      
      // Verify error was handled and state was reset
      expect(mockEventSource.value).toBeNull();
      expect(mockOptions.isLoading.value).toBe(false);
      expect(mockOptions.isStreaming.value).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });
});