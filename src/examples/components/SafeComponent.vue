<template>
  <div class="safe-component">
    <h3>Sichere Komponente</h3>
    <p>
      Diese Komponente enthält keine Fehler und sollte immer korrekt
      funktionieren.
    </p>
    <div class="content">
      <p>Status: <span class="status success">Fehlerfrei</span></p>
      <button @click="updateCounter">Zähler erhöhen: {{ counter }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

// Ein einfacher Zähler
const counter = ref(0);

function updateCounter() {
  counter.value++;
}
</script>

<style scoped>
.safe-component {
  padding: 15px;
  border-radius: var(--border-radius-md);
  background-color: var(--color-background-light);
}

h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: var(--color-text-primary);
}

.content {
  margin-top: 20px;
}

.status {
  font-weight: bold;
  padding: 3px 8px;
  border-radius: 4px;
}

.status.success {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

button {
  margin-top: 10px;
  padding: 8px 16px;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
}

button:hover {
  background-color: var(--color-primary-hover);
}
</style>
