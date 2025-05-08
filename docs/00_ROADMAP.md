# ROADMAP

*Zusammengeführt aus mehreren Quelldateien am 08.05.2025*

---


## Aus ROADMAP.md: Roadmap: nscale DMS Assistent

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

- [ ] **Vue 3 SFC-Migration** (AKTUELLER FOKUS)
  - [x] Vite als Build-Tool und Entwicklungsserver eingerichtet
  - [ ] Erste Vue 3 SFC-Komponenten (Dokumentenkonverter, Admin-Komponenten)
  - [ ] Pinia Stores für zentrale Zustandsverwaltung
  - [ ] TypeScript-Integration für verbesserte Codequalität

### Lehren aus der Framework-Migration

Die folgenden wichtigen Erkenntnisse haben wir aus der Migration gewonnen:

1. **Simplizität und Robustheit** sind wichtiger als modernste Technologien
2. **Modularer Code mit klaren Schnittstellen** kann auch ohne Frameworks übersichtlich sein
3. **Technische Entscheidungen sollten frühzeitig getroffen werden**, bevor viel Code geschrieben wird
4. **Umfassende Tests** sind wichtig, insbesondere bei Projekten mit komplexer Frontend-Logik
5. **Direkter DOM-Zugriff** kann performanter und besser kontrollierbar sein als Framework-Abstraktionen

### Dokumentenkonverter

- [x] **Robuste Basisimplementierung**: Der Dokumentenkonverter wurde als stabile Vanilla JS-Komponente implementiert (ABGESCHLOSSEN)
- [x] **Fallback-Mechanismen**: Mehrschichtige Fallback-Mechanismen für maximale Robustheit (ABGESCHLOSSEN)
- [ ] **Erweiterte Funktionen**: Bessere Fehlerbehandlung und Diagnose (AKTUELLER FOKUS)
- [ ] **Verbesserter PDF-Parser**: Bessere Erkennung von Tabellen und Strukturen in PDFs
- [ ] **Batch-Konvertierung**: Möglichkeit, mehrere Dokumente gleichzeitig zu konvertieren

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

### Mittelfristig: August - Oktober 2025 (3 Monate)

- [ ] **Erweiterte RAG-Engine-Funktionen**
  - [ ] Hybride Suche (Kombination aus Vektor- und Schlüsselwortsuche)
  - [ ] Optimierte Chunking-Strategie für Dokumente
  - [ ] Validierung von Antworten anhand von Quelltexten verbessern
  - *Aufwand: ~60 Stunden*

- [ ] **Verbessertes Admin-Interface**
  - [ ] Umfassendere Systemdiagnose und -überwachung
  - [ ] Erweiterte Benutzer- und Rollenverwaltung
  - [ ] Verbesserte Feedback-Analyse mit Filtermöglichkeiten
  - *Aufwand: ~45 Stunden*

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

## Schlüsselprioritäten

1. **Vue 3 SFC-Migration**: Fortsetzung und Optimierung der Vue 3 SFC-Integration
2. **Stabilität und Robustheit**: Das System muss unter allen Umständen zuverlässig funktionieren
3. **Benutzerfreundlichkeit**: Eine intuitive, einfach zu bedienende Oberfläche hat Priorität
4. **Performance**: Schnelle Ladezeiten und Antworten sind wichtiger als zusätzliche Features
5. **Sichere Codebasis**: Code sollte gut dokumentiert, getestet und wartbar sein

## Kontinuierliche Verbesserungen

Die folgenden Bereiche werden kontinuierlich verbessert, parallel zu den oben genannten Projekten:

- **Bugfixes und Stabilitätsverbesserungen**: Laufende Behebung von Problemen
- **Dokumentation**: Kontinuierliche Aktualisierung der Dokumentation
- **Wartbarkeit**: Refactoring von problematischem Code
- **Kleinere UI-Verbesserungen**: Inkrementelle Verbesserungen der Benutzeroberfläche

## Hinweise

- Die Roadmap basiert auf einer Verfügbarkeit von 15 Wochenstunden.
- Die Zeitplanung enthält bereits Puffer für unerwartete Probleme und Debugging.
- Bei Fehlern oder Problemen im Produktiveinsatz hat deren Behebung stets Vorrang vor der Entwicklung neuer Features.
- Feedback von Benutzern wird kontinuierlich eingeholt und in die Prioritäten einbezogen.
- Die Roadmap wird vierteljährlich überprüft und bei Bedarf angepasst.

---

Zuletzt aktualisiert: 08.05.2025

## Hinzugefügt aus: ROADMAP.md

# Roadmap: nscale DMS Assistent

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

- [ ] **Vue 3 SFC-Migration** (AKTUELLER FOKUS)
  - [x] Vite als Build-Tool und Entwicklungsserver eingerichtet
  - [ ] Erste Vue 3 SFC-Komponenten (Dokumentenkonverter, Admin-Komponenten)
  - [ ] Pinia Stores für zentrale Zustandsverwaltung
  - [ ] TypeScript-Integration für verbesserte Codequalität

### Lehren aus der Framework-Migration

Die folgenden wichtigen Erkenntnisse haben wir aus der Migration gewonnen:

1. **Simplizität und Robustheit** sind wichtiger als modernste Technologien
2. **Modularer Code mit klaren Schnittstellen** kann auch ohne Frameworks übersichtlich sein
3. **Technische Entscheidungen sollten frühzeitig getroffen werden**, bevor viel Code geschrieben wird
4. **Umfassende Tests** sind wichtig, insbesondere bei Projekten mit komplexer Frontend-Logik
5. **Direkter DOM-Zugriff** kann performanter und besser kontrollierbar sein als Framework-Abstraktionen

### Dokumentenkonverter

- [x] **Robuste Basisimplementierung**: Der Dokumentenkonverter wurde als stabile Vanilla JS-Komponente implementiert (ABGESCHLOSSEN)
- [x] **Fallback-Mechanismen**: Mehrschichtige Fallback-Mechanismen für maximale Robustheit (ABGESCHLOSSEN)
- [ ] **Erweiterte Funktionen**: Bessere Fehlerbehandlung und Diagnose (AKTUELLER FOKUS)
- [ ] **Verbesserter PDF-Parser**: Bessere Erkennung von Tabellen und Strukturen in PDFs
- [ ] **Batch-Konvertierung**: Möglichkeit, mehrere Dokumente gleichzeitig zu konvertieren

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

### Mittelfristig: August - Oktober 2025 (3 Monate)

- [ ] **Erweiterte RAG-Engine-Funktionen**
  - [ ] Hybride Suche (Kombination aus Vektor- und Schlüsselwortsuche)
  - [ ] Optimierte Chunking-Strategie für Dokumente
  - [ ] Validierung von Antworten anhand von Quelltexten verbessern
  - *Aufwand: ~60 Stunden*

- [ ] **Verbessertes Admin-Interface**
  - [ ] Umfassendere Systemdiagnose und -überwachung
  - [ ] Erweiterte Benutzer- und Rollenverwaltung
  - [ ] Verbesserte Feedback-Analyse mit Filtermöglichkeiten
  - *Aufwand: ~45 Stunden*

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

## Schlüsselprioritäten

1. **Vue 3 SFC-Migration**: Fortsetzung und Optimierung der Vue 3 SFC-Integration
2. **Stabilität und Robustheit**: Das System muss unter allen Umständen zuverlässig funktionieren
3. **Benutzerfreundlichkeit**: Eine intuitive, einfach zu bedienende Oberfläche hat Priorität
4. **Performance**: Schnelle Ladezeiten und Antworten sind wichtiger als zusätzliche Features
5. **Sichere Codebasis**: Code sollte gut dokumentiert, getestet und wartbar sein

## Kontinuierliche Verbesserungen

Die folgenden Bereiche werden kontinuierlich verbessert, parallel zu den oben genannten Projekten:

- **Bugfixes und Stabilitätsverbesserungen**: Laufende Behebung von Problemen
- **Dokumentation**: Kontinuierliche Aktualisierung der Dokumentation
- **Wartbarkeit**: Refactoring von problematischem Code
- **Kleinere UI-Verbesserungen**: Inkrementelle Verbesserungen der Benutzeroberfläche

## Hinweise

- Die Roadmap basiert auf einer Verfügbarkeit von 15 Wochenstunden.
- Die Zeitplanung enthält bereits Puffer für unerwartete Probleme und Debugging.
- Bei Fehlern oder Problemen im Produktiveinsatz hat deren Behebung stets Vorrang vor der Entwicklung neuer Features.
- Feedback von Benutzern wird kontinuierlich eingeholt und in die Prioritäten einbezogen.
- Die Roadmap wird vierteljährlich überprüft und bei Bedarf angepasst.

---

Zuletzt aktualisiert: 08.05.2025