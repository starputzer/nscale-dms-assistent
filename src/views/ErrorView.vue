<template>
  <div class="error-view">
    <div class="error-container">
      <div class="error-icon">
        <ErrorIcon size="large" />
      </div>
      <h1 class="error-code">{{ formattedErrorCode }}</h1>
      <h2 class="error-title">{{ errorTitle }}</h2>
      <p class="error-message">{{ errorMessage }}</p>
      <div class="error-actions">
        <Button type="primary" @click="goBack">
          Zurück
        </Button>
        <Button @click="goHome">
          Zur Startseite
        </Button>
        <Button v-if="canRetry" @click="retry">
          Erneut versuchen
        </Button>
      </div>
      <div v-if="showDetails && errorDetails" class="error-details">
        <h3>Details</h3>
        <pre>{{ errorDetails }}</pre>
      </div>
      <div class="error-toggle-details">
        <a href="#" @click.prevent="toggleDetails">
          {{ showDetails ? 'Details ausblenden' : 'Details anzeigen' }}
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import ErrorIcon from '@/components/icons/ErrorIcon.vue';
import Button from '@/components/ui/base/Button.vue';
import { useErrorReporting } from '@/composables/useErrorReporting';

const props = defineProps({
  errorCode: {
    type: String,
    default: '500'
  },
  errorMessage: {
    type: String,
    default: 'Ein unbekannter Fehler ist aufgetreten.'
  },
  errorDetails: {
    type: String,
    default: ''
  },
  canRetry: {
    type: Boolean,
    default: false
  }
});

const router = useRouter();
const { reportError } = useErrorReporting();
const showDetails = ref(false);

const formattedErrorCode = computed(() => {
  return props.errorCode;
});

const errorTitle = computed(() => {
  const titles: Record<string, string> = {
    '400': 'Ungültige Anfrage',
    '401': 'Nicht autorisiert',
    '403': 'Zugriff verweigert',
    '404': 'Seite nicht gefunden',
    '500': 'Serverfehler',
    '503': 'Dienst nicht verfügbar',
    'offline': 'Keine Verbindung',
    'feature-disabled': 'Funktion deaktiviert',
    'timeout': 'Zeitüberschreitung',
    'unknown': 'Unbekannter Fehler'
  };
  return titles[props.errorCode] || 'Fehler';
});

const goBack = () => {
  router.back();
};

const goHome = () => {
  router.push({ name: 'Home' });
};

const retry = () => {
  if (router.currentRoute.value.query.from) {
    const fromPath = router.currentRoute.value.query.from as string;
    router.push(fromPath);
  } else {
    router.go(0); // Refresh the current page
  }
};

const toggleDetails = () => {
  showDetails.value = !showDetails.value;
};
</script>

<style scoped>
.error-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  text-align: center;
  background-color: var(--color-background);
}

.error-container {
  max-width: 600px;
  padding: 2rem;
  border-radius: 8px;
  background-color: var(--color-background-soft);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.error-icon {
  color: var(--color-danger);
  margin-bottom: 1.5rem;
}

.error-code {
  font-size: 3rem;
  font-weight: 700;
  margin: 0 0 1rem;
  color: var(--color-danger);
}

.error-title {
  font-size: 1.5rem;
  margin: 0 0 1rem;
  color: var(--color-text);
}

.error-message {
  font-size: 1rem;
  margin: 0 0 2rem;
  color: var(--color-text-light);
  line-height: 1.5;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.error-details {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: var(--color-background);
  border-radius: 4px;
  text-align: left;
  overflow-x: auto;
}

.error-details pre {
  font-family: monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-all;
}

.error-toggle-details {
  margin-top: 1rem;
  font-size: 0.85rem;
}

.error-toggle-details a {
  color: var(--color-primary);
  text-decoration: none;
}

.error-toggle-details a:hover {
  text-decoration: underline;
}

@media (max-width: 600px) {
  .error-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .error-code {
    font-size: 2.5rem;
  }
  
  .error-title {
    font-size: 1.25rem;
  }
}
</style>