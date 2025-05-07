# Änderungsprotokoll

Dieses Dokument protokolliert alle wichtigen Änderungen am nscale DMS Assistenten.

## [Unreleased]

### In Entwicklung
- Vorbereitung für React-Integration
- Erweitertes Rollenkonzept mit funktionalen Rollen
- Verbesserte RAG-Engine mit optimierter Vektorindexierung

## [0.5.0] - 2025-05-03

### Hinzugefügt
- Umfassende Dokumentation des Projekts
- Diagnose-Tools (Path-Logger, Path-Tester)
- DOM-Überwachung mit automatischer Korrektur
- CSS-Fallbacks für kritische Komponenten

### Geändert
- Rückkehr zu einer HTML/CSS-basierten Version für bessere Stabilität
- Aufgabe der Vue.js-Migration aufgrund zahlreicher Probleme
- Optimierter Dokumentenkonverter mit mehrschichtigen Fallbacks
- Verbesserte Fehlerbehandlung in allen Komponenten

### Behoben
- Endlosschleifen in der Initialisierungslogik
- 404-Fehler bei statischen Ressourcen
- CSS-Pfadprobleme mit multifunktionalen Fallbacks
- DOM-Manipulationsprobleme im Admin-Bereich
- Inkonsistente Anzeige zwischen verschiedenen Implementierungen

## [0.4.0] - 2025-04-25

### Hinzugefügt
- Performance-Optimierungen für schnellere Antwortzeiten
- Erweiterte Fehlerbehandlung und Protokollierung
- Verbesserte Robustheit durch mehrschichtige Fallbacks
- Versuchte Integration neuer Vue.js-Komponenten

### Geändert
- Optimierung der RAG-Engine für präzisere Antworten
- Verbesserte Benutzererfahrung im Admin-Bereich
- Optimiertes Caching für häufige Anfragen
- Beginn der Vue.js-Migration (später aufgegeben)

### Behoben
- Probleme mit der Sichtbarkeit von UI-Elementen
- Fehlende Ressourcen durch alternative Pfadstrategien
- Inkonsistenzen in der Benutzerauthentifizierung

## [0.3.1] - 2025-04-15

### Behoben
- Kritische Bugfixes für den Dokumentenkonverter
- Fehlerbehebung bei der PDF-Verarbeitung
- Erste Pfadprobleme mit Vue.js-Komponenten
- Initialisierungsprobleme in Vue.js-Komponenten

## [0.3.0] - 2025-04-10

### Hinzugefügt
- Dokumentenkonverter für verschiedene Dateiformate
- Unterstützung für PDF, DOCX, XLSX, PPTX, HTML, TXT
- Integration des Dokumentenkonverters in den Admin-Bereich
- Erste Vue.js-Komponenten für den Dokumentenkonverter (prototypisch)

### Geändert
- Verbesserte Benutzeroberfläche im Admin-Bereich
- Optimierte Dateiverarbeitung und -speicherung
- Erste Schritte zur Vue.js-Migration (später aufgegeben)

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

## Aufgabe der Vue.js-Migration

### Gründe für die Aufgabe

Die Vue.js-Migration wurde in Version 0.5.0 aus folgenden Gründen aufgegeben:

1. **Persistente 404-Fehler**:
   - Trotz verschiedenster Lösungsansätze blieben 404-Fehler für statische Ressourcen ein konstantes Problem
   - Inkonsistente Pfadstruktur führte zu chronischen Problemen beim Laden von Komponenten

2. **DOM-Manipulationskonflikte**:
   - Konflikte zwischen Vue.js-Rendering und direkter DOM-Manipulation
   - Endlosschleifen in Initialisierungsprozessen
   - Timing-Probleme zwischen Framework-gesteuertem und imperativem DOM-Zugriff

3. **Unvorhersehbares Rendering-Verhalten**:
   - Inkonsistentes Layout und Verhalten zwischen Implementierungen
   - Probleme mit der dynamischen Einbindung von Vue-Komponenten

4. **Komplexe Fallback-Mechanismen**:
   - Zunehmende Komplexität der Fallback-Logik
   - Mehrschichtige Fallbacks führten zu schwer wartbarem Code
   - Steigende technische Schulden durch Workarounds

### Konsequenzen

1. **Rückkehr zur HTML/CSS/JS-Implementierung**:
   - Wiederherstellung einer stabilen, bewährten Implementierung
   - Fokus auf Robustheit und Zuverlässigkeit

2. **Geplante React-Migration**:
   - Neuer Ansatz mit Fokus auf React statt Vue.js
   - Implementierung klarer Architekturprinzipien von Anfang an
   - Strikte Vermeidung der identifizierten Probleme

3. **Dokumentation der Lehren**:
   - Umfassende Dokumentation der Probleme und Lehren
   - Verwendung als Leitfaden für zukünftige Migrations- und Entwicklungsprojekte

---

## Versionierungsschema

Wir verwenden [Semantische Versionierung](https://semver.org/lang/de/) für dieses Projekt.

- **Major-Version**: Inkompatible API-Änderungen
- **Minor-Version**: Neue Funktionen bei Aufrechterhaltung der Abwärtskompatibilität
- **Patch-Version**: Fehlerbereinigungen bei Aufrechterhaltung der Abwärtskompatibilität

---

Zuletzt aktualisiert: 05.05.2025