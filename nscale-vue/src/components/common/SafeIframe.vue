// src/components/common/SafeIframe.vue
<template>
  <div class="safe-iframe-container">
    <iframe 
      ref="iframeRef" 
      class="safe-iframe" 
      :style="iframeStyle" 
      sandbox="allow-scripts"
    ></iframe>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import DOMPurify from 'dompurify';

// Props
const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  height: {
    type: [String, Number],
    default: '500px'
  },
  width: {
    type: [String, Number],
    default: '100%'
  }
});

// Refs
const iframeRef = ref(null);

// Computed styles
const iframeStyle = computed(() => {
  return {
    height: typeof props.height === 'number' ? `${props.height}px` : props.height,
    width: typeof props.width === 'number' ? `${props.width}px` : props.width
  };
});

// Update iframe content when content changes
watch(() => props.content, updateIframeContent, { immediate: true });

// Update iframe content
function updateIframeContent() {
  if (!iframeRef.value || !props.content) return;
  
  try {
    // Sanitize HTML content
    const sanitizedContent = DOMPurify.sanitize(props.content, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allowfullscreen', 'frameborder', 'src']
    });
    
    // Get iframe document
    const iframeDoc = iframeRef.value.contentDocument || 
                     (iframeRef.value.contentWindow && iframeRef.value.contentWindow.document);
    
    if (!iframeDoc) {
      console.error('Konnte nicht auf das iframe-Dokument zugreifen');
      return;
    }
    
    // Write content to iframe
    iframeDoc.open();
    iframeDoc.write(sanitizedContent);
    iframeDoc.close();
  } catch (error) {
    console.error('Fehler beim Aktualisieren des iframes:', error);
  }
}

// Initialize iframe
onMounted(() => {
  updateIframeContent();
});
</script>

<style scoped>
.safe-iframe-container {
  width: 100%;
  overflow: hidden;
}

.safe-iframe {
  border: 1px solid var(--nscale-gray-medium, #e0e0e0);
  border-radius: 4px;
  background-color: white;
}

/* Dark mode adjustments */
:global(.theme-dark) .safe-iframe {
  border-color: #555;
  background-color: #1e1e1e;
}

/* High contrast mode adjustments */
:global(.theme-contrast) .safe-iframe {
  border: 2px solid #ffeb3b;
  background-color: #000;
}
</style>