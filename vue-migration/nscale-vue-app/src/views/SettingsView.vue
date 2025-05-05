<template>
  <div class="settings-view">
    <h1>Einstellungen</h1>
    
    <div class="settings-section">
      <h2>Benutzereinstellungen</h2>
      
      <div class="setting-item">
        <label for="display-name">Anzeigename</label>
        <input type="text" id="display-name" v-model="displayName">
      </div>
      
      <div class="setting-item">
        <label for="email">E-Mail-Adresse</label>
        <input type="email" id="email" v-model="email" disabled>
      </div>
      
      <div class="setting-item">
        <button @click="changePassword" class="action-button">Passwort ändern</button>
      </div>
    </div>
    
    <div class="settings-section">
      <h2>Anzeigeeinstellungen</h2>
      
      <div class="setting-item">
        <label class="checkbox-label">
          <input type="checkbox" v-model="darkMode">
          Dunkles Design
        </label>
      </div>
      
      <div class="setting-item">
        <label class="checkbox-label">
          <input type="checkbox" v-model="simpleLanguage">
          Einfache Sprache verwenden
        </label>
      </div>
      
      <div class="setting-item">
        <label for="font-size">Schriftgröße</label>
        <select id="font-size" v-model="fontSize">
          <option value="small">Klein</option>
          <option value="medium">Mittel</option>
          <option value="large">Groß</option>
        </select>
      </div>
    </div>
    
    <div class="settings-section">
      <h2>Datenschutz</h2>
      
      <div class="setting-item">
        <button @click="deleteHistory" class="danger-button">Chatverlauf löschen</button>
      </div>
      
      <div class="setting-item">
        <label class="checkbox-label">
          <input type="checkbox" v-model="storeHistory">
          Chatverlauf speichern
        </label>
      </div>
    </div>
    
    <div class="form-actions">
      <button @click="saveSettings" class="primary-button">Speichern</button>
      <button @click="resetSettings" class="secondary-button">Zurücksetzen</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Beispieldaten für Einstellungen
const displayName = ref('Max Mustermann')
const email = ref('max.mustermann@example.com')
const darkMode = ref(false)
const simpleLanguage = ref(false)
const fontSize = ref('medium')
const storeHistory = ref(true)

// Funktionen
const changePassword = () => {
  // Passwort-Änderungsprozess starten
  console.log('Passwort ändern')
}

const deleteHistory = () => {
  if (confirm('Möchten Sie wirklich Ihren gesamten Chatverlauf löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
    // Chatverlauf löschen
    console.log('Chatverlauf löschen')
  }
}

const saveSettings = () => {
  // Einstellungen speichern
  console.log('Einstellungen speichern', {
    displayName: displayName.value,
    darkMode: darkMode.value,
    simpleLanguage: simpleLanguage.value,
    fontSize: fontSize.value,
    storeHistory: storeHistory.value
  })
}

const resetSettings = () => {
  // Einstellungen zurücksetzen
  displayName.value = 'Max Mustermann'
  darkMode.value = false
  simpleLanguage.value = false
  fontSize.value = 'medium'
  storeHistory.value = true
}
</script>

<style scoped>
.settings-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.settings-section {
  margin-bottom: 30px;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.setting-item {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.checkbox-label {
  display: flex;
  align-items: center;
  font-weight: normal;
}

.checkbox-label input {
  margin-right: 10px;
}

input[type="text"],
input[type="email"],
select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.primary-button {
  background-color: #3498db;
  color: white;
}

.secondary-button {
  background-color: #f0f0f0;
  color: #333;
}

.action-button {
  background-color: #2ecc71;
  color: white;
}

.danger-button {
  background-color: #e74c3c;
  color: white;
}
</style>