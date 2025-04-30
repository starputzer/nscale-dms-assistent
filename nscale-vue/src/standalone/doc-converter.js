// src/standalone/doc-converter.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
// Verwende den @-Alias, der in der Vite-Konfiguration definiert ist
import DocConverterView from 'doc-converter-view'

// Styles importieren
//import '@/assets/styles/main.css'

// FontAwesome einbinden
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

// Icons hinzufügen
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