# Changelog

Alle wichtigen �nderungen am nscale DMS Assistenten werden in dieser Datei dokumentiert.

## [0.3.0] - 2025-05-05

### Behoben
- Dokumentenkonverter: Behoben, dass die UI endlos mit Ladekreisen h�ngt
- Vue Admin Integration: Endlosschleifen im Initialisierungsprozess behoben
- Frontend: Fehlende JavaScript-Dateien erstellt (app-extensions.js, vue-settings-integration.js, enhanced-chat.js)
- Frontend: Fehlerhafter Pfad zu Vue.js-Standalone-Komponenten korrigiert

### Hinzugef�gt
- Dokumentenkonverter: Vollst�ndige Vue.js-Integration mit Feature-Toggle
- Admin-Bereich: Verbesserte Erkennung aktiver Tabs
- Frontend: Erweiterte Chat-Funktionalit�t (enhanced-chat.js)
- Frontend: Integration der Vue.js-Einstellungen (vue-settings-integration.js)

### Ge�ndert
- Dokumentation: Umstrukturierung der MD-Dateien mit Nummerierung nach Priorit�t
- Dokumentation: ROADMAP.md mit Status-Checkboxen zur besseren �bersicht
- Dokumentation: Rollendokumentation zu ROLLENKONZEPT.md umbenannt

## [0.2.0] - 2025-05-03

### Hinzugef�gt
- Admin-Bereich: Feedback-Verwaltung als Vue.js-Komponente
- Admin-Bereich: MOTD-Verwaltung als Vue.js-Komponente
- Admin-Bereich: Benutzerverwaltung als Vue.js-Komponente
- Admin-Bereich: System-Monitoring als Vue.js-Komponente

### Ge�ndert
- Server: Routen f�r Vue.js-Assets eingerichtet
- Frontend: Feature-Toggle-Mechanismus verbessert
- Frontend: Standalone-Module f�r Vue.js-Komponenten erstellt

## [0.1.0] - 2025-04-25

### Hinzugef�gt
- Basis-Implementierung des RAG-basierten Assistenten
- Chat-Funktionalit�t mit Quellenreferenzen
- Einfache Dokumentenkonvertierung f�r unterst�tzte Formate
- Admin-Bereich mit grundlegenden Funktionen
- Einstellungsbereich f�r Benutzereinstellungen
- Einfaches Rollenkonzept (Benutzer/Administrator)

---

*Format: [SemVer](http://semver.org) wird f�r die Versionierung verwendet*