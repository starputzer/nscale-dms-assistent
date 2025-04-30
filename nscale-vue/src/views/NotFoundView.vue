<template>
  <div class="not-found-view">
    <h1>404 - Seite nicht gefunden</h1>
    <p>Die angeforderte Seite existiert nicht.</p>
    <router-link to="/" class="back-link">Zurück zur Startseite</router-link>
  </div>
</template>

<script setup>
// Minimal setup - wird später implementiert
</script>

<style scoped>
.not-found-view {
  padding: 4rem 2rem;
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}

.back-link {
  display: inline-block;
  margin-top: 2rem;
  padding: 0.75rem 1.5rem;
  background-color: var(--nscale-green, #00a550);
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.back-link:hover {
  background-color: var(--nscale-green-dark, #008542);
}
</style>
