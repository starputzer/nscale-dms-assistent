# Barrierefreiheitstests (WCAG 2.1 AA)

## Übersicht

Diese Tests sind entwickelt, um sicherzustellen, dass alle UI-Komponenten des nScale DMS Assistenten die WCAG 2.1 AA-Richtlinien erfüllen. Die Tests verwenden axe-core, eine Bibliothek für automatisierte Barrierefreiheitsprüfungen.

## Teststruktur

Die Tests sind in folgende Kategorien unterteilt:

1. **BaseComponentsA11y.spec.ts**: Tests für Basis-UI-Komponenten wie Button, Input, Select, etc.
2. **FormComponentsA11y.spec.ts**: Tests für komplexere Formular-Komponenten
3. **NavigationComponentsA11y.spec.ts**: Tests für Navigations- und Layout-Komponenten
4. **DataComponentsA11y.spec.ts**: Tests für Datenkomponenten wie Table, List, etc.
5. **FeedbackComponentsA11y.spec.ts**: Tests für Feedback-Komponenten wie Toast, Alert, etc.

## Voraussetzungen

Diese Tests benötigen:

1. axe-core: `npm install --save-dev axe-core`
2. Vitest mit JSDOM-Umgebung

## Manuelle Ausführung

Da die Integration von axe-core in die automatisierte Testumgebung komplex sein kann, können die Tests auch manuell mit dem axe-DevTools-Browser-Plugin durchgeführt werden:

1. Installiere das [axe DevTools-Plugin](https://www.deque.com/axe/devtools/) für Chrome oder Firefox
2. Starte die Anwendung: `npm run dev`
3. Navigiere zu den zu testenden Komponenten
4. Öffne die DevTools und klicke auf den "axe"-Tab
5. Analysiere die Seite mit dem Plugin

## WCAG 2.1 AA Konformitätsleitlinien

Die Tests prüfen die folgenden Aspekte:

### 1. Wahrnehmbarkeit
- Textäquivalente für Nicht-Text-Inhalte
- Kontrast (Verhältnis von mindestens 4,5:1)
- Unterscheidbarkeit von Elementen
- Responsives Design

### 2. Bedienbarkeit
- Vollständige Tastaturzugänglichkeit
- Keine Zeitbegrenzungen für Interaktionen
- Navigationshilfen
- Vermeidung von Inhalten, die Anfälle auslösen können

### 3. Verständlichkeit
- Lesbare und verständliche Texte
- Konsistentes Verhalten der UI
- Fehleridentifikation und -vorschläge

### 4. Robustheit
- Kompatibilität mit assistiven Technologien
- Korrekte HTML-Struktur und ARIA-Attribute

## Testen neuer Komponenten

Bei der Entwicklung neuer Komponenten sollte die Barrierefreiheit von Anfang an berücksichtigt werden:

1. Verwende semantisches HTML
2. Stelle sicher, dass alle interaktiven Elemente mit der Tastatur bedienbar sind
3. Füge ARIA-Attribute hinzu, wo nötig
4. Teste die Komponente mit Screenreadern
5. Überprüfe den Farbkontrast
6. Füge Tests in der entsprechenden Kategorie-Datei hinzu

## Ressourcen

- [WCAG 2.1-Richtlinien](https://www.w3.org/TR/WCAG21/)
- [axe-core Dokumentation](https://github.com/dequelabs/axe-core)
- [Vue Accessibility Guide](https://v3.vuejs.org/guide/a11y-basics.html)