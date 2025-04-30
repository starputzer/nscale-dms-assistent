<template>
  <div class="admin-sub-view">
    <h1>{{ viewTitle }}</h1>
    <p>Diese Funktion ist noch in Entwicklung.</p>
    
    <div class="placeholder-container">
      <div class="placeholder-message">
        <i :class="['fas', placeholderIcon]"></i>
        <p>{{ placeholderText }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

// View-spezifische Daten basierend auf dem Dateinamen
const viewConfig = computed(() => {
  const viewName = route.name || '';
  
  switch(viewName) {
    case 'AdminUsers':
      return {
        title: 'Benutzerverwaltung',
        icon: 'fa-users',
        text: 'Hier werden bald Benutzereinträge angezeigt.'
      };
    case 'AdminSystem':
      return {
        title: 'Systemüberwachung',
        icon: 'fa-chart-line',
        text: 'Hier werden bald Systemdaten angezeigt.'
      };
    case 'AdminFeedback':
      return {
        title: 'Feedback-Analyse',
        icon: 'fa-comments',
        text: 'Hier werden bald Feedback-Daten angezeigt.'
      };
    case 'AdminMotd':
      return {
        title: 'MOTD-Konfiguration',
        icon: 'fa-bullhorn',
        text: 'Hier wird bald die MOTD-Konfiguration angezeigt.'
      };
    default:
      return {
        title: 'Administration',
        icon: 'fa-cog',
        text: 'Dieser Bereich ist in Entwicklung.'
      };
  }
});

const viewTitle = computed(() => viewConfig.value.title);
const placeholderIcon = computed(() => viewConfig.value.icon);
const placeholderText = computed(() => viewConfig.value.text);
</script>

<style scoped>
.admin-sub-view {
  padding: 1.5rem;
}

.placeholder-container {
  margin-top: 2rem;
  padding: 3rem;
  background-color: var(--nscale-gray-light, #f8f9fa);
  border-radius: 8px;
  border: 1px dashed var(--nscale-gray-medium, #e0e3e8);
}

.placeholder-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--nscale-gray-dark, #4a5568);
}

.placeholder-message i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

/* Dark Mode Anpassungen */
:global(.theme-dark) .placeholder-container {
  background-color: #2a2a2a;
  border-color: #444;
}

:global(.theme-dark) .placeholder-message {
  color: #f0f0f0;
}

/* Kontrast-Modus Anpassungen */
:global(.theme-contrast) .placeholder-container {
  background-color: #000000;
  border: 2px solid #ffeb3b;
}

:global(.theme-contrast) .placeholder-message {
  color: #ffeb3b;
}

:global(.theme-contrast) .placeholder-message i {
  color: #ffeb3b;
}
</style>
