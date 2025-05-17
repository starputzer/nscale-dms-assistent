/**
 * Source References Legacy Bridge
 * Diese Datei stellt die Kompatibilität mit dem Legacy-Code her.
 * Sie exportiert Funktionen des Source References-Moduls global,
 * damit der Legacy-Code sie nutzen kann.
 */

// Sicherheitsimport für Vue-Funktionalität
let isSourceReferencesComposable = false;

try {
  // Wir versuchen zu prüfen, ob die Vue 3 Composable bereits verfügbar ist
  isSourceReferencesComposable = typeof window.__sourceReferencesComposable !== 'undefined';
} catch (err) {
  console.error("Fehler beim Prüfen der Quellen-Referenzen-Verfügbarkeit:", err);
}

// Globale Funktionen für Legacy-Code-Kompatibilität

// Prüft, ob eine Nachricht Quellen hat
window.hasSourceReferences = function(content) {
  // Wenn das Composable verfügbar ist, nutzen wir es
  if (isSourceReferencesComposable && window.__sourceReferencesComposable) {
    return window.__sourceReferencesComposable.hasSourceReferences(content);
  }
  
  // Sonst Fallback-Implementierung
  if (!content) return false;
  
  return (
    /\(Quelle-\d+\)/.test(content) ||
    /Dokument \d+/.test(content) ||
    /Quelle(n)?:/.test(content) ||
    /Abschnitt/.test(content) ||
    /aus nscale/.test(content) ||
    content.includes("[[src:")
  );
}

// Prüft, ob Quellenreferenzen für eine Nachricht sichtbar sind
window.isSourceReferencesVisible = function(message) {
  // Wenn das Composable verfügbar ist, nutzen wir es
  if (isSourceReferencesComposable && window.__sourceReferencesComposable) {
    return window.__sourceReferencesComposable.isSourceReferencesVisible(message);
  }
  
  // Sonst Fallback-Implementierung
  return false; // Konservatives Fallback: keine Quellen anzeigen
}

// Schaltet die Anzeige von Quellenreferenzen um
window.toggleSourceReferences = function(message) {
  // Wenn das Composable verfügbar ist, nutzen wir es
  if (isSourceReferencesComposable && window.__sourceReferencesComposable) {
    return window.__sourceReferencesComposable.toggleSourceReferences(message);
  }
  
  // Sonst Fallback-Implementierung
  console.warn("Source references toggle not available in legacy mode");
  return Promise.resolve();
}

console.log("[Source References Bridge] Bridge-Funktionen für Quellenreferenzen wurden global registriert");

// Event-Listener für Vue-Initialisierung
document.addEventListener("vue-initialized", function() {
  console.log("[Source References Bridge] Vue wurde initialisiert, prüfe Quellenreferenz-Composable");
  
  try {
    // Aktualisieren wir unseren Status
    isSourceReferencesComposable = typeof window.__sourceReferencesComposable !== 'undefined';
    
    if (isSourceReferencesComposable) {
      console.log("[Source References Bridge] Quellenreferenz-Composable erfolgreich gefunden");
    } else {
      console.warn("[Source References Bridge] Quellenreferenz-Composable nicht gefunden");
    }
  } catch (err) {
    console.error("Fehler beim Prüfen der Quellen-Referenzen nach Vue-Initialisierung:", err);
  }
});