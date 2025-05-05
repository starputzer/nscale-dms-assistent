# nscale Assist App - Projektübersicht

## Systemarchitektur

Die nscale Assist App besteht aus folgenden Hauptkomponenten:

1. **Frontend**
   - Vue.js 3 als UI-Framework
   - Klassisches UI mit progressiver Migration zu Vue.js
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

Die Anwendung befindet sich in einer Übergangsphase von einer klassischen Webanwendung zu einer modernen Vue.js-SPA.

| Komponente | Status | Fortschritt |
|------------|--------|-------------|
| Dokumentenkonverter | Aktiv | Vollständig in Vue.js implementiert, mit Fallback-Lösungen |
| Admin-Bereich | In Arbeit | Teilweise zu Vue.js migriert (70%) |
| Einstellungen | In Arbeit | Migration begonnen (50%) |
| Chat-Interface | Geplant | Noch nicht migriert (0%) |

## Feature-Toggle-System

Die Anwendung verwendet ein Feature-Toggle-System, um neue Funktionen schrittweise einzuführen:

- `feature_vueDocConverter`: Aktiviert den Vue.js-basierten Dokumentenkonverter
- `feature_vueAdmin`: Aktiviert die Vue.js-basierte Admin-Oberfläche
- `feature_vueSettings`: Aktiviert die Vue.js-basierten Einstellungen
- `feature_vueChat`: Aktiviert das Vue.js-basierte Chat-Interface (in Entwicklung)

Die Toggles werden im localStorage des Browsers gespeichert und können über die Admin-Oberfläche oder den Reset-Link konfiguriert werden.

## Bekannte Herausforderungen

1. **Pfadstruktur**: Die Anwendung verwendet verschiedene Pfadmuster für statische Ressourcen, was zu 404-Fehlern führen kann
2. **Modulimporte**: ES6-Modul-Importe verursachen Fehler in älteren Browsern oder Umgebungen ohne Modulunterstützung
3. **DOM-Verfügbarkeit**: Einige Skripte versuchen auf DOM-Elemente zuzugreifen, bevor diese verfügbar sind

## Robustheit und Fehlerbehandlung

Die Anwendung implementiert mehrere Ebenen von Fallback-Mechanismen:

1. **Mehrschichtige Fallbacks**: Alternative Implementierungen werden geladen, wenn primäre Komponenten fehlschlagen
2. **Pfad-Alternativen**: Ressourcen werden unter mehreren Pfaden bereitgestellt, um 404-Fehler zu vermeiden
3. **Diagnose-Tools**: Umfangreiche Logging-Funktionen erleichtern die Fehleridentifikation und -behebung

## Zukunftspläne

1. Vollständige Migration aller UI-Komponenten zu Vue.js
2. Konsolidierung der Ressourcen-Pfadstruktur
3. Implementierung eines modernen Build-Systems mit Vite/Webpack
4. Verbessertes Asset-Management mit Hash-basierten Dateinamen