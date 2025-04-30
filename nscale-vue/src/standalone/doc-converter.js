// nscale-vue/standalone/doc-converter.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import DocConverterView from '../src/views/DocConverterView.vue'

// Stelle sicher, dass benötigte Styles geladen werden
import '../src/assets/styles/main.css' // Passe den Pfad an deine Struktur an

document.addEventListener('DOMContentLoaded', () => {
  const mountElement = document.getElementById('doc-converter-app')
  if (mountElement) {
    const app = createApp(DocConverterView)
    app.use(createPinia())
    app.mount('#doc-converter-app')
    
    console.log('DocConverter wurde erfolgreich initialisiert')
  } else {
    console.warn('Kein Mounting-Element für DocConverter gefunden (#doc-converter-app)')
  }
})