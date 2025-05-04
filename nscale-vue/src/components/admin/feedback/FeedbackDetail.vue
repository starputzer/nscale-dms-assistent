<template>
  <div class="feedback-detail" :class="{ 'expanded': expanded }">
    <div class="feedback-header">
      <div class="feedback-title">
        <div class="feedback-badge" :class="feedbackType">
          <i :class="[
            'fas', 
            isPositive ? 'fa-thumbs-up' : 'fa-thumbs-down'
          ]"></i>
        </div>
        <h3>Feedback-Details</h3>
      </div>
      
      <div class="feedback-actions">
        <button 
          class="action-btn toggle-btn" 
          @click="toggleExpanded"
          :title="expanded ? 'Minimieren' : 'Maximieren'"
        >
          <i :class="['fas', expanded ? 'fa-compress-alt' : 'fa-expand-alt']"></i>
        </button>
        <button class="action-btn close-btn" @click="$emit('close')" title="Schließen">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
    
    <div class="feedback-content">
      <div class="detail-section">
        <div class="detail-grid">
          <!-- Session info -->
          <div class="detail-item">
            <div class="detail-label">Session-ID</div>
            <div class="detail-value">
              <span class="monospace">{{ feedback.session_id }}</span>
              <button 
                class="link-btn" 
                @click="$emit('view-session', feedback.session_id)"
              >
                <i class="fas fa-external-link-alt"></i>
                Session öffnen
              </button>
            </div>
          </div>
          
          <!-- Date -->
          <div class="detail-item">
            <div class="detail-label">Datum & Zeit</div>
            <div class="detail-value">
              {{ formatDate(feedback.created_at) }}
            </div>
          </div>
          
          <!-- Type -->
          <div class="detail-item">
            <div class="detail-label">Feedback-Typ</div>
            <div class="detail-value status-badge" :class="feedbackType">
              <i :class="[
                'fas', 
                isPositive ? 'fa-thumbs-up' : 'fa-thumbs-down'
              ]"></i>
              {{ isPositive ? 'Positiv' : 'Negativ' }}
            </div>
          </div>
          
          <!-- User -->
          <div class="detail-item">
            <div class="detail-label">Benutzer</div>
            <div class="detail-value">
              {{ feedback.user_email || 'Anonym' }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Comment section -->
      <div v-if="feedback.comment" class="detail-section comment-section">
        <h4>Kommentar</h4>
        <div class="comment-content">{{ feedback.comment }}</div>
      </div>
      
      <!-- Message section -->
      <div class="detail-section">
        <h4>Assistenten-Antwort</h4>
        <div class="message-content" v-html="formatMessage(feedback.message_text)"></div>
      </div>
      
      <!-- Context messages -->
      <div v-if="feedback.context_messages && feedback.context_messages.length > 0" class="detail-section">
        <h4>Konversationsverlauf</h4>
        <div class="context-messages">
          <div 
            v-for="(message, index) in feedback.context_messages" 
            :key="index"
            class="context-message"
            :class="{ 'user-message': message.is_user }"
          >
            <div class="message-header">
              <span class="message-author">
                {{ message.is_user ? 'Benutzer' : 'Assistent' }}
              </span>
              <span class="message-time">
                {{ formatDate(message.created_at) }}
              </span>
            </div>
            <div class="message-text" v-html="formatMessage(message.message)"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Props
const props = defineProps({
  feedback: {
    type: Object,
    required: true
  },
  initialExpanded: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['close', 'view-session']);

// State
const expanded = ref(props.initialExpanded);

// Computed
const isPositive = computed(() => {
  return props.feedback.is_positive;
});

const feedbackType = computed(() => {
  return isPositive.value ? 'positive' : 'negative';
});

// Methods
const toggleExpanded = () => {
  expanded.value = !expanded.value;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const formatMessage = (text) => {
  if (!text) return '';
  
  // Use marked.js to parse markdown
  // This will convert markdown to HTML with DOMPurify for XSS protection
  try {
    const rawHtml = marked.parse(text, {
      gfm: true,            // GitHub Flavored Markdown
      breaks: true,         // Convert line breaks to <br>
      smartypants: true,    // Typographic punctuation
    });
    
    // Sanitize the HTML to prevent XSS attacks
    return DOMPurify.sanitize(rawHtml);
  } catch (e) {
    console.error('Error parsing markdown:', e);
    return text;
  }
};
</script>

<style scoped>
.feedback-detail {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  max-width: 800px;
  width: 100%;
  max-height: 70vh;
  transition: all 0.3s ease;
}

.feedback-detail.expanded {
  position: fixed;
  top: 2rem;
  left: 2rem;
  right: 2rem;
  bottom: 2rem;
  max-width: none;
  max-height: none;
  width: auto;
  height: auto;
  z-index: 1000;
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.feedback-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.feedback-title h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.feedback-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  color: white;
  flex-shrink: 0;
}

.feedback-badge.positive {
  background-color: #22c55e;
}

.feedback-badge.negative {
  background-color: #ef4444;
}

.feedback-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: none;
  padding: 0.375rem;
  border-radius: 0.25rem;
  color: #64748b;
  cursor: pointer;
}

.action-btn:hover {
  background-color: #f1f5f9;
  color: #1e293b;
}

.close-btn:hover {
  background-color: #fee2e2;
  color: #b91c1c;
}

.feedback-content {
  padding: 1.5rem;
  overflow-y: auto;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-section {
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  overflow: hidden;
}

.detail-section h4 {
  margin: 0;
  padding: 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
}

.detail-value {
  font-size: 0.875rem;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.monospace {
  font-family: monospace;
  font-size: 0.9rem;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #3b82f6;
  background: none;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
}

.link-btn:hover {
  background-color: #eff6ff;
  text-decoration: underline;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.positive {
  background-color: #dcfce7;
  color: #166534;
}

.status-badge.negative {
  background-color: #fee2e2;
  color: #b91c1c;
}

.comment-content {
  padding: 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #334155;
  background-color: #fffbeb;
  white-space: pre-line;
}

.message-content {
  padding: 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #334155;
  white-space: pre-line;
}

.context-messages {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  max-height: 350px;
  overflow-y: auto;
}

.context-message {
  padding: 1rem;
  border-radius: 0.375rem;
  background-color: #f1f5f9;
}

.context-message.user-message {
  background-color: #e0f2fe;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
}

.message-author {
  font-weight: 600;
  color: #475569;
}

.message-time {
  color: #64748b;
}

.message-text {
  font-size: 0.875rem;
  line-height: 1.5;
  color: #334155;
  white-space: pre-line;
}

/* Allow HTML rendering from the markdown formatting */
:deep(.message-content a) {
  color: #3b82f6;
  text-decoration: underline;
}

:deep(.message-content ul),
:deep(.message-content ol) {
  padding-left: 1.5rem;
}

:deep(.message-content code) {
  font-family: monospace;
  background-color: #f1f5f9;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}

:deep(.message-content pre) {
  background-color: #1e293b;
  color: #f8fafc;
  padding: 1rem;
  border-radius: 0.375rem;
  overflow-x: auto;
}

:deep(.message-text a),
:deep(.message-text code),
:deep(.message-text pre) {
  /* Same styling as message-content */
  font-family: inherit;
}

/* Dark Mode Support */
:global(.theme-dark) .feedback-detail {
  background-color: #1e1e1e;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
}

:global(.theme-dark) .feedback-header {
  border-bottom-color: #333;
}

:global(.theme-dark) .feedback-title h3 {
  color: #e0e0e0;
}

:global(.theme-dark) .action-btn {
  color: #aaa;
}

:global(.theme-dark) .action-btn:hover {
  background-color: #333;
  color: #fff;
}

:global(.theme-dark) .close-btn:hover {
  background-color: #661a1a;
  color: #fff;
}

:global(.theme-dark) .detail-section {
  border-color: #333;
}

:global(.theme-dark) .detail-section h4 {
  background-color: #252525;
  color: #e0e0e0;
  border-bottom-color: #333;
}

:global(.theme-dark) .detail-label {
  color: #bbb;
}

:global(.theme-dark) .detail-value {
  color: #e0e0e0;
}

:global(.theme-dark) .link-btn {
  color: #5c9be0;
}

:global(.theme-dark) .link-btn:hover {
  background-color: #253851;
}

:global(.theme-dark) .status-badge.positive {
  background-color: #133929;
  color: #4ade80;
}

:global(.theme-dark) .status-badge.negative {
  background-color: #4c1818;
  color: #f87171;
}

:global(.theme-dark) .comment-content {
  background-color: #332711;
  color: #e0e0e0;
}

:global(.theme-dark) .message-content,
:global(.theme-dark) .message-text {
  color: #e0e0e0;
}

:global(.theme-dark) .context-message {
  background-color: #252525;
}

:global(.theme-dark) .context-message.user-message {
  background-color: #163850;
}

:global(.theme-dark) .message-author {
  color: #bbb;
}

:global(.theme-dark) .message-time {
  color: #999;
}

:global(.theme-dark) :deep(.message-content a),
:global(.theme-dark) :deep(.message-text a) {
  color: #5c9be0;
}

:global(.theme-dark) :deep(.message-content code),
:global(.theme-dark) :deep(.message-text code) {
  background-color: #252525;
  color: #e0e0e0;
}

:global(.theme-dark) :deep(.message-content pre),
:global(.theme-dark) :deep(.message-text pre) {
  background-color: #111827;
  color: #f9fafb;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .feedback-detail.expanded {
    top: 0.5rem;
    left: 0.5rem;
    right: 0.5rem;
    bottom: 0.5rem;
  }
}
</style>