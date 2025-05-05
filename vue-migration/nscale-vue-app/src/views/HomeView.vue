<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  // Automatisch zur Chat-Ansicht umleiten
  router.push({ name: 'chat' })
})
</script>

<template>
  <div class="home-container">
    <div class="loader"></div>
    <p class="redirect-text">Leite um zum Chat...</p>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}

.redirect-text {
  margin-top: 20px;
  color: #666;
}
</style>