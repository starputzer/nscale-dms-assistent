# nscale Assist App - Projektübersicht

## Systemarchitektur

Die nscale Assist App besteht aus folgenden Hauptkomponenten:

1. **Frontend**
   - HTML/CSS/JS-basierte UI mit progressiver Migration zu React
   - Vorherige Vue.js-Migrationsstrategie wurde aufgegeben
   - Feature-Toggle-System zur kontrollierten Aktivierung neuer Komponenten

2. **Backend**
   - Python-basierte API (Flask)
   - Modulare Struktur mit spezialisierten Subsystemen
   - RESTful-Endpunkte für Frontend-Kommunikation

3. **Module**
   - Dokumentenkonverter: Konvertiert verschiedene Dokumentformate zu durchsuchbarem Text
   - Authentifizierungssystem: Benutzer- und Rollenverwaltung
   - RAG-Engine: Retrieval-Augmented Generation für intelligente Antworten
   - MOTD-Manager: "Message of the Day" Verwaltung

## Entwicklungsstatus

Die Anwendung befindet sich nach der Aufgabe der Vue.js-Migration in einer Neuausrichtung mit Fokus auf React.js.

| Komponente | Status | Hinweise |
|------------|--------|----------|
| Dokumentenkonverter | Stabil | Robuste HTML/CSS/JS-Implementierung mit Fallback-Mechanismen |
| Admin-Bereich | Funktional | Aktuelle HTML/CSS/JS-Implementierung |
| Einstellungen | Funktional | Aktuelle HTML/CSS/JS-Implementierung |
| Chat-Interface | Funktional | Aktuelle HTML/CSS/JS-Implementierung |
| React-Integration | Geplant | Schrittweise Migration beginnend mit dem Dokumentenkonverter |

## Aufgabe der Vue.js-Migration

Der Versuch, das Frontend zu Vue.js zu migrieren, wurde aufgrund zahlreicher Probleme aufgegeben:

- **Pfadprobleme**: Komplexe Pfadstrukturen führten zu chronischen 404-Fehlern
- **DOM-Manipulationsprobleme**: Konflikte zwischen Vue.js und direkter DOM-Manipulation
- **Endlosschleifen**: Rekursive Initialisierungsversuche in Komponenten
- **Inkonsistente Anzeige**: Unterschiede im Layout und Verhalten zwischen Implementierungen
- **Komplexe Fallback-Mechanismen**: Notwendigkeit umfangreicher Fallback-Logik erhöhte die Komplexität
- **Steigende technische Schulden**: Zunehmende Anzahl an Workarounds und komplexen Lösungen

## Feature-Toggle-System

Das Feature-Toggle-System wird für die React-Migration angepasst:

- `useReactUI`: Globaler Schalter für die neue React-Implementierung
- `feature_reactDocConverter`: Spezifisch für den React-basierten Dokumentenkonverter
- `feature_reactAdmin`: Spezifisch für React-basierte Admin-Komponenten

Die Toggles werden im localStorage des Browsers gespeichert und können über die Admin-Oberfläche oder die Konsole konfiguriert werden.

## Bekannte Herausforderungen

1. **Framework-Co-Existenz**: Saubere Integration von React-Komponenten in die bestehende Anwendung
2. **Zustandsverwaltung**: Implementierung einer klar getrennten Zustandsverwaltung
3. **Build-System**: Optimierung des Build-Prozesses für React-Komponenten
4. **Styling-Konsistenz**: Sicherstellung eines konsistenten Erscheinungsbilds zwischen Implementierungen

## Robustheit und Fehlerbehandlung

Die aktuelle Implementierung basiert auf bewährten HTML/CSS/JS-Techniken mit robusten Fehlerbehandlungen:

1. **Schrittweise Integration**: Neue React-Komponenten werden schrittweise eingeführt
2. **Feature-Toggles**: Einfaches Umschalten zwischen Implementierungen
3. **Diagnosewerkzeuge**: Verbesserte Logging- und Diagnosetools

## Zukunftspläne

1. **React-Migration**: Vollständige Migration zu React mit klarem Fokus auf Robustheit
2. **Modernisierung**: Modernisierung der Benutzeroberfläche mit React-Komponenten
3. **Typensicherheit**: Integration von TypeScript für höhere Codequalität
4. **Komponententests**: Implementierung automatisierter Tests für React-Komponenten

---

Zuletzt aktualisiert: 05.05.2025