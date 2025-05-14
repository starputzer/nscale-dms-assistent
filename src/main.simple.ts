/**
 * nscale DMS Assistant - Vereinfachter Haupteinstiegspunkt
 * Minimale Version für die Migration
 */

import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.simple.vue'

// Styling importieren (falls vorhanden)
import './assets/styles/main.scss'

// Einfache Router-Konfiguration
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('./components/ChatView.vue'),
      alias: '/chat'
    },
    {
      path: '/admin',
      component: () => import('./components/NavigationBar.vue')
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// App-Instanz erstellen
const app = createApp(App)

// Router registrieren
app.use(router)

// Globale Fehlerbehandlung
app.config.errorHandler = (err, vm, info) => {
  console.error('Globaler Vue-Fehler:', err)
}

// Performance-Metriken
const perfEntries: any = []
if (window.performance && window.performance.getEntriesByType) {
  perfEntries.push(...window.performance.getEntriesByType('navigation'))
}

// App mounten
app.mount('#app')

// Ladezeit registrieren
const loadEndTime = performance.now()
console.log(`Vereinfachte App in ${Math.round(loadEndTime)}ms geladen`)

// Lade-Indikator entfernen
const appLoader = document.getElementById('app-loading')
if (appLoader) {
  appLoader.classList.add('app-loader-fade')
  setTimeout(() => {
    appLoader.style.display = 'none'
  }, 500)
}