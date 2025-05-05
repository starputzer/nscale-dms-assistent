<script setup>
import { ref, computed, watchEffect } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps({
  content: {
    type: String,
    required: true
  },
  format: {
    type: String,
    default: 'markdown',
    validator: (value) => ['markdown', 'html', 'text'].includes(value)
  },
  allowHtml: {
    type: Boolean,
    default: false
  }
})

// Sicherer, gerenderter HTML-Inhalt
const renderedContent = computed(() => {
  if (!props.content) return ''
  
  let rendered = ''
  
  // Inhalt je nach Format rendern
  if (props.format === 'markdown') {
    rendered = marked.parse(props.content)
  } else if (props.format === 'html' && props.allowHtml) {
    rendered = props.content
  } else {
    // Einfacher Text: Zeilenumbrüche in <br>-Tags umwandeln
    rendered = props.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>')
  }
  
  // HTML bereinigen, um XSS zu verhindern
  return DOMPurify.sanitize(rendered, {
    ALLOWED_TAGS: [
      'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'bdi', 'bdo', 'blockquote', 
      'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup', 'data', 'datalist', 
      'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 
      'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'i', 'img', 'input', 
      'ins', 'kbd', 'label', 'legend', 'li', 'main', 'map', 'mark', 'menu', 'menuitem', 'meter', 
      'nav', 'ol', 'optgroup', 'option', 'output', 'p', 'picture', 'pre', 'progress', 'q', 'rp', 
      'rt', 'ruby', 's', 'samp', 'section', 'select', 'small', 'source', 'span', 'strong', 'sub', 
      'summary', 'sup', 'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 
      'track', 'u', 'ul', 'var', 'video', 'wbr'
    ],
    ALLOWED_ATTR: [
      'align', 'alt', 'aria-checked', 'aria-colcount', 'aria-colindex', 'aria-colspan', 
      'aria-controls', 'aria-current', 'aria-disabled', 'aria-expanded', 'aria-haspopup', 
      'aria-hidden', 'aria-label', 'aria-labelledby', 'aria-level', 'aria-orientation', 
      'aria-posinset', 'aria-pressed', 'aria-readonly', 'aria-required', 'aria-rowcount', 
      'aria-rowindex', 'aria-rowspan', 'aria-selected', 'aria-setsize', 'aria-sort', 'aria-valuenow', 
      'aria-valuemax', 'aria-valuemin', 'aria-valuetext', 'autocomplete', 'autofocus', 'border', 
      'cellpadding', 'cellspacing', 'charset', 'class', 'colspan', 'content', 'contenteditable', 
      'controls', 'coords', 'data', 'dir', 'disabled', 'download', 'draggable', 'enctype', 'for', 
      'frameborder', 'headers', 'height', 'hidden', 'high', 'href', 'hreflang', 'id', 'ismap', 
      'kind', 'label', 'lang', 'list', 'loop', 'low', 'max', 'maxlength', 'media', 'min', 
      'minlength', 'multiple', 'name', 'nonce', 'optimum', 'pattern', 'placeholder', 'poster', 
      'preload', 'readonly', 'rel', 'required', 'reversed', 'role', 'rowspan', 'rows', 'sandbox', 
      'scope', 'selected', 'shape', 'size', 'sizes', 'slot', 'span', 'spellcheck', 'src', 'srcdoc', 
      'srcset', 'start', 'step', 'style', 'summary', 'tabindex', 'target', 'title', 'translate', 
      'type', 'usemap', 'value', 'width', 'wrap'
    ]
  })
})
</script>

<template>
  <div class="content-renderer" v-html="renderedContent"></div>
</template>

<style scoped>
.content-renderer {
  /* Grundlegende Stile für gerenderte Inhalte */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6;
  color: #333;
}

.content-renderer :deep(h1) {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 1.5rem 0 1rem 0;
  color: #2d3748;
}

.content-renderer :deep(h2) {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 1.25rem 0 0.75rem 0;
  color: #2d3748;
}

.content-renderer :deep(h3) {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem 0;
  color: #2d3748;
}

.content-renderer :deep(h4) {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0.75rem 0 0.5rem 0;
  color: #2d3748;
}

.content-renderer :deep(p) {
  margin: 0.75rem 0;
}

.content-renderer :deep(a) {
  color: #3182ce;
  text-decoration: none;
}

.content-renderer :deep(a:hover) {
  text-decoration: underline;
}

.content-renderer :deep(ul), 
.content-renderer :deep(ol) {
  margin: 0.75rem 0;
  padding-left: 1.5rem;
}

.content-renderer :deep(li) {
  margin: 0.25rem 0;
}

.content-renderer :deep(code) {
  font-family: monospace;
  background-color: #f7fafc;
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.9em;
  color: #e53e3e;
}

.content-renderer :deep(pre) {
  background-color: #f7fafc;
  padding: 1rem;
  border-radius: 0.25rem;
  overflow-x: auto;
  margin: 1rem 0;
  border: 1px solid #e2e8f0;
}

.content-renderer :deep(pre code) {
  padding: 0;
  background-color: transparent;
  color: #4a5568;
}

.content-renderer :deep(blockquote) {
  margin: 1rem 0;
  padding: 0.5rem 1rem;
  border-left: 4px solid #a0aec0;
  background-color: #f7fafc;
  color: #4a5568;
}

.content-renderer :deep(img) {
  max-width: 100%;
  height: auto;
  margin: 1rem 0;
  border-radius: 0.25rem;
}

.content-renderer :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.content-renderer :deep(th), 
.content-renderer :deep(td) {
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  text-align: left;
}

.content-renderer :deep(th) {
  background-color: #f7fafc;
  font-weight: 600;
}

.content-renderer :deep(tr:nth-child(even)) {
  background-color: #f7fafc;
}
</style>