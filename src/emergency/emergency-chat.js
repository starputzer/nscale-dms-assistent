/**
 * EMERGENCY CHAT RECOVERY SCRIPT
 * 
 * This script provides an emergency fallback for chat functionality
 * when Vue component rendering fails. It directly accesses the store
 * and renders messages to the DOM, bypassing Vue's rendering system.
 * 
 * To use: Add this script with a defer attribute to your HTML
 *   <script src="/emergency-chat.js" defer></script>
 */

(function() {
  'use strict';
  
  // Configuration
  const config = {
    debug: true,                   // Enable verbose logging
    autoActivateAfter: 5000,       // Auto-activate after 5s if no messages rendered
    pollInterval: 1000,            // Check for message updates every 1s
    containerSelector: '.n-chat-main', // Main chat container
    messageListSelector: '.n-message-list, .n-chat-main', // Where to look for message list
    messageItemSelector: '.n-message-item', // Individual message items
    userMessageClass: 'n-message-item--user',
    assistantMessageClass: 'n-message-item--assistant',
    systemMessageClass: 'n-message-item--system',
    errorMessageClass: 'n-message-item--error',
    streamingMessageClass: 'n-message-item--streaming',
    cssPath: '/emergency-chat.css' // Path to emergency CSS
  };

  // State
  let state = {
    active: false,
    initialized: false,
    emergencyContainer: null,
    lastCheckTime: 0,
    messagesCache: {},
    currentSessionId: null,
    checkCount: 0,
    failures: 0,
    pinia: null,
    sessionsStore: null,
    messageCount: 0,
    streamingId: null,
    streamingContent: '',
    observer: null
  };

  // Log messages with consistent formatting
  function log(...args) {
    if (config.debug) {
      console.log('[EMERGENCY-CHAT]', ...args);
    }
  }

  // Detect Pinia store for direct state access
  function detectStore() {
    try {
      // Different ways to access the store
      if (window.__pinia) {
        state.pinia = window.__pinia;
        log('Found Pinia via window.__pinia');
      } else if (window.$pinia) {
        state.pinia = window.$pinia;
        log('Found Pinia via window.$pinia');
      } else if (window.Pinia) {
        state.pinia = window.Pinia;
        log('Found Pinia via window.Pinia');
      } else {
        // Last resort: scan for Pinia in Vue instance
        const vueInstance = Array.from(document.querySelectorAll('*'))
          .find(el => el.__vue__ || el.__vue_app__ || el._vnode);
          
        if (vueInstance) {
          if (vueInstance.__vue__?.$pinia) {
            state.pinia = vueInstance.__vue__.$pinia;
            log('Found Pinia via Vue instance');
          } else if (vueInstance.__vue_app__?.config?.globalProperties?.$pinia) {
            state.pinia = vueInstance.__vue_app__.config.globalProperties.$pinia;
            log('Found Pinia via Vue app');
          }
        }
      }
      
      // Extract sessions store
      if (state.pinia) {
        // Try to find sessions store
        const storeId = Object.keys(state.pinia.state.value).find(key => 
          key === 'sessions' || state.pinia.state.value[key].sessions || 
          state.pinia.state.value[key].currentSessionId
        );
        
        if (storeId) {
          state.sessionsStore = state.pinia.state.value[storeId];
          log('Found sessions store:', storeId);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      log('Error detecting store:', error);
      return false;
    }
  }

  // Extract messages from the store
  function extractMessages() {
    if (!state.sessionsStore) {
      log('No store available for message extraction');
      return null;
    }
    
    try {
      // Get current session ID
      const sessionId = state.sessionsStore.currentSessionId;
      if (!sessionId) {
        log('No current session ID found');
        return [];
      }
      
      state.currentSessionId = sessionId;
      
      // Get messages for session (try different approaches)
      let messages = [];
      
      // Direct access to messages collection
      if (state.sessionsStore.messages && state.sessionsStore.messages[sessionId]) {
        messages = state.sessionsStore.messages[sessionId];
        log(`Found ${messages.length} messages directly in store`);
      }
      // Try computed messages if available
      else if (state.sessionsStore.allCurrentMessages) {
        messages = state.sessionsStore.allCurrentMessages;
        log(`Found ${messages.length} messages via allCurrentMessages`);
      }
      // Last resort: combine messages from different sources
      else {
        // Try regular messages
        if (state.sessionsStore.messages && state.sessionsStore.messages[sessionId]) {
          messages = messages.concat(state.sessionsStore.messages[sessionId]);
        }
        
        // Add pending messages if they exist
        if (state.sessionsStore.pendingMessages && state.sessionsStore.pendingMessages[sessionId]) {
          messages = messages.concat(state.sessionsStore.pendingMessages[sessionId]);
        }
        
        log(`Found ${messages.length} messages by combining collections`);
      }
      
      // Sort messages by timestamp
      messages.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Check for streaming state
      const isStreaming = state.sessionsStore.isStreaming || state.sessionsStore.streaming?.isActive;
      state.streaming = isStreaming;
      
      // Find streaming message if appropriate
      if (isStreaming) {
        const streamingMessage = messages.find(msg => msg.isStreaming);
        if (streamingMessage) {
          state.streamingId = streamingMessage.id;
          state.streamingContent = streamingMessage.content;
          log('Found streaming message:', state.streamingId);
        }
      } else {
        state.streamingId = null;
        state.streamingContent = '';
      }
      
      return messages;
    } catch (error) {
      log('Error extracting messages:', error);
      return [];
    }
  }

  // Format message content with basic Markdown support
  function formatMessageContent(content) {
    if (!content) return '';
    
    // Simple Markdown-like formatting
    // Convert code blocks with ```
    content = content.replace(
      /```([a-z]*)\n([\s\S]*?)```/g, 
      '<div class="emergency-code-block"><div class="emergency-code-lang">$1</div><pre><code>$2</code></pre></div>'
    );
    
    // Convert inline code with `code`
    content = content.replace(
      /`([^`]+)`/g, 
      '<code>$1</code>'
    );
    
    // Convert links
    content = content.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g, 
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    
    // Convert headers
    content = content.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    content = content.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    content = content.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Convert paragraphs - split by double newlines
    const paragraphs = content.split(/\n\s*\n/);
    content = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    
    return content;
  }

  // Create a message element for direct DOM insertion
  function createMessageElement(message) {
    const div = document.createElement('div');
    div.className = 'emergency-message';
    div.id = `emergency-message-${message.id}`;
    div.dataset.role = message.role;
    div.dataset.messageId = message.id;
    div.dataset.timestamp = message.timestamp;
    
    // Add role-based classes
    if (message.role === 'user') {
      div.classList.add('emergency-message-user');
    } else if (message.role === 'assistant') {
      div.classList.add('emergency-message-assistant');
    } else if (message.role === 'system') {
      div.classList.add('emergency-message-system');
    }
    
    // Add status-based classes
    if (message.status === 'error') {
      div.classList.add('emergency-message-error');
    }
    
    // Add streaming class if needed
    if (message.isStreaming) {
      div.classList.add('emergency-message-streaming');
    }
    
    // Create message header
    const header = document.createElement('div');
    header.className = 'emergency-message-header';
    
    // Add role label
    const roleLabel = document.createElement('div');
    roleLabel.className = 'emergency-message-role';
    roleLabel.textContent = formatRoleLabel(message.role);
    header.appendChild(roleLabel);
    
    // Add timestamp
    if (message.timestamp) {
      const timeLabel = document.createElement('div');
      timeLabel.className = 'emergency-message-time';
      timeLabel.textContent = formatTimestamp(message.timestamp);
      header.appendChild(timeLabel);
    }
    
    div.appendChild(header);
    
    // Create message content
    const content = document.createElement('div');
    content.className = 'emergency-message-content';
    content.innerHTML = formatMessageContent(message.content);
    div.appendChild(content);
    
    return div;
  }

  // Helper function to format role label
  function formatRoleLabel(role) {
    switch (role) {
      case 'user': return 'Sie';
      case 'assistant': return 'Assistent';
      case 'system': return 'System';
      default: return role;
    }
  }

  // Helper function to format timestamp
  function formatTimestamp(timestamp) {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  }

  // Create emergency container if needed
  function createEmergencyContainer() {
    // Check if container already exists
    if (state.emergencyContainer) {
      return state.emergencyContainer;
    }
    
    // First, look for the proper container element
    const container = document.querySelector(config.containerSelector);
    if (!container) {
      log('Could not find container element');
      return null;
    }
    
    // Create emergency container
    const emergencyContainer = document.createElement('div');
    emergencyContainer.id = 'emergency-chat-container';
    emergencyContainer.className = 'emergency-chat';
    
    // Add header
    const header = document.createElement('div');
    header.className = 'emergency-header';
    header.innerHTML = `
      <h3>Chat (Notfall-Modus)</h3>
      <div class="emergency-controls">
        <button id="emergency-refresh">Aktualisieren</button>
        <button id="emergency-hide">Ausblenden</button>
      </div>
    `;
    emergencyContainer.appendChild(header);
    
    // Add messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'emergency-messages';
    messagesContainer.id = 'emergency-messages';
    emergencyContainer.appendChild(messagesContainer);
    
    // Add status bar
    const statusBar = document.createElement('div');
    statusBar.className = 'emergency-status';
    statusBar.innerHTML = `
      <span class="emergency-status-text">Notfall-Modus aktiv</span>
      <span class="emergency-status-time" id="emergency-status-time"></span>
    `;
    emergencyContainer.appendChild(statusBar);
    
    // Insert container
    container.appendChild(emergencyContainer);
    
    // Add event listeners
    document.getElementById('emergency-refresh').addEventListener('click', function() {
      refreshMessages();
    });
    
    document.getElementById('emergency-hide').addEventListener('click', function() {
      emergencyContainer.style.display = 'none';
    });
    
    // Update state
    state.emergencyContainer = emergencyContainer;
    state.active = true;
    
    log('Created emergency container');
    return emergencyContainer;
  }

  // Update the message display
  function updateMessageDisplay(messages) {
    if (!messages || !Array.isArray(messages)) {
      log('No valid messages to display');
      return;
    }
    
    const container = createEmergencyContainer();
    if (!container) {
      log('Could not create emergency container');
      return;
    }
    
    const messagesContainer = document.getElementById('emergency-messages');
    if (!messagesContainer) {
      log('Could not find messages container');
      return;
    }
    
    // Update status time
    const statusTime = document.getElementById('emergency-status-time');
    if (statusTime) {
      statusTime.textContent = new Date().toLocaleTimeString();
    }
    
    // Only update if message count has changed
    if (messages.length === state.messageCount && !state.streaming) {
      return;
    }
    
    state.messageCount = messages.length;
    
    // Clear container or selectively update
    if (state.streaming) {
      // If streaming, only update the streaming message
      const streamingElement = document.querySelector(`.emergency-message[data-message-id="${state.streamingId}"]`);
      if (streamingElement) {
        const contentElement = streamingElement.querySelector('.emergency-message-content');
        if (contentElement) {
          contentElement.innerHTML = formatMessageContent(state.streamingContent);
          return; // Don't rebuild everything if we just need to update streaming
        }
      }
    } else {
      // Otherwise, rebuild all messages
      messagesContainer.innerHTML = '';
    }
    
    // Add each message to container
    messages.forEach(message => {
      const existingElement = document.getElementById(`emergency-message-${message.id}`);
      
      // Skip if element already exists and we're not streaming
      if (existingElement && !(message.id === state.streamingId)) {
        return;
      }
      
      // Create new message element
      const messageElement = createMessageElement(message);
      messagesContainer.appendChild(messageElement);
    });
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Check for problems and activate emergency mode if needed
  function checkForProblems() {
    state.checkCount++;
    state.lastCheckTime = Date.now();
    
    // Skip if already active
    if (state.active) {
      refreshMessages();
      return;
    }
    
    // Find message list
    const messageList = document.querySelector(config.messageListSelector);
    if (!messageList) {
      log('Message list not found in DOM');
      state.failures++;
      
      // Automatically activate after several failures
      if (state.failures >= 3 && state.checkCount >= 5) {
        log('Activating emergency mode - message list not found');
        activateEmergencyMode();
      }
      return;
    }
    
    // Find message items
    const messageItems = document.querySelectorAll(config.messageItemSelector);
    
    // Extract messages from store
    const storeMessages = extractMessages();
    const storeMessagesCount = storeMessages ? storeMessages.length : 0;
    
    // Check if messages are properly displayed
    if (messageItems.length === 0 && storeMessagesCount > 0) {
      log('No message items in DOM but store has messages');
      state.failures++;
      
      // Activate after several failures
      if (state.failures >= 3) {
        log('Activating emergency mode - message rendering failed');
        activateEmergencyMode();
      }
      return;
    }
    
    // Check if message count matches
    if (messageItems.length < storeMessagesCount && state.failures >= 3) {
      log(`Message count mismatch - DOM: ${messageItems.length}, Store: ${storeMessagesCount}`);
      activateEmergencyMode();
      return;
    }
    
    // All checks passed
    state.failures = 0;
  }

  // Activate emergency mode
  function activateEmergencyMode() {
    if (state.active) return;
    
    log('Activating emergency mode');
    
    // Load CSS
    if (config.cssPath) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = config.cssPath;
      document.head.appendChild(link);
    }
    
    // Create container and display messages
    createEmergencyContainer();
    refreshMessages();
    
    // Set up polling for message updates
    setInterval(refreshMessages, config.pollInterval);
    
    // Mark as active
    state.active = true;
  }

  // Refresh messages from store
  function refreshMessages() {
    if (!state.active) return;
    
    // Only proceed if we have store access
    if (!state.sessionsStore && !detectStore()) {
      log('Cannot refresh messages - no store access');
      return;
    }
    
    // Extract and display messages
    const messages = extractMessages();
    if (messages && messages.length > 0) {
      updateMessageDisplay(messages);
    } else {
      log('No messages to display');
    }
  }

  // Initialize the emergency chat system
  function initialize() {
    if (state.initialized) return;
    
    log('Initializing emergency chat system');
    
    // Try to detect store
    detectStore();
    
    // Set up auto-check timer
    setInterval(checkForProblems, config.pollInterval);
    
    // Set up auto-activate timer if configured
    if (config.autoActivateAfter > 0) {
      setTimeout(() => {
        // Check if we have messages in store but none are displayed
        const storeMessages = extractMessages();
        if (storeMessages && storeMessages.length > 0) {
          const messageItems = document.querySelectorAll(config.messageItemSelector);
          if (messageItems.length === 0 || messageItems.length < storeMessages.length) {
            log('Auto-activating emergency mode - message rendering likely failed');
            activateEmergencyMode();
          }
        }
      }, config.autoActivateAfter);
    }
    
    // Set up mutation observer to detect DOM changes
    state.observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && !state.active) {
          // Check if any message-related elements were added or removed
          const messageRelated = Array.from(mutation.addedNodes).some(node => 
            node.nodeType === 1 && (
              (node as Element).classList?.contains('n-message-item') ||
              (node as Element).classList?.contains('n-message-list')
            )
          );
          
          if (messageRelated) {
            checkForProblems();
          }
        }
      });
    });
    
    // Start observing the document
    state.observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
    
    // Add global access
    window.emergencyChat = {
      activate: activateEmergencyMode,
      refresh: refreshMessages,
      state: state,
      getMessages: extractMessages
    };
    
    state.initialized = true;
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();