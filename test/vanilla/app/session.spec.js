import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

/**
 * Tests for session management functionality in app.js
 * 
 * Note: Since app.js is structured as a Vue app with exported named functions,
 * we need to mock and test the session management functions individually.
 * 
 * These tests cover:
 * - Loading sessions
 * - Loading individual sessions
 * - Creating new sessions
 * - Deleting sessions
 * - Session persistence via localStorage
 * - Error handling
 */
describe('app.js - Session Management', () => {
  // Test variables
  let localStorageMock;
  let sessionFunctions;
  
  // Common setup before each test
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock localStorage
    localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    
    // Session state (simplified from app.js)
    const sessions = { value: [] };
    const currentSessionId = { value: null };
    const messages = { value: [] };
    const isLoading = { value: false };
    const motdDismissed = { value: false };
    const feedbackFunctions = {
      loadMessageFeedback: vi.fn().mockResolvedValue()
    };
    
    // Create session management functions (manually extracted from app.js)
    sessionFunctions = {
      // Save current session to localStorage
      saveCurrentSessionToStorage: (sessionId) => {
        if (sessionId) {
          localStorage.setItem('lastActiveSession', sessionId);
        }
      },
      
      // Restore last active session
      restoreLastActiveSession: async () => {
        try {
          const lastSessionId = localStorage.getItem('lastActiveSession');
          
          if (lastSessionId && sessions.value.length > 0) {
            // Check if the session still exists
            const sessionExists = sessions.value.some(session => session.id === parseInt(lastSessionId));
            
            if (sessionExists) {
              await sessionFunctions.loadSession(parseInt(lastSessionId));
              return true;
            } else {
              localStorage.removeItem('lastActiveSession');
            }
          }
        } catch (error) {
          console.error('Error restoring last session:', error);
        }
        
        return false;
      },
      
      // Load specific session
      loadSession: async (sessionId) => {
        try {
          isLoading.value = true;
          
          const response = await axios.get(`/api/session/${sessionId}`);
          currentSessionId.value = sessionId;
          
          // Save session to localStorage for persistence
          sessionFunctions.saveCurrentSessionToStorage(sessionId);
          
          // Set messages
          messages.value = response.data.messages;
          
          // MOTD logic - hide if messages exist
          if (messages.value && messages.value.length > 0) {
            motdDismissed.value = true;
            localStorage.setItem('motdDismissed', 'true');
          } else {
            motdDismissed.value = false;
            localStorage.removeItem('motdDismissed');
          }
          
          // Load feedback for each assistant message
          for (const message of messages.value) {
            if (!message.is_user && message.id) {
              await feedbackFunctions.loadMessageFeedback(message.id);
            }
          }
          
          return true;
        } catch (error) {
          console.error('Error loading session:', error);
          return false;
        } finally {
          isLoading.value = false;
        }
      },
      
      // Load all sessions
      loadSessions: async () => {
        try {
          const response = await axios.get('/api/sessions');
          
          // Create deep copy to ensure reactivity
          const newSessions = JSON.parse(JSON.stringify(response.data.sessions));
          
          // Check if titles have changed
          let titlesChanged = false;
          if (sessions.value.length > 0 && newSessions.length === sessions.value.length) {
            for (let i = 0; i < sessions.value.length; i++) {
              if (sessions.value[i].title !== newSessions[i].title) {
                titlesChanged = true;
                break;
              }
            }
          } else {
            titlesChanged = true;
          }
          
          // Only update if something changed
          if (titlesChanged || sessions.value.length !== newSessions.length) {
            sessions.value = newSessions;
          }
          
          return true;
        } catch (error) {
          console.error('Error loading sessions:', error);
          return false;
        }
      },
      
      // Start new session
      startNewSession: async () => {
        try {
          // Reset MOTD for new conversations
          motdDismissed.value = false;
          localStorage.removeItem('motdDismissed');
          
          isLoading.value = true;
          const response = await axios.post('/api/session', {
            title: "Neue Unterhaltung"
          });
          
          await sessionFunctions.loadSessions();
          await sessionFunctions.loadSession(response.data.session_id);
          
          return response.data.session_id;
        } catch (error) {
          console.error('Error starting new session:', error);
          return null;
        } finally {
          isLoading.value = false;
        }
      },
      
      // Delete session
      deleteSession: async (sessionId) => {
        try {
          await axios.delete(`/api/session/${sessionId}`);
          
          if (currentSessionId.value === sessionId) {
            currentSessionId.value = null;
            messages.value = [];
            // Remove from localStorage
            localStorage.removeItem('lastActiveSession');
          }
          
          await sessionFunctions.loadSessions();
          return true;
        } catch (error) {
          console.error('Error deleting session:', error);
          return false;
        }
      },
      
      // Update session title
      updateSessionTitle: async (sessionId) => {
        if (!sessionId) {
          return false;
        }
        
        try {
          const response = await axios.post(`/api/session/${sessionId}/update-title`);
          
          if (response.data && response.data.new_title) {
            // Update session list
            await sessionFunctions.loadSessions();
            return true;
          } else {
            return false;
          }
        } catch (error) {
          console.error('Error updating session title:', error);
          return false;
        }
      },
      
      // Reload current session (for feedback functionality)
      reloadCurrentSession: async () => {
        if (currentSessionId.value) {
          try {
            await sessionFunctions.loadSession(currentSessionId.value);
            return true;
          } catch (error) {
            console.error('Error reloading current session:', error);
            return false;
          }
        }
        return false;
      },
      
      // Expose reactive variables for tests
      getState: () => ({
        sessions,
        currentSessionId,
        messages,
        isLoading,
        motdDismissed
      })
    };
    
    // Mock axios responses
    axios.get.mockImplementation((url) => {
      if (url.startsWith('/api/session/')) {
        return Promise.resolve({
          data: {
            messages: [
              { is_user: true, message: 'Test question', id: 'msg-1', timestamp: Date.now() / 1000 },
              { is_user: false, message: 'Test response', id: 'msg-2', timestamp: Date.now() / 1000 }
            ]
          }
        });
      } else if (url === '/api/sessions') {
        return Promise.resolve({
          data: {
            sessions: [
              { id: 123, title: 'Session 1', created_at: '2023-01-01T10:00:00Z' },
              { id: 456, title: 'Session 2', created_at: '2023-01-02T10:00:00Z' }
            ]
          }
        });
      }
      
      return Promise.reject(new Error('Unknown URL'));
    });
    
    axios.post.mockImplementation((url) => {
      if (url === '/api/session') {
        return Promise.resolve({
          data: {
            session_id: 789,
            title: 'Neue Unterhaltung'
          }
        });
      } else if (url.includes('/update-title')) {
        return Promise.resolve({
          data: {
            new_title: 'Updated Title'
          }
        });
      }
      
      return Promise.reject(new Error('Unknown URL'));
    });
    
    axios.delete.mockResolvedValue({});
  });
  
  // Test suite for loadSessions function
  describe('loadSessions', () => {
    it('should load and update sessions list', async () => {
      // Call function
      const result = await sessionFunctions.loadSessions();
      
      // Verify behavior
      expect(result).toBe(true);
      expect(axios.get).toHaveBeenCalledWith('/api/sessions');
      expect(sessionFunctions.getState().sessions.value).toHaveLength(2);
      expect(sessionFunctions.getState().sessions.value[0].id).toBe(123);
      expect(sessionFunctions.getState().sessions.value[1].id).toBe(456);
    });
    
    it('should detect title changes and update sessions', async () => {
      // First load
      await sessionFunctions.loadSessions();
      
      // Change mock response for second call
      axios.get.mockImplementationOnce(() => Promise.resolve({
        data: {
          sessions: [
            { id: 123, title: 'Session 1 Updated', created_at: '2023-01-01T10:00:00Z' },
            { id: 456, title: 'Session 2', created_at: '2023-01-02T10:00:00Z' }
          ]
        }
      }));
      
      // Second load
      const result = await sessionFunctions.loadSessions();
      
      // Verify behavior
      expect(result).toBe(true);
      expect(sessionFunctions.getState().sessions.value[0].title).toBe('Session 1 Updated');
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      axios.get.mockRejectedValueOnce(new Error('Network error'));
      
      // Call function
      const result = await sessionFunctions.loadSessions();
      
      // Verify behavior
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  // Test suite for loadSession function
  describe('loadSession', () => {
    it('should load a specific session with messages', async () => {
      // Call function
      const result = await sessionFunctions.loadSession(123);
      
      // Verify behavior
      expect(result).toBe(true);
      expect(axios.get).toHaveBeenCalledWith('/api/session/123');
      expect(sessionFunctions.getState().currentSessionId.value).toBe(123);
      expect(sessionFunctions.getState().messages.value).toHaveLength(2);
      expect(localStorage.setItem).toHaveBeenCalledWith('lastActiveSession', 123);
    });
    
    it('should set motdDismissed to true when messages exist', async () => {
      // Call function
      await sessionFunctions.loadSession(123);
      
      // Verify behavior
      expect(sessionFunctions.getState().motdDismissed.value).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith('motdDismissed', 'true');
    });
    
    it('should set motdDismissed to false when no messages exist', async () => {
      // Mock empty messages
      axios.get.mockImplementationOnce(() => Promise.resolve({
        data: { messages: [] }
      }));
      
      // Call function
      await sessionFunctions.loadSession(123);
      
      // Verify behavior
      expect(sessionFunctions.getState().motdDismissed.value).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith('motdDismissed');
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      axios.get.mockRejectedValueOnce(new Error('Network error'));
      
      // Call function
      const result = await sessionFunctions.loadSession(123);
      
      // Verify behavior
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
      expect(sessionFunctions.getState().isLoading.value).toBe(false);
    });
  });
  
  // Test suite for startNewSession function
  describe('startNewSession', () => {
    it('should create and load a new session', async () => {
      // Call function
      const sessionId = await sessionFunctions.startNewSession();
      
      // Verify behavior
      expect(sessionId).toBe(789);
      expect(axios.post).toHaveBeenCalledWith('/api/session', { title: 'Neue Unterhaltung' });
      expect(localStorage.removeItem).toHaveBeenCalledWith('motdDismissed');
      expect(sessionFunctions.getState().motdDismissed.value).toBe(false);
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      axios.post.mockRejectedValueOnce(new Error('Network error'));
      
      // Call function
      const sessionId = await sessionFunctions.startNewSession();
      
      // Verify behavior
      expect(sessionId).toBeNull();
      expect(console.error).toHaveBeenCalled();
      expect(sessionFunctions.getState().isLoading.value).toBe(false);
    });
  });
  
  // Test suite for deleteSession function
  describe('deleteSession', () => {
    it('should delete a session', async () => {
      // Call function
      const result = await sessionFunctions.deleteSession(123);
      
      // Verify behavior
      expect(result).toBe(true);
      expect(axios.delete).toHaveBeenCalledWith('/api/session/123');
    });
    
    it('should clear current session if deleting active session', async () => {
      // Set current session ID
      sessionFunctions.getState().currentSessionId.value = 123;
      
      // Call function
      await sessionFunctions.deleteSession(123);
      
      // Verify behavior
      expect(sessionFunctions.getState().currentSessionId.value).toBeNull();
      expect(sessionFunctions.getState().messages.value).toHaveLength(0);
      expect(localStorage.removeItem).toHaveBeenCalledWith('lastActiveSession');
    });
    
    it('should not clear current session if deleting a different session', async () => {
      // Set current session ID
      sessionFunctions.getState().currentSessionId.value = 456;
      sessionFunctions.getState().messages.value = [{ message: 'test' }];
      
      // Call function
      await sessionFunctions.deleteSession(123);
      
      // Verify behavior
      expect(sessionFunctions.getState().currentSessionId.value).toBe(456);
      expect(sessionFunctions.getState().messages.value).toHaveLength(1);
      expect(localStorage.removeItem).not.toHaveBeenCalledWith('lastActiveSession');
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      axios.delete.mockRejectedValueOnce(new Error('Network error'));
      
      // Call function
      const result = await sessionFunctions.deleteSession(123);
      
      // Verify behavior
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  // Test suite for session persistence functions
  describe('Session Persistence', () => {
    it('should save current session to localStorage', () => {
      // Call function
      sessionFunctions.saveCurrentSessionToStorage(123);
      
      // Verify behavior
      expect(localStorage.setItem).toHaveBeenCalledWith('lastActiveSession', 123);
    });
    
    it('should not save null session IDs', () => {
      // Call function
      sessionFunctions.saveCurrentSessionToStorage(null);
      
      // Verify behavior
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
    
    it('should restore last active session from localStorage', async () => {
      // Mock localStorage and sessions
      localStorage.getItem.mockReturnValue('123');
      sessionFunctions.getState().sessions.value = [
        { id: 123, title: 'Session 1' }
      ];
      
      // Mock loadSession
      const loadSessionSpy = vi.spyOn(sessionFunctions, 'loadSession').mockResolvedValue(true);
      
      // Call function
      const result = await sessionFunctions.restoreLastActiveSession();
      
      // Verify behavior
      expect(result).toBe(true);
      expect(loadSessionSpy).toHaveBeenCalledWith(123);
    });
    
    it('should handle case when stored session no longer exists', async () => {
      // Mock localStorage and sessions
      localStorage.getItem.mockReturnValue('999');
      sessionFunctions.getState().sessions.value = [
        { id: 123, title: 'Session 1' }
      ];
      
      // Call function
      const result = await sessionFunctions.restoreLastActiveSession();
      
      // Verify behavior
      expect(result).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith('lastActiveSession');
    });
  });
  
  // Test suite for updateSessionTitle function
  describe('updateSessionTitle', () => {
    it('should update a session title', async () => {
      // Call function
      const result = await sessionFunctions.updateSessionTitle(123);
      
      // Verify behavior
      expect(result).toBe(true);
      expect(axios.post).toHaveBeenCalledWith('/api/session/123/update-title');
    });
    
    it('should return false for null session ID', async () => {
      // Call function
      const result = await sessionFunctions.updateSessionTitle(null);
      
      // Verify behavior
      expect(result).toBe(false);
      expect(axios.post).not.toHaveBeenCalled();
    });
    
    it('should handle API errors', async () => {
      // Mock API error
      axios.post.mockRejectedValueOnce(new Error('Network error'));
      
      // Call function
      const result = await sessionFunctions.updateSessionTitle(123);
      
      // Verify behavior
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
    
    it('should return false when API response has no new_title', async () => {
      // Mock API response without new_title
      axios.post.mockResolvedValueOnce({
        data: {}
      });
      
      // Call function
      const result = await sessionFunctions.updateSessionTitle(123);
      
      // Verify behavior
      expect(result).toBe(false);
    });
  });
  
  // Test suite for reloadCurrentSession function
  describe('reloadCurrentSession', () => {
    it('should reload the current session', async () => {
      // Set current session ID
      sessionFunctions.getState().currentSessionId.value = 123;
      
      // Mock loadSession
      const loadSessionSpy = vi.spyOn(sessionFunctions, 'loadSession').mockResolvedValue(true);
      
      // Call function
      const result = await sessionFunctions.reloadCurrentSession();
      
      // Verify behavior
      expect(result).toBe(true);
      expect(loadSessionSpy).toHaveBeenCalledWith(123);
    });
    
    it('should return false when no current session', async () => {
      // Set null session ID
      sessionFunctions.getState().currentSessionId.value = null;
      
      // Call function
      const result = await sessionFunctions.reloadCurrentSession();
      
      // Verify behavior
      expect(result).toBe(false);
    });
  });
});