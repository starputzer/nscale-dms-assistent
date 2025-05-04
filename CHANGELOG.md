# Changelog

Alle wichtigen Änderungen am nscale DMS Assistenten werden in dieser Datei dokumentiert.

## [0.3.0] - 2025-05-05

### Behoben
- Dokumentenkonverter: Behoben, dass die UI endlos mit Ladekreisen hängt
- Vue Admin Integration: Endlosschleifen im Initialisierungsprozess behoben
- Frontend: Fehlende JavaScript-Dateien erstellt (app-extensions.js, vue-settings-integration.js, enhanced-chat.js)
- Frontend: Fehlerhafter Pfad zu Vue.js-Standalone-Komponenten korrigiert

### Hinzugefügt
- Dokumentenkonverter: Vollständige Vue.js-Integration mit Feature-Toggle
- Admin-Bereich: Verbesserte Erkennung aktiver Tabs
- Frontend: Erweiterte Chat-Funktionalität (enhanced-chat.js)
- Frontend: Integration der Vue.js-Einstellungen (vue-settings-integration.js)

### Geändert
- Dokumentation: Umstrukturierung der MD-Dateien mit Nummerierung nach Priorität
- Dokumentation: ROADMAP.md mit Status-Checkboxen zur besseren Übersicht
- Dokumentation: Rollendokumentation zu ROLLENKONZEPT.md umbenannt

## [0.2.0] - 2025-05-03

### Hinzugefügt
- Admin-Bereich: Feedback-Verwaltung als Vue.js-Komponente
- Admin-Bereich: MOTD-Verwaltung als Vue.js-Komponente
- Admin-Bereich: Benutzerverwaltung als Vue.js-Komponente
- Admin-Bereich: System-Monitoring als Vue.js-Komponente

### Geändert
- Server: Routen für Vue.js-Assets eingerichtet
- Frontend: Feature-Toggle-Mechanismus verbessert
- Frontend: Standalone-Module für Vue.js-Komponenten erstellt

## [0.1.0] - 2025-04-25

### Hinzugefügt
- Basis-Implementierung des RAG-basierten Assistenten
- Chat-Funktionalität mit Quellenreferenzen
- Einfache Dokumentenkonvertierung für unterstützte Formate
- Admin-Bereich mit grundlegenden Funktionen
- Einstellungsbereich für Benutzereinstellungen
- Einfaches Rollenkonzept (Benutzer/Administrator)

---

*Format: [SemVer](http://semver.org) wird für die Versionierung verwendet*