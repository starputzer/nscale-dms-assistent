# Änderungsprotokoll

Dieses Dokument protokolliert alle wichtigen Änderungen am nscale DMS Assistenten.

## [Unreleased]

### In Entwicklung
- React-Integration als alternative UI-Implementierung
- Erweitertes Rollenkonzept mit funktionalen Rollen
- Verbesserte RAG-Engine mit optimierter Vektorindexierung

## [0.5.0] - 2025-05-03

### Hinzugefügt
- Umfassende Dokumentation des Projekts
- Diagnose-Tools (Path-Logger, Path-Tester)
- DOM-Überwachung mit automatischer Korrektur
- CSS-Fallbacks für kritische Komponenten

### Geändert
- Zurück zu einer HTML/CSS-basierten Version für bessere Stabilität
- Optimierter Dokumentenkonverter mit mehrschichtigen Fallbacks
- Verbesserte Fehlerbehandlung in allen Komponenten

### Behoben
- Endlosschleifen in der Initialisierungslogik
- CSS-Pfadprobleme mit multifunktionalen Fallbacks
- DOM-Manipulationsprobleme im Admin-Bereich

## [0.4.0] - 2025-04-25

### Hinzugefügt
- Performance-Optimierungen für schnellere Antwortzeiten
- Erweiterte Fehlerbehandlung und Protokollierung
- Verbesserte Robustheit durch mehrschichtige Fallbacks

### Geändert
- Optimierung der RAG-Engine für präzisere Antworten
- Verbesserte Benutzererfahrung im Admin-Bereich
- Optimiertes Caching für häufige Anfragen

### Behoben
- Probleme mit der Sichtbarkeit von UI-Elementen
- Fehlende Ressourcen durch alternative Pfadstrategien
- Inkonsistenzen in der Benutzerauthentifizierung

## [0.3.1] - 2025-04-15

### Behoben
- Kritische Bugfixes für den Dokumentenkonverter
- Fehlerbehebung bei der PDF-Verarbeitung
- Korrektur von Pfadproblemen in der Vue.js-Integration

## [0.3.0] - 2025-04-10

### Hinzugefügt
- Dokumentenkonverter für verschiedene Dateiformate
- Unterstützung für PDF, DOCX, XLSX, PPTX, HTML, TXT
- Integration des Dokumentenkonverters in den Admin-Bereich
- Erste Vue.js-Komponenten für den Dokumentenkonverter

### Geändert
- Verbesserte Benutzeroberfläche im Admin-Bereich
- Optimierte Dateiverarbeitung und -speicherung
- Beginn der schrittweisen Migration zu Vue.js

### Behoben
- Verschiedene UI-Probleme im Admin-Bereich
- Fehler bei der Anzeige langer Chat-Verläufe
- Probleme mit der Sitzungsverwaltung

## [0.2.0] - 2025-03-20

### Hinzugefügt
- Admin-Funktionen für Systemüberwachung
- Benutzerverwaltung mit Basisrollen
- MOTD-Manager (Message of the Day)
- Feedback-System für Benutzerrückmeldungen
- Einfache Systemstatistiken und Protokollierung

### Geändert
- Verbesserte Benutzerauthentifizierung
- Optimiertes Chat-Interface für bessere Benutzerfreundlichkeit
- Erweiterte Einstellungsmöglichkeiten

### Behoben
- Probleme mit der Sitzungspersistenz
- Fehler bei der Anzeige von Markdown-Inhalten
- Inkonsistenzen in der Benutzeroberfläche

## [0.1.0] - 2025-02-28

### Hinzugefügt
- Erste Basisversion mit Chat-Funktionalität
- Grundlegende RAG-Engine (Retrieval-Augmented Generation)
- Integration mit dem nscale DMS
- Einfache HTML/CSS/JS-basierte Benutzeroberfläche
- Authentifizierung und grundlegende Benutzerverwaltung
- Speicherung von Chat-Verläufen
- Einfache Einstellungen für Benutzer

---

## Versionierungsschema

Wir verwenden [Semantische Versionierung](https://semver.org/lang/de/) für dieses Projekt.

- **Major-Version**: Inkompatible API-Änderungen
- **Minor-Version**: Neue Funktionen bei Aufrechterhaltung der Abwärtskompatibilität
- **Patch-Version**: Fehlerbereinigungen bei Aufrechterhaltung der Abwärtskompatibilität

---

Zuletzt aktualisiert: 05.05.2025