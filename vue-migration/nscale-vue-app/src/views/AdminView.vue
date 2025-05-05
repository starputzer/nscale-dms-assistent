<template>
  <div class="admin-view">
    <h1>Administration</h1>
    <div class="admin-tabs">
      <div class="tab-navigation">
        <button @click="activeTab = 'users'" :class="{ active: activeTab === 'users' }">Benutzer</button>
        <button @click="activeTab = 'system'" :class="{ active: activeTab === 'system' }">System</button>
        <button @click="activeTab = 'feedback'" :class="{ active: activeTab === 'feedback' }">Feedback</button>
        <button @click="activeTab = 'motd'" :class="{ active: activeTab === 'motd' }">MOTD</button>
      </div>
      
      <div class="tab-content">
        <!-- Placeholder für die eigentlichen Tab-Inhalte -->
        <div v-if="activeTab === 'users'" class="tab-panel">
          <h2>Benutzerverwaltung</h2>
          <p>Hier werden Benutzer verwaltet.</p>
        </div>
        
        <div v-if="activeTab === 'system'" class="tab-panel">
          <h2>Systemeinstellungen</h2>
          <p>Hier werden Systemeinstellungen verwaltet.</p>
        </div>
        
        <div v-if="activeTab === 'feedback'" class="tab-panel">
          <h2>Feedback</h2>
          <p>Hier wird Feedback eingesehen.</p>
        </div>
        
        <div v-if="activeTab === 'motd'" class="tab-panel">
          <h2>Message of the Day</h2>
          <p>Hier wird die MOTD konfiguriert.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Aktiver Tab
const activeTab = ref('users')
</script>

<style scoped>
.admin-view {
  padding: 20px;
}

.admin-tabs {
  margin-top: 20px;
}

.tab-navigation {
  display: flex;
  border-bottom: 1px solid #ccc;
  margin-bottom: 20px;
}

.tab-navigation button {
  padding: 10px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
}

.tab-navigation button.active {
  border-bottom: 2px solid #3498db;
  font-weight: bold;
}

.tab-panel {
  padding: 10px 0;
}
</style>