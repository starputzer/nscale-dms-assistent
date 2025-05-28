// Script um UI Store Probleme zu beheben

// Lösche problematische localStorage Einträge
const problematicKeys = [
  "ui",
  "ui_store",
  "pinia-ui",
  "nscale_ui",
  "ui:darkMode",
  "ui:sidebar",
  "ui:layoutConfig",
];

console.log("Bereinige localStorage...");

problematicKeys.forEach((key) => {
  if (localStorage.getItem(key) !== null) {
    console.log(`Entferne: ${key}`);
    localStorage.removeItem(key);
  }
});

// Lösche alle pinia-persist Einträge
Object.keys(localStorage).forEach((key) => {
  if (key.includes("pinia") || key.includes("persist")) {
    console.log(`Entferne: ${key}`);
    localStorage.removeItem(key);
  }
});

console.log("localStorage bereinigt. Bitte die Seite neu laden.");
