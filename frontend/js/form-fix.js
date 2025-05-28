/**
 * Formular-Fix für Chat
 * Verhindert unerwünschtes Neuladen durch reguläre Formulareinreichung
 */

document.addEventListener("DOMContentLoaded", () => {
  console.log("Form-Fix wird angewendet...");

  // Bei Pageload nach Chat-Formular suchen
  const applyFormFix = () => {
    const chatForms = document.querySelectorAll("form");

    chatForms.forEach((form) => {
      if (!form._preventDefaultApplied) {
        // Neue Event-Listener hinzufügen
        form.addEventListener(
          "submit",
          (event) => {
            // Standardverhalten verhindern (Seiten-Reload)
            event.preventDefault();
            console.log("Formular-Einreichung verhindert durch Form-Fix");

            // Wenn Vue-Methode vorhanden, diese manuell aufrufen
            const vueApp = window.__vueApp;
            if (vueApp) {
              if (typeof vueApp.sendQuestionStream === "function") {
                console.log("Rufe Vue-Methode sendQuestionStream auf");
                vueApp.sendQuestionStream();
              } else if (typeof vueApp.sendQuestion === "function") {
                console.log("Rufe Vue-Methode sendQuestion auf");
                vueApp.sendQuestion();
              }
            }

            return false;
          },
          true,
        ); // Capture Phase, wird vor Bubbling ausgeführt

        // Markieren als bearbeitet
        form._preventDefaultApplied = true;
        console.log("Form-Fix angewendet auf:", form);
      }
    });
  };

  // Initial anwenden
  setTimeout(applyFormFix, 1000);

  // Regelmäßig aktualisieren, falls Formulare dynamisch geladen werden
  setInterval(applyFormFix, 3000);
});
