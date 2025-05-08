# ROADMAP

*Aktualisiert am 10.05.2025*

---

## Roadmap: nscale DMS Assistent

Diese Roadmap gibt einen Überblick über den aktuellen Entwicklungsstand und die geplanten Features des nscale DMS Assistenten. Sie berücksichtigt die tatsächliche Verfügbarkeit von 15 Wochenstunden für die Entwicklung.

## Aktuelle Situation

### Frontend-Strategie Änderung
Die Anwendung hat eine wichtige Neuausrichtung bei der UI-Entwicklung durchlaufen:

- [x] **Erste Vue.js-Migration gestartet und temporär aufgegeben**
  - [x] Feature-Toggle-Mechanismus implementiert
  - [x] Verschiedene Vue.js-Komponenten erstellt (inkl. Dokumentenkonverter)
  - [x] Robuste Fallback-Mechanismen implementiert
  - [x] Zahlreiche Probleme mit Ressourcenladung und DOM-Konflikten identifiziert

- [x] **Neuimplementierung mit Vanilla JavaScript** (ABGESCHLOSSEN)
  - [x] Zentrale JavaScript-Module mit ES6-Modul-System entwickelt
  - [x] Vollständige Entfernung der ersten Vue.js-Komponenten und -Abhängigkeiten
  - [x] Optimierte Dateistruktur mit zentralem `/shared/`-Verzeichnis
  - [x] Robuste Fehlerbehandlung und Fallback-Mechanismen implementiert

- [ ] **Vue 3 SFC-Migration** (AKTUELLER FOKUS, ~40% abgeschlossen)
  - [x] Vite als Build-Tool und Entwicklungsserver eingerichtet
  - [x] Feature-Toggle-System vollständig implementiert mit erweiterten Monitoring-Funktionen
  - [x] Admin-Komponenten weitgehend implementiert (75% abgeschlossen)
  - [x] Pinia Stores für zentrale Zustandsverwaltung (80% abgeschlossen)
  - [x] TypeScript-Integration für verbesserte Codequalität
  - [ ] Dokumentenkonverter-Komponenten (50% abgeschlossen)
  - [ ] Chat-Interface-Komponenten (30% abgeschlossen)

### Lehren aus der Framework-Migration

Die folgenden wichtigen Erkenntnisse haben wir aus der Migration gewonnen:

1. **Simplizität und Robustheit** sind wichtiger als modernste Technologien
2. **Modularer Code mit klaren Schnittstellen** kann auch ohne Frameworks übersichtlich sein
3. **Technische Entscheidungen sollten frühzeitig getroffen werden**, bevor viel Code geschrieben wird
4. **Umfassende Tests** sind wichtig, insbesondere bei Projekten mit komplexer Frontend-Logik
5. **Direkter DOM-Zugriff** kann performanter und besser kontrollierbar sein als Framework-Abstraktionen
6. **Inkrementelle Migration mit Feature-Flags** ermöglicht sichere Umstellung ohne Produktionsrisiken
7. **Klare Trennung zwischen altem und neuem Code** durch Bridge-Mechanismen ist entscheidend

### Dokumentenkonverter

- [x] **Robuste Basisimplementierung**: Der Dokumentenkonverter wurde als stabile Vanilla JS-Komponente implementiert (ABGESCHLOSSEN)
- [x] **Fallback-Mechanismen**: Mehrschichtige Fallback-Mechanismen für maximale Robustheit (ABGESCHLOSSEN)
- [ ] **Erweiterte Funktionen**: Bessere Fehlerbehandlung und Diagnose (AKTUELLER FOKUS)
- [ ] **Verbesserter PDF-Parser**: Bessere Erkennung von Tabellen und Strukturen in PDFs
- [ ] **Batch-Konvertierung**: Möglichkeit, mehrere Dokumente gleichzeitig zu konvertieren

### Admin-Bereich

Ein besonderer Fortschritt wurde bei der Migration des Admin-Bereichs erzielt:

- [x] **AdminPanel**: Hauptkomponente mit Tab-Navigation und Lazy-Loading (95% abgeschlossen)
- [x] **AdminUsers**: Benutzerverwaltung mit CRUD-Operationen und Rollenkonzept (95% abgeschlossen)
- [x] **AdminSystem**: Systemüberwachung und -konfiguration (95% abgeschlossen)
- [x] **AdminFeatureToggles**: Verwaltung und Monitoring von Feature-Flags (90% abgeschlossen)
- [ ] **AdminFeedback**: Analyse von Benutzerfeedback (25% abgeschlossen)
- [ ] **AdminMotd**: Editor für Message of the Day (20% abgeschlossen)

Die Admin-Komponenten sind vollständig mit Pinia Stores integriert und bieten erweiterte Funktionen wie:
- Rollenbasierte Zugriffskontrollen
- Reaktive Datenanbindung
- Fortgeschrittene Validierungsmechanismen
- Responsive Benutzeroberfläche
- Fehlerbehandlung mit Fallback-Optionen

## Realistische Roadmap mit 15 Wochenstunden

### Kurzfristig: Juni - Juli 2025 (2 Monate)

- [ ] **Verbesserungen des Dokumentenkonverters**
  - [ ] Optimierte Fehlerbehandlung und bessere Benutzerfeedbacks
  - [ ] PDF-Erkennung von Tabellen und strukturierten Inhalten verbessern
  - [ ] Verbessertes Logging für Diagnose von Konvertierungsproblemen
  - *Aufwand: ~30 Stunden*

- [ ] **Verbesserte Benutzerfreundlichkeit**
  - [ ] Zugänglichkeitsverbesserungen (Tastaturnavigation, ARIA-Attribute)
  - [ ] Optimierte mobile Ansicht
  - [ ] Verbesserung der Ladezeiten durch optimierte Ressourcennutzung
  - *Aufwand: ~30 Stunden*

- [ ] **Rollenkonzept Phase 2**
  - [ ] Backend-Support für Feedback-Analyst und Content-Manager implementieren
  - [ ] Erweiterte Berechtigungsprüfung im Admin-Bereich
  - *Aufwand: ~20 Stunden*

- [ ] **Technische Schulden abbauen**
  - [ ] Vollständige Bereinigung verbleibender Framework-Referenzen
  - [ ] Code-Dokumentation für Vue 3 SFC-Komponenten vervollständigen
  - [ ] Einheitliche Fehlermeldungen und -behandlung
  - [ ] Vite-Konfiguration optimieren
  - *Aufwand: ~40 Stunden*

- [ ] **Abschluss der Admin-Komponenten**
  - [ ] Implementierung der Feedback-Analyse-Komponente
  - [ ] Implementierung des MOTD-Editors
  - [ ] Umfassende Tests für alle Admin-Komponenten
  - *Aufwand: ~40 Stunden*

### Mittelfristig: August - Oktober 2025 (3 Monate)

- [ ] **Erweiterte RAG-Engine-Funktionen**
  - [ ] Hybride Suche (Kombination aus Vektor- und Schlüsselwortsuche)
  - [ ] Optimierte Chunking-Strategie für Dokumente
  - [ ] Validierung von Antworten anhand von Quelltexten verbessern
  - *Aufwand: ~60 Stunden*

- [ ] **Chat-Interface Migration**
  - [ ] Vollständige Migration der Nachrichten-Liste zu Vue 3 SFC
  - [ ] Migration der Eingabekomponente
  - [ ] Integration mit Pinia Store für reaktives State Management
  - [ ] Optimierung der Streaming-Erfahrung
  - *Aufwand: ~60 Stunden*

- [ ] **Batch-Verarbeitung für Dokumente**
  - [ ] Gleichzeitige Konvertierung mehrerer Dokumente
  - [ ] Fortschrittsanzeige für lange Konvertierungsvorgänge
  - [ ] Priorisierung von Konvertierungsaufträgen
  - *Aufwand: ~35 Stunden*

- [ ] **Rollenkonzept Phase 3**
  - [ ] UI-Anpassungen für rollenspezifische Funktionen
  - [ ] Eingeschränkte Ansichten je nach Benutzerrolle
  - *Aufwand: ~40 Stunden*

### Langfristig: November 2025 - Februar 2026 (4 Monate)

- [ ] **Integration in nscale-Umgebung verbessern**
  - [ ] Kontextbezogene Hilfe basierend auf der aktuellen nscale-Ansicht
  - [ ] Direkte Aktionen in nscale aus dem Chat heraus ausführen
  - [ ] Single Sign-On mit nscale-Authentifizierung
  - *Aufwand: ~80 Stunden*

- [ ] **Erweiterte Wissensbasisfeatures**
  - [ ] Automatische Aktualisierung der Wissensbasis
  - [ ] Erkennung und Warnung vor veralteten Informationen
  - [ ] Einbindung von Community-Wissen
  - *Aufwand: ~60 Stunden*

- [ ] **Rollenkonzept Phase 4 und 5**
  - [ ] Implementation des Mehrrollen-Systems
  - [ ] Überarbeitung des Benutzermanagements für Administratoren
  - *Aufwand: ~50 Stunden*

- [ ] **UI-Optimierungen mit Vue 3 SFC**
  - [ ] Überarbeitetes Chat-Interface mit reaktiven Vue 3-Komponenten
  - [ ] Optimierte mobile Erfahrung mit responsiven Vue-Komponenten
  - [ ] Erweiterte Personalisierungsoptionen über Pinia-Store
  - [ ] Komponenten-Bibliothek für einheitliche UI-Elemente
  - *Aufwand: ~70 Stunden*

## Aktualisierte Vue 3 SFC-Migration Timeline

| Phase | Meilenstein | Aktueller Status | Geplanter Abschluss |
|-------|-------------|------------------|---------------------|
| 1 | Infrastruktur & Feature-Toggle-System | 95% abgeschlossen | Mai 2025 |
| 2 | UI-Basiskomponenten | 60% abgeschlossen | Juni 2025 |
| 3a | Admin-Komponenten | 75% abgeschlossen | Juni 2025 |
| 3b | Dokumentenkonverter | 50% abgeschlossen | Juli 2025 |
| 4 | Chat-Interface | 30% abgeschlossen | August 2025 |
| 5 | Authentifizierung & Einstellungen | 10% begonnen | September 2025 |
| 6 | Legacy-Code-Entfernung | Geplant | Q4 2025 |

## Schlüsselprioritäten

1. **Stabilisierung der Vanilla-JS-Implementierung**: Dies bleibt die höchste Priorität, um eine stabile Grundlage zu gewährleisten
2. **Vue 3 SFC-Migration**: Fortsetzung der Migration mit Fokus auf Benutzererfahrung und Codequalität
3. **Test-Automatisierung**: Implementierung umfassender Tests für alle kritischen Komponenten
4. **Design-System-Standardisierung**: Vereinheitlichung des Styling und der Komponenten-Schnittstellen
5. **Benutzerfreundlichkeit**: Eine intuitive, einfach zu bedienende Oberfläche hat Priorität
6. **Performance**: Schnelle Ladezeiten und Antworten sind wichtiger als zusätzliche Features

## Kontinuierliche Verbesserungen

Die folgenden Bereiche werden kontinuierlich verbessert, parallel zu den oben genannten Projekten:

- **Bugfixes und Stabilitätsverbesserungen**: Laufende Behebung von Problemen
- **Dokumentation**: Kontinuierliche Aktualisierung der Dokumentation
- **Wartbarkeit**: Refactoring von problematischem Code
- **Kleinere UI-Verbesserungen**: Inkrementelle Verbesserungen der Benutzeroberfläche
- **Komponententests**: Erhöhung der Testabdeckung für sowohl Vanilla-JS als auch Vue 3 SFC

## Hinweise

- Die Roadmap basiert auf einer Verfügbarkeit von 15 Wochenstunden.
- Die Zeitplanung enthält bereits Puffer für unerwartete Probleme und Debugging.
- Bei Fehlern oder Problemen im Produktiveinsatz hat deren Behebung stets Vorrang vor der Entwicklung neuer Features.
- Feedback von Benutzern wird kontinuierlich eingeholt und in die Prioritäten einbezogen.
- Die Roadmap wird vierteljährlich überprüft und bei Bedarf angepasst.

---

Zuletzt aktualisiert: 10.05.2025