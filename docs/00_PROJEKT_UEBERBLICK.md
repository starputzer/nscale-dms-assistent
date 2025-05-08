# nscale Assist App - Projektübersicht

## Systemarchitektur

Die nscale Assist App besteht aus folgenden Hauptkomponenten:

1. **Frontend**
   - HTML/CSS/JS-basierte UI mit progressiver Migration zu Vue 3 SFC
   - Schrittweise Migration von Vanilla JS zu Vue 3 Single File Components
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

Die Anwendung befindet sich in einer schrittweisen Migration zu Vue 3 Single File Components.

| Komponente | Status | Hinweise |
|------------|--------|----------|
| Dokumentenkonverter | Stabil | Robuste HTML/CSS/JS-Implementierung mit Fallback-Mechanismen |
| Admin-Bereich | Funktional | Aktuelle HTML/CSS/JS-Implementierung |
| Einstellungen | Funktional | Aktuelle HTML/CSS/JS-Implementierung |
| Chat-Interface | Funktional | Aktuelle HTML/CSS/JS-Implementierung |
| Vue 3 SFC-Integration | In Bearbeitung | Schrittweise Migration beginnend mit dem Dokumentenkonverter |

## Vue 3 SFC-Migrationsstrategie

Die Migration zu Vue 3 Single File Components folgt einem strukturierten Ansatz:

- **Vorbereitung und Infrastruktur**: Vite-Setup, Projektstruktur, Feature-Toggles
- **Grundlegende Stores und Composables**: Pinia-Stores, Composables, Bridge-Mechanismen
- **Komponentenmigration**: UI-Komponenten, Hauptkomponenten, Integrationskomponenten
- **Integration und Aktivierung**: Schrittweise Aktivierung, Tests, Legacy-Code-Entfernung

## Feature-Toggle-System

Das Feature-Toggle-System ermöglicht eine kontrollierte Migration:

- `useSfcUI`: Globaler Schalter für die neue Vue 3 SFC-Implementierung
- `feature_sfcDocConverter`: Spezifisch für den Vue 3 SFC-basierten Dokumentenkonverter
- `feature_sfcAdmin`: Spezifisch für Vue 3 SFC-basierte Admin-Komponenten

Die Toggles werden im localStorage des Browsers gespeichert und können über die Admin-Oberfläche oder die Konsole konfiguriert werden.

## Bekannte Herausforderungen

1. **Framework-Co-Existenz**: Saubere Integration von Vue 3 SFC-Komponenten in die bestehende Anwendung
2. **Zustandsverwaltung**: Implementierung einer klar getrennten Zustandsverwaltung mit Pinia
3. **Build-System**: Optimierung des Build-Prozesses für Vue 3 SFC-Komponenten
4. **Styling-Konsistenz**: Sicherstellung eines konsistenten Erscheinungsbilds zwischen Implementierungen

## Robustheit und Fehlerbehandlung

Die Migrations- und Implementierungsstrategie basiert auf bewährten Praktiken:

1. **Schrittweise Integration**: Neue Vue 3 SFC-Komponenten werden schrittweise eingeführt
2. **Feature-Toggles**: Einfaches Umschalten zwischen Implementierungen
3. **Diagnosewerkzeuge**: Verbesserte Logging- und Diagnosetools
4. **Fallback-Mechanismen**: Robuste Fallbacks bei Fehlern in Vue-Komponenten

## Zukunftspläne

1. **Vue 3 SFC-Migration**: Vollständige Migration zu Vue 3 Single File Components
2. **Modernisierung**: Modernisierung der Benutzeroberfläche mit Vue 3 SFC-Komponenten
3. **Typensicherheit**: Integration von TypeScript für höhere Codequalität
4. **Komponententests**: Implementierung automatisierter Tests für Vue 3 SFC-Komponenten
5. **Leistungsoptimierung**: Verbesserung der Ladezeiten und Reaktionsfähigkeit

## Architekturprinzipien

Die Vue 3 SFC-Migration folgt diesen Kernprinzipien:

1. **Komponentenbasierter Ansatz**: Klare Trennung von Verantwortlichkeiten
2. **Composition API**: Nutzung der Vue 3 Composition API für bessere Code-Organisation
3. **TypeScript-Integration**: Verbesserte Typensicherheit und Entwicklererfahrung
4. **Pinia für Zustandsverwaltung**: Moderner Zustandsmanagement-Ansatz
5. **Klare Komponentengrenzen**: Strikte Trennung und klare Interfaces

---

Zuletzt aktualisiert: 10.05.2025