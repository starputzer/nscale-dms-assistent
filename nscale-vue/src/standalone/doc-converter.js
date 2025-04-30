// src/standalone/doc-converter.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
// KORRIGIERTER PFAD: Der korrekte Pfad ohne das "src/" im Import-Statement
import DocConverterView from '../views/DocConverterView.vue'

// Stelle sicher, dass benötigte Styles geladen werden
import '../assets/styles/main.css' // Passe den Pfad an deine Struktur an

// FontAwesome Icons einbinden - für die Icons in den Buttons
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { 
  faArrowLeft,
  faCloudUploadAlt, 
  faFile, 
  faFileAlt, 
  faFilePdf, 
  faFileWord, 
  faFileExcel, 
  faFilePowerpoint, 
  faFileCode, 
  faTrash, 
  faTimes, 
  faSync, 
  faCheckCircle, 
  faExclamationTriangle, 
  faTimesCircle, 
  faCog 
} from '@fortawesome/free-solid-svg-icons'

// Icons zur Library hinzufügen
library.add(
  faArrowLeft,
  faCloudUploadAlt, 
  faFile, 
  faFileAlt, 
  faFilePdf, 
  faFileWord, 
  faFileExcel, 
  faFilePowerpoint, 
  faFileCode, 
  faTrash, 
  faTimes, 
  faSync, 
  faCheckCircle, 
  faExclamationTriangle, 
  faTimesCircle, 
  faCog
)

document.addEventListener('DOMContentLoaded', () => {
  const mountElement = document.getElementById('doc-converter-app')
  if (mountElement) {
    const app = createApp(DocConverterView)
    
    // Pinia Store registrieren
    app.use(createPinia())
    
    // FontAwesome global registrieren
    app.component('FontAwesomeIcon', FontAwesomeIcon)
    
    // App mounten
    app.mount('#doc-converter-app')
    
    console.log('DocConverter wurde erfolgreich initialisiert')
  } else {
    console.warn('Kein Mounting-Element für DocConverter gefunden (#doc-converter-app)')
  }
})