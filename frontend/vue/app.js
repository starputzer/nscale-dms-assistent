/**
 * Vue-App-Entry-Point für einfache Implementation
 * Verwendung von globalem Vue-Objekt für bessere Kompatibilität mit ESM-Import
 */

// Versuche zuerst, die korrekte App zu importieren
let App;
try {
  // Versuche, die Hauptapp zu importieren
  App = require("../../src/App.vue").default;
} catch (e) {
  console.warn("Konnte Hauptapp nicht laden, verwende Fallback-App", e);
  // Fallback-Komponente
  App = {
    template: `
      <div class="p-8 max-w-4xl mx-auto bg-white shadow-lg rounded-lg">
        <h1 class="text-2xl font-bold mb-4 text-indigo-700">nscale DMS Assistent (Fallback)</h1>
        <p class="mb-4">Dies ist eine Fallback-Ansicht für den nscale DMS Assistenten.</p>
        <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p class="text-yellow-800 font-medium">Hinweis</p>
          <p class="text-yellow-700">Die Hauptanwendung konnte nicht geladen werden. Bitte stellen Sie sicher, dass alle erforderlichen Dateien vorhanden sind.</p>
        </div>
      </div>
    `,
  };
}

// Export der App-Komponente
export default App;
