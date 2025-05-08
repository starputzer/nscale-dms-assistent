<template>
  <div class="dialog-example">
    <h2>Dialog System Beispiele</h2>
    
    <div class="button-group">
      <h3>Bestätigungsdialoge</h3>
      <button @click="showConfirmDialog" class="example-btn">Bestätigungsdialog</button>
      <button @click="showInfoDialog" class="example-btn">Info-Dialog</button>
      <button @click="showWarningDialog" class="example-btn">Warnungs-Dialog</button>
      <button @click="showErrorDialog" class="example-btn">Fehler-Dialog</button>
      <button @click="showSuccessDialog" class="example-btn">Erfolgs-Dialog</button>
    </div>
    
    <div class="button-group">
      <h3>Eingabedialoge</h3>
      <button @click="showPromptDialog" class="example-btn">Text-Eingabe</button>
      <button @click="showPasswordDialog" class="example-btn">Passwort-Eingabe</button>
      <button @click="showValidatedInput" class="example-btn">Validierte Eingabe</button>
    </div>
    
    <div class="button-group">
      <h3>Native Ersetzungen</h3>
      <button @click="useWindowConfirm" class="example-btn">window.confirm()</button>
      <button @click="useWindowPrompt" class="example-btn">window.prompt()</button>
      <button @click="useWindowAlert" class="example-btn">window.alert()</button>
    </div>
    
    <div class="result-display" v-if="result !== null">
      <h3>Ergebnis:</h3>
      <pre>{{ result }}</pre>
    </div>
  </div>
  
  <!-- DialogProvider muss nur einmal in der Anwendung (z.B. in App.vue) eingebunden werden -->
  <DialogProvider />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useGlobalDialog } from '@/composables/useDialog';

// Dialog-Service verwenden
const dialog = useGlobalDialog();

// Zustand für die Anzeige von Ergebnissen
const result = ref<any>(null);

// Beispiele für Bestätigungsdialoge
const showConfirmDialog = async () => {
  const confirmed = await dialog.confirm({
    title: 'Unterhaltung löschen',
    message: 'Möchten Sie diese Unterhaltung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
    confirmButtonText: 'Löschen',
    cancelButtonText: 'Abbrechen'
  });
  
  result.value = { type: 'confirm', confirmed };
};

const showInfoDialog = async () => {
  const confirmed = await dialog.info({
    title: 'Information',
    message: 'Ihre Sitzung wird in 5 Minuten automatisch beendet. Bitte speichern Sie Ihre Arbeit.',
    confirmButtonText: 'Verstanden'
  });
  
  result.value = { type: 'info', confirmed };
};

const showWarningDialog = async () => {
  const confirmed = await dialog.warning({
    title: 'Warnung',
    message: 'Diese Aktion kann zu Datenverlust führen. Möchten Sie trotzdem fortfahren?'
  });
  
  result.value = { type: 'warning', confirmed };
};

const showErrorDialog = async () => {
  const confirmed = await dialog.error({
    title: 'Fehler',
    message: 'Die Verbindung zum Server konnte nicht hergestellt werden. Bitte versuchen Sie es später erneut.'
  });
  
  result.value = { type: 'error', confirmed };
};

const showSuccessDialog = async () => {
  const confirmed = await dialog.success({
    title: 'Erfolg',
    message: 'Ihre Änderungen wurden erfolgreich gespeichert.'
  });
  
  result.value = { type: 'success', confirmed };
};

// Beispiele für Eingabedialoge
const showPromptDialog = async () => {
  const name = await dialog.prompt({
    title: 'Name eingeben',
    message: 'Bitte geben Sie Ihren Namen ein:',
    inputLabel: 'Name',
    placeholder: 'Max Mustermann'
  });
  
  result.value = { type: 'prompt', value: name };
};

const showPasswordDialog = async () => {
  const password = await dialog.prompt({
    title: 'Passwort bestätigen',
    message: 'Bitte geben Sie Ihr Passwort ein, um fortzufahren:',
    inputLabel: 'Passwort',
    inputType: 'password',
    placeholder: 'Passwort eingeben'
  });
  
  // In einer echten Anwendung würde man das Passwort nicht anzeigen!
  result.value = { type: 'password', entered: password !== null };
};

const showValidatedInput = async () => {
  const email = await dialog.prompt({
    title: 'E-Mail eingeben',
    message: 'Bitte geben Sie Ihre E-Mail-Adresse ein:',
    inputLabel: 'E-Mail',
    inputType: 'email',
    placeholder: 'beispiel@domain.de',
    validator: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) || 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
    }
  });
  
  result.value = { type: 'validated-email', value: email };
};

// Beispiele für native Browser-Dialoge (jetzt ersetzt)
const useWindowConfirm = async () => {
  const confirmed = await window.confirm('Möchten Sie fortfahren? (Ersetzt window.confirm)');
  result.value = { type: 'window.confirm', confirmed };
};

const useWindowPrompt = async () => {
  const name = await window.prompt('Geben Sie Ihren Namen ein: (Ersetzt window.prompt)', 'Max Mustermann');
  result.value = { type: 'window.prompt', value: name };
};

const useWindowAlert = async () => {
  await window.alert('Dies ist eine Meldung! (Ersetzt window.alert)');
  result.value = { type: 'window.alert', shown: true };
};
</script>

<style scoped>
.dialog-example {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h2 {
  color: #0d7a40;
  border-bottom: 2px solid #0d7a40;
  padding-bottom: 10px;
  margin-bottom: 24px;
}

h3 {
  color: #333;
  margin-bottom: 16px;
}

.button-group {
  margin-bottom: 30px;
  padding: 20px;
  background-color: #f7f7f7;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.example-btn {
  background-color: #0d7a40;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 16px;
  margin: 0 8px 8px 0;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.example-btn:hover {
  background-color: #0a6032;
}

.result-display {
  margin-top: 20px;
  padding: 16px;
  background-color: #f0f0f0;
  border-radius: 4px;
  border-left: 4px solid #0d7a40;
}

.result-display h3 {
  margin-top: 0;
  color: #0d7a40;
}

pre {
  background-color: #fff;
  padding: 12px;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>