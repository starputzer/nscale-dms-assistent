<template>
  <div class="document-converter-wrapper">
    <!-- Feature Toggle für den gesamten Dokumentenkonverter -->
    <FeatureWrapper 
      feature-name="document-converter"
      :required="true"
      v-slot="{ enabled, featureStatus }"
    >
      <!-- Zeige Komponente nur an, wenn Feature aktiviert ist -->
      <div v-if="enabled" class="document-converter-container">
        <!-- DocumentConverterIntegration mit Feature Toggles für Unterkomponenten -->
        <DocumentConverterIntegration />
      </div>
      
      <!-- Fallback-Komponente, wenn Feature deaktiviert ist -->
      <div v-else class="document-converter-fallback">
        <FallbackConverter 
          :status="featureStatus" 
          :messages="fallbackMessages"
          :can-request-access="featureStatus !== 'disabled'"
          @request-access="requestFeatureAccess"
        />
      </div>
    </FeatureWrapper>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import FeatureWrapper from '@/components/shared/FeatureWrapper.vue';
import DocumentConverterIntegration from './DocumentConverterIntegration.vue';
import FallbackConverter from './FallbackConverter.vue';
import { useFeatureToggles } from '@/composables/useFeatureToggles';
import { useDialog } from '@/composables/useDialog';
import { useToast } from '@/composables/useToast';

// Services und Zustandsvariablen
const featureToggles = useFeatureToggles();
const dialog = useDialog();
const toast = useToast();

// Nachrichten für verschiedene Fallback-Szenarien
const fallbackMessages = ref({
  disabled: 'Der Dokumentenkonverter ist derzeit deaktiviert. Bitte prüfen Sie die Systemkonfiguration oder kontaktieren Sie den Administrator.',
  unauthorized: 'Sie haben keinen Zugriff auf den Dokumentenkonverter. Sie können eine Zugriffsanfrage stellen.',
  maintenance: 'Der Dokumentenkonverter befindet sich derzeit in Wartung. Versuchen Sie es später erneut.',
  comingSoon: 'Der Dokumentenkonverter wird in Kürze verfügbar sein. Bleiben Sie dran!',
  beta: 'Der Dokumentenkonverter befindet sich in der Beta-Phase. Einige Funktionen könnten noch nicht vollständig funktionieren.'
});

/**
 * Sendet eine Anfrage zur Freischaltung des Features
 */
async function requestFeatureAccess() {
  const confirmed = await dialog.confirm({
    title: 'Zugriff anfordern',
    message: 'Möchten Sie Zugriff auf den Dokumentenkonverter beantragen? Ein Administrator wird Ihre Anfrage prüfen.',
    confirmButtonText: 'Zugriff anfordern',
    cancelButtonText: 'Abbrechen',
    type: 'info'
  });
  
  if (confirmed) {
    try {
      // Hier würde eine API-Anfrage zur Zugriffsanforderung erfolgen
      await featureToggles.requestFeatureAccess('document-converter');
      toast.success('Ihre Anfrage wurde erfolgreich gesendet. Sie werden benachrichtigt, sobald Ihr Zugriff gewährt wurde.');
    } catch (error) {
      toast.error('Fehler beim Senden der Anfrage. Bitte versuchen Sie es später erneut.');
    }
  }
}

// Füge eine Möglichkeit hinzu, den Feature-Status zu überwachen
// Mit einem echten Feature-Toggle-System könnten realtime Updates empfangen werden
const checkFeatureInterval = setInterval(() => {
  featureToggles.checkFeatureStatus('document-converter');
}, 60000); // Überprüfe einmal pro Minute

// Aufräumen beim Unmounten der Komponente
onBeforeUnmount(() => {
  clearInterval(checkFeatureInterval);
});

// Importiere fehlende Vue-API
import { onBeforeUnmount } from 'vue';
</script>

<style scoped>
.document-converter-wrapper {
  width: 100%;
  height: 100%;
  min-height: 400px;
  position: relative;
}

.document-converter-container {
  width: 100%;
  height: 100%;
}

.document-converter-fallback {
  width: 100%;
  height: 100%;
  min-height: 300px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>