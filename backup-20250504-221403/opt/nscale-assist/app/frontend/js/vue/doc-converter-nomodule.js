// Vereinfachte Version des Dokumentkonverters ohne Importabhängigkeiten

document.addEventListener("DOMContentLoaded", () => {
  // Liste möglicher Mount-Punkte
  const mountPointSelectors = [
    "doc-converter-app",
    "doc-converter-container",
    "docConverterContainer",
    '[data-vue-component="doc-converter"]'
  ];

  // Mount-Punkt suchen
  let mountElement = null;
  for (const selector of mountPointSelectors) {
    const element = selector.startsWith('[') 
      ? document.querySelector(selector) 
      : document.getElementById(selector);
    
    if (element) {
      mountElement = element;
      console.log(`Mount-Element für DocConverter gefunden: ${selector}`);
      break;
    }
  }

  // Wenn Mount-Punkt gefunden, einfache Fallback-UI anzeigen
  if (mountElement) {
    try {
      mountElement.innerHTML = `
        <div class="doc-converter classic-ui">
          <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">Dokumenten-Konverter (Fallback-UI)</h2>
          
          <div style="padding: 1rem; margin-bottom: 1.5rem; background-color: #f0f9ff; border-left: 4px solid #0ea5e9;">
            <p style="margin-bottom: 0.5rem;"><strong>Hinweis:</strong> Sie verwenden die vereinfachte Version des Dokumentenkonverters.</p>
            <p style="margin-bottom: 0;">Die Vue.js-Komponente konnte nicht geladen werden.</p>
          </div>
          
          <form action="/api/admin/upload/document" method="post" enctype="multipart/form-data" class="space-y-4">
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Datei auswählen</label>
              <input type="file" name="file" style="border: 1px solid #e5e7eb; padding: 0.5rem; width: 100%; border-radius: 0.25rem;" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.html,.txt">
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: flex; align-items: center;">
                <input type="checkbox" name="post_processing" checked style="margin-right: 0.5rem;">
                <span>Nachbearbeitung aktivieren (verbessert Struktur und Format)</span>
              </label>
            </div>
            
            <div>
              <button type="submit" style="background: #3b82f6; color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.25rem; cursor: pointer; font-weight: 500;">
                Dokument hochladen und konvertieren
              </button>
            </div>
          </form>
        </div>
      `;

      console.log("DocConverter Fallback-UI wurde erfolgreich initialisiert");
      
      // Globale Funktion bereitstellen
      window.initializeClassicDocConverter = function() {
        console.log("Klassische DocConverter-Implementierung wird bereits angezeigt");
        return true;
      };
      
      window.docConverterInitialized = true;

    } catch (error) {
      console.error("Fehler bei der Initialisierung der DocConverter Fallback-UI:", error);
    }
  } else {
    console.warn("Kein Mounting-Element für DocConverter gefunden, überprüfe diese Selektoren:", mountPointSelectors);
  }
});