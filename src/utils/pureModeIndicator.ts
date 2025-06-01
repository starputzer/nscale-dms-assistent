/**
 * Pure Mode Indicator
 *
 * Zeigt ein visuelles Indikator an, wenn die Anwendung im Pure Vue Mode läuft.
 * Dies hilft Entwicklern zu verstehen, ob sie im Mock-Modus oder mit echtem Backend arbeiten.
 */

/**
 * Erstellt und zeigt einen Indikator für den Pure Vue Mode an
 */
export function showPureModeIndicator() {
  // Deaktivieren des Pure Mode Indicators für den Live-Betrieb
  return;

  /* 
  // Ursprünglicher Code (deaktiviert)
  const isPureMode = new URLSearchParams(window.location.search).get('mockApi') === 'true';
  const useBridge = new URLSearchParams(window.location.search).get('useBridge') === 'true';
  
  if (!isPureMode && !useBridge) {
    // Wenn weder Pure Mode noch Bridge explizit aktiviert sind, nichts anzeigen
    return;
  }
  */

  // Container für den Indikator erstellen
  const container = document.createElement("div");
  container.id = "pure-mode-indicator";
  container.style.position = "fixed";
  container.style.bottom = "10px";
  container.style.right = "10px";
  container.style.padding = "3px 8px";
  container.style.borderRadius = "4px";
  container.style.fontSize = "12px";
  container.style.fontWeight = "bold";
  container.style.zIndex = "9999";
  container.style.opacity = "0.7";
  container.style.cursor = "pointer";
  container.style.transition = "opacity 0.3s ease";

  // Hover-Effekt
  container.addEventListener("mouseenter", () => {
    container.style.opacity = "1";
  });

  container.addEventListener("mouseleave", () => {
    container.style.opacity = "0.7";
  });

  // Text und Stil basierend auf dem Modus setzen
  if (isPureMode) {
    container.textContent = "PURE VUE MODE";
    container.style.backgroundColor = "#4CAF50";
    container.style.color = "white";
    container.title = "Läuft im Pure Vue Mode mit Mock-Services";
  } else if (useBridge) {
    container.textContent = "BRIDGE MODE";
    container.style.backgroundColor = "#2196F3";
    container.style.color = "white";
    container.title = "Läuft im Legacy-Bridge-Modus";
  }

  // Klick-Verhalten: Umschalten zwischen den Modi
  container.addEventListener("click", () => {
    const url = new URL(window.location.href);

    if (isPureMode) {
      // Von Pure Mode zu Bridge Mode wechseln
      url.searchParams.delete("mockApi");
      url.searchParams.set("useBridge", "true");
    } else if (useBridge) {
      // Von Bridge Mode zu normalem Modus wechseln
      url.searchParams.delete("useBridge");
      url.searchParams.delete("mockApi");
    } else {
      // Von normalem Modus zu Pure Mode wechseln
      url.searchParams.set("mockApi", "true");
      url.searchParams.delete("useBridge");
    }

    window.location.href = url.toString();
  });

  // Zum DOM hinzufügen
  document.body.appendChild(container);
}

export default showPureModeIndicator;
