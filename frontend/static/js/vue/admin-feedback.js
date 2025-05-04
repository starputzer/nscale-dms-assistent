// src/standalone/admin-feedback.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
// Direkter Import ohne Alias - verwende den exakten Pfad
import FeedbackView from '../views/admin/FeedbackView.vue'

// Stelle sicher, dass Stores verfügbar sind
import { useFeedbackStore } from '../stores/feedbackStore'
import { useAuthStore } from '../stores/authStore'
import { useFeatureToggleStore } from '../stores/featureToggleStore'

// Weitere Komposables für die Anwendungsfunktionalität
import { useToast } from '../composables/useToast'

// Keine FontAwesome-Importe nötig - wir verwenden die bereits eingebundenen Icons aus dem Haupt-HTML

document.addEventListener('DOMContentLoaded', () => {
  console.log('Admin-Feedback Vue.js-Standalone-Modul wird initialisiert');
  
  // Finde den Einhängepunkt für die Feedback-Komponente
  const mountElement = document.getElementById('feedback-admin-app');
  
  if (mountElement) {
    console.log('Feedback-Tab-Container gefunden, initialisiere Vue.js-Komponente');
    
    // Erstellen und Konfigurieren der Vue.js-App
    const app = createApp(FeedbackView);
    
    // Pinia-Store hinzufügen
    const pinia = createPinia();
    app.use(pinia);
    
    // Mock für FontAwesome-Komponente, falls nötig
    app.component('FontAwesomeIcon', {
      props: ['icon'],
      template: '<i :class="icon"></i>'
    });
    
    // App in den DOM einhängen
    app.mount(mountElement);
    
    console.log('Vue.js Feedback-Komponente erfolgreich initialisiert');
  } else {
    console.warn('Kein Mounting-Element für Feedback-Komponente gefunden');
  }
});