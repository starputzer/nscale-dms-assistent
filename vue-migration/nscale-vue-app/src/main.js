import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import axios from 'axios'

// CSS
import './style.css'

// Pinia-Store erstellen
const pinia = createPinia()

// App erstellen
const app = createApp(App)

// Axios konfigurieren
axios.defaults.baseURL = window.location.origin
// Token aus lokalem Storage hinzufügen, falls vorhanden
const token = localStorage.getItem('token')
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

// Globale Fehlerbehandlung
app.config.errorHandler = (err, vm, info) => {
  console.error(`Error: ${err.toString()}\nInfo: ${info}`)
  // Optional: Fehler-Tracking-Service integrieren
}

// Plugins registrieren
app.use(pinia)
app.use(router)

// App mounten
app.mount('#app')
