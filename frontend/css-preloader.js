/**
 * CSS-Preloader für nscale DMS Assistent
 *
 * Dieses Skript stellt sicher, dass alle erforderlichen CSS-Dateien korrekt geladen werden.
 * Bei Problemen versucht es einen Reload mit Cache-Busting.
 */

(function () {
  console.log("CSS-Preloader wird initialisiert...");

  // Liste aller erforderlichen CSS-Dateien
  const requiredCssFiles = [
    "/css/main.css",
    "/css/themes.css",
    "/css/improved-ui.css",
    "/css/admin.css",
    "/css/feedback.css",
    "/css/message-actions.css",
    "/css/settings.css",
    "/css/source-references.css",
    "/frontend/css/admin-panel.css",
  ];

  // CSS-Stylesheets prüfen und bei Bedarf neu laden
  function validateAndFixStylesheets() {
    console.log("Überprüfe StyleSheets...");

    // Alle geladenen Stylesheets durchgehen
    const loadedStylesheets = Array.from(document.styleSheets)
      .filter((sheet) => sheet.href)
      .map((sheet) => {
        try {
          return new URL(sheet.href).pathname;
        } catch (e) {
          return null;
        }
      })
      .filter((path) => path !== null);

    console.log("Geladene Stylesheets:", loadedStylesheets);

    // Fehlende Stylesheets finden und nachladen
    requiredCssFiles.forEach((cssFile) => {
      if (!loadedStylesheets.includes(cssFile)) {
        console.warn(
          `Stylesheet '${cssFile}' fehlt oder wurde nicht korrekt geladen. Lade neu...`,
        );

        // Fallback-Variante mit Cache-Busting
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `${cssFile}?reload=true&v=${Date.now()}`;
        document.head.appendChild(link);
      }
    });

    // CSS-Variablen sicherstellen
    ensureCssVariables();
  }

  // Überprüfe und stelle CSS-Variablen sicher
  function ensureCssVariables() {
    // Überprüfe, ob die CSS-Variablen korrekt geladen wurden
    const testElement = document.createElement("div");
    testElement.style.position = "absolute";
    testElement.style.opacity = "0";
    document.body.appendChild(testElement);

    // Überprüfe eine kritische CSS-Variable
    const computedStyle = getComputedStyle(testElement);
    const nscaleGreen = computedStyle.getPropertyValue("--nscale-green").trim();

    // Falls die Variable nicht gesetzt ist, füge Inline-Fallback hinzu
    if (!nscaleGreen) {
      console.warn(
        "CSS-Variablen nicht korrekt geladen. Füge Inline-Fallback hinzu.",
      );

      const styleElement = document.createElement("style");
      styleElement.textContent = `
        :root {
          --nscale-green: #00a550;
          --nscale-green-dark: #009046;
          --nscale-light-green: #e8f7ef;
          --nscale-gray: #f7f7f7;
          --nscale-dark-gray: #333333;
          
          /* nscale-Farbvariablen */
          --n-color-primary: var(--nscale-green);
          --n-color-primary-dark: var(--nscale-green-dark);
          --n-color-primary-rgb: 0, 165, 80;
          --n-color-on-primary: #ffffff;
        }
      `;
      document.head.appendChild(styleElement);
    }

    document.body.removeChild(testElement);
  }

  // Nach DOMContentLoaded CSS-Dateien überprüfen
  window.addEventListener("DOMContentLoaded", function () {
    validateAndFixStylesheets();
  });

  // Sicherheitshalber nach vollständigem Laden der Seite nochmal prüfen
  window.addEventListener("load", function () {
    setTimeout(validateAndFixStylesheets, 500);
  });
})();
