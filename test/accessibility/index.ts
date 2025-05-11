// Export alle Barrierefreiheits-Tests und Hilfsfunktionen
export * from "./setup-axe";

// Import Tests für automatisierte Testläufe
import "./BaseComponentsA11y.spec";
import "./FormComponentsA11y.spec";
import "./NavigationComponentsA11y.spec";
import "./DataComponentsA11y.spec";
import "./FeedbackComponentsA11y.spec";

/**
 * Barrierefreiheitstests für nscale DMS Assistent
 *
 * Diese Tests stellen sicher, dass die UI-Komponenten des nscale DMS Assistenten
 * die WCAG 2.1 AA-Anforderungen erfüllen.
 *
 * Folgende Bereiche werden getestet:
 * - Basis-UI-Komponenten (Buttons, Inputs, etc.)
 * - Formular-Komponenten und zusammengesetzte Eingaben
 * - Navigations-Komponenten (TabPanel, Sidebar, etc.)
 * - Daten-Komponenten (Table, List, etc.)
 * - Feedback-Komponenten (Toast, Notification, etc.)
 *
 * Getestet werden:
 * - Korrekte semantische Struktur und HTML
 * - ARIA-Attribute und -Rollen
 * - Kontrastanforderungen
 * - Tastaturzugänglichkeit
 * - Screenreader-Unterstützung
 */
