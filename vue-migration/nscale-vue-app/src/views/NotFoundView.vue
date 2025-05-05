<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.back()
}

const goHome = () => {
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <h1 class="not-found-code">404</h1>
      <h2 class="not-found-title">Seite nicht gefunden</h2>
      <p class="not-found-message">Die angeforderte Seite existiert nicht oder ist nicht verfügbar.</p>
      <div class="not-found-actions">
        <button @click="goBack" class="nscale-btn-secondary">
          <i class="fas fa-arrow-left mr-2"></i>
          Zurück
        </button>
        <button @click="goHome" class="nscale-btn-primary">
          <i class="fas fa-home mr-2"></i>
          Zur Startseite
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 20px;
  background-color: #f5f7fa;
}

.not-found-content {
  text-align: center;
  max-width: 500px;
}

.not-found-code {
  font-size: 8rem;
  font-weight: 700;
  line-height: 1;
  color: #38a169;
  margin-bottom: 24px;
}

.not-found-title {
  font-size: 2rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 16px;
}

.not-found-message {
  color: #718096;
  font-size: 1rem;
  margin-bottom: 32px;
}

.not-found-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.mr-2 {
  margin-right: 8px;
}
</style>