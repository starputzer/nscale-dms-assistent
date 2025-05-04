// src/components/common/ContentRenderer.vue
<template>
  <div class="content-renderer">
    <!-- Markdown Content with syntax highlighting -->
    <div v-if="type === 'markdown'" class="markdown-container" ref="markdownContainer"></div>
    
    <!-- Plain Text Content -->
    <pre v-else-if="type === 'text'" class="text-container">{{ content }}</pre>
    
    <!-- HTML Content with sanitization -->
    <div v-else-if="type === 'html'" class="html-container" ref="htmlContainer"></div>
    
    <!-- JSON Formatter -->
    <pre v-else-if="type === 'json'" class="json-container">{{ formattedJson }}</pre>
    
    <!-- Fallback for unknown content types -->
    <div v-else class="fallback-container">
      <p>Vorschau für diesen Inhaltstyp nicht verfügbar.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Props
const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text',
    validator: (value) => ['markdown', 'text', 'html', 'json'].includes(value)
  }
});

// DOM Refs
const markdownContainer = ref(null);
const htmlContainer = ref(null);

// Format JSON if needed
const formattedJson = computed(() => {
  if (props.type !== 'json' || !props.content) return props.content;
  
  try {
    const jsonObj = JSON.parse(props.content);
    return JSON.stringify(jsonObj, null, 2);
  } catch (error) {
    console.error('Fehler beim Formatieren des JSONs:', error);
    return props.content;
  }
});

// Update content when it changes
watch(() => props.content, updateContent, { immediate: true });
watch(() => props.type, updateContent);

// Render content based on type
function updateContent() {
  if (!props.content) return;
  
  // Use setTimeout to ensure DOM is ready
  setTimeout(() => {
    if (props.type === 'markdown' && markdownContainer.value) {
      try {
        const htmlContent = marked(props.content, { 
          breaks: true,
          gfm: true 
        });
        // Sanitize the HTML to prevent XSS attacks
        const sanitizedHtml = DOMPurify.sanitize(htmlContent);
        markdownContainer.value.innerHTML = sanitizedHtml;
      } catch (e) {
        console.error('Markdown rendering error:', e);
        markdownContainer.value.innerHTML = '<p>Fehler beim Rendern des Markdowns</p>';
      }
    } else if (props.type === 'html' && htmlContainer.value) {
      try {
        // Sanitize the HTML to prevent XSS attacks
        const sanitizedHtml = DOMPurify.sanitize(props.content);
        htmlContainer.value.innerHTML = sanitizedHtml;
      } catch (e) {
        console.error('HTML rendering error:', e);
        htmlContainer.value.innerHTML = '<p>Fehler beim Rendern des HTML-Inhalts</p>';
      }
    }
  }, 0);
}

// Setup initial content
onMounted(() => {
  updateContent();
});
</script>

<style scoped>
.content-renderer {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.markdown-container {
  padding: 1rem;
}

.text-container {
  background-color: var(--nscale-gray-light, #f5f5f5);
  padding: 1rem;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre-wrap;
  overflow: auto;
  max-height: 500px;
}

.html-container {
  padding: 0.5rem;
  border: 1px solid var(--nscale-gray-medium, #e0e0e0);
  border-radius: 4px;
  overflow: auto;
  max-height: 500px;
}

.json-container {
  background-color: var(--nscale-gray-light, #f5f5f5);
  padding: 1rem;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre-wrap;
  overflow: auto;
  max-height: 500px;
}

.fallback-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
  color: var(--nscale-gray-dark, #666);
}

/* Styles for markdown content */
.markdown-container :deep(h1),
.markdown-container :deep(h2),
.markdown-container :deep(h3),
.markdown-container :deep(h4),
.markdown-container :deep(h5),
.markdown-container :deep(h6) {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-container :deep(h1) {
  font-size: 2em;
}

.markdown-container :deep(h2) {
  font-size: 1.5em;
}

.markdown-container :deep(h3) {
  font-size: 1.25em;
}

.markdown-container :deep(p) {
  margin-top: 0;
  margin-bottom: 1em;
}

.markdown-container :deep(a) {
  color: var(--nscale-primary, #1a73e8);
  text-decoration: none;
}

.markdown-container :deep(a:hover) {
  text-decoration: underline;
}

.markdown-container :deep(code) {
  font-family: monospace;
  background-color: var(--nscale-gray-light, #f5f5f5);
  padding: 0.2em 0.4em;
  border-radius: 3px;
}

.markdown-container :deep(pre) {
  background-color: var(--nscale-gray-light, #f5f5f5);
  padding: 1em;
  border-radius: 4px;
  overflow: auto;
}

.markdown-container :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-container :deep(blockquote) {
  margin: 0 0 1em;
  padding: 0 1em;
  color: var(--nscale-gray-dark, #666);
  border-left: 0.25em solid var(--nscale-gray-medium, #e0e0e0);
}

.markdown-container :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 1em;
}

.markdown-container :deep(th),
.markdown-container :deep(td) {
  padding: 0.5em;
  border: 1px solid var(--nscale-gray-medium, #e0e0e0);
}

.markdown-container :deep(th) {
  background-color: var(--nscale-gray-light, #f5f5f5);
  font-weight: 600;
}

/* Dark mode adjustments */
:global(.theme-dark) .text-container,
:global(.theme-dark) .json-container {
  background-color: #333;
  color: #f0f0f0;
}

:global(.theme-dark) .html-container {
  border-color: #555;
}

:global(.theme-dark) .markdown-container :deep(code),
:global(.theme-dark) .markdown-container :deep(pre) {
  background-color: #333;
  color: #f0f0f0;
}

:global(.theme-dark) .markdown-container :deep(blockquote) {
  color: #aaa;
  border-left-color: #555;
}

:global(.theme-dark) .markdown-container :deep(th) {
  background-color: #333;
}

:global(.theme-dark) .markdown-container :deep(th),
:global(.theme-dark) .markdown-container :deep(td) {
  border-color: #555;
}

:global(.theme-dark) .fallback-container {
  color: #aaa;
}

:global(.theme-dark) .markdown-container :deep(a) {
  color: #00c060;
}

/* High contrast mode adjustments */
:global(.theme-contrast) .text-container,
:global(.theme-contrast) .json-container {
  background-color: #000;
  color: #fff;
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .html-container {
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .markdown-container :deep(code),
:global(.theme-contrast) .markdown-container :deep(pre) {
  background-color: #333300;
  color: #fff;
  border: 1px solid #ffeb3b;
}

:global(.theme-contrast) .markdown-container :deep(blockquote) {
  color: #fff;
  border-left-color: #ffeb3b;
}

:global(.theme-contrast) .markdown-container :deep(th) {
  background-color: #333300;
  color: #ffeb3b;
}

:global(.theme-contrast) .markdown-container :deep(th),
:global(.theme-contrast) .markdown-container :deep(td) {
  border-color: #ffeb3b;
}

:global(.theme-contrast) .fallback-container {
  color: #ffeb3b;
}

:global(.theme-contrast) .markdown-container :deep(a) {
  color: #ffeb3b;
}
</style>