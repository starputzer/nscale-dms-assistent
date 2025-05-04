<template>
  <div class="motd-preview">
    <div class="preview-header">
      <h3 class="preview-title">Vorschau</h3>
      <div class="preview-controls">
        <div class="preview-toggle">
          <label>
            <input type="checkbox" v-model="showAsMobile">
            <span>Mobile Ansicht</span>
          </label>
        </div>
      </div>
    </div>
    
    <div class="preview-container" :class="{ 'mobile-view': showAsMobile }">
      <div 
        v-if="motdConfig.enabled" 
        class="motd-message"
        :class="{'dismissible': motdConfig.display.dismissible}"
        :style="{
          backgroundColor: motdConfig.style.backgroundColor,
          borderColor: motdConfig.style.borderColor,
          color: motdConfig.style.textColor
        }"
      >
        <div class="motd-inner">
          <div class="motd-icon" v-if="motdConfig.style.iconClass">
            <i :class="['fas', `fa-${motdConfig.style.iconClass}`]"></i>
          </div>
          <div class="motd-content" v-html="renderedContent"></div>
          <div v-if="motdConfig.display.dismissible" class="motd-close">
            <button class="close-button" title="Schließen">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>
      <div v-else class="motd-disabled">
        <i class="fas fa-eye-slash"></i>
        <p>MOTD ist deaktiviert und wird Benutzern nicht angezeigt.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const props = defineProps({
  motdConfig: {
    type: Object,
    required: true
  }
});

const showAsMobile = ref(false);

// Markdown in HTML umwandeln mit DOMPurify zur Sicherheit
const renderedContent = computed(() => {
  if (!props.motdConfig.content) return '';
  
  try {
    // Markdown in HTML konvertieren
    const rawHtml = marked.parse(props.motdConfig.content);
    
    // HTML bereinigen (XSS-Schutz)
    return DOMPurify.sanitize(rawHtml);
  } catch (error) {
    console.error('Fehler beim Rendern des Markdown-Inhalts:', error);
    return `<p class="error">Fehler beim Rendern des Inhalts</p>`;
  }
});
</script>

<style scoped>
.motd-preview {
  margin-top: 2rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background-color: #f9f9f9;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.preview-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.preview-controls {
  display: flex;
  align-items: center;
}

.preview-toggle {
  display: flex;
  align-items: center;
}

.preview-toggle label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 0.9rem;
  color: #666;
}

.preview-toggle input {
  margin-right: 8px;
}

.preview-container {
  padding: 1.5rem;
  transition: all 0.3s ease;
  background-color: #f5f5f5;
  min-height: 200px;
  max-height: 600px;
  overflow: auto;
}

.preview-container.mobile-view {
  max-width: 400px;
  margin: 0 auto;
  border: 10px solid #333;
  border-radius: 20px;
  padding: 0.75rem;
}

.motd-message {
  border-radius: 8px;
  padding: 1rem;
  border-width: 1px;
  border-style: solid;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  margin-bottom: 1rem;
  position: relative;
}

.motd-message.dismissible {
  padding-right: 2.5rem;
}

.motd-inner {
  display: flex;
}

.motd-icon {
  flex-shrink: 0;
  margin-right: 1rem;
  font-size: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: flex-start;
}

.motd-content {
  flex-grow: 1;
  font-size: 0.95rem;
}

.motd-content :deep(p) {
  margin-top: 0;
  margin-bottom: 0.75rem;
}

.motd-content :deep(p:last-child) {
  margin-bottom: 0;
}

.motd-content :deep(ul), .motd-content :deep(ol) {
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
  padding-left: 1.5rem;
}

.motd-content :deep(a) {
  color: inherit;
  text-decoration: underline;
}

.motd-content :deep(h1), .motd-content :deep(h2), .motd-content :deep(h3) {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.motd-content :deep(h1) {
  font-size: 1.25rem;
}

.motd-content :deep(h2) {
  font-size: 1.15rem;
}

.motd-content :deep(h3) {
  font-size: 1.05rem;
}

.motd-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
}

.close-button {
  background: none;
  border: none;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-button:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.05);
}

.motd-disabled {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  color: #888;
  background-color: #f0f0f0;
  border-radius: 8px;
  border: 1px dashed #ccc;
}

.motd-disabled i {
  font-size: 2rem;
  margin-bottom: 1rem;
  opacity: 0.7;
}

.motd-disabled p {
  margin: 0;
}

/* Dark Mode Support */
:global(.theme-dark) .preview-header {
  background-color: #222;
  border-color: #444;
}

:global(.theme-dark) .preview-title {
  color: #e0e0e0;
}

:global(.theme-dark) .preview-toggle label {
  color: #bbb;
}

:global(.theme-dark) .preview-container {
  background-color: #333;
}

:global(.theme-dark) .preview-container.mobile-view {
  border-color: #111;
}

:global(.theme-dark) .motd-disabled {
  background-color: #222;
  border-color: #444;
  color: #aaa;
}

/* Kontrast-Modus Anpassungen */
:global(.theme-contrast) .preview-header {
  background-color: #000;
  border-color: #ffeb3b;
}

:global(.theme-contrast) .preview-title {
  color: #ffeb3b;
}

:global(.theme-contrast) .preview-container {
  background-color: #111;
}

:global(.theme-contrast) .motd-disabled {
  background-color: #000;
  border: 2px solid #ffeb3b;
  color: #ffeb3b;
}
</style>